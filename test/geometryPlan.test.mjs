import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {prepareGeometryPlan,parseGeometryRefinement,validateGeometryRefinementSource} from '../src/geometryPlan.ts';
import {parseDetail1StateV11} from '../src/detailModel.ts';
import {projectOneMile} from '../src/oneMile.ts';
import {detailSourcePixelToWorld} from '../src/detailGeography.ts';
import {buildNaturalLakes} from '../src/rendering/lakeGeometry.ts';
import {migrateSeas} from '../src/seaIdentity.ts';
import {normalizeRefinementRiverSource} from '../src/geometryRefinementSource.ts';

// Test governance: two logical cases for the new accepted boundary. Existing
// river/mouth/road suites own routing algorithms; saveSafety owns old formats
// and mapTransactions owns handlers/history. Reuse their real source fixture
// once here to exercise complete plan persistence and corrupt-record rejection.
// This guards new cross-phase correspondence and does not add seed sweeps.
let fixture;
async function accepted(){
 if(fixture)return fixture;
 const h=createGenerationHarness(42);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:fs.readFileSync(new URL('fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'map'}});
 const map=h.render().captureDocument().map,origin={x:0,y:0},marks=h.geometry.regionMarkKeys(map),hydrology=h.geometry.buildRegionRiverNetwork(map.rivers,map.rivers,map.regions,map.candidateHexes,map.hexTerrainByKey,true);
 const riverInput={rivers:map.rivers,marks,origin,cells:projectOneMile(h.geometry.oneMileSources(map)).map(c=>c.cell),seed:423493684};
 const widths=new Map([1,2,3,4,5].map(f=>[f,detailSourcePixelToWorld({x:h.geometry.getRiverWidth(h.geometry.getHexWidth(28),f),y:0}).x]));
 const lakeInputs=h.geometry.getLakesForRegions(map.regions,map.hexTerrainByKey).map(l=>({lakeId:l.lakeId,cells:[...l.hexes],colorPath:buildNaturalLakes(l.hexes.map(c=>({...c,...h.geometry.toPixel(c.q,c.r),lakeId:l.lakeId})),28,map.toponymSeed,[])[0].path,colorScale:detailSourcePixelToWorld({x:1,y:0}).x,origin}));
 const input={map,liveRivers:h.geometry.detailMapRiverGeometry(map,origin),marks,origin,landCells:map.regions.flatMap(r=>r.hexes).filter(c=>!['lake','sea'].includes(map.hexTerrainByKey.get(`${c.q},${c.r}`)?.terrainOverride)),riverInput,riverContext:{hydrology,candidates:map.candidateHexes},widths,lakeInputs};
 const before=JSON.stringify(map),result=prepareGeometryPlan(input);assert.equal(result.status,'prepared',JSON.stringify(result));assert.equal(JSON.stringify(map),before);
 fixture={input,result};return fixture;
}
const copy=value=>JSON.parse(JSON.stringify(value));
const reverseKeys=value=>Array.isArray(value)?value.map(reverseKeys):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverseKeys(v)])):value;
let deltaFixture;
function acceptedDelta(){
 if(deltaFixture)return deltaFixture;
 // One finite real coarse-grid junction, with its three supporting land hexes.
 // The two downstream neighbors touch sea; the upstream neighbor stays open.
 // This reuses App's source/hydrology adapter, including separate BR-009 rules.
 const h=createGenerationHarness(43);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.render().addFallbackTractToMap({q:0,r:0});const base=h.render().captureDocument().map,g=h.geometry;
 const all=[];for(let q=-2;q<=2;q++)for(let r=-2;r<=2;r++)if(Math.abs(q+r)<=2)all.push({q,r});
 const corners=new Map(all.map(c=>[`${c.q},${c.r}`,g.getHexCornerPoints(c)])),j=g.getHexCornerPoints({q:0,r:0})[0],land=all.filter(c=>corners.get(`${c.q},${c.r}`).some(v=>v.key===j.key)),landKeys=new Set(land.map(c=>`${c.q},${c.r}`)),neighbors=new Map();
 for(const cell of land){const vs=corners.get(`${cell.q},${cell.r}`);for(let i=0;i<vs.length;i++)if(vs[i].key===j.key)for(const v of [vs[(i+1)%6],vs[(i+5)%6]])neighbors.set(v.key,v);}
 assert.equal(land.length,3);assert.equal(neighbors.size,3);const [a,c,b]=[...neighbors.values()].sort((a,b)=>a.x-b.x||a.y-b.y),seaCells=[c,b].map(v=>all.find(cell=>!landKeys.has(`${cell.q},${cell.r}`)&&corners.get(`${cell.q},${cell.r}`).some(p=>p.key===v.key)));
 assert.ok(seaCells.every(Boolean));const terrain=new Map(seaCells.map(c=>[`${c.q},${c.r}`,{terrainOverride:'sea'}])),seas=migrateSeas(terrain),path=[a,j,c],region={...base.regions[0],hexes:land,centerHex:{q:0,r:0},anchorHex:{q:0,r:0},finalSize:3,targetSize:3,heightLevel:1,isCoastal:true,pointsOfInterest:[],pointOfInterestKinds:{},suppressCentralPoi:true};
 const main={id:1,regionId:region.id,vertexPath:path,sectors:g.createInitialRiverSectors(1,path,4,{startReason:'region_boundary',endReason:'river_end'},region.id)},armPath=[j,b],arm={id:2,regionId:region.id,deltaParentRiverId:1,vertexPath:armPath,sectors:[{id:'delta-2-0',riverId:2,sectorIndex:0,vertexPath:armPath,edgeKeys:[armPath.map(v=>v.key).sort().join('|')],startVertexKey:j.key,endVertexKey:b.key,startReason:'split',endReason:'river_end',fullness:2}]};
 const map={...base,regions:[region],rivers:[main,arm],roads:[],crossings:[],physicalGrid:undefined,hexTerrainByKey:terrain,waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),...seas,candidateHexes:g.getCandidateHexes(land,new Set(terrain.keys())),nextRiverId:3,nextRoadId:1},input=g.geometryPlanInput(map),normalized=normalizeRefinementRiverSource(input.riverInput);
 assert.equal(normalized.status,'prepared',JSON.stringify(normalized));assert.equal(normalized.sectors.find(s=>s.riverId===2).sectorIndex,0);
 const result=prepareGeometryPlan(input);assert.equal(result.status,'prepared',JSON.stringify(result));deltaFixture={input,result,j:j.key};return deltaFixture;
}

test('GEO2 complete immutable physical4 plan preserves authored source and exact accepted choices',async()=>{
 const {input,result}=await accepted(),g=result.geometryRefinement;
 assert.equal(result.completeGeometryPlan,true);assert.equal(result.readyForApplication,true);assert.equal(result.candidateState.version,4);assert.equal(g.sourceState.version,3);
 assert.equal(g.riverPlan.paths.length,53);assert.equal(g.roads.crossings.length,7);assert.equal(g.unresolved.length,21);assert.equal(g.riverPlan.mouths.length,3);
 assert.ok(Object.isFrozen(g.riverPlan.paths[0].steps[0]));assert.ok(Object.isFrozen(g.sourceState.poiFootprints[0].extent));
 assert.equal(g.sideChoices.length,g.riverPlan.paths.reduce((n,p)=>n+p.steps.length,0));
 assert.deepEqual(parseGeometryRefinement(copy(g),parseDetail1StateV11),g);assert.deepEqual(parseDetail1StateV11(copy(result.candidateState)),result.candidateState);
 assert.deepEqual(parseDetail1StateV11(reverseKeys(copy(result.candidateState))),result.candidateState,'object key order is not geometry');
 assert.equal(validateGeometryRefinementSource(input,g),true);
 const namesOnly={...input,map:{...input.map,physicalGrid:result.candidateState,editorNames:{changed:'new title'},gmNotesByHexKey:{'0,0':'new note'},language:'en'}};
 const unchanged=prepareGeometryPlan(namesOnly);assert.equal(unchanged.status,'unchanged',JSON.stringify(unchanged));assert.equal(unchanged.geometryRefinement,g);
 const wrong={...input,map:{...input.map,rivers:input.map.rivers.map((r,i)=>i?r:{...r,sectors:r.sectors.map((s,j)=>j?s:{...s,fullness:s.fullness===5?4:s.fullness+1})})}};
 assert.equal(validateGeometryRefinementSource(wrong,g),false);
 const cancelled=prepareGeometryPlan({...input,cancelled:()=>true});assert.equal(cancelled.status,'error');assert.equal(cancelled.candidateState,undefined);
 const bounded=prepareGeometryPlan({...input,prepareWorkBudget:1});assert.equal(bounded.status,'error');assert.equal(bounded.candidateState,undefined);
 const delta=acceptedDelta(),dg=delta.result.geometryRefinement;assert.equal(dg.riverPlan.paths.length,3);assert.equal(dg.riverPlan.paths.filter(p=>p.fromNode===delta.j).length,2);assert.equal(dg.riverPlan.paths.filter(p=>p.toNode===delta.j).length,1);assert.deepEqual(parseGeometryRefinement(copy(dg),parseDetail1StateV11),dg);assert.equal(validateGeometryRefinementSource(delta.input,dg),true);
});

test('GEO2 persisted records reject broken source, topology, contacts and outer authored correspondence atomically',async()=>{
 const {result}=await accepted(),g=result.geometryRefinement;
 const badRefinements=[
  ['future algorithm',x=>x.algorithmVersion='geo2-v2'],
  ['recursive source',x=>x.sourceState.version=4],
  ['invalid fingerprint',x=>x.sourceFingerprint='stale'],
  ['unknown lock',x=>x.lockedPoiIds=['detail-poi:999999']],
  ['duplicate path',x=>x.riverPlan.paths.push(copy(x.riverPlan.paths[0]))],
  ['nonfinite vertex',x=>x.riverPlan.paths[0].points[0].x=Infinity],
  ['nonedge point',x=>x.riverPlan.paths[0].points[1].x+=.01],
  ['broken step',x=>x.riverPlan.paths[0].steps[0].endFraction=.333],
  ['foreign source node',x=>x.riverPlan.paths[0].fromNode='foreign'],
  ['collapsed source ports',x=>x.riverPlan.ports[1]=copy(x.riverPlan.ports[0])],
  ['duplicate side choice',x=>x.sideChoices.push(copy(x.sideChoices[0]))],
  ['wrong chosen side',x=>x.sideChoices[0].chosenSide=x.sideChoices[0].chosenSide==='left'?'right':'left'],
  ['foreign dry road',x=>x.roads.roads.find(r=>!r.crossingKeys.length).roadId=999999],
  ['omitted dry road',x=>x.roads.roads.splice(x.roads.roads.findIndex(r=>!r.crossingKeys.length),1)],
  ['foreign crossing',x=>x.roads.crossings[0].riverId=999999],
  ['moved crossing',x=>x.roads.crossings[0].point.x+=.1],
  ['missing crossing mode',x=>x.riverPlan.mouths.pop()],
  ['omitted all lake mouths',x=>x.riverPlan.mouths=[]],
  ['omitted terminal classification',x=>x.riverPlan.terminations=[]],
  ['offshore mouth',x=>x.riverPlan.mouths[0].point.x+=.1],
  ['foreign contour',x=>x.riverPlan.lakes[0].modes.color.loops[0][0].control.x+=.1],
  ['foreign water owner',x=>x.riverPlan.water.capsules[0].riverId=999999],
  ['duplicate unresolved owner',x=>x.unresolved.push(x.unresolved[0])],
 ];
 for(const [label,mutate]of badRefinements){const raw=copy(g);mutate(raw);const snapshot=JSON.stringify(raw);assert.throws(()=>parseGeometryRefinement(raw,parseDetail1StateV11),undefined,label);assert.equal(JSON.stringify(raw),snapshot,label);}
 const badOuter=[
  ['grid',x=>x.grid.origin.x+=1],
  ['source convention',x=>x.source.physicalConvention=x.source.physicalConvention==='unknown'?'known_across_flats':'unknown'],
  ['identity next id',x=>x.poiIdentities.nextId+=1],
  ['accepted footprint anchor',x=>x.poiFootprints[0].worldAnchor.x+=.01],
  ['accepted footprint cell',x=>x.poiFootprints[0].cells[0].q+=1],
  ['accepted footprint attachment',x=>x.poiFootprints[0].attachments.push({kind:'water',waterKind:'river',waterId:'river:999',segmentId:'foreign',contact:{x:0,y:0}})],
 ];
 for(const [label,mutate]of badOuter){const raw=copy(result.candidateState);mutate(raw);assert.throws(()=>parseDetail1StateV11(raw),undefined,label);}
 const delta=acceptedDelta().result.geometryRefinement,badDelta=[
  ['untyped split',x=>x.riverPlan.source.boundaries.find(b=>b.reason==='split').reason='river_start'],
  ['four-edge split',x=>{const s=x.riverPlan.source.segments.find(s=>s.riverId===2);x.riverPlan.source.segments.push({...copy(s),riverId:3,edgeKey:[s.from.key,'extra'].sort().join('|'),to:{key:'extra',point:{x:10,y:10}}});}],
  ['directed split cycle',x=>{const ss=x.riverPlan.source.segments.filter(s=>s.riverId===1),first=ss.find(s=>!ss.some(p=>p.to.key===s.from.key)),last=ss.find(s=>!ss.some(p=>p.from.key===s.to.key));x.riverPlan.source.segments.push({riverId:3,edgeKey:[last.to.key,first.from.key].sort().join('|'),from:copy(last.to),to:copy(first.from),fullness:1});}],
 ];
 for(const [label,mutate]of badDelta){const raw=copy(delta);mutate(raw);assert.throws(()=>parseGeometryRefinement(raw,parseDetail1StateV11),undefined,label);}
 assert.equal(badDelta.length,3);
 assert.equal(badRefinements.length,23);assert.equal(badOuter.length,6); // Together with3 delta rows:32 malformed rows in one logical case.
});
