import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
import { validateRiverNetwork } from '../src/riverModel/core.ts';

function values(rivers) {
  return new Map(rivers.flatMap(r => r.sectors.flatMap(s => s.edgeKeys.map(k => [k, s.fullness]))));
}
function checkExtension(h, before) {
  const app = h.render(), g = h.geometry;
  const after = values(app.rivers);
  for (const [key, f] of values(before)) assert.equal(after.get(key), f, `old edge ${key}`);
  const built = g.buildRegionRiverNetwork(app.rivers, before, app.regions, app.candidateHexes, app.hexTerrainByKey);
  assert.deepEqual(Array.from(built.issues), []);
  const result = validateRiverNetwork({ ...built.network, edges: built.network.edges.map(e => ({ ...e, fullness: after.get(e.id) })) });
  assert.equal(result.valid, true, JSON.stringify(result.issues));
}
function outgoingFixture(seed, fullness = 3) {
  const h = createGenerationHarness(seed), g = h.geometry;
  h.render().addFallbackTractToMap({ q: -5, r: 0 });
  const t = h.render().regions[0], neighbor = { q: -1, r: 0 }, anchor = { q: 0, r: 0 };
  const ac = new Set(g.getHexCornerPoints(anchor).map(v => v.key)), cs = g.getHexCornerPoints(neighbor);
  const i = cs.findIndex((v, j) => ac.has(v.key) && !ac.has(cs[(j + 1) % 6].key));
  const path = [cs[i], cs[(i + 1) % 6], cs[(i + 2) % 6]];
  const region = { ...t, id: 1, hexes: [neighbor], anchorHex: neighbor, centerHex: neighbor, finalSize: 1, heightLevel: 1, biomeId: 'open_plains', pointsOfInterest: [], pointOfInterestKinds: {} };
  const river = { id: 1, regionId: 1, vertexPath: path, sectors: g.createInitialRiverSectors(1, path, fullness, {}, 1) };
  const snapshot = { regions: [region], rivers: [river], candidateHexes: g.getCandidateHexes([neighbor], new Set()), roads: [], crossings: [], hexTerrainByKey: new Map(), waterPoiByKey: new Map(), biomeOverrideByHexKey: new Map(), nextLakeId: 1, nextRoadId: 1 };
  h.render().restoreSnapshot(snapshot);
  return { h, g, snapshot, anchor };
}

test('AUD-01/02 RIV-EX-07/08/15/16 real upstream clicks preserve fixed flows and validate new sources', () => {
  for (const seed of [1, 2, 3, 4, 5]) for (const targetSize of [1, 15]) for (const fullness of [1, 3, 5]) {
    const { h, g, snapshot, anchor } = outgoingFixture(seed, fullness);
    h.render().safelyAddRegionToMap(anchor, { coastalPreference: 'mainland', targetSize });
    assert.equal(h.render().regions.length, 2);
    checkExtension(h, snapshot.rivers);
    const saved = JSON.parse(JSON.stringify(h.render().createSaveData()));
    g.assertHexcrawlSaveData(saved);
    assert.deepEqual(saved.map.rivers, JSON.parse(JSON.stringify(h.render().rivers)));
    h.render().deleteLastRegion();
    assert.equal(JSON.stringify(h.render().rivers), JSON.stringify(snapshot.rivers));
    assert.equal(h.render().hexTerrainByKey.size, 0);
  }
});

test('AUD-03 RIV-EX-16 lake placement is atomic when actual connected area is insufficient', () => {
  const { h, g } = outgoingFixture(1);
  const region = { ...h.render().regions[0], hexes: [{ q: 0, r: 0 }] }, terrain = new Map();
  assert.equal(g.addLakeAroundRiverSplitVertex(region, g.getHexCornerPoints(region.hexes[0])[0], 3, terrain), null);
  assert.equal(terrain.size, 0);
});

test('AUD-04 imported numeric fullness outside 1…5 is rejected without mutating the map', () => {
  const { h, g } = outgoingFixture(1);
  const saved = h.render().createSaveData(), original = JSON.stringify(saved);
  for (const fullness of [0, 6, 99, 1.5, '3', null]) {
    const bad = JSON.parse(original); bad.map.rivers[0].sectors[0].fullness = fullness;
    assert.throws(() => g.assertHexcrawlSaveData(bad), /Полноводность/);
  }
  assert.equal(JSON.stringify(h.render().createSaveData().map), JSON.stringify(saved.map));
});

test('RIV-EX-01/12/13/15 real map expansion validates each extension in all coast modes', () => {
  for (const mode of ['mainland', 'coast', 'auto']) for (const seed of [7, 42, 103]) {
    const h = createGenerationHarness(seed);
    for (let i = 0; i < 8; i++) {
      const before = h.render(), anchor = before.candidateHexes[0] ?? (i === 0 ? { q: 0, r: 0 } : null);
      if (!anchor) break;
      before.safelyAddRegionToMap(anchor, { coastalPreference: i ? mode : 'mainland', targetSize: 15 });
      assert.equal(h.render().regions.length, before.regions.length + 1);
      checkExtension(h, before.rivers);
      assert.equal(h.logs.some(l => l.args[0] === 'Regular region generation crashed; creating fallback tract'), false);
    }
  }
});

test('RIV-EX-03/19 adapter solves real sector directions at a junction and preserves region ownership', () => {
  const { h, g } = outgoingFixture(1);
  const v = key => ({ key, x: 0, y: 0 });
  const [a, b, c, d, j] = ['a', 'b', 'c', 'd', 'j'].map(v);
  const candidate = { q: 10, r: 10 }, out = g.getHexCornerPoints(candidate)[0];
  const make = (id, path, f, regionId) => ({ id, regionId, vertexPath: path, sectors: g.createInitialRiverSectors(id, path, f, {}, regionId) });
  for (const height of [1, 2]) {
    const region = { ...h.render().regions[0], id: 2, heightLevel: height };
    const prior = [make(1, [a, b], 2, 1), make(2, [c, d], 1, 1)];
    const next = [ { ...prior[0], vertexPath: [a, b, j, out], sectors: [...prior[0].sectors, ...g.createInitialRiverSectors(1, [b, j, out], 5, {}, 2)] },
      { ...prior[1], vertexPath: [c, d, j], sectors: [...prior[1].sectors, ...g.createInitialRiverSectors(2, [d, j], 5, {}, 2)] } ];
    const result = g.reconcileRegionRiverModel(next, prior, region, [h.render().regions[0], region], [candidate], new Map(), false);
    assert.equal(result.success, true, result.reason);
    const f = values(result.rivers);
    assert.equal(f.get([j.key, out.key].sort().join('|')), height === 1 ? 3 : 2);
    assert.equal(f.get('a|b'), 2);
    assert.equal(result.rivers[0].sectors.at(-1).assignedRegionId, 2);
    assert.equal(JSON.stringify(next[0].sectors.at(-1).fullness), '5', 'input is not mutated');
  }
});

test('RIV-EX-08 tract lake source uses actual area and retains exact old downstream flow', () => {
  const { h, snapshot, anchor } = outgoingFixture(2, 3);
  h.render().safelyAddRegionToMap(anchor, { coastalPreference: 'mainland', targetSize: 1 });
  checkExtension(h, snapshot.rivers);
  assert.ok(h.render().rivers[0].vertexPath.length > snapshot.rivers[0].vertexPath.length, 'source was actually connected');
  assert.ok([...h.render().hexTerrainByKey.values()].filter(t => t.terrainOverride === 'lake').length >= 2);
  assert.ok(h.render().rivers[0].sectors.every(s => s.fullness === 3));
});

test('RIV-EX-21 lake shared by two regions counts unique hexes and all ports once', () => {
  const { h, g } = outgoingFixture(1);
  const hexes = [{ q: 0, r: 0 }, { q: 1, r: 0 }];
  const regions = hexes.map((hex, i) => ({ ...h.render().regions[0], id: i + 1, hexes: [hex] }));
  const candidates = [{ q: 10, r: 0 }, { q: 20, r: 0 }, { q: 30, r: 0 }];
  const contacts = [g.getHexCornerPoints(hexes[0])[3], g.getHexCornerPoints(hexes[1])[0], g.getHexCornerPoints(hexes[1])[1]];
  const rivers = [4, 3, 5].map((f, i) => {
    const outer = g.getHexCornerPoints(candidates[i])[0];
    const path = i === 2 ? [contacts[i], outer] : [outer, contacts[i]];
    return { id: i + 1, regionId: i ? 2 : 1, vertexPath: path, sectors: g.createInitialRiverSectors(i + 1, path, f, {}, i ? 2 : 1) };
  });
  const terrain = new Map(hexes.map(hex => [g.hexKey(hex), { terrainOverride: 'lake', lakeId: 1 }]));
  const built = g.buildRegionRiverNetwork(rivers, [], regions, candidates, terrain, true);
  const lakes = built.network.nodes.filter(n => n.kind === 'lake');
  assert.equal(lakes.length, 1);
  assert.equal(lakes[0].lakeHexCount, 2);
  assert.equal(validateRiverNetwork(built.network).valid, true);
  const tooSmall = { ...built.network, nodes: built.network.nodes.map(n => n.kind === 'lake' ? { ...n, lakeHexCount: 1 } : n) };
  assert.equal(validateRiverNetwork(tooSmall).valid, false);
});
