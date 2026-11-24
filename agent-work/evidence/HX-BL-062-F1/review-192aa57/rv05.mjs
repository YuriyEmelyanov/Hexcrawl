import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from '/tmp/hx03src/test/helpers/generation-harness.mjs';
const raw=JSON.parse(fs.readFileSync('/tmp/hx03ops/agent-work/evidence/HX-BL-062-F1/449e6fe/seed42.json'));
const at=k=>Object.fromEntries(['q','r'].map((p,i)=>[p,Number(k.split(',')[i]) ]));
const origin='3,-2',dest='1,0',owner='poi:1:'+origin,destOwner='poi:1:'+dest;
raw.ui.selectedHex=at(origin); raw.map.roads=[];raw.map.crossings=[];raw.map.gmNotesByHexKey={[origin]:'First\nПервая',[dest]:'Second\nВторая'};
const read=async(h,d)=>{h.setWindow({alert:m=>{throw Error(m)},confirm:()=>true,matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:''}});h.render();};
const save=h=>{let d=JSON.parse(JSON.stringify(h.render().createSaveData()));delete d.savedAt;return d;};
const changeName=(a,ru,en)=>{const t=a().nameTargets.find(t=>t.poiLocator==='poi:1:'+a().selectedHex.q+','+a().selectedHex.r);assert(t);a().showNameTarget(t.key);a().changeNameDraft(ru,a().nameDraft);a().changeOtherNameDraft(en,a().nameDraft);assert(a().saveNameDraft());};
const history=(h,old,now)=>{h.render().undoMap();assert.deepEqual(save(h),old);h.render().redoMap();assert.deepEqual(save(h),now);};
const restore=async (d)=>{const other=createGenerationHarness(1);await read(other,d); assert.deepEqual(save(other),d);};
for(const isKnave of [false,true]){
 const h=createGenerationHarness(4242),a=()=>h.render();await read(h,raw);assert(a().chooseKnaveProfile(isKnave));a().setEditMode(true);assert(a().changeKnaveDraft({mode:'interaction'}));assert(a().finishKnaveDraft());changeName(a,'Камыши','Reedbanks');
 let init=save(h);assert.equal(init.map.poiDiscovery[owner],'interaction');
 for(const [setter,k] of [['setSelectedPoiKind','portal'],['setSelectedCentralPoiKind','farm'],['setSelectedPoiKind','village']]){
   a().setEditMode(true);a()[setter](k);const next=save(h);assert.equal(next.map.regions[0].pointOfInterestKinds[origin],k);assert.equal(next.map.regions[0].centralPoiKind,undefined);assert.deepEqual(next.map.regions[0].centerHex,raw.ui.selectedHex);assert.deepEqual(next.map.poiDiscovery,init.map.poiDiscovery);assert.deepEqual(next.map.gmNotesByHexKey,raw.map.gmNotesByHexKey);
   assert.deepEqual(next.map.editorNames?.[owner]?? {ru:next.map.toponyms.names['settlement:1:'+origin].ru,en:next.map.toponyms.names['settlement:1:'+origin].en},{ru:'Камыши',en:'Reedbanks'});
   await restore(next);history(h,init,next);a().undoMap();assert.deepEqual(save(h),init);
 }
 a().setEditMode(true);assert(a().startPoiDraft({kind:'land',regionId:1,hexKey:origin}));assert(a().changePoiTarget('1','0'));assert(a().finishPoiDraft());const moved=save(h);
 assert.equal(moved.map.regions[0].pointOfInterestKinds[dest],'capital');assert.deepEqual(moved.map.gmNotesByHexKey,raw.map.gmNotesByHexKey);assert.equal(moved.map.poiDiscovery[owner],undefined);assert.equal(moved.map.poiDiscovery[destOwner],'interaction');assert.deepEqual(moved.map.toponyms.names['settlement:1:'+dest],init.map.toponyms.names['settlement:1:'+origin]);history(h,init,moved);await restore(moved);
 a().undoMap();a().setEditMode(true);const cleared=save(h); a().deleteSelectedPoi();const deleted=save(h);assert.equal(deleted.map.regions[0].centralPoiKind,undefined);assert.equal(deleted.map.poiDiscovery[owner],undefined);assert.equal(deleted.map.poiDiscovery['poi:1:0,0'],'interaction');assert.deepEqual(deleted.map.gmNotesByHexKey,raw.map.gmNotesByHexKey);history(h,cleared,deleted);await restore(deleted);
 const v=structuredClone(raw);v.map.regions[0].centralPoiKind='village';const j=createGenerationHarness(123),b=()=>j.render();await read(j,v);assert(b().chooseKnaveProfile(isKnave));b().setEditMode(true);const village=save(j);b().setSelectedPoiKind('portal');b().setSelectedCentralPoiKind('portal');b().deleteSelectedPoi();assert.deepEqual(save(j),village);b().setSelectedCentralPoiKind('city');assert.equal(save(j).map.regions[0].centralPoiKind,'city');b().setSelectedHex(at(dest));b().setEditMode(true);const empty=save(j);b().setSelectedPoiKind('capital');assert.deepEqual(save(j),empty);b().setSelectedPoiKind('portal');const added=save(j);assert.equal(added.map.regions[0].pointOfInterestKinds[dest],'portal');assert(['passage','interaction','exploration'].includes(added.map.poiDiscovery[destOwner]));await restore(added);
 console.log(JSON.stringify({profile:isKnave?'Knave':'Classic',origin,dest,directChanges:['portal','farm','village'],name:'Камыши / Reedbanks',mode:'interaction',fullUndoRedo:true,freshImports:6,noteAndSiblingPreserved:true,centralVillageRules:true,ordinaryCreationRules:true}));
}
