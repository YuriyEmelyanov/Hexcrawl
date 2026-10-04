import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';

test('fallback commits a tract with the clicked anchor and no independent river', () => {
  const h = createGenerationHarness(1);
  h.render().addFallbackTractToMap({ q: 0, r: 0 }, true);
  const result = h.render();
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].isTract, true);
  assert.ok(result.regions[0].hexes.some(hex => hex.q === 0 && hex.r === 0));
  assert.equal(result.rivers.length, 0);
  assert.equal(result.history.length, 1);
});

test('coast click without touching river endpoints creates a region', () => {
  const h = createGenerationHarness(2);
  h.render().addFallbackTractToMap({ q: 0, r: 0 });
  const before = h.render();
  const anchor = before.candidateHexes[0];
  before.safelyAddRegionToMap(anchor, { coastalPreference: 'coast', targetSize: 8 });
  const after = h.render();
  assert.equal(after.regions.length, 2);
  assert.ok(after.regions[1].hexes.some(hex => h.geometry.hexKey(hex) === h.geometry.hexKey(anchor)));
  assert.equal(after.rivers.length, 0);
  assert.equal(after.history.length, 2);
});

function fixture(h, directions, sea = false) {
  h.render().addFallbackTractToMap({ q: -5, r: 0 });
  const template = h.render().regions[0];
  const anchor = { q: 0, r: 0 };
  const anchorCorners = new Set(h.geometry.getHexCornerPoints(anchor).map(v => v.key));
  const neighbors = [{ q: -1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: 1 }];
  const regions = neighbors.slice(0, Math.max(1, directions.length)).map((hex, i) => ({
    ...template, id: i + 1, hexes: [hex], anchorHex: hex, centerHex: hex,
    finalSize: 1, pointsOfInterest: [], pointOfInterestKinds: {}, heightLevel: 1,
    biomeId: 'open_plains'
  }));
  const rivers = directions.map((direction, i) => {
    const corners = h.geometry.getHexCornerPoints(neighbors[i]);
    const start = corners.findIndex((v, j) => anchorCorners.has(v.key) && !anchorCorners.has(corners[(j + 1) % 6].key));
    assert.ok(start >= 0);
    const path = [corners[start], corners[(start + 1) % 6], corners[(start + 2) % 6]];
    if (direction === 'incoming') path.reverse();
    return { id: i + 1, regionId: i + 1, vertexPath: path, sectors: [] };
  });
  const terrain = new Map(sea ? [['0,-2', { terrainOverride: 'sea' }]] : []);
  const candidates = h.geometry.getCandidateHexes(regions.flatMap(r => r.hexes), new Set(terrain.keys()));
  h.render().restoreSnapshot({ regions, rivers, candidateHexes: candidates, roads: [], crossings: [],
    hexTerrainByKey: terrain, waterPoiByKey: new Map(), biomeOverrideByHexKey: new Map(), nextLakeId: 1, nextRoadId: 1 });
  const graph = h.geometry.buildRiverGraphForRegion([anchor], [anchor], candidates);
  const endpoints = h.geometry.findRiverEndpointsTouchingRegion({ ...template, hexes: [anchor] }, rivers, graph);
  assert.equal(endpoints.filter(e => e.endpointType === 'end').length, directions.filter(d => d === 'incoming').length);
  assert.equal(endpoints.filter(e => e.endpointType === 'start').length, directions.filter(d => d === 'outgoing').length);
  return anchor;
}

const combinations = [[], ['incoming'], ['outgoing'], ['incoming', 'incoming'], ['outgoing', 'outgoing'], ['incoming', 'outgoing']];
for (const directions of combinations) {
  for (const sea of [false, true]) {
   for (const mode of [undefined, "coast", "mainland"]) {
    test(`candidate click: ${directions.join('+') || 'no rivers'}, sea=${sea}, mode=${mode ?? 'auto'}`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const h = createGenerationHarness(seed);
        const anchor = fixture(h, directions, sea);
        const before = h.render();
        const old = JSON.stringify(before.regions);
        before.safelyAddRegionToMap(anchor, { coastalPreference: mode, targetSize: 8 });
        const after = h.render();
        assert.equal(after.regions.length, before.regions.length + 1, `seed=${seed}`);
        assert.equal(after.history.length, before.history.length + 1);
        assert.equal(JSON.stringify(after.regions.slice(0, -1)), old);
        const added = after.regions.at(-1);
        assert.ok(added.hexes.some(hex => h.geometry.hexKey(hex) === h.geometry.hexKey(anchor)));
        const allKeys = after.regions.flatMap(r => r.hexes.map(h.geometry.hexKey));
        assert.equal(new Set(allKeys).size, allKeys.length, 'regions cannot overlap');
        for (const hex of added.hexes) assert.notEqual(after.hexTerrainByKey.get(h.geometry.hexKey(hex))?.terrainOverride, 'sea');
        assert.ok(!after.candidateHexes.some(hex => h.geometry.hexKey(hex) === h.geometry.hexKey(anchor)));
        assert.ok(!after.generationError, 'normal coastal rejection must not throw');
        if (added.isTract) {
          assert.deepEqual(after.rivers.map(r => r.id), before.rivers.map(r => r.id), 'tract cannot add a river');
          for (const river of before.rivers) {
            const updated = after.rivers.find(r => r.id === river.id);
            assert.equal(JSON.stringify(updated.vertexPath.slice(updated.vertexPath.findIndex(v => v.key === river.vertexPath[0].key), updated.vertexPath.findIndex(v => v.key === river.vertexPath[0].key) + river.vertexPath.length)), JSON.stringify(river.vertexPath), 'existing river path must be retained');
          }
        }
        h.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(after.createSaveData())));
        after.deleteLastRegion();
        assert.equal(JSON.stringify(h.render().regions), old, 'undo restores the old regions');
      }
    });
  }
}

}


function savedState(app) {
  const { savedAt, ...saved } = app.createSaveData();
  return JSON.stringify({ saved, history: app.history }, (_, value) => value instanceof Map ? [...value] : value);
}

for (const point of ['exports.generateConnectedRegionFromAnchor', 'getCoastalRiverEndpointHexes', 'assignWaterPoiLayer', 'reconcileRiverCrossings']) {
  test(`programming error at ${point} preserves map/history and permits recovery`, () => {
    const h = createGenerationHarness(91);
    h.render().addFallbackTractToMap({ q: 0, r: 0 });
    const before = h.render();
    const snapshot = savedState(before);
    const anchor = before.candidateHexes[0];
    const restore = h.injectFunction(point, () => { throw new Error(`injected: ${point}`); });
    const outcome = before.safelyAddRegionToMap(anchor, { targetSize: 8, coastalPreference: 'mainland' });
    restore();
    assert.equal(outcome.success, false);
    assert.match(outcome.diagnostic.message, /injected/);
    assert.ok(outcome.diagnostic.stack);
    assert.ok(outcome.diagnostic.attempt >= 1);
    assert.equal(h.render().generationError.kind, 'programming-error');
    assert.equal(savedState(h.render()), snapshot);
    assert.ok(h.logs.some(log => log.level === 'error'), 'programming error must be reported');
    h.render().safelyAddRegionToMap(anchor, { targetSize: 8, coastalPreference: 'mainland' });
    assert.equal(h.render().regions.length, before.regions.length + 1);
    h.render().deleteLastRegion();
    assert.equal(JSON.stringify(h.render().regions), JSON.stringify(before.regions));
  });
}

test('expected small-region rejection retries then creates one tract', () => {
  const h = createGenerationHarness(91);
  let attempts = 0;
  const restore = h.injectFunction('exports.generateConnectedRegionFromAnchor', anchor => { attempts++; return [anchor]; });
  h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { targetSize: 8 });
  restore();
  assert.equal(attempts, 30);
  assert.equal(h.render().regions.length, 1);
  assert.equal(h.render().regions[0].isTract, true);
  assert.equal(h.render().history.length, 1);
  assert.ok(!h.logs.some(log => log.level === 'error'));
});

for (const targetSize of [1, 8]) {
  test(`late failure at targetSize=${targetSize} preserves state; successful retry clears error`, () => {
    const h = createGenerationHarness(14);
    h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { targetSize: 8 });
    const before = savedState(h.render());
    const anchor = h.render().candidateHexes[0];
    const restore = h.injectFunction('assignWaterPoiLayer', () => { throw new Error('injected late failure'); });
    const outcome = h.render().safelyAddRegionToMap(anchor, { targetSize });
    restore();
    assert.equal(outcome.success, false);
    assert.equal(outcome.diagnostic.stage, 'prepare_commit');
    assert.equal(savedState(h.render()), before);
    assert.equal(h.render().safelyAddRegionToMap(anchor, { targetSize }).success, true);
    assert.equal(h.render().generationError, null);
  });
}

test('failed regeneration restores replaced region, selection and full undo history', () => {
  const h = createGenerationHarness(52);
  h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { targetSize: 8 });
  h.render().safelyAddRegionToMap(h.render().candidateHexes[0], { targetSize: 8 });
  const before = savedState(h.render());
  h.render().regenerateLastRegion();
  assert.ok(h.render().pendingRegen);
  const restore = h.injectFunction('assignWaterPoiLayer', () => { throw new Error('injected regeneration failure'); });
  h.render().finishPendingRegeneration();
  restore();
  assert.equal(savedState(h.render()), before);
  assert.equal(h.render().pendingRegen, null);
  assert.equal(h.render().generationError.kind, 'programming-error');
  h.render().regenerateLastRegion();
  h.render().finishPendingRegeneration();
  assert.equal(h.render().regions.length, 2);
  assert.equal(h.render().history.length, 2);
  assert.equal(h.render().generationError, null);
  h.render().deleteLastRegion();
  assert.equal(h.render().regions.length, 1);
  h.render().deleteLastRegion();
  assert.equal(h.render().regions.length, 0);
});
