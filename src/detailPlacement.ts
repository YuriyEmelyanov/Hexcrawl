import {
  createDetailGrid,
  detailCellCenter,
  detailCellPolygon,
  detailPositiveAreaIntersections,
  validateDetailFootprint,
  type DetailCell,
  type DetailGrid,
  type WorldPoint,
} from './detailGrid.ts';
import type {DetailAttachmentRef,DetailExtent,DetailPoiFootprint} from './detailModel.ts';

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
  waterRequirement:DetailWaterRequirement;waterAccesses:readonly DetailWaterAccess[];
  routeRequirement:DetailRouteRequirement;routeAccesses:readonly DetailRouteAccess[];
}>;

export class DetailPlacementError extends Error {
  readonly code:string;
  constructor(code:string){super(code);this.name='DetailPlacementError';this.code=code;}
}
const fail=(code:string):never=>{throw new DetailPlacementError(code);};
const key=(cell:DetailCell)=>`${cell.q},${cell.r}`;
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]] as const;
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
function routeSpanInCell(grid:DetailGrid,cell:DetailCell,segment:DetailRouteAccess['segment']):Readonly<{from:WorldPoint;to:WorldPoint}>|null {
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
  if(!polygon.every((p,index)=>orientation*cross(p,polygon[(index+1)%polygon.length],midpoint)>tolerance))return null;
  return Object.freeze({from:at(Math.max(0,lower)),to:at(Math.min(1,upper))});
}
function orderedCells(grid:DetailGrid,cells:readonly DetailCell[],anchor:WorldPoint):DetailCell[] {
  if(!finite(anchor)) fail('invalid_anchor');
  return [...cells].sort((a,b)=>{
    const ac=detailCellCenter(grid,a),bc=detailCellCenter(grid,b);
    return Math.hypot(ac.x-anchor.x,ac.y-anchor.y)-Math.hypot(bc.x-anchor.x,bc.y-anchor.y)||a.q-b.q||a.r-b.r;
  });
}
function shortestPath(allowed:ReadonlySet<string>,from:DetailCell,to:DetailCell):DetailCell[]|null {
  const target=key(to),queue:{cell:DetailCell;path:string[]}[]=[{cell:from,path:[key(from)]}],seen=new Set([key(from)]);
  for(let index=0;index<queue.length;index++) {
    const {cell:current,path}=queue[index];if(key(current)===target)return path.map(value=>{const [q,r]=value.split(',').map(Number);return {q,r};});
    for(const [q,r] of directions){const next={q:current.q+q,r:current.r+r},nextKey=key(next);if(allowed.has(nextKey)&&!seen.has(nextKey)){seen.add(nextKey);queue.push({cell:next,path:[...path,nextKey]});}}
  }
  return null;
}
function connectedUnion(allowed:readonly DetailCell[],seeds:readonly DetailCell[]):DetailCell[] {
  const allowedKeys=new Set(allowed.map(key)),result:DetailCell[]=[seeds[0]],included=new Set([key(seeds[0])]);
  for(const seed of seeds.slice(1)) {
    const starts=[...result].sort((a,b)=>a.q-b.q||a.r-b.r);let best:DetailCell[]|null=null;
    for(const start of starts){const path=shortestPath(allowedKeys,start,seed);if(path&&(!best||path.length<best.length||path.length===best.length&&path.map(key).join(';')<best.map(key).join(';')))best=path;}
    const selected:DetailCell[]=best??fail('disconnected_required_access');
    for(const cell of selected)if(!included.has(key(cell))){included.add(key(cell));result.push(cell);}
  }
  return result.sort((a,b)=>a.q-b.q||a.r-b.r);
}
function routeCells(grid:DetailGrid,cells:readonly DetailCell[],route:DetailRouteAccess):Map<string,Readonly<{from:WorldPoint;to:WorldPoint}>> {
  const result=new Map<string,Readonly<{from:WorldPoint;to:WorldPoint}>>();
  for(const cell of cells){const span=routeSpanInCell(grid,cell,route.segment);if(span)result.set(key(cell),span);}
  return result;
}

/** Builds one immutable POI entity without changing source geography or using
 * RNG. Water and route candidates refer to already existing live geometry. */
export function buildDetailPoiFootprint(grid:DetailGrid,input:DetailPoiPlacementInput):DetailPoiFootprint {
  if(grid.step!==1) fail('placement_requires_one_mile_grid');
  const poiId=text(input.poiId,'poi_id');if(input.legacyRef!==null)text(input.legacyRef,'legacy_ref');
  if(!finite(input.anchor))fail('invalid_anchor');
  const extentPolygon=input.measuredExtent?.sourcePolygon??input.sourcePolygon;
  const projected=detailPositiveAreaIntersections(grid,extentPolygon).map(item=>item.cell);
  if(!projected.length)fail('no_projected_cells');
  const ordered=orderedCells(grid,projected,input.anchor),projectedKeys=new Set(projected.map(key));
  const water=input.waterRequirement==='none'?null:[...input.waterAccesses]
    .filter(access=>compatibleWater(input.waterRequirement as DetailWaterKind,access.kind)&&projectedKeys.has(key(access.cell))&&pointInConvexCell(grid,access.cell,access.contact))
    .sort((a,b)=>ordered.findIndex(cell=>key(cell)===key(a.cell))-ordered.findIndex(cell=>key(cell)===key(b.cell))||a.waterId.localeCompare(b.waterId)||a.segmentId.localeCompare(b.segmentId))[0]??null;
  if(input.waterRequirement!=='none'&&!water)fail('missing_compatible_water_access');
  const routeOptions=input.routeRequirement==='none'?[]:input.routeAccesses.flatMap(route=>{
    const spans=routeCells(grid,projected,route);return [...spans].map(([cellKey,span])=>({route,cell:projected.find(cell=>key(cell)===cellKey)!,span}));
  }).sort((a,b)=>ordered.findIndex(cell=>key(cell)===key(a.cell))-ordered.findIndex(cell=>key(cell)===key(b.cell))||a.route.routeId.localeCompare(b.route.routeId)||a.route.accessNodeId.localeCompare(b.route.accessNodeId));
  const route=routeOptions[0]??null;if(input.routeRequirement==='assigned'&&!route)fail('missing_route_inside_footprint');
  let cells:DetailCell[];
  if(input.measuredExtent) cells=[...projected].sort((a,b)=>a.q-b.q||a.r-b.r);
  else if(input.role!=='capital') {
    const candidate=ordered.find(cell=>(!water||key(water.cell)===key(cell))&&(!route||key(route.cell)===key(cell)));
    if(!candidate)fail('no_single_cell_satisfies_access');cells=[candidate as DetailCell];
  } else {
    const seeds:DetailCell[]=[];if(water)seeds.push(water.cell);if(route)seeds.push(route.cell);seeds.push(ordered[0]);
    cells=connectedUnion(projected,seeds);
    if(cells.length<2){const first=cells[0],neighbour=ordered.find(cell=>!cells.some(existing=>key(existing)===key(cell))&&directions.some(([q,r])=>key({q:first.q+q,r:first.r+r})===key(cell)));if(!neighbour)fail('capital_needs_two_connected_cells');cells=[...cells,neighbour as DetailCell].sort((a,b)=>a.q-b.q||a.r-b.r);}
  }
  validateDetailFootprint(cells);const footprintKeys=new Set(cells.map(key));
  if(water&&!footprintKeys.has(key(water.cell)))fail('water_access_outside_footprint');
  let selectedRoute:(typeof routeOptions)[number]|null=route;
  if(route&&!footprintKeys.has(key(route.cell))) selectedRoute=routeOptions.find(option=>footprintKeys.has(key(option.cell)))??null;
  if(input.routeRequirement==='assigned'&&!selectedRoute)fail('route_access_outside_footprint');
  const attachments:DetailAttachmentRef[]=[];
  if(water)attachments.push(Object.freeze({kind:'water',waterKind:water.kind,waterId:text(water.waterId,'water_id'),segmentId:text(water.segmentId,'water_segment_id'),contact:Object.freeze({...water.contact})}));
  if(selectedRoute)attachments.push(Object.freeze({kind:'route',routeKind:selectedRoute.route.kind,routeId:text(selectedRoute.route.routeId,'route_id'),accessNodeId:text(selectedRoute.route.accessNodeId,'access_node_id'),entry:Object.freeze({...selectedRoute.span.from})}));
  const extent:DetailExtent=input.measuredExtent
    ?Object.freeze({kind:'measured_polygon',sourceId:text(input.measuredExtent.sourceId,'extent_source'),unit:input.measuredExtent.unit,method:'positive_area_intersection',sourcePolygon:Object.freeze(input.measuredExtent.sourcePolygon.map(point=>Object.freeze({...point})))})
    :Object.freeze({kind:'default',reason:'unknown_size',policy:input.role==='capital'?'capital_min_two':'one_cell'});
  return Object.freeze({poiId,legacyRef:input.legacyRef,cells:Object.freeze(cells.map(cell=>Object.freeze({...cell}))),extent,attachments:Object.freeze(attachments)});
}

export function buildOneMilePoiFootprint(origin:WorldPoint,input:DetailPoiPlacementInput):DetailPoiFootprint {
  return buildDetailPoiFootprint(createDetailGrid(1,origin),input);
}
