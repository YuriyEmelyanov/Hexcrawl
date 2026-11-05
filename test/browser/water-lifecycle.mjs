// Focused E6 addition to save-history's existing browser/context/corpus runner.
// It is one lifecycle, not another copy of the broad suite.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
export async function runWaterLifecycle({page,load,snapshot,ensureEdit,button,select,root,browser}){
 const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/e6-water-editor.json',import.meta.url)));
 const out=new URL('reports/HX-BL-023-E6/',root);await fs.mkdir(out,{recursive:true});
 const metrics=[];
 const capture=async(name,width=1500)=>{await closeMenu();await page.setViewportSize({width,height:1100});await page.locator('[data-water-panel]').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL(`${name}-${width}.png`,out))});};
 const png=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const got=page.waitForEvent('download');await button('PNG').click();return fs.readFile(await(await got).path());};
 const closeMenu=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')!==null)await menu.locator('summary').click();};
 const checkWaterViews=async(lakes,seaKey)=>{
  for(let i=0;i<3;i++){
   const toggle=page.locator('.biome-display-toggle'),mode=await toggle.getAttribute('data-mode');
   assert.equal(await page.locator('[data-lake-shape]').count(),mode==='color'?lakes:0,'edited lake contours belong only to Color');
   if(seaKey){assert.equal(await page.locator(`polygon.hex.sea[data-hex-key="${seaKey}"]`).count(),1);assert.equal(await page.locator(`.terrain-overlay[data-terrain-key="${seaKey}"]`).count(),0);}
   await toggle.click();
  }
 };

 for(const mode of['classic','mythic']){
  const data=structuredClone(fixture);data.ui.generationMode=mode;data.map.regions[0].generationMode=mode;
  await page.setViewportSize({width:1500,height:1100});await load(data);await select('0,0');
  const before=await snapshot();await closeMenu();const originalPng=await png();await closeMenu();
  const row=page.locator('[data-water-panel] > .direct-line'),readHeight=await row.evaluate(e=>e.getBoundingClientRect().height);
  if(mode==='classic')await capture('before-read');await ensureEdit();
  assert.equal(await row.evaluate(e=>e.getBoundingClientRect().height),readHeight,'E6 read/edit water row remains equally compact');
  if(mode==='classic')await capture('edit');
  await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('lake');
  assert.equal(await page.locator('[data-water-draft-cell="0,0"]').count(),1);assert.deepEqual(await snapshot(),before,'water draft exports accepted document only');
  assert.equal(await button('Отменить').isDisabled(),true);assert.deepEqual(await png(),originalPng,'PNG excludes water mask');await closeMenu();
  await page.getByRole('combobox',{name:'Добавить или убрать клетку',exact:true}).selectOption('1,0');
  assert.equal(await page.locator('[data-water-draft-cell]').count(),2);
  // Imperative wheel must synchronize the independent mask immediately.
  const viewport=page.locator('.map-viewport');await viewport.scrollIntoViewIfNeeded();const box=await viewport.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,-300);await page.waitForTimeout(80);
  const alignment=await page.evaluate(()=>{const a=document.querySelector('polygon.hex[data-hex-key="0,0"]').getBoundingClientRect(),b=document.querySelector('[data-water-draft-cell="0,0"]').getBoundingClientRect();return Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height));});assert.ok(alignment<.5,`water mask tracks wheel (${alignment}px)`);
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.6+35,box.y+box.height*.5+25);await page.mouse.up();assert.equal(await page.locator('[data-water-draft-cell]').count(),2,'pan must not paint water');
  await button('Повернуть карту на 90 градусов').click();assert.equal(await page.locator('[data-water-draft-cell]').count(),2);await button('Вернуть исходный поворот карты').click();
  if(mode==='classic'){await capture('draft');await capture('draft',390);}
  const beforeCommit=await snapshot();assert.deepEqual(beforeCommit.map,before.map);assert.deepEqual(beforeCommit.generation,before.generation);
  await page.locator('[data-water-finish]').click();const after=await snapshot();assert.ok(after.map.terrainByHexKey['0,0'].lakeId);assert.equal(after.map.terrainByHexKey['0,0'].lakeId,after.map.terrainByHexKey['1,0'].lakeId);assert.deepEqual(after.generation,before.generation);assert.equal(after.map.biomeOverrideByHexKey['0,0'],before.map.biomeOverrideByHexKey['0,0']);assert.equal(after.map.gmNotesByHexKey['0,0'],before.map.gmNotesByHexKey['0,0']);
  await button('Отменить').click();assert.deepEqual(await snapshot(),beforeCommit);await button('Повторить').click();assert.deepEqual(await snapshot(),after);await load(after);assert.deepEqual(await snapshot(),after);await ensureEdit();await checkWaterViews(1);
  if(mode==='classic'){await capture('after');await capture('after',390);}
  await page.locator('[data-water-shore]').click();await page.getByRole('combobox',{name:'Вода в черновике',exact:true}).selectOption('land');await page.locator('[data-water-whole]').click();await page.locator('[data-water-finish]').click();
  assert.equal(await page.locator('[data-water-confirm]').isDisabled(),true);assert.deepEqual((await snapshot()).map,after.map);
  if(mode==='classic'){await capture('preview');await capture('preview',390);}
  for(const input of await page.locator('[data-water-loss]').all())await input.check();await page.locator('[data-water-confirm]').click();const land=await snapshot();assert.equal(land.map.terrainByHexKey['0,0'],undefined);assert.equal(land.map.terrainByHexKey['1,0'],undefined);assert.equal(land.counters.nextLakeId,after.counters.nextLakeId);assert.equal(land.map.gmNotesByHexKey['0,0'],before.map.gmNotesByHexKey['0,0']);
  await button('Отменить').click();assert.deepEqual(await snapshot(),after);await button('Повторить').click();assert.deepEqual(await snapshot(),land);
  await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('lake');await page.keyboard.press('Escape');assert.equal(await page.locator('[data-water-draft]').count(),0);assert.deepEqual(await snapshot(),land);
  for(const width of[1500,390,320]){await page.setViewportSize({width,height:1100});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),mode+' no horizontal overflow');metrics.push({mode,width,no_horizontal_overflow:true,read_edit_row_height:readHeight});}
 }
 // Sea inside a retained region must render as sea, not as its hidden biome.
 await page.setViewportSize({width:1500,height:1100});await load(fixture);await select('3,0');await ensureEdit();const beforeSea=await snapshot();
 await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('sea');await page.getByRole('combobox',{name:'Добавить или убрать клетку',exact:true}).selectOption('3,1');await page.locator('[data-water-finish]').click();const sea=await snapshot();
 assert.equal(await page.locator('polygon.hex.sea[data-hex-key="3,0"]').count(),1,'owned sea override must render once as water');assert.deepEqual(sea.map.regions[0].hexes,beforeSea.map.regions[0].hexes);assert.equal(sea.map.regions[0].isCoastal,true);await checkWaterViews(0,'3,0');await load(sea);assert.deepEqual(await snapshot(),sea);assert.equal(await page.locator('polygon.hex.sea[data-hex-key="3,0"]').count(),1);
 await select('3,0');await ensureEdit();await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('land');await page.locator('[data-water-whole]').click();await page.locator('[data-water-finish]').click();assert.equal((await snapshot()).map.terrainByHexKey['3,0'],undefined);
 const outside=structuredClone(fixture);outside.map.terrainByHexKey={'4,0':{terrainOverride:'sea'},'4,1':{terrainOverride:'sea'}};outside.map.gmNotesByHexKey['4,0']='Заметка морского гекса';await load(outside);await select('4,0');await ensureEdit();const beforeReclaim=await snapshot();
 await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('land');await page.locator('[data-water-whole]').click();await page.locator('[data-water-finish]').click();assert.equal(await page.locator('[data-water-confirm]').isDisabled(),true);await page.getByRole('combobox',{name:'Регион возвращаемой воды 4,0',exact:true}).selectOption('1');await page.locator('[data-water-confirm]').click();const reclaimed=await snapshot();assert.ok(reclaimed.map.regions[0].hexes.some(h=>h.q===4&&h.r===0));assert.equal(reclaimed.map.gmNotesByHexKey['4,0'],outside.map.gmNotesByHexKey['4,0']);assert.deepEqual(reclaimed.generation,beforeReclaim.generation);await button('Отменить').click();assert.deepEqual(await snapshot(),beforeReclaim);await button('Повторить').click();assert.deepEqual(await snapshot(),reclaimed);
 await closeMenu();if(await page.locator('.header-links').evaluate(el=>el.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();await button('Switch to English').click();assert.ok(await page.getByRole('combobox',{name:'Water',exact:true}).count());await page.getByRole('combobox',{name:'Water',exact:true}).selectOption('lake');assert.ok(await page.getByRole('combobox',{name:'Draft water',exact:true}).count());await page.keyboard.press('Escape');await button('Переключить на русский').click();
 // A real road blocks the edit and retains the mask for correction.
 const blocked=structuredClone(fixture);blocked.map.roads=[{id:1,regionId:1,segments:[{from:{q:0,r:0},to:{q:1,r:0},kind:'trail'}]}];blocked.counters.nextRoadId=2;
 await load(blocked);await select('0,0');await ensureEdit();const safe=await snapshot();await page.getByRole('combobox',{name:'Вода',exact:true}).selectOption('lake');await page.locator('[data-water-finish]').click();assert.match(await page.locator('[data-water-error]').innerText(),/Дорога|Road/);assert.deepEqual(await snapshot(),safe);await capture('error');await capture('error',390);await page.locator('[data-water-reset]').click();
 await fs.writeFile(new URL('metrics.json',out),JSON.stringify({kind:'permanent_browser_lifecycle',browser:browser.version(),status:'pass',metrics},null,2));
 console.log('E6 water lifecycle: Classic/Mythic, draft/whole-body/preview/error, notes+biome+RNG, exact history/JSON, PNG mask exclusion, wheel+pan+rotation, 1500/390/320 passed.');
}
