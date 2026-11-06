import {compareWaterHexes, parseWaterHex, waterComponents, type WaterTerrain, WaterEditError} from './manualWater.ts';

/** SEA01: identity belongs to a whole sea-only edge-connected component. */
export type SeaRecord = {id:number;hexKeys:string[]};
export type SeaIdentity = {seas:SeaRecord[];nextSeaId:number};
export type SeaChoices = {seaSplitKeep?:Record<string,string>;seaMergeKeep?:Record<string,number>};
export type SeaChoice =
  | {type:'split';key:string;seaId:number;allowed:string[];value:string;required:boolean}
  | {type:'merge';key:string;allowed:number[];value:number;required:boolean};
type Names = Record<string,{ru:string;en:string}>;
type SeaMap = {hexTerrainByKey:ReadonlyMap<string,WaterTerrain>;seas?:SeaRecord[];nextSeaId?:number;editorNames?:Names};
const fail=(code:string,...details:string[]):never=>{throw new WaterEditError('sea_'+code,...details);};
const components=(terrain:ReadonlyMap<string,WaterTerrain>)=>waterComponents([...terrain].filter(([,v])=>v.terrainOverride==='sea').map(([k])=>k));

/** Metadata-only legacy migration: never normalize terrain or draw random values. */
export function migrateSeas(terrain:ReadonlyMap<string,WaterTerrain>):SeaIdentity {
  const seas=components(terrain).map((hexKeys,i)=>({id:i+1,hexKeys}));
  return {seas,nextSeaId:seas.length+1};
}

/** Strict v9 registry validation. Input order is irrelevant; membership is exact. */
export function validateSeaIdentity(terrain:ReadonlyMap<string,WaterTerrain>,seas:unknown,nextSeaId:unknown):asserts seas is SeaRecord[] {
  const records=Array.isArray(seas)?seas:fail('registry');
  const ids=new Set<number>(),members=new Set<string>(),expected=components(terrain);
  const byKey=new Map(expected.map(c=>[c[0],c]));
  for(const [i,value]of records.entries()){
    if(!value||typeof value!=='object'||Array.isArray(value))fail('record',String(i));
    const {id,hexKeys}=value as SeaRecord;
    if(!Number.isSafeInteger(id)||id<1||ids.has(id))fail('id',String(i));ids.add(id);
    if(!Array.isArray(hexKeys)||!hexKeys.length)fail('members',String(id));
    for(const k of hexKeys){
      if(typeof k!=='string')fail('coordinate',String(id));parseWaterHex(k);
      if(members.has(k)||terrain.get(k)?.terrainOverride!=='sea')fail('member',String(id),k);members.add(k);
    }
    const sorted=[...hexKeys].sort(compareWaterHexes),component=byKey.get(sorted[0]);
    if(!component||component.length!==sorted.length||component.some((k,j)=>k!==sorted[j]))fail('component',String(id));
    byKey.delete(sorted[0]);
  }
  if(byKey.size)fail('coverage');
  if(!Number.isSafeInteger(nextSeaId)||(nextSeaId as number)<1||[...ids].some(id=>id>=(nextSeaId as number)))fail('counter');
}

/** Only genuinely absent legacy metadata may be migrated, never a broken registry. */
export function withLegacySeas<T extends SeaMap>(map:T):T & SeaIdentity {
  if(map.seas===undefined&&map.nextSeaId===undefined)return {...map,...migrateSeas(map.hexTerrainByKey)};
  validateSeaIdentity(map.hexTerrainByKey,map.seas,map.nextSeaId);
  return map as T & SeaIdentity;
}

/** SEA02: split heirs first, then merge candidates, then allocate in numeric order.
 * Staged defaults let the UI display a complete preview, never authorize a commit. */
export function prepareSeaIdentity(before:SeaMap,terrain:ReadonlyMap<string,WaterTerrain>,answers:SeaChoices={}) {
  const old=withLegacySeas(before),parts=components(terrain),partSets=parts.map(c=>new Set(c));
  const named=(id:number)=>!!old.editorNames?.[`sea:${id}`];
  const heirs=new Map<number,string>(),choices:SeaChoice[]=[],unresolved:SeaChoice[]=[];
  for(const sea of [...old.seas].sort((a,b)=>a.id-b.id)){
    const counts=partSets.map(set=>sea.hexKeys.reduce((n,k)=>n+Number(set.has(k)),0));
    const indices=parts.map((_,i)=>i).filter(i=>counts[i]>0);
    if(!indices.length)continue;
    let chosen=indices[0];
    if(indices.length>1){
      chosen=[...indices].sort((a,b)=>counts[b]-counts[a]||compareWaterHexes(parts[a][0],parts[b][0]))[0];
      const key=String(sea.id),explicit=answers.seaSplitKeep?.[key],allowed=indices.map(i=>parts[i][0]);
      if(explicit!==undefined&&!allowed.includes(explicit))fail('split_choice',key);
      const value=explicit??parts[chosen][0];chosen=parts.findIndex(c=>c[0]===value);
      const choice:SeaChoice={type:'split',key,seaId:sea.id,allowed,value,required:named(sea.id)};
      choices.push(choice);if(choice.required&&explicit===undefined)unresolved.push(choice);
    }
    heirs.set(sea.id,parts[chosen][0]);
  }
  let nextSeaId=old.nextSeaId;
  const seas=parts.map(hexKeys=>{
    const key=hexKeys[0],ids=[...heirs].filter(([,k])=>k===key).map(([id])=>id).sort((a,b)=>a-b);
    let id=ids[0];
    if(ids.length>1){
      const names=ids.filter(named),explicit=answers.seaMergeKeep?.[key];
      if(explicit!==undefined&&!ids.includes(explicit))fail('merge_choice',key);
      id=explicit??(names.length===1?names[0]:ids[0]);
      const choice:SeaChoice={type:'merge',key,allowed:ids,value:id,required:names.length>=2};
      choices.push(choice);if(choice.required&&explicit===undefined)unresolved.push(choice);
    }else if(!ids.length){if(nextSeaId>=Number.MAX_SAFE_INTEGER)fail('overflow');id=nextSeaId++;}
    return {id,hexKeys};
  }).sort((a,b)=>a.id-b.id);
  for(const key of Object.keys(answers.seaSplitKeep??{}))if(!choices.some(c=>c.type==='split'&&c.key===key))fail('split_choice',key);
  for(const key of Object.keys(answers.seaMergeKeep??{}))if(!choices.some(c=>c.type==='merge'&&c.key===key))fail('merge_choice',key);
  const live=new Set(seas.map(s=>s.id)),removedSeaIds=old.seas.filter(s=>!live.has(s.id)).map(s=>s.id).sort((a,b)=>a-b);
  return {seas,nextSeaId,choices,unresolved,removedSeaIds};
}
