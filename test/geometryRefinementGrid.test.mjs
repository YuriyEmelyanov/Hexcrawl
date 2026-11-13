import test from 'node:test';
import assert from 'node:assert/strict';
import {detailCellPolygon,createDetailGrid} from '../src/detailGrid.ts';
import {refinementCellVertices,refinementWorldPoint,refinementVertexKey,refinementEdgeGraph,
 refinementPreferredSide,refinementPerimeterDetour,refinementShortestEdgePath} from '../src/geometryRefinementGrid.ts';

// Distinct missing GEO2 G201/G202 contracts; rationale recorded before adding
// in docs/geo2-work-in-progress.md. No App/whole-world acceptance implied.
test('GEO2 canonical shared edges match physical grid and ignore cell order',()=>{
 const cells=[{q:0,r:0},{q:1,r:0}],before=JSON.stringify(cells);
 const graph=refinementEdgeGraph(cells);
 assert.equal(graph.edges.length,11);assert.equal(graph.vertices.length,10);
 assert.deepEqual(graph,refinementEdgeGraph([...cells].reverse()));
 assert.deepEqual(graph,refinementEdgeGraph([...cells,cells[0]]));
 for(const c of [...cells,{q:-3,r:0},{q:-9,r:7}])assert.deepEqual(refinementCellVertices(c).map(v=>refinementWorldPoint(v)),detailCellPolygon(createDetailGrid(1),c));
 assert.equal(JSON.stringify(cells),before);
 assert.throws(()=>refinementEdgeGraph([{q:Number.MAX_SAFE_INTEGER,r:1}]),/Unsafe/);
 assert.throws(()=>refinementEdgeGraph(Array(4097).fill(cells[0])),/4096/);
});
test('GEO2 side choice follows specified UTF8 FNV and is reproducible without shared RNG',()=>{
 const side=(seed)=>refinementPreferredSide(seed,1,'-3,0|0,2',{q:-3,r:0});
 // Independent golden implementation using bytes and BigInt multiplication.
 const expected=seed=>{let n=2166136261n;for(const b of Buffer.from(JSON.stringify(['geo2-v1',seed,1,'-3,0|0,2',-3,0])))n=((n^BigInt(b))*16777619n)&0xffffffffn;return n%2n===0n?'left':'right';};
 const observed=new Set();for(const seed of [0,1,2,3,423493684,4294967295]){assert.equal(side(seed),expected(seed));assert.equal(side(seed),side(seed));observed.add(side(seed));}
 assert.equal(observed.size,2);
 assert.throws(()=>refinementPreferredSide(NaN,1,'a',{q:0,r:0}),/Invalid/);
});
test('GEO2 all six diameter directions have opposite equal-edge perimeter alternatives',()=>{
 const c={q:-3,r:0},vs=refinementCellVertices(c),legal=new Set(refinementEdgeGraph([c]).edges.map(e=>e.key));
 for(let entry=0;entry<6;entry++){
  const exit=(entry+3)%6,left=refinementPerimeterDetour(c,entry,exit,'left'),right=refinementPerimeterDetour(c,entry,exit,'right');
  for(const [side,path] of [['left',left],['right',right]]){
   assert.equal(path.side,side);assert.equal(path.fallback,false);assert.equal(path.edgeKeys.length,3);
   assert.deepEqual(path.vertices[0],vs[entry]);assert.deepEqual(path.vertices.at(-1),vs[exit]);
   assert.ok(path.edgeKeys.every(k=>legal.has(k)));
  }
  assert.equal(left.edgeKeys.filter(k=>right.edgeKeys.includes(k)).length,0);
  assert.deepEqual(refinementPerimeterDetour(c,entry,exit,'left',new Set(left.edgeKeys)),{...right,fallback:true});
  assert.equal(refinementPerimeterDetour(c,entry,exit,'left',legal),null);
 }
 assert.throws(()=>refinementPerimeterDetour(c,0,0,'left'),/ports/);
});
test('GEO2 finite edge routing handles blocked alternatives without center shortcuts or mutation',()=>{
 const graph=refinementEdgeGraph([{q:0,r:0}]),before=JSON.stringify(graph),vs=refinementCellVertices({q:0,r:0});
 const a=refinementShortestEdgePath(graph,vs[0],vs[3]);assert.equal(a.length,4);
 assert.deepEqual(a,refinementShortestEdgePath({vertices:[...graph.vertices].reverse(),edges:[...graph.edges].reverse()},vs[0],vs[3]));
 const used=new Set();for(let i=1;i<a.length;i++){const keys=[refinementVertexKey(a[i-1]),refinementVertexKey(a[i])];const e=graph.edges.find(e=>keys.includes(refinementVertexKey(e.from))&&keys.includes(refinementVertexKey(e.to)));used.add(e.key);}
 const alternative=refinementShortestEdgePath(graph,vs[0],vs[3],used);assert.equal(alternative.length,4);assert.notDeepEqual(a,alternative);
 assert.equal(refinementShortestEdgePath(graph,vs[0],vs[3],new Set(graph.edges.map(e=>e.key))),null);
 assert.equal(JSON.stringify(graph),before);
 assert.deepEqual(refinementShortestEdgePath(graph,vs[0],vs[0]),[vs[0]]);
 const fake={vertices:graph.vertices,edges:[{key:'0,-2|1,1',from:vs[5],to:vs[1]}]};
 assert.throws(()=>refinementShortestEdgePath(fake,vs[0],vs[3]),/graph/);
});
