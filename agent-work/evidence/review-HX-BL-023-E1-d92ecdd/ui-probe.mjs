import {createGenerationState} from '../review-d92ecdd/src/worldRandom.ts';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('file:///workspace/scratch/ff393a3eb37f/review-d92ecdd/');
const fixture=JSON.parse(await fs.readFile(new URL('file:///workspace/scratch/ff393a3eb37f/review-d92ecdd/test/fixtures/import-v2/manual-edit-map.json',import.meta.url)));
const manifest=JSON.parse(await fs.readFile(new URL('file:///workspace/scratch/ff393a3eb37f/review-d92ecdd/test/fixtures/import-v2/manifest.json',import.meta.url)));
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4193','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
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
   window.structuredClone=function(value){if(window.__failNamePreparation&&value?.regions&&value?.toponyms){window.__failNamePreparation=false;throw Error('injected rename preparation');}if(window.__failPreparation&&value?.schema==='hexcrawl-map'){window.__failPreparation=false;throw Error('injected before import commit');}return clone(value);};
   const read=FileReader.prototype.readAsText;
   FileReader.prototype.readAsText=function(file){
     if(window.__delayRead){window.__delayRead=false;window.__releaseRead=()=>read.call(this,file);return;}
     if(window.__failRead){window.__failRead=false;queueMicrotask(()=>this.onerror(new ProgressEvent('error')));return;}
     return read.call(this,file);
   };
 });
 await page.goto('http://127.0.0.1:4193/');
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
   async function png(label){const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const [download]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);const path='../review-d92ecdd-evidence/'+label+'.png';await download.saveAs(path);return fs.readFile(path);}
 const before=await snapshot();const pngBefore=await png('export-before');const candidates=page.locator('polygon.hex.candidate');const count=await candidates.count();
   for(let i=0;i<count;i++){
     await candidates.nth(i).dispatchEvent('click');await page.waitForFunction(()=>!document.querySelector('.controls--history button').disabled||!!document.querySelector('[role=alert]'));
     const after=await snapshot();if(after.map.regions.length>before.map.regions.length)return after;
     assert.deepEqual(after,before,'failed generation is atomic');
   }
   assert.fail('No candidate could generate a region');
 }
 async function transaction(action){const before=await snapshot();await action();const after=await snapshot();assert.notDeepEqual(after,before);await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);return after;}

 const fixture2=JSON.parse(await fs.readFile(new URL('test/fixtures/import-v2/baseline-mythic.json',root)));
 await load(fixture2);
 const keys=await page.locator('polygon.hex[data-hex-key]:not(.candidate)').evaluateAll(es=>es.map(e=>e.dataset.hexKey));
 await select(keys[0]);
 await button('Названия карты').click();
 const list=page.locator('.map-names__list button');await list.first().click();
 const form=()=>page.getByRole('form',{name:'Изменение названия',exact:true});
 const ru=()=>form().getByRole('textbox',{name:'Русское название',exact:true});
 const en=()=>form().getByRole('textbox',{name:'Английское название',exact:true});
 async function png(label){const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const [download]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);const path='../review-d92ecdd-evidence/'+label+'.png';await download.saveAs(path);return fs.readFile(path);}
 const before=await snapshot();const pngBefore=await png('export-before');
 await ru().fill('Новый независимый 🗝');await en().fill('Independent name');
 for(const key of keys.slice(1,4)) {await select(key);const actual=await snapshot(),expected=structuredClone(before);const [q,r]=key.split(',').map(Number);expected.ui.selectedHex={q,r};assert.deepEqual(actual,expected);assert.equal(await ru().inputValue(),'Новый независимый 🗝');assert.equal(await en().inputValue(),'Independent name');}
 const viewed=await snapshot();assert.deepEqual(await png("export-dirty"),pngBefore,"dirty draft and changed inspection do not alter exported PNG");await page.locator('polygon.hex.candidate').first().dispatchEvent('click');assert.deepEqual(await snapshot(),viewed);
 assert.equal(await page.locator('.controls--history button').first().isDisabled(),true);
 await list.nth(1).click();await page.getByRole('dialog').getByRole('button',{name:'Остаться',exact:true}).click();assert.equal(await ru().inputValue(),'Новый независимый 🗝');
 await page.screenshot({path:'../review-d92ecdd-evidence/f1-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:1000});await ru().scrollIntoViewIfNeeded();await page.screenshot({path:'../review-d92ecdd-evidence/f1-390.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await form().getByRole('button',{name:'Сохранить название',exact:true}).click();const saved=await snapshot();assert.deepEqual(await png('export-saved'),pngBefore,'rename preserves PNG pixels');assert.deepEqual(saved.ui,viewed.ui);assert.notDeepEqual(saved.map.toponyms,viewed.map.toponyms);
 await button('Отменить').click();assert.deepEqual(await snapshot(),viewed,'save undo does not undo browsing');await button('Повторить').click();assert.deepEqual(await snapshot(),saved);
 await list.first().click();await ru().fill('Discarded');await list.nth(1).click();await page.getByRole('dialog').getByRole('button',{name:'Отбросить и перейти',exact:true}).click();assert.notEqual(await ru().inputValue(),'Discarded');assert.deepEqual(await snapshot(),saved);
 await ru().fill('Transition saved');await list.first().click();await page.getByRole('dialog').getByRole('button',{name:'Сохранить и перейти',exact:true}).click();assert.notEqual(await ru().inputValue(),'Transition saved');
 await ru().focus();await ru().press('Tab');assert.equal(await en().evaluate(e=>e===document.activeElement),true);await en().fill('Keyboard save');await en().press('Enter');assert.equal(await form().count(),0);await page.waitForFunction(()=>document.activeElement?.closest('.map-names__list'));await list.first().click();await ru().press('Escape');assert.equal(await form().count(),0);await page.waitForFunction(()=>document.activeElement?.closest('.map-names__list'));assert.equal(errors.length,0,JSON.stringify(errors));
 console.log(JSON.stringify({probe:'independent F1 production',existingKeys:keys.slice(0,4),draftRetained:true,candidateBlocked:true,selectedHexOnly:true,saveUndoRedoExact:true,dirtyStayDiscardSave:true,overflow390:false}));
}finally {if(browser)await browser.close();server.kill();}
