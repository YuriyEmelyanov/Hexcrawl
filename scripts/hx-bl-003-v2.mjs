import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {BrowserSupervisor, PackageAbort, validateResourceClass} from './hx-bl-003-v2-supervision.mjs';
const root=new URL('../',import.meta.url).pathname, out=root+'reports/HX-BL-003/v2/';
const A='103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b', B='739e3de36587533bf3d2f3196072270f4695fa8a';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const navInputs=['mythic-0-N1200.json','mythic-0-N2400.json'];
const pngInputs=['mythic-0-N2400-after.json','mythic-123456789-N2400-after.json'];
const inputHashes=['b27af520a75a54e893936e96b0cb24adc90aa1fc06eaec60e28e94408ba7f9a0','90ad8db4f1eda2631ecd96dc130d750b2b6d5c0f736cbe08d3159a9f59175e2a'];
const pngHashes=['d379e39077c9468fc16ffff15027657ca8073010dd8b011f88b6876cf2378391','280d98bc93c053827143e36c6597781346a8edb32ac21c30733f430225ba3171'];
const navPlan=navInputs.flatMap(input=>['warmup',0,1,2,3,4].flatMap(i=>(i==='warmup'||i%2===0?['A','B']:['B','A']).map(variant=>({input,iteration:i,variant,status:'not_executed'}))));
const pngPlan=pngInputs.flatMap(input=>['A','B'].map(variant=>({input,variant,status:'not_executed',attempted:false,events:[]})));
const result={protocol:'P1-V2/addendum1.0',baseline_sha:A,candidate_sha:B,harness_sha:process.env.GITHUB_SHA,environment_commit:git('rev-parse','HEAD'),run_id:process.env.GITHUB_RUN_ID??null,run_attempt:process.env.GITHUB_RUN_ATTEMPT??null,nav:navPlan,png:pngPlan,errors:[],measurement_started:false};
await fs.mkdir(out,{recursive:true});
async function persist(){await fs.writeFile(out+'raw.json',JSON.stringify(result,null,2)+'\n');}
await persist();
const supervisor=new BrowserSupervisor({record:async event=>{(result.browser_lifecycle??=[]).push({...event,wall:new Date().toISOString()});await persist();}});
const bounded=(work,label,ms)=>supervisor.run(work,label,ms);
const semantic=d=>{d=structuredClone(d);delete d.savedAt;return d;};
async function imagePaths(dir,prefix=''){const paths=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isDirectory())paths.push(...await imagePaths(dir+'/'+e.name,prefix+e.name+'/'));else if(/\.(png|svg|webp)$/.test(e.name))paths.push('/'+prefix+e.name);}return paths;}
const preloadPaths=await imagePaths(root+'public');
let browser;const servers=[];
async function createPage(b,variant,row,diagnostics=false){
 const context=await b.newContext({viewport:{width:1500,height:1000},deviceScaleFactor:1,locale:'ru-RU'}),page=await context.newPage();page.setDefaultTimeout(180000);
 const events=[];if(row)row.events=events;const event=(type,data={})=>events.push({type,wall:new Date().toISOString(),monotonic:performance.now(),...data});
 page.on('pageerror',e=>event('pageerror',{message:e.message}));page.on('dialog',async d=>{event('dialog',{message:d.message()});await d.dismiss();});
 page.on('requestfailed',r=>event('requestfailed',{url:r.url(),error:r.failure()?.errorText,analytics:/mc\.yandex/.test(r.url())}));
 if(diagnostics){page.on('request',r=>event('request',{url:r.url(),resource:r.resourceType()}));page.on('requestfinished',r=>event('requestfinished',{url:r.url()}));page.on('response',r=>event('response',{url:r.url(),status:r.status()}));page.on('console',m=>{const t=m.text();if(t.startsWith('HX003_DIAG ')){try{events.push(JSON.parse(t.slice(11)));}catch{event('diagnostic_parse_error');}}else event('console',{level:m.type(),text:t});});page.on('close',()=>event('page_close'));page.on('crash',()=>event('page_crash'));}
 await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){window.__HX003_IMPORT=false;this.addEventListener('loadend',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.__HX003_IMPORT=true)),{once:true});return read.apply(this,args);};});
 if(diagnostics)await page.addInitScript({path:root+'scripts/hx-bl-003-v2-probes.js'});
 const port=variant==='A'?4185:4186;await bounded(()=>page.goto('http://127.0.0.1:'+port+'/'),'page load');event('page_loaded');
 async function ready(){await page.waitForFunction(()=>document.querySelector('.map-stage > svg')?.getAttribute('data-render-phase')==='ready'&&!document.querySelector('.controls--transfer > button')?.disabled);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 async function assets(){await page.evaluate(async()=>{await document.fonts.ready;const urls=[...new Set([...document.querySelectorAll('.map-stage > svg image')].map(n=>n.getAttribute('href')??n.getAttribute('xlink:href')).filter(Boolean))];for(let i=0;i<urls.length;i+=12)await Promise.all(urls.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('asset '+src));img.src=src;})));});}
 async function menu(){const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();}
 async function snapshot(){await menu();const [d]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);return JSON.parse(await fs.readFile(await d.path(),'utf8'));}
 async function restore(path){const start=Date.now();event('import_start',{path});await page.evaluate(()=>window.__HX003_IMPORT=false);await page.locator('input[type=file]').setInputFiles(path);await page.waitForFunction(()=>window.__HX003_IMPORT===true);await ready();event('artwork_ready');const toggle=page.locator('.biome-display-toggle');for(let j=0;await toggle.getAttribute('data-mode')!=='color';j++){assert(j<3);await toggle.click();}await ready();await assets();event('assets_fonts_ready');const original=JSON.parse(await fs.readFile(path,'utf8'));assert.equal(original.ui.mapScale,1.5);assert.equal(original.ui.isMapRotated,false);assert.deepEqual(semantic(await snapshot()),semantic(original));return{import_and_settle_ms:Date.now()-start,json_equal:true};}
 return{page,context,events,event,restore,menu};
}
async function nav(page){return page.evaluate(async()=>{
 const v=document.querySelector('.map-viewport'),sleep=ms=>new Promise(r=>setTimeout(r,ms));v.scrollLeft=500;v.scrollTop=300;await sleep(700);
 const b=v.getBoundingClientRect(),x=b.x+b.width*.5,y=b.y+b.height*.5,samples={zoom:[],pan:[],zoom_timestamps:[],pan_timestamps:[],marks:{}};let last;
 const frame=async(phase)=>{const t=await new Promise(r=>requestAnimationFrame(r));if(phase){samples[phase].push(t-last);samples[phase+'_timestamps'].push(t);}last=t;};
 await frame();samples.marks.zoom_start=performance.now();samples.zoom_initial_timestamp=last;
 for(let i=0;i<24;i++){v.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:i<12?-12:12,clientX:x,clientY:y}));await frame('zoom');}
 samples.marks.zoom_end=performance.now();await sleep(220);await frame();samples.pan_initial_timestamp=last;samples.marks.pan_start=performance.now();v.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,buttons:1,button:0,clientX:x,clientY:y}));
 for(let i=1;i<=24;i++){v.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,cancelable:true,buttons:1,clientX:x+i*4,clientY:y+i*2}));await frame('pan');}
 v.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true,button:0,clientX:x+96,clientY:y+48}));samples.marks.pan_end=performance.now();await sleep(220);return{...samples,buffer:document.querySelector('.map-motion-buffer')?.dataset.cache??null,heap:performance.memory?.usedJSHeapSize??null};
});}
try{
 const env=JSON.parse(await fs.readFile(out+'environment.json','utf8'));result.environment=env;assert.equal(env.run_attempt,'1','single workflow attempt only');
 validateResourceClass(env); // Actual CPU remains recorded; A/B share the one locally owned browser/host.
 assert.equal(hash(await fs.readFile(root+'package-lock.json')),'6b7a348067a218afce320ca370bee8cd323eff14fbdf9a24fbbfc5e3deedcee7');
 for(const [i,input]of navInputs.entries())assert.equal(hash(await fs.readFile(root+'reports/HX-BL-003/corpus/'+input)),inputHashes[i]);
 for(const [i,input]of pngInputs.entries())assert.equal(hash(await fs.readFile(root+'reports/HX-BL-003/baseline-outputs/'+input)),pngHashes[i]);
 for(const[name,port]of[['baseline',4185],['candidate',4186]]){const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir','/tmp/hx003-pair-'+name+'/dist'],{cwd:root,stdio:['ignore','pipe','inherit']});servers.push(server);await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('server timeout')),15000);server.stdout.on('data',b=>{if(String(b).includes('http://127.0.0.1')){clearTimeout(t);resolve();}});server.on('error',reject);});}
 browser=await supervisor.start(chromium);assert.equal(browser.version(),env.chromium_version);
 result.measurement_started=true;await persist();
 for(const input of navInputs){const runners={};try{
  for(const variant of['A','B']){const runner=await bounded(()=>createPage(browser,variant),'navigation context preparation');runners[variant]=runner;await bounded(()=>runner.page.evaluate(async paths=>{window.__HX003_IMAGES=[];for(let i=0;i<paths.length;i+=12)await Promise.all(paths.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();window.__HX003_IMAGES.push(img);img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('preload '+src));img.src=src;})));await document.fonts.ready;},preloadPaths),'preload');}
  for(const row of navPlan.filter(r=>r.input===input)){const r=runners[row.variant];const first=r.events.length;row.status='preparing';row.started_at=new Date().toISOString();await persist();try{row.before=await bounded(()=>r.restore(root+'reports/HX-BL-003/corpus/'+input),'restore');row.navigation=await bounded(()=>nav(r.page),'navigation');for(const phase of['zoom','pan'])assert(row.navigation[phase].length===24&&row.navigation[phase].every(Number.isFinite));assert(!r.events.slice(first).some(e=>e.type==='pageerror'||e.type==='dialog'),'JS error');row.status='success';}catch(e){row.error=String(e);row.status=/timeout/i.test(String(e))?'timeout':'error';throw e;}finally{row.events=r.events.slice(first);row.completed_at=new Date().toISOString();await persist();console.log('V2_NAV '+JSON.stringify({input,variant:row.variant,iteration:row.iteration,status:row.status}));}}
 }catch(e){result.errors.push({input,error:String(e)});throw e;}finally{if(!supervisor.aborted)for(const r of Object.values(runners))await bounded(()=>r.context.close(),'context cleanup',5000);}}
 await supervisor.dispose({reason:'navigation complete'});browser=null;
 for(const row of pngPlan){let b,r;row.status='preparing';row.started_at=new Date().toISOString();await persist();try{
  b=await supervisor.start(chromium);b.on('disconnected',()=>r?.event('browser_disconnected'));assert.equal(b.version(),env.chromium_version);r=await bounded(()=>createPage(b,row.variant,row,true),'PNG context preparation');row.events=r.events;await bounded(()=>r.restore(root+'reports/HX-BL-003/baseline-outputs/'+row.input),'PNG restore');await bounded(()=>r.menu(),'PNG menu preparation');const stem=out+row.variant+'-'+row.input.replace(/\.json$/,'');await fs.writeFile(stem+'.svg',await bounded(()=>r.page.locator('.map-stage > svg').evaluate(n=>n.outerHTML),'SVG snapshot'));row.svg=stem+'.svg';row.status='exporting';row.attempted=true;r.event('png_click_start');await persist();
  await bounded(async()=>{const[d]=await Promise.all([r.page.waitForEvent('download'),r.page.getByRole('button',{name:'PNG',exact:true}).click()]);r.event('download_event');await fs.copyFile(await d.path(),stem+'.png');r.event('copy_complete');row.png=stem+'.png';row.png_sha256=hash(await fs.readFile(row.png));row.png_bytes=(await fs.stat(row.png)).size;},'PNG click/download/copy');
  row.status='captured';row.memory=await bounded(()=>r.page.evaluate(()=>performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null),'memory');
 }catch(e){row.status=/timeout/i.test(String(e))?'timeout':'error';row.error=String(e);process.exitCode=1;if(e instanceof PackageAbort)throw e;}finally{try{await supervisor.dispose({reason:'PNG row complete'});}finally{row.completed_at=new Date().toISOString();await persist();console.log('V2_PNG '+JSON.stringify({input:row.input,variant:row.variant,status:row.status,attempted:row.attempted}));}}}
 result.status='collection_complete_not_product_acceptance';
}catch(e){result.status='blocked';result.errors.push({error:String(e)});process.exitCode=1;}
finally{try{await supervisor.dispose({force:supervisor.aborted,reason:'package final cleanup'});}catch(e){result.status='blocked_cleanup_unconfirmed';result.errors.push({error:String(e)});process.exitCode=1;}finally{for(const s of servers)s.kill();result.completed_at=new Date().toISOString();await persist();}}
