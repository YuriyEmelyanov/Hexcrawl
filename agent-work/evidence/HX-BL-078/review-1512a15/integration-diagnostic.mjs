import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
import {startEditorPreview} from '../../scripts/vtt-preview/editor.mjs';

const dir = await mkdtemp(join(tmpdir(), 'hx10-integration-'));
const browser = await chromium.launch({executablePath: '/tmp/chromium', headless: true, args: ['--no-sandbox','--disable-dev-shm-usage']});
let preview;
try {
  preview = await startEditorPreview({storagePath:join(dir,'room.json'), playerPort:0});
  const editor = await browser.newPage({viewport:{width:1440,height:960}});
  const player = await browser.newPage({viewport:{width:420,height:700}});
  await editor.goto(preview.editorUrl);
  const caseName = process.env.HX10_CASE;
  const duplicate = caseName === 'duplicate';
  const fixture = JSON.parse(await readFile(caseName ? '/tmp/hx10-crossing.json' : '/tmp/hx10-seed44.json','utf8'));
  if (duplicate) {
    const road = fixture.map.roads.find(r => r.segments.some(s => s.from.q === 2 && s.from.r === -1 && s.to.q === 3 && s.to.r === -1));
    const segment = road.segments.find(s => s.from.q === 2 && s.from.r === -1 && s.to.q === 3 && s.to.r === -1);
    road.segments.push({...segment, from:segment.to, to:segment.from});
  }
  fixture.ui.selectedHex = {q:2,r:-1};
  await editor.locator('.controls--transfer > button:not([disabled])').waitFor();
  await editor.locator('input[type=file]').setInputFiles({name:'seed44.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await editor.locator('[data-selected-hex="2,-1"]').waitFor({state:'attached'});
  const lines = editor.locator('.rivers-layer > polyline.river-polyline');
  await lines.first().waitFor({state:'attached'});
  const initialLineCount = await lines.count();
  await editor.getByRole('button',{name:/^(Редактировать|Edit)$/}).click();
  await editor.locator('[data-add-river]').click();
  await editor.locator('[data-river-draft-choice="96.995,-28"]').click();
  await editor.locator('[data-river-draft-choice="96.995,-56"]').click();
  await editor.locator('[data-river-finish]').click();
  await editor.locator('[data-delta-fullness]').selectOption(caseName ? '3' : '2');
  await editor.locator('[data-river-confirm]').click();
  await editor.locator('[data-river-preview]').waitFor({state:'detached'});
  assert.equal(await lines.count(),initialLineCount+1);
  await editor.getByRole('button',{name:/^(Готово|Done)$/}).click();
  const launched = editor.waitForEvent('popup');
  await editor.getByRole('button',{name:/^(Гекскроул|Hexcrawl)$/}).click();
  const master = await launched;
  await master.locator('#join').waitFor();
  const playerUrl = await master.locator('#join').getAttribute('href');
  await player.goto(playerUrl);
  await player.waitForFunction(() => document.querySelector('#position').value === '2,-1');
  const masterLines = master.locator('[data-route-kind="river"]');
  assert.equal(await masterLines.count(),initialLineCount+1,'master receives the new editor arm');
  assert.ok(await player.locator('[data-route-kind="river"]').count() > 0);
  assert.ok((await player.locator('[data-cell]').count()) < (await master.locator('[data-cell]').count()));
  if (caseName) {
    const editorFerry = await editor.locator('.trail-ferry-mark').count();
    const playerFerry = await player.locator('[data-route-kind="ferry"]').count();
    const masterFerry = await master.locator('[data-route-kind="ferry"]').count();
    const playerMarks = await player.locator('[data-mark-kind="ferry"]').count();
    const nativeApproaches = await editor.locator('.river-crossing--ferry line.trail-line').count();
    const playerApproaches = await player.locator('[data-route-kind="trail"]').count();
    console.log(JSON.stringify({mode:'integrated-legacy-trail-ferry',caseName,editorFerry,playerFerry,masterFerry,playerMarks,nativeApproaches,playerApproaches,playerStart:'2,-1'}));
    await editor.screenshot({path:'proof/integration-'+caseName+'-ferry-editor.jpg',quality:78});
    await player.screenshot({path:'proof/integration-'+caseName+'-ferry-player.jpg',quality:78});
    assert.equal(editorFerry,1);
    assert.equal(playerFerry,1);
    assert.equal(masterFerry,1);
    assert.equal(playerMarks,1);
    assert.equal(nativeApproaches,2);
    assert.equal(playerApproaches,1);
  }
  const waitPosition = (page, target) => page.waitForFunction(v=>document.querySelector('#position').value===v,target);
  const choices = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const cells = await player.locator('[data-cell]').evaluateAll(xs=>xs.map(x=>x.dataset.cell));
  const direction = choices.findIndex(([q,r])=>cells.includes(`${2+q},${-1+r}`));
  assert.ok(direction>=0);
  const [q,r] = choices[direction], next = `${2+q},${-1+r}`;
  await player.locator(`[data-direction="${direction}"]`).click();
  await master.locator(`[data-proposal="${direction}"]`).waitFor();
  await master.locator('#confirm').click();
  await Promise.all([waitPosition(master,next),waitPosition(player,next)]);
  await preview.restartRoom();
  await master.reload();
  await master.locator('#join').waitFor();
  assert.equal(await master.locator('#join').getAttribute('href'),playerUrl);
  await waitPosition(player,next);
  assert.equal(await masterLines.count(),initialLineCount+1);
  if (duplicate) {
    const roomFile = join(dir,'room.json');
    const snapshot = JSON.parse(await readFile(roomFile,'utf8'));
    const ferry = snapshot.routes.find(route => route.kind === 'ferry');
    assert.ok(ferry);
    assert.equal(snapshot.crossingArtworkVersion,3);
    await writeFile(roomFile, JSON.stringify({...snapshot, crossingArtworkVersion:2, routes:[...snapshot.routes,ferry]}));
    await preview.restartRoom();
    await master.reload();
    await master.locator('#map [data-route-kind="ferry"]').nth(1).waitFor({state:'attached'});
    await player.reload();
    await player.locator('#map [data-route-kind="ferry"]').nth(1).waitFor({state:'attached'});
    await player.locator('#map').screenshot({path:'proof/v2-ferry-player.jpg',quality:85});

    const [reopened] = await Promise.all([
      editor.waitForEvent('popup'),
      editor.getByRole('button',{name:/^(Гекскроул|Hexcrawl)$/}).click()
    ]);
    await reopened.locator('#join').waitFor();
    await Promise.all([waitPosition(reopened,next),waitPosition(player,next)]);
    assert.equal(await reopened.locator('#join').getAttribute('href'),playerUrl);
    await player.locator('#map [data-route-kind="ferry"]').nth(1).waitFor({state:'detached'});
    assert.equal(await player.locator('#map [data-route-kind="ferry"]').count(),1);
    assert.equal(await reopened.locator('#map [data-route-kind="ferry"]').count(),1);
    assert.equal(await player.locator('#map [data-mark-kind="ferry"]').count(),1);
    assert.equal(await player.locator('#map [data-route-kind="trail"]').count(),1);
    const upgraded = JSON.parse(await readFile(roomFile,'utf8'));
    assert.equal(upgraded.crossingArtworkVersion,3);
    assert.equal(upgraded.routes.filter(route => route.kind === 'ferry').length,1);
    assert.deepEqual(upgraded.state.position, snapshot.state.position);
    assert.equal(upgraded.state.revision,snapshot.state.revision+1);
    await player.locator('#map').screenshot({path:'proof/v3-ferry-player.jpg',quality:85});
    console.log(JSON.stringify({mode:'cached-room-v2-to-v3',confirmedPosition:next,invitePreserved:true,alreadyOpenPlayerRefreshed:true,ferryGlyphs:[2,1],artworkVersions:[2,3],revisionIncrement:1}));
  }
  await editor.screenshot({path:'proof/integration-delta-editor.jpg',quality:78});
  await master.screenshot({path:'proof/integration-delta-master.jpg',quality:78});
  await player.screenshot({path:'proof/integration-delta-player.jpg',quality:78});
  console.log(JSON.stringify({mode:'integrated-seed44-manual-delta-to-vtt',beforeRiverStrokes:initialLineCount,afterRiverStrokes:await masterLines.count(),playerScopedMap:true,from:'2,-1',to:next,sameInviteAfterRestart:true}));
} finally {
  await browser.close();
  await preview?.close();
  await rm(dir,{recursive:true,force:true});
}
