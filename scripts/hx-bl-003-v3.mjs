import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {BrowserSupervisor,PackageAbort,validateResourceClass} from './hx-bl-003-v2-supervision.mjs';
import {encodeNative,decodeNative,containerManifest,semantic,analyzeNavigation} from './hx-bl-003-v3-core.mjs';

const root=new URL('../',import.meta.url).pathname,out=root+'reports/HX-BL-003/v3/';
const protocol=JSON.parse(await fs.readFile(root+'reports/HX-BL-003/v3-protocol.json','utf8'));
assert.equal(protocol.stage_id,'HX-BL-003-V3');
assert.equal(protocol.source.baseline_sha,'103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b');
assert.equal(protocol.source.candidate_sha,'739e3de36587533bf3d2f3196072270f4695fa8a');
assert.deepEqual([protocol.caps.measured_nav_actions,protocol.caps.warmup_nav_actions,protocol.caps.trace_only_nav_actions,protocol.caps.history_sequences,protocol.caps.workflow_attempts,protocol.caps.job_minutes],[20,2,2,4,1,45]);
assert.deepEqual(protocol.order.measured_pair_order,['AB','BA','AB','BA','AB','BA','AB','BA','AB','BA']);
const nav=[...['A','B'].map(variant=>({kind:'warmup',variant,position:variant==='A'?1:2})),...protocol.order.measured_pair_order.flatMap((order,pair)=>[...order].map((variant,i)=>({kind:'measured',pair,position:i+1,variant}))),...['A','B'].map(variant=>({kind:'trace',variant}))].map((r,id)=>({...r,id,status:'not_executed'}));
const history=protocol.inputs.history.flatMap((input,index)=>['A','B'].map(variant=>({id:`history-${index}-${variant}`,variant,input,status:'not_executed',generation_attempts:0,selection_attempts:0,snapshots:{}})));
const result={protocol:'P1-V3/1.0',harness_sha:process.env.GITHUB_SHA,baseline_sha:protocol.source.baseline_sha,candidate_sha:protocol.source.candidate_sha,run_id:process.env.GITHUB_RUN_ID,run_attempt:process.env.GITHUB_RUN_ATTEMPT,nav,history,errors:[],browser_lifecycle:[],status:'preparing',measurement_started:false};
await fs.mkdir(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
let persistChain=Promise.resolve();
function persist(){const data=JSON.stringify(result,null,2)+'\n';persistChain=persistChain.then(async()=>{await fs.writeFile(out+'raw.json.tmp',data);await fs.rename(out+'raw.json.tmp',out+'raw.json');});return persistChain;}
await persist();
const supervisor=new BrowserSupervisor({record:async event=>{result.browser_lifecycle.push({...event,wall:new Date().toISOString()});await persist();}});
// Serialize timeout/global/final disposal and share one 5s cleanup budget across its phases.
const originalDispose=supervisor.dispose.bind(supervisor);let disposalTail=Promise.resolve();
supervisor.dispose=options=>{
 const operation=disposalTail.then(async()=>{
  const end=Math.min(Date.now()+5000,Number(process.env.HX_V3_JOB_STARTED_MS)+45*60000);
  Object.defineProperty(supervisor,'cleanupMs',{configurable:true,get:()=>Math.max(1,Math.min(5000,end-Date.now()))});
  return originalDispose(options);
 });
 disposalTail=operation.catch(()=>{});return operation;
};
const jobStart=Number(process.env.HX_V3_JOB_STARTED_MS);
assert(Number.isFinite(jobStart) && jobStart>0,'workflow job start required, no local measurement');
const softDeadline=jobStart+43*60000;
let globalExpired=false;
const globalTimer=setTimeout(()=>{globalExpired=true;supervisor.aborted=true;result.errors.push({kind:'global_soft_deadline'});supervisor.dispose({force:true,reason:'43min soft deadline'}).then(persist).catch(e=>{result.errors.push({cleanup_error:String(e)});return persist();});},Math.max(0,softDeadline-Date.now()));
const bounded=(work,label,ms=180000)=>{
 const left=softDeadline-Date.now();
 if(left<=0 || globalExpired)throw new PackageAbort('global soft deadline; no next action');
 return supervisor.run(work,label,Math.min(ms,left));
};
const servers=[];
async function imagePaths(dir,prefix=''){const a=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.isDirectory())a.push(...await imagePaths(dir+'/'+e.name,prefix+e.name+'/'));else if(/\.(png|svg|webp)$/.test(e.name))a.push('/'+prefix+e.name);}return a;}
async function launchServers(){
 for(const [name,port,dist]of [['A',4185,'/tmp/hx003-pair-baseline/dist'],['B',4186,'/tmp/hx003-pair-candidate/dist'],['historyA',4187,'/tmp/hx003-v3-history-baseline/dist'],['historyB',4188,'/tmp/hx003-v3-history-candidate/dist']]){
  const p=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dist],{cwd:root,stdio:['ignore','pipe','inherit']});servers.push(p);
  await bounded(()=>new Promise((resolve,reject)=>{p.stdout.on('data',b=>{if(String(b).includes('http://127.0.0.1'))resolve();});p.on('error',reject);p.on('exit',code=>reject(Error(name+' server exit '+code)));}),'preview '+name,15000);
 }
}
async function createRunner(browser,variant,historyOnly=false){
 const context=await browser.newContext({viewport:{width:1500,height:1000},deviceScaleFactor:1,locale:'ru-RU'}),page=await context.newPage();page.setDefaultTimeout(180000);
 const events=[],event=(event_kind,payload={})=>events.push({event_kind,wall:new Date().toISOString(),...payload});
 page.on('pageerror',e=>event('pageerror',{message:e.message}));page.on('dialog',async d=>{event('dialog',{message:d.message()});await d.dismiss();});
 page.on('requestfailed',r=>event('requestfailed',{url:r.url(),error:r.failure()?.errorText,analytics:/mc\.yandex/.test(r.url())}));
 await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){window.__HX003_IMPORT=false;this.addEventListener('loadend',()=>requestAnimationFrame(()=>requestAnimationFrame(()=>window.__HX003_IMPORT=true)),{once:true});return read.apply(this,args);};});
 if(historyOnly)await page.addInitScript({content:'window.__HX003_V3_ENCODE='+encodeNative.toString()+';'});
 await bounded(()=>page.goto('http://127.0.0.1:'+(historyOnly?(variant==='A'?4187:4188):(variant==='A'?4185:4186))+'/'),'page load');
 const ready=async()=>{await page.waitForFunction(()=>document.querySelector('.map-stage > svg')?.getAttribute('data-render-phase')==='ready'&&!document.querySelector('.controls--transfer > button')?.disabled);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const assets=()=>page.evaluate(async()=>{await document.fonts.ready;const urls=[...new Set([...document.querySelectorAll('.map-stage > svg image')].map(n=>n.getAttribute('href')??n.getAttribute('xlink:href')).filter(Boolean))];for(let i=0;i<urls.length;i+=12)await Promise.all(urls.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('asset '+src));img.src=src;})));});
 async function snapshot(stem){
  const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();
  const [d]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);
  const path=out+stem+'.json';await d.saveAs(path);return {path,data:JSON.parse(await fs.readFile(path,'utf8'))};
 }
 async function restore(path,stem){
  event('import_start',{path});await page.evaluate(()=>window.__HX003_IMPORT=false);await page.locator('input[type=file]').setInputFiles(path);
  await page.waitForFunction(()=>window.__HX003_IMPORT===true);await ready();event('artwork_ready');
  const toggle=page.locator('.biome-display-toggle');for(let i=0;await toggle.getAttribute('data-mode')!=='color';i++){assert(i<3);await toggle.click();}
  await ready();await assets();event('assets_fonts_ready');
  const original=JSON.parse(await fs.readFile(path,'utf8')),saved=await snapshot(stem);
  assert.deepEqual(semantic(saved.data),semantic(original));return saved;
 }
 return {context,page,ready,assets,snapshot,restore,events,event};
}

async function navigation(page){return page.evaluate(async()=>{
 const v=document.querySelector('.map-viewport'),sleep=ms=>new Promise(r=>setTimeout(r,ms));v.scrollLeft=500;v.scrollTop=300;await sleep(700);
 const b=v.getBoundingClientRect(),x=b.x+b.width*.5,y=b.y+b.height*.5;
 const state=()=>({cache:document.querySelector('.map-motion-buffer')?.dataset.cache??null,visibility:document.visibilityState,hasFocus:document.hasFocus(),heap:performance.memory?.usedJSHeapSize??null});
 const samples={zoom:[],pan:[],zoom_timestamps:[],pan_timestamps:[],marks:{},time_origin:performance.timeOrigin,initial_state:state()};let last;
 const frame=async phase=>{const t=await new Promise(r=>requestAnimationFrame(r));if(phase){samples[phase].push(t-last);samples[phase+'_timestamps'].push(t);}last=t;};
 await frame();samples.zoom_initial_timestamp=last;samples.marks.zoom_start=performance.now();performance.mark('hx003v3:zoom-start');
 for(let i=0;i<24;i++){v.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:i<12?-12:12,clientX:x,clientY:y}));await frame('zoom');}
 samples.marks.zoom_end=performance.now();performance.mark('hx003v3:zoom-end');samples.after_zoom=state();await sleep(220);await frame();samples.pan_initial_timestamp=last;samples.marks.pan_start=performance.now();performance.mark('hx003v3:pan-start');
 v.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true,buttons:1,button:0,clientX:x,clientY:y}));
 for(let i=1;i<=24;i++){v.dispatchEvent(new MouseEvent('mousemove',{bubbles:true,cancelable:true,buttons:1,clientX:x+i*4,clientY:y+i*2}));await frame('pan');}
 v.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true,button:0,clientX:x+96,clientY:y+48}));samples.marks.pan_end=performance.now();performance.mark('hx003v3:pan-end');await sleep(220);samples.final_state=state();return samples;
});}
async function installTraceObservers(page){
 await page.evaluate(()=>{
  const events=[];window.__HX003_V3_PHASES=events;
  const emit=(event_kind,payload={})=>events.push({event_kind,time:performance.now(),time_origin:performance.timeOrigin,...payload});
  const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(...args){emit('image_decode_call',{src:this.currentSrc||this.src});return decode.apply(this,args);};
  const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){emit('drawImage_start');try{return draw.apply(this,args);}finally{emit('drawImage_end');}};
  const serialize=XMLSerializer.prototype.serializeToString;XMLSerializer.prototype.serializeToString=function(...args){emit('serialize_start');try{return serialize.apply(this,args);}finally{emit('serialize_end');}};
  const c=document.querySelector('.map-motion-buffer');if(c){const observer=new MutationObserver(()=>emit('cache_state',{state:c.dataset.cache??null}));observer.observe(c,{attributes:true,attributeFilter:['data-cache']});window.__HX003_V3_CACHE_OBSERVER=observer;}
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())emit('longtask',{start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});}catch(e){emit('longtask_unavailable',{error:String(e)});}
 });
}
async function traceStart(r){
 const session=await r.context.newCDPSession(r.page),done=new Promise(resolve=>session.once('Tracing.tracingComplete',resolve));
 await session.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.cpu_profiler',transferMode:'ReturnAsStream'});
 return {session,done};
}
async function traceEnd(trace,stem){
 await trace.session.send('Tracing.end');const {stream}=await bounded(()=>trace.done,'trace stop');const path=out+stem+'-trace.json',file=await fs.open(path,'w');
 try{for(;;){const p=await bounded(()=>trace.session.send('IO.read',{handle:stream}),'trace stream');await file.write(p.base64Encoded?Buffer.from(p.data,'base64'):p.data);if(p.eof)break;}}
 finally{await file.close();await trace.session.send('IO.close',{handle:stream});await trace.session.detach();}
 return path;
}
const N=d=>new Set([...d.map.regions.flatMap(r=>r.hexes.map(h=>`${h.q},${h.r}`)),...Object.keys(d.map.terrainByHexKey??{})]).size;
async function nativeSnapshot(r,row,step){
 const typed=await bounded(()=>r.page.evaluate(()=>{if(typeof window.__HX003_V3_READ!=='function')throw Error('history read-only seam absent');return window.__HX003_V3_ENCODE(window.__HX003_V3_READ());}),'native snapshot '+step);
 const state=decodeNative(typed),containers=containerManifest(state);
 assert(step==='P' || containers.some(c=>c.type==='Map'&&c.size>0),'native nonempty Map entries required');
 const bytes=Buffer.from(JSON.stringify(typed)),path=out+row.id+'-'+step+'.native.json.gz';await fs.writeFile(path,gzipSync(bytes));
 row.snapshots[step]={path,sha256:hash(bytes),uncompressed_bytes:bytes.length,containers};return state;
}
const expectedPush=(before,after)=>[...before.undo,{before:before.document,after:after.document}].slice(-100);
function assertCommit(before,after){assert.deepEqual(after.undo,expectedPush(before,after),'full transaction contents');assert.deepEqual(after.redo,[]);}
async function uiUndoRedo(r,row,before,after,prefix){
 await bounded(()=>r.page.getByRole('button',{name:'Отменить',exact:true}).click(),'undo');await bounded(r.ready,'undo ready');const undone=await nativeSnapshot(r,row,prefix+'-undo');
 assert.deepEqual(undone.document,before.document);assert.deepEqual(undone.generation,before.generation);assert.deepEqual(undone.undo,after.undo.slice(0,-1));assert.deepEqual(undone.redo,[...after.redo,after.undo.at(-1)]);
 await bounded(()=>r.page.getByRole('button',{name:'Повторить',exact:true}).click(),'redo');await bounded(r.ready,'redo ready');assert.deepEqual(await nativeSnapshot(r,row,prefix+'-redo'),after);
}
async function continueOnce(r,row,anchor,step){
 assert(row.generation_attempts<2);row.generation_attempts++;await persist();
 await bounded(()=>r.page.locator(`polygon.hex.candidate[data-hex-key="${anchor.q},${anchor.r}"]`).dispatchEvent('click'),'history continuation '+step);
 await bounded(r.ready,'continuation ready');const saved=await bounded(()=>r.snapshot(row.id+'-'+step),'history JSON');
 assert.equal((await r.page.getByRole('alert').allTextContents()).length,0,'unexpected history alert');return saved;
}
async function selections(r,row,before){
 const keys=await r.page.locator('polygon.hex.region[data-hex-key],polygon.hex.center[data-hex-key]').evaluateAll(ns=>[...new Set(ns.map(n=>n.getAttribute('data-hex-key')).filter(k=>/^-?\d+,-?\d+$/.test(k??'')))]);
 row.selection=[];
 for(const key of keys){
  if(row.selection_attempts===4)break;
  const locator=r.page.locator(`polygon.hex[data-hex-key="${key}"]`).first();await bounded(()=>locator.scrollIntoViewIfNeeded({timeout:5000}),'selection scroll',5000);
  const box=await locator.evaluate(n=>{const b=n.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2,hit=document.elementFromPoint(x,y)?.closest('polygon.hex');return{x,y,left:b.left,top:b.top,right:b.right,bottom:b.bottom,visible:b.width>0&&b.height>0&&x>0&&x<innerWidth&&y>0&&y<innerHeight&&hit===n,viewport:{width:innerWidth,height:innerHeight}};});
  if(!box.visible)continue;
  row.selection_attempts++;await persist();await bounded(()=>locator.click({timeout:5000}),'visible selection',5000);await bounded(()=>r.page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),'selection ready');
  const state=await nativeSnapshot(r,row,'selection-'+row.selection_attempts),expected=structuredClone(before);expected.document.selectedHex={q:Number(key.split(',')[0]),r:Number(key.split(',')[1])};
  assert.deepEqual(state,expected,'selection may only change native selectedHex');row.selection.push({key,...box,selectedHex:state.document.selectedHex});
 }
 assert.equal(row.selection_attempts,4,'four distinct visible selections required');
 const saved=await bounded(()=>r.snapshot(row.id+'-selected'),'selection JSON');const expected=semantic(row.final_save);expected.ui.selectedHex=row.selection.at(-1).selectedHex;assert.deepEqual(semantic(saved.data),expected,'selection may only change JSON ui.selectedHex');
}
async function runHistory(row){
 let browser,r;row.status='preparing';row.started_at=new Date().toISOString();await persist();
 try{
  browser=await supervisor.start(chromium);r=await bounded(()=>createRunner(browser,row.variant,true),'history context');
  await bounded(r.ready,'fresh history ready');const P=await nativeSnapshot(r,row,'P');assert.deepEqual(P.undo,[]);assert.deepEqual(P.redo,[]);
  const initial=await bounded(()=>r.restore(root+row.input.path,row.id+'-J0'),'history initial import'),S0=await nativeSnapshot(r,row,'S0');
  assertCommit(P,S0);
  assert.deepEqual(S0.generation,initial.data.generation);assert.deepEqual(S0.document.map.generation,initial.data.generation);
  const anchor=initial.data.map.candidateHexes[0];assert(anchor&&Number.isInteger(anchor.q)&&Number.isInteger(anchor.r),'frozen first candidate anchor');row.anchor=anchor;
  const first=await continueOnce(r,row,anchor,'J1');assert(N(first.data)>N(initial.data),'history must exercise committed growth');
  const S1=await nativeSnapshot(r,row,'S1');assertCommit(S0,S1);assert.deepEqual(S1.generation,first.data.generation);await uiUndoRedo(r,row,S0,S1,'first');
  await bounded(()=>r.restore(initial.path,row.id+'-reimport'),'reimport J0');const I0=await nativeSnapshot(r,row,'I0');assert.deepEqual(I0.document,S0.document);assert.deepEqual(I0.generation,S0.generation);assertCommit(S1,I0);
  const second=await continueOnce(r,row,anchor,'I1-save');assert.deepEqual(semantic(second.data),semantic(first.data));
  const I1=await nativeSnapshot(r,row,'I1');assert.deepEqual(I1.document,S1.document);assert.deepEqual(I1.generation,S1.generation);assertCommit(I0,I1);await uiUndoRedo(r,row,I0,I1,'reimport');
  row.final_save=second.data;await selections(r,row,I1);delete row.final_save;assert(!r.events.some(e=>e.event_kind==='pageerror'||e.event_kind==='dialog'),'history page/dialog error');row.status='success';row.json_paths={J0:initial.path,J1:first.path,I1:second.path};
 }catch(e){row.status=e instanceof PackageAbort?'timeout':/timeout/i.test(String(e))?'timeout':'incomplete';row.error=String(e);row.error_stack=e.stack;result.errors.push({history:row.id,error:String(e)});if(e instanceof PackageAbort)throw e;}
 finally{delete row.final_save;if(r)row.events=r.events;try{await supervisor.dispose({force:supervisor.aborted,reason:'history row complete'});}finally{row.completed_at=new Date().toISOString();await persist();}}
}
async function compareHistories(){
 result.history_comparisons=[];
 for(let i=0;i<2;i++){
  const a=history[i*2],b=history[i*2+1],row={input:a.input.path,complete:a.status==='success'&&b.status==='success'};result.history_comparisons.push(row);
  if(!row.complete)continue;
  try{
   assert.deepEqual(a.anchor,b.anchor);assert.deepEqual(Object.keys(a.snapshots),Object.keys(b.snapshots));
   const read=async e=>decodeNative(JSON.parse(gunzipSync(await fs.readFile(e.path)).toString('utf8')));
   const pa=await read(a.snapshots.P),pb=await read(b.snapshots.P);
   const startupComparable=p=>{
    const v=structuredClone(p),g=v.generation,seed=g.masterSeed;
    assert(Number.isInteger(seed)&&seed>=0&&seed<=0xffffffff);
    assert.deepEqual(v.document.map.generation,g);
    assert.equal(g.streams.geography,seed>>>0);assert.equal(g.streams.poi,(seed^0x9E3779B9)>>>0);
    assert.equal(v.document.map.toponymSeed,(seed^0x85EBCA6B)>>>0);
    for(const rng of [v.generation,v.document.map.generation]){rng.masterSeed=0;rng.streams.geography=0;rng.streams.poi=0;}
    v.document.map.toponymSeed=0;return v;
   };
   assert.deepEqual(startupComparable(pa),startupComparable(pb),'A/B fresh baseline differs only validated entropy-derived fields');
   const comparable=(state,P)=>{
    const v=structuredClone(state);assert(v.undo.length>0);
    assert.deepEqual(v.undo[0].before,P.document,'only exact validated initial pre-import document may differ');
    v.undo[0].before={initial_preimport_baseline:'validated_full_raw_P_retained'};return v;
   };
   for(const step of Object.keys(a.snapshots)){
    if(step==='P')continue;
    assert.deepEqual(comparable(await read(a.snapshots[step]),pa),comparable(await read(b.snapshots[step]),pb),'A/B native '+step);
   }
   row.initial_baseline_rule='P full raw retained; initial entropy derivation validated; only undo[0].before references distinct P; every postimport field exact';
   for(const step of ['J0','J1','I1'])assert.deepEqual(semantic(JSON.parse(await fs.readFile(a.json_paths[step],'utf8'))),semantic(JSON.parse(await fs.readFile(b.json_paths[step],'utf8'))));
   row.equal=true;
  }catch(e){row.equal=false;row.error=String(e);row.error_stack=e.stack;result.errors.push({comparison:row.input,error:String(e)});}
 }
}

try{
 assert.equal(process.env.GITHUB_RUN_ATTEMPT,'1','single attempt; no rerun');
 const env=JSON.parse(await fs.readFile(out+'environment.json','utf8'));result.environment=env;validateResourceClass(env);
 assert.equal(hash(await fs.readFile(root+'package-lock.json')),protocol.environment.lock_sha256);
 for(const input of [protocol.inputs.navigation,...protocol.inputs.history])assert.equal(hash(await fs.readFile(root+input.path)),input.sha256,input.path);
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();assert.equal(head,process.env.GITHUB_SHA,'no runtime mutation/environment commit on measured checkout');
 const preload=await imagePaths(root+'public');await launchServers();
 let browser=await supervisor.start(chromium);assert.equal(browser.version(),env.chromium_version);
 const runners={};
 for(const variant of ['A','B']){
  const r=await bounded(()=>createRunner(browser,variant),'navigation context');runners[variant]=r;
  await bounded(()=>r.page.evaluate(async paths=>{window.__HX003_IMAGES=[];for(let i=0;i<paths.length;i+=12)await Promise.all(paths.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();window.__HX003_IMAGES.push(img);img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('preload '+src));img.src=src;})));await document.fonts.ready;},preload),'preload');
 }
 result.measurement_started=true;await persist();const lastCompletion={};
 for(const row of nav){
  const r=runners[row.variant],first=r.events.length;let trace;
  row.status='preparing';row.started_at=new Date().toISOString();row.previous_same_variant_idle_ms=lastCompletion[row.variant]?Date.now()-lastCompletion[row.variant]:null;await persist();
  try{
   if(row.kind==='trace'){await bounded(()=>installTraceObservers(r.page),'install trace-only observers');trace=await bounded(()=>traceStart(r),'trace start');}
   const start=Date.now();await bounded(()=>r.restore(root+protocol.inputs.navigation.path,'nav-'+row.id+'-restore'),'restore');row.import_and_settle_ms=Date.now()-start;
   row.status='running';row.navigation=await bounded(()=>navigation(r.page),'navigation '+row.id);
   for(const phase of ['zoom','pan'])assert(row.navigation[phase].length===24&&row.navigation[phase].every(Number.isFinite));
   assert(!r.events.slice(first).some(e=>e.event_kind==='pageerror'||e.event_kind==='dialog'),'page/dialog error');row.status='success';
  }catch(e){row.status=/timeout/i.test(String(e))||e instanceof PackageAbort?'timeout':'error';row.error=String(e);result.errors.push({nav:row.id,error:String(e)});throw e;}
  finally{
   if(trace&&!supervisor.aborted){try{row.phase_events=await bounded(()=>r.page.evaluate(()=>window.__HX003_V3_PHASES),'trace phase records');row.trace=await traceEnd(trace,'nav-'+row.id);row.phase_limits={snapshot_start:'not_observed_directly; use exact-source CPU stacks',decode_completion:'not_observed_by_wrapper; CDP only',causality:'unknown unless independent trace evidence supports attribution'};}catch(e){row.status='incomplete';row.trace_error=String(e);result.errors.push({trace:row.id,error:String(e)});}}
   row.events=r.events.slice(first);row.completed_at=new Date().toISOString();lastCompletion[row.variant]=Date.now();await persist();
  }
 }
 await supervisor.dispose({reason:'navigation and traces complete'});browser=null;
 for(const row of history)await runHistory(row);
 await compareHistories();result.status='collection_complete_not_product_acceptance';
}catch(e){result.status='blocked_or_incomplete';result.errors.push({error:String(e),stack:e.stack});process.exitCode=1;}
finally{
 clearTimeout(globalTimer);
 try{await supervisor.dispose({force:supervisor.aborted,reason:'package final cleanup'});}catch(e){result.status='blocked_cleanup_unconfirmed';result.errors.push({error:String(e)});process.exitCode=1;}
 for(const p of servers)p.kill();
 result.navigation_analysis=analyzeNavigation(nav);result.completed_at=new Date().toISOString();
 for(const row of [...nav,...history])if(row.status==='not_executed')row.skip_reason='package stopped before this planned action';
 result.product_acceptance=false;result.score_awarded=0;await persist();
 const manifest=[];async function collect(dir,prefix=''){for(const entry of await fs.readdir(dir)){const relative=prefix+entry;if(relative==='artifacts-manifest.json'||entry.endsWith('.tmp'))continue;const path=dir+entry,st=await fs.stat(path);if(st.isDirectory())await collect(path+'/',relative+'/');else if(st.isFile()){const data=await fs.readFile(path);manifest.push({path:relative,bytes:data.length,sha256:hash(data)});}}}await collect(out);
 await fs.writeFile(out+'artifacts-manifest.json',JSON.stringify({files:manifest},null,2)+'\n');
 console.log(JSON.stringify({status:result.status,guard_pass:result.navigation_analysis.guard_pass,history:history.map(r=>r.status),product_acceptance:false}));
}
