import {HEX_SIZE, toPixel, hexPoints, hexGridPath, getHexWidth, engravingLayout} from '/base-hex-artwork.mjs';
import {terrainTextures} from '/terrain-blend.mjs';
import {readVttRoom, writeVttRoom} from '/vtt-map-cache.mjs';

const master = location.pathname === '/master';
const modeLabels = {
  classic: 'Classic',
  knave: 'Classic · Knave 2e',
  crows: 'Classic · Crows (Cornath)',
  mythic: 'Mythic Bastionland'
};
const get = id => document.getElementById(id);
const map = get('map');
const position = get('position');
const progress = get('progress');
const confirm = get('confirm');
const cancel = get('cancel');
const join = get('join');
const rotateLink = get('rotate-link');
const closeAccess = get('close-access');
const vectors = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const directionButtons = [];
const key = ({q, r}) => `${q},${r}`;
const catalog = await fetch('/engraving-catalog.json').then(response => response.json());
const onboard = location.hash.slice(1);
if (master && onboard) {
  localStorage.setItem('vtt-preview-master', onboard);
  history.replaceState(null, '', location.pathname);
}
const masterKey = master ? localStorage.getItem('vtt-preview-master') : null;
const headers = master
  ? {authorization: 'Bearer ' + masterKey}
  : {'x-preview-room': location.pathname};
const masterCache = masterKey && crypto.subtle
  ? crypto.subtle.digest('SHA-256', new TextEncoder().encode(masterKey)).then(async digest => {
    const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const stored = await readVttRoom(key).catch(() => null);
    return {key, stored: stored?.schema === 1 ? stored : null};
  }).catch(() => null) : Promise.resolve(null);
const role = master ? 'Мастер' : 'Игрок';
get('master-controls').hidden = !master;
let view;
let commandError = '';
let revoked = false;
let connected = false;
// null follows the party; a separate camera is available only to the master.
let camera;

function displayPoint(point) {
  const {x, y} = toPixel(point.q, point.r);
  return view.rotated ? [-y, x] : [x, y];
}

function partyFrame() {
  const [x, y] = displayPoint(view.position);
  return [x - 360, y - 260, 720, 520];
}

function wholeMapFrame() {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const cell of view.cells) {
    const [x, y] = displayPoint(cell);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  const padding = HEX_SIZE + 12;
  return [left - padding, top - padding, right - left + 2 * padding, bottom - top + 2 * padding];
}

function drawCamera() {
  map.setAttribute('viewBox', (camera ?? partyFrame()).join(' '));
}

function panCamera(dx, dy) {
  const [x, y, width, height] = camera ?? partyFrame();
  camera = [x + dx, y + dy, width, height];
  drawCamera();
}

function zoomCamera(factor) {
  if (!view) return;
  const [x, y, width, height] = camera ?? partyFrame();
  const nextWidth = width * factor, nextHeight = height * factor;
  if (Math.min(nextWidth, nextHeight) < 2 * HEX_SIZE || Math.max(nextWidth, nextHeight) > 1e7) return;
  camera = [x + (width - nextWidth) / 2, y + (height - nextHeight) / 2, nextWidth, nextHeight];
  drawCamera();
}

if (master) {
  map.dataset.masterCamera = '';
  map.setAttribute('tabindex', '0');
  get('fit-map').addEventListener('click', () => {
    if (!view) return;
    camera = wholeMapFrame();
    drawCamera();
  });
  get('focus-party').addEventListener('click', () => {
    if (!view) return;
    camera = null;
    drawCamera();
  });
  get('zoom-in').addEventListener('click', () => zoomCamera(.8));
  get('zoom-out').addEventListener('click', () => zoomCamera(1.25));
  map.addEventListener('keydown', event => {
    const directions = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
    const direction = directions[event.key];
    if (!view || !direction) return;
    event.preventDefault();
    const [, , width, height] = camera ?? partyFrame();
    panCamera(direction[0] * width / 8, direction[1] * height / 8);
  });
  let drag;
  map.addEventListener('pointerdown', event => {
    if (!view || !event.isPrimary || event.button !== 0) return;
    const scale = map.getScreenCTM()?.a;
    if (!scale) return;
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, scale};
    map.setPointerCapture(event.pointerId);
  });
  map.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    panCamera((drag.x - event.clientX) / drag.scale, (drag.y - event.clientY) / drag.scale);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  map.addEventListener('lostpointercapture', () => { drag = null; });
}

function shape(name, attrs) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) element.setAttribute(k, v);
  return element;
}

function draw(next) {
  const fit = master && (!view || view.rotated !== next.rotated);
  view = next;
  position.value = key(next.position);
  get('role').textContent = `${role} · ${modeLabels[next.mapMode]} · 5–6 миль`;
  progress.textContent = commandError || (next.proposal === null ? 'Ход не предложен' : 'Ход предложен');
  if (master) {
    const accessOpen = connected && next.playerPath !== null;
    get('share-controls').hidden = !connected;
    join.hidden = closeAccess.hidden = !accessOpen;
    get('access-closed').hidden = accessOpen;
    rotateLink.textContent = accessOpen ? 'Сменить ссылку' : 'Создать новую ссылку';
    if (accessOpen) join.href = next.playerUrl ?? next.playerPath;
    else join.removeAttribute('href');
    confirm.disabled = cancel.disabled = !connected || next.proposal === null;
    for (const button of get('choices').querySelectorAll('button')) button.disabled = !connected;
  }
  const {x, y} = toPixel(next.position.q, next.position.r);
  if (fit) camera = wholeMapFrame();
  drawCamera();
  const {defs, terrain} = drawTerrain(next);
  const layer = shape('g', next.rotated ? {transform: 'rotate(90)'} : {});
  layer.append(...terrain, drawRoutes(next.routes, defs), drawMarks(next.marks, next.rotated), drawPois(next.pois, next.rotated));
  layer.append(shape('path', {class: 'color-hex-grid',
    d: hexGridPath(next.cells.map(cell => toPixel(cell.q, cell.r)), HEX_SIZE),
    fill: 'none', stroke: '#575242', 'stroke-opacity': .22, 'stroke-width': .55,
    'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none'}));
  if (next.proposal !== null) {
    layer.append(shape('path', {d: 'M12 0h25m-9 -7 9 7-9 7',
      transform: `translate(${x} ${y}) rotate(${directionAngle(next.proposal)})`,
      stroke: '#ffdc85', fill: 'none', 'stroke-width': 3, 'data-proposal': next.proposal}));
  }
  const hasPoi = next.pois.some(point => key(point) === key(next.position));
  layer.append(shape('circle', {cx: x, cy: y, r: hasPoi ? HEX_SIZE * .65 : 9,
    fill: hasPoi ? 'none' : '#ffdc85', stroke: hasPoi ? '#ffdc85' : '#654918',
    'stroke-width': hasPoi ? 2.5 : 1, 'data-party': ''}));
  map.replaceChildren(defs, layer);
  directionButtons.forEach((icon, direction) => {
    icon.setAttribute('transform', `rotate(${directionAngle(direction) + (next.rotated ? 90 : 0)} 10 10)`);
  });
}

function drawTerrain(next) {
  const current = new Set(next.currentKeys);
  const seen = new Set(next.history);
  const occupied = new Set(next.pois.map(key));
  const cells = next.cells.map(cell => {
    const terrain = cell.water ?? cell.biome;
    const id = Object.hasOwn(catalog, terrain) ? terrain : 'plain_deciduous_forest';
    return {...cell, id, color: catalog[id].color};
  });
  // The player view blends only its authorized cells, so a hidden neighbour cannot tint a visible edge.
  const textures = terrainTextures(cells);
  const defs = shape('defs', {});
  const width = getHexWidth(HEX_SIZE);
  const terrain = cells.map(cell => {
    const {x, y} = toPixel(cell.q, cell.r);
    const k = key(cell);
    const points = hexPoints(x, y, HEX_SIZE);
    const group = shape('g', {opacity: !master || current.has(k) ? 1 : seen.has(k) ? .66 : .31});
    group.append(shape('polygon', {points, 'data-cell': k, fill: cell.color}));
    const texture = textures.get(k);
    if (texture) {
      const id = 'hex-clip-' + k;
      const clip = shape('clipPath', {id});
      clip.append(shape('polygon', {points}));
      defs.append(clip);
      group.append(shape('image', {href: texture, 'clip-path': `url(#${id})`, x: x - width / 2,
        y: y - HEX_SIZE, width, height: HEX_SIZE * 2, preserveAspectRatio: 'none', 'data-terrain-blend': k}));
    }
    if (!occupied.has(k)) {
      const {size, bounds} = catalog[cell.id];
      group.append(shape('image', {href: `/terrain/engravings/${cell.id}.png`,
        'data-engraving': cell.id, ...engravingLayout(size, bounds, x, y, HEX_SIZE, next.rotated)}));
    }
    return group;
  });
  return {defs, terrain};
}

function drawRoutes(routes, defs) {
  const group = shape('g', {'data-routes': '', 'pointer-events': 'none'});
  const arrowMarkers = new Set();
  for (const {kind, width, faded, solid, points, arrowSize} of routes) {
    const marker = kind === 'river-arrow' ? 'river-arrow-' + arrowSize : null;
    if (marker && !arrowMarkers.has(marker)) {
      arrowMarkers.add(marker);
      const head = shape('marker', {id: marker, viewBox: '0 0 8 8', refX: 7, refY: 4,
        markerWidth: arrowSize, markerHeight: arrowSize, orient: 'auto'});
      head.append(shape('path', {d: 'M 0 0 L 8 4 L 0 8 z', fill: '#8bdbdd'}));
      defs.append(head);
    }
    group.append(shape('polyline', {
      points: points.map(([x, y]) => `${x},${y}`).join(' '),
      'data-route-kind': kind,
      class: `route-${kind}${faded ? ' route-faded' : ''}${solid ? ' route-solid' : ''}`,
      'stroke-width': width,
      ...(marker ? {'marker-end': `url(#${marker})`} : {}),
      fill: 'none'
    }));
  }
  return group;
}

const markLabels = {bridge: 'Мост', ferry: 'Переправа', ford: 'Брод', waterfall: 'Водопад'};

function drawMarks(marks, rotated) {
  const group = shape('g', {'data-route-marks': ''});
  for (const {kind, x, y} of marks) {
    const mark = shape('g', {'data-mark-kind': kind, role: 'img', 'aria-label': markLabels[kind]});
    const title = shape('title', {});
    title.textContent = markLabels[kind];
    mark.append(title);
    if (kind === 'waterfall') {
      const image = shape('image', {href: '/waterfall-color.svg', x: x - 8, y: y - 8, width: 16, height: 16});
      if (rotated) image.setAttribute('transform', `rotate(-90 ${x} ${y})`);
      mark.append(image);
    } else {
      // Bridge rails, the ford stroke and the ferry gap are already in the editor's route layer.
      mark.append(shape('circle', {cx: x, cy: y, r: 7, fill: 'transparent'}));
    }
    group.append(mark);
  }
  return group;
}

function drawPois(points, rotated) {
  const layer = shape('g', {'pointer-events': 'none'});
  const byHex = new Map();
  for (const point of points) {
    const k = key(point);
    if (!byHex.has(k)) byHex.set(k, []);
    byHex.get(k).push(point);
  }
  for (const [k, atHex] of byHex) {
    const {x, y} = toPixel(atHex[0].q, atHex[0].r);
    const shared = atHex.length > 1;
    const radius = HEX_SIZE * (shared ? .27 : .425);
    const size = HEX_SIZE * (shared ? .42 : .62);
    const group = shape('g', {'data-poi': k, ...(rotated ? {transform: `rotate(-90 ${x} ${y})`} : {})});
    atHex.forEach(({icon, fill}, index) => {
      const cx = shared ? x + (index - (atHex.length - 1) / 2) * (radius * 2 + 1) : x;
      group.append(shape('circle', {cx, cy: y, r: radius, fill, stroke: '#f4ecd5', 'stroke-opacity': .75}));
      group.append(shape('image', {href: icon, x: cx - size / 2, y: y - size / 2,
        width: size, height: size, role: 'img', 'aria-label': 'Точка интереса'}));
    });
    layer.append(group);
  }
  return layer;
}

function directionAngle(direction) {
  const [q, r] = vectors[direction];
  const {x, y} = toPixel(q, r);
  return Math.atan2(y, x) * 180 / Math.PI;
}

async function refresh() {
  if (revoked) return;
  const response = await fetch('/state', {headers});
  if (!master && response.status === 404) return showRevoked();
  if (!response.ok) throw new Error('Room unavailable');
  const next = await response.json();
  if (revoked) return;
  if ((master && !connected) || !view || next.revision > view.revision || (next.revision === view.revision && progress.dataset.error)) {
    connected = true;
    delete progress.dataset.error;
    draw(next);
    if (master) {
      const {position, revision, rotated, mapMode, history, cells, currentKeys, routes, marks, pois} = next;
      const snapshot = {schema: 1, position, revision, rotated, mapMode, history, cells, currentKeys, routes, marks, pois};
      const cache = await masterCache;
      if (!cache) {
        get('save-warning').hidden = false;
      } else {
        await writeVttRoom(cache.key, snapshot).then(() => { get('save-warning').hidden = true; },
          () => { get('save-warning').hidden = false; });
      }
    }
  }
}

function showRevoked() {
  revoked = true;
  view = undefined;
  position.value = '—';
  get('role').textContent = role;
  progress.textContent = 'Доступ по этой ссылке закрыт';
  map.replaceChildren();
  for (const button of get('choices').querySelectorAll('button')) button.disabled = true;
}

async function action(kind, details = {}) {
  if (revoked || (master && !connected)) return;
  commandError = '';
  try {
    const response = await fetch('/state', {method: 'POST',
      headers: {...headers, 'content-type': 'application/json'},
      body: JSON.stringify({kind, revision: view?.revision, ...details})});
    if (!master && response.status === 404) return showRevoked();
    if (response.status === 503) commandError = 'Не удалось сохранить состояние комнаты';
    else if (!response.ok) commandError = 'Действие не применено';
    await refresh();
  } catch {
    commandError = 'Связь с комнатой потеряна';
  }
  if (!revoked && commandError) progress.textContent = commandError;
}

vectors.forEach((_, direction) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = master;
  button.dataset.direction = direction;
  button.setAttribute('aria-label', `Предложить ход, направление ${direction + 1}`);
  const icon = shape('svg', {viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true});
  const arrow = shape('path', {d: 'M3 10h13m-5 -5 5 5-5 5',
    fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    transform: `rotate(${directionAngle(direction)} 10 10)`});
  icon.append(arrow);
  directionButtons.push(arrow);
  button.append(icon);
  button.addEventListener('click', () => void action('propose', {direction}));
  get('choices').append(button);
});
confirm.addEventListener('click', () => void action('confirm'));
cancel.addEventListener('click', () => void action('cancel'));
rotateLink.addEventListener('click', () => void action('rotate-player-link', {expectedPlayerPath: view?.playerPath}));
closeAccess.addEventListener('click', () => void action('close-player-access', {expectedPlayerPath: view?.playerPath}));

async function followRoom() {
  try {
    await refresh();
  } catch {
    if (!revoked) {
      progress.dataset.error = 'true';
      if (master) {
        const wasConnected = connected;
        connected = false;
        const cache = await masterCache;
        if (!connected) {
          const current = view ?? cache?.stored;
          if (current && (wasConnected || !view)) draw({...current, proposal: null, playerPath: null});
        }
      }
      if (!master || !connected) progress.textContent = master && view
        ? 'Комната недоступна. Показано последнее сохранённое положение.'
        : 'Связь с комнатой потеряна';
    }
  }
  if (!revoked) setTimeout(followRoom, 200);
}
void followRoom();
