import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {fictionalMythMaterial,mythMaterialFixture} from '../helpers/myth-material-fixture.mjs';
import mythMaterialRecords from '../../src/tags/mythMaterialData.ts';

// MC1 extends the existing real-App tag workflow. Pure selector validation is in
// tags.test.mjs; these cases protect DOM focus/blur, lazy request lifetime, and
// accepted-document/history isolation that a pure selector cannot exercise.
export async function runMythMaterialLifecycle({page,snapshot,saved,root}){
 const out=new URL('reports/HX-BL-041/',root);await fs.mkdir(out,{recursive:true});
 const {data,targets:[a,b]}=mythMaterialFixture(saved),modulePattern=/\/assets\/mythMaterialData-[^/]+\.js(?:\?.*)?$/;
 const moduleBody=`export default ${JSON.stringify(fictionalMythMaterial)};`;
 const material=target=>page.locator(`.myth-material[data-myth-material="${target.owner}"]`);
 const row=target=>page.locator(`[data-tag="mb.myth"][data-tag-owner="${target.owner}"]`);
 const button=name=>page.getByRole('button',{name,exact:true});
 const closeMenu=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')!==null)await menu.locator('summary').click();};
 const select=async target=>{await page.locator(`polygon.hex[data-hex-key="${target.hexKey}"]`).dispatchEvent('click');await material(target).waitFor();};
 const load=async value=>{await page.locator('input[type=file]').setInputFiles({name:'mc1-fictional-v9.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);await page.locator(`polygon.hex[data-hex-key="${a.hexKey}"]`).waitFor();const accepted=await snapshot();assert.equal(JSON.stringify(accepted.map.tags)===JSON.stringify(value.map.tags),true,'fictional workflow fixture must pass the real import without repairing its tags');await closeMenu();};
 const ensureEdit=async()=>{if(await button('Редактировать').count())await button('Редактировать').click();};
 const toggle=target=>material(target).getByRole('button',{name:/^(Материал мифа|Myth material)$/,exact:true});
 const open=async target=>{await toggle(target).click();await material(target).locator('.myth-material-content').waitFor();};
 const ready=async target=>{await open(target);await material(target).getByRole('region',{name:/^(Знамения|Omens)$/}).waitFor();};
 const collapsed=async target=>assert.equal(await toggle(target).getAttribute('aria-expanded'),'false');
 const world=value=>({map:value.map,generation:value.generation,counters:value.counters});
 const capture=async(name,width)=>{
  await closeMenu();await page.setViewportSize({width,height:1100});await material(a).scrollIntoViewIfNeeded();
  const info=page.locator('.info-block--hex');
  const measure=await info.evaluate(el=>({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth}));
  assert.ok(measure.scrollWidth<=measure.clientWidth+1,`${name} ${width}: panel overflow ${JSON.stringify(measure)}`);
  if(await material(a).locator('.myth-material-content').count())assert.ok(await material(a).locator('.myth-material-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${name} ${width}: material overflow`);
  await info.screenshot({animations:'disabled',path:fileURLToPath(new URL(`${name}-${width}.png`,out))});return{width,...measure};
 };
 const fresh=async handler=>{
  await page.unroute(modulePattern);if(handler)await page.route(modulePattern,handler);
  await page.setViewportSize({width:1500,height:1100});await page.reload();
  const ru=page.getByRole('button',{name:'Переключить на русский',exact:true});if(await ru.count())await ru.click();
  await load(data);await select(a);
 };
 const immutable=async(before,message)=>assert.deepEqual(await snapshot(),before,message);
 const restoredFocus=async message=>{
  await page.waitForFunction(()=>{const target=document.querySelector('.info-block--hex')??document.querySelector('.map-viewport');return target&&document.activeElement===target;});
  assert.equal(await page.locator('.info-block--hex').evaluate(el=>document.activeElement===el),true,message);
 };

 // The actual lazy production module must expose the source-validated record
 // for the accepted tuple without any route replacement or map/history writes.
 await load(data);await select(a);const production=await snapshot(),productionHistory={undo:await button('Отменить').isDisabled(),redo:await button('Повторить').isDisabled()};await closeMenu();
 assert.equal(production.version,10);await ready(a);
 const actual=mythMaterialRecords.find(record=>record.entryId===a.entryId);assert.ok(actual);
 const actualOmens=material(a).getByRole('region',{name:'Знамения',exact:true}),actualRoles=material(a).getByRole('region',{name:'Роли',exact:true});
 assert.equal(await actualOmens.locator('details').count(),actual.locales.ru.omens.length);
 assert.equal(await actualRoles.locator('details').count(),actual.locales.ru.roles.length);
 for(const [index,item] of actual.locales.ru.omens.entries()){
  const detail=actualOmens.locator('details').nth(index);assert.equal(await detail.locator('summary').textContent(),String(item.ordinal));
  assert.equal(await detail.locator('p').textContent(),item.text);
 }
 await actualOmens.locator('summary').first().click();await actualRoles.locator('summary').first().click();
 assert.equal(await actualRoles.locator('details p').first().textContent(),actual.locales.ru.roles[0].text);
 const metrics=[];for(const width of [1500,390,320])metrics.push({state:'production-ready',...await capture('myth-production-ready',width)});
 await page.setViewportSize({width:1500,height:1100});await toggle(a).click();await immutable(production,'reading production material must preserve the complete accepted document');
 assert.deepEqual({undo:await button('Отменить').isDisabled(),redo:await button('Повторить').isDisabled()},productionHistory,'reading preserves existing history availability');

 await page.locator('.language-toggle').click();await collapsed(a);await ready(a);
 const englishOmens=material(a).getByRole('region',{name:'Omens',exact:true}),englishRoles=material(a).getByRole('region',{name:'Roles',exact:true});
 assert.deepEqual(await englishOmens.locator('details p').allTextContents(),actual.locales.en.omens.map(o=>o.text));
 assert.deepEqual(await englishRoles.locator('details p').allTextContents(),actual.locales.en.roles.map(r=>r.text));
 assert.doesNotMatch(await page.locator('.info-block--hex').textContent(),/[\u0400-\u04ff]/u,'English production material and legacy tag context contain no Russian text');
 for(const details of await material(a).locator('details').all())await details.locator('summary').click();
 for(const width of [1500,390,320])metrics.push({state:'production-english',...await capture('myth-production-english',width)});
 assert.deepEqual(world(await snapshot()),world(production),'English display preserves accepted world, counters and snapshots');

 await fresh(route=>route.fulfill({contentType:'text/javascript',body:moduleBody}));
 const before=await snapshot();await closeMenu();await ready(a);
 const omens=material(a).getByRole('region',{name:'Знамения',exact:true}),roles=material(a).getByRole('region',{name:'Роли',exact:true});
 assert.equal(await omens.locator('details').count(),2);assert.equal(await roles.locator('details').count(),1);
 assert.deepEqual(await omens.locator('summary').allTextContents(),['1','2']);
 assert.deepEqual(await omens.locator('details p').allTextContents(),fictionalMythMaterial[0].locales.ru.omens.map(o=>o.text),'full source order/text survives without clipping');
 assert.equal(await roles.locator('details p').textContent(),fictionalMythMaterial[0].locales.ru.roles[0].text);
 assert.ok((await roles.textContent()).includes(fictionalMythMaterial[0].locales.ru.rolePreamble));
 assert.equal(await omens.locator(':scope > p').textContent(),fictionalMythMaterial[0].locales.ru.omenPreamble);
 assert.equal(await omens.locator('summary').first().textContent(),'1','shared introduction must not become a numbered omen');
 assert.equal(await material(a).locator('img,script').count(),0);assert.equal(await page.evaluate(()=>globalThis.__mythUnsafe),undefined);
 assert.match(await material(a).textContent(),/9001/);assert.match(await material(a).textContent(),/ссылка не разрешена/);
 const first=omens.locator('summary').first();await first.focus();await page.keyboard.press('Enter');assert.notEqual(await omens.locator('details').first().getAttribute('open'),null,'native keyboard opens an omen');
 for(const item of await material(a).locator('details').all())if(await item.getAttribute('open')===null)await item.locator('summary').click();
 for(const width of [1500,390,320])metrics.push({state:'ready',...await capture('myth-ready',width)});
 await page.setViewportSize({width:1500,height:1100});await immutable(before,'opening sections and reading long content must preserve JSON, RNG, notes and counters');await closeMenu();

 // Same displayed name and neighbouring tuple boundary still select different
 // entries and owners; no catalogue name is used as a content key.
 // MC1-F02: removing a focused, open native disclosure through the actual App
 // selection handler must leave focus at the existing information container.
 await first.focus();assert.notEqual(await omens.locator('details').first().getAttribute('open'),null);
 await select(b);await restoredFocus('owner selection must restore disappearing material focus');await collapsed(b);await ready(b);
 assert.equal(await material(b).getByRole('region',{name:'Знамения',exact:true}).locator('details').count(),4);
 assert.equal(await material(b).getByRole('region',{name:'Роли',exact:true}).locator('details').count(),2);
 assert.ok((await material(b).textContent()).includes('ВЫМЫШЛЕННЫЙ МАТЕРИАЛ B.'));assert.ok(!(await material(b).textContent()).includes('ВЫМЫШЛЕННЫЙ МАТЕРИАЛ A.'));
 await select(a);await collapsed(a);await ready(a);await ensureEdit();
 const land=page.locator(`[data-tag="mb.land"][data-tag-owner="region:${a.regionId}"]`);
 if(await land.count()===0){await button('Земля +').click();await land.waitFor();await collapsed(a);await ready(a);}
 assert.ok((await material(a).textContent()).includes('ВЫМЫШЛЕННЫЙ МАТЕРИАЛ A.'));

 // Author text is an override of the row only. Real commit/Undo/Redo also
 // supply a redo branch for the subsequent no-blur/no-commit draft checks.
 await row(a).locator('.tag-text').click();let draft=row(a).getByRole('textbox');await draft.fill('Авторское вымышленное название MC1');await draft.press('Enter');
 const renamed=await snapshot();await closeMenu();await collapsed(a);await ready(a);
 assert.equal(await material(a).locator('.myth-material-context').count(),1);assert.ok((await material(a).locator('.myth-material-context').textContent()).includes(data.map.tags.instances.find(t=>t.definitionId==='mb.myth'&&t.owner.kind==='poi'&&t.owner.regionId===a.regionId).texts[0].ru));
 assert.ok((await material(a).textContent()).includes('ВЫМЫШЛЕННЫЙ МАТЕРИАЛ A.'));
 await capture('myth-override',1500);await button('Отменить').click();await collapsed(a);
 await button('Повторить').click();assert.deepEqual(await snapshot(),renamed);await closeMenu();await collapsed(a);
 await button('Отменить').click();const draftBefore=await snapshot();await closeMenu();await ready(a);
 assert.equal(await button('Повторить').isEnabled(),true);
 const pointer=async target=>{await target.scrollIntoViewIfNeeded();const rect=await target.boundingBox();assert.ok(rect);const point={x:rect.x+rect.width/2,y:rect.y+rect.height/2};assert.ok(await target.evaluate((el,p)=>el.contains(document.elementFromPoint(p.x,p.y)),point),'physical pointer must hit the intended disabled material control');await page.mouse.click(point.x,point.y);};
 const retainDraft=async(input,value,label)=>{
  await input.fill(value);assert.equal(await toggle(a).isDisabled(),true);await pointer(toggle(a));
  assert.equal(await input.evaluate(el=>document.activeElement===el),true,`${label}: material pointer must retain focus`);assert.equal(await input.inputValue(),value);
  assert.equal(await button('Повторить').isEnabled(),true,`${label}: pointer must preserve redo`);
  // No JSON export/menu action while a draft is active: that would test the
  // export action's blur behavior instead of the disabled material pointer.
  await page.locator('.info-block--hex').screenshot({animations:'disabled',path:fileURLToPath(new URL(`myth-${label.replaceAll(' ','-')}.png`,out))});
  await input.press('Escape');assert.equal(await toggle(a).isEnabled(),true);await immutable(draftBefore,`${label}: Escape must discard draft without a commit`);await closeMenu();
 };
 await row(a).locator('.tag-text').click();draft=row(a).getByRole('textbox');await retainDraft(draft,'НЕСОХРАНЁННЫЙ ЧЕРНОВИК ТЕГА','tag draft');
 await page.locator(`[data-name-key="poi:${a.regionId}:${a.hexKey}"]`).click();
 await retainDraft(page.getByRole('textbox',{name:'Название',exact:true}),'НЕСОХРАНЁННЫЙ ЧЕРНОВИК ИМЕНИ','parent name draft');
 // MC1-F01: a different TagRow has a separate local editor but shares the
 // accepted document; its blur must not be committed by reference reading.
 await land.locator('.tag-text').first().click();await retainDraft(land.getByRole('textbox'),'ВЫМЫШЛЕННЫЙ ЧЕРНОВИК ДРУГОГО ТЕГА','other row tag draft');
 await immutable(draftBefore,'all protected drafts preserve accepted document and redo');await closeMenu();

 // Locale and mode are transient reference contexts; both reset disclosure.
 await page.locator('.language-toggle').click();await collapsed(a);await open(a);
 await material(a).getByText('Material for this myth is not available',{exact:true}).waitFor();
 assert.doesNotMatch(await material(a).textContent(),/[\u0400-\u04ff]/u,'missing English material must not expose Russian fallback');
 assert.deepEqual(world(await snapshot()),world(draftBefore));await closeMenu();
 await page.locator('.language-toggle').click();await collapsed(a);
 await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('classic');
 const group=page.locator('.info-block--hex details.tag-mode').filter({has:row(a)});await group.locator('summary').first().click();await collapsed(a);await ready(a);
 assert.deepEqual(world(await snapshot()),world(draftBefore));await closeMenu();
 await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('mythic');await collapsed(a);
 await ready(a);const beforeReroll=await snapshot();await closeMenu();await row(a).locator('[data-tag-slot="0"]').click();await collapsed(a);
 const rerolled=await snapshot(),findTag=value=>value.map.tags.instances.find(t=>t.definitionId==='mb.myth'&&t.owner.kind==='poi'&&t.owner.regionId===a.regionId&&t.owner.hexKey===a.hexKey);
 assert.equal(findTag(rerolled).revision,findTag(beforeReroll).revision+1);assert.deepEqual(findTag(rerolled).values[1],findTag(beforeReroll).values[1]);await closeMenu();
 await button('Отменить').click();await collapsed(a);assert.deepEqual(await snapshot(),beforeReroll);await closeMenu();
 await ready(a);await load(beforeReroll);await select(a);await collapsed(a);await immutable(beforeReroll,'v9 reimport does not persist open state or material content');await closeMenu();

 const future=structuredClone(data);findTag(future).definitionVersion=2;await load(future);await select(a);const futureBefore=await snapshot();await closeMenu();await open(a);
 await material(a).getByRole('status').filter({hasText:'Материал этого мифа пока недоступен'}).waitFor();assert.equal(await row(a).locator('[data-tag-slot="0"]').isDisabled(),true);
 await immutable(futureBefore,'compatible map import preserves a future tag snapshot');await closeMenu();
 const noTag=structuredClone(data);noTag.map.tags.instances=noTag.map.tags.instances.filter(t=>!(t.definitionId==='mb.myth'&&t.owner.regionId===a.regionId&&t.owner.hexKey===a.hexKey));noTag.map.tags.rollCounters=Object.fromEntries(Object.entries(noTag.map.tags.rollCounters).filter(([key])=>!key.startsWith(`${a.owner}|mb.myth|`)));await load(noTag);await page.locator(`polygon.hex[data-hex-key="${a.hexKey}"]`).dispatchEvent('click');assert.equal(await material(a).count(),0,'missing tag has no material control');
 const wrongPoi=structuredClone(data);wrongPoi.map.regions.find(r=>r.id===a.regionId).centralPoiKind='dwelling';
 // Keep actual focus in an open omen through accepted import/type replacement.
 // load() exports JSON to verify acceptance, so defer that observer until after
 // the disappearing-focus assertion; an export-menu click would move focus.
 await load(data);await select(a);await ready(a);const importedSummary=material(a).getByRole('region',{name:'Знамения',exact:true}).locator('summary').first();await importedSummary.click();await importedSummary.focus();
 assert.notEqual(await importedSummary.locator('..').getAttribute('open'),null);
 await page.locator('input[type=file]').setInputFiles({name:'mc1-fictional-type-change-v9.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(wrongPoi))});
 await material(a).waitFor({state:'detached'});await restoredFocus('accepted import/type replacement must restore disappearing material focus');
 const wrongPoiAccepted=await snapshot();assert.equal(wrongPoiAccepted.map.regions.find(r=>r.id===a.regionId).centralPoiKind,'dwelling');assert.deepEqual(wrongPoiAccepted.map.tags,wrongPoi.map.tags);await closeMenu();assert.equal(await material(a).count(),0,'stale myth snapshot on a non-myth POI has no material control');

 // A known saved myth can safely lack an entry in a partial content module.
 await fresh(route=>route.fulfill({contentType:'text/javascript',body:'export default [];'}));
 const missingBefore=await snapshot();await closeMenu();await open(a);
 await material(a).getByRole('status').filter({hasText:'Материал этого мифа пока недоступен'}).waitFor();
 await immutable(missingBefore,'missing compatible material does not repair or mutate the map');await closeMenu();

 // A caught lazy-import failure stays local and preserves a valid map.
 await fresh(route=>route.abort('failed'));const failureBefore=await snapshot();await closeMenu();await open(a);
 await material(a).getByRole('status').filter({hasText:'Не удалось показать материал мифа'}).waitFor();await capture('myth-load-error',1500);await immutable(failureBefore,'lazy load error must not mutate the accepted map');await closeMenu();

 // First load deliberately completes after A→B→A. A remount has a new request
 // lifetime even when its owner/entry equal the original view.
 let release,requested;const held=new Promise(resolve=>release=resolve),started=new Promise(resolve=>requested=resolve);
 await fresh(async route=>{requested();await held;await route.fulfill({contentType:'text/javascript',body:moduleBody});});
 const delayedBefore=await snapshot();await closeMenu();await open(a);await started;
 await material(a).getByRole('status').filter({hasText:'Загрузка…'}).waitFor();
 await select(b);await collapsed(b);await select(a);await collapsed(a);const completed=page.waitForResponse(response=>modulePattern.test(response.url()));release();
 await completed;await page.waitForTimeout(30);await collapsed(a);
 assert.equal(await material(a).locator('.myth-material-content').count(),0,'stale A completion cannot reopen remounted A');
 await immutable(delayedBefore,'delayed completion must not mutate map state');await closeMenu();await ready(a);
 assert.ok((await material(a).textContent()).includes('ВЫМЫШЛЕННЫЙ МАТЕРИАЛ A.'));
 await page.unroute(modulePattern);await fs.writeFile(new URL('myth-material-metrics.json',out),JSON.stringify(metrics,null,2));
 console.log('MC1 browser workflow passed: production RU/EN material and English-only display; boundary owners; variable, escaped, grouped long material; exact JSON/history; override; local/cross-row tag and name draft pointer focus and Escape; focus restoration on selection/import; unavailable missing translation; reroll/Undo/import/mode resets; future/no-tag/wrong-POI states; load error; delayed A→B→A; 1500/390/320 layout.');
}
