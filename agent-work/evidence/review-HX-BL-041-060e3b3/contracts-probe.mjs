import assert from 'node:assert/strict';import fs from 'node:fs';
import {createGenerationHarness} from '/workspace/review-041/test/helpers/generation-harness.mjs';
import {emptyTags,rollTag,editTag,findTag,tagKey,ownerKey,resolved} from '/workspace/review-041/src/tags/engine.ts';
import {mythicDefinitions as defs} from '/workspace/review-041/src/tags/mythic.ts';
const sha='060e3b3ae153d2ee5b8afaf5b94adf28cd36343f';
const fixture=JSON.parse(fs.readFileSync('/workspace/review-041/test/fixtures/import-v2/baseline-mythic.json'));
async function load(h,data){h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});h.render();}
const snapshot=h=>structuredClone(h.render().captureDocument());
const o={kind:'region',id:1};let s=rollTag(emptyTags(),o,defs['mb.land'],42);s=editTag(s,o,'mb.land',1,'ru','kept');const prev=structuredClone(s);s=rollTag(s,o,defs['mb.land'],42,0);
assert.deepEqual(s.instances[0].values[1],prev.instances[0].values[1]);assert.deepEqual(s.instances[0].overrides[1],prev.instances[0].overrides[1]);assert.equal(s.rollCounters[tagKey(o,'mb.land')+'|form'],prev.rollCounters[tagKey(o,'mb.land')+'|form']);
let p=rollTag(emptyTags(),o,defs['mb.monument'],42);const pprev=structuredClone(p);p=rollTag(p,o,defs['mb.monument'],42,0);assert.deepEqual(p.instances[0].values[1],pprev.instances[0].values[1]);assert.deepEqual(p.instances[0].texts,resolved(defs['mb.monument'],p.instances[0].values).texts);
const h=createGenerationHarness(42);await load(h,fixture);assert.equal(h.render().tags.instances.length,0);h.render().fillMissingTags();const filled=snapshot(h);h.render().undoMap();assert.equal(h.render().tags.instances.length,0);h.render().redoMap();assert.deepEqual(snapshot(h),filled);
const exported=h.render().createSaveData();h.geometry.assertHexcrawlSaveData(exported);const j=createGenerationHarness(7);await load(j,exported);assert.deepEqual(j.render().tags,h.render().tags);
const bad=j.render().createSaveData();bad.map.tags.schemaVersion=2;const before=snapshot(j),hist=structuredClone(j.render().undoHistory);await assert.rejects(()=>load(j,bad));assert.deepEqual(snapshot(j),before);assert.deepEqual(structuredClone(j.render().undoHistory),hist);
// A future definition version is retained and refuses an ordinary production roll.
const future=structuredClone(exported);future.map.tags.instances[0].definitionVersion=2;future.map.tags.instances[0].texts[0]={ru:'<b>future text snapshot</b>'};await load(j,future);const f=j.render().tags.instances[0],frozen=snapshot(j);assert.equal(j.render().mutateTag(f.owner,f.definitionId,0),false);assert.deepEqual(snapshot(j),frozen);
// A captured callback from a previous document cannot write to the imported one.
const stale=j.render().mutateTag;await load(j,exported);const current=snapshot(j);assert.equal(stale(o,'mb.land'),false);assert.deepEqual(snapshot(j),current);
// Deleting a POI prunes both records and counters, and undo restores them exactly.
const r=j.render().regions.find(r=>r.pointsOfInterest.length),hex=r.pointsOfInterest[0],po={kind:'poi',regionId:r.id,hexKey:`${hex.q},${hex.r}`};j.render().setSelectedHex(hex);j.render();assert.equal(j.render().mutateTag(po,'mb.feature'),true);const withPoi=snapshot(j);j.render().deleteSelectedPoi();assert.ok(!j.render().tags.instances.some(i=>ownerKey(i.owner)===ownerKey(po)));assert.ok(!Object.keys(j.render().tags.rollCounters).some(k=>k.startsWith(ownerKey(po)+'|')));j.render().undoMap();assert.deepEqual(snapshot(j),withPoi);
// One hundred tag rolls and one following real generation preserve geography/RNG.
const control=createGenerationHarness(42);await load(control,j.render().createSaveData());
let rolled=rollTag(j.render().tags,o,defs['mb.land'],j.render().generationRef.current.masterSeed);for(let n=0;n<100;n++)rolled=rollTag(rolled,o,defs['mb.land'],j.render().generationRef.current.masterSeed,0);
const rngBefore=structuredClone(j.render().captureDocument().map.generation),rolledDoc=snapshot(j);rolledDoc.map.tags=rolled;j.render().applyDocument(rolledDoc);j.render();assert.deepEqual(structuredClone(j.render().captureDocument().map.generation),rngBefore);
const anchor=j.render().candidateHexes[0];j.render().safelyAddRegionToMap(anchor,{targetSize:6,coastalPreference:'mainland'});control.render().safelyAddRegionToMap(anchor,{targetSize:6,coastalPreference:'mainland'});
const geography=h=>{const d=structuredClone(h.render().createSaveData());delete d.savedAt;delete d.map.tags;return d;};assert.deepEqual(geography(j),geography(control));
const result={sha,independentSiblingValuesOverridesCounter:'pass',productRecomputeSiblingValue:'pass',legacyNoRoll:'pass',fillExactUndoRedo:'pass',ordinaryV6Roundtrip:'pass',unknownTagStateAtomicReject:'pass',futureDefinitionReadOnly:'pass',staleDocumentCallback:'pass',poiDeletePruneUndo:'pass',hundredTagRollsFollowingProductionGeneration:'pass',limits:'Temporary reviewer probes; not permanent tests. No fresh PDF transcription, user confirmation or multi-game coverage.'};fs.writeFileSync('/workspace/review-041-evidence/contracts-probe.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
