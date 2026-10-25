// P1 baseline outputs only: no latency series and no product instrumentation.
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const input=root+'reports/HX-BL-003/corpus/';
const out=root+'reports/HX-BL-003/baseline-outputs/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline='103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b';
const source=JSON.parse(await fs.readFile(input+'manifest.json','utf8'));
assert.equal(source.baseline_sha,baseline);
assert.equal(source.lock_sha256,hash(await fs.readFile(root+'package-lock.json')));
for(const f of source.files){const b=await fs.readFile(input+f.path);assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);}
const manifest={schema_version:1,task_id:'HX-BL-003',protocol:'P1/spec1.0',stage:'baseline_outputs_no_timing',baseline_sha:baseline,
  harness_sha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),input_manifest_sha256:hash(await fs.readFile(input+'manifest.json')),
  node:process.version,playwright:JSON.parse(await fs.readFile(root+'node_modules/playwright/package.json','utf8')).version,
  environment:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model,vcpus:os.cpus().length,ram_bytes:os.totalmem(),runner:process.env.RUNNER_NAME??os.hostname()},
  viewport:{width:1500,height:1000},deviceScaleFactor:1,headless:true,cpu_throttling:false,language:'ru',browser:null,
  analytics:'mc.yandex blocked',timeout_ms:180000,files:[],cases:[],status:'preparing',started_at:new Date().toISOString(),
  semantic_exclusions:['top-level savedAt only; retained in raw files; no map/RNG/array exclusions'],
  next_gate:'Outputs must be verified and committed before timing; these are not performance measurements.'};
await fs.mkdir(out,{recursive:true});
async function save(name,bytes){await fs.writeFile(out+name,bytes);manifest.files.push({path:name,bytes:Buffer.byteLength(bytes),sha256:hash(bytes)});}
async function json(name,data){await save(name,JSON.stringify(data,null,2)+'\n');}
async function persist(){await fs.writeFile(out+'manifest.json',JSON.stringify(manifest,null,2)+'\n');}
async function bounded(p,label){let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('external180s timeout: '+label)),180000);})]);}finally{clearTimeout(timer);}}
function semantic(d){const x=structuredClone(d);delete x.savedAt;return x;}
function composition(d){const keys=new Set(d.map.regions.flatMap(r=>r.hexes.map(h=>`${h.q},${h.r}`)));for(const k of Object.keys(d.map.terrainByHexKey??{}))keys.add(k);return {N:keys.size,regions:d.map.regions.length,kingdoms:d.map.kingdoms.length};}
const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try{
  await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Preview startup: '+stripVTControlCharacters(text))),15000);server.stdout.on('data',b=>{text+=b;if(stripVTControlCharacters(text).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>{clearTimeout(timer);reject(Error('Preview exited '+c));});});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});manifest.browser=browser.version();
  for(const c of source.cases)for(const cp of c.checkpoints){
    const stem=cp.path.replace(/\.json$/,'');
    const record={mode:c.mode,seed:c.seed,input:cp.path,input_sha256:source.files.find(f=>f.path===cp.path).sha256,anchor:cp.anchor,options:c.options,status:'preparing',errors:[],failed_requests:[],outcome:null};manifest.cases.push(record);await persist();
    const context=await browser.newContext({viewport:manifest.viewport,deviceScaleFactor:1,locale:'ru-RU'});
    const page=await context.newPage();page.setDefaultTimeout(180000);
    page.on('pageerror',e=>record.errors.push({kind:'pageerror',message:e.message}));
    page.on('dialog',async d=>{record.errors.push({kind:'dialog',message:d.message()});await d.dismiss();});
    page.on('requestfailed',r=>{if(!/mc\.yandex/.test(r.url()))record.failed_requests.push({url:r.url(),error:r.failure()?.errorText});});
    await page.route(/mc\.yandex/,r=>r.abort());
    async function ready(){await page.waitForFunction(()=>document.querySelector('.map-stage > svg')?.getAttribute('data-render-phase')==='ready'&&!document.querySelector('.controls--transfer > button')?.disabled);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
    async function menu(){const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();}
    async function snapshot(){await ready();await menu();const [d]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);return JSON.parse(await fs.readFile(await d.path(),'utf8'));}
    async function assets(){await page.evaluate(async()=>{await document.fonts.ready;const urls=[...new Set([...document.querySelectorAll('.map-stage > svg image')].map(n=>n.getAttribute('href')??n.getAttribute('xlink:href')).filter(Boolean))];for(let i=0;i<urls.length;i+=12)await Promise.all(urls.slice(i,i+12).map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>img.decode().then(resolve,reject);img.onerror=()=>reject(Error('Asset failed: '+src));img.src=src;})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
    async function artwork(suffix){await ready();await bounded(assets(),'assets '+suffix);const svg=await page.locator('.map-stage > svg').evaluate(n=>n.outerHTML);await save(stem+'-'+suffix+'.svg',svg);await menu();const [download]=await bounded(Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'PNG',exact:true}).click()]),'PNG '+suffix);const b=await fs.readFile(await download.path());assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');await save(stem+'-'+suffix+'.png',b);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),png_bytes:b.length,svg_bytes:Buffer.byteLength(svg)};}
    try{
      await bounded(page.goto('http://127.0.0.1:4183/'),'load');
      await page.locator('input[type=file]').setInputFiles(input+cp.path);await ready();
      if(c.mode==='classic')for(let i=0;i<c.options.length;i++)await page.locator('.gen-params select').nth(i).selectOption(c.options[i].value);
      const toggle=page.locator('.biome-display-toggle');for(let count=0;await toggle.getAttribute('data-mode')!==(c.mode==='mythic'?'color':'emoji');count++){assert(count<3);await toggle.click();}
      const original=JSON.parse(await fs.readFile(input+cp.path,'utf8'));
      const before=await bounded(snapshot(),'input roundtrip');assert.deepEqual(semantic(before),semantic(original));record.before=composition(before);
      await json(stem+'-before.json',before);record.input_artwork=await artwork('before');
      assert(cp.anchor,'Missing preselected anchor');const selector=`polygon.hex.candidate[data-hex-key="${cp.anchor.q},${cp.anchor.r}"]`;
      assert.equal(await page.locator(selector).count(),1,'Fixed anchor must exist');
      await bounded((async()=>{await page.locator(selector).dispatchEvent('click');await ready();})(),'fixed expansion');
      const after=await bounded(snapshot(),'output snapshot');record.after=composition(after);record.alerts=await page.getByRole('alert').allTextContents();
      record.outcome=record.after.N>record.before.N?'success':record.alerts.some(t=>t.includes('Не удалось создать регион из-за ошибки'))?'error':record.alerts.length?'expected_rejection':'no_growth';
      await json(stem+'-after.json',after);record.output_artwork=await artwork('after');
      assert.equal(record.errors.length,0,'Browser errors/dialogs');assert.equal(record.failed_requests.length,0,'Failed assets');assert.notEqual(record.outcome,'error','Product error');
      record.status='outputs_ready_pending_freeze';
    }catch(e){record.status=String(e).includes('timeout')?'blocked_timeout':'blocked_error';record.error=String(e);record.stack=e.stack;process.exitCode=1;}
    finally{await context.close();await persist();console.log('BASELINE_OUTPUT_CASE '+JSON.stringify({input:record.input,status:record.status,outcome:record.outcome,before:record.before,after:record.after,error:record.error}));}
  }
  manifest.status=manifest.cases.length===source.files.length&&manifest.cases.every(c=>c.status==='outputs_ready_pending_freeze')?'outputs_ready_pending_freeze':'blocked_incomplete_outputs';
}catch(e){manifest.status='blocked_environment';manifest.error=String(e);process.exitCode=1;}
finally{manifest.completed_at=new Date().toISOString();await persist();console.log('BASELINE_OUTPUT_SUMMARY '+JSON.stringify({status:manifest.status,cases:manifest.cases.length,files:manifest.files.length}));await browser?.close();server.kill();}
