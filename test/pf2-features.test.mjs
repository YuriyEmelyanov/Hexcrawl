import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalUnitWidth,physicalUnitCenter,physicalUnitCell,physicalUnitPolygon} from '../src/physicalUnit.ts';
import {emptyFeaturePreparation,fillFeaturePreparation,featureCategory,featureContext,validateFeaturePreparation,editPreparedFeature,removePreparedFeature,pf2FeatureCatalog,effectiveFeatureCategory} from '../src/tags/pf2Features.ts';
import {drawTagIndex} from '../src/tags/engine.ts';
import {createDetailGrid,detailCellPolygon} from '../src/detailGrid.ts';
import {featureCandidatesForMap,fillFeatureMap,assertFeatureMap,featureLossesForMap,retainFeaturePreparation} from '../src/tags/pf2Map.ts';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {regionFixture} from './helpers/region-fixture.mjs';
import {createGenerationState} from '../src/worldRandom.ts';

// New PF2 contracts cannot be exercised by Knave's d100/owner fixtures:
// physical convention, processed unit ledger and batch-wide atomic refusal.
const candidates=Array.from({length:300},(_,q)=>({q,r:0,context:q%2?'forest':'desert',protected:false}));
const clone=structuredClone;
test('PF2 physical unit uses shared geometry with twelve vertex miles, stable inverse and exact d20 boundaries',()=>{
 const u=emptyFeaturePreparation().physicalUnit,width=physicalUnitWidth(u);
 assert.equal(width,6*Math.sqrt(3));
 const polygon=physicalUnitPolygon(u,{q:0,r:0});assert.ok(Math.abs(Math.hypot(polygon[0].x-polygon[3].x,polygon[0].y-polygon[3].y)-12)<1e-9);
 assert.deepEqual(polygon,detailCellPolygon(createDetailGrid(1),{q:0,r:0}).map(p=>({x:p.x*width,y:p.y*width})));
 for(const q of [-8,0,19])for(const r of [-7,0,11]){const c={q,r};assert.deepEqual(physicalUnitCell(u,physicalUnitCenter(u,c)),c);}
 const counts={landmark:0,secret:0,resource:0,standard:0};for(let d=1;d<=20;d++)counts[featureCategory(d)]++;
 assert.deepEqual(Object.values(counts).map(n=>n*5),[15,15,15,55]);assert.deepEqual(Object.values(counts).map(n=>n*15),[45,45,45,165]);
 for(const d of [0,21,1.5,NaN,Infinity])assert.throws(()=>featureCategory(d));
 assert.throws(()=>physicalUnitWidth({...u,measurement:'unknown'}));assert.throws(()=>physicalUnitWidth({...u,length:0}));
 assert.equal(featureContext('swamp_forest','land'),'swamp');assert.equal(featureContext('mountains','lake'),'aquatic');assert.throws(()=>featureContext('arctic','land'));
});

test('PF2 batch300 preserves input, protected units, deterministic IDs/order and idempotent standard results',()=>{
 const before=emptyFeaturePreparation(),saved=clone(before),input=[...candidates,{q:301,r:0,context:'forest',protected:true}];
 const state=fillFeaturePreparation(before,input,42);assert.deepEqual(before,saved);
 assert.equal(Object.keys(state.units).length,300);assert.equal(state.units['301,0'],undefined);
 assert.deepEqual(fillFeaturePreparation(before,[...input].reverse(),42),state);
 for(const [k,record]of Object.entries(state.units))assert.equal(record.outcome,drawTagIndex(42,`pf2-feature:v1:unit:${k}:category`,0,20).index+1);
 assert.strictEqual(fillFeaturePreparation(state,input,42),state);assert.ok(Object.values(state.units).some(u=>u.disposition==='standard'));
 const reopened=JSON.parse(JSON.stringify(state));validateFeaturePreparation(reopened);assert.deepEqual(reopened,state);
 const extended=fillFeaturePreparation(state,[{q:302,r:0,context:'aquatic',protected:false}],42);
 for(const [k,u]of Object.entries(state.units))assert.deepEqual(extended.units[k],u);
 assert.equal(pf2FeatureCatalog.length,17);assert.equal(state.physicalUnit.measurement,'opposite_vertices');
 const cells=Array.from({length:900},(_,i)=>({q:i%30,r:Math.floor(i/30)}));
 const map={regions:[{id:1,hexes:cells,centerHex:cells[0],pointsOfInterest:[],biomeId:'open_plains'}],hexTerrainByKey:new Map(),biomeOverrideByHexKey:new Map(),waterPoiByKey:new Map(),gmNotesByHexKey:{}};
 const projected=featureCandidatesForMap(map);assert.ok(projected.length>250);assert.ok(projected.length<400);
 const prepared=fillFeatureMap(map,42);assertFeatureMap(prepared);assert.equal(Object.keys(prepared.featurePreparation.units).length,projected.length);
 const protectedMap={...map,gmNotesByHexKey:{'0,0':'Authored note'}};assert.equal(featureCandidatesForMap(protectedMap).find(c=>c.q===0&&c.r===0).protected,true);
 const bad=clone(prepared);bad.regions=[];assert.throws(()=>assertFeatureMap(bad));
 const mb={...map,tags:{instances:[{owner:{kind:'region',id:1}}]}};assert.ok(featureCandidatesForMap(mb).every(c=>c.protected));
 const authored={...map,editorNames:{'region:1':{ru:'Моя область',en:'My region'}}};assert.ok(featureCandidatesForMap(authored).every(c=>c.protected));
 const retained=retainFeaturePreparation(prepared.featurePreparation,{...prepared,regions:[]});validateFeaturePreparation(retained);assert.equal(Object.keys(retained.features).length,0);assert.equal(retained.nextFeatureId,prepared.featurePreparation.nextFeatureId);assert.ok(Object.values(retained.units).every(u=>u.disposition!=='active'));
});

// Real document import/history needs App coverage; the detached contracts above
// cannot prove that capture/save/restore retain the new layer or profile flag.
test('PF2 App v13 roundtrip, profile history and invalid live references are atomic',async()=>{
 const h=createGenerationHarness(0),base=regionFixture();base.generation=createGenerationState(0);
 const load=async(h,data)=>{h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});h.render();};
 const stable=h=>structuredClone(h.render().captureDocument());
 await load(h,base);const before=stable(h),legacyVersion=h.render().createSaveData().version;
 assert.equal(h.render().choosePF2Profile(true),true);assert.equal(h.render().createSaveData().version,13);assert.equal(stable(h).pf2Enabled,true);
 h.render().undoMap();assert.deepEqual(stable(h),before);assert.equal(h.render().createSaveData().version,legacyVersion);
 h.render().redoMap();const enabled=stable(h);assert.equal(enabled.pf2Enabled,true);
 const map=fillFeatureMap(enabled.map,0);assert.ok(map.featurePreparation);assert.ok(Object.keys(map.featurePreparation.features).length);
 const depth=h.render().undoHistory.length;assert.equal(h.render().fillPF2(),true);assert.equal(h.render().undoHistory.length,depth+1);
 const accepted=stable(h),saved=h.render().createSaveData();assert.equal(saved.version,13);assert.deepEqual(accepted.map.featurePreparation,map.featurePreparation);
 assert.equal(h.render().fillPF2(),false);assert.deepEqual(stable(h),accepted);
 h.render().undoMap();assert.deepEqual(stable(h),enabled);h.render().redoMap();assert.deepEqual(stable(h),accepted);
 assert.throws(()=>h.render().applyDocument({...accepted,map:{...accepted.map,regions:[]}}));assert.deepEqual(stable(h),accepted);
 const restored=createGenerationHarness(99);await load(restored,saved);assert.deepEqual(stable(restored).map,accepted.map);assert.equal(stable(restored).pf2Enabled,true);
 const snapshot=stable(restored),history=structuredClone([restored.render().undoHistory,restored.render().redoHistory]),alerts=[];
 restored.setWindow({alert:m=>alerts.push(m),matchMedia:()=>({matches:false})});
 const mutations=[s=>s.version=12,s=>s.map.featurePreparation.future=true,s=>{const f=Object.values(s.map.featurePreparation.features)[0];f.worldAnchor.x=100000;},s=>s.map.featurePreparation.coordinateBasis='known',s=>s.ui.knaveEnabled=true];
 for(const mutate of mutations){const bad=clone(saved);mutate(bad);await load(restored,bad);assert.deepEqual(stable(restored),snapshot);assert.deepEqual(structuredClone([restored.render().undoHistory,restored.render().redoHistory]),history);}
 assert.equal(alerts.length,mutations.length);
 assert.equal(restored.render().choosePF2Profile(false),true);assert.deepEqual(stable(restored).map.featurePreparation,snapshot.map.featurePreparation);
 restored.render().undoMap();assert.deepEqual(stable(restored),snapshot);
 const empty=createGenerationHarness(0);empty.render();assert.equal(empty.render().choosePF2Profile(true),true);const pf2Blank=stable(empty);
 assert.equal(empty.render().chooseKnaveProfile(true),true);const knaveBlank=stable(empty);assert.equal(knaveBlank.pf2Enabled,false);assert.equal(knaveBlank.knaveEnabled,true);
 empty.render().undoMap();assert.deepEqual(stable(empty),pf2Blank);empty.render().redoMap();assert.deepEqual(stable(empty),knaveBlank);
});

test('PF2 whole batch and strict snapshot validation reject malformed records without input writes',()=>{
 const before=emptyFeaturePreparation(),saved=clone(before);
 for(const bad of [{...candidates[0],context:'unknown'},{...candidates[0],r:NaN},{...candidates[0],q:-0}]){
  assert.throws(()=>fillFeaturePreparation(before,[candidates[1],bad],42));assert.deepEqual(before,saved);
 }
 assert.throws(()=>fillFeaturePreparation(before,[candidates[0],candidates[0]],42));
 const state=fillFeaturePreparation(before,candidates,42),id=Object.keys(state.features)[0];
 const mutations=[s=>s.future=true,s=>s.schemaVersion=2,s=>s.physicalUnit.measurement='across_flats',s=>s.units['0,0'].outcome=21,s=>s.units['0,0'].category='bad',s=>s.features[id].worldAnchor.x++,s=>s.features[id].template.source_url='forged',s=>s.features[id].template.id='unknown',s=>s.features[id].descriptionOverride='x'.repeat(20001),s=>s.nextFeatureId=Number(id),s=>s.units['bad']=s.units['0,0']];
 for(const change of mutations){const bad=clone(state);change(bad);assert.throws(()=>validateFeaturePreparation(bad));assert.deepEqual(before,saved);}
 const exhausted={...before,nextFeatureId:Number.MAX_SAFE_INTEGER};assert.throws(()=>fillFeaturePreparation(exhausted,candidates,42));assert.deepEqual(exhausted.units,{});
});

test('PF2 literal editing and deletion preserve sibling records, monotone IDs and removed-unit tombstones',()=>{
 const state=fillFeaturePreparation(emptyFeaturePreparation(),candidates,42),id=Number(Object.keys(state.features)[0]),k=state.features[id].unitKey;
 const edited=editPreparedFeature(state,id,{name:'',description:'<script>literal</script>'+'x'.repeat(19976),discovery:'search'});
 assert.equal(edited.features[id].descriptionOverride.length,20000);assert.equal(state.features[id].descriptionOverride,undefined);
 for(const [other,f]of Object.entries(state.features))if(Number(other)!==id)assert.deepEqual(edited.features[other],f);
 const removed=removePreparedFeature(edited,id);assert.equal(removed.features[id],undefined);assert.equal(removed.units[k].disposition,'removed');assert.equal(removed.nextFeatureId,state.nextFeatureId);
 assert.strictEqual(fillFeaturePreparation(removed,candidates,42),removed);
 const literal=clone(edited);literal.features[id].template.title.ru='Accepted literal from saved catalog';validateFeaturePreparation(literal);assert.equal(literal.features[id].template.title.ru,'Accepted literal from saved catalog');
 const category=editPreparedFeature(edited,id,{category:state.features[id].category==='secret'?'resource':'secret'});assert.equal(effectiveFeatureCategory(category.features[id]),category.features[id].categoryOverride);assert.deepEqual(category.units,edited.units);assert.deepEqual(category.features[id].template,edited.features[id].template);assert.equal(category.features[id].discoveryOverride,'search');
 assert.throws(()=>editPreparedFeature(state,id,{category:'standard'}));
 assert.throws(()=>editPreparedFeature(state,id,{description:'x'.repeat(20001)}));
});

// Separate integration risks: the E6 explicit-loss path and the generator's
// accepted/checkpoint boundary. Detached ledger tests cannot cover either.
test('PF2 actual water loss preview requires explicit consent and restores exact data with Undo/Redo',async()=>{
 const h=createGenerationHarness(0),d=regionFixture();d.generation=createGenerationState(0);d.map.regions[0].centerHex={q:1,r:0};d.map.regions[0].anchorHex={q:2,r:0};
 h.injectFunction('readTextFile',async f=>f.text);h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});await h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:''}});
 h.render().choosePF2Profile(true);assert.equal(h.render().fillPF2(),true);
 const stable=()=>clone(h.render().captureDocument()),before=stable(),f=Object.values(before.map.featurePreparation.features).find(f=>f.unitKey==='0,0');assert.ok(f);
 h.render().setEditMode(true);assert.equal(h.render().startWaterDraft('lake','0,0'),true);assert.equal(h.render().finishWaterDraft(),false);
 let a=h.render();assert.ok(a.waterPreview.plan,a.waterPreview.error);const loss=a.waterPreview.plan.losses.find(l=>l.type==='pf2');assert.equal(loss.value.id,f.id);assert.equal(loss.value.template.title.ru,f.template.title.ru);assert.deepEqual(stable(),before);
 a.changeWaterDraft(a.waterDraft,{options:{acceptedLosses:[]},preview:true});assert.equal(h.render().finishWaterDraft(h.render().waterDraft,true),false);assert.deepEqual(stable(),before);
 a=h.render();a.changeWaterDraft(a.waterDraft,{options:{acceptedLosses:a.waterPreview.plan.losses.map(l=>l.id)},preview:true});assert.equal(h.render().finishWaterDraft(h.render().waterDraft,true),true);
 const after=stable();assert.equal(after.map.featurePreparation.features[f.id],undefined);assert.equal(after.map.featurePreparation.units[f.unitKey].disposition,'removed');assert.equal(after.map.featurePreparation.nextFeatureId,before.map.featurePreparation.nextFeatureId);
 h.render().undoMap();assert.deepEqual(stable(),before);h.render().redoMap();assert.deepEqual(stable(),after);
});

test('PF2 actual automatic continuation and checkpoint consent preserve survivors, IDs, streams and history',()=>{
 const h=createGenerationHarness(0),control=createGenerationHarness(0),opts={targetSize:60,landType:'wild',biomeId:'open_plains',coastalPreference:'mainland'};
 h.render().choosePF2Profile(true);h.render().safelyAddRegionToMap({q:0,r:0},opts);control.render().safelyAddRegionToMap({q:0,r:0},opts);
 const stable=()=>clone(h.render().captureDocument()),first=stable(),plain=clone(control.render().captureDocument());assert.ok(first.map.featurePreparation);assert.ok(Object.keys(first.map.featurePreparation.features).length);assert.deepEqual(first.map.regions,plain.map.regions);assert.deepEqual(first.map.generation,plain.map.generation);
 const anchor=first.map.candidateHexes[0];h.render().safelyAddRegionToMap(anchor,opts);const expanded=stable();assert.equal(expanded.map.regions.length,2);
 for(const [id,f]of Object.entries(first.map.featurePreparation.features))assert.deepEqual(expanded.map.featurePreparation.features[id],f);
 const losses=featureLossesForMap(expanded.map.featurePreparation,first.map);assert.ok(losses.length);
 const prompts=[];h.setWindow({confirm:m=>{prompts.push(m);return false;},matchMedia:()=>({matches:false})});h.render().deleteLastRegion();assert.deepEqual(stable(),expanded);assert.ok(prompts.some(m=>m.includes('PF2')));
 h.render().regenerateLastRegion();assert.deepEqual(stable(),expanded);assert.equal(h.render().pendingRegen,null);
 h.setWindow({confirm:()=>true,matchMedia:()=>({matches:false})});h.render().deleteLastRegion();const deleted=stable();assert.deepEqual(deleted.map.regions,first.map.regions);assert.equal(deleted.map.featurePreparation.nextFeatureId,expanded.map.featurePreparation.nextFeatureId);
 for(const f of losses)assert.equal(deleted.map.featurePreparation.units[f.unitKey].disposition,'removed');
 for(const[id,f]of Object.entries(first.map.featurePreparation.features))assert.deepEqual(deleted.map.featurePreparation.features[id],f);
 h.render().undoMap();assert.deepEqual(stable(),expanded);h.render().redoMap();assert.deepEqual(stable(),deleted);
});
