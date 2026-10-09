import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildForestGeometry,reflectForestEdge,woodlandPaths} from '../src/rendering/forestGeometry.ts';
import {FOREST_EDGES,WOODLAND_COMPOSITIONS} from '../src/rendering/forestTemplates.ts';
const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const cell=(q,r,biome='plain_deciduous_forest')=>({q,r,x:Math.sqrt(3)*(q+r/2)*28,y:42*r,biome});
test('indexed joins retain the approved large-map geometry exactly',()=>{
 const approved=new Map([[1,'a3487d470afc49baa12e3b550df6292c53369d9190ed8b802e1ce9818d75253c'],[7,'08df4bf8b6bf03178896778014882bd555267e460f6febd24363bd4b08c3ac48'],[20,'4795baac722a76e26cc268785c6c5c4dc83a325de0a67acf094a482492360217']]);
 for(const [seed,expected] of approved){
  const cells=[];for(let q=0;q<16;q++)for(let r=0;r<12;r++)cells.push({q,r,x:Math.sqrt(3)*28*(q+r/2),y:42*r,biome:(q*31+r*17+seed)%3?'plain_deciduous_forest':'deciduous_woodland',woodlandStyle:(q+r+seed)%2?'islands':'clearings'});
  const actual=createHash('sha256').update(JSON.stringify(buildForestGeometry(cells,28,seed))).digest('hex');
  assert.equal(actual,expected,`approved contours and bridges for seed ${seed}`);
 }
});
test('four edge reflections preserve exact endpoints and are reversible',()=>{
 for(const e of FOREST_EDGES)for(let v=0;v<4;v++){
  const ss=reflectForestEdge(e.segments,v);
  assert.deepEqual(ss[0].start,[0,0]);assert.deepEqual(ss.at(-1).end,[1,0]);
  const restored=reflectForestEdge(ss,v);
  for(let i=0;i<ss.length;i++)for(const k of ['start','c1','c2','end'])for(let j=0;j<2;j++)assert.ok(Math.abs(restored[i][k][j]-e.segments[i][k][j])<1e-12);
 }
});
test('approved compositions retain exactly 3 or 4 closed contours and stay inside all rotated hexes',()=>{
 assert.equal(WOODLAND_COMPOSITIONS.length,24);
 assert.equal(WOODLAND_COMPOSITIONS.filter(c=>c.count===3).length,12);
 for(const c of WOODLAND_COMPOSITIONS){
  assert.equal(c.loops.length,c.count);
  for(const loop of c.loops){
   assert.deepEqual(loop.segments[0].start,loop.segments.at(-1).end);
   for(const seg of loop.segments)for(let t=0;t<=1;t+=.1){
    const pt=[0,1].map(j=>(1-t)**3*seg.start[j]+3*(1-t)**2*t*seg.c1[j]+3*(1-t)*t*t*seg.c2[j]+t**3*seg.end[j]);
    for(let k=0;k<6;k++){const a=(k+.5)*Math.PI/3;assert.ok(pt[0]*Math.cos(a)+pt[1]*Math.sin(a)<.818);}
   }
  }
 }
});
test('dense canopy removes shared edges and retains a field hole; woodland islands are separate',()=>{
 const seven=[cell(0,0),...dirs.map(([q,r])=>cell(q,r))];
 const g=buildForestGeometry(seven,28,53);
 assert.equal(g.canopy.length,1);assert.equal(g.woodlands.length,0);
 const ring=buildForestGeometry(seven.slice(1),28,53);assert.equal(ring.canopy.length,2);
 const open=buildForestGeometry([cell(0,0,'deciduous_woodland')],28,53);
 assert.equal(open.canopy.length,0);assert.equal(open.woodlands[0].mode,'islands');
 assert.ok([3,4].includes(open.woodlands[0].paths.length));
 seven[0].biome='deciduous_woodland';
 const clearing=buildForestGeometry(seven,28,53);
 assert.equal(clearing.canopy.length,1);assert.equal(clearing.woodlands[0].mode,'clearings');
 assert.deepEqual(clearing.woodlands[0].paths,open.woodlands[0].paths,'The same composition serves both modes');
});
test('coordinate selection survives map growth, reordering and biome edits',()=>{
 const cells=[cell(0,0,'deciduous_woodland'),cell(-3,2,'dead_woodland')];
 const original=buildForestGeometry(cells,28,472).woodlands;
 const grown=buildForestGeometry([...cells.reverse(),cell(4,2)],28,472).woodlands;
 for(const p of original)assert.deepEqual(grown.find(n=>n.key===p.key).paths,p.paths);
 assert.deepEqual(woodlandPaths(-3,2,0,0,28,472),woodlandPaths(-3,2,0,0,28,472));
 assert.notDeepEqual(woodlandPaths(-3,2,0,0,28,472),woodlandPaths(-3,2,0,0,28,473));
});
test('a frozen clearing style covers the whole open region, including its outer cells',()=>{
 const cells=[{...cell(0,0,'deciduous_woodland'),woodlandStyle:'clearings'},{...cell(1,0,'deciduous_woodland'),woodlandStyle:'clearings'}];
 const g=buildForestGeometry(cells,28,3);assert.equal(g.canopy.length,1);assert.ok(g.woodlands.every(p=>p.mode==='clearings'));
});
test('candidate-facing crown edges remain exactly straight',()=>{
 const g=buildForestGeometry([{...cell(0,0),straightSides:[0,1,2,3,4,5]}],28,3);
 const values=g.canopy[0].match(/-?\d+(?:\.\d+)?/g).map(Number);
 assert.equal(values.length,38,'six straight cubic edges');
 let a=values.slice(0,2);
 for(let i=2;i<values.length;i+=6){const c1=values.slice(i,i+2),c2=values.slice(i+2,i+4),b=values.slice(i+4,i+6);for(const p of [c1,c2])assert.ok(Math.abs((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))<.05);a=b;}
});
test('woodland lake hexes suppress shapes and retain the underlying canopy',()=>{
 for(const mode of ['islands','clearings']){
  const c={...cell(0,0,'deciduous_woodland'),woodlandStyle:mode};
  const original=buildForestGeometry([c],28,53),lake=buildForestGeometry([{...c,lake:true}],28,53);
  assert.ok(original.woodlands.length);assert.equal(lake.woodlands.length,0);assert.equal(lake.canopy.length,1);
  assert.deepEqual(lake.canopy,buildForestGeometry([cell(0,0)],28,53).canopy);
 }
});
test('bridges preserve the original size and placement of source woodland contours',()=>{
 for(const mode of ['islands','clearings']){
  const c={...cell(0,0,'deciduous_woodland'),woodlandStyle:mode,openSides:[0,1,2,3,4,5]};
  const g=buildForestGeometry([c,cell(1,0),cell(-1,0,'open_plains')],28,53);
  assert.deepEqual(g.woodlands[0].paths,woodlandPaths(0,0,0,0,28,53).paths);
  assert.ok(Array.isArray(g.bridges));assert.ok(Array.isArray(g.clearingBridges));
 }
});
