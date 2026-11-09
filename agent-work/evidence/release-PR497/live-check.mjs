import {chromium} from '../hexcrawl/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {knaveResultText} from '../hexcrawl-knave-fixes/src/tags/knave.ts';
const out=new URL('./',import.meta.url),px=new URL(process.env.HTTPS_PROXY);
const proxy={server:px.protocol+'//'+px.hostname+':'+px.port,...(px.username?{username:decodeURIComponent(px.username),password:decodeURIComponent(px.password)}:{})};
const browser=await chromium.launch({proxy,executablePath:'/workspace/scratch/ffa816ada945/knave-browser-runtime/extracted/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({ignoreHTTPSErrors:true,viewport:{width:1500,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{const old=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(b){const u=old.call(this,b);if(b.type.startsWith('application/json'))blobs.set(u,b.text());return u;};HTMLAnchorElement.prototype.click=function(){if(blobs.has(this.href)){blobs.get(this.href).then(t=>window.__release=JSON.parse(t));return;}return click.call(this);};});
 await page.goto('https://app.hexcrawl.ru/?release=PR497',{waitUntil:'networkidle'});
 const assets=[];
 for(const u of await page.locator('script[src],link[rel=stylesheet]').evaluateAll(xs=>xs.map(x=>x.src||x.href).filter(x=>x.includes('/assets/')))){
  const name=new URL(u).pathname.split('/').at(-1),local=await fs.readFile(new URL('../hexcrawl-knave-fixes/dist/assets/'+name,import.meta.url));
  const response=await page.request.get(u);assert.equal(response.status(),200);const body=await response.body();
  const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(body),hash(local));
  assets.push({name,bytes:body.length,sha256:hash(body),matches_accepted_build:true});
 }
 assert.ok(assets.some(x=>x.name.endsWith('.js'))&&assets.some(x=>x.name.endsWith('.css')));
 const snapshot=async()=>{await page.evaluate(()=>window.__release=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await page.getByRole('button',{name:'JSON',exact:true}).click();await page.waitForFunction(()=>window.__release);return page.evaluate(()=>{const d=window.__release;delete d.savedAt;return d;});};
 assert.equal(await page.locator('.language-toggle').innerText(),'EN');
 await page.getByRole('textbox',{name:'World seed',exact:true}).fill('137');await page.keyboard.press('Tab');await page.getByRole('checkbox',{name:'Knave 2e'}).check();
 await page.locator('.gen-params select').nth(0).selectOption('locality');await page.locator('.gen-params select').nth(1).selectOption('wild');await page.locator('.gen-params select').nth(3).selectOption('mainland');await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
 const generated=await snapshot();assert.equal(generated.version,10);assert.equal(generated.generation.masterSeed,137);const entries=Object.entries(generated.map.knave.content.byPoi),[owner,content]=entries.find(([,c])=>c.site),coord=owner.split(':')[2];
 await page.locator('polygon.hex[data-hex-key="'+coord+'"]').dispatchEvent('click');
 const panel=page.locator('[data-knave-panel]'),results=await panel.locator('.tag-result').allTextContents();
 assert.equal(results[0],knaveResultText(content.site,content.site.table,'en'));assert.equal(results[1],knaveResultText(content.trait,'place_traits','en'));
 assert.doesNotMatch(await panel.innerText(),/[А-Яа-яЁё]|\bSource\b|\bpick\b/);assert.equal(await panel.locator('.knave-source').count(),0);
 const selected=await snapshot();await page.getByRole('checkbox',{name:'Knave 2e'}).uncheck();const off=await snapshot();assert.equal(off.ui.knaveEnabled,false);assert.deepEqual(off.map,selected.map);assert.deepEqual(off.generation,selected.generation);
 await page.getByRole('combobox',{name:'Mode',exact:true}).selectOption('mythic');const mythic=await snapshot();assert.equal(mythic.ui.generationMode,'mythic');assert.deepEqual(mythic.map,off.map);assert.deepEqual(mythic.generation,off.generation);
 await page.getByRole('combobox',{name:'Mode',exact:true}).selectOption('classic');const classic=await snapshot();assert.equal(classic.ui.generationMode,'classic');assert.deepEqual(classic,off);
 const before=await snapshot(),trait=panel.locator('[data-knave-part=trait] .tag-die');assert.equal(await trait.locator('svg text').textContent(),String(before.map.knave.content.byPoi[owner].trait.roll));
 await trait.click();const after=await snapshot();assert.equal(after.map.knave.content.rollCounters[owner].trait,before.map.knave.content.rollCounters[owner].trait+1);assert.deepEqual(after.map.knave.content.byPoi[owner].site,before.map.knave.content.byPoi[owner].site);assert.deepEqual(after.generation,before.generation);const rest=d=>{const x=structuredClone(d);delete x.map.knave.content.byPoi[owner].trait;delete x.map.knave.content.rollCounters[owner].trait;return x;};assert.deepEqual(rest(after),rest(before));
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.deepEqual(await snapshot(),before);
 const metrics=[];for(const width of [1500,390]){await page.setViewportSize({width,height:1100});await panel.scrollIntoViewIfNeeded();const rows=await panel.locator('.knave-result').evaluateAll(xs=>xs.map(x=>({top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom,height:x.getBoundingClientRect().height}))),buttons=await panel.locator('.tag-die,.tag-pick').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().height));assert.deepEqual(buttons,[32,32]);assert.ok(rows[1].top-rows[0].bottom<=4);metrics.push({width,rows,buttons});await panel.screenshot({path:new URL('live-'+width+'.png',out).pathname});}
 assert.deepEqual(errors,[]);
 const report={checked_at:new Date().toISOString(),release_sha:'90afe931d9e9f8a2482febf77eaed20b401ceece',accepted_tree:'1631cd0a0a59f8b5f2d2e50f925111e7f59aefa2',live_url:page.url(),assets,seed:137,generated_poi_records:entries.length,english_results:results,profile_off_preserves_content:true,mode_switch_preserves_map_and_rng:true,trait_counter_isolated:true,exact_undo:true,metrics,page_errors:errors,TLS_validation:'Chromium ignoreHTTPSErrors; separate curl uses default verification',limitations:['One live generated seed and emulated widths; no exhaustive game/device validation.','Temporary diagnostic; no persistent test growth.']};
 await fs.writeFile(new URL('live-check.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
