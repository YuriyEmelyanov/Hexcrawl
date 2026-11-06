import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {seaFixture} from '../helpers/sea-fixture.mjs';
import {entityNameFixture} from '../helpers/entity-name-fixture.mjs';

// One added production workflow for the new physical-address families. The
// existing POI workflow owns common form/IME/draft transition contracts.
export async function runEntityNameLifecycle({page,load,snapshot,ensureEdit,button,select,root}){
 const dir=new URL('reports/HX-BL-023-E82/',root);await fs.mkdir(dir,{recursive:true});
 const closeMenu=async()=>{const m=page.locator('details.export-menu');if(await m.getAttribute('open')!==null)await m.locator('summary').click();};
 const capture=async(name,width)=>{await page.setViewportSize({width,height:1000});await page.locator('.info-block--hex').scrollIntoViewIfNeeded();await page.screenshot({path:new URL(`${name}-${width}.png`,dir).pathname});await page.locator('.info-block--hex').screenshot({path:new URL(`${name}-panel-${width}.png`,dir).pathname});assert.ok(await page.locator('.info-block--hex').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'entity names must not overflow the common panel');};
 for(const [i,type]of ['road','obstacle','crossing','rapid','waterfall','sea'].entries()){
  await page.setViewportSize({width:1500,height:1100});const {data,key}=entityNameFixture(type);await load(data);await select(type==='sea'?'1,2':'0,0');await closeMenu();await ensureEdit();
  const before=await snapshot();await closeMenu();
  await page.locator(`[data-name-key="${key}"]`).first().click();
  const primary=page.getByRole('textbox',{name:'Название',exact:true}),secondary=page.getByRole('textbox',{name:'Название (English)',exact:true});
  await primary.waitFor();await primary.fill(`Имя ${i}`);await secondary.fill(`Name ${i}`);if(type==='road'){await capture('actual-name',1500);await capture('actual-name',390);await page.setViewportSize({width:1500,height:1100});}if(type==='sea'){await capture('sea-name',1500);await capture('sea-name',390);await capture('sea-name',320);await page.setViewportSize({width:1500,height:1100});}await secondary.press('Enter');
  const after=await snapshot();assert.deepEqual(after.map.editorNames,{[key]:{ru:`Имя ${i}`,en:`Name ${i}`}});assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.counters,before.counters);await closeMenu();
  await button('Отменить').click();assert.deepEqual(await snapshot(),before);await closeMenu();await button('Повторить').click();assert.deepEqual(await snapshot(),after);await closeMenu();
  await load(after);await ensureEdit();if(await button('Найти объект').getAttribute('aria-expanded')!=='true')await button('Найти объект').click();await page.getByRole('combobox',{name:'Тип объекта',exact:true}).selectOption('all');await page.getByRole('searchbox',{name:'Поиск по имени',exact:true}).fill(`Name ${i}`);
  const target=page.locator('[data-target-key]').filter({hasText:`Имя ${i}`});assert.equal(await target.count(),1);await target.click();assert.equal(await page.locator(`[data-name-key="${key}"]`).count()>0,true,'Find selects the physical object');
  if(type==='sea'){await select('3,3');assert.equal(await page.locator(`[data-name-key="${key}"]`).count(),1,'external Sea exposes the same single name target');await capture('sea-external',1500);await capture('sea-external',390);await page.setViewportSize({width:1500,height:1100});}
  if(type==='rapid'||type==='waterfall'){
   // Turn off through the existing selected physical marker control. If Find
   // opened a marker target,the select is already shown with no new panel.
   const label=type==='rapid'?/^пороги$/i:/^водопад$/i;const control=page.locator('.river-feature-control').filter({has:page.getByRole('combobox',{name:label,exact:true})});
   await control.getByRole('combobox',{name:label,exact:true}).selectOption('off');assert.match(await page.locator('[role=alert]').first().textContent(),new RegExp(`Имя ${i}`));assert.deepEqual(await snapshot(),after);await closeMenu();
   if(type==='rapid'){await capture('actual-refusal',390);await page.setViewportSize({width:1500,height:1100});}
  }
  if(type==='crossing'){
   const kinds=page.getByRole('combobox',{name:'Переправа 1:1',exact:true});await kinds.selectOption('bridge');assert.deepEqual((await snapshot()).map.editorNames,after.map.editorNames);await closeMenu();
  }
 }
 // SEA02/03: same water preview, explicit heir plus independent name-loss consent.
 for(const mode of ['classic','mythic']){
  const data=seaFixture(mode);data.map.editorNames={'sea:7':{ru:'Северное море',en:'Northern Sea'}};
  await load(data);await select('1,2');await closeMenu();await ensureEdit();const before=await snapshot();await closeMenu();
  await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('land');await page.locator('[data-water-finish]').click();
  const split=page.locator('[data-sea-split="7"]');assert.equal(await split.inputValue(),'');assert.equal(await page.locator('[data-water-confirm]').isDisabled(),true);assert.deepEqual(await snapshot(),before);await closeMenu();
  await split.selectOption('2,2');if(mode==='classic'){await capture('sea-split',1500);await capture('sea-split',390);await capture('sea-split',320);await page.setViewportSize({width:1500,height:1100});}
  await page.locator('[data-water-confirm]').click();const after=await snapshot();assert.equal(after.map.seas.find(s=>s.id===7).hexKeys[0],'2,2');assert.equal(after.map.nextSeaId,21);await closeMenu();await button('Отменить').click();assert.deepEqual(await snapshot(),before);await closeMenu();await button('Повторить').click();assert.deepEqual(await snapshot(),after);await closeMenu();
  const merged=seaFixture(mode,true);merged.map.editorNames={'sea:7':{ru:'Северное море',en:'Northern Sea'},'sea:12':{ru:'Залив Туманов',en:'Misty Bay'}};
  await load(merged);await select('-2,2');await closeMenu();await ensureEdit();const old=await snapshot();await closeMenu();
  await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('sea');await page.locator('[data-water-finish]').click();const merge=page.locator('[data-sea-merge]');assert.equal(await merge.inputValue(),'');await merge.selectOption('12');assert.equal(await page.locator('[data-water-confirm]').isDisabled(),true);
  assert.match(await page.locator('[data-water-loss="editorName:sea:7"]').locator('..').textContent(),/Северное море.*Northern Sea/);
  if(mode==='classic'){await capture('sea-merge',1500);await capture('sea-merge',390);await capture('sea-merge',320);await page.setViewportSize({width:1500,height:1100});}
  await page.locator('[data-water-loss="editorName:sea:7"]').check();await page.locator('[data-water-confirm]').click();const joined=await snapshot();assert.equal(joined.map.seas[0].id,12);assert.deepEqual(joined.map.editorNames,{'sea:12':merged.map.editorNames['sea:12']});await closeMenu();await button('Отменить').click();assert.deepEqual(await snapshot(),old);await closeMenu();
 }
 // Existing road confirmation now names every authored label it removes. Use
 // an interior path so ROAD's independent open-exit rule is not being bypassed.
 const {data}=entityNameFixture('road'),area=JSON.parse(await fs.readFile(new URL('../fixtures/e6-water-editor.json',import.meta.url)));
 data.map.regions[0].hexes=area.map.regions[0].hexes;data.map.regions[0].finalSize=area.map.regions[0].hexes.length;
 data.map.editorNames={'road:1':{ru:'Старый тракт',en:'Old road'},['crossing:'+data.map.crossings[0].key]:{ru:'Старый мост',en:'Old bridge'}};
 await load(data);await select('0,0');await closeMenu();await ensureEdit();await page.getByRole('button',{name:'Участок 1: 0,0 → 1,0',exact:true}).click();const beforeRemoval=await snapshot();await closeMenu();
 await button('Удалить весь выделенный путь').click();const confirmation=page.getByRole('group',{name:'Подтверждение удаления',exact:true});assert.match(await confirmation.textContent(),/Старый тракт/);assert.match(await confirmation.textContent(),/Старый мост/);await capture('actual-deletion',1500);await capture('actual-deletion',390);await page.setViewportSize({width:1500,height:1100});await confirmation.getByRole('button',{name:'Отмена',exact:true}).click();assert.deepEqual(await snapshot(),beforeRemoval);await closeMenu();
 await button('Удалить весь выделенный путь').click();await confirmation.getByRole('button',{name:'Удалить',exact:true}).click();const removed=await snapshot();assert.deepEqual(removed.map.editorNames,{});assert.equal(removed.map.roads.length,0);await closeMenu();await button('Отменить').click();assert.deepEqual(await snapshot(),beforeRemoval);await closeMenu();
 // Same common card in English and on a narrow screen,without a design gate.
 if(await page.locator('.header-links').evaluate(e=>e.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();await page.locator('.language-toggle').click();await page.locator('[data-name-key="road:1"]').first().click();await capture('actual-english',390);await page.keyboard.press('Escape');await page.locator('.language-toggle').click();await closeMenu();await page.setViewportSize({width:1500,height:1100});
 console.log('E8.2 stable entity names UI passed: six physical families plus Sea split/merge consent,RU/EN,Find,exact history/reload,feature refusal,crossing kind,and named road deletion confirmation.');
}
