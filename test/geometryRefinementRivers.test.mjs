import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {prepareRefinementRivers} from '../src/geometryRefinementRivers.ts';
import {refinementEdgeGraph,refinementVertexKey} from '../src/geometryRefinementGrid.ts';
import {projectOneMile} from '../src/oneMile.ts';
import {detailSourcePixelToWorld} from '../src/detailGeography.ts';
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
 const segments=world.map.rivers.flatMap(r=>r.vertexPath.slice(1).map((to,i)=>{const from=r.vertexPath[i],edgeKey=[from.key,to.key].sort().join('|'),sector=r.sectors.find(s=>s.edgeKeys.includes(edgeKey));assert.ok(sector);return {riverId:r.id,edgeKey,from:{key:from.key,point:detailSourcePixelToWorld(from)},to:{key:to.key,point:detailSourcePixelToWorld(to)},fullness:sector.fullness};}));
 assert.equal(segments.length,53);
 const r=prepareRefinementRivers({seed:423493684,origin:{x:0,y:0},cells:available,segments});assertTopology(r,segments,available);
 assert.deepEqual(prepareRefinementRivers({seed:423493684,origin:{x:0,y:0},cells:[...available].reverse(),segments:[...segments].reverse()}),r);
 assert.deepEqual(new Set(r.paths.map(p=>JSON.stringify([p.riverId,p.sourceEdgeKey]))),new Set(segments.map(p=>JSON.stringify([p.riverId,p.edgeKey]))));
 assert.equal(JSON.stringify(world),before);
});
