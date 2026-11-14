/** Unmounted all-mode lake-body/mouth preparation. Never paints an old
 * dry-land center connector; river paint is masked by the actual body. */
import type {DetailCell,WorldPoint} from './detailGrid.ts';
import {refinementEdgeGraph,refinementWorldPoint} from './geometryRefinementGrid.ts';
import {prepareRefinementShoreCells,prepareRefinementShorePath,refinementShoreContains,refinementShoreIntervals,type RefinementShore} from './geometryRefinementShore.ts';
import {prepareRefinementWetRoutes,refinementWaterIntervals} from './geometryRefinementWater.ts';
const modes=['tiles','emoji','color'] as const;
export type MouthMode=typeof modes[number];
export type RefinementLakeInput=Readonly<{lakeId:number;cells:readonly DetailCell[];colorPath:string;colorScale:number;origin:WorldPoint}>;
const freeze=<T>(a:T[])=>Object.freeze(a);
const fail=(refs:string[])=>Object.freeze({status:'error' as const,code:'mouth_conflict' as const,refs:freeze(refs),completeGeometryPlan:false as const});
export function prepareRefinementLakeModes(lakes:readonly RefinementLakeInput[]){
 if(lakes.length>4096)return fail(['capacity']);const seen=new Set<number>(),result:Readonly<{lakeId:number;modes:Readonly<Record<MouthMode,RefinementShore>>}>[]=[];
 for(const lake of [...lakes].sort((a,b)=>a.lakeId-b.lakeId)){
  if(!Number.isSafeInteger(lake.lakeId)||lake.lakeId<1||seen.has(lake.lakeId))return fail([`lake:${lake.lakeId}`]);seen.add(lake.lakeId);
  const tiles=prepareRefinementShoreCells(lake.cells,lake.origin),color=prepareRefinementShorePath(lake.colorPath,lake.colorScale,lake.origin);
  if(tiles.status==='error'||color.status==='error')return fail([`lake:${lake.lakeId}`,'invalid_body']);
  result.push(Object.freeze({lakeId:lake.lakeId,modes:Object.freeze({tiles,emoji:tiles,color})}));
 }
 return Object.freeze({status:'prepared' as const,lakes:freeze(result)});
}
/** Walk from an underwater port towards land; callers reverse inlet paths. */
export function refinementMouthContact(shape:RefinementShore,points:readonly WorldPoint[]){
 if(points.length<2||points.length>24576||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||!refinementShoreContains(shape,points[0]))return fail(['port_outside_body']);
 for(let i=1;i<points.length;i++){const cut=refinementShoreIntervals(shape,{from:points[i-1],to:points[i]});if(cut.status==='error')return fail(['invalid_mouth_step']);
  const wet=cut.intervals.find(row=>row.startClipped);if(wet?.endClipped)continue;
  // A bank-following step may end exactly where the next step leaves the body.
  // The latter has no positive-length wet interval: retain its t=0 contact.
  const fraction=wet?.endFraction??0,hits=wet?.endHits??cut.cuts.filter(h=>h.fraction<1e-9);
  if(!wet&&!refinementShoreContains(shape,points[i-1]))return fail(['disconnected_mouth']);
  const hit=hits.find(h=>!h.overlap);if(!hit||shape.depths[hit.loopIndex]%2===1)return fail(['island_or_ambiguous_contact']);
  return Object.freeze({status:'prepared' as const,point:hit.point,stepIndex:i-1,stepFraction:fraction,loopIndex:hit.loopIndex,curveIndex:hit.curveIndex,shoreFraction:hit.shoreFraction});
 }
 return fail(['no_shore_contact']);
}
export function prepareRefinementMouths(input:Parameters<typeof prepareRefinementWetRoutes>[0],context:Parameters<typeof prepareRefinementWetRoutes>[1],widths:ReadonlyMap<number,number>,lakeInputs:readonly RefinementLakeInput[]){
 const bodies=prepareRefinementLakeModes(lakeInputs);if(bodies.status==='error')return bodies;
 const original=prepareRefinementWetRoutes(input,context,widths);if(original.status==='error')return original;
 const lakeById=new Map(bodies.lakes.map(l=>[l.lakeId,l])),degree=new Map<string,number>();for(const s of original.source.segments)for(const n of [s.from,s.to])degree.set(n.key,(degree.get(n.key)??0)+1);
 const incidences:Readonly<{riverId:number;sourceEdgeKey:string;sourceNodeKey:string;lakeId:number;direction:'outlet'|'inlet'}>[]=[];
 const nodeKinds=new Map(context.hydrology.network.nodes.map(n=>[n.id,n.kind]));
 for(const edge of context.hydrology.network.edges)for(const end of ['from','to'] as const)if(nodeKinds.get(edge[end])==='lake'){
  const id=Number(edge[end].replace(/^lake:/,'')),s=original.source.segments.find(s=>s.edgeKey===edge.id);
  if(!s||!lakeById.has(id))return fail([edge.id,edge[end],'missing_lake_ref']);const sourceNodeKey=s[end].key;
  if(degree.get(sourceNodeKey)!==1)return fail([sourceNodeKey,'nonterminal_lake_incidence']);
  incidences.push(Object.freeze({riverId:s.riverId,sourceEdgeKey:s.edgeKey,sourceNodeKey,lakeId:id,direction:end==='from'?'outlet':'inlet'}));
 }
 const graph=refinementEdgeGraph(input.cells),shorePorts=[];
 for(const incidence of incidences){const body=lakeById.get(incidence.lakeId)!;
  const edgeKeys=graph.edges.filter(e=>modes.every(mode=>{const cut=refinementShoreIntervals(body.modes[mode],{from:refinementWorldPoint(e.from,input.origin),to:refinementWorldPoint(e.to,input.origin)});return cut.status==='prepared'&&cut.intervals.length===1&&cut.intervals[0].startClipped&&cut.intervals[0].endClipped;})).map(e=>e.key);
  if(!edgeKeys.length)return fail([`lake:${incidence.lakeId}`,incidence.sourceNodeKey,'no_common_body_port']);
  shorePorts.push(Object.freeze({sourceKey:incidence.sourceNodeKey,edgeKeys:freeze(edgeKeys)}));
 }
 const routes=shorePorts.length?prepareRefinementWetRoutes({...input,shorePorts},context,widths):original;if(routes.status==='error')return fail([...routes.refs,'shore_route']);
 const mouths:Readonly<{riverId:number;sourceEdgeKey:string;sourceNodeKey:string;lakeId:number;direction:'inlet'|'outlet';mode:MouthMode;point:WorldPoint;stepIndex:number;stepFraction:number;loopIndex:number;curveIndex:number;shoreFraction:number}>[]=[];
 for(const incidence of incidences){const path=routes.paths.find(p=>p.riverId===incidence.riverId&&p.sourceEdgeKey===incidence.sourceEdgeKey)!,body=lakeById.get(incidence.lakeId)!;
  const points=incidence.direction==='outlet'?path.points:[...path.points].reverse();
  for(const mode of modes){const contact=refinementMouthContact(body.modes[mode],points);if(contact.status==='error')return fail([incidence.sourceNodeKey,mode,...contact.refs]);
   mouths.push(Object.freeze({...incidence,mode,point:contact.point,stepIndex:incidence.direction==='outlet'?contact.stepIndex:path.points.length-contact.stepIndex-2,stepFraction:incidence.direction==='outlet'?contact.stepFraction:1-contact.stepFraction,loopIndex:contact.loopIndex,curveIndex:contact.curveIndex,shoreFraction:contact.shoreFraction}));
  }
 }
 const internal=context.hydrology.internalLakeEdges?new Set(context.hydrology.internalLakeEdges.keys()):new Set<string>();
 const paintWater=Object.freeze({...routes.water,capsules:freeze(routes.water.capsules.filter(c=>!internal.has(c.sourceEdgeKey)))});
 return Object.freeze({...routes,lakes:bodies.lakes,mouths:freeze(mouths),paintWater,completeGeometryPlan:false as const});
}
/** Visible river-only paint: remove lake body intervals exactly in query space.
 * Lake water remains owned by its renderer, including submerged blend paint. */
export function refinementRiverPaintIntervals(plan:Extract<ReturnType<typeof prepareRefinementMouths>,{status:'prepared'}>,query:Readonly<{from:WorldPoint;to:WorldPoint}>,mode:MouthMode){
 const river=refinementWaterIntervals(plan.paintWater,query);if(river.status==='error')return river;
 const masks:Readonly<{a:number;b:number}>[]=[];
 for(const lake of plan.lakes){const cut=refinementShoreIntervals(lake.modes[mode],query);if(cut.status==='error')return fail([`lake:${lake.lakeId}`,'clip']);for(const row of cut.intervals)masks.push({a:row.startFraction,b:row.endFraction});}
 const intervals=[];
 for(const wet of river.intervals){const stops=[wet.startFraction,wet.endFraction,...masks.flatMap(m=>[m.a,m.b]).filter(t=>t>wet.startFraction&&t<wet.endFraction)].sort((a,b)=>a-b);
  for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i],mid=(a+b)/2;if(b-a<1e-12||masks.some(m=>mid>=m.a&&mid<=m.b))continue;const at=(t:number)=>Object.freeze({x:query.from.x+t*(query.to.x-query.from.x),y:query.from.y+t*(query.to.y-query.from.y)});intervals.push(Object.freeze({startFraction:a,endFraction:b,from:at(a),to:at(b),contributors:wet.contributors}));}
 }
 return Object.freeze({status:'prepared' as const,intervals:freeze(intervals),completeGeometryPlan:false as const});
}
