import {stripVTControlCharacters} from 'node:util';
import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {regionFixture} from '../helpers/region-fixture.mjs';
const require=createRequire(process.cwd()+'/package.json'),{chromium}=require('playwright');const dir='reports/DETAIL1';await fs.mkdir(dir,{recursive:true});const data=regionFixture();Object.assign(data.map.regions[0],{centerHex:{q:2,r:0},suppressCentralPoi:false,centralPoiKind:'capital',pointsOfInterest:[],pointOfInterestKinds:{}});data.ui.mapScale=2.4;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4190','--strictPort'],{stdio:['ignore','pipe','inherit']});let browser;
try{await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Preview startup timeout: '+stripVTControlCharacters(output))),10000);server.stdout.on('data',d=>{output+=d;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',e=>{clearTimeout(timer);reject(e);});server.on('exit',c=>{clearTimeout(timer);reject(Error('Preview exited: '+c));});});browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});await page.route(/mc\.yandex/,r=>r.abort());await page.goto('http://127.0.0.1:4190');await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'capital.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-detail-preview]').waitFor();
await page.screenshot({path:dir+'/desktop-before.png',fullPage:true});await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-apply]').waitFor();assert.ok(await page.locator('[data-detail-preview-poi]').count());assert.equal(await page.locator('svg[data-biome-display] [data-detail-preview-poi]').count(),0,'preview excluded from exported map artwork');await page.screenshot({path:dir+'/desktop-preview.png',fullPage:true});await page.locator('[data-detail-adaptation]').screenshot({path:dir+'/panel-1500.png'});
await page.locator('.export-menu summary').click();assert.equal(await page.locator('.export-menu').getAttribute('open')!==null,true);await page.locator('[data-detail-apply]').scrollIntoViewIfNeeded();assert.ok(await page.locator('[data-detail-apply]').evaluate(e=>{const b=e.getBoundingClientRect();return e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'export menu does not cover Apply');await page.locator('.export-menu summary').click();
await page.locator('[data-detail-cancel]').click();assert.equal(await page.locator('[data-detail-preview-overlay]').count(),0);await page.locator('[data-detail-preview]').click();await page.waitForFunction(()=>document.querySelector('[data-detail-adaptation]')?.contains(document.activeElement));await page.keyboard.press('Escape');await page.locator('[data-detail-apply]').waitFor({state:'detached'});
await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-apply]').click();await page.getByText('Охваты POI сохранены.',{exact:true}).waitFor();await page.screenshot({path:dir+'/desktop-applied.png',fullPage:true});
// Extend this existing real UI workflow rather than creating another fixture/suite.
await page.locator('[data-detail-step="1"]').click();await page.locator('[data-detail-view="1"]').waitFor();
const marker=page.locator('[data-detail-marker-cell]').first(),markerCell=await marker.getAttribute('data-detail-marker-cell');assert.ok(markerCell);
const owner=await marker.getAttribute('data-detail-marker-owners');assert.ok(owner);
const target=page.locator(`[data-detail-cell="${markerCell}"]`);await target.focus();await page.keyboard.press('Enter');await page.locator('[data-detail-summary] details').nth(1).locator('summary').click();
await page.locator('[data-detail-summary] button').filter({hasText:'Режим правки охвата'}).first().click();await page.locator('[data-detail-extent-start]').first().click();
await page.locator('[data-detail-extent-form]').waitFor();await page.locator('[data-detail-extent-note]').fill('Браузерная проверка условного охвата');await page.locator('[data-detail-extent-cancel]').click();assert.equal(await page.locator('[data-detail-extent-form]').count(),0);
await page.locator('[data-detail-extent-start]').first().click();await page.locator('[data-detail-extent-note]').fill('Браузерная проверка условного охвата');await page.locator('[data-detail-extent-apply]').click();await page.locator('[data-detail-extent-form]').waitFor({state:'detached'});
await page.screenshot({path:dir+'/detail1-desktop-after.png',fullPage:true});
// Finish edit mode before exercising spatial overview targets.
await page.locator('[data-poi-done]').click();
for(const step of [6,12,24,1]){await page.locator(`[data-detail-step="${step}"]`).click();await page.locator(`[data-detail-view="${step}"]`).waitFor();assert.ok(await page.locator('[data-detail-cell]').count());}
for(const width of [390,320]){await page.setViewportSize({width,height:950});await page.locator('[data-detail-summary]').scrollIntoViewIfNeeded();await page.locator('[data-detail-summary]').screenshot({path:dir+`/detail1-summary-${width}.png`});const box=await page.locator('[data-detail-summary]').boundingBox();assert.ok(box&&box.width<=width);}
await page.setViewportSize({width:1500,height:1100});
await page.locator('.rotate-map-button').click();assert.ok(await page.locator('[data-detail-marker-cell] image').first().evaluate(n=>Math.abs(n.getCTM().b)<1e-8),'active footprint markers stay upright after rotation');await page.screenshot({path:dir+'/detail1-rotated.png',fullPage:true});await page.locator('.rotate-map-button').click();
const downloadReady=page.waitForEvent('download');await page.locator('.export-menu summary').click();await page.locator('[data-poi-export]').filter({hasText:'PNG'}).click();const selectedPng=await downloadReady;await selectedPng.saveAs(dir+'/detail1-selected.png');assert.ok((await fs.stat(dir+'/detail1-selected.png')).size>1000);await page.locator('.export-menu summary').click();
const metrics=[];for(const width of [390,320]){await page.setViewportSize({width,height:950});await page.locator('input[type=file]').setInputFiles({name:'capital.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-adaptation]').scrollIntoViewIfNeeded();await page.locator('[data-detail-adaptation]').screenshot({path:dir+`/panel-${width}.png`});const boxes=await page.locator('[data-detail-adaptation] button').evaluateAll(es=>es.map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));assert.ok(boxes.every(b=>b.height>=44));metrics.push({width,buttons:boxes,documentWidth:await page.evaluate(()=>document.documentElement.scrollWidth)});await page.locator('[data-detail-cancel]').click();}
// REVIEW-POI-CONTEXT: reuse this workflow for identity selection across source
// cells and touch/keyboard choice of coincident owners (not another runner).
const shared=structuredClone(data);shared.version=11;shared.map.seas=[];shared.map.nextSeaId=1;
shared.map.regions[1].pointsOfInterest=[{q:3,r:0}];shared.map.regions[1].pointOfInterestKinds={'3,0':'village'};
shared.map.classification={version:1,difficultyByHex:{},discoveryByPoi:{'poi:1:2,0':{mode:'interaction',clueText:'OWNER-ONE-CLUE'},'poi:2:3,0':{mode:'interaction',clueText:'OWNER-TWO-CLUE'}}};
// UI-EVIDENCE2 reuses these two owners and five source hexes, not another
// generated map or runner. Paired names exercise wrapping, including one word.
const longNames={one:'Северная столица старой переправы через Серебряную реку',two:'Деревнядревнихсмотрителейторговойдорогиусеверныхсосен'};
shared.map.editorNames={'poi:1:2,0':{ru:longNames.one,en:'Northern capital at the old crossing of the Silver River'},'poi:2:3,0':{ru:longNames.two,en:'VillageOfTheAncientKeepersOfTheNorthernTradingRoad'}};
await page.setViewportSize({width:1500,height:1100});await page.locator('input[type=file]').setInputFiles({name:'shared.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(shared))});
await page.waitForFunction(name=>document.body.textContent.includes(name),longNames.one);await page.screenshot({path:dir+'/shared-before.png',fullPage:true});
await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-apply]').click();await page.locator('[data-detail-step="1"]').click();
const firstId=await page.locator('[data-detail-marker-cell]').first().getAttribute('data-detail-marker-owners');
await page.locator('[data-detail-marker-cell]').first().evaluate(e=>{const key=e.getAttribute('data-detail-marker-cell');document.querySelector(`[data-detail-cell="${key}"]`).dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));});
await page.locator('[data-detail-summary] details').nth(1).locator('summary').click();await page.locator('[data-detail-extent-start]').first().click();await page.locator('[data-detail-extent-start]').first().click();
await page.locator('[data-detail-extent-cells]').fill('12,0\n14,0');await page.locator('[data-detail-extent-note]').fill('Проверка отказа');await page.locator('[data-detail-extent-apply]').click();await page.locator('[data-detail-extent-form] [role=alert]').waitFor();await page.screenshot({path:dir+'/review-extent-error.png',fullPage:true});
await page.locator('[data-detail-extent-cells]').fill(Array.from({length:7},(_,i)=>`${12+i},0`).join('\n'));await page.locator('[data-detail-extent-note]').fill('Общий охват для проверки выбора места');await page.locator('[data-detail-extent-apply]').click();await page.locator('[data-detail-extent-form]').waitFor({state:'detached'});await page.locator('[data-poi-done]').click();
const sharedTarget=page.locator('[data-detail-cell="18,0"]');await sharedTarget.scrollIntoViewIfNeeded();const hit=await sharedTarget.boundingBox();assert.ok(hit);await page.touchscreen.tap(hit.x+hit.width/2,hit.y+hit.height/2);
assert.equal(await page.locator('[data-detail-summary] [data-detail-poi-select]').count(),2);
// Open both owner rows explicitly before selecting their content.
for(const detail of await page.locator('[data-detail-summary] > details').all()){if(await detail.getAttribute('open')===null)await detail.locator('summary').click();}
const firstButton=page.locator(`[data-detail-poi-select="${firstId}"]`);await firstButton.focus();await page.keyboard.press('Enter');await page.locator('[data-knave-panel]').getByText('OWNER-ONE-CLUE',{exact:false}).waitFor();assert.equal(await sharedTarget.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-detail-poi-select]').count(),2,'owner selection keeps the shared fine cell');await page.locator('.detail-source-context').screenshot({path:dir+'/review-owner-one-context.png'});
await page.locator('[data-detail-summary]').scrollIntoViewIfNeeded();await page.screenshot({path:dir+'/review-owner-desktop.png',fullPage:true});
await sharedTarget.focus();await page.keyboard.press('Enter');for(const detail of await page.locator('[data-detail-summary] > details').all()){if(await detail.getAttribute('open')===null)await detail.locator('summary').click();}
await page.locator(`[data-detail-poi-select]:not([data-detail-poi-select="${firstId}"])`).click();await page.locator('[data-knave-panel]').getByText('OWNER-TWO-CLUE',{exact:false}).waitFor();await page.locator('.detail-source-context').screenshot({path:dir+'/review-owner-two-context.png'});
for(const width of [390,320]){await page.setViewportSize({width,height:950});await page.locator('[data-detail-summary]').scrollIntoViewIfNeeded();await page.screenshot({path:dir+`/review-owner-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
const uiEvidence={fixture:'existing regionFixture/shared owners;5 source hexes; no new generation',longNames,layouts:[],overviews:[],responseObservations:[],limits:['Instrumented existing actions only; timing includes Playwright/scroll/frame overhead, no universal threshold.','Raster equality checks actual internal export SVG against downloaded PNG; screen/PNG visual comparison remains a reviewer observation.']};
const settled=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
for(const width of [1500,390,320]){
  await page.setViewportSize({width,height:width===1500?1100:950});
  for(const detail of await page.locator('[data-detail-summary] > details').all())if(await detail.getAttribute('open')===null)await detail.locator('summary').click();
  const choice=page.locator(`[data-detail-poi-select="${firstId}"]`);await choice.scrollIntoViewIfNeeded();await choice.focus();await page.keyboard.press('Enter');
  await page.locator('[data-knave-panel]').getByText('OWNER-ONE-CLUE',{exact:false}).waitFor();
  const text=await page.locator('[data-detail-summary]').innerText();assert.ok(text.includes(longNames.one)&&text.includes(longNames.two));
  const layout=await page.locator('[data-detail-summary]').evaluate(e=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,panelWidth:e.getBoundingClientRect().width,buttons:[...e.querySelectorAll('button')].map(b=>({text:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}));
  assert.ok(layout.documentWidth<=width&&layout.panelWidth<=width);assert.ok(layout.buttons.every(b=>b.height>=44));
  await page.locator('[data-detail-summary]').screenshot({path:dir+`/long-names-${width}.png`});uiEvidence.layouts.push(layout);
}
await page.setViewportSize({width:1500,height:1100});
// Capture the real SVG blob handed to the PNG pipeline, not a reconstructed
// whitelist. This observer does not alter the production renderer/exporter.
await page.evaluate(()=>{const original=URL.createObjectURL;window.__detailSvgBlobs=[];URL.createObjectURL=function(blob){if(blob.type.startsWith('image/svg+xml'))window.__detailSvgBlobs.push(blob.text());return original.call(this,blob);};});
for(const step of [6,12,24,6]){
  const start=await page.evaluate(()=>performance.now());await page.locator(`[data-detail-step="${step}"]`).click();await page.locator(`[data-detail-view="${step}"]`).waitFor();await settled();
  uiEvidence.responseObservations.push({step,elapsedMs:(await page.evaluate(()=>performance.now()))-start,method:'locator click to requested view present plus two animation frames; includes automation overhead'});
  if(step!==12&&step!==24)continue;
  let selected;
  for(const cell of await page.locator('[data-detail-cell]').all()){
    await cell.focus();await page.keyboard.press('Enter');await settled();
    const rows=await page.locator('[data-detail-summary] > details').first().locator('li').allTextContents();
    const owners=await page.locator('[data-detail-summary] [data-detail-poi-select]').evaluateAll(es=>es.map(e=>e.getAttribute('data-detail-poi-select')));
    if(new Set(rows.map(x=>x.split('·')[1]?.trim())).size>1&&owners.length===2){selected={cell:await cell.getAttribute('data-detail-cell'),rows,owners};break;}
  }
  assert.ok(selected,`${step}: small fixture has a selectable mixed cell containing both owners`);assert.equal(new Set(selected.owners).size,2);
  for(const detail of await page.locator('[data-detail-summary] > details').all())if(await detail.getAttribute('open')!==null)await detail.locator('summary').click();
  await page.locator('[data-detail-summary] > details').first().locator('summary').click();
  assert.equal(await page.locator('.detail-source-context').getAttribute('open'),null,'overview keeps legacy full source card collapsed');
  await page.locator('[data-detail-summary]').screenshot({path:dir+`/overview-${step}-summary.png`});
  await page.screenshot({path:dir+`/overview-${step}-desktop.png`,fullPage:true});
  const svg=page.locator('svg[data-biome-display]');await svg.screenshot({path:dir+`/overview-${step}-screen-map.png`});
  const screen=await svg.evaluate(e=>({viewBox:e.getAttribute('viewBox'),view:e.querySelector('[data-detail-view]')?.getAttribute('data-detail-view'),footprints:[...e.querySelectorAll('[data-detail-footprint]')].map(n=>n.getAttribute('data-detail-footprint')),counts:[...e.querySelectorAll('.detail-marker-count')].map(n=>n.textContent)}));
  assert.equal(screen.footprints.length,2);assert.ok(screen.counts.length>0);
  await page.evaluate(()=>{window.__detailSvgBlobs=[];});
  const ready=page.waitForEvent('download');await page.locator('.export-menu summary').click();await page.locator('[data-poi-export]').filter({hasText:'PNG'}).click();const png=await ready;await png.saveAs(dir+`/overview-${step}-export.png`);await page.locator('.export-menu summary').click();
  const texts=await page.evaluate(()=>Promise.all(window.__detailSvgBlobs));const exported=texts.findLast(t=>t.includes(`data-detail-view="${step}"`));assert.ok(exported,'actual export SVG blob captured');await fs.writeFile(dir+`/overview-${step}-export.svg`,exported);
  const pngBase64=(await fs.readFile(dir+`/overview-${step}-export.png`)).toString('base64');
  const exportProof=await page.evaluate(async({xml,pngBase64})=>{
    const doc=new DOMParser().parseFromString(xml,'image/svg+xml'),root=doc.documentElement;
    const image=async src=>{const i=new Image();await new Promise((resolve,reject)=>{i.onload=resolve;i.onerror=reject;i.src=src;});return i;};
    const [pngImage,svgImage]=await Promise.all([image('data:image/png;base64,'+pngBase64),image('data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(xml))))]);
    const pixels=i=>{const c=document.createElement('canvas');c.width=pngImage.width;c.height=pngImage.height;const ctx=c.getContext('2d');ctx.fillStyle='#0c1423';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(i,0,0,c.width,c.height);return ctx.getImageData(0,0,c.width,c.height).data;};
    const a=pixels(pngImage),b=pixels(svgImage);let differingPixels=0,nonBackgroundPixels=0;for(let i=0;i<a.length;i+=4){if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])differingPixels++;if(a[i]!==12||a[i+1]!==20||a[i+2]!==35)nonBackgroundPixels++;}
    return {viewBox:root.getAttribute('viewBox'),view:root.querySelector('[data-detail-view]')?.getAttribute('data-detail-view'),footprints:[...root.querySelectorAll('[data-detail-footprint]')].map(n=>n.getAttribute('data-detail-footprint')),counts:[...root.querySelectorAll('.detail-marker-count')].map(n=>n.textContent),countRule:root.querySelector('style')?.textContent.match(/\.detail-marker-count\s*\{[^}]+\}/)?.[0],editorOnly:root.querySelectorAll('[data-editor-only]').length,width:pngImage.width,height:pngImage.height,differingPixels,nonBackgroundPixels};
  },{xml:exported,pngBase64});
  assert.equal(exportProof.viewBox,screen.viewBox);assert.equal(exportProof.view,screen.view);assert.deepEqual(exportProof.footprints,screen.footprints);assert.deepEqual(exportProof.counts,screen.counts);assert.match(exportProof.countRule,/fill:#fff/);assert.match(exportProof.countRule,/stroke:#123/);assert.match(exportProof.countRule,/font-weight:bold/);assert.equal(exportProof.editorOnly,0);assert.equal(exportProof.differingPixels,0);assert.ok(exportProof.nonBackgroundPixels>0);
  uiEvidence.overviews.push({step,...selected,screen,exportProof});
}
await fs.writeFile(dir+'/ui-evidence2.json',JSON.stringify(uiEvidence,null,2));
assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);const report={status:'passed',temporary_programmer_diagnostic:false,permanent_test_cases_added:0,permanent_test_cases_modified:1,suite:'browser',scenarios:['actual file import','preview overlay outside exported artwork','Cancel','Escape','Apply status','1500/390/320 panel and44px buttons','1/6/12/24 targets and keyboard selection','repeated marker references','conditional extent Cancel/Apply','actual summary narrow screenshots','active markers stay upright on rotation','selected DETAIL1 PNG export','cross-source and shared owner selection by keyboard/touch'],metrics,errors,dialogs};await fs.writeFile(dir+'/walkthrough.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}finally{await browser?.close();server.kill();}
