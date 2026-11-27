// Development fixture only. Explicitly bound to loopback, outside the Pages build.
import {createServer} from 'node:http';
import {stripTypeScriptTypes} from 'node:module';
import {createHash, randomBytes} from 'node:crypto';
import {readdir, readFile} from 'node:fs/promises';
import {applyAction, directions, mapCells, viewOf, visibleAt} from './room.mjs';
import {readRoutes, routesAt, readMarks, marksAt} from './routes.mjs';
import {roomStorage} from './room-storage.mjs';

const key = ({q, r}) => `${q},${r}`;
const newPlayerPath = () => '/play/' + randomBytes(16).toString('base64url');

function roomRole(room, headers, playerOnly) {
  if (!room) return null;
  if (!playerOnly && headers.authorization === 'Bearer ' + room.masterKey) return 'master';
  return room.playerPath && headers['x-preview-room'] === room.playerPath ? 'player' : null;
}

function playerLinkOrigin(value) {
  const url = new URL(value);
  const loopback = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))) {
    throw new Error('Use an HTTPS origin for player links outside loopback');
  }
  return url.origin;
}

export async function startPreview({port = 0, playerPort, playerOrigin, editorOrigin, launchKey, storagePath} = {}) {
  if (playerOrigin !== undefined && playerPort === undefined) throw new Error('Configure a separate player port');
  let linkOrigin = playerOrigin === undefined ? undefined : playerLinkOrigin(playerOrigin);
  const storage = storagePath ? await roomStorage(storagePath) : null;
  const assets = new Map(await Promise.all([
    ['/ui.mjs', 'text/javascript; charset=utf-8', './ui.mjs'],
    ['/vtt-map-cache.mjs', 'text/javascript; charset=utf-8', '../../src/vttMapCache.ts'],
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
    if (room?.state.position === next.state.position && room.routes === next.routes && room.marks === next.marks) return local;
    const marks = marksAt(next.marks, next.state.position);
    return {routes: routesAt(next.routes, next.state.position, marks), marks};
  }
  const snapshot = await storage?.load();
  if (snapshot) {
    const restored = restoreRoom(snapshot, poiPaths);
    local = localAt(restored);
    room = restored;
  }

  // Check revisions and publish changes in the same order as durable writes.
  let lastMutation = Promise.resolve();
  let stopping;
  function mutate(change) {
    if (stopping) return;
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
  async function handle(req, res, playerOnly) {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (playerOnly && (path === '/open' || path === '/master')) return json(res, 404, {error: 'Room unavailable'});
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
      let candidate, editorMap, reopening;
      try {
        const {save, position, routes, marks, pois, resume, crossingArtworkVersion} = await readJson(req, 16 * 1024 * 1024);
        reopening = resume === true;
        const mapMode = readMapMode(save);
        const viewStep = save?.map?.physicalGrid?.viewStep ?? 6;
        if (!mapMode || viewStep !== 6 ||
            !Number.isSafeInteger(position?.q) || !Number.isSafeInteger(position?.r)) {
          return json(res, 400, {error: 'Select a 5–6 mile map and starting hex'});
        }
        const rotated = save.ui.isMapRotated === true;
        editorMap = save.map;
        const mapDigest = digestMap([mapMode, editorMap]);
        const cells = mapCells(save);
        const state = {position: {q: position.q, r: position.r}, proposal: null, revision: 0, mapMode, rotated};
        candidate = {cells, state, mapDigest, routes: readRoutes(routes), marks: readMarks(marks),
          pois: readPois(pois, cells, poiPaths), history: visibleAt(cells, state.position).map(key),
          crossingArtworkVersion: crossingArtworkVersion === 1 ? 1 : 0};
      } catch {
        return json(res, 400, {error: 'Invalid map'});
      }
      return mutate(async () => {
        const {mapMode, rotated} = candidate.state;
        // Earlier snapshots included the original orientation in their digest.
        const legacyMatch = room && room.mapDigest !== candidate.mapDigest &&
          room.mapDigest === digestMap([mapMode, room.state.rotated, editorMap]);
        if (room && room.mapDigest !== candidate.mapDigest && !legacyMatch) {
          return json(res, 409, {error: 'A different map is already open'});
        }
        if (reopening && !room) return json(res, 200, {masterPath: '/master'});
        const upgradeArtwork = room && (legacyMatch || candidate.crossingArtworkVersion > room.crossingArtworkVersion);
        try {
          if (!room) {
            if (!candidate.cells.has(key(candidate.state.position))) return json(res, 400, {error: 'Select an existing hex'});
            await saveRoom({...candidate, masterKey: randomBytes(24).toString('base64url'), playerPath: newPlayerPath()});
          } else if (upgradeArtwork || room.state.rotated !== rotated) {
            const state = {...room.state, rotated, revision: room.state.revision + 1};
            const artwork = upgradeArtwork ? {cells: candidate.cells, routes: candidate.routes, marks: candidate.marks,
              pois: candidate.pois, mapDigest: candidate.mapDigest, crossingArtworkVersion: candidate.crossingArtworkVersion} : {};
            await saveRoom({...room, ...artwork, state});
          }
        } catch {
          return json(res, 503, {error: 'Room could not be saved'});
        }
        return json(res, 200, {masterPath: reopening ? '/master' : '/master#' + room.masterKey});
      });
    }
    if (req.method === 'GET') {
      if (path === '/master' || path === room?.playerPath) return send(res, 200, 'text/html; charset=utf-8', page);
      if (path.startsWith('/play/')) return send(res, 404, 'text/html; charset=utf-8', page);
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
    const role = roomRole(room, req.headers, playerOnly);
    if (path !== '/state' || !role) return json(res, 404, {error: 'Room unavailable'});
    if (req.method === 'GET') {
      const master = role === 'master';
      const {state, cells, pois, history, playerPath} = room;
      const points = master ? [...pois.values()].flat()
        : (pois.get(key(state.position)) ?? []).filter(point => point.discovery === 'passage');
      const drawings = points.map(({q, r, icon, fill}) => ({q, r, icon, fill}));
      const {routes, marks} = master ? room : local;
      const view = {...viewOf(cells, state, master), routes, marks, pois: drawings};
      const playerUrl = playerPath && linkOrigin ? new URL(playerPath, linkOrigin).href : undefined;
      return json(res, 200, master ? {...view, playerPath, playerUrl, history} : view);
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
      // The link may have been revoked while this request was waiting to write.
      const currentRole = roomRole(room, req.headers, playerOnly);
      if (!currentRole) return json(res, 404, {error: 'Room unavailable'});
      const next = nextRoom(room, action, currentRole === 'master');
      if (!next) return json(res, 409, {error: 'Action not applied'});
      try {
        await saveRoom(next);
      } catch {
        return json(res, 503, {error: 'Room could not be saved'});
      }
      return json(res, 200, {ok: true});
    });
  }
  const server = createServer((req, res) => handle(req, res, false));
  const playerServer = playerPort === undefined ? null : createServer((req, res) => handle(req, res, true));
  const listen = (listener, port) => new Promise((resolve, reject) =>
    listener.listen(port, '127.0.0.1', pipeError(resolve, reject, listener)));
  await listen(server, port);
  const base = 'http://127.0.0.1:' + server.address().port;
  let playerBase;
  if (playerServer) {
    try {
      await listen(playerServer, playerPort);
      playerBase = 'http://127.0.0.1:' + playerServer.address().port;
      linkOrigin ??= playerBase;
    } catch (error) {
      await close();
      throw error;
    }
  }
  function close() {
    if (!stopping) {
      const listeners = [server, playerServer].filter(listener => listener?.listening);
      const closed = listeners.map(listener => new Promise(resolve => listener.close(resolve)));
      // Polling sockets must release the port before a restart. Finish accepted
      // mutations before another service instance opens the snapshot.
      stopping = Promise.all([...closed, lastMutation]);
      for (const listener of listeners) listener.closeAllConnections();
    }
    return stopping;
  }
  return {server, base, playerBase, close};
}

function digestMap(identity) {
  return createHash('sha256').update(JSON.stringify(identity)).digest('hex');
}

function nextRoom(room, action, master) {
  if (action.kind === 'close-player-access' || action.kind === 'rotate-player-link') {
    if (!master || action.expectedPlayerPath !== room.playerPath) return null;
    const playerPath = action.kind === 'rotate-player-link' ? newPlayerPath() : null;
    return {...room, playerPath, state: {...room.state, revision: room.state.revision + 1}};
  }
  const state = applyAction(room.cells, room.state, action, master);
  if (!state) return null;
  const history = action.kind === 'confirm'
    ? [...new Set([...room.history, ...visibleAt(room.cells, state.position).map(key)])]
    : room.history;
  return {...room, state, history};
}

function restoreRoom(snapshot, poiPaths) {
  const {state, history, masterKey, playerPath, mapDigest} = snapshot;
  const cells = new Map(snapshot.cells.map(({q, r, biome, height, water}) => {
    if (!Number.isSafeInteger(q) || !Number.isSafeInteger(r) ||
        (biome !== null && typeof biome !== 'string') || ![1, 2, 3].includes(height) ||
        ![null, 'sea', 'lake'].includes(water)) throw new Error('Invalid saved VTT cell');
    return [key({q, r}), {q, r, biome, height, water}];
  }));
  if (!/^[\w-]{32}$/.test(masterKey) || (playerPath !== null && !/^\/play\/[\w-]{22}$/.test(playerPath)) ||
      !/^[0-9a-f]{64}$/.test(mapDigest) || !cells.has(key(state.position)) ||
      !['classic', 'knave', 'crows', 'mythic'].includes(state.mapMode) || typeof state.rotated !== 'boolean' ||
      !Number.isSafeInteger(state.revision) || state.revision < 0 ||
      (state.proposal !== null && (!Number.isInteger(state.proposal) || !directions[state.proposal])) ||
      !Array.isArray(history) || !history.every(coord => cells.has(coord))) {
    throw new Error('Invalid saved VTT room');
  }
  return {state, cells, history, masterKey, playerPath, mapDigest,
    crossingArtworkVersion: snapshot.crossingArtworkVersion === 1 ? 1 : 0,
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
