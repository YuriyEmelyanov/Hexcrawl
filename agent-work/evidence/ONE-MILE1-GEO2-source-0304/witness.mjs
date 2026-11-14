import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const checkout=process.env.GEO2_CHECKOUT??process.cwd();
const {prepareRefinementRiverNetwork}=await import(pathToFileURL(resolve(checkout,'src/geometryRefinementSource.ts')).href);
const {projectOneMile}=await import(pathToFileURL(resolve(checkout,'src/oneMile.ts')).href);
const text=fs.readFileSync(resolve(checkout,'test/fixtures/road-entry-zigzags.json'),'utf8'),world=JSON.parse(text),before=JSON.stringify(world);
const cells=projectOneMile(world.map.regions.flatMap(r=>r.hexes.map(cell=>({cell,landBiomeId:r.biomeId})))).map(c=>c.cell);
const input={rivers:world.map.rivers,cells,seed:423493684,origin:{x:0,y:0},marks:{rapids:new Set(),waterfalls:new Set()}};
const candidate=prepareRefinementRiverNetwork(input);assert.equal(candidate.status,'prepared');
let checked=0;
for(const river of world.map.rivers)for(let i=1;i<river.vertexPath.length;i++){
 const from=river.vertexPath[i-1],to=river.vertexPath[i],edge=[from.key,to.key].sort().join('|');
 const path=candidate.rivers.paths.find(p=>p.riverId===river.id&&p.sourceEdgeKey===edge),sector=river.sectors.find(s=>s.edgeKeys.includes(edge));
 assert.equal(path.fromNode,from.key);assert.equal(path.toNode,to.key);assert.equal(path.fullness,sector.fullness);checked++;
}
const reversed={...input,rivers:input.rivers.toReversed().map(r=>({...r,sectors:r.sectors.toReversed().map(s=>({...s,edgeKeys:s.edgeKeys.toReversed()}))})),cells:cells.toReversed()};
assert.deepEqual(prepareRefinementRiverNetwork(reversed),candidate);assert.equal(JSON.stringify(world),before);
const witness={fixture:'test/fixtures/road-entry-zigzags.json',fixture_sha256:createHash('sha256').update(text).digest('hex'),scope:'Development diagnostic of sector direction/boundary provenance. Not actual UI, complete GeometryPlan or generated mark-count evidence.',source_segments:checked,source_nodes:candidate.rivers.nodes.length,sectors:candidate.source.sectors.length,boundary_refs:candidate.boundaries.length,fine_edge_steps:candidate.rivers.paths.reduce((n,p)=>n+p.vertices.length-1,0),direction_and_fullness_retained:true,input_permutation_identical:true,source_unchanged:true,resolved_marks_input:{rapids:0,waterfalls:0,reason:'Explicit empty diagnostic sets. Actual regionMarkKeys integration and actual automatic marks remain pending; this is not evidence that fixture has no marks.'},marks_synthetic_case_evidence:'test/geometryRefinementRivers.test.mjs: directed diameter with resolved rapid and terminal waterfall; permanent focused Node run',completeGeometryPlan:false,limitations:['Boundary refs retained but not constrained to actual map boundary ports','Interior terminal splitting pending','POI/roads/crossings/water envelopes/lake mouths pending','Public16/history/UI/actual mark resolver wiring pending']};
fs.writeFileSync(new URL('witness.json',import.meta.url),JSON.stringify(witness,null,2)+'\n');
fs.writeFileSync(new URL('river-source-plan.json',import.meta.url),JSON.stringify(candidate,null,2)+'\n');
console.log(JSON.stringify(witness));
