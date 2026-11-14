import {prepareRefinementRoads} from '../src/geometryRefinementRoads.ts';
import {detailPoiWaterRequirement} from '../src/detailGeography.ts';
import {poiNameLocators} from '../src/manualPois.ts';
import {refinementNearestRiverBank} from '../src/geometryRefinementBanks.ts';
import {createDetailGrid,worldToDetailCell} from '../src/detailGrid.ts';
import {prepareRefinementMouths,refinementRiverPaintIntervals} from '../src/geometryRefinementMouths.ts';
import {refinementShoreContains,refinementShoreLocation} from '../src/geometryRefinementShore.ts';
import {buildNaturalLakes} from '../src/rendering/lakeGeometry.ts';
import {prepareRefinementWetRoutes,refinementWaterContains,refinementWaterIntervals} from '../src/geometryRefinementWater.ts';
import {detailSourcePixelToWorld} from '../src/detailGeography.ts';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {normalizeRefinementRiverSource} from '../src/geometryRefinementSource.ts';
import {prepareRefinementOpenExits,prepareRefinementBoundaryRoutes} from '../src/geometryRefinementExits.ts';
import {projectOneMile} from '../src/oneMile.ts';
test('GEO2 actual source hydrology separates open exits from lake/source and enforces fine boundary refs',async()=>{
 const h=createGenerationHarness(42);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:fs.readFileSync(new URL('fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'map'}});
 const a=h.render(),map=a.captureDocument().map,before=JSON.stringify(a.createSaveData()),origin={x:0,y:0};
 const hydrology=h.geometry.buildRegionRiverNetwork(map.rivers,map.rivers,map.regions,map.candidateHexes,map.hexTerrainByKey,true);assert.equal(hydrology.issues.length,0);
 const marks=h.geometry.regionMarkKeys(map),cells=projectOneMile(h.geometry.oneMileSources(map)).map(c=>c.cell),input={rivers:map.rivers,marks,origin,cells,seed:423493684};
 const source=normalizeRefinementRiverSource(input);assert.equal(source.status,'prepared');
 const args={source,origin,cells,candidates:map.candidateHexes,hydrology},r=prepareRefinementOpenExits(args);assert.equal(r.status,'prepared',JSON.stringify(r));
 assert.equal(r.exits.length,4);assert.equal(r.terminations.filter(n=>n.kind==='lake').length,1);assert.equal(r.terminations.filter(n=>n.kind==='source').length,3);
 const openKeys=new Set(hydrology.network.nodes.filter(n=>n.kind==='open').map(n=>n.id));assert.deepEqual(new Set(r.exits.map(e=>e.sourceKey)),openKeys);
 for(const e of r.exits){assert.ok(e.edgeKeys.length);assert.ok(e.sourceExitRef.includes(e.sourceKey));const s=source.segments.find(s=>s.edgeKey===e.sourceEdgeKey&&s.riverId===e.riverId);assert.equal(e.fullness,s.fullness);assert.equal(e.flow,s.from.key===e.sourceKey?'entering':'leaving');}
 assert.deepEqual(prepareRefinementOpenExits({...args,cells:cells.toReversed(),candidates:map.candidateHexes.toReversed(),hydrology:{...hydrology,network:{nodes:hydrology.network.nodes.toReversed(),edges:hydrology.network.edges.toReversed()}}}),r);
 const seaModel=structuredClone(hydrology);seaModel.network.nodes.find(n=>n.kind==='open').kind='sea';const seaResult=prepareRefinementOpenExits({...args,hydrology:seaModel});assert.equal(seaResult.status,'prepared');assert.equal(seaResult.exits.length,3);assert.equal(seaResult.terminations.filter(n=>n.kind==='sea').length,1);
 assert.equal(prepareRefinementOpenExits({...args,candidates:[]}).code,'boundary_conflict');
 const stale=structuredClone(hydrology);stale.network.edges[0].fullness=5;assert.equal(prepareRefinementOpenExits({...args,hydrology:stale}).code,'source_topology_conflict');
 const broken=prepareRefinementOpenExits({...args,hydrology:{...hydrology,issues:['source failure']}});assert.equal(broken.status,'error');assert.equal(broken.exits,undefined);
 // Real boundaries must be enforced; occupied interiors remain fixed while
 // endpoint corridors can be rerouted without new source joins.
 const widths=new Map([1,2,3,4,5].map(f=>[f,detailSourcePixelToWorld({x:h.geometry.getRiverWidth(h.geometry.getHexWidth(28),f),y:0}).x]));
 for(const [f,width]of widths)assert.ok(Math.abs(width-6*(.04+f*.035))<1e-12,'same existing visible width, no extra /6');
 const lakeGroups=h.geometry.getLakesForRegions(map.regions,map.hexTerrainByKey),lakeInputs=lakeGroups.map(l=>{const shapes=buildNaturalLakes(l.hexes.map(c=>({...c,...h.geometry.toPixel(c.q,c.r),lakeId:l.lakeId})),28,map.toponymSeed,[]);assert.equal(shapes.length,1);return {lakeId:l.lakeId,cells:[...l.hexes],colorPath:shapes[0].path,colorScale:detailSourcePixelToWorld({x:1,y:0}).x,origin};});
 const constrained=prepareRefinementMouths(input,{hydrology,candidates:map.candidateHexes},widths,lakeInputs);assert.equal(constrained.status,'prepared',JSON.stringify(constrained));assert.equal(constrained.paths.length,53);for(const e of r.exits){const port=constrained.ports.find(p=>p.sourceKey===e.sourceKey);assert.equal(port.sourceExitRef,e.sourceExitRef);assert.ok(port.location.kind==='edge'?e.edgeKeys.includes(port.location.edgeKey):e.edgeKeys.some(k=>k.includes(`${port.location.vertex.x},${port.location.vertex.y}`)));}
 const seen=new Map(),sourceIds=new Set();
 for(const p of constrained.paths){const s=source.segments.find(s=>s.riverId===p.riverId&&s.edgeKey===p.sourceEdgeKey);assert.ok(s);assert.equal(p.fullness,s.fullness);assert.equal(p.fromNode,s.from.key);assert.equal(p.toNode,s.to.key);sourceIds.add(JSON.stringify([p.riverId,p.sourceEdgeKey]));
  for(const [i,k]of p.nodeKeys.entries()){const n=i===0?p.fromNode:i===p.nodeKeys.length-1?p.toNode:null;if(seen.has(k))assert.ok(n&&seen.get(k)===n,'no new source join or overlap');else seen.set(k,n);}
  assert.equal(new Set(p.nodeKeys).size,p.nodeKeys.length);
 }
 assert.equal(sourceIds.size,53);assert.equal(constrained.rapids.length,marks.rapids.size);assert.equal(constrained.waterfalls.length,marks.waterfalls.size);
 for(const fall of constrained.waterfalls)for(const link of fall.incidences)assert.deepEqual(link.point,fall.point);
 assert.deepEqual(prepareRefinementMouths({...input,cells:cells.toReversed(),rivers:map.rivers.toReversed()}, {hydrology,candidates:map.candidateHexes.toReversed()},widths,lakeInputs.toReversed()),constrained);
 assert.equal(constrained.water.capsules.length,constrained.paths.reduce((n,p)=>n+p.points.length-1,0));
 for(const c of constrained.water.capsules){const mid={x:(c.from.x+c.to.x)/2,y:(c.from.y+c.to.y)/2};assert.equal(refinementWaterContains(constrained.water,mid).inside,true);assert.equal(c.radius,widths.get(constrained.paths.find(p=>p.riverId===c.riverId&&p.sourceEdgeKey===c.sourceEdgeKey).fullness)/2);
  const span=c.radius*4,query={from:{x:mid.x-c.uy*span,y:mid.y+c.ux*span},to:{x:mid.x+c.uy*span,y:mid.y-c.ux*span}},cut=refinementWaterIntervals(constrained.water,query);assert.equal(cut.status,'prepared');assert.ok(cut.intervals.length);
  for(const row of cut.intervals){assert.ok(row.startFraction>=0&&row.endFraction<=1);for(const [point,clipped]of [[row.from,row.startClipped],[row.to,row.endClipped]])if(!clipped)assert.ok(Math.abs(refinementWaterContains(constrained.water,point).clearance)<1e-8,'exposed union bank, not an internal overlap');}
 }
 const badWidth=prepareRefinementWetRoutes(input,{hydrology,candidates:map.candidateHexes},new Map());assert.equal(badWidth.status,'error');assert.equal(badWidth.paths,undefined);
 assert.equal(constrained.mouths.length,3);assert.deepEqual(constrained.mouths.map(m=>m.mode),['tiles','emoji','color']);
 for(const mouth of constrained.mouths){const lake=constrained.lakes.find(l=>l.lakeId===mouth.lakeId),shape=lake.modes[mouth.mode];assert.equal(mouth.direction,'outlet');assert.equal(refinementShoreContains(shape,mouth.point),true);const path=constrained.paths.find(p=>p.riverId===mouth.riverId&&p.sourceEdgeKey===mouth.sourceEdgeKey),a=path.points[mouth.stepIndex],b=path.points[mouth.stepIndex+1];assert.ok(Math.hypot(mouth.point.x-a.x-mouth.stepFraction*(b.x-a.x),mouth.point.y-a.y-mouth.stepFraction*(b.y-a.y))<1e-8);
  const query={from:path.points[0],to:path.points.at(-1)},paint=refinementRiverPaintIntervals(constrained,query,mouth.mode);assert.equal(paint.status,'prepared');for(const row of paint.intervals){const mid={x:(row.from.x+row.to.x)/2,y:(row.from.y+row.to.y)/2};assert.equal(refinementShoreContains(shape,mid),false,'no submerged connector paint');}
 }
 const noLake=prepareRefinementMouths(input,{hydrology,candidates:map.candidateHexes},widths,[]);assert.equal(noLake.status,'error');assert.equal(noLake.paths,undefined);
 const remoteLake=prepareRefinementMouths(input,{hydrology,candidates:map.candidateHexes},widths,lakeInputs.map(l=>({...l,colorPath:'M100000 100000L100001 100000L100001 100001L100000 100001Z'})));assert.equal(remoteLake.code,'mouth_conflict');assert.equal(remoteLake.paths,undefined);
 const requirements=[...poiNameLocators(map,true)].map(alias=>({alias,...detailPoiWaterRequirement(map,alias)}));assert.ok(requirements.some(r=>r.provenance==='unknown'),'actual catalogue POIs have no invented river requirement');
 const land=new Set(map.regions.flatMap(r=>r.hexes.map(c=>`${c.q},${c.r}`))),lakeMasks=constrained.lakes.flatMap(l=>Object.values(l.modes));let actualBank=null;
 for(const c of constrained.paintWater.capsules){const point={x:(c.from.x+c.to.x)/2,y:(c.from.y+c.to.y)/2},parent6=worldToDetailCell(createDetailGrid(6),point);if(!land.has(`${parent6.q},${parent6.r}`))continue;const bank=refinementNearestRiverBank(constrained.paintWater,{point,parent6,origin,riverId:c.riverId,sourceEdgeKey:c.sourceEdgeKey,lakes:lakeMasks});assert.equal(bank.status,'prepared',JSON.stringify(bank));if(bank.contact){actualBank=bank.contact;break;}}
 assert.ok(actualBank,'actual finite route has an exposed same-parent bank');assert.ok(Math.abs(refinementWaterContains(constrained.paintWater,actualBank.point).clearance)<1e-7);assert.ok(lakeMasks.every(l=>refinementShoreLocation(l,actualBank.point)!=='inside'));
 const landCells=map.regions.flatMap(r=>r.hexes).filter(c=>!['lake','sea'].includes(map.hexTerrainByKey.get(`${c.q},${c.r}`)?.terrainOverride)),roadInput={roads:map.roads,crossings:map.crossings,sourceRivers:constrained.source.segments,rivers:constrained.paths,water:constrained.paintWater,origin,landCells,lakes:lakeMasks},roadPlan=prepareRefinementRoads(roadInput);assert.equal(roadPlan.status,'prepared',JSON.stringify(roadPlan));assert.equal(roadPlan.roads.length,31);assert.equal(roadPlan.crossings.length,7);assert.equal(roadPlan.crossings.filter(c=>c.kind==='bridge').length,4);assert.equal(roadPlan.crossings.filter(c=>c.kind==='ferry').length,3);assert.deepEqual(new Set(roadPlan.crossings.map(c=>c.key)),new Set(map.crossings.map(c=>c.key)));
 for(const c of roadPlan.crossings){const old=map.crossings.find(o=>o.key===c.key);for(const field of ['roadId','roadSegmentKey','riverId','riverEdgeKey','kind'])assert.equal(c[field],old[field]);for(const bank of [c.bankEntry,c.bankExit])assert.ok(Math.abs(refinementWaterContains(constrained.paintWater,bank).clearance)<1e-7);}
 assert.ok(roadPlan.roads.every(r=>!r.adapted&&r.points.length===2),'no unsupported POI moves or unrelated source road edits');
 assert.deepEqual(prepareRefinementRoads({...roadInput,roads:map.roads.toReversed().map(r=>({...r,segments:r.segments.toReversed()})),crossings:map.crossings.toReversed(),sourceRivers:constrained.source.segments.toReversed(),rivers:constrained.paths.toReversed(),landCells:landCells.toReversed()}),roadPlan);
 const fordSource=roadPlan.crossings.find(c=>c.kind==='bridge'&&c.fullness===2);assert.ok(fordSource);const fordVariant=prepareRefinementRoads({...roadInput,crossings:map.crossings.map(c=>c.key===fordSource.key?{...c,kind:'ford'}:c)});assert.equal(fordVariant.status,'prepared');assert.equal(fordVariant.crossings.find(c=>c.key===fordSource.key).kind,'ford','explicit F2 variant, not original source kind');
 const after=JSON.parse(JSON.stringify(a.createSaveData())),old=JSON.parse(before);delete after.savedAt;delete old.savedAt;assert.deepEqual(after,old);
});
