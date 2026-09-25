import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';

// An old-format save exercises actual import, rendering, controls and PNG export.
const manifest = JSON.parse(await fs.readFile(new URL('../../public/poi/v2/manifest.json', import.meta.url), 'utf8'));
const hexes = Array.from({ length: 42 }, (_, i) => ({ q: i % 7, r: Math.floor(i / 7) }));
const key = hex => `${hex.q},${hex.r}`;
const landKinds = Object.keys(manifest.land);
const waterKinds = Object.keys(manifest.water);
const centerHex = hexes[0];
const pointsOfInterest = hexes.slice(1, landKinds.length + 1);
const pointOfInterestKinds = Object.fromEntries(landKinds.slice(1).map((kind, i) => [key(pointsOfInterest[i]), kind]));
const waterHexes = [...hexes.slice(33, 38), { q: 7, r: 2 }];
const terrainByHexKey = Object.fromEntries(waterHexes.map((hex, i) => [key(hex), i === 5 ? { terrainOverride: 'sea' } : { terrainOverride: 'lake', lakeId: i + 1 }]));
const savedMap = {
  schema: 'hexcrawl-map', version: 2, savedAt: '2026-09-25T00:00:00.000Z',
  map: {
    regions: [{ id: 1, hexes, centerHex, anchorHex: centerHex, targetSize: 42, finalSize: 42,
      sizeCategory: 'vast_land', sizeLabel: 'Обширный край', biomeLandType: 'settled', heightLevel: 1,
      biomeId: 'plain_deciduous_forest', biomeLabel: 'Равнинный лиственный лес', biomePrimaryEmoji: '🌳',
      biomeSecondaryEmojis: [], biomeEmojiLabel: '🌳', centralPoiKind: 'capital', pointsOfInterest, pointOfInterestKinds }],
    candidateHexes: [], rivers: [], roads: [], crossings: [], terrainByHexKey,
    waterPoiByHexKey: Object.fromEntries(waterKinds.map((kind, i) => [key(waterHexes[i]), kind]))
  },
  counters: { nextLakeId: 6, nextRoadId: 1 },
  ui: { selectedHex: centerHex, isMapRotated: false, mapScale: 2 }
};

const server = spawn(process.execPath, [fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], {
  cwd: new URL('../../', import.meta.url), stdio: ['ignore', 'pipe', 'inherit']
});
let browser;
try {
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Preview did not start: ${output}`)), 10000);
    server.stdout.on('data', data => {
      output += String(data);
      if (stripVTControlCharacters(output).includes('Local:')) { clearTimeout(timeout); resolve(); }
    });
    server.on('error', reject);
    server.on('exit', code => reject(new Error(`Preview exited: ${code}`)));
  });
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const imageFetches = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', async dialog => { errors.push(dialog.message()); await dialog.dismiss(); });
  page.on('response', response => { if (response.url().includes('/poi/') && !response.ok()) errors.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (request.resourceType() === 'fetch') imageFetches.push(request.url()); });
  await page.route(/mc\.yandex/, route => route.abort());
  await page.goto('http://127.0.0.1:4174/');
  await page.locator('input[type=file]').setInputFiles({ name: 'poi-display.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(savedMap)) });
  await page.waitForFunction(() => document.querySelectorAll('image.poi-marker').length === 39);
  const svgPois = page.locator('image.poi-marker');
  const emojiPois = page.locator('text.poi-marker');
  const biomeEmoji = page.locator('text.biome-marker');
  const tiles = page.locator('image[href="/Lowland_deciduous_forest.png"]');
  const hexToggle = page.locator('.biome-display-toggle');
  const poiToggle = page.locator('.poi-display-toggle');
  assert.equal(await hexToggle.getAttribute('aria-label'), 'Гексы: Тайлы');
  assert.equal(await poiToggle.getAttribute('aria-label'), 'Точки интереса: Значки');
  assert.ok(await tiles.count() > 0);
  assert.equal(await biomeEmoji.count(), 0);
  const expectedHrefs = [...landKinds.map(kind => `/poi/v2/land/${kind}.svg`), ...waterKinds.map(kind => `/poi/v2/water/${kind}.svg`), '/poi/v2/unknown.svg'].sort();
  assert.deepEqual((await svgPois.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).sort(), expectedHrefs);
  const assetResults = await page.evaluate(async hrefs => Promise.all(hrefs.map(async href => {
    const response = await fetch(href);
    return response.ok && response.headers.get('content-type')?.includes('image/svg+xml') && (await response.text()).includes('<svg');
  })), expectedHrefs);
  assert.ok(assetResults.every(Boolean), 'Every rendered marker must load a real SVG asset');

  // All four independent combinations, with the existing emoji mode retained.
  await hexToggle.click();
  assert.equal(await tiles.count(), 0);
  assert.equal(await svgPois.count(), 39);
  assert.ok(await biomeEmoji.count() > 0);
  await poiToggle.click();
  assert.equal(await svgPois.count(), 0);
  assert.equal(await emojiPois.count(), 39);
  assert.ok(await biomeEmoji.count() > 0);
  await hexToggle.click();
  assert.ok(await tiles.count() > 0);
  assert.equal(await emojiPois.count(), 39);
  assert.equal(await biomeEmoji.count(), 0);
  await poiToggle.click();

  async function download(format) {
    const menu = page.locator('details.export-menu');
    if (await menu.getAttribute('open') === null) await menu.locator('summary').click();
    const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: format, exact: true }).click()]);
    return fs.readFile(await file.path());
  }
  const capital = page.locator('image.poi-marker[href$="/land/capital.svg"]');
  assert.equal(await capital.getAttribute('width'), '24');
  const markerPosition = () => capital.evaluate(node => ({ x: +node.getAttribute('x') + 12, y: +node.getAttribute('y') + 12 }));
  const before = await markerPosition();
  const mapHeight = await page.locator('.map-viewport > svg').evaluate(node => node.viewBox.baseVal.height);
  await page.locator('.rotate-map-button').click();
  const after = await markerPosition();
  assert.ok(Math.abs(after.x - (mapHeight - before.y)) < 0.001);
  assert.ok(Math.abs(after.y - before.x) < 0.001);
  assert.equal(await capital.evaluate(node => node.getCTM().b), 0, 'POI remains upright after rotation');

  const markerBoxes = await page.locator('image.poi-marker[href$="/capital.svg"], image.poi-marker[href$="/water/shipwreck.svg"]').evaluateAll(nodes => nodes.map(node => ({ x: +node.getAttribute('x'), y: +node.getAttribute('y'), width: +node.getAttribute('width'), height: +node.getAttribute('height') })));
  imageFetches.length = 0;
  const png = await download('PNG');
  assert.equal(new Set(imageFetches).size, imageFetches.length, 'Each repeated tile or icon is fetched once per export');
  const darkPixelCounts = await page.evaluate(async ({ data, boxes }) => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return boxes.map(box => {
      const pixels = context.getImageData(Math.floor(box.x * 2), Math.floor(box.y * 2), Math.floor(box.width * 2), Math.floor(box.height * 2)).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] === 38 && pixels[i + 1] === 51 && pixels[i + 2] === 43 && pixels[i + 3] === 255) count++;
      return count;
    });
  }, { data: png.toString('base64'), boxes: markerBoxes });
  assert.ok(darkPixelCounts.length === 2 && darkPixelCounts.every(count => count > 20), `Land and sea SVGs must appear in exported pixels: ${darkPixelCounts}`);
  await poiToggle.click();
  const emojiPng = await download('PNG');
  assert.ok(!png.equals(emojiPng), 'PNG follows the selected POI display mode');
  const savedAfter = JSON.parse((await download('JSON')).toString());
  assert.deepEqual(savedAfter.map.regions, savedMap.map.regions, 'Display controls must not change regions or POIs');
  assert.deepEqual(savedAfter.map.waterPoiByHexKey, savedMap.map.waterPoiByHexKey);
  await poiToggle.click();

  await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
  assert.equal(await hexToggle.getAttribute('aria-label'), 'Hexes: Tiles');
  assert.equal(await poiToggle.getAttribute('aria-label'), 'Points of interest: Icons');
  await page.getByRole('button', { name: 'Переключить на русский', exact: true }).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('.controls--display').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('.controls--display').evaluate(node => node.scrollWidth <= node.clientWidth), `Controls overflow at ${width}px`);
    for (const toggle of [hexToggle, poiToggle]) {
      const box = await toggle.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width, `Toggle outside viewport at ${width}px`);
    }
  }
  if (process.env.POI_QA_SCREENSHOT) await page.locator('.controls--display').screenshot({ path: process.env.POI_QA_SCREENSHOT });
  assert.deepEqual(errors, []);
  console.log('POI display passed: 39 SVGs, four mode combinations, old save, upright rotation, PNG pixels, JSON preservation, RU/EN, 320/390px controls.');
} finally {
  if (browser) await browser.close();
  server.kill();
}
