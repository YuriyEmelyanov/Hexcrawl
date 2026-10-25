import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationState,cloneGenerationState,draw,toponymSeedFor,generationValidationPath} from '../src/worldRandom.ts';
const vectors=JSON.parse(fs.readFileSync(new URL('./fixtures/rng-v3/vectors.json',import.meta.url)));
test('mulberry32 matches independent Python uint32 vectors, both independent streams',()=>{
 for(const [seed,expected]of Object.entries(vectors)){
  const state=createGenerationState(Number(seed));
  for(let i=0;i<10;i++){assert.equal(draw(state,'poi'),expected.poi[i]);assert.equal(draw(state,'geography'),expected.geography[i]);}
  const saved=JSON.parse(JSON.stringify(state)),clone=cloneGenerationState(state);
  assert.equal(draw(clone,'geography'),draw(saved,'geography'));assert.notDeepEqual(state,clone);
  const geo=createGenerationState(Number(seed));for(let i=0;i<10;i++)draw(geo,'geography');assert.equal(geo.streams.geography,state.streams.geography);
  assert.equal(toponymSeedFor(Number(seed)),(Number(seed)^0x85EBCA6B)>>>0);
 }
});
test('saved RNG validation never accepts incomplete/unsupported state',()=>{
 const state=createGenerationState(0);assert.equal(generationValidationPath(state),null);
 for(const bad of [null,[],{}, {...state,generatorVersion:'future'},{...state,rngVersion:'future'},{...state,masterSeed:-1},{...state,streams:{geography:1}},{...state,streams:{geography:4294967296,poi:0}},{...state,streams:{geography:.5,poi:0}}])assert.ok(generationValidationPath(bad));
});
