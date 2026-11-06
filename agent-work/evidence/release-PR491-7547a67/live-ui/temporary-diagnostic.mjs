// Temporary post-deployment diagnostic for PR491. Never added to the suite.
// Uses four isolated browser contexts, a retained small fixture, and local UI only.
import {chromium} from '../central-note-removal/node_modules/playwright/index.mjs';
import {regionFixture} from '../central-note-removal/test/helpers/region-fixture.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const releaseSha='7547a67bbcfb621f1e7c7189518583842ccb055a';
assert.equal(process.env.HEXCRAWL_DEPLOY_SUCCESS,releaseSha,'Run only after confirmed deployment success for this release SHA');
const site=process.env.HEXCRAWL_LIVE_URL||'https://app.hexcrawl.ru/';
// One explicitly authorized route diagnostic, using the environment's existing proxy.
const proxyValue=process.env.HTTPS_PROXY||process.env.HTTP_PROXY||process.env.https_proxy||process.env.http_proxy;
assert.ok(proxyValue,'Existing HTTPS_PROXY/HTTP_PROXY required for this diagnostic');
const proxyURL=new URL(proxyValue);
const chromiumProxy={server:proxyURL.origin};
if(proxyURL.username)chromiumProxy.username=decodeURIComponent(proxyURL.username);
if(proxyURL.password)chromiumProxy.password=decodeURIComponent(proxyURL.password);
const out='/workspace/scratch/60e61b33a6a0/pr491-live-evidence';
const result={scope:'Temporary bounded live diagnostic; no permanent test growth',release_sha:releaseSha,expected_tree:'79b69059c70eed7430bcda93db5d72a6097695d3',site,started_at:new Date().toISOString(),cases:[],page_errors:[],dialogs:[],status:'running',limitations:['Headless Chromium at emulated viewport widths; no physical touch or screen reader verification','Deployment identity is established by the external successful deployment gate; HTML assets are recorded here']};
await fs.mkdir(out,{recursive:true});
let browser;
const deadline=setTimeout(()=>{console.error('Temporary diagnostic exceeded 120 seconds');process.exit(124);},120000);
try{
 browser=await chromium.launch({executablePath:'/workspace/scratch/cc30953c0fc1/e6-analysis/browser/chromium',proxy:chromiumProxy,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 result.explicit_proxy_configured=true;
 result.temporary_context_ignoreHTTPSErrors=true;
 result.chromium_certificate_trust_validated=false;
 result.limitations.push('Explicitly authorized UI-only run: temporary contexts ignore HTTPS errors after independent normally validated same-origin index/JS/CSS retrieval; Chromium certificate trust is not validated or repaired');
 const fixture=regionFixture();fixture.map.regions[0].suppressCentralPoi=false;fixture.map.regions[0].centralPoiKind='lair';
 for(const lang of ['en','ru'])for(const width of [1500,390]){
  const context=await browser.newContext({viewport:{width,height:1100},locale:'en-US',ignoreHTTPSErrors:true});
  const page=await context.newPage();page.setDefaultTimeout(10000);
  const record={lang,width,status:'running',screenshots:[]};result.cases.push(record);
  page.on('pageerror',e=>result.page_errors.push({lang,width,message:e.message}));
  page.on('dialog',async d=>{result.dialogs.push({lang,width,type:d.type(),message:d.message()});await d.dismiss();});
  await page.route(/mc\.yandex/,r=>r.abort());
  const button=name=>page.getByRole('button',{name,exact:true});
  const screenshot=async suffix=>{
   const panel=page.locator('.info-block--hex');await panel.scrollIntoViewIfNeeded();
   const name=`live-${lang}-${width}-${suffix}.png`;await panel.screenshot({animations:'disabled',path:`${out}/${name}`});
   record.screenshots.push(name);assert.equal(await panel.evaluate(e=>e.scrollWidth<=e.clientWidth+1),true,'selected-hex panel does not overflow');
  };
  const response=await page.goto(site,{waitUntil:'domcontentloaded',timeout:25000});
  assert.equal(response?.ok(),true,'live document loads successfully');
  record.url=page.url();record.http_status=response.status();
  await button('Переключить на русский').waitFor({state:'attached'});
  assert.equal(await button('Переключить на русский').count(),1,'fresh context starts English');record.fresh_english=true;
  record.assets=await page.locator('script[src],link[rel=stylesheet]').evaluateAll(nodes=>nodes.map(n=>n.src||n.href));
  const header=page.locator('.header-links');
  if(lang==='ru'){
   if(await header.evaluate(e=>e.classList.contains('is-collapsed')))await page.locator('.header-links-toggle').click();
   await page.locator('.language-toggle').click();
   await button('Switch to English').waitFor({state:'visible'});record.ru_toggle=true;
  }
  await page.locator('input[type=file]').setInputFiles({name:'temporary-central.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await page.waitForFunction(()=>{const b=document.querySelector('.controls--transfer > button');return b&&!b.disabled;});
  await page.locator('polygon.hex[data-hex-key="0,0"]').waitFor({state:'attached'});
  await page.locator('polygon.hex[data-hex-key="0,0"]').dispatchEvent('click');
  await button(lang==='ru'?'Редактировать':'Edit').click();
  assert.equal(await page.locator('[data-poi-panel]').count(),0,'no empty central location panel');
  assert.equal(await page.locator('[data-poi-move]').count(),0,'no central move control');
  assert.doesNotMatch(await page.locator('.info-block--hex').innerText(),/Центральная точка связана с центром региона|This point is bound to the region center|The central point is bound to the region center/i,'central explanatory note absent');
  record.note_absent=true;record.empty_panel_absent=true;
  const nameControl=page.locator('[data-name-key="poi:1:0,0"]');
  assert.equal(await nameControl.count(),1,'central name control remains');
  assert.equal(await button(lang==='ru'?'Редактировать точку интереса':'Edit point of interest').count(),1,'central type control remains');
  await screenshot('central');
  await nameControl.click();
  const primary=page.getByRole('textbox',{name:lang==='ru'?'Название':'Name',exact:true});
  const secondary=page.getByRole('textbox',{name:lang==='ru'?'Название (English)':'Name (Russian)',exact:true});
  assert.equal(await primary.isVisible(),true);assert.equal(await secondary.isVisible(),true);
  record.name_form=true;await screenshot('name');await page.keyboard.press('Escape');
  await button(lang==='ru'?'Редактировать точку интереса':'Edit point of interest').click();
  const kind=page.getByRole('combobox',{name:lang==='ru'?'Выберите точку интереса':'Choose a point of interest',exact:true});
  assert.equal(await kind.inputValue(),'lair');assert.equal(await kind.isVisible(),true);record.type_form=true;
  await screenshot('type');record.status='passed';await context.close();
 }
 assert.deepEqual(result.page_errors,[],'no page errors');assert.deepEqual(result.dialogs,[],'no import/error dialogs');result.status='passed';
}catch(error){result.status='failed';result.error=String(error.stack||error);process.exitCode=1;}
finally{
 clearTimeout(deadline);await browser?.close();result.completed_at=new Date().toISOString();
 await fs.writeFile(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}
