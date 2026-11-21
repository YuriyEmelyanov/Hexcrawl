import {prepareGeometryPlan,parseGeometryRefinement,type GeometryPlanInput} from './geometryPlan.ts';
import {buildDetailGeographyPreview} from './detailGeography.ts';
import {parseDetail1StateV11,type Detail1State} from './detailModel.ts';
import {prepareRefinementGeographyPreview} from './geometryRefinementPreview.ts';

export class OneMileGeometryConflict extends Error {
 readonly stage:string;
 constructor(stage:string,refs:readonly string[]){
  super(`${stage}: ${refs.join(', ')}`);
  this.stage=stage;
 }
}

export function automaticSceneFailureMessage(error:unknown,language:'ru'|'en',fallback=false){
 const raw=error instanceof Error?error.message:String(error),ru=language==='ru';
 const owner=raw.match(/(detail-poi|river|lake):(\d+)/);
 const object=owner?`${owner[1]==='detail-poi'?(ru?'объект':'site'):owner[1]==='river'?(ru?'река':'river'):(ru?'озеро':'lake')} №${owner[2]}: `:'';
 const reason=/locked|measured/.test(raw)?(ru?'закреплённый объект нельзя разместить у видимого берега':'a fixed site cannot meet the visible bank'):
  /budget|capacity/.test(raw)?(ru?'достигнут предел подготовки этой карты':'this map exceeds the preparation limit'):
  /retained_choices/.test(raw)?(ru?'сохранённое русло несовместимо с новым представлением':'a retained river route is incompatible with this view'):
  /crossing|road/.test(raw)?(ru?'не удалось согласовать дорогу и переправу':'the road and crossing cannot be connected consistently'):
  /bank|contact|no[_ -]?fit/.test(raw)?(ru?'не найдено допустимое русло или место у берега':'no legal route or bank placement was found'):
  (ru?'геометрия исходной карты несовместима с одномильной сеткой':'the source geometry is incompatible with the one-mile grid');
 const summary=ru?'1-мильная карта не открылась.':'The 1-mile map did not open.';
 const detail=(ru?'Причина — ':'Reason — ')+object+reason+'.';
 return fallback ? summary+' '+detail : summary+' '+detail+' '+(ru?'Исходная карта сохранена.':'The source map is unchanged.');
}

/** Pure detached preparation shared by the controller and its worker. */
export function prepareAutomaticSceneCandidate(input:GeometryPlanInput):Detail1State {
 const plan=prepareGeometryPlan(input);
 if(plan.status==='error')throw new OneMileGeometryConflict(plan.stage,plan.refs);
 let state=plan.candidateState;
 if(!state){
  const preview=buildDetailGeographyPreview(input.map,input.liveRivers,input.origin);
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
  if(prepared.status==='error')throw new OneMileGeometryConflict(prepared.stage,prepared.refs);
  const refinement=parseGeometryRefinement({...g,sourceFingerprint:prepared.sourceFingerprint,riverPlan,pois:prepared.pois,roads:prepared.roads,unresolved:prepared.unresolved},parseDetail1StateV11);
  state=parseDetail1StateV11({...state,poiFootprints:prepared.footprints,geometryRefinement:refinement});
 }
 return {...state,viewStep:1};
}
