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
 const constrained=prepareRefinementBoundaryRoutes(input,{hydrology,candidates:map.candidateHexes});assert.equal(constrained.status,'prepared',JSON.stringify(constrained));assert.equal(constrained.paths.length,53);for(const e of r.exits){const port=constrained.ports.find(p=>p.sourceKey===e.sourceKey);assert.equal(port.sourceExitRef,e.sourceExitRef);assert.ok(port.location.kind==='edge'?e.edgeKeys.includes(port.location.edgeKey):e.edgeKeys.some(k=>k.includes(`${port.location.vertex.x},${port.location.vertex.y}`)));}
 const seen=new Map(),sourceIds=new Set();
 for(const p of constrained.paths){const s=source.segments.find(s=>s.riverId===p.riverId&&s.edgeKey===p.sourceEdgeKey);assert.ok(s);assert.equal(p.fullness,s.fullness);assert.equal(p.fromNode,s.from.key);assert.equal(p.toNode,s.to.key);sourceIds.add(JSON.stringify([p.riverId,p.sourceEdgeKey]));
  for(const [i,k]of p.nodeKeys.entries()){const n=i===0?p.fromNode:i===p.nodeKeys.length-1?p.toNode:null;if(seen.has(k))assert.ok(n&&seen.get(k)===n,'no new source join or overlap');else seen.set(k,n);}
  assert.equal(new Set(p.nodeKeys).size,p.nodeKeys.length);
 }
 assert.equal(sourceIds.size,53);assert.equal(constrained.rapids.length,marks.rapids.size);assert.equal(constrained.waterfalls.length,marks.waterfalls.size);
 for(const fall of constrained.waterfalls)for(const link of fall.incidences)assert.deepEqual(link.point,fall.point);
 assert.deepEqual(prepareRefinementBoundaryRoutes({...input,cells:cells.toReversed(),rivers:map.rivers.toReversed()}, {hydrology,candidates:map.candidateHexes.toReversed()}),constrained);
 const after=JSON.parse(JSON.stringify(a.createSaveData())),old=JSON.parse(before);delete after.savedAt;delete old.savedAt;assert.deepEqual(after,old);
});
