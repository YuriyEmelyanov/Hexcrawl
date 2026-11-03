import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyTags,rollTag,findTag,tagKey,ownerKey,editTag,validateTags,resolved} from '../src/tags/engine.ts';
import {mythicDefinitions as defs,tagOwners,tagPolicy,fillMythicTags} from '../src/tags/mythic.ts';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
const owner={kind:'region',id:1};
test('independent columns preserve sibling overrides and counters; product tuple selects one of 72 complete records',()=>{
 let s=rollTag(emptyTags(),owner,defs['mb.land'],42);
 s=editTag(s,owner,'mb.land',1,'ru','Моя местность');
 const before=structuredClone(findTag(s,owner,'mb.land'));
 s=rollTag(s,owner,defs['mb.land'],42,0);
 assert.deepEqual(findTag(s,owner,'mb.land').values[1],before.values[1]);
 assert.equal(findTag(s,owner,'mb.land').overrides[1].ru,'Моя местность');
 for(const def of Object.values(defs).filter(d=>d.resolver==='product')){
   assert.equal(def.tables[0].length,72);assert.ok(def.tables[0].every(t=>t.ru?.length));
 }
 assert.equal(resolved(defs['mb.monument'],[[1],[1]]).texts[0].ru,'Королевская статуя');
 assert.equal(resolved(defs['mb.monument'],[[6],[12]]).texts[0].ru,'Тихое пламя');
 const a=rollTag(emptyTags(),owner,defs['mb.myth'],42), b=rollTag(a,owner,defs['mb.myth'],42,0);
 assert.equal(b.instances[0].values[1][0],a.instances[0].values[1][0]);
 assert.equal(b.instances[0].texts.length,1);
 const others=rollTag(a,{kind:'region',id:2},defs['mb.land'],42);
 assert.deepEqual(rollTag(others,owner,defs['mb.myth'],42,1).instances.find(i=>i.definitionId==='mb.myth'),rollTag(a,owner,defs['mb.myth'],42,1).instances[0]);
});
test('saved tags validate references, tuples, counts and known snapshots; future dictionary is read-only data',()=>{
 const state=rollTag(emptyTags(),owner,defs['mb.land'],42),owners=new Set([ownerKey(owner)]);
 assert.doesNotThrow(()=>validateTags(state,owners,defs));
 for(const mutate of [s=>s.instances.push(structuredClone(s.instances[0])),s=>s.instances[0].values[0][0]=13,s=>s.instances[0].texts[0].ru='wrong',s=>s.instances[0].owner.id=2,s=>s.rollCounters[tagKey(owner,'mb.land')+'|character']=-1,s=>s.schemaVersion=2]){
   const s=structuredClone(state);mutate(s);assert.throws(()=>validateTags(s,owners,defs));
 }
 const future=structuredClone(state);future.instances[0].definitionVersion=2;future.instances[0].texts[0].ru='Future';
 assert.doesNotThrow(()=>validateTags(future,owners,defs));
 assert.throws(()=>rollTag(future,owner,defs['mb.land'],42,0));
});
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/baseline-mythic.json',import.meta.url)));
const stable=h=>structuredClone(h.render().captureDocument());
async function load(h,data=fixture){h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});h.render();}
test('production imported legacy map does not roll; explicit fill and separate rerolls are exact reversible transactions and v6 roundtrip',async()=>{
 const h=createGenerationHarness(42);await load(h);
 assert.equal(h.render().tags.instances.length,0);
 const before=stable(h);h.render().fillMissingTags();const filled=stable(h);
 const map=filled.map;
 for(const {owner,type} of tagOwners(map).values())for(const name of tagPolicy(type).automatic)assert.ok(findTag(map.tags,owner,'mb.'+name),type);
 const sanctuary=[...tagOwners(map).values()].find(o=>o.type==='sanctuary').owner;
 const description=structuredClone(findTag(map.tags,sanctuary,'mb.sanctum'));
 h.render().mutateTag(sanctuary,'mb.seer',0);const rolled=stable(h);
 assert.deepEqual(findTag(rolled.map.tags,sanctuary,'mb.sanctum'),description);
 h.render().undoMap();assert.deepEqual(stable(h),filled);
 h.render().redoMap();assert.deepEqual(stable(h),rolled);
 const save=h.render().createSaveData();assert.equal(save.version,6);h.geometry.assertHexcrawlSaveData(save);
 const next=createGenerationHarness(99);await load(next,save);assert.deepEqual(next.render().tags,rolled.map.tags);
 h.render().undoMap();h.render().undoMap();assert.deepEqual(stable(h),before);
});
test('actual tag commands do not consume world RNG, double click is one command, deletion prunes and undo restores',async()=>{
 const h=createGenerationHarness(42);await load(h);const state=h.render(),region=state.regions[0];
 state.setSelectedHex(region.centerHex);h.render();
 const rng=structuredClone(h.render().captureDocument().map.generation),o={kind:'region',id:region.id};
 assert.equal(h.render().mutateTag(o,'mb.land'),true);h.render();const after=stable(h);
 assert.equal(h.render().mutateTag(o,'mb.land',0),false);assert.deepEqual(stable(h),after);
 assert.deepEqual(after.map.generation,rng);
 // Rerolling another owner is allowed without spending or mutating geography.
 const river=h.render().rivers[0];if(river)assert.equal(h.render().mutateTag({kind:'river',id:river.id},'mb.water'),true);
 assert.deepEqual(structuredClone(h.render().captureDocument().map.generation),rng);
 const invalid=h.render().createSaveData();invalid.map.tags.instances[0].values[0][0]=13;
 const prior=stable(h);await assert.rejects(()=>load(h,invalid));assert.deepEqual(stable(h),prior);
});
