import {createGenerationHarness} from '../hx024-review/test/helpers/generation-harness.mjs';
import assert from 'node:assert/strict';
const h=createGenerationHarness(42);h.render();h.setWindow({alert(){},confirm:()=>true,matchMedia:()=>({matches:false})});
h.render().setGenSizeCategory('region');h.render().generateAt({q:0,r:0});
if(!h.render().regions.length)throw Error('no initial region');
const original=h.render().createSaveData();
for(const hex of h.render().regions[0].hexes){h.render().setSelectedHex(hex);h.render().changeNotesDraft(`${hex.q},${hex.r}`,'keep');h.render().saveNotesDraft();}
const before=structuredClone(h.render().captureDocument());const stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]);
h.render().setGenSizeCategory('locality');h.render().regenerateLastRegion();h.render().finishPendingRegeneration();
assert.deepEqual(structuredClone(h.render().captureDocument()),before);assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks);
console.log(JSON.stringify({initialHexes:original.map.regions[0].hexes.length,error:h.render().generationError,rollbackExact:true},null,2));
