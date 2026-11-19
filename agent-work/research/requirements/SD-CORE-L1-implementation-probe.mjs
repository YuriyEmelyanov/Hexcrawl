import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDetailGrid, detailCellCenter, detailCellAreaSquareMiles} from './src/detailGrid.ts';
import {newKnaveLayer} from './src/knaveClassic.ts';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';

const fixture = name => JSON.parse(fs.readFileSync(new URL(`./test/fixtures/${name}`, import.meta.url),'utf8'));
const key = ({q,r}) => `${q},${r}`;
const save = app => {
  const data = JSON.parse(JSON.stringify(app.render().createSaveData()));
  delete data.savedAt;
  return data;
};
async function open(data) {
  const app = createGenerationHarness(42);
  app.render();
  app.guardRandom();
  const alerts = [];
  app.setWindow({alert: message => alerts.push(message), matchMedia: () => ({matches:false}), confirm: () => true});
  app.injectFunction('readTextFile', async file => file.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'map'}});
  assert.deepEqual(alerts,[]);
  app.render().setEditMode(true);
  return app;
}
function rename(app, target, ru, en) {
  assert.ok(target);
  app.render().showNameTarget(target.key);
  assert.ok(app.render().nameDraft);
  app.render().changeNameDraft(ru,app.render().nameDraft);
  app.render().changeOtherNameDraft(en,app.render().nameDraft);
  assert.equal(app.render().saveNameDraft(),true);
}
function undoRedo(app,before,after) {
  app.render().undoMap();
  assert.deepEqual(save(app),before);
  app.render().redoMap();
  assert.deepEqual(save(app),after);
}

const scale = createDetailGrid(6);
assert.equal(detailCellCenter(scale,{q:1,r:0}).x-detailCellCenter(scale,{q:0,r:0}).x, 6);
const base = fixture('classic-six-regions-seed42.json'), first = await open(base);
const original = save(first), low = structuredClone(original), high = structuredClone(original);
low.ui.mapScale=1; high.ui.mapScale=2;
const lowRoundtrip = save(await open(low)), highRoundtrip = save(await open(high));
assert.deepEqual(lowRoundtrip.map,highRoundtrip.map);
assert.equal(lowRoundtrip.ui.mapScale,1); assert.equal(highRoundtrip.ui.mapScale,2);
console.log(JSON.stringify({check:'general_grid_and_saved_camera',coarseMiles:scale.step,projectAxis:scale.convention,areaSquareMiles:detailCellAreaSquareMiles(scale),cameraValues:[lowRoundtrip.ui.mapScale,highRoundtrip.ui.mapScale],mapUnchanged:true}));

const region = first.render().regions[0];
const drySites = region.hexes.filter(h=>key(h)!==key(region.centerHex)&&!original.map.terrainByHexKey[key(h)]?.terrainOverride);
assert.ok(drySites.length>=4);
const focus=region.centerHex;
first.render().setSelectedHex(focus);
first.render().setSelectedCentralPoiKind('town');
const oldSettlement=first.render().nameTargets.find(t=>t.key===`settlement:${region.id}:${key(focus)}`);
rename(first,oldSettlement,'Медный Холм','Copper Hill');
const namedTown=save(first);
assert.equal(namedTown.map.regions[0].centralPoiKind,'town');
assert.equal(namedTown.map.toponyms.names[oldSettlement.key].ru,'Медный Холм');
assert.deepEqual(save(await open(namedTown)).map,namedTown.map);
console.log(JSON.stringify({check:'typed_named_settlement',address:key(focus),type:'town',name:'Медный Холм',roundtrip:true}));

const entries = [
  [drySites[0],'tower','Чёрная Башня','Black Tower'],
  [drySites[1],'tavern','У моста','At the Bridge'],
  [drySites[2],'dungeon','Каменный вход','Stone Entrance'],
  [drySites[3],'lair','Лесное логово','Forest Lair']
];
for(const [hex,kind] of entries) {
  first.render().setSelectedHex(hex);
  first.render().setSelectedPoiKind(kind);
}
const beforeNames=save(first);
for(const [hex,kind,ru,en] of entries) {
  const address=`poi:${region.id}:${key(hex)}`;
  const before=save(first);
  rename(first,first.render().nameTargets.find(t=>t.key===address),ru,en);
  const expected=structuredClone(before);
  expected.map.editorNames[address]={ru,en};
  assert.deepEqual(save(first),expected);
}
const sites=save(first);
assert.deepEqual(sites.map.regions,beforeNames.map.regions);
for(const [hex,kind,ru] of entries){
  assert.equal(sites.map.regions[0].pointOfInterestKinds[key(hex)],kind);
  assert.equal(sites.map.editorNames[`poi:${region.id}:${key(hex)}`].ru,ru);
}
assert.deepEqual(sites.map.roads,original.map.roads);
assert.deepEqual(sites.map.rivers,original.map.rivers);
assert.deepEqual(save(await open(sites)).map,sites.map);
console.log(JSON.stringify({check:'manual_regional_sites',sites:entries.map(([h,kind,ru])=>[key(h),kind,ru]),siblingsAndGeometryPreserved:true,mapRoundtrip:true}));

const forestHex=entries[3][0];
first.render().setSelectedHex(forestHex);
first.render().setSelectedHexBiomeOverride('plain_coniferous_forest');
const forestMap=save(first);
assert.equal(forestMap.map.biomeOverrideByHexKey[key(forestHex)],'plain_coniferous_forest');
const expandedFrom=first.render().candidateHexes[0];
assert.ok(expandedFrom);
const result=first.render().safelyAddRegionToMap(expandedFrom,{targetSize:1,coastalPreference:'mainland'});
assert.equal(result.success,true);
const expanded=save(first);
assert.equal(expanded.map.regions.length,forestMap.map.regions.length+1);
assert.deepEqual(expanded.map.regions[0].pointOfInterestKinds,forestMap.map.regions[0].pointOfInterestKinds);
assert.deepEqual(expanded.map.editorNames,forestMap.map.editorNames);
assert.deepEqual(expanded.map.biomeOverrideByHexKey,forestMap.map.biomeOverrideByHexKey);
assert.deepEqual(save(await open(expanded)).map,expanded.map);
undoRedo(first,forestMap,expanded);
console.log(JSON.stringify({check:'classic_extension_preserves_manual_lair_and_other_sites',addedRegions:1,lairAddress:key(forestHex),biome:'plain_coniferous_forest',reload:true,undoRedo:true}));

const controlInput=structuredClone(forestMap);
controlInput.map.knave=newKnaveLayer(); controlInput.ui.knaveEnabled=true; controlInput.ui.selectedHex=forestHex;
const control=await open(controlInput), controlBefore=save(control);
assert.equal(control.render().changeKnaveDraft({difficulty:'difficult'}),true);
assert.equal(control.render().finishKnaveDraft(),true);
const marked=save(control), onlyDifficulty=structuredClone(controlBefore);
onlyDifficulty.map.knave.difficultyByHex[key(forestHex)]='difficult';
assert.deepEqual(marked,onlyDifficulty);
assert.deepEqual(save(await open(marked)).map,marked.map);
undoRedo(control,controlBefore,marked);
console.log(JSON.stringify({check:'passability_Knave_only_control',profile:marked.map.knave.profile.id,address:key(forestHex),difficulty:'difficult',reload:true,undoRedo:true,ShadowdarkDangerProfileExercised:false}));

const pairedDice = Array.from({length:36},(_,i)=>[Math.floor(i/6)+1,i%6+1]);
const orderedIntervals=[[2,2],[3,3],[4,6],[7,8],[9,10],[11,11],[12,12]];
const lookup = v => orderedIntervals.findIndex(([lower,upper])=>v>=lower&&v<=upper);
const indexDistribution=Array(7).fill(0);
const moveCounts={plus1:0,same:0,plus2:0,reroll:0};
const actionFor = sum => sum<4?'plus1':sum<9?'same':sum<12?'plus2':'reroll';
const newTerrain = (index, sum, freshSum) => {
  const action=actionFor(sum);
  if(action==='reroll')return lookup(freshSum);
  return (index+({plus1:1,same:0,plus2:2}[action]))%orderedIntervals.length;
};
for(const [a,b] of pairedDice){indexDistribution[lookup(a+b)]++;moveCounts[actionFor(a+b)]++;}
assert.deepEqual(indexDistribution,[1,2,12,11,7,2,1]);
assert.deepEqual(moveCounts,{plus1:3,same:23,plus2:9,reroll:1});
assert.deepEqual([newTerrain(6,2),newTerrain(5,9),newTerrain(6,10),newTerrain(0,12,12)],[0,0,1,6]);
const presence=[1,2,3,4,5,6].map(roll=>Number(roll===1));
assert.deepEqual(presence,[1,0,0,0,0,0]);
console.log(JSON.stringify({check:'Shadowdark_source_reference_only',orderedPairs:36,initialTerrainCounts:indexDistribution,nextActions:moveCounts,mountainPlusOne:0,oceanPlusTwo:0,mountainPlusTwo:1,rerollTwelve:6,poiPresence:presence,productShadowdarkProfileExercised:false}));
