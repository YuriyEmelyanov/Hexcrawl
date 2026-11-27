import assert from 'node:assert/strict';
import {execFileSync, spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer as createHttpsServer} from 'node:https';
import {request as httpRequest} from 'node:http';
import {createServer as createNetServer} from 'node:net';
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {extname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {chromium} from 'playwright';
import {startPreview} from '../../scripts/vtt-preview/server.mjs';

const loopback = '127.0.0.1';
const evidenceDir = resolve('reports/HX-BL-078/production-https');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'], ['.svg', 'image/svg+xml']
]);

function listen(server, port) {
  return new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(port, loopback, () => {
      server.off('error', reject);
      resolveListen();
    });
  });
}

function close(server) {
  if (!server?.listening) return Promise.resolve();
  return new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
}

async function reservePort() {
  const server = createNetServer();
  await listen(server, 0);
  const port = server.address().port;
  await close(server);
  return port;
}

function runBuild(env) {
  return new Promise((resolveBuild, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
      env: {...process.env, ...env}, stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 ? resolveBuild() :
      reject(new Error(`production build failed (${signal ?? code})`)));
  });
}

async function builtAssetsContain(value, directory = resolve('dist')) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (await builtAssetsContain(value, path)) return true;
    } else if ((await readFile(path)).includes(Buffer.from(value))) {
      return true;
    }
  }
  return false;
}

function tlsMaterial(directory) {
  const keyPath = join(directory, 'key.pem');
  const certPath = join(directory, 'cert.pem');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-keyout', keyPath, '-out', certPath, '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=IP:127.0.0.1'
  ], {stdio: 'ignore'});
  return Promise.all([readFile(keyPath), readFile(certPath)]).then(([key, cert]) => ({key, cert}));
}

function staticServer(tls, root) {
  return createHttpsServer(tls, async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'https://localhost').pathname);
      const requested = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      const fromRoot = relative(root, requested);
      if (fromRoot === '..' || fromRoot.startsWith('..' + sep) || isAbsolute(fromRoot)) throw new Error('outside build');
      const body = await readFile(requested);
      res.writeHead(200, {'content-type': contentTypes.get(extname(requested)) ?? 'application/octet-stream',
        'cache-control': 'no-store'});
      res.end(body);
    } catch {
      res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
      res.end('Not found');
    }
  });
}

function proxyServer(tls, target) {
  return createHttpsServer(tls, (req, res) => {
    const base = target();
    if (!base) {
      res.writeHead(503).end();
      return;
    }
    const destination = new URL(req.url, base);
    const upstream = httpRequest(destination, {
      method: req.method,
      headers: {...req.headers, host: destination.host}
    }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    upstream.once('error', error => {
      if (!res.headersSent) res.writeHead(502, {'content-type': 'text/plain; charset=utf-8'});
      res.end(error.message);
    });
    req.pipe(upstream);
  });
}

const temporary = await mkdtemp(join(tmpdir(), 'hexcrawl-vtt-production-'));
const storagePath = join(temporary, 'room.json');
const [editorPort, roomPort, playerPort] = await Promise.all([reservePort(), reservePort(), reservePort()]);
const editorOrigin = `https://${loopback}:${editorPort}`;
const roomOrigin = `https://${loopback}:${roomPort}`;
const playerOrigin = `https://${loopback}:${playerPort}`;
const forbiddenBuildSecret = 'HX078_REUSABLE_SERVER_SECRET_' + randomBytes(12).toString('hex');
let service;
let browser;
let editorServer;
let roomProxy;
let playerProxy;

try {
  const tls = await tlsMaterial(temporary);
  await runBuild({HEXCRAWL_VTT_PREVIEW_URL: roomOrigin, HEXCRAWL_VTT_PREVIEW_KEY: forbiddenBuildSecret});
  assert.equal(await builtAssetsContain(forbiddenBuildSecret), false,
    'a reusable server credential must never be shipped in public assets');
  const startRoom = () => startPreview({storagePath, playerPort: 0, playerOrigin,
    editorOrigin: () => editorOrigin});
  service = await startRoom();
  editorServer = staticServer(tls, resolve('dist'));
  roomProxy = proxyServer(tls, () => service?.base);
  playerProxy = proxyServer(tls, () => service?.playerBase);
  await Promise.all([
    listen(editorServer, editorPort), listen(roomProxy, roomPort), listen(playerProxy, playerPort)
  ]);

  browser = await chromium.launch({executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
  const masterContext = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 1120, height: 720}});
  const playerContext = await browser.newContext({ignoreHTTPSErrors: true, viewport: {width: 420, height: 700}});
  const editor = await masterContext.newPage();
  const player = await playerContext.newPage();
  await editor.goto(editorOrigin);
  await editor.locator('.controls--transfer > button:not([disabled])').waitFor();
  const fixture = JSON.parse(await readFile(new URL('../fixtures/classic-six-regions-seed42.json', import.meta.url), 'utf8'));
  fixture.ui.selectedHex = {q: 0, r: 1};
  await editor.locator('input[type=file]').setInputFiles({name: 'classic-map.json',
    mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture))});
  await editor.locator('[data-selected-hex="0,1"]').waitFor({state: 'attached'});
  const launch = editor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/});
  assert.ok(await launch.isVisible(), 'production build exposes the VTT entry');
  const [master] = await Promise.all([editor.waitForEvent('popup'), launch.click()]);
  await master.locator('#join').waitFor();
  assert.equal(new URL(master.url()).origin, roomOrigin);
  const playerLink = await master.locator('#join').getAttribute('href');
  assert.equal(new URL(playerLink).origin, playerOrigin);
  await player.goto(playerLink);
  const waitPosition = (page, expected) => page.waitForFunction(position =>
    document.querySelector('#position')?.value === position, expected);
  await Promise.all([waitPosition(master, '0,1'), waitPosition(player, '0,1')]);
  const beforeCells = await player.locator('[data-cell]').count();
  assert.ok(beforeCells > 0 && beforeCells < await master.locator('[data-cell]').count());
  await player.locator('[data-direction="2"]').click();
  await master.locator('[data-proposal="2"]').waitFor();
  await master.locator('#confirm').click();
  await Promise.all([waitPosition(master, '0,0'), waitPosition(player, '0,0')]);

  // A tab opened from the existing editor starts with a copy of its session
  // state. A second game must keep its binding separate after both reload.
  const [secondEditor] = await Promise.all([
    editor.waitForEvent('popup'),
    editor.evaluate(() => { window.open(location.href, '_blank'); })
  ]);
  await secondEditor.getByText(/^(Карта игры восстановлена\.|Game map restored\.)$/).waitFor();
  await secondEditor.locator('.controls--transfer > button:not([disabled])').waitFor();
  const secondFixture = structuredClone(fixture);
  secondFixture.ui.selectedHex = {q: 1, r: 1};
  await secondEditor.locator('input[type=file]').setInputFiles({name: 'second-map.json',
    mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(secondFixture))});
  await secondEditor.locator('[data-selected-hex="1,1"]').waitFor({state: 'attached'});
  const [secondMaster] = await Promise.all([
    secondEditor.waitForEvent('popup'),
    secondEditor.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/}).click()
  ]);
  await secondMaster.locator('#join').waitFor();
  const secondPlayerLink = await secondMaster.locator('#join').getAttribute('href');
  assert.notEqual(secondPlayerLink, playerLink, 'two games on the same map receive independent rooms');
  const secondPlayer = await playerContext.newPage();
  await secondPlayer.goto(secondPlayerLink);
  await Promise.all([waitPosition(secondMaster, '1,1'), waitPosition(secondPlayer, '1,1')]);
  await waitPosition(player, '0,0');

  await service.close();
  service = await startRoom();
  await Promise.all([master.reload(), player.reload(), secondMaster.reload(), secondPlayer.reload()]);
  await Promise.all([
    waitPosition(master, '0,0'), waitPosition(player, '0,0'),
    waitPosition(secondMaster, '1,1'), waitPosition(secondPlayer, '1,1')
  ]);
  assert.equal(player.url(), playerLink, 'the player keeps the same HTTPS room link after restart');
  assert.equal(secondPlayer.url(), secondPlayerLink, 'the second room keeps its own player link after restart');
  assert.ok(await player.locator('[data-cell]').count() < await master.locator('[data-cell]').count(),
    'the player still receives only the authorised projection');

  await Promise.all([master.close(), secondMaster.close()]);
  const reopen = async page => {
    await page.reload();
    await page.getByText(/^(Карта игры восстановлена\.|Game map restored\.)$/).waitFor();
    const [room] = await Promise.all([
      page.waitForEvent('popup'), page.getByRole('button', {name: /^(Гекскроул|Hexcrawl)$/}).click()
    ]);
    await room.locator('#join').waitFor();
    return room;
  };
  const [restoredMaster, restoredSecond] = await Promise.all([reopen(editor), reopen(secondEditor)]);
  assert.equal(await restoredMaster.locator('#join').getAttribute('href'), playerLink);
  assert.equal(await restoredSecond.locator('#join').getAttribute('href'), secondPlayerLink);
  await Promise.all([waitPosition(restoredMaster, '0,0'), waitPosition(restoredSecond, '1,1')]);

  await mkdir(evidenceDir, {recursive: true});
  await Promise.all([
    restoredMaster.screenshot({path: join(evidenceDir, 'master-after-restart.jpg'), quality: 76}),
    player.screenshot({path: join(evidenceDir, 'player-after-restart.jpg'), quality: 76})
  ]);
  const result = {mode: 'production-https', editorOrigin: true, separateMasterAndPlayerOrigins: true,
    productionEntry: true, confirmedMove: true, roomRestart: true, samePlayerLink: true,
    authorisedProjectionAfterRestart: true, publicBundleSecretFree: true, isolatedRooms: true,
    sameMapEditorRecovery: true, linkedEditorTabsIsolated: true,
    from: '0,1', to: '0,0'};
  await writeFile(join(evidenceDir, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  await browser?.close().catch(() => {});
  await Promise.all([close(editorServer), close(roomProxy), close(playerProxy), service?.close()]);
  await rm(temporary, {recursive: true, force: true});
}
