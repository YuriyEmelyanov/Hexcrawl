import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';
import {newKnaveLayer} from './src/knaveClassic.ts';
import {knaveCompatibleRows, validateKnaveCatalog} from './src/tags/knave.ts';
import catalog from './src/tags/knaveCatalogData.ts';

validateKnaveCatalog(catalog);
const facts = {owner:'poi:1:0,0',kind:'land',dry:true,height:1,forest:false,wetland:false,sand:false,coldIce:false,river:false,riverStart:false,rapids:false,waterfall:false,waterContact:false,road:false,roadJunction:false,crossings:[]};
const input = [
  ['locations',1,10,'1'], ['locations',76,10,'76'], ['locations',100,10,'00'],
  ['structures',1,11,'1'], ['place_traits',1,11,'1'], ['dungeons',1,16,'1'],
];
const manifest = input.map(([table,row,page,mark]) => {
  const entry = catalog.tables[table][row-1];
  assert.deepEqual([entry.sourceRef.table,entry.sourceRef.row,entry.sourceRef.printedPage,entry.printedResult], [table,row,page,mark]);
  return {table,row,page,mark,eligibleAtDryPlain: table==='place_traits'?null:knaveCompatibleRows(table,facts).includes(row),unresolvedReferences:entry.references.length};
});
assert.deepEqual(Object.keys(catalog.tables), ['locations','structures','place_traits','dungeons']);
const unresolved = Object.values(catalog.tables).flat().flatMap(entry => entry.references);
assert.ok(unresolved.length>0);
assert.ok(unresolved.every(ref=>ref.resolution==='unresolved_source_reference'));
console.log(JSON.stringify({check:'catalog_source_row_metadata', tableSizes:Object.fromEntries(Object.entries(catalog.tables).map(([key,value])=>[key,value.length])),manifest,unresolvedReferences:unresolved.length}));

const a = {q:0,r:0}, b = {q:1,r:0}, c = {q:0,r:1}, d = {q:1,r:1};
const key = ({q,r}) => `${q},${r}`;
const inputMap = regionFixture();
const region = inputMap.map.regions[0];
Object.assign(region,{hexes:[a,b,c,d],centerHex:a,anchorHex:b,finalSize:4,pointsOfInterest:[a,b,c],pointOfInterestKinds:{'0,0':'castle','1,0':'ruins','0,1':'tower'}});
inputMap.map.regions = [region];
inputMap.map.terrainByHexKey = {};
inputMap.map.biomeOverrideByHexKey = {'0,0':'plain_coniferous_forest'};
inputMap.map.gmNotesByHexKey = {};
inputMap.map.seas = [];
inputMap.map.nextSeaId = 1;
inputMap.map.editorNames = {};
inputMap.map.knave = newKnaveLayer();
inputMap.version = 10;
inputMap.generation = createGenerationState(42);
inputMap.ui.selectedHex = a;

const snapshot = harness => {
  const doc = JSON.parse(JSON.stringify(harness.render().createSaveData()));
  delete doc.savedAt;
  return doc;
};
async function open(data) {
  const harness = createGenerationHarness(42);
  harness.render();
  const alerts = [];
  harness.setWindow({alert: message => alerts.push(message),matchMedia:()=>({matches:false})});
  harness.injectFunction('readTextFile', async file => file.text);
  await harness.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'map'}});
  assert.deepEqual(alerts, []);
  harness.render().setEditMode(true);
  return harness;
}
const app = await open(inputMap);
const start = snapshot(app);
assert.equal(app.render().editRoadDocument({type:'create',path:[a,b],kind:'road'}),true,app.render().editError || undefined);
const direct = snapshot(app);
assert.equal(app.render().editRoadDocument({type:'create',path:[a,c,b],kind:'trail'}),true,app.render().editError || undefined);
const both = snapshot(app);
const roads = both.map.roads.map(road=>({id:road.id, edges:road.segments.map(s=>[key(s.from),key(s.to),s.kind])}));
assert.deepEqual(roads.map(x=>x.edges),[[['0,0','1,0','road']],[['0,0','0,1','trail'],['0,1','1,0','trail']]]);
assert.deepEqual(both.map.regions,start.map.regions);
assert.deepEqual(both.map.roads[0],direct.map.roads[0]);
assert.deepEqual(snapshot(await open(both)).map,both.map);
app.render().undoMap();
assert.deepEqual(snapshot(app),direct);
app.render().redoMap();
assert.deepEqual(snapshot(app),both);
console.log(JSON.stringify({check:'two_routes_save_reload_history',roads,poiAddressesUnchanged:true,importedBoth:true,undoRedo:true}));

const expectedProfile = {length:6,unit:'mile',measurementConvention:null};
const zoomOne = structuredClone(both), zoomTwo = structuredClone(both);
zoomOne.ui.mapScale = 1;
zoomTwo.ui.mapScale = 2;
const low = snapshot(await open(zoomOne)), high = snapshot(await open(zoomTwo));
assert.deepEqual(low.map,high.map);
assert.equal(low.ui.mapScale,1);
assert.equal(high.ui.mapScale,2);
assert.deepEqual(high.map.knave.profile.physicalHex,expectedProfile);
console.log(JSON.stringify({check:'separate_scale_and_camera_values',profile:expectedProfile,cameraValues:[low.ui.mapScale,high.ui.mapScale],mapIdentical:true}));

assert.equal(app.render().changeKnaveDraft({mode:'interaction',difficulty:'difficult'}),true);
assert.equal(app.render().finishKnaveDraft(),false);
assert.deepEqual(snapshot(app),both);
assert.match(app.render().knaveError,/улика/i);
assert.equal(app.render().changeKnaveDraft({clueText:'Следы обрываются у скалы'}),true);
assert.equal(app.render().finishKnaveDraft(),true);
const withClue = snapshot(app);
const original = structuredClone(both);
original.map.knave.difficultyByHex['0,0']='difficult';
original.map.knave.discoveryByPoi['poi:1:0,0']={mode:'interaction',clueText:'Следы обрываются у скалы'};
assert.deepEqual(withClue,original);
assert.deepEqual(snapshot(await open(withClue)).map,withClue.map);
assert.equal(app.render().changeKnaveDraft({difficulty:'unspecified'}),true);
assert.equal(app.render().finishKnaveDraft(),true);
const cleared = snapshot(app), stripped = structuredClone(withClue);
delete stripped.map.knave.difficultyByHex['0,0'];
assert.deepEqual(cleared,stripped);
app.render().undoMap();
assert.deepEqual(snapshot(app),withClue);
app.render().redoMap();
assert.deepEqual(snapshot(app),cleared);
console.log(JSON.stringify({check:'difficulty_and_clue_App_lifecycle',difficulty:'difficult',sourceHexBiome:cleared.map.biomeOverrideByHexKey['0,0'],poiType:cleared.map.regions[0].pointOfInterestKinds['0,0'],clueRequired:true,clueRetainedWhenDifficultyCleared:true,reload:true,undoRedo:true}));

function rename(harness, coord, ru, en) {
  const target = harness.render().nameTargets.find(x=>x.key===`poi:1:${key(coord)}`);
  assert.ok(target);
  harness.render().showNameTarget(target.key);
  harness.render().changeNameDraft(ru,harness.render().nameDraft);
  harness.render().changeOtherNameDraft(en,harness.render().nameDraft);
  assert.equal(harness.render().saveNameDraft(),true);
}
app.render().setSelectedHex(b);
app.render().setSelectedPoiKind('holy_place');
app.render().setSelectedHex(c);
app.render().setSelectedPoiKind('tavern');
rename(app,b,'Святилище у камня','Stone Shrine');
rename(app,c,'У развилки','At the Fork');
const sites = snapshot(app);
assert.equal(sites.map.regions[0].pointOfInterestKinds['1,0'],'holy_place');
assert.equal(sites.map.regions[0].pointOfInterestKinds['0,1'],'tavern');
assert.equal(sites.map.editorNames['poi:1:1,0'].ru,'Святилище у камня');
assert.equal(sites.map.editorNames['poi:1:0,1'].ru,'У развилки');
assert.deepEqual(sites.map.roads,both.map.roads);
assert.deepEqual(snapshot(await open(sites)).map,sites.map);
console.log(JSON.stringify({check:'plain_named_holy_place_and_tavern',types:['holy_place','tavern'],roadGeometryPreserved:true,reload:true}));

const fresh = createGenerationHarness(41);
fresh.render();
fresh.guardRandom();
assert.equal(fresh.render().chooseKnaveProfile(true), true);
assert.equal(fresh.render().safelyAddRegionToMap({q:0,r:0},{targetSize:18,landType:'wild',coastalPreference:'mainland'}).success,true);
const generated = snapshot(fresh), content = generated.map.knave.content.byPoi;
const entries = Object.entries(content);
assert.ok(entries.some(([,entry])=>entry.site));
for(const [,entry] of entries) {
  assert.equal(entry.trait.ru,catalog.tables.place_traits[entry.trait.sourceRow-1].ru);
  assert.equal(entry.trait.roll,entry.trait.sourceRow);
  if (entry.site) assert.equal(entry.site.ru,catalog.tables[entry.site.table][entry.site.sourceRow-1].ru);
}
const [owner] = entries.find(([,entry])=>entry.site);
assert.equal(fresh.render().mutateKnaveContent(owner,'trait'),true);
const rerolled = snapshot(fresh), previous = content[owner], current = rerolled.map.knave.content.byPoi[owner];
assert.deepEqual(current.site,previous.site);
assert.equal(rerolled.map.knave.content.rollCounters[owner].trait,generated.map.knave.content.rollCounters[owner].trait+1);
assert.deepEqual(rerolled.generation,generated.generation);
assert.deepEqual(snapshot(await open(rerolled)).map,rerolled.map);
fresh.render().undoMap();
assert.deepEqual(snapshot(fresh),generated);
console.log(JSON.stringify({check:'production_catalog_generation_and_trait_reroll',seed:41,owners:entries.length,selectedOwner:owner,siteTable:previous.site.table,siteRow:previous.site.sourceRow,traitBefore:previous.trait.roll,traitAfter:current.trait.roll,exactSourceMatch:true,reload:true,undo:true}));
