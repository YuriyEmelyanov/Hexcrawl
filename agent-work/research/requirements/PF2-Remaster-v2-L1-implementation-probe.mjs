import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDetailGrid, detailCellAreaSquareMiles, detailCellPolygon} from './src/detailGrid.ts';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';

const fixture = name => JSON.parse(fs.readFileSync(new URL(`./test/fixtures/${name}`, import.meta.url), 'utf8'));
const save = harness => {
  const result = JSON.parse(JSON.stringify(harness.render().createSaveData()));
  delete result.savedAt;
  return result;
};
async function open(document) {
  const harness = createGenerationHarness(42);
  harness.render();
  harness.guardRandom();
  const alerts = [];
  harness.setWindow({alert: message => alerts.push(message), matchMedia: () => ({matches: false})});
  harness.injectFunction('readTextFile', async file => file.text);
  await harness.render().handleImportJson({target: {files: [{text: JSON.stringify(document)}], value: 'map'}});
  assert.deepEqual(alerts, []);
  harness.render().setEditMode(true);
  return harness;
}
function name(harness, target, ru, en) {
  harness.render().showNameTarget(target.key);
  assert.ok(harness.render().nameDraft);
  harness.render().changeNameDraft(ru, harness.render().nameDraft);
  harness.render().changeOtherNameDraft(en, harness.render().nameDraft);
  assert.equal(harness.render().saveNameDraft(), true);
}
function undoRedo(harness, before, after) {
  harness.render().undoMap();
  assert.deepEqual(save(harness), before);
  harness.render().redoMap();
  assert.deepEqual(save(harness), after);
}

const grid = createDetailGrid(12);
const polygon = detailCellPolygon(grid, {q: 0, r: 0});
const axes = ['x', 'y'].map(axis => Math.max(...polygon.map(point => point[axis])) - Math.min(...polygon.map(point => point[axis])));
assert.equal(axes[0], 12);
assert.ok(Math.abs(axes[1] - 8 * Math.sqrt(3)) < 1e-10);
assert.throws(() => createDetailGrid(6 * Math.sqrt(3)), /Unknown detail grid/);
const pf2Area = 54 * Math.sqrt(3);
const appArea = detailCellAreaSquareMiles(grid);
assert.ok(Math.abs(appArea / pf2Area - 4 / 3) < 1e-10);
console.log(JSON.stringify({check: 'exact_grid', axes, appArea, pf2Area, pf2AcrossFlats: 6 * Math.sqrt(3), ratio: appArea / pf2Area}));

const app = await open(fixture('import-v2/baseline-classic.json'));
const initial = save(app);
const first = app.render().regions[0];
const location = first.centerHex;
app.render().setSelectedHex(location);
const beforeType = save(app);
app.render().setSelectedCentralPoiKind('village');
const village = save(app);
assert.equal(village.map.regions[0].centralPoiKind, 'village');
assert.deepEqual(village.map.regions[0].centerHex, initial.map.regions[0].centerHex);
undoRedo(app, beforeType, village);
const settlement = app.render().nameTargets.find(target => target.type === 'settlement');
assert.ok(settlement);
name(app, settlement, 'Ольховка', 'Olkhovka');
const named = save(app);
assert.equal(named.map.toponyms.names[settlement.key].ru, 'Ольховка');
assert.deepEqual(named.map.regions, village.map.regions);
assert.deepEqual(named.map.roads, village.map.roads);
assert.deepEqual(named.map.rivers, village.map.rivers);
undoRedo(app, village, named);
assert.deepEqual(save(await open(named)).map, named.map);
console.log(JSON.stringify({check: 'village_type_and_name', location, name: 'Ольховка', type: 'village', undoRedo: true, reload: true}));

const options = first.hexes.filter(hex => (hex.q !== location.q || hex.r !== location.r) && !named.map.terrainByHexKey[`${hex.q},${hex.r}`]?.terrainOverride);
assert.ok(options.length >= 2);
for (const [index, kind, label] of [[0, 'castle', 'A'], [1, 'cave', '7']]) {
  const hex = options[index];
  app.render().setSelectedHex(hex);
  app.render().setSelectedPoiKind(kind);
  const target = app.render().nameTargets.find(target => target.key === `poi:${first.id}:${hex.q},${hex.r}`);
  assert.ok(target, `POI target at ${hex.q},${hex.r}`);
  name(app, target, label, label);
}
const labeled = save(app);
assert.deepEqual(labeled.map.rivers, named.map.rivers);
assert.deepEqual(labeled.map.roads, named.map.roads);
assert.equal(labeled.map.regions[0].biomeId, named.map.regions[0].biomeId);
assert.deepEqual(save(await open(labeled)).map, labeled.map);
console.log(JSON.stringify({check: 'poi_display_names', names: Object.values(labeled.map.editorNames).map(x => x.ru), retainedTerrain: labeled.map.regions[0].biomeId, rivers: labeled.map.rivers.length, roads: labeled.map.roads.length, reload: true}));

const castle = app.render().nameTargets.find(target => target.key === `poi:${first.id}:${options[0].q},${options[0].r}`);
name(app, castle, 'B', 'B');
const renamed = save(app);
assert.deepEqual(renamed.map.regions, labeled.map.regions);
assert.deepEqual(Object.values(renamed.map.editorNames).map(x => x.ru), ['B', '7']);
app.render().setSelectedHex(options[1]);
const beforeClearingName = save(app);
app.render().deleteSelectedPoi();
assert.deepEqual(save(app), beforeClearingName);
assert.match(app.render().editError, /Сначала очистите/);
const cave = app.render().nameTargets.find(target => target.key === `poi:${first.id}:${options[1].q},${options[1].r}`);
name(app, cave, '', '');
const beforeDelete = save(app);
app.render().deleteSelectedPoi();
const deleted = save(app);
assert.deepEqual(Object.values(deleted.map.editorNames).map(x => x.ru), ['B']);
assert.equal(deleted.map.regions[0].pointOfInterestKinds[`${options[0].q},${options[0].r}`], 'castle');
assert.equal(deleted.map.regions[0].biomeId, labeled.map.regions[0].biomeId);
assert.deepEqual(deleted.map.roads, labeled.map.roads);
assert.deepEqual(deleted.map.rivers, labeled.map.rivers);
undoRedo(app, beforeDelete, deleted);
assert.deepEqual(save(await open(deleted)).map, deleted.map);
console.log(JSON.stringify({check: 'sole_poi_removal_and_rename', caveRemoved: true, authorNameGuard: true, castleName: 'B', roadsAndRiversUnchanged: true, undoRedo: true, reload: true}));

const anchor = app.render().candidateHexes[0];
assert.ok(anchor);
const extension = app.render().safelyAddRegionToMap(anchor, {targetSize: 1, coastalPreference: 'mainland'});
assert.equal(extension.success, true);
const extended = save(app);
assert.equal(extended.map.regions.length, deleted.map.regions.length + 1);
assert.deepEqual(extended.map.regions[0].pointOfInterestKinds, deleted.map.regions[0].pointOfInterestKinds);
assert.deepEqual(extended.map.editorNames, deleted.map.editorNames);
assert.deepEqual(save(await open(extended)).map, extended.map);
undoRedo(app, deleted, extended);
console.log(JSON.stringify({check: 'local_expansion_preserves_poi', addedRegions: 1, retainedPointType: 'castle', retainedName: 'B', undoRedo: true, reload: true}));

const opened = await open(fixture('import-v2/baseline-classic.json'));
const before = save(opened);
const center = opened.render().regions[0].centerHex;
opened.render().setSelectedHex(center);
const previous = save(opened);
opened.render().setSelectedRegionBiome('plain_coniferous_forest');
const conifer = save(opened);
assert.equal(conifer.map.regions[0].biomeId, 'plain_coniferous_forest');
assert.deepEqual(conifer.map.regions[0].hexes, before.map.regions[0].hexes);
assert.deepEqual(conifer.map.terrainByHexKey, before.map.terrainByHexKey);
undoRedo(opened, previous, conifer);
assert.deepEqual(save(await open(conifer)).map, conifer.map);
console.log(JSON.stringify({check: 'conifer_biome_variant', next: conifer.map.regions[0].biomeId, retainedCells: conifer.map.regions[0].hexes.length, undoRedo: true, reload: true}));
