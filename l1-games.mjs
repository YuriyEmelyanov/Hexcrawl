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
const paint=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function prepare(d){
 await fresh();await page.locator('input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});
 await button('Edit').waitFor();
}
async function play(op,iteration){
 let ms;
 if(op==='ruins'){
  const d=JSON.parse(await readFile('test/fixtures/import-v2/baseline-mythic.json'));
  d.ui.selectedHex={q:7,r:0};d.ui.generationMode='mythic';
  await prepare(d);await input(button('Edit'));await input(button('Fill missing tags'));
  const row=page.locator('[data-tag="mb.ruin"]');await row.waitFor();
  const before=await snapshot();await input(row.locator('.tag-text').first());
  const value='The silent battlefield '+iteration;const field=row.locator('.tag-text-input');await field.fill(value);
  const t=performance.now();await field.press('Enter');await row.getByText(value,{exact:false}).first().waitFor();await paint();ms=performance.now()-t;
  const after=await snapshot();const map=structuredClone(after.map);map.tags=before.map.tags;assert.deepEqual(map,before.map);
  const own=i=>i.definitionId==='mb.ruin'&&i.owner.hexKey==='7,0';
  const target=after.map.tags.instances.find(own);assert(JSON.stringify(target.overrides).includes(value));
  assert.deepEqual(after.map.tags.instances.filter(i=>!own(i)),before.map.tags.instances.filter(i=>!own(i)));assert.deepEqual(after.generation,before.generation);
  await history(before,after);await reopen(after.doc);
 }else if(op==='knave-scale'){
  const d=regionFixture();d.version=10;d.generation=createGenerationState(42);d.map.seas=[];d.map.nextSeaId=1;d.map.editorNames={};d.map.knave=newKnaveLayer();d.ui.knaveEnabled=true;
  let low;const times=[];
  for(const zoom of [1,2]){
   d.ui.mapScale=zoom;const t=performance.now();await prepare(d);
   await page.getByText('6 miles / hex',{exact:true}).waitFor();await paint();times.push(performance.now()-t);
   const v=await snapshot();assert.equal(v.doc.ui.mapScale,zoom);assert.equal(v.map.knave.profile.physicalHex.length,6);
   if(low){assert.deepEqual(v.map,low.map);assert.deepEqual(v.generation,low.generation);}low=v;
  }
  ms=Math.max(...times);
 }else{
  const d=regionFixture();d.map.regions[0].pointOfInterestKinds['2,0']='town';d.map.toponyms.names['settlement:1:2,0']={en:'Alder Ford',ru:'Ольховый брод',kind:'settlement',model:'germanic',revision:1};
  for(const [r,k] of [[d.map.regions[0],'0,0'],[d.map.regions[1],'3,0']]){
   const [q,s]=k.split(',').map(Number);r.pointsOfInterest.push({q,r:s});r.pointOfInterestKinds[k]='dungeon';
  }
  d.map.gmNotesByHexKey['0,0']='D1: from Alder Ford, about a day. Miles unknown.';d.ui.selectedHex={q:3,r:0};
  await prepare(d);await input(button('Edit'));const before=await snapshot();
  await input(page.locator('button.gm-notes__text'));
  const value='D2: two days through the marsh from Alder Ford, by GM decision.';
  const note=page.getByLabel('GM notes');const t=performance.now();await note.fill(value);await note.press('Tab');
  await page.locator('.gm-notes__text').filter({hasText:value}).waitFor();await paint();ms=performance.now()-t;
  const after=await snapshot();const expect=structuredClone(before.map);expect.gmNotesByHexKey['3,0']=value;assert.deepEqual(after.map,expect);
  for(const [i,k] of [[0,'0,0'],[1,'3,0']])assert.equal(after.map.regions[i].pointOfInterestKinds[k],'dungeon');
  assert.equal(after.map.regions[0].pointOfInterestKinds['2,0'],'town');assert.deepEqual(after.generation,before.generation);await history(before,after);await reopen(after.doc);
 }
 return {id:op,iteration,ms,pass:true};
}
for(const op of ['ruins','dungeons','knave-scale']){
 for(let i=0;i<20;i++){try{records.push(await play(op,i));}catch(e){records.push({id:op,iteration:i,error:e.message.slice(0,900)});break;}}
}
console.log('L1_GAMES '+JSON.stringify({profile,version:browser.version(),records}));
await writeFile('l1-games-'+profile+'.json',JSON.stringify({profile,version:browser.version(),records},null,2));await browser.close();
