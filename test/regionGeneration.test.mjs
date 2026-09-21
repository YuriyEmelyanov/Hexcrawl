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
  const terrain = new Map(sea ? [['0,-1', { terrainOverride: 'sea' }]] : []);
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
        assert.ok(!h.logs.some(log => log.args[0] === 'Regular region generation crashed; creating fallback tract'), 'normal coastal rejection must not throw');
        if (added.isTract) {
          assert.deepEqual(after.rivers.map(r => r.id), before.rivers.map(r => r.id), 'tract cannot add a river');
          for (const river of before.rivers) {
            const updated = after.rivers.find(r => r.id === river.id);
            assert.equal(JSON.stringify(updated.vertexPath.slice(-river.vertexPath.length)), JSON.stringify(river.vertexPath), 'existing river path must be retained');
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


test('regular exception falls back once and commits exactly one region', () => {
  const h = createGenerationHarness(91);
  h.failRegularGeneration();
  h.render().safelyAddRegionToMap({ q: 0, r: 0 }, { coastalPreference: 'coast' });
  const result = h.render();
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].isTract, true);
  assert.equal(result.history.length, 1);
  assert.equal(result.rivers.length, 0);
});
