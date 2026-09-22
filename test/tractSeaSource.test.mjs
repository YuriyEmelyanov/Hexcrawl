import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';

for (const mode of ['coast', 'mainland', undefined]) {
  test(`tract source stays away from existing sea: ${mode ?? 'auto'}`, () => {
    for (let seed = 1; seed <= 5; seed++) {
      const h = createGenerationHarness(seed);
      const g = h.geometry;
      h.render().addFallbackTractToMap({ q: -5, r: 0 });
      const template = h.render().regions[0];
      const anchor = { q: 0, r: 0 }, neighbor = { q: -1, r: 0 };
      const anchorCorners = new Set(g.getHexCornerPoints(anchor).map(v => v.key));
      const corners = g.getHexCornerPoints(neighbor);
      const i = corners.findIndex((v, j) => anchorCorners.has(v.key) && !anchorCorners.has(corners[(j + 1) % 6].key));
      const path = [corners[i], corners[(i + 1) % 6], corners[(i + 2) % 6]];
      const region = { ...template, id: 1, hexes: [neighbor], anchorHex: neighbor, centerHex: neighbor,
        finalSize: 1, pointsOfInterest: [], pointOfInterestKinds: {}, heightLevel: 1, biomeId: 'open_plains' };
      const river = { id: 1, regionId: 1, vertexPath: path, sectors: [] };
      const terrain = new Map([['0,-1', { terrainOverride: 'sea' }]]);
      const initialSeaCorners = new Set(g.getHexCornerPoints({ q: 0, r: -1 }).map(v => v.key));
      assert.ok(!initialSeaCorners.has(path[0].key), 'fixture source must initially be on dry land');
      h.render().restoreSnapshot({ regions: [region], rivers: [river],
        candidateHexes: g.getCandidateHexes([neighbor], new Set(terrain.keys())), roads: [], crossings: [],
        hexTerrainByKey: terrain, waterPoiByKey: new Map(), biomeOverrideByHexKey: new Map(), nextLakeId: 1, nextRoadId: 1 });
      const before = h.render();
      // Coast seed 1 reproduces the reported failure. Size 1 exercises the
      // same fallback through the real click handler for Auto and Mainland.
      before.safelyAddRegionToMap(anchor, { coastalPreference: mode, targetSize: mode === 'coast' ? 8 : 1 });
      const after = h.render();
      assert.equal(after.regions.length, 2);
      assert.equal(after.regions.at(-1).isTract, true);
      const seaCorners = new Set([...after.hexTerrainByKey]
        .filter(([, value]) => value.terrainOverride === 'sea')
        .flatMap(([key]) => { const [q, r] = key.split(',').map(Number); return g.getHexCornerPoints({ q, r }).map(v => v.key); }));
      assert.equal(after.rivers.length, 1, 'keep the existing river');
      assert.ok(!seaCorners.has(after.rivers[0].vertexPath[0].key), `source touches sea: seed ${seed}`);
      assert.equal(JSON.stringify(after.rivers[0].vertexPath.slice(-path.length)), JSON.stringify(path));
      assert.equal(JSON.stringify(after.regions[0]), JSON.stringify(region));
      g.assertHexcrawlSaveData(JSON.parse(JSON.stringify(after.createSaveData())));
      after.deleteLastRegion();
      assert.equal(JSON.stringify(h.render().rivers), JSON.stringify(before.rivers));
      assert.equal(JSON.stringify([...h.render().hexTerrainByKey]), JSON.stringify([...terrain]));
    }
  });
}
