import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {entityNameFixture} from './test/helpers/entity-name-fixture.mjs';
import {createDetailGrid,detailCellCenter,detailCellAreaSquareMiles} from './src/detailGrid.ts';
import {distance} from './src/modes/kingdoms.ts';
import {detailPoiWaterRequirement} from './src/detailGeography.ts';

const fixture = name => JSON.parse(fs.readFileSync(new URL(`./test/fixtures/${name}`,import.meta.url),'utf8'));
const key = ({q,r}) => `${q},${r}`;
const save = h => {
  const d = JSON.parse(JSON.stringify(h.render().createSaveData()));
  delete d.savedAt;
  return d;
};
async function open(data) {
  const h = createGenerationHarness(42);
  h.render();
  h.guardRandom();
  const alerts = [];
  h.setWindow({alert:m=>alerts.push(m),matchMedia:()=>({matches:false})});
  h.injectFunction('readTextFile',async f=>f.text);
  await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});
  assert.deepEqual(alerts,[]);
  h.render().setEditMode(true);
  return h;
}
function rename(h,target,ru,en) {
  assert.ok(target);
  h.render().showNameTarget(target.key);
  assert.ok(h.render().nameDraft);
  h.render().changeNameDraft(ru,h.render().nameDraft);
  h.render().changeOtherNameDraft(en,h.render().nameDraft);
  assert.equal(h.render().saveNameDraft(),true);
}
function reversible(h,before,after) {
  h.render().undoMap();assert.deepEqual(save(h),before);
  h.render().redoMap();assert.deepEqual(save(h),after);
}

const d6 = createDetailGrid(6);
assert.equal(d6.convention,'across_flats');
assert.equal(detailCellCenter(d6,{q:1,r:0}).x-detailCellCenter(d6,{q:0,r:0}).x,6);
assert.throws(()=>createDetailGrid(5),/Unknown detail grid/);
console.log(JSON.stringify({check:'base_grid',axis:d6.convention,miles:6,area:detailCellAreaSquareMiles(d6),separateFiveMileGrid:false}));

const classic = createGenerationHarness(42);
classic.render();classic.guardRandom();
assert.equal(save(classic).map.regions.length,0);
assert.equal(classic.render().safelyAddRegionToMap({q:0,r:0},{targetSize:8,coastalPreference:'mainland'}).success,true);
const newWorld = save(classic);
assert.equal(newWorld.ui.generationMode,'classic');
assert.equal(newWorld.map.regions.length,1);
assert.equal(JSON.stringify(newWorld).includes('Cornath'),false);
assert.deepEqual(save(await open(newWorld)).map,newWorld.map);
console.log(JSON.stringify({check:'ordinary_classic_world',regions:newWorld.map.regions.length,mapRoundtrip:true,requiredCornathData:false}));

const {data} = entityNameFixture();
const river = await open(data);
const old = save(river), crossing = old.map.crossings[0];
assert.equal(crossing.kind,'ford');
assert.equal(river.render().editRoadDocument({type:'crossing',roadId:crossing.roadId,riverId:crossing.riverId,segmentKey:crossing.roadSegmentKey,kind:'bridge'}),true);
const bridged = save(river);
assert.deepEqual(bridged.map.roads,old.map.roads);
assert.deepEqual(bridged.map.rivers,old.map.rivers);
assert.deepEqual(bridged.map.crossings,[{...crossing,kind:'bridge'}]);
reversible(river,old,bridged);
assert.deepEqual(save(await open(bridged)).map,bridged.map);
console.log(JSON.stringify({check:'bridge_on_existing_crossing',kind:'bridge',previousKind:'ford',roadId:crossing.roadId,riverId:crossing.riverId,undoRedo:true,reload:true}));

const riverRegion = river.render().regions[0];
const onRiver = h=>[...river.geometry.getHexEdgeKeys(h)].includes(crossing.riverEdgeKey);
const dry = h=>!bridged.map.terrainByHexKey[key(h)]?.terrainOverride;
const near = riverRegion.hexes.find(h=>onRiver(h)&&dry(h)&&key(h)!==key(riverRegion.centerHex));
assert.ok(near);
river.render().setSelectedHex(near);
river.render().setSelectedPoiKind('sawmill');
const loc = `poi:${riverRegion.id}:${key(near)}`;
rename(river,river.render().nameTargets.find(t=>t.key===loc),'Заброшенная лесопилка','Ruined Sawmill');
const mill = save(river);
assert.equal(mill.map.regions[0].pointOfInterestKinds[key(near)],'sawmill');
assert.equal(mill.map.regions[0].pointsOfInterest.length,old.map.regions[0].pointsOfInterest.length+1);
assert.equal(mill.map.editorNames[loc].ru,'Заброшенная лесопилка');
assert.deepEqual(save(await open(mill)).map,mill.map);
const waterRule = detailPoiWaterRequirement(river.render().captureDocument().map,loc);
assert.equal(waterRule.provenance,'unknown');
const other = await open(regionFixture()), away = {q:1,r:0};
assert.equal(save(other).map.rivers.length,0);
other.render().setSelectedHex(away);
other.render().setSelectedPoiKind('sawmill');
assert.equal(save(other).map.regions[0].pointOfInterestKinds[key(away)],'sawmill');
console.log(JSON.stringify({check:'sawmill_manual_address_and_unbound_river_rule',near:key(near),awayOnMapWithoutRivers:key(away),riverEdge:crossing.riverEdgeKey,nearName:'Заброшенная лесопилка',requirementProvenance:waterRule.provenance,reload:true}));

const places = await open(fixture('classic-six-regions-seed42.json'));
const before = save(places), h1 = places.render().regions[0];
const home = places.render().nameTargets.find(t=>t.type==='settlement'&&t.key.startsWith(`settlement:${h1.id}:`));
rename(places,home,'Старая деревня','Old Village');
const afterHome = save(places);
const cells = h1.hexes.filter(h=>key(h)!==key(h1.centerHex)&&!afterHome.map.terrainByHexKey[key(h)]?.terrainOverride);
assert.ok(cells.length>=3);
const [ruin,entrance1,entrance2] = cells;
places.render().setSelectedHex(ruin);
places.render().setSelectedPoiKind('ruins');
const ruinMap = save(places);
assert.equal(ruinMap.map.regions[0].pointOfInterestKinds[key(ruin)],'ruins');
places.render().setSelectedPoiKind('village');
const changed = save(places);
assert.equal(changed.map.regions[0].pointOfInterestKinds[key(ruin)],'village');
assert.equal(changed.map.regions[0].centralPoiKind,'village');
assert.deepEqual(changed.map.toponyms.names[home.key],afterHome.map.toponyms.names[home.key]);
reversible(places,ruinMap,changed);
const newHome=places.render().nameTargets.find(t=>t.key===`settlement:${h1.id}:${key(ruin)}`);
rename(places,newHome,'Новая деревня','New Village');
for(const [site,title] of [[entrance1,'Blood Library'],[entrance2,'Floating Manor']]){
  places.render().setSelectedHex(site);
  places.render().setSelectedPoiKind('dungeon');
  rename(places,places.render().nameTargets.find(t=>t.key===`poi:${h1.id}:${key(site)}`),title+' (RU)',title);
}
const final = save(places);
assert.equal(final.map.toponyms.names[newHome.key].en,'New Village');
assert.equal(final.map.toponyms.names[home.key].en,'Old Village');
assert.equal(final.map.editorNames[`poi:${h1.id}:${key(entrance1)}`].en,'Blood Library');
assert.equal(final.map.editorNames[`poi:${h1.id}:${key(entrance2)}`].en,'Floating Manor');
assert.deepEqual(final.map.roads,before.map.roads);
assert.deepEqual(final.map.rivers,before.map.rivers);
assert.deepEqual(save(await open(final)).map,final.map);
console.log(JSON.stringify({check:'two_villages_two_named_entrances',existingVillage:key(h1.centerHex),ruinConverted:key(ruin),entrances:[key(entrance1),key(entrance2)],roadsAndRiversPreserved:true,reload:true,conversionUndoRedo:true}));

const habitat = await open(regionFixture());
const former = save(habitat);
habitat.render().setSelectedHex({q:2,r:0});
habitat.render().setSelectedHexBiomeOverride('plain_coniferous_forest');
const forest = save(habitat), expected = structuredClone(former);
expected.map.biomeOverrideByHexKey['2,0']='plain_coniferous_forest';
assert.deepEqual(forest.map,expected.map);
assert.deepEqual(save(await open(forest)).map,forest.map);
console.log(JSON.stringify({check:'forest_biome_retains_map_data',address:'2,0',biome:'plain_coniferous_forest',poiType:forest.map.regions[0].pointOfInterestKinds['2,0'],reload:true}));

const lattice = Array.from({length:15*15},(_,i)=>({q:i%15-7,r:Math.floor(i/15)-7}));
const circle = (center,radius)=>new Set(lattice.filter(h=>distance(center,h)<=radius).map(key));
const counts = [1,2,5,6].map(radius=>circle({q:0,r:0},radius).size);
assert.deepEqual(counts,[7,19,91,127]);
const nearOrigin=circle({q:0,r:0},1), neighborOrigin=circle({q:1,r:0},1);
const bothAreas=new Set([...nearOrigin,...neighborOrigin]);
const common=[...nearOrigin].filter(k=>neighborOrigin.has(k));
assert.equal(bothAreas.size,10);assert.equal(common.length,4);
assert.ok(common.every(k=>neighborOrigin.has(k)));
assert.deepEqual([2,3].map(q=>distance({q:0,r:0},{q,r:0})<=2),[true,false]);
console.log(JSON.stringify({check:'radius_reference_only',radii:[1,2,5,6],counts,overlap:common.length,remainingAfterRemovingOneSource:neighborOrigin.size,distanceTwoAllowed:true,distanceThreeAllowed:false,applicationZoneOrLinkFeatureExecuted:false}));
