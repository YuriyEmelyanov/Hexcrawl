import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='/workspace/spacing-evidence',results=[];
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4198','--strictPort'],{stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve()});server.on('error',reject);server.on('exit',reject)});
const browser=await chromium.launch({headless:true,executablePath:'/workspace/browser-tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 for(const lang of ['ru','en'])for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1100}});
  await page.route(/mc\.yandex/,r=>r.abort());
  await page.goto('http://127.0.0.1:4198');
  await page.locator('input[type=file]').setInputFiles('test/fixtures/import-v2/baseline-mythic.json');
  await page.waitForFunction(()=>document.querySelector('.direct-mode')&&!document.querySelector('.controls--transfer > button').disabled);
  if(lang==='en')await page.getByRole('button',{name:'Switch to English',exact:true}).click();
  const info=page.locator('.info-block--hex'),mode=info.locator('.direct-mode');
  const measure=()=>info.evaluate(el=>{const box=el.getBoundingClientRect();return [...el.querySelectorAll('p,.direct-line')].filter(x=>!x.closest('.gm-notes')).map(x=>{const r=x.getBoundingClientRect();return {text:x.textContent.trim(),top:r.top-box.top,height:r.height};});});
  const before=await measure();
  await mode.scrollIntoViewIfNeeded();await mode.focus();await page.keyboard.press('Enter');
  const after=await measure();assert.deepEqual(after,before,lang+' '+width+' identical rows');
  const targets=await info.locator('.direct-value').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return {label:e.getAttribute('aria-label'),text:e.textContent.trim(),x:r.x,y:r.y,width:r.width,height:r.height,minHeight:cs.minHeight,lineHeight:cs.lineHeight,position:cs.position};}));
  const overlaps=[];for(let i=0;i<targets.length;i++)for(let j=i+1;j<targets.length;j++){const a=targets[i],b=targets[j];if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.1)overlaps.push([a,b]);}
  assert.deepEqual(overlaps,[],'inline hitboxes do not overlap');
  for(const t of targets)assert.ok(t.height>0&&t.minHeight==='0px'&&t.position==='static');
  const standalone=await mode.evaluate(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height};});assert.ok(standalone.width>=44&&standalone.height>=44);
  await info.screenshot({path:`${out}/reviewer-${lang}-${width}.png`});
  const name=info.locator('[data-name-key^="region:"]').first();await name.scrollIntoViewIfNeeded();await name.focus();await page.keyboard.press('Enter');
  const input=page.getByRole('textbox',{name:/^(Название|Name)$/});await input.fill(lang==='ru'?'Проверка':'Review');await input.press('Escape');assert.equal(await input.count(),0);
  await name.focus();await page.keyboard.press('Enter');await input.fill(lang==='ru'?'Проверка':'Review');await input.press('Enter');assert.equal(await input.count(),0);assert.equal(await name.textContent(),lang==='ru'?'Проверка':'Review');
  await mode.scrollIntoViewIfNeeded();await mode.focus();await page.keyboard.press('Space');assert.equal(await info.locator('.direct-value').count(),0);assert.equal(await mode.getAttribute('aria-label'),lang==='ru'?'Редактировать':'Edit');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  results.push({lang,width,before,after,targets,standalone,overlaps,keyboard:'Enter edit / Escape cancel / Enter commit / Space Done passed',horizontalOverflow:false});await page.close();
 }
 await fs.writeFile(`${out}/reviewer-measurements.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({lang:r.lang,width:r.width,rows:r.before.length,targets:r.targets.length,standalone:r.standalone,overlaps:r.overlaps.length}))));
}finally{await browser.close();server.kill();}
