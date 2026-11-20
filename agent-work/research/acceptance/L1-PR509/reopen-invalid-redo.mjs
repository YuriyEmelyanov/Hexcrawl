import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]);
const {createGenerationHarness}=await import(pathToFileURL(resolve(root,'test/helpers/generation-harness.mjs')));
const copy=x=>JSON.parse(JSON.stringify(x));
const save=h=>copy(h.render().createSaveData());
function session(seed){
 const h=createGenerationHarness(seed,'','en'),errors=[];
 h.setWindow({alert:m=>errors.push(m),confirm:()=>true,matchMedia:()=>({matches:false})});
 h.injectFunction('readTextFile',async f=>f.text);
 return {h,errors};
}
const load=(h,text)=>h.render().handleImportJson({target:{files:[{text}],value:'map'}});
const results=[];
for(const mode of ['classic','mythic','knave']){
 const {h}=session(42);
 if(mode==='knave'){
  h.render().chooseKnaveProfile(true);
  h.render().setGenSizeCategory('locality');
  h.render().generateAt({q:0,r:0});
 }else await load(h,readFileSync(resolve(root,'test/fixtures/import-v2/baseline-'+mode+'.json'),'utf8'));
 const target=h.render().nameTargets.find(t=>t.type==='region');
 assert.ok(target,mode);
 const name='Return '+mode;
 h.render().showNameTarget(target.key);h.render().changeNameDraft(name,h.render().nameDraft);
 assert.equal(h.render().saveNameDraft(),true);
 const named=save(h),cell=named.map.regions[0].hexes[0],key=cell.q+','+cell.r;
 const fresh=session(999);await load(fresh.h,JSON.stringify(named));const s=fresh.h;
 assert.deepEqual(save(s).map,named.map);assert.deepEqual(save(s).generation,named.generation);
 assert.equal(save(s).ui.knaveEnabled,named.ui.knaveEnabled);
 assert.equal(s.render().selectNameTarget(target.key),true);
 s.render().setSelectedHex(cell);s.render().changeNotesText(key,'Return 21');s.render().finishNotesGroup();
 const edited=save(s);assert.equal(edited.map.gmNotesByHexKey[key],'Return 21');
 s.render().undoMap();assert.deepEqual(save(s).map,named.map);
 const history=()=>JSON.stringify([s.render().undoHistory,s.render().redoHistory]);
 for(const invalid of ['{',JSON.stringify({...edited,version:9999})]){
 const stacks=history(),before=save(s);
 await load(s,invalid);assert.deepEqual(save(s).map,before.map);assert.deepEqual(save(s).generation,before.generation);assert.equal(history(),stacks);
 }
 s.render().redoMap();assert.deepEqual(save(s).map,edited.map);
 const end=session(7);await load(end.h,JSON.stringify(save(s)));assert.deepEqual(save(end.h).map,edited.map);assert.deepEqual(save(end.h).generation,edited.generation);
 results.push({mode,sourceVersion:mode==='knave'?named.version:2,outputVersion:edited.version,name,cell:key,regions:edited.map.regions.length,invalidInputs:['truncated JSON','version 9999'],messages:fresh.errors,passed:true});
}
console.log(JSON.stringify(results));
