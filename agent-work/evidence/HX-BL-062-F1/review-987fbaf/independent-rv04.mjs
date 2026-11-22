import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const repo=path.resolve(process.argv[2]), earlier=process.argv[3]==='old';
const {createGenerationHarness}=await import(pathToFileURL(path.join(repo,'test/helpers/generation-harness.mjs')));
const {createGenerationState}=await import(pathToFileURL(path.join(repo,'src/worldRandom.ts')));
const baseline=JSON.parse(fs.readFileSync(path.join(repo,'test/fixtures/import-v2/baseline-mythic.json'),'utf8'));
const counts={original:0,alternate:0,history:0,fresh_imports:0,prior_absent:0};
const result=[];
const labels={passage:'При прохождении',exploration:'При исследовании',interaction:'Секретное место'};
const canon=x=>JSON.parse(JSON.stringify(x));
const make=()=>{const h=createGenerationHarness(732),a=()=>h.render(),alerts=[];h.setWindow({alert:m=>alerts.push(m),confirm:()=>true});h.injectFunction('readTextFile',async f=>f.text);return {a,open:async doc=>{await a().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:'rv04'}});assert.deepEqual(alerts,[]);},exported:()=>canon(a().createSaveData())};};
const payload=x=>({map:x.map,counters:x.counters,generation:x.generation});
const originalCases=[['poi:1:2,6','cave','exploration',64],['waterPoi:0,5','underwater_cave','interaction',69]];
const altCases=[['poi:3:4,3','lair','exploration',35],['waterPoi:-1,5','lair','interaction',51]];
for(const alternate of [false,true])for(const knave of [false,true])for(const appended of [false,true]){
 const t=make();await t.open(baseline);assert.equal(t.exported().map.regions.length,27);
 if(alternate){const before=t.exported();before.generation=createGenerationState(0);before.map.poiDiscovery={'poi:1:3,6':'interaction'};before.map.gmNotesByHexKey={'3,6':' Авторская заметка\nстрока 2 '};await t.open(before);}
 if(knave){assert.ok(t.a().chooseKnaveProfile(true));assert.equal(t.exported().ui.knaveEnabled,true);}
 if(appended){const generated=t.a().safelyAddRegionToMap({q:-2,r:12},{targetSize:18,landType:'wild',coastalPreference:'mainland'});assert.ok(generated.success);assert.equal(t.exported().map.regions.length,28);assert.equal(t.exported().map.regions.at(-1).generationMode??'classic','classic');}
 for(const [owner,kind,expected,roll] of alternate?altCases:originalCases){
  const water=owner.startsWith('waterPoi:'),key=owner.split(':').at(-1),[q,r]=key.split(',').map(Number),cell={q,r};
  t.a().setEditMode(true);t.a().setSelectedHex(cell);
  const prior=t.exported();assert.equal(prior.generation.masterSeed,alternate?0:1792059816);assert.equal(prior.map.poiDiscovery?.[owner],undefined);
  if(water)t.a().setSelectedWaterPoiKind(kind);else t.a().setSelectedPoiKind(kind);
  const after=t.exported();const actualKind=water?after.map.waterPoiByHexKey[key]:after.map.regions.find(x=>x.id===Number(owner.split(':')[1])).pointOfInterestKinds[key];
  assert.equal(actualKind,kind);assert.equal(after.map.poiDiscovery?.[owner],earlier?undefined:expected);
  assert.deepEqual(after.map.poiDiscovery??{},earlier?(prior.map.poiDiscovery??{}):{...(prior.map.poiDiscovery??{}),[owner]:expected});
  assert.deepEqual(after.map.gmNotesByHexKey,prior.map.gmNotesByHexKey);assert.deepEqual(after.generation,prior.generation);
  t.a().setEditMode(false);assert.ok(JSON.stringify(t.a().knavePanel).includes(labels[earlier?'passage':expected]));
  t.a().undoMap();assert.deepEqual(payload(t.exported()),payload(prior));t.a().redoMap();assert.deepEqual(payload(t.exported()),payload(after));counts.history++;
  const other=make();await other.open(after);other.a().setSelectedHex(cell);assert.equal(other.exported().map.poiDiscovery?.[owner],earlier?undefined:expected);assert.ok(JSON.stringify(other.a().knavePanel).includes(labels[earlier?'passage':expected]));counts.fresh_imports++;
  t.a().setEditMode(true);t.a().setSelectedHex(cell);if(water)t.a().deleteSelectedWaterPoi();else t.a().deleteSelectedPoi();const removed=t.exported();assert.equal(removed.map.poiDiscovery?.[owner],undefined);assert.deepEqual(removed.map.poiDiscovery??{},prior.map.poiDiscovery??{});t.a().undoMap();assert.deepEqual(payload(t.exported()),payload(after));t.a().redoMap();assert.deepEqual(payload(t.exported()),payload(removed));counts.history++;
  if(earlier)counts.prior_absent++;counts[alternate?'alternate':'original']++;
  result.push({knave,appended,seed:prior.generation.masterSeed,owner,kind,roll,mode:after.map.poiDiscovery?.[owner]??null});
 }
}
if(!earlier){
 const t=make();await t.open(baseline);t.a().changeGenerationMode('mythic');t.a().setEditMode(true);t.a().setSelectedHex({q:2,r:6});t.a().setSelectedPoiKind('monument');const old=t.exported();assert.equal(old.map.regions[0].pointOfInterestKinds['2,6'],'monument');assert.equal(old.map.poiDiscovery?.['poi:1:2,6'],undefined);
 const prior=old.map.regions.length;const added=t.a().safelyAddRegionToMap(t.a().candidateHexes[0],{mode:'mythic',targetSize:18,landType:'wild',coastalPreference:'mainland'});assert.equal(added.success,true);const fresh=t.exported();assert.equal(fresh.map.regions.length,prior+1);assert.equal(fresh.map.regions.at(-1).generationMode,'mythic');assert.deepEqual(fresh.map.poiDiscovery??{},{});await t.open(fresh);console.log('Mythic manual and real region generation controls passed');
}
console.log(JSON.stringify({revision:earlier?'5f600d5':'987fbaf',counts,result},null,2));process.exit(0);
