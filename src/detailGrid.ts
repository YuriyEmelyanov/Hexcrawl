/** DETAIL1 world geometry, in miles. Same pointy axial orientation as App.toPixel.
 * These primitives do not activate DETAIL1, migrate saves or change generation.
 */
export type DetailStep = 1 | 6 | 12 | 24;
export type DetailCell = Readonly<{q:number;r:number}>;
export type WorldPoint = Readonly<{x:number;y:number}>;
export type DetailGrid = Readonly<{step:DetailStep;origin:WorldPoint;orientation:'pointy';convention:'across_flats'}>;
export const METERS_PER_MILE = 1609.344;
const directions = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]] as const;
const corners = [[1,-1],[1,1],[0,2],[-1,1],[-1,-1],[0,-2]] as const;
const key = (c:DetailCell) => `${c.q},${c.r}`;
function point(p:WorldPoint) { if(!Number.isFinite(p.x)||!Number.isFinite(p.y)) throw Error('Invalid world point'); }
function cell(c:DetailCell) {
  if(!Number.isSafeInteger(c.q)||!Number.isSafeInteger(c.r)
    ||![2*c.q+c.r-1,2*c.q+c.r+1,3*c.r-2,3*c.r+2].every(Number.isSafeInteger)) throw Error('Unsafe detail cell');
}
function grid(g:DetailGrid) {
  if(![1,6,12,24].includes(g.step)||g.orientation!=='pointy'||g.convention!=='across_flats') throw Error('Unknown detail grid');
  point(g.origin);
}
export function createDetailGrid(step:DetailStep,origin:WorldPoint={x:0,y:0}):DetailGrid {
  const result = {step,origin:Object.freeze({...origin}),orientation:'pointy',convention:'across_flats'} as const;
  grid(result); return Object.freeze(result);
}
export function detailCellCenter(g:DetailGrid,c:DetailCell):WorldPoint {
  grid(g);cell(c);
  const result = {x:g.origin.x+g.step*(c.q+c.r/2),y:g.origin.y+g.step*Math.sqrt(3)/2*c.r};
  point(result);return result;
}
/** Cube-nearest cell, with lexicographic (q,r) tie breaking at floating-point
 * indistinguishable boundaries. Camera transforms never enter this operation. */
export function worldToDetailCell(g:DetailGrid,p:WorldPoint):DetailCell {
  grid(g);point(p);
  const y=(p.y-g.origin.y)/g.step,x=(p.x-g.origin.x)/g.step;
  const r=y*2/Math.sqrt(3),q=x-r/2;
  cell({q:Math.floor(q),r:Math.floor(r)});
  let best:DetailCell|undefined, distance=Infinity;
  for(let cq=Math.floor(q)-1;cq<=Math.floor(q)+1;cq++) for(let cr=Math.floor(r)-1;cr<=Math.floor(r)+1;cr++) {
    const d=(cq+cr/2-x)**2+(Math.sqrt(3)/2*cr-y)**2;
    const tolerance=Number.EPSILON*32*Math.max(1,d,Number.isFinite(distance)?distance:0);
    if(!best||d<distance-tolerance) {best={q:cq,r:cr};distance=d;}
  }
  cell(best!);return best!;
}
/** Integer vertex coordinates are shared exactly by adjacent cells, avoiding
 * rounded SVG/pixel coordinates as topological identity. */
function vertex(c:DetailCell,index:number) {
  return {x:2*c.q+c.r+corners[index][0],y:3*c.r+corners[index][1]};
}
function worldVertex(g:DetailGrid,v:WorldPoint):WorldPoint {
  const result={x:g.origin.x+g.step/2*v.x,y:g.origin.y+g.step/(2*Math.sqrt(3))*v.y};point(result);return result;
}
export function detailCellPolygon(g:DetailGrid,c:DetailCell):WorldPoint[] {
  grid(g);cell(c);return corners.map((_,i)=>worldVertex(g,vertex(c,i)));
}
export function detailCellAreaSquareMiles(g:DetailGrid):number {grid(g);return Math.sqrt(3)/2*g.step*g.step;}
export function detailPolygonArea(points:readonly WorldPoint[]):number {
  if(points.length<3) return 0;
  points.forEach(point);
  return Math.abs(points.reduce((sum,p,index)=>{
    const next=points[(index+1)%points.length];
    return sum+p.x*next.y-p.y*next.x;
  },0))/2;
}
const cross=(a:WorldPoint,b:WorldPoint,c:WorldPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function compactPolygon(points:WorldPoint[],tolerance:number):WorldPoint[] {
  const result:WorldPoint[]=[];
  for(const p of points) {
    const last=result[result.length-1];
    if(!last||Math.hypot(last.x-p.x,last.y-p.y)>tolerance) result.push(p);
  }
  const last=result[result.length-1];
  if(result.length>1&&Math.hypot(result[0].x-last.x,result[0].y-last.y)<=tolerance) result.pop();
  return result;
}
/** Clips a simple source polygon by one convex grid cell. The implementation is
 * local because the current rendering/lake geometry has no reusable polygon
 * intersection engine. Empty/edge/vertex-only contact has zero returned area. */
function clipByConvexCell(subject:readonly WorldPoint[],clip:readonly WorldPoint[],scale:number):WorldPoint[] {
  let output=subject.map(p=>({...p}));
  const orientation=clip.reduce((sum,p,index)=>{
    const next=clip[(index+1)%clip.length];return sum+p.x*next.y-p.y*next.x;
  },0)>=0?1:-1;
  const tolerance=Number.EPSILON*128*Math.max(1,scale);
  for(let index=0;index<clip.length&&output.length;index++) {
    const a=clip[index],b=clip[(index+1)%clip.length],input=output;output=[];
    const inside=(p:WorldPoint)=>orientation*cross(a,b,p)>=-tolerance;
    for(let i=0;i<input.length;i++) {
      const current=input[i],previous=input[(i+input.length-1)%input.length];
      const currentInside=inside(current),previousInside=inside(previous);
      if(currentInside!==previousInside) {
        const ray={x:current.x-previous.x,y:current.y-previous.y};
        const edge={x:b.x-a.x,y:b.y-a.y};
        const denominator=ray.x*edge.y-ray.y*edge.x;
        if(Math.abs(denominator)>tolerance) {
          const offset={x:a.x-previous.x,y:a.y-previous.y};
          const t=(offset.x*edge.y-offset.y*edge.x)/denominator;
          output.push({x:previous.x+t*ray.x,y:previous.y+t*ray.y});
        }
      }
      if(currentInside) output.push({...current});
    }
    output=compactPolygon(output,tolerance);
  }
  return output;
}
export type DetailCellIntersection=Readonly<{cell:DetailCell;polygon:readonly WorldPoint[];areaSquareMiles:number}>;
/** Enumerates actual positive-area intersections. It deliberately makes no
 * fixed-child-count promise: aligned 6/12/24 mile cells cross the 1 mile grid. */
export function detailPositiveAreaIntersections(g:DetailGrid,sourcePolygon:readonly WorldPoint[]):readonly DetailCellIntersection[] {
  grid(g);
  if(sourcePolygon.length<3) throw Error('Source polygon needs at least three points');
  sourcePolygon.forEach(point);
  const sourceArea=detailPolygonArea(sourcePolygon);
  if(!(sourceArea>Number.EPSILON)) throw Error('Source polygon has no positive area');
  const fractional=sourcePolygon.map(p=>{
    const y=(p.y-g.origin.y)/g.step,x=(p.x-g.origin.x)/g.step;
    const r=y*2/Math.sqrt(3);return {q:x-r/2,r};
  });
  const qMin=Math.floor(Math.min(...fractional.map(c=>c.q)))-2,qMax=Math.ceil(Math.max(...fractional.map(c=>c.q)))+2;
  const rMin=Math.floor(Math.min(...fractional.map(c=>c.r)))-2,rMax=Math.ceil(Math.max(...fractional.map(c=>c.r)))+2;
  if(![qMin,qMax,rMin,rMax].every(Number.isSafeInteger)||(qMax-qMin+1)*(rMax-rMin+1)>1_000_000) throw Error('Source polygon projection is too large');
  const minimumArea=Math.max(1,detailCellAreaSquareMiles(g),sourceArea)*1e-12;
  const result:DetailCellIntersection[]=[];
  for(let q=qMin;q<=qMax;q++) for(let r=rMin;r<=rMax;r++) {
    const candidate={q,r};cell(candidate);
    const polygon=clipByConvexCell(sourcePolygon,detailCellPolygon(g,candidate),g.step);
    const area=detailPolygonArea(polygon);
    if(area>minimumArea) result.push(Object.freeze({cell:Object.freeze(candidate),polygon:Object.freeze(polygon.map(p=>Object.freeze(p))),areaSquareMiles:area}));
  }
  return Object.freeze(result.sort((a,b)=>a.cell.q-b.cell.q||a.cell.r-b.cell.r));
}
/** Nonempty, unique, edge-connected cells. Does not infer size from POI icons. */
export function validateDetailFootprint(cells:readonly DetailCell[]):void {
  if(!cells.length) throw Error('Empty detail footprint');
  cells.forEach(cell);
  const pending=new Set(cells.map(key));
  if(pending.size!==cells.length) throw Error('Duplicate footprint cell');
  const queue=[cells[0]];pending.delete(key(cells[0]));
  for(let i=0;i<queue.length;i++) for(const [q,r] of directions) {
    const next={q:queue[i].q+q,r:queue[i].r+r};if(pending.delete(key(next))) queue.push(next);
  }
  if(pending.size) throw Error('Disconnected detail footprint');
}
export type DetailBoundaryEdge = Readonly<{from:WorldPoint;to:WorldPoint;fromKey:string;toKey:string}>;
/** Exposed union edges only; shared cell edges disappear. Hole rims, if any,
 * remain boundaries. Ring stitching/rendering belongs to the subsequent stage. */
export function detailFootprintBoundary(g:DetailGrid,cells:readonly DetailCell[]):DetailBoundaryEdge[] {
  grid(g);validateDetailFootprint(cells);const occupied=new Set(cells.map(key)),edges:DetailBoundaryEdge[]=[];
  for(const c of [...cells].sort((a,b)=>a.q-b.q||a.r-b.r)) for(let i=0;i<6;i++) {
    const [q,r]=directions[i];if(occupied.has(key({q:c.q+q,r:c.r+r}))) continue;
    const from=vertex(c,i),to=vertex(c,(i+1)%6);
    edges.push({from:worldVertex(g,from),to:worldVertex(g,to),fromKey:`${from.x},${from.y}`,toKey:`${to.x},${to.y}`});
  }
  return edges;
}
