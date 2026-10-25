import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createGenerationHarness} from '../review-855cfd5/test/helpers/generation-harness.mjs';
const cp=x=>JSON.parse(JSON.stringify(x));
const save=h=>{let x=cp(h.render().createSaveData());delete x.savedAt;return x};
const stack=h=>cp([h.render().undoHistory,h.render().redoHistory]);
function setup(mode){let h=createGenerationHarness(0,'?generationDebug=1');h.render();h.guardRandom();h.render().setGenSizeCategory('locality');h.render().setGenerationMode(mode);return h}
function finish(h){for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().kingdomJob,null)}
function add(h){h.render().generateAt(h.render().candidateHexes[0]??{q:0,r:0});finish(h);assert.equal(h.render().generationError,null)}
for(const mode of ['classic','mythic']){
 let h=setup(mode);add(h);h.render().regenerateLastRegion();let old=h.render().finishPendingRegeneration;old();finish(h);
 h.render().regenerateLastRegion();h.render().finishPendingRegeneration();finish(h);let before=save(h),hist=stack(h);old();finish(h);let after=save(h);
 fs.writeFileSync(new URL(`./R5-${mode}.json`,import.meta.url),JSON.stringify({before,after,beforeHistories:hist,afterHistories:stack(h)},null,2));
 console.log(JSON.stringify({beforeSha256:crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),afterSha256:crypto.createHash('sha256').update(JSON.stringify(after)).digest('hex'),case:'old pending after newer regeneration',mode,unchanged:JSON.stringify(before)===JSON.stringify(after),historiesUnchanged:JSON.stringify(hist)===JSON.stringify(stack(h)),beforeRng:before.generation,afterRng:after.generation,beforeRegions:before.map.regions.length,afterRegions:after.map.regions.length,beforeUndo:hist[0].length,afterUndo:stack(h)[0].length}));
}
