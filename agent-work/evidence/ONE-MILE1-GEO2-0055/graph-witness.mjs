import fs from 'node:fs';
import crypto from 'node:crypto';
import {projectOneMile} from '../geo2-implementation/src/oneMile.ts';
import {refinementEdgeGraph,refinementVertexKey} from '../geo2-implementation/src/geometryRefinementGrid.ts';
const raw=fs.readFileSync(new URL('../geo2-implementation/test/fixtures/road-entry-zigzags.json',import.meta.url));
const world=JSON.parse(raw),before=JSON.stringify(world);
const sources=world.map.regions.flatMap(r=>r.hexes.map(cell=>({cell,landBiomeId:r.biomeId})));
const fine=projectOneMile(sources),graph=refinementEdgeGraph(fine.map(c=>c.cell));
const degree=new Map();
for(const edge of graph.edges)for(const v of [edge.from,edge.to]){const key=refinementVertexKey(v);degree.set(key,(degree.get(key)??0)+1);}
if([...degree.values()].some(d=>d>3))throw Error('Duplicate or invalid honeycomb incidence');
if(before!==JSON.stringify(world))throw Error('Input changed');
const report={source_head:'1c6cb9091cbd2b5310224cff09e535899824d873',fixture:'test/fixtures/road-entry-zigzags.json',fixture_sha256:crypto.createHash('sha256').update(raw).digest('hex'),source_cells:sources.length,fine_cells:fine.length,integer_vertices:graph.vertices.length,unique_edges:graph.edges.length,max_degree:Math.max(...degree.values()),input_unchanged:true,status:'pass',temporary_diagnostic:true,permanent_case_growth:0,limits:'Graph construction on one retained fixture, not routing53segments, POI/road/crossing/mouth adaptation, browser or GeometryPlan acceptance'};
fs.writeFileSync(new URL('graph-witness.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
