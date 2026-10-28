import {createGenerationState} from './repo/src/worldRandom.ts';
import {spawn} from 'node:child_process';
import {chromium} from './repo/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('./repo/',import.meta.url);
const fixture=JSON.parse(await fs.readFile(new URL('./repo/test/fixtures/import-v2/manual-edit-map.json',import.meta.url)));
const manifest=JSON.parse(await fs.readFile(new URL('./repo/test/fixtures/import-v2/manifest.json',import.meta.url)));
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4181','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try {
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),10000);server.stdout.on('data',data=>{output+=data;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}), errors=[],alerts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss();});
 await page.route(/mc\.yandex/,route=>route.abort());
 await page.addInitScript(()=>{
   let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   // Observe actual JSON export serialization, suppressing only the OS download
   // for repeated snapshots (Chromium throttles bursts of 300 downloads).
   const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();
   URL.createObjectURL=function(blob){const url=make.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};
   HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(text=>window.__exported=JSON.parse(text));return;}return click.call(this);};
   const clone=window.structuredClone;
   window.structuredClone=function(value){if(window.__failPreparation&&value?.schema==='hexcrawl-map'){window.__failPreparation=false;throw Error('injected before import commit');}return clone(value);};
   const read=FileReader.prototype.readAsText;
   FileReader.prototype.readAsText=function(file){
     if(window.__delayRead){window.__delayRead=false;window.__releaseRead=()=>read.call(this,file);return;}
     if(window.__failRead){window.__failRead=false;queueMicrotask(()=>this.onerror(new ProgressEvent('error')));return;}
     return read.call(this,file);
   };
 });
 await page.goto('http://127.0.0.1:4181/');
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).fill('42');
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).press('Tab');
 const button=name=>page.getByRole('button',{name,exact:true});
 async function snapshot(){
   await page.evaluate(()=>window.__exported=null);
   const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
   await button('JSON').click();await page.waitForFunction(()=>window.__exported!==null);
   return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});
 }
 async function load(data){await page.locator('input[type=file]').setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});await button('Загрузить JSON').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);}
 const select=async key=>page.locator(`polygon.hex[data-hex-key="${key}"]`).dispatchEvent('click');
 async function biome(kind){await button('Изменить биом гекса').click();await page.getByRole('combobox',{name:'Изменить биом гекса',exact:true}).selectOption(kind);}
 async function poi(kind){
   if(await button('Редактировать точку интереса').count())await button('Редактировать точку интереса').first().click();
   else await button('Добавить точку интереса').click();
   await page.getByRole('combobox',{name:'Выберите точку интереса',exact:true}).selectOption(kind);
 }
 async function addRegion(){
   const before=await snapshot();const candidates=page.locator('polygon.hex.candidate');const count=await candidates.count();
   for(let i=0;i<count;i++){
     await candidates.nth(i).dispatchEvent('click');await page.waitForFunction(()=>!document.querySelector('.controls--history button').disabled||!!document.querySelector('[role=alert]'));
     const after=await snapshot();if(after.map.regions.length>before.map.regions.length)return after;
     assert.deepEqual(after,before,'failed generation is atomic');
   }
   assert.fail('No candidate could generate a region');
 }
 async function transaction(action){const before=await snapshot();await action();const after=await snapshot();assert.notDeepEqual(after,before);await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);return after;}

 await load(fixture); const a=fixture.map.regions[0].hexes[0], key=`${a.q},${a.r}`;
 const open=async()=>{if(await button('+ Добавить заметку').count())await button('+ Добавить заметку').click();else if(!await page.locator('#gm-notes-text').count())await page.locator('#gm-notes-label').click();return page.locator('#gm-notes-text');};
 await select(key);let area=await open();await area.pressSequentially('rapid-input-123', {delay:0});
 assert.equal((await snapshot()).map.gmNotesByHexKey[key],'rapid-input-123');
 await button('Отменить').click();assert.equal((await snapshot()).map.gmNotesByHexKey[key],undefined);
 await button('Повторить').click(); area=await open();
 // Blur is a boundary even when there is no 500ms pause.
 await area.fill('blur-first');await button('Switch to English').click();await area.fill('blur-second');
 await button('Undo').click();assert.equal((await snapshot()).map.gmNotesByHexKey[key],'blur-first');
 await button('Переключить на русский').click();area=await open();
 await area.fill('last-before-import!');await load(fixture);await button('Отменить').click();
 assert.equal((await snapshot()).map.gmNotesByHexKey[key],'last-before-import!');
 area=await open();const long='  Unicode 中 😀 <script>literal</script>\n'.repeat(400);
 await area.fill(long);assert.equal((await snapshot()).map.gmNotesByHexKey[key],long);
 await area.press('ControlOrMeta+End');await area.press('Enter');await area.pressSequentially('tail');
 assert.equal((await snapshot()).map.gmNotesByHexKey[key],long+'\ntail');
 assert.deepEqual(errors,[]); console.log(JSON.stringify({rapidKeystrokes:true,blurBoundary:true,immediateImportUndo:true,longTextLastCharacter:true,pageErrors:errors}));
} finally {await browser?.close();server.kill('SIGTERM');}
