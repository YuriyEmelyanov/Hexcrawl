// Exercise the shared room scenario for each supported editor profile.
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rename, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {HEX_SIZE, getHexPolygonPoints, toPixel} from '../../src/rendering/baseHexArtwork.ts';
import {startEditorPreview} from '../../scripts/vtt-preview/editor.mjs';
import {createGenerationHarness} from '../helpers/generation-harness.mjs';

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
    const isArrow = route.kind === 'river-arrow';
    assert.deepEqual(Object.keys(route).sort(), [
      ...(isArrow ? ['arrowSize'] : []), ...(route.crossing ? ['crossing'] : []), 'faded', 'kind', 'points', 'solid', 'width'
    ]);
    if (route.crossing) {
      verifyPoint(...route.crossing);
      const crossingKind = route.kind === 'rail' ? 'bridge' : route.kind === 'ferry' ? 'ferry' : 'ford';
      assert.ok(view.marks.some(mark => mark.kind === crossingKind &&
        mark.x === route.crossing[0] && mark.y === route.crossing[1]));
    } else if (isArrow || route.kind === 'rapid') {
      const [[x1, y1], [x2, y2]] = route.points;
      verifyPoint((x1 + x2) / 2, (y1 + y2) / 2);
    } else {
      for (const [px, py] of route.points) verifyPoint(px, py);
    }
  }
  for (const mark of view.marks) {
    assert.deepEqual(Object.keys(mark).sort(), ['kind', 'x', 'y']);
    verifyPoint(mark.x, mark.y);
  }
}

async function verifyRoom(browser, {mode, label, addOn, fixture = 'classic-six-regions-seed42.json'}) {
  const privateDir = mode === 'classic' ? await mkdtemp(join(tmpdir(), 'hexcrawl-vtt-')) : null;
  const storagePath = privateDir ? join(privateDir, 'room.json') : undefined;
  let preview;
  const contexts = [];
  const openPage = async viewport => {
    const context = await browser.newContext({viewport});
    contexts.push(context);
    return context.newPage();
  };
  try {
    preview = await startEditorPreview({storagePath});
    const {editorUrl, roomUrl} = preview;
    const editor = await openPage({width: 1120, height: 720});
    await editor.goto(editorUrl);
    const launch = editor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/});
    await launch.waitFor();
    assert.ok(await launch.isDisabled(), 'the empty editor cannot start a room');
    await editor.locator('.controls--transfer > button:not([disabled])').waitFor();
    const save = JSON.parse(await readFile(new URL('../fixtures/' + fixture, import.meta.url), 'utf8'));
    save.ui.selectedHex = {q: 0, r: 1};
    const rotated = mode === 'mythic';
    save.ui.isMapRotated = rotated;
    save.map.gmNotesByHexKey = {'0,1': 'PRIVATE-EDITOR-FIXTURE'};
    save.map.poiDiscovery = mode === 'mythic' ? {'poi:1:0,1': 'passage'} : {
      'poi:1:0,1': 'interaction', 'poi:1:0,0': 'passage', 'poi:2:1,1': 'exploration'
    };
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
    assert.equal(await first.locator('#fit-map').isVisible(), false);
    const snapshotPlayer = () => first.evaluate(async () => {
      const response = await fetch('/state', {headers: {'x-preview-room': location.pathname}});
      return response.json();
    });
    const snapshotMaster = () => master.evaluate(async () => {
      const response = await fetch('/state', {headers: {
        authorization: 'Bearer ' + sessionStorage.getItem('vtt-preview-master')
      }});
      return response.json();
    });
    const verifyCrossingArtwork = async view => {
      const full = await snapshotMaster();
      const permitted = full.routes.filter(route => route.crossing && view.marks.some(mark =>
        mark.kind === (route.kind === 'rail' ? 'bridge' : 'ford') &&
        mark.x === route.crossing[0] && mark.y === route.crossing[1]));
      if (view.marks.some(mark => mark.kind === 'bridge')) {
        assert.equal(permitted.filter(route => route.kind === 'rail').length, 2, 'bridge has two complete rails');
      }
      assert.deepEqual(view.routes.filter(route => route.crossing), permitted,
        'player sees complete authorized symbols and no hidden crossing artwork');
    };
    const before = await snapshotPlayer();
    assert.deepEqual(Object.keys(before).sort(), ['cells', 'mapMode', 'marks', 'pois', 'position', 'proposal', 'revision', 'rotated', 'routes']);
    assert.equal(before.mapMode, mode);
    const editorIcons = await editor.locator('[data-engraved-poi]').evaluateAll(markers => markers.map(marker => [
      marker.dataset.engravedPoi, marker.querySelector('image').getAttribute('href'), marker.querySelector('circle').getAttribute('fill')
    ]));
    const readIcons = page => page.locator('[data-poi] > image').evaluateAll(icons => icons.map(icon => [
      icon.parentElement.dataset.poi, icon.getAttribute('href'), icon.previousElementSibling.getAttribute('fill')
    ]));
    assert.ok(editorIcons.length > 1, 'the imported map has several real points of interest');
    assert.deepEqual((await readIcons(master)).sort(), editorIcons.sort());
    const verifyPoi = async (view, expected) => {
      const icons = expected ? editorIcons.filter(([key]) => key === expected) : [];
      assert.equal(icons.length, expected ? 1 : 0);
      assert.deepEqual(view.pois, icons.map(([key, icon, fill]) => {
        const [q, r] = key.split(',').map(Number);
        return {q, r, icon, fill};
      }));
      for (const page of [first, second]) assert.deepEqual(await readIcons(page), icons);
      if (expected) {
        assert.equal(await first.locator('[data-party]').getAttribute('fill'), 'none');
        const image = await first.request.get(new URL(icons[0][1], roomUrl).href);
        assert.equal(image.status(), 200);
        assert.equal(image.headers()['content-type'], 'image/svg+xml');
      }
    };
    await verifyPoi(before, mode === 'mythic' ? '0,1' : null);
    if (mode === 'mythic') assert.match(await first.locator('[data-poi="0,1"]').getAttribute('transform'), /^rotate\(-90 /);
    const editorRoutes = editor.locator('.rivers-layer > polyline.river-polyline, .rivers-layer > .river-direction-arrow, .rivers-layer > .river-rapid-mark, .roads-layer .road-line, .roads-layer .trail-line, .roads-layer .bridge-rail');
    const editorRouteCount = await editorRoutes.count();
    assert.ok(editorRouteCount > 0, 'the imported map has real rivers and routes');
    assert.equal(await master.locator('[data-route-kind]').count(), await editorRoutes.count());
    assert.equal(await first.locator('[data-route-kind]').count(), before.routes.length);
    for (const page of pages) {
      const grid = page.locator('.color-hex-grid');
      assert.equal(await grid.getAttribute('stroke'), await editor.locator('.top-hex-grid > path').getAttribute('stroke'));
      assert.equal(await grid.getAttribute('stroke-opacity'), await editor.locator('.top-hex-grid > path').getAttribute('stroke-opacity'));
      assert.ok((await grid.getAttribute('d')).length > 0);
    }
    const editorMarkCount = await editor.locator('.river-crossing, .river-waterfall').count();
    assert.equal(await master.locator('[data-mark-kind]').count(), editorMarkCount);
    assert.equal(await first.locator('[data-mark-kind]').count(), before.marks.length);
    const markTypes = await master.locator('[data-mark-kind]').evaluateAll(marks => marks.map(mark => mark.dataset.markKind));
    assert.ok(markTypes.includes('bridge'));
    if (mode === 'mythic') {
      assert.ok(markTypes.includes('ferry'));
      assert.ok(markTypes.includes('waterfall'));
      const map = master.locator('#map');
      const frame = () => map.getAttribute('viewBox');
      const countOutside = () => map.evaluate(svg => {
        const box = svg.getBoundingClientRect();
        const layer = svg.querySelector(':scope > g');
        const matrix = layer.getScreenCTM();
        return [...layer.querySelectorAll('[data-cell]')].filter(cell => Array.from(cell.points).some(point => {
          const {x, y} = point.matrixTransform(matrix);
          return x < Math.max(0, box.left) - .5 || x > Math.min(innerWidth, box.right) + .5 ||
            y < Math.max(0, box.top) - .5 || y > Math.min(innerHeight, box.bottom) + .5;
        })).length;
      });
      const fit = await frame();
      assert.equal(await countOutside(), 0, 'full master map fits including the edges');
      await master.getByRole('button', {name: 'К отряду'}).click();
      assert.ok(await countOutside() > 0, 'party view centres on the turn instead of fitting all cells');
      const partyFrame = await frame();
      await master.getByRole('button', {name: 'Приблизить карту'}).click();
      const zoomed = await frame();
      assert.ok(Number(zoomed.split(' ')[2]) < Number(partyFrame.split(' ')[2]));
      await map.press('ArrowDown');
      assert.notEqual(await frame(), zoomed);
      await master.getByRole('button', {name: 'Вся карта'}).click();
      assert.equal(await frame(), fit);
      assert.equal(await countOutside(), 0);
      if (process.env.VTT_EVIDENCE_DIR) {
        await master.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'mythic-master-full-map.jpg'), quality: 72});
      }
    }
    verifyRouteBounds(before);
    await verifyCrossingArtwork(before);
    assert.equal(before.rotated, rotated);
    assert.equal(await first.locator('#map > g').getAttribute('transform'), rotated ? 'rotate(90)' : null);
    const arrows = await first.locator('[data-direction] > svg > path').evaluateAll(paths =>
      paths.map(path => path.getAttribute('transform')));
    assert.equal(new Set(arrows).size, 6, 'six directions have distinct vector arrows');
    const editorTerrain = new Map((await editor.evaluate(terrainSnapshot)).map(cell => [cell.key, cell]));
    const playerTerrain = await first.evaluate(terrainSnapshot);
    const masterTerrain = new Map((await master.evaluate(terrainSnapshot)).map(cell => [cell.key, cell]));
    assert.equal(Boolean(playerTerrain.find(cell => cell.key === '0,1').engraving), mode !== 'mythic',
      'player terrain reveals no sign of a secret current-hex point');
    assert.equal(masterTerrain.get('0,1').engraving, null, 'a native point replaces its terrain engraving');
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
    for (const cell of before.cells) {
      assert.deepEqual(Object.keys(cell).sort(), cell.water
        ? ['height', 'q', 'r', 'water'] : ['biome', 'height', 'q', 'r', 'water']);
    }
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
    assert.deepEqual(proposed.pois, before.pois);
    await master.reload();
    await master.locator('[data-proposal="2"]').waitFor();
    assert.equal(await master.locator('#join').getAttribute('href'), offeredLink);
    if (process.env.VTT_EVIDENCE_DIR) {
      await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-master-before.jpg', quality: 78});
      await second.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-player-before.jpg', quality: 78});
    }
    if (privateDir) {
      await rename(privateDir, privateDir + '-unavailable');
      try {
        await master.locator('#confirm').click();
        await master.getByText('Не удалось сохранить состояние комнаты', {exact: true}).waitFor();
        await waitPosition('0,1');
        assert.deepEqual(await snapshotPlayer(), proposed, 'failed save leaves the confirmed position and its projection intact');
        if (process.env.VTT_EVIDENCE_DIR) {
          await master.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'classic-save-unavailable.jpg'), quality: 78});
        }
      } finally {
        await rename(privateDir + '-unavailable', privateDir);
      }
    }
    await master.locator('#confirm').click();
    await waitPosition('0,0');
    await Promise.all(pages.map(page => page.locator('[data-proposal]').waitFor({state: 'detached'})));
    const after = await snapshotPlayer();
    await verifyPoi(after, mode === 'mythic' ? null : '0,0');
    verifyRouteBounds(after);
    await verifyCrossingArtwork(after);
    assert.equal(await first.locator('[data-route-kind]').count(), after.routes.length);
    assert.equal(await first.locator('[data-mark-kind]').count(), after.marks.length);
    if (mode === 'mythic') assert.ok(after.marks.some(mark => mark.kind === 'ferry'));
    else assert.ok(after.marks.some(mark => mark.kind === 'bridge'));
    assert.notDeepEqual(after.routes, before.routes, 'a move replaces the currently revealed route fragments');
    assert.ok(after.routes.length < await editorRoutes.count());
    assert.notDeepEqual(after.cells, before.cells, 'confirmed move updates the authorised projection');
    if (privateDir) {
      const masterAfter = await snapshotMaster();
      await preview.restartRoom();
      assert.deepEqual(await snapshotPlayer(), after, 'the original link still gives its existing player the same view');
      assert.deepEqual(await snapshotMaster(), masterAfter, 'the same browser retains master access and its map history');
      const freshPlayer = await openPage({width: 420, height: 700});
      assert.equal((await freshPlayer.goto(playerUrl)).status(), 200);
      await freshPlayer.waitForFunction(() => document.querySelector('#position').value === '0,0');
      assert.deepEqual(await readIcons(freshPlayer), await readIcons(first));
      assert.equal((await freshPlayer.request.get(roomUrl + '/room.json')).status(), 404);
      const editorFile = await freshPlayer.request.get(editorUrl + '/@fs' + storagePath);
      assert.equal(editorFile.status(), 403, 'the editor dev server also denies access to the private snapshot');
      if (process.env.VTT_EVIDENCE_DIR) {
        await freshPlayer.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'classic-player-after-restart.jpg'), quality: 78});
      }
    }
    await master.reload();
    await waitPosition('0,0');
    assert.equal(await master.locator('#join').getAttribute('href'), offeredLink);
    await second.reload();
    await waitPosition('0,0');
    assert.deepEqual(await snapshotPlayer(), after);
    if (mode === 'mythic') {
      await editor.getByRole('button', {name: /Вернуть исходный поворот|Restore original map rotation/}).click();
      await editor.locator('[data-selected-hex="0,1"]').waitFor({state: 'attached'});
    }
    const [reopened] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
    await reopened.waitForFunction(() => document.querySelector('#position').value === '0,0');
    assert.equal(await reopened.locator('#join').getAttribute('href'), offeredLink);
    if (mode === 'mythic') {
      await first.waitForFunction(() => !document.querySelector('#map > g').hasAttribute('transform'));
      const unrotated = await snapshotPlayer();
      assert.deepEqual(unrotated, {...after, rotated: false, revision: after.revision + 1});
      for (const page of pages) assert.equal(await page.locator('#position').textContent(), '0,0');
    }
    await reopened.close();
    if (process.env.VTT_EVIDENCE_DIR) {
      await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-master-after.jpg', quality: 78});
      await second.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/' + mode + '-player-after.jpg', quality: 78});
    }
    if (mode === 'classic') {
      for (const [direction, position] of [[5, '0,1'], [0, '1,1']]) {
        await first.locator(`[data-direction="${direction}"]`).click();
        await master.locator(`[data-proposal="${direction}"]`).waitFor();
        await master.locator('#confirm').click();
        await waitPosition(position);
        await verifyPoi(await snapshotPlayer(), null);
      }
      assert.ok(await master.locator('[data-poi="1,1"]').count(), 'a point requiring exploration is master-only on arrival');
      const currentView = await snapshotPlayer();
      const playerState = headers => first.request.get(roomUrl + '/state', {headers});
      const playerHeaders = {'x-preview-room': offeredLink};
      const playerCommand = (headers, kind) => first.request.post(roomUrl + '/state', {
        headers, data: {kind, revision: currentView.revision, direction: 2, expectedPlayerPath: offeredLink}
      });
      assert.equal(await first.locator('#share-controls').isVisible(), false);
      for (const kind of ['close-player-access', 'rotate-player-link']) {
        assert.equal((await playerCommand(playerHeaders, kind)).status(), 409);
      }
      assert.deepEqual(await snapshotPlayer(), currentView);

      const waitRevoked = async page => {
        await page.getByText('Доступ по этой ссылке закрыт', {exact: true}).waitFor();
        assert.equal((await page.locator('#position').textContent()).trim(), '—');
        assert.equal(await page.locator('#map > *').count(), 0);
        assert.equal(await page.locator('#choices button:disabled').count(), 6);
      };
      const waitNewLink = previous => master.waitForFunction(old => {
        const anchor = document.querySelector('#join');
        const href = anchor.getAttribute('href');
        return href && href !== old && !anchor.hidden ? href : false;
      }, previous).then(handle => handle.jsonValue());
      const sameMap = ({revision, ...view}) => view;

      await master.getByRole('button', {name: 'Сменить ссылку'}).click();
      const rotatedLink = await waitNewLink(offeredLink);
      await Promise.all([waitRevoked(first), waitRevoked(second)]);
      assert.equal((await playerState(playerHeaders)).status(), 404);
      assert.equal((await playerCommand(playerHeaders, 'propose')).status(), 404);
      const newcomer = await openPage({width: 420, height: 700});
      assert.equal((await newcomer.goto(playerUrl)).status(), 404);
      await waitRevoked(newcomer);
      const rotatedUrl = new URL(rotatedLink, roomUrl).href;
      assert.equal((await newcomer.goto(rotatedUrl)).status(), 200);
      await newcomer.waitForFunction(() => document.querySelector('#position').value === '1,1');
      assert.deepEqual(sameMap(await (await playerState({'x-preview-room': rotatedLink})).json()), sameMap(currentView));
      if (process.env.VTT_EVIDENCE_DIR) {
        await second.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'classic-player-link-revoked.jpg'), quality: 78});
        await master.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'classic-master-link-rotated.jpg'), quality: 78});
      }

      await master.getByRole('button', {name: 'Закрыть доступ'}).click();
      await master.getByText('Доступ игроков закрыт', {exact: true}).waitFor();
      await waitRevoked(newcomer);
      await preview.restartRoom();
      await master.reload();
      await master.getByText('Доступ игроков закрыт', {exact: true}).waitFor();
      assert.equal(await master.locator('#join').getAttribute('href'), null);
      assert.equal(await master.locator('#position').textContent(), '1,1');
      for (const old of [offeredLink, rotatedLink]) {
        assert.equal((await playerState({'x-preview-room': old})).status(), 404);
        assert.equal((await first.request.get(new URL(old, roomUrl).href)).status(), 404);
      }

      await master.getByRole('button', {name: 'Создать новую ссылку'}).click();
      const reopenedLink = await waitNewLink(rotatedLink);
      assert.notEqual(reopenedLink, offeredLink);
      await preview.restartRoom();
      assert.equal((await newcomer.goto(new URL(reopenedLink, roomUrl).href)).status(), 200);
      await newcomer.waitForFunction(() => document.querySelector('#position').value === '1,1');
      assert.deepEqual(sameMap(await (await playerState({'x-preview-room': reopenedLink})).json()), sameMap(currentView));
      for (const old of [offeredLink, rotatedLink]) {
        assert.equal((await playerState({'x-preview-room': old})).status(), 404);
      }
      if (process.env.VTT_EVIDENCE_DIR) {
        await newcomer.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'classic-player-new-link.jpg'), quality: 78});
      }
      await editor.locator('[data-fine-step]').selectOption('1');
      await editor.locator('[data-fine-world]').waitFor({state: 'attached'});
      assert.equal(await launch.count(), 0, 'one-mile editor view cannot open a game');

      // Generate the accepted pre-existing save shape through the real editor
      // adapter, then open it through the actual browser file input.
      const savedEditor = createGenerationHarness(42);
      savedEditor.render().addFallbackTractToMap({q: 0, r: 0});
      const adapter = savedEditor.render();
      assert.ok(adapter.applyOneMilePreview(adapter.previewOneMile()));
      const legacyFine = JSON.parse(JSON.stringify(savedEditor.render().createSaveData()));
      legacyFine.map.physicalGrid.viewStep = 1;
      legacyFine.ui.selectedHex = {q: 0, r: 0};
      await editor.locator('input[type=file]').setInputFiles({name: 'saved-one-mile.json',
        mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacyFine))});
      await editor.waitForFunction(() => {
        const select = document.querySelector('[data-fine-step]');
        return select?.value === '1' && !select.disabled;
      });
      assert.equal(await launch.count(), 0);
      await editor.locator('[data-fine-step]').selectOption('6');
      await editor.locator('[data-selected-hex="0,0"]').waitFor({state: 'attached'});
      const [legacyMaster] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
      await legacyMaster.locator('#join').waitFor();
      await legacyMaster.waitForFunction(() => document.querySelector('#position').value === '0,0');
      await legacyMaster.close();
    }
    console.log(JSON.stringify({mode, fixture, contexts: contexts.length,
      durableRoomRestart: Boolean(privateDir), failedSavePreservedMove: Boolean(privateDir),
      revokedOpenTabs: mode === 'classic' ? 2 : undefined, closedAndRotatedLinksSurvivedRestart: mode === 'classic' || undefined,
      nativeLaunchFromSavedFineView: mode === 'classic' || undefined,
      allCells, firstCells, afterCells: after.cells.length, from: before.position, to: after.position,
      proposedDirection: 2, rotated, matchedEngravings: comparable.length, matchedBlends: textureMatches, editorRoutes: editorRouteCount, playerRoutesBefore: before.routes.length, playerRoutesAfter: after.routes.length, markTypes: [...new Set(markTypes)], marksBefore: before.marks.map(mark => mark.kind), marksAfter: after.marks.map(mark => mark.kind), masterPoints: editorIcons.length, playerPointsBefore: before.pois, playerPointsAfter: after.pois, editorImport: true, reopenedFromEditor: true, previewSurvivesReload: true, samePlayerLink: true}));
  } finally {
    try {
      await Promise.all(contexts.map(context => context.close()));
    } finally {
      try {
        await preview?.close();
      } finally {
        if (privateDir) await rm(privateDir, {recursive: true, force: true});
      }
    }
  }
}

async function verifyEditorRestore(browser) {
  const privateDir = await mkdtemp(join(tmpdir(), 'hexcrawl-vtt-ingress-'));
  const storagePath = join(privateDir, 'room.json');
  const masterContext = await browser.newContext({viewport: {width: 1120, height: 720}});
  const playerContext = await browser.newContext({viewport: {width: 420, height: 700}});
  const secondContext = await browser.newContext({viewport: {width: 880, height: 650}});
  masterContext.setDefaultTimeout(20000);
  playerContext.setDefaultTimeout(20000);
  secondContext.setDefaultTimeout(20000);
  let preview;
  try {
    preview = await startEditorPreview({storagePath, playerPort: 0});
    const editor = await masterContext.newPage();
    const player = await playerContext.newPage();
    const second = await secondContext.newPage();
    await editor.goto(preview.editorUrl);
    const seed = editor.getByRole('textbox', {name: /^(World seed|Seed мира)$/i});
    const launch = editor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/});
    await seed.fill('42');
    await seed.press('Tab');
    await editor.locator('polygon.hex.candidate').first().dispatchEvent('click');
    const selected = editor.locator('[data-selected-hex]');
    await selected.waitFor({state: 'attached'});
    const selection = await selected.getAttribute('data-selected-hex');
    const geography = await editor.evaluate(terrainSnapshot);
    const screenshot = async (page, label) => {
      if (process.env.VTT_EVIDENCE_DIR) {
        await page.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'generated-' + label + '.jpg'), quality: 78});
      }
    };
    await screenshot(editor, 'editor-before');
    const openRoom = async (live = true) => {
      const [page] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
      if (live) await page.locator('#join').waitFor();
      return page;
    };
    const masterScript = preview.roomUrl + '/ui.mjs';
    let interrupted = false;
    await masterContext.route(masterScript, async route => {
      interrupted = true;
      await route.abort('connectionfailed');
    });
    const [firstOpen, firstWindow] = await Promise.all([
      editor.waitForRequest(request => request.url() === preview.roomUrl + '/open' && request.method() === 'POST'),
      openRoom(false)
    ]);
    await firstWindow.waitForURL(url => url.origin === preview.roomUrl && url.pathname === '/master', {waitUntil: 'load'});
    assert.equal(interrupted, true);
    assert.equal(await firstWindow.evaluate(() => sessionStorage.getItem('vtt-preview-master')), null);
    await firstWindow.close();
    await masterContext.unroute(masterScript);
    const firstRoom = JSON.parse(await readFile(storagePath, 'utf8'));
    await editor.reload();
    await editor.getByText(/^(Карта игры восстановлена\.|Game map restored\.)$/).waitFor();
    assert.equal(await selected.getAttribute('data-selected-hex'), selection);
    const [retry, revivedMaster] = await Promise.all([
      editor.waitForRequest(request => request.url() === preview.roomUrl + '/open' && request.method() === 'POST'),
      openRoom()
    ]);
    assert.equal(retry.postDataJSON().resume, true);
    let master = revivedMaster;
    const originalLink = await master.locator('#join').getAttribute('href');
    const playerUrl = new URL(originalLink).href;
    assert.equal(new URL(playerUrl).pathname, firstRoom.playerPath);
    assert.equal(await master.locator('#position').textContent(), selection);
    assert.equal(new URL(playerUrl).origin, preview.playerUrl);
    assert.notEqual(preview.playerUrl, preview.roomUrl);
    assert.equal((await player.request.get(preview.playerUrl + '/master')).status(), 404);
    assert.equal((await firstOpen.allHeaders()).authorization, undefined,
      'the public editor does not receive or send a reusable room-service credential');
    assert.equal((await player.request.post(preview.playerUrl + '/open', {
      headers: {origin: preview.editorUrl}, data: firstOpen.postData()
    })).status(), 404);
    const masterKey = await master.evaluate(() => sessionStorage.getItem('vtt-preview-master'));
    assert.equal((await player.request.get(preview.playerUrl + '/state', {
      headers: {authorization: 'Bearer ' + masterKey}
    })).status(), 404);
    await Promise.all([player.goto(playerUrl), second.goto(playerUrl)]);
    await player.waitForFunction(value => document.querySelector('#position').value === value, selection);
    await second.waitForFunction(value => document.querySelector('#position').value === value, selection);
    const state = (page = player) => page.evaluate(async () => {
      const response = await fetch('/state', {headers: {'x-preview-room': location.pathname}});
      if (!response.ok) throw new Error('Expected an active player view');
      return response.json();
    });
    const initial = await state();
    assert.deepEqual(await state(second), initial);
    assert.ok(initial.cells.length < await master.locator('[data-cell]').count());
    const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
    const direction = directions.findIndex(([dq, dr]) =>
      initial.cells.some(cell => cell.q === initial.position.q + dq && cell.r === initial.position.r + dr));
    assert.notEqual(direction, -1, 'the generated map has a traversable adjacent hex');
    const propose = async dir => {
      await player.locator(`[data-direction="${dir}"]`).click();
      await master.locator(`[data-proposal="${dir}"]`).waitFor();
    };
    await propose(direction);
    await master.locator('#confirm').click();
    const [dq, dr] = directions[direction];
    const destination = `${initial.position.q + dq},${initial.position.r + dr}`;
    await player.waitForFunction(value => document.querySelector('#position').value === value, destination);
    const confirmed = await state();
    await screenshot(player, 'player-before-service-restart');

    const restoreEditor = async (live = true) => {
      await master.close();
      await editor.reload();
      await editor.getByText(/^(Карта игры восстановлена\.|Game map restored\.)$/).waitFor();
      assert.equal(await selected.getAttribute('data-selected-hex'), selection);
      assert.equal(await seed.inputValue(), '42');
      assert.deepEqual(await editor.evaluate(terrainSnapshot), geography);
      master = await openRoom(live);
      if (!live) return;
      assert.equal(await master.locator('#join').getAttribute('href'), originalLink);
      assert.equal(await master.locator('#position').textContent(), destination);
      assert.equal(player.url(), playerUrl);
    };
    await preview.restartRoom();
    await restoreEditor();
    assert.deepEqual(await state(), confirmed);
    assert.deepEqual(await state(second), confirmed);
    await propose((direction + 3) % 6);
    const pending = await state();
    await restoreEditor();
    assert.equal(await master.locator('[data-proposal]').getAttribute('data-proposal'), String(pending.proposal));
    assert.deepEqual(await state(), pending);
    await second.reload();
    await second.waitForFunction(value => document.querySelector('#position').value === value, destination);
    assert.deepEqual(await state(second), pending);
    await screenshot(editor, 'editor-restored');
    await screenshot(master, 'master-after-reopen');
    await screenshot(player, 'player-original-link');

    const offlineNotice = 'Комната недоступна. Показано последнее сохранённое положение.';
    const savedRevision = await master.waitForFunction(async expected => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('hexcrawl-vtt', 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        const records = await new Promise((resolve, reject) => {
          const request = db.transaction('confirmed-rooms').objectStore('confirmed-rooms').getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const snapshot = records.find(record => record.revision >= expected);
        return snapshot || false;
      } finally {
        db.close();
      }
    }, pending.revision).then(handle => handle.jsonValue());
    assert.equal(`${savedRevision.position.q},${savedRevision.position.r}`, destination);
    assert.ok(savedRevision.history.includes(destination));
    assert.equal(Object.hasOwn(savedRevision, 'proposal'), false, 'unconfirmed arrow stays in the live room');
    assert.equal(Object.hasOwn(savedRevision, 'playerPath'), false, 'browser fallback does not offer a stale link');
    await rename(storagePath, storagePath + '.held');
    try {
      await preview.restartRoom();
      await restoreEditor(false);
      await master.getByText(offlineNotice, {exact: true}).waitFor();
      assert.equal(await master.locator('#position').textContent(), destination);
      assert.equal(await master.locator('#share-controls').isVisible(), false);
      assert.equal(await master.locator('#confirm').isDisabled(), true);
      assert.equal(await master.locator('#choices button:disabled').count(), 6);
      assert.equal(await master.locator('[data-proposal]').count(), 0);
      assert.equal((await master.request.get(playerUrl)).status(), 404, 'resume does not silently create a room');
      await screenshot(master, 'master-saved-position');
    } finally {
      await rename(storagePath + '.held', storagePath);
    }
    await preview.restartRoom();
    await master.locator('#join').waitFor();
    assert.equal(await master.locator('#join').getAttribute('href'), originalLink);
    assert.equal(await master.locator('[data-proposal]').getAttribute('data-proposal'), String(pending.proposal));
    await player.reload();
    await player.waitForFunction(value => document.querySelector('#position').value === value, destination);
    assert.deepEqual(await state(), pending);
    console.log(JSON.stringify({mode: 'classic-generated-editor-restore', seed:42, startingHex:selection,
      confirmedHex:destination, sameEditorGeography:true, samePlayerLink:true,
      confirmedReload:true, pendingProposalReload:true, fileImport:false, distinctPlayerOrigin:true,
      playerContexts:2, deniedMasterRoutesOnPlayerOrigin:true, samePlayerLinkAfterServiceRestart:true,
      browserConfirmedSnapshot:true, offlineReadOnly:true, oldRoomReconnected:true,
      firstMasterLoadInterrupted:true, resumedOriginalRoomFromCachedMap:true}));
  } finally {
    try {
      await Promise.all([masterContext.close(), playerContext.close(), secondContext.close()]);
    } finally {
      try {
        await preview?.close();
      } finally {
        await rm(privateDir, {recursive: true, force: true});
      }
    }
  }
}

async function verifyLakeStartAndMove(browser) {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  let preview;
  try {
    preview = await startEditorPreview({playerPort: 0});
    const [editor, player] = await Promise.all(contexts.map(context => context.newPage()));
    await editor.goto(preview.editorUrl);
    await editor.locator('.controls--transfer > button:not([disabled])').waitFor();
    const save = JSON.parse(await readFile(new URL('../fixtures/terrain-display-map.json', import.meta.url), 'utf8'));
    const lake = '-2,12';
    assert.ok(!save.map.regions.some(region => region.hexes.some(({q, r}) => `${q},${r}` === lake)));
    assert.equal(save.map.terrainByHexKey[lake], undefined);
    save.map.terrainByHexKey[lake] = {terrainOverride: 'lake', lakeId: save.counters.nextLakeId++};
    save.ui.selectedHex = {q: -2, r: 12};
    await editor.locator('input[type=file]').setInputFiles({name: 'lake-map.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(save))});
    await editor.locator(`[data-selected-hex="${lake}"]`).waitFor({state: 'attached'});
    const launch = editor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/});
    const [master] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
    await master.locator('#join').waitFor();
    const playerUrl = await master.locator('#join').getAttribute('href');
    await player.goto(playerUrl);
    const waitPosition = expected => Promise.all([master, player].map(page =>
      page.waitForFunction(position => document.querySelector('#position').value === position, expected)));
    const state = () => player.evaluate(async () =>
      (await fetch('/state', {headers: {'x-preview-room': location.pathname}})).json());
    async function verifyWater(expected) {
      await waitPosition(expected);
      const current = (await state()).cells.find(cell => `${cell.q},${cell.r}` === expected);
      assert.equal(current.water, 'lake');
      assert.ok(!Object.hasOwn(current, 'biome'), 'water view carries only its visible terrain');
    }
    async function move(direction, expected) {
      await player.locator(`[data-direction="${direction}"]`).click();
      await master.locator(`[data-proposal="${direction}"]`).waitFor();
      await master.locator('#confirm').click();
      await waitPosition(expected);
    }
    await verifyWater(lake);
    await move(2, '-2,11');
    await move(5, lake);
    await verifyWater(lake);
    await move(2, '-2,11');
    await move(2, '-2,10');
    await verifyWater('-2,10');
    await player.reload();
    await verifyWater('-2,10');
    assert.equal(player.url(), playerUrl);
    if (process.env.VTT_EVIDENCE_DIR) {
      await player.screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'player-after-water-entry.jpg'), quality: 72});
    }
    console.log(JSON.stringify({mode: 'lake-start-and-return', regionlessLake: lake,
      waterInRegion: '-2,10', waterBiomeOmittedAfterReload: true, playerLinkPreserved: true}));
  } finally {
    await Promise.all(contexts.map(context => context.close()));
    await preview?.close();
  }
}

async function verifyTrailFerry(browser) {
  const masterContext = await browser.newContext({viewport: {width: 1100, height: 680}});
  const playerContext = await browser.newContext({viewport: {width: 900, height: 620}});
  const preview = await startEditorPreview({playerPort: 0});
  try {
    const [editor, player] = await Promise.all([masterContext.newPage(), playerContext.newPage()]);
    await editor.goto(preview.editorUrl);
    await editor.locator('.controls--transfer > button:not([disabled])').waitFor();
    const fixture = JSON.parse(await readFile(new URL('../fixtures/e5-river-editor.json', import.meta.url), 'utf8'));
    fixture.map.roads[0].segments[0].kind = 'trail';
    fixture.map.crossings[0].kind = 'ferry';
    fixture.map.terrainByHexKey['2,0'] = {terrainOverride: 'lake', lakeId: fixture.counters.nextLakeId++};
    await editor.locator('input[type=file]').setInputFiles({name: 'trail-ferry.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fixture))});
    await editor.locator('[data-selected-hex="0,0"]').waitFor({state: 'attached'});
    const launch = editor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/});
    const [master] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
    await master.locator('#join').waitFor();
    const native = editor.locator('.river-crossing--ferry');
    assert.equal(await native.locator('line.trail-line').count(), 2, 'editor shows both trail approaches');
    const nativeGlyph = await native.locator('.trail-ferry-mark').evaluate(element => {
      const [x, y] = element.parentElement.dataset.vttCrossingAnchor.split(',').map(Number);
      return element.getAttribute('points').trim().split(/\s+/).map(point => {
        const [px, py] = point.split(',').map(Number);
        return [px - x, py - y];
      });
    });
    assert.ok(nativeGlyph.length > 4);
    const waitPosition = expected => player.waitForFunction(position =>
      document.querySelector('#position')?.value === position, expected);
    const state = () => player.evaluate(async () => {
      const response = await fetch('/state', {headers: {'x-preview-room': location.pathname}});
      return response.json();
    });
    await player.goto(await master.locator('#join').getAttribute('href'));
    const moveEast = async expected => {
      await player.locator('[data-direction="0"]').click();
      await master.locator('[data-proposal="0"]').waitFor();
      await master.locator('#confirm').click();
      await waitPosition(expected);
    };
    await waitPosition('0,0');
    for (const bank of ['0,0', '1,0']) {
      if (bank === '1,0') await moveEast(bank);
      const view = await state();
      verifyRouteBounds(view);
      const [mark] = view.marks.filter(item => item.kind === 'ferry');
      const glyphs = view.routes.filter(route => route.kind === 'ferry');
      assert.equal(glyphs.length, 1);
      assert.equal(glyphs[0].points.length, nativeGlyph.length);
      for (const [[x, y], [dx, dy]] of glyphs[0].points.map((point, index) => [point, nativeGlyph[index]])) {
        assert.ok(Math.hypot(x - mark.x - dx, y - mark.y - dy) < 1e-6, 'complete native ferry geometry');
      }
      assert.equal(view.routes.filter(route => route.kind === 'trail').length, 1, 'only the current trail approach');
      assert.equal(await player.locator('#map [data-route-kind="ferry"]').count(), 1);
      if (bank === '0,0' && process.env.VTT_EVIDENCE_DIR) {
        await player.locator('#map').evaluate((map, crossing) =>
          map.setAttribute('viewBox', [crossing.x - 60, crossing.y - 45, 120, 90].join(' ')), mark);
        await player.locator('#map').screenshot({path: join(process.env.VTT_EVIDENCE_DIR, 'trail-ferry-player.jpg'), quality: 72});
      }
    }
    await moveEast('2,0');
    const away = await state();
    assert.ok(!away.marks.some(mark => mark.kind === 'ferry'));
    assert.ok(!away.routes.some(route => route.kind === 'ferry' || route.kind === 'trail'));
    console.log(JSON.stringify({mode:'trail-ferry',banks:['0,0','1,0'],nativeApproaches:2,wholeGlyph:true,
      visibleTrailApproachesPerBank:1,hiddenFrom:'2,0'}));
  } finally {
    await Promise.all([masterContext.close(), playerContext.close()]);
    await preview.close();
  }
}

const browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
try {
  for (const scenario of scenarios) await verifyRoom(browser, scenario);
  await verifyEditorRestore(browser);
  await verifyLakeStartAndMove(browser);
  await verifyTrailFerry(browser);
} finally {
  await browser.close();
}
