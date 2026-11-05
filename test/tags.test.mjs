import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
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
 const full=atCapacity(owner),copy=structuredClone(full);
 assert.doesNotThrow(()=>validateTags(full,owners,defs));
 assert.throws(()=>rollTag(full,owner,defs['mb.flora'],42),/capacity/);
 assert.deepEqual(full,copy);
 assert.doesNotThrow(()=>validateTags(rollTag(full,owner,defs['mb.land'],42,0),owners,defs));
 const languages=rollTag(emptyTags(),owner,defs['mb.land'],42);
 languages.instances[0].overrides=[Object.fromEntries(Array.from({length:8},(_,i)=>[`lang${i}`,'x'])),{}];
 const languageCopy=structuredClone(languages);
 assert.doesNotThrow(()=>validateTags(languages,owners,defs));
 assert.throws(()=>editTag(languages,owner,'mb.land',0,'ru','новое'),/capacity/);
 assert.deepEqual(languages,languageCopy);
 assert.doesNotThrow(()=>validateTags(editTag(languages,owner,'mb.land',0,'lang0','changed'),owners,defs));
});
// Import boundaries are also mutation boundaries: valid snapshots stay exportable.
function atCapacity(o,withKnown=true){
 const s=rollTag(emptyTags(),o,defs['mb.land'],42),base=structuredClone(s.instances[0]);
 s.instances=Array.from({length:64},(_,i)=>({...structuredClone(base),definitionId:i===0&&withKnown?'mb.land':`future.${i}`,definitionVersion:i===0&&withKnown?1:2}));
 if(!withKnown)s.rollCounters={};
 return s;
}
test('equal independent dice expose distinct localized purposes and current edited results without visible labels',()=>{
 const source=fs.readFileSync(new URL('../src/tags/TagRow.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}},require=createRequire(import.meta.url);
 new Function('require','module','exports',code)(name=>name==='./engine'?{ownerKey}:require(name),module,module.exports);
 const def=defs['mb.land'],instance={...rollTag(emptyTags(),owner,def,42).instances[0],values:[[2],[2]],...resolved(def,[[2],[2]]),overrides:[{ru:'Моя земля',en:'My land'},{}]};
 for(const language of ['ru','en']){
  const html=renderToStaticMarkup(React.createElement(module.exports.TagRow,{owner,definition:def,instance,language,editMode:false,disabled:false,onRoll:()=>true,onEdit:()=>true}));
  const names=[...html.matchAll(/aria-label="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(names.length,2);assert.notEqual(names[0],names[1]);
  assert.ok(names[0].includes(language==='ru'?'Моя земля':'My land'));
  assert.ok(names[0].includes(language==='ru'?'Состояние':'Character'));
  assert.ok(names[1].includes(language==='ru'?'Ландшафт':'Landscape'));
  assert.ok(names.every(n=>n.includes('d12: 2')));
 }
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
 const save=h.render().createSaveData();assert.equal(save.version,7);h.geometry.assertHexcrawlSaveData(save);
 const next=createGenerationHarness(99);await load(next,save);assert.deepEqual(next.render().tags,rolled.map.tags);
 h.render().undoMap();h.render().undoMap();assert.deepEqual(stable(h),before);
 const regionOwner={kind:'region',id:h.render().regions[0].id};
 const fullSave=h.render().createSaveData();fullSave.map.tags=atCapacity(regionOwner);await load(h,fullSave);
 assert.equal(h.render().mutateTag(regionOwner,'mb.land',0),true);h.render().undoMap();h.render();
 const capacityDoc=stable(h),capacityUndo=structuredClone(h.render().undoHistory),capacityRedo=structuredClone(h.render().redoHistory);
 assert.equal(h.render().mutateTag(regionOwner,'mb.flora'),false);
 assert.deepEqual(stable(h),capacityDoc);assert.deepEqual(structuredClone(h.render().undoHistory),capacityUndo);assert.deepEqual(structuredClone(h.render().redoHistory),capacityRedo);
 h.geometry.assertHexcrawlSaveData(h.render().createSaveData());
 const languageSave=h.render().createSaveData(),land=findTag(languageSave.map.tags,regionOwner,'mb.land');
 land.overrides=[Object.fromEntries(Array.from({length:8},(_,i)=>[`lang${i}`,'x'])),{}];await load(h,languageSave);
 const languageDoc=stable(h);assert.equal(h.render().mutateTag(regionOwner,'mb.land',undefined,{index:0,text:'Новый'}),false);assert.deepEqual(stable(h),languageDoc);
 const holding=[...tagOwners(h.render().captureDocument().map).values()].find(v=>tagPolicy(v.type).automatic.includes('holding')).owner;
 const fillSave=h.render().createSaveData();fillSave.map.tags=atCapacity(holding,false);await load(h,fillSave);
 const fillDoc=stable(h),fillUndo=structuredClone(h.render().undoHistory),fillRedo=structuredClone(h.render().redoHistory);
 assert.doesNotThrow(()=>h.render().fillMissingTags());assert.deepEqual(stable(h),fillDoc);assert.deepEqual(structuredClone(h.render().undoHistory),fillUndo);assert.deepEqual(structuredClone(h.render().redoHistory),fillRedo);
 h.geometry.assertHexcrawlSaveData(h.render().createSaveData());
});
test('actual tag commands do not consume world RNG, double click is one command, deletion prunes and undo restores',async()=>{
 const h=createGenerationHarness(42);await load(h);const state=h.render(),region=state.regions[0];
 state.setSelectedHex(region.centerHex);h.render();
 const rng=structuredClone(h.render().captureDocument().map.generation),o={kind:'region',id:region.id};
 // This is a same-instant double click. CPU-heavy harness renders must not
 // consume the350ms lock interval; advance the test clock explicitly instead.
 let clock=1000;h.injectFunction('Date.now',()=>clock);
 assert.equal(h.render().mutateTag(o,'mb.land'),true);h.render();const after=stable(h);
 assert.equal(h.render().mutateTag(o,'mb.land',0),false);assert.deepEqual(stable(h),after);
 clock+=350;assert.equal(h.render().mutateTag(o,'mb.land',0),true,'the lock expires at the real350ms contract boundary');
 assert.deepEqual(after.map.generation,rng);
 // Rerolling another owner is allowed without spending or mutating geography.
 const river=h.render().rivers[0];if(river)assert.equal(h.render().mutateTag({kind:'river',id:river.id},'mb.water'),true);
 assert.deepEqual(structuredClone(h.render().captureDocument().map.generation),rng);
 const poiRegion=h.render().regions.find(r=>r.pointsOfInterest.length),hex=poiRegion.pointsOfInterest[0],hexKey=`${hex.q},${hex.r}`;
 h.render().setSelectedHex(hex);h.render();
 const po={kind:'poi',regionId:poiRegion.id,hexKey};assert.equal(h.render().mutateTag(po,'mb.feature'),true);
 const withPoi=stable(h);h.render().deleteSelectedPoi();assert.equal(h.render().tags.instances.some(i=>ownerKey(i.owner)===ownerKey(po)),false);
 h.render().undoMap();assert.deepEqual(stable(h),withPoi);
 // One hundred deterministic tag rolls cannot alter the following real generation.
 const control=createGenerationHarness(42);await load(control,h.render().createSaveData());
 let rolled=h.render().tags;for(let n=0;n<100;n++)rolled=rollTag(rolled,o,defs['mb.land'],h.render().generationRef.current.masterSeed,0);
 const doc=stable(h);doc.map.tags=rolled;h.render().applyDocument(doc);
 const anchor=h.render().candidateHexes[0];
 h.render().safelyAddRegionToMap(anchor,{targetSize:6,coastalPreference:'mainland'});
 control.render().safelyAddRegionToMap(anchor,{targetSize:6,coastalPreference:'mainland'});
 const withoutTags=app=>{const d=structuredClone(app.createSaveData());delete d.savedAt;delete d.map.tags;return d;};
 assert.deepEqual(withoutTags(h.render()),withoutTags(control.render()));
 const invalid=h.render().createSaveData();invalid.map.tags.instances[0].values[0][0]=13;
 const prior=stable(h);await assert.rejects(()=>load(h,invalid));assert.deepEqual(stable(h),prior);
});
