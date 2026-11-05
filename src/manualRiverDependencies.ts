import {directedRiverCycles,riverFeatureEdge,type EditableRiver} from './manualRivers.ts';
import type {EditableRoad,EditableCrossing} from './manualRoads.ts';
import {buildManualRiverNetwork,type RiverEditingGeometry} from './manualRiverGeometry.ts';
import type {RiverCrossingKind} from './riverCrossings.ts';
const fail=(reason:string):never=>{throw new Error(reason);};
export function knownRiverEdgeFullness(r:EditableRiver,key:string):number|undefined{
  const values=new Set(r.sectors.filter(s=>s.edgeKeys.includes(key)).map(s=>s.fullness));return values.size===1?[...values][0]:undefined;
}
const physical=(r:EditableRiver)=>JSON.stringify([r.id,r.deltaParentRiverId??null,r.vertexPath.map(v=>v.key),r.sectors.flatMap(s=>s.edgeKeys.map(k=>[k,s.fullness,s.assignedRegionId??r.regionId])).sort()]);
/** Preserve every unaffected crossing and kind literally. Only changed river
 * interactions are prepared, never the random/global generation reconciler. */
export function prepareEditedRiverCrossings(before:EditableRiver[],after:EditableRiver[],roads:EditableRoad[],crossings:EditableCrossing[],shared:(a:{q:number;r:number},b:{q:number;r:number})=>string|undefined,kinds:Record<string,RiverCrossingKind>={}):EditableCrossing[]{
  const changed=new Set([...before,...after].filter(r=>!before.some(a=>a.id===r.id&&physical(a)===physical(r))||!after.some(a=>a.id===r.id&&physical(a)===physical(r))).map(r=>r.id));
  const wanted=new Map<string,EditableCrossing>(),used=new Set<string>();
  for(const old of crossings.filter(c=>changed.has(c.riverId))){
    const road=roads.find(r=>r.id===old.roadId),river=before.find(r=>r.id===old.riverId);
    const segment=road?.segments.find(s=>[`${s.from.q},${s.from.r}`,`${s.to.q},${s.to.r}`].sort().join('|')===old.roadSegmentKey);
    if(!river||!segment||shared(segment.from,segment.to)!==old.riverEdgeKey||old.key!==`${old.roadId}:${old.roadSegmentKey}:${old.riverId}`||!river.vertexPath.slice(1).some((v,i)=>riverFeatureEdge(river.vertexPath[i],v)===old.riverEdgeKey))fail('stale_crossing');
  }
  for(const road of roads)for(const segment of road.segments){
    const edge=shared(segment.from,segment.to);if(!edge)continue;
    const pair=[`${segment.from.q},${segment.from.r}`,`${segment.to.q},${segment.to.r}`].sort().join('|');
    for(const river of after.filter(r=>changed.has(r.id)&&r.vertexPath.slice(1).some((v,i)=>riverFeatureEdge(r.vertexPath[i],v)===edge))){
      const key=`${road.id}:${pair}:${river.id}`,old=crossings.find(c=>c.key===key),kind=kinds[key]??old?.kind??'bridge';
      if(old&&(old.roadId!==road.id||old.roadSegmentKey!==pair||old.riverId!==river.id||old.riverEdgeKey!==edge))fail('stale_crossing');
      const f=knownRiverEdgeFullness(river,edge),prior=before.find(r=>r.id===river.id),previousF=prior?knownRiverEdgeFullness(prior,edge):undefined;
      if(f===undefined)fail(`unknown_crossing_fullness:${key}`);
      if(!['bridge','ferry','ford'].includes(kind))fail('invalid_crossing_kind');
      if(kind==='ford'&&f!>=3&&!(old?.kind==='ford'&&previousF===f))fail(`crossing_kind_required:${key}`);
      used.add(key);wanted.set(key,old&&old.kind===kind?old:{key,roadId:road.id,roadSegmentKey:pair,riverId:river.id,riverEdgeKey:edge,kind});
    }
  }
  for(const key of Object.keys(kinds))if(!used.has(key))fail('stale_crossing_choice');
  const result:EditableCrossing[]=[];
  for(const old of crossings)if(!changed.has(old.riverId))result.push(old);else if(wanted.has(old.key)){result.push(wanted.get(old.key)!);wanted.delete(old.key);}
  result.push(...[...wanted.values()].sort((a,b)=>a.key.localeCompare(b.key)));
  return result.length===crossings.length&&result.every((c,i)=>c===crossings[i])?crossings:result;
}
/** BR-009 stays separate from ordinary2→1 confluences. Missing arms are not
 * created, and no quota/RNG/global repair runs during a manual edit. */
export function validateEditedRiverDeltas(before:EditableRiver[],after:EditableRiver[],geometry:RiverEditingGeometry,beforeGeometry:RiverEditingGeometry=geometry):void{
  const group=(rivers:EditableRiver[],parent:number)=>JSON.stringify(rivers.filter(r=>r.id===parent||r.deltaParentRiverId===parent).map(physical).sort());
  for(const parentId of new Set(after.flatMap(r=>r.deltaParentRiverId===undefined?[]:[r.deltaParentRiverId]))){
    const seaSupport=(rivers:EditableRiver[],g:RiverEditingGeometry)=>JSON.stringify(rivers.filter(r=>r.id===parentId||r.deltaParentRiverId===parentId).flatMap(r=>r.vertexPath.map(v=>[v.key,g.seaVertices.has(v.key)])).sort());
    if(group(before,parentId)===group(after,parentId)&&seaSupport(before,beforeGeometry)===seaSupport(after,geometry))continue;
    const parent=after.find(r=>r.id===parentId),arms=after.filter(r=>r.deltaParentRiverId===parentId);
    if(!parent||parent.deltaParentRiverId!==undefined||parent.vertexPath.length<3)fail('delta_parent_conflict');
    const path=parent!.vertexPath,f=knownRiverEdgeFullness(parent!,riverFeatureEdge(path[path.length-2],path[path.length-1]));
    if(!geometry.seaVertices.has(path[path.length-1].key)||f===undefined||f<4||arms.length>(f===4?1:2))fail('delta_parent_conflict');
    const branches=new Set<string>();
    for(const arm of arms){
      if(arm.vertexPath.length!==2)fail('delta_geometry_conflict');const [a,b]=arm.vertexPath,key=riverFeatureEdge(a,b),af=knownRiverEdgeFullness(arm,key);
      if(!path.slice(Math.max(1,path.length-3),path.length-1).some(v=>v.key===a.key)||branches.has(a.key)||geometry.seaVertices.has(a.key)||!geometry.seaVertices.has(b.key)||af===undefined||af<1||af>(f===4?3:4))fail('delta_geometry_conflict');
      if(after.some(r=>r!==arm&&r.vertexPath.slice(1).some((v,i)=>riverFeatureEdge(r.vertexPath[i],v)===key)))fail('delta_overlap');branches.add(a.key);
    }
  }
  // Include marked arms for cycle evidence only. Do not reinterpret their split
  // as an ordinary RIV degree/confluence or charge lake capacity a second time.
  const cycleNetwork=(rivers:EditableRiver[],g:RiverEditingGeometry)=>buildManualRiverNetwork(rivers.map(r=>({...r,deltaParentRiverId:undefined})),g).network;
  const oldCycles=directedRiverCycles(cycleNetwork(before,beforeGeometry));
  for(const cycle of directedRiverCycles(cycleNetwork(after,geometry)))if(!oldCycles.has(cycle))fail('RIV-016:CYCLE:delta');
}
