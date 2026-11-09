import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {regionFixture} from './helpers/region-fixture.mjs';
import {seaFixture} from './helpers/sea-fixture.mjs';
import {newKnaveLayer} from '../src/knaveClassic.ts';
import {knaveContentFixture} from './helpers/knave-fixture.mjs';

const importMap=async data=>{const h=createGenerationHarness(42),alerts=[];h.render();h.setWindow({alert:s=>alerts.push(s),confirm:()=>true});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});assert.deepEqual(alerts,[]);return h;};
const state=p=>({schema:'hexcrawl.detail1',version:1,active:true,viewStep:1,grid:p.grid,source:p.source,poiIdentities:p.poiIdentities,poiFootprints:p.poiFootprints});
const validate=(h,map,p)=>h.geometry.validateDetailMapFootprints(map,state(p));
const prepare=h=>h.geometry.prepareDetailMapPreview(h.render().captureDocument().map);
// DTL-05/06/14/15/19/23: test the actual App adapter, not a second idealized map.
test('live DETAIL1 preview projects actual capital/Seat and every assigned road without changing the document or RNG',async()=>{
 for(const mode of ['classic','mythic']){
  const data=regionFixture(mode),r=data.map.regions[0];r.centerHex={q:2,r:0};r.suppressCentralPoi=false;r.centralPoiKind=mode==='classic'?'capital':'throne';r.pointsOfInterest=[];r.pointOfInterestKinds={};
  data.map.roads=[{id:1,regionId:1,segments:[{from:{q:1,r:0},to:{q:2,r:0},kind:'road'}]},{id:2,regionId:1,segments:[{from:{q:2,r:0},to:{q:3,r:0},kind:'trail'}]}];data.counters.nextRoadId=3;
  const h=await importMap(data),before=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]);h.guardRandom();
  const preview=prepare(h),poi=preview.poiFootprints[0];
  assert.doesNotThrow(()=>validate(h,before.map,preview));
  for(const change of [p=>p.poiFootprints.pop(),p=>p.poiFootprints[0].cells=[{q:99,r:99}],p=>p.poiFootprints[0].attachments.pop(),p=>p.poiFootprints[0].attachments[0].entry={x:900,y:900},p=>p.poiFootprints[0].poiId='detail-poi:999']){const bad=structuredClone(preview);change(bad);assert.throws(()=>validate(h,before.map,bad));}
  assert.equal(preview.activatesDetail1,false);assert.equal(preview.source.physicalConvention,'unknown');assert.equal(preview.poiFootprints.length,1);
  assert.equal(poi.cells.length,mode==='classic'?2:1);assert.equal(poi.poiId,preview.poiIdentities.byLegacyRef['poi:1:2,0']);
  assert.deepEqual(structuredClone(poi.attachments.filter(a=>a.kind==='route').map(a=>a.routeId)),['road:1','road:2']);
  assert.ok(poi.cells.every(c=>Math.abs(c.q-12)<=1&&Math.abs(c.r)<=1),'six-mile world coordinate, independent of screen pixels');
  assert.deepEqual(structuredClone(prepare(h)),structuredClone(preview));assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);
 }
});
// DTL-11/12/13: exact source policy/geometry, never names or a neighboring lake.
test('live DETAIL1 preview retains actual sea/river identities and source requirements, refusing missing mandatory water atomically',async()=>{
 const sea=seaFixture();sea.map.waterPoiByHexKey={'1,2':'shipwreck'};
 const water=await importMap(sea),wp=prepare(water).poiFootprints.find(p=>p.legacyRef==='waterPoi:1,2');
 assert.equal(wp.attachments[0].waterId,'sea:7');assert.equal(wp.attachments[0].waterKind,'water');assert.match(wp.attachments[0].segmentId,/^cell:1,2$/);
 const raw=regionFixture('classic',{river:true});raw.version=10;raw.map.seas=[];raw.map.nextSeaId=1;raw.map.knave={...newKnaveLayer(),content:knaveContentFixture('poi:1:2,0')};
 // Select the accepted source row whose policy requires river_contact. Its text is deliberately unrelated.
 const policy=(await import('../src/tags/knavePolicy.json',{with:{type:'json'}})).default;
 const row=policy.rows.find(r=>r.status==='eligible'&&r.requiresAll?.includes('river_contact'));assert.ok(row);
 const entry=raw.map.knave.content.byPoi['poi:1:2,0'];entry.category=row.table==='structures'?'structure':row.table==='dungeons'?'dungeon':'natural';entry.site={selection:'compatible_pool',table:row.table,sourceRow:row.sourceRow,ru:'Авторский текст без названия воды',references:[],representation:row.poiKind};raw.map.regions[0].pointOfInterestKinds['2,0']=row.poiKind;
 const h=await importMap(raw),before=structuredClone(h.render().captureDocument()),preview=prepare(h),p=preview.poiFootprints[0];
 assert.doesNotThrow(()=>validate(h,before.map,preview));
 for(const change of [p=>p.poiFootprints[0].attachments=[],p=>p.poiFootprints[0].attachments[0].waterId='lake:999',p=>p.poiFootprints[0].attachments[0].segmentId='fake',p=>p.poiFootprints[0].attachments[0].contact={x:12,y:0}]){const bad=structuredClone(preview);change(bad);assert.throws(()=>validate(h,before.map,bad));}
 assert.equal(preview.waterRequirementsByPoi[p.poiId].provenance,'knave_source_row');assert.equal(p.attachments[0].waterId,'river:5');assert.equal(p.attachments[0].waterKind,'river');assert.match(p.attachments[0].segmentId,/\|/);
 // A real shore uses the same sea registry, without manufacturing a river.
 const shore=seaFixture();shore.version=10;shore.map.regions[0].pointsOfInterest=[{q:1,r:1}];shore.map.regions[0].pointOfInterestKinds={'1,1':'structure'};
 shore.map.knave={...newKnaveLayer(),content:knaveContentFixture('poi:1:1,1')};
 const shoreRow=policy.rows.find(r=>r.table==='structures'&&r.status==='eligible'&&r.requiresAll?.includes('water_contact'));
 const setRow=(data,alias,row)=>{const e=data.map.knave.content.byPoi[alias];e.category=row.table==='structures'?'structure':row.table==='dungeons'?'dungeon':'natural';e.site={selection:'compatible_pool',table:row.table,sourceRow:row.sourceRow,ru:'Нейтральный принятый текст',references:[],representation:row.poiKind};};
 setRow(shore,'poi:1:1,1',shoreRow);const sh=await importMap(shore),sp=prepare(sh).poiFootprints[0];assert.equal(sp.attachments[0].waterId,'sea:7');assert.equal(sp.attachments[0].waterKind,'shore');assert.match(sp.attachments[0].segmentId,/^shore:1,1\|/);
 // Crossing is a point on the real assigned road and matching river edge,
 // not any point along the same river. F>=3 never accepts a ford.
 const cross=structuredClone(raw),edge=cross.map.rivers[0].sectors[0].edgeKeys[0];
 cross.map.roads=[{id:1,regionId:1,segments:[{from:{q:2,r:0},to:{q:3,r:0},kind:'road'}]}];cross.counters.nextRoadId=2;
 cross.map.crossings=[{key:'1:2,0|3,0:5',roadId:1,roadSegmentKey:'2,0|3,0',riverId:5,riverEdgeKey:edge,kind:'ford'}];
 const ford=policy.rows.find(r=>r.status==='eligible'&&r.requiresAll?.includes('crossing_ford'));setRow(cross,'poi:1:2,0',ford);cross.map.regions[0].pointOfInterestKinds['2,0']=ford.poiKind;
 const ch=await importMap(cross),cp=prepare(ch).poiFootprints[0],contact=cp.attachments.find(a=>a.kind==='water');assert.equal(contact.waterKind,'crossing');assert.ok(Math.abs(contact.contact.x-15)<1e-10);assert.ok(Math.abs(contact.contact.y)<1e-10);assert.ok(cp.attachments.find(a=>a.kind==='route').accessNodeId.startsWith('port:'));
 assert.doesNotThrow(()=>validate(ch,ch.render().captureDocument().map,prepare(ch)));
 const movedCrossing=structuredClone(ch.render().captureDocument().map);movedCrossing.crossings[0].key='replacement-crossing';assert.throws(()=>validate(ch,movedCrossing,prepare(ch)),/invalid_live_water_attachment/);
 const deep=structuredClone(ch.render().captureDocument().map);deep.rivers[0].sectors[0].fullness=3;assert.throws(()=>ch.geometry.prepareDetailMapPreview(deep),/incompatible_crossing_geometry/);
 const legacy=structuredClone(before.map);delete legacy.knave;legacy.editorNames['poi:1:2,0']={ru:'Мельница на водопаде',en:'Waterfall mill'};const unknown=h.geometry.prepareDetailMapPreview(legacy);assert.equal(unknown.waterRequirementsByPoi[unknown.poiFootprints[0].poiId].provenance,'unknown');assert.equal(unknown.poiFootprints[0].attachments.length,0,'a name does not establish a mandatory source profile');
 const map=structuredClone(before.map);map.rivers=[];map.toponyms={};assert.throws(()=>h.geometry.prepareDetailMapPreview(map),/missing_compatible_water_access/);assert.deepEqual(structuredClone(h.render().captureDocument()),before);
});
