import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../../',import.meta.url),out=new URL('reports/HX-BL-041/',root);
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4188','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error(text)),10000);server.stdout.on('data',data=>{text+=data;if(stripVTControlCharacters(text).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(blob){const url=create.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};HTMLAnchorElement.prototype.click=function(){if(blobs.has(this.href)){blobs.get(this.href).then(text=>window.__exported=JSON.parse(text));return;}return click.call(this);};});
 await page.goto('http://127.0.0.1:4188/');
 await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
 const data=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-mythic.json',import.meta.url)));
 async function snapshot(){await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await page.getByRole('button',{name:'JSON',exact:true}).click();await page.waitForFunction(()=>window.__exported);return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});}
 await page.locator('input[type=file]').setInputFiles({name:'tags-legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 assert.equal((await snapshot()).map.tags.instances.length,0,'legacy open must not roll');
 await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('mythic');
 const region=data.map.regions.find(r=>r.centralPoiKind==='monument'||Object.values(r.pointOfInterestKinds??{}).includes('monument'));
 const hex=region.centralPoiKind==='monument'?region.centerHex:region.pointsOfInterest.find(h=>region.pointOfInterestKinds[`${h.q},${h.r}`]==='monument');
 await page.locator(`polygon.hex[data-hex-key="${hex.q},${hex.r}"]`).dispatchEvent('click');
 const info=page.locator('.info-block--hex');
 await page.getByRole('button',{name:'Редактировать',exact:true}).click();
 await page.getByRole('button',{name:'Заполнить недостающие теги',exact:true}).click();
 const filled=await snapshot();assert.ok(filled.map.tags.instances.length>30);
 await page.getByRole('button',{name:'Готово',exact:true}).click();
 const row=info.locator('[data-tag="mb.monument"]'),die=row.locator('[data-tag-slot="0"]');
 await die.click();const after=await snapshot();
 const beforeTag=filled.map.tags.instances.find(i=>i.definitionId==='mb.monument'&&i.owner.hexKey===`${hex.q},${hex.r}`);
 const afterTag=after.map.tags.instances.find(i=>i.definitionId==='mb.monument'&&i.owner.hexKey===`${hex.q},${hex.r}`);
 assert.deepEqual(afterTag.values[1],beforeTag.values[1]);assert.equal(afterTag.revision,beforeTag.revision+1);
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await snapshot(),filled);
 await page.getByRole('button',{name:'Повторить',exact:true}).click();assert.deepEqual(await snapshot(),after);
 const metrics=[];await fs.mkdir(out,{recursive:true});
 for(const width of [1500,390,320]){
  await page.setViewportSize({width,height:1100});await info.scrollIntoViewIfNeeded();
  const size=await die.evaluate(el=>{const b=el.getBoundingClientRect(),p=el.closest('.direct-line'),c=getComputedStyle(p);return{w:b.width,h:b.height,font:Number.parseFloat(c.fontSize),cardWidth:el.closest('section').clientWidth,scrollWidth:el.closest('section').scrollWidth};});
  assert.ok(size.w<=size.font*1.15+.1&&size.h<=size.font*1.15+.1,JSON.stringify(size));assert.ok(size.scrollWidth<=size.cardWidth+1,'no card overflow');metrics.push({width,...size});
  await info.screenshot({path:fileURLToPath(new URL(`monument-${width}.png`,out))});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await die.focus();await page.keyboard.press('Space');await page.waitForTimeout(30);
 assert.equal(await die.locator('svg').evaluate(el=>getComputedStyle(el).animationName),'none');
 const saved=await snapshot();await page.locator('input[type=file]').setInputFiles({name:'tags-v6.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);assert.deepEqual(await snapshot(),saved);
 assert.deepEqual(errors,[]);await fs.writeFile(new URL('metrics.json',out),JSON.stringify(metrics,null,2));
 console.log('HX-BL-041 browser: legacy, fill, tuple reroll, exact history, 1500/390/320 density, keyboard/reduced-motion, v6 roundtrip passed');
}finally{await browser?.close();server.kill();}
