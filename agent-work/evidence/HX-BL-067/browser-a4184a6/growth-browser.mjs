import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from '/tmp/src/node_modules/playwright/index.mjs';
const [dist,fixture,output] = process.argv.slice(2);
const seed=JSON.parse(await readFile(fixture,'utf8'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4313','--strictPort'],{cwd:dist});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('Local'))resolve()});server.once('exit',code=>reject(Error('preview '+code)))});
 browser=await chromium.launch({headless:true,executablePath:'/tmp/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1400,height:900}});
 page.setDefaultTimeout(15000);
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.goto('http://127.0.0.1:4313/');
 const lang=page.locator('.language-toggle');
 if((await lang.innerText()).trim()==='EN')await lang.click();
 const input=page.locator('input[type=file]');
 const lake=page.locator('polygon[data-hex-key="-3,3"]');
 const valid=page.locator('g[data-editor-only="candidate"] polygon[data-hex-key="-2,-3"]');
 const card=page.locator('.info-block--hex');
 const open=async doc=>{
  await input.setInputFiles({name:'map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(doc))});
  await lake.waitFor({state:'attached'});
 };
 const dump=async()=>{
  const menu=page.locator('details.export-menu');
  if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:'JSON',exact:true}).click();
  return JSON.parse(await readFile(await(await downloaded).path(),'utf8'));
 };
 const key=({q,r})=>q+','+r;
 const keys=xs=>new Set(xs.map(key));
 const diff=(a,b)=>[...a].filter(k=>!b.has(k));
 const display=()=>page.locator('g[data-editor-only="candidate"] polygon[data-hex-key]').evaluateAll(xs=>xs.map(x=>x.getAttribute('data-hex-key')).sort());
 const obs=[];
 let current=seed;
 for(let i=1;i<=2;i++){
  await open(current);
  await lake.dispatchEvent('click');
  await card.getByText(/Варгшё/).waitFor();
  const out=await dump(), shown=await display(), saved=keys(out.map.candidateHexes);
  assert.equal(out.map.regions.length,3);
  assert.equal((await lake.count()),1);
  assert(!shown.includes('-3,3'));
  assert.deepEqual(shown,[...keys(seed.map.candidateHexes)].sort());
  obs.push({cycle:i,regions:out.map.regions.length,lakeCard:await card.innerText(),shown:shown.length,saved:saved.size,addedVsOriginal:diff(saved,keys(seed.map.candidateHexes)),missingVsOriginal:diff(keys(seed.map.candidateHexes),saved),extraSavedVsVisible:diff(saved,new Set(shown))});
  current=out;
 }
 await card.screenshot({path:output+'/lake.png'});
 await valid.scrollIntoViewIfNeeded();
 await valid.dispatchEvent('click');
 await valid.waitFor({state:'detached'});
 const expanded=await dump();
 assert.equal(expanded.map.regions.length,4);
 await page.screenshot({path:output+'/expanded.png'});
 await open(expanded);
 await lake.dispatchEvent('click');
 await card.getByText(/Варгшё/).waitFor();
 const reopened=await dump();
 assert.equal(reopened.map.regions.length,4);
 const growth=keys(expanded.map.candidateHexes), after=keys(reopened.map.candidateHexes);
 await writeFile(output+'/result.json',JSON.stringify({source_sha:'a4184a601fd045f326d0dc81164d8dc0322f2456',fixture_regions:seed.map.regions.length,fixture_points:seed.map.candidateHexes.length,cycles:obs,expansion:{anchor:'-2,-3',regions:expanded.map.regions.length,regionsAfterReopen:reopened.map.regions.length,saved:growth.size,reopened:after.size,added:diff(after,growth),removed:diff(growth,after)}},null,2)+'\n');
}finally{await browser?.close();server.kill()}
