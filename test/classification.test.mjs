// CLASSIFY1: new policy has no prior coverage. Four cases cover distinct risks:
// biome defaults, discovery semantics, hostile/legacy import, real history.
// UI/POI move coverage extends the existing tags browser lifecycle.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {terrainDefault,discoveryDefault,discoveryTagEffect,emptyClassification,validateClassification,remapClassification,retainClassification} from '../src/classification.ts';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {regionFixture} from './helpers/region-fixture.mjs';
test('CLASSIFY1 all existing biome defaults and unknown are explicit, dangerous includes terrain risk',()=>{
 const app=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 const ids=[...app.split('type BiomeId =')[1].split(';')[0].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 assert.equal(ids.length,24);
 for(const id of ids)assert.equal(terrainDefault(id),id==='semi_desert'?'unknown':id.includes('mountain')||id.startsWith('swamp')?'dangerous':id.includes('hills')||id==='hilly_woodland'||id.endsWith('_forest')?'difficult':'normal',id);
 assert.equal(terrainDefault('unverified_future_biome'),'unknown');
});
test('CLASSIFY1 discovery uses exact context and semantic IDs independent of language',()=>{
 const lair={kind:'lair',biome:'plain_mixed_forest',onRoad:false,hidden:false};
 assert.equal(discoveryDefault(lair),'exploration');assert.equal(discoveryDefault({...lair,kind:'tavern'}),'unknown');assert.equal(discoveryDefault({...lair,kind:'tavern',onRoad:true}),'passage');assert.equal(discoveryDefault({...lair,kind:'tavern',onRoad:true,hidden:true}),'exploration');
 assert.equal(discoveryDefault({...lair,water:true}),'unknown');
 const owner={kind:'poi',regionId:1,hexKey:'2,0'},tag={owner,definitionVersion:1,definitionId:'mb.ruin',entryIds:['mb.ruin:42']};
 assert.equal(discoveryTagEffect('poi:1:2,0',[tag]),true);assert.equal(discoveryTagEffect('poi:2:2,0',[tag]),false);assert.equal(discoveryTagEffect('poi:1:2,0',[{...tag,overrides:[{en:'Not lost'}]}]),false);assert.equal(discoveryTagEffect('poi:1:2,0',[],{trait:{sourceRow:43}}),true);
});
test('CLASSIFY1 overrides validate version/live ownership, preserve unknown and remap only POI',()=>{
 const c={hexes:new Set(['0,0','2,0']),pois:new Set(['poi:1:2,0'])},d=emptyClassification();d.difficultyByHex['0,0']='unknown';d.discoveryByPoi['poi:1:2,0']={mode:'interaction',clueText:'Tracks'};
 assert.equal(retainClassification(d,{hexes:new Set(),pois:new Set()}),undefined);validateClassification(d,c);assert.throws(()=>validateClassification(d,c,10));assert.throws(()=>validateClassification({...d,version:2},c));assert.throws(()=>validateClassification({...d,discoveryByPoi:{'poi:1:2,0':{mode:'interaction',clueText:''}}},c));
 const moved=remapClassification(d,new Map([['poi:1:2,0','poi:2:0,0']]));assert.deepEqual(moved.difficultyByHex,d.difficultyByHex);assert.equal(moved.discoveryByPoi['poi:2:0,0'].clueText,'Tracks');assert.equal(d.discoveryByPoi['poi:2:0,0'],undefined);
});
test('CLASSIFY1 real document import/commit/history preserves map/RNG and authored overrides across modes',async()=>{
 // CENTRAL-DISCOVERY: policy unit coverage supplied kind explicitly and missed
 // actual App central-kind resolution. Reuse this real import/history callback.
 const panelRows=node=>{if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(panelRows);return node.props?[...(Object.hasOwn(node.props,'data-discovery-classification')?[node.props.children]:[]),...panelRows(node.props.children)]:[];};
 const text=node=>node==null?'':Array.isArray(node)?node.map(text).join(' '):typeof node==='object'?text(node.props?.children):String(node);
 for(const kind of ['capital','city','lair','dungeon'])for(const central of [true,false]){
  const d=regionFixture();Object.assign(d.map.regions[0],{centerHex:{q:2,r:0},biomeId:'open_plains',suppressCentralPoi:!central,centralPoiKind:central?kind:undefined,pointsOfInterest:central?[]:[{q:2,r:0}],pointOfInterestKinds:central?{}:{'2,0':kind}});d.map.biomeOverrideByHexKey={'2,0':'open_plains'};d.map.roads=[];d.map.crossings=[];delete d.map.classification;delete d.map.knave;d.ui.selectedHex={q:2,r:0};
  const app=createGenerationHarness(42);app.render();app.guardRandom();const alerts=[];app.setWindow({alert:m=>alerts.push(m)});app.injectFunction('readTextFile',async f=>f.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'x'}});assert.deepEqual(alerts,[]);
  const expected=kind==='capital'||kind==='city'?'При прохождении':'Нужно исследование';
  const verify=()=>assert.deepEqual(panelRows(app.render().knavePanel).map(text),[expected],`${central?'central':'secondary'} ${kind}`);
  const before=app.render().captureDocument();verify();assert.deepEqual(app.render().captureDocument(),before,'derived discovery is read-only');
  if(central){assert.equal(app.render().startDetailAdaptation(),true);assert.equal(app.render().applyDetailAdaptation(),true);const footprint=app.render().captureDocument().map.physicalGrid.poiFootprints.find(x=>x.legacyRef==='poi:1:2,0');assert.ok(footprint);assert.equal(app.render().selectDetailCell(footprint.cells[0],undefined,1,footprint.poiId),true);verify();}
  const saved=app.render().createSaveData();saved.version=11;saved.map.classification={version:1,difficultyByHex:{},discoveryByPoi:{'poi:1:2,0':{mode:'unknown',clueText:''}}};await app.render().handleImportJson({target:{files:[{text:JSON.stringify(saved)}],value:'x'}});assert.deepEqual(panelRows(app.render().knavePanel),[],'explicit unknown suppresses default');
  saved.map.classification.discoveryByPoi['poi:1:2,0']={mode:'interaction',clueText:'CENTRAL-MANUAL-CLUE'};await app.render().handleImportJson({target:{files:[{text:JSON.stringify(saved)}],value:'x'}});assert.ok(text(app.render().knavePanel).includes('CENTRAL-MANUAL-CLUE'));
 }
 const h=createGenerationHarness(42);h.render();h.setWindow({alert:()=>{},confirm:()=>true,matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(regionFixture())}],value:'x'}});
 const snapshot=()=>{const d=JSON.parse(JSON.stringify(h.render().createSaveData()));delete d.savedAt;return d;},before=snapshot();
 
 h.render().setEditMode(true);h.render();assert.equal(h.render().changeKnaveDraft({difficulty:'dangerous'}),true);h.render();assert.equal(h.render().finishKnaveDraft(),true);const after=snapshot();assert.equal(after.version,11);assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.map.regions,before.map.regions);
 h.render().undoMap();assert.deepEqual(snapshot(),before);h.render().redoMap();assert.deepEqual(snapshot(),after);
 h.render().changeGenerationMode('mythic');assert.deepEqual(snapshot().map,after.map);h.render().changeGenerationMode('classic');assert.deepEqual(snapshot().map,after.map);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(after)}],value:'x'}});assert.deepEqual(snapshot(),after);
 h.render().setEditMode(true);h.render();assert.equal(h.render().changeKnaveDraft({difficulty:'auto'}),true);h.render();assert.equal(h.render().finishKnaveDraft(),true);assert.equal(snapshot().map.classification,undefined);assert.equal(snapshot().version,10);h.render().undoMap();assert.deepEqual(snapshot(),after);
 const invalid=structuredClone(after);invalid.map.classification.difficultyByHex['99,99']='normal';await h.render().handleImportJson({target:{files:[{text:JSON.stringify(invalid)}],value:'x'}});assert.deepEqual(snapshot(),after);
});
