import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {stripVTControlCharacters} from 'node:util';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4178','--strictPort'],{stdio:['ignore','pipe','inherit']});
const baselineServer=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4179','--strictPort','--outDir','dist-baseline'],{stdio:['ignore','pipe','inherit']});
const baselineReady=new Promise((resolve,reject)=>{let out='';const t=setTimeout(()=>reject(Error('Baseline server timeout')),15000);baselineServer.stdout.on('data',d=>{out+=d;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(t);resolve();}});baselineServer.on('error',reject);});
const modes=['emoji','tiles','color'], seeds=[42,7,123,2026,99,314159,8675309,271828,654321,123456789];
const rows=[],drawRows=[];let browser;
async function assets(dir,prefix=''){
 const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){
  const name=prefix+e.name;if(e.isDirectory())out.push(...await assets(dir+'/'+e.name,name+'/'));
  else if(/\.(png|svg|webp)$/.test(name))out.push('/'+name);
 }return out;
}
try{
 await new Promise((resolve,reject)=>{let out='';const t=setTimeout(()=>reject(Error('Server timeout')),15000);server.stdout.on('data',d=>{out+=d;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(t);resolve();}});server.on('error',reject);});
 await baselineReady;
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1000}});
 const baseline=await browser.newPage({viewport:{width:1500,height:1000}});
 await baseline.route(/mc\.yandex/,route=>route.abort());
 await page.route(/mc\.yandex/,route=>route.abort());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  let cryptoSeed=12345;Object.defineProperty(crypto,'getRandomValues',{value:array=>{for(let i=0;i<array.length;i++){cryptoSeed=(Math.imul(cryptoSeed,1664525)+1013904223)>>>0;array[i]=cryptoSeed;}return array;}});
  window.__setSeed=seed=>{let s=seed>>>0;window.__randomDraws=0;Math.random=()=>{window.__randomDraws++;s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};window.__setSeed(1);
 });
 await baseline.addInitScript(()=>{
  let cryptoSeed=12345;Object.defineProperty(crypto,'getRandomValues',{value:array=>{for(let i=0;i<array.length;i++){cryptoSeed=(Math.imul(cryptoSeed,1664525)+1013904223)>>>0;array[i]=cryptoSeed;}return array;}});
  window.__setSeed=seed=>{let s=seed>>>0;window.__randomDraws=0;Math.random=()=>{window.__randomDraws++;s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};window.__setSeed(1);
 });
 const paths=await assets('public');
 async function run(mode,seed,warmup=false){
  await page.bringToFront();
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
   let seen=false,endDom,generationEnd,basicOnly=true;const t=setTimeout(()=>{observer.disconnect();reject(Error('Kingdom timed out'));},120000);
   const observer=new MutationObserver(()=>{
    if(select.disabled){seen=true;if(document.querySelector('.forest-canopy-layer, .terrain-overlay, .biome-tile, .poi-marker, .roads-layer line, .rivers-layer line'))basicOnly=false;}
    if(seen&&!select.disabled&&!generationEnd)generationEnd=performance.now();
    if(generationEnd&&document.querySelector('[data-render-phase]')?.getAttribute('data-render-phase')==='ready'){
     endDom=performance.now();observer.disconnect();clearTimeout(t);
     requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({basicOnly,generationMs:generationEnd-start,renderMs:performance.now()-generationEnd,domMs:endDom-start,visibleMs:performance.now()-start,randomDraws:window.__randomDraws,alert:document.querySelector('[role=alert]')?.textContent??null,hexes:document.querySelectorAll('polygon.hex.region,polygon.hex.center').length,svgElements:document.querySelector('[data-biome-display]')?.querySelectorAll('*').length})));
    }
   });
   observer.observe(document.querySelector('.content'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','data-render-phase']});
   const start=performance.now();candidate.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  }),seed);
  const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);
  const save=JSON.parse(await fs.readFile(await download.path(),'utf8'));
  const row={mode,seed,warmup,...result,kingdoms:save.map.kingdoms.length,regions:save.map.regions.length,mapHash:createHash('sha256').update(JSON.stringify(save.map)).digest('hex')};
  
  if(mode==='color'&&!warmup){
   await baseline.bringToFront();
   await baseline.goto('http://127.0.0.1:4179/');
   await baseline.locator('.biome-display-toggle').click();
   await baseline.evaluate(async paths=>{
    window.__cachedImages=[];await Promise.all(paths.map(src=>new Promise(resolve=>{const img=new Image();window.__cachedImages.push(img);img.onload=()=>img.decode().catch(()=>{}).then(resolve);img.onerror=resolve;img.src=src;})));await document.fonts.ready;
    window.__importReady=false;const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){this.addEventListener('loadend',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.__importReady=true)),{once:true});return read.apply(this,args);};
   },paths);
   await baseline.locator('input[type=file]').setInputFiles({name:'benchmark.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
   await baseline.waitForFunction(()=>window.__importReady);
   const oldDrawMs=await baseline.evaluate(()=>new Promise(resolve=>{
    const svg=document.querySelector('[data-biome-display]');const observer=new MutationObserver(()=>{if(svg.getAttribute('data-biome-display')==='color'){observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));}});observer.observe(svg,{attributes:true,attributeFilter:['data-biome-display']});const start=performance.now();document.querySelector('.biome-display-toggle').click();
   }));
   const oldSvg=await baseline.locator('svg[data-biome-display]').evaluate(n=>n.innerHTML);
   const newSvg=await page.locator('svg[data-biome-display]').evaluate(n=>n.innerHTML);
   const domIdentical=oldSvg===newSvg;
   const oldPng=await baseline.locator('svg[data-biome-display]').screenshot({animations:'disabled'});
   await page.bringToFront();
   const newPng=await page.locator('svg[data-biome-display]').screenshot({animations:'disabled'});
   const pngIdentical=oldPng.equals(newPng);
   const draw={seed,baselineMs:oldDrawMs,optimizedMs:row.renderMs,speedup:oldDrawMs/row.renderMs,domIdentical,pngIdentical};drawRows.push(draw);console.log('DRAW_SAMPLE '+JSON.stringify(draw));
   if(!domIdentical||!pngIdentical){await fs.writeFile('reports/draw-baseline-'+seed+'.png',oldPng);await fs.writeFile('reports/draw-optimized-'+seed+'.png',newPng);await fs.writeFile('reports/draw-baseline-'+seed+'.svg',oldSvg);await fs.writeFile('reports/draw-optimized-'+seed+'.svg',newSvg);throw Error('Artwork differs');}
  }

  rows.push(row);console.log('KINGDOM_SAMPLE '+JSON.stringify(row));
  await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/kingdom-benchmark.json',JSON.stringify({rows,drawRows},null,2));
  if(!row.basicOnly||row.alert||row.kingdoms!==1||errors.length)throw Error('Incomplete kingdom '+JSON.stringify({row,errors}));
 }
 for(const mode of modes)await run(mode,777,true);
 if(new Set(rows.map(r=>r.mapHash)).size!==1)throw Error('Warmup maps differ '+JSON.stringify(rows));
 for(let i=0;i<seeds.length;i++){
  for(let j=0;j<3;j++)await run(modes[(i+j)%3],seeds[i]);
  if(new Set(rows.filter(r=>!r.warmup&&r.seed===seeds[i]).map(r=>r.mapHash)).size!==1)throw Error('Paired maps differ for seed '+seeds[i]);
 }
 const samples=rows.filter(r=>!r.warmup),summary={};
 for(const mode of modes){const values=samples.filter(r=>r.mode===mode).map(r=>r.visibleMs).sort((a,b)=>a-b);summary[mode]={n:values.length,meanMs:values.reduce((a,b)=>a+b,0)/values.length,medianMs:(values[4]+values[5])/2,minMs:values[0],maxMs:values.at(-1),stdMs:Math.sqrt(values.reduce((n,v)=>n+(v-values.reduce((a,b)=>a+b,0)/values.length)**2,0)/(values.length-1)),meanGenerationMs:samples.filter(r=>r.mode===mode).reduce((n,r)=>n+r.generationMs,0)/values.length,meanRenderMs:samples.filter(r=>r.mode===mode).reduce((n,r)=>n+r.renderMs,0)/values.length,meanDomMs:samples.filter(r=>r.mode===mode).reduce((n,r)=>n+r.domMs,0)/values.length};}
 const identicalMaps=seeds.every(seed=>new Set(samples.filter(r=>r.seed===seed).map(r=>r.mapHash)).size===1);
 const drawSummary={n:drawRows.length,baselineMs:drawRows.reduce((n,r)=>n+r.baselineMs,0)/drawRows.length,optimizedMs:drawRows.reduce((n,r)=>n+r.optimizedMs,0)/drawRows.length,allDomIdentical:drawRows.every(r=>r.domIdentical),allPngIdentical:drawRows.every(r=>r.pngIdentical)};
 const report={drawSummary,drawRows,version:process.env.BENCH_BASE_SHA,environment:{platform:os.platform(),cpu:os.cpus()[0]?.model,vcpus:os.cpus().length,browser:browser.version(),viewport:{width:1500,height:1000},headless:true},method:'Empty map; Mythic Bastionland kingdom 12x12; SVG POI unchanged; all image assets and fonts preloaded; crypto seed fixed and analytics blocked; tutorial hint RNG disabled only in benchmark builds; one excluded warmup per mode; ten paired deterministic random seeds; rotated mode order; browser clock from click handler dispatch to completion DOM commit plus two animation frames. No CPU throttling.',identicalMaps,summary,rows};
 await fs.writeFile('reports/kingdom-benchmark.json',JSON.stringify(report,null,2));console.log('KINGDOM_REPORT '+JSON.stringify(report));
 if(!identicalMaps)throw Error('Mode changed generated map; paired comparison invalid');
}finally{if(browser)await browser.close();server.kill();baselineServer.kill();}
