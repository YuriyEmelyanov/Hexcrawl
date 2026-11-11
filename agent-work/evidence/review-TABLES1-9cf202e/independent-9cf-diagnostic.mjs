import assert from 'node:assert/strict';
import {createGenerationHarness} from '/tmp/tables1-independent-9cf/test/helpers/reviewer-harness.mjs';
import {regionFixture} from '/tmp/tables1-independent-9cf/test/helpers/region-fixture.mjs';
import {knaveCatalogFixture,knaveContentFixture} from '/tmp/tables1-independent-9cf/test/helpers/knave-fixture.mjs';
import {newKnaveLayer} from '/tmp/tables1-independent-9cf/src/knaveClassic.ts';
import {createGenerationState} from '/tmp/tables1-independent-9cf/src/worldRandom.ts';
const owner='poi:1:2,0',tick=()=>new Promise(r=>setTimeout(r,15));
const catalog=()=>{const c=knaveCatalogFixture();c.tables.structures[26].references=[{printedPage:16,resolution:'unresolved_source_reference'}];c.tables.dungeons[83].references=[{printedPage:11,resolution:'unresolved_source_reference'}];return c;};
async function setup(detail=true){const data=regionFixture();data.version=10;data.generation=createGenerationState(42);data.map.seas=[];data.map.nextSeaId=1;data.map.knave=newKnaveLayer();data.map.regions[0].pointOfInterestKinds['2,0']='ruins';data.map.knave.content=knaveContentFixture(owner);const h=createGenerationHarness(42);h.render();h.guardRandom();h.injectFunction('knaveGenerationCatalog',catalog);h.injectFunction('readTextFile',async f=>f.text);h.setWindow({alert:m=>{throw Error(m)}});await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});h.render();if(detail){assert.equal(h.render().startDetailAdaptation(),true);assert.equal(h.render().applyDetailAdaptation(),true);}for(const cmd of [{kind:'add',owner,table:'structures',choice:{kind:'manual',row:27}},{kind:'description',owner,value:'accepted <b>owner</b>'}])assert.equal(h.render().mutatePreparation(cmd,h.render().preparationContext(owner)),true);return h;}
const doc=h=>structuredClone(h.render().captureDocument());
for(const route of ['direct','ref-pointer','ref-Enter','ref-Space'])for(const choice of ['stay','discard','finish']){
 const h=await setup(),base=doc(h),rev=h.render().documentRevision.current,len=h.render().undoHistory.length;
 const state=base.map.physicalGrid,foot=state.poiFootprints.find(p=>p.legacyRef===owner||state.poiIdentities.byLegacyRef[owner]===p.poiId)??state.poiFootprints[0],cell=foot.cells[0],poiId=foot.poiId;
 let discarded=0,finished=0;const ticket=h.render().preparationContext(owner);
 h.render().preparationNavigation.current={owner,revision:rev,dirty:true,finish:()=>{finished++;h.render().notifyTagDraft('preparation:'+owner,false);const ok=h.render().mutatePreparation({kind:'description',owner,value:'saved draft'},ticket);h.render().preparationNavigation.current=null;h.render();return ok;},discard:()=>{discarded++;h.render().notifyTagDraft('preparation:'+owner,false);h.render().preparationNavigation.current=null;h.render();},focus:()=>{}};
 h.render().notifyTagDraft('preparation:'+owner,true);h.render();
 if(route==='direct')assert.equal(h.render().selectDetailCell(cell,rev,1,poiId),false);else h.render().detailCellClickRef.current(cell,1,poiId);
 assert.deepEqual(doc(h),base);assert.ok(h.render().preparationExitRequest);h.render().resolvePreparationExit(choice);await tick();const result=doc(h);
 if(choice==='stay'){assert.deepEqual(result,base);assert.equal(finished+discarded,0);assert.equal(h.render().undoHistory.length,len);}
 else {assert.deepEqual(result.map.physicalGrid.selectedCell,cell);assert.equal(result.map.physicalGrid.viewStep,1);assert.deepEqual(result.generation,base.generation);assert.equal(result.map.knave.content.byPoi[owner].description,choice==='finish'?'saved draft':base.map.knave.content.byPoi[owner].description);assert.equal(finished,choice==='finish'?1:0);assert.equal(discarded,choice==='discard'?1:0);h.render().undoMap();if(choice==='finish'){assert.equal(doc(h).map.knave.content.byPoi[owner].description,'saved draft');h.render().undoMap();}assert.deepEqual(doc(h),base);h.render().redoMap();if(choice==='finish')h.render().redoMap();assert.deepEqual(doc(h),result);}
 console.log(JSON.stringify({diagnostic:'F1 real callback',route,choice,revisionBefore:rev,revisionAfter:h.render().documentRevision.current,finished,discarded,status:'passed',dom:false}));
}
for(const kind of ['E7','E8']){
 const h=await setup(false),before=doc(h),content=before.map.knave.content;h.render().setEditMode(true);
 if(kind==='E7'){assert.equal(h.render().startRegionDraft('transfer_hex'),true);const d=h.render().regionDraft;assert.equal(h.render().changeRegionDraft(d,{...d.edit,toRegionId:2}),true);assert.equal(h.render().finishRegionDraft(),true);}else{assert.equal(h.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'}),true);assert.equal(h.render().changePoiTarget('3','0'),true);assert.equal(h.render().finishPoiDraft(),true);}
 const after=doc(h),next=kind==='E7'?'poi:2:2,0':'poi:2:3,0';assert.deepEqual(after.map.knave.content.byPoi[next],content.byPoi[owner]);assert.equal(after.map.knave.content.nextCallId,content.nextCallId);assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.map.gmNotesByHexKey,before.map.gmNotesByHexKey);h.render().undoMap();assert.deepEqual(doc(h),before);h.render().redoMap();assert.deepEqual(doc(h),after);console.log(JSON.stringify({diagnostic:kind+' schema2 real handler',status:'passed',nextOwner:next,calls:content.byPoi[owner].calls.length}));
}
