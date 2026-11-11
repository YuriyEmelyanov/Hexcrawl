import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid,detailCellPolygon,detailCellAreaSquareMiles,detailPolygonArea} from '../src/detailGrid.ts';
import {projectDetailDisplayCells} from '../src/detailDisplay.ts';

const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
const key=cell=>`${cell.q},${cell.r}`;

// GRID-G02/C02: the selected outline remains complete beside accepted geography.
test('a 24-mile display cell retains its full outline and unknown area at 25 percent accepted coverage',()=>{
 const grid=createDetailGrid(24),accepted=[{q:0,r:0},{q:1,r:0},{q:0,r:1},{q:-1,r:1}];
 const cells=projectDetailDisplayCells(grid,accepted,[{q:2,r:0}]);
 const central=cells.find(item=>key(item.cell)==='0,0'),area=detailCellAreaSquareMiles(grid);
 assert.ok(central);assert.deepEqual(central.polygon,detailCellPolygon(grid,{q:0,r:0}));
 near(detailPolygonArea(central.polygon),area);near(central.acceptedAreaSquareMiles,area/4);
 near(central.acceptedFraction,.25);near(central.unknownAreaSquareMiles,area*.75);near(central.unknownFraction,.75);
 assert.equal(central.accepted.length,4);assert.deepEqual(central.candidates.map(hit=>hit.sourceCell),[{q:2,r:0}]);
 assert.ok(central.candidateAreaSquareMiles>0&&central.candidateAreaSquareMiles<central.unknownAreaSquareMiles);
 assert.ok(cells.some(item=>item.accepted.length===0&&item.candidates.length>0),'candidate-only selected cells are included');
});

// GRID-C02/03: legal source intersections annotate one selected-size cell.
test('one-mile display projection includes accepted and legal candidate fragments in the same full cell',()=>{
 const accepted=[{q:0,r:0}],candidates=[{q:1,r:0}],grid=createDetailGrid(1);
 const cells=projectDetailDisplayCells(grid,accepted,candidates),boundary=cells.find(item=>key(item.cell)==='3,0');
 assert.ok(boundary);assert.deepEqual(boundary.polygon,detailCellPolygon(grid,{q:3,r:0}));
 assert.deepEqual(boundary.accepted.map(hit=>hit.sourceCell),accepted);assert.deepEqual(boundary.candidates.map(hit=>hit.sourceCell),candidates);
 near(boundary.acceptedFraction,.5);near(boundary.candidateAreaSquareMiles,boundary.unknownAreaSquareMiles);
 assert.ok(cells.some(item=>item.accepted.length===0&&item.candidates.length>0));
 for(const display of cells) {
  assert.ok(display.accepted.length+display.candidates.length>0);
  for(const hit of [...display.accepted,...display.candidates])assert.ok(hit.areaSquareMiles>0);
 }
 const sourceView=projectDetailDisplayCells(createDetailGrid(6),accepted,candidates);
 assert.deepEqual(sourceView.map(item=>item.cell),[...accepted,...candidates],'edge/vertex-only neighbours do not become display cells');
 assert.deepEqual(sourceView.map(item=>item.acceptedFraction),[1,0]);
});

test('display projection deduplicates sources and stale candidates in stable canonical order',()=>{
 const grid=createDetailGrid(24),a={q:-1,r:0},b={q:0,r:0},c={q:1,r:0},d={q:0,r:1};
 const expected=projectDetailDisplayCells(grid,[a,b],[c,d]);
 assert.deepEqual(projectDetailDisplayCells(grid,[b,a,b],[d,b,c,d,a]),expected);
 assert.deepEqual(expected.map(item=>key(item.cell)),[...expected].sort((x,y)=>x.cell.q-y.cell.q||x.cell.r-y.cell.r).map(item=>key(item.cell)));
 for(const display of expected) {
  assert.equal(new Set(display.accepted.map(hit=>key(hit.sourceCell))).size,display.accepted.length);
  assert.ok(display.candidates.every(hit=>![key(a),key(b)].includes(key(hit.sourceCell))));
 }
});

test('all selected steps conserve accepted area with a fixed origin without mutation or random generation',()=>{
 const accepted=[{q:-2,r:1},{q:-1,r:1}],candidates=[{q:0,r:1}],origin={x:17,y:-9};
 const before=structuredClone({accepted,candidates,origin}),random=Math.random;
 Math.random=()=>{throw Error('Display projection must not consume world randomness');};
 try {
  for(const step of [1,6,12,24]) {
   const grid=createDetailGrid(step,origin),cells=projectDetailDisplayCells(grid,accepted,candidates);
   near(cells.reduce((sum,item)=>sum+item.acceptedAreaSquareMiles,0),2*detailCellAreaSquareMiles(createDetailGrid(6)),1e-8);
   for(const display of cells) {
    near(detailPolygonArea(display.polygon),display.areaSquareMiles,1e-8);
    near(display.acceptedAreaSquareMiles+display.unknownAreaSquareMiles,display.areaSquareMiles);
    near(display.acceptedFraction+display.unknownFraction,1);
    assert.ok(display.acceptedFraction>=0&&display.acceptedFraction<=1);
    assert.ok(display.candidateAreaSquareMiles<=display.unknownAreaSquareMiles);
    assert.ok(Object.isFrozen(display)&&Object.isFrozen(display.polygon)&&Object.isFrozen(display.accepted)&&Object.isFrozen(display.candidates));
   }
  }
  assert.deepEqual(projectDetailDisplayCells(createDetailGrid(1),[],[]),[]);
  assert.throws(()=>projectDetailDisplayCells(createDetailGrid(1),[{q:.5,r:0}]));
  assert.throws(()=>projectDetailDisplayCells(createDetailGrid(1),[],[{q:NaN,r:0}]));
  assert.deepEqual({accepted,candidates,origin},before);
 } finally {Math.random=random;}
});
