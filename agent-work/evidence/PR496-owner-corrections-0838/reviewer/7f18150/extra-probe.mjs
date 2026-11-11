import assert from 'node:assert/strict';
import {createGenerationHarness} from '/tmp/pr496-7f1-review-src/test/helpers/generation-harness.mjs';
import {regionFixture} from '/tmp/pr496-7f1-review-src/test/helpers/region-fixture.mjs';
import {detailCirclePolygon} from '/tmp/pr496-7f1-review-src/src/detailSizes.ts';
import {detailPositiveAreaIntersections,createDetailGrid} from '/tmp/pr496-7f1-review-src/src/detailGrid.ts';
const h=createGenerationHarness(123),alerts=[];h.render();h.setWindow({alert:s=>alerts.push(s)});h.injectFunction('readTextFile',async f=>f.text);
const load=async data=>{alerts.length=0;await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});};
const doc=()=>structuredClone(h.render().captureDocument()),stacks=()=>structuredClone([h.render().undoHistory,h.render().redoHistory]);
await load(regionFixture());assert.equal(alerts.length,0);assert.equal(h.render().startDetailAdaptation(),true);assert.equal(h.render().applyDetailAdaptation(),true);h.render().setEditMode(true);
const p=doc().map.physicalGrid.poiFootprints[0],before=doc(),history=stacks();
for(const kind of ['measured','manual']){
 const extent=kind==='measured'?{kind:'measured_polygon',sourceId:'independent remote survey',unit:'mile',method:'positive_area_intersection',sourcePolygon:detailCirclePolygon({x:0,y:0},.4)}:{kind:'manual',basis:'conditional',note:'independent remote outline'};
 assert.equal(h.render().editDetailFootprintExtent(p.poiId,extent,[{q:0,r:0}]),false);assert.deepEqual(doc(),before);assert.deepEqual(stacks(),history);console.log(JSON.stringify({case:kind+'-remote-edit-atomic',rejected:true,documentAndHistoriesUnchanged:true}));
}
const validExtent={kind:'measured_polygon',sourceId:'independent local survey',unit:'mile',method:'positive_area_intersection',sourcePolygon:detailCirclePolygon(p.worldAnchor,.4)};
assert.equal(h.render().editDetailFootprintExtent(p.poiId,validExtent),true);const surveyed=doc();assert.deepEqual(surveyed.map.physicalGrid.poiFootprints[0].worldAnchor,p.worldAnchor);h.render().undoMap();assert.deepEqual(doc(),before);h.render().redoMap();assert.deepEqual(doc(),surveyed);console.log(JSON.stringify({case:'valid-survey-history',anchorPreserved:true,exactUndoRedo:true}));
h.render().setEditMode(false);const saved=structuredClone(h.render().createSaveData());
for(const [name,change] of [['measured-anchor',d=>d.map.physicalGrid.poiFootprints[0].worldAnchor={x:1e9,y:1e9}],['manual-anchor',d=>{const p=d.map.physicalGrid.poiFootprints[0];p.extent={kind:'manual',basis:'conditional',note:'unsafe anchor'};p.worldAnchor={x:1e9,y:1e9};}],['selected-point-cell-mismatch',d=>{d.map.physicalGrid.selectedCell={q:12,r:0};d.map.physicalGrid.selectedWorldPoint={x:0,y:0};}]]){
 const bad=structuredClone(saved);change(bad);const old=doc(),hs=stacks();await load(bad);assert.equal(alerts.length,1);assert.deepEqual(doc(),old);assert.deepEqual(stacks(),hs);console.log(JSON.stringify({case:'invalid-import-'+name,rejected:true,documentAndHistoriesUnchanged:true}));
}
const legacy=structuredClone(saved);legacy.version=11;legacy.map.physicalGrid.version=1;delete legacy.map.physicalGrid.selectedWorldPoint;delete legacy.map.physicalGrid.selectedCell;for(const p of legacy.map.physicalGrid.poiFootprints){delete p.worldAnchor;p.extent={kind:'default',reason:'unknown_size',policy:'one_cell'};}
await load(legacy);assert.equal(alerts.length,0);assert.deepEqual(doc().map.physicalGrid,legacy.map.physicalGrid);assert.equal(h.render().createSaveData().version,11);const oldLegacy=doc();
assert.equal(h.render().setDetailViewStep(12),true);assert.equal(doc().map.physicalGrid.version,1);assert.equal(doc().map.physicalGrid.poiFootprints[0].worldAnchor,undefined);const expected=structuredClone(legacy.map.physicalGrid);expected.viewStep=12;assert.deepEqual(doc().map.physicalGrid,expected);console.log(JSON.stringify({case:'legacy-read-and-view',payloadUnchangedExceptView:true,versionStill1:true,exportVersion11:true}));
const preselect=doc();assert.equal(h.render().selectDetailCell({q:12,r:0}),true);const selected=doc();assert.equal(selected.map.physicalGrid.version,2);assert.deepEqual(selected.map.physicalGrid.poiFootprints.map(({worldAnchor,...p})=>p),preselect.map.physicalGrid.poiFootprints);assert.deepEqual(selected.map.physicalGrid.selectedWorldPoint,{x:12,y:0});assert.deepEqual(selected.map.generation,preselect.map.generation);h.render().undoMap();assert.deepEqual(doc(),preselect);h.render().redoMap();assert.deepEqual(doc(),selected);console.log(JSON.stringify({case:'legacy-explicit-select',version2:true,onlyCompatibilityAnchorsAndSelectionAdded:true,extentCellsUnchanged:true,streamsUnchanged:true,exactUndoRedo:true}));
