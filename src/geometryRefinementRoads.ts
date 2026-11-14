/** Unmounted source-incidence road/crossing candidates. No road generation,
 * accepted writes or active paint. Conflicts never return a partial network. */
import {createDetailGrid,detailCellCenter,detailCellPolygon,validateDetailFootprint,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {roadPair,type EditableRoad,type EditableCrossing} from './manualRoads.ts';
import {detailCrossingPoint} from './detailGeography.ts';
import type {NormalizedRefinementSource} from './geometryRefinementSource.ts';
import type {DetailPoiFootprint} from './detailModel.ts';
import {detailFootprintWorldAnchor,detailFootprintHasOutline,detailFootprintPolygons,detailPointInPolygon,detailSegmentPolygonEntry} from './detailSizes.ts';
import {prepareRefinementShoreCells,refinementShoreIntervals,refinementShoreContains,type RefinementShore} from './geometryRefinementShore.ts';
import {prepareRefinementDryRoadPath} from './geometryRefinementRoadSearch.ts';
import {refinementWaterIntervals,type RefinementWater} from './geometryRefinementWater.ts';
type River=Readonly<{riverId:number;sourceEdgeKey:string;fullness:number;points:readonly WorldPoint[]}>;
type PoiMove=Readonly<{poiId:string;parent6:DetailCell;oldAnchor:WorldPoint;newAnchor:WorldPoint;footprint:DetailPoiFootprint;routeEntries:readonly Readonly<{routeId:string;accessNodeId:string;oldEntry:WorldPoint;newEntry:WorldPoint}>[]}>;
type Input=Readonly<{roads:readonly EditableRoad[];crossings:readonly EditableCrossing[];sourceRivers:NormalizedRefinementSource['segments'];rivers:readonly River[];water:RefinementWater;origin:WorldPoint;landCells:readonly DetailCell[];lakes?:readonly RefinementShore[];poiMoves?:readonly PoiMove[];footprints?:readonly DetailPoiFootprint[];searchWorkBudget?:number;cancelled?:()=>boolean}>;
const EPS=1e-8,key=(c:DetailCell)=>`${c.q},${c.r}`,lexical=(a:string,b:string)=>a<b?-1:a>b?1:0,finite=(p:WorldPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y),distance=(a:WorldPoint,b:WorldPoint)=>Math.hypot(a.x-b.x,a.y-b.y),pair=(r:number,e:string)=>JSON.stringify([r,e]);
const fail=(refs:string[])=>Object.freeze({status:'error' as const,code:'road_conflict' as const,refs:Object.freeze(refs),completeGeometryPlan:false as const});
function immutable<T>(v:T):T{if(Array.isArray(v))return Object.freeze(v.map(immutable)) as T;if(v&&typeof v==='object')return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,v])=>[k,immutable(v)]))) as T;return v;}
function fraction(a:WorldPoint,b:WorldPoint,p:WorldPoint){const dx=b.x-a.x,dy=b.y-a.y;return ((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy);}
function onSegment(a:WorldPoint,b:WorldPoint,p:WorldPoint){const t=fraction(a,b,p),q={x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};return t>=-EPS&&t<=1+EPS&&distance(p,q)<EPS;}
function arcTable(points:readonly WorldPoint[]){const a=[0];for(let i=1;i<points.length;i++)a.push(a[i-1]+distance(points[i-1],points[i]));return a;}
function pointAt(points:readonly WorldPoint[],arcs:readonly number[],s:number){if(s<=EPS)return {...points[0]};if(s>=arcs[arcs.length-1]-EPS)return {...points[points.length-1]};const i=arcs.findIndex((a,i)=>i>0&&a>=s);const t=(s-arcs[i-1])/(arcs[i]-arcs[i-1]);return {x:points[i-1].x+t*(points[i].x-points[i-1].x),y:points[i-1].y+t*(points[i].y-points[i-1].y)};}
function rays(points:readonly WorldPoint[],i:number,t:number,p:WorldPoint){let a=t>EPS?i:i-1,b=t<1-EPS?i+1:i+2;while(a>=0&&distance(points[a],p)<EPS)a--;while(b<points.length&&distance(points[b],p)<EPS)b++;return a<0||b>=points.length?null:[{x:points[a].x-p.x,y:points[a].y-p.y},{x:points[b].x-p.x,y:points[b].y-p.y}];}
function transverse(a:WorldPoint[]|null,b:WorldPoint[]|null){if(!a||!b)return false;const angles=[...a.map(p=>({owner:0,angle:Math.atan2(p.y,p.x)})),...b.map(p=>({owner:1,angle:Math.atan2(p.y,p.x)}))].sort((a,b)=>a.angle-b.angle);return angles.every((v,i)=>v.owner!==angles[(i+1)%4].owner&&((angles[(i+1)%4].angle-v.angle+Math.PI*2)%(Math.PI*2))>1e-9);}
export function prepareRefinementRoadMasks(footprints:readonly DetailPoiFootprint[],origin:WorldPoint){
 if(!finite(origin)||footprints.length>4096)return fail(['mask_capacity']);const grid=createDetailGrid(1,origin),seen=new Set<string>(),masks:Readonly<{poiId:string;body:RefinementShore}>[]=[];
 for(const f of [...footprints].sort((a,b)=>lexical(a.poiId,b.poiId))){if(seen.has(f.poiId))return fail([f.poiId,'duplicate_mask_owner']);seen.add(f.poiId);try{validateDetailFootprint(f.cells);}catch{return fail([f.poiId,'invalid_mask_footprint']);}if(!detailFootprintHasOutline(f,grid))continue;const body=prepareRefinementShoreCells(f.cells,origin,1);if(body.status==='error')return fail([f.poiId,'invalid_mask']);masks.push(Object.freeze({poiId:f.poiId,body}));}
 return Object.freeze({status:'prepared' as const,masks:Object.freeze(masks),completeGeometryPlan:false as const});
}
/** Centerline query plus reusable exact mask bodies. The renderer must clip
 * the complete stroke/dash/rails by these bodies, not just trim this axis. */
export function refinementRoadMaskIntervals(masks:readonly Readonly<{poiId:string;body:RefinementShore}>[],query:Readonly<{from:WorldPoint;to:WorldPoint}>){
 if(!finite(query.from)||!finite(query.to)||distance(query.from,query.to)<EPS)return fail(['invalid_mask_query']);
 const spans:{a:number;b:number;poiId:string}[]=[];for(const mask of masks){const r=refinementShoreIntervals(mask.body,query);if(r.status==='error')return fail([mask.poiId,'invalid_mask_query']);for(const i of r.intervals)spans.push({a:i.startFraction,b:i.endFraction,poiId:mask.poiId});}
 const stops=[0,1,...spans.flatMap(s=>[s.a,s.b])].sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>1e-10),intervals=[];
 for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i],t=(a+b)/2,owners=[...new Set(spans.filter(s=>t>=s.a&&t<=s.b).map(s=>s.poiId))].sort(lexical);intervals.push(Object.freeze({startFraction:a,endFraction:b,visible:owners.length===0,poiIds:Object.freeze(owners)}));}
 return Object.freeze({status:'prepared' as const,intervals:Object.freeze(intervals),completeGeometryPlan:false as const});
}
export function prepareRefinementRoads(input:Input){
 if(!finite(input.origin)||input.roads.length>4096||input.crossings.length>4096||input.roads.reduce((n,r)=>n+r.segments.length,0)>24576)return fail(['road_capacity']);
 const source=new Map(input.sourceRivers.map(s=>[pair(s.riverId,s.edgeKey),s])),rivers=new Map<string,River>(),coarse=createDetailGrid(6,input.origin),fine=createDetailGrid(1,input.origin);
 for(const r of [...input.rivers].sort((a,b)=>a.riverId-b.riverId||lexical(a.sourceEdgeKey,b.sourceEdgeKey))){const k=pair(r.riverId,r.sourceEdgeKey),s=source.get(k);if(!s||rivers.has(k)||s.fullness!==r.fullness||r.points.length<2||r.points.some((p,i)=>!finite(p)||i>0&&distance(p,r.points[i-1])<EPS))return fail([r.sourceEdgeKey,'stale_river']);rivers.set(k,r);}
 if(source.size!==input.sourceRivers.length||rivers.size!==source.size)return fail(['missing_or_duplicate_refined_river']);
 for(const c of input.water.capsules){const r=rivers.get(pair(c.riverId,c.sourceEdgeKey));if(!r||!r.points[c.stepIndex+1]||distance(r.points[c.stepIndex],c.from)>EPS||distance(r.points[c.stepIndex+1],c.to)>EPS)return fail([c.sourceEdgeKey,'stale_water_ref']);}
 const land=prepareRefinementShoreCells(input.landCells,input.origin);if(land.status==='error')return fail(['invalid_land']);
 const moved=new Map<string,PoiMove>(),seenPois=new Set<string>();
 for(const p of [...(input.poiMoves??[])].sort((a,b)=>lexical(a.poiId,b.poiId))){if(seenPois.has(p.poiId)||!finite(p.oldAnchor)||!finite(p.newAnchor)||p.footprint.poiId!==p.poiId)return fail([p.poiId,'invalid_poi_move']);seenPois.add(p.poiId);if(![p.parent6.q,p.parent6.r].every(Number.isSafeInteger)||!detailPointInPolygon(p.oldAnchor,detailCellPolygon(coarse,p.parent6))||!detailPointInPolygon(p.newAnchor,detailCellPolygon(coarse,p.parent6))||distance(detailFootprintWorldAnchor(p.footprint,fine),p.newAnchor)>EPS)return fail([p.poiId,'stale_poi_parent_or_anchor']);if(distance(p.oldAnchor,p.newAnchor)<EPS)continue;if(moved.has(key(p.parent6)))return fail([p.poiId,'ambiguous_poi_node']);moved.set(key(p.parent6),p);}
 const allFootprints=new Map((input.footprints??[]).map(f=>[f.poiId,f]));if(allFootprints.size!==(input.footprints??[]).length)return fail(['duplicate_footprint_owner']);for(const p of input.poiMoves??[])allFootprints.set(p.poiId,p.footprint);
 const masks=prepareRefinementRoadMasks([...allFootprints.values()],input.origin);if(masks.status==='error')return masks;
 const roadIds=new Set<number>(),parts:{roadId:number;regionId:number;sourceRoadSegmentKey:string;kind:'road'|'trail';fromNode:string;toNode:string;sourceFrom:WorldPoint;sourceTo:WorldPoint;points:WorldPoint[];linkedPoiIds:string[];usedPorts:string[]}[]=[],partKeys=new Set<string>();
 const node=(cell:DetailCell)=>moved.get(key(cell))?.newAnchor??detailCellCenter(coarse,cell),usedPorts=new Set<string>();
 for(const road of [...input.roads].sort((a,b)=>a.id-b.id)){if(!Number.isSafeInteger(road.id)||road.id<1||roadIds.has(road.id)||!Number.isSafeInteger(road.regionId)||road.regionId<1)return fail([`road:${road.id}`,'invalid_road']);roadIds.add(road.id);
  for(const segment of [...road.segments].sort((a,b)=>lexical(roadPair(a.from,a.to),roadPair(b.from,b.to)))){let from=segment.from,to=segment.to;if(lexical(key(from),key(to))>0)[from,to]=[to,from];
   if(![from.q,from.r,to.q,to.r].every(Number.isSafeInteger)||key(from)===key(to)||!['road','trail'].includes(segment.kind))return fail([`road:${road.id}`,'invalid_source_part']);
   const sourceRoadSegmentKey=roadPair(from,to),partKey=pair(road.id,sourceRoadSegmentKey);if(partKeys.has(partKey))return fail([partKey,'duplicate_source_part']);partKeys.add(partKey);
   const sourceFrom=detailCellCenter(coarse,from),sourceTo=detailCellCenter(coarse,to),a=node(from),b=node(to),linkedPoiIds:string[]=[],ports:string[]=[],waypoints:WorldPoint[]=[a];
   const entry=(cell:DetailCell,opposite:WorldPoint)=>{const p=moved.get(key(cell));if(!p)return null;linkedPoiIds.push(p.poiId);const matches=p.routeEntries.filter(e=>e.routeId===`road:${road.id}`&&e.accessNodeId.startsWith(`port:${sourceRoadSegmentKey}:`));if(matches.length>1)throw Error('ambiguous_route_entry');
    const polygons=detailFootprintPolygons(p.footprint,fine),inside=(point:WorldPoint)=>!polygons.length||polygons.some(poly=>detailPointInPolygon(point,poly));
    if(matches[0]){const e=matches[0];if(!onSegment(sourceFrom,sourceTo,e.oldEntry)||!finite(e.newEntry)||!inside(e.newEntry))throw Error('stale_or_outside_route_entry');const k=JSON.stringify([p.poiId,e.routeId,e.accessNodeId]);usedPorts.add(k);ports.push(k);return e.newEntry;}
    if(!polygons.length)return p.newAnchor;const query={from:opposite,to:p.newAnchor},choices=polygons.map(poly=>detailSegmentPolygonEntry(query,poly)).filter((p):p is WorldPoint=>p!==null).sort((a,b)=>fraction(query.from,query.to,a)-fraction(query.from,query.to,b));if(!choices[0])throw Error('no_footprint_entry');return choices[0];};
   try{const first=entry(from,b),last=entry(to,a);if(first)waypoints.push(first);if(last)waypoints.push(last);waypoints.push(b);}catch(error){return fail([partKey,error instanceof Error?error.message:'route_entry']);}
   const points:WorldPoint[]=[];for(const point of waypoints)if(!points.length||distance(point,points[points.length-1])>EPS)points.push({...point});if(points.length<2||points.some(p=>!finite(p)))return fail([partKey,'collapsed_road']);
   parts.push({roadId:road.id,regionId:road.regionId,sourceRoadSegmentKey,kind:segment.kind,fromNode:key(from),toNode:key(to),sourceFrom,sourceTo,points,linkedPoiIds,usedPorts:ports});
  }
 }
 for(const p of moved.values())for(const e of p.routeEntries)if(!usedPorts.has(JSON.stringify([p.poiId,e.routeId,e.accessNodeId])))return fail([p.poiId,e.accessNodeId,'missing_source_approach']);
 const stepCount=input.rivers.reduce((n,r)=>n+r.points.length-1,0);if(stepCount>24576||parts.reduce((n,p)=>n+p.points.length-1,0)*(stepCount+land.loops.reduce((n,l)=>n+l.length,0)+(input.lakes??[]).reduce((n,b)=>n+b.loops.reduce((n,l)=>n+l.length,0),0)+masks.masks.reduce((n,m)=>n+m.body.loops.reduce((n,l)=>n+l.length,0),0))>2000000)return fail(['road_intersection_capacity']);
 const seenCrossings=new Set<string>();for(const c of input.crossings){if(seenCrossings.has(c.key)||!partKeys.has(pair(c.roadId,c.roadSegmentKey))||!source.has(pair(c.riverId,c.riverEdgeKey))||!['bridge','ford','ferry'].includes(c.kind))return fail([c.key,'invalid_source_crossing']);seenCrossings.add(c.key);if(c.kind==='ford'&&source.get(pair(c.riverId,c.riverEdgeKey))!.fullness>2)return fail([c.key,'ford_fullness']);}
 let searchWork=0;const searchBudget=input.searchWorkBudget??2000000;
 if(!Number.isSafeInteger(searchBudget)||searchBudget<1)return fail(['invalid_search_budget']);
 for(const part of parts){
  if(!part.linkedPoiIds.length||input.crossings.some(c=>c.roadId===part.roadId&&c.roadSegmentKey===part.sourceRoadSegmentKey))continue;
  const adapted:WorldPoint[]=[];
  for(let i=1;i<part.points.length;i++){
   if(searchWork>=searchBudget)return fail([pair(part.roadId,part.sourceRoadSegmentKey),'search_incomplete_budget']);
   const route=prepareRefinementDryRoadPath({from:part.points[i-1],to:part.points[i],original:[part.sourceFrom,part.sourceTo],land,lakes:input.lakes??[],water:input.water,maxWork:searchBudget-searchWork,cancelled:input.cancelled});searchWork+=route.work;
   if(route.status==='error')return fail([pair(part.roadId,part.sourceRoadSegmentKey),route.code]);
   adapted.push(...route.points.slice(adapted.length?1:0));
  }
  part.points=adapted;
 }
 const results=[],crossingResults=[];
 for(const p of parts){const ref=pair(p.roadId,p.sourceRoadSegmentKey),arcs=arcTable(p.points),total=arcs[arcs.length-1],expected=input.crossings.filter(c=>c.roadId===p.roadId&&c.roadSegmentKey===p.sourceRoadSegmentKey).map(c=>{const s=source.get(pair(c.riverId,c.riverEdgeKey))!,point=detailCrossingPoint({from:p.sourceFrom,to:p.sourceTo},{from:s.from.point,to:s.to.point});return {c,s,point,t:point?fraction(p.sourceFrom,p.sourceTo,point):NaN};});
  if(expected.some(e=>!e.point))return fail([ref,'stale_source_crossing_position']);expected.sort((a,b)=>a.t-b.t||lexical(a.c.key,b.c.key));
  const wet:{a:number;b:number;contributors:{riverId:number;sourceEdgeKey:string;stepIndex:number}[]}[]=[],hits:{point:WorldPoint;distance:number;riverId:number;sourceEdgeKey:string;fullness:number;roadIndex:number;roadFraction:number;riverIndex:number;riverFraction:number;river:River}[]=[];
  for(let i=1;i<p.points.length;i++){const query={from:p.points[i-1],to:p.points[i]},span=arcs[i]-arcs[i-1],dry=refinementShoreIntervals(land,query);if(dry.status==='error'||dry.intervals.length!==1||!dry.intervals[0].startClipped||!dry.intervals[0].endClipped)return fail([ref,'candidate_outside_generated_land']);
   for(const lake of input.lakes??[]){const clip=refinementShoreIntervals(lake,query);if(clip.status==='error')return fail([ref,'invalid_lake']);if(clip.intervals.some(v=>(v.endFraction-v.startFraction)*span>EPS))return fail([ref,'candidate_crosses_lake']);}
   const intervals=refinementWaterIntervals(input.water,query);if(intervals.status==='error')return fail([ref,'invalid_water_query']);for(const w of intervals.intervals)if((w.endFraction-w.startFraction)*span>EPS)wet.push({a:arcs[i-1]+w.startFraction*span,b:arcs[i-1]+w.endFraction*span,contributors:[...w.contributors]});
   for(const river of rivers.values())for(let j=1;j<river.points.length;j++){const hit=detailCrossingPoint(query,{from:river.points[j-1],to:river.points[j]});if(!hit)continue;const t=fraction(query.from,query.to,hit),u=fraction(river.points[j-1],river.points[j],hit);if(!transverse(rays(p.points,i-1,t,hit),rays(river.points,j-1,u,hit)))continue;
    const d=arcs[i-1]+t*span;if(!hits.some(h=>h.riverId===river.riverId&&h.sourceEdgeKey===river.sourceEdgeKey&&Math.abs(h.distance-d)<EPS))hits.push({point:hit,distance:d,riverId:river.riverId,sourceEdgeKey:river.sourceEdgeKey,fullness:river.fullness,roadIndex:i-1,roadFraction:t,riverIndex:j-1,riverFraction:u,river});}
  }
  wet.sort((a,b)=>a.a-b.a||a.b-b.b);const union:typeof wet=[];for(const row of wet){const old=union[union.length-1];if(old&&row.a<=old.b+EPS){old.b=Math.max(old.b,row.b);old.contributors.push(...row.contributors);}else union.push({...row,contributors:[...row.contributors]});}
  const crossings=[];
  for(const w of union){if(w.a<EPS||w.b>total-EPS)return fail([ref,'water_clipped_road_endpoint']);const candidates=hits.filter(h=>h.distance>=w.a-EPS&&h.distance<=w.b+EPS);if(candidates.length!==1)return fail([ref,'non_transverse_or_multiple_water_contact']);const h=candidates[0],matches=expected.filter(e=>e.c.riverId===h.riverId&&e.c.riverEdgeKey===h.sourceEdgeKey);if(matches.length!==1||w.contributors.some(c=>c.riverId!==h.riverId))return fail([ref,'untyped_water_intersection']);const old=matches[0];
   const entry=pointAt(p.points,arcs,w.a),exit=pointAt(p.points,arcs,w.b),roadPath=[entry,...p.points.filter((_,i)=>arcs[i]>w.a+EPS&&arcs[i]<w.b-EPS),exit],tangents=[];for(let j=1;j<h.river.points.length;j++)if(onSegment(h.river.points[j-1],h.river.points[j],h.point)){const n=distance(h.river.points[j-1],h.river.points[j]);tangents.push({x:(h.river.points[j].x-h.river.points[j-1].x)/n,y:(h.river.points[j].y-h.river.points[j-1].y)/n});}
   crossings.push({...old.c,sourcePoint:old.point!,point:h.point,fullness:h.fullness,roadDistance:h.distance,roadFraction:h.distance/total,roadPieceIndex:h.roadIndex,roadTangent:{x:(p.points[h.roadIndex+1].x-p.points[h.roadIndex].x)/(arcs[h.roadIndex+1]-arcs[h.roadIndex]),y:(p.points[h.roadIndex+1].y-p.points[h.roadIndex].y)/(arcs[h.roadIndex+1]-arcs[h.roadIndex])},riverTangents:tangents,bankEntry:entry,bankExit:exit,bankPath:roadPath,wetStart:w.a,wetEnd:w.b});
  }
  crossings.sort((a,b)=>a.roadDistance-b.roadDistance||lexical(a.key,b.key));if(crossings.length!==expected.length||crossings.some((c,i)=>c.key!==expected[i].c.key))return fail([ref,'crossing_order_or_count_changed']);
  const paint=[];for(let i=1;i<p.points.length;i++){const q={from:p.points[i-1],to:p.points[i]},span=arcs[i]-arcs[i-1],cut=refinementRoadMaskIntervals(masks.masks,q);if(cut.status==='error')return cut;const stops=[arcs[i-1],arcs[i],...crossings.flatMap(c=>[c.wetStart,c.wetEnd]).filter(s=>s>arcs[i-1]&&s<arcs[i]),...cut.intervals.flatMap(c=>[arcs[i-1]+c.startFraction*span,arcs[i-1]+c.endFraction*span])].sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>EPS);
   for(let j=1;j<stops.length;j++){const a=stops[j-1],b=stops[j],mid=(a+b)/2,point=pointAt(p.points,arcs,mid),owners=masks.masks.filter(m=>refinementShoreContains(m.body,point)).map(m=>m.poiId),crossing=crossings.find(c=>mid>=c.wetStart&&mid<=c.wetEnd);paint.push({from:pointAt(p.points,arcs,a),to:pointAt(p.points,arcs,b),visible:owners.length===0&&crossing?.kind!=='ferry',poiMaskIds:owners,crossingKey:crossing?.key??null,waterKind:crossing?.kind??null});}
  }
  results.push({...p,sourceFrom:{...p.sourceFrom},sourceTo:{...p.sourceTo},adapted:p.linkedPoiIds.length>0,crossingKeys:crossings.map(c=>c.key),paint});crossingResults.push(...crossings);
 }
 return immutable({status:'prepared' as const,roads:results,crossings:crossingResults,masks:masks.masks,allocation:'source_incidence_with_dry_visibility_search' as const,searchWork,searchScope:'moved_POI_parts_without_typed_crossings' as const,completeGeometryPlan:false as const});
}
