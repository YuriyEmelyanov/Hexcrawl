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
   window.structuredClone=function(value){if(window.__failNamePreparation&&value?.regions&&value?.toponyms){window.__failNamePreparation=false;throw Error('injected rename preparation');}if(window.__failPreparation&&value?.schema==='hexcrawl-map'){window.__failPreparation=false;throw Error('injected before import commit');}return clone(value);};
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
 async function ensureEdit(){const edit=button('Редактировать');if(await edit.count())await edit.click();}
 async function biome(kind){await ensureEdit();await button('Изменить биом гекса').click();await page.getByRole('combobox',{name:'Изменить биом гекса',exact:true}).selectOption(kind);}
 async function poi(kind){
   await ensureEdit();await button('Редактировать точку интереса').first().click();
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
 { // DE-AC01–04/06/10: replace superseded paired-form workflow in this existing lifecycle.
 const out=new URL('reports/HX-BL-023-direct/',root);await fs.mkdir(out,{recursive:true});
 const info=page.locator('.info-block--hex'), namesSection=page.locator('.map-names');
 const input=()=>page.getByRole('textbox',{name:/^(Название|Name)$/});
 const namesFixture=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-mythic.json',import.meta.url)));
 namesFixture.map.kingdoms[0].name.en='  '+ 'L'.repeat(90)+'  ';
 namesFixture.map.gmNotesByHexKey={'3,6':'Авторская заметка перед поиском'};
 await load(namesFixture);
 assert.equal(await info.locator('button').filter({hasText:/✎|✏|🗑/}).count(),0,'no scattered tools in read mode');
 assert.equal(await button('Найти объект').getAttribute('aria-expanded'),'false');
 assert.equal(await namesSection.evaluate(el=>el.parentElement.lastElementChild===el),true,'find object follows info and notes');
 await ensureEdit();assert.equal(await info.locator('.direct-mode').count(),1);
 assert.equal(await info.locator('.direct-value').count()>0,true);
 assert.equal(await info.locator('.direct-value').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height>=44)),true,'editable values have44px touch targets');
 assert.equal(await info.locator('.direct-mode').evaluate(e=>e.getBoundingClientRect().height>=44),true);
 await info.locator('[data-name-key]').first().click();await input().fill('Незавершено');await input().press('Escape');
 assert.equal(await input().count(),0);assert.equal(await namesSection.locator('.map-names__list').count(),0,'direct editing does not open catalog');
 await button('Найти объект').click();
 const openNamed=async type=>{await namesSection.getByRole('combobox',{name:/^(Тип объекта|Object type)$/}).selectOption(type);await namesSection.locator('[data-name-key]').first().click();await input().waitFor();};
 for(const type of ['region','settlement','river','lake','kingdom']) {
   for(const locale of ['ru','en']) {
     if(locale==='en')await button('Switch to English').click();
     const before=await snapshot();await openNamed(type);const value=(locale==='ru'?'Автор ':'Author ')+type;
     await input().fill(value);await input().press('Enter');
     const after=await snapshot(),expected=structuredClone(before);
     if(type==='kingdom')expected.map.kingdoms[0].name[locale]=value;
     else {const key=Object.keys(after.map.toponyms.names).find(k=>JSON.stringify(after.map.toponyms.names[k])!==JSON.stringify(before.map.toponyms.names[k]));assert.ok(key?.startsWith(type+':'));expected.map.toponyms.names[key][locale]=value;}
     assert.deepEqual(after,expected,'single locale '+type+'/'+locale);
     await button(locale==='ru'?'Отменить':'Undo').click();assert.deepEqual(await snapshot(),before);
     await button(locale==='ru'?'Повторить':'Redo').click();assert.deepEqual(await snapshot(),after);
     if(locale==='en')await button('Переключить на русский').click();
   }
 }
 // Invalid input blocks departure, stays inline; Escape/no-op keep both stacks.
 const before=await snapshot();await openNamed('region');const current=await input().inputValue();
 for(const value of ['', 'x'.repeat(81), Object.values(before.map.toponyms.names).find(n=>n.ru!==current).ru]) {
   await input().fill(value);await input().press('Enter');assert.equal(await input().getAttribute('aria-invalid'),'true');
   await input().press('Tab');assert.equal(await input().evaluate(e=>e===document.activeElement),true,'invalid field retains keyboard focus');
   await button('Готово').click();assert.equal(await button('Готово').count(),1);assert.equal(await input().count(),1);
 }
 await input().press('Escape');assert.deepEqual(await snapshot(),before);
 await openNamed('region');await input().fill('  '+current+'  ');await input().press('Enter');assert.deepEqual(await snapshot(),before);
 await openNamed('region');await input().fill('Ошибка подготовки');await page.evaluate(()=>window.__failNamePreparation=true);await input().press('Enter');
 assert.match(await page.getByRole('alert').innerText(),/Карта не изменена/);await input().press('Escape');assert.deepEqual(await snapshot(),before);
 // Language changes complete the OLD captured locale, not the new one.
 await openNamed('region');await input().fill('Смена языка');await button('Switch to English').click();
 const switched=await snapshot(),changed=Object.keys(switched.map.toponyms.names).find(k=>switched.map.toponyms.names[k].ru!==before.map.toponyms.names[k].ru);
 assert.equal(switched.map.toponyms.names[changed].ru,'Смена языка');assert.equal(switched.map.toponyms.names[changed].en,before.map.toponyms.names[changed].en);
 await button('Переключить на русский').click();
 await button('Найти объект').click();
 // Region edit is the region value, not a scope radio or a separate panel.
 await info.getByRole('button',{name:'Местность региона',exact:true}).click();
 const options=await info.getByRole('combobox',{name:'Местность региона',exact:true}).locator('option').evaluateAll(es=>es.map(e=>({value:e.value,disabled:e.disabled})));
 assert.ok([6,12].includes(options.length));await info.getByRole('combobox',{name:'Местность региона',exact:true}).press('Escape');await info.locator('.direct-mode').click();
 const saved=await snapshot();await load(saved);assert.deepEqual(await snapshot(),saved);
 // Actual UI evidence: read/edit/active at desktop and390px, RU/EN.
 await info.scrollIntoViewIfNeeded();await page.locator('#side-panel-info').screenshot({path:fileURLToPath(new URL('desktop-view.png',out))});
 await ensureEdit();await page.locator('#side-panel-info').screenshot({path:fileURLToPath(new URL('desktop-edit.png',out))});
 await info.locator('[data-name-key]').first().click();await page.locator('#side-panel-info').screenshot({path:fileURLToPath(new URL('desktop-input.png',out))});await input().press('Escape');
 await page.setViewportSize({width:390,height:1000});await info.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('narrow-edit.png',out))});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'390 no overflow');
 if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
 await button('Switch to English').click();await info.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('narrow-en.png',out))});
 await button('Переключить на русский').click();await page.setViewportSize({width:1500,height:1100});
 console.log('HX023 direct edit: five types/two locales, legacy preservation, Enter/Escape/invalid/fault, language completion, actual desktop/390 passed.');
 }
 // HX-BL-024: one bounded real-React editor lifecycle, reusing import/select/export helpers.
 await fs.mkdir(new URL('reports/HX-BL-024/',root),{recursive:true});
 // UI-05 regression: a valid water-only document has no region, but must expose notes.
 const waterOnly=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-empty.json',import.meta.url)));
 waterOnly.map.terrainByHexKey={'-1,0':{terrainOverride:'sea'}};waterOnly.ui.selectedHex={q:-1,r:0};
 async function openNotes(){
   await ensureEdit();
   if(!await page.locator('#gm-notes-text').count())await page.locator('.gm-notes .direct-value').click();
   return page.locator('#gm-notes-text');
 }
 await load(waterOnly);await (await openNotes()).fill('Sea 🗝');
 assert.equal((await snapshot()).map.gmNotesByHexKey['-1,0'],'Sea 🗝');
 await load(fixture);
 const noteHex=fixture.map.regions[0].hexes[0], noteKey=`${noteHex.q},${noteHex.r}`;
 const other=fixture.map.regions[0].hexes.find(h=>`${h.q},${h.r}`!==noteKey);
 await select(noteKey);assert.equal(await page.locator('#gm-notes-text').count(),0);
 await ensureEdit();await page.locator('.gm-notes .direct-value').scrollIntoViewIfNeeded();
 await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-empty.png',root))});
 const cleanNotes=await snapshot(), noteText='  🗝 <b>Жрец пропал</b>\nСледы ведут к броду.  ';
 await openNotes();assert.equal(await page.locator('#gm-notes-text').evaluate(e=>e===document.activeElement),true);
 await page.locator('#gm-notes-text').press('Escape');assert.deepEqual(await snapshot(),cleanNotes,'empty open-close no transaction');
 const notes=await openNotes();await notes.fill(noteText);await notes.press('Enter');await notes.press('Backspace');
 assert.equal(await notes.inputValue(),noteText);

 await notes.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-editor.png',root))});
 // No debounce wait: selection/export must retain the final character.
 await select(`${other.q},${other.r}`);assert.equal(await page.locator('#gm-notes-text').count(),0);
 await select(noteKey);assert.equal(await page.locator('.gm-notes__text').textContent(),noteText);
 const savedNotes=await snapshot();assert.equal(savedNotes.version,4);assert.equal(savedNotes.map.gmNotesByHexKey[noteKey],noteText);
 const stripNotes=d=>{d=structuredClone(d);delete d.map.gmNotesByHexKey;return d;};
 assert.deepEqual(stripNotes(savedNotes),stripNotes(cleanNotes));
 assert.equal(await page.locator('svg').first().textContent().then(s=>s.includes('Жрец пропал')),false);
 assert.equal(await button('Сохранить').count(),0);assert.equal(await button('Отменить изменения').count(),0);
 await button('Отменить').click();assert.deepEqual(await snapshot(),cleanNotes);
 // Net-zero input in one unbroken series must restore the existing redo branch.
 await openNotes();await notes.fill('temporary');await notes.fill('');await page.locator('#gm-notes-text').press('Escape');
 assert.equal(await button('Повторить').isEnabled(),true);
 await button('Повторить').click();assert.deepEqual(await snapshot(),savedNotes);
 // Distinct500ms series undo as units. IME composition stays one history group.
 await openNotes();await notes.fill(noteText+'A');await page.waitForTimeout(550);await notes.fill(noteText+'AB');
 await button('Отменить').click();assert.equal((await snapshot()).map.gmNotesByHexKey[noteKey],noteText+'A');
 await button('Отменить').click();assert.deepEqual(await snapshot(),savedNotes);
 await openNotes();await notes.dispatchEvent('compositionstart');await notes.fill(noteText+'中');await page.waitForTimeout(550);await notes.fill(noteText+'中文');await notes.dispatchEvent('compositionend');
 await button('Отменить').click();assert.deepEqual(await snapshot(),savedNotes);
 await openNotes();await button('Switch to English').click();await page.locator('.gm-notes .direct-value').click();await notes.scrollIntoViewIfNeeded();
 await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-en.png',root))});
 await page.setViewportSize({width:390,height:844});await notes.scrollIntoViewIfNeeded();
 await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/narrow-en.png',root))});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=390),true);
 await page.setViewportSize({width:1500,height:1100});await button('Переключить на русский').click();await openNotes();
 await page.evaluate(()=>window.__delayRead=true);
 await page.locator('input[type=file]').setInputFiles({name:'notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(savedNotes))});
 await page.waitForFunction(()=>window.__releaseRead!==undefined);
 assert.equal(await notes.count()===0 || await notes.isDisabled(),true,'busy import closes or disables previous field');
 await page.locator('.gm-notes').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/desktop-busy.png',root))});
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
   await select(`${hex.q},${hex.r}`);await (await openNotes()).fill('keep');
 }
 const conflictBefore=await snapshot();
 await page.locator('.gen-params select').nth(0).selectOption('locality');
 await button('Перегенерировать регион').click();
 const conflictAlert=page.getByRole('alert').filter({hasText:'Сначала перенесите или очистите заметки'});
 await conflictAlert.waitFor();const conflictText=await conflictAlert.textContent();
 assert.match(conflictText,/\(19\)/);assert.match(conflictText,/-?\d+,-?\d+/);assert(!conflictText.includes('Можно повторить попытку'));
 assert.deepEqual(await snapshot(),conflictBefore,'notes-loss refusal preserves whole map and RNG');
 await conflictAlert.scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL('reports/HX-BL-024/conflict-ru.png',root))});
 if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
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
 await select('1,0');await transaction(()=>biome('open_hills'));await transaction(()=>biome(''));
 await transaction(()=>poi('ruins'));await transaction(()=>poi('lair'));await transaction(()=>poi(''));
 await select('0,0');await transaction(()=>poi('city'));
 await select('0,1');await transaction(()=>poi('underwater_ruins'));await transaction(()=>poi('rocks'));await transaction(()=>poi(''));
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
   else if([2,17].includes(step))await biome('');
   else if(step===3)await poi('ruins');else if(step===4)await poi('lair');
   else if([5,10].includes(step))await poi('');
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
 if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
 await button('Switch to English').click();assert.equal(await button('Undo').count(),1);assert.equal(await button('Redo').count(),1);
 assert.deepEqual(errors,[]);assert.equal(alerts.length,5,'only intentional invalid imports');
 console.log(`Save/history acceptance passed in ${browser.version()}: full corpus, manual families, 100 mixed UI undo/redo, failures, serialization, classic/Mythic checkpoints, RU/EN.`);
} finally {if(browser)await browser.close();server.kill();}
