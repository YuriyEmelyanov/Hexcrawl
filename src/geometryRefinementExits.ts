/** GEO2 actual hydrology-to-fine-exit adapter; no generation or source writes.
 * Caller supplies the existing buildRegionRiverNetwork result (complete=true),
 * real candidates and accepted oneMileSources cells including water overrides. */
import type {RiverNetwork} from './riverModel/core.ts';
import {createDetailGrid,detailCellPolygon,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {detailPointInPolygon} from './detailSizes.ts';
import {refinementEdgeGraph,refinementWorldPoint} from './geometryRefinementGrid.ts';
import {prepareRefinementPorts} from './geometryRefinementPorts.ts';
import {normalizeRefinementRiverSource} from './geometryRefinementSource.ts';
import {prepareRefinementTerminalRoutes} from './geometryRefinementTerminalRoutes.ts';
const freeze=<T>(a:T[])=>Object.freeze(a);
const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
export function prepareRefinementOpenExits(input:Readonly<{source:Extract<ReturnType<typeof normalizeRefinementRiverSource>,{status:'prepared'}>;origin:WorldPoint;cells:readonly DetailCell[];candidates:readonly DetailCell[];hydrology:Readonly<{network:RiverNetwork;issues:readonly string[];internalLakeEdges?:ReadonlyMap<string,string>}>}>){
 const fail=(code:'source_topology_conflict'|'boundary_conflict'|'capacity',refs:string[])=>Object.freeze({status:'error' as const,code,refs:freeze(refs),completeGeometryPlan:false as const});
 if(input.hydrology.issues.length)return fail('source_topology_conflict',[...input.hydrology.issues]);
 if(input.candidates.length>20000||input.source.segments.length*input.candidates.length>2000000)return fail('capacity',[]);
 const graph=prepareRefinementPorts({origin:input.origin,cells:input.cells,requests:[]});if(graph.status==='error')return graph;
 const byEdge=new Map(refinementEdgeGraph(input.cells).edges.map(e=>[e.key,e])),nodes=new Map(input.hydrology.network.nodes.map(n=>[n.id,n])),networkEdges=new Map(input.hydrology.network.edges.map(e=>[e.id,e]));
 if(nodes.size!==input.hydrology.network.nodes.length||networkEdges.size!==input.hydrology.network.edges.length)return fail('source_topology_conflict',['duplicate_hydrology_ref']);
 const degree=new Map<string,number>();for(const s of input.source.segments)for(const n of [s.from,s.to])degree.set(n.key,(degree.get(n.key)??0)+1);
 const grid=createDetailGrid(6,input.origin),polygons=[...new Map(input.candidates.map(c=>[`${c.q},${c.r}`,c])).values()].sort((a,b)=>a.q-b.q||a.r-b.r).map(c=>({cell:c,polygon:detailCellPolygon(grid,c)}));
 const exits:Readonly<{sourceKey:string;sourceExitRef:string;edgeKeys:readonly string[];riverId:number;sourceEdgeKey:string;flow:'entering'|'leaving';fullness:number}>[]=[],terminations:Readonly<{sourceKey:string;kind:string;hydrologyNodeId:string}>[]=[];
 for(const s of input.source.segments)for(const [end,n]of [['from',s.from],['to',s.to]] as const){
  if(degree.get(n.key)!==1)continue;
  const e=networkEdges.get(s.edgeKey),internal=input.hydrology.internalLakeEdges?.get(s.edgeKey);
  const modelId=e?e[end]:internal,kind=modelId?nodes.get(modelId)?.kind:undefined;
  if(!modelId||!kind||!['open','source','sea','lake'].includes(kind)||kind!=='lake'&&modelId!==n.key||e&&e.fullness!==s.fullness)return fail('source_topology_conflict',[n.key,s.edgeKey]);
  if(e&&((degree.get(s.from.key)===1&&end==='from'&&kind==='open'&&e.from!==n.key)||(degree.get(s.to.key)===1&&end==='to'&&kind==='open'&&e.to!==n.key)))return fail('source_topology_conflict',[n.key,'artificial_open_ref']);
  if(kind!=='open'){terminations.push(Object.freeze({sourceKey:n.key,kind,hydrologyNodeId:modelId}));continue;}
  const touches=polygons.filter(p=>detailPointInPolygon(n.point,p.polygon));if(!touches.length)return fail('boundary_conflict',[n.key,'missing_candidate_contact']);
  const edgeKeys=graph.boundaryEdgeKeys.filter(k=>{const edge=byEdge.get(k)!,a=refinementWorldPoint(edge.from,input.origin),b=refinementWorldPoint(edge.to,input.origin),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};return Math.hypot(mid.x-n.point.x,mid.y-n.point.y)<=1+1e-8&&touches.some(p=>detailPointInPolygon(mid,p.polygon));});
  if(!edgeKeys.length)return fail('boundary_conflict',[n.key,'no_fine_frontier_contact']);
  exits.push(Object.freeze({sourceKey:n.key,sourceExitRef:JSON.stringify(['source-exit',s.riverId,n.key]),edgeKeys:freeze(edgeKeys),riverId:s.riverId,sourceEdgeKey:s.edgeKey,flow:end==='from'?'entering':'leaving',fullness:s.fullness}));
 }
 exits.sort((a,b)=>lexical(a.sourceKey,b.sourceKey));terminations.sort((a,b)=>lexical(a.sourceKey,b.sourceKey));
 return Object.freeze({status:'prepared' as const,exits:freeze(exits),terminations:freeze(terminations),completeGeometryPlan:false as const});
}
export function prepareRefinementBoundaryRoutes(input:Parameters<typeof prepareRefinementTerminalRoutes>[0],context:Readonly<{candidates:readonly DetailCell[];hydrology:Parameters<typeof prepareRefinementOpenExits>[0]['hydrology']}>){
 const source=normalizeRefinementRiverSource(input);if(source.status==='error')return source;
 const exits=prepareRefinementOpenExits({source,origin:input.origin,cells:input.cells,...context});if(exits.status==='error')return exits;
 const routes=prepareRefinementTerminalRoutes({...input,openExits:exits.exits});if(routes.status==='error')return routes;
 return Object.freeze({...routes,exitConstraints:exits.exits,terminations:exits.terminations});
}
