// Development fixture only. Explicitly bound to loopback, outside the Pages build.
import {createServer} from 'node:http';
import {stripTypeScriptTypes} from 'node:module';
import {createHash, randomBytes} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import {applyAction, directions, mapCells, viewOf, visibleAt} from './room.mjs';
import {readRoutes, routesAt, readMarks, marksAt} from './routes.mjs';
import {roomStorage} from './room-storage.mjs';

const key = ({q, r}) => `${q},${r}`;

export async function startPreview({port = 0, editorOrigin, launchKey, storagePath} = {}) {
  const storage = storagePath ? await roomStorage(storagePath) : null;
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
  let room;
  let local;
  function localAt(next) {
    return room?.state.position === next.state.position ? local
      : {routes: routesAt(next.routes, next.state.position), marks: marksAt(next.marks, next.state.position)};
  }
  const snapshot = await storage?.load();
  if (snapshot) {
    const restored = restoreRoom(snapshot, poiPaths);
    local = localAt(restored);
    room = restored;
  }

  // Check revisions and publish changes in the same order as durable writes.
  let lastMutation = Promise.resolve();
  function mutate(change) {
    const completion = lastMutation.then(change);
    lastMutation = completion.catch(() => {});
    return completion;
  }
  async function saveRoom(next) {
    const nextLocal = localAt(next);
    await storage?.save(next);
    room = next;
    local = nextLocal;
  }

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
      let candidate;
      try {
        const {save, position, routes, marks, pois} = await readJson(req, 16 * 1024 * 1024);
        const mapMode = readMapMode(save);
        const viewStep = save?.map?.physicalGrid?.viewStep ?? 6;
        if (!mapMode || viewStep !== 6 ||
            !Number.isSafeInteger(position?.q) || !Number.isSafeInteger(position?.r)) {
          return json(res, 400, {error: 'Select a 5–6 mile map and starting hex'});
        }
        const rotated = save.ui.isMapRotated === true;
        const mapDigest = createHash('sha256').update(JSON.stringify([mapMode, rotated, save.map])).digest('hex');
        const cells = mapCells(save);
        const state = {position: {q: position.q, r: position.r}, proposal: null, revision: 0, mapMode, rotated};
        candidate = {cells, state, mapDigest, routes: readRoutes(routes), marks: readMarks(marks),
          pois: readPois(pois, cells, poiPaths), history: visibleAt(cells, state.position).map(key)};
      } catch {
        return json(res, 400, {error: 'Invalid map'});
      }
      return mutate(async () => {
        if (room && room.mapDigest !== candidate.mapDigest) return json(res, 409, {error: 'A different map is already open'});
        if (!room) {
          if (!candidate.cells.has(key(candidate.state.position))) return json(res, 400, {error: 'Select an existing hex'});
          try {
            await saveRoom({...candidate, masterKey: randomBytes(24).toString('base64url'),
              playerPath: '/play/' + randomBytes(16).toString('base64url')});
          } catch {
            return json(res, 503, {error: 'Room could not be saved'});
          }
        }
        return json(res, 200, {masterPath: '/master#' + room.masterKey});
      });
    }
    const master = room && req.headers.authorization === 'Bearer ' + room.masterKey;
    const player = room && req.headers['x-preview-room'] === room.playerPath;
    if (req.method === 'GET') {
      if (path === '/master' || path === room?.playerPath) return send(res, 200, 'text/html; charset=utf-8', page);
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
    if (!room || path !== '/state' || !(master || player)) return json(res, 404, {error: 'Room unavailable'});
    if (req.method === 'GET') {
      const {state, cells, pois, history, playerPath} = room;
      const points = master ? [...pois.values()].flat()
        : (pois.get(key(state.position)) ?? []).filter(point => point.discovery === 'passage');
      const drawings = points.map(({q, r, icon, fill}) => ({q, r, icon, fill}));
      const {routes, marks} = master ? room : local;
      const view = {...viewOf(cells, state, master), routes, marks, pois: drawings};
      return json(res, 200, master ? {...view, playerPath, history} : view);
    }
    if (req.method !== 'POST') return json(res, 405, {error: 'Method unavailable'});
    let action;
    try {
      action = await readJson(req, 2048);
      if (!action || typeof action !== 'object') return json(res, 400, {error: 'Invalid action'});
    } catch {
      return json(res, 400, {error: 'Invalid action'});
    }
    return mutate(async () => {
      const state = applyAction(room.cells, room.state, action, master);
      if (!state) return json(res, 409, {error: 'Action not applied'});
      const history = action.kind === 'confirm'
        ? [...new Set([...room.history, ...visibleAt(room.cells, state.position).map(key)])]
        : room.history;
      try {
        await saveRoom({...room, state, history});
      } catch {
        return json(res, 503, {error: 'Room could not be saved'});
      }
      return json(res, 200, {ok: true});
    });
  });
  await new Promise((resolve, reject) => server.listen(port, '127.0.0.1', pipeError(resolve, reject, server)));
  const base = 'http://127.0.0.1:' + server.address().port;
  return {server, base};
}

function restoreRoom(snapshot, poiPaths) {
  const {state, history, masterKey, playerPath, mapDigest} = snapshot;
  const cells = new Map(snapshot.cells.map(({q, r, biome, height, water}) => {
    if (!Number.isSafeInteger(q) || !Number.isSafeInteger(r) ||
        (biome !== null && typeof biome !== 'string') || ![1, 2, 3].includes(height) ||
        ![null, 'sea', 'lake'].includes(water)) throw new Error('Invalid saved VTT cell');
    return [key({q, r}), {q, r, biome, height, water}];
  }));
  if (!/^[\w-]{32}$/.test(masterKey) || !/^\/play\/[\w-]{22}$/.test(playerPath) ||
      !/^[0-9a-f]{64}$/.test(mapDigest) || !cells.has(key(state.position)) ||
      !['classic', 'knave', 'crows', 'mythic'].includes(state.mapMode) || typeof state.rotated !== 'boolean' ||
      !Number.isSafeInteger(state.revision) || state.revision < 0 ||
      (state.proposal !== null && (!Number.isInteger(state.proposal) || !directions[state.proposal])) ||
      !Array.isArray(history) || !history.every(coord => cells.has(coord))) {
    throw new Error('Invalid saved VTT room');
  }
  return {state, cells, history, masterKey, playerPath, mapDigest,
    routes: readRoutes(snapshot.routes), marks: readMarks(snapshot.marks),
    pois: readPois(snapshot.pois, cells, poiPaths)};
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
    atHex.push({q, r, icon, fill, discovery: discovery === 'passage' ? 'passage' : null});
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
