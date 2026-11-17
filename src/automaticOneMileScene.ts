import {prepareGeometryPlan,parseGeometryRefinement,type GeometryPlanInput} from './geometryPlan.ts';
import {buildDetailGeographyPreview} from './detailGeography.ts';
import {parseDetail1StateV11,type Detail1State} from './detailModel.ts';
import {prepareRefinementGeographyPreview} from './geometryRefinementPreview.ts';

/** Pure detached preparation shared by the controller and its worker. */
export function prepareAutomaticSceneCandidate(input:GeometryPlanInput):Detail1State {
 const plan=prepareGeometryPlan(input);
 if(plan.status==='error')throw Error(`${plan.stage}: ${plan.refs.join(', ')}`);
 let state=plan.candidateState;
 if(!state){
  const preview=buildDetailGeographyPreview(input.map,input.liveRivers,{x:0,y:0});
  state=parseDetail1StateV11({schema:'hexcrawl.detail1',version:3,active:true,viewStep:6,grid:preview.grid,source:preview.source,poiIdentities:preview.poiIdentities,poiFootprints:preview.poiFootprints,fineCellEdits:{}});
 }
 // Source collision envelopes stay unchanged. A required POI and its road
 // entries, however, must meet the narrower water that is actually drawn.
 // Reclose only the detached presentation, retaining every river path/port.
 const g=state.geometryRefinement;
 if(g?.pois.pois.length){
  const fullness=new Map(g.riverPlan.paths.map(p=>[JSON.stringify([p.riverId,p.sourceEdgeKey]),p.fullness]));
  const visible=(water:typeof g.riverPlan.water)=>({...water,capsules:water.capsules.map(c=>({...c,radius:fullness.get(JSON.stringify([c.riverId,c.sourceEdgeKey]))!/20}))});
  const riverPlan={...g.riverPlan,water:visible(g.riverPlan.water),paintWater:visible(g.riverPlan.paintWater)};
  const remaining=plan.status==='prepared'?plan.workBudget.remaining:(input.prepareWorkBudget??24000000);
  if(remaining<1)throw Error('prepare_incomplete_budget');
  const prepared=prepareRefinementGeographyPreview({...input,map:{...input.map,physicalGrid:g.sourceState},riverPlan,lockedPoiIds:new Set(g.lockedPoiIds),prepareWorkBudget:remaining});
  if(prepared.status==='error')throw Error(`${prepared.stage}: ${prepared.refs.join(', ')}`);
  const refinement=parseGeometryRefinement({...g,sourceFingerprint:prepared.sourceFingerprint,riverPlan,pois:prepared.pois,roads:prepared.roads,unresolved:prepared.unresolved},parseDetail1StateV11);
  state=parseDetail1StateV11({...state,poiFootprints:prepared.footprints,geometryRefinement:refinement});
 }
 return {...state,viewStep:1};
}
