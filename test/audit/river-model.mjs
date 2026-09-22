// Diagnostic observations, not acceptance tests endorsing the legacy behaviour.
// Run: node test/audit/river-model.mjs
import { createGenerationHarness } from '../helpers/generation-harness.mjs';
const h = createGenerationHarness(1), g = h.geometry;
console.log(JSON.stringify({kind:'confluence-helper',cases:[[1,1],[2,3],[3,2],[3,1],[4,3],[5,5]].map(([a,b])=>({a,b,out:g.getIncreasedRiverFullnessAfterTributary(a,b)}))}));
h.render().addFallbackTractToMap({q:0,r:0});
const template=h.render().regions[0];
const terrain=new Map();
const smallLake=g.addLakeAroundRiverSplitVertex({...template,hexes:[{q:0,r:0}]},g.getHexCornerPoints({q:0,r:0})[0],3,terrain);
console.log(JSON.stringify({kind:'lake-builder',requested:3,actual:smallLake?.hexes.length,returnedSuccess:smallLake!==null}));
for(const seed of [1,2,3,4,5]) for(const targetSize of [1,15]) {
 const x=createGenerationHarness(seed), geo=x.geometry;
 x.render().addFallbackTractToMap({q:-5,r:0});
 const t=x.render().regions[0], neighbor={q:-1,r:0},anchor={q:0,r:0};
 const ac=new Set(geo.getHexCornerPoints(anchor).map(v=>v.key)), cs=geo.getHexCornerPoints(neighbor);
 const i=cs.findIndex((v,j)=>ac.has(v.key)&&!ac.has(cs[(j+1)%6].key));
 const path=[cs[i],cs[(i+1)%6],cs[(i+2)%6]];
 const region={...t,id:1,hexes:[neighbor],anchorHex:neighbor,centerHex:neighbor,finalSize:1,heightLevel:1,biomeId:'open_plains',pointsOfInterest:[],pointOfInterestKinds:{}};
 const river={id:1,regionId:1,vertexPath:path,sectors:geo.createInitialRiverSectors(1,path,3,{},1)};
 const snapshot={regions:[region],rivers:[river],candidateHexes:geo.getCandidateHexes([neighbor],new Set()),roads:[],crossings:[],hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),nextLakeId:1,nextRoadId:1};
 x.render().restoreSnapshot(snapshot);
 x.render().safelyAddRegionToMap(anchor,{coastalPreference:'mainland',targetSize});
 const result=x.render();
 console.log(JSON.stringify({kind:'click',seed,targetSize,regionCount:result.regions.length,isTract:result.regions.at(-1).isTract===true,lakes:[...result.hexTerrainByKey].filter(([,v])=>v.terrainOverride==='lake').length,rivers:result.rivers.map(r=>({id:r.id,pathLength:r.vertexPath.length,source:r.vertexPath[0].key,sourceTouchesCandidate:result.candidateHexes.some(hex=>geo.getHexCornerPoints(hex).some(v=>v.key===r.vertexPath[0].key)),sectors:r.sectors.map(s=>({f:s.fullness,region:s.assignedRegionId,start:s.startReason,end:s.endReason}))}))}));
 geo.assertHexcrawlSaveData(JSON.parse(JSON.stringify(result.createSaveData())));
 if(seed===1 && targetSize===15) {
  const invalid=JSON.parse(JSON.stringify(result.createSaveData()));
  invalid.map.rivers[0].sectors[0].fullness=99;
  let accepted=true;try {geo.assertHexcrawlSaveData(invalid);} catch {accepted=false;}
  console.log(JSON.stringify({kind:'save-validator',fullness:99,accepted}));
 }
 result.deleteLastRegion();
 console.log(JSON.stringify({kind:'undo',seed,targetSize,restoredRivers:JSON.stringify(x.render().rivers)===JSON.stringify(snapshot.rivers)}));
}
