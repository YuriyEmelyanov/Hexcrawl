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
 assert.equal(await page.locator('svg[data-render-phase] [data-refined-geography]').count(),0,'candidate is separate from accepted map');
 assert.deepEqual(await snap(),before,'Preview does not change document or RNG');
 await page.keyboard.press('Escape');await preview.waitFor({state:'detached'});assert.equal(await refine.evaluate(el=>el===document.activeElement),true);assert.deepEqual(await snap(),before);
 await refine.click();await preview.getByRole('button',{name:'Cancel',exact:true}).click();assert.deepEqual(await snap(),before);
 await refine.click();await preview.getByRole('button',{name:'Apply',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[data-fine-step]')?.value==='1'&&!document.querySelector('[data-geometry-preview]'));
 const accepted=await snap(),g=accepted.map.physicalGrid.geometryRefinement;
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
 const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
 await page.evaluate(()=>window.__oneSvg=null);
 const [download]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);
 await fs.copyFile(await download.path(),new URL('geo2-accepted.png',out));
 const svg=await page.evaluate(()=>window.__oneSvg);assert.ok(svg?.includes('data-refined-geography'));assert.ok(!svg.includes('data-geometry-preview'));
 const exported=await page.evaluate(text=>{const root=new DOMParser().parseFromString(text,'image/svg+xml'),el=root.querySelector('[data-refined-geography]');return {riverMasks:[...el.querySelector('mask').querySelectorAll('path')].map(n=>n.getAttribute('d')),visibleWater:[...el.closest('[data-fine-world]').querySelectorAll('.lake-water-layer clipPath path')].map(n=>n.getAttribute('d')),rivers:[...el.querySelectorAll('[data-refined-river]')].map(n=>[n.getAttribute('data-refined-river'),n.getAttribute('points'),n.getAttribute('stroke-width')]),roads:[...el.querySelectorAll('.roads-layer line')].map(n=>['x1','y1','x2','y2','opacity','stroke-dasharray'].map(k=>n.getAttribute(k))),rails:[...el.querySelectorAll('.roads-layer polyline')].map(n=>n.getAttribute('points'))};},svg);
 assert.deepEqual(exported,expected,'PNG uses the actual accepted paths and crossings');
 await page.locator('input[type=file]').setInputFiles({name:'geo2-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(await snap()))});
 assert.deepEqual((await snap()).map.physicalGrid.geometryRefinement,g);assert.deepEqual(await signature(),expected);
 manifest.cases.push({id:'GEO2-UI-preview-apply-history-roundtrip-PNG',status:'pass',sourcePaths:53,crossings:7,viewports:[1500,390,320]});
}
