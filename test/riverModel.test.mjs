import test from 'node:test';
import assert from 'node:assert/strict';
import {confluenceOutputs,confluenceInputs,minimumLakeHexes,lakeAllows,validateRiverNetwork,solveRiverNetwork} from '../src/riverModel/core.ts';

const node=(id,kind,extra={})=>({id,kind,...extra});
const edge=(id,from,to,fullness,height=1)=>({id,from,to,regionId:1,height,...(fullness===undefined?{}:{fullness})});
function junction(kind,ins,outs,height=1,area) {
 return {nodes:[node('event',kind,area===undefined?{}:{lakeHexCount:area}),
  ...ins.map((_,i)=>node(`i${i}`,'open')),...outs.map((_,i)=>node(`o${i}`,'sea'))],
 edges:[...ins.map((f,i)=>edge(`in${i}`,`i${i}`,'event',f,height)),...outs.map((f,i)=>edge(`out${i}`,'event',`o${i}`,f,height))]};
}
function solved(n) {
 const result=solveRiverNetwork(n);assert.equal(result.status,'solved',JSON.stringify(result));
 const complete={...n,edges:n.edges.map(e=>({...e,fullness:result.fullness[e.id]}))};
 assert.equal(validateRiverNetwork(complete).valid,true,JSON.stringify(complete));return result.fullness;
}
// Independent explicit acceptance table: rows/columns are input fullness 1..5.
const TABLE=[
 [[1,2],[2,3],[3],[4],[5]],
 [[2,3],[2,3],[3,4],[4],[5]],
 [[3],[3,4],[3,4],[4,5],[5]],
 [[4],[4],[4,5],[4,5],[5]],
 [[5],[5],[5],[5],[5]],
];
test('RIV-004/005/013 all 125 triples, symmetry and inverse share the accepted relation',()=>{
 for(let a=1;a<=5;a++)for(let b=1;b<=5;b++) {
  assert.deepEqual(confluenceOutputs(a,b),TABLE[a-1][b-1]);
  assert.deepEqual(confluenceOutputs(a,b),confluenceOutputs(b,a));
  for(let out=1;out<=5;out++) {
   const allowed=TABLE[a-1][b-1].includes(out);
   assert.equal(confluenceInputs(out,b).includes(a),allowed);
   assert.equal(validateRiverNetwork(junction('confluence',[a,b],[out])).valid,allowed);
   assert.equal(solveRiverNetwork(junction('confluence',[a,b],[out])).status,allowed?'solved':'unsatisfiable');
  }
 }
});
test('RIV-EX-01 / AUD-01 no change at region or height boundary',()=>{
 const n=junction('continuation',[1],[undefined],2);n.edges[0].height=3;n.edges[1].regionId=2;
 assert.equal(solved(n).out0,1);
 n.edges[1].fullness=3;
 assert.equal(validateRiverNetwork(n).issues[0].rule,'RIV-002');
 assert.equal(solveRiverNetwork(n).status,'unsatisfiable');
});
test('RIV-EX-02 weak tributary cannot raise 3',()=>assert.equal(solved(junction('confluence',[3,1],[undefined])).out0,3));
test('RIV-EX-03 / EX-22 region height two selects 2, lowland selects 3',()=>{
 assert.equal(solved(junction('confluence',[2,1],[undefined],2)).out0,2);
 assert.equal(solved(junction('confluence',[2,1],[undefined],1)).out0,3);
});
test('RIV-EX-04/05 known downstream values are hard constraints',()=>{
 assert.equal(solved(junction('confluence',[2,1],[3])).out0,3);
 assert.equal(solved(junction('confluence',[3,2],[3])).out0,3);
});
test('RIV-EX-06 any tributary can join 5',()=>{
 for(let b=1;b<=5;b++)assert.equal(solved(junction('confluence',[5,b],[undefined])).out0,5);
});
test('RIV-EX-07 / AUD-02 true source always 1, independent of height',()=>{
 for(const height of [1,2,3])assert.equal(solved(junction('source',[],[undefined],height)).out0,1);
 const n=junction('source',[],[3]);
 assert.equal(validateRiverNetwork(n).issues[0].rule,'RIV-007');
 assert.equal(solveRiverNetwork(n).status,'unsatisfiable');
});
test('RIV-EX-08/17 lake source minimum size, not equality',()=>{
 for(let f=1;f<=5;f++)for(let area=1;area<=6;area++) {
  assert.equal(lakeAllows([],[f],area),area>=f-1);
  assert.equal(validateRiverNetwork(junction('lake',[],[f],1,area)).valid,area>=f-1);
 }
 assert.equal(solved(junction('lake',[],[3],1,6)).out0,3);
 assert.equal(minimumLakeHexes([],[3]),2);
});
test('RIV-EX-09/10/18/23/24 flowing lakes: exhaustive values and sizes',()=>{
 for(let a=1;a<=5;a++)for(let b=1;b<=5;b++)for(let area=1;area<=5;area++) {
  const expected=Math.abs(a-b)<=area;
  assert.equal(lakeAllows([a],[b],area),expected);
  assert.equal(validateRiverNetwork(junction('lake',[a],[b],1,area)).valid,expected);
 }
 assert.equal(minimumLakeHexes([4],[1]),3);
 assert.equal(minimumLakeHexes([2],[4]),2);
 assert.equal(lakeAllows([4],[6],3),false);
});
test('RIV-EX-11 closed lake absorbs the sum once',()=>{
 assert.equal(lakeAllows([2],[],1),false);assert.equal(lakeAllows([2],[],2),true);
 assert.equal(solveRiverNetwork(junction('lake',[2],[],1,1)).status,'unsatisfiable');
 assert.equal(solveRiverNetwork(junction('lake',[2],[],1,2)).status,'solved');
 assert.equal(lakeAllows([2,3],[],4),false);assert.equal(lakeAllows([2,3],[],5),true);
});
test('RIV-EX-12 every fullness may enter sea, never emerge from it',()=>{
 for(let f=1;f<=5;f++)assert.equal(solveRiverNetwork({nodes:[node('a','open'),node('b','sea')],edges:[edge('r','a','b',f)]}).status,'solved');
 assert.equal(solveRiverNetwork({nodes:[node('a','sea'),node('b','open')],edges:[edge('r','a','b',1)]}).status,'invalid');
});
test('RIV-EX-14 open upstream is not a source',()=>{
 const n={nodes:[node('a','open'),node('b','sea')],edges:[edge('r','a','b',3)]};assert.equal(solved(n).r,3);
 n.nodes[0].kind='source';assert.equal(solveRiverNetwork(n).status,'unsatisfiable');
});
test('RIV-EX-15 numerical scope: input immutable, fixed values survive JSON roundtrip',()=>{
 const n=junction('confluence',[3,2],[3]);const before=JSON.stringify(n);
 for(const e of n.edges)Object.freeze(e);Object.freeze(n.edges);Object.freeze(n);
 assert.deepEqual(solved(n),solved(JSON.parse(before)));assert.equal(JSON.stringify(n),before);
});
test('RIV-EX-16 numerical scope: actual area one cannot justify drop by two',()=>{
 assert.equal(solveRiverNetwork(junction('lake',[4],[2],1,1)).status,'unsatisfiable');
 assert.equal(solveRiverNetwork(junction('lake',[4],[2],1,2)).status,'solved');
});
test('RIV-EX-19/20 growth downstream, reduced new upstream',()=>{
 assert.equal(solved(junction('confluence',[3,2],[undefined])).out0,4);
 assert.equal(solved(junction('confluence',[undefined,2],[4])).in0,3);
 assert.equal(solved(junction('confluence',[undefined,1],[3])).in0,2);
 assert.equal(solved(junction('confluence',[1,1],[undefined])).out0,2);
});
test('RIV-EX-21 multi-inlet/outlet lake uses aggregate budget',()=>{
 assert.equal(solveRiverNetwork(junction('lake',[4,3],[5],1,1)).status,'unsatisfiable');
 assert.equal(solveRiverNetwork(junction('lake',[4,3],[5],1,2)).status,'solved');
 assert.equal(solveRiverNetwork(junction('lake',[4,3],[3,2],1,1)).status,'unsatisfiable');
 assert.equal(solveRiverNetwork(junction('lake',[4,3],[3,2],1,2)).status,'solved');
 const n=junction('lake',[4,3],[undefined,2],1,1);const out=solved(n);assert.ok(Math.abs(7-out.out0-2)<=1);
});
test('RIV-001 / AUD-04 reject invalid numeric values at runtime',()=>{
 for(const f of [0,6,99,-1,1.5,NaN,Infinity,'3',null]) {
  assert.equal(validateRiverNetwork(junction('source',[],[f])).valid,false);
  assert.equal(solveRiverNetwork(junction('source',[],[f])).status,'invalid');
  assert.deepEqual(confluenceOutputs(2,f),[]);
 }
 assert.equal(validateRiverNetwork(junction('source',[],[undefined])).valid,false);
});
test('RIV-006 / topology: unsupported degree, duplicate ids, dangling edges and cycles',()=>{
 const malformed=[null,{},junction('confluence',[1,1,1],[2]),junction('lake',[],[1,1],1,3),junction('lake',[1],[1],1,0)];
 const dangling=junction('source',[],[1]);dangling.edges[0].to='missing';malformed.push(dangling);
 const badHeight=junction('continuation',[1],[1]);badHeight.edges[1].height=2;malformed.push(badHeight);
 const duplicate=junction('source',[],[1]);duplicate.nodes.push({...duplicate.nodes[0]});malformed.push(duplicate);
 malformed.push({nodes:[node('a','continuation'),node('b','continuation')],edges:[edge('x','a','b',1),edge('y','b','a',1)]});
 for(const n of malformed) {assert.equal(validateRiverNetwork(n).valid,false);assert.equal(solveRiverNetwork(n).status,'invalid');}
});
function chain() {
 return {nodes:[node('a','open'),node('b','open'),node('c','open'),node('j1','confluence'),node('j2','confluence'),node('end','sea')],
 edges:[edge('a','a','j1',undefined),edge('b','b','j1',1),edge('middle','j1','j2',undefined),edge('c','c','j2',2),edge('out','j2','end',4)]};
}
test('RIV-EX-13 two confluences propagate constraints both ways; order invariant',()=>{
 const n=chain(), expected=solved(n);
 assert.equal(expected.a,2);assert.equal(expected.middle,3);
 const permutations=[n,{nodes:[...n.nodes].reverse(),edges:[...n.edges].reverse()},
  {nodes:[...n.nodes.slice(2),...n.nodes.slice(0,2)],edges:[...n.edges.slice(3),...n.edges.slice(0,3)]}];
 for(const p of permutations)assert.deepEqual(solved(p),expected);
 // Independent finite oracle: the explicit table above, not the solver validator.
 for(let a=1;a<=5;a++)for(let mid=1;mid<=5;mid++) {
  const fixed={...n,edges:n.edges.map(e=>({...e,...(e.id==='a'?{fullness:a}:e.id==='middle'?{fullness:mid}:{})}))};
  const valid=TABLE[a-1][0].includes(mid)&&TABLE[mid-1][1].includes(4);
  assert.equal(solveRiverNetwork(fixed).status,valid?'solved':'unsatisfiable');
 }
 // An unresolved whole network can be impossible despite valid individual shapes.
 n.edges.find(e=>e.id==='a').fullness=1;
 assert.equal(solveRiverNetwork(n).status,'unsatisfiable');
});
test('bounded search reports limit, never false impossibility or a partial optimum',()=>{
 const n=junction('confluence',[undefined,undefined],[undefined]);
 assert.equal(solveRiverNetwork(n,{maxStates:1}).status,'limit');
 assert.equal(solveRiverNetwork(n,{maxStates:0}).status,'invalid');
});
