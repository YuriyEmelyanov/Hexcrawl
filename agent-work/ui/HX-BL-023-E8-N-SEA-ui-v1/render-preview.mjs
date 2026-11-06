// Temporary analyst preview renderer, not a product test or Sea implementation.
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from '/workspace/scratch/60e61b33a6a0/central-note-removal/node_modules/playwright/index.mjs';
import {regionFixture} from '/workspace/scratch/60e61b33a6a0/central-note-removal/test/helpers/region-fixture.mjs';
const root='/workspace/scratch/60e61b33a6a0/central-note-removal',out='/workspace/scratch/fb5036e89339/sea-analysis/ui';
await fs.mkdir(out,{recursive:true});
const server=spawn(process.execPath,[root+'/node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4196','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('preview timeout')),15000);server.stdout.on('data',d=>{if(String(d).includes('Local:')){clearTimeout(t);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({executablePath:'/workspace/scratch/cc30953c0fc1/e6-analysis/browser/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());
 await page.goto('http://127.0.0.1:4196/');
 await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
 const fixture=regionFixture();fixture.map.terrainByHexKey={'-1,0':{terrainOverride:'sea'},'-2,0':{terrainOverride:'sea'}};fixture.ui.selectedHex={q:-1,r:0};
 await page.locator('input[type=file]').setInputFiles({name:'sea-baseline.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await page.locator('[data-hex-key="-1,0"]').first().dispatchEvent('click');
 const panel=page.locator('.info-block--hex');await panel.scrollIntoViewIfNeeded();
 if(!(await panel.innerText()).includes('Море'))throw Error('Sea baseline selection failed');
 const cssFile=(await fs.readdir(root+'/dist/assets')).find(f=>f.endsWith('.css'));
 const css=await fs.readFile(root+'/dist/assets/'+cssFile,'utf8');
 const before=await panel.evaluate(n=>n.outerHTML);
 const rows=[
 ['read','<p><strong>Море</strong> <button class="value">Северное море</button></p><p><strong>Координаты гекса:</strong> −1/0</p><p>Вода: <button class="value">Море</button></p><p>Заметки мастера<br><a>Добавить заметку</a></p>'],
 ['name','<p><strong>Море · Северное море</strong></p><label>Название<input value="Северное море" aria-label="Название"></label><div class="actions"><button>Сохранить</button><button>Отмена</button></div><p class="muted">Enter — сохранить · Escape — отменить</p>'],
 ['first','<p><strong>Море · Назвать объект</strong></p><label>Название<input value="Северное море"></label><label>Название (English)<input value="Northern Sea"></label><div class="actions"><button>Сохранить</button><button>Отмена</button></div>'],
 ['split','<p><strong>Разделение · Северное море</strong></p><label>Где сохранить имя<select><option>Правая часть · 3/0 · 2 гекса</option><option>Левая часть · 0/0 · 2 гекса</option></select></label><p class="muted">Другая часть останется без имени.</p><div class="actions"><button>Применить</button><button>Отмена</button></div>'],
 ['merge','<p><strong>Слияние морей</strong></p><label>Сохранить<select><option>Залив Туманов · море #12</option><option>Северное море · море #7</option></select></label><label class="loss"><input type="checkbox">Удалить имя «Северное море» (#7)</label><div class="actions"><button disabled>Применить</button><button>Отмена</button></div>'],
 ['error','<p><strong>Слияние морей</strong></p><label>Сохранить<select><option>Выберите море</option><option>Северное море · #7</option><option>Залив Туманов · #12</option></select></label><p role="alert">Выберите сохраняемое море и подтвердите удаление другого имени.</p><div class="actions"><button disabled>Применить</button><button>Отмена</button></div>']
 ];
 const extra='.sea-proposal{color:#f5d688;font-size:12px;margin:0 0 12px}.info-block--hex label{display:block;margin:10px 0}.info-block--hex input:not([type=checkbox]),.info-block--hex select{display:block;box-sizing:border-box;max-width:100%;width:100%;min-height:44px;font:inherit}.info-block--hex .actions{display:flex;flex-wrap:wrap;gap:8px}.info-block--hex .actions button{min-height:44px;padding:8px 14px}.info-block--hex .value{border:0;background:none;color:#7dd3fc;padding:0;text-decoration:underline;font:inherit}.info-block--hex .loss{display:flex;align-items:center;gap:8px;min-height:44px}.info-block--hex .loss input{min-width:24px;min-height:24px}.info-block--hex [role=alert]{color:#fda4af}.info-block--hex .muted{font-size:14px;color:#cbd5e1}.info-block--hex{overflow-wrap:anywhere}';
 await page.addStyleTag({content:extra});
 const results=[];
 for(const width of [1500,390]){
  await page.setViewportSize({width,height:1100});
  await panel.evaluate((n,html)=>n.outerHTML=html,before);
  await panel.scrollIntoViewIfNeeded();await panel.screenshot({path:out+'/current-'+width+'.png'});
  for(const [state,html] of rows){
   await panel.evaluate((n,html)=>n.innerHTML='<div class="sea-proposal">ПРЕДЛОЖЕНИЕ SEA-UI1 · не реализация</div>'+html,html);
   await panel.scrollIntoViewIfNeeded();
   const overflow=await panel.evaluate(n=>n.scrollWidth>n.clientWidth+1);
   if(overflow)throw Error('overflow '+state+'/'+width);
   const name=state+'-'+width;await panel.screenshot({path:out+'/'+name+'.png'});
   if(width===1500)await fs.writeFile(out+'/'+state+'.html','<!doctype html><html lang="ru"><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>Предложение SEA-UI1</title><style>'+css+extra+'body{padding:12px;background:#0f172a}.info-block--hex{max-width:470px}</style><body>'+await panel.evaluate(n=>n.outerHTML)+'</body></html>');
   results.push({state,width,overflow:false,type:'proposal_not_implementation'});
  }
 }
 await fs.writeFile(out+'/baseline-panel.html','<!doctype html><html lang="ru"><meta charset="UTF-8"><style>'+css+'</style><body>'+before+'</body></html>');
 await fs.writeFile(out+'/fixture.json',JSON.stringify(fixture,null,2));
 await fs.writeFile(out+'/manifest.json',JSON.stringify({version:'SEA-UI1',baseline_sha:'7547a67bbcfb621f1e7c7189518583842ccb055a',baseline_tree:'79b69059c70eed7430bcda93db5d72a6097695d3',scope:'Actual baseline Sea panel plus DOM proposal on existing published CSS. Not Sea runtime validation.',results,page_errors:errors},null,2));
 if(errors.length)throw Error(JSON.stringify(errors));console.log(JSON.stringify({status:'passed',proposal_layouts:results.length,errors}));
}finally{await browser?.close();server.kill();}
