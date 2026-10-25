import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../../',import.meta.url);
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4182','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{let out='';const timeout=setTimeout(()=>reject(Error(out)),10000);server.stdout.on('data',data=>{out+=data;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(timeout);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function open(seed,mode){
  const context=await browser.newContext({viewport:{width:1500,height:1100}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());await page.route(/mc\.yandex/,r=>r.abort());
  await page.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(blob){const url=make.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__exported=JSON.parse(t));return;}return click.call(this);};});
  await page.addInitScript(()=>{
   const timer=window.setTimeout.bind(window);window.setTimeout=(fn,delay,...args)=>timer(()=>{if(delay===0&&window.__holdKingdom)window.__kingdomTick=()=>fn(...args);else fn(...args);},delay);
   const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(file){if(window.__delayRead){window.__delayRead=false;window.__releaseRead=()=>read.call(this,file);}else read.call(this,file);};
  });
  await page.goto('http://127.0.0.1:4182/?generationDebug=1');
  const seedField=page.getByRole('textbox',{name:'Seed мира',exact:true});await seedField.fill(String(seed));await seedField.press('Tab');
  await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption(mode);
  if(mode==='classic'){await page.locator('.gen-params select').nth(0).selectOption('locality');await page.locator('.gen-params select').nth(3).selectOption('mainland');}
  // Product RNG is never replaced by a seeded Math.random. Unexpected fallback is a failure.
  await page.evaluate(()=>{Math.random=()=>{throw Error('Unexpected production Math.random');};});
  const button=name=>page.getByRole('button',{name,exact:true});
  const snapshot=async()=>{await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__exported!==null);return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});};
  const load=async data=>{await page.locator('input[type=file]').setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);};
  const unit=async()=>{const before=await snapshot();const anchor=before.map.candidateHexes[0]??{q:0,r:0};console.log('action',mode,seed,anchor,before.generation.streams);await page.locator(`polygon.hex.candidate[data-hex-key="${anchor.q},${anchor.r}"]`).dispatchEvent('click');await page.waitForFunction(()=>!document.querySelector('.kingdom-progress')?.textContent.includes('Создание королевства'),null,{timeout:180000});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);const alert=page.getByRole('alert');assert.equal(await alert.count(),0,await alert.allTextContents());assert.deepEqual(errors,[]);return snapshot();};
  return {context,page,button,snapshot,load,unit};
 }
 for(const mode of ['classic','mythic'])for(const seed of [0,1,123456789,4294967295]){
  const a=await open(seed,mode),b=await open(seed,mode);
  try{
   const a1=await a.unit(),b1=await b.unit();assert.deepEqual(a1,b1,`fresh ${mode}/${seed}`);
   if(mode==='classic'&&seed===0){await a.page.waitForTimeout(5500);assert.deepEqual(await a.snapshot(),a1,'animated click hint never consumes world RNG');}
   const middle=await a.unit();assert.deepEqual(await b.unit(),middle,`fresh second ${mode}/${seed}`);
   const final=await a.unit();assert.deepEqual(await b.unit(),final,`fresh third ${mode}/${seed}`);
   await a.button('Отменить').click();assert.deepEqual(await a.snapshot(),middle);
   await b.load(middle);assert.deepEqual(await b.snapshot(),middle,`loaded checkpoint ${mode}/${seed}`);
   assert.deepEqual(await a.unit(),final,`repeat third ${mode}/${seed}`);assert.deepEqual(await b.unit(),final,`continuation ${mode}/${seed}`);
   await a.button('Отменить').click();assert.deepEqual(await a.snapshot(),middle);assert.deepEqual(await a.unit(),final,`undo-repeat ${mode}/${seed}`);
   // Invalid future RNG leaves document and redo unchanged.
   await a.button('Отменить').click();const invalid=structuredClone(middle);invalid.generation.rngVersion='future';await a.load(invalid);assert.deepEqual(await a.snapshot(),middle);assert.equal(await a.button('Повторить').isEnabled(),true);
   console.log(`world RNG production UI ${mode}/${seed}: fresh, continuation, undo-repeat, invalid import passed`);
  }finally{await a.context.close();await b.context.close();}
 }
 // R2: carry a non-auto classic setting into Mythic and exercise the public
 // regenerate/delete/undo controls, with whole JSON comparisons.
 const r=await open(0,'classic');
 try{
  await r.page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('mythic');
  const before=await r.unit();
  const regenerate=async()=>{
   await r.button('Перегенерировать регион').click();
   await r.page.waitForFunction(()=>!document.querySelector('.kingdom-progress')?.textContent.includes('Создание королевства'),null,{timeout:180000});
   await r.page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
   return r.snapshot();
  };
  const after=await regenerate();
  await r.button('Удалить последний регион').click();
  const deleted=await r.snapshot();assert.equal(deleted.map.regions.length,0);assert.deepEqual(deleted.generation,before.generation,'R2 pre-regenerate RNG');
  await r.button('Отменить').click();assert.deepEqual(await r.snapshot(),after);
  await r.button('Отменить').click();assert.deepEqual(await r.snapshot(),before);
  assert.deepEqual(await regenerate(),after,'R2 undo/regenerate exact repeat');
  console.log('R2 Mythic hidden classic locality: regenerate/delete/undo/repeat passed');
 }finally{await r.context.close();}

 // AC06: real display/navigation/export actions must not affect the next world.
 // Registry renaming has no current text-field UI; its RNG isolation is tested
 // at the production state/handler boundary in worldAcceptance.test.mjs.
 for(const mode of ['classic','mythic']){
  const a=await open(0,mode),b=await open(0,mode);
  try{
   const before=await a.unit();assert.deepEqual(await b.unit(),before);
   for(let i=0;i<3;i++)await a.page.locator('.biome-display-toggle').click();
   for(let i=0;i<2;i++)await a.page.locator('.poi-display-toggle').click();
   await a.button('Switch to English').click();await a.button('Переключить на русский').click();
   await a.page.locator('.rotate-map-button').click();await a.page.locator('.rotate-map-button').click();
   await a.page.evaluate(async()=>{
    const v=document.querySelector('.map-viewport'),r=v.getBoundingClientRect(),next=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const left=v.scrollLeft,top=v.scrollTop;
    for(const delta of [-100,100]){v.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:delta,clientX:r.left+200,clientY:r.top+150}));await next();}
    v.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,button:0,buttons:1,clientX:r.left+300,clientY:r.top+250}));
    v.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,buttons:1,clientX:r.left+330,clientY:r.top+270}));
    v.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));await next();v.scrollLeft=left;v.scrollTop=top;
   });
   const observed=await a.snapshot();assert.deepEqual(observed.generation,before.generation);
   assert.ok(Math.abs(observed.ui.mapScale-before.ui.mapScale)<1e-12);
   // Match the resulting view exactly in the control to avoid treating a
   // floating-point roundoff in the wheel transform as a world difference.
   await b.load({...before,ui:observed.ui});
   const png=a.button('PNG');await png.waitFor();await a.page.waitForFunction(()=>!document.querySelector('details.export-menu button').disabled);
   const download=a.page.waitForEvent('download');await png.click();assert.ok((await download).suggestedFilename().endsWith('.png'));
   assert.deepEqual((await a.snapshot()).generation,before.generation);
   assert.deepEqual(await a.unit(),await b.unit(),`AC06 next full world ${mode}`);
   console.log(`AC06 ${mode}: display, language, navigation, rotation, PNG/JSON and next full world passed`);
  }finally{await a.context.close();await b.context.close();}
 }
 // AC08: every malformed value class on a NONEMPTY map with redo.
 for(const mode of ['classic','mythic']){
  const a=await open(0,mode);
  try{
   await a.unit();const second=await a.unit();await a.button('Отменить').click();const before=await a.snapshot();assert.ok(before.map.regions.length);
   const g=before.generation,invalid=[undefined,null,[],true,'rng',{},
    ...[undefined,null,[],1,'streams',{}, {geography:0}].map(streams=>({...g,streams})),
    ...[-1,4294967296,0.5,'0',null].flatMap(value=>[{...g,masterSeed:value},{...g,streams:{...g.streams,geography:value}},{...g,streams:{...g.streams,poi:value}}]),
    {...g,rngVersion:'future'},{...g,generatorVersion:'future'}];
   for(const version of [2,3])for(const generation of invalid){if(version===2&&generation===undefined)continue;await a.load({...before,version,generation});assert.deepEqual(await a.snapshot(),before);assert.equal(await a.button('Повторить').isEnabled(),true);}
   await a.load({...before,version:999});assert.deepEqual(await a.snapshot(),before);
   await a.page.locator('input[type=file]').setInputFiles([]);assert.deepEqual(await a.snapshot(),before);
   await a.button('Повторить').click();assert.deepEqual(await a.snapshot(),second);await a.button('Отменить').click();assert.deepEqual(await a.snapshot(),before);
   console.log(`AC08 ${mode}: malformed v2/v3 on nonempty redo, view and exact undo/redo passed`);
  }finally{await a.context.close();}
 }
 const invalidSeed=await open(0,'classic');
 try{
  const before=await invalidSeed.snapshot(),field=invalidSeed.page.getByRole('textbox',{name:'Seed мира',exact:true});
  for(const value of ['', '-1','0.5','NaN','4294967296']){await field.fill(value);await field.press('Tab');await invalidSeed.page.locator('polygon.hex.candidate').first().dispatchEvent('click');assert.deepEqual(await invalidSeed.snapshot(),before);}
  await field.fill('0');await field.press('Tab');await invalidSeed.unit();await invalidSeed.button('Отменить').click();const emptyRedo=await invalidSeed.snapshot();await field.fill('0');await field.press('Tab');assert.deepEqual(await invalidSeed.snapshot(),emptyRedo);assert.equal(await invalidSeed.button('Повторить').isEnabled(),true);
  console.log('AC08 invalid seed values and no-op retain RNG/redo');
 }finally{await invalidSeed.context.close();}
 // AC09: physical double-click, real StrictMode/effects, and an intentionally
 // paused zero-delay kingdom tick. Export and other mutations stay blocked.
 for(const mode of ['classic','mythic']){
  const a=await open(0,mode),b=await open(0,mode);
  try{
   if(mode==='mythic')await a.page.evaluate(()=>window.__holdKingdom=true);
   const candidate=a.page.locator('polygon.hex.candidate').first();await candidate.dblclick({force:true});
   if(mode==='mythic'){
    await a.page.waitForFunction(()=>!!window.__kingdomTick);
    await a.page.evaluate(()=>window.__exported=null);
    const menu=a.page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
    await a.button('JSON').dispatchEvent('click');assert.equal(await a.page.evaluate(()=>window.__exported),null);
    assert.equal(await a.button('Отменить').isDisabled(),true);
    await a.page.evaluate(()=>{window.__holdKingdom=false;window.__kingdomTick();});
   }
   await a.page.waitForFunction(()=>!document.querySelector('.kingdom-progress'),null,{timeout:180000});
   const one=await a.snapshot();assert.deepEqual(one,await b.unit(),'double-click only one generation');
   await a.button('Отменить').click();assert.equal((await a.snapshot()).map.regions.length,0);await a.button('Повторить').click();assert.deepEqual(await a.snapshot(),one);
   if(mode==='mythic'){
    await a.page.evaluate(()=>{window.__holdKingdom=true;window.__kingdomTick=null;});await a.button('Перегенерировать регион').click();
    await a.page.waitForFunction(()=>!!window.__kingdomTick);await a.page.evaluate(()=>window.__exported=null);await a.button('JSON').dispatchEvent('click');assert.equal(await a.page.evaluate(()=>window.__exported),null);
    await a.page.evaluate(()=>{window.__holdKingdom=false;const tick=window.__kingdomTick;tick();tick();});
    await b.button('Перегенерировать регион').click();
    for(const target of [a,b])await target.page.waitForFunction(()=>!document.querySelector('.kingdom-progress'),null,{timeout:180000});
    const regenerated=await a.snapshot();assert.deepEqual(regenerated,await b.snapshot(),'duplicate real pending/kingdom effect');
    await a.button('Отменить').click();assert.deepEqual(await a.snapshot(),one);await a.button('Повторить').click();assert.deepEqual(await a.snapshot(),regenerated);await a.button('Отменить').click();
   }
   await a.page.evaluate(()=>window.__delayRead=true);await a.page.locator('input[type=file]').setInputFiles({name:'delayed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(one))});
   await a.page.evaluate(()=>window.__exported=null);await a.button('JSON').dispatchEvent('click');assert.equal(await a.page.evaluate(()=>window.__exported),null);
   await a.page.locator('polygon.hex.candidate').first().dispatchEvent('click');await a.page.evaluate(()=>window.__releaseRead());await a.page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
   assert.deepEqual(await a.snapshot(),one);
   console.log(`AC09 ${mode}: double click, busy export, delayed import, exact one-transaction undo/redo passed`);
  }finally{await a.context.close();await b.context.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
