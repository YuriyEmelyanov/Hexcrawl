import {createGenerationState} from '../../src/worldRandom.ts';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../../',import.meta.url);
const presentOut='/workspace/scratch/cc30953c0fc1/presentation-e5';await fs.mkdir(presentOut,{recursive:true});
const captureRows=[];
async function captureState(name,selector='.info-block--hex') {
 const prior=page.viewportSize();
 for(const width of [1500,390]){await page.setViewportSize({width,height:1100});const el=page.locator(selector).last();await el.scrollIntoViewIfNeeded();await page.waitForTimeout(120);await el.screenshot({path:`${presentOut}/${name}-${width}.png`});captureRows.push({name,width,selector,text:await el.innerText()});}
 await page.setViewportSize(prior);
}

const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manual-edit-map.json',import.meta.url)));fixture.ui.mapScale=1.5;
const manifest=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manifest.json',import.meta.url)));
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser,page;const errors=[],alerts=[];
try {
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),10000);server.stdout.on('data',data=>{output+=data;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1500,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(/Будет восстановлено исходное состояние рек|Original river state will be restored/.test(d.message())){await d.accept();return;}alerts.push(d.message());await d.dismiss();});
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
 await page.goto('http://127.0.0.1:4183/');
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
 async function ensureEdit(){const edit=button('Редактировать');if(await edit.count())await edit.click();}
 async function biome(kind){await ensureEdit();await button('Изменить биом гекса').click();await page.getByRole('combobox',{name:'Изменить биом гекса',exact:true}).selectOption(kind);}
 async function poi(kind){
   await ensureEdit();await button('Редактировать точку интереса').first().click();
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
 { // E5-02: extend this same browser lifecycle; no second corpus/runner.
 await load(fixture);await select('0,0');await ensureEdit();
 const before=await snapshot();
 const png=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const got=page.waitForEvent('download');await button('PNG').click();return fs.readFile(await (await got).path());};
 const confirmedPng=await png();
 await button('Добавить реку').click();
 assert.equal(await page.locator('[data-editor-only="river-draft"]').count(),1);
 for(const name of ['Сбросить','Отменить','Повторить','Загрузить JSON'])assert.ok(await button(name).isDisabled(),name+' blocked by draft');
 await button('Готово').click();assert.equal(await button('Готово').count(),1,'invalid draft blocks Done');
 if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
 await button('Switch to English').click();assert.equal(await button('Switch to English').count(),1,'invalid draft blocks language');
 assert.deepEqual(await snapshot(),before,'JSON excludes draft and leaves it open');assert.equal(await page.locator('[data-editor-only="river-draft"]').count(),1);
 assert.deepEqual(await png(),confirmedPng,'PNG excludes draft targets and path overlays');
 const start='-24.249,14',end='-24.249,-14';
 await page.locator(`[data-river-draft-choice="${start}"]`).press('Enter');
 assert.equal(await page.locator('[data-editor-only="river-draft"] line').count(),0,'Enter on vertex chooses a start, not Done');
 await page.locator(`[data-river-draft-choice="${end}"]`).press('Space');assert.equal(await page.locator('[data-editor-only="river-draft"] line').count(),1);
 const hexBox=await page.locator('polygon.hex[data-hex-key="0,0"]').boundingBox();assert.ok(hexBox);
 await page.mouse.move(hexBox.x+hexBox.width/2,hexBox.y+hexBox.height/2);await page.mouse.down();await page.mouse.move(hexBox.x+hexBox.width/2+10,hexBox.y+hexBox.height/2,{steps:4});await page.mouse.up();
 assert.equal(await page.locator('[data-editor-only="river-draft"] line').count(),1,'drag gesture must not finish the path');assert.deepEqual(await snapshot(),before);
 await captureState('create-path','[data-river-draft]');await captureState('create-map-path','.map-viewport');
 await page.locator('.map-viewport').press('Enter');
 const after=await snapshot();await captureState('create-applied');await captureState('create-map-applied','.map-viewport');assert.equal(after.map.rivers.length,before.map.rivers.length+1);assert.equal(after.counters.nextRiverId,before.counters.nextRiverId+1);assert.deepEqual(after.generation,before.generation);assert.equal(await page.locator('[data-editor-only="river-draft"]').count(),0);
 await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);
 await button('Добавить реку').click();await page.locator('.map-viewport').press('Escape');await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-add-river'));assert.deepEqual(await snapshot(),after,'reset leaves committed map unchanged');await captureState('create-cancelled');
 }

await fs.writeFile(`${presentOut}/creation-capture-states.json`,JSON.stringify(captureRows,null,2));console.log('creation presentation enlarged map passed');
}finally{if(browser)await browser.close();server.kill();}
