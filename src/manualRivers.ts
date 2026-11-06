import {isFullness, validateRiverNetwork, type RiverNetwork, type Issue} from './riverModel/core.ts';
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
  if(data.rapids.length===0&&data.waterfalls.length===0)return;
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
function applyRiverFeatureIntent(features:RiverFeatures,edit:FeatureEdit,rivers:readonly RiverGeometry[]):RiverFeatures{
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
  return next;
}
/** Absence means Auto. Off remains an intention even when Auto is false. */
export function prepareRiverFeatureEdit(features:RiverFeatures,edit:FeatureEdit,rivers:readonly RiverGeometry[],eligibility:FeatureEligibility):RiverFeatures{
  validateRiverFeatures(features,rivers,eligibility);const next=applyRiverFeatureIntent(features,edit,rivers);
  validateRiverFeatures(next,rivers,eligibility);return next;
}
/** Resolve a prospective document's conflicts together. The original accepted
 * document must be checked before preparing this candidate; no intermediate
 * partially resolved candidate is ever committed. */
export function resolveRiverFeatureEdits(features:RiverFeatures,edits:readonly FeatureEdit[],rivers:readonly RiverGeometry[],eligibility:FeatureEligibility):RiverFeatures{
  validateRiverFeatures(features,rivers);let next=features;
  for(const edit of edits)next=applyRiverFeatureIntent(next,edit,rivers);
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
export type RiverEdit={type:'create';path:RiverVertexValue[];regionId:number;fullness?:RiverFullness;fullnessByEdge?:Record<string,RiverFullness>}|{type:'replace';riverId:number;path:RiverVertexValue[];regionId:number;fullness?:RiverFullness;fullnessByEdge?:Record<string,RiverFullness>}|{type:'reverse';riverId:number}|{type:'fullness';riverId:number;edgeKey:string;fullness:RiverFullness}|{type:'remove';riverId:number;includeArms:boolean};
export type RiverEditDocument={rivers:EditableRiver[];riverFeatures:RiverFeatures;nextRiverId:number};
export type RiverEditContext=FeatureEligibility&{
  vertex:(key:string)=>RiverVertexValue|undefined;
  edgeOwners:(edgeKey:string)=>readonly number[];
  blocked:(edgeKey:string)=>boolean;
  event:(key:string,rivers:readonly EditableRiver[])=>boolean;
  reason?:(key:string,start:boolean,endpoint:boolean,river:EditableRiver)=>EditableRiverSector['startReason']|EditableRiverSector['endReason'];
  network:(rivers:EditableRiver[])=>{network:RiverNetwork;issues:string[]};
  solvePath?:(before:EditableRiver[],river:EditableRiver,path:RiverVertexValue[],fixed:ReadonlyMap<string,RiverFullness>)=>ReadonlyMap<string,RiverFullness>;
  additionalValidation:(before:EditableRiver[],after:EditableRiver[])=>void;
};
function fullnessByEdge(r:EditableRiver):Map<string,RiverFullness>{
  const values=new Map<string,RiverFullness>();
  for(const s of r.sectors)for(const e of s.edgeKeys){if(!isFullness(s.fullness)||values.has(e)&&values.get(e)!==s.fullness)fail('ambiguous_river_fullness');values.set(e,s.fullness);}
  return values;
}
/** Single owner policy shared by final sector rebuild and the unknown-F solver. */
export function riverPathOwners(r:EditableRiver,path:RiverVertexValue[],ctx:Pick<RiverEditContext,'edgeOwners'>):Map<string,number>{
  const oldOwner=new Map(r.sectors.flatMap(s=>s.edgeKeys.map(e=>[e,s.assignedRegionId??r.regionId] as const))),result=new Map<string,number>();
  for(let i=1;i<path.length;i++){
    const key=riverFeatureEdge(path[i-1],path[i]),owners=ctx.edgeOwners(key),prior=oldOwner.get(key);
    if(prior!==undefined&&!owners.includes(prior))fail('invalid_existing_river_owner');
    const owner=prior??(owners.includes(r.regionId)?r.regionId:[...owners].sort((a,b)=>a-b)[0]);
    if(owner===undefined)fail('unknown_river_edge');result.set(key,owner);
  }
  return result;
}
function rebuild(r:EditableRiver,path:RiverVertexValue[],values:ReadonlyMap<string,RiverFullness>,ctx:Pick<RiverEditContext,'edgeOwners'|'reason'>,ownersByEdge=riverPathOwners(r,path,ctx)):EditableRiver{
  const subject={...r,vertexPath:path};
  const sectors:EditableRiverSector[]=path.slice(1).map((b,i)=>{
    const a=path[i],key=riverFeatureEdge(a,b),owner=ownersByEdge.get(key)!;
    const f=values.get(key);if(!isFullness(f))fail('unknown_river_fullness');
    return {id:`manual-${r.id}:${key}`,riverId:r.id,sectorIndex:i+1,vertexPath:[{...a},{...b}],edgeKeys:[key],startVertexKey:a.key,endVertexKey:b.key,startReason:(ctx.reason?.(a.key,true,i===0,subject)??(i===0?'river_start':'region_boundary')) as EditableRiverSector['startReason'],endReason:(ctx.reason?.(b.key,false,i===path.length-2,subject)??(i===path.length-2?'river_end':'region_boundary')) as EditableRiverSector['endReason'],fullness:f!,assignedRegionId:owner};
  });
  const merged:EditableRiverSector[]=[];
  for(let i=0;i<sectors.length;){
    const segment=sectors[i];
    const prior=r.sectors.find(s=>s.startVertexKey===segment.startVertexKey&&s.vertexPath.length>1&&s.startReason===segment.startReason
      &&s.endReason===sectors[i+s.edgeKeys.length-1]?.endReason
      &&s.vertexPath.every((v,j)=>path[i+j]?.key===v.key)
      &&s.edgeKeys.every((k,j)=>sectors[i+j]?.edgeKeys[0]===k&&sectors[i+j]?.fullness===s.fullness
        &&sectors[i+j]?.assignedRegionId===(s.assignedRegionId??r.regionId)));
    if(prior){merged.push(prior);i+=prior.edgeKeys.length;}else{merged.push(segment);i++;}
  }
  const next={...r,vertexPath:path.map(v=>({...v})),sectors:merged};
  if(next.controlPoints){
    const keys=new Set(path.map(v=>v.key)),points=next.controlPoints;
    if(!keys.has(points.startVertex.key)||!keys.has(points.endVertex.key)||points.middlePurpleVertex&&!keys.has(points.middlePurpleVertex.key))delete next.controlPoints;
    else if(r.vertexPath.length===path.length&&path.every((v,i)=>v.key===r.vertexPath[r.vertexPath.length-1-i].key))next.controlPoints={...points,startVertex:points.endVertex,endVertex:points.startVertex};
  }
  if(!path.slice(1).some((v,i)=>ctx.edgeOwners(riverFeatureEdge(path[i],v)).includes(next.regionId)))next.regionId=sectors[0].assignedRegionId!;
  return next;
}
const sortedEdges=(network:RiverNetwork,ids?:Set<string>)=>network.edges.filter(e=>!ids||ids.has(e.from)&&ids.has(e.to)).map(e=>[e.id,e.from,e.to,e.regionId,e.height,e.fullness??null]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
/** Physical support makes a grandfathered violation precise: a changed F, port,
 * direction or lake area cannot borrow an old code at the same transient node. */
function numericViolations(network:RiverNetwork):Map<string,Issue>{
  const found=new Map<string,Issue>();
  const remember=(issue:Issue)=>{
    if(issue.code==='CYCLE')return;
    const node=network.nodes.find(n=>n.id===issue.nodeId),edge=network.edges.find(e=>e.id===issue.edgeId);
    const support=node?network.edges.filter(e=>e.from===node.id||e.to===node.id):edge?network.edges.filter(e=>e.id===edge.id):network.edges;
    const signature=JSON.stringify([issue.rule,issue.code,node??null,sortedEdges({nodes:[],edges:support})]);
    found.set(signature,issue);
  };
  for(const issue of validateRiverNetwork(network).issues)remember(issue);
  // A degree error elsewhere must not hide a new flow violation. Check each
  // junction against its actual incident ports and open immutable exterior.
  for(const node of network.nodes){
    const local:RiverNetwork={nodes:[node],edges:[]};
    for(const edge of network.edges.filter(e=>e.from===node.id||e.to===node.id)){
      const from=edge.from===node.id?node.id:`fixed:start:${edge.id}`,to=edge.to===node.id?node.id:`fixed:end:${edge.id}`;
      local.edges.push({...edge,from,to});
      if(from!==node.id)local.nodes.push({id:from,kind:'open'});
      if(to!==node.id)local.nodes.push({id:to,kind:'open'});
    }
    for(const issue of validateRiverNetwork(local).issues)if(!issue.nodeId||issue.nodeId===node.id)remember(issue);
  }
  for(const signature of directedRiverCycles(network))found.set(signature,{rule:'RIV-016',code:'CYCLE',message:'New or changed directed river cycle'});
  return found;
}
/** Canonical cycle evidence shared with the BR-009 dependency preflight. */
export function directedRiverCycles(network:RiverNetwork):Set<string>{
  const cycles=new Set<string>();
  // Iterative Kosaraju: compare the actual cyclic physical subgraphs, not one
  // global CYCLE flag which could mask a second/new cycle on the same map.
  const outgoing=new Map(network.nodes.map(n=>[n.id,[] as string[]])),incoming=new Map(network.nodes.map(n=>[n.id,[] as string[]]));
  for(const e of network.edges){outgoing.get(e.from)?.push(e.to);incoming.get(e.to)?.push(e.from);}
  const seen=new Set<string>(),order:string[]=[];
  for(const node of network.nodes)if(!seen.has(node.id)){
    const stack:[string,boolean][]=[[node.id,false]];
    while(stack.length){const [id,done]=stack.pop()!;if(done){order.push(id);continue;}if(seen.has(id))continue;seen.add(id);stack.push([id,true]);for(const next of outgoing.get(id)??[])if(!seen.has(next))stack.push([next,false]);}
  }
  seen.clear();
  for(const id of order.reverse())if(!seen.has(id)){
    const ids=new Set<string>(),queue=[id];
    while(queue.length){const key=queue.pop()!;if(seen.has(key))continue;seen.add(key);ids.add(key);queue.push(...(incoming.get(key)??[]).filter(k=>!seen.has(k)));}
    if(ids.size>1||network.edges.some(e=>e.from===id&&e.to===id))cycles.add(JSON.stringify(['RIV-016','CYCLE',[...ids].sort(),sortedEdges(network,ids)]));
  }
  return cycles;
}
/** Preserve exact unchanged legacy interactions, including within a connected
 * component; strictly reject every new/changed physical or numeric violation. */
export function validateEditedRiverNetwork(before:EditableRiver[],after:EditableRiver[],ctx:Pick<RiverEditContext,'network'>,beforeContext:Pick<RiverEditContext,'network'>=ctx):void{
  const a=beforeContext.network(before),b=ctx.network(after);
  const oldIssues=new Set(a.issues);for(const issue of b.issues)if(!oldIssues.has(issue))fail(issue);
  const existing=numericViolations(a.network);
  for(const [signature,issue] of numericViolations(b.network))if(!existing.has(signature))fail(`${issue.rule}:${issue.code}:${issue.nodeId??issue.edgeId??''}`);
}
/** Rebuild only derived sectors for a changed water context; F and physical path
 * are immutable. Unaffected sectors/control points retain their accepted data. */
export function rebuildRiverWaterSectors(r:EditableRiver,ctx:Pick<RiverEditContext,'edgeOwners'|'reason'>):EditableRiver{
  return rebuild(r,r.vertexPath,fullnessByEdge(r),ctx);
}
/** Region edits never choose an arbitrary adjacent owner. Only an explicit
 * single-hex transfer may replace its former owner, and only with the receiving
 * region where the very same physical edge is supported after the transfer. */
export function rebuildRiverRegionSectors(r:EditableRiver,before:Pick<RiverEditContext,'edgeOwners'>,after:Pick<RiverEditContext,'edgeOwners'|'reason'>,transfer?:{fromRegionId:number;toRegionId:number}):EditableRiver{
  const accepted=new Map<string,Set<number>>();
  for(const s of r.sectors)for(const key of s.edgeKeys){
    const values=accepted.get(key)??new Set<number>();values.add(s.assignedRegionId??r.regionId);accepted.set(key,values);
  }
  const owners=new Map<string,number>();
  for(let i=1;i<r.vertexPath.length;i++){
    const key=riverFeatureEdge(r.vertexPath[i-1],r.vertexPath[i]),values=accepted.get(key);
    if(values?.size!==1)fail('ambiguous_river_owner');
    const prior=[...values!][0];
    if(!before.edgeOwners(key).includes(prior))fail('invalid_existing_river_owner');
    if(after.edgeOwners(key).includes(prior))owners.set(key,prior);
    else if(transfer&&prior===transfer.fromRegionId&&after.edgeOwners(key).includes(transfer.toRegionId))owners.set(key,transfer.toRegionId);
    else fail('region_river_owner_conflict');
  }
  const next=rebuild(r,r.vertexPath,fullnessByEdge(r),after,owners);
  if(new Set(next.sectors.map(s=>s.id)).size!==next.sectors.length)fail('river_sector_identity_conflict');
  return JSON.stringify(next)===JSON.stringify(r)?r:next;
}
/** Compare the actual directed owner contacts, including each confluence input.
 * An unrelated high neighboring region is not the height of a valley river.
 * Legacy uphill support is grandfathered only when the exact contact is intact. */
export function validateRegionRiverHeights(before:RiverNetwork,after:RiverNetwork):void{
  const uphill=(network:RiverNetwork)=>{
    const result=new Set<string>();
    const outgoingByNode=new Map<string,RiverNetwork['edges']>();
    for(const edge of network.edges){const edges=outgoingByNode.get(edge.from)??[];edges.push(edge);outgoingByNode.set(edge.from,edges);}
    for(const incoming of network.edges)for(const outgoing of outgoingByNode.get(incoming.to)??[]){
      if(incoming.regionId===outgoing.regionId||incoming.height>=outgoing.height)continue;
      result.add(JSON.stringify([incoming.to,incoming.id,incoming.regionId,incoming.height,incoming.fullness,outgoing.id,outgoing.regionId,outgoing.height,outgoing.fullness]));
    }
    return result;
  };
  const old=uphill(before);for(const contact of uphill(after))if(!old.has(contact))fail(`region_river_uphill:${contact}`);
}
/** Pure preparation; no history, counter, RNG or input object is mutated on any failure. */
export function prepareRiverEdit(doc:RiverEditDocument,edit:RiverEdit,ctx:RiverEditContext):RiverEditDocument{
  validateRiverCounter(doc.rivers,doc.nextRiverId);validateDeltaReferences(doc.rivers);validateRiverFeatures(doc.riverFeatures,doc.rivers,ctx);
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
    for(const v of path){const real=ctx.vertex(v.key);if(!real||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.abs(real.x-v.x)>0.001||Math.abs(real.y-v.y)>0.001)fail('unknown_river_vertex');}
    // Canonical keys identify the physical vertex. Adjacent hexes can produce
    // sub-ulp coordinate differences; retain accepted coordinates on reused
    // vertices so a no-op/unchanged fragment remains byte-for-byte unchanged.
    path=path.map(v=>old?.vertexPath.find(prior=>prior.key===v.key)??ctx.vertex(v.key)!);
    if(edit.type==='replace'&&edit.fullness===undefined&&edit.fullnessByEdge===undefined&&JSON.stringify(old!.vertexPath)===JSON.stringify(path))return doc;
    const used=new Set(doc.rivers.filter(r=>r!==old).flatMap(r=>r.vertexPath.slice(1).map((v,i)=>riverFeatureEdge(r.vertexPath[i],v))));
    const oldEdges=new Set(old?.vertexPath.slice(1).map((v,i)=>riverFeatureEdge(old.vertexPath[i],v))??[]);
    const contacts=new Set(doc.rivers.filter(r=>r!==old).flatMap(r=>r.vertexPath.map(v=>v.key)));
    for(let i=1;i<path.length-1;i++)if(contacts.has(path[i].key)){
      const j=old?.vertexPath.findIndex(v=>v.key===path[i].key)??-1;
      if(j<1||old!.vertexPath[j-1]?.key!==path[i-1].key||old!.vertexPath[j+1]?.key!==path[i+1].key)fail('river_connection_must_end_path');
    }
    for(let i=1;i<path.length;i++){const key=riverFeatureEdge(path[i-1],path[i]);if(!ctx.edgeOwners(key).length)fail('non_adjacent_river_vertices');if(used.has(key))fail('duplicate_river_edge');if(!oldEdges.has(key)&&ctx.blocked(key))fail('obstacle_river_edge');}
    let river=old;
    if(edit.type==='create'){const allocation=allocateRiverId(doc.rivers,doc.nextRiverId);nextRiverId=allocation.nextRiverId;river={id:allocation.id,regionId:edit.regionId,vertexPath:[],sectors:[]};}
    let values:Map<string,RiverFullness>;
    if(edit.type==='reverse')values=fullnessByEdge(old!);
    else{
      if(edit.fullness!==undefined&&!isFullness(edit.fullness))fail('invalid_fullness');
      if(edit.fullnessByEdge!==undefined&&!object(edit.fullnessByEdge))fail('invalid_fullness_conditions');
      const oldValues=old?fullnessByEdge(old):new Map<string,RiverFullness>();
      const keys=path.slice(1).map((v,i)=>riverFeatureEdge(path[i],v));values=new Map();
      for(const [key,f] of Object.entries(edit.fullnessByEdge??{}))if(!keys.includes(key)||!isFullness(f))fail('invalid_fullness_conditions');
      if(edit.fullness!==undefined&&Object.values(edit.fullnessByEdge??{}).some(f=>f!==edit.fullness))fail('conflicting_fullness_conditions');
      const released=new Set<string>(),desired=new Map<string,RiverFullness>(),proposal=[...doc.rivers.filter(r=>r!==old),{...river!,vertexPath:path}];
      for(const key of Object.keys(edit.fullnessByEdge??{})){
        const index=keys.indexOf(key);let left=index,right=index+1;
        while(left>0&&!ctx.event(path[left].key,proposal))left--;
        while(right<path.length-1&&!ctx.event(path[right].key,proposal))right++;
        for(let i=left;i<right;i++){const f=edit.fullnessByEdge![key];if(desired.has(keys[i])&&desired.get(keys[i])!==f)fail('conflicting_fullness_conditions');desired.set(keys[i],f);released.add(keys[i]);}
      }
      if(edit.type==='replace'&&JSON.stringify(old!.vertexPath)===JSON.stringify(path)&&[...desired].every(([key,f])=>oldValues.get(key)===f)&&(edit.fullness===undefined||keys.every(key=>oldValues.get(key)===edit.fullness)))return doc;
      for(const key of keys){
        if(oldEdges.has(key)&&!oldValues.has(key))fail('unknown_fixed_river_fullness');
        const f=edit.fullnessByEdge?.[key]??edit.fullness??(released.has(key)?undefined:oldValues.get(key));
        if(f!==undefined)values.set(key,f);
      }
      if(values.size!==keys.length){
        if(!ctx.solvePath)fail('river_solver_unavailable');
        const solved=ctx.solvePath!(doc.rivers,river!,path,values);
        for(const key of keys)if(!isFullness(solved.get(key)))fail('incomplete_river_solution');
        for(const [key,f] of values)if(solved.get(key)!==f)fail('river_solver_changed_fixed_value');
        values=new Map(keys.map(key=>[key,solved.get(key)!]));
      }
    }
    if(edit.type==='replace'&&JSON.stringify(old!.vertexPath)===JSON.stringify(path)&&[...values].every(([key,f])=>fullnessByEdge(old!).get(key)===f))return doc;
    river=rebuild(river!,path,values,ctx);rivers=old?rivers.map(r=>r===old?river!:r):[...rivers,river];
  }
  validateDeltaReferences(rivers);validateEditedRiverNetwork(doc.rivers,rivers,ctx);ctx.additionalValidation(doc.rivers,rivers);
  const riverFeatures=featuresForSurvivingRivers(doc.riverFeatures,rivers);
  // Live post-edit eligibility (crossings/lakes/start/confluences) is evaluated by App
  // after it prepares the matching crossings. Never silently discard a forbidden On.
  validateRiverFeatures(riverFeatures,rivers);
  return {...doc,rivers,riverFeatures,nextRiverId};
}

/** Reserve IDs once a generation proposal is complete, before names/crossings are prepared.
 * Provisional generator IDs may be below the persisted floor after a deletion.
 * Existing identities never change; failed proposals never advance a live counter.
 */
export function reserveGeneratedRiverIds<R extends EditableRiver>(before:readonly R[],proposal:R[],nextRiverId:number):{rivers:R[];nextRiverId:number}{
  validateRiverCounter(before,nextRiverId);
  const existing=new Set(before.map(r=>r.id)),seen=new Set<number>(),remap=new Map<number,number>();
  let counter=nextRiverId;
  for(const r of proposal){
    if(!safe(r.id)||seen.has(r.id))fail('invalid_or_duplicate_generated_river_id');
    seen.add(r.id);
    if(!existing.has(r.id)){
      if(counter>=Number.MAX_SAFE_INTEGER)fail('river_id_overflow');
      remap.set(r.id,counter++);
    }
  }
  const rivers=proposal.map(r=>{
    const id=remap.get(r.id)??r.id,parent=r.deltaParentRiverId===undefined?undefined:remap.get(r.deltaParentRiverId)??r.deltaParentRiverId;
    if(id===r.id&&parent===r.deltaParentRiverId)return r;
    return {...r,id,...(parent===undefined?{}:{deltaParentRiverId:parent}),sectors:r.sectors.map(s=>({...s,id:id===r.id?s.id:`river-${id}-sector-${s.sectorIndex}`,riverId:typeof s.riverId==='string'?String(id):id}))};
  });
  validateDeltaReferences(rivers);validateRiverCounter(rivers,counter);
  return {rivers,nextRiverId:counter};
}
