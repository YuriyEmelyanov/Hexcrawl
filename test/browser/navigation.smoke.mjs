import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=fileURLToPath(new URL('../../',import.meta.url));
const servers=[];
async function serve(port,outDir='dist'){
 const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',outDir],{cwd:root,stdio:['ignore','pipe','inherit']});servers.push(server);
 await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error('Preview timeout')),15000);server.stdout.on('data',d=>{out+=d;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);});
}
let browser;
try{
 await serve(4180);
 if(process.env.NAV_BASELINE)await serve(4181,process.env.NAV_BASELINE);
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const save=JSON.parse(await fs.readFile(new URL('../fixtures/terrain-display-map.json',import.meta.url),'utf8'));
 const hexes=[];for(let q=0;q<20;q++)for(let r=0;r<20;r++)hexes.push({q,r});
 save.map.kingdoms=[];save.map.obstacles=[];save.map.rivers=[];save.map.roads=[];save.map.crossings=[];save.map.terrainByHexKey={};save.map.waterPoiByHexKey={};save.map.biomeOverrideByHexKey={};save.map.candidateHexes=[];
 save.map.regions=[{...save.map.regions[0],id:1,hexes,centerHex:{q:10,r:10},anchorHex:{q:10,r:10},biomeId:'plain_deciduous_forest',pointsOfInterest:[{q:8,r:8}],pointOfInterestKinds:{'8,8':'ruins'}}];
 for(const h of hexes)if(h.q%4===0)save.map.biomeOverrideByHexKey[`${h.q},${h.r}`]='deciduous_woodland';
 save.ui={...save.ui,mapScale:1.5,isMapRotated:false,selectedHex:null};
 const errors=[];
 async function setup(port){
  const page=await browser.newPage({viewport:{width:1500,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.locator('input[type=file]').setInputFiles({name:'navigation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
  const toggle=page.locator('.biome-display-toggle');while(await toggle.getAttribute('data-mode')!=='color')await toggle.click();
  await page.locator('.forest-canopy-layer').waitFor({state:'attached'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});return page;
 }
 async function exercise(page,optimized){
  await page.bringToFront();
  return page.evaluate(async optimized=>{
   const viewport=document.querySelector('.map-viewport'),svg=viewport.querySelector('svg');
   const before=svg.innerHTML,width=svg.style.width,height=svg.style.height;
   viewport.scrollLeft=400;viewport.scrollTop=300;
   const rect=viewport.getBoundingClientRect(),x=rect.left+viewport.clientWidth*.6,y=rect.top+viewport.clientHeight*.6;
   const initial=svg.getBoundingClientRect(),point={x:(x-initial.left)/initial.width,y:(y-initial.top)/initial.height};
   const times=[],handlers=[];let last=performance.now();
   const next=()=>new Promise(r=>requestAnimationFrame(t=>{times.push(t-last);last=t;r();}));
   for(let i=0;i<60;i++){
    const t=performance.now();for(let j=0;j<4;j++)viewport.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:i<30?-2:2,clientX:x,clientY:y}));handlers.push(performance.now()-t);await next();
   }
   await next();
   const final=svg.getBoundingClientRect();
   const focalError=Math.hypot(final.left+point.x*final.width-x,final.top+point.y*final.height-y);
   const geometryUnchanged=before===svg.innerHTML;
   const dimensionsUnchanged=width===svg.style.width&&height===svg.style.height;
   const originalScroll=viewport.scrollLeft;
   viewport.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0,buttons:1,clientX:x,clientY:y}));
   for(let i=1;i<=30;i++){viewport.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,cancelable:true,buttons:1,clientX:x-i*3,clientY:y}));await next();}
   viewport.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,button:0}));await next();
   const panDistance=viewport.scrollLeft-originalScroll;
   times.sort((a,b)=>a-b);handlers.sort((a,b)=>a-b);
   return {optimized,geometryUnchanged,dimensionsUnchanged,focalError,panDistance,frames:times.length,frameMedianMs:times[Math.floor(times.length*.5)],frameP95Ms:times[Math.floor(times.length*.95)],framesOver50ms:times.filter(t=>t>50).length,handlerMedianMs:handlers[Math.floor(handlers.length*.5)],handlerP95Ms:handlers[Math.floor(handlers.length*.95)]};
  },optimized);
 }
 const page=await setup(4180);
 const result=await exercise(page,true);
 assert.ok(result.geometryUnchanged,'Navigation must not mutate map artwork');assert.ok(result.dimensionsUnchanged,'Zoom must not resize/reconcile the SVG artwork');assert.ok(result.focalError<6,JSON.stringify(result));assert.ok(Math.abs(result.panDistance-90)<2,JSON.stringify(result));
 // A burst accumulates zoom but applies it once on the next frame.
 const burst=await page.evaluate(async()=>{
  const v=document.querySelector('.map-viewport'),s=v.querySelector('svg'),r=v.getBoundingClientRect();let changes=0;
  const observer=new MutationObserver(rs=>changes+=rs.filter(x=>x.target===s&&x.attributeName==='style').length);observer.observe(s,{attributes:true});
  for(let i=0;i<20;i++)v.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:-1,clientX:r.left+200,clientY:r.top+200}));
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));observer.disconnect();return {changes,scale:Number(s.style.transform.match(/scale\(([^)]+)\)/)[1])};
 });assert.equal(burst.changes,1,'One SVG transform update per frame');assert.ok(burst.scale>1.5);
 await page.locator('.rotate-map-button').click();assert.ok(await page.locator('.map-stage > svg').evaluate(s=>parseFloat(s.style.width)===s.viewBox.baseVal.width));
 const menu=page.locator('details.export-menu');await menu.locator('summary').click();
 const [jsonDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);const exported=JSON.parse(await fs.readFile(await jsonDownload.path(),'utf8'));assert.ok(Math.abs(exported.ui.mapScale-burst.scale)<.0001,'Export stores live navigation scale');
 const [pngDownload]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'PNG',exact:true}).click()]);const png=await fs.readFile(await pngDownload.path());assert.ok(png.length>10000,'PNG still exports after zoom and rotation');
 // Compositor caching ends after input, preserving sharp vectors at rest.
 await page.waitForFunction(()=>!document.querySelector('.map-viewport').classList.contains('is-navigating'));
 assert.equal(await page.locator('.map-stage > svg').evaluate(s=>getComputedStyle(s).willChange),'auto');
 let baseline;
 if(process.env.NAV_BASELINE){const old=await setup(4181);baseline=await exercise(old,false);await old.locator('.rotate-map-button').click();await old.locator('details.export-menu summary').click();const [oldDownload]=await Promise.all([old.waitForEvent('download'),old.getByRole('button',{name:'PNG',exact:true}).click()]);assert.ok(png.equals(await fs.readFile(await oldDownload.path())),'Navigation preserves byte-identical full PNG output');await old.close();}
 assert.deepEqual(errors,[]);
 console.log('NAVIGATION_REPORT '+JSON.stringify({environment:{browser:browser.version(),viewport:'1500x1000',headless:true,cpuThrottling:false},map:{hexes:400,mode:'color',description:'Dense forest with woodland clearings'},optimized:result,baseline}));
 console.log('Navigation: batched wheel zoom, unchanged SVG artwork, focal point, drag, rotation, live JSON scale and PNG export passed.');
}finally{if(browser)await browser.close();for(const server of servers)server.kill();}
