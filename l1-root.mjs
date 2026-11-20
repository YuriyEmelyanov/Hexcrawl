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
const fixtures=[
 ['ROOT-SCOPE-M01','Clearing A, northwest','castle','The Keep'],
 ['ROOT-SCOPE-M02','Clearing B','fort','The Roost'],
 ['ROOT-SCOPE-M03','Clearing A','ruins','Aqueduct'],
 ['ROOT-SCOPE-M04','Clearing A','hut','Warehouse S','Rin works in this warehouse.'],
 ['ROOT-SCOPE-M05','Clearing C','holy_place','Cult Garden'],
 ['ROOT-SCOPE-M06','Clearing D','camp','Riverfolk Trading Post','Supplies are traded here.'],
 ['ROOT-SCOPE-M07','Clearing E','cave','Tunnel entrance T'],
 ['SWC-obs-03','Castle District','castle','Alder Castle'],
 ['DCC-obs-01','Purple Planet plateau wasteland','ruins','Crescent Cliff ruins'],
 ['SALV-obs-02','Salvage field','ruins','Area Salvage: rusted gantry'],
 ['SD-CORE-043-L1','Forest marsh','tower','Black Tower of the Marsh','Site rows: 3/7/13. Optional rescue hook.']
];
const pair=(v,kind)=>({ru:v,en:v,kind,model:'germanic',revision:0});
async function runCase([id,regionName,type,name,note],i){
 const d=regionFixture(),r=d.map.regions[0];
 // The target is an empty land cell in an existing authored region. The other POI remains a distinct entity.
 d.ui.selectedHex={q:1,r:0};
 d.map.toponyms.names['region:1']=pair(regionName,'region');
 d.map.toponyms.names['settlement:1:2,0']=pair('Alder Village','settlement');
 if(id==='ROOT-SCOPE-M03'){r.pointOfInterestKinds['2,0']='mill';delete d.map.toponyms.names['settlement:1:2,0'];}
 if(id==='DCC-obs-01'){r.biomeId='semi_desert';r.heightLevel=1;d.map.biomeOverrideByHexKey={'2,0':'mountains'};}
 await fresh();await page.locator('input[type=file]').setInputFiles({name:'site.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await button('Edit').waitFor();
 const first=await snapshot();assert.equal(first.map.toponyms.names['region:1'].en,regionName);
 assert(first.map.regions[0].hexes.some(h=>h.q===1&&h.r===0));
 assert(!first.map.regions[0].pointOfInterestKinds['1,0']);
 await input(button('Edit'));await input(button('Edit point of interest').first());
 const times=[];
 async function commit(fn,ready){
  const t=performance.now();await fn();await ready();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  times.push(performance.now()-t);
 }
 const key='poi:1:1,0',target=page.locator('[data-name-key="'+key+'"]').first();
 await commit(()=>page.getByRole('combobox',{name:'Choose a point of interest',exact:true}).selectOption(type),()=>target.waitFor());
 const created=await snapshot();assert.equal(created.map.regions[0].pointOfInterestKinds['1,0'],type);
 await history(first,created);if(await button('Edit').count())await input(button('Edit'));
 await input(target);const field=page.getByRole('textbox',{name:'Name',exact:true});await field.fill(name);
 await commit(()=>field.press('Enter'),()=>target.filter({hasText:name}).waitFor());
 let named=await snapshot();assert.equal(named.map.editorNames[key].en,name);
 await history(created,named);
 if(note){
  if(await button('Edit').count())await input(button('Edit'));
  await input(page.locator('button.gm-notes__text'));const n=page.getByLabel('GM notes');
  await commit(async()=>{await n.fill(note);await n.press('Tab');},()=>page.locator('.gm-notes__text').filter({hasText:note}).waitFor());
  const last=await snapshot();await history(named,last);named=last;
 }
 const expected=structuredClone(first.map);
 expected.regions[0].pointsOfInterest.push({q:1,r:0});expected.regions[0].pointOfInterestKinds['1,0']=type;
 expected.editorNames={...expected.editorNames,[key]:named.map.editorNames[key]};
 if(note)expected.gmNotesByHexKey['1,0']=note;
 assert.deepEqual(named.map,expected);assert.deepEqual(named.generation,first.generation);await reopen(named.doc);
 return {id,iteration:i,ms:Math.max(...times),samples:times,pass:true};
}
for(const c of fixtures.filter(c=>['ROOT-SCOPE-M03','ROOT-SCOPE-M04','ROOT-SCOPE-M05','ROOT-SCOPE-M06'].includes(c[0]))){
 for(let i=0;i<20;i++){try{records.push(await runCase(c,i));}catch(e){records.push({id:c[0],iteration:i,error:e.message.slice(0,1200)});break;}}
}
console.log('L1_SITES '+JSON.stringify({profile,version:browser.version(),records}));
await writeFile('l1-sites-'+profile+'.json',JSON.stringify({profile,version:browser.version(),records},null,2));await browser.close();
