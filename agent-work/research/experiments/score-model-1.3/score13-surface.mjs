import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGenerationHarness } from './test/helpers/generation-harness.mjs';
import { regionFixture } from './test/helpers/region-fixture.mjs';
const h=createGenerationHarness(42);
h.setWindow({alert:m=>{throw Error(m)},confirm:()=>true});
h.injectFunction('readTextFile',async file=>file.text);
async function reopen(doc){await h.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});}
await reopen(regionFixture());
const doc=h.render().createSaveData();
const before=JSON.stringify(doc.map);
h.render().setSelectedHex({q:2,r:0});
const selected=h.render().createSaveData();
assert.equal(JSON.stringify(selected.map),before);
assert.deepEqual(selected.ui.selectedHex,{q:2,r:0});
const src=readFileSync('src/App.tsx','utf8');
const menu=src.match(/<select data-fine-step[\s\S]*?<\/select>/)[0];
const steps=[...menu.matchAll(/<option value=\{(\d+)\}/g)].map(x=>+x[1]);
assert.deepEqual(steps,[1,6]);
console.log(JSON.stringify({physical_steps:steps,selected_hex_is_ui:true,save_fields:Object.keys(selected.map),modes:['Classic','Mythic','Knave profile'],scope:'Map schema and entry points investigated. This probe does not simulate a travel session or test each standalone game rule.'}));
h.render().setEditMode(true);
h.render().setSelectedHex({q:2,r:0});
h.render().setSelectedHexBiomeOverride('snow_mountains');
const saved=h.render().createSaveData();
assert.equal(saved.map.biomeOverrideByHexKey['2,0'],'snow_mountains');
await reopen(saved);
const {manualBiome}=await import('./src/rendering/manualBiomes.ts');
const snow=manualBiome(h.render().createSaveData().map.biomeOverrideByHexKey['2,0']);
assert.deepEqual([snow.height,snow.neighborProfile,snow.terrain],[3,'mountains','snow_ice']);
console.log('PF2-RM-044-L1-v2: 2,0 = mountains + snow_ice after JSON import');
for(const [biome,kind,detail] of [
 ['desert','difficult','овраги'],['plain_mixed_forest','difficult','гнилые деревья'],
 ['desert','feature','меса'],['plain_mixed_forest','resource','лекарственные травы'],
 ['desert','resource','питьевая вода'],['desert','secret','укрытие в руинах'],
 ['desert','climate','холодная пустыня: мерзлота — plain; оттепель — marsh']]){
  await reopen(regionFixture());
  h.render().setEditMode(true);
  h.render().setSelectedHex({q:2,r:0});
  h.render().setSelectedHexBiomeOverride(biome);
  h.render().changeNotesText('2,0',detail);
  h.render().finishNotesGroup();
  await reopen(h.render().createSaveData());
  const map=h.render().createSaveData().map;
  assert.equal(map.biomeOverrideByHexKey['2,0'],biome);
  assert.equal(map.gmNotesByHexKey['2,0'],detail);
  console.log('PF1 chosen feature',kind,biome,detail);
}
await reopen(regionFixture());
h.render().setEditMode(true);
h.render().setSelectedHex({q:2,r:0});
h.render().setSelectedPoiKind('lair');
h.render().changeNotesText('2,0','Скрип породы над логовом; опасность — обвал.');
h.render().finishNotesGroup();
const hazard=h.render().createSaveData();
await reopen(hazard);
assert.equal(h.render().createSaveData().map.regions[0].pointOfInterestKinds['2,0'],'lair');
assert.equal(h.render().createSaveData().map.gmNotesByHexKey['2,0'],'Скрип породы над логовом; опасность — обвал.');
assert.deepEqual(h.render().createSaveData().map.regions,hazard.map.regions);
console.log('SD stationary site, observable sign and cause survive reimport; same GM text, no independent audience.');
h.render().setEditMode(true);
h.render().setSelectedHex({q:2,r:0});
h.render().setSelectedPoiKind('dungeon');
const target=h.render().nameTargets.find(t=>t.key==='poi:1:2,0');
assert.ok(target);
h.render().showNameTarget(target.key);
h.render().changeNameDraft('Склад Рина',h.render().nameDraft);
assert.equal(h.render().saveNameDraft(),true);
h.render().changeNotesText('2,0','На складе работает Рин.');
h.render().finishNotesGroup();
const warehouse=h.render().createSaveData();
await reopen(warehouse);
assert.equal(h.render().createSaveData().map.gmNotesByHexKey['2,0'],'На складе работает Рин.');
assert.ok(JSON.stringify(h.render().createSaveData().map.editorNames).includes('Склад Рина'));
console.log('ROOT named site and resident persist at one address; generic dungeon type, note owned by hex.');
