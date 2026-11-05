import {createGenerationHarness} from '../helpers/generation-harness.mjs';
import {createGenerationState} from '../../src/worldRandom.ts';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
const root=new URL('../../',import.meta.url);
const presentOut='/workspace/scratch/cc30953c0fc1/presentation-e5';await fs.mkdir(presentOut,{recursive:true});
const captureRows=[],dialogs=[];let active='setup';
async function captureState(name,selector='.info-block--hex') {
 const prior=page.viewportSize();
 for(const width of [1500,390]){await page.setViewportSize({width,height:1100});const el=page.locator(selector).last();await el.scrollIntoViewIfNeeded();await page.waitForTimeout(120);await el.screenshot({path:`${presentOut}/${name}-${width}.png`});captureRows.push({name,width,selector,text:await el.innerText()});}
 await page.setViewportSize(prior);
}

const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manual-edit-map.json',import.meta.url)));
const manifest=JSON.parse(await fs.readFile(new URL('../fixtures/import-v2/manifest.json',import.meta.url)));
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4181','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser,page;const errors=[],alerts=[];
try {
 await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error(output)),10000);server.stdout.on('data',data=>{output+=data;if(stripVTControlCharacters(output).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',c=>reject(Error('preview '+c)));});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1500,height:1100}});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push({scenario:active,type:d.type(),message:d.message(),action:'dismiss'});await d.dismiss();});
 await page.route(/mc\.yandex/,route=>route.abort());
 await page.addInitScript(()=>{
   let seed=42;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   // Observe actual JSON export serialization, suppressing only the OS download
   // for repeated snapshots (Chromium throttles bursts of 300 downloads).
   const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();
   URL.createObjectURL=function(blob){const url=make.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};
   HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(text=>window.__exported=JSON.parse(text));return;}return click.call(this);};
   const clone=window.structuredClone;
   window.structuredClone=function(value){if(window.__failNamePreparation&&value?.regions&&value?.toponyms){window.__failNamePreparation=false;throw Error('injected rename preparation');}if(window.__failPreparation&&value?.schema==='hexcrawl-map'){window.__failPreparation=false;throw Error('injected before import commit');}return clone(value);};
   const read=FileReader.prototype.readAsText;
   FileReader.prototype.readAsText=function(file){
     if(window.__delayRead){window.__delayRead=false;window.__releaseRead=()=>read.call(this,file);return;}
     if(window.__failRead){window.__failRead=false;queueMicrotask(()=>this.onerror(new ProgressEvent('error')));return;}
     return read.call(this,file);
   };
 });
 await page.goto('http://127.0.0.1:4181/');
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).fill('42');
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).press('Tab');
 const button=name=>page.getByRole('button',{name,exact:true});
 async function snapshot(){
   await page.evaluate(()=>window.__exported=null);
   const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
   await button('JSON').click();await page.waitForFunction(()=>window.__exported!==null);
   return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});
 }
 async function load(data){await page.locator('input[type=file]').setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});await button('Загрузить JSON').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);}
 const select=async key=>page.locator(`polygon.hex[data-hex-key="${key}"]`).dispatchEvent('click');
 async function ensureEdit(){const edit=button('Редактировать');if(await edit.count())await edit.click();}
 async function biome(kind){await ensureEdit();await button('Изменить биом гекса').click();await page.getByRole('combobox',{name:'Изменить биом гекса',exact:true}).selectOption(kind);}
 async function poi(kind){
   await ensureEdit();await button('Редактировать точку интереса').first().click();
   await page.getByRole('combobox',{name:'Выберите точку интереса',exact:true}).selectOption(kind);
 }
 async function addRegion(){
   const before=await snapshot();const candidates=page.locator('polygon.hex.candidate[data-hex-key="9,0"]');const count=await candidates.count();
   for(let i=0;i<count;i++){
     await candidates.nth(i).dispatchEvent('click');await page.waitForFunction(()=>!document.querySelector('.controls--history button').disabled||!!document.querySelector('[role=alert]'));
     const after=await snapshot();if(after.map.regions.length>before.map.regions.length)return after;
     assert.deepEqual(after,before,'failed generation is atomic');
   }
   assert.fail('No candidate could generate a region');
 }
 async function transaction(action){const before=await snapshot();await action();const after=await snapshot();assert.notDeepEqual(after,before);await button('Отменить').click();assert.deepEqual(await snapshot(),before);await button('Повторить').click();assert.deepEqual(await snapshot(),after);return after;}
 const evidence=[];
 async function planner(data){const h=createGenerationHarness(42);h.render();h.setWindow({alert(){}});h.injectFunction('readTextFile',async file=>file.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'file'}});return h;}
 function initial(hasRiver){const h=createGenerationHarness(42),g=h.geometry;h.render();h.setWindow({alert(){}});h.render().addFallbackTractToMap({q:0,r:0});const base=h.render().captureDocument().map,a={q:0,r:0},b={q:1,r:0};const hexes=Array.from({length:9},(_,q)=>({q,r:0}));const region={...base.regions[0],hexes,centerHex:a,anchorHex:a,finalSize:9,targetSize:9,pointsOfInterest:[],pointOfInterestKinds:{},heightLevel:1};h.render().restoreSnapshot({...base,regions:[region],rivers:[],roads:[],crossings:[],riverFeatures:{rapids:[],waterfalls:[]},hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),candidateHexes:g.getCandidateHexes(hexes,new Set()),nextRiverId:1,nextRoadId:1});if(hasRiver){const other=new Set(g.getHexCornerPoints(b).map(v=>v.key));assert.ok(h.render().editRiverDocument({type:'create',regionId:region.id,path:g.getHexCornerPoints(a).filter(v=>other.has(v.key)),fullness:2}));}return h.render().createSaveData();}
 const find=async()=>{await ensureEdit();if(await button('Найти объект').getAttribute('aria-expanded')==='false')await button('Найти объект').click();await page.locator('[data-target-key="river:1"]').click();};
 for(const kind of ['R1-deleted','R2-moved','R3-retained-sector']){
  active=kind;console.log('start '+kind);await load(initial(kind!=='R3-retained-sector'));await page.getByRole('combobox',{name:'Размер',exact:true}).selectOption('locality');const generated=await addRegion();console.log('checkpoint '+kind);const h=await planner(generated),g=h.geometry,current=h.render().captureDocument().map,last=current.regions.at(-1),retained=current.regions[0];let keys;
  if(kind==='R1-deleted'){await find();await page.locator('[data-river-remove]').click();await page.waitForTimeout(200);console.log('REMOVE '+await page.locator('.info-block--hex').last().innerText());if(await page.locator('[data-river-confirm]').count())await page.locator('[data-river-confirm]').click();assert.ok(!(await snapshot()).map.rivers.some(r=>r.id===1));}
  if(kind==='R2-moved'){
   outer:for(const hex of last.hexes){const vs=g.getHexCornerPoints(hex);for(let i=0;i<vs.length;i++){const path=[vs[i],vs[(i+1)%vs.length]];if(h.render().editRiverDocument({type:'replace',riverId:1,path,regionId:retained.id,fullness:2},{confirmed:true})&&h.render().rivers.find(r=>r.id===1).regionId===last.id){keys=path.map(v=>v.key);break outer;}}}
   assert.ok(keys);await find();await page.locator('[data-river-replace]').click();for(const key of keys)await page.locator(`[data-river-draft-vertex="${key}"]`).dispatchEvent('click');await page.locator('[data-river-finish]').click();await page.locator('[data-river-confirm]').click();assert.equal((await snapshot()).map.rivers.find(r=>r.id===1).regionId,last.id);
  }
  if(kind==='R3-retained-sector'){
   const ctx=g.buildManualRiverGeometryContext(current),adj=new Map();for(const [edge,owners]of ctx.geometry.edgeOwners){const[u,v]=edge.split('|');for(const[x,y]of[[u,v],[v,u]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push({key:y,owners});}}
   let trials=0;
   outer:for(const[start,edges]of adj)for(const e of edges.filter(e=>e.owners.length===1&&e.owners[0]===last.id)){const queue=[[start,e.key]];while(queue.length){const path=queue.shift(),end=path.at(-1);if(path.length>8)continue;const touches=path.slice(1).some((k,i)=>ctx.edgeOwners([path[i],k].sort().join('|')).includes(retained.id));if(touches&&ctx.geometry.openVertices.has(end)){assert.ok(++trials<=500);if(h.render().editRiverDocument({type:'create',path:path.map(k=>ctx.vertex(k)),regionId:last.id,fullness:1})){keys=path;break outer;}}if(path.length<8)for(const n of adj.get(end)??[])if(!path.includes(n.key))queue.push([...path,n.key]);}}
   assert.ok(keys);await select('0,0');await ensureEdit();await button('Добавить реку').click();for(const key of keys)await page.locator(`[data-river-draft-vertex="${key}"]`).dispatchEvent('click');await page.locator('[data-river-finish]').click();if(await page.locator('[data-river-confirm]').count())await page.locator('[data-river-confirm]').click();const river=(await snapshot()).map.rivers.at(-1);assert.equal(river.regionId,last.id);assert.ok(river.sectors.some(s=>s.assignedRegionId===retained.id));
  }
  await select('0,0');if(await button('Готово').count())await button('Готово').click();await captureState(kind+'-before');
  for(const command of ['Удалить последний регион','Перегенерировать регион']){const before=await snapshot(),count=dialogs.length;active=kind+':'+command;await button(command).click();await page.waitForTimeout(200);assert.equal(dialogs.length,count+1);assert.match(dialogs.at(-1).message,/Будет восстановлено исходное состояние рек/);assert.deepEqual(await snapshot(),before);evidence.push({kind,command,rejected_document_exact:true,actual_dialog:dialogs.at(-1),path:keys??null});}
  await captureState(kind+'-rejected');console.log(kind+' actual native dialogs rejected; document exact');
 }
 await fs.writeFile(`${presentOut}/native-dialogs.json`,JSON.stringify({head_sha:'1daf34df6b1c4f465e69523255ebcb0dee671baa',method:'Real browser DOM actions; legal imported preconditions; next region/checkpoint created by UI; harness used only for precondition construction and path planning outside browser; native dialog observed and dismissed; exact JSON export comparison.',evidence,dialogs,captureRows,errors},null,2));
 assert.deepEqual(errors,[]);
}finally{if(browser)await browser.close();server.kill();}
