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
   await a.unit();const middle=await a.snapshot();await b.load(middle);assert.deepEqual(await b.snapshot(),middle,`loaded checkpoint ${mode}/${seed}`);
   const final=await a.unit();assert.deepEqual(await b.unit(),final,`continuation ${mode}/${seed}`);
   await a.button('Отменить').click();assert.deepEqual(await a.snapshot(),middle);assert.deepEqual(await a.unit(),final,`undo-repeat ${mode}/${seed}`);
   // Invalid future RNG leaves document and redo unchanged.
   await a.button('Отменить').click();const invalid=structuredClone(middle);invalid.generation.rngVersion='future';await a.load(invalid);assert.deepEqual(await a.snapshot(),middle);assert.equal(await a.button('Повторить').isEnabled(),true);
   console.log(`world RNG production UI ${mode}/${seed}: fresh, continuation, undo-repeat, invalid import passed`);
  }finally{await a.context.close();await b.context.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
