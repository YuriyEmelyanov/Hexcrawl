import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
function decodePng(bytes){let offset=8,data=[],w,h,bpp;while(offset<bytes.length){const n=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),b=bytes.subarray(offset+8,offset+8+n);if(type==='IHDR'){w=b.readUInt32BE(0);h=b.readUInt32BE(4);assert.equal(b[8],8);bpp=b[9]===6?4:3;assert.ok([2,6].includes(b[9]));}if(type==='IDAT')data.push(b);offset+=n+12;}const raw=inflateSync(Buffer.concat(data)),pixels=Buffer.alloc(w*h*bpp),stride=w*bpp;let p=0;for(let y=0;y<h;y++){const filter=raw[p++];for(let x=0;x<stride;x++){const a=x>=bpp?pixels[y*stride+x-bpp]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=bpp?pixels[(y-1)*stride+x-bpp]:0;let prediction=0;if(filter===1)prediction=a;if(filter===2)prediction=b;if(filter===3)prediction=Math.floor((a+b)/2);if(filter===4){const z=a+b-c,pa=Math.abs(z-a),pb=Math.abs(z-b),pc=Math.abs(z-c);prediction=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}pixels[y*stride+x]=(raw[p++]+prediction)&255;}}return {w,h,bpp,pixels};}
function pixelDifference(a,b){a=decodePng(a);b=decodePng(b);assert.equal(a.w,b.w);assert.equal(a.h,b.h);let total=0,large=0;for(let i=0;i<a.w*a.h;i++){let delta=0;for(let c=0;c<3;c++)delta+=Math.abs(a.pixels[i*a.bpp+c]-b.pixels[i*b.bpp+c]);total+=delta;if(delta>90)large++;}return {meanChannelDifference:total/(a.w*a.h*3),changedPixelFraction:large/(a.w*a.h)};}
const root=fileURLToPath(new URL('../',import.meta.url));
const servers=[];let browser;
async function serve(port,dir){const p=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dir],{cwd:root,stdio:['ignore','pipe','inherit']});servers.push(p);await new Promise((resolve,reject)=>{let out='';const t=setTimeout(()=>reject(Error('Server timeout')),15000);p.stdout.on('data',d=>{out+=d;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(t);resolve();}});p.on('error',reject);});}
function fixture(base,count){
 const s=structuredClone(base);s.map.kingdoms=[];s.map.regions=[];s.map.rivers=[];s.map.roads=[];s.map.crossings=[];s.map.obstacles=[];s.map.waterPoiByHexKey={};s.map.terrainByHexKey={};s.map.biomeOverrideByHexKey={};s.map.candidateHexes=[];
 const columns=Math.ceil(Math.sqrt(count));
 for(let k=0;k<count;k++){
  const q0=k%columns*20,r0=Math.floor(k/columns)*20,ids=[];
  for(let i=0;i<4;i++){
   const id=k*4+i+1,hexes=[];for(let q=q0+i*5;q<q0+(i+1)*5;q++)for(let r=r0;r<r0+20;r++){hexes.push({q,r});if((q+r)%4===0)s.map.biomeOverrideByHexKey[`${q},${r}`]='deciduous_woodland';}
   s.map.regions.push({...base.map.regions[0],id,kingdomId:k+1,generationMode:'mythic',hexes,centerHex:{q:q0+i*5+2,r:r0+10},anchorHex:{q:q0+i*5+2,r:r0+10},biomeId:'plain_deciduous_forest',woodlandStyle:undefined,suppressCentralPoi:false,centralPoiKind:i===0?'throne':'dwelling',pointsOfInterest:[],pointOfInterestKinds:{}});ids.push(id);
  }
  s.map.kingdoms.push({id:k+1,origin:{q:q0,r:r0},anchor:{q:q0,r:r0},regionIds:ids,name:{ru:`Королевство ${k+1}`,en:`Kingdom ${k+1}`,kind:'region',model:'germanic',revision:0},color:`hsl(${k*60} 65% 68%)`});
 }
 s.ui={...base.ui,generationMode:'mythic',mapScale:1.5,isMapRotated:false,selectedHex:null};return s;
}
try{
 await serve(4182,'dist');if(process.env.LARGE_BASELINE)await serve(4183,process.env.LARGE_BASELINE);
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const base=JSON.parse(await fs.readFile(root+'test/fixtures/terrain-display-map.json','utf8')),rows=[],artworks=new Map(),pngs=new Map();
 const configs=process.env.LARGE_BASELINE?[{label:'baseline',port:4183},{label:'optimized',port:4182}]:[{label:process.env.LARGE_VALIDATE?'optimized':'current',port:4182}];
 for(const count of process.env.LARGE_VALIDATE?[3]:[1,3,6])for(const config of configs){
  const p=await browser.newPage({viewport:{width:1500,height:1000}});await p.route(/mc\.yandex/,r=>r.abort());const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',async d=>{errors.push(d.message());await d.dismiss();});
  await p.goto(`http://127.0.0.1:${config.port}/`);await p.locator('input[type=file]').setInputFiles({name:'large-map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture(base,count)))});try{await p.waitForFunction(n=>document.querySelectorAll('polygon.hex.region[data-hex-key],polygon.hex.center[data-hex-key]').length===n,count*400);}catch(e){throw Error('Import failed: '+JSON.stringify(errors)+' '+await p.locator('.map-viewport').innerText());}
  const toggle=p.locator('.biome-display-toggle');while(await toggle.getAttribute('data-mode')!=='color')await toggle.click();await p.locator('.forest-canopy-layer').first().waitFor({state:'attached'});await p.waitForTimeout(500);
  const artwork=await p.locator('.map-stage > svg').evaluate(s=>s.innerHTML);
  if(config.label==='baseline')artworks.set(count,artwork);else if(artworks.has(count))assert.equal(artwork,artworks.get(count),'Vector artwork is identical');
  if(config.label==='optimized'&&count>1){
   await p.waitForFunction(()=>document.querySelector('.map-motion-buffer')?.dataset.cache==='ready',{},{timeout:30000});
   await p.evaluate(()=>{const v=document.querySelector('.map-viewport');v.scrollLeft+=20;});
   await p.waitForFunction(()=>document.querySelector('.map-viewport').classList.contains('has-motion-buffer'));
   assert.equal(await p.locator('.map-stage > svg').evaluate(s=>getComputedStyle(s).opacity),'0','Native scrolling uses the buffer');
   await p.waitForFunction(()=>!document.querySelector('.map-viewport').classList.contains('is-navigating'));
   assert.equal(await p.locator('.map-stage > svg').evaluate(s=>getComputedStyle(s).opacity),'1','Sharp SVG returns at rest');
   const vector=await p.locator('.map-viewport').screenshot();
   await p.evaluate(()=>document.querySelector('.map-viewport').classList.add('is-navigating'));
   await p.waitForFunction(()=>document.querySelector('.map-viewport').classList.contains('has-motion-buffer'));
   const buffered=await p.locator('.map-viewport').screenshot();const difference=pixelDifference(vector,buffered);console.log('MOTION_BUFFER_PIXELS '+JSON.stringify({hexes:count*400,...difference}));assert.ok(difference.meanChannelDifference<4&&difference.changedPixelFraction<.025,'Motion buffer must preserve artwork');
   await p.evaluate(()=>document.querySelector('.map-viewport').classList.remove('is-navigating'));
  }
  const cdp=await p.context().newCDPSession(p);await cdp.send('Performance.enable');
  for(const ablation of process.env.LARGE_BASELINE||process.env.LARGE_VALIDATE?['normal']:['normal','no-effects']){
   await p.bringToFront();const before=(await cdp.send('Performance.getMetrics')).metrics;
   const timing=await p.evaluate(async ablation=>{
    let style;if(ablation==='no-effects'){style=document.createElement('style');style.textContent='.map-stage svg [filter]{filter:none!important}.map-stage svg [mask]{mask:none!important}';document.head.append(style);}
    const v=document.querySelector('.map-viewport'),svg=v.querySelector('svg'),rect=v.getBoundingClientRect(),x=rect.left+v.clientWidth*.55,y=rect.top+v.clientHeight*.55;
    v.scrollLeft=500;v.scrollTop=300;await new Promise(r=>setTimeout(r,700));
    const artwork=svg.innerHTML;let bufferFrames=0;
    const samples={zoom:[],pan:[],selection:[]};let last=performance.now();
    const frame=async list=>{await new Promise(r=>requestAnimationFrame(t=>{list.push(t-last);last=t;if(v.classList.contains('has-motion-buffer'))bufferFrames++;r();}));};
    for(let i=0;i<24;i++){v.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:i<12?-12:12,clientX:x,clientY:y}));await frame(samples.zoom);}
    await new Promise(r=>setTimeout(r,220));last=performance.now();
    v.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,button:0,buttons:1,clientX:x,clientY:y}));
    for(let i=1;i<=24;i++){v.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,cancelable:true,buttons:1,clientX:x-i*4,clientY:y-i*2}));await frame(samples.pan);}v.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    for(let i=0;i<4;i++){
     const hex=[...svg.querySelectorAll('polygon.hex.region[data-hex-key]')].filter(n=>{const b=n.getBoundingClientRect();return b.left>rect.left&&b.right<rect.right&&b.top>rect.top&&b.bottom<rect.bottom;})[i];
     if(!hex)throw Error('No visible hex for selection');const start=performance.now();hex.dispatchEvent(new MouseEvent('click',{bubbles:true}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));samples.selection.push(performance.now()-start);
    }
    style?.remove();const stats=a=>{a.sort((a,b)=>a-b);return{medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.floor(a.length*.95)],over50:a.filter(x=>x>50).length,n:a.length};};
    return{zoom:stats(samples.zoom),pan:stats(samples.pan),selection:stats(samples.selection),bufferFrames,artworkUnchanged:artwork===svg.innerHTML,svgNodes:svg.querySelectorAll('*').length,svgWidth:svg.viewBox.baseVal.width,svgHeight:svg.viewBox.baseVal.height};
   },ablation);
   const after=(await cdp.send('Performance.getMetrics')).metrics;const m=Object.fromEntries(after.map(x=>[x.name,x.value])),b=Object.fromEntries(before.map(x=>[x.name,x.value]));const row={version:config.label,kingdoms:count,hexes:count*400,ablation,...timing,jsHeapMB:m.JSHeapUsedSize/1048576,taskSeconds:m.TaskDuration-b.TaskDuration,layoutCount:m.LayoutCount-b.LayoutCount};assert.ok(row.artworkUnchanged,'Selection does not change artwork');if(config.label==='optimized'&&count>1)assert.ok(row.bufferFrames>30,'Buffer is active during navigation');rows.push(row);console.log('LARGE_MAP_SAMPLE '+JSON.stringify(row));
  }
  if(count<=3&&process.env.LARGE_BASELINE){if(config.label==='optimized'&&count>1){await p.waitForFunction(()=>document.querySelector('.map-motion-buffer')?.dataset.cache==='ready');await p.evaluate(()=>document.querySelector('.map-viewport').classList.add('is-navigating'));await p.waitForFunction(()=>document.querySelector('.map-viewport').classList.contains('has-motion-buffer'));}await p.locator('details.export-menu summary').click();const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'PNG',exact:true}).click()]);const hash=createHash('sha256').update(await fs.readFile(await download.path())).digest('hex');if(config.label==='baseline')pngs.set(count,hash);else assert.equal(hash,pngs.get(count),'Full PNG output is unchanged');await p.evaluate(()=>document.querySelector('.map-viewport').classList.remove('is-navigating'));}
  if(config.label==='optimized'&&count>1){await p.locator('.rotate-map-button').click();await p.waitForFunction(()=>document.querySelector('.map-motion-buffer')?.dataset.cache==='ready');const vector=await p.locator('.map-viewport').screenshot();await p.evaluate(()=>document.querySelector('.map-viewport').classList.add('is-navigating'));await p.waitForFunction(()=>document.querySelector('.map-viewport').classList.contains('has-motion-buffer'));const difference=pixelDifference(vector,await p.locator('.map-viewport').screenshot());console.log('ROTATED_BUFFER_PIXELS '+JSON.stringify({hexes:count*400,...difference}));assert.ok(difference.meanChannelDifference<4&&difference.changedPixelFraction<.025,'Rotation preserves buffer artwork');await p.evaluate(()=>document.querySelector('.map-viewport').classList.remove('is-navigating'));await p.locator('.biome-display-toggle').click();await p.waitForFunction(()=>document.querySelector('.map-motion-buffer')?.dataset.cache==='off');assert.equal(await p.locator('.map-viewport').evaluate(v=>v.classList.contains('has-motion-buffer')),false);}
  assert.deepEqual(errors,[]);await p.close();
 }
 await fs.mkdir(root+'reports',{recursive:true});await fs.writeFile(root+'reports/large-map-profile.json',JSON.stringify({browser:browser.version(),viewport:'1500x1000',headless:true,rows},null,2));console.log('LARGE_MAP_REPORT '+JSON.stringify({browser:browser.version(),rows}));
}finally{if(browser)await browser.close();for(const s of servers)s.kill();}
