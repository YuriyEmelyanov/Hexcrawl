import type {PreparedPlace} from './tags/tablePreparation.ts';
import {ownerKey,type TagInstance} from './tags/engine.ts';
import type {KnavePoiContent} from './tags/knave.ts';
export type Difficulty='auto'|'unknown'|'normal'|'difficult'|'dangerous';
export type Discovery='auto'|'unknown'|'passage'|'exploration'|'interaction';
export type Classification={version:1;difficultyByHex:Record<string,Exclude<Difficulty,'auto'>>;discoveryByPoi:Record<string,{mode:Discovery;clueText:string}>};
export const emptyClassification=():Classification=>({version:1,difficultyByHex:{},discoveryByPoi:{}});
export const hasClassification=(layer:Classification|undefined)=>!!layer&&(Object.keys(layer.difficultyByHex).length>0||Object.keys(layer.discoveryByPoi).length>0);
type Context={hexes:ReadonlySet<string>;pois:ReadonlySet<string>};
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const keys=(x:Record<string,unknown>,ks:string[])=>Object.keys(x).length===ks.length&&ks.every(k=>Object.prototype.hasOwnProperty.call(x,k));
export function validateClassification(value:unknown,context:Context,version=11):asserts value is Classification|undefined{
 if(value===undefined)return;
 if((version!==11&&version!==12&&version!==13)||!record(value)||!keys(value,['version','difficultyByHex','discoveryByPoi'])||value.version!==1||!record(value.difficultyByHex)||!record(value.discoveryByPoi))throw Error('Invalid classification');
 for(const [k,v]of Object.entries(value.difficultyByHex))if(!context.hexes.has(k)||!['unknown','normal','difficult','dangerous'].includes(String(v))||typeof v!=='string')throw Error('Invalid terrain classification');
 for(const [k,v]of Object.entries(value.discoveryByPoi))if(!context.pois.has(k)||!record(v)||!keys(v,['mode','clueText'])||typeof v.mode!=='string'||!['auto','unknown','passage','exploration','interaction'].includes(v.mode)||typeof v.clueText!=='string'||v.clueText!==v.clueText.trim()||v.clueText.length>512||v.mode==='interaction'&&!v.clueText)throw Error('Invalid discovery classification');
}
/** Policy1: product defaults, not a common numerical movement rule for games. */
export const biomeDifficulty:Readonly<Record<string,'normal'|'difficult'|'dangerous'>>={
 open_plains:'normal',deciduous_woodland:'normal',mixed_woodland:'normal',coniferous_woodland:'normal',dead_woodland:'normal',
 plain_deciduous_forest:'difficult',plain_mixed_forest:'difficult',plain_coniferous_forest:'difficult',dead_forest:'difficult',
 open_hills:'difficult',deciduous_forested_hills:'difficult',mixed_forested_hills:'difficult',coniferous_forested_hills:'difficult',hilly_woodland:'difficult',dead_forested_hills:'difficult',
 mountains:'dangerous',coniferous_mountain_forest:'dangerous',mixed_mountain_forest:'dangerous',deciduous_mountain_forest:'dangerous',mountain_woodland:'dangerous',dead_mountain_forest:'dangerous',swamp:'dangerous',swamp_forest:'dangerous'
};
export function terrainDefault(biome?:string){return biome?biomeDifficulty[biome]??'unknown':'unknown';}
export function terrainRisk(biome:string|undefined,language:'ru'|'en'){
 if(biome==='swamp'||biome==='swamp_forest')return language==='ru'?'риск увязания':'risk of becoming mired';
 if(biomeDifficulty[biome??'']==='dangerous')return language==='ru'?'риск падения':'risk of falling';
 return '';
}
// Semantic IDs, never localized name substrings. Text overrides suspend the
// original semantic inference for that tag. Only the relevant slot matters.
export function discoveryTagEffect(owner:string,tags:readonly TagInstance[],content?:KnavePoiContent|PreparedPlace):boolean{
 if(content&&('calls' in content?content.calls.some(c=>(c.nextEntry??c).table==='place_traits'&&(c.nextEntry??c).sourceRow===43):content.trait.sourceRow===43))return true; // KNC1 place_traits row43 Hidden
 return tags.some(t=>ownerKey(t.owner)===owner&&t.definitionVersion===1&&(
  t.definitionId==='mb.dwelling'&&t.entryIds[0]==='mb.dwelling:16'&&!t.overrides?.[0]||
  t.definitionId==='mb.ruin'&&t.entryIds[0]==='mb.ruin:42'&&!t.overrides?.[0]||
  t.definitionId==='mb.feature'&&t.entryIds[0]==='mb.feature:character:7'&&!t.overrides?.[0]||
  t.definitionId==='mb.luxuries'&&t.entryIds[0]==='mb.luxuries:character:7'&&!t.overrides?.[0]
 ));
}
export function discoveryDefault(input:{kind?:string;biome?:string;onRoad:boolean;hidden:boolean;water?:boolean}):Exclude<Discovery,'auto'|'interaction'>{
 if(input.hidden)return 'exploration';
 if(input.water)return 'unknown';
 if(input.kind&&['lair','dungeon','underwater_cave'].includes(input.kind))return 'exploration';
 if(input.onRoad&&input.kind)return 'passage';
 if(input.kind&&['tower','watchtower','city','capital','town','village','stronghold','holding_tower','holding_city','holding_castle'].includes(input.kind)&&['open_plains','open_hills','mountains','semi_desert'].includes(input.biome??''))return 'passage';
 return 'unknown';
}
export function remapClassification(layer:Classification|undefined,moves:ReadonlyMap<string,string>):Classification|undefined{
 if(!layer)return layer;
 const entries=Object.entries(layer.discoveryByPoi).map(([k,v])=>[moves.get(k)??k,v]as const);
 if(new Set(entries.map(([k])=>k)).size!==entries.length)throw Error('Classification identity conflict');
 return {...structuredClone(layer),discoveryByPoi:Object.fromEntries(entries)};
}
export function classificationLosses(layer:Classification|undefined,context:Context):string[]{return layer?[...Object.keys(layer.difficultyByHex).filter(k=>!context.hexes.has(k)).map(k=>'hex:'+k),...Object.keys(layer.discoveryByPoi).filter(k=>!context.pois.has(k)).map(k=>'poi:'+k)]:[];}
export function retainClassification(layer:Classification|undefined,context:Context):Classification|undefined{
 const next:Classification|undefined=layer?{version:1,difficultyByHex:Object.fromEntries(Object.entries(layer.difficultyByHex).filter(([k])=>context.hexes.has(k))),discoveryByPoi:Object.fromEntries(Object.entries(layer.discoveryByPoi).filter(([k])=>context.pois.has(k)))}:undefined;return hasClassification(next)?next:undefined;
}
