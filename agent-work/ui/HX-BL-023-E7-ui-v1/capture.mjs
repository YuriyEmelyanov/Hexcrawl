import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.env.E7_WORKSPACE||process.cwd());
const source=path.resolve(process.env.E7_SOURCE||root+'/source');
const {chromium}=await import(pathToFileURL(source+'/node_modules/playwright/index.mjs'));
await fs.mkdir(root+'/ui',{recursive:true});
const server=spawn(process.execPath,[source+'/node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4177','--strictPort'],{cwd:source,stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{let out='';server.stdout.on('data',d=>{out+=d;if(out.includes('Local:'))resolve();});server.on('error',reject);setTimeout(()=>reject(Error(out)),10000)});
 browser=await chromium.launch({...(process.env.E7_CHROMIUM?{executablePath:process.env.E7_CHROMIUM}:{}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}});
 await page.route(/mc\.yandex/,r=>r.abort());
 await page.goto('http://127.0.0.1:4177');
 await page.locator('input[type=file]').setInputFiles(source+'/test/fixtures/import-v2/baseline-mythic.json');
 await page.waitForFunction(()=>document.querySelectorAll('polygon.hex').length>100);
 await page.locator('polygon.hex[data-hex-key="3,5"]').dispatchEvent('click');
 await page.locator('.info-block--hex').waitFor();
 console.log((await page.locator('.info-block--hex').innerText()).slice(0,2500));
 await page.locator('.info-block--hex').scrollIntoViewIfNeeded();
 await page.screenshot({path:root+'/ui/current-source-1500.png'});
 await page.getByRole('button',{name:'Редактировать',exact:true}).click();const originalEdit=await page.locator('.info-block--hex').innerHTML();await page.getByRole('button',{name:'Готово',exact:true}).click();await page.evaluate(v=>window.e7OriginalEdit=v,originalEdit);
 const script=await fs.readFile(root+'/ui/prototype.js','utf8'),style=await fs.readFile(root+'/ui/prototype.css','utf8');
 await page.evaluate(({script,style})=>{const s=document.createElement('style');s.textContent=style;document.head.append(s);const el=document.createElement('script');el.textContent=script;document.body.append(el);},{script,style});
 for(const width of [1500,390]){
  await page.setViewportSize({width,height:width===1500?1100:1000});
  for(const state of ['read','edit','select-target','preview','height','conflict','error','after']){
   await page.evaluate(state=>window.e7Show(state),state);
   await page.locator('.info-block--hex').evaluate(el=>el.scrollIntoView({block:'start'}));if(width===390)await page.evaluate(()=>window.scrollBy(0,-60));
   await page.screenshot({path:root+`/ui/e7-ui-v1-${state}-${width}.png`});
   const m=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth,text:getComputedStyle(document.querySelector('.info-block--hex')).fontSize,panels:[...document.querySelectorAll('.info-block--hex *')].filter(e=>['auto','scroll'].includes(getComputedStyle(e).overflowY)).length}));
   console.log(width,state,JSON.stringify(m));
  }
 }
 await page.setViewportSize({width:1500,height:1100});await page.evaluate(()=>window.e7Show('read'));
 const html=await page.evaluate(()=>{
  const clone=document.documentElement.cloneNode(true);clone.querySelector('.info-block--hex').innerHTML=window.e7Original;clone.querySelectorAll('.e7-proposal,[data-e7-overlay]').forEach(e=>e.remove());clone.querySelectorAll('script').forEach(s=>s.remove());clone.querySelectorAll('link[rel="modulepreload"]').forEach(s=>s.remove());clone.querySelectorAll('[src*="mc.yandex"],noscript').forEach(e=>e.remove());
  const app=clone.querySelector('#root');app.querySelectorAll('input[type=file]').forEach(e=>e.remove());
  return '<!doctype html>'+clone.outerHTML;
 });
 const editHtml=await page.evaluate(()=>window.e7OriginalEdit);await fs.writeFile(root+'/ui/preview.html',html.replace('</body>',`<script>window.e7OriginalEdit=${JSON.stringify(editHtml)};</script><script>${script}</script></body>`));
 console.log('DONE');
}finally{await browser?.close();server.kill('SIGTERM');}
