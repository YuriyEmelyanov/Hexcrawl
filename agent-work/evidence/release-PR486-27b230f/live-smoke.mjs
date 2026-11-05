import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source='/workspace/scratch/cc30953c0fc1/release-pr486';
const out='/workspace/scratch/cc30953c0fc1/release-pr486-evidence';
const {chromium}=createRequire(source+'/package.json')('playwright');
const expected=JSON.parse(await fs.readFile(out+'/expected-assets.json','utf8'));
const endpoint=process.env.HTTPS_PROXY||process.env.HTTP_PROXY||process.env.ALL_PROXY;
let proxy;
if(endpoint){const u=new URL(endpoint);proxy={server:u.protocol+'//'+u.host};if(u.username)proxy.username=decodeURIComponent(u.username);if(u.password)proxy.password=decodeURIComponent(u.password);}
let browser;
const result={release_sha:expected.release_sha,accepted_sha:expected.accepted_sha,started_at:new Date().toISOString(),url:'https://app.hexcrawl.ru/',proxy_used:!!proxy,page_errors:[],tls_limitation:'Initial browser connection had ERR_CERT_AUTHORITY_INVALID. This isolated browser context ignores HTTPS errors for functional smoke only; ordinary curl TLS verification and exact SHA256 of all live entry assets were checked independently. No product or server TLS setting changed; certificate-error cause not established.'};
try{
 browser=await chromium.launch({executablePath:'/tmp/chromium',headless:true,proxy,args:['--no-sandbox','--disable-dev-shm-usage']});
 result.browser=browser.version();
 const context=await browser.newContext({viewport:{width:1500,height:1100},ignoreHTTPSErrors:true}),page=await context.newPage();
 page.on('pageerror',e=>result.page_errors.push(e.message));
 await page.route(/mc\.yandex/,r=>r.abort());
 await page.addInitScript(()=>{const make=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blobs=new Map();URL.createObjectURL=function(blob){const url=make.call(this,blob);if(blob.type.startsWith('application/json'))blobs.set(url,blob.text());return url;};HTMLAnchorElement.prototype.click=function(){if(this.download.endsWith('.json')&&blobs.has(this.href)){blobs.get(this.href).then(text=>window.__exported=JSON.parse(text));return;}return click.call(this);};});
 const response=await page.goto(result.url+'?release='+result.release_sha,{waitUntil:'networkidle',timeout:45000});
 result.http_status=response.status();assert.equal(response.status(),200);
 result.script=await page.locator('script[type=module]').getAttribute('src');
 assert.equal(result.script,'/'+expected.files.find(x=>x.path.endsWith('.js')).path,'Live app uses released bundle');
 const button=name=>page.getByRole('button',{name,exact:true});
 const fixture=await fs.readFile(source+'/test/fixtures/e5-river-editor.json');
 await page.locator('input[type=file]').setInputFiles({name:'release-verification.json',mimeType:'application/json',buffer:fixture});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 await page.locator('polygon.hex[data-hex-key="0,0"]').dispatchEvent('click');
 if(await button('Редактировать').count())await button('Редактировать').click();
 await page.locator('[data-river-choice="1"]').click();
 await page.locator('[data-river-edge-choice]').first().click();
 async function snapshot(){await page.evaluate(()=>window.__exported=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();await button('JSON').click();await page.waitForFunction(()=>window.__exported!==null);return page.evaluate(()=>{const d=window.__exported;delete d.savedAt;return d;});}
 const before=await snapshot();assert.equal(before.version,7);
 const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')!==null)await menu.locator('summary').click();
 await page.locator('[data-river-command-editor]').scrollIntoViewIfNeeded();
 await page.screenshot({path:out+'/live-editor-1500.png'});
 await page.getByRole('combobox',{name:'Полноводность',exact:true}).selectOption('3');
 assert.ok(await page.locator('[data-river-confirm]').isDisabled());
 await page.locator('[data-river-crossing-choice]').selectOption('ferry');
 await page.setViewportSize({width:390,height:1100});await page.locator('[data-river-preview]').scrollIntoViewIfNeeded();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:out+'/live-confirm-390.png'});
 await page.locator('[data-river-confirm]').click();const after=await snapshot();
 assert.equal(after.map.crossings[0].kind,'ferry');assert.ok(after.map.rivers[0].sectors.every(s=>s.fullness===3));
 await button('Отменить').click();assert.deepEqual(await snapshot(),before);
 assert.deepEqual(result.page_errors,[]);
 Object.assign(result,{status:'pass',json_version:7,river_editor:true,ford_choice_required:true,explicit_ferry_commit:true,undo_exact:true,narrow_no_horizontal_overflow:true,permanent_test_cases_added:0});
}catch(e){result.status='error';result.error=String(e);process.exitCode=1;}
finally{result.completed_at=new Date().toISOString();await fs.writeFile(out+'/live-smoke.json',JSON.stringify(result,null,2)+'\n');await browser?.close();console.log(JSON.stringify(result));}
