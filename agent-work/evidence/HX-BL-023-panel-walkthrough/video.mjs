import {chromium} from '/workspace/e4integration/node_modules/playwright/index.mjs';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';
const root='/workspace/panel-review-cf08a82',out='/workspace/walkthrough';
const server=spawn(process.execPath,[root+'/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4192','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});await new Promise(r=>server.stdout.on('data',d=>{if(d.toString().includes('Local:'))r()}));
const b=await chromium.launch({headless:true,executablePath:'/tmp/f7-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});const c=await b.newContext({viewport:{width:1500,height:1000},recordVideo:{dir:out+'/raw-video',size:{width:1500,height:1000}}});const p=await c.newPage();await p.route(/mc\.yandex/,r=>r.abort());
try{await p.goto('http://127.0.0.1:4192');await p.locator('input[type=file]').setInputFiles(root+'/test/fixtures/import-v2/baseline-mythic.json');await p.waitForFunction(()=>document.querySelector('.direct-mode')&&!document.querySelector('.controls--transfer > button').disabled);await p.waitForTimeout(900);
await p.mouse.move(250,450);await p.mouse.wheel(0,450);await p.waitForTimeout(1100);
const mode=p.getByRole('button',{name:'Редактировать',exact:true});await mode.hover();await p.waitForTimeout(1000);await mode.click();await p.waitForTimeout(900);
const name=p.locator('.info-block--hex [data-name-key^="region:"]').first();await name.click();const input=p.getByRole('textbox',{name:'Название',exact:true});await input.fill('Пробный ввод');await p.waitForTimeout(900);await input.press('Escape');await p.waitForTimeout(900);
await name.click();await input.fill('Тихая долина');await p.waitForTimeout(900);await input.press('Enter');await p.waitForTimeout(900);await p.getByRole('button',{name:'Готово',exact:true}).click();await p.waitForTimeout(1000);
await p.getByRole('button',{name:'Отменить',exact:true}).click();await p.locator('.info-block--hex').scrollIntoViewIfNeeded();await p.waitForTimeout(1000);
const v=p.video();await c.close();await v.saveAs(out+'/PR482-scroll-edit-undo.webm');console.log('recorded exact4a46f90 actual interactions');
}finally{await b.close();server.kill();}
