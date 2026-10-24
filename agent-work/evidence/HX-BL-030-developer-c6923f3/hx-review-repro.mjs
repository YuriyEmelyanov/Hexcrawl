import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {createGenerationHarness} from './hexcrawl/test/helpers/generation-harness.mjs';
const snapshot=h=>{const d=JSON.parse(JSON.stringify(h.render().createSaveData()));delete d.savedAt;return d;};
const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])):x;
const hash=x=>createHash('sha256').update(JSON.stringify(sorted(x))).digest('hex');
const state=h=>({regions:h.render().regions.length,undo:h.render().undoHistory.length,redo:h.render().redoHistory.length,generation:structuredClone(h.render().generationRef.current),canonical_json_sha256:hash(snapshot(h))});
const setup=()=>{const h=createGenerationHarness(0);h.render();h.guardRandom();h.render().setGenSizeCategory('locality');return h;};
const results={task:'HX-BL-030',spec:'1.0',head:'ffb5e85311420b14fe509819ec26b420606ce0dd',node:process.version,findings:[]};
{
 const h=setup(),callback=h.render().generateAt;
 callback({q:0,r:0});const first=state(h);
 callback({q:0,r:0});const duplicate=state(h);
 h.render().undoMap();const undo=state(h);
 assert.equal(first.regions,1);assert.equal(first.undo,1);assert.equal(duplicate.regions,1);assert.equal(duplicate.undo,2);assert.notDeepEqual(duplicate.generation,first.generation);assert.equal(undo.regions,0);
 results.findings.push({id:'R1',contract:'TX-06 / AC-09',first,duplicate,undo,expected:'stale/repeated callback is rejected without RNG or history mutation',actual:'same captured callback consumes RNG twice, replaces first map, creates a second transaction whose undo removes first region'});
}
{
 const h=setup();h.render().setGenerationMode('mythic');h.render().generateAt({q:0,r:0});
 for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();
 assert.equal(h.render().generationError,null);assert.equal(h.render().kingdoms.length,1);
 const before=state(h);h.render().regenerateLastRegion();const pending=state(h);h.render().finishPendingRegeneration();
 for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();
 assert.equal(h.render().generationError,null);assert.equal(h.render().kingdoms.length,1);
 const checkpoint=structuredClone(h.render().history.at(-1).generation),after=state(h);
 assert.notDeepEqual(checkpoint,before.generation);assert.deepEqual(checkpoint,pending.generation);
 h.render().deleteLastRegion();const deleted=state(h);assert.equal(deleted.regions,0);assert.deepEqual(deleted.generation,checkpoint);
 results.findings.push({id:'R2',contract:'TX-05, TX-04 / AC-04',before,pending,checkpoint,after,deleted,expected:'new regenerate checkpoint stores base map with RNG at start of regenerate (before option preparation)',actual:'hidden classic locality preparation spends geography before Mythic backup; checkpoint and delete-last restore the advanced state'});
}
fs.writeFileSync(new URL('./hx-review-repro-output.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
