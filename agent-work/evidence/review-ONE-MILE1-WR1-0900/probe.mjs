import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createGenerationHarness} from '../wr1-review-0900/test/helpers/generation-harness.mjs';
import {fineRiverStrokeWidth,fineRoadPresentation} from '../wr1-review-0900/src/oneMilePresentation.ts';
const require=createRequire(new URL('../wr1-review-0900/package.json',import.meta.url));
const {chromium}=require('playwright');
const root=new URL('../wr1-review-0900/',import.meta.url).pathname,out=new URL('./',import.meta.url);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const result={head:'3344159406c3619bc3903e7185f7b0a5c4d13de5',started_at:new Date().toISOString(),analytical:[],crossings:[],png:[],profiles:[]};
for(let F=1;F<=5;F++)for(let a=0;a<6;a++){
 const w=Math.sqrt(3)*28*(.04+.035*F),theta=a*Math.PI/3,c=Math.cos(theta),s=Math.sin(theta);
 near(fineRiverStrokeWidth(w),w);near((w/(Math.sqrt(3)*28/6))/(w/(Math.sqrt(3)*28)),6);
 const road={key:'r',roadId:1,segmentKey:'s',kind:'trail',x1:-20*c,y1:-20*s,x2:20*c,y2:20*s};
 const river={key:'river-segment-1-0',x1:20*s,y1:-20*c,x2:-20*s,y2:20*c,width:w};
 for(const kind of ['ferry','ford','bridge']){
  const p=fineRoadPresentation(road,[{key:'c',roadId:1,roadSegmentKey:'s',riverId:1,x:0,y:0,kind}],[river]);
  if(kind==='ferry'){near(Math.hypot(p.pieces[0].x2,p.pieces[0].y2),w/2);near(Math.hypot(p.pieces[1].x1,p.pieces[1].y1),w/2);}
  if(kind==='ford'){const wet=p.pieces.find(p=>p.opacity===.42);near(Math.hypot(wet.x2-wet.x1,wet.y2-wet.y1),w);}
  if(kind==='bridge'){assert.equal(p.pieces.length,1);assert.equal(p.rails.length,2);for(const r of p.rails){const [x,y]=r.points.split(' ').map(s=>s.split(',').map(Number));assert.ok(Math.hypot(x[0]-y[0],x[1]-y[1])>w);}}
 }
 result.analytical.push({F,sector:a,width:w,fraction1:w/(Math.sqrt(3)*28/6)});
}
for(const x of [NaN,Infinity,-2,0])assert.equal(fineRiverStrokeWidth(x),0);
const source=await fs.readFile(new URL('../wr1-review-0900/src/oneMilePresentation.ts',import.meta.url),'utf8');
result.sourcePresentationOnly=!/Math\.random|generation|\.push\(/.test(source.split('export function')[0]);
const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:await fs.readFile(new URL('../wr1-review-0900/test/fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'x'}});
const prep=h.render().previewOneMile();assert.ok(h.render().applyOneMilePreview(prep));const fixture=structuredClone(h.render().createSaveData());fixture.map.crossings.find(c=>c.riverId===3).kind='ford';
delete fixture.map.physicalGrid.selectedCell;delete fixture.map.physicalGrid.selectedWorldPoint;
await fs.writeFile(new URL('fixture.json',out),JSON.stringify(fixture));
const server=spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4295','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser;
try{
 await new Promise((resolve,reject)=>{let b='';server.stdout.on('data',d=>{b+=d;if(b.includes('Local:'))resolve();});server.on('error',reject);setTimeout(()=>reject(Error('server timeout')),15000).unref();});
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(/mc\.yandex/,r=>r.abort());await page.addInitScript(()=>{const orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const u=orig.call(this,b);if(b.type.startsWith('application/json'))blobs.set(u,b.text());if(b.type.startsWith('image/svg+xml'))b.text().then(t=>window.__svg=t);return u;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__doc=JSON.parse(t));return;}return click.call(this);};});
 await page.goto('http://127.0.0.1:4295/');await page.locator('input[type=file]').setInputFiles(new URL('fixture.json',out).pathname);const step=page.locator('[data-fine-step]');await step.waitFor();await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 const snapshot=async()=>{await page.evaluate(()=>window.__doc=null);const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();await page.getByRole('button',{name:'JSON',exact:true}).click();await page.waitForFunction(()=>window.__doc);return page.evaluate(()=>{const d=window.__doc;delete d.savedAt;delete d.ui;delete d.map.physicalGrid.viewStep;delete d.map.physicalGrid.selectedCell;delete d.map.physicalGrid.selectedWorldPoint;return d;});};
 const before=await snapshot();const lines=()=>page.locator('.rivers-layer .river-polyline').evaluateAll(ns=>ns.map(n=>['x1','y1','x2','y2','stroke-width'].map(k=>+n.getAttribute(k))));
 const native=await lines();assert.equal(native.length,53);await step.selectOption('1');await page.locator('[data-fine-world]').waitFor();assert.deepEqual(await lines(),native);
 const paint=el=>({rivers:[...el.querySelectorAll('.river-polyline')].map(n=>['x1','y1','x2','y2','stroke-width'].map(k=>n.getAttribute(k))),roads:[...el.querySelectorAll('.roads-layer line')].map(n=>['x1','y1','x2','y2','opacity','stroke-width','stroke-dasharray','stroke-linecap'].map(k=>n.getAttribute(k))),rails:[...el.querySelectorAll('.roads-layer polyline')].map(n=>['points','stroke','stroke-width'].map(k=>n.getAttribute(k))),labels:[...el.querySelectorAll('[data-fine-pois] [role=img]')].map(n=>n.getAttribute('aria-label'))});
 const roads=await page.locator('[data-fine-road]').evaluateAll(ns=>ns.map(g=>({key:g.dataset.fineRoad,cross:[...g.querySelectorAll('[data-fine-crossing]')].map(n=>({key:n.dataset.fineCrossing,kind:n.dataset.crossingKind})),lines:[...g.querySelectorAll('line')].map(n=>({x1:+n.getAttribute('x1'),y1:+n.getAttribute('y1'),x2:+n.getAttribute('x2'),y2:+n.getAttribute('y2'),opacity:+n.getAttribute('opacity')})),rails:[...g.querySelectorAll('polyline')].map(n=>n.getAttribute('points'))})));
 for(const g of roads.filter(g=>g.cross.length)){
  const a=g.lines[0],b=g.lines.at(-1),dx=b.x2-a.x1,dy=b.y2-a.y1,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,cx=(a.x1+b.x2)/2,cy=(a.y1+b.y2)/2;
  const matches=native.filter(r=>{const vx=r[2]-r[0],vy=r[3]-r[1],rl=Math.hypot(vx,vy),t=((cx-r[0])*vx+(cy-r[1])*vy)/(rl*rl);return t>=0&&t<=1&&Math.abs((cx-r[0])*vy-(cy-r[1])*vx)/rl<1e-7;});assert.ok(matches.length);
  const half=Math.max(...matches.map(r=>r[4]/2/(Math.abs(ux*(r[3]-r[1])-uy*(r[2]-r[0]))/Math.hypot(r[2]-r[0],r[3]-r[1]))));
  const kind=g.cross[0].kind;if(kind==='ferry'){assert.equal(g.lines.length,2);near(Math.hypot(g.lines[0].x2-cx,g.lines[0].y2-cy),half);near(Math.hypot(g.lines[1].x1-cx,g.lines[1].y1-cy),half);}if(kind==='ford'){const wet=g.lines.find(l=>l.opacity===.42);near(Math.hypot(wet.x2-wet.x1,wet.y2-wet.y1),2*half);}if(kind==='bridge'){assert.equal(g.rails.length,2);for(const rail of g.rails){const [a,b]=rail.split(' ').map(s=>s.split(',').map(Number));assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>2*half);}}
  const saved=fixture.map.crossings.find(c=>c.key===g.cross[0].key);assert.equal(kind,saved.kind);result.crossings.push({key:g.cross[0].key,kind,halfgap:half});
 }
 assert.equal(result.crossings.length,7);assert.ok(result.crossings.some(c=>c.kind==='ford'));assert.ok(result.crossings.some(c=>c.kind==='ferry'));
 // A real sixfold DOM-width defect must be detected by width parity assertion.
 await page.locator('[data-fine-world] .river-polyline').evaluateAll(ns=>ns.forEach(n=>n.setAttribute('stroke-width',+n.getAttribute('stroke-width')/6)));let caught=false;try{assert.deepEqual(await lines(),native);}catch{caught=true;}assert.ok(caught);result.widthMutationDetected=caught;await step.selectOption('6');await step.selectOption('1');
 for(const mode of ['tiles','emoji','color']){assert.equal(await page.locator('button.biome-display-toggle').getAttribute('data-mode'),mode);if(mode==='color')await page.locator('.rotate-map-button').click();
 const expected=await page.locator('[data-fine-world]').evaluate(paint);await page.evaluate(()=>window.__svg=null);const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'PNG',exact:true}).click()]);const bytes=await fs.readFile(await download.path());await page.waitForFunction(()=>window.__svg);const svg=await page.evaluate(()=>window.__svg);await fs.writeFile(new URL(`export-${mode}.svg`,out),svg);await fs.writeFile(new URL(`export-${mode}.png`,out),bytes);
 const exported=await page.evaluate(({svg,body})=>{const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),el=doc.querySelector('[data-fine-world]');return {paint:(0,eval)('('+body+')')(el),editor:doc.querySelectorAll('[data-editor-only]').length,parse:doc.querySelectorAll('parsererror').length};},{svg,body:paint.toString()});assert.deepEqual(exported.paint,expected);assert.equal(exported.editor,0);assert.equal(exported.parse,0);assert.ok(bytes.readUInt32BE(16)>100);result.png.push({mode,paintParity:true,bytes:bytes.length,labels:expected.labels.length});await page.locator('button.biome-display-toggle').click();}
 await page.locator('.rotate-map-button').click();
 for(const width of [1500,390,320]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:new URL(`actual-${width}.png`,out).pathname,fullPage:true});result.profiles.push({width,noPageOverflow:true});}
 await step.selectOption('6');assert.deepEqual(await lines(),native);const after=await snapshot();assert.deepEqual(after,before);assert.deepEqual(errors,[]);result.documentAndRngUnchanged=true;result.native6ReturnParity=true;result.status='pass';
}finally{if(browser)await browser.close();server.kill();result.ended_at=new Date().toISOString();await fs.writeFile(new URL('results.json',out),JSON.stringify(result,null,2));}
console.log(JSON.stringify(result,null,2));
