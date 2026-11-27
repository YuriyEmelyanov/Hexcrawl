import {HEX_SIZE, toPixel, hexPoints, getHexWidth, engravingLayout} from '/base-hex-artwork.mjs';
import {terrainTextures} from '/terrain-blend.mjs';

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
const headers = master
  ? {authorization: 'Bearer ' + localStorage.getItem('vtt-preview-master')}
  : {'x-preview-room': location.pathname};
const role = master ? 'Мастер' : 'Игрок';
get('master-controls').hidden = !master;
let view;
let commandError = '';
let revoked = false;

function shape(name, attrs) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) element.setAttribute(k, v);
  return element;
}

function draw(next) {
  view = next;
  position.value = key(next.position);
  get('role').textContent = `${role} · ${modeLabels[next.mapMode]} · 5–6 миль`;
  progress.textContent = commandError || (next.proposal === null ? 'Ход не предложен' : 'Ход предложен');
  if (master) {
    const accessOpen = next.playerPath !== null;
    get('share-controls').hidden = false;
    join.hidden = closeAccess.hidden = !accessOpen;
    get('access-closed').hidden = accessOpen;
    rotateLink.textContent = accessOpen ? 'Сменить ссылку' : 'Создать новую ссылку';
    if (accessOpen) join.href = next.playerUrl ?? next.playerPath;
    else join.removeAttribute('href');
    confirm.disabled = cancel.disabled = next.proposal === null;
  }
  const {x, y} = toPixel(next.position.q, next.position.r);
  const [centerX, centerY] = next.rotated ? [-y, x] : [x, y];
  map.setAttribute('viewBox', [centerX - 360, centerY - 260, 720, 520].join(' '));
  const {defs, terrain} = drawTerrain(next);
  const layer = shape('g', next.rotated ? {transform: 'rotate(90)'} : {});
  layer.append(...terrain, drawRoutes(next.routes), drawMarks(next.marks, next.rotated), drawPois(next.pois, next.rotated));
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

function drawRoutes(routes) {
  const group = shape('g', {'data-routes': '', 'pointer-events': 'none'});
  for (const {kind, width, faded, solid, points} of routes) {
    group.append(shape('polyline', {
      points: points.map(([x, y]) => `${x},${y}`).join(' '),
      'data-route-kind': kind,
      class: `route-${kind}${faded ? ' route-faded' : ''}${solid ? ' route-solid' : ''}`,
      'stroke-width': width,
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
  if (!view || next.revision > view.revision || (next.revision === view.revision && progress.dataset.error)) {
    delete progress.dataset.error;
    draw(next);
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
  if (revoked) return;
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
      progress.textContent = 'Связь с комнатой потеряна';
    }
  }
  if (!revoked) setTimeout(followRoom, 200);
}
void followRoom();
