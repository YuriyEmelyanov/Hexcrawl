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
const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const key=h=>h.q+','+h.r;
const neigh=s=>{const [q,r]=s.split(',').map(Number);return dirs.map(([a,b])=>(q+a)+','+(r+b));};
function flood(start,allowed){
 const found=new Set([start]),todo=[start];
 while(todo.length)for(const k of neigh(todo.pop()))if(allowed(k)&&!found.has(k)){found.add(k);todo.push(k);}
 return found;
}
function shape(doc){
 const all=new Set();
 for(const region of doc.map.regions){
  const land=new Set(region.hexes.map(key));assert.equal(land.size,region.hexes.length);
  assert.equal(flood(key(region.hexes[0]),k=>land.has(k)).size,land.size);
  for(const k of land){assert(!all.has(k));all.add(k);}
 }
 const radius=2+Math.max(...[...all].flatMap(k=>k.split(',').map(Number).map(Math.abs)));
 const out=flood(-radius+','+(-radius),k=>!all.has(k)&&k.split(',').every(n=>Math.abs(Number(n))<=radius));
 assert.equal(out.size+all.size,(radius*2+1)**2);
 const expected=new Set([...all].flatMap(neigh).filter(k=>!all.has(k)));
 assert.deepEqual(new Set(doc.map.candidateHexes.map(key)),expected);
}
async function load(doc,ready){
 const start=performance.now();
 await page.locator('input[type=file]').setInputFiles({name:'qa.json',mimeType:'application/json',buffer:Buffer.from(typeof doc==='string'?doc:JSON.stringify(doc))});
 await ready();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 return performance.now()-start;
}
async function tapHex(xy){
 const cell=page.locator('polygon.hex.candidate[data-hex-key="'+xy+'"]');
 if(touch)await panel(false);
 const t=performance.now();await input(cell);
 await page.locator('polygon.hex.region[data-hex-key="'+xy+'"],polygon.hex.center[data-hex-key="'+xy+'"]').waitFor();
 await page.locator('[data-poi-done]:enabled').waitFor({state:'attached'});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 return performance.now()-t;
}

const rows=[];
for(let i=0;i<20;i++){
 await fresh();await page.getByRole('combobox',{name:'Size',exact:true}).selectOption('locality');
 await page.getByRole('combobox',{name:'Biome',exact:true}).selectOption('mountains');
 const f=page.getByLabel('World seed');await f.fill(String(42+i));await f.press('Tab');
 const ms=await tapHex('0,0');const accepted=await snapshot();assert.equal(accepted.map.regions[0].heightLevel,3);
 assert(accepted.map.rivers.length>0);const segments=new Set();
 for(const r of accepted.map.rivers){assert(r.vertexPath.length>1);for(const s of r.sectors){assert(s.fullness>=1&&s.fullness<=5);for(const edge of s.edgeKeys){assert(!segments.has(edge));segments.add(edge);}}}
 await input(button('Undo'));const undone=await snapshot();assert.equal(undone.map.regions.length,0);assert.equal(undone.map.rivers.length,0);
 await input(button('Redo'));const redone=await snapshot();assert.deepEqual(redone.map,accepted.map);assert.deepEqual(redone.generation,accepted.generation);
 await reopen(accepted.doc);
 rows.push({seed:42+i,ms,rivers:accepted.map.rivers.length,edges:segments.size});
}
const result={profile,version:browser.version(),samples:rows.map(r=>r.ms),rows};
console.log('RIVER_RECEIPT '+JSON.stringify(result));await writeFile('l1-hydro-world-'+profile+'.json',JSON.stringify(result));await browser.close();
