import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const out='classic-preview';await fs.mkdir(out,{recursive:true});
const manifest={source:'afebeb085e0bc0059e317ff6a64d02a9f8e46393',seed:42,generation:'classic',regions:[],errors:[],screenshots:[]};
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:['ignore','pipe','inherit']});
let browser,page;
try{
await new Promise((resolve,reject)=>{let s='';server.stdout.on('data',d=>{s+=d;if(s.includes('Local:'))resolve();});setTimeout(()=>reject(Error(s)),15000).unref();});
browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
page=await browser.newPage({viewport:{width:1700,height:1100}});page.setDefaultTimeout(60000);page.on('pageerror',e=>manifest.errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route(/mc\.yandex/,r=>r.abort());
await page.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const u=make.call(this,b);if(b.type.startsWith('application/json'))blobs.set(u,b.text());return u;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__previewExport=JSON.parse(t));return;}return click.call(this);};});
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
await page.getByRole('textbox',{name:'Seed мира',exact:true}).fill('42');await page.getByRole('textbox',{name:'Seed мира',exact:true}).press('Tab');
await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('classic');
await page.locator('.gen-params select').nth(0).selectOption('locality');
const snap=async()=>{await page.evaluate(()=>window.__previewExport=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await page.getByRole('button',{name:'JSON',exact:true}).click();await page.waitForFunction(()=>window.__previewExport);const data=await page.evaluate(()=>window.__previewExport);if(await menu.getAttribute('open')!==null)await menu.locator('summary').click();return data;};
let data;
for(let n=0;n<6;n++){
 await page.locator('.gen-params select').nth(3).selectOption('mainland');
 const candidates=page.locator('polygon.hex.candidate'),count=await candidates.count();let added=false;
 // Spread additions around the existing world rather than always taking the same corner.
 for(let j=0;j<count;j++){const k=(j+Math.floor(count*n/6))%count;await candidates.nth(k).dispatchEvent('click');data=await snap();if(data.map.regions.length===n+1){added=true;break;}}
 assert.ok(added,'region '+(n+1));console.log('Generated region',n+1,'rivers',data.map.rivers.length);
}
manifest.regions=data.map.regions.map(r=>({id:r.id,biome:r.biomeId,cells:r.hexes?.length,finalSize:r.finalSize}));manifest.rivers=data.map.rivers.length;manifest.roads=data.map.roads.length;
await fs.writeFile(out+'/classic-six-regions-6mi.json',JSON.stringify(data,null,2));
const shot=async(name)=>{await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);await page.screenshot({path:out+'/'+name+'.png',fullPage:true});manifest.screenshots.push({name,step:await page.locator('[data-fine-step]').inputValue()});};
const fit=async()=>{const v=page.locator('.map-viewport');await v.scrollIntoViewIfNeeded();for(let i=0;i<2;i++){const dims=await page.evaluate(()=>{const v=document.querySelector('.map-viewport'),s=document.querySelector('svg[data-render-phase]'),b=s.getBoundingClientRect();return{ratio:Math.min((v.clientWidth-30)/b.width,(v.clientHeight-30)/b.height),v:v.getBoundingClientRect().toJSON()};});const b=dims.v;await v.dispatchEvent('wheel',{deltaY:-Math.log(dims.ratio)/.0015,deltaMode:0,clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true});await page.waitForTimeout(300);}await page.evaluate(()=>{const v=document.querySelector('.map-viewport');v.scrollLeft=Math.max(0,(v.scrollWidth-v.clientWidth)/2);v.scrollTop=Math.max(0,(v.scrollHeight-v.clientHeight)/2);window.scrollTo(0,0);});};
await fit();await shot('01-classic-6mi-interface');
await page.locator('[data-fine-step]').selectOption('1');
await page.waitForTimeout(700);
if(await page.locator('[data-fine-preview]').count())await page.locator('[data-fine-preview]').getByRole('button',{name:'Применить',exact:true}).click();
await page.locator('[data-fine-world]').waitFor();
await fit();await shot('02-classic-1mi-before-refinement');
await page.locator('[data-refine-geography]').click();
await page.locator('[data-geometry-preview]').waitFor();
await fit();await shot('03-classic-1mi-refinement-preview');
manifest.refinementPreview=await page.locator('[data-geometry-preview]').innerText();
await page.locator('[data-geometry-preview]').getByRole('button',{name:'Применить',exact:true}).click();
await page.locator('[data-fine-world] [data-refined-geography]').first().waitFor();
await fit();await shot('04-classic-1mi-interface');
data=await snap();await fs.writeFile(out+'/classic-six-regions-refined.json',JSON.stringify(data,null,2));
manifest.refinement=!!data.map.physicalGrid.geometryRefinement;
assert.equal(data.map.regions.length,6);assert.equal(manifest.errors.length,0,manifest.errors.join('\n'));
await page.locator('[data-fine-step]').selectOption('6');await fit();await shot('05-classic-6mi-after-refinement');
console.log(JSON.stringify(manifest,null,2));
}catch(e){manifest.failure=String(e.stack);if(page){manifest.body=await page.locator('body').innerText();await page.screenshot({path:out+'/failure.png',fullPage:true}).catch(()=>{});}throw e;
}finally{await fs.writeFile(out+'/manifest.json',JSON.stringify(manifest,null,2));await browser?.close();server.kill();}
