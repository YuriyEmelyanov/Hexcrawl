/** Versioned exact canonical input signature. This is not a probabilistic hash
 * or public16 parser: full content equality avoids hash collisions. */
import type {prepareRefinementGeographyPreview} from './geometryRefinementPreview.ts';
import type {EditableRoad} from './manualRoads.ts';
import type {Detail1State} from './detailModel.ts';
import {detailPoiWaterRequirement} from './detailGeography.ts';
import {poiNameLocators,hasCentralPoi} from './manualPois.ts';
import {normalizeRefinementRiverSource} from './geometryRefinementSource.ts';
type Input=Parameters<typeof prepareRefinementGeographyPreview>[0];
export function refinementInputFingerprint(input:Input,state:Detail1State,consumeWork?:(units:number)=>void):string {
 let nodes=0;
 const canonical=(v:unknown):string=>{consumeWork?.(1);if(++nodes>1000000)throw Error('fingerprint_capacity');if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);if(typeof v==='number'){if(!Number.isFinite(v))throw Error('nonfinite_fingerprint_input');return JSON.stringify(v);}if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).filter(k=>(v as Record<string,unknown>)[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';throw Error('invalid_fingerprint_input');};
 const ordered=<T>(a:readonly T[])=>a.map(value=>({value,key:canonical(value)})).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0).map(x=>x.value);
 const source=normalizeRefinementRiverSource({rivers:input.map.rivers,marks:input.marks,origin:input.origin});if(source.status==='error')throw Error('invalid_fingerprint_source');
 const aliases=[...poiNameLocators({regions:[...input.map.regions],waterPoiByKey:new Map(input.map.waterPoiByKey)},true)].sort();
 const owners=aliases.map(alias=>{const site=input.map.knave?.content?.byPoi[alias]?.site,requirement=detailPoiWaterRequirement(input.map,alias),parts=alias.split(':'),region=input.map.regions.find(r=>r.id===Number(parts[1])),coordinate=parts[parts.length-1],central=region&&`${region.centerHex.q},${region.centerHex.r}`===coordinate&&hasCentralPoi(region);return {alias,id:state.poiIdentities?.byLegacyRef[alias],type:alias.startsWith('waterPoi:')?input.map.waterPoiByKey.get(coordinate):central?region?.centralPoiKind:region?.pointOfInterestKinds?.[coordinate],sourceRow:site?{table:site.table,sourceRow:site.sourceRow}:null,requirement:{...requirement,predicates:[...requirement.predicates].sort()}};});
 const footprints=ordered(state.poiFootprints.map(f=>{const {note:ignored,...extent}=f.extent as typeof f.extent&{note?:string};return {...f,extent,cells:ordered(f.cells),attachments:ordered(f.attachments)};}));
 const roads=ordered((input.map.roads as readonly EditableRoad[]).map(r=>({id:r.id,regionId:r.regionId,segments:ordered(r.segments.map(s=>({kind:s.kind,ends:ordered([s.from,s.to])})))})));
 const crossings=ordered(input.map.crossings.map(c=>({key:c.key,roadId:c.roadId,roadSegmentKey:c.roadSegmentKey,riverId:c.riverId,riverEdgeKey:c.riverEdgeKey,kind:c.kind})));
 const liveRivers=ordered(input.liveRivers.map(r=>({id:r.id,edges:ordered(r.edges.map(e=>({id:e.id,segment:e.segment,rapid:e.rapid,crossings:ordered(e.crossings.map(c=>({id:c.id,kind:c.kind,point:c.point})))}))),starts:ordered(r.starts),waterfalls:ordered(r.waterfalls)})));
 const lakes=ordered(input.riverPlan.lakes.map(l=>({lakeId:l.lakeId,modes:Object.fromEntries(Object.entries(l.modes).map(([mode,s])=>[mode,{signature:s.signature,loops:ordered(s.loops.map((curves,i)=>({depth:s.depths[i],curves})))}]))})));
 const waterTerrain=ordered([...input.map.hexTerrainByKey].filter(([,v])=>['lake','sea'].includes(v.terrainOverride??'')).map(([key,v])=>({key,kind:v.terrainOverride,lakeId:v.lakeId}))),seas=ordered(input.map.seas.map(s=>({id:s.id,hexKeys:[...s.hexKeys].sort()}))),regions=ordered(input.map.regions.map(r=>({id:r.id,centerHex:r.centerHex,hexes:ordered(r.hexes)})));
 const preparedFeatures={rapids:ordered(input.riverPlan.rapids),waterfalls:ordered(input.riverPlan.waterfalls.map(m=>({...m,incidences:ordered(m.incidences)}))),ports:ordered(input.riverPlan.ports)};
 const payload={version:1,preparedFeatures,waterTerrain,seas,regions,algorithmVersion:'geo2-v1',origin:input.origin,sourceSignature:source.sourceSignature,preparedSourceSignature:input.riverPlan.source.sourceSignature,preparedPaths:ordered(input.riverPlan.paths),water:ordered(input.riverPlan.water.capsules),paintWater:ordered(input.riverPlan.paintWater.capsules),lakes,liveRivers,landCells:ordered([...new Map(input.landCells.map(c=>[`${c.q},${c.r}`,c])).values()]),owners,footprints,identityRefs:state.poiIdentities?.byLegacyRef,grid:state.grid,sourceUnits:state.source,roads,crossings,lockedPoiIds:[...(input.lockedPoiIds??[])].sort()};
 const result='geo2-source-input-v1:'+canonical(payload);if(result.length>2000000)throw Error('fingerprint_capacity');return result;
}
