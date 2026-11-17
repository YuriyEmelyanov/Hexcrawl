import {prepareGeometryPlan,type GeometryPlanInput} from './geometryPlan.ts';
import {buildDetailGeographyPreview} from './detailGeography.ts';
import {parseDetail1StateV11,type Detail1State} from './detailModel.ts';

/** Pure detached preparation shared by the controller and its worker. */
export function prepareAutomaticSceneCandidate(input:GeometryPlanInput):Detail1State {
 const plan=prepareGeometryPlan(input);
 if(plan.status==='error')throw Error(`${plan.stage}: ${plan.refs.join(', ')}`);
 let state=plan.candidateState;
 if(!state){
  const preview=buildDetailGeographyPreview(input.map,input.liveRivers,{x:0,y:0});
  state=parseDetail1StateV11({schema:'hexcrawl.detail1',version:3,active:true,viewStep:6,grid:preview.grid,source:preview.source,poiIdentities:preview.poiIdentities,poiFootprints:preview.poiFootprints,fineCellEdits:{}});
 }
 return {...state,viewStep:1};
}
