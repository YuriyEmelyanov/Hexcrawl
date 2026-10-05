import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
const saved=JSON.parse(fs.readFileSync(new URL('./fixtures/sea-pocket-map.json',import.meta.url)));
function load(h){const m=structuredClone(saved.map);h.render().restoreSnapshot({...m,...saved.counters,
 hexTerrainByKey:new Map(Object.entries(m.terrainByHexKey)),waterPoiByKey:new Map(Object.entries(m.waterPoiByHexKey)),
 biomeOverrideByHexKey:new Map(Object.entries(m.biomeOverrideByHexKey))});return h.render();}
const stable=a=>JSON.stringify({map:a.createSaveData().map,counters:a.createSaveData().counters});
for (const mode of ['auto', 'mainland', 'coast']) test(`3/-3 sea recovery preserves old map, river ends and undo: ${mode}`,()=>{
 const h=createGenerationHarness(1), before=load(h), original=stable(before);
 const result=before.safelyAddRegionToMap({q:3,r:-3},{coastalPreference:mode});
 assert.equal(result.success,true,JSON.stringify(result));
 const after=h.render(),g=h.geometry;
 const event=h.logs.filter(l=>l.args[0]==='[generation]');
 assert.equal(event.length,1,'one summary for the entire action');
 assert.ok(event[0].args[1].seaRecoveryAttempt>0);
 const anchorVertices=new Set(g.getHexCornerPoints({q:3,r:-3}).map(v=>v.key));
 const lakeVertices=new Set([...after.hexTerrainByKey].filter(([,t])=>t.terrainOverride==='lake').flatMap(([k])=>g.getHexCornerPoints({q:+k.split(',')[0],r:+k.split(',')[1]}).map(v=>v.key)));
 for(const old of before.rivers.filter(r=>anchorVertices.has(r.vertexPath[0].key))){
   const current=after.rivers.find(r=>r.id===old.id);
   assert.ok(current.vertexPath[0].key!==old.vertexPath[0].key||lakeVertices.has(current.vertexPath[0].key),'deleting sea must not merely relabel an unresolved source as frontier');
 }
 const checked=g.completeRegionRiverEnds(after.rivers,before.rivers,after.regions.at(-1),after.regions,after.candidateHexes,after.hexTerrainByKey,before.candidateHexes,before.hexTerrainByKey,anchorVertices);
 assert.equal(checked.success,true,checked.reason);
 assert.equal(after.regions.length,before.regions.length+1);
 assert.equal(JSON.stringify(after.regions.slice(0,-1)),JSON.stringify(before.regions));
 assert.equal(after.history.length,before.history.length+1);
 const removed=[...before.hexTerrainByKey].filter(([k,t])=>t.terrainOverride==='sea'&&after.hexTerrainByKey.get(k)?.terrainOverride!=='sea').map(([k])=>k);
 assert.ok(removed.length>0);
 for(const old of before.rivers){const current=after.rivers.find(r=>r.id===old.id);assert.ok(current);
 const start=current.vertexPath.findIndex(v=>v.key===old.vertexPath[0].key);
 assert.equal(JSON.stringify(current.vertexPath.slice(start,start+old.vertexPath.length)),JSON.stringify(old.vertexPath));
 for(const sector of old.sectors)for(const edge of sector.edgeKeys)assert.equal(current.sectors.find(s=>s.edgeKeys.includes(edge))?.fullness,sector.fullness);
 const mouth=old.vertexPath.at(-1).key;
 const seaAtMouth=[...before.hexTerrainByKey].filter(([k,t])=>t.terrainOverride==='sea'&&g.getHexCornerPoints({q:+k.split(',')[0],r:+k.split(',')[1]}).some(v=>v.key===mouth));
 for(const [key] of seaAtMouth)assert.equal(after.hexTerrainByKey.get(key)?.terrainOverride,'sea');
 }
 g.assertHexcrawlSaveData(JSON.parse(JSON.stringify(after.createSaveData())));
 after.deleteLastRegion(); assert.equal(stable(h.render()),original);
});

test('exhausted sea recovery and programming errors leave map and history unchanged',()=>{
 const h=createGenerationHarness(1),before=load(h),original=stable(before);
 const restore=h.injectFunction('completeRegionRiverEnds',()=>({success:false,reason:'injected constraint'}));
 const result=before.safelyAddRegionToMap({q:3,r:-3},{targetSize:1});
 assert.equal(result.success,false);assert.equal(result.diagnostic.kind,'constraint-rejection');
 assert.ok(result.diagnostic.seaRecoveryAttempt>0);
 assert.equal(stable(h.render()),original);assert.equal(h.render().history.length,0);
 restore();
 let calls=0;
 const undo=h.injectFunction('completeRegionRiverEnds',()=>{
   if(++calls>30)throw new Error('injected recovery error');
   return {success:false,reason:'injected constraint'};
 });
 const failed=h.render().safelyAddRegionToMap({q:3,r:-3},{targetSize:1});
 assert.equal(failed.diagnostic.kind,'programming-error');
 assert.ok(failed.diagnostic.seaRecoveryAttempt>0);
 assert.equal(stable(h.render()),original);assert.equal(h.render().history.length,0);
 undo();
});
