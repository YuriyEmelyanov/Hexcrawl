import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {regionFixture} from './test/helpers/region-fixture.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const dir='/tmp/pr496-de9-review';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4296','--strictPort'],{stdio:['ignore','pipe','inherit']});
let browser;
const settle=page=>page.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));
const screenPoint=(page,x,y)=>page.evaluate(({x,y})=>{const layer=document.querySelector('[data-detail-view]'),target=layer.querySelector('[data-detail-cell="0,0"]');const points=[...target.points];const centre={x:points.reduce((s,p)=>s+p.x,0)/6,y:points.reduce((s,p)=>s+p.y,0)/6};const p=new DOMPoint(centre.x+x*Math.sqrt(3)*28/6,centre.y+y*Math.sqrt(3)*28/6).matrixTransform(layer.getScreenCTM());return {x:p.x,y:p.y};},{x,y});
try{
 await new Promise((ok,no)=>{server.stdout.on('data',b=>{if(b.toString().includes('Local:'))ok()});server.on('error',no);});
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());await page.goto('http://127.0.0.1:4296');
 const ru=page.getByRole('button',{name:'Переключить на русский',exact:true});if(await ru.count())await ru.click();
 const data=regionFixture('classic',{river:'directed'});data.ui.mapScale=2.4;
 await page.locator('input[type=file]').setInputFiles({name:'review.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.locator('[data-detail-preview]').click();await page.locator('[data-detail-apply]').click();await page.getByText('Охваты POI сохранены.',{exact:true}).waitFor();
 const result={head:'de9f374d737e85edc2f6a2ae52e5159a734f9f31',camera:[],pointer:[],errors};
 for(const rotate of [false,true]){
  if(rotate)await page.locator('.rotate-map-button').click();
  await page.locator('[data-detail-step-select]').selectOption('1');await settle(page);
  const cell=page.locator('[data-detail-cell="12,0"]');await cell.focus();await page.keyboard.press('Enter');await settle(page);
  const before=await screenPoint(page,12,0);
  for(const step of [6,12,24,1]){
   // Change the same native select without scrolling the map viewport.
   await page.locator('[data-detail-step-select]').selectOption(String(step));await settle(page);
   const after=await screenPoint(page,12,0);result.camera.push({rotate,step,before,after,drift:Math.hypot(after.x-before.x,after.y-before.y),scale:await page.locator('svg[data-biome-display]').evaluate(e=>getComputedStyle(e).transform)});
  }
 }
 // Direct native pointer dispatch at a point inside coarse cell1,0 but whose
 // fine-grid owner centre lies exactly on the coarse boundary.
 for(const step of [6,12,24]){
  await page.locator('[data-detail-step-select]').selectOption(String(step));await settle(page);
  const world={x:step/2+.01,y:0};const p=await screenPoint(page,world.x,world.y);
  const cell=page.locator('[data-detail-cell="1,0"]');
  await cell.evaluate((node,p)=>node.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:p.x,clientY:p.y,detail:1})),p);await settle(page);
  result.pointer.push({step,world,screen:p,pressed:await page.locator('[data-detail-cell][aria-pressed=true]').getAttribute('data-detail-cell'),summary:await page.locator('[data-detail-summary]').count()?await page.locator('[data-detail-summary]').innerText():null});
 }
 await fs.writeFile(dir+'/actual-probes.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();server.kill();}
