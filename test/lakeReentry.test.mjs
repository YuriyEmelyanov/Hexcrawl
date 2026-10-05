import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
const saved = JSON.parse(fs.readFileSync(new URL('./fixtures/lake-reentry-map.json', import.meta.url)));
function load(h) {
 const m = structuredClone(saved.map);
 h.render().restoreSnapshot({...m, ...saved.counters, hexTerrainByKey: new Map(Object.entries(m.terrainByHexKey)),
   waterPoiByKey: new Map(Object.entries(m.waterPoiByHexKey)), biomeOverrideByHexKey: new Map(Object.entries(m.biomeOverrideByHexKey))});
 return h.render();
}
test('unchanged saved lake reentry does not force a new inland region into a tract', () => {
 const h = createGenerationHarness(1), before = load(h);
 before.safelyAddRegionToMap({q:-1,r:14}, {coastalPreference:'mainland'});
 const after = h.render();
 assert.equal(after.regions.length, before.regions.length + 1);
 assert.ok(!after.regions.at(-1).isTract);
 assert.equal(JSON.stringify(after.regions.slice(0,-1)), JSON.stringify(before.regions));
 assert.equal(after.history.length, before.history.length+1);
 h.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(after.createSaveData())));
 after.deleteLastRegion();
 assert.equal(JSON.stringify(h.render().regions), JSON.stringify(before.regions));
 assert.equal(JSON.stringify(h.render().rivers), JSON.stringify(before.rivers));
});
test('final endpoint completion rejects a newly introduced lake with reentry on an old river', () => {
 const h=createGenerationHarness(1), app=load(h), g=h.geometry;
 const region=app.regions.find(r=>r.id===17);
 const previousTerrain=new Map([...app.hexTerrainByKey].filter(([,t])=>t.lakeId!==10));
 const result=g.completeRegionRiverEnds(app.rivers,app.rivers,region,app.regions,app.candidateHexes,app.hexTerrainByKey,app.candidateHexes,previousTerrain);
 assert.equal(result.success,false);
 assert.match(result.reason,/river_lake_reentry/);
});
test('legacy reentry allowance does not hide a new river, a changed path, or a resized lake', () => {
 const h=createGenerationHarness(), app=load(h), g=h.geometry, args=[app.rivers,app.regions,app.hexTerrainByKey];
 const check=(rivers=app.rivers, terrain=app.hexTerrainByKey)=>g.getNewRiverLakeReentryViolation(rivers,app.regions,terrain,...args);
 assert.equal(check(),null);
 const old=app.rivers.find(r=>r.id===10);
 assert.equal(check([...app.rivers,{...old,id:999}]).riverId,999);
 const changed=app.rivers.map(r=>r.id!==10?r:{...r,vertexPath:r.vertexPath.map((v,i)=>i===7?{...v,key:'changed-gap'}:v)});
 assert.equal(check(changed).riverId,10);
 const reshaped=new Map(app.hexTerrainByKey);reshaped.delete('-4,12');
 assert.equal(check(app.rivers,reshaped).riverId,10,'changed lake shape must be rechecked');
 const resized=new Map(app.hexTerrainByKey);resized.delete('-3,11');
 // Removing the first contact resolves this particular reentry.
 assert.equal(check(app.rivers,resized),null);
 const renumbered=new Map([...app.hexTerrainByKey].map(([k,t])=>[k,t.lakeId===10?{...t,lakeId:999}:t]));
 assert.equal(check(app.rivers,renumbered),null,'IDs alone are not geometry changes');
 const extended=app.rivers.map(r=>r.id!==10?r:{...r,vertexPath:[...r.vertexPath,{key:'distant-extension',x:0,y:0}]});
 assert.equal(check(extended),null,'unrelated extension preserves the old interaction');
});
test('late lake introduction is rejected by real regular and tract callbacks, then work can continue', () => {
 const h=createGenerationHarness(1), app=load(h);
 const baseline={...structuredClone(saved.map),...saved.counters,waterPoiByKey:new Map(Object.entries(saved.map.waterPoiByHexKey)),biomeOverrideByHexKey:new Map(Object.entries(saved.map.biomeOverrideByHexKey)),hexTerrainByKey:new Map([...app.hexTerrainByKey].filter(([,t])=>t.lakeId!==10))};
 app.restoreSnapshot(baseline);
 const before=h.render();
 const stable=a=>JSON.stringify({map:a.createSaveData().map,counters:a.createSaveData().counters});
 const old=stable(before);
 const lakeEntries=[...app.hexTerrainByKey].filter(([,t])=>t.lakeId===10);
 const restore=h.injectFunction('convertLandlockedSeaComponentsToLakes',(terrain,regions,id)=>({terrainByKey:new Map([...terrain,...lakeEntries]),nextLakeId:Math.max(id,11)}));
 before.safelyAddRegionToMap({q:-1,r:14},{targetSize:20,coastalPreference:'mainland'});
 const rejected=h.render();
 assert.equal(stable(rejected),old);
 assert.equal(rejected.history.length,0);
 assert.equal(rejected.generationError.kind,'constraint-rejection');
 assert.match(rejected.generationError.reason,/river_lake_reentry/);
 restore();
 h.render().safelyAddRegionToMap({q:-1,r:14},{targetSize:20,coastalPreference:'mainland'});
 assert.equal(h.render().regions.length,before.regions.length+1);
 assert.equal(h.render().history.length,1);
});
