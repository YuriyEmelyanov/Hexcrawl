import fs from 'node:fs';import assert from 'node:assert/strict';
import {createGenerationHarness} from '/tmp/pr496-de9-review-src/test/helpers/independent-de9-harness.mjs';
import {regionFixture} from '/tmp/pr496-de9-review-src/test/helpers/region-fixture.mjs';
import {createDetailGrid,worldToDetailCell} from '/tmp/pr496-de9-review-src/src/detailGrid.ts';
const h=createGenerationHarness(42),alerts=[];h.render();h.setWindow({alert:x=>alerts.push(x)});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:JSON.stringify(regionFixture())}],value:''}});assert.deepEqual(alerts,[]);
assert.equal(h.render().startDetailAdaptation(),true);assert.equal(h.render().applyDetailAdaptation(),true);h.guardRandom();
const observed=[];
for(const step of [6,12,24]){
 assert.equal(h.render().setDetailViewStep(step),true);const world={x:step/2+.01,y:0};
 h.render().detailDisplayClickRef.current({cell:{q:1,r:0}},world);
 const doc=h.render().captureDocument(),summary=h.render().detailSummary;
 const direct=worldToDetailCell(createDetailGrid(step),world),actual=summary.cell;
 observed.push({step,world,direct,selectedFine:doc.map.physicalGrid.selectedCell,actual,source:doc.selectedHex,error:h.render().detailAdaptationError});
 assert.notDeepEqual(actual,direct,'selected-grid click rounds to wrong cell through one-mile address');
}
// Exact view-only cycle and accepted-state / RNG conservation through real commands.
const d0=structuredClone(h.render().captureDocument());for(const s of [1,6,12,24])assert.equal(h.render().setDetailViewStep(s),true);const d1=structuredClone(h.render().captureDocument());assert.equal(d1.mapScale,d0.mapScale);const expected=structuredClone(d0.map);expected.physicalGrid.viewStep=24;assert.deepEqual(d1.map,expected);
console.log(JSON.stringify({head:'de9f374d737e85edc2f6a2ae52e5159a734f9f31',mode:'actual App callbacks with substituted React hook storage; useEffect/DOM excluded',observed,viewOnlyScaleCycle:'exact',acceptedState:'unchanged',alerts},null,2));
