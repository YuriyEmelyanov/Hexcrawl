// One scenario covers the separate player payload and shared/reloaded move.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {startPreview} from '../../scripts/vtt-preview/server.mjs';

const {server, masterUrl, playerUrl, base} = await startPreview();
let browser;
try {
  browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const master = await browser.newPage({viewport: {width: 900, height: 600}});
  const first = await browser.newPage({viewport: {width: 900, height: 600}});
  const second = await browser.newPage({viewport: {width: 420, height: 700}});
  const pages = [master, first, second];
  const waitPosition = q => Promise.all(pages.map(page =>
    page.waitForFunction(expected => document.querySelector('#position').value === expected, q)));
  await Promise.all([master.goto(masterUrl), first.goto(playerUrl), second.goto(playerUrl)]);
  await waitPosition('0,0');
  const firstCells = await first.locator('[data-cell]').count();
  const allCells = await master.locator('[data-cell]').count();
  assert.ok(firstCells > 0 && firstCells < allCells, 'player sees only local cells');
  assert.equal(await second.locator('[data-cell]').count(), firstCells);
  const offeredLink = await master.locator('#join').getAttribute('href');
  const snapshotPlayer = () => first.evaluate(async () => {
    const response = await fetch('/state', {headers: {'x-preview-room': location.pathname}});
    return response.json();
  });
  const before = await snapshotPlayer();
  assert.deepEqual(Object.keys(before).sort(), ['cells', 'position', 'proposal', 'revision']);
  assert.deepEqual(Object.keys(before.cells[0]).sort(), ['biome', 'height', 'q', 'r', 'water']);
  assert.equal((await fetch(base + '/test/fixtures/classic-six-regions-seed42.json')).status, 404);
  assert.equal(await first.locator('#confirm').isVisible(), false);

  await first.locator('[data-direction="5"]').click();
  await Promise.all(pages.map(page => page.locator('[data-proposal="5"]').waitFor()));
  await waitPosition('0,0');
  assert.deepEqual((await snapshotPlayer()).cells, before.cells);
  await master.reload();
  await master.locator('[data-proposal="5"]').waitFor();
  assert.equal(await master.locator('#join').getAttribute('href'), offeredLink);
  if (process.env.VTT_EVIDENCE_DIR) {
    await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/master-before.jpg', quality: 78});
  }
  await master.locator('#confirm').click();
  await waitPosition('0,1');
  await Promise.all(pages.map(page => page.locator('[data-proposal]').waitFor({state: 'detached'})));
  const after = await snapshotPlayer();
  assert.notDeepEqual(after.cells, before.cells, 'confirmed move updates the authorised projection');
  await master.reload();
  await waitPosition('0,1');
  assert.equal(await master.locator('#join').getAttribute('href'), offeredLink);
  await second.reload();
  await waitPosition('0,1');
  assert.deepEqual(await snapshotPlayer(), after);
  if (process.env.VTT_EVIDENCE_DIR) {
    await master.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/master-after.jpg', quality: 78});
    await second.screenshot({path: process.env.VTT_EVIDENCE_DIR + '/player-after.jpg', quality: 78});
  }
  console.log(JSON.stringify({seed: 42, fixture: 'classic-six-regions-seed42', contexts: 3,
    allCells, firstCells, afterCells: after.cells.length, from: before.position, to: after.position,
    proposedDirection: 5, previewSurvivesReload: true, samePlayerLink: true}));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
