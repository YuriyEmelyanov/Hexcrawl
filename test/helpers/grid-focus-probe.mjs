import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {regionFixture} from './region-fixture.mjs';
// Shared real-DOM probe: extends the existing DETAIL1 workflow, not a second
// idealized camera implementation. A fixed SVG point is tracked across views.
export async function gridFocusProbe(browser,url,dir,label){
 await fs.mkdir(dir,{recursive:true});const rows=[];
 for(const width of [1500,390,320])for(const rotated of [false,true]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());await page.goto(url);
  const data=regionFixture();data.ui.mapScale=.3;
  await page.locator('input[type=file]').setInputFiles({name:'focus-small.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-apply]').click();
  const target=page.locator('[data-detail-cell="2,0"]');await target.focus();await page.keyboard.press('Enter');if(rotated)await page.locator('.rotate-map-button').click();
  const fixed=await target.evaluate(e=>{const box=e.getBoundingClientRect(),svg=e.ownerSVGElement,p=svg.createSVGPoint();p.x=box.left+box.width/2;p.y=box.top+box.height/2;const local=p.matrixTransform(svg.getScreenCTM().inverse());return {x:local.x,y:local.y,clientX:p.x,clientY:p.y};});
  for(const step of [24,1,6]){
   await page.locator('[data-detail-step-select]').selectOption(String(step));await page.locator(`[data-detail-view="${step}"]`).waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const actual=await page.locator('[data-detail-view]').evaluate((e,f)=>{const svg=e.ownerSVGElement,p=svg.createSVGPoint();p.x=f.x;p.y=f.y;const at=p.matrixTransform(svg.getScreenCTM());return {x:at.x,y:at.y,scrollLeft:document.querySelector('.map-viewport').scrollLeft,scrollTop:document.querySelector('.map-viewport').scrollTop};},fixed);
   rows.push({width,rotated,step,error:Math.hypot(actual.x-fixed.clientX,actual.y-fixed.clientY),...actual});
  }
  if(!rotated){await page.locator('[data-detail-step-select]').scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/${label}-${width}.png`,fullPage:true});const box=await page.locator('[data-detail-step-select]').boundingBox();assert.ok(box.height>=44);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(errors,[]);await page.close();
 }
 return {label,fixture:'existing regionFixture, scale0.3, selected source2,0, unrotated/90deg, views6→24→1→6',rows,maxError:Math.max(...rows.map(r=>r.error)),fixture_loads:6};
}
