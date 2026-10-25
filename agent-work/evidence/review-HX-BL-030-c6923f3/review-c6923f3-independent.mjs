import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from './review-c6923f3/test/helpers/generation-harness.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const save=h=>{const d=copy(h.render().createSaveData());delete d.savedAt;return d;};
const setup=()=>{const h=createGenerationHarness(0);h.render();h.guardRandom();h.render().setGenSizeCategory('locality');return h;};
const output={sha:'c6923f37559a8ce00e0bb995e19c32fb22f3941c',node:process.version,results:[]};
for(const rerender of [false,true]){
 const h=setup(),before=save(h),cb=h.render().generateAt;cb({q:0,r:0});if(!rerender)cb({q:0,r:0});const first=save(h);if(rerender)cb({q:0,r:0});assert.deepEqual(save(h),first);assert.equal(h.render().undoHistory.length,1);h.render().undoMap();assert.deepEqual(save(h),before);h.render().redoMap();assert.deepEqual(save(h),first);output.results.push({id:'R1',rerender,status:'pass'});
}
for(const mode of ['classic','mythic']){
 const h=setup();h.render().setGenerationMode(mode);h.render().generateAt({q:0,r:0});while(h.render().kingdomJob)h.render().advanceKingdom();assert.equal(h.render().generationError,null);
 const before=save(h);h.render().regenerateLastRegion();const pending=save(h);h.render().finishPendingRegeneration();while(h.render().kingdomJob)h.render().advanceKingdom();assert.equal(h.render().generationError,null);const after=save(h),checkpoint=copy(h.render().history.at(-1).generation);
 assert.deepEqual(checkpoint,before.generation);h.render().deleteLastRegion();assert.deepEqual(save(h).generation,before.generation);h.render().undoMap();assert.deepEqual(save(h),after);h.render().undoMap();assert.deepEqual(save(h),before);
 output.results.push({id:'R2 checkpoint',mode,status:'pass',before:before.generation,pending:pending.generation,checkpoint});
}
fs.writeFileSync('/workspace/scratch/bb71cea1fbf0/review-c6923f3-independent.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
