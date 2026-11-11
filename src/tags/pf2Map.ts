import {createDetailGrid,detailCellCenter,detailCellPolygon,worldToDetailCell,detailPositiveAreaIntersections,type DetailCell} from '../detailGrid.ts';
import {physicalUnitCell,physicalUnitCenter,physicalUnitWidth} from '../physicalUnit.ts';
import {emptyFeaturePreparation,featureContext,fillFeaturePreparation,validateFeaturePreparation,type FeaturePreparation,type FeatureCandidate} from './pf2Features.ts';
type Region={id:number;hexes:DetailCell[];biomeId:string;centerHex:DetailCell;pointsOfInterest:DetailCell[];centralPoiKind?:string;suppressCentralPoi?:boolean;isTract?:boolean};
export type FeatureMap={regions:Region[];hexTerrainByKey:Map<string,{terrainOverride?:'lake'|'sea'}>;biomeOverrideByHexKey:Map<string,string>;waterPoiByKey:Map<string,unknown>;gmNotesByHexKey:Record<string,string>;physicalGrid?:{grid:{origin:{x:number;y:number}};source:{physicalConvention:string};poiFootprints:readonly {cells:readonly DetailCell[]}[]};featurePreparation?:FeaturePreparation};
const key=(c:DetailCell)=>`${c.q},${c.r}`;
function sourceGrid(map:FeatureMap){return createDetailGrid(6,map.physicalGrid?.grid.origin??{x:0,y:0});}
function cells(map:FeatureMap){const result=new Map<string,{cell:DetailCell;biome:string}>();for(const r of map.regions)for(const c of r.hexes)result.set(key(c),{cell:c,biome:map.biomeOverrideByHexKey.get(key(c))??r.biomeId});for(const [k,t]of map.hexTerrainByKey)if(t.terrainOverride&&!result.has(k)){const [q,r]=k.split(',').map(Number);if(!Number.isSafeInteger(q)||!Number.isSafeInteger(r)||key({q,r})!==k)throw Error('Invalid PF2 territory key');result.set(k,{cell:{q,r},biome:''});}return result;}
export function featureLayerForMap(map:FeatureMap):FeaturePreparation {
 return map.featurePreparation??emptyFeaturePreparation(map.physicalGrid?.grid.origin??{x:0,y:0},map.physicalGrid?.source.physicalConvention==='known_across_flats'?'known':'project_assumption');
}
export function featureCandidatesForMap(map:FeatureMap,layer=featureLayerForMap(map)):FeatureCandidate[]{
 validateFeaturePreparation(layer);const source=sourceGrid(map),live=cells(map),units=new Map<string,DetailCell>(),protectedUnits=new Set<string>();
 // Every source hex is smaller than one PF2 cell's inradius: a PF2 centre
 // inside a source hex is the nearest PF2 centre to that source hex's centre.
 for(const {cell}of live.values()){const c=physicalUnitCell(layer.physicalUnit,detailCellCenter(source,cell));units.set(key(c),c);}
 const protect=(c:DetailCell)=>protectedUnits.add(key(physicalUnitCell(layer.physicalUnit,detailCellCenter(source,c))));
 for(const r of map.regions){if(!r.isTract&&!r.suppressCentralPoi&&r.centralPoiKind)protect(r.centerHex);for(const c of r.pointsOfInterest)protect(c);}
 for(const k of [...map.waterPoiByKey.keys(),...Object.keys(map.gmNotesByHexKey).filter(k=>!!map.gmNotesByHexKey[k])]){const[q,r]=k.split(',').map(Number);protect({q,r});}
 if(map.physicalGrid){const width=physicalUnitWidth(layer.physicalUnit),origin=layer.physicalUnit.origin;
  for(const f of map.physicalGrid.poiFootprints)for(const c of f.cells){const polygon=detailCellPolygon(createDetailGrid(1,map.physicalGrid.grid.origin),c).map(p=>({x:(p.x-origin.x)/width,y:(p.y-origin.y)/width}));for(const hit of detailPositiveAreaIntersections(createDetailGrid(1),polygon))protectedUnits.add(key(hit.cell));}
 }
 return [...units].sort(([a],[b])=>a.localeCompare(b)).flatMap(([k,c])=>{
  const centre=physicalUnitCenter(layer.physicalUnit,c),sourceCell=worldToDetailCell(source,centre),record=live.get(key(sourceCell));if(!record)return[];
  const water=map.hexTerrainByKey.get(key(sourceCell))?.terrainOverride??'land';return[{...c,context:featureContext(record.biome,water),protected:protectedUnits.has(k)}];
 });
}
export function assertFeatureMap(map:FeatureMap):void {
 if(!map.featurePreparation)return;const layer=map.featurePreparation;validateFeaturePreparation(layer);
 const expected=map.physicalGrid?.grid.origin??{x:0,y:0};if(layer.physicalUnit.origin.x!==expected.x||layer.physicalUnit.origin.y!==expected.y)throw Error('PF2 origin differs from accepted map');
 if(layer.coordinateBasis==='known'&&map.physicalGrid?.source.physicalConvention!=='known_across_flats')throw Error('Unproven PF2 coordinate basis');
 const source=sourceGrid(map),live=cells(map);
 for(const f of Object.values(layer.features)){const c=worldToDetailCell(source,f.worldAnchor),r=live.get(key(c));if(!r)throw Error('PF2 feature outside created territory');const water=map.hexTerrainByKey.get(key(c))?.terrainOverride??'land';if(featureContext(r.biome,water)!==f.context)throw Error('PF2 feature loses accepted environment');}
}
export function fillFeatureMap<T extends FeatureMap>(map:T,seed:number):T {
 assertFeatureMap(map);const before=featureLayerForMap(map),next=fillFeaturePreparation(before,featureCandidatesForMap(map,before),seed);
 if(next===before)return map;const result={...map,featurePreparation:next};assertFeatureMap(result);return result;
}
