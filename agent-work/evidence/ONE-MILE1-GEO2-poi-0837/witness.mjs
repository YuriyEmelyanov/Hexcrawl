import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
// Run with Node24: node witness.mjs /absolute/path/to/exact-checkout
const root=path.resolve(process.argv[2]??process.cwd());
const mod=p=>import(pathToFileURL(path.join(root,p)).href);
const {createGenerationHarness}=await mod('test/helpers/generation-harness.mjs');
const {projectOneMile}=await mod('src/oneMile.ts');
const {detailSourcePixelToWorld}=await mod('src/detailGeography.ts');
const {buildNaturalLakes}=await mod('src/rendering/lakeGeometry.ts');
const {prepareRefinementMouths,refinementRiverPaintIntervals}=await mod('src/geometryRefinementMouths.ts');
const {refinementShoreContains}=await mod('src/geometryRefinementShore.ts');
const hash=s=>createHash('sha256').update(s).digest('hex');
const fixture=fs.readFileSync(path.join(root,'test/fixtures/road-entry-zigzags.json'),'utf8');
const h=createGenerationHarness(42);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:fixture}],value:'map'}});
const a=h.render(),map=a.captureDocument().map,save=()=>{const d=JSON.parse(JSON.stringify(a.createSaveData()));delete d.savedAt;return JSON.stringify(d);},before=save(),origin={x:0,y:0};
const hydrology=h.geometry.buildRegionRiverNetwork(map.rivers,map.rivers,map.regions,map.candidateHexes,map.hexTerrainByKey,true);
const input={rivers:map.rivers,marks:h.geometry.regionMarkKeys(map),origin,cells:projectOneMile(h.geometry.oneMileSources(map)).map(c=>c.cell),seed:423493684};
const widths=new Map([1,2,3,4,5].map(f=>[f,detailSourcePixelToWorld({x:h.geometry.getRiverWidth(h.geometry.getHexWidth(28),f),y:0}).x]));
const lakes=h.geometry.getLakesForRegions(map.regions,map.hexTerrainByKey).map(l=>{const shapes=buildNaturalLakes(l.hexes.map(c=>({...c,...h.geometry.toPixel(c.q,c.r),lakeId:l.lakeId})),28,map.toponymSeed,[]);assert.equal(shapes.length,1);return {lakeId:l.lakeId,cells:[...l.hexes],colorPath:shapes[0].path,colorScale:detailSourcePixelToWorld({x:1,y:0}).x,origin};});
const plan=prepareRefinementMouths(input,{hydrology,candidates:map.candidateHexes},widths,lakes);assert.equal(plan.status,'prepared',JSON.stringify(plan));
const masks=[];
for(const mode of ['tiles','emoji','color']){let queries=0,visibleIntervals=0;for(const c of plan.paintWater.capsules){const mid={x:(c.from.x+c.to.x)/2,y:(c.from.y+c.to.y)/2},span=c.radius*4,query={from:{x:mid.x-c.uy*span,y:mid.y+c.ux*span},to:{x:mid.x+c.uy*span,y:mid.y-c.ux*span}},cut=refinementRiverPaintIntervals(plan,query,mode);assert.equal(cut.status,'prepared');queries++;visibleIntervals+=cut.intervals.length;for(const row of cut.intervals){const p={x:(row.from.x+row.to.x)/2,y:(row.from.y+row.to.y)/2};assert.ok(plan.lakes.every(l=>!refinementShoreContains(l.modes[mode],p)));}}masks.push({mode,queries,visibleIntervals,interval_midpoints_outside_all_lakes:true});}
const noLake=prepareRefinementMouths(input,{hydrology,candidates:map.candidateHexes},widths,[]);
const remote=prepareRefinementMouths(input,{hydrology,candidates:map.candidateHexes},widths,lakes.map(l=>({...l,colorPath:'M100000 100000L100001 100000L100001 100001L100000 100001Z'})));
assert.equal(noLake.status,'error');assert.equal(remote.status,'error');assert.equal(noLake.paths,undefined);assert.equal(remote.paths,undefined);assert.equal(save(),before);
const output={fixture:'test/fixtures/road-entry-zigzags.json',fixture_sha256:hash(fixture),fine_cells:input.cells.length,source_segments:plan.source.segments.length,source_nodes:plan.ports.length,paths:plan.paths.length,fine_intervals:plan.paths.reduce((n,p)=>n+p.steps.length,0),capsules:plan.water.capsules.length,paint_capsules:plan.paintWater.capsules.length,internal_lake_edge_keys:[...hydrology.internalLakeEdges.keys()],open_exits:plan.ports.filter(p=>p.sourceExitRef).length,actual_rapids:plan.rapids.length,actual_waterfalls:plan.waterfalls.length,widths:Object.fromEntries(widths),lake_shapes:plan.lakes.map(l=>({lakeId:l.lakeId,modes:Object.fromEntries(Object.entries(l.modes).map(([m,b])=>[m,{loops:b.loops.length,depths:b.depths,shore_signature_sha256:hash(b.signature)}]))})),mouths:plan.mouths,masks,atomic_failures:{missing_lake:noLake,nonoverlapping_color_body:remote},accepted_source_save_unchanged:true,global_rng_guard:true,completeGeometryPlan:plan.completeGeometryPlan,activation:false,limits:['Original fixture has one outlet, no actual inlet','No runtime/rendering/PNG/rotation acceptance','Sequential source-plus-one-ring endpoint routing; nonterminal lake incidences reject','Query-space mask only; POI/road/crossing/public16/history/UI pending']};

const {refinementNearestRiverBank}=await mod('src/geometryRefinementBanks.ts');
const {prepareRefinementPois}=await mod('src/geometryRefinementPois.ts');
const {detailPoiWaterRequirement}=await mod('src/detailGeography.ts');
const {poiNameLocators}=await mod('src/manualPois.ts');
const {createDetailGrid,worldToDetailCell,detailCellCenter}=await mod('src/detailGrid.ts');
const {refinementWaterContains}=await mod('src/geometryRefinementWater.ts');
const inventory=[...poiNameLocators(map,true)].sort().map(alias=>({alias,...detailPoiWaterRequirement(map,alias)}));
const land=new Set(map.regions.flatMap(r=>r.hexes.map(c=>`${c.q},${c.r}`))),lakeMasks=plan.lakes.flatMap(l=>Object.values(l.modes)),bankQueries=[],tested=new Set();
for(const c of plan.paintWater.capsules){const point={x:(c.from.x+c.to.x)/2,y:(c.from.y+c.to.y)/2},parent6=worldToDetailCell(createDetailGrid(6),point),key=`${c.riverId}:${c.sourceEdgeKey}:${parent6.q},${parent6.r}`;if(!land.has(`${parent6.q},${parent6.r}`)||tested.has(key))continue;tested.add(key);const bank=refinementNearestRiverBank(plan.paintWater,{point,parent6,origin,riverId:c.riverId,sourceEdgeKey:c.sourceEdgeKey,lakes:lakeMasks});assert.equal(bank.status,'prepared',JSON.stringify(bank));if(bank.contact){assert.ok(Math.abs(refinementWaterContains(plan.paintWater,bank.contact.point).clearance)<1e-7);bankQueries.push({query:point,parent6,contact:bank.contact,primitive_intersections:bank.work});}if(bankQueries.length===10)break;}
assert.ok(bankQueries.length);assert.equal(save(),before);
const fine=createDetailGrid(1),known={provenance:'knave_source_row',requirement:'river',predicates:['dry_hex','river_contact']},unknown={provenance:'unknown',requirement:'none',predicates:[]},riverRef={riverId:1,sourceEdgeKey:'test-edge'},smallWater=(await mod('src/geometryRefinementWater.ts')).prepareRefinementWater({paths:[{riverId:1,sourceEdgeKey:'test-edge',fullness:1,points:[{x:-4,y:0},{x:4,y:0}]}],widthByFullness:new Map([[1,1]])}),cells=[{q:-1,r:2},{q:0,r:2}],anchor={x:.5,y:Math.sqrt(3)},footprint={poiId:'synthetic-whole',legacyRef:null,worldAnchor:anchor,cells,extent:{kind:'manual',basis:'conditional',note:'explicit synthetic two-cell shape'},attachments:cells.map((c,i)=>({kind:'route',routeKind:'road',routeId:`road:${i+1}`,accessNodeId:`port:${i+1}`,entry:detailCellCenter(fine,c)}))},syntheticRequest={footprint,parent6:{q:0,r:0},requirement:known,riverRef,side:1};
const synthetic=prepareRefinementPois({water:smallWater,origin,requests:[syntheticRequest,{...syntheticRequest,footprint:{...footprint,poiId:'synthetic-unknown'},requirement:unknown}]}),locked=prepareRefinementPois({water:smallWater,origin,requests:[{...syntheticRequest,locked:true}]}),feature=prepareRefinementPois({water:smallWater,origin,requests:[{...syntheticRequest,requirement:{...known,requirement:'rapid',predicates:['river_rapids']}}]});
assert.equal(synthetic.status,'prepared');assert.equal(locked.status,'error');assert.equal(locked.pois,undefined);assert.equal(feature.status,'error');
const result={fixture:output.fixture,fixture_sha256:output.fixture_sha256,source_segments:output.source_segments,paths:output.paths,fine_intervals:output.fine_intervals,open_exits:output.open_exits,actual_requirement_inventory:inventory,actual_known_river_required_count:inventory.filter(p=>p.provenance!=='unknown'&&['river','rapid','waterfall','crossing'].includes(p.requirement)).length,actual_bank_queries:bankQueries,synthetic_placement:{scope:'Explicit contract example, not an eligible POI from the actual retained world',result:synthetic},atomic_errors:{locked,feature_specific_pending:feature},accepted_save_and_rng_unchanged:save()===before,global_rng_guard:true,activation:false,completeGeometryPlan:false,limits:['No automatic movement claim for actual unknown catalogue-town requirements','Rapid/waterfall/crossing-specific contacts pending adapted mark/crossing phase','Accepted-land parent and stable source refs are phase inputs; full map/POI validation remains in GeometryPlan integration','Whole footprints use rigid integer-grid translations; marker nearest bank is continuous','Road entries translated as candidates; actual road graph/masks/public16/history/UI still pending']};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
