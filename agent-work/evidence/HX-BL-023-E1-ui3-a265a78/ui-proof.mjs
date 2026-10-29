import {createGenerationState} from '../../src/worldRandom.ts';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../../',import.meta.url);
const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manual-edit-map.json',import.meta.url)));
const manifest=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manifest.json',import.meta.url)));
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4192','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
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
 await page.goto('http://127.0.0.1:4192/');
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
   const before=await snapshot();await page.locator("details.export-menu").evaluate(el=>el.open=false);const candidates=page.locator('polygon.hex.candidate');const count=await candidates.count();
   for(let i=0;i<count;i++){
     await candidates.nth(i).dispatchEvent('click');await page.waitForFunction(()=>!document.querySelector('.controls--history button').disabled||!!document.querySelector('[role=alert]'));
     const after=await snapshot();if(after.map.regions.length>before.map.regions.length)return after;
     assert.deepEqual(after,before,'failed generation is atomic');
   }
   assert.fail('No candidate could generate a region');
 }
 async function transaction(action){const before=await snapshot();await page.locator("details.export-menu").evaluate(el=>el.open=false);await action();const after=await snapshot();assert.notDeepEqual(after,before);await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);return after;}

 const data=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-mythic.json',import.meta.url)));
 data.map.gmNotesByHexKey={'3,6':'Авторская заметка: старая переправа ведёт к заброшенной башне.'};
 await load(data);await select('3,6');
 const find=button('Найти объект'),section=page.getByRole('region',{name:'Названия карты',exact:true});
 const before=await snapshot();await page.locator("details.export-menu").evaluate(el=>el.open=false);
 assert.equal(await find.getAttribute('aria-expanded'),'false');
 assert.equal(await section.locator('.map-names__list').count(),0);
 await page.locator('.gm-notes__text').click();
 await page.setViewportSize({width:1500,height:1800});
 await find.scrollIntoViewIfNeeded();
 await page.screenshot({path:'../names-ui3-evidence/desktop-closed.png',fullPage:true});
 await page.locator('#side-panel-info .info-body').screenshot({path:'../names-ui3-evidence/desktop-info.png'});
 await find.click();
 await page.screenshot({path:'../names-ui3-evidence/desktop-search.png',fullPage:true});
 await find.click();
 await page.locator('#side-panel-info .map-name__edit').first().click();
 assert.equal(await section.locator('.map-names__list').count(),0);
 await page.screenshot({path:'../names-ui3-evidence/desktop-inline.png',fullPage:true});
 await page.getByRole('form',{name:'Изменение названия',exact:true}).getByRole('button',{name:'Отменить',exact:true}).click();
 await page.setViewportSize({width:390,height:1000});
 await page.locator('.gm-notes__text').click();
 await find.scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'../names-ui3-evidence/narrow-closed.png',fullPage:true});
 await page.locator('#side-panel-info .info-body').screenshot({path:'../names-ui3-evidence/narrow-info.png'});
 assert.deepEqual(await snapshot(),before);
 const empty=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-empty.json',import.meta.url)));
 await load(empty);
 if(await find.getAttribute('aria-expanded')==='true')await find.click();
 await find.click();
 assert.match(await section.innerText(),/На карте пока нет именованных объектов/);
 console.log(JSON.stringify({emptySearchAvailable:true,placement:'after all region/hex information and notes',closedCatalogAbsent:true,inlineWithoutCatalog:true,notesPreserved:true,narrowNoOverflow:true,pageErrors:errors}));
 assert.equal(errors.length,0);
} finally {if(browser)await browser.close();server.kill();}
