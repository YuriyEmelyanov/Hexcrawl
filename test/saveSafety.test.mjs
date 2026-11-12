import {projectOneMile} from '../src/oneMile.ts';
import {newKnaveLayer} from '../src/knaveClassic.ts';
import {knaveContentFixture,knaveCatalogFixture} from './helpers/knave-fixture.mjs';
import {seaFixture} from './helpers/sea-fixture.mjs';
import {regionFixture} from './helpers/region-fixture.mjs';
import {createGenerationState} from '../src/worldRandom.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
import { assertGeneratedIds } from '../src/saveValidation.ts';
const h = createGenerationHarness(42);
h.render().addFallbackTractToMap({q:0,r:0});
const valid = JSON.parse(JSON.stringify(h.render().createSaveData()));
const cases = {
  'v7 missing river features': d => delete d.map.riverFeatures,
  'v7 array river features': d => d.map.riverFeatures=[],
  'v7 missing river counter': d => delete d.counters.nextRiverId,
  'v7 stale river counter': d => d.counters.nextRiverId=0,
  'notes null container': d => d.map.gmNotesByHexKey = null,
  'notes array container': d => d.map.gmNotesByHexKey = [],
  'notes scalar container': d => d.map.gmNotesByHexKey = 'secret',
  'notes non-string': d => d.map.gmNotesByHexKey = {'0,0': 42},
  'notes noncanonical key': d => d.map.gmNotesByHexKey = {'00,0': 'secret'},
  'notes orphan': d => d.map.gmNotesByHexKey = {'99999,99999': 'secret'},
  'notes prototype key': d => d.map.gmNotesByHexKey = JSON.parse('{"__proto__":"secret"}'),
  'road wrong structure': d => d.map.roads.push({id:1,regionId:1,segments:'broken'}),
  'fractional axial': d => d.map.regions[0].hexes[0].q = 0.5,
  'duplicate region id': d => d.map.regions.push(structuredClone(d.map.regions[0])),
  'invalid region enum': d => d.map.regions[0].biomeId = 'not-a-biome',
  'noncanonical terrain key': d => d.map.terrainByHexKey['0,0suffix'] = {},
  'wrong rotation type': d => d.ui.isMapRotated = 'false',
  'wrong scale type': d => d.ui.mapScale = '2',
  'unsafe next road counter': d => d.counters.nextRoadId = Number.MAX_SAFE_INTEGER+1,
  'dangling water POI': d => d.map.waterPoiByHexKey['500,500'] = 'shipwreck',
};
for (const [name, mutate] of Object.entries(cases)) test(`reject ${name}`, () => {
  const data = structuredClone(valid); mutate(data);
  assert.throws(() => h.geometry.assertHexcrawlSaveData(data), undefined, name);
});
for (const filename of ['lake-reentry-map','sea-pocket-map','terrain-display-map','road-entry-zigzags']) {
  test(`supported corpus: ${filename}`, () => {
    const data = JSON.parse(fs.readFileSync(new URL(`./fixtures/${filename}.json`, import.meta.url)));
    assert.doesNotThrow(() => h.geometry.assertHexcrawlSaveData(data));
  });
}

test('generated proposals reject overflow in every allocated ID namespace and counter', () => {
  const proposal = () => ({regions:[{id:1}], rivers:[{id:1}], roads:[{id:1}], kingdoms:[{id:1}],
    hexTerrainByKey:new Map([['0,0',{lakeId:1}]]), nextLakeId:2, nextRoadId:2, nextRiverId:2, obstacles:[{id:1}], nextObstacleId:2});
  for (const field of ['regions','rivers','roads','kingdoms','obstacles']) {
    const data=proposal(); data[field].push({id:Number.MAX_SAFE_INTEGER+1});
    assert.throws(()=>assertGeneratedIds(data), undefined, field+' unsafe ID');
    data[field]=[{id:Number.MAX_SAFE_INTEGER},{id:Number.MAX_SAFE_INTEGER}];
    assert.throws(()=>assertGeneratedIds(data), undefined, field+' rounded duplicate');
  }
  for (const field of ['nextLakeId','nextRoadId','nextObstacleId','nextRiverId']) {
    const data=proposal(); data[field]=Number.MAX_SAFE_INTEGER+1;
    assert.throws(()=>assertGeneratedIds(data), undefined, field);
    data[field]=Number.MAX_SAFE_INTEGER; assert.doesNotThrow(()=>assertGeneratedIds(data));
  }
  for (const id of [Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER+1]) {
    const lake=proposal(); lake.hexTerrainByKey.set('0,0',{lakeId:id});
    assert.throws(()=>assertGeneratedIds(lake), undefined, 'lake ID');
    const road=proposal(); road.roads=[{id}];
    assert.throws(()=>assertGeneratedIds(road), undefined, 'road counter normalization');
  }
});

for (const family of ['roadCounter','regionId','lakeCounter','riverId']) {
  test(`imported boundary ${family}: production continuation stays valid or rolls back whole document`, async () => {
    const t=createGenerationHarness(42);t.render();
    t.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});
    t.injectFunction('readTextFile',async f=>f.text);
    const data=JSON.parse(fs.readFileSync(new URL(`./fixtures/import-v2/${family==='regionId'?'manual-edit-map':'baseline-classic'}.json`,import.meta.url)));
    if(family==='roadCounter'){data.counters.nextRoadId=Number.MAX_SAFE_INTEGER;data.generation=createGenerationState(0);}
    if(family==='lakeCounter')data.counters.nextLakeId=Number.MAX_SAFE_INTEGER;
    if(family==='regionId')data.map.regions[0].id=Number.MAX_SAFE_INTEGER;
    if(family==='riverId') {
      const river=data.map.rivers[0],old=river.id;river.id=Number.MAX_SAFE_INTEGER;
      for(const s of river.sectors)s.riverId=String(river.id);
      for(const r of data.map.rivers)if(r.deltaParentRiverId===old)r.deltaParentRiverId=river.id;
      for(const c of data.map.crossings)if(c.riverId===old)c.riverId=river.id;
    }
    if(family==='riverId'){
      const alerts=[];t.setWindow({alert:m=>alerts.push(m),matchMedia:()=>({matches:false})});
      const before=JSON.stringify(t.render().captureDocument()),stacks=JSON.stringify([t.render().undoHistory,t.render().redoHistory]);
      await t.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});
      assert.equal(alerts.length,1);assert.match(alerts[0],/map.rivers/);assert.equal(JSON.stringify(t.render().captureDocument()),before);assert.equal(JSON.stringify([t.render().undoHistory,t.render().redoHistory]),stacks);return;
    }
    await t.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});
    t.render().setSelectedHex(data.map.regions[0].centerHex);
    t.render().setSelectedHexBiomeOverride('open_hills');t.render().undoMap();
    const document=()=>structuredClone(t.render().captureDocument());
    const stacks=()=>structuredClone([t.render().undoHistory,t.render().redoHistory]);
    const before=document(),history=stacks();
    const result=t.render().safelyAddRegionToMap(t.render().candidateHexes[0],{targetSize:8,coastalPreference:'mainland'});
    if(['roadCounter','regionId'].includes(family))assert.equal(result.success,false, family+' reproduced F1 refuses commit');
    if(!result.success){assert.deepEqual(document(),before);assert.deepEqual(stacks(),history);}
    t.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(t.render().createSaveData())));
  });
}

test('exhausted kingdom ID refuses production start and preserves document and both stacks', async () => {
  const t=createGenerationHarness(42);t.render();
  t.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});t.injectFunction('readTextFile',async f=>f.text);
  const data=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/baseline-mythic.json',import.meta.url)));
  const old=data.map.kingdoms[0].id;data.map.kingdoms[0].id=Number.MAX_SAFE_INTEGER;
  for(const r of data.map.regions)if(r.kingdomId===old)r.kingdomId=Number.MAX_SAFE_INTEGER;
  for(const o of data.map.obstacles)if(o.kingdomId===old)o.kingdomId=Number.MAX_SAFE_INTEGER;
  await t.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});
  t.render().setSelectedHex(data.map.regions[0].centerHex);t.render().setSelectedHexBiomeOverride('open_hills');t.render().undoMap();
  const before=structuredClone(t.render().captureDocument()), stacks=structuredClone([t.render().undoHistory,t.render().redoHistory]);
  t.render().startKingdom(t.render().candidateHexes[0]);
  assert.equal(t.render().kingdomJob,null);assert.ok(t.render().generationError);
  assert.deepEqual(structuredClone(t.render().captureDocument()),before);assert.deepEqual(structuredClone([t.render().undoHistory,t.render().redoHistory]),stacks);
  t.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(t.render().createSaveData())));
});


// DATA-03/04: distinct format contract, reusing the same structural validator.
test('notes versions 2/3/4/5 accept exact text on actual land/water; v4+ require RNG and future versions reject', () => {
  const land=valid.map.regions[0].hexes[0], k=`${land.q},${land.r}`;
  for(const version of [2,3,4,5]) {
    const data=structuredClone(valid); data.version=version;
    data.map.terrainByHexKey['-999,0']={terrainOverride:'sea'};
    data.map.gmNotesByHexKey={[k]:'  🗝 <script>not HTML</script>\r\n ', '-999,0':'sea'};
    assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(data));
    delete data.map.gmNotesByHexKey;assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(data));
  }
  const bad=structuredClone(valid);bad.version=4;delete bad.generation;
  assert.throws(()=>h.geometry.assertHexcrawlSaveData(bad));
  bad.version=7;assert.throws(()=>h.geometry.assertHexcrawlSaveData(bad));
});

const loadAuthoredMap=async()=>{
  const g=createGenerationHarness(42);g.render();const alerts=[];
  g.setWindow({alert:m=>alerts.push(m),matchMedia:()=>({matches:false}),confirm:()=>false});g.injectFunction('readTextFile',async f=>f.text);
  const old=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/manual-edit-map.json',import.meta.url)));
  await g.render().handleImportJson({target:{files:[{text:JSON.stringify(old)}],value:'x'}});assert.deepEqual(alerts,[]);
  const data=g.render().createSaveData(),r=data.map.regions[0];
  const point=r.pointsOfInterest.find(h=>h.q!==r.centerHex.q||h.r!==r.centerHex.r)??r.hexes.find(h=>h.q!==r.centerHex.q||h.r!==r.centerHex.r);
  if(!r.pointsOfInterest.some(h=>h.q===point.q&&h.r===point.r))r.pointsOfInterest.push(point);
  r.pointOfInterestKinds={...r.pointOfInterestKinds,[`${point.q},${point.r}`]:'village'};
  const key=`poi:${r.id}:${point.q},${point.r}`;data.map.editorNames={[key]:{ru:'Авторское имя',en:'Authored name'}};
  return {g,alerts,data,key,point};
};
test('E8 v8 authored POI names use real import,exact export and UndoRedo without touching hex notes',async()=>{
 const {g,alerts,data,key}=await loadAuthoredMap();const before=structuredClone(g.render().captureDocument());
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});assert.deepEqual(alerts,[]);
 const after=structuredClone(g.render().captureDocument());assert.deepEqual(after.map.editorNames,data.map.editorNames);
 assert.deepEqual(g.render().createSaveData().map.editorNames,data.map.editorNames);assert.equal(g.render().createSaveData().version,10);
 g.render().undoMap();assert.deepEqual(g.render().captureDocument().map.editorNames,before.map.editorNames);
 g.render().redoMap();assert.deepEqual(structuredClone(g.render().captureDocument()),after);assert.equal(after.map.editorNames[key].ru,'Авторское имя');
 assert.deepEqual(after.map.gmNotesByHexKey,before.map.gmNotesByHexKey);
 // KNC-A02/A07/A09: same real importer and history path, not a second suite.
 const knave=structuredClone(g.render().createSaveData());knave.map.knave=newKnaveLayer();
 knave.map.knave.discoveryByPoi[key]={mode:'interaction',clueText:'Authored test clue'};
 knave.map.knave.content=knaveContentFixture(key,{kind:'settlement'});
 knave.map.knave.difficultyByHex[key.split(':')[2]]='difficult';
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(knave)}],value:''}});assert.deepEqual(alerts,[]);
 const accepted=structuredClone(g.render().captureDocument());
 assert.deepEqual(structuredClone(g.render().createSaveData().map.knave),knave.map.knave);
 g.render().undoMap();assert.equal(g.render().createSaveData().map.knave,undefined);
 g.render().redoMap();assert.deepEqual(structuredClone(g.render().captureDocument()),accepted);
 // Extend this lifecycle case: UI drafts must not enter accepted JSON/history,
 // and stale closures must never retarget a clue to another document.
 g.render().setEditMode(true);g.render().setSelectedHex(Object.fromEntries(['q','r'].map((axis,i)=>[axis,Number(key.split(':')[2].split(',')[i])])));
 const uiBefore=structuredClone(g.render().createSaveData().map),uiHistory=g.render().undoHistory.length;
 assert.equal(g.render().changeKnaveDraft({mode:'interaction',clueText:''}),true);
 const stale=g.render().knaveDraft;
 assert.equal(g.render().finishKnaveDraft(),false);assert.ok(g.render().knaveError);
 assert.deepEqual(structuredClone(g.render().createSaveData().map),uiBefore);assert.equal(g.render().undoHistory.length,uiHistory);
 g.render().undoMap();g.render().resetMap();assert.deepEqual(structuredClone(g.render().createSaveData().map),uiBefore);
 assert.equal(g.render().changeKnaveDraft({clueText:'  <Authored UI clue>  '}),true);
 assert.equal(g.render().changeKnaveDraft({clueText:'stale'},stale),false);
 assert.equal(g.render().finishKnaveDraft(),true);
 assert.equal(g.render().createSaveData().map.knave.discoveryByPoi[key].clueText,'<Authored UI clue>');
 g.render().undoMap();assert.deepEqual(structuredClone(g.render().createSaveData().map),uiBefore);
 const noOpHistory=g.render().undoHistory.length;
 assert.equal(g.render().changeKnaveDraft({mode:'interaction'}),true);assert.equal(g.render().finishKnaveDraft(),true);assert.equal(g.render().undoHistory.length,noOpHistory);
 assert.equal(g.render().changeKnaveDraft({difficulty:'normal'}),true);assert.equal(g.render().resetKnaveDraft(),true);
 assert.equal(g.render().finishKnaveDraft(stale),false);
 g.render().applyDocument(accepted);g.render();
 const history=structuredClone([g.render().undoHistory,g.render().redoHistory]);
 for(const mutate of [d=>d.version=9,d=>delete d.generation,d=>d.ui.knaveEnabled='yes',d=>{d.ui.knaveEnabled=true;delete d.map.knave;},d=>d.map.knave=null,d=>d.map.knave.profile.physicalHex.measurementConvention='vertices',d=>d.map.knave.content=null,d=>d.map.knave.content.byPoi[key].catalogVersion='future',d=>d.map.knave.discoveryByPoi[key].clueText='',d=>d.map.knave.discoveryByPoi['poi:999:0,0']={mode:'passage',clueText:''}]){
  const invalid=structuredClone(knave);mutate(invalid);await g.render().handleImportJson({target:{files:[{text:JSON.stringify(invalid)}],value:''}});
  assert.equal(alerts.length,1);alerts.pop();assert.deepEqual(structuredClone(g.render().captureDocument()),accepted);assert.deepEqual(structuredClone([g.render().undoHistory,g.render().redoHistory]),history);
 }
 const restore=g.injectFunction('randomInt',()=>{throw Error('KNC injected generation failure');});
 g.render().generateAt(g.render().candidateHexes[0]);restore();
 assert.deepEqual(structuredClone(g.render().captureDocument()),accepted,'actual generation backup restores Knave data');
 assert.deepEqual(structuredClone([g.render().undoHistory,g.render().redoHistory]),history);
 const empty=createGenerationHarness(42);empty.render();const blank=empty.render().createSaveData();blank.map.knave=newKnaveLayer();
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(blank)}],value:''}});assert.deepEqual(alerts,[]);
 assert.ok(g.render().createSaveData().map.knave);g.render().resetMap();assert.equal(g.render().createSaveData().map.knave,undefined,'empty profile can be reset');
 g.render().undoMap();assert.deepEqual(structuredClone(g.render().createSaveData().map.knave),blank.map.knave);
 const profile=createGenerationHarness(42);profile.render();const initial=structuredClone(profile.render().captureDocument());
 assert.equal(profile.render().chooseKnaveProfile(true),true);assert.equal(profile.render().undoHistory.length,0);
 assert.deepEqual(structuredClone(profile.render().generationRef.current),initial.map.generation);
 profile.render().changeGenerationMode('mythic');assert.equal(profile.render().generationMode,'mythic');assert.deepEqual(structuredClone(profile.render().createSaveData().map.knave),newKnaveLayer());
 assert.equal(profile.render().chooseKnaveProfile(true),false);profile.render().changeGenerationMode('classic');profile.render().chooseKnaveProfile(true);
 profile.injectFunction('knaveGenerationCatalog',knaveCatalogFixture);profile.render().addFallbackTractToMap({q:0,r:0});
 const knaveMap=structuredClone(profile.render().createSaveData().map),knaveHistory=profile.render().undoHistory.length;
 assert.equal(profile.render().chooseKnaveProfile(false),true);assert.equal(profile.render().createSaveData().ui.knaveEnabled,false);assert.deepEqual(structuredClone(profile.render().createSaveData().map),knaveMap);assert.equal(profile.render().undoHistory.length,knaveHistory+1);
 profile.render().undoMap();assert.equal(profile.render().createSaveData().ui.knaveEnabled,true);profile.render().redoMap();assert.equal(profile.render().createSaveData().ui.knaveEnabled,false);assert.deepEqual(structuredClone(profile.render().createSaveData().map),knaveMap);
 const plainProfile=structuredClone(profile.render().createSaveData());
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(plainProfile)}],value:''}});assert.deepEqual(alerts,[]);assert.equal(g.render().createSaveData().ui.knaveEnabled,false);
 assert.equal(profile.render().chooseKnaveProfile(true),true);assert.deepEqual(structuredClone(profile.render().createSaveData().map),knaveMap);
 const kept=structuredClone(profile.render().createSaveData().map),modeHistory=profile.render().undoHistory.length;
 profile.setWindow({confirm:()=>{throw Error('Mode switching must not ask to erase the map');}});
 profile.render().changeGenerationMode('mythic');assert.equal(profile.render().generationMode,'mythic');assert.deepEqual(structuredClone(profile.render().createSaveData().map),kept);assert.equal(profile.render().undoHistory.length,modeHistory);
 profile.geometry.assertHexcrawlSaveData(JSON.parse(JSON.stringify(profile.render().createSaveData())));
 const mixed=structuredClone(knave);mixed.ui.generationMode='mythic';
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(mixed)}],value:''}});assert.deepEqual(alerts,[]);assert.equal(g.render().generationMode,'mythic');assert.deepEqual(structuredClone(g.render().createSaveData().map.knave),knave.map.knave);
 profile.render().changeGenerationMode('classic');assert.deepEqual(structuredClone(profile.render().createSaveData().map),kept);assert.equal(profile.render().undoHistory.length,modeHistory);
});
test('E8 malformed,orphan and older-version authored names refuse atomically in the real importer',async()=>{
 const {g,alerts,data,key}=await loadAuthoredMap();
 for(const mutate of [d=>d.map.editorNames=null,d=>d.map.editorNames=[],d=>d.map.editorNames[key].ru='',d=>d.map.editorNames['poi:999:999,0']={en:'X',ru:'Х'},d=>d.version=7,d=>{const r=d.map.regions[0];r.isTract=false;r.suppressCentralPoi=false;r.centralPoiKind='lair';r.pointsOfInterest.push({...r.centerHex});r.pointOfInterestKinds[`${r.centerHex.q},${r.centerHex.r}`]='ruins';d.map.editorNames[`poi:${r.id}:${r.centerHex.q},${r.centerHex.r}`]={en:'Ambiguous',ru:'Неоднозначное'};}]){
  const bad=structuredClone(data);mutate(bad);const before=structuredClone(g.render().captureDocument()),stacks=structuredClone([g.render().undoHistory,g.render().redoHistory]);
  await g.render().handleImportJson({target:{files:[{text:JSON.stringify(bad)}],value:'x'}});
  assert.match(alerts.pop(),/map.editorNames/);assert.deepEqual(structuredClone(g.render().captureDocument()),before);assert.deepEqual(structuredClone([g.render().undoHistory,g.render().redoHistory]),stacks);
 }
 const legacy=regionFixture();legacy.map.regions[0].suppressCentralPoi=false;legacy.map.regions[0].centralPoiKind='lair';legacy.map.regions[0].pointsOfInterest.push({q:0,r:0});legacy.map.regions[0].pointOfInterestKinds['0,0']='village';await g.render().handleImportJson({target:{files:[{text:JSON.stringify(legacy)}],value:'x'}});assert.deepEqual(alerts,[]);g.render().setEditMode(true);assert.equal(g.render().nameTargets.some(t=>t.poiLocator==='poi:1:0,0'),false);const unchanged=structuredClone(g.render().captureDocument());g.render().showNameTarget('poi:1:0,0');assert.equal(g.render().nameDraft,null);assert.deepEqual(structuredClone(g.render().captureDocument()),unchanged);
});
test('E8 type change preserves paired settlement name before entity reconciliation',async()=>{
 const {g,alerts,data,point}=await loadAuthoredMap();delete data.map.editorNames;
 const r=data.map.regions[0],key=`settlement:${r.id}:${point.q},${point.r}`;
 data.map.toponyms.names[key]={en:'Kept settlement',ru:'Сохранённое поселение',kind:'settlement',model:'germanic',revision:9};
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});assert.deepEqual(alerts,[]);
 g.render().setSelectedHex(point);g.render().setSelectedPoiKind('ruins');
 const saved=g.render().createSaveData();assert.deepEqual(saved.map.editorNames[`poi:${r.id}:${point.q},${point.r}`],{en:'Kept settlement',ru:'Сохранённое поселение'});
 g.render().undoMap();assert.deepEqual(g.render().createSaveData().map.editorNames,{});
 g.render().redoMap();assert.deepEqual(g.render().createSaveData().map.editorNames,saved.map.editorNames);
});

for(const context of ['land','water','center'])test(`E8 paired name form commits and clears one atomic ${context} POI`,async()=>{
 const {g,alerts,data,point}=await loadAuthoredMap(),r=data.map.regions[0],k=`${point.q},${point.r}`;
 let key=`poi:${r.id}:${k}`;data.map.editorNames={};r.pointOfInterestKinds[k]='ruins';
 if(context==='water'){
  r.pointsOfInterest=r.pointsOfInterest.filter(h=>`${h.q},${h.r}`!==k);delete r.pointOfInterestKinds[k];data.map.terrainByHexKey[k]={terrainOverride:'lake',lakeId:99};data.map.waterPoiByHexKey[k]='rocks';key=`waterPoi:${k}`;
 }else if(context==='center'){
  r.isTract=false;r.suppressCentralPoi=false;r.centralPoiKind='lair';key=`poi:${r.id}:${r.centerHex.q},${r.centerHex.r}`;
 }
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});assert.deepEqual(alerts,[]);
 g.render().setEditMode(true);const before=g.render().undoHistory.length;assert.ok(g.render().nameTargets.some(t=>t.key===key));
 g.render().showNameTarget(key);g.render().changeNameDraft('  Первое имя  ',g.render().nameDraft);g.render().changeOtherNameDraft('  First name  ',g.render().nameDraft);
 assert.equal(g.render().saveNameDraft(),true);assert.deepEqual(g.render().createSaveData().map.editorNames[key],{ru:'Первое имя',en:'First name'});assert.equal(g.render().undoHistory.length,before+1);
 const named=structuredClone(g.render().captureDocument());g.render().undoMap();assert.deepEqual(g.render().createSaveData().map.editorNames,{});g.render().redoMap();assert.deepEqual(structuredClone(g.render().captureDocument()),named);
 g.render().showNameTarget(key);g.render().changeNameDraft('',g.render().nameDraft);g.render().changeOtherNameDraft('',g.render().nameDraft);assert.equal(g.render().saveNameDraft(),true);assert.deepEqual(g.render().createSaveData().map.editorNames,{});
});
test('E8 paired name form rejects half-pairs,duplicates and captured old secondary-field writes',async()=>{
 const {g,alerts,data,key}=await loadAuthoredMap();data.map.editorNames={};data.map.regions[0].pointOfInterestKinds[key.split(':')[2]]='ruins';
 await g.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});assert.deepEqual(alerts,[]);
 g.render().setEditMode(true);g.render().showNameTarget(key);const old=g.render().nameDraft;
 g.render().changeNameDraft('Только одно имя',old);const before=JSON.stringify(g.render().captureDocument()),count=g.render().undoHistory.length;
 assert.equal(g.render().saveNameDraft(),false);assert.equal(JSON.stringify(g.render().captureDocument()),before);assert.equal(g.render().undoHistory.length,count);
 g.render().cancelNameDraft();g.render().showNameTarget(key);const active=g.render().nameDraft;g.render().changeOtherNameDraft('stale',old);assert.equal(g.render().nameDraft,active);
 const other=g.render().nameTargets.find(t=>!t.poiLocator&&t.ru&&t.en);assert.ok(other);g.render().changeNameDraft(other.ru,g.render().nameDraft);g.render().changeOtherNameDraft('Unique other',g.render().nameDraft);assert.equal(g.render().saveNameDraft(),false);assert.equal(JSON.stringify(g.render().captureDocument()),before);
 g.render().cancelNameDraft();g.render().showNameTarget(key);g.render().changeNameDraft('Новая точка',g.render().nameDraft);g.render().changeOtherNameDraft('New point',g.render().nameDraft);
 const restore=g.injectFunction('structuredClone',value=>{if(value?.regions&&value?.toponyms)throw Error('injected pair preparation');return structuredClone(value);});assert.equal(g.render().saveNameDraft(),false);restore();assert.match(g.render().nameErrors.general,/Не удалось изменить название/);assert.equal(JSON.stringify(g.render().captureDocument()),before);
 g.render().cancelNameDraft();const mythic=regionFixture('mythic');mythic.map.regions[0].pointOfInterestKinds['2,0']='monument';await g.render().handleImportJson({target:{files:[{text:JSON.stringify(mythic)}],value:'x'}});assert.deepEqual(alerts,[]);g.render().setEditMode(true);g.render().showNameTarget('poi:1:2,0');g.render().changeNameDraft('Моё имя',g.render().nameDraft);g.render().changeOtherNameDraft('My Name',g.render().nameDraft);assert.equal(g.render().saveNameDraft(),true);g.render().showNameTarget('kingdom:1');const exact=JSON.stringify(g.render().captureDocument()),stack=g.render().undoHistory.length;g.render().changeNameDraft('Моё имя',g.render().nameDraft);assert.equal(g.render().saveNameDraft(),false);assert.equal(JSON.stringify(g.render().captureDocument()),exact);assert.equal(g.render().undoHistory.length,stack);g.render().cancelNameDraft();g.render().showNameTarget('kingdom:1');assert.equal(g.render().saveNameDraft(),true);assert.equal(g.render().undoHistory.length,stack);g.render().setLanguage('en');g.render().showNameTarget('kingdom:1');const enBefore=JSON.stringify(g.render().captureDocument());g.render().changeNameDraft('My Name',g.render().nameDraft);assert.equal(g.render().saveNameDraft(),false);assert.equal(JSON.stringify(g.render().captureDocument()),enBefore);g.render().cancelNameDraft();
});

test('SEA v2-v8 metadata migration and strict v9 refusal use the real atomic importer',async()=>{
 const {g,alerts}=await loadAuthoredMap();const raw=seaFixture();raw.map.editorNames={};
 for(const version of [2,3,4,5,6,7,8]){
  const data=structuredClone(raw);data.version=version;delete data.map.seas;delete data.map.nextSeaId;
  if(version<8)delete data.map.editorNames;
  await g.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});assert.deepEqual(alerts,[]);
  const saved=structuredClone(g.render().createSaveData());assert.equal(saved.version,10);assert.deepEqual(saved.map.seas,[{id:1,hexKeys:['-1,2','0,2','1,2','2,2','3,2','3,3']}]);assert.equal(saved.map.nextSeaId,2);assert.deepEqual(saved.generation,data.generation);assert.deepEqual(saved.map.terrainByHexKey,data.map.terrainByHexKey);
 }
 const valid=structuredClone(g.render().createSaveData()),before=structuredClone(g.render().captureDocument()),stacks=structuredClone([g.render().undoHistory,g.render().redoHistory]);
 for(const mutate of [d=>delete d.map.seas,d=>delete d.map.nextSeaId,d=>d.map.seas[0].hexKeys.pop(),d=>d.map.seas.push({...d.map.seas[0]}),d=>d.map.nextSeaId=1,d=>d.map.editorNames={'sea:999':{en:'X',ru:'Х'}},d=>d.version=11,d=>{d.version=8;d.map.editorNames={'sea:1':{en:'X',ru:'Х'}};}]){
  const bad=structuredClone(valid);mutate(bad);await g.render().handleImportJson({target:{files:[{text:JSON.stringify(bad)}],value:''}});assert.equal(alerts.length,1);alerts.pop();assert.deepEqual(structuredClone(g.render().captureDocument()),before);assert.deepEqual(structuredClone([g.render().undoHistory,g.render().redoHistory]),stacks);
 }
});

// ONE-MILE1 extends the existing real import/history suite rather than creating
// a second harness. Core geometry cases already live in oneMile.test.mjs; these
// scenarios cover the new document boundary, not rendering or generator quality.
const fineSetup=()=>{
 const g=createGenerationHarness(42);g.render();const alerts=[];g.setWindow({alert:m=>alerts.push(m),confirm:()=>false,matchMedia:()=>({matches:false})});
 g.injectFunction('readTextFile',async file=>file.text);g.render().addFallbackTractToMap({q:0,r:0});g.render();return {g,alerts};
};
const fineSave=g=>{const data=JSON.parse(JSON.stringify(g.render().createSaveData()));delete data.savedAt;return data;};
const fineLoad=(g,data)=>g.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'x'}});
const fineStable=g=>({data:fineSave(g),undo:JSON.stringify(g.render().undoHistory),redo:JSON.stringify(g.render().redoHistory)});
const fineActivate=g=>{const p=g.render().previewOneMile();assert.ok(p);assert.equal(g.render().applyOneMilePreview(p),true);return p;};

test('ONE-MILE1 preview/cancel/apply and public15 roundtrip use real import and exact undo',async()=>{
 const {g}=fineSetup(), before=fineSave(g), count=g.render().undoHistory.length;
 const cancelled=g.render().previewOneMile();g.render().cancelOneMilePreview();assert.equal(g.render().applyOneMilePreview(cancelled),false);
 assert.deepEqual(fineSave(g),before);assert.equal(g.render().undoHistory.length,count);
 fineActivate(g);const active=fineSave(g);assert.equal(active.version,15);assert.equal(active.map.physicalGrid.version,3);assert.deepEqual(active.map.physicalGrid.fineCellEdits,{});
 assert.deepEqual(active.generation,before.generation);assert.equal(g.render().undoHistory.length,count+1);
 g.render().undoMap();assert.deepEqual(fineSave(g),before);g.render().redoMap();assert.deepEqual(fineSave(g),active);
 await fineLoad(g,active);assert.deepEqual(fineSave(g),active);
 g.render().undoMap();assert.deepEqual(fineSave(g),active);
 const p=cancelled;assert.equal(g.render().applyOneMilePreview(p),false,'stale preview cannot write a second adaptation');
});

test('ONE-MILE1 local transaction preserves the other language, neighbouring source and RNG',()=>{
 const {g}=fineSetup();fineActivate(g);
 const doc=g.render().captureDocument();doc.map.physicalGrid={...doc.map.physicalGrid,selectedCell:{q:0,r:0},fineCellEdits:{'0,0':{name:{ru:'Лес',en:'Forest'}},'1,0':{note:'neighbour'}}};g.render().applyDocument(doc);
 const before=fineSave(g), count=g.render().undoHistory.length, revision=g.render().getDocumentRevision();
 assert.equal(g.render().editOneMileCell({q:0,r:0},{name:'Опушка',note:'local'},revision,'ru'),true);
 const after=fineSave(g);assert.equal(after.map.physicalGrid.fineCellEdits['0,0'].name.en,'Forest');assert.equal(after.map.physicalGrid.fineCellEdits['0,0'].name.ru,'Опушка');
 assert.deepEqual(after.map.physicalGrid.fineCellEdits['1,0'],before.map.physicalGrid.fineCellEdits['1,0']);
 const expected=structuredClone(before);expected.map.physicalGrid=after.map.physicalGrid;assert.deepEqual(after,expected,'no source-six or RNG mutation');assert.equal(g.render().undoHistory.length,count+1);
 assert.equal(g.render().editOneMileCell({q:0,r:0},{note:'stale'},revision,'ru'),false);assert.deepEqual(fineSave(g),after);
 g.render().undoMap();assert.deepEqual(fineSave(g),before);g.render().redoMap();assert.deepEqual(fineSave(g),after);
});

test('ONE-MILE1 public10 Knave payload survives15 import/export literally',async()=>{
 const {g,alerts}=fineSetup();await fineLoad(g,regionFixture());const legacy=fineSave(g);legacy.map.knave=newKnaveLayer();legacy.map.knave.content=knaveContentFixture('poi:1:2,0',{kind:'settlement'});legacy.ui.knaveEnabled=true;
 await fineLoad(g,legacy);assert.deepEqual(alerts,[]);assert.equal(fineSave(g).map.physicalGrid,undefined);
 fineActivate(g);const data=fineSave(g);assert.deepEqual(data.map.knave,legacy.map.knave);await fineLoad(g,data);assert.deepEqual(fineSave(g).map.knave,legacy.map.knave);
});

test('ONE-MILE1 rejects private versions, foreign layers and invalid fine data atomically with redo',async()=>{
 const {g,alerts}=fineSetup();fineActivate(g);const active=fineSave(g);g.render().undoMap();const before=fineStable(g);
 const wrong=[];
 for(const version of [11,12,13,14])wrong.push({...structuredClone(active),version});
 for(const field of ['classification','featurePreparation']){const data=structuredClone(active);data.map[field]={};wrong.push(data);const old=structuredClone(before.data);old.map[field]={};wrong.push(old);}
 for(const mutate of [d=>delete d.map.physicalGrid,d=>d.map.physicalGrid.version=2,d=>d.map.physicalGrid.viewStep=24,d=>d.map.physicalGrid.grid.unit='mile',
  d=>d.map.physicalGrid.fineCellEdits={'9999999,0':{note:'orphan'}},d=>d.map.physicalGrid.fineCellEdits={'-0,0':{note:'alias'}},
  d=>d.map.physicalGrid.fineCellEdits={'0,0':{landBiomeId:'not-a-biome'}},d=>d.map.physicalGrid.fineCellEdits={'0,0':{name:{ru:'x'.repeat(201)}}},
  d=>delete d.map.physicalGrid.poiIdentities]){const data=structuredClone(active);mutate(data);wrong.push(data);}
 for(const data of wrong){await fineLoad(g,data);assert.deepEqual(fineStable(g),before,'rejected import retains document, selection, prefs, RNG and both timelines');}
 assert.equal(alerts.length,wrong.length);
});

test('ONE-MILE1 reset refuses authored loss without consent and undo restores a consented reset',()=>{
 const {g}=fineSetup();fineActivate(g);const doc=g.render().captureDocument();doc.map.physicalGrid={...doc.map.physicalGrid,selectedCell:{q:0,r:0},fineCellEdits:{'0,0':{note:'author'}}};g.render().applyDocument(doc);
 const before=fineStable(g);g.render().resetMap();assert.deepEqual(fineStable(g),before);
 g.setWindow({confirm:()=>true,matchMedia:()=>({matches:false})});g.render().resetMap();assert.equal(fineSave(g).map.physicalGrid,undefined);g.render().undoMap();assert.deepEqual(fineSave(g),before.data);
});

test('ONE-MILE1 older generation checkpoints cannot silently discard later local edits',()=>{
 const {g:retained}=fineSetup();retained.render().addFallbackTractToMap(retained.render().candidateHexes[0]);retained.render();fineActivate(retained);
 const prior=retained.render().captureDocument();prior.map.physicalGrid={...prior.map.physicalGrid,selectedCell:{q:0,r:0},fineCellEdits:{'0,0':{name:{ru:'Позднее имя',en:'Late name'},note:'survives old checkpoint'}}};retained.render().applyDocument(prior);
 const exact=fineSave(retained);retained.render().deleteLastRegion();const restored=fineSave(retained);
 assert.equal(restored.map.regions.length,exact.map.regions.length-1,'real deletion restores old no-layer checkpoint');assert.deepEqual(restored.map.physicalGrid.fineCellEdits,exact.map.physicalGrid.fineCellEdits,'surviving fine data retained');assert.deepEqual(restored.map.physicalGrid.grid,exact.map.physicalGrid.grid);assert.equal(restored.map.physicalGrid.poiIdentities.nextId,exact.map.physicalGrid.poiIdentities.nextId);for(const [alias,id] of Object.entries(restored.map.physicalGrid.poiIdentities.byLegacyRef))assert.equal(id,exact.map.physicalGrid.poiIdentities.byLegacyRef[alias]);
 retained.render().undoMap();assert.deepEqual(fineSave(retained),exact);retained.render().redoMap();assert.deepEqual(fineSave(retained),restored);
 const {g}=fineSetup();const checkpoint=structuredClone(g.render().captureDocument().generationHistory[0]);fineActivate(g);
 const doc=g.render().captureDocument();doc.map.physicalGrid={...doc.map.physicalGrid,selectedCell:{q:0,r:0},fineCellEdits:{'0,0':{note:'later authored'}}};g.render().applyDocument(doc);
 const before=fineStable(g);
 assert.throws(()=>g.render().restoreSnapshot(checkpoint),/local edits|loss consent/);assert.deepEqual(fineStable(g),before);
 const revision=g.render().getDocumentRevision();assert.equal(g.render().editOneMileCell({q:0,r:0},{note:'injected',expectedRevision:revision+1},revision-1,'ru'),false);assert.deepEqual(fineStable(g),before);
 g.render().deleteLastRegion();assert.deepEqual(fineStable(g),before,'real delete refuses without consent');
 const losses=[];g.setWindow({confirm:message=>{losses.push(message);return true},matchMedia:()=>({matches:false})});g.render().deleteLastRegion();assert.match(losses[0],/0,0/);assert.equal(fineSave(g).map.physicalGrid,undefined);g.render().undoMap();assert.deepEqual(fineSave(g),before.data);
});

test('ONE-MILE1 view/hover/pinned form and stale callbacks preserve local address and camera scale',()=>{
 const {g}=fineSetup();fineActivate(g);const initial=fineSave(g),undo=g.render().undoHistory.length,scale=initial.ui.mapScale;
 assert.equal(g.render().switchFineStep(1),true);assert.equal(fineSave(g).ui.mapScale,scale*6);
 assert.equal(g.render().pickFine({q:0,r:0},false,g.render().getDocumentRevision()),true);
 g.render().setFineHover({q:1,r:0});assert.deepEqual(structuredClone(g.render().fineReadCell),{q:1,r:0});assert.deepEqual(fineSave(g).map.physicalGrid.selectedCell,{q:0,r:0});assert.equal(g.render().undoHistory.length,undo);
 g.render().setFineHover(null);g.render().startFineDraft();const old=g.render().fineDraft;
 assert.equal(g.render().changeFineDraft({name:'Fine name'},old),true);const current=g.render().fineDraft;
 assert.equal(g.render().changeFineDraft({note:'stale'},old),false);assert.equal(g.render().saveFineDraft(old),false);
 assert.equal(g.render().saveFineDraft(current),true);assert.equal(fineSave(g).map.physicalGrid.fineCellEdits['0,0'].name[current.language],'Fine name');assert.equal(g.render().undoHistory.length,undo+1);
 assert.deepEqual(fineSave(g).generation,initial.generation);assert.deepEqual(fineSave(g).map.biomeOverrideByHexKey,initial.map.biomeOverrideByHexKey);
 g.render().startFineDraft();const late=g.render().fineDraft;g.render().cancelFineDraft(late);g.render().pickFine({q:1,r:0},false,g.render().getDocumentRevision());g.render().startFineDraft();
 assert.equal(g.render().saveFineDraft(late),false);assert.equal(g.render().cancelFineDraft(late),false);assert.ok(g.render().fineDraft);g.render().cancelFineDraft(g.render().fineDraft);
 assert.equal(g.render().switchFineStep(6),true);assert.equal(fineSave(g).ui.mapScale,scale);assert.equal(g.render().undoHistory.length,undo+1);
});


test('ONE-MILE1 regeneration retains edits supported by final candidate rather than temporary empty checkpoint',()=>{
 const {g}=fineSetup(),prompts=[];fineActivate(g);const doc=g.render().captureDocument();doc.map.physicalGrid={...doc.map.physicalGrid,selectedCell:{q:0,r:0},fineCellEdits:{'0,0':{name:{ru:'Моё место'},note:'retain after regeneration'}}};g.render().applyDocument(doc);
 g.setWindow({confirm:m=>{prompts.push(m);return false},matchMedia:()=>({matches:false})});const before=fineSave(g);g.render().regenerateLastRegion();g.render().finishPendingRegeneration();const after=fineSave(g);
 assert.equal(g.render().generationError,null);assert.deepEqual(after.map.physicalGrid.fineCellEdits,before.map.physicalGrid.fineCellEdits);assert.equal(prompts.filter(m=>/one-mile|одномильных/.test(m)).length,0);assert.notDeepEqual(after.generation,before.generation);
 g.render().undoMap();assert.deepEqual(fineSave(g),before);g.render().redoMap();assert.deepEqual(fineSave(g),after);

 const {g:loss}=fineSetup();fineActivate(loss);const ld=loss.render().captureDocument();const cells=projectOneMile(ld.map.regions.flatMap(r=>r.hexes.map(cell=>({cell,landBiomeId:r.biomeId}))),ld.map.physicalGrid.grid.origin);
 ld.map.physicalGrid={...ld.map.physicalGrid,fineCellEdits:Object.fromEntries(cells.map(row=>[`${row.cell.q},${row.cell.r}`,{note:'authored local note'}]))};loss.render().applyDocument(ld);loss.render().setGenSizeCategory('tract');loss.render();
 const stable=fineStable(loss),messages=[];loss.setWindow({confirm:m=>{messages.push(m);return false},matchMedia:()=>({matches:false})});loss.render().regenerateLastRegion();loss.render().finishPendingRegeneration();assert.equal(messages.length,1);assert.deepEqual(fineStable(loss),stable,'declining final candidate restores document/RNG/both histories');assert.equal(loss.render().generationError,null);
 loss.setWindow({confirm:()=>{throw Error('confirm failure')},matchMedia:()=>({matches:false})});loss.render().regenerateLastRegion();loss.render().finishPendingRegeneration();assert.deepEqual(fineStable(loss),stable,'confirmation exception restores exact accepted state');
 loss.setWindow({confirm:m=>{messages.push(m);return true},matchMedia:()=>({matches:false})});loss.render().regenerateLastRegion();loss.render().finishPendingRegeneration();const accepted=fineSave(loss),beforeEdits=stable.data.map.physicalGrid.fineCellEdits,afterEdits=accepted.map.physicalGrid.fineCellEdits,removed=Object.keys(beforeEdits).filter(k=>!Object.hasOwn(afterEdits,k));
 assert.ok(removed.length>0);assert.ok(removed.length<Object.keys(beforeEdits).length);for(const key of removed)assert.ok(messages.at(-1).includes(key));for(const [key,value] of Object.entries(afterEdits))assert.deepEqual(value,beforeEdits[key]);assert.equal(loss.render().generationError,null);
 loss.render().undoMap();assert.deepEqual(fineSave(loss),stable.data);loss.render().redoMap();assert.deepEqual(fineSave(loss),accepted);

});

test('ONE-MILE1 Mythic accepts fine geography only after a complete kingdom and preserves retained owners',()=>{
 const g=createGenerationHarness(42);g.render();const prompts=[];g.setWindow({confirm:m=>{prompts.push(m);return false},matchMedia:()=>({matches:false})});g.render().setGenerationMode('mythic');
 const finish=()=>{let n=0;while(g.render().kingdomJob&&n++<120)g.render().advanceKingdom();assert.equal(g.render().kingdomJob,null,'bounded ordinary job finishes');};
 g.render().startKingdom({q:0,r:0});finish();fineActivate(g);const d=g.render().captureDocument(),c=d.map.regions[0].hexes[0],cell={q:c.q*6,r:c.r*6},key=`${cell.q},${cell.r}`;
 d.map.physicalGrid={...d.map.physicalGrid,selectedCell:cell,fineCellEdits:{[key]:{note:'Mythic authored note'}}};g.render().applyDocument(d);const before=fineSave(g);
 g.render().regenerateLastRegion();g.render().finishPendingRegeneration();finish();const after=fineSave(g);assert.equal(g.render().generationError,null);assert.deepEqual(after.map.physicalGrid.fineCellEdits,before.map.physicalGrid.fineCellEdits);assert.ok(after.map.physicalGrid.poiIdentities.nextId>before.map.physicalGrid.poiIdentities.nextId,'replaced owners receive fresh monotonic identities');assert.equal(prompts.length,0);
 g.render().undoMap();assert.deepEqual(fineSave(g),before);g.render().redoMap();assert.deepEqual(fineSave(g),after);
 g.render().startKingdom(g.render().candidateHexes[0]);finish();const expanded=fineSave(g);assert.equal(g.render().generationError,null);assert.equal(expanded.map.kingdoms.length,after.map.kingdoms.length+1);assert.deepEqual(expanded.map.physicalGrid.fineCellEdits,after.map.physicalGrid.fineCellEdits);for(const [alias,id]of Object.entries(after.map.physicalGrid.poiIdentities.byLegacyRef))assert.equal(expanded.map.physicalGrid.poiIdentities.byLegacyRef[alias],id);
 g.render().undoMap();assert.deepEqual(fineSave(g),after);g.render().redoMap();assert.deepEqual(fineSave(g),expanded);
});
