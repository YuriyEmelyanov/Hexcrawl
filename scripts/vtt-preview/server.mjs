// Development fixture only. Explicitly bound to loopback, outside the Pages build.
import {createServer} from 'node:http';
import {createHash, randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {applyAction, mapCells, viewOf} from './room.mjs';

export async function startPreview({port = 0, editorOrigin, launchKey} = {}) {
  let cells;
  let state;
  let history;
  let mapDigest;
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
  const send = (res, status, type, body) => {
    res.writeHead(status, {'content-type': type, 'cache-control': 'no-store'});
    res.end(body);
  };
  const json = (res, status, body) => send(res, status, 'application/json; charset=utf-8', JSON.stringify(body));
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/open') {
      if (!editorOrigin?.() || req.headers.origin !== editorOrigin()) return json(res, 404, {error: 'Unavailable'});
      res.setHeader('access-control-allow-origin', req.headers.origin);
      res.setHeader('vary', 'Origin');
      if (req.method === 'OPTIONS') {
        res.setHeader('access-control-allow-headers', 'authorization, content-type');
        res.setHeader('access-control-allow-methods', 'POST');
        return send(res, 204, 'text/plain', '');
      }
      if (req.method !== 'POST' || !launchKey || req.headers.authorization !== 'Bearer ' + launchKey) {
        return json(res, 404, {error: 'Unavailable'});
      }
      try {
        const {save, position} = await readJson(req, 16 * 1024 * 1024);
        const mapMode = readMapMode(save);
        const viewStep = save?.map?.physicalGrid?.viewStep ?? 6;
        if (!mapMode || viewStep !== 6 ||
            !Number.isSafeInteger(position?.q) || !Number.isSafeInteger(position?.r)) {
          return json(res, 400, {error: 'Select a 5–6 mile map and starting hex'});
        }
        const digest = createHash('sha256').update(JSON.stringify([mapMode, save.map])).digest('hex');
        if (state && mapDigest !== digest) return json(res, 409, {error: 'A different map is already open'});
        if (!state) {
          const opened = mapCells(save);
          if (!opened.has(`${position.q},${position.r}`)) return json(res, 400, {error: 'Select an existing hex'});
          cells = opened;
          mapDigest = digest;
          state = {position: {q: position.q, r: position.r}, proposal: null, revision: 0, mapMode};
          history = new Set(viewOf(cells, state, true).currentKeys);
        }
        return json(res, 200, {masterPath: '/master#' + masterKey});
      } catch {
        return json(res, 400, {error: 'Invalid map'});
      }
    }
    const master = req.headers.authorization === 'Bearer ' + masterKey;
    const player = req.headers['x-preview-room'] === playerPath;
    if (req.method === 'GET') {
      if (path === '/master' || path === playerPath) return send(res, 200, 'text/html; charset=utf-8', page);
      if (path === '/palette.json') return json(res, 200, palette);
      const asset = assets.get(path);
      if (asset) return send(res, 200, asset.type, asset.body);
    }
    if (!state || path !== '/state' || !(master || player)) return json(res, 404, {error: 'Room unavailable'});
    if (req.method === 'GET') {
      const view = viewOf(cells, state, master);
      return json(res, 200, master ? {...view, playerPath, history: [...history]} : view);
    }
    if (req.method !== 'POST') return json(res, 405, {error: 'Method unavailable'});
    try {
      const action = await readJson(req, 2048);
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
  return {server, base};
}

function readMapMode(save) {
  if (save?.schema !== 'hexcrawl-map') return null;
  if (save.ui?.generationMode === 'mythic') return 'mythic';
  if (save.ui?.generationMode !== 'classic') return null;
  if (save.ui.crowsEnabled === true) return 'crows';
  if (save.ui.knaveEnabled === true) return 'knave';
  return 'classic';
}

async function readJson(req, maxBytes) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req.iterator({destroyOnReturn: false})) {
    bytes += chunk.length;
    if (bytes > maxBytes) {
      req.resume();
      throw new Error('Request too large');
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function pipeError(resolve, reject, server) {
  server.once('error', reject);
  return () => {
    server.off('error', reject);
    resolve();
  };
}
