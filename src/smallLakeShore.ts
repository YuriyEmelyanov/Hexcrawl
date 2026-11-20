import {createDetailGrid,detailCellCenter,type WorldPoint} from './detailGrid.ts';
import {prepareRefinementShoreCells,prepareRefinementShorePath,refinementShoreIntervals,refinementShoreLocation,shoreCurvePoint,type ShoreCurve} from './geometryRefinementShore.ts';
import {refinementWaterCurveOverlaps,type RefinementWater} from './geometryRefinementWater.ts';
import {FINE_HEX_WIDTH} from './oneMilePresentation.ts';
import {buildNaturalLakes} from './rendering/lakeGeometry.ts';
import type {SmallLake} from './smallLakes.ts';

export type SmallLakeProtection=Readonly<{
  roads:readonly Readonly<{ref:string;points:readonly WorldPoint[]}>[];
  crossings:readonly Readonly<{ref:string;points:readonly WorldPoint[]}>[];
  anchors:readonly Readonly<{ref:string;point:WorldPoint}>[];
  water?:RefinementWater;
}>;

/** Keep the seeded, rounded SVG path identical during validation, zoom and export. */
export function smallLakeShorePath(lake:SmallLake,seed:number):string {
  const grid=createDetailGrid(1);
  const cells=lake.cells.map(c=>{
    const p=detailCellCenter(grid,c);
    return {...c,x:p.x*FINE_HEX_WIDTH,y:p.y*FINE_HEX_WIDTH,lakeId:lake.id};
  });
  const [shape]=buildNaturalLakes(cells,28/6,seed);
  return shape?.path??'';
}

export function smallLakeShoreConflict(lake:SmallLake,seed:number,origin:WorldPoint,protection:SmallLakeProtection) {
  const shore=prepareRefinementShorePath(smallLakeShorePath(lake,seed),1/FINE_HEX_WIDTH,origin);
  const clip=prepareRefinementShoreCells(lake.cells,origin,1);
  if(shore.status==='error'||clip.status==='error')return {kind:'shape' as const,ref:''};
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
  const nearby=protection.water?.capsules.filter(c=>Math.max(c.from.x,c.to.x)+c.radius>=minX&&Math.min(c.from.x,c.to.x)-c.radius<=maxX&&
    Math.max(c.from.y,c.to.y)+c.radius>=minY&&Math.min(c.from.y,c.to.y)-c.radius<=maxY)??[];
  const axis=nearby.find(c=>overlaps([c.from,c.to]));
  if(axis)return {kind:'water' as const,ref:String(axis.riverId)};
  if(!nearby.length)return null;

  // The clipped body's boundary consists of shore arcs in the mask and mask
  // edges in the shore. Test both, including thin overlaps at a hex edge.
  const arcs: Array<{curve:ShoreCurve;lo:number;hi:number}>=[];
  const shoreCuts=new Map<ShoreCurve,number[]>();
  for(const loop of clip.loops)for(const edge of loop){
    const intersection=refinementShoreIntervals(shore,edge);
    if(intersection.status==='error')return {kind:'shape' as const,ref:''};
    for(const a of intersection.intervals)arcs.push({curve:edge,lo:a.startFraction,hi:a.endFraction});
    for(const hit of intersection.cuts){
      const curve=shore.loops[hit.loopIndex][hit.curveIndex],cuts=shoreCuts.get(curve)??[];
      cuts.push(hit.shoreFraction);
      shoreCuts.set(curve,cuts);
    }
  }
  for(const loop of shore.loops)for(const curve of loop){
    const stops=[0,...shoreCuts.get(curve)??[],1].sort((a,b)=>a-b);
    for(let i=1;i<stops.length;i++){
      const lo=stops[i-1],hi=stops[i];
      if(hi-lo>1e-10&&refinementShoreLocation(clip,shoreCurvePoint(curve,(lo+hi)/2))!=='outside')arcs.push({curve,lo,hi});
    }
  }
  const water=nearby.find(c=>arcs.some(({curve,lo,hi})=>refinementWaterCurveOverlaps(c,curve,lo,hi)));
  if(water)return {kind:'water' as const,ref:String(water.riverId)};
  return null;
}
