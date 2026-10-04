import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';

const events = h => h.logs.filter(l => l.args[0] === '[generation]').map(l => l.args[1]);
const save = h => {
  const { savedAt, ...data } = h.render().createSaveData();
  return JSON.stringify(data);
};

test('diagnostics default off; detailed logging does not change generation or randomness', () => {
  const normal = createGenerationHarness(41);
  const detailed = createGenerationHarness(41, '?generationDebug=1');
  const disabled = createGenerationHarness(41, '?generationDebug=0');
  // Imported helpers execute outside the VM and use the host RNG.
  const random = Math.random;
  Math.random = () => 0.5;
  try {
  for (const h of [normal, detailed, disabled]) {
    h.injectFunction('createToponymSeed', () => 123);
    h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { targetSize: 8, coastalPreference: 'mainland' });
  }
  } finally { Math.random = random; }
  assert.equal(normal.logs.filter(l => l.level === 'log').length, 0);
  assert.equal(disabled.logs.filter(l => l.level === 'log').length, 0);
  assert.ok(detailed.logs.some(l => l.level === 'log'));
  assert.equal(save(normal), save(detailed));
  assert.equal(save(normal), save(disabled));
});

test('exhausted attempts produce one contextual summary and no debug stream', () => {
  const h = createGenerationHarness(91);
  h.injectFunction('exports.generateConnectedRegionFromAnchor', anchor => [anchor]);
  const anchor = { q: 0, r: 0 };
  h.render().safelyAddRegionToMap(anchor, { targetSize: 8, coastalPreference: 'mainland' });
  assert.equal(h.logs.length, 1);
  const [event] = events(h);
  assert.equal(event.kind, 'attempts-exhausted');
  assert.equal(event.result, 'tract');
  assert.equal(event.attempt, 30);
  assert.equal(event.rejectionCounts.region_too_small, 30);
  assert.equal(event.reason, 'region_too_small');
  assert.ok(event.algorithmVersion);
  assert.equal(event.options.targetSize, 8);
  assert.equal(event.options.coastalPreference, 'mainland');
  assert.equal(JSON.stringify(event.anchorHex), JSON.stringify(anchor));
  assert.equal(event.random.source, 'Math.random');
  assert.equal(event.random.state, null);
  assert.equal(h.render().history.length, 1);
});

test('ordinary coastal tract is distinct from exhaustion; subsequent actions reset diagnostics', () => {
  const h = createGenerationHarness(2);
  h.render().addFallbackTractToMap({ q: 0, r: 0 });
  h.logs.length = 0;
  h.render().safelyAddRegionToMap(h.render().candidateHexes[0], { targetSize: 8, coastalPreference: 'coast' });
  const [event] = events(h);
  assert.equal(event.kind, 'tract-created');
  assert.equal(event.reason, 'coastal_river_endpoints_incompatible');
  assert.equal(event.attempt, 1);
  assert.equal(event.result, 'tract');
  assert.equal(Object.keys(event.rejectionCounts).length, 0);
});

test('late tract failure only reports programming error; diagnostic survives later actions', () => {
  const h = createGenerationHarness(91);
  const before = save(h);
  h.injectFunction('exports.generateConnectedRegionFromAnchor', anchor => [anchor]);
  const restore = h.injectFunction('assignWaterPoiLayer', () => { throw new Error('diagnostic injection'); });
  h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { targetSize: 8 });
  assert.equal(save(h), before);
  assert.equal(h.render().history.length, 0);
  assert.equal(events(h).length, 1);
  const [event] = events(h);
  assert.equal(event.kind, 'programming-error');
  assert.equal(event.result, 'rolled-back');
  assert.equal(event.attempt, 30);
  assert.equal(event.stage, 'prepare_commit');
  assert.match(event.reason, /diagnostic injection/);
  assert.ok(event.stack);
  assert.equal(h.logs[0].level, 'error');
  const snapshot = JSON.stringify(event);
  restore();
  h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { targetSize: 8 });
  assert.equal(events(h).at(-1).kind, 'attempts-exhausted');
  assert.equal(events(h).at(-1).rejectionCounts.region_too_small, 30);
  assert.equal(JSON.stringify(event), snapshot);
  h.render().deleteLastRegion();
  assert.equal(h.render().regions.length, 0);
});

test('last rejection records lake reentry rather than a stale earlier river failure', () => {
  const h = createGenerationHarness(14);
  h.injectFunction('getRiversLakeReentryViolation', () => ({ riverId: 1, lakeId: 1 }));
  h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { targetSize: 8, coastalPreference: 'mainland' });
  const [event] = events(h);
  assert.equal(event.kind, 'attempts-exhausted');
  assert.equal(event.reason, 'river_lake_reentry');
  assert.ok(event.rejectionCounts.river_lake_reentry > 0);
});
