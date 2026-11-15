import {
  createDetailGrid,
  detailCellCenter,
  detailCellPolygon,
  detailPositiveAreaIntersections,
  validateDetailFootprint,
  worldToDetailCell,
  type DetailCell,
  type DetailGrid,
  type WorldPoint,
} from './detailGrid.ts';
import type {DetailAttachmentRef,DetailExtent,DetailPoiFootprint} from './detailModel.ts';
import {detailCatalogueExtent,detailCirclePolygon,detailPointInPolygon,detailSegmentPolygonEntry,type DetailSizeNamespace} from './detailSizes.ts';

export type DetailPoiRole='capital'|'mythic_seat'|'site';
export type DetailWaterKind='shore'|'river'|'water'|'crossing'|'rapid'|'waterfall';
export type DetailWaterRequirement='none'|DetailWaterKind;
export type DetailRouteRequirement='none'|'assigned';
export type DetailWaterAccess=Readonly<{
  waterId:string;segmentId:string;kind:DetailWaterKind;cell:DetailCell;contact:WorldPoint;
}>;
export type DetailRouteAccess=Readonly<{
  routeId:string;accessNodeId:string;kind:'road'|'trail';segment:Readonly<{from:WorldPoint;to:WorldPoint}>;
}>;
export type DetailMeasuredExtent=Readonly<{
  sourceId:string;unit:'mile'|'meter';sourcePolygon:readonly WorldPoint[];
}>;
export type DetailPoiPlacementInput=Readonly<{
  poiId:string;legacyRef:string|null;role:DetailPoiRole;anchor:WorldPoint;
  sourcePolygon:readonly WorldPoint[];measuredExtent?:DetailMeasuredExtent;
  namespace?:DetailSizeNamespace;typeId?:string;
  manualSize?:Readonly<{diameterMiles:number;basis:'conditional'|'measured_override';note:string}>;
  waterRequirement:DetailWaterRequirement;waterAccesses:readonly DetailWaterAccess[];
  routeRequirement:DetailRouteRequirement;routeAccesses:readonly DetailRouteAccess[];
}>;

export class DetailPlacementError extends Error {
  readonly code:string;
  constructor(code:string){super(`DETAIL1 ${code}`);this.name='DetailPlacementError';this.code=code;}
}
const fail=(code:string):never=>{throw new DetailPlacementError(code);};
const key=(cell:DetailCell)=>`${cell.q},${cell.r}`;
const finite=(point:WorldPoint)=>Number.isFinite(point.x)&&Number.isFinite(point.y);
const cross=(a:WorldPoint,b:WorldPoint,p:WorldPoint)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);

function text(value:string,label:string):string {
  if(!value.trim()||value.length>512) fail(`invalid_${label}`);
  return value;
}
function compatibleWater(requirement:DetailWaterKind,actual:DetailWaterKind):boolean {
  if(requirement==='water') return true;
  if(requirement==='river') return ['river','crossing','rapid','waterfall'].includes(actual);
  return requirement===actual;
}
function pointInConvexCell(grid:DetailGrid,cell:DetailCell,point:WorldPoint):boolean {
  const polygon=detailCellPolygon(grid,cell);
  const orientation=polygon.reduce((sum,p,index)=>{const n=polygon[(index+1)%polygon.length];return sum+p.x*n.y-p.y*n.x;},0)>=0?1:-1;
  const tolerance=Number.EPSILON*256*Math.max(1,grid.step,Math.abs(point.x),Math.abs(point.y));
  return polygon.every((p,index)=>orientation*cross(p,polygon[(index+1)%polygon.length],point)>=-tolerance);
}
/** Positive t-span proves a real route portion inside the cell; a corner or
 * edge-only touch is rejected. */
export function detailSegmentSpan(grid:DetailGrid,cell:DetailCell,segment:DetailRouteAccess['segment'],allowBoundary=false):Readonly<{from:WorldPoint;to:WorldPoint}>|null {
  if(!finite(segment.from)||!finite(segment.to)) fail('invalid_route_segment');
  const polygon=detailCellPolygon(grid,cell),direction={x:segment.to.x-segment.from.x,y:segment.to.y-segment.from.y};
  const length=Math.hypot(direction.x,direction.y);if(!(length>0)) return null;
  const orientation=polygon.reduce((sum,p,index)=>{const n=polygon[(index+1)%polygon.length];return sum+p.x*n.y-p.y*n.x;},0)>=0?1:-1;
  const tolerance=Number.EPSILON*512*Math.max(1,grid.step,length,Math.abs(segment.from.x),Math.abs(segment.from.y),Math.abs(segment.to.x),Math.abs(segment.to.y));
  let lower=0,upper=1;
  for(let index=0;index<polygon.length;index++) {
    const a=polygon[index],b=polygon[(index+1)%polygon.length];
    const start=orientation*cross(a,b,segment.from),delta=orientation*((b.x-a.x)*direction.y-(b.y-a.y)*direction.x);
    if(Math.abs(delta)<=tolerance) {if(start<-tolerance)return null;continue;}
    const boundary=-start/delta;
    if(delta>0) lower=Math.max(lower,boundary);else upper=Math.min(upper,boundary);
    if(lower>upper+tolerance)return null;
  }
  if((upper-lower)*length<=Math.max(tolerance,grid.step*1e-10)) return null;
  const at=(t:number)=>Object.freeze({x:segment.from.x+direction.x*t,y:segment.from.y+direction.y*t});
  const midpoint=at((Math.max(0,lower)+Math.min(1,upper))/2);
  if(!allowBoundary&&!polygon.every((p,index)=>orientation*cross(p,polygon[(index+1)%polygon.length],midpoint)>tolerance))return null;
  return Object.freeze({from:at(Math.max(0,lower)),to:at(Math.min(1,upper))});
}
function orderedCells(grid:DetailGrid,cells:readonly DetailCell[],anchor:WorldPoint):DetailCell[] {
  if(!finite(anchor)) fail('invalid_anchor');
  return [...cells].sort((a,b)=>{
    const ac=detailCellCenter(grid,a),bc=detailCellCenter(grid,b);
    return Math.hypot(ac.x-anchor.x,ac.y-anchor.y)-Math.hypot(bc.x-anchor.x,bc.y-anchor.y)||a.q-b.q||a.r-b.r;
  });
}
function routeCells(grid:DetailGrid,cells:readonly DetailCell[],route:DetailRouteAccess):Map<string,Readonly<{from:WorldPoint;to:WorldPoint}>> {
  const result=new Map<string,Readonly<{from:WorldPoint;to:WorldPoint}>>();
  for(const cell of cells){const span=detailSegmentSpan(grid,cell,route.segment);if(span)result.set(key(cell),span);}
  return result;
}

/** Builds one immutable POI entity without changing source geography or using
 * RNG. Water and route candidates refer to already existing live geometry. */
export function buildDetailPoiFootprint(grid:DetailGrid,input:DetailPoiPlacementInput):DetailPoiFootprint {
  if(grid.step!==1) fail('placement_requires_one_mile_grid');
  const poiId=text(input.poiId,'poi_id');if(input.legacyRef!==null)text(input.legacyRef,'legacy_ref');
  if(!finite(input.anchor))fail('invalid_anchor');
  if(input.manualSize&&(!Number.isFinite(input.manualSize.diameterMiles)||input.manualSize.diameterMiles<=0||!['conditional','measured_override'].includes(input.manualSize.basis)))fail('invalid_manual_size');
  if(input.manualSize)text(input.manualSize.note,'manual_size_note');
  const extent:DetailExtent=input.measuredExtent
    ?Object.freeze({kind:'measured_polygon',sourceId:text(input.measuredExtent.sourceId,'extent_source'),unit:input.measuredExtent.unit,method:'positive_area_intersection',sourcePolygon:Object.freeze(input.measuredExtent.sourcePolygon.map(point=>Object.freeze({...point})))})
    :input.manualSize?Object.freeze({kind:'manual_size',...input.manualSize})
    :detailCatalogueExtent(input.namespace??'land',input.typeId??(input.role==='capital'?'capital':input.role==='mythic_seat'?'throne':'structure'));
  const diameter=extent.kind==='representative'?extent.representativeExtentMiles:extent.kind==='manual_size'?extent.diameterMiles:null;
  const physicalPolygon=extent.kind==='measured_polygon'?extent.sourcePolygon:diameter!==null&&(extent.kind==='manual_size'||diameter>=1)?detailCirclePolygon(input.anchor,diameter):null;
  const extentPolygon=physicalPolygon??input.sourcePolygon;
  const projected=extent.kind==='manual_size'&&extent.diameterMiles<1?[worldToDetailCell(grid,input.anchor)]:detailPositiveAreaIntersections(grid,extentPolygon).map(item=>item.cell);
  if(!projected.length)fail('no_projected_cells');
  const ordered=orderedCells(grid,projected,input.anchor),projectedKeys=new Set(projected.map(key));
  const waterOptions=input.waterRequirement==='none'?[]:[...input.waterAccesses]
    .filter(access=>compatibleWater(input.waterRequirement as DetailWaterKind,access.kind)&&projectedKeys.has(key(access.cell))&&pointInConvexCell(grid,access.cell,access.contact)&&(!physicalPolygon||detailPointInPolygon(access.contact,physicalPolygon)))
    .sort((a,b)=>ordered.findIndex(cell=>key(cell)===key(a.cell))-ordered.findIndex(cell=>key(cell)===key(b.cell))||a.waterId.localeCompare(b.waterId)||a.segmentId.localeCompare(b.segmentId));
  if(input.waterRequirement!=='none'&&!waterOptions.length)fail('missing_compatible_water_access');
  const routeOptions=input.routeRequirement==='none'?[]:input.routeAccesses.flatMap(route=>{
    const spans=routeCells(grid,projected,route);return [...spans].flatMap(([cellKey,span])=>{const entry=physicalPolygon?detailSegmentPolygonEntry(span,physicalPolygon):span.from;return entry?[{route,cell:projected.find(cell=>key(cell)===cellKey)!,span,entry}]:[];});
  }).sort((a,b)=>ordered.findIndex(cell=>key(cell)===key(a.cell))-ordered.findIndex(cell=>key(cell)===key(b.cell))||a.route.routeId.localeCompare(b.route.routeId)||a.route.accessNodeId.localeCompare(b.route.accessNodeId));
  // Each assigned route is a requirement; segments of the same route are alternatives.
  const routeIds=input.routeRequirement==='none'?[]:[...new Set(input.routeAccesses.map(route=>route.routeId))].sort();
  if(input.routeRequirement==='assigned'&&(!routeIds.length||routeIds.some(id=>!routeOptions.some(option=>option.route.routeId===id))))fail('missing_route_inside_footprint');
  let cells:DetailCell[],water:DetailWaterAccess|null=null,worldAnchor=input.anchor;
  if(input.measuredExtent&&!detailPointInPolygon(worldAnchor,input.measuredExtent.sourcePolygon))worldAnchor={x:input.measuredExtent.sourcePolygon.reduce((sum,p)=>sum+p.x,0)/input.measuredExtent.sourcePolygon.length,y:input.measuredExtent.sourcePolygon.reduce((sum,p)=>sum+p.y,0)/input.measuredExtent.sourcePolygon.length};
  if(physicalPolygon) {
    // Actual/explicit/conditional geometry is fixed at the accepted anchor.
    // Access failures reject the proposal; no growth, shrink or relocation.
    cells=[...projected].sort((a,b)=>a.q-b.q||a.r-b.r);water=waterOptions[0]??null;
  } else {
    const candidate=ordered.find(cell=>(input.waterRequirement==='none'||waterOptions.some(access=>key(access.cell)===key(cell)))&&routeIds.every(id=>routeOptions.some(option=>option.route.routeId===id&&key(option.cell)===key(cell))));
    const accepted=candidate??fail('no_single_cell_satisfies_access');cells=[accepted];water=waterOptions.find(access=>key(access.cell)===key(accepted))??null;
    // This is initial address placement, not re-estimation of an accepted POI.
    // Tiny/unknown objects retain one marker address, never a one-mile shape.
    if(key(worldToDetailCell(grid,worldAnchor))!==key(accepted))worldAnchor=detailCellCenter(grid,accepted);
  }
  validateDetailFootprint(cells);const footprintKeys=new Set(cells.map(key));
  if(water&&!footprintKeys.has(key(water.cell)))fail('water_access_outside_footprint');
  const attachments:DetailAttachmentRef[]=[];
  if(water)attachments.push(Object.freeze({kind:'water',waterKind:water.kind,waterId:text(water.waterId,'water_id'),segmentId:text(water.segmentId,'water_segment_id'),contact:Object.freeze({...water.contact})}));
  for(const id of routeIds){
    const selected=routeOptions.find(option=>option.route.routeId===id&&footprintKeys.has(key(option.cell)));
    if(!selected)fail('route_access_outside_footprint');
    attachments.push(Object.freeze({kind:'route',routeKind:selected!.route.kind,routeId:text(id,'route_id'),accessNodeId:text(selected!.route.accessNodeId,'access_node_id'),entry:Object.freeze({...selected!.entry})}));
  }
  return Object.freeze({poiId,legacyRef:input.legacyRef,worldAnchor:Object.freeze({...worldAnchor}),cells:Object.freeze(cells.map(cell=>Object.freeze({...cell}))),extent,attachments:Object.freeze(attachments)});
}

export function buildOneMilePoiFootprint(origin:WorldPoint,input:DetailPoiPlacementInput):DetailPoiFootprint {
  return buildDetailPoiFootprint(createDetailGrid(1,origin),input);
}
