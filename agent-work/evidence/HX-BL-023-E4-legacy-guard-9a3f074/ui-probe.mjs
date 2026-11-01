import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4199','--strictPort']);
await new Promise((r,j)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))r()});server.on('error',j);server.on('exit',j)});
const b=await chromium.launch({executablePath:'/workspace/browser-tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const results=[];
try{for(const lang of ['ru','en'])for(const width of [1500,390]){
 const p=await b.newPage({viewport:{width,height:1100}}),alerts=[];p.on('dialog',async d=>{alerts.push(d.message());await d.dismiss()});await p.route(/mc\.yandex/,r=>r.abort());
 await p.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const u=make.call(this,b);if(b.type.startsWith('application/json'))blobs.set(u,b.text());return u;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__saved=JSON.parse(t));return;}return click.call(this);};});
 await p.goto('http://127.0.0.1:4199');
 await p.locator('input[type=file]').setInputFiles('test/fixtures/import-v2/baseline-mythic.json');await p.waitForFunction(()=>document.querySelector('.direct-mode')&&!document.querySelector('.controls--transfer > button').disabled);
 if(lang==='en')await p.getByRole('button',{name:'Switch to English',exact:true}).click();
 const info=p.locator('.info-block--hex'),mode=info.locator('.direct-mode');await mode.click();
 const name=info.locator('[data-name-key^="region:"]').first();await name.click();const input=p.getByRole('textbox',{name:lang==='ru'?'Название':'Name',exact:true});await input.fill('Guard probe');await input.press('Enter');
 await p.getByRole('button',{name:lang==='ru'?'Отменить':'Undo',exact:true}).click();
 const redo=p.getByRole('button',{name:lang==='ru'?'Повторить':'Redo',exact:true});assert.ok(await redo.isEnabled());
 const snapshot=async()=>{await p.evaluate(()=>window.__saved=null);const menu=p.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await p.getByRole('button',{name:'JSON',exact:true}).click();await p.waitForFunction(()=>window.__saved);return p.evaluate(()=>{const d=window.__saved;delete d.savedAt;return d;});};
 const before=await snapshot();const bad=JSON.parse(await fs.readFile('test/fixtures/import-v2/baseline-mythic.json'));bad.map.obstacles[0].neighborHex={...bad.map.obstacles[0].hex};
 await p.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await p.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);assert.match(alerts.at(-1),/map\.obstacles\[0\]\.neighborHex/);assert.match(alerts.at(-1),lang==='ru'?/два разных соседних гекса/:/two distinct adjacent hexes/);
 assert.deepEqual(await snapshot(),before);assert.ok(await redo.isEnabled());await redo.click();assert.equal(await info.locator('[data-name-key^="region:"]').first().textContent(),'Guard probe');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await info.screenshot({path:`/workspace/e4-guard-evidence/actual-${lang}-${width}.png`});results.push({lang,width,alert:alerts.at(-1),document_rng_unchanged:true,redo_retained_and_applied:true,overflow:false});await p.close();
 }await fs.writeFile('/workspace/e4-guard-evidence/ui.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await b.close();server.kill()}
