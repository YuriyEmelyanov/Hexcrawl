import {parseDetailPoiIdentities,assertDetailPoiOwners,type DetailPoiIdentities} from './detailIdentity.ts';
import {createDetailGrid,detailPolygonArea,detailCellCenter,detailCellPolygon,worldToDetailCell,validateDetailFootprint,type DetailCell,type DetailStep,type WorldPoint} from './detailGrid.ts';
import {detailCatalogueExtent,detailPointInPolygon,type DetailSizeNamespace} from './detailSizes.ts';

export type DetailAttachmentRef=
  |Readonly<{kind:'water';waterKind:'shore'|'river'|'water'|'crossing'|'rapid'|'waterfall';waterId:string;segmentId:string;contact:WorldPoint}>
  |Readonly<{kind:'route';routeKind:'road'|'trail';routeId:string;accessNodeId:string;entry:WorldPoint}>;
export type DetailExtent=
  |Readonly<{kind:'default';reason:'unknown_size';policy:'one_cell'|'capital_min_two'}>
  |Readonly<{kind:'measured_polygon';sourceId:string;unit:'mile'|'meter';method:'positive_area_intersection';sourcePolygon:readonly WorldPoint[]}>
  |Readonly<{kind:'manual';basis:'conditional'|'measured_override';note:string}>
  |Readonly<{kind:'representative';catalogueId:'POI-SIZE1';namespace:DetailSizeNamespace;typeId:string;representativeExtentMiles:number|null;basis:'project_assumption_not_measured'}>
  |Readonly<{kind:'manual_size';diameterMiles:number;basis:'conditional'|'measured_override';note:string}>;
export type DetailPoiFootprint=Readonly<{poiId:string;legacyRef:string|null;worldAnchor?:WorldPoint;cells:readonly DetailCell[];extent:DetailExtent;attachments:readonly DetailAttachmentRef[]}>;
export type Detail1State=Readonly<{
  schema:'hexcrawl.detail1';version:1|2;active:true;
  grid:Readonly<{origin:WorldPoint;orientation:'pointy';convention:'across_flats'}>;
  source:Readonly<{stepMiles:6;physicalConvention:'known_across_flats'|'unknown';displayAssumption:'project_across_flats_6mi'}>;
  poiIdentities?:DetailPoiIdentities;
  selectedCell?:DetailCell; // Stable one-mile address, independent of the current overview step.
  selectedWorldPoint?:WorldPoint; // Exact selection focus; a fine-cell address cannot reconstruct it.
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
  if(kind==='manual_size') {
    const e=object(value,'manual size',['kind','diameterMiles','basis','note']);
    if(!Number.isFinite(e.diameterMiles)||(e.diameterMiles as number)<=0||!['conditional','measured_override'].includes(e.basis as string))throw Error('Invalid manual size');
    return Object.freeze({kind,diameterMiles:e.diameterMiles as number,basis:e.basis as 'conditional'|'measured_override',note:text(e.note,'manual size note')});
  }
  if(kind==='representative') {
    const e=object(value,'representative extent',['kind','catalogueId','namespace','typeId','representativeExtentMiles','basis']);
    if(e.namespace!=='land'&&e.namespace!=='water')throw Error('Invalid size namespace');
    const expected=detailCatalogueExtent(e.namespace,text(e.typeId,'size type'));
    if(e.catalogueId!==expected.catalogueId||e.basis!==expected.basis||e.representativeExtentMiles!==expected.representativeExtentMiles)throw Error('Invalid size catalogue provenance');
    return expected;
  }
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
/** Strict parser for legacy DETAIL1 v1 and anchored size geometry v2. The
 * retained function name keeps existing import callers compatible; the outer
 * save gate requires v14 for size geometry. Spatial refs are checked separately. */
export function parseDetail1StateV11(value:unknown):Detail1State {
  const extra=['poiIdentities','selectedCell','selectedWorldPoint'].filter(k=>value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,k));
  const root=object(value,'DETAIL1 state',['schema','version','active','grid','source','viewStep','poiFootprints',...extra]);
  const poiIdentities=extra.includes('poiIdentities')?parseDetailPoiIdentities(root.poiIdentities):undefined;
  if(root.schema!=='hexcrawl.detail1'||![1,2].includes(root.version as number)||root.active!==true||![1,6,12,24].includes(root.viewStep as number)||!Array.isArray(root.poiFootprints)) throw Error('Invalid DETAIL1 state');
  const rawGrid=object(root.grid,'DETAIL1 grid',['origin','orientation','convention']);
  if(rawGrid.orientation!=='pointy'||rawGrid.convention!=='across_flats') throw Error('Invalid DETAIL1 grid');
  const origin=worldPoint(rawGrid.origin,'DETAIL1 origin');createDetailGrid(root.viewStep as DetailStep,origin);
  let selectedCell:DetailCell|undefined;
  if(extra.includes('selectedCell')){
    const c=object(root.selectedCell,'selected detail cell',['q','r']);
    selectedCell={q:c.q as number,r:c.r as number};detailCellCenter(createDetailGrid(1,origin),selectedCell);
    selectedCell=Object.freeze(selectedCell);
  }
  let selectedWorldPoint:WorldPoint|undefined;
  if(extra.includes('selectedWorldPoint')){
    if(root.version!==2||!selectedCell)throw Error('Selected world point requires DETAIL1 version2 and a selected cell');
    selectedWorldPoint=worldPoint(root.selectedWorldPoint,'selected world point');
    const cell=worldToDetailCell(createDetailGrid(1,origin),selectedWorldPoint);
    if(cell.q!==selectedCell.q||cell.r!==selectedCell.r)throw Error('Selected world point does not match selected cell');
  }
  const rawSource=object(root.source,'DETAIL1 source',['stepMiles','physicalConvention','displayAssumption']);
  if(rawSource.stepMiles!==6||!['known_across_flats','unknown'].includes(rawSource.physicalConvention as string)||rawSource.displayAssumption!=='project_across_flats_6mi') throw Error('Invalid DETAIL1 source');
  const ids=new Set<string>();
  const poiFootprints=Object.freeze(root.poiFootprints.map((raw,index)=>{
    const hasAnchor=!!raw&&typeof raw==='object'&&Object.prototype.hasOwnProperty.call(raw,'worldAnchor');
    const p=object(raw,`POI footprint ${index}`,['poiId','legacyRef','cells','extent','attachments',...(hasAnchor?['worldAnchor']:[])]);
    const worldAnchor=hasAnchor?worldPoint(p.worldAnchor,'POI world anchor'):undefined;
    if(worldAnchor)worldToDetailCell(createDetailGrid(1,origin),worldAnchor);
    const parsedExtent=extent(p.extent);
    const parsedCells=cells(p.cells);
    if(root.version===1&&(worldAnchor||parsedExtent.kind==='representative'||parsedExtent.kind==='manual_size'))throw Error('New size geometry requires DETAIL1 version2');
    if(root.version===2&&!worldAnchor)throw Error('DETAIL1 version2 requires world anchor');
    if(root.version===2&&parsedExtent.kind==='measured_polygon'&&!detailPointInPolygon(worldAnchor!,parsedExtent.sourcePolygon))throw Error('DETAIL1 anchor_outside_extent');
    if(root.version===2&&parsedExtent.kind==='manual'&&!parsedCells.some(cell=>detailPointInPolygon(worldAnchor!,detailCellPolygon(createDetailGrid(1,origin),cell))))throw Error('DETAIL1 anchor_outside_extent');
    const poiId=text(p.poiId,'POI id');if(ids.has(poiId)) throw Error('Duplicate POI identity');ids.add(poiId);
    if(p.legacyRef!==null) text(p.legacyRef,'legacy POI reference');
    if(!Array.isArray(p.attachments)) throw Error('Invalid attachments');
    const attachments=Object.freeze(p.attachments.map(attachment));
    const attachmentKeys=attachments.map(a=>a.kind==='water'?`water:${a.waterId}:${a.segmentId}`:`route:${a.routeId}:${a.accessNodeId}`);
    if(new Set(attachmentKeys).size!==attachmentKeys.length) throw Error('Duplicate attachment reference');
    return Object.freeze({...(worldAnchor?{worldAnchor}:{}),poiId,legacyRef:p.legacyRef as string|null,cells:parsedCells,extent:parsedExtent,attachments});
  }));
  if(poiIdentities)for(const p of poiFootprints)if(p.legacyRef===null||poiIdentities.byLegacyRef[p.legacyRef]!==p.poiId)throw Error('Footprint identity does not match POI binding');
  return Object.freeze({...(selectedCell?{selectedCell}:{}),...(selectedWorldPoint?{selectedWorldPoint}:{}),...(poiIdentities?{poiIdentities}:{}),schema:'hexcrawl.detail1',version:root.version as 1|2,active:true,grid:Object.freeze({origin,orientation:'pointy',convention:'across_flats'}),source:Object.freeze({stepMiles:6,physicalConvention:rawSource.physicalConvention as 'known_across_flats'|'unknown',displayAssumption:'project_across_flats_6mi'}),viewStep:root.viewStep as DetailStep,poiFootprints});
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

/** Full active document boundary. Legacy/unadapted maps have no physicalGrid;
 * an active layer, including an empty one, must cover every live POI owner. */
export function validateDetail1Document(value:unknown,saveVersion:number,liveAliases?:ReadonlySet<string>,validateSpatial?:(state:Detail1State)=>void):void {
  if(value===undefined)return;
  if(saveVersion!==11&&saveVersion!==14)throw Error('Physical grid requires a supported save version');
  const state=parseDetail1StateV11(value);
  if(saveVersion===11&&state.version!==1)throw Error('Size geometry requires save version14');
  if(state.poiIdentities&&liveAliases)assertDetailPoiOwners(state.poiIdentities,liveAliases);
  if(validateSpatial){validateSpatial(state);return;}
  if(state.poiFootprints.length||liveAliases?.size||Object.keys(state.poiIdentities?.byLegacyRef??{}).length)throw Error('DETAIL1 spatial validation is required');
}
