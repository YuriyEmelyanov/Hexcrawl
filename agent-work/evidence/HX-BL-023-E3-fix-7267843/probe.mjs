import {spawn} from 'node:child_process';
import {chromium} from '/workspace/hx-fix/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspace/f7-evidence/';
const server=spawn(process.execPath,['/workspace/hx-fix/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4186','--strictPort'],{cwd:'/workspace/hx-fix',stdio:['ignore','pipe','inherit']});
await new Promise((res,rej)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))res();});server.on('error',rej);});
const browser=await chromium.launch({executablePath:'/tmp/f7-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1500,height:1100}});const errors=[],alerts=[],results={};
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss();});
await page.route(/mc\.yandex/,r=>r.abort());
await page.addInitScript(()=>{
 const make=URL.createObjectURL, click=HTMLAnchorElement.prototype.click, blobs=new Map();
 URL.createObjectURL=function(blob){const u=make.call(this,blob);blobs.set(u,blob);if(blob.type.includes('svg'))blob.text().then(t=>window.__svg=t);return u;};
 HTMLAnchorElement.prototype.click=function(){const b=blobs.get(this.href);if(this.download.endsWith('.json')){b.text().then(t=>window.__exported=JSON.parse(t));return;}if(this.download.endsWith('.png')){window.__png=true;return;}return click.call(this);};
});
const button=name=>page.getByRole('button',{name,exact:true});
async function load(data){await page.locator('input[type=file]').setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);}
const select=async h=>page.locator(`polygon.hex[data-hex-key="${h.q},${h.r}"]`).dispatchEvent('click');
async function snapshot(){await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__exported);return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});}
async function edit(){if(await button('Редактировать').count())await button('Редактировать').click();}
try {
await page.goto('http://127.0.0.1:4186/');
const data=JSON.parse(await fs.readFile(out+'suppressed-endpoint-input.json'));
await load(data);await select({q:4,r:6});await edit();const before=await snapshot();
await button('Начать путь отсюда').click();await select({q:3,r:6});await page.locator('.map-viewport').focus();await page.keyboard.press('Enter');
assert.equal(await page.locator('[data-editor-only="draft"]').count(),1);results.suppressed_endpoint_rejected=true;
await button('Сбросить черновик').click();assert.deepEqual(await snapshot(),before);
// Existing real crossing and an overlapping legacy container expose identity selection.
const original=JSON.parse(await fs.readFile('/workspace/hx-fix/test/fixtures/road-entry-zigzags.json'));
const crossing=original.map.crossings[0];const road=original.map.roads.find(r=>r.id===crossing.roadId);const s=road.segments.find(s=>[`${s.from.q},${s.from.r}`,`${s.to.q},${s.to.r}`].sort().join('|')===crossing.roadSegmentKey);
const dup=structuredClone(road);dup.id=Math.max(...original.map.roads.map(r=>r.id))+1;dup.segments=[s];original.map.roads.push(dup);original.counters.nextRoadId=dup.id+1;
await load(original);await select(s.from);await edit();
const label=`Участок ${road.id}: ${s.from.q},${s.from.r} → ${s.to.q},${s.to.r}`;
await page.getByRole('button',{name:`Участок ${road.id}: ${crossing.roadSegmentKey}`,exact:true}).focus();await page.keyboard.press('Enter');
results.overlap={chosenRoadId:road.id,otherRoadId:dup.id,pressedLabels:await page.locator('.road-editor__item button[aria-pressed=true]').allTextContents(),highlightedLines:await page.locator('[data-editor-only] line[stroke="#7dd3fc"]').count(),focusableRoadTargets:await page.locator('[data-editor-only="roads"] [tabindex]').count()};
assert.equal(results.overlap.highlightedLines,1);assert.equal(results.overlap.pressedLabels.length,1);assert.ok(results.overlap.focusableRoadTargets>0);
for(const width of [1500,390]){
 await page.setViewportSize({width,height:1100});
 results['layout_'+width]={horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),controls:await page.locator('.road-editor select,.road-editor button').evaluateAll(es=>es.map(e=>({text:e.textContent,aria:e.getAttribute('aria-label'),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})))};
 await page.screenshot({path:out+'overlap-ru-'+width+'.png',fullPage:true});
}
if(await page.locator('.header-links').evaluate(e=>e.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
await button('Switch to English').click();await page.screenshot({path:out+'overlap-en-390.png',fullPage:true});
results.errors=errors;results.alerts=alerts;
await fs.writeFile(out+'browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.kill();}
