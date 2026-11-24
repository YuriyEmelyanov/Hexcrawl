import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
const {createGenerationHarness}=await import(pathToFileURL(resolve(process.argv[2],'test/helpers/generation-harness.mjs')));
const out=process.argv[3];const report=[];
for(const knave of [false,true]) for(const changeType of [false,true]){
 const h=createGenerationHarness(1),a=()=>h.render(),save=()=>{const s=JSON.parse(JSON.stringify(a().createSaveData())); delete s.savedAt; return s;};
 if(knave) assert(a().chooseKnaveProfile(true));
 for(const anchor of [{q:0,r:0},{q:1,r:-1}]) assert(a().safelyAddRegionToMap(anchor,{targetSize:8,coastalPreference:'mainland'}).success);
 const r=save().map.regions[0],k='0,0',key='poi:'+r.id+':'+k;
 a().setSelectedHex({q:0,r:0});a().setEditMode(true);
 const original=save().map.poiDiscovery[key];const chosen=original==='interaction'?'exploration':'interaction';
 assert(a().changeKnaveDraft({mode:chosen}));assert(a().finishKnaveDraft());
 if(changeType) {a().setEditMode(true);a().setSelectedPoiKind('ruins');}
 const before=save();if(changeType) assert.equal(before.map.regions[0].pointOfInterestKinds[k],'ruins');assert.equal(before.map.poiDiscovery[key],chosen);
 a().regenerateLastRegion();assert(a().pendingRegen);a().finishPendingRegeneration();assert.equal(a().generationError,null);const after=save();assert.notDeepEqual(after.map.regions[1],before.map.regions[1]);
 a().undoMap();assert.deepEqual(save(),before);a().redoMap();assert.deepEqual(save(),after);
 for(const [name,s] of Object.entries({before,after})){
  const fresh=createGenerationHarness(8);fresh.render();fresh.injectFunction('readTextFile',async f=>f.text);
  const full={...s,savedAt:new Date().toISOString()};await fresh.render().handleImportJson({target:{files:[{text:JSON.stringify(full)}],value:''}});const reopened=JSON.parse(JSON.stringify(fresh.render().createSaveData()));delete reopened.savedAt;assert.deepEqual(reopened,s);
  if(!knave && changeType) fs.writeFileSync(join(out,name+'.json'),JSON.stringify(full));
 }
 report.push({changeType,profile:knave?'Knave':'Classic',key,original,chosen,after:after.map.poiDiscovery[key]??'passage',typeBefore:before.map.regions[0].pointOfInterestKinds[k],typeAfter:after.map.regions[0].pointOfInterestKinds[k],cells:[before,after].map(s=>s.map.regions[1].hexes.length),undoRedoExact:true,reimportBothExact:true});
}
console.log(JSON.stringify(report,null,2));
