import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';

function fixture(direction, fullness = 3, sea = false) {
  const h = createGenerationHarness(23), g = h.geometry;
  h.render().addFallbackTractToMap({ q: -5, r: 0 });
  const hex = { q: -1, r: 0 }, anchor = { q: 0, r: 0 };
  const template = h.render().regions[0];
  const region = { ...template, id: 1, hexes: [hex], anchorHex: hex, centerHex: hex, finalSize: 1, pointsOfInterest: [] };
  const ac = new Set(g.getHexCornerPoints(anchor).map(v => v.key)), cs = g.getHexCornerPoints(hex);
  const i = cs.findIndex((v, j) => ac.has(v.key) && !ac.has(cs[(j + 1) % 6].key));
  const path = [cs[i], cs[(i + 1) % 6], cs[(i + 2) % 6]];
  if (direction === 'mouth') path.reverse();
  const river = { id: 1, regionId: 1, vertexPath: path, sectors: g.createInitialRiverSectors(1, path, fullness, {}, 1) };
  const terrain = new Map(sea ? [['1,0', { terrainOverride: 'sea' }]] : []);
  const snapshot = { regions: [region], rivers: [river], roads: [], crossings: [], candidateHexes: [anchor], hexTerrainByKey: terrain, waterPoiByKey: new Map(), biomeOverrideByHexKey: new Map(), nextLakeId: 1, nextRoadId: 1 };
  h.render().restoreSnapshot(snapshot);
  return { h, g, region, river, anchor, terrain };
}

for (const direction of ['source', 'mouth']) {
  test(`unchanged old ${direction} is checked when new land closes its frontier`, () => {
    const { g, region, river, anchor, terrain } = fixture(direction);
    const added = { ...region, id: 2, hexes: [anchor] };
    const result = g.reconcileRegionRiverModel([river], [river], added, [region, added], [], terrain, false);
    assert.equal(result.success, false, 'an unchanged path is not an excuse to skip its closed end');
  });
}

const newHexes = [{q:0,r:0}, {q:0,r:1}, {q:-1,r:1}, {q:1,r:0}, {q:1,r:-1}, {q:1,r:1}];
function oldEdges(rivers) {
  return Object.fromEntries(rivers.flatMap(r => r.sectors.flatMap(s => s.edgeKeys.map(k => [k, s.fullness]))));
}
for (const direction of ['source', 'mouth']) for (const fullness of [1, 3, 5]) {
  test(`closed ${direction} F=${fullness} has a valid real terminus and keeps old flow`, () => {
    const {g,region,river,anchor,terrain} = fixture(direction, fullness);
    const added = {...region,id:2,hexes:newHexes,anchorHex:anchor};
    const result = g.completeRegionRiverEnds([river], [river], added, [region,added], [], terrain);
    assert.equal(result.success,true,result.reason);
    const check = g.reconcileRegionRiverModel(result.rivers,[river],added,[region,added],[],result.terrain,false);
    assert.equal(check.success,true,check.reason);
    const values=oldEdges(result.rivers);
    for(const [key,f] of Object.entries(oldEdges([river]))) assert.equal(values[key],f);
    if(direction==='source'&&fullness===1) assert.equal(result.terrain.size,0,'F=1 needs no lake');
    else assert.ok(result.terrain.size >= (direction==='source'?fullness-1:fullness));
    assert.equal(terrain.size,0,'trials must not mutate input');
  });
}

test('closed mouth is extended to reachable sea, without changing old edges', () => {
  const {g,region,river,anchor,terrain} = fixture('mouth',3,true);
  const added={...region,id:2,hexes:newHexes.filter(h=>!(h.q===1&&h.r===0)),anchorHex:anchor};
  const result=g.completeRegionRiverEnds([river],[river],added,[region,added],[],terrain);
  assert.equal(result.success,true,result.reason);
  const sea=new Set(g.getHexCornerPoints({q:1,r:0}).map(v=>v.key));
  assert.ok(sea.has(result.rivers[0].vertexPath.at(-1).key));
  assert.equal([...result.terrain.values()].filter(t=>t.terrainOverride==='lake').length,0);
  for(const [key,f] of Object.entries(oldEdges([river]))) assert.equal(oldEdges(result.rivers)[key],f);
});

test('real tract handler closes a mouth; save/undo/recovery retain old map and history', () => {
  const {h,g,river,anchor}=fixture('mouth',3,true);
  h.injectFunction('generateFallbackTractFromAnchor',()=>newHexes.filter(h=>!(h.q===1&&h.r===0)));
  const before=h.render();
  const result=before.safelyAddRegionToMap(anchor,{targetSize:1,coastalPreference:'mainland'});
  assert.equal(result.success,true,JSON.stringify(result));
  const after=h.render();
  assert.equal(after.regions.length,2);
  const sea=new Set([...after.hexTerrainByKey].filter(([,t])=>t.terrainOverride==='sea').flatMap(([key])=>{ const [q,r]=key.split(',').map(Number); return g.getHexCornerPoints({q,r}).map(v=>v.key); }));
  assert.ok(sea.has(after.rivers[0].vertexPath.at(-1).key), JSON.stringify({path:after.rivers[0].vertexPath,terrain:[...after.hexTerrainByKey],candidates:after.candidateHexes}));
  g.assertHexcrawlSaveData(JSON.parse(JSON.stringify(after.createSaveData())));
  after.deleteLastRegion();
  assert.equal(JSON.stringify(h.render().rivers),JSON.stringify([river]));
  assert.equal(h.render().history.length,before.history.length);
});

test('insufficient source lake area is an atomic expected rejection, never a broken success', () => {
  const {h,anchor}=fixture('source',5);
  h.injectFunction('generateFallbackTractFromAnchor',()=>[anchor]);
  // Force the fixture frontier closed to reproduce a genuinely cramped pocket.
  const restore=h.injectFunction('exports.getCandidateHexes',()=>[]);
  const before=h.render();
  const old=JSON.stringify(before.regions), history=JSON.stringify(before.history);
  const result=before.safelyAddRegionToMap(anchor,{targetSize:1});
  assert.equal(result.success,false);
  assert.equal(result.diagnostic.kind,'constraint-rejection');
  assert.equal(JSON.stringify(h.render().regions),old);
  assert.equal(JSON.stringify(h.render().history),history);
  assert.ok(!h.logs.some(l=>l.level==='error'));
  restore();
  assert.equal(h.render().safelyAddRegionToMap(anchor,{targetSize:1}).success,true);
});

test('incoming river can finish in another river without changing either old channel', () => {
  const {g,region,river,anchor,terrain}=fixture('mouth',1);
  const otherHex={q:1,r:-1}, corners=g.getHexCornerPoints(otherHex);
  const ac=new Set(g.getHexCornerPoints(anchor).map(v=>v.key));
  const i=corners.findIndex((v,j)=>ac.has(v.key)&&!ac.has(corners[(j+1)%6].key));
  const path=[corners[i],corners[(i+1)%6],corners[(i+2)%6]];
  const other={id:2,regionId:2,vertexPath:path,sectors:g.createInitialRiverSectors(2,path,1,{},2)};
  const oldRegion={...region,id:2,hexes:[otherHex]};
  const added={...region,id:3,hexes:[anchor]};
  const result=g.completeRegionRiverEnds([river,other],[river,other],added,[region,oldRegion,added],[],terrain);
  assert.equal(result.success,true,result.reason);
  assert.ok(result.rivers[1].vertexPath.some(v=>v.key===result.rivers[0].vertexPath.at(-1).key));
  assert.equal(result.terrain.size,0);
  for(const [key,f] of Object.entries(oldEdges([river,other]))) assert.equal(oldEdges(result.rivers)[key],f);
});

test('closing several mouths handles every river, not just the lowest ID', () => {
  const {g,region,river,anchor,terrain}=fixture('mouth',1);
  const hex={q:1,r:-1}, cs=g.getHexCornerPoints(hex), ac=new Set(g.getHexCornerPoints(anchor).map(v=>v.key));
  const i=cs.findIndex((v,j)=>ac.has(v.key)&&!ac.has(cs[(j+1)%6].key));
  const path=[cs[(i+2)%6],cs[(i+1)%6],cs[i]];
  const other={id:2,regionId:2,vertexPath:path,sectors:g.createInitialRiverSectors(2,path,1,{},2)};
  const oldRegion={...region,id:2,hexes:[hex]};
  const added={...region,id:3,hexes:newHexes.filter(h=>h.q!==hex.q||h.r!==hex.r)};
  const previous=[river,other], regions=[region,oldRegion,added];
  const result=g.completeRegionRiverEnds(previous,previous,added,regions,[],terrain);
  assert.equal(result.success,true,result.reason);
  assert.equal(g.reconcileRegionRiverModel(result.rivers,previous,added,regions,[],result.terrain,false).success,true);
  for(const [key,f] of Object.entries(oldEdges(previous))) assert.equal(oldEdges(result.rivers)[key],f);
});
