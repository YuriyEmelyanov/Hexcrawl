// Rule-independent tag commands. No geography imports or ambient randomness.
export type TagOwner = {kind:'region'|'river'|'lake';id:number} | {kind:'poi';regionId:number;hexKey:string};
export type Texts = Record<string,string>;
export type TagDefinition = {id:string;version:number;label:Texts;resolver:'independent'|'product';slots:{id:string;label?:Texts;sides:number;count?:number;selection?:'single'|'sum'}[]; tables:Texts[][];legacyTables?:Texts[][]};
export type TagInstance = {definitionId:string;definitionVersion:number;owner:TagOwner;resolver:'independent'|'product';revision:number;sides:number[];values:number[][];entryIds:string[];texts:Texts[];overrides?:Texts[]};
export type TagState = {schemaVersion:1;instances:TagInstance[];rollCounters:Record<string,number>};
export const TAGS_PER_OWNER_LIMIT=64, TAG_LANGUAGE_LIMIT=8;
export class TagCapacityError extends Error {
  readonly capacity:'owner'|'languages';
  constructor(capacity:'owner'|'languages'){super(`Tag ${capacity} capacity exceeded`);this.capacity=capacity;}
}
// Commands prepare clones; enforce the same limits as import before any caller can commit.
export function assertTagCapacity(state:TagState):void {
  const counts=new Map<string,number>();
  for(const instance of state.instances){
    const key=ownerKey(instance.owner),count=(counts.get(key)??0)+1;counts.set(key,count);
    if(count>TAGS_PER_OWNER_LIMIT)throw new TagCapacityError('owner');
    for(const text of [...instance.texts,...(instance.overrides??[])])
      if(Object.keys(text).length>TAG_LANGUAGE_LIMIT)throw new TagCapacityError('languages');
  }
}
export const emptyTags = ():TagState => ({schemaVersion:1,instances:[],rollCounters:{}});
export const ownerKey = (o:TagOwner) => o.kind==='poi' ? `poi:${o.regionId}:${o.hexKey}` : `${o.kind}:${o.id}`;
export const tagKey = (o:TagOwner,id:string) => `${ownerKey(o)}|${id}`;
export const findTag = (s:TagState,o:TagOwner,id:string) => s.instances.find(i=>tagKey(i.owner,i.definitionId)===tagKey(o,id));
const hash = (s:string) => {let h=2166136261;for(let n=0;n<s.length;n++)h=Math.imul(h^s.charCodeAt(n),16777619);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);return (h^(h>>>16))>>>0;};
function drawDie(key:string,sides:number):number {
  const limit=Math.floor(0x100000000/sides)*sides;
  for(let attempt=0;;attempt++){const n=hash(`${key}:${attempt}`);if(n<limit)return n%sides+1;}
}
/** Domain adapters reuse the tag sampler without pretending a filtered pool is
 * a printed die. A one-entry pool is valid. Existing rollTag keys are unchanged. */
export function drawTagIndex(seed:number,key:string,counter:number,size:number):{index:number;nextCounter:number} {
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||typeof key!=='string'||!key.length||key.length>240
    ||!Number.isSafeInteger(counter)||counter<0||counter>=Number.MAX_SAFE_INTEGER
    ||!Number.isSafeInteger(size)||size<1||size>1000000)throw Error('Invalid tag choice');
  return {index:drawDie(`tag-choice-v1:${seed}:${key}:${counter}`,size)-1,nextCounter:counter+1};
}
export function resolved(def:TagDefinition,values:number[][]):{entryIds:string[];texts:Texts[]} {
  const indices=values.map(v=>v.reduce((a,b)=>a+b,0)-1);
  if(def.resolver==='product') {
    const index=indices.reduce((n,v,i)=>n*def.slots[i].sides+v,0);
    return {entryIds:[`${def.id}:${index}`],texts:[{...def.tables[0][index]}]};
  }
  return {entryIds:indices.map((v,i)=>`${def.id}:${def.slots[i].id}:${v}`),texts:indices.map((v,i)=>({...def.tables[i][v]}))};
}
export function rollTag(state:TagState,owner:TagOwner,def:TagDefinition,seed:number,slot?:number):TagState {
  const previous=findTag(state,owner,def.id);
  if(previous&&previous.definitionVersion!==def.version)throw Error('Unknown tag version');
  if(slot!==undefined&&(!previous||!Number.isInteger(slot)||slot<0||slot>=def.slots.length))throw Error('Invalid tag slot');
  const next=structuredClone(state),key=tagKey(owner,def.id);
  const values=def.slots.map((s,i)=>{
    if(slot!==undefined&&i!==slot)return [...previous!.values[i]];
    const counterKey=`${key}|${s.id}`,counter=next.rollCounters[counterKey]??0;
    if(!Number.isSafeInteger(counter)||counter>=Number.MAX_SAFE_INTEGER)throw Error('Tag counter exhausted');
    next.rollCounters[counterKey]=counter+1;
    return Array.from({length:s.count??1},(_,j)=>drawDie(`tags-v1:${seed>>>0}:${key}:${def.version}:${s.id}:${counter}:${j}`,s.sides));
  });
  const resolution=resolved(def,values),revision=(previous?.revision??0)+1;
  if(!Number.isSafeInteger(revision))throw Error('Tag revision exhausted');
  const overrides=previous?.overrides?.map((text,i)=>slot===undefined||def.resolver==='product'||i===slot?{}:{...text});
  const instance:TagInstance={definitionId:def.id,definitionVersion:def.version,owner:{...owner},resolver:def.resolver,revision,sides:def.slots.map(s=>s.sides),values,...resolution,...(overrides?{overrides}:{})};
  next.instances=next.instances.filter(i=>tagKey(i.owner,i.definitionId)!==key);next.instances.push(instance);assertTagCapacity(next);return next;
}
export function editTag(state:TagState,owner:TagOwner,id:string,index:number,language:string,text:string):TagState {
  if([...text].length>256)throw Error('Tag text too long');
  const next=structuredClone(state),instance=findTag(next,owner,id);
  if(!instance||!instance.texts[index])throw Error('Invalid tag result');
  instance.overrides??=instance.texts.map(()=>({}));instance.overrides[index][language]=text;instance.revision++;
  if(!Number.isSafeInteger(instance.revision))throw Error('Tag revision exhausted');assertTagCapacity(next);return next;
}
export function pruneTags(state:TagState,validOwners:Set<string>):TagState {
  const instances=state.instances.filter(i=>validOwners.has(ownerKey(i.owner)));
  const prefixes=instances.map(i=>tagKey(i.owner,i.definitionId)+'|');
  return {schemaVersion:1,instances,rollCounters:Object.fromEntries(Object.entries(state.rollCounters).filter(([k])=>prefixes.some(p=>k.startsWith(p))))};
}
export function validateTags(value:unknown,owners:Set<string>,registry:Record<string,TagDefinition>):asserts value is TagState {
  const bad=()=>{throw Error('Invalid tag data');};
  const obj=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
  const int=(x:unknown,min=0)=>Number.isSafeInteger(x)&&(x as number)>=min;
  const texts=(x:unknown)=>obj(x)&&Object.keys(x).length<=TAG_LANGUAGE_LIMIT&&Object.entries(x).every(([l,t])=>l.length>0&&l.length<=32&&typeof t==='string'&&[...t].length<=256);
  if(!obj(value)||value.schemaVersion!==1||!Array.isArray(value.instances)||!obj(value.rollCounters))return bad();
  const seen=new Set<string>(),counts=new Map<string,number>();
  for(const i of value.instances){
    if(!obj(i)||typeof i.definitionId!=='string'||!i.definitionId.length||i.definitionId.length>120||!int(i.definitionVersion,1)||!int(i.revision)||!obj(i.owner))return bad();
    const o=i.owner;
    if(!['region','poi','river','lake'].includes(o.kind))return bad();
    if(o.kind==='poi'){if(!int(o.regionId,1)||typeof o.hexKey!=='string'||!/^(-?\d+),(-?\d+)$/.test(o.hexKey)||o.hexKey.split(',').some((n:string)=>!Number.isSafeInteger(Number(n))||String(Number(n))!==n))return bad();}
    else if(!int(o.id,1))return bad();
    const own=ownerKey(o as TagOwner),key=tagKey(o as TagOwner,i.definitionId);
    if(!owners.has(own)||seen.has(key))return bad();seen.add(key);
    const count=(counts.get(own)??0)+1;counts.set(own,count);if(count>TAGS_PER_OWNER_LIMIT)return bad();
    if(!['independent','product'].includes(i.resolver)||!Array.isArray(i.sides)||!i.sides.length||i.sides.length>8||!Array.isArray(i.values)||i.values.length!==i.sides.length)return bad();
    for(let j=0;j<i.sides.length;j++)if(!int(i.sides[j],2)||i.sides[j]>1000000||!Array.isArray(i.values[j])||!i.values[j].length||i.values[j].length>8||i.values[j].some((v:unknown)=>!int(v,1)||(v as number)>i.sides[j]))return bad();
    const n=i.resolver==='product'?1:i.sides.length;
    if(!Array.isArray(i.texts)||i.texts.length!==n||!i.texts.every(texts)||!Array.isArray(i.entryIds)||i.entryIds.length!==n||i.entryIds.some((s:unknown)=>typeof s!=='string'||s.length>256))return bad();
    if(i.overrides!==undefined&&(!Array.isArray(i.overrides)||i.overrides.length!==n||!i.overrides.every(texts)))return bad();
    const def=Object.prototype.hasOwnProperty.call(registry,i.definitionId)?registry[i.definitionId]:undefined;
    if(def&&def.version===i.definitionVersion){
      if(i.resolver!==def.resolver||i.values.length!==def.slots.length||def.slots.some((s,j)=>s.sides!==i.sides[j]||i.values[j].length!==(s.count??1)))return bad();
      for(const slot of def.slots)if(!int(value.rollCounters[`${key}|${slot.id}`],1))return bad();
      const result=resolved(def,i.values);
      const legacy=def.legacyTables?resolved({...def,tables:def.legacyTables},i.values):undefined;
      const same=(a:Texts,b:Texts)=>Object.keys(a).length===Object.keys(b).length&&Object.entries(b).every(([l,s])=>a[l]===s);
      if(JSON.stringify(i.entryIds)!==JSON.stringify(result.entryIds)||i.texts.some((t:Texts,j:number)=>!same(t,result.texts[j])&&!(legacy&&same(t,legacy.texts[j]))))return bad();
    }
  }
  for(const [k,n] of Object.entries(value.rollCounters))if(k.length>300||!int(n)||!Array.from(seen).some(s=>k.startsWith(s+'|')))return bad();
}
