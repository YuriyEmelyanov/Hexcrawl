const master = location.pathname === '/master';
const get = id => document.getElementById(id);
const map = get('map');
const position = get('position');
const progress = get('progress');
const confirm = get('confirm');
const cancel = get('cancel');
const vectors = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const signs = ['→', '↗', '↖', '←', '↙', '↘'];
const key = ({q, r}) => `${q},${r}`;
const point = ({q, r}) => [Math.sqrt(3) * 28 * (q + r / 2), 42 * r];
const palette = await fetch('/palette.json').then(response => response.json());
const onboard = location.hash.slice(1);
if (master && onboard) {
  localStorage.setItem('vtt-preview-master', onboard);
  history.replaceState(null, '', location.pathname);
}
const headers = master
  ? {authorization: 'Bearer ' + localStorage.getItem('vtt-preview-master')}
  : {'x-preview-room': location.pathname};
get('role').textContent = (master ? 'Мастер' : 'Игрок') + ' · Classic · 5–6 миль';
get('master-controls').hidden = !master;
let view;
let commandError = '';

function shape(name, attrs) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) element.setAttribute(k, v);
  return element;
}

function draw(next) {
  view = next;
  position.value = key(next.position);
  progress.textContent = commandError || (next.proposal === null ? 'Ход не предложен' : 'Ход предложен');
  if (master) {
    get('join').href = next.playerPath;
    get('join').hidden = false;
    confirm.disabled = cancel.disabled = next.proposal === null;
  }
  const [x, y] = point(next.position);
  map.setAttribute('viewBox', [x - 360, y - 260, 720, 520].join(' '));
  const current = new Set(next.currentKeys);
  const seen = new Set(next.history);
  const layer = next.cells.map(cell => {
    const [cx, cy] = point(cell);
    const p = Array.from({length: 6}, (_, i) => {
      const angle = (i * 60 + 30) * Math.PI / 180;
      return [cx + 28 * Math.cos(angle), cy + 28 * Math.sin(angle)].join(',');
    });
    const k = key(cell);
    return shape('polygon', {points: p.join(' '), 'data-cell': k,
      fill: cell.water ? palette.water[cell.water === 'sea' ? 'sea' : 'river'] : palette.ground[cell.biome] ?? '#B4C391',
      'fill-opacity': master && !current.has(k) ? seen.has(k) ? .66 : .31 : 1,
      stroke: '#738a83', 'stroke-width': '1.3'});
  });
  if (next.proposal !== null) {
    const [q, r] = vectors[next.proposal];
    const [dx, dy] = point({q, r});
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    layer.push(shape('path', {d: 'M12 0h25m-9 -7 9 7-9 7', transform: 'translate(' + x + ' ' + y + ') rotate(' + angle + ')',
      stroke: '#ffdc85', fill: 'none', 'stroke-width': 3, 'data-proposal': next.proposal}));
  }
  layer.push(shape('circle', {cx: x, cy: y, r: 9, fill: '#ffdc85', stroke: '#654918', 'data-party': ''}));
  map.replaceChildren(...layer);
}

async function refresh() {
  const response = await fetch('/state', {headers});
  if (!response.ok) throw new Error('Room unavailable');
  const next = await response.json();
  if (!view || next.revision > view.revision || progress.dataset.error) {
    delete progress.dataset.error;
    draw(next);
  }
}

async function action(kind, direction) {
  commandError = '';
  try {
    const response = await fetch('/state', {method: 'POST',
      headers: {...headers, 'content-type': 'application/json'},
      body: JSON.stringify({kind, direction, revision: view?.revision})});
    if (!response.ok) commandError = 'Действие не применено';
    await refresh();
  } catch {
    commandError = 'Связь с комнатой потеряна';
  }
  if (commandError) progress.textContent = commandError;
}

vectors.forEach((_, direction) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.direction = direction;
  button.textContent = signs[direction];
  button.addEventListener('click', () => void action('propose', direction));
  get('choices').append(button);
});
confirm.addEventListener('click', () => void action('confirm'));
cancel.addEventListener('click', () => void action('cancel'));

async function followRoom() {
  try {
    await refresh();
  } catch {
    progress.dataset.error = 'true';
    progress.textContent = 'Связь с комнатой потеряна';
  }
  setTimeout(followRoom, 200);
}
void followRoom();
