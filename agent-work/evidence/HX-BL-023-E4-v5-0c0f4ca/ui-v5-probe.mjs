import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4197','--strictPort']);
await new Promise((r,j)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local:'))r()});server.on('error',j);server.on('exit',j)});
const b=await chromium.launch({executablePath:'/workspace/browser-tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const rows=[];
try{for(const lang of ['ru','en'])for(const width of [1500,390]){
const p=await b.newPage({viewport:{width,height:1000}});await p.route(/mc\.yandex/,r=>r.abort());await p.goto('http://127.0.0.1:4197');
if(lang==='en')await p.getByRole('button',{name:'Switch to English',exact:true}).click();
const menu=p.locator('details.export-menu');await menu.locator('summary').click();const notice=menu.locator('small');await notice.scrollIntoViewIfNeeded();assert.ok(await notice.isVisible());
const measurements=await p.evaluate(()=>{const menu=document.querySelector('.export-menu__items'),n=menu.querySelector('small'),a=n.getBoundingClientRect(),b=menu.getBoundingClientRect();return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,menu:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},notice:{left:a.left,right:a.right,top:a.top,bottom:a.bottom},seedTop:document.querySelector('.world-seed-control').getBoundingClientRect().top,text:n.textContent}});
assert.ok(measurements.documentWidth<=width);assert.ok(measurements.notice.right<=width);assert.ok(measurements.notice.bottom<=measurements.menu.bottom);assert.ok(measurements.menu.bottom<measurements.seedTop);
await p.locator('.world-seed-control').scrollIntoViewIfNeeded();const a=await p.locator('.controls--transfer').boundingBox(),z=await p.locator('.world-seed-control').boundingBox();await p.screenshot({clip:{x:Math.max(0,a.x-12),y:Math.max(0,a.y-12),width:Math.min(width,a.width+24),height:z.y+z.height-a.y+24},path:`/workspace/e4-v5-evidence/export-${lang}-${width}.png`});rows.push({lang,width,...measurements});await p.close();
}await fs.writeFile('/workspace/e4-v5-evidence/ui.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));}finally{await b.close();server.kill()}
