import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { terrainVariant, terrainAsset, lakeShorePath, waterAtDepth, OPEN_TERRAINS } from '../src/rendering/terrainStyle.ts';
const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
test('seeded terrain variation is stable and avoids all six neighbours, including negative coordinates',()=>{
  for(const seed of [0,1,197,0xffffffff]) {
    const seen=new Set();
    for(let q=-12;q<=12;q++) for(let r=-12;r<=12;r++) {
      const v=terrainVariant(q,r,seed);seen.add(v);
      assert.equal(v,terrainVariant(q,r,seed));
      for(const [dq,dr] of dirs) assert.notEqual(v,terrainVariant(q+dq,r+dr,seed));
    }
    assert.deepEqual([...seen].sort(),[1,2,3,4]);
  }
});
test('all twenty overlays exist as distinct transparent SVGs; forest relief uses only the placeholder',()=>{
  const contents=[];
  for(const biome of OPEN_TERRAINS) for(let i=1;i<=4;i++) {
    const s=fs.readFileSync(new URL(`../public/terrain/v2/${biome}-${i}.svg`,import.meta.url),'utf8');
    assert.match(s,/viewBox="0 0 100 116"/);assert.doesNotMatch(s,/<rect|<image|<text/);contents.push(s);
  }
  assert.equal(new Set(contents).size,20);
  for(const biome of ['plain_coniferous_forest','deciduous_forested_hills','dead_mountain_forest','mountain_woodland','swamp_forest'])
    assert.equal(terrainAsset(biome,1,2,3),'/terrain/v2/tree.svg');
});
test('lake shoreline removes shared edges while preserving island edges',()=>{
  const cell=(q,r)=>({q,r,x:Math.sqrt(3)*(q+r/2)*28,y:42*r});
  const edgeCount=cells=>(lakeShorePath(cells,28).match(/M/g)||[]).length;
  assert.equal(edgeCount([cell(0,0)]),6);
  assert.equal(edgeCount([cell(0,0),cell(1,0)]),10);
  assert.equal(edgeCount(dirs.map(([q,r])=>cell(q,r))),24); // 18 outer + 6 island
  assert.equal(edgeCount([cell(0,0),...dirs.map(([q,r])=>cell(q,r))]),18);
  assert.equal(waterAtDepth(0),'rgb(72,173,181)');
  assert.equal(waterAtDepth(1),'rgb(40,127,139)');
});
