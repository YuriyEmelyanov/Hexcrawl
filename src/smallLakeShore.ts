import {createDetailGrid,detailCellCenter,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {prepareRefinementShoreCells,prepareRefinementShorePath,refinementShoreIntervals,refinementShoreLocation,shoreCurvePoint,type RefinementShore,type ShoreCurve} from './geometryRefinementShore.ts';
import {FINE_HEX_WIDTH} from './oneMilePresentation.ts';
import {buildNaturalLakes} from './rendering/lakeGeometry.ts';
import {fineCellKey,type OneMileCell} from './oneMile.ts';
import {hasFullDrySupport,smallLakeNeighbours,type SmallLake} from './smallLakes.ts';

export type SmallLakeProtection=Readonly<{
  roads:readonly Readonly<{ref:string;points:readonly WorldPoint[]}>[];
  crossings:readonly Readonly<{ref:string;points:readonly WorldPoint[]}>[];
  anchors:readonly Readonly<{ref:string;point:WorldPoint}>[];
}>;

/** Keep the seeded, rounded SVG path identical during validation, zoom and export. */
export function smallLakeShorePath(lake:SmallLake,seed:number):string {
  const grid=createDetailGrid(1);
  const cells=lake.cells.map(c=>{
    const p=detailCellCenter(grid,c);
    // Generated basins keep their shape if an earlier candidate is skipped.
    const lakeId=lake.origin==='manual'?lake.id:undefined;
    return {...c,x:p.x*FINE_HEX_WIDTH,y:p.y*FINE_HEX_WIDTH,lakeId};
  });
  const [shape]=buildNaturalLakes(cells,28/6,seed);
  return shape?.path??'';
}

type Arc={curve:ShoreCurve;lo:number;hi:number;reverse:boolean};
const invalidShape={kind:'shape' as const,ref:''};
const cross=(a:WorldPoint,b:WorldPoint)=>a.x*b.y-a.y*b.x;
const relative=(a:WorldPoint,b:WorldPoint)=>({x:a.x-b.x,y:a.y-b.y});
const arcArea=(from:WorldPoint,control:WorldPoint,to:WorldPoint)=>
  (2*cross(from,control)+cross(from,to)+2*cross(control,to))/6;
const reverseLoop=(loop:readonly ShoreCurve[],depth:number)=>{
  const base=loop[0].from;
  const area=loop.reduce((sum,c)=>sum+arcArea(relative(c.from,base),relative(c.control,base),relative(c.to,base)),0);
  return (area>0)!==(depth%2===0);
};

/** The intersection has shore arcs in the mask and mask edges in the shore.
 * Orient each with water on its left, including the boundaries of islands. */
function clippedArcs(shore:RefinementShore,clip:RefinementShore):Arc[]|null {
  const arcs:Arc[]=[],shoreCuts=new Map<ShoreCurve,number[]>();
  for(const [i,loop] of clip.loops.entries()){
    const reverse=reverseLoop(loop,clip.depths[i]);
    for(const edge of loop){
      const intersection=refinementShoreIntervals(shore,edge);
      if(intersection.status==='error')return null;
      for(const a of intersection.intervals)arcs.push({curve:edge,lo:a.startFraction,hi:a.endFraction,reverse});
      for(const hit of intersection.cuts){
        const curve=shore.loops[hit.loopIndex][hit.curveIndex],cuts=shoreCuts.get(curve)??[];
        cuts.push(hit.shoreFraction);
        shoreCuts.set(curve,cuts);
      }
    }
  }
  for(const [i,loop] of shore.loops.entries()){
    const reverse=reverseLoop(loop,shore.depths[i]);
    for(const curve of loop){
      const stops=[0,...shoreCuts.get(curve)??[],1].sort((a,b)=>a-b);
      for(let j=1;j<stops.length;j++){
        const lo=stops[j-1],hi=stops[j];
        // A coincident straight section already belongs to the mask above.
        if(hi-lo>1e-10&&refinementShoreLocation(clip,shoreCurvePoint(curve,(lo+hi)/2))==='inside')arcs.push({curve,lo,hi,reverse});
      }
    }
  }
  return arcs;
}

/** Exactly one positive-area exterior is needed. Islands have negative
 * signed area. A point contact between exteriors does not join their water. */
function connectedWater(arcs:readonly Arc[]):boolean {
  const tolerance=1e-8,points=new Map<string,Array<{id:number;p:WorldPoint}>>();
  let nextId=0;
  const vertex=(p:WorldPoint)=>{
    const x=Math.floor(p.x/tolerance),y=Math.floor(p.y/tolerance);
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
      const known=points.get(`${x+i},${y+j}`)?.find(v=>Math.hypot(v.p.x-p.x,v.p.y-p.y)<=tolerance);
      if(known)return known.id;
    }
    const key=`${x},${y}`,bucket=points.get(key)??[],id=nextId++;
    bucket.push({id,p});points.set(key,bucket);return id;
  };
  const edges=new Map<number,{end:number;from:WorldPoint;control:WorldPoint;to:WorldPoint}>(),incoming=new Set<number>();
  for(const {curve,lo,hi,reverse} of arcs){
    const from=shoreCurvePoint(curve,reverse?hi:lo),to=shoreCurvePoint(curve,reverse?lo:hi);
    const mid=shoreCurvePoint(curve,(lo+hi)/2),control={x:2*mid.x-(from.x+to.x)/2,y:2*mid.y-(from.y+to.y)/2};
    const start=vertex(from),end=vertex(to);
    if(start===end&&Math.hypot(mid.x-from.x,mid.y-from.y)<=tolerance)continue;
    if(edges.has(start)||incoming.has(end))return false;
    edges.set(start,{end,from,control,to});incoming.add(end);
  }
  let exteriors=0;
  while(edges.size){
    const start=edges.keys().next().value!,base=edges.get(start)!.from;
    let cursor=start,area=0;
    do{
      const edge=edges.get(cursor);
      if(!edge)return false;
      edges.delete(cursor);
      area+=arcArea(relative(edge.from,base),relative(edge.control,base),relative(edge.to,base));
      cursor=edge.end;
    }while(cursor!==start);
    if(area>1e-10&&++exteriors>1)return false;
  }
  return exteriors===1;
}

export function smallLakeWaterConnected(shore:RefinementShore,clip:RefinementShore):boolean {
  const boundary=clippedArcs(shore,clip);
  return !!boundary&&connectedWater(boundary);
}

function shoreConflict(shore:RefinementShore,clip:RefinementShore,protection:SmallLakeProtection) {
  const bounds=clip.loops.flatMap(loop=>loop.map(c=>c.from));
  const minX=Math.min(...bounds.map(p=>p.x)),maxX=Math.max(...bounds.map(p=>p.x));
  const minY=Math.min(...bounds.map(p=>p.y)),maxY=Math.max(...bounds.map(p=>p.y));
  const contains=(p:WorldPoint)=>p.x>=minX&&p.x<=maxX&&p.y>=minY&&p.y<=maxY&&
    refinementShoreLocation(clip,p)!=='outside'&&refinementShoreLocation(shore,p)!=='outside';
  const overlaps=(points:readonly WorldPoint[])=>{
    if(points.some(contains))return true;
    return points.slice(1).some((to,i)=>{
      const from=points[i];
      if(Math.max(from.x,to.x)<minX||Math.min(from.x,to.x)>maxX||Math.max(from.y,to.y)<minY||Math.min(from.y,to.y)>maxY)return false;
      const water=refinementShoreIntervals(shore,{from,to});
      if(water.status==='error'||!water.intervals.length)return false;
      const mask=refinementShoreIntervals(clip,{from,to});
      return mask.status==='prepared'&&water.intervals.some(a=>mask.intervals.some(b=>
        Math.min(a.endFraction,b.endFraction)-Math.max(a.startFraction,b.startFraction)>1e-10));
    });
  };
  const crossing=protection.crossings.find(x=>overlaps(x.points));
  if(crossing)return {kind:'crossing' as const,ref:crossing.ref};
  const road=protection.roads.find(x=>overlaps(x.points));
  if(road)return {kind:'road' as const,ref:road.ref};
  const anchor=protection.anchors.find(x=>contains(x.point));
  if(anchor)return {kind:'anchor' as const,ref:anchor.ref};
  return null;
}

export type SmallLakeView=Readonly<{lake:SmallLake;path:string;maskCells:readonly DetailCell[]}>;

/** Fringe cells never change the selected footprint. Reserve a fringe only
 * where the world supports dry land and no existing lake owns that area. */
export function prepareSmallLakeShore(lake:SmallLake,seed:number,origin:WorldPoint,protection:SmallLakeProtection,
  coverage?:ReadonlyMap<string,OneMileCell>,reserved:ReadonlySet<string>=new Set()) {
  const path=smallLakeShorePath(lake,seed),core={lake,path,maskCells:lake.cells};
  const shore=prepareRefinementShorePath(path,1/FINE_HEX_WIDTH,origin),clip=prepareRefinementShoreCells(lake.cells,origin,1);
  const finish=(view:SmallLakeView,conflict:ReturnType<typeof shoreConflict>|typeof invalidShape)=>({view,conflict});
  if(shore.status==='error'||clip.status==='error')return finish(core,invalidShape);
  const arcs=clippedArcs(shore,clip);
  const conflict=shoreConflict(shore,clip,protection);
  if(conflict)return finish(core,conflict);
  if(!arcs||!connectedWater(arcs))return finish(core,invalidShape);
  if(!coverage)return finish(core,null);

  const excluded=new Set([...(lake.shoreCells?[]:reserved),...lake.cells.map(fineCellKey)]);
  const fringe=new Map((lake.shoreCells??lake.cells.flatMap(smallLakeNeighbours)).map(cell=>[fineCellKey(cell),cell]));
  const extras=[...fringe].filter(([key])=>!excluded.has(key)&&hasFullDrySupport(coverage.get(key))).map(([,cell])=>cell).filter(cell=>{
    const mask=prepareRefinementShoreCells([cell],origin,1);
    if(mask.status==='error')return false;
    const boundary=clippedArcs(shore,mask);
    return !!boundary?.length&&!shoreConflict(shore,mask,protection);
  });
  if(!extras.length)return finish(core,null);
  const connected=(cells:readonly DetailCell[])=>{
    const mask=prepareRefinementShoreCells(cells,origin,1);
    return mask.status==='prepared'&&smallLakeWaterConnected(shore,mask);
  };
  const expanded=[...lake.cells,...extras];
  const maskCells=connected(expanded)?expanded:extras.reduce<readonly DetailCell[]>((accepted,cell)=>{
    const candidate=[...accepted,cell];
    return connected(candidate)?candidate:accepted;
  },lake.cells);
  return finish({...core,maskCells},null);
}

/** Reserve shared spill before applying per-lake road, crossing or POI
 * conflicts. That allocation is independent of which candidates survive. */
export function prepareAutomaticSmallLakeBatch(footprints:readonly (readonly DetailCell[])[],nextId:number,
  seed:number,origin:WorldPoint,protection:SmallLakeProtection,coverage:ReadonlyMap<string,OneMileCell>,occupied:ReadonlySet<string>) {
  const candidates=footprints.filter(cells=>cells.every(cell=>!occupied.has(fineCellKey(cell))));
  const reserved=new Set([...occupied,...candidates.flatMap(cells=>cells.map(fineCellKey))]);
  const noProtection:SmallLakeProtection={roads:[],crossings:[],anchors:[]};
  const lakes:SmallLake[]=[];
  for(const cells of candidates){
    const lake:SmallLake={id:nextId,origin:'automatic',cells};
    const planned=prepareSmallLakeShore(lake,seed,origin,noProtection,coverage,reserved);
    if(planned.conflict)continue;
    const shoreCells=planned.view.maskCells.slice(cells.length);
    for(const cell of shoreCells)reserved.add(fineCellKey(cell));
    const checked=prepareSmallLakeShore({...lake,shoreCells},seed,origin,protection,coverage);
    if(checked.conflict)continue;
    if(nextId===Number.MAX_SAFE_INTEGER)throw Error('Small lake id counter overflow');
    lakes.push({...lake,shoreCells:checked.view.maskCells.slice(cells.length)});
    nextId++;
  }
  return {lakes,nextId};
}

export function smallLakeShoreConflict(lake:SmallLake,seed:number,origin:WorldPoint,protection:SmallLakeProtection) {
  return prepareSmallLakeShore(lake,seed,origin,protection).conflict;
}
