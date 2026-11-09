import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {stripVTControlCharacters} from 'node:util';
import {regionFixture} from '../test/helpers/region-fixture.mjs';
import {knaveFactsFixture} from '../test/helpers/knave-fixture.mjs';
import {newKnaveLayer} from '../src/knaveClassic.ts';
import {emptyKnaveContent,fillKnaveContent,knaveResultText} from '../src/tags/knave.ts';
import catalog from '../src/tags/knaveCatalogData.ts';
import {createGenerationState} from '../src/worldRandom.ts';

const appRoot=process.argv[2],label=process.argv[3]??'after',out=path.resolve('reports/owner-knave-ui',label);
const git={head_sha:execFileSync('git',['rev-parse','HEAD'],{cwd:appRoot,encoding:'utf8'}).trim(),tree_sha:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:appRoot,encoding:'utf8'}).trim()};
await fs.mkdir(out,{recursive:true});
const server=spawn(process.execPath,['/workspace/scratch/ffa816ada945/hexcrawl/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4198','--strictPort'],{cwd:appRoot,stdio:['ignore','pipe','inherit']});
let browser;
try {
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error(text)),10000);server.stdout.on('data',data=>{text+=data;if(stripVTControlCharacters(text).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());
 await page.goto('http://127.0.0.1:4198/');
 const d=regionFixture();d.version=10;d.generation=createGenerationState(42);d.map.seas=[];d.map.nextSeaId=1;d.map.editorNames={};d.map.gmNotesByHexKey={};d.map.knave=newKnaveLayer();d.map.regions[0].pointOfInterestKinds['2,0']='ruins';
 d.map.knave.content=fillKnaveContent(emptyKnaveContent(),catalog,[knaveFactsFixture('poi:1:2,0')],42);
 await page.locator('input[type=file]').setInputFiles({name:'knave-real-catalog.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});
 await page.locator('[data-knave-part="trait"]').waitFor();
 if(await page.locator('.language-toggle').innerText()==='RU')await page.locator('.language-toggle').click();
 const content=d.map.knave.content.byPoi['poi:1:2,0'],metrics=[];
 const info=page.locator('.info-block--hex'),panel=info.locator('[data-knave-panel]');
 for(const width of [1500,390,320]){
  await page.setViewportSize({width,height:1100});await panel.scrollIntoViewIfNeeded();
  const value=await panel.locator('.tag-result').allTextContents();
  const boxes=await panel.locator('.knave-result').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom};}));
  const text=await panel.innerText();
  if(label==='after'){
   assert.equal(value[0],knaveResultText(content.site,content.site.table,'en'));
   assert.equal(value[1],knaveResultText(content.trait,'place_traits','en'));
   assert.doesNotMatch(text,/[А-Яа-яЁё]|\bSource\b|\bpick\b/);
   assert.equal(await panel.locator('details').count(),0);
  }
  metrics.push({width,text,results:value,rows:boxes});
  await info.screenshot({path:path.join(out,`knave-EN-${width}.png`)});
 }
 await page.locator('.language-toggle').click();await page.setViewportSize({width:390,height:1100});await panel.scrollIntoViewIfNeeded();await info.screenshot({path:path.join(out,'knave-RU-390.png')});
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'metrics.json'),JSON.stringify({label,...git,metrics,pageErrors:errors},null,2));
 console.log(JSON.stringify({label,...git,out,metrics}));
} finally {await browser?.close();server.kill();}
