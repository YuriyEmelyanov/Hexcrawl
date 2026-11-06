/** E7 detached administrative geometry. Water and local overrides are separate
 * layers and are deliberately not rewritten by these commands. */
import {parseWaterHex, waterHexKey, waterNeighbors, waterComponents, waterKindAt, type WaterHex, type WaterTerrain} from './manualWater.ts';
import {ownerKey, tagKey, assertTagCapacity, type TagState} from './tags/engine.ts';
import type {ToponymRegistry} from './toponyms.ts';

export type RegionEdit =
  | {type:'region_height';regionId:number;heightLevel:1|2|3;biomeId:string}
  | {type:'transfer_hex';hexKey:string;fromRegionId:number;toRegionId:number};
export type AdministrativeRegion = {
  id:number;hexes:WaterHex[];centerHex:WaterHex;anchorHex:WaterHex;
  heightLevel:1|2|3;biomeId:string;kingdomId?:number;finalSize:number;
  pointsOfInterest:WaterHex[];pointOfInterestKinds?:Record<string,string>;
  isCoastal?:boolean;
};
export type RegionEditPolicy<R extends AdministrativeRegion> = {
  biome:(id:string)=>({heightLevel:1|2|3}&Partial<R>)|undefined;
  compatible:(a:string,b:string)=>boolean;
  size:(count:number)=>Partial<R>;
  inKingdomArea:(kingdomId:number,hex:WaterHex)=>boolean;
};
export class RegionEditError extends Error {
  readonly code:string;readonly details:string[];
  constructor(code:string,...details:string[]){super([code,...details].join(':'));this.name='RegionEditError';this.code=code;this.details=details;}
}
const fail=(code:string,...details:string[]):never=>{throw new RegionEditError(code,...details);};
const positiveId=(id:number)=>Number.isSafeInteger(id)&&id>0;
const owns=(value:object,key:string)=>Object.prototype.hasOwnProperty.call(value,key);

function ownersOf<R extends AdministrativeRegion>(regions:readonly R[]):Map<string,R>{
  const owners=new Map<string,R>(),ids=new Set<number>();
  for(const r of regions){
    if(!positiveId(r.id)||ids.has(r.id))fail('ambiguous_region',String(r.id));ids.add(r.id);
    for(const h of r.hexes){const k=waterHexKey(h);parseWaterHex(k);if(owners.has(k))fail('ambiguous_hex_owner',k);owners.set(k,r);}
  }
  return owners;
}
/** Include both physical cells and both region IDs: an unchanged bad side may
 * be retained, but a new bad side between the same two regions cannot borrow it. */
function sides<R extends AdministrativeRegion>(owners:ReadonlyMap<string,R>){
  const result=new Map<string,[R,R]>();
  for(const [key,a] of owners)for(const n of waterNeighbors(key)){
    const b=owners.get(n);if(!b||a.id===b.id||key>=n)continue;
    result.set(JSON.stringify([key,n,a.id,b.id]),[a,b]);
  }
  return result;
}

export function prepareRegionGeometry<R extends AdministrativeRegion>(
  doc:{regions:R[];hexTerrainByKey:ReadonlyMap<string,WaterTerrain>},edit:RegionEdit,policy:RegionEditPolicy<R>
):{regions:R[];changedRegionIds:number[];poiTransfer?:{hexKey:string;fromRegionId:number;toRegionId:number}}{
  const unchanged={regions:doc.regions,changedRegionIds:[]};
  if(!edit||!['region_height','transfer_hex'].includes(edit.type))return fail('region_command');
  const id=edit.type==='region_height'?edit.regionId:edit.fromRegionId;
  const source=doc.regions.find(r=>r.id===id);
  if(!positiveId(id)||!source)fail('unknown_region',String(id));
  if(edit.type==='region_height'){
    if(!Number.isInteger(edit.heightLevel)||![1,2,3].includes(edit.heightLevel))fail('height_level');
    // Exact no-op preserves even an accepted legacy height/biome mismatch.
    if(source!.heightLevel===edit.heightLevel&&source!.biomeId===edit.biomeId)return unchanged;
    const biome=policy.biome(edit.biomeId);
    if(!biome||biome.heightLevel!==edit.heightLevel)fail('height_biome',String(id),edit.biomeId);
    const owners=ownersOf(doc.regions);
    for(const [a,b] of sides(owners).values()){
      if(a.id!==id&&b.id!==id)continue;
      const other=a.id===id?b:a;
      if(!policy.compatible(edit.biomeId,other.biomeId)||!policy.compatible(other.biomeId,edit.biomeId))fail('biome_compatibility',String(id),String(other.id));
    }
    // Only the explicit biome projection supplied by the caller is applied.
    const region={...source!,...biome,heightLevel:edit.heightLevel,biomeId:edit.biomeId};
    return {regions:doc.regions.map(r=>r===source?region:r),changedRegionIds:[id]};
  }
  parseWaterHex(edit.hexKey);
  const owners=ownersOf(doc.regions),actual=owners.get(edit.hexKey);
  if(actual!==source)fail('hex_owner',edit.hexKey,String(id));
  if(edit.toRegionId===id)return unchanged;
  const target=doc.regions.find(r=>r.id===edit.toRegionId);
  if(!positiveId(edit.toRegionId)||!target)fail('unknown_region',String(edit.toRegionId));
  if(source!.kingdomId!==target!.kingdomId)fail('kingdom_membership_change',String(id),String(target!.id));
  if(waterHexKey(source!.centerHex)===edit.hexKey)fail('protected_center',String(id),edit.hexKey);
  if(waterHexKey(source!.anchorHex)===edit.hexKey)fail('protected_anchor',String(id),edit.hexKey);
  if(!waterNeighbors(edit.hexKey).some(k=>owners.get(k)===target))fail('target_not_adjacent',String(target!.id),edit.hexKey);
  const moved=source!.hexes.find(h=>waterHexKey(h)===edit.hexKey)!;
  const sourceHexes=source!.hexes.filter(h=>waterHexKey(h)!==edit.hexKey),targetHexes=[...target!.hexes,moved];
  for(const [r,hexes] of [[source!,sourceHexes],[target!,targetHexes]] as const){
    if(!hexes.length)fail('empty_region',String(r.id));
    if(waterComponents(hexes.map(waterHexKey)).length!==1)fail('disconnected_region',String(r.id));
    if(r.kingdomId!==undefined&&!hexes.some(h=>policy.inKingdomArea(r.kingdomId!,h)))fail('outside_kingdom_area',String(r.id));
  }
  const sourcePoi=source!.pointsOfInterest.filter(h=>waterHexKey(h)===edit.hexKey);
  if(sourcePoi.length>1||target!.pointsOfInterest.some(h=>waterHexKey(h)===edit.hexKey)
    ||owns(target!.pointOfInterestKinds??{},edit.hexKey))fail('identity_conflict',edit.hexKey);
  const kind=source!.pointOfInterestKinds?.[edit.hexKey];
  if(kind!==undefined&&!sourcePoi.length)fail('identity_conflict',edit.hexKey);
  const kinds={...source!.pointOfInterestKinds};delete kinds[edit.hexKey];
  const finish=(r:R,hexes:WaterHex[]):R=>({...r,...policy.size(hexes.length),hexes,finalSize:hexes.length,
    isCoastal:hexes.some(h=>waterKindAt(doc.hexTerrainByKey,waterHexKey(h))==='sea'||waterNeighbors(waterHexKey(h)).some(k=>waterKindAt(doc.hexTerrainByKey,k)==='sea'))});
  const from=finish(source!,sourceHexes),to=finish(target!,targetHexes);
  if(sourcePoi.length){
    from.pointsOfInterest=source!.pointsOfInterest.filter(h=>waterHexKey(h)!==edit.hexKey);
    to.pointsOfInterest=[...target!.pointsOfInterest,...sourcePoi];
    if(source!.pointOfInterestKinds)from.pointOfInterestKinds=kinds;
    if(kind!==undefined)to.pointOfInterestKinds={...target!.pointOfInterestKinds,[edit.hexKey]:kind};
  }
  const regions=doc.regions.map(r=>r===source?from:r===target?to:r),beforeSides=sides(owners);
  for(const [key,[a,b]] of sides(ownersOf(regions))){
    if(beforeSides.has(key))continue;
    if(!policy.compatible(a.biomeId,b.biomeId)||!policy.compatible(b.biomeId,a.biomeId))fail('biome_compatibility',String(a.id),String(b.id));
  }
  return {regions,changedRegionIds:[id,target!.id],...(sourcePoi.length?{poiTransfer:{hexKey:edit.hexKey,fromRegionId:id,toRegionId:target!.id}}:{})};
}

/** Reparent complete authored records before any name/tag reconciliation. No
 * reroll or counter allocation; collisions reject the detached preparation. */
export function prepareRegionPoiIdentity(toponyms:ToponymRegistry,tags:TagState,move:{hexKey:string;fromRegionId:number;toRegionId:number}){
  const fromName=`settlement:${move.fromRegionId}:${move.hexKey}`,toName=`settlement:${move.toRegionId}:${move.hexKey}`;
  const fromOwner=`poi:${move.fromRegionId}:${move.hexKey}`,toOwner=`poi:${move.toRegionId}:${move.hexKey}`;
  if(move.fromRegionId===move.toRegionId)return {toponyms,tags};
  if(owns(toponyms,toName)||tags.instances.some(i=>ownerKey(i.owner)===toOwner)
    ||Object.keys(tags.rollCounters).some(k=>k.startsWith(toOwner+'|')))fail('identity_conflict',toOwner);
  const names=owns(toponyms,fromName)?Object.fromEntries(Object.entries(toponyms).map(([key,v])=>[key===fromName?toName:key,v])):toponyms;
  const instances=tags.instances.map(i=>ownerKey(i.owner)===fromOwner?{...i,owner:{kind:'poi' as const,regionId:move.toRegionId,hexKey:move.hexKey}}:i);
  const counters=Object.fromEntries(Object.entries(tags.rollCounters).map(([key,v])=>[key.startsWith(fromOwner+'|')?toOwner+key.slice(fromOwner.length):key,v]));
  const next={...tags,instances,rollCounters:counters};
  if(new Set(instances.map(i=>tagKey(i.owner,i.definitionId))).size!==instances.length)fail('identity_conflict',toOwner);
  assertTagCapacity(next);
  return {toponyms:names,tags:next};
}
