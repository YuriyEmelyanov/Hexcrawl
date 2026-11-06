import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {entityNameFixture} from './helpers/entity-name-fixture.mjs';
const serial=x=>JSON.parse(JSON.stringify(x));
const save=h=>{const d=serial(h.render().createSaveData());delete d.savedAt;return d;};
const stacks=h=>serial([h.render().undoHistory,h.render().redoHistory]);
async function setup(d){
 const h=createGenerationHarness(42);h.render();h.guardRandom();
 h.setWindow({alert:m=>{throw Error(m);},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:''}});h.render();h.render().setEditMode(true);h.render();return h;
}
function name(h,key,ru='Старое имя',en='Old name'){
 h.render().showNameTarget(key);assert.ok(h.render().nameDraft,`live ${key}`);
 h.render().changeNameDraft(ru,h.render().nameDraft);h.render().changeOtherNameDraft(en,h.render().nameDraft);
 assert.equal(h.render().saveNameDraft(),true);h.render();
}
// Each parameter has a distinct address/geometry/visibility risk. Existing POI
// pair-validation tests own duplicate,half-pair,locale and stale-draft behaviour.
for(const type of ['road','obstacle','crossing','rapid','waterfall','sea'])test(`E8.2 ${type} uses one stable paired name with exact history,reload and real continuation`,async()=>{
 const {data,key}=entityNameFixture(type),h=await setup(data),before=save(h),history=stacks(h);
 name(h,key);const after=save(h);assert.deepEqual(after.map.editorNames,{[key]:{ru:'Старое имя',en:'Old name'}});
 assert.equal(h.render().undoHistory.length,history[0].length+1);assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.counters,before.counters);
 for(const k of ['regions','rivers','roads','crossings','obstacles','riverFeatures','tags','gmNotesByHexKey'])assert.deepEqual(after.map[k],before.map[k]);
 assert.ok(h.render().nameTargetHex(key));assert.equal(h.render().selectNameTarget(key),true);
 h.render().undoMap();assert.deepEqual(save(h),before);h.render().redoMap();assert.deepEqual(save(h),after);
 const g=await setup(after);assert.deepEqual(save(g),after);
 // Ordinary generation is permitted if physical identity survives; otherwise the
 // complete accepted document is restored with the named refusal,not pruned.
 for(const app of [h,g]){const prev=save(app);app.render().safelyAddRegionToMap(app.render().candidateHexes[0],{coastalPreference:'mainland',targetSize:1});const next=save(app);assert.deepEqual(next.map.editorNames,after.map.editorNames);assert.equal(app.render().generationError,null);assert.equal(next.map.regions.length,prev.map.regions.length+1,'names must not block ordinary continuation');}
 assert.deepEqual(save(h),save(g));
});

test('E8.2 path and opaque crossing names survive kind edits and confirmed removal is one transaction',async()=>{
 const {data}=entityNameFixture();data.map.regions[0].hexes=JSON.parse(fs.readFileSync(new URL('fixtures/e6-water-editor.json',import.meta.url),'utf8')).map.regions[0].hexes;data.map.regions[0].finalSize=data.map.regions[0].hexes.length;const h=await setup(data),crossing=data.map.crossings[0];
 name(h,'road:1','Старый тракт','Old road');name(h,`crossing:${crossing.key}`,'Старый мост','Old bridge');
 const named=save(h);assert.equal(h.render().editRoadDocument({type:'kind',roadId:1,segmentKey:crossing.roadSegmentKey,kind:'trail'}),true);
 assert.deepEqual(save(h).map.editorNames,named.map.editorNames);
 assert.equal(h.render().editRoadDocument({type:'crossing',roadId:1,segmentKey:crossing.roadSegmentKey,riverId:1,kind:'bridge'}),true);
 const before=save(h),history=stacks(h);
 assert.equal(h.render().editRoadDocument({type:'remove',roadId:1}),false);assert.match(h.render().editError,/Старый/);assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 h.render().requestRoadRemoval(1);h.render();assert.equal(h.render().confirmNamedRoadRemoval(),true);
 const after=save(h);assert.deepEqual(after.map.editorNames,{});assert.equal(after.map.roads.length,0);assert.equal(after.map.crossings.length,0);assert.equal(h.render().undoHistory.length,history[0].length+1);
 h.render().undoMap();assert.deepEqual(save(h),before);h.render().redoMap();assert.deepEqual(save(h),after);
});

test('E8.2 obstacle named deletion cancellation is inert and acceptance restores object+name together',async()=>{
 const {data,key}=entityNameFixture('obstacle'),h=await setup(data);name(h,key,'Каменный вал','Stone wall');const before=save(h),history=stacks(h);
 const o=before.map.obstacles[0];assert.equal(h.render().editObstacleDocument({type:'move',id:1,hex:o.neighborHex,neighborHex:o.hex}),true);assert.deepEqual(save(h).map.editorNames,before.map.editorNames);
 const moved=save(h),movedHistory=stacks(h);let prompt='';h.setWindow({confirm:m=>{prompt=m;return false;}});
 assert.equal(h.render().editObstacleDocument({type:'remove',id:1}),false);assert.match(prompt,/Каменный вал/);assert.deepEqual(save(h),moved);assert.deepEqual(stacks(h),movedHistory);
 h.setWindow({confirm:()=>true});assert.equal(h.render().editObstacleDocument({type:'remove',id:1}),true);const after=save(h);assert.deepEqual(after.map.editorNames,{});assert.deepEqual(after.map.obstacles,[]);
 h.render().undoMap();assert.deepEqual(save(h),moved);h.render().redoMap();assert.deepEqual(save(h),after);assert.equal(h.render().undoHistory.length,movedHistory[0].length+1);
});

test('E8.2 visible feature Off refuses with its authored name; clearing enables the original feature command',async()=>{
 for(const type of ['rapid','waterfall']){
  const {data,key}=entityNameFixture(type),h=await setup(data);name(h,key,'Именная отметка','Named feature');const before=save(h),history=stacks(h);
  const edit=type==='rapid'?{type,riverId:1,edgeKey:data.map.riverFeatures.rapids[0].edgeKey,state:'off'}:{type,vertexKey:data.map.riverFeatures.waterfalls[0].vertexKey,state:'off'};
  assert.equal(h.render().editRiverFeatures([edit]),false);assert.match(h.render().editError,/Именная отметка/);assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
  name(h,key,'','');assert.equal(h.render().editRiverFeatures([edit]),true);assert.equal(h.render().nameTargets.some(t=>t.key===key),false);
 }
});

test('E8.2 import rejects orphan/hidden/composite mistargets atomically and shared waterfall is a single name',async()=>{
 const {data,key}=entityNameFixture('waterfall');data.map.editorNames={[key]:{en:'Shared fall',ru:'Общий водопад'}};
 const duplicate=structuredClone(data.map.rivers[0]);duplicate.id=2;duplicate.sectors.forEach(s=>{s.riverId=2;s.id+='b';});data.map.rivers.push(duplicate);data.counters.nextRiverId=3;
 const h=await setup(data);assert.equal(h.render().nameTargets.filter(t=>t.key===key).length,1);assert.equal(save(h).map.editorNames[key].en,'Shared fall');
 const before=save(h),history=stacks(h),alerts=[];h.setWindow({alert:m=>alerts.push(m)});
 for(const change of [d=>d.map.editorNames['road:999']={ru:'Нет пути',en:'No path'},d=>d.map.riverFeatures.waterfalls[0].state='off',d=>{d.map.editorNames['crossing:1']={ru:'Неверный адрес',en:'Wrong address'};},d=>{d.map.editorNames['rapid:1:wrong:edge']={ru:'Нет порога',en:'No rapid'};}]){
  const bad=structuredClone(data);change(bad);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(bad)}],value:'x'}});h.render();assert.match(alerts.pop(),/map.editorNames/);assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 }
});
