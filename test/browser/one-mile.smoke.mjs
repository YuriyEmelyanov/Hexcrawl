// ONE-MILE1 UI contract: one fixed existing world, no statistical generation series.
import {spawn,execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {createGenerationHarness,prepareLegacyRefinedSave} from '../helpers/generation-harness.mjs';
import {withRequiredRiverSite,requiredRiverOwner} from '../helpers/river-required-variant.mjs';
import {createDetailGrid,detailCellCenter} from '../../src/detailGrid.ts';
import {assertScaleOnly,checkGeometryRefinement} from './geometry-refinement-evidence.mjs';
import {prepareFineEvidenceFixture,fineEvidenceSamples,checkFineCamera,checkFineObjectsAndPng,checkFineModeCandidates} from './one-mile-evidence.mjs';
const root=new URL('../../',import.meta.url),out=new URL('../../reports/ONE-MILE1-UI/',import.meta.url);
await fs.mkdir(out,{recursive:true});
const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:await fs.readFile(new URL('../fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'x'}});
const prepared=h.render().previewOneMile();assert.ok(prepared);assert.equal(h.render().applyOneMilePreview(prepared),true);const geometryFixture=structuredClone(h.render().createSaveData());prepareFineEvidenceFixture(h);const fixture=structuredClone(h.render().createSaveData());
// P02: explicit legal F2 ford variant of the same existing world, no geometry edit.
fixture.map.crossings.find(c=>c.riverId===3).kind='ford';
geometryFixture.map.crossings.find(c=>c.riverId===3).kind='ford';
await h.render().handleImportJson({target:{files:[{text:JSON.stringify(geometryFixture)}],value:'legacy-base'}});
const geometryLegacySave=prepareLegacyRefinedSave(h);
// P03: keep one declared F3 segment as a legal F5 presentation variant so
// the real-map browser check covers the complete F1..F5 width scale.
const f5Sector=fixture.map.rivers.flatMap(r=>r.sectors).find(s=>s.fullness===3);assert.ok(f5Sector);f5Sector.fullness=5;
delete fixture.map.physicalGrid.selectedCell;delete fixture.map.physicalGrid.selectedWorldPoint;
for(const road of fixture.map.roads)fixture.map.editorNames[`road:${road.id}`]={ru:`OM дорога ${road.id}`,en:`OM route ${road.id}`};
for(const river of fixture.map.rivers){const name=fixture.map.toponyms.names[`river:${river.id}`];assert.ok(name);name.ru=`OM река ${river.id}`;name.en=`OM river ${river.id}`;}
// Validate fixture edits before launching a browser; rivers are toponyms, not editorNames.
await h.render().handleImportJson({target:{files:[{text:JSON.stringify(fixture)}],value:'x'}});assert.equal(h.render().createSaveData().version,15);
assert.equal(h.render().switchFineStep(1),true,h.render().editError);const oracle=fineEvidenceSamples(h,h.render().fineDisplay);
// Same real world continued once through the production generator, not a
// hand-drawn outside river. Its saved scoped plan still owns the old34 paths.
const mixedHarness=createGenerationHarness(42);mixedHarness.render();mixedHarness.guardRandom();mixedHarness.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});mixedHarness.injectFunction('readTextFile',async f=>f.text);
await mixedHarness.render().handleImportJson({target:{files:[{text:await fs.readFile(new URL('../fixtures/classic-six-regions-seed42.json',import.meta.url),'utf8')}],value:'x'}});
const mixedLegacySave=prepareLegacyRefinedSave(mixedHarness);
await mixedHarness.render().handleImportJson({target:{files:[{text:JSON.stringify(mixedLegacySave)}],value:'legacy'}});
mixedHarness.render().generateAt(mixedHarness.render().candidateHexes[0]);
const mixedFixture=structuredClone(mixedHarness.render().createSaveData());assert.equal(mixedFixture.map.rivers.length,5);assert.equal(mixedFixture.map.physicalGrid.geometryRefinement.riverPlan.paths.length,34);
const mixedOldEdges=new Set(mixedFixture.map.physicalGrid.geometryRefinement.riverPlan.paths.map(p=>JSON.stringify([p.riverId,p.sourceEdgeKey])));
const mixedNewEdges=mixedFixture.map.rivers.flatMap(r=>r.sectors.flatMap(s=>s.edgeKeys.map(edge=>({id:r.id,edge})))).filter(p=>!mixedOldEdges.has(JSON.stringify([p.id,p.edge])));assert.equal(mixedNewEdges.length,12);
// AC04/05: a declared, validator-accepted Knave riverside site on the existing
// road-entry world. Its original unresolved POIs cannot witness this contract.
const requiredHarness=createGenerationHarness(42);requiredHarness.render();requiredHarness.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});requiredHarness.injectFunction('readTextFile',async f=>f.text);
await requiredHarness.render().handleImportJson({target:{files:[{text:await fs.readFile(new URL('../fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'x'}});
const requiredDocument=requiredHarness.render().captureDocument();requiredDocument.map=withRequiredRiverSite(requiredDocument.map);
requiredHarness.render().applyDocument(requiredDocument);
const requiredFixture=structuredClone(requiredHarness.render().createSaveData());requiredHarness.geometry.assertHexcrawlSaveData(requiredFixture);
assert.equal(requiredHarness.render().switchFineStep(1),true,requiredHarness.render().automaticFineError);
const requiredMove=requiredHarness.render().fineDisplay.geometryRefinement.pois.pois.find(p=>p.footprint.legacyRef===requiredRiverOwner);assert.ok(requiredMove?.contact);
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4195','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser,page,baselineServer,baselineDir,regenerationConsent=null;const errors=[],alerts=[];
const manifest={source_head_sha:null,checkout_sha:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),checkout_tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:root,encoding:'utf8'}).trim(),fixture:'road-entry-zigzags.json',screenshots:[],cases:[]};
if(process.env.GITHUB_EVENT_PATH){const event=JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH));manifest.source_head_sha=event.pull_request?.head.sha??process.env.GITHUB_SHA;}

try{
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error(text)),10000);server.stdout.on('data',d=>{text+=d;if(text.replace(/\x1b\[[0-9;]*m/g,'').includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1500,height:1000}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{
   if(d.type()==='confirm'&&regenerationConsent!==null&&d.message().includes('removes these small lakes in full')){
     if(regenerationConsent)await d.accept();else await d.dismiss();
   }else{alerts.push(d.message());await d.dismiss();}
 });
 await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{window.__fineClicks=[];document.addEventListener('click',e=>{const row=e.target.closest?.('[data-fine-key],[data-fine-candidate]');if(row)window.__fineClicks.push({cell:row.getAttribute('data-fine-key'),candidate:row.getAttribute('data-fine-candidate'),detail:e.detail});},true);const clone=window.structuredClone;window.structuredClone=function(value){if(window.__failGeoPrepare&&value?.regions&&value?.physicalGrid){window.__failGeoPrepare=false;throw Error('GEO2 poi: detail-poi:1; river:3');}if(window.__failFineSave&&value?.regions&&value?.physicalGrid){window.__failFineSave=false;throw Error('Injected fine preparation failure');}return clone(value);};const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const url=make.call(this,b);if(b.type.startsWith('application/json'))blobs.set(url,b.text());return url;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(t=>window.__oneExport=JSON.parse(t));return;}return click.call(this);};});
 await page.addInitScript(()=>{const make=URL.createObjectURL;URL.createObjectURL=function(blob){if(blob.type.startsWith('image/svg+xml'))blob.text().then(text=>window.__oneSvg=text);return make.call(this,blob);};});
 await page.addInitScript(()=>{const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(file,...args){if(window.__holdFineImport){window.__releaseFineImport=()=>{window.__holdFineImport=false;read.call(this,file,...args);};return;}return read.call(this,file,...args);};});
 // Hold a real completed worker reply to exercise cancellation and a late
 // callback without substituting a fake geometry result or a fixed delay.
 await page.addInitScript(()=>{const Native=window.Worker;window.Worker=class extends Native{set onmessage(listener){super.onmessage=event=>{if(window.__holdFineScene){window.__releaseFineScene=()=>listener?.call(this,event);return;}listener?.call(this,event);};}};});
 await page.goto('http://127.0.0.1:4195/');
 const button=name=>page.getByRole('button',{name,exact:true});
 const snap=async()=>{await page.evaluate(()=>window.__oneExport=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__oneExport!==null);return page.evaluate(()=>{const d=window.__oneExport;delete d.savedAt;return d;});};
 const shot=async(name)=>{await page.evaluate(()=>document.fonts.ready);const bytes=await page.screenshot({path:new URL(name,out).pathname,type:'jpeg',quality:75,fullPage:true});manifest.screenshots.push({name,viewport:page.viewportSize(),mode:await page.locator('[data-fine-step]').inputValue()});};
 let locale='en';
 const lang=async next=>{if(locale===next)return;const show=button(locale==='en'?'Show language and social buttons':'Показать кнопки языка и соцсетей');if(await show.count())await show.click();await button(locale==='en'?'Переключить на русский':'Switch to English').click();locale=next;};
 const step=page.locator('[data-fine-step]');
 // HX-BL-059 AC05/07/08: replace the old classic42 manual-activation witness
 // with the owner's automatic path, on that same saved map and real renderer.
 await page.locator('input[type=file]').setInputFiles(new URL('../fixtures/classic-six-regions-seed42.json',import.meta.url).pathname);
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 const classicSource=await snap();assert.equal(classicSource.map.physicalGrid,undefined);await shot('classic42-6mi-before.jpg');
 const classicHistory=await Promise.all(['Undo','Redo'].map(name=>button(name).isEnabled()));
 const lakeKey=Object.entries(classicSource.map.terrainByHexKey).find(([,terrain])=>terrain.terrainOverride==='lake')[0];
 const coastTexture=(svg,key)=>svg.querySelector(`[data-hex-key="${key}"]`).parentElement.querySelector('image.terrain-blend')?.getAttribute('href');
 await page.waitForFunction(key=>document.querySelector(`[data-hex-key="${key}"] + image.terrain-blend`),lakeKey);
 const coarseCoast=await page.locator('svg[data-render-phase]').evaluate(coastTexture,lakeKey);
 // F-R08: the real worker leaves the old whole scene intact. Cancel must
 // also reject a reply already in flight, and a fresh retry must succeed.
 await page.evaluate(()=>{window.__holdFineScene=true;window.__releaseFineScene=null;});
 await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor();
 assert.equal(await page.locator('[data-fine-world]').count(),0);
 assert.equal(await button('PNG').isDisabled(),true,'unfinished fine scene cannot be exported');
 await page.waitForFunction(()=>!!window.__releaseFineScene);
 await shot('automatic-preparing-1500.jpg');
 await page.setViewportSize({width:390,height:1000});await lang('ru');
 assert.match(await page.locator('[data-fine-scene-preparing]').textContent(),/Подготовка одномильной карты/);await shot('automatic-preparing-390-ru.jpg');
 await button('Отмена').click();await page.evaluate(()=>{window.__holdFineScene=false;window.__releaseFineScene();});
 await page.waitForTimeout(50);assert.equal(await page.locator('[data-fine-world]').count(),0);assert.equal(await step.inputValue(),'6');
 assert.deepEqual((await snap()).map,classicSource.map,'cancel and late reply preserve accepted source');
 manifest.cases.push({id:'HX059-worker-busy-cancel-late-reply',status:'pass',viewports:[1500,390],locales:['en','ru'],sourceWrites:false});
 await lang('en');await page.setViewportSize({width:1500,height:1000});
 await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});await page.locator('[data-fine-world]').waitFor();
 await assertScaleOnly(page,'en');
 assert.equal(await page.locator('[data-fine-crossing]').count(),2);
 assert.ok(await page.locator('[data-refined-river]').count()>0);
 assert.deepEqual((await snap()).map,classicSource.map);
 assert.equal((await snap()).ui.mapScale,classicSource.ui.mapScale,'detached fine zoom is not persisted as source camera zoom');
 const classicSignature=(target=page)=>target.locator('[data-fine-world]').evaluate(el=>({rivers:[...el.querySelectorAll('[data-refined-river]')].map(n=>[n.getAttribute('data-refined-river'),n.getAttribute('data-source-edge'),n.getAttribute('points'),n.getAttribute('stroke-width')]),roads:[...el.querySelectorAll('[data-refined-road]')].map(n=>[n.getAttribute('data-refined-road'),[...n.querySelectorAll('line,polyline')].map(p=>['x1','y1','x2','y2','points','opacity','stroke-width','stroke-dasharray'].map(k=>p.getAttribute(k)))])}));
 const classicVisible=await classicSignature();await shot('classic42-1mi-after.jpg');
 assert.deepEqual(await Promise.all(['Undo','Redo'].map(name=>button(name).isEnabled())),classicHistory);
 await page.evaluate(()=>window.__oneSvg=null);const [classicPng]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);await fs.copyFile(await classicPng.path(),new URL('classic42-automatic.png',out));
 const classicExport=await page.evaluate(()=>{const el=new DOMParser().parseFromString(window.__oneSvg,'image/svg+xml').querySelector('[data-fine-world]');return {rivers:[...el.querySelectorAll('[data-refined-river]')].map(n=>[n.getAttribute('data-refined-river'),n.getAttribute('data-source-edge'),n.getAttribute('points'),n.getAttribute('stroke-width')]),roads:[...el.querySelectorAll('[data-refined-road]')].map(n=>[n.getAttribute('data-refined-road'),[...n.querySelectorAll('line,polyline')].map(p=>['x1','y1','x2','y2','points','opacity','stroke-width','stroke-dasharray'].map(k=>p.getAttribute(k)))])};});
 assert.deepEqual(classicExport,classicVisible,'screen and PNG use one complete scene');
 await step.selectOption('6');
 const roundTripSvg=page.locator('svg[data-render-phase]');
 assert.equal(await roundTripSvg.evaluate(coastTexture,lakeKey),coarseCoast,'Returning to 6 miles keeps the original visible lake blend');
 await shot('classic42-6mi-after.jpg');assert.deepEqual(await snap(),classicSource);
 assert.deepEqual(await Promise.all(['Undo','Redo'].map(name=>button(name).isEnabled())),classicHistory);
 await page.waitForFunction(()=>!document.querySelector('details.export-menu button:disabled'));
 await page.evaluate(()=>window.__oneSvg=null);
 const [coarsePng]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);
 await coarsePng.saveAs(new URL('classic42-6mi-return.png',out).pathname);
 const coarseExport=await page.evaluate(key=>{
   const svg=new DOMParser().parseFromString(window.__oneSvg,'image/svg+xml');
   return svg.querySelector(`[data-hex-key="${key}"]`).parentElement.querySelector('image.terrain-blend')?.getAttribute('href');
 },lakeKey);
 assert.equal(coarseExport,coarseCoast,'PNG after the 6 → 1 → 6 round trip keeps the same lake blend');
 await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});assert.deepEqual(await classicSignature(),classicVisible);
 for(const language of ['ru','en'])for(const width of [1500,390,320]){
  await lang(language);await page.setViewportSize({width,height:1000});await assertScaleOnly(page,language);
  await shot(`f2-classic42-1mi-${language}-${width}.jpg`);
 }
 await page.setViewportSize({width:390,height:1000});await shot('classic42-1mi-after-390.jpg');
 await page.locator('input[type=file]').setInputFiles({name:'classic42-source-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(classicSource))});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);assert.deepEqual(await classicSignature(),classicVisible);assert.deepEqual((await snap()).map,classicSource.map);
 assert.equal((await snap()).ui.mapScale,classicSource.ui.mapScale,'source JSON reload restores the same normalized camera');
 // Extend this same real-map witness with a fresh page: retained component
 // state must not be responsible for stable JSON routes or camera scale.
 const cold=await browser.newPage({viewport:{width:390,height:1000}});await cold.route(/mc\.yandex/,r=>r.abort());await cold.goto('http://127.0.0.1:4195/');
 await cold.locator('input[type=file]').setInputFiles({name:'cold-classic42.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(classicSource))});
 await cold.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 const zoom=target=>target.locator('svg[data-render-phase]').evaluate(n=>new DOMMatrix(getComputedStyle(n).transform).a);
 assert.equal(await zoom(cold),classicSource.ui.mapScale,'cold source view uses source camera scale');
 await cold.locator('[data-fine-step]').selectOption('1');await cold.locator('[data-fine-world]').waitFor();
 assert.equal(await zoom(cold),classicSource.ui.mapScale*6,'cold automatic view applies exactly one camera conversion');
 assert.deepEqual(await classicSignature(cold),classicVisible,'cold load reconstructs the same complete river and road scene');
 await cold.screenshot({path:new URL('classic42-cold-390.jpg',out).pathname,type:'jpeg',quality:75,fullPage:true});await cold.close();
 manifest.cases.push({id:'HX059-classic42-automatic-scene-save-PNG',status:'pass',sourcePaths:34,crossings:2,viewports:[1500,390,320],locales:['ru','en'],manualGeometryActionAbsent:true,sourceWrites:false,cameraSourceScaleStable:true,coldDOMReload:true});
 await page.setViewportSize({width:1500,height:1000});
 // One distinct logical case: the original fixtures have no proven river
 // requirement. Exercise this legal declared variant through public JSON,
 // actual pick/renderer and PNG rather than accepting the pure planner alone.
 await step.selectOption('6');await page.locator('input[type=file]').setInputFiles({name:'declared-riverside-mill.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(requiredFixture))});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);const requiredSource=await snap();await shot('required-bank-6mi-before.jpg');
 await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});await page.locator('[data-fine-world]').waitFor();
 assert.equal(await page.locator('[data-fine-scene-error]').count(),0);
 const requiredCell=requiredMove.footprint.cells[0],requiredKey=`${requiredCell.q},${requiredCell.r}`,requiredMarker=page.locator(`[data-fine-pois] [data-poi-id="${requiredMove.poiId}"] image`);
 assert.equal(await requiredMarker.count(),1);
 const markerPosition=await requiredMarker.evaluate(n=>({x:Number(n.getAttribute('x'))+Number(n.getAttribute('width'))/2,y:Number(n.getAttribute('y'))+Number(n.getAttribute('height'))/2}));
 // SVGPointList rounds to float32. Compare the rendered double attributes
 // consistently, preserving the strict geometry tolerance at map coordinates.
 const cellPosition=await page.locator(`[data-fine-key="${requiredKey}"] polygon`).first().evaluate(n=>{const p=n.getAttribute('points').trim().split(/\s+/).map(v=>v.split(',').map(Number));return {x:p.reduce((s,p)=>s+p[0],0)/6,y:p.reduce((s,p)=>s+p[1],0)/6};});
 const requiredCellWorld=detailCellCenter(createDetailGrid(1),requiredCell),factor=Math.sqrt(3)*28/6;
 const requiredPosition={markerPosition,cellPosition,requiredCellWorld,expected:requiredMove.newAnchor,factor,source:(await snap()).map.knave};console.log('HX059_REQUIRED_POSITION '+JSON.stringify(requiredPosition));
 assert.ok(Math.abs(markerPosition.x-cellPosition.x-(requiredMove.newAnchor.x-requiredCellWorld.x)*factor)<1e-7,JSON.stringify(requiredPosition));
 assert.ok(Math.abs(markerPosition.y-cellPosition.y-(requiredMove.newAnchor.y-requiredCellWorld.y)*factor)<1e-7,'actual marker follows the prepared bank anchor '+JSON.stringify(requiredPosition));
 await page.locator(`[data-fine-key="${requiredKey}"]`).press('Enter');await page.locator('[data-fine-panel]').hover();
 assert.equal(await page.locator('[data-fine-selected]').getAttribute('data-fine-selected'),requiredKey);assert.match(await page.locator('[data-fine-panel]').innerText(),/mill/i);
 const requiredSignature=await classicSignature(),markerSignature=await requiredMarker.evaluate(n=>['x','y','width','height'].map(k=>n.getAttribute(k)));
 const centerRequired=()=>page.locator(`[data-fine-key="${requiredKey}"] polygon`).first().evaluate((el,point)=>{const svg=el.ownerSVGElement,v=document.querySelector('.map-viewport'),p=svg.createSVGPoint();p.x=point.x;p.y=point.y;const c=p.matrixTransform(el.getScreenCTM()),r=v.getBoundingClientRect();v.scrollLeft+=c.x-r.left-v.clientWidth/2;v.scrollTop+=c.y-r.top-v.clientHeight/2;},markerPosition);
 await centerRequired();await shot('required-bank-1500.jpg');await snap();await page.evaluate(()=>window.__oneSvg=null);
 const [requiredPng]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);await fs.copyFile(await requiredPng.path(),new URL('required-bank.png',out));
 const requiredExport=await page.evaluate(id=>{const el=new DOMParser().parseFromString(window.__oneSvg,'image/svg+xml').querySelector('[data-fine-world]'),marker=el.querySelector(`[data-poi-id="${id}"] image`);return {marker:['x','y','width','height'].map(k=>marker.getAttribute(k)),rivers:[...el.querySelectorAll('[data-refined-river]')].map(n=>[n.getAttribute('data-refined-river'),n.getAttribute('data-source-edge'),n.getAttribute('points'),n.getAttribute('stroke-width')]),roads:[...el.querySelectorAll('[data-refined-road]')].map(n=>[n.getAttribute('data-refined-road'),[...n.querySelectorAll('line,polyline')].map(p=>['x1','y1','x2','y2','points','opacity','stroke-width','stroke-dasharray'].map(k=>p.getAttribute(k)))])};},requiredMove.poiId);
 assert.deepEqual(requiredExport,{marker:markerSignature,...requiredSignature},'required site, rivers and roads share exact screen/PNG geometry');assert.deepEqual((await snap()).map,requiredSource.map);
 await page.setViewportSize({width:390,height:1000});await centerRequired();await shot('required-bank-390.jpg');await page.setViewportSize({width:1500,height:1000});
 manifest.cases.push({id:'HX059-required-POI-pick-PNG',status:'pass',source:'declared legal Knave structures96 variant of road-entry-zigzags',poiId:requiredMove.poiId,owner:requiredRiverOwner,riverId:requiredMove.contact.riverId,anchor:requiredMove.newAnchor,pickCell:requiredKey,viewports:[1500,390],attachedRoads:requiredMove.routeEntries.length,sourceWrites:false});
 await page.locator('input[type=file]').setInputFiles({name:'classic42-mixed-growth.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mixedFixture))});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 await step.selectOption('6');const mixedSource=await snap();await shot('mixed42-6mi-before.jpg');
 await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});await page.locator('[data-fine-world]').waitFor();assert.equal(await page.locator('[data-fine-scene-error]').count(),0);
 for(const edge of mixedNewEdges)assert.equal(await page.locator(`[data-refined-river="${edge.id}"][data-source-edge=${JSON.stringify(edge.edge)}]`).count(),1,'every new ordinary source edge is in the complete scene');
 const mixedVisible=await classicSignature();await shot('mixed42-1mi-after.jpg');assert.deepEqual((await snap()).map,mixedSource.map);
 await page.evaluate(()=>window.__oneSvg=null);const [mixedPng]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);await fs.copyFile(await mixedPng.path(),new URL('mixed42-automatic.png',out));
 const mixedExport=await page.evaluate(()=>{const el=new DOMParser().parseFromString(window.__oneSvg,'image/svg+xml').querySelector('[data-fine-world]');return {rivers:[...el.querySelectorAll('[data-refined-river]')].map(n=>[n.getAttribute('data-refined-river'),n.getAttribute('data-source-edge'),n.getAttribute('points'),n.getAttribute('stroke-width')]),roads:[...el.querySelectorAll('[data-refined-road]')].map(n=>[n.getAttribute('data-refined-road'),[...n.querySelectorAll('line,polyline')].map(p=>['x1','y1','x2','y2','points','opacity','stroke-width','stroke-dasharray'].map(k=>p.getAttribute(k)))])};});
 assert.deepEqual(mixedExport,mixedVisible,'mixed rivers and roads in PNG match the displayed scene');
 await page.setViewportSize({width:390,height:1000});await shot('mixed42-1mi-after-390.jpg');
 await page.locator('input[type=file]').setInputFiles({name:'mixed-source-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mixedSource))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 assert.deepEqual(await classicSignature(),mixedVisible);assert.deepEqual((await snap()).map,mixedSource.map);
 manifest.cases.push({id:'HX059-mixed-growth-retained-paths-PNG',status:'pass',retainedPaths:34,newPaths:12,viewports:[1500,390],sourceWrites:false});
 await step.selectOption('6');await page.setViewportSize({width:1500,height:1000});
 await page.locator('input[type=file]').setInputFiles({name:'one-mile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await step.waitFor();await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 assert.match(await page.locator('details.export-menu small').textContent(),/JSON v15/);await shot('desktop-6.jpg');
 const riverPaint=nodes=>nodes.map(n=>['x1','y1','x2','y2','stroke-width'].map(k=>n.getAttribute(k)));
 const sourceRiverPaint=await page.locator('.rivers-layer .river-polyline').evaluateAll(riverPaint);
 const sourceHexWidth=await page.locator('polygon.hex[data-hex-key]').first().evaluate(n=>Math.max(...[...n.points].map(p=>p.x))-Math.min(...[...n.points].map(p=>p.x)));
 // P04: same actual fixture against unchanged pre-correction native6 build.
 const baselineSha=process.env.ONE_MILE_NATIVE6_BASELINE;
 if(baselineSha){assert.match(baselineSha,/^[0-9a-f]{40}$/); // Opt-in acceptance diagnostic, not a permanent historical UI contract.
 try{execFileSync('git',['cat-file','-e',baselineSha],{cwd:root,stdio:'ignore'});}catch{execFileSync('git',['fetch','--depth=1','origin',baselineSha],{cwd:root,stdio:'inherit'});}
 baselineDir=await fs.mkdtemp(os.tmpdir()+'/one-mile-six-');const base=baselineDir+'/source';
 execFileSync('git',['worktree','add','--detach',base,baselineSha],{cwd:root,stdio:'inherit'});await fs.symlink(fileURLToPath(new URL('node_modules',root)),base+'/node_modules','dir');
 execFileSync(process.execPath,[base+'/node_modules/vite/bin/vite.js','build'],{cwd:base,stdio:'inherit'});
 baselineServer=spawn(process.execPath,[base+'/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4196','--strictPort'],{cwd:base,stdio:['ignore','pipe','inherit']});
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error(text)),15000);baselineServer.stdout.on('data',b=>{text+=b;if(text.includes('4196')){clearTimeout(timer);resolve();}});baselineServer.on('error',reject);});
 const baselinePage=await browser.newPage({viewport:{width:1500,height:1000}});await baselinePage.route(/mc\.yandex/,r=>r.abort());await baselinePage.goto('http://127.0.0.1:4196/');await baselinePage.locator('input[type=file]').setInputFiles({name:'same-fine.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await baselinePage.waitForFunction(()=>document.querySelector('svg[data-render-phase]')?.getAttribute('data-render-phase')==='ready'&&!document.querySelector('.controls--transfer > button').disabled);
 const baselineProfiles=[];
 const compareRaster=async(before,after)=>page.evaluate(async([a,b])=>{
  const decode=async s=>{const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0)),image=await createImageBitmap(new Blob([bytes],{type:'image/png'})),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d');c.drawImage(image,0,0);return {width:image.width,height:image.height,data:c.getImageData(0,0,image.width,image.height).data};};
  const x=await decode(a),y=await decode(b);if(x.width!==y.width||x.height!==y.height)return {maxDelta:255,changedFraction:1};let maxDelta=0,changed=0;
  for(let i=0;i<x.data.length;i+=4){let diff=0;for(let j=0;j<4;j++)diff=Math.max(diff,Math.abs(x.data[i+j]-y.data[i+j]));maxDelta=Math.max(maxDelta,diff);if(diff)changed++;}
  return {maxDelta,changedFraction:changed/(x.width*x.height)};
 },[before.toString('base64'),after.toString('base64')]);
 for(const width of [1500,390]){for(const p of [page,baselinePage]){await p.setViewportSize({width,height:1000});await p.waitForLoadState('networkidle');await p.mouse.move(0,0);await p.evaluate(()=>{document.activeElement?.blur();document.querySelector('details.export-menu')?.removeAttribute('open');for(const n of document.querySelectorAll('.side-panel,.map-viewport')){n.scrollTop=0;n.scrollLeft=0;}window.scrollTo(0,0);return document.fonts.ready;});await p.locator('.map-viewport').scrollIntoViewIfNeeded();}
 const before=await baselinePage.screenshot({path:new URL(`native6-before-${width}.png`,out).pathname,fullPage:true,animations:'disabled'}),after=await page.screenshot({path:new URL(`native6-after-${width}.png`,out).pathname,fullPage:true,animations:'disabled'});
 // AC07/08 concern native map geography. Keep full UI captures as diagnostics:
 // Chromium can round the responsive collapse-chevron glyph one pixel apart.
 // Compare the actual map element strictly and the entire exported map below.
 // Element screenshots still composite the unrelated HTML collapse button
 // over the SVG. Hide only that overlay for the map capture; keep the unmasked
 // UI captures above. No map pixels/objects or raster thresholds are changed.
 const wholeUIRaster=await compareRaster(before,after);
 const nativeMapCapture={animations:'disabled',style:'.side-panel-toggle { visibility:hidden !important; }'};
 const mapBefore=await baselinePage.locator('svg[data-render-phase]').screenshot({...nativeMapCapture,path:new URL(`native6-map-before-${width}.png`,out).pathname}),mapAfter=await page.locator('svg[data-render-phase]').screenshot({...nativeMapCapture,path:new URL(`native6-map-after-${width}.png`,out).pathname}),raster=await compareRaster(mapBefore,mapAfter);
 assert.ok(raster.maxDelta<=3&&raster.changedFraction<=.001,'P04 native6 map unchanged except bounded edge antialiasing '+width+' '+JSON.stringify(raster));baselineProfiles.push({width,mapPixelIdentical:mapBefore.equals(mapAfter),raster,wholeUI:{pixelIdentical:before.equals(after),raster:wholeUIRaster,scope:'diagnostic including unrelated controls'}});}
 const exportNativePng=async(p,name)=>{const menu=p.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'PNG',exact:true}).click()]);const bytes=await fs.readFile(await download.path());await fs.writeFile(new URL(name,out),bytes);return bytes;};
 const beforePng=await exportNativePng(baselinePage,'native6-export-before.png'),afterPng=await exportNativePng(page,'native6-export-after.png'),pngRaster=await compareRaster(beforePng,afterPng);
 assert.ok(pngRaster.maxDelta<=3&&pngRaster.changedFraction<=.001,'AC05 native6 exported PNG unchanged '+JSON.stringify(pngRaster));
 manifest.native6_baseline={sha:baselineSha,fixture:'same explicitF2ford variant',profiles:baselineProfiles,png:{pixelIdentical:beforePng.equals(afterPng),raster:pngRaster}};await baselinePage.close();await page.setViewportSize({width:1500,height:1000});}
 await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});await page.locator('[data-fine-world]').waitFor();
 const fineRiverPaint=await page.locator('[data-fine-world] .river-polyline').evaluateAll(nodes=>nodes.map(n=>({geometry:n.getAttribute('points'),width:Number(n.getAttribute('stroke-width')),fullness:Number(n.getAttribute('data-river-fullness'))})));
 const fineHexWidth=await page.locator('[data-fine-key] polygon').first().evaluate(n=>Math.max(...[...n.points].map(p=>p.x))-Math.min(...[...n.points].map(p=>p.x)));assert.ok(Math.abs(sourceHexWidth/fineHexWidth-6)<1e-9);
 assert.ok(fineRiverPaint.length);for(let i=0;i<fineRiverPaint.length;i++){assert.ok(fineRiverPaint[i].geometry?.length,'automatic fine river is a prepared edge chain');const actual=fineRiverPaint[i].width/fineHexWidth,expected=fineRiverPaint[i].fullness/10;assert.ok(Math.abs(actual-expected)<1e-6,JSON.stringify({message:`F${fineRiverPaint[i].fullness} visible fraction`,actual,expected,width:fineRiverPaint[i].width,fineHexWidth,index:i}));}
 assert.deepEqual([...new Set(fineRiverPaint.map(r=>r.fullness))].sort(),[1,2,3,4,5],'real map renders every legal fullness');
 manifest.width_projection={sourceHexWidth,fineHexWidth,fractions:[.1,.2,.3,.4,.5],sourceSixUnchanged:true,riverSegments:sourceRiverPaint.length};
 assert.equal(await page.locator('polygon.hex[data-hex-key]').count(),0,'no source-six grid under the fine grid');
 const keys=await page.locator('[data-fine-key]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fine-key'))),occupied=new Set(keys);
 assert.ok(keys.length>100);const candidates=await page.locator('[data-fine-candidate]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fine-candidate')));assert.ok(candidates.length);
 for(const key of candidates){const [q,r]=key.split(',').map(Number);assert.ok(!occupied.has(key));assert.ok([[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].some(([dq,dr])=>occupied.has(`${q+dq},${r+dr}`)),'one edge row only');}
 assert.ok(await page.locator('[data-fine-cells] image[data-engraving]').count()>100,'per-cell biome assets');
 assert.match(await page.locator('[data-fine-panel]').innerText(),/No hex selected/);await shot('desktop-fine-empty.jpg');

 const pick=async key=>{const target=page.locator(`[data-fine-key="${key}"]`);await target.click();await page.waitForFunction(key=>document.querySelector('[data-fine-selected]')?.getAttribute('data-fine-selected')===key,key);};
 await pick('0,0');assert.ok(await page.locator('[data-fine-selected]').evaluate(el=>parseFloat(el.getAttribute('stroke-width'))*Math.hypot(el.getScreenCTM().a,el.getScreenCTM().b)<=2.1),'selection stroke stays near native2px');const panel=page.locator('[data-fine-panel]');assert.match(await panel.innerText(),/0\/0/);assert.doesNotMatch(await panel.innerText(),/Source|Area|Область|Исходный/);
 await page.locator('[data-fine-key="1,0"]').hover();assert.match(await panel.innerText(),/1\/0/);await panel.hover();assert.match(await panel.innerText(),/0\/0/);
 assert.match(await panel.innerText(),/Town Eichenheim/,'P01 named POI retains actual type');
 for(const kind of ['bridge','ferry','ford']){const target=page.locator(`[data-crossing-kind="${kind}"]`).first();assert.ok(await target.count(),kind+' actual renderer branch');const group=target.locator('..');await group.evaluate(el=>{const b=el.getBBox(),p=el.ownerSVGElement.createSVGPoint();p.x=b.x+b.width/2;p.y=b.y+b.height/2;const c=p.matrixTransform(el.getScreenCTM()),v=document.querySelector('.map-viewport'),r=v.getBoundingClientRect();v.scrollLeft+=c.x-r.left-v.clientWidth/2;v.scrollTop+=c.y-r.top-v.clientHeight/2;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const rect=await group.boundingBox();assert.ok(rect);const clip={x:Math.max(0,rect.x-16),y:Math.max(0,rect.y-16),width:Math.max(32,rect.width+32),height:Math.max(32,rect.height+32)};clip.width=Math.min(clip.width,1500-clip.x);clip.height=Math.min(clip.height,1000-clip.y);await page.screenshot({path:new URL(`crossing-${kind}.png`,out).pathname,clip});}
 assert.ok(await page.locator('[data-fine-road] line[opacity="0.42"],[data-refined-road] line[opacity="0.42"]').count(),'P02 real ford transparency');
 await shot('desktop-1.jpg');
 assert.equal(await page.locator('button.biome-display-toggle,button.poi-display-toggle').count(),0);
 assert.ok(await page.locator('[data-fine-pois] [data-engraved-poi] circle').count());
 await page.getByRole('button',{name:/^Rotate map/}).click();assert.match(await page.locator('[data-fine-world]').getAttribute('transform'),/rotate/);assert.match(await page.locator('[data-fine-cells] image[data-engraving]').first().getAttribute('transform'),/rotate\(-90/);await page.getByRole('button',{name:'Restore original map rotation'}).click();
 await checkFineCamera({page,step,snap,manifest});await pick('0,0');await panel.hover();
 manifest.cases.push({id:'UI-grid-local-read',status:'pass',fineCells:keys.length,candidates:candidates.length});
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex name',{exact:true}).dispatchEvent('compositionstart');await page.getByLabel('Hex name',{exact:true}).fill('Fine cell');await page.getByLabel('Hex name',{exact:true}).press('Enter');assert.equal(await page.locator('[data-fine-editor]').count(),1,'IME Enter does not save');await page.getByLabel('Hex name',{exact:true}).dispatchEvent('compositionend');await page.getByLabel('Hex note',{exact:true}).fill('One-mile note');
 await step.selectOption('6');await page.locator('[data-fine-exit]').waitFor();await page.locator('[data-fine-exit]').getByRole('button',{name:'Stay',exact:true}).click();assert.equal(await step.inputValue(),'1');assert.equal(await page.getByLabel('Hex note',{exact:true}).inputValue(),'One-mile note');
 await page.getByLabel('Hex name',{exact:true}).press('Escape');assert.equal(await page.locator('[data-fine-editor]').count(),0);
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex note',{exact:true}).fill('Discard this draft');await step.selectOption('6');await page.locator('[data-fine-exit]').getByRole('button',{name:'Discard',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-fine-world]'));assert.equal(await step.inputValue(),'6');await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});await page.locator('[data-fine-world]').waitFor();await panel.hover();assert.doesNotMatch(await panel.innerText(),/Discard this draft/);
 const before=await snap();assert.deepEqual(before.map.physicalGrid.fineCellEdits,{});
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex name',{exact:true}).fill('Fine cell');await page.getByLabel('Hex note',{exact:true}).fill('One-mile note');await page.evaluate(()=>window.__failFineSave=true);await page.locator('[data-fine-editor]').getByRole('button',{name:'Save',exact:true}).click();assert.match(await page.locator('[data-fine-editor] [role=alert]').innerText(),/Injected fine/);await shot('desktop-fine-error.jpg');await page.locator('[data-fine-editor]').getByRole('button',{name:'Save',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('[data-fine-editor]'));assert.match(await panel.innerText(),/Fine cell/);
 const saved=await snap();assert.deepEqual(saved.generation,before.generation);const only=structuredClone(before);only.map.physicalGrid=saved.map.physicalGrid;assert.deepEqual(saved,only,'local Save has no source-six or RNG effects');assert.equal(saved.map.physicalGrid.fineCellEdits['0,0'].note,'One-mile note');
 await button('Undo').click();assert.doesNotMatch(await panel.innerText(),/Fine cell/);await button('Redo').click();assert.match(await panel.innerText(),/Fine cell/);
 await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex note',{exact:true}).fill('Saved before switching');await step.selectOption('6');await page.locator('[data-fine-exit]').getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[data-fine-world]'));assert.equal(await step.inputValue(),'6');
 await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});await page.locator('[data-fine-world]').waitFor();assert.equal(await page.locator('[data-fine-selected]').getAttribute('data-fine-selected'),'0,0');await panel.hover();assert.match(await panel.innerText(),/Saved before switching/);manifest.cases.push({id:'UI-pinned-editor-exit-and-undo',status:'pass'});
 for(const width of [390,320]){await page.setViewportSize({width,height:1000});await page.locator('.map-viewport').scrollIntoViewIfNeeded();await pick('0,0');await lang('en');await shot(`narrow-${width}-en-read.jpg`);
   await panel.getByRole('button',{name:'Edit',exact:true}).click();await page.getByLabel('Hex note',{exact:true}).fill('English draft');await shot(`narrow-${width}-en-edit.jpg`);await page.locator('[data-fine-editor]').getByRole('button',{name:'Cancel',exact:true}).click();
   const target=page.locator('[data-fine-key="1,0"]');await target.press('Space');assert.equal(await page.locator('[data-fine-selected]').getAttribute('data-fine-selected'),'1,0');await pick('0,0');const touchTarget=page.locator('[data-fine-key="2,0"]');await touchTarget.scrollIntoViewIfNeeded();const box=await touchTarget.boundingBox();assert.ok(box.width>=44&&box.height>=44);const touch=await page.context().newCDPSession(page);await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>document.querySelector('[data-fine-selected]')?.getAttribute('data-fine-selected')==='2,0');await touch.send('Emulation.setTouchEmulationEnabled',{enabled:false});await touch.detach();await pick('0,0');(manifest.touch_selection??=[]).push({width,key:'2,0',keyboard:'Space on1,0',touch:'native CDP touchStart/end',status:'passed'});await lang('ru');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,`no page overflow at ${width}`);
   await shot(`narrow-${width}-read.jpg`);await panel.getByRole('button',{name:'Редактировать',exact:true}).click();await page.getByLabel('Заметка гекса',{exact:true}).fill('Черновик');await shot(`narrow-${width}-edit.jpg`);
   const sizes=await page.locator('[data-fine-panel] .direct-mode,[data-fine-editor] input,[data-fine-editor] select,[data-fine-editor] textarea,[data-fine-editor] button').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,rect:{width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}})));for(const size of sizes)assert.ok(size.rect.width>=44&&size.rect.height>=44,JSON.stringify({width,size}));(manifest.touch_targets??=[]).push({width,sizes});
   await page.evaluate(()=>window.__failFineSave=true);await page.locator('[data-fine-editor]').getByRole('button',{name:'Сохранить',exact:true}).click();assert.match(await page.locator('[data-fine-editor] [role=alert]').innerText(),/Injected fine/);await shot(`narrow-${width}-error.jpg`);await page.locator('[data-fine-editor]').getByRole('button',{name:'Отмена',exact:true}).click();
   const stable=await snap();await page.evaluate(()=>window.__holdFineImport=true);await page.locator('input[type=file]').setInputFiles({name:'same-fine.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(stable))});await page.waitForFunction(()=>typeof window.__releaseFineImport==='function'&&document.querySelector('[data-fine-step]').disabled);
   assert.ok(await page.locator('[data-fine-world]').count());assert.equal(await page.locator('[data-fine-key][aria-disabled=true]').count(),keys.length);const pinned=await page.locator('[data-fine-selected]').getAttribute('data-fine-selected');await page.locator('[data-fine-key="1,0"]').dispatchEvent('keydown',{key:'Enter',bubbles:true});await page.locator('[data-fine-candidate]').first().dispatchEvent('keydown',{key:'Enter',bubbles:true});assert.equal(await page.locator('[data-fine-selected]').getAttribute('data-fine-selected'),pinned);await shot(`narrow-${width}-busy-import.jpg`);await page.evaluate(()=>{window.__releaseFineImport();delete window.__releaseFineImport;});await page.waitForFunction(()=>!document.querySelector('[data-fine-step]').disabled);assert.deepEqual(await snap(),stable,'same document import retains accepted fine world');
 }
 manifest.cases.push({id:'UI-responsive-390-320-RU-EN',status:'pass'});
 await lang('en');await page.setViewportSize({width:1500,height:1000});await checkFineObjectsAndPng({page,step,snap,shot,button,manifest,out,oracle});await lang('ru');await page.setViewportSize({width:320,height:1000});
 // F5 above is an isolated display witness added after the accepted fine-grid
 // snapshot. Restore the fixture's original F3 before exercising generation;
 // otherwise that deliberately stale variant is not a valid lifecycle input.
 const lifecycleFixture=await snap(),restoredSector=lifecycleFixture.map.rivers.flatMap(r=>r.sectors).find(s=>s.id===f5Sector.id);assert.equal(restoredSector?.fullness,5);restoredSector.fullness=3;
 await page.locator('input[type=file]').setInputFiles({name:'one-mile-lifecycle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lifecycleFixture))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);await step.selectOption('1');await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});await page.locator('[data-fine-world]').waitFor();manifest.width_projection.lifecycleSourceRestored=true;
 const beforeGen=await snap(),candidate=page.locator('[data-fine-candidate]').first(),target=await candidate.getAttribute('data-fine-candidate');await candidate.dblclick();await page.waitForFunction(()=>document.querySelector('svg[data-render-phase]')?.getAttribute('data-render-phase')==='ready');const afterGen=await snap();
 if(afterGen.map.regions.length>beforeGen.map.regions.length){assert.equal(afterGen.map.regions.length,beforeGen.map.regions.length+1,'double click gives one ordinary Classic unit');assert.equal(`${afterGen.map.physicalGrid.selectedCell.q},${afterGen.map.physicalGrid.selectedCell.r}`,target);await button('Отменить').click();assert.deepEqual(await snap(),beforeGen,'one Undo restores the whole ordinary unit');manifest.cases.push({id:'UI-ordinary-candidate-unit',status:'pass',outcome:'accepted_and_undo_exact'});}
 else {assert.deepEqual(afterGen,beforeGen,'failed ordinary generation is atomic');manifest.cases.push({id:'UI-ordinary-candidate-unit',status:'pass',outcome:'bounded_refusal_no_success_claim'});}
 await checkFineModeCandidates({page,snap,shot,button,manifest});
 await checkGeometryRefinement({page,step,snap,button,lang,shot,manifest,out,fixture:geometryLegacySave});
 // A supported pair on the same imported real Classic map is rendered,
 // persisted and exported by the production handlers, including history.
 await lang('en');
 await page.setViewportSize({width:1500,height:1000});
 await page.reload();
 const loadWorld=async(buffer)=>{
   await page.locator('input[type=file]').setInputFiles({name:'small-lakes.json',mimeType:'application/json',buffer});
   await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 };
 const showOneMile=async()=>{
   await step.selectOption('1');
   await page.locator('[data-fine-scene-preparing]').waitFor({state:'detached'});
   await page.locator('[data-fine-world]').waitFor();
 };
 await loadWorld(Buffer.from(JSON.stringify(classicSource)));
 await showOneMile();
 const lakeCell=(key)=>page.locator(`[data-fine-key="${key}"]`);
 await lakeCell('4,0').scrollIntoViewIfNeeded();
 await lakeCell('4,0').press('Enter');
 await shot('small-lake-before.jpg');
 await button('Add small lake').click();
 await lakeCell('5,0').press('Enter');
 assert.match(await page.locator('[data-small-lake-editor]').innerText(),/Selected hexes: 2/);
 await page.locator('[data-editor-only="small-lake-draft"] path').waitFor();
 await shot('small-lake-draft.jpg');
 const saveLake=button('Save lake');
 await saveLake.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
 await saveLake.evaluate(node=>node.addEventListener('click',()=>{window.__smallLakeSaveClick=true;},{once:true}));
 await saveLake.click();
 assert.equal(await page.evaluate(()=>window.__smallLakeSaveClick),true,'the lake editor receives the native save click');
 const smallLake=page.locator('[data-small-lake="1"]');
 await page.waitForFunction(()=>!!document.querySelector('[data-small-lake="1"], .info-body > [role="alert"]'));
 assert.deepEqual(await page.locator('.info-body > [role="alert"]').allTextContents(),[],'save prepares the real document without silent refusal');
 await smallLake.waitFor();
 const lakePath=await smallLake.locator('path').getAttribute('d');
 assert.ok(lakePath?.length>40);
 const savedLakeWorld=await snap();
 assert.deepEqual(savedLakeWorld.map.physicalGrid.smallLakes,{nextId:2,lakes:[{id:1,cells:[{q:4,r:0},{q:5,r:0}],origin:'manual'}]});
 assert.deepEqual(savedLakeWorld.generation,classicSource.generation,'manual water edit does not change RNG');
 await lakeCell('4,0').scrollIntoViewIfNeeded();
 await shot('small-lake-after.jpg');
 await page.evaluate(()=>{window.__oneSvg=null;});
 const pngMenu=page.locator('details.export-menu');
 if(await pngMenu.getAttribute('open')===null)await pngMenu.locator('summary').click();
 const [smallLakePng]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);
 const smallLakeBytes=await fs.readFile(await smallLakePng.path());
 assert.equal(smallLakeBytes.subarray(1,4).toString(),'PNG');
 await fs.writeFile(new URL('small-lake-export.png',out),smallLakeBytes);
 await page.waitForFunction(()=>typeof window.__oneSvg==='string');
 const renderedLakeSvg=await page.evaluate(()=>window.__oneSvg);
 assert.ok(renderedLakeSvg.includes(lakePath)&&renderedLakeSvg.includes('data-small-lake="1"')&&!renderedLakeSvg.includes('small-lake-draft'));
 await button('Undo').click();
 await smallLake.waitFor({state:'detached'});
 await button('Redo').click();
 await smallLake.waitFor();
 assert.equal(await smallLake.locator('path').getAttribute('d'),lakePath);
 await step.selectOption('6');
 await smallLake.waitFor({state:'detached'});
 await loadWorld(Buffer.from(JSON.stringify(savedLakeWorld)));
 await showOneMile();
 await smallLake.waitFor();
 assert.equal(await smallLake.locator('path').getAttribute('d'),lakePath);
 await lakeCell('4,0').press('Enter');
 await button('Remove small lake').click();
 await smallLake.waitFor({state:'detached'});
 assert.deepEqual((await snap()).map.physicalGrid.smallLakes,{nextId:2,lakes:[]});
 await button('Undo').click();
 await smallLake.waitFor();
 assert.equal(await smallLake.locator('path').getAttribute('d'),lakePath);
 manifest.cases.push({id:'HX056-manual-small-lake-roundtrip-and-png',status:'pass',cells:['4,0','5,0'],pngBytes:smallLakeBytes.length});

 const waterEditorWorld=await fs.readFile(new URL('../fixtures/e6-water-editor.json',import.meta.url));
 await loadWorld(waterEditorWorld);
 await showOneMile();
 await lakeCell('0,0').press('Enter');
 await button('Add small lake').click();
 await saveLake.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
 await saveLake.click();
 await smallLake.waitFor();
 await step.selectOption('6');
 await smallLake.waitFor({state:'detached'});
 const sourceHex=page.locator('polygon.hex[data-hex-key="0,0"]');
 await sourceHex.dispatchEvent('click');
 if(await button('Edit').count())await button('Edit').click();
 const beforeWaterEdit=await snap();
 const showWaterLoss=async()=>{
   if(await pngMenu.getAttribute('open')!==null)await pngMenu.locator('summary').click();
   await page.getByRole('combobox',{name:'Surface',exact:true}).selectOption('lake');
   await page.locator('[data-water-finish]').click();
   const loss=page.locator('[data-water-small-lake-losses]');
   await loss.waitFor();
   assert.match(await loss.innerText(),/№1 · one-mile hexes 0,0/);
   return loss;
 };
 const waterLoss=await showWaterLoss();
 await waterLoss.scrollIntoViewIfNeeded();
 await shot('small-lake-source-edit-preview.jpg');
 await page.locator('[data-water-reset]').click();
 assert.deepEqual(await snap(),beforeWaterEdit);
 await showWaterLoss();
 await page.locator('[data-water-confirm]').click();
 const afterWaterEdit=await snap();
 assert.equal(afterWaterEdit.map.terrainByHexKey['0,0'].terrainOverride,'lake');
 assert.deepEqual(afterWaterEdit.map.physicalGrid.smallLakes,{nextId:2,lakes:[]});
 await button('Undo').click();
 assert.deepEqual(await snap(),beforeWaterEdit);
 await button('Redo').click();
 assert.deepEqual(await snap(),afterWaterEdit);
 await showOneMile();
 await smallLake.waitFor({state:'detached'});
 await shot('small-lake-source-edit-after.jpg');
 manifest.cases.push({id:'HX056-source-water-removes-small-lake',status:'pass',sourceHex:'0,0',cancelExact:true,undoRedoExact:true});

 await page.reload();
 const seed=page.getByRole('textbox',{name:'World seed',exact:true});
 await seed.fill('42');await seed.press('Tab');
 const generationSize=page.getByRole('combobox',{name:'Size',exact:true});
 await generationSize.selectOption('small_region');
 await page.locator('polygon.hex.candidate[data-hex-key="0,0"]').dispatchEvent('click');
 await button('Regenerate region').waitFor();
 await generationSize.selectOption('locality');
 await showOneMile();
 const lakeCells=['-21,19','0,0'];
 for(const [i,key] of lakeCells.entries()){
   await lakeCell(key).press('Enter');
   await button('Add small lake').click();
   await saveLake.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
   await saveLake.click();
   await page.locator(`[data-small-lake="${i+1}"]`).waitFor();
 }
 await lakeCell(lakeCells[0]).scrollIntoViewIfNeeded();
 await shot('small-lake-regeneration-before.jpg');
 await step.selectOption('6');
 const beforeRegeneration=await snap();
 assert.deepEqual(beforeRegeneration.map.physicalGrid.smallLakes.lakes.map(lake=>lake.id),[1,2]);
 const regenerateWithConsent=async accept=>{
   if(await pngMenu.getAttribute('open')!==null)await pngMenu.locator('summary').click();
   regenerationConsent=accept;
   try{
     const [dialog]=await Promise.all([page.waitForEvent('dialog'),button('Regenerate region').click()]);
     assert.equal(dialog.type(),'confirm');
     assert.match(dialog.message(),/small lakes in full: №1 \(-21,19\)/);
     assert.doesNotMatch(dialog.message(),/№2/);
     await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
     return dialog.message();
   }finally{regenerationConsent=null;}
 };
 const warning=await regenerateWithConsent(false);
 assert.deepEqual(await snap(),beforeRegeneration);
 assert.equal(await regenerateWithConsent(true),warning);
 const afterRegeneration=await snap();
 assert.notDeepEqual(afterRegeneration.map.regions,beforeRegeneration.map.regions);
 assert.deepEqual(afterRegeneration.map.physicalGrid.smallLakes,{nextId:3,lakes:[beforeRegeneration.map.physicalGrid.smallLakes.lakes[1]]});
 await button('Undo').click();assert.deepEqual(await snap(),beforeRegeneration);
 await button('Redo').click();assert.deepEqual(await snap(),afterRegeneration);
 await showOneMile();
 await page.locator('[data-small-lake="2"]').waitFor();
 assert.equal(await smallLake.count(),0);
 await lakeCell(lakeCells[1]).scrollIntoViewIfNeeded();
 await shot('small-lake-regeneration-after.jpg');
 manifest.cases.push({id:'HX056-regeneration-confirms-small-lake-loss',status:'pass',seed:42,warning,cancelExact:true,undoRedoExact:true,retainedLake:2});
 assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);manifest.status='passed';
 await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));
 // Bounded portable actual previews for the repository handoff. Not generated
 // imagery; every JPEG is a screenshot of this exact CI checkout.

}catch(error){manifest.status='failed';manifest.error=String(error);manifest.pageErrors=errors;manifest.alerts=alerts;
 if(page){manifest.diagnostics=await page.evaluate(()=>({step:document.querySelector('[data-fine-step]')?.value,fineWorld:document.querySelectorAll('[data-fine-world]').length,finePanel:document.querySelectorAll('[data-fine-panel]').length,clicks:window.__fineClicks,body:document.body.innerText.slice(0,4000)}));await page.screenshot({path:new URL('failure.jpg',out).pathname,type:'jpeg',quality:75,fullPage:true});}
 await fs.writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));throw error;}
finally{await browser?.close();baselineServer?.kill();if(baselineDir){try{execFileSync('git',['worktree','remove','--force',baselineDir+'/source'],{cwd:root,stdio:'ignore'});}catch{}await fs.rm(baselineDir,{recursive:true,force:true});}server.kill('SIGTERM');
 console.log('ONE_MILE_UI_RESULT '+JSON.stringify(manifest));
}
