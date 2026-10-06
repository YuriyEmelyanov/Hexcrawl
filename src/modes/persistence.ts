import {kingdomKeys,key,type Kingdom} from './kingdoms.ts';
import type {Obstacle} from './obstacles.ts';
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const hex=(x:unknown):x is {q:number;r:number}=>record(x)&&Number.isSafeInteger(x.q)&&Number.isSafeInteger(x.r);
export function validateKingdomLayers(map:Record<string,unknown>, edgeKeys:(h:{q:number;r:number})=>Set<string>):void {
  if(map.kingdoms!==undefined&&!Array.isArray(map.kingdoms))throw new Error('Некорректные королевства.');
  if(map.obstacles!==undefined&&!Array.isArray(map.obstacles))throw new Error('Некорректные препятствия.');
  const kingdoms=new Map<number,Kingdom>();
  const regions=map.regions as {id:number;kingdomId?:number;hexes:{q:number;r:number}[]}[];
  const owners=new Map(regions.map(r=>[r.id,r]));
  const areas=new Set<string>();
  for(const k of (map.kingdoms??[]) as unknown[]) {
    if(!record(k)||!Number.isSafeInteger(k.id)||(k.id as number)<1||!hex(k.origin)||!hex(k.anchor)||!record(k.name)||typeof k.name.ru!=='string'||typeof k.name.en!=='string'||typeof k.color!=='string'||!/^hsl\(\d+ 65% 68%\)$/.test(k.color)||!Array.isArray(k.regionIds)||k.regionIds.some(id=>!owners.has(id)||owners.get(id)?.kingdomId!==k.id)||new Set(k.regionIds).size!==k.regionIds.length||kingdoms.has(k.id as number))throw new Error('Некорректная запись королевства.');
    const kingdom=k as Kingdom;
    for(const h of kingdomKeys(kingdom.origin)) {if(areas.has(h))throw new Error('Королевства пересекаются.');areas.add(h);}
    kingdoms.set(kingdom.id,kingdom);
  }
  for(const region of regions)if(region.kingdomId!==undefined&&!kingdoms.get(region.kingdomId)?.regionIds.includes(region.id))throw new Error('Регион ссылается на отсутствующее королевство.');
  const seen=new Set<string>();
  for(const o of (map.obstacles??[]) as unknown[]) {
    if(!record(o)||!hex(o.hex)||!hex(o.neighborHex)||typeof o.edgeKey!=='string'||!edgeKeys(o.hex).has(o.edgeKey)||!edgeKeys(o.neighborHex).has(o.edgeKey)||!kingdoms.has(o.kingdomId as number)||seen.has(o.edgeKey))throw new Error('Некорректное ребро препятствия.');
    const obstacle=o as Obstacle, area=kingdomKeys(kingdoms.get(obstacle.kingdomId)!.origin);
    if(!area.has(key(obstacle.hex))||!area.has(key(obstacle.neighborHex)))throw new Error('Препятствие вне королевства.');
    seen.add(obstacle.edgeKey);
  }
}
