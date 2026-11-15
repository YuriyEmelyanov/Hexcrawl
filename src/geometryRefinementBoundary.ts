/** Conservative, detached GEO2 boundary preflight. Non-overlapping enclosing
 * boxes prove separation of the supplied model envelopes. Overlap is only a
 * candidate dependency, not a confirmed intersection or permission to reroute.
 * Global physical4 persistence/handler validation is required even on success. */
import {createDetailGrid,detailCellCenter,detailCellPolygon,type WorldPoint} from './detailGrid.ts';
import {detailFootprintPolygons,detailFootprintWorldAnchor} from './detailSizes.ts';
import {detailCrossingPoint} from './detailGeography.ts';
import {roadPair} from './manualRoads.ts';
import type {DetailPoiFootprint} from './detailModel.ts';
import type {GeometryRefinement,GeometrySourceValidationInput} from './geometryPlan.ts';
import {projectGeometryRefinementSource} from './geometryRefinementScope.ts';
import {prepareRefinementLakeModes,type RefinementLakeInput} from './geometryRefinementMouths.ts';
import {normalizeRefinementRiverSource} from './geometryRefinementSource.ts';
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
  const retainedRivers=new Set(scope.input.map.rivers.map(r=>r.id)),retainedRegions=new Set(scope.input.map.regions.map(r=>r.id)),retainedRoads=new Set(scope.input.map.roads.map(r=>r.id));
  const oldWater=new Set([...scope.input.map.hexTerrainByKey].filter(([,v])=>['lake','sea'].includes(v.terrainOverride??'')).map(([k])=>k));
  const width=(fullness:number)=>{const value=input.widths.get(fullness);if(value===undefined||!Number.isFinite(value)||value<=0)throw Error('invalid_boundary_width');return value;};
  const paths=new Map(accepted.riverPlan.paths.map(p=>[JSON.stringify([p.riverId,p.sourceEdgeKey]),p]));
  for(const c of accepted.riverPlan.water.capsules){budget.charge();const path=paths.get(JSON.stringify([c.riverId,c.sourceEdgeKey]));if(!path||Math.abs(c.radius*2-width(path.fullness))>1e-9)return fail('boundary_source_changed',[`river:${c.riverId}`,c.sourceEdgeKey,'width']);}
  const grid=createDetailGrid(6,input.origin),riverParts=new Map(source.segments.map(s=>[JSON.stringify([s.riverId,s.edgeKey]),s])),roadParts=new Map<string,Readonly<{from:WorldPoint;to:WorldPoint}>>();
  for(const road of scope.outside.roads)for(const part of road.segments){budget.charge();const ref=JSON.stringify([road.id,roadPair(part.from,part.to)]);if(roadParts.has(ref))return fail('invalid_boundary_input',[`road:${road.id}`,'duplicate part']);roadParts.set(ref,{from:detailCellCenter(grid,part.from),to:detailCellCenter(grid,part.to)});}
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
  for(const s of source.segments)add(retainedRivers.has(s.riverId)?retained:added,`river:${s.riverId}`,[s.from.point,s.to.point],width(s.fullness)/2);
  for(const r of accepted.roads.roads)add(retained,`road:${r.roadId}`,r.points,input.roadPaddingMiles);
  for(const road of input.map.roads)for(const s of road.segments)add(retainedRoads.has(road.id)?retained:added,`road:${road.id}`,[detailCellCenter(coarse,s.from),detailCellCenter(coarse,s.to)],input.roadPaddingMiles);
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
  return Object.freeze({status:'prepared' as const,boundaryValidation:pairs.length?'dependency_closure_required' as const:'disjoint_model_envelopes' as const,potentialDependencies:pairs,confirmedIntersections:false as const,scope,counts:Object.freeze({retainedEnvelopes:retained.length,addedEnvelopes:added.length}),roadPaddingMiles:input.roadPaddingMiles,workBudget:budget.snapshot(),completeGeometryPlan:false as const,readyForApplication:false as const,globalPersistenceValidation:'required' as const});
 }catch(error){return fail(error instanceof Error?error.message:'invalid_boundary_input',[]);}
}

/** An empty mixed closure can be certified when the ONLY box candidates are
 * land-support pairs. Distinct integer axial cells in the same regular6 grid
 * have disjoint interiors, including adjacent cells with a shared edge. The
 * projection already rejects shared cells and explicit graph/body seams.
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
