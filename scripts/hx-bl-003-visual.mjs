import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {stripVTControlCharacters} from 'node:util';
import {chromium} from 'playwright';
const root=new URL('../',import.meta.url).pathname;
const out=root+'reports/HX-BL-003/timing/isolated-visual/';
const env=JSON.parse(await fs.readFile(root+'reports/HX-BL-003/paired-environment.json','utf8'));
const manifest=JSON.parse(await fs.readFile(root+'reports/HX-BL-003/corpus/manifest.json','utf8'));
const inputs=manifest.cases.flatMap(c=>c.checkpoints.map(cp=>cp.path));
const rows=[];await fs.mkdir(out,{recursive:true});
async function save(){await fs.writeFile(out+'report.json',JSON.stringify({protocol:'P1/spec1.0',environment:env,method:'one fresh Chromium process per variant/checkpoint; import frozen expected AFTER document; unchanged production SVG/PNG export; no latency evidence',rows},null,2)+'\n');}
async function bounded(p,label){let timer;try{return await Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('external180s timeout '+label)),180000))]);}finally{clearTimeout(timer);}}
function semantic(d){d=structuredClone(d);delete d.savedAt;return d;}
const servers=[['baseline',4185],['candidate',4186]].map(([name,port])=>spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir','/tmp/hx003-pair-'+name+'/dist'],{cwd:root,stdio:['ignore','pipe','inherit']}));
try{
 await Promise.all(servers.map(server=>new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),15000);server.stdout.on('data',b=>{output+=b;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);})));
 for(const input of inputs)for(const [variant,port] of [['A',4185],['B',4186]]){
  const row={input,variant,status:'preparing',started_at:new Date().toISOString(),errors:[],failed_requests:[]};rows.push(row);await save();let browser;
  try{
   browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});assert.equal(browser.version(),env.chromium_version);
   const page=await browser.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:1,locale:'ru-RU'});page.setDefaultTimeout(180000);
   page.on('pageerror',e=>row.errors.push(e.message));page.on('dialog',async d=>{row.errors.push('dialog:'+d.message());await d.dismiss();});page.on('requestfailed',r=>{if(!/mc\.yandex/.test(r.url()))row.failed_requests.push({url:r.url(),error:r.failure()?.errorText});});
   await page.route(/mc\.yandex/,r=>r.abort());await page.addInitScript(()=>{const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){window.__VISUAL_IMPORT=false;this.addEventListener('loadend',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.__VISUAL_IMPORT=true)),{once:true});return read.apply(this,args);};});
   await bounded(page.goto('http://127.0.0.1:'+port+'/'),'page load');
   const path=root+'reports/HX-BL-003/baseline-outputs/'+input.replace(/\.json$/,'-after.json');
   await page.locator('input[type=file]').setInputFiles(path);await page.waitForFunction(()=>window.__VISUAL_IMPORT===true);
   const targetMode=input.startsWith('mythic')?'color':'emoji';const toggle=page.locator('.biome-display-toggle');for(let j=0;await toggle.getAttribute('data-mode')!==targetMode;j++){assert(j<3);await toggle.click();}
   await bounded(page.waitForFunction(()=>document.querySelector('.map-stage > svg')?.getAttribute('data-render-phase')==='ready'&&!document.querySelector('.controls--transfer > button')?.disabled),'detailed artwork ready');
   await bounded(page.evaluate(async()=>{await document.fonts.ready;const urls=[...new Set([...document.querySelectorAll('.map-stage > svg image')].map(n=>n.getAttribute('href')??n.getAttribute('xlink:href')).filter(Boolean))];for(let i=0;i<urls.length;i+=12)await Promise.all(urls.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('asset '+src));img.src=src;})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}),'asset decode');
   async function menu(){const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();}
   await menu();const [json]=await bounded(Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]),'JSON');
   assert.deepEqual(semantic(JSON.parse(await fs.readFile(await json.path(),'utf8'))),semantic(JSON.parse(await fs.readFile(path,'utf8'))));row.full_json_equal=true;
   const stem=out+variant+'-'+input.replace(/\.json$/,'');await fs.writeFile(stem+'.svg',await page.locator('.map-stage > svg').evaluate(n=>n.outerHTML));row.svg=stem+'.svg';
   await menu();row.status='exporting_full_png';await save();const [png]=await bounded(Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'PNG',exact:true}).click()]),'full PNG export');
   await fs.copyFile(await png.path(),stem+'.png');row.png=stem+'.png';assert.equal(row.errors.length,0);row.status='captured';
  }catch(e){row.status='blocked';row.error=String(e);row.png_pixels_verified=false;process.exitCode=1;}
  finally{await browser?.close();row.completed_at=new Date().toISOString();await save();console.log('P1_VISUAL '+JSON.stringify(row));}
 }
}finally{servers.forEach(s=>s.kill());}
