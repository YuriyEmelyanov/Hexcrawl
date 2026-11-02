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
fixture.map.terrainByHexKey={};fixture.counters.nextLakeId=1;
const proto=fixture.map.regions[0];proto.hexes=[{q:0,r:0},{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}];proto.targetSize=7;proto.finalSize=7;proto.kingdomId=1;
function translated(dq,id,kingdomId){const r=structuredClone(proto);r.id=id;r.hexes=r.hexes.map(h=>({q:h.q+dq,r:h.r}));r.centerHex={q:dq,r:0};r.anchorHex={q:dq,r:0};if(kingdomId)r.kingdomId=kingdomId;else delete r.kingdomId;return r}
fixture.map.regions.push(translated(30,2,2),translated(70,3));
fixture.map.kingdoms=[{id:1,origin:{q:0,r:0},regionIds:[1],anchor:{q:0,r:0},name:{ru:'Первое',en:'First'},color:'hsl(10 65% 68%)'},{id:2,origin:{q:30,r:0},regionIds:[2],anchor:{q:30,r:0},name:{ru:'Второе',en:'Second'},color:'hsl(20 65% 68%)'}];
fixture.ui.generationMode='mythic';
await fs.writeFile('/workspace/review-e4-evidence/three-area-fixture.json',JSON.stringify(fixture,null,2));
await load(fixture);await b('Редактировать').click();await select('0,0');await b('Добавить препятствие').click();await page.locator('[data-obstacle-editor]').getByRole('button',{name:'Ребро · Добавить препятствие 0,0 → 1,0',exact:true}).click();
const start=await save();console.log('start',start.map.obstacles);const id=start.map.obstacles[0].id;
async function beginMove(){await page.locator(`[data-obstacle-map-id="${id}"]`).press('Enter');await page.locator(`[data-obstacle-id="${id}"]`).getByRole('button',{name:'Перенести',exact:true}).click()}
await beginMove();await select('70,0');console.log('outsidePreview',await page.locator('[data-obstacle-editor]').innerText());await page.locator('[data-obstacle-editor]').getByRole('button',{name:'Ребро · Перенести препятствие 70,0 → 71,0',exact:true}).click();console.log('movefocus',await page.evaluate(()=>document.activeElement.getAttribute('aria-label')));const outside=await save();assert.equal(outside.map.obstacles[0].id,id);assert.ok(!('kingdomId' in outside.map.obstacles[0]));assert.equal(outside.counters.nextObstacleId,start.counters.nextObstacleId);await b('Отменить').click();const undone=await save();assert.deepEqual(undone.map,start.map);assert.deepEqual(undone.generation,start.generation);await b('Повторить').click();assert.deepEqual(await save(),outside);
await beginMove();await select('30,0');console.log('otherPreview',await page.locator('[data-obstacle-editor]').innerText());await page.locator('[data-obstacle-editor]').getByRole('button',{name:'Ребро · Перенести препятствие 30,0 → 31,0',exact:true}).click();const second=await save();assert.equal(second.map.obstacles[0].kingdomId,2);assert.equal(second.map.obstacles[0].id,id);assert.equal(second.counters.nextObstacleId,start.counters.nextObstacleId);assert.equal(second.map.obstacles.length,1);console.log('cross kingdom passed');
await select('0,0');await b('Добавить препятствие').click();
for(const width of [1500,390]){await page.setViewportSize({width,height:1100});const targets=await page.locator('[data-obstacle-edge]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),width:r.width,height:r.height}}));console.log('sizes',width,targets);assert.equal(targets.length,6);assert.ok(targets.every(r=>r.width>=43.9&&r.height>=43.9));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.setViewportSize({width:1500,height:1100});
await page.locator('.rotate-map-button').click();assert.equal(await page.locator('[data-obstacle-edge]').count(),6);const view=page.locator('.map-viewport');const box=await view.boundingBox();await page.mouse.move(box.x+100,box.y+100);await page.mouse.wheel(0,900);await page.waitForTimeout(400);
const targets=await page.locator('[data-obstacle-edge]').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),edge:e.getAttribute('data-obstacle-edge'),width:r.width,height:r.height,x:r.x+r.width/2,y:r.y+r.height/2}}));console.log('zoomtargets',targets);assert.ok(targets.every(r=>r.width>=43.9&&r.height>=43.9));
const first=page.locator('[data-obstacle-edge]').first();await first.scrollIntoViewIfNeeded();const point=await first.evaluate(e=>{const r=e.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,expected:e.getAttribute('data-obstacle-edge'),actual:document.elementFromPoint(x,y)?.getAttribute('data-obstacle-edge')}});console.log('overlap hit',point);await page.screenshot({path:'/workspace/review-e4-evidence/overlap-before.png',fullPage:true});await page.mouse.click(point.x,point.y);console.log('after click count',await page.locator('[data-obstacle-edge]').count());const actual=await save();console.log('actual new obstacle',actual.map.obstacles.at(-1));
await fs.writeFile('/workspace/review-e4-evidence/three-area-result.json',JSON.stringify({start,outside,second,point,actual},null,2));console.log('errors',errors,'alerts',alerts);await browser.close();
