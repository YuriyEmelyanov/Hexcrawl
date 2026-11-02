import {chromium} from '/workspace/e4integration/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['/workspace/e4integration/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4197','--strictPort'],{cwd:'/workspace/review-e4-7d7ae9d',stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve()});server.on('exit',reject)});
process.on('exit',()=>server.kill());
const root='/workspace/review-e4-7d7ae9d';
const browser=await chromium.launch({executablePath:'/workspace/browser-tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1500,height:1100}});const errors=[],alerts=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss()});
await page.route(/mc\.yandex/,r=>r.abort());
await page.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const u=make.call(this,b);blobs.set(u,b);return u};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')){blobs.get(this.href).text().then(t=>window.__saved=JSON.parse(t));return;}return click.call(this)};});
const b=n=>page.getByRole('button',{name:n,exact:true});
async function load(data){await page.locator('input[type=file]').setInputFiles({name:'probe.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled)}
async function save(){await page.evaluate(()=>window.__saved=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await b('JSON').click();await page.waitForFunction(()=>window.__saved);return page.evaluate(()=>{const s=window.__saved;delete s.savedAt;return s})}
const select=async k=>page.locator(`polygon.hex[data-hex-key="${k}"]`).dispatchEvent('click');
await page.goto('http://127.0.0.1:4197');
const fixture=JSON.parse(await fs.readFile(root+'/test/fixtures/import-v2/manual-edit-map.json'));
await load(fixture);await b('Редактировать').click();await select('0,0');await b('Добавить препятствие').click();
console.log('choices',await page.locator('[data-obstacle-editor]').innerText());await page.locator('[data-obstacle-edge]').first().press('Enter');
const added=await save();console.log('added',JSON.stringify(added.map.obstacles));
const id=added.map.obstacles.at(-1).id;await page.locator(`[data-obstacle-id="${id}"] .direct-value`).click();
await page.locator(`[data-obstacle-id="${id}"]`).getByRole('button',{name:'Перенести',exact:true}).click();
console.log('focus before',await page.evaluate(()=>document.activeElement.outerHTML));
await page.keyboard.press('Escape');assert.deepEqual(await save(),added);console.log('cancel exact yes');
await page.locator(`[data-obstacle-id="${id}"] .direct-value`).click();console.log('after reselect',await page.locator('[data-obstacle-editor]').innerText(),await page.locator(`[data-obstacle-id="${id}"]`).innerHTML());await page.screenshot({path:'/workspace/review-e4-evidence/reselect.png',fullPage:true});await page.locator(`[data-obstacle-id="${id}"]`).getByRole('button',{name:'Удалить',exact:true}).click();
console.log('delete focus',await page.evaluate(()=>({html:document.activeElement.outerHTML.slice(0,220),nearby:document.activeElement.hasAttribute('data-obstacle-list')})));
await b('Отменить').click();assert.deepEqual(await save(),added);
// Native PNG export while source selection is visible.
await page.locator(`[data-obstacle-id="${id}"] .direct-value`).click();
const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
const dl=page.waitForEvent('download');await b('PNG').click();await (await dl).saveAs('/workspace/review-e4-evidence/manual-barrier.png');console.log('png saved');
await page.screenshot({path:'/workspace/review-e4-evidence/classic-source.png',fullPage:true});
// Probe map keyboard target rendered geometry across sizes/rotation/zoom.
await b('Добавить препятствие').click();
for(const width of [1500,390]){await page.setViewportSize({width,height:1100});const targets=await page.locator('[data-obstacle-edge]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),width:r.width,height:r.height}}));console.log('sizes',width,JSON.stringify(targets));assert.ok(targets.every(r=>r.width>=43.9&&r.height>=43.9));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.screenshot({path:'/workspace/review-e4-evidence/classic-390-choice.png',fullPage:true});
await page.keyboard.press('Escape');
console.log('errors',errors,'alerts',alerts);
await fs.writeFile('/workspace/review-e4-evidence/classic-added.json',JSON.stringify(added,null,2));
await browser.close();
