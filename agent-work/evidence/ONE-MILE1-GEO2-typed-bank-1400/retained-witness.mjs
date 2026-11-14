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

const {roadPair}=await mod('src/manualRoads.ts');
const {detailCrossingPoint}=await mod('src/detailGeography.ts');
const {refinementWaterIntervals}=await mod('src/geometryRefinementWater.ts');
const parts=[];for(const road of map.roads)for(const s of road.segments){const sourceRoadSegmentKey=roadPair(s.from,s.to),query={from:detailSourcePixelToWorld(h.geometry.toPixel(s.from.q,s.from.r)),to:detailSourcePixelToWorld(h.geometry.toPixel(s.to.q,s.to.r))},wet=refinementWaterIntervals(plan.paintWater,query),hits=[];for(const p of plan.paths)for(let i=1;i<p.points.length;i++){const hit=detailCrossingPoint(query,{from:p.points[i-1],to:p.points[i]});if(hit)hits.push({riverId:p.riverId,sourceEdgeKey:p.sourceEdgeKey,fullness:p.fullness,step:i-1,hit});}const original=map.crossings.filter(c=>c.roadId===road.id&&c.roadSegmentKey===sourceRoadSegmentKey);parts.push({roadId:road.id,sourceRoadSegmentKey,from:s.from,to:s.to,kind:s.kind,wet:wet.intervals.map(w=>({a:w.startFraction,b:w.endFraction,clipped:w.startClipped||w.endClipped,refs:w.contributors})),hits,original});}
const {prepareRefinementRoads}=await mod('src/geometryRefinementRoads.ts');
const landCells=map.regions.flatMap(r=>r.hexes).filter(c=>!['lake','sea'].includes(map.hexTerrainByKey.get(`${c.q},${c.r}`)?.terrainOverride));
const prepared=prepareRefinementRoads({roads:map.roads,crossings:map.crossings,sourceRivers:plan.source.segments,rivers:plan.paths,water:plan.paintWater,origin,landCells,lakes:plan.lakes.flatMap(l=>Object.values(l.modes))});
assert.equal(prepared.status,'prepared',JSON.stringify(prepared));assert.equal(prepared.crossings.length,7);assert.equal(save(),before);
const fordTarget=prepared.crossings.find(c=>c.kind==='bridge'&&c.fullness===2);assert.ok(fordTarget);const ford=prepareRefinementRoads({roads:map.roads,crossings:map.crossings.map(c=>c.key===fordTarget.key?{...c,kind:'ford'}:c),sourceRivers:plan.source.segments,rivers:plan.paths,water:plan.paintWater,origin,landCells,lakes:plan.lakes.flatMap(l=>Object.values(l.modes))});assert.equal(ford.status,'prepared');assert.equal(ford.crossings.find(c=>c.key===fordTarget.key).kind,'ford');assert.equal(save(),before);
const r={fixture:output.fixture,fixture_sha256:output.fixture_sha256,source_segments:53,fine_intervals:432,open_exits:4,roads:map.roads.length,road_segments:parts.length,source_crossings:map.crossings,prepared,ford_variant:{explicit_not_original:true,source_key:fordTarget.key,fullness:fordTarget.fullness,original_kind:fordTarget.kind,result_kind:ford.crossings.find(c=>c.key===fordTarget.key).kind},accepted_save_and_rng_unchanged:true,global_rng_guard:true,activation:false,limitations:['Fixed validated typed bank paths compose with dry approaches; global crossing relocation and continuous completeness remain pending','No actual POI movement or footprint mask in retained world; positive approach/mask cases are synthetic Node examples','No active map/PNG/stroke/dash/rail clipping or public16/history/UI acceptance','Feature-specific POI refs and complete GeometryPlan adapter still pending']};process.stdout.write(JSON.stringify(r,null,2)+'\n');
