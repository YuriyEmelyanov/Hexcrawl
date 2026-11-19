import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const source='2,0', target='1,0', poi='poi:1:2,0', movedPoi='poi:1:1,0';
const oldSign='Broken arch', newSign='Tower visible from road', offSign='Carved arch';
const oldNote='Refuge under the courtyard', newNote='Entry through a sealed cistern';
const data=regionFixture();
data.version=10;
data.generation=createGenerationState(42);
data.map.seas=[];
data.map.nextSeaId=1;
data.map.gmNotesByHexKey={};
data.map.regions[0].pointsOfInterest=[];
data.map.regions[0].pointOfInterestKinds={};

async function open(doc){
  const app=createGenerationHarness(42,'','en');
  app.render();
  const alerts=[];
  app.setWindow({alert:msg=>alerts.push(msg),matchMedia:()=>({matches:false})});
  app.injectFunction('readTextFile',async f=>f.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
  assert.deepEqual(alerts,[]);
  app.render().setEditMode(true);
  return app;
}
const state=app=>JSON.parse(JSON.stringify(app.render().createSaveData()));
const panel=app=>renderToStaticMarkup(app.render().knavePanel);
function editNote(app,key,value){
  app.render().openNotesEditor(key);
  app.render().changeNotesText(key,value);
  app.render().finishNotesGroup();
}
function editClue(app,text){
  assert.equal(app.render().changeKnaveDraft({mode:'interaction',clueText:text}),true);
  assert.equal(app.render().finishKnaveDraft(),true);
}
const app=await open(data);
app.render().setSelectedPoiKind('ruins');
assert.equal(state(app).map.regions[0].pointOfInterestKinds[source],'ruins');
assert.ok(app.render().nameTargets.some(x=>x.key===poi));
app.render().showNameTarget(poi);
app.render().changeNameDraft('Old Gate',app.render().nameDraft);
assert.equal(app.render().saveNameDraft(),true);
editNote(app,source,oldNote);
const plain=state(app);
assert.equal(plain.map.gmNotesByHexKey[source],oldNote);
assert.equal(plain.map.editorNames[poi].en,'Old Gate');
assert.equal(panel(app),'');
assert.equal(app.render().changeKnaveDraft({mode:'interaction',clueText:oldSign}),false);
assert.equal(plain.map.knave,undefined);

assert.equal(app.render().chooseKnaveProfile(true),true);
assert.match(panel(app),/aria-label="Clue"/);
editClue(app,oldSign);
const withClue=state(app);
assert.deepEqual(withClue.map.knave.discoveryByPoi[poi],{mode:'interaction',clueText:oldSign});
editClue(app,newSign);
const changedSign=state(app);
assert.equal(changedSign.map.gmNotesByHexKey[source],oldNote);
assert.equal(changedSign.map.knave.discoveryByPoi[poi].clueText,newSign);
editNote(app,source,newNote);
const changedNote=state(app);
assert.deepEqual(changedNote.map.knave.discoveryByPoi,changedSign.map.knave.discoveryByPoi);
assert.equal(changedNote.map.gmNotesByHexKey[source],newNote);
assert.deepEqual(state(await open(changedNote)).map,changedNote.map);

assert.equal(app.render().chooseKnaveProfile(false),true);
assert.equal(state(app).ui.knaveEnabled,false);
assert.match(panel(app),/aria-label="Clue"/);
editClue(app,offSign);
const priorMove=state(app);
assert.equal(priorMove.ui.knaveEnabled,false);
assert.equal(priorMove.map.knave.discoveryByPoi[poi].clueText,offSign);
assert.equal(priorMove.map.gmNotesByHexKey[source],newNote);
assert.equal(app.render().startPoiDraft({kind:'land',regionId:1,hexKey:source}),true);
assert.equal(app.render().changePoiTarget('1','0'),true);
assert.equal(app.render().finishPoiDraft(),true);
const moved=state(app);
assert.equal(moved.map.regions[0].pointOfInterestKinds[source],undefined);
assert.equal(moved.map.regions[0].pointOfInterestKinds[target],'ruins');
assert.equal(moved.map.editorNames[movedPoi].en,'Old Gate');
assert.equal(moved.map.knave.discoveryByPoi[poi],undefined);
assert.deepEqual(moved.map.knave.discoveryByPoi[movedPoi],{mode:'interaction',clueText:offSign});
assert.deepEqual(moved.map.gmNotesByHexKey,{[source]:newNote});
const reloaded=await open(moved);
assert.deepEqual(state(reloaded).map,moved.map);
assert.equal(state(reloaded).ui.knaveEnabled,false);
assert.match(panel(reloaded),/aria-label="Clue"/);
app.render().undoMap();
assert.deepEqual(state(app).map,priorMove.map);
app.render().redoMap();
assert.deepEqual(state(app).map,moved.map);

reloaded.render().setSelectedHex({q:1,r:0});
reloaded.render().deleteSelectedPoi();
assert.deepEqual(state(reloaded).map,moved.map);
assert.match(reloaded.render().editError,/authored.*name/i);
reloaded.render().showNameTarget(movedPoi);
reloaded.render().changeNameDraft('',reloaded.render().nameDraft);
assert.equal(reloaded.render().saveNameDraft(),true);
const unnamed=state(reloaded);
reloaded.render().deleteSelectedPoi();
const deleted=state(reloaded);
assert.equal(deleted.map.regions[0].pointOfInterestKinds?.[target],undefined);
assert.equal(deleted.map.knave.discoveryByPoi[movedPoi],undefined);
assert.deepEqual(deleted.map.gmNotesByHexKey,{[source]:newNote});
reloaded.render().undoMap();
assert.deepEqual(state(reloaded).map,unnamed.map);

console.log(JSON.stringify({
  plainClassic:{ruin:'Old Gate',gmNoteByHex:true,clueEditor:false,clueEditRejected:true},
  initializedKnaveLayer:{separateClueAndHexNote:true,editEitherPreservesOther:true,saveReload:true},
  optOut:{gameGenerationToggle:false,retainedLayer:true,clueEditorStillAvailable:true,profileOffAfterReload:true},
  relocate:{from:source,to:target,nameFollows:true,clueFollows:true,gmNoteStaysAtSource:true,reload:true,undoRedo:true},
  delete:{namedPOIProtected:true,ruinsAndClueRemoved:true,hexNoteRetained:true,undoRestores:true},
  export:{isEditorDocument:true,containsClue:true,containsGMNote:true,playerAudienceNotExercised:true}
}));
