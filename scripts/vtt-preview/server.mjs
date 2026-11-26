// Development fixture only. Explicitly bound to loopback, outside the Pages build.
import {createServer} from 'node:http';
import {stripTypeScriptTypes} from 'node:module';
import {createHash, randomBytes} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import {applyAction, mapCells, viewOf} from './room.mjs';
import {readRoutes, routesAt, readMarks, marksAt} from './routes.mjs';

export async function startPreview({port = 0, editorOrigin, launchKey} = {}) {
  let cells;
  let state;
  let history;
  let routes;
  let playerRoutes;
  let marks;
  let playerMarks;
  let pois;
  let mapDigest;
  const masterKey = randomBytes(24).toString('base64url');
  const playerPath = '/play/' + randomBytes(16).toString('base64url');
  const assets = new Map(await Promise.all([
    ['/ui.mjs', 'text/javascript; charset=utf-8', './ui.mjs'],
    ['/style.css', 'text/css; charset=utf-8', './style.css'],
    ['/base-hex-artwork.mjs', 'text/javascript; charset=utf-8', '../../src/rendering/baseHexArtwork.ts'],
    ['/terrain-blend.mjs', 'text/javascript; charset=utf-8', '../../src/rendering/terrainBlend.ts'],
    ['/engraving-catalog.json', 'application/json; charset=utf-8', '../../src/rendering/engravingCatalog.json']
  ].map(async ([path, type, file]) => {
    const source = await readFile(new URL(file, import.meta.url), 'utf8');
    return [path, {type, body: file.endsWith('.ts') ? stripTypeScriptTypes(source) : source}];
  })));
  // The preview origin only serves built-in art. It never serves editor saves or arbitrary files.
  const catalog = JSON.parse(assets.get('/engraving-catalog.json').body);
  const engravingPaths = new Set(Object.keys(catalog).map(id => '/terrain/engravings/' + id + '.png'));
  const poiPaths = new Set(['/poi/v2/unknown.svg']);
  for (const layer of ['land', 'water']) {
    const prefix = `/poi/v2/${layer}/`;
    for (const file of await readdir(new URL('../../public' + prefix, import.meta.url), {withFileTypes: true})) {
      if (file.isFile() && file.name.endsWith('.svg')) poiPaths.add(prefix + file.name);
    }
  }
  assets.set('/waterfall-color.svg', {type: 'image/svg+xml',
    body: await readFile(new URL('../../public/waterfall-color.svg', import.meta.url))});
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
        const {save, position, routes: suppliedRoutes, marks: suppliedMarks, pois: suppliedPois} = await readJson(req, 16 * 1024 * 1024);
        const mapMode = readMapMode(save);
        const viewStep = save?.map?.physicalGrid?.viewStep ?? 6;
        if (!mapMode || viewStep !== 6 ||
            !Number.isSafeInteger(position?.q) || !Number.isSafeInteger(position?.r)) {
          return json(res, 400, {error: 'Select a 5–6 mile map and starting hex'});
        }
        const rotated = save.ui.isMapRotated === true;
        const digest = createHash('sha256').update(JSON.stringify([mapMode, rotated, save.map])).digest('hex');
        if (state && mapDigest !== digest) return json(res, 409, {error: 'A different map is already open'});
        if (!state) {
          const opened = mapCells(save);
          if (!opened.has(`${position.q},${position.r}`)) return json(res, 400, {error: 'Select an existing hex'});
          routes = readRoutes(suppliedRoutes);
          marks = readMarks(suppliedMarks);
          pois = readPois(suppliedPois, opened, poiPaths);
          playerMarks = marksAt(marks, position);
          playerRoutes = routesAt(routes, position);
          cells = opened;
          mapDigest = digest;
          state = {position: {q: position.q, r: position.r}, proposal: null, revision: 0, mapMode, rotated};
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
      const asset = assets.get(path);
      if (asset) return send(res, 200, asset.type, asset.body);
      if (engravingPaths.has(path) || poiPaths.has(path)) {
        try {
          const body = await readFile(new URL('../../public' + path, import.meta.url));
          return send(res, 200, poiPaths.has(path) ? 'image/svg+xml' : 'image/png', body);
        } catch {
          return json(res, 404, {error: 'Artwork unavailable'});
        }
      }
    }
    if (!state || path !== '/state' || !(master || player)) return json(res, 404, {error: 'Room unavailable'});
    if (req.method === 'GET') {
      const points = master ? [...pois.values()].flat()
        : (pois.get(`${state.position.q},${state.position.r}`) ?? []).filter(point => point.onPassage);
      const drawings = points.map(({q, r, icon, fill}) => ({q, r, icon, fill}));
      const view = {...viewOf(cells, state, master), routes: master ? routes : playerRoutes, marks: master ? marks : playerMarks, pois: drawings};
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
        playerRoutes = routesAt(routes, state.position);
        playerMarks = marksAt(marks, state.position);
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

function readPois(supplied, cells, paths) {
  const points = new Map();
  if (!Array.isArray(supplied)) return points;
  for (const point of supplied) {
    if (!point || !Number.isSafeInteger(point.q) || !Number.isSafeInteger(point.r)) continue;
    const {q, r, icon, fill, discovery} = point;
    const key = `${q},${r}`;
    if (!cells.has(key) || typeof icon !== 'string' || !paths.has(icon) ||
        typeof fill !== 'string' || !/^#[0-9a-f]{6}$/i.test(fill)) continue;
    const atHex = points.get(key) ?? [];
    atHex.push({q, r, icon, fill, onPassage: discovery === 'passage'});
    points.set(key, atHex);
  }
  return points;
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
