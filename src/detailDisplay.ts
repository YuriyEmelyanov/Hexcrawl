import {
 createDetailGrid,detailCellAreaSquareMiles,detailCellPolygon,detailPositiveAreaIntersections,
 type DetailCell,type DetailGrid,type WorldPoint,
} from './detailGrid.ts';

export type DetailDisplaySourceIntersection=Readonly<{
 sourceCell:DetailCell;
 polygon:readonly WorldPoint[];
 areaSquareMiles:number;
}>;

export type DetailDisplayCell=Readonly<{
 cell:DetailCell;
 /** The full selected-size hex, including its ungenerated portion. */
 polygon:readonly WorldPoint[];
 areaSquareMiles:number;
 accepted:readonly DetailDisplaySourceIntersection[];
 /** Legal source candidates annotate this display cell; they are not a second grid. */
 candidates:readonly DetailDisplaySourceIntersection[];
 acceptedAreaSquareMiles:number;
 acceptedFraction:number;
 unknownAreaSquareMiles:number;
 unknownFraction:number;
 candidateAreaSquareMiles:number;
}>;

const key=(cell:DetailCell)=>`${cell.q},${cell.r}`;
const canonical=(a:DetailCell,b:DetailCell)=>a.q-b.q||a.r-b.r;
type PendingDisplayCell={
 cell:DetailCell;
 accepted:DetailDisplaySourceIntersection[];
 candidates:DetailDisplaySourceIntersection[];
};

/** Pure rendering projection over accepted and legal six-mile source cells.
 * Unknown space remains part of the full selected-size hex. Candidates already
 * accepted are stale and omitted. This adapter does not select a generation
 * anchor or determine whether a generated region may leave the display cell:
 * that policy remains the explicit GRID-Q01 owner decision.
 */
export function projectDetailDisplayCells(
 grid:DetailGrid,
 acceptedSourceCells:readonly DetailCell[],
 legalSourceCandidates:readonly DetailCell[]=[],
):readonly DetailDisplayCell[] {
 const areaSquareMiles=detailCellAreaSquareMiles(grid),sourceGrid=createDetailGrid(6,grid.origin);
 const acceptedKeys=new Set<string>(),pending=new Map<string,PendingDisplayCell>();
 const project=(sourceCells:readonly DetailCell[],kind:'accepted'|'candidates')=>{
  const unique=new Map<string,DetailCell>();
  for(const sourceCell of sourceCells) {
   // Validate every supplied cell, including duplicates/stale candidates.
   detailCellPolygon(sourceGrid,sourceCell);
   unique.set(key(sourceCell),Object.freeze({q:sourceCell.q,r:sourceCell.r}));
  }
  for(const sourceCell of [...unique.values()].sort(canonical)) {
   const sourceKey=key(sourceCell);
   if(kind==='candidates'&&acceptedKeys.has(sourceKey))continue;
   if(kind==='accepted')acceptedKeys.add(sourceKey);
   for(const hit of detailPositiveAreaIntersections(grid,detailCellPolygon(sourceGrid,sourceCell))) {
    const displayKey=key(hit.cell);
    let display=pending.get(displayKey);
    if(!display){display={cell:hit.cell,accepted:[],candidates:[]};pending.set(displayKey,display);}
    display[kind].push(Object.freeze({sourceCell,polygon:hit.polygon,areaSquareMiles:hit.areaSquareMiles}));
   }
  }
 };
 project(acceptedSourceCells,'accepted');
 project(legalSourceCandidates,'candidates');
 return Object.freeze([...pending.values()].sort((a,b)=>canonical(a.cell,b.cell)).map(display=>{
  const acceptedAreaSquareMiles=Math.min(areaSquareMiles,display.accepted.reduce((sum,hit)=>sum+hit.areaSquareMiles,0));
  const acceptedFraction=acceptedAreaSquareMiles/areaSquareMiles;
  const unknownAreaSquareMiles=Math.max(0,areaSquareMiles-acceptedAreaSquareMiles);
  const candidateAreaSquareMiles=Math.min(unknownAreaSquareMiles,display.candidates.reduce((sum,hit)=>sum+hit.areaSquareMiles,0));
  return Object.freeze({
   cell:display.cell,
   polygon:Object.freeze(detailCellPolygon(grid,display.cell).map(point=>Object.freeze(point))),
   areaSquareMiles,
   accepted:Object.freeze(display.accepted),candidates:Object.freeze(display.candidates),
   acceptedAreaSquareMiles,acceptedFraction,unknownAreaSquareMiles,unknownFraction:1-acceptedFraction,candidateAreaSquareMiles,
  });
 }));
}
