// HX-BL-003/P1: fixture preparation only. No baseline performance measurement.
import {spawn, execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=root+'reports/HX-BL-003/corpus/';
const sha=x=>createHash('sha256').update(x).digest('hex');
const baseline='103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b';
const cases=[{mode:'mythic',seed:0},{mode:'mythic',seed:123456789},{mode:'classic',seed:1}];
const targets=[400,1200,2400];
// Count occupied, playable map hexes; also disclose terrain-only (water) cells.
function composition(d){
  const keys=new Set(d.map.regions.flatMap(r=>r.hexes.map(h=>`${h.q},${h.r}`)));
  const biomes={};for(const r of d.map.regions)biomes[r.biomeId]=(biomes[r.biomeId]??0)+r.hexes.length;
  return {N:keys.size,terrainOnly:Object.keys(d.map.terrainByHexKey??{}).filter(k=>!keys.has(k)).length,
    biomes,regions:d.map.regions.length,kingdoms:d.map.kingdoms.length,rivers:d.map.rivers.length,
    roads:d.map.roads.length,waterPoi:Object.keys(d.map.waterPoiByHexKey??{}).length,
    poi:d.map.regions.reduce((n,r)=>n+(r.pointsOfInterest?.length??0),0)};
}
const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4182','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
const manifest={schema_version:1,task_id:'HX-BL-003',protocol:'P1/spec1.0',stage:'corpus_preparation_no_timing',baseline_sha:baseline,
  harness_sha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  created_at:new Date().toISOString(),node:process.version,playwright:JSON.parse(await fs.readFile(root+'node_modules/playwright/package.json','utf8')).version,
  lock_sha256:sha(await fs.readFile(root+'package-lock.json')),environment:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model,vcpus:os.cpus().length,ram_bytes:os.totalmem(),runner:process.env.RUNNER_NAME??os.hostname(),runner_os_image:process.env.ImageVersion??null},
  browser:null,browser_executable:chromium.executablePath(),viewport:{width:1500,height:1000},deviceScaleFactor:1,mapScale:1.5,language:'ru',rotation:false,headless:true,cpu_throttling:false,
  generation:{cases,targets,max_attempts_per_case:100,timeout_ms:180000,candidate_order:'numeric q ascending, then r; each candidate once until next success',N_definition:'unique hex coordinates in map.regions; terrain-only water separately counted',input_method:'real production candidate click; production RNG; defaults except classic locality/mainland'},
  measurement_plan:{cold:1,warmup:1,warm:5,paired_order:'AB/BA alternating',generation:'handler start to prepared committed document',render:'document completion to detailed artwork commit plus two rAF',navigation:{wheel_steps:24,wheel_delta:[-12,12],drag_steps:24,drag_delta:[-4,-2],scroll:[500,300],settle_ms:700,pause_ms:220},timeout_ms:180000,statistics:'median/min/max/nearest-rank p95; cold separate; all outcomes retained'},
  exclusions:['savedAt is wall clock metadata, retained in files but excluded from semantic equality; no other fields excluded'],
  cases:[],files:[],status:'preparing'};
await fs.mkdir(output,{recursive:true});
async function persist(name,data){const bytes=JSON.stringify(data,null,2)+'\n';await fs.writeFile(output+name,bytes);manifest.files.push({path:name,bytes:Buffer.byteLength(bytes),sha256:sha(bytes)});}
async function checkpoint(){await fs.writeFile(output+'manifest.json',JSON.stringify(manifest,null,2)+'\n');}
async function bounded(promise,label){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('external180s timeout: '+label)),180000);})]);}finally{clearTimeout(timer);}}
try{
  await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Preview server startup timeout')),15000);server.stdout.on('data',d=>{text+=d;if(text.includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});manifest.browser=browser.version();
  for(const spec of cases){
    const record={...spec,steps:[],checkpoints:[],unreached:[...targets],errors:[],status:'preparing'};manifest.cases.push(record);await checkpoint();
    const context=await browser.newContext({viewport:manifest.viewport,deviceScaleFactor:1,locale:'ru-RU'});
    const page=await context.newPage();page.setDefaultTimeout(180000);
    page.on('pageerror',e=>record.errors.push({kind:'pageerror',message:e.message}));
    page.on('dialog',async d=>{record.errors.push({kind:'dialog',message:d.message()});await d.dismiss();});
    await page.route(/mc\.yandex/,r=>r.abort());
    await page.addInitScript(()=>{
      const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();
      URL.createObjectURL=function(blob){const url=make.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};
      HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(text=>window.__corpusExport=JSON.parse(text));return;}return click.call(this);};
    });
    async function ready(){await page.waitForFunction(()=>document.querySelector('.map-stage > svg')?.getAttribute('data-render-phase')==='ready'&&!document.querySelector('.controls--transfer > button')?.disabled);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
    async function snapshot(){await ready();await page.evaluate(()=>window.__corpusExport=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await page.getByRole('button',{name:'JSON',exact:true}).click();await page.waitForFunction(()=>window.__corpusExport!==null);return page.evaluate(()=>window.__corpusExport);}
    try{
      await page.goto('http://127.0.0.1:4182/');
      const seed=page.getByRole('textbox',{name:'Seed мира',exact:true});await seed.fill(String(spec.seed));await seed.press('Tab');
      await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption(spec.mode);
      if(spec.mode==='classic'){await page.locator('.gen-params select').nth(0).selectOption('locality');await page.locator('.gen-params select').nth(3).selectOption('mainland');}
      const toggle=page.locator('.biome-display-toggle');while(await toggle.getAttribute('data-mode')!==(spec.mode==='mythic'?'color':'emoji'))await toggle.click();
      record.options=await page.locator('.gen-params select').evaluateAll(nodes=>nodes.map(n=>({value:n.value,options:[...n.options].map(o=>({value:o.value,label:o.text}))})));
      let d=await bounded(snapshot(),'initial export');let attempted=new Set();
      for(let attempt=1;attempt<=100&&record.unreached.length;attempt++){
        const candidates=[...d.map.candidateHexes].sort((a,b)=>a.q-b.q||a.r-b.r);
        const anchor=candidates.find(h=>!attempted.has(`${h.q},${h.r}`));if(!anchor){record.status='no_untried_candidates';break;}
        const before=composition(d);const step={attempt,anchor,before,started_at:new Date().toISOString(),outcome:'pending'};record.steps.push(step);
        try{
          await bounded((async()=>{await page.locator(`polygon.hex.candidate[data-hex-key="${anchor.q},${anchor.r}"]`).dispatchEvent('click');await ready();d=await snapshot();})(),'candidate '+JSON.stringify(anchor));
          step.after=composition(d);step.alerts=await page.getByRole('alert').allTextContents();step.outcome=step.after.N>before.N?'success':step.alerts.length?'expected_rejection':'no_growth';step.finished_at=new Date().toISOString();
          if(step.outcome==='success')attempted=new Set();else attempted.add(`${anchor.q},${anchor.r}`);
          for(const target of [...record.unreached])if(step.after.N>=target){
            // Normalize ONLY presentation configuration before freezing input, using real import.
            d.ui={...d.ui,mapScale:1.5,isMapRotated:false,selectedHex:null};
            await page.locator('input[type=file]').setInputFiles({name:'checkpoint.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await ready();d=await snapshot();
            const name=`${spec.mode}-${spec.seed}-N${target}.json`;await persist(name,d);
            const next=[...d.map.candidateHexes].sort((a,b)=>a.q-b.q||a.r-b.r)[0]??null;
            record.checkpoints.push({target,path:name,composition:composition(d),anchor:next,generation:d.generation,attempt});record.unreached=record.unreached.filter(n=>n!==target);
            console.log('CORPUS_CHECKPOINT '+JSON.stringify({mode:spec.mode,seed:spec.seed,target,N:composition(d).N,path:name,anchor:next}));
          }
          await checkpoint();
          console.log('CORPUS_STEP '+JSON.stringify({mode:spec.mode,seed:spec.seed,attempt,outcome:step.outcome,N:step.after.N}));
          if(record.errors.length)throw Error('Browser errors; see manifest');
        }catch(e){step.outcome=String(e).includes('timeout')?'timeout':'error';step.error=String(e);record.status=step.outcome;await checkpoint();break;}
      }
      if(record.status==='preparing')record.status=record.unreached.length?'attempt_limit':'complete';
    }catch(e){record.status='error';record.errors.push({kind:'harness',message:String(e)});}
    finally{await context.close();await checkpoint();}
  }
  const enough=manifest.cases.filter(c=>c.mode==='mythic').every(c=>c.checkpoints.length>=2)&&manifest.cases.find(c=>c.mode==='classic')?.checkpoints.length>=1;
  manifest.status=enough?'corpus_ready_pending_freeze_commit':'blocked_insufficient_corpus';
  assert.equal(manifest.cases.length,3);
}catch(e){manifest.status='blocked_environment';manifest.error=String(e);process.exitCode=1;}
finally{manifest.completed_at=new Date().toISOString();await checkpoint();console.log('CORPUS_MANIFEST '+JSON.stringify(manifest));await browser?.close();server.kill();}
