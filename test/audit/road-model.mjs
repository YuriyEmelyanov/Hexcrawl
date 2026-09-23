// Observations of current behaviour, not acceptance tests approving defects.
// Run: node test/audit/road-model.mjs > docs/audit/road-model-observations.jsonl
import fs from 'node:fs';
import { createGenerationHarness } from '../helpers/generation-harness.mjs';
const key = h => `${h.q},${h.r}`;
const segmentKey = s => [key(s.from),key(s.to)].sort().join('|')+':'+s.kind;
const edges = roads => new Set(roads.flatMap(r=>r.segments.map(segmentKey)));
const emit = x => console.log(JSON.stringify(x));
const summary={clicks:0,tracts:0,interiorDeadEnds:0,sealedDeadEnds:0,belowRoadMinimum:0,tractsBelowSettledReference:0,belowWildTrailAttempts:0,oldSegmentsRemoved:0,oldInteriorSegmentsAdded:0,undoMismatch:0};
const saved=new Set();
function inspect(h,before,meta) {
 const a=h.render(), region=a.regions.at(-1), g=h.geometry;
 const occupied=new Map(a.regions.flatMap(r=>r.hexes.map(x=>[key(x),r.id])));
 const oldKeys=new Set(before.regions.flatMap(r=>r.hexes.map(key)));
 const meaningful=new Set(a.regions.flatMap(r=>[r.centerHex,...r.pointsOfInterest].map(key)));
 const graph=new Map(), hexes=new Map();
 for(const road of a.roads) for(const s of road.segments) {
  for(const [x,y] of [[s.from,s.to],[s.to,s.from]]) { const k=key(x);hexes.set(k,x);if(!graph.has(k))graph.set(k,new Set());graph.get(k).add(key(y)); }
 }
 const dead=[];
 for(const [k,neighbors] of graph) {
  if(neighbors.size!==1 || meaningful.has(k) || !occupied.has(k))continue;
  const adjacent=g.getHexNeighbors(hexes.get(k));
  if(adjacent.some(x=>!occupied.has(key(x)) && !['sea','lake'].includes(a.hexTerrainByKey.get(key(x))?.terrainOverride)))continue;
  const owner=occupied.get(k);
  dead.push({hex:k,regionId:owner,kind:adjacent.every(x=>occupied.get(key(x))===owner)?'interior':'sealed',pathKinds:[...new Set(a.roads.flatMap(r=>r.segments).filter(s=>key(s.from)===k||key(s.to)===k).map(s=>s.kind))]});
 }
 const oldEdges=edges(before.roads), newEdges=edges(a.roads);
 const removed=[...oldEdges].filter(x=>!newEdges.has(x));
 const addedOld=a.roads.flatMap(r=>r.segments).filter(s=>oldKeys.has(key(s.from))&&oldKeys.has(key(s.to))&&!oldEdges.has(segmentKey(s)));
 const mainRoadCount=a.roads.filter(r=>r.regionId===region.id&&r.segments.some(s=>s.kind==='road')).length;
 const trailCount=a.roads.filter(r=>r.regionId===region.id&&r.segments.some(s=>s.kind==='trail')).length;
 const roadMinimum=region.biomeLandType==='settled'?g.getSettledMainRoadLimit(region):null;
 const wildTrailAttempts=region.biomeLandType==='wild'&&!region.isTract?g.getWildRegionTrailBuildCount(region):null;
 summary.clicks++;summary.tracts+=!!region.isTract;
 summary.interiorDeadEnds+=dead.filter(d=>d.kind==='interior').length;
 summary.sealedDeadEnds+=dead.filter(d=>d.kind==='sealed').length;
 summary.belowRoadMinimum+=!region.isTract&&roadMinimum!==null&&mainRoadCount<roadMinimum;
 summary.tractsBelowSettledReference+=!!region.isTract&&roadMinimum!==null&&mainRoadCount<roadMinimum;
 summary.belowWildTrailAttempts+=wildTrailAttempts!==null&&trailCount<wildTrailAttempts;
 summary.oldSegmentsRemoved+=removed.length;summary.oldInteriorSegmentsAdded+=addedOld.length;
 const record={...meta,regionId:region.id,land:region.biomeLandType,size:region.hexes.length,sizeCategory:region.sizeCategory,tract:!!region.isTract,mainRoadCount,roadMinimum,trailCount,wildTrailAttempts,dead,removed,addedOld};
 emit(record);
 for(const issue of [dead.some(d=>d.kind==='interior')&&'interior',dead.some(d=>d.kind==='sealed')&&`sealed-${meta.coastalPreference}`,roadMinimum!==null&&mainRoadCount<roadMinimum&&(region.isTract?'tract-count':'road-minimum'),wildTrailAttempts!==null&&trailCount<wildTrailAttempts&&'trail-count']) {
  if(!issue||saved.has(issue))continue;
  saved.add(issue);const save=JSON.parse(JSON.stringify(a.createSaveData()));save.savedAt='2026-09-23T00:00:00.000Z';
  g.assertHexcrawlSaveData(save);
  fs.writeFileSync(new URL(`../../docs/audit/road-${issue}.json`,import.meta.url),JSON.stringify(save,null,2)+'\n');
 }
 const after=JSON.stringify(a.createSaveData().map);
 a.deleteLastRegion();
 if(JSON.stringify(h.render().createSaveData().map)!==JSON.stringify(before.map))summary.undoMismatch++;
 // Restore via the same snapshot shape as App's history; continue this sequence.
 h.render().restoreSnapshot({regions:a.regions,rivers:a.rivers,roads:a.roads,candidateHexes:a.candidateHexes,hexTerrainByKey:a.hexTerrainByKey,
 crossings:JSON.parse(after).crossings,waterPoiByKey:new Map(Object.entries(JSON.parse(after).waterPoiByHexKey)),biomeOverrideByHexKey:new Map(Object.entries(JSON.parse(after).biomeOverrideByHexKey)),...a.createSaveData().counters});
}
for(const seed of [7,42,103])for(const landType of ['settled','wild'])for(const coastalPreference of ['mainland','coast']) {
 const h=createGenerationHarness(seed),clicks=[];
 for(let step=0;step<6;step++) {
  const a=h.render();const candidates=a.candidateHexes;
  const anchor=candidates.length?candidates[seed===42?candidates.length-1:0]:{q:0,r:0};
  const options={landType,coastalPreference:step?coastalPreference:'mainland',targetSize:seed===103?35:15};
  clicks.push({anchor,options});const before={regions:a.regions,roads:a.roads,map:a.createSaveData().map};
  a.safelyAddRegionToMap(anchor,options);
  if(h.render().regions.length!==before.regions.length+1)throw Error('Click did not create a region');
  inspect(h,before,{kind:'click',seed,landType,coastalPreference,step,clicks:[...clicks]});
 }
}
emit({kind:'summary',...summary});
// Minimal, terrain-free fixtures isolate two suspicious helper rules.
const h=createGenerationHarness(1),g=h.geometry;
h.render().addFallbackTractToMap({q:20,r:20});
const region={...h.render().regions[0],id:2,hexes:[{q:0,r:0}],centerHex:{q:0,r:0},pointsOfInterest:[]};
const road={id:1,regionId:1,segments:[{from:{q:-2,r:0},to:{q:-1,r:0},kind:'road'}]};
emit({kind:'center-entry',expectedEntry:'0,0',actual:g.findIncomingRoadEndpointsForRegion(region,[road],new Map())});
const roads=[road,{id:2,regionId:2,segments:[{from:{q:0,r:0},to:{q:1,r:0},kind:'road'}]}];
emit({kind:'adjacent-without-connecting-segment',actualOpenEndpoints:[...g.getRoadEndpointHexKeysImpl(roads)],physicalDegreeOneEndpoints:['-2,0','-1,0','0,0','1,0']});
