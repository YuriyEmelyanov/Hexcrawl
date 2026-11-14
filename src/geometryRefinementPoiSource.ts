import {refinementPoiFeatureKind,type RefinementPoiFeature} from './geometryRefinementPoiFeatures.ts';
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
export function prepareRefinementPoiRequests(input:Readonly<{map:DetailGeographyMap;sourceRivers:NormalizedRefinementSource['segments'];lockedPoiIds?:ReadonlySet<string>;riverPlan?:Extract<ReturnType<typeof import('./geometryRefinementMouths.ts').prepareRefinementMouths>,{status:'prepared'}>;crossings?:readonly Readonly<{key:string;kind:string;riverId:number;riverEdgeKey:string;point:{x:number;y:number};bankEntry:{x:number;y:number};bankExit:{x:number;y:number}}>[]}>){
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
   const kind=refinementPoiFeatureKind(requirement),plan=input.riverPlan;
   if(kind&&!plan){pendingFeatures.push(base);continue;}
   const water=footprint.attachments.filter(a=>a.kind==='water'&&a.waterId.startsWith('river:'));
   if(water.length!==1)return fail([id,water.length?'ambiguous_source_feature_ref':'missing_source_feature_ref']);
   const attachment=water[0];if(attachment.kind!=='water')return fail([id]);
   const riverId=Number(attachment.waterId.slice(6));if(!Number.isSafeInteger(riverId)||riverId<1)return fail([id,'invalid_source_river_ref']);
   let edge=attachment.segmentId,feature:RefinementPoiFeature|undefined;
   if(kind==='rapid'){
    if(attachment.waterKind!=='rapid'||!plan!.rapids.some(r=>r.riverId===riverId&&r.sourceEdgeKey===edge))return fail([id,'missing_or_foreign_rapid']);
    feature={kind,sourceRef:edge};
   }else if(kind==='waterfall'){
    const mark=plan!.waterfalls.find(m=>m.sourceRef===attachment.segmentId&&m.incidences.some(i=>i.riverId===riverId));
    if(attachment.waterKind!=='waterfall'||!mark)return fail([id,'missing_or_foreign_waterfall']);
    const links=mark.incidences.filter(i=>i.riverId===riverId).sort((a,b)=>Number(a.flow!=='leaving')-Number(b.flow!=='leaving')||(a.sourceEdgeKey<b.sourceEdgeKey?-1:a.sourceEdgeKey>b.sourceEdgeKey?1:0));
    edge=links[0].sourceEdgeKey;feature={kind,sourceRef:attachment.segmentId,point:mark.point};
   }else if(kind==='river_start'){
    const starts=[...new Set(plan!.source.boundaries.filter(b=>b.riverId===riverId&&b.end==='start'&&b.reason==='river_start').map(b=>b.sourceNodeKey))];
    if(attachment.waterKind!=='river'||attachment.segmentId!=='start'||starts.length!==1)return fail([id,'missing_or_ambiguous_river_start']);
    const node=starts[0],port=plan!.ports.find(p=>p.sourceKey===node),edges=input.sourceRivers.filter(r=>r.riverId===riverId&&r.from.key===node);
    if(!port||edges.length!==1)return fail([id,'missing_river_start_port']);edge=edges[0].edgeKey;feature={kind,sourceRef:'start',point:port.point};
   }else if(kind==='crossing'){
    const crossing=input.crossings?.find(c=>`crossing:${c.key}`===attachment.segmentId&&c.riverId===riverId);
    const kinds=requirement.predicates.filter(p=>p.startsWith('crossing_')).map(p=>p.slice(9));
    if(attachment.waterKind!=='crossing'||!crossing||!kinds.length||!kinds.every(k=>k==='any'||k===crossing.kind))return fail([id,'missing_foreign_or_wrong_kind_crossing']);
    edge=crossing.riverEdgeKey;feature={kind,sourceRef:attachment.segmentId,point:crossing.point,bankPoints:[crossing.bankEntry,crossing.bankExit]};
   }else if(attachment.waterKind!=='river')return fail([id,'foreign_river_attachment']);
   const riverRef={riverId,sourceEdgeKey:edge},river=source.get(JSON.stringify([riverId,edge]));if(!river)return fail([id,'stale_source_river_ref']);
   // A known side comes from the accepted anchor relative to the directed
   // source edge. A centerline contact does not manufacture a known side.
   const anchor=footprint.worldAnchor;if(!anchor)return fail([id,'accepted_world_anchor_required']);
   const a=river.from.point,b=river.to.point,cross=(b.x-a.x)*(anchor.y-a.y)-(b.y-a.y)*(anchor.x-a.x),side=Math.abs(cross)>1e-8?(cross>0?1:-1):undefined;
   requests.push({...base,riverRef,...(feature?{feature}:{}),...(side?{side:side as -1|1}:{})});
  }
  return immutable({status:'prepared' as const,requests,unresolved,unchanged,pendingFeatures,ownerCount:live.size,completeGeometryPlan:false as const});
 }catch(error){return fail([error instanceof Error?error.message:'invalid_accepted_poi_source']);}
}
