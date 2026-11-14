/** Detached GEO2 input projection. This is deliberately not an activation or
 * an expansion acceptance decision: spatial/mixed-boundary validation and
 * global physical4 persistence must follow before any accepted write. */
import type {EditableRoad} from './manualRoads.ts';
import {validateGeometryRefinementSource,type GeometryRefinement,type GeometrySourceValidationInput} from './geometryPlan.ts';
const key=(p:{q:number;r:number})=>`${p.q},${p.r}`;
export function projectGeometryRefinementSource(input:GeometrySourceValidationInput,accepted:GeometryRefinement){
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
  const missing=[...missingRefs(regionIds,regions.map(r=>r.id),'region'),...missingRefs(riverIds,rivers.map(r=>r.id),'river'),...missingRefs(roadIds,roads.map(r=>r.id),'road'),...missingRefs(crossingKeys,crossings.map(c=>c.key),'crossing')];
  if(missing.length)return fail('missing_scope_reference',missing);
  const outside={regions:input.map.regions.filter(r=>!regionIds.has(r.id)),rivers:input.map.rivers.filter(r=>!riverIds.has(r.id)),roads:(input.map.roads as readonly EditableRoad[]).filter(r=>!roadIds.has(r.id)),crossings:input.map.crossings.filter(c=>!crossingKeys.has(c.key)),water:[...input.map.hexTerrainByKey].filter(([k,v])=>!oldWater.has(k)&&['lake','sea'].includes(v.terrainOverride??''))};
  // Explicit graph/body seams must not disappear merely because their new
  // records are outside the old IDs. Other spatial contacts remain a separate
  // mandatory boundary-validation step, including crossings without shared IDs.
  const seams=[...outside.regions.flatMap(r=>r.hexes.filter(c=>oldCells.has(key(c))).map(c=>`region:${r.id}:${key(c)}`)),...outside.rivers.flatMap(r=>r.vertexPath.filter(v=>nodeKeys.has(v.key)).map(v=>`river:${r.id}:${v.key}`)),...outside.roads.flatMap(r=>r.segments.filter(s=>oldCells.has(key(s.from))||oldCells.has(key(s.to))).map(()=>`road:${r.id}`)),...outside.crossings.filter(c=>riverIds.has(c.riverId)||roadIds.has(c.roadId)).map(c=>`crossing:${c.key}`),...outside.water.filter(([,v])=>v.terrainOverride==='lake'&&v.lakeId!==undefined&&lakeIds.has(v.lakeId)).map(([k])=>`lake:${k}`)];
  if(seams.length)return fail('boundary_dependency',seams);
  const projected=Object.freeze({...input,riverPlan:accepted.riverPlan,map:Object.freeze({...input.map,physicalGrid:accepted.sourceState,regions:Object.freeze(regions),rivers:Object.freeze(rivers),roads:Object.freeze(roads),crossings:Object.freeze(crossings),hexTerrainByKey:new Map([...input.map.hexTerrainByKey].filter(([k])=>oldCells.has(k)||oldWater.has(k))),waterPoiByKey:new Map([...input.map.waterPoiByKey].filter(([k])=>aliases.has(`waterPoi:${k}`))),seas:Object.freeze(input.map.seas.filter(s=>seaIds.has(s.id)))}),liveRivers:Object.freeze(input.liveRivers.filter(r=>riverIds.has(r.id))),landCells:Object.freeze(input.landCells.filter(c=>land.has(key(c)))),marks:Object.freeze({rapids:new Set([...input.marks.rapids].filter(k=>edgeKeys.has(k))),waterfalls:new Set([...input.marks.waterfalls].filter(k=>nodeKeys.has(k)))})});
  if(!validateGeometryRefinementSource(projected,accepted))return fail('scope_source_changed',['sourceFingerprint']);
  if(input.cancelled?.())return fail('prepare_cancelled',[]);
  return Object.freeze({status:'projected' as const,input:projected,outside:Object.freeze({regions:Object.freeze(outside.regions),rivers:Object.freeze(outside.rivers),roads:Object.freeze(outside.roads),crossings:Object.freeze(outside.crossings),water:Object.freeze(outside.water)}),geometryRefinement:accepted,boundaryValidation:'required' as const,readyForApplication:false as const});
 }catch{return fail('invalid_scope',['geometryRefinement.sourceFingerprint']);}
}
