/** Unmounted POI candidate phase. Does not write accepted geography or roads. */
import {createDetailGrid,detailCellCenter,detailCellPolygon,detailPositiveAreaIntersections,worldToDetailCell,validateDetailFootprint,type DetailCell,type WorldPoint} from './detailGrid.ts';
import type {DetailPoiFootprint} from './detailModel.ts';
import type {DetailWaterProvenance} from './detailGeography.ts';
import {detailFootprintWorldAnchor,detailFootprintPolygons,detailFootprintHasOutline,detailPointInPolygon} from './detailSizes.ts';
import {refinementNearestRiverBank} from './geometryRefinementBanks.ts';
import type {RefinementWater} from './geometryRefinementWater.ts';
import type {RefinementShore} from './geometryRefinementShore.ts';
export type RefinementPoiRequest=Readonly<{footprint:DetailPoiFootprint;parent6:DetailCell;requirement:DetailWaterProvenance;riverRef?:Readonly<{riverId:number;sourceEdgeKey:string}>;side?:-1|1;locked?:boolean}>;
const freeze=<T>(a:T[])=>Object.freeze(a),fail=(refs:string[])=>Object.freeze({status:'error' as const,code:'poi_conflict' as const,refs:freeze(refs),completeGeometryPlan:false as const});
function immutable<T>(v:T):T{if(Array.isArray(v))return Object.freeze(v.map(immutable)) as T;if(v&&typeof v==='object')return Object.freeze(Object.fromEntries(Object.entries(v).map(([k,v])=>[k,immutable(v)]))) as T;return v;}
export function prepareRefinementPois(input:Readonly<{water:RefinementWater;origin:WorldPoint;requests:readonly RefinementPoiRequest[];lakes?:readonly RefinementShore[]}>){
 if(!Number.isFinite(input.origin.x)||!Number.isFinite(input.origin.y)||input.requests.length>4096)return fail(['poi_capacity']);
 const fine=createDetailGrid(1,input.origin),coarse=createDetailGrid(6,input.origin),seen=new Set<string>(),results:Readonly<{poiId:string;parent6:DetailCell;oldAnchor:WorldPoint;newAnchor:WorldPoint;footprint:DetailPoiFootprint;contact:NonNullable<Extract<ReturnType<typeof refinementNearestRiverBank>,{status:'prepared'}>['contact']>;provenance:DetailWaterProvenance;routeEntries:readonly Readonly<{routeId:string;accessNodeId:string;oldEntry:WorldPoint;newEntry:WorldPoint}>[]}>[]=[],unresolved:string[]=[],unchanged:string[]=[];
 for(const request of [...input.requests].sort((a,b)=>a.footprint.poiId.localeCompare(b.footprint.poiId))){
  const f={...request.footprint,cells:[...request.footprint.cells].sort((a,b)=>a.q-b.q||a.r-b.r),attachments:[...request.footprint.attachments].sort((a,b)=>{const key=(a:DetailPoiFootprint['attachments'][number])=>a.kind==='route'?`route:${a.routeId}:${a.accessNodeId}`:`water:${a.waterId}:${a.segmentId}`;return key(a).localeCompare(key(b));})},id=f.poiId;if(!id||seen.has(id))return fail([id,'duplicate_poi']);seen.add(id);
  try{validateDetailFootprint(f.cells);}catch{return fail([id,'invalid_footprint']);}
  if(request.requirement.provenance==='unknown'){unresolved.push(id);continue;}
  if(!['river','rapid','waterfall','crossing'].includes(request.requirement.requirement)){unchanged.push(id);continue;}
  // Feature-specific bank constraints need the adapted crossing/mark phase.
  if(request.requirement.requirement!=='river'||request.requirement.predicates.includes('river_start'))return fail([id,'feature_contact_pending']);
  const ref=request.riverRef;if(!ref)return fail([id,'missing_river_ref']);
  if(request.requirement.provenance!=='knave_source_row'||!request.requirement.predicates.includes('river_contact'))return fail([id,'inconsistent_requirement_provenance']);
  if(f.attachments.some(a=>a.kind==='water'&&a.waterId.startsWith('river:')&&(a.waterId!==`river:${ref.riverId}`||a.segmentId!==ref.sourceEdgeKey)))return fail([id,'foreign_river_attachment']);
  let parent:readonly WorldPoint[];try{parent=detailCellPolygon(coarse,request.parent6);}catch{return fail([id,'invalid_parent']);}
  const oldAnchor=detailFootprintWorldAnchor(f,fine),outlined=detailFootprintHasOutline(f,fine)||f.extent.kind==='manual'||f.extent.kind==='measured_polygon'||f.cells.length>1,fixed=request.locked||f.extent.kind==='measured_polygon'||('basis'in f.extent&&f.extent.basis==='measured_override');
  if(!Number.isFinite(oldAnchor.x)||!Number.isFinite(oldAnchor.y)||!detailPointInPolygon(oldAnchor,parent))return fail([id,'invalid_source_anchor']);
  if(f.legacyRef){const source=f.legacyRef.slice(f.legacyRef.lastIndexOf(':')+1);if(source!==`${request.parent6.q},${request.parent6.r}`)return fail([id,'source_parent_mismatch']);}
  const movable=!fixed,anchors=outlined?detailPositiveAreaIntersections(fine,parent).map(p=>p.cell):[];
  const base=f.cells[0];const shifts=outlined?[{q:0,r:0},...anchors.map(a=>({q:a.q-base.q,r:a.r-base.r}))]:[{q:0,r:0}];
  const ordered=[...new Map(shifts.map(s=>[`${s.q},${s.r}`,s])).values()].filter(s=>movable||s.q===0&&s.r===0).sort((a,b)=>{const ac=detailCellCenter(fine,a),bc=detailCellCenter(fine,b);const d=Math.hypot(ac.x-input.origin.x,ac.y-input.origin.y)-Math.hypot(bc.x-input.origin.x,bc.y-input.origin.y);return (Math.abs(d)>1e-9?d:0)||a.q-b.q||a.r-b.r;});
  if(f.cells.length>4096||ordered.length>128)return fail([id,'poi_capacity']);
  let selected:typeof results[number]|undefined;
  for(const shift of ordered){const v=detailCellCenter(fine,shift),delta={x:v.x-input.origin.x,y:v.y-input.origin.y},candidateAnchor={x:oldAnchor.x+delta.x,y:oldAnchor.y+delta.y},candidateCells=f.cells.map(c=>({q:c.q+shift.q,r:c.r+shift.r}));
   const candidate={...f,worldAnchor:candidateAnchor,cells:candidateCells},rawPolygons=outlined?detailFootprintPolygons(candidate,fine):[parent],polygons=outlined&&!rawPolygons.length?candidateCells.map(c=>detailCellPolygon(fine,c)):rawPolygons;
   if(outlined&&(!candidateCells.every(c=>detailCellPolygon(fine,c).every(p=>detailPointInPolygon(p,parent)))||!polygons.flat().every(p=>detailPointInPolygon(p,parent))))continue;
   const bank=refinementNearestRiverBank(input.water,{point:outlined?candidateAnchor:oldAnchor,parent6:request.parent6,origin:input.origin,...ref,side:request.side,...(outlined?{sideAnchor:candidateAnchor}:{}),allowedPolygons:polygons,lakes:input.lakes});if(bank.status==='error')return fail([id,...bank.refs]);if(!bank.contact)continue;
   const contact=bank.contact,newAnchor=outlined?candidateAnchor:contact.point;if(fixed&&Math.hypot(newAnchor.x-oldAnchor.x,newAnchor.y-oldAnchor.y)>1e-8)continue;
   const move={x:newAnchor.x-oldAnchor.x,y:newAnchor.y-oldAnchor.y},newCells=outlined?candidateCells:[worldToDetailCell(fine,newAnchor)],routeEntries=f.attachments.flatMap(a=>a.kind==='route'?[Object.freeze({routeId:a.routeId,accessNodeId:a.accessNodeId,oldEntry:immutable({...a.entry}),newEntry:Object.freeze({x:a.entry.x+move.x,y:a.entry.y+move.y})})]:[]);
   const attachments=f.attachments.map(a=>a.kind==='route'?Object.freeze({...a,entry:Object.freeze({x:a.entry.x+move.x,y:a.entry.y+move.y})}):a.kind==='water'&&a.waterId===`river:${ref.riverId}`?Object.freeze({...a,segmentId:ref.sourceEdgeKey,contact:contact.point}):a);
   if(!attachments.some(a=>a.kind==='water'&&a.waterId===`river:${ref.riverId}`))attachments.push(Object.freeze({kind:'water' as const,waterKind:'river' as const,waterId:`river:${ref.riverId}`,segmentId:ref.sourceEdgeKey,contact:contact.point}));
   selected=Object.freeze({poiId:id,parent6:Object.freeze({...request.parent6}),oldAnchor:Object.freeze({...oldAnchor}),newAnchor:Object.freeze({...newAnchor}),footprint:immutable({...f,worldAnchor:Object.freeze({...newAnchor}),cells:freeze(newCells.map(c=>Object.freeze(c))),attachments:freeze(attachments)}),contact,provenance:immutable(request.requirement),routeEntries:freeze(routeEntries)});break;
  }
  if(!selected)return fail([id,fixed?'locked_or_measured_contact_conflict':'no_same_parent_bank_placement']);results.push(selected);
 }
 return Object.freeze({status:'prepared' as const,pois:freeze(results),unresolved:freeze(unresolved),unchanged:freeze(unchanged),completeGeometryPlan:false as const});
}
