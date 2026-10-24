import assert from 'node:assert/strict';import fs from 'node:fs';import {pathToFileURL} from 'node:url';
const root=process.argv[2],{createGenerationHarness}=await import(pathToFileURL(root+'/test/helpers/generation-harness.mjs'));const d=JSON.parse(fs.readFileSync(root+'/test/fixtures/import-v2/baseline-classic.json'));
const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});let reads=0;h.injectFunction('readTextFile',async f=>{reads++;return f.text});
const load=()=>h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'x'}});
const state=()=>structuredClone([h.render().captureDocument(),h.render().undoHistory,h.render().redoHistory]);
h.render().startKingdom({q:0,r:0});let before=state();await load();assert.deepEqual(state(),before);assert.equal(reads,0);assert.ok(h.render().kingdomJob);console.log('IMPORT_BLOCKED_KINGDOM_JOB_PASS');
for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().generationError,null);h.render().regenerateLastRegion();assert.ok(h.render().pendingRegen);before=state();await load();assert.deepEqual(state(),before);assert.equal(reads,0);assert.ok(h.render().pendingRegen);console.log('IMPORT_BLOCKED_PENDING_REGEN_PASS');
