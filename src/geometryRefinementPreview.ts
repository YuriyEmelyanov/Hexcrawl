/** Unmounted atomic composition. Candidate state is never applied or exported;
 * public16/history/UI and complete all-phase budgets remain separate gates. */
import {createRefinementWorkBudget} from './geometryRefinementWork.ts';
import {buildDetailGeographyPreview,type DetailGeographyMap,type DetailLiveRiver} from './detailGeography.ts';
import {refinementInputFingerprint} from './geometryRefinementFingerprint.ts';
import {parseDetail1StateV11} from './detailModel.ts';
import type {DetailCell,WorldPoint} from './detailGrid.ts';
import type {EditableRiver} from './manualRivers.ts';
import type {EditableRoad,EditableCrossing} from './manualRoads.ts';
import {normalizeRefinementRiverSource} from './geometryRefinementSource.ts';
import {prepareRefinementMouths} from './geometryRefinementMouths.ts';
import {prepareRefinementPoiRequests} from './geometryRefinementPoiSource.ts';
import {prepareRefinementPois} from './geometryRefinementPois.ts';
import {prepareRefinementRoads} from './geometryRefinementRoads.ts';
import {retainRefinementRivers} from './geometryRefinementRetention.ts';
type SourceMap=DetailGeographyMap&Readonly<{rivers:readonly EditableRiver[];roads:readonly EditableRoad[];crossings:readonly EditableCrossing[]}>;
type RiverPlan=Extract<ReturnType<typeof prepareRefinementMouths>,{status:'prepared'}>;
export function prepareRefinementGeographyPreview(input:Readonly<{map:SourceMap;liveRivers:readonly DetailLiveRiver[];riverPlan:RiverPlan;marks:Parameters<typeof normalizeRefinementRiverSource>[0]['marks'];origin:WorldPoint;landCells:readonly DetailCell[];lockedPoiIds?:ReadonlySet<string>;searchWorkBudget?:number;prepareWorkBudget?:number;expectedSourceFingerprint?:string;cancelled?:()=>boolean}>,sharedBudget?:ReturnType<typeof createRefinementWorkBudget>){
 let budget:ReturnType<typeof createRefinementWorkBudget>|undefined;
 const fail=(stage:string,refs:readonly string[])=>Object.freeze({status:'error' as const,code:'geography_conflict' as const,stage,refs:Object.freeze([...refs]),completeGeometryPlan:false as const,readyForApplication:false as const,...(budget?{workBudget:budget.snapshot()}:{})});
 let stage='source';
 try{
  budget=sharedBudget??createRefinementWorkBudget(input.prepareWorkBudget,input.cancelled);const control=budget,enter=(name:string)=>{stage=name;control.enter(name);};control.enter(stage);control.reserve({rivers:input.map.rivers,marks:{rapids:[...input.marks.rapids],waterfalls:[...input.marks.waterfalls]}});
  const cancelled=()=>input.cancelled?.()===true;
  if(cancelled())return fail(stage,['prepare_cancelled']);
  const source=normalizeRefinementRiverSource({rivers:input.map.rivers,marks:input.marks,origin:input.origin});
  if(source.status==='error')return fail(stage,source.refs);
  if(source.sourceSignature!==input.riverPlan.source.sourceSignature)return fail(stage,['stale_river_plan']);
  enter('footprints');control.reserve(input.map.physicalGrid??{regions:input.map.regions.map(r=>({id:r.id,hexes:r.hexes,points:r.pointsOfInterest})),liveRivers:input.liveRivers,roads:input.map.roads});if(!input.map.physicalGrid)control.charge(input.map.regions.reduce((n,r)=>n+r.pointsOfInterest.length+(r.centralPoiKind&&!r.isTract&&!r.suppressCentralPoi?1:0),input.map.waterPoiByKey.size)*128*(1+input.liveRivers.reduce((n,r)=>n+r.edges.length,0)+input.map.roads.reduce((n,r)=>n+r.segments.length,0)));
  if(input.map.physicalGrid&&(input.map.physicalGrid.grid.origin.x!==input.origin.x||input.map.physicalGrid.grid.origin.y!==input.origin.y))return fail(stage,['origin_mismatch']);
  const bootstrap=!input.map.physicalGrid,initial=bootstrap?buildDetailGeographyPreview(input.map,input.liveRivers,input.origin):null;
  const candidateState=parseDetail1StateV11(input.map.physicalGrid??{schema:'hexcrawl.detail1',version:3,active:true,viewStep:6,grid:initial!.grid,source:initial!.source,poiIdentities:initial!.poiIdentities,poiFootprints:initial!.poiFootprints,fineCellEdits:{}});
  if(cancelled())return fail(stage,['prepare_cancelled']);
  enter('fingerprint');const sourceFingerprint=refinementInputFingerprint(input,candidateState,control.charge);if(input.expectedSourceFingerprint!==undefined&&input.expectedSourceFingerprint!==sourceFingerprint)return fail(stage,['stale_source_fingerprint']);
  enter('poi_source');control.reserve(candidateState);control.charge(Object.keys(candidateState.poiIdentities?.byLegacyRef??{}).length*(1+input.map.regions.length));
  const needsCrossing=input.map.physicalGrid?.poiFootprints.some(f=>f.attachments.some(a=>a.kind==='water'&&a.waterKind==='crossing'))||candidateState.poiFootprints.some(f=>f.attachments.some(a=>a.kind==='water'&&a.waterKind==='crossing'));
  const lakes=input.riverPlan.lakes.flatMap(l=>Object.values(l.modes));
  const preliminary=needsCrossing?prepareRefinementRoads({roads:input.map.roads,crossings:input.map.crossings,sourceRivers:source.segments,rivers:input.riverPlan.paths,water:input.riverPlan.paintWater,origin:input.origin,landCells:input.landCells,lakes,searchWorkBudget:input.searchWorkBudget,cancelled:input.cancelled,consumeWork:control.charge}):undefined;
  if(preliminary?.status==='error')return fail(stage,preliminary.refs);
  const requests=prepareRefinementPoiRequests({map:{...input.map,physicalGrid:candidateState},sourceRivers:source.segments,lockedPoiIds:input.lockedPoiIds,riverPlan:input.riverPlan,crossings:preliminary?.crossings});
  if(requests.status==='error')return fail(stage,requests.refs);
  if(requests.pendingFeatures.length)return fail(stage,['feature_contact_pending',...requests.pendingFeatures.map(p=>p.footprint.poiId)]);
  if(cancelled())return fail(stage,['prepare_cancelled']);
  enter('pois');
  const pois=prepareRefinementPois({water:input.riverPlan.paintWater,origin:input.origin,requests:requests.requests,lakes,consumeWork:control.charge});
  if(pois.status==='error')return fail(stage,pois.refs);
  const byId=new Map(pois.pois.map(p=>[p.poiId,p.footprint])),footprints=Object.freeze(candidateState.poiFootprints.map(f=>byId.get(f.poiId)??f));
  if(cancelled())return fail(stage,['prepare_cancelled']);
  enter('roads');
  const roads=prepareRefinementRoads({roads:input.map.roads,crossings:input.map.crossings,sourceRivers:source.segments,rivers:input.riverPlan.paths,water:input.riverPlan.paintWater,origin:input.origin,landCells:input.landCells,lakes,poiMoves:pois.pois,footprints,searchWorkBudget:input.searchWorkBudget,cancelled:input.cancelled,consumeWork:control.charge});
  if(roads.status==='error')return fail(stage,roads.refs);
  if(cancelled())return fail(stage,['prepare_cancelled']);
  return Object.freeze({status:'prepared' as const,bootstrap,candidateState,sourceFingerprint,sourceFingerprintVersion:1 as const,sourceSignature:source.sourceSignature,rivers:input.riverPlan,requests,pois,footprints,roads,unresolved:requests.unresolved,completeGeometryPlan:false as const,readyForApplication:false as const,activation:false as const,workBudget:control.snapshot()});
 }catch(error){return fail(stage,[error instanceof Error?error.message:'invalid_geography_input']);}
}

/** One bounded unmounted preparation from supplied accepted hydrology to roads.
 * Hydrology construction and renderer-owned lake contour creation are inputs. */
export function prepareRefinementGeographyFromSource(input:Omit<Parameters<typeof prepareRefinementGeographyPreview>[0],'riverPlan'>&Readonly<{riverInput:Parameters<typeof prepareRefinementMouths>[0];riverContext:Parameters<typeof prepareRefinementMouths>[1];widths:Parameters<typeof prepareRefinementMouths>[2];lakeInputs:Parameters<typeof prepareRefinementMouths>[3];retainedRivers?:RiverPlan}>){
 let budget:ReturnType<typeof createRefinementWorkBudget>|undefined;
 try{
  budget=createRefinementWorkBudget(input.prepareWorkBudget??20000000,input.cancelled);budget.enter('river_mouth');
  budget.reserve({rivers:input.riverInput.rivers,cells:input.riverInput.cells,marks:{rapids:[...input.riverInput.marks.rapids],waterfalls:[...input.riverInput.marks.waterfalls]},candidates:input.riverContext.candidates,hydrology:input.riverContext.hydrology.network,lakes:input.lakeInputs,widths:[...input.widths]});
  const plan=prepareRefinementMouths({...input.riverInput,consumeWork:budget.charge},input.riverContext,input.widths,input.lakeInputs);
  if(plan.status==='error')return Object.freeze({...plan,stage:'river_mouth',workBudget:budget.snapshot(),readyForApplication:false as const});
  if(input.retainedRivers)budget.enter('retained_rivers');
  const retained=input.retainedRivers?retainRefinementRivers(input.retainedRivers,plan,input.widths,input.riverInput,budget.charge):plan;
  if(retained.status==='error')return Object.freeze({...retained,stage:'retained_rivers',readyForApplication:false as const});
  return prepareRefinementGeographyPreview({...input,riverPlan:retained},budget);
 }catch(error){return Object.freeze({status:'error' as const,code:'geography_conflict' as const,stage:'river_mouth',refs:Object.freeze([error instanceof Error?error.message:'invalid_geography_input']),...(budget?{workBudget:budget.snapshot()}:{}),completeGeometryPlan:false as const,readyForApplication:false as const});}
}
