/** Bounded GEO2 integration: split allocated endpoint edges, keep the already
 * validated interior skeleton. This is not global port/path re-optimization. */
import type {WorldPoint} from './detailGrid.ts';
import {prepareRefinementRiverNetwork,refinementPolylineArc} from './geometryRefinementSource.ts';
import {prepareRefinementPorts} from './geometryRefinementPorts.ts';
import {type GridVertex} from './geometryRefinementGrid.ts';
const freeze=<T>(a:T[])=>Object.freeze(a);
const edge=(a:GridVertex,b:GridVertex)=>{const [x,y]=a.x-b.x||a.y-b.y?[a,b].sort((a,b)=>a.x-b.x||a.y-b.y):[a,b];return `${x.x},${x.y}|${y.x},${y.y}`;};
const vertex=(v:GridVertex)=>JSON.stringify(['vertex',v.x,v.y]);
const pid=(r:number,e:string)=>JSON.stringify([r,e]);
export function prepareRefinementTerminalRoutes(input:Parameters<typeof prepareRefinementRiverNetwork>[0]){
 const base=prepareRefinementRiverNetwork(input);if(base.status==='error')return base;
 const fail=(refs:string[])=>Object.freeze({status:'error' as const,code:'terminal_conflict' as const,refs:freeze(refs),completeGeometryPlan:false as const});
 const requests=new Map<string,{sourceKey:string;point:{x:number;y:number};degree:1|2|3;allowedEdgeKeys:string[]}>();
 for(const path of base.rivers.paths){
  const s=base.source.segments.find(s=>s.riverId===path.riverId&&s.edgeKey===path.sourceEdgeKey)!;
  for(const [n,vs]of [[s.from,path.vertices],[s.to,[...path.vertices].reverse()]] as const){
   const row=requests.get(n.key)??{sourceKey:n.key,point:n.point,degree:0,allowedEdgeKeys:[] as string[]};
   row.degree++;
   row.allowedEdgeKeys.push(edge(vs[0],vs[1]));requests.set(n.key,row as {sourceKey:string;point:{x:number;y:number};degree:1|2|3;allowedEdgeKeys:string[]});
  }
 }
 const prepared=prepareRefinementPorts({origin:input.origin,cells:input.cells,requests:[...requests.values()]});if(prepared.status==='error')return prepared;
 const ports=new Map(prepared.ports.map(p=>[p.sourceKey,p])),nodes=new Map(prepared.nodes.map(n=>[n.key,n.point]));
 const sourceNodes=new Map(base.rivers.nodes.map(n=>[n.sourceKey,vertex(n.vertex)]));
 const byEdge=new Map<string,typeof prepared.edges[number][]>();for(const e of prepared.edges)byEdge.set(e.sourceEdgeKey,[...(byEdge.get(e.sourceEdgeKey)??[]),e]);
 const paths:Readonly<{riverId:number;sourceEdgeKey:string;fromNode:string;toNode:string;fullness:number;nodeKeys:readonly string[];points:readonly WorldPoint[];steps:readonly Readonly<{sourceEdgeKey:string;from:string;to:string;startFraction:number;endFraction:number}>[]}>[]=[];
 for(const path of base.rivers.paths){
  const a=ports.get(path.fromNode)!,b=ports.get(path.toNode)!;
  // Junction identity must remain the existing shared integer port.
  for(const n of [path.fromNode,path.toNode])if(requests.get(n)!.degree>1&&ports.get(n)!.nodeKey!==sourceNodes.get(n))return fail([n]);
  const keys=path.vertices.map(vertex);keys[0]=a.nodeKey;keys[keys.length-1]=b.nodeKey;
  const steps=[];
  for(let i=1;i<keys.length;i++){
   if(keys[i-1]===keys[i])return fail([path.sourceEdgeKey]);
   const sourceEdgeKey=edge(path.vertices[i-1],path.vertices[i]),pieces=byEdge.get(sourceEdgeKey)??[];
   const adjacency=new Map<string,typeof pieces>();for(const p of pieces){adjacency.set(p.from,[...(adjacency.get(p.from)??[]),p]);adjacency.set(p.to,[...(adjacency.get(p.to)??[]),p]);}
   const queue=[keys[i-1]],previous=new Map<string,{node:string;piece:typeof pieces[number]}|null>([[keys[i-1],null]]);
   for(let j=0;j<queue.length;j++)for(const p of adjacency.get(queue[j])??[]){const next=p.from===queue[j]?p.to:p.from;if(!previous.has(next)){previous.set(next,{node:queue[j],piece:p});queue.push(next);}}
   if(!previous.has(keys[i]))return fail([path.sourceEdgeKey]);
   const chain=[];for(let k=keys[i];previous.get(k);){const link=previous.get(k)!;chain.push(Object.freeze({sourceEdgeKey,from:link.node,to:k,startFraction:link.piece.from===link.node?link.piece.startFraction:link.piece.endFraction,endFraction:link.piece.to===k?link.piece.endFraction:link.piece.startFraction}));k=link.node;}
   steps.push(...chain.reverse());
  }
  const nodeKeys=[steps[0].from,...steps.map(s=>s.to)],points=nodeKeys.map(k=>nodes.get(k)!);
  if(new Set(nodeKeys).size!==nodeKeys.length||points.slice(1).some((p,i)=>!p||Math.hypot(p.x-points[i].x,p.y-points[i].y)<1e-10))return fail([path.sourceEdgeKey]);
  paths.push(Object.freeze({riverId:path.riverId,sourceEdgeKey:path.sourceEdgeKey,fromNode:path.fromNode,toNode:path.toNode,fullness:path.fullness,nodeKeys:freeze(nodeKeys),points:freeze(points),steps:freeze(steps)}));
 }
 // The old allocator excludes other source ports and shared interiors. Endpoint
 // replacement may only shorten its first/last edge, so no new joins are added.
 const index=new Map(paths.map(p=>[pid(p.riverId,p.sourceEdgeKey),p]));
 const rapids=freeze(base.source.rapids.map(r=>Object.freeze({...r,kind:'rapid' as const,sourceRef:`rapid:${r.riverId}:${r.sourceEdgeKey}`,...refinementPolylineArc(index.get(pid(r.riverId,r.sourceEdgeKey))!.points,.5)})));
 const waterfalls=freeze(base.source.waterfalls.map(sourceNodeKey=>Object.freeze({kind:'waterfall' as const,sourceRef:`vertex:${sourceNodeKey}`,sourceNodeKey,point:ports.get(sourceNodeKey)!.point,incidences:freeze(paths.filter(p=>p.fromNode===sourceNodeKey||p.toNode===sourceNodeKey).map(p=>Object.freeze({riverId:p.riverId,sourceEdgeKey:p.sourceEdgeKey,flow:p.fromNode===sourceNodeKey?'leaving' as const:'entering' as const,...refinementPolylineArc(p.points,p.fromNode===sourceNodeKey?0:1)})))})));
 return Object.freeze({status:'prepared' as const,source:base.source,ports:prepared.ports,paths:freeze(paths),rapids,waterfalls,boundaries:freeze(base.source.boundaries.map(b=>Object.freeze({...b,point:ports.get(b.sourceNodeKey)!.point}))),allocation:'existing_endpoint_edges_only' as const,completeGeometryPlan:false as const});
}
