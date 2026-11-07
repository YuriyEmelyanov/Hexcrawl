import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {mythicDefinitions} from './src/tags/mythic.ts';
import {resolved} from './src/tags/engine.ts';

const root=new URL('./',import.meta.url);
const out=new URL('research-tagged-poi-result.json',root);
const checks=[];
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const record=(name,fn)=>{fn();checks.push({name,passed:true});};
const data=regionFixture('mythic');
data.map.regions[0].pointOfInterestKinds['2,0']='monument';
const def=mythicDefinitions['mb.monument'],values=[[1],[1]];
const tag={definitionId:def.id,definitionVersion:def.version,owner:{kind:'poi',regionId:1,hexKey:'2,0'},resolver:def.resolver,revision:3,sides:def.slots.map(s=>s.sides),values,...resolved(def,values),overrides:[{ru:'Мастер-X',en:'GM-X'}]};
data.map.tags={schemaVersion:1,instances:[tag],rollCounters:{'poi:1:2,0|mb.monument|group':2,'poi:1:2,0|mb.monument|entry':4}};
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4197','--strictPort'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,report;
try{
 await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Preview startup: '+text)),15000);server.stdout.on('data',d=>{text+=d;if(text.includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 const {default:bundledChromium}=await import('@sparticuz/chromium');
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||await bundledChromium.executablePath(),headless:true,args:[...bundledChromium.args,'--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[],dialogs=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
 await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(blob){const url=create.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};HTMLAnchorElement.prototype.click=function(){if(blobs.has(this.href)){blobs.get(this.href).then(text=>window.__exported=JSON.parse(text));return;}return click.call(this);};});
 const button=name=>page.getByRole('button',{name,exact:true});
 async function closeMenu(){const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')!==null)await menu.locator('summary').click();}
 async function snapshot(){await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__exported);const d=await page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});await closeMenu();return d;}
 async function load(d){await page.locator('input[type=file]').setInputFiles({name:'research-tagged-poi.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);}
 async function select(k){await page.locator(`polygon.hex[data-hex-key="${k}"]`).dispatchEvent('click');}
 async function edit(){if(await button('Редактировать').count())await button('Редактировать').click();}
 async function target(q,r){await page.getByRole('textbox',{name:'Новый гекс q',exact:true}).fill(q);await page.getByRole('textbox',{name:'Новый гекс r',exact:true}).fill(r);}
 await page.goto('http://127.0.0.1:4197/');await button('Переключить на русский').click();
 await load(data);const m0=await snapshot();
 record('valid nonempty imported tag',()=>{assert.equal(m0.map.tags.instances.length,1);assert.deepEqual(m0.map.tags.instances[0],tag);});
 await select('2,0');await edit();await page.locator('[data-poi-move]').click();await target('3','0');
 const preview=await snapshot();record('move preview has not changed accepted document',()=>assert.deepEqual(preview,m0));
 await button('Готово').click();const m1=await snapshot();
 const expectedTag={...tag,owner:{kind:'poi',regionId:2,hexKey:'3,0'}};
 record('tag identity and bilingual override survive move',()=>{assert.equal(m1.map.tags.instances.length,1);assert.deepEqual(m1.map.tags.instances[0],expectedTag);});
 record('counter prefixes moved with exact values',()=>assert.deepEqual(m1.map.tags.rollCounters,{'poi:2:3,0|mb.monument|group':2,'poi:2:3,0|mb.monument|entry':4}));
 record('world RNG and document counters unchanged',()=>{assert.deepEqual(m1.generation,m0.generation);assert.deepEqual(m1.counters,m0.counters);});
 record('region membership transferred',()=>{assert.deepEqual(m1.map.regions[0].pointsOfInterest,[]);assert.deepEqual(m1.map.regions[1].pointsOfInterest,[{q:3,r:0}]);});
 await button('Отменить').click();const undone=await snapshot();record('exact Undo document',()=>assert.deepEqual(undone,m0));
 await button('Повторить').click();const redone=await snapshot();record('exact Redo document',()=>assert.deepEqual(redone,m1));
 await load(m1);const roundtrip=await snapshot();record('exact JSON roundtrip',()=>assert.deepEqual(roundtrip,m1));
 const blocked=structuredClone(m0);blocked.map.regions[1].pointsOfInterest=[{q:3,r:0}];blocked.map.regions[1].pointOfInterestKinds={'3,0':'monument'};
 await load(blocked);const b0=await snapshot();await select('2,0');await edit();await page.locator('[data-poi-move]').click();await target('3','0');
 const disabled=await button('Готово').isDisabled();const b1=await snapshot();
 record('occupied target refused atomically',()=>{assert.equal(disabled,true);assert.deepEqual(b1,b0);});
 record('no browser errors or import alerts',()=>{assert.deepEqual(errors,[]);assert.deepEqual(dialogs,[]);});
 report={status:'passed',code_sha:'00190bb749a4fa5af57aac4bbffff808e8fe733f',browser:browser.version(),node:process.version,fixture:'regionFixture(mythic) with one valid mb.monument product tag; synthetic bilingual overrides; source owner1:2,0 target2:3,0',checks,document_hashes:{before:hash(m0),moved:hash(m1),undo:hash(undone),redo:hash(redone),roundtrip:hash(roundtrip),blocked_before:hash(b0),blocked_after:hash(b1)},scope:'One targeted temporary browser scenario; existing MB shared lifecycle, not Knave resolver implementation or full game support',finished_at:new Date().toISOString()};
}catch(e){report={status:'failed',code_sha:'00190bb749a4fa5af57aac4bbffff808e8fe733f',checks,error:e.message,stack:e.stack,finished_at:new Date().toISOString()};process.exitCode=1;
}finally{await browser?.close();server.kill();await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
