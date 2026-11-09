/** DETAIL1 source-geography bridge. Pure preview: original six-mile cells,
 * river vertices and road graph stay authoritative. No activation or RNG. */
import {createDetailGrid,detailCellCenter,detailCellPolygon,detailPositiveAreaIntersections,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {buildDetailPoiFootprint,detailSegmentSpan,type DetailWaterAccess,type DetailWaterRequirement,type DetailRouteAccess} from './detailPlacement.ts';
import {assertDetailPoiOwners,reconcileDetailPoiIdentities,type DetailPoiIdentities} from './detailIdentity.ts';
import {poiNameLocators,hasCentralPoi,type PoiRegion} from './manualPois.ts';
import {parseWaterHex,waterHexKey,waterKindAt,waterNeighbors,type WaterTerrain} from './manualWater.ts';
import type {Detail1State,DetailPoiFootprint} from './detailModel.ts';
import type {KnaveLayer} from './knaveClassic.ts';
import policy from './tags/knavePolicy.json' with {type:'json'};

type Segment=Readonly<{from:WorldPoint;to:WorldPoint}>;
export type DetailLiveRiver=Readonly<{id:number;edges:readonly Readonly<{id:string;segment:Segment;rapid:boolean;crossings:readonly Readonly<{kind:string;point:WorldPoint}>[]}>[];starts:readonly WorldPoint[];waterfalls:readonly Readonly<{id:string;point:WorldPoint}>[]}>;
export type DetailGeographyMap=Readonly<{
 regions:readonly PoiRegion[];hexTerrainByKey:ReadonlyMap<string,WaterTerrain>;waterPoiByKey:ReadonlyMap<string,string>;
 roads:readonly {id:number;segments:readonly {from:DetailCell;to:DetailCell;kind:'road'|'trail'}[]}[];
 seas:readonly Readonly<{id:number;hexKeys:readonly string[]}>[];knave?:KnaveLayer;physicalGrid?:Detail1State;
}>;
export type DetailWaterProvenance=Readonly<{provenance:'unknown'|'water_environment'|'knave_source_row';requirement:DetailWaterRequirement;predicates:readonly string[]}>;
export type DetailGeographyPreview=Readonly<{
 activatesDetail1:false;grid:Detail1State['grid'];source:Detail1State['source'];
 poiIdentities:DetailPoiIdentities;poiFootprints:readonly DetailPoiFootprint[];waterRequirementsByPoi:Readonly<Record<string,DetailWaterProvenance>>;
}>;
const fail=(code:string):never=>{throw Error(`DETAIL1 ${code}`);};
const key=waterHexKey;
const middle=(s:Segment):WorldPoint=>({x:(s.from.x+s.to.x)/2,y:(s.from.y+s.to.y)/2});
// App uses HEX_SIZE=28 and the same pointy orientation. Convert unshifted
// model coordinates, never renderer offsets, zoom, rotation or fitted bounds.
export function detailSourcePixelToWorld(point:WorldPoint,origin:WorldPoint={x:0,y:0}):WorldPoint {
 if(![point.x,point.y,origin.x,origin.y].every(Number.isFinite))fail('invalid_source_point');
 const factor=6/(Math.sqrt(3)*28);return {x:origin.x+point.x*factor,y:origin.y+point.y*factor};
}
/** Exact line intersection of an existing path segment and river edge. */
export function detailCrossingPoint(a:Segment,b:Segment):WorldPoint|null {
 const dx=a.to.x-a.from.x,dy=a.to.y-a.from.y,ex=b.to.x-b.from.x,ey=b.to.y-b.from.y;
 const denominator=dx*ey-dy*ex,tolerance=1e-10*Math.max(1,Math.hypot(dx,dy)*Math.hypot(ex,ey));
 if(Math.abs(denominator)<=tolerance)return null;
 const px=b.from.x-a.from.x,py=b.from.y-a.from.y,t=(px*ey-py*ex)/denominator,u=(px*dy-py*dx)/denominator;
 if(t< -1e-10||t>1+1e-10||u< -1e-10||u>1+1e-10)return null;
 return {x:a.from.x+t*dx,y:a.from.y+t*dy};
}
function requirement(map:DetailGeographyMap,alias:string,water:boolean):DetailWaterProvenance {
 if(water)return {provenance:'water_environment',requirement:'water',predicates:[]};
 const site=map.knave?.content?.byPoi[alias]?.site;
 if(!site)return {provenance:'unknown',requirement:'none',predicates:[]};
 const row=policy.rows.find(r=>r.table===site.table&&r.sourceRow===site.sourceRow&&r.status==='eligible');
 if(!row)fail('unknown_source_policy');
 const predicates=row!.requiresAll??[];
 const needs:DetailWaterRequirement=predicates.includes('river_waterfall')?'waterfall':predicates.includes('river_rapids')?'rapid':predicates.some(p=>p.startsWith('crossing_'))?'crossing':predicates.some(p=>p==='river_contact'||p==='river_start')?'river':predicates.includes('water_contact')?'water':'none';
 return {provenance:'knave_source_row',requirement:needs,predicates:[...predicates]};
}
function waterIdentity(map:DetailGeographyMap,cellKey:string):string {
 const terrain=map.hexTerrainByKey.get(cellKey);
 if(terrain?.terrainOverride==='lake'&&Number.isSafeInteger(terrain.lakeId)&&(terrain.lakeId??0)>0)return `lake:${terrain.lakeId}`;
 if(terrain?.terrainOverride==='sea'){
  const owners=map.seas.filter(s=>s.hexKeys.includes(cellKey));if(owners.length===1)return `sea:${owners[0].id}`;
 }
 return fail('unresolved_water_identity');
}
function sharedEdge(a:readonly WorldPoint[],b:readonly WorldPoint[]):Segment {
 const shared=a.filter(p=>b.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1e-8));
 if(shared.length!==2)fail('invalid_shore_geometry');return {from:shared[0],to:shared[1]};
}
/** A coarse POI is served by paths having a real node at its accepted address.
 * Nearby paths and cross-only intersections are never assigned implicitly. */
function assignedRoutes(map:DetailGeographyMap,source:DetailCell,origin:WorldPoint):DetailRouteAccess[] {
 const coarse=createDetailGrid(6,origin),fine=createDetailGrid(1,origin),result:DetailRouteAccess[]=[];
 const candidates=detailPositiveAreaIntersections(fine,detailCellPolygon(coarse,source));
 for(const road of [...map.roads].sort((a,b)=>a.id-b.id))for(const segment of road.segments){
  if(key(segment.from)!==key(source)&&key(segment.to)!==key(source))continue;
  const path={from:detailCellCenter(coarse,segment.from),to:detailCellCenter(coarse,segment.to)};
  const edge=[key(segment.from),key(segment.to)].sort().join('|');
  for(const {cell}of candidates){
   const span=detailSegmentSpan(fine,cell,path);if(!span)continue;
   // The saved entry is an actual subdivision node on this existing segment.
   // It adds no connector and does not move any source road endpoint.
   result.push({routeId:`road:${road.id}`,accessNodeId:`port:${edge}:${key(cell)}`,kind:segment.kind,segment:span});
  }
 }
 return result;
}
function waterAccesses(map:DetailGeographyMap,rivers:readonly DetailLiveRiver[],source:DetailCell,origin:WorldPoint,water:boolean,need:DetailWaterProvenance):DetailWaterAccess[] {
 const fine=createDetailGrid(1,origin),coarse=createDetailGrid(6,origin),polygon=detailCellPolygon(coarse,source),projected=detailPositiveAreaIntersections(fine,polygon),result:DetailWaterAccess[]=[];
 const line=(segment:Segment,waterId:string,segmentId:string,kind:DetailWaterAccess['kind'])=>{
  // First clip to the actual source tile. A fine cell straddling its edge must
  // not pick up an unrelated piece of river lying outside that tile.
  const inside=detailSegmentSpan(coarse,source,segment,true);if(!inside)return;
  for(const {cell}of projected){const span=detailSegmentSpan(fine,cell,inside,true);if(span)result.push({waterId,segmentId,kind,cell,contact:middle(span)});}
 };
 const point=(at:WorldPoint,waterId:string,segmentId:string,kind:DetailWaterAccess['kind'])=>{
  // A point feature is attached only to its own source tile, including its boundary.
  const coarsePolygon=polygon;
  const areaSign=coarsePolygon.reduce((sum,p,i)=>sum+p.x*coarsePolygon[(i+1)%6].y-p.y*coarsePolygon[(i+1)%6].x,0)>=0?1:-1;
  if(!coarsePolygon.every((a,i)=>{const b=coarsePolygon[(i+1)%6];return areaSign*((b.x-a.x)*(at.y-a.y)-(b.y-a.y)*(at.x-a.x))>=-1e-8;}))return;
  const cell=worldToDetailCell(fine,at);if(projected.some(p=>key(p.cell)===key(cell)))result.push({waterId,segmentId,kind,cell,contact:at});
 };
 if(water){
  const waterId=waterIdentity(map,key(source));
  for(const {cell,polygon:clip}of projected){const contact={x:clip.reduce((sum,p)=>sum+p.x,0)/clip.length,y:clip.reduce((sum,p)=>sum+p.y,0)/clip.length};result.push({waterId,segmentId:`cell:${key(source)}`,kind:'water',cell,contact});}
  return result;
 }
 if(need.requirement==='none')return result;
 if(need.requirement==='water'||need.requirement==='shore')for(const neighbor of waterNeighbors(key(source))){
  if(waterKindAt(map.hexTerrainByKey,neighbor)==='land')continue;
  line(sharedEdge(polygon,detailCellPolygon(coarse,parseWaterHex(neighbor))),waterIdentity(map,neighbor),`shore:${key(source)}|${neighbor}`,'shore');
 }
 for(const river of rivers){
  const waterId=`river:${river.id}`;
  if(need.predicates.includes('river_start')){for(const at of river.starts)point(at,waterId,'start','river');continue;}
  if(need.requirement==='waterfall'){for(const mark of river.waterfalls)point(mark.point,waterId,mark.id,'waterfall');continue;}
  for(const edge of river.edges){
   if(need.requirement==='rapid'&&!edge.rapid)continue;
   if(need.requirement==='crossing'){
    const kinds=need.predicates.filter(p=>p.startsWith('crossing_')).map(p=>p.slice(9));
    for(const crossing of edge.crossings)if(kinds.every(k=>k==='any'||k===crossing.kind))point(crossing.point,waterId,edge.id,'crossing');
    continue;
   }
   line(edge.segment,waterId,edge.id,need.requirement==='rapid'?'rapid':'river');
  }
 }
 return result;
}
/** Builds all candidates before returning. Failure leaves the caller's map,
 * history, ID counters and accepted content untouched. No partial application. */
export function buildDetailGeographyPreview(map:DetailGeographyMap,rivers:readonly DetailLiveRiver[],origin:WorldPoint={x:0,y:0}):DetailGeographyPreview {
 if(map.physicalGrid?.poiFootprints.length)fail('existing_footprints_require_reconciliation');
 const live=poiNameLocators({regions:[...map.regions],waterPoiByKey:new Map(map.waterPoiByKey)},true);
 const previous=map.physicalGrid?.poiIdentities;if(previous)assertDetailPoiOwners(previous,live);
 const identities=previous??reconcileDetailPoiIdentities(live),coarse=createDetailGrid(6,origin),fine=createDetailGrid(1,origin);
 const requirements:Record<string,DetailWaterProvenance>={},footprints:DetailPoiFootprint[]=[];
 for(const alias of [...live].sort()){
  const water=alias.startsWith('waterPoi:'),parts=alias.split(':'),source=parseWaterHex(parts[water?1:2]);
  const region=water?undefined:map.regions.find(r=>r.id===Number(parts[1]));
  const central=region&&hasCentralPoi(region)&&key(region.centerHex)===key(source);
  const kind=central?region!.centralPoiKind:region?.pointOfInterestKinds?.[key(source)];
  if(!water&&waterKindAt(map.hexTerrainByKey,key(source))!=='land')fail('land_poi_in_water');
  const poiId=identities.byLegacyRef[alias],need=requirement(map,alias,water),routes=assignedRoutes(map,source,origin);
  requirements[poiId]=Object.freeze({...need,predicates:Object.freeze([...need.predicates])});
  footprints.push(buildDetailPoiFootprint(fine,{poiId,legacyRef:alias,role:kind==='capital'?'capital':kind==='throne'?'mythic_seat':'site',anchor:detailCellCenter(coarse,source),sourcePolygon:detailCellPolygon(coarse,source),waterRequirement:need.requirement,waterAccesses:waterAccesses(map,rivers,source,origin,water,need),routeRequirement:routes.length?'assigned':'none',routeAccesses:routes}));
 }
 return Object.freeze({activatesDetail1:false,grid:Object.freeze({origin:Object.freeze({...origin}),orientation:'pointy',convention:'across_flats'}),source:Object.freeze({stepMiles:6,physicalConvention:map.physicalGrid?.source.physicalConvention??'unknown',displayAssumption:'project_across_flats_6mi'}),poiIdentities:identities,poiFootprints:Object.freeze(footprints),waterRequirementsByPoi:Object.freeze(requirements)});
}
