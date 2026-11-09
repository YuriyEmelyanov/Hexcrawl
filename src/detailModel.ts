import {createDetailGrid,detailPolygonArea,validateDetailFootprint,type DetailCell,type DetailStep,type WorldPoint} from './detailGrid.ts';

export type DetailAttachmentRef=
  |Readonly<{kind:'water';waterKind:'shore'|'river'|'water'|'crossing'|'rapid'|'waterfall';waterId:string;segmentId:string;contact:WorldPoint}>
  |Readonly<{kind:'route';routeKind:'road'|'trail';routeId:string;accessNodeId:string;entry:WorldPoint}>;
export type DetailExtent=
  |Readonly<{kind:'default';reason:'unknown_size';policy:'one_cell'|'capital_min_two'}>
  |Readonly<{kind:'measured_polygon';sourceId:string;unit:'mile'|'meter';method:'positive_area_intersection';sourcePolygon:readonly WorldPoint[]}>
  |Readonly<{kind:'manual';basis:'conditional'|'measured_override';note:string}>;
export type DetailPoiFootprint=Readonly<{poiId:string;legacyRef:string|null;cells:readonly DetailCell[];extent:DetailExtent;attachments:readonly DetailAttachmentRef[]}>;
export type Detail1State=Readonly<{
  schema:'hexcrawl.detail1';version:1;active:true;
  grid:Readonly<{origin:WorldPoint;orientation:'pointy';convention:'across_flats'}>;
  source:Readonly<{stepMiles:6;physicalConvention:'known_across_flats'|'unknown';displayAssumption:'project_across_flats_6mi'}>;
  viewStep:DetailStep;poiFootprints:readonly DetailPoiFootprint[];
}>;
type Plain=Record<string,unknown>;
function object(value:unknown,label:string,keys:readonly string[]):Plain {
  if(!value||typeof value!=='object'||Array.isArray(value)) throw Error(`Invalid ${label}`);
  const actual=Object.keys(value).sort(),expected=[...keys].sort();
  if(actual.length!==expected.length||actual.some((key,index)=>key!==expected[index])) throw Error(`Unexpected ${label} fields`);
  return value as Plain;
}
function text(value:unknown,label:string):string {
  if(typeof value!=='string'||!value.trim()||value.length>512) throw Error(`Invalid ${label}`);return value;
}
function worldPoint(value:unknown,label:string):WorldPoint {
  const p=object(value,label,['x','y']);
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y)) throw Error(`Invalid ${label}`);
  return Object.freeze({x:p.x as number,y:p.y as number});
}
function cells(value:unknown):readonly DetailCell[] {
  if(!Array.isArray(value)) throw Error('Invalid footprint cells');
  const parsed=value.map((raw,index)=>{const c=object(raw,`footprint cell ${index}`,['q','r']);return Object.freeze({q:c.q as number,r:c.r as number});});
  validateDetailFootprint(parsed);return Object.freeze(parsed);
}
function extent(value:unknown):DetailExtent {
  if(!value||typeof value!=='object'||Array.isArray(value)) throw Error('Invalid extent');
  const kind=(value as Plain).kind;
  if(kind==='default') {const e=object(value,'default extent',['kind','reason','policy']);if(e.reason!=='unknown_size'||!['one_cell','capital_min_two'].includes(e.policy as string)) throw Error('Invalid default extent');return Object.freeze({kind,reason:'unknown_size',policy:e.policy as 'one_cell'|'capital_min_two'});}
  if(kind==='manual') {const e=object(value,'manual extent',['kind','basis','note']);if(!['conditional','measured_override'].includes(e.basis as string)) throw Error('Invalid manual extent');return Object.freeze({kind,basis:e.basis as 'conditional'|'measured_override',note:text(e.note,'manual extent note')});}
  if(kind==='measured_polygon') {
    const e=object(value,'measured extent',['kind','sourceId','unit','method','sourcePolygon']);
    if(!['mile','meter'].includes(e.unit as string)||e.method!=='positive_area_intersection'||!Array.isArray(e.sourcePolygon)||e.sourcePolygon.length<3) throw Error('Invalid measured extent');
    const sourcePolygon=Object.freeze(e.sourcePolygon.map((p,index)=>worldPoint(p,`source polygon point ${index}`)));
    if(!(detailPolygonArea(sourcePolygon)>Number.EPSILON)) throw Error('Measured extent has no positive area');
    return Object.freeze({kind,sourceId:text(e.sourceId,'extent source'),unit:e.unit as 'mile'|'meter',method:'positive_area_intersection',sourcePolygon});
  }
  throw Error('Unknown extent kind');
}
function attachment(value:unknown):DetailAttachmentRef {
  if(!value||typeof value!=='object'||Array.isArray(value)) throw Error('Invalid attachment');
  const kind=(value as Plain).kind;
  if(kind==='water') {const a=object(value,'water attachment',['kind','waterKind','waterId','segmentId','contact']);if(!['shore','river','water','crossing','rapid','waterfall'].includes(a.waterKind as string))throw Error('Invalid water attachment kind');return Object.freeze({kind,waterKind:a.waterKind as 'shore'|'river'|'water'|'crossing'|'rapid'|'waterfall',waterId:text(a.waterId,'water id'),segmentId:text(a.segmentId,'water segment id'),contact:worldPoint(a.contact,'water contact')});}
  if(kind==='route') {const a=object(value,'route attachment',['kind','routeKind','routeId','accessNodeId','entry']);if(!['road','trail'].includes(a.routeKind as string))throw Error('Invalid route attachment kind');return Object.freeze({kind,routeKind:a.routeKind as 'road'|'trail',routeId:text(a.routeId,'route id'),accessNodeId:text(a.accessNodeId,'access node id'),entry:worldPoint(a.entry,'route entry')});}
  throw Error('Unknown attachment kind');
}
/** Strict parser for the DETAIL1 section of an active v11 document. Reference
 * existence and water/route legality are checked during later App integration. */
export function parseDetail1StateV11(value:unknown):Detail1State {
  const root=object(value,'DETAIL1 state',['schema','version','active','grid','source','viewStep','poiFootprints']);
  if(root.schema!=='hexcrawl.detail1'||root.version!==1||root.active!==true||![1,6,12,24].includes(root.viewStep as number)||!Array.isArray(root.poiFootprints)) throw Error('Invalid DETAIL1 state');
  const rawGrid=object(root.grid,'DETAIL1 grid',['origin','orientation','convention']);
  if(rawGrid.orientation!=='pointy'||rawGrid.convention!=='across_flats') throw Error('Invalid DETAIL1 grid');
  const origin=worldPoint(rawGrid.origin,'DETAIL1 origin');createDetailGrid(root.viewStep as DetailStep,origin);
  const rawSource=object(root.source,'DETAIL1 source',['stepMiles','physicalConvention','displayAssumption']);
  if(rawSource.stepMiles!==6||!['known_across_flats','unknown'].includes(rawSource.physicalConvention as string)||rawSource.displayAssumption!=='project_across_flats_6mi') throw Error('Invalid DETAIL1 source');
  const ids=new Set<string>();
  const poiFootprints=Object.freeze(root.poiFootprints.map((raw,index)=>{
    const p=object(raw,`POI footprint ${index}`,['poiId','legacyRef','cells','extent','attachments']);
    const poiId=text(p.poiId,'POI id');if(ids.has(poiId)) throw Error('Duplicate POI identity');ids.add(poiId);
    if(p.legacyRef!==null) text(p.legacyRef,'legacy POI reference');
    if(!Array.isArray(p.attachments)) throw Error('Invalid attachments');
    const attachments=Object.freeze(p.attachments.map(attachment));
    const attachmentKeys=attachments.map(a=>a.kind==='water'?`water:${a.waterId}:${a.segmentId}`:`route:${a.routeId}:${a.accessNodeId}`);
    if(new Set(attachmentKeys).size!==attachmentKeys.length) throw Error('Duplicate attachment reference');
    return Object.freeze({poiId,legacyRef:p.legacyRef as string|null,cells:cells(p.cells),extent:extent(p.extent),attachments});
  }));
  return Object.freeze({schema:'hexcrawl.detail1',version:1,active:true,grid:Object.freeze({origin,orientation:'pointy',convention:'across_flats'}),source:Object.freeze({stepMiles:6,physicalConvention:rawSource.physicalConvention as 'known_across_flats'|'unknown',displayAssumption:'project_across_flats_6mi'}),viewStep:root.viewStep as DetailStep,poiFootprints});
}

export type LegacyDetailAdaptationPreview=Readonly<{
  schema:'hexcrawl.detail1-adaptation-preview';sourceVersion:number;sourcePhysicalConvention:'known_across_flats'|'unknown';
  proposedDisplayAssumption:'project_across_flats_6mi';origin:WorldPoint;requiresExplicitApply:true;activatesDetail1:false;
}>;
/** Creates an immutable preview only. Import/view never calls an apply path. */
export function prepareLegacyDetailAdaptation(input:Readonly<{sourceVersion:number;sourcePhysicalConvention:'known_across_flats'|'unknown';origin:WorldPoint}>):LegacyDetailAdaptationPreview {
  if(!Number.isSafeInteger(input.sourceVersion)||input.sourceVersion<2||input.sourceVersion>10) throw Error('Legacy preview requires v2-v10');
  if(!['known_across_flats','unknown'].includes(input.sourcePhysicalConvention)) throw Error('Unknown legacy source convention');
  const origin=worldPoint(input.origin,'legacy projection origin');
  return Object.freeze({schema:'hexcrawl.detail1-adaptation-preview',sourceVersion:input.sourceVersion,sourcePhysicalConvention:input.sourcePhysicalConvention,proposedDisplayAssumption:'project_across_flats_6mi',origin,requiresExplicitApply:true,activatesDetail1:false});
}

/** Live document boundary for D1. Until the live geometry adapter is connected,
 * fail closed on footprints rather than accepting unchecked spatial references.
 * No existing save is implicitly activated or assigned a physical convention. */
export function validateDetail1Document(value:unknown,saveVersion:number):void {
  if(value===undefined)return;
  if(saveVersion!==11)throw Error('Physical grid requires version11');
  const state=parseDetail1StateV11(value);
  if(state.poiFootprints.length)throw Error('DETAIL1 POI adaptation is not available in this checkpoint');
}
