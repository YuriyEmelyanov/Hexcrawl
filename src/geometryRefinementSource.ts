/** GEO2 bridge from accepted source sectors and already resolved visual marks.
 * Unmounted: no source writes, generation, eligibility rolls or complete plan. */
import type {EditableRiver} from './manualRivers.ts';
import {detailSourcePixelToWorld} from './detailGeography.ts';
import type {DetailCell,WorldPoint} from './detailGrid.ts';
import {prepareRefinementRivers,type RefinementRiverSegment,type RefinementRiverPath} from './geometryRefinementRivers.ts';
import {refinementWorldPoint} from './geometryRefinementGrid.ts';

type Boundary=Readonly<{riverId:number;sectorId:string;sourceNodeKey:string;end:'start'|'end';reason:string;assignedRegionId:number|null}>;
type SectorRef=Readonly<{riverId:number;sectorId:string;sectorIndex:number;assignedRegionId:number|null;edgeKeys:readonly string[]}>;
type Rapid=Readonly<{riverId:number;sourceEdgeKey:string}>;
type SourceInput=Readonly<{rivers:readonly EditableRiver[];origin:WorldPoint;marks:Readonly<{rapids:ReadonlySet<string>;waterfalls:ReadonlySet<string>}>}>;
export type NormalizedRefinementSource=Readonly<{status:'prepared';segments:readonly RefinementRiverSegment[];sectors:readonly SectorRef[];boundaries:readonly Boundary[];rapids:readonly Rapid[];waterfalls:readonly string[];sourceSignature:string;completeGeometryPlan:false}>;
type SourceError=Readonly<{status:'error';code:'invalid_source'|'capacity'|'feature_conflict';refs:readonly string[];completeGeometryPlan:false}>;
const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
const edgeKey=(a:string,b:string)=>[a,b].sort().join('|');
const id=(r:Readonly<{riverId:number;sourceEdgeKey:string}>)=>JSON.stringify([r.riverId,r.sourceEdgeKey]);
const frozen=<T>(value:T[])=>Object.freeze(value);
const error=(code:SourceError['code'],refs:string[]=[]):SourceError=>Object.freeze({status:'error',code,refs:frozen(refs),completeGeometryPlan:false});
const positive=(n:number)=>Number.isSafeInteger(n)&&n>0;
const validKey=(s:string)=>typeof s==='string'&&s.length>0&&s.length<=2048;
const starts=new Set(['river_start','river_confluence','lake','region_boundary','split','unknown']);
const ends=new Set(['river_end','river_confluence','lake','region_boundary','split','unknown']);
/** Sector and primary path must describe exactly the same directed edges.
 * Inconsistent source is not repaired by a fallback fullness or silent reverse.
 * Marks are the accepted renderer's resolved regionMarkKeys, including overrides
 * and visibility filtering; no new feature selection is performed here. */
export function normalizeRefinementRiverSource(input:SourceInput):NormalizedRefinementSource|SourceError {
 if(![input.origin.x,input.origin.y].every(Number.isFinite))return error('invalid_source');
 if(input.rivers.length>4096||input.marks.rapids.size>4096||input.marks.waterfalls.size>4096)return error('capacity');
 const seenRivers=new Set<number>(),positions=new Map<string,WorldPoint>(),allEdges=new Set<string>(),segments:RefinementRiverSegment[]=[],sectors:SectorRef[]=[],boundaries:Boundary[]=[],rapids:Rapid[]=[];
 for(const river of [...input.rivers].sort((a,b)=>a.id-b.id)){
  const ref=`river:${river.id}`;
  if(!positive(river.id)||seenRivers.has(river.id)||!positive(river.regionId)||river.vertexPath.length<2||river.sectors.length===0)return error('invalid_source',[ref]);
  seenRivers.add(river.id);
  if(segments.length+river.vertexPath.length-1>4096||river.sectors.length>4096)return error('capacity',[ref]);
  const pathNodes=new Map<string,WorldPoint>(),pathEdges=new Map<string,{from:string;to:string}>();
  for(const v of river.vertexPath){
   if(!validKey(v.key)||![v.x,v.y].every(Number.isFinite)||pathNodes.has(v.key))return error('invalid_source',[ref,String(v.key)]);
   const p=detailSourcePixelToWorld(v,input.origin),old=positions.get(v.key);
   if(old&&Math.hypot(old.x-p.x,old.y-p.y)>1e-8)return error('invalid_source',[ref,v.key]);
   positions.set(v.key,p);pathNodes.set(v.key,p);
  }
  for(let i=1;i<river.vertexPath.length;i++){
   const from=river.vertexPath[i-1].key,to=river.vertexPath[i].key,k=edgeKey(from,to);
   // Geometric source edges cannot belong to independent river entities.
   if(allEdges.has(k))return error('invalid_source',[ref,k]);allEdges.add(k);pathEdges.set(k,{from,to});
  }
  const covered=new Set<string>(),sectorIds=new Set<string>(),indices=new Set<number>();
  for(const s of [...river.sectors].sort((a,b)=>a.sectorIndex-b.sectorIndex||lexical(a.id,b.id))){
   if(!validKey(s.id)||sectorIds.has(s.id)||!positive(s.sectorIndex)||indices.has(s.sectorIndex)||String(s.riverId)!==String(river.id)||!Number.isInteger(s.fullness)||s.fullness<1||s.fullness>5||s.vertexPath.length<2||s.edgeKeys.length!==s.vertexPath.length-1||s.assignedRegionId!==undefined&&!positive(s.assignedRegionId)||!starts.has(s.startReason)||!ends.has(s.endReason)||s.startVertexKey!==s.vertexPath[0].key||s.endVertexKey!==s.vertexPath[s.vertexPath.length-1].key)return error('invalid_source',[ref,s.id]);
   sectorIds.add(s.id);indices.add(s.sectorIndex);
   const listed=new Set(s.edgeKeys);if(listed.size!==s.edgeKeys.length)return error('invalid_source',[ref,s.id]);
   const ordered:string[]=[];
   for(let i=0;i<s.vertexPath.length;i++){
    const v=s.vertexPath[i],p=pathNodes.get(v.key);
    if(!p||![v.x,v.y].every(Number.isFinite))return error('invalid_source',[ref,s.id,v.key]);
    const world=detailSourcePixelToWorld(v,input.origin);if(Math.hypot(world.x-p.x,world.y-p.y)>1e-8)return error('invalid_source',[ref,s.id,v.key]);
    if(!i)continue;
    const from=s.vertexPath[i-1].key,to=v.key,k=edgeKey(from,to),source=pathEdges.get(k);
    if(!source||source.from!==from||source.to!==to||!listed.has(k)||covered.has(k))return error('invalid_source',[ref,s.id,k]);
    covered.add(k);ordered.push(k);
    segments.push(Object.freeze({riverId:river.id,edgeKey:k,from:Object.freeze({key:from,point:Object.freeze({...pathNodes.get(from)!})}),to:Object.freeze({key:to,point:Object.freeze({...p})}),fullness:s.fullness}));
    if(input.marks.rapids.has(k))rapids.push(Object.freeze({riverId:river.id,sourceEdgeKey:k}));
   }
   const assignedRegionId=s.assignedRegionId??null;
   sectors.push(Object.freeze({riverId:river.id,sectorId:s.id,sectorIndex:s.sectorIndex,assignedRegionId,edgeKeys:frozen(ordered)}));
   for(const end of ['start','end'] as const)boundaries.push(Object.freeze({riverId:river.id,sectorId:s.id,sourceNodeKey:end==='start'?s.startVertexKey:s.endVertexKey,end,reason:end==='start'?s.startReason:s.endReason,assignedRegionId}));
  }
  if(covered.size!==pathEdges.size)return error('invalid_source',[ref,'uncovered_edge']);
 }
 for(const k of input.marks.rapids)if(!allEdges.has(k))return error('feature_conflict',[k]);
 for(const k of input.marks.waterfalls)if(!positions.has(k))return error('feature_conflict',[k]);
 segments.sort((a,b)=>a.riverId-b.riverId||lexical(a.edgeKey,b.edgeKey));rapids.sort((a,b)=>a.riverId-b.riverId||lexical(a.sourceEdgeKey,b.sourceEdgeKey));
 const waterfalls=frozen([...input.marks.waterfalls].sort(lexical));
 const sourceSignature=JSON.stringify(['geo2-source-v1',segments.map(s=>[s.riverId,s.edgeKey,s.from.key,[s.from.point.x,s.from.point.y],s.to.key,[s.to.point.x,s.to.point.y],s.fullness]),sectors,boundaries,rapids,waterfalls]);
 return Object.freeze({status:'prepared',segments:frozen(segments),sectors:frozen(sectors),boundaries:frozen(boundaries),rapids:frozen(rapids),waterfalls,sourceSignature,completeGeometryPlan:false});
}
/** Directed arc position; at a bend use the sum of adjacent unit tangents.
 * Endpoint tangents still point downstream, including at a path's final node. */
function arc(path:RefinementRiverPath,origin:WorldPoint,fraction:number){
 const points=path.vertices.map(v=>refinementWorldPoint(v,origin)),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
 const total=lengths.reduce((a,b)=>a+b,0),target=total*fraction,tolerance=1e-10*Math.max(1,total);
 const unit=(i:number)=>({x:(points[i+1].x-points[i].x)/lengths[i],y:(points[i+1].y-points[i].y)/lengths[i]});
 let at=0;
 for(let i=0;i<lengths.length;i++){
  const end=at+lengths[i];
  if(target<=end+tolerance||i===lengths.length-1){
   const t=Math.max(0,Math.min(1,(target-at)/lengths[i])),point=Object.freeze({x:points[i].x+t*(points[i+1].x-points[i].x),y:points[i].y+t*(points[i+1].y-points[i].y)});
   let tangent=unit(i);
   const neighbor=Math.abs(target-end)<=tolerance&&i+1<lengths.length?i+1:Math.abs(target-at)<=tolerance&&i>0?i-1:null;
   if(neighbor!==null){const b=unit(neighbor);tangent={x:tangent.x+b.x,y:tangent.y+b.y};}
   const size=Math.hypot(tangent.x,tangent.y);return Object.freeze({point,tangent:Object.freeze({x:tangent.x/size,y:tangent.y/size}),fraction});
  }
  at=end;
 }
 throw Error('GEO2 empty prepared path');
}
/** Still only a river candidate. Boundary refs are preserved, not a claim that
 * exits already satisfy the future generated-map boundary/shore constraints. */
export function prepareRefinementRiverNetwork(input:SourceInput&Readonly<{seed:number;cells:readonly DetailCell[]}>){
 const source=normalizeRefinementRiverSource(input);if(source.status==='error')return source;
 const rivers=prepareRefinementRivers({seed:input.seed,origin:input.origin,cells:input.cells,segments:source.segments});if(rivers.status==='error')return rivers;
 const paths=new Map(rivers.paths.map(p=>[id(p),p])),ports=new Map(rivers.nodes.map(n=>[n.sourceKey,n.vertex]));
 const rapids=frozen(source.rapids.map(r=>Object.freeze({...r,kind:'rapid' as const,sourceRef:`rapid:${r.riverId}:${r.sourceEdgeKey}`,...arc(paths.get(id(r))!,input.origin,.5)})));
 const waterfalls=frozen(source.waterfalls.map(sourceNodeKey=>Object.freeze({kind:'waterfall' as const,sourceRef:`vertex:${sourceNodeKey}`,sourceNodeKey,point:Object.freeze(refinementWorldPoint(ports.get(sourceNodeKey)!,input.origin)),incidences:frozen(rivers.paths.filter(p=>p.fromNode===sourceNodeKey||p.toNode===sourceNodeKey).map(p=>Object.freeze({riverId:p.riverId,sourceEdgeKey:p.sourceEdgeKey,flow:p.fromNode===sourceNodeKey?'leaving' as const:'entering' as const,...arc(p,input.origin,p.fromNode===sourceNodeKey?0:1)})))})));
 const boundaries=frozen(source.boundaries.map(b=>Object.freeze({...b,point:Object.freeze(refinementWorldPoint(ports.get(b.sourceNodeKey)!,input.origin))})));
 return Object.freeze({status:'prepared' as const,source,rivers,rapids,waterfalls,boundaries,completeGeometryPlan:false as const});
}
