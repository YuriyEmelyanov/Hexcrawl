import {prepareDetailFootprintExtentEdit} from '../src/detailGeography.ts';
import {detailCellPolygon,createDetailGrid} from '../src/detailGrid.ts';
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
  const manual=structuredClone(preview);manual.poiFootprints[0].extent={kind:'manual',basis:'conditional',note:'Явный условный охват'};manual.poiFootprints[0].cells=[...poi.cells,{q:12,r:1}];
  assert.doesNotThrow(()=>validate(h,before.map,manual));
  const original=state(preview),rivers=h.geometry.detailMapRiverGeometry(before.map,preview.grid.origin),copy=structuredClone(original);
  const changed=prepareDetailFootprintExtentEdit(before.map,rivers,original,poi.poiId,manual.poiFootprints[0].extent,manual.poiFootprints[0].cells);assert.deepEqual(structuredClone(original),copy);assert.equal(changed.poiFootprints[0].poiId,poi.poiId);assert.ok(Object.isFrozen(changed));
  assert.throws(()=>prepareDetailFootprintExtentEdit(before.map,rivers,original,poi.poiId,manual.poiFootprints[0].extent,[{q:999,r:999}]));assert.deepEqual(structuredClone(original),copy);
  const measured=structuredClone(preview);measured.poiFootprints[0].extent={kind:'measured_polygon',sourceId:'survey:1',unit:'mile',method:'positive_area_intersection',sourcePolygon:detailCellPolygon(createDetailGrid(1),{q:12,r:0})};measured.poiFootprints[0].cells=[{q:12,r:0}];assert.doesNotThrow(()=>validate(h,before.map,measured));
  for(const change of [p=>p.poiFootprints[0].cells.push({q:13,r:0}),p=>p.poiFootprints[0].extent.sourcePolygon=[{x:11,y:0},{x:13,y:2},{x:11,y:2},{x:13,y:0},{x:14,y:0}]]){const bad=structuredClone(measured);change(bad);assert.throws(()=>validate(h,before.map,bad));}
  if(mode==='classic'){const tooSmall=structuredClone(manual);tooSmall.poiFootprints[0].cells=[{q:12,r:0}];tooSmall.poiFootprints[0].extent.basis='measured_override';assert.throws(()=>validate(h,before.map,tooSmall),/capital_manual_needs_two_cells/);}
  const outside=structuredClone(manual);outside.poiFootprints[0].cells=[{q:900,r:0}];assert.throws(()=>validate(h,before.map,outside));
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

// DTL-08/22/23: detached validation cannot prove controller history or stale-command refusal.
test('actual DETAIL1 extent command records one exact undo/redo transaction and refuses invalid or stale commands atomically',async()=>{
 const h=await importMap(regionFixture()),doc=structuredClone(h.render().captureDocument()),preview=prepare(h);doc.map.physicalGrid=state(preview);
 h.render().applyDocument(doc);h.render().setEditMode(true);h.render();h.guardRandom();
 const before=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]),poi=preview.poiFootprints[0],cell=poi.cells[0],cells=[cell,{q:cell.q,r:cell.r+1}],extent={kind:'manual',basis:'conditional',note:'Явный охват мастера'};
 const oldCommand=h.render().editDetailFootprintExtent;
 assert.equal(oldCommand(poi.poiId,extent,cells),true);const after=structuredClone(h.render().captureDocument());
 assert.equal(h.render().undoHistory.length,stacks[0].length+1);assert.equal(h.render().redoHistory.length,0);assert.deepEqual(after.map.generation,before.map.generation);assert.equal(after.map.physicalGrid.poiFootprints[0].poiId,poi.poiId);
 const withoutGrid=d=>{const c=structuredClone(d);delete c.map.physicalGrid;return c;};assert.deepEqual(withoutGrid(after),withoutGrid(before));
 assert.equal(h.render().editDetailFootprintExtent(poi.poiId,extent,cells),true);assert.equal(h.render().undoHistory.length,stacks[0].length+1,'no-op does not add history');
 const saved=structuredClone(h.render().captureDocument()),history=structuredClone([h.render().undoHistory,h.render().redoHistory]);
 assert.equal(oldCommand(poi.poiId,extent,[cell]),false,'consumed command cannot mutate a newer document');
 assert.equal(h.render().editDetailFootprintExtent(poi.poiId,extent,[{q:999,r:999}]),false);
 assert.deepEqual(structuredClone(h.render().captureDocument()),saved);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),history);
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),after);
 const reordered=structuredClone(after);const grid=reordered.map.physicalGrid;reordered.map.physicalGrid={poiFootprints:grid.poiFootprints,poiIdentities:grid.poiIdentities,source:grid.source,grid:grid.grid,viewStep:grid.viewStep,active:grid.active,version:grid.version,schema:grid.schema};h.render().applyDocument(reordered);h.render();const count=h.render().undoHistory.length;assert.equal(h.render().editDetailFootprintExtent(poi.poiId,extent,cells),true);assert.equal(h.render().undoHistory.length,count,'field order does not turn a semantic no-op into a transaction');
 // The ordinary serialized boundary now validates the actual geography too.
 assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(h.render().createSaveData()));
});

// DTL-09/21/23: registry-only tests cannot prove accepted spatial state survives
// real map edits, owner transfer and document history. Reuse the authored E7 map.
test('active DETAIL1 lifecycle preserves manual extents through E7 and allocates/removes POIs without recycling IDs',async()=>{
 const h=await importMap(regionFixture()),doc=structuredClone(h.render().captureDocument()),p=prepare(h);doc.map.physicalGrid=state(p);h.render().applyDocument(doc);h.render().setEditMode(true);h.render();h.guardRandom();
 const footprint=p.poiFootprints[0],cell=footprint.cells[0];assert.equal(h.render().editDetailFootprintExtent(footprint.poiId,{kind:'manual',basis:'conditional',note:'Принятый охват'},[cell,{q:cell.q,r:cell.r+1}]),true);
 const before=structuredClone(h.render().captureDocument()),history=h.render().undoHistory.length;
 assert.equal(h.render().startRegionDraft('transfer_hex'),true);let draft=h.render().regionDraft;assert.equal(h.render().changeRegionDraft(draft,{...draft.edit,toRegionId:2}),true);assert.equal(h.render().finishRegionDraft(h.render().regionDraft),true,h.render().editError);
 const after=structuredClone(h.render().captureDocument()),next=after.map.physicalGrid.poiFootprints[0];assert.deepEqual(next,{...before.map.physicalGrid.poiFootprints[0],legacyRef:'poi:2:2,0'});assert.equal(after.map.physicalGrid.poiIdentities.nextId,before.map.physicalGrid.poiIdentities.nextId);assert.equal(h.render().undoHistory.length,history+1);assert.deepEqual(after.map.generation,before.map.generation);
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),after);
 h.render().setSelectedPoiKind('structure');h.render();assert.deepEqual(structuredClone(h.render().captureDocument().map.physicalGrid.poiFootprints[0]),next,'compatible type edit retains the explicit extent');
 h.render().deleteSelectedPoi();h.render();assert.equal(h.render().captureDocument().map.physicalGrid.poiFootprints.length,0);h.render().setSelectedPoiKind('village');h.render();const reborn=h.render().captureDocument().map.physicalGrid;assert.equal(reborn.poiFootprints.length,1);assert.notEqual(reborn.poiFootprints[0].poiId,footprint.poiId);assert.equal(reborn.poiIdentities.nextId,before.map.physicalGrid.poiIdentities.nextId+1);
});

// DTL-11/19/23: a real route/water edit must validate the OLD exact attachment,
// rather than recomputing a convenient replacement in the candidate geography.
test('active DETAIL1 route and water mutations retain exact attachments or refuse both histories atomically',async()=>{
 const raw=regionFixture();raw.map.roads=[{id:1,regionId:1,segments:[{from:{q:2,r:0},to:{q:3,r:0},kind:'road'}]}];raw.counters.nextRoadId=2;
 const h=await importMap(raw),doc=structuredClone(h.render().captureDocument());doc.map.physicalGrid=state(prepare(h));h.render().applyDocument(doc);h.render().setEditMode(true);h.render();h.guardRandom();
 const before=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]);
 assert.equal(h.render().editRoadDocument({type:'kind',roadId:1,segmentKey:'2,0|3,0',kind:'trail'}),false);assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.render().setSelectedHexBiomeOverride('open_hills');h.render();assert.equal(h.render().captureDocument().map.biomeOverrideByHexKey.get('2,0'),'open_hills');assert.deepEqual(structuredClone(h.render().captureDocument().map.physicalGrid),before.map.physicalGrid);
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);
 const sea=seaFixture();sea.map.waterPoiByHexKey={'1,2':'shipwreck'};const w=await importMap(sea),waterDoc=structuredClone(w.render().captureDocument());waterDoc.map.physicalGrid=state(prepare(w));w.render().applyDocument(waterDoc);w.render().setEditMode(true);w.render().setSelectedHex({q:1,r:2});w.render();w.guardRandom();
 const accepted=structuredClone(w.render().captureDocument()),waterStacks=structuredClone([w.render().undoHistory,w.render().redoHistory]);
 assert.equal(w.render().startWaterDraft('land','1,2'),true);const d=w.render().waterDraft;w.render().finishWaterDraft(d,true);w.render();assert.deepEqual(structuredClone(w.render().captureDocument()),accepted);assert.deepEqual(structuredClone([w.render().undoHistory,w.render().redoHistory]),waterStacks);
 // Reuse the live water/history case for SEA02 identity merges: contacts and
 // extents stay literal, only an explicitly resolved component ID may change.
 const joining=seaFixture('classic',true);joining.map.waterPoiByHexKey={'1,2':'shipwreck','-3,3':'rocks'};
 const j=await importMap(joining),jd=structuredClone(j.render().captureDocument());jd.map.physicalGrid=state(prepare(j));j.render().applyDocument(jd);j.render();j.guardRandom();
 const jb=structuredClone(j.render().captureDocument()),candidate=structuredClone(jb.map);candidate.hexTerrainByKey.set('-2,2',{terrainOverride:'sea'});
 const joined=j.render().recordGenerated(jb.map,candidate,{q:1,r:2},j.render().captureGenerationBackup());
 assert.equal(joined.seas.length,1);assert.equal(joined.seas[0].id,7);
 assert.deepEqual(structuredClone(joined.physicalGrid.poiFootprints),jb.map.physicalGrid.poiFootprints.map(p=>({...p,attachments:p.attachments.map(ref=>ref.kind==='water'?{...ref,waterId:'sea:7'}:ref)})));
 j.geometry.validateDetailMapFootprints(joined,joined.physicalGrid);j.render().applyDocument(j.render().undoHistory.at(-1).after);j.render();
 const ja=structuredClone(j.render().captureDocument());j.render().undoMap();assert.deepEqual(structuredClone(j.render().captureDocument()),jb);j.render().redoMap();assert.deepEqual(structuredClone(j.render().captureDocument()),ja);
});

// DTL-21/23: E7 address remapping is not proof of physical E8 relocation.
test('active DETAIL1 E8 relocates an assumed unattached site once and refuses translating accepted explicit extents',async()=>{
 const h=await importMap(regionFixture()),doc=structuredClone(h.render().captureDocument());doc.map.physicalGrid=state(prepare(h));h.render().applyDocument(doc);h.render().setEditMode(true);h.render();h.guardRandom();
 const before=structuredClone(h.render().captureDocument()),old=before.map.physicalGrid.poiFootprints[0],history=h.render().undoHistory.length;
 assert.equal(h.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'}),true);h.render().changePoiTarget('3','0');assert.equal(h.render().finishPoiDraft(),true,h.render().editError);
 const after=structuredClone(h.render().captureDocument()),moved=after.map.physicalGrid.poiFootprints[0];assert.equal(moved.poiId,old.poiId);assert.equal(moved.legacyRef,'poi:2:3,0');assert.notDeepEqual(moved.cells,old.cells);assert.equal(h.render().undoHistory.length,history+1);assert.deepEqual(after.map.generation,before.map.generation);
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),after);
 assert.equal(h.render().editDetailFootprintExtent(moved.poiId,{kind:'manual',basis:'conditional',note:'Измерений нет; принята форма'},moved.cells),true);
 const accepted=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]);assert.equal(h.render().startPoiDraft({kind:'land',regionId:2,hexKey:'3,0'}),true);h.render().changePoiTarget('2','0');assert.equal(h.render().finishPoiDraft(),false);assert.match(h.render().editError,/охват|footprint/i);assert.deepEqual(structuredClone(h.render().captureDocument()),accepted);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);
});

// DTL-07/09/23: new accepted Knave rows must be known BEFORE spatial placement;
// old manually expanded footprints and accepted content must never be rebuilt.
test('active DETAIL1 generated candidate places only new owners after accepted Knave content and refuses invalid candidates before history',async()=>{
 const {knaveCatalogFixture}=await import('./helpers/knave-fixture.mjs');
 const raw=regionFixture();raw.version=10;raw.map.seas=[];raw.map.nextSeaId=1;raw.map.knave={...newKnaveLayer(),content:knaveContentFixture('poi:1:2,0',{kind:'settlement'})};
 const h=await importMap(raw);h.injectFunction('knaveGenerationCatalog',knaveCatalogFixture);const doc=structuredClone(h.render().captureDocument());doc.map.physicalGrid=state(prepare(h));h.render().applyDocument(doc);h.render().setEditMode(true);h.render();h.guardRandom();
 const p=doc.map.physicalGrid.poiFootprints[0],c=p.cells[0];assert.equal(h.render().editDetailFootprintExtent(p.poiId,{kind:'manual',basis:'conditional',note:'Сохранённая форма'},[c,{q:c.q,r:c.r+1}]),true);
 const before=structuredClone(h.render().captureDocument()),history=structuredClone([h.render().undoHistory,h.render().redoHistory]),candidate=structuredClone(before.map);candidate.regions[1].pointsOfInterest=[{q:3,r:1}];candidate.regions[1].pointOfInterestKinds={'3,1':'structure'};
 const result=h.render().recordGenerated(before.map,candidate,{q:3,r:1});assert.equal(result.physicalGrid.poiFootprints.length,2);assert.deepEqual(structuredClone(result.physicalGrid.poiFootprints.find(v=>v.poiId===p.poiId)),before.map.physicalGrid.poiFootprints[0]);assert.deepEqual(result.knave.content.byPoi['poi:1:2,0'],before.map.knave.content.byPoi['poi:1:2,0']);assert.ok(result.knave.content.byPoi['poi:2:3,1']);assert.deepEqual(result.generation,before.map.generation);assert.equal(h.render().undoHistory.length,history[0].length+1);h.geometry.validateDetailMapFootprints(result,result.physicalGrid);
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument().map.physicalGrid),structuredClone(result.physicalGrid));
 const withRoad=structuredClone(h.render().captureDocument().map);withRoad.roads.push({id:1,regionId:1,segments:[{from:{q:2,r:0},to:{q:3,r:0},kind:'road'}]});withRoad.nextRoadId=2;
 const connected=h.render().recordGenerated(h.render().captureDocument().map,withRoad,{q:3,r:0});assert.deepEqual(structuredClone(connected.physicalGrid.poiFootprints.find(v=>v.poiId===p.poiId).cells),before.map.physicalGrid.poiFootprints[0].cells);assert.equal(connected.physicalGrid.poiFootprints.find(v=>v.poiId===p.poiId).attachments.filter(a=>a.kind==='route').length,1);h.render().applyDocument({...h.render().captureDocument(),map:connected});h.render();
 // ROAD-02/DTL-14: a generator may merge records, preserving the exact
 // physical segment. Reuse this live-handler case, not a parallel fixture.
 const mergeBefore=structuredClone(h.render().captureDocument()),merged=structuredClone(mergeBefore.map);merged.roads[0].id=2;merged.nextRoadId=3;
 const rebound=h.render().recordGenerated(mergeBefore.map,merged,{q:3,r:0});
 const oldPort=mergeBefore.map.physicalGrid.poiFootprints.find(v=>v.poiId===p.poiId).attachments.find(a=>a.kind==='route');
 const newPort=rebound.physicalGrid.poiFootprints.find(v=>v.poiId===p.poiId).attachments.find(a=>a.kind==='route');
 assert.deepEqual(structuredClone(newPort),{...oldPort,routeId:'road:2'});h.geometry.validateDetailMapFootprints(rebound,rebound.physicalGrid);
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),mergeBefore);h.render().redoMap();
 h.render().applyDocument({...h.render().captureDocument(),map:rebound});h.render();
 const lost=structuredClone(rebound);lost.roads=[];assert.throws(()=>h.render().recordGenerated(rebound,lost,{q:3,r:0}),/DETAIL1/,'missing physical access cannot be silently dropped');
 const saved=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]),bad=structuredClone(saved.map);bad.roads[0].segments[0].kind='trail';
 assert.throws(()=>h.render().recordGenerated(saved.map,bad,{q:3,r:0}),/DETAIL1/);assert.deepEqual(structuredClone(h.render().captureDocument()),saved);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);
});

// DTL-22/23: geometry/controller tests do not prove ordinary file import.
// Reuse authored maps and the real importer; no new harness or random series.
test('ordinary v11 DETAIL1 import roundtrips active extents and refuses corrupt spatial references atomically',async()=>{
 const road=regionFixture();road.map.roads=[{id:1,regionId:1,segments:[{from:{q:2,r:0},to:{q:3,r:0},kind:'road'}]}];road.counters.nextRoadId=2;
 const sea=seaFixture();sea.map.waterPoiByHexKey={'1,2':'shipwreck'};
 const knave=regionFixture();knave.version=10;knave.map.seas=[];knave.map.nextSeaId=1;knave.map.knave={...newKnaveLayer(),content:knaveContentFixture('poi:1:2,0',{kind:'settlement'})};
 for(const raw of [road,regionFixture('mythic'),sea,knave]){
  const source=await importMap(raw),doc=structuredClone(source.render().captureDocument());doc.map.physicalGrid=state(prepare(source));source.render().applyDocument(doc);source.render().setEditMode(true);source.render();
  const poi=doc.map.physicalGrid.poiFootprints[0],extent=raw.ui.generationMode==='mythic'?{kind:'measured_polygon',sourceId:'authored-survey:import',unit:'mile',method:'positive_area_intersection',sourcePolygon:detailCellPolygon(createDetailGrid(1),poi.cells[0])}:{kind:'manual',basis:'conditional',note:'Принятый явный охват'};
  assert.equal(source.render().editDetailFootprintExtent(poi.poiId,extent,poi.cells),true);Object.assign(doc,structuredClone(source.render().captureDocument()));const data=JSON.parse(JSON.stringify(source.render().createSaveData()));
  const target=await importMap(regionFixture()),before=structuredClone(target.render().captureDocument()),count=target.render().undoHistory.length,alerts=[];target.setWindow({alert:s=>alerts.push(s),confirm:()=>true});target.guardRandom();
  const load=async value=>{await target.render().handleImportJson({target:{files:[{text:JSON.stringify(value)}],value:''}});target.render();};
  await load(data);assert.deepEqual(alerts,[],'a valid nonempty layer imports');const after=structuredClone(target.render().captureDocument());assert.deepEqual(after.map.physicalGrid,structuredClone(doc.map.physicalGrid));assert.deepEqual(after.map.generation,doc.map.generation);assert.deepEqual(after.map.knave,doc.map.knave);assert.equal(target.render().undoHistory.length,count+1);
  const exported=JSON.parse(JSON.stringify(target.render().createSaveData()));delete exported.savedAt;delete data.savedAt;assert.deepEqual(exported,data,'exact save roundtrip');
  target.render().undoMap();assert.deepEqual(structuredClone(target.render().captureDocument()),before);target.render().redoMap();assert.deepEqual(structuredClone(target.render().captureDocument()),after);target.render().undoMap();
  const accepted=structuredClone(target.render().captureDocument()),stacks=structuredClone([target.render().undoHistory,target.render().redoHistory]);
  const corruptions=[d=>d.version=12,d=>d.map.physicalGrid.poiFootprints[0].cells=[{q:999,r:999}],d=>d.map.physicalGrid.poiFootprints[0].poiId='detail-poi:999',d=>d.map.physicalGrid.poiFootprints[0].legacyRef='poi:999:0,0',d=>d.map.physicalGrid.poiFootprints[0].cells=[]];
  if(data.map.knave)corruptions.push(d=>d.map.physicalGrid.source.physicalConvention='known_across_flats');
  if(data.map.physicalGrid.poiFootprints[0].attachments.length)corruptions.push(d=>{const a=d.map.physicalGrid.poiFootprints[0].attachments[0];if(a.kind==='water')a.waterId='sea:999';else a.accessNodeId='missing-port';});
  for(const mutate of corruptions){const bad=structuredClone(data);mutate(bad);const old=alerts.length;await load(bad);assert.equal(alerts.length,old+1);assert.deepEqual(structuredClone(target.render().captureDocument()),accepted);assert.deepEqual(structuredClone([target.render().undoHistory,target.render().redoHistory]),stacks);}
  target.render().redoMap();assert.deepEqual(structuredClone(target.render().captureDocument()),after,'preexisting Redo remains executable after bad imports');
 }
});

// DTL-03/23: detached projection/import cannot prove explicit activation history.
test('legacy DETAIL1 preview cancels unchanged and Apply is one guarded exact document transaction',async()=>{
 const h=await importMap(regionFixture());assert.equal(typeof h.render().startDetailAdaptation,'function');h.guardRandom();
 const before=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]);
 assert.equal(h.render().startDetailAdaptation(),true);const draft=h.render().detailAdaptation,oldApply=h.render().applyDetailAdaptation;
 assert.equal(draft.state.source.physicalConvention,'unknown');assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);assert.equal(h.render().createSaveData().map.physicalGrid,undefined);
 for(const key of ['undoMap','redoMap','resetMap','deleteLastRegion']){h.render()[key]();h.render();assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);}
 assert.equal(h.render().cancelDetailAdaptation(draft),true);assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.equal(oldApply(),false);
 assert.equal(h.render().startDetailAdaptation(),true);const current=h.render().detailAdaptation;assert.equal(oldApply(draft),false,'old draft cannot apply a new preview');
 const restore=h.injectFunction('structuredClone',value=>{if(value?.physicalGrid)throw Error('temporary adaptation copy fault');return structuredClone(value);});assert.equal(h.render().applyDetailAdaptation(),false);restore();assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);assert.equal(h.render().detailAdaptation,current);
 assert.equal(h.render().applyDetailAdaptation(),true);const after=structuredClone(h.render().captureDocument());assert.equal(h.render().undoHistory.length,stacks[0].length+1);assert.equal(h.render().redoHistory.length,0);assert.equal(h.render().detailAdaptation,null);assert.deepEqual(after.map.physicalGrid,structuredClone(current.state));const clean=x=>{delete x.map.physicalGrid;return x;};assert.deepEqual(clean(structuredClone(after)),clean(structuredClone(before)));assert.equal(h.render().createSaveData().version,11);assert.equal(h.render().applyDetailAdaptation(current),false);assert.equal(h.render().startDetailAdaptation(),false,'accepted layer is not adapted twice');

 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),after);
 // DTL-20/22/23: the real view controller changes only persisted viewStep.
 const accepted=structuredClone(h.render().captureDocument()),oldView=h.render().setDetailViewStep;
 for(const step of [1,12,24,6]){
   assert.equal(h.render().setDetailViewStep(step),true);
   const viewed=structuredClone(h.render().captureDocument());assert.equal(viewed.map.physicalGrid.viewStep,step);
   const expected=structuredClone(accepted);expected.map.physicalGrid.viewStep=step;assert.deepEqual(viewed,expected);
   h.geometry.assertHexcrawlSaveData(h.render().createSaveData());
 }
 assert.equal(oldView(12),false,'stale view command cannot change a newer document');
 const count=h.render().undoHistory.length;assert.equal(h.render().setDetailViewStep(6),true);assert.equal(h.render().undoHistory.length,count,'same view is a no-op');
 h.render().undoMap();assert.equal(h.render().captureDocument().map.physicalGrid.viewStep,24);h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),accepted);

});

// DTL-09/22/23: activation belongs to the final accepted generation transaction,
// not intermediate Mythic steps or continuation of a legacy imported map.
test('new maps activate DETAIL1 at final generation, preserving legacy continuation and exact undo',async()=>{
 for(const mode of ['classic','mythic']){
  const h=createGenerationHarness(42);h.render();const before=structuredClone(h.render().captureDocument());
  h.render().setGenerationMode(mode);h.render();
  if(mode==='classic')h.render().generateAt({q:0,r:0},{targetSize:12});
  else {h.render().startKingdom({q:0,r:0});for(let i=0;i<200&&h.render().kingdomJob;i++){assert.equal(h.render().captureDocument().map.physicalGrid,undefined,'no provisional kingdom footprint');h.render().advanceKingdom();}}
  assert.equal(h.render().generationError,null);assert.equal(h.render().kingdomJob,null);
  const after=structuredClone(h.render().captureDocument()),grid=after.map.physicalGrid;
  assert.ok(grid?.active,'new map has an active accepted layer');h.geometry.validateDetailMapFootprints(after.map,grid);
  assert.equal(grid.poiFootprints.length,Object.keys(grid.poiIdentities.byLegacyRef).length);
  assert.equal(h.render().undoHistory.length,1);assert.equal(h.render().createSaveData().version,11);
  h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument().map),before.map);
  h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),after);
 }
 const legacy=await importMap(regionFixture()),before=structuredClone(legacy.render().captureDocument());
 legacy.render().recordGenerated(before.map,structuredClone(before.map),{q:2,r:0});
 assert.equal(legacy.render().captureDocument().map.physicalGrid,undefined,'legacy generation does not silently adapt existing map');
});
