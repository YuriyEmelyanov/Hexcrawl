/** Read-only spatial summaries. Accepted geography and stable owner IDs remain authoritative. */
import {createDetailGrid,detailCellPolygon,detailPositiveAreaIntersections,detailCellAreaSquareMiles,detailCellCenter,detailPolygonArea,worldToDetailCell,type DetailCell,type DetailGrid,type WorldPoint} from './detailGrid.ts';
import type {Detail1State} from './detailModel.ts';
import type {DetailLiveRiver} from './detailGeography.ts';
import {detailFootprintWorldAnchor,detailFootprintExtentMiles,detailFootprintPolygons} from './detailSizes.ts';

type Segment=Readonly<{from:WorldPoint;to:WorldPoint}>;
export type DetailSummaryGeography=Readonly<{
 rivers?:readonly DetailLiveRiver[];
 roads?:readonly Readonly<{id:number;segments:readonly Readonly<{from:DetailCell;to:DetailCell;kind:'road'|'trail'}>[]} >[];
 notes?:ReadonlyMap<string,string>;
}>;
const key=(cell:DetailCell)=>`${cell.q},${cell.r}`;
const cross=(a:WorldPoint,b:WorldPoint,p:WorldPoint)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);

/** Closed-cell intersection, including a shared edge or a single vertex.
 * This is an information query, not a river entry or a new path attachment. */
export function detailSegmentCellIntersection(grid:DetailGrid,cell:DetailCell,segment:Segment):Readonly<{boundaryOnly:boolean}>|null {
 const polygon=detailCellPolygon(grid,cell),{from,to}=segment;
 if(![from.x,from.y,to.x,to.y].every(Number.isFinite))throw Error('Invalid detail segment');
 const direction={x:to.x-from.x,y:to.y-from.y},length=Math.hypot(direction.x,direction.y);
 const tolerance=Number.EPSILON*512*Math.max(1,grid.step,length,Math.abs(from.x),Math.abs(from.y),Math.abs(to.x),Math.abs(to.y));
 const orientation=polygon.reduce((sum,p,i)=>{const n=polygon[(i+1)%polygon.length];return sum+p.x*n.y-p.y*n.x;},0)>=0?1:-1;
 let lower=0,upper=1;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],start=orientation*cross(a,b,from),delta=orientation*((b.x-a.x)*direction.y-(b.y-a.y)*direction.x);
  if(Math.abs(delta)<=tolerance){if(start< -tolerance)return null;continue;}
  const boundary=-start/delta;
  if(delta>0)lower=Math.max(lower,boundary);else upper=Math.min(upper,boundary);
  if(lower>upper+tolerance/Math.max(1,grid.step*length))return null;
 }
 lower=Math.max(0,lower);upper=Math.min(1,upper);
 if(lower>upper+tolerance/Math.max(1,grid.step*length))return null;
 const t=(lower+upper)/2,midpoint={x:from.x+direction.x*t,y:from.y+direction.y*t};
 const interior=polygon.every((a,i)=>orientation*cross(a,polygon[(i+1)%polygon.length],midpoint)>tolerance);
 return {boundaryOnly:!interior};
}

/** The selected address is always the stable one-mile address; the display
 * cell is derived from its world point, never from a source-six owner. */
export function summarizeDetailCell(state:Detail1State,anchor:DetailCell,terrain:ReadonlyMap<string,string>,geography:DetailSummaryGeography={}){
 const fine=createDetailGrid(1,state.grid.origin),grid=createDetailGrid(state.viewStep,state.grid.origin),source=createDetailGrid(6,state.grid.origin);
 const cell=worldToDetailCell(grid,state.selectedWorldPoint??detailCellCenter(fine,anchor)),polygon=detailCellPolygon(grid,cell),cellAreaSquareMiles=detailCellAreaSquareMiles(grid);
 const intersections=detailPositiveAreaIntersections(source,polygon);
 const sources=intersections.filter(hit=>terrain.has(key(hit.cell))).map(hit=>({key:key(hit.cell),terrain:terrain.get(key(hit.cell))!,areaSquareMiles:hit.areaSquareMiles,partial:hit.areaSquareMiles<detailCellAreaSquareMiles(source)*(1-1e-10)}));
 const terrainAreas=new Map<string,number>();
 for(const fragment of sources)terrainAreas.set(fragment.terrain,(terrainAreas.get(fragment.terrain)??0)+fragment.areaSquareMiles);
 const acceptedAreaSquareMiles=Math.min(cellAreaSquareMiles,sources.reduce((sum,s)=>sum+s.areaSquareMiles,0));
 const unknownAreaSquareMiles=Math.max(0,cellAreaSquareMiles-acceptedAreaSquareMiles);
 const terrains=[...terrainAreas].sort(([a],[b])=>a.localeCompare(b)).map(([terrain,areaSquareMiles])=>({terrain,areaSquareMiles,fraction:areaSquareMiles/cellAreaSquareMiles}));
 const byPoi=new Map<string,{poiId:string;legacyRef:string|null;partCells:number;totalCells:number;partial:boolean;extent:typeof state.poiFootprints[number]['extent'];attachments:typeof state.poiFootprints[number]['attachments']}>();
 for(const p of state.poiFootprints){
  const poiAnchor=detailFootprintWorldAnchor(p,fine),extentMiles=detailFootprintExtentMiles(p,fine),shapes=detailFootprintPolygons(p,fine);
  // GRID-C05/C08: small and unknown local objects have one anchor owner even
  // when a measured outline happens to cross a fine-cell boundary.
  const marker=state.viewStep===1&&(extentMiles===null||extentMiles<1)||shapes.length===0;
  let partial=false,partCells=1;
  if(marker){if(key(worldToDetailCell(grid,poiAnchor))!==key(cell))continue;}
  else{
   let area=0,total=0;
   for(const shape of shapes){total+=detailPolygonArea(shape);area+=detailPositiveAreaIntersections(grid,shape).find(h=>key(h.cell)===key(cell))?.areaSquareMiles??0;}
   if(!(area>0))continue;
   partial=area<total*(1-1e-10);
   partCells=p.cells.filter(c=>detailPositiveAreaIntersections(grid,detailCellPolygon(fine,c)).some(h=>key(h.cell)===key(cell))).length;
  }
  // A large entity may meet water or a route in another part of its extent.
  // Keep the accepted references intact, but expose only local contact points
  // in a one-mile card; a point on the shared cell boundary remains relevant.
  const attachments=state.viewStep===1?p.attachments.filter(attachment=>{
   const point=attachment.kind==='water'?attachment.contact:attachment.entry;
   return detailSegmentCellIntersection(grid,cell,{from:point,to:point})!==null;
  }):p.attachments;
  byPoi.set(p.poiId,{poiId:p.poiId,legacyRef:p.legacyRef,partCells,totalCells:p.cells.length,partial,extent:p.extent,attachments});
 }
 const riverOwners=new Map<number,{id:number;edgeIds:string[];crossingIds:string[];waterfallIds:string[];boundaryOnly:boolean}>();
 for(const river of geography.rivers??[]){
  const hits=river.edges.map(edge=>({edge,hit:detailSegmentCellIntersection(grid,cell,edge.segment)})).filter(p=>p.hit!==null);
  if(!hits.length)continue;
  const pointHere=(point:WorldPoint)=>detailSegmentCellIntersection(grid,cell,{from:point,to:point})!==null;
  const existing=riverOwners.get(river.id);
  riverOwners.set(river.id,{id:river.id,edgeIds:[...new Set([...(existing?.edgeIds??[]),...hits.map(h=>h.edge.id)])].sort(),crossingIds:[...new Set([...(existing?.crossingIds??[]),...hits.flatMap(h=>h.edge.crossings.filter(c=>pointHere(c.point)).map(c=>c.id))])].sort(),waterfallIds:[...new Set([...(existing?.waterfallIds??[]),...river.waterfalls.filter(w=>pointHere(w.point)).map(w=>w.id)])].sort(),boundaryOnly:(existing?.boundaryOnly??true)&&hits.every(h=>h.hit!.boundaryOnly)});
 }
 const routeOwners=new Map<number,{id:number;kinds:('road'|'trail')[];segmentKeys:string[];boundaryOnly:boolean}>();
 for(const road of geography.roads??[])for(const segment of road.segments){
  const hit=detailSegmentCellIntersection(grid,cell,{from:detailCellCenter(source,segment.from),to:detailCellCenter(source,segment.to)});if(!hit)continue;
  const existing=routeOwners.get(road.id),segmentKey=[key(segment.from),key(segment.to)].sort().join('|');
  routeOwners.set(road.id,{id:road.id,kinds:[...new Set([...(existing?.kinds??[]),segment.kind])].sort(),segmentKeys:[...new Set([...(existing?.segmentKeys??[]),segmentKey])].sort(),boundaryOnly:(existing?.boundaryOnly??true)&&hit.boundaryOnly});
 }
 const localNote=state.fineCellEdits?.[key(cell)]?.note;
 const notes=localNote?[{key:key(cell),text:localNote,partial:false}]:[];
 return {cell,sources,terrains,cellAreaSquareMiles,acceptedAreaSquareMiles,unknownAreaSquareMiles,pois:[...byPoi.values()].sort((a,b)=>a.poiId.localeCompare(b.poiId)),rivers:[...riverOwners.values()].sort((a,b)=>a.id-b.id),routes:[...routeOwners.values()].sort((a,b)=>a.id-b.id),notes};
}

/** Repeated marks refer to one entity. Small/unknown objects keep only their
 * anchor mark; large one-mile extents retain their accepted discrete coverage. */
export function detailMarkerGroups(state:Detail1State){
 const fine=createDetailGrid(1,state.grid.origin),grid=createDetailGrid(state.viewStep,state.grid.origin),groups=new Map<string,{cell:DetailCell;owners:typeof state.poiFootprints[number][]}>();
 for(const p of state.poiFootprints){
  const extent=detailFootprintExtentMiles(p,fine),cells=state.viewStep===1&&extent!==null&&extent>=1?p.cells:[worldToDetailCell(grid,detailFootprintWorldAnchor(p,fine))];
  for(const cell of cells){const id=key(cell),group=groups.get(id)??{cell,owners:[]};if(!group.owners.some(owner=>owner.poiId===p.poiId))group.owners.push(p);groups.set(id,group);}
 }
 return [...groups.values()];
}
