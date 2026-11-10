import {runEntityNameLifecycle} from './entity-name-lifecycle.mjs';
import {runPoiLifecycle} from './poi-lifecycle.mjs';
import {runWaterLifecycle} from './water-lifecycle.mjs';
import {runRegionLifecycle} from './region-lifecycle.mjs';
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
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(/Будет восстановлено исходное состояние рек|Original river state will be restored|Будет восстановлена вода|The checkpoint water/.test(d.message())){await d.accept();return;}alerts.push(d.message());await d.dismiss();});
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
 await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
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
 { // E5-02: extend this same browser lifecycle; no second corpus/runner.
 await load(fixture);await select('0,0');await ensureEdit();
 const before=await snapshot();
 const png=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const got=page.waitForEvent('download');await button('PNG').click();return fs.readFile(await (await got).path());};
 const confirmedPng=await png();
 await button('Добавить реку').click();
 assert.equal(await page.locator('[data-editor-only="river-draft"]').count(),1);
 for(const name of ['Сбросить','Отменить','Повторить','Загрузить JSON'])assert.ok(await button(name).isDisabled(),name+' blocked by draft');
 await button('Готово').click();assert.equal(await button('Готово').count(),1,'invalid draft blocks Done');
 if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
 await button('Switch to English').click();assert.equal(await button('Switch to English').count(),1,'invalid draft blocks language');
 assert.deepEqual(await snapshot(),before,'JSON excludes draft and leaves it open');assert.equal(await page.locator('[data-editor-only="river-draft"]').count(),1);
 assert.deepEqual(await png(),confirmedPng,'PNG excludes draft targets and path overlays');
 const start='-24.249,14',end='-24.249,-14';
 await page.locator(`[data-river-draft-choice="${start}"]`).press('Enter');
 assert.equal(await page.locator('[data-editor-only="river-draft"] line').count(),0,'Enter on vertex chooses a start, not Done');
 await page.locator(`[data-river-draft-choice="${end}"]`).press('Space');assert.equal(await page.locator('[data-editor-only="river-draft"] line').count(),1);
 const hexBox=await page.locator('polygon.hex[data-hex-key="0,0"]').boundingBox();assert.ok(hexBox);
 await page.mouse.move(hexBox.x+hexBox.width/2,hexBox.y+hexBox.height/2);await page.mouse.down();await page.mouse.move(hexBox.x+hexBox.width/2+10,hexBox.y+hexBox.height/2,{steps:4});await page.mouse.up();
 assert.equal(await page.locator('[data-editor-only="river-draft"] line').count(),1,'drag gesture must not finish the path');assert.deepEqual(await snapshot(),before);
 await page.locator('.map-viewport').press('Enter');
 const after=await snapshot();assert.equal(after.map.rivers.length,before.map.rivers.length+1);assert.equal(after.counters.nextRiverId,before.counters.nextRiverId+1);assert.deepEqual(after.generation,before.generation);assert.equal(await page.locator('[data-editor-only="river-draft"]').count(),0);
 await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);
 await button('Добавить реку').click();await page.locator('.map-viewport').press('Escape');await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-add-river'));assert.deepEqual(await snapshot(),after,'reset leaves committed map unchanged');
 }
 { // E5-01…06/AC04…10: use the same real lifecycle runner, no duplicate corpus.
 const editorFixture=JSON.parse(await fs.readFile(new URL('../fixtures/e5-river-editor.json',import.meta.url)));
 const out=process.env.HX_E5_EVIDENCE_DIR||fileURLToPath(new URL('reports/HX-BL-023-E5/',root));await fs.mkdir(out,{recursive:true});
 const screen=async name=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')!==null)await menu.locator('summary').click();await page.screenshot({path:`${out}/${name}.png`});};
 const png=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const got=page.waitForEvent('download');await button('PNG').click();return fs.readFile(await (await got).path());};
 const findRiver=async()=>{await ensureEdit();if(await button('Найти объект').getAttribute('aria-expanded')==='false')await button('Найти объект').click();await page.locator('[data-target-key="river:1"]').click();assert.equal(await page.locator('[data-river-command-editor="1"]').count(),1,'Find selects the exact river');await page.locator('[data-river-edge-choice]').first().click();};
 for(const mode of ['classic','mythic']){
   const data=structuredClone(editorFixture);data.ui.generationMode=mode;
   await load(data);await select('0,0');const original=await snapshot();
   if(mode==='classic'){if(await button('Готово').count())await button('Готово').click();await page.setViewportSize({width:1500,height:1100});await page.locator('.info-block--hex').scrollIntoViewIfNeeded();await screen('before-ru-1500');}
   await findRiver();
   const line=page.locator('[data-river-map-edge]').first();await line.press('Enter');assert.equal(await page.locator('[data-river-command-editor="1"]').count(),1,'keyboard map selection');
   // Physical pointer uses the current transform, including rotation and zoom.
   await button('Повернуть карту на 90 градусов').click();
   const point=await line.evaluate(node=>new DOMPoint((node.x1.baseVal.value+node.x2.baseVal.value)/2,(node.y1.baseVal.value+node.y2.baseVal.value)/2).matrixTransform(node.getScreenCTM()).toJSON());
   await page.mouse.click(point.x,point.y);assert.ok(await page.locator('[data-river-road-hit-choice]').count(),'crossing does not hide the road target');await page.locator('[data-river-hit-choice]').first().press('Enter');assert.equal(await page.locator('[data-river-command-editor="1"]').count(),1);await button('Вернуть исходный поворот карты').click();
   if(mode==='classic')for(const width of [1500,390]){await page.setViewportSize({width,height:1100});await page.locator('[data-river-command-editor]').scrollIntoViewIfNeeded();await screen(`edit-ru-${width}`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   const before=await snapshot();await page.getByRole('combobox',{name:'Полноводность',exact:true}).selectOption('3');assert.equal(await page.locator('[data-river-preview]').count(),1);assert.ok(await page.locator('[data-river-confirm]').isDisabled());assert.deepEqual(await snapshot(),before,'unresolved ford preview has no document write');
   assert.match(await page.locator('[data-river-preview]').innerText(),/2 → 3/);
   await page.locator('[data-river-crossing-choice]').selectOption('ferry');
   if(mode==='classic'){await page.locator('[data-river-preview]').scrollIntoViewIfNeeded();await screen('confirm-ru-390');}
   await page.locator('[data-river-confirm]').press('Enter');const full=await snapshot();assert.equal(full.map.crossings[0].kind,'ferry');assert.ok(full.map.rivers[0].sectors.every(s=>s.fullness===3));assert.deepEqual(full.generation,before.generation);
   await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),full);
   await findRiver();const cleanPng=await png();await page.locator('[data-river-reverse]').click();assert.equal(await page.locator('[data-river-preview]').count(),1);assert.deepEqual(await png(),cleanPng,'preview arrows and muted source excluded from PNG');await page.locator('[data-river-cancel]').press('Escape');await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-river-choice'));assert.deepEqual(await snapshot(),full);
   await page.locator('[data-river-choice="1"]').click();await page.locator('[data-river-reverse]').click();await page.locator('[data-river-confirm]').click();const reversed=await snapshot();assert.deepEqual(reversed.map.rivers[0].vertexPath,[...full.map.rivers[0].vertexPath].reverse());await button('Отменить').click();assert.deepEqual(await snapshot(),full);await button('Повторить').click();
   // A surviving endpoint waterfall becomes a forbidden source on reversal.
   await findRiver();const end=reversed.map.rivers[0].vertexPath.at(-1).key;await page.locator(`[data-river-vertex-choice="${end}"]`).click();await page.getByRole('combobox',{name:'водопад',exact:true}).selectOption('on');const on=await snapshot();assert.ok(on.map.riverFeatures.waterfalls.some(e=>e.vertexKey===end&&e.state==='on'));
   await findRiver();await page.locator('[data-river-reverse]').click();assert.equal(await page.locator('[data-river-marker-choice]').count(),1);assert.ok(await page.locator('[data-river-confirm]').isDisabled());await page.locator('[data-river-marker-choice]').selectOption('off');await page.locator('[data-river-confirm]').click();const resolved=await snapshot();assert.ok(resolved.map.riverFeatures.waterfalls.some(e=>e.vertexKey===end&&e.state==='off'));await button('Отменить').click();assert.deepEqual(await snapshot(),on);await button('Повторить').click();
   // Replacement can reuse its own occupied edge. Enter completes a real no-op.
   await findRiver();const resolvedPng=await png();await page.locator('[data-river-replace]').click();assert.deepEqual(await png(),resolvedPng,'replacement draft excludes editor layers');
   const path=resolved.map.rivers[0].vertexPath;for(const v of path)await page.locator(`[data-river-draft-choice="${v.key}"]`).click();await page.locator('[data-river-finish]').click();assert.equal(await page.locator('[data-river-preview]').count(),0);assert.deepEqual(await snapshot(),resolved);
   await findRiver();await page.locator('[data-river-replace]').click();await page.locator('[data-river-finish]').click();assert.equal(await page.locator('[data-river-draft]').count(),1,'invalid replacement remains open');assert.deepEqual(await snapshot(),resolved);if(mode==='classic'){await page.locator('.direct-error').last().scrollIntoViewIfNeeded();await screen('error-ru-390');}await button('Сбросить черновик реки').click();
   await findRiver();await page.locator('[data-river-remove]').click();assert.match(await page.locator('[data-river-preview]').innerText(),/Эйра/);await page.locator('[data-river-confirm]').click();const deleted=await snapshot();assert.equal(deleted.map.rivers.length,0);assert.equal(deleted.map.crossings.length,0);assert.equal(deleted.counters.nextRiverId,resolved.counters.nextRiverId);
   if(mode==='classic'){await page.locator('.info-block--hex').scrollIntoViewIfNeeded();await screen('after-delete-ru-390');}
   await button('Отменить').click();assert.deepEqual(await snapshot(),resolved);if(mode==='classic'){await findRiver();await page.locator('[data-river-command-editor]').scrollIntoViewIfNeeded();await screen('undo-ru-390');}
   await load(fixture);await load(resolved);assert.deepEqual(await snapshot(),resolved,'roundtrip after a different document restores complete river edit');
   // Safe fullness has no separate Apply/Confirm.
   const safe=structuredClone(editorFixture);safe.ui.generationMode=mode;safe.map.crossings=[];safe.map.roads=[];safe.counters.nextRoadId=1;await load(safe);await findRiver();const safeBefore=await snapshot();await page.getByRole('combobox',{name:'Полноводность',exact:true}).selectOption('4');assert.equal(await page.locator('[data-river-preview]').count(),0);const safeAfter=await snapshot();assert.ok(safeAfter.map.rivers[0].sectors.every(s=>s.fullness===4));await button('Отменить').click();assert.deepEqual(await snapshot(),safeBefore);
   // The E3 direction offers the same explicit Off/Auto resolution.
   const rapid=structuredClone(safe);rapid.map.riverFeatures.rapids=[{riverId:1,edgeKey:rapid.map.rivers[0].sectors[0].edgeKeys[0],state:'on'}];await load(rapid);await select('0,0');await ensureEdit();const rapidBefore=await snapshot();await button('Начать путь отсюда').click();await select('1,0');await page.locator('.map-viewport').press('Enter');assert.equal(await page.locator('[data-road-marker-resolution]').count(),1);assert.deepEqual(await snapshot(),rapidBefore,'unresolved road marker choice preserves document');await page.locator('[data-road-marker-choice]').selectOption('off');await page.locator('[data-road-marker-confirm]').click();const roadResolved=await snapshot();assert.equal(roadResolved.map.crossings[0].kind,'bridge');assert.equal(roadResolved.map.riverFeatures.rapids[0].state,'off');
 }
 // A physical junction has more than one 44px hit; an explicit list selects it.
 const overlap=structuredClone(editorFixture),joined=structuredClone(overlap.map.rivers[0]);joined.id=2;joined.vertexPath=[joined.vertexPath[1],{x:0,y:28,key:'0,28'}];const joinedEdge=joined.vertexPath.map(v=>v.key).sort().join('|');joined.sectors=joined.sectors.map(s=>({...s,id:'overlap:2',riverId:2,vertexPath:joined.vertexPath,edgeKeys:[joinedEdge],startVertexKey:joined.vertexPath[0].key,endVertexKey:joined.vertexPath[1].key}));overlap.map.rivers.push(joined);overlap.counters.nextRiverId=3;overlap.ui.mapScale=1.5;await page.setViewportSize({width:1500,height:1100});await load(overlap);await ensureEdit();
 const edgeTarget=page.locator('[data-river-map-edge]').first();await edgeTarget.scrollIntoViewIfNeeded();const joint=await edgeTarget.evaluate(n=>new DOMPoint(n.x2.baseVal.value,n.y2.baseVal.value).matrixTransform(n.getScreenCTM()).toJSON());await page.mouse.click(joint.x,joint.y);assert.ok(await page.locator('[data-river-hit-choice]').count()>=2,'overlap must present all physical river hits');await page.locator('[data-river-hit-choice]').last().press('Enter');assert.equal(await page.locator('[data-river-command-editor="2"]').count(),1,'explicit overlap choice identifies river2');
 await page.setViewportSize({width:390,height:1100});await load(editorFixture);await select('0,0');await findRiver();if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();await button('Switch to English').click();await page.locator('[data-river-choice="1"]').click();await page.locator('[data-river-edge-choice]').first().click();await page.locator('[data-river-command-editor]').scrollIntoViewIfNeeded();await screen('edit-en-390');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await button('Переключить на русский').click();await page.setViewportSize({width:1500,height:1100});
 if(await button('Найти объект').getAttribute('aria-expanded')==='true')await button('Найти объект').click();
 console.log('E5 full editor: Classic/Mythic, Find/map/rotation, native F, deep ford and marker choices both directions, reverse/replacement/delete, PNG/JSON exclusion, roundtrip/undo, RU/EN1500/390 passed.');
 }
 { // DE-AC01–04/06/10: replace superseded paired-form workflow in this existing lifecycle.
 const out=new URL('reports/HX-BL-023-direct/',root);await fs.mkdir(out,{recursive:true});
 const info=page.locator('.info-block--hex'), namesSection=page.locator('.map-names');
 const input=()=>page.getByRole('textbox',{name:/^(Название|Name)$/});
 const namesFixture=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-mythic.json',import.meta.url)));
 namesFixture.map.kingdoms[0].name.en='  '+ 'L'.repeat(90)+'  ';
 namesFixture.map.gmNotesByHexKey={'3,6':'Авторская заметка перед поиском'};
 await load(namesFixture);
 assert.equal(await info.locator('button').filter({hasText:/✎|✏|🗑/}).count(),0,'no scattered tools in read mode');
 // Owner panel correction: one desktop scroll surface, compact accessible edit control.
 for (const width of [1500,390]) {
  await page.setViewportSize({width,height:1100});await info.scrollIntoViewIfNeeded();
  const layout=await info.evaluate(el=>{
   const button=el.querySelector('.direct-mode'), first=el.querySelector('p');
   const b=button.getBoundingClientRect(), p=first.getBoundingClientRect();
   return {label:button.getAttribute('aria-label'),title:button.title,text:button.textContent.trim(),
    width:b.width,height:b.height,firstTop:p.top,buttonTop:b.top,
    infoOverflow:getComputedStyle(document.querySelector('.roll-card')).overflowY,
    controlsOverflow:getComputedStyle(document.querySelector('.map-toolbar')).overflowY,
    fits:document.documentElement.scrollWidth<=innerWidth};
  });
  assert.equal(layout.label,'Редактировать');assert.equal(layout.title,'Редактировать');assert.equal(layout.text,'');
  assert.ok(layout.width>=44&&layout.height>=44);assert.ok(layout.firstTop<layout.buttonTop+layout.height/2,'title starts beside edit control');
  assert.equal(layout.infoOverflow,'visible');assert.equal(layout.controlsOverflow,'visible');assert.ok(layout.fits);
 }
 await page.setViewportSize({width:1500,height:1100});
 const scroll=await page.locator('.side-panel').evaluate(el=>{
  const controls=el.querySelector('.map-toolbar'),info=el.querySelector('.roll-card');el.scrollTop=0;
  const before=[controls.getBoundingClientRect().top,info.getBoundingClientRect().top];el.scrollTop=150;
  return {amount:el.scrollTop,controls:controls.getBoundingClientRect().top-before[0],info:info.getBoundingClientRect().top-before[1]};
 });
 assert.ok(scroll.amount>0);assert.equal(scroll.controls,scroll.info,'controls and information scroll together');
 assert.equal(await button('Найти объект').getAttribute('aria-expanded'),'false');
 assert.equal(await namesSection.evaluate(el=>el.parentElement.lastElementChild===el),true,'find object follows info and notes');
 // Keep existing information rows compact in both modes. CLASSIFY1 adds an
 // explicit edit-only classification form between groups; its height is not
 // a change to the spacing of the information rows on either side.
 const rowGeometry=()=>info.evaluate(el=>{const top=el.getBoundingClientRect().top;let previous=null,first=true;return [...el.children].flatMap(x=>{if(x.matches('.knave-properties'))previous=null;if(!x.matches('p,.direct-line'))return [];const r=x.getBoundingClientRect(),gap=previous===null?(first?r.top-top:null):r.top-previous;previous=r.bottom;first=false;return [{gap,height:r.height}];});});
 for(const width of [1500,390]) {
  await page.setViewportSize({width,height:1100});
  const before=await rowGeometry();await ensureEdit();const after=await rowGeometry();
  assert.deepEqual(after,before,'edit/view row spacing must match at '+width);
  await button('Готово').click();
 }
 await ensureEdit();assert.equal(await info.locator('.direct-mode').count(),1);
 assert.equal(await info.locator('.direct-value').count()>0,true);
 // Inline text follows the owner's compact row layout; standalone mode control stays44px.
 assert.equal(await info.locator('.direct-mode').evaluate(e=>e.getBoundingClientRect().height>=44),true);
 // HX023-DE-R2: a valid one-character name must retain its effective hit area.
 const beforeShortName=await snapshot(),shortName=info.locator('[data-name-key^="region:"]').first();
 await shortName.click();await input().fill('Я');await input().press('Enter');
 for(const width of [390,1500]) {
   await page.setViewportSize({width,height:1100});await shortName.scrollIntoViewIfNeeded();
   const box=await shortName.boundingBox();assert.ok(box.width>=44&&box.height>0,'short name target at '+width);
   // Keep a physical click in the blank30px part; locator action waits for
   // resize/scroll geometry to stabilize instead of reusing stale viewport coordinates.
   await shortName.click({position:{x:30,y:box.height/2}});
   await input().waitFor({state:'visible',timeout:5000});
   assert.equal(await input().count(),1,'blank part of short name target opens editor at '+width);
   await input().press('Escape');
 }
 await button('Отменить').click();assert.deepEqual(await snapshot(),beforeShortName,'short-name fixture restored');
 await info.locator('[data-name-key]').first().click();await input().fill('Незавершено');await input().press('Escape');
 assert.equal(await input().count(),0);assert.equal(await namesSection.locator('.map-names__list').count(),0,'direct editing does not open catalog');
 await button('Найти объект').click();
 const openNamed=async type=>{await namesSection.getByRole('combobox',{name:/^(Тип объекта|Object type)$/}).selectOption(type);const result=namesSection.locator('[data-target-key]:enabled').first(),key=await result.getAttribute('data-target-key');await result.click();await page.waitForFunction(()=>document.activeElement?.matches('.info-block--hex'));assert.equal(await namesSection.locator('input:not([type=search])').count(),0);const before=await snapshot();await info.locator(`[data-name-key="${key}"]`).first().click();await input().waitFor();return before;};
 for(const type of ['region','settlement','river','lake','kingdom']) {
   for(const locale of ['ru','en']) {
     if(locale==='en')await button('Switch to English').click();
     const before=await openNamed(type);const value=(locale==='ru'?'Автор ':'Author ')+type;
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
 await openNamed('region');await input().press('Escape');const before=await snapshot();await openNamed('region');const current=await input().inputValue();
 for(const value of ['', 'x'.repeat(81), Object.values(before.map.toponyms.names).find(n=>n.ru!==current).ru]) {
   await input().fill(value);await input().press('Enter');assert.equal(await input().getAttribute('aria-invalid'),'true');
   await input().press('Tab');assert.equal(await input().evaluate(e=>e===document.activeElement),true,'invalid field retains keyboard focus');
   await button('Готово').click();assert.equal(await button('Готово').count(),1);assert.equal(await input().count(),1);
 }
 await input().press('Escape');assert.deepEqual(await snapshot(),before);
 await openNamed('region');await input().fill('  '+current+'  ');await input().press('Enter');assert.deepEqual(await snapshot(),before);
 await openNamed('region');await input().fill('Ошибка подготовки');await page.evaluate(()=>window.__failNamePreparation=true);await input().press('Enter');
 assert.match(await page.getByRole('alert').innerText(),/Карта не изменена/);await input().press('Escape');assert.deepEqual(await snapshot(),before);
 // HX023-DE-R1: wheel has no pointer-down; finish once before zoom, reject invalid departure.
 const documentWithoutZoom=async()=>{const d=await snapshot();d.ui.mapScale=before.ui.mapScale;return d;};
 await openNamed('region');await input().fill('Колесо навигации');
 const viewport=page.locator('.map-viewport');await viewport.scrollIntoViewIfNeeded();
 const rect=await viewport.boundingBox(),scale=()=>viewport.locator('svg').first().getAttribute('style');
 await page.mouse.move(rect.x+rect.width/2,rect.y+Math.min(150,rect.height/2));
 const scaleBefore=await scale();await page.mouse.wheel(0,-120);
 await page.waitForFunction(old=>document.querySelector('.map-viewport svg').getAttribute('style')!==old,scaleBefore);
 assert.equal(await input().count(),0,'wheel completes valid name before zoom');
 const wheelSaved=await documentWithoutZoom();await button('Отменить').click();assert.deepEqual(await documentWithoutZoom(),before,'wheel name is exactly one transaction');
 await button('Повторить').click();assert.deepEqual(await documentWithoutZoom(),wheelSaved);
 await openNamed('region');await input().fill('');
 await viewport.scrollIntoViewIfNeeded();const invalidRect=await viewport.boundingBox();
 await page.mouse.move(invalidRect.x+invalidRect.width/2,invalidRect.y+Math.min(150,invalidRect.height/2));
 const invalidScale=await scale();await page.mouse.wheel(0,-120);await page.waitForTimeout(150);
 assert.equal(await scale(),invalidScale,'invalid input rejects wheel zoom');
 assert.equal(await input().getAttribute('aria-invalid'),'true');
 assert.equal(await input().evaluate(e=>e===document.activeElement),true);
 await input().press('Escape');assert.deepEqual(await documentWithoutZoom(),wheelSaved);
 await button('Отменить').click();assert.deepEqual(await documentWithoutZoom(),before);
 // Same native boundary for pinch and single-finger scroll (synthetic touch diagnostic).
 const touch=async (type,count,distance=100)=>viewport.evaluate((el,{type,count,distance})=>{
   const r=el.getBoundingClientRect();const touches=Array.from({length:count},(_,i)=>new Touch({identifier:i,target:el,clientX:r.left+50+i*distance,clientY:r.top+50}));
   return el.dispatchEvent(new TouchEvent(type,{touches,bubbles:true,cancelable:true}));
 },{type,count,distance});
 await openNamed('region');await input().fill('Pinch navigation');
 const pinchBefore=await scale();await touch('touchstart',2);await touch('touchmove',2,150);
 await page.waitForFunction(old=>document.querySelector('.map-viewport svg').getAttribute('style')!==old,pinchBefore);
 assert.equal(await input().count(),0,'pinch completes valid name');await touch('touchend',0);
 await button('Отменить').click();assert.deepEqual(await documentWithoutZoom(),before);
 await openNamed('region');await input().fill('');const blockedPinch=await scale();
 await touch('touchstart',2);assert.equal(await touch('touchmove',2,150),false,'invalid pinch cancelled');
 await page.waitForTimeout(150);assert.equal(await scale(),blockedPinch);assert.equal(await input().getAttribute('aria-invalid'),'true');
 await touch('touchend',0);assert.equal(await touch('touchmove',1),false,'invalid native touch scroll cancelled');
 await input().press('Escape');assert.deepEqual(await documentWithoutZoom(),before);
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
 const savedNotes=await snapshot();assert.equal(savedNotes.version,10);assert.equal(savedNotes.map.gmNotesByHexKey[noteKey],noteText);
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
 assert.equal(await page.evaluate(()=>{const field=document.querySelector('#gm-notes-text');return !field||field.disabled;}),true,'busy import closes or disables previous field');
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
   for(const f of ['kingdoms','waterPoiByHexKey','biomeOverrideByHexKey'])assert.deepEqual(saved.map[f],data.map[f]??(['kingdoms','obstacles'].includes(f)?[]:{}),entry.path+' '+f);
   assert.deepEqual(saved.map.obstacles.map(({id,...o})=>o),data.map.obstacles??[],entry.path+' obstacle geometry preserved');assert.equal(saved.counters.nextObstacleId,(data.map.obstacles??[]).length+1);
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
 // E3 draft lifecycle: reuse existing production runner; no second corpus.
 const draftInput=JSON.parse(await fs.readFile(new URL('../fixtures/road-entry-zigzags.json',import.meta.url)));
 const draftSegment=draftInput.map.roads[0].segments[0];draftInput.map.roads=[];draftInput.map.crossings=[];
 for(const p of [draftSegment.from,draftSegment.to]){const r=draftInput.map.regions.find(r=>r.hexes.some(x=>x.q===p.q&&x.r===p.r));if(!r.pointsOfInterest.some(x=>x.q===p.q&&x.r===p.r))r.pointsOfInterest.push({...p});}
 await load(draftInput);await select(`${draftSegment.from.q},${draftSegment.from.r}`);
 if(await button('Редактировать').count())await button('Редактировать').click();
 const draftBefore=await snapshot();
 await button('Начать путь отсюда').click();await button('Готово').click();
 assert.equal(await page.locator('[data-road-draft] select').count(),1,'invalid single node stays draft');
 await select(`${draftSegment.to.q},${draftSegment.to.r}`);assert.equal(await page.locator('[data-editor-only="draft"] line').count(),1);
 await page.locator('.map-viewport').press('Escape');assert.deepEqual(await snapshot(),draftBefore);
 await button('Начать путь отсюда').click();await select(`${draftSegment.to.q},${draftSegment.to.r}`);
 await button('Готово').click();const draftAfter=await snapshot();assert.equal(draftAfter.map.roads.length,1);assert.deepEqual(draftAfter.generation,draftBefore.generation);
 await button('Отменить').click();assert.deepEqual(await snapshot(),draftBefore);await button('Повторить').click();assert.deepEqual(await snapshot(),draftAfter);
 // R2/R3: extend this runner with overlapping legacy identity and real keyboard activation.
 const overlap=JSON.parse(await fs.readFile(new URL('../fixtures/road-entry-zigzags.json',import.meta.url)));
 const original=overlap.map.roads[0],shared=original.segments[0],copyId=Math.max(...overlap.map.roads.map(r=>r.id))+1;
 overlap.map.roads.push({...structuredClone(original),id:copyId,segments:[structuredClone(shared)]});overlap.counters.nextRoadId=copyId+1;
 await load(overlap);await select(`${shared.from.q},${shared.from.r}`);
 if(await button('Редактировать').count())await button('Редактировать').click();
 const pair=[`${shared.from.q},${shared.from.r}`,`${shared.to.q},${shared.to.r}`].sort().join('|');
 for(const id of [original.id,copyId]){
  const actual=page.getByRole('button',{name:`Участок ${id}: ${pair}`,exact:true});
  await actual.focus();await actual.press('Enter');
  assert.equal(await page.locator('.road-editor__item > button[aria-pressed="true"]').count(),1);
  assert.equal(await page.locator('[data-editor-only="roads"] line[stroke="#7dd3fc"]').count(),1);
  assert.ok(await actual.evaluate(el=>parseFloat(getComputedStyle(el).strokeWidth)*el.getScreenCTM().a>=43.9),'map target44px at normal rotation');
 }
 // E3 existing-path controls: exact crossing identity, confirmation preview and history.
 // Reuse this lifecycle runner: no second corpus or mixed-history sequence.
 await load(JSON.parse(await fs.readFile(new URL('../fixtures/road-entry-zigzags.json',import.meta.url))));
 const roadMap=await snapshot(),crossing=roadMap.map.crossings[0];
 const road=roadMap.map.roads.find(r=>r.id===crossing.roadId),seg=road.segments.find(s=>[`${s.from.q},${s.from.r}`,`${s.to.q},${s.to.r}`].sort().join('|')===crossing.roadSegmentKey);
 await select(`${seg.from.q},${seg.from.r}`);
 if(await button('Редактировать').count())await button('Редактировать').click();
 // E5 extends the existing real-browser document lifecycle: exact local
 // selection, explicit Off even when Auto is absent, reload, history and export.
 const riverChoice=page.locator('[data-river-choice]').first();
 assert.ok(await riverChoice.count(),'crossing fixture supplies a nearby river');
 const riverId=Number(await riverChoice.getAttribute('data-river-choice'));
 await riverChoice.press('Enter');
 const edgeChoice=page.locator('[data-river-edge-choice]').first();
 const featureEdge=await edgeChoice.getAttribute('data-river-edge-choice');
 await edgeChoice.press('Space');
 assert.ok(await page.locator('[data-editor-only="river-feature"] line').count()>=1);assert.ok(await page.locator(`[data-river-reach-edge="${featureEdge}"]`).count());
 const beforeFeature=await snapshot();
 const rapidSelect=page.getByRole('combobox',{name:'пороги',exact:true});
 await rapidSelect.selectOption('off');
 const afterFeature=await snapshot();
 assert.ok(afterFeature.map.riverFeatures.rapids.some(e=>e.riverId===riverId&&e.edgeKey===featureEdge&&e.state==='off'));
 assert.deepEqual(afterFeature.generation,beforeFeature.generation);
 assert.deepEqual(afterFeature.map.rivers,beforeFeature.map.rivers);
 assert.ok(await rapidSelect.evaluate(e=>e.getBoundingClientRect().height>=44));
 await button('Отменить').click();assert.deepEqual(await snapshot(),beforeFeature);
 await button('Повторить').click();assert.deepEqual(await snapshot(),afterFeature);
 await load(afterFeature);assert.deepEqual(await snapshot(),afterFeature);
 await select(`${seg.from.q},${seg.from.r}`);await ensureEdit();
 await page.locator(`[data-river-choice="${riverId}"]`).click();
 await page.locator(`[data-river-edge-choice="${featureEdge}"]`).click();
 await page.getByRole('combobox',{name:'пороги',exact:true}).selectOption('auto');
 assert.deepEqual(await snapshot(),beforeFeature,'Auto removes only the explicit intention');
 await page.getByRole('combobox',{name:'пороги',exact:true}).press('Escape');
 assert.equal(await page.locator('[data-river-feature-editor]').count(),1,'Escape closes field and returns focus');
 await page.locator('[data-river-vertex-choice]').first().click();
 const vertexKey=await page.locator('[data-river-vertex-choice][aria-pressed="true"]').getAttribute('data-river-vertex-choice');
 const waterfallSelect=page.locator('[data-river-feature-editor] select');
 const selectedRiver=beforeFeature.map.rivers.find(r=>r.id===riverId);
 if(vertexKey===selectedRiver.vertexPath[0].key)assert.ok(await waterfallSelect.locator('option[value="on"]').isDisabled(),'source waterfall forbidden');
 await waterfallSelect.selectOption('off');
 assert.ok((await snapshot()).map.riverFeatures.waterfalls.some(e=>e.vertexKey===vertexKey&&e.state==='off'));
 // Restore the input fixture and selection for the existing E3 checks below.
 await load(roadMap);await select(`${seg.from.q},${seg.from.r}`);await ensureEdit();
 const roadLabel=`Участок ${road.id}: ${seg.from.q},${seg.from.r} → ${seg.to.q},${seg.to.r}`;
 const crossingTarget=page.getByRole('button',{name:`Переправа ${crossing.key}`,exact:true});
 await crossingTarget.focus();await crossingTarget.press(' ');
 assert.equal(await crossingTarget.getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-editor-only="roads"] circle[stroke="#7dd3fc"]').count(),1);
 await button(roadLabel).click();
 const oldRoad=await snapshot();
 const crossingSelect=page.getByRole('combobox',{name:`Переправа ${road.id}:${crossing.riverId}`,exact:true});
 await crossingSelect.selectOption(crossing.kind==='bridge'?'ferry':'bridge');
 const changedRoad=await snapshot();assert.notDeepEqual(changedRoad.map.crossings,oldRoad.map.crossings);
 assert.deepEqual(changedRoad.map.roads,oldRoad.map.roads);assert.deepEqual(changedRoad.generation,oldRoad.generation);
 await button('Отменить').click();assert.deepEqual(await snapshot(),oldRoad);
 await button('Повторить').click();assert.deepEqual(await snapshot(),changedRoad);
 await button(roadLabel).click();await button('Удалить весь выделенный путь').click();
 assert.equal(await page.locator('[data-editor-only] line[stroke="#7dd3fc"]').count(),road.segments.length);
 for(const width of [1500,390]) {
   await page.setViewportSize({width,height:1100});
   const confirmation=page.getByRole('group',{name:'Подтверждение удаления',exact:true});
   for(const name of ['Удалить','Отмена']) {
     const target=confirmation.getByRole('button',{name,exact:true});
     const rect=await target.boundingBox();
     assert.ok(rect.width>=44&&rect.height>=44,`E3 confirmation ${name} target at ${width}: ${JSON.stringify(rect)}`);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Confirmation has no horizontal overflow');
 }
 await button('Отмена').click();assert.deepEqual(await snapshot(),changedRoad);
 for(const width of [1500,390]) {
   await page.setViewportSize({width,height:1100});
   const rect=await crossingSelect.boundingBox();assert.ok(rect.width>=44&&rect.height>=44,'E3 native control target');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'E3 no horizontal page overflow');
 }
 await page.setViewportSize({width:1500,height:1100});
 // E4: direct map identity/keyboard targets, zoom sizing, focus and export cancellation.
 const barriers=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/baseline-mythic.json',import.meta.url)));
 await load(barriers);await ensureEdit();await select('2,6');
 let barrierBefore=await snapshot();
 await button('Добавить препятствие').click();
 const edgeTargets=page.locator('[data-obstacle-edge]');assert.ok(await edgeTargets.count()>=2);assert.match(await edgeTargets.first().getAttribute('aria-label'),/Добавить препятствие 2,6 →/);
 for(const width of [1500,390]){
   await page.setViewportSize({width,height:1100});
   for(const target of await edgeTargets.all()){const box=await target.boundingBox();assert.ok(box.width>=43.9&&box.height>=43.9,'E4 edge44px');}
 }
 await page.setViewportSize({width:1500,height:1100});
 const obstacleViewport=page.locator('.map-viewport'),obstacleScale=()=>obstacleViewport.locator('svg').first().getAttribute('style');
 const vr=await obstacleViewport.boundingBox();await page.mouse.move(vr.x+vr.width/2,vr.y+100);
 const oldScale=await obstacleScale();await page.mouse.wheel(0,-120);
 await page.waitForFunction(old=>document.querySelector('.map-viewport svg').getAttribute('style')!==old,oldScale);
 assert.ok(await edgeTargets.count()>=2,'zoom retains choice');
 for(const target of await edgeTargets.all()){const box=await target.boundingBox();assert.ok(box.width>=43.9&&box.height>=43.9,'E4 zoomed edge44px');}
 await page.locator('.rotate-map-button').click();assert.ok(await edgeTargets.count()>=2,'rotation retains choice');
 barrierBefore=await snapshot();await button('Добавить препятствие').click();
 await edgeTargets.first().press('Enter');
 await page.waitForFunction(()=>document.activeElement?.closest('[data-obstacle-id]'));
 const addedBarrier=await snapshot(),barrierId=addedBarrier.counters.nextObstacleId-1;
 assert.equal(addedBarrier.map.obstacles.length,barrierBefore.map.obstacles.length+1);
 await button('Отменить').click();assert.deepEqual(await snapshot(),barrierBefore);
 // HX023-E4-R1: physical pointer overlap must not pick the topmost SVG circle.
 // Keep a redo branch, then compare the entire actual export after the ambiguous click.
 await button('Добавить препятствие').click();
 await page.mouse.move(vr.x+vr.width/2,vr.y+100);await page.mouse.wheel(0,1100);await page.waitForTimeout(450);
 const beforePointer=await snapshot();await button('Добавить препятствие').click();
 // Measure physical targets after export/reopening, which may shift the centered map.
 const ambiguousPoint=await edgeTargets.evaluateAll(nodes=>{
   const circles=nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2,r:b.width/2};});
   return circles.find(p=>circles.filter(c=>Math.hypot(p.x-c.x,p.y-c.y)<=c.r).length>1);
 });assert.ok(ambiguousPoint,'fixture exposes overlapping44px circles at low zoom');
 await page.mouse.click(ambiguousPoint.x,ambiguousPoint.y);
 await page.waitForFunction(()=>document.activeElement?.closest('[data-obstacle-editor]'));
 assert.ok(await edgeTargets.count()>0,'ambiguity preserves uncommitted choice');
 assert.deepEqual(await snapshot(),beforePointer,'ambiguous pointer never changes document/RNG/counters');
 assert.ok(await button('Повторить').isEnabled(),'ambiguous pointer preserves redo');
 await button('Повторить').click();assert.deepEqual(await snapshot(),addedBarrier);
 const rowHeight=await page.locator(`[data-obstacle-id="${barrierId}"]`).evaluate(e=>e.getBoundingClientRect().height);await page.locator('.direct-mode').click();assert.equal(await page.locator(`[data-obstacle-id="${barrierId}"]`).evaluate(e=>e.getBoundingClientRect().height),rowHeight,'E4 read/edit row height');await page.locator('.direct-mode').click();
 const mapBarrier=page.locator(`[data-obstacle-map-id="${barrierId}"]`);await mapBarrier.press('Space');
 assert.equal(await page.locator(`[data-obstacle-highlight="${barrierId}"]`).count(),1);
 const barrierRow=page.locator(`[data-obstacle-id="${barrierId}"]`);await barrierRow.getByRole('button',{name:'Перенести',exact:true}).click();
 assert.equal(await page.locator(`[data-obstacle-highlight="${barrierId}"]`).count(),1,'source remains until commit');assert.match(await edgeTargets.first().getAttribute('aria-label'),/Перенести препятствие/);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.closest('[data-obstacle-id]'));
 await barrierRow.getByRole('button',{name:'Удалить',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-obstacle-list'));
 await button('Отменить').click();assert.deepEqual(await snapshot(),addedBarrier);
 await button('Добавить препятствие').click();await snapshot();assert.equal(await edgeTargets.count(),0,'export cancels uncommitted target');
 await runWaterLifecycle({page,load,snapshot,ensureEdit,button,select,root,browser});
 await runRegionLifecycle({page,load,snapshot,ensureEdit,button,select,root});
 await runPoiLifecycle({page,load,snapshot,ensureEdit,button,select,root});
 await runEntityNameLifecycle({page,load,snapshot,ensureEdit,button,select,root});
 if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
 await button('Switch to English').click();assert.equal(await button('Undo').count(),1);assert.equal(await button('Redo').count(),1);
 assert.deepEqual(errors,[]);assert.equal(alerts.length,5,'only intentional invalid imports');
 console.log(`Save/history acceptance passed in ${browser.version()}: full corpus, manual families, 100 mixed UI undo/redo, failures, serialization, classic/Mythic checkpoints, RU/EN.`);
} finally {if(browser)await browser.close();server.kill();}
