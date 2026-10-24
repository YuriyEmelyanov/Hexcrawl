import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
const serial=v=>JSON.parse(JSON.stringify(v));
const stable=app=>{const d=serial(app.createSaveData());delete d.savedAt;return d;};
test('production document exports RNG and undo restores continuation',()=>{
 const h=createGenerationHarness(42);h.render();
 const before=stable(h.render());assert.ok(before.generation,'world RNG must be serializable');
 h.render().safelyAddRegionToMap({q:0,r:0},{targetSize:8,coastalPreference:'mainland'});
 const first=stable(h.render());h.render().undoMap();
 assert.deepEqual(stable(h.render()),before);
 h.render().safelyAddRegionToMap({q:0,r:0},{targetSize:8,coastalPreference:'mainland'});
 assert.deepEqual(stable(h.render()),first);
});
const options={targetSize:8,coastalPreference:'mainland'};
function setup(seed){const h=createGenerationHarness(seed);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);return h;}
async function load(h,data){await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'map'}});}
function unit(h,mode){const a=h.render();const anchor=a.candidateHexes[0]??{q:0,r:0};if(mode==='mythic'){
 a.startKingdom(anchor);for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();
 assert.equal(h.render().kingdomJob,null);assert.equal(h.render().generationError,null,JSON.stringify(h.render().generationError));
 }else {const r=a.safelyAddRegionToMap(anchor,options);assert.equal(r.success,true,JSON.stringify(r));}}
for(const seed of [0,1,123456789,4294967295])for(const mode of ['classic','mythic'])test(`production streams/continuation/undo ${mode}/${seed}`,async()=>{
 const h=setup(seed);h.render().setGenerationMode(mode);unit(h,mode);unit(h,mode);
 const middle=stable(h.render());const g=setup(99);await load(g,middle);assert.deepEqual(stable(g.render()),middle);
 unit(h,mode);unit(g,mode);assert.deepEqual(stable(g.render()),stable(h.render()),'save/load next action');
 const after=stable(h.render());h.render().undoMap();assert.deepEqual(stable(h.render()),middle);
 unit(h,mode);assert.deepEqual(stable(h.render()),after,'undo/repeat next action');
});
test('classic and late Mythic failures restore RNG and both histories',()=>{
 for(const mode of ['classic','mythic']){
  const h=setup(42);h.render().setGenerationMode(mode);unit(h,mode);h.render().undoMap();
  const before=stable(h.render()),hist=serial([h.render().undoHistory,h.render().redoHistory]);
  const restore=h.injectFunction('chooseRegionCenter',()=>{h.render().generationRef.current.streams.poi=999;throw Error('injected after draw');});
  if(mode==='classic')h.render().safelyAddRegionToMap({q:0,r:0},options);
  else{h.render().startKingdom({q:0,r:0});for(let i=0;i<5&&h.render().kingdomJob;i++)h.render().advanceKingdom();}
  restore();assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),hist);
  const control=setup(42);control.render().setGenerationMode(mode);unit(h,mode);unit(control,mode);assert.deepEqual(stable(h.render()),stable(control.render()));
 }
});
test('v2 migration and v3 validation are deterministic and atomic with redo',async()=>{
 const fs=await import('node:fs');const manifest=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/manifest.json',import.meta.url)));
 for(const entry of manifest.entries){
  const data=JSON.parse(fs.readFileSync(new URL('../'+entry.path,import.meta.url)));
  const h=setup(2),g=setup(3);await load(h,data);await load(g,data);
  const save=stable(h.render());assert.equal(save.version,3);assert.deepEqual(stable(g.render()),save);
  for(const key of ['regions','rivers','roads','crossings','terrainByHexKey'])assert.deepEqual(save.map[key],data.map[key]);
  await load(g,save);assert.deepEqual(stable(g.render()),save);
 }
 const h=setup(0);unit(h,'classic');h.render().undoMap();const before=stable(h.render()),hist=serial([h.render().undoHistory,h.render().redoHistory]);
 for(const bad of [undefined,null,{}, {...before.generation,masterSeed:-1},{...before.generation,generatorVersion:'future'},{...before.generation,rngVersion:'future'},{...before.generation,streams:{geography:0,poi:1.5}}]){
  const data={...before,generation:bad};await load(h,data);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),hist);
 }
});
test('regenerate uses current RNG and undo/repeat restores same variant',()=>{
 const h=setup(1);unit(h,'classic');const before=stable(h.render());
 h.render().regenerateLastRegion();h.render().finishPendingRegeneration();const after=stable(h.render());
 assert.notDeepEqual(after.generation,before.generation);
 h.render().undoMap();assert.deepEqual(stable(h.render()),before);
 h.render().regenerateLastRegion();h.render().finishPendingRegeneration();assert.deepEqual(stable(h.render()),after);
 h.render().undoMap();h.render().redoMap();assert.deepEqual(stable(h.render()),after);
});
test('seed validation, repeated renders, pre-options exception and duplicate pending callback',()=>{
 const h=setup(0);const before=stable(h.render());h.render().setSeedInput('-1');assert.equal(h.render().applyWorldSeed(),false);assert.deepEqual(stable(h.render()),before);
 h.render().setSeedInput('4294967295');assert.equal(h.render().applyWorldSeed(),true);assert.equal(stable(h.render()).generation.masterSeed,4294967295);h.render().undoMap();assert.deepEqual(stable(h.render()),before);
 for(let i=0;i<20;i++)assert.deepEqual(stable(h.render()),before,'render does not consume RNG');
 h.render().setGenSizeCategory('locality');const history=serial([h.render().undoHistory,h.render().redoHistory]);
 const restore=h.injectFunction('rollRegionSizeInCategory',()=>{h.render().generationRef.current.streams.geography=55;throw Error('prepare options');});
 h.render().generateAt({q:0,r:0});restore();assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),history);
 unit(h,'classic');h.render().regenerateLastRegion();const pending=h.render();pending.finishPendingRegeneration();const after=stable(h.render());pending.finishPendingRegeneration();assert.deepEqual(stable(h.render()),after);
});
test('Mythic regenerate and delete checkpoints restore exact RNG',()=>{
 const h=setup(0);h.render().setGenerationMode('mythic');unit(h,'mythic');const before=stable(h.render());
 function regen(){h.render().regenerateLastRegion();h.render().finishPendingRegeneration();for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().generationError,null);}
 regen();const after=stable(h.render());assert.notDeepEqual(after.generation,before.generation);
 h.render().undoMap();assert.deepEqual(stable(h.render()),before);regen();assert.deepEqual(stable(h.render()),after);
 const checkpoint=serial(h.render().history.at(-1).generation);h.render().deleteLastRegion();assert.deepEqual(stable(h.render()).generation,checkpoint);h.render().undoMap();assert.deepEqual(stable(h.render()),after);
});

test('R1 stale classic callbacks cannot draw or append a transaction, before or after a render',()=>{
 for(const rerender of [false,true]){
  const h=setup(0);h.render().setGenSizeCategory('locality');
  const empty=stable(h.render()),callback=h.render().generateAt;
  callback({q:0,r:0});
  // Without render, the second invocation is in the same React event batch.
  if(!rerender)callback({q:0,r:0});
  const first=stable(h.render()),hist=serial([h.render().undoHistory,h.render().redoHistory]);
  if(rerender)callback({q:0,r:0});
  assert.equal(h.render().regions.length,1);assert.equal(h.render().undoHistory.length,1);
  assert.deepEqual(stable(h.render()),first);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),hist);
  h.render().undoMap();assert.deepEqual(stable(h.render()),empty);
  h.render().redoMap();assert.deepEqual(stable(h.render()),first);
  callback({q:0,r:0});assert.deepEqual(stable(h.render()),first,'old callback also stays stale after undo/redo');
 }
});

test('R2 Mythic regenerate ignores hidden classic size controls and checkpoints pre-action RNG',()=>{
 const h=setup(0);h.render().setGenSizeCategory('locality');h.render().setGenerationMode('mythic');unit(h,'mythic');
 const first=stable(h.render());
 const regen=()=>{h.render().regenerateLastRegion();h.render().finishPendingRegeneration();for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().generationError,null);};
 regen();const second=stable(h.render());
 assert.deepEqual(serial(h.render().history.at(-1).generation),first.generation);
 h.render().deleteLastRegion();assert.equal(h.render().regions.length,0);assert.deepEqual(stable(h.render()).generation,first.generation);
 h.render().undoMap();assert.deepEqual(stable(h.render()),second);
 h.render().undoMap();assert.deepEqual(stable(h.render()),first);regen();assert.deepEqual(stable(h.render()),second);
 regen();const third=stable(h.render());assert.notDeepEqual(third,second);
 assert.deepEqual(serial(h.render().history.at(-1).generation),second.generation);
 h.render().undoMap();assert.deepEqual(stable(h.render()),second);h.render().redoMap();assert.deepEqual(stable(h.render()),third);
});

test('entire v2 and rng-v3 fixture manifests roundtrip and continue in both modes',async()=>{
 const fs=await import('node:fs');
 for(const name of ['import-v2','rng-v3']){
  const manifest=JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}/manifest.json`,import.meta.url)));
  for(const entry of manifest.entries)for(const mode of ['classic','mythic']){
   const data=JSON.parse(fs.readFileSync(new URL('../'+entry.path,import.meta.url)));
   const h=setup(7),g=setup(8);await load(h,data);await load(g,data);
   const normalized=stable(h.render());assert.deepEqual(stable(g.render()),normalized,entry.path);
   await load(g,normalized);assert.deepEqual(stable(g.render()),normalized,entry.path+' roundtrip');
   h.render().setGenerationMode(mode);g.render().setGenerationMode(mode);
   const attempt=world=>{
    const app=world.render(),anchor=app.candidateHexes[0]??{q:0,r:0};
    if(mode==='classic')app.safelyAddRegionToMap(anchor,options);
    else{app.startKingdom(anchor);for(let i=0;i<310&&world.render().kingdomJob;i++)world.render().advanceKingdom();}
    return world.render().generationError?.reason??null;
   };
   const original=stable(h.render()),reason=attempt(h);assert.equal(attempt(g),reason,entry.path+' deterministic outcome');
   assert.deepEqual(stable(h.render()),stable(g.render()),entry.path+' '+mode+' continuation');
   if(reason)assert.deepEqual(stable(h.render()),original,entry.path+' rejected continuation rolls back');
   console.log(`fixture continuation ${entry.path}/${mode}: ${reason??'committed'}`);
  }
 }
});

test('complete malformed RNG value classes reject atomically with redo',async()=>{
 const h=setup(0);unit(h,'classic');h.render().undoMap();
 const before=stable(h.render()),hist=serial([h.render().undoHistory,h.render().redoHistory]);
 const cases=[undefined,null,[],true,'rng',{},
  ...[undefined,null,[],1,'streams',{}, {geography:0}].map(streams=>({...before.generation,streams})),
  ...[-1,4294967296,0.5,'0',null].flatMap(value=>[
   {...before.generation,masterSeed:value},
   {...before.generation,streams:{...before.generation.streams,geography:value}},
   {...before.generation,streams:{...before.generation.streams,poi:value}}]),
  {...before.generation,rngVersion:'future'}, {...before.generation,generatorVersion:'future'}];
 for(const version of [2,3])for(const generation of cases){
  // v2 absent generation is the supported legacy format, not a malformed RNG.
  if(version===2&&generation===undefined)continue;
  await load(h,{...before,version,generation});assert.deepEqual(stable(h.render()),before);
  assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),hist);
 }
 await load(h,{...before,version:999});assert.deepEqual(stable(h.render()),before);
 assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),hist);
});
