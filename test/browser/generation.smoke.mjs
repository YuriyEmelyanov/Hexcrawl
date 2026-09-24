import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

// Run against the production build, not instrumented source.
const server = spawn(process.execPath, [fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  cwd: new URL('../../', import.meta.url), stdio: ['ignore', 'pipe', 'inherit']
});
let browser;
try {
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Preview did not start within 10 seconds: ${output}`)), 10000);
    server.stdout.on('data', data => {
      output += String(data);
      if (stripVTControlCharacters(output).includes('Local:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.on('error', reject);
    server.on('exit', code => reject(new Error(`Preview exited: ${code}`)));
  });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await page.route(/mc\.yandex/, route => route.abort());
  const errors = [];
  const diagnostic = [];
  page.on('console', msg => { if (msg.type() === 'error') diagnostic.push(msg.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__smokeEvents = [];
    for (const type of ['pointerdown', 'pointerup', 'click']) document.addEventListener(type, event => {
      const target = event.target;
      window.__smokeEvents.push({ type, tag: target.tagName, text: target.textContent?.slice(0, 60), download: target.download });
      window.__smokeEvents = window.__smokeEvents.slice(-20);
    }, true);
    let seed = 42;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await page.goto('http://127.0.0.1:4173/');
  assert.equal(await page.getByRole('region', { name: 'Генератор названий' }).count(), 0);
  const selectSize = () => page.locator('.gen-params select').nth(0).selectOption('locality');
  const selectCoast = mode => page.locator('.gen-params select').nth(3).selectOption(mode);
  // Chromium throttles rapid download bursts. Keep real exports below that
  // limit; each click must still produce a download and valid saved map.
  let lastDownloadAt = 0;
  async function snapshot() {
    const pause = 200 - (Date.now() - lastDownloadAt);
    if (pause > 0) await new Promise(resolve => setTimeout(resolve, pause));
    const menu = page.locator('details.export-menu');
    if (await menu.getAttribute('open') === null) await menu.locator('summary').click();
    let download;
    try {
      [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'JSON', exact: true }).click()
      ]);
    } catch (error) {
      console.error(JSON.stringify({ errors, diagnostic, events: await page.evaluate(() => window.__smokeEvents) }));
      throw error;
    }
    lastDownloadAt = Date.now();
    return JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  }
  let clicks = 0;
  let current;
  const completed = [];
  for (const mode of ['coast', 'auto', 'mainland']) {
    if (current) await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
    await selectSize();
    for (let i = 0; i < 6; i++) {
      // Coast may close an island completely. There is no candidate to click then.
      if (i > 0 && current.map.candidateHexes.length === 0) break;
      await selectCoast(i === 0 ? 'mainland' : mode);
      await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
      current = await snapshot();
      clicks++;
      assert.equal(current.map.regions.length, i + 1, `${mode}: click ${i + 1}`);
      assert.equal(current.map.toponyms.model, 'germanic');
      for (const region of current.map.regions) {
        const name = current.map.toponyms.names[`region:${region.id}`];
        assert.ok(name?.en && name?.ru, `missing region name ${region.id}`);
      }
      assert.equal(errors.length, 0, errors.join('\n'));
    }
    completed.push({ mode, regions: current.map.regions.length });
  }
  await page.locator('polygon.hex.region, polygon.hex.center').first().dispatchEvent('click');
  const regionName = current.map.toponyms.names['region:1'];
  assert.ok((await page.locator('.info-block--hex').allTextContents()).some(text => text.includes(regionName.ru)));
  assert.ok(!(await page.locator('svg text').allTextContents()).includes(regionName.ru));
  await page.getByRole('button', { name: 'Switch to English' }).click();
  assert.ok((await page.locator('.info-block--hex').allTextContents()).some(text => text.includes(regionName.en)));
  await page.getByRole('button', { name: 'Переключить на русский' }).click();
  assert.ok((await page.locator('.info-block--hex').allTextContents()).some(text => text.includes(regionName.ru)));
  const count = current.map.regions.length;
  await page.getByRole('button', { name: 'Перегенерировать регион', exact: true }).click();
  assert.equal((await snapshot()).map.regions.length, count);
  assert.equal((await snapshot()).map.toponyms.names['region:1'].en, regionName.en);
  await page.getByRole('button', { name: 'Удалить последний регион', exact: true }).click();
  assert.equal((await snapshot()).map.regions.length, count - 1);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Загрузить JSON', exact: true }).click()
  ]);
  await chooser.setFiles({
    name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(current))
  });
  // FileReader and React commit asynchronously after setInputFiles returns.
  // Wait for the imported map before clicking Export on a changing layout.
  await page.waitForFunction(expected => Array.from(document.querySelectorAll('.debug-panel-body p'))
    .some(element => element.textContent === `Регионов: ${expected}`), count);
  assert.equal((await snapshot()).map.regions.length, count);
  assert.equal((await snapshot()).map.toponyms.names['region:1'].ru, regionName.ru);
  await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
  assert.equal((await snapshot()).map.regions.length, count + 1);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ clicks: clicks + 1, completed, regeneration: true, undo: true, jsonReload: true, pageErrors: errors }));
} finally {
  await browser?.close();
  server.kill();
}
