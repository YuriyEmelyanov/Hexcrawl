import {key, type Hex} from './kingdoms.ts';
export type Edge = {from:{x:number;y:number;key:string};to:{x:number;y:number;key:string};neighborHex:Hex;edgeKey:string};
export type Obstacle = {kingdomId:number;hex:Hex;neighborHex:Hex;edgeKey:string};
export function createObstacles(kingdomId:number, hexes:Hex[], edges:(h:Hex)=>Edge[], height:(h:Hex)=>number, water:(h:Hex)=>boolean, riverEdges:Set<string>, roadPairs:Set<string>):Obstacle[] {
  const area=new Set(hexes.map(key)),seen=new Set<string>();
  const candidates:{obstacle:Obstacle;rank:number}[]=[];
  for(const hex of hexes) for(const edge of edges(hex)) {
    if(seen.has(edge.edgeKey)||!area.has(key(edge.neighborHex)))continue;
    seen.add(edge.edgeKey);
    if(water(hex)||water(edge.neighborHex)||riverEdges.has(edge.edgeKey)||roadPairs.has(pairKey(hex,edge.neighborHex)))continue;
    const a=height(hex),b=height(edge.neighborHex),weight=a!==b?4:a;
    if(weight>0)candidates.push({obstacle:{kingdomId,hex,neighborHex:edge.neighborHex,edgeKey:edge.edgeKey},rank:-Math.log(Math.max(Number.MIN_VALUE,Math.random()))/weight});
  }
  if(candidates.length<24)throw new Error('Недостаточно свободных рёбер для 24 препятствий.');
  return candidates.sort((a,b)=>a.rank-b.rank).slice(0,24).map(x=>x.obstacle);
}
export const pairKey=(a:Hex,b:Hex)=>[key(a),key(b)].sort().join('|');
