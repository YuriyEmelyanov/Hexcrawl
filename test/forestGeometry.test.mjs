import test from 'node:test';
import assert from 'node:assert/strict';
import {buildForest,forestKind} from '../src/rendering/forestGeometry.ts';
const r=28;
const cell=(q,s,biome='plain_deciduous_forest')=>({q,r:s,x:Math.sqrt(3)*r*(q+s/2),y:1.5*r*s,biome});
const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
test('forest classification separates woodland from dense forest, including dead variants',()=>{
 for(const b of ['deciduous_woodland','mixed_woodland','coniferous_woodland','hilly_woodland','mountain_woodland','dead_woodland'])assert.equal(forestKind(b),'sparse');
 for(const b of ['plain_deciduous_forest','dead_forest','swamp_forest','dead_forested_hills','deciduous_mountain_forest'])assert.equal(forestKind(b),'dense');
 for(const b of ['open_plains','swamp','open_hills','mountains'])assert.equal(forestKind(b),null);
});
test('adjacent dense cells make one outline, while glades remain holes',()=>{
 const ring=dirs.map(([q,s])=>cell(q,s));
 assert.equal(buildForest([cell(0,0),cell(1,0)],r,197).length,1);
 assert.equal(buildForest(ring,r,197).length,2);
 assert.equal(buildForest([...ring,cell(0,0)],r,197).length,1);
 assert.equal(buildForest([cell(0,0),cell(5,0)],r,197).length,2);
});
test('each woodland hex has multiple groves inside its borders and is stable when neighbours change',()=>{
 for(let seed=0;seed<25;seed++)for(const[q,s]of[[0,0],[-3,2],[1,-4]]){
  const c=cell(q,s,'dead_woodland');const groves=buildForest([c],r,seed);
  assert.ok(groves.length>=4&&groves.length<=5);
  for(const g of groves)for(const p of g.points){
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      const d=(p.x-c.x)*Math.cos(a)+(p.y-c.y)*Math.sin(a);
      assert.ok(d<r*Math.sqrt(3)/2-r*.07,'Crown has a margin inside every side');
    }
  }
  const expanded=buildForest([cell(12,12),c],r,seed).filter(g=>g.kind==='sparse');
  assert.deepEqual(expanded,groves);
 }
});
