import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];
const {createGenerationHarness}=await import(pathToFileURL(root+'/test/helpers/generation-harness.mjs'));
const clone=v=>structuredClone(v);
function setup(seed=42){const h=createGenerationHarness(seed);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);return h;}
const load=(h,d)=>h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'x'}});
const snap=h=>clone(h.render().captureDocument());const stacks=h=>clone([h.render().undoHistory,h.render().redoHistory]);
const valid=h=>h.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(h.render().createSaveData())));
for(const family of ['roadCounter','regionId'])for(const value of [Number.MAX_SAFE_INTEGER-1,Number.MAX_SAFE_INTEGER]){
 const h=setup(),d=JSON.parse(fs.readFileSync(root+'/test/fixtures/import-v2/'+(family==='regionId'?'manual-edit-map':'baseline-classic')+'.json'));
 if(family==='roadCounter')d.counters.nextRoadId=value;else d.map.regions[0].id=value;
 await load(h,d);h.render().setSelectedHex(d.map.regions[0].centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();
 const before=snap(h),oldStacks=stacks(h);const result=h.render().safelyAddRegionToMap(h.render().candidateHexes[0],{targetSize:8,coastalPreference:'mainland'});
 if(!result.success){assert.deepEqual(snap(h),before);assert.deepEqual(stacks(h),oldStacks);}valid(h);
 if(value===Number.MAX_SAFE_INTEGER)assert.equal(result.success,false);
 console.log('BOUNDARY',family,value,result.success?'valid commit':'exact rollback');
}
for(const seed of [16,29]){
 const h=setup(seed);h.render().setGenerationMode('mythic');const empty=snap(h);
 const finish=()=>{for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().kingdomJob,null);assert.equal(h.render().generationError,null,JSON.stringify(h.render().generationError));valid(h);};
 h.render().startKingdom({q:0,r:0});finish();let built=snap(h);h.render().undoMap();assert.deepEqual(snap(h),empty);h.render().redoMap();assert.deepEqual(snap(h),built);
 const center=h.render().regions[0].centerHex;h.render().setSelectedHex(center);h.render().setSelectedHexBiomeOverride('open_hills');const edited=snap(h);
 h.render().regenerateLastRegion();h.render().finishPendingRegeneration();finish();const regenerated=snap(h);h.render().undoMap();assert.deepEqual(snap(h),edited);h.render().redoMap();assert.deepEqual(snap(h),regenerated);
 h.render().deleteLastRegion();const deleted=snap(h);h.render().undoMap();assert.deepEqual(snap(h),regenerated);h.render().redoMap();assert.deepEqual(snap(h),deleted);
 console.log('MYTHIC_EXACT_PASS',seed,'create, edit, regenerate, delete: whole DocumentSnapshot including crossings + checkpoints');
}
