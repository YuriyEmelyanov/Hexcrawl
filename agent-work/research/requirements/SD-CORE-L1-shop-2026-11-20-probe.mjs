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

// Fixed reference example in the retained Shadowdark matrix: standard d10=7.
const result = [];
for (const withKnave of [false,true]) {
  const source='2,0', dest='2,-1', service='Shipwright / carpenter';
  let app=await open(fixture);
  if(withKnave) assert.equal(app.render().chooseKnaveProfile(true),true);
  add(app, source,'hut','Copper Shop',service);
  async function reopenAndCheck(address, label) {
    const doc=save(app);
    app=await open(doc);
    const actual=save(app);
    assert.deepEqual(actual.map,doc.map);
    assert.equal(actual.map.regions[0].pointOfInterestKinds[address],'hut');
    assert.equal(actual.map.editorNames[owner(address)].en,label);
    assert.deepEqual(actual.map.gmNotesByHexKey,{[source]:service});
    const copy=structuredClone(actual.map);
    delete copy.gmNotesByHexKey;
    assert.ok(!JSON.stringify(copy).includes(service));
  }
  await reopenAndCheck(source,'Copper Shop');
  name(app,source,'Copper Keel');
  await reopenAndCheck(source,'Copper Keel');
  move(app,source,dest);
  await reopenAndCheck(dest,'Copper Keel');
  add(app,source,'tower','Old Watch');
  await reopenAndCheck(dest,'Copper Keel');
  assert.equal(save(app).map.editorNames[owner(source)].en,'Old Watch');
  result.push({withKnave,initial:'Copper Shop',renamed:'Copper Keel',movedNameOwner:owner(dest),specialtyNoteOwner:source,replacement:'Old Watch',fullMapImports:4});
}
console.log(JSON.stringify(result));
