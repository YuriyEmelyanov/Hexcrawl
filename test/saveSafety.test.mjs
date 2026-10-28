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
    hexTerrainByKey:new Map([['0,0',{lakeId:1}]]), nextLakeId:2, nextRoadId:2});
  for (const field of ['regions','rivers','roads','kingdoms']) {
    const data=proposal(); data[field].push({id:Number.MAX_SAFE_INTEGER+1});
    assert.throws(()=>assertGeneratedIds(data), undefined, field+' unsafe ID');
    data[field]=[{id:Number.MAX_SAFE_INTEGER},{id:Number.MAX_SAFE_INTEGER}];
    assert.throws(()=>assertGeneratedIds(data), undefined, field+' rounded duplicate');
  }
  for (const field of ['nextLakeId','nextRoadId']) {
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
test('notes versions 2/3/4 accept exact text on actual land/water; v4 requires RNG and future versions reject', () => {
  const land=valid.map.regions[0].hexes[0], k=`${land.q},${land.r}`;
  for(const version of [2,3,4]) {
    const data=structuredClone(valid); data.version=version;
    data.map.terrainByHexKey['-999,0']={terrainOverride:'sea'};
    data.map.gmNotesByHexKey={[k]:'  🗝 <script>not HTML</script>\r\n ', '-999,0':'sea'};
    assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(data));
    delete data.map.gmNotesByHexKey;assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(data));
  }
  const bad=structuredClone(valid);bad.version=4;delete bad.generation;
  assert.throws(()=>h.geometry.assertHexcrawlSaveData(bad));
  bad.version=5;assert.throws(()=>h.geometry.assertHexcrawlSaveData(bad));
});
