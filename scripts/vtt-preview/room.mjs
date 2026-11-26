// Isolated first vertical slice. The editor save stays on the server.
export const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const key = ({q, r}) => `${q},${r}`;

export function mapCells(save) {
  const cells = new Map();
  for (const region of save.map.regions) {
    for (const {q, r} of region.hexes) {
      const hex = {q, r};
      const terrain = save.map.terrainByHexKey[key(hex)]?.terrainOverride;
      const cell = {q, r, biome: save.map.biomeOverrideByHexKey[key(hex)] ?? region.biomeId,
        height: region.heightLevel, water: terrain === 'lake' || terrain === 'sea' ? terrain : null};
      cells.set(key(cell), cell);
    }
  }
  for (const [coord, {terrainOverride}] of Object.entries(save.map.terrainByHexKey)) {
    if (!cells.has(coord) && terrainOverride === 'sea') {
      const [q, r] = coord.split(',').map(Number);
      cells.set(coord, {q, r, biome: null, height: 1, water: 'sea'});
    }
  }
  return cells;
}

export function visibleAt(cells, position) {
  return [...cells.values()].filter(cell => {
    const q = cell.q - position.q, r = cell.r - position.r;
    return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= cell.height;
  });
}

export function viewOf(cells, state, master) {
  const visible = visibleAt(cells, state.position);
  return {
    position: state.position,
    mapMode: state.mapMode,
    proposal: state.proposal,
    revision: state.revision,
    cells: master ? [...cells.values()] : visible,
    ...(master ? {currentKeys: visible.map(key)} : {})
  };
}

export function applyAction(cells, state, action, master) {
  const {kind, direction, revision} = action;
  if (kind === 'propose' && Number.isInteger(direction) && directions[direction]) {
    return {...state, revision: state.revision + 1, proposal: direction};
  }
  if (!master || !['confirm', 'cancel'].includes(kind) || revision !== state.revision || state.proposal === null) {
    return null;
  }
  if (kind === 'cancel') return {...state, revision: state.revision + 1, proposal: null};
  const [dq, dr] = directions[state.proposal];
  const position = {q: state.position.q + dq, r: state.position.r + dr};
  if (!cells.has(key(position))) return null;
  return {...state, position, revision: state.revision + 1, proposal: null};
}
