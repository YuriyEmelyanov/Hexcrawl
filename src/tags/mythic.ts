import {sparkData,mythicCatalog} from './mythicData.ts';
import {emptyTags,findTag,ownerKey,pruneTags,rollTag,type TagOwner,type TagState,type TagDefinition,type Texts} from './engine.ts';
const labels:Record<string,[string,string]>={holding:['Удел','Holding'],bailey:['Подворье','Bailey'],keep:['Замок','Keep'],food:['Еда','Food'],goods:['Товары','Goods'],luxuries:['Роскошь','Luxuries'],land:['Земля','Land'],water:['Вода','Water'],flora:['Флора','Flora'],fauna:['Фауна','Fauna'],feature:['Особенность','Feature'],wonder:['Чудо','Wonder'],otherworld:['Иномирье','Otherworld'],myth:['Миф','Myth'],dwelling:['Жилище','Dwelling'],sanctum:['Святилище','Sanctum'],monument:['Монумент','Monument'],hazard:['Опасность','Hazard'],curse:['Проклятие','Curse'],ruin:['Руины','Ruins'],seer:['Провидец','Seer']};
export const mythicDefinitions:Record<string,TagDefinition>=Object.create(null);
for(const [name,columns] of Object.entries(sparkData)){
 mythicDefinitions[`mb.${name}`]={id:`mb.${name}`,version:1,label:{ru:labels[name][0],en:labels[name][1]},resolver:'independent',slots:[{id:'character',sides:12},{id:'form',sides:12}],tables:columns.ru.map((column,j)=>column.map((ru,i)=>({ru,en:columns.en[j][i]})))};
}
for(const name of ['myth','dwelling','sanctum','monument','hazard','curse','ruin','seer']){
 const texts:Texts[]=mythicCatalog.map(row=>name==='myth'?{ru:row.myth}:name==='seer'?{ru:row.seer,...(row.englishSeer?{en:row.englishSeer}:{})}:{ru:row.landmarks[name],...(row.englishLandmarks[name]?{en:row.englishLandmarks[name]}:{})});
 mythicDefinitions[`mb.${name}`]={id:`mb.${name}`,version:1,label:{ru:labels[name][0],en:labels[name][1]},resolver:'product',slots:[{id:'group',sides:6},{id:'entry',sides:12}],tables:[texts]};
}
export type TagMap={regions:{id:number;generationMode?:string;centerHex:{q:number;r:number};isTract?:boolean;suppressCentralPoi?:boolean;centralPoiKind?:string;pointsOfInterest:{q:number;r:number}[];pointOfInterestKinds?:Record<string,string>}[];rivers:{id:number}[];hexTerrainByKey:Map<string,{lakeId?:number}>};
const hkey=(h:{q:number;r:number})=>`${h.q},${h.r}`;
export function tagOwners(map:TagMap):Map<string,{owner:TagOwner;type:string}> {
 const owners=new Map<string,{owner:TagOwner;type:string}>();
 const add=(owner:TagOwner,type:string)=>owners.set(ownerKey(owner),{owner,type});
 for(const r of map.regions){add({kind:'region',id:r.id},'region');if(!r.isTract&&!r.suppressCentralPoi&&r.centralPoiKind)add({kind:'poi',regionId:r.id,hexKey:hkey(r.centerHex)},r.centralPoiKind);
 for(const h of r.pointsOfInterest)add({kind:'poi',regionId:r.id,hexKey:hkey(h)},r.pointOfInterestKinds?.[hkey(h)]??'');}
 for(const r of map.rivers)add({kind:'river',id:r.id},'river');
 for(const t of map.hexTerrainByKey.values())if(t.lakeId)add({kind:'lake',id:t.lakeId},'lake');return owners;
}
const holdingKinds=new Set(['throne','holding_castle','holding_city','holding_stronghold','holding_tower']);
// Keep existing mode names in one adapter instead of teaching the tag engine POI rules.
export function tagPolicy(type:string):{automatic:string[];optional:string[]} {
 if(holdingKinds.has(type))return {automatic:['holding','bailey','keep'],optional:['food','goods','luxuries']};
 if(type==='region')return {automatic:[],optional:['land','flora','fauna']};
 if(type==='river'||type==='lake')return {automatic:[],optional:['water']};
 const name=({ruins:'ruin',dwelling:'dwelling',sanctuary:'sanctum',monument:'monument',hazard:'hazard',curse:'curse',myth:'myth'} as Record<string,string>)[type];
 if(!name)return {automatic:[],optional:[]};
 const optional=(['dwelling','monument','hazard','ruin'].includes(name)?['feature']:[]).concat(['monument','sanctum'].includes(name)?['wonder']:[]).concat(name==='curse'?['otherworld']:[]);
 return {automatic:name==='sanctum'?['sanctum','seer']:[name],optional};
}
export function reconcileTags(state:TagState,map:TagMap,before:TagMap,seed:number,generate:boolean):TagState {
 const owners=tagOwners(map),old=tagOwners(before);let result=pruneTags(state,new Set(owners.keys()));
 if(generate)for(const [key,{owner,type}] of owners){if(old.get(key)?.type===type)continue;
 for(const name of tagPolicy(type).automatic){const def=mythicDefinitions[`mb.${name}`];if(!findTag(result,owner,def.id))result=rollTag(result,owner,def,seed);}}
 return result;
}
export function fillMythicTags(state:TagState,map:TagMap,seed:number):TagState {
 let next=state;for(const {owner,type} of tagOwners(map).values())for(const name of tagPolicy(type).automatic){const def=mythicDefinitions[`mb.${name}`];if(!findTag(next,owner,def.id))next=rollTag(next,owner,def,seed);}return next;
}
export {emptyTags};
