import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
import { validateRiverNetwork } from '../src/riverModel/core.ts';

test('auto coast retries an incompatible shape before choosing a tract', () => {
  const h = createGenerationHarness(2);
  for (let i = 0; i < 11; i++) {
    const app = h.render();
    app.safelyAddRegionToMap(i ? app.candidateHexes[0] : { q: 0, r: 0 }, {
      targetSize: 20, coastalPreference: i ? 'auto' : 'mainland'
    });
    assert.equal(h.render().regions.length, i + 1);
  }
  const before = h.render();
  const oldRegions = JSON.stringify(before.regions);
  const oldRivers = JSON.stringify(before.rivers);
  const anchor = before.candidateHexes[0];
  h.logs.length = 0;
  before.safelyAddRegionToMap(anchor, { targetSize: 20, coastalPreference: 'auto' });
  const after = h.render();
  assert.equal(after.regions.length, 12);
  assert.ok(!after.regions.at(-1).isTract);
  assert.equal(after.regions.at(-1).hexes.length, 20);
  const event = h.logs.filter(log => log.args[0] === '[generation]').at(-1).args[1];
  assert.equal(event.kind, 'generated');
  assert.equal(event.attempt, 2);
  assert.equal(event.rejectionCounts.coastal_river_endpoints_incompatible, 1);
  assert.equal(JSON.stringify(after.regions.slice(0, -1)), oldRegions);
  assert.equal(after.history.length, before.history.length + 1);
  const built = h.geometry.buildRegionRiverNetwork(after.rivers, [], after.regions, after.candidateHexes, after.hexTerrainByKey, true);
  assert.equal(built.issues.length, 0);
  assert.equal(validateRiverNetwork(built.network).valid, true);
  h.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(after.createSaveData())));
  after.deleteLastRegion();
  assert.equal(JSON.stringify(h.render().regions), oldRegions);
  assert.equal(JSON.stringify(h.render().rivers), oldRivers);
});
