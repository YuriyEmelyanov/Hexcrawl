/** Bounded GEO2 integration: split allocated endpoint edges, keep the already
 * validated interior skeleton. This is not global port/path re-optimization. */
import {createDetailGrid,worldToDetailCell,type WorldPoint} from './detailGrid.ts';
import {detailSegmentSpan} from './detailPlacement.ts';
import {prepareRefinementRiverNetwork,refinementPolylineArc} from './geometryRefinementSource.ts';
import {prepareRefinementPorts} from './geometryRefinementPorts.ts';
import {refinementEdgeGraph,refinementPreferredSide,type GridVertex} from './geometryRefinementGrid.ts';
const freeze=<T>(a:T[])=>Object.freeze(a);
const edge=(a:GridVertex,b:GridVertex)=>{const [x,y]=a.x-b.x||a.y-b.y?[a,b].sort((a,b)=>a.x-b.x||a.y-b.y):[a,b];return `${x.x},${x.y}|${y.x},${y.y}`;};
const vertex=(v:GridVertex)=>JSON.stringify(['vertex',v.x,v.y]);
const pid=(r:number,e:string)=>JSON.stringify([r,e]);
export function prepareRefinementTerminalRoutes(input:Parameters<typeof prepareRefinementRiverNetwork>[0]&Readonly<{openExits?:readonly Readonly<{sourceKey:string;sourceExitRef:string;edgeKeys:readonly string[]}>[]}>){
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
 const exits=new Map((input.openExits??[]).map(e=>[e.sourceKey,e]));if(exits.size!==(input.openExits??[]).length)return fail(['duplicate_exit']);
 for(const [key,e]of exits)if(!requests.has(key)||requests.get(key)!.degree!==1)return fail([key]);
 const oldNodes=new Set(base.rivers.paths.flatMap(p=>p.vertices.map(vertex))),usedNodes=new Set<string>();
 const prepared=prepareRefinementPorts({origin:input.origin,cells:input.cells,requests:[...requests.values()].map(r=>({...r,...(exits.has(r.sourceKey)?{allowedEdgeKeys:[...exits.get(r.sourceKey)!.edgeKeys],exit:{sourceExitRef:exits.get(r.sourceKey)!.sourceExitRef,edgeKeys:exits.get(r.sourceKey)!.edgeKeys}}:{})}))});if(prepared.status==='error')return prepared;
 const ports=new Map(prepared.ports.map(p=>[p.sourceKey,p])),nodes=new Map(prepared.nodes.map(n=>[n.key,n.point]));
 const sourceNodes=new Map(base.rivers.nodes.map(n=>[n.sourceKey,vertex(n.vertex)]));
 const byEdge=new Map<string,typeof prepared.edges[number][]>();for(const e of prepared.edges)byEdge.set(e.sourceEdgeKey,[...(byEdge.get(e.sourceEdgeKey)??[]),e]);
 const paths:Readonly<{riverId:number;sourceEdgeKey:string;fromNode:string;toNode:string;fullness:number;nodeKeys:readonly string[];points:readonly WorldPoint[];steps:readonly Readonly<{sourceEdgeKey:string;from:string;to:string;startFraction:number;endFraction:number}>[]}>[]=[];
 for(const path of base.rivers.paths){
  const a=ports.get(path.fromNode)!,b=ports.get(path.toNode)!;
  // Junction identity must remain the existing shared integer port.
  for(const n of [path.fromNode,path.toNode])if(requests.get(n)!.degree>1&&ports.get(n)!.nodeKey!==sourceNodes.get(n))return fail([n]);
  const keys=path.vertices.map(vertex);keys[0]=a.nodeKey;keys[keys.length-1]=b.nodeKey;
  const source=base.source.segments.find(s=>s.riverId===path.riverId&&s.edgeKey===path.sourceEdgeKey)!;
  const fineGrid=createDetailGrid(1,input.origin);
  const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]],available=new Map(input.cells.map(c=>[`${c.q},${c.r}`,c])),corridor=new Map<string,typeof input.cells[number]>();
  if(exits.has(path.fromNode)||exits.has(path.toNode))for(const c of input.cells)if(detailSegmentSpan(fineGrid,c,{from:source.from.point,to:source.to.point},true)){corridor.set(`${c.q},${c.r}`,c);for(const [dq,dr]of directions){const key=`${c.q+dq},${c.r+dr}`;if(available.has(key))corridor.set(key,available.get(key)!);}}
  const allowed=new Set(refinementEdgeGraph([...corridor.values()]).edges.map(e=>e.key));
  const steps=[];
  for(let i=1;i<keys.length;i++){
   if(keys[i-1]===keys[i])return fail([path.sourceEdgeKey]);
   const sourceEdgeKey=edge(path.vertices[i-1],path.vertices[i]),reroute=i===1&&exits.has(path.fromNode)||i===keys.length-1&&exits.has(path.toNode);
   const pieces=reroute?prepared.edges.filter(e=>allowed.has(e.sourceEdgeKey)):byEdge.get(sourceEdgeKey)??[];
   const blocked=new Set([...oldNodes,...usedNodes,...prepared.ports.map(p=>p.nodeKey)]);
   if(exits.has(path.fromNode))blocked.delete(sourceNodes.get(path.fromNode)!);if(exits.has(path.toNode))blocked.delete(sourceNodes.get(path.toNode)!);
   blocked.delete(keys[i-1]);blocked.delete(keys[i]);
   const adjacency=new Map<string,typeof pieces>();for(const p of pieces){adjacency.set(p.from,[...(adjacency.get(p.from)??[]),p]);adjacency.set(p.to,[...(adjacency.get(p.to)??[]),p]);}
   const queue=[keys[i-1]],previous=new Map<string,{node:string;piece:typeof pieces[number]}|null>([[keys[i-1],null]]);
   for(let j=0;j<queue.length;j++)for(const p of adjacency.get(queue[j])??[]){const next=p.from===queue[j]?p.to:p.from;if((!reroute||!blocked.has(next))&&!previous.has(next)){previous.set(next,{node:queue[j],piece:p});queue.push(next);}}
   if(reroute&&previous.has(keys[i])){
    // BFS fixes minimum step count. Rank equal-length chains by source
    // deviation, seeded side and numeric world-node sequence, as GEO2 specifies.
    const levels=new Map([[keys[i-1],0]]);for(const k of queue){const link=previous.get(k);if(link)levels.set(k,levels.get(link.node)!+1);}
    const costs=new Map<string,{deviation:number;side:number;path:string[]}>([[keys[i-1],{deviation:0,side:0,path:[keys[i-1]]}]]);
    const numeric=(a:string[],b:string[])=>{for(let j=0;j<Math.min(a.length,b.length);j++){const p=nodes.get(a[j])!,q=nodes.get(b[j])!,d=p.x-q.x||p.y-q.y;if(d)return d;}return a.length-b.length;};
    for(const k of queue){const prior=costs.get(k);if(!prior)continue;for(const piece of adjacency.get(k)??[]){
     const next=piece.from===k?piece.to:piece.from;if(levels.get(next)!==levels.get(k)!+1)continue;
     const a=nodes.get(k)!,b=nodes.get(next)!,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},dx=source.to.point.x-source.from.point.x,dy=source.to.point.y-source.from.point.y;
     const t=Math.max(0,Math.min(1,((mid.x-source.from.point.x)*dx+(mid.y-source.from.point.y)*dy)/(dx*dx+dy*dy))),foot={x:source.from.point.x+t*dx,y:source.from.point.y+t*dy},cross=dx*(mid.y-source.from.point.y)-dy*(mid.x-source.from.point.x);
     const preferred=refinementPreferredSide(input.seed,source.riverId,source.edgeKey,worldToDetailCell(fineGrid,foot)),penalty=Math.abs(cross)<1e-12?0:Number((cross>0?'left':'right')!==preferred);
     const candidate={deviation:prior.deviation+(mid.x-foot.x)**2+(mid.y-foot.y)**2,side:prior.side+penalty,path:[...prior.path,next]},old=costs.get(next),difference=old?candidate.deviation-old.deviation:0,tolerance=old?1e-12*Math.max(1,candidate.deviation,old.deviation):0;
     if(!old||difference < -tolerance||Math.abs(difference)<=tolerance&&(candidate.side<old.side||candidate.side===old.side&&numeric(candidate.path,old.path)<0)){costs.set(next,candidate);previous.set(next,{node:k,piece});}
    }}
   }
   if(!previous.has(keys[i]))return fail([path.sourceEdgeKey]);
   const chain=[];for(let k=keys[i];previous.get(k);){const link=previous.get(k)!;chain.push(Object.freeze({sourceEdgeKey:link.piece.sourceEdgeKey,from:link.node,to:k,startFraction:link.piece.from===link.node?link.piece.startFraction:link.piece.endFraction,endFraction:link.piece.to===k?link.piece.endFraction:link.piece.startFraction}));k=link.node;}
   for(const step of chain){usedNodes.add(step.from);usedNodes.add(step.to);}
   steps.push(...chain.reverse());
  }
  const nodeKeys=[steps[0].from,...steps.map(s=>s.to)],points=nodeKeys.map(k=>nodes.get(k)!);
  if(new Set(nodeKeys).size!==nodeKeys.length||points.slice(1).some((p,i)=>!p||Math.hypot(p.x-points[i].x,p.y-points[i].y)<1e-10))return fail([path.sourceEdgeKey]);
  paths.push(Object.freeze({riverId:path.riverId,sourceEdgeKey:path.sourceEdgeKey,fromNode:path.fromNode,toNode:path.toNode,fullness:path.fullness,nodeKeys:freeze(nodeKeys),points:freeze(points),steps:freeze(steps)}));
 }
 // The old allocator excludes other source ports and shared interiors. Endpoint
 // replacement shortens endpoints or uses a bounded corridor avoiding all
 // occupied source/interior/new nodes; no new joins are allowed.
 const index=new Map(paths.map(p=>[pid(p.riverId,p.sourceEdgeKey),p]));
 const rapids=freeze(base.source.rapids.map(r=>Object.freeze({...r,kind:'rapid' as const,sourceRef:`rapid:${r.riverId}:${r.sourceEdgeKey}`,...refinementPolylineArc(index.get(pid(r.riverId,r.sourceEdgeKey))!.points,.5)})));
 const waterfalls=freeze(base.source.waterfalls.map(sourceNodeKey=>Object.freeze({kind:'waterfall' as const,sourceRef:`vertex:${sourceNodeKey}`,sourceNodeKey,point:ports.get(sourceNodeKey)!.point,incidences:freeze(paths.filter(p=>p.fromNode===sourceNodeKey||p.toNode===sourceNodeKey).map(p=>Object.freeze({riverId:p.riverId,sourceEdgeKey:p.sourceEdgeKey,flow:p.fromNode===sourceNodeKey?'leaving' as const:'entering' as const,...refinementPolylineArc(p.points,p.fromNode===sourceNodeKey?0:1)})))})));
 return Object.freeze({status:'prepared' as const,source:base.source,ports:prepared.ports,paths:freeze(paths),rapids,waterfalls,boundaries:freeze(base.source.boundaries.map(b=>Object.freeze({...b,point:ports.get(b.sourceNodeKey)!.point}))),allocation:input.openExits?.length?'endpoint_corridor_boundaries' as const:'existing_endpoint_edges_only' as const,completeGeometryPlan:false as const});
}
