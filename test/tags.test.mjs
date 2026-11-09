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
import {regionFixture} from './helpers/region-fixture.mjs';
import {newKnaveLayer,validateKnaveLayer,setKnaveDifficulty,setKnaveDiscovery,remapKnavePois,knaveLosses,dropKnaveLoss} from '../src/knaveClassic.ts';
import {emptyKnaveContent,fillKnaveContent,validateKnaveContent,validateKnaveCatalog,knaveCompatibleRows} from '../src/tags/knave.ts';
import {drawTagIndex} from '../src/tags/engine.ts';
import {knaveCatalogFixture,knaveFactsFixture,knaveContentFixture} from './helpers/knave-fixture.mjs';

test('Knave content snapshots use filtered source rows and separate real d100, remain immutable and replay after JSON',()=>{
 const catalog=knaveCatalogFixture(),land=knaveFactsFixture(),settlement=knaveFactsFixture('poi:2:1,0',{kind:'settlement'}),water=knaveFactsFixture('waterPoi:2,0');
 const first=fillKnaveContent(emptyKnaveContent(),catalog,[land,settlement,water],42),before=structuredClone(first);
 const site=first.byPoi[land.owner].site;
 for(const [seed,category]of [[0,'structure'],[5,'dungeon'],[42,'natural']]){
  const chosen=fillKnaveContent(emptyKnaveContent(),catalog,[land],seed).byPoi[land.owner];assert.equal(chosen.category,category);assert.ok(knaveCompatibleRows(chosen.site.table,land).includes(chosen.site.sourceRow));
 }
 assert.equal(site.selection,'compatible_pool');assert.ok(knaveCompatibleRows(site.table,land).includes(site.sourceRow));assert.equal(site.ru,catalog.tables[site.table][site.sourceRow-1].ru);
 assert.equal(first.byPoi[settlement.owner].site,null);assert.equal(first.byPoi[water.owner].site,null);
 assert.equal(first.byPoi[land.owner].trait.selection,'d100');assert.deepEqual(first.rollCounters[land.owner],{category:1,primary:1,trait:1});
 assert.deepEqual(first,fillKnaveContent(emptyKnaveContent(),catalog,[water,land,settlement],42));
 const updated=structuredClone(catalog);updated.tables.place_traits.forEach(e=>e.ru='Changed catalog text');assert.equal(fillKnaveContent(first,updated,[land,settlement,water],42),first);
 const extra=knaveFactsFixture('poi:3:3,0');
 assert.deepEqual(fillKnaveContent(JSON.parse(JSON.stringify(first)),catalog,[land,settlement,water,extra],42),fillKnaveContent(first,catalog,[extra,water,land,settlement],42));assert.deepEqual(first,before);
 const seed100=Array.from({length:10000},(_,i)=>i).find(seed=>drawTagIndex(seed,`knave-content-v1:${water.owner}:trait`,0,100).index===99);assert.notEqual(seed100,undefined);
 const hundred=fillKnaveContent(emptyKnaveContent(),catalog,[water],seed100).byPoi[water.owner].trait;
 assert.equal(hundred.roll,100);assert.equal(hundred.sourceRow,100);assert.equal(catalog.tables.place_traits[hundred.sourceRow-1].printedResult,'00');
 assert.deepEqual(drawTagIndex(42,'one-row-pool',0,1),{index:0,nextCounter:1});assert.throws(()=>drawTagIndex(42,'exhausted',Number.MAX_SAFE_INTEGER,100));
});
test('Knave catalog and snapshot refusals are atomic; context predicates use existing features and never infer climate',()=>{
 const c=knaveCatalogFixture(),facts=knaveFactsFixture(),state=knaveContentFixture(),before=structuredClone(state),live=new Set([facts.owner]);
 assert.doesNotThrow(()=>validateKnaveCatalog(c));
 for(const change of [d=>d.catalogVersion='future',d=>d.source.sha256='wrong',d=>d.tables.locations.pop(),d=>d.tables.structures[1].row=1,d=>d.tables.place_traits[99].printedResult='100',d=>d.tables.dungeons[0].sourceRef.printedPage=99,d=>d.tables.locations[0].ru='x'.repeat(257)]){const bad=structuredClone(c);change(bad);assert.throws(()=>fillKnaveContent(state,bad,[facts],42));assert.deepEqual(state,before);}
 for(const change of [d=>d.byPoi[facts.owner].catalogVersion='future',d=>d.byPoi[facts.owner].trait.roll=0,d=>d.byPoi[facts.owner].trait.sourceRow=0,d=>d.rollCounters[facts.owner].trait=0,d=>d.byPoi['poi:9:9,0']=d.byPoi[facts.owner],d=>d.byPoi[facts.owner].site.selection='d100',d=>d.byPoi[facts.owner].trait.references=[{printedPage:7,resolution:'auto_roll'}]]){const bad=structuredClone(state);change(bad);assert.throws(()=>validateKnaveContent(bad,live));assert.deepEqual(state,before);}
 assert.throws(()=>fillKnaveContent(state,c,[facts,facts],42));assert.throws(()=>fillKnaveContent(state,c,[{...facts,forest:undefined}],42));
 const dry=knaveCompatibleRows('locations',facts),river=knaveCompatibleRows('locations',{...facts,river:true});assert.ok(!dry.includes(34)&&!dry.includes(44)&&!river.includes(73)&&!river.includes(98));
 assert.ok(knaveCompatibleRows('locations',{...facts,rapids:true}).includes(73));assert.ok(knaveCompatibleRows('locations',{...facts,waterfall:true}).includes(98));
 assert.ok(!knaveCompatibleRows('structures',facts).includes(81));assert.ok(knaveCompatibleRows('structures',{...facts,crossings:['bridge']}).includes(81));
 assert.deepEqual(knaveCompatibleRows('locations',knaveFactsFixture('waterPoi:2,0')),[]);
 // KNC-A05: verify the actual App fact extractor against physical identities,
 // rather than trusting adapter predicates fed by invented boolean values.
 const h=createGenerationHarness(42),m=structuredClone(h.render().captureDocument().map);m.regions=regionFixture().map.regions;
 const hex={q:2,r:0},key='2,0',owner='poi:1:2,0',r=m.regions[0];r.heightLevel=1;r.pointOfInterestKinds[key]='ruins';m.biomeOverrideByHexKey.set(key,'swamp_forest');
 const vertices=h.geometry.getHexCornerPoints(hex),path=vertices.slice(0,2),edge=path.map(v=>v.key).sort().join('|');
 m.rivers=[{id:5,regionId:1,vertexPath:path,sectors:[{id:'authored-knave-sector',riverId:5,sectorIndex:1,vertexPath:path,edgeKeys:[edge],startVertexKey:path[0].key,endVertexKey:path[1].key,startReason:'river_start',endReason:'river_end',fullness:1,assignedRegionId:1}]}];
 m.riverFeatures={rapids:[{riverId:5,edgeKey:edge,state:'on'}],waterfalls:[{vertexKey:path[1].key,state:'on'}]};
 const neighbors=h.geometry.getHexNeighbors(hex),segment={from:hex,to:neighbors[0],kind:'road'};m.roads=[{id:7,regionId:1,segments:neighbors.slice(0,3).map(to=>({...segment,to}))}];
 const read=()=>h.geometry.knaveFactsForMap(m).find(f=>f.owner===owner),snapshot=structuredClone(m),f=read();
 assert.equal(f.kind,'land');assert.equal(f.height,1);for(const flag of ['forest','wetland','river','riverStart','rapids','waterfall','waterContact','road','roadJunction'])assert.equal(f[flag],true,flag);assert.equal(f.coldIce,false);assert.deepEqual(structuredClone(m),snapshot);
 const segmentKey=[key,`${neighbors[0].q},${neighbors[0].r}`].sort().join('|');m.crossings=[{roadId:7,roadSegmentKey:segmentKey,riverId:5,riverEdgeKey:edge,kind:'bridge'}];assert.deepEqual([...read().crossings],['bridge']);assert.equal(read().rapids,false,'a displayed crossing suppresses rapids on that edge');
 m.roads[0].segments=[segment,segment];assert.equal(read().roadJunction,false,'repeated road entries are not a three-way junction');m.crossings[0].roadId=99;assert.deepEqual([...read().crossings],[]);
 m.biomeOverrideByHexKey.set(key,'mountains');assert.equal(read().height,1,'visual override does not invent physical elevation');assert.equal(read().forest,false);assert.equal(read().coldIce,false);
 m.rivers=[];m.riverFeatures={rapids:[],waterfalls:[]};assert.equal(read().waterContact,false);const waterKey=`${neighbors[0].q},${neighbors[0].r}`;m.hexTerrainByKey.set(waterKey,{terrainOverride:'sea'});m.waterPoiByKey.set(waterKey,'shipwreck');assert.equal(read().waterContact,true);
 const waterFact=h.geometry.knaveFactsForMap(m).find(f=>f.owner===`waterPoi:${waterKey}`);assert.equal(waterFact.kind,'water');assert.equal(waterFact.dry,false);
 r.pointOfInterestKinds[key]='village';assert.equal(read().kind,'settlement');

});

// KNC-A03/A05: existing adapter tests cannot detect a missed App commit hook,
// overwritten markers, or consumption of the world's RNG. Use the real handler.
test('Knave real generation commits content with its map, preserves world RNG and replays exact accepted snapshots',async()=>{
 const setup=enabled=>{const h=createGenerationHarness(41);h.render();h.guardRandom();if(enabled){h.render().chooseKnaveProfile(true);h.injectFunction('knaveGenerationCatalog',knaveCatalogFixture);}return h;};
 const plain=setup(false),knave=setup(true),options={targetSize:18,landType:'wild',coastalPreference:'mainland'};
 const map=h=>structuredClone(h.render().captureDocument().map);
 const serialized=m=>JSON.parse(JSON.stringify(m,(_key,value)=>value instanceof Map?{entries:[...value]}:value));
 const physical=m=>{const out=structuredClone(m);delete out.knave;for(const r of out.regions){delete r.centralPoiKind;delete r.pointOfInterestKinds;}return out;};
 const generate=(h,anchor)=>assert.equal(h.render().safelyAddRegionToMap(anchor,options).success,true);
 const empty=map(knave);generate(plain,{q:0,r:0});generate(knave,{q:0,r:0});
 const first=map(knave),facts=knave.geometry.knaveFactsForMap(first);assert.ok(facts.length>=2);assert.deepEqual(physical(first),physical(map(plain)));
 assert.deepEqual(first.generation,map(plain).generation);assert.equal(Object.keys(first.knave.content.byPoi).length,facts.length);
 for(const f of facts){const c=first.knave.content.byPoi[f.owner];assert.ok(c);if(f.kind==='land'){assert.ok(knaveCompatibleRows(c.site.table,f).includes(c.site.sourceRow));const [,id,key]=f.owner.split(':'),r=first.regions.find(r=>r.id===Number(id));const central=`${r.centerHex.q},${r.centerHex.r}`===key&&!r.isTract&&!r.suppressCentralPoi;assert.equal(central?r.centralPoiKind:r.pointOfInterestKinds[key],central?{natural:'natural_place',structure:'structure',dungeon:'dungeon'}[c.category]:c.site.representation);}else assert.equal(c.site,null);}
 knave.render().undoMap();assert.deepEqual(map(knave),empty);knave.render().redoMap();assert.deepEqual(map(knave),first);
 const reload=setup(false);reload.injectFunction('knaveGenerationCatalog',knaveCatalogFixture);reload.injectFunction('readTextFile',async f=>f.text);reload.setWindow({alert:m=>{throw Error(m);}});
 await reload.render().handleImportJson({target:{files:[{text:JSON.stringify(knave.render().createSaveData())}],value:''}});assert.deepEqual(serialized(map(reload)),serialized(first));
 // Supported older v10 layers may have missing content. Growth must not
 // backfill/retag their old owners as a hidden conversion of accepted regions.
 const sparse=setup(false),sparseDocument=structuredClone(knave.render().captureDocument()),oldOwners=new Set(Object.keys(first.knave.content.byPoi));delete sparseDocument.map.knave.content;
 sparse.render().applyDocument(sparseDocument);sparse.injectFunction('knaveGenerationCatalog',knaveCatalogFixture);
 const anchor=knave.render().candidateHexes[0];generate(sparse,anchor);
 const sparseMap=map(sparse);assert.ok(Object.keys(sparseMap.knave.content.byPoi).length);for(const owner of oldOwners)assert.equal(sparseMap.knave.content.byPoi[owner],undefined,'old missing payload stays missing');
 assert.deepEqual(sparseMap.regions[0],first.regions[0]);
 for(const h of [plain,knave,reload])generate(h,anchor);
 const next=map(knave);assert.deepEqual(serialized(next),serialized(map(reload)));assert.deepEqual(physical(next),physical(map(plain)));
 for(const [owner,c]of Object.entries(first.knave.content.byPoi))assert.deepEqual(next.knave.content.byPoi[owner],c);
 // A missing or malformed source package must roll back IDs, RNG, history,
 // accepted Knave content and all geography after preparation has started.
 for(const h of [setup(true),knave])for(const bad of [()=>{throw Error('Missing catalog');},()=>{const c=knaveCatalogFixture();c.tables.dungeons.pop();return c;}]){
   const restore=h.injectFunction('knaveGenerationCatalog',bad),before=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]);
   assert.equal(h.render().safelyAddRegionToMap(h.render().candidateHexes[0]??{q:0,r:0},options).success,false);
   assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);restore();
 }
});
const knaveContext=()=>({hexes:new Set(['0,0','1,0']),dryHexes:new Set(['0,0','1,0']),pois:new Set(['poi:1:0,0','poi:2:1,0'])});
test('Knave profile refuses unknown scales, legacy injection, MB and dangling annotations without mutation',()=>{
 const layer=newKnaveLayer(),context=knaveContext(),before=structuredClone(layer);
 assert.doesNotThrow(()=>validateKnaveLayer(JSON.parse(JSON.stringify(layer)),context,10,'classic'));
 for(const version of [2,9])assert.doesNotThrow(()=>validateKnaveLayer(undefined,context,version,'classic'));
 assert.throws(()=>validateKnaveLayer(layer,context,9,'classic'));
 assert.throws(()=>validateKnaveLayer(layer,context,10,'mythic'));
 for(const mutate of [s=>s.profile.version=2,s=>s.profile.physicalHex.unit='km',s=>s.profile.physicalHex.length=NaN,s=>s.profile.physicalHex.measurementConvention='vertices',s=>s.difficultyByHex={'9,9':'difficult'},s=>s.difficultyByHex={'-0,0':'normal'},s=>s.discoveryByPoi={'poi:9:9,9':{mode:'passage',clueText:''}},s=>s.difficultyByHex=null]){
  const bad=structuredClone(layer);mutate(bad);assert.throws(()=>validateKnaveLayer(bad,context,10,'classic'));
 }
 for(const bad of [null,[],{}])assert.throws(()=>validateKnaveLayer(bad,context,10,'classic'));
 assert.deepEqual(layer,before);
});
test('Knave difficulty is sparse and detached; accepted submerged flags survive without enabling water edits',()=>{
 const context=knaveContext(),initial=newKnaveLayer();
 assert.equal(setKnaveDifficulty(initial,context,'0,0','unspecified'),initial);
 const difficult=setKnaveDifficulty(initial,context,'0,0','difficult');
 assert.deepEqual(initial.difficultyByHex,{});assert.equal(difficult.difficultyByHex['0,0'],'difficult');
 const water={...context,dryHexes:new Set(['1,0'])};
 assert.doesNotThrow(()=>validateKnaveLayer(difficult,water,10,'classic'));
 assert.throws(()=>setKnaveDifficulty(difficult,water,'0,0','normal'));
 assert.equal(setKnaveDifficulty(difficult,context,'0,0','difficult'),difficult);
 assert.deepEqual(setKnaveDifficulty(difficult,context,'0,0','unspecified').difficultyByHex,{});
 assert.deepEqual(difficult.discoveryByPoi,{});
});
test('Knave interaction requires a bounded separate clue and mode changes preserve authored text',()=>{
 const context=knaveContext(),initial=newKnaveLayer(),key='poi:1:0,0';
 assert.throws(()=>setKnaveDiscovery(initial,context,key,'interaction','  '));
 assert.throws(()=>setKnaveDiscovery(initial,context,key,'interaction','x'.repeat(513)));
 const secret=setKnaveDiscovery(initial,context,key,'interaction','  Authored test clue <not HTML>  ');
 assert.deepEqual(initial.discoveryByPoi,{});assert.equal(secret.discoveryByPoi[key].clueText,'Authored test clue <not HTML>');
 const visible=setKnaveDiscovery(secret,context,key,'passage');
 assert.equal(visible.discoveryByPoi[key].clueText,secret.discoveryByPoi[key].clueText);
 assert.equal(setKnaveDiscovery(visible,context,key,'passage'),visible);
 assert.throws(()=>setKnaveDiscovery(secret,context,'poi:4:0,0','passage'));
 assert.deepEqual(secret.discoveryByPoi[key],{mode:'interaction',clueText:'Authored test clue <not HTML>'});
});
test('Knave POI remapping preserves coordinate flags, refuses collisions and previews losses before pruning',()=>{
 const source=knaveContext(),from='poi:1:0,0',to='poi:3:1,0';
 const layer=setKnaveDiscovery(setKnaveDifficulty(newKnaveLayer(),source,'0,0','difficult'),source,from,'interaction','Test clue');
 layer.content=knaveContentFixture(from);
 const before=structuredClone(layer),target={...source,pois:new Set([to,'poi:2:1,0'])};
 const moved=remapKnavePois(layer,source,target,new Map([[from,to]]));
 assert.deepEqual(moved.discoveryByPoi[to],layer.discoveryByPoi[from]);assert.equal(moved.discoveryByPoi[from],undefined);
 assert.deepEqual(moved.difficultyByHex,{'0,0':'difficult'});assert.deepEqual(layer,before);
 assert.deepEqual(moved.content.byPoi[to],layer.content.byPoi[from]);assert.deepEqual(moved.content.rollCounters[to],layer.content.rollCounters[from]);assert.equal(moved.content.byPoi[from],undefined);
 assert.throws(()=>remapKnavePois(layer,source,source,new Map([[from,'poi:2:1,0']])));
 assert.throws(()=>remapKnavePois(layer,source,{...target,pois:new Set()},new Map([[from,to]])));
 const removed={hexes:new Set(['1,0']),dryHexes:new Set(['1,0']),pois:new Set()};
 assert.deepEqual(knaveLosses(layer,removed),[{kind:'difficulty',key:'0,0'},{kind:'discovery',key:from},{kind:'content',key:from}]);
 const detached=structuredClone(layer);for(const loss of knaveLosses(layer,removed))dropKnaveLoss(detached,loss);assert.deepEqual(detached.content,{schemaVersion:1,byPoi:{},rollCounters:{}});assert.deepEqual(layer,before);
 assert.throws(()=>remapKnavePois(layer,source,removed,new Map()));assert.deepEqual(layer,before);
});
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
// they contain no book material. Production identity/coverage is checked too.
test('myth material selects only the exact compatible snapshot without mutating or repairing it',()=>{
 const poi={kind:'poi',regionId:7,hexKey:'2,-3'};
 const snapshot=index=>({definitionId:'mb.myth',definitionVersion:1,owner:{...poi},resolver:'product',revision:3,sides:[6,12],values:[[Math.floor(index/12)+1],[index%12+1]],entryIds:[`mb.myth:${index}`],texts:[{ru:`ВЫМЫШЛЕННЫЙ TEST ONLY ${index}`}],overrides:[{ru:'Авторское имя'}]});
 const content=index=>({
  ...(index%3===0?{omenPreamble:'ВЫМЫШЛЕННОЕ TEST ONLY общее вступление знамений'}:{}),
  omens:Array.from({length:index%3+1},(_,n)=>({id:`omen-${n}`,ordinal:n+1,text:`ВЫМЫШЛЕННАЯ TEST ONLY сцена ${index}/${n} ${n===0?'<script>never execute</script>':''}`})),
  roles:Array.from({length:index%4+1},(_,n)=>({id:`role-${n}`,title:n===0?'ВЫМЫШЛЕННАЯ TEST ONLY группа из двух':'TEST ONLY роль',text:`ВЫМЫШЛЕННЫЙ TEST ONLY блок ${index}/${n}`})),
  ...(index%2===0?{rolePreamble:'ВЫМЫШЛЕННОЕ TEST ONLY общее вступление'}:{})
 });
 const records=Array.from({length:72},(_,index)=>({definitionId:'mb.myth',definitionVersion:1,entryId:`mb.myth:${index}`,materialVersion:1,sourceEdition:MYTH_MATERIAL_EDITION,sourcePage:index+1,locales:{ru:content(index)},references:[{type:'unresolved',description:'TEST ONLY: вымышленная ссылка, без перехода'}]}));
 records[12].locales.en=structuredClone(content(12));records[12].locales.en.roles[0].title='TEST ONLY translated group';
 const deepFreeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;};
 const frozen=deepFreeze(records),frozenPoi=deepFreeze(poi),before=structuredClone(frozen);
 assert.equal(mythMaterialRecords.length,72,'production must contain all72 compatible myth records');
 assert.equal(new Set(mythMaterialRecords.map(record=>record.entryId)).size,72);
 assert.deepEqual(mythMaterialManifest,[{definitionId:'mb.myth',definitionVersion:1,sourceEdition:MYTH_MATERIAL_EDITION,materialVersion:1}]);
 const identities=new Set();
 for(let group=1;group<=6;group++)for(let entry=1;entry<=12;entry++){
  const index=(group-1)*12+entry-1,s=deepFreeze(snapshot(index)),saved=structuredClone(s);
  const selected=selectMythMaterial(s,frozenPoi,'myth',frozen,'ru');
  assert.equal(selected.status,'ready');assert.equal(selected.record.entryId,`mb.myth:${index}`);
  assert.deepEqual(selected.content,records[index].locales.ru);assert.equal(selected.language,'ru');assert.equal(selected.fallback,false);
  assert.deepEqual(s,saved);identities.add(materialIdentity(s,frozenPoi,'myth'));
  const actual=selectMythMaterial(s,frozenPoi,'myth',mythMaterialRecords,'ru');
  assert.equal(actual.status,'ready');assert.equal(actual.record.entryId,`mb.myth:${index}`);
  assert.equal(actual.record.sourcePage,29+index*2);
  assert.ok(!JSON.stringify(actual.content).includes('TEST ONLY'),'fictional material must stay outside production');
  const actualFallback=selectMythMaterial(s,frozenPoi,'myth',mythMaterialRecords,'en');
  assert.equal(actualFallback.status,'ready');assert.equal(actualFallback.language,'ru');assert.equal(actualFallback.fallback,true);
  assert.deepEqual(actualFallback.content,actual.content);assert.deepEqual(s,saved);
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
 for(const invalid of ['',42,'🧭'.repeat(16385)]){
  const bad=structuredClone(records);bad[0].locales.ru.omenPreamble=invalid;
  assert.equal(selectRegistry(bad).status,'error','shared introduction obeys the same string limits');
 }
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
 const save=h.render().createSaveData();assert.equal(save.version,10);h.geometry.assertHexcrawlSaveData(save);
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
