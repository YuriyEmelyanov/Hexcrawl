import {createGenerationState} from '../../src/worldRandom.ts';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../../',import.meta.url);
const presentOut='/workspace/scratch/cc30953c0fc1/presentation-e5';await fs.mkdir(presentOut,{recursive:true});
const captureRows=[];
async function captureState(name,selector='.info-block--hex') {
 const prior=page.viewportSize();
 for(const width of [1500,390]){await page.setViewportSize({width,height:1100});const el=page.locator(selector).last();await el.scrollIntoViewIfNeeded();await page.waitForTimeout(120);await el.screenshot({path:`${presentOut}/${name}-${width}.png`});captureRows.push({name,width,selector,text:await el.innerText()});}
 await page.setViewportSize(prior);
}

const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manual-edit-map.json',import.meta.url)));
const manifest=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manifest.json',import.meta.url)));
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4182','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser,page;const errors=[],alerts=[];
try {
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),10000);server.stdout.on('data',data=>{output+=data;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1500,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(/Будет восстановлено исходное состояние рек|Original river state will be restored/.test(d.message())){await d.accept();return;}alerts.push(d.message());await d.dismiss();});
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
 await page.goto('http://127.0.0.1:4182/');
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
 await captureState('create-path','[data-river-draft]');await captureState('create-map-path','.map-viewport');
 await page.locator('.map-viewport').press('Enter');
 const after=await snapshot();await captureState('create-applied');await captureState('create-map-applied','.map-viewport');assert.equal(after.map.rivers.length,before.map.rivers.length+1);assert.equal(after.counters.nextRiverId,before.counters.nextRiverId+1);assert.deepEqual(after.generation,before.generation);assert.equal(await page.locator('[data-editor-only="river-draft"]').count(),0);
 await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);
 await button('Добавить реку').click();await page.locator('.map-viewport').press('Escape');await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-add-river'));assert.deepEqual(await snapshot(),after,'reset leaves committed map unchanged');await captureState('create-cancelled');
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
   if(mode==='classic')await captureState('crossing-choice','[data-river-preview]');await page.locator('[data-river-crossing-choice]').selectOption('ferry');
   if(mode==='classic'){await page.locator('[data-river-preview]').scrollIntoViewIfNeeded();await screen('confirm-ru-390');}
   await page.locator('[data-river-confirm]').press('Enter');const full=await snapshot();assert.equal(full.map.crossings[0].kind,'ferry');assert.ok(full.map.rivers[0].sectors.every(s=>s.fullness===3));assert.deepEqual(full.generation,before.generation);
   await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),full);
   await findRiver();const cleanPng=await png();await page.locator('[data-river-reverse]').click();assert.equal(await page.locator('[data-river-preview]').count(),1);assert.deepEqual(await png(),cleanPng,'preview arrows and muted source excluded from PNG');await page.locator('[data-river-cancel]').press('Escape');await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-river-choice'));assert.deepEqual(await snapshot(),full);
   await page.locator('[data-river-choice="1"]').click();await page.locator('[data-river-reverse]').click();if(mode==='classic'){await captureState('reverse-preview','[data-river-preview]');await captureState('reverse-preview-map','.map-viewport');}await page.locator('[data-river-confirm]').click();const reversed=await snapshot();if(mode==='classic'){await captureState('reverse-applied');await captureState('reverse-applied-map','.map-viewport');}assert.deepEqual(reversed.map.rivers[0].vertexPath,[...full.map.rivers[0].vertexPath].reverse());await button('Отменить').click();assert.deepEqual(await snapshot(),full);await button('Повторить').click();
   // A surviving endpoint waterfall becomes a forbidden source on reversal.
   await findRiver();const end=reversed.map.rivers[0].vertexPath.at(-1).key;await page.locator(`[data-river-vertex-choice="${end}"]`).click();await page.getByRole('combobox',{name:'водопад',exact:true}).selectOption('on');const on=await snapshot();assert.ok(on.map.riverFeatures.waterfalls.some(e=>e.vertexKey===end&&e.state==='on'));
   if(mode==='classic'){
    await captureState('waterfall-on');await page.getByRole('combobox',{name:'водопад',exact:true}).selectOption('off');const off=await snapshot();assert.ok(off.map.riverFeatures.waterfalls.some(e=>e.vertexKey===end&&e.state==='off'));await captureState('waterfall-off');
    await page.getByRole('combobox',{name:'водопад',exact:true}).selectOption('auto');assert.ok(!(await snapshot()).map.riverFeatures.waterfalls.some(e=>e.vertexKey===end));await captureState('waterfall-auto');
    await page.getByRole('combobox',{name:'водопад',exact:true}).selectOption('on');assert.deepEqual(await snapshot(),on);
   }

   await findRiver();await page.locator('[data-river-reverse]').click();assert.equal(await page.locator('[data-river-marker-choice]').count(),1);if(mode==='classic')await captureState('marker-choice','[data-river-preview]');assert.ok(await page.locator('[data-river-confirm]').isDisabled());await page.locator('[data-river-marker-choice]').selectOption('off');await page.locator('[data-river-confirm]').click();const resolved=await snapshot();assert.ok(resolved.map.riverFeatures.waterfalls.some(e=>e.vertexKey===end&&e.state==='off'));await button('Отменить').click();assert.deepEqual(await snapshot(),on);await button('Повторить').click();
   // Replacement can reuse its own occupied edge. Enter completes a real no-op.
   await findRiver();const resolvedPng=await png();await page.locator('[data-river-replace]').click();assert.deepEqual(await png(),resolvedPng,'replacement draft excludes editor layers');
   const path=[...resolved.map.rivers[0].vertexPath].reverse();for(const v of path)await page.locator(`[data-river-draft-choice="${v.key}"]`).click();if(mode==='classic'){await captureState('replace-path','[data-river-draft]');await captureState('replace-path-map','.map-viewport');}await page.locator('[data-river-finish]').click();assert.equal(await page.locator('[data-river-preview]').count(),1);if(mode==='classic'){await captureState('replace-preview','[data-river-preview]');await captureState('replace-preview-map','.map-viewport');}await page.locator('[data-river-confirm]').click();const replaced=await snapshot();assert.deepEqual(replaced.map.rivers[0].vertexPath,path);if(mode==='classic'){await captureState('replace-applied');await captureState('replace-applied-map','.map-viewport');}await button('Отменить').click();assert.deepEqual(await snapshot(),resolved);if(mode==='classic'){await captureState('replace-undo');await captureState('replace-undo-map','.map-viewport');}await button('Повторить').click();assert.deepEqual(await snapshot(),replaced);await button('Отменить').click();assert.deepEqual(await snapshot(),resolved);
   await findRiver();await page.locator('[data-river-replace]').click();await page.locator('[data-river-finish]').click();assert.equal(await page.locator('[data-river-draft]').count(),1,'invalid replacement remains open');assert.deepEqual(await snapshot(),resolved);if(mode==='classic'){await page.locator('.direct-error').last().scrollIntoViewIfNeeded();await screen('error-ru-390');await captureState('error-readable','.direct-error');}await button('Сбросить черновик реки').click();
   await findRiver();await page.locator('[data-river-remove]').click();assert.match(await page.locator('[data-river-preview]').innerText(),/Эйра/);if(mode==='classic')await captureState('named-delete','[data-river-preview]');await page.locator('[data-river-confirm]').click();const deleted=await snapshot();assert.equal(deleted.map.rivers.length,0);assert.equal(deleted.map.crossings.length,0);assert.equal(deleted.counters.nextRiverId,resolved.counters.nextRiverId);
   if(mode==='classic'){await page.locator('.info-block--hex').scrollIntoViewIfNeeded();await screen('after-delete-ru-390');await captureState('deleted-map','.map-viewport');}
   await button('Отменить').click();assert.deepEqual(await snapshot(),resolved);if(mode==='classic'){await findRiver();await page.locator('[data-river-command-editor]').scrollIntoViewIfNeeded();await screen('undo-ru-390');await captureState('undo-map','.map-viewport');}
   await load(fixture);await load(resolved);assert.deepEqual(await snapshot(),resolved,'roundtrip after a different document restores complete river edit');
   // Safe fullness has no separate Apply/Confirm.
   const safe=structuredClone(editorFixture);safe.ui.generationMode=mode;safe.map.crossings=[];safe.map.roads=[];safe.counters.nextRoadId=1;await load(safe);await findRiver();const safeBefore=await snapshot();await page.getByRole('combobox',{name:'Полноводность',exact:true}).selectOption('4');assert.equal(await page.locator('[data-river-preview]').count(),0);const safeAfter=await snapshot();assert.ok(safeAfter.map.rivers[0].sectors.every(s=>s.fullness===4));await button('Отменить').click();assert.deepEqual(await snapshot(),safeBefore);
   // The E3 direction offers the same explicit Off/Auto resolution.
   const rapid=structuredClone(safe);rapid.map.riverFeatures.rapids=[{riverId:1,edgeKey:rapid.map.rivers[0].sectors[0].edgeKeys[0],state:'on'}];await load(rapid);await select('0,0');await ensureEdit();const rapidBefore=await snapshot();await button('Начать путь отсюда').click();await select('1,0');await page.locator('.map-viewport').press('Enter');assert.equal(await page.locator('[data-road-marker-resolution]').count(),1);assert.deepEqual(await snapshot(),rapidBefore,'unresolved road marker choice preserves document');await page.locator('[data-road-marker-choice]').selectOption('off');await page.locator('[data-road-marker-confirm]').click();const roadResolved=await snapshot();assert.equal(roadResolved.map.crossings[0].kind,'bridge');assert.equal(roadResolved.map.riverFeatures.rapids[0].state,'off');
 }
 // A physical junction has more than one 44px hit; an explicit list selects it.
 const overlap=structuredClone(editorFixture),joined=structuredClone(overlap.map.rivers[0]);joined.id=2;joined.vertexPath=[joined.vertexPath[1],{x:0,y:28,key:'0,28'}];const joinedEdge=joined.vertexPath.map(v=>v.key).sort().join('|');joined.sectors=joined.sectors.map(s=>({...s,id:'overlap:2',riverId:2,vertexPath:joined.vertexPath,edgeKeys:[joinedEdge],startVertexKey:joined.vertexPath[0].key,endVertexKey:joined.vertexPath[1].key}));overlap.map.rivers.push(joined);overlap.counters.nextRiverId=3;overlap.ui.mapScale=1.5;await page.setViewportSize({width:1500,height:1100});await load(overlap);await ensureEdit();
 const edgeTarget=page.locator('[data-river-map-edge]').first();await edgeTarget.scrollIntoViewIfNeeded();const joint=await edgeTarget.evaluate(n=>new DOMPoint(n.x2.baseVal.value,n.y2.baseVal.value).matrixTransform(n.getScreenCTM()).toJSON());await page.mouse.click(joint.x,joint.y);assert.ok(await page.locator('[data-river-hit-choice]').count()>=2,'overlap must present all physical river hits');await page.locator('[data-river-hit-choice]').last().press('Enter');assert.equal(await page.locator('[data-river-command-editor="2"]').count(),1,'explicit overlap choice identifies river2');
 await page.setViewportSize({width:390,height:1100});await load(editorFixture);await select('0,0');await findRiver();if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();await button('Switch to English').click();await page.locator('[data-river-choice="1"]').click();await page.locator('[data-river-edge-choice]').first().click();await page.locator('[data-river-command-editor]').scrollIntoViewIfNeeded();await screen('edit-en-390');await captureState('edit-en','[data-river-command-editor]');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await button('Переключить на русский').click();await page.setViewportSize({width:1500,height:1100});
 if(await button('Найти объект').getAttribute('aria-expanded')==='true')await button('Найти объект').click();
 console.log('E5 full editor: Classic/Mythic, Find/map/rotation, native F, deep ford and marker choices both directions, reverse/replacement/delete, PNG/JSON exclusion, roundtrip/undo, RU/EN1500/390 passed.');
 }

await fs.writeFile(`${presentOut}/capture-states.json`,JSON.stringify(captureRows,null,2));
} finally {if(browser)await browser.close();server.kill();}
