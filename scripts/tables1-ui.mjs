import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {stripVTControlCharacters} from 'node:util';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {runPreparationLifecycle} from '../test/browser/preparation-lifecycle.mjs';
const root=new URL('../',import.meta.url);
const server=spawn(process.execPath,[fileURLToPath(new URL('node_modules/vite/bin/vite.js',root)),'preview','--host','127.0.0.1','--port','4196','--strictPort'],{cwd:root,stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(Error(out)),10000);server.stdout.on('data',d=>{out+=d;if(stripVTControlCharacters(out).includes('Local:')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{const create=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(blob){const url=create.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};HTMLAnchorElement.prototype.click=function(){if(blobs.has(this.href)){blobs.get(this.href).then(text=>window.__exported=JSON.parse(text));return;}return click.call(this);};});
 await page.goto('http://127.0.0.1:4196/');
 const snapshot=async()=>{await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await page.getByRole('button',{name:'JSON',exact:true}).click();await page.waitForFunction(()=>window.__exported);return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});};
 await runPreparationLifecycle({page,snapshot,root});assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill();}
