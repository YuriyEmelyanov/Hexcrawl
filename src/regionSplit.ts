import { waterComponents, waterHexKey, type WaterHex } from './manualWater.ts';
import { SaveValidationError } from './saveValidation.ts';

export type SplitRegionNumber = { base: number; part: number };
type NumberedRegion = { id: number; splitNumber?: SplitRegionNumber };
type RegionFootprint = NumberedRegion & { hexes: WaterHex[]; centerHex: WaterHex };

export function regionNumber(region: NumberedRegion): string {
  const split = region.splitNumber;
  return split ? `${split.base}.${split.part}` : String(region.id);
}

export function nextRegionId(regions: readonly NumberedRegion[]): number {
  const next = regions.reduce((max, region) => Math.max(max, region.splitNumber?.base ?? region.id), 0) + 1;
  if (regions.some(region => region.id === next)) {
    throw new SaveValidationError('map.regions', 'region identifier range exhausted');
  }
  return next;
}

const compareHex = (left: WaterHex, right: WaterHex) => left.q - right.q || left.r - right.r;

export function prepareRegionSplits(regions: readonly RegionFootprint[]) {
  const ids = new Set(regions.map(region => region.id));
  const usedParts = new Map<number, Set<number>>();
  for (const { splitNumber } of regions) {
    if (!splitNumber) continue;
    let occupied = usedParts.get(splitNumber.base);
    if (!occupied) usedParts.set(splitNumber.base, occupied = new Set());
    occupied.add(splitNumber.part);
  }
  // Keep the primary part's original ID. Allocate the other internal IDs from
  // the top of the safe-integer range so they do not consume ordinary numbers.
  let nextInternal = Number.MAX_SAFE_INTEGER;
  const allocateId = () => {
    while (ids.has(nextInternal)) nextInternal -= 1;
    if (nextInternal <= 0) throw new SaveValidationError('map.regions', 'region identifier range exhausted');
    ids.add(nextInternal);
    return nextInternal--;
  };
  const plans = new Map<number, { parts: (NumberedRegion & { hexes: WaterHex[] })[]; byHex: Map<string, number> }>();
  for (const region of regions) {
    const hexByKey = new Map(region.hexes.map(hex => [waterHexKey(hex), hex]));
    const components = waterComponents(hexByKey.keys());
    if (components.length <= 1) continue;

    const primaryKey = waterHexKey(region.centerHex);
    const base = region.splitNumber?.base ?? region.id;
    const primaryPart = region.splitNumber?.part ?? 1;
    let occupied = usedParts.get(base);
    if (!occupied) usedParts.set(base, occupied = new Set());
    occupied.add(primaryPart);
    let nextPart = 2;
    const byHex = new Map<string, number>();
    const sorted = components
      .map(keys => keys.map(key => hexByKey.get(key)!).sort(compareHex))
      .map(hexes => ({ hexes, primary: hexes.some(hex => waterHexKey(hex) === primaryKey) }))
      .sort((left, right) => Number(right.primary) - Number(left.primary) || compareHex(left.hexes[0], right.hexes[0]));
    const parts = sorted.map(({ hexes, primary }) => {
      while (occupied.has(nextPart)) nextPart += 1;
      const part = primary ? primaryPart : nextPart++;
      occupied.add(part);
      const id = primary ? region.id : allocateId();
      for (const hex of hexes) byHex.set(waterHexKey(hex), id);
      return { id, splitNumber: { base, part }, hexes };
    });
    plans.set(region.id, { parts, byHex });
  }
  return plans;
}
