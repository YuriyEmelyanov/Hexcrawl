/** ONE-MILE1 domain seam. Actual accepted geography, display cells and local
 * author edits have deliberately separate identities. No generator or UI state
 * is mutated here; the controller commits the returned document atomically. */
import {createDetailGrid, detailCellCenter, detailCellPolygon,
  detailCellAreaSquareMiles, detailPositiveAreaIntersections,
  type DetailCell, type WorldPoint} from './detailGrid.ts';

export type OneMileSource = Readonly<{
  cell: DetailCell;
  landBiomeId?: string;
  water?: 'sea' | 'lake';
}>;
export type FineCellEdit = Readonly<{
  name?: Readonly<{ru?: string; en?: string}>;
  landBiomeId?: string;
  note?: string;
}>;
export type FineCellEdits = Readonly<Record<string, FineCellEdit>>;
export type OneMileCell = Readonly<{
  cell: DetailCell;
  /** Full display polygon; never use this as accepted source geography. */
  polygon: readonly WorldPoint[];
  acceptedArea: number;
  landBiomeId?: string;
  waterArea: number;
}>;
const offsets = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]] as const;
export const fineCellKey = (cell: DetailCell): string => `${cell.q},${cell.r}`;
const compare = (a: DetailCell,b: DetailCell) => a.q-b.q || a.r-b.r;
const own = (value: object,key: string) => Object.prototype.hasOwnProperty.call(value,key);

/** Canonical ID comparison is independent of locale, array order and RNG.
 * First aggregate all pieces of the same biome; then compare to the true max
 * (not a tolerance chain, which can make the winner order-dependent). */
export function dominantFineBiome(parts: readonly Readonly<{biomeId: string; area: number}>[]): string | undefined {
  const areas = new Map<string,number>();
  for (const part of parts) {
    if (!part.biomeId || !Number.isFinite(part.area) || part.area < 0) throw Error('Invalid biome intersection');
    if (part.area > 0) {
      const total=(areas.get(part.biomeId) ?? 0)+part.area;
      if (!Number.isFinite(total)) throw Error('Invalid biome intersection total');
      areas.set(part.biomeId,total);
    }
  }
  if (!areas.size) return undefined;
  const max = Math.max(...areas.values()), tolerance = 1e-9 * detailCellAreaSquareMiles(createDetailGrid(1));
  return [...areas.keys()].sort().find(id => max-areas.get(id)! <= tolerance);
}

/** Input contains only accepted source cells, not placeholder terrain records.
 * A partial fine cell gets a full display polygon. Real water intersections
 * remain separate so a renderer can preserve the actual shoreline. */
export function projectOneMile(sources: readonly OneMileSource[], origin: WorldPoint = {x:0,y:0}): readonly OneMileCell[] {
  const fine = createDetailGrid(1,origin), source = createDetailGrid(6,origin);
  const seen = new Set<string>();
  const pending = new Map<string,{cell: DetailCell; area: number; water: number; parts: {biomeId:string;area:number}[]}>();
  for (const item of [...sources].sort((a,b)=>compare(a.cell,b.cell))) {
    const polygon = detailCellPolygon(source,item.cell), id = fineCellKey(item.cell);
    if (seen.has(id)) throw Error('Duplicate accepted source cell');
    seen.add(id);
    if (item.water !== undefined && item.water !== 'sea' && item.water !== 'lake') throw Error('Invalid water kind');
    if (!item.water && !item.landBiomeId) throw Error('Accepted land needs a biome');
    for (const hit of detailPositiveAreaIntersections(fine,polygon)) {
      const key = fineCellKey(hit.cell), row = pending.get(key) ?? {cell:hit.cell,area:0,water:0,parts:[]};
      row.area += hit.areaSquareMiles;
      if (item.water) row.water += hit.areaSquareMiles;
      else row.parts.push({biomeId:item.landBiomeId!,area:hit.areaSquareMiles});
      pending.set(key,row);
    }
  }
  return Object.freeze([...pending.values()].sort((a,b)=>compare(a.cell,b.cell)).map(row=>Object.freeze({
    cell:row.cell, polygon:Object.freeze(detailCellPolygon(fine,row.cell).map(p=>Object.freeze(p))),
    acceptedArea:row.area, waterArea:row.water, landBiomeId:dominantFineBiome(row.parts),
  })));
}

export type FineCandidate = Readonly<{cell: DetailCell; anchors: readonly DetailCell[]}>;
/** Exactly one edge-neighbour row, filtered by real ordinary-generator anchors.
 * No projected six-mile-wide candidate carpet and no invented legal anchors. */
export function oneMileCandidates(accepted: readonly OneMileCell[], legalAnchors: readonly DetailCell[], origin: WorldPoint = {x:0,y:0}): readonly FineCandidate[] {
  const fine=createDetailGrid(1,origin), source=createDetailGrid(6,origin);
  const occupied=new Set(accepted.map(row=>fineCellKey(row.cell))), rim=new Map<string,DetailCell>();
  for (const {cell} of accepted) for (const [q,r] of offsets) {
    const next={q:cell.q+q,r:cell.r+r}; detailCellCenter(fine,next);
    if (!occupied.has(fineCellKey(next))) rim.set(fineCellKey(next),next);
  }
  const matches=new Map<string,Map<string,DetailCell>>();
  for (const anchor of legalAnchors) {
    const polygon=detailCellPolygon(source,anchor);
    for (const hit of detailPositiveAreaIntersections(fine,polygon)) {
      const key=fineCellKey(hit.cell);if (!rim.has(key)) continue;
      const row=matches.get(key) ?? new Map<string,DetailCell>();
      row.set(fineCellKey(anchor),Object.freeze({...anchor})); matches.set(key,row);
    }
  }
  return Object.freeze([...matches].map(([key,anchors])=>Object.freeze({cell:Object.freeze(rim.get(key)!),anchors:Object.freeze([...anchors.values()].sort(compare))})).sort((a,b)=>compare(a.cell,b.cell)));
}

/** Pointer position and keyboard centre use the same source anchor choice.
 * The caller still revalidates revision/busy/legal candidates before invoking
 * one ordinary generator unit. This function never performs generation. */
export function chooseOneMileAnchor(candidate: FineCandidate, point: WorldPoint | undefined, origin: WorldPoint = {x:0,y:0}): DetailCell | undefined {
  const fine=createDetailGrid(1,origin), source=createDetailGrid(6,origin), target=point ?? detailCellCenter(fine,candidate.cell);
  if (!Number.isFinite(target.x)||!Number.isFinite(target.y)) throw Error('Invalid pointer');
  let best: DetailCell | undefined, distance=Infinity;
  for (const anchor of [...candidate.anchors].sort(compare)) {
    const center=detailCellCenter(source,anchor), d=(center.x-target.x)**2+(center.y-target.y)**2;
    const tolerance=Number.EPSILON*32*Math.max(1,d,Number.isFinite(distance)?distance:0);
    if (!best || d<distance-tolerance) {best=anchor;distance=d;}
  }
  return best;
}

function record(value: unknown,label: string): Record<string,unknown> {
  if (!value || typeof value!=='object' || Array.isArray(value) || !(Object.getPrototypeOf(value)===null || Object.getPrototypeOf(Object.getPrototypeOf(value))===null)) throw Error(`Invalid ${label}`);
  return value as Record<string,unknown>;
}
/** Strict fine-address map. The enclosing physical layer supplies immutable
 * grid identity/origin and accepted support. Reading never deletes orphans. */
export function parseFineCellEdits(value: unknown, accepted: readonly OneMileCell[], validBiome: (id:string)=>boolean): FineCellEdits {
  const input=record(value,'fine edits'), support=new Map(accepted.map(row=>[fineCellKey(row.cell),row]));
  const result: Record<string,FineCellEdit>={};
  for (const [key,raw] of Object.entries(input)) {
    if (!/^-?(?:0|[1-9]\d*),-?(?:0|[1-9]\d*)$/.test(key)) throw Error('Invalid fine address');
    const [q,r]=key.split(',').map(Number);detailCellCenter(createDetailGrid(1),{q,r});
    if (fineCellKey({q,r})!==key || !support.has(key)) throw Error('Orphan fine address');
    const row=record(raw,'fine edit');
    if (Object.keys(row).some(k=>!['name','landBiomeId','note'].includes(k))) throw Error('Unknown fine field');
    const parsed: {name?: {ru?:string;en?:string}; landBiomeId?: string;note?:string}={};
    if (own(row,'name')) {
      const name=record(row.name,'fine name'), names: {ru?:string;en?:string}={};
      for (const [language,text] of Object.entries(name)) {
        if ((language!=='ru'&&language!=='en') || typeof text!=='string' || text.length>200) throw Error('Invalid fine name');
        names[language]=text;
      }
      parsed.name=Object.freeze(names);
    }
    if (own(row,'landBiomeId')) {
      if (typeof row.landBiomeId!=='string' || !validBiome(row.landBiomeId) || support.get(key)!.waterArea>0 || !support.get(key)!.landBiomeId) throw Error('Invalid fine biome override');
      parsed.landBiomeId=row.landBiomeId;
    }
    if (own(row,'note')) {
      if (typeof row.note!=='string'||row.note.length>20000) throw Error('Invalid fine note');
      parsed.note=row.note;
    }
    result[key]=Object.freeze(parsed);
  }
  return Object.freeze(result);
}

/** All local fields form one immutable command result. Undefined fields mean
 * reset to the computed default. A stale revision/target refuses the whole
 * command; the caller owns draft guards and the single history transaction. */
export function prepareFineCellEdit(input: Readonly<{
  edits: FineCellEdits; target: DetailCell; revision: number; expectedRevision: number;
  accepted: readonly OneMileCell[]; language:'ru'|'en'; name?: string;note?: string;landBiomeId?: string;
}>, validBiome: (id:string)=>boolean): FineCellEdits {
  if (!Number.isSafeInteger(input.revision)||input.revision<0||input.revision!==input.expectedRevision) throw Error('Stale fine edit');
  if (input.language!=='ru'&&input.language!=='en') throw Error('Invalid fine language');
  detailCellCenter(createDetailGrid(1),input.target);
  const key=fineCellKey(input.target), current=parseFineCellEdits(input.edits,input.accepted,validBiome);
  const prior=current[key]??{}, names={...prior.name};
  if (input.name===undefined) delete names[input.language];else names[input.language]=input.name;
  const next={...current,[key]:{...(Object.keys(names).length?{name:names}:{}),...(input.note===undefined?{}:{note:input.note}),...(input.landBiomeId===undefined?{}:{landBiomeId:input.landBiomeId})}};
  // Validate even an empty edit against support before canonical removal.
  const checked=parseFineCellEdits(next,input.accepted,validBiome);
  if (!Object.keys(checked[key]).length) {const reset={...checked};delete reset[key];return Object.freeze(reset);}
  return checked;
}

/** Destructive source commands must surface authored losses before a commit.
 * Consent and removal are in the same prepared result; undo restores the old
 * snapshot. Calling this during rendering/import to tidy data is forbidden. */
export function prepareFineCellLoss(edits: FineCellEdits, acceptedAfter: readonly OneMileCell[], consent: boolean): Readonly<{edits: FineCellEdits; losses: readonly string[]}> {
  const support=new Set(acceptedAfter.map(row=>fineCellKey(row.cell))), losses=Object.keys(edits).filter(key=>!support.has(key)).sort();
  if (losses.length&&consent!==true) throw Error('Fine edits require explicit loss consent');
  const next={...edits};for (const key of losses) delete next[key];
  return Object.freeze({edits:Object.freeze(next),losses:Object.freeze(losses)});
}
