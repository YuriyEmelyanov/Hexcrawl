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
async function continuation(i){
 const [seed,,n1,n2,xy]=ref.extension[i];await fresh();
 await page.getByRole('combobox',{name:'Size',exact:true}).selectOption('locality');await page.getByRole('combobox',{name:'Biome',exact:true}).selectOption('dunes');
 const f=page.getByLabel('World seed');await f.fill(String(seed));await f.press('Tab');
 const ms1=await tapHex('0,0'), first=await snapshot();shape(first.doc);assert.equal(first.map.regions[0].hexes.length,n1);
 const ms2=await tapHex(xy), second=await snapshot();shape(second.doc);
 assert.deepEqual(second.map.regions[0],first.map.regions[0]);assert.equal(second.map.regions.flatMap(r=>r.hexes).length,n2);
 const historyMs=[];
 for(const [action,expected,oldCount] of [['Undo',first,n2],['Redo',second,n1]]){
  const t=performance.now();await input(button(action));
  await page.waitForFunction(n=>document.querySelectorAll('polygon.hex.center,polygon.hex.region').length!==n,oldCount);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  historyMs.push(performance.now()-t);const v=await snapshot();
  assert.deepEqual(v.map,expected.map);assert.deepEqual(v.generation,expected.generation);
 }
 await reopen(first.doc);
 await page.getByRole('combobox',{name:'Size',exact:true}).selectOption('locality');await page.getByRole('combobox',{name:'Biome',exact:true}).selectOption('dunes');
 const ms3=await tapHex(xy), again=await snapshot();assert.deepEqual(again.map,second.map);assert.deepEqual(again.generation,second.generation);
 return {id:'continuation',iteration:i,create:ms1,extend:ms2,repeat:ms3,history:historyMs,pass:true};
}
async function recovery(i){
 const old=JSON.parse(await readFile('test/fixtures/import-v2/baseline-classic.json'));
 const name='QA recovery '+i;
 old.map.toponyms.names['region:1']={...old.map.toponyms.names['region:1'],en:name,ru:name};
 await fresh();const loaded=()=>page.locator('polygon.hex.center,polygon.hex.region').first().waitFor();
 const migration=await load(old,loaded);
 const first=await snapshot();assert.equal(first.map.toponyms.names['region:1'].en,name);
 assert.equal(first.map.regions.length,old.map.regions.length);
 assert.deepEqual(first.map.regions.map(r=>r.hexes),old.map.regions.map(r=>r.hexes));
 assert(first.doc.version>old.version);
 await fresh();const roundtrip=await load(first.doc,loaded);const second=await snapshot();
 assert.deepEqual(first.map,second.map);assert.deepEqual(first.generation,second.generation);
 const msgs=[],rejections=[];
 page.on('dialog',capture);
 function capture(d){msgs.push(d.message());void d.dismiss();}
 try{
 for(const bad of ['{',JSON.stringify({...first.doc,version:9999})]){
   const n=msgs.length;const t=performance.now();
   await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(bad)});
   await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
   const after=await snapshot();assert.equal(msgs.length,n+1);assert.match(msgs.at(-1),/Failed to load JSON/i);
   rejections.push(performance.now()-t);assert.deepEqual(after.map,first.map);assert.deepEqual(after.generation,first.generation);
 }
 }finally{page.off('dialog',capture);}
 return {id:'recovery',iteration:i,migration,roundtrip,rejections,pass:true};
}
const settlement='poi:1:2,0';
const services='Black market: buys treasure; guild unknown. Watch: bribes unknown, patrols the square at night. Temple: wounds treated; disease and resurrection unknown. Lodging: unknown. Rumours: notice board at the gate.';
const examples=[
 {id:'DND5-2014-003-L1-v2-draft',kind:'biome',value:'open_hills'},
 {id:'PF2-RM-126-L1-v2',kind:'biome',value:'plain_coniferous_forest'},
 {id:'PF2-RM-ST-009-v2',kind:'poi',value:'village',name:'Ольховка'},
 {id:'ROOT-TO-001-L1',kind:'note',name:'Ольховый брод',initial:'Спор о мельнице. У закрытых ворот толпа.',value:'Спор о мельнице. У ворот дежурит один стражник.'},
 {id:'OSE-ORR-2026-006-L1',kind:'note',name:'Alder Ford',initial:services,value:services.replace('Lodging: unknown','Lodging: none')},
 {id:'SD-CORE-043-L1',kind:'name',type:'tower',initial:'Source rows 3/7/13. Optional adventure hook: rescue.',value:'Чёрная Башня у лесного болота'},
 {id:'OSE-ORR-2026-004-L1',kind:'note',name:'Alder Ford',initial:'Town on the outer edge. Reed ponds.',value:'Town on the outer edge. Reed ponds. Starting base chosen by the GM.'}
];
async function runCase(c,iteration) {
 const d=regionFixture();
 const r=d.map.regions[0];
 if(c.kind==='biome'){
  for(const region of d.map.regions){region.biomeId='deciduous_woodland';region.heightLevel=1;}
  d.map.biomeOverrideByHexKey={};
 } else {
  r.pointOfInterestKinds['2,0']=c.type||'town';
  if(c.initial)d.map.gmNotesByHexKey['2,0']=c.initial;
  if(c.kind!=='name')d.map.toponyms.names[settlement]={en:c.kind==='poi'?'Earlier Town':(c.name||'Tower'),ru:'Прежнее имя',kind:'settlement',model:'germanic',revision:1};
 }
 await fresh();
 await page.locator('input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});
 await page.locator('polygon.hex.region').first().waitFor();
 const before=await snapshot();
 if(!await button('Edit').count())throw Error('Imported selection missing');
 await input(button('Edit'));
 const samples=[];
 async function change(apply,ready){
  const t=performance.now();await apply();await ready();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  samples.push(performance.now()-t);
 }
 async function rename(value){
  await input(page.locator('[data-name-key="'+settlement+'"]').first());
  const name=page.getByRole('textbox',{name:'Name',exact:true});
  await name.fill(value);await change(()=>name.press('Enter'),()=>page.getByRole('button',{name:'Name: '+value,exact:true}).first().waitFor());
 }
 if(c.kind==='note'){
  await input(page.locator('button.gm-notes__text'));
  const note=page.getByRole('textbox',{name:'GM notes',exact:true});
  const t=performance.now();await note.fill(c.value);await note.press('Tab');
  await page.locator('button.gm-notes__text').filter({hasText:c.value}).waitFor();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  samples.push(performance.now()-t);
 }else if(c.kind==='name'){await rename(c.value);}
 else{
  const title=c.kind==='poi'?'Edit point of interest':'Edit hex biome';
  const action=button(title).first();
  await input(action);const sel=page.getByRole('combobox',{name:c.kind==='poi'?'Choose a point of interest':title,exact:true});
  await change(()=>sel.selectOption(c.value),()=>action.waitFor({state:'visible'}));
 }
 const intermediate=await snapshot();
 if(c.kind==='poi'){
  assert.equal(intermediate.map.regions[0].pointOfInterestKinds['2,0'],c.value);
  assert.deepEqual(intermediate.map.roads,before.map.roads);
  await history(before,intermediate);
  if(await button('Edit').count())await input(button('Edit'));
  await rename(c.name);
 }
 const after=await snapshot();
 assert.deepEqual(before.generation,after.generation);
 const expected=structuredClone(before.map);
 if(c.kind==='biome')expected.biomeOverrideByHexKey['2,0']=c.value;
 if(c.kind==='note')expected.gmNotesByHexKey['2,0']=c.value;
 if(c.kind==='name'||c.kind==='poi'){
  const v=after.map.editorNames[settlement];assert.equal(v.en,c.name||c.value);
  if(c.kind==='poi')expected.regions[0].pointOfInterestKinds['2,0']=c.value;
  expected.editorNames={...expected.editorNames,[settlement]:v};
 }
 assert.deepEqual(after.map,expected);
 await history(c.kind==='poi'?intermediate:before,after);await reopen(after.doc);
 return {id:c.id,iteration,ms:Math.max(...samples),samples,pass:true};
}

for(const [name,fn] of [['continuation',continuation],['tower',i=>runCase(examples.find(x=>x.kind==='name'),i)]]){
 for(let i=0;i<20;i++){try{records.push(await fn(i));}catch(e){records.push({id:name,iteration:i,error:e.message.slice(0,1000)});break;}}
}
console.log('L1_FINAL '+JSON.stringify({profile,version:browser.version(),records}));
await writeFile('l1-final-'+profile+'.json',JSON.stringify({profile,version:browser.version(),records},null,2));await browser.close();
