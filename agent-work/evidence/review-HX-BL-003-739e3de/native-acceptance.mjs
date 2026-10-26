import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const save=h=>{const d=copy(h.render().createSaveData());delete d.savedAt;return d;};
const histories=h=>structuredClone([h.render().undoHistory,h.render().redoHistory]);
const events=h=>h.logs.filter(l=>l.args[0]==='[generation]').map(l=>l.args[1]);
function setup(mode='classic',seed=0){const h=createGenerationHarness(seed,'?generationDebug=1');h.render();h.guardRandom();h.render().setGenSizeCategory('locality');h.render().setGenerationMode(mode);return h;}
function finish(h){for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().kingdomJob,null);}
function add(h){h.render().generateAt(h.render().candidateHexes[0]??{q:0,r:0});finish(h);assert.equal(h.render().generationError,null);}
function regenerate(h){h.render().regenerateLastRegion();h.render().finishPendingRegeneration();finish(h);}

for(const mode of ['classic','mythic'])test(`R5 consumed regeneration A stays inert after B and undo/redo ${mode}`,()=>{
 const h=setup(mode);add(h);
 h.render().regenerateLastRegion();const old=h.render().finishPendingRegeneration;old();finish(h);
 regenerate(h);assert.equal(h.render().generationError,null);
 function assertOldIsInert(stage){
  const before=save(h),stacks=histories(h),document=structuredClone(h.render().captureDocument()),logCount=h.logs.length;
  old();assert.equal(h.render().kingdomJob,null,`${stage}: stale request must not start a job`);
  assert.deepEqual(save(h),before,`${stage}: full saved document and both RNG streams`);
  assert.deepEqual(structuredClone(h.render().captureDocument()),document,`${stage}: session document/checkpoints`);
  assert.deepEqual(histories(h),stacks,`${stage}: both transaction stacks`);
  assert.equal(h.logs.length,logCount,`${stage}: no new generation event`);
 }
 assertOldIsInert('after B');
 h.render().undoMap();assert.ok(h.render().redoHistory.length);assertOldIsInert('after undo with redo');
 h.render().redoMap();assertOldIsInert('after redo');
});

test('R3 late Mythic regeneration failure retains original action and detached inputs',()=>{
 const h=setup('mythic');add(h);const before=save(h),stacks=histories(h);h.logs.length=0;
 h.render().regenerateLastRegion();h.render().finishPendingRegeneration();
 for(let i=0;i<3;i++)h.render().advanceKingdom();
 assert.notEqual(h.render().generationRef.current.streams.geography,before.generation.streams.geography);
 assert.notEqual(h.render().generationRef.current.streams.poi,before.generation.streams.poi);
 // Controls may render again while asynchronous generation is in progress.
 h.render().setGenSizeCategory('large_region');
 const restore=h.injectFunction('chooseRegionCenter',()=>{throw Error('R3 late failure');});finish(h);restore();
 const event=events(h).at(-1);assert.equal(event.kind,'programming-error');assert.equal(event.action,'regenerate');
 assert.equal(event.inputOptions.sizeCategory,'locality');assert.equal(event.inputOptions.mode,'mythic');
 assert.deepEqual(event.random.before,before.generation);assert.deepEqual(event.random.after,before.generation);
 assert.deepEqual(save(h),before);assert.deepEqual(histories(h),stacks);
 const detached=JSON.stringify(event);h.render().setGenSizeCategory('locality');regenerate(h);assert.equal(h.render().generationError,null);
 assert.equal(JSON.stringify(event),detached);
});

// Recreate the session prefix for regeneration: TX-04 deliberately does not
// serialize generation checkpoints. A bare import cannot enable regenerate.
for(const mode of ['classic','mythic'])for(const action of ['add','regenerate'])for(const failing of [false,true])
test(`AC10 recorded action replay ${mode}/${action}/${failing?'failure':'success'}`,async()=>{
 const source=setup(mode),initial=save(source);
 async function replay(record){
  const h=setup(mode,99);h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
  await h.render().handleImportJson({target:{files:[{text:JSON.stringify(initial)}],value:'json'}});
  h.render().setGenSizeCategory(record?.inputOptions.sizeCategory??'locality');
  if(action==='regenerate')add(h); // documented session prefix, same source JSON
  const before=save(h),stacks=histories(h);h.logs.length=0;
  const restore=failing?h.injectFunction('chooseRegionCenter',()=>{throw Error('replay injected failure');}):()=>{};
  if((record?.action??action)==='regenerate')regenerate(h);else addOrFail(h);
  restore();const event=copy(events(h).at(-1));assert.equal(event.action,action);assert.equal(event.inputOptions.sizeCategory,'locality');
  assert.deepEqual(event.random.before,before.generation);assert.deepEqual(event.random.after,save(h).generation);
  if(failing){assert.equal(event.kind,'programming-error');assert.deepEqual(save(h),before);assert.deepEqual(histories(h),stacks);}
  else assert.equal(event.kind,'generated');
  const detached=JSON.stringify(event),after=save(h);add(h);assert.equal(JSON.stringify(event),detached);
  delete event.stack;return {after,event};
 }
 function addOrFail(h){h.render().generateAt(h.render().candidateHexes[0]??{q:0,r:0});finish(h);}
 const first=await replay();assert.deepEqual(await replay(first.event),first);
});

for(const mode of ['classic','mythic'])test(`AC04 mixed manual content and generation checkpoints ${mode}`,()=>{
 const h=setup(mode);add(h);const original=save(h),rng=copy(original.generation),checkpoint=copy(h.render().history.at(-1).generation);
 const first=h.render().regions[0],nameKey=`region:${first.id}`;
 // The existing name model exposes registry edits, not a text-field UI.
 h.render().setToponyms({...h.render().toponyms,[nameKey]:{en:'Watchstone',ru:'Караул'}});
 h.render().setSelectedHex(first.hexes.find(x=>x.q!==first.centerHex.q||x.r!==first.centerHex.r));
 h.render().setSelectedPoiKind('ruins');h.render().setSelectedHexBiomeOverride('open_hills');
 assert.deepEqual(save(h).generation,rng,'explicit manual edits spend no RNG');
 const edited=save(h);h.render().deleteLastRegion();const deleted=save(h);
 assert.equal(deleted.map.regions.length,0);assert.deepEqual(deleted.generation,checkpoint);
 h.render().undoMap();assert.deepEqual(save(h),edited);h.render().redoMap();assert.deepEqual(save(h),deleted);h.render().undoMap();
 regenerate(h);assert.equal(h.render().generationError,null);const second=save(h);
 h.render().undoMap();assert.deepEqual(save(h),edited);h.render().redoMap();assert.deepEqual(save(h),second);h.render().undoMap();
 regenerate(h);assert.deepEqual(save(h),second,'undo then same regenerate');
 regenerate(h);const third=save(h);assert.notDeepEqual(third.generation,second.generation);
 h.render().undoMap();assert.deepEqual(save(h),second);h.render().redoMap();assert.deepEqual(save(h),third);
});

for(const mode of ['classic','mythic'])for(const kind of ['programming','constraint'])
test(`AC05 ${mode}/${kind} rollback with redo and next clean control`,()=>{
 const h=setup(mode);add(h);h.render().setSelectedHex(h.render().regions[0].centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();
 const before=save(h),stacks=histories(h);let attempted;
 const restore=kind==='programming'
  ?h.injectFunction('assignWaterPoiLayer',()=>{
   attempted=copy(h.render().generationRef.current);
   throw Error('after both streams advanced');
  })
  :h.injectFunction('getNewRiverLakeReentryViolation',()=>({riverId:1,lakeId:1,vertexKey:'injected'}));
 h.render().generateAt(h.render().candidateHexes[0]);finish(h);restore();
 if(kind==='programming'){assert.ok(attempted);assert.notEqual(attempted.streams.geography,before.generation.streams.geography);assert.notEqual(attempted.streams.poi,before.generation.streams.poi);}
 assert.ok(h.render().generationError);assert.deepEqual(save(h),before);assert.deepEqual(histories(h),stacks);
 const control=setup(mode);add(control);control.render().setSelectedHex(control.render().regions[0].centerHex);control.render().setSelectedHexBiomeOverride('open_hills');control.render().undoMap();
 add(h);add(control);assert.deepEqual(save(h),save(control));
});

test('AC05 prepare-regenerate error and successful tract fallback preserve exact stream semantics',()=>{
 const h=setup();add(h);h.render().setSelectedHex(h.render().regions[0].centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();
 const before=save(h),stacks=histories(h);
 const restore=h.injectFunction('rollRegionSizeInCategory',()=>{throw Error('prepare regenerate');});regenerate(h);restore();
 assert.deepEqual(save(h),before);assert.deepEqual(histories(h),stacks);
 const t=setup();const initial=save(t);t.injectFunction('exports.generateConnectedRegionFromAnchor',anchor=>[anchor]);
 t.render().generateAt({q:0,r:0});const event=events(t).at(-1);assert.equal(event.kind,'attempts-exhausted');assert.equal(event.result,'tract');
 assert.notDeepEqual(save(t).generation,initial.generation);t.render().undoMap();assert.deepEqual(save(t),initial);
});

for(const mode of ['classic','mythic'])test(`AC06 names restored before next full world ${mode}`,()=>{
 const a=setup(mode),b=setup(mode);add(a);add(b);const before=save(a),names=copy(a.render().toponyms),key=Object.keys(names)[0];
 a.render().setToponyms({...names,[key]:{en:'Temporary',ru:'Временное'}});
 assert.deepEqual(save(a).generation,before.generation);a.render().setToponyms(names);assert.deepEqual(save(a),before);
 add(a);add(b);assert.deepEqual(save(a),save(b));
});

test('AC09 consumed Mythic tick remains stale after newer tick and after completion',()=>{
 const h=setup('mythic'),control=setup('mythic');h.render().generateAt({q:0,r:0});
 const old=h.render().advanceKingdom;old();const first=save(h);old();assert.deepEqual(save(h),first);
 h.render().advanceKingdom();const second=save(h),stacks=histories(h);old();assert.deepEqual(save(h),second);assert.deepEqual(histories(h),stacks);
 finish(h);add(control);const completed=save(h);assert.deepEqual(completed,save(control));
 old();assert.deepEqual(save(h),completed);assert.equal(h.render().kingdomJob,null);
});
