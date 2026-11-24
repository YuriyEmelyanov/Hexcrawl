import {summarizeDetailCell,detailSegmentCellIntersection} from '../src/detailSummary.ts';
import {detailCatalogueExtent,detailFootprintPolygons,detailPointInPolygon} from '../src/detailSizes.ts';
import {prepareRefinementShorePath,refinementShoreContains,refinementShoreIntervals} from '../src/geometryRefinementShore.ts';
import {projectGeometryRefinementSource,projectGeometryRefinementEdit} from '../src/geometryRefinementScope.ts';
import {geometryBoundaryHasValidClosure,prepareGeometryRefinementBoundary} from '../src/geometryRefinementBoundary.ts';
import {renderRefinedArtwork,renderRefinedLakeWater,refinementLakeShapes} from './helpers/artwork-renderer.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness,prepareLegacyRefinedSave} from './helpers/generation-harness.mjs';
import {prepareGeometryPlan,parseGeometryRefinement,validateGeometryRefinementSource} from '../src/geometryPlan.ts';
import {parseDetail1StateV11,detailAuthoredState,validateDetail1Document} from '../src/detailModel.ts';
import {composeScopedDetailState} from '../src/geometryRefinementState.ts';
import {projectOneMile} from '../src/oneMile.ts';
import {detailSourcePixelToWorld} from '../src/detailGeography.ts';
import {buildNaturalLakes} from '../src/rendering/lakeGeometry.ts';
import {migrateSeas} from '../src/seaIdentity.ts';
import {normalizeRefinementRiverSource} from '../src/geometryRefinementSource.ts';
import {createDetailGrid,detailCellCenter,worldToDetailCell} from '../src/detailGrid.ts';
import {fineRiverStrokeWidth} from '../src/oneMilePresentation.ts';
import {prepareAutomaticSceneCandidate} from '../src/automaticOneMileScene.ts';
import {prepareRefinementWater,refinementWaterContains} from '../src/geometryRefinementWater.ts';

// Test governance: two logical cases for the new accepted boundary. Existing
// river/mouth/road suites own routing algorithms; saveSafety owns old formats
// and mapTransactions owns handlers/history. Reuse their real source fixture
// once here to exercise complete plan persistence and corrupt-record rejection.
// This guards new cross-phase correspondence and does not add seed sweeps.
let fixture;
async function accepted(){
 if(fixture)return fixture;
 const h=createGenerationHarness(42);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:fs.readFileSync(new URL('fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'map'}});
 const map=h.render().captureDocument().map,origin={x:0,y:0},marks=h.geometry.regionMarkKeys(map),hydrology=h.geometry.buildRegionRiverNetwork(map.rivers,map.rivers,map.regions,map.candidateHexes,map.hexTerrainByKey,true);
 const riverInput={rivers:map.rivers,marks,origin,cells:projectOneMile(h.geometry.oneMileSources(map)).map(c=>c.cell),seed:423493684};
 const widths=new Map([1,2,3,4,5].map(f=>[f,detailSourcePixelToWorld({x:h.geometry.getRiverWidth(h.geometry.getHexWidth(28),f),y:0}).x]));
 const lakeInputs=h.geometry.getLakesForRegions(map.regions,map.hexTerrainByKey).map(l=>({lakeId:l.lakeId,cells:[...l.hexes],colorPath:buildNaturalLakes(l.hexes.map(c=>({...c,...h.geometry.toPixel(c.q,c.r),lakeId:l.lakeId})),28,map.toponymSeed,[])[0].path,colorScale:detailSourcePixelToWorld({x:1,y:0}).x,origin}));
 const input={map,liveRivers:h.geometry.detailMapRiverGeometry(map,origin),marks,origin,landCells:map.regions.flatMap(r=>r.hexes).filter(c=>!['lake','sea'].includes(map.hexTerrainByKey.get(`${c.q},${c.r}`)?.terrainOverride)),riverInput,riverContext:{hydrology,candidates:map.candidateHexes},widths,lakeInputs};
 const before=JSON.stringify(map),result=prepareGeometryPlan(input);assert.equal(result.status,'prepared',JSON.stringify(result));assert.equal(JSON.stringify(map),before);
 fixture={input,result};return fixture;
}
const copy=value=>JSON.parse(JSON.stringify(value));
// F-R08/AC06: a valid imported source must remain accessible when its derived
// scene fails. Existing success/Undo cases cannot detect a cleared error.
for(const locale of ['ru','en'])test(`HX059 ${locale} import keeps a visible preparation error and source map`,async()=>{
 const h=createGenerationHarness(42,'',locale);h.render();h.guardRandom();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 const text=fs.readFileSync(new URL('fixtures/classic-six-regions-seed42.json',import.meta.url),'utf8');
 const load=()=>h.render().handleImportJson({target:{files:[{text}],value:'map'}});
 await load();const source=JSON.stringify(h.render().captureDocument().map),sourceScale=h.render().createSaveData().ui.mapScale;
 assert.equal(h.render().switchFineStep(1),true);
 assert.equal(h.render().createSaveData().ui.mapScale,sourceScale,'automatic display zoom is saved in accepted source coordinates');
 const restore=h.injectFunction('prepareAutomaticOneMileScene',()=>{throw Error('fixture_no_fit detail-poi:7');});
 await load();restore();
 assert.match(h.render().automaticFineError??h.render().editError??'',locale==='ru'?/^1-мильная карта не открылась\./:/^The 1-mile map did not open\./);
 assert.match(h.render().automaticFineError,/№7/);assert.match(h.render().automaticFineError,locale==='ru'?/не найдено допустимое/:/no legal route/);assert.doesNotMatch(h.render().automaticFineError,/fixture_no_fit|detail-poi/);
 assert.equal(h.render().fineDisplay?.viewStep??6,6);
 assert.equal(h.render().createSaveData().ui.mapScale,sourceScale,'failed preparation restores source camera scale');
 assert.equal(JSON.stringify(h.render().captureDocument().map),source);
 assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(h.render().createSaveData()));
 assert.equal(h.render().switchFineStep(1),true);assert.equal(h.render().automaticFineError,null);
 const saved=h.render().createSaveData();await h.render().handleImportJson({target:{files:[{text:JSON.stringify(saved)}],value:'map'}});
 assert.equal(h.render().createSaveData().ui.mapScale,sourceScale,'repeat import does not accumulate a sixfold zoom');
});
// Owner preview exposed a through-lake topology absent from the terminal-lake
// fixture above. One saved world protects the actual App transaction boundary.
test('GEO2 classic seed42 through-lake legacy refinement imports, roundtrips and undoes atomically',async()=>{
 const h=createGenerationHarness(42);h.render();h.guardRandom();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:fs.readFileSync(new URL('fixtures/classic-six-regions-seed42.json',import.meta.url),'utf8')}],value:'map'}});
 // RE-Q01 A / AC05+07: the actual scale handler prepares all layers without
 // accepting the plan. Extend this saved-world witness instead of duplicating
 // the routing suites or counting another seed as functional coverage.
 const source=JSON.stringify(h.render().captureDocument().map),generation=JSON.stringify(h.render().captureDocument().generationHistory),undo=h.render().undoHistory.length;
 assert.equal(h.render().switchFineStep(1),true,h.render().editError);
 const display=h.render().fineDisplay;
 assert.equal(display.geometryRefinement.riverPlan.paths.length,34);
 assert.equal(display.geometryRefinement.roads.crossings.length,2);
 assert.equal(display.viewStep,1);assert.equal(h.render().physicalGrid,undefined);
 assert.equal(JSON.stringify(h.render().captureDocument().map),source);assert.equal(JSON.stringify(h.render().captureDocument().generationHistory),generation);
 assert.equal(h.render().undoHistory.length,undo);
 assert.equal(h.render().switchFineStep(6),true);assert.equal(h.render().switchFineStep(1),true);
 assert.deepEqual(h.render().fineDisplay.geometryRefinement,display.geometryRefinement);
 assert.equal(JSON.stringify(h.render().captureDocument().map),source);assert.equal(h.render().undoHistory.length,undo);
 assert.equal(h.render().switchFineStep(6),true);
 const before=JSON.stringify(h.render().captureDocument());
 const legacy=prepareLegacyRefinedSave(h);
 assert.equal(JSON.stringify(h.render().captureDocument()),before);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(legacy)}],value:'map'}});
 const accepted=h.render().captureDocument(),g=accepted.map.physicalGrid.geometryRefinement;
 assert.equal(g.riverPlan.mouths.length,9);assert.deepEqual(accepted.generation,JSON.parse(before).generation);
 for(const key of ['72.746,-70','24.249,-14']){
  const p=g.riverPlan.ports.find(p=>p.sourceKey===key),lake=g.riverPlan.lakes.find(l=>l.lakeId===1);
  assert.equal(p.location.kind,'vertex');for(const mode of ['tiles','emoji','color'])assert.ok(refinementShoreContains(lake.modes[mode],p.point));
 }
 const saved=h.render().createSaveData();assert.equal(saved.version,16);assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(saved));
 h.render().undoMap();assert.equal(JSON.stringify(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(h.render().captureDocument(),accepted);
 const bad=copy(g);bad.riverPlan.mouths[0].lakeId=999999;assert.throws(()=>parseGeometryRefinement(bad,parseDetail1StateV11));
 const missing=copy(g);missing.riverPlan.mouths=missing.riverPlan.mouths.filter(m=>m.sourceNodeKey!=='72.746,-70');assert.throws(()=>parseGeometryRefinement(missing,parseDetail1StateV11),/missing through-lake mouths/);
 const hidden=copy(missing);hidden.riverPlan.paintWater.capsules=hidden.riverPlan.paintWater.capsules.filter(c=>c.sourceEdgeKey!=='72.746,-70|72.746,-98');assert.throws(()=>parseGeometryRefinement(hidden,parseDetail1StateV11),/paint water source correspondence/);
 // F-R02/07: continue that same real map after accepting refinement. One
 // native generator action adds an ordinary river at a fractional old port.
 // Extend this witness rather than duplicating its map/import/history setup.
 assert.equal(h.render().switchFineStep(6),true);
 h.render().generateAt(h.render().candidateHexes[0]);
 assert.equal(h.render().regions.length,7);assert.equal(h.render().rivers.length,5);
 const grown=h.render().captureDocument().map,retained=grown.physicalGrid.geometryRefinement,beforeView=JSON.stringify(grown),history=h.render().undoHistory.length;
 const input=h.geometry.geometryPlanInput(grown),defaultPlan=prepareGeometryPlan(input);
 assert.equal(defaultPlan.status,'error','ordinary accepted edit still cannot acquire a new scope');
 assert.equal(h.render().switchFineStep(1),true,h.render().automaticFineError);
 const full=h.render().fineDisplay.geometryRefinement;
 assert.equal(full.riverPlan.paths.length,46);assert.equal(retained.riverPlan.paths.length,34);
 for(const path of retained.riverPlan.paths)assert.deepEqual(full.riverPlan.paths.find(p=>p.riverId===path.riverId&&p.sourceEdgeKey===path.sourceEdgeKey),path);
 for(const p of retained.riverPlan.ports){const n=full.riverPlan.ports.find(n=>n.sourceKey===p.sourceKey);assert.deepEqual([n.nodeKey,n.point,n.location],[p.nodeKey,p.point,p.location]);}
 assert.equal(JSON.stringify(h.render().captureDocument().map),beforeView);assert.equal(h.render().undoHistory.length,history);
 const mixedSave=h.render().createSaveData();await h.render().handleImportJson({target:{files:[{text:JSON.stringify(mixedSave)}],value:'x'}});
 assert.deepEqual(h.render().fineDisplay.geometryRefinement.riverPlan.paths,full.riverPlan.paths,'same accepted mixed JSON derives identical full paths');
 assert.deepEqual(h.render().captureDocument().map.physicalGrid.geometryRefinement,retained,'view/import never replace the stored scoped plan');
});
const reverseKeys=value=>Array.isArray(value)?value.map(reverseKeys):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverseKeys(v)])):value;

test('Region split imports physical4 without moving accepted geometry or detaching the authored POI',async()=>{
 const h=createGenerationHarness(42);h.render();h.guardRandom();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});
 h.injectFunction('readTextFile',async f=>f.text);
 const open=text=>h.render().handleImportJson({target:{files:[{text}],value:'map'}});
 await open(fs.readFileSync(new URL('fixtures/classic-six-regions-seed42.json',import.meta.url),'utf8'));
 const doc=h.render().captureDocument(), first=doc.map.regions[0], island={q:12,r:0};
 const islandEnd={q:13,r:0},roadId=doc.map.nextRoadId;
 const oldAlias=`poi:${first.id}:12,0`;
 const map={...doc.map,
  regions:[{...first,hexes:[...first.hexes,island,islandEnd],finalSize:first.finalSize+2,
   pointsOfInterest:[...first.pointsOfInterest,island],pointOfInterestKinds:{...first.pointOfInterestKinds,'12,0':'statue'}},...doc.map.regions.slice(1)],
  roads:[...doc.map.roads,{id:roadId,regionId:first.id,segments:[{from:island,to:islandEnd,kind:'road'}]}],
  nextRoadId:roadId+1,
  editorNames:{...doc.map.editorNames,[oldAlias]:{ru:'Камень',en:'Stone'}},
  gmNotesByHexKey:{...doc.map.gmNotesByHexKey,'12,0':'Authored note'}
 };
 const plan=prepareGeometryPlan({...h.geometry.geometryPlanInput(map),scopePolicy:'explicit_preview'});
 assert.equal(plan.status,'prepared',JSON.stringify(plan.refs));
 const old=plan.geometryRefinement;
 const oldId=old.sourceState.poiIdentities.byLegacyRef[oldAlias];
 assert.ok(oldId);
 for(const physicalGrid of [plan.candidateState,composeScopedDetailState(old.sourceState,old)]){
  const imported=h.render().createSaveData({...doc,map:{...map,physicalGrid}});
  assert.equal(imported.version,16);
  assert.doesNotThrow(()=>h.geometry.assertHexcrawlSaveData(imported),'pre-split file is valid');
  await open(JSON.stringify(imported));
  const saved=h.render().createSaveData(), part=saved.map.regions.find(r=>r.splitNumber?.base===first.id&&r.splitNumber.part===2);
  assert.deepEqual(part.hexes,[island,islandEnd]);
  const alias=`poi:${part.id}:12,0`, state=saved.map.physicalGrid, next=state.geometryRefinement;
  assert.equal(state.poiIdentities.byLegacyRef[alias],oldId);
  assert.equal(next.sourceState.poiFootprints.find(p=>p.poiId===oldId).legacyRef,alias);
  assert.deepEqual(saved.map.editorNames[alias],{ru:'Камень',en:'Stone'});
  assert.equal(saved.map.gmNotesByHexKey['12,0'],'Authored note');
  assert.equal(Boolean(state.globalAuthoredState),Boolean(physicalGrid.globalAuthoredState));
  assert.deepEqual(next.riverPlan.paths,old.riverPlan.paths);
  assert.deepEqual(next.riverPlan.ports,old.riverPlan.ports);
  assert.deepEqual(next.roads.crossings,old.roads.crossings);
  assert.deepEqual(next.roads.roads,old.roads.roads.map(r=>r.roadId===roadId?{...r,regionId:part.id}:r));
  assert.equal(saved.map.roads.find(r=>r.id===roadId).regionId,part.id);
  assert.notEqual(next.sourceFingerprint,old.sourceFingerprint);
  await open(JSON.stringify(saved));
  assert.deepEqual(copy(h.render().createSaveData().map),copy(saved.map));
 }
});

let deltaFixture;
function acceptedDelta(){
 if(deltaFixture)return deltaFixture;
 // One finite real coarse-grid junction, with its three supporting land hexes.
 // The two downstream neighbors touch sea; the upstream neighbor stays open.
 // This reuses App's source/hydrology adapter, including separate BR-009 rules.
 const h=createGenerationHarness(43);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.render().addFallbackTractToMap({q:0,r:0});const base=h.render().captureDocument().map,g=h.geometry;
 const all=[];for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++)if(Math.abs(q+r)<=2)all.push({q,r});
 const corners=new Map(all.map(c=>[`${c.q},${c.r}`,g.getHexCornerPoints(c)])),j=g.getHexCornerPoints({q:0,r:0})[0],land=all.filter(c=>corners.get(`${c.q},${c.r}`).some(v=>v.key===j.key)),landKeys=new Set(land.map(c=>`${c.q},${c.r}`)),neighbors=new Map();
 for(const cell of land){const vs=corners.get(`${cell.q},${cell.r}`);for(let i=0;i<vs.length;i++)if(vs[i].key===j.key)for(const v of [vs[(i+1)%6],vs[(i+5)%6]])neighbors.set(v.key,v);}
 assert.equal(land.length,3);assert.equal(neighbors.size,3);const [a,c,b]=[...neighbors.values()].sort((a,b)=>a.x-b.x||a.y-b.y),seaCells=[c,b].map(v=>all.find(cell=>!landKeys.has(`${cell.q},${cell.r}`)&&corners.get(`${cell.q},${cell.r}`).some(p=>p.key===v.key)));
 assert.ok(seaCells.every(Boolean));const terrain=new Map(seaCells.map(c=>[`${c.q},${c.r}`,{terrainOverride:'sea'}])),seas=migrateSeas(terrain),path=[a,j,c],region={...base.regions[0],hexes:land,centerHex:{q:0,r:0},anchorHex:{q:0,r:0},finalSize:3,targetSize:3,heightLevel:1,isCoastal:true,pointsOfInterest:[],pointOfInterestKinds:{},suppressCentralPoi:true};
 const main={id:1,regionId:region.id,vertexPath:path,sectors:g.createInitialRiverSectors(1,path,4,{startReason:'region_boundary',endReason:'river_end'},region.id)},armPath=[j,b],arm={id:2,regionId:region.id,deltaParentRiverId:1,vertexPath:armPath,sectors:[{id:'delta-2-0',riverId:2,sectorIndex:0,vertexPath:armPath,edgeKeys:[armPath.map(v=>v.key).sort().join('|')],startVertexKey:j.key,endVertexKey:b.key,startReason:'split',endReason:'river_end',fullness:2}]};
 const map={...base,regions:[region],rivers:[main,arm],roads:[],crossings:[],physicalGrid:undefined,hexTerrainByKey:terrain,waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),...seas,candidateHexes:g.getCandidateHexes(land,new Set(terrain.keys())),nextRiverId:3,nextRoadId:1},input=g.geometryPlanInput(map),normalized=normalizeRefinementRiverSource(input.riverInput);
 assert.equal(normalized.status,'prepared',JSON.stringify(normalized));assert.equal(normalized.sectors.find(s=>s.riverId===2).sectorIndex,0);
 const result=prepareGeometryPlan(input);assert.equal(result.status,'prepared',JSON.stringify(result));deltaFixture={input,result,j:j.key};return deltaFixture;
}

test('GEO2 complete immutable physical4 plan preserves authored source and exact accepted choices',async()=>{
 const {input,result}=await accepted(),g=result.geometryRefinement;
 assert.equal(result.completeGeometryPlan,true);assert.equal(result.readyForApplication,true);assert.equal(result.candidateState.version,4);assert.equal(g.sourceState.version,3);
 assert.equal(g.riverPlan.paths.length,53);assert.equal(g.roads.crossings.length,7);assert.equal(g.unresolved.length,21);assert.equal(g.riverPlan.mouths.length,3);
 // F-R05/AC04: a declared source-policy variant of this same cached map.
 // The original fixture has no proven river-required POI; don't infer one
 // from a name. Knave structures96 explicitly requires river contact.
 const owner=g.sourceState.poiFootprints.find(f=>f.poiId==='detail-poi:7'),edge=g.riverPlan.source.segments.find(s=>s.riverId===3&&s.edgeKey==='-218.238,154|-242.487,140');
 const knownMap={...input.map,physicalGrid:{...g.sourceState,poiFootprints:g.sourceState.poiFootprints.map(f=>f===owner?{...f,attachments:[...f.attachments,{kind:'water',waterKind:'river',waterId:'river:3',segmentId:edge.edgeKey,contact:edge.from.point}]}:f)},knave:{content:{byPoi:{[owner.legacyRef]:{site:{table:'structures',sourceRow:96}}}}}};
 const knownInput={...input,map:knownMap,scopePolicy:'automatic_presentation'},beforeKnown=JSON.stringify(knownMap),display=prepareAutomaticSceneCandidate(knownInput),move=display.geometryRefinement.pois.pois.find(p=>p.poiId===owner.poiId);
 assert.ok(move);const visible=prepareRefinementWater({paths:display.geometryRefinement.riverPlan.paths,widthByFullness:new Map([1,2,3,4,5].map(f=>[f,f/10]))});
 assert.ok(Math.abs(refinementWaterContains(visible,move.contact.point).clearance)<1e-7,'required POI contacts visible one-mile bank, not the wider physical source bank');
 assert.deepEqual(move.footprint.extent,owner.extent);assert.equal(JSON.stringify(knownMap),beforeKnown,'display contact never rewrites source');
 assert.ok(move.routeEntries.length,'real source road entry is retained in the declared policy variant');
 for(const entry of move.routeEntries){const roads=display.geometryRefinement.roads.roads.filter(r=>`road:${r.roadId}`===entry.routeId);assert.ok(roads.some(r=>r.points.slice(1).some((b,i)=>{const a=r.points[i],p=entry.newEntry;return Math.abs(Math.hypot(p.x-a.x,p.y-a.y)+Math.hypot(p.x-b.x,p.y-b.y)-Math.hypot(b.x-a.x,b.y-a.y))<1e-8;})),'attached road reaches the relocated entry while preserving source graph endpoints');assert.ok(move.footprint.attachments.some(a=>a.kind==='route'&&a.routeId===entry.routeId&&a.accessNodeId===entry.accessNodeId&&Math.hypot(a.entry.x-entry.newEntry.x,a.entry.y-entry.newEntry.y)<1e-8));}
 const knownTerrain=new Map(input.map.regions.flatMap(r=>r.hexes.map(c=>[`${c.q},${c.r}`,r.biomeId]))),knownSummary=summarizeDetailCell(display,worldToDetailCell(createDetailGrid(1,display.grid.origin),move.newAnchor),knownTerrain,{rivers:input.liveRivers,roads:input.map.roads});
 assert.ok(knownSummary.pois.some(p=>p.poiId===owner.poiId),'fine read/pick cell follows the moved owner');
 const initialKnown=prepareGeometryPlan(knownInput);assert.throws(()=>prepareAutomaticSceneCandidate({...knownInput,prepareWorkBudget:initialKnown.workBudget.used}),/prepare_incomplete_budget/,'visible contact closure shares the original total work limit');
 // Actual mounted component: retained paint/crossings come from physical4,
 // including lake masks and prepared POI road gaps. No source geometry writes.
 const props={state:result.candidateState,source:normalizeRefinementRiverSource(input.riverInput),offset:{x:20,y:30},mode:'color',widthByFullness:new Map([[1,1],[5,3]]),rivers:[],roads:[],crossings:[],rapids:[],waterfalls:[],rotated:false};
 const svg=renderRefinedArtwork(props);
 assert.equal((svg.match(/data-fine-crossing=/g)??[]).length,7);
 assert.equal((svg.match(/data-refined-road=/g)??[]).length,g.roads.roads.length);
 assert.ok(svg.includes('mask='));assert.ok(svg.includes('data-refined-river='));assert.ok(!/NaN|Infinity|undefined/.test(svg));
 for(const mode of ['tiles','emoji','color']){
  const lakes=refinementLakeShapes(props.state,mode,props.offset,[]),water=renderRefinedLakeWater({...props,mode,shapes:[],cells:[],seed:1}),clipped=renderRefinedArtwork({...props,mode});
  assert.ok(lakes.length);for(const lake of lakes){assert.ok(water.includes(`d="${lake.path}"`),'visible water uses accepted contour');assert.ok(clipped.includes(`d="${lake.path}"`),'river clipping uses that same visible contour');assert.equal(lake.mouths.length,0,'old source mouth polygons cannot shift the accepted shore');}
 }
 const outside={...props.source,segments:[...props.source.segments,...[1,5].map((fullness,i)=>({riverId:999,edgeKey:`outside${i}`,fullness,from:{key:`new${i}a`,point:{x:100+i*10,y:100}},to:{key:`new${i}b`,point:{x:105+i*10,y:100}}}))]};
 const mixed=renderRefinedArtwork({...props,source:outside});
 assert.match(mixed,new RegExp(`data-source-edge="outside0"[^>]*stroke-width="${fineRiverStrokeWidth(1)}"`));
 assert.match(mixed,new RegExp(`data-source-edge="outside1"[^>]*stroke-width="${fineRiverStrokeWidth(5)}"`));
 const fineState={...result.candidateState,viewStep:1,selectedWorldPoint:undefined},coarseOnly={...fineState,geometryRefinement:undefined};
 const terrain=new Map(input.map.regions.flatMap(r=>r.hexes.map(c=>[`${c.q},${c.r}`,r.biomeId]))),geography={rivers:input.liveRivers,roads:input.map.roads};
 const summarize=(state,point)=>summarizeDetailCell(state,worldToDetailCell(createDetailGrid(1,state.grid.origin),point),terrain,geography);
 let shiftedRiverCell=false;
 for(const path of g.riverPlan.paths)for(let i=1;i<path.points.length;i++){
  const a=path.points[i-1],b=path.points[i],point={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  assert.ok(summarize(fineState,point).rivers.some(r=>r.id===path.riverId),'card follows every visible retained chain');
  if(!summarize(coarseOnly,point).rivers.some(r=>r.id===path.riverId))shiftedRiverCell=true;
 }
 assert.ok(shiftedRiverCell,'fixture witnesses a fine card that source6 geometry cannot describe');
 const movedSource=g.riverPlan.source.segments.flatMap(s=>[s.from,s.to]).find(n=>{const p=g.riverPlan.ports.find(p=>p.sourceKey===n.key);return p&&Math.hypot(p.point.x-n.point.x,p.point.y-n.point.y)>1e-8;});
 assert.ok(movedSource);const port=g.riverPlan.ports.find(p=>p.sourceKey===movedSource.key).point,grid=createDetailGrid(1,fineState.grid.origin);
 const outsideEnd={x:port.x+3,y:port.y+2},outsideEdge=`${movedSource.key}|new-source-node`,sourceWithRapid={...props.source,segments:[...props.source.segments,{riverId:999,edgeKey:outsideEdge,fullness:1,from:movedSource,to:{key:'new-source-node',point:outsideEnd}}]};
 const projected=renderRefinedArtwork({...props,source:sourceWithRapid,rotated:true,rapids:[{key:'river-rapid-999-1-0.5',edgeKey:outsideEdge,x1:-1,y1:0,x2:1,y2:0}],waterfalls:[{key:'new-waterfall',x:17,y:18}]});
 assert.ok(projected.includes('transform="rotate(-90 17 18)"'),'unrefined waterfall stays upright under the same view rotation');
 const rapid=projected.match(/<line[^>]*data-fine-rapid="river-rapid-999-1-0.5"[^>]*>/)?.[0];assert.ok(rapid);
 const number=name=>Number(rapid.match(new RegExp(`${name}="([^\"]+)"`))[1]),factor=Math.sqrt(3)*28/6;
 const expectedCenter={x:((port.x+outsideEnd.x)/2-fineState.grid.origin.x)*factor+props.offset.x,y:((port.y+outsideEnd.y)/2-fineState.grid.origin.y)*factor+props.offset.y};
 assert.ok(Math.abs((number('x1')+number('x2'))/2-expectedCenter.x)<1e-8);assert.ok(Math.abs((number('y1')+number('y2'))/2-expectedCenter.y)<1e-8,'outside rapid follows the actual mixed river midpoint');

 let mixedWitness=false;
 for(const direction of [{x:3,y:0},{x:0,y:3},{x:-3,y:0},{x:0,y:-3}]){
  const end={x:port.x+direction.x,y:port.y+direction.y},edge={id:`${movedSource.key}|new-source-node`,segment:{from:{x:movedSource.point.x+1e-12,y:movedSource.point.y},to:end},rapid:false,crossings:[]};
  const mixedGeography={rivers:[{id:999,edges:[edge],starts:[],waterfalls:[]}]};
  for(let i=0;i<=12;i++)for(const from of [port,movedSource.point]){
   const point={x:from.x+(end.x-from.x)*i/12,y:from.y+(end.y-from.y)*i/12},cell=worldToDetailCell(grid,point),expected=!!detailSegmentCellIntersection(grid,cell,{from:port,to:end}),old=!!detailSegmentCellIntersection(grid,cell,edge.segment);
   if(expected!==old)mixedWitness=true;
   assert.equal(summarizeDetailCell(fineState,cell,terrain,mixedGeography).rivers.some(r=>r.id===999),expected,'new river ID shares the same persisted port in card and artwork');
  }
 }
 assert.ok(mixedWitness,'mixed fixture distinguishes old and shared-port geometry');

 for(const road of g.roads.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i];assert.ok(summarize(fineState,{x:(a.x+b.x)/2,y:(a.y+b.y)/2}).routes.some(r=>r.id===road.roadId),'card retains the connected route, including masked POI parts');
 }
 for(const crossing of g.roads.crossings)assert.ok(summarize(fineState,crossing.point).rivers.some(r=>r.id===crossing.riverId&&r.crossingIds.includes(`crossing:${crossing.key}`)),'card uses relocated typed crossing');


 assert.ok(Object.isFrozen(g.riverPlan.paths[0].steps[0]));assert.ok(Object.isFrozen(g.sourceState.poiFootprints[0].extent));
 assert.equal(g.sideChoices.length,g.riverPlan.paths.reduce((n,p)=>n+p.steps.length,0));
 assert.deepEqual(parseGeometryRefinement(copy(g),parseDetail1StateV11),g);assert.deepEqual(parseDetail1StateV11(copy(result.candidateState)),result.candidateState);
 assert.deepEqual(parseDetail1StateV11(reverseKeys(copy(result.candidateState))),result.candidateState,'object key order is not geometry');
 assert.equal(validateGeometryRefinementSource(input,g),true);

 const namesOnly={...input,map:{...input.map,physicalGrid:result.candidateState,editorNames:{changed:'new title'},gmNotesByHexKey:{'0,0':'new note'},language:'en'}};
 const unchanged=prepareGeometryPlan(namesOnly);assert.equal(unchanged.status,'unchanged',JSON.stringify(unchanged));assert.equal(unchanged.geometryRefinement,g);
 const wrong={...input,map:{...input.map,rivers:input.map.rivers.map((r,i)=>i?r:{...r,sectors:r.sectors.map((s,j)=>j?s:{...s,fullness:s.fullness===5?4:s.fullness+1})})}};
 assert.equal(validateGeometryRefinementSource(wrong,g),false);
 const cancelled=prepareGeometryPlan({...input,cancelled:()=>true});assert.equal(cancelled.status,'error');assert.equal(cancelled.candidateState,undefined);
 const bounded=prepareGeometryPlan({...input,prepareWorkBudget:1});assert.equal(bounded.status,'error');assert.equal(bounded.candidateState,undefined);
 const delta=acceptedDelta(),dg=delta.result.geometryRefinement;assert.equal(dg.riverPlan.paths.length,3);assert.equal(dg.riverPlan.paths.filter(p=>p.fromNode===delta.j).length,2);assert.equal(dg.riverPlan.paths.filter(p=>p.toNode===delta.j).length,1);assert.deepEqual(parseGeometryRefinement(copy(dg),parseDetail1StateV11),dg);assert.equal(validateGeometryRefinementSource(delta.input,dg),true);
});

test('GEO2 scoped source projection retains literal choices and refuses hidden boundary dependencies',async()=>{
 const {input,result}=await accepted(),g=result.geometryRefinement;
 // Scope projection is a prerequisite, never an expansion Apply decision.
 // New risk: source-domain filtering must not hide seam refs or changed inputs.
 // Reuse the accepted53/31/7 fixture; do not add another expensive setup.
 const extra={...input.map.regions[0],id:999999,hexes:[{q:1000,r:1000}],centerHex:{q:1000,r:1000},pointsOfInterest:[],pointOfInterestKinds:{},suppressCentralPoi:true};
 const expanded={...input,map:{...input.map,regions:[...input.map.regions,extra]},landCells:[...input.landCells,...extra.hexes]};
 assert.equal(projectGeometryRefinementSource({...expanded,cancelled:()=>true},g).code,'prepare_cancelled');
 assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,regions:Array(20001).fill(extra)}},g).code,'scope_capacity');
 const beforeProjection=JSON.stringify(expanded),projected=projectGeometryRefinementSource(expanded,g);
 assert.equal(projected.status,'projected',JSON.stringify(projected));assert.equal(projected.readyForApplication,false);assert.equal(projected.boundaryValidation,'required');
 assert.equal(projected.geometryRefinement,g);assert.equal(projected.input.map.regions[0],input.map.regions[0]);assert.deepEqual(projected.input.landCells,input.landCells);assert.equal(projected.outside.regions[0],extra);
 assert.equal(validateGeometryRefinementSource(projected.input,g),true);assert.equal(JSON.stringify(expanded),beforeProjection);
 assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,physicalGrid:result.candidateState}},g).status,'projected');
 const changedAuthored=copy(g.sourceState);changedAuthored.poiFootprints[0].worldAnchor.x+=.1;assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,physicalGrid:changedAuthored}},g).code,'scope_source_changed');
 const overlap=projectGeometryRefinementSource({...expanded,map:{...expanded.map,regions:[...input.map.regions,{...extra,hexes:[input.map.regions[0].hexes[0]]}]}},g);assert.equal(overlap.code,'boundary_dependency');assert.equal(overlap.input,undefined);
 const altered=projectGeometryRefinementSource({...expanded,map:{...expanded.map,roads:expanded.map.roads.map((r,i)=>i?r:{...r,segments:r.segments.map((s,j)=>j?s:{...s,kind:s.kind==='road'?'trail':'road'})})}},g);assert.equal(altered.code,'scope_source_changed');
 const lost=projectGeometryRefinementSource({...expanded,map:{...expanded.map,rivers:expanded.map.rivers.slice(1)}},g);assert.equal(lost.code,'missing_scope_reference');
 const newArm={...input.map.rivers[0],id:999999};const seam=projectGeometryRefinementSource({...expanded,map:{...expanded.map,rivers:[...expanded.map.rivers,newArm]}},g);assert.equal(seam.code,'boundary_dependency');
 const shuffled=projectGeometryRefinementSource({...expanded,map:{...expanded.map,regions:expanded.map.regions.toReversed(),roads:expanded.map.roads.toReversed(),rivers:expanded.map.rivers.toReversed()}},g);assert.equal(shuffled.status,'projected');assert.equal(validateGeometryRefinementSource(shuffled.input,g),true);

 const newCrossing={...input.map.crossings[0],key:'outside-crossing'};assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,crossings:[...expanded.map.crossings,newCrossing]}},g).code,'boundary_dependency');
 const lake=[...input.map.hexTerrainByKey].find(([,v])=>v.terrainOverride==='lake');assert.ok(lake);const joined=new Map(expanded.map.hexTerrainByKey);joined.set('1000,1000',lake[1]);assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,hexTerrainByKey:joined}},g).code,'boundary_dependency');
 const growing=projectGeometryRefinementEdit({...expanded,map:{...expanded.map,hexTerrainByKey:joined}},g);assert.equal(growing.status,'projected');assert.equal(growing.input.map.hexTerrainByKey.get('1000,1000').lakeId,lake[1].lakeId);assert.equal(growing.sourceCorrespondence,'requires_new_plan');assert.equal(growing.readyForApplication,false,'body acquisition is not an accepted contour or mouth repair');assert.equal(growing.outside.water.length,0);
 assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,hexTerrainByKey:joined}},g).code,'boundary_dependency','an edit projection must not weaken import');
 const heirId=900001,merged=new Map(joined);for(const [k,v]of merged)if(v.terrainOverride==='lake'&&v.lakeId===lake[1].lakeId)merged.set(k,{...v,lakeId:heirId});
 const mergedInput={...expanded,map:{...expanded.map,hexTerrainByKey:merged}},mergedBefore=JSON.stringify([...merged]);
 const heir=projectGeometryRefinementEdit(mergedInput,g);assert.equal(heir.status,'projected');assert.equal(heir.input.map.hexTerrainByKey.get('1000,1000').lakeId,heirId);assert.equal(JSON.stringify([...merged]),mergedBefore);assert.notEqual(projectGeometryRefinementSource(mergedInput,g).status,'projected');
 const converted=new Map(expanded.map.hexTerrainByKey);converted.set(lake[0],{terrainOverride:'sea'});converted.set('1000,1000',{terrainOverride:'sea'});
 const convertedInput={...expanded,map:{...expanded.map,hexTerrainByKey:converted,seas:[...expanded.map.seas,{id:heirId,hexKeys:[lake[0],'1000,1000']}]}},sea=projectGeometryRefinementEdit(convertedInput,g);
 assert.equal(sea.status,'projected');assert.ok(sea.input.map.seas.some(s=>s.id===heirId));assert.equal(sea.input.map.hexTerrainByKey.get('1000,1000').terrainOverride,'sea');assert.notEqual(projectGeometryRefinementSource(convertedInput,g).status,'projected');


 // G208: expansion allocates new authored owners. A scoped signature must
 // retain the old owners without discarding the new global data/counter.
 const alias='poi:999999:1000,1000',id=`detail-poi:${g.sourceState.poiIdentities.nextId}`,anchor=detailCellCenter(createDetailGrid(6),extra.hexes[0]),cell=worldToDetailCell(createDetailGrid(1),anchor);
 const newFootprint={poiId:id,legacyRef:alias,worldAnchor:anchor,cells:[cell],extent:{kind:'manual_size',diameterMiles:.1,basis:'conditional',note:'new authored site'},attachments:[]};
 const globalAuthored=parseDetail1StateV11({...g.sourceState,poiIdentities:{...g.sourceState.poiIdentities,nextId:g.sourceState.poiIdentities.nextId+2,byLegacyRef:{...g.sourceState.poiIdentities.byLegacyRef,[alias]:id}},poiFootprints:[...g.sourceState.poiFootprints,newFootprint],fineCellEdits:{...g.sourceState.fineCellEdits,[`${cell.q},${cell.r}`]:{name:{ru:'Новое место',en:'New site'},note:'retain outside edit'}}});
 const withOwner={...expanded,map:{...expanded.map,physicalGrid:globalAuthored,regions:[...input.map.regions,{...extra,pointsOfInterest:[extra.hexes[0]],pointOfInterestKinds:{'1000,1000':'ruins'}}]}};
 const beforeOwner=JSON.stringify(withOwner),ownerProjection=projectGeometryRefinementSource(withOwner,g);
 assert.equal(ownerProjection.status,'projected',JSON.stringify(ownerProjection));assert.equal(ownerProjection.readyForApplication,false);assert.equal(ownerProjection.boundaryValidation,'required');assert.equal(ownerProjection.geometryRefinement,g);
 assert.equal(validateGeometryRefinementSource(ownerProjection.input,g),true);
 assert.deepEqual(ownerProjection.input.map.physicalGrid.poiFootprints,g.sourceState.poiFootprints);assert.deepEqual(ownerProjection.input.map.physicalGrid.poiIdentities.byLegacyRef,g.sourceState.poiIdentities.byLegacyRef);
 assert.equal(ownerProjection.input.map.physicalGrid.poiIdentities.nextId,globalAuthored.poiIdentities.nextId);assert.deepEqual(ownerProjection.globalAuthoredState,globalAuthored);assert.deepEqual(ownerProjection.globalAuthoredState.fineCellEdits,globalAuthored.fineCellEdits);
 assert.deepEqual(ownerProjection.outside.authoredFootprints,[newFootprint]);assert.deepEqual(ownerProjection.outside.authoredIdentityRefs,{[alias]:id});assert.equal(JSON.stringify(withOwner),beforeOwner);
 const missingOwner=copy(globalAuthored);delete missingOwner.poiIdentities.byLegacyRef[g.sourceState.poiFootprints[0].legacyRef];assert.equal(projectGeometryRefinementSource({...withOwner,map:{...withOwner.map,physicalGrid:missingOwner}},g).code,'missing_scope_reference');
 const reboundOwner=copy(globalAuthored);reboundOwner.poiIdentities.byLegacyRef[g.sourceState.poiFootprints[0].legacyRef]=`detail-poi:${globalAuthored.poiIdentities.nextId}`;reboundOwner.poiIdentities.nextId++;assert.equal(projectGeometryRefinementSource({...withOwner,map:{...withOwner.map,physicalGrid:reboundOwner}},g).code,'scope_source_changed');
 const danglingOwner=copy(globalAuthored);danglingOwner.poiIdentities.byLegacyRef['poi:999998:1001,1000']=`detail-poi:${globalAuthored.poiIdentities.nextId}`;danglingOwner.poiIdentities.nextId++;assert.equal(projectGeometryRefinementSource({...withOwner,map:{...withOwner.map,physicalGrid:danglingOwner}},g).code,'invalid_authored_source');
 const regressCounter=copy(g.sourceState);regressCounter.poiIdentities.nextId--;assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,physicalGrid:regressCounter}},g).status,'error');
 const beforeRefinement=JSON.stringify(g),focus=g.sourceState.poiFootprints[0].cells[0],focusKey=`${focus.q},${focus.r}`,fineEdits={...result.candidateState.fineCellEdits,[focusKey]:{note:'edited after refinement'}},viewStep=g.sourceState.viewStep===1?6:1;
 const editedOuter=parseDetail1StateV11({...result.candidateState,fineCellEdits:fineEdits,viewStep,selectedCell:focus,selectedWorldPoint:detailCellCenter(createDetailGrid(1),focus)}),editedProjection=projectGeometryRefinementSource({...expanded,map:{...expanded.map,physicalGrid:editedOuter}},g);
 assert.equal(editedProjection.status,'projected',JSON.stringify(editedProjection));assert.deepEqual(editedProjection.globalAuthoredState.fineCellEdits,fineEdits);assert.equal(editedProjection.globalAuthoredState.viewStep,viewStep);assert.deepEqual(editedProjection.globalAuthoredState.selectedCell,focus);assert.deepEqual(editedProjection.globalAuthoredState.selectedWorldPoint,editedOuter.selectedWorldPoint);assert.equal(editedProjection.geometryRefinement,g);assert.equal(JSON.stringify(g),beforeRefinement);
 const withSnapshotFocus=parseGeometryRefinement({...g,sourceState:{...g.sourceState,selectedCell:focus,selectedWorldPoint:editedOuter.selectedWorldPoint}},parseDetail1StateV11),clearedOuter={...result.candidateState,geometryRefinement:withSnapshotFocus};delete clearedOuter.selectedCell;delete clearedOuter.selectedWorldPoint;
 const clearedProjection=projectGeometryRefinementSource({...expanded,map:{...expanded.map,physicalGrid:clearedOuter}},withSnapshotFocus);assert.equal(clearedProjection.status,'projected',JSON.stringify(clearedProjection));assert.equal(clearedProjection.globalAuthoredState.selectedCell,undefined);assert.equal(clearedProjection.globalAuthoredState.selectedWorldPoint,undefined);
 const laterCounter=parseGeometryRefinement({...g,sourceState:{...g.sourceState,poiIdentities:{...g.sourceState.poiIdentities,nextId:g.sourceState.poiIdentities.nextId+3}}},parseDetail1StateV11);
 assert.equal(projectGeometryRefinementSource({...expanded,map:{...expanded.map,physicalGrid:g.sourceState}},laterCounter).code,'scope_source_changed','counter cannot regress even when all currently live IDs still fit');
});

test('GEO2 scoped physical4 preserves global authored owners and strictly binds the retained source',async()=>{
 const {input,result}=await accepted(),g=result.geometryRefinement,identity=g.sourceState.poiIdentities,alias='poi:999999:1000,1000',id=`detail-poi:${identity.nextId}`,anchor=detailCellCenter(createDetailGrid(6),{q:1000,r:1000}),cell=worldToDetailCell(createDetailGrid(1),anchor);
 // New persisted ownership boundary; same cached source fixture, no routing
 // sweep. Old source scope and new global authored data must stay distinct.
 const outside={poiId:id,legacyRef:alias,worldAnchor:anchor,cells:[cell],extent:{kind:'manual_size',diameterMiles:.1,basis:'conditional',note:'outside authored note'},attachments:[]};
 const global=parseDetail1StateV11({...g.sourceState,poiIdentities:{...identity,nextId:identity.nextId+1,byLegacyRef:{...identity.byLegacyRef,[alias]:id}},poiFootprints:[...g.sourceState.poiFootprints,outside],fineCellEdits:{[`${cell.q},${cell.r}`]:{name:{ru:'Новое',en:'New'},note:'outside fine note'}},selectedCell:cell,selectedWorldPoint:anchor});
 const before=JSON.stringify([global,g]),state=composeScopedDetailState(global,g);
 assert.equal(state.version,4);assert.deepEqual(state.globalAuthoredState,global);assert.deepEqual(detailAuthoredState(state),global);assert.equal(state.poiFootprints.length,global.poiFootprints.length);assert.equal(state.poiIdentities.nextId,global.poiIdentities.nextId);assert.deepEqual(state.geometryRefinement,g);
 assert.deepEqual(parseDetail1StateV11(copy(state)),state);assert.deepEqual(parseDetail1StateV11(reverseKeys(copy(state))),state);
 assert.deepEqual(state.geometryRefinement.riverPlan.paths,g.riverPlan.paths);assert.deepEqual(state.geometryRefinement.roads,g.roads);assert.deepEqual(state.geometryRefinement.sideChoices,g.sideChoices);assert.equal(JSON.stringify([global,g]),before);
 const extra={...input.map.regions[0],id:999999,hexes:[{q:1000,r:1000}],centerHex:{q:1000,r:1000},pointsOfInterest:[{q:1000,r:1000}],pointOfInterestKinds:{'1000,1000':'ruins'},suppressCentralPoi:true};
 const scoped=projectGeometryRefinementSource({...input,map:{...input.map,physicalGrid:state,regions:[...input.map.regions,extra]},landCells:[...input.landCells,...extra.hexes]},g);assert.equal(scoped.status,'projected',JSON.stringify(scoped));assert.deepEqual(scoped.globalAuthoredState,global);assert.equal(validateGeometryRefinementSource(scoped.input,g),true);
 const [a,b]=g.sourceState.poiFootprints,swapped=copy(global);[swapped.poiIdentities.byLegacyRef[a.legacyRef],swapped.poiIdentities.byLegacyRef[b.legacyRef]]=[b.poiId,a.poiId];swapped.poiFootprints=swapped.poiFootprints.map(f=>f.poiId===a.poiId?{...f,poiId:b.poiId}:f.poiId===b.poiId?{...f,poiId:a.poiId}:f);assert.doesNotThrow(()=>parseDetail1StateV11(swapped));assert.throws(()=>composeScopedDetailState(swapped,g),/Scoped authored identities/);
 const changed=copy(global);changed.poiFootprints[0].worldAnchor.x+=.01;assert.throws(()=>composeScopedDetailState(changed,g),/Scoped authored footprint/);
 const reserved=parseGeometryRefinement({...g,sourceState:{...g.sourceState,poiIdentities:{...identity,nextId:identity.nextId+3}}},parseDetail1StateV11);assert.throws(()=>composeScopedDetailState(global,reserved),/Scoped authored identities/,'counter must not regress even with legal live IDs');
 const missing=copy(state);delete missing.globalAuthoredState;assert.throws(()=>parseDetail1StateV11(missing));
 const recursive=copy(state);recursive.globalAuthoredState.globalAuthoredState=recursive.globalAuthoredState;assert.throws(()=>parseDetail1StateV11(recursive),/nonrecursive/);
 assert.throws(()=>parseDetail1StateV11({...global,globalAuthoredState:global}),/physical version4/);assert.throws(()=>composeScopedDetailState(state,g),/authored physical3/);assert.throws(()=>validateDetail1Document(state,15),/requires physical version3/);
});

test('GEO2 boundary preflight conservatively separates supplied envelopes or requires dependency closure',async()=>{
 const {input,result}=await accepted(),g=result.geometryRefinement;
 // A distinct composition risk, not another routing/seed test. Reuse the
 // accepted fixture. Synthetic added records probe model envelopes only;
 // neither their classification nor this case is global-map acceptance.
 const extra={...input.map.regions[0],id:999999,hexes:[{q:1000,r:1000}],centerHex:{q:1000,r:1000},pointsOfInterest:[],pointOfInterestKinds:{},suppressCentralPoi:true};
 const boundaryInput={...input,map:{...input.map,physicalGrid:result.candidateState,regions:[...input.map.regions,extra]},landCells:[...input.landCells,...extra.hexes],roadPaddingMiles:.1}; // explicit test envelope, not renderer calibration
 const before=JSON.stringify(boundaryInput),separated=prepareGeometryRefinementBoundary(boundaryInput,g);
 assert.equal(separated.status,'prepared',JSON.stringify(separated));assert.equal(separated.boundaryValidation,'disjoint_model_envelopes');assert.deepEqual(separated.potentialDependencies,[]);assert.equal(separated.confirmedIntersections,false);assert.equal(separated.readyForApplication,false);assert.equal(separated.globalPersistenceValidation,'required');assert.equal(separated.scope.geometryRefinement,g);assert.equal(JSON.stringify(boundaryInput),before);
 assert.ok(separated.counts.retainedEnvelopes>0);assert.equal(separated.counts.addedEnvelopes,1);
 assert.equal(prepareGeometryRefinementBoundary({...boundaryInput,roadPaddingMiles:0},g).code,'invalid_boundary_input');
 assert.equal(prepareGeometryRefinementBoundary({...boundaryInput,boundaryWorkBudget:1},g).code,'prepare_incomplete_budget');
 assert.equal(prepareGeometryRefinementBoundary({...boundaryInput,landCells:input.landCells},g).code,'boundary_evidence_missing');
 let calls=0;const cancelled=prepareGeometryRefinementBoundary({...boundaryInput,cancelled:()=>++calls>200},g);assert.equal(cancelled.code,'prepare_cancelled');assert.equal(cancelled.scope,undefined);
 const edge=input.map.regions.flatMap(r=>r.hexes).toSorted((a,b)=>b.q-a.q||b.r-a.r)[0],adjacent={q:edge.q+1,r:edge.r};
 const touching=prepareGeometryRefinementBoundary({...boundaryInput,map:{...boundaryInput.map,regions:[...input.map.regions,{...extra,hexes:[adjacent],centerHex:adjacent}]},landCells:[...input.landCells,adjacent]},g);
 assert.equal(touching.status,'prepared',JSON.stringify(touching));assert.equal(touching.boundaryValidation,'dependency_closure_required');assert.ok(touching.potentialDependencies.some(p=>p.addedRef==='region:999999'&&p.retainedRef.startsWith('region:')));assert.equal(touching.confirmedIntersections,false);
 // The reference-only projector cannot discover a new line with new endpoint
 // addresses crossing retained geometry; the spatial preflight must list it.
 const oldCell=input.map.regions[0].hexes[0],road={...input.map.roads[0],id:999999,regionId:extra.id,segments:[{...input.map.roads[0].segments[0],from:{q:oldCell.q-1000,r:oldCell.r},to:{q:oldCell.q+1000,r:oldCell.r}}]},crossingInput={...boundaryInput,map:{...boundaryInput.map,roads:[...input.map.roads,road]}};
 assert.equal(projectGeometryRefinementSource(crossingInput,g).status,'projected');
 const crossing=prepareGeometryRefinementBoundary(crossingInput,g);assert.equal(crossing.status,'prepared',JSON.stringify(crossing));assert.equal(crossing.boundaryValidation,'dependency_closure_required');assert.ok(crossing.potentialDependencies.some(p=>p.addedRef==='road:999999'));assert.equal(crossing.readyForApplication,false);
 const incomplete=prepareGeometryRefinementBoundary({...crossingInput,boundaryWorkBudget:crossing.workBudget.used-1},g);assert.equal(incomplete.code,'prepare_incomplete_budget');assert.equal(incomplete.scope,undefined);assert.equal(incomplete.potentialDependencies,undefined,'late exhaustion cannot expose an incomplete dependency list');
 const shuffled=prepareGeometryRefinementBoundary({...crossingInput,map:{...crossingInput.map,regions:crossingInput.map.regions.toReversed(),roads:crossingInput.map.roads.toReversed()},lakeInputs:crossingInput.lakeInputs.toReversed(),landCells:crossingInput.landCells.toReversed()},g);assert.equal(shuffled.status,'prepared',JSON.stringify(shuffled));assert.deepEqual(shuffled.potentialDependencies,crossing.potentialDependencies);
 assert.ok(input.lakeInputs.length>0);assert.equal(prepareGeometryRefinementBoundary({...boundaryInput,lakeInputs:input.lakeInputs.slice(1)},g).code,'boundary_evidence_missing');
 const changedShape=prepareGeometryRefinementBoundary({...boundaryInput,lakeInputs:input.lakeInputs.map((l,i)=>i?l:{...l,colorScale:l.colorScale*1.01})},g);assert.equal(changedShape.code,'boundary_source_changed');
 const f=g.riverPlan.paths[0].fullness,widths=new Map(input.widths);widths.set(f,widths.get(f)*1.01);assert.equal(prepareGeometryRefinementBoundary({...boundaryInput,widths},g).code,'boundary_source_changed');
 const alias='poi:999999:1000,1000',identity=g.sourceState.poiIdentities,withoutFootprint={...g.sourceState,poiIdentities:{...identity,nextId:identity.nextId+1,byLegacyRef:{...identity.byLegacyRef,[alias]:`detail-poi:${identity.nextId}`}}};
 const unknownExtent={...boundaryInput,map:{...boundaryInput.map,physicalGrid:withoutFootprint,regions:[...input.map.regions,{...extra,pointsOfInterest:extra.hexes,pointOfInterestKinds:{'1000,1000':'ruins'}}]}};assert.equal(projectGeometryRefinementSource(unknownExtent,g).status,'projected');assert.equal(prepareGeometryRefinementBoundary(unknownExtent,g).code,'boundary_evidence_missing');
 const ghostCrossing={...input.map.crossings[0],key:'outside-ghost',riverId:999999,roadId:999999};assert.equal(prepareGeometryRefinementBoundary({...boundaryInput,map:{...boundaryInput.map,crossings:[...input.map.crossings,ghostCrossing]}},g).code,'boundary_evidence_missing');
 const anchor=detailCellCenter(createDetailGrid(6,input.origin),extra.hexes[0]),cell=worldToDetailCell(createDetailGrid(1,input.origin),anchor),newFootprint={poiId:`detail-poi:${identity.nextId}`,legacyRef:alias,worldAnchor:anchor,cells:[cell],extent:{kind:'manual_size',diameterMiles:.1,basis:'conditional',note:'boundary probe'},attachments:[]};
 const withSite={...unknownExtent,map:{...unknownExtent.map,physicalGrid:{...withoutFootprint,poiFootprints:[...g.sourceState.poiFootprints,newFootprint]}}},site=prepareGeometryRefinementBoundary(withSite,g);assert.equal(site.status,'prepared',JSON.stringify(site));assert.equal(site.boundaryValidation,'disjoint_model_envelopes');assert.equal(site.counts.addedEnvelopes,2);
 const terrain=new Map(input.map.hexTerrainByKey);terrain.set('1000,1000',{terrainOverride:'lake',lakeId:999999});const x=anchor.x-input.origin.x,y=anchor.y-input.origin.y,lake={lakeId:999999,cells:extra.hexes,colorPath:`M ${x-1} ${y-1} L ${x+1} ${y-1} L ${x+1} ${y+1} L ${x-1} ${y+1} Z`,colorScale:1,origin:input.origin};
 const withLake={...boundaryInput,map:{...boundaryInput.map,hexTerrainByKey:terrain},landCells:input.landCells,lakeInputs:[...input.lakeInputs,lake]},farLake=prepareGeometryRefinementBoundary(withLake,g);assert.equal(farLake.status,'prepared',JSON.stringify(farLake));assert.equal(farLake.boundaryValidation,'disjoint_model_envelopes');
 // A quadratic control hull can overlap while the curve itself stays away.
 // This is intentionally only a candidate: never report a proven collision.
 const oldPoint=detailCellCenter(createDetailGrid(6,input.origin),oldCell),bulging={...lake,colorPath:`M ${x} ${y} Q ${oldPoint.x-input.origin.x} ${oldPoint.y-input.origin.y} ${x+1} ${y} L ${x+1} ${y+1} L ${x} ${y+1} Z`},hull=prepareGeometryRefinementBoundary({...withLake,lakeInputs:[...input.lakeInputs,bulging]},g);assert.equal(hull.status,'prepared',JSON.stringify(hull));assert.equal(hull.boundaryValidation,'dependency_closure_required');assert.ok(hull.potentialDependencies.some(p=>p.addedRef==='lake:999999'));assert.equal(hull.confirmedIntersections,false);
 const original=input.map.rivers[0],rename=v=>({...v,key:`boundary-probe:${v.key}`}),newRiver={...original,id:999999,regionId:extra.id,vertexPath:original.vertexPath.map(rename),sectors:original.sectors.map(s=>({...s,id:`boundary-probe:${s.id}`,riverId:999999,assignedRegionId:extra.id,vertexPath:s.vertexPath.map(rename),startVertexKey:`boundary-probe:${s.startVertexKey}`,endVertexKey:`boundary-probe:${s.endVertexKey}`,edgeKeys:s.vertexPath.slice(1).map((v,i)=>[rename(s.vertexPath[i]).key,rename(v).key].sort().join('|'))}))};
 const geometricAlias=prepareGeometryRefinementBoundary({...boundaryInput,map:{...boundaryInput.map,rivers:[...input.map.rivers,newRiver]}},g);assert.equal(geometricAlias.status,'prepared',JSON.stringify(geometricAlias));assert.equal(geometricAlias.boundaryValidation,'dependency_closure_required');assert.ok(geometricAlias.potentialDependencies.some(p=>p.addedRef==='river:999999'));
 assert.equal(JSON.stringify(boundaryInput),before);
 // Reviewer regression: actual quadratic tangency at a polygon edge midpoint
 // has cuts but no positive wet interval. Synthetic certificate input only;
 // actual map/import behavior is covered in mapTransactions.
 {
  const r=.025,a=Math.PI/96,n={x:Math.cos(a),y:Math.sin(a)},e={x:-n.y,y:n.x},d=r*Math.cos(a),h=.2;
  const v=(x,y)=>({x:n.x*x+e.x*y,y:n.y*x+e.y*y}),s=p=>`${p.x} ${p.y}`;
  const shore=prepareRefinementShorePath(`M ${s(v(d+h*h,-h))} Q ${s(v(d-h*h,0))} ${s(v(d+h*h,h))} L ${s(v(1,h))} L ${s(v(1,-h))} Z`);
  const f={poiId:'p',cells:[{q:0,r:0}],attachments:[],worldAnchor:{x:0,y:0},extent:detailCatalogueExtent('land','lair')},poly=detailFootprintPolygons(f,createDetailGrid(1))[0],cut=refinementShoreIntervals(shore,{from:poly[0],to:poly[1]});
  assert.equal(refinementShoreContains(shore,f.worldAnchor),false);assert.equal(poly.some(p=>refinementShoreContains(shore,p)),false);assert.equal(shore.loops.some(l=>l.some(c=>detailPointInPolygon(c.from,poly))),false);assert.equal(cut.cuts.length,1);assert.equal(cut.intervals.length,0);
  const empty={status:'prepared',capsules:[],completeGeometryPlan:false},accepted={riverPlan:{source:{segments:[]},paths:[],ports:[],terminations:[],water:empty,paintWater:empty},pois:{pois:[]},roads:{roads:[]},lockedPoiIds:[]};
  const certificate={status:'prepared',boundaryValidation:'dependency_closure_required',potentialDependencies:[{retainedRef:'lake:1',addedRef:'POI:p'}],scope:{input:{origin:{x:0,y:0},map:{regions:[],roads:[],crossings:[],physicalGrid:{poiFootprints:[]}}},outside:{regions:[],roads:[],crossings:[],authoredFootprints:[f]},continuationKeys:new Set()},source:{segments:[]},accepted,widths:new Map(),bodies:[{lakeId:1,modes:{tiles:shore,emoji:shore,color:shore}}]};
  assert.equal(geometryBoundaryHasValidClosure(certificate),false,'tangent contact is not certified dry');
 }

});

test('GEO2 persisted records reject broken source, topology, contacts and outer authored correspondence atomically',async()=>{
 const {result}=await accepted(),g=result.geometryRefinement;
 const badRefinements=[
  ['future algorithm',x=>x.algorithmVersion='geo2-v2'],
  ['recursive source',x=>x.sourceState.version=4],
  ['invalid fingerprint',x=>x.sourceFingerprint='stale'],
  ['unknown lock',x=>x.lockedPoiIds=['detail-poi:999999']],
  ['duplicate path',x=>x.riverPlan.paths.push(copy(x.riverPlan.paths[0]))],
  ['nonfinite vertex',x=>x.riverPlan.paths[0].points[0].x=Infinity],
  ['nonedge point',x=>x.riverPlan.paths[0].points[1].x+=.01],
  ['broken step',x=>x.riverPlan.paths[0].steps[0].endFraction=.333],
  ['foreign source node',x=>x.riverPlan.paths[0].fromNode='foreign'],
  ['collapsed source ports',x=>x.riverPlan.ports[1]=copy(x.riverPlan.ports[0])],
  ['duplicate side choice',x=>x.sideChoices.push(copy(x.sideChoices[0]))],
  ['wrong chosen side',x=>x.sideChoices[0].chosenSide=x.sideChoices[0].chosenSide==='left'?'right':'left'],
  ['foreign dry road',x=>x.roads.roads.find(r=>!r.crossingKeys.length).roadId=999999],
  ['omitted dry road',x=>x.roads.roads.splice(x.roads.roads.findIndex(r=>!r.crossingKeys.length),1)],
  ['foreign crossing',x=>x.roads.crossings[0].riverId=999999],
  ['moved crossing',x=>x.roads.crossings[0].point.x+=.1],
  ['missing crossing mode',x=>x.riverPlan.mouths.pop()],
  ['omitted all lake mouths',x=>x.riverPlan.mouths=[]],
  ['omitted terminal classification',x=>x.riverPlan.terminations=[]],
  ['offshore mouth',x=>x.riverPlan.mouths[0].point.x+=.1],
  ['foreign contour',x=>x.riverPlan.lakes[0].modes.color.loops[0][0].control.x+=.1],
  ['foreign water owner',x=>x.riverPlan.water.capsules[0].riverId=999999],
  ['duplicate unresolved owner',x=>x.unresolved.push(x.unresolved[0])],
 ];
 for(const [label,mutate]of badRefinements){const raw=copy(g);mutate(raw);const snapshot=JSON.stringify(raw);assert.throws(()=>parseGeometryRefinement(raw,parseDetail1StateV11),undefined,label);assert.equal(JSON.stringify(raw),snapshot,label);}
 const badOuter=[
  ['grid',x=>x.grid.origin.x+=1],
  ['source convention',x=>x.source.physicalConvention=x.source.physicalConvention==='unknown'?'known_across_flats':'unknown'],
  ['identity next id',x=>x.poiIdentities.nextId+=1],
  ['accepted footprint anchor',x=>x.poiFootprints[0].worldAnchor.x+=.01],
  ['accepted footprint cell',x=>x.poiFootprints[0].cells[0].q+=1],
  ['accepted footprint attachment',x=>x.poiFootprints[0].attachments.push({kind:'water',waterKind:'river',waterId:'river:999',segmentId:'foreign',contact:{x:0,y:0}})],
 ];
 for(const [label,mutate]of badOuter){const raw=copy(result.candidateState);mutate(raw);assert.throws(()=>parseDetail1StateV11(raw),undefined,label);}
 const delta=acceptedDelta().result.geometryRefinement,badDelta=[
  ['untyped split',x=>x.riverPlan.source.boundaries.find(b=>b.reason==='split').reason='river_start'],
  ['four-edge split',x=>{const s=x.riverPlan.source.segments.find(s=>s.riverId===2);x.riverPlan.source.segments.push({...copy(s),riverId:3,edgeKey:[s.from.key,'extra'].sort().join('|'),to:{key:'extra',point:{x:10,y:10}}});}],
  ['directed split cycle',x=>{const ss=x.riverPlan.source.segments.filter(s=>s.riverId===1),first=ss.find(s=>!ss.some(p=>p.to.key===s.from.key)),last=ss.find(s=>!ss.some(p=>p.from.key===s.to.key));x.riverPlan.source.segments.push({riverId:3,edgeKey:[last.to.key,first.from.key].sort().join('|'),from:copy(last.to),to:copy(first.from),fullness:1});}],
 ];
 for(const [label,mutate]of badDelta){const raw=copy(delta);mutate(raw);assert.throws(()=>parseGeometryRefinement(raw,parseDetail1StateV11),undefined,label);}
 assert.equal(badDelta.length,3);
 assert.equal(badRefinements.length,23);assert.equal(badOuter.length,6); // Together with3 delta rows:32 malformed rows in one logical case.
});
