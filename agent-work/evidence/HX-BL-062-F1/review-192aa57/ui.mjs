import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from '/tmp/src/node_modules/playwright/index.mjs';
const out='/tmp/hx-d192';
const seed=JSON.parse(await fs.readFile('/tmp/hx03ops/agent-work/evidence/HX-BL-062-F1/449e6fe/seed42.json','utf8'));
const server=spawn('python',['-m','http.server','4286','--bind','127.0.0.1','--directory',out+'/dist'],{stdio:'ignore'});let browser;
try{
browser=await chromium.launch({headless:true,executablePath:'/tmp/chromium',args:['--no-sandbox']});
const page=await browser.newPage();page.setDefaultTimeout(9000);
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
await page.goto('http://127.0.0.1:4286');
const label=(p,n)=>p.getByRole('button',{name:n,exact:true}),info=page.locator('.info-block--hex'),panel=info.locator('[data-knave-panel]');
const input=page.locator('input[type=file]'),file=data=>({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
for(const ru of [false,true])for(const width of [1400,390])for(const knave of [false,true]){
 await page.setViewportSize({width,height:width===390?844:950});
 const lang=page.locator('.language-toggle');
 if((await lang.innerText()).trim()===(ru?'EN':'RU'))await lang.click();
 const texts=ru?['При прохождении','При исследовании','Секретное место']:['On passage','By exploration','Secret place'];
 await input.setInputFiles(file(seed));await panel.getByText(new RegExp(texts[2])).waitFor();const profile=page.getByRole('checkbox',{name:'Knave 2e',exact:true});await profile.setChecked(knave);
 await panel.getByText(new RegExp(texts[2])).waitFor();assert.doesNotMatch(await panel.innerText(),/\bClue\b|Улика/i);
 const visible=async loc=>{await loc.scrollIntoViewIfNeeded();const box=await loc.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width+1,JSON.stringify(box));};
 await visible(panel.locator('label').filter({hasText:texts[2]}));await panel.screenshot({path:out+'/'+[ru?'ru':'en',width,knave?'knave':'classic','card.png'].join('-')});
 await label(info,ru?'Редактировать':'Edit').click();const select=panel.getByRole('combobox',{name:ru?'Обнаружение':'Discovery',exact:true});
 assert.deepEqual(await select.locator('option').allTextContents(),texts);assert.equal(await select.inputValue(),'interaction');assert.doesNotMatch(await panel.innerText(),/\bClue\b|Улика/i);await visible(select);await panel.screenshot({path:out+'/'+[ru?'ru':'en',width,knave?'knave':'classic','editor.png'].join('-')});await label(info,ru?'Готово':'Done').click();console.log('card+editor',ru?'RU':'EN',width,knave?'Knave':'Classic','visible; 3 localized options');
}
const fine=page.locator('[data-fine-panel]'),lang=page.locator('.language-toggle');
if((await lang.innerText()).trim()==='RU')await lang.click();
await page.setViewportSize({width:1400,height:950});await input.setInputFiles(file(seed));await panel.getByText(/Secret place/).waitFor();
const step=page.locator('[data-fine-step]'),cell=page.locator('[data-fine-key="0,0"]'),fineEditor=async()=>{await cell.press('Enter');await fine.hover();await label(fine,'Edit').click();};
await step.selectOption('1');await fineEditor();const projected=fine.locator('select').filter({has:page.locator('option[value="interaction"]')}).first();assert.equal(await projected.inputValue(),'interaction');
await fine.getByRole('checkbox',{name:'Untyped place',exact:true}).check();const local=fine.getByLabel('Untyped place discovery');
let hash=(42^0x811c9dc5)>>>0;for(const c of 'fine:0,0')hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
const r=hash%100;assert.equal(await local.inputValue(),r<35?'passage':r<90?'exploration':'interaction');await local.selectOption('exploration');await label(fine,'Save').click();
await fine.getByText('Untyped place · By exploration',{exact:true}).waitFor();
const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
const dl=page.waitForEvent('download');await label(page,'JSON').click();await(await dl).saveAs(out+'/fine.json');const saved=JSON.parse(await fs.readFile(out+'/fine.json','utf8'));assert.equal(saved.map.physicalGrid.fineCellEdits['0,0'].localPlace,'exploration');assert.equal(saved.map.poiDiscovery['poi:1:0,0'],'interaction');
await page.reload();await input.setInputFiles(file(saved));await step.selectOption('1');await fineEditor();assert.equal(await projected.inputValue(),'interaction');assert.equal(await local.inputValue(),'exploration');await label(fine,'Cancel').click();await step.selectOption('6');await step.selectOption('1');await fineEditor();assert.equal(await projected.inputValue(),'interaction');assert.equal(await local.inputValue(),'exploration');
console.log('AC2 browser standalone initial default',r,'and independent portal projection survive scale roundtrip and actual JSON export/import');
}finally{await browser?.close();server.kill();}
