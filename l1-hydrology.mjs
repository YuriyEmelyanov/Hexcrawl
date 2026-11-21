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
await fresh();
const fixture=JSON.parse(await readFile('test/fixtures/classic-six-regions-seed42.json'));
await page.locator('input[type=file]').setInputFiles({name:'classic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
await page.waitForFunction(n=>document.querySelectorAll('polygon.hex.center,polygon.hex.region').length>=n,fixture.map.regions.length);
const before=await snapshot(),step=page.locator('[data-fine-step]'),samples=[];
let shape;
for(let i=0;i<20;i++){
 const t=performance.now();await step.selectOption('1');
 const world=page.locator('[data-fine-world]');await world.locator('[data-refined-river]').first().waitFor({state:'attached',timeout:30000});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 samples.push(performance.now()-t);
 const current=await world.evaluate(el=>({crossings:el.querySelectorAll('[data-fine-crossing]').length,paths:[...el.querySelectorAll('[data-refined-river]')].map(n=>({edge:n.dataset.sourceEdge,id:n.dataset.refinedRiver,f:+n.dataset.riverFullness,width:+n.getAttribute('stroke-width'),points:n.getAttribute('points')}))}));
 assert.equal(current.crossings,2);assert(current.paths.length>0);
 for(const path of current.paths){assert(path.edge&&path.id&&path.points.trim().split(/\s+/).length>=2);assert(Math.abs(path.width-Math.sqrt(3)*28/6*path.f/10)<1e-6);}
 if(shape)assert.deepEqual(current,shape);else shape=current;
 await step.selectOption('6');await world.waitFor({state:'detached'});
}
const after=await snapshot();assert.deepEqual(after.map,before.map);assert.deepEqual(after.generation,before.generation);
const result={profile,version:browser.version(),samples,paths:shape.paths.length,crossings:shape.crossings,fullness:[...new Set(shape.paths.map(p=>p.f))]};
console.log('RIVER_RECEIPT '+JSON.stringify(result));await writeFile('l1-hydrology-'+profile+'.json',JSON.stringify(result));await browser.close();
