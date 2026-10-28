import { generationValidationPath } from './worldRandom.ts';
// Structural validation only: accepting a save never reroutes its rivers or roads.
// App supplies its current enums and kingdom contract to avoid a second domain model.
type RecordValue = Record<string, unknown>;
type Hex = { q: number; r: number };
type Vertex = { key: string; x: number; y: number };
export class SaveValidationError extends Error {
  path: string;
  reason: string;
  constructor(path: string, reason: string) { super(`${path}: ${reason}`); this.path=path; this.reason=reason; }
}
const fail = (path: string, reason: string): never => { throw new SaveValidationError(path, reason); };
const record = (v: unknown, p: string): RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : fail(p, 'object');
const array = (v: unknown, p: string): unknown[] => Array.isArray(v) ? v : fail(p, 'array');
const text = (v: unknown, p: string): string => typeof v === 'string' ? v : fail(p, 'string');
const finite = (v: unknown, p: string, min = -Infinity, max = Infinity): number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fail(p, 'finite number in range');
const integer = (v: unknown, p: string, min = 1): number => Number.isSafeInteger(v) && (v as number) >= min ? v as number : fail(p, 'safe integer in range');
const bool = (v: unknown, p: string) => { if (typeof v !== 'boolean') fail(p, 'boolean'); };
const oneOf = (v: unknown, choices: readonly unknown[], p: string) => { if (!choices.includes(v)) fail(p, 'unknown value'); };
const hex = (v: unknown, p: string): Hex => { const h = record(v, p); integer(h.q, p+'.q', -Number.MAX_SAFE_INTEGER); integer(h.r, p+'.r', -Number.MAX_SAFE_INTEGER); return h as Hex; };
const key = (h: Hex) => `${h.q},${h.r}`;
const hexKey = (v: string, p: string): string => { const [q,r] = v.split(',').map(Number); if (!Number.isSafeInteger(q) || !Number.isSafeInteger(r) || `${q},${r}` !== v) fail(p, 'canonical axial key'); return v; };
const vertex = (v: unknown, p: string): Vertex => { const a = record(v,p); text(a.key,p+'.key'); finite(a.x,p+'.x'); finite(a.y,p+'.y'); if (a.key !== `${Math.round((a.x as number)*1000)/1000},${Math.round((a.y as number)*1000)/1000}`) fail(p+'.key','vertex coordinates'); return a as Vertex; };
const vertices = (v: unknown, p: string) => array(v,p).map((x,i)=>vertex(x,`${p}[${i}]`));
const edge = (a: Vertex,b: Vertex) => [a.key,b.key].sort().join('|');
const segment = (a: Hex,b: Hex) => [key(a),key(b)].sort().join('|');
function uniqueIds(values: unknown[], p: string) {
  const ids = new Set<number>();
  for (const [i,v] of values.entries()) { const id=integer(record(v,`${p}[${i}]`).id,`${p}[${i}].id`); if(ids.has(id)) fail(`${p}[${i}].id`,'duplicate id'); ids.add(id); }
  return ids;
}
function reference(v: unknown, ids: Set<number>, p: string) { if (!ids.has(integer(v,p))) fail(p,'missing reference'); }
// Check a generated proposal before any map/history setter, including internal
// Mythic steps. A safe imported ID can still overflow on the next allocation.
export function assertGeneratedIds(map: {
  regions: {id: number}[]; rivers: {id: number}[]; roads: {id: number}[];
  kingdoms?: {id: number}[]; hexTerrainByKey: Map<string, {lakeId?: number}>;
  nextLakeId: number; nextRoadId: number;
}): void {
  for (const field of ['regions','rivers','roads','kingdoms'] as const) uniqueIds(map[field] ?? [], 'map.'+field);
  for (const field of ['nextLakeId','nextRoadId'] as const) integer(map[field], 'counters.'+field);
  // Save import normalizes these two counters to max(existing)+1.
  for (const road of map.roads) if (road.id === Number.MAX_SAFE_INTEGER) fail('counters.nextRoadId','counter overflow');
  for (const [key, terrain] of map.hexTerrainByKey) if (terrain.lakeId !== undefined) {
    integer(terrain.lakeId, 'map.terrainByHexKey.'+key+'.lakeId');
    if (terrain.lakeId === Number.MAX_SAFE_INTEGER) fail('counters.nextLakeId','counter overflow');
  }
}
export function validateSaveStructure(value: unknown, domain: {
  biome: (v: unknown)=>boolean; poi: (v: unknown)=>boolean; centralPoi: (v: unknown)=>boolean; waterPoi: (v: unknown)=>boolean;
  names: (v: unknown)=>boolean; toponymModel: string; kingdoms: (map: RecordValue)=>void;
}): void {
  const data=record(value,'$');
  oneOf(data.schema,['hexcrawl-map'],'schema'); oneOf(data.version,[2,3,4],'version');
  if (data.version === 3 || data.version === 4 || data.generation !== undefined) { const path = generationValidationPath(data.generation); if (path) fail(path,'unsupported or invalid RNG state'); }
  const map=record(data.map,'map'), ui=record(data.ui,'ui'), counters=record(data.counters,'counters');
  const regions=array(map.regions,'map.regions'), rivers=array(map.rivers,'map.rivers'), roads=array(map.roads,'map.roads');
  const regionIds=uniqueIds(regions,'map.regions'), riverIds=uniqueIds(rivers,'map.rivers'), roadIds=uniqueIds(roads,'map.roads');
  const land=new Set<string>();
  for (const [i,v] of regions.entries()) {
    const p=`map.regions[${i}]`, r=record(v,p), own=new Set<string>();
    for (const [j,h] of array(r.hexes,p+'.hexes').entries()) {
      const k=key(hex(h,`${p}.hexes[${j}]`)); if(own.has(k)||land.has(k)) fail(`${p}.hexes[${j}]`,'duplicate ownership'); own.add(k); land.add(k);
    }
    if(!own.size) fail(p+'.hexes','empty region');
    for(const f of ['centerHex','anchorHex']) if(!own.has(key(hex(r[f],p+'.'+f)))) fail(p+'.'+f,'outside region');
    integer(r.targetSize,p+'.targetSize'); integer(r.finalSize,p+'.finalSize');
    oneOf(r.sizeCategory,['tract','locality','small_region','region','large_region','land','vast_land'],p+'.sizeCategory');
    oneOf(r.sizeLabel,['Урочище','Местность','Малый регион','Регион','Большой регион','Край','Обширный край'],p+'.sizeLabel');
    oneOf(r.biomeLandType,['settled','wild'],p+'.biomeLandType'); oneOf(r.heightLevel,[1,2,3],p+'.heightLevel');
    if(!domain.biome(r.biomeId)) fail(p+'.biomeId','unknown biome');
    for(const f of ['biomeLabel','biomePrimaryEmoji','biomeEmojiLabel']) text(r[f],p+'.'+f);
    array(r.biomeSecondaryEmojis,p+'.biomeSecondaryEmojis').forEach((s,j)=>text(s,`${p}.biomeSecondaryEmojis[${j}]`));
    if(r.generationMode!==undefined) oneOf(r.generationMode,['classic','mythic'],p+'.generationMode');
    if(r.kingdomId!==undefined) integer(r.kingdomId,p+'.kingdomId');
    if(r.woodlandStyle!==undefined && !['islands','clearings'].includes(r.woodlandStyle as string)) fail(p+'.woodlandStyle','Некорректный вариант редколесья');
    for(const f of ['suppressCentralPoi','isCoastal','isTract']) if(r[f]!==undefined) bool(r[f],p+'.'+f);
    const poi=new Set<string>();
    for(const [j,h] of array(r.pointsOfInterest,p+'.pointsOfInterest').entries()) {
      const k=key(hex(h,`${p}.pointsOfInterest[${j}]`)); if(!own.has(k)||poi.has(k)) fail(`${p}.pointsOfInterest[${j}]`,'outside region or duplicate'); poi.add(k);
    }
    if(r.centralPoiKind!==undefined&&!domain.centralPoi(r.centralPoiKind)) fail(p+'.centralPoiKind','unknown POI');
    if(r.pointOfInterestKinds!==undefined) for(const [k,kind] of Object.entries(record(r.pointOfInterestKinds,p+'.pointOfInterestKinds'))) {
      hexKey(k,p+'.pointOfInterestKinds'); if(!poi.has(k)||!domain.poi(kind)) fail(p+'.pointOfInterestKinds.'+k,'invalid POI');
    }
    if(r.riverSlope!==undefined) {
      const s=record(r.riverSlope,p+'.riverSlope');
      for(const f of ['radius','edgeCount']) integer(s[f],p+'.riverSlope.'+f,0);
      for(const f of ['totalContribution','strength','confidence']) finite(s[f],p+'.riverSlope.'+f,0);
      const vector=record(s.vector,p+'.riverSlope.vector'); finite(vector.x,p+'.riverSlope.vector.x'); finite(vector.y,p+'.riverSlope.vector.y');
      const dirs=['E','NE','NW','W','SW','SE']; oneOf(s.direction,[...dirs,'none'],p+'.riverSlope.direction');
      const scores=record(s.directionScores,p+'.riverSlope.directionScores'); for(const d of dirs) finite(scores[d],p+'.riverSlope.directionScores.'+d);
    }
  }
  // Preserve all existing kingdom/obstacle checks. Errors stay field-scoped.
  try { domain.kingdoms(map); } catch { fail('map.kingdoms/obstacles','invalid kingdom layers'); }
  const terrain=record(map.terrainByHexKey,'map.terrainByHexKey'); let maxLake=0;
  for(const [k,v] of Object.entries(terrain)) {
    const p='map.terrainByHexKey.'+k; hexKey(k,p); const t=record(v,p);
    if(t.terrainOverride!==undefined) oneOf(t.terrainOverride,['lake','sea'],p+'.terrainOverride');
    if(t.lakeId!==undefined) maxLake=Math.max(maxLake,integer(t.lakeId,p+'.lakeId'));
  }
  if (map.gmNotesByHexKey !== undefined) {
    for (const [k,v] of Object.entries(record(map.gmNotesByHexKey, 'map.gmNotesByHexKey'))) {
      const p = 'map.gmNotesByHexKey[' + JSON.stringify(k) + ']';
      hexKey(k,p); text(v,p);
      if (!land.has(k) && !Object.prototype.hasOwnProperty.call(terrain,k)) fail(p,'note requires an existing hex');
    }
  }
  for(const f of ['waterPoiByHexKey','biomeOverrideByHexKey']) if(map[f]!==undefined) for(const [k,v] of Object.entries(record(map[f],'map.'+f))) {
    const p='map.'+f+'.'+k; hexKey(k,p);
    if(f==='waterPoiByHexKey') { const t=terrain[k]; if(!domain.waterPoi(v)||!t||!['lake','sea'].includes((t as RecordValue).terrainOverride as string)) fail(p,'water POI requires water'); }
    else if(!land.has(k)||!domain.biome(v)) fail(p,'biome requires region hex');
  }
  if(map.candidateHexes!==undefined) array(map.candidateHexes,'map.candidateHexes').forEach((h,i)=>hex(h,`map.candidateHexes[${i}]`));
  const roadSegments=new Map<number,Set<string>>();
  for(const [i,v] of roads.entries()) {
    const p=`map.roads[${i}]`, r=record(v,p); reference(r.regionId,regionIds,p+'.regionId'); const segments=new Set<string>();
    for(const [j,v] of array(r.segments,p+'.segments').entries()) {
      const sp=`${p}.segments[${j}]`, s=record(v,sp), a=hex(s.from,sp+'.from'), b=hex(s.to,sp+'.to');
      const dq=a.q-b.q,dr=a.r-b.r; if(Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr))!==1) fail(sp,'adjacent distinct hexes');
      oneOf(s.kind,['road','trail'],sp+'.kind'); segments.add(segment(a,b));
      // ROAD allows candidate endpoints; do not restrict a road to its owner region.
      for(const h of [a,b]) if(!land.has(key(h))&&![[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].some(([q,r])=>land.has(key({q:h.q+q,r:h.r+r})))) fail(sp,'missing road endpoint');
    }
    roadSegments.set(r.id as number,segments);
  }
  const riverEdges=new Map<number,Set<string>>();
  for(const [i,v] of rivers.entries()) {
    const p=`map.rivers[${i}]`, r=record(v,p); reference(r.regionId,regionIds,p+'.regionId');
    if(r.deltaParentRiverId!==undefined) { reference(r.deltaParentRiverId,riverIds,p+'.deltaParentRiverId'); if(r.deltaParentRiverId===r.id) fail(p+'.deltaParentRiverId','self reference'); }
    const path=vertices(r.vertexPath,p+'.vertexPath'), keys=new Set(path.map(v=>v.key));
    const edges=new Set(path.slice(1).map((v,j)=>edge(path[j],v))); riverEdges.set(r.id as number,edges);
    const sectorIds=new Set<string>();
    for(const [j,v] of array(r.sectors,p+'.sectors').entries()) {
      const sp=`${p}.sectors[${j}]`, s=record(v,sp), id=text(s.id,sp+'.id');
      if(sectorIds.has(id)) fail(sp+'.id','duplicate id'); sectorIds.add(id);
      if(String(s.riverId)!==String(r.id)) fail(sp+'.riverId','parent river');
      integer(s.sectorIndex,sp+'.sectorIndex'); if(![1,2,3,4,5].includes(s.fullness as number)) fail(sp+'.fullness','Полноводность реки должна быть целым числом от 1 до 5');
      oneOf(s.startReason,['river_start','river_confluence','lake','region_boundary','split','unknown'],sp+'.startReason');
      oneOf(s.endReason,['river_confluence','lake','region_boundary','split','unknown','river_end'],sp+'.endReason');
      if(s.assignedRegionId!==undefined) reference(s.assignedRegionId,regionIds,sp+'.assignedRegionId');
      const vs=vertices(s.vertexPath,sp+'.vertexPath'); if(!vs.length||vs.some(v=>!keys.has(v.key))) fail(sp+'.vertexPath','parent path');
      if(s.startVertexKey!==vs[0].key||s.endVertexKey!==vs[vs.length-1]?.key) fail(sp,'sector endpoints');
      const se=array(s.edgeKeys,sp+'.edgeKeys'); if(se.length!==Math.max(0,vs.length-1)||se.some((e,n)=>e!==edge(vs[n],vs[n+1])||!edges.has(e as string))) fail(sp+'.edgeKeys','parent edges');
    }
    if(r.controlPoints!==undefined) {
      const c=record(r.controlPoints,p+'.controlPoints'); oneOf(c.startMode,['existing river endpoint','red vertex','mountain source'],p+'.controlPoints.startMode');
      for(const f of ['startVertex','endVertex','middlePurpleVertex']) if(c[f]!==undefined||f!=='middlePurpleVertex') if(!keys.has(vertex(c[f],p+'.controlPoints.'+f).key)) fail(p+'.controlPoints.'+f,'parent path');
    }
  }
  const crossingKeys=new Set<string>();
  for(const [i,v] of array(map.crossings,'map.crossings').entries()) {
    const p=`map.crossings[${i}]`, c=record(v,p), k=text(c.key,p+'.key'); if(crossingKeys.has(k)) fail(p+'.key','duplicate key'); crossingKeys.add(k);
    reference(c.roadId,roadIds,p+'.roadId'); reference(c.riverId,riverIds,p+'.riverId'); oneOf(c.kind,['bridge','ferry','ford'],p+'.kind');
    if(!roadSegments.get(c.roadId as number)!.has(text(c.roadSegmentKey,p+'.roadSegmentKey'))) fail(p+'.roadSegmentKey','missing road segment');
    if(!riverEdges.get(c.riverId as number)!.has(text(c.riverEdgeKey,p+'.riverEdgeKey'))) fail(p+'.riverEdgeKey','missing river edge');
  }
  if(map.toponyms!==undefined) { const n=record(map.toponyms,'map.toponyms'); integer(n.seed,'map.toponyms.seed',0); finite(n.seed,'map.toponyms.seed',0,0xffffffff); oneOf(n.model,[domain.toponymModel],'map.toponyms.model'); if(!domain.names(n.names)) fail('map.toponyms.names','invalid names'); }
  for(const [f,max] of [['nextLakeId',maxLake],['nextRoadId',Math.max(0,...roadIds)]] as const) { integer(counters[f],'counters.'+f); if(max===Number.MAX_SAFE_INTEGER) fail('counters.'+f,'counter overflow'); }
  bool(ui.isMapRotated,'ui.isMapRotated'); if(finite(ui.mapScale,'ui.mapScale')<=0) fail('ui.mapScale','positive scale');
  if(ui.generationMode!==undefined) oneOf(ui.generationMode,['classic','mythic'],'ui.generationMode');
  if(ui.selectedHex!==undefined&&ui.selectedHex!==null) hex(ui.selectedHex,'ui.selectedHex');
}
