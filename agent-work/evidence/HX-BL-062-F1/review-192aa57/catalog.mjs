import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from '/tmp/hx03src/node_modules/playwright/index.mjs';
const fixture=JSON.parse(fs.readFileSync('/tmp/hx03ops/agent-work/evidence/HX-BL-062-F1/449e6fe/seed42.json'));
const server=spawn('python',['-m','http.server','4249','--bind','127.0.0.1','--directory','/tmp/hx03src/dist']);
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:'/tmp/chromium',args:['--no-sandbox']});
 for(const isKnave of [false,true]){
  const opts={};for(const [label,coord,central,newkind,expectText] of [['capital',[3,-2],'capital','portal','Портал'],['ordinary',[2,-1],'capital','farm','Ферма'],['empty',[1,0],'capital','farm','Ферма'],['village',[3,-2],'village','city','Город']]){
   const p=await browser.newPage({viewport:{width:1460,height:940}});p.setDefaultTimeout(5500);
   await p.route(/mc\.yandex/,r=>r.abort());await p.goto('http://127.0.0.1:4249');await p.getByRole('button',{name:'Переключить на русский',exact:true}).click();
   const d=structuredClone(fixture);d.ui.selectedHex={q:coord[0],r:coord[1]};d.map.regions[0].centralPoiKind=central;
   const info=p.locator('.info-block--hex');await p.locator('input[type=file]').setInputFiles({name:'input.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(d))});await info.getByText(/Освоенная местность|Освоенный регион|Освоенная территория/i).first().waitFor().catch(async()=>{await p.locator('polygon.hex[data-hex-key="3,-2"]').waitFor({state:'attached'})});
   if(isKnave)await p.getByRole('checkbox',{name:'Knave 2e',exact:true}).check();
   await p.getByRole('button',{name:'Редактировать',exact:true}).click();await info.getByRole('button',{name:'Редактировать точку интереса',exact:true}).click();
   const select=info.getByRole('combobox',{name:'Выберите точку интереса',exact:true});const values=await select.locator('option').evaluateAll(es=>es.map(e=>e.value));opts[label]=values;assert.equal(await select.inputValue(),{capital:'capital',empty:'',ordinary:'village',village:'village'}[label]);
   await select.selectOption(newkind);await info.getByText(new RegExp(expectText,'i')).first().waitFor();if(label==='capital')await info.screenshot({path:'/tmp/hx03-independent/'+(isKnave?'knave':'classic')+'-portal.png'});await p.close();
  }
  assert.deepEqual(opts.capital.filter(x=>x!=='capital'),opts.ordinary);assert.deepEqual(opts.empty,opts.ordinary);assert(opts.ordinary.includes('portal')&&opts.ordinary.includes('farm'));assert(!opts.empty.includes('capital'));assert(!opts.village.includes('portal')&&!opts.village.includes('')&&opts.village.includes('capital'));console.log(JSON.stringify({profile:isKnave?'Knave':'Classic',options:opts}));
 }
}finally{await browser?.close();server.kill()}
