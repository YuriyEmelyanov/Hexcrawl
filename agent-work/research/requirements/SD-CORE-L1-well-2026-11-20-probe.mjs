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

// Shadowdark persistent scene site. Controlled example, not a random-table transcription.
const results=[];
for (const withKnave of [false,true]) {
  let app=await open(fixture);
  if(withKnave) assert.equal(app.render().chooseKnaveProfile(true),true);
  const label='Old Well', scene='SD-scene-E-063', source='2,0', dest='2,-1';
  const count=()=>save(app).map.regions[0].pointsOfInterest.length;
  assert.equal(count(),0);
  add(app,source,'hut',label,scene);
  const before=save(app);
  for(let i=0;i<3;i++){
    app=await open(save(app));assert.deepEqual(save(app).map,before.map);
    assert.equal(count(),1);
  }
  move(app,source,dest);
  app=await open(save(app));
  assert.equal(save(app).map.editorNames[owner(dest)].en,label);
  assert.equal(save(app).map.gmNotesByHexKey[source],scene);
  assert.equal(save(app).map.gmNotesByHexKey[dest],undefined);
  const rest=structuredClone(save(app).map);delete rest.gmNotesByHexKey;
  assert.ok(!JSON.stringify(rest).includes(scene));
  app.render().setSelectedHex(coord(source));app.render().setSelectedPoiKind('hut');
  const second=app.render().nameTargets.find(t=>t.poiLocator===owner(source));
  app.render().showNameTarget(second.key);app.render().changeNameDraft(label,app.render().nameDraft);
  const sameNameAccepted=app.render().saveNameDraft();
  assert.equal(sameNameAccepted,false);
  const rejection=JSON.parse(JSON.stringify(app.render().nameErrors));
  name(app,source,'Well at the old road');
  app=await open(save(app));assert.equal(count(),2);
  const m=save(app).map;assert.equal(m.editorNames[owner(source)].en,'Well at the old road');assert.equal(m.editorNames[owner(dest)].en,label);
  results.push({sameNameAccepted,rejection,withKnave,markersAfterThreeReopens:1,afterMove:{marker:dest,sceneTextOwner:source},markersAfterManualReentry:2,explicitSceneLinkObserved:false});
}
console.log(JSON.stringify(results));