import assert from 'node:assert/strict';
import {createGenerationHarness} from './hexcrawl/test/helpers/generation-harness.mjs';
const h=createGenerationHarness(0);h.render();h.guardRandom();h.render().setGenerationMode('mythic');h.render().generateAt({q:0,r:0});
const old=h.render().advanceKingdom;old();h.render().advanceKingdom();
const stable=()=>JSON.stringify(h.render().createSaveData(),(k,v)=>k==='savedAt'?undefined:v);
const before=stable();old();assert.equal(stable(),before,'older consumed tick must remain a no-op after another tick');
