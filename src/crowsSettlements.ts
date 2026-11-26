import { createGenerationState, draw } from './worldRandom.ts';

export const CROWS_BUILDINGS = {
  smithy: { ru: 'Кузница', en: 'Smithy', max: 4, icon: 'hut' },
  crypt: { ru: 'Склеп', en: 'Crypt', max: 5, icon: 'graveyard' },
  shop: { ru: 'Лавка', en: 'Shop', max: 3, icon: 'hut' },
  inn: { ru: 'Трактир', en: 'Inn', max: 5, icon: 'tavern' },
  temple: { ru: 'Храм', en: 'Temple', max: 5, icon: 'monastery' },
  alchemyLab: { ru: 'Алхимическая лаборатория', en: 'Alchemy laboratory', max: 4, icon: 'hut' },
  auctionHouse: { ru: 'Аукционный дом', en: 'Auction house', max: 5, icon: 'hut' },
  barracks: { ru: 'Казармы', en: 'Barracks', max: 5, icon: 'fort' },
  beacon: { ru: 'Маяк', en: 'Beacon', max: 5, icon: 'tower' },
  bookshop: { ru: 'Книжная лавка', en: 'Bookshop', max: 6, icon: 'hut' },
  enchanter: { ru: 'Лавка зачарователя', en: 'Enchanter shop', max: 4, icon: 'hut' },
  stable: { ru: 'Конюшня', en: 'Stable', max: 5, icon: 'pasture' },
  crowsGuild: { ru: 'Дом гильдии воронов', en: 'Crows guild house', max: 5, icon: 'hut' }
} as const;

export type BuildingType = keyof typeof CROWS_BUILDINGS;
export type CrowsBuilding = { type: BuildingType; level: number };
export type CrowsSettlement = { home: boolean; prosperity: number; buildings: CrowsBuilding[] };
export type CrowsSettlements = { starterGranted: boolean; byPoi: Record<string, CrowsSettlement>; standaloneByPoi?: Record<string, CrowsBuilding> };

export const EMPTY_CROWS_SETTLEMENTS: CrowsSettlements = { starterGranted: false, byPoi: {} };
export const CROWS_BUILDING_TYPES = Object.keys(CROWS_BUILDINGS) as BuildingType[];
const STARTER_BUILDINGS: readonly BuildingType[] = ['smithy', 'crypt', 'shop', 'inn', 'temple'];
const STARTER_EXTRAS = CROWS_BUILDING_TYPES.filter(type => !STARTER_BUILDINGS.includes(type));

export const CROWS_SETTLEMENTS = {
  village: {ru:'Крохотная деревня', en:'Tiny village', prosperity:[-10,7], buildings:[1,10]},
  town: {ru:'Маленькая деревня', en:'Small village', prosperity:[-9,9], buildings:[2,11]},
  city: {ru:'Деревня', en:'Village', prosperity:[-8,9], buildings:[3,12]},
  capital: {ru:'Большая деревня', en:'Large village', prosperity:[-7,10], buildings:[4,13]}
} as const;

export type CrowsSettlementKind = keyof typeof CROWS_SETTLEMENTS;

export function isCrowsSettlementKind(kind?: string): kind is CrowsSettlementKind {
  return kind !== undefined && Object.prototype.hasOwnProperty.call(CROWS_SETTLEMENTS,kind);
}

// Classic chooses individual types rather than a separate structure roll.
const CLASSIC_STRUCTURES = new Set([
  'structure','castle','pasture','graveyard','fort','hut','tavern','tower','mill','monastery',
  'farm','stronghold','brewery','distillery','sawmill','apiary'
]);

export function isCrowsStructureSite(kind?: string): boolean {
  return kind !== undefined && CLASSIC_STRUCTURES.has(kind);
}

function pointRandom(worldSeed: number, regionId: number, cell: {q:number;r:number}) {
  // Crows content is local to the point and does not advance Classic's streams.
  const seed = (worldSeed ^ Math.imul(regionId, 0x9E3779B1) ^ Math.imul(cell.q, 0x85EBCA6B) ^ Math.imul(cell.r, 0xC2B2AE35)) >>> 0;
  const state = createGenerationState(seed);
  return (min: number, max: number) => min + Math.floor(draw(state, 'poi') * (max - min + 1));
}

export function rollCrowsPoint(kind: string | undefined, worldSeed: number, regionId: number,
  cell: {q:number;r:number}, settled: boolean, onRoad: boolean) {
  const roll = pointRandom(worldSeed,regionId,cell);
  if (isCrowsSettlementKind(kind)) {
    const category = CROWS_SETTLEMENTS[kind];
    const prosperity = roll(category.prosperity[0],category.prosperity[1]);
    const count = roll(category.buildings[0],category.buildings[1]);
    const pool = [...CROWS_BUILDING_TYPES];
    const buildings = Array.from({length:count}, () => {
      const [type] = pool.splice(roll(0,pool.length-1),1);
      return {type,level:roll(1,CROWS_BUILDINGS[type].max)};
    });
    return {settlement:{home:false,prosperity,buildings}};
  }
  if (isCrowsStructureSite(kind) && (settled || onRoad)) {
    const type = CROWS_BUILDING_TYPES[roll(0,CROWS_BUILDING_TYPES.length-1)];
    return {building:{type,level:roll(1,CROWS_BUILDINGS[type].max)}};
  }
  return {};
}

export function starterCrowsSettlement(worldSeed: number, regionId: number, cell: { q: number; r: number }): CrowsSettlement {
  const roll = pointRandom(worldSeed,regionId,cell);
  const extra = STARTER_EXTRAS[roll(0,STARTER_EXTRAS.length-1)];
  return { home: true, prosperity: 0, buildings: [...STARTER_BUILDINGS, extra].map(type => ({ type, level: 1 })) };
}

function rebindCrowsRows<T>(rows: Record<string,T>, allowed: (owner:string) => boolean,
  moves: ReadonlyMap<string,string|null>): Record<string,T> {
  const moved = Object.entries(rows).map(([owner,value]) => [moves.has(owner) ? moves.get(owner) : owner,value] as const);
  const retained = moved.filter((entry): entry is readonly [string,T] => typeof entry[0] === 'string' && allowed(entry[0]));
  if (new Set(retained.map(([owner]) => owner)).size !== retained.length) throw Error('Crows point identity conflict');
  return Object.fromEntries(retained);
}

export function rebindCrowsSettlements(layer: CrowsSettlements, kindFor:(owner:string)=>string|undefined,
  moves: ReadonlyMap<string,string|null>): CrowsSettlements {
  return {...layer,byPoi:rebindCrowsRows(layer.byPoi,owner=>isCrowsSettlementKind(kindFor(owner)),moves),
    ...(layer.standaloneByPoi && {standaloneByPoi:rebindCrowsRows(layer.standaloneByPoi,owner=>isCrowsStructureSite(kindFor(owner)),moves)})};
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));

function validBuilding(building: unknown): boolean {
  if (!record(building) || typeof building.type !== 'string' ||
    !Object.prototype.hasOwnProperty.call(CROWS_BUILDINGS, building.type)) return false;
  const max = CROWS_BUILDINGS[building.type as BuildingType].max;
  return typeof building.level === 'number' && Number.isInteger(building.level) && building.level >= 1 && building.level <= max;
}

export function validCrowsSettlements(value: unknown, kindFor:(owner:string)=>string|undefined): boolean {
  if (!record(value) || typeof value.starterGranted !== 'boolean' || !record(value.byPoi)) return false;
  return Object.entries(value.byPoi).every(([owner, row]) => isCrowsSettlementKind(kindFor(owner)) &&
    record(row) && typeof row.home === 'boolean' && typeof row.prosperity === 'number' &&
    Number.isInteger(row.prosperity) && row.prosperity >= -10 && row.prosperity <= 10 &&
    Array.isArray(row.buildings) && row.buildings.every(validBuilding)) &&
    (value.standaloneByPoi === undefined || record(value.standaloneByPoi) &&
      Object.entries(value.standaloneByPoi).every(([owner, building]) => isCrowsStructureSite(kindFor(owner)) && validBuilding(building)));
}

export function villageBeaconRadius(village: CrowsSettlement): number {
  const level = village.buildings.reduce((max, building) =>
    building.type === 'beacon' ? Math.max(max, building.level) : max, 0);
  return level === 5 && village.prosperity === 10 ? 6 : level;
}
