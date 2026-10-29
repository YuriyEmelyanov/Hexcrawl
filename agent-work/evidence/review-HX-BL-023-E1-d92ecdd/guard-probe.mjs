import fs from 'node:fs';import assert from 'node:assert/strict';import {createGenerationHarness} from './diagnostic-harness.mjs';
const h=createGenerationHarness(42);h.render();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
const fixture=JSON.parse(fs.readFileSync('../review-d92ecdd/test/fixtures/import-v2/baseline-mythic.json'));
await h.render().handleImportJson({target:{files:[{text:JSON.stringify(fixture)}],value:'file'}});
const serial=v=>JSON.parse(JSON.stringify(v));const snapshot=()=>{const d=serial(h.render().createSaveData());delete d.savedAt;return d};const stacks=()=>serial([h.render().undoHistory,h.render().redoHistory]);
const targets=h.render().nameTargets;assert.deepEqual(new Set(targets.map(t=>t.type)),new Set(['region','settlement','river','lake','kingdom']));
let app=h.render();const hex=app.regions.flatMap(r=>r.hexes).find(x=>!app.selectedHex||x.q!==app.selectedHex.q||x.r!==app.selectedHex.r);const candidate=app.candidateHexes[0];
app.showNameTarget(targets[0].key);h.render().changeNameDraft('ru','Independent dirty',h.render().nameDraft);const before=snapshot(),history=stacks();
h.render().mapHexClickRef.current({...hex,kind:'region'});const after=snapshot();const expected=structuredClone(before);expected.ui.selectedHex={q:hex.q,r:hex.r};assert.deepEqual(after,expected);assert.deepEqual(stacks(),history);assert.equal(h.render().nameDraft.ru,'Independent dirty');
const dirty=h.render();dirty.mapHexClickRef.current({...candidate,kind:'candidate'});dirty.resetMap();dirty.undoMap();dirty.redoMap();assert.deepEqual(snapshot(),after);assert.deepEqual(stacks(),history);
for(const flag of ['importInFlight','kingdomInFlight']){app=h.render();app[flag].current=true;app.mapHexClickRef.current({...hex,q:999,kind:'region'});app.mapHexClickRef.current({...candidate,kind:'candidate'});assert.deepEqual(snapshot(),after,flag+' blocks both clicks');h.render()[flag].current=false;}
app=h.render();const oldClick=app.mapHexClickRef.current,oldSave=app.saveNameDraft,oldDraft=app.nameDraft;app.applyDocument(app.captureDocument());oldClick({...hex,q:999,kind:'region'});oldClick({...candidate,kind:'candidate'});assert.equal(oldSave(oldDraft),false);assert.deepEqual(snapshot(),after);assert.deepEqual(stacks(),history);
// Same tick double Save, and disappeared entity via a replacement world: stale closures never commit.
h.render().showNameTarget(targets[1].key);h.render().changeNameDraft('ru','Double save',h.render().nameDraft);app=h.render();assert.equal(app.saveNameDraft(app.nameDraft),true);assert.equal(app.saveNameDraft(app.nameDraft),false);assert.equal(stacks()[0].length,history[0].length+1);
h.render().undoMap();assert.deepEqual(snapshot(),after);h.render().redoMap();
console.log(JSON.stringify({probe:'actual handler guard matrix',busyImport:true,busyKingdom:true,oldClickRevision:true,oldSaveRevision:true,dirtyCandidatesAndHistoryBlocked:true,existingSelectionOnly:true,doubleSaveOneTransaction:true}));
