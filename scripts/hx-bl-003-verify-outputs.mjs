// Validate the original untimed outputs; never regenerate or replace samples.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../',import.meta.url));
const input=root+'reports/HX-BL-003/corpus/';
const outputs=root+'reports/HX-BL-003/baseline-outputs/';
const audit=root+'reports/HX-BL-003/output-audit/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=await fs.readFile(outputs+'manifest.json');
const expectedManifest=process.env.HX003_OUTPUT_MANIFEST_SHA256;
assert(expectedManifest,'Explicit pinned output manifest SHA256 is required');assert.equal(sha(manifestBytes),expectedManifest);
const m=JSON.parse(manifestBytes),src=JSON.parse(await fs.readFile(input+'manifest.json','utf8'));
assert.equal(m.baseline_sha,'103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b');
assert.equal(m.input_manifest_sha256,sha(await fs.readFile(input+'manifest.json')));
assert.equal(m.cases.length,7);assert.equal(m.files.length,42);
function semantic(d){const x=structuredClone(d);delete x.savedAt;return x;}
function N(d){return new Set([...d.map.regions.flatMap(r=>r.hexes.map(h=>`${h.q},${h.r}`)),...Object.keys(d.map.terrainByHexKey??{})]).size;}
const result={schema_version:1,stage:'supplemental_output_validation_no_timing',source_run:40200788539,source_artifact:12602421349,
  source_manifest_sha256:expectedManifest,original_status:m.status,files_verified:[],cases:[],asset_recovery:[],status:'verifying',errors:[]};
await fs.mkdir(audit,{recursive:true});
for(const f of m.files){const b=await fs.readFile(outputs+f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);result.files_verified.push({path:f.path,bytes:b.length,sha256:f.sha256});
  if(f.path.endsWith('.png')){assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(b.readUInt32BE(16)>0&&b.readUInt32BE(20)>0);}
}
const aborted=new Map();
for(const c of m.cases){
  const stem=c.input.replace(/\.json$/,'');
  const before=JSON.parse(await fs.readFile(outputs+stem+'-before.json','utf8')),after=JSON.parse(await fs.readFile(outputs+stem+'-after.json','utf8'));
  assert.deepEqual(semantic(before),semantic(JSON.parse(await fs.readFile(input+c.input,'utf8'))));
  assert.equal(N(before),c.before.N);assert.equal(N(after),c.after.N);assert.equal(c.outcome,'success');assert(N(after)>N(before));
  assert.equal(c.errors.length,0,'Original browser errors are not recoverable by this audit');
  assert(['outputs_ready_pending_freeze','blocked_error'].includes(c.status));
  if(c.status==='blocked_error')assert.match(c.error,/AssertionError.*Failed assets/s,'Only the known asset assertion can be audited');
  for(const r of c.failed_requests){assert.equal(r.error,'net::ERR_ABORTED','Do not forgive other network failures');const u=new URL(r.url);assert.equal(u.origin,'http://127.0.0.1:4183');assert(/\.(svg|png|webp)$/.test(u.pathname));aborted.set(u.pathname,r);}
  result.cases.push({input:c.input,original_status:c.status,outcome:c.outcome,Nbefore:N(before),Nafter:N(after),original_errors:c.errors,original_failed_requests:c.failed_requests});
}
let browser;
const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
try{
  await new Promise((resolve,reject)=>{let text='';const t=setTimeout(()=>reject(Error('Preview startup: '+text)),15000);server.stdout.on('data',b=>{text+=b;if(stripVTControlCharacters(text).includes('Local:')){clearTimeout(t);resolve();}});server.on('error',reject);});
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});result.audit_browser=browser.version();
  const page=await browser.newPage();await page.route(/mc\.yandex/,r=>r.abort());await page.goto('http://127.0.0.1:4183/');
  for(const [path] of aborted){const recovered=await page.evaluate(async path=>{const response=await fetch(path);if(!response.ok)throw Error('HTTP '+response.status+' '+path);const blob=await response.blob();const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth||!image.naturalHeight)throw Error('Empty image '+path);return {path,http:response.status,bytes:blob.size,width:image.naturalWidth,height:image.naturalHeight,decoded:true};}finally{URL.revokeObjectURL(url);}},path);result.asset_recovery.push(recovered);}
  assert.equal(result.asset_recovery.length,aborted.size);result.status='outputs_validated_pending_manifest_freeze';
}catch(e){result.status='blocked_asset_validation';result.errors.push(String(e));process.exitCode=1;}
finally{await fs.writeFile(audit+'verification.json',JSON.stringify(result,null,2)+'\n');await browser?.close();server.kill();console.log('OUTPUT_AUDIT '+JSON.stringify({status:result.status,files:result.files_verified.length,cases:result.cases.length,recovered:result.asset_recovery.length,errors:result.errors}));}
