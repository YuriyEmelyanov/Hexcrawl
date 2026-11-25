import { createGenerationState, draw } from './worldRandom.ts';

export const CROWS_BUILDINGS = {
  smithy: { ru: 'Кузница', en: 'Smithy', max: 4 },
  crypt: { ru: 'Склеп', en: 'Crypt', max: 5 },
  shop: { ru: 'Лавка', en: 'Shop', max: 3 },
  inn: { ru: 'Трактир', en: 'Inn', max: 5 },
  temple: { ru: 'Храм', en: 'Temple', max: 5 },
  alchemyLab: { ru: 'Алхимическая лаборатория', en: 'Alchemy laboratory', max: 4 },
  auctionHouse: { ru: 'Аукционный дом', en: 'Auction house', max: 5 },
  barracks: { ru: 'Казармы', en: 'Barracks', max: 5 },
  beacon: { ru: 'Маяк', en: 'Beacon', max: 5 },
  bookshop: { ru: 'Книжная лавка', en: 'Bookshop', max: 6 },
  enchanter: { ru: 'Лавка зачарователя', en: 'Enchanter shop', max: 4 },
  stable: { ru: 'Конюшня', en: 'Stable', max: 5 },
  crowsGuild: { ru: 'Дом гильдии воронов', en: 'Crows guild house', max: 5 }
} as const;

export type BuildingType = keyof typeof CROWS_BUILDINGS;
export type CrowsBuilding = { type: BuildingType; level: number };
export type CrowsSettlement = { home: boolean; prosperity: number; buildings: CrowsBuilding[] };
export type CrowsSettlements = { starterGranted: boolean; byPoi: Record<string, CrowsSettlement> };

export const EMPTY_CROWS_SETTLEMENTS: CrowsSettlements = { starterGranted: false, byPoi: {} };
export const CROWS_BUILDING_TYPES = Object.keys(CROWS_BUILDINGS) as BuildingType[];
const STARTER_BUILDINGS: readonly BuildingType[] = ['smithy', 'crypt', 'shop', 'inn', 'temple'];
const STARTER_EXTRAS = CROWS_BUILDING_TYPES.filter(type => !STARTER_BUILDINGS.includes(type));

export function starterCrowsSettlement(worldSeed: number, regionId: number, cell: { q: number; r: number }): CrowsSettlement {
  // This roll is local to the starter and does not advance Classic's streams.
  const seed = (worldSeed ^ Math.imul(regionId, 0x9E3779B1) ^ Math.imul(cell.q, 0x85EBCA6B) ^ Math.imul(cell.r, 0xC2B2AE35)) >>> 0;
  const random = createGenerationState(seed);
  const extra = STARTER_EXTRAS[Math.floor(draw(random, 'poi') * STARTER_EXTRAS.length)];
  return { home: true, prosperity: 0, buildings: [...STARTER_BUILDINGS, extra].map(type => ({ type, level: 1 })) };
}

export function rebindCrowsSettlements(
  layer: CrowsSettlements,
  isSettlement: (owner: string) => boolean,
  moves: ReadonlyMap<string, string | null>
): CrowsSettlements {
  const moved = Object.entries(layer.byPoi).map(([owner, value]) => [moves.has(owner) ? moves.get(owner) : owner, value] as const);
  const retained = moved.filter((entry): entry is readonly [string, CrowsSettlement] => typeof entry[0] === 'string' && isSettlement(entry[0]));
  if (new Set(retained.map(([owner]) => owner)).size !== retained.length) throw Error('Crows settlement identity conflict');
  return { ...layer, byPoi: Object.fromEntries(retained) };
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

export function validCrowsSettlements(value: unknown, isSettlement: (owner: string) => boolean): boolean {
  if (!record(value) || typeof value.starterGranted !== 'boolean' || !record(value.byPoi)) return false;
  return Object.entries(value.byPoi).every(([owner, row]) => isSettlement(owner) &&
    record(row) && typeof row.home === 'boolean' && typeof row.prosperity === 'number' &&
    Number.isInteger(row.prosperity) && row.prosperity >= -10 && row.prosperity <= 10 &&
    Array.isArray(row.buildings) && row.buildings.every(building => {
      if (!record(building) || typeof building.type !== 'string' ||
        !Object.prototype.hasOwnProperty.call(CROWS_BUILDINGS, building.type)) return false;
      const max = CROWS_BUILDINGS[building.type as BuildingType].max;
      return typeof building.level === 'number' && Number.isInteger(building.level) && building.level >= 1 && building.level <= max;
    }));
}

export function villageBeaconRadius(village: CrowsSettlement): number {
  const level = village.buildings.reduce((max, building) =>
    building.type === 'beacon' ? Math.max(max, building.level) : max, 0);
  return level === 5 && village.prosperity === 10 ? 6 : level;
}
