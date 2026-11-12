// Temporary presentation capture, not a permanent product test or a benchmark.
import {chromium} from './after/node_modules/playwright/index.mjs';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out='release-walkthrough';await fs.mkdir(out,{recursive:true});
const fixture=await fs.readFile('before/test/fixtures/road-entry-zigzags.json');
await fs.writeFile(`${out}/input-world.json`,fixture);
const manifest={purpose:'Actual published-source main versus accepted PR503, same unmodified public saved world',fixture_sha256:createHash('sha256').update(fixture).digest('hex'),screenshots:[],actions:[],sources:{},page_errors:[],dialogs:[],permanent_test_changes:0};
const servers=[];let browser;
async function serve(dir,port){const s=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:dir,stdio:['ignore','pipe','inherit']});servers.push(s);await new Promise((ok,no)=>{let text='';const t=setTimeout(()=>no(Error(text)),15000);s.stdout.on('data',b=>{text+=b;if(text.replace(/\x1b\[[0-9;]*m/g,'').includes('Local:')){clearTimeout(t);ok();}});s.on('error',no);});}
async function shot(page,name,scope=null){await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const target=scope?page.locator(scope):page;const bytes=await target.screenshot({path:`${out}/${name}.png`,...(scope?{}:{fullPage:true})});manifest.screenshots.push({name:`${name}.png`,viewport:page.viewportSize(),scope:scope??'full page',sha256:createHash('sha256').update(bytes).digest('hex')});}
async function snapshot(page,name){const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'JSON',exact:true}).click();const d=await download;const bytes=await fs.readFile(await d.path());await fs.writeFile(`${out}/${name}.json`,bytes);await menu.locator('summary').click();const data=JSON.parse(bytes);delete data.savedAt;return data;}
const geography=d=>{const m=structuredClone(d.map);delete m.physicalGrid;return m;};
try{
 for(const [dir,sha,port]of [['before','1962fb9a835a9c310e55c1a09415fe180f22cca9',4191],['after','d41911b8d7c2248f115b182923350dc8d08c0a48',4192]]){const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:dir,encoding:'utf8'}).trim();assert.equal(actual,sha);manifest.sources[dir]={sha:actual,tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:dir,encoding:'utf8'}).trim(),tracked_diff:execFileSync('git',['diff','--name-only','HEAD'],{cwd:dir,encoding:'utf8'}).trim()};assert.equal(manifest.sources[dir].tracked_diff,'');await serve(dir,port);}
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 let mainWorld;
 for(const [version,port]of [['before',4191],['after',4192]]){
 const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(25000);page.on('pageerror',e=>manifest.page_errors.push({version,error:e.message}));page.on('dialog',async d=>{manifest.dialogs.push({version,text:d.message()});await d.dismiss();});await page.route(/mc\.yandex/,r=>r.abort());
 await page.goto(`http://127.0.0.1:${port}/`);const ru=page.getByRole('button',{name:'Переключить на русский',exact:true});if(await ru.count())await ru.click();
 await page.locator('input[type=file]').setInputFiles({name:'same-world.json',mimeType:'application/json',buffer:fixture});await page.waitForFunction(()=>document.querySelectorAll('polygon.hex[data-hex-key]').length>10&&!document.querySelector('.controls--transfer > button').disabled);
 const loaded=await snapshot(page,`${version}-loaded`);if(version==='before')mainWorld=geography(loaded);else assert.deepEqual(geography(loaded),mainWorld,'same imported accepted geography');
 const native=page.locator('polygon.hex[data-hex-key="0,0"]');await native.click();await page.locator('.map-viewport').scrollIntoViewIfNeeded();await shot(page,`${version}-desktop-6`);
 await page.setViewportSize({width:390,height:1000});await native.click();await page.locator('.map-viewport').scrollIntoViewIfNeeded();await shot(page,`${version}-narrow-6`);
 if(version==='before'){await page.close();continue;}
 await page.setViewportSize({width:1500,height:1000});const step=page.locator('[data-fine-step]');await step.selectOption('1');
 if(await page.locator('[data-fine-preview]').count()){await shot(page,'after-desktop-first-preview');await page.locator('[data-fine-preview]').getByRole('button',{name:'Применить',exact:true}).click();}
 await page.locator('[data-fine-world]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-fine-step]').value==='1');
 const panel=page.locator('[data-fine-panel]');
 const initial=await snapshot(page,'after-fine-initial');assert.deepEqual(geography(initial),mainWorld,'binding preserves geography');
 for(const width of [1500,390]){
 await page.setViewportSize({width,height:1000});await page.locator('[data-fine-key="0,0"]').click();await panel.hover();await page.locator('.map-viewport').scrollIntoViewIfNeeded();await shot(page,`after-${width}-1-read`);await shot(page,`after-${width}-card`,'[data-fine-panel]');
 const before=await snapshot(page,`after-${width}-before-edit`);
 await panel.getByRole('button',{name:'Редактировать',exact:true}).click();await page.getByLabel('Название гекса',{exact:true}).fill('Лагерь у переправы');await page.getByLabel('Заметка гекса',{exact:true}).fill('Осмотреть берег перед переходом.');await shot(page,`after-${width}-2-edit`);await shot(page,`after-${width}-editor`,'[data-fine-panel]');
 await page.locator('[data-fine-editor]').getByRole('button',{name:'Сохранить',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-fine-editor]'));assert.match(await panel.innerText(),/Лагерь у переправы/);await shot(page,`after-${width}-3-saved`);const saved=await snapshot(page,`after-${width}-saved`);assert.deepEqual(geography(saved),mainWorld);assert.deepEqual(saved.generation,before.generation);
 await page.getByRole('button',{name:'Отменить',exact:true}).click();await shot(page,`after-${width}-4-undo`);const undone=await snapshot(page,`after-${width}-undone`);assert.deepEqual(undone.map,before.map);assert.deepEqual(undone.generation,before.generation);
 await panel.getByRole('button',{name:'Редактировать',exact:true}).click();await page.getByLabel('Заметка гекса',{exact:true}).fill('Этот черновик отменяем');await page.locator('[data-fine-editor]').getByRole('button',{name:'Отмена',exact:true}).click();assert.doesNotMatch(await panel.innerText(),/Этот черновик отменяем/);await shot(page,`after-${width}-5-cancelled`);
 manifest.actions.push({width,target:'0,0',select_read_edit_save_undo_cancel:'completed',saved_name:'Лагерь у переправы',geography_and_rng_preserved:true,undo_exact_map_and_rng:true,page_overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});
 }
 // Real local cards containing a road/river and their genuinely empty neighbour.
 await page.setViewportSize({width:1500,height:1000});const cells=await page.locator('[data-fine-key]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fine-key')));const local=[];for(const key of cells){await page.locator(`[data-fine-key="${key}"]`).click();await panel.hover();const text=await panel.innerText();const roads=await panel.locator('p').allTextContents();if((/дорог|троп|река|реки|river|road|trail/i.test(text)&&!local.some(x=>x.kind==='routes'))||(!/дорог|троп|река|реки|river|road|trail/i.test(text)&&!local.some(x=>x.kind==='no-routes'))){const kind=/дорог|троп|река|реки|river|road|trail/i.test(text)?'routes':'no-routes';local.push({kind,key,text,rows:roads});await shot(page,`after-local-${kind}`);await shot(page,`after-local-${kind}-card`,'[data-fine-panel]');}if(local.length===2)break;}
 manifest.local_examples=local;await page.close();
 }
 assert.deepEqual(manifest.page_errors,[]);assert.deepEqual(manifest.dialogs,[]);manifest.status='captured';
}catch(e){manifest.status='incomplete';manifest.error=e.stack;throw e;}finally{await fs.writeFile(`${out}/manifest.json`,JSON.stringify(manifest,null,2));await browser?.close();for(const s of servers)s.kill();}
