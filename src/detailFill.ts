import {createDetailGrid,detailCellPolygon,detailCellCenter,detailPositiveAreaIntersections,type DetailCell,type DetailGrid,type WorldPoint} from './detailGrid.ts';

export type DetailFillPlan=Readonly<{
 grid:DetailGrid;
 cell:DetailCell;
 anchorPoint:WorldPoint;
 targets:readonly Readonly<{cell:DetailCell;areaSquareMiles:number}>[];
}>;
const key=(cell:DetailCell)=>`${cell.q},${cell.r}`;
/** Freeze the geometric target once; generated regions may extend beyond it. */
export function prepareDetailFill(grid:DetailGrid,cell:DetailCell,anchorPoint:WorldPoint=detailCellCenter(grid,cell)):DetailFillPlan {
 if(grid.step!==12&&grid.step!==24)throw Error('detail_fill_requires_coarse_view');
 if(!Number.isFinite(anchorPoint.x)||!Number.isFinite(anchorPoint.y))throw Error('detail_fill_invalid_anchor');
 const frozenGrid=createDetailGrid(grid.step,grid.origin);
 const targets=detailPositiveAreaIntersections(createDetailGrid(6,grid.origin),detailCellPolygon(frozenGrid,cell))
  .map(hit=>Object.freeze({cell:Object.freeze({...hit.cell}),areaSquareMiles:hit.areaSquareMiles}));
 return Object.freeze({grid:frozenGrid,cell:Object.freeze({...cell}),anchorPoint:Object.freeze({...anchorPoint}),targets:Object.freeze(targets)});
}
/** Match rendered accepted geography; metadata-only terrain is not coverage. */
export function detailFillCoveredSources(
 regions:readonly Readonly<{hexes:readonly DetailCell[]}>[],
 terrain:ReadonlyMap<string,Readonly<{terrainOverride?:string}>>,
):ReadonlySet<string> {
 const keys=new Set(regions.flatMap(region=>region.hexes.map(key)));
 for(const [id,value] of terrain)if(value.terrainOverride==='sea'||value.terrainOverride==='lake')keys.add(id);
 return keys;
}
export function detailFillRemaining(plan:DetailFillPlan,covered:ReadonlySet<string>) {
 const missing=plan.targets.filter(hit=>!covered.has(key(hit.cell)));
 return {cells:missing.map(hit=>hit.cell),areaSquareMiles:missing.reduce((sum,hit)=>sum+hit.areaSquareMiles,0),complete:missing.length===0};
}
/** Current frontier must be supplied after each completed ordinary generation. */
export function nextDetailFillAnchor(plan:DetailFillPlan,covered:ReadonlySet<string>,legalCandidates:readonly DetailCell[]):DetailCell|null {
 const missing=new Set(detailFillRemaining(plan,covered).cells.map(key)),source=createDetailGrid(6,plan.grid.origin);
 let best:DetailCell|null=null,bestDistance=Infinity;
 const candidates=[...legalCandidates].sort((a,b)=>a.q-b.q||a.r-b.r);
 for(const candidate of candidates){
  const point=detailCellCenter(source,candidate);
  if(!missing.has(key(candidate)))continue;
  const distance=(point.x-plan.anchorPoint.x)**2+(point.y-plan.anchorPoint.y)**2;
  const tolerance=Number.EPSILON*32*Math.max(1,distance,Number.isFinite(bestDistance)?bestDistance:0);
  if(!best||distance<bestDistance-tolerance){best=Object.freeze({...candidate});bestDistance=distance;}
 }
 return best;
}
/** No successful unit may lose coverage or consume an unproductive outer tick. */
export function assertDetailFillProgress(plan:DetailFillPlan,before:ReadonlySet<string>,after:ReadonlySet<string>):void {
 const previous=detailFillRemaining(plan,before),next=detailFillRemaining(plan,after);
 if(previous.complete||next.cells.length>=previous.cells.length
  ||plan.targets.some(hit=>before.has(key(hit.cell))&&!after.has(key(hit.cell))))throw Error('detail_fill_no_progress');
}
