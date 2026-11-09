import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid,detailCellCenter,worldToDetailCell,detailCellPolygon,detailCellAreaSquareMiles,detailFootprintBoundary,validateDetailFootprint,METERS_PER_MILE} from '../src/detailGrid.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
// DTL-01/02: existing pixel geometry has no physical multi-scale contract.
test('physical grids share origin/orientation, invert negative coordinates and resolve shared boundaries deterministically',()=>{
 const random=Math.random;Math.random=()=>{throw Error('Grid must not consume random');};
 try {
  const origin={x:17,y:-9};const before=structuredClone(origin);
  for(const step of [1,6,12,24]) {
   const g=createDetailGrid(step,origin);assert.deepEqual(detailCellCenter(g,{q:0,r:0}),origin);
   for(const q of [-20,-1,0,1,20])for(const r of [-20,-1,0,1,20])assert.deepEqual(worldToDetailCell(g,detailCellCenter(g,{q,r})),{q,r});
   const p=detailCellPolygon(g,{q:0,r:0});near(p[0].x-p[3].x,step);
   const area=Math.abs(p.reduce((a,v,i)=>a+v.x*p[(i+1)%6].y-v.y*p[(i+1)%6].x,0))/2;
   near(area,detailCellAreaSquareMiles(g));near(area/(Math.sqrt(3)/2),step*step);
   const boundary={x:origin.x+step/2,y:origin.y};assert.deepEqual(worldToDetailCell(g,boundary),{q:0,r:0});
   assert.deepEqual(worldToDetailCell(g,{...boundary,x:boundary.x+step*1e-6}),{q:1,r:0});
  }
  assert.deepEqual(origin,before);assert.equal(METERS_PER_MILE,1609.344);
  assert.throws(()=>createDetailGrid(2));assert.throws(()=>worldToDetailCell(createDetailGrid(1),{x:NaN,y:0}));
  assert.throws(()=>detailCellCenter(createDetailGrid(1),{q:Number.MAX_SAFE_INTEGER,r:0}));
 } finally {Math.random=random;}
});
// DTL-05/08/09: union contour must not reveal internal shared selection edges.
test('footprint boundaries remove every shared edge and retain exact topology independent of cell order',()=>{
 const g=createDetailGrid(1),one=[{q:0,r:0}],two=[...one,{q:1,r:0}];
 assert.equal(detailFootprintBoundary(g,one).length,6);const edges=detailFootprintBoundary(g,two);assert.equal(edges.length,10);
 assert.deepEqual(edges,detailFootprintBoundary(g,[...two].reverse()));
 const degree=new Map();for(const e of edges){degree.set(e.fromKey,(degree.get(e.fromKey)||0)+1);degree.set(e.toKey,(degree.get(e.toKey)||0)-1);}
 assert.ok([...degree.values()].every(x=>x===0),'closed directed union boundary');
 const ring=[{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}];
 assert.equal(detailFootprintBoundary(g,ring).length,24,'outer boundary plus hole rim; no shared edges');
 for(const invalid of [[],[...one,...one],[...one,{q:2,r:0}],[{q:.5,r:0}]])assert.throws(()=>validateDetailFootprint(invalid));
 assert.deepEqual(two,[{q:0,r:0},{q:1,r:0}]);
});
