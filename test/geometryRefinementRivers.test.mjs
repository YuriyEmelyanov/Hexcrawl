import test from 'node:test';
import {prepareRefinementTerminalRoutes} from '../src/geometryRefinementTerminalRoutes.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareRefinementRivers} from '../src/geometryRefinementRivers.ts';
import {refinementEdgeGraph,refinementVertexKey} from '../src/geometryRefinementGrid.ts';
import {projectOneMile} from '../src/oneMile.ts';
import {normalizeRefinementRiverSource,prepareRefinementRiverNetwork} from '../src/geometryRefinementSource.ts';
import {refinementWorldPoint} from '../src/geometryRefinementGrid.ts';
const node=(key,x,y)=>({key,point:{x,y}}),seg=(edgeKey,from,to,riverId=1)=>({edgeKey,from,to,riverId,fullness:1});
const cells=Array.from({length:7},(_,q)=>Array.from({length:7},(_,r)=>({q:q-3,r:r-3}))).flat();
const a=node('a',-2,0),j=node('j',0,0),b=node('b',0,-2),c=node('c',2,0);
const input=()=>({seed:42,origin:{x:0,y:0},cells,segments:[seg('a-j',a,j),seg('b-j',b,j,2),seg('j-c',j,c)]});
function assertTopology(result,source,available){
 assert.equal(result.status,'prepared',JSON.stringify(result));assert.equal(result.paths.length,source.length);
 const graph=refinementEdgeGraph(available),legal=new Set(graph.edges.map(e=>e.key)),ports=new Map(result.nodes.map(n=>[n.sourceKey,refinementVertexKey(n.vertex)])),vertices=new Map(),edges=new Set();
 assert.equal(new Set(ports.values()).size,ports.size,'distinct source ports stay distinct');
 for(const path of result.paths){
  const original=source.find(s=>s.riverId===path.riverId&&s.edgeKey===path.sourceEdgeKey);assert.ok(original);assert.equal(path.fullness,original.fullness);
  assert.equal(refinementVertexKey(path.vertices[0]),ports.get(path.fromNode));assert.equal(refinementVertexKey(path.vertices.at(-1)),ports.get(path.toNode));
  assert.equal(new Set(path.vertices.map(refinementVertexKey)).size,path.vertices.length,'no path loop');
  for(let i=0;i<path.vertices.length;i++){
   const k=refinementVertexKey(path.vertices[i]),node=i===0?path.fromNode:i===path.vertices.length-1?path.toNode:null;
   if(vertices.has(k))assert.ok(node&&vertices.get(k)===node,'no new confluence or overlap');else vertices.set(k,node);
   if(i){const ends=[path.vertices[i-1],path.vertices[i]].sort((a,b)=>a.x-b.x||a.y-b.y),e=ends.map(refinementVertexKey).join('|');assert.ok(legal.has(e));assert.ok(!edges.has(e));edges.add(e);}
  }
 }
}
test('GEO2 river confluence uses shared ports, stable correspondence and immutable source',()=>{
 const data=input(),before=JSON.stringify(data),r=prepareRefinementRivers(data);assertTopology(r,data.segments,cells);
 const reordered={...data,cells:[...cells].reverse(),segments:[...data.segments].reverse().map(s=>({...s,name:'ignored display name',from:{key:s.from.key,point:{y:s.from.point.y,x:s.from.point.x}}}))};
 assert.deepEqual(prepareRefinementRivers(reordered),r);assert.equal(JSON.stringify(data),before);
 assert.equal(r.completeGeometryPlan,false);assert.ok(Object.isFrozen(r.paths));
 const center=seg('diameter',node('top',0,-1/Math.sqrt(3)),node('bottom',0,1/Math.sqrt(3)));
 const alternatives=new Set(Array.from({length:8},(_,seed)=>{const result=prepareRefinementRivers({seed,origin:data.origin,cells:[{q:0,r:0}],segments:[center]});assert.equal(result.status,'prepared');return JSON.stringify(result.paths[0].vertices);}));
 assert.equal(alternatives.size,2,'seed chooses both legal sides of a center-crossed cell');
});
test('GEO2 river conflicts return no partial plan for cycles, aliases and unavailable corridors',()=>{
 const data=input();for(const segments of [[...data.segments,data.segments[0]],[seg('a-j',a,j),seg('j-a',j,a)],data.segments.map((s,i)=>i===1?{...s,to:node('j',9,9)}:s)]){
  const r=prepareRefinementRivers({...data,segments});assert.equal(r.status,'error');assert.equal(r.paths,undefined);
 }
 const result=prepareRefinementRivers({...data,cells:[]});assert.equal(result.status,'error');assert.equal(result.paths,undefined);
 assert.equal(prepareRefinementRivers({...data,seed:NaN}).code,'invalid_source');
});
test('GEO2 retained zigzag world preserves all53 source segment IDs without new river joins',()=>{
 const world=JSON.parse(fs.readFileSync(new URL('fixtures/road-entry-zigzags.json',import.meta.url))),before=JSON.stringify(world);
 const available=projectOneMile(world.map.regions.flatMap(r=>r.hexes.map(cell=>({cell,landBiomeId:r.biomeId})))).map(c=>c.cell);
 const origin={x:0,y:0},marks={rapids:new Set(),waterfalls:new Set()};
 const source=normalizeRefinementRiverSource({rivers:world.map.rivers,origin,marks});assert.equal(source.status,'prepared');
 const segments=source.segments;assert.equal(segments.length,53);
 const prepared=prepareRefinementRiverNetwork({seed:423493684,origin,cells:available,rivers:world.map.rivers,marks});
 assert.equal(prepared.status,'prepared');const r=prepared.rivers;assertTopology(r,segments,available);
 assert.equal(prepared.boundaries.length,world.map.rivers.reduce((n,r)=>n+2*r.sectors.length,0));
 for(const s of source.sectors){const original=world.map.rivers.find(r=>r.id===s.riverId).sectors.find(v=>v.id===s.sectorId);assert.equal(s.assignedRegionId,original.assignedRegionId??null);}
 const reordered=world.map.rivers.toReversed().map(r=>({...r,sectors:r.sectors.toReversed().map(s=>({...s,edgeKeys:s.edgeKeys.toReversed()}))}));
 assert.deepEqual(prepareRefinementRiverNetwork({seed:423493684,origin,cells:[...available].reverse(),rivers:reordered,marks}),prepared);
 assert.deepEqual(new Set(r.paths.map(p=>JSON.stringify([p.riverId,p.sourceEdgeKey]))),new Set(segments.map(p=>JSON.stringify([p.riverId,p.edgeKey]))));
 const linked=prepareRefinementTerminalRoutes({seed:423493684,origin,cells:available,rivers:world.map.rivers,marks:{rapids:new Set(source.segments.map(s=>s.edgeKey)),waterfalls:new Set(source.segments.flatMap(s=>[s.from.key,s.to.key]))}});
 assert.equal(linked.status,'prepared',JSON.stringify(linked));assert.equal(linked.paths.length,53);assert.equal(linked.ports.filter(p=>p.location.kind==='edge').length,6);
 const occupied=new Map(),used=new Set();
 for(const p of linked.paths){const old=r.paths.find(q=>q.riverId===p.riverId&&q.sourceEdgeKey===p.sourceEdgeKey);assert.equal(p.fullness,old.fullness);assert.equal(p.fromNode,old.fromNode);assert.equal(p.toNode,old.toNode);
  for(let i=0;i<p.nodeKeys.length;i++){const k=p.nodeKeys[i],n=i===0?p.fromNode:i===p.nodeKeys.length-1?p.toNode:null;if(occupied.has(k))assert.ok(n&&occupied.get(k)===n,'no new join');else occupied.set(k,n);}
  for(const step of p.steps){assert.ok(step.startFraction!==step.endFraction);const k=step.sourceEdgeKey+':'+[step.startFraction,step.endFraction].sort((a,b)=>a-b).join(',');assert.ok(!used.has(k));used.add(k);}
 }
 assert.equal(linked.rapids.length,53);assert.equal(linked.waterfalls.length,55);
 for(const fall of linked.waterfalls)for(const link of fall.incidences){const p=linked.paths.find(p=>p.riverId===link.riverId&&p.sourceEdgeKey===link.sourceEdgeKey);assert.deepEqual(link.point,fall.point);assert.deepEqual(link.point,link.flow==='entering'?p.points.at(-1):p.points[0]);assert.ok(Math.abs(Math.hypot(link.tangent.x,link.tangent.y)-1)<1e-10);}
 assert.deepEqual(prepareRefinementTerminalRoutes({seed:423493684,origin,cells:available.toReversed(),rivers:reordered,marks:{rapids:new Set(source.segments.map(s=>s.edgeKey).reverse()),waterfalls:new Set(source.segments.flatMap(s=>[s.from.key,s.to.key]).reverse())}}),linked);
 assert.equal(JSON.stringify(world),before);
});

// A directed synthetic diameter, not a claim about generated-world mark counts.
function sourceDiameter(){
 const scale=Math.sqrt(3)*28/6,up={key:'z-up',x:0,y:-scale/Math.sqrt(3)},down={key:'a-down',x:0,y:scale/Math.sqrt(3)},edgeKey=[up.key,down.key].sort().join('|');
 const river={id:1,regionId:4,vertexPath:[up,down],sectors:[{id:'one',riverId:1,sectorIndex:1,vertexPath:[up,down],edgeKeys:[edgeKey],startVertexKey:up.key,endVertexKey:down.key,startReason:'river_start',endReason:'region_boundary',assignedRegionId:4,fullness:2}]};
 return {rivers:[river],origin:{x:12,y:-7},marks:{rapids:new Set([edgeKey]),waterfalls:new Set([down.key])}};
}
test('GEO2 source bridge rejects sector direction, coverage and mark-reference contradictions atomically',()=>{
 const data=sourceDiameter(),before=JSON.stringify(data.rivers),source=normalizeRefinementRiverSource(data);
 assert.equal(source.status,'prepared');assert.equal(source.segments[0].from.key,'z-up');assert.equal(source.segments[0].to.key,'a-down');assert.equal(source.segments[0].fullness,2);
 const changed=structuredClone(data);changed.rivers[0].name='ignored';assert.deepEqual(normalizeRefinementRiverSource(changed),source);
 for(const change of [r=>{r.sectors[0].vertexPath.reverse();r.sectors[0].startVertexKey='a-down';r.sectors[0].endVertexKey='z-up';},r=>r.sectors.push({...r.sectors[0],id:'duplicate',sectorIndex:2}),r=>r.sectors[0].edgeKeys[0]='missing',r=>r.sectors[0].vertexPath[0]={...r.sectors[0].vertexPath[0],x:9}]){
  const invalid=structuredClone(data);change(invalid.rivers[0]);const result=normalizeRefinementRiverSource(invalid);assert.equal(result.status,'error');assert.equal(result.segments,undefined);assert.ok(result.refs.length);const linked=prepareRefinementTerminalRoutes({...invalid,seed:42,cells:[{q:0,r:0}]});assert.equal(linked.status,'error');assert.equal(linked.paths,undefined);
 }
 for(const marks of [{rapids:new Set(['foreign']),waterfalls:new Set()},{rapids:new Set(),waterfalls:new Set(['foreign'])}])assert.equal(normalizeRefinementRiverSource({...data,marks}).code,'feature_conflict');
 const hidden=normalizeRefinementRiverSource({...data,marks:{rapids:new Set(),waterfalls:new Set()}});assert.equal(hidden.rapids.length,0);assert.equal(hidden.waterfalls.length,0);assert.notEqual(hidden.sourceSignature,source.sourceSignature);
 assert.equal(JSON.stringify(data.rivers),before);
});
test('GEO2 marks use directed arc position on bent refined paths and preserve sector exit refs',()=>{
 const data=sourceDiameter(),input={...data,seed:42,cells:[{q:0,r:0}]},r=prepareRefinementRiverNetwork(input);
 assert.equal(r.status,'prepared',JSON.stringify(r));const path=r.rivers.paths[0],points=path.vertices.map(v=>refinementWorldPoint(v,data.origin));assert.equal(points.length,4);
 // Independent half-length interpolation: three equal physical edge steps.
 const rapid=r.rapids[0];assert.equal(rapid.sourceEdgeKey,data.rivers[0].sectors[0].edgeKeys[0]);assert.equal(rapid.fraction,.5);
 assert.ok(Math.hypot(rapid.point.x-(points[1].x+points[2].x)/2,rapid.point.y-(points[1].y+points[2].y)/2)<1e-10);
 const checkTangent=(actual,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);assert.ok(Math.abs(actual.x-dx/length)<1e-10);assert.ok(Math.abs(actual.y-dy/length)<1e-10);};
 checkTangent(rapid.tangent,points[1],points[2]);const fall=r.waterfalls[0];assert.deepEqual(fall.point,points.at(-1));assert.equal(fall.sourceRef,'vertex:a-down');assert.equal(fall.incidences.length,1);assert.equal(fall.incidences[0].flow,'entering');assert.equal(fall.incidences[0].fraction,1);checkTangent(fall.incidences[0].tangent,points.at(-2),points.at(-1));
 const boundary=r.boundaries.find(b=>b.end==='end');assert.equal(boundary.sectorId,'one');assert.equal(boundary.reason,'region_boundary');assert.equal(boundary.assignedRegionId,4);assert.equal(boundary.sourceNodeKey,'a-down');assert.deepEqual(boundary.point,fall.point);
 assert.equal(r.completeGeometryPlan,false);assert.ok(Object.isFrozen(rapid.point));assert.ok(Object.isFrozen(fall.incidences));
 assert.deepEqual(prepareRefinementRiverNetwork(input),r);
 const linked=prepareRefinementTerminalRoutes(input);assert.equal(linked.status,'prepared');const points2=linked.paths[0].points;assert.deepEqual(linked.waterfalls[0].point,points2.at(-1));assert.ok(linked.rapids[0].tangent.y>0);assert.equal(linked.allocation,'existing_endpoint_edges_only');
 // The same undirected geometry with explicit reversed source flow reverses tangents.
 const reverse=structuredClone(data);const river=reverse.rivers[0],s=river.sectors[0];river.vertexPath.reverse();s.vertexPath=[...river.vertexPath];s.startVertexKey='a-down';s.endVertexKey='z-up';reverse.marks.waterfalls=new Set(['z-up']);
 const reversed=prepareRefinementRiverNetwork({...reverse,seed:42,cells:input.cells});assert.equal(reversed.status,'prepared');assert.equal(reversed.rivers.paths[0].fromNode,'a-down');assert.equal(reversed.rivers.paths[0].toNode,'z-up');assert.equal(reversed.waterfalls[0].incidences[0].flow,'entering');assert.ok(reversed.rapids[0].tangent.y<0);assert.ok(rapid.tangent.y>0);
});
