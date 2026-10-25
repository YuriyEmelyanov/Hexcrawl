import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createGenerationHarness} from '../review-202570a/test/helpers/generation-harness.mjs';
// Preserve full session Maps/Sets instead of losing their entries in JSON.
const clone=x=>JSON.parse(JSON.stringify(x,(_key,value)=>value instanceof Map?{$map:[...value]}:value instanceof Set?{$set:[...value]}:value));
function snapshot(h){const a=h.render();const json=clone(a.createSaveData());delete json.savedAt;return {json,rng:clone(a.generationRef.current),checkpoints:clone(a.history),undo:clone(a.undoHistory),redo:clone(a.redoHistory),pending:clone(a.pendingRegen),job:clone(a.kingdomJob)};}
function drain(h){let n=0;while(h.render().kingdomJob){assert.ok(++n<320);h.render().advanceKingdom();}assert.equal(h.render().generationError,null);}
function generate(h){h.render().generateAt(h.render().candidateHexes[0]??{q:0,r:0});drain(h);}
function request(h){h.render().regenerateLastRegion();assert.ok(h.render().pendingRegen);return h.render().finishPendingRegeneration;}
function native(h){const a=h.render();return structuredClone({document:a.captureDocument(),undo:a.undoHistory,redo:a.redoHistory,pending:a.pendingRegen,job:a.kingdomJob});}
const cases=[];
for(const mode of ['classic','mythic']){
 const h=createGenerationHarness(0,'?generationDebug=1');h.render();h.guardRandom();h.render().setGenerationMode(mode);h.render().setGenSizeCategory('locality');generate(h);
 const a=request(h);a();drain(h);const b=request(h);b();drain(h);
 const check=(name,fn=a)=>{const before=snapshot(h),fullBefore=native(h);fn();assert.deepEqual(native(h),fullBefore);assert.deepEqual(snapshot(h),before);const hash=createHash('sha256').update(JSON.stringify(before)).digest('hex');cases.push({mode,name,status:'pass',sha256:hash});fs.writeFileSync(new URL(`./snapshot-${mode}-${name}.json`,import.meta.url),JSON.stringify(before,null,2));};
 check('A-after-B');h.render().undoMap();assert.ok(h.render().redoHistory.length);check('A-after-undo-with-redo');h.render().redoMap();check('A-after-redo');
 const c=request(h);check('A-during-new-pending');c();if(mode==='mythic'){assert.ok(h.render().kingdomJob);check('A-during-new-job');}drain(h);
 // Callback captured from an unconsumed pending render also becomes stale once C changes the document.
 check('C-consumed-after-completion',c);
}
fs.writeFileSync(new URL('./r5-results.json',import.meta.url),JSON.stringify({head:'202570a4b97beb2090225ef4e485b00a43c34fb5',cases},null,2));
console.log(JSON.stringify(cases,null,2));
