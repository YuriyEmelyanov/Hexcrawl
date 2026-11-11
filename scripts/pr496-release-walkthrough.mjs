// Temporary release presentation for PR496; not a permanent test suite or random sample.
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {stripVTControlCharacters} from 'node:util';import {chromium} from 'playwright';
import {regionFixture} from '../test/helpers/region-fixture.mjs';
const root=process.cwd(),dir=path.resolve('reports/PR496-release'),base=process.env.RELEASE_BASE_SHA;
assert.match(base??'',/^[0-9a-f]{40}$/);await fs.mkdir(dir,{recursive:true});
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseRoot=await fs.mkdtemp(path.join(os.tmpdir(),'pr496-published-'));
execFileSync('git',['fetch','--no-tags','--depth=1','origin',base],{stdio:'inherit'});execFileSync('git',['worktree','add','--detach',baseRoot,base],{stdio:'inherit'});await fs.symlink(path.join(root,'node_modules'),path.join(baseRoot,'node_modules'),'dir');
execFileSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build'],{cwd:baseRoot,stdio:'inherit'});
const servers=[];let browser;
async function serve(cwd,port){const s=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,stdio:['ignore','pipe','inherit']});servers.push(s);await new Promise((ok,no)=>{let out='';const timer=setTimeout(()=>no(Error('Preview timeout '+out)),15000);s.stdout.on('data',b=>{out+=b;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(timer);ok();}});s.on('error',no);s.on('exit',c=>{if(c)no(Error('Preview exit '+c));});});}
const data=regionFixture();data.version=8;Object.assign(data.map.regions[0],{centerHex:{q:2,r:0},suppressCentralPoi:false,centralPoiKind:'capital',pointsOfInterest:[],pointOfInterestKinds:{}});data.map.regions[1].pointsOfInterest=[{q:3,r:0}];data.map.regions[1].pointOfInterestKinds={'3,0':'village'};data.map.editorNames={'poi:1:2,0':{ru:'Северная столица старой переправы через Серебряную реку',en:'Northern capital at the old crossing of the Silver River'},'poi:2:3,0':{ru:'Деревнядревнихсмотрителейторговойдорогиусеверныхсосен',en:'VillageOfTheAncientKeepersOfTheNorthernTradingRoad'}};data.ui.mapScale=2.4;
await fs.writeFile(path.join(dir,'same-input.json'),JSON.stringify(data,null,2));
const result={temporary_release_diagnostic:true,permanent_test_cases_added:0,requirements_version:'DTL-1.2',release_authorization:false,generation_semantics_pending:'C-FILL actual workflow evidence required separately',base_sha:base,checkout_sha:head,head_sha:process.env.RELEASE_HEAD_SHA,fixture:'Existing regionFixture; five authored source hexes, two POIs, long names; identical old-format bytes in main/candidate',classification:[],views:[],exports:[],limitations:['Small authored map, Chromium and emulated widths; no exhaustive devices or generation sample.','The2.5mi capital extent is an explicit catalogue estimate, not a measured city boundary; independent physical-size evidence remains required.','Existing exact-SHA DETAIL1 workflow separately covers manual7-cell extent, water/access/history and shared-cell identities.']};
async function load(page,d){await page.locator('input[type=file]').setInputFiles({name:'same-input.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.getByText('Северная столица старой переправы через Серебряную реку',{exact:true}).first().waitFor();}
async function closeMenu(page){const m=page.locator('.export-menu');if(await m.getAttribute('open')!==null)await m.locator('summary').click();}
async function snapshot(page){await closeMenu(page);await page.locator('.export-menu summary').click();const ready=page.waitForEvent('download');await page.getByRole('button',{name:'JSON',exact:true}).click();const d=await ready;const v=JSON.parse(await fs.readFile(await d.path(),'utf8'));delete v.savedAt;await closeMenu(page);return v;}
async function shot(page,name,width){await page.setViewportSize({width,height:1100});await page.locator('.info-block--hex').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,name+`-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
try{
 await serve(baseRoot,4186);await serve(root,4187);browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [edition,port]of [['main',4186],['candidate',4187]]){
  const page=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});await page.route(/mc\.yandex/,r=>r.abort());await page.goto(`http://127.0.0.1:${port}`);const ru=page.getByRole('button',{name:'Переключить на русский',exact:true});if(await ru.count())await ru.click();await load(page,data);
  const imported=await snapshot(page);await fs.writeFile(path.join(dir,edition+'-imported.json'),JSON.stringify(imported,null,2));
  for(const width of [1500,390])await shot(page,edition+'-before',width);
  const classification={edition,terrain:await page.locator('[data-terrain-classification]').allTextContents(),discovery:await page.locator('[data-discovery-classification]').allTextContents()};result.classification.push(classification);
  if(edition==='main'){assert.equal(classification.terrain.length,0);assert.equal(await page.locator('[data-detail-preview]').count(),0);}
  else{
   assert.ok(classification.terrain.some(t=>t.includes('Опасная')));assert.ok(classification.discovery.some(t=>t.includes('При прохождении')));
   await page.setViewportSize({width:1500,height:1100});await page.locator('[data-poi-done]').click();await page.getByRole('combobox',{name:'Проходимость',exact:true}).waitFor();await shot(page,'candidate-classification-edit',1500);await page.locator('[data-poi-done]').click();
   const open=structuredClone(data);open.map.regions[0].biomeId='open_plains';open.map.biomeOverrideByHexKey['2,0']='open_plains';await load(page,open);await page.locator('[data-terrain-classification]').waitFor({state:'detached'});assert.equal(await page.locator('[data-terrain-classification]').count(),0,'ordinary terrain omitted');assert.equal(await page.getByRole('combobox',{name:'Поверхность',exact:true}).count(),0,'surface is editor-only');await load(page,data);await page.locator('[data-terrain-classification]').waitFor({state:'visible'});
   await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-apply]').waitFor();await shot(page,'candidate-preview',1500);await page.locator('[data-detail-cancel]').click();assert.equal(await page.locator('[data-detail-apply]').count(),0);await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-apply]').click();await page.getByText('Охваты POI сохранены.',{exact:true}).waitFor();
   const adapted=await snapshot(page);for(const k of ['regions','rivers','roads','crossings','tags','editorNames','gmNotesByHexKey','terrainByHexKey'])assert.deepEqual(adapted.map[k],imported.map[k],k+' unchanged by adaptation');assert.deepEqual(adapted.generation,imported.generation);assert.equal(adapted.version,14);assert.equal(adapted.map.physicalGrid.version,2);assert.ok(adapted.map.physicalGrid.active);assert.equal(adapted.map.physicalGrid.poiFootprints.find(p=>p.legacyRef==='poi:1:2,0').extent.representativeExtentMiles,2.5);await fs.writeFile(path.join(dir,'candidate-adapted.json'),JSON.stringify(adapted,null,2));
   for(const step of [1,6,12,24]){
    await page.locator('[data-detail-step-select]').selectOption(String(step));await page.locator(`[data-detail-view="${step}"]`).waitFor();let chosen=null;
    if(step===6){assert.equal(await page.locator('[data-detail-summary]').count(),0,'six miles retains the standard card');assert.equal(await page.locator('.detail-source-context').getAttribute('open')!==null,true);const cell=page.locator('[data-detail-cell="2,0"]');await cell.focus();await page.keyboard.press('Enter');chosen={cell:'2,0',card:'standard source6',ids:[]};}
    else if(step===1){
     // This walkthrough checks view invariance, not generation. Enter on a
     // partially accepted cell may now legitimately create ordinary geography.
     const cell=page.locator('[data-detail-cell="12,0"]');assert.equal(Number(await cell.getAttribute('data-detail-accepted-fraction')),1);await cell.focus();await page.keyboard.press('Enter');
     const ids=await page.locator('[data-detail-summary] [data-detail-poi-select]').evaluateAll(es=>es.map(e=>e.getAttribute('data-detail-poi-select')));assert.ok(ids.length);chosen={cell:'12,0',ids};
    }else{
     // Keep the accepted world point selected by the 6-mile card. Keyboard
     // activation of a partial 12/24 target intentionally starts C-FILL.
     const ids=await page.locator('[data-detail-summary] [data-detail-poi-select]').evaluateAll(es=>es.map(e=>e.getAttribute('data-detail-poi-select')));assert.ok(ids.length);
     chosen={cell:await page.locator('[data-detail-cell][aria-pressed="true"]').getAttribute('data-detail-cell'),ids};
    }
    if(chosen.ids)assert.equal(new Set(chosen.ids).size,chosen.ids.length);
    assert.equal(await page.locator('.detail-view-controls').count(),0);assert.equal(await page.locator('svg[data-biome-display] .top-hex-grid').count(),0);if(step!==1)assert.equal(await page.locator('[data-detail-footprint]').count(),0,'large views do not draw POI outlines');
    const current=await snapshot(page);assert.ok(Math.abs(current.ui.mapScale-adapted.ui.mapScale*6/step)<1e-9);assert.deepEqual(current.generation,adapted.generation);
    for(const width of [1500,390,320]){await page.setViewportSize({width,height:1100});await page.locator(step===6?'.info-block--hex':'[data-detail-summary]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(dir,`candidate-${step}-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}result.views.push({step,...chosen});
    if(step===12||step===24){await closeMenu(page);await page.locator('.export-menu summary').click();const ready=page.waitForEvent('download');await page.getByRole('button',{name:'PNG',exact:true}).click();const d=await ready;const file=path.join(dir,`candidate-${step}-export.png`);await d.saveAs(file);await closeMenu(page);assert.ok((await fs.stat(file)).size>1000);result.exports.push({step,file:path.basename(file),bytes:(await fs.stat(file)).size});}
    // Temporary visual evidence for the narrow-screen label finding: both
    // languages, every existing scale, no new permanent browser test case.
    for(const language of ['ru','en']){
     if(language==='en')await page.getByRole('button',{name:'Switch to English',exact:true}).click();
     await page.setViewportSize({width:320,height:1100});
     const select=page.locator('[data-detail-step-select]');await select.scrollIntoViewIfNeeded();
     const label=await select.evaluate(e=>{const s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=s.font;return {text:e.selectedOptions[0].textContent,width:e.getBoundingClientRect().width,needed:c.measureText(e.selectedOptions[0].textContent).width+parseFloat(s.paddingLeft)+parseFloat(s.paddingRight)+32};});
     assert.ok(label.width>=label.needed,JSON.stringify({step,language,...label}));
     await page.screenshot({path:path.join(dir,`candidate-${step}-label-${language}-320.png`),fullPage:true});
     (result.narrow_labels??=[]).push({step,language,...label});
    }
    await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
   }
   const viewed=await snapshot(page);for(const k of ['regions','rivers','roads','crossings','tags','editorNames','gmNotesByHexKey','terrainByHexKey'])assert.deepEqual(viewed.map[k],adapted.map[k]);assert.deepEqual(viewed.generation,adapted.generation);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);await page.close();
 }
 result.status='passed';await fs.writeFile(path.join(dir,'walkthrough.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();for(const s of servers)s.kill();}
