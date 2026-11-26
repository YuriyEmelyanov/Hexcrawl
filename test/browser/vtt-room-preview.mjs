// Exercise the shared room scenario for each supported editor profile.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {HEX_SIZE, getHexPolygonPoints, toPixel} from '../../src/rendering/baseHexArtwork.ts';
import {startEditorPreview} from '../../scripts/vtt-preview/editor.mjs';

const scenarios = [
  {mode: 'classic', label: 'Classic'},
  {mode: 'knave', label: 'Classic · Knave 2e', addOn: 'Knave 2e'},
  {mode: 'crows', label: 'Classic · Crows (Cornath)', addOn: 'Crows (Cornath)'},
  {mode: 'mythic', label: 'Mythic Bastionland', fixture: 'terrain-display-map.json'}
];

function terrainSnapshot() {
  const round = n => Math.round(n * 1e5) / 1e5 || 0;
  return [...document.querySelectorAll('polygon[data-hex-key], polygon[data-cell]')].map(polygon => {
    const engraving = polygon.parentElement.querySelector('[data-engraving]');
    const texture = polygon.parentElement.querySelector('.terrain-blend, [data-terrain-blend]');
    const points = polygon.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
    const [centerX, centerY] = [0, 1].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
    return {
      key: polygon.dataset.hexKey ?? polygon.dataset.cell,
      fill: getComputedStyle(polygon).fill,
      outline: points.map(([x, y]) => [round(x - centerX), round(y - centerY)]),
      engraving: engraving && {
        href: engraving.getAttribute('href'),
        size: ['width', 'height'].map(name => round(Number(engraving.getAttribute(name)))),
        offset: [round(Number(engraving.getAttribute('x')) - centerX),
          round(Number(engraving.getAttribute('y')) - centerY)],
       upright: engraving.hasAttribute('transform')
      },
      texture: texture?.getAttribute('href')
    };
  });
}

function verifyRouteBounds(view) {
  const {x, y} = toPixel(view.position.q, view.position.r);
  const hex = getHexPolygonPoints(x, y, HEX_SIZE);
  function verifyPoint(px, py) {
    for (let i = 0; i < hex.length; i++) {
      const a = hex[i], b = hex[(i + 1) % hex.length];
      assert.ok((b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x) >= -1e-6,
        `feature point ${px},${py} falls outside the current hex ${view.position.q},${view.position.r}`);
    }
  }
  for (const route of view.routes) {
    assert.deepEqual(Object.keys(route).sort(), ['faded', 'kind', 'points', 'solid', 'width']);
    for (const [px, py] of route.points) verifyPoint(px, py);
  }
  for (const mark of view.marks) {
    assert.deepEqual(Object.keys(mark).sort(), ['kind', 'x', 'y']);
    verifyPoint(mark.x, mark.y);
  }
}

async function verifyRoom(browser, {mode, label, addOn, fixture = 'classic-six-regions-seed42.json'}) {
  const {editorUrl, roomUrl, close} = await startEditorPreview();
  const contexts = [];
  const openPage = async viewport => {
    const context = await browser.newContext({viewport});
    contexts.push(context);
    return context.newPage();
  };
  try {
    const editor = await openPage({width: 1120, height: 720});
    await editor.goto(editorUrl);
    const launch = editor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/});
    await launch.waitFor();
    assert.ok(await launch.isDisabled(), 'the empty editor cannot start a room');
    const save = JSON.parse(await readFile(new URL('../fixtures/' + fixture, import.meta.url), 'utf8'));
    save.ui.selectedHex = {q: 0, r: 1};
    const rotated = mode === 'mythic';
    save.ui.isMapRotated = rotated;
    save.map.gmNotesByHexKey = {'0,1': 'PRIVATE-EDITOR-FIXTURE'};
    await editor.locator('input[type=file]').setInputFiles({name: 'classic-map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(save))});
    await editor.locator('[data-selected-hex="0,1"]').waitFor({state: 'attached'});
    if (addOn) {
      const checkbox = editor.getByRole('checkbox', {name: addOn});
      await checkbox.check();
      assert.ok(await checkbox.isChecked());
    }
    if (process.env.VTT_EVIDENCE_DIR) {
      await editor.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-editor-entry.jpg', quality: 78});
    }
    const [master] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
    await master.locator('#join').waitFor();
    const offeredLink = await master.locator('#join').getAttribute('href');
    const playerUrl = new URL(offeredLink, roomUrl).href;
    assert.equal(new URL(master.url()).origin, roomUrl);
    assert.equal(new URL(editor.url()).origin, editorUrl);
    assert.ok(await editor.locator('[data-selected-hex="0,1"]').count(), 'editor keeps its loaded map');
    const first = await openPage({width: 900, height: 600});
    const second = await openPage({width: 420, height: 700});
    const pages = [master, first, second];
    const waitPosition = q => Promise.all(pages.map(page =>
      page.waitForFunction(expected => document.querySelector('#position').value === expected, q)));
    await Promise.all([first.goto(playerUrl), second.goto(playerUrl)]);
    await waitPosition('0,1');
    for (const page of pages) assert.ok((await page.locator('#role').textContent()).includes(label));
    const firstCells = await first.locator('[data-cell]').count();
    const allCells = await master.locator('[data-cell]').count();
    assert.ok(firstCells > 0 && firstCells < allCells, 'player sees only local cells');
    assert.equal(await second.locator('[data-cell]').count(), firstCells);
    const snapshotPlayer = () => first.evaluate(async () => {
      const response = await fetch('/state', {headers: {'x-preview-room': location.pathname}});
      return response.json();
    });
    const before = await snapshotPlayer();
    assert.deepEqual(Object.keys(before).sort(), ['cells', 'mapMode', 'marks', 'position', 'proposal', 'revision', 'rotated', 'routes']);
    assert.equal(before.mapMode, mode);
    const editorRoutes = editor.locator('.rivers-layer > polyline.river-polyline, .rivers-layer > .river-rapid-mark, .roads-layer .road-line, .roads-layer .trail-line, .roads-layer .bridge-rail');
    const editorRouteCount = await editorRoutes.count();
    assert.ok(editorRouteCount > 0, 'the imported map has real rivers and routes');
    assert.equal(await master.locator('[data-route-kind]').count(), await editorRoutes.count());
    assert.equal(await first.locator('[data-route-kind]').count(), before.routes.length);
    const editorMarkCount = await editor.locator('.river-crossing, .river-waterfall').count();
    assert.equal(await master.locator('[data-mark-kind]').count(), editorMarkCount);
    assert.equal(await first.locator('[data-mark-kind]').count(), before.marks.length);
    const markTypes = await master.locator('[data-mark-kind]').evaluateAll(marks => marks.map(mark => mark.dataset.markKind));
    assert.ok(markTypes.includes('bridge'));
    if (mode === 'mythic') {
      assert.ok(markTypes.includes('ferry'));
      assert.ok(markTypes.includes('waterfall'));
    }
    verifyRouteBounds(before);
    assert.equal(before.rotated, rotated);
    assert.equal(await first.locator('#map > g').getAttribute('transform'), rotated ? 'rotate(90)' : null);
    const arrows = await first.locator('[data-direction] > svg > path').evaluateAll(paths =>
      paths.map(path => path.getAttribute('transform')));
    assert.equal(new Set(arrows).size, 6, 'six directions have distinct vector arrows');
    const editorTerrain = new Map((await editor.evaluate(terrainSnapshot)).map(cell => [cell.key, cell]));
    const playerTerrain = await first.evaluate(terrainSnapshot);
    const masterTerrain = new Map((await master.evaluate(terrainSnapshot)).map(cell => [cell.key, cell]));
    assert.deepEqual(playerTerrain.map(cell => cell.key).sort(), before.cells.map(cell => `${cell.q},${cell.r}`).sort());
    const comparable = playerTerrain.filter(cell => editorTerrain.get(cell.key)?.engraving);
    assert.ok(comparable.length > 0, 'at least one visible cell has editor terrain without a POI icon');
    for (const cell of comparable) {
      const editorCell = editorTerrain.get(cell.key);
      for (const actual of [cell, masterTerrain.get(cell.key)]) {
        assert.equal(actual.fill, editorCell.fill, cell.key);
        assert.deepEqual(actual.outline, editorCell.outline, cell.key);
        assert.deepEqual(actual.engraving, editorCell.engraving, cell.key);
      }
    }
    const textureMatches = playerTerrain.filter(cell => cell.texture && cell.texture === editorTerrain.get(cell.key)?.texture).length;
    assert.ok(textureMatches > 0, 'at least one authorized blend matches the editor pixel for pixel');
    const artwork = await first.request.get(new URL(comparable[0].engraving.href, roomUrl).href);
    assert.equal(artwork.status(), 200);
    assert.equal(artwork.headers()['content-type'], 'image/png');
    assert.deepEqual(Object.keys(before.cells[0]).sort(), ['biome', 'height', 'q', 'r', 'water']);
    assert.equal((await fetch(roomUrl + '/test/fixtures/classic-six-regions-seed42.json')).status, 404);
    assert.ok(!JSON.stringify(before).includes('PRIVATE-EDITOR-FIXTURE'));
    assert.equal((await fetch(roomUrl + '/open', {method: 'POST'})).status, 404);
    assert.equal(await first.locator('#confirm').isVisible(), false);

    await first.locator('[data-direction="2"]').click();
    await Promise.all(pages.map(page => page.locator('[data-proposal="2"]').waitFor()));
    await waitPosition('0,1');
    const proposed = await snapshotPlayer();
    assert.deepEqual(proposed.cells, before.cells);
    assert.deepEqual(proposed.routes, before.routes);
    assert.deepEqual(proposed.marks, before.marks);
    await master.reload();
    await master.locator('[data-proposal="2"]').waitFor();
    assert.equal(await master.locator('#join').getAttribute('href'), offeredLink);
    if (process.env.VTT_EVIDENCE_DIR) {
      await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-master-before.jpg', quality: 78});
    }
    await master.locator('#confirm').click();
    await waitPosition('0,0');
    await Promise.all(pages.map(page => page.locator('[data-proposal]').waitFor({state: 'detached'})));
    const after = await snapshotPlayer();
    verifyRouteBounds(after);
    assert.equal(await first.locator('[data-route-kind]').count(), after.routes.length);
    assert.equal(await first.locator('[data-mark-kind]').count(), after.marks.length);
    if (mode === 'mythic') assert.ok(after.marks.some(mark => mark.kind === 'ferry'));
    else assert.ok(after.marks.some(mark => mark.kind === 'bridge'));
    assert.notDeepEqual(after.routes, before.routes, 'a move replaces the currently revealed route fragments');
    assert.ok(after.routes.length < await editorRoutes.count());
    assert.notDeepEqual(after.cells, before.cells, 'confirmed move updates the authorised projection');
    await master.reload();
    await waitPosition('0,0');
    assert.equal(await master.locator('#join').getAttribute('href'), offeredLink);
    await second.reload();
    await waitPosition('0,0');
    assert.deepEqual(await snapshotPlayer(), after);
    const [reopened] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
    await reopened.waitForFunction(() => document.querySelector('#position').value === '0,0');
    assert.equal(await reopened.locator('#join').getAttribute('href'), offeredLink);
    await reopened.close();
    if (process.env.VTT_EVIDENCE_DIR) {
      await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-master-after.jpg', quality: 78});
      await second.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-player-after.jpg', quality: 78});
    }
    if (mode === 'classic') {
      await editor.locator('[data-fine-step]').selectOption('1');
      await editor.locator('[data-fine-world]').waitFor({state: 'attached'});
      assert.equal(await launch.count(), 0, 'one-mile editor view cannot open a game');
    }
    console.log(JSON.stringify({mode, fixture, contexts: 3,
      allCells, firstCells, afterCells: after.cells.length, from: before.position, to: after.position,
      proposedDirection: 2, rotated, matchedEngravings: comparable.length, matchedBlends: textureMatches, editorRoutes: editorRouteCount, playerRoutesBefore: before.routes.length, playerRoutesAfter: after.routes.length, markTypes: [...new Set(markTypes)], marksBefore: before.marks.map(mark => mark.kind), marksAfter: after.marks.map(mark => mark.kind), editorImport: true, reopenedFromEditor: true, previewSurvivesReload: true, samePlayerLink: true}));
  } finally {
    try {
      await Promise.all(contexts.map(context => context.close()));
    } finally {
      await close();
    }
  }
}

const browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
try {
  for (const scenario of scenarios) await verifyRoom(browser, scenario);
} finally {
  await browser.close();
}
