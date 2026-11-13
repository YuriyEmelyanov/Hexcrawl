/** Stable DETAIL1 POI identity. Locators are mutable addresses; the monotonic
 * document counter prevents deleted IDs being reused by a later occupant. */
export type DetailPoiIdentities=Readonly<{version:1;nextId:number;byLegacyRef:Readonly<Record<string,string>>}>;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fields=(v:Record<string,unknown>,expected:string[])=>Object.keys(v).length===expected.length&&expected.every(k=>Object.prototype.hasOwnProperty.call(v,k));
function locator(v:unknown):asserts v is string {
 if(typeof v!=='string')throw Error('Invalid DETAIL1 POI locator');
 const match=/^(?:poi:([1-9]\d*):|waterPoi:)(-?\d+),(-?\d+)$/.exec(v);
 if(!match||match[1]!==undefined&&!Number.isSafeInteger(Number(match[1])))throw Error('Invalid DETAIL1 POI locator');
 for(const part of match.slice(2))if(!Number.isSafeInteger(Number(part))||String(Number(part))!==part)throw Error('Invalid DETAIL1 POI locator');
}
export function parseDetailPoiIdentities(value:unknown):DetailPoiIdentities {
 if(!plain(value)||!fields(value,['version','nextId','byLegacyRef'])||value.version!==1||!Number.isSafeInteger(value.nextId)||(value.nextId as number)<1||!plain(value.byLegacyRef))throw Error('Invalid DETAIL1 POI identities');
 const ids=new Set<string>(),entries:[string,string][]=[];
 for(const [alias,id]of Object.entries(value.byLegacyRef)){
  locator(alias);const match=typeof id==='string'?/^detail-poi:([1-9]\d*)$/.exec(id):null;
  if(!match||!Number.isSafeInteger(Number(match[1]))||Number(match[1])>=(value.nextId as number)||ids.has(id as string))throw Error('Invalid or duplicate DETAIL1 POI id');
  ids.add(id as string);entries.push([alias,id as string]);
 }
 return Object.freeze({version:1,nextId:value.nextId as number,byLegacyRef:Object.freeze(Object.fromEntries(entries.sort(([a],[b])=>a<b?-1:a>b?1:0)))});
}
export function assertDetailPoiOwners(value:DetailPoiIdentities,live:ReadonlySet<string>):void {
 const state=parseDetailPoiIdentities(value),aliases=Object.keys(state.byLegacyRef);
 if(aliases.length!==live.size||aliases.some(alias=>!live.has(alias)))throw Error('DETAIL1 POI identities do not match live owners');
 for(const alias of live)locator(alias);
}
/** Explicit address moves/removals are simultaneous. A missing old alias is
 * never guessed as a move or silently deleted. No geometry/content/RNG changes. */
export function reconcileDetailPoiIdentities(live:ReadonlySet<string>,previous?:DetailPoiIdentities,moves:ReadonlyMap<string,string|null>=new Map()):DetailPoiIdentities {
 const before=previous?parseDetailPoiIdentities(previous):parseDetailPoiIdentities({version:1,nextId:1,byLegacyRef:{}});
 for(const alias of live)locator(alias);
 for(const [from,to]of moves){locator(from);if(!Object.prototype.hasOwnProperty.call(before.byLegacyRef,from))throw Error('Unknown DETAIL1 identity move');if(to!==null)locator(to);}
 const entries:[string,string][]=[],used=new Set<string>();let nextId=before.nextId;
 for(const [alias,id]of Object.entries(before.byLegacyRef)){
  const target=moves.has(alias)?moves.get(alias)!:alias;
  if(target===null)continue;
  if(!live.has(target)||used.has(target))throw Error('Dangling or conflicting DETAIL1 identity move');
  used.add(target);entries.push([target,id]);
 }
 for(const alias of [...live].sort())if(!used.has(alias)){
  if(nextId>=Number.MAX_SAFE_INTEGER)throw Error('DETAIL1 POI identity counter exhausted');
  entries.push([alias,`detail-poi:${nextId++}`]);
 }
 const result=parseDetailPoiIdentities({version:1,nextId,byLegacyRef:Object.fromEntries(entries)});assertDetailPoiOwners(result,live);
 return previous&&JSON.stringify(result)===JSON.stringify(before)?previous:result;
}
