/** Stable feature identity carried separately from a river's fine bank contact. */
import type {WorldPoint} from './detailGrid.ts';
import type {DetailWaterProvenance} from './detailGeography.ts';
import type {DetailPoiFootprint} from './detailModel.ts';
export type RefinementPoiFeature=Readonly<{kind:'rapid'|'waterfall'|'crossing'|'river_start';sourceRef:string;point?:WorldPoint;bankPoints?:readonly WorldPoint[]}>;
export function refinementPoiFeatureKind(r:DetailWaterProvenance):RefinementPoiFeature['kind']|null{
 return r.requirement==='river'&&r.predicates.includes('river_start')?'river_start':['rapid','waterfall','crossing'].includes(r.requirement)?r.requirement as 'rapid'|'waterfall'|'crossing':null;
}
export function refinementPoiRequirementValid(r:DetailWaterProvenance,f?:RefinementPoiFeature){
 if(r.provenance!=='knave_source_row')return false;const k=refinementPoiFeatureKind(r);
 if(!k)return r.requirement==='river'&&r.predicates.includes('river_contact')&&!f;
 return f?.kind===k&&!!f.sourceRef&&(k==='river_start'?r.predicates.includes('river_start'):k==='rapid'?r.predicates.includes('river_rapids'):k==='waterfall'?r.predicates.includes('river_waterfall'):r.predicates.some(p=>p.startsWith('crossing_')));
}
export function refinementPoiAttachmentMatches(a:DetailPoiFootprint['attachments'][number],riverId:number,edgeKey:string,f?:RefinementPoiFeature){
 return a.kind==='water'&&a.waterId===`river:${riverId}`&&(f?a.segmentId===f.sourceRef&&a.waterKind===(f.kind==='river_start'?'river':f.kind):a.segmentId===edgeKey&&a.waterKind==='river');
}
