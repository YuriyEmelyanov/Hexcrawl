import {createDetailGrid,detailCellCenter,type WorldPoint} from './detailGrid.ts';
import {prepareRefinementShoreCells,prepareRefinementShorePath,refinementShoreIntervals,refinementShoreLocation} from './geometryRefinementShore.ts';
import {FINE_HEX_WIDTH} from './oneMilePresentation.ts';
import {buildNaturalLakes} from './rendering/lakeGeometry.ts';
import type {SmallLake} from './smallLakes.ts';

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
  return null;
}
