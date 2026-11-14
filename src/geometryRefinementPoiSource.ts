/** Unmounted adapter from accepted POI owners and source policy, not eligibility
 * inference from names/attachments or a new footprint/identity allocation. */
import {detailPoiWaterRequirement,type DetailGeographyMap} from './detailGeography.ts';
import {parseDetail1StateV11} from './detailModel.ts';
import {assertDetailPoiOwners} from './detailIdentity.ts';
import {poiNameLocators} from './manualPois.ts';
import type {RefinementPoiRequest} from './geometryRefinementPois.ts';
import type {NormalizedRefinementSource} from './geometryRefinementSource.ts';
const fail=(refs:string[])=>Object.freeze({status:'error' as const,code:'poi_source_conflict' as const,refs:Object.freeze(refs),completeGeometryPlan:false as const});
function immutable<T>(v:T):T{if(Array.isArray(v))return Object.freeze(v.map(immutable)) as T;if(v&&typeof v==='object')return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,v])=>[k,immutable(v)]))) as T;return v;}
export function prepareRefinementPoiRequests(input:Readonly<{map:DetailGeographyMap;sourceRivers:NormalizedRefinementSource['segments'];lockedPoiIds?:ReadonlySet<string>}>){
 try{
  if(!input.map.physicalGrid)return fail(['accepted_footprints_required']);
  const state=parseDetail1StateV11(input.map.physicalGrid),identities=state.poiIdentities;
  if(!identities)return fail(['accepted_owners_required']);
  const live=poiNameLocators({regions:[...input.map.regions],waterPoiByKey:new Map(input.map.waterPoiByKey)},true);assertDetailPoiOwners(identities,live);
  if(live.size>4096||input.sourceRivers.length>4096)return fail(['poi_source_capacity']);
  const byId=new Map(state.poiFootprints.map(f=>[f.poiId,f])),aliases=Object.entries(identities.byLegacyRef).sort(([a],[b])=>a<b?-1:a>b?1:0);
  if(byId.size!==live.size||state.poiFootprints.length!==live.size)return fail(['accepted_footprints_incomplete']);
  if([...(input.lockedPoiIds??[])].some(id=>!byId.has(id)))return fail(['unknown_locked_poi']);
  const source=new Map(input.sourceRivers.map(r=>[JSON.stringify([r.riverId,r.edgeKey]),r]));if(source.size!==input.sourceRivers.length)return fail(['duplicate_source_river']);
  const requests:RefinementPoiRequest[]=[],unresolved:string[]=[],unchanged:string[]=[],pendingFeatures:RefinementPoiRequest[]=[];
  for(const [alias,id]of aliases){
   const footprint=byId.get(id);if(!footprint||footprint.legacyRef!==alias)return fail([id,'stale_poi_owner']);
   const coordinate=alias.slice(alias.lastIndexOf(':')+1).split(',').map(Number),parent6={q:coordinate[0],r:coordinate[1]},requirement=detailPoiWaterRequirement(input.map,alias),base={footprint,parent6,requirement,locked:input.lockedPoiIds?.has(id)??false};
   if(requirement.provenance==='unknown'){unresolved.push(id);requests.push(base);continue;}
   if(!['river','rapid','waterfall','crossing'].includes(requirement.requirement)){unchanged.push(id);requests.push(base);continue;}
   if(requirement.requirement!=='river'||requirement.predicates.includes('river_start')){pendingFeatures.push(base);continue;}
   const refs=new Map<string,{riverId:number;sourceEdgeKey:string}>();
   for(const a of footprint.attachments)if(a.kind==='water'&&a.waterId.startsWith('river:')){const riverId=Number(a.waterId.slice(6));if(!Number.isSafeInteger(riverId)||riverId<1||!source.has(JSON.stringify([riverId,a.segmentId])))return fail([id,'stale_source_river_ref']);refs.set(JSON.stringify([riverId,a.segmentId]),{riverId,sourceEdgeKey:a.segmentId});}
   if(refs.size!==1)return fail([id,refs.size?'ambiguous_source_river_ref':'missing_source_river_ref']);
   const riverRef=[...refs.values()][0],river=source.get(JSON.stringify([riverRef.riverId,riverRef.sourceEdgeKey]))!;
   // A known side comes from the accepted anchor relative to the directed
   // source edge. A centerline contact does not manufacture a known side.
   const anchor=footprint.worldAnchor;if(!anchor)return fail([id,'accepted_world_anchor_required']);
   const a=river.from.point,b=river.to.point,cross=(b.x-a.x)*(anchor.y-a.y)-(b.y-a.y)*(anchor.x-a.x),side=Math.abs(cross)>1e-8?(cross>0?1:-1):undefined;
   requests.push({...base,riverRef,...(side?{side:side as -1|1}:{})});
  }
  return immutable({status:'prepared' as const,requests,unresolved,unchanged,pendingFeatures,ownerCount:live.size,completeGeometryPlan:false as const});
 }catch(error){return fail([error instanceof Error?error.message:'invalid_accepted_poi_source']);}
}
