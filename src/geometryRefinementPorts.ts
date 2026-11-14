/** Unmounted GEO2 terminal/exit port and split-graph preparation.
 * Source junctions use integer vertices. Degree1 terminals may split an edge;
 * they never change grid addresses or represent fractional integer vertices. */
import type {DetailCell,WorldPoint} from './detailGrid.ts';
import {refinementEdgeGraph,refinementWorldPoint,refinementVertexKey,type GridVertex} from './geometryRefinementGrid.ts';
export type RefinementPortRequest=Readonly<{sourceKey:string;point:WorldPoint;degree:1|2|3;allowedEdgeKeys?:readonly string[];exit?:Readonly<{sourceExitRef:string;edgeKeys:readonly string[]}>}>;
export type RefinementPort=Readonly<{sourceKey:string;nodeKey:string;point:WorldPoint;location:Readonly<{kind:'vertex';vertex:GridVertex}>|Readonly<{kind:'edge';edgeKey:string;fraction:number}>;sourceExitRef:string|null}>;
const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
const vk=refinementVertexKey;
const vertexKey=(v:GridVertex)=>JSON.stringify(['vertex',v.x,v.y]);
const freeze=<T>(a:T[])=>Object.freeze(a);
export function prepareRefinementPorts(input:Readonly<{origin:WorldPoint;cells:readonly DetailCell[];requests:readonly RefinementPortRequest[]}>){
 const fail=(code:'invalid_source'|'port_conflict'|'capacity',refs:string[]=[])=>Object.freeze({status:'error' as const,code,refs:freeze(refs),completeGeometryPlan:false as const});
 if(input.cells.length>4096||input.requests.length>4096)return fail('capacity');
 if(![input.origin.x,input.origin.y].every(Number.isFinite))return fail('invalid_source');
 let graph:ReturnType<typeof refinementEdgeGraph>;
 try{graph=refinementEdgeGraph(input.cells);}catch{return fail('invalid_source');}
 if(graph.edges.length*input.requests.length>2000000)return fail('capacity');
 // Count owners from unique cells; internal shared edges are never boundary.
 const cells=new Map(input.cells.map(c=>[`${c.q},${c.r}`,c])),owners=new Map<string,number>();
 for(const cell of cells.values())for(const e of refinementEdgeGraph([cell]).edges)owners.set(e.key,(owners.get(e.key)??0)+1);
 const byEdge=new Map(graph.edges.map(e=>[e.key,e])),seen=new Set<string>(),occupied=new Set<string>(),ports:RefinementPort[]=[];
 for(const request of [...input.requests].sort((a,b)=>lexical(a.sourceKey,b.sourceKey))){
  const ref=request.sourceKey;
  if(!ref||seen.has(ref)||![1,2,3].includes(request.degree)||![request.point.x,request.point.y].every(Number.isFinite))return fail('invalid_source',[ref]);seen.add(ref);
  const allowed=request.allowedEdgeKeys===undefined?new Set(byEdge.keys()):new Set(request.allowedEdgeKeys);
  if(request.allowedEdgeKeys&&allowed.size!==request.allowedEdgeKeys.length||[...allowed].some(k=>!byEdge.has(k)))return fail('invalid_source',[ref]);
  if(request.exit){
   if(request.degree!==1||!request.exit.sourceExitRef||request.exit.edgeKeys.length===0||new Set(request.exit.edgeKeys).size!==request.exit.edgeKeys.length||request.exit.edgeKeys.some(k=>!byEdge.has(k)||owners.get(k)!==1))return fail('invalid_source',[ref]);
   const exit=new Set(request.exit.edgeKeys);for(const k of allowed)if(!exit.has(k))allowed.delete(k);
  }
  type Candidate={nodeKey:string;point:WorldPoint;location:RefinementPort['location'];distance:number;order:readonly number[]};
  const candidates:Candidate[]=[];
  if(request.degree>1){
   const vertices=new Map<string,GridVertex>(),degree=new Map<string,number>();for(const k of allowed){const e=byEdge.get(k)!;for(const v of [e.from,e.to]){vertices.set(vk(v),v);degree.set(vk(v),(degree.get(vk(v))??0)+1);}}
   for(const v of vertices.values()){
    // A junction must have enough allowed incident edges, not just touch one.
    if(degree.get(vk(v))!<request.degree)continue;
    const point=refinementWorldPoint(v,input.origin);candidates.push({nodeKey:vertexKey(v),point,location:Object.freeze({kind:'vertex',vertex:v}),distance:Math.hypot(point.x-request.point.x,point.y-request.point.y),order:[v.x,v.y,0,0,0]});
   }
  }else for(const k of allowed){
   const e=byEdge.get(k)!,a=refinementWorldPoint(e.from,input.origin),b=refinementWorldPoint(e.to,input.origin),dx=b.x-a.x,dy=b.y-a.y;
   let t=Math.max(0,Math.min(1,((request.point.x-a.x)*dx+(request.point.y-a.y)*dy)/(dx*dx+dy*dy)));
   if(t<1e-12)t=0;else if(t>1-1e-12)t=1;
   const v=t===0?e.from:t===1?e.to:null,point=Object.freeze(v?refinementWorldPoint(v,input.origin):{x:a.x+t*dx,y:a.y+t*dy});
   if(![point.x,point.y].every(Number.isFinite))return fail('invalid_source',[ref]);
   const location:RefinementPort['location']=v?Object.freeze({kind:'vertex',vertex:v}):Object.freeze({kind:'edge',edgeKey:k,fraction:t});
   candidates.push({nodeKey:v?vertexKey(v):JSON.stringify(['edge',k,t]),point,location,distance:Math.hypot(point.x-request.point.x,point.y-request.point.y),order:v?[v.x,v.y,0,0,0]:[e.from.x,e.from.y,e.to.x,e.to.y,t]});
  }
  candidates.sort((a,b)=>{const d=a.distance-b.distance;if(Math.abs(d)>1e-10)return d;for(let i=0;i<a.order.length;i++)if(a.order[i]!==b.order[i])return a.order[i]-b.order[i];return lexical(a.nodeKey,b.nodeKey);});
  const chosen=candidates[0];if(!chosen||!Number.isFinite(chosen.distance)||occupied.has(chosen.nodeKey)||ports.some(p=>Math.hypot(p.point.x-chosen.point.x,p.point.y-chosen.point.y)<1e-10))return fail('port_conflict',[ref]);
  occupied.add(chosen.nodeKey);ports.push(Object.freeze({sourceKey:ref,nodeKey:chosen.nodeKey,point:chosen.point,location:chosen.location,sourceExitRef:request.exit?.sourceExitRef??null}));
 }
 const nodes=new Map(graph.vertices.map(v=>[vertexKey(v),Object.freeze({key:vertexKey(v),point:refinementWorldPoint(v,input.origin)})]));
 for(const p of ports)nodes.set(p.nodeKey,Object.freeze({key:p.nodeKey,point:p.point}));
 const edges:Readonly<{sourceEdgeKey:string;from:string;to:string;startFraction:number;endFraction:number}>[]=[];
 for(const e of graph.edges){
  const stops=[{fraction:0,nodeKey:vertexKey(e.from)},...ports.flatMap(p=>p.location.kind==='edge'&&p.location.edgeKey===e.key?[{fraction:p.location.fraction,nodeKey:p.nodeKey}]:[]),{fraction:1,nodeKey:vertexKey(e.to)}].sort((a,b)=>a.fraction-b.fraction);
  for(let i=1;i<stops.length;i++)edges.push(Object.freeze({sourceEdgeKey:e.key,from:stops[i-1].nodeKey,to:stops[i].nodeKey,startFraction:stops[i-1].fraction,endFraction:stops[i].fraction}));
 }
 return Object.freeze({status:'prepared' as const,ports:freeze(ports),nodes:freeze([...nodes.values()]),edges:freeze(edges),boundaryEdgeKeys:freeze(graph.edges.filter(e=>owners.get(e.key)===1).map(e=>e.key)),completeGeometryPlan:false as const});
}
