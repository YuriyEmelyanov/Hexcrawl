import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.HEXCRAWL_SOURCE_DIR??'/workspace/scratch/cc30953c0fc1/release-pr486',out=process.env.HEXCRAWL_PREVIEW_DIR??'/workspace/scratch/cc30953c0fc1/e6-analysis/ui-v1';
await fs.mkdir(out,{recursive:true});
const {chromium}=createRequire(root+'/package.json')('playwright');
const server=spawn(process.execPath,[root+'/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4190','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{let t=setTimeout(()=>reject(Error('preview server timeout')),10000);server.stdout.on('data',d=>{if(String(d).includes('Local:')){clearTimeout(t);resolve();}});});
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH??'/workspace/scratch/cc30953c0fc1/e6-analysis/browser/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage(),errors=[],metrics=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());
 const fixture=JSON.parse(await fs.readFile(root+'/test/fixtures/terrain-display-map.json','utf8'));fixture.ui.mapScale=1.1;
 const states={
  read:{label:'Просмотр',body:'<p data-water-row>Вода: <strong>Озеро</strong></p>'},
  edit:{label:'Edit · выбор воды',body:'<p data-water-row>Вода: <button class="direct-value">Озеро</button> <button class="direct-value">Изменить берег</button></p><p>Изменить на: <select aria-label="Вода"><option>Озеро</option><option>Море</option><option>Суша</option></select></p>'},
  mask:{label:'Черновик · выбор клеток',body:'<p data-water-row>Вода: <strong>Озеро · 3 клетки</strong></p><p>Выберите клетки на карте. Enter — завершить, Esc — сбросить.</p><p><button class="secondary">Весь водоём</button> <button class="secondary">Сбросить</button></p>'},
  preview:{label:'Предпросмотр последствий',body:'<p data-water-row>Вода: <strong>Суша · 1 клетка</strong></p><p>Озеро <strong>Эшуотер</strong> исчезнет. Регион и биом сохранятся.</p><p><label><input type="checkbox"> Удалить имя Эшуотер / Ashwater и тег «Вода»</label></p><p><label><input type="checkbox"> Удалить водный POI «Подводные руины»</label></p><p>Заметка «Здесь затонул корабль» сохранится в гексе.</p><p><button disabled>Подтвердить изменение</button> <button class="secondary">Сбросить</button></p>'},
  error:{label:'Отказ · карта сохранна',body:'<p data-water-row>Вода: <strong>Суша · 1 клетка</strong></p><p role="alert" class="direct-error">Река «Эринин», F2: после осушения устью некуда впадать. Нужны озеро минимум в 2 клетки или допустимое продолжение русла.</p><p>Измените выделение либо сбросьте правку и измените реку.</p><p><button class="secondary">Сбросить</button></p>'},
  after:{label:'Результат · предложение',body:'<p data-water-row>Вода: <strong>Озеро · 3 клетки</strong></p><p>Имя Эшуотер и теги сохранены. Берег изменён.</p><p>Одна операция в истории — доступна отмена.</p>'}
 };
 for(const width of [1500,390,320]){
  const height=width===1500?1000:1100;await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4190/');
  await page.locator('input[type=file]').setInputFiles({name:'ui-preview-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
  await page.locator('polygon.hex[data-hex-key="3,5"]').dispatchEvent('click');
  await page.evaluate(()=>{const info=document.querySelector('.info-block--hex'),panel=document.querySelector('.side-panel');panel.scrollTop=info.offsetTop-18;const poly=document.querySelector('polygon.hex[data-hex-key="3,5"]'),vp=document.querySelector('.map-viewport'),p=poly.getBoundingClientRect(),v=vp.getBoundingClientRect();vp.scrollBy(p.x+p.width/2-v.x-v.width/2,p.y+p.height/2-v.y-v.height/2);});
  if(width<901)await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  if(width!==320)await page.screenshot({path:`${out}/current-${width}.png`});
  const original=await page.locator('.info-block--hex').innerHTML();
  for(const [state,props]of Object.entries(states)){
   await page.evaluate(({original,state,body,label})=>{
    const info=document.querySelector('.info-block--hex');info.innerHTML=original;
    const p=[...info.querySelectorAll(':scope > p')].find(p=>p.textContent.includes('Озеро'));
    p.insertAdjacentHTML('afterend',body);p.remove();
    const mode=info.querySelector('.direct-mode');mode.textContent=state==='read'||state==='after'?'✎':'✓';mode.setAttribute('aria-label',state==='read'?'Редактировать':'Готово');
    let badge=document.querySelector('#proposal-label');if(!badge){badge=document.createElement('div');badge.id='proposal-label';document.body.append(badge);}badge.textContent='ПРЕДЛОЖЕНИЕ E6 UI-v1 · '+label;
    badge.style.cssText='position:fixed;right:8px;top:8px;max-width:calc(100% - 16px);padding:5px 8px;background:#263d59;color:#d5f0ff;border:1px solid #7dd3fc;border-radius:5px;z-index:100;font:12px system-ui;pointer-events:none';
    info.querySelectorAll('select').forEach(s=>s.style.cssText='max-width:100%;font:inherit;color:inherit;background:#0c1423;border:1px solid #617187;border-radius:4px');
    info.querySelectorAll('label').forEach(s=>s.style.cssText='display:block;overflow-wrap:anywhere');
    info.querySelectorAll('input').forEach(s=>s.style.cssText='accent-color:#7dd3fc');
    document.querySelectorAll('[data-e6-mask]').forEach(e=>e.remove());
    if(['mask','after'].includes(state))for(const key of ['3,5','3,4','4,4']){const p=document.querySelector(`polygon.hex[data-hex-key="${key}"]`);if(p){const c=p.cloneNode(true);c.removeAttribute('class');c.dataset.e6Mask='1';c.style.cssText='fill:#18a8b9;fill-opacity:.6;stroke:#a5f3fc;stroke-width:2;pointer-events:none';p.parentElement.append(c);}}
    const panel=document.querySelector('.side-panel');panel.scrollTop=info.offsetTop-22;
   },{original,state,body:props.body,label:props.label});
   if(width<901)await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
   const measurement=await page.locator('.info-block--hex').evaluate(el=>({cardWidth:el.clientWidth,scrollWidth:el.scrollWidth,font:getComputedStyle(el).fontSize,rowTop:el.querySelector('[data-water-row]').getBoundingClientRect().top}));
   assert.ok(measurement.scrollWidth<=measurement.cardWidth+1,JSON.stringify({width,state,...measurement}));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'viewport overflow');
   metrics.push({width,state,...measurement});
   if(width!==320)await page.screenshot({path:`${out}/${state}-${width}.png`});
  }
 }
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/render-check.json',JSON.stringify({status:'pass',basis_sha:'27b230fc5fc5ac2f998141626fa091e1085d7a47',kind:'analyst_mockup_render_only_not_E6_functionality',metrics,page_errors:errors},null,2));
 console.log(JSON.stringify({status:'pass',screenshots:14,checked_widths:[1500,390,320],page_errors:errors}));
}finally{await browser?.close();server.kill();}
