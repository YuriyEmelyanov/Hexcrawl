import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.GEO2_CHECKOUT??process.cwd();
const {normalizeRefinementRiverSource}=await import(pathToFileURL(resolve(root,'src/geometryRefinementSource.ts')));
const {prepareRefinementPorts}=await import(pathToFileURL(resolve(root,'src/geometryRefinementPorts.ts')));
const {projectOneMile}=await import(pathToFileURL(resolve(root,'src/oneMile.ts')));
const map=JSON.parse(fs.readFileSync(resolve(root,'test/fixtures/road-entry-zigzags.json'))).map,before=JSON.stringify(map),origin={x:0,y:0};
const source=normalizeRefinementRiverSource({rivers:map.rivers,origin,marks:{rapids:new Set(),waterfalls:new Set()}});assert.equal(source.status,'prepared');
const nodes=new Map();for(const segment of source.segments)for(const node of [segment.from,segment.to]){const old=nodes.get(node.key);nodes.set(node.key,{sourceKey:node.key,point:node.point,degree:(old?.degree??0)+1});}
const cells=projectOneMile(map.regions.flatMap(r=>r.hexes.map(cell=>({cell,landBiomeId:r.biomeId})))).map(c=>c.cell),requests=[...nodes.values()];
const r=prepareRefinementPorts({origin,cells,requests});assert.equal(r.status,'prepared',JSON.stringify(r));
assert.deepEqual(prepareRefinementPorts({origin,cells:cells.toReversed(),requests:requests.toReversed()}),r);assert.equal(JSON.stringify(map),before);
const terminal=requests.filter(n=>n.degree===1),edgePorts=r.ports.filter(p=>p.location.kind==='edge');
assert.equal(r.ports.length,nodes.size);for(const p of r.ports){assert.ok(Number.isFinite(p.point.x)&&Number.isFinite(p.point.y));if(nodes.get(p.sourceKey).degree>1)assert.equal(p.location.kind,'vertex');}
const out={temporary_diagnostic:true,permanent_case_growth:0,fixture:'test/fixtures/road-entry-zigzags.json',source_nodes:nodes.size,terminal_nodes:terminal.length,interior_edge_ports:edgePorts.length,split_graph_nodes:r.nodes.length,split_graph_edges:r.edges.length,source_unchanged:true,input_permutation_identical:true,limits:['Standalone split graph; existing river path allocator still uses old vertex ports','No actual open-exit refs inferred from internal region_boundary tags','Source geographic boundary/shore resolver and route/mark integration pending','No UI/accepted save/complete GeometryPlan evidence']};
fs.writeFileSync(new URL('witness.json',import.meta.url),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(out));
