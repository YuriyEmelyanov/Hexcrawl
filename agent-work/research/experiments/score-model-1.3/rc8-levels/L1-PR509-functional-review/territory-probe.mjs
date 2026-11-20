import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]);
const {createGenerationHarness}=await import(pathToFileURL(resolve(root,'test/helpers/generation-harness.mjs')));
const fixture=JSON.parse(await readFile(resolve(root,'test/fixtures/import-v2/baseline-mythic.json')));
function create(){
 const h=createGenerationHarness(42,'','en');
 h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});
 h.injectFunction('readTextFile',async file=>file.text);
 return h;
}
const load=(h,d)=>h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'map'}});
const save=h=>JSON.parse(JSON.stringify(h.render().createSaveData()));
const h=create();
await load(h,fixture);
const targets=h.render().nameTargets;
const pair=targets.filter(t=>t.type==='region').slice(0,2);
assert.equal(pair.length,2);
const settlement=targets.find(t=>t.type==='settlement');
assert.ok(settlement);
const rows=[];
const edits=[[pair[0],'Western March'],[pair[1],'Eastern March'],[settlement,'Riverstead']];
for(const [target,name] of edits){
 const hex=h.render().nameTargetHex(target.key);
 assert.ok(hex);
 h.render().showNameTarget(target.key);
 h.render().changeNameDraft(name,h.render().nameDraft);
 assert.equal(h.render().saveNameDraft(),true);
 rows.push({key:target.key,name,q:hex.q,r:hex.r});
}
const before=save(h);
const fresh=create();await load(fresh,before);
assert.deepEqual(save(fresh).map,before.map);
assert.deepEqual(save(fresh).generation,before.generation);
for(const row of rows){
 assert.equal(save(fresh).map.toponyms.names[row.key].en,row.name);
 assert.equal(fresh.render().selectNameTarget(row.key),true);
 const {q,r}=fresh.render().selectedHex;
 assert.deepEqual([q,r],[row.q,row.r]);
}
console.log(JSON.stringify({case:'two distinct regions and a settlement retain names and positions across a new session',passed:true,rows}));
