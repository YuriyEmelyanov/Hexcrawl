/** Complete display preparation may extend an accepted scope, but cannot
 * replace its choices. Stitch a new continuation only along the same edge;
 * the final GeometryPlan validator rejects overlaps, new joins and no-fit. */
import {refinementMouthContact, type prepareRefinementMouths} from './geometryRefinementMouths.ts';
import {prepareRefinementWater} from './geometryRefinementWater.ts';
import {refinementPolylineArc} from './geometryRefinementSource.ts';
import {prepareRefinementPorts} from './geometryRefinementPorts.ts';
import {refinementEdgeGraph,refinementPreferredSide} from './geometryRefinementGrid.ts';
import {createDetailGrid,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {detailSegmentSpan} from './detailPlacement.ts';
type Plan=Extract<ReturnType<typeof prepareRefinementMouths>,{status:'prepared'}>;
const key=(id:number,edge:string)=>JSON.stringify([id,edge]);
export function retainRefinementRivers(previous:Plan,candidate:Plan,widths:ReadonlyMap<number,number>,routing:{cells:readonly DetailCell[];origin:WorldPoint;seed:number},consumeWork?:(n:number)=>void){
 const fail=(ref:string)=>({status:'error' as const,refs:[ref]});
 const oldPaths=new Map(previous.paths.map(p=>[key(p.riverId,p.sourceEdgeKey),p]));
 const oldPorts=new Map(previous.ports.map(p=>[p.sourceKey,p]));
 const ports=candidate.ports.map(p=>{const old=oldPorts.get(p.sourceKey);return old?{...p,nodeKey:old.nodeKey,point:old.point,location:old.location}:p;});
 const graph=prepareRefinementPorts({cells:routing.cells,origin:routing.origin,consumeWork,requests:ports.map(p=>({sourceKey:p.sourceKey,point:p.point,degree:1,...(p.location.kind==='edge'?{allowedEdgeKeys:[p.location.edgeKey]}:{})}))});
 if(graph.status==='error')return graph;
 const aliases=new Map<string,string>(),fixed=new Map<string,typeof ports[number]>();
 for(const p of graph.ports){const wanted=ports.find(o=>o.sourceKey===p.sourceKey)!;if(Math.hypot(p.point.x-wanted.point.x,p.point.y-wanted.point.y)>1e-8)return fail('retained_graph_port');aliases.set(p.nodeKey,wanted.nodeKey);fixed.set(wanted.nodeKey,wanted);}
 const alias=(k:string)=>aliases.get(k)??k;
 const graphEdges=graph.edges.map(e=>{const from=alias(e.from),to=alias(e.to),a=fixed.get(from),b=fixed.get(to);return {...e,from,to,startFraction:a?.location.kind==='edge'?a.location.fraction:e.startFraction,endFraction:b?.location.kind==='edge'?b.location.fraction:e.endFraction};});
 const nodes=new Map(graph.nodes.map(n=>{const k=alias(n.key);return [k,fixed.get(k)?.point??n.point] as const;})),grid=createDetailGrid(1,routing.origin);
 const byPort=new Map(ports.map(p=>[p.sourceKey,p]));
 const paths:Plan['paths'][number][]=[];
 for(const path of candidate.paths){
  consumeWork?.(1+path.steps.length);
  const old=oldPaths.get(key(path.riverId,path.sourceEdgeKey));if(old){paths.push(old);continue;}
  const start=byPort.get(path.fromNode)!.nodeKey,end=byPort.get(path.toNode)!.nodeKey;
  const others=candidate.paths.filter(p=>key(p.riverId,p.sourceEdgeKey)!==key(path.riverId,path.sourceEdgeKey)).map(p=>paths.find(done=>key(done.riverId,done.sourceEdgeKey)===key(p.riverId,p.sourceEdgeKey))??oldPaths.get(key(p.riverId,p.sourceEdgeKey))??p);
  const blocked=new Set([...others.flatMap(p=>p.nodeKeys),...ports.map(p=>p.nodeKey)]);blocked.delete(start);blocked.delete(end);
  const occupied=others.flatMap(p=>p.steps),source=candidate.source.segments.find(s=>s.riverId===path.riverId&&s.edgeKey===path.sourceEdgeKey)!;
  const occupiedByEdge=new Map<string,typeof occupied>();for(const step of occupied){consumeWork?.(1);occupiedByEdge.set(step.sourceEdgeKey,[...(occupiedByEdge.get(step.sourceEdgeKey)??[]),step]);}
  const available=new Map(routing.cells.map(c=>[`${c.q},${c.r}`,c])),corridor=new Map<string,DetailCell>();
  for(const c of routing.cells){consumeWork?.(1);if(detailSegmentSpan(grid,c,{from:source.from.point,to:source.to.point},true)){corridor.set(`${c.q},${c.r}`,c);for(const [q,r]of [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]){const k=`${c.q+q},${c.r+r}`;if(available.has(k))corridor.set(k,available.get(k)!);}}}
  const allowed=new Set(refinementEdgeGraph([...corridor.values()]).edges.map(e=>e.key));
  const edges=graphEdges.filter(e=>{const occupied=occupiedByEdge.get(e.sourceEdgeKey)??[];consumeWork?.(1+occupied.length);return allowed.has(e.sourceEdgeKey)&&!blocked.has(e.from)&&!blocked.has(e.to)&&!occupied.some(o=>Math.min(Math.max(o.startFraction,o.endFraction),e.endFraction)-Math.max(Math.min(o.startFraction,o.endFraction),e.startFraction)>1e-12);});
  const adjacency=new Map<string,typeof edges>();for(const e of edges){adjacency.set(e.from,[...(adjacency.get(e.from)??[]),e]);adjacency.set(e.to,[...(adjacency.get(e.to)??[]),e]);}
  type Cost={length:number;deviation:number;side:number;keys:string[];steps:typeof path.steps};
  const compare=(a:Cost,b:Cost)=>Math.abs(a.length-b.length)>1e-10?a.length-b.length:Math.abs(a.deviation-b.deviation)>1e-10?a.deviation-b.deviation:a.side-b.side||(JSON.stringify(a.keys)<JSON.stringify(b.keys)?-1:JSON.stringify(a.keys)>JSON.stringify(b.keys)?1:0);
  const costs=new Map<string,Cost>([[start,{length:0,deviation:0,side:0,keys:[start],steps:[]}]]),pending=new Set([start]),done=new Set<string>();
  while(pending.size){consumeWork?.(pending.size);const k=[...pending].sort((a,b)=>compare(costs.get(a)!,costs.get(b)!))[0];pending.delete(k);if(k===end)break;done.add(k);const prior=costs.get(k)!;
   for(const e of adjacency.get(k)??[]){consumeWork?.(1);const n=e.from===k?e.to:e.from;if(done.has(n))continue;const a=nodes.get(k)!,b=nodes.get(n)!,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},dx=source.to.point.x-source.from.point.x,dy=source.to.point.y-source.from.point.y,t=Math.max(0,Math.min(1,((mid.x-source.from.point.x)*dx+(mid.y-source.from.point.y)*dy)/(dx*dx+dy*dy))),foot={x:source.from.point.x+t*dx,y:source.from.point.y+t*dy},cross=dx*(mid.y-source.from.point.y)-dy*(mid.x-source.from.point.x),preferred=refinementPreferredSide(routing.seed,path.riverId,path.sourceEdgeKey,worldToDetailCell(grid,foot));
    const next:Cost={length:prior.length+Math.hypot(b.x-a.x,b.y-a.y),deviation:prior.deviation+(mid.x-foot.x)**2+(mid.y-foot.y)**2,side:prior.side+(Math.abs(cross)<1e-12?0:Number((cross>0?'left':'right')!==preferred)),keys:[...prior.keys,n],steps:[...prior.steps,{sourceEdgeKey:e.sourceEdgeKey,from:k,to:n,startFraction:e.from===k?e.startFraction:e.endFraction,endFraction:e.to===n?e.endFraction:e.startFraction}]};
    if(!costs.has(n)||compare(next,costs.get(n)!)<0){costs.set(n,next);pending.add(n);}
   }
  }
  const routed=costs.get(end);if(!routed)return fail(`retained_route:${path.riverId}:${path.sourceEdgeKey}`);
  paths.push({...path,nodeKeys:routed.keys,points:routed.keys.map(k=>nodes.get(k)!),steps:routed.steps});
 }
 const index=new Map(paths.map(p=>[key(p.riverId,p.sourceEdgeKey),p]));
 if([...oldPaths.keys()].some(k=>!index.has(k)))return fail('retained_path_missing');
 const water=prepareRefinementWater({paths,widthByFullness:widths,consumeWork});if(water.status==='error')return water;
 const painted=new Set(candidate.paintWater.capsules.map(c=>key(c.riverId,c.sourceEdgeKey)));
 const paintWater={...water,capsules:water.capsules.filter(c=>painted.has(key(c.riverId,c.sourceEdgeKey)))};
 const mouths=[];
 for(const m of candidate.mouths){
  const path=index.get(key(m.riverId,m.sourceEdgeKey))!,body=candidate.lakes.find(l=>l.lakeId===m.lakeId)!;
  const old=previous.mouths.find(o=>o.riverId===m.riverId&&o.sourceEdgeKey===m.sourceEdgeKey&&o.sourceNodeKey===m.sourceNodeKey&&o.lakeId===m.lakeId&&o.mode===m.mode);
  if(old&&oldPaths.has(key(m.riverId,m.sourceEdgeKey))&&previous.lakes.find(l=>l.lakeId===m.lakeId)?.modes[m.mode].signature===body.modes[m.mode].signature){mouths.push({...old,status:'prepared' as const});continue;}
  const points=m.direction==='outlet'?path.points:[...path.points].reverse();
  const contact=refinementMouthContact(body.modes[m.mode],points,consumeWork);if(contact.status==='error')return contact;
  mouths.push({...m,...contact,stepIndex:m.direction==='outlet'?contact.stepIndex:path.points.length-contact.stepIndex-2,stepFraction:m.direction==='outlet'?contact.stepFraction:1-contact.stepFraction});
 }
 // Do not copy the helper's status field into persisted mouth records.
 const cleanMouths=mouths.map(({status:ignored,...m})=>m);
 const rapids=candidate.rapids.map(r=>({...r,...refinementPolylineArc(index.get(key(r.riverId,r.sourceEdgeKey))!.points,.5)}));
 const waterfalls=candidate.waterfalls.map(w=>({...w,point:byPort.get(w.sourceNodeKey)!.point,incidences:w.incidences.map(i=>({...i,...refinementPolylineArc(index.get(key(i.riverId,i.sourceEdgeKey))!.points,i.flow==='leaving'?0:1)}))}));
 return {...candidate,ports,paths,water,paintWater,mouths:cleanMouths,rapids,waterfalls,boundaries:candidate.boundaries.map(b=>({...b,point:byPort.get(b.sourceNodeKey)!.point}))};
}
