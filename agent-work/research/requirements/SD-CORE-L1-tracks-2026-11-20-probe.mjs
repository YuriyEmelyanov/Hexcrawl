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

const signHex = '2,0', oldLair = '2,-1', newLair = '1,-1';
const smell = 'A sharp smell of ozone.', dragon = 'Desert dragon lair';
function writeNote(app, address, value) {
  app.render().setSelectedHex(coord(address));
  app.render().openNotesEditor(address);
  app.render().changeNotesText(address, value);
  app.render().finishNotesGroup();
}
async function reopen(app) {
  const saved = save(app), restored = await open(saved);
  assert.deepEqual(save(restored).map, saved.map);
  return restored;
}
for (const withKnave of [false, true]) {
  let app = await open(fixture);
  if (withKnave) assert.equal(app.render().chooseKnaveProfile(true), true);
  add(app, oldLair, 'lair', dragon);
  add(app, signHex, 'ruins', 'Stone gate');
  app.render().setSelectedHex(coord(signHex));
  assert.equal(app.render().changeKnaveDraft({mode:'exploration', clueText:smell}), withKnave);
  if (withKnave) assert.equal(app.render().finishKnaveDraft(), true);
  const pointer = address => 'Source at ' + address;
  const note = address => withKnave ? pointer(address) : smell + '\n' + pointer(address);
  writeNote(app, signHex, note(oldLair));
  app = await reopen(app);
  function check(target, written) {
    const map = save(app).map;
    assert.equal(map.editorNames[owner(target)].en, dragon);
    assert.equal(map.regions[0].pointOfInterestKinds[target], 'lair');
    assert.equal(map.editorNames[owner(signHex)].en, 'Stone gate');
    assert.equal(map.gmNotesByHexKey[signHex], note(written));
    if (withKnave) assert.deepEqual(map.knave.discoveryByPoi[owner(signHex)], {mode:'exploration', clueText:smell});
    else assert.equal(map.knave, undefined);
  }
  check(oldLair, oldLair);
  move(app, oldLair, newLair);
  app = await reopen(app);
  check(newLair, oldLair);
  assert.equal(save(app).map.regions[0].pointOfInterestKinds[oldLair], undefined);
  add(app, oldLair, 'tower', 'Watchtower');
  app = await reopen(app);
  check(newLair, oldLair);
  assert.equal(save(app).map.editorNames[owner(oldLair)].en, 'Watchtower');
  writeNote(app, signHex, note(newLair));
  app = await reopen(app);
  check(newLair, newLair);
  console.log(JSON.stringify({withKnave, signHex, oldLair, newLair, staleTargetAfterMove:oldLair,
    staleTargetOccupant:'Watchtower', correctedTargetAfterManualEdit:newLair, freshImportsCompared:4}));
}
