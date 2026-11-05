import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '../fix-e6-r2/node_modules/playwright/index.mjs';
const root=new URL('../fix-e6-r2/',import.meta.url);
const server=spawn(process.execPath,[new URL('node_modules/vite/bin/vite.js',root).pathname,'preview','--host','127.0.0.1','--port','4197','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),10000);server.stdout.on('data',data=>{output+=data;if(output.includes('127.0.0.1')){clearTimeout(timer);resolve();}});server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:'/workspace/scratch/cc30953c0fc1/e6-analysis/browser/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),pageerrors=[],diagnostics=[];
 page.on('pageerror',e=>pageerrors.push(e.message));await page.route(/mc\.yandex/,route=>route.abort());
 page.on('console',msg=>{if(msg.type()==='error')diagnostics.push(msg);});
 await page.addInitScript(()=>{
  const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();
  URL.createObjectURL=function(blob){const url=create.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};
  HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(text=>window.__saved=JSON.parse(text));return;}return click.call(this);};
 });
 await page.goto('http://127.0.0.1:4197');
 const fixture=await fs.readFile(new URL('test/fixtures/e6-water-editor.json',root));
 await page.locator('input[type=file]').setInputFiles({name:'water.json',mimeType:'application/json',buffer:fixture});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 const button=name=>page.getByRole('button',{name,exact:true});
 const ensureEdit=async()=>{if(await button('Редактировать').count())await button('Редактировать').click();};
 const snapshot=async()=>{await page.evaluate(()=>window.__saved=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__saved);return page.evaluate(()=>{const d=window.__saved;delete d.savedAt;return d;});};
 await page.locator('polygon.hex[data-hex-key="0,0"]').dispatchEvent('click');await button('Редактировать').click();
 await button('Изменить биом гекса').click();await page.getByRole('combobox',{name:'Изменить биом гекса',exact:true}).selectOption('open_hills');
 const changed=await snapshot();await button('Отменить').click();const before=await snapshot();assert.notDeepEqual(changed,before);assert.equal(await button('Повторить').isEnabled(),true);
 await ensureEdit();await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('lake');
 await page.evaluate(()=>{
  const clone=window.structuredClone;window.__fault=Error('E6-R2-production-copy-sentinel');
  window.structuredClone=function(value){if(value?.regions&&value?.hexTerrainByKey instanceof Map){window.structuredClone=clone;throw window.__fault;}return clone(value);};
 });
 const logStart=diagnostics.length;await button('Готово').click();
 assert.equal(await page.locator('[data-water-draft]').count(),1);assert.equal(await button('Готово').count(),1);const ui=await page.locator('[data-water-error]').innerText();assert.match(ui,/Карта не изменена/);assert.deepEqual(await snapshot(),before);
 const emitted=diagnostics.slice(logStart);assert.equal(emitted.length,1);assert.equal(emitted[0].args().length,2);
 const error=await emitted[0].args()[1].evaluate(value=>({same_original:value===window.__fault,name:value.name,message:value.message,stack:value.stack,same_stack:value.stack===window.__fault.stack}));
 assert.equal(error.same_original,true);assert.equal(error.same_stack,true);assert.match(error.stack,/E6-R2-production-copy-sentinel/);assert.match(error.stack,/at /);
 await page.locator('[data-water-reset]').click();assert.equal(await button('Отменить').isEnabled(),true);assert.equal(await button('Повторить').isEnabled(),true);await button('Повторить').click();assert.deepEqual(await snapshot(),changed);await button('Отменить').click();assert.deepEqual(await snapshot(),before);
 await page.locator('polygon.hex[data-hex-key="3,0"]').dispatchEvent('click');const topologyBefore=await snapshot();await ensureEdit();await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('sea');const expectedStart=diagnostics.length;await button('Готово').click();assert.match(await page.locator('[data-water-error]').innerText(),/две соседние клетки/);assert.equal(diagnostics.length,expectedStart,'expected topology refusal is quiet');assert.deepEqual(await snapshot(),topologyBefore);await page.locator('[data-water-reset]').click();await page.locator('polygon.hex[data-hex-key="0,0"]').dispatchEvent('click');
 await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('lake');
 await page.evaluate(()=>{const clone=window.structuredClone,log=console.error;console.error=()=>{throw Error('E6-R2-production-logger-sentinel');};window.__restoreLog=()=>console.error=log;window.structuredClone=function(value){if(value?.regions&&value?.hexTerrainByKey instanceof Map){window.structuredClone=clone;throw Error('E6-R2-production-copy-with-broken-logger');}return clone(value);};});
 await button('Готово').click();await page.evaluate(()=>window.__restoreLog());assert.equal(await page.locator('[data-water-draft]').count(),1);assert.match(await page.locator('[data-water-error]').innerText(),/Карта не изменена/);assert.deepEqual(await snapshot(),before);assert.deepEqual(pageerrors,[]);
 console.log(JSON.stringify({kind:'temporary_production_fault_probe',ui,diagnostic:{channel:'console.error',context:await emitted[0].args()[0].jsonValue(),...error,argument_count:2},exact_document_rng_counters_preserved:true,both_history_branches_verified_by_redo_and_undo:true,draft_retained:true,expected_topology_refusal_quiet:true,logger_failure_isolated:true,pageerrors,limitations:['Headless Chromium; no physical device or AT claim','Console retention is local technical diagnostics, no external telemetry']},null,2));
}finally{if(browser)await browser.close();server.kill();}
