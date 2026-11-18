import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url);
const reports = new URL('reports/HX-BL-060/', root);
const viewport = { width: 1500, height: 1000 };
const baselineDir = process.env.HX060_BASELINE_DIR;
assert.ok(baselineDir, 'Provide a Vite build of the published baseline');
const editions = [
  { name: 'before', port: 4198, dir: baselineDir },
  { name: 'after', port: 4199, dir: 'dist' },
];
const scenarios = [
  { name: 'classic-6', fixture: 'engraved-classic-map', step: 6, cells: 93 },
  { name: 'classic-1', fixture: 'road-entry-zigzags', step: 1, cells: 3471 },
  { name: 'lake-6', fixture: 'lake-reentry-map', step: 6, cells: 416 },
];
const servers = [];
let browser;

async function serve({ port, dir }) {
  const server = spawn(process.execPath, [
    fileURLToPath(new URL('node_modules/vite/bin/vite.js', root)),
    'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--outDir', dir,
  ], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  servers.push(server);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Preview timeout on ' + port)), 15000);
    server.stdout.on('data', chunk => {
      if (!String(chunk).includes(String(port))) return;
      clearTimeout(timer);
      resolve();
    });
    server.on('error', error => { clearTimeout(timer); reject(error); });
    server.on('exit', code => { clearTimeout(timer); reject(Error('Preview exited with ' + code)); });
  });
}

async function ready(page) {
  await page.locator('svg[data-render-phase="ready"]').waitFor({ state: 'attached' });
  return page.evaluate(async () => {
    const svg = document.querySelector('.map-stage > svg');
    const sources = [...new Set([...svg.querySelectorAll('image')]
      .map(node => node.getAttribute('href')).filter(href => href && !href.startsWith('data:')))];
    const start = performance.now();
    await Promise.all(sources.map(async src => {
      const image = new Image();
      image.src = src;
      await image.decode();
    }));
    const assetsReadyMs = performance.now() - start;
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const requested = new Set(sources.map(url => new URL(url, location.href).href));
    const resources = performance.getEntriesByType('resource').filter(entry => requested.has(entry.name));
    return {
      readyAt: performance.now(), assetsReadyMs, assetUrls: sources.length,
      transferBytes: resources.reduce((bytes, entry) => bytes + entry.transferSize, 0),
      encodedBytes: resources.reduce((bytes, entry) => bytes + entry.encodedBodySize, 0),
    };
  });
}

async function openMap(page, scenario, input, warmup) {
  const start = await page.evaluate(() => { performance.clearResourceTimings(); return performance.now(); });
  await page.locator('input[type=file]').setInputFiles({
    name: scenario.fixture + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(input)),
  });
  await page.waitForFunction(() => document.querySelector('[data-hex-key].hex.region,[data-hex-key].hex.center')
    && !document.querySelector('.controls--transfer > button')?.disabled);
  const source = await ready(page);
  let fine = null;
  if (scenario.step === 1) {
    const switchAt = await page.evaluate(() => performance.now());
    await page.locator('[data-fine-step]').selectOption('1');
    await page.locator('[data-fine-world], [data-fine-scene-error]').first().waitFor({ timeout: 120000 });
    assert.equal(await page.locator('[data-fine-scene-error]').count(), 0);
    await page.locator('[data-fine-scene-preparing]').waitFor({ state: 'detached' });
    fine = await ready(page);
    fine.elapsedMs = fine.readyAt - switchAt;
  }
  const selector = scenario.step === 1 ? '[data-fine-cells] > [data-fine-key]' : 'polygon.hex.region,polygon.hex.center';
  const cells = await page.locator(selector).count();
  assert.equal(cells, scenario.cells, scenario.name);
  const motion = await page.evaluate(async () => {
    const view = document.querySelector('.map-viewport'), box = view.getBoundingClientRect();
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const measureFrames = async action => {
      let previous = await frame();
      const times = [];
      for (let index = 0; index < 12; index++) {
        action(index);
        const now = await frame();
        times.push(now - previous);
        previous = now;
      }
      return times;
    };
    const pan = await measureFrames(index => { view.scrollLeft += index < 6 ? 12 : -12; });
    const zoom = await measureFrames(index => view.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true, cancelable: true, deltaY: index < 6 ? -12 : 12,
      clientX: box.left + view.clientWidth / 2, clientY: box.top + view.clientHeight / 2,
    })));
    return { pan, zoom };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  await cdp.detach();
  return { warmup, cells, firstDrawingMs: source.readyAt - start, finePreparationAndDrawingMs: fine?.elapsedMs,
    sourceAssets: { ...source, readyAt: undefined },
    fineAssets: fine ? { ...fine, readyAt: undefined } : undefined, motion, retainedJsBytes: usedSize };
}

async function measureGeneration(page, seed) {
  await page.reload();
  const seedField = page.getByRole('textbox', { name: 'World seed', exact: true });
  await seedField.fill(String(seed));
  await seedField.press('Tab');
  await page.locator('.gen-params select').first().selectOption('region');
  const start = await page.evaluate(() => performance.now());
  await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
  await page.locator('polygon.hex.region,polygon.hex.center').first().waitFor({ state: 'attached' });
  const generatedAt = await page.evaluate(() => performance.now());
  const result = await ready(page);
  return {
    seed, cells: await page.locator('polygon.hex.region,polygon.hex.center').count(),
    generationToFirstCellsMs: generatedAt - start, fullDrawingMs: result.readyAt - generatedAt,
  };
}

function stats(values) {
  const sorted = values.filter(Number.isFinite).sort((a,b) => a - b);
  if (!sorted.length) return undefined;
  return { n: sorted.length, min: sorted[0], median: (sorted[Math.floor((sorted.length - 1) / 2)]
    + sorted[Math.floor(sorted.length / 2)]) / 2, max: sorted.at(-1) };
}

function summarize(rows) {
  const summary = [];
  for (const { name } of scenarios) {
    for (const edition of editions) {
      const group = rows.filter(row => row.scenario === name && row.edition === edition.name && !row.warmup);
      if (!group.length) continue;
      summary.push({
        scenario: name, edition: edition.name,
        firstDrawingMs: stats(group.map(row => row.firstDrawingMs)),
        finePreparationAndDrawingMs: stats(group.map(row => row.finePreparationAndDrawingMs)),
        panFrameMedianMs: stats(group.map(row => stats(row.motion.pan).median)),
        zoomFrameMedianMs: stats(group.map(row => stats(row.motion.zoom).median)),
        retainedJsBytes: stats(group.map(row => row.retainedJsBytes)),
        distinctSourceAssets: stats(group.map(row => (row.fineAssets ?? row.sourceAssets).assetUrls)),
        assetReadyMs: stats(group.map(row => (row.fineAssets ?? row.sourceAssets).assetsReadyMs)),
        imageTransferBytes: stats(group.map(row => (row.fineAssets ?? row.sourceAssets).transferBytes)),
      });
    }
  }
  return summary;
}

async function junctions(page, step) {
  return page.evaluate(step => {
    const nodes = step === 1
      ? document.querySelectorAll('[data-fine-cells] > g:not([data-fine-terrain="lake"]):not([data-fine-terrain="sea"]) > polygon')
      : document.querySelectorAll('.map-rotation-layer > g > polygon:is(.hex.region,.hex.center)');
    const corners = new Map(), edges = new Map();
    for (const node of nodes) {
      const key = node.getAttribute('data-hex-key') ?? node.parentElement.dataset.fineKey;
      const color = node.style.fill || node.getAttribute('fill');
      if (['#5D919C', '#426E85'].includes(color?.toUpperCase()) || [ 'rgb(93, 145, 156)', 'rgb(66, 110, 133)' ].includes(color)) continue;
      const points = node.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
      const tokens = points.map(([x,y]) => [x,y].map(n => n.toFixed(3)).join(','));
      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index], next = (index + 1) % points.length;
        const adjacent = corners.get(token) ?? { point: points[index], cells: [] };
        adjacent.cells.push({ key, color });
        corners.set(token, adjacent);
        const edgeToken = [token, tokens[next]].sort().join('/');
        const edge = edges.get(edgeToken) ?? {
          point: points[index].map((n, axis) => (n + points[next][axis]) / 2), cells: [],
        };
        edge.cells.push({ key, color });
        edges.set(edgeToken, edge);
      }
    }
    const distinct = entry => new Set(entry.cells.map(cell => cell.color)).size;
    const [w,h] = document.querySelector('.map-stage > svg').getAttribute('viewBox').split(/\s+/).slice(2).map(Number);
    const closest = entries => entries.sort((a,b) =>
      Math.hypot(a.point[0] - w / 2, a.point[1] - h / 2) - Math.hypot(b.point[0] - w / 2, b.point[1] - h / 2))[0];
    const triple = [...corners.values()].filter(entry => entry.cells.length === 3);
    return {
      '2-plus-1': closest(triple.filter(entry => distinct(entry) === 2)),
      '3-colors': closest(triple.filter(entry => distinct(entry) === 3)),
      '2-neighbors': closest([...edges.values()].filter(entry => entry.cells.length === 2 && distinct(entry) === 2)),
    };
  }, step);
}

async function capture(page, scenario, edition, cases, rotated) {
  if (rotated) await page.locator('.rotate-map-button').click();
  await ready(page);
  const orientation = rotated ? 'rotated' : 'normal';
  for (const [name, example] of Object.entries(cases)) {
    const key = example.cells[0].key;
    const selector = scenario.step === 1 ? '[data-fine-key="' + key + '"] > polygon' : 'polygon[data-hex-key="' + key + '"]';
    const [x,y] = example.point;
    const clip = await page.locator(selector).first().evaluate(async (node, [x,y]) => {
      const view = document.querySelector('.map-viewport'), rect = view.getBoundingClientRect();
      const center = () => new DOMPoint(x,y).matrixTransform(node.getScreenCTM());
      const start = center();
      view.scrollLeft += start.x - rect.left - view.clientWidth / 2;
      view.scrollTop += start.y - rect.top - view.clientHeight / 2;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const point = center(), width = Math.min(680, view.clientWidth), height = Math.min(560, view.clientHeight);
      return { x: Math.round(Math.max(rect.left, Math.min(point.x - width / 2, rect.left + view.clientWidth - width))),
        y: Math.round(Math.max(rect.top, Math.min(point.y - height / 2, rect.top + view.clientHeight - height))),
        width, height };
    }, [x,y]);
    await page.screenshot({ clip, path: new URL([scenario.name,name,orientation,edition.name].join('-') + '.png', reports).pathname });
  }
  const menu = page.locator('details.export-menu');
  await menu.locator('summary').click();
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PNG', exact: true }).click()]);
  await png.saveAs(new URL([scenario.name,orientation,edition.name,'export'].join('-') + '.png', reports).pathname);
  await menu.locator('summary').click();
}

try {
  for (const edition of editions) await serve(edition);
  browser = await chromium.launch();
  await mkdir(reports, { recursive: true });
  const rows = [], examples = {}, generation = [];
  for (const scenario of scenarios) {
    const raw = JSON.parse(await readFile(new URL('test/fixtures/' + scenario.fixture + '.json', root)));
    const pages = [];
    for (const edition of editions) {
      const page = await browser.newPage({ viewport });
      await page.goto('http://127.0.0.1:' + edition.port + '/');
      await page.locator('input[type=file]').waitFor({ state: 'attached' });
      pages.push(page);
    }
    const timingInput = { ...raw, ui: { ...raw.ui, mapScale: 2 } };
    for (let repeat = 0; repeat <= 5; repeat++) {
      for (let order = 0; order < editions.length; order++) {
        const index = (repeat + order) % editions.length, page = pages[index];
        await page.bringToFront();
        await page.reload();
        const result = await openMap(page, scenario, timingInput, repeat === 0);
        rows.push({ scenario: scenario.name, fixture: scenario.fixture, edition: editions[index].name, repeat, ...result });
      }
    }
    if (scenario.name !== 'lake-6') {
      const input = { ...raw, ui: { ...raw.ui, selectedHex: null, mapScale: 4.5 } };
      for (const page of pages) { await page.bringToFront(); await page.reload(); await openMap(page, scenario, input, true); }
      const cases = Object.fromEntries(Object.entries(await junctions(pages[1], scenario.step)).filter(([,value]) => value));
      assert.ok(cases['2-plus-1'] && cases['2-neighbors'], 'Expected a rounded vertex and an edge control');
      examples[scenario.name] = cases;
      for (const [index,edition] of editions.entries()) {
        await pages[index].bringToFront();
        await capture(pages[index], scenario, edition, cases, false);
        await capture(pages[index], scenario, edition, cases, true);
      }
    }
    if (scenario.name === 'classic-6') {
      for (let repeat = 0; repeat <= 5; repeat++) {
        for (let order = 0; order < editions.length; order++) {
          const index = (repeat + order) % editions.length, page = pages[index];
          await page.bringToFront();
          generation.push({ edition: editions[index].name, repeat, warmup: repeat === 0,
            ...await measureGeneration(page, 423493684) });
        }
      }
    }
    for (const page of pages) await page.close();
    await writeFile(new URL('comparison.json',reports), JSON.stringify({
      source_head: process.env.HX060_SOURCE_HEAD, published_base: process.env.HX060_BASE_SHA,
      checkout: process.env.GITHUB_SHA, browser: browser.version(), node: process.version,
      platform: platform(), cpu: cpus()[0]?.model, cores: cpus().length, viewport,
      method: 'Same build host and save, published default versus candidate default, alternate A/B order, discard one warmup. First drawing includes saved-map import, asset decode witness and two frames. Subsequent navigations have warm browser HTTP cache. JS heap excludes native graphics memory. Fine preparation includes projection and first fine drawing. Seed generation is a separate Classic region scenario and uses first committed cells as the boundary between computation and complete drawing.',
      rows, summary: summarize(rows), examples, generation,
    }, null, 2));
    console.log('HX060_COMPARISON ' + scenario.name + ' ' + rows.filter(row => row.scenario === scenario.name).length + ' paired observations');
  }
} finally {
  await browser?.close();
  for (const server of servers) server.kill();
}
