import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../',import.meta.url).pathname,out=root+'reports/HX-FB-001/';
await fs.mkdir(out,{recursive:true});
const servers=[['baseline',4187,process.env.HX_FB_BASE_DIST],['candidate',4188,root+'dist']].map(([variant,port,dist])=>{assert(dist);return spawn(process.execPath,[root+'node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dist],{cwd:root,stdio:['ignore','pipe','inherit']});});
let browser;const rows=[],errors=[];
try {
 await Promise.all(servers.map(s=>new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error(text)),15000);s.stdout.on('data',b=>{text+=b;if(stripVTControlCharacters(text).includes('Local:')){clearTimeout(timer);resolve();}});s.on('error',reject);})));
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 async function open(variant,viewport={width:1500,height:1000}){
  const context=await browser.newContext({viewport,locale:'ru-RU'}),page=await context.newPage();page.setDefaultTimeout(180000);page.on('pageerror',e=>errors.push({variant,error:e.message}));page.on('dialog',d=>d.dismiss());await page.route(/mc\.yandex/,r=>r.abort());
  await page.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(blob){const url=make.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__exported=JSON.parse(t));return;}return click.call(this);};});
  await page.goto('http://127.0.0.1:'+(variant==='baseline'?4187:4188)+'/');
  const ready=()=>page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled&&document.querySelector('.map-stage > svg')?.getAttribute('data-render-phase')==='ready');await ready();
  const seed=()=>page.getByRole('textbox',{name:/Seed мира|World seed/});
  const snapshot=async()=>{await ready();await page.evaluate(()=>window.__exported=null);const m=page.locator('details.export-menu');if(await m.getAttribute('open')===null)await m.locator('summary').click();await page.getByRole('button',{name:'JSON',exact:true}).click();await page.waitForFunction(()=>window.__exported);const d=await page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});if(await m.getAttribute('open')!==null)await m.locator('summary').click();return d;};
  const load=async d=>{await page.locator('input[type=file]').setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await ready();await page.waitForFunction(seed=>document.querySelector('input[inputmode=numeric]').value===String(seed),d.generation.masterSeed);};
  const unit=async()=>{const d=await snapshot(),anchor=d.map.candidateHexes[0]??{q:0,r:0};await page.locator(`polygon.hex.candidate[data-hex-key="${anchor.q},${anchor.r}"]`).dispatchEvent('click');await ready();return snapshot();};
  return {context,page,seed,ready,snapshot,load,unit};
 }
 for(const width of [1500,390])for(const lang of ['ru','en'])for(const variant of ['baseline','candidate']){
  const t=await open(variant,{width,height:width===390?844:1000});
  try{
   if(lang==='en')await t.page.getByRole('button',{name:'Switch to English',exact:true}).click();
   await t.seed().fill('4294967295');await t.seed().press('Tab');await t.seed().scrollIntoViewIfNeeded();
   const stem=`${variant}-${width}-${lang}`;await t.page.screenshot({path:out+stem+'.png'});
   if(variant==='candidate'){
    const layout=await t.seed().evaluate(n=>{const row=n.closest('label'),label=row.querySelector('span'),block=n.closest('.world-seed-control'),transfer=document.querySelector('.controls--transfer'),a=n.getBoundingClientRect(),b=label.getBoundingClientRect(),s=getComputedStyle(n),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=s.font;return {same_row:Math.abs((a.top+a.bottom)/2-(b.top+b.bottom)/2)<1,ordered:a.left>=b.right,after_transfer:transfer.nextElementSibling===block,outside_menu:!n.closest('details'),no_overflow:block.scrollWidth<=block.clientWidth,text_fits:ctx.measureText(n.value).width<=n.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),background:s.backgroundColor};});
    assert(layout.same_row&&layout.ordered&&layout.after_transfer&&layout.outside_menu&&layout.no_overflow&&layout.text_fits,JSON.stringify(layout));assert.equal(layout.background,'rgb(12, 20, 35)');
    await t.seed().focus();await t.page.keyboard.press('Shift+Tab');await t.page.keyboard.press('Tab');assert(await t.seed().evaluate(n=>document.activeElement===n));await t.page.locator('.world-seed-control').screenshot({path:out+stem+'-focus.png'});
    const before=await t.snapshot();
    for(const value of ['', '-1', '1.5', '1e3', '4294967296','abc']){await t.seed().fill(value);await t.seed().press('Tab');assert.equal(await t.seed().getAttribute('aria-invalid'),'true');assert.deepEqual(await t.snapshot(),before);}
    await t.page.locator('.world-seed-control').screenshot({path:out+stem+'-error.png'});
    await t.seed().fill('0');await t.seed().press('Tab');assert.equal(await t.seed().getAttribute('aria-invalid'),null);assert.equal((await t.snapshot()).generation.masterSeed,0);
    const m=t.page.locator('details.export-menu');await m.locator('summary').click();assert(await t.seed().isVisible());assert(await t.page.getByRole('button',{name:'PNG',exact:true}).isVisible());await t.page.screenshot({path:out+stem+'-menu.png'});await m.locator('summary').click();
    rows.push({kind:'layout_and_input',variant,width,lang,...layout,invalid_inputs:6,valid_boundaries:true});
   }
  }finally{await t.context.close();}
 }
 for(const mode of ['classic','mythic']){
  const a=await open('baseline'),b=await open('candidate');
  try{
   for(const t of [a,b]){await t.seed().fill('123456789');await t.seed().press('Tab');await t.page.getByRole('combobox',{name:'Режим',exact:true}).selectOption(mode);if(mode==='classic'){await t.page.locator('.gen-params select').nth(0).selectOption('locality');await t.page.locator('.gen-params select').nth(3).selectOption('mainland');}}
   const first=await a.unit();assert.deepEqual(await b.unit(),first);assert(await b.seed().evaluate(n=>n.readOnly));await b.page.locator('.world-seed-control').screenshot({path:out+mode+'-readonly.png'});
   const second=await a.unit();assert.deepEqual(await b.unit(),second);
   await b.page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await b.snapshot(),first);
   await b.page.getByRole('button',{name:'Повторить',exact:true}).click();assert.deepEqual(await b.snapshot(),second);
   await b.load(first);assert.deepEqual(await b.snapshot(),first);assert.deepEqual(await b.unit(),second);
   await b.page.getByRole('button',{name:'Сбросить',exact:true}).click();await b.ready();assert(!(await b.seed().evaluate(n=>n.readOnly)));assert.equal(await b.seed().inputValue(),String((await b.snapshot()).generation.masterSeed));
   rows.push({kind:'semantic_roundtrip',mode,first_equal:true,next_equal:true,undo_redo:true,import_continuation:true,reset_sync:true});
  }finally{await a.context.close();await b.context.close();}
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',rows,browser:browser.version()}));
}catch(e){errors.push({fatal:String(e),stack:e.stack});console.error(e);process.exitCode=1;}
finally{await fs.writeFile(out+'result.json',JSON.stringify({rows,errors},null,2)+'\n');await browser?.close();servers.forEach(s=>s.kill());}
