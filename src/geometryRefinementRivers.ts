/** GEO2 river-only preparation. This is not the complete GeometryPlan and must
 * not be mounted before POI/roads/crossings/mouths and transaction validation. */
import {createDetailGrid,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {detailSegmentSpan} from './detailPlacement.ts';
import {refinementEdgeGraph,refinementPreferredSide,refinementWorldPoint,refinementVertexKey,
 type GridVertex,type GridEdge,type RefinementGraph} from './geometryRefinementGrid.ts';

export type RefinementSourceNode=Readonly<{key:string;point:WorldPoint}>;
export type RefinementRiverSegment=Readonly<{riverId:number;edgeKey:string;from:RefinementSourceNode;to:RefinementSourceNode;fullness:number}>;
export type RefinementRiverPath=Readonly<{riverId:number;sourceEdgeKey:string;fromNode:string;toNode:string;fullness:number;vertices:readonly GridVertex[]}>;
export type RefinementRiverResult=
 |Readonly<{status:'prepared';algorithmVersion:'geo2-v1';sourceSignature:string;nodes:readonly Readonly<{sourceKey:string;vertex:GridVertex}>[];paths:readonly RefinementRiverPath[];completeGeometryPlan:false}>
 |Readonly<{status:'error';code:'invalid_source'|'source_cycle'|'node_conflict'|'route_conflict'|'capacity';refs:readonly string[];completeGeometryPlan:false}>;
const key=refinementVertexKey,cmp=(a:GridVertex,b:GridVertex)=>a.x-b.x||a.y-b.y;
const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
const cellKey=(c:DetailCell)=>`${c.q},${c.r}`;
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
function distance(p:WorldPoint,a:WorldPoint,b:WorldPoint){
 const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
 const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/den));
 const projected={x:a.x+t*dx,y:a.y+t*dy};
 return {squared:(p.x-projected.x)**2+(p.y-projected.y)**2,projected};
}
function comparePath(a:readonly GridVertex[],b:readonly GridVertex[]){for(let i=0;i<Math.min(a.length,b.length);i++){const d=cmp(a[i],b[i]);if(d)return d;}return a.length-b.length;}
type RouteCost={deviation:number;side:number;path:GridVertex[]};
function better(a:RouteCost,b:RouteCost){
 const tolerance=1e-12*Math.max(1,a.deviation,b.deviation),d=a.deviation-b.deviation;
 return Math.abs(d)>tolerance?d<0:a.side!==b.side?a.side<b.side:comparePath(a.path,b.path)<0;
}
/** BFS levels enforce shortest length. Dynamic programming on that DAG then
 * chooses source deviation, seeded side and numeric vertex sequence in order. */
function route(graph:RefinementGraph,start:GridVertex,end:GridVertex,source:RefinementRiverSegment,seed:number,origin:WorldPoint,blockedVertices:ReadonlySet<string>,blockedEdges:ReadonlySet<string>):readonly GridVertex[]|null {
 const adjacent=new Map<string,{v:GridVertex;e:GridEdge}[]>();
 for(const e of graph.edges){
  if(blockedEdges.has(e.key)||[e.from,e.to].some(v=>blockedVertices.has(key(v))))continue;
  for(const [a,b]of [[e.from,e.to],[e.to,e.from]]){const k=key(a);const rows=adjacent.get(k)??[];rows.push({v:b,e});adjacent.set(k,rows);}
 }
 for(const rows of adjacent.values())rows.sort((a,b)=>cmp(a.v,b.v));
 const sk=key(start),ek=key(end),levels=new Map([[sk,0]]),queue=[start];
 for(let i=0;i<queue.length;i++)for(const {v}of adjacent.get(key(queue[i]))??[])if(!levels.has(key(v))){levels.set(key(v),levels.get(key(queue[i]))!+1);queue.push(v);}
 const length=levels.get(ek);if(length===undefined)return null;
 const costs=new Map<string,RouteCost>([[sk,{deviation:0,side:0,path:[start]}]]),grid=createDetailGrid(1,origin);
 for(const v of queue){
  const row=costs.get(key(v)),level=levels.get(key(v))!;if(!row||level>=length)continue;
  for(const {v:next,e}of adjacent.get(key(v))??[]){
   if(levels.get(key(next))!==level+1)continue;
   const a=refinementWorldPoint(e.from,origin),b=refinementWorldPoint(e.to,origin),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
   const d=distance(mid,source.from.point,source.to.point),cross=(source.to.point.x-source.from.point.x)*(mid.y-source.from.point.y)-(source.to.point.y-source.from.point.y)*(mid.x-source.from.point.x);
   const preferred=refinementPreferredSide(seed,source.riverId,source.edgeKey,worldToDetailCell(grid,d.projected));
   const penalty=Math.abs(cross)<1e-12?0:Number((cross>0?'left':'right')!==preferred);
   const candidate={deviation:row.deviation+d.squared,side:row.side+penalty,path:[...row.path,next]},old=costs.get(key(next));
   if(!old||better(candidate,old))costs.set(key(next),candidate);
  }
 }
 return costs.get(ek)?.path??null;
}
/** Atomic immutable river candidate, bounded to existing cells and one ring.
 * Allocation is deterministic source-key order. It does not backtrack earlier
 * paths: route_conflict means bounded allocation failed, not a proof that no
 * other simultaneous allocation exists. Caller must not fall back to old lines. */
export function prepareRefinementRivers(input:Readonly<{seed:number;origin:WorldPoint;cells:readonly DetailCell[];segments:readonly RefinementRiverSegment[]}>):RefinementRiverResult {
 const fail=(code:Extract<RefinementRiverResult,{status:'error'}>['code'],refs:string[]=[]):RefinementRiverResult=>Object.freeze({status:'error',code,refs:Object.freeze(refs),completeGeometryPlan:false});
 if(!Number.isSafeInteger(input.seed)||input.seed<0||input.seed>4294967295||![input.origin.x,input.origin.y].every(Number.isFinite))return fail('invalid_source');
 if(input.cells.length>200000||input.segments.length>4096||input.cells.length*input.segments.length>2000000)return fail('capacity');
 const sorted=[...input.segments].sort((a,b)=>a.riverId-b.riverId||lexical(a.edgeKey,b.edgeKey)),ids=new Set<string>(),nodes=new Map<string,WorldPoint>(),incidence=new Map<string,Set<string>>(),parents=new Map<string,string>();
 const root=(s:string):string=>{let r=s;while(parents.get(r)!==r)r=parents.get(r)!;return r;};
 for(const s of sorted){
  const id=JSON.stringify([s.riverId,s.edgeKey]);
  if(!Number.isSafeInteger(s.riverId)||s.riverId<1||!s.edgeKey||ids.has(id)||!Number.isInteger(s.fullness)||s.fullness<1||s.fullness>5||s.from.key===s.to.key)return fail('invalid_source',[id]);
  ids.add(id);
  for(const n of [s.from,s.to]){
   if(!n.key||![n.point.x,n.point.y].every(Number.isFinite))return fail('invalid_source',[id]);
   const old=nodes.get(n.key);if(old&&Math.hypot(old.x-n.point.x,old.y-n.point.y)>1e-8)return fail('invalid_source',[n.key]);
   if(!old){nodes.set(n.key,n.point);parents.set(n.key,n.key);}
   const row=incidence.get(n.key)??new Set();row.add(id);incidence.set(n.key,row);if(row.size>3)return fail('node_conflict',[n.key]);
  }
  if(Math.hypot(s.from.point.x-s.to.point.x,s.from.point.y-s.to.point.y)<1e-9)return fail('invalid_source',[id]);
  const a=root(s.from.key),b=root(s.to.key);if(a===b)return fail('source_cycle',[id]);parents.set(a,b);
 }
 const grid=createDetailGrid(1,input.origin),available=new Map<string,DetailCell>();
 try{for(const c of input.cells){const k=cellKey(c);if(!Number.isSafeInteger(c.q)||!Number.isSafeInteger(c.r))return fail('invalid_source',[k]);available.set(k,{q:c.q,r:c.r});}}
 catch{return fail('invalid_source');}
 const graphs=new Map<string,RefinementGraph>(),nodeCandidates=new Map<string,Map<string,GridVertex>>();
 try{for(const s of sorted){
  const cells=new Map<string,DetailCell>();
  for(const c of available.values())if(detailSegmentSpan(grid,c,{from:s.from.point,to:s.to.point},true)){
   cells.set(cellKey(c),c);for(const [dq,dr]of directions){const n={q:c.q+dq,r:c.r+dr};if(available.has(cellKey(n)))cells.set(cellKey(n),available.get(cellKey(n))!);}
  }
  if(cells.size>4096)return fail('capacity',[s.edgeKey]);
  const graph=refinementEdgeGraph([...cells.values()]);graphs.set(JSON.stringify([s.riverId,s.edgeKey]),graph);
  for(const n of [s.from,s.to]){
   const vs=new Map(graph.vertices.map(v=>[key(v),v])),old=nodeCandidates.get(n.key);
   nodeCandidates.set(n.key,old?new Map([...old].filter(([k])=>vs.has(k))):vs);
  }
 }}catch{return fail('invalid_source');}
 const ports=new Map<string,GridVertex>(),reserved=new Map<string,string>();
 for(const [sourceKey,p]of [...nodes].sort(([a],[b])=>lexical(a,b))){
  const candidates=[...(nodeCandidates.get(sourceKey)?.values()??[])];
  candidates.sort((a,b)=>{const ap=refinementWorldPoint(a,input.origin),bp=refinementWorldPoint(b,input.origin),ad=(ap.x-p.x)**2+(ap.y-p.y)**2,bd=(bp.x-p.x)**2+(bp.y-p.y)**2;return Math.abs(ad-bd)>1e-10?ad-bd:cmp(a,b);});
  const chosen=candidates[0];if(!chosen||reserved.has(key(chosen)))return fail('node_conflict',[sourceKey]);
  ports.set(sourceKey,chosen);reserved.set(key(chosen),sourceKey);
 }
 // Reserve a distinct approach for every source incidence. Without this, an
 // earlier path can occupy both sides of a later tributary at a shared port.
 const stubs=new Map<string,GridVertex>(),reservedStubs=new Set<string>();
 const stubKey=(s:RefinementRiverSegment,n:string)=>JSON.stringify([s.riverId,s.edgeKey,n]);
 for(const [n,port]of ports){
  const rows=sorted.filter(s=>s.from.key===n||s.to.key===n),p=refinementWorldPoint(port,input.origin);
  let best:{cost:number;side:number;choices:GridVertex[]}|undefined;
  const choose=(i:number,choices:GridVertex[],cost:number,side:number)=>{
   if(i===rows.length){if(!best||cost<best.cost-1e-12||Math.abs(cost-best.cost)<=1e-12&&(side<best.side||side===best.side&&comparePath(choices,best.choices)<0))best={cost,side,choices};return;}
   const s=rows[i],other=ports.get(s.from.key===n?s.to.key:s.from.key)!,target=refinementWorldPoint(other,input.origin),dx=target.x-p.x,dy=target.y-p.y,length=Math.hypot(dx,dy);
   const graph=graphs.get(JSON.stringify([s.riverId,s.edgeKey]))!;
   const adjacent=graph.edges.flatMap(e=>key(e.from)===key(port)?[e.to]:key(e.to)===key(port)?[e.from]:[]).sort(cmp);
   for(const v of adjacent){
    if(choices.some(c=>key(c)===key(v))||reserved.has(key(v))||reservedStubs.has(key(v)))continue;
    const q=refinementWorldPoint(v,input.origin),qx=q.x-p.x,qy=q.y-p.y;
    const mid={x:(p.x+q.x)/2,y:(p.y+q.y)/2},d=distance(mid,s.from.point,s.to.point),cross=(s.to.point.x-s.from.point.x)*(mid.y-s.from.point.y)-(s.to.point.y-s.from.point.y)*(mid.x-s.from.point.x);
    const preferred=refinementPreferredSide(input.seed,s.riverId,s.edgeKey,worldToDetailCell(grid,d.projected)),penalty=Math.abs(cross)<1e-12?0:Number((cross>0?'left':'right')!==preferred);
    choose(i+1,[...choices,v],cost+1-(dx*qx+dy*qy)/(length*Math.hypot(qx,qy)),side+penalty);
   }
  };
  choose(0,[],0,0);if(!best)return fail('node_conflict',[n]);
  for(let i=0;i<rows.length;i++){stubs.set(stubKey(rows[i],n),best.choices[i]);reservedStubs.add(key(best.choices[i]));}
 }
 const occupied=new Set<string>(),usedEdges=new Set<string>(),paths:RefinementRiverPath[]=[];
 for(const s of sorted){
  const a=ports.get(s.from.key)!,b=ports.get(s.to.key)!,sa=stubs.get(stubKey(s,s.from.key))!,sb=stubs.get(stubKey(s,s.to.key))!,blocked=new Set([...occupied,...reserved.keys(),...reservedStubs]);blocked.delete(key(sa));blocked.delete(key(sb));
  const graph=graphs.get(JSON.stringify([s.riverId,s.edgeKey]))!,middle=route(graph,sa,sb,s,input.seed,input.origin,blocked,usedEdges);
  if(!middle)return fail('route_conflict',[String(s.riverId),s.edgeKey]);
  const path=[a,...middle,b];
  for(let i=0;i<path.length;i++){
   occupied.add(key(path[i]));if(i){const ends=[path[i-1],path[i]].sort(cmp);usedEdges.add(`${key(ends[0])}|${key(ends[1])}`);}
  }
  paths.push(Object.freeze({riverId:s.riverId,sourceEdgeKey:s.edgeKey,fromNode:s.from.key,toNode:s.to.key,fullness:s.fullness,vertices:Object.freeze(path)}));
 }
 const sourceSignature=JSON.stringify(['geo2-v1',input.seed,[input.origin.x,input.origin.y],[...available.values()].sort((a,b)=>a.q-b.q||a.r-b.r).map(c=>[c.q,c.r]),sorted.map(s=>[s.riverId,s.edgeKey,s.from.key,[s.from.point.x,s.from.point.y],s.to.key,[s.to.point.x,s.to.point.y],s.fullness])]);
 return Object.freeze({status:'prepared',algorithmVersion:'geo2-v1',sourceSignature,nodes:Object.freeze([...ports].map(([sourceKey,vertex])=>Object.freeze({sourceKey,vertex}))),paths:Object.freeze(paths),completeGeometryPlan:false});
}
