import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDetailGrid,detailCellCenter,detailCellAreaSquareMiles} from './src/detailGrid.ts';
import {prepareRoadEdit,roadPair} from './src/manualRoads.ts';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';

const fixture = name => JSON.parse(fs.readFileSync(new URL(`./test/fixtures/${name}`, import.meta.url),'utf8'));
const key = ({q,r}) => `${q},${r}`;
const save = app => {
  const data=JSON.parse(JSON.stringify(app.render().createSaveData()));
  delete data.savedAt;
  return data;
};
async function open(data) {
  const app=createGenerationHarness(42);
  app.render();
  app.guardRandom();
  const alerts=[];
  app.setWindow({alert:message=>alerts.push(message),matchMedia:()=>({matches:false}),confirm:()=>true});
  app.injectFunction('readTextFile',async file=>file.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'map'}});
  assert.deepEqual(alerts,[]);
  app.render().setEditMode(true);
  return app;
}
function undoRedo(app,before,after) {
  app.render().undoMap(); assert.deepEqual(save(app),before);
  app.render().redoMap(); assert.deepEqual(save(app),after);
}
function writeName(app,address,name) {
  assert.ok(app.render().nameTargets.some(target=>target.key===address));
  app.render().showNameTarget(address);
  assert.ok(app.render().nameDraft);
  app.render().changeNameDraft(name,app.render().nameDraft);
  app.render().changeOtherNameDraft(name,app.render().nameDraft);
  assert.equal(app.render().saveNameDraft(),true);
}

const steps=[1,6,12,24].map(step=>{
  const grid=createDetailGrid(step);
  assert.equal(grid.convention,'across_flats');
  assert.equal(detailCellCenter(grid,{q:1,r:0}).x-detailCellCenter(grid,{q:0,r:0}).x,step);
  return {step,area:detailCellAreaSquareMiles(grid)};
});
assert.throws(()=>createDetailGrid(60),/Unknown detail grid/);
const dataA=fixture('import-v2/baseline-classic.json'), low=structuredClone(dataA), high=structuredClone(dataA);
low.ui.mapScale=1; high.ui.mapScale=2;
const one=save(await open(low)), two=save(await open(high));
assert.deepEqual(one.map,two.map);
assert.equal(one.ui.mapScale,1); assert.equal(two.ui.mapScale,2);
console.log(JSON.stringify({check:'physical_scale_and_camera_not_conflated',steps,savedCamera:[1,2],samePhysicalMap:true,step60Accepted:false}));

const region=await open(dataA);
const before=save(region), a=region.render().regions[0];
const terrainHex=a.hexes.find(h=>key(h)!==key(a.centerHex)&&!before.map.terrainByHexKey[key(h)]?.terrainOverride);
assert.ok(terrainHex);
region.render().setSelectedHex(terrainHex);
const selected=save(region);
region.render().setSelectedHexBiomeOverride('open_hills');
const changed=save(region), expected=structuredClone(selected);
expected.map.biomeOverrideByHexKey[key(terrainHex)]='open_hills';
assert.deepEqual(changed,expected);
assert.deepEqual(save(await open(changed)).map,changed.map);
undoRedo(region,selected,changed);
console.log(JSON.stringify({check:'manual_hill_inside_woodland',address:key(terrainHex),base:a.biomeId,override:'open_hills',otherMapStateUnchanged:true,reload:true,undoRedo:true}));

const authored=await open(fixture('e6-water-editor.json'));
const start=save(authored), parent=authored.render().regions[0];
const dry=parent.hexes.filter(h=>key(h)!==key(parent.centerHex)&&!start.map.terrainByHexKey[key(h)]?.terrainOverride&&!parent.pointsOfInterest.some(v=>key(v)===key(h)));
assert.ok(dry.length>=12);
const sixKinds=['ruins','tower','cave','camp','fort','tavern'];
const placed=dry.slice(0,12).map((h,i)=>({h,kind:i<6?'lair':sixKinds[i-6],name:i<6?`Lair ${i+1}`:i===6?'Old Gate':`Site ${i+1}`,address:`poi:${parent.id}:${key(h)}`}));
for(const s of placed){
  authored.render().setSelectedHex(s.h);
  authored.render().setSelectedPoiKind(s.kind);
  writeName(authored,s.address,s.name);
}
const prepared=save(authored);
assert.equal(prepared.map.regions[0].pointsOfInterest.length,start.map.regions[0].pointsOfInterest.length+12);
for(const s of placed){
  assert.equal(prepared.map.regions[0].pointOfInterestKinds[key(s.h)],s.kind);
  assert.equal(prepared.map.editorNames[s.address].en,s.name);
}
assert.deepEqual(save(await open(prepared)).map,prepared.map);
console.log(JSON.stringify({check:'twelve_manual_sites_and_six_distinct_lairs',placed:placed.length,lairs:placed.filter(s=>s.kind==='lair').length,ruin:'Old Gate',reload:true,automaticQuotaSet:false}));

const anchor=authored.render().candidateHexes[0];
assert.ok(anchor);
assert.equal(authored.render().safelyAddRegionToMap(anchor,{targetSize:1,coastalPreference:'mainland'}).success,true);
const expanded=save(authored);
assert.equal(expanded.map.regions.length,prepared.map.regions.length+1);
assert.deepEqual(expanded.map.regions[0].hexes,prepared.map.regions[0].hexes);
assert.deepEqual(expanded.map.regions[0].pointsOfInterest,prepared.map.regions[0].pointsOfInterest);
assert.deepEqual(expanded.map.editorNames,prepared.map.editorNames);
assert.deepEqual(save(await open(expanded)).map,expanded.map);
undoRedo(authored,prepared,expanded);
console.log(JSON.stringify({check:'adjacent_growth_keeps_existing_sites',addedRegions:1,retainedNamedSites:placed.length,reload:true,undoRedo:true}));

const x={q:0,r:0}, y={q:1,r:0}, pass={q:0,r:1};
const baseRoad={roads:[],crossings:[],nextRoadId:1};
const ctx={landRegion:()=>1,destination:()=>true,openExit:()=>false,blocked:(a,b)=>roadPair(a,b)===roadPair(x,y),intersections:()=>[],minima:[]};
assert.throws(()=>prepareRoadEdit(baseRoad,{type:'create',path:[x,y],kind:'road'},ctx));
const alternative=prepareRoadEdit(baseRoad,{type:'create',path:[x,pass,y],kind:'road'},ctx);
assert.deepEqual(alternative.roads[0].segments.map(s=>[key(s.from),key(s.to)]),[[key(x),key(pass)],[key(pass),key(y)]]);
assert.deepEqual(baseRoad,{roads:[],crossings:[],nextRoadId:1});
console.log(JSON.stringify({check:'manual_route_domain_through_explicit_pass',directBlocked:true,segments:alternative.roads[0].segments.length,autoPassSelectionExercised:false,context:'synthetic boundary and pass'}));
