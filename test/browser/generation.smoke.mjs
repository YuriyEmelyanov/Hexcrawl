import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { createGenerationHarness } from '../helpers/generation-harness.mjs';
import { validateRiverNetwork } from '../../src/riverModel/core.ts';
const geometry = createGenerationHarness().geometry;
function assertRiverTermini(save) {
  const m = save.map;
  const built = geometry.buildRegionRiverNetwork(m.rivers, [], m.regions, m.candidateHexes, new Map(Object.entries(m.terrainByHexKey)), true);
  assert.deepEqual(Array.from(built.issues), []);
  const checked = validateRiverNetwork(built.network);
  assert.equal(checked.valid, true, JSON.stringify(checked.issues));
}

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
  const verboseLogs = [];
  page.on('console', msg => { if (msg.type() === 'log') verboseLogs.push(msg.text()); });
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
  const stable = data => ({ map: data.map, counters: data.counters, ui: data.ui });
  async function addRegion() {
    const before = await page.locator('details.export-menu').count() ? await snapshot() : null;
    const candidates = page.locator('polygon.hex.candidate');
    const attempts = await candidates.count();
    for (let index = 0; index < attempts; index++) {
      await candidates.nth(index).dispatchEvent('click');
      const after = await snapshot();
      assert.equal(errors.length, 0, errors.join('\n'));
      if (after.map.regions.length === (before?.map.regions.length ?? 0) + 1) {
        assert.equal(await page.getByRole('alert').count(), 0);
        assertRiverTermini(after);
        return after;
      }
      assert.ok(before, 'the initial region must be generated');
      assert.match(await page.getByRole('alert').innerText(), /Не удалось разместить корректные истоки и устья рек/);
      assert.deepEqual(stable(after), stable(before), 'constraint rejection must preserve the map and counters');
    }
    assert.fail(`No region could be added at any of ${attempts} candidate hexes`);
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
      current = await addRegion();
      clicks++;
      assert.equal(current.map.regions.length, i + 1, `${mode}: click ${i + 1}`);
      assertRiverTermini(current);
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
  assert.equal((await addRegion()).map.regions.length, count + 1);
  assert.equal(errors.length, 0, errors.join('\n'));
  // Inject once into the real production callback, after size selection.
  // Restore Math.random before throwing so the next action can proceed normally.
  const injectFailure = () => page.evaluate(() => {
    const original = Math.random;
    let calls = 0;
    Math.random = () => {
      if (++calls === 3) {
        Math.random = original;
        throw new Error('injected browser generation failure');
      }
      return original();
    };
  });
  const beforeFailure = await snapshot();
  await injectFailure();
  await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
  await page.getByRole('alert').waitFor();
  assert.deepEqual(stable(await snapshot()), stable(beforeFailure));
  await addRegion();
  assert.equal(await page.getByRole('alert').count(), 0);
  const beforeRegenFailure = await snapshot();
  await injectFailure();
  await page.getByRole('button', { name: 'Перегенерировать регион', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.deepEqual(stable(await snapshot()), stable(beforeRegenFailure));
  await page.getByRole('button', { name: 'Удалить последний регион', exact: true }).click();
  assert.deepEqual((await snapshot()).map, beforeFailure.map);
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.deepEqual(verboseLogs, [], 'ordinary mode must not emit debug console.log');
  // Regression: a sea-blocked pocket must generate atomically in the real UI.
  const pocket = JSON.parse(await fs.readFile(new URL('../fixtures/sea-pocket-map.json', import.meta.url), 'utf8'));
  const [pocketChooser] = await Promise.all([
    page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Загрузить JSON', exact: true }).click()
  ]);
  await pocketChooser.setFiles({ name: 'sea-pocket.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(pocket)) });
  await page.waitForFunction(expected => Array.from(document.querySelectorAll('.debug-panel-body p'))
    .some(element => element.textContent === `Регионов: ${expected}`), pocket.map.regions.length);
  await page.locator('.gen-params select').nth(0).selectOption('auto');
  await selectCoast('mainland');
  const pocketBefore = await snapshot();
  await page.evaluate(() => {
    let seed = 1;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await page.locator('polygon.hex.candidate[data-hex-key="3,-3"]').dispatchEvent('click', {}, { timeout: 120000 });
  const pocketAfter = await snapshot();
  assert.equal(pocketAfter.map.regions.length, pocketBefore.map.regions.length + 1);
  assert.deepEqual(pocketAfter.map.regions.slice(0, -1), pocketBefore.map.regions);
  assert.equal(await page.getByRole('alert').count(), 0);
  await page.getByRole('button', { name: 'Удалить последний регион', exact: true }).click();
  assert.deepEqual((await snapshot()).map, pocketBefore.map);
  assert.equal(errors.length, 0, errors.join('\n'));
  // Detailed logs and the existing profiler can be enabled independently.
  for (const query of ['?generationDebug=1', '?profile=1']) {
    const probe = await browser.newPage();
    await probe.route(/mc\.yandex/, route => route.abort());
    const logs = [];
    probe.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    await probe.goto(`http://127.0.0.1:4173/${query}`);
    await probe.locator('.gen-params select').nth(0).selectOption('locality');
    await probe.locator('.gen-params select').nth(3).selectOption('mainland');
    await probe.locator('polygon.hex.candidate').first().dispatchEvent('click');
    if (query.includes('profile')) {
      await probe.waitForTimeout(100);
      assert.ok(logs.some(log => log.text.includes('[PROFILE]')));
      assert.ok(logs.some(log => log.type === 'table'));
      assert.ok(!logs.some(log => log.text.includes('Biome selected')));
    } else {
      assert.ok(logs.some(log => log.type === 'log' && log.text.includes('Biome selected')));
      assert.ok(!logs.some(log => log.text.includes('[PROFILE]')));
    }
    await probe.close();
  }
  console.log(JSON.stringify({ clicks: clicks + 1, completed, regeneration: true, undo: true, jsonReload: true, errorRecovery: true, pageErrors: errors }));
} finally {
  await browser?.close();
  server.kill();
}
