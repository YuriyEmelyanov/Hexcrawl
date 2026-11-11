import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {regionFixture} from '../helpers/region-fixture.mjs';
import {createGenerationState} from '../../src/worldRandom.ts';
import {newKnaveLayer} from '../../src/knaveClassic.ts';
import {knaveContentFixture} from '../helpers/knave-fixture.mjs';

// One new TABLES1 DOM lifecycle, with the existing tiny fixture/export harness.
export async function runPreparationLifecycle({page,snapshot,root}){
 const out=new URL('reports/HX-BL-041/TABLES1/',root);await fs.mkdir(out,{recursive:true});
 await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
 const data=regionFixture();data.version=10;data.generation=createGenerationState(42);data.map.seas=[];data.map.nextSeaId=1;data.map.editorNames={};data.map.knave=newKnaveLayer();
 const owner='poi:1:2,0';data.map.regions[0].pointOfInterestKinds['2,0']='ruins';data.map.knave.content=knaveContentFixture(owner);
 await page.locator('input[type=file]').setInputFiles({name:'tables1-v10.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 const panel=page.locator('[data-preparation]');await panel.waitFor();const before=await snapshot();
 const dialog=page.getByRole('dialog',{name:'Подсказка места',exact:true});
 await panel.getByRole('button',{name:'Добавить подсказку',exact:true}).click();
 await dialog.getByRole('spinbutton',{name:'Номер строки',exact:true}).fill('0');await dialog.getByRole('button',{name:'Применить',exact:true}).click();assert.match(await dialog.getByRole('alert').innerText(),/1.*100/);
 await dialog.getByRole('button',{name:'Отмена',exact:true}).click();assert.deepEqual(await snapshot(),before,'invalid selection/cancel do not migrate or draw');
 async function add(table,row){await panel.getByRole('button',{name:'Добавить подсказку',exact:true}).click();await dialog.getByRole('combobox',{name:'Таблица',exact:true}).selectOption(table);await dialog.getByRole('spinbutton',{name:'Номер строки',exact:true}).fill(String(row));await dialog.getByRole('button',{name:'Применить',exact:true}).click();await dialog.waitFor({state:'hidden'});}
 await add('structures',27);let saved=await snapshot();assert.equal(saved.version,12);assert.deepEqual(saved.generation,before.generation);assert.deepEqual(saved.map.regions,before.map.regions);
 const rootCall=saved.map.knave.content.byPoi[owner].calls.at(-1);assert.equal(rootCall.selection,'manual');assert.equal(rootCall.rollValue,undefined);
 await add('structures',27);await add('locations',100);saved=await snapshot();let calls=saved.map.knave.content.byPoi[owner].calls;
 assert.equal(calls.filter(c=>c.table==='structures'&&c.sourceRow===27).length,2);assert.equal(new Set(calls.map(c=>c.id)).size,calls.length);assert.equal(calls.at(-1).printedResult,'00');
 const rootRow=panel.locator(`[data-preparation-call="${rootCall.id}"]`);await rootRow.locator('summary').click();await rootRow.getByRole('button',{name:'Добавить по ссылке',exact:true}).click();
 await dialog.getByRole('spinbutton',{name:'Номер строки',exact:true}).fill('84');await dialog.getByRole('button',{name:'Применить',exact:true}).click();await dialog.waitFor({state:'hidden'});
 saved=await snapshot();const child=saved.map.knave.content.byPoi[owner].calls.find(c=>c.parentId===rootCall.id);assert.ok(child);assert.equal(child.table,'dungeons');assert.equal(child.sourceRow,84);
 const childRow=panel.locator(`[data-preparation-call="${child.id}"]`);await childRow.locator('summary').click();await childRow.getByRole('button',{name:'Взять следующую строку',exact:true}).click();
 saved=await snapshot();calls=saved.map.knave.content.byPoi[owner].calls;assert.equal(calls.find(c=>c.id===child.id).nextEntry.sourceRow,85);assert.equal(calls.find(c=>c.id===child.id).sourceRow,84);
 await panel.getByRole('button',{name:'Описание места',exact:true}).click();const description=page.getByRole('dialog',{name:'Описание места',exact:true});
 const text='<Заброшенная башня> — дверь под мельницей.\nНе исполнять HTML; это текст мастера.';
 await description.getByRole('textbox',{name:'Описание места',exact:true}).fill(text);await description.getByRole('button',{name:'Применить',exact:true}).click();await description.waitFor({state:'hidden'});
 const accepted=await snapshot();assert.equal(accepted.map.knave.content.byPoi[owner].description,text);assert.equal(await panel.locator('script').count(),0);
 assert.equal(await panel.locator('[data-preparation-call]').count(),accepted.map.knave.content.byPoi[owner].calls.length);
 const metrics=[];for(const width of [1500,390,320]){await page.setViewportSize({width,height:1100});await panel.scrollIntoViewIfNeeded();const size=await panel.evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth}));assert.ok(size.scroll<=size.width+1,JSON.stringify({width,...size}));metrics.push({width,...size});await panel.screenshot({path:fileURLToPath(new URL(`actual-${width}.png`,out))});}
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.equal((await snapshot()).map.knave.content.byPoi[owner].description,'');await page.getByRole('button',{name:'Повторить',exact:true}).click();assert.deepEqual(await snapshot(),accepted);
 await page.locator('input[type=file]').setInputFiles({name:'tables1-v12.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(accepted))});await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);assert.deepEqual(await snapshot(),accepted);
 // Native modal traps focus; Escape closes an unchanged draft and restores focus.
 await panel.getByRole('button',{name:'Описание места',exact:true}).click();await page.keyboard.press('Escape');await description.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>document.activeElement?.closest('[data-preparation]')!==null),true);assert.deepEqual(await snapshot(),accepted);
 // Search printed00, preview and Cancel do not allocate an accepted call.
 await panel.getByRole('button',{name:'Добавить подсказку',exact:true}).click();await dialog.getByRole('textbox',{name:'Поиск строк',exact:true}).fill('00');assert.ok(await dialog.locator('option[value="100"]').count());await dialog.getByRole('button',{name:'100 (00)',exact:true}).click();assert.equal(await dialog.getByRole('spinbutton',{name:'Номер строки',exact:true}).inputValue(),'100');await dialog.screenshot({path:fileURLToPath(new URL('selector-320.png',out))});await dialog.getByRole('button',{name:'Отмена',exact:true}).click();assert.deepEqual(await snapshot(),accepted);
 // Root deletion is cancellable when a linked child/annotation would be lost.
 await rootRow.locator('summary').click();page.once('dialog',d=>d.dismiss());await rootRow.getByRole('button',{name:'Удалить',exact:true}).click();assert.deepEqual(await snapshot(),accepted);
 await rootRow.locator('summary').evaluate(e=>e.parentElement.open=true);page.once('dialog',d=>d.accept());await rootRow.getByRole('button',{name:'Удалить',exact:true}).click();const deleted=await snapshot();assert.ok(!deleted.map.knave.content.byPoi[owner].calls.some(c=>c.id===rootCall.id||c.id===child.id));assert.equal(deleted.map.knave.content.byPoi[owner].description,text);
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await snapshot(),accepted);
 await page.emulateMedia({reducedMotion:'reduce'});const last=panel.locator('[data-preparation-call]').last();await last.locator('.tag-die,.tag-pick').click();await page.waitForTimeout(360);const rolled=await snapshot();assert.deepEqual(rolled.generation,accepted.generation);assert.deepEqual(rolled.map.regions,accepted.map.regions);assert.equal(rolled.map.knave.content.byPoi[owner].description,text);assert.equal(await last.locator('svg').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await snapshot(),accepted);
 const allDie=panel.locator('[data-preparation-call]').first().locator('.tag-die,.tag-pick');await allDie.click({button:'right'});page.once('dialog',d=>d.accept());await panel.getByRole('menuitem',{name:'Перебросить все подсказки',exact:true}).click();await page.waitForTimeout(360);const all=await snapshot();assert.deepEqual(all.generation,accepted.generation);assert.equal(all.map.knave.content.byPoi[owner].description,text);assert.ok(!all.map.knave.content.byPoi[owner].calls.some(c=>c.parentId));
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await snapshot(),accepted,'reroll all roots is one transaction');
 await fs.writeFile(new URL('metrics.json',out),JSON.stringify({source_sha:process.env.GITHUB_SHA??null,metrics,accepted},null,2));console.log('TABLES1 UI: manual/00/invalid/cancel/duplicates/link/next-entry/description/history/roundtrip/keyboard/reduced-motion/1500/390/320 passed');
}
