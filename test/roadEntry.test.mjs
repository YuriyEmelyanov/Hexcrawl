import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
const map=JSON.parse(fs.readFileSync(new URL('./fixtures/road-entry-zigzags.json',import.meta.url))).map;
const key=h=>`${h.q},${h.r}`;
for(const [regionId,roadId,endpoint,target,length] of [[3,2,'-5,2','-9,2',5],[4,1,'-1,4','-3,7',4]]) {
 test(`route starts at old endpoint: user map region ${regionId}`,()=>{
  const g=createGenerationHarness(1).geometry;
  const region=map.regions.find(r=>r.id===regionId);
  const regions=map.regions.filter(r=>r.id<regionId);
  const oldKeys=new Set(regions.flatMap(r=>r.hexes.map(key)));
  const roads=map.roads.filter(r=>r.regionId<regionId).map(r=>({...r,segments:r.segments.filter(s=>oldKeys.has(key(s.from))&&oldKeys.has(key(s.to)))}));
  const before=JSON.stringify(roads);
  const occupied=[...regions,region].flatMap(r=>r.hexes);
  const candidates=g.getWildRoadCandidates({region,regions,roads,rivers:map.rivers,hexTerrainByKey:new Map(Object.entries(map.terrainByHexKey)),candidateHexes:g.getCandidateHexes(occupied,new Set())});
  const matching=candidates.filter(c=>c.startRoadId===roadId&&c.startEndpointKey===endpoint&&c.targetEndpointKey===target);
  assert.ok(matching.length);
  assert.equal(Math.min(...matching.map(c=>c.path.length)),length);
  for(const c of matching)assert.ok(c.path.slice(1).every(h=>region.hexes.some(x=>key(x)===key(h))));
  assert.equal(g.countRoadPathRiverCrossings(matching[0].path,map.rivers),regionId===3?1:0);
  assert.equal(JSON.stringify(roads),before);
 });
}

test('settled incoming path searches from the old road hex through the new region',()=>{
 const g=createGenerationHarness(1).geometry;
 const from={q:-1,r:0},target={q:1,r:0};
 const region={...map.regions[0],id:5,hexes:[{q:0,r:0},target],centerHex:target,pointsOfInterest:[]};
 const roads=[{id:1,regionId:1,segments:[{from:{q:-2,r:0},to:from,kind:'road'}]}];
 const incoming=g.findIncomingRoadEndpointsForRegion(region,roads,new Map());
 assert.equal(incoming.length,1);
 assert.equal(key(incoming[0].endpointHex),key(from));
 assert.ok(!('entryHex' in incoming[0]));
 const paths=g.collectSettledIncomingRoadPathsToTarget({region,incoming:incoming[0],targetHexes:[target],roads,rivers:[],hexTerrainByKey:new Map(),usedRoadPoiKeys:new Set(),maxAlternatives:6});
 assert.ok(paths.length);
 assert.deepEqual(Array.from(paths[0].extendedPath,key),['-1,0','0,0','1,0']);
});
test('two old road endpoints cannot be joined by a segment wholly outside the new region',()=>{
 const g=createGenerationHarness().geometry;
 const region={...map.regions[0],hexes:[{q:0,r:0},{q:0,r:1}],centerHex:{q:0,r:1}};
 const path=g.findLowestRiverCrossingPathWithinWildRegion({region,from:{q:-1,r:0},target:{q:-1,r:1},rivers:[],hexTerrainByKey:new Map()});
 assert.deepEqual(Array.from(path,key),['-1,0','0,0','-1,1']);
});
