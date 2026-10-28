import {createGenerationState} from '../../src/worldRandom.ts';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../../',import.meta.url);
const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manual-edit-map.json',import.meta.url)));
const manifest=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manifest.json',import.meta.url)));
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4181','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try {
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),10000);server.stdout.on('data',data=>{output+=data;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}), errors=[],alerts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss();});
 await page.route(/mc\.yandex/,route=>route.abort());
 await page.addInitScript(()=>{
   let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   // Observe actual JSON export serialization, suppressing only the OS download
   // for repeated snapshots (Chromium throttles bursts of 300 downloads).
   const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();
   URL.createObjectURL=function(blob){const url=make.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};
   HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(text=>window.__exported=JSON.parse(text));return;}return click.call(this);};
   const clone=window.structuredClone;
   window.structuredClone=function(value){if(window.__failPreparation&&value?.schema==='hexcrawl-map'){window.__failPreparation=false;throw Error('injected before import commit');}return clone(value);};
   const read=FileReader.prototype.readAsText;
   FileReader.prototype.readAsText=function(file){
     if(window.__delayRead){window.__delayRead=false;window.__releaseRead=()=>read.call(this,file);return;}
     if(window.__failRead){window.__failRead=false;queueMicrotask(()=>this.onerror(new ProgressEvent('error')));return;}
     return read.call(this,file);
   };
 });
 await page.goto('http://127.0.0.1:4181/');
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).fill('42');
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).press('Tab');
 const button=name=>page.getByRole('button',{name,exact:true});
 async function snapshot(){
   await page.evaluate(()=>window.__exported=null);
   const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
   await button('JSON').click();await page.waitForFunction(()=>window.__exported!==null);
   return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});
 }
 async function load(data){await page.locator('input[type=file]').setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});await button('Загрузить JSON').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);}
 const select=async key=>page.locator(`polygon.hex[data-hex-key="${key}"]`).dispatchEvent('click');
 async function biome(kind){await button('Изменить биом гекса').click();await page.getByRole('combobox',{name:'Изменить биом гекса',exact:true}).selectOption(kind);}
 async function poi(kind){
   if(await button('Редактировать точку интереса').count())await button('Редактировать точку интереса').first().click();
   else await button('Добавить точку интереса').click();
   await page.getByRole('combobox',{name:'Выберите точку интереса',exact:true}).selectOption(kind);
 }
 async function addRegion(){
   const before=await snapshot();const candidates=page.locator('polygon.hex.candidate');const count=await candidates.count();
   for(let i=0;i<count;i++){
     await candidates.nth(i).dispatchEvent('click');await page.waitForFunction(()=>!document.querySelector('.controls--history button').disabled||!!document.querySelector('[role=alert]'));
     const after=await snapshot();if(after.map.regions.length>before.map.regions.length)return after;
     assert.deepEqual(after,before,'failed generation is atomic');
   }
   assert.fail('No candidate could generate a region');
 }
 async function transaction(action){const before=await snapshot();await action();const after=await snapshot();assert.notDeepEqual(after,before);await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);return after;}
 // HX-BL-024: one bounded real-React editor lifecycle, reusing import/select/export helpers.
 await fs.mkdir(new URL('reports/HX-BL-024/',root),{recursive:true});
 // UI-05 regression: a valid water-only document has no region, but must expose notes.
 const waterOnly=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-empty.json',import.meta.url)));
 waterOnly.map.terrainByHexKey={'-1,0':{terrainOverride:'sea'}};waterOnly.ui.selectedHex={q:-1,r:0};
 await load(waterOnly);await page.getByRole('textbox',{name:'Заметки мастера',exact:true}).fill('Sea 🗝');
 await button('Сохранить').click();assert.equal((await snapshot()).map.gmNotesByHexKey['-1,0'],'Sea 🗝');
 await load(fixture);
 const noteHex=fixture.map.regions[0].hexes[0], noteKey=`${noteHex.q},${noteHex.r}`;
 const other=fixture.map.regions[0].hexes.find(h=>`${h.q},${h.r}`!==noteKey);
 await select(noteKey);
 const notes=page.getByRole('textbox',{name:'Заметки мастера',exact:true});
 await notes.scrollIntoViewIfNeeded();
 await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-empty.png',root))});
 const cleanNotes=await snapshot(), noteText='  🗝 <b>Жрец пропал</b>\nСледы ведут к броду.  ';
 await notes.fill(noteText);await notes.press('Enter');await notes.press('Backspace');
 await select(`${other.q},${other.r}`);await button('Отменить').click();
 assert.equal(await notes.inputValue(),noteText);
 await page.getByRole('alert').filter({hasText:'Сохраните или отмените'}).waitFor();
 await notes.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-dirty.png',root))});
 await button('Сохранить').click();const savedNotes=await snapshot();assert.equal(savedNotes.version,4);assert.equal(savedNotes.map.gmNotesByHexKey[noteKey],noteText);
 const stripNotes=d=>{d=structuredClone(d);delete d.map.gmNotesByHexKey;return d;};
 assert.deepEqual(stripNotes(savedNotes),stripNotes(cleanNotes));
 assert.equal(await page.locator('svg').first().textContent().then(s=>s.includes('Жрец пропал')),false);
 await button('Отменить').click();assert.deepEqual(await snapshot(),cleanNotes);
 await notes.fill('cancel');await button('Отменить изменения').click();assert.equal(await button('Повторить').isEnabled(),true);
 await button('Повторить').click();assert.deepEqual(await snapshot(),savedNotes);
 await button('Switch to English').click();await page.getByRole('textbox',{name:'GM notes',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-en.png',root))});
 await page.setViewportSize({width:390,height:844});await page.getByRole('textbox',{name:'GM notes',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/narrow-en.png',root))});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true);
 await page.setViewportSize({width:1500,height:1100});await button('Переключить на русский').click();
 await page.evaluate(()=>window.__delayRead=true);
 await page.locator('input[type=file]').setInputFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(savedNotes))});
 await page.waitForFunction(()=>window.__releaseRead!==undefined);
 assert.equal(await page.getByRole('textbox',{name:'Заметки мастера',exact:true}).isDisabled(),true);
 await page.getByRole('textbox',{name:'Заметки мастера',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-busy.png',root))});
 await page.evaluate(()=>{window.__releaseRead();delete window.__releaseRead;});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 assert.deepEqual(await snapshot(),savedNotes);
 await load(fixture);
 // HIST-05 / HX024-R1: extend editor lifecycle with the natural reviewer reproduction.
 await button('Сбросить').click();
 await page.getByRole('textbox',{name:'Seed мира',exact:true}).fill('42');
 await page.getByRole('textbox',{name:'Seed мира',exact:true}).press('Tab');
 await page.locator('.gen-params select').nth(0).selectOption('region');
 await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
 await button('Перегенерировать регион').waitFor();
 const conflictMap=await snapshot();assert.equal(conflictMap.map.regions[0].hexes.length,27);
 for(const hex of conflictMap.map.regions[0].hexes){
   await select(`${hex.q},${hex.r}`);await page.getByRole('textbox',{name:'Заметки мастера',exact:true}).fill('keep');await button('Сохранить').click();
 }
 const conflictBefore=await snapshot();
 await page.locator('.gen-params select').nth(0).selectOption('locality');
 await button('Перегенерировать регион').click();
 const conflictAlert=page.getByRole('alert').filter({hasText:'Сначала перенесите или очистите заметки'});
 await conflictAlert.waitFor();const conflictText=await conflictAlert.textContent();
 assert.match(conflictText,/\(19\)/);assert.match(conflictText,/-?\d+,-?\d+/);assert(!conflictText.includes('Можно повторить попытку'));
 assert.deepEqual(await snapshot(),conflictBefore,'notes-loss refusal preserves whole map and RNG');
 await conflictAlert.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/conflict-ru.png',root))});
 await button('Switch to English').click();
 const conflictEnglish=page.getByRole('alert').filter({hasText:'Move or clear the notes first'});
 await conflictEnglish.waitFor();assert.match(await conflictEnglish.textContent(),/\(19\)/);
 await conflictEnglish.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/conflict-en.png',root))});
 await button('Переключить на русский').click();await load(fixture);
 // COMP-03/04: the whole corpus, including real bug maps, not a subset.
 for(const entry of manifest.entries){
   const data=JSON.parse(await fs.readFile(new URL(entry.path,root)));await load(data);const saved=await snapshot();
   for(const f of ['regions','rivers','roads','crossings','terrainByHexKey'])assert.deepEqual(saved.map[f],data.map[f],entry.path+' '+f);
   for(const f of ['kingdoms','obstacles','waterPoiByHexKey','biomeOverrideByHexKey'])assert.deepEqual(saved.map[f],data.map[f]??(['kingdoms','obstacles'].includes(f)?[]:{}),entry.path+' '+f);
   if(data.map.toponyms)for(const [key,value]of Object.entries(data.map.toponyms.names))assert.deepEqual(saved.map.toponyms.names[key],value);
   await load(saved);assert.deepEqual(await snapshot(),saved,entry.path+' roundtrip');
   await addRegion();await button('Отменить').click();assert.deepEqual(await snapshot(),saved,entry.path+' undo continuation');
 }
 // F1: exhausted imported counters/IDs must not commit an invalid generation.
 // Explicit category/anchor reproduces the allocation under the saved product RNG.
 await page.locator('.gen-params select').nth(0).selectOption('locality');
 for(const family of ['roadCounter','regionId']) {
   const data=family==='regionId'?structuredClone(fixture):JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-classic.json',import.meta.url)));
   if(family==='regionId')data.map.regions[0].id=Number.MAX_SAFE_INTEGER;
   else {data.counters.nextRoadId=Number.MAX_SAFE_INTEGER;data.generation=createGenerationState(0);}
   await load(data);await select(`${data.map.regions[0].centerHex.q},${data.map.regions[0].centerHex.r}`);
   await biome('open_hills');const edited=await snapshot();await button('Отменить').click();
   const before=await snapshot();
   await page.evaluate(()=>{let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
   await (family==='roadCounter'?page.locator('polygon.hex.candidate[data-hex-key="2,0"]'):page.locator('polygon.hex.candidate').first()).dispatchEvent('click');
   await page.getByRole('alert').waitFor({state:'visible'});
   assert.deepEqual(await snapshot(),before,family+' rollback');
   assert.equal(await button('Повторить').isEnabled(),true,family+' preserves redo');
   await button('Повторить').click();assert.deepEqual(await snapshot(),edited,family+' exact redo');
   await button('Отменить').click();assert.deepEqual(await snapshot(),before,family+' exact undo');
 }
 await page.locator('.gen-params select').nth(0).selectOption('auto');
 await load(fixture);assert.equal(await button('Удалить последний регион').isDisabled(),true);
 await select('1,0');await transaction(()=>biome('open_hills'));await transaction(()=>button('Сбросить биом гекса').click());
 await transaction(()=>poi('ruins'));await transaction(()=>poi('lair'));await transaction(()=>button('Удалить точку интереса').click());
 await select('0,0');await transaction(()=>poi('city'));
 await select('0,1');await transaction(()=>poi('underwater_ruins'));await transaction(()=>poi('rocks'));await transaction(()=>button('Удалить точку интереса').click());
 await transaction(()=>load(fixture));await transaction(()=>button('Сбросить').click());
 // Failed JSON, read and preparation keep A, view, and redo intact; same file can be retried.
 await load(fixture);await select('1,0');await biome('open_hills');await button('Отменить').click();
 let before=await snapshot();assert.equal(await button('Повторить').isDisabled(),false);
 for(const bad of ['{','{"schema":"hexcrawl-map","version":3}',{...fixture,ui:{...fixture.ui,mapScale:'2'}}]){await load(bad);assert.deepEqual(await snapshot(),before);assert.equal(await button('Повторить').isDisabled(),false);}
 await page.evaluate(()=>window.__failPreparation=true);await load(fixture);assert.deepEqual(await snapshot(),before);assert.equal(await button('Повторить').isDisabled(),false);
 await page.evaluate(()=>window.__failRead=true);await load(fixture);assert.deepEqual(await snapshot(),before);
 // A no-op has no effect on redo; selection/export do not make undo steps.
 await button('Повторить').click();await biome('semi_desert');await button('Отменить').click();await biome('open_hills');assert.equal(await button('Повторить').isDisabled(),false);
 await page.locator('input[type=file]').setInputFiles([]);assert.equal(await button('Повторить').isDisabled(),false);
 await biome('semi_desert');assert.equal(await button('Повторить').isDisabled(),true);
 // Slow file read: another file, reset, a map click, and undo are blocked at handlers.
 before=await snapshot();await page.evaluate(()=>window.__delayRead=true);
 await page.locator('input[type=file]').setInputFiles({name:'first.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 assert.equal(await button('Отменить').isDisabled(),true);assert.equal(await button('Сбросить').isDisabled(),true);
 await page.locator('input[type=file]').setInputFiles({name:'second.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
 await page.evaluate(()=>window.__releaseRead());await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 assert.deepEqual((await snapshot()).map.regions,fixture.map.regions);
 // Generation checkpoints retain their meaning after a manual edit.
 await load(fixture);await addRegion();await select('1,0');await biome('open_hills');
 before=await snapshot();const deleted=await transaction(()=>button('Удалить последний регион').click());assert.equal(deleted.map.regions.length,1);
 await button('Отменить').click();assert.deepEqual(await snapshot(),before);
 await transaction(async()=>{await button('Перегенерировать регион').click();await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);});
 // 100 successful mixed UI mutations; navigation happens before each before-snapshot.
 await load(fixture);await button('Сбросить').click();const initial=await snapshot(),befores=[],afters=[];
 for(let i=0;i<100;i++){
   const step=i%20;
   if([1,2,3,4,5,16,17].includes(step))await select('1,0');
   if([6,7,13].includes(step))await select('0,0');
   if([8,9,10].includes(step))await select('0,1');
   befores.push(await snapshot());
   if([0,15].includes(step))await load(fixture);
   else if(step===1)await biome('open_hills');
   else if([2,17].includes(step))await button('Сбросить биом гекса').click();
   else if(step===3)await poi('ruins');else if(step===4)await poi('lair');
   else if([5,10].includes(step))await button('Удалить точку интереса').click();
   else if(step===6)await poi('city');else if(step===7)await poi('village');
   else if(step===8)await poi('underwater_ruins');else if(step===9)await poi('rocks');
   else if([11,19].includes(step))await addRegion();else if(step===12)await button('Удалить последний регион').click();
   else if(step===13)await poi('town');else if([14,18].includes(step))await button('Сбросить').click();
   else if(step===16)await biome('semi_desert');
   afters.push(await snapshot());assert.notDeepEqual(afters[i],befores[i],`successful mutation ${i}`);
 }
 for(let i=99;i>=0;i--){await button('Отменить').click();assert.deepEqual(await snapshot(),befores[i],`undo ${i}`);}
 assert.deepEqual(await snapshot(),initial);
 for(let i=0;i<100;i++){await button('Повторить').click();assert.deepEqual(await snapshot(),afters[i],`redo ${i}`);}
 // Whole Mythic generation, manual edit, delete-last, undo/redo and regenerate.
 await button('Сбросить').click();await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('mythic');
 await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
 await page.waitForFunction(()=>!document.querySelector('.kingdom-progress'),null,{timeout:120000});
 const kingdom=await snapshot();assert.equal(kingdom.map.kingdoms.length,1);const center=kingdom.map.regions[0].centerHex;
 await select(`${center.q},${center.r}`);await biome('open_hills');
 await transaction(()=>button('Удалить последний регион').click());await button('Отменить').click();
 await transaction(async()=>{await button('Перегенерировать регион').click();await page.waitForFunction(()=>!document.querySelector('.kingdom-progress')&&!document.querySelector('.controls--transfer > button').disabled,null,{timeout:120000});});
 await button('Switch to English').click();assert.equal(await button('Undo').count(),1);assert.equal(await button('Redo').count(),1);
 assert.deepEqual(errors,[]);assert.equal(alerts.length,5,'only intentional invalid imports');
 console.log(`Save/history acceptance passed in ${browser.version()}: full corpus, manual families, 100 mixed UI undo/redo, failures, serialization, classic/Mythic checkpoints, RU/EN.`);
} finally {if(browser)await browser.close();server.kill();}
