import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Reuse the existing 53-edge/7-crossing world. This is the new UI boundary,
// rather than another routing or random-generation corpus.
export async function checkGeometryRefinement({page,step,snap,button,lang,shot,manifest,out,fixture}){
 await lang('en');await page.setViewportSize({width:1500,height:1000});
 await page.locator('input[type=file]').setInputFiles({name:'geo2-source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await step.selectOption('1');
 const before=await snap(),refine=page.locator('[data-refine-geography]'),preview=page.locator('[data-geometry-preview]');
 await refine.click();await preview.waitFor();
 assert.ok(await preview.locator('[data-refined-river]').count());
 assert.equal(await page.locator('svg[data-render-phase] [data-fine-world] [data-refined-geography]').count(),0,'candidate is separate from accepted scene');
 assert.deepEqual(await snap(),before,'Preview does not change document or RNG');
 for(const locale of ['ru','en'])for(const width of [1500,390,320]){await lang(locale);await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await preview.scrollIntoViewIfNeeded();await shot(`geo2-preview-${locale}-${width}.jpg`);}
 await lang('en');await page.setViewportSize({width:1500,height:1000});
 assert.equal(await page.locator('[data-geometry-preview-overlay] [data-refined-geography]').count(),1,'proposed geometry is visible over the main map');
 const exportMenu=page.locator('details.export-menu');if(await exportMenu.getAttribute('open')===null)await exportMenu.locator('summary').click();
 await page.evaluate(()=>window.__oneSvg=null);const [pendingPng]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);await fs.copyFile(await pendingPng.path(),new URL('geo2-preview-accepted-only.png',out));
 assert.doesNotMatch(await page.evaluate(()=>window.__oneSvg),/data-geometry-preview|data-refined-geography/,'PNG excludes the unaccepted overlay');
 await page.keyboard.press('Escape');await preview.waitFor({state:'detached'});assert.equal(await refine.evaluate(el=>el===document.activeElement),true);assert.deepEqual(await snap(),before);
 await refine.click();await preview.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual(await snap(),before);
 await refine.click();await preview.getByRole('button',{name:'Apply',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-fine-step]')?.value==='1'&&!document.querySelector('[data-geometry-preview]'));
 const accepted=await snap(),g=accepted.map.physicalGrid.geometryRefinement;
 assert.match(await page.locator('details.export-menu small').textContent(),/JSON v16/);
 assert.equal(g.riverPlan.paths.length,53);assert.equal(g.roads.crossings.length,7);
 assert.deepEqual(accepted.generation,before.generation);
 const artwork=page.locator('svg[data-render-phase] [data-refined-geography]');
 assert.equal(await artwork.locator('[data-fine-crossing]').count(),7);
 const signature=()=>artwork.evaluate(el=>({riverMasks:[...el.querySelector('mask').querySelectorAll('path')].map(n=>n.getAttribute('d')),visibleWater:[...el.closest('[data-fine-world]').querySelectorAll('.lake-water-layer clipPath path')].map(n=>n.getAttribute('d')),rivers:[...el.querySelectorAll('[data-refined-river]')].map(n=>[n.getAttribute('data-refined-river'),n.getAttribute('points'),n.getAttribute('stroke-width')]),roads:[...el.querySelectorAll('.roads-layer line')].map(n=>['x1','y1','x2','y2','opacity','stroke-dasharray'].map(k=>n.getAttribute(k))),rails:[...el.querySelectorAll('.roads-layer polyline')].map(n=>n.getAttribute('points'))}));
 const expected=await signature();assert.ok(expected.rivers.length&&expected.roads.length);assert.deepEqual(expected.riverMasks,expected.visibleWater,'visible water and river masks share exact accepted contours');
 for(const width of [1500,390,320]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await shot(`geo2-accepted-${width}.jpg`);}
 await button('Undo').click();assert.deepEqual((await snap()).map,before.map);
 await button('Redo').click();await step.selectOption('1');assert.deepEqual((await snap()).map.physicalGrid.geometryRefinement,g);assert.deepEqual(await signature(),expected);
 await step.selectOption('6');assert.equal(await page.locator('svg[data-render-phase] [data-refined-geography]').count(),0);await step.selectOption('1');assert.deepEqual(await signature(),expected);
 const pngs=[];const saveRefinedPng=async label=>{
  const visible=await signature();assert.deepEqual(visible.riverMasks,visible.visibleWater,'visible body and clipped river agree in this mode');
  const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
 await page.evaluate(()=>window.__oneSvg=null);
 const [download]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);
 await fs.copyFile(await download.path(),new URL(`${label}.png`,out));
 const svg=await page.evaluate(()=>window.__oneSvg);assert.ok(svg?.includes('data-refined-geography'));assert.ok(!svg.includes('data-geometry-preview'));
 const exported=await page.evaluate(text=>{const root=new DOMParser().parseFromString(text,'image/svg+xml'),el=root.querySelector('[data-refined-geography]');return {riverMasks:[...el.querySelector('mask').querySelectorAll('path')].map(n=>n.getAttribute('d')),visibleWater:[...el.closest('[data-fine-world]').querySelectorAll('.lake-water-layer clipPath path')].map(n=>n.getAttribute('d')),rivers:[...el.querySelectorAll('[data-refined-river]')].map(n=>[n.getAttribute('data-refined-river'),n.getAttribute('points'),n.getAttribute('stroke-width')]),roads:[...el.querySelectorAll('.roads-layer line')].map(n=>['x1','y1','x2','y2','opacity','stroke-dasharray'].map(k=>n.getAttribute(k))),rails:[...el.querySelectorAll('.roads-layer polyline')].map(n=>n.getAttribute('points'))};},svg);
 assert.deepEqual(exported,visible,'PNG uses actual accepted paths, water masks and crossings');
  pngs.push(label);
 };
 for(let i=0;i<3;i++){const mode=await page.locator('svg[data-render-phase]').getAttribute('data-biome-display');await saveRefinedPng(`geo2-${mode}`);await shot(`geo2-${mode}.jpg`);await page.locator('button.biome-display-toggle').click();}
 await page.locator('.rotate-map-button').click();await saveRefinedPng('geo2-rotated');await page.locator('.rotate-map-button').click();
 assert.deepEqual(await signature(),expected,'style and rotation preserve accepted choices');manifest.geo2_png=pngs;
 await page.locator('input[type=file]').setInputFiles({name:'geo2-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(await snap()))});
 assert.deepEqual((await snap()).map.physicalGrid.geometryRefinement,g);assert.deepEqual(await signature(),expected);
 // Existing source controls must commit dependent geometry automatically.
 // Six small UI profiles reuse one resolved rapid, with an injected prepare
 // failure to check the localized atomic error/Redo path independently of RNG.
 const rapid=g.riverPlan.rapids[0];assert.ok(rapid);
 for(const locale of ['ru','en'])for(const width of [1500,390,320]){
  await lang(locale);await page.setViewportSize({width,height:1000});await step.selectOption('6');
  const chooseRapid=async()=>{
   const edit=page.getByRole('button',{name:locale==='ru'?'Редактировать':'Edit',exact:true});if(await edit.count())await edit.click();
   await page.locator(`[data-river-map-edge="${rapid.riverId}:${rapid.sourceEdgeKey}"]`).press('Enter');
   await page.locator('.river-feature-control select').waitFor();
  };
  await chooseRapid();
  const control=page.locator('.river-feature-control select'),base=await snap();
  await control.selectOption('off');const changed=await snap();
  assert.equal(await preview.count(),0,'ordinary edit adds no geometry proposal');
  assert.ok(!changed.map.physicalGrid.geometryRefinement.riverPlan.rapids.some(r=>r.riverId===rapid.riverId&&r.sourceEdgeKey===rapid.sourceEdgeKey));
  assert.deepEqual(changed.generation,base.generation);
  await button(locale==='ru'?'Отменить':'Undo').click();assert.deepEqual((await snap()).map,base.map);
  assert.equal(await button(locale==='ru'?'Повторить':'Redo').isEnabled(),true);
  await chooseRapid();await page.evaluate(()=>window.__failGeoPrepare=true);await control.selectOption('off');
  assert.deepEqual((await snap()).map,base.map,'failed preparation preserves the accepted document');
  assert.equal(await button(locale==='ru'?'Повторить':'Redo').isEnabled(),true,'failure preserves Redo');
  const message=(await page.locator('.direct-error').allTextContents()).join(' ');
  assert.match(message,locale==='ru'?/Карта сохранена без изменений/:/Map unchanged/);assert.doesNotMatch(message,/GEO2|prepare_|river_mouth/);assert.match(message,/detail-poi:1/);
  await shot(`geo2-source-error-${locale}-${width}.jpg`);
  await button(locale==='ru'?'Повторить':'Redo').click();assert.deepEqual((await snap()).map,changed.map);
  await button(locale==='ru'?'Отменить':'Undo').click();await step.selectOption('1');
  const importData=await snap();await page.evaluate(()=>{window.__releaseFineImport=null;window.__holdFineImport=true;});
  await page.locator('input[type=file]').setInputFiles({name:'geo2-busy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(importData))});
  await page.waitForFunction(()=>typeof window.__releaseFineImport==='function');
  assert.equal(await refine.isEnabled(),false,'existing import busy guard blocks refinement');assert.equal(await preview.count(),0);
  await shot(`geo2-source-busy-${locale}-${width}.jpg`);await page.evaluate(()=>window.__releaseFineImport());
  await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
  assert.deepEqual((await snap()).map,importData.map);assert.equal(await preview.count(),0,'import never auto-refines');
 }
 manifest.cases.push({id:'G209-AUTO-source-edit-error-busy-RU-EN',status:'pass',viewports:[1500,390,320],locales:['ru','en'],failure:'injected preparation failure',ordinarySuccess:'disable resolved rapid without additional geometry preview'});
 manifest.cases.push({id:'GEO2-UI-preview-apply-history-roundtrip-PNG',status:'pass',sourcePaths:53,crossings:7,viewports:[1500,390,320]});
}
