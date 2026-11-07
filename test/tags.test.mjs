import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import {emptyTags,rollTag,findTag,tagKey,ownerKey,editTag,validateTags,resolved} from '../src/tags/engine.ts';
import {mythicDefinitions as defs,tagOwners,tagPolicy,fillMythicTags} from '../src/tags/mythic.ts';
import {selectMythMaterial,materialIdentity,MYTH_MATERIAL_EDITION,mythMaterialManifest} from '../src/tags/mythMaterial.ts';
import mythMaterialRecords from '../src/tags/mythMaterialData.ts';
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
// MC1-01/03/07/10: independently check tuple identity, isolated malformed data,
// defensive limits and language fallback. These invented records are test-only;
// they contain no book material and the production registry remains empty.
test('myth material selects only the exact compatible snapshot without mutating or repairing it',()=>{
 const poi={kind:'poi',regionId:7,hexKey:'2,-3'};
 const snapshot=index=>({definitionId:'mb.myth',definitionVersion:1,owner:{...poi},resolver:'product',revision:3,sides:[6,12],values:[[Math.floor(index/12)+1],[index%12+1]],entryIds:[`mb.myth:${index}`],texts:[{ru:`ВЫМЫШЛЕННЫЙ TEST ONLY ${index}`}],overrides:[{ru:'Авторское имя'}]});
 const content=index=>({
  omens:Array.from({length:index%3+1},(_,n)=>({id:`omen-${n}`,ordinal:n+1,text:`ВЫМЫШЛЕННАЯ TEST ONLY сцена ${index}/${n} ${n===0?'<script>never execute</script>':''}`})),
  roles:Array.from({length:index%4+1},(_,n)=>({id:`role-${n}`,title:n===0?'ВЫМЫШЛЕННАЯ TEST ONLY группа из двух':'TEST ONLY роль',text:`ВЫМЫШЛЕННЫЙ TEST ONLY блок ${index}/${n}`})),
  ...(index%2===0?{rolePreamble:'ВЫМЫШЛЕННОЕ TEST ONLY общее вступление'}:{})
 });
 const records=Array.from({length:72},(_,index)=>({definitionId:'mb.myth',definitionVersion:1,entryId:`mb.myth:${index}`,materialVersion:1,sourceEdition:MYTH_MATERIAL_EDITION,sourcePage:index+1,locales:{ru:content(index)},references:[{type:'unresolved',description:'TEST ONLY: вымышленная ссылка, без перехода'}]}));
 records[12].locales.en=structuredClone(content(12));records[12].locales.en.roles[0].title='TEST ONLY translated group';
 const deepFreeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;};
 const frozen=deepFreeze(records),frozenPoi=deepFreeze(poi),before=structuredClone(frozen);
 assert.deepEqual(mythMaterialRecords,[],'source-free production cannot silently ship fictional cards');
 assert.deepEqual(mythMaterialManifest,[{definitionId:'mb.myth',definitionVersion:1,sourceEdition:MYTH_MATERIAL_EDITION,materialVersion:1}]);
 const identities=new Set();
 for(let group=1;group<=6;group++)for(let entry=1;entry<=12;entry++){
  const index=(group-1)*12+entry-1,s=deepFreeze(snapshot(index)),saved=structuredClone(s);
  const selected=selectMythMaterial(s,frozenPoi,'myth',frozen,'ru');
  assert.equal(selected.status,'ready');assert.equal(selected.record.entryId,`mb.myth:${index}`);
  assert.deepEqual(selected.content,records[index].locales.ru);assert.equal(selected.language,'ru');assert.equal(selected.fallback,false);
  assert.deepEqual(s,saved);identities.add(materialIdentity(s,frozenPoi,'myth'));
  assert.equal(selectMythMaterial(s,frozenPoi,'myth',mythMaterialRecords,'ru').status,'unavailable');
 }
 assert.equal(identities.size,72);assert.ok(!identities.has(undefined));
 assert.notEqual(materialIdentity(snapshot(11),poi,'myth'),materialIdentity(snapshot(12),poi,'myth'));
 const a=snapshot(0),clone=structuredClone(a),otherOwner={...poi,hexKey:'3,-3'};
 assert.equal(selectMythMaterial(undefined,poi,'myth',records,'ru').status,'absent');
 for(const type of ['ruins','sanctuary','seer'])assert.equal(selectMythMaterial(a,poi,type,records,'ru').status,'absent');
 assert.equal(selectMythMaterial(a,{kind:'region',id:7},'myth',records,'ru').status,'absent');
 for(const mutate of [s=>s.definitionId='mb.seer',s=>s.definitionVersion=2,s=>s.owner=otherOwner,s=>s.resolver='independent',s=>s.sides=[12,6],s=>s.values=[[1,1],[1]],s=>s.values=Array(2),s=>s.values=[[0],[1]],s=>s.values=[[7],[1]],s=>s.values=[[1],[13]],s=>s.values=[[1.5],[1]],s=>s.entryIds=['mb.myth:1'],s=>s.entryIds.push('mb.myth:0')]){
  const broken=structuredClone(a);mutate(broken);assert.equal(selectMythMaterial(broken,poi,'myth',records,'ru').status,'unavailable');assert.equal(materialIdentity(broken,poi,'myth'),undefined);
 }
 assert.notEqual(materialIdentity(a,poi,'myth'),materialIdentity({...a,revision:a.revision+1},poi,'myth'));
 assert.deepEqual(a,clone,'selection must preserve authored overrides and original snapshots');
 const fallback=selectMythMaterial(a,poi,'myth',records,'en');assert.equal(fallback.status,'ready');assert.equal(fallback.fallback,true);assert.equal(fallback.language,'ru');assert.deepEqual(fallback.content,records[0].locales.ru);
 const translated=selectMythMaterial(snapshot(12),poi,'myth',records,'en');assert.equal(translated.status,'ready');assert.equal(translated.language,'en');assert.equal(translated.fallback,false);assert.equal(translated.content.roles[0].title,'TEST ONLY translated group');
 const selectRegistry=registry=>selectMythMaterial(a,poi,'myth',registry,'ru');
 assert.equal(selectRegistry(null).status,'error');assert.equal(selectRegistry({}).status,'error');assert.equal(selectRegistry([]).status,'unavailable');
 const changed=mutate=>{const registry=structuredClone(records);mutate(registry[0],registry);return registry;};
 for(const mutate of [r=>r.definitionVersion=2,r=>r.materialVersion=2,r=>r.sourceEdition='unpublished-other-edition'])assert.equal(selectRegistry(changed(mutate)).status,'unavailable');
 for(const mutate of [r=>r.definitionVersion='1',r=>r.materialVersion='1',r=>r.sourceEdition=7,r=>r.sourcePage=0,r=>r.sourcePage=1.5,r=>r.sourcePage=Number.MAX_SAFE_INTEGER+1,r=>r.locales.ru.omens[0].text='',r=>r.locales.ru.roles[0].title='  ',r=>r.locales.ru.omens[0].ordinal=0,r=>r.locales.ru.omens.push({...r.locales.ru.omens[0],id:'different'}),r=>r.locales.ru.roles.push({...r.locales.ru.roles[0]}),r=>r.locales.ru.roles[0].id=r.locales.ru.omens[0].id,r=>r.locales.ru.roles[0].text=8,r=>r.references[0].type='execute',r=>r.locales.en={omens:[],roles:'wrong'},r=>r.locales.ru.omens[0].text='🧭'.repeat(16385),r=>r.locales.ru.omens=Array.from({length:129},(_,n)=>({id:`test-${n}`,ordinal:n+1,text:'TEST ONLY'}))]){
  assert.equal(selectRegistry(changed(mutate)).status,'error');
 }
 const maximum=changed(r=>{r.locales.ru.omens[0].text='🧭'.repeat(16384);});
 const maxSelected=selectRegistry(maximum);assert.equal(maxSelected.status,'ready');assert.equal([...maxSelected.content.omens[0].text].length,16384,'Unicode code points are preserved, never truncated');
 const aggregate=changed(r=>{r.locales.ru.omens=Array.from({length:17},(_,n)=>({id:`large-${n}`,ordinal:n+1,text:'x'.repeat(16384)}));});
 assert.equal(selectRegistry(aggregate).status,'error','the aggregate limit is per complete record');
 const duplicate=changed((r,registry)=>registry.push(structuredClone(r)));assert.equal(selectRegistry(duplicate).status,'error');assert.equal(selectMythMaterial(snapshot(1),poi,'myth',duplicate,'ru').status,'ready');
 const malformedNeighbour=changed((_r,registry)=>{registry[1].locales.ru.omens='broken';registry.push(null);});assert.equal(selectRegistry(malformedNeighbour).status,'ready');assert.equal(selectMythMaterial(snapshot(1),poi,'myth',malformedNeighbour,'ru').status,'error');
 const missingSection=changed(r=>r.locales.ru.roles=[]);assert.equal(selectRegistry(missingSection).status,'unavailable');missingSection[0].locales.ru.verifiedEmptySections=['roles'];assert.equal(selectRegistry(missingSection).status,'ready');
 assert.deepEqual(records,before,'including failed validation, selection is read-only');
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
 new Function('require','module','exports',code)(name=>name==='./engine'?{ownerKey}:name==='./MythMaterialView'?{MythMaterialView:()=>null}:require(name),module,module.exports);
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
 const save=h.render().createSaveData();assert.equal(save.version,9);h.geometry.assertHexcrawlSaveData(save);
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
