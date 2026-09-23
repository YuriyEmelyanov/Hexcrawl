import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
const key=h=>`${h.q},${h.r}`;
const edge=s=>[key(s.from),key(s.to)].sort().join('|')+':'+s.kind;
function closedEnds(h) {
 const a=h.render(), g=h.geometry, occupied=new Set(a.regions.flatMap(r=>r.hexes.map(key)));
 const destinations=new Set(a.regions.flatMap(r=>[...(r.isTract?[]:[r.centerHex]),...r.pointsOfInterest].map(key)));
 const graph=new Map(), hexes=new Map();
 for(const r of a.roads)for(const s of r.segments)for(const [x,y]of [[s.from,s.to],[s.to,s.from]]) {
  const k=key(x);hexes.set(k,x);if(!graph.has(k))graph.set(k,new Set());graph.get(k).add(key(y));
 }
 return [...graph].filter(([k,ns])=>ns.size===1&&!destinations.has(k)&&!g.getHexNeighbors(hexes.get(k)).some(n=>!occupied.has(key(n))&&!['sea','lake'].includes(a.hexTerrainByKey.get(key(n))?.terrainOverride))).map(([k])=>k);
}
for(const [seed,landType,coastalPreference,steps] of [[103,'settled','mainland',6],[103,'wild','mainland',6],[42,'settled','coast',6],[103,'wild','coast',6],[103,'settled','coast',6]]) {
 test(`ROAD-AUD-01 closed exits: ${seed}/${landType}/${coastalPreference}`,()=>{
  const h=createGenerationHarness(seed);
  for(let i=0;i<steps;i++) {
   const a=h.render(),oldMap=JSON.stringify(a.createSaveData().map);
   const oldKeys=new Set(a.regions.flatMap(r=>r.hexes.map(key)));
   const oldEdges=new Set(a.roads.flatMap(r=>r.segments.map(edge)));
   const anchor=a.candidateHexes.length?a.candidateHexes[seed===42?a.candidateHexes.length-1:0]:{q:0,r:0};
   a.safelyAddRegionToMap(anchor,{landType,coastalPreference:i?coastalPreference:'mainland',targetSize:seed===103?35:15});
   const b=h.render();assert.equal(h.logs.some(l=>l.args[0]==='Regular region generation crashed; creating fallback tract'),false);assert.equal(b.regions.length,a.regions.length+1);
   assert.deepEqual(closedEnds(h),[],`step ${i+1}`);
   const region=b.regions.at(-1);
   if(region.biomeLandType==='settled'&&!region.isTract) {
    const count=b.roads.filter(r=>r.regionId===region.id&&r.segments.some(s=>s.kind==='road')).length;
    assert.ok(count>=h.geometry.getSettledMainRoadLimit(region), `road minimum at step ${i+1}: ${count}`);
   }
   const segments=b.roads.flatMap(r=>r.segments),newEdges=new Set(segments.map(edge));
   assert.ok([...oldEdges].every(e=>newEdges.has(e)));
   assert.ok(segments.every(s=>!oldKeys.has(key(s.from))||!oldKeys.has(key(s.to))||oldEdges.has(edge(s))));
   const save=JSON.parse(JSON.stringify(b.createSaveData()));h.geometry.assertHexcrawlSaveData(save);
   b.deleteLastRegion();assert.equal(JSON.stringify(h.render().createSaveData().map),oldMap);
   h.render().restoreSnapshot({regions:save.map.regions,rivers:save.map.rivers,roads:save.map.roads,candidateHexes:save.map.candidateHexes,crossings:save.map.crossings,hexTerrainByKey:new Map(Object.entries(save.map.terrainByHexKey)),waterPoiByKey:new Map(Object.entries(save.map.waterPoiByHexKey)),biomeOverrideByHexKey:new Map(Object.entries(save.map.biomeOverrideByHexKey)),...save.counters});
  }
 });
}
test('ROAD-AUD-02 adjacent roads remain open until physically joined',()=>{
 const g=createGenerationHarness().geometry;
 const s=(a,b)=>({from:{q:a,r:0},to:{q:b,r:0},kind:'road'});
 const roads=[{id:1,regionId:1,segments:[s(-2,-1)]},{id:2,regionId:2,segments:[s(0,1)]}];
 assert.deepEqual([...g.getRoadEndpointHexKeysImpl(roads)].sort(),['-2,0','-1,0','0,0','1,0'].sort());
 roads[1].segments.push(s(-1,0));
 assert.deepEqual([...g.getRoadEndpointHexKeysImpl(roads)].sort(),['-2,0','1,0'].sort());
});
test('ROAD-AUD-03 center can be an incoming road entry',()=>{
 const h=createGenerationHarness(),g=h.geometry;h.render().addFallbackTractToMap({q:20,r:20});
 const region={...h.render().regions[0],id:2,hexes:[{q:0,r:0}],centerHex:{q:0,r:0},pointsOfInterest:[]};
 const road={id:1,regionId:1,segments:[{from:{q:-2,r:0},to:{q:-1,r:0},kind:'road'}]};
 assert.equal(g.findIncomingRoadEndpointsForRegion(region,[road],new Map()).length,1);
});
