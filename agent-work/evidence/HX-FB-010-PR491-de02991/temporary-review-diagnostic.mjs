import {chromium} from './central-note-removal/node_modules/playwright/index.mjs';
import {regionFixture} from './central-note-removal/test/helpers/region-fixture.mjs';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/workspace/scratch/60e61b33a6a0',out=root+'/central-note-review-evidence';
await fs.mkdir(out,{recursive:true});
const servers=[];let browser;
async function start(dir,port){const p=spawn(process.execPath,[root+'/'+dir+'/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root+'/'+dir,stdio:['ignore','pipe','inherit']});servers.push(p);await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('preview timeout '+s)),15000);p.stdout.on('data',d=>{s+=d;if(s.includes('Local:')){clearTimeout(timer);resolve();}});p.on('error',reject);p.on('exit',c=>reject(Error('preview '+c)));});}
const errors=[],alerts=[],cases=[];
try{
 await start('pr490-f01-development',4197);await start('central-note-removal',4198);
 browser=await chromium.launch({executablePath:'/workspace/scratch/cc30953c0fc1/e6-analysis/browser/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const fixture=regionFixture();fixture.map.regions[0].suppressCentralPoi=false;fixture.map.regions[0].centralPoiKind='lair';
 for(const variant of ['before','after'])for(const lang of ['en','ru'])for(const width of [1500,390]){
  const page=await browser.newPage({viewport:{width,height:1100}});
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss();});await page.route(/mc\.yandex/,r=>r.abort());
  await page.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const u=make(b);if(b.type.startsWith('application/json'))blobs.set(u,b.text());return u;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__exported=JSON.parse(t));return;}return click.call(this);};});
  const button=name=>page.getByRole('button',{name,exact:true});
  const close=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')!==null)await menu.locator('summary').click();};
  const snapshot=async()=>{await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__exported);const data=await page.evaluate(()=>{delete window.__exported.savedAt;return window.__exported;});await close();return data;};
  const screenshot=async suffix=>{await close();await page.locator('.info-block--hex').scrollIntoViewIfNeeded();await page.locator('.info-block--hex').screenshot({animations:'disabled',path:`${out}/${variant}-${lang}-${width}-${suffix}.png`});assert.ok(await page.locator('.info-block--hex').evaluate(e=>e.scrollWidth<=e.clientWidth+1));};
  await page.goto(`http://127.0.0.1:${variant==='before'?4197:4198}/`);
  const startsEnglish=await button('Переключить на русский').count()===1;
  if(variant==='after')assert.equal(startsEnglish,true,'fresh context defaults to English');
  if((lang==='en')!==startsEnglish){if(await page.locator('.header-links').evaluate(e=>e.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();await page.locator('.language-toggle').click();}
  await page.locator('input[type=file]').setInputFiles({name:'central.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
  await page.locator('polygon.hex[data-hex-key="0,0"]').dispatchEvent('click');
  await button(lang==='ru'?'Редактировать':'Edit').click();
  const note=/Центральная точка связана с центром региона;можно изменить тип или имя\.|This point is bound to the region center; edit its type or name in place\./;
  assert.equal(await page.getByText(note).count(),variant==='before'?1:0,'explanatory note visibility');
  assert.equal(await page.locator('[data-poi-panel]').count(),variant==='before'?1:0,'central point location container');
  assert.equal(await page.locator('[data-poi-move]').count(),0,'central point cannot move');
  assert.equal(await page.locator('[data-name-key="poi:1:0,0"]').count(),1);
  assert.equal(await button(lang==='ru'?'Редактировать точку интереса':'Edit point of interest').count(),1);
  await screenshot('central');
  if(variant==='after'){
   const initial=await snapshot();
   await page.locator('[data-name-key="poi:1:0,0"]').click();
   const primary=page.getByRole('textbox',{name:lang==='ru'?'Название':'Name',exact:true});
   const secondary=page.getByRole('textbox',{name:lang==='ru'?'Название (English)':'Name (Russian)',exact:true});
   assert.equal(await primary.count(),1);assert.equal(await secondary.count(),1);
   await primary.fill(lang==='ru'?'Тихое логово':'Quiet lair');await secondary.fill(lang==='ru'?'Quiet lair':'Тихое логово');
   await screenshot('name');await secondary.press('Enter');
   const renamed=await snapshot();assert.deepEqual(renamed.map.editorNames['poi:1:0,0'],{ru:'Тихое логово',en:'Quiet lair'});
   await button(lang==='ru'?'Отменить':'Undo').click();assert.deepEqual(await snapshot(),initial);
   if(await button(lang==='ru'?'Редактировать':'Edit').count())await button(lang==='ru'?'Редактировать':'Edit').click();
   await button(lang==='ru'?'Редактировать точку интереса':'Edit point of interest').click();
   const kind=page.getByRole('combobox',{name:lang==='ru'?'Выберите точку интереса':'Choose a point of interest',exact:true});
   assert.equal(await kind.inputValue(),'lair');await screenshot('type');await kind.selectOption('ruins');
   const typed=await snapshot();assert.equal(typed.map.regions[0].centralPoiKind,'ruins');
   await button(lang==='ru'?'Отменить':'Undo').click();assert.deepEqual(await snapshot(),initial);
   await page.locator('polygon.hex[data-hex-key="2,0"]').dispatchEvent('click');
   if(await button(lang==='ru'?'Редактировать':'Edit').count())await button(lang==='ru'?'Редактировать':'Edit').click();
   assert.equal(await page.locator('[data-poi-move]').count(),1,'ordinary POI keeps location command');
   await screenshot('ordinary');
  }
  cases.push({variant,lang,width,status:'passed',freshEnglish:startsEnglish});await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
 const result={cases,errors,alerts,status:'passed',scope:'Temporary diagnostic; not permanent test growth',source_tree:'5e8ebb5f9a63d088f503daf7e8f942c24f16a62a',local_sha:'ffac05ad873fd504f551c7279c6e86cd4525d5f5',remote_sha:'c6953346bd777f92de4db675a058af1de4eba3b9'};
 await fs.writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();for(const p of servers)p.kill();}
