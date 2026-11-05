/** E6 detached water geometry. No random service, renderer or document setter. */
export type WaterHex={q:number;r:number};
export type WaterKind='land'|'lake'|'sea';
export type WaterTerrain={terrainOverride?:'lake'|'sea';lakeId?:number};
export type WaterRegion={id:number;hexes:WaterHex[];centerHex:WaterHex;anchorHex:WaterHex;finalSize:number;isCoastal?:boolean};
export type WaterChoices={
  componentKinds?:Record<string,'lake'|'sea'>;
  regionAssignments?:Record<string,number>;
  splitKeep?:Record<string,string>;
  mergeKeep?:Record<string,number>;
};
export type WaterEdit=WaterChoices&{hexKeys:string[];target:WaterKind};
export type WaterGeometryChoice=
  |{type:'kind';key:string;hexKeys:string[];value:'lake'|'sea';allowed:('lake'|'sea')[];reason:'mixed'|'enclosed'}
  |{type:'region';key:string;hexKeys:string[];value?:number;allowed:number[]}
  |{type:'split';key:string;lakeId:number;value:string;allowed:string[]}
  |{type:'merge';key:string;lakeIds:number[];value?:number;allowed:number[]};
export class WaterEditError extends Error{
  readonly code:string;readonly details:string[];
  constructor(code:string,...details:string[]){super([code,...details].join(':'));this.name='WaterEditError';this.code=code;this.details=details;}
}
const fail=(code:string,...details:string[]):never=>{throw new WaterEditError(code,...details);};
export const waterHexKey=(h:WaterHex)=>`${h.q},${h.r}`;
export const parseWaterHex=(key:string):WaterHex=>{
  const [q,r]=key.split(',').map(Number);
  if(!Number.isSafeInteger(q)||!Number.isSafeInteger(r)||`${q},${r}`!==key)fail('coordinate',key);
  return {q,r};
};
export const waterNeighbors=(key:string):string[]=>{const {q,r}=parseWaterHex(key);return [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([a,b])=>`${q+a},${r+b}`);};
export const compareWaterHexes=(a:string,b:string)=>{const x=parseWaterHex(a),y=parseWaterHex(b);return x.q-y.q||x.r-y.r;};
export const waterKindAt=(terrain:ReadonlyMap<string,WaterTerrain>,key:string):WaterKind=>terrain.get(key)?.terrainOverride??'land';
export function waterComponents(keys:Iterable<string>):string[][]{
  const remaining=new Set(keys),result:string[][]=[];
  while(remaining.size){const first=remaining.values().next().value!;const seen=new Set<string>(),todo=[first];
    while(todo.length){const key=todo.pop()!;if(!remaining.delete(key))continue;seen.add(key);todo.push(...waterNeighbors(key).filter(k=>remaining.has(k)));}
    result.push([...seen].sort(compareWaterHexes));
  }
  return result.sort((a,b)=>compareWaterHexes(a[0],b[0]));
}
/** Geometric component, not every disconnected legacy cell with the same ID. */
export function connectedWaterBody(terrain:ReadonlyMap<string,WaterTerrain>,start:string):string[]{
  if(waterKindAt(terrain,start)==='land')return [];
  return waterComponents([...terrain].filter(([,v])=>v.terrainOverride==='lake'||v.terrainOverride==='sea').map(([k])=>k)).find(c=>c.includes(start))??[];
}
export function prepareWaterGeometry<T extends WaterRegion>(doc:{regions:T[];hexTerrainByKey:Map<string,WaterTerrain>;nextLakeId:number},edit:WaterEdit){
  if(!['land','lake','sea'].includes(edit.target))fail('kind');
  const selected=[...new Set(edit.hexKeys)].sort(compareWaterHexes);
  const owners=new Map<string,number>();
  for(const r of doc.regions)for(const h of r.hexes){const key=waterHexKey(h);if(owners.has(key)&&owners.get(key)!==r.id)fail('ambiguous_region',key);owners.set(key,r.id);}
  const registered=new Set([...owners.keys(),...[...doc.hexTerrainByKey].filter(([,v])=>v.terrainOverride==='lake'||v.terrainOverride==='sea').map(([key])=>key)]);
  for(const key of selected){parseWaterHex(key);if(!registered.has(key))fail('unregistered',key);}
  const changed=selected.filter(key=>waterKindAt(doc.hexTerrainByKey,key)!==edit.target);
  const empty={regions:doc.regions,hexTerrainByKey:doc.hexTerrainByKey,nextLakeId:doc.nextLakeId,choices:[] as WaterGeometryChoice[],unresolved:[] as WaterGeometryChoice[],removedLakeIds:[] as number[],newLakeIds:[] as number[],changedHexKeys:[] as string[]};
  // A no-op must not normalize legacy data or consume an ID/redo entry.
  if(!changed.length)return empty;
  for(const region of doc.regions)for(const key of [waterHexKey(region.centerHex),waterHexKey(region.anchorHex)])if(changed.includes(key)&&edit.target!=='land')fail('protected_region_hex',String(region.id),key);
  const beforeLakes=new Map<number,string[]>();
  for(const [key,t] of doc.hexTerrainByKey)if(t.terrainOverride==='lake'&&t.lakeId!==undefined){const list=beforeLakes.get(t.lakeId)??[];list.push(key);beforeLakes.set(t.lakeId,list);}
  const terrain=new Map(doc.hexTerrainByKey),changes=new Set(changed),choices:WaterGeometryChoice[]=[],unresolved:WaterGeometryChoice[]=[];
  const setKind=(key:string,kind:WaterKind)=>{const current=terrain.get(key);if(kind==='land')terrain.delete(key);else terrain.set(key,kind==='lake'&&current?.terrainOverride==='lake'?current:{terrainOverride:kind});};
  for(const key of changed)setKind(key,edit.target);
  const touchedIds=new Set(changed.flatMap(key=>{const old=doc.hexTerrainByKey.get(key);return old?.terrainOverride==='lake'&&old.lakeId!==undefined?[old.lakeId]:[];}));
  const wet=()=>[...terrain].filter(([,t])=>t.terrainOverride==='lake'||t.terrainOverride==='sea').map(([key])=>key);
  const affected=(component:string[])=>component.some(key=>changes.has(key)||waterNeighbors(key).some(k=>changes.has(k))||touchedIds.has(doc.hexTerrainByKey.get(key)?.lakeId??-1));
  let components=waterComponents(wet());
  for(const component of components.filter(affected)){
    const key=component[0],kinds=new Set(component.map(k=>waterKindAt(terrain,k)));
    const enclosed=!component.some(k=>waterNeighbors(k).some(n=>!registered.has(n)));
    if(kinds.size>1||kinds.has('sea')&&enclosed){
      const allowed:('lake'|'sea')[]=enclosed?['lake']:['lake','sea'];
      const explicit=edit.componentKinds?.[key];if(explicit&&!allowed.includes(explicit))fail('enclosed_sea',key);
      const value=explicit??(enclosed?'lake':'sea'),choice:WaterGeometryChoice={type:'kind',key,hexKeys:component,value,allowed,reason:enclosed?'enclosed':'mixed'};
      choices.push(choice);if(!explicit)unresolved.push(choice);
      for(const cell of component){if(waterKindAt(terrain,cell)!==value)changes.add(cell);setKind(cell,value);}
    }
    if(waterKindAt(terrain,key)==='sea'&&component.length<2)fail('sea_minimum',key);
    for(const cell of component){const id=doc.hexTerrainByKey.get(cell)?.lakeId;if(id!==undefined)touchedIds.add(id);}
  }
  // Legacy disconnected identities are not silently repaired/expanded.
  for(const id of touchedIds){const old=beforeLakes.get(id);if(old&&waterComponents(old).length!==1)fail('legacy_disconnected_lake',String(id));}
  const additions=new Map<number,string[]>();
  const reclaim=[...changes].filter(key=>!owners.has(key)&&waterKindAt(terrain,key)!=='sea'&&registered.has(key));
  for(const component of waterComponents(reclaim)){
    const key=component[0],adjacent=new Set(component.flatMap(k=>waterNeighbors(k).map(n=>owners.get(n))).filter((id):id is number=>id!==undefined));
    const allowed=[...adjacent].sort((a,b)=>a-b);if(!allowed.length)fail('no_region',key);
    const explicit=edit.regionAssignments?.[key];if(explicit!==undefined&&!allowed.includes(explicit))fail('region_choice',key);
    const choice:WaterGeometryChoice={type:'region',key,hexKeys:component,value:explicit,allowed};choices.push(choice);if(explicit===undefined)unresolved.push(choice);
    // Staged choice is for complete dependency preview only, never a commit answer.
    const id=explicit??allowed[0],keys=additions.get(id)??[];keys.push(...component);additions.set(id,keys);for(const k of component)owners.set(k,id);
  }
  components=waterComponents([...terrain].filter(([,t])=>t.terrainOverride==='lake').map(([key])=>key));
  const active=components.filter(affected),keep=new Map<number,string>();
  for(const id of touchedIds){const parts=active.filter(c=>c.some(k=>doc.hexTerrainByKey.get(k)?.lakeId===id));
    if(!parts.length)continue;
    const selectedPart=edit.splitKeep?.[String(id)]??parts[0][0];if(!parts.some(c=>c[0]===selectedPart))fail('split_choice',String(id));keep.set(id,selectedPart);
    if(parts.length>1)choices.push({type:'split',key:String(id),lakeId:id,value:selectedPart,allowed:parts.map(c=>c[0])});
  }
  const maxId=Math.max(0,...beforeLakes.keys());
  let nextLakeId=doc.nextLakeId;const newLakeIds:number[]=[];
  if(!Number.isSafeInteger(nextLakeId)||nextLakeId<=maxId)fail('lake_counter');
  for(const component of active){
    const key=component[0],ids=[...new Set(component.map(k=>doc.hexTerrainByKey.get(k)?.lakeId).filter((id):id is number=>id!==undefined&&keep.get(id)===key))].sort((a,b)=>a-b);
    let id:number;
    if(ids.length>1){const explicit=edit.mergeKeep?.[key];if(explicit!==undefined&&!ids.includes(explicit))fail('merge_choice',key);
      const choice:WaterGeometryChoice={type:'merge',key,lakeIds:ids,value:explicit,allowed:ids};choices.push(choice);if(explicit===undefined)unresolved.push(choice);id=explicit??ids[0];
    }else if(ids.length)id=ids[0];else{if(nextLakeId>=Number.MAX_SAFE_INTEGER)fail('lake_overflow');id=nextLakeId++;newLakeIds.push(id);}
    for(const cell of component){if(!owners.has(cell))fail('lake_region',cell);const old=terrain.get(cell);if(old?.terrainOverride!=='lake'||old.lakeId!==id){terrain.set(cell,{terrainOverride:'lake',lakeId:id});changes.add(cell);}}
  }
  const afterIds=new Set([...terrain.values()].filter(t=>t.terrainOverride==='lake').map(t=>t.lakeId));
  const removedLakeIds=[...beforeLakes.keys()].filter(id=>!afterIds.has(id)).sort((a,b)=>a-b);
  if(!unresolved.length&&!additions.size&&nextLakeId===doc.nextLakeId&&terrain.size===doc.hexTerrainByKey.size
    &&[...terrain].every(([key,value])=>JSON.stringify(value)===JSON.stringify(doc.hexTerrainByKey.get(key))))return empty;
  const regions=doc.regions.map(region=>{
    const appended=(additions.get(region.id)??[]).sort(compareWaterHexes),hexes=appended.length?[...region.hexes,...appended.map(parseWaterHex)]:region.hexes;
    const touched=appended.length||hexes.some(h=>changes.has(waterHexKey(h))||waterNeighbors(waterHexKey(h)).some(k=>changes.has(k)));
    if(!touched)return region;
    const coastal=hexes.some(h=>waterKindAt(terrain,waterHexKey(h))==='sea'||waterNeighbors(waterHexKey(h)).some(k=>waterKindAt(terrain,k)==='sea'));
    return {...region,hexes,finalSize:hexes.length,isCoastal:coastal};
  });
  return {regions,hexTerrainByKey:terrain,nextLakeId,choices,unresolved,removedLakeIds,newLakeIds,changedHexKeys:[...changes].sort(compareWaterHexes)};
}
