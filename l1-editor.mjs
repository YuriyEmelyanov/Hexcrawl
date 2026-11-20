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
import {createGenerationState} from './src/worldRandom.ts';
import {newKnaveLayer} from './src/knaveClassic.ts';
import {knaveContentFixture} from './test/helpers/knave-fixture.mjs';
const afterPaint=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function bind(d){
 await fresh();await page.locator('input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});
 await page.locator('polygon.hex.region').first().waitFor();await button('Edit').waitFor();
}
async function run(op,i){
 const d=op==='water'?JSON.parse(await readFile('test/fixtures/e6-water-editor.json')):regionFixture('classic',{river:op==='region'});
 if(op==='water')d.ui.selectedHex={q:0,r:0};
 if(op==='difficulty'||op==='discovery'||op==='reroll'){
  d.version=10;d.generation=createGenerationState(42);d.map.seas=[];d.map.nextSeaId=1;d.map.editorNames={};d.map.knave=newKnaveLayer();
  d.map.regions[0].pointOfInterestKinds['2,0']='ruins';d.map.knave.content=knaveContentFixture('poi:1:2,0');
  d.map.biomeOverrideByHexKey['2,0']='plain_coniferous_forest';
 }
 await bind(d);
 const before=await snapshot();
 let ms;
 if(op==='reroll'){
  const die=page.locator('[data-knave-part="trait"] .tag-die');
  const previous=before.map.knave.content.rollCounters['poi:1:2,0'].trait;
  const t=performance.now();await input(die);await afterPaint();ms=performance.now()-t;
  const after=await snapshot(),saved=after.map.knave.content;
  assert.equal(saved.rollCounters['poi:1:2,0'].trait,previous+1);
  assert.deepEqual(before.map.knave.content.byPoi['poi:1:2,0'].site,saved.byPoi['poi:1:2,0'].site);
  assert.deepEqual(before.generation,after.generation);await history(before,after);await reopen(after.doc);
  return {id:op,iteration:i,ms,pass:true};
 }
 await input(button('Edit'));
 if(op==='region'){
  await input(page.getByRole('button',{name:/^Transfer hex to region/}));
  await page.locator('[data-region-transfer]').selectOption('2');
 }else if(op==='water'){
  await page.getByLabel('Surface',{exact:true}).selectOption('lake');
  await page.getByLabel('Add or remove cell',{exact:true}).selectOption('1,0');
 }else if(op==='difficulty'){
  await page.locator('[data-knave-panel] select').filter({has:page.locator('option[value="difficult"]')}).selectOption('difficult');
 }else if(op==='discovery'){
  await page.locator('[data-knave-panel] select').filter({has:page.locator('option[value="interaction"]')}).selectOption('interaction');
  await page.getByRole('textbox',{name:'Clue',exact:true}).fill('Tracks stop at the cliff.');
 }
 const t=performance.now();await input(button('Done'));await button('Edit').waitFor();await afterPaint();ms=performance.now()-t;
 const after=await snapshot();assert.deepEqual(after.generation,before.generation);
 if(op==='region'){
  const owners=after.map.regions.filter(r=>r.hexes.some(h=>h.q===2&&h.r===0));assert.deepEqual(owners.map(r=>r.id),[2]);
  assert.deepEqual(after.map.candidateHexes,before.map.candidateHexes);
  for(const r of after.map.regions){const remaining=new Set(r.hexes.map(h=>h.q+','+h.r));const queue=[r.hexes[0]];remaining.delete(queue[0].q+','+queue[0].r);while(queue.length){const h=queue.pop();for(const [a,b] of [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]])if(remaining.delete((h.q+a)+','+(h.r+b)))queue.push({q:h.q+a,r:h.r+b});}assert.equal(remaining.size,0);}
 }else if(op==='water'){const a=after.map.terrainByHexKey['0,0'].lakeId;assert.ok(a);assert.equal(a,after.map.terrainByHexKey['1,0'].lakeId);assert.deepEqual(after.map.gmNotesByHexKey,before.map.gmNotesByHexKey);}
 else if(op==='difficulty'){
  const expect=structuredClone(before.map);expect.knave.difficultyByHex['2,0']='difficult';assert.deepEqual(after.map,expect);
 }else if(op==='discovery'){
  const expect=structuredClone(before.map);expect.knave.discoveryByPoi['poi:1:2,0']={mode:'interaction',clueText:'Tracks stop at the cliff.'};assert.deepEqual(after.map,expect);
 }
 await history(before,after);await reopen(after.doc);return {id:op,iteration:i,ms,pass:true};
}
for(const op of ['water','region','difficulty','discovery','reroll']){
 for(let i=0;i<20;i++){try{records.push(await run(op,i));}catch(e){records.push({id:op,iteration:i,error:e.message.slice(0,900)});break;}}
}
console.log('L1_EDITOR '+JSON.stringify({profile,version:browser.version(),records}));
await writeFile('l1-editor-'+profile+'.json',JSON.stringify({profile,version:browser.version(),records},null,2));await browser.close();
