import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {stripVTControlCharacters} from 'node:util';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4178','--strictPort'],{stdio:['ignore','pipe','inherit']});
const modes=['emoji','tiles','color'], seeds=[42,7,123,2026,99,314159,8675309,271828,654321,123456789];
const rows=[];let browser;
async function assets(dir,prefix=''){
 const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){
  const name=prefix+e.name;if(e.isDirectory())out.push(...await assets(dir+'/'+e.name,name+'/'));
  else if(/\.(png|svg|webp)$/.test(name))out.push('/'+name);
 }return out;
}
try{
 await new Promise((resolve,reject)=>{let out='';const t=setTimeout(()=>reject(Error('Server timeout')),15000);server.stdout.on('data',d=>{out+=d;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(t);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1000}});
 await page.route(/mc\.yandex/,route=>route.abort());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  let cryptoSeed=12345;Object.defineProperty(crypto,'getRandomValues',{value:array=>{for(let i=0;i<array.length;i++){cryptoSeed=(Math.imul(cryptoSeed,1664525)+1013904223)>>>0;array[i]=cryptoSeed;}return array;}});
  window.__setSeed=seed=>{let s=seed>>>0;window.__randomDraws=0;Math.random=()=>{window.__randomDraws++;s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};window.__setSeed(1);
 });
 const paths=await assets('public');
 async function run(mode,seed,warmup=false){
  await page.goto('http://127.0.0.1:4178/');
  await page.locator('.mode-selector select').selectOption('mythic');
  const toggle=page.locator('.biome-display-toggle');
  while(await toggle.getAttribute('data-mode')!==mode)await toggle.click();
  await page.evaluate(async paths=>{
   window.__cachedImages=[];
   for(let i=0;i<paths.length;i+=12)await Promise.all(paths.slice(i,i+12).map(src=>new Promise(resolve=>{const img=new Image();window.__cachedImages.push(img);img.onload=()=>img.decode().catch(()=>{}).then(resolve);img.onerror=resolve;img.src=src;})));
   await document.fonts.ready;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  },paths);
  const result=await page.evaluate(seed=>new Promise((resolve,reject)=>{
   window.__setSeed(seed);
   const select=document.querySelector('.mode-selector select');
   const candidate=document.querySelector('polygon.hex.candidate');
   if(!candidate)return reject(Error('No starting candidate'));
   let seen=false,endDom;const t=setTimeout(()=>{observer.disconnect();reject(Error('Kingdom timed out'));},120000);
   const observer=new MutationObserver(()=>{
    if(select.disabled)seen=true;
    if(seen&&!select.disabled){
     endDom=performance.now();observer.disconnect();clearTimeout(t);
     requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({domMs:endDom-start,visibleMs:performance.now()-start,randomDraws:window.__randomDraws,alert:document.querySelector('[role=alert]')?.textContent??null,hexes:document.querySelectorAll('polygon.hex.region,polygon.hex.center').length,svgElements:document.querySelector('[data-biome-display]')?.querySelectorAll('*').length})));
    }
   });
   observer.observe(document.querySelector('.content'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
   const start=performance.now();candidate.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  }),seed);
  const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);
  const save=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  const row={mode,seed,warmup,...result,kingdoms:save.map.kingdoms.length,regions:save.map.regions.length,mapHash:createHash('sha256').update(JSON.stringify(save.map)).digest('hex')};
  rows.push(row);console.log('KINGDOM_SAMPLE '+JSON.stringify(row));
  await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/kingdom-benchmark.json',JSON.stringify({rows},null,2));
  if(row.alert||row.kingdoms!==1||errors.length)throw Error('Incomplete kingdom '+JSON.stringify({row,errors}));
 }
 for(const mode of modes)await run(mode,777,true);
 if(new Set(rows.map(r=>r.mapHash)).size!==1)throw Error('Warmup maps differ '+JSON.stringify(rows));
 for(let i=0;i<seeds.length;i++){
  for(let j=0;j<3;j++)await run(modes[(i+j)%3],seeds[i]);
  if(new Set(rows.filter(r=>!r.warmup&&r.seed===seeds[i]).map(r=>r.mapHash)).size!==1)throw Error('Paired maps differ for seed '+seeds[i]);
 }
 const samples=rows.filter(r=>!r.warmup),summary={};
 for(const mode of modes){const values=samples.filter(r=>r.mode===mode).map(r=>r.visibleMs).sort((a,b)=>a-b);summary[mode]={n:values.length,meanMs:values.reduce((a,b)=>a+b,0)/values.length,medianMs:(values[4]+values[5])/2,minMs:values[0],maxMs:values.at(-1),stdMs:Math.sqrt(values.reduce((n,v)=>n+(v-values.reduce((a,b)=>a+b,0)/values.length)**2,0)/(values.length-1)),meanDomMs:samples.filter(r=>r.mode===mode).reduce((n,r)=>n+r.domMs,0)/values.length};}
 const identicalMaps=seeds.every(seed=>new Set(samples.filter(r=>r.seed===seed).map(r=>r.mapHash)).size===1);
 const report={version:process.env.BENCH_BASE_SHA,environment:{platform:os.platform(),cpu:os.cpus()[0]?.model,vcpus:os.cpus().length,browser:browser.version(),viewport:{width:1500,height:1000},headless:true},method:'Empty map; Mythic Bastionland kingdom 12x12; SVG POI unchanged; all image assets and fonts preloaded; crypto seed fixed and analytics blocked; one excluded warmup per mode; ten paired deterministic random seeds; rotated mode order; browser clock from click handler dispatch to completion DOM commit plus two animation frames. No CPU throttling.',identicalMaps,summary,rows};
 await fs.writeFile('reports/kingdom-benchmark.json',JSON.stringify(report,null,2));console.log('KINGDOM_REPORT '+JSON.stringify(report));
 if(!identicalMaps)throw Error('Mode changed generated map; paired comparison invalid');
}finally{if(browser)await browser.close();server.kill();}
