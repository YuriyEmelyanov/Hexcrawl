import fs from 'node:fs';import assert from 'node:assert/strict';
import {createGenerationHarness} from '/tmp/pr496-64f-review-src/test/helpers/generation-harness.mjs';
import {regionFixture} from '/tmp/pr496-64f-review-src/test/helpers/region-fixture.mjs';
import {createDetailGrid,worldToDetailCell} from '/tmp/pr496-64f-review-src/src/detailGrid.ts';
const h=createGenerationHarness(42),alerts=[];h.render();h.setWindow({alert:x=>alerts.push(x)});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:JSON.stringify(regionFixture())}],value:''}});assert.deepEqual(alerts,[]);assert.equal(h.render().startDetailAdaptation(),true);assert.equal(h.render().applyDetailAdaptation(),true);h.guardRandom();
const observed=[];const streams=structuredClone(h.render().captureDocument().map.generation);
for(const step of [6,12,24]){
 assert.equal(h.render().setDetailViewStep(step),true);const world={x:step/2+.01,y:0};
 const before=structuredClone(h.render().captureDocument());
 h.render().detailDisplayClickRef.current({cell:{q:1,r:0}},world);
 const doc=structuredClone(h.render().captureDocument()),summary=h.render().detailSummary;
 const direct=worldToDetailCell(createDetailGrid(step),world),actual=summary.cell;
 assert.deepEqual(structuredClone(actual),direct);assert.deepEqual(doc.map.physicalGrid.selectedWorldPoint,world);assert.deepEqual(doc.map.generation,streams);
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),doc);
 const saved=JSON.parse(JSON.stringify(h.render().createSaveData()));delete saved.savedAt;
 const target=createGenerationHarness(45),targetAlerts=[];target.render();target.setWindow({alert:x=>targetAlerts.push(x)});target.injectFunction('readTextFile',async f=>f.text);await target.render().handleImportJson({target:{files:[{text:JSON.stringify(saved)}],value:''}});
 assert.deepEqual(targetAlerts,[]);const afterSave=JSON.parse(JSON.stringify(target.render().createSaveData()));delete afterSave.savedAt;assert.deepEqual(afterSave,saved);assert.deepEqual(structuredClone(target.render().detailSummary.cell),direct);
 const historyLength=h.render().undoHistory.length;h.render().detailDisplayClickRef.current({cell:direct},world);assert.equal(h.render().undoHistory.length,historyLength,'exact repeat adds no history');
 observed.push({step,world,direct,selectedFine:doc.map.physicalGrid.selectedCell,actual,source:doc.selectedHex,selectedWorldPoint:doc.map.physicalGrid.selectedWorldPoint,exactUndoRedo:true,roundtrip:true,repeatedCallbackNoOp:true,error:h.render().detailAdaptationError});
}
const d0=structuredClone(h.render().captureDocument());for(const s of [1,6,12,24])assert.equal(h.render().setDetailViewStep(s),true);const d1=structuredClone(h.render().captureDocument());assert.equal(d1.mapScale,d0.mapScale);const expected=structuredClone(d0.map);expected.physicalGrid.viewStep=24;assert.deepEqual(d1.map,expected);
console.log(JSON.stringify({head:'64f06fc7df28dffcd6b9b83fc297cf46451c1e69',mode:'actual App callbacks with substituted React hook storage; useEffect/DOM excluded',closure:'DISPLAY-POINT-ROUNDTRIP',observed,viewOnlyScaleCycle:'exact',acceptedState:'unchanged',alerts},null,2));
