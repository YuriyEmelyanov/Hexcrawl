/** Detached GEO2 input projection. This is deliberately not an activation or
 * an expansion acceptance decision: spatial/mixed-boundary validation and
 * global physical4 persistence must follow before any accepted write. */
import type {EditableRoad} from './manualRoads.ts';
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
export function projectGeometryRefinementEdit(input:GeometrySourceValidationInput,accepted:GeometryRefinement,permittedRiverRemovals:ReadonlySet<number>=new Set()){
 return projectSource(input,accepted,false,permittedRiverRemovals);
}
function projectSource(input:GeometrySourceValidationInput,accepted:GeometryRefinement,requireUnchanged:boolean,permittedRiverRemovals:ReadonlySet<number>=new Set()){
 const fail=(code:string,refs:readonly string[])=>Object.freeze({status:'error' as const,code,refs:Object.freeze([...refs]),readyForApplication:false as const});
 try{
  if(input.cancelled?.())return fail('prepare_cancelled',[]);
  if(accepted.sourceFingerprint.length>2000000||input.map.regions.length>20000||input.map.rivers.length>4096||input.map.roads.length>4096||input.map.crossings.length>4096||input.map.hexTerrainByKey.size>20000||input.landCells.length>20000||input.map.regions.reduce((n,r)=>n+r.hexes.length,0)>20000||input.map.rivers.reduce((n,r)=>n+r.vertexPath.length,0)>12288||input.map.roads.reduce((n,r)=>n+r.segments.length,0)>24576)return fail('scope_capacity',[]);
  const payload=JSON.parse(accepted.sourceFingerprint.slice('geo2-source-input-v1:'.length));
  if(payload.version!==1||payload.algorithmVersion!=='geo2-v1')return fail('invalid_scope',[]);
  const regionIds=new Set<number>(payload.regions.map((r:{id:number})=>r.id)),riverIds=new Set(accepted.riverPlan.source.segments.map(s=>s.riverId));
  const roadIds=new Set<number>(payload.roads.map((r:{id:number})=>r.id)),crossingKeys=new Set<string>(payload.crossings.map((c:{key:string})=>c.key));
  const oldCells=new Set<string>(payload.regions.flatMap((r:{hexes:{q:number;r:number}[]})=>r.hexes.map(key))),oldWater=new Set<string>(payload.waterTerrain.map((w:{key:string})=>w.key));
  const land=new Set<string>(payload.landCells.map(key)),seaIds=new Set<number>(payload.seas.map((s:{id:number})=>s.id));
  const lakeIds=new Set<number>(payload.waterTerrain.filter((w:{kind:string})=>w.kind==='lake').map((w:{lakeId:number})=>w.lakeId));
  const aliases=new Set<string>(payload.owners.map((o:{alias:string})=>o.alias)),edgeKeys=new Set(accepted.riverPlan.source.segments.map(s=>s.edgeKey));
  const nodeKeys=new Set(accepted.riverPlan.source.segments.flatMap(s=>[s.from.key,s.to.key]));
  const regions=input.map.regions.filter(r=>regionIds.has(r.id)),rivers=input.map.rivers.filter(r=>riverIds.has(r.id)),roads=(input.map.roads as readonly EditableRoad[]).filter(r=>roadIds.has(r.id)),crossings=input.map.crossings.filter(c=>crossingKeys.has(c.key));
  const missingRefs=<T extends string|number>(expected:ReadonlySet<T>,values:readonly T[],kind:string)=>{const present=new Set(values);return [...expected].filter(id=>!present.has(id)).map(id=>`${kind}:${id}`);};
  // A missing reference is never inferred to be a requested deletion. Only
  // an explicit river-remove command supplies this detached permission; the
  // importer and all other callers remain strict. Crossings may disappear
  // only when they belong to a permitted river that is actually absent.
  const presentRivers=new Set(rivers.map(r=>r.id)),removedRivers=new Set(requireUnchanged?[]:[...riverIds].filter(id=>permittedRiverRemovals.has(id)&&!presentRivers.has(id)));
  const requiredRivers=new Set([...riverIds].filter(id=>!removedRivers.has(id))),requiredCrossings=new Set<string>(payload.crossings.filter((c:{key:string;riverId:number})=>!removedRivers.has(c.riverId)).map((c:{key:string})=>c.key));
  const missing=[...missingRefs(regionIds,regions.map(r=>r.id),'region'),...missingRefs(requiredRivers,rivers.map(r=>r.id),'river'),...missingRefs(roadIds,roads.map(r=>r.id),'road'),...missingRefs(requiredCrossings,crossings.map(c=>c.key),'crossing')];
  if(missing.length)return fail('missing_scope_reference',missing);
  const outside={regions:input.map.regions.filter(r=>!regionIds.has(r.id)),rivers:input.map.rivers.filter(r=>!riverIds.has(r.id)),roads:(input.map.roads as readonly EditableRoad[]).filter(r=>!roadIds.has(r.id)),crossings:input.map.crossings.filter(c=>!crossingKeys.has(c.key)),water:[...input.map.hexTerrainByKey].filter(([k,v])=>!oldWater.has(k)&&['lake','sea'].includes(v.terrainOverride??''))};
  // Explicit graph/body seams must not disappear merely because their new
  // records are outside the old IDs. Other spatial contacts remain a separate
  // mandatory boundary-validation step, including crossings without shared IDs.
  const seams=[...outside.regions.flatMap(r=>r.hexes.filter(c=>oldCells.has(key(c))).map(c=>`region:${r.id}:${key(c)}`)),...outside.rivers.flatMap(r=>r.vertexPath.filter(v=>nodeKeys.has(v.key)).map(v=>`river:${r.id}:${v.key}`)),...outside.roads.flatMap(r=>r.segments.filter(s=>oldCells.has(key(s.from))||oldCells.has(key(s.to))).map(()=>`road:${r.id}`)),...outside.crossings.filter(c=>riverIds.has(c.riverId)||roadIds.has(c.roadId)).map(c=>`crossing:${c.key}`),...outside.water.filter(([,v])=>v.terrainOverride==='lake'&&v.lakeId!==undefined&&lakeIds.has(v.lakeId)).map(([k])=>`lake:${k}`)];
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
  const projected=Object.freeze({...input,riverPlan:accepted.riverPlan,map:Object.freeze({...input.map,physicalGrid:authored,regions:Object.freeze(regions),rivers:Object.freeze(rivers),roads:Object.freeze(roads),crossings:Object.freeze(crossings),hexTerrainByKey:new Map([...input.map.hexTerrainByKey].filter(([k])=>oldCells.has(k)||oldWater.has(k))),waterPoiByKey:new Map([...input.map.waterPoiByKey].filter(([k])=>aliases.has(`waterPoi:${k}`))),seas:Object.freeze(input.map.seas.filter(s=>seaIds.has(s.id)))}),liveRivers:Object.freeze(input.liveRivers.filter(r=>riverIds.has(r.id))),landCells:Object.freeze(input.landCells.filter(c=>land.has(key(c)))),marks:Object.freeze({rapids:new Set([...input.marks.rapids].filter(k=>edgeKeys.has(k))),waterfalls:new Set([...input.marks.waterfalls].filter(k=>nodeKeys.has(k)))})});
  if(requireUnchanged&&!validateGeometryRefinementSource(projected,{...accepted,sourceState:authored}))return fail('scope_source_changed',['sourceFingerprint']);
  if(input.cancelled?.())return fail('prepare_cancelled',[]);
  return Object.freeze({status:'projected' as const,input:projected,globalAuthoredState,outside:Object.freeze({regions:Object.freeze(outside.regions),rivers:Object.freeze(outside.rivers),roads:Object.freeze(outside.roads),crossings:Object.freeze(outside.crossings),water:Object.freeze(outside.water),authoredFootprints:Object.freeze(globalAuthoredState.poiFootprints.filter(f=>!retainedPoiIds.has(f.poiId))),authoredIdentityRefs:Object.freeze(Object.fromEntries(Object.entries(globalAuthoredState.poiIdentities?.byLegacyRef??{}).filter(([alias])=>!aliases.has(alias))))}),geometryRefinement:accepted,sourceCorrespondence:requireUnchanged?'validated_unchanged' as const:'requires_new_plan' as const,boundaryValidation:'required' as const,readyForApplication:false as const});
 }catch{return fail('invalid_scope',['geometryRefinement.sourceFingerprint']);}
}
