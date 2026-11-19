import {createDetailGrid, detailCellAreaSquareMiles, validateDetailFootprint, type DetailCell} from './detailGrid.ts';
import {fineCellKey, type OneMileCell} from './oneMile.ts';

export type SmallLake = Readonly<{
  id: number;
  cells: readonly DetailCell[];
  origin: 'manual' | 'automatic';
}>;

export type SmallLakeLayer = Readonly<{nextId: number; lakes: readonly SmallLake[]}>;

const emptyLayer: SmallLakeLayer = {nextId: 1, lakes: []};

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.prototype.hasOwnProperty.call(value, key))) {
    throw new Error('Invalid small lake record');
  }
  return value as Record<string, unknown>;
}

export function parseSmallLakes(raw: unknown): SmallLakeLayer {
  const {nextId, lakes} = exactRecord(raw, ['nextId', 'lakes']);
  if (typeof nextId !== 'number' || !Number.isSafeInteger(nextId) || nextId < 1 || !Array.isArray(lakes)) {
    throw new Error('Invalid small lake layer');
  }
  const ids = new Set<number>();
  const occupied = new Set<string>();
  const parsed = lakes.map(rawLake => {
    const {id, cells, origin} = exactRecord(rawLake, ['id', 'cells', 'origin']);
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1 || id >= nextId ||
        ids.has(id) || !Array.isArray(cells) || (origin !== 'manual' && origin !== 'automatic')) {
      throw new Error('Invalid small lake');
    }
    ids.add(id);
    const footprint = cells.map(rawCell => {
      const {q, r} = exactRecord(rawCell, ['q', 'r']);
      if (typeof q !== 'number' || typeof r !== 'number' || !Number.isSafeInteger(q) || !Number.isSafeInteger(r)) {
        throw new Error('Invalid small lake cell');
      }
      return {q, r};
    });
    validateDetailFootprint(footprint);
    for (const cell of footprint) {
      const key = fineCellKey(cell);
      if (occupied.has(key)) throw new Error('Small lake footprints overlap');
      occupied.add(key);
    }
    return {id, cells: footprint, origin} as const;
  });
  return {nextId, lakes: parsed};
}

const fineArea = detailCellAreaSquareMiles(createDetailGrid(1));
const tolerance = fineArea * 1e-8;

export function hasFullDrySupport(row: OneMileCell | undefined): boolean {
  return !!row && !!row.landBiomeId && row.acceptedArea >= fineArea - tolerance && row.waterArea <= tolerance;
}

export function prepareSmallLakeSupport(layer: SmallLakeLayer, accepted: readonly OneMileCell[]) {
  const coverage = new Map(accepted.map(row => [fineCellKey(row.cell), row]));
  const losses: SmallLake[] = [];
  const supported = layer.lakes.filter(lake => {
    const valid = lake.cells.every(cell => hasFullDrySupport(coverage.get(fineCellKey(cell))));
    if (!valid) losses.push(lake);
    return valid;
  });
  return {layer: losses.length ? {...layer, lakes: supported} : layer, losses};
}

export function validateSmallLakeSupport(layer: SmallLakeLayer, accepted: readonly OneMileCell[]): void {
  const {losses} = prepareSmallLakeSupport(layer, accepted);
  if (losses.length) throw new Error(`Small lake ${losses[0].id} has no full dry support`);
}

export function addManualSmallLake(layer: SmallLakeLayer | undefined, cells: readonly DetailCell[], accepted: readonly OneMileCell[]): SmallLakeLayer {
  const previous = layer ?? emptyLayer;
  const sorted = [...cells].sort((a,b) => a.q - b.q || a.r - b.r);
  const next = parseSmallLakes({
    nextId: previous.nextId + 1,
    lakes: [...previous.lakes, {id: previous.nextId, cells: sorted, origin: 'manual'}],
  });
  validateSmallLakeSupport(next, accepted);
  return next;
}
