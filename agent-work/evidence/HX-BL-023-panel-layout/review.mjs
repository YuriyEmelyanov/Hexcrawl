import { chromium } from '/workspace/e4integration/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['/workspace/panel-review-cf08a82/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4185','--strictPort'],{cwd:'/workspace/panel-review-cf08a82',stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Local:'))resolve();});server.on('exit',reject);});
const out='/workspace/panel-review-evidence';
const browser=await chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();const errors=[],result=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());await page.route(/mc\.yandex/,r=>r.abort());
try {
for(const width of [1500,390])for(const locale of ['ru','en']) {
 await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4185/');
 await page.locator('input[type=file]').setInputFiles('/workspace/panel-review-cf08a82/test/fixtures/import-v2/baseline-mythic.json');
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled&&document.querySelector('.direct-mode'));
 if(locale==='en'){if(await page.locator('.header-links').evaluate(e=>e.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();await page.getByRole('button',{name:'Switch to English',exact:true}).click();}
 const info=page.locator('.info-block--hex'),mode=page.locator('.direct-mode');await info.scrollIntoViewIfNeeded();
 const measure=await info.evaluate(el=>{const button=el.querySelector('.direct-mode'),p=el.querySelector('p');const b=button.getBoundingClientRect(),r=p.getBoundingClientRect();const side=document.querySelector('.side-panel'),cs=getComputedStyle(side);return{width:innerWidth,label:button.getAttribute('aria-label'),title:button.title,text:button.textContent,button:{x:b.x,y:b.y,width:b.width,height:b.height},heading:{x:r.x,y:r.y,width:r.width,height:r.height},overflows:['.side-panel','.map-toolbar','.roll-card'].map(s=>[s,getComputedStyle(document.querySelector(s)).overflowY]),scrollbarColor:cs.scrollbarColor,scrollbarWidth:cs.scrollbarWidth,fits:document.documentElement.scrollWidth<=innerWidth};});
 assert.equal(measure.label,locale==='ru'?'Редактировать':'Edit');assert.equal(measure.title,measure.label);assert.equal(measure.text,'');assert.ok(measure.fits);assert.ok(measure.heading.y<measure.button.y+22);assert.ok(measure.button.width>=44&&measure.button.height>=44);
 await page.screenshot({path:`${out}/${width}-${locale}-read.png`});
 await mode.focus();await page.keyboard.press('Enter');assert.equal(await mode.getAttribute('aria-pressed'),'true');assert.equal(await mode.getAttribute('title'),locale==='ru'?'Готово':'Done');
 const value=info.locator('[data-name-key]').first();await value.focus();await page.keyboard.press('Enter');const input=page.getByRole('textbox',{name:/^(Название|Name)$/});assert.equal(await input.count(),1);await input.fill('Review temporary name');await input.press('Escape');assert.equal(await input.count(),0);
 await page.screenshot({path:`${out}/${width}-${locale}-edit.png`});await mode.focus();await page.keyboard.press('Space');assert.equal(await mode.getAttribute('aria-pressed'),'false');
 const scroll=await page.evaluate(()=>{const sc=innerWidth>900?document.querySelector('.side-panel'):document.scrollingElement;sc.scrollTop=0;const els=['.map-toolbar','.roll-card'].map(s=>document.querySelector(s));const before=els.map(e=>e.getBoundingClientRect().top);sc.scrollTop=150;return{amount:sc.scrollTop,deltas:els.map((e,i)=>e.getBoundingClientRect().top-before[i])};});assert.ok(scroll.amount>0);assert.equal(scroll.deltas[0],scroll.deltas[1]);
 const toggle=page.locator('.side-panel-toggle');await toggle.click();await page.waitForTimeout(350);assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await mode.isVisible(),false);await page.screenshot({path:`${out}/${width}-${locale}-collapsed.png`});await toggle.focus();await page.keyboard.press('Enter');await page.waitForTimeout(350);assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await mode.isVisible(),true);result.push({...measure,scroll,keyboard:'Enter edit, Enter field, Escape cancel, Space done, Enter expand passed',collapse:'passed'});
}
assert.deepEqual(errors,[]);await fs.writeFile(`${out}/browser-results.json`,JSON.stringify({sha:'4a46f90be9a0eec795107227d4f3f7af8a417305',timestamp:new Date().toISOString(),errors,result},null,2));console.log(JSON.stringify(result,null,2));
}finally{await browser.close();server.kill();}
