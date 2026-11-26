// One scenario covers the separate player payload and shared/reloaded move.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {startEditorPreview} from '../../scripts/vtt-preview/editor.mjs';

const {editorUrl, roomUrl, close} = await startEditorPreview();
let browser;
try {
  browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const editor = await browser.newPage({viewport: {width: 1120, height: 720}});
  await editor.goto(editorUrl);
  const launch = editor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/});
  await launch.waitFor();
  assert.ok(await launch.isDisabled(), 'the empty editor cannot start a room');
  const save = JSON.parse(await readFile(new URL('../fixtures/classic-six-regions-seed42.json', import.meta.url), 'utf8'));
  save.ui.selectedHex = {q: 0, r: 1};
  save.map.gmNotesByHexKey = {'0,1': 'PRIVATE-EDITOR-FIXTURE'};
  await editor.locator('input[type=file]').setInputFiles({name: 'classic-map.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(save))});
  await editor.locator('[data-selected-hex="0,1"]').waitFor({state: 'attached'});
  if (process.env.VTT_EVIDENCE_DIR) {
    await editor.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/editor-entry.jpg', quality: 78});
  }
  const [master] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
  await master.locator('#join').waitFor();
  const offeredLink = await master.locator('#join').getAttribute('href');
  const playerUrl = new URL(offeredLink, roomUrl).href;
  assert.equal(new URL(master.url()).origin, roomUrl);
  assert.equal(new URL(editor.url()).origin, editorUrl);
  assert.ok(await editor.locator('[data-selected-hex="0,1"]').count(), 'editor keeps its loaded map');
  const first = await browser.newPage({viewport: {width: 900, height: 600}});
  const second = await browser.newPage({viewport: {width: 420, height: 700}});
  const pages = [master, first, second];
  const waitPosition = q => Promise.all(pages.map(page =>
    page.waitForFunction(expected => document.querySelector('#position').value === expected, q)));
  await Promise.all([first.goto(playerUrl), second.goto(playerUrl)]);
  await waitPosition('0,1');
  const firstCells = await first.locator('[data-cell]').count();
  const allCells = await master.locator('[data-cell]').count();
  assert.ok(firstCells > 0 && firstCells < allCells, 'player sees only local cells');
  assert.equal(await second.locator('[data-cell]').count(), firstCells);
  const snapshotPlayer = () => first.evaluate(async () => {
    const response = await fetch('/state', {headers: {'x-preview-room': location.pathname}});
    return response.json();
  });
  const before = await snapshotPlayer();
  assert.deepEqual(Object.keys(before).sort(), ['cells', 'position', 'proposal', 'revision']);
  assert.deepEqual(Object.keys(before.cells[0]).sort(), ['biome', 'height', 'q', 'r', 'water']);
  assert.equal((await fetch(roomUrl + '/test/fixtures/classic-six-regions-seed42.json')).status, 404);
  assert.ok(!JSON.stringify(before).includes('PRIVATE-EDITOR-FIXTURE'));
  assert.equal((await fetch(roomUrl + '/open', {method: 'POST'})).status, 404);
  assert.equal(await first.locator('#confirm').isVisible(), false);

  await first.locator('[data-direction="2"]').click();
  await Promise.all(pages.map(page => page.locator('[data-proposal="2"]').waitFor()));
  await waitPosition('0,1');
  assert.deepEqual((await snapshotPlayer()).cells, before.cells);
  await master.reload();
  await master.locator('[data-proposal="2"]').waitFor();
  assert.equal(await master.locator('#join').getAttribute('href'), offeredLink);
  if (process.env.VTT_EVIDENCE_DIR) {
    await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/master-before.jpg', quality: 78});
  }
  await master.locator('#confirm').click();
  await waitPosition('0,0');
  await Promise.all(pages.map(page => page.locator('[data-proposal]').waitFor({state: 'detached'})));
  const after = await snapshotPlayer();
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
    await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/master-after.jpg', quality: 78});
    await second.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/player-after.jpg', quality: 78});
  }
  console.log(JSON.stringify({seed: 42, fixture: 'classic-six-regions-seed42', contexts: 3,
    allCells, firstCells, afterCells: after.cells.length, from: before.position, to: after.position,
    proposedDirection: 2, editorImport: true, reopenedFromEditor: true, previewSurvivesReload: true, samePlayerLink: true}));
} finally {
  await browser?.close();
  await close();
}
