import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';

const plain=regionFixture();
assert.equal(plain.version,7);
plain.map.regions[0].suppressCentralPoi=false;
plain.map.regions[0].centralPoiKind='city';
const portal={q:1,r:0},capital={q:0,r:0},portalKey='poi:1:1,0',capKey='poi:1:0,0';
const save=app=>JSON.parse(JSON.stringify(app.render().createSaveData()));
const panel=app=>renderToStaticMarkup(app.render().knavePanel);
function setup(seed=42){
  const app=createGenerationHarness(seed,'','en');
  app.render();
  app.setWindow({alert:msg=>{throw Error(msg)},matchMedia:()=>({matches:false})});
  app.injectFunction('readTextFile',async f=>f.text);
  return app;
}
async function load(data){
  const app=setup();
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});
  return app;
}
const app=await load(plain);
const legacy=save(app);
assert.equal(legacy.map.regions[0].pointOfInterestKinds['2,0'],'village');
assert.equal(legacy.map.knave,undefined);
assert.equal(panel(app),'');
app.render().setEditMode(true);
app.render().setSelectedHex(portal);
app.render().setSelectedPoiKind('portal');
assert.equal(save(app).map.regions[0].pointOfInterestKinds['1,0'],'portal');
app.render().setSelectedHex(capital);
app.render().setSelectedCentralPoiKind('capital');
const classic=save(app);
assert.equal(classic.map.regions[0].centralPoiKind,'capital');
assert.equal(classic.map.knave,undefined);
assert.equal(panel(app),'');
assert.deepEqual(save(await load(classic)).map,classic.map);

const gen=setup();
gen.render().setGenSizeCategory('small_region');
gen.render().generateAt({q:0,r:0});
const generated=save(gen);
const generatedPoi=generated.map.regions.flatMap(r=>[r.centralPoiKind,...Object.values(r.pointOfInterestKinds??{})]).filter(Boolean);
assert.ok(generatedPoi.length>0);
assert.equal(generated.map.knave,undefined);
assert.deepEqual(save(await load(generated)).map,generated.map);

assert.equal(app.render().chooseKnaveProfile(true),true);
assert.deepEqual(save(app).map.knave.discoveryByPoi,{});
app.render().setEditMode(false);
assert.match(panel(app),/On passage/);
assert.deepEqual(save(app).map.knave.discoveryByPoi,{});
app.render().setSelectedHex(portal);
assert.match(panel(app),/On passage/);
assert.deepEqual(save(app).map.knave.discoveryByPoi,{});
app.render().setEditMode(true);
assert.equal(app.render().changeKnaveDraft({mode:'interaction',clueText:''}),true);
assert.equal(app.render().finishKnaveDraft(),false);
assert.deepEqual(save(app).map.knave.discoveryByPoi,{});
assert.equal(app.render().changeKnaveDraft({mode:'interaction',clueText:'The arch catches blue light.'}),true);
assert.equal(app.render().finishKnaveDraft(),true);
const knave=save(app);
assert.deepEqual(knave.map.knave.discoveryByPoi,{[portalKey]:{mode:'interaction',clueText:'The arch catches blue light.'}});
assert.equal(knave.map.knave.discoveryByPoi[capKey],undefined);
assert.equal(app.render().chooseKnaveProfile(false),true);
const disabled=save(app);
const restored=await load(disabled);
assert.equal(save(restored).ui.knaveEnabled,false);
restored.render().setSelectedHex(portal);
assert.match(panel(restored),/Secret · interaction/);
assert.deepEqual(save(restored).map,disabled.map);

const knaveGen=setup();
assert.equal(knaveGen.render().chooseKnaveProfile(true),true);
knaveGen.render().setGenSizeCategory('small_region');
knaveGen.render().generateAt({q:0,r:0});
const kGenerated=save(knaveGen);
assert.ok(Object.keys(kGenerated.map.knave.content.byPoi).length>0);
assert.deepEqual(kGenerated.map.knave.discoveryByPoi,{});
console.log(JSON.stringify({legacy:{inputVersion:plain.version,outputVersion:legacy.version,villageRetained:true,discoveryPanel:false,discoveryRecord:false},manualClassic:{kinds:['capital','portal'],discoveryPanel:false,discoveryRecord:false,roundtrip:true},generatedClassic:{poiKinds:generatedPoi,discoveryRecord:false,roundtrip:true},knave:{displayFallback:'On passage',recordInitiallyAbsent:true,blankSecretRejected:true,portalRecord:{mode:'interaction',clueText:'The arch catches blue light.'},capitalRecord:false,generatedContentOwners:Object.keys(kGenerated.map.knave.content.byPoi).length,generatedDiscoveryRecords:0,annotationRoundtripWithGenerationOff:true},method:'real App handlers, save/import and static rendering of existing Knave panel'}));
