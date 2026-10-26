import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
for(const mode of ['classic','mythic']){
 const h=createGenerationHarness(0);h.render();h.guardRandom();h.render().setGenSizeCategory('locality');h.render().setGenerationMode(mode);
 const snap=()=>structuredClone(h.render().captureDocument());const before=snap();
 h.render().generateAt(h.render().candidateHexes[0]??{q:0,r:0});for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().kingdomJob,null);assert.equal(h.render().generationError,null);
 const generated=snap();assert.notDeepEqual(generated,before);h.render().undoMap();assert.deepEqual(snap(),before);h.render().redoMap();assert.deepEqual(snap(),generated);h.render().setSelectedHex(h.render().regions[0].centerHex);const selected=snap();h.render().setSelectedHexBiomeOverride('open_hills');const after=snap();h.render().undoMap();assert.deepEqual(snap(),selected);h.render().redoMap();assert.deepEqual(snap(),after);
 function types(x,path='',out=[]){if(x instanceof Map){out.push([path,'Map',x.size]);for(const [k,v]of x)types(v,path+'.'+k,out);}else if(x instanceof Set){out.push([path,'Set',x.size]);}else if(x&&typeof x==='object')for(const k of Object.keys(x))types(x[k],path+'.'+k,out);return out;}
 const ts=types(after);assert(ts.some(x=>x[1]==='Map'&&x[2]>0));console.log(JSON.stringify({mode,native_undo_redo_equal:true,containers:ts}));
}
