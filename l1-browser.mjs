import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { regionFixture } from './test/helpers/region-fixture.mjs';
const profile = process.argv[2];
const touch = profile === 'portrait';
const ref = JSON.parse(await readFile('l1-seeds.json'));
const browser = await chromium.launch();
const context = await browser.newContext(touch ? { ...devices['Pixel 7'], viewport: {width:393,height:851} } : {viewport:{width:1363,height:936}});
await context.route(/mc\.yandex/, r => r.abort());
const page = await context.newPage();
page.setDefaultTimeout(4500);
const button = name => page.getByRole('button',{name,exact:true});
async function input(l) { if(touch) await l.tap(); else await l.click(); }
async function panel(open) {
 const t = page.locator('.side-panel-toggle');
 if((await t.getAttribute('aria-expanded')==='true')!==open) await input(t);
}
async function fresh() {
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await panel(true);
}
async function snapshot() {
 await panel(true);
 const menu=page.locator('details.export-menu');
 if(await menu.getAttribute('open')===null) await input(menu.locator('summary'));
 const download=page.waitForEvent('download');
 await input(button('JSON'));
 const doc=JSON.parse(await readFile(await (await download).path()));
 if(await menu.getAttribute('open')!==null) await input(menu.locator('summary'));
 return {map:doc.map,generation:doc.generation,doc};
}
async function reopen(doc) {
 await fresh();
 await page.locator('input[type=file]').setInputFiles({name:'qa.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
 await page.locator('polygon.hex.center,polygon.hex.region').first().waitFor();
 const after=await snapshot();
 assert.deepEqual(after.map,doc.map);assert.deepEqual(after.generation,doc.generation);
}
async function history(first,second){
 for(const [action,expected] of [['Undo',first],['Redo',second]]){
  await input(button(action)); const v=await snapshot();
  assert.deepEqual(v.map,expected.map);assert.deepEqual(v.generation,expected.generation);
 }
}
const records=[];
async function measure(seed,op,fn){
 const row={seed,op};records.push(row);
 await fn(row);
 row.pass=true;
}
async function build(seed,xy){
 await fresh();
 await page.getByRole('combobox',{name:'Size',exact:true}).selectOption('locality');
 await page.getByRole('combobox',{name:'Biome',exact:true}).selectOption('dunes');
 const field=page.getByLabel('World seed');await field.fill(String(seed));await field.press('Tab');
 let first,second;
 for(const [op,key] of [['create','0,0'],['extend',xy]]){
  await measure(seed,op,async row=>{
   if(touch)await panel(false);
   const cell=page.locator('polygon.hex.candidate[data-hex-key="'+key+'"]');
   const ready=page.locator('polygon.hex.region[data-hex-key="'+key+'"],polygon.hex.center[data-hex-key="'+key+'"]');
   const start=performance.now();await input(cell);
   await ready.waitFor();await page.locator('[data-poi-done]:enabled').waitFor({state:'attached'});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   row.ms=performance.now()-start;
   const d=await snapshot();
   assert.equal(d.map.regions.length,op==='create'?1:2);
   if(op==='create')first=d;else{second=d;assert.deepEqual(d.map.regions[0],first.map.regions[0]);}
   row.cells=d.map.regions.reduce((n,r)=>n+r.hexes.length,0);
  });
 }
 await history(first,second);await reopen(first.doc);await reopen(second.doc);
}
async function edit(seed){
 const fixture=regionFixture();await fresh();
 await page.locator('input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await page.locator('polygon.hex.region').first().waitFor();
 const before=await snapshot();
 if(touch)await panel(false);
 await input(page.locator('polygon.hex[data-hex-key="2,0"]'));
 await panel(true);await input(button('Edit'));
 const label=page.getByRole('button',{name:/edit hex biome|change hex biome/i});
 await input(label);
 const select=page.getByRole('combobox',{name:/edit hex biome|change hex biome/i});
 await measure(seed,'biome',async row=>{
  const start=performance.now();await select.selectOption('snow_mountains');
  await page.getByRole('button',{name:/edit hex biome|change hex biome/i}).waitFor({state:'visible'});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  row.ms=performance.now()-start;
  const after=await snapshot();
  assert.deepEqual(after.map,{...before.map,biomeOverrideByHexKey:{...before.map.biomeOverrideByHexKey,'2,0':'snow_mountains'}});
  assert.deepEqual(after.generation,before.generation);await history(before,after);await reopen(after.doc);
 });
}
for(const [seed,,, ,key] of ref.extension){
 for(const [name,fn] of [['generate',()=>build(seed,key)],['edit',()=>edit(seed)]]){
  try {await fn()}catch(e){records.push({seed,op:name,error:e.message.slice(0,800)});}
 }
}
console.log('L1_EVIDENCE '+JSON.stringify({profile,touch,version:browser.version(),records}));
await writeFile('l1-'+profile+'.json',JSON.stringify({profile,touch,version:browser.version(),records},null,2));
await browser.close();
