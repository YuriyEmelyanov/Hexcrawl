/** Conservative, detached GEO2 boundary preflight. Non-overlapping enclosing
 * boxes prove separation of the supplied model envelopes. Overlap is only a
 * candidate dependency, not a confirmed intersection or permission to reroute.
 * Global physical4 persistence/handler validation is required even on success. */
import {createDetailGrid,detailCellCenter,detailCellPolygon,type WorldPoint} from './detailGrid.ts';
import {detailFootprintPolygons,detailFootprintWorldAnchor,detailFootprintHasOutline,detailPointInPolygon} from './detailSizes.ts';
import {detailCrossingPoint} from './detailGeography.ts';
import {roadPair} from './manualRoads.ts';
import type {DetailPoiFootprint} from './detailModel.ts';
import type {GeometryRefinement,GeometrySourceValidationInput} from './geometryPlan.ts';
import {projectGeometryRefinementSource} from './geometryRefinementScope.ts';
import {prepareRefinementLakeModes,type RefinementLakeInput} from './geometryRefinementMouths.ts';
import {normalizeRefinementRiverSource} from './geometryRefinementSource.ts';
import {prepareRefinementWater,refinementWaterIntervals,refinementWaterContains} from './geometryRefinementWater.ts';
import {refinementShoreContains,refinementShoreIntervals} from './geometryRefinementShore.ts';
import {createRefinementWorkBudget} from './geometryRefinementWork.ts';

type Input=GeometrySourceValidationInput&Readonly<{
 widths:ReadonlyMap<number,number>;lakeInputs:readonly RefinementLakeInput[];
 /** Caller supplies a conservative maximum road stroke/rail half-envelope in
  * model miles. This is not a new physical-width calibration or UI setting. */
 roadPaddingMiles:number;boundaryWorkBudget?:number;
}>;
type Box=Readonly<{ref:string;minX:number;maxX:number;minY:number;maxY:number}>;
const cellKey=(p:{q:number;r:number})=>`${p.q},${p.r}`;
const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
const sameKeys=(a:ReadonlySet<string>,b:ReadonlySet<string>)=>a.size===b.size&&[...a].every(k=>b.has(k));
export function prepareGeometryRefinementBoundary(input:Input,accepted:GeometryRefinement){
 let control:ReturnType<typeof createRefinementWorkBudget>|undefined;
 const fail=(code:string,refs:readonly string[])=>Object.freeze({status:'error' as const,code,refs:Object.freeze([...refs]),completeGeometryPlan:false as const,readyForApplication:false as const,...(control?{workBudget:control.snapshot()}:{})});
 try{
  control=createRefinementWorkBudget(input.boundaryWorkBudget??20000000,input.cancelled);
  const budget=control;budget.enter('scope_projection');
  if(!Number.isFinite(input.roadPaddingMiles)||input.roadPaddingMiles<=0)return fail('invalid_boundary_input',['roadPaddingMiles']);
  // Charge the existing bounded projection separately; these deterministic
  // units are not a wall-clock guarantee or an all-GeometryPlan controller.
  budget.charge(1+accepted.sourceFingerprint.length*2);
  if(input.map.physicalGrid)budget.reserve(input.map.physicalGrid);
  const scope=projectGeometryRefinementSource(input,accepted);
  if(scope.status==='error')return fail(scope.code,scope.refs);
  const ownerIds=new Set(Object.values(scope.globalAuthoredState.poiIdentities?.byLegacyRef??{}));
  if(scope.globalAuthoredState.poiFootprints.length!==ownerIds.size||scope.globalAuthoredState.poiFootprints.some(f=>!ownerIds.has(f.poiId)))return fail('boundary_evidence_missing',['authored POI footprints']);
  const land=new Set(input.map.regions.flatMap(r=>r.hexes.filter(c=>!['lake','sea'].includes(input.map.hexTerrainByKey.get(cellKey(c))?.terrainOverride??'')).map(cellKey)));
  budget.charge(1+input.landCells.length+land.size);
  if(!sameKeys(land,new Set(input.landCells.map(cellKey))))return fail('boundary_evidence_missing',['landCells']);
  budget.enter('source');
  const source=normalizeRefinementRiverSource({rivers:input.map.rivers,marks:input.marks,origin:input.origin,consumeWork:budget.charge});
  if(source.status==='error')return fail(source.code,source.refs);
  const retainedSegments=new Set(accepted.riverPlan.source.segments.map(s=>JSON.stringify([s.riverId,s.edgeKey]))),retainedRegions=new Set(scope.input.map.regions.map(r=>r.id));
  const oldWater=new Set([...scope.input.map.hexTerrainByKey].filter(([,v])=>['lake','sea'].includes(v.terrainOverride??'')).map(([k])=>k));
  const width=(fullness:number)=>{const value=input.widths.get(fullness);if(value===undefined||!Number.isFinite(value)||value<=0)throw Error('invalid_boundary_width');return value;};
  const paths=new Map(accepted.riverPlan.paths.map(p=>[JSON.stringify([p.riverId,p.sourceEdgeKey]),p]));
  for(const c of accepted.riverPlan.water.capsules){budget.charge();const path=paths.get(JSON.stringify([c.riverId,c.sourceEdgeKey]));if(!path||Math.abs(c.radius*2-width(path.fullness))>1e-9)return fail('boundary_source_changed',[`river:${c.riverId}`,c.sourceEdgeKey,'width']);}
  const grid=createDetailGrid(6,input.origin),riverParts=new Map(source.segments.map(s=>[JSON.stringify([s.riverId,s.edgeKey]),s])),roadParts=new Map<string,Readonly<{from:WorldPoint;to:WorldPoint}>>();
  for(const road of input.map.roads)for(const part of road.segments){budget.charge();const ref=JSON.stringify([road.id,roadPair(part.from,part.to)]);if(roadParts.has(ref))return fail('invalid_boundary_input',[`road:${road.id}`,'duplicate part']);roadParts.set(ref,{from:detailCellCenter(grid,part.from),to:detailCellCenter(grid,part.to)});}
  for(const c of scope.outside.crossings){budget.charge();const river=riverParts.get(JSON.stringify([c.riverId,c.riverEdgeKey])),road=roadParts.get(JSON.stringify([c.roadId,c.roadSegmentKey]));if(!river||!road)return fail('boundary_evidence_missing',[`crossing:${c.key}`]);if(!detailCrossingPoint({from:river.from.point,to:river.to.point},road))return fail('invalid_boundary_input',[`crossing:${c.key}`,'no transverse source contact']);}

  budget.enter('water_bodies');
  const lakeCells=new Map<number,Set<string>>(),seaOwners=new Map<string,number>(),seaIds=new Set<number>();
  for(const [key,v]of input.map.hexTerrainByKey){budget.charge();if(v.terrainOverride==='lake'){if(!Number.isSafeInteger(v.lakeId)||(v.lakeId??0)<1)return fail('invalid_boundary_input',[`lake:${key}`]);const cells=lakeCells.get(v.lakeId!)??new Set<string>();cells.add(key);lakeCells.set(v.lakeId!,cells);}}
  for(const sea of input.map.seas){budget.charge();if(!Number.isSafeInteger(sea.id)||sea.id<1||seaIds.has(sea.id))return fail('invalid_boundary_input',[`sea:${sea.id}`]);seaIds.add(sea.id);for(const key of sea.hexKeys){budget.charge();if(seaOwners.has(key)||input.map.hexTerrainByKey.get(key)?.terrainOverride!=='sea')return fail('invalid_boundary_input',[`sea:${sea.id}`,key]);seaOwners.set(key,sea.id);}}
  if(input.lakeInputs.length>4096)return fail('boundary_capacity',['lakes']);
  const suppliedLakes=new Set<number>();
  for(const lake of input.lakeInputs){budget.charge(1+lake.cells.length);if(suppliedLakes.has(lake.lakeId)||lake.origin.x!==input.origin.x||lake.origin.y!==input.origin.y||!sameKeys(lakeCells.get(lake.lakeId)??new Set(),new Set(lake.cells.map(cellKey))))return fail('invalid_boundary_input',[`lake:${lake.lakeId}`,'body_source']);suppliedLakes.add(lake.lakeId);}
  if(lakeCells.size!==suppliedLakes.size||[...lakeCells.keys()].some(id=>!suppliedLakes.has(id)))return fail('boundary_evidence_missing',['lakeInputs']);
  const bodies=prepareRefinementLakeModes(input.lakeInputs,budget.charge);if(bodies.status==='error')return fail(bodies.code,bodies.refs);
  const oldLakes=new Map(accepted.riverPlan.lakes.map(l=>[l.lakeId,l]));
  for(const lake of bodies.lakes){const old=oldLakes.get(lake.lakeId);if(old)for(const mode of ['tiles','emoji','color'] as const)if(old.modes[mode].signature!==lake.modes[mode].signature)return fail('boundary_source_changed',[`lake:${lake.lakeId}`,mode]);}

  budget.enter('envelopes');
  const retained:Box[]=[],added:Box[]=[],coarse=createDetailGrid(6,input.origin),fine=createDetailGrid(1,input.origin);
  const add=(target:Box[],ref:string,points:readonly WorldPoint[],padding=0)=>{
   budget.charge(1+points.length);if(!points.length)throw Error('invalid_boundary_envelope');
   let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
   for(const p of points){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('invalid_boundary_envelope');minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
   const box={ref,minX:minX-padding,maxX:maxX+padding,minY:minY-padding,maxY:maxY+padding};
   if(![box.minX,box.maxX,box.minY,box.maxY].every(Number.isFinite))throw Error('invalid_boundary_envelope');
   if(retained.length+added.length>=100000)throw Error('boundary_capacity');target.push(Object.freeze(box));
  };
  // Closed support boxes include shared boundary/terminal neighborhoods. This
  // deliberately sends touching domains to closure, rather than certifying a
  // former open source terminal after its unknown neighbour became generated.
  for(const region of input.map.regions)for(const cell of region.hexes)add(retainedRegions.has(region.id)?retained:added,`region:${region.id}`,detailCellPolygon(coarse,cell));
  for(const [key,v]of input.map.hexTerrainByKey)if(v.terrainOverride==='lake'||v.terrainOverride==='sea'){
   const [q,r]=key.split(',').map(Number),id=v.terrainOverride==='lake'?v.lakeId:seaOwners.get(key);
   if(id===undefined)return fail('boundary_evidence_missing',[`sea:${key}`]);
   add(oldWater.has(key)?retained:added,`${v.terrainOverride}:${id}`,detailCellPolygon(coarse,{q,r}));
  }
  for(const lake of bodies.lakes)for(const mode of ['tiles','emoji','color'] as const){const shape=lake.modes[mode];add(oldLakes.has(lake.lakeId)?retained:added,`lake:${lake.lakeId}`,shape.loops.flatMap(loop=>loop.flatMap(c=>[c.from,c.control,c.to])));}
  // The quadratic control hull encloses every point of each actual lake mode;
  // round segment capsules enclose finite river joins/caps, without width/sin.
  for(const c of accepted.riverPlan.water.capsules)add(retained,`river:${c.riverId}`,[c.from,c.to],c.radius);
  // Include source6 and stored fine geometry: switching overview must not
  // turn a separated persisted snapshot into a new untyped contact.
  for(const p of geometryMixedRiverPaths(source,accepted))add(added,`river:${p.riverId}`,p.points,width(p.fullness)/2);
  for(const s of source.segments)add(retainedSegments.has(JSON.stringify([s.riverId,s.edgeKey]))?retained:added,`river:${s.riverId}`,[s.from.point,s.to.point],width(s.fullness)/2);
  for(const r of accepted.roads.roads)add(retained,`road:${r.roadId}`,r.points,input.roadPaddingMiles);
  const retainedParts=new Set(scope.input.map.roads.flatMap(r=>r.segments.map(s=>JSON.stringify([r.id,roadPair(s.from,s.to)]))));
  for(const road of input.map.roads)for(const s of road.segments)add(retainedParts.has(JSON.stringify([road.id,roadPair(s.from,s.to)]))?retained:added,`road:${road.id}`,[detailCellCenter(coarse,s.from),detailCellCenter(coarse,s.to)],input.roadPaddingMiles);
  const poi=(target:Box[],f:DetailPoiFootprint)=>{
   const anchor=detailFootprintWorldAnchor(f,fine),polygons=detailFootprintPolygons(f,fine);
   add(target,`POI:${f.poiId}`,[anchor,...polygons.flat(),...f.cells.flatMap(c=>detailCellPolygon(fine,c)),...f.attachments.map(a=>a.kind==='water'?a.contact:a.entry)]);
  };
  const refined=new Map(accepted.pois.pois.map(p=>[p.poiId,p.footprint]));
  for(const f of scope.input.map.physicalGrid.poiFootprints)poi(retained,refined.get(f.poiId)??f);
  for(const f of scope.outside.authoredFootprints)poi(added,f);
  const compare=(a:Box,b:Box)=>lexical(a.ref,b.ref)||a.minX-b.minX||a.minY-b.minY||a.maxX-b.maxX||a.maxY-b.maxY;
  retained.sort(compare);added.sort(compare);budget.enter('overlap_candidates');
  const candidates=new Map<string,Readonly<{retainedRef:string;addedRef:string}>>();
  for(const a of retained)for(const b of added){budget.charge();const tolerance=1e-8+Number.EPSILON*64*Math.max(1,Math.abs(a.minX),Math.abs(a.maxX),Math.abs(a.minY),Math.abs(a.maxY),Math.abs(b.minX),Math.abs(b.maxX),Math.abs(b.minY),Math.abs(b.maxY));
   if(a.minX>b.maxX+tolerance||b.minX>a.maxX+tolerance||a.minY>b.maxY+tolerance||b.minY>a.maxY+tolerance)continue;
   const key=JSON.stringify([a.ref,b.ref]);if(!candidates.has(key)){if(candidates.size>=4096)throw Error('boundary_capacity');candidates.set(key,Object.freeze({retainedRef:a.ref,addedRef:b.ref}));}
  }
  const pairs=Object.freeze([...candidates.values()].sort((a,b)=>lexical(a.retainedRef,b.retainedRef)||lexical(a.addedRef,b.addedRef)));
  return Object.freeze({status:'prepared' as const,boundaryValidation:pairs.length?'dependency_closure_required' as const:'disjoint_model_envelopes' as const,potentialDependencies:pairs,confirmedIntersections:false as const,scope,source,accepted,widths:input.widths,bodies:bodies.lakes,counts:Object.freeze({retainedEnvelopes:retained.length,addedEnvelopes:added.length}),roadPaddingMiles:input.roadPaddingMiles,workBudget:budget.snapshot(),completeGeometryPlan:false as const,readyForApplication:false as const,globalPersistenceValidation:'required' as const});
 }catch(error){return fail(error instanceof Error?error.message:'invalid_boundary_input',[]);}
}

/** An empty mixed closure can be certified when the ONLY box candidates are
 * land-support pairs. Distinct integer axial cells in the same regular6 grid
 * have disjoint interiors, including adjacent cells with a shared edge. The
 * projection rejects shared cells; feature/graph seams stay outside this
 * empty certificate and require the exact mixed validator below.
 * Every source/fine river capsule (including terminal caps), road/rail bound,
 * POI/attachment and all-mode water contour was also compared with the full
 * opposite support: any potential feature contact keeps the closure pending.
 * This certificate never resolves a feature pair or authorizes its movement.
 * Bound embedding coordinates conservatively to avoid a floating-point alias
 * being called a support seam. No rerouting, RNG, new domain refinement, or
 * bypass of the full global document validation is implied. */
export function geometryBoundaryHasEmptyClosure(result:ReturnType<typeof prepareGeometryRefinementBoundary>):boolean {
 if(result.status!=='prepared')return false;
 if(result.boundaryValidation==='disjoint_model_envelopes')return true;
 if(!result.potentialDependencies.length||result.potentialDependencies.some(p=>!p.retainedRef.startsWith('region:')||!p.addedRef.startsWith('region:')))return false;
 const {scope}=result,origin=scope.input.origin;
 if(!Number.isFinite(origin.x)||!Number.isFinite(origin.y)||Math.abs(origin.x)>1000000||Math.abs(origin.y)>1000000)return false;
 const valid=(c:{q:number;r:number})=>Number.isSafeInteger(c.q)&&Number.isSafeInteger(c.r)&&Math.abs(c.q)<=1000000&&Math.abs(c.r)<=1000000;
 const retained=new Set<string>();
 for(const region of scope.input.map.regions)for(const cell of region.hexes){if(!valid(cell))return false;retained.add(cellKey(cell));}
 const added=new Set<string>();
 for(const region of scope.outside.regions)for(const cell of region.hexes){const k=cellKey(cell);if(!valid(cell)||retained.has(k)||added.has(k))return false;added.add(k);}
 return true;
}


/** Direct view projection, never a route search. New source segments stay
 * generalized; only endpoints incident to stored fine ports are substituted.
 * Both source map and stored port are already persisted in public16. */
export function geometryMixedRiverPaths(source:Extract<ReturnType<typeof normalizeRefinementRiverSource>,{status:'prepared'}>,accepted:GeometryRefinement){
 const retained=new Set(accepted.riverPlan.paths.map(p=>JSON.stringify([p.riverId,p.sourceEdgeKey]))),ports=new Map(accepted.riverPlan.ports.map(p=>[p.sourceKey,p.point]));
 const sourceNodes=new Set(accepted.riverPlan.source.segments.flatMap(s=>[s.from.key,s.to.key]));
 const continued=new Set(source.segments.filter(s=>!retained.has(JSON.stringify([s.riverId,s.edgeKey]))).flatMap(s=>[s.from.key,s.to.key].filter(k=>sourceNodes.has(k))));
 return source.segments.filter(s=>!retained.has(JSON.stringify([s.riverId,s.edgeKey]))).map(s=>Object.freeze({riverId:s.riverId,sourceEdgeKey:s.edgeKey,fullness:s.fullness,points:Object.freeze([continued.has(s.from.key)?ports.get(s.from.key)!:s.from.point,continued.has(s.to.key)?ports.get(s.to.key)!:s.to.point])}));
}

/** Validate the mixed model without searching or rewriting stored geometry.
 * Box candidates are only a broad phase. Land support may touch; actual new
 * water/road/POI contacts need exact graph incidence or typed crossings. */
export function geometryBoundaryHasValidClosure(result:ReturnType<typeof prepareGeometryRefinementBoundary>):boolean {
 if(geometryBoundaryHasEmptyClosure(result)&&!(result.status==='prepared'&&result.accepted.riverPlan.terminations.some(t=>t.kind==='continuation')))return true;
 if(result.status!=='prepared')return false;
 try{
  const {scope,source,accepted,widths}=result,origin=scope.input.origin;
  const budget=createRefinementWorkBudget(20000000,scope.input.cancelled);budget.enter('mixed_closure');
  const coarse=createDetailGrid(6,origin),fine=createDetailGrid(1,origin);
  const oldCells=new Set(scope.input.map.regions.flatMap(r=>r.hexes.map(cellKey))),newCells=scope.outside.regions.flatMap(r=>r.hexes);
  if(!Number.isFinite(origin.x)||!Number.isFinite(origin.y)||Math.abs(origin.x)>1000000||Math.abs(origin.y)>1000000||newCells.some(c=>!Number.isSafeInteger(c.q)||!Number.isSafeInteger(c.r)||Math.abs(c.q)>1000000||Math.abs(c.r)>1000000||oldCells.has(cellKey(c)))||new Set(newCells.map(cellKey)).size!==newCells.length)return false;
  const ref=(riverId:number,edgeKey:string)=>JSON.stringify([riverId,edgeKey]);
  const retained=new Map(accepted.riverPlan.source.segments.map(s=>[ref(s.riverId,s.edgeKey),s]));
  const added=source.segments.filter(s=>!retained.has(ref(s.riverId,s.edgeKey)));
  const addedWater=prepareRefinementWater({paths:geometryMixedRiverPaths(source,accepted),widthByFullness:widths,consumeWork:budget.charge});
  if(addedWater.status!=='prepared')return false;
  const distance=(a:WorldPoint,b:WorldPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
  // A coarse/fine correspondence uses a persisted nearby edge port, not a
  // fabricated lattice vertex at a coarse corner. Both domains share that port.
  for(const key of scope.continuationKeys){budget.charge(source.segments.length);
   const links=source.segments.filter(s=>s.from.key===key||s.to.key===key),old=links.filter(s=>retained.has(ref(s.riverId,s.edgeKey))),next=links.filter(s=>!retained.has(ref(s.riverId,s.edgeKey)));
   const incoming=links.filter(s=>s.to.key===key),outgoing=links.filter(s=>s.from.key===key);
   if(![1,2].includes(old.length)||!next.length||links.length>3||outgoing.length!==1||incoming.length<1||incoming.length>2)return false;
   if(incoming.length===1&&incoming[0].fullness!==outgoing[0].fullness)return false;
   if(incoming.length===2){const a=Math.max(...incoming.map(s=>s.fullness)),b=Math.min(...incoming.map(s=>s.fullness)),f=outgoing[0].fullness;if(f!==a&&!(a<5&&b>=a-1&&f===a+1))return false;}
   const sourcePoint=old[0].from.key===key?old[0].from.point:old[0].to.point,port=accepted.riverPlan.ports.find(p=>p.sourceKey===key),terminal=accepted.riverPlan.terminations.find(t=>t.sourceKey===key);
   if(!port||distance(port.point,sourcePoint)>1+1e-8||old.length===1&&(terminal?.kind!=='continuation'||terminal.hydrologyNodeId!==key)||old.length===2&&terminal)return false;
  }
  for(const t of accepted.riverPlan.terminations)if(t.kind==='continuation'&&!scope.continuationKeys.has(t.sourceKey))return false;
  // Reject unintended joins, including finite-width contact of independent
  // rivers. A declared graph seam permits the ordinary joined water envelope,
  // but never a second centerline intersection or a collinear overlap.
  for(const a of addedWater.capsules)for(const b of accepted.riverPlan.water.capsules){budget.charge();
   const query={from:a.from,to:a.to},expanded={status:'prepared' as const,capsules:[{...b,radius:a.radius+b.radius}],completeGeometryPlan:false as const},wet=refinementWaterIntervals(expanded,query);
   if(wet.status!=='prepared')return false;if(!wet.intervals.length)continue;
   const os=retained.get(ref(b.riverId,b.sourceEdgeKey))!,ns=added.find(s=>s.riverId===a.riverId&&s.edgeKey===a.sourceEdgeKey)!;
   const shared=[os.from,os.to].filter(n=>n.key===ns.from.key||n.key===ns.to.key).find(n=>scope.continuationKeys.has(n.key));
   if(!shared)return false;
   const sharedPort=accepted.riverPlan.ports.find(p=>p.sourceKey===shared.key)!.point;
   const hit=detailCrossingPoint(query,{from:b.from,to:b.to});if(hit&&distance(hit,sharedPort)>1e-8)return false;
   const cross=a.ux*b.uy-a.uy*b.ux;
   if(Math.abs(cross)<1e-10){const cut=refinementWaterIntervals({...expanded,capsules:[{...b,radius:1e-9}]},query);if(cut.status!=='prepared'||cut.intervals.some(i=>distance(i.from,i.to)>1e-7))return false;}
  }
  // Check an actual polyline against the opposite water. No new crossing is
  // inferred from proximity. Only its exact source river/edge and road/part
  // identity, legal kind and transverse, dry-to-dry interval authorize water.
  const checkRoad=(roadId:number,part:string,points:readonly WorldPoint[],water:typeof accepted.riverPlan.water)=>{
   for(let i=1;i<points.length;i++){budget.charge(water.capsules.length+scope.input.map.crossings.length+scope.outside.crossings.length);
    const query={from:points[i-1],to:points[i]},wet=refinementWaterIntervals(water,query);if(wet.status!=='prepared')return false;
    for(const interval of wet.intervals){if(interval.touchOnly)continue;
     for(const c of interval.contributors){const crossing=[...scope.input.map.crossings,...scope.outside.crossings].find(x=>x.roadId===roadId&&x.roadSegmentKey===part&&x.riverId===c.riverId&&x.riverEdgeKey===c.sourceEdgeKey),river=source.segments.find(s=>s.riverId===c.riverId&&s.edgeKey===c.sourceEdgeKey);
      if(!crossing||!river||!['bridge','ferry','ford'].includes(crossing.kind)||crossing.kind==='ford'&&river.fullness>2||interval.startClipped||interval.endClipped)return false;
      const hits=water.capsules.filter(p=>p.riverId===c.riverId&&p.sourceEdgeKey===c.sourceEdgeKey).map(p=>detailCrossingPoint(query,p)).filter((p):p is WorldPoint=>!!p);
      if(!hits.length)return false;
     }
    }
   }return true;
  };
  for(const r of accepted.roads.roads)if(!checkRoad(r.roadId,r.sourceRoadSegmentKey,r.points,addedWater))return false;
  for(const r of scope.outside.roads)for(const s of r.segments){budget.charge(accepted.roads.roads.length);
   const points=[detailCellCenter(coarse,s.from),detailCellCenter(coarse,s.to)];
   const mixedWater={...accepted.riverPlan.paintWater,capsules:[...accepted.riverPlan.paintWater.capsules,...addedWater.capsules]};
   if(!checkRoad(r.id,roadPair(s.from,s.to),points,mixedWater))return false;
   // A new approach must meet the actual retained endpoint, not the coarse
   // center of a POI that moved during refinement. Such a contact needs replan.
   for(const old of accepted.roads.roads){const sourcePart=scope.input.map.roads.find(x=>x.id===old.roadId)?.segments.find(p=>roadPair(p.from,p.to)===old.sourceRoadSegmentKey);if(!sourcePart)return false;
    const shared=[s.from,s.to].filter(c=>cellKey(c)===cellKey(sourcePart.from)||cellKey(c)===cellKey(sourcePart.to)).map(c=>detailCellCenter(coarse,c));
    for(const point of shared)if(![old.points[0],old.points[old.points.length-1]].some(p=>distance(p,point)<1e-8))return false;
    for(let i=1;i<old.points.length;i++){budget.charge();
     const dx=points[1].x-points[0].x,dy=points[1].y-points[0].y,len=Math.hypot(dx,dy),u=old.points[i-1],v=old.points[i],ox=v.x-u.x,oy=v.y-u.y;
     if(Math.abs(dx*oy-dy*ox)<=1e-10*len*Math.hypot(ox,oy)&&Math.abs(dx*(u.y-points[0].y)-dy*(u.x-points[0].x))<=1e-8*len){const a=((u.x-points[0].x)*dx+(u.y-points[0].y)*dy)/(len*len),b=((v.x-points[0].x)*dx+(v.y-points[0].y)*dy)/(len*len);if((Math.min(1,Math.max(a,b))-Math.max(0,Math.min(a,b)))*len>1e-8)return false;}
     const hit=detailCrossingPoint({from:points[0],to:points[1]},{from:old.points[i-1],to:old.points[i]});if(hit&&!shared.some(p=>distance(p,hit)<1e-8))return false;}

   }
  }
  const checkPoi=(f:DetailPoiFootprint,water:typeof accepted.riverPlan.water)=>{
   budget.charge(1+water.capsules.length);const p=detailFootprintWorldAnchor(f,fine),at=refinementWaterContains(water,p);if(at.status!=='prepared'||at.inside)return false;
   // Geometry footprints are real occupied space. Unknown marker icons have
   // no model radius and cannot authorize a new contact with water.
   const polygons=f.extent.kind==='measured_polygon'||f.extent.kind==='manual_size'||detailFootprintHasOutline(f,fine)?detailFootprintPolygons(f,fine):[];
   for(const polygon of polygons){budget.charge(water.capsules.length*polygon.length);if(water.capsules.some(c=>detailPointInPolygon(c.from,polygon)||detailPointInPolygon(c.to,polygon)))return false;}
   for(const polygon of polygons)for(let i=0;i<polygon.length;i++){budget.charge(water.capsules.length);const cut=refinementWaterIntervals(water,{from:polygon[i],to:polygon[(i+1)%polygon.length]});if(cut.status!=='prepared'||cut.intervals.some(x=>!x.touchOnly))return false;}
   return true;
  };
  const refined=new Map(accepted.pois.pois.map(p=>[p.poiId,p.footprint]));
  for(const f of scope.input.map.physicalGrid.poiFootprints)if(!checkPoi(refined.get(f.poiId)??f,addedWater))return false;
  const mixedWater={...accepted.riverPlan.paintWater,capsules:[...accepted.riverPlan.paintWater.capsules,...addedWater.capsules]};
  for(const f of scope.outside.authoredFootprints)if(!checkPoi(f,mixedWater))return false;
  // The full current body and all lake mode signatures were validated above.
  // A shoreline may overlap empty opposite-region support: that support is
  // not an occupied feature. The enclosing mode hulls, source/fine water,
  // road strokes/rails and POI extents were all compared in both directions.
  // Support/body pairs and certified dry unbound catalogue markers may pass.
  // Other potential feature/body contacts remain explicit conflicts, never
  // movement grants.
  const body=(ref:string)=>/^(lake|sea):/.test(ref),support=(ref:string)=>ref.startsWith('region:');
  const footprints=new Map([...scope.input.map.physicalGrid.poiFootprints.map(f=>refined.get(f.poiId)??f),...scope.outside.authoredFootprints].map(f=>[f.poiId,f]));
  const dryMarker=(bodyRef:string,otherRef:string)=>{
   if(!bodyRef.startsWith('lake:')||!otherRef.startsWith('POI:'))return false;
   const lake=result.bodies.find(l=>l.lakeId===Number(bodyRef.slice(5))),f=footprints.get(otherRef.slice(4));
   // Resolve only an unbound known catalogue marker, without moving it or
   // inventing a size for unknown/measured/locked/attached geometry.
   if(!lake||!f||accepted.lockedPoiIds.includes(f.poiId)||f.attachments.length||f.cells.length!==1||f.extent.kind!=='representative'||f.extent.representativeExtentMiles===null||f.extent.representativeExtentMiles>=1)return false;
   const anchor=detailFootprintWorldAnchor(f,fine),polygons=detailFootprintPolygons(f,fine);
   for(const mode of ['tiles','emoji','color'] as const){
    const shape=lake.modes[mode],curves=shape.loops.reduce((n,l)=>n+l.length,0);
    budget.charge((1+curves)**2*(1+polygons.reduce((n,p)=>n+p.length,0)));
    if(refinementShoreContains(shape,anchor))return false;
    for(const polygon of polygons){
     if(polygon.some(p=>refinementShoreContains(shape,p))||shape.loops.some(loop=>loop.some(c=>detailPointInPolygon(c.from,polygon))))return false;
     for(let i=0;i<polygon.length;i++){
      const cut=refinementShoreIntervals(shape,{from:polygon[i],to:polygon[(i+1)%polygon.length]});
      if(cut.status!=='prepared'||cut.intervals.length)return false;
     }
    }
   }
   return true;
  };
  if(result.potentialDependencies.some(p=>body(p.retainedRef)&&!support(p.addedRef)&&!dryMarker(p.retainedRef,p.addedRef)||body(p.addedRef)&&!support(p.retainedRef)&&!dryMarker(p.addedRef,p.retainedRef)))return false;
  return true;
 }catch{return false;}
}
