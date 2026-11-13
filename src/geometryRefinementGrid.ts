/** GEO2 edge-graph primitives. Deliberately not mounted by App or import.
 * No accepted map, global RNG, camera or persistence writes occur here. */
import type {DetailCell, WorldPoint} from './detailGrid.ts';

export type GridVertex = Readonly<{x:number;y:number}>;
export type GridEdge = Readonly<{key:string;from:GridVertex;to:GridVertex}>;
export type RefinementGraph = Readonly<{vertices:readonly GridVertex[];edges:readonly GridEdge[]}>;
const corners = [[1,-1],[1,1],[0,2],[-1,1],[-1,-1],[0,-2]] as const;
const compare=(a:GridVertex,b:GridVertex)=>a.x-b.x||a.y-b.y;
export const refinementVertexKey=(v:GridVertex):string=>`${v.x},${v.y}`;
function valid(v:GridVertex) {
  if(!Number.isSafeInteger(v.x)||!Number.isSafeInteger(v.y))throw Error('Unsafe refinement vertex');
}
function frozen(v:GridVertex):GridVertex {valid(v);return Object.freeze({...v});}
export function refinementCellVertices(c:DetailCell):readonly GridVertex[] {
  if(!Number.isSafeInteger(c.q)||!Number.isSafeInteger(c.r))throw Error('Unsafe refinement cell');
  return Object.freeze(corners.map(([x,y])=>frozen({x:2*c.q+c.r+x,y:3*c.r+y})));
}
export function refinementWorldPoint(v:GridVertex,origin:WorldPoint={x:0,y:0}):WorldPoint {
  valid(v);
  if(!Number.isFinite(origin.x)||!Number.isFinite(origin.y))throw Error('Invalid refinement origin');
  const p={x:origin.x+.5*v.x,y:origin.y+1/(2*Math.sqrt(3))*v.y};
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Invalid refinement point');
  return Object.freeze(p);
}
function edge(a:GridVertex,b:GridVertex):GridEdge {
  const [from,to]=compare(a,b)<0?[a,b]:[b,a];
  return Object.freeze({from,to,key:`${refinementVertexKey(from)}|${refinementVertexKey(to)}`});
}
/** Caller supplies the finite corridor; no map cells are generated or inferred.
 * Cap protects untrusted preparation input, not a product-scale benchmark. */
export function refinementEdgeGraph(cells:readonly DetailCell[]):RefinementGraph {
  if(cells.length>4096)throw Error('Refinement corridor exceeds 4096 cells');
  const vertices=new Map<string,GridVertex>(),edges=new Map<string,GridEdge>();
  for(const c of cells){
    const vs=refinementCellVertices(c);
    for(const v of vs)vertices.set(refinementVertexKey(v),v);
    for(let i=0;i<6;i++){const e=edge(vs[i],vs[(i+1)%6]);edges.set(e.key,e);}
  }
  return Object.freeze({vertices:Object.freeze([...vertices.values()].sort(compare)),
    edges:Object.freeze([...edges.values()].sort((a,b)=>compare(a.from,b.from)||compare(a.to,b.to)))});
}
export function refinementPreferredSide(seed:number,riverId:string|number,sourceEdgeKey:string,cell:DetailCell):'left'|'right' {
  if(!Number.isSafeInteger(seed)||seed<0||!String(riverId)||!sourceEdgeKey)throw Error('Invalid refinement seed/reference');
  refinementCellVertices(cell);
  const bytes=new TextEncoder().encode(JSON.stringify(['geo2-v1',seed,riverId,sourceEdgeKey,cell.q,cell.r]));
  let hash=2166136261;
  for(const b of bytes)hash=Math.imul(hash^b,16777619)>>>0;
  return hash%2===0?'left':'right';
}
export type PerimeterDetour=Readonly<{side:'left'|'right';fallback:boolean;vertices:readonly GridVertex[];edgeKeys:readonly string[]}>;
/** Two perimeter chains for vertex ports, in upstream→downstream order.
 * Interior edge ports, shared junction allocation and topology are next layers. */
export function refinementPerimeterDetour(cell:DetailCell,entry:number,exit:number,preferred:'left'|'right',blocked:ReadonlySet<string>=new Set()):PerimeterDetour|null {
  if(!Number.isInteger(entry)||!Number.isInteger(exit)||entry<0||exit<0||entry>5||exit>5||entry===exit)throw Error('Invalid refinement ports');
  if(preferred!=='left'&&preferred!=='right')throw Error('Invalid refinement side');
  const vs=refinementCellVertices(cell),a=refinementWorldPoint(vs[entry]),b=refinementWorldPoint(vs[exit]);
  const options=[1,-1].map(step=>{
    const path:GridVertex[]=[vs[entry]];
    for(let i=(entry+step+6)%6;i!==exit;i=(i+step+6)%6)path.push(vs[i]);
    path.push(vs[exit]);
    const keys=path.slice(1).map((v,i)=>edge(path[i],v).key);
    const signed=path.slice(1,-1).reduce((sum,v)=>{const p=refinementWorldPoint(v);return sum+(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);},0);
    return {side:signed>=0?'left' as const:'right' as const,vertices:path,edgeKeys:keys};
  }).filter(p=>!p.edgeKeys.some(k=>blocked.has(k)));
  options.sort((a,b)=>a.edgeKeys.length-b.edgeKeys.length||Number(b.side===preferred)-Number(a.side===preferred));
  const result=options[0];
  return result?Object.freeze({...result,fallback:result.side!==preferred,vertices:Object.freeze(result.vertices),edgeKeys:Object.freeze(result.edgeKeys)}):null;
}

/** Minimum edge-count route on the supplied legal graph. Stable numeric ordering
 * is the tie-break here; source-distance/side/topology constraints are supplied
 * by the future GeometryPlan allocator, not falsely inferred in this primitive. */
export function refinementShortestEdgePath(graph:RefinementGraph,start:GridVertex,end:GridVertex,blocked:ReadonlySet<string>=new Set()):readonly GridVertex[]|null {
  valid(start);valid(end);
  if(graph.vertices.length>24576||graph.edges.length>24576)throw Error('Refinement graph exceeds corridor budget');
  const index=new Map(graph.vertices.map(v=>{valid(v);return [refinementVertexKey(v),v] as const;}));
  const sk=refinementVertexKey(start),ek=refinementVertexKey(end);
  if(!index.has(sk)||!index.has(ek))return null;
  const neighbours=new Map<string,GridVertex[]>();
  for(const e of graph.edges){
    valid(e.from);valid(e.to);
    const a=refinementVertexKey(e.from),b=refinementVertexKey(e.to);
    const dx=Math.abs(e.from.x-e.to.x),dy=Math.abs(e.from.y-e.to.y);
    if(!index.has(a)||!index.has(b)||a===b||edge(e.from,e.to).key!==e.key||!(dx===0&&dy===2||dx===1&&dy===1))throw Error('Invalid refinement graph');
    if(blocked.has(e.key))continue;
    neighbours.set(a,[...(neighbours.get(a)??[]),index.get(b)!]);
    neighbours.set(b,[...(neighbours.get(b)??[]),index.get(a)!]);
  }
  for(const row of neighbours.values())row.sort(compare);
  const queue=[sk],previous=new Map<string,string|null>([[sk,null]]);
  for(let i=0;i<queue.length;i++){
    const current=queue[i];if(current===ek)break;
    for(const v of neighbours.get(current)??[]){const k=refinementVertexKey(v);if(!previous.has(k)){previous.set(k,current);queue.push(k);}}
  }
  if(!previous.has(ek))return null;
  const path:GridVertex[]=[];
  for(let k:string|null=ek;k!==null;k=previous.get(k)!)path.push(index.get(k)!);
  return Object.freeze(path.reverse());
}
