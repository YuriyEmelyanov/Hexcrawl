import {spawn,execFileSync} from 'node:child_process';import {chromium} from 'playwright';import fs from 'node:fs/promises';import {stripVTControlCharacters} from 'node:util';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4186','--strictPort'],{stdio:['ignore','pipe','inherit']});let browser;
const rows=[],seed=Number(process.env.GROWTH_SEED??42),maximum=Number(process.env.GROWTH_MAX??8);
await fs.mkdir('reports/growth',{recursive:true});
async function persist(){await fs.writeFile(`reports/growth/seed-${seed}.json`,JSON.stringify({seed,maximum,rows},null,2));}
try{
 await new Promise((resolve,reject)=>{let out='';const t=setTimeout(()=>reject(Error('Server timeout')),15000);server.stdout.on('data',d=>{out+=d;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(t);resolve();}});});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const mode of (process.env.GROWTH_MODE?[process.env.GROWTH_MODE]:['emoji','color'])){
  const page=await browser.newPage({viewport:{width:1500,height:1000}});await page.route(/mc\.yandex/,r=>r.abort());const diagnostics=[],errors=[],slow=[];page.on('console',msg=>{const s=msg.text();if(s.startsWith('GROWTH_SLOW '))slow.push(s);if(msg.type()==='error'||msg.type()==='warning')diagnostics.push(s);});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(seed=>{let s=seed>>>0;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};let c=12345;Object.defineProperty(crypto,'getRandomValues',{value:a=>{for(let i=0;i<a.length;i++){c=(Math.imul(c,1664525)+1013904223)>>>0;a[i]=c;}return a;}});window.__growthLong=[];new PerformanceObserver(list=>{for(const e of list.getEntries())window.__growthLong.push({ms:e.duration,start:e.startTime});}).observe({type:'longtask',buffered:true});},seed);
  await page.goto('http://127.0.0.1:4186/');await page.locator('.mode-selector select').selectOption('mythic');while(await page.locator('.biome-display-toggle').getAttribute('data-mode')!==mode)await page.locator('.biome-display-toggle').click();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  for(let k=1;k<=maximum;k++){
   const anchor=await page.evaluate(()=>{const cs=[...document.querySelectorAll('polygon.hex.candidate[data-hex-key]')].map(n=>({n,q:Number(n.dataset.hexKey.split(',')[0]),r:Number(n.dataset.hexKey.split(',')[1])}));const h=cs.sort((a,b)=>b.q-a.q||a.r-b.r)[0];return {q:h.q,r:h.r};});
   const started=Date.now();let peakRssKB=0;
   const monitor=setInterval(()=>{try{const rss=execFileSync('ps',['-eo','rss,args'],{encoding:'utf8'}).split('\n').filter(l=>/chrome|chromium/.test(l)&&!l.includes('ps -eo')).map(l=>Number(l.trim().split(/\s+/)[0]));peakRssKB=Math.max(peakRssKB,rss.reduce((a,b)=>a+b,0));}catch{}},1000);
   const initialDiagnostic=diagnostics.length,initialSlow=slow.length;let result;
   try{
    const operation=page.evaluate(anchor=>new Promise((resolve,reject)=>{
     window.__growthStages={};window.__growthLong=[];const v=document.querySelector('svg[data-render-phase]'),select=document.querySelector('.mode-selector select');const start=performance.now();let seen=false,generationEnd,readyEnd;
     const observer=new MutationObserver(()=>{if(select.disabled)seen=true;if(seen&&!select.disabled&&!generationEnd)generationEnd=performance.now();if(generationEnd&&v.dataset.renderPhase==='ready'){readyEnd=performance.now();observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({generationMs:generationEnd-start,renderMs:performance.now()-generationEnd,totalMs:performance.now()-start,stages:window.__growthStages,longTasks:window.__growthLong,alert:document.querySelector('[role=alert]')?.textContent??null,nodes:v.querySelectorAll('*').length,hexes:v.querySelectorAll('polygon.hex.region[data-hex-key],polygon.hex.center[data-hex-key]').length})));}});
     observer.observe(document.querySelector('.content'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','data-render-phase']});
     const candidate=document.querySelector(`polygon.hex.candidate[data-hex-key="${anchor.q},${anchor.r}"]`);candidate.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    }),anchor);
    result=await Promise.race([operation,new Promise((_,reject)=>{const t=setTimeout(()=>reject(Error('External 180-second deadline')),180000);operation.finally(()=>clearTimeout(t)).catch(()=>{});})]);
   }catch(error){result={failure:error.message,wallMs:Date.now()-started};}finally{clearInterval(monitor);}
   const row={seed,mode,k,anchor,...result,peakChromeRssMB:peakRssKB/1024,slow:slow.slice(initialSlow),diagnostics:diagnostics.slice(initialDiagnostic),errors:[...errors]};rows.push(row);console.log('GROWTH_ROW '+JSON.stringify(row));await persist();if(result.failure)break;
   const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);const save=JSON.parse(await fs.readFile(await download.path(),'utf8'));row.kingdoms=save.map.kingdoms.length;row.regions=save.map.regions.length;await fs.writeFile(`reports/growth/${mode}-${seed}-${k}.json`,JSON.stringify(save));await persist();if(row.kingdoms!==k||result.alert||errors.length)break;
  }
  await page.close({runBeforeUnload:false}).catch(()=>{});
 }
}finally{await persist();if(browser)await Promise.race([browser.close(),new Promise(r=>setTimeout(r,5000))]);server.kill();}
