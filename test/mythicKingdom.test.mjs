import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {kingdomKeys,kingdomHexes,key,findKingdomOrigin} from '../src/modes/kingdoms.ts';
import {landmarks,holdings,mythicPoiChoices} from '../src/modes/pointsOfInterest.ts';
import {validateRiverNetwork} from '../src/riverModel/core.ts';
import {pairKey} from '../src/modes/obstacles.ts';
const finish=h=>{for(let step=0;step<305&&h.render().kingdomJob;step++)h.render().advanceKingdom();const app=h.render();assert.equal(app.kingdomJob,null);assert.equal(app.generationError,null,JSON.stringify(app.generationError));return app;};
function validate(h,k) {
  const app=h.render(),area=kingdomKeys(k.origin),rs=app.regions.filter(r=>k.regionIds.includes(r.id));
  const land=new Set(rs.flatMap(r=>r.hexes.map(key)));
  assert.equal(area.size,144);assert.ok([...area].every(k=>land.has(k)), 'all cells covered');
  assert.equal(key(rs[0].centerHex),key(kingdomHexes(k.origin)[78]));assert.equal(key(rs[0].anchorHex),key(rs[0].centerHex));assert.equal(rs[0].centralPoiKind,'throne');
  const occupied=new Set([...app.regions.flatMap(r=>r.hexes.map(key)),...app.hexTerrainByKey.keys()]);
  assert.equal(h.geometry.findFillableEnclosedEmptyAreas(land,occupied).length,0,'no enclosed ungenerated pockets');
  assert.equal(rs[0].biomeLandType,'settled');assert.ok([11,12].includes(rs[0].targetSize) && rs[0].finalSize>=rs[0].targetSize,'first region size');
  const counts=new Map(),mythIds=new Set();
  for(const r of rs){
    assert.ok(r.hexes.some(h=>area.has(key(h))));assert.ok(r.targetSize>=1&&r.targetSize<=12);
    if(r.isTract){assert.equal(r.biomeLandType,'wild');assert.ok(r.targetSize<=5);}
    const pois=[...(r.centralPoiKind?[[r.centerHex,r.centralPoiKind,true]]:[]),...r.pointsOfInterest.map(h=>[h,r.pointOfInterestKinds[key(h)],false])];
    for(const [h,kind,central] of pois){assert.ok(mythicPoiChoices(r.biomeLandType==='settled',central).includes(kind),`${kind} in ${r.id}`);assert.ok(!app.hexTerrainByKey.get(key(h))?.terrainOverride);if(kind==='myth'){assert.ok(area.has(key(h)));assert.ok(!mythIds.has(r.id));mythIds.add(r.id);}if(area.has(key(h)))counts.set(kind,(counts.get(kind)||0)+1);}
  }
  assert.equal(counts.get('throne'),1);assert.equal(holdings.reduce((n,k)=>n+(counts.get(k)||0),0),3);assert.equal(counts.get('myth'),6);
  for(const kind of landmarks)assert.ok([3,4].includes(counts.get(kind)),`${kind}: ${counts.get(kind)}`);
  assert.equal(app.obstacles.filter(o=>o.kingdomId===k.id).length,24);
  const roadPairs=new Set(app.roads.flatMap(r=>r.segments.map(s=>pairKey(s.from,s.to))));
  const riverEdges=new Set(app.rivers.flatMap(r=>r.vertexPath.slice(1).map((v,i)=>[r.vertexPath[i].key,v.key].sort().join('|'))));
  for(const o of app.obstacles){assert.ok(!roadPairs.has(pairKey(o.hex,o.neighborHex)));assert.ok(!riverEdges.has(o.edgeKey));assert.ok(!app.hexTerrainByKey.get(key(o.hex))?.terrainOverride);assert.ok(!app.hexTerrainByKey.get(key(o.neighborHex))?.terrainOverride);}
  for(const r of rs)for(const cell of r.hexes)assert.equal(app.createSaveData().map.waterPoiByHexKey[key(cell)],undefined);
  const network=h.geometry.buildRegionRiverNetwork(app.rivers,[],app.regions,app.candidateHexes,app.hexTerrainByKey,true);
  assert.deepEqual(Array.from(network.issues),[]);
  const riverValidation=validateRiverNetwork(network.network);
  assert.equal(riverValidation.valid,true,JSON.stringify(riverValidation.issues));
  h.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(app.createSaveData())));
}
test('kingdom quotas, d12 sizes, save, classic extension and atomic undo',()=>{
  for(const seed of [7,42,103]){
    const h=createGenerationHarness(seed);const original=h.render().createSaveData().map;
    h.render().startKingdom({q:0,r:0});let app=finish(h);validate(h,app.kingdoms[0]);
    const built=JSON.stringify(app.createSaveData().map);assert.equal(app.history.length,1);
    const previous=JSON.stringify(app.regions);app.setGenerationMode('classic');assert.equal(JSON.stringify(h.render().regions),previous);
    app=h.render();assert.equal(app.safelyAddRegionToMap(app.candidateHexes[0],{targetSize:8,coastalPreference:'mainland'}).success,true);
    h.render().deleteLastRegion();assert.equal(JSON.stringify(h.render().createSaveData().map),built);
    h.render().deleteLastRegion();assert.equal(JSON.stringify(h.render().createSaveData().map),JSON.stringify(original));
  }
});
test('classic to mythic, second kingdom and regeneration preserve earlier regions',()=>{
  const h=createGenerationHarness(16);h.render().safelyAddRegionToMap({q:0,r:0},{targetSize:12,coastalPreference:'mainland'});
  let app=h.render();const old=JSON.stringify(app.regions),oldNames=app.toponyms,oldSegments=app.roads.flatMap(r=>r.segments.map(s=>JSON.stringify(s)));
  app.startKingdom(app.candidateHexes[0]);app=finish(h);assert.equal(JSON.stringify(app.regions.slice(0,1)),old);validate(h,app.kingdoms[0]);
  for(const [k,v]of Object.entries(oldNames))assert.deepEqual(app.toponyms[k],v);
  const segments=new Set(app.roads.flatMap(r=>r.segments.map(s=>JSON.stringify(s))));
  for(const segment of oldSegments)assert.ok(segments.has(segment),'old road preserved');
  app.regenerateLastRegion();h.render().finishPendingRegeneration();app=finish(h);validate(h,app.kingdoms[0]);
  app.startKingdom(app.candidateHexes.at(-1));app=finish(h);assert.equal(app.kingdoms.length,2);for(const k of app.kingdoms)validate(h,k);
});
test('late exception rolls back entire kingdom',()=>{
  const h=createGenerationHarness(42),before=JSON.stringify(h.render().createSaveData().map);
  h.render().startKingdom({q:0,r:0});h.render().advanceKingdom();assert.ok(h.render().regions.length);
  const restore=h.injectFunction('chooseRegionCenter',()=>{throw new Error('kingdom injected error');});
  for(let i=0;i<20&&h.render().kingdomJob;i++)h.render().advanceKingdom();restore();
  assert.equal(h.render().kingdomJob,null);assert.ok(h.render().generationError);assert.equal(JSON.stringify(h.render().createSaveData().map),before);
});
test('nearest free rectangle and disjoint territory',()=>{
  const occupied=kingdomKeys({q:0,r:0}),anchor={q:12,r:0},origin=findKingdomOrigin(anchor,occupied);
  assert.ok(kingdomKeys(origin).has(key(anchor)));assert.ok(kingdomHexes(origin).every(h=>!occupied.has(key(h))));
});

test('first settled region starts at the rectangle center, including its throne',()=>{
  const h=createGenerationHarness(7);
  h.render().startKingdom({q:0,r:0});
  const center=kingdomHexes(h.render().kingdomJob.origin)[78];
  h.render().advanceKingdom();
  assert.equal(key(h.render().regions[0].anchorHex),key(center));
  const app=finish(h),first=app.regions[0];
  assert.equal(first.centralPoiKind,'throne');assert.equal(key(first.centerHex),key(center));
});
test('Mythic growth fills an enclosed pocket even when the target is already reached',()=>{
  const h=createGenerationHarness(7),anchor={q:2,r:0},occupied=new Set();
  for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++)
    if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===2 && !(q===2&&r===0))occupied.add(key({q,r}));
  for(const cells of [h.geometry.generateConnectedRegionFromAnchorImpl(anchor,1,occupied,new Set(),new Set()),h.geometry.generateFallbackTractFromAnchor(anchor,occupied,1)]){
    assert.equal(cells.length,8);assert.ok(cells.some(h=>key(h)==='0,0'));
    assert.equal(h.geometry.findFillableEnclosedEmptyAreas(new Set(cells.map(key)),occupied).length,0);
  }
});

test('real Mythic handler absorbs a pocket beyond the roll and undo restores it',()=>{
  for(const targetSize of [1,6]){
    const h=createGenerationHarness(23),radius=targetSize===1?2:3,anchor={q:radius,r:0};
    h.render().addFallbackTractToMap({q:-10,r:0});
    const template=h.render().regions[0],hexes=[];
    for(let q=-radius;q<=radius;q++)for(let r=-radius;r<=radius;r++)
      if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===radius && !(q===radius&&r===0))hexes.push({q,r});
    const old={...template,hexes,anchorHex:hexes[0],centerHex:hexes[0],finalSize:hexes.length,pointsOfInterest:[],pointOfInterestKinds:{}};
    h.render().restoreSnapshot({regions:[old],rivers:[],roads:[],crossings:[],candidateHexes:[anchor],hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),nextLakeId:1,nextRoadId:1});
    const before=JSON.stringify(h.render().createSaveData().map);
    const result=h.render().safelyAddRegionToMap(anchor,{mode:'mythic',targetSize,coastalPreference:'mainland'});
    assert.equal(result.success,true,JSON.stringify(result));
    const app=h.render(),added=app.regions.at(-1);
    assert.equal(added.targetSize,targetSize);assert.equal(added.finalSize,targetSize===1?8:20);
    assert.ok(added.hexes.some(h=>key(h)==='0,0'));
    assert.equal(JSON.stringify(app.regions[0]),JSON.stringify(old));
    h.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(app.createSaveData())));
    h.render().deleteLastRegion();assert.equal(JSON.stringify(h.render().createSaveData().map),before);
  }
});
