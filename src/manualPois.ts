/** E8 detached POI relocation. Storage locators change; accepted payloads do not.
 * No generators, ambient RNG, React or history setters are used here. */
import {parseWaterHex,waterHexKey,waterKindAt,type WaterHex,type WaterTerrain} from './manualWater.ts';
import {ownerKey,tagKey,assertTagCapacity,type TagState} from './tags/engine.ts';
import type {ToponymRegistry,NamePair} from './toponyms.ts';
export type EditorNames=Record<string,NamePair>;
export type PoiRegion={id:number;hexes:WaterHex[];centerHex:WaterHex;centralPoiKind?:string;suppressCentralPoi?:boolean;isTract?:boolean;kingdomId?:number;biomeLandType:'wild'|'settled';pointsOfInterest:WaterHex[];pointOfInterestKinds?:Record<string,string>};
export type PoiLocator={kind:'land';regionId:number;hexKey:string}|{kind:'water';hexKey:string};
export type PoiMove={source:PoiLocator;targetKey:string};
export type PoiDocument={regions:PoiRegion[];hexTerrainByKey:ReadonlyMap<string,WaterTerrain>;waterPoiByKey:Map<string,string>;roads:{id:number;segments:{from:WaterHex;to:WaterHex}[]}[];toponyms:ToponymRegistry;tags:TagState;editorNames:EditorNames};
export type PoiPolicy={mode:'classic'|'mythic';landKinds:(region:PoiRegion)=>readonly string[];waterKinds:(context:'sea'|'wild'|'settled')=>readonly string[];inKingdomArea:(id:number,hex:WaterHex)=>boolean};
export class PoiMoveError extends Error {
  readonly code:string;readonly details:string[];
  constructor(code:string,...details:string[]){super([code,...details].join(':'));this.name='PoiMoveError';this.code=code;this.details=details;}
}
const fail=(code:string,...details:string[]):never=>{throw new PoiMoveError(code,...details);};
const owns=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k);
export const poiLocatorKey=(l:PoiLocator)=>l.kind==='water'?`waterPoi:${l.hexKey}`:`poi:${l.regionId}:${l.hexKey}`;
const central=(r:PoiRegion)=>!!r.centralPoiKind&&!r.suppressCentralPoi&&!r.isTract;
function owners(regions:readonly PoiRegion[]){
  const result=new Map<string,PoiRegion>(),ids=new Set<number>();
  for(const r of regions){
    if(!Number.isSafeInteger(r.id)||r.id<1||ids.has(r.id))fail('ambiguous_region',String(r.id));ids.add(r.id);
    for(const h of r.hexes){const k=waterHexKey(h);parseWaterHex(k);if(result.has(k))fail('ambiguous_hex_owner',k);result.set(k,r);}
  }return result;
}
function occurrences(doc:PoiDocument,k:string){
  return doc.regions.reduce((n,r)=>n+r.pointsOfInterest.filter(h=>waterHexKey(h)===k).length+(central(r)&&waterHexKey(r.centerHex)===k?1:0),0)+(doc.waterPoiByKey.has(k)?1:0);
}
/** Enumerate live POI name addresses, without manufacturing settlement entities. */
export function poiNameLocators(doc:Pick<PoiDocument,'regions'|'waterPoiByKey'>):Set<string>{
  // A storage address may name exactly one physical object. Do not collapse
  // central/ordinary duplicates into one apparently valid name target.
  const counts=new Map<string,number>(),add=(key:string)=>counts.set(key,(counts.get(key)??0)+1);
  for(const r of doc.regions){
    for(const h of r.pointsOfInterest)add(`poi:${r.id}:${waterHexKey(h)}`);
    if(central(r))add(`poi:${r.id}:${waterHexKey(r.centerHex)}`);
  }
  for(const k of doc.waterPoiByKey.keys())add(`waterPoi:${k}`);
  return new Set([...counts].filter(([,count])=>count===1).map(([key])=>key));
}
export function assertPoiEditorNames(value:unknown,live:ReadonlySet<string>):asserts value is EditorNames {
  if(!value||typeof value!=='object'||Array.isArray(value))fail('invalid_editor_names');
  for(const [key,pair]of Object.entries(value as Record<string,unknown>)){
    if(!live.has(key)||!pair||typeof pair!=='object'||Array.isArray(pair))fail('invalid_editor_name',key);
    for(const lang of ['en','ru']){
      const s=(pair as Record<string,unknown>)[lang];
      if(typeof s!=='string'||!s.trim()||s.length>80||s!==s.trim())fail('invalid_editor_name',key,lang);
    }
  }
}
/** Rename a sparse authored name. Fallback entries of the SAME POI are excluded
 * by the caller; other live names/kingdom names are passed without duplication. */
export function renamePoiEditorName(names:EditorNames,key:string,pair:NamePair,live:ReadonlySet<string>,otherNames:readonly NamePair[]):EditorNames {
  if(!live.has(key))fail('stale_poi_name',key);
  const en=pair.en.trim(),ru=pair.ru.trim();
  if(!en&&!ru){if(!owns(names,key))return names;return Object.fromEntries(Object.entries(names).filter(([k])=>k!==key));}
  if(!en||!ru||en.length>80||ru.length>80)fail('invalid_poi_name',key);
  const normalize=(s:string)=>s.trim().toLocaleLowerCase();
  if([...Object.entries(names).filter(([k])=>k!==key).map(([,n])=>n),...otherNames].some(n=>normalize(n.en)===normalize(en)||normalize(n.ru)===normalize(ru)))fail('duplicate_poi_name',key);
  if(names[key]?.en===en&&names[key]?.ru===ru)return names;
  return {...names,[key]:{en,ru}};
}
function moveRecord<T>(record:Record<string,T>,from:string,to:string):Record<string,T>{
  if(owns(record,to))fail('poi_identity_conflict',to);
  return owns(record,from)?Object.fromEntries(Object.entries(record).map(([k,v])=>[k===from?to:k,v])):record;
}
/** Prepare a complete detached candidate; caller owns document/draft tokens,
 * history, live validation, and the one atomic final commit. */
export function preparePoiMove<D extends PoiDocument>(doc:D,edit:PoiMove,policy:PoiPolicy):D {
  const source=edit.source,from=source.hexKey,to=edit.targetKey;
  const origin=parseWaterHex(from),target=parseWaterHex(to),byHex=owners(doc.regions);
  const sourceRegion=source.kind==='land'?doc.regions.find(r=>r.id===source.regionId):undefined;
  const sourceWater=waterKindAt(doc.hexTerrainByKey,from),targetWater=waterKindAt(doc.hexTerrainByKey,to);
  const count=occurrences(doc,from);
  if(count>1)fail('ambiguous_poi',from);
  if(source.kind==='land'&&sourceRegion&&central(sourceRegion)&&waterHexKey(sourceRegion.centerHex)===from)fail('central_poi',from);
  const found=source.kind==='water'?doc.waterPoiByKey.has(from):!!sourceRegion&&byHex.get(from)===sourceRegion&&sourceRegion.pointsOfInterest.some(h=>waterHexKey(h)===from);
  if(!found||count!==1)fail('stale_poi_move',from);
  // Same source is a no-op even for an accepted legacy incompatibility/type.
  if(from===to)return doc;
  if(occurrences(doc,to)>0)fail('occupied_poi_target',to);
  const targetRegion=byHex.get(to);
  let kind:string|undefined;
  if(source.kind==='land'){
    if(sourceWater!=='land'||targetWater!=='land')fail('poi_environment_mismatch',from,to);
    if(!targetRegion)fail('unknown_poi_target',to);
    kind=sourceRegion!.pointOfInterestKinds?.[from];
    if(kind!==undefined&&(!policy.landKinds(sourceRegion!).includes(kind)||!policy.landKinds(targetRegion!).includes(kind)))fail('poi_kind_mismatch',kind??'',to);
    if(policy.mode==='mythic'){
      const id=sourceRegion!.kingdomId;
      if(id===undefined||id!==targetRegion!.kingdomId)fail('poi_kingdom_mismatch',from,to);
      if(kind==='myth'){
        if(targetRegion!.biomeLandType!=='wild'||!policy.inKingdomArea(id!,target)||!policy.inKingdomArea(id!,origin))fail('poi_myth_area',to);
        if((central(targetRegion!)&&targetRegion!.centralPoiKind==='myth')||targetRegion!.pointsOfInterest.some(h=>targetRegion!.pointOfInterestKinds?.[waterHexKey(h)]==='myth'&&waterHexKey(h)!==from))fail('poi_myth_duplicate',to);
      }
    }
  }else{
    if(policy.mode==='mythic')fail('water_poi_in_mythic',from);
    if(sourceWater==='land'||targetWater==='land')fail('poi_environment_mismatch',from,to);
    if(targetWater==='lake'&&!targetRegion)fail('unknown_poi_target',to);
    kind=doc.waterPoiByKey.get(from)!;
    const sourceContext=sourceWater==='sea'?'sea':byHex.get(from)?.biomeLandType;
    const targetContext=targetWater==='sea'?'sea':targetRegion?.biomeLandType;
    if(!sourceContext||!targetContext||!policy.waterKinds(sourceContext).includes(kind)||!policy.waterKinds(targetContext).includes(kind))fail('poi_kind_mismatch',kind,to);
  }
  const paths=doc.roads.filter(r=>r.segments.some(s=>waterHexKey(s.from)===from||waterHexKey(s.to)===from));
  if(paths.length)fail('poi_path_dependency',...paths.map(r=>String(r.id)));
  const nextLocator:PoiLocator=source.kind==='water'?{kind:'water',hexKey:to}:{kind:'land',regionId:targetRegion!.id,hexKey:to};
  const fromOwner=poiLocatorKey(source),toOwner=poiLocatorKey(nextLocator);
  // Reject hidden destination identity even if no rendered POI occupies it.
  const targetLandOwner=targetRegion?`poi:${targetRegion.id}:${to}`:undefined;
  const addresses=[toOwner,`waterPoi:${to}`,...(targetLandOwner?[targetLandOwner]:[])];
  if(addresses.some(k=>owns(doc.editorNames,k))||targetLandOwner&&(doc.tags.instances.some(i=>ownerKey(i.owner)===targetLandOwner)||Object.keys(doc.tags.rollCounters).some(k=>k.startsWith(targetLandOwner+'|')))||targetRegion&&owns(doc.toponyms,`settlement:${targetRegion.id}:${to}`)||targetRegion?.pointOfInterestKinds&&owns(targetRegion.pointOfInterestKinds,to))fail('poi_identity_conflict',to);
  const editorNames=moveRecord(doc.editorNames,fromOwner,toOwner);
  if(source.kind==='water'){
    const waterPoiByKey=new Map(doc.waterPoiByKey);waterPoiByKey.delete(from);waterPoiByKey.set(to,kind!);
    return {...doc,waterPoiByKey,editorNames};
  }
  const fromName=`settlement:${source.regionId}:${from}`,toName=`settlement:${targetRegion!.id}:${to}`;
  const toponyms=moveRecord(doc.toponyms,fromName,toName);
  const instances=doc.tags.instances.map(i=>ownerKey(i.owner)===fromOwner?{...i,owner:{kind:'poi' as const,regionId:targetRegion!.id,hexKey:to}}:i);
  if(new Set(instances.map(i=>tagKey(i.owner,i.definitionId))).size!==instances.length)fail('poi_identity_conflict',toOwner);
  const rollCounters=Object.fromEntries(Object.entries(doc.tags.rollCounters).map(([k,v])=>[k.startsWith(fromOwner+'|')?toOwner+k.slice(fromOwner.length):k,v]));
  const tags={...doc.tags,instances,rollCounters};assertTagCapacity(tags);
  const regions=doc.regions.map(r=>{
    if(r!==sourceRegion&&r!==targetRegion)return r;
    const kinds={...r.pointOfInterestKinds};
    if(r===sourceRegion)delete kinds[from];
    if(r===targetRegion&&kind!==undefined)kinds[to]=kind;
    const pointsOfInterest=sourceRegion===targetRegion?r.pointsOfInterest.map(h=>waterHexKey(h)===from?target:h):r===sourceRegion?r.pointsOfInterest.filter(h=>waterHexKey(h)!==from):[...r.pointsOfInterest,target];
    return {...r,pointsOfInterest,pointOfInterestKinds:Object.keys(kinds).length?kinds:undefined};
  });
  return {...doc,regions,toponyms,tags,editorNames};
}
