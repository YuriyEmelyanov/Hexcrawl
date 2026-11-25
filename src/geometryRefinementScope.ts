/** Detached GEO2 input projection. This is deliberately not an activation or
 * an expansion acceptance decision: spatial/mixed-boundary validation and
 * global physical4 persistence must follow before any accepted write. */
import {normalizeRefinementRiverSource} from './geometryRefinementSource.ts';
import {detailSourcePixelToWorld} from './detailGeography.ts';
import type {EditableRiver} from './manualRivers.ts';
import {roadPair,type EditableRoad} from './manualRoads.ts';
export type GeometryScopeRemovalIntent=Readonly<{riverIds?:ReadonlySet<number>;roadParts?:ReadonlyMap<number,ReadonlySet<string>>}>;
import {validateGeometryRefinementSource,type GeometryRefinement,type GeometrySourceValidationInput} from './geometryPlan.ts';
import {parseDetail1StateV11} from './detailModel.ts';
import {assertDetailPoiOwners} from './detailIdentity.ts';
import {poiNameLocators} from './manualPois.ts';
const key=(p:{q:number;r:number})=>`${p.q},${p.r}`;
export function projectGeometryRefinementSource(input:GeometrySourceValidationInput,accepted:GeometryRefinement){
 return projectSource(input,accepted,true);
}
/** Detached current input for replanning an edit of retained entities. This
 * does NOT certify the old fingerprint against the changed source, and is
 * never import/boundary acceptance. Caller must prepare a complete new plan,
 * compose global authored data and validate the resulting boundary. */
export function projectGeometryRefinementEdit(input:GeometrySourceValidationInput,accepted:GeometryRefinement,removals:GeometryScopeRemovalIntent={}){
 return projectSource(input,accepted,false,removals);
}
/** Keep the saved domain when one of its regions becomes multiple owners.
 * The caller must rebind ownership and validate the finished plan. */
export function projectSplitGeometryRefinement(
 input:GeometrySourceValidationInput,accepted:GeometryRefinement,parts:ReadonlyMap<number,readonly number[]>,
 alias:(ref:string)=>string
){
 return projectSource(input,accepted,true,{}, {parts,alias});
}
function projectSource(
 input:GeometrySourceValidationInput,accepted:GeometryRefinement,requireUnchanged:boolean,removals:GeometryScopeRemovalIntent={},
 split?:{parts:ReadonlyMap<number,readonly number[]>;alias:(ref:string)=>string}
){
 const fail=(code:string,refs:readonly string[])=>Object.freeze({status:'error' as const,code,refs:Object.freeze([...refs]),readyForApplication:false as const});
 try{
  if(input.cancelled?.())return fail('prepare_cancelled',[]);
  if(accepted.sourceFingerprint.length>2000000||input.map.regions.length>20000||input.map.rivers.length>4096||input.map.roads.length>4096||input.map.crossings.length>4096||input.map.hexTerrainByKey.size>20000||input.landCells.length>20000||input.map.regions.reduce((n,r)=>n+r.hexes.length,0)>20000||input.map.rivers.reduce((n,r)=>n+r.vertexPath.length,0)>12288||input.map.roads.reduce((n,r)=>n+r.segments.length,0)>24576)return fail('scope_capacity',[]);
  const payload=JSON.parse(accepted.sourceFingerprint.slice('geo2-source-input-v1:'.length));
  if(payload.version!==1||payload.algorithmVersion!=='geo2-v1')return fail('invalid_scope',[]);
  const regionIds=new Set<number>(payload.regions.flatMap((r:{id:number})=>split?.parts.get(r.id)??[r.id])),riverIds=new Set(accepted.riverPlan.source.segments.map(s=>s.riverId));
  const roadIds=new Set<number>(payload.roads.map((r:{id:number})=>r.id)),crossingKeys=new Set<string>(payload.crossings.map((c:{key:string})=>c.key));
  const oldCells=new Set<string>(payload.regions.flatMap((r:{hexes:{q:number;r:number}[]})=>r.hexes.map(key))),oldWater=new Set<string>(payload.waterTerrain.map((w:{key:string})=>w.key));
  const land=new Set<string>(payload.landCells.map(key)),seaIds=new Set<number>(payload.seas.map((s:{id:number})=>s.id));
  const lakeIds=new Set<number>(payload.waterTerrain.filter((w:{kind:string})=>w.kind==='lake').map((w:{lakeId:number})=>w.lakeId));
  // Only an explicit source edit may acquire the CURRENT complete body of
  // an already retained lake/sea. Loading still projects the exact saved body:
  // a changed contour must never be silently repaired during import.
  if(!requireUnchanged){
   // E6 already resolved split/merge ownership. Follow actual old-cell
   // membership to every surviving descendant/body; never allocate IDs or
   // resolve E6's choice here. Splits can contribute more than one body.
   for(const cell of oldWater){const value=input.map.hexTerrainByKey.get(cell);if(value?.terrainOverride==='lake'&&value.lakeId!==undefined)lakeIds.add(value.lakeId);}
   for(const sea of input.map.seas)if(sea.hexKeys.some(cell=>oldWater.has(cell)))seaIds.add(sea.id);
   for(const [cell,value]of input.map.hexTerrainByKey)if(value.terrainOverride==='lake'&&value.lakeId!==undefined&&lakeIds.has(value.lakeId))oldWater.add(cell);
   for(const sea of input.map.seas)if(seaIds.has(sea.id))for(const cell of sea.hexKeys)oldWater.add(cell);
  }
  const aliases=new Set<string>(payload.owners.map((o:{alias:string})=>split?split.alias(o.alias):o.alias)),edgeKeys=new Set(accepted.riverPlan.source.segments.map(s=>s.edgeKey));
  const nodeKeys=new Set(accepted.riverPlan.source.segments.flatMap(s=>[s.from.key,s.to.key]));
  const fullSource=normalizeRefinementRiverSource({rivers:input.map.rivers,marks:input.marks,origin:input.origin});
  if(fullSource.status==='error')return fail('boundary_dependency',fullSource.refs);
  const selectRiver=(river:EditableRiver,inside:boolean):EditableRiver[]=>{
   const known=new Set(accepted.riverPlan.source.segments.filter(e=>e.riverId===river.id).map(e=>e.edgeKey));
   const selected=new Set(river.sectors.flatMap(s=>s.edgeKeys.filter(k=>(regionIds.has(s.assignedRegionId??river.regionId)||known.has(k))===inside)));
   const runs:typeof river.vertexPath[number][][]=[];
   for(let i=1;i<river.vertexPath.length;i++){const a=river.vertexPath[i-1],b=river.vertexPath[i],k=[a.key,b.key].sort().join('|');if(!selected.has(k))continue;const prior=runs[runs.length-1];if(prior?.[prior.length-1]?.key===a.key)prior.push(b);else runs.push([a,b]);}
   return runs.map(path=>{const keys=new Set(path.slice(1).map((v,i)=>[path[i].key,v.key].sort().join('|')));const sectors=river.sectors.flatMap(s=>{const indices=s.edgeKeys.map((k,i)=>keys.has(k)?i:-1).filter(i=>i>=0);if(!indices.length)return [];const first=Math.min(...indices),last=Math.max(...indices),vertexPath=s.vertexPath.slice(first,last+2);return [{...s,vertexPath,edgeKeys:s.edgeKeys.slice(first,last+1),startVertexKey:vertexPath[0].key,endVertexKey:vertexPath[vertexPath.length-1].key,startReason:first===0?s.startReason:'region_boundary' as const,endReason:last===s.edgeKeys.length-1?s.endReason:'region_boundary' as const}];});return {...river,vertexPath:path,sectors};});
  };
  const retainedRivers=input.map.rivers.filter(r=>riverIds.has(r.id)).flatMap(r=>selectRiver(r,true));
  if(new Set(retainedRivers.map(r=>r.id)).size!==retainedRivers.length)return fail('disconnected_scope_river',retainedRivers.map(r=>`river:${r.id}`));
  const oldRoadParts=new Map<number,Set<string>>(payload.roads.map((r:{id:number;segments:{ends:[{q:number;r:number},{q:number;r:number}]}[]})=>[r.id,new Set(r.segments.map(s=>roadPair(...s.ends)))]));
  const regions=input.map.regions.filter(r=>regionIds.has(r.id)),rivers=retainedRivers,roads=(input.map.roads as readonly EditableRoad[]).filter(r=>roadIds.has(r.id)).map(r=>({...r,segments:r.segments.filter(s=>oldRoadParts.get(r.id)?.has(roadPair(s.from,s.to))||oldCells.has(key(s.from))&&oldCells.has(key(s.to)))})).filter(r=>r.segments.length),crossings=input.map.crossings.filter(c=>crossingKeys.has(c.key));
  const missingRefs=<T extends string|number>(expected:ReadonlySet<T>,values:readonly T[],kind:string)=>{const present=new Set(values);return [...expected].filter(id=>!present.has(id)).map(id=>`${kind}:${id}`);};
  // Missing references never imply a deletion. Only an explicit edit may
  // permit an old river or exact old road part that is actually absent now.
  // Import always remains strict and receives no edit intent.
  const presentRivers=new Set(rivers.map(r=>r.id)),removedRivers=new Set(requireUnchanged?[]:[...riverIds].filter(id=>removals.riverIds?.has(id)&&!presentRivers.has(id)));
  const currentRoadParts=new Map(roads.map(r=>[r.id,new Set(r.segments.map(s=>roadPair(s.from,s.to)))]));
  const removedRoadParts=new Map<number,Set<string>>(),removedRoads=new Set<number>();
  if(!requireUnchanged)for(const road of payload.roads as {id:number;segments:{ends:[{q:number;r:number},{q:number;r:number}]}[]}[]){
   const permitted=removals.roadParts?.get(road.id),present=currentRoadParts.get(road.id);
   const oldParts=road.segments.map(s=>roadPair(s.ends[0],s.ends[1]));
   const removed=new Set(oldParts.filter(part=>permitted?.has(part)&&!present?.has(part)));
   removedRoadParts.set(road.id,removed);
   if(!present&&oldParts.length>0&&oldParts.every(part=>removed.has(part)))removedRoads.add(road.id);
  }
  const requiredRivers=new Set([...riverIds].filter(id=>!removedRivers.has(id))),requiredRoads=new Set([...roadIds].filter(id=>!removedRoads.has(id)));
  const requiredCrossings=new Set<string>(payload.crossings.filter((c:{key:string;riverId:number;roadId:number;roadSegmentKey:string})=>!removedRivers.has(c.riverId)&&!removedRoadParts.get(c.roadId)?.has(c.roadSegmentKey)).map((c:{key:string})=>c.key));
  const missing=[...missingRefs(regionIds,regions.map(r=>r.id),'region'),...missingRefs(requiredRivers,rivers.map(r=>r.id),'river'),...missingRefs(requiredRoads,roads.map(r=>r.id),'road'),...missingRefs(requiredCrossings,crossings.map(c=>c.key),'crossing')];
  if(missing.length)return fail('missing_scope_reference',missing);
  const outside={regions:input.map.regions.filter(r=>!regionIds.has(r.id)),rivers:input.map.rivers.flatMap(r=>riverIds.has(r.id)?selectRiver(r,false):[r]),roads:(input.map.roads as readonly EditableRoad[]).flatMap(r=>{const retained=new Set(roads.filter(old=>old.id===r.id).flatMap(old=>old.segments.map(s=>roadPair(s.from,s.to)))),segments=r.segments.filter(s=>!retained.has(roadPair(s.from,s.to)));return segments.length?[{...r,segments}]:[];}),crossings:input.map.crossings.filter(c=>!crossingKeys.has(c.key)),water:[...input.map.hexTerrainByKey].filter(([k,v])=>!oldWater.has(k)&&['lake','sea'].includes(v.terrainOverride??''))};
  // Partition by actual source parts, not whole river/road IDs: the same ID
  // can cross a scope seam. Shared graph nodes remain visible to the mandatory
  // exact boundary check; overlapping ownership/body growth is not hidden.
  const seams=[...outside.regions.flatMap(r=>r.hexes.filter(c=>oldCells.has(key(c))).map(c=>`region:${r.id}:${key(c)}`)),...outside.water.filter(([,v])=>v.terrainOverride==='lake'&&v.lakeId!==undefined&&lakeIds.has(v.lakeId)).map(([k])=>`lake:${k}`)];
  seams.push(...outside.crossings.filter(c=>edgeKeys.has(c.riverEdgeKey)&&oldRoadParts.get(c.roadId)?.has(c.roadSegmentKey)).map(c=>`crossing:${c.key}`));
  if(seams.length)return fail('boundary_dependency',seams);
  const physical=input.map.physicalGrid;
  let rawAuthored=physical?(physical.version===4?physical.globalAuthoredState??physical.geometryRefinement?.sourceState:physical):accepted.sourceState;
  if(physical?.version===4&&rawAuthored){
   // Geometry inputs stay authored; local edits/view/focus belong to the live
   // outer state and may have changed since the refinement was accepted.
   const {selectedCell:ignoredCell,selectedWorldPoint:ignoredPoint,...source}=rawAuthored;
   rawAuthored={...source,viewStep:physical.viewStep,fineCellEdits:physical.fineCellEdits,...(physical.selectedCell?{selectedCell:physical.selectedCell}:{}),...(physical.selectedWorldPoint?{selectedWorldPoint:physical.selectedWorldPoint}:{})};
  }
  if(!rawAuthored||rawAuthored.version!==3)return fail('invalid_authored_source',['physicalGrid']);
  if(rawAuthored.poiFootprints.length>20000||Object.keys(rawAuthored.poiIdentities?.byLegacyRef??{}).length>20000)return fail('scope_capacity',['authored POI owners']);
  // The global snapshot may legitimately contain new owners. Project their
  // geometry inputs, not the document itself. Never replace a changed old ID
  // with the previous snapshot merely to obtain a matching fingerprint.
  const expectedRefs=accepted.sourceState.poiIdentities?.byLegacyRef??{},currentRefs=rawAuthored.poiIdentities?.byLegacyRef??{};
  const absentOwners=Object.keys(expectedRefs).filter(alias=>!Object.prototype.hasOwnProperty.call(currentRefs,alias));
  if(absentOwners.length)return fail('missing_scope_reference',absentOwners.map(alias=>`POI:${alias}`));
  const reboundOwners=Object.keys(expectedRefs).filter(alias=>currentRefs[alias]!==expectedRefs[alias]);
  if(reboundOwners.length)return fail('scope_source_changed',reboundOwners.map(alias=>`POI:${alias}`));
  if(accepted.sourceState.poiIdentities&&(!rawAuthored.poiIdentities||rawAuthored.poiIdentities.nextId<accepted.sourceState.poiIdentities.nextId))return fail('scope_source_changed',['poiIdentities.nextId']);
  const retainedPoiIds=new Set(accepted.sourceState.poiFootprints.map(f=>f.poiId)),presentPoiIds=new Set(rawAuthored.poiFootprints.map(f=>f.poiId));
  const missingFootprints=[...retainedPoiIds].filter(id=>!presentPoiIds.has(id));
  if(missingFootprints.length)return fail('missing_scope_reference',missingFootprints.map(id=>`POI:${id}`));
  let globalAuthoredState:ReturnType<typeof parseDetail1StateV11>;
  try{
   globalAuthoredState=parseDetail1StateV11(rawAuthored);
   const live=poiNameLocators({regions:[...input.map.regions],waterPoiByKey:new Map(input.map.waterPoiByKey)},true);
   if(globalAuthoredState.poiIdentities)assertDetailPoiOwners(globalAuthoredState.poiIdentities,live);
   else if(live.size)throw Error('Missing authored owner identities');
  }catch{return fail('invalid_authored_source',['physicalGrid.poiIdentities','physicalGrid.poiFootprints']);}
  const authored=Object.freeze({...globalAuthoredState,...(globalAuthoredState.poiIdentities?{poiIdentities:Object.freeze({...globalAuthoredState.poiIdentities,byLegacyRef:Object.freeze(Object.fromEntries(Object.entries(globalAuthoredState.poiIdentities.byLegacyRef).filter(([alias])=>aliases.has(alias))))})}:{}),poiFootprints:Object.freeze(globalAuthoredState.poiFootprints.filter(f=>retainedPoiIds.has(f.poiId)))});
  const retainedEdges=new Set(rivers.flatMap(r=>r.sectors.flatMap(s=>s.edgeKeys.map(k=>JSON.stringify([r.id,k]))))),retainedNodes=new Set(rivers.flatMap(r=>r.vertexPath.map(v=>v.key)));
  const continuationKeys=new Set(outside.rivers.flatMap(r=>r.vertexPath.filter(v=>retainedNodes.has(v.key)).map(v=>v.key)));
  const projected=Object.freeze({...input,riverPlan:accepted.riverPlan,map:Object.freeze({...input.map,physicalGrid:authored,regions:Object.freeze(regions),rivers:Object.freeze(rivers),roads:Object.freeze(roads),crossings:Object.freeze(crossings),hexTerrainByKey:new Map([...input.map.hexTerrainByKey].filter(([k])=>oldCells.has(k)||oldWater.has(k))),waterPoiByKey:new Map([...input.map.waterPoiByKey].filter(([k])=>aliases.has(`waterPoi:${k}`))),seas:Object.freeze(input.map.seas.filter(s=>seaIds.has(s.id)))}),liveRivers:Object.freeze(input.liveRivers.filter(r=>riverIds.has(r.id)).map(r=>({...r,edges:r.edges.filter(e=>retainedEdges.has(JSON.stringify([r.id,e.id]))),starts:r.starts.filter(p=>rivers.find(v=>v.id===r.id)?.sectors.some(s=>{const q=detailSourcePixelToWorld(s.vertexPath[0],input.origin);return s.startReason==='river_start'&&Math.hypot(p.x-q.x,p.y-q.y)<1e-8;})),waterfalls:r.waterfalls.filter(f=>retainedNodes.has(f.id.replace(/^vertex:/,'')))}))),landCells:Object.freeze(input.landCells.filter(c=>land.has(key(c)))),marks:Object.freeze({rapids:new Set([...input.marks.rapids].filter(k=>edgeKeys.has(k))),waterfalls:new Set([...input.marks.waterfalls].filter(k=>nodeKeys.has(k)))})});
  if(requireUnchanged&&!split&&!validateGeometryRefinementSource(projected,{...accepted,sourceState:authored}))return fail('scope_source_changed',['sourceFingerprint']);
  if(input.cancelled?.())return fail('prepare_cancelled',[]);
  return Object.freeze({status:'projected' as const,continuationKeys,input:projected,globalAuthoredState,outside:Object.freeze({regions:Object.freeze(outside.regions),rivers:Object.freeze(outside.rivers),roads:Object.freeze(outside.roads),crossings:Object.freeze(outside.crossings),water:Object.freeze(outside.water),authoredFootprints:Object.freeze(globalAuthoredState.poiFootprints.filter(f=>!retainedPoiIds.has(f.poiId))),authoredIdentityRefs:Object.freeze(Object.fromEntries(Object.entries(globalAuthoredState.poiIdentities?.byLegacyRef??{}).filter(([alias])=>!aliases.has(alias))))}),geometryRefinement:accepted,sourceCorrespondence:requireUnchanged&&!split?'validated_unchanged' as const:'requires_new_plan' as const,boundaryValidation:'required' as const,readyForApplication:false as const});
 }catch{return fail('invalid_scope',['geometryRefinement.sourceFingerprint']);}
}
