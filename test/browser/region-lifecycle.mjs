import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {regionFixture} from '../helpers/region-fixture.mjs';
// E7 extends the existing save/history browser and corpus runner. Two mode
// lifecycles test native selectors, shared Done/Esc and exact accepted exports.
export async function runRegionLifecycle({page,load,snapshot,ensureEdit,button,select,root}){
 const out=new URL('reports/HX-BL-023-E7/',root);await fs.mkdir(out,{recursive:true});
 const closeMenu=async()=>{const m=page.locator('details.export-menu');if(await m.getAttribute('open')!==null)await m.locator('summary').click();};
 const png=async()=>{const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const got=page.waitForEvent('download');await button('PNG').click();return fs.readFile(await(await got).path());};
 const capture=async(name,width)=>{await closeMenu();await page.setViewportSize({width,height:1100});await page.locator('[data-region-editor]').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL(`${name}-${width}.png`,out))});await page.locator('.info-block--hex').screenshot({path:fileURLToPath(new URL(`${name}-panel-${width}.png`,out))});const box=await page.locator('[data-region-editor]').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(box.scroll<=box.width+1,`${name}/${width} does not overflow`);};
 for(const mode of ['classic','mythic']){
  await page.setViewportSize({width:1500,height:1100});await load(regionFixture(mode,{river:true}));await select('2,0');await closeMenu();
  const before=await snapshot();await closeMenu();const acceptedPng=mode==='classic'?await png():null;await closeMenu();if(mode==='classic')await capture('before',1500);
  await ensureEdit();await page.getByRole('button',{name:/^Высота региона /}).click();await page.locator('[data-region-height]').selectOption('2');
  assert.equal(await page.locator('[data-region-height-biome]').inputValue(),'');assert.deepEqual(await snapshot(),before,'height alone remains a draft');await closeMenu();
  await page.locator('[data-region-height-biome]').selectOption('open_hills');await page.locator('[data-region-height-biome]').press('Enter');
  assert.match(await page.locator('[data-region-exception-count]').textContent(),/1/);
  assert.equal(await page.locator('[data-region-owner-count]').textContent(),'0');assert.match(await page.locator('[data-region-affected-rivers]').textContent(),/Серебряная река \(#5\)/);assert.match(await page.locator('.water-export-notice').textContent(),/Черновик региона не входит в JSON и PNG/);
  assert.equal(await page.locator('[data-region-preview]').count(),1,'native Enter does not accept command');assert.deepEqual(await snapshot(),before);await closeMenu();
  await page.locator('[data-region-mark-change="rapids"] summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-region-preview]').count(),1,'Enter opens marker details without accepting the command');
  if(acceptedPng){assert.deepEqual(await png(),acceptedPng,'PNG exports accepted world without E7 overlays');await closeMenu();}
  if(mode==='classic')for(const width of [1500,390,320])await capture('height-preview',width);
  if(mode==='classic')await button('Готово').click();else{await page.locator('[data-region-preview]').focus();await page.keyboard.press('Enter');assert.equal(await button('Редактировать').count(),1);}
  const height=await snapshot();assert.equal(height.map.regions[0].heightLevel,2);assert.equal(height.map.regions[0].biomeId,'open_hills');await closeMenu();
  await button('Отменить').click();assert.deepEqual(await snapshot(),before);await closeMenu();await button('Повторить').click();assert.deepEqual(await snapshot(),height);await closeMenu();await button('Отменить').click();
  await ensureEdit();await page.getByRole('button',{name:/^Передать гекс региону /}).click();
  assert.equal(await page.locator('[data-region-map-target="2"]').count(),1);await page.locator('polygon.hex[data-hex-key="3,0"]').click({force:true});assert.equal(await page.locator('[data-region-transfer]').inputValue(),'2');assert.ok(await page.locator('[data-region-target-contour]').count()>0);
  assert.deepEqual(await snapshot(),before,'map target selection changes only the draft');await closeMenu();await page.locator('[data-region-transfer]').selectOption('1');assert.equal(await page.locator('[data-region-preview]').count(),0,'return to source closes no-op');
  await page.getByRole('button',{name:/^Передать гекс региону /}).click();await page.locator('[data-region-transfer]').selectOption('2');
  assert.equal(await page.locator('[data-region-draft-cell="2,0"]').count(),1);assert.equal(await button('Отменить').isDisabled(),true);assert.equal(await page.getByRole('combobox',{name:'Режим',exact:true}).isDisabled(),true);
  await page.locator('polygon.hex[data-hex-key="3,0"]').click({force:true});assert.deepEqual(await snapshot(),before,'physical selection cannot silently accept transfer');await closeMenu();
  assert.equal(await page.locator('[data-region-owner-count]').textContent(),'1');await page.locator('[data-region-owner-plan] summary').click();assert.match(await page.locator('[data-region-owner-plan]').textContent(),/#1.*#2/);
  await page.locator('[data-region-poi-identity] summary').click();assert.match(await page.locator('[data-region-poi-identity]').textContent(),/settlement:1:2,0.*settlement:2:2,0/s);assert.match(await page.locator('[data-region-cell-effect]').textContent(),/Высота гекса: 1 → 1/);
  await page.locator('.side-panel-toggle').click();await page.locator('.side-panel-toggle').click();assert.equal(await page.locator('[data-region-transfer]').inputValue(),'2','panel visibility does not discard draft');
  if(mode==='classic')for(const width of [1500,390,320])await capture('transfer-preview',width);
  await page.keyboard.press('Escape');assert.equal(await page.locator('[data-region-preview]').count(),0);assert.deepEqual(await snapshot(),before);await closeMenu();
  await button('Повторить').click();assert.deepEqual(await snapshot(),height,'Escape retains executable Redo');await closeMenu();await button('Отменить').click();
  await ensureEdit();await page.getByRole('button',{name:/^Передать гекс региону /}).click();await page.locator('[data-region-transfer]').selectOption('2');if(mode==='classic')await button('Готово').click();else{await page.locator('.map-viewport').focus();await page.keyboard.press('Enter');}
  const after=await snapshot();assert.equal(after.map.regions[0].hexes.length,2);assert.equal(after.map.regions[1].hexes.length,3);assert.deepEqual(after.map.regions[1].pointsOfInterest,[{q:2,r:0}]);
  assert.deepEqual(after.map.biomeOverrideByHexKey,before.map.biomeOverrideByHexKey);assert.deepEqual(after.map.gmNotesByHexKey,before.map.gmNotesByHexKey);assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.counters,before.counters);
  assert.deepEqual(after.map.candidateHexes,before.map.candidateHexes);assert.equal(after.map.rivers[0].sectors[0].assignedRegionId,2);
  await closeMenu();if(mode==='classic')for(const width of [1500,390,320])await capture('after-transfer',width);
  await button('Отменить').click();assert.deepEqual(await snapshot(),before);await closeMenu();await button('Повторить').click();assert.deepEqual(await snapshot(),after);await closeMenu();
  await load(after);assert.deepEqual(await snapshot(),after,'edited export imports exactly');await closeMenu();
  await page.setViewportSize({width:1500,height:1100});await ensureEdit();await page.getByRole('button',{name:/^Передать гекс региону /}).click();
  const cell=page.locator('[data-region-draft-cell="2,0"]'),base=page.locator('polygon.hex[data-hex-key="2,0"]');
  for(let i=0;i<2;i++){await page.locator('.rotate-map-button').click();await base.scrollIntoViewIfNeeded();await base.hover({force:true});await page.mouse.wheel(0,i?-80:80);await page.waitForTimeout(100);const delta=await page.evaluate(()=>{const a=document.querySelector('[data-region-draft-cell="2,0"]'),b=document.querySelector('polygon.hex[data-hex-key="2,0"]');return Math.max(...Array.from(a.points).map((p,i)=>{const x=p.matrixTransform(a.getScreenCTM()),y=b.points[i].matrixTransform(b.getScreenCTM());return Math.hypot(x.x-y.x,x.y-y.y);}));});assert.ok(delta<1,`draft follows rotation/wheel geometric vertices: ${delta}`);}
  assert.deepEqual((await snapshot()).map,after.map,'navigation does not apply draft');await closeMenu();await page.keyboard.press('Escape');
  if(mode==='classic'){if(await page.locator('.header-links').evaluate(e=>e.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();await page.locator('.language-toggle').click();assert.equal(await page.getByRole('button',{name:/^Region height /}).count(),1);await capture('english',390);await page.locator('.language-toggle').click();}
 }
 // R1-F01/F04: a separate ambiguity fixture isolates equal names and overlapping
 // physical44px hits. It reuses this runner, page and export observer.
 await page.setViewportSize({width:1500,height:1100});await load(regionFixture('classic',{duplicateTargets:true}));await select('2,0');await closeMenu();await ensureEdit();
 const original=await snapshot();await closeMenu();await page.getByRole('button',{name:/^Передать гекс региону /}).click();
 const options=await page.locator('[data-region-transfer] option').allTextContents();assert.ok(options.some(x=>x.includes('#2'))&&options.some(x=>x.includes('#3')),'equal names have distinct stable IDs');
 await page.locator('.map-viewport').hover();await page.mouse.wheel(0,700);await page.waitForTimeout(200);await page.locator('.rotate-map-button').click();
 const geometry=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-region-map-target]')).map(e=>{const m=e.getScreenCTM(),c=new DOMPoint(e.cx.baseVal.value,e.cy.baseVal.value).matrixTransform(m),a=new DOMPoint(e.cx.baseVal.value-e.r.baseVal.value,e.cy.baseVal.value).matrixTransform(m),b=new DOMPoint(e.cx.baseVal.value+e.r.baseVal.value,e.cy.baseVal.value).matrixTransform(m);return {id:e.getAttribute('data-region-map-target'),x:c.x,y:c.y,width:Math.hypot(a.x-b.x,a.y-b.y)};}));
 assert.equal(geometry.length,2);assert.ok(geometry.every(p=>Math.abs(p.width-44)<0.1),'map targets remain44 CSSpx under wheel/rotation');
 const mid={x:(geometry[0].x+geometry[1].x)/2,y:(geometry[0].y+geometry[1].y)/2};await page.mouse.click(mid.x,mid.y);
 assert.match(await page.locator('[data-region-error]').textContent(),/несколько целей/);await button('Готово').click();assert.equal(await page.locator('[data-region-preview]').count(),1,'ambiguous hit cannot accept a previous target');assert.deepEqual((await snapshot()).map,original.map);await closeMenu();
 await page.locator('[data-region-transfer]').selectOption('3');const target=page.locator('[data-region-map-target="2"]');await target.focus();await page.keyboard.press(' ');await page.keyboard.press('Enter');assert.equal(await page.locator('[data-region-transfer]').inputValue(),'2');assert.equal(await page.locator('[data-region-preview]').count(),1,'focused target keys select without committing');
 await page.locator('[data-region-transfer]').selectOption('3');await button('Готово').click();const moved=await snapshot();assert.ok(moved.map.regions.find(r=>r.id===3).hexes.some(h=>h.q===2&&h.r===0));assert.deepEqual(moved.map.candidateHexes,original.map.candidateHexes);await closeMenu();await button('Отменить').click();assert.deepEqual((await snapshot()).map,original.map);await closeMenu();await button('Повторить').click();assert.deepEqual((await snapshot()).map,moved.map);await closeMenu();
 console.log('E7 map ambiguity: duplicate names/IDs,44px rotated/zoomed hits, explicit keyboard/list resolution, no ambiguous commit and exact Undo/Redo passed.');
 await page.setViewportSize({width:1500,height:1100});console.log('E7 region lifecycle: classic/Mythic, explicit height/biome, transfer, draft guards, Esc, exact Undo/Redo and v7 reload; 1500/390/320 screenshots.');
}
