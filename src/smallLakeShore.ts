import type {DetailCell,WorldPoint} from './detailGrid.ts';
import {prepareRefinementShoreCells,refinementShoreIntervals,refinementShoreLocation,type RefinementShore} from './geometryRefinementShore.ts';
import {fineCellKey} from './oneMile.ts';
import type {SmallLake} from './smallLakes.ts';

export type SmallLakeProtection=Readonly<{
  roads:readonly Readonly<{ref:string;points:readonly WorldPoint[]}>[];
  crossings:readonly Readonly<{ref:string;points:readonly WorldPoint[]}>[];
  anchors:readonly Readonly<{ref:string;point:WorldPoint}>[];
}>;

function shoreConflict(clip:RefinementShore,protection:SmallLakeProtection) {
  const bounds=clip.loops.flatMap(loop=>loop.map(c=>c.from));
  const minX=Math.min(...bounds.map(p=>p.x)),maxX=Math.max(...bounds.map(p=>p.x));
  const minY=Math.min(...bounds.map(p=>p.y)),maxY=Math.max(...bounds.map(p=>p.y));
  const contains=(p:WorldPoint)=>p.x>=minX&&p.x<=maxX&&p.y>=minY&&p.y<=maxY&&
    refinementShoreLocation(clip,p)!=='outside';
  const overlaps=(points:readonly WorldPoint[])=>{
    if(points.some(contains))return true;
    return points.slice(1).some((to,i)=>{
      const from=points[i];
      if(Math.max(from.x,to.x)<minX||Math.min(from.x,to.x)>maxX||Math.max(from.y,to.y)<minY||Math.min(from.y,to.y)>maxY)return false;
      const hit=refinementShoreIntervals(clip,{from,to});
      return hit.status==='prepared'&&hit.intervals.length>0;
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

export type SmallLakeView=Readonly<{lake:SmallLake}>;

export function prepareSmallLakeShore(lake:SmallLake,origin:WorldPoint,protection:SmallLakeProtection){
  const shore=prepareRefinementShoreCells(lake.cells,origin,1);
  const conflict=shore.status==='error'?{kind:'shape' as const,ref:''}:shoreConflict(shore,protection);
  return {view:{lake},conflict};
}

export function prepareAcceptedSmallLakeViews(lakes:readonly SmallLake[]) {
  return {views:lakes.map(lake=>({lake})),reserved:new Set(lakes.flatMap(lake=>lake.cells.map(fineCellKey)))};
}

export function prepareAutomaticSmallLakeBatch(footprints:readonly (readonly DetailCell[])[],nextId:number,
  origin:WorldPoint,protection:SmallLakeProtection,occupied:ReadonlySet<string>) {
  const lakes:SmallLake[]=[];
  for(const cells of footprints){
    if(cells.some(cell=>occupied.has(fineCellKey(cell))))continue;
    const lake:SmallLake={id:nextId,origin:'automatic',cells};
    if(prepareSmallLakeShore(lake,origin,protection).conflict)continue;
    if(nextId===Number.MAX_SAFE_INTEGER)throw Error('Small lake id counter overflow');
    lakes.push(lake);
    nextId++;
  }
  return {lakes,nextId};
}
