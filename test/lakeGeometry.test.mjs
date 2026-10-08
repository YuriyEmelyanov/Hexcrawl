import test from 'node:test';
import assert from 'node:assert/strict';
import {buildNaturalLakes,inLakeCell} from '../src/rendering/lakeGeometry.ts';
const radius=28,cell=(q,r,lakeId=1)=>({q,r,lakeId,x:Math.sqrt(3)*radius*(q+r/2),y:radius*1.5*r});
const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
test('lake contours are stable after reload and input reordering; unrelated lakes cannot change them',()=>{
 const cells=[cell(0,0),cell(1,0),cell(0,1)];
 assert.deepEqual(buildNaturalLakes(cells,radius,71),buildNaturalLakes([...cells].reverse(),radius,71));
 const expanded=buildNaturalLakes([...cells,cell(9,0,2)],radius,71);
 assert.deepEqual(expanded.find(s=>s.cells.length===3),buildNaturalLakes(cells,radius,71)[0]);
 assert.notEqual(buildNaturalLakes(cells,radius,71)[0].path,buildNaturalLakes(cells,radius,72)[0].path);
});
test('single-cell lakes have distinct normalized silhouettes and points inside their cells',()=>{
 const seen=new Set();
 for(let id=1;id<=50;id++){
 const c=cell(0,0,id),s=buildNaturalLakes([c],radius,19)[0];assert.equal(s.loops.length,1);seen.add(s.path);
 for(const p of s.loops[0])assert.ok(inLakeCell(p,c,radius));
 }assert.equal(seen.size,50);
});
test('multi-cell lake shares one contour; island remains a separate hole; identities do not merge',()=>{
 assert.equal(buildNaturalLakes([cell(0,0),cell(1,0)],radius,1)[0].loops.length,1);
 const ring=dirs.map(([q,r])=>cell(q,r));assert.equal(buildNaturalLakes(ring,radius,1)[0].loops.length,2);
 assert.equal(buildNaturalLakes([cell(0,0,1),cell(1,0,2)],radius,1).length,2);
});
test('river inlet and outlet anchors both receive a connected mouth, regardless of direction',()=>{
 const c=cell(0,0),a={x:radius*Math.cos(-Math.PI/6),y:-radius/2},outside={x:a.x+20,y:a.y-15};
 const seg={key:'river-1',x1:outside.x,y1:outside.y,x2:a.x,y2:a.y,width:4};
 const forward=buildNaturalLakes([c],radius,1,[seg])[0];
 const backward=buildNaturalLakes([c],radius,1,[{...seg,x1:a.x,y1:a.y,x2:outside.x,y2:outside.y}])[0];
 assert.equal(forward.mouths.length,1);assert.deepEqual(forward.mouths,backward.mouths);assert.deepEqual(forward.mouths[0].anchor,a);
});

test('bounded per-layer cache reuses unchanged lakes, including map-origin translations, and invalidates changed data',async()=>{
 const {createLakeGeometryCache}=await import('../src/rendering/lakeGeometry.ts');
 const cache=createLakeGeometryCache(),cells=[cell(0,0),cell(1,0),cell(0,1)];
 const first=buildNaturalLakes(cells,radius,19,[],cache);
 assert.deepEqual(buildNaturalLakes([...cells].reverse(),radius,19,[],cache),first);assert.equal(cache.hits,1);
 const shifted=cells.map(c=>({...c,x:c.x+321,y:c.y-72}));
 const translated=buildNaturalLakes(shifted,radius,19,[],cache);assert.equal(cache.hits,2);
 assert.equal(translated[0].path,buildNaturalLakes(shifted,radius,19)[0].path);
 const a={x:radius*Math.cos(-Math.PI/6),y:-radius/2};
 const segment={key:'river-1',x1:a.x+20,y1:a.y-15,x2:a.x,y2:a.y,width:4};
 assert.deepEqual(buildNaturalLakes(cells,radius,19,[segment],cache),buildNaturalLakes(cells,radius,19,[segment]));assert.equal(cache.hits,3);
 buildNaturalLakes(cells,radius,20,[],cache);assert.equal(cache.misses,2);
 buildNaturalLakes([...cells,cell(1,1)],radius,19,[],cache);assert.equal(cache.misses,3);
 for(let i=0;i<90;i++)buildNaturalLakes([cell(i*3,0,i+100)],radius,19,[],cache);
 assert.ok(cache.entries.size<=64);assert.ok(cache.points<=100000);
});
