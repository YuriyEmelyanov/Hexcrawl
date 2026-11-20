import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const seed = 42;
const coord = address => {
  const [q, r] = address.split(',').map(Number);
  return {q, r};
};
const owner = address => 'poi:1:' + address;
const footprint = [];
for (let q = -3; q <= 3; q++) {
  for (let r = -3; r <= 3; r++) {
    if (Math.abs(q + r) <= 3) footprint.push({q, r});
  }
}

const fixture = regionFixture();
fixture.version = 10;
fixture.generation = createGenerationState(seed);
fixture.map.seas = [];
fixture.map.nextSeaId = 1;
fixture.map.gmNotesByHexKey = {};
fixture.map.biomeOverrideByHexKey = {};
fixture.map.regions = [{
  ...fixture.map.regions[0], hexes: footprint, centerHex: coord('0,0'),
  anchorHex: coord('1,0'), targetSize: footprint.length, finalSize: footprint.length,
  pointsOfInterest: [], pointOfInterestKinds: {}, suppressCentralPoi: true,
}];

async function open(doc) {
  const app = createGenerationHarness(seed, '', 'en');
  app.render();
  const alerts = [];
  app.setWindow({alert: message => alerts.push(message)});
  app.injectFunction('readTextFile', async file => file.text);
  await app.render().handleImportJson({target: {files: [{text: JSON.stringify(doc)}], value: ''}});
  assert.deepEqual(alerts, []);
  app.render().setEditMode(true);
  assert.equal(app.render().generationMode, 'classic');
  assert.equal(app.render().fineDisplay?.viewStep ?? 6, 6);
  return app;
}

function save(app) {
  const data = JSON.parse(JSON.stringify(app.render().createSaveData()));
  delete data.savedAt;
  return data;
}

function name(app, address, label) {
  const target = app.render().nameTargets.find(item => item.poiLocator === owner(address));
  assert.ok(target);
  app.render().showNameTarget(target.key);
  app.render().changeNameDraft(label, app.render().nameDraft);
  assert.equal(app.render().saveNameDraft(), true);
}

function add(app, address, kind, label, note) {
  app.render().setSelectedHex(coord(address));
  app.render().setSelectedPoiKind(kind);
  assert.equal(save(app).map.regions[0].pointOfInterestKinds[address], kind);
  name(app, address, label);
  if (note === undefined) return;
  app.render().openNotesEditor(address);
  app.render().changeNotesText(address, note);
  app.render().finishNotesGroup();
}

function move(app, source, target) {
  app.render().setSelectedHex(coord(source));
  assert.equal(app.render().startPoiDraft({kind: 'land', regionId: 1, hexKey: source}), true);
  const {q, r} = coord(target);
  assert.equal(app.render().changePoiTarget(String(q), String(r)), true);
  assert.equal(app.render().finishPoiDraft(), true);
}

// Table indices supplied independently by the referee for this test. No roll policy is inferred.
const keep = '-2,0';
const keepMoved = '-2,1';
const village = '0,2';
const tomb = '2,0';
const tombMoved = '2,-1';
const keepNote = 'An entrance connects this keep to Reed Tomb at 2,0.';
const villageNote = 'A door leads from here to another plane.';
const app = await open(fixture);
// Card 2 / 2. The tomb is a separate marker chosen by the referee, with a generic visual kind.
add(app, keep, 'fort', 'Flint Keep', keepNote);
add(app, tomb, 'ruins', 'Reed Tomb');
// Card 7 / 20. The extra planar map is outside this regional fixture.
add(app, village, 'village', 'Moss Village', villageNote);

const initial = save(app);
const region = initial.map.regions[0];
assert.deepEqual(region.pointOfInterestKinds, {[keep]: 'fort', [tomb]: 'ruins', [village]: 'village'});
assert.deepEqual(initial.map.gmNotesByHexKey, {[keep]: keepNote, [village]: villageNote});
assert.equal(initial.map.editorNames[owner(keep)].en, 'Flint Keep');
assert.equal(initial.map.editorNames[owner(tomb)].en, 'Reed Tomb');
assert.equal(initial.map.toponyms.names['settlement:1:' + village].en, 'Moss Village');
assert.equal(initial.map.knave, undefined);
assert.deepEqual(save(await open(initial)), initial);

move(app, tomb, tombMoved);
name(app, tombMoved, 'Slate Tomb');
const targetChanged = save(app);
assert.equal(targetChanged.map.editorNames[owner(tomb)], undefined);
assert.equal(targetChanged.map.editorNames[owner(tombMoved)].en, 'Slate Tomb');
assert.equal(targetChanged.map.regions[0].pointOfInterestKinds[tombMoved], 'ruins');
assert.equal(targetChanged.map.gmNotesByHexKey[keep], keepNote);

move(app, keep, keepMoved);
const sourceChanged = save(app);
assert.equal(sourceChanged.map.editorNames[owner(keepMoved)].en, 'Flint Keep');
assert.equal(sourceChanged.map.regions[0].pointOfInterestKinds[keepMoved], 'fort');
assert.equal(sourceChanged.map.regions[0].pointOfInterestKinds[keep], undefined);
assert.equal(sourceChanged.map.gmNotesByHexKey[keepMoved], undefined);
assert.equal(sourceChanged.map.gmNotesByHexKey[keep], keepNote);
assert.deepEqual(save(await open(sourceChanged)), sourceChanged);

// A new point placed in the old hex coexists with the original hex note.
add(app, keep, 'tower', 'Replacement Watch');
const reused = save(app);
assert.equal(reused.map.regions[0].pointOfInterestKinds[keep], 'tower');
assert.equal(reused.map.editorNames[owner(keep)].en, 'Replacement Watch');
assert.equal(reused.map.gmNotesByHexKey[keep], keepNote);
assert.equal(reused.map.gmNotesByHexKey[village], villageNote);
assert.deepEqual(save(await open(reused)), reused);

console.log(JSON.stringify({
  fixture: {seed, mode: 'Classic', stepMiles: 6, hexes: footprint.length},
  fixedColumnIndices: [{location: 2, development: 2}, {location: 7, development: 20}],
  initiallySaved: {kinds: region.pointOfInterestKinds, editorNames: initial.map.editorNames},
  destination: {from: tomb, to: tombMoved, nameAfter: 'Slate Tomb', sourceNoteStill: keepNote},
  source: {from: keep, to: keepMoved, typeAndNameMoved: true, noteStayedWithHex: true},
  oldHexReused: {kind: 'tower', noteStayedWithHex: true},
  secondExample: {hex: village, placeKind: 'village', settlementToponym: initial.map.toponyms.names['settlement:1:' + village].en, textInHexNote: villageNote},
  exactExportImportSnapshots: 3,
}, null, 2));
