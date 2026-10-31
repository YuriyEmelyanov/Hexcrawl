import {chromium} from '/workspace/e4integration/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/workspace/panel-review-cf08a82', out='/workspace/walkthrough';
const servers=[];const results=[];const errors=[];
async function serve(port,dir){const s=spawn(process.execPath,[root+'/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dir],{cwd:root,stdio:['ignore','pipe','inherit']});servers.push(s);await new Promise((r,j)=>{s.stdout.on('data',d=>{if(d.toString().includes('Local:'))r()});s.on('exit',j)});}
await serve(4190,'/workspace/panel-before-dist');await serve(4191,root+'/dist');
const browser=await chromium.launch({headless:true,executablePath:'/tmp/f7-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
try{
for(const width of [1500,390])for(const kind of ['before','after']){
 const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());await page.goto('http://127.0.0.1:'+(kind==='before'?4190:4191));
 await page.getByRole('textbox',{name:'Seed мира',exact:true}).fill('42');await page.getByRole('textbox',{name:'Seed мира',exact:true}).press('Tab');
 await page.locator('input[type=file]').setInputFiles(root+'/test/fixtures/import-v2/baseline-mythic.json');await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled&&document.querySelector('.direct-mode'));
 const info=page.locator('.info-block--hex');await info.scrollIntoViewIfNeeded();
 await info.screenshot({path:`${out}/${kind}-${width}-read.png`});await page.screenshot({path:`${out}/${kind}-${width}-context.png`});
 if(kind==='after'){
  const mode=info.locator('.direct-mode');assert.equal(await mode.getAttribute('title'),'Редактировать');await mode.hover();
  await mode.click();await info.screenshot({path:`${out}/after-${width}-edit.png`});
  const name=info.locator('[data-name-key^="region:"]').first(),oldName=await name.innerText();await name.click();
  const input=page.getByRole('textbox',{name:'Название',exact:true});await input.fill('Тихая долина');await info.screenshot({path:`${out}/after-${width}-typing.png`});await input.press('Escape');assert.equal(await name.innerText(),oldName);
  await name.click();await input.fill('Тихая долина');await input.press('Enter');assert.equal(await name.innerText(),'Тихая долина');
  await page.getByRole('button',{name:'Готово',exact:true}).click();await info.screenshot({path:`${out}/after-${width}-done.png`});
  await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.equal(await info.getByText('Тихая долина',{exact:true}).count(),0);await info.screenshot({path:`${out}/after-${width}-undo.png`});
  await info.scrollIntoViewIfNeeded();
  const scroll=await page.evaluate(()=>{const sc=innerWidth>900?document.querySelector('.side-panel'):document.scrollingElement;sc.scrollTop=0;const els=['.map-toolbar','.roll-card'].map(s=>document.querySelector(s));const before=els.map(e=>e.getBoundingClientRect().top);sc.scrollTop=180;return{amount:sc.scrollTop,deltas:els.map((e,i)=>e.getBoundingClientRect().top-before[i])}});
  assert.ok(scroll.amount>0);assert.equal(scroll.deltas[0],scroll.deltas[1]);
  results.push({width,oldName,typedName:'Тихая долина',escape:'unchanged',enter:'saved',done:'view_mode',undo:'original_name_restored',scroll,title:'Редактировать'});
 }
 await page.close();
}
assert.deepEqual(errors,[]);await fs.writeFile(out+'/capture-results.json',JSON.stringify({head_sha:'4a46f90be9a0eec795107227d4f3f7af8a417305',before_sha:'defaa5c24d546e4283430573c2d4e4f3b6194dc0',fixture:'test/fixtures/import-v2/baseline-mythic.json',pre_import_seed:42,seed:1792059816,seed_note:'Legacy fixture import replaces pre-import seed; see displayed seed1792059816 in all contexts',results,errors},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();servers.forEach(s=>s.kill());}
