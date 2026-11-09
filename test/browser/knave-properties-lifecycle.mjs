import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {regionFixture} from '../helpers/region-fixture.mjs';
import {createGenerationState} from '../../src/worldRandom.ts';
import {newKnaveLayer} from '../../src/knaveClassic.ts';
import {knaveContentFixture} from '../helpers/knave-fixture.mjs';

// One DOM lifecycle scenario, extending the existing tags workflow. The Node
// import case checks transaction data; this checks native controls and gates.
export async function runKnavePropertiesLifecycle({page,snapshot,root}) {
 const out=new URL('reports/HX-BL-041/KNAVE2-CLASSIC1/',root);await fs.mkdir(out,{recursive:true});
 await page.reload();await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
 const checkbox=page.getByRole('checkbox',{name:'Knave 2e',exact:true});
 const empty=await snapshot();await checkbox.check();const chosen=await snapshot();
 assert.deepEqual(chosen.generation,empty.generation);assert.ok(chosen.map.knave);
 await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('mythic');assert.equal(await checkbox.count(),0);
 await page.getByRole('combobox',{name:'Режим',exact:true}).selectOption('classic');assert.equal(await checkbox.isChecked(),false);
 // The shared fixture is v7. Upgrade its complete required v9/v10 envelope,
 // including empty sea identities, before asking the real importer to load it.
 const data=regionFixture();data.version=10;data.generation=createGenerationState(42);data.map.seas=[];data.map.nextSeaId=1;data.map.editorNames={};data.map.knave=newKnaveLayer();
 data.map.regions[0].pointOfInterestKinds['2,0']='ruins';data.map.knave.content=knaveContentFixture('poi:1:2,0');
 await page.locator('input[type=file]').setInputFiles({name:'knave-v10.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
 await page.waitForFunction(()=>document.querySelector('input[aria-label="Knave 2e"]')?.checked&&document.querySelector('input[aria-label="Knave 2e"]')?.disabled);
 assert.equal(await checkbox.isChecked(),true);assert.equal(await checkbox.isDisabled(),true);
 const lockHint=page.getByLabel('Почему профиль заблокирован',{exact:true});await lockHint.click();assert.match(await page.locator('.knave-profile-help').innerText(),/начните новую карту/);await lockHint.click();
 const info=page.locator('.info-block--hex'),panel=info.locator('[data-knave-panel]');
 assert.match(await panel.innerText(),/При прохождении/);
 assert.equal(await panel.locator('.knave-result').count(),2);await panel.locator('.knave-result').first().locator('summary').click();assert.match(await panel.innerText(),/совместимый пул/);
 // UI2 reuses the MB result line, with honest filtered selection and a real
 // d100 trait. These DOM checks protect visible order and accepted commands.
 const primary=panel.locator('[data-knave-part="primary"]'),trait=panel.locator('[data-knave-part="trait"]'),traitDie=trait.locator('.tag-die'),pick=primary.locator('.tag-pick');
 assert.equal(await primary.locator('.tag-die').count(),0,'filtered source row is not presented as original d100');assert.equal(await pick.count(),1);assert.match(await pick.getAttribute('aria-label'),/совместимый выбор/i);
 for(const row of [primary,trait])assert.equal(await row.evaluate(el=>{const label=el.querySelector('.tag-label'),action=el.querySelector('.tag-die,.tag-pick'),result=el.querySelector('.tag-result');return !!label?.textContent?.trim()&&!!(label.compareDocumentPosition(action)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(label.compareDocumentPosition(result)&Node.DOCUMENT_POSITION_FOLLOWING);}),true,'purpose before action and result');
 const initialRoll=await snapshot(),key='poi:1:2,0',initialCounter=initialRoll.map.knave.content.rollCounters[key];
 assert.equal(Number(await traitDie.locator('svg text').textContent()),initialRoll.map.knave.content.byPoi[key].trait.roll);
 // UI2-FOCUS-001: Escape restores the invoking die; ordinary blur keeps the
 // newly chosen control. Neither dismissal spends a draw or traps the keyboard.
 await traitDie.focus();await page.keyboard.press('Shift+F10');await trait.getByRole('menuitem').waitFor({state:'visible'});await pick.focus();assert.equal(await trait.getByRole('menuitem').count(),0);assert.equal(await pick.evaluate(el=>document.activeElement===el),true,'outside blur keeps intended focus');
 await traitDie.focus();await page.keyboard.press('Shift+F10');await trait.getByRole('menuitem').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await trait.getByRole('menuitem').count(),0);assert.equal(await traitDie.evaluate(el=>document.activeElement===el),true,'Escape restores invoking die');
 await page.keyboard.press('Space');const rerolled=await snapshot();
 assert.deepEqual(rerolled.map.knave.content.byPoi[key].site,initialRoll.map.knave.content.byPoi[key].site);assert.equal(rerolled.map.knave.content.rollCounters[key].trait,initialCounter.trait+1);assert.equal(rerolled.map.knave.content.rollCounters[key].primary,initialCounter.primary);assert.deepEqual(rerolled.generation,initialRoll.generation);
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await snapshot(),initialRoll);await page.getByRole('button',{name:'Повторить',exact:true}).click();assert.deepEqual(await snapshot(),rerolled);
 await page.waitForTimeout(350);await traitDie.focus();await page.keyboard.press('Shift+F10');await page.getByRole('menuitem',{name:'Перебросить оба',exact:true}).click();const pair=await snapshot();assert.equal(pair.map.knave.content.rollCounters[key].primary,initialCounter.primary+1);assert.equal(pair.map.knave.content.rollCounters[key].trait,initialCounter.trait+2);assert.equal(pair.map.knave.content.rollCounters[key].category,initialCounter.category);
 await page.getByRole('button',{name:'Отменить',exact:true}).click();assert.deepEqual(await snapshot(),rerolled,'both actions share one Undo');await page.getByRole('button',{name:'Повторить',exact:true}).click();assert.deepEqual(await snapshot(),pair);
 await page.locator('.language-toggle').click();assert.equal(await page.locator('.language-toggle').innerText(),'EN');assert.match(await trait.locator('.tag-label').innerText(),/Place trait/);assert.match(await trait.innerText(),/RU/);assert.deepEqual(await snapshot(),pair,'language switch does not reroll');await page.locator('.language-toggle').click();assert.equal(await page.locator('.language-toggle').innerText(),'RU');assert.match(await trait.locator('.tag-label').innerText(),/Особенность места/);
 const before=await snapshot();await page.getByRole('button',{name:'Редактировать',exact:true}).click();
 const discovery=panel.getByRole('combobox',{name:'Обнаружение',exact:true});
 await discovery.focus();await discovery.selectOption('interaction');assert.equal(await traitDie.isDisabled(),true,'dirty Knave draft blocks reroll');assert.equal(await pick.isDisabled(),true);await page.getByRole('button',{name:'Готово',exact:true}).click();
 assert.match(await panel.getByRole('alert').innerText(),/улика/);assert.deepEqual(await snapshot(),before,'export excludes invalid draft');
 await page.locator('polygon.hex[data-hex-key="1,0"]').dispatchEvent('click');
 const dialog=page.getByRole('alertdialog');await dialog.getByRole('button',{name:'Остаться',exact:true}).click();
 await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Обнаружение');
 assert.equal(await discovery.inputValue(),'interaction');assert.equal(await discovery.evaluate(el=>document.activeElement===el),true,'Stay restores focus to the Knave editor');
 await panel.getByRole('textbox',{name:'Улика',exact:true}).fill('<Следы обрываются у скалы>');
 await panel.getByRole('combobox',{name:'Проходимость',exact:true}).selectOption('difficult');
 const metrics=[];
 for(const width of [1500,390,320]){
   await page.setViewportSize({width,height:1100});await panel.scrollIntoViewIfNeeded();
   const size=await info.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));assert.ok(size.scroll<=size.client+1,JSON.stringify({width,...size}));
   // KNC-REV-001: actual, nonoverlapping hit targets, not just legible text.
   const targets=panel.locator('.knave-result summary, .tag-die, .tag-pick, .knave-cancel');
   const hitAreas=[];
   for(const target of await targets.all()){
     await target.scrollIntoViewIfNeeded();
     const hit=await target.evaluate(el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height,points:[[b.left+2,b.top+2],[b.right-2,b.bottom-2]].every(([x,y])=>{const hit=document.elementFromPoint(x,y);return hit===el||el.contains(hit);})};});
     assert.ok(hit.width>=44&&hit.height>=44&&hit.points,JSON.stringify({width,...hit}));hitAreas.push(hit);
   }
   const summaries=panel.locator('.knave-result summary');
   const summary=summaries.first();
   const isOpen=()=>summary.evaluate(el=>el.parentElement.open);
   const open=await isOpen();await summary.click({position:{x:4,y:40}});assert.equal(await isOpen(),!open,'lower target activates disclosure');
   await summary.focus();await page.keyboard.press('Enter');assert.equal(await isOpen(),open);
   await page.keyboard.press('Space');assert.equal(await isOpen(),!open);
   await page.keyboard.press('Space');assert.equal(await isOpen(),open);
   const boxes=await summaries.evaluateAll(els=>els.map(e=>{const b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom};}));
   for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].top>=boxes[i-1].bottom,'source targets do not overlap');
   metrics.push({width,...size,hitAreas});await info.screenshot({path:fileURLToPath(new URL(`draft-${width}.png`,out))});
 }
 const cancel=panel.getByRole('button',{name:'Отмена',exact:true});await cancel.click({position:{x:4,y:40}});
 assert.deepEqual(await snapshot(),before,'Cancel lower hit target discards draft without document changes');
 await discovery.selectOption('interaction');await panel.getByRole('textbox',{name:'Улика',exact:true}).fill('<Следы обрываются у скалы>');
 await panel.getByRole('combobox',{name:'Проходимость',exact:true}).selectOption('difficult');
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
 console.log('KNAVE2-CLASSIC1 + ROLLUI2 browser properties: profile choice/lock, secret validation, accepted-only export, save/discard/Escape, UndoRedo, escaped clue, 1500/390/320, roundtrip passed');
}
