import {isFullness, validateRiverNetwork, type RiverNetwork} from './riverModel/core.ts';
import type {RiverFullness} from './riverFullness.ts';

export type RiverVertexValue = {key:string;x:number;y:number};
export type FeatureState = 'on'|'off';
export type RiverFeatures = {
  rapids:{riverId:number;edgeKey:string;state:FeatureState}[];
  waterfalls:{vertexKey:string;state:FeatureState}[];
};
export type RiverGeometry = {id:number;deltaParentRiverId?:number;vertexPath:RiverVertexValue[]};
export const emptyRiverFeatures=():RiverFeatures=>({rapids:[],waterfalls:[]});
export const riverFeatureEdge=(a:RiverVertexValue,b:RiverVertexValue)=>[a.key,b.key].sort().join('|');
const fail=(reason:string):never=>{throw Error(reason);};
const safe=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** Structural references are shared by migration and native v7. Never infer a delta by proximity. */
export function validateDeltaReferences(rivers:readonly RiverGeometry[]):void {
  const byId=new Map(rivers.map(r=>[r.id,r]));
  for(const r of rivers){
    if(r.deltaParentRiverId===undefined)continue;
    const parent=byId.get(r.deltaParentRiverId);
    if(!safe(r.deltaParentRiverId)||!parent||parent===r||parent.deltaParentRiverId!==undefined)fail('invalid_delta_parent');
  }
}

export function migrateRiverEditing(rivers:readonly RiverGeometry[]):{riverFeatures:RiverFeatures;nextRiverId:number}{
  validateDeltaReferences(rivers);
  const maximum=rivers.reduce((m,r)=>Math.max(m,r.id),0);
  if(!Number.isSafeInteger(maximum)||maximum<0||maximum>=Number.MAX_SAFE_INTEGER)fail('river_id_overflow');
  return {riverFeatures:emptyRiverFeatures(),nextRiverId:maximum+1};
}
export function validateRiverCounter(rivers:readonly RiverGeometry[],nextRiverId:unknown):asserts nextRiverId is number {
  if(!safe(nextRiverId)||rivers.some(r=>r.id>=nextRiverId))fail('invalid_next_river_id');
}
export function allocateRiverId(rivers:readonly RiverGeometry[],nextRiverId:number):{id:number;nextRiverId:number}{
  validateRiverCounter(rivers,nextRiverId);
  if(nextRiverId>=Number.MAX_SAFE_INTEGER)fail('river_id_overflow');
  return {id:nextRiverId,nextRiverId:nextRiverId+1};
}

export type FeatureEligibility={rapid:(riverId:number,edgeKey:string)=>boolean;waterfall:(vertexKey:string)=>boolean};
/** Shape and live references are mandatory; On eligibility must be supplied by the geometry adapter. */
export function validateRiverFeatures(value:unknown,rivers:readonly RiverGeometry[],eligibility?:FeatureEligibility):asserts value is RiverFeatures {
  if(!object(value)||!Array.isArray(value.rapids)||!Array.isArray(value.waterfalls))fail('invalid_river_features');
  const data=value as Record<string,unknown[]>;
  const edges=new Map(rivers.map(r=>[r.id,new Set(r.vertexPath.slice(1).map((v,i)=>riverFeatureEdge(r.vertexPath[i],v)))]));
  const vertices=new Set(rivers.flatMap(r=>r.vertexPath.map(v=>v.key)));
  const seen=new Set<string>();
  for(const entry of data.rapids){
    if(!object(entry)||!safe(entry.riverId)||typeof entry.edgeKey!=='string'||!(entry.state==='on'||entry.state==='off'))fail('invalid_rapid_override');
    const e=entry as {riverId:number;edgeKey:string;state:FeatureState},key=e.riverId+':'+e.edgeKey;
    if(seen.has(key)||!edges.get(e.riverId)?.has(e.edgeKey))fail('missing_or_duplicate_rapid_edge');
    if(e.state==='on'&&eligibility&&!eligibility.rapid(e.riverId,e.edgeKey))fail('ineligible_rapid');
    seen.add(key);
  }
  seen.clear();
  for(const entry of data.waterfalls){
    if(!object(entry)||typeof entry.vertexKey!=='string'||!(entry.state==='on'||entry.state==='off'))fail('invalid_waterfall_override');
    const e=entry as {vertexKey:string;state:FeatureState};
    if(seen.has(e.vertexKey)||!vertices.has(e.vertexKey))fail('missing_or_duplicate_waterfall_vertex');
    if(e.state==='on'&&eligibility&&!eligibility.waterfall(e.vertexKey))fail('ineligible_waterfall');
    seen.add(e.vertexKey);
  }
}

export type FeatureEdit={type:'rapid';riverId:number;edgeKey:string;state:FeatureState|'auto'}|{type:'waterfall';vertexKey:string;state:FeatureState|'auto'};
/** Absence means Auto. Off is an intention even when the current automatic result is false. */
export function prepareRiverFeatureEdit(features:RiverFeatures,edit:FeatureEdit,rivers:readonly RiverGeometry[],eligibility:FeatureEligibility):RiverFeatures{
  validateRiverFeatures(features,rivers,eligibility);
  if(!['on','off','auto'].includes(edit.state))fail('invalid_feature_state');
  let next:RiverFeatures;
  if(edit.type==='rapid'){
    const river=rivers.find(r=>r.id===edit.riverId);
    if(!river?.vertexPath.slice(1).some((v,i)=>riverFeatureEdge(river.vertexPath[i],v)===edit.edgeKey))fail('stale_rapid_edge');
    const old=features.rapids.find(e=>e.riverId===edit.riverId&&e.edgeKey===edit.edgeKey);
    if((old?.state??'auto')===edit.state)return features;
    const rest=features.rapids.filter(e=>e!==old);
    next={...features,rapids:edit.state==='auto'?rest:[...rest,{riverId:edit.riverId,edgeKey:edit.edgeKey,state:edit.state}]};
  }else{
    if(!rivers.some(r=>r.vertexPath.some(v=>v.key===edit.vertexKey)))fail('stale_waterfall_vertex');
    const old=features.waterfalls.find(e=>e.vertexKey===edit.vertexKey);
    if((old?.state??'auto')===edit.state)return features;
    const rest=features.waterfalls.filter(e=>e!==old);
    next={...features,waterfalls:edit.state==='auto'?rest:[...rest,{vertexKey:edit.vertexKey,state:edit.state}]};
  }
  validateRiverFeatures(next,rivers,eligibility);return next;
}

/** Remove only orphaned feature targets, after the caller has shown the dependency preview. */
export function featuresForSurvivingRivers(features:RiverFeatures,rivers:readonly RiverGeometry[]):RiverFeatures{
  const edges=new Map(rivers.map(r=>[r.id,new Set(r.vertexPath.slice(1).map((v,i)=>riverFeatureEdge(r.vertexPath[i],v)))]));
  const vertices=new Set(rivers.flatMap(r=>r.vertexPath.map(v=>v.key)));
  return {rapids:features.rapids.filter(e=>edges.get(e.riverId)?.has(e.edgeKey)),waterfalls:features.waterfalls.filter(e=>vertices.has(e.vertexKey))};
}

export type EditableRiverSector={id:string;riverId:number|string;sectorIndex:number;vertexPath:RiverVertexValue[];edgeKeys:string[];startVertexKey:string;endVertexKey:string;startReason:'river_start'|'river_confluence'|'lake'|'region_boundary'|'split'|'unknown';endReason:'river_confluence'|'lake'|'region_boundary'|'split'|'unknown'|'river_end';fullness:RiverFullness;assignedRegionId?:number};
export type EditableRiver=RiverGeometry&{regionId:number;sectors:EditableRiverSector[];controlPoints?:{startVertex:RiverVertexValue;endVertex:RiverVertexValue;middlePurpleVertex?:RiverVertexValue;startMode:'existing river endpoint'|'red vertex'|'mountain source'}};
export type RiverEdit={type:'create';path:RiverVertexValue[];regionId:number;fullness:RiverFullness}|{type:'replace';riverId:number;path:RiverVertexValue[];regionId:number;fullness:RiverFullness}|{type:'reverse';riverId:number}|{type:'fullness';riverId:number;edgeKey:string;fullness:RiverFullness}|{type:'remove';riverId:number;includeArms:boolean};
export type RiverEditDocument={rivers:EditableRiver[];riverFeatures:RiverFeatures;nextRiverId:number};
export type RiverEditContext=FeatureEligibility&{
  vertex:(key:string)=>RiverVertexValue|undefined;
  edgeOwners:(edgeKey:string)=>readonly number[];
  blocked:(edgeKey:string)=>boolean;
  event:(key:string,rivers:readonly EditableRiver[])=>boolean;
  network:(rivers:EditableRiver[])=>{network:RiverNetwork;issues:string[]};
  additionalValidation:(before:EditableRiver[],after:EditableRiver[])=>void;
};
function fullnessByEdge(r:EditableRiver):Map<string,RiverFullness>{
  const values=new Map<string,RiverFullness>();
  for(const s of r.sectors)for(const e of s.edgeKeys){if(!isFullness(s.fullness)||values.has(e)&&values.get(e)!==s.fullness)fail('ambiguous_river_fullness');values.set(e,s.fullness);}
  return values;
}
function rebuild(r:EditableRiver,path:RiverVertexValue[],values:ReadonlyMap<string,RiverFullness>,ctx:RiverEditContext):EditableRiver{
  const oldOwner=new Map(r.sectors.flatMap(s=>s.edgeKeys.map(e=>[e,s.assignedRegionId??r.regionId] as const)));
  const sectors:EditableRiverSector[]=path.slice(1).map((b,i)=>{
    const a=path[i],key=riverFeatureEdge(a,b),owners=ctx.edgeOwners(key);
    const prior=oldOwner.get(key);const owner=prior!==undefined&&owners.includes(prior)?prior:owners.includes(r.regionId)?r.regionId:[...owners].sort((a,b)=>a-b)[0];
    if(owner===undefined)fail('unknown_river_edge');
    const f=values.get(key);if(!isFullness(f))fail('unknown_river_fullness');
    return {id:`manual-${r.id}:${key}`,riverId:r.id,sectorIndex:i+1,vertexPath:[{...a},{...b}],edgeKeys:[key],startVertexKey:a.key,endVertexKey:b.key,startReason:i===0?'river_start':'region_boundary',endReason:i===path.length-2?'river_end':'region_boundary',fullness:f!,assignedRegionId:owner};
  });
  const merged:EditableRiverSector[]=[];
  for(let i=0;i<sectors.length;){
    const segment=sectors[i];
    const prior=r.sectors.find(s=>s.startVertexKey===segment.startVertexKey&&s.vertexPath.length>1
      &&s.vertexPath.every((v,j)=>path[i+j]?.key===v.key)
      &&s.edgeKeys.every((k,j)=>sectors[i+j]?.edgeKeys[0]===k&&sectors[i+j]?.fullness===s.fullness
        &&sectors[i+j]?.assignedRegionId===(s.assignedRegionId??r.regionId)));
    if(prior){merged.push(prior);i+=prior.edgeKeys.length;}else{merged.push(segment);i++;}
  }
  const next={...r,vertexPath:path.map(v=>({...v})),sectors:merged};delete next.controlPoints;
  if(!path.slice(1).some((v,i)=>ctx.edgeOwners(riverFeatureEdge(path[i],v)).includes(next.regionId)))next.regionId=sectors[0].assignedRegionId!;
  return next;
}
function components(n:RiverNetwork):RiverNetwork[]{
  const remaining=new Set(n.nodes.map(n=>n.id)),out:RiverNetwork[]=[];
  while(remaining.size){const ids=new Set<string>([remaining.values().next().value!]);for(const id of ids)for(const e of n.edges)if(e.from===id||e.to===id)ids.add(e.from===id?e.to:e.from);for(const id of ids)remaining.delete(id);out.push({nodes:n.nodes.filter(x=>ids.has(x.id)),edges:n.edges.filter(x=>ids.has(x.from))});}return out;
}
/** Check changed components strictly, while leaving unrelated legacy components untouched. */
export function validateEditedRiverNetwork(before:EditableRiver[],after:EditableRiver[],ctx:Pick<RiverEditContext,'network'>):void{
  const a=ctx.network(before),b=ctx.network(after);
  const oldIssues=new Set(a.issues);for(const issue of b.issues)if(!oldIssues.has(issue))fail(issue);
  const signature=(n:RiverNetwork)=>JSON.stringify({nodes:[...n.nodes].sort((a,b)=>a.id.localeCompare(b.id)),edges:[...n.edges].sort((a,b)=>a.id.localeCompare(b.id))});
  const oldComponents=new Set(components(a.network).map(signature));
  for(const c of components(b.network))if(!oldComponents.has(signature(c))){const checked=validateRiverNetwork(c);if(!checked.valid)fail(checked.issues.map(i=>`${i.rule}:${i.code}:${i.nodeId??i.edgeId??''}`).join(';'));}
}
/** Pure preparation; no history, counter, RNG or input object is mutated on any failure. */
export function prepareRiverEdit(doc:RiverEditDocument,edit:RiverEdit,ctx:RiverEditContext):RiverEditDocument{
  validateRiverCounter(doc.rivers,doc.nextRiverId);validateDeltaReferences(doc.rivers);
  const old=edit.type==='create'?undefined:doc.rivers.find(r=>r.id===edit.riverId);
  if(edit.type!=='create'&&!old)fail('stale_river');
  let rivers=doc.rivers,nextRiverId=doc.nextRiverId;
  if(edit.type==='remove'){
    const children=doc.rivers.filter(r=>r.deltaParentRiverId===old!.id);
    if(children.length&&!edit.includeArms)fail('delta_children_require_confirmation');
    const ids=new Set([old!.id,...children.map(r=>r.id)]);rivers=rivers.filter(r=>!ids.has(r.id));
  }else if(edit.type==='fullness'){
    if(!isFullness(edit.fullness))fail('invalid_fullness');const values=fullnessByEdge(old!);const index=old!.vertexPath.slice(1).findIndex((v,i)=>riverFeatureEdge(old!.vertexPath[i],v)===edit.edgeKey);
    if(index<0)fail('stale_river_edge');let left=index,right=index+1;
    while(left>0&&!ctx.event(old!.vertexPath[left].key,doc.rivers))left--;
    while(right<old!.vertexPath.length-1&&!ctx.event(old!.vertexPath[right].key,doc.rivers))right++;
    const keys=old!.vertexPath.slice(left+1,right+1).map((v,i)=>riverFeatureEdge(old!.vertexPath[left+i],v));
    if(keys.some(k=>!values.has(k)))fail('unknown_river_fullness');
    if(keys.every(k=>values.get(k)===edit.fullness))return doc;
    for(const k of keys)values.set(k,edit.fullness);
    rivers=rivers.map(r=>r===old?rebuild(r,r.vertexPath,values,ctx):r);
  }else{
    let path=edit.type==='reverse'?[...old!.vertexPath].reverse():edit.path;
    if(path.length<2||new Set(path.map(v=>v.key)).size!==path.length)fail('invalid_river_path');
    for(const v of path){const real=ctx.vertex(v.key);if(!real||real.x!==v.x||real.y!==v.y)fail('unknown_river_vertex');}
    if(edit.type==='replace'&&JSON.stringify(old!.vertexPath)===JSON.stringify(path))return doc;
    const used=new Set(doc.rivers.filter(r=>r!==old).flatMap(r=>r.vertexPath.slice(1).map((v,i)=>riverFeatureEdge(r.vertexPath[i],v))));
    const oldEdges=new Set(old?.vertexPath.slice(1).map((v,i)=>riverFeatureEdge(old.vertexPath[i],v))??[]);
    for(let i=1;i<path.length;i++){const key=riverFeatureEdge(path[i-1],path[i]);if(!ctx.edgeOwners(key).length)fail('non_adjacent_river_vertices');if(used.has(key))fail('duplicate_river_edge');if(!oldEdges.has(key)&&ctx.blocked(key))fail('obstacle_river_edge');}
    let river=old;
    if(edit.type==='create'){const allocation=allocateRiverId(doc.rivers,doc.nextRiverId);nextRiverId=allocation.nextRiverId;river={id:allocation.id,regionId:edit.regionId,vertexPath:[],sectors:[]};}
    const values=edit.type==='reverse'?fullnessByEdge(old!):new Map(path.slice(1).map((v,i)=>[riverFeatureEdge(path[i],v),edit.fullness] as const));
    river=rebuild(river!,path,values,ctx);rivers=old?rivers.map(r=>r===old?river!:r):[...rivers,river];
  }
  validateDeltaReferences(rivers);validateEditedRiverNetwork(doc.rivers,rivers,ctx);ctx.additionalValidation(doc.rivers,rivers);
  const riverFeatures=featuresForSurvivingRivers(doc.riverFeatures,rivers);
  // Live post-edit eligibility (crossings/lakes/start/confluences) is evaluated by App
  // after it prepares the matching crossings. Never silently discard a forbidden On.
  validateRiverFeatures(riverFeatures,rivers);
  return {...doc,rivers,riverFeatures,nextRiverId};
}
