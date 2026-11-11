/** POI-SIZE1: representative project estimates, never measurements or game rules.
 * Size is maximum horizontal extent in world miles. Unknown semantic roles stay
 * markers until an explicit survey/manual shape supplies physical geometry. */
import {detailCellCenter,detailCellPolygon,type DetailGrid,type WorldPoint} from './detailGrid.ts';
import type {DetailExtent,DetailPoiFootprint} from './detailModel.ts';

export const DETAIL_SIZE_CATALOGUE_ID='POI-SIZE1' as const;
export const DETAIL_SIZE_BASIS='project_assumption_not_measured' as const;
export const DETAIL_POI_SIZES=Object.freeze({
  "land": {
    "apiary": 0.03,
    "brewery": 0.04,
    "camp": 0.05,
    "capital": 2.5,
    "castle": 0.15,
    "cave": 0.02,
    "city": 1.5,
    "curse": null,
    "cursed_place": null,
    "distillery": 0.04,
    "dungeon": null,
    "dwelling": 0.04,
    "farm": 0.3,
    "fort": 0.15,
    "graveyard": 0.1,
    "hazard": null,
    "holding_castle": 0.15,
    "holding_city": 1.5,
    "holding_stronghold": 0.2,
    "holding_tower": 0.03,
    "holy_place": 0.1,
    "hut": 0.01,
    "lair": 0.05,
    "mill": 0.03,
    "mine": 0.2,
    "monastery": 0.15,
    "monument": 0.01,
    "myth": null,
    "natural_place": null,
    "obelisk": 0.005,
    "pasture": 1.2,
    "portal": 0.01,
    "quarry": 0.3,
    "ruins": 1,
    "sanctuary": 0.1,
    "sawmill": 0.05,
    "statue": 0.005,
    "stone_quarry": 0.3,
    "stronghold": 0.2,
    "structure": null,
    "tavern": 0.02,
    "throne": 0.15,
    "tower": 0.03,
    "town": 0.8,
    "village": 0.3
  },
  "water": {
    "lair": 0.05,
    "rocks": 0.1,
    "shipwreck": 0.08,
    "underwater_cave": 0.03,
    "underwater_ruins": 0.5,
    "whirlpool": 0.1
  }
} as const);
Object.freeze(DETAIL_POI_SIZES.land);Object.freeze(DETAIL_POI_SIZES.water);
export type DetailSizeNamespace=keyof typeof DETAIL_POI_SIZES;
export function detailCatalogueExtent(namespace:DetailSizeNamespace,typeId:string):Extract<DetailExtent,{kind:'representative'}> {
 const catalogue:Readonly<Record<string,number|null>>=DETAIL_POI_SIZES[namespace];
 if(!Object.prototype.hasOwnProperty.call(catalogue,typeId))throw Error('Unknown POI size catalogue type');
 return Object.freeze({kind:'representative',catalogueId:DETAIL_SIZE_CATALOGUE_ID,namespace,typeId,representativeExtentMiles:catalogue[typeId],basis:DETAIL_SIZE_BASIS});
}
export function detailExtentDescription(extent:DetailExtent|null,language:'ru'|'en'='ru'):string {
 const ru=language==='ru';
 if(!extent)return ru?'исходный маркер':'source marker';
 if(extent.kind==='default')return `${ru?'прежняя проектная оценка':'legacy project estimate'}: ${extent.policy==='capital_min_two'?2:1} ${ru?'клетки':'cells'}`;
 if(extent.kind==='representative')return extent.representativeExtentMiles===null?(ru?'размер неизвестен, маркер':'unknown size, marker'):`${ru?'проектная оценка':'project estimate'} ${extent.representativeExtentMiles} ${ru?'мили':'mi'}${extent.representativeExtentMiles<1?(ru?', маркер':', marker'):''}`;
 if(extent.kind==='measured_polygon')return `${ru?'измеренный контур':'measured shape'} (${extent.sourceId})`;
 if(extent.kind==='manual_size')return `${ru?'ручной размер':'manual extent'} ${extent.diameterMiles} ${ru?'мили':'mi'}`;
 return ru?'ручной контур':'manual shape';
}
export function detailCirclePolygon(anchor:WorldPoint,diameterMiles:number):readonly WorldPoint[] {
 if(!Number.isFinite(diameterMiles)||diameterMiles<=0||![anchor.x,anchor.y].every(Number.isFinite))throw Error('Invalid representative extent');
 // Fixed deterministic approximation, explicitly conditional, not a survey.
 return Object.freeze(Array.from({length:96},(_,i)=>Object.freeze({x:anchor.x+diameterMiles/2*Math.cos(i*Math.PI/48),y:anchor.y+diameterMiles/2*Math.sin(i*Math.PI/48)})));
}
/** Closed shape membership, including an edge/vertex. */
export function detailPointInPolygon(point:WorldPoint,polygon:readonly WorldPoint[]):boolean {
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[j],b=polygon[i],cross=(b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x);
  if(Math.abs(cross)<=1e-9&&point.x>=Math.min(a.x,b.x)-1e-9&&point.x<=Math.max(a.x,b.x)+1e-9&&point.y>=Math.min(a.y,b.y)-1e-9&&point.y<=Math.max(a.y,b.y)+1e-9)return true;
  if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
/** Entry lies on the real existing segment and within the physical shape. */
export function detailSegmentPolygonEntry(segment:Readonly<{from:WorldPoint;to:WorldPoint}>,polygon:readonly WorldPoint[]):WorldPoint|null {
 if(detailPointInPolygon(segment.from,polygon))return segment.from;
 const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,hits:number[]=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],ex=b.x-a.x,ey=b.y-a.y,den=dx*ey-dy*ex;
  if(Math.abs(den)<=1e-12)continue;
  const px=a.x-segment.from.x,py=a.y-segment.from.y,t=(px*ey-py*ex)/den,u=(px*dy-py*dx)/den;
  if(t>=0&&t<=1&&u>=0&&u<=1)hits.push(t);
 }
 const t=hits.sort((a,b)=>a-b)[0];return t===undefined?null:{x:segment.from.x+t*dx,y:segment.from.y+t*dy};
}
function diameter(polygons:readonly (readonly WorldPoint[])[]):number|null {
 const points=polygons.flat();if(!points.length)return null;
 let result=0;for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)result=Math.max(result,Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y));
 return result;
}
/** Legacy shapes have no saved anchor. Their deterministic display centroid is
 * only a compatibility fallback; reading them never stores/re-estimates it. */
export function detailFootprintWorldAnchor(footprint:DetailPoiFootprint,grid:DetailGrid):WorldPoint {
 if(footprint.worldAnchor)return footprint.worldAnchor;
 const polygon=footprint.extent.kind==='measured_polygon'?footprint.extent.sourcePolygon:footprint.cells.map(cell=>detailCellCenter(grid,cell));
 return {x:polygon.reduce((sum,p)=>sum+p.x,0)/polygon.length,y:polygon.reduce((sum,p)=>sum+p.y,0)/polygon.length};
}
export function detailFootprintExtentMiles(footprint:DetailPoiFootprint,grid:DetailGrid):number|null {
 const extent=footprint.extent;
 if(extent.kind==='representative')return extent.representativeExtentMiles;
 if(extent.kind==='manual_size')return extent.diameterMiles;
 if(extent.kind==='measured_polygon')return diameter([extent.sourcePolygon]);
 if(extent.kind==='manual')return diameter(footprint.cells.map(cell=>detailCellPolygon(grid,cell)));
 return null;
}
export function detailFootprintHasOutline(footprint:DetailPoiFootprint,grid:DetailGrid):boolean {
 const extent=detailFootprintExtentMiles(footprint,grid);return extent!==null&&extent>=1;
}
/** Coarse summaries may intersect a surveyed small shape on both sides of a
 * boundary. Local marker membership still uses the single saved anchor. */
export function detailFootprintPolygons(footprint:DetailPoiFootprint,grid:DetailGrid):readonly (readonly WorldPoint[])[] {
 const extent=footprint.extent;
 if(extent.kind==='measured_polygon')return [extent.sourcePolygon];
 if(extent.kind==='manual')return footprint.cells.map(cell=>detailCellPolygon(grid,cell));
 const size=detailFootprintExtentMiles(footprint,grid);
 return size===null?[]:[detailCirclePolygon(detailFootprintWorldAnchor(footprint,grid),size)];
}
