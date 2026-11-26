// Development fixture only. Explicitly bound to loopback, outside the Pages build.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {applyAction, mapCells, viewOf} from './room.mjs';

export async function startPreview({port = 0} = {}) {
  const fixture = new URL('../../test/fixtures/classic-six-regions-seed42.json', import.meta.url);
  const cells = mapCells(JSON.parse(await readFile(fixture, 'utf8')));
  const masterKey = randomBytes(24).toString('base64url');
  const playerPath = '/play/' + randomBytes(16).toString('base64url');
  const assets = new Map(await Promise.all([
    ['/ui.mjs', 'text/javascript; charset=utf-8', './ui.mjs'],
    ['/style.css', 'text/css; charset=utf-8', './style.css']
  ].map(async ([path, type, file]) =>
    [path, {type, body: await readFile(new URL(file, import.meta.url))}])));
  // Use the same palette source as the editor. Only expose data, never the fixture.
  const {BIOME_GROUND_COLORS, WATER_PALETTE} = await import('../../src/rendering/terrainStyle.ts');
  const palette = {ground: BIOME_GROUND_COLORS, water: WATER_PALETTE};
  const page = await readFile(new URL('./index.html', import.meta.url));
  let state = {position: {q: 0, r: 0}, proposal: null, revision: 0};
  let history = new Set(viewOf(cells, state, true).currentKeys);
  const send = (res, status, type, body) => {
    res.writeHead(status, {'content-type': type, 'cache-control': 'no-store'});
    res.end(body);
  };
  const json = (res, status, body) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(body));
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    const master = req.headers.authorization === 'Bearer ' + masterKey;
    const player = req.headers['x-preview-room'] === playerPath;
    if (req.method === 'GET') {
      if (path === '/master' || path === playerPath) return send(res, 200, 'text/html; charset=utf-8', page);
      if (path === '/palette.json') return json(res, 200, palette);
      const asset = assets.get(path);
      if (asset) return send(res, 200, asset.type, asset.body);
    }
    if (path !== '/state' || !(master || player)) return json(res, 404, {error: 'Room unavailable'});
    if (req.method === 'GET') {
      const view = viewOf(cells, state, master);
      return json(res, 200, master ? {...view, playerPath, history: [...history]} : view);
    }
    if (req.method !== 'POST') return json(res, 405, {error: 'Method unavailable'});
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 2048) return json(res, 413, {error: 'Request too large'});
      }
      const action = JSON.parse(body);
      if (!action || typeof action !== 'object') return json(res, 400, {error: 'Invalid action'});
      const next = applyAction(cells, state, action, master);
      if (!next) return json(res, 409, {error: 'Action not applied'});
      state = next;
      if (action.kind === 'confirm') {
        history = new Set([...history, ...viewOf(cells, state, true).currentKeys]);
      }
      return json(res, 200, {ok: true});
    } catch {
      return json(res, 400, {error: 'Invalid action'});
    }
  });
  await new Promise((resolve, reject) => server.listen(port, '127.0.0.1', pipeError(resolve, reject, server)));
  const base = 'http://127.0.0.1:' + server.address().port;
  return {server, base, masterUrl: base + '/master#' + masterKey, playerUrl: base + playerPath};
}

function pipeError(resolve, reject, server) {
  server.once('error', reject);
  return () => {
    server.off('error', reject);
    resolve();
  };
}
