// ONE-MILE1 UI contract: one fixed existing world, no statistical generation series.
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createGenerationHarness} from '../helpers/generation-harness.mjs';
import {prepareFineEvidenceFixture,fineEvidenceSamples,checkFineCamera,checkFineObjectsAndPng,checkFineModeCandidates} from './one-mile-evidence.mjs';
const root=new URL('../../',import.meta.url),out=new URL('../../reports/ONE-MILE1-UI/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:await fs.readFile(new URL('../fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'x'}});
const prepared=h.render().previewOneMile();assert.ok(prepared);assert.equal(h.render().applyOneMilePreview(prepared),true);prepareFineEvidenceFixture(h);const fixture=structuredClone(h.render().createSaveData());
delete fixture.map.physicalGrid.selectedCell;delete fixture.map.physicalGrid.selectedWorldPoint;
const oracle=fineEvidenceSamples(h);
for(const road of fixture.map.roads)fixture.map.editorNames[`road:${road.id}`]={ru:`OM дорога ${road.id}`,en:`OM route ${road.id}`};
for(const river of fixture.map.rivers){const name=fixture.map.toponyms.names[`river:${river.id}`];assert.ok(name);name.ru=`OM река ${river.id}`;name.en=`OM river ${river.id}`;}
// Validate fixture edits before launching a browser; rivers are toponyms, not editorNames.
await h.render().handleImportJson({target:{files:[{text:JSON.stringify(fixture)}],value:'x'}});assert.equal(h.render().createSaveData().version,15);
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4195','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser,page;const errors=[],alerts=[];
const manifest={source_head_sha:null,checkout_sha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),checkout_tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim(),fixture:'road-entry-zigzags.json',screenshots:[],cases:[]};
if(process.env.GITHUB_EVENT_PATH){const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH));manifest.source_head_sha=event.pull_request?.head.sha??process.env.GITHUB_SHA;}

try{
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error(text)),10000);server.stdout.on('data',d=>{text+=d;if(text.replace(/\x1b\[[0-9;]*m/g,'').includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss();});
 await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{window.__fineClicks=[];document.addEventListener('click',e=>{const row=e.target.closest?.('[data-fine-key],[data-fine-candidate]');if(row)window.__fineClicks.push({cell:row.getAttribute('data-fine-key'),candidate:row.getAttribute('data-fine-candidate'),detail:e.detail});},true);const clone=window.structuredClone;window.structuredClone=function(value){if(window.__failFineSave&&value?.regions&&value?.physicalGrid){window.__failFineSave=false;throw Error('Injected fine preparation failure');}return clone(value);};const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const url=make.call(this,b);if(b.type.startsWith('application/json'))blobs.set(url,b.text());return url;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__oneExport=JSON.parse(t));return;}return click.call(this);};});
 await page.addInitScript(()=>{const make=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type.startsWith('image/svg+xml'))blob.text().then(text=>window.__oneSvg=text);return make.call(this,blob);};});
 await page.addInitScript(()=>{const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(file,...args){if(window.__holdFineImport){window.__releaseFineImport=()=>{window.__holdFineImport=false;read.call(this,file,...args);};return;}return read.call(this,file,...args);};});
 await page.goto('http://127.0.0.1:4195/');
 const button=name=>page.getByRole('button',{name,exact:true});
 const snap=async()=>{await page.evaluate(()=>window.__oneExport=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__oneExport!==null);return page.evaluate(()=>{const d=window.__oneExport;delete d.savedAt;return d;});};
 const shot=async(name)=>{await page.evaluate(()=>document.fonts.ready);const bytes=await page.screenshot({path:new URL(name,out).pathname,type:'jpeg',quality:75,fullPage:true});manifest.screenshots.push({name,viewport:page.viewportSize(),mode:await page.locator('[data-fine-step]').inputValue()});};
 let locale='en';
 const lang=async next=>{if(locale===next)return;const show=button(locale==='en'?'Show language and social buttons':'Показать кнопки языка и соцсетей');if(await show.count())await show.click();await button(locale==='en'?'Переключить на русский':'Switch to English').click();locale=next;};
 const step=page.locator('[data-fine-step]');
 await page.locator('input[type=file]').setInputFiles({name:'one-mile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await step.waitFor();await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 assert.match(await page.locator('details.export-menu small').textContent(),/JSON v15/);await shot('desktop-6.jpg');await step.selectOption('1');await page.locator('[data-fine-world]').waitFor();
 assert.equal(await page.locator('polygon.hex[data-hex-key]').count(),0,'no source-six grid under the fine grid');
 const keys=await page.locator('[data-fine-key]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fine-key'))),occupied=new Set(keys);
 assert.ok(keys.length>100);const candidates=await page.locator('[data-fine-candidate]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fine-candidate')));assert.ok(candidates.length);
 for(const key of candidates){const [q,r]=key.split(',').map(Number);assert.ok(!occupied.has(key));assert.ok([[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].some(([dq,dr])=>occupied.has(`${q+dq},${r+dr}`)),'one edge row only');}
 assert.ok(await page.locator('image[data-fine-biome]').count()>100,'per-cell biome assets');
 assert.match(await page.locator('[data-fine-panel]').innerText(),/No hex selected/);await shot('desktop-fine-empty.jpg');

 const pick=async key=>{const target=page.locator(`[data-fine-key="${key}"]`);await target.click();await page.waitForFunction(key=>document.querySelector('[data-fine-selected]')?.getAttribute('data-fine-selected')===key,key);};
 await pick('0,0');assert.ok(await page.locator('[data-fine-selected]').evaluate(el=>parseFloat(el.getAttribute('stroke-width'))*Math.hypot(el.getScreenCTM().a,el.getScreenCTM().b)<=2.1),'selection stroke stays near native2px');const panel=page.locator('[data-fine-panel]');assert.match(await panel.innerText(),/0\/0/);assert.doesNotMatch(await panel.innerText(),/Source|Area|Область|Исходный/);
 await page.locator('[data-fine-key="1,0"]').hover();assert.match(await panel.innerText(),/1\/0/);await panel.hover();assert.match(await panel.innerText(),/0\/0/);
 await shot('desktop-1.jpg');
 const style=page.locator('button.biome-display-toggle');await style.click();assert.equal(await style.getAttribute('data-mode'),'emoji');assert.equal(await page.locator('image[data-fine-biome]').count(),0);assert.ok(await page.locator('[data-fine-cells] .biome-marker').count()>100);await style.click();assert.equal(await style.getAttribute('data-mode'),'color');await style.click();assert.equal(await style.getAttribute('data-mode'),'tiles');
 await page.getByRole('button',{name:/^Rotate map/}).click();assert.match(await page.locator('[data-fine-world]').getAttribute('transform'),/rotate/);assert.match(await page.locator('image[data-fine-biome]').first().getAttribute('transform'),/rotate\(-90/);await page.getByRole('button',{name:'Restore original map rotation'}).click();
 await checkFineCamera({page,step,snap,manifest});await pick('0,0');await panel.hover();
 manifest.cases.push({id:'UI-grid-local-read',status:'pass',fineCells:keys.length,candidates:candidates.length});
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex name',{exact:true}).dispatchEvent('compositionstart');await page.getByLabel('Hex name',{exact:true}).fill('Fine cell');await page.getByLabel('Hex name',{exact:true}).press('Enter');assert.equal(await page.locator('[data-fine-editor]').count(),1,'IME Enter does not save');await page.getByLabel('Hex name',{exact:true}).dispatchEvent('compositionend');await page.getByLabel('Hex note',{exact:true}).fill('One-mile note');
 await step.selectOption('6');await page.locator('[data-fine-exit]').waitFor();await page.locator('[data-fine-exit]').getByRole('button',{name:'Stay',exact:true}).click();assert.equal(await step.inputValue(),'1');assert.equal(await page.getByLabel('Hex note',{exact:true}).inputValue(),'One-mile note');
 await page.getByLabel('Hex name',{exact:true}).press('Escape');assert.equal(await page.locator('[data-fine-editor]').count(),0);
 const before=await snap();assert.deepEqual(before.map.physicalGrid.fineCellEdits,{});
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex name',{exact:true}).fill('Fine cell');await page.getByLabel('Hex note',{exact:true}).fill('One-mile note');await page.evaluate(()=>window.__failFineSave=true);await page.locator('[data-fine-editor]').getByRole('button',{name:'Save',exact:true}).click();assert.match(await page.locator('[data-fine-editor] [role=alert]').innerText(),/Injected fine/);await shot('desktop-fine-error.jpg');await page.locator('[data-fine-editor]').getByRole('button',{name:'Save',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('[data-fine-editor]'));assert.match(await panel.innerText(),/Fine cell/);
 const saved=await snap();assert.deepEqual(saved.generation,before.generation);const only=structuredClone(before);only.map.physicalGrid=saved.map.physicalGrid;assert.deepEqual(saved,only,'local Save has no source-six or RNG effects');assert.equal(saved.map.physicalGrid.fineCellEdits['0,0'].note,'One-mile note');
 await button('Undo').click();assert.doesNotMatch(await panel.innerText(),/Fine cell/);await button('Redo').click();assert.match(await panel.innerText(),/Fine cell/);
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex note',{exact:true}).fill('Saved before switching');await step.selectOption('6');await page.locator('[data-fine-exit]').getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-fine-world]'));assert.equal(await step.inputValue(),'6');
 await step.selectOption('1');await page.locator('[data-fine-world]').waitFor();assert.equal(await page.locator('[data-fine-selected]').getAttribute('data-fine-selected'),'0,0');await panel.hover();assert.match(await panel.innerText(),/Saved before switching/);manifest.cases.push({id:'UI-pinned-editor-exit-and-undo',status:'pass'});
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});await page.locator('.map-viewport').scrollIntoViewIfNeeded();await pick('0,0');await lang('en');await shot(`narrow-${width}-en-read.jpg`);await lang('ru');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,`no page overflow at ${width}`);
   await shot(`narrow-${width}-read.jpg`);await panel.getByRole('button',{name:'Редактировать',exact:true}).click();await page.getByLabel('Заметка гекса',{exact:true}).fill('Черновик');await shot(`narrow-${width}-edit.jpg`);
   const sizes=await page.locator('[data-fine-panel] .direct-mode,[data-fine-editor] input,[data-fine-editor] select,[data-fine-editor] textarea,[data-fine-editor] button').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,rect:{width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}})));for(const size of sizes)assert.ok(size.rect.width>=44&&size.rect.height>=44,JSON.stringify({width,size}));(manifest.touch_targets??=[]).push({width,sizes});
   await page.evaluate(()=>window.__failFineSave=true);await page.locator('[data-fine-editor]').getByRole('button',{name:'Сохранить',exact:true}).click();assert.match(await page.locator('[data-fine-editor] [role=alert]').innerText(),/Injected fine/);await shot(`narrow-${width}-error.jpg`);await page.locator('[data-fine-editor]').getByRole('button',{name:'Отмена',exact:true}).click();
   const stable=await snap();await page.evaluate(()=>window.__holdFineImport=true);await page.locator('input[type=file]').setInputFiles({name:'same-fine.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(stable))});await page.waitForFunction(()=>typeof window.__releaseFineImport==='function'&&document.querySelector('[data-fine-step]').disabled);
   assert.ok(await page.locator('[data-fine-world]').count());assert.equal(await page.locator('[data-fine-key][aria-disabled=true]').count(),keys.length);const pinned=await page.locator('[data-fine-selected]').getAttribute('data-fine-selected');await page.locator('[data-fine-key="1,0"]').dispatchEvent('keydown',{key:'Enter',bubbles:true});await page.locator('[data-fine-candidate]').first().dispatchEvent('keydown',{key:'Enter',bubbles:true});assert.equal(await page.locator('[data-fine-selected]').getAttribute('data-fine-selected'),pinned);await shot(`narrow-${width}-busy-import.jpg`);await page.evaluate(()=>{window.__releaseFineImport();delete window.__releaseFineImport;});await page.waitForFunction(()=>!document.querySelector('[data-fine-step]').disabled);assert.deepEqual(await snap(),stable,'same document import retains accepted fine world');
 }
 manifest.cases.push({id:'UI-responsive-390-320-RU-EN',status:'pass'});
 await lang('en');await page.setViewportSize({width:1500,height:1000});await checkFineObjectsAndPng({page,step,snap,shot,button,manifest,out,oracle});await lang('ru');await page.setViewportSize({width:320,height:1000});
 const beforeGen=await snap(),candidate=page.locator('[data-fine-candidate]').first(),target=await candidate.getAttribute('data-fine-candidate');await candidate.dblclick();await page.waitForFunction(()=>document.querySelector('svg[data-render-phase]')?.getAttribute('data-render-phase')==='ready');const afterGen=await snap();
 if(afterGen.map.regions.length>beforeGen.map.regions.length){assert.equal(afterGen.map.regions.length,beforeGen.map.regions.length+1,'double click gives one ordinary Classic unit');assert.equal(`${afterGen.map.physicalGrid.selectedCell.q},${afterGen.map.physicalGrid.selectedCell.r}`,target);await button('Отменить').click();assert.deepEqual(await snap(),beforeGen,'one Undo restores the whole ordinary unit');manifest.cases.push({id:'UI-ordinary-candidate-unit',status:'pass',outcome:'accepted_and_undo_exact'});}
 else {assert.deepEqual(afterGen,beforeGen,'failed ordinary generation is atomic');manifest.cases.push({id:'UI-ordinary-candidate-unit',status:'pass',outcome:'bounded_refusal_no_success_claim'});}
 await checkFineModeCandidates({page,snap,shot,button,manifest});
 assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);manifest.status='passed';
 await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));
 // Bounded portable actual previews for the repository handoff. Not generated
 // imagery; every JPEG is a screenshot of this exact CI checkout.

}catch(error){manifest.status='failed';manifest.error=String(error);manifest.pageErrors=errors;manifest.alerts=alerts;
 if(page){manifest.diagnostics=await page.evaluate(()=>({step:document.querySelector('[data-fine-step]')?.value,fineWorld:document.querySelectorAll('[data-fine-world]').length,finePanel:document.querySelectorAll('[data-fine-panel]').length,clicks:window.__fineClicks,body:document.body.innerText.slice(0,4000)}));await page.screenshot({path:new URL('failure.jpg',out).pathname,type:'jpeg',quality:75,fullPage:true});}
 await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));throw error;}
finally{await browser?.close();server.kill('SIGTERM');
 console.log('ONE_MILE_UI_RESULT '+JSON.stringify(manifest));
}
