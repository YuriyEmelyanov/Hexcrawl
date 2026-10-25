import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {stripVTControlCharacters} from 'node:util';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=new URL('../',import.meta.url).pathname,input=root+'reports/HX-BL-003/corpus/',out=root+'reports/HX-BL-003/timing/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await fs.readFile(input+'manifest.json','utf8'));
const env=JSON.parse(await fs.readFile(root+'reports/HX-BL-003/timing-environment.json','utf8'));
assert.equal(manifest.baseline_sha,'103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b');
for(const f of manifest.files)assert.equal(sha(await fs.readFile(input+f.path)),f.sha256);
const profiled=process.env.P1_TRACE==='1';
async function imagePaths(dir,prefix=''){const paths=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isDirectory())paths.push(...await imagePaths(dir+'/'+e.name,prefix+e.name+'/'));else if(/\.(png|svg|webp)$/.test(e.name))paths.push('/'+prefix+e.name);}return paths;}
const preloadPaths=await imagePaths(root+'public');
const rows=[],errors=[];
const outputFolder=profiled?'profiled':'ordinary';
await fs.mkdir(out+outputFolder,{recursive:true});
async function persist(){await fs.writeFile(out+outputFolder+'/raw.json',JSON.stringify({protocol:'P1/spec1.0',phase:profiled?'separate_profiling_not_latency_evidence':'baseline_only_no_optimization',environment:env,rows,errors},null,2)+'\n');}
async function bounded(p,label){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('external180s timeout '+label)),180000);})]);}finally{clearTimeout(timer);}}
function semantic(d){d=structuredClone(d);delete d.savedAt;return d;}
function stable(d){if(Array.isArray(d))return d.map(stable);if(d&&typeof d==='object')return Object.fromEntries(Object.keys(d).sort().map(k=>[k,stable(d[k])]));return d;}
const docHash=d=>sha(JSON.stringify(stable(semantic(d))));
const N=d=>new Set([...d.map.regions.flatMap(r=>r.hexes.map(h=>`${h.q},${h.r}`)),...Object.keys(d.map.terrainByHexKey??{})]).size;
const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4185','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),15000);server.stdout.on('data',b=>{output+=b;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});assert.equal(browser.version(),env.chromium_version);
 const cps=manifest.cases.flatMap(c=>c.checkpoints.map(cp=>({c,cp}))).filter(({cp})=>!profiled||['mythic-0-N400.json','mythic-0-N2400.json'].includes(cp.path));
 for(const {c,cp} of cps){
  const context=await browser.newContext({viewport:{width:1500,height:1000},deviceScaleFactor:1,locale:'ru-RU'});
  const page=await context.newPage();page.setDefaultTimeout(180000);
  await page.route(/mc\.yandex/,r=>r.abort());
  await page.addInitScript(()=>{
   const read=FileReader.prototype.readAsText;
   FileReader.prototype.readAsText=function(...args){window.__HX003_IMPORT=false;this.addEventListener('loadend',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.__HX003_IMPORT=true)),{once:true});return read.apply(this,args);};
  });
  const js=[],failed=[];page.on('pageerror',e=>js.push(e.message));page.on('dialog',async d=>{js.push('dialog:'+d.message());await d.dismiss();});
  page.on('requestfailed',r=>{if(!/mc\.yandex/.test(r.url()))failed.push({url:r.url(),error:r.failure()?.errorText});});
  async function ready(){await page.waitForFunction(()=>document.querySelector('.map-stage > svg')?.getAttribute('data-render-phase')==='ready'&&!document.querySelector('.controls--transfer > button')?.disabled);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  async function assets(){return page.evaluate(async()=>{await document.fonts.ready;const urls=[...new Set([...document.querySelectorAll('.map-stage > svg image')].map(n=>n.getAttribute('href')??n.getAttribute('xlink:href')).filter(Boolean))];for(let i=0;i<urls.length;i+=12)await Promise.all(urls.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('asset '+src));img.src=src;})));});}
  async function snapshot(){await ready();const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();const [d]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);return JSON.parse(await fs.readFile(await d.path(),'utf8'));}
  const original=JSON.parse(await fs.readFile(input+cp.path,'utf8'));
  const expectedPath=root+'reports/HX-BL-003/baseline-outputs/'+cp.path.replace(/\.json$/,'-after.json');
  const expected=JSON.parse(await fs.readFile(expectedPath,'utf8'));
  async function restore(){
   await page.evaluate(()=>{window.__HX003_ARMED=false;window.__HX003_IMPORT=false;});
   const start=Date.now();await page.locator('input[type=file]').setInputFiles(input+cp.path);
   await page.waitForFunction(()=>window.__HX003_IMPORT===true);await ready();
   if(c.mode==='classic')for(let i=0;i<c.options.length;i++)await page.locator('.gen-params select').nth(i).selectOption(c.options[i].value);
   const toggle=page.locator('.biome-display-toggle');for(let j=0;await toggle.getAttribute('data-mode')!==(c.mode==='mythic'?'color':'emoji');j++){assert(j<3);await toggle.click();}
   await ready();await bounded(assets(),'input assets');
   const d=await snapshot();assert.deepEqual(semantic(d),semantic(original));return {import_and_settle_ms:Date.now()-start,hash:docHash(d),N:N(d)};
  }
  async function nav(){return bounded(page.evaluate(async()=>{
   const v=document.querySelector('.map-viewport'),sleep=ms=>new Promise(r=>setTimeout(r,ms));v.scrollLeft=500;v.scrollTop=300;await sleep(700);
   const b=v.getBoundingClientRect(),x=b.x+b.width*.5,y=b.y+b.height*.5,samples={zoom:[],pan:[]};let last;
   const frame=async values=>{const t=await new Promise(r=>requestAnimationFrame(r));if(last!==undefined)values.push(t-last);last=t;};
   await frame([]);performance.mark('hx003:zoom-start');
   for(let i=0;i<24;i++){v.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:i<12?-12:12,clientX:x,clientY:y}));await frame(samples.zoom);}
   performance.mark('hx003:zoom-end');await sleep(220);last=undefined;await frame([]);
   performance.mark('hx003:pan-start');v.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,buttons:1,button:0,clientX:x,clientY:y}));
   for(let i=1;i<=24;i++){v.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,cancelable:true,buttons:1,clientX:x+i*4,clientY:y+i*2}));await frame(samples.pan);}
   v.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true,button:0,clientX:x+96,clientY:y+48}));performance.mark('hx003:pan-end');await sleep(220);
   return {...samples,buffer:document.querySelector('.map-motion-buffer')?.dataset.cache??null,heap:performance.memory?.usedJSHeapSize??null};
  }),'navigation');}
  await bounded(page.goto('http://127.0.0.1:4185/'),'load');
  await bounded(page.evaluate(async paths=>{window.__HX003_IMAGES=[];for(let i=0;i<paths.length;i+=12)await Promise.all(paths.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();window.__HX003_IMAGES.push(img);img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('preload '+src));img.src=src;})));await document.fonts.ready;},preloadPaths),'preload all images');
  let unusable=false;
  for(const iteration of (profiled?['warmup',0,1,2,3,4]:['cold','warmup',0,1,2,3,4])){
   const row={input:cp.path,mode:c.mode,seed:c.seed,anchor:cp.anchor,iteration,series:profiled?'profiled_separate_do_not_merge':'ordinary_timing_probes_no_trace',started_at:new Date().toISOString(),errors:[],failed_requests:[],outcome:'preparing'};rows.push(row);await persist();
   let session,traceDone;
   try{
    assert(!unusable,'Context unusable after timeout; run retained as not executed');
    const ji=js.length,fi=failed.length;row.before=await bounded(restore(),'restore');
    assert.equal(original.ui.mapScale,1.5,'P1 source scale');assert.equal(original.ui.isMapRotated,false,'P1 rotation');
    if(profiled&&typeof iteration==='number'){session=await context.newCDPSession(page);traceDone=new Promise(r=>session.once('Tracing.tracingComplete',r));await session.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.cpu_profiler',transferMode:'ReturnAsStream'});}
    await page.evaluate(()=>{for(const n of ['t0','t1','t2','t3'])performance.clearMarks('hx003:'+n);window.__HX003_ARMED=true;});
    await bounded((async()=>{await page.locator(`polygon.hex.candidate[data-hex-key="${cp.anchor.q},${cp.anchor.r}"]`).dispatchEvent('click');await page.waitForFunction(()=>performance.getEntriesByName('hx003:t3').length===1);})(),'expansion');
    row.marks=await page.evaluate(()=>Object.fromEntries(['t0','t1','t2','t3'].map(n=>{const e=performance.getEntriesByName('hx003:'+n);if(e.length!==1)throw Error(n+' count '+e.length);return [n,e[0].startTime];})));
    const {t0,t1,t2,t3}=row.marks;assert(t0<=t1&&t1<=t2&&t2<=t3);row.generation_ms=t1-t0;row.render_ms=t3-t1;row.e2e_ms=t3-t0;
    await page.evaluate(()=>window.__HX003_ARMED=false);const after=await bounded(snapshot(),'output snapshot');row.after={N:N(after),hash:docHash(after),generation:after.generation};
    row.alerts=await page.getByRole('alert').allTextContents();row.outcome=row.after.N>row.before.N?'success':row.alerts.some(s=>s.includes('Не удалось создать регион из-за ошибки'))?'error':row.alerts.length?'expected_rejection':'no_growth';
    await fs.writeFile(out+outputFolder+'/'+cp.path.replace(/\.json$/,'')+'-'+iteration+'-after.json',JSON.stringify(after));assert.deepEqual(semantic(after),semantic(expected));row.baseline_output_equal=true;
    await restore();row.navigation=await nav();
    row.selection=[];const visible=await page.locator('polygon.hex.region,polygon.hex.center').evaluateAll(ns=>ns.filter(n=>{const b=n.getBoundingClientRect();return b.width>0&&b.x>300&&b.y>100&&b.right<innerWidth&&b.bottom<innerHeight;}).slice(0,4).map(n=>n.getAttribute('data-hex-key')));
    for(const key of visible){const start=Date.now();await page.locator(`polygon.hex[data-hex-key="${key}"]`).first().dispatchEvent('click');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));row.selection.push({key,external_ms:Date.now()-start});}
    row.selection_count=visible.length;row.selection_complete=visible.length===4;row.errors=js.slice(ji);row.failed_requests=failed.slice(fi);assert.equal(row.errors.length,0,'Browser errors must not be hidden');
   }catch(e){row.error=String(e);row.outcome=String(e).includes('timeout')?'timeout':'error';if(row.outcome==='timeout'){row.censored_lower_bound_ms=180000;unusable=true;}errors.push({input:cp.path,iteration,error:String(e)});}
   finally{if(session){try{await session.send('Tracing.end');const {stream}=await bounded(traceDone,'trace end');const path=out+outputFolder+'/'+cp.path.replace(/\.json$/,'')+'-'+iteration+'-trace.json';const file=await fs.open(path,'w');try{for(;;){const part=await session.send('IO.read',{handle:stream});await file.write(part.base64Encoded?Buffer.from(part.data,'base64'):part.data);if(part.eof)break;}}finally{await file.close();await session.send('IO.close',{handle:stream});}row.trace=path;await session.detach();}catch(e){row.trace_error=String(e);errors.push({trace_error:String(e)});}}row.completed_at=new Date().toISOString();await persist();console.log('P1_TIMING '+JSON.stringify(row));}
  }
  await context.close();
 }
 const summary=[];
 const stats=values=>{values=values.filter(Number.isFinite).sort((a,b)=>a-b);return values.length?{n:values.length,min:values[0],median:values[Math.floor(values.length/2)],max:values.at(-1),p95:values[Math.ceil(values.length*.95)-1],p95_note:'nearest rank; 5 warm samples -> max'}:null;};
 for(const {cp} of cps){const all=rows.filter(r=>r.input===cp.path),warm=all.filter(r=>typeof r.iteration==='number');summary.push({input:cp.path,cold:all.find(r=>r.iteration==='cold'),warmup:all.find(r=>r.iteration==='warmup'),warm_runs:warm.length,successes:warm.filter(r=>r.outcome==='success').length,timeouts:warm.filter(r=>r.outcome==='timeout').length,generation_ms:stats(warm.map(r=>r.generation_ms)),render_ms:stats(warm.map(r=>r.render_ms)),e2e_ms:stats(warm.map(r=>r.e2e_ms)),navigation_per_run:warm.map(r=>({iteration:r.iteration,zoom:stats(r.navigation?.zoom??[]),pan:stats(r.navigation?.pan??[]),zoom_over50_fraction:r.navigation?.zoom.filter(t=>t>50).length/r.navigation?.zoom.length,pan_over50_fraction:r.navigation?.pan.filter(t=>t>50).length/r.navigation?.pan.length}))});}
 await fs.writeFile(out+outputFolder+'/summary.json',JSON.stringify({status:errors.length?'incomplete_or_errors':'baseline_timing_complete_trace_pending',summary,errors,optimization_started:false},null,2));
 console.log('P1_SUMMARY '+JSON.stringify({cases:summary.length,runs:rows.length,errors:errors.length}));
 if(errors.length)process.exitCode=1;
}catch(e){errors.push({fatal:String(e),stack:e.stack});await persist();process.exitCode=1;}
finally{await browser?.close();server.kill();}
