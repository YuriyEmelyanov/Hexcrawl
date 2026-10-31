import {spawn} from 'node:child_process';
import {chromium} from '/workspace/hx-review-d7bb38f/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/workspace/hx-review-d7bb38f/',out='/workspace/hx-review-evidence-d7bb38f/';const reports=[];
const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4193','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))resolve()});server.on('exit',c=>reject(Error('server '+c)))});
const browser=await chromium.launch({executablePath:'/tmp/hx-chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[],alerts=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss()});await page.route(/mc\.yandex/,r=>r.abort());
await page.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){let u=make.call(this,b);if(b.type.startsWith('application/json'))blobs.set(u,b.text());return u};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__exported=JSON.parse(t));return}return click.call(this)};const serialize=XMLSerializer.prototype.serializeToString;XMLSerializer.prototype.serializeToString=function(x){const s=serialize.call(this,x);if(x.tagName==='svg')window.__exportSvg=s;return s};});
await page.goto('http://127.0.0.1:4193/');
const button=n=>page.getByRole('button',{name:n,exact:true});
async function snapshot(){await page.evaluate(()=>window.__exported=null);const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__exported);return page.evaluate(()=>{let x=window.__exported;delete x.savedAt;return x})}
async function load(d){await page.locator('input[type=file]').setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);await page.waitForTimeout(100)}
async function edit(){if(await button('Редактировать').count())await button('Редактировать').click()}
async function select(k){await page.locator(`polygon.hex[data-hex-key="${k}"]`).dispatchEvent('click')}
async function check(name,fn){try{reports.push({name,status:'pass',detail:await fn()})}catch(e){reports.push({name,status:'fail',error:e.stack});await page.screenshot({path:out+'failure-'+reports.length+'.png',fullPage:true})}await fs.writeFile(out+'navigation-sensitivity-results.json',JSON.stringify({reports,errors,alerts},null,2))}
const fixture=JSON.parse(await fs.readFile(root+'test/fixtures/road-entry-zigzags.json'));
await load(fixture);await select('0,1');await edit();
await check('R4 exact observer sensitivity to same-delivery transform writes',async()=>{
 const source=await fs.readFile(root+'test/browser/navigation.smoke.mjs','utf8');
 const start=source.indexOf('  const v=document.querySelector',source.indexOf('const burst=')),end=source.indexOf('});assert.equal(burst.changes',start);
 let body=source.slice(start,end),loop=body.indexOf('  for(let i=0;i<20;i++)'),wait=body.indexOf('  await new Promise',loop);
 body=body.slice(0,loop)+`  const original=s.style.transform;s.style.transform='translate(1px, 2px) scale(1.5)';s.style.setProperty('--review-only','1');s.style.transform=original;\n`+body.slice(wait);
 const result=await page.evaluate(new Function('return (async()=>{'+body+'})()'));
 assert.equal(result.changes,2,'two real transform writes must be counted despite one observer delivery');
 let rejected=false;try{assert.equal(result.changes,1,'One SVG transform update per frame')}catch{rejected=true}assert.ok(rejected);
 return {...result,originalOracleRejectsInjectedViolation:rejected};
});
await browser.close();server.kill();console.log(JSON.stringify({reports,errors,alerts},null,2));
