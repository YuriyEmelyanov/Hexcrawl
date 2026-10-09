import {forestFamily,isWoodland} from '../rendering/forestStyle.ts';
export type WoodlandStyle='islands'|'clearings';
type RegionLike={biomeId:string;anchorHex:{q:number;r:number};hexes:{q:number;r:number}[];woodlandStyle?:WoodlandStyle};
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
// Inspect the starting hex, rather than whichever neighbours are added later.
export function chooseWoodlandStyle(region:RegionLike,previous:RegionLike[],overrides:Map<string,string>):WoodlandStyle{
 if(region.woodlandStyle)return region.woodlandStyle;
 const adjacent=new Set(directions.map(([q,r])=>`${region.anchorHex.q+q},${region.anchorHex.r+r}`));
 return previous.some(old=>old.hexes.some(hex=>{
  const k=`${hex.q},${hex.r}`,biome=overrides.get(k)??old.biomeId;
  return adjacent.has(k)&&forestFamily(biome)&&!isWoodland(biome);
 }))?'clearings':'islands';
}
export function assignWoodlandStyle<T extends RegionLike>(region:T,previous:RegionLike[],overrides:Map<string,string>):T{
 return isWoodland(region.biomeId)?{...region,woodlandStyle:chooseWoodlandStyle(region,previous,overrides)}:region;
}
