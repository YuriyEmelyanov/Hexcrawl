import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';

const source = '2,0', dest = '1,0';
const poi = address => 'poi:1:' + address;
const at = (app, address) => {
  const [q, r] = address.split(',').map(Number);
  app.render().setSelectedHex({q, r});
};
const save = app => JSON.parse(JSON.stringify(app.render().createSaveData()));
const cluePanel = app => renderToStaticMarkup(app.render().knavePanel);
async function open(doc) {
  const app = createGenerationHarness(42, '', 'en');
  app.render();
  app.setWindow({alert: msg => {throw Error(msg);}, confirm: () => true});
  app.injectFunction('readTextFile', async file => file.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
  app.render().setEditMode(true);
  at(app, source);
  return app;
}
async function roundTrip(app) {
  const doc = save(app), restored = await open(doc);
  assert.deepEqual(save(restored).map, doc.map);
  return restored;
}
function note(app, value) {
  app.render().openNotesEditor(source);
  app.render().changeNotesText(source, value);
  app.render().finishNotesGroup();
}
function clue(app, text) {
  assert.equal(app.render().changeKnaveDraft({mode:'exploration',clueText:text}),true);
  assert.equal(app.render().finishKnaveDraft(),true);
}
const sign1 = 'Pebbles fall from the arch.', sign2 = 'Fresh rubble covers the path.';
const cause1 = 'An unstable roof can collapse.', cause2 = 'The upper ledge is splitting.';
let app = await open(regionFixture());
app.render().setSelectedPoiKind('ruins');
assert.equal(save(app).map.regions[0].pointOfInterestKinds[source],'ruins');
const geography = save(app).map;
assert.equal(cluePanel(app),'');
assert.equal(app.render().changeKnaveDraft({mode:'exploration',clueText:sign1}),false);
note(app,cause1);
app = await roundTrip(app);
assert.equal(save(app).map.gmNotesByHexKey[source],cause1);
assert.equal(save(app).map.knave,undefined);
note(app,sign1+'\n'+cause1);
app = await roundTrip(app);
assert.deepEqual(save(app).map.gmNotesByHexKey,{[source]:sign1+'\n'+cause1});
for(const field of ['regions','rivers','roads','biomeOverrideByHexKey','terrainByHexKey'])
  assert.deepEqual(save(app).map[field],geography[field]);

// Same Classic document. Opt into the existing Knave annotation controls.
assert.equal(app.render().chooseKnaveProfile(true),true);
at(app,source);
assert.match(cluePanel(app),/aria-label="Clue"/);
note(app,cause1);
clue(app,sign1);
app = await roundTrip(app);
const check = (owner, sign, cause) => {
  const map = save(app).map;
  assert.deepEqual(map.knave.discoveryByPoi,{[poi(owner)]:{mode:'exploration',clueText:sign}});
  assert.deepEqual(map.gmNotesByHexKey,{[source]:cause});
};
check(source,sign1,cause1);
clue(app,sign2);
app = await roundTrip(app);
check(source,sign2,cause1);
note(app,cause2);
app = await roundTrip(app);
check(source,sign2,cause2);
at(app,dest);
assert.doesNotMatch(cluePanel(app),/aria-label="Clue"/);
at(app,source);
assert.equal(app.render().startPoiDraft({kind:'land',regionId:1,hexKey:source}),true);
assert.equal(app.render().changePoiTarget('1','0'),true);
assert.equal(app.render().finishPoiDraft(),true);
app = await roundTrip(app);
check(dest,sign2,cause2);
assert.equal(save(app).map.regions[0].pointOfInterestKinds[dest],'ruins');
assert.equal(save(app).map.regions[0].pointOfInterestKinds[source],undefined);
at(app,dest);
app.render().setEditMode(false);
assert.ok(cluePanel(app).includes(sign2));
assert.ok(!cluePanel(app).includes(cause2));
console.log(JSON.stringify({mode:'Classic',fixture:'ruins 2,0; destination 1,0',classic:{clueControl:false,oneHexNote:true,neighbourGeographyRetained:true,optionalClue:true},withKnaveLayer:{clueAndCauseIndependentlyEdited:true,clueAfterMove:'poi:1:1,0',causeAfterMove:'2,0',clue:sign2,cause:cause2},freshImportsCompared:6,playerViewTested:false}));
