import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createGenerationHarness} from '../test/helpers/generation-harness.mjs';

const harness = createGenerationHarness(42);
const app = () => harness.render();
app().generateAt({q: 0, r: 0});
const region = app().regions[0];
app().setEditMode(true);
app().setSelectedHex(region.centerHex);
app().setSelectedCentralPoiKind('capital');
app().setSelectedHex({q: 0, r: 0});
app().setSelectedPoiKind('portal');
const map = app().createSaveData();
assert.equal(map.map.poiDiscovery['poi:1:3,-2'], 'passage');
assert.equal(map.map.regions[0].pointOfInterestKinds['0,0'], 'portal');

const out = 'reports/HX-BL-062';
await fs.mkdir(out, {recursive: true});
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4217', '--strictPort']);
let browser, page;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', data => { if (data.toString().includes('Local')) resolve(); });
    server.once('error', reject);
    server.once('exit', code => reject(Error('Preview exited with code ' + code)));
  });
  browser = await chromium.launch({headless: true});
  page = await browser.newPage({viewport: {width: 1500, height: 1000}, acceptDownloads: true});
  await page.route(/mc\.yandex/, route => route.abort());
  await page.goto('http://127.0.0.1:4217/');
  await page.getByRole('button', {name: 'Переключить на русский', exact: true}).click();
  const input = page.locator('input[type=file]');
  const panel = page.locator('.info-block--hex [data-knave-panel]');
  await input.setInputFiles({name: 'seed42.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(map))});
  await panel.waitFor();
  await page.getByRole('button', {name: 'Редактировать', exact: true}).click();
  await panel.getByRole('combobox', {name: 'Обнаружение', exact: true}).selectOption('interaction');
  await page.getByRole('button', {name: 'Готово', exact: true}).click();
  await panel.getByText(/Секретное место/).waitFor();
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({path: out + '/Classic-desktop.png'});
  const menu = page.locator('details.export-menu');
  if (await menu.getAttribute('open') === null) await menu.locator('summary').click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', {name: 'JSON', exact: true}).click();
  const file = out + '/seed42.json';
  await (await downloading).saveAs(file);
  assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).map.poiDiscovery['poi:1:0,0'], 'interaction');
  await page.reload();
  // App may restore the language preference after reload.
  if (await page.locator('.language-toggle').innerText() === 'EN') await page.locator('.language-toggle').click();
  await input.setInputFiles(file);
  await panel.getByText(/Секретное место/).waitFor();
  await page.getByRole('checkbox', {name: 'Knave 2e', exact: true}).check();
  await page.setViewportSize({width: 390, height: 844});
  await panel.scrollIntoViewIfNeeded();
  assert.match(await panel.innerText(), /Секретное место/);
  await page.locator('.info-block--hex').screenshot({path: out + '/Knave-mobile.png'});
  await page.setViewportSize({width:1500,height:1000});
  await page.locator('[data-fine-step]').selectOption('1');
  const cell=page.locator('[data-fine-key="0,0"]');
  await cell.press('Enter');
  const fine=page.locator('[data-fine-panel]');
  await fine.hover();
  await fine.getByRole('button',{name:'Редактировать'}).click();
  await fine.getByRole('checkbox',{name:'Место без типа'}).check();
  await fine.getByLabel('Обнаружение места без типа').selectOption('exploration');
  await fine.getByRole('button',{name:'Сохранить'}).click();
  await fine.getByText('Место без типа · При исследовании',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-local-place="0,0"]').count(),1);
  await fine.scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/Local-place-desktop.png'});
  if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
  const fineDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'JSON',exact:true}).click();
  const fineFile=out+'/local-place.json';
  await (await fineDownload).saveAs(fineFile);
  const fineMap=JSON.parse(await fs.readFile(fineFile,'utf8')).map;
  assert.equal(fineMap.physicalGrid.fineCellEdits['0,0'].localPlace,'exploration');
  assert.equal(fineMap.poiDiscovery['poi:1:0,0'],'interaction');
  await page.reload();
  await input.setInputFiles(fineFile);
  await page.locator('[data-fine-step]').selectOption('1');
  await cell.press('Enter');
  await fine.hover();
  if(await page.locator('.language-toggle').innerText()==='RU')await page.locator('.language-toggle').click();
  await page.setViewportSize({width:390,height:844});
  await fine.getByRole('button',{name:'Edit'}).click();
  assert.equal(await fine.getByLabel('Untyped place discovery').inputValue(),'exploration');
  await fine.screenshot({path:out+'/Local-place-editor-mobile.png'});
 } catch (error) {
  if (page) {
    console.error(await page.locator('.info-block--hex').allTextContents());
    await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
  }
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
process.exit(0);
