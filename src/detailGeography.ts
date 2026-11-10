/** DETAIL1 source-geography bridge. Pure preview: original six-mile cells,
 * river vertices and road graph stay authoritative. No activation or RNG. */
import {createDetailGrid,detailCellCenter,detailCellPolygon,detailPositiveAreaIntersections,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {buildDetailPoiFootprint,detailSegmentSpan,type DetailWaterAccess,type DetailWaterRequirement,type DetailRouteAccess} from './detailPlacement.ts';
import {assertDetailPoiOwners,reconcileDetailPoiIdentities,type DetailPoiIdentities} from './detailIdentity.ts';
import {poiNameLocators,hasCentralPoi,type PoiRegion} from './manualPois.ts';
import {parseWaterHex,waterHexKey,waterKindAt,waterNeighbors,type WaterTerrain} from './manualWater.ts';
import {parseDetail1StateV11,type Detail1State,type DetailPoiFootprint,type DetailExtent} from './detailModel.ts';
import type {KnaveLayer} from './knaveClassic.ts';
import policy from './tags/knavePolicy.json' with {type:'json'};

type Segment=Readonly<{from:WorldPoint;to:WorldPoint}>;
export type DetailLiveRiver=Readonly<{id:number;edges:readonly Readonly<{id:string;segment:Segment;rapid:boolean;crossings:readonly Readonly<{id:string;kind:string;point:WorldPoint}>[]}>[];starts:readonly WorldPoint[];waterfalls:readonly Readonly<{id:string;point:WorldPoint}>[]}>;
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
 const content=map.knave?.content?.byPoi[alias];
 const site=content?('calls' in content?content.calls.find(c=>c.selection==='legacy_compatible_pool'&&c.legacySelection?.role==='primary'):content.site):undefined;
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
    for(const crossing of edge.crossings)if(kinds.every(k=>k==='any'||k===crossing.kind))point(crossing.point,waterId,crossing.id,'crossing');
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
 const identities=previous??reconcileDetailPoiIdentities(live);
 const requirements:Record<string,DetailWaterProvenance>={},footprints:DetailPoiFootprint[]=[];
 for(const alias of [...live].sort()){
  const {footprint,need}=buildLiveFootprint(map,rivers,identities,alias,origin);
  requirements[footprint.poiId]=Object.freeze({...need,predicates:Object.freeze([...need.predicates])});footprints.push(footprint);
 }
 return Object.freeze({activatesDetail1:false,grid:Object.freeze({origin:Object.freeze({...origin}),orientation:'pointy',convention:'across_flats'}),source:Object.freeze({stepMiles:6,physicalConvention:map.physicalGrid?.source.physicalConvention??'unknown',displayAssumption:'project_across_flats_6mi'}),poiIdentities:identities,poiFootprints:Object.freeze(footprints),waterRequirementsByPoi:Object.freeze(requirements)});
}


function buildLiveFootprint(map:DetailGeographyMap,rivers:readonly DetailLiveRiver[],identities:DetailPoiIdentities,alias:string,origin:WorldPoint):{footprint:DetailPoiFootprint;need:DetailWaterProvenance}{
 const coarse=createDetailGrid(6,origin),fine=createDetailGrid(1,origin);
  const water=alias.startsWith('waterPoi:'),parts=alias.split(':'),source=parseWaterHex(parts[water?1:2]);
  const region=water?undefined:map.regions.find(r=>r.id===Number(parts[1]));
  const central=region&&hasCentralPoi(region)&&key(region.centerHex)===key(source);
  const kind=central?region!.centralPoiKind:region?.pointOfInterestKinds?.[key(source)];
  if(!water&&waterKindAt(map.hexTerrainByKey,key(source))!=='land')fail('land_poi_in_water');
  const poiId=identities.byLegacyRef[alias],need=requirement(map,alias,water),routes=assignedRoutes(map,source,origin);
  const footprint=buildDetailPoiFootprint(fine,{poiId,legacyRef:alias,role:kind==='capital'?'capital':kind==='throne'?'mythic_seat':'site',anchor:detailCellCenter(coarse,source),sourcePolygon:detailCellPolygon(coarse,source),waterRequirement:need.requirement,waterAccesses:waterAccesses(map,rivers,source,origin,water,need),routeRequirement:routes.length?'assigned':'none',routeAccesses:routes});
  return {footprint,need};
 }
/** Reconcile the accepted layer against a candidate map before a document write.
 * Existing extents/ports remain literal. Explicit deletion is the only way to
 * drop an owner; a new owner gets one deterministic default, without rerolls. */
export function reconcileDetailGeography(map:DetailGeographyMap,rivers:readonly DetailLiveRiver[],moves:ReadonlyMap<string,string|null>=new Map()):Detail1State|undefined {
 const state=map.physicalGrid;if(!state?.poiIdentities)return state;
 const live=poiNameLocators({regions:[...map.regions],waterPoiByKey:new Map(map.waterPoiByKey)},true);
 const identities=reconcileDetailPoiIdentities(live,state.poiIdentities,moves);
 // Retain compatibility with the earlier identity-only, unadapted checkpoint.
 if(!state.poiFootprints.length&&Object.keys(state.poiIdentities.byLegacyRef).length)return identities===state.poiIdentities?state:parseDetail1StateV11({...state,poiIdentities:identities});
 const byId=new Map(state.poiFootprints.map(p=>[p.poiId,p]));
 const footprints:DetailPoiFootprint[]=[];
 for(const [alias,id]of Object.entries(identities.byLegacyRef)){
  const prior=byId.get(id);
  if(!prior){footprints.push(buildLiveFootprint(map,rivers,identities,alias,state.grid.origin).footprint);continue;}
  if(prior.legacyRef!==alias){
   const coordinate=(ref:string)=>ref.slice(ref.lastIndexOf(':')+1);
   if(!prior.legacyRef||coordinate(prior.legacyRef)!==coordinate(alias)){
    // E8 retains its old road protections. Unknown manual/measured geography
    // and mandatory water/ports cannot be translated by an address change.
    if(prior.extent.kind!=='default'||prior.attachments.length)fail('extent_relocation_requires_explicit_adaptation');
    footprints.push(buildLiveFootprint(map,rivers,identities,alias,state.grid.origin).footprint);continue;
   }
  }
  // Expansion may assign an additional real path to an accepted site. Add
  // only that new access inside the existing shape; retain every old port.
  const source=parseWaterHex(alias.slice(alias.lastIndexOf(':')+1)),routes=assignedRoutes(map,source,state.grid.origin);
  // Generation can merge road records while retaining their physical segments.
  // Rebind only an identical live subdivision port, never mere proximity.
  const attachments=prior.attachments.map(ref=>{
   if(ref.kind!=='route')return ref;
   const samePort=(r:DetailRouteAccess)=>r.accessNodeId===ref.accessNodeId&&r.kind===ref.routeKind&&prior.cells.some(cell=>{
    const span=detailSegmentSpan(createDetailGrid(1,state.grid.origin),cell,r.segment);
    return span&&Math.hypot(span.from.x-ref.entry.x,span.from.y-ref.entry.y)<=1e-9;
   });
   if(routes.some(r=>r.routeId===ref.routeId&&samePort(r)))return ref;
   const exact=routes.find(samePort);
   return exact?{...ref,routeId:exact.routeId}:ref;
  }).filter((ref,index,all)=>ref.kind!=='route'||all.findIndex(a=>a.kind==='route'&&a.routeId===ref.routeId)===index);
  const attached=new Set(attachments.filter(a=>a.kind==='route').map(a=>a.routeId));
  for(const routeId of [...new Set(routes.map(r=>r.routeId))].sort())if(!attached.has(routeId)){
   const options=routes.filter(r=>r.routeId===routeId);
   let entry:Extract<DetailPoiFootprint['attachments'][number],{kind:'route'}>|undefined;
   for(const route of options){
    const span=prior.cells.map(cell=>detailSegmentSpan(createDetailGrid(1,state.grid.origin),cell,route.segment)).find(Boolean);
    if(span){entry={kind:'route',routeId,routeKind:route.kind,accessNodeId:route.accessNodeId,entry:span.from};break;}
   }
   if(!entry)fail('new_route_outside_accepted_footprint');attachments.push(entry!);
  }
  footprints.push(prior.legacyRef===alias&&attachments.length===prior.attachments.length&&attachments.every((a,i)=>a===prior.attachments[i])?prior:{...prior,legacyRef:alias,attachments});
 }
 const next=parseDetail1StateV11({...state,poiIdentities:identities,poiFootprints:footprints});
 validateDetailGeographyFootprints(map,rivers,next);
 return JSON.stringify(next)===JSON.stringify(parseDetail1StateV11(state))?state:next;
}

/** Validate saved extents and exact attachments against authoritative geometry. */
export function validateDetailGeographyFootprints(map:DetailGeographyMap,rivers:readonly DetailLiveRiver[],value:unknown):void {
 const state=parseDetail1StateV11(value),identities=state.poiIdentities;
 if(!identities)fail('saved_footprints_require_identities');
 if(state.source.physicalConvention!==(map.physicalGrid?.source.physicalConvention??'unknown'))fail('unproven_source_convention');
 const live=poiNameLocators({regions:[...map.regions],waterPoiByKey:new Map(map.waterPoiByKey)},true);
 assertDetailPoiOwners(identities!,live);
 if(state.poiFootprints.length!==live.size)fail('incomplete_footprint_coverage');
 const origin=state.grid.origin,fine=createDetailGrid(1,origin),coarse=createDetailGrid(6,origin);
 const close=(a:WorldPoint,b:WorldPoint)=>Math.hypot(a.x-b.x,a.y-b.y)<=1e-9;
 for(const footprint of state.poiFootprints){
  const alias=footprint.legacyRef;if(!alias||!live.has(alias))fail('unknown_footprint_owner');
  const parts=alias!.split(':'),water=alias!.startsWith('waterPoi:'),source=parseWaterHex(parts[water?1:2]);
  const region=water?undefined:map.regions.find(r=>r.id===Number(parts[1]));
  const kind=region&&hasCentralPoi(region)&&key(region.centerHex)===key(source)?region.centralPoiKind:region?.pointOfInterestKinds?.[key(source)];
  if(!water&&waterKindAt(map.hexTerrainByKey,key(source))!=='land')fail('land_poi_in_water');
  const capital=kind==='capital',extent=footprint.extent;
  if(extent.kind==='default'&&(extent.policy!==(capital?'capital_min_two':'one_cell')||capital&&footprint.cells.length<2||!capital&&footprint.cells.length!==1))fail('invalid_default_extent');
  if(extent.kind==='manual'&&capital&&footprint.cells.length<2)fail('capital_manual_needs_two_cells');
  let allowed:Set<string>;
  if(extent.kind==='default')allowed=new Set(detailPositiveAreaIntersections(fine,detailCellPolygon(coarse,source)).map(p=>key(p.cell)));
  else {
   // Explicit extents may cross source-cell/region boundaries, but must remain
   // on compatible accepted geography. A water POI retains its exact body.
   const coarseKeys=water?[...map.hexTerrainByKey.keys()].filter(k=>waterKindAt(map.hexTerrainByKey,k)!=='land'&&waterIdentity(map,k)===waterIdentity(map,key(source))):[...new Set(map.regions.flatMap(r=>r.hexes.map(key)))].filter(k=>waterKindAt(map.hexTerrainByKey,k)==='land');
   const compatible=new Set(coarseKeys);
   allowed=new Set(footprint.cells.filter(cell=>detailPositiveAreaIntersections(coarse,detailCellPolygon(fine,cell)).some(hit=>compatible.has(key(hit.cell)))).map(key));
  }
  if(footprint.cells.some(c=>!allowed.has(key(c))))fail('footprint_outside_compatible_geography');
  if(extent.kind==='measured_polygon'){
   assertSimpleExtentPolygon(extent.sourcePolygon);
   // sourcePolygon is expressed in fixed world miles. unit records the source
   // measurement provenance; it never changes stored world coordinate units.
   const expected=detailPositiveAreaIntersections(fine,extent.sourcePolygon).map(p=>key(p.cell)).sort(),actual=footprint.cells.map(key).sort();
   if(expected.length!==actual.length||expected.some((k,i)=>k!==actual[i]))fail('measured_extent_cell_mismatch');
  }
  const member=new Set(footprint.cells.map(key)),need=requirement(map,alias!,water);
  const accesses=waterAccesses(map,rivers,source,origin,water,need).filter(a=>member.has(key(a.cell)));
  const waterRefs=footprint.attachments.filter(a=>a.kind==='water');
  if(waterRefs.length!==(need.requirement==='none'?0:1))fail('invalid_water_attachment_count');
  for(const ref of waterRefs)if(!accesses.some(a=>a.waterId===ref.waterId&&a.segmentId===ref.segmentId&&a.kind===ref.waterKind&&close(a.contact,ref.contact)))fail('invalid_live_water_attachment');
  const routes=assignedRoutes(map,source,origin),ids=new Set(routes.map(r=>r.routeId)),refs=footprint.attachments.filter(a=>a.kind==='route');
  if(refs.length!==ids.size||new Set(refs.map(r=>r.routeId)).size!==ids.size)fail('incomplete_route_coverage');
  for(const ref of refs){
   if(!ids.has(ref.routeId)||!routes.some(r=>r.routeId===ref.routeId&&r.accessNodeId===ref.accessNodeId&&r.kind===ref.routeKind&&footprint.cells.some(cell=>{const span=detailSegmentSpan(fine,cell,r.segment);return span&&close(span.from,ref.entry);})))fail('invalid_live_route_attachment');
  }
 }
}


/** Reject ambiguous/self-crossing surveys before any clipping or state write. */
function assertSimpleExtentPolygon(input:readonly WorldPoint[]):void {
 const points=input.length>3&&input[0].x===input[input.length-1].x&&input[0].y===input[input.length-1].y?input.slice(0,-1):input;
 const cross=(a:WorldPoint,b:WorldPoint,c:WorldPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const on=(a:WorldPoint,b:WorldPoint,p:WorldPoint)=>Math.abs(cross(a,b,p))<=1e-10&&p.x>=Math.min(a.x,b.x)-1e-10&&p.x<=Math.max(a.x,b.x)+1e-10&&p.y>=Math.min(a.y,b.y)-1e-10&&p.y<=Math.max(a.y,b.y)+1e-10;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a.x-b.x,a.y-b.y)<1e-10)fail('invalid_survey_edge');
  for(let j=i+1;j<points.length;j++){
   if(j===i+1||i===0&&j===points.length-1)continue;
   const c=points[j],d=points[(j+1)%points.length],ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
   if(ab1*ab2<0&&cd1*cd2<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))fail('self_intersecting_survey');
  }
 }
}

/** Prepare one immutable extent edit. The live controller must commit this in
 * one document/history transaction; no import gate is lifted here. */
export function prepareDetailFootprintExtentEdit(map:DetailGeographyMap,rivers:readonly DetailLiveRiver[],value:unknown,poiId:string,extent:DetailExtent,cells?:readonly DetailCell[]):Detail1State {
 const state=parseDetail1StateV11(value);validateDetailGeographyFootprints(map,rivers,state);
 if(!state.poiFootprints.some(p=>p.poiId===poiId))fail('stale_extent_owner');
 if(extent.kind==='default')fail('extent_edit_requires_explicit_provenance');
 if(extent.kind==='measured_polygon')assertSimpleExtentPolygon(extent.sourcePolygon);
 const selected=extent.kind==='measured_polygon'?detailPositiveAreaIntersections(createDetailGrid(1,state.grid.origin),extent.sourcePolygon).map(p=>p.cell):cells??fail('manual_extent_requires_cells');
 const next=parseDetail1StateV11({...state,poiFootprints:state.poiFootprints.map(p=>p.poiId===poiId?{...p,extent,cells:selected}:p)});
 validateDetailGeographyFootprints(map,rivers,next);return next;
}
