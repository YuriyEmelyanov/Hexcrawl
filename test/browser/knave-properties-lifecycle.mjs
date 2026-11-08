import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {regionFixture} from '../helpers/region-fixture.mjs';
import {createGenerationState} from '../../src/worldRandom.ts';
import {newKnaveLayer} from '../../src/knaveClassic.ts';

// One DOM lifecycle scenario, extending the existing tags workflow. The Node
// import case checks transaction data; this checks native controls and gates.
export async function runKnavePropertiesLifecycle({page,snapshot,root}) {
 const out=new URL('reports/KNAVE2-CLASSIC1/',root);await fs.mkdir(out,{recursive:true});
 await page.reload();await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
 const checkbox=page.getByRole('checkbox',{name:'Knave 2e',exact:true});
 const empty=await snapshot();await checkbox.check();const chosen=await snapshot();
 assert.deepEqual(chosen.generation,empty.generation);assert.ok(chosen.map.knave);
 await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('mythic');assert.equal(await checkbox.count(),0);
 await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('classic');assert.equal(await checkbox.isChecked(),false);
 const data=regionFixture();data.version=10;data.generation=createGenerationState(42);data.map.knave=newKnaveLayer();
 await page.locator('input[type=file]').setInputFiles({name:'knave-v10.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
 assert.equal(await checkbox.isChecked(),true);assert.equal(await checkbox.isDisabled(),true);
 const info=page.locator('.info-block--hex'),panel=info.locator('[data-knave-panel]');
 assert.match(await panel.innerText(),/При прохождении/);
 const before=await snapshot();await page.getByRole('button',{name:'Редактировать',exact:true}).click();
 const discovery=panel.getByRole('combobox',{name:'Обнаружение',exact:true});
 await discovery.selectOption('interaction');await page.getByRole('button',{name:'Готово',exact:true}).click();
 assert.match(await panel.getByRole('alert').innerText(),/улика/);assert.deepEqual(await snapshot(),before,'export excludes invalid draft');
 await page.locator('polygon.hex[data-hex-key="1,0"]').dispatchEvent('click');
 const dialog=page.getByRole('alertdialog');await dialog.getByRole('button',{name:'Остаться',exact:true}).click();
 assert.equal(await discovery.inputValue(),'interaction');
 await panel.getByRole('textbox',{name:'Улика',exact:true}).fill('<Следы обрываются у скалы>');
 await panel.getByRole('combobox',{name:'Проходимость',exact:true}).selectOption('difficult');
 const metrics=[];
 for(const width of [1500,390,320]){
   await page.setViewportSize({width,height:1100});await panel.scrollIntoViewIfNeeded();
   const size=await info.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));assert.ok(size.scroll<=size.client+1,JSON.stringify({width,...size}));
   metrics.push({width,...size});await info.screenshot({path:fileURLToPath(new URL(`draft-${width}.png`,out))});
 }
 await page.getByRole('button',{name:'Готово',exact:true}).click();const accepted=await snapshot();
 assert.deepEqual(accepted.map.knave.discoveryByPoi['poi:1:2,0'],{mode:'interaction',clueText:'<Следы обрываются у скалы>'});
 assert.equal(accepted.map.knave.difficultyByHex['2,0'],'difficult');assert.deepEqual(accepted.generation,before.generation);
 assert.match(await panel.innerText(),/<Следы обрываются у скалы>/);assert.equal(await panel.locator('script').count(),0);
 await info.screenshot({path:fileURLToPath(new URL('accepted-320.png',out))});
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await snapshot(),before);
 await page.getByRole('button',{name:'Повторить',exact:true}).click();assert.deepEqual(await snapshot(),accepted);
 await page.getByRole('button',{name:'Редактировать',exact:true}).click();
 await panel.getByRole('textbox',{name:'Улика',exact:true}).fill('Отбросить эту улику');await page.keyboard.press('Escape');
 assert.deepEqual(await snapshot(),accepted);assert.equal(await panel.getByRole('textbox',{name:'Улика',exact:true}).inputValue(),'<Следы обрываются у скалы>');
 await discovery.selectOption('passage');await page.locator('polygon.hex[data-hex-key="1,0"]').dispatchEvent('click');
 await dialog.getByRole('button',{name:'Отбросить',exact:true}).click();await page.waitForTimeout(30);
 assert.deepEqual((await snapshot()).map,accepted.map);assert.equal(await panel.getByRole('combobox',{name:'Обнаружение',exact:true}).count(),0);
 await page.locator('input[type=file]').setInputFiles({name:'knave-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(accepted))});
 await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);assert.deepEqual(await snapshot(),accepted);
 await fs.writeFile(new URL('metrics.json',out),JSON.stringify(metrics,null,2));
 console.log('KNAVE2-CLASSIC1 browser properties: profile choice/lock, secret validation, accepted-only export, save/discard/Escape, UndoRedo, escaped clue, 1500/390/320, roundtrip passed');
}
