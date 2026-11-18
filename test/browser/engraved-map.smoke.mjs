import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { chromium } from 'playwright';

const root = new URL('../../', import.meta.url);
const output = new URL('reports/', root);
const fixture = JSON.parse(await fs.readFile(new URL('test/fixtures/engraved-classic-map.json', root)));
const url = 'http://127.0.0.1:4187/';
const server = spawn(process.execPath, [
  fileURLToPath(new URL('node_modules/vite/bin/vite.js', root)),
  'preview', '--host', '127.0.0.1', '--port', '4187', '--strictPort',
], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Vite did not start')), 10000);
    server.stdout.on('data', data => {
      if (stripVTControlCharacters(String(data)).includes('Local:')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.on('error', reject);
    server.on('exit', code => reject(Error(`Vite exited: ${code}`)));
  });
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('dialog', async dialog => { failures.push(dialog.message()); await dialog.dismiss(); });
  page.on('response', response => {
    if (response.url().includes('/terrain/engravings/') && !response.ok()) failures.push(response.url());
  });
  await page.route(/mc\.yandex/, route => route.abort());
  await page.goto(url);
  const toRussian = page.getByRole('button', { name: 'Переключить на русский', exact: true });
  if (await toRussian.count()) await toRussian.click();
  const map = page.locator('.map-viewport .map-stage > svg[data-render-phase]');
  const button = name => page.getByRole('button', { name, exact: true });
  async function load(data) {
    await page.locator('input[type=file]').setInputFiles({
      name: 'classic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
    });
    await map.getByRole('img').first().waitFor({ state: 'attached' });
    await page.waitForFunction(() => document.querySelector('svg[data-render-phase]')?.dataset.renderPhase === 'ready'
      && !document.querySelector('.controls--transfer > button')?.disabled);
  }
  async function download(format) {
    const menu = page.locator('details.export-menu');
    if (await menu.getAttribute('open') === null) await menu.locator('summary').click();
    const [file] = await Promise.all([page.waitForEvent('download'), button(format).click()]);
    await menu.locator('summary').click();
    return fs.readFile(await file.path());
  }

  async function assertSizeField() {
    const field = page.locator('.fine-step');
    await field.scrollIntoViewIfNeeded();
    const layout = await field.evaluate(node => {
      const label = node.querySelector('span').getBoundingClientRect();
      const value = node.querySelector('select').getBoundingClientRect();
      return { gap:value.left-label.right, overlap:Math.min(label.bottom,value.bottom)-Math.max(label.top,value.top),
        fits:node.getBoundingClientRect().right <= window.innerWidth };
    });
    assert.ok(layout.gap >= 0 && layout.gap <= 12 && layout.overlap > 0 && layout.fits, JSON.stringify(layout));
  }
  await load(fixture);
  await assertSizeField();
  assert.equal(await map.getAttribute('data-biome-display'), 'engraved');
  assert.equal(await page.locator('.biome-display-toggle,.poi-display-toggle').count(), 0);
  assert.ok(await map.locator('image.terrain-blend').count());
  assert.equal(await map.locator('polygon[data-hex-key="-2,2"]').evaluate(node => getComputedStyle(node).fill), 'rgb(93, 145, 156)');
  assert.equal(await map.locator('[data-engraved-poi="-2,2"] circle').count(), 1);
  assert.ok(await map.locator('.river-polyline').count());
  assert.ok(await map.locator('.roads-layer line,.roads-layer polyline').count());
  assert.ok(await map.locator('[data-engraved-poi] circle').count());
  await page.evaluate(() => Promise.all([...new Set([...document.querySelectorAll('image.terrain-engraving')]
    .map(node => node.getAttribute('href')))].map(url => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = () => reject(Error(url));
      image.src = url;
    }))));
  await fs.mkdir(output, { recursive:true });
  await page.screenshot({ path:fileURLToPath(new URL('terrain-v2-hx060-classic-6-mile-desktop.png', output)) });
  const png = await download('PNG');
  assert.equal(png.subarray(1,4).toString(), 'PNG');
  await fs.writeFile(new URL('terrain-v2-hx060-classic-6-mile-export.png', output), png);

  const firstEngraving = map.locator('image.terrain-engraving:not([data-engraving="lake"]):not([data-engraving="sea"])').first();
  const selected = await firstEngraving.evaluate(node => ({
    key: node.parentElement.querySelector('[data-hex-key]').getAttribute('data-hex-key'),
    biome: node.dataset.engraving,
  }));
  const cell = map.locator(`polygon[data-hex-key="${selected.key}"]`);
  const cellArt = cell.locator('..').locator('image.terrain-engraving');
  await cell.dispatchEvent('click');
  const edit = button('Редактировать');
  if (await edit.count()) await edit.click();
  await button('Изменить биом гекса').click();
  const next = selected.biome === 'open_plains' ? 'semi_desert' : 'open_plains';
  await page.getByRole('combobox',{ name:'Изменить биом гекса', exact:true }).selectOption(next);
  assert.equal(await cellArt.getAttribute('data-engraving'), next);
  await button('Отменить').click();
  assert.equal(await cellArt.getAttribute('data-engraving'), selected.biome);
  await button('Повторить').click();
  assert.equal(await cellArt.getAttribute('data-engraving'), next);
  const saved = JSON.parse(await download('JSON'));
  assert.equal(saved.map.biomeOverrideByHexKey[selected.key], next);
  for (const layer of ['regions','rivers','roads','crossings','terrainByHexKey']) {
    assert.deepEqual(saved.map[layer], fixture.map[layer], layer);
  }
  await load(saved);
  assert.equal(await cellArt.getAttribute('data-engraving'), next);
  await page.setViewportSize({ width:320, height:844 });
  await assertSizeField();
  await page.setViewportSize({ width:390, height:844 });
  await assertSizeField();
  await page.screenshot({ path:fileURLToPath(new URL('terrain-v2-hx060-classic-6-mile-narrow.png', output)) });
  const fine = map.locator('[data-fine-world]');
  const scale = page.locator('[data-fine-step]');
  await page.setViewportSize({ width:1440, height:1000 });
  async function openFine() {
    await scale.selectOption('1');
    await page.waitForFunction(()=>document.querySelector('[data-fine-world],[data-fine-scene-error]'),null,{timeout:120000});
    return page.locator('[data-fine-scene-error]').count() ? page.locator('[data-fine-scene-error]').innerText() : null;
  }
  const rejected=await openFine();
  let fineBaseline=saved;
  let fineFixture='engraved-classic-map';
  if (rejected) {
    assert.match(rejected,/геометрия исходной карты несовместима/);
    assert.deepEqual((JSON.parse(await download('JSON'))).map,saved.map,'Rejected fine switch preserves source');
    console.log(`HX-BL-060 published Classic fixture refuses 1-mile: ${rejected}`);
    fineFixture='road-entry-zigzags';
    await load(JSON.parse(await fs.readFile(new URL('test/fixtures/road-entry-zigzags.json',root))));
    fineBaseline=JSON.parse(await download('JSON'));
    await page.screenshot({path:fileURLToPath(new URL('terrain-v2-hx060-road-entry-6-mile.png',output))});
    assert.equal(await openFine(),null,'Published road-entry world supports the 1-mile scale');
  }
  await fine.waitFor();
  const n=await fine.locator('[data-fine-key]').count();
  assert.ok(n>93);
  assert.ok(await fine.locator('image[data-engraving="lake"]').count());
  assert.ok(await fine.locator('image.terrain-blend').count());
  assert.ok(await fine.locator('.river-polyline').count());
  assert.ok(await fine.locator('[data-fine-outline]').count());
  assert.ok(await fine.locator('[data-engraved-poi] circle').count());
  const fineCell=fine.locator('[data-fine-key="0,6"]');
  const fineArt=fineCell.locator('image.terrain-engraving');
  const initial=await fineArt.getAttribute('data-engraving');
  assert.ok(initial && initial!=='mountains');
  await fineCell.dispatchEvent('click');
  const panel=page.locator('[data-fine-panel]');
  await panel.getByRole('button',{name:'Редактировать',exact:true}).click();
  const fineBiome='mountains';
  await panel.getByRole('combobox',{name:'Местность гекса'}).selectOption(fineBiome);
  await panel.getByRole('button',{name:'Сохранить',exact:true}).click();
  assert.equal(await fineArt.getAttribute('data-engraving'),fineBiome);
  await button('Отменить').click();
  assert.equal(await fineArt.getAttribute('data-engraving'),initial);
  await button('Повторить').click();
  assert.equal(await fineArt.getAttribute('data-engraving'),fineBiome);
  const fineSave=JSON.parse(await download('JSON'));
  for (const layer of ['regions','rivers','roads','crossings','terrainByHexKey']) {
    assert.deepEqual(fineSave.map[layer],fineBaseline.map[layer],layer);
  }
  assert.equal(fineSave.map.physicalGrid.fineCellEdits['0,6'].landBiomeId,fineBiome);
  await load(fineSave);
  await fine.waitFor({timeout:120000});
  assert.equal(await fineArt.getAttribute('data-engraving'),fineBiome);
  await page.screenshot({path:fileURLToPath(new URL('terrain-v2-hx060-classic-1-mile-desktop.png',output))});
  const finePng=await download('PNG');
  assert.equal(finePng.subarray(1,4).toString(),'PNG');
  await fs.writeFile(new URL('terrain-v2-hx060-classic-1-mile-export.png',output),finePng);
  await page.locator('.rotate-map-button').click();
  assert.match(await fineArt.getAttribute('transform'),/rotate\(-90/);
  const rotated=await download('PNG');
  assert.equal(rotated.subarray(1,4).toString(),'PNG');
  await fs.writeFile(new URL('terrain-v2-hx060-classic-1-mile-rotated.png',output),rotated);
  console.log(`HX-BL-060 Classic 1-mile · ${fineFixture} · ${n} cells · 0,6 ${initial} → ${fineBiome} · PNG ${finePng.length} bytes · undo/redo/JSON`);
  assert.deepEqual(failures, []);
  console.log(`HX-BL-060 Classic 6-mile · ${selected.key} ${selected.biome} → ${next} · PNG ${png.length} bytes · undo/redo/JSON`);
} finally {
  await browser?.close();
  server.kill();
}
