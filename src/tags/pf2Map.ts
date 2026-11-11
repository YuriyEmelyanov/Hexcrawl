import {createDetailGrid,detailCellCenter,detailCellPolygon,worldToDetailCell,detailPositiveAreaIntersections,type DetailCell} from '../detailGrid.ts';
import {physicalUnitCell,physicalUnitCenter,physicalUnitWidth} from '../physicalUnit.ts';
import {emptyFeaturePreparation,featureContext,fillFeaturePreparation,validateFeaturePreparation,type FeaturePreparation,type FeatureCandidate,type PreparedFeature} from './pf2Features.ts';
type Region={id:number;hexes:DetailCell[];biomeId:string;centerHex:DetailCell;pointsOfInterest:DetailCell[];centralPoiKind?:string;suppressCentralPoi?:boolean;isTract?:boolean};
export type FeatureMap={regions:Region[];hexTerrainByKey:Map<string,{terrainOverride?:'lake'|'sea';lakeId?:number}>;biomeOverrideByHexKey:Map<string,string>;waterPoiByKey:Map<string,unknown>;gmNotesByHexKey:Record<string,string>;editorNames?:Record<string,unknown>;tags?:{instances:readonly {owner:{kind:string;id?:number;regionId?:number;hexKey?:string}}[]};rivers?:readonly {id:number;regionId?:number}[];seas?:readonly {id:number;hexKeys:readonly string[]}[];physicalGrid?:{grid:{origin:{x:number;y:number}};source:{physicalConvention:string};poiFootprints:readonly {cells:readonly DetailCell[]}[]};featurePreparation?:FeaturePreparation};
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
 const protectRegion=(id:number)=>{const r=map.regions.find(r=>r.id===id);if(r)for(const c of r.hexes)protect(c);};
 const protectOwner=(kind:string,id?:number,hexKey?:string)=>{
  if(hexKey){const[q,r]=hexKey.split(',').map(Number);protect({q,r});return;}
  if(kind==='region'&&id!==undefined){protectRegion(id);return;}
  if(kind==='river'&&id!==undefined){const r=map.rivers?.find(r=>r.id===id);if(r?.regionId!==undefined){protectRegion(r.regionId);return;}}
  if(kind==='lake'&&id!==undefined){for(const[k,t]of map.hexTerrainByKey)if(t.lakeId===id){const[q,r]=k.split(',').map(Number);protect({q,r});}return;}
  if(kind==='sea'&&id!==undefined){for(const k of map.seas?.find(s=>s.id===id)?.hexKeys??[]){const[q,r]=k.split(',').map(Number);protect({q,r});}return;}
  // An accepted authored owner without a proven spatial mapping is protected
  // conservatively, rather than guessed away or silently overwritten.
  for(const {cell}of live.values())protect(cell);
 };
 for(const t of map.tags?.instances??[])protectOwner(t.owner.kind,t.owner.id,t.owner.hexKey);
 for(const k of Object.keys(map.editorNames??{})){const parts=k.split(':');if(parts[0]==='poi')protectOwner('poi',undefined,parts[2]);else if(parts[0]==='waterPoi')protectOwner('waterPoi',undefined,parts[1]);else protectOwner(parts[0],Number(parts[1]));}
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
/** Loss planning uses accepted snapshots, never re-rolls or rewrites a survivor.
 * Removed and standard ledger entries deliberately survive outside territory. */
export function featureLossesForMap(layer:FeaturePreparation|undefined,map:FeatureMap):PreparedFeature[]{
 if(!layer)return[];validateFeaturePreparation(layer);const source=sourceGrid(map),live=cells(map);
 return Object.values(layer.features).filter(f=>{const c=worldToDetailCell(source,f.worldAnchor),r=live.get(key(c));if(!r)return true;return featureContext(r.biome,map.hexTerrainByKey.get(key(c))?.terrainOverride??'land')!==f.context;});
}
export function retainFeaturePreparation(layer:FeaturePreparation|undefined,map:FeatureMap):FeaturePreparation|undefined {
 if(!layer)return undefined;const losses=featureLossesForMap(layer,map);if(!losses.length)return layer;const next=structuredClone(layer);
 for(const f of losses){delete next.features[String(f.id)];next.units[f.unitKey]={...next.units[f.unitKey],featureId:null,disposition:'removed'};}
 validateFeaturePreparation(next);return next;
}
