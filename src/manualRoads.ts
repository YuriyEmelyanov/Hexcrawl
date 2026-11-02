import type {RiverCrossingKind} from './riverCrossings';

export type RoadHex = {q:number; r:number};
export type EditableRoad = {id:number; regionId:number; segments:{from:RoadHex;to:RoadHex;kind:'road'|'trail'}[]};
export type EditableCrossing = {key:string;roadId:number;roadSegmentKey:string;riverId:number;riverEdgeKey:string;kind:RiverCrossingKind};
export type RoadDocument = {roads:EditableRoad[];crossings:EditableCrossing[];nextRoadId:number};
export type RoadEdit =
  | {type:'create';path:RoadHex[];kind:'road'|'trail';crossingKinds?:Record<string,RiverCrossingKind>}
  | {type:'kind';roadId:number;segmentKey:string;kind:'road'|'trail'}
  | {type:'remove';roadId:number;segmentKey?:string}
  | {type:'crossing';roadId:number;segmentKey:string;riverId:number;kind:RiverCrossingKind};
/** Geometry and region policy come from the current document, never cached UI. */
export type RoadEditContext = {
  landRegion:(hex:RoadHex)=>number|undefined;
  destination:(hex:RoadHex)=>boolean;
  openExit:(hex:RoadHex)=>boolean;
  blocked:(a:RoadHex,b:RoadHex)=>boolean;
  intersections:(a:RoadHex,b:RoadHex)=>{riverId:number;riverEdgeKey:string;fullness:number}[];
  minima:{regionId:number;minimum:number}[];
};
const key=(h:RoadHex)=>`${h.q},${h.r}`;
export const roadPair=(a:RoadHex,b:RoadHex)=>[key(a),key(b)].sort().join('|');
const adjacent=(a:RoadHex,b:RoadHex)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r))===1;
const fail=(reason:string):never=>{throw new Error(reason);};
const assertKind=(kind:string)=>{if(kind!=='road'&&kind!=='trail') fail('invalid_road_kind');};
function graph(roads:EditableRoad[]) {
  const result=new Map<string,Set<string>>();
  for(const road of roads) for(const {from,to} of road.segments) {
    const a=key(from),b=key(to);
    if(!result.has(a))result.set(a,new Set());if(!result.has(b))result.set(b,new Set());
    result.get(a)!.add(b);result.get(b)!.add(a);
  }
  return result;
}
function component(g:Map<string,Set<string>>,start:string) {
  const seen=new Set<string>(),queue=[start];
  while(queue.length){const k=queue.pop()!;if(seen.has(k))continue;seen.add(k);for(const n of g.get(k)??[])queue.push(n);}
  return seen;
}
const fromKey=(k:string):RoadHex=>{const [q,r]=k.split(',').map(Number);return {q,r};};
function validateNetwork(before:EditableRoad[],after:EditableRoad[],ctx:RoadEditContext,changed:Set<string>) {
  const a=graph(before),b=graph(after),affected=new Set<string>();
  for(const k of changed)for(const n of component(a,k))affected.add(n);
  for(const k of affected) {
    const hex=fromKey(k),oldDegree=a.get(k)?.size??0,newDegree=b.get(k)?.size??0;
    if(newDegree===1&&oldDegree!==1&&!ctx.destination(hex)&&!ctx.openExit(hex))fail('new_internal_dead_end');
    if(oldDegree>0&&newDegree===0&&ctx.openExit(hex))fail('removed_open_exit');
  }
  // Preserve existing connected destinations/junctions in each affected component.
  const visited=new Set<string>();
  for(const k of affected) {
    if(visited.has(k))continue;
    const old=component(a,k);for(const n of old)visited.add(n);
    const required=[...old].filter(n=>ctx.destination(fromKey(n))||ctx.openExit(fromKey(n))||(a.get(n)?.size??0)>2);
    if(required.length<2)continue;
    const reachable=component(b,required[0]);
    if(required.some(n=>!reachable.has(n)))fail('disconnected_destinations');
  }
  for(const {regionId,minimum} of ctx.minima) {
    const count=(roads:EditableRoad[])=>roads.filter(r=>r.regionId===regionId&&r.segments.some(s=>s.kind==='road')).length;
    if(count(after)<Math.min(count(before),minimum))fail('settled_road_minimum');
  }
}
/** Prepare a copy only. Caller must recheck revision and prepare history before setters. */
export function prepareRoadEdit(doc:RoadDocument,edit:RoadEdit,ctx:RoadEditContext):RoadDocument {
  let roads=doc.roads,crossings=doc.crossings,nextRoadId=doc.nextRoadId;
  const touched=new Set<string>();
  const crossingFor=(roadId:number,a:RoadHex,b:RoadHex,riverId:number,kind:RiverCrossingKind):EditableCrossing=>{
    const hits=ctx.intersections(a,b).filter(x=>x.riverId===riverId);
    if(hits.length!==1)fail('missing_or_ambiguous_intersection');
    const hit=hits[0];
    if(!Number.isInteger(hit.fullness)||hit.fullness<1||hit.fullness>5)fail('unknown_fullness');
    if(!['bridge','ferry','ford'].includes(kind)||kind==='ford'&&hit.fullness>=3)fail('invalid_crossing_kind');
    const roadSegmentKey=roadPair(a,b),crossingKey=`${roadId}:${roadSegmentKey}:${riverId}`;
    const old=doc.crossings.filter(c=>c.key===crossingKey);
    if(old.length>1)fail('ambiguous_crossing');
    if(old[0]&&(old[0].roadId!==roadId||old[0].roadSegmentKey!==roadSegmentKey||old[0].riverId!==riverId||old[0].riverEdgeKey!==hit.riverEdgeKey))fail('stale_crossing');
    return old[0]?{...old[0],kind}:{key:crossingKey,roadId,roadSegmentKey,riverId,riverEdgeKey:hit.riverEdgeKey,kind};
  };
  if(edit.type==='create') {
    assertKind(edit.kind);
    if(edit.path.length<2)fail('short_path');
    if(!Number.isSafeInteger(nextRoadId)||nextRoadId<1||nextRoadId>=Number.MAX_SAFE_INTEGER||roads.some(r=>r.id===nextRoadId))fail('invalid_next_road_id');
    const pairs=new Set(roads.flatMap(r=>r.segments.map(s=>roadPair(s.from,s.to)))),network=graph(roads),seen=new Set<string>();
    for(const h of edit.path) {
      if(!Number.isSafeInteger(h.q)||!Number.isSafeInteger(h.r)||ctx.landRegion(h)===undefined)fail('unknown_or_water_hex');
      if(seen.has(key(h)))fail('repeated_hex');seen.add(key(h));
    }
    const validEnd=(h:RoadHex)=>ctx.destination(h)||ctx.openExit(h)||network.has(key(h));
    if(!validEnd(edit.path[0])||!validEnd(edit.path[edit.path.length-1]))fail('invalid_path_end');
    if(edit.path.slice(1,-1).some(h=>network.has(key(h))))fail('network_must_end_path');
    const segments:EditableRoad['segments']=[],added:EditableCrossing[]=[];
    for(let i=1;i<edit.path.length;i++) {
      const from=edit.path[i-1],to=edit.path[i],pair=roadPair(from,to);
      if(!adjacent(from,to))fail('non_adjacent');if(pairs.has(pair))fail('duplicate_segment');if(ctx.blocked(from,to))fail('obstacle');
      segments.push({from:{...from},to:{...to},kind:edit.kind});
      const hits=ctx.intersections(from,to);
      for(const hit of hits)added.push(crossingFor(nextRoadId,from,to,hit.riverId,edit.crossingKinds?.[`${nextRoadId}:${pair}:${hit.riverId}`]??'bridge'));
    }
    roads=[...roads,{id:nextRoadId,regionId:ctx.landRegion(edit.path[0])!,segments}];crossings=[...crossings,...added];nextRoadId++;
  } else {
    const matches=roads.filter(r=>r.id===edit.roadId);if(matches.length!==1)fail('missing_or_ambiguous_road');
    const road=matches[0];
    const segments='segmentKey' in edit&&edit.segmentKey!==undefined?road.segments.filter(s=>roadPair(s.from,s.to)===edit.segmentKey):road.segments;
    if(!segments.length||('segmentKey' in edit&&edit.segmentKey!==undefined&&segments.length!==1))fail('missing_or_ambiguous_segment');
    if(edit.type==='crossing') {
      const segment=segments[0],replacement=crossingFor(road.id,segment.from,segment.to,edit.riverId,edit.kind);
      const old=crossings.find(c=>c.key===replacement.key);if(old?.kind===edit.kind)return doc;
      crossings=old?crossings.map(c=>c.key===replacement.key?replacement:c):[...crossings,replacement];
    } else {
      if(edit.type==='kind') {assertKind(edit.kind);if(segments[0].kind===edit.kind)return doc;}
      const selected=new Set(segments),pairs=new Set(segments.map(s=>roadPair(s.from,s.to)));
      for(const s of segments){touched.add(key(s.from));touched.add(key(s.to));}
      const replacement={...road,segments:edit.type==='remove'?road.segments.filter(s=>!selected.has(s)):road.segments.map(s=>selected.has(s)?{...s,kind:edit.kind}:s)};
      roads=roads.flatMap(r=>r!==road?[r]:replacement.segments.length?[replacement]:[]);
      if(edit.type==='remove')crossings=crossings.filter(c=>c.roadId!==road.id||!pairs.has(c.roadSegmentKey));
      validateNetwork(doc.roads,roads,ctx,touched);
    }
  }
  return {roads,crossings,nextRoadId};
}
