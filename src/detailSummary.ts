/** Read-only spatial summary; source geography and POI IDs stay authoritative. */
import {createDetailGrid,detailCellPolygon,detailPositiveAreaIntersections,detailCellAreaSquareMiles,detailCellCenter,worldToDetailCell,type DetailCell} from './detailGrid.ts';
import type {Detail1State} from './detailModel.ts';
export function summarizeDetailCell(state:Detail1State,anchor:DetailCell,terrain:ReadonlyMap<string,string>){
 const fine=createDetailGrid(1,state.grid.origin),grid=createDetailGrid(state.viewStep,state.grid.origin),source=createDetailGrid(6,state.grid.origin);
 const cell=worldToDetailCell(grid,detailCellCenter(fine,anchor)),polygon=detailCellPolygon(grid,cell),key=(c:DetailCell)=>`${c.q},${c.r}`;
 const sources=detailPositiveAreaIntersections(source,polygon).filter(h=>terrain.has(key(h.cell))).map(h=>({key:key(h.cell),terrain:terrain.get(key(h.cell))!,partial:h.areaSquareMiles<detailCellAreaSquareMiles(source)*(1-1e-10)}));
 const byPoi=new Map<string,{poiId:string;legacyRef:string|null;partCells:number;totalCells:number;partial:boolean;extent:typeof state.poiFootprints[number]['extent'];attachments:typeof state.poiFootprints[number]['attachments']}>();
 for(const p of state.poiFootprints){
  const hits=p.cells.map(c=>detailPositiveAreaIntersections(grid,detailCellPolygon(fine,c)).find(h=>key(h.cell)===key(cell))).filter(h=>h!==undefined);
  if(!hits.length)continue;
  byPoi.set(p.poiId,{poiId:p.poiId,legacyRef:p.legacyRef,partCells:hits.length,totalCells:p.cells.length,partial:hits.length<p.cells.length||hits.some(h=>h.areaSquareMiles<detailCellAreaSquareMiles(fine)*(1-1e-10)),extent:p.extent,attachments:p.attachments});
 }
 return {cell,sources,pois:[...byPoi.values()].sort((a,b)=>a.poiId.localeCompare(b.poiId))};
}
