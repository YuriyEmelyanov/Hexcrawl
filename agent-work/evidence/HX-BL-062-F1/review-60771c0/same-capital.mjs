import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {createGenerationHarness}=await import(pathToFileURL(resolve('test/helpers/generation-harness.mjs')));
const seed=process.argv[2];
const base=JSON.parse(fs.readFileSync(seed));base.map.roads=[];base.map.crossings=[];
const h=createGenerationHarness(42),a=()=>h.render(),data=()=>{const d=JSON.parse(JSON.stringify(a().createSaveData()));delete d.savedAt;return d;};
a();h.setWindow({alert:m=>{throw Error(m)},confirm:()=>true,matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
const load=async d=>{await a().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:''}});a();};
const move=(from,to)=>{a().setEditMode(true);assert(a().startPoiDraft({kind:'land',regionId:1,hexKey:from}));assert(a().changePoiTarget(...to.split(',')));assert(a().finishPoiDraft(),a().editError);};
const name=(ru,en)=>{const owner='poi:1:'+a().selectedHex.q+','+a().selectedHex.r;const target=a().nameTargets.find(t=>t.poiLocator===owner);assert(target);a().showNameTarget(target.key);a().changeNameDraft(ru,a().nameDraft);a().changeOtherNameDraft(en,a().nameDraft);assert(a().saveNameDraft());};
const source='3,-2',dest='1,0',owner='poi:1:3,-2',other='poi:1:1,0';
for(const profile of ['Classic','Knave']){
 await load(base);assert(a().chooseKnaveProfile(profile==='Knave'));a().setSelectedHex({q:3,r:-2});a().setEditMode(true);
 assert(a().changeKnaveDraft({mode:'interaction'}));assert(a().finishKnaveDraft());const b=data();a().setSelectedCentralPoiKind('portal');a().setSelectedPoiKind('portal');assert.deepEqual(data(),b);
 name('Исток','Headwaters');const named=data();assert.equal(named.map.toponyms.names['settlement:1:3,-2'].ru,'Исток');assert.equal(named.map.toponyms.names['settlement:1:3,-2'].en,'Headwaters');move(source,dest);move(dest,source);
 const returned=data();assert.equal(returned.map.regions[0].pointOfInterestKinds[source],'capital');assert.deepEqual(returned.map.editorNames,named.map.editorNames);assert.deepEqual(returned.map.poiDiscovery,named.map.poiDiscovery);
 a().setEditMode(true);a().setSelectedPoiKind('portal');const portal=data();
 assert.equal(portal.map.regions[0].pointOfInterestKinds[source],'portal');assert.equal(portal.map.poiDiscovery[owner],'interaction');assert.deepEqual(portal.map.editorNames[owner],{ru:'Исток',en:'Headwaters'});
 assert.deepEqual(portal.map.regions[0].centerHex,{q:3,r:-2});console.log(profile,'capital at 3,-2 → portal before movement refused; secret named capital moved to 1,0 and back to 3,-2; portal now accepted at identical origin, name and mode retained');
 move(source,dest);assert(a().chooseKnaveProfile(true));a().setEditMode(true);assert.equal(data().map.poiDiscovery[other],'interaction');assert(a().changeKnaveDraft({mode:'exploration'}));assert(a().finishKnaveDraft());assert(a().chooseKnaveProfile(false));a().setEditMode(true);assert.equal(data().map.poiDiscovery[other],'exploration');
 const beforeDelete=data();a().deleteSelectedPoi();assert.deepEqual(data(),beforeDelete);name('','');const cleared=data();a().deleteSelectedPoi();const deleted=data();assert.equal(deleted.map.poiDiscovery[other],undefined);assert.deepEqual(deleted.map.gmNotesByHexKey,named.map.gmNotesByHexKey);a().undoMap();assert.deepEqual(data(),cleared);a().redoMap();assert.deepEqual(data(),deleted);await load(deleted);assert.deepEqual(data(),deleted);console.log(profile,'name-guard, deliberate name clear, delete, Undo/Redo, JSON reopen passed');
}
