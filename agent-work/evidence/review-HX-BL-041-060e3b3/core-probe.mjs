import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from '/workspace/review-041/test/helpers/generation-harness.mjs';
import {emptyTags,rollTag,findTag,ownerKey} from '/workspace/review-041/src/tags/engine.ts';
import {mythicDefinitions as defs} from '/workspace/review-041/src/tags/mythic.ts';
const fixture=JSON.parse(fs.readFileSync('/workspace/review-041/test/fixtures/import-v2/baseline-mythic.json'));
async function load(h,data){h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});h.render();}
const h=createGenerationHarness(42);await load(h,fixture);
const o={kind:'region',id:h.render().regions[0].id};
const base=h.render().createSaveData();
base.map.tags={schemaVersion:1,rollCounters:{},instances:Array.from({length:64},(_,n)=>({definitionId:`future.tag${n}`,definitionVersion:1,owner:o,resolver:'independent',revision:0,sides:[12],values:[[1]],entryIds:['entry1'],texts:[{ru:`Snapshot ${n}`}]}))};
h.geometry.assertHexcrawlSaveData(base);
await load(h,base);
const accepted=h.render().mutateTag(o,'mb.land');h.render();
let reloadError=null;try{h.geometry.assertHexcrawlSaveData(h.render().createSaveData());}catch(e){reloadError=String(e);}
assert.equal(accepted,true);assert.equal(h.render().tags.instances.length,65);assert.ok(reloadError);
const result={sha:'060e3b3ae153d2ee5b8afaf5b94adf28cd36343f',owner:o,validImportedInstances:64,acceptedCommand:accepted,exportedInstances:h.render().tags.instances.length,exportRevalidationError:reloadError};
// Independent boundary: valid imported per-result 8-language overrides become 9
// when edited in the current app language.
const j=createGenerationHarness(42);await load(j,fixture);const save=j.render().createSaveData();
save.map.tags=rollTag(emptyTags(),o,defs['mb.land'],42);
save.map.tags.instances[0].overrides=[Object.fromEntries(Array.from({length:8},(_,i)=>[`x${i}`,'saved'])),{}];
j.geometry.assertHexcrawlSaveData(save);await load(j,save);
const edited=j.render().mutateTag(o,'mb.land',undefined,{index:0,text:'edited in RU'});j.render();
let editReloadError=null;try{j.geometry.assertHexcrawlSaveData(j.render().createSaveData());}catch(e){editReloadError=String(e);}
assert.equal(edited,true);assert.equal(Object.keys(j.render().tags.instances[0].overrides[0]).length,9);assert.ok(editReloadError);
result.languageBoundary={acceptedCommand:edited,exportedLanguages:Object.keys(j.render().tags.instances[0].overrides[0]),exportRevalidationError:editReloadError};
fs.writeFileSync('/workspace/review-041-evidence/core-probe.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
