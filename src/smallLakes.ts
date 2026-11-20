import {createDetailGrid, detailCellAreaSquareMiles, validateDetailFootprint, type DetailCell} from './detailGrid.ts';
import {fineCellKey, type OneMileCell} from './oneMile.ts';
import {createGenerationState,draw} from './worldRandom.ts';

export type SmallLake = Readonly<{
  id: number;
  cells: readonly DetailCell[];
  origin: 'manual' | 'automatic';
  shoreCells?: readonly DetailCell[];
}>;

export type SmallLakeLayer = Readonly<{nextId: number; lakes: readonly SmallLake[]}>;

const emptyLayer: SmallLakeLayer = {nextId: 1, lakes: []};

function exactRecord(value: unknown, keys: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key) && !optional.includes(key)) ||
      keys.some(key => !Object.prototype.hasOwnProperty.call(value, key))) {
    throw new Error('Invalid small lake record');
  }
  return value as Record<string, unknown>;
}

function parseLakeCell(raw: unknown): DetailCell {
  const {q, r} = exactRecord(raw, ['q', 'r']);
  if (typeof q !== 'number' || !Number.isSafeInteger(q) || typeof r !== 'number' || !Number.isSafeInteger(r)) {
    throw new Error('Invalid small lake cell');
  }
  return {q, r};
}

export const smallLakeNeighbours = (cell: DetailCell): DetailCell[] =>
  neighbours.map(([q, r]) => ({q: cell.q+q, r: cell.r+r}));

export function parseSmallLakes(raw: unknown): SmallLakeLayer {
  const {nextId, lakes} = exactRecord(raw, ['nextId', 'lakes']);
  if (typeof nextId !== 'number' || !Number.isSafeInteger(nextId) || nextId < 1 || !Array.isArray(lakes)) {
    throw new Error('Invalid small lake layer');
  }
  const ids = new Set<number>();
  const occupied = new Set<string>();
  const parsed = lakes.map(rawLake => {
    const fields = exactRecord(rawLake, ['id', 'cells', 'origin'], ['shoreCells']);
    const {id, cells, origin, shoreCells} = fields;
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1 || id >= nextId ||
        ids.has(id) || !Array.isArray(cells) || (origin !== 'manual' && origin !== 'automatic')) {
      throw new Error('Invalid small lake');
    }
    ids.add(id);
    const footprint = cells.map(parseLakeCell);
    validateDetailFootprint(footprint);
    const hasShore = Object.prototype.hasOwnProperty.call(fields, 'shoreCells');
    if (hasShore && (origin !== 'automatic' || !Array.isArray(shoreCells))) throw new Error('Invalid small lake shore');
    const shore = Array.isArray(shoreCells) ? shoreCells.map(parseLakeCell) : undefined;
    if (shore?.length) {
      const adjacent = new Set(footprint.flatMap(smallLakeNeighbours).map(fineCellKey));
      if (shore.some(cell => !adjacent.has(fineCellKey(cell)))) throw new Error('Invalid small lake shore');
    }
    for (const cell of [...footprint, ...(shore ?? [])]) {
      const key = fineCellKey(cell);
      if (occupied.has(key)) throw new Error('Small lake footprints or stored shores overlap');
      occupied.add(key);
    }
    return {id, cells: footprint, origin, ...(shore ? {shoreCells: shore} : {})} as const;
  });
  return {nextId, lakes: parsed};
}

const fineArea = detailCellAreaSquareMiles(createDetailGrid(1));
const tolerance = fineArea * 1e-8;

export function hasFullDrySupport(row: OneMileCell | undefined): boolean {
  return !!row && hasFullOneMileSupport(row) && !!row.landBiomeId && row.waterArea <= tolerance;
}

export function hasFullOneMileSupport(row:OneMileCell):boolean{
  return row.acceptedArea >= fineArea - tolerance;
}

type LakeCandidate = Readonly<{cell:DetailCell;chance:number}>;
const neighbours=([[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]] as const);
const compareCells=(a:DetailCell,b:DetailCell)=>a.q-b.q||a.r-b.r;

function smallLakeRoll(seed:number,stage:'seed'|'growth',cell:DetailCell):number{
  // The temporary RNG is seeded by place and phase. It never advances the
  // accepted world's geography or POI state.
  let hash=2166136261;
  for(const ch of `small-lakes-v1:${stage}:${fineCellKey(cell)}`)hash=Math.imul(hash^ch.charCodeAt(0),16777619);
  return draw(createGenerationState((seed^hash)>>>0),'geography');
}

/** Roll once per eligible coordinate, then grow once from the original seeds. */
export function rollSmallLakeFootprints(candidates:readonly LakeCandidate[],seed:number,expansionChance:number):DetailCell[][] {
  const sorted=[...candidates].sort((a,b)=>compareCells(a.cell,b.cell));
  const first=new Set(sorted.filter(({cell,chance})=>smallLakeRoll(seed,'seed',cell)<chance).map(({cell})=>fineCellKey(cell)));
  const adjacent=(cell:DetailCell)=>smallLakeNeighbours(cell).map(fineCellKey);
  const unvisited=new Map(sorted
    .filter(({cell})=>first.has(fineCellKey(cell))||adjacent(cell).some(key=>first.has(key))&&smallLakeRoll(seed,'growth',cell)<expansionChance)
    .map(({cell})=>[fineCellKey(cell),cell]));
  const components:DetailCell[][]=[];
  for(const [key,cell] of unvisited){
    const cells=[cell];
    unvisited.delete(key);
    for(const current of cells)for(const neighbour of adjacent(current)){
      const next=unvisited.get(neighbour);
      if(next){cells.push(next);unvisited.delete(neighbour);}
    }
    components.push(cells.sort(compareCells));
  }
  return components;
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

/** A region rollback can restore the previous counter only when every
 * intervening allocation belongs to that region's discarded automatic lakes. */
export function exactAutomaticLakeRollback(current:SmallLakeLayer,previous:SmallLakeLayer|undefined,
  supported:ReturnType<typeof prepareSmallLakeSupport>):boolean{
  const prior=previous??emptyLayer;
  if(!supported.losses.length||current.nextId!==prior.nextId+supported.losses.length||
    supported.losses.some(lake=>lake.origin!=='automatic'||lake.id<prior.nextId))return false;
  return supported.layer.lakes.length===prior.lakes.length&&supported.layer.lakes.every((lake,index)=>{
    const other=prior.lakes[index];
    return lake.id===other.id&&lake.origin===other.origin&&lake.cells.length===other.cells.length&&
      lake.cells.every((cell,i)=>fineCellKey(cell)===fineCellKey(other.cells[i]))&&
      (lake.shoreCells===undefined)===(other.shoreCells===undefined)&&
      (lake.shoreCells?.length??0)===(other.shoreCells?.length??0)&&
      (lake.shoreCells?.every((cell,i)=>fineCellKey(cell)===fineCellKey(other.shoreCells![i]))??true);
  });
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
