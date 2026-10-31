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
   window.structuredClone=function(value){if(window.__failNamePreparation&&value?.regions&&value?.toponyms){window.__failNamePreparation=false;throw Error('injected rename preparation');}if(window.__failPreparation&&value?.schema==='hexcrawl-map'){window.__failPreparation=false;throw Error('injected before import commit');}return clone(value);};
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
 async function snapshot(){await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__exported!==null);return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});}
 async function load(data){await page.locator('input[type=file]').setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);}
 async function select(key){await page.locator(`polygon.hex[data-hex-key="${key}"]`).dispatchEvent('click');}
 // E3 existing-path controls: exact crossing identity, confirmation preview and history.
 // Reuse this lifecycle runner: no second corpus or mixed-history sequence.
 await load(JSON.parse(await fs.readFile(new URL('../fixtures/road-entry-zigzags.json',import.meta.url))));
 const roadMap=await snapshot(),crossing=roadMap.map.crossings[0];
 const road=roadMap.map.roads.find(r=>r.id===crossing.roadId),seg=road.segments.find(s=>[`${s.from.q},${s.from.r}`,`${s.to.q},${s.to.r}`].sort().join('|')===crossing.roadSegmentKey);
 await select(`${seg.from.q},${seg.from.r}`);
 if(await button('Редактировать').count())await button('Редактировать').click();
 const roadLabel=`Участок ${road.id}: ${seg.from.q},${seg.from.r} → ${seg.to.q},${seg.to.r}`;
 await button(roadLabel).click();
 const oldRoad=await snapshot();
 const crossingSelect=page.getByRole('combobox',{name:`Переправа ${road.id}:${crossing.riverId}`,exact:true});
 await crossingSelect.selectOption(crossing.kind==='bridge'?'ferry':'bridge');
 const changedRoad=await snapshot();assert.notDeepEqual(changedRoad.map.crossings,oldRoad.map.crossings);
 assert.deepEqual(changedRoad.map.roads,oldRoad.map.roads);assert.deepEqual(changedRoad.generation,oldRoad.generation);
 await button('Отменить').click();assert.deepEqual(await snapshot(),oldRoad);
 await button('Повторить').click();assert.deepEqual(await snapshot(),changedRoad);
 await button(roadLabel).click();await button('Удалить весь выделенный путь').click();
 assert.equal(await page.locator('[data-editor-only] line[stroke="#7dd3fc"]').count(),road.segments.length);
 await button('Отмена').click();assert.deepEqual(await snapshot(),changedRoad);
 for(const width of [1500,390]) {
   await page.setViewportSize({width,height:1100});await page.locator('.road-editor').scrollIntoViewIfNeeded();await page.screenshot({path:'/workspace/hx-ui-evidence/'+width+'.png',fullPage:true});
   const rect=await crossingSelect.boundingBox();assert.ok(rect.width>=44&&rect.height>=44,'E3 native control target');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'E3 no horizontal page overflow');
 }
 await page.setViewportSize({width:1500,height:1100});
 console.log('E3 bounded UI passed'); }finally{if(browser)await browser.close();server.kill();}
