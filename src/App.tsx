import { type ChangeEvent, type CSSProperties, type KeyboardEvent, type MouseEvent, type TouchEvent, type WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getOutgoingConnectorFullnessFromEndpoint, type RiverFullness } from './riverFullness';

type AxialHex = {
  q: number;
  r: number;
};

type HexType = 'region' | 'candidate' | 'center';

type BiomeLandType = 'settled' | 'wild';
type CentralPoiKind = 'capital' | 'city' | 'town' | 'village' | 'lair' | 'ruins' | 'cursed_place' | 'holy_place';
type SettlementPoiKind = Extract<CentralPoiKind, 'city' | 'town' | 'village'>;
type SecondaryPoiKind =
  | 'dungeon'
  | 'camp'
  | 'castle'
  | 'pasture'
  | 'cave'
  | 'graveyard'
  | 'fort'
  | 'hut'
  | 'mine'
  | 'obelisk'
  | 'ruins'
  | 'holy_place'
  | 'cursed_place'
  | 'lair'
  | 'tavern'
  | 'tower'
  | 'portal'
  | 'mill'
  | 'monastery'
  | 'farm'
  | 'statue'
  | 'stronghold'
  | 'brewery'
  | 'distillery'
  | 'sawmill'
  | 'stone_quarry'
  | 'apiary'
  | 'quarry';
type PoiKind = SettlementPoiKind | SecondaryPoiKind;
type RegionHeightLevel = 1 | 2 | 3;

type BiomeId =
  | 'plain_deciduous_forest'
  | 'plain_mixed_forest'
  | 'plain_coniferous_forest'
  | 'deciduous_forested_hills'
  | 'mixed_forested_hills'
  | 'coniferous_forested_hills'
  | 'open_hills'
  | 'coniferous_mountain_forest'
  | 'mixed_mountain_forest'
  | 'deciduous_mountain_forest'
  | 'mountains'
  | 'open_plains'
  | 'swamp_forest'
  | 'swamp'
  | 'hilly_woodland'
  | 'mountain_woodland'
  | 'deciduous_woodland'
  | 'mixed_woodland'
  | 'coniferous_woodland'
  | 'semi_desert';

type Region = {
  id: number;
  hexes: AxialHex[];
  centerHex: AxialHex;
  anchorHex: AxialHex;
  targetSize: number;
  finalSize: number;
  sizeCategory: 'locality' | 'small_region' | 'region' | 'large_region' | 'land' | 'vast_land';
  sizeLabel: 'Местность' | 'Малый регион' | 'Регион' | 'Большой регион' | 'Край' | 'Обширный край';
  biomeLandType: BiomeLandType;
  heightLevel: RegionHeightLevel;
  biomeId: BiomeId;
  biomeLabel: string;
  biomePrimaryEmoji: string;
  biomeSecondaryEmojis: string[];
  biomeEmojiLabel: string;
  pointsOfInterest: AxialHex[];
  pointOfInterestKinds?: Record<string, PoiKind>;
  centralPoiKind?: CentralPoiKind;
  // Прибрежный ли регион. Необязательное поле — старые сохранения без него
  // корректно читаются как "не прибрежный".
  isCoastal?: boolean;
};

type HexMeta = {
  regionId: number;
  isCenter: boolean;
  isAnchor: boolean;
};

type HexEdge = {
  from: RiverVertex;
  to: RiverVertex;
  neighborHex: AxialHex;
  edgeKey: string;
};

type RiverSectorReason = 'river_start' | 'river_confluence' | 'lake' | 'region_boundary' | 'split' | 'unknown';
type RiverStartMode = 'existing river endpoint' | 'red vertex' | 'mountain source';

type RiverSector = {
  id: string;
  riverId: number | string;
  sectorIndex: number;
  vertexPath: RiverVertex[];
  edgeKeys: string[];
  startVertexKey: string;
  endVertexKey: string;
  startReason: RiverSectorReason;
  endReason: Exclude<RiverSectorReason, 'river_start'> | 'river_end';
  fullness: RiverFullness;
  assignedRegionId?: number;
};

type River = {
  id: number;
  regionId: number;
  vertexPath: RiverVertex[];
  sectors: RiverSector[];
  controlPoints?: {
    startVertex: RiverVertex;
    middlePurpleVertex?: RiverVertex;
    endVertex: RiverVertex;
    startMode: RiverStartMode;
  };
};

type RiverConfluence = {
  id: string;
  tributaryRiverId: number;
  mainRiverId: number;
  vertexKey: string;
};

type RiverConnectorSplit = {
  vertex: RiverVertex;
  upstreamFullness: RiverFullness;
  downstreamFullness: RiverFullness;
};

type RoadKind = 'road' | 'trail';
type RoadSegment = { from: AxialHex; to: AxialHex; kind: RoadKind };
type Road = { id: number; regionId: number; segments: RoadSegment[] };
type RoadCandidatePath = {
  basePath: AxialHex[];
  extendedPath: AxialHex[];
  targetHex: AxialHex;
  targetIsPoi: boolean;
  crossedRiverCount: number;
  touchedPoiCount: number;
  touchedPoiKeys: Set<string>;
};

type WildRoadCandidate = {
  startRoadId: number;
  targetRoadId?: number;
  path: AxialHex[];
  crossedRiverCount: number;
  targetKind: 'candidate' | 'road';
  targetDistanceFromStartRoadCenter: number;
  startEndpointKey: string;
  targetEndpointKey: string;
};

type WildIncomingRoadPairCandidate = {
  startRoadId: number;
  targetRoadId: number;
  path: AxialHex[];
  crossedRiverCount: number;
};

type WildCandidateRoadCandidate = {
  path: AxialHex[];
  crossedRiverCount: number;
};

type RiverVertex = {
  x: number;
  y: number;
  key: string;
};

type LakeVertex = RiverVertex;

type Lake = {
  lakeId: number;
  hexes: AxialHex[];
  vertices: RiverVertex[];
};


type RiverConnectionType = 'start' | 'end';

type RiverConnection = {
  riverId: number;
  type: RiverConnectionType;
  vertex: RiverVertex;
};

type RiverEndpointTouch = {
  riverId: number;
  endpointType: RiverConnectionType;
  vertex: RiverVertex;
};

type VertexUsage = {
  vertex: RiverVertex;
  currentRegionCount: number;
  otherRegionCount: number;
  candidateCount: number;
};

type RiverHeightConstraint = {
  minHeight?: RegionHeightLevel;
  maxHeight?: RegionHeightLevel;
  reasons: string[];
};
type ChooseBiomeResult = {
  biomeId: BiomeId | null;
  reason?: 'river_height_constraint_failed';
};

const HEX_SIZE = 28;
const SQRT3 = Math.sqrt(3);
const SHOW_HEX_COORDINATES = false;
const SHOW_BIOME_EMOJI = true;
const REGION_CENTER_EMOJI = '★';
const CENTRAL_POI_DETAILS: Record<CentralPoiKind, { emoji: string; label: Record<Language, string> }> = {
  capital: { emoji: '👑', label: { ru: 'Столица', en: 'Capital' } },
  city: { emoji: '🏰', label: { ru: 'Город', en: 'City' } },
  town: { emoji: '🏘️', label: { ru: 'Городок', en: 'Town' } },
  village: { emoji: '🛖', label: { ru: 'Деревня', en: 'Village' } },
  lair: { emoji: '🐾', label: { ru: 'Логово', en: 'Lair' } },
  ruins: { emoji: '🏚️', label: { ru: 'Руины', en: 'Ruins' } },
  cursed_place: { emoji: '☠️', label: { ru: 'Проклятое место', en: 'Cursed place' } },
  holy_place: { emoji: '✨', label: { ru: 'Святое место', en: 'Holy place' } }
};
const POI_DETAILS: Record<PoiKind, { emoji: string; label: Record<Language, string> }> = {
  ...CENTRAL_POI_DETAILS,
  dungeon: { emoji: '🕳️', label: { ru: 'Подземелье', en: 'Dungeon' } },
  camp: { emoji: '⛺', label: { ru: 'Лагерь', en: 'Camp' } },
  castle: { emoji: '🏯', label: { ru: 'Замок', en: 'Castle' } },
  pasture: { emoji: '🐑', label: { ru: 'Пастбище', en: 'Pasture' } },
  cave: { emoji: '🪨', label: { ru: 'Пещера', en: 'Cave' } },
  graveyard: { emoji: '🪦', label: { ru: 'Кладбище', en: 'Graveyard' } },
  fort: { emoji: '🛡️', label: { ru: 'Форт', en: 'Fort' } },
  hut: { emoji: '🏚️', label: { ru: 'Хижина', en: 'Hut' } },
  mine: { emoji: '⛏️', label: { ru: 'Рудник', en: 'Mine' } },
  obelisk: { emoji: '🗿', label: { ru: 'Обелиск', en: 'Obelisk' } },
  tavern: { emoji: '🍺', label: { ru: 'Таверна', en: 'Tavern' } },
  tower: { emoji: '🗼', label: { ru: 'Башня', en: 'Tower' } },
  portal: { emoji: '🌀', label: { ru: 'Портал', en: 'Portal' } },
  mill: { emoji: '🌾', label: { ru: 'Мельница', en: 'Mill' } },
  monastery: { emoji: '⛪', label: { ru: 'Монастырь', en: 'Monastery' } },
  farm: { emoji: '🚜', label: { ru: 'Ферма', en: 'Farm' } },
  statue: { emoji: '🗽', label: { ru: 'Статуя', en: 'Statue' } },
  stronghold: { emoji: '🏰', label: { ru: 'Крепость', en: 'Stronghold' } },
  brewery: { emoji: '🍻', label: { ru: 'Пивоварня', en: 'Brewery' } },
  distillery: { emoji: '🥃', label: { ru: 'Винокурня', en: 'Distillery' } },
  sawmill: { emoji: '🪚', label: { ru: 'Лесопилка', en: 'Sawmill' } },
  stone_quarry: { emoji: '⛏️', label: { ru: 'Каменоломня', en: 'Stone quarry' } },
  apiary: { emoji: '🐝', label: { ru: 'Пасека', en: 'Apiary' } },
  quarry: { emoji: '🚧', label: { ru: 'Карьер', en: 'Quarry' } }
};
const WILD_CENTRAL_POI_KINDS: CentralPoiKind[] = ['lair', 'ruins', 'cursed_place', 'holy_place'];
const POI_EMOJI = '◆';
const WATER_COLOR = 'var(--water-color)';
const LAKE_HEX_COLOR = WATER_COLOR;
// Море (прибрежные воды) — заметно темнее озёр и рек (BR-006).
const SEA_HEX_COLOR = '#2b6b9e';
const SEA_EMOJI = '🌊';
const SEA_HEIGHT_LEVEL = 0;
const MOBILE_LAYOUT_QUERY = '(max-width: 900px)';
const MIN_MAP_SCALE = 0.2;
const MAX_MAP_SCALE = 6;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const TELEGRAM_URL = 'https://t.me/+npFQfQkVklo5Njky';
const YOUTUBE_URL = 'https://www.youtube.com/@Hex_Crawl';


type HexTerrainOverride = 'lake' | 'sea';

type HexTerrainData = {
  terrainOverride?: HexTerrainOverride;
  lakeId?: number;
};

type Biome = {
  id: BiomeId;
  label: string;
  color: string;
  primaryEmoji: string;
  secondaryEmojis: string[];
  wildWeight: number;
  settledWeight: number;
  heightLevel: RegionHeightLevel;
};

type HexcrawlSaveData = {
  schema: 'hexcrawl-map';
  version: 1;
  savedAt: string;
  map: {
    regions: Region[];
    candidateHexes: AxialHex[];
    rivers: River[];
    roads: Road[];
    terrainByHexKey: Record<string, HexTerrainData>;
  };
  counters: {
    nextLakeId: number;
    nextRoadId: number;
  };
  ui: {
    selectedHex: AxialHex | null;
    isMapRotated: boolean;
    mapScale: number;
  };
};

type ValidatedHexcrawlSaveData = HexcrawlSaveData & {
  map: HexcrawlSaveData['map'] & {
    terrainByHexKey: Record<string, HexTerrainData>;
  };
};

const HEXCRAWL_SAVE_SCHEMA = 'hexcrawl-map';
const HEXCRAWL_SAVE_VERSION = 1;
const PNG_EXPORT_SCALE = 2;
const EXPORT_FILE_PREFIX = 'hexcrawl-map';
const BIOME_TILE_HREFS: Partial<Record<BiomeId, string>> = {
  open_plains: '/Open_plains.png',
  plain_deciduous_forest: '/Lowland_deciduous_forest.png',
  plain_coniferous_forest: '/Lowland_coniferous_forest.png',
  plain_mixed_forest: '/Lowland_mixed_forest.png',
  deciduous_forested_hills: '/Deciduous_forested_hills.png',
  mixed_forested_hills: '/Mixed_forested_hills.png',
  coniferous_forested_hills: '/Coniferous_forested_hills.png',
  open_hills: '/Open_hills.png',
  coniferous_mountain_forest: '/Coniferous_mountain_forest.png',
  mixed_mountain_forest: '/Mixed_mountain_forest.png',
  deciduous_mountain_forest: '/Deciduous_mountain_forest.png',
  mountains: '/Mountains.png',
  swamp_forest: '/Swamp_forest.png',
  swamp: '/Swamp.png',
  hilly_woodland: '/Hilly_woodland.png',
  mountain_woodland: '/Mountain_woodland.png',
  deciduous_woodland: '/Deciduous_woodland.png',
  mixed_woodland: '/Mixed_woodland.png',
  coniferous_woodland: '/Coniferous%20woodland.png',
  semi_desert: '/Semi-desert.png'
};
const SVG_EXPORT_STYLES = `
  svg { --water-color: #3ea2ff; background: #0c1423; }
  .hex { stroke:#617187; stroke-width:1; }
  .hex.center { stroke:#707f96; }
  .hex.candidate { fill:#4f5f72; stroke:#7f8ea3; cursor:pointer; stroke-dasharray:2 2; }
  .hex.click-prompt { stroke:#f7dc6f; stroke-width:2; }
  .click-prompt-label { fill:#fff7bf; stroke:#0c1423; stroke-width:3px; paint-order:stroke; font-size:12px; font-weight:800; pointer-events:none; }
  .hex-label { fill:#f4f8ff; font-size:11px; pointer-events:none; }
  .rivers-layer, .roads-layer, .river-debug-layer { pointer-events:none; }
  .river-polyline { fill:none; stroke:#3ea2ff; stroke-linecap:round; stroke-linejoin:round; }
  .river-direction-arrow { stroke:#ffffff; stroke-width:1.2; stroke-linecap:round; }
  .river-arrow-head { fill:#ffffff; }
  .road-line { stroke:#8b6a3f; stroke-width:3; stroke-linecap:round; }
  .road-trail-dot { fill:#8b6a3f; }
  .dbg-node-all { fill:#a0a7b2; opacity:.85; }
  .dbg-node-boundary { fill:#ffd84a; }
  .dbg-node-candidate { fill:#57df63; }
  .dbg-first-segment { stroke:#c17cff; stroke-width:4; stroke-linecap:round; }
  .dbg-last-segment { stroke:#ff9f40; stroke-width:4; stroke-linecap:round; }
  .dbg-start { fill:#3f83ff; }
  .dbg-end { fill:#ff4b4b; }
  .dbg-river-id { fill:#ffffff; font-size:10px; }
  .dbg-lake-vertex { fill:#ff4d00; stroke:#2b1200; stroke-width:0.6; }
  .dbg-node-exterior { fill:#ff2a2a; opacity:0.95; }
  .dbg-node-central { fill:#9b59ff; opacity:0.95; }
  .dbg-node-neighbor-region { fill:#ff9a2a; opacity:0.95; }
`;


type Language = 'ru' | 'en';

const UI_TEXT = {
  ru: {
    languageName: 'Русский', switchLanguage: 'Switch to English', reset: 'Сбросить', regenerateRegion: 'Перегенерировать регион', deleteLastRegion: 'Удалить последний регион', export: 'Выгрузить', importJson: 'Загрузить JSON', debug: 'Отладка', controlsLabel: 'Управление картой', genParamsLabel: 'Параметры генерации', size: 'Размер', type: 'Тип', biome: 'Биом', coast: 'Берег', auto: 'Авто', settled: 'Освоенный', wild: 'Дикий', coastOption: 'Побережье', mainland: 'Материк', closeNotice: 'Закрыть уведомление', mapAria: 'Карта: перетаскивайте пальцем или мышью, стрелки клавиатуры перемещают область просмотра', rotateMap: 'Повернуть карту на 90 градусов', rotateMapTitle: 'Повернуть карту на 90°', unrotateMap: 'Вернуть исходный поворот карты', showTiles: 'Включить тайлы', showTilesTitle: 'Переключить карту на тайлы', tilesMode: 'Тайлы', emojiMode: 'Эмоджи', showEmoji: 'Включить эмоджи', showEmojiTitle: 'Переключить карту на эмоджи', showPanel: 'Показать панель управления и информации', hidePanel: 'Скрыть панель управления и информации', startPrompt: 'Нажми на стартовый гекс', candidatePrompt: 'Выберите гекс-кандидат для добавления региона', selectedHexInfo: 'Информация о выбранном гексе', candidateForRegion: 'Кандидат для нового региона', noHexSelected: 'Гекс не выбран', lake: 'Озеро', settledRegion: 'Освоенный регион', wildArea: 'Дикая местность', centralPoi: 'Центральная точка интереса', poi: 'Точка интереса', road: 'Дорога', trail: 'Тропа', nearby: 'Рядом:', river: 'Река', sea: 'Море', debugInfo: 'Отладочная информация', regions: 'Регионов', lastRegion: 'Последний регион', regionSize: 'Размер региона', height: 'Высота', targetSize: 'Целевой размер', finalSize: 'Фактический размер региона', poiCount: 'Точек интереса', selectedHex: 'Выбранный гекс', selectedRegionHeight: 'Высота выбранного региона', selectedRegionSize: 'Размер выбранного региона', yes: 'да', no: 'нет', roadNumbers: 'Номера дорог', trailNumbers: 'Номера троп', regionPoiCount: 'Точек интереса в регионе', regionRoads: 'Дорог региона', regionTrails: 'Троп региона', regionRivers: 'Реки региона', riverSectors: 'Речные сектора:', sector: 'сектор', fullness: 'полноводность', confluences: 'Слияния:', flowsInto: 'впадает в', regionLakes: 'Озёра региона', selectRegionHex: 'Выберите региональный гекс.', noRiverInRegion: 'В выбранном регионе нет реки для подробной отладки.', pngExportError: 'Не удалось выгрузить PNG-файл.', jsonImportError: 'Не удалось загрузить JSON-файл.', youtubeLabel: 'YouTube канал', telegramLabel: 'Telegram канал', showHeaderLinks: 'Показать кнопки языка и соцсетей', hideHeaderLinks: 'Скрыть кнопки языка и соцсетей' },
  en: {
    languageName: 'English', switchLanguage: 'Переключить на русский', reset: 'Reset', regenerateRegion: 'Regenerate region', deleteLastRegion: 'Delete last region', export: 'Export', importJson: 'Load JSON', debug: 'Debug', controlsLabel: 'Map controls', genParamsLabel: 'Generation parameters', size: 'Size', type: 'Type', biome: 'Biome', coast: 'Coast', auto: 'Auto', settled: 'Settled', wild: 'Wild', coastOption: 'Coast', mainland: 'Mainland', closeNotice: 'Close notice', mapAria: 'Map: drag with touch or mouse; keyboard arrows move the viewport', rotateMap: 'Rotate map 90 degrees', rotateMapTitle: 'Rotate map 90°', unrotateMap: 'Restore original map rotation', showTiles: 'Show tiles', showTilesTitle: 'Switch map to tiles', tilesMode: 'Tiles', emojiMode: 'Emoji', showEmoji: 'Show emoji', showEmojiTitle: 'Switch map to emoji', showPanel: 'Show controls and information panel', hidePanel: 'Hide controls and information panel', startPrompt: 'Click the starting hex', candidatePrompt: 'Select a candidate hex to add a region', selectedHexInfo: 'Selected hex information', candidateForRegion: 'Candidate for a new region', noHexSelected: 'No hex selected', lake: 'Lake', settledRegion: 'Settled region', wildArea: 'Wild area', centralPoi: 'Central point of interest', poi: 'Point of interest', road: 'Road', trail: 'Trail', nearby: 'Nearby:', river: 'River', sea: 'Sea', debugInfo: 'Debug information', regions: 'Regions', lastRegion: 'Last region', regionSize: 'Region size', height: 'Height', targetSize: 'Target size', finalSize: 'Final region size', poiCount: 'Points of interest', selectedHex: 'Selected hex', selectedRegionHeight: 'Selected region height', selectedRegionSize: 'Selected region size', yes: 'yes', no: 'no', roadNumbers: 'Road numbers', trailNumbers: 'Trail numbers', regionPoiCount: 'Points of interest in region', regionRoads: 'Region roads', regionTrails: 'Region trails', regionRivers: 'Region rivers', riverSectors: 'River sectors:', sector: 'sector', fullness: 'fullness', confluences: 'Confluences:', flowsInto: 'flows into', regionLakes: 'Region lakes', selectRegionHex: 'Select a region hex.', noRiverInRegion: 'The selected region has no river for detailed debugging.', pngExportError: 'Failed to export PNG file.', jsonImportError: 'Failed to load JSON file.', youtubeLabel: 'YouTube channel', telegramLabel: 'Telegram channel', showHeaderLinks: 'Show language and social buttons', hideHeaderLinks: 'Hide language and social buttons' }
} as const;

const SIZE_LABELS: Record<Language, Record<Region['sizeCategory'], string>> = {
  ru: { locality: 'Местность', small_region: 'Малый регион', region: 'Регион', large_region: 'Большой регион', land: 'Край', vast_land: 'Обширный край' },
  en: { locality: 'Locality', small_region: 'Small region', region: 'Region', large_region: 'Large region', land: 'Land', vast_land: 'Vast land' }
};

const BIOME_LABELS_EN: Record<BiomeId, string> = {
  plain_deciduous_forest: 'Lowland deciduous forest', plain_mixed_forest: 'Lowland mixed forest', plain_coniferous_forest: 'Lowland coniferous forest', deciduous_forested_hills: 'Deciduous forested hills', mixed_forested_hills: 'Mixed forested hills', coniferous_forested_hills: 'Coniferous forested hills', open_hills: 'Open hills', coniferous_mountain_forest: 'Coniferous mountain forest', mixed_mountain_forest: 'Mixed mountain forest', deciduous_mountain_forest: 'Deciduous mountain forest', mountains: 'Mountains', open_plains: 'Open plains', swamp_forest: 'Swamp forest', swamp: 'Swamp', hilly_woodland: 'Hilly woodland', mountain_woodland: 'Mountain woodland', deciduous_woodland: 'Deciduous woodland', mixed_woodland: 'Mixed woodland', coniferous_woodland: 'Coniferous woodland', semi_desert: 'Semi-desert'
};

function getBiomeLabel(biomeId: BiomeId, language: Language): string {
  return language === 'en' ? BIOME_LABELS_EN[biomeId] : BIOMES[biomeId].label;
}

function getBiomeTileHref(biomeId?: BiomeId): string | undefined {
  return biomeId ? BIOME_TILE_HREFS[biomeId] : undefined;
}

function translateCoastNotice(message: string, language: Language): string {
  return message;
}

const BIOMES: Record<BiomeId, Biome> = {
  plain_deciduous_forest: { id: 'plain_deciduous_forest', label: 'Равнинный лиственный лес', color: '#7AAD43', primaryEmoji: '🌳', secondaryEmojis: [], wildWeight: 20, settledWeight: 11, heightLevel: 1 },
  plain_mixed_forest: { id: 'plain_mixed_forest', label: 'Равнинный смешанный лес', color: '#4F8A3B', primaryEmoji: '🌳', secondaryEmojis: ['🌲'], wildWeight: 12, settledWeight: 5, heightLevel: 1 },
  plain_coniferous_forest: { id: 'plain_coniferous_forest', label: 'Равнинный хвойный лес', color: '#2F7621', primaryEmoji: '🌲', secondaryEmojis: [], wildWeight: 6, settledWeight: 1, heightLevel: 1 },
  deciduous_forested_hills: { id: 'deciduous_forested_hills', label: 'Лиственные лесистые холмы', color: '#8EBD52', primaryEmoji: '〰️', secondaryEmojis: ['🌳'], wildWeight: 7, settledWeight: 10, heightLevel: 2 },
  mixed_forested_hills: { id: 'mixed_forested_hills', label: 'Смешанные лесистые холмы', color: '#74A33A', primaryEmoji: '〰️', secondaryEmojis: ['🌳', '🌲'], wildWeight: 5, settledWeight: 2, heightLevel: 2 },
  coniferous_forested_hills: { id: 'coniferous_forested_hills', label: 'Хвойные лесистые холмы', color: '#488A21', primaryEmoji: '〰️', secondaryEmojis: ['🌲'], wildWeight: 4, settledWeight: 1, heightLevel: 2 },
  open_hills: { id: 'open_hills', label: 'Открытые холмы', color: '#C3D263', primaryEmoji: '〰️', secondaryEmojis: [], wildWeight: 6, settledWeight: 9, heightLevel: 2 },
  coniferous_mountain_forest: { id: 'coniferous_mountain_forest', label: 'Хвойный горный лес', color: '#667621', primaryEmoji: '⛰', secondaryEmojis: ['🌲'], wildWeight: 4, settledWeight: 0, heightLevel: 3 },
  mixed_mountain_forest: { id: 'mixed_mountain_forest', label: 'Смешанный горный лес', color: '#74852B', primaryEmoji: '⛰', secondaryEmojis: ['🌳', '🌲'], wildWeight: 3, settledWeight: 0, heightLevel: 3 },
  deciduous_mountain_forest: { id: 'deciduous_mountain_forest', label: 'Лиственный горный лес', color: '#879233', primaryEmoji: '⛰', secondaryEmojis: ['🌳'], wildWeight: 1, settledWeight: 0, heightLevel: 3 },
  mountains: { id: 'mountains', label: 'Горы', color: '#B28000', primaryEmoji: '⛰', secondaryEmojis: [], wildWeight: 2, settledWeight: 0, heightLevel: 3 },
  open_plains: { id: 'open_plains', label: 'Открытые равнины', color: '#C8EE8C', primaryEmoji: '🌱', secondaryEmojis: [], wildWeight: 14, settledWeight: 32, heightLevel: 1 },
  swamp_forest: { id: 'swamp_forest', label: 'Заболоченный лес', color: '#ADDEA5', primaryEmoji: '💧', secondaryEmojis: ['🌳'], wildWeight: 3, settledWeight: 0, heightLevel: 1 },
  swamp: { id: 'swamp', label: 'Болото', color: '#84CE94', primaryEmoji: '💧', secondaryEmojis: ['🌱'], wildWeight: 4, settledWeight: 0, heightLevel: 1 },
  hilly_woodland: { id: 'hilly_woodland', label: 'Холмистое редколесье', color: '#D7F796', primaryEmoji: '〰️', secondaryEmojis: ['🌱', '🌳'], wildWeight: 2, settledWeight: 2, heightLevel: 2 },
  mountain_woodland: { id: 'mountain_woodland', label: 'Горное редколесье', color: '#577621', primaryEmoji: '⛰', secondaryEmojis: ['🌱', '🌲'], wildWeight: 1, settledWeight: 0, heightLevel: 3 },
  deciduous_woodland: { id: 'deciduous_woodland', label: 'Лиственное редколесье', color: '#879253', primaryEmoji: '🌱', secondaryEmojis: ['🌳'], wildWeight: 3, settledWeight: 19, heightLevel: 1 },
  mixed_woodland: { id: 'mixed_woodland', label: 'Смешанное редколесье', color: '#4F9E45', primaryEmoji: '🌱', secondaryEmojis: ['🌳', '🌲'], wildWeight: 1, settledWeight: 7, heightLevel: 1 },
  coniferous_woodland: { id: 'coniferous_woodland', label: 'Хвойное редколесье', color: '#488A40', primaryEmoji: '🌱', secondaryEmojis: ['🌲'], wildWeight: 1, settledWeight: 1, heightLevel: 1 },
  semi_desert: { id: 'semi_desert', label: 'Полупустыня', color: '#E7F79C', primaryEmoji: '🪨', secondaryEmojis: ['🌱'], wildWeight: 1, settledWeight: 0, heightLevel: 1 }
};
const FALLBACK_BIOME_ID: BiomeId = 'plain_deciduous_forest';
const FALLBACK_SETTLED_BIOME_ID: BiomeId = 'open_plains';
const FALLBACK_WILD_BIOME_ID: BiomeId = 'plain_deciduous_forest';
const START_HEX: AxialHex = { q: 0, r: 0 };
const START_PROMPT_HEX_SCALE = 1.45;
const START_PROMPT_HEX_PADDING = HEX_SIZE * (START_PROMPT_HEX_SCALE - 1);
const CLICK_PROMPT_INTERVAL_MS = 5000;
const CLICK_PROMPT_LABEL = 'Click Me!';
const NEIGHBOR_DIRECTIONS: AxialHex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];
const HEX_EDGE_DIRECTIONS: AxialHex[] = [
  { q: 1, r: 0 },
  { q: 0, r: 1 },
  { q: -1, r: 1 },
  { q: -1, r: 0 },
  { q: 0, r: -1 },
  { q: 1, r: -1 }
];

function hexKey(hex: AxialHex): string {
  return `${hex.q},${hex.r}`;
}

function parseHexKey(key: string): AxialHex {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

function normalizeEdgeKey(hexA: AxialHex, hexB: AxialHex): string {
  const a = hexKey(hexA);
  const b = hexKey(hexB);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
function areHexesAdjacent(a: AxialHex, b: AxialHex): boolean {
  return getHexNeighbors(a).some((n) => n.q === b.q && n.r === b.r);
}
function normalizeRoadSegmentKey(a: AxialHex, b: AxialHex): string {
  const keyA = hexKey(a);
  const keyB = hexKey(b);
  return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`;
}
function getRoadSegmentKeys(roads: Road[]): Set<string> {
  const keys = new Set<string>();
  for (const road of roads) for (const s of road.segments) keys.add(normalizeRoadSegmentKey(s.from, s.to));
  return keys;
}
function getRoadHexKeys(roads: Road[]): Set<string> {
  const keys = new Set<string>();
  for (const road of roads) for (const s of road.segments) { keys.add(hexKey(s.from)); keys.add(hexKey(s.to)); }
  return keys;
}
function cloneRoads(roads: Road[]): Road[] {
  return roads.map((road) => ({
    ...road,
    segments: road.segments.map((segment) => ({
      from: { ...segment.from },
      to: { ...segment.to },
      kind: segment.kind
    }))
  }));
}
function pruneRoadsToRegionHexes(roads: Road[], regions: Region[]): Road[] {
  const regionHexKeys = new Set(regions.flatMap((region) => region.hexes.map(hexKey)));
  return roads
    .map((road) => ({
      ...road,
      segments: road.segments.filter((segment) => regionHexKeys.has(hexKey(segment.from)) && regionHexKeys.has(hexKey(segment.to)))
    }))
    .filter((road) => road.segments.length > 0);
}
function getRoadEndpoints(road: Road, segmentKind?: RoadKind): AxialHex[] {
  const deg = new Map<string, { hex: AxialHex; d: number }>();
  for (const s of road.segments) {
    if (segmentKind && s.kind !== segmentKind) continue;
    for (const h of [s.from, s.to]) {
      const k = hexKey(h);
      const prev = deg.get(k) ?? { hex: h, d: 0 };
      prev.d += 1;
      deg.set(k, prev);
    }
  }
  return Array.from(deg.values()).filter((x) => x.d === 1).map((x) => x.hex);
}
function countRoadSegmentsTouchingHex(hex: AxialHex, roads: Road[]): number {
  const k = hexKey(hex);
  let count = 0;
  for (const road of roads) for (const s of road.segments) if (hexKey(s.from) === k || hexKey(s.to) === k) count += 1;
  return count;
}
function isLakeHex(hex: AxialHex, hexTerrainByKey: Map<string, HexTerrainData>): boolean {
  return hexTerrainByKey.get(hexKey(hex))?.terrainOverride === 'lake';
}
function isSeaHex(hex: AxialHex, hexTerrainByKey: Map<string, HexTerrainData>): boolean {
  return hexTerrainByKey.get(hexKey(hex))?.terrainOverride === 'sea';
}
// Все ключи гексов-моря из карты terrain-данных.
function getSeaHexKeys(hexTerrainByKey: Map<string, HexTerrainData>): Set<string> {
  const keys = new Set<string>();
  for (const [key, terrain] of hexTerrainByKey) {
    if (terrain.terrainOverride === 'sea') keys.add(key);
  }
  return keys;
}
// Морские гексы без единого морского соседа — одиночные артефакты. Реки об них спотыкаются
// (non_mouth_vertex_sea), хотя по сути такого моря быть не должно. Для проверок реки-vs-море
// их игнорируем, а на коммите лечим (удаляем). Так старые артефакты не блокируют генерацию.
function getSolitarySeaHexKeys(seaKeys: Set<string>): Set<string> {
  const solitary = new Set<string>();
  for (const key of seaKeys) {
    if (!getHexNeighbors(parseHexKey(key)).some((neighbor) => seaKeys.has(hexKey(neighbor)))) solitary.add(key);
  }
  return solitary;
}
function getNonSolitarySeaHexKeys(hexTerrainByKey: Map<string, HexTerrainData>): Set<string> {
  const seaKeys = getSeaHexKeys(hexTerrainByKey);
  const solitary = getSolitarySeaHexKeys(seaKeys);
  if (solitary.size === 0) return seaKeys;
  const result = new Set<string>();
  for (const key of seaKeys) if (!solitary.has(key)) result.add(key);
  return result;
}

function getSeaAdjacentHexKeys(seaKeys: Set<string>): Set<string> {
  const result = new Set<string>();
  for (const seaKey of seaKeys) {
    for (const neighbor of getHexNeighbors(parseHexKey(seaKey))) result.add(hexKey(neighbor));
  }
  return result;
}

function getBoundaryHexes(region: Region): AxialHex[] {
  const regionKeys = new Set(region.hexes.map(hexKey));
  return region.hexes.filter((h) => getHexNeighbors(h).some((n) => !regionKeys.has(hexKey(n))));
}

function toPixel(q: number, r: number) {
  return {
    x: HEX_SIZE * SQRT3 * (q + r / 2),
    y: HEX_SIZE * 1.5 * r
  };
}

// Расстояние В ТАЙЛАХ (число гексов) от центра карты по гексовой метрике.
function hexDistanceFromCenter(hex: AxialHex): number {
  return (Math.abs(hex.q) + Math.abs(hex.q + hex.r) + Math.abs(hex.r)) / 2;
}

function hexPoints(cx: number, cy: number, size: number) {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return points.join(' ');
}


function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAxialHex(value: unknown): value is AxialHex {
  return isRecord(value) && typeof value.q === 'number' && Number.isFinite(value.q) && typeof value.r === 'number' && Number.isFinite(value.r);
}

function isCentralPoiKind(value: unknown): value is CentralPoiKind {
  return typeof value === 'string' && value in CENTRAL_POI_DETAILS;
}

function isPoiKind(value: unknown): value is PoiKind {
  return typeof value === 'string' && value in POI_DETAILS;
}

function isHexTerrainData(value: unknown): value is HexTerrainData {
  if (!isRecord(value)) return false;
  const terrainOverride = value.terrainOverride;
  const lakeId = value.lakeId;
  return (
    (terrainOverride === undefined || terrainOverride === 'lake' || terrainOverride === 'sea') &&
    (lakeId === undefined || (typeof lakeId === 'number' && Number.isFinite(lakeId)))
  );
}

function assertHexcrawlSaveData(value: unknown): asserts value is ValidatedHexcrawlSaveData {
  if (!isRecord(value)) throw new Error('Файл сохранения должен быть JSON-объектом.');
  if (value.schema !== HEXCRAWL_SAVE_SCHEMA) throw new Error('Это не файл сохранения Hexcrawl.');
  if (value.version !== HEXCRAWL_SAVE_VERSION) throw new Error(`Неподдерживаемая версия сохранения: ${String(value.version)}.`);
  if (!isRecord(value.map)) throw new Error('В сохранении отсутствует объект map.');
  if (!Array.isArray(value.map.regions)) throw new Error('В сохранении отсутствует список regions.');
  if (!Array.isArray(value.map.rivers)) throw new Error('В сохранении отсутствует список rivers.');
  if (!Array.isArray(value.map.roads)) throw new Error('В сохранении отсутствует список roads.');
  if (!isRecord(value.map.terrainByHexKey)) throw new Error('В сохранении отсутствует объект terrainByHexKey.');
  for (const [key, terrain] of Object.entries(value.map.terrainByHexKey)) {
    if (!isAxialHex(parseHexKey(key))) throw new Error(`Некорректный ключ terrain-гекса ${key}.`);
    if (!isHexTerrainData(terrain)) throw new Error(`Некорректные terrain-данные для гекса ${key}.`);
  }
  for (const region of value.map.regions) {
    if (!isRecord(region)) throw new Error('Некорректная запись региона.');
    if (typeof region.id !== 'number' || !Number.isFinite(region.id)) throw new Error('У региона отсутствует числовой id.');
    if (!Array.isArray(region.hexes) || !region.hexes.every(isAxialHex)) throw new Error(`Некорректные гексы региона ${region.id}.`);
    if (!isAxialHex(region.centerHex)) throw new Error(`Некорректный centerHex региона ${region.id}.`);
    if (!isAxialHex(region.anchorHex)) throw new Error(`Некорректный anchorHex региона ${region.id}.`);
    if (!Array.isArray(region.pointsOfInterest) || !region.pointsOfInterest.every(isAxialHex)) throw new Error(`Некорректные точки интереса региона ${region.id}.`);
    if (region.centralPoiKind !== undefined && !isCentralPoiKind(region.centralPoiKind)) throw new Error(`Некорректная центральная точка интереса региона ${region.id}.`);
    if (region.pointOfInterestKinds !== undefined) {
      if (!isRecord(region.pointOfInterestKinds)) throw new Error(`Некорректные типы точек интереса региона ${region.id}.`);
      for (const [poiKey, poiKind] of Object.entries(region.pointOfInterestKinds)) {
        if (!isAxialHex(parseHexKey(poiKey)) || !isPoiKind(poiKind)) throw new Error(`Некорректный тип точки интереса региона ${region.id}.`);
      }
    }
  }
  if (value.map.candidateHexes !== undefined && !Array.isArray(value.map.candidateHexes)) throw new Error('Некорректный список candidateHexes.');
  if (!isRecord(value.counters)) throw new Error('В сохранении отсутствует объект counters.');
  if (typeof value.counters.nextLakeId !== 'number' || !Number.isFinite(value.counters.nextLakeId)) throw new Error('Некорректный счетчик nextLakeId.');
  if (typeof value.counters.nextRoadId !== 'number' || !Number.isFinite(value.counters.nextRoadId)) throw new Error('Некорректный счетчик nextRoadId.');
  if (!isRecord(value.ui)) throw new Error('В сохранении отсутствует объект ui.');
  if (value.ui.selectedHex !== null && value.ui.selectedHex !== undefined && !isAxialHex(value.ui.selectedHex)) throw new Error('Некорректный selectedHex.');
}

function downloadBlob(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getTimestampForFilename(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function createExportSvgClone(svg: SVGSVGElement): Promise<SVGSVGElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const viewBox = clone.viewBox.baseVal;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(viewBox.width));
  clone.setAttribute('height', String(viewBox.height));
  clone.style.width = '';
  clone.style.height = '';

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = SVG_EXPORT_STYLES;
  clone.insertBefore(style, clone.firstChild);

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', String(viewBox.width));
  background.setAttribute('height', String(viewBox.height));
  background.setAttribute('fill', '#0c1423');
  clone.insertBefore(background, style.nextSibling);

  await inlineExportImageHrefs(clone);

  return clone;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось встроить изображение тайла в PNG-экспорт.'));
    reader.readAsDataURL(blob);
  });
}

async function inlineExportImageHrefs(svg: SVGSVGElement): Promise<void> {
  const cache = new Map<string, string>();
  const images = Array.from(svg.querySelectorAll('image'));

  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute('href') ?? image.getAttribute('xlink:href');
    if (!href || href.startsWith('data:')) return;

    const absoluteHref = new URL(href, window.location.href).toString();
    let dataUrl = cache.get(absoluteHref);
    if (!dataUrl) {
      const response = await fetch(absoluteHref);
      if (!response.ok) throw new Error(`Не удалось загрузить тайл для PNG-экспорта: ${href}`);
      dataUrl = await blobToDataUrl(await response.blob());
      cache.set(absoluteHref, dataUrl);
    }

    image.setAttribute('href', dataUrl);
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
  }));
}

async function exportSvgToPng(svg: SVGSVGElement, filename: string, scale = PNG_EXPORT_SCALE): Promise<void> {
  const clone = await createExportSvgClone(svg);
  const viewBox = clone.viewBox.baseVal;
  const svgText = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Не удалось подготовить SVG для PNG-экспорта.'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewBox.width * scale));
    canvas.height = Math.max(1, Math.ceil(viewBox.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D недоступен в этом браузере.');
    context.fillStyle = '#0c1423';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Не удалось создать PNG-файл.'))), 'image/png');
    });
    downloadBlob(pngBlob, filename);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл.'));
    reader.readAsText(file);
  });
}

function randomInt(min: number, max: number): number {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function shuffleArray<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function getHexWidth(hexSize: number): number {
  return SQRT3 * hexSize;
}

function getNewRiverFullnessForHeight(heightLevel: RegionHeightLevel): RiverFullness {
  if (heightLevel === 1) return 3;
  if (heightLevel === 2) return 2;
  return 1;
}

function getTributaryRiverFullnessForHeight(heightLevel: RegionHeightLevel): RiverFullness {
  if (heightLevel === 1) return 2;
  if (heightLevel === 2) return 1;
  return 1;
}

function getRiverWidth(hexWidth: number, fullness: RiverFullness): number {
  return hexWidth * (0.04 + fullness * 0.035);
}

function getRiverArrowScale(fullness: RiverFullness): number {
  return 0.4 + fullness * 0.2;
}

function getRegionHeightLevelFromBiomeId(biomeId: BiomeId): RegionHeightLevel {
  return BIOMES[biomeId]?.heightLevel ?? 1;
}

function getRegionHeightLabel(heightLevel: RegionHeightLevel, language: Language = 'ru'): string {
  if (language === 'en') {
    if (heightLevel === 3) return '3 — mountains';
    if (heightLevel === 2) return '2 — hills';
    return '1 — plains';
  }
  if (heightLevel === 3) return '3 — горы';
  if (heightLevel === 2) return '2 — холмы';
  return '1 — равнина';
}

function getHexEmojiLayout(
  emojis: string[],
  centerX: number,
  centerY: number,
  hexRadius: number
): Array<{ emoji: string; x: number; y: number; fontSize: number }> {
  const visibleEmojis = emojis.slice(0, 4);

  if (visibleEmojis.length === 0) return [];

  if (visibleEmojis.length === 1) {
    return [{ emoji: visibleEmojis[0], x: centerX, y: centerY, fontSize: clamp(hexRadius * 0.55, 16, 28) }];
  }

  if (visibleEmojis.length === 2) {
    const fontSize = clamp(hexRadius * 0.42, 14, 22);
    return [
      { emoji: visibleEmojis[0], x: centerX - hexRadius * 0.18, y: centerY, fontSize },
      { emoji: visibleEmojis[1], x: centerX + hexRadius * 0.18, y: centerY, fontSize }
    ];
  }

  if (visibleEmojis.length === 3) {
    const fontSize = clamp(hexRadius * 0.34, 12, 18);
    return [
      { emoji: visibleEmojis[0], x: centerX, y: centerY - hexRadius * 0.18, fontSize },
      { emoji: visibleEmojis[1], x: centerX - hexRadius * 0.22, y: centerY + hexRadius * 0.16, fontSize },
      { emoji: visibleEmojis[2], x: centerX + hexRadius * 0.22, y: centerY + hexRadius * 0.16, fontSize }
    ];
  }

  const fontSize = clamp(hexRadius * 0.30, 11, 16);
  return [
    { emoji: visibleEmojis[0], x: centerX - hexRadius * 0.18, y: centerY - hexRadius * 0.16, fontSize },
    { emoji: visibleEmojis[1], x: centerX + hexRadius * 0.18, y: centerY - hexRadius * 0.16, fontSize },
    { emoji: visibleEmojis[2], x: centerX - hexRadius * 0.18, y: centerY + hexRadius * 0.17, fontSize },
    { emoji: visibleEmojis[3], x: centerX + hexRadius * 0.18, y: centerY + hexRadius * 0.17, fontSize }
  ];
}

function rotateMapPoint(x: number, y: number, sourceHeight: number): { x: number; y: number } {
  return { x: sourceHeight - y, y: x };
}

function round3(value: number): number {
  return Number(value.toFixed(3));
}

function vertexKey(x: number, y: number): string {
  return `${round3(x)},${round3(y)}`;
}

function randomFrom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}


function assignCentralPoiKindForRegion(biomeLandType: BiomeLandType, sizeCategory: Region['sizeCategory']): CentralPoiKind {
  if (biomeLandType === 'wild') return randomFrom(WILD_CENTRAL_POI_KINDS);
  if (sizeCategory === 'vast_land') return 'capital';
  if (sizeCategory === 'land' || sizeCategory === 'large_region') return 'city';
  if (sizeCategory === 'region' || sizeCategory === 'small_region') return 'town';
  return 'village';
}

function getCentralPoiEmoji(region: Region): string {
  return region.centralPoiKind ? CENTRAL_POI_DETAILS[region.centralPoiKind]?.emoji ?? REGION_CENTER_EMOJI : REGION_CENTER_EMOJI;
}

function getCentralPoiLabel(region: Region, language: Language): string {
  return region.centralPoiKind ? CENTRAL_POI_DETAILS[region.centralPoiKind]?.label[language] ?? TRANSLATIONS[language].centralPoi : TRANSLATIONS[language].centralPoi;
}

type CoastalPreference = 'coast' | 'mainland';

// Параметры ручного управления генерацией региона. Любое поле, оставленное
// пустым (undefined), означает "как раньше" — то есть случайный выбор.
type GenerationOptions = {
  targetSize?: number;
  landType?: BiomeLandType;
  biomeId?: BiomeId;
  coastalPreference?: CoastalPreference;
};

const REGION_SIZE_CATEGORY_RANGES: Record<Region['sizeCategory'], [number, number]> = {
  locality: [5, 10],
  small_region: [11, 20],
  region: [21, 30],
  large_region: [31, 40],
  land: [41, 50],
  vast_land: [51, 60]
};

function rollRegionSizeInCategory(category: Region['sizeCategory']): number {
  const [min, max] = REGION_SIZE_CATEGORY_RANGES[category];
  return randomInt(min, max);
}

// Полный снимок состояния карты до добавления очередного региона.
// Используется для удаления/перегенерации последнего региона: вместо того
// чтобы пытаться "откатить" все побочные эффекты генерации рек и дорог
// (которые могут менять соседние регионы), мы просто восстанавливаем снимок.
type MapSnapshot = {
  regions: Region[];
  candidateHexes: AxialHex[];
  rivers: River[];
  roads: Road[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextLakeId: number;
  nextRoadId: number;
};

function chooseBiomeLandType(regionCount: number): BiomeLandType {
  if (regionCount === 0) return 'settled';
  return Math.floor(Math.random() * 100) + 1 <= 20 ? 'settled' : 'wild';
}

type BiomeCompatibilityMatrix = Partial<Record<BiomeId, Partial<Record<BiomeId, boolean>>>>;

const BIOME_COMPATIBILITY_MATRIX: BiomeCompatibilityMatrix = {
  plain_deciduous_forest: { plain_deciduous_forest: true, plain_mixed_forest: true, deciduous_forested_hills: true, swamp_forest: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true },
  plain_mixed_forest: { plain_deciduous_forest: true, plain_mixed_forest: true, plain_coniferous_forest: true, deciduous_forested_hills: true, mixed_forested_hills: true, coniferous_forested_hills: true, swamp_forest: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true, coniferous_woodland: true },
  plain_coniferous_forest: { plain_mixed_forest: true, plain_coniferous_forest: true, mixed_forested_hills: true, coniferous_forested_hills: true, mixed_woodland: true, coniferous_woodland: true },
  deciduous_forested_hills: { plain_deciduous_forest: true, plain_mixed_forest: true, deciduous_forested_hills: true, mixed_forested_hills: true, mixed_mountain_forest: true, deciduous_mountain_forest: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true },
  mixed_forested_hills: { plain_deciduous_forest: true, plain_mixed_forest: true, plain_coniferous_forest: true, deciduous_forested_hills: true, mixed_forested_hills: true, coniferous_forested_hills: true, coniferous_mountain_forest: true, mixed_mountain_forest: true, deciduous_mountain_forest: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true, coniferous_woodland: true },
  coniferous_forested_hills: { plain_mixed_forest: true, plain_coniferous_forest: true, mixed_forested_hills: true, coniferous_forested_hills: true, coniferous_mountain_forest: true, mixed_mountain_forest: true, mountain_woodland: true, mixed_woodland: true, coniferous_woodland: true },
  open_hills: { open_hills: true, mountains: true, open_plains: true, hilly_woodland: true, mountain_woodland: true, deciduous_woodland: true, mixed_woodland: true, coniferous_woodland: true, semi_desert: true },
  coniferous_mountain_forest: { mixed_forested_hills: true, coniferous_forested_hills: true, coniferous_mountain_forest: true, mixed_mountain_forest: true, mountain_woodland: true },
  mixed_mountain_forest: { deciduous_forested_hills: true, mixed_forested_hills: true, coniferous_forested_hills: true, coniferous_mountain_forest: true, mixed_mountain_forest: true, deciduous_mountain_forest: true, hilly_woodland: true, mountain_woodland: true },
  deciduous_mountain_forest: { deciduous_forested_hills: true, mixed_forested_hills: true, mixed_mountain_forest: true, deciduous_mountain_forest: true, hilly_woodland: true, mountain_woodland: true },
  mountains: { open_hills: true, mountains: true, hilly_woodland: true, mountain_woodland: true },
  open_plains: { open_hills: true, open_plains: true, swamp: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true, coniferous_woodland: true, semi_desert: true },
  swamp_forest: { plain_deciduous_forest: true, plain_mixed_forest: true, swamp_forest: true, swamp: true, deciduous_woodland: true, mixed_woodland: true },
  swamp: { open_plains: true, swamp_forest: true, swamp: true, deciduous_woodland: true, mixed_woodland: true, coniferous_woodland: true },
  hilly_woodland: { plain_deciduous_forest: true, plain_mixed_forest: true, deciduous_forested_hills: true, mixed_forested_hills: true, open_hills: true, mixed_mountain_forest: true, deciduous_mountain_forest: true, mountains: true, open_plains: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true, semi_desert: true },
  mountain_woodland: { coniferous_forested_hills: true, open_hills: true, coniferous_mountain_forest: true, mixed_mountain_forest: true, deciduous_mountain_forest: true, mountains: true, mountain_woodland: true },
  deciduous_woodland: { plain_deciduous_forest: true, plain_mixed_forest: true, deciduous_forested_hills: true, mixed_forested_hills: true, open_hills: true, open_plains: true, swamp_forest: true, swamp: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true, semi_desert: true },
  mixed_woodland: { plain_deciduous_forest: true, plain_mixed_forest: true, plain_coniferous_forest: true, deciduous_forested_hills: true, mixed_forested_hills: true, coniferous_forested_hills: true, open_hills: true, open_plains: true, swamp_forest: true, swamp: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true, coniferous_woodland: true, semi_desert: true },
  coniferous_woodland: { plain_mixed_forest: true, plain_coniferous_forest: true, mixed_forested_hills: true, coniferous_forested_hills: true, open_hills: true, open_plains: true, swamp: true, mixed_woodland: true, coniferous_woodland: true, semi_desert: true },
  semi_desert: { open_hills: true, open_plains: true, hilly_woodland: true, deciduous_woodland: true, mixed_woodland: true, coniferous_woodland: true, semi_desert: true }
};

function isBiomesCompatible(biomeA: BiomeId, biomeB: BiomeId, compatibilityMatrix: BiomeCompatibilityMatrix): boolean {
  const direct = compatibilityMatrix[biomeA]?.[biomeB];
  if (typeof direct === 'boolean') return direct;
  const reverse = compatibilityMatrix[biomeB]?.[biomeA];
  if (typeof reverse === 'boolean') return reverse;
  return false;
}


function chooseWeightedRandom(weights: Record<BiomeId, number>): BiomeId {
  const total = Object.values(weights).reduce((acc, value) => acc + value, 0);
  if (total <= 0) return FALLBACK_BIOME_ID;
  let roll = Math.random() * total;
  for (const biomeId of Object.keys(weights) as BiomeId[]) {
    roll -= weights[biomeId];
    if (roll <= 0) return biomeId;
  }
  const biomeIds = Object.keys(weights) as BiomeId[];
  return biomeIds[biomeIds.length - 1] ?? FALLBACK_BIOME_ID;
}

function isBiomeAllowedByRiverHeightConstraint(
  biomeId: BiomeId,
  constraint: RiverHeightConstraint
): boolean {
  const height = BIOMES[biomeId]?.heightLevel ?? 1;

  if (constraint.minHeight !== undefined && height < constraint.minHeight) return false;
  if (constraint.maxHeight !== undefined && height > constraint.maxHeight) return false;

  return true;
}

function chooseBiomeId(
  landType: BiomeLandType,
  adjacentBiomeIds: BiomeId[],
  regionId?: number,
  riverHeightConstraint?: RiverHeightConstraint
): ChooseBiomeResult {
  const baseWeights = {} as Record<BiomeId, number>;
  for (const biome of Object.values(BIOMES)) {
    baseWeights[biome.id] = landType === 'settled' ? biome.settledWeight : biome.wildWeight;
  }

  const uniqueAdjacentBiomeIds = new Set(adjacentBiomeIds);
  const strictWeights = { ...baseWeights };

  for (const candidateBiomeId of Object.keys(strictWeights) as BiomeId[]) {
    if (
      riverHeightConstraint &&
      !isBiomeAllowedByRiverHeightConstraint(candidateBiomeId, riverHeightConstraint)
    ) {
      strictWeights[candidateBiomeId] = 0;
      continue;
    }

    if (uniqueAdjacentBiomeIds.has(candidateBiomeId)) {
      strictWeights[candidateBiomeId] = 0;
      continue;
    }

    const isIncompatibleWithAdjacent = adjacentBiomeIds.some(
      (adjacentBiomeId) => !isBiomesCompatible(candidateBiomeId, adjacentBiomeId, BIOME_COMPATIBILITY_MATRIX)
    );

    if (isIncompatibleWithAdjacent) strictWeights[candidateBiomeId] = 0;
  }

  const strictWeightSum = Object.values(strictWeights).reduce((acc, value) => acc + value, 0);
  if (strictWeightSum > 0) return { biomeId: chooseWeightedRandom(strictWeights) };

  if (adjacentBiomeIds.length > 0) {
    const relaxedWeights = { ...baseWeights };
    for (const adjacentBiomeId of uniqueAdjacentBiomeIds) relaxedWeights[adjacentBiomeId] = 0;
    for (const candidateBiomeId of Object.keys(relaxedWeights) as BiomeId[]) {
      if (
        riverHeightConstraint &&
        !isBiomeAllowedByRiverHeightConstraint(candidateBiomeId, riverHeightConstraint)
      ) {
        relaxedWeights[candidateBiomeId] = 0;
      }
    }
    const relaxedWeightSum = Object.values(relaxedWeights).reduce((acc, value) => acc + value, 0);

    console.log('Biome strict filter had no available weights; restored incompatible biome weights', {
      regionId,
      biomeLandType: landType,
      adjacentBiomeIds
    });

    if (relaxedWeightSum > 0) return { biomeId: chooseWeightedRandom(relaxedWeights) };
  }

  const fallbackBiomeId = landType === 'settled'
    ? FALLBACK_SETTLED_BIOME_ID
    : FALLBACK_WILD_BIOME_ID;

  if (
    riverHeightConstraint &&
    !isBiomeAllowedByRiverHeightConstraint(fallbackBiomeId, riverHeightConstraint)
  ) {
    return { biomeId: null, reason: 'river_height_constraint_failed' };
  }

  return { biomeId: fallbackBiomeId };
}

function getAdjacentRegionBiomes(regionHexes: AxialHex[], regionByHexKey: Map<string, Region>): BiomeId[] {
  const biomeIds = new Set<BiomeId>();

  for (const hex of regionHexes) {
    for (const neighbor of getHexNeighbors(hex)) {
      const neighborRegion = regionByHexKey.get(hexKey(neighbor));

      if (neighborRegion?.biomeId) {
        biomeIds.add(neighborRegion.biomeId);
      }
    }
  }

  return Array.from(biomeIds);
}

function getHexCornerPoints(hex: AxialHex): RiverVertex[] {
  const { x, y } = toPixel(hex.q, hex.r);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const vx = x + HEX_SIZE * Math.cos(angle);
    const vy = y + HEX_SIZE * Math.sin(angle);
    return { x: vx, y: vy, key: vertexKey(vx, vy) };
  });
}

function getHexEdgesAsVertexPairs(hex: AxialHex): HexEdge[] {
  const corners = getHexCornerPoints(hex);
  return HEX_EDGE_DIRECTIONS.map((direction, i) => ({
    from: corners[i],
    to: corners[(i + 1) % 6],
    neighborHex: { q: hex.q + direction.q, r: hex.r + direction.r },
    edgeKey: [corners[i].key, corners[(i + 1) % 6].key].sort().join('|')
  }));
}

function getRiverVertexDistance(a: RiverVertex, b: RiverVertex): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getHexEdgeKeys(hex: AxialHex): Set<string> {
  return new Set(getHexEdgesAsVertexPairs(hex).map((edge) => edge.edgeKey));
}

function riverPathTouchesCenterHex(
  path: RiverVertex[],
  centerHex: AxialHex | undefined,
  riverGraph: RiverGraph
): boolean {
  if (!centerHex) return false;

  const centerHexEdgeKeys = getHexEdgeKeys(centerHex);
  const pathEdgeKeys = getRiverPathEdgeKeys(path, riverGraph);

  if (!pathEdgeKeys) return false;

  return pathEdgeKeys.some((pathEdgeKey) => centerHexEdgeKeys.has(pathEdgeKey));
}

function riverPathTouchesCenterHexVertex(
  path: RiverVertex[],
  centerHex: AxialHex | undefined
): boolean {
  if (!centerHex || path.length === 0) return false;
  const centerVertexKeys = new Set(getHexCornerPoints(centerHex).map((vertex) => vertex.key));
  return path.some((vertex) => centerVertexKeys.has(vertex.key));
}



function getAdjacentHexesForVertex(vertex: RiverVertex, sourceHex: AxialHex): AxialHex[] {
  const corners = getHexCornerPoints(sourceHex);
  const cornerIndex = corners.findIndex((corner) => corner.key === vertex.key);
  if (cornerIndex === -1) return [sourceHex];
  const leftDirection = (cornerIndex + 5) % 6;
  const rightDirection = cornerIndex;
  const adjacent = new Map<string, AxialHex>();
  adjacent.set(hexKey(sourceHex), sourceHex);
  const leftHex = getHexEdgeNeighbor(sourceHex, leftDirection);
  const rightHex = getHexEdgeNeighbor(sourceHex, rightDirection);
  if (leftHex) adjacent.set(hexKey(leftHex), leftHex);
  if (rightHex) adjacent.set(hexKey(rightHex), rightHex);
  return Array.from(adjacent.values());
}

function isRegionExteriorVertex(vertex: RiverVertex, regionHexes: AxialHex[]): boolean {
  if (regionHexes.length === 0) return false;
  const regionSet = new Set(regionHexes.map(hexKey));
  const sourceHexes = regionHexes.filter((hex) => getHexCornerPoints(hex).some((corner) => corner.key === vertex.key));
  if (sourceHexes.length === 0) return false;
  const adjacentHexes = new Map<string, AxialHex>();
  for (const sourceHex of sourceHexes) {
    for (const adjacentHex of getAdjacentHexesForVertex(vertex, sourceHex)) {
      adjacentHexes.set(hexKey(adjacentHex), adjacentHex);
    }
  }
  return Array.from(adjacentHexes.keys()).some((key) => !regionSet.has(key));
}

function getRegionExteriorVertices(regionHexes: AxialHex[]): RiverVertex[] {
  const unique = new Map<string, RiverVertex>();
  for (const hex of regionHexes) {
    for (const vertex of getHexCornerPoints(hex)) {
      if (isRegionExteriorVertex(vertex, regionHexes)) {
        unique.set(vertex.key, vertex);
      }
    }
  }
  return Array.from(unique.values());
}

function getRegionSharedVertices(
  region: Region,
  regions: Region[] = [],
  candidateHexes: AxialHex[] = []
): { candidateVertices: RiverVertex[]; neighborRegionVertices: RiverVertex[] } {
  if (!region?.hexes?.length) return { candidateVertices: [], neighborRegionVertices: [] };
  const currentRegionHexKeys = new Set(region.hexes.map(hexKey));
  const vertexUsageByKey = new Map<string, VertexUsage>();

  const addHexUsage = (hex: AxialHex, kind: 'current' | 'other' | 'candidate') => {
    for (const vertex of getHexCornerPoints(hex)) {
      const usage = vertexUsageByKey.get(vertex.key) ?? {
        vertex,
        currentRegionCount: 0,
        otherRegionCount: 0,
        candidateCount: 0
      };
      if (kind === 'current') usage.currentRegionCount += 1;
      if (kind === 'other') usage.otherRegionCount += 1;
      if (kind === 'candidate') usage.candidateCount += 1;
      vertexUsageByKey.set(vertex.key, usage);
    }
  };

  for (const hex of region.hexes) addHexUsage(hex, 'current');
  for (const otherRegion of regions) {
    if (otherRegion.id === region.id) continue;
    for (const hex of otherRegion.hexes) addHexUsage(hex, 'other');
  }
  for (const candidateHex of candidateHexes) {
    if (currentRegionHexKeys.has(hexKey(candidateHex))) continue;
    addHexUsage(candidateHex, 'candidate');
  }

  const uniqueCandidate = new Map<string, RiverVertex>();
  const uniqueNeighborRegion = new Map<string, RiverVertex>();
  for (const hex of region.hexes) {
    for (const vertex of getHexCornerPoints(hex)) {
      const usage = vertexUsageByKey.get(vertex.key) ?? {
        vertex,
        currentRegionCount: 0,
        otherRegionCount: 0,
        candidateCount: 0
      };
      if (usage.currentRegionCount > 0 && usage.candidateCount > 0) uniqueCandidate.set(vertex.key, vertex);
      if (usage.currentRegionCount > 0 && usage.otherRegionCount > 0) uniqueNeighborRegion.set(vertex.key, vertex);
    }
  }
  return { candidateVertices: Array.from(uniqueCandidate.values()), neighborRegionVertices: Array.from(uniqueNeighborRegion.values()) };
}

function getVertexUsageByKeyForRegion(
  region: Region,
  regions: Region[] = [],
  candidateHexes: AxialHex[] = []
): Map<string, VertexUsage> {
  const map = new Map<string, VertexUsage>();
  if (!region?.hexes?.length) return map;
  const currentRegionHexKeys = new Set(region.hexes.map(hexKey));
  const addHexUsage = (hex: AxialHex, kind: 'current' | 'other' | 'candidate') => {
    for (const vertex of getHexCornerPoints(hex)) {
      const usage = map.get(vertex.key) ?? {
        vertex,
        currentRegionCount: 0,
        otherRegionCount: 0,
        candidateCount: 0
      };
      if (kind === 'current') usage.currentRegionCount += 1;
      if (kind === 'other') usage.otherRegionCount += 1;
      if (kind === 'candidate') usage.candidateCount += 1;
      map.set(vertex.key, usage);
    }
  };
  for (const hex of region.hexes) addHexUsage(hex, 'current');
  for (const otherRegion of regions) {
    if (otherRegion.id === region.id) continue;
    for (const hex of otherRegion.hexes) addHexUsage(hex, 'other');
  }
  for (const candidateHex of candidateHexes) {
    if (currentRegionHexKeys.has(hexKey(candidateHex))) continue;
    addHexUsage(candidateHex, 'candidate');
  }
  return map;
}

function getLakesForRegion(
  region: Region,
  hexTerrainByKey: Map<string, HexTerrainData>
): Lake[] {
  const lakeHexesById = new Map<number, AxialHex[]>();
  for (const hex of region.hexes) {
    const terrain = hexTerrainByKey.get(hexKey(hex));
    if (terrain?.terrainOverride !== 'lake' || terrain.lakeId === undefined) continue;
    const hexes = lakeHexesById.get(terrain.lakeId) ?? [];
    hexes.push(hex);
    lakeHexesById.set(terrain.lakeId, hexes);
  }

  return Array.from(lakeHexesById.entries()).map(([lakeId, hexes]) => {
    const verticesByKey = new Map<string, RiverVertex>();
    for (const hex of hexes) {
      for (const vertex of getHexCornerPoints(hex)) verticesByKey.set(vertex.key, vertex);
    }
    return { lakeId, hexes, vertices: Array.from(verticesByKey.values()) };
  });
}

function getLakesForRegions(regions: Region[], hexTerrainByKey: Map<string, HexTerrainData>): Lake[] {
  return regions.flatMap((region) => getLakesForRegion(region, hexTerrainByKey));
}

function getRiverEdgeKey(a: RiverVertex, b: RiverVertex): string {
  return edgeKey(a, b);
}

function getRiverEndpointReason(
  index: number,
  lastIndex: number,
  vertexKey: string,
  lakeVertexKeys: Set<string>,
  confluenceVertexKeys: Set<string>,
  regionBoundaryVertexKeys: Set<string>,
  endpoint: 'start' | 'end'
): RiverSector['startReason'] | RiverSector['endReason'] {
  if (lakeVertexKeys.has(vertexKey)) return 'lake';
  if (confluenceVertexKeys.has(vertexKey)) return 'river_confluence';
  if (endpoint === 'start' && index === 0) return 'river_start';
  if (endpoint === 'end' && index === lastIndex) return 'river_end';
  if (regionBoundaryVertexKeys.has(vertexKey)) return 'region_boundary';
  return 'split';
}

function getRiverSimpleEdgeKeys(vertexPath: RiverVertex[]): string[] {
  const edgeKeys: string[] = [];
  for (let i = 1; i < vertexPath.length; i += 1) {
    edgeKeys.push(getRiverEdgeKey(vertexPath[i - 1], vertexPath[i]));
  }
  return edgeKeys;
}

function createInitialRiverSectors(
  riverId: number | string,
  vertexPath: RiverVertex[],
  fullness: RiverFullness = 1,
  reasons: Partial<Pick<RiverSector, 'startReason' | 'endReason'>> = {},
  assignedRegionId?: number
): RiverSector[] {
  if (vertexPath.length < 2) return [];

  return [{
    id: `${riverId}:sector:1`,
    riverId,
    sectorIndex: 1,
    vertexPath,
    edgeKeys: getRiverSimpleEdgeKeys(vertexPath),
    startVertexKey: vertexPath[0].key,
    endVertexKey: vertexPath[vertexPath.length - 1].key,
    startReason: reasons.startReason ?? 'river_start',
    endReason: reasons.endReason ?? 'river_end',
    fullness,
    assignedRegionId
  }];
}



function getRiverSectorFullnessByEdge(river: River): Map<string, RiverFullness> {
  const fullnessByEdge = new Map<string, RiverFullness>();
  for (const sector of river.sectors ?? []) {
    for (const edgeKey of sector.edgeKeys ?? []) {
      fullnessByEdge.set(edgeKey, sector.fullness ?? 1);
    }
  }
  return fullnessByEdge;
}

function getRiverSectorAssignedRegionByEdge(river: River): Map<string, number> {
  const assignedRegionByEdge = new Map<string, number>();
  for (const sector of river.sectors ?? []) {
    if (sector.assignedRegionId === undefined) continue;
    for (const edgeKey of sector.edgeKeys ?? []) {
      if (!assignedRegionByEdge.has(edgeKey)) {
        assignedRegionByEdge.set(edgeKey, sector.assignedRegionId);
      }
    }
  }
  return assignedRegionByEdge;
}

function getRiverSectorAssignedRegion(
  edgeKeys: string[],
  assignedRegionByEdge: Map<string, number>,
  fallbackRegionId: number
): number {
  for (const edgeKey of edgeKeys) {
    const assignedRegionId = assignedRegionByEdge.get(edgeKey);
    if (assignedRegionId !== undefined) return assignedRegionId;
  }
  return fallbackRegionId;
}

function getRiverFallbackFullness(river: River): RiverFullness {
  return river.sectors?.[0]?.fullness ?? 1;
}

function getRiverSectorFullness(edgeKeys: string[], fullnessByEdge: Map<string, RiverFullness>, fallback: RiverFullness): RiverFullness {
  for (const edgeKey of edgeKeys) {
    const fullness = fullnessByEdge.get(edgeKey);
    if (fullness) return fullness;
  }
  return fallback;
}

function getMaxRiverSectorIndex(river: River): number {
  return Math.max(0, ...(river.sectors ?? []).map((sector) => sector.sectorIndex));
}

function getMinRiverSectorIndex(river: River): number {
  return Math.min(1, ...(river.sectors ?? []).map((sector) => sector.sectorIndex));
}

function withRiverSectorOrder(riverId: number | string, sectors: RiverSector[], firstSectorIndex: number): RiverSector[] {
  return sectors.map((sector, index) => {
    const sectorIndex = firstSectorIndex + index;
    return {
      ...sector,
      id: `${riverId}:sector:${sectorIndex}:${sector.startVertexKey}:${sector.endVertexKey}`,
      riverId,
      sectorIndex
    };
  });
}

function getRegionBoundaryVertexKeys(regions: Region[]): Set<string> {
  const regionIdsByVertexKey = new Map<string, Set<number>>();

  for (const region of regions) {
    for (const hex of region.hexes) {
      for (const vertex of getHexCornerPoints(hex)) {
        const regionIds = regionIdsByVertexKey.get(vertex.key) ?? new Set<number>();
        regionIds.add(region.id);
        regionIdsByVertexKey.set(vertex.key, regionIds);
      }
    }
  }

  const boundaryVertexKeys = new Set<string>();
  for (const [vertexKey, regionIds] of regionIdsByVertexKey.entries()) {
    if (regionIds.size > 1) boundaryVertexKeys.add(vertexKey);
  }
  return boundaryVertexKeys;
}

function getRiverEndpointSectorFullness(river: River, vertexKey: string): RiverFullness {
  const firstVertex = river.vertexPath[0];
  const lastVertex = river.vertexPath[river.vertexPath.length - 1];
  const endpointSectors = (river.sectors ?? []).filter((sector) => (
    (firstVertex?.key === vertexKey && sector.startVertexKey === vertexKey)
    || (lastVertex?.key === vertexKey && sector.endVertexKey === vertexKey)
  ));

  if (endpointSectors.length > 0) {
    return Math.max(...endpointSectors.map((sector) => sector.fullness)) as RiverFullness;
  }

  const touchingBoundarySectors = (river.sectors ?? []).filter((sector) => (
    sector.startVertexKey === vertexKey || sector.endVertexKey === vertexKey
  ));
  if (touchingBoundarySectors.length > 0) {
    return Math.max(...touchingBoundarySectors.map((sector) => sector.fullness)) as RiverFullness;
  }

  return getRiverFullnessAtVertex(river, vertexKey);
}

function getRiverFullnessAtEndpointVertex(rivers: River[], vertexKey: string, excludedRiverId?: number): RiverFullness | null {
  let fullness: RiverFullness | null = null;

  for (const river of rivers) {
    if (excludedRiverId !== undefined && river.id === excludedRiverId) continue;
    const firstVertex = river.vertexPath[0];
    const lastVertex = river.vertexPath[river.vertexPath.length - 1];
    if (firstVertex?.key !== vertexKey && lastVertex?.key !== vertexKey) continue;

    const endpointFullness = getRiverEndpointSectorFullness(river, vertexKey);
    if (fullness === null || endpointFullness > fullness) fullness = endpointFullness;
  }

  return fullness;
}

function chooseRiverFullnessFromAdjacentSectors(
  vertexPath: RiverVertex[],
  existingRivers: River[],
  fallbackFullness: RiverFullness,
  preferredFullness?: RiverFullness,
  excludedRiverId?: number
): RiverFullness {
  const startVertexKey = vertexPath[0]?.key;
  const endVertexKey = vertexPath[vertexPath.length - 1]?.key;
  const startFullness = startVertexKey ? getRiverFullnessAtEndpointVertex(existingRivers, startVertexKey, excludedRiverId) : null;
  const endFullness = endVertexKey ? getRiverFullnessAtEndpointVertex(existingRivers, endVertexKey, excludedRiverId) : null;

  if (startFullness !== null && endFullness !== null && startFullness !== endFullness) {
    return preferredFullness ?? startFullness;
  }
  return startFullness ?? endFullness ?? preferredFullness ?? fallbackFullness;
}

function getExistingRiverSectorBreakIndices(river: River, vertexPath: RiverVertex[]): Set<number> {
  const sectorBoundaryVertexKeys = new Set<string>();
  for (const sector of river.sectors ?? []) {
    sectorBoundaryVertexKeys.add(sector.startVertexKey);
    sectorBoundaryVertexKeys.add(sector.endVertexKey);
  }

  const breakIndices = new Set<number>();
  vertexPath.forEach((vertex, index) => {
    if (sectorBoundaryVertexKeys.has(vertex.key)) breakIndices.add(index);
  });
  return breakIndices;
}

function normalizeRiverSectorOrder(riverId: number | string, sectors: RiverSector[]): RiverSector[] {
  return sectors.map((sector, index) => {
    const sectorIndex = index + 1;
    return {
      ...sector,
      id: `${riverId}:sector:${sectorIndex}:${sector.startVertexKey}:${sector.endVertexKey}`,
      riverId,
      sectorIndex
    };
  });
}

function prependRiverPathSector(river: River, path: RiverVertex[], fullness: RiverFullness, assignedRegionId?: number): RiverSector[] {
  const createdSectors = createInitialRiverSectors(river.id, path, fullness, { endReason: 'region_boundary' }, assignedRegionId);
  if (createdSectors.length === 0) return river.sectors ?? [];

  const firstSectorIndex = getMinRiverSectorIndex(river) - createdSectors.length;
  return [
    ...withRiverSectorOrder(river.id, createdSectors, firstSectorIndex),
    ...(river.sectors ?? [])
  ];
}

function appendRiverPathSector(river: River, path: RiverVertex[], fullness: RiverFullness, assignedRegionId?: number): RiverSector[] {
  const createdSectors = createInitialRiverSectors(river.id, path, fullness, { startReason: 'region_boundary' }, assignedRegionId);
  if (createdSectors.length === 0) return river.sectors ?? [];

  const firstSectorIndex = getMaxRiverSectorIndex(river) + 1;
  return [
    ...(river.sectors ?? []),
    ...withRiverSectorOrder(river.id, createdSectors, firstSectorIndex)
  ];
}



function getRiverDownstreamFullness(river: River): RiverFullness {
  const downstreamVertexKey = river.vertexPath?.[river.vertexPath.length - 1]?.key;
  const downstreamSector = downstreamVertexKey
    ? [...(river.sectors ?? [])].reverse().find((sector) => sector.endVertexKey === downstreamVertexKey)
    : undefined;
  return downstreamSector?.fullness ?? river.sectors?.[river.sectors.length - 1]?.fullness ?? getRiverFallbackFullness(river);
}

function getRiverFullnessAtVertex(river: River, vertexKey: string): RiverFullness {
  let fullness: RiverFullness | null = null;

  for (const sector of river.sectors ?? []) {
    const touchesVertex = sector.startVertexKey === vertexKey
      || sector.endVertexKey === vertexKey
      || sector.vertexPath.some((vertex) => vertex.key === vertexKey);
    if (touchesVertex && (fullness === null || sector.fullness > fullness)) fullness = sector.fullness;
  }

  return fullness ?? getRiverFallbackFullness(river);
}

function getMaxTributaryFullnessAtVertex(
  river: River,
  vertexKey: string,
  riverIdsByVertexKey: Map<string, Set<number | string>>,
  riversById: Map<number | string, River>
): RiverFullness | null {
  const riverIds = riverIdsByVertexKey.get(vertexKey);
  if (!riverIds) return null;

  let maxFullness: RiverFullness | null = null;
  for (const riverId of riverIds) {
    if (riverId === river.id) continue;
    const tributary = riversById.get(riverId);
    if (!tributary) continue;
    const tributaryMouth = tributary.vertexPath?.[tributary.vertexPath.length - 1];
    // Only rivers that end at this vertex are true tributaries. Other rivers may
    // also touch the same vertex as an upstream source or through segment, but
    // counting them here can apply a downstream river's fullness as an incoming
    // tributary and incorrectly raise 3 -> 4 -> 5 in one region.
    if (tributaryMouth?.key !== vertexKey) continue;
    const tributaryFullness = getRiverFullnessAtVertex(tributary, vertexKey);
    if (maxFullness === null || tributaryFullness > maxFullness) maxFullness = tributaryFullness;
  }

  return maxFullness;
}

function getIncreasedRiverFullnessAfterTributary(
  currentFullness: RiverFullness,
  maxTributaryFullness: RiverFullness | null
): RiverFullness {
  if (currentFullness === 4 && maxTributaryFullness !== null && maxTributaryFullness >= 3) return 5;
  if (currentFullness === 3 && maxTributaryFullness !== null && maxTributaryFullness >= 2) return 4;
  if (currentFullness === 2 && maxTributaryFullness !== null) return 3;
  return currentFullness;
}

type CandidateBoundaryByHeight = Map<RegionHeightLevel, { edgeKeys: Set<string>; vertexKeys: Set<string> }>;

type AssignRiverSectorsOptions = {
  recalculatedRegionId?: number;
};

type RiverFullnessRuleState = {
  confluenceTributaryFullnessByIndex: Map<number, RiverFullness>;
  allowConfluenceFullnessIncrease: boolean;
  reduceHeightTwoUpstreamBeforeConfluence: boolean;
  firstConfluenceIndex?: number;
};

function buildCandidateBoundaryByHeight(regions: Region[] = [], candidateHexes: AxialHex[] = []): CandidateBoundaryByHeight {
  const boundaryByHeight: CandidateBoundaryByHeight = new Map();
  if (regions.length === 0 || candidateHexes.length === 0) return boundaryByHeight;

  for (const region of regions) {
    const boundary = boundaryByHeight.get(region.heightLevel) ?? { edgeKeys: new Set<string>(), vertexKeys: new Set<string>() };
    for (const edge of getCandidateBoundaryEdgesForRegion(region.hexes, candidateHexes)) {
      boundary.edgeKeys.add(edge.edgeKey);
      boundary.vertexKeys.add(edge.from.key);
      boundary.vertexKeys.add(edge.to.key);
    }
    boundaryByHeight.set(region.heightLevel, boundary);
  }

  return boundaryByHeight;
}

function riverEndpointTouchesCandidateBoundary(
  river: River,
  endpoint: 'upstream' | 'downstream',
  candidateBoundaryByHeight: CandidateBoundaryByHeight,
  heightLevel?: RegionHeightLevel,
  extraBoundary?: { edgeKeys: Set<string>; vertexKeys: Set<string> }
): boolean {
  const vertexPath = river.vertexPath ?? [];
  if (vertexPath.length < 2) return false;

  const boundaries = heightLevel !== undefined
    ? [candidateBoundaryByHeight.get(heightLevel)].filter((boundary): boundary is { edgeKeys: Set<string>; vertexKeys: Set<string> } => Boolean(boundary))
    : Array.from(candidateBoundaryByHeight.values());
  if (boundaries.length === 0 && !extraBoundary) return false;

  const endpointIndex = endpoint === 'upstream' ? 0 : vertexPath.length - 1;
  const adjacentIndex = endpoint === 'upstream' ? 1 : vertexPath.length - 2;
  const endpointVertex = vertexPath[endpointIndex];
  const endpointEdgeKey = getRiverEdgeKey(endpointVertex, vertexPath[adjacentIndex]);

  // Prefer a candidate-facing endpoint edge, but also accept the terminal
  // endpoint vertex itself. Some valid rivers end on a candidate hex corner while
  // their last drawn segment follows another incident region edge, so edge-only
  // matching misses a downstream exit that is still present on the candidate.
  if (boundaries.some((boundary) => boundary.edgeKeys.has(endpointEdgeKey) || boundary.vertexKeys.has(endpointVertex.key))) {
    return true;
  }
  // Вариант 1: морское устье — тоже валидный низовой выход реки. После установки
  // моря прибрежная река кончается у моря (не у кандидата), поэтому без этого
  // правило роста полноводности на слиянии ошибочно выключалось.
  return Boolean(extraBoundary && (extraBoundary.edgeKeys.has(endpointEdgeKey) || extraBoundary.vertexKeys.has(endpointVertex.key)));
}

function getConfluenceTributaryFullnessByIndex(
  river: River,
  riverIdsByVertexKey: Map<string, Set<number | string>>,
  riversById: Map<number | string, River>
): Map<number, RiverFullness> {
  const result = new Map<number, RiverFullness>();
  const vertexPath = river.vertexPath ?? [];
  if (vertexPath.length < 3) return result;

  for (let index = 1; index < vertexPath.length - 1; index += 1) {
    const maxTributaryFullness = getMaxTributaryFullnessAtVertex(
      river,
      vertexPath[index].key,
      riverIdsByVertexKey,
      riversById
    );
    if (maxTributaryFullness !== null) result.set(index, maxTributaryFullness);
  }

  return result;
}

function vertexTouchesCandidateBoundary(
  vertexPath: RiverVertex[],
  index: number,
  candidateBoundaryByHeight: CandidateBoundaryByHeight
): boolean {
  const vertex = vertexPath[index];
  if (!vertex) return false;
  const previous = vertexPath[index - 1];
  const next = vertexPath[index + 1];
  const incidentEdgeKeys = [previous, next]
    .filter((adjacent): adjacent is RiverVertex => Boolean(adjacent))
    .map((adjacent) => getRiverEdgeKey(vertex, adjacent));

  return Array.from(candidateBoundaryByHeight.values()).some((boundary) => (
    boundary.vertexKeys.has(vertex.key)
    || incidentEdgeKeys.some((edgeKey) => boundary.edgeKeys.has(edgeKey))
  ));
}

function firstDownstreamOutletAfterConfluenceTouchesCandidate(
  river: River,
  confluenceIndices: number[],
  candidateBoundaryByHeight: CandidateBoundaryByHeight,
  regionBoundaryVertexKeys: Set<string>,
  extraDownstreamBoundary?: { edgeKeys: Set<string>; vertexKeys: Set<string> }
): boolean {
  if (confluenceIndices.length === 0) return false;
  const vertexPath = river.vertexPath ?? [];
  const firstConfluenceIndex = Math.min(...confluenceIndices);

  // If the final downstream endpoint already faces an ungenerated candidate (or
  // the sea), the merged flow has an outlet even when the full river path crosses
  // older region-boundary vertices before reaching that endpoint. The scan below
  // still protects local intermediate outlets, but endpoint-first detection keeps
  // confluences in a newly generated region from being hidden by historical
  // boundary vertices stored in the same river path.
  if (riverEndpointTouchesCandidateBoundary(river, 'downstream', candidateBoundaryByHeight, undefined, extraDownstreamBoundary)) {
    return true;
  }

  for (let index = firstConfluenceIndex + 1; index < vertexPath.length; index += 1) {
    if (vertexTouchesCandidateBoundary(vertexPath, index, candidateBoundaryByHeight)) return true;
    if (regionBoundaryVertexKeys.has(vertexPath[index].key)) return false;
  }

  return false;
}

function buildRiverFullnessRuleState(
  river: River,
  riverIdsByVertexKey: Map<string, Set<number | string>>,
  riversById: Map<number | string, River>,
  candidateBoundaryByHeight: CandidateBoundaryByHeight,
  regionBoundaryVertexKeys: Set<string>,
  extraDownstreamBoundary?: { edgeKeys: Set<string>; vertexKeys: Set<string> }
): RiverFullnessRuleState {
  const confluenceTributaryFullnessByIndex = getConfluenceTributaryFullnessByIndex(river, riverIdsByVertexKey, riversById);
  const confluenceIndices = Array.from(confluenceTributaryFullnessByIndex.keys());
  const allowConfluenceFullnessIncrease = firstDownstreamOutletAfterConfluenceTouchesCandidate(
    river,
    confluenceIndices,
    candidateBoundaryByHeight,
    regionBoundaryVertexKeys,
    extraDownstreamBoundary
  );
  const reduceHeightTwoUpstreamBeforeConfluence = confluenceIndices.length > 0 && riverEndpointTouchesCandidateBoundary(
    river,
    'upstream',
    candidateBoundaryByHeight,
    2
  );
  return {
    confluenceTributaryFullnessByIndex,
    allowConfluenceFullnessIncrease,
    reduceHeightTwoUpstreamBeforeConfluence,
    firstConfluenceIndex: confluenceIndices.length > 0 ? Math.min(...confluenceIndices) : undefined
  };
}

function isDownstreamOfConfluenceFullnessIncrease(
  fromIndex: number,
  ruleState: RiverFullnessRuleState
): boolean {
  return ruleState.allowConfluenceFullnessIncrease
    && Array.from(ruleState.confluenceTributaryFullnessByIndex.keys()).some((confluenceIndex) => confluenceIndex < fromIndex);
}

function applyRiverFullnessRules(
  currentDownstreamFullness: RiverFullness,
  fromIndex: number,
  toIndex: number,
  ruleState: RiverFullnessRuleState,
  allowHeightOneConfluenceIncrease: boolean
): { downstreamFullness: RiverFullness; sectorFullness: RiverFullness } {
  let downstreamFullness = currentDownstreamFullness;

  // A confluence can raise the carried downstream fullness only inside a
  // height-1 region when the combined flow has a downstream candidate exit.
  // The raised value then propagates through subsequent height-1 sectors.
  const tributaryFullnessAtSectorStart = ruleState.confluenceTributaryFullnessByIndex.get(fromIndex) ?? null;
  if (
    allowHeightOneConfluenceIncrease
    && ruleState.allowConfluenceFullnessIncrease
    && tributaryFullnessAtSectorStart !== null
  ) {
    downstreamFullness = getIncreasedRiverFullnessAfterTributary(
      downstreamFullness,
      tributaryFullnessAtSectorStart
    );
  }

  let sectorFullness = downstreamFullness;
  const sectorIsUpstreamBeforeConfluence = ruleState.firstConfluenceIndex !== undefined
    && fromIndex < ruleState.firstConfluenceIndex
    && toIndex <= ruleState.firstConfluenceIndex;
  if (sectorIsUpstreamBeforeConfluence) {
    const shouldReduceHeightTwo = ruleState.reduceHeightTwoUpstreamBeforeConfluence
      && sectorFullness === 3;

    if (shouldReduceHeightTwo) {
      sectorFullness = 2;
    }
  }

  return { downstreamFullness, sectorFullness };
}


function applySingleMountainUpstreamTributaryDrop(region: Region, rivers: River[]): River[] {
  if (region.heightLevel !== 3) return rivers;

  const applyDropForOutgoingFullness = (outgoingFullness: RiverFullness, upstreamFullness: RiverFullness): { foundOutgoing: boolean; rivers: River[] | null } => {
    let foundOutgoing = false;

    for (const river of rivers) {
      const sectorTouchesRegion = (sector: RiverSector): boolean => sector.assignedRegionId === region.id
        || sector.vertexPath.some((vertex) => vertexTouchesAnyHex(vertex, region.hexes));
      const regionSectors = (river.sectors ?? []).filter(sectorTouchesRegion);
      const hasOutgoingFullness = regionSectors.some((sector) => (
        sector.endReason === 'region_boundary'
        && sector.fullness === outgoingFullness
      ));
      if (!hasOutgoingFullness) continue;
      foundOutgoing = true;

      const mainVertexIndexByKey = new Map<string, number>();
      river.vertexPath.forEach((vertex, index) => {
        if (!mainVertexIndexByKey.has(vertex.key)) mainVertexIndexByKey.set(vertex.key, index);
      });

      const indexedRegionSectors = (river.sectors ?? [])
        .filter(sectorTouchesRegion)
        .map((sector) => ({
          sector,
          startIndex: mainVertexIndexByKey.get(sector.startVertexKey) ?? Number.POSITIVE_INFINITY,
          endIndex: mainVertexIndexByKey.get(sector.endVertexKey) ?? Number.POSITIVE_INFINITY
        }))
        .filter(({ startIndex, endIndex }) => Number.isFinite(startIndex) && Number.isFinite(endIndex))
        .sort((a, b) => Math.min(a.startIndex, a.endIndex) - Math.min(b.startIndex, b.endIndex));
      if (indexedRegionSectors.length === 0) return { foundOutgoing, rivers: null };

      const outgoingSector = indexedRegionSectors[0].sector;
      if (outgoingSector.fullness !== outgoingFullness) return { foundOutgoing, rivers: null };

      const incomingSector = indexedRegionSectors[indexedRegionSectors.length - 1].sector;
      if (incomingSector.fullness !== outgoingFullness) return { foundOutgoing, rivers: null };

      const tributaryConnection = rivers
        .filter((tributary) => tributary.id !== river.id)
        .map((tributary) => {
          const tributaryMouth = tributary.vertexPath[tributary.vertexPath.length - 1];
          const mainIndex = tributaryMouth ? mainVertexIndexByKey.get(tributaryMouth.key) : undefined;
          if (mainIndex === undefined || mainIndex <= 0 || mainIndex >= river.vertexPath.length - 1) return null;
          return { vertexKey: tributaryMouth.key, mainIndex };
        })
        .filter((item): item is { vertexKey: string; mainIndex: number } => item !== null)
        .sort((a, b) => a.mainIndex - b.mainIndex)[0];

      if (!tributaryConnection) return { foundOutgoing, rivers: null };

      return { foundOutgoing, rivers: rivers.map((item) => {
        if (item.id !== river.id) return item;
        return {
          ...item,
          sectors: (item.sectors ?? []).map((sector) => {
            if (!sectorTouchesRegion(sector)) return sector;
            const sectorEndIndex = mainVertexIndexByKey.get(sector.endVertexKey);
            if (sectorEndIndex === undefined || sectorEndIndex > tributaryConnection.mainIndex) return sector;
            // Assign an exact rule value, not "current fullness - 1", so this rule cannot stack with prior fullness changes.
            return { ...sector, fullness: upstreamFullness };
          })
        };
      }) };
    }

    return { foundOutgoing, rivers: null };
  };

  const fullnessThreeResult = applyDropForOutgoingFullness(3, 2);
  if (fullnessThreeResult.foundOutgoing) return fullnessThreeResult.rivers ?? rivers;

  const fullnessTwoResult = applyDropForOutgoingFullness(2, 1);
  return fullnessTwoResult.rivers ?? rivers;
}

function validateExistingRiverEdgeFullnessPreserved(previousRivers: River[], nextRivers: River[]): boolean {
  const previousFullnessByEdge = getRiverCrossingFullnessByEdge(previousRivers);
  const nextFullnessByEdge = getRiverCrossingFullnessByEdge(nextRivers);
  const changedEdges: Array<{ edgeKey: string; previousFullness: RiverFullness; nextFullness: RiverFullness }> = [];

  for (const [edgeKey, previousFullness] of previousFullnessByEdge.entries()) {
    const nextFullness = nextFullnessByEdge.get(edgeKey);
    if (nextFullness !== undefined && nextFullness < previousFullness) {
      changedEdges.push({ edgeKey, previousFullness, nextFullness });
    }
  }

  if (changedEdges.length > 0) {
    console.warn('Rejecting river update because existing river edge fullness decreased', { changedEdges });
    return false;
  }
  return true;
}

function buildSeaMouthBoundary(seaHexKeys: Iterable<string>): { edgeKeys: Set<string>; vertexKeys: Set<string> } {
  const edgeKeys = new Set<string>();
  const vertexKeys = new Set<string>();
  for (const key of seaHexKeys) {
    const hex = parseHexKey(key);
    const corners = getHexCornerPoints(hex);
    for (const corner of corners) vertexKeys.add(corner.key);
    for (let i = 0; i < corners.length; i += 1) {
      edgeKeys.add(getRiverEdgeKey(corners[i], corners[(i + 1) % corners.length]));
    }
  }
  return { edgeKeys, vertexKeys };
}

function assignRiverSectors(
  rivers: River[],
  lakes: Lake[],
  regions: Region[] = [],
  candidateHexes: AxialHex[] = [],
  seaHexKeys: Iterable<string> = [],
  options: AssignRiverSectorsOptions = {}
): River[] {
  const riversById = new Map<number | string, River>();
  for (const river of rivers) riversById.set(river.id, river);

  const riverIdsByVertexKey = new Map<string, Set<number | string>>();
  for (const river of rivers) {
    for (const vertex of river.vertexPath ?? []) {
      const riverIds = riverIdsByVertexKey.get(vertex.key) ?? new Set<number | string>();
      riverIds.add(river.id);
      riverIdsByVertexKey.set(vertex.key, riverIds);
    }
  }

  const lakeExteriorVertexKeysByLakeId = new Map<number, Set<string>>();
  const lakeVertexKeys = new Set<string>();
  const regionBoundaryVertexKeys = getRegionBoundaryVertexKeys(regions);
  const candidateBoundaryByHeight = buildCandidateBoundaryByHeight(regions, candidateHexes);
  const regionHeightById = new Map(regions.map((region) => [region.id, region.heightLevel]));
  const seaMouthBoundary = buildSeaMouthBoundary(seaHexKeys);
  const extraDownstreamBoundary = seaMouthBoundary.edgeKeys.size > 0 || seaMouthBoundary.vertexKeys.size > 0
    ? seaMouthBoundary
    : undefined;
  for (const lake of lakes) {
    const exteriorKeys = new Set(getRegionExteriorVertices(lake.hexes).map((vertex) => vertex.key));
    lakeExteriorVertexKeysByLakeId.set(lake.lakeId, exteriorKeys);
    for (const key of exteriorKeys) lakeVertexKeys.add(key);
  }

  const nextRivers = rivers.map((river) => {
    try {
      const vertexPath = river.vertexPath ?? [];
      if (vertexPath.length < 2) {
        console.warn('Could not assign river sectors: river path is too short', { riverId: river.id, vertexCount: vertexPath.length });
        return { ...river, sectors: [] };
      }

      const lastIndex = vertexPath.length - 1;
      const existingFullnessByEdge = getRiverSectorFullnessByEdge(river);
      const existingAssignedRegionByEdge = getRiverSectorAssignedRegionByEdge(river);
      const fallbackFullness = getRiverFallbackFullness(river);
      const breakIndices = getExistingRiverSectorBreakIndices(river, vertexPath);
      breakIndices.add(0);
      breakIndices.add(lastIndex);
      const confluenceVertexKeys = new Set<string>();
      const riverFullnessRuleState = buildRiverFullnessRuleState(
        river,
        riverIdsByVertexKey,
        riversById,
        candidateBoundaryByHeight,
        regionBoundaryVertexKeys,
        extraDownstreamBoundary
      );
      // Вариант 2 (нижняя граница): полноводность реки до пересчёта — страховка,
      // чтобы повторный расчёт после моря не занижал её ниже первого слияния.
      const priorSectorFullnesses = (river.sectors ?? []).map((sector) => sector.fullness);
      const priorMaxFullness: RiverFullness | null = priorSectorFullnesses.length > 0
        ? (Math.max(...priorSectorFullnesses) as RiverFullness)
        : null;

      vertexPath.forEach((vertex, index) => {
        const riverIds = riverIdsByVertexKey.get(vertex.key);
        if (riverIds && Array.from(riverIds).some((riverId) => riverId !== river.id)) {
          confluenceVertexKeys.add(vertex.key);
          breakIndices.add(index);
        }
        // Joining a new region can turn an old river vertex into a region-boundary vertex.
        // That must not create a new sector by itself: existing sector borders are restored
        // from river.sectors above, while true topology changes (confluences and lakes)
        // still add their own break points here.
      });

      for (const lakeVertexKeysForLake of lakeExteriorVertexKeysByLakeId.values()) {
        const firstLakeContactIndex = vertexPath.findIndex((vertex) => lakeVertexKeysForLake.has(vertex.key));
        if (firstLakeContactIndex > 0 && firstLakeContactIndex < lastIndex) {
          breakIndices.add(firstLakeContactIndex);
        }
      }

      const sortedBreakIndices = Array.from(breakIndices).sort((a, b) => a - b);
      const sectors: RiverSector[] = [];
      let downstreamFullness: RiverFullness = fallbackFullness;

      for (let i = 1; i < sortedBreakIndices.length; i += 1) {
        const fromIndex = sortedBreakIndices[i - 1];
        const toIndex = sortedBreakIndices[i];
        if (toIndex <= fromIndex) continue;

        const sectorPath = vertexPath.slice(fromIndex, toIndex + 1);
        if (sectorPath.length < 2) continue;

        const edgeKeys: string[] = [];
        for (let pathIndex = 1; pathIndex < sectorPath.length; pathIndex += 1) {
          edgeKeys.push(getRiverEdgeKey(sectorPath[pathIndex - 1], sectorPath[pathIndex]));
        }

        const sectorIndex = sectors.length + 1;
        const knownSectorFullness = edgeKeys
          .map((edgeKey) => existingFullnessByEdge.get(edgeKey))
          .find((fullness): fullness is RiverFullness => Boolean(fullness));
        const baseFullness = knownSectorFullness ?? fallbackFullness;
        const startReason = getRiverEndpointReason(
          fromIndex,
          lastIndex,
          sectorPath[0].key,
          lakeVertexKeys,
          confluenceVertexKeys,
          regionBoundaryVertexKeys,
          'start'
        ) as RiverSector['startReason'];
        const endReason = getRiverEndpointReason(
          toIndex,
          lastIndex,
          sectorPath[sectorPath.length - 1].key,
          lakeVertexKeys,
          confluenceVertexKeys,
          regionBoundaryVertexKeys,
          'end'
        ) as RiverSector['endReason'];
        const assignedRegionId = getRiverSectorAssignedRegion(edgeKeys, existingAssignedRegionByEdge, river.regionId);
        const assignedRegionHeight = regionHeightById.get(assignedRegionId);
        const allowHeightOneConfluenceIncrease = assignedRegionHeight === 1;
        const canRecalculateFullness = options.recalculatedRegionId === undefined
          || assignedRegionId === options.recalculatedRegionId;
        let fullness: RiverFullness;

        const confluenceAffectsSector = canRecalculateFullness
          && allowHeightOneConfluenceIncrease
          && riverFullnessRuleState.allowConfluenceFullnessIncrease
          && (
            riverFullnessRuleState.confluenceTributaryFullnessByIndex.has(fromIndex)
            || isDownstreamOfConfluenceFullnessIncrease(fromIndex, riverFullnessRuleState)
          );

        const preserveKnownFullness = startReason === 'split'
          || endReason === 'split'
          || startReason === 'lake'
          || endReason === 'lake';

        const confluenceAtSectorStart = riverFullnessRuleState.confluenceTributaryFullnessByIndex.has(fromIndex);
        const startingFullness = confluenceAtSectorStart
          ? downstreamFullness
          : baseFullness > downstreamFullness
            ? baseFullness
            : downstreamFullness;

        const adjustedFullness = applyRiverFullnessRules(
          startingFullness,
          fromIndex,
          toIndex,
          riverFullnessRuleState,
          allowHeightOneConfluenceIncrease
        );
        // This reduction is intentionally narrow: only sectors being recalculated
        // for the new region may apply it, and only before a confluence that has
        // a height-specific upstream reduction. Existing known fullness used to
        // mask these local reductions while preserving the carried downstream
        // fullness after the confluence.
        const localReductionAffectsSector = Boolean(
          canRecalculateFullness
          && !preserveKnownFullness
          && riverFullnessRuleState.reduceHeightTwoUpstreamBeforeConfluence
          && adjustedFullness.sectorFullness < startingFullness
        );

        if (!canRecalculateFullness) {
          downstreamFullness = baseFullness;
          fullness = baseFullness;
        } else if (knownSectorFullness && (!confluenceAffectsSector || preserveKnownFullness) && !localReductionAffectsSector) {
          downstreamFullness = knownSectorFullness;
          fullness = knownSectorFullness;
        } else if (knownSectorFullness) {
          downstreamFullness = adjustedFullness.downstreamFullness > knownSectorFullness
            ? adjustedFullness.downstreamFullness
            : knownSectorFullness;
          fullness = localReductionAffectsSector
            ? adjustedFullness.sectorFullness
            : adjustedFullness.sectorFullness > knownSectorFullness
              ? adjustedFullness.sectorFullness
              : knownSectorFullness;
        } else {
          downstreamFullness = adjustedFullness.downstreamFullness;
          fullness = adjustedFullness.sectorFullness;

          if (
            priorMaxFullness !== null
            && riverFullnessRuleState.firstConfluenceIndex !== undefined
            && fromIndex >= riverFullnessRuleState.firstConfluenceIndex
          ) {
            if (downstreamFullness < priorMaxFullness) downstreamFullness = priorMaxFullness;
            if (fullness < priorMaxFullness) fullness = priorMaxFullness;
          }
        }
        sectors.push({
          id: `${river.id}:sector:${sectorIndex}`,
          riverId: river.id,
          sectorIndex,
          vertexPath: sectorPath,
          edgeKeys,
          startVertexKey: sectorPath[0].key,
          endVertexKey: sectorPath[sectorPath.length - 1].key,
          startReason,
          endReason,
          fullness,
          assignedRegionId
        });
      }

      return { ...river, sectors };
    } catch (error) {
      console.warn('Could not assign river sectors', { riverId: river.id, error });
      return { ...river, sectors: [] };
    }
  });

  for (const river of nextRivers) {
    if (!river.sectors || river.sectors.length === 0) {
      console.warn('River has no sectors after assignRiverSectors', river);
    }
  }
  return nextRivers;
}

function getRiverSectorsForHex(hex: AxialHex, rivers: River[]): RiverSector[] {
  const hexEdges = getHexEdgeKeys(hex);
  const hexVertexKeys = new Set(getHexCornerPoints(hex).map((vertex) => vertex.key));
  const sectorsById = new Map<string, RiverSector>();

  for (const river of rivers) {
    for (const sector of river.sectors ?? []) {
      const touchesHex = sector.edgeKeys.some((sectorEdgeKey) => hexEdges.has(sectorEdgeKey))
        || sector.vertexPath.some((vertex) => hexVertexKeys.has(vertex.key));
      if (touchesHex) sectorsById.set(sector.id, sector);
    }
  }

  return Array.from(sectorsById.values()).sort((a, b) => {
    const riverCompare = String(a.riverId).localeCompare(String(b.riverId), undefined, { numeric: true });
    return riverCompare || a.sectorIndex - b.sectorIndex;
  });
}

function getRiverSectorsForRegion(region: Region, rivers: River[]): RiverSector[] {
  const regionEdgeKeys = new Set<string>();
  for (const hex of region.hexes) {
    for (const edgeKey of getHexEdgeKeys(hex)) regionEdgeKeys.add(edgeKey);
  }

  const sectorsById = new Map<string, RiverSector>();
  for (const river of rivers) {
    for (const sector of river.sectors ?? []) {
      if (sector.assignedRegionId !== undefined && sector.assignedRegionId !== region.id) continue;
      if (sector.edgeKeys.some((edgeKey) => regionEdgeKeys.has(edgeKey))) {
        sectorsById.set(sector.id, sector);
      }
    }
  }

  return Array.from(sectorsById.values()).sort((a, b) => {
    const riverCompare = String(a.riverId).localeCompare(String(b.riverId), undefined, { numeric: true });
    return riverCompare || a.sectorIndex - b.sectorIndex;
  });
}

function getRiverSectorsTouchingRegion(region: Region, rivers: River[]): RiverSector[] {
  const regionEdgeKeys = new Set<string>();
  const regionVertexKeys = new Set<string>();
  for (const hex of region.hexes) {
    for (const edgeKey of getHexEdgeKeys(hex)) regionEdgeKeys.add(edgeKey);
    for (const vertex of getHexCornerPoints(hex)) regionVertexKeys.add(vertex.key);
  }

  const sectorsById = new Map<string, RiverSector>();
  for (const river of rivers) {
    for (const sector of river.sectors ?? []) {
      const touchesRegion = sector.edgeKeys.some((edgeKey) => regionEdgeKeys.has(edgeKey))
        || sector.vertexPath.some((vertex) => regionVertexKeys.has(vertex.key));
      if (touchesRegion) sectorsById.set(sector.id, sector);
    }
  }

  return Array.from(sectorsById.values()).sort((a, b) => {
    const riverCompare = String(a.riverId).localeCompare(String(b.riverId), undefined, { numeric: true });
    return riverCompare || a.sectorIndex - b.sectorIndex;
  });
}

function getRiverConfluences(rivers: River[]): RiverConfluence[] {
  const riversByVertexKey = new Map<string, River[]>();
  for (const river of rivers) {
    for (const vertex of river.vertexPath ?? []) {
      const vertexRivers = riversByVertexKey.get(vertex.key) ?? [];
      if (!vertexRivers.some((item) => item.id === river.id)) vertexRivers.push(river);
      riversByVertexKey.set(vertex.key, vertexRivers);
    }
  }

  const confluencesById = new Map<string, RiverConfluence>();
  for (const [vertexKey, vertexRivers] of riversByVertexKey) {
    if (vertexRivers.length < 2) continue;

    for (const tributary of vertexRivers) {
      const tributaryIndex = tributary.vertexPath.findIndex((vertex) => vertex.key === vertexKey);
      if (tributaryIndex < 0 || tributaryIndex !== tributary.vertexPath.length - 1) continue;

      const mainRivers = vertexRivers
        .map((river) => ({
          river,
          vertexIndex: river.vertexPath.findIndex((vertex) => vertex.key === vertexKey)
        }))
        .filter(({ river, vertexIndex }) => river.id !== tributary.id && vertexIndex >= 0 && vertexIndex < river.vertexPath.length - 1);

      for (const { river: mainRiver } of mainRivers) {
        const id = `${tributary.id}->${mainRiver.id}@${vertexKey}`;
        confluencesById.set(id, {
          id,
          tributaryRiverId: tributary.id,
          mainRiverId: mainRiver.id,
          vertexKey
        });
      }
    }
  }

  return Array.from(confluencesById.values()).sort((a, b) => {
    const tributaryCompare = a.tributaryRiverId - b.tributaryRiverId;
    return tributaryCompare || a.mainRiverId - b.mainRiverId || a.vertexKey.localeCompare(b.vertexKey);
  });
}


function buildRiverDownstreamAdjacency(rivers: River[]): Map<number, Set<number>> {
  const downstreamByRiverId = new Map<number, Set<number>>();
  for (const confluence of getRiverConfluences(rivers)) {
    const downstream = downstreamByRiverId.get(confluence.tributaryRiverId) ?? new Set<number>();
    downstream.add(confluence.mainRiverId);
    downstreamByRiverId.set(confluence.tributaryRiverId, downstream);
  }
  return downstreamByRiverId;
}

function riverDrainsInto(
  downstreamByRiverId: Map<number, Set<number>>,
  sourceRiverId: number,
  targetRiverId: number
): boolean {
  // Intentionally walks the full downstream chain, so A -> B -> C means A drains into C.
  if (sourceRiverId === targetRiverId) return true;
  const queue = [sourceRiverId];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const currentRiverId = queue.shift()!;
    if (visited.has(currentRiverId)) continue;
    visited.add(currentRiverId);

    for (const downstreamRiverId of downstreamByRiverId.get(currentRiverId) ?? []) {
      if (downstreamRiverId === targetRiverId) return true;
      if (!visited.has(downstreamRiverId)) queue.push(downstreamRiverId);
    }
  }

  return false;
}

function wouldCreateRiverDrainageCycle(
  rivers: River[],
  upstreamRiverId: number,
  downstreamRiverId: number
): boolean {
  if (upstreamRiverId === downstreamRiverId) return true;
  return riverDrainsInto(buildRiverDownstreamAdjacency(rivers), downstreamRiverId, upstreamRiverId);
}

function hasDirectedCycleInAdjacency<T>(adjacency: Map<T, Set<T>>): boolean {
  const visiting = new Set<T>();
  const visited = new Set<T>();

  const visit = (node: T): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const node of adjacency.keys()) {
    if (visit(node)) return true;
  }
  return false;
}

function riverPathHasDirectedCycle(river: River): boolean {
  const adjacency = new Map<string, Set<string>>();
  const edgeKeys = new Set<string>();
  const path = river.vertexPath ?? [];

  for (const vertex of path) {
    if (!adjacency.has(vertex.key)) adjacency.set(vertex.key, new Set<string>());
  }

  for (let index = 1; index < path.length; index += 1) {
    const fromKey = path[index - 1].key;
    const toKey = path[index].key;
    if (fromKey === toKey) return true;
    const currentEdgeKey = `${fromKey}>${toKey}`;
    if (edgeKeys.has(currentEdgeKey)) return true;
    edgeKeys.add(currentEdgeKey);
    const nextKeys = adjacency.get(fromKey) ?? new Set<string>();
    nextKeys.add(toKey);
    adjacency.set(fromKey, nextKeys);
    if (!adjacency.has(toKey)) adjacency.set(toKey, new Set<string>());
  }

  return hasDirectedCycleInAdjacency(adjacency);
}

function riverDrainageGraphHasCycle(rivers: River[]): boolean {
  return hasDirectedCycleInAdjacency(buildRiverDownstreamAdjacency(rivers));
}

function validateRiverCycleSafety(rivers: River[]): { valid: true } | { valid: false; reason: string; riverId?: number } {
  for (const river of rivers) {
    if (riverPathHasDirectedCycle(river)) {
      return { valid: false, reason: 'river_flows_into_itself', riverId: river.id };
    }
  }

  if (riverDrainageGraphHasCycle(rivers)) {
    return { valid: false, reason: 'river_drainage_cycle' };
  }

  return { valid: true };
}

function getRiverConfluenceVertexKeys(rivers: River[]): Set<string> {
  return new Set(getRiverConfluences(rivers).map((confluence) => confluence.vertexKey));
}

function getRiverConfluencesForRegion(region: Region, rivers: River[]): RiverConfluence[] {
  const regionVertexKeys = new Set<string>();
  for (const hex of region.hexes) {
    for (const vertex of getHexCornerPoints(hex)) regionVertexKeys.add(vertex.key);
  }

  return getRiverConfluences(rivers).filter((confluence) => regionVertexKeys.has(confluence.vertexKey));
}

function getRiversForHex(hex: AxialHex, rivers: River[]): River[] {
  const hexEdges = getHexEdgeKeys(hex);
  const hexVertexKeys = new Set(getHexCornerPoints(hex).map((vertex) => vertex.key));
  return rivers
    .filter((river) => {
      if (river.vertexPath.some((vertex) => hexVertexKeys.has(vertex.key))) return true;
      for (let i = 1; i < river.vertexPath.length; i += 1) {
        if (hexEdges.has(getRiverEdgeKey(river.vertexPath[i - 1], river.vertexPath[i]))) return true;
      }
      return false;
    })
    .sort((a, b) => a.id - b.id);
}


function getRiversOnHexEdges(hex: AxialHex, rivers: River[]): River[] {
  const hexEdges = getHexEdgeKeys(hex);
  return rivers
    .filter((river) => {
      for (let i = 1; i < river.vertexPath.length; i += 1) {
        if (hexEdges.has(getRiverEdgeKey(river.vertexPath[i - 1], river.vertexPath[i]))) return true;
      }
      return false;
    })
    .sort((a, b) => a.id - b.id);
}

function vertexTouchesAnyHex(vertex: RiverVertex, hexes: AxialHex[]): boolean {
  return hexes.some((hex) => getHexCornerPoints(hex).some((corner) => corner.key === vertex.key));
}

function getRegionHexesTouchingVertex(vertex: RiverVertex, region: Region): AxialHex[] {
  return region.hexes.filter((hex) => getHexCornerPoints(hex).some((corner) => corner.key === vertex.key));
}

function lakeHasRiverConnection(
  lakeHexes: AxialHex[],
  rivers: River[]
): boolean {
  const lakeVertexKeys = new Set(getRegionExteriorVertices(lakeHexes).map((vertex) => vertex.key));
  if (lakeVertexKeys.size === 0) return false;

  return rivers.some((river) =>
    river.vertexPath.some((vertex) => lakeVertexKeys.has(vertex.key))
  );
}

function getNeighborRiverVertices(
  vertex: RiverVertex,
  riverGraph: RiverGraph
): RiverVertex[] {
  const node = riverGraph.nodes.get(vertex.key);
  if (!node) return [];

  return node.incidentEdgeKeys
    .map((edgeKey) => riverGraph.edges.get(edgeKey))
    .filter((edge): edge is RiverGraphEdge => Boolean(edge))
    .map((edge) => {
      const nextNode = edge.a.key === vertex.key ? edge.b : edge.a;
      return { key: nextNode.key, x: nextNode.x, y: nextNode.y };
    });
}

type MinorRiverGenerationReason =
  | 'wrong_region_size'
  | 'wrong_height'
  | 'no_start_candidates'
  | 'no_valid_first_edge'
  | 'no_valid_path'
  | 'reached_lake'
  | 'max_length_reached'
  | 'ok';

type RiverControlPoints = {
  startVertex: RiverVertex;
  middlePurpleVertex?: RiverVertex;
  endVertex: RiverVertex;
  startMode: RiverStartMode;
  endMode?: 'existing river endpoint' | 'red vertex';
};

type MinorRiverBuildResult = {
  path: RiverVertex[];
  reason: Extract<MinorRiverGenerationReason, 'reached_lake' | 'max_length_reached' | 'ok'>;
  reachedLake: boolean;
};


function hasMountainOutgoingRiverWithFullness(
  region: Region,
  rivers: River[],
  riverGraph: RiverGraph,
  allowedFullnesses: Set<RiverFullness>
): boolean {
  if (region.heightLevel !== 3) return false;

  return findRiverEndpointsTouchingRegion(region, rivers, riverGraph).some((endpoint) => {
    if (endpoint.endpointType !== 'start') return false;
    const river = rivers.find((item) => item.id === endpoint.riverId);
    return river ? allowedFullnesses.has(getRiverEndpointSectorFullness(river, endpoint.vertex.key)) : false;
  });
}

function hasFullnessTwoOrThreeMountainOutgoingRiver(
  region: Region,
  rivers: River[],
  riverGraph: RiverGraph
): boolean {
  return hasMountainOutgoingRiverWithFullness(region, rivers, riverGraph, new Set<RiverFullness>([2, 3]));
}

type EdgeTributaryGenerationReason =
  | 'not_edge_size'
  | 'height_not_supported'
  | 'no_candidate_start_vertices'
  | 'no_outgoing_rivers'
  | 'no_valid_path'
  | 'invalid_result'
  | 'ok';

function tryAddEdgeMinorTributaryRiver(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateHexes: AxialHex[]
): River[] {
  let candidateStartCount = 0;
  let outgoingRiverCount = 0;
  let selectedTargetRiverId: number | null = null;

  const logGeneration = ({
    built,
    reason,
    pathLength,
  }: {
    built: boolean;
    reason: EdgeTributaryGenerationReason;
    pathLength: number;
  }) => {
    console.log('Edge tributary generation', {
      regionId: region.id,
      sizeCategory: region.sizeCategory,
      heightLevel: region.heightLevel,
      candidateStartCount,
      outgoingRiverCount,
      selectedTargetRiverId,
      built,
      reason,
      pathLength,
    });
  };

  try {
    const hasMountainFullnessTwoOrThreeOutgoingRiver = hasFullnessTwoOrThreeMountainOutgoingRiver(region, rivers, riverGraph);
    const supportsEdgeTributary = region.sizeCategory === 'land'
      || region.sizeCategory === 'vast_land'
      || hasMountainFullnessTwoOrThreeOutgoingRiver;
    if (!supportsEdgeTributary) {
      logGeneration({ built: false, reason: 'not_edge_size', pathLength: 0 });
      return rivers;
    }
    if (!(region.heightLevel === 1 || region.heightLevel === 2 || hasMountainFullnessTwoOrThreeOutgoingRiver)) {
      logGeneration({ built: false, reason: 'height_not_supported', pathLength: 0 });
      return rivers;
    }

    const candidateBoundaryVertices = getCandidateBoundaryVerticesForRegion(region.hexes, candidateHexes);
    const candidateBoundaryVertexKeys = new Set(candidateBoundaryVertices.map((vertex) => vertex.key));
    const usedRiverEdges = buildUsedRiverEdges(rivers);
    const regionRivers = getRiversForRegion(region, rivers);
    const existingRiverVertexKeys = new Set(rivers.flatMap((river) => river.vertexPath.map((vertex) => vertex.key)));
    const hasFreeInteriorStep = (vertex: RiverVertex): boolean => {
      const node = riverGraph.nodes.get(vertex.key);
      if (!node) return false;
      return node.incidentEdgeKeys.some((incidentEdgeKey) => {
        const graphEdge = riverGraph.edges.get(incidentEdgeKey);
        if (!graphEdge?.isInsideRegionEdge) return false;
        if (usedRiverEdges.has(graphEdge.key)) return false;
        const nextNode = graphEdge.a.key === vertex.key ? graphEdge.b : graphEdge.a;
        if (existingRiverVertexKeys.has(nextNode.key)) return false;
        return true;
      });
    };

    const startCandidatesByKey = new Map<string, RiverVertex>();
    for (const vertex of candidateBoundaryVertices) {
      if (startCandidatesByKey.has(vertex.key)) continue;
      if (!riverGraph.nodes.has(vertex.key)) continue;
      if (!candidateBoundaryVertexKeys.has(vertex.key)) continue;
      if (existingRiverVertexKeys.has(vertex.key)) continue;
      if (!hasFreeInteriorStep(vertex)) continue;
      startCandidatesByKey.set(vertex.key, vertex);
    }
    const startCandidates = Array.from(startCandidatesByKey.values());
    candidateStartCount = startCandidates.length;

    if (startCandidates.length === 0) {
      logGeneration({ built: false, reason: 'no_candidate_start_vertices', pathLength: 0 });
      return rivers;
    }

    const riverTouchesCandidateExit = (river: River): boolean => {
      if (river.vertexPath.some((vertex) => candidateBoundaryVertexKeys.has(vertex.key))) return true;
      const riverEdgeKeys = getRiverPathEdgeKeys(river.vertexPath, riverGraph);
      if (!riverEdgeKeys) return false;
      return riverEdgeKeys.some((riverEdgeKey) => riverGraph.edges.get(riverEdgeKey)?.isCandidateBoundaryEdge);
    };

    const outgoingEndpointByRiverId = new Map<number, RiverEndpointTouch>();
    for (const endpoint of findRiverEndpointsTouchingRegion(region, rivers, riverGraph)) {
      if (endpoint.endpointType !== 'start') continue;
      if (!outgoingEndpointByRiverId.has(endpoint.riverId)) outgoingEndpointByRiverId.set(endpoint.riverId, endpoint);
    }
    const getMountainOutgoingEndpointFullness = (river: River): RiverFullness | null => {
      const endpoint = outgoingEndpointByRiverId.get(river.id);
      return endpoint ? getRiverEndpointSectorFullness(river, endpoint.vertex.key) : null;
    };
    const riverIsRequiredMountainOutgoing = (river: River): boolean => {
      if (!hasMountainFullnessTwoOrThreeOutgoingRiver) return true;
      const fullness = getMountainOutgoingEndpointFullness(river);
      return fullness === 2 || fullness === 3;
    };

    const outgoingRivers = regionRivers
      .filter(riverTouchesCandidateExit)
      .filter(riverIsRequiredMountainOutgoing)
      .sort((a, b) => (getMountainOutgoingEndpointFullness(b) ?? 0) - (getMountainOutgoingEndpointFullness(a) ?? 0) || a.id - b.id);
    outgoingRiverCount = outgoingRivers.length;
    const selectedTargetRiver = outgoingRivers[0] ?? null;
    selectedTargetRiverId = selectedTargetRiver?.id ?? null;

    if (!selectedTargetRiver) {
      logGeneration({ built: false, reason: 'no_outgoing_rivers', pathLength: 0 });
      return rivers;
    }

    const selectedTargetVertices = selectedTargetRiver.vertexPath.filter((vertex) => riverGraph.nodes.has(vertex.key));
    const trimPathAtFirstExistingRiverVertex = (path: RiverVertex[]): RiverVertex[] => {
      for (let i = 1; i < path.length; i += 1) {
        if (existingRiverVertexKeys.has(path[i].key)) return path.slice(0, i + 1);
      }
      return path;
    };

    const validateEdgeTributaryPath = (path: RiverVertex[]): boolean => {
      if (path.length < 2) return false;
      if (!candidateBoundaryVertexKeys.has(path[0].key)) return false;
      if (existingRiverVertexKeys.has(path[0].key)) return false;
      const terminalVertex = path[path.length - 1];
      if (vertexTouchesAnyHex(terminalVertex, candidateHexes)) return false;
      if (!existingRiverVertexKeys.has(terminalVertex.key)) return false;
      if (path.length === 2) return false;
      if (path[0].key === terminalVertex.key) return false;
      if (new Set(path.map((vertex) => vertex.key)).size !== path.length) return false;
      if (path.slice(0, -1).some((vertex) => existingRiverVertexKeys.has(vertex.key))) return false;
      const pathEdgeKeys = getRiverPathEdgeKeys(path, riverGraph);
      if (!pathEdgeKeys) return false;
      if (hasDuplicateEdgeKeys(pathEdgeKeys)) return false;
      if (pathEdgeKeys.some((pathEdgeKey) => usedRiverEdges.has(pathEdgeKey))) return false;
      if (pathEdgeKeys.length === 1) return false;
      return true;
    };

    for (const startVertex of shuffleArray(startCandidates)) {
      const pathToTargetRiver = findBestFreeRiverPathToAnyTarget(
        startVertex,
        selectedTargetVertices,
        riverGraph,
        usedRiverEdges
      );
      if (!pathToTargetRiver) continue;
      const path = trimPathAtFirstExistingRiverVertex(pathToTargetRiver);
      if (!validateEdgeTributaryPath(path)) continue;

      const nextRiverId = Math.max(0, ...rivers.map((river) => river.id)) + 1;
      const newRiver: River = {
        id: nextRiverId,
        regionId: region.id,
        vertexPath: path,
        sectors: createInitialRiverSectors(nextRiverId, path, getTributaryRiverFullnessForHeight(region.heightLevel), {}, region.id),
      };
      const nextRivers = [...rivers, newRiver];
      validateRiverDirection(newRiver);
      if (!validateRiverContinuity(newRiver)) {
        logGeneration({ built: false, reason: 'invalid_result', pathLength: newRiver.vertexPath.length });
        return rivers;
      }
      const newRiverEdgeKeys = getRiverPathEdgeKeys(newRiver.vertexPath, riverGraph);
      if (!newRiverEdgeKeys || newRiverEdgeKeys.some((pathEdgeKey) => usedRiverEdges.has(pathEdgeKey)) || hasDuplicateEdgeKeys(newRiverEdgeKeys)) {
        logGeneration({ built: false, reason: 'invalid_result', pathLength: newRiver.vertexPath.length });
        return rivers;
      }
      validateNoDuplicateRiverEdges(nextRivers);
      logGeneration({ built: true, reason: 'ok', pathLength: newRiver.vertexPath.length });
      return nextRivers;
    }

    logGeneration({ built: false, reason: 'no_valid_path', pathLength: 0 });
    return rivers;
  } catch (error) {
    console.warn('Edge tributary generation failed', { regionId: region.id, error });
    logGeneration({ built: false, reason: 'no_valid_path', pathLength: 0 });
    return rivers;
  }
}

function tryAddSmallTributaryRiver(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateHexes: AxialHex[]
): River[] {
  const maxSegmentCount = 6;
  const logGeneration = ({
    startCandidates,
    built,
    reason,
    segmentCount,
    reachedLake,
    targetLakeWasFree,
  }: {
    startCandidates: number;
    built: boolean;
    reason: MinorRiverGenerationReason;
    segmentCount: number;
    reachedLake: boolean;
    targetLakeWasFree: boolean;
  }) => {
    console.log('Minor river generation', {
      regionId: region.id,
      sizeCategory: region.sizeCategory,
      heightLevel: region.heightLevel,
      startCandidates,
      built,
      reason,
      segmentCount,
      reachedLake,
      reversedForFlowDirection: true,
      targetLakeWasFree,
    });
  };

  try {
    const hasMountainFullnessTwoOrThreeOutgoingRiver = hasFullnessTwoOrThreeMountainOutgoingRiver(region, rivers, riverGraph);
    if (region.sizeCategory === 'land' || region.sizeCategory === 'vast_land') {
      return tryAddEdgeMinorTributaryRiver(region, terrainMap, riverGraph, rivers, candidateHexes);
    }
    const supportsInteriorTributary = region.sizeCategory === 'region'
      || region.sizeCategory === 'large_region'
      || hasMountainFullnessTwoOrThreeOutgoingRiver;
    if (!supportsInteriorTributary) {
      logGeneration({ startCandidates: 0, built: false, reason: 'wrong_region_size', segmentCount: 0, reachedLake: false, targetLakeWasFree: false });
      return rivers;
    }
    const regionRivers = getRiversForRegion(region, rivers);
    if (!(region.heightLevel === 1 || region.heightLevel === 2 || hasMountainFullnessTwoOrThreeOutgoingRiver)) {
      logGeneration({ startCandidates: 0, built: false, reason: 'wrong_height', segmentCount: 0, reachedLake: false, targetLakeWasFree: false });
      return rivers;
    }
    const tryMountainEdgeFallback = (): River[] => {
      if (!hasMountainFullnessTwoOrThreeOutgoingRiver) return rivers;
      return tryAddEdgeMinorTributaryRiver(region, terrainMap, riverGraph, rivers, candidateHexes);
    };

    const existingRiverVertexKeys = new Set(regionRivers.flatMap((river) => river.vertexPath.map((v) => v.key)));
    const existingRiverEdgeKeys = buildUsedRiverEdges(rivers);
    const freeLakeVertexKeys = new Set<string>();
    const connectedLakeVertexKeys = new Set<string>();
    for (const lake of getLakesForRegion(region, terrainMap)) {
      const exteriorVertices = getRegionExteriorVertices(lake.hexes);
      const targetVertexKeys = lakeHasRiverConnection(lake.hexes, rivers) ? connectedLakeVertexKeys : freeLakeVertexKeys;
      for (const vertex of exteriorVertices) targetVertexKeys.add(vertex.key);
    }

    const graphNodeFor = (vertex: RiverVertex): RiverGraphNode | undefined => riverGraph.nodes.get(vertex.key);
    const isCandidateAdjacentVertex = (vertex: RiverVertex): boolean => (
      vertexTouchesAnyHex(vertex, candidateHexes)
      || Boolean(graphNodeFor(vertex)?.isCandidateBoundaryVertex)
    );
    const isRegionPerimeterVertex = (vertex: RiverVertex): boolean => (
      !graphNodeFor(vertex)
      || Boolean(graphNodeFor(vertex)?.isRegionBoundaryVertex)
      || getRegionHexesTouchingVertex(vertex, region).length < 3
    );
    const isForbiddenInteriorVertex = (vertex: RiverVertex): boolean => (
      !graphNodeFor(vertex)
      || isRegionPerimeterVertex(vertex)
      || isCandidateAdjacentVertex(vertex)
    );
    const isFreeLakeVertex = (vertex: RiverVertex): boolean => freeLakeVertexKeys.has(vertex.key);
    const isConnectedLakeVertex = (vertex: RiverVertex): boolean => connectedLakeVertexKeys.has(vertex.key);
    const isValidNextVertex = (vertex: RiverVertex, pathVertexKeys: Set<string>): boolean => {
      if (isForbiddenInteriorVertex(vertex)) return false;
      if (existingRiverVertexKeys.has(vertex.key)) return false;
      if (isConnectedLakeVertex(vertex)) return false;
      if (pathVertexKeys.has(vertex.key)) return false;
      return true;
    };
    const isValidEdge = (from: RiverVertex, to: RiverVertex, pathEdgeKeys: Set<string>): boolean => {
      const key = edgeKey(from, to);
      const graphEdge = riverGraph.edges.get(key);
      if (!graphEdge?.isInsideRegionEdge) return false;
      if (existingRiverEdgeKeys.has(key)) return false;
      if (pathEdgeKeys.has(key)) return false;
      return true;
    };
    const distanceToNearestLake = (vertex: RiverVertex): number => {
      if (freeLakeVertexKeys.size === 0) return Number.POSITIVE_INFINITY;
      let min = Number.POSITIVE_INFINITY;
      for (const lakeKey of freeLakeVertexKeys) {
        const lakeVertex = riverGraph.nodes.get(lakeKey);
        if (!lakeVertex) continue;
        min = Math.min(min, Math.hypot(vertex.x - lakeVertex.x, vertex.y - lakeVertex.y));
      }
      return min;
    };
    const sortTowardLake = (vertices: RiverVertex[]): RiverVertex[] => {
      const randomized = shuffleArray(vertices);
      if (freeLakeVertexKeys.size === 0) return randomized;
      return randomized.sort((a, b) => distanceToNearestLake(a) - distanceToNearestLake(b));
    };

    const startCandidatesByKey = new Map<string, RiverVertex>();
    for (const river of regionRivers) {
      for (let i = 1; i < river.vertexPath.length - 1; i += 1) {
        const vertex = river.vertexPath[i];
        if (!vertex || startCandidatesByKey.has(vertex.key)) continue;
        if (isForbiddenInteriorVertex(vertex)) continue;
        startCandidatesByKey.set(vertex.key, vertex);
      }
    }
    const startCandidates = Array.from(startCandidatesByKey.values());

    if (startCandidates.length === 0) {
      logGeneration({ startCandidates: 0, built: false, reason: 'no_start_candidates', segmentCount: 0, reachedLake: false, targetLakeWasFree: false });
      return tryMountainEdgeFallback();
    }

    const buildFromStart = (startVertex: RiverVertex): MinorRiverBuildResult | null => {
      const firstPathVertexKeys = new Set<string>([startVertex.key]);
      const firstPathEdgeKeys = new Set<string>();
      const firstStepCandidates = getNeighborRiverVertices(startVertex, riverGraph).filter((next) => (
        isValidEdge(startVertex, next, firstPathEdgeKeys)
        && isValidNextVertex(next, firstPathVertexKeys)
      ));
      if (firstStepCandidates.length === 0) return null;

      for (const firstStep of sortTowardLake(firstStepCandidates)) {
        const path = [startVertex, firstStep];
        const pathVertexKeys = new Set<string>(path.map((vertex) => vertex.key));
        const pathEdgeKeys = new Set<string>([edgeKey(startVertex, firstStep)]);
        let previous = startVertex;
        let current = firstStep;
        let reachedLake = isFreeLakeVertex(current);

        while (!reachedLake && path.length - 1 < maxSegmentCount) {
          const nextCandidates = getNeighborRiverVertices(current, riverGraph).filter((next) => (
            next.key !== previous.key
            && isValidEdge(current, next, pathEdgeKeys)
            && isValidNextVertex(next, pathVertexKeys)
          ));
          if (nextCandidates.length === 0) break;

          const nextVertex = sortTowardLake(nextCandidates)[0];
          path.push(nextVertex);
          pathVertexKeys.add(nextVertex.key);
          pathEdgeKeys.add(edgeKey(current, nextVertex));
          previous = current;
          current = nextVertex;
          reachedLake = isFreeLakeVertex(current);
        }

        if (path.length >= 2) {
          return {
            path,
            reason: reachedLake ? 'reached_lake' : path.length - 1 >= maxSegmentCount ? 'max_length_reached' : 'ok',
            reachedLake,
          };
        }
      }

      return null;
    };

    let builtResult: MinorRiverBuildResult | null = null;
    let sawFirstEdgeCandidate = false;
    for (const startVertex of shuffleArray(startCandidates)) {
      const possibleFirstEdges = getNeighborRiverVertices(startVertex, riverGraph).filter((next) => (
        isValidEdge(startVertex, next, new Set<string>())
        && !isForbiddenInteriorVertex(next)
        && !existingRiverVertexKeys.has(next.key)
        && !isConnectedLakeVertex(next)
      ));
      if (possibleFirstEdges.length > 0) sawFirstEdgeCandidate = true;

      const result = buildFromStart(startVertex);
      if (result) {
        builtResult = result;
        break;
      }
    }

    if (!builtResult) {
      logGeneration({
        startCandidates: startCandidates.length,
        built: false,
        reason: sawFirstEdgeCandidate ? 'no_valid_path' : 'no_valid_first_edge',
        segmentCount: 0,
        reachedLake: false,
        targetLakeWasFree: false,
      });
      return tryMountainEdgeFallback();
    }

    const nextRiverId = Math.max(0, ...rivers.map((river) => river.id)) + 1;
    const newRiverPath = reverseRiverPath(builtResult.path);
    const newRiver: River = {
      id: nextRiverId,
      regionId: region.id,
      vertexPath: newRiverPath,
      sectors: createInitialRiverSectors(nextRiverId, newRiverPath, 1, {}, region.id),
    };
    const nextRivers = [...rivers, newRiver];
    for (const river of nextRivers) {
      validateRiverDirection(river);
      validateRiverContinuity(river);
    }
    validateNoDuplicateRiverEdges(nextRivers);
    logGeneration({
      startCandidates: startCandidates.length,
      built: true,
      reason: builtResult.reason,
      segmentCount: newRiver.vertexPath.length - 1,
      reachedLake: builtResult.reachedLake,
      targetLakeWasFree: builtResult.reachedLake,
    });
    return nextRivers;
  } catch (error) {
    console.warn('Minor river generation failed', { regionId: region.id, error });
    logGeneration({ startCandidates: 0, built: false, reason: 'no_valid_path', segmentCount: 0, reachedLake: false, targetLakeWasFree: false });
    return rivers;
  }
}

function getRiversForRegion(region: Region, rivers: River[]): River[] {
  const regionVertexKeys = new Set<string>();
  for (const hex of region.hexes) {
    for (const vertex of getHexCornerPoints(hex)) regionVertexKeys.add(vertex.key);
  }

  return rivers
    .filter((river) => river.vertexPath.some((vertex) => regionVertexKeys.has(vertex.key)))
    .sort((a, b) => a.id - b.id);
}

function getLakeSummariesForRegion(
  region: Region,
  hexTerrainByKey: Map<string, HexTerrainData>
): Array<{ lakeId: number; size: number }> {
  const lakeSizes = new Map<number, number>();
  for (const hex of region.hexes) {
    const terrain = hexTerrainByKey.get(hexKey(hex));
    if (terrain?.terrainOverride !== 'lake' || terrain.lakeId == null) continue;
    lakeSizes.set(terrain.lakeId, (lakeSizes.get(terrain.lakeId) ?? 0) + 1);
  }

  return Array.from(lakeSizes.entries())
    .map(([lakeId, size]) => ({ lakeId, size }))
    .sort((a, b) => a.lakeId - b.lakeId);
}

function formatHexCount(count: number, language: Language = 'ru'): string {
  if (language === 'en') return count === 1 ? 'hex' : 'hexes';
  if (count === 1) return 'гекс';
  if (count >= 2 && count <= 4) return 'гекса';
  return 'гексов';
}

function getMountainInteriorSourceVertices(
  region: Region,
  regions: Region[],
  candidateHexes: AxialHex[],
  riverGraph: RiverGraph,
  candidateVertices: RiverVertex[],
  neighborRegionVertices: RiverVertex[]
): RiverVertex[] {
  const vertexUsageByKey = getVertexUsageByKeyForRegion(region, regions, candidateHexes);
  const candidateVertexKeys = new Set(candidateVertices.map((vertex) => vertex.key));
  const neighborRegionVertexKeys = new Set(neighborRegionVertices.map((vertex) => vertex.key));
  const regionVerticesByKey = new Map<string, RiverVertex>();
  for (const hex of region.hexes) {
    for (const vertex of getHexCornerPoints(hex)) regionVerticesByKey.set(vertex.key, vertex);
  }

  return Array.from(regionVerticesByKey.values()).filter((vertex) => {
    if (candidateVertexKeys.has(vertex.key)) return false;
    if (neighborRegionVertexKeys.has(vertex.key)) return false;
    if (!riverGraph.nodes.has(vertex.key)) return false;
    const usage = vertexUsageByKey.get(vertex.key);
    if (!usage || usage.currentRegionCount < 1) return false;
    if (usage.candidateCount > 0) return false;
    if (usage.otherRegionCount > 0) return false;
    return true;
  });
}

function findBestPathFromSourceToOutgoingEndpoint(
  sourceVertices: RiverVertex[],
  outgoingEndpoint: RiverEndpointTouch,
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  options?: { requireCenterHexVertex?: AxialHex; occupiedVertexKeys?: Set<string>; allowedOccupiedVertexKeys?: Set<string> }
): RiverVertex[] | null {
  let bestPath: RiverVertex[] | null = null;
  for (const sourceVertex of sourceVertices) {
    const controlPoints: RiverControlPoints = {
      startVertex: sourceVertex,
      endVertex: outgoingEndpoint.vertex,
      startMode: 'mountain source',
      endMode: 'existing river endpoint'
    };
    const path = buildRiverPathViaControlPoints(controlPoints, riverGraph, usedRiverEdges);
    if (path.length < 2) continue;
    if (path[0].key !== sourceVertex.key || path[path.length - 1].key !== outgoingEndpoint.vertex.key) continue;
    if (new Set(path.map((vertex) => vertex.key)).size !== path.length) continue;
    const pathEdgeKeys = getRiverPathEdgeKeys(path, riverGraph);
    if (!pathEdgeKeys || pathEdgeKeys.some((pathEdgeKey) => usedRiverEdges.has(pathEdgeKey))) continue;
    if (options?.occupiedVertexKeys && !riverPathAvoidsOccupiedVertices(path, options.occupiedVertexKeys, options.allowedOccupiedVertexKeys)) continue;
    if (options?.requireCenterHexVertex && !riverPathTouchesCenterHexVertex(path, options.requireCenterHexVertex)) continue;
    if (!bestPath || path.length < bestPath.length) bestPath = path;
  }
  return bestPath;
}

function findBestPathFromLakeToOutgoingEndpoint(
  lakeVertices: RiverVertex[],
  outgoingEndpoint: RiverEndpointTouch,
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string> = new Set()
): RiverVertex[] | null {
  return findBestPathFromSourceToOutgoingEndpoint(lakeVertices, outgoingEndpoint, riverGraph, usedRiverEdges, {
    occupiedVertexKeys,
    allowedOccupiedVertexKeys: new Set([outgoingEndpoint.vertex.key])
  });
}

function chooseRandomRegionExteriorVertexPair(regionExteriorVertices: RiverVertex[]): { startVertex: RiverVertex; endVertex: RiverVertex } | null {
  if (regionExteriorVertices.length < 2) return null;
  const startVertex = randomFrom(regionExteriorVertices);
  const endPool = regionExteriorVertices.filter((vertex) => vertex.key !== startVertex.key);
  if (endPool.length === 0) return null;
  return { startVertex, endVertex: randomFrom(endPool) };
}

function validateRiverPathUsesExteriorEndpoints(
  vertexPath: RiverVertex[],
  regionExteriorVertices: RiverVertex[],
  riverGraph: RiverGraph
): boolean {
  if (!vertexPath || vertexPath.length < 2) return false;
  const exteriorSet = new Set(regionExteriorVertices.map((vertex) => vertex.key));
  const startKey = vertexPath[0].key;
  const endKey = vertexPath[vertexPath.length - 1].key;
  if (!exteriorSet.has(startKey) || !exteriorSet.has(endKey)) return false;
  for (let i = 1; i < vertexPath.length; i += 1) {
    if (!riverGraph.edges.has(edgeKey(vertexPath[i - 1], vertexPath[i]))) {
      return false;
    }
  }
  return true;
}

function getRiverPathEdgeKeys(vertexPath: RiverVertex[], riverGraph: RiverGraph): string[] | undefined {
  if (!vertexPath || vertexPath.length < 2) return [];
  const edgeKeys: string[] = [];
  for (let i = 1; i < vertexPath.length; i += 1) {
    const segmentEdge = riverGraph.edges.get(edgeKey(vertexPath[i - 1], vertexPath[i]));
    if (!segmentEdge) return undefined;
    edgeKeys.push(segmentEdge.key);
  }
  return edgeKeys;
}

function hasDuplicateEdgeKeys(edgeKeys: string[]): boolean {
  return new Set(edgeKeys).size !== edgeKeys.length;
}

function buildUsedRiverEdges(rivers: River[]): Set<string> {
  const used = new Set<string>();
  for (const river of rivers) {
    if (!river.vertexPath || river.vertexPath.length < 2) continue;
    for (let i = 1; i < river.vertexPath.length; i += 1) {
      used.add(edgeKey(river.vertexPath[i - 1], river.vertexPath[i]));
    }
  }
  return used;
}

function validateNoDuplicateRiverEdges(rivers: River[]): void {
  const seen = new Map<string, { regionId: number; riverId: number }>();

  for (const river of rivers) {
    if (!river.vertexPath || river.vertexPath.length < 2) continue;
    for (let i = 1; i < river.vertexPath.length; i += 1) {
      const key = edgeKey(river.vertexPath[i - 1], river.vertexPath[i]);

      if (seen.has(key)) {
        console.warn('Duplicate river edge detected', {
          edgeKey: key,
          first: seen.get(key),
          duplicate: { regionId: river.regionId, riverId: river.id }
        });
      } else {
        seen.set(key, { regionId: river.regionId, riverId: river.id });
      }
    }
  }
}

function reverseRiverPath(vertexPath: RiverVertex[]): RiverVertex[] {
  return [...vertexPath].reverse().map((vertex) => ({ ...vertex }));
}

function validateRiverDirection(river: River): void {
  if (!river.vertexPath || river.vertexPath.length < 2) return;
  for (let i = 0; i < river.vertexPath.length - 1; i += 1) {
    if (river.vertexPath[i].key === river.vertexPath[i + 1].key) {
      console.warn('Broken river direction/order', {
        riverId: river.id,
        index: i,
        currentEnd: river.vertexPath[i],
        nextStart: river.vertexPath[i + 1]
      });
    }
  }


  const outgoingByVertex = new Map<string, number>();
  for (let i = 1; i < river.vertexPath.length; i += 1) {
    const startKey = river.vertexPath[i - 1].key;
    outgoingByVertex.set(startKey, (outgoingByVertex.get(startKey) ?? 0) + 1);
  }
  for (const [vertexKey, outgoing] of outgoingByVertex.entries()) {
    if (outgoing > 1) {
      console.warn('Multiple outgoing river segments from one startPoint', { riverId: river.id, vertexKey, outgoing });
    }
  }
}

function findRiverConnectionByStartVertex(rivers: River[], startVertex: RiverVertex): RiverConnection | null {
  for (const river of rivers) {
    if (!river.vertexPath || river.vertexPath.length < 1) continue;
    const firstVertex = river.vertexPath[0];
    const lastVertex = river.vertexPath[river.vertexPath.length - 1];
    if (lastVertex?.key === startVertex.key) return { riverId: river.id, type: 'end', vertex: lastVertex };
    if (firstVertex?.key === startVertex.key) return { riverId: river.id, type: 'start', vertex: firstVertex };
  }
  return null;
}

function validateRiverContinuity(river: River): boolean {
  if (!river?.vertexPath || river.vertexPath.length < 2) return true;
  for (let i = 0; i < river.vertexPath.length - 1; i += 1) {
    const current = river.vertexPath[i];
    const next = river.vertexPath[i + 1];
    if (!current || !next || current.key === next.key) {
      console.warn('Broken river continuity', { riverId: river.id, index: i });
      return false;
    }
  }
  return true;
}

function findRiverEndpointsTouchingRegion(region: Region, rivers: River[], riverGraph: RiverGraph): RiverEndpointTouch[] {
  void region;
  const endpoints: RiverEndpointTouch[] = [];
  const confluenceVertexKeys = getRiverConfluenceVertexKeys(rivers);
  for (const river of rivers) {
    if (!river.vertexPath || river.vertexPath.length < 1) continue;
    const startVertex = river.vertexPath[0];
    const endVertex = river.vertexPath[river.vertexPath.length - 1];
    const startNode = startVertex ? riverGraph.nodes.get(startVertex.key) : undefined;
    const endNode = endVertex ? riverGraph.nodes.get(endVertex.key) : undefined;
    if (startVertex && startNode?.isRegionBoundaryVertex) {
      endpoints.push({ riverId: river.id, endpointType: 'start', vertex: startVertex });
    }
    if (
      endVertex
      && endNode?.isRegionBoundaryVertex
      && !confluenceVertexKeys.has(endVertex.key)
    ) {
      endpoints.push({ riverId: river.id, endpointType: 'end', vertex: endVertex });
    }
  }
  return endpoints;
}

function findRegionTouchingVertex(
  vertex: RiverVertex,
  regions: Region[]
): Region | undefined {
  for (const region of regions) {
    for (const hex of region.hexes) {
      if (getHexCornerPoints(hex).some((corner) => corner.key === vertex.key)) {
        return region;
      }
    }
  }

  return undefined;
}

function findRegionTouchingVertexExcept(
  vertex: RiverVertex,
  regions: Region[],
  excludedRegionId: number
): Region | undefined {
  return findRegionTouchingVertex(
    vertex,
    regions.filter((region) => region.id !== excludedRegionId)
  );
}

function canConnectIncomingToOutgoingByRegionHeight(
  region: Region,
  regions: Region[],
  incomingEndpoint: RiverEndpointTouch,
  outgoingEndpoint: RiverEndpointTouch
): boolean {
  const incomingRegion = findRegionTouchingVertexExcept(incomingEndpoint.vertex, regions, region.id);
  const outgoingRegion = findRegionTouchingVertexExcept(outgoingEndpoint.vertex, regions, region.id);
  const incomingRegionHeight = incomingRegion?.heightLevel;
  const outgoingRegionHeight = outgoingRegion?.heightLevel;

  if (outgoingRegionHeight !== undefined && outgoingRegionHeight > region.heightLevel) return false;
  if (incomingRegionHeight !== undefined && region.heightLevel > incomingRegionHeight) return false;

  return true;
}

function getRiverHeightConstraintForCandidateRegion(
  candidateRegion: Region,
  existingRegions: Region[],
  existingRivers: River[],
  candidateHexes: AxialHex[]
): RiverHeightConstraint {
  const riverGraph = buildRiverGraphForRegion(
    candidateRegion.hexes,
    candidateRegion.hexes,
    candidateHexes
  );
  const touchingEndpoints = findRiverEndpointsTouchingRegion(
    candidateRegion,
    existingRivers,
    riverGraph
  );

  let minHeight: RegionHeightLevel | undefined;
  let maxHeight: RegionHeightLevel | undefined;
  const reasons: string[] = [];

  for (const endpoint of touchingEndpoints) {
    const existingRegion = findRegionTouchingVertex(endpoint.vertex, existingRegions);
    const touchingHeight = existingRegion?.heightLevel;
    if (!touchingHeight) continue;

    if (endpoint.endpointType === 'end') {
      maxHeight = Math.min(maxHeight ?? touchingHeight, touchingHeight) as RegionHeightLevel;
      reasons.push(`incoming river ${endpoint.riverId}: new height <= ${touchingHeight}`);
    }

    if (endpoint.endpointType === 'start') {
      minHeight = Math.max(minHeight ?? touchingHeight, touchingHeight) as RegionHeightLevel;
      reasons.push(`outgoing river ${endpoint.riverId}: new height >= ${touchingHeight}`);
    }
  }

  return { minHeight, maxHeight, reasons };
}

function getRegionVertexKeys(regionHexes: AxialHex[]): Set<string> {
  const keys = new Set<string>();
  for (const hex of regionHexes) {
    for (const corner of getHexCornerPoints(hex)) keys.add(corner.key);
  }
  return keys;
}

function trimOutgoingRiverStartAwayFromRegion(river: River, regionHexes: AxialHex[]): River | null {
  const regionVertexKeys = getRegionVertexKeys(regionHexes);
  const trimmedPath = [...river.vertexPath];

  while (trimmedPath.length > 0 && regionVertexKeys.has(trimmedPath[0].key)) {
    trimmedPath.shift();
  }

  if (trimmedPath.length < 2) return null;
  return { ...river, vertexPath: trimmedPath };
}

function getConflictingOutgoingRiverIds(
  touchingEndpoints: RiverEndpointTouch[],
  existingRegions: Region[],
  riverHeightConstraint: RiverHeightConstraint
): number[] {
  if (
    riverHeightConstraint.minHeight === undefined ||
    riverHeightConstraint.maxHeight === undefined ||
    riverHeightConstraint.minHeight <= riverHeightConstraint.maxHeight
  ) return [];

  const maxHeight = riverHeightConstraint.maxHeight;
  return touchingEndpoints
    .filter((endpoint) => endpoint.endpointType === 'start')
    .filter((endpoint) => {
      const touchingRegion = findRegionTouchingVertex(endpoint.vertex, existingRegions);
      return (touchingRegion?.heightLevel ?? 1) > maxHeight;
    })
    .map((endpoint) => endpoint.riverId);
}

function trimConflictingOutgoingRiversAwayFromRegion(
  rivers: River[],
  conflictingOutgoingRiverIds: number[],
  regionHexes: AxialHex[],
  regionId: number
): River[] {
  const conflictingSet = new Set(conflictingOutgoingRiverIds);
  return rivers.flatMap((river) => {
    if (!conflictingSet.has(river.id)) return [river];
    const originalStartVertex = river.vertexPath[0]?.key;
    const originalLength = river.vertexPath.length;
    const trimmedRiver = trimOutgoingRiverStartAwayFromRegion(river, regionHexes);
    console.warn('Trimming outgoing river start away from new region', {
      regionId,
      riverId: river.id,
      originalStartVertex,
      originalLength,
      newStartVertex: trimmedRiver?.vertexPath[0]?.key,
      newLength: trimmedRiver?.vertexPath.length ?? 0,
      removed: trimmedRiver === null,
    });
    return trimmedRiver ? [trimmedRiver] : [];
  });
}

function mergeRiversWithConnector(
  existingRivers: River[],
  upstreamRiverId: number,
  downstreamRiverId: number,
  connectorPath: RiverVertex[],
  connectorFullness?: RiverFullness,
  assignedRegionId?: number,
  connectorSplit?: RiverConnectorSplit
): River[] | null {
  const upstreamRiver = existingRivers.find((river) => river.id === upstreamRiverId);
  const downstreamRiver = existingRivers.find((river) => river.id === downstreamRiverId);
  if (!upstreamRiver || !downstreamRiver) {
    console.warn('Cannot merge rivers: missing river', { upstreamRiverId, downstreamRiverId });
    return null;
  }
  if (wouldCreateRiverDrainageCycle(existingRivers, upstreamRiverId, downstreamRiverId)) {
    console.warn('Cannot merge rivers: connection would create a drainage cycle', { upstreamRiverId, downstreamRiverId });
    return null;
  }
  if (!upstreamRiver.vertexPath?.length || !downstreamRiver.vertexPath?.length || connectorPath.length < 2) {
    console.warn('Cannot merge rivers: invalid path data', { upstreamRiverId, downstreamRiverId });
    return null;
  }
  const connectorMiddle = connectorPath.slice(1, -1);
  const mergedPath = [...upstreamRiver.vertexPath, ...connectorMiddle, ...downstreamRiver.vertexPath];
  const effectiveConnectorFullness = connectorFullness ?? chooseRiverFullnessFromAdjacentSectors(
    connectorPath,
    existingRivers,
    getRiverDownstreamFullness(upstreamRiver),
    getRiverDownstreamFullness(upstreamRiver),
    upstreamRiver.id
  );
  const splitIndex = connectorSplit
    ? connectorPath.findIndex((vertex) => vertex.key === connectorSplit.vertex.key)
    : -1;
  const rawConnectorSectors = connectorSplit && splitIndex >= 0
    ? [
      ...(splitIndex > 0
        ? createInitialRiverSectors(
          upstreamRiver.id,
          connectorPath.slice(0, splitIndex + 1),
          connectorSplit.upstreamFullness,
          { startReason: 'region_boundary', endReason: 'split' },
          assignedRegionId
        )
        : []),
      ...(splitIndex < connectorPath.length - 1
        ? createInitialRiverSectors(
          upstreamRiver.id,
          connectorPath.slice(splitIndex),
          connectorSplit.downstreamFullness,
          { startReason: 'split', endReason: 'region_boundary' },
          assignedRegionId
        )
        : [])
    ]
    : createInitialRiverSectors(
      upstreamRiver.id,
      connectorPath,
      effectiveConnectorFullness,
      { startReason: 'region_boundary', endReason: 'region_boundary' },
      assignedRegionId
    );
  const connectorSectors = withRiverSectorOrder(
    upstreamRiver.id,
    rawConnectorSectors,
    getMaxRiverSectorIndex(upstreamRiver) + 1
  ).map((sector) => ({ ...sector, id: `${upstreamRiver.id}:connector:sector:${sector.sectorIndex}` }));
  const mergedRiver: River = {
    ...upstreamRiver,
    vertexPath: mergedPath,
    sectors: [
      ...(upstreamRiver.sectors ?? []),
      ...connectorSectors,
      ...(downstreamRiver.sectors ?? [])
    ]
  };

  return existingRivers
    .filter((river) => river.id !== downstreamRiverId)
    .map((river) => (river.id === upstreamRiverId ? mergedRiver : river));
}


function getNextLakeIdFromTerrain(terrainMap: Map<string, HexTerrainData>): number {
  return Math.max(0, ...Array.from(terrainMap.values()).map((terrain) => terrain.lakeId ?? 0)) + 1;
}


function mergeAdjacentLakeIds(terrainMap: Map<string, HexTerrainData>): void {
  const lakeKeys = Array.from(terrainMap.entries())
    .filter(([, terrain]) => terrain.terrainOverride === 'lake' && terrain.lakeId !== undefined)
    .map(([key]) => key);
  if (lakeKeys.length < 2) return;

  const parent = new Map<number, number>();
  const find = (lakeId: number): number => {
    const currentParent = parent.get(lakeId) ?? lakeId;
    if (currentParent === lakeId) {
      parent.set(lakeId, lakeId);
      return lakeId;
    }
    const root = find(currentParent);
    parent.set(lakeId, root);
    return root;
  };
  const union = (leftLakeId: number, rightLakeId: number): void => {
    const leftRoot = find(leftLakeId);
    const rightRoot = find(rightLakeId);
    if (leftRoot === rightRoot) return;
    const mergedRoot = Math.min(leftRoot, rightRoot);
    const mergedChild = Math.max(leftRoot, rightRoot);
    parent.set(mergedChild, mergedRoot);
    parent.set(mergedRoot, mergedRoot);
  };

  for (const key of lakeKeys) {
    const terrain = terrainMap.get(key);
    if (terrain?.terrainOverride !== 'lake' || terrain.lakeId === undefined) continue;
    find(terrain.lakeId);

    for (const neighbor of getHexNeighbors(parseHexKey(key))) {
      const neighborTerrain = terrainMap.get(hexKey(neighbor));
      if (neighborTerrain?.terrainOverride !== 'lake' || neighborTerrain.lakeId === undefined) continue;
      union(terrain.lakeId, neighborTerrain.lakeId);
    }
  }

  for (const key of lakeKeys) {
    const terrain = terrainMap.get(key);
    if (terrain?.terrainOverride !== 'lake' || terrain.lakeId === undefined) continue;
    const mergedLakeId = find(terrain.lakeId);
    if (terrain.lakeId !== mergedLakeId) terrainMap.set(key, { ...terrain, lakeId: mergedLakeId });
  }
}

function getHexCenterDistanceToVertex(hex: AxialHex, vertex: RiverVertex): number {
  const center = toPixel(hex.q, hex.r);
  const dx = center.x - vertex.x;
  const dy = center.y - vertex.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function addLakeAroundRiverSplitVertex(
  region: Region,
  splitVertex: RiverVertex,
  lakeHexCount: number,
  terrainMap: Map<string, HexTerrainData>
): { lakeId: number; hexes: AxialHex[] } | null {
  const targetHexCount = Math.max(1, lakeHexCount);
  const availableRegionHexes = region.hexes.filter((hex) => !isLakeHex(hex, terrainMap));
  if (availableRegionHexes.length === 0) return null;

  const lakeId = getNextLakeIdFromTerrain(terrainMap);
  const splitVertexTouchingHexes = availableRegionHexes.filter((hex) => getHexCornerPoints(hex).some((corner) => corner.key === splitVertex.key));
  const seedHexes = splitVertexTouchingHexes.length > 0 ? splitVertexTouchingHexes : availableRegionHexes;
  const seedHex = randomFrom(seedHexes);
  const regionHexByKey = new Map(availableRegionHexes.map((hex) => [hexKey(hex), hex]));
  const selectedKeys = new Set<string>([hexKey(seedHex)]);

  while (selectedKeys.size < targetHexCount && selectedKeys.size < availableRegionHexes.length) {
    const frontier = Array.from(selectedKeys)
      .flatMap((key) => getHexNeighbors(regionHexByKey.get(key) ?? seedHex))
      .filter((hex) => regionHexByKey.has(hexKey(hex)) && !selectedKeys.has(hexKey(hex)))
      .sort((left, right) => getHexCenterDistanceToVertex(left, splitVertex) - getHexCenterDistanceToVertex(right, splitVertex));

    const nextHex = frontier[0]
      ?? availableRegionHexes
        .filter((hex) => !selectedKeys.has(hexKey(hex)))
        .sort((left, right) => getHexCenterDistanceToVertex(left, splitVertex) - getHexCenterDistanceToVertex(right, splitVertex))[0];
    if (!nextHex) break;
    selectedKeys.add(hexKey(nextHex));
  }

  const lakeHexes = Array.from(selectedKeys)
    .map((key) => regionHexByKey.get(key))
    .filter((hex): hex is AxialHex => Boolean(hex));
  for (const hex of lakeHexes) {
    terrainMap.set(hexKey(hex), { terrainOverride: 'lake', lakeId });
  }

  console.log('Created river fullness drop lake', {
    regionId: region.id,
    lakeId,
    requestedLakeHexCount: targetHexCount,
    actualLakeHexCount: lakeHexes.length,
    splitVertexKey: splitVertex.key,
  });

  return { lakeId, hexes: lakeHexes };
}


function riverTouchesCenterHexArea(river: River, centerHex: AxialHex, riverGraph: RiverGraph): boolean {
  return riverPathTouchesCenterHex(river.vertexPath, centerHex, riverGraph)
    || riverPathTouchesCenterHexVertex(river.vertexPath, centerHex);
}

function ensureCentralAdjacentLakeWhenNoRiverTouchesCenter(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[]
): void {
  if (!region.centerHex) return;
  const regionHexKeys = new Set(region.hexes.map(hexKey));
  const hasRiverNearCenter = rivers
    .filter((river) => getRiversForRegion(region, [river]).length > 0)
    .some((river) => riverTouchesCenterHexArea(river, region.centerHex, riverGraph));
  if (hasRiverNearCenter) return;

  const lakeHex = getHexNeighbors(region.centerHex)
    .filter((hex) => regionHexKeys.has(hexKey(hex)))
    .find((hex) => !isLakeHex(hex, terrainMap));
  if (!lakeHex) return;

  const lakeId = getNextLakeIdFromTerrain(terrainMap);
  terrainMap.set(hexKey(lakeHex), { terrainOverride: 'lake', lakeId });
  console.log('Created central fallback lake because no river touches central hex', {
    regionId: region.id,
    lakeId,
    centerHexKey: hexKey(region.centerHex),
    lakeHexKey: hexKey(lakeHex),
  });
}

function getRiverById(rivers: River[], riverId: number): River | undefined {
  return rivers.find((river) => river.id === riverId);
}

function getEndpointFullnessForRiver(rivers: River[], riverId: number, vertexKey: string): RiverFullness | null {
  const river = getRiverById(rivers, riverId);
  return river ? getRiverEndpointSectorFullness(river, vertexKey) : null;
}

function buildConnectorSplitForFullnessDrop(
  existingRivers: River[],
  upstreamRiverId: number,
  upstreamVertex: RiverVertex,
  downstreamRiverId: number,
  downstreamVertex: RiverVertex,
  connectorPath: RiverVertex[]
): RiverConnectorSplit | null | undefined {
  const upstreamFullness = getEndpointFullnessForRiver(existingRivers, upstreamRiverId, upstreamVertex.key);
  const downstreamFullness = getEndpointFullnessForRiver(existingRivers, downstreamRiverId, downstreamVertex.key);
  if (upstreamFullness === null || downstreamFullness === null) return undefined;
  if (upstreamFullness <= downstreamFullness) return undefined;

  const splitCandidateVertices = connectorPath;
  if (splitCandidateVertices.length === 0) return null;

  return {
    vertex: randomFrom(splitCandidateVertices),
    upstreamFullness,
    downstreamFullness
  };
}

function addConnectorSplitLakeIfNeeded(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  connectorSplit?: RiverConnectorSplit
): void {
  if (!connectorSplit) return;
  addLakeAroundRiverSplitVertex(
    region,
    connectorSplit.vertex,
    connectorSplit.upstreamFullness - connectorSplit.downstreamFullness,
    terrainMap
  );
}


function connectIncomingTributariesToMainPath(
  region: Region,
  rivers: River[],
  tributaryEndpoints: RiverEndpointTouch[],
  mainPath: RiverVertex[],
  riverGraph: RiverGraph,
  initialBlockedEdgeKeys: Set<string>,
  initialOccupiedVertexKeys: Set<string>
): River[] | null {
  if (tributaryEndpoints.length === 0) return rivers;

  const tributaryTargetVertices = mainPath.slice(1, -1);
  if (tributaryTargetVertices.length === 0) return null;

  let nextRivers = rivers;
  const blockedEdgeKeys = new Set(initialBlockedEdgeKeys);
  const occupiedVertexKeys = new Set(initialOccupiedVertexKeys);
  const allowedTargetKeys = new Set(tributaryTargetVertices.map((vertex) => vertex.key));

  for (const endpoint of tributaryEndpoints) {
    const tributaryPath = findBestFreeRiverPathToAnyTarget(
      endpoint.vertex,
      tributaryTargetVertices,
      riverGraph,
      blockedEdgeKeys,
      new Set([mainPath[0]?.key, mainPath[mainPath.length - 1]?.key].filter((key): key is string => Boolean(key))),
      occupiedVertexKeys,
      new Set([endpoint.vertex.key, ...allowedTargetKeys])
    );
    if (!tributaryPath) {
      console.warn('Could not connect incoming tributary to through river', {
        regionId: region.id,
        tributaryRiverId: endpoint.riverId,
      });
      return null;
    }

    const tributaryPathEdgeKeys = getRiverPathEdgeKeys(tributaryPath, riverGraph);
    if (!tributaryPathEdgeKeys) return null;
    for (const edgeKey of tributaryPathEdgeKeys) blockedEdgeKeys.add(edgeKey);
    for (const vertex of tributaryPath.slice(1, -1)) occupiedVertexKeys.add(vertex.key);

    nextRivers = nextRivers.map((river) => river.id !== endpoint.riverId
      ? river
      : {
        ...river,
        vertexPath: [...river.vertexPath, ...tributaryPath.slice(1)],
        sectors: appendRiverPathSector(river, tributaryPath, getRiverDownstreamFullness(river), region.id)
      });
  }

  return nextRivers;
}

function chooseRandomRiverControlPoints(
  redVertices: RiverVertex[],
  purpleVertices: RiverVertex[],
  existingRiverEndpointVerticesInRegion: RiverVertex[],
  preferredStartVertex?: RiverVertex,
  preferredEndVertices: RiverVertex[] = []
): { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex; startMode: 'existing river endpoint' | 'red vertex' } | null {
  const choosePreferredEndVertex = (endPool: RiverVertex[], startVertex: RiverVertex): RiverVertex => {
    const preferredEndKeys = new Set(preferredEndVertices.map((vertex) => vertex.key));
    const preferredPool = endPool.filter((vertex) => preferredEndKeys.has(vertex.key));
    if (preferredPool.length > 0) return randomFrom(preferredPool);
    const maxDistance = Math.max(...endPool.map((vertex) => getRiverVertexDistance(startVertex, vertex)));
    const farthestVertices = endPool.filter(
      (vertex) => Math.abs(getRiverVertexDistance(startVertex, vertex) - maxDistance) < 0.001
    );
    return randomFrom(farthestVertices);
  };

  if (existingRiverEndpointVerticesInRegion.length > 0) {
    if (redVertices.length < 1) return null;
    const startVertex = randomFrom(existingRiverEndpointVerticesInRegion);
    const endPool = redVertices.filter((vertex) => vertex.key !== startVertex.key);
    if (endPool.length === 0) return null;
    const endVertex = choosePreferredEndVertex(endPool, startVertex);
    if (purpleVertices.length === 0) return { startVertex, endVertex, startMode: 'existing river endpoint' };
    const preferredMiddle = purpleVertices.filter((vertex) => vertex.key !== startVertex.key && vertex.key !== endVertex.key);
    const middlePool = preferredMiddle.length > 0 ? preferredMiddle : purpleVertices;
    return { startVertex, middlePurpleVertex: randomFrom(middlePool), endVertex, startMode: 'existing river endpoint' };
  }
  if (redVertices.length < 2) return null;
  const startVertex = preferredStartVertex && redVertices.some((vertex) => vertex.key === preferredStartVertex.key)
    ? preferredStartVertex
    : randomFrom(redVertices);
  const candidateEndVertices = redVertices.filter((vertex) => vertex.key !== startVertex.key);
  if (candidateEndVertices.length === 0) return null;
  const endVertex = choosePreferredEndVertex(candidateEndVertices, startVertex);
  console.log('River red endpoint selection', {
    mode: preferredEndVertices.some((vertex) => vertex.key === endVertex.key) ? 'preferred_coastal_endpoint' : 'farthest_red_vertex',
    startVertexKey: startVertex.key,
    endVertexKey: endVertex.key,
    distance: getRiverVertexDistance(startVertex, endVertex),
    redVertexCount: redVertices.length
  });
  if (purpleVertices.length === 0) return { startVertex, endVertex, startMode: 'red vertex' };
  const preferredMiddle = purpleVertices.filter(
    (vertex) => vertex.key !== startVertex.key && vertex.key !== endVertex.key
  );
  const middlePool = preferredMiddle.length > 0 ? preferredMiddle : purpleVertices;
  const middlePurpleVertex = randomFrom(middlePool);
  return { startVertex, middlePurpleVertex, endVertex, startMode: 'red vertex' };
}


function uniqueHexes(hexes: AxialHex[]): AxialHex[] {
  const unique = new Map<string, AxialHex>();
  for (const hex of hexes) unique.set(hexKey(hex), hex);
  return Array.from(unique.values());
}

function getAdjacentSeaHexesForRegion(
  regionHexes: AxialHex[],
  hexTerrainByKey: Map<string, HexTerrainData>
): AxialHex[] {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const seaHexes = new Map<string, AxialHex>();
  for (const hex of regionHexes) {
    for (const neighbor of getHexNeighbors(hex)) {
      const key = hexKey(neighbor);
      if (regionKeys.has(key)) continue;
      if (hexTerrainByKey.get(key)?.terrainOverride === 'sea') seaHexes.set(key, neighbor);
    }
  }
  return Array.from(seaHexes.values());
}

function getCandidateHexesNearestToSea(
  candidateHexes: AxialHex[],
  hexTerrainByKey: Map<string, HexTerrainData>
): AxialHex[] {
  if (candidateHexes.length === 0) return [];
  const seaHexes = Array.from(getSeaHexKeys(hexTerrainByKey)).map(parseHexKey);
  if (seaHexes.length === 0) return candidateHexes;
  const distanceToNearestSea = (candidate: AxialHex): number => Math.min(
    ...seaHexes.map((seaHex) => hexDistance(candidate, seaHex))
  );
  const minDistance = Math.min(...candidateHexes.map(distanceToNearestSea));
  return candidateHexes.filter((candidate) => distanceToNearestSea(candidate) === minDistance);
}

function getCoastalRiverEndpointHexes(
  region: Region,
  candidateHexes: AxialHex[],
  hexTerrainByKey: Map<string, HexTerrainData>
): AxialHex[] {
  if (!region.isCoastal) return [];
  const adjacentSeaHexes = getAdjacentSeaHexesForRegion(region.hexes, hexTerrainByKey);
  if (adjacentSeaHexes.length > 0) return adjacentSeaHexes;
  return getCandidateHexesNearestToSea(candidateHexes, hexTerrainByKey);
}

function orderRedRiverStartVerticesBySeaDistance(
  redVertices: RiverVertex[],
  hexTerrainByKey: Map<string, HexTerrainData>
): RiverVertex[] {
  const seaHexes = Array.from(getSeaHexKeys(hexTerrainByKey)).map(parseHexKey);
  if (seaHexes.length === 0) return redVertices;

  const distanceToSea = (vertex: RiverVertex): number => Math.min(
    ...seaHexes.map((seaHex) => Math.min(
      ...getHexCornerPoints(seaHex).map((corner) => getRiverVertexDistance(vertex, corner))
    ))
  );

  return [...redVertices].sort((a, b) => distanceToSea(b) - distanceToSea(a));
}

function buildRiverPathViaControlPoints(
  controlPoints: { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex },
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string> = new Set()
): RiverVertex[] {
  const startNode = riverGraph.nodes.get(controlPoints.startVertex.key);
  const endNode = riverGraph.nodes.get(controlPoints.endVertex.key);
  if (!startNode || !endNode) return [];
  if (!controlPoints.middlePurpleVertex) {
    return findRiverPath(startNode, endNode, riverGraph, blockedEdgeKeys).map((node) => ({ key: node.key, x: node.x, y: node.y }));
  }
  const middleNode = riverGraph.nodes.get(controlPoints.middlePurpleVertex.key);
  if (!middleNode) return [];
  const path1 = findRiverPath(startNode, middleNode, riverGraph, blockedEdgeKeys);
  const path2 = findRiverPath(middleNode, endNode, riverGraph, blockedEdgeKeys);
  if (path1.length < 1 || path2.length < 1) return [];
  const joined = [...path1, ...path2.slice(1)];
  return joined.map((node) => ({ key: node.key, x: node.x, y: node.y }));
}

function findBestConnectorPathBetweenRiverEndpoints(
  startVertex: RiverVertex,
  endVertex: RiverVertex,
  middleVertices: RiverVertex[],
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string>,
  occupiedVertexKeys: Set<string>
): RiverVertex[] | null {
  const allowedOccupiedVertexKeys = new Set([startVertex.key, endVertex.key]);
  const candidates: RiverVertex[][] = [
    buildRiverPathViaControlPoints({ startVertex, endVertex }, riverGraph, blockedEdgeKeys),
    ...middleVertices
      .filter((middlePurpleVertex) => middlePurpleVertex.key !== startVertex.key && middlePurpleVertex.key !== endVertex.key)
      .map((middlePurpleVertex) => buildRiverPathViaControlPoints({ startVertex, middlePurpleVertex, endVertex }, riverGraph, blockedEdgeKeys))
  ];

  let bestPath: RiverVertex[] | null = null;
  for (const path of candidates) {
    if (path.length < 2) continue;
    if (path[0].key !== startVertex.key || path[path.length - 1].key !== endVertex.key) continue;
    if (new Set(path.map((vertex) => vertex.key)).size !== path.length) continue;
    const pathEdgeKeys = getRiverPathEdgeKeys(path, riverGraph);
    if (!pathEdgeKeys) continue;
    if (pathEdgeKeys.some((pathEdgeKey) => blockedEdgeKeys.has(pathEdgeKey))) continue;
    if (!riverPathAvoidsOccupiedVertices(path, occupiedVertexKeys, allowedOccupiedVertexKeys)) continue;
    if (!bestPath || path.length < bestPath.length) bestPath = path;
  }

  return bestPath;
}

function findBestFreeRiverPathFromEndpoints(
  existingRiverEndpointVerticesInRegion: RiverVertex[],
  redVertices: RiverVertex[],
  purpleVertices: RiverVertex[],
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string>,
  centerHex: AxialHex | undefined,
  occupiedVertexKeys: Set<string> = new Set(),
  preferredEndVertices: RiverVertex[] = []
): { controlPoints: { startVertex: RiverVertex; middlePurpleVertex: RiverVertex; endVertex: RiverVertex; startMode: 'existing river endpoint' }; path: RiverVertex[] } | null {
  if (purpleVertices.length === 0) return null;
  let bestTouchingCenter: { controlPoints: { startVertex: RiverVertex; middlePurpleVertex: RiverVertex; endVertex: RiverVertex; startMode: 'existing river endpoint' }; path: RiverVertex[] } | null = null;
  let bestFallback: { controlPoints: { startVertex: RiverVertex; middlePurpleVertex: RiverVertex; endVertex: RiverVertex; startMode: 'existing river endpoint' }; path: RiverVertex[] } | null = null;
  const preferredEndKeys = new Set(preferredEndVertices.map((vertex) => vertex.key));
  const endVertices = preferredEndKeys.size > 0
    ? redVertices.filter((vertex) => preferredEndKeys.has(vertex.key))
    : redVertices;
  if (endVertices.length === 0) return null;

  for (const endpoint of existingRiverEndpointVerticesInRegion) {
    for (const redVertex of endVertices) {
      if (redVertex.key === endpoint.key) continue;
      for (const middlePurpleVertex of purpleVertices) {
        const controlPoints = { startVertex: endpoint, middlePurpleVertex, endVertex: redVertex, startMode: 'existing river endpoint' as const };
        const path = buildRiverPathViaControlPoints(controlPoints, riverGraph, blockedEdgeKeys);
        if (path.length < 2) continue;
        if (!validateRiverPathViaControlPoints(
          path,
          controlPoints,
          riverGraph,
          redVertices,
          existingRiverEndpointVerticesInRegion,
          blockedEdgeKeys,
          occupiedVertexKeys,
          new Set([endpoint.key])
        )) continue;
        const touchesCenter = riverPathTouchesCenterHex(path, centerHex, riverGraph);
        if (touchesCenter) {
          if (!bestTouchingCenter || path.length < bestTouchingCenter.path.length) {
            bestTouchingCenter = { controlPoints, path };
          }
        } else if (!bestFallback || path.length < bestFallback.path.length) {
          bestFallback = { controlPoints, path };
        }
      }
    }
  }

  return bestTouchingCenter ?? bestFallback;
}

function riverPathAvoidsOccupiedVertices(
  vertexPath: RiverVertex[],
  occupiedVertexKeys: Set<string>,
  allowedOccupiedVertexKeys: Set<string> = new Set()
): boolean {
  return vertexPath.every((vertex) => !occupiedVertexKeys.has(vertex.key) || allowedOccupiedVertexKeys.has(vertex.key));
}

function validateRiverPathViaControlPoints(
  vertexPath: RiverVertex[],
  controlPoints: { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex; startMode: RiverStartMode },
  riverGraph: RiverGraph,
  redVertices: RiverVertex[],
  existingRiverEndpointVerticesInRegion: RiverVertex[],
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string> = new Set(),
  allowedOccupiedVertexKeys: Set<string> = new Set()
): boolean {
  if (!vertexPath || vertexPath.length < 2) return false;
  const redSet = new Set(redVertices.map((vertex) => vertex.key));
  const endpointSet = new Set(existingRiverEndpointVerticesInRegion.map((vertex) => vertex.key));
  const hasCandidateBoundary = Array.from(riverGraph.nodes.values()).some((node) => node.isCandidateBoundaryVertex);
  const isValidOutgoingBoundaryVertex = (vertex: RiverVertex): boolean => {
    const node = riverGraph.nodes.get(vertex.key);
    if (!node?.isRegionBoundaryVertex) return false;
    if (hasCandidateBoundary && !node.isCandidateBoundaryVertex) return false;
    return true;
  };
  if (vertexPath[0].key !== controlPoints.startVertex.key) return false;
  if (vertexPath[vertexPath.length - 1].key !== controlPoints.endVertex.key) return false;
  if (!redSet.has(controlPoints.endVertex.key)) return false;
  if (!isValidOutgoingBoundaryVertex(controlPoints.endVertex)) return false;
  if (controlPoints.startMode === 'red vertex' && !redSet.has(controlPoints.startVertex.key)) return false;
  if (controlPoints.startMode === 'red vertex' && !isValidOutgoingBoundaryVertex(controlPoints.startVertex)) return false;
  if (controlPoints.startMode === 'mountain source' && redSet.has(controlPoints.startVertex.key)) return false;
  if (controlPoints.startMode === 'existing river endpoint' && !endpointSet.has(controlPoints.startVertex.key)) return false;
  if (controlPoints.middlePurpleVertex && !vertexPath.some((vertex) => vertex.key === controlPoints.middlePurpleVertex?.key)) return false;
  if (new Set(vertexPath.map((vertex) => vertex.key)).size !== vertexPath.length) return false;
  const riverPathEdgeKeys = getRiverPathEdgeKeys(vertexPath, riverGraph);
  if (!riverPathEdgeKeys) return false;
  const firstEdge = riverGraph.edges.get(edgeKey(vertexPath[0], vertexPath[1]));
  const lastEdge = riverGraph.edges.get(edgeKey(vertexPath[vertexPath.length - 2], vertexPath[vertexPath.length - 1]));
  if (controlPoints.startMode === 'red vertex' && !firstEdge?.isRegionBoundaryEdge) return false;
  if (!lastEdge?.isRegionBoundaryEdge) return false;
  if (hasCandidateBoundary && controlPoints.startMode === 'red vertex' && !firstEdge?.isCandidateBoundaryEdge) return false;
  if (hasCandidateBoundary && !lastEdge?.isCandidateBoundaryEdge) return false;
  if (hasDuplicateEdgeKeys(riverPathEdgeKeys)) return false;
  if (riverPathEdgeKeys.some((pathEdgeKey) => usedRiverEdges.has(pathEdgeKey))) return false;
  if (!riverPathAvoidsOccupiedVertices(vertexPath, occupiedVertexKeys, allowedOccupiedVertexKeys)) return false;
  return true;
}

function getExistingRiverEndpointVerticesInRegion(region: Region, rivers: River[], riverGraph: RiverGraph): RiverVertex[] {
  void region;
  const endpointKeys = new Set<string>();
  for (const river of rivers) {
    if (!river.vertexPath || river.vertexPath.length < 1) continue;
    const firstVertex = river.vertexPath[0];
    const lastVertex = river.vertexPath[river.vertexPath.length - 1];
    if (firstVertex) endpointKeys.add(firstVertex.key);
    if (lastVertex) endpointKeys.add(lastVertex.key);
  }
  const vertices: RiverVertex[] = [];
  for (const node of riverGraph.nodes.values()) {
    if (!endpointKeys.has(node.key)) continue;
    if (!node.isRegionBoundaryVertex) continue;
    vertices.push({ key: node.key, x: node.x, y: node.y });
  }
  return vertices;
}

function getHexNeighbor(hex: AxialHex, direction: number): AxialHex | undefined {
  const delta = NEIGHBOR_DIRECTIONS[direction];
  if (!delta) return undefined;
  return { q: hex.q + delta.q, r: hex.r + delta.r };
}

function getHexEdgeNeighbor(hex: AxialHex, edgeIndex: number): AxialHex | undefined {
  const delta = HEX_EDGE_DIRECTIONS[edgeIndex];
  if (!delta) return undefined;
  return { q: hex.q + delta.q, r: hex.r + delta.r };
}

function getHexEdgeForDirection(hex: AxialHex, direction: number): HexEdge | undefined {
  if (direction < 0 || direction >= HEX_EDGE_DIRECTIONS.length) return undefined;
  return getHexEdgesAsVertexPairs(hex)[direction];
}

function getCandidateBoundaryEdgesForRegion(regionHexes: AxialHex[] = [], candidateHexes: AxialHex[] = []): HexEdge[] {
  if (regionHexes.length === 0 || candidateHexes.length === 0) return [];
  const regionSet = new Set(regionHexes.map(hexKey));
  const candidateSet = new Set(candidateHexes.map(hexKey));
  const edges = new Map<string, HexEdge>();
  for (const hex of regionHexes) {
    for (let direction = 0; direction < 6; direction += 1) {
      const neighbor = getHexEdgeNeighbor(hex, direction);
      if (!neighbor) continue;
      const neighborKey = hexKey(neighbor);
      if (regionSet.has(neighborKey)) continue;
      if (!candidateSet.has(neighborKey)) continue;
      const edge = getHexEdgeForDirection(hex, direction);
      if (!edge) continue;
      edges.set(edge.edgeKey, edge);
    }
  }
  return Array.from(edges.values());
}

function getCandidateBoundaryVerticesForRegion(regionHexes: AxialHex[] = [], candidateHexes: AxialHex[] = []): RiverVertex[] {
  const vertices = new Map<string, RiverVertex>();
  for (const edge of getCandidateBoundaryEdgesForRegion(regionHexes, candidateHexes)) {
    vertices.set(edge.from.key, edge.from);
    vertices.set(edge.to.key, edge.to);
  }
  return Array.from(vertices.values());
}

function validateCandidateBoundaryVertices(
  regionHexes: AxialHex[] = [],
  candidateHexes: AxialHex[] = [],
  candidateBoundaryVertices: RiverVertex[] = []
): RiverVertex[] {
  if (regionHexes.length === 0 || candidateHexes.length === 0 || candidateBoundaryVertices.length === 0) return [];
  const validVertexKeys = new Set<string>();
  for (const edge of getCandidateBoundaryEdgesForRegion(regionHexes, candidateHexes)) {
    validVertexKeys.add(edge.from.key);
    validVertexKeys.add(edge.to.key);
  }
  return candidateBoundaryVertices.filter((vertex) => !validVertexKeys.has(vertex.key));
}

export function rollRegionTargetSize(): number {
  const roll = randomInt(1, 100);
  if (roll <= 5) return randomInt(5, 10);
  if (roll <= 40) return randomInt(11, 20);
  if (roll <= 65) return randomInt(21, 30);
  if (roll <= 83) return randomInt(31, 40);
  if (roll <= 95) return randomInt(41, 50);
  return randomInt(51, 60);
}

export function getRegionSizeCategory(size: number): Pick<Region, 'sizeCategory' | 'sizeLabel'> {
  if (size >= 5 && size <= 10) return { sizeCategory: 'locality', sizeLabel: 'Местность' };
  if (size >= 11 && size <= 20) return { sizeCategory: 'small_region', sizeLabel: 'Малый регион' };
  if (size >= 21 && size <= 30) return { sizeCategory: 'region', sizeLabel: 'Регион' };
  if (size >= 31 && size <= 40) return { sizeCategory: 'large_region', sizeLabel: 'Большой регион' };
  if (size >= 41 && size <= 50) return { sizeCategory: 'land', sizeLabel: 'Край' };
  return { sizeCategory: 'vast_land', sizeLabel: 'Обширный край' };
}

export function getRegionSizeDisplay(region: Partial<Region> & { hexes?: AxialHex[] }, language: Language = 'ru'): string {
  const size = region.finalSize ?? region.hexes?.length ?? region.targetSize ?? 0;
  const { sizeCategory, sizeLabel } = getRegionSizeCategory(size);
  return `${language === 'en' ? SIZE_LABELS.en[sizeCategory] : sizeLabel} (${size})`;
}

export function getHexNeighbors(hex: AxialHex): AxialHex[] {
  return NEIGHBOR_DIRECTIONS.map((direction) => ({ q: hex.q + direction.q, r: hex.r + direction.r }));
}

function hexDistance(a: AxialHex, b: AxialHex): number {
  const x1 = a.q;
  const z1 = a.r;
  const y1 = -x1 - z1;
  const x2 = b.q;
  const z2 = b.r;
  const y2 = -x2 - z2;
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}

type RiverGraphNode = {
  key: string;
  x: number;
  y: number;
  incidentEdgeKeys: string[];
  regionIncidentEdgeKeys: string[];
  boundaryIncidentEdgeKeys: string[];
  candidateBoundaryIncidentEdgeKeys: string[];
  isInsideRegion: boolean;
  isRegionBoundaryVertex: boolean;
  isCandidateBoundaryVertex: boolean;
};

type RiverGraphEdge = {
  key: string;
  a: RiverGraphNode;
  b: RiverGraphNode;
  hexA?: AxialHex;
  hexB?: AxialHex;
  touchesRegion: boolean;
  isInsideRegionEdge: boolean;
  isRegionBoundaryEdge: boolean;
  isCandidateBoundaryEdge: boolean;
};

type RiverGraph = {
  nodes: Map<string, RiverGraphNode>;
  edges: Map<string, RiverGraphEdge>;
};

type RiverEndpointIssue =
  | 'start_not_region_boundary'
  | 'end_not_region_boundary'
  | 'start_not_candidate_boundary_when_candidates_exist'
  | 'end_not_candidate_boundary_when_candidates_exist'
  | 'first_edge_not_boundary'
  | 'last_edge_not_boundary'
  | 'first_edge_not_candidate_boundary_when_candidates_exist'
  | 'last_edge_not_candidate_boundary_when_candidates_exist'
  | 'path_too_short'
  | 'segment_not_in_graph';

function edgeKey(a: RiverVertex, b: RiverVertex): string {
  return [a.key, b.key].sort().join('|');
}

function buildRiverGraphForRegion(regionHexes: AxialHex[], allHexes: AxialHex[], candidateHexes: AxialHex[] = []): RiverGraph {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const allHexSet = new Set(allHexes.map(hexKey));
  const candidateBoundaryEdgeKeys = new Set(
    getCandidateBoundaryEdgesForRegion(regionHexes, candidateHexes).map((edge) => edge.edgeKey)
  );
  const nodes = new Map<string, RiverGraphNode>();
  const edges = new Map<string, RiverGraphEdge>();

  for (const hex of regionHexes) {
    for (const edge of getHexEdgesAsVertexPairs(hex)) {
      if (!nodes.has(edge.from.key)) {
        nodes.set(edge.from.key, {
          key: edge.from.key,
          x: edge.from.x,
          y: edge.from.y,
          incidentEdgeKeys: [],
          regionIncidentEdgeKeys: [],
          boundaryIncidentEdgeKeys: [],
          candidateBoundaryIncidentEdgeKeys: [],
          isInsideRegion: true,
          isRegionBoundaryVertex: false,
          isCandidateBoundaryVertex: false
        });
      }
      if (!nodes.has(edge.to.key)) {
        nodes.set(edge.to.key, {
          key: edge.to.key,
          x: edge.to.x,
          y: edge.to.y,
          incidentEdgeKeys: [],
          regionIncidentEdgeKeys: [],
          boundaryIncidentEdgeKeys: [],
          candidateBoundaryIncidentEdgeKeys: [],
          isInsideRegion: true,
          isRegionBoundaryVertex: false,
          isCandidateBoundaryVertex: false
        });
      }
      if (edges.has(edge.edgeKey)) continue;
      const hasRegionNeighbor = regionKeys.has(hexKey(edge.neighborHex));
      const isInsideRegionEdge = hasRegionNeighbor;
      const isRegionBoundaryEdge = !hasRegionNeighbor;
      const isCandidateBoundaryEdge = candidateBoundaryEdgeKeys.has(edge.edgeKey);
      const touchesRegion = true;
      edges.set(edge.edgeKey, {
        key: edge.edgeKey,
        a: nodes.get(edge.from.key)!,
        b: nodes.get(edge.to.key)!,
        hexA: hex,
        hexB: allHexSet.has(hexKey(edge.neighborHex)) ? edge.neighborHex : undefined,
        touchesRegion,
        isInsideRegionEdge,
        isRegionBoundaryEdge,
        isCandidateBoundaryEdge
      });
    }
  }

  for (const edge of edges.values()) {
    for (const node of [edge.a, edge.b]) {
      node.incidentEdgeKeys.push(edge.key);
      node.regionIncidentEdgeKeys.push(edge.key);
      if (edge.isRegionBoundaryEdge) {
        node.boundaryIncidentEdgeKeys.push(edge.key);
        node.isRegionBoundaryVertex = true;
      }
      if (edge.isCandidateBoundaryEdge) {
        node.candidateBoundaryIncidentEdgeKeys.push(edge.key);
        node.isCandidateBoundaryVertex = true;
      }
    }
  }

  return { nodes, edges };
}

function findRiverPath(
  startNode: RiverGraphNode,
  endNode: RiverGraphNode,
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string> = new Set()
): RiverGraphNode[] {
  const previous = new Map<string, string>();
  const queue: string[] = [startNode.key];
  const visited = new Set<string>([startNode.key]);
  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    if (currentKey === endNode.key) break;
    const currentNode = riverGraph.nodes.get(currentKey);
    if (!currentNode) continue;
    for (const edgeKey of currentNode.incidentEdgeKeys) {
      if (blockedEdgeKeys.has(edgeKey)) continue;
      const edge = riverGraph.edges.get(edgeKey);
      if (!edge?.touchesRegion) continue;
      const nextKey = edge.a.key === currentKey ? edge.b.key : edge.a.key;
      if (visited.has(nextKey)) continue;
      visited.add(nextKey);
      previous.set(nextKey, currentKey);
      queue.push(nextKey);
    }
  }
  if (!visited.has(endNode.key)) return [];
  const path: RiverGraphNode[] = [];
  let currentKey: string | undefined = endNode.key;
  while (currentKey) {
    const node = riverGraph.nodes.get(currentKey);
    if (!node) return [];
    path.push(node);
    if (currentKey === startNode.key) break;
    currentKey = previous.get(currentKey);
  }
  return path.reverse();
}

function findBestFreeRiverPathToAnyTarget(
  startVertex: RiverVertex,
  targetVertices: RiverVertex[],
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string>,
  excludedTargetVertexKeys: Set<string> = new Set(),
  occupiedVertexKeys: Set<string> = new Set(),
  allowedOccupiedVertexKeys: Set<string> = new Set()
): RiverVertex[] | null {
  const startNode = riverGraph.nodes.get(startVertex.key);
  if (!startNode || targetVertices.length === 0) return null;

  let bestPath: RiverVertex[] | null = null;
  for (const targetVertex of targetVertices) {
    if (excludedTargetVertexKeys.has(targetVertex.key)) continue;
    const targetNode = riverGraph.nodes.get(targetVertex.key);
    if (!targetNode) continue;

    const path = findRiverPath(startNode, targetNode, riverGraph, blockedEdgeKeys)
      .map((node) => ({ key: node.key, x: node.x, y: node.y }));
    if (path.length < 2) continue;
    if (new Set(path.map((vertex) => vertex.key)).size !== path.length) continue;
    const pathEdgeKeys = getRiverPathEdgeKeys(path, riverGraph);
    if (!pathEdgeKeys) continue;
    if (pathEdgeKeys.some((edgeKey) => blockedEdgeKeys.has(edgeKey))) continue;
    if (!riverPathAvoidsOccupiedVertices(path, occupiedVertexKeys, allowedOccupiedVertexKeys)) continue;

    if (!bestPath || path.length < bestPath.length) {
      bestPath = path;
    }
  }

  return bestPath;
}

function buildBoundingBox(occupiedHexes: Set<string>, padding = 2): { minQ: number; maxQ: number; minR: number; maxR: number } {
  const occupied = Array.from(occupiedHexes).map(parseHexKey);
  if (occupied.length === 0) {
    return { minQ: -padding, maxQ: padding, minR: -padding, maxR: padding };
  }
  return {
    minQ: Math.min(...occupied.map((h) => h.q)) - padding,
    maxQ: Math.max(...occupied.map((h) => h.q)) + padding,
    minR: Math.min(...occupied.map((h) => h.r)) - padding,
    maxR: Math.max(...occupied.map((h) => h.r)) + padding
  };
}

type EmptyAreaScanResult = {
  areaKeys: Set<string>;
  isOpen: boolean;
};

function scanEmptyArea(
  startHex: AxialHex,
  blockedHexes: Set<string>,
  bbox: { minQ: number; maxQ: number; minR: number; maxR: number },
  globalVisited?: Set<string>
): EmptyAreaScanResult {
  const startKey = hexKey(startHex);
  const queue: AxialHex[] = [startHex];
  const areaKeys = new Set<string>([startKey]);
  let isOpen = false;
  if (globalVisited) globalVisited.add(startKey);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.q < bbox.minQ || current.q > bbox.maxQ || current.r < bbox.minR || current.r > bbox.maxR) {
      isOpen = true;
      continue;
    }
    for (const neighbor of getHexNeighbors(current)) {
      const neighborKey = hexKey(neighbor);
      if (blockedHexes.has(neighborKey)) {
        continue;
      }
      if (areaKeys.has(neighborKey)) continue;
      areaKeys.add(neighborKey);
      if (globalVisited) globalVisited.add(neighborKey);
      queue.push(neighbor);
    }
  }

  return { areaKeys, isOpen };
}

type GrowthCandidate = {
  hex: AxialHex;
  currentRegionNeighborCount: number;
  existingRegionNeighborCount: number;
  totalGrowthWeight: number;
};

export function getGrowthCandidate(
  candidate: AxialHex,
  currentRegionHexes: Set<string>,
  occupiedHexes: Set<string>,
  zeroWeightHexes: Set<string> = new Set()
): GrowthCandidate | null {
  let currentRegionNeighborCount = 0;
  let existingRegionNeighborCount = 0;

  for (const neighbor of getHexNeighbors(candidate)) {
    const neighborKey = hexKey(neighbor);
    if (currentRegionHexes.has(neighborKey)) {
      currentRegionNeighborCount += 1;
    } else if (occupiedHexes.has(neighborKey)) {
      existingRegionNeighborCount += 1;
    }
  }

  if (currentRegionNeighborCount < 1) {
    return null;
  }

  return {
    hex: candidate,
    currentRegionNeighborCount,
    existingRegionNeighborCount,
    totalGrowthWeight: zeroWeightHexes.has(hexKey(candidate)) ? 0 : currentRegionNeighborCount + existingRegionNeighborCount
  };
}

export function weightedPickCandidate(candidates: GrowthCandidate[]): GrowthCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce((acc, candidate) => acc + candidate.totalGrowthWeight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  let roll = Math.random() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.totalGrowthWeight;
    if (roll <= 0) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

export function findFillableEnclosedEmptyAreas(
  currentRegionHexes: Set<string>,
  occupiedHexes: Set<string>
): AxialHex[][] {
  const blockedHexes = new Set([...occupiedHexes, ...currentRegionHexes]);
  const bbox = buildBoundingBox(blockedHexes, 2);
  const visitedEmpty = new Set<string>();
  const enclosedAreas: AxialHex[][] = [];
  const frontierCandidates = getFrontierCandidateHexes(currentRegionHexes, occupiedHexes);

  for (const start of frontierCandidates) {
    const startKey = hexKey(start);
    if (visitedEmpty.has(startKey) || blockedHexes.has(startKey)) continue;
    const area = scanEmptyArea(start, blockedHexes, bbox, visitedEmpty);
    if (!area.isOpen) enclosedAreas.push(Array.from(area.areaKeys).map(parseHexKey));
  }

  return enclosedAreas;
}

export function getFrontierCandidateHexes(currentRegionHexes: Set<string>, occupiedHexes: Set<string>): AxialHex[] {
  const frontierMap = new Map<string, AxialHex>();
  for (const regionHex of Array.from(currentRegionHexes).map(parseHexKey)) {
    for (const neighbor of getHexNeighbors(regionHex)) {
      const key = hexKey(neighbor);
      if (!currentRegionHexes.has(key) && !occupiedHexes.has(key)) frontierMap.set(key, neighbor);
    }
  }
  return Array.from(frontierMap.values());
}

export function generateConnectedRegionFromAnchor(
  anchorHex: AxialHex,
  size: number,
  occupiedHexes: Set<string>,
  zeroWeightHexes: Set<string> = new Set()
): AxialHex[] {
  const targetSize = Math.max(1, size);
  const regionKeys = new Set<string>([hexKey(anchorHex)]);
  while (true) {
    const enclosedAreas = findFillableEnclosedEmptyAreas(regionKeys, occupiedHexes);
    if (enclosedAreas.length > 0) {
      let addedEnclosedHex = false;
      for (const area of enclosedAreas) {
        for (const hex of area) {
          if (zeroWeightHexes.has(hexKey(hex))) continue;
          regionKeys.add(hexKey(hex));
          addedEnclosedHex = true;
        }
      }
      if (addedEnclosedHex) continue;
    }

    if (regionKeys.size >= targetSize) break;

    const growthCandidates = getFrontierCandidateHexes(regionKeys, occupiedHexes)
      .map((candidate) => getGrowthCandidate(candidate, regionKeys, occupiedHexes, zeroWeightHexes))
      .filter((candidate): candidate is GrowthCandidate => candidate !== null);
    const picked = weightedPickCandidate(growthCandidates);
    if (!picked) break;
    regionKeys.add(hexKey(picked.hex));
  }

  return Array.from(regionKeys).map(parseHexKey);
}

export function chooseRegionCenter(regionHexes: AxialHex[]): AxialHex {
  if (regionHexes.length === 1) {
    return regionHexes[0];
  }

  const regionKeys = new Set(regionHexes.map(hexKey));
  const byNeighborCount = regionHexes.map((hex) => ({
    hex,
    sameRegionNeighborCount: getHexNeighbors(hex).filter((neighbor) => regionKeys.has(hexKey(neighbor))).length
  }));

  const maxNeighborCount = Math.max(...byNeighborCount.map(({ sameRegionNeighborCount }) => sameRegionNeighborCount));
  const bestCenterCandidates = byNeighborCount
    .filter(({ sameRegionNeighborCount }) => sameRegionNeighborCount === maxNeighborCount)
    .map(({ hex }) => hex);

  return randomFrom(bestCenterCandidates);
}

function getBiomeColor(biomeId: BiomeId | undefined): string {
  if (!biomeId) return BIOMES[FALLBACK_BIOME_ID].color;
  return BIOMES[biomeId]?.color ?? BIOMES[FALLBACK_BIOME_ID].color;
}

export function getCandidateHexes(allRegionHexes: AxialHex[], excludeKeys?: Set<string>): AxialHex[] {
  const occupied = new Set(allRegionHexes.map(hexKey));
  const candidates = new Map<string, AxialHex>();

  for (const hex of allRegionHexes) {
    for (const neighbor of getHexNeighbors(hex)) {
      const key = hexKey(neighbor);
      if (occupied.has(key)) continue;
      // Гексы-море нельзя занять сушей — они не предлагаются как точки роста.
      if (excludeKeys?.has(key)) continue;
      candidates.set(key, neighbor);
    }
  }

  return Array.from(candidates.values());
}

function fillSmallEnclosedAreasForRegion(
  regionHexes: AxialHex[],
  existingRegionHexes: AxialHex[],
  seaKeys: Set<string>
): AxialHex[] {
  const minLocalitySize = REGION_SIZE_CATEGORY_RANGES.locality[0];
  const currentRegionKeys = new Set(regionHexes.map(hexKey));
  const occupiedLandKeys = new Set([...existingRegionHexes.map(hexKey), ...currentRegionKeys]);
  const allKnownHexes = [...existingRegionHexes, ...regionHexes, ...Array.from(seaKeys).map(parseHexKey)];
  if (allKnownHexes.length === 0) return regionHexes;

  const qs = allKnownHexes.map((hex) => hex.q);
  const rs = allKnownHexes.map((hex) => hex.r);
  const minQ = Math.min(...qs) - 1;
  const maxQ = Math.max(...qs) + 1;
  const minR = Math.min(...rs) - 1;
  const maxR = Math.max(...rs) + 1;
  const candidateKeys = new Set<string>();
  const candidateHexes = new Map<string, AxialHex>();

  for (let q = minQ; q <= maxQ; q += 1) {
    for (let r = minR; r <= maxR; r += 1) {
      const hex = { q, r };
      const key = hexKey(hex);
      if (occupiedLandKeys.has(key) || seaKeys.has(key)) continue;
      candidateKeys.add(key);
      candidateHexes.set(key, hex);
    }
  }

  const visited = new Set<string>();
  const filledKeys = new Set<string>();

  for (const startKey of candidateKeys) {
    if (visited.has(startKey)) continue;
    const queue = [startKey];
    const componentKeys: string[] = [];
    visited.add(startKey);
    let touchesOutside = false;
    let touchesCurrentRegion = false;

    while (queue.length > 0) {
      const key = queue.shift();
      if (!key) continue;
      const hex = candidateHexes.get(key);
      if (!hex) continue;
      componentKeys.push(key);
      if (hex.q === minQ || hex.q === maxQ || hex.r === minR || hex.r === maxR) touchesOutside = true;

      for (const neighbor of getHexNeighbors(hex)) {
        const neighborKey = hexKey(neighbor);
        if (currentRegionKeys.has(neighborKey)) touchesCurrentRegion = true;
        if (!candidateKeys.has(neighborKey) || visited.has(neighborKey)) continue;
        visited.add(neighborKey);
        queue.push(neighborKey);
      }
    }

    if (!touchesOutside && touchesCurrentRegion && componentKeys.length < minLocalitySize) {
      for (const key of componentKeys) filledKeys.add(key);
    }
  }

  if (filledKeys.size === 0) return regionHexes;
  return [
    ...regionHexes,
    ...Array.from(filledKeys).map(parseHexKey)
  ];
}

function findEnclosedEmptyAreaContainingHex(anchorHex: AxialHex, occupiedHexes: Set<string>): AxialHex[] | null {
  const anchorKey = hexKey(anchorHex);
  if (occupiedHexes.has(anchorKey)) return null;
  const area = scanEmptyArea(anchorHex, occupiedHexes, buildBoundingBox(occupiedHexes, 2));
  if (area.isOpen) return null;
  return Array.from(area.areaKeys).map(parseHexKey);
}


// BR-002: вероятность побережья для нового региона по протяжённости карты.
// Берётся максимальная протяжённость уже сгенерированной карты по трём осям
// гекс-сетки, ограничивается 400, и делится на 400.
const COAST_SPAN_CAP = 400;
const SEA_CANDIDATE_RADIUS = 3;
const START_REGION_AUTO_COAST_PROBABILITY = 0.3;

function computeMapMaxSpanTiles(allRegionHexes: AxialHex[]): number {
  if (allRegionHexes.length === 0) return 0;
  let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity, minS = Infinity, maxS = -Infinity;
  for (const hex of allRegionHexes) {
    const s = -hex.q - hex.r;
    if (hex.q < minQ) minQ = hex.q;
    if (hex.q > maxQ) maxQ = hex.q;
    if (hex.r < minR) minR = hex.r;
    if (hex.r > maxR) maxR = hex.r;
    if (s < minS) minS = s;
    if (s > maxS) maxS = s;
  }
  return Math.max(maxQ - minQ, maxR - minR, maxS - minS);
}

function coastProbabilityFromSpan(span: number): number {
  return Math.min(span, COAST_SPAN_CAP) / COAST_SPAN_CAP;
}

// BR-002 (принудительное продолжение): новый регион граничит с гексом, который
// граничит с прибрежным (морским) гексом — тогда регион гарантированно прибрежный.
function regionForcesCoastContinuation(regionHexes: AxialHex[], seaKeys: Set<string>): boolean {
  if (seaKeys.size === 0) return false;
  const regionSet = new Set(regionHexes.map(hexKey));
  for (const hex of regionHexes) {
    for (const neighbor of getHexNeighbors(hex)) {
      if (regionSet.has(hexKey(neighbor))) continue;
      for (const second of getHexNeighbors(neighbor)) {
        if (seaKeys.has(hexKey(second))) return true;
      }
    }
  }
  return false;
}

function regionHasOutgoingRiverToExistingRegion(touchingEndpoints: RiverEndpointTouch[]): boolean {
  return touchingEndpoints.some((endpoint) => endpoint.endpointType === 'start');
}

function getHexSameRegionNeighborCount(hex: AxialHex, regionKeys: Set<string>): number {
  return getHexNeighbors(hex).filter((neighbor) => regionKeys.has(hexKey(neighbor))).length;
}

function chooseCoastalCenterHex(regionHexes: AxialHex[], seaKeys: Set<string>, rivers: River[]): AxialHex | null {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const candidates = regionHexes.filter((hex) => {
    const seaNeighbors = getHexNeighbors(hex).filter((neighbor) => seaKeys.has(hexKey(neighbor)));
    if (seaNeighbors.length === 0) return false;
    return rivers.some((river) => {
      const mouth = river.vertexPath?.[river.vertexPath.length - 1];
      if (!mouth) return false;
      if (getRiversForHex(hex, [river]).length === 0) return false;
      return seaNeighbors.some((seaHex) => seaHexTouchesRiverMouth(seaHex, mouth));
    });
  });
  if (candidates.length === 0) return null;

  const maxNeighborCount = Math.max(...candidates.map((hex) => getHexSameRegionNeighborCount(hex, regionKeys)));
  return randomFrom(candidates.filter((hex) => getHexSameRegionNeighborCount(hex, regionKeys) === maxNeighborCount));
}

function chooseRiverMouthCenterHex(regionHexes: AxialHex[], rivers: River[]): AxialHex | null {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const boundaryMouths = rivers
    .map((river) => {
      const mouth = river.vertexPath?.[river.vertexPath.length - 1];
      if (!mouth || !isRegionExteriorVertex(mouth, regionHexes)) return null;
      return {
        river,
        mouth,
        fullness: getRiverEndpointSectorFullness(river, mouth.key)
      };
    })
    .filter((mouth): mouth is { river: River; mouth: RiverVertex; fullness: RiverFullness } => mouth !== null);
  if (boundaryMouths.length === 0) return null;

  const maxFullness = Math.max(...boundaryMouths.map(({ fullness }) => fullness));
  const fullestBoundaryMouths = boundaryMouths.filter(({ fullness }) => fullness === maxFullness);
  const candidateByKey = new Map<string, AxialHex>();
  for (const hex of regionHexes) {
    const touchesFullestBoundaryMouth = fullestBoundaryMouths.some(({ river, mouth }) => {
      if (getRiversForHex(hex, [river]).length === 0) return false;
      return getHexCornerPoints(hex).some((corner) => corner.key === mouth.key);
    });
    if (touchesFullestBoundaryMouth) candidateByKey.set(hexKey(hex), hex);
  }

  const candidates = Array.from(candidateByKey.values());
  if (candidates.length === 0) return null;

  const maxNeighborCount = Math.max(...candidates.map((hex) => getHexSameRegionNeighborCount(hex, regionKeys)));
  return randomFrom(candidates.filter((hex) => getHexSameRegionNeighborCount(hex, regionKeys) === maxNeighborCount));
}

function chooseSeaAdjacentCenterHex(regionHexes: AxialHex[], seaKeys: Set<string>): AxialHex | null {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const candidates = regionHexes.filter((hex) => getHexNeighbors(hex).some((neighbor) => seaKeys.has(hexKey(neighbor))));
  if (candidates.length === 0) return null;
  const maxNeighborCount = Math.max(...candidates.map((hex) => getHexSameRegionNeighborCount(hex, regionKeys)));
  return randomFrom(candidates.filter((hex) => getHexSameRegionNeighborCount(hex, regionKeys) === maxNeighborCount));
}

function getClaimableSeaNeighborKey(
  hex: AxialHex,
  regionKeys: Set<string>,
  occupiedRegionKeys: Set<string>,
  existingTerrain: Map<string, HexTerrainData>,
  allowedSeaKeys?: Set<string>
): string | null {
  const neighbors = getHexNeighbors(hex)
    .filter((neighbor) => {
      const key = hexKey(neighbor);
      if (allowedSeaKeys && !allowedSeaKeys.has(key)) return false;
      return !regionKeys.has(key) && !occupiedRegionKeys.has(key) && !existingTerrain.get(key)?.terrainOverride;
    })
    .sort((left, right) => hexDistanceFromCenter(right) - hexDistanceFromCenter(left));

  return neighbors[0] ? hexKey(neighbors[0]) : null;
}

function getSeaCandidateHexesForRegion(
  regionHexes: AxialHex[],
  existingTerrain: Map<string, HexTerrainData>,
  occupiedRegionKeys: Set<string>
): Map<string, AxialHex> {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const candidates = new Map<string, AxialHex>();
  const visited = new Set<string>(regionKeys);
  const queue = regionHexes.map((hex) => ({ hex, distance: 0 }));

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const { hex, distance } = queue[cursor];
    if (distance >= SEA_CANDIDATE_RADIUS) continue;

    for (const neighbor of getHexNeighbors(hex)) {
      const key = hexKey(neighbor);
      if (visited.has(key)) continue;
      visited.add(key);

      if (regionKeys.has(key) || occupiedRegionKeys.has(key) || existingTerrain.get(key)?.terrainOverride) continue;
      candidates.set(key, neighbor);
      queue.push({ hex: neighbor, distance: distance + 1 });
    }
  }

  return candidates;
}

function getSeaCandidateNeighborKeys(key: string, candidates: Map<string, AxialHex>): string[] {
  const hex = candidates.get(key);
  if (!hex) return [];
  return getHexNeighbors(hex).map(hexKey).filter((neighborKey) => candidates.has(neighborKey));
}

function findSeaCandidatePath(
  startKeys: Set<string>,
  targetKey: string,
  candidates: Map<string, AxialHex>
): string[] | null {
  if (!candidates.has(targetKey)) return null;
  if (startKeys.has(targetKey)) return [targetKey];

  const queue = Array.from(startKeys).filter((key) => candidates.has(key));
  const previousByKey = new Map<string, string | null>();
  for (const key of queue) previousByKey.set(key, null);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const currentKey = queue[cursor];
    for (const neighborKey of getSeaCandidateNeighborKeys(currentKey, candidates)) {
      if (previousByKey.has(neighborKey)) continue;
      previousByKey.set(neighborKey, currentKey);
      if (neighborKey === targetKey) {
        const path = [targetKey];
        let previousKey: string | null = currentKey;
        while (previousKey) {
          path.push(previousKey);
          previousKey = previousByKey.get(previousKey) ?? null;
        }
        return path.reverse();
      }
      queue.push(neighborKey);
    }
  }

  return null;
}

function connectRequiredSeaKeys(candidates: Map<string, AxialHex>, requiredKeys: string[]): Set<string> {
  const existingRequiredKeys = requiredKeys.filter((key) => candidates.has(key));
  if (existingRequiredKeys.length === 0) return new Set<string>();

  const connectedKeys = new Set<string>([existingRequiredKeys[0]]);
  for (const targetKey of existingRequiredKeys.slice(1)) {
    const path = findSeaCandidatePath(connectedKeys, targetKey, candidates);
    if (!path) return new Set<string>();
    for (const key of path) connectedKeys.add(key);
  }

  return connectedKeys;
}

function getExpandableSeaNeighborKeys(seaKeys: Set<string>, candidates: Map<string, AxialHex>): string[] {
  const frontier = new Set<string>();
  for (const key of seaKeys) {
    for (const neighborKey of getSeaCandidateNeighborKeys(key, candidates)) {
      if (!seaKeys.has(neighborKey)) frontier.add(neighborKey);
    }
  }
  return Array.from(frontier);
}

function expandConnectedSeaArea(seaKeys: Set<string>, candidates: Map<string, AxialHex>): Set<string> {
  const nextSeaKeys = new Set(seaKeys);
  const firstFrontier = getExpandableSeaNeighborKeys(nextSeaKeys, candidates);
  const extraCount = Math.max(firstFrontier.length, Math.floor(candidates.size * 0.6));

  for (let i = 0; i < extraCount; i += 1) {
    const frontier = getExpandableSeaNeighborKeys(nextSeaKeys, candidates);
    if (frontier.length === 0) break;
    // Вариант 1b: рост моря "наружу" — предпочитаем кандидатов дальше от центра карты
    // (ближе к открытому океану). Берём случайного из более дальней половины фронтира,
    // чтобы сохранить разнообразие между попытками, но смещать форму к берегу.
    const sortedByOutward = [...frontier].sort(
      (left, right) => hexDistanceFromCenter(parseHexKey(right)) - hexDistanceFromCenter(parseHexKey(left))
    );
    const outwardPool = sortedByOutward.slice(0, Math.max(1, Math.ceil(sortedByOutward.length / 2)));
    nextSeaKeys.add(randomFrom(outwardPool));
  }

  return nextSeaKeys;
}

// Вариант 2: точный fail-safe поиск связной раскладки моря. Кандидаты уже отфильтрованы
// по рекам (любое подмножество безопасно по рекам), поэтому задача — чисто связность:
// найти связное подмножество кандидатов-моря, при котором ВСЁ море (включая зажатые
// морские гексы) достижимо от открытого океана. Растим море от обязательных ключей наружу
// (DFS) и проверяем существующими валидаторами. Лимит узлов держит UI отзывчивым; если
// решения нет или лимит превышен — возвращаем null, и наверху отрабатывает обычная логика
// (регион честно бракуется). Хуже текущего не станет.
function searchConnectedSeaSubset(
  candidates: Map<string, AxialHex>,
  requiredConnectedKeys: Set<string>,
  existingSeaKeys: Set<string>,
  allRegionHexes: AxialHex[],
  regionHexes: AxialHex[],
  rivers: River[],
  regionId: number,
  existingRegions: Region[],
  nodeLimit: number
): string[] | null {
  if (requiredConnectedKeys.size === 0) return null;
  const isValidSeaSet = (seaSet: Set<string>): boolean => {
    const seaKeys = Array.from(seaSet);
    const coastalValidation = validateCoastalSeaArea(regionHexes, seaKeys, existingSeaKeys, rivers, regionId, existingRegions);
    if (!coastalValidation.valid) return false;
    const allSea = new Set(existingSeaKeys);
    for (const key of seaSet) allSea.add(key);
    return validateSeaConnectivityThroughOpenTiles(allRegionHexes, allSea, rivers).valid;
  };

  let nodes = 0;
  const seen = new Set<string>();
  const stack: Set<string>[] = [new Set(requiredConnectedKeys)];
  while (stack.length > 0) {
    if (nodes >= nodeLimit) return null;
    nodes += 1;
    const current = stack.pop() as Set<string>;
    const signature = Array.from(current).sort().join('|');
    if (seen.has(signature)) continue;
    seen.add(signature);

    if (isValidSeaSet(current)) return Array.from(current);

    // Растим наружу: добавляем по одному кандидату с фронтира, ближние к океану — позже
    // (кладём в стек так, чтобы дальние от центра разворачивались первыми).
    const frontier = getExpandableSeaNeighborKeys(current, candidates).sort(
      (left, right) => hexDistanceFromCenter(parseHexKey(left)) - hexDistanceFromCenter(parseHexKey(right))
    );
    for (const frontierKey of frontier) {
      const next = new Set(current);
      next.add(frontierKey);
      stack.push(next);
    }
  }
  return null;
}

function seaKeysTouchExistingSea(seaKeys: Set<string>, existingSeaKeys: Set<string>): boolean {
  for (const key of seaKeys) {
    for (const neighbor of getHexNeighbors(parseHexKey(key))) {
      if (existingSeaKeys.has(hexKey(neighbor))) return true;
    }
  }
  return false;
}

function seaHexTouchesRiverMouth(seaHex: AxialHex, mouth: RiverVertex): boolean {
  return getHexCornerPoints(seaHex).some((vertex) => vertex.key === mouth.key);
}

function seaHexTouchesAnyRiverMouth(seaHex: AxialHex, rivers: River[]): boolean {
  return rivers.some((river) => {
    const mouth = river.vertexPath?.[river.vertexPath.length - 1];
    return Boolean(mouth && seaHexTouchesRiverMouth(seaHex, mouth));
  });
}

function getSeaFlowingRiversForRegion(rivers: River[], regionId: number, existingRegions: Region[]): River[] {
  return rivers.filter((river) => {
    if (!river.vertexPath?.length) return false;
    const belongsToRegion = river.regionId === regionId || river.sectors?.some((sector) => sector.assignedRegionId === regionId);
    if (!belongsToRegion) return false;
    const mouth = river.vertexPath[river.vertexPath.length - 1];
    const touchingExistingRegion = findRegionTouchingVertex(mouth, existingRegions);
    return !touchingExistingRegion;
  });
}

function chooseSeaCandidateKeyForRiverMouth(
  candidates: Map<string, AxialHex>,
  mouth: RiverVertex,
  previousVertex?: RiverVertex
): string | null {
  const direction = previousVertex
    ? { x: mouth.x - previousVertex.x, y: mouth.y - previousVertex.y }
    : null;
  const directionLength = direction ? Math.hypot(direction.x, direction.y) : 0;
  const touching = Array.from(candidates.entries())
    .filter(([, hex]) => seaHexTouchesRiverMouth(hex, mouth))
    .sort(([, left], [, right]) => {
      const leftCenter = toPixel(left.q, left.r);
      const rightCenter = toPixel(right.q, right.r);
      if (direction && directionLength > 0) {
        const leftVector = { x: leftCenter.x - mouth.x, y: leftCenter.y - mouth.y };
        const rightVector = { x: rightCenter.x - mouth.x, y: rightCenter.y - mouth.y };
        const leftProjection = (leftVector.x * direction.x + leftVector.y * direction.y) / directionLength;
        const rightProjection = (rightVector.x * direction.x + rightVector.y * direction.y) / directionLength;
        if (Math.abs(leftProjection - rightProjection) > 1e-6) return rightProjection - leftProjection;
      }
      return Math.hypot(leftCenter.x - mouth.x, leftCenter.y - mouth.y) - Math.hypot(rightCenter.x - mouth.x, rightCenter.y - mouth.y);
    });
  return touching[0]?.[0] ?? null;
}

function getConnectedSeaComponent(startKey: string, seaKeys: Set<string>): Set<string> {
  const connected = new Set<string>([startKey]);
  const queue = [startKey];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const currentKey = queue[cursor];
    for (const neighbor of getHexNeighbors(parseHexKey(currentKey))) {
      const neighborKey = hexKey(neighbor);
      if (!seaKeys.has(neighborKey) || connected.has(neighborKey)) continue;
      connected.add(neighborKey);
      queue.push(neighborKey);
    }
  }
  return connected;
}


function splitNewSeaKeysByMouthConnectedComponent(newSeaKeys: string[], rivers: River[]): { connectedSeaKeys: string[]; disconnectedSeaKeys: string[] } {
  const uniqueNewSeaKeys = Array.from(new Set(newSeaKeys));
  const mouthSeaKey = uniqueNewSeaKeys.find((key) => seaHexTouchesAnyRiverMouth(parseHexKey(key), rivers));
  if (!mouthSeaKey) return { connectedSeaKeys: uniqueNewSeaKeys, disconnectedSeaKeys: [] };

  const newSeaKeySet = new Set(uniqueNewSeaKeys);
  const connected = getConnectedSeaComponent(mouthSeaKey, newSeaKeySet);
  return {
    connectedSeaKeys: uniqueNewSeaKeys.filter((key) => connected.has(key)),
    disconnectedSeaKeys: uniqueNewSeaKeys.filter((key) => !connected.has(key))
  };
}

function addCandidateHexKeys(candidateHexes: AxialHex[], keysToAdd: Iterable<string>, blockedKeys: Set<string> = new Set()): AxialHex[] {
  const nextByKey = new Map(candidateHexes.map((hex) => [hexKey(hex), hex]));
  for (const key of keysToAdd) {
    if (blockedKeys.has(key) || nextByKey.has(key)) continue;
    nextByKey.set(key, parseHexKey(key));
  }
  return Array.from(nextByKey.values());
}
function seaKeysAreConnected(seaKeys: Set<string>): boolean {
  if (seaKeys.size <= 1) return true;
  const firstKey = Array.from(seaKeys)[0];
  return getConnectedSeaComponent(firstKey, seaKeys).size === seaKeys.size;
}

type GlobalSeaValidationResult = { valid: true } | { valid: false; reason: string };

function validateGlobalSeaConnectivity(existingSeaKeys: Set<string>, newSeaKeys: Iterable<string>): GlobalSeaValidationResult {
  const newSeaSet = new Set(newSeaKeys);
  if (newSeaSet.size === 0) return { valid: true };
  const allSeaKeys = new Set(existingSeaKeys);
  for (const key of newSeaSet) allSeaKeys.add(key);

  if (existingSeaKeys.size > 0 && seaKeysAreConnected(existingSeaKeys) && !seaKeysTouchExistingSea(newSeaSet, existingSeaKeys)) {
    return { valid: false, reason: 'new_sea_not_connected_to_existing_sea' };
  }
  if (existingSeaKeys.size > 0 && seaKeysAreConnected(existingSeaKeys) && !seaKeysAreConnected(allSeaKeys)) {
    return { valid: false, reason: 'sea_would_be_disconnected' };
  }
  return { valid: true };
}

function openTileTouchesRiverAwayFromMouth(hex: AxialHex, rivers: River[]): boolean {
  const vertexKeys = new Set(getHexCornerPoints(hex).map((vertex) => vertex.key));
  const edgeKeys = new Set(getHexEdgesAsVertexPairs(hex).map((edge) => edge.edgeKey));

  for (const river of rivers) {
    const path = river.vertexPath ?? [];
    if (path.length < 2) continue;
    const mouthIndex = path.length - 1;

    for (let index = 0; index < mouthIndex; index += 1) {
      if (vertexKeys.has(path[index].key)) return true;
    }

    for (let index = 1; index < path.length; index += 1) {
      const currentEdgeKey = edgeKey(path[index - 1], path[index]);
      if (!edgeKeys.has(currentEdgeKey)) continue;
      const isLastEdgeToMouth = index === mouthIndex;
      if (!isLastEdgeToMouth) return true;
    }
  }

  return false;
}

// Возвращает множество морских гексов, НЕ достижимых от открытого океана (снаружи карты)
// по проходимым тайлам: море + пустые тайлы, не касающиеся реки вне устья; суша — стена.
function getUnreachableSeaKeys(landHexes: AxialHex[], seaKeys: Iterable<string>, rivers: River[] = []): Set<string> {
  const seaSet = new Set(seaKeys);
  if (seaSet.size === 0) return new Set<string>();

  const landKeys = new Set(landHexes.map(hexKey));
  const knownHexes = [...landHexes, ...Array.from(seaSet).map(parseHexKey)];
  if (knownHexes.length === 0) return new Set<string>();

  // Рамка обхода = ОБЪЕДИНЕНИЕ двух рамок по всем известным гексам (land + sea):
  //   - осевая (q/r), как было раньше, +2 гекса;
  //   - пиксельная (x/y) — прямоугольник по центрам гексов, +2 гекса с каждой стороны.
  // Осевой бокс — это параллелограмм и теряет «чёрную пустоту» у одних углов карты,
  // пиксельный прямоугольник — у других. Объединение НИКОГДА не у́же прежней осевой рамки,
  // поэтому раньше работавшая генерация не ломается, а пустота у углов теперь тоже
  // проходима — и связное у берега море перестаёт ложно браковаться.
  let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const hex of knownHexes) {
    if (hex.q < minQ) minQ = hex.q;
    if (hex.q > maxQ) maxQ = hex.q;
    if (hex.r < minR) minR = hex.r;
    if (hex.r > maxR) maxR = hex.r;
    const { x, y } = toPixel(hex.q, hex.r);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  minQ -= 2; maxQ += 2; minR -= 2; maxR += 2;
  const HEX_WIDTH = HEX_SIZE * SQRT3;
  const HEX_ROW_HEIGHT = HEX_SIZE * 1.5;
  minX -= HEX_WIDTH * 2; maxX += HEX_WIDTH * 2; minY -= HEX_ROW_HEIGHT * 2; maxY += HEX_ROW_HEIGHT * 2;

  const isInsideBounds = (hex: AxialHex) => {
    if (hex.q >= minQ && hex.q <= maxQ && hex.r >= minR && hex.r <= maxR) return true;
    const { x, y } = toPixel(hex.q, hex.r);
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  };
  const reachable = new Set<string>();
  const queue: AxialHex[] = [];
  const enqueue = (hex: AxialHex) => {
    if (!isInsideBounds(hex)) return;
    const key = hexKey(hex);
    if (landKeys.has(key) || reachable.has(key)) return;
    if (!seaSet.has(key) && openTileTouchesRiverAwayFromMouth(hex, rivers)) return;
    reachable.add(key);
    queue.push(hex);
  };

  // Затравка с осевой границы (она внутри объединённой рамки и заведомо пустая —
  // открытый океан снаружи). BFS дальше сам растекается и по пиксельным углам.
  for (let q = minQ; q <= maxQ; q += 1) {
    enqueue({ q, r: minR });
    enqueue({ q, r: maxR });
  }
  for (let r = minR; r <= maxR; r += 1) {
    enqueue({ q: minQ, r });
    enqueue({ q: maxQ, r });
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    for (const neighbor of getHexNeighbors(queue[cursor])) enqueue(neighbor);
  }

  const unreachable = new Set<string>();
  for (const seaKey of seaSet) {
    if (!reachable.has(seaKey)) unreachable.add(seaKey);
  }
  return unreachable;
}

function validateSeaConnectivityThroughOpenTiles(landHexes: AxialHex[], seaKeys: Iterable<string>, rivers: River[] = []): GlobalSeaValidationResult {
  const seaSet = new Set(seaKeys);
  if (seaSet.size <= 1) return { valid: true };
  if (getUnreachableSeaKeys(landHexes, seaSet, rivers).size > 0) {
    return { valid: false, reason: 'sea_not_connected_through_open_tiles' };
  }
  return { valid: true };
}

type CoastalSeaValidationResult = { valid: true } | { valid: false; reason: string };

function validateCoastalSeaArea(
  regionHexes: AxialHex[],
  seaHexKeys: string[],
  existingSeaKeys: Set<string>,
  rivers: River[],
  regionId: number,
  existingRegions: Region[]
): CoastalSeaValidationResult {
  const seaKeys = new Set(seaHexKeys);
  if (seaKeys.size === 0) return { valid: false, reason: 'no_sea_hexes' };

  const regionKeys = new Set(regionHexes.map(hexKey));
  const seaHexTouchesRegion = (key: string) =>
    getHexNeighbors(parseHexKey(key)).some((neighbor) => regionKeys.has(hexKey(neighbor)));
  const touchesRegion = Array.from(seaKeys).some(seaHexTouchesRegion);
  if (!touchesRegion) return { valid: false, reason: 'sea_area_does_not_touch_region' };

  // Однослойное береговое море: каждый морской гекс примыкает к региону. Это легитимный
  // берег (а не случайный точечный спавн), поэтому баны «одиночного» и «разорванного» моря
  // к нему НЕ применяем — берег вполне может быть несколькими отдельными дугами или даже
  // единичным гексом. Эти баны оставляем только на случай не-берегового моря.
  const everySeaHexTouchesRegion = Array.from(seaKeys).every(seaHexTouchesRegion);
  if (!everySeaHexTouchesRegion) {
    // Каждый гекс нового моря обязан примыкать к другому морю (новому ИЛИ существующему).
    for (const key of seaKeys) {
      const touchesNewSea = getHexNeighbors(parseHexKey(key)).some((neighbor) => seaKeys.has(hexKey(neighbor)));
      const touchesExistingSea = getHexNeighbors(parseHexKey(key)).some((neighbor) => existingSeaKeys.has(hexKey(neighbor)));
      if (!touchesNewSea && !touchesExistingSea) return { valid: false, reason: 'isolated_sea_hex' };
    }
    if (seaKeys.size > 1) {
      const firstKey = Array.from(seaKeys)[0];
      if (getConnectedSeaComponent(firstKey, seaKeys).size !== seaKeys.size) return { valid: false, reason: 'disconnected_sea_area' };
    }
  }

  // Связность с открытым океаном проверяем для НОВОГО моря: достаточно, чтобы каждый
  // новый морской гекс дотягивался до океана. Старые уже-оторванные гексы (артефакты
  // прежней генерации) в существующем море не должны валить новый прибрежный регион.
  const unreachableSea = getUnreachableSeaKeys(
    [...existingRegions.flatMap((region) => region.hexes), ...regionHexes],
    new Set([...existingSeaKeys, ...seaKeys]),
    rivers
  );
  if (Array.from(seaKeys).some((key) => unreachableSea.has(key))) {
    return { valid: false, reason: 'sea_not_connected_through_open_tiles' };
  }

  const riverHeightViolation = getRiverSeaHeightViolation(rivers, seaKeys);
  if (riverHeightViolation) return { valid: false, reason: `sea_height_${riverHeightViolation.reason}` };

  const riverConflict = getCoastalSeaRiverConflict(rivers, seaKeys, regionHexes);
  if (riverConflict) return { valid: false, reason: 'sea_touches_river_not_at_mouth' };

  return { valid: true };
}

function extendSeaToCoastalCenterCandidate(
  regionHexes: AxialHex[],
  seaHexKeys: string[],
  existingTerrain: Map<string, HexTerrainData>,
  occupiedRegionKeys: Set<string>,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>,
  roads: Road[] = []
): string[] {
  const seaKeys = new Set(seaHexKeys);
  if (chooseCoastalCenterHex(regionHexes, seaKeys, rivers)) return Array.from(seaKeys);

  const regionKeys = new Set(regionHexes.map(hexKey));
  const rawCandidates = getSeaCandidateHexesForRegion(regionHexes, existingTerrain, occupiedRegionKeys);
  const centerHexKeys = new Set([hexKey(centerHex), ...getRegionCenterHexKeys(existingRegions)]);
  const nonSeaKeys = getNonSeaCandidateKeys(rawCandidates, rivers, roads, existingTerrain, allowedMouthVertexKeys, regionHexes, centerHexKeys);
  const candidateKeySet = new Set(removeNonSeaCandidates(rawCandidates, nonSeaKeys).keys());
  const riverHexes = regionHexes
    .filter((hex) => rivers.some((river) => {
      const mouth = river.vertexPath?.[river.vertexPath.length - 1];
      return Boolean(mouth && getHexCornerPoints(hex).some((corner) => corner.key === mouth.key));
    }))
    .sort((left, right) => hexDistanceFromCenter(right) - hexDistanceFromCenter(left));

  for (const hex of riverHexes) {
    const seaKey = getClaimableSeaNeighborKey(hex, regionKeys, occupiedRegionKeys, existingTerrain, candidateKeySet);
    if (!seaKey) continue;
    // Один слой: добавляем только примыкающий к региону морской гекс, без многошаговых путей.
    seaKeys.add(seaKey);
    if (chooseCoastalCenterHex(regionHexes, seaKeys, rivers)) break;
  }

  return Array.from(seaKeys);
}

// Гексы-море для прибрежного региона: пустые гексы на отвёрнутой от центра
// ("береговой") стороне региона. Никогда не ставятся на гексы какого-либо
// региона и на гексы с уже заданным terrain (озёра/существующее море).
type RiverLakeReentryViolation = {
  riverId: number;
  lakeId: number;
  vertexKey: string;
};

function getRiverLakeReentryViolation(
  river: River,
  lakeIdByVertexKey: Map<string, number>
): RiverLakeReentryViolation | null {
  const path = river.vertexPath;
  if (path.length < 3) return null;

  const exitedLakeIds = new Set<number>();
  let previousLakeId = lakeIdByVertexKey.get(path[0].key);

  for (let i = 1; i < path.length; i += 1) {
    const currentLakeId = lakeIdByVertexKey.get(path[i].key);

    if (previousLakeId !== undefined && currentLakeId !== previousLakeId) {
      exitedLakeIds.add(previousLakeId);
    }
    if (currentLakeId !== undefined && currentLakeId !== previousLakeId && exitedLakeIds.has(currentLakeId)) {
      return { riverId: river.id, lakeId: currentLakeId, vertexKey: path[i].key };
    }

    previousLakeId = currentLakeId;
  }

  return null;
}

function getRiversLakeReentryViolation(
  rivers: River[],
  lakeIdByVertexKey: Map<string, number>
): RiverLakeReentryViolation | null {
  for (const river of rivers) {
    const violation = getRiverLakeReentryViolation(river, lakeIdByVertexKey);
    if (violation) return violation;
  }

  return null;
}

function buildLakeIdByVertexKey(lakes: Lake[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const lake of lakes) {
    for (const vertex of getRegionExteriorVertices(lake.hexes)) map.set(vertex.key, lake.lakeId);
  }
  return map;
}

// Море прибрежного региона по модели дяди:
//   1. Берём гексы-кандидаты вокруг региона.
//   2. Убираем «красные кресты» — кандидатов, касающихся «объектов»: вершин рек
//      (через filterSeaCandidatesByRiverInteraction; устье — исключение, там море
//      и должно соприкасаться с рекой) и концов дорог (filterSeaCandidatesByRoadEndpoints).
//      Оставшиеся кандидаты образуют граф, в котором реки и концы дорог — стены.
//   3. «Гарантированное море» (двойная галочка) — кандидаты, смежные с уже существующим
//      открытым океаном, плюс устья рек, впадающих в этот регион.
//   4. Заполняем море от гарантированного наружу по графу кандидатов, пока не упрёмся
//      в стены (реки/дороги) — это «зелёные галочки». Кандидаты, отрезанные стенами от
//      гарантированного моря, остаются сушей — это «красные минусы».
function computeSeaHexKeysForCoastalRegion(
  regionHexes: AxialHex[],
  centerHex: AxialHex,
  existingTerrain: Map<string, HexTerrainData>,
  occupiedRegionKeys: Set<string>,
  existingRegions: Region[],
  rivers: River[],
  regionId: number,
  roads: Road[] = []
): string[] {
  const allowedMouthVertexKeys = getRiverMouthVertexKeys(rivers);
  const rawCandidates = getSeaCandidateHexesForRegion(regionHexes, existingTerrain, occupiedRegionKeys);
  const mouthSeaKeyByVertex = new Map<string, string>();
  for (const river of rivers) {
    const path = river.vertexPath ?? [];
    if (path.length < 2) continue;
    const mouth = path[path.length - 1];
    if (!allowedMouthVertexKeys.has(mouth.key) || mouthSeaKeyByVertex.has(mouth.key)) continue;
    const mouthSeaKey = chooseSeaCandidateKeyForRiverMouth(rawCandidates, mouth, path[path.length - 2]);
    if (mouthSeaKey) mouthSeaKeyByVertex.set(mouth.key, mouthSeaKey);
  }
  const mouthSeaKeys = new Set<string>(mouthSeaKeyByVertex.values());

  // (1) Единый сет «не-морских» гексов (реки/дороги/озёра) и выкидываем их из кандидатов.
  // Только гекс, лежащий по направлению последнего сегмента реки (продолжение
  // previous→mouth наружу), становится морем без дополнительных проверок. Это
  // не даёт боковому соседу устья случайно получить mouth-исключение из-за
  // порядка обхода rawCandidates; остальные гексы вокруг того же устья проходят
  // стандартные критерии ниже, включая запрет моря рядом с концом дороги.
  const centerHexKeys = new Set([hexKey(centerHex), ...getRegionCenterHexKeys(existingRegions)]);
  const nonSeaKeys = getNonSeaCandidateKeys(rawCandidates, rivers, roads, existingTerrain, allowedMouthVertexKeys, regionHexes, centerHexKeys);
  const candidates = removeNonSeaCandidates(rawCandidates, nonSeaKeys);
  if (candidates.size === 0 && mouthSeaKeys.size === 0) return [];

  // (2) Море строим В ОДИН СЛОЙ: только кандидаты, НЕПОСРЕДСТВЕННО примыкающие к региону.
  // Глубже одного гекса не идём — иначе можно «закрыть» морем гекс, стоящий ЗА не-морским
  // (рекой/дорогой/озером), обойдя его с другой стороны. Связь этого берегового слоя с
  // открытым океаном обеспечивают проходимые (не-морские) пустые тайлы снаружи — их учитывает
  // проверка связности validateSeaConnectivityThroughOpenTiles.
  const regionKeys = new Set(regionHexes.map(hexKey));
  const seaKeys: string[] = [];
  for (const [key, hex] of rawCandidates) {
    if (mouthSeaKeys.has(key)) {
      seaKeys.push(key);
      continue;
    }
    if (!candidates.has(key)) continue;
    if (getHexNeighbors(hex).some((neighbor) => regionKeys.has(hexKey(neighbor)))) seaKeys.push(key);
  }
  return seaKeys;
}

// Выбор освоенности (BR-007): прибрежный регион освоен с вероятностью 40%,
// материковый — 20%.
function chooseCoastalAwareLandType(isCoastal: boolean): BiomeLandType {
  const settledChance = isCoastal ? 0.4 : 0.2;
  return Math.random() < settledChance ? 'settled' : 'wild';
}

type RiverGenerationResult = { success: boolean; rivers: River[]; reason?: string };

function getMinimumMountainRiverCountForRegion(region: Region): number {
  if (region.heightLevel !== 3) return 0;
  if (region.sizeCategory === 'locality' || region.sizeCategory === 'small_region') return 1;
  if (region.sizeCategory === 'region' || region.sizeCategory === 'large_region') return 2;
  return 3;
}

function buildMinimumMountainRiverPath(
  sourceVertices: RiverVertex[],
  endVertices: RiverVertex[],
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string> = new Set()
): RiverVertex[] | null {
  for (const sourceVertex of sourceVertices) {
    for (const endVertex of endVertices) {
      if (sourceVertex.key === endVertex.key) continue;
      const sourceNode = riverGraph.nodes.get(sourceVertex.key);
      const endNode = riverGraph.nodes.get(endVertex.key);
      if (!sourceNode || !endNode) continue;

      const path = findRiverPath(sourceNode, endNode, riverGraph, usedRiverEdges)
        .map((node) => ({ key: node.key, x: node.x, y: node.y }));
      if (path.length < 2) continue;
      if (path[0].key !== sourceVertex.key || path[path.length - 1].key !== endVertex.key) continue;
      if (new Set(path.map((vertex) => vertex.key)).size !== path.length) continue;
      const pathEdgeKeys = getRiverPathEdgeKeys(path, riverGraph);
      if (!pathEdgeKeys) continue;
      if (hasDuplicateEdgeKeys(pathEdgeKeys)) continue;
      if (pathEdgeKeys.some((edgeKey) => usedRiverEdges.has(edgeKey))) continue;
      if (!riverPathAvoidsOccupiedVertices(path, occupiedVertexKeys)) continue;

      return path;
    }
  }

  return null;
}

function ensureMinimumMountainRiversForRegion(
  region: Region,
  regions: Region[],
  rivers: River[],
  riverGraph: RiverGraph,
  candidateHexes: AxialHex[],
  candidateVertices: RiverVertex[],
  neighborRegionVertices: RiverVertex[]
): River[] {
  const minimumRiverCount = getMinimumMountainRiverCountForRegion(region);
  if (minimumRiverCount <= 0) return rivers;

  let nextRivers = rivers;
  const blockedEndVertexKeys = new Set(neighborRegionVertices.map((vertex) => vertex.key));

  while (getRiversForRegion(region, nextRivers).length < minimumRiverCount) {
    const usedRiverEdges = buildUsedRiverEdges(nextRivers);
    const existingRiverVertexKeys = new Set(nextRivers.flatMap((river) => river.vertexPath.map((vertex) => vertex.key)));
    const centerHexRiverCount = region.centerHex ? getRiversForHex(region.centerHex, nextRivers).length : 0;
    const requireCenterHexSource = Boolean(region.centerHex && centerHexRiverCount === 0);
    const centerHexVertexKeys = new Set((region.centerHex ? getHexCornerPoints(region.centerHex) : []).map((vertex) => vertex.key));
    const sourceVertices = getMountainInteriorSourceVertices(
      region,
      regions,
      candidateHexes,
      riverGraph,
      candidateVertices,
      neighborRegionVertices
    ).filter((vertex) => (
      !existingRiverVertexKeys.has(vertex.key)
      && (!requireCenterHexSource || centerHexVertexKeys.has(vertex.key))
    ));
    const endVertices = candidateVertices.filter((vertex) => !blockedEndVertexKeys.has(vertex.key));

    const path = buildMinimumMountainRiverPath(sourceVertices, endVertices, riverGraph, usedRiverEdges, existingRiverVertexKeys);
    if (!path) {
      console.warn('Could not add minimum mountain river', {
        regionId: region.id,
        currentRiverCount: getRiversForRegion(region, nextRivers).length,
        minimumRiverCount,
        sourceVertexCount: sourceVertices.length,
        endVertexCount: endVertices.length,
        centerHexRiverCount,
        requireCenterHexSource,
      });
      break;
    }

    const newRiverId = Math.max(0, ...nextRivers.map((river) => river.id)) + 1;
    const river: River = {
      id: newRiverId,
      regionId: region.id,
      vertexPath: path,
      sectors: createInitialRiverSectors(newRiverId, path, 1, {}, region.id),
      controlPoints: {
        startVertex: path[0],
        endVertex: path[path.length - 1],
        startMode: 'mountain source'
      }
    };

    nextRivers = [...nextRivers, river];
    for (const nextRiver of nextRivers) {
      validateRiverDirection(nextRiver);
      validateRiverContinuity(nextRiver);
    }
    validateNoDuplicateRiverEdges(nextRivers);
  }

  return nextRivers;
}

type RemainingOutgoingConnection = {
  endpoint: RiverEndpointTouch;
  river: River;
  downstreamRegion: Region;
};

function getRemainingOutgoingConnectionsForRegion(
  region: Region,
  regions: Region[],
  rivers: River[],
  riverGraph: RiverGraph
): RemainingOutgoingConnection[] {
  const otherRegions = regions.filter((item) => item.id !== region.id);
  return findRiverEndpointsTouchingRegion(region, rivers, riverGraph)
    .filter((endpoint) => endpoint.endpointType === 'start')
    .map((endpoint) => {
      const river = rivers.find((item) => item.id === endpoint.riverId);
      const downstreamRegion = findRegionTouchingVertex(endpoint.vertex, otherRegions);
      if (!river || !downstreamRegion) return null;
      if (downstreamRegion.heightLevel > region.heightLevel) return null;
      return { endpoint, river, downstreamRegion };
    })
    .filter((connection): connection is RemainingOutgoingConnection => connection !== null)
    .sort((a, b) => a.river.id - b.river.id);
}

function getOutgoingInteriorConnectorFullness(
  river: River,
  outgoingVertexKey: string,
  connectedToLake: boolean
): RiverFullness {
  const outgoingFullness = getRiverEndpointSectorFullness(river, outgoingVertexKey);
  return getOutgoingConnectorFullnessFromEndpoint(outgoingFullness, connectedToLake);
}

function getAvailableUnconnectedLakesForRegion(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  rivers: River[],
  usedLakeIds: Set<number>
): Lake[] {
  return getLakesForRegion(region, terrainMap)
    .filter((lake) => !usedLakeIds.has(lake.lakeId))
    .filter((lake) => !lakeHasRiverConnection(lake.hexes, rivers));
}

function prependOutgoingRiverConnection(
  rivers: River[],
  connection: RemainingOutgoingConnection,
  path: RiverVertex[],
  fullness: RiverFullness,
  assignedRegionId: number
): River[] {
  return rivers.map((river) => river.id !== connection.river.id
    ? river
    : {
      ...river,
      vertexPath: [...path.slice(0, -1), ...river.vertexPath],
      sectors: prependRiverPathSector(river, path, fullness, assignedRegionId)
    });
}

function getUnhandledIncomingConnectionsForRegion(
  region: Region,
  rivers: River[],
  riverGraph: RiverGraph
): Array<{ endpoint: RiverEndpointTouch; river: River; fullness: RiverFullness }> {
  return findRiverEndpointsTouchingRegion(region, rivers, riverGraph)
    .filter((endpoint) => endpoint.endpointType === 'end')
    .map((endpoint) => {
      const river = rivers.find((item) => item.id === endpoint.riverId);
      if (!river) return null;
      const currentEndVertex = river.vertexPath[river.vertexPath.length - 1];
      if (currentEndVertex?.key !== endpoint.vertex.key) return null;
      const endpointAlreadyExtendedInRegion = (river.sectors ?? []).some((sector) => (
        sector.assignedRegionId === region.id
        && sector.endVertexKey === endpoint.vertex.key
      ));
      if (endpointAlreadyExtendedInRegion) return null;
      return {
        endpoint,
        river,
        fullness: getRiverEndpointSectorFullness(river, endpoint.vertex.key)
      };
    })
    .filter((connection): connection is { endpoint: RiverEndpointTouch; river: River; fullness: RiverFullness } => connection !== null)
    .sort((a, b) => b.fullness - a.fullness || a.river.id - b.river.id);
}

function appendIncomingRiverConnection(
  rivers: River[],
  endpoint: RiverEndpointTouch,
  path: RiverVertex[],
  assignedRegionId: number
): River[] {
  return rivers.map((river) => river.id !== endpoint.riverId
    ? river
    : {
      ...river,
      vertexPath: [...river.vertexPath, ...path.slice(1)],
      sectors: appendRiverPathSector(river, path, getRiverDownstreamFullness(river), assignedRegionId)
    });
}

function getBestIncomingPathToCandidate(
  endpoint: RiverEndpointTouch,
  candidateVertices: RiverVertex[],
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string>
): RiverVertex[] | null {
  const targetVertices = candidateVertices.filter((vertex) => (
    vertex.key !== endpoint.vertex.key
    && !occupiedVertexKeys.has(vertex.key)
    && riverGraph.nodes.has(vertex.key)
  ));
  return findBestFreeRiverPathToAnyTarget(
    endpoint.vertex,
    targetVertices,
    riverGraph,
    usedRiverEdges,
    new Set(),
    occupiedVertexKeys,
    new Set([endpoint.vertex.key])
  );
}

function getBestIncomingPathToRiverTributary(
  endpoint: RiverEndpointTouch,
  rivers: River[],
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string>
): RiverVertex[] | null {
  const targetVerticesByKey = new Map<string, RiverVertex>();

  for (const targetRiver of rivers) {
    if (targetRiver.id === endpoint.riverId) continue;
    if (wouldCreateRiverDrainageCycle(rivers, endpoint.riverId, targetRiver.id)) continue;

    for (const vertex of targetRiver.vertexPath.slice(1, -1)) {
      if (!riverGraph.nodes.has(vertex.key)) continue;
      if (vertex.key === endpoint.vertex.key) continue;
      targetVerticesByKey.set(vertex.key, vertex);
    }
  }

  const targetVertices = Array.from(targetVerticesByKey.values());
  return findBestFreeRiverPathToAnyTarget(
    endpoint.vertex,
    targetVertices,
    riverGraph,
    usedRiverEdges,
    new Set(),
    occupiedVertexKeys,
    new Set([endpoint.vertex.key, ...targetVertices.map((vertex) => vertex.key)])
  );
}

function getBestIncomingPathToLake(
  endpoint: RiverEndpointTouch,
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  rivers: River[],
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string>
): RiverVertex[] | null {
  const lakes = getLakesForRegion(region, terrainMap)
    .map((lake) => ({ lake, hasRiverConnection: lakeHasRiverConnection(lake.hexes, rivers) }))
    .sort((a, b) => Number(a.hasRiverConnection) - Number(b.hasRiverConnection) || a.lake.lakeId - b.lake.lakeId);

  let bestPath: RiverVertex[] | null = null;
  for (const { lake } of lakes) {
    const lakeVertices = getRegionExteriorVertices(lake.hexes)
      .filter((vertex) => vertex.key !== endpoint.vertex.key && riverGraph.nodes.has(vertex.key));
    const path = findBestFreeRiverPathToAnyTarget(
      endpoint.vertex,
      lakeVertices,
      riverGraph,
      usedRiverEdges,
      new Set(),
      occupiedVertexKeys,
      new Set([endpoint.vertex.key, ...lakeVertices.map((vertex) => vertex.key)])
    );
    if (path && (!bestPath || path.length < bestPath.length)) bestPath = path;
  }

  return bestPath;
}

function connectRemainingIncomingRiversForRegion(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateVertices: RiverVertex[]
): River[] {
  let nextRivers = rivers;

  for (const initialConnection of getUnhandledIncomingConnectionsForRegion(region, nextRivers, riverGraph)) {
    const currentConnection = getUnhandledIncomingConnectionsForRegion(region, nextRivers, riverGraph)
      .find((connection) => connection.river.id === initialConnection.river.id);
    if (!currentConnection) continue;

    const usedRiverEdges = buildUsedRiverEdges(nextRivers);
    const occupiedVertexKeys = new Set(nextRivers.flatMap((river) => river.vertexPath.map((vertex) => vertex.key)));
    const candidatePath = getBestIncomingPathToCandidate(
      currentConnection.endpoint,
      candidateVertices,
      riverGraph,
      usedRiverEdges,
      occupiedVertexKeys
    );
    const tributaryPath = candidatePath ? null : getBestIncomingPathToRiverTributary(
      currentConnection.endpoint,
      nextRivers,
      riverGraph,
      usedRiverEdges,
      occupiedVertexKeys
    );
    const lakePath = candidatePath || tributaryPath ? null : getBestIncomingPathToLake(
      currentConnection.endpoint,
      region,
      terrainMap,
      nextRivers,
      riverGraph,
      usedRiverEdges,
      occupiedVertexKeys
    );
    const selectedPath = candidatePath ?? tributaryPath ?? lakePath;
    const selectedMode = candidatePath ? 'candidate' : tributaryPath ? 'tributary' : lakePath ? 'lake' : null;

    if (!selectedPath) {
      console.warn('Could not connect remaining incoming river', {
        regionId: region.id,
        incomingRiverId: currentConnection.river.id,
        fullness: currentConnection.fullness,
        candidateTargetCount: candidateVertices.length,
        lakeCount: getLakesForRegion(region, terrainMap).length,
      });
      continue;
    }

    nextRivers = appendIncomingRiverConnection(
      nextRivers,
      currentConnection.endpoint,
      selectedPath,
      region.id
    );

    for (const river of nextRivers) {
      validateRiverDirection(river);
      validateRiverContinuity(river);
    }
    validateNoDuplicateRiverEdges(nextRivers);

    console.log('Connected remaining incoming river', {
      regionId: region.id,
      incomingRiverId: currentConnection.river.id,
      fullness: currentConnection.fullness,
      mode: selectedMode,
      pathLength: selectedPath.length,
    });
  }

  return nextRivers;
}

function connectRemainingOutgoingRiversForRegion(
  region: Region,
  regions: Region[],
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateHexes: AxialHex[],
  candidateVertices: RiverVertex[],
  neighborRegionVertices: RiverVertex[]
): River[] {
  let nextRivers = rivers;
  const usedLakeIds = new Set<number>();
  const skippedRiverIds = new Set<number>();

  while (true) {
    const remainingOutgoingConnections = getRemainingOutgoingConnectionsForRegion(region, regions, nextRivers, riverGraph)
      .filter((connection) => !skippedRiverIds.has(connection.river.id));
    if (remainingOutgoingConnections.length === 0) break;

    const connection = remainingOutgoingConnections[0];
    const usedRiverEdges = buildUsedRiverEdges(nextRivers);
    const existingRiverVertexKeys = new Set(nextRivers.flatMap((river) => river.vertexPath.map((vertex) => vertex.key)));
    const availableLakes = getAvailableUnconnectedLakesForRegion(region, terrainMap, nextRivers, usedLakeIds);
    let selectedPath: RiverVertex[] | null = null;
    let selectedLake: Lake | null = null;

    for (const lake of availableLakes) {
      const lakePath = findBestPathFromLakeToOutgoingEndpoint(
        lake.vertices,
        connection.endpoint,
        riverGraph,
        usedRiverEdges,
        existingRiverVertexKeys
      );
      if (lakePath && (!selectedPath || lakePath.length < selectedPath.length)) {
        selectedPath = lakePath;
        selectedLake = lake;
      }
    }

    if (!selectedPath) {
      const interiorSourceVertices = getMountainInteriorSourceVertices(
        region,
        regions,
        candidateHexes,
        riverGraph,
        candidateVertices,
        neighborRegionVertices
      ).filter((vertex) => !existingRiverVertexKeys.has(vertex.key));
      selectedPath = findBestPathFromSourceToOutgoingEndpoint(
        interiorSourceVertices,
        connection.endpoint,
        riverGraph,
        usedRiverEdges,
        {
          occupiedVertexKeys: existingRiverVertexKeys,
          allowedOccupiedVertexKeys: new Set([connection.endpoint.vertex.key])
        }
      );
    }

    if (!selectedPath) {
      console.warn('Could not connect remaining outgoing river', {
        regionId: region.id,
        outgoingRiverId: connection.river.id,
        downstreamRegionId: connection.downstreamRegion.id,
        availableLakeCount: availableLakes.length,
      });
      skippedRiverIds.add(connection.river.id);
      continue;
    }

    const pathEdgeKeys = getRiverPathEdgeKeys(selectedPath, riverGraph);
    if (!pathEdgeKeys || pathEdgeKeys.some((pathEdgeKey) => usedRiverEdges.has(pathEdgeKey))) {
      console.warn('Remaining outgoing river connector failed edge validation', {
        regionId: region.id,
        outgoingRiverId: connection.river.id,
      });
      skippedRiverIds.add(connection.river.id);
      continue;
    }

    if (selectedLake) usedLakeIds.add(selectedLake.lakeId);
    const connectorFullness = getOutgoingInteriorConnectorFullness(
      connection.river,
      connection.endpoint.vertex.key,
      Boolean(selectedLake)
    );
    nextRivers = prependOutgoingRiverConnection(
      nextRivers,
      connection,
      selectedPath,
      connectorFullness,
      region.id
    );

    for (const river of nextRivers) {
      validateRiverDirection(river);
      validateRiverContinuity(river);
    }
    validateNoDuplicateRiverEdges(nextRivers);

    console.log('Connected remaining outgoing river', {
      regionId: region.id,
      outgoingRiverId: connection.river.id,
      downstreamRegionId: connection.downstreamRegion.id,
      mode: selectedLake ? 'lake_to_outgoing' : 'interior_source_to_outgoing',
      lakeId: selectedLake?.lakeId ?? null,
      connectorFullness,
    });
  }

  return nextRivers;
}

function finalizeRiverGenerationForRegion(
  region: Region,
  regions: Region[],
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateHexes: AxialHex[],
  candidateVertices: RiverVertex[],
  neighborRegionVertices: RiverVertex[]
): RiverGenerationResult {
  const riversAfterExistingLogic = tryAddSmallTributaryRiver(region, terrainMap, riverGraph, rivers, candidateHexes);
  const riversWithMinimumMountainRivers = ensureMinimumMountainRiversForRegion(
    region,
    regions,
    riversAfterExistingLogic,
    riverGraph,
    candidateHexes,
    candidateVertices,
    neighborRegionVertices
  );
  const riversWithRemainingIncomingConnected = connectRemainingIncomingRiversForRegion(
    region,
    terrainMap,
    riverGraph,
    riversWithMinimumMountainRivers,
    candidateVertices
  );
  const riversWithRemainingOutgoingConnected = connectRemainingOutgoingRiversForRegion(
    region,
    regions,
    terrainMap,
    riverGraph,
    riversWithRemainingIncomingConnected,
    candidateHexes,
    candidateVertices,
    neighborRegionVertices
  );

  ensureCentralAdjacentLakeWhenNoRiverTouchesCenter(
    region,
    terrainMap,
    riverGraph,
    riversWithRemainingOutgoingConnected
  );

  return { success: true, rivers: riversWithRemainingOutgoingConnected };
}

function generateRiverForRegion(
  region: Region,
  regions: Region[],
  existingRivers: River[],
  candidateHexes?: AxialHex[],
  hexTerrainByKey?: Map<string, HexTerrainData>
): RiverGenerationResult {
  try {
    const terrainMap = hexTerrainByKey ?? new Map<string, HexTerrainData>();
    const coastalEndpointHexes = getCoastalRiverEndpointHexes(region, candidateHexes ?? [], terrainMap);
    const riverBoundaryHexes = uniqueHexes([...(candidateHexes ?? []), ...coastalEndpointHexes]);
    const riverGraph = buildRiverGraphForRegion(region.hexes, region.hexes, riverBoundaryHexes);
    const { candidateVertices, neighborRegionVertices } = getRegionSharedVertices(region, regions, riverBoundaryHexes);
    const coastalEndpointVertices = coastalEndpointHexes.length > 0
      ? getCandidateBoundaryVerticesForRegion(region.hexes, coastalEndpointHexes)
      : [];
    const orangeKeys = new Set(neighborRegionVertices.map((vertex) => vertex.key));
    const redVertices = candidateVertices.filter((vertex) => !orangeKeys.has(vertex.key));
    const purpleVertices = region.centerHex ? getHexCornerPoints(region.centerHex) : [];
    const existingRiverEndpointVerticesInRegion = getExistingRiverEndpointVerticesInRegion(region, existingRivers, riverGraph);
    const usedRiverEdges = buildUsedRiverEdges(existingRivers);
    const existingRiverVertexKeys = new Set(existingRivers.flatMap((river) => river.vertexPath.map((vertex) => vertex.key)));
    const touchingEndpoints = findRiverEndpointsTouchingRegion(region, existingRivers, riverGraph);
    const incomingEndpoints = touchingEndpoints.filter((endpoint) => endpoint.endpointType === 'end');
    const outgoingEndpoints = touchingEndpoints.filter((endpoint) => endpoint.endpointType === 'start');
    const requireRiverThroughOriginalCenter = !(region.isCoastal && region.biomeLandType === 'settled');

    const buildMountainIncomingBoundaryFallback = (
      incomingEndpoint: RiverEndpointTouch,
      fallbackReason: string
    ): RiverGenerationResult | null => {
      const endpointPath = findBestFreeRiverPathFromEndpoints(
        [incomingEndpoint.vertex],
        redVertices,
        purpleVertices,
        riverGraph,
        new Set(usedRiverEdges),
        requireRiverThroughOriginalCenter ? region.centerHex : undefined,
        existingRiverVertexKeys,
        coastalEndpointVertices
      );

      if (!endpointPath) {
        console.warn('Mountain incoming fallback failed: no boundary path', {
          regionId: region.id,
          incomingRiverId: incomingEndpoint.riverId,
          fallbackReason,
        });
        return null;
      }

      const { controlPoints, path } = endpointPath;
      if (!validateRiverPathViaControlPoints(
        path,
        controlPoints,
        riverGraph,
        redVertices,
        [incomingEndpoint.vertex],
        usedRiverEdges,
        existingRiverVertexKeys,
        new Set([incomingEndpoint.vertex.key])
      )) {
        console.warn('Mountain incoming fallback failed: boundary path validation failed', {
          regionId: region.id,
          incomingRiverId: incomingEndpoint.riverId,
          fallbackReason,
        });
        return null;
      }
      const nextRivers = existingRivers.map((river) => {
        if (river.id !== incomingEndpoint.riverId) return river;
        return {
          ...river,
          vertexPath: [...river.vertexPath, ...path.slice(1)],
          sectors: appendRiverPathSector(river, path, getRiverDownstreamFullness(river), region.id)
        };
      });

      for (const river of nextRivers) {
        validateRiverDirection(river);
        validateRiverContinuity(river);
      }
      validateNoDuplicateRiverEdges(nextRivers);

      console.log('Mountain incoming fallback: incoming river extended to boundary; outgoing rivers will be connected separately', {
        regionId: region.id,
        incomingRiverId: incomingEndpoint.riverId,
        fallbackReason,
      });
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
    };

    if (region.heightLevel === 3) {
      const fullnessTwoOrThreeOutgoingEndpoints = outgoingEndpoints
        .map((endpoint) => {
          const river = existingRivers.find((item) => item.id === endpoint.riverId);
          const fullness = river ? getRiverEndpointSectorFullness(river, endpoint.vertex.key) : null;
          return fullness === 2 || fullness === 3 ? { endpoint, fullness } : null;
        })
        .filter((item): item is { endpoint: RiverEndpointTouch; fullness: 2 | 3 } => item !== null)
        .sort((a, b) => b.fullness - a.fullness || a.endpoint.riverId - b.endpoint.riverId);
      const mainOutgoingEndpoint = fullnessTwoOrThreeOutgoingEndpoints[0]?.endpoint;

      if (mainOutgoingEndpoint) {
        let bestPath: RiverVertex[] | null = null;
        let bestControlPoints: RiverControlPoints | null = null;
        const redVerticesByDistance = [...redVertices].sort((a, b) => (
          getRiverVertexDistance(b, mainOutgoingEndpoint.vertex) - getRiverVertexDistance(a, mainOutgoingEndpoint.vertex)
        ));
        const middlePool = purpleVertices.length > 0 ? purpleVertices : [undefined];

        for (const startVertex of redVerticesByDistance) {
          if (startVertex.key === mainOutgoingEndpoint.vertex.key) continue;
          for (const middlePurpleVertex of middlePool) {
            const controlPoints: RiverControlPoints = {
              startVertex,
              ...(middlePurpleVertex ? { middlePurpleVertex } : {}),
              endVertex: mainOutgoingEndpoint.vertex,
              startMode: 'red vertex',
              endMode: 'existing river endpoint'
            };
            const path = buildRiverPathViaControlPoints(controlPoints, riverGraph, usedRiverEdges);
            if (path.length < 2) continue;
            if (path[0].key !== startVertex.key || path[path.length - 1].key !== mainOutgoingEndpoint.vertex.key) continue;
            if (middlePurpleVertex && !path.some((vertex) => vertex.key === middlePurpleVertex.key)) continue;
            if (new Set(path.map((vertex) => vertex.key)).size !== path.length) continue;
            const pathEdgeKeys = getRiverPathEdgeKeys(path, riverGraph);
            if (!pathEdgeKeys) continue;
            if (hasDuplicateEdgeKeys(pathEdgeKeys)) continue;
            if (pathEdgeKeys.some((pathEdgeKey) => usedRiverEdges.has(pathEdgeKey))) continue;
            if (!riverPathAvoidsOccupiedVertices(path, existingRiverVertexKeys, new Set([mainOutgoingEndpoint.vertex.key]))) continue;
            const firstEdge = riverGraph.edges.get(edgeKey(path[0], path[1]));
            if (!firstEdge?.isRegionBoundaryEdge) continue;

            if (!bestPath || path.length < bestPath.length) {
              bestPath = path;
              bestControlPoints = controlPoints;
            }
          }
        }

        if (!bestPath || !bestControlPoints) {
          console.warn('Could not extend fullness-2/3 outgoing mountain river from candidate boundary through center', {
            regionId: region.id,
            outgoingRiverId: mainOutgoingEndpoint.riverId,
            redVertexCount: redVertices.length,
          });
          return { success: false, rivers: existingRivers, reason: 'mountain_fullness_two_or_three_outgoing_path_not_found' };
        }

        const outgoingRiver = existingRivers.find((river) => river.id === mainOutgoingEndpoint.riverId);
        const outgoingFullness = outgoingRiver
          ? getRiverEndpointSectorFullness(outgoingRiver, mainOutgoingEndpoint.vertex.key)
          : 2;
        const nextRivers = existingRivers.map((river) => {
          if (river.id !== mainOutgoingEndpoint.riverId) return river;
          return {
            ...river,
            vertexPath: [...bestPath.slice(0, -1), ...river.vertexPath],
            sectors: prependRiverPathSector(river, bestPath, getOutgoingConnectorFullnessFromEndpoint(outgoingFullness, false), region.id),
            controlPoints: bestControlPoints
          };
        });

        for (const river of nextRivers) {
          validateRiverDirection(river);
          validateRiverContinuity(river);
        }
        validateNoDuplicateRiverEdges(nextRivers);
        return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
      }
    }

    if (region.heightLevel === 3 && outgoingEndpoints.length > 0) {
      const sortedOutgoingEndpoints = [...outgoingEndpoints].sort((a, b) => a.riverId - b.riverId);
      const sortedIncomingEndpointsForMain = [...incomingEndpoints].sort((a, b) => a.riverId - b.riverId);
      const mainIncomingEndpoint = sortedIncomingEndpointsForMain[0];
      const mainOutgoingEndpoint = mainIncomingEndpoint
        ? sortedOutgoingEndpoints.find((endpoint) => !wouldCreateRiverDrainageCycle(existingRivers, mainIncomingEndpoint.riverId, endpoint.riverId))
        : sortedOutgoingEndpoints[0];
      if (!mainOutgoingEndpoint) {
        const fallbackResult = mainIncomingEndpoint
          ? buildMountainIncomingBoundaryFallback(mainIncomingEndpoint, 'mountain_main_outgoing_would_create_cycle')
          : null;
        return fallbackResult ?? { success: false, rivers: existingRivers, reason: 'mountain_main_outgoing_would_create_cycle' };
      }
      const secondaryOutgoingEndpoints = sortedOutgoingEndpoints.filter((endpoint) => endpoint.riverId !== mainOutgoingEndpoint.riverId);
      let nextRivers = existingRivers;
      const blockedEdgeKeys = new Set(usedRiverEdges);
      const usedLakeIds = new Set<number>();
      const interiorSourceVertices = getMountainInteriorSourceVertices(region, regions, candidateHexes ?? [], riverGraph, candidateVertices, neighborRegionVertices);

      console.log('Mountain region with outgoing rivers', {
        regionId: region.id,
        incomingRiverIds: incomingEndpoints.map((endpoint) => endpoint.riverId),
        outgoingRiverIds: sortedOutgoingEndpoints.map((endpoint) => endpoint.riverId),
        mainOutgoingRiverId: mainOutgoingEndpoint.riverId,
      });
      console.log('Connecting main mountain outgoing river', {
        regionId: region.id,
        mainOutgoingRiverId: mainOutgoingEndpoint.riverId,
        mode: incomingEndpoints.length > 0 ? 'incoming_to_outgoing' : 'interior_source_to_outgoing_through_center',
      });

      if (incomingEndpoints.length > 0) {
        if (!mainIncomingEndpoint) return { success: false, rivers: existingRivers, reason: 'mountain_main_incoming_not_found' };
        if (!canConnectIncomingToOutgoingByRegionHeight(region, regions, mainIncomingEndpoint, mainOutgoingEndpoint)) {
          const fallbackResult = buildMountainIncomingBoundaryFallback(mainIncomingEndpoint, 'mountain_main_outgoing_height_incompatible');
          return fallbackResult ?? { success: false, rivers: existingRivers, reason: 'mountain_main_outgoing_height_incompatible' };
        }
        const connectorPath = findBestConnectorPathBetweenRiverEndpoints(
          mainIncomingEndpoint.vertex,
          mainOutgoingEndpoint.vertex,
          purpleVertices,
          riverGraph,
          blockedEdgeKeys,
          existingRiverVertexKeys
        );
        const connectorEdgeKeys = connectorPath ? getRiverPathEdgeKeys(connectorPath, riverGraph) : null;
        if (!connectorPath || !connectorEdgeKeys) {
          const fallbackResult = buildMountainIncomingBoundaryFallback(mainIncomingEndpoint, 'mountain_main_outgoing_connector_not_found');
          return fallbackResult ?? { success: false, rivers: existingRivers, reason: 'mountain_main_outgoing_connector_not_found' };
        }
        const connectorSplit = buildConnectorSplitForFullnessDrop(
          existingRivers,
          mainIncomingEndpoint.riverId,
          mainIncomingEndpoint.vertex,
          mainOutgoingEndpoint.riverId,
          mainOutgoingEndpoint.vertex,
          connectorPath
        );
        if (connectorSplit === null) {
          const fallbackResult = buildMountainIncomingBoundaryFallback(mainIncomingEndpoint, 'mountain_main_outgoing_fullness_drop_split_not_found');
          return fallbackResult ?? { success: false, rivers: existingRivers, reason: 'mountain_main_outgoing_fullness_drop_split_not_found' };
        }
        const merged = mergeRiversWithConnector(nextRivers, mainIncomingEndpoint.riverId, mainOutgoingEndpoint.riverId, connectorPath, undefined, region.id, connectorSplit);
        if (!merged) {
          const fallbackResult = buildMountainIncomingBoundaryFallback(mainIncomingEndpoint, 'mountain_main_outgoing_merge_failed');
          return fallbackResult ?? { success: false, rivers: existingRivers, reason: 'mountain_main_outgoing_merge_failed' };
        }
        const tributaryIncomingEndpoints = incomingEndpoints
          .filter((endpoint) => endpoint.riverId !== mainIncomingEndpoint.riverId);
        const mergedWithTributaries = connectIncomingTributariesToMainPath(
          region,
          merged,
          tributaryIncomingEndpoints,
          connectorPath,
          riverGraph,
          new Set([...blockedEdgeKeys, ...connectorEdgeKeys]),
          existingRiverVertexKeys
        );
        if (!mergedWithTributaries) {
          const fallbackResult = buildMountainIncomingBoundaryFallback(mainIncomingEndpoint, 'mountain_incoming_tributary_to_through_river_not_found');
          return fallbackResult ?? { success: false, rivers: existingRivers, reason: 'mountain_incoming_tributary_to_through_river_not_found' };
        }
        addConnectorSplitLakeIfNeeded(region, terrainMap, connectorSplit);
        nextRivers = mergedWithTributaries;
        for (const edgeKey of connectorEdgeKeys) blockedEdgeKeys.add(edgeKey);
      } else {
        const mainPath = findBestPathFromSourceToOutgoingEndpoint(interiorSourceVertices, mainOutgoingEndpoint, riverGraph, blockedEdgeKeys, {
          occupiedVertexKeys: existingRiverVertexKeys,
          allowedOccupiedVertexKeys: new Set([mainOutgoingEndpoint.vertex.key])
        });
        if (!mainPath) return { success: false, rivers: existingRivers, reason: 'mountain_main_outgoing_source_path_not_found' };
        nextRivers = nextRivers.map((river) => river.id !== mainOutgoingEndpoint.riverId
          ? river
          : { ...river, vertexPath: [...mainPath.slice(0, -1), ...river.vertexPath], sectors: prependRiverPathSector(river, mainPath, getOutgoingInteriorConnectorFullness(river, mainOutgoingEndpoint.vertex.key, false), region.id) });
        const mainPathEdgeKeys = getRiverPathEdgeKeys(mainPath, riverGraph);
        if (!mainPathEdgeKeys) return { success: false, rivers: existingRivers, reason: 'mountain_main_outgoing_edge_keys_not_found' };
        for (const edgeKey of mainPathEdgeKeys) blockedEdgeKeys.add(edgeKey);
      }

      for (const outgoingEndpoint of secondaryOutgoingEndpoints) {
        const lakes = getLakesForRegion(region, terrainMap);
        const availableLakes = lakes.filter((lake) => !usedLakeIds.has(lake.lakeId));
        let selectedLake: { lakeId: number; hexes: AxialHex[]; vertices: RiverVertex[] } | null = null;
        let selectedPath: RiverVertex[] | null = null;
        for (const lake of availableLakes) {
          const lakePath = findBestPathFromLakeToOutgoingEndpoint(lake.vertices, outgoingEndpoint, riverGraph, blockedEdgeKeys, existingRiverVertexKeys);
          if (lakePath && (!selectedPath || lakePath.length < selectedPath.length)) {
            selectedLake = lake;
            selectedPath = lakePath;
          }
        }
        if (!selectedPath) {
          selectedPath = findBestPathFromSourceToOutgoingEndpoint(interiorSourceVertices, outgoingEndpoint, riverGraph, blockedEdgeKeys, {
            occupiedVertexKeys: existingRiverVertexKeys,
            allowedOccupiedVertexKeys: new Set([outgoingEndpoint.vertex.key])
          });
        } else if (selectedLake) {
          usedLakeIds.add(selectedLake.lakeId);
        }
        if (!selectedPath) {
          console.warn('Could not eagerly connect secondary mountain outgoing river; deferring to final outgoing connector pass', {
            regionId: region.id,
            outgoingRiverId: outgoingEndpoint.riverId,
          });
          continue;
        }
        const pathEdgeKeys = getRiverPathEdgeKeys(selectedPath, riverGraph);
        if (!pathEdgeKeys) {
          console.warn('Secondary mountain outgoing river has invalid edge keys; deferring to final outgoing connector pass', {
            regionId: region.id,
            outgoingRiverId: outgoingEndpoint.riverId,
          });
          continue;
        }
        nextRivers = nextRivers.map((river) => river.id !== outgoingEndpoint.riverId
          ? river
          : { ...river, vertexPath: [...selectedPath.slice(0, -1), ...river.vertexPath], sectors: prependRiverPathSector(river, selectedPath, getOutgoingInteriorConnectorFullness(river, outgoingEndpoint.vertex.key, Boolean(selectedLake)), region.id) });
        for (const edgeKey of pathEdgeKeys) blockedEdgeKeys.add(edgeKey);
        console.log('Connecting secondary mountain outgoing river', {
          regionId: region.id,
          outgoingRiverId: outgoingEndpoint.riverId,
          mode: selectedLake ? 'lake_to_outgoing' : 'interior_source_to_outgoing',
          lakeId: selectedLake?.lakeId ?? null,
        });
      }

      for (const river of nextRivers) {
        validateRiverDirection(river);
        validateRiverContinuity(river);
      }
      validateNoDuplicateRiverEdges(nextRivers);
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
    }

    if (incomingEndpoints.length >= 2 && outgoingEndpoints.length === 0) {
      const getIncomingEndpointFullness = (endpoint: RiverEndpointTouch): RiverFullness => {
        const river = existingRivers.find((item) => item.id === endpoint.riverId);
        return river ? getRiverEndpointSectorFullness(river, endpoint.vertex.key) : 1;
      };
      const sortedIncomingEndpoints = [...incomingEndpoints].sort((a, b) => (
        getIncomingEndpointFullness(b) - getIncomingEndpointFullness(a)
        || a.riverId - b.riverId
      ));
      const mainIncomingEndpoint = sortedIncomingEndpoints[0];
      const tributaryIncomingEndpoints = sortedIncomingEndpoints.slice(1);
      const blockedEdgeKeys = new Set(usedRiverEdges);

      console.log('Multiple incoming rivers: building main river and tributaries', {
        regionId: region.id,
        incomingRiverIds: sortedIncomingEndpoints.map((endpoint) => endpoint.riverId),
        incomingRiverFullnesses: sortedIncomingEndpoints.map((endpoint) => ({
          riverId: endpoint.riverId,
          fullness: getIncomingEndpointFullness(endpoint),
        })),
        mainRiverId: mainIncomingEndpoint.riverId,
        mainRiverFullness: getIncomingEndpointFullness(mainIncomingEndpoint),
        tributaryRiverIds: tributaryIncomingEndpoints.map((endpoint) => endpoint.riverId),
      });

      const mainEndpointPath = findBestFreeRiverPathFromEndpoints(
        [mainIncomingEndpoint.vertex],
        redVertices,
        purpleVertices,
        riverGraph,
        blockedEdgeKeys,
        requireRiverThroughOriginalCenter ? region.centerHex : undefined,
        existingRiverVertexKeys,
        coastalEndpointVertices
      );
      if (!mainEndpointPath) return { success: false, rivers: existingRivers, reason: 'main_incoming_river_path_not_found' };
      const { controlPoints: mainControlPoints, path: mainPath } = mainEndpointPath;
      if (!validateRiverPathViaControlPoints(
        mainPath,
        mainControlPoints,
        riverGraph,
        redVertices,
        [mainIncomingEndpoint.vertex],
        blockedEdgeKeys,
        existingRiverVertexKeys,
        new Set([mainIncomingEndpoint.vertex.key])
      )) {
        return { success: false, rivers: existingRivers, reason: 'main_incoming_river_validation_failed' };
      }
      const mainRiver = existingRivers.find((river) => river.id === mainIncomingEndpoint.riverId);
      if (!mainRiver) return { success: false, rivers: existingRivers, reason: 'main_incoming_river_not_found' };

      const mainPathEdgeKeys = getRiverPathEdgeKeys(mainPath, riverGraph);
      if (!mainPathEdgeKeys) return { success: false, rivers: existingRivers, reason: 'main_incoming_river_edge_keys_not_found' };
      for (const edgeKey of mainPathEdgeKeys) blockedEdgeKeys.add(edgeKey);

      const mainBuiltPath = mainEndpointPath.path;
      const tributaryTargetVertices = mainBuiltPath.slice(1, -1);

      console.log('Tributary target vertices for main river', {
        regionId: region.id,
        mainRiverId: mainIncomingEndpoint.riverId,
        mainBuiltPathLength: mainBuiltPath.length,
        tributaryTargetVerticesCount: tributaryTargetVertices.length,
        excludedStartVertex: mainBuiltPath[0]?.key,
        excludedEndVertex: mainBuiltPath[mainBuiltPath.length - 1]?.key,
      });

      if (tributaryTargetVertices.length === 0) {
        console.warn('Main river has no internal vertices for tributary connection', {
          regionId: region.id,
          mainRiverId: mainIncomingEndpoint.riverId,
          mainBuiltPathLength: mainBuiltPath.length,
        });
        return {
          success: false,
          rivers: existingRivers,
          reason: 'main_river_has_no_internal_vertices_for_tributaries',
        };
      }

      const excludedTributaryTargetVertexKeys = new Set<string>([
        mainBuiltPath[0]?.key,
        mainBuiltPath[mainBuiltPath.length - 1]?.key,
      ].filter((key): key is string => Boolean(key)));

      const tributaryPathByRiverId = new Map<number, RiverVertex[]>();
      for (const endpoint of tributaryIncomingEndpoints) {
        const tributaryPath = findBestFreeRiverPathToAnyTarget(
          endpoint.vertex,
          tributaryTargetVertices,
          riverGraph,
          blockedEdgeKeys,
          excludedTributaryTargetVertexKeys,
          existingRiverVertexKeys,
          new Set([endpoint.vertex.key])
        );
        if (!tributaryPath) {
          console.warn('Could not connect tributary to main river', {
            regionId: region.id,
            tributaryRiverId: endpoint.riverId,
            mainRiverId: mainIncomingEndpoint.riverId,
          });
          return { success: false, rivers: existingRivers, reason: 'tributary_path_not_found' };
        }
        const tributaryPathEdgeKeys = getRiverPathEdgeKeys(tributaryPath, riverGraph);
        if (!tributaryPathEdgeKeys) return { success: false, rivers: existingRivers, reason: 'tributary_edge_keys_not_found' };
        for (const edgeKey of tributaryPathEdgeKeys) blockedEdgeKeys.add(edgeKey);
        tributaryPathByRiverId.set(endpoint.riverId, tributaryPath);
      }

      const nextRivers = existingRivers.map((river) => {
        if (river.id === mainIncomingEndpoint.riverId) {
          return { ...river, vertexPath: [...river.vertexPath, ...mainPath.slice(1)], sectors: appendRiverPathSector(river, mainPath, getRiverDownstreamFullness(river), region.id) };
        }
        const tributaryPath = tributaryPathByRiverId.get(river.id);
        if (tributaryPath) {
          return { ...river, vertexPath: [...river.vertexPath, ...tributaryPath.slice(1)], sectors: appendRiverPathSector(river, tributaryPath, getRiverDownstreamFullness(river), region.id) };
        }
        return river;
      });

      for (const river of nextRivers) {
        validateRiverDirection(river);
        validateRiverContinuity(river);
      }
      validateNoDuplicateRiverEdges(nextRivers);
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
    }

    if (touchingEndpoints.length >= 2) {
      const candidatePairs = touchingEndpoints.flatMap((left) => touchingEndpoints
        .filter((right) => right.riverId !== left.riverId)
        .map((right) => ({ left, right })))
        .filter(({ left, right }) => left.endpointType === 'end' && right.endpointType === 'start');

      if (candidatePairs.length > 0) {
        const validConnectors = candidatePairs
          .filter((pair) => !wouldCreateRiverDrainageCycle(existingRivers, pair.left.riverId, pair.right.riverId))
          .filter((pair) => canConnectIncomingToOutgoingByRegionHeight(region, regions, pair.left, pair.right))
          .map((pair) => {
            const connectorPath = findBestConnectorPathBetweenRiverEndpoints(
              pair.left.vertex,
              pair.right.vertex,
              purpleVertices,
              riverGraph,
              usedRiverEdges,
              existingRiverVertexKeys
            );
            if (!connectorPath) return null;
            const connectorEdgeKeys = getRiverPathEdgeKeys(connectorPath, riverGraph);
            if (!connectorEdgeKeys) return null;
            const connectorSplit = buildConnectorSplitForFullnessDrop(
              existingRivers,
              pair.left.riverId,
              pair.left.vertex,
              pair.right.riverId,
              pair.right.vertex,
              connectorPath
            );
            if (connectorSplit === null) return null;
            return { pair, connectorPath, connectorSplit };
          })
          .filter((candidate): candidate is { pair: { left: RiverEndpointTouch; right: RiverEndpointTouch }; connectorPath: RiverVertex[]; connectorSplit: RiverConnectorSplit } => candidate !== null)
          .sort((a, b) => a.connectorPath.length - b.connectorPath.length);

        const bestConnector = validConnectors[0];
        if (bestConnector) {
          const merged = mergeRiversWithConnector(
            existingRivers,
            bestConnector.pair.left.riverId,
            bestConnector.pair.right.riverId,
            bestConnector.connectorPath,
            undefined,
            region.id,
            bestConnector.connectorSplit
          );
          if (merged) {
            const connectorEdgeKeys = getRiverPathEdgeKeys(bestConnector.connectorPath, riverGraph);
            const blockedEdgeKeysWithConnector = new Set(usedRiverEdges);
            for (const edgeKey of connectorEdgeKeys ?? []) blockedEdgeKeysWithConnector.add(edgeKey);
            const tributaryIncomingEndpoints = incomingEndpoints
              .filter((endpoint) => endpoint.riverId !== bestConnector.pair.left.riverId);
            const mergedWithTributaries = connectIncomingTributariesToMainPath(
              region,
              merged,
              tributaryIncomingEndpoints,
              bestConnector.connectorPath,
              riverGraph,
              blockedEdgeKeysWithConnector,
              existingRiverVertexKeys
            );
            if (!mergedWithTributaries) {
              return { success: false, rivers: existingRivers, reason: 'incoming_tributary_to_through_river_not_found' };
            }
            addConnectorSplitLakeIfNeeded(region, terrainMap, bestConnector.connectorSplit);
            for (const river of mergedWithTributaries) {
              validateRiverDirection(river);
              validateRiverContinuity(river);
            }
            validateNoDuplicateRiverEdges(mergedWithTributaries);
            return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, mergedWithTributaries, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
          }
        } else {
          console.warn('Could not connect river pair: no free connector path', {
            regionId: region.id,
            candidatePairs,
          });
        }
      } else {
        console.warn('Cannot merge rivers automatically: no valid end->start pair', { regionId: region.id, touchingEndpoints });
      }
    }

    void outgoingEndpoints;

    if (existingRiverEndpointVerticesInRegion.length > 0 && redVertices.length < 1) return { success: false, rivers: existingRivers, reason: 'no_red_vertices_for_extension' };
    if (existingRiverEndpointVerticesInRegion.length === 0 && redVertices.length < 2) {
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, existingRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
    }
    if (existingRiverEndpointVerticesInRegion.length > 0) {
      const bestEndpointPath = findBestFreeRiverPathFromEndpoints(
        existingRiverEndpointVerticesInRegion,
        redVertices,
        purpleVertices,
        riverGraph,
        usedRiverEdges,
        requireRiverThroughOriginalCenter ? region.centerHex : undefined,
        existingRiverVertexKeys,
        coastalEndpointVertices
      );

      if (!bestEndpointPath) {
        console.warn('Could not extend river in region: no valid free path', {
          regionId: region.id,
          endpointCount: existingRiverEndpointVerticesInRegion.length,
          redVertexCount: redVertices.length,
          usedRiverEdgeCount: usedRiverEdges.size
        });
        return { success: false, rivers: existingRivers, reason: 'river_does_not_touch_center_hex' };
      }

      const { controlPoints, path } = bestEndpointPath;
      if (!validateRiverPathViaControlPoints(
        path,
        controlPoints,
        riverGraph,
        redVertices,
        existingRiverEndpointVerticesInRegion,
        usedRiverEdges,
        existingRiverVertexKeys,
        new Set([controlPoints.startVertex.key])
      )) {
        console.warn('Could not extend river in region: no valid free path', {
          regionId: region.id,
          endpointCount: existingRiverEndpointVerticesInRegion.length,
          redVertexCount: redVertices.length,
          usedRiverEdgeCount: usedRiverEdges.size
        });
        return { success: false, rivers: existingRivers, reason: 'endpoint_path_validation_failed' };
      }
      const connection = findRiverConnectionByStartVertex(existingRivers, controlPoints.startVertex);
      if (!connection) return { success: false, rivers: existingRivers, reason: 'endpoint_connection_not_found' };

      const nextRivers = existingRivers.map((river) => {
        if (river.id !== connection.riverId) return river;
        if (connection.type === 'end') {
          return { ...river, vertexPath: [...river.vertexPath, ...path.slice(1)], sectors: appendRiverPathSector(river, path, getRiverDownstreamFullness(river), region.id) };
        }
        return { ...river, vertexPath: [...reverseRiverPath(path).slice(0, -1), ...river.vertexPath], sectors: prependRiverPathSector(river, reverseRiverPath(path), chooseRiverFullnessFromAdjacentSectors(reverseRiverPath(path), existingRivers, getNewRiverFullnessForHeight(region.heightLevel)), region.id) };
      });

      for (const river of nextRivers) validateRiverDirection(river);
      validateNoDuplicateRiverEdges(nextRivers);
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
    }

    if (region.heightLevel === 3) {
      const interiorStartVertices = getMountainInteriorSourceVertices(region, regions, candidateHexes ?? [], riverGraph, candidateVertices, neighborRegionVertices)
        .filter((vertex) => !existingRiverVertexKeys.has(vertex.key));
      const centerVertexKeys = new Set(getHexCornerPoints(region.centerHex).map((vertex) => vertex.key));
      const preferredStartVertices = interiorStartVertices.filter((vertex) => !centerVertexKeys.has(vertex.key));

      const findBestMountainSourcePath = (startVertices: RiverVertex[]) => {
        let bestPath: RiverVertex[] | null = null;
        let bestControlPoints: RiverControlPoints | null = null;
        const coastalEndpointKeys = new Set(coastalEndpointVertices.map((vertex) => vertex.key));
        const endVertices = coastalEndpointKeys.size > 0
          ? redVertices.filter((vertex) => coastalEndpointKeys.has(vertex.key))
          : redVertices;
        for (const startVertex of startVertices) {
          for (const endVertex of endVertices) {
            if (startVertex.key === endVertex.key) continue;
            const controlPoints: RiverControlPoints = { startVertex, endVertex, startMode: 'mountain source', endMode: 'red vertex' };
            const path = buildRiverPathViaControlPoints(controlPoints, riverGraph, usedRiverEdges);
            if (!validateRiverPathViaControlPoints(
              path,
              controlPoints,
              riverGraph,
              redVertices,
              existingRiverEndpointVerticesInRegion,
              usedRiverEdges,
              existingRiverVertexKeys
            )) continue;
            if (requireRiverThroughOriginalCenter && !riverPathTouchesCenterHexVertex(path, region.centerHex)) continue;
            if (!bestPath || path.length < bestPath.length) {
              bestPath = path;
              bestControlPoints = controlPoints;
            }
          }
        }
        return { bestPath, bestControlPoints };
      };

      let { bestPath, bestControlPoints } = findBestMountainSourcePath(preferredStartVertices);
      let usedFallback = false;
      if (!bestPath || !bestControlPoints) {
        usedFallback = true;
        ({ bestPath, bestControlPoints } = findBestMountainSourcePath(interiorStartVertices));
      }

      console.log('mountain-source-branch:', {
        regionId: region.id,
        interiorStartVerticesLength: interiorStartVertices.length,
        preferredStartVerticesLength: preferredStartVertices.length,
        usedFallback,
        selectedStartVertexKey: bestControlPoints?.startVertex.key ?? null,
        selectedStartIsCenterHexVertex: bestControlPoints ? centerVertexKeys.has(bestControlPoints.startVertex.key) : null
      });

      if (!bestPath || !bestControlPoints) {
        return { success: false, rivers: existingRivers, reason: 'mountain_source_river_path_not_found' };
      }

      const newRiverId = (existingRivers[existingRivers.length - 1]?.id ?? 0) + 1;
      const river: River = {
        id: newRiverId,
        regionId: region.id,
        vertexPath: bestPath,
        sectors: createInitialRiverSectors(newRiverId, bestPath, chooseRiverFullnessFromAdjacentSectors(bestPath, existingRivers, getNewRiverFullnessForHeight(region.heightLevel)), {}, region.id),
        controlPoints: bestControlPoints
      };
      const nextRivers = [...existingRivers, river];
      for (const nextRiver of nextRivers) {
        validateRiverDirection(nextRiver);
        validateRiverContinuity(nextRiver);
      }
      validateNoDuplicateRiverEdges(nextRivers);
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
    }

    const RANDOM_PAIR_ATTEMPTS = 50;
    const orderedRedStartVertices = existingRiverEndpointVerticesInRegion.length === 0
      ? orderRedRiverStartVerticesBySeaDistance(redVertices, terrainMap)
      : redVertices;
    for (let attempt = 0; attempt < RANDOM_PAIR_ATTEMPTS; attempt += 1) {
      const preferredStartVertex = orderedRedStartVertices[attempt % orderedRedStartVertices.length];
      const controlPoints = chooseRandomRiverControlPoints(
        redVertices,
        purpleVertices,
        existingRiverEndpointVerticesInRegion,
        preferredStartVertex,
        coastalEndpointVertices
      );
      if (!controlPoints) continue;
      const path = buildRiverPathViaControlPoints(controlPoints, riverGraph, usedRiverEdges);
      if (!validateRiverPathViaControlPoints(path, controlPoints, riverGraph, redVertices, existingRiverEndpointVerticesInRegion, usedRiverEdges)) continue;
      const connection = controlPoints.startMode === 'existing river endpoint'
        ? findRiverConnectionByStartVertex(existingRivers, controlPoints.startVertex)
        : null;

      let nextRivers: River[];
      if (connection) {
        nextRivers = existingRivers.map((river) => {
          if (river.id !== connection.riverId) return river;
          const extensionPath = connection.type === 'start' ? reverseRiverPath(path) : path;
          const mergedPath = connection.type === 'start'
            ? [...extensionPath.slice(0, -1), ...river.vertexPath]
            : [...river.vertexPath, ...extensionPath.slice(1)];
          return { ...river, vertexPath: mergedPath, sectors: connection.type === 'start'
            ? prependRiverPathSector(river, extensionPath, chooseRiverFullnessFromAdjacentSectors(extensionPath, existingRivers, getNewRiverFullnessForHeight(region.heightLevel)), region.id)
            : appendRiverPathSector(river, extensionPath, getRiverDownstreamFullness(river), region.id) };
        });
      } else {
        const newRiverId = (existingRivers[existingRivers.length - 1]?.id ?? 0) + 1;
        const river: River = {
          id: newRiverId,
          regionId: region.id,
          vertexPath: path,
          sectors: createInitialRiverSectors(newRiverId, path, chooseRiverFullnessFromAdjacentSectors(path, existingRivers, getNewRiverFullnessForHeight(region.heightLevel)), {}, region.id),
          controlPoints
        };
        nextRivers = [...existingRivers, river];
      }

      for (const river of nextRivers) validateRiverDirection(river);
      validateNoDuplicateRiverEdges(nextRivers);
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices);
    }
  } catch (error) {
    console.warn('river generation failed', { regionId: region.id, error });
    return { success: false, rivers: existingRivers, reason: 'exception' };
  }

  return { success: false, rivers: existingRivers, reason: 'no_valid_random_path' };
}

function renderRiverSegments(river: River, offsetX: number, offsetY: number, lakeEdgeKeys: Set<string>) {
  const hexWidth = getHexWidth(HEX_SIZE);
  const fullnessByEdge = getRiverSectorFullnessByEdge(river);
  const fallbackFullness = getRiverFallbackFullness(river);
  const segments: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; width: number }> = [];
  for (let i = 1; i < river.vertexPath.length; i += 1) {
    const start = river.vertexPath[i - 1];
    const end = river.vertexPath[i];
    const segmentEdgeKey = edgeKey(start, end);
    if (isLakeEdge(segmentEdgeKey, lakeEdgeKeys)) continue;
    segments.push({
      key: `river-segment-${river.id}-${i}`,
      x1: start.x + offsetX,
      y1: start.y + offsetY,
      x2: end.x + offsetX,
      y2: end.y + offsetY,
      width: getRiverWidth(hexWidth, fullnessByEdge.get(segmentEdgeKey) ?? fallbackFullness)
    });
  }
  return segments;
}

function renderRiverDirectionArrows(river: River, offsetX: number, offsetY: number, lakeEdgeKeys: Set<string>) {
  const fullnessByEdge = getRiverSectorFullnessByEdge(river);
  const fallbackFullness = getRiverFallbackFullness(river);
  const arrows: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; fullness: RiverFullness }> = [];
  for (let i = 1; i < river.vertexPath.length; i += 1) {
    const start = river.vertexPath[i - 1];
    const end = river.vertexPath[i];
    const segmentEdgeKey = edgeKey(start, end);
    if (isLakeEdge(segmentEdgeKey, lakeEdgeKeys)) continue;
    const fullness = fullnessByEdge.get(segmentEdgeKey) ?? fallbackFullness;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) continue;

    const ux = dx / length;
    const uy = dy / length;
    const arrowLength = Math.min(10 * getRiverArrowScale(fullness), length * 0.6);
    const halfArrow = arrowLength / 2;
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    arrows.push({
      key: `river-arrow-${river.id}-${i}`,
      x1: mx - ux * halfArrow + offsetX,
      y1: my - uy * halfArrow + offsetY,
      x2: mx + ux * halfArrow + offsetX,
      y2: my + uy * halfArrow + offsetY,
      fullness
    });
  }
  return arrows;
}


function getRiverPathInRegionGraph(river: River, riverGraph: RiverGraph): RiverVertex[] {
  const fullPath = river.vertexPath ?? [];
  if (fullPath.length < 2) return fullPath;

  let bestStart = 0;
  let bestEnd = fullPath.length - 1;
  let bestEdgeCount = getRiverPathEdgeKeys(fullPath, riverGraph)?.length ?? 0;
  let currentStart: number | null = null;

  for (let index = 1; index < fullPath.length; index += 1) {
    const segmentIsInGraph = riverGraph.edges.has(edgeKey(fullPath[index - 1], fullPath[index]));
    if (segmentIsInGraph) {
      if (currentStart === null) currentStart = index - 1;
      const currentEdgeCount = index - currentStart;
      if (currentEdgeCount > bestEdgeCount) {
        bestStart = currentStart;
        bestEnd = index;
        bestEdgeCount = currentEdgeCount;
      }
    } else {
      currentStart = null;
    }
  }

  if (bestEdgeCount === 0) return fullPath;
  return fullPath.slice(bestStart, bestEnd + 1);
}

function riverRegionalPathStartsAtGlobalSource(river: River, regionalPath: RiverVertex[]): boolean {
  return Boolean(regionalPath[0] && river.vertexPath?.[0]?.key === regionalPath[0].key);
}

function validateRiverEndpoints(region: Region, river: River, riverGraph: RiverGraph): RiverEndpointIssue[] {
  const issues: RiverEndpointIssue[] = [];
  if (!river.vertexPath || river.vertexPath.length < 2) return ['path_too_short'];

  const regionalPath = getRiverPathInRegionGraph(river, riverGraph);
  if (!regionalPath || regionalPath.length < 2) return ['path_too_short'];

  const start = riverGraph.nodes.get(regionalPath[0].key);
  const end = riverGraph.nodes.get(regionalPath[regionalPath.length - 1].key);
  const hasCandidateBoundary = Array.from(riverGraph.nodes.values()).some((node) => node.isCandidateBoundaryVertex);
  const startsAtGlobalSource = riverRegionalPathStartsAtGlobalSource(river, regionalPath);
  const startsInsideRegion = startsAtGlobalSource && river.controlPoints?.startMode === 'mountain source';
  const startsFromNewRegionCandidate = startsAtGlobalSource && river.controlPoints?.startMode === 'red vertex';
  if (!startsInsideRegion && !start?.isRegionBoundaryVertex) issues.push('start_not_region_boundary');
  if (!end?.isRegionBoundaryVertex) issues.push('end_not_region_boundary');
  if (hasCandidateBoundary && startsFromNewRegionCandidate && !start?.isCandidateBoundaryVertex) issues.push('start_not_candidate_boundary_when_candidates_exist');
  if (hasCandidateBoundary && !end?.isCandidateBoundaryVertex) issues.push('end_not_candidate_boundary_when_candidates_exist');
  const firstEdge = riverGraph.edges.get(edgeKey(regionalPath[0], regionalPath[1]));
  const lastEdge = riverGraph.edges.get(edgeKey(regionalPath[regionalPath.length - 2], regionalPath[regionalPath.length - 1]));
  if (startsFromNewRegionCandidate && !firstEdge?.isRegionBoundaryEdge) issues.push('first_edge_not_boundary');
  if (!lastEdge?.isRegionBoundaryEdge) issues.push('last_edge_not_boundary');
  if (hasCandidateBoundary && startsFromNewRegionCandidate && !firstEdge?.isCandidateBoundaryEdge) issues.push('first_edge_not_candidate_boundary_when_candidates_exist');
  if (hasCandidateBoundary && !lastEdge?.isCandidateBoundaryEdge) issues.push('last_edge_not_candidate_boundary_when_candidates_exist');
  if (!firstEdge || !lastEdge) issues.push('segment_not_in_graph');
  for (let i = 1; i < regionalPath.length; i += 1) {
    if (!riverGraph.edges.has(edgeKey(regionalPath[i - 1], regionalPath[i]))) {
      issues.push('segment_not_in_graph');
      break;
    }
  }
  if (region.hexes.length > 6 && regionalPath.length < 4) issues.push('path_too_short');
  return Array.from(new Set(issues));
}

function riverEndpointIssuesAreCritical(issues: RiverEndpointIssue[]): boolean {
  return false;
}

function riverTouchesRegionGraph(river: River, riverGraph: RiverGraph): boolean {
  if (river.vertexPath.some((vertex) => riverGraph.nodes.has(vertex.key))) return true;
  for (let index = 1; index < river.vertexPath.length; index += 1) {
    if (riverGraph.edges.has(edgeKey(river.vertexPath[index - 1], river.vertexPath[index]))) return true;
  }
  return false;
}

function riverHasSectorAssignedToRegion(river: River, regionId: number): boolean {
  return river.sectors?.some((sector) => sector.assignedRegionId === regionId) ?? false;
}

function restoreInvalidGeneratedRiversForRegion(
  region: Region,
  previousRivers: River[],
  nextRivers: River[],
  candidateHexes: AxialHex[]
): River[] {
  const riverGraph = buildRiverGraphForRegion(region.hexes, region.hexes, candidateHexes);
  const previousById = new Map(previousRivers.map((river) => [river.id, river]));
  const restored: River[] = [];
  const usedRiverIds = new Set<number>();

  for (const river of nextRivers) {
    const shouldCheckRiver = river.regionId === region.id
      || riverHasSectorAssignedToRegion(river, region.id)
      || riverTouchesRegionGraph(river, riverGraph);
    let nextRiver: River | null = river;

    if (shouldCheckRiver) {
      const issues = validateRiverEndpoints(region, river, riverGraph);
      if (riverEndpointIssuesAreCritical(issues)) {
        const previousRiver = previousById.get(river.id);
        console.warn(previousRiver ? 'Restoring previous river because generated segment is invalid for region' : 'Removing invalid generated river for region', {
          regionId: region.id,
          riverId: river.id,
          issues,
          startVertexKey: river.vertexPath[0]?.key,
          endVertexKey: river.vertexPath[river.vertexPath.length - 1]?.key
        });
        nextRiver = previousRiver ?? null;
      }
    }

    if (!nextRiver || usedRiverIds.has(nextRiver.id)) continue;
    restored.push(nextRiver);
    usedRiverIds.add(nextRiver.id);
  }

  return restored;
}

function restoreRiversStartingFromSea(previousRivers: River[], nextRivers: River[], seaVertexKeys: Set<string>): River[] {
  const previousById = new Map(previousRivers.map((river) => [river.id, river]));
  const restored: River[] = [];
  const usedRiverIds = new Set<number>();

  for (const river of nextRivers) {
    const startVertex = river.vertexPath[0];
    let nextRiver: River | null = river;
    if (startVertex && seaVertexKeys.has(startVertex.key)) {
      const previousRiver = previousById.get(river.id);
      console.warn(previousRiver ? 'Restoring previous river because generated river starts from sea' : 'Removing generated river because it starts from sea', {
        riverId: river.id,
        startVertexKey: startVertex.key
      });
      nextRiver = previousRiver ?? null;
    }

    if (!nextRiver || usedRiverIds.has(nextRiver.id)) continue;
    restored.push(nextRiver);
    usedRiverIds.add(nextRiver.id);
  }

  return restored;
}

function getLakeChanceForBiome(biomeId: BiomeId): number {
  if (biomeId === 'semi_desert') return 0;
  if (biomeId === 'swamp' || biomeId === 'swamp_forest') return 0.04;
  return 0.02;
}
const LAKE_EXPANSION_CHANCE = 0.10;

function assignLakesForRegion(
  regionHexes: AxialHex[],
  centerHex: AxialHex,
  startingLakeId: number,
  biomeId: BiomeId
): { lakesByHex: Map<string, HexTerrainData>; nextLakeId: number } {
  const centerKey = hexKey(centerHex);
  const regionHexMap = new Map(regionHexes.map((hex) => [hexKey(hex), hex]));
  const selectedLakeKeys = new Set<string>();
  const lakeChance = getLakeChanceForBiome(biomeId);

  for (const hex of regionHexes) {
    const key = hexKey(hex);
    if (key === centerKey) continue;
    if (Math.random() < lakeChance) selectedLakeKeys.add(key);
  }

  const firstPassLakeKeys = new Set(selectedLakeKeys);
  for (const hex of regionHexes) {
    const key = hexKey(hex);
    if (key === centerKey) continue;
    if (selectedLakeKeys.has(key)) continue;

    const touchesFirstPassLake = getHexNeighbors(hex).some((neighbor) => firstPassLakeKeys.has(hexKey(neighbor)));
    if (!touchesFirstPassLake) continue;

    if (Math.random() < LAKE_EXPANSION_CHANCE) selectedLakeKeys.add(key);
  }

  const lakesByHex = new Map<string, HexTerrainData>();
  const visited = new Set<string>();
  let nextLakeId = startingLakeId;

  for (const lakeKey of selectedLakeKeys) {
    if (visited.has(lakeKey)) continue;
    const queue = [lakeKey];
    visited.add(lakeKey);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      lakesByHex.set(current, { terrainOverride: 'lake', lakeId: nextLakeId });
      const currentHex = regionHexMap.get(current);
      if (!currentHex) continue;

      for (const neighbor of getHexNeighbors(currentHex)) {
        const neighborKey = hexKey(neighbor);
        if (!selectedLakeKeys.has(neighborKey) || visited.has(neighborKey) || !regionHexMap.has(neighborKey)) continue;
        visited.add(neighborKey);
        queue.push(neighborKey);
      }
    }

    nextLakeId += 1;
  }

  console.log('Lakes generated for region', {
    biomeId,
    lakeChance,
    lakeExpansionChance: LAKE_EXPANSION_CHANCE,
    lakeHexCount: lakesByHex.size,
    lakeIds: Array.from(new Set(Array.from(lakesByHex.values()).map((terrain) => terrain.lakeId))).filter(Boolean)
  });

  return { lakesByHex, nextLakeId };
}

function assignPointsOfInterestForRegion(
  regionHexes: AxialHex[],
  centerHex: AxialHex,
  lakesByHex: Map<string, HexTerrainData>
): AxialHex[] {
  const centerKey = hexKey(centerHex);
  const eligibleHexes = regionHexes.filter((hex) => {
    const key = hexKey(hex);
    if (key === centerKey) return false;
    return lakesByHex.get(key)?.terrainOverride !== 'lake';
  });
  const lakeHexCount = regionHexes.length - 1 - eligibleHexes.length;
  const eligibleCount = regionHexes.length - 1 - lakeHexCount;
  if (eligibleCount <= 0) return [];

  const maxPoiCount = Math.floor(eligibleCount / 4);
  const minPoiCount = Math.floor(eligibleCount / 6);
  if (maxPoiCount < minPoiCount) return [];

  const poiCount = randomInt(minPoiCount, maxPoiCount);
  if (poiCount <= 0) return [];

  const shuffledEligibleHexes = shuffleArray(eligibleHexes);
  return shuffledEligibleHexes.slice(0, Math.min(poiCount, shuffledEligibleHexes.length));
}

function hexTouchesLake(hex: AxialHex, hexTerrainByKey: Map<string, HexTerrainData>): boolean {
  return hexTerrainByKey.get(hexKey(hex))?.terrainOverride === 'lake'
    || getHexNeighbors(hex).some((neighbor) => hexTerrainByKey.get(hexKey(neighbor))?.terrainOverride === 'lake');
}

function hexTouchesRiverOrLake(hex: AxialHex, rivers: River[], hexTerrainByKey: Map<string, HexTerrainData>): boolean {
  return getRiversOnHexEdges(hex, rivers).length > 0 || hexTouchesLake(hex, hexTerrainByKey);
}

function hexHasRoadSegment(hex: AxialHex, roads: Road[]): boolean {
  const key = hexKey(hex);
  return roads.some((road) => road.segments.some((segment) => segment.kind === 'road' && (hexKey(segment.from) === key || hexKey(segment.to) === key)));
}

const SECONDARY_POI_KIND_ORDER: SecondaryPoiKind[] = [
  'dungeon',
  'camp',
  'castle',
  'pasture',
  'cave',
  'graveyard',
  'fort',
  'hut',
  'mine',
  'obelisk',
  'ruins',
  'holy_place',
  'cursed_place',
  'lair',
  'tavern',
  'tower',
  'portal',
  'mill',
  'monastery',
  'farm',
  'statue',
  'stronghold',
  'brewery',
  'distillery',
  'sawmill',
  'stone_quarry',
  'apiary',
  'quarry'
];

function biomeHasForest(biomeId: BiomeId): boolean {
  return biomeId.includes('forest') || biomeId.includes('woodland');
}

function secondaryPoiKindCanAppearInRegion(
  kind: SecondaryPoiKind,
  region: Region,
  poi: AxialHex,
  roads: Road[]
): boolean {
  switch (kind) {
    case 'dungeon':
    case 'camp':
    case 'ruins':
    case 'cursed_place':
    case 'lair':
    case 'portal':
      return region.biomeLandType === 'wild';
    case 'castle':
    case 'pasture':
    case 'fort':
    case 'mill':
    case 'farm':
    case 'stronghold':
    case 'brewery':
    case 'distillery':
      return region.biomeLandType === 'settled';
    case 'cave':
    case 'mine':
      return region.heightLevel === 2 || region.heightLevel === 3;
    case 'graveyard':
    case 'hut':
    case 'obelisk':
    case 'holy_place':
    case 'tower':
    case 'monastery':
    case 'statue':
      return true;
    case 'tavern':
      return hexHasRoadSegment(poi, roads);
    case 'sawmill':
      return region.biomeLandType === 'settled' && biomeHasForest(region.biomeId);
    case 'stone_quarry':
      return region.biomeLandType === 'settled' && (region.heightLevel === 2 || region.heightLevel === 3);
    case 'apiary':
      return region.biomeLandType === 'settled' && (region.heightLevel === 1 || region.heightLevel === 2);
    case 'quarry':
      // Карьер трактуем как открытый промышленный карьер: чаще всего он
      // появляется в освоенных равнинных или холмистых регионах, где удобнее
      // вести добычу открытым способом.
      return region.biomeLandType === 'settled' && (region.heightLevel === 1 || region.heightLevel === 2);
  }
}

function assignSecondaryPoiKindsForRegion(region: Region, roads: Road[], assigned: Record<string, PoiKind>): void {
  for (const poi of shuffleArray(region.pointsOfInterest)) {
    const poiKey = hexKey(poi);
    if (assigned[poiKey] !== undefined) continue;

    const candidates = SECONDARY_POI_KIND_ORDER.filter((kind) =>
      !Object.values(assigned).includes(kind)
      && secondaryPoiKindCanAppearInRegion(kind, region, poi, roads)
    );

    if (candidates.length === 0) continue;

    assigned[poiKey] = randomFrom(candidates);
  }
}

function assignPoiKindsForRegion(options: {
  region: Region;
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}): Record<string, PoiKind> | undefined {
  const { region, roads, rivers, hexTerrainByKey } = options;
  const assigned: Record<string, PoiKind> = { ...(region.pointOfInterestKinds ?? {}) };

  if (region.biomeLandType === 'wild') {
    // Дикий регион: после определения центральной точки интереса ищем
    // неопределённую точку интереса на дороге рядом с рекой или озером.
    // Если такая точка есть, она становится деревней.
    const wildVillagePoi = region.pointsOfInterest.find((poi) =>
      assigned[hexKey(poi)] === undefined
      && hexHasRoadSegment(poi, roads)
      && hexTouchesRiverOrLake(poi, rivers, hexTerrainByKey)
    );
    if (wildVillagePoi) assigned[hexKey(wildVillagePoi)] = 'village';
    assignSecondaryPoiKindsForRegion(region, roads, assigned);
    return Object.keys(assigned).length > 0 ? assigned : undefined;
  }

  if (region.biomeLandType !== 'settled') return Object.keys(assigned).length > 0 ? assigned : undefined;

  const unassignedPoi = () => region.pointsOfInterest.filter((poi) => assigned[hexKey(poi)] === undefined);
  const assignFirstMatching = (kind: SettlementPoiKind, predicate: (poi: AxialHex) => boolean): boolean => {
    const candidates = unassignedPoi().filter(predicate);
    if (candidates.length === 0) return false;
    assigned[hexKey(candidates[0])] = kind;
    return true;
  };
  const hasRoadAndWater = (poi: AxialHex) => hexHasRoadSegment(poi, roads) && hexTouchesRiverOrLake(poi, rivers, hexTerrainByKey);
  const hasWater = (poi: AxialHex) => hexTouchesRiverOrLake(poi, rivers, hexTerrainByKey);

  if (region.sizeCategory === 'small_region') {
    // Освоенный малый регион: деревня появляется в неопределённой точке интереса
    // на дорожном гексе у воды; если такой нет — в любой неопределённой точке
    // интереса рядом с рекой или озером.
    if (!assignFirstMatching('village', hasRoadAndWater)) {
      assignFirstMatching('village', hasWater);
    }
  } else if (region.sizeCategory === 'region') {
    assignFirstMatching('village', hasRoadAndWater);
    assignFirstMatching('village', hasWater);
  } else if (region.sizeCategory === 'land' || region.sizeCategory === 'large_region') {
    assignFirstMatching('town', hasRoadAndWater);
    assignFirstMatching('village', hasRoadAndWater);
    assignFirstMatching('village', hasWater);

    if (region.sizeCategory === 'land') {
      const villageCount = Object.values(assigned).filter((kind) => kind === 'village').length;
      if (villageCount === 1) {
        assignFirstMatching('village', hasWater);
      }
    }
  } else if (region.sizeCategory === 'vast_land') {
    assignFirstMatching('city', hasRoadAndWater);
    assignFirstMatching('town', hasRoadAndWater);
    assignFirstMatching('village', hasWater);
    assignFirstMatching('village', hasWater);
  }

  assignSecondaryPoiKindsForRegion(region, roads, assigned);

  return Object.keys(assigned).length > 0 ? assigned : undefined;
}

function getPoiKindForHex(region: Region | undefined, hex: AxialHex): PoiKind | undefined {
  return region?.pointOfInterestKinds?.[hexKey(hex)];
}

function getPoiEmojiForHex(region: Region | undefined, hex: AxialHex): string {
  const kind = getPoiKindForHex(region, hex);
  return kind ? POI_DETAILS[kind].emoji : POI_EMOJI;
}

function getPoiLabelForHex(region: Region, hex: AxialHex, language: Language): string {
  const kind = getPoiKindForHex(region, hex);
  return kind ? POI_DETAILS[kind].label[language] : TRANSLATIONS[language].poi;
}
function findRoadPathWithinRegion(options: {
  region: Region; from: AxialHex; targets: AxialHex[]; roads: Road[]; hexTerrainByKey: Map<string, HexTerrainData>;
  allowRoadHexes?: AxialHex[];
}): AxialHex[] | null {
  const { region, from, targets, roads, hexTerrainByKey, allowRoadHexes = [] } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const targetKeys = new Set(targets.filter((t) => !isLakeHex(t, hexTerrainByKey)).map(hexKey));
  const roadSegKeys = getRoadSegmentKeys(roads);
  const roadHexKeys = getRoadHexKeys(roads);
  const startKey = hexKey(from);
  if (isLakeHex(from, hexTerrainByKey) || targetKeys.size === 0) return null;
  const allowedRoadHexKeys = new Set([startKey, ...allowRoadHexes.map(hexKey), ...Array.from(targetKeys)]);
  const q: AxialHex[][] = [[from]];
  const visited = new Set<string>([startKey]);
  while (q.length) {
    const path = q.shift()!;
    const cur = path[path.length - 1];
    const curKey = hexKey(cur);
    if (path.length > 1 && targetKeys.has(curKey)) return path;
    for (const n of getHexNeighbors(cur)) {
      const nk = hexKey(n);
      if (visited.has(nk) || !regionKeys.has(nk)) continue;
      if (isLakeHex(n, hexTerrainByKey)) continue;
      if (roadSegKeys.has(normalizeRoadSegmentKey(cur, n))) continue;
      const hasRoadHex = roadHexKeys.has(nk);
      const allowedRoadHex = allowedRoadHexKeys.has(nk);
      if (hasRoadHex && !allowedRoadHex) continue;
      visited.add(nk);
      q.push([...path, n]);
    }
  }
  return null;
}
function isSameHex(a: AxialHex, b: AxialHex): boolean {
  return a.q === b.q && a.r === b.r;
}

function isPointOfInterestHex(hex: AxialHex, region: Region): boolean {
  const key = hexKey(hex);
  return region.pointsOfInterest.some((poi) => hexKey(poi) === key);
}

function getUnusedPoiTargets(
  region: Region,
  usedRoadPoiKeys: Set<string>,
  hexTerrainByKey: Map<string, HexTerrainData>
): AxialHex[] {
  return region.pointsOfInterest.filter((poi) => {
    const key = hexKey(poi);
    if (usedRoadPoiKeys.has(key)) return false;
    if (isLakeHex(poi, hexTerrainByKey)) return false;
    return true;
  });
}

function markPoiOnPathAsUsed(
  path: AxialHex[],
  region: Region,
  usedRoadPoiKeys: Set<string>
): void {
  const pathKeys = new Set(path.map(hexKey));
  for (const poi of region.pointsOfInterest) {
    const key = hexKey(poi);
    if (pathKeys.has(key)) usedRoadPoiKeys.add(key);
  }
}

function getSharedHexEdgeVertexKeys(a: AxialHex, b: AxialHex): [string, string] | null {
  const aPoints = getHexCornerPoints(a);
  const bPointKeys = new Set(getHexCornerPoints(b).map((point) => point.key));
  const shared = aPoints.filter((point) => bPointKeys.has(point.key)).map((point) => point.key);
  if (shared.length !== 2) return null;
  return [shared[0], shared[1]];
}

function getRiverCrossingFullnessByEdge(rivers: River[]): Map<string, RiverFullness> {
  const fullnessByEdge = new Map<string, RiverFullness>();
  for (const river of rivers) {
    const sectorFullnessByEdge = getRiverSectorFullnessByEdge(river);
    const fallbackFullness = getRiverFallbackFullness(river);
    for (let i = 1; i < river.vertexPath.length; i += 1) {
      const riverEdgeKey = edgeKey(river.vertexPath[i - 1], river.vertexPath[i]);
      const fullness = sectorFullnessByEdge.get(riverEdgeKey) ?? fallbackFullness;
      const existingFullness = fullnessByEdge.get(riverEdgeKey);
      if (!existingFullness || fullness > existingFullness) fullnessByEdge.set(riverEdgeKey, fullness);
    }
  }
  return fullnessByEdge;
}

function countRoadPathRiverCrossings(path: AxialHex[], rivers: River[], minFullness: RiverFullness = 1): number {
  if (path.length < 2) return 0;
  const riverFullnessByEdge = getRiverCrossingFullnessByEdge(rivers);
  let crossings = 0;
  for (let i = 1; i < path.length; i += 1) {
    const sharedEdge = getSharedHexEdgeVertexKeys(path[i - 1], path[i]);
    if (!sharedEdge) continue;
    const [v1, v2] = sharedEdge;
    const roadEdgeKey = v1 < v2 ? `${v1}|${v2}` : `${v2}|${v1}`;
    const fullness = riverFullnessByEdge.get(roadEdgeKey);
    if (fullness && fullness >= minFullness) crossings += 1;
  }
  return crossings;
}

function roadPathCrossesRiver(path: AxialHex[], rivers: River[], minFullness: RiverFullness = 1): boolean {
  return countRoadPathRiverCrossings(path, rivers, minFullness) > 0;
}


function getPoiKeysOnRoadPath(path: AxialHex[], region: Region): Set<string> {
  const pathKeys = new Set(path.map(hexKey));
  const centerKey = hexKey(region.centerHex);
  const touchedPoiKeys = new Set<string>();
  for (const poi of region.pointsOfInterest) {
    const key = hexKey(poi);
    if (key === centerKey) continue;
    if (pathKeys.has(key)) touchedPoiKeys.add(key);
  }
  return touchedPoiKeys;
}

function chooseBestRoadCandidate(candidates: RoadCandidatePath[]): RoadCandidatePath | null {
  if (candidates.length === 0) return null;
  const minCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  let bestCandidates = candidates.filter((candidate) => candidate.crossedRiverCount === minCrossings);
  const minLength = Math.min(...bestCandidates.map((candidate) => candidate.extendedPath.length));
  bestCandidates = bestCandidates.filter((candidate) => candidate.extendedPath.length === minLength);
  const maxPoiCount = Math.max(...bestCandidates.map((candidate) => candidate.touchedPoiCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.touchedPoiCount === maxPoiCount);
  return randomFrom(bestCandidates);
}

function hexHasRoad(hex: AxialHex, roads: Road[]): boolean {
  const key = hexKey(hex);
  return roads.some((road) => road.segments.some((segment) => hexKey(segment.from) === key || hexKey(segment.to) === key));
}

function hexHasRoadOrTrail(hex: AxialHex, roads: Road[]): boolean {
  return hexHasRoad(hex, roads);
}

function findTrailPathWithinRegion(options: {
  region: Region;
  fromHex: AxialHex;
  targetHex: AxialHex;
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}): AxialHex[] | null {
  const { region, fromHex, targetHex, roads, rivers, hexTerrainByKey } = options;
  const path = findRoadPathWithinRegion({
    region,
    from: fromHex,
    targets: [targetHex],
    roads,
    hexTerrainByKey,
    allowRoadHexes: [fromHex, targetHex]
  });
  if (!path) return null;
  if (roadPathCrossesRiver(path, rivers, 2)) return null;
  return path;
}

function addTrailPathWithoutDuplicateSegments(options: {
  path: AxialHex[];
  roads: Road[];
  regionId: number;
  nextRoadId: number;
}): { roads: Road[]; nextRoadId: number; added: boolean } {
  const { path, roads, regionId, nextRoadId } = options;
  if (path.length < 2) return { roads, nextRoadId, added: false };
  const existingSegmentKeys = getRoadSegmentKeys(roads);
  const segmentsToAdd: RoadSegment[] = [];
  for (let i = 1; i < path.length; i += 1) {
    const from = path[i - 1];
    const to = path[i];
    const segmentKey = normalizeRoadSegmentKey(from, to);
    if (existingSegmentKeys.has(segmentKey)) continue;
    segmentsToAdd.push({ from, to, kind: 'trail' });
    existingSegmentKeys.add(segmentKey);
  }
  if (segmentsToAdd.length === 0) return { roads, nextRoadId, added: false };
  return {
    roads: [...roads, { id: nextRoadId, regionId, segments: segmentsToAdd }],
    nextRoadId: nextRoadId + 1,
    added: true
  };
}

function connectRemainingPoiWithTrails(options: {
  region: Region;
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextRoadId: number;
}): { roads: Road[]; nextRoadId: number } {
  const { region, roads, rivers, hexTerrainByKey, nextRoadId } = options;
  let builtRoads = [...roads];
  let nextRoadIdLocal = nextRoadId;
  const skippedPoiKeys = new Set<string>();
  let loopLimit = region.pointsOfInterest.length + 5;
  const regionRoadHexes = (currentRoads: Road[]) => getRoadHexesInRegion(region, currentRoads);
  while (loopLimit > 0) {
    loopLimit -= 1;
    const disconnectedPoi = region.pointsOfInterest
      .filter((poi) => !hexHasRoadOrTrail(poi, builtRoads))
      .filter((poi) => !isLakeHex(poi, hexTerrainByKey))
      .filter((poi) => !skippedPoiKeys.has(hexKey(poi)));
    if (disconnectedPoi.length === 0) break;
    const roadHexCandidates = regionRoadHexes(builtRoads)
      .filter((hex) => !isLakeHex(hex, hexTerrainByKey));
    const selectedPoi = [...disconnectedPoi].sort((a, b) => {
      const da = roadHexCandidates.length > 0 ? Math.min(...roadHexCandidates.map((roadHex) => hexDistance(a, roadHex))) : Number.MAX_SAFE_INTEGER;
      const db = roadHexCandidates.length > 0 ? Math.min(...roadHexCandidates.map((roadHex) => hexDistance(b, roadHex))) : Number.MAX_SAFE_INTEGER;
      return da - db;
    })[0];
    let connected = false;
    const roadTargets = regionRoadHexes(builtRoads)
      .filter((hex) => !isLakeHex(hex, hexTerrainByKey))
      .filter((hex) => !isSameHex(hex, selectedPoi))
      .sort((a, b) => hexDistance(selectedPoi, a) - hexDistance(selectedPoi, b));
    for (const roadHex of roadTargets) {
      const path = findTrailPathWithinRegion({ region, fromHex: selectedPoi, targetHex: roadHex, roads: builtRoads, rivers, hexTerrainByKey });
      if (!path) continue;
      const addResult = addTrailPathWithoutDuplicateSegments({ path, roads: builtRoads, regionId: region.id, nextRoadId: nextRoadIdLocal });
      if (!addResult.added) continue;
      builtRoads = addResult.roads;
      nextRoadIdLocal = addResult.nextRoadId;
      connected = true;
      break;
    }
    if (!connected) {
      const poiTargets = region.pointsOfInterest
        .filter((poi) => !isSameHex(poi, selectedPoi))
        .filter((poi) => !isLakeHex(poi, hexTerrainByKey))
        .sort((a, b) => hexDistance(selectedPoi, a) - hexDistance(selectedPoi, b));
      for (const targetPoi of poiTargets) {
        const path = findTrailPathWithinRegion({ region, fromHex: selectedPoi, targetHex: targetPoi, roads: builtRoads, rivers, hexTerrainByKey });
        if (!path) continue;
        const addResult = addTrailPathWithoutDuplicateSegments({ path, roads: builtRoads, regionId: region.id, nextRoadId: nextRoadIdLocal });
        if (!addResult.added) continue;
        builtRoads = addResult.roads;
        nextRoadIdLocal = addResult.nextRoadId;
        connected = true;
        break;
      }
    }
    if (!connected) skippedPoiKeys.add(hexKey(selectedPoi));
  }
  console.log('Settled POI trails result', {
    regionId: region.id,
    totalPoi: region.pointsOfInterest.length,
    connectedPoi: region.pointsOfInterest.filter((poi) => hexHasRoadOrTrail(poi, builtRoads)).length,
    skippedPoi: skippedPoiKeys.size
  });
  return { roads: builtRoads, nextRoadId: nextRoadIdLocal };
}

function getRoadedPoiTargets(region: Region, roads: Road[]): AxialHex[] {
  return region.pointsOfInterest.filter((poi) => hexHasRoad(poi, roads));
}

function getRegionBorderHexes(region: Region): AxialHex[] {
  const regionKeys = new Set(region.hexes.map(hexKey));
  return region.hexes.filter((hex) => getHexNeighbors(hex).some((neighbor) => !regionKeys.has(hexKey(neighbor))));
}

function getCandidateFacingRegionBorderHexes(region: Region, candidateHexes: AxialHex[]): AxialHex[] {
  const candidateKeys = new Set(candidateHexes.map(hexKey));
  if (candidateKeys.size === 0) return [];
  return getRegionBorderHexes(region).filter((hex) => getHexNeighbors(hex).some((neighbor) => candidateKeys.has(hexKey(neighbor))));
}

function isAdjacentToRoadHex(hex: AxialHex, roads: Road[]): boolean {
  const roadHexKeys = getRoadHexKeys(roads);
  return getHexNeighbors(hex).some((neighbor) => roadHexKeys.has(hexKey(neighbor)));
}

function getRoadHexesInRegion(region: Region, roads: Road[]): AxialHex[] {
  return region.hexes.filter((hex) => hexHasRoad(hex, roads));
}

function getNonLakeRoadHexesInRegion(region: Region, roads: Road[], hexTerrainByKey: Map<string, HexTerrainData>): AxialHex[] {
  return getRoadHexesInRegion(region, roads).filter((hex) => !isLakeHex(hex, hexTerrainByKey));
}

function getSettledMainRoadLimit(region: Region): number {
  const largeRegionLabels = new Set<Region['sizeLabel']>(['Большой регион', 'Край', 'Обширный край']);
  return largeRegionLabels.has(region.sizeLabel) ? 3 : 2;
}

function getRoadHexKeySet(road: Road, segmentKind?: RoadKind): Set<string> {
  const keys = new Set<string>();
  for (const segment of road.segments) {
    if (segmentKind && segment.kind !== segmentKind) continue;
    keys.add(hexKey(segment.from));
    keys.add(hexKey(segment.to));
  }
  return keys;
}

function getUniqueIncomingRoadCount(incoming: IncomingRoadEndpoint[]): number {
  return new Set(incoming.map((endpoint) => endpoint.roadId)).size;
}

function pathPassesNearSameRoad(options: {
  path: AxialHex[];
  road: Road;
  allowedTouchHexes: AxialHex[];
  allowedNearHexes?: AxialHex[];
}): boolean {
  const { path, road, allowedTouchHexes, allowedNearHexes = [] } = options;
  const roadHexKeys = getRoadHexKeySet(road);
  const allowedTouchHexKeys = new Set(allowedTouchHexes.map(hexKey));
  const allowedNearHexKeys = new Set([...allowedTouchHexes, ...allowedNearHexes].map(hexKey));

  for (const pathHex of path) {
    const pathHexKey = hexKey(pathHex);
    if (roadHexKeys.has(pathHexKey) && !allowedTouchHexKeys.has(pathHexKey)) return true;
    if (allowedNearHexKeys.has(pathHexKey)) continue;
    if (getHexNeighbors(pathHex).some((neighbor) => {
      const neighborKey = hexKey(neighbor);
      return roadHexKeys.has(neighborKey) && !allowedTouchHexKeys.has(neighborKey);
    })) return true;
  }

  return false;
}

function pathPassesNearItself(path: AxialHex[]): boolean {
  for (let i = 0; i < path.length; i += 1) {
    const currentKey = hexKey(path[i]);
    for (let j = i + 1; j < path.length; j += 1) {
      if (j === i + 1) continue;
      if (hexKey(path[j]) === currentKey) return true;
      if (areHexesAdjacent(path[i], path[j])) return true;
    }
  }

  return false;
}

function normalizeSettledRegionRoadIds(options: {
  region: Region;
  roads: Road[];
  nextRoadId: number;
}): { roads: Road[]; nextRoadId: number } {
  const { region, roads, nextRoadId } = options;
  if (region.biomeLandType !== 'settled') return { roads, nextRoadId };

  const mainRoadLimit = getSettledMainRoadLimit(region);
  const regionRoads = roads.filter((road) => road.regionId === region.id && road.segments.some((segment) => segment.kind === 'road'));
  if (regionRoads.length <= mainRoadLimit) return { roads, nextRoadId };

  const primaryRoadIds = new Set(regionRoads.slice(0, mainRoadLimit).map((road) => road.id));
  const mergedPrimaryRoads = new Map<number, Road>();
  for (const road of regionRoads.slice(0, mainRoadLimit)) {
    mergedPrimaryRoads.set(road.id, { ...road, segments: [...road.segments] });
  }

  for (const extraRoad of regionRoads.slice(mainRoadLimit)) {
    const extraHexKeys = getRoadHexKeySet(extraRoad);
    let bestPrimaryRoad: Road | undefined;
    let bestSharedHexCount = -1;
    for (const primaryRoad of mergedPrimaryRoads.values()) {
      const primaryHexKeys = getRoadHexKeySet(primaryRoad);
      let sharedHexCount = 0;
      for (const key of extraHexKeys) if (primaryHexKeys.has(key)) sharedHexCount += 1;
      if (!bestPrimaryRoad || sharedHexCount > bestSharedHexCount || (sharedHexCount === bestSharedHexCount && primaryRoad.segments.length < bestPrimaryRoad.segments.length)) {
        bestPrimaryRoad = primaryRoad;
        bestSharedHexCount = sharedHexCount;
      }
    }
    if (bestPrimaryRoad) bestPrimaryRoad.segments.push(...extraRoad.segments);
  }

  return {
    roads: roads
      .filter((road) => road.regionId !== region.id || !road.segments.some((segment) => segment.kind === 'road') || primaryRoadIds.has(road.id))
      .map((road) => mergedPrimaryRoads.get(road.id) ?? road),
    nextRoadId
  };
}

type SupplementalSettledRoadCandidate = RoadCandidatePath & { startHex: AxialHex; anchorDistance: number };

type SettledCandidateRoadCandidate = RoadCandidatePath & {
  candidateHex: AxialHex;
  entryHex: AxialHex;
  candidateDistanceFromAnchor: number;
};

function chooseBestSettledCandidateRoadCandidate(candidates: SettledCandidateRoadCandidate[]): SettledCandidateRoadCandidate | null {
  if (candidates.length === 0) return null;
  const maxDistance = Math.max(...candidates.map((candidate) => candidate.candidateDistanceFromAnchor));
  let bestCandidates = candidates.filter((candidate) => candidate.candidateDistanceFromAnchor === maxDistance);

  const minCrossings = Math.min(...bestCandidates.map((candidate) => candidate.crossedRiverCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.crossedRiverCount === minCrossings);

  const minLength = Math.min(...bestCandidates.map((candidate) => candidate.extendedPath.length));
  bestCandidates = bestCandidates.filter((candidate) => candidate.extendedPath.length === minLength);

  const maxPoiCount = Math.max(...bestCandidates.map((candidate) => candidate.touchedPoiCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.touchedPoiCount === maxPoiCount);

  return randomFrom(bestCandidates);
}

function chooseBestSupplementalSettledRoadCandidate(candidates: SupplementalSettledRoadCandidate[]): SupplementalSettledRoadCandidate | null {
  if (candidates.length === 0) return null;
  const maxPoiCount = Math.max(...candidates.map((c) => c.touchedPoiCount));
  let best = candidates.filter((c) => c.touchedPoiCount === maxPoiCount);

  const minRiverCrossings = Math.min(...best.map((c) => c.crossedRiverCount));
  best = best.filter((c) => c.crossedRiverCount === minRiverCrossings);

  const maxAnchorDistance = Math.max(...best.map((c) => c.anchorDistance));
  best = best.filter((c) => c.anchorDistance === maxAnchorDistance);

  const minLength = Math.min(...best.map((c) => c.extendedPath.length));
  best = best.filter((c) => c.extendedPath.length === minLength);

  return randomFrom(best);
}

function chooseBestThirdRoadCandidate(candidates: RoadCandidatePath[]): RoadCandidatePath | null {
  if (candidates.length === 0) return null;
  const maxPoiCount = Math.max(...candidates.map((c) => c.touchedPoiCount));
  let best = candidates.filter((c) => c.touchedPoiCount === maxPoiCount);

  const minRiverCrossings = Math.min(...best.map((c) => c.crossedRiverCount));
  best = best.filter((c) => c.crossedRiverCount === minRiverCrossings);

  const minLength = Math.min(...best.map((c) => c.extendedPath.length));
  best = best.filter((c) => c.extendedPath.length === minLength);

  return randomFrom(best);
}

function findAlternativeRoadPathsWithinRegion(options: {
  region: Region; from: AxialHex; target: AxialHex; roads: Road[]; hexTerrainByKey: Map<string, HexTerrainData>; maxAlternatives: number;
}): AxialHex[][] {
  const { region, from, target, roads, hexTerrainByKey, maxAlternatives } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const startKey = hexKey(from);
  const targetKey = hexKey(target);
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey)) return [];
  if (!regionKeys.has(startKey) || !regionKeys.has(targetKey) || startKey === targetKey) return [];
  const roadSegKeys = getRoadSegmentKeys(roads);
  const roadHexKeys = getRoadHexKeys(roads);
  const paths: AxialHex[][] = [];
  const pathKeys = new Set<string>();
  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts && paths.length < maxAlternatives; attempt += 1) {
    const q: AxialHex[][] = [[from]];
    const visited = new Set<string>([startKey]);
    let found: AxialHex[] | null = null;
    while (q.length > 0 && !found) {
      const path = q.shift()!;
      const cur = path[path.length - 1];
      if (path.length > 1 && hexKey(cur) === targetKey) {
        found = path;
        break;
      }
      let neighbors = getHexNeighbors(cur).filter((n) => {
        const nk = hexKey(n);
        if (visited.has(nk) || !regionKeys.has(nk)) return false;
        if (isLakeHex(n, hexTerrainByKey)) return false;
        if (roadSegKeys.has(normalizeRoadSegmentKey(cur, n))) return false;
        if (roadHexKeys.has(nk) && nk !== targetKey) return false;
        return true;
      });
      if (attempt % 5 === 1) neighbors = neighbors.reverse();
      else if (attempt % 5 === 2) neighbors = shuffleArray(neighbors);
      else if (attempt % 5 === 3) neighbors = [...neighbors].sort((a, b) => hexDistance(a, target) - hexDistance(b, target));
      else if (attempt % 5 === 4) neighbors = [...neighbors].sort((a, b) => hexDistance(b, target) - hexDistance(a, target));
      for (const n of neighbors) {
        visited.add(hexKey(n));
        q.push([...path, n]);
      }
    }
    if (!found) continue;
    const foundKey = found.map(hexKey).join('>');
    if (pathKeys.has(foundKey)) continue;
    pathKeys.add(foundKey);
    paths.push(found);
  }
  return paths;
}

function collectAlternativeRoadPathsToTarget(options: {
  region: Region; fromHex: AxialHex; targetHex: AxialHex; targetIsPoi: boolean; roads: Road[]; rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>; usedRoadPoiKeys: Set<string>; maxAlternatives: number;
}): RoadCandidatePath[] {
  const { region, fromHex, targetHex, targetIsPoi, roads, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives } = options;
  const candidates: RoadCandidatePath[] = [];
  const basePaths = findAlternativeRoadPathsWithinRegion({ region, from: fromHex, target: targetHex, roads, hexTerrainByKey, maxAlternatives });
  for (const basePath of basePaths) {
    const extendedPath = extendRoadPathInSameDirectionWithinRegion({ path: basePath, region, roads, hexTerrainByKey });
    if (!canAddRoadPath({ path: extendedPath, roads, region, hexTerrainByKey, allowedRoadHexes: [fromHex, targetHex, extendedPath[extendedPath.length - 1]], allowedDuplicateHexKeys: new Set([hexKey(targetHex)]) })) continue;
    const touchedPoiKeys = getPoiKeysOnRoadPath(extendedPath, region);
    const touchedPoiCount = Array.from(touchedPoiKeys).filter((key) => !usedRoadPoiKeys.has(key)).length;
    candidates.push({ basePath, extendedPath, targetHex, targetIsPoi, crossedRiverCount: countRoadPathRiverCrossings(extendedPath, rivers), touchedPoiCount, touchedPoiKeys });
  }
  return candidates;
}

function extendRoadPathInSameDirectionWithinRegion(options: {
  path: AxialHex[];
  region: Region;
  roads: Road[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}): AxialHex[] {
  const { path, region, roads, hexTerrainByKey } = options;
  if (path.length < 2) return path;
  const extended = [...path];
  const regionKeys = new Set(region.hexes.map(hexKey));
  const roadSegKeys = getRoadSegmentKeys(roads);
  const roadHexKeys = getRoadHexKeys(roads);
  let prev = extended[extended.length - 2];
  let current = extended[extended.length - 1];
  const direction = { q: current.q - prev.q, r: current.r - prev.r };
  while (true) {
    const next = { q: current.q + direction.q, r: current.r + direction.r };
    const nextKey = hexKey(next);
    if (!regionKeys.has(nextKey)) break;
    if (isLakeHex(next, hexTerrainByKey)) break;
    if (roadSegKeys.has(normalizeRoadSegmentKey(current, next))) break;
    if (roadHexKeys.has(nextKey)) break;
    extended.push(next);
    prev = current;
    current = next;
  }
  return extended;
}

function getAvailableRoadFallbackHexes(options: {
  region: Region;
  fromHex: AxialHex;
  roads: Road[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  usedRoadPoiKeys: Set<string>;
  excludeHexKeys?: Set<string>;
}): AxialHex[] {
  const { region, fromHex, roads, hexTerrainByKey, usedRoadPoiKeys, excludeHexKeys = new Set<string>() } = options;
  void usedRoadPoiKeys;
  const roadHexKeys = getRoadHexKeys(roads);
  return region.hexes
    .filter((hex) => {
      const key = hexKey(hex);
      if (excludeHexKeys.has(key)) return false;
      if (isLakeHex(hex, hexTerrainByKey)) return false;
      if (roadHexKeys.has(key)) return false;
      return true;
    })
    .sort((a, b) => hexDistance(b, fromHex) - hexDistance(a, fromHex));
}

function canAddRoadPath(options: {
  path: AxialHex[];
  roads: Road[];
  region: Region;
  hexTerrainByKey: Map<string, HexTerrainData>;
  allowedRoadHexes?: AxialHex[];
  allowedDuplicateHexKeys?: Set<string>;
  allowExistingRoadOverlap?: boolean;
}): boolean {
  const { path, roads, region, hexTerrainByKey, allowedRoadHexes = [], allowedDuplicateHexKeys = new Set<string>(), allowExistingRoadOverlap = false } = options;
  if (path.length < 2) return false;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const roadSegKeys = getRoadSegmentKeys(roads);
  const roadHexKeys = getRoadHexKeys(roads);
  const allowedRoadHexKeys = new Set(allowedRoadHexes.map(hexKey));
  const seen = new Set<string>();
  for (let i = 0; i < path.length; i += 1) {
    const cur = path[i];
    const ck = hexKey(cur);
    if (isLakeHex(cur, hexTerrainByKey)) return false;
    if (i > 0 && i < path.length - 1 && !regionKeys.has(ck)) return false;
    if (seen.has(ck) && !allowedDuplicateHexKeys.has(ck)) return false;
    seen.add(ck);
    if (!allowExistingRoadOverlap && roadHexKeys.has(ck) && !allowedRoadHexKeys.has(ck)) return false;
    if (i === 0) continue;
    const prev = path[i - 1];
    const pk = hexKey(prev);
    if (!areHexesAdjacent(prev, cur)) return false;
    if (!allowExistingRoadOverlap && roadSegKeys.has(normalizeRoadSegmentKey(prev, cur))) return false;
    if (i > 1 && !regionKeys.has(pk)) return false;
  }
  return true;
}
type IncomingRoadEndpoint = { roadId: number; endpointHex: AxialHex; entryHex: AxialHex; touchKind: 'endpoint' | 'body' };
type SettledIncomingRoadCandidate = RoadCandidatePath & { incoming: IncomingRoadEndpoint };

function buildPathFromIncomingRoadEndpoint(endpointHex: AxialHex, innerPath: AxialHex[]): AxialHex[] {
  if (innerPath.length > 0 && isSameHex(endpointHex, innerPath[0])) return innerPath;
  return [endpointHex, ...innerPath];
}

function appendIncomingRoadEndpointToPath(path: AxialHex[], endpointHex: AxialHex): AxialHex[] {
  if (path.length > 0 && isSameHex(path[path.length - 1], endpointHex)) return path;
  return [...path, endpointHex];
}

function getRoadEndpointContinuationHex(road: Road, endpoint: AxialHex): AxialHex | null {
  const endpointKey = hexKey(endpoint);
  const touchingSegment = road.segments.find((segment) => (
    segment.kind === 'road'
    && (hexKey(segment.from) === endpointKey || hexKey(segment.to) === endpointKey)
  ));
  if (!touchingSegment) return null;

  const previousHex = hexKey(touchingSegment.from) === endpointKey ? touchingSegment.to : touchingSegment.from;
  return {
    q: endpoint.q + (endpoint.q - previousHex.q),
    r: endpoint.r + (endpoint.r - previousHex.r)
  };
}

function isUsableIncomingRoadEntryHex(region: Region, hex: AxialHex, hexTerrainByKey?: Map<string, HexTerrainData>): boolean {
  if (isSameHex(hex, region.centerHex)) return false;
  if (hexTerrainByKey && isLakeHex(hex, hexTerrainByKey)) return false;
  return true;
}

function chooseIncomingRoadEntryHex(
  region: Region,
  road: Road,
  endpoint: AxialHex,
  entries: AxialHex[],
  hexTerrainByKey?: Map<string, HexTerrainData>
): AxialHex {
  const continuationHex = getRoadEndpointContinuationHex(road, endpoint);
  if (continuationHex) {
    const straightEntry = entries.find((entry) => isSameHex(entry, continuationHex));
    if (straightEntry && isUsableIncomingRoadEntryHex(region, straightEntry, hexTerrainByKey)) return straightEntry;
  }

  const usableEntries = entries.filter((entry) => isUsableIncomingRoadEntryHex(region, entry, hexTerrainByKey));
  if (usableEntries.length > 0) return randomFrom(usableEntries);

  return [...entries].sort((a, b) => hexDistance(a, region.centerHex) - hexDistance(b, region.centerHex))[0];
}

function getRegionCenterHexKeys(regions: Region[]): Set<string> {
  return new Set(regions.map((region) => hexKey(region.centerHex)));
}

function findIncomingRoadEndpointsForRegion(
  region: Region,
  roads: Road[],
  hexTerrainByKey?: Map<string, HexTerrainData>,
  includeRoadBodyEntries = false,
  blockedRoadTouchHexKeys = new Set<string>()
): IncomingRoadEndpoint[] {
  const regionKeys = new Set(region.hexes.map(hexKey));
  const result = new Map<string, IncomingRoadEndpoint>();

  const addIncoming = (roadId: number, endpointHex: AxialHex, entryHex: AxialHex, touchKind: IncomingRoadEndpoint['touchKind']) => {
    if (!isUsableIncomingRoadEntryHex(region, entryHex, hexTerrainByKey)) return;
    const key = `${roadId}:${hexKey(endpointHex)}:${hexKey(entryHex)}:${touchKind}`;
    if (!result.has(key)) result.set(key, { roadId, endpointHex, entryHex, touchKind });
  };

  for (const road of roads) {
    for (const endpoint of getRoadEndpoints(road, 'road')) {
      const endpointKey = hexKey(endpoint);
      if (blockedRoadTouchHexKeys.has(endpointKey)) continue;
      if (regionKeys.has(endpointKey)) {
        addIncoming(road.id, endpoint, endpoint, 'endpoint');
        continue;
      }
      const entries = getHexNeighbors(endpoint).filter((h) => regionKeys.has(hexKey(h)));
      if (entries.length === 0) continue;
      addIncoming(road.id, endpoint, chooseIncomingRoadEntryHex(region, road, endpoint, entries, hexTerrainByKey), 'endpoint');
    }

    if (includeRoadBodyEntries) {
      const roadHexes = new Map<string, AxialHex>();
      for (const segment of road.segments) {
        if (segment.kind !== 'road') continue;
        roadHexes.set(hexKey(segment.from), segment.from);
        roadHexes.set(hexKey(segment.to), segment.to);
      }

      for (const roadHex of roadHexes.values()) {
        const roadHexKey = hexKey(roadHex);
        if (blockedRoadTouchHexKeys.has(roadHexKey)) continue;
        if (regionKeys.has(roadHexKey)) {
          addIncoming(road.id, roadHex, roadHex, 'body');
          continue;
        }

        const sideEntries = getHexNeighbors(roadHex)
          .filter((entry) => regionKeys.has(hexKey(entry)))
          .filter((entry) => isUsableIncomingRoadEntryHex(region, entry, hexTerrainByKey));
        for (const entry of sideEntries) addIncoming(road.id, roadHex, entry, 'body');
      }
    }
  }

  return Array.from(result.values());
}


function chooseBestSettledIncomingRoadCandidate(candidates: SettledIncomingRoadCandidate[]): SettledIncomingRoadCandidate | null {
  if (candidates.length === 0) return null;
  const endpointCandidates = candidates.filter((candidate) => candidate.incoming.touchKind === 'endpoint');
  const priorityCandidates = endpointCandidates.length > 0 ? endpointCandidates : candidates;
  const maxPoiCount = Math.max(...priorityCandidates.map((candidate) => candidate.touchedPoiCount));
  let bestCandidates = priorityCandidates.filter((candidate) => candidate.touchedPoiCount === maxPoiCount);
  const minCrossings = Math.min(...bestCandidates.map((candidate) => candidate.crossedRiverCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.crossedRiverCount === minCrossings);
  const minLength = Math.min(...bestCandidates.map((candidate) => candidate.extendedPath.length));
  bestCandidates = bestCandidates.filter((candidate) => candidate.extendedPath.length === minLength);
  return randomFrom(bestCandidates);
}

function collectSettledIncomingRoadPathsToTarget(options: {
  region: Region;
  incoming: IncomingRoadEndpoint;
  targetHexes: AxialHex[];
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  usedRoadPoiKeys: Set<string>;
  maxAlternatives: number;
}): SettledIncomingRoadCandidate[] {
  const { region, incoming, targetHexes, roads, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives } = options;
  const candidates: SettledIncomingRoadCandidate[] = [];
  const targetKeys = new Set(targetHexes.map(hexKey));
  const uniqueTargets = targetHexes.filter((targetHex, index, allTargets) => allTargets.findIndex((other) => hexKey(other) === hexKey(targetHex)) === index);

  for (const targetHex of uniqueTargets) {
    if (isSameHex(incoming.entryHex, targetHex)) continue;
    const basePaths = findAlternativeRoadPathsWithinRegion({
      region,
      from: incoming.entryHex,
      target: targetHex,
      roads,
      hexTerrainByKey,
      maxAlternatives
    });

    for (const basePath of basePaths) {
      const extendedPath = buildPathFromIncomingRoadEndpoint(incoming.endpointHex, basePath);
      const allowedRoadHexes = [incoming.endpointHex, incoming.entryHex, targetHex];
      if (!canAddRoadPath({ path: extendedPath, roads, region, hexTerrainByKey, allowedRoadHexes })) continue;
      const touchedPoiKeys = getPoiKeysOnRoadPath(extendedPath, region);
      const touchedPoiCount = Array.from(touchedPoiKeys).filter((key) => !usedRoadPoiKeys.has(key)).length;
      candidates.push({
        incoming,
        basePath,
        extendedPath,
        targetHex,
        targetIsPoi: targetKeys.has(hexKey(targetHex)) && isPointOfInterestHex(targetHex, region),
        crossedRiverCount: countRoadPathRiverCrossings(extendedPath, rivers),
        touchedPoiCount,
        touchedPoiKeys
      });
    }
  }

  return candidates;
}

function getRoadBuildCountForSettledRegion(region: Region, roads: Road[]): number {
  return roads.filter((road) => road.regionId === region.id && road.segments.some((segment) => segment.kind === 'road')).length;
}


function findWildIncomingRoadEndpointsForRegion(region: Region, roads: Road[]): IncomingRoadEndpoint[] {
  const regionKeys = new Set(region.hexes.map(hexKey));
  const result: IncomingRoadEndpoint[] = [];
  for (const road of roads) {
    for (const endpoint of getRoadEndpoints(road, 'road')) {
      const endpointKey = hexKey(endpoint);
      const touchesRegion = regionKeys.has(endpointKey) || getHexNeighbors(endpoint).some((neighbor) => regionKeys.has(hexKey(neighbor)));
      if (!touchesRegion) continue;
      result.push({ roadId: road.id, endpointHex: endpoint, entryHex: endpoint, touchKind: 'endpoint' });
    }
  }
  return result;
}

function findLowestRiverCrossingPathWithinWildRegion(options: {
  region: Region;
  from: AxialHex;
  target: AxialHex;
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  freeFirstRiverCrossing?: boolean;
}): AxialHex[] | null {
  const { region, from, target, rivers, hexTerrainByKey, freeFirstRiverCrossing = false } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const centerKey = hexKey(region.centerHex);
  const startKey = hexKey(from);
  const targetKey = hexKey(target);
  if (startKey === targetKey) return null;
  if (startKey === centerKey || targetKey === centerKey) return null;
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey)) return null;

  const canTouchRegion = (hex: AxialHex) => regionKeys.has(hexKey(hex)) || getHexNeighbors(hex).some((neighbor) => regionKeys.has(hexKey(neighbor)));
  if (!canTouchRegion(from) || !canTouchRegion(target)) return null;

  const riverFullnessByEdge = getRiverCrossingFullnessByEdge(rivers);
  const queue: Array<{ path: AxialHex[]; cost: number; riverCrossings: number }> = [{ path: [from], cost: 0, riverCrossings: 0 }];
  const bestCostByState = new Map<string, number>([[`${startKey}|0`, 0]]);

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost || a.riverCrossings - b.riverCrossings || a.path.length - b.path.length);
    const current = queue.shift()!;
    const cur = current.path[current.path.length - 1];
    const curKey = hexKey(cur);
    if (curKey === targetKey) return current.path;
    const currentStateKey = `${curKey}|${freeFirstRiverCrossing && current.riverCrossings === 0 ? 0 : 1}`;
    if ((bestCostByState.get(currentStateKey) ?? Number.POSITIVE_INFINITY) < current.cost) continue;

    for (const neighbor of getHexNeighbors(cur)) {
      const neighborKey = hexKey(neighbor);
      const neighborIsTarget = neighborKey === targetKey;
      const neighborIsInsideRegion = regionKeys.has(neighborKey);
      if (!neighborIsTarget && !neighborIsInsideRegion) continue;
      if (neighborIsInsideRegion && neighborKey === centerKey) continue;
      if (current.path.some((hex) => hexKey(hex) === neighborKey)) continue;
      if (isLakeHex(neighbor, hexTerrainByKey)) continue;

      const sharedEdge = getSharedHexEdgeVertexKeys(cur, neighbor);
      const riverEdgeKey = sharedEdge ? (sharedEdge[0] < sharedEdge[1] ? `${sharedEdge[0]}|${sharedEdge[1]}` : `${sharedEdge[1]}|${sharedEdge[0]}`) : undefined;
      const riverFullness = riverEdgeKey ? riverFullnessByEdge.get(riverEdgeKey) : undefined;
      const nextRiverCrossings = current.riverCrossings + (riverFullness ? 1 : 0);
      const riverPenalty = riverFullness && !(freeFirstRiverCrossing && current.riverCrossings === 0) ? 100 + riverFullness * 10 : 0;
      const nextCost = current.cost + 1 + riverPenalty;
      const nextStateKey = `${neighborKey}|${freeFirstRiverCrossing && nextRiverCrossings === 0 ? 0 : 1}`;
      const previousBestCost = bestCostByState.get(nextStateKey);
      if (previousBestCost !== undefined && previousBestCost <= nextCost) continue;
      bestCostByState.set(nextStateKey, nextCost);
      queue.push({ path: [...current.path, neighbor], cost: nextCost, riverCrossings: nextRiverCrossings });
    }
  }

  return null;
}


function getRoadRegionCenterHexes(road: Road, regions: Region[]): AxialHex[] {
  const roadHexKeys = getRoadHexKeySet(road);
  const roadCenterHexes = regions
    .filter((region) => roadHexKeys.has(hexKey(region.centerHex)))
    .map((region) => region.centerHex);
  if (roadCenterHexes.length > 0) return roadCenterHexes;

  const sourceRegion = regions.find((region) => region.id === road.regionId);
  return sourceRegion ? [sourceRegion.centerHex] : [];
}

function getRoadRegionCenterKeys(road: Road, regions: Region[]): Set<string> {
  const centerHexes = getRoadRegionCenterHexes(road, regions);
  if (centerHexes.length > 0) return new Set(centerHexes.map(hexKey));
  return new Set([`road-${road.id}`]);
}

function roadTouchesKnownRegionCenter(road: Road, regions: Region[]): boolean {
  const roadHexKeys = getRoadHexKeySet(road);
  return regions.some((region) => roadHexKeys.has(hexKey(region.centerHex)));
}

function roadsShareRegionCenter(a: Road, b: Road, regions: Region[]): boolean {
  const aCenterKeys = getRoadRegionCenterKeys(a, regions);
  const bCenterKeys = getRoadRegionCenterKeys(b, regions);
  for (const key of aCenterKeys) if (bCenterKeys.has(key)) return true;
  return false;
}

function shouldSkipWildIncomingRoadPairForSharedCenter(a: Road, b: Road, regions: Region[]): boolean {
  if (!roadsShareRegionCenter(a, b, regions)) return false;
  return roadTouchesKnownRegionCenter(a, regions) && roadTouchesKnownRegionCenter(b, regions);
}

function findAlternativeWildRoadPairPaths(options: {
  region: Region;
  from: AxialHex;
  target: AxialHex;
  roads: Road[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  maxAlternatives: number;
}): AxialHex[][] {
  const { region, from, target, roads, hexTerrainByKey, maxAlternatives } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const centerKey = hexKey(region.centerHex);
  const startKey = hexKey(from);
  const targetKey = hexKey(target);
  if (!regionKeys.has(startKey) || !regionKeys.has(targetKey)) return [];
  if (startKey === centerKey || targetKey === centerKey) return [];
  if (startKey === targetKey) return [];
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey)) return [];

  const roadSegKeys = getRoadSegmentKeys(roads);
  const paths: AxialHex[][] = [];
  const pathKeys = new Set<string>();
  const maxAttempts = 25;

  for (let attempt = 0; attempt < maxAttempts && paths.length < maxAlternatives; attempt += 1) {
    const queue: AxialHex[][] = [[from]];
    const bestDepthByHex = new Map<string, number>([[startKey, 1]]);
    let found: AxialHex[] | null = null;

    while (queue.length > 0 && !found) {
      const path = queue.shift()!;
      const current = path[path.length - 1];
      const currentKey = hexKey(current);
      if (path.length > 1 && currentKey === targetKey) {
        found = path;
        break;
      }

      let neighbors = getHexNeighbors(current).filter((neighbor) => {
        const neighborKey = hexKey(neighbor);
        if (!regionKeys.has(neighborKey)) return false;
        if (neighborKey === centerKey) return false;
        if (path.some((hex) => hexKey(hex) === neighborKey)) return false;
        if (isLakeHex(neighbor, hexTerrainByKey)) return false;
        if (roadSegKeys.has(normalizeRoadSegmentKey(current, neighbor))) return false;
        return true;
      });

      if (attempt % 5 === 1) neighbors = neighbors.reverse();
      else if (attempt % 5 === 2) neighbors = shuffleArray(neighbors);
      else if (attempt % 5 === 3) neighbors = [...neighbors].sort((a, b) => hexDistance(a, target) - hexDistance(b, target));
      else if (attempt % 5 === 4) neighbors = [...neighbors].sort((a, b) => hexDistance(b, target) - hexDistance(a, target));

      for (const neighbor of neighbors) {
        const neighborKey = hexKey(neighbor);
        const nextDepth = path.length + 1;
        const bestDepth = bestDepthByHex.get(neighborKey);
        if (bestDepth !== undefined && bestDepth < nextDepth - 2) continue;
        bestDepthByHex.set(neighborKey, Math.min(bestDepth ?? nextDepth, nextDepth));
        queue.push([...path, neighbor]);
      }
    }

    if (!found) continue;
    const foundKey = found.map(hexKey).join('>');
    if (pathKeys.has(foundKey)) continue;
    pathKeys.add(foundKey);
    paths.push(found);
  }

  return paths;
}

function canAddWildIncomingRoadPairPath(options: {
  path: AxialHex[];
  roads: Road[];
  region: Region;
  hexTerrainByKey: Map<string, HexTerrainData>;
}): boolean {
  const { path, roads, region, hexTerrainByKey } = options;
  if (path.length < 2) return false;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const centerKey = hexKey(region.centerHex);
  const roadSegKeys = getRoadSegmentKeys(roads);
  const seen = new Set<string>();

  for (let i = 0; i < path.length; i += 1) {
    const current = path[i];
    const currentKey = hexKey(current);
    if (isLakeHex(current, hexTerrainByKey)) return false;
    if (currentKey === centerKey) return false;
    if (seen.has(currentKey)) return false;
    seen.add(currentKey);
    if (i > 0 && i < path.length - 1 && !regionKeys.has(currentKey)) return false;
    if (i === 0) continue;
    const previous = path[i - 1];
    if (!areHexesAdjacent(previous, current)) return false;
    if (roadSegKeys.has(normalizeRoadSegmentKey(previous, current))) return false;
    if (i > 1 && !regionKeys.has(hexKey(previous))) return false;
  }

  return true;
}

function getWildIncomingRoadPairCandidates(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}): WildIncomingRoadPairCandidate[] {
  const { region, regions, roads, rivers, hexTerrainByKey } = options;
  const incoming = findIncomingRoadEndpointsForRegion(region, roads, hexTerrainByKey, false, getRegionCenterHexKeys(regions))
    .filter((incomingEndpoint) => !isSameHex(incomingEndpoint.entryHex, region.centerHex) && !isLakeHex(incomingEndpoint.entryHex, hexTerrainByKey));
  if (incoming.length < 2) return [];

  const candidates: WildIncomingRoadPairCandidate[] = [];
  for (let i = 0; i < incoming.length - 1; i += 1) {
    for (let j = i + 1; j < incoming.length; j += 1) {
      const start = incoming[i];
      const target = incoming[j];
      if (start.roadId === target.roadId) continue;
      const startRoad = roads.find((road) => road.id === start.roadId);
      const targetRoad = roads.find((road) => road.id === target.roadId);
      if (!startRoad || !targetRoad) continue;
      if (shouldSkipWildIncomingRoadPairForSharedCenter(startRoad, targetRoad, regions)) continue;

      const innerPaths = findAlternativeWildRoadPairPaths({
        region,
        from: start.entryHex,
        target: target.entryHex,
        roads,
        hexTerrainByKey,
        maxAlternatives: 5
      });

      for (const innerPath of innerPaths) {
        const fullPath = appendIncomingRoadEndpointToPath(buildPathFromIncomingRoadEndpoint(start.endpointHex, innerPath), target.endpointHex);
        if (!canAddWildIncomingRoadPairPath({ path: fullPath, roads, region, hexTerrainByKey })) continue;
        candidates.push({
          startRoadId: start.roadId,
          targetRoadId: target.roadId,
          path: fullPath,
          crossedRiverCount: countRoadPathRiverCrossings(innerPath, rivers)
        });
      }
    }
  }

  return candidates;
}

function chooseBestWildIncomingRoadPairCandidate(candidates: WildIncomingRoadPairCandidate[]): WildIncomingRoadPairCandidate | null {
  if (candidates.length === 0) return null;
  const minRiverCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  let best = candidates.filter((candidate) => candidate.crossedRiverCount === minRiverCrossings);
  const minLength = Math.min(...best.map((candidate) => candidate.path.length));
  best = best.filter((candidate) => candidate.path.length === minLength);
  return randomFrom(best);
}

function addWildIncomingRoadPairCandidate(options: {
  candidate: WildIncomingRoadPairCandidate;
  roads: Road[];
  region: Region;
  hexTerrainByKey: Map<string, HexTerrainData>;
}): boolean {
  const { candidate, roads, region, hexTerrainByKey } = options;
  if (!canAddWildIncomingRoadPairPath({ path: candidate.path, roads, region, hexTerrainByKey })) return false;
  const startRoad = roads.find((road) => road.id === candidate.startRoadId);
  if (!startRoad) return false;

  for (let i = 1; i < candidate.path.length; i += 1) {
    startRoad.segments.push({ from: candidate.path[i - 1], to: candidate.path[i], kind: 'road' });
  }

  const targetRoadIndex = roads.findIndex((road) => road.id === candidate.targetRoadId);
  if (targetRoadIndex >= 0 && roads[targetRoadIndex].id !== startRoad.id) {
    startRoad.segments.push(...roads[targetRoadIndex].segments);
    roads.splice(targetRoadIndex, 1);
  }

  return true;
}

function getSameCenterWildRoadTargets(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  startRoad: Road;
  startEntryHex: AxialHex;
  hexTerrainByKey: Map<string, HexTerrainData>;
}): Array<{ kind: 'road'; entryHex: AxialHex; outsideHex: AxialHex; roadId: number }> {
  const { region, regions, roads, startRoad, startEntryHex, hexTerrainByKey } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const startCenterKeys = getRoadRegionCenterKeys(startRoad, regions);
  const targets = new Map<string, { kind: 'road'; entryHex: AxialHex; outsideHex: AxialHex; roadId: number }>();

  for (const road of roads) {
    if (road.id === startRoad.id) continue;

    const roadCenterKeys = getRoadRegionCenterKeys(road, regions);
    const sharesCenter = Array.from(startCenterKeys).some((centerKey) => roadCenterKeys.has(centerKey));
    if (!sharesCenter) continue;

    for (const segment of road.segments) {
      for (const hex of [segment.from, segment.to]) {
        const key = hexKey(hex);
        if (!regionKeys.has(key)) continue;
        if (isSameHex(hex, startEntryHex)) continue;
        if (isSameHex(hex, region.centerHex)) continue;
        if (isLakeHex(hex, hexTerrainByKey)) continue;
        targets.set(`${road.id}:${key}`, { kind: 'road', entryHex: hex, outsideHex: hex, roadId: road.id });
      }
    }
  }

  return Array.from(targets.values()).sort((a, b) => hexDistance(a.entryHex, startEntryHex) - hexDistance(b.entryHex, startEntryHex));
}

function getWildRoadCandidates(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  candidateHexes: AxialHex[];
  usedEndpointKeys?: Set<string>;
}): WildRoadCandidate[] {
  const { region, regions, roads, rivers, hexTerrainByKey, candidateHexes, usedEndpointKeys = new Set<string>() } = options;
  const incoming = findIncomingRoadEndpointsForRegion(region, roads, hexTerrainByKey, false, getRegionCenterHexKeys(regions))
    .filter((incomingEndpoint) => !usedEndpointKeys.has(hexKey(incomingEndpoint.endpointHex)))
    .filter((incomingEndpoint) => !isSameHex(incomingEndpoint.entryHex, region.centerHex) && !isLakeHex(incomingEndpoint.entryHex, hexTerrainByKey));
  if (incoming.length === 0) return [];

  const regionKeys = new Set(region.hexes.map(hexKey));
  const candidateKeys = new Set(candidateHexes.map(hexKey));
  const candidateTargets = getRegionBorderHexes(region)
    .flatMap((borderHex) => getHexNeighbors(borderHex)
      .filter((neighbor) => candidateKeys.has(hexKey(neighbor)))
      .map((candidateHex) => ({ entryHex: borderHex, outsideHex: candidateHex })))
    .filter((target, index, allTargets) => allTargets.findIndex((other) => hexKey(other.entryHex) === hexKey(target.entryHex) && hexKey(other.outsideHex) === hexKey(target.outsideHex)) === index)
    .filter((target) => !isLakeHex(target.entryHex, hexTerrainByKey));

  const result: WildRoadCandidate[] = [];
  for (const start of incoming) {
    const startRoad = roads.find((road) => road.id === start.roadId);
    if (!startRoad) continue;
    const sameCenterRoadTargets = getSameCenterWildRoadTargets({
      region,
      regions,
      roads,
      startRoad,
      startEntryHex: start.entryHex,
      hexTerrainByKey
    });
    const startRoadCenterHexes = getRoadRegionCenterHexes(startRoad, regions);
    const targets: Array<{ kind: 'candidate' | 'road'; entryHex: AxialHex; outsideHex: AxialHex; roadId?: number }> = [];
    const differentCenterIncomingTargets = incoming.filter((target) => {
      if (target.roadId === start.roadId) return false;
      if (isSameHex(target.entryHex, start.entryHex)) return false;
      const targetRoad = roads.find((road) => road.id === target.roadId);
      return !!targetRoad && !roadsShareRegionCenter(startRoad, targetRoad, regions);
    });

    if (sameCenterRoadTargets.length > 0) {
      targets.push(...sameCenterRoadTargets);
    } else if (differentCenterIncomingTargets.length > 0) {
      for (const target of differentCenterIncomingTargets) {
        targets.push({ kind: 'road', entryHex: target.entryHex, outsideHex: target.endpointHex, roadId: target.roadId });
      }
    } else {
      for (const target of candidateTargets) {
        if (isSameHex(target.entryHex, start.entryHex)) continue;
        targets.push({ kind: 'candidate', entryHex: target.entryHex, outsideHex: target.outsideHex });
      }
    }

    for (const target of targets) {
      if (target.roadId === start.roadId) continue;
      if (!regionKeys.has(hexKey(start.entryHex)) || !regionKeys.has(hexKey(target.entryHex))) continue;
      const innerPath = findLowestRiverCrossingPathWithinWildRegion({
        region,
        from: start.entryHex,
        target: target.entryHex,
        rivers,
        hexTerrainByKey,
        freeFirstRiverCrossing: target.kind === 'candidate'
      });
      if (!innerPath || innerPath.length < 2) continue;
      const pathFromIncoming = buildPathFromIncomingRoadEndpoint(start.endpointHex, innerPath);
      const fullPath = target.kind === 'candidate'
        ? pathFromIncoming
        : appendIncomingRoadEndpointToPath(pathFromIncoming, target.outsideHex);
      const targetEndpointHex = target.kind === 'candidate' ? target.entryHex : target.outsideHex;
      if (usedEndpointKeys.has(hexKey(targetEndpointHex))) continue;
      const crossedRiverCount = countRoadPathRiverCrossings(innerPath, rivers);
      const targetDistanceFromStartRoadCenter = target.kind === 'candidate' && startRoadCenterHexes.length > 0
        ? Math.max(...startRoadCenterHexes.map((centerHex) => hexDistance(centerHex, target.outsideHex))) - hexDistance(start.entryHex, target.entryHex)
        : 0;
      const candidate: WildRoadCandidate = {
        startRoadId: start.roadId,
        targetRoadId: target.roadId,
        path: fullPath,
        crossedRiverCount: target.kind === 'candidate' ? Math.max(0, crossedRiverCount - 1) : crossedRiverCount,
        targetKind: target.kind,
        targetDistanceFromStartRoadCenter,
        startEndpointKey: hexKey(start.endpointHex),
        targetEndpointKey: hexKey(targetEndpointHex)
      };
      if (!canAttachWildRoadCandidateToExistingRoad({ candidate, roads, region, hexTerrainByKey })) continue;
      result.push(candidate);
    }
  }
  return result;
}

function chooseBestWildRoadCandidate(candidates: WildRoadCandidate[]): WildRoadCandidate | null {
  if (candidates.length === 0) return null;
  const minRiverCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  let best = candidates.filter((candidate) => candidate.crossedRiverCount === minRiverCrossings);
  const maxTargetDistanceFromStartRoadCenter = Math.max(...best.map((candidate) => candidate.targetDistanceFromStartRoadCenter));
  best = best.filter((candidate) => candidate.targetDistanceFromStartRoadCenter === maxTargetDistanceFromStartRoadCenter);
  const minLength = Math.min(...best.map((candidate) => candidate.path.length));
  best = best.filter((candidate) => candidate.path.length === minLength);
  return randomFrom(best);
}

function canAttachWildRoadCandidateToExistingRoad(options: {
  candidate: WildRoadCandidate;
  roads: Road[];
  region: Region;
  hexTerrainByKey: Map<string, HexTerrainData>;
}): boolean {
  const { candidate, roads, region, hexTerrainByKey } = options;
  const startTouchHex = candidate.path[0];
  const targetTouchHex = candidate.path[candidate.path.length - 1];
  const allowedRoadHexes = [startTouchHex, targetTouchHex];
  if (!canAddRoadPath({ path: candidate.path, roads, region, hexTerrainByKey, allowedRoadHexes, allowExistingRoadOverlap: true })) return false;
  if (candidate.targetRoadId === candidate.startRoadId) return false;
  const startRoad = roads.find((road) => road.id === candidate.startRoadId);
  if (!startRoad) return false;
  const startNearHex = candidate.path.length > 1 ? candidate.path[1] : startTouchHex;
  const targetNearHex = candidate.path.length > 1 ? candidate.path[candidate.path.length - 2] : targetTouchHex;
  if (pathPassesNearSameRoad({
    path: candidate.path,
    road: startRoad,
    allowedTouchHexes: [startTouchHex],
    allowedNearHexes: [startNearHex]
  })) return false;
  if (candidate.targetRoadId !== undefined) {
    const targetRoad = roads.find((road) => road.id === candidate.targetRoadId);
    if (!targetRoad || pathPassesNearSameRoad({
      path: candidate.path,
      road: targetRoad,
      allowedTouchHexes: [targetTouchHex],
      allowedNearHexes: [targetNearHex]
    })) return false;
  }
  return true;
}

function addWildRoadCandidateToExistingRoad(options: {
  candidate: WildRoadCandidate;
  roads: Road[];
  region: Region;
  hexTerrainByKey: Map<string, HexTerrainData>;
}): boolean {
  const { candidate, roads, region, hexTerrainByKey } = options;
  if (!canAttachWildRoadCandidateToExistingRoad({ candidate, roads, region, hexTerrainByKey })) return false;
  const startRoad = roads.find((road) => road.id === candidate.startRoadId);
  if (!startRoad) return false;
  const segmentsToAdd: RoadSegment[] = [];
  for (let i = 1; i < candidate.path.length; i += 1) {
    segmentsToAdd.push({ from: candidate.path[i - 1], to: candidate.path[i], kind: 'road' });
  }
  startRoad.segments.push(...segmentsToAdd);

  if (candidate.targetRoadId !== undefined && candidate.targetRoadId !== candidate.startRoadId) {
    const targetRoadIndex = roads.findIndex((road) => road.id === candidate.targetRoadId);
    if (targetRoadIndex >= 0) {
      startRoad.segments.push(...roads[targetRoadIndex].segments);
      roads.splice(targetRoadIndex, 1);
    }
  }
  return true;
}


function getWildRoadCandidateBoundaryHexes(options: {
  region: Region;
  candidateHexes: AxialHex[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}): AxialHex[] {
  const { region, candidateHexes, hexTerrainByKey } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const candidatesByKey = new Map(candidateHexes.map((candidateHex) => [hexKey(candidateHex), candidateHex]));
  const boundaryCandidates = new Map<string, AxialHex>();

  for (const candidateHex of candidatesByKey.values()) {
    const candidateKey = hexKey(candidateHex);
    if (regionKeys.has(candidateKey)) continue;
    if (isLakeHex(candidateHex, hexTerrainByKey)) continue;
    if (!getHexNeighbors(candidateHex).some((neighbor) => regionKeys.has(hexKey(neighbor)))) continue;
    boundaryCandidates.set(candidateKey, candidateHex);
  }

  return Array.from(boundaryCandidates.values());
}

function trimPathToRegionHexes(path: AxialHex[], region: Region): AxialHex[] {
  const regionKeys = new Set(region.hexes.map(hexKey));
  const firstRegionIndex = path.findIndex((hex) => regionKeys.has(hexKey(hex)));
  if (firstRegionIndex < 0) return [];
  let lastRegionIndex = -1;
  for (let i = path.length - 1; i >= 0; i -= 1) {
    if (regionKeys.has(hexKey(path[i]))) {
      lastRegionIndex = i;
      break;
    }
  }
  if (lastRegionIndex < firstRegionIndex) return [];
  return path.slice(firstRegionIndex, lastRegionIndex + 1);
}

function getWildCandidateRoadCandidates(options: {
  region: Region;
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  candidateHexes: AxialHex[];
}): WildCandidateRoadCandidate[] {
  const { region, roads, rivers, hexTerrainByKey, candidateHexes } = options;
  const boundaryCandidates = getWildRoadCandidateBoundaryHexes({ region, candidateHexes, hexTerrainByKey });
  if (boundaryCandidates.length < 2) return [];

  const candidates: WildCandidateRoadCandidate[] = [];
  for (let i = 0; i < boundaryCandidates.length - 1; i += 1) {
    for (let j = i + 1; j < boundaryCandidates.length; j += 1) {
      const from = boundaryCandidates[i];
      const target = boundaryCandidates[j];
      const path = findLowestRiverCrossingPathWithinWildRegion({
        region,
        from,
        target,
        rivers,
        hexTerrainByKey,
        freeFirstRiverCrossing: true
      });
      if (!path || path.length < 3) continue;
      const trimmedPath = trimPathToRegionHexes(path, region);
      if (trimmedPath.length < 2) continue;
      if (pathPassesNearItself(trimmedPath)) continue;
      if (!canAddRoadPath({ path: trimmedPath, roads, region, hexTerrainByKey })) continue;
      candidates.push({
        path: trimmedPath,
        crossedRiverCount: countRoadPathRiverCrossings(trimmedPath, rivers)
      });
    }
  }
  return candidates;
}

function chooseBestWildCandidateRoadCandidate(candidates: WildCandidateRoadCandidate[]): WildCandidateRoadCandidate | null {
  if (candidates.length === 0) return null;
  const minRiverCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  const best = candidates.filter((candidate) => candidate.crossedRiverCount === minRiverCrossings);
  return randomFrom(best);
}

function addWildCandidateRoadCandidate(options: {
  candidate: WildCandidateRoadCandidate;
  roads: Road[];
  region: Region;
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextRoadId: number;
}): { roads: Road[]; nextRoadId: number; added: boolean } {
  const { candidate, roads, region, hexTerrainByKey, nextRoadId } = options;
  const allowedRoadHexes = [candidate.path[0], candidate.path[candidate.path.length - 1]];
  if (pathPassesNearItself(candidate.path)) return { roads, nextRoadId, added: false };
  if (!canAddRoadPath({ path: candidate.path, roads, region, hexTerrainByKey, allowedRoadHexes })) return { roads, nextRoadId, added: false };
  const segments: RoadSegment[] = [];
  for (let i = 1; i < candidate.path.length; i += 1) {
    segments.push({ from: candidate.path[i - 1], to: candidate.path[i], kind: 'road' });
  }
  return {
    roads: [...roads, { id: nextRoadId, regionId: region.id, segments }],
    nextRoadId: nextRoadId + 1,
    added: true
  };
}


type WildTrailPoint = {
  hex: AxialHex;
  isInsideRegion: boolean;
};

function getRoadHexKeysByKind(roads: Road[], kind: RoadKind): Set<string> {
  const keys = new Set<string>();
  for (const road of roads) {
    for (const segment of road.segments) {
      if (segment.kind !== kind) continue;
      keys.add(hexKey(segment.from));
      keys.add(hexKey(segment.to));
    }
  }
  return keys;
}

function getPoiLikeHexesForRegion(region: Region): AxialHex[] {
  const points = new Map<string, AxialHex>();
  points.set(hexKey(region.centerHex), region.centerHex);
  for (const poi of region.pointsOfInterest) points.set(hexKey(poi), poi);
  return Array.from(points.values());
}

function getWildTrailPoints(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}): WildTrailPoint[] {
  const { region, regions, roads, hexTerrainByKey } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const neighboringHexKeys = new Set<string>();
  for (const hex of region.hexes) {
    for (const neighbor of getHexNeighbors(hex)) {
      const neighborKey = hexKey(neighbor);
      if (!regionKeys.has(neighborKey)) neighboringHexKeys.add(neighborKey);
    }
  }

  const roadHexKeys = getRoadHexKeysByKind(roads, 'road');
  const pointsByKey = new Map<string, WildTrailPoint>();
  const allRegions = [region, ...regions.filter((otherRegion) => otherRegion.id !== region.id)];

  for (const sourceRegion of allRegions) {
    for (const point of getPoiLikeHexesForRegion(sourceRegion)) {
      const pointKey = hexKey(point);
      const isInsideRegion = regionKeys.has(pointKey);
      if (!isInsideRegion && !neighboringHexKeys.has(pointKey)) continue;
      if (roadHexKeys.has(pointKey)) continue;
      if (isLakeHex(point, hexTerrainByKey)) continue;
      pointsByKey.set(pointKey, { hex: point, isInsideRegion });
    }
  }

  return Array.from(pointsByKey.values());
}

function pathStepCrossesRiver(from: AxialHex, to: AxialHex, riverFullnessByEdge: Map<string, RiverFullness>): boolean {
  const sharedEdge = getSharedHexEdgeVertexKeys(from, to);
  if (!sharedEdge) return false;
  const edge = sharedEdge[0] < sharedEdge[1] ? `${sharedEdge[0]}|${sharedEdge[1]}` : `${sharedEdge[1]}|${sharedEdge[0]}`;
  return riverFullnessByEdge.has(edge);
}

function findWildTrailPath(options: {
  region: Region;
  from: AxialHex;
  target: AxialHex;
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}): AxialHex[] | null {
  const { region, from, target, rivers, hexTerrainByKey } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const startKey = hexKey(from);
  const targetKey = hexKey(target);
  if (startKey === targetKey) return null;
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey)) return null;

  const startInside = regionKeys.has(startKey);
  const targetInside = regionKeys.has(targetKey);
  if (!startInside && !targetInside) return null;

  const riverFullnessByEdge = getRiverCrossingFullnessByEdge(rivers);
  const queue: AxialHex[][] = [[from]];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    const currentKey = hexKey(current);
    if (path.length > 1 && currentKey === targetKey) return path;

    for (const neighbor of shuffleArray(getHexNeighbors(current))) {
      const neighborKey = hexKey(neighbor);
      if (visited.has(neighborKey)) continue;
      const neighborIsTarget = neighborKey === targetKey;
      const neighborInsideRegion = regionKeys.has(neighborKey);
      if (!neighborIsTarget && !neighborInsideRegion) continue;
      if (isLakeHex(neighbor, hexTerrainByKey)) continue;
      if (pathStepCrossesRiver(current, neighbor, riverFullnessByEdge)) continue;
      visited.add(neighborKey);
      queue.push([...path, neighbor]);
    }
  }

  return null;
}

function canBuildStandaloneWildRegionRoad(region: Region): boolean {
  return region.sizeCategory === 'large_region' || region.sizeCategory === 'land' || region.sizeCategory === 'vast_land';
}

function getWildRegionTrailBuildCount(region: Region): number {
  return canBuildStandaloneWildRegionRoad(region) ? 2 : 1;
}

function buildWildRegionTrail(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextRoadId: number;
}): { roads: Road[]; nextRoadId: number } {
  const { region, regions, roads, rivers, hexTerrainByKey, nextRoadId } = options;
  const trailPoints = getWildTrailPoints({ region, regions, roads, hexTerrainByKey });
  if (trailPoints.length < 2) {
    console.log('Wild trail result', { regionId: region.id, built: false, reason: 'fewer than two eligible points', eligiblePointCount: trailPoints.length });
    return { roads, nextRoadId };
  }

  const pairCandidates: Array<{ start: WildTrailPoint; target: WildTrailPoint }> = [];
  for (let i = 0; i < trailPoints.length - 1; i += 1) {
    for (let j = i + 1; j < trailPoints.length; j += 1) {
      const start = trailPoints[i];
      const target = trailPoints[j];
      if (!start.isInsideRegion && !target.isInsideRegion) continue;
      pairCandidates.push({ start, target });
    }
  }

  for (const pair of shuffleArray(pairCandidates)) {
    const path = findWildTrailPath({ region, from: pair.start.hex, target: pair.target.hex, rivers, hexTerrainByKey });
    if (!path || roadPathCrossesRiver(path, rivers)) continue;
    const addResult = addTrailPathWithoutDuplicateSegments({ path, roads, regionId: region.id, nextRoadId });
    console.log('Wild trail result', {
      regionId: region.id,
      built: addResult.added,
      from: hexKey(pair.start.hex),
      target: hexKey(pair.target.hex),
      fromInsideRegion: pair.start.isInsideRegion,
      targetInsideRegion: pair.target.isInsideRegion,
      pathLength: path.length
    });
    if (addResult.added) return { roads: addResult.roads, nextRoadId: addResult.nextRoadId };
  }

  console.log('Wild trail result', { regionId: region.id, built: false, reason: 'no valid path', eligiblePointCount: trailPoints.length });
  return { roads, nextRoadId };
}

function buildWildRegionTrails(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextRoadId: number;
}): { roads: Road[]; nextRoadId: number } {
  const { region, regions, rivers, hexTerrainByKey } = options;
  const trailBuildCount = getWildRegionTrailBuildCount(region);
  let builtRoads = options.roads;
  let nextRoadId = options.nextRoadId;

  for (let trailIndex = 0; trailIndex < trailBuildCount; trailIndex += 1) {
    const result = buildWildRegionTrail({
      region,
      regions,
      roads: builtRoads,
      rivers,
      hexTerrainByKey,
      nextRoadId
    });
    builtRoads = result.roads;
    nextRoadId = result.nextRoadId;
  }

  return { roads: builtRoads, nextRoadId };
}

function renderRoadSegments(roads: Road[], offsetX: number, offsetY: number): Array<{ key: string; x1: number; y1: number; x2: number; y2: number; kind: RoadKind }> {
  const result: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; kind: RoadKind }> = [];
  for (const road of roads) {
    for (let i = 0; i < road.segments.length; i += 1) {
      const s = road.segments[i];
      const p1 = toPixel(s.from.q, s.from.r);
      const p2 = toPixel(s.to.q, s.to.r);
      result.push({ key: `road-${road.id}-${i}`, x1: p1.x + offsetX, y1: p1.y + offsetY, x2: p2.x + offsetX, y2: p2.y + offsetY, kind: s.kind });
    }
  }
  return result;
}

function renderTrailDots(
  roadSegments: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; kind: RoadKind }>
): Array<{ key: string; x: number; y: number }> {
  const dots: Array<{ key: string; x: number; y: number }> = [];
  const dotSpacing = 14;
  for (const segment of roadSegments) {
    if (segment.kind !== 'trail') continue;
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) continue;
    const dotCount = Math.max(2, Math.floor(length / dotSpacing) + 1);
    for (let i = 0; i < dotCount; i += 1) {
      const t = dotCount === 1 ? 0.5 : i / (dotCount - 1);
      dots.push({
        key: `${segment.key}-dot-${i}`,
        x: segment.x1 + dx * t,
        y: segment.y1 + dy * t
      });
    }
  }
  return dots;
}

function getLakeVertices(allHexes: AxialHex[], hexTerrainByKey: Map<string, HexTerrainData>): LakeVertex[] {
  const uniqueVertices = new Map<string, LakeVertex>();
  for (const hex of allHexes) {
    const terrain = hexTerrainByKey.get(hexKey(hex));
    if (terrain?.terrainOverride !== 'lake') continue;
    for (const vertex of getHexCornerPoints(hex)) {
      uniqueVertices.set(vertex.key, vertex);
    }
  }
  return Array.from(uniqueVertices.values());
}

function getLakeEdgeKeys(allHexes: AxialHex[], hexTerrainByKey: Map<string, HexTerrainData>): Set<string> {
  const edgeKeys = new Set<string>();
  for (const hex of allHexes) {
    const terrain = hexTerrainByKey.get(hexKey(hex));
    if (terrain?.terrainOverride !== 'lake') continue;
    for (const edge of getHexEdgesAsVertexPairs(hex)) {
      edgeKeys.add(edge.edgeKey);
    }
  }
  return edgeKeys;
}

function isLakeEdge(edge: string, lakeEdgeKeys: Set<string>): boolean {
  return lakeEdgeKeys.has(edge);
}

// Рёбра морских гексов: сегменты рек, лежащие на них, не отрисовываются —
// река визуально заканчивается у берега и не «течёт по морю» (как с озёрами).
function getSeaEdgeKeys(hexTerrainByKey: Map<string, HexTerrainData>): Set<string> {
  const edgeKeys = new Set<string>();
  for (const [key, terrain] of hexTerrainByKey) {
    if (terrain.terrainOverride !== 'sea') continue;
    for (const edge of getHexEdgesAsVertexPairs(parseHexKey(key))) {
      edgeKeys.add(edge.edgeKey);
    }
  }
  return edgeKeys;
}

// Все вершины (углы) суши — вершины, принадлежащие хотя бы одному гексу региона.
function getLandVertexKeys(allRegionHexes: AxialHex[]): Set<string> {
  const keys = new Set<string>();
  for (const hex of allRegionHexes) {
    for (const corner of getHexCornerPoints(hex)) keys.add(corner.key);
  }
  return keys;
}

// BR-009: рукава дельты. Для рек, впадающих в море, при полноводности 4 строится
// 1 рукав, при 5 — 2 рукава. Рукав ответвляется за 1 (и 2) ребра до устья и идёт
// к соседней береговой вершине по суше (короткий распределитель). Полноводность
// рукава случайна (1–3 для f4, 1–4 для f5). Всё дополнительно — основные реки не
// меняются; вызывается в try/catch, поэтому сбой просто не добавит рукав.
function buildDeltaArmsForRivers(
  rivers: River[],
  regionId: number,
  riverGraph: RiverGraph,
  seaVertexKeys: Set<string>,
  seaEdgeKeys: Set<string>,
  startRiverId: number
): River[] {
  const arms: River[] = [];
  const usedVertexKeys = new Set(rivers.flatMap((r) => r.vertexPath.map((v) => v.key)));
  let nextId = startRiverId;
  for (const river of rivers) {
    if (river.regionId !== regionId) continue;
    const path = river.vertexPath;
    if (path.length < 3) continue;
    const mouth = path[path.length - 1];
    if (!seaVertexKeys.has(mouth.key)) continue; // только реки, впадающие в море
    const fullness = getRiverFallbackFullness(river);
    const armCount = fullness === 5 ? 2 : fullness === 4 ? 1 : 0;
    const fullnessRange = fullness === 5 ? 4 : 3;
    for (let a = 0; a < armCount; a += 1) {
      const branchIndex = path.length - 2 - a;
      if (branchIndex < 1) break;
      const branch = path[branchIndex];
      const node = riverGraph.nodes.get(branch.key);
      if (!node) continue;
      let target: RiverVertex | null = null;
      for (const incidentEdgeKey of node.incidentEdgeKeys) {
        const [k1, k2] = incidentEdgeKey.split('|');
        const otherKey = k1 === branch.key ? k2 : k1;
        if (otherKey === mouth.key || usedVertexKeys.has(otherKey)) continue;
        if (!seaVertexKeys.has(otherKey)) continue;          // конец рукава — у берега
        const otherNode = riverGraph.nodes.get(otherKey);
        if (!otherNode) continue;
        const candidate = { key: otherKey, x: otherNode.x, y: otherNode.y };
        if (seaEdgeKeys.has(edgeKey(branch, candidate))) continue; // ребро не по морю (иначе скрыто)
        target = candidate;
        break;
      }
      if (!target) continue;
      const armPath = [branch, target];
      const armFullness = (1 + Math.floor(Math.random() * fullnessRange)) as RiverFullness;
      const id = nextId++;
      arms.push({
        id,
        regionId,
        vertexPath: armPath,
        sectors: [{
          id: `delta-${id}-0`,
          riverId: id,
          sectorIndex: 0,
          vertexPath: armPath,
          edgeKeys: [edgeKey(branch, target)],
          startVertexKey: branch.key,
          endVertexKey: target.key,
          startReason: 'split',
          endReason: 'river_end',
          fullness: armFullness
        }]
      });
      usedVertexKeys.add(target.key);
    }
  }
  return arms;
}
// а также не даёт реке соединять море с морем: если ОБА конца — устья у моря,
// один конец уводится вглубь суши, оставляя единственное устье.
function trimRiverSourcesOffExistingSea(
  rivers: River[],
  previousRivers: River[],
  seaVertexKeys: Set<string>
): River[] {
  if (seaVertexKeys.size === 0) return rivers;
  const previousById = new Map(previousRivers.map((river) => [river.id, river]));
  return rivers.map((river) => {
    const path = river.vertexPath ?? [];
    if (path.length < 2) return river;
    if (!seaVertexKeys.has(path[0].key)) return river; // исток уже не на море
    if (!riverChangedFromPrevious(previousById.get(river.id), river)) return river; // старую неизменную реку не трогаем
    let start = 0;
    while (start < path.length - 1 && seaVertexKeys.has(path[start].key)) start += 1;
    // Нечего обрезать, либо обрезка оставила бы слишком короткую реку — оставляем как есть,
    // дальнейшая проверка getChangedRiverStartingFromSea отбракует регион (поведение как раньше).
    if (start === 0 || path.length - start < 2) return river;
    return { ...river, vertexPath: path.slice(start) };
  });
}

function getRiverStartingFromSea(rivers: River[], seaVertexKeys: Set<string>, seaEdgeKeys: Set<string> = new Set()): River | null {
  return rivers.find((river) => {
    const path = river.vertexPath ?? [];
    const start = path[0];
    if (start && seaVertexKeys.has(start.key)) return true;
    if (path.length >= 2 && seaEdgeKeys.has(edgeKey(path[0], path[1]))) return true;
    return false;
  }) ?? null;
}

function getChangedRiverStartingFromSea(previousRivers: River[], nextRivers: River[], seaKeys: Iterable<string>): River | null {
  const seaKeyList = Array.from(seaKeys);
  if (seaKeyList.length === 0) return null;
  const seaVertexKeys = getSeaVertexKeysFromSeaKeys(seaKeyList);
  const seaEdgeKeys = getSeaEdgeKeysFromSeaKeys(seaKeyList);
  const previousById = new Map(previousRivers.map((river) => [river.id, river]));

  return nextRivers.find((river) => {
    const previousRiver = previousById.get(river.id);
    if (!riverChangedFromPrevious(previousRiver, river)) return false;
    return getRiverStartingFromSea([river], seaVertexKeys, seaEdgeKeys) !== null;
  }) ?? null;
}


function getSeaVertexKeysFromSeaKeys(seaKeys: Iterable<string>): Set<string> {
  const vertexKeys = new Set<string>();
  for (const seaKey of seaKeys) {
    for (const corner of getHexCornerPoints(parseHexKey(seaKey))) vertexKeys.add(corner.key);
  }
  return vertexKeys;
}

function getSeaEdgeKeysFromSeaKeys(seaKeys: Iterable<string>): Set<string> {
  const edgeKeys = new Set<string>();
  for (const seaKey of seaKeys) {
    for (const edge of getHexEdgesAsVertexPairs(parseHexKey(seaKey))) edgeKeys.add(edge.edgeKey);
  }
  return edgeKeys;
}


type RiverSeaHeightViolationReason =
  | 'source_vertex_sea'
  | 'first_edge_sea'
  | 'source_and_mouth_sea'
  | 'non_mouth_vertex_sea'
  | 'non_mouth_edge_sea';

function getRiverSeaHeightViolation(
  rivers: River[],
  seaKeys: Iterable<string>
): { river: River; reason: RiverSeaHeightViolationReason } | null {
  const seaKeyList = Array.from(seaKeys);
  if (seaKeyList.length === 0) return null;

  const seaVertexKeys = getSeaVertexKeysFromSeaKeys(seaKeyList);
  const seaEdgeKeys = getSeaEdgeKeysFromSeaKeys(seaKeyList);
  if (seaVertexKeys.size === 0 && seaEdgeKeys.size === 0) return null;

  for (const river of rivers) {
    const path = river.vertexPath ?? [];
    if (path.length < 2) continue;

    const mouthIndex = path.length - 1;
    const sourceHeight = seaVertexKeys.has(path[0].key) ? SEA_HEIGHT_LEVEL : null;
    const mouthHeight = seaVertexKeys.has(path[mouthIndex].key) ? SEA_HEIGHT_LEVEL : null;

    if (sourceHeight === SEA_HEIGHT_LEVEL && mouthHeight === SEA_HEIGHT_LEVEL) {
      return { river, reason: 'source_and_mouth_sea' };
    }
    if (sourceHeight === SEA_HEIGHT_LEVEL) {
      return { river, reason: 'source_vertex_sea' };
    }
    if (seaEdgeKeys.has(edgeKey(path[0], path[1]))) {
      return { river, reason: 'first_edge_sea' };
    }

    for (let index = 1; index < path.length; index += 1) {
      const currentEdgeKey = edgeKey(path[index - 1], path[index]);
      const isLastEdgeToMouth = index === mouthIndex;
      const isPenultimateVertexOnSeaMouthEdge = index === mouthIndex - 1 && seaEdgeKeys.has(edgeKey(path[index], path[mouthIndex]));

      // A river that flows into an existing sea can share the final sea edge
      // with the coastline: both endpoints of that last edge are corners of
      // the sea hex. Treat the penultimate endpoint as part of the mouth, not
      // as an inland "river touches sea away from mouth" violation.
      if (index !== mouthIndex && !isPenultimateVertexOnSeaMouthEdge && seaVertexKeys.has(path[index].key)) {
        return { river, reason: 'non_mouth_vertex_sea' };
      }

      if (!seaEdgeKeys.has(currentEdgeKey)) continue;
      if (!isLastEdgeToMouth) {
        return { river, reason: 'non_mouth_edge_sea' };
      }
    }
  }

  return null;
}

function getChangedRiverSeaHeightViolation(
  previousRivers: River[],
  nextRivers: River[],
  seaKeys: Iterable<string>
): { river: River; reason: RiverSeaHeightViolationReason } | null {
  const seaKeyList = Array.from(seaKeys);
  if (seaKeyList.length === 0) return null;

  const previousById = new Map(previousRivers.map((river) => [river.id, river]));
  for (const river of nextRivers) {
    const previousRiver = previousById.get(river.id);
    if (!riverChangedFromPrevious(previousRiver, river)) continue;
    const violation = getRiverSeaHeightViolation([river], seaKeyList);
    if (violation) return violation;
  }

  return null;
}

function getRiverMouthVertexKeys(rivers: River[]): Set<string> {
  const mouthKeys = new Set<string>();
  for (const river of rivers) {
    const mouth = river.vertexPath?.[river.vertexPath.length - 1];
    if (mouth) mouthKeys.add(mouth.key);
  }
  return mouthKeys;
}

function getRiverTouchingSeaAwayFromMouth(
  rivers: River[],
  seaKeys: Iterable<string>,
  allowedMouthVertexKeys: Set<string>
): River | null {
  const seaKeyList = Array.from(seaKeys);
  const seaVertexKeys = getSeaVertexKeysFromSeaKeys(seaKeyList);
  const seaEdgeKeys = getSeaEdgeKeysFromSeaKeys(seaKeyList);
  if (seaVertexKeys.size === 0 && seaEdgeKeys.size === 0) return null;

  return rivers.find((river) => {
    const path = river.vertexPath ?? [];
    if (path.length < 2) return false;
    const mouthIndex = path.length - 1;
    const touchesInvalidVertex = path.some((vertex, index) => {
      if (!seaVertexKeys.has(vertex.key)) return false;
      return !(index === mouthIndex && allowedMouthVertexKeys.has(vertex.key));
    });
    if (touchesInvalidVertex) return true;

    for (let index = 1; index < path.length; index += 1) {
      const currentEdgeKey = edgeKey(path[index - 1], path[index]);
      if (!seaEdgeKeys.has(currentEdgeKey)) continue;
      const isLastEdgeToAllowedMouth = index === mouthIndex && allowedMouthVertexKeys.has(path[index].key);
      if (!isLastEdgeToAllowedMouth) return true;
    }
    return false;
  }) ?? null;
}

function getRiverTouchingSeaThroughRegionHexAwayFromMouth(
  rivers: River[],
  seaKeys: Iterable<string>,
  regionHexes: AxialHex[]
): River | null {
  const regionHexByKey = new Map(regionHexes.map((hex) => [hexKey(hex), hex]));
  for (const seaKey of seaKeys) {
    const seaHex = parseHexKey(seaKey);
    for (const neighbor of getHexNeighbors(seaHex)) {
      const regionHex = regionHexByKey.get(hexKey(neighbor));
      if (!regionHex) continue;
      for (const river of getRiversForHex(regionHex, rivers)) {
        const mouth = river.vertexPath?.[river.vertexPath.length - 1];
        if (!mouth || !seaHexTouchesRiverMouth(seaHex, mouth)) return river;
      }
    }
  }
  return null;
}

function getCoastalSeaRiverConflict(
  rivers: River[],
  seaKeys: Iterable<string>,
  _regionHexes: AxialHex[]
): River | null {
  const seaKeyList = Array.from(seaKeys);
  const seaVertexKeys = getSeaVertexKeysFromSeaKeys(seaKeyList);
  const seaEdgeKeys = getSeaEdgeKeysFromSeaKeys(seaKeyList);

  // This validation is intentionally narrow: it only rejects rivers that would
  // start from the sea. Broader "sea touches a river away from its mouth"
  // checks duplicated getRiverSeaHeightViolation and were stricter than the
  // coastline generator itself, causing valid coast candidates to be discarded
  // after river-mouth extension or delta generation.
  return getRiverStartingFromSea(rivers, seaVertexKeys, seaEdgeKeys);
}

function candidateHexHasRiverEdgeOrSourceAwayFromMouth(
  hex: AxialHex,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>
): boolean {
  const hexVertexKeys = new Set(getHexCornerPoints(hex).map((vertex) => vertex.key));
  const hexEdgeKeys = new Set(getHexEdgesAsVertexPairs(hex).map((edge) => edge.edgeKey));

  return rivers.some((river) => {
    const path = river.vertexPath ?? [];
    if (path.length < 2) return false;

    // Исток — это «конец реки, но не устье»: кандидат с таким углом не должен
    // становиться морем, иначе река начнётся из моря. Остальные касания вершиной
    // не блокируют море сами по себе: блокируют только рёбра, реально проходящие
    // по гексу-кандидату.
    if (hexVertexKeys.has(path[0].key)) return true;

    const mouthIndex = path.length - 1;
    for (let index = 1; index < path.length; index += 1) {
      const currentEdgeKey = edgeKey(path[index - 1], path[index]);
      if (!hexEdgeKeys.has(currentEdgeKey)) continue;
      const isLastEdgeToAllowedMouth = index === mouthIndex && allowedMouthVertexKeys.has(path[index].key);
      if (!isLastEdgeToAllowedMouth) return true;
    }

    return false;
  });
}

function canPlaceSeaHexNearRivers(
  hex: AxialHex,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>,
  _regionHexes: AxialHex[] = []
): boolean {
  return !candidateHexHasRiverEdgeOrSourceAwayFromMouth(hex, rivers, allowedMouthVertexKeys);
}

function filterSeaCandidatesByRiverInteraction(
  candidates: Map<string, AxialHex>,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>,
  regionHexes: AxialHex[] = []
): Map<string, AxialHex> {
  const filtered = new Map<string, AxialHex>();
  for (const [key, hex] of candidates) {
    if (canPlaceSeaHexNearRivers(hex, rivers, allowedMouthVertexKeys, regionHexes)) filtered.set(key, hex);
  }
  return filtered;
}

// Дядина модель: концы дорог — это «объекты» разметки (наряду с вершинами рек).
// Концы троп намеренно не учитываются: море не должно упираться в trail-only выходы.
// Гекс-кандидат, КАСАЮЩИЙСЯ конца дороги (сам гекс — конец дороги или его сосед),
// получает «красный крест»: морем стать не может. Поэтому фронт заполнения моря об такие
// гексы упирается так же, как об реки, а отрезанные ими кандидаты остаются сушей
// («красные минусы» — не могут быть смежными с морем, потому что кресты мешают).
function getRoadEndpointHexKeys(roads: Road[], centerHexKeys = new Set<string>()): Set<string> {
  const keys = new Set<string>();
  const roadHexKeysById = new Map(roads.map((road) => [road.id, getRoadHexKeySet(road, 'road')]));

  for (const road of roads) {
    for (const endpoint of getRoadEndpoints(road, 'road')) {
      const endpointKey = hexKey(endpoint);
      if (centerHexKeys.has(endpointKey)) continue;

      const ownRoadHexKeys = roadHexKeysById.get(road.id) ?? new Set<string>();
      const restsAgainstAnotherRoad = roads.some((otherRoad) => {
        if (otherRoad.id === road.id) return false;
        const otherRoadHexKeys = roadHexKeysById.get(otherRoad.id);
        if (!otherRoadHexKeys) return false;
        if (otherRoadHexKeys.has(endpointKey)) return true;
        return getHexNeighbors(endpoint).some((neighbor) => {
          const neighborKey = hexKey(neighbor);
          return !ownRoadHexKeys.has(neighborKey) && otherRoadHexKeys.has(neighborKey);
        });
      });
      if (restsAgainstAnotherRoad) continue;

      keys.add(endpointKey);
    }
  }
  return keys;
}

function candidateTouchesRoadEndpoint(hex: AxialHex, roadEndpointKeys: Set<string>): boolean {
  if (roadEndpointKeys.size === 0) return false;
  if (roadEndpointKeys.has(hexKey(hex))) return true;
  return getHexNeighbors(hex).some((neighbor) => roadEndpointKeys.has(hexKey(neighbor)));
}

function filterSeaCandidatesByRoadEndpoints(
  candidates: Map<string, AxialHex>,
  roads: Road[]
): Map<string, AxialHex> {
  const roadEndpointKeys = getRoadEndpointHexKeys(roads);
  if (roadEndpointKeys.size === 0) return candidates;
  const filtered = new Map<string, AxialHex>();
  for (const [key, hex] of candidates) {
    if (!candidateTouchesRoadEndpoint(hex, roadEndpointKeys)) filtered.set(key, hex);
  }
  return filtered;
}

// (Дядина модель, п.1) Единый сет «не-морских» гексов — кандидаты, которые НЕ МОГУТ стать
// морем, потому что касаются объектов, рядом с которыми моря быть не должно:
//   - реки (вне устья) — как и раньше, через canPlaceSeaHexNearRivers;
//   - концы дорог (но не троп);
//   - озёра (сосед-гекс с terrainOverride 'lake').
// Дальше эти ключи просто выкидываются из кандидатов перед раскладкой моря.
function getNonSeaCandidateKeys(
  candidates: Map<string, AxialHex>,
  rivers: River[],
  roads: Road[],
  existingTerrain: Map<string, HexTerrainData>,
  allowedMouthVertexKeys: Set<string>,
  regionHexes: AxialHex[],
  centerHexKeys = new Set<string>()
): Set<string> {
  const nonSea = new Set<string>();
  const roadEndpointKeys = getRoadEndpointHexKeys(roads, centerHexKeys);
  for (const [key, hex] of candidates) {
    if (!canPlaceSeaHexNearRivers(hex, rivers, allowedMouthVertexKeys, regionHexes)) { nonSea.add(key); continue; }
    if (candidateTouchesRoadEndpoint(hex, roadEndpointKeys)) { nonSea.add(key); continue; }
    if (getHexNeighbors(hex).some((neighbor) => existingTerrain.get(hexKey(neighbor))?.terrainOverride === 'lake')) { nonSea.add(key); continue; }
  }
  return nonSea;
}

function removeNonSeaCandidates(candidates: Map<string, AxialHex>, nonSeaKeys: Set<string>): Map<string, AxialHex> {
  if (nonSeaKeys.size === 0) return candidates;
  const filtered = new Map<string, AxialHex>();
  for (const [key, hex] of candidates) {
    if (!nonSeaKeys.has(key)) filtered.set(key, hex);
  }
  return filtered;
}

// Юрий: при генерации ПОБЕРЕЖЬЯ режем низовой хвост реки по сегментам, чьё ребро делит
// ОТКРЫТЫЙ гекс (суша региона) и НЕ ОТКРЫТЫЙ (кандидатный/серый) гекс. Идём от устья
// (последняя вершина) назад и убираем такие сегменты ПОДРЯД — река просто укорачивается,
// не распадается. Сегмент = ребро между двумя смежными гексами; эти два гекса — те, что
// содержат ОБЕ вершины ребра как свои углы (пересечение множеств в hexesByCornerKey).
// Сегмент суша|море (устье) не режется, т.к. морская сторона не кандидат.
function trimRiverCoastalBoundaryTail(
  river: River,
  openHexKeys: Set<string>,
  candidateHexKeys: Set<string>,
  hexesByCornerKey: Map<string, Set<string>>
): River {
  const path = river.vertexPath;
  if (path.length < 2) return river;
  let lastIndex = path.length - 1;
  while (lastIndex >= 1) {
    const fromOwners = hexesByCornerKey.get(path[lastIndex - 1].key);
    const toOwners = hexesByCornerKey.get(path[lastIndex].key);
    if (!fromOwners || !toOwners) break;
    let touchesOpen = false;
    let touchesCandidate = false;
    for (const edgeHexKey of fromOwners) {
      if (!toOwners.has(edgeHexKey)) continue; // только гексы, делящие ЭТО ребро
      if (openHexKeys.has(edgeHexKey)) touchesOpen = true;
      else if (candidateHexKeys.has(edgeHexKey)) touchesCandidate = true;
    }
    if (!(touchesOpen && touchesCandidate)) break;
    lastIndex -= 1;
  }
  if (lastIndex === path.length - 1) return river; // ничего не обрезали
  if (lastIndex < 1) return river; // обрезка съела бы всю реку — оставляем как есть
  return { ...river, vertexPath: path.slice(0, lastIndex + 1) };
}

function trimRiverEndsToLand(river: River, landVertexKeys: Set<string>, seaVertexKeys: Set<string>): River | null {
  const path = river.vertexPath;
  let start = 0;
  let end = path.length - 1;
  while (start <= end && !landVertexKeys.has(path[start].key)) start += 1;
  while (end >= start && !landVertexKeys.has(path[end].key)) end -= 1;
  // Река не может вытекать из моря и впадать в море одновременно: если оба конца
  // примыкают к морю, отрезаем начало вглубь, пока оно не перестанет касаться моря.
  while (start < end && seaVertexKeys.has(path[start].key)) start += 1;
  while (start <= end && !landVertexKeys.has(path[start].key)) start += 1;
  if (start > end) return null;
  if (start === 0 && end === path.length - 1) return river;
  const trimmed = path.slice(start, end + 1);
  if (trimmed.length < 2) return null;
  if (seaVertexKeys.has(trimmed[0].key)) return null;
  return { ...river, vertexPath: trimmed };
}

function riverPathSignature(river: River): string {
  return river.vertexPath.map((vertex) => vertex.key).join('>');
}

function riverSectorsSignature(river: River): string {
  return (river.sectors ?? []).map((sector) => `${sector.startVertexKey}>${sector.endVertexKey}:${sector.fullness}:${sector.assignedRegionId ?? ''}`).join('|');
}

function riverChangedFromPrevious(previousRiver: River | undefined, river: River): boolean {
  if (!previousRiver) return true;
  return riverPathSignature(previousRiver) !== riverPathSignature(river)
    || riverSectorsSignature(previousRiver) !== riverSectorsSignature(river);
}

function findRiverExtensionPathToSea(
  startVertex: RiverVertex,
  seaVertexKeys: Set<string>,
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  blockedVertexKeys: Set<string>,
  maxExtraEdges = 6
): RiverVertex[] | null {
  const startNode = riverGraph.nodes.get(startVertex.key);
  if (!startNode) return null;
  if (seaVertexKeys.has(startVertex.key)) return [startVertex];

  const queue: Array<{ key: string; path: string[] }> = [{ key: startVertex.key, path: [startVertex.key] }];
  const visited = new Set<string>([startVertex.key]);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current.path.length - 1 >= maxExtraEdges) continue;
    const currentNode = riverGraph.nodes.get(current.key);
    if (!currentNode) continue;

    for (const incidentEdgeKey of currentNode.incidentEdgeKeys) {
      if (usedRiverEdges.has(incidentEdgeKey)) continue;
      const edge = riverGraph.edges.get(incidentEdgeKey);
      if (!edge?.touchesRegion) continue;
      const nextKey = edge.a.key === current.key ? edge.b.key : edge.b.key === current.key ? edge.a.key : null;
      if (!nextKey || visited.has(nextKey)) continue;
      if (blockedVertexKeys.has(nextKey) && !seaVertexKeys.has(nextKey)) continue;

      const nextPath = [...current.path, nextKey];
      if (seaVertexKeys.has(nextKey)) {
        const result = nextPath.map((key) => riverGraph.nodes.get(key)).filter((node): node is RiverGraphNode => Boolean(node));
        if (result.length !== nextPath.length) return null;
        return result.map((node) => ({ key: node.key, x: node.x, y: node.y }));
      }

      visited.add(nextKey);
      queue.push({ key: nextKey, path: nextPath });
    }
  }

  return null;
}

function extendRiverMouthToSeaIfPossible(
  river: River,
  seaVertexKeys: Set<string>,
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>
): River {
  const path = river.vertexPath ?? [];
  if (path.length < 2) return river;
  const mouth = path[path.length - 1];
  if (seaVertexKeys.has(mouth.key)) return river;

  const blockedVertexKeys = new Set(path.map((vertex) => vertex.key));
  blockedVertexKeys.delete(mouth.key);
  const extensionPath = findRiverExtensionPathToSea(mouth, seaVertexKeys, riverGraph, usedRiverEdges, blockedVertexKeys);
  if (!extensionPath || extensionPath.length < 2) return river;

  return {
    ...river,
    vertexPath: [...path, ...extensionPath.slice(1)]
  };
}

function extendChangedRiverMouthsToSeaIfPossible(
  previousRivers: River[],
  nextRivers: River[],
  seaKeys: Iterable<string>,
  riverGraph: RiverGraph
): River[] {
  const seaKeyList = Array.from(seaKeys);
  if (seaKeyList.length === 0) return nextRivers;

  const seaVertexKeys = getSeaVertexKeysFromSeaKeys(seaKeyList);
  if (seaVertexKeys.size === 0) return nextRivers;

  const previousById = new Map(previousRivers.map((river) => [river.id, river]));
  const usedRiverEdges = buildUsedRiverEdges(nextRivers);

  return nextRivers.map((river) => {
    const previousRiver = previousById.get(river.id);
    const changed = riverChangedFromPrevious(previousRiver, river);
    const mouth = river.vertexPath?.[river.vertexPath.length - 1];
    const mouthTouchesNewSea = Boolean(mouth && Array.from(seaKeyList).some((key) => getHexCornerPoints(parseHexKey(key)).some((corner) => corner.key === mouth.key)));
    if (!changed && mouthTouchesNewSea) return river;

    const extendedRiver = extendRiverMouthToSeaIfPossible(river, seaVertexKeys, riverGraph, usedRiverEdges);
    if (extendedRiver !== river) {
      for (let index = river.vertexPath.length; index < extendedRiver.vertexPath.length; index += 1) {
        usedRiverEdges.add(edgeKey(extendedRiver.vertexPath[index - 1], extendedRiver.vertexPath[index]));
      }
      console.log('Extended river mouth to sea', {
        riverId: river.id,
        oldMouthKey: river.vertexPath[river.vertexPath.length - 1]?.key,
        newMouthKey: extendedRiver.vertexPath[extendedRiver.vertexPath.length - 1]?.key
      });
    }

    return extendedRiver;
  });
}

function sanitizeRiversForSea(
  previousRivers: River[],
  nextRivers: River[],
  landVertexKeys: Set<string>,
  seaVertexKeys: Set<string>,
  seaKeysToCheck: Iterable<string>,
  regionHexes: AxialHex[]
): River[] {
  void previousRivers;
  void landVertexKeys;
  void seaVertexKeys;
  void seaKeysToCheck;
  void regionHexes;
  return nextRivers;
}

function drawLakeVerticesDebug(lakeVertices: LakeVertex[], offsetX: number, offsetY: number) {
  return lakeVertices.map((vertex) => ({
    key: `dbg-lake-vertex-${vertex.key}`,
    cx: vertex.x + offsetX,
    cy: vertex.y + offsetY
  }));
}
function generateRoadsForRegion(options: {
  region: Region; regions: Region[]; roads: Road[]; rivers: River[]; hexTerrainByKey: Map<string, HexTerrainData>; nextRoadId: number; candidateHexes: AxialHex[];
}): { roads: Road[]; nextRoadId: number } {
  const { region, regions, roads, hexTerrainByKey, rivers, candidateHexes } = options;
  const usedRoadPoiKeys = new Set<string>();
  let nextRoadId = options.nextRoadId;
  let built = cloneRoads(roads);
  const settled = region.biomeLandType === 'settled';
  if (!settled) {
    let builtAnyWildRoad = false;
    const incomingWildRoadEndpoints = findIncomingRoadEndpointsForRegion(region, built, hexTerrainByKey, false, getRegionCenterHexKeys(regions))
      .filter((incomingEndpoint) => !isSameHex(incomingEndpoint.entryHex, region.centerHex) && !isLakeHex(incomingEndpoint.entryHex, hexTerrainByKey));
    const incomingWildRoadCount = getUniqueIncomingRoadCount(incomingWildRoadEndpoints);
    const usedWildRoadEndpointKeys = new Set<string>();
    while (true) {
      const wildCandidate = chooseBestWildRoadCandidate(getWildRoadCandidates({ region, regions, roads: built, rivers, hexTerrainByKey, candidateHexes, usedEndpointKeys: usedWildRoadEndpointKeys }));
      if (!wildCandidate) break;
      const added = addWildRoadCandidateToExistingRoad({ candidate: wildCandidate, roads: built, region, hexTerrainByKey });
      console.log('Wild road result', {
        regionId: region.id,
        built: added,
        startRoadId: wildCandidate.startRoadId,
        targetRoadId: wildCandidate.targetRoadId ?? null,
        targetKind: wildCandidate.targetKind,
        crossedRiverCount: wildCandidate.crossedRiverCount,
        pathLength: wildCandidate.path.length
      });
      if (!added) break;
      usedWildRoadEndpointKeys.add(wildCandidate.startEndpointKey);
      usedWildRoadEndpointKeys.add(wildCandidate.targetEndpointKey);
      builtAnyWildRoad = true;
    }

    if (!builtAnyWildRoad && incomingWildRoadCount === 0 && canBuildStandaloneWildRegionRoad(region)) {
      const candidateRoad = chooseBestWildCandidateRoadCandidate(getWildCandidateRoadCandidates({ region, roads: built, rivers, hexTerrainByKey, candidateHexes }));
      if (candidateRoad) {
        const addResult = addWildCandidateRoadCandidate({ candidate: candidateRoad, roads: built, region, hexTerrainByKey, nextRoadId });
        built = addResult.roads;
        nextRoadId = addResult.nextRoadId;
        builtAnyWildRoad = addResult.added;
        console.log('Wild candidate road result', {
          regionId: region.id,
          built: addResult.added,
          crossedRiverCount: candidateRoad.crossedRiverCount,
          pathLength: candidateRoad.path.length
        });
      }
    }

    if (!builtAnyWildRoad) {
      console.log('Wild road result', {
        regionId: region.id,
        built: false,
        reason: incomingWildRoadCount === 0
          ? (canBuildStandaloneWildRegionRoad(region) ? 'fewer than two candidate road endpoints' : 'standalone wild roads are only built for large regions and lands')
          : 'fewer than two incoming road endpoints or no valid cross-region road target'
      });
    }
    return buildWildRegionTrails({
      region,
      regions,
      roads: built,
      rivers,
      hexTerrainByKey,
      nextRoadId
    });
  }
  const finalizeSettledRoads = (result: { roads: Road[]; nextRoadId: number }) => normalizeSettledRegionRoadIds({ region, roads: result.roads, nextRoadId: result.nextRoadId });

  const boundaryHexes = getBoundaryHexes(region);
  const incoming = findIncomingRoadEndpointsForRegion(region, roads, hexTerrainByKey, true, getRegionCenterHexKeys(regions));
  const addRoadFromPath = (path: AxialHex[], kind: RoadKind, allowedRoadHexes: AxialHex[] = [], allowedDuplicateHexKeys = new Set<string>()) => {
    if (kind === 'trail' && roadPathCrossesRiver(path, rivers)) return false;
    if (!canAddRoadPath({ path, roads: built, region, hexTerrainByKey, allowedRoadHexes, allowedDuplicateHexKeys })) return false;
    const segs: RoadSegment[] = [];
    for (let i = 1; i < path.length; i += 1) segs.push({ from: path[i - 1], to: path[i], kind });
    built.push({ id: nextRoadId, regionId: region.id, segments: segs });
    nextRoadId += 1;
    return true;
  };
  const usedIncomingRoadIds = new Set<number>();
  let firstIncomingEntryHex: AxialHex | null = null;
  const buildBestIncomingRoadToTargets = (targetHexes: AxialHex[], logLabel: string): SettledIncomingRoadCandidate | null => {
    const candidates = incoming
      .filter((inc) => !usedIncomingRoadIds.has(inc.roadId))
      .flatMap((inc) => collectSettledIncomingRoadPathsToTarget({
        region,
        incoming: inc,
        targetHexes,
        roads: built,
        rivers,
        hexTerrainByKey,
        usedRoadPoiKeys,
        maxAlternatives: 6
      }));
    const best = chooseBestSettledIncomingRoadCandidate(candidates);
    if (!best) {
      console.log(logLabel, { regionId: region.id, built: false, reason: 'no valid incoming road path' });
      return null;
    }

    const added = addRoadFromPath(best.extendedPath, 'road', [best.incoming.endpointHex, best.incoming.entryHex, best.targetHex]);
    console.log(logLabel, {
      regionId: region.id,
      built: added,
      incomingRoadId: best.incoming.roadId,
      incomingRoadHex: hexKey(best.incoming.endpointHex),
      entryHex: hexKey(best.incoming.entryHex),
      targetHex: hexKey(best.targetHex),
      touchedPoiCount: best.touchedPoiCount,
      crossedRiverCount: best.crossedRiverCount,
      pathLength: best.extendedPath.length
    });
    if (!added) return null;

    usedIncomingRoadIds.add(best.incoming.roadId);
    if (!firstIncomingEntryHex) firstIncomingEntryHex = best.incoming.entryHex;
    markPoiOnPathAsUsed(best.extendedPath, region, usedRoadPoiKeys);
    return best;
  };

  const getSupplementalRoadStartHexes = (anchorHex: AxialHex, excludeHexKeys = new Set<string>()) => {
    const roadHexKeys = getRoadHexKeys(built);
    const uniqueStarts = new Map<string, AxialHex>();
    for (const hex of [...getUnusedPoiTargets(region, usedRoadPoiKeys, hexTerrainByKey), ...region.hexes]) {
      const key = hexKey(hex);
      if (uniqueStarts.has(key)) continue;
      if (excludeHexKeys.has(key)) continue;
      if (isSameHex(hex, region.centerHex)) continue;
      if (isLakeHex(hex, hexTerrainByKey)) continue;
      if (roadHexKeys.has(key)) continue;
      uniqueStarts.set(key, hex);
    }
    return Array.from(uniqueStarts.values()).sort((a, b) => hexDistance(b, anchorHex) - hexDistance(a, anchorHex));
  };

  const collectDirectSupplementalCandidates = (options: {
    startHexes: AxialHex[];
    targetHexes: AxialHex[];
    anchorHex: AxialHex;
    maxAlternatives: number;
  }): SupplementalSettledRoadCandidate[] => {
    const candidates: SupplementalSettledRoadCandidate[] = [];
    const uniqueTargets = options.targetHexes.filter((targetHex, index, allTargets) => allTargets.findIndex((other) => hexKey(other) === hexKey(targetHex)) === index);
    for (const startHex of options.startHexes) {
      for (const targetHex of uniqueTargets) {
        if (isSameHex(startHex, targetHex)) continue;
        const basePaths = findAlternativeRoadPathsWithinRegion({
          region,
          from: startHex,
          target: targetHex,
          roads: built,
          hexTerrainByKey,
          maxAlternatives: options.maxAlternatives
        });
        for (const basePath of basePaths) {
          if (!canAddRoadPath({ path: basePath, roads: built, region, hexTerrainByKey, allowedRoadHexes: [startHex, targetHex] })) continue;
          const touchedPoiKeys = getPoiKeysOnRoadPath(basePath, region);
          const touchedPoiCount = Array.from(touchedPoiKeys).filter((key) => !usedRoadPoiKeys.has(key)).length;
          candidates.push({
            startHex,
            anchorDistance: hexDistance(startHex, options.anchorHex),
            basePath,
            extendedPath: basePath,
            targetHex,
            targetIsPoi: isPointOfInterestHex(targetHex, region),
            crossedRiverCount: countRoadPathRiverCrossings(basePath, rivers),
            touchedPoiCount,
            touchedPoiKeys
          });
        }
      }
    }
    return candidates;
  };

  const buildSupplementalRoadToCenter = (anchorHex: AxialHex, logLabel: string): boolean => {
    const candidates = collectDirectSupplementalCandidates({
      startHexes: getSupplementalRoadStartHexes(anchorHex, new Set([hexKey(region.centerHex)])),
      targetHexes: [region.centerHex],
      anchorHex,
      maxAlternatives: 6
    });
    const best = chooseBestSupplementalSettledRoadCandidate(candidates);
    if (!best) {
      console.log(logLabel, { regionId: region.id, built: false, reason: 'no valid supplemental center road path' });
      return false;
    }
    const added = addRoadFromPath(best.extendedPath, 'road', [best.startHex, region.centerHex]);
    console.log(logLabel, {
      regionId: region.id,
      built: added,
      startHex: hexKey(best.startHex),
      targetHex: hexKey(region.centerHex),
      anchorDistance: best.anchorDistance,
      touchedPoiCount: best.touchedPoiCount,
      crossedRiverCount: best.crossedRiverCount,
      pathLength: best.extendedPath.length
    });
    if (!added) return false;
    markPoiOnPathAsUsed(best.extendedPath, region, usedRoadPoiKeys);
    return true;
  };

  const getCandidateFacingSupplementalEndpoints = (anchorHex: AxialHex): AxialHex[] => {
    const availableStartHexes = getSupplementalRoadStartHexes(anchorHex);
    return getCandidateFacingRegionBorderHexes(region, candidateHexes)
      .filter((hex) => availableStartHexes.some((startHex) => isSameHex(startHex, hex)))
      .filter((hex) => !isAdjacentToRoadHex(hex, built));
  };

  const buildSupplementalRoadFromCenterToCandidateFacingEndpoint = (anchorHex: AxialHex, logLabel: string): boolean => {
    const targetHexes = getCandidateFacingSupplementalEndpoints(anchorHex);
    const candidates: SupplementalSettledRoadCandidate[] = [];
    for (const targetHex of targetHexes) {
      const basePaths = findAlternativeRoadPathsWithinRegion({
        region,
        from: region.centerHex,
        target: targetHex,
        roads: built,
        hexTerrainByKey,
        maxAlternatives: 6
      });
      for (const basePath of basePaths) {
        if (!canAddRoadPath({ path: basePath, roads: built, region, hexTerrainByKey, allowedRoadHexes: [region.centerHex, targetHex] })) continue;
        const touchedPoiKeys = getPoiKeysOnRoadPath(basePath, region);
        const touchedPoiCount = Array.from(touchedPoiKeys).filter((key) => !usedRoadPoiKeys.has(key)).length;
        candidates.push({
          startHex: region.centerHex,
          anchorDistance: hexDistance(targetHex, anchorHex),
          basePath,
          extendedPath: basePath,
          targetHex,
          targetIsPoi: isPointOfInterestHex(targetHex, region),
          crossedRiverCount: countRoadPathRiverCrossings(basePath, rivers),
          touchedPoiCount,
          touchedPoiKeys
        });
      }
    }
    const best = chooseBestSupplementalSettledRoadCandidate(candidates);
    if (!best) {
      console.log(logLabel, { regionId: region.id, built: false, reason: 'no valid supplemental center-to-candidate-facing path' });
      return false;
    }
    const added = addRoadFromPath(best.extendedPath, 'road', [region.centerHex, best.targetHex]);
    console.log(logLabel, {
      regionId: region.id,
      built: added,
      startHex: hexKey(region.centerHex),
      targetHex: hexKey(best.targetHex),
      anchorDistance: best.anchorDistance,
      touchedPoiCount: best.touchedPoiCount,
      crossedRiverCount: best.crossedRiverCount,
      pathLength: best.extendedPath.length
    });
    if (!added) return false;
    markPoiOnPathAsUsed(best.extendedPath, region, usedRoadPoiKeys);
    return true;
  };

  const buildSupplementalRoadToExistingRoad = (anchorHex: AxialHex, logLabel: string): boolean => {
    const roadTargets = getNonLakeRoadHexesInRegion(region, built, hexTerrainByKey);
    const startHexes = getCandidateFacingSupplementalEndpoints(anchorHex);
    const candidates = collectDirectSupplementalCandidates({ startHexes, targetHexes: roadTargets, anchorHex, maxAlternatives: 6 });
    const best = chooseBestSupplementalSettledRoadCandidate(candidates);
    if (!best) {
      console.log(logLabel, { regionId: region.id, built: false, reason: 'no valid supplemental road-to-road path' });
      return false;
    }
    const added = addRoadFromPath(best.extendedPath, 'road', [best.startHex, best.targetHex]);
    console.log(logLabel, {
      regionId: region.id,
      built: added,
      startHex: hexKey(best.startHex),
      targetHex: hexKey(best.targetHex),
      anchorDistance: best.anchorDistance,
      touchedPoiCount: best.touchedPoiCount,
      crossedRiverCount: best.crossedRiverCount,
      pathLength: best.extendedPath.length
    });
    if (!added) return false;
    markPoiOnPathAsUsed(best.extendedPath, region, usedRoadPoiKeys);
    return true;
  };

  const enforceSettledRoadMinimum = (anchorHex: AxialHex, requireCandidateFacingSecondRoad = false) => {
    const centerRoadMinimum = Math.min(2, getSettledMainRoadLimit(region));
    while (getRoadBuildCountForSettledRegion(region, built) < centerRoadMinimum) {
      const builtSupplementalRoad = requireCandidateFacingSecondRoad
        ? buildSupplementalRoadFromCenterToCandidateFacingEndpoint(anchorHex, 'Supplemental settled candidate-facing road result')
        : buildSupplementalRoadToCenter(anchorHex, 'Supplemental settled center road result');
      if (!builtSupplementalRoad) break;
    }
    while (getRoadBuildCountForSettledRegion(region, built) < getSettledMainRoadLimit(region)) {
      if (!buildSupplementalRoadToExistingRoad(anchorHex, 'Supplemental settled road-to-road result')) break;
    }
  };

  if (incoming.length > 0) {
    buildBestIncomingRoadToTargets([region.centerHex], 'First settled incoming road result');
    buildBestIncomingRoadToTargets([region.centerHex], 'Second settled incoming road result');

    while (getRoadBuildCountForSettledRegion(region, built) < getSettledMainRoadLimit(region)) {
      const roadTargets = getNonLakeRoadHexesInRegion(region, built, hexTerrainByKey)
        .filter((hex) => !isSameHex(hex, region.centerHex));
      if (roadTargets.length === 0) break;
      if (!buildBestIncomingRoadToTargets(roadTargets, 'Additional settled incoming road result')) break;
    }

    enforceSettledRoadMinimum(firstIncomingEntryHex ?? region.centerHex, getUniqueIncomingRoadCount(incoming) === 1);
    return finalizeSettledRoads(connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId }));
  }
  if (incoming.length === 0) {
    const maxCandidates = 3;
    const firstPoiTargets = getUnusedPoiTargets(region, usedRoadPoiKeys, hexTerrainByKey).sort((a, b) => hexDistance(b, region.centerHex) - hexDistance(a, region.centerHex));
    const firstFallbackTargets = getAvailableRoadFallbackHexes({ region, fromHex: region.centerHex, roads: built, hexTerrainByKey, usedRoadPoiKeys, excludeHexKeys: new Set([hexKey(region.centerHex)]) });
    let firstBest: RoadCandidatePath | null = null;
    for (const targetPoi of firstPoiTargets) {
      const candidates = collectAlternativeRoadPathsToTarget({ region, fromHex: region.centerHex, targetHex: targetPoi, targetIsPoi: true, roads: built, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives: maxCandidates });
      firstBest = chooseBestRoadCandidate(candidates);
      if (firstBest) break;
    }
    if (!firstBest) {
      for (const fallbackHex of firstFallbackTargets) {
        const candidates = collectAlternativeRoadPathsToTarget({ region, fromHex: region.centerHex, targetHex: fallbackHex, targetIsPoi: false, roads: built, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives: maxCandidates });
        firstBest = chooseBestRoadCandidate(candidates);
        if (firstBest) break;
      }
    }
    if (!firstBest) {
      enforceSettledRoadMinimum(region.centerHex);
      return finalizeSettledRoads(connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId }));
    }
    if (addRoadFromPath(firstBest.extendedPath, 'road', [region.centerHex, firstBest.targetHex, firstBest.extendedPath[firstBest.extendedPath.length - 1]], new Set([hexKey(firstBest.targetHex)]))) {
      markPoiOnPathAsUsed(firstBest.extendedPath, region, usedRoadPoiKeys);
    } else {
      enforceSettledRoadMinimum(region.centerHex);
      return finalizeSettledRoads(connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId }));
    }
    const firstAnchorHex = firstBest.extendedPath[firstBest.extendedPath.length - 1];
    const firstPathKeys = new Set(firstBest.extendedPath.map(hexKey).filter((key) => key !== hexKey(region.centerHex)));
    const candidateKeys = new Set(candidateHexes.map(hexKey));
    const candidateTargets = getRegionBorderHexes(region)
      .flatMap((entryHex) => getHexNeighbors(entryHex)
        .filter((candidateHex) => candidateKeys.has(hexKey(candidateHex)))
        .map((candidateHex) => ({ entryHex, candidateHex })))
      .filter((target, index, allTargets) => allTargets.findIndex((other) => hexKey(other.entryHex) === hexKey(target.entryHex) && hexKey(other.candidateHex) === hexKey(target.candidateHex)) === index)
      .filter((target) => !isSameHex(target.entryHex, region.centerHex))
      .filter((target) => !firstPathKeys.has(hexKey(target.entryHex)))
      .filter((target) => !isLakeHex(target.entryHex, hexTerrainByKey) && !isLakeHex(target.candidateHex, hexTerrainByKey));
    const secondCandidateRoads: SettledCandidateRoadCandidate[] = [];
    for (const target of candidateTargets) {
      const basePaths = findAlternativeRoadPathsWithinRegion({
        region,
        from: region.centerHex,
        target: target.entryHex,
        roads: built,
        hexTerrainByKey,
        maxAlternatives: maxCandidates
      });
      for (const basePath of basePaths) {
        const extendedPath = [...basePath, target.candidateHex];
        if (!canAddRoadPath({ path: extendedPath, roads: built, region, hexTerrainByKey, allowedRoadHexes: [region.centerHex], allowedDuplicateHexKeys: new Set([hexKey(target.entryHex)]) })) continue;
        const touchedPoiKeys = getPoiKeysOnRoadPath(extendedPath, region);
        const touchedPoiCount = Array.from(touchedPoiKeys).filter((key) => !usedRoadPoiKeys.has(key)).length;
        secondCandidateRoads.push({
          candidateHex: target.candidateHex,
          entryHex: target.entryHex,
          candidateDistanceFromAnchor: hexDistance(firstAnchorHex, target.candidateHex),
          basePath,
          extendedPath,
          targetHex: target.candidateHex,
          targetIsPoi: false,
          crossedRiverCount: countRoadPathRiverCrossings(extendedPath, rivers),
          touchedPoiCount,
          touchedPoiKeys
        });
      }
    }
    const secondBest = chooseBestSettledCandidateRoadCandidate(secondCandidateRoads);
    const secondRoadPath = secondBest ? trimPathToRegionHexes(secondBest.extendedPath, region) : [];
    if (secondBest && addRoadFromPath(secondRoadPath, 'road', [region.centerHex, secondBest.entryHex], new Set([hexKey(secondBest.entryHex)]))) {
      console.log('Second settled candidate road result', {
        regionId: region.id,
        built: true,
        candidateHex: hexKey(secondBest.candidateHex),
        entryHex: hexKey(secondBest.entryHex),
        distanceFromFirstRoadEnd: secondBest.candidateDistanceFromAnchor,
        touchedPoiCount: secondBest.touchedPoiCount,
        crossedRiverCount: secondBest.crossedRiverCount,
        pathLength: secondRoadPath.length,
        trimmedCandidateExitSegment: secondRoadPath.length < secondBest.extendedPath.length
      });
      markPoiOnPathAsUsed(secondRoadPath, region, usedRoadPoiKeys);
    } else {
      console.log('Second settled candidate road result', {
        regionId: region.id,
        built: false,
        reason: 'no valid candidate road path'
      });
    }
    const largeRegionLabels = new Set<Region['sizeLabel']>(['Большой регион', 'Край', 'Обширный край']);
    if (largeRegionLabels.has(region.sizeLabel)) {
      const existingRoadHexKeys = getRoadHexKeys(built);
      const thirdCandidateTargets = getRegionBorderHexes(region)
        .flatMap((entryHex) => getHexNeighbors(entryHex)
          .filter((candidateHex) => candidateKeys.has(hexKey(candidateHex)))
          .map((candidateHex) => ({ entryHex, candidateHex })))
        .filter((target, index, allTargets) => allTargets.findIndex((other) => hexKey(other.entryHex) === hexKey(target.entryHex) && hexKey(other.candidateHex) === hexKey(target.candidateHex)) === index)
        .filter((target) => {
          const entryKey = hexKey(target.entryHex);
          if (isSameHex(target.entryHex, region.centerHex)) return false;
          if (isLakeHex(target.entryHex, hexTerrainByKey) || isLakeHex(target.candidateHex, hexTerrainByKey)) return false;
          if (existingRoadHexKeys.has(entryKey)) return false;
          if (isAdjacentToRoadHex(target.entryHex, built)) return false;
          return true;
        })
        .sort((a, b) => hexDistance(b.entryHex, region.centerHex) - hexDistance(a.entryHex, region.centerHex));
      const roadHexCandidates = getRoadHexesInRegion(region, built)
        .filter((hex) => !isLakeHex(hex, hexTerrainByKey));

      const thirdCandidates: RoadCandidatePath[] = [];
      for (const target of thirdCandidateTargets) {
        const sortedRoadHexCandidates = [...roadHexCandidates].sort((a, b) => hexDistance(a, target.entryHex) - hexDistance(b, target.entryHex));
        for (const roadHex of sortedRoadHexCandidates) {
          if (thirdCandidates.length >= 10) break;
          const basePath = findRoadPathWithinRegion({
            region,
            from: roadHex,
            targets: [target.entryHex],
            roads: built,
            hexTerrainByKey,
            allowRoadHexes: [roadHex]
          });
          if (!basePath) continue;
          const extendedPath = [...basePath, target.candidateHex];
          if (!canAddRoadPath({ path: extendedPath, roads: built, region, hexTerrainByKey, allowedRoadHexes: [roadHex, target.entryHex] })) continue;
          const touchedPoiKeys = getPoiKeysOnRoadPath(extendedPath, region);
          const touchedPoiCount = Array.from(touchedPoiKeys).filter((key) => !usedRoadPoiKeys.has(key)).length;
          thirdCandidates.push({
            basePath,
            extendedPath,
            targetHex: target.candidateHex,
            targetIsPoi: false,
            crossedRiverCount: countRoadPathRiverCrossings(extendedPath, rivers),
            touchedPoiCount,
            touchedPoiKeys
          });
        }
        if (thirdCandidates.length >= 10) break;
      }
      const thirdBest = chooseBestThirdRoadCandidate(thirdCandidates);
      const thirdRoadPath = thirdBest ? trimPathToRegionHexes(thirdBest.extendedPath, region) : [];
      if (thirdBest && thirdRoadPath.length >= 2) {
        const roadHex = thirdRoadPath[0];
        const entryHex = thirdRoadPath[thirdRoadPath.length - 1];
        const candidateHex = thirdBest.targetHex;
        const entryEndIsRegionBorder = getRegionBorderHexes(region).some((hex) => isSameHex(hex, entryHex));
        const candidateEndIsCandidate = candidateKeys.has(hexKey(candidateHex));
        const roadStartHasExistingRoad = hexHasRoad(roadHex, built);
        const preBuildEntryAdjacentToRoad = isAdjacentToRoadHex(entryHex, built);
        const pathHasLake = thirdBest.extendedPath.some((hex) => isLakeHex(hex, hexTerrainByKey));
        const trimmedCandidateExitSegment = thirdRoadPath.length < thirdBest.extendedPath.length;
        const isValid = entryEndIsRegionBorder
          && candidateEndIsCandidate
          && areHexesAdjacent(entryHex, candidateHex)
          && !isLakeHex(entryHex, hexTerrainByKey)
          && !isLakeHex(candidateHex, hexTerrainByKey)
          && !preBuildEntryAdjacentToRoad
          && roadStartHasExistingRoad
          && !pathHasLake
          && trimmedCandidateExitSegment;
        if (isValid) {
          const added = addRoadFromPath(thirdRoadPath, 'road', [roadHex, entryHex]);
          console.log('Third settled road result', {
            regionId: region.id,
            built: added,
            entryHex: hexKey(entryHex),
            candidateHex: hexKey(candidateHex),
            roadStart: hexKey(roadHex),
            touchedPoiCount: thirdBest.touchedPoiCount,
            crossedRiverCount: thirdBest.crossedRiverCount,
            pathLength: thirdRoadPath.length,
            entryEndIsRegionBorder,
            candidateEndIsCandidate,
            roadStartHasExistingRoad,
            trimmedCandidateExitSegment
          });
          if (added) markPoiOnPathAsUsed(thirdRoadPath, region, usedRoadPoiKeys);
        } else {
          console.warn('Third settled road validation failed', {
            regionId: region.id,
            entryHex: hexKey(entryHex),
            candidateHex: hexKey(candidateHex),
            roadStart: hexKey(roadHex),
            entryEndIsRegionBorder,
            candidateEndIsCandidate,
            roadStartHasExistingRoad,
            preBuildEntryAdjacentToRoad,
            pathHasLake,
            trimmedCandidateExitSegment
          });
          console.log('Third settled road result', {
            regionId: region.id,
            built: false,
            entryHex: hexKey(entryHex),
            candidateHex: hexKey(candidateHex),
            roadStart: hexKey(roadHex),
            touchedPoiCount: thirdBest.touchedPoiCount,
            crossedRiverCount: thirdBest.crossedRiverCount,
            pathLength: thirdRoadPath.length,
            entryEndIsRegionBorder,
            candidateEndIsCandidate,
            roadStartHasExistingRoad,
            trimmedCandidateExitSegment
          });
        }
      } else {
        console.log('Third settled road result', {
          regionId: region.id,
          built: false,
          entryHex: null,
          candidateHex: thirdBest ? hexKey(thirdBest.targetHex) : null,
          roadStart: null,
          touchedPoiCount: thirdBest?.touchedPoiCount ?? 0,
          crossedRiverCount: thirdBest?.crossedRiverCount ?? 0,
          pathLength: thirdRoadPath.length,
          entryEndIsRegionBorder: false,
          candidateEndIsCandidate: thirdBest ? candidateKeys.has(hexKey(thirdBest.targetHex)) : false,
          roadStartHasExistingRoad: false,
          trimmedCandidateExitSegment: false
        });
      }
    }
    enforceSettledRoadMinimum(firstAnchorHex ?? region.centerHex);
    return finalizeSettledRoads(connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId }));
  }
  let attempts = 0;
  while (countRoadSegmentsTouchingHex(region.centerHex, built) < 2 && attempts < 10) {
    attempts += 1;
    const roadHexes = getRoadHexKeys(built);
    const poiKeys = new Set(region.pointsOfInterest.map((poi) => hexKey(poi)));
    const freePoiTargets = getUnusedPoiTargets(region, usedRoadPoiKeys, hexTerrainByKey)
      .filter((h) => !isSameHex(h, region.centerHex));
    const freeHexTargets = region.hexes
      .filter((h) => !roadHexes.has(hexKey(h)) && !isSameHex(h, region.centerHex) && !poiKeys.has(hexKey(h)) && !isLakeHex(h, hexTerrainByKey));
    const candidateTargets = [...freePoiTargets, ...freeHexTargets]
      .filter((h, i, arr) => arr.findIndex((x) => hexKey(x) === hexKey(h)) === i)
      .sort((a, b) => hexDistance(a, region.centerHex) - hexDistance(b, region.centerHex));
    let added = false;
    for (const mid of candidateTargets) {
      const p1 = findRoadPathWithinRegion({ region, from: region.centerHex, targets: [mid], roads: built, hexTerrainByKey, allowRoadHexes: [region.centerHex, mid] });
      if (!p1) continue;
      const temporaryRoads = [...built, { id: -1, regionId: region.id, segments: p1.slice(1).map((h, i) => ({ from: p1[i], to: h, kind: 'road' as RoadKind })) }];
      const p2 = findRoadPathWithinRegion({ region, from: mid, targets: boundaryHexes, roads: temporaryRoads, hexTerrainByKey, allowRoadHexes: [region.centerHex, mid] });
      if (!p2) continue;
      const combined = [...p1, ...p2.slice(1)];
      if (addRoadFromPath(combined, 'road', [region.centerHex, mid, p2[p2.length - 1]], new Set([hexKey(mid)]))) {
        if (isPointOfInterestHex(mid, region)) usedRoadPoiKeys.add(hexKey(mid));
        added = true;
        break;
      }
    }
    if (!added) break;
  }
  return finalizeSettledRoads(connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId }));
}

export function App() {
  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const mapScaleRef = useRef(1);
  const pinchZoomRef = useRef<{ distance: number; scale: number } | null>(null);
  const mapDragRef = useRef<{ pointerId: number; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const mapToolbarRef = useRef<HTMLDivElement | null>(null);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const [language, setLanguage] = useState<Language>('ru');
  const t = UI_TEXT[language];
  const [regions, setRegions] = useState<Region[]>([]);
  const [candidateHexes, setCandidateHexes] = useState<AxialHex[]>([]);
  const [rivers, setRivers] = useState<River[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [selectedHex, setSelectedHex] = useState<AxialHex | null>(START_HEX);
  const [debugRivers, setDebugRivers] = useState(false);
  const [hexTerrainByKey, setHexTerrainByKey] = useState<Map<string, HexTerrainData>>(new Map());
  const [nextLakeId, setNextLakeId] = useState(1);
  const [nextRoadId, setNextRoadId] = useState(1);
  // Стек снимков состояния карты: один снимок на каждый добавленный регион.
  const [history, setHistory] = useState<MapSnapshot[]>([]);
  // Отложенная перегенерация: ставим заявку, ждём пока React применит
  // восстановленный снимок, и только потом генерируем регион заново.
  const [pendingRegen, setPendingRegen] = useState<{ anchorHex: AxialHex; options: GenerationOptions } | null>(null);
  // Параметры ручной генерации ('auto' — прежнее случайное поведение).
  const [genSizeCategory, setGenSizeCategory] = useState<'auto' | Region['sizeCategory']>('auto');
  const [genLandType, setGenLandType] = useState<'auto' | BiomeLandType>('auto');
  const [genBiome, setGenBiome] = useState<'auto' | BiomeId>('auto');
  const [genCoastal, setGenCoastal] = useState<'auto' | CoastalPreference>('mainland');
  // Уведомление пользователю (например, почему не создалось побережье).
  const [coastNotice, setCoastNotice] = useState<string | null>(null);
  const [clickPromptCandidateKey, setClickPromptCandidateKey] = useState<string | null>(null);

  const allRegionHexes = useMemo(() => regions.flatMap((region) => region.hexes), [regions]);

  const metadataMap = useMemo(() => {
    const map = new Map<string, HexMeta>();
    for (const region of regions) {
      for (const hex of region.hexes) {
        const key = hexKey(hex);
        map.set(key, {
          regionId: region.id,
          isCenter: hexKey(region.centerHex) === key,
          isAnchor: hexKey(region.anchorHex) === key
        });
      }
    }
    return map;
  }, [regions]);

  const positionedHexes = useMemo(() => {
    const isStartPromptVisible = allRegionHexes.length === 0 && candidateHexes.length === 0;
    // Гексы-море берутся из карты terrain-данных (они не принадлежат ни одному региону).
    // Защита: если гекс почему-то числится и регионом, и морем (старые данные/импорт),
    // он считается сушей — море на гексе региона не рисуется.
    const regionHexKeySet = new Set(allRegionHexes.map(hexKey));
    const seaHexList: AxialHex[] = [];
    for (const [key, terrain] of hexTerrainByKey) {
      if (terrain.terrainOverride === 'sea' && !regionHexKeySet.has(key)) seaHexList.push(parseHexKey(key));
    }
    const all = [
      ...allRegionHexes.map((hex) => ({ ...hex, kind: 'region' as const })),
      ...seaHexList.map((hex) => ({ ...hex, kind: 'sea' as const })),
      ...candidateHexes.map((hex) => ({ ...hex, kind: 'candidate' as const }))
    ];
    if (all.length === 0) {
      all.push({ ...START_HEX, kind: 'candidate' as const });
    }

    const withPixels = all.map((hex) => ({ ...hex, ...toPixel(hex.q, hex.r), key: hexKey(hex), regionId: metadataMap.get(hexKey(hex))?.regionId }));
    const minX = Math.min(...withPixels.map((h) => h.x));
    const maxX = Math.max(...withPixels.map((h) => h.x));
    const minY = Math.min(...withPixels.map((h) => h.y));
    const maxY = Math.max(...withPixels.map((h) => h.y));
    const hexWidth = HEX_SIZE * SQRT3;
    const hexHeight = HEX_SIZE * 2;
    const promptPadding = isStartPromptVisible ? START_PROMPT_HEX_PADDING : 0;
    const offsetX = -minX + hexWidth / 2 + promptPadding;
    const offsetY = -minY + HEX_SIZE + promptPadding;

    return {
      width: maxX - minX + hexWidth + promptPadding * 2,
      height: maxY - minY + hexHeight + promptPadding * 2,
      hexes: withPixels.map((h) => ({ ...h, x: h.x + offsetX, y: h.y + offsetY }))
    };
  }, [allRegionHexes, candidateHexes, metadataMap, hexTerrainByKey]);

  useEffect(() => {
    if (regions.length < 1 || regions.length > 2 || candidateHexes.length === 0) {
      setClickPromptCandidateKey(null);
      return;
    }

    const pickRandomCandidateKey = (previousKey: string | null = null) => {
      const candidateKeys = candidateHexes.map(hexKey);
      const availableKeys = candidateKeys.length > 1
        ? candidateKeys.filter((candidateKey) => candidateKey !== previousKey)
        : candidateKeys;
      return availableKeys[Math.floor(Math.random() * availableKeys.length)] ?? null;
    };

    setClickPromptCandidateKey((previousKey) => pickRandomCandidateKey(previousKey));
    const intervalId = window.setInterval(() => {
      setClickPromptCandidateKey((previousKey) => pickRandomCandidateKey(previousKey));
    }, CLICK_PROMPT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [regions.length, candidateHexes]);

  const lakeVertices = useMemo(() => getLakeVertices(allRegionHexes, hexTerrainByKey), [allRegionHexes, hexTerrainByKey]);
  const lakeEdgeKeys = useMemo(() => getLakeEdgeKeys(allRegionHexes, hexTerrainByKey), [allRegionHexes, hexTerrainByKey]);
  // Сегменты рек скрываются и над озёрами, и над морем (река заканчивается у берега).
  const hiddenRiverEdgeKeys = useMemo(() => {
    const combined = new Set(lakeEdgeKeys);
    for (const key of getSeaEdgeKeys(hexTerrainByKey)) combined.add(key);
    return combined;
  }, [lakeEdgeKeys, hexTerrainByKey]);

  const riverSegments = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    const offsetX = (HEX_SIZE * SQRT3) / 2 - minBaseX;
    const offsetY = HEX_SIZE - minBaseY;
    return rivers.flatMap((river) => renderRiverSegments(river, offsetX, offsetY, hiddenRiverEdgeKeys));
  }, [positionedHexes, rivers, hiddenRiverEdgeKeys]);
  const riverDirectionArrows = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    const offsetX = (HEX_SIZE * SQRT3) / 2 - minBaseX;
    const offsetY = HEX_SIZE - minBaseY;
    return rivers.flatMap((river) => renderRiverDirectionArrows(river, offsetX, offsetY, hiddenRiverEdgeKeys));
  }, [positionedHexes, rivers, hiddenRiverEdgeKeys]);
  const roadSegments = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    return renderRoadSegments(roads, (HEX_SIZE * SQRT3) / 2 - minBaseX, HEX_SIZE - minBaseY);
  }, [positionedHexes, roads]);
  const trailDots = useMemo(() => renderTrailDots(roadSegments), [roadSegments]);

  const riverOffset = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return { x: 0, y: 0 };
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    return { x: (HEX_SIZE * SQRT3) / 2 - minBaseX, y: HEX_SIZE - minBaseY };
  }, [positionedHexes]);
  const lakeVerticesDebug = useMemo(
    () => drawLakeVerticesDebug(lakeVertices, riverOffset.x, riverOffset.y),
    [lakeVertices, riverOffset.x, riverOffset.y]
  );

  const riverGraphsByRegion = useMemo(() => {
    const map = new Map<number, RiverGraph>();
    for (const region of regions) {
      try {
        map.set(region.id, buildRiverGraphForRegion(region.hexes, region.hexes, candidateHexes));
      } catch {
        // debug only
      }
    }
    return map;
  }, [regions, candidateHexes]);

  const candidateBoundaryDebugByRegion = useMemo(() => {
    const map = new Map<number, { edges: HexEdge[]; vertices: RiverVertex[]; invalidVertices: RiverVertex[]; edgeKeys: string[]; vertexKeys: string[] }>();
    for (const region of regions) {
      const edges = getCandidateBoundaryEdgesForRegion(region.hexes, candidateHexes);
      const vertices = getCandidateBoundaryVerticesForRegion(region.hexes, candidateHexes);
      const invalidVertices = validateCandidateBoundaryVertices(region.hexes, candidateHexes, vertices);
      map.set(region.id, {
        edges,
        vertices,
        invalidVertices,
        edgeKeys: edges.map((edge) => edge.edgeKey),
        vertexKeys: vertices.map((vertex) => vertex.key)
      });
    }
    return map;
  }, [regions, candidateHexes]);

  const addRegionToMap = (anchorHex: AxialHex, options: GenerationOptions = {}) => {
    const maxRegionAttempts = 30;
    const autoCoastRoll = Math.random();
    setCoastNotice(null);
    const existingSeaKeysForMainland = getSeaHexKeys(hexTerrainByKey);
    const mainlandZeroWeightHexes = options.coastalPreference === 'mainland'
      ? getSeaAdjacentHexKeys(existingSeaKeysForMainland)
      : new Set<string>();
    for (let attempt = 0; attempt < maxRegionAttempts; attempt += 1) {
      let targetSize = options.targetSize ?? rollRegionTargetSize();
      const occupiedHexes = new Set(allRegionHexes.map(hexKey));
      // Море — не суша: рост региона не должен захватывать гексы моря.
      for (const seaKey of getSeaHexKeys(hexTerrainByKey)) occupiedHexes.add(seaKey);
      const enclosedAnchorArea = findEnclosedEmptyAreaContainingHex(anchorHex, occupiedHexes);
      if (enclosedAnchorArea) targetSize = enclosedAnchorArea.length;
      const regionId = Math.max(0, ...regions.map((region) => region.id)) + 1;
      let regionHexes = enclosedAnchorArea ?? generateConnectedRegionFromAnchor(anchorHex, targetSize, occupiedHexes, mainlandZeroWeightHexes);
      if (!enclosedAnchorArea && options.coastalPreference !== 'mainland') {
        regionHexes = fillSmallEnclosedAreasForRegion(regionHexes, allRegionHexes, getSeaHexKeys(hexTerrainByKey));
      }
      const finalSize = regionHexes.length;
      const { sizeCategory, sizeLabel } = getRegionSizeCategory(finalSize);
      const centerHex = chooseRegionCenter(regionHexes);
      const regionByHexKey = new Map<string, Region>();
      for (const region of regions) {
        for (const hex of region.hexes) regionByHexKey.set(hexKey(hex), region);
      }
      const adjacentBiomeIds = getAdjacentRegionBiomes(regionHexes, regionByHexKey);
      const nextAllHexesPreview = [...allRegionHexes, ...regionHexes];
      const existingSeaForRivers = getSeaHexKeys(hexTerrainByKey);
      const nextCandidateHexesPreview = getCandidateHexes(nextAllHexesPreview);
      const candidateRegionForTopologyCheck: Region = {
        id: regionId,
        hexes: regionHexes,
        centerHex,
        anchorHex,
        targetSize,
        finalSize,
        sizeCategory,
        sizeLabel,
        biomeLandType: 'wild',
        heightLevel: 1,
        biomeId: FALLBACK_BIOME_ID,
        biomeLabel: BIOMES[FALLBACK_BIOME_ID].label,
        biomePrimaryEmoji: BIOMES[FALLBACK_BIOME_ID].primaryEmoji,
        biomeSecondaryEmojis: [...BIOMES[FALLBACK_BIOME_ID].secondaryEmojis],
        biomeEmojiLabel: BIOMES[FALLBACK_BIOME_ID].primaryEmoji + BIOMES[FALLBACK_BIOME_ID].secondaryEmojis.join(''),
        pointsOfInterest: []
      };
      const candidateRiverGraph = buildRiverGraphForRegion(
        candidateRegionForTopologyCheck.hexes,
        candidateRegionForTopologyCheck.hexes,
        nextCandidateHexesPreview
      );
      const touchingEndpoints = findRiverEndpointsTouchingRegion(
        candidateRegionForTopologyCheck,
        rivers,
        candidateRiverGraph
      );
      const existingSeaKeys = getSeaHexKeys(hexTerrainByKey);
      const forcedCoastContinuation = regionForcesCoastContinuation(regionHexes, existingSeaKeys);
      const hasOutgoingRiverToExistingRegion = regionHasOutgoingRiverToExistingRegion(touchingEndpoints);
      const isCoastalRegion = enclosedAnchorArea ? false
        : options.coastalPreference === 'coast' ? true
        : options.coastalPreference === 'mainland' ? false
        : forcedCoastContinuation ? true
        : hasOutgoingRiverToExistingRegion ? false
        : regions.length === 0 ? autoCoastRoll < START_REGION_AUTO_COAST_PROBABILITY
        : autoCoastRoll < coastProbabilityFromSpan(computeMapMaxSpanTiles(allRegionHexes));
      const biomeLandType = options.landType ?? (regions.length === 0 ? 'settled' : chooseCoastalAwareLandType(isCoastalRegion));
      // Выбор биома: либо принудительно заданный пользователем, либо обычный
      // взвешенный выбор. Принудительный биом всё равно проверяется на
      // совместимость с ограничением высоты от рек.
      const pickBiome = (constraint: RiverHeightConstraint): ChooseBiomeResult => {
        if (options.biomeId) {
          return isBiomeAllowedByRiverHeightConstraint(options.biomeId, constraint)
            ? { biomeId: options.biomeId }
            : { biomeId: null, reason: 'river_height_constraint_failed' };
        }
        return chooseBiomeId(biomeLandType, adjacentBiomeIds, regionId, constraint);
      };
      const candidateRegionForRiverCheck: Region = {
        ...candidateRegionForTopologyCheck,
        biomeLandType
      };
      const riverHeightConstraint = getRiverHeightConstraintForCandidateRegion(
        candidateRegionForRiverCheck,
        regions,
        rivers,
        nextCandidateHexesPreview
      );
      console.log('River height constraint for candidate region', {
        regionId,
        minHeight: riverHeightConstraint.minHeight,
        maxHeight: riverHeightConstraint.maxHeight,
        reasons: riverHeightConstraint.reasons
      });
      let riversForGeneration = rivers;
      let effectiveRiverHeightConstraint = riverHeightConstraint;
      let biomeChoice = pickBiome(effectiveRiverHeightConstraint);

      if (!biomeChoice.biomeId && biomeChoice.reason === 'river_height_constraint_failed') {
        const outgoingEndpointRiverIds = new Set(
          touchingEndpoints
            .filter((endpoint) => endpoint.endpointType === 'start')
            .map((endpoint) => endpoint.riverId)
        );
        const conflictingOutgoingRiverIds = getConflictingOutgoingRiverIds(
          touchingEndpoints,
          regions,
          riverHeightConstraint
        );
        // Only trim rivers whose current start endpoint is treated as outgoing
        // from the candidate region. Incoming river ends must keep constraining
        // the candidate height instead of being shortened here.
        const outgoingRiverIdsToTrim = conflictingOutgoingRiverIds.length > 0
          ? conflictingOutgoingRiverIds.filter((riverId) => outgoingEndpointRiverIds.has(riverId))
          : Array.from(outgoingEndpointRiverIds);

        if (outgoingRiverIdsToTrim.length > 0) {
          riversForGeneration = trimConflictingOutgoingRiversAwayFromRegion(
            riversForGeneration,
            outgoingRiverIdsToTrim,
            regionHexes,
            regionId
          );
          effectiveRiverHeightConstraint = getRiverHeightConstraintForCandidateRegion(
            candidateRegionForRiverCheck,
            regions,
            riversForGeneration,
            nextCandidateHexesPreview
          );
          biomeChoice = pickBiome(effectiveRiverHeightConstraint);
        }

        if (!biomeChoice.biomeId && biomeChoice.reason === 'river_height_constraint_failed') {
          console.warn('Region attempt discarded because no biome satisfies river height constraints', {
            regionId,
            attempt,
            riverHeightConstraint,
            effectiveRiverHeightConstraint,
            trimmedOutgoingRiverIds: outgoingRiverIdsToTrim,
            adjacentBiomeIds,
            biomeLandType
          });
          continue;
        }
      }
      if (!biomeChoice.biomeId) {
        console.warn('No biome available for candidate region; retrying region generation', {
          regionId,
          attempt,
          riverHeightConstraint,
          effectiveRiverHeightConstraint,
          adjacentBiomeIds,
          biomeLandType
        });
        continue;
      }
      const biomeId = biomeChoice.biomeId;
      const biome = BIOMES[biomeId] ?? BIOMES[FALLBACK_BIOME_ID];
      const heightLevel = BIOMES[biomeId]?.heightLevel ?? 1;
      const { lakesByHex, nextLakeId: computedNextLakeId } = assignLakesForRegion(regionHexes, centerHex, nextLakeId, biomeId);
      const centralPoiKind = assignCentralPoiKindForRegion(biomeLandType, sizeCategory);
      const regionBase: Omit<Region, 'pointsOfInterest'> = {
        id: regionId,
        hexes: regionHexes,
        centerHex,
        anchorHex,
        targetSize,
        finalSize,
        sizeCategory,
        sizeLabel,
        biomeLandType,
        heightLevel,
        biomeId,
        biomeLabel: biome.label,
        biomePrimaryEmoji: biome.primaryEmoji,
        biomeSecondaryEmojis: [...biome.secondaryEmojis],
        biomeEmojiLabel: biome.primaryEmoji + biome.secondaryEmojis.join(''),
        centralPoiKind,
        isCoastal: isCoastalRegion
      };
      const regionForRiverGeneration: Region = {
        ...regionBase,
        pointsOfInterest: []
      };
      console.log('Region size generated', { regionId, targetSize, finalSize, sizeLabel });
      console.log('Biome selected', {
        regionId,
        regionCount: regions.length,
        biomeLandType,
        adjacentBiomeIds,
        selectedBiomeId: biomeId,
        selectedBiomeLabel: BIOMES[biomeId]?.label
      });
      if (finalSize > targetSize) {
        console.log('Region size exceeded target because enclosed areas were filled', {
          regionId,
          targetSize,
          finalSize,
          exceededBy: finalSize - targetSize
        });
      }
      const nextRegionsForRiverGeneration = [...regions, regionForRiverGeneration];
      const nextHexTerrainByKeyPreview = new Map(hexTerrainByKey);
      for (const [key, terrain] of lakesByHex) nextHexTerrainByKeyPreview.set(key, terrain);
      mergeAdjacentLakeIds(nextHexTerrainByKeyPreview);
      const nextAllHexes = nextRegionsForRiverGeneration.flatMap((r) => r.hexes);
      // Обычный речной фронт не фильтрует существующее море заранее. Исключение — новый
      // прибрежный регион: море убирается из общего фронта и добавляется обратно только
      // рядом с этим регионом как явная цель устья. У материка нет дополнительных
      // ограничений по морю: sea-adjacent гексы просто имеют нулевой вес роста.
      const existingSeaRiverMouthTargetHexes = isCoastalRegion
        ? getAdjacentSeaHexesForRegion(regionHexes, nextHexTerrainByKeyPreview)
        : [];
      const nextCandidateHexes = uniqueHexes([
        ...getCandidateHexes(nextAllHexes, isCoastalRegion ? existingSeaForRivers : undefined),
        ...existingSeaRiverMouthTargetHexes
      ]);
      const riverResult = enclosedAnchorArea
        ? { success: true as const, rivers: riversForGeneration }
        : generateRiverForRegion(
          regionForRiverGeneration,
          nextRegionsForRiverGeneration,
          riversForGeneration,
          nextCandidateHexes,
          nextHexTerrainByKeyPreview
        );
      if (!riverResult.success) {
        console.warn('Discarding failed candidate region', { attempt, reason: riverResult.reason });
        continue;
      }
      mergeAdjacentLakeIds(nextHexTerrainByKeyPreview);

      // Вариант 2 (спасти сушу): если подключение коннектора посадило исток реки на
      // существующее море, подтягиваем исток назад до первой сухопутной вершины (устье
      // не трогаем). Так зажатый морем карман может стать сушей без реки, текущей из моря.
      const existingSeaVertexKeysForTrim = getSeaVertexKeysFromSeaKeys(getSeaHexKeys(hexTerrainByKey));
      const connectedRivers = trimRiverSourcesOffExistingSea(riverResult.rivers, riversForGeneration, existingSeaVertexKeysForTrim);

      if (!validateExistingRiverEdgeFullnessPreserved(rivers, connectedRivers)) {
        console.warn('Discarding failed candidate region because old river edge fullness was not preserved', { attempt });
        continue;
      }
      let finalizedRivers = assignRiverSectors(
        connectedRivers,
        getLakesForRegions(nextRegionsForRiverGeneration, nextHexTerrainByKeyPreview),
        nextRegionsForRiverGeneration,
        nextCandidateHexes,
        [],
        { recalculatedRegionId: regionId }
      );
      finalizedRivers = restoreInvalidGeneratedRiversForRegion(regionForRiverGeneration, riversForGeneration, finalizedRivers, nextCandidateHexes);

      // Юрий: для ПОБЕРЕЖЬЯ режем низовой хвост реки по сегментам, чьё ребро делит открытый
      // гекс (суша региона) и неоткрытый (кантидатный/серый) — ДО проверок реки-vs-море и до
      // построения моря. Река просто укорачивается. Сегмент суша|море (устье) не трогаем.
      if (isCoastalRegion) {
        const openHexKeys = new Set<string>(nextAllHexes.map(hexKey));
        const candidateHexKeys = new Set<string>(nextCandidateHexes.map(hexKey));
        const hexesByCornerKey = new Map<string, Set<string>>();
        for (const hex of [...nextAllHexes, ...nextCandidateHexes]) {
          const ownerKey = hexKey(hex);
          for (const corner of getHexCornerPoints(hex)) {
            const owners = hexesByCornerKey.get(corner.key) ?? new Set<string>();
            owners.add(ownerKey);
            hexesByCornerKey.set(corner.key, owners);
          }
        }
        const previousRiverById = new Map(riversForGeneration.map((river) => [river.id, river]));
        let trimmedAnyRiver = false;
        const trimmedRivers = finalizedRivers.map((river) => {
          if (!riverChangedFromPrevious(previousRiverById.get(river.id), river)) return river;
          const trimmed = trimRiverCoastalBoundaryTail(river, openHexKeys, candidateHexKeys, hexesByCornerKey);
          if (trimmed !== river) {
            trimmedAnyRiver = true;
            return trimmed;
          }
          return river;
        });
        if (trimmedAnyRiver) {
          finalizedRivers = assignRiverSectors(
            trimmedRivers,
            getLakesForRegions(nextRegionsForRiverGeneration, nextHexTerrainByKeyPreview),
            nextRegionsForRiverGeneration,
            nextCandidateHexes,
            [],
            { recalculatedRegionId: regionId }
          );
        }
      }
      if (!validateExistingRiverEdgeFullnessPreserved(rivers, finalizedRivers)) {
        console.warn('Discarding failed candidate region because final river sector assignment changed old edge fullness', { attempt });
        continue;
      }
      const initialRiverCycleValidation = validateRiverCycleSafety(finalizedRivers);
      if (!initialRiverCycleValidation.valid) {
        console.warn('Discarding failed candidate region because river cycle was detected', { attempt, regionId, ...initialRiverCycleValidation });
        continue;
      }

      // Старое одиночное море (артефакт) не должно блокировать генерацию: реки-vs-старое-море
      // проверяем против существующего моря БЕЗ одиночных гексов.
      const existingSeaForRiverChecks = getNonSolitarySeaHexKeys(hexTerrainByKey);
      const changedRiverStartingFromExistingSea = getChangedRiverStartingFromSea(
        riversForGeneration,
        finalizedRivers,
        existingSeaForRiverChecks
      );
      if (changedRiverStartingFromExistingSea) {
        console.warn('Discarding failed candidate region because a generated river starts from existing sea', {
          attempt,
          regionId,
          riverId: changedRiverStartingFromExistingSea.id
        });
        continue;
      }
      const existingSeaHeightViolation = getChangedRiverSeaHeightViolation(riversForGeneration, finalizedRivers, existingSeaForRiverChecks);
      if (existingSeaHeightViolation) {
        console.warn('Discarding failed candidate region because a river violates sea height before coast generation', {
          attempt,
          regionId,
          riverId: existingSeaHeightViolation.river.id,
          reason: existingSeaHeightViolation.reason
        });
        continue;
      }


      const regionTerrainByHex = new Map<string, HexTerrainData>();
      for (const hex of regionHexes) {
        const terrain = nextHexTerrainByKeyPreview.get(hexKey(hex));
        if (terrain) regionTerrainByHex.set(hexKey(hex), terrain);
      }

      // В прибрежном освоенном регионе переносим центральный гекс к устью
      // сразу после построения рек, чтобы POI и дороги уже строились от
      // прибрежного центра. Дикий прибрежный регион сохраняет обычный центр.
      const coastalRiverMouthCenterHex = isCoastalRegion && biomeLandType === 'settled'
        ? chooseRiverMouthCenterHex(regionHexes, finalizedRivers)
        : null;
      if (isCoastalRegion && biomeLandType === 'settled' && !coastalRiverMouthCenterHex) {
        console.warn('Discarding failed settled coastal candidate region because no center hex touches a boundary river mouth', { attempt, regionId });
        continue;
      }
      const preliminaryCenterHex = coastalRiverMouthCenterHex ?? centerHex;
      const centerHexMovedToRiverMouth = !isSameHex(preliminaryCenterHex, centerHex);

      const preliminaryPointsOfInterest = assignPointsOfInterestForRegion(regionHexes, preliminaryCenterHex, regionTerrainByHex);
      const preliminaryRegion: Region = {
        ...regionForRiverGeneration,
        centerHex: preliminaryCenterHex,
        pointsOfInterest: preliminaryPointsOfInterest,
        isCoastal: false
      };

      // Дороги строятся ДО моря: их концы сразу попадают в ограничения для
      // раскладки прибрежных вод, поэтому море больше не нужно выпиливать
      // пост-фактум вокруг новых дорожных выходов.
      const roadResult = generateRoadsForRegion({
        region: preliminaryRegion,
        regions,
        roads,
        rivers: finalizedRivers,
        hexTerrainByKey: nextHexTerrainByKeyPreview,
        nextRoadId,
        candidateHexes: nextCandidateHexes
      });
      const roadEndpointKeysAfterRoads = getRoadEndpointHexKeys(roadResult.roads);

      // Море прибрежного региона: ставится ПОСЛЕ генерации рек и дорог, поэтому
      // реки уже завершились на внешнем фронте, а новые дорожные выходы заранее
      // исключены из морских кандидатов.
      const occupiedRegionKeysForSea = new Set(allRegionHexes.map(hexKey));
      const allowedSeaMouthVertexKeys = getRiverMouthVertexKeys(finalizedRivers);
      let seaHexKeys = isCoastalRegion
        ? extendSeaToCoastalCenterCandidate(
          regionHexes,
          computeSeaHexKeysForCoastalRegion(regionHexes, preliminaryCenterHex, nextHexTerrainByKeyPreview, occupiedRegionKeysForSea, regions, finalizedRivers, regionId, roadResult.roads),
          nextHexTerrainByKeyPreview,
          occupiedRegionKeysForSea,
          finalizedRivers,
          allowedSeaMouthVertexKeys,
          roadResult.roads
        )
        : [];
      const coastalSeaValidation = isCoastalRegion
        ? validateCoastalSeaArea(regionHexes, seaHexKeys, getSeaHexKeys(hexTerrainByKey), finalizedRivers, regionId, regions)
        : { valid: true as const };
      let effectiveIsCoastalRegion = isCoastalRegion;
      if (coastalSeaValidation.valid === false) {
        if (!centerHexMovedToRiverMouth && options.coastalPreference !== 'coast' && coastalSeaValidation.reason === 'no_sea_hexes') {
          seaHexKeys = [];
          effectiveIsCoastalRegion = false;
        } else {
          console.warn('Discarding failed coastal candidate region because sea area is invalid', { attempt, regionId, reason: coastalSeaValidation.reason });
          continue;
        }
      }
      if (effectiveIsCoastalRegion && seaHexKeys.length === 0) {
        console.warn('Discarding failed coastal candidate region because no sea hexes were generated', { attempt, regionId });
        continue;
      }
      const finalCenterHex = preliminaryCenterHex;
      const finalRegion: Region = {
        ...preliminaryRegion,
        centerHex: finalCenterHex,
        // Регион считается прибрежным, только если у него реально появилось море.
        isCoastal: effectiveIsCoastalRegion && seaHexKeys.length > 0
      };
      const nextRegions = [...regions, finalRegion];

      const existingSeaKeysBeforeRegion = getSeaHexKeys(hexTerrainByKey);
      const newSeaKeySet = new Set(seaHexKeys);
      const allSeaKeys = new Set(existingSeaKeysBeforeRegion);
      for (const key of seaHexKeys) allSeaKeys.add(key);
      // Старое море, уже оторванное от океана ДО этого региона (артефакт прежней
      // 3-слойной генерации), не должно блокировать генерацию. Регион бракуем, только если
      // ОН ухудшил связность: новый морской гекс не дотянулся до океана ИЛИ ранее достижимый
      // морской гекс стал недостижим. Уже-битые-до гексы пропускаем.
      const unreachableBeforeRegion = getUnreachableSeaKeys(allRegionHexes, existingSeaKeysBeforeRegion, rivers);
      const unreachableAfterRegion = getUnreachableSeaKeys(nextAllHexes, allSeaKeys, finalizedRivers);
      const seaBrokenByThisRegion = Array.from(unreachableAfterRegion).filter(
        (key) => newSeaKeySet.has(key) || !unreachableBeforeRegion.has(key)
      );
      if (seaBrokenByThisRegion.length > 0) {
        console.warn('Discarding failed coastal candidate region because sea would be disconnected from open tiles', { attempt, regionId, brokenCount: seaBrokenByThisRegion.length });
        continue;
      }
      let allNewSeaKeys = [...seaHexKeys];
      const nextCandidateHexesExclSea = getCandidateHexes(nextAllHexes, allSeaKeys);
      if (allNewSeaKeys.length > 0) {
        const seaExtensionGraph = buildRiverGraphForRegion(regionHexes, nextAllHexes, nextCandidateHexesExclSea);
        const extendedRivers = extendChangedRiverMouthsToSeaIfPossible(
          riversForGeneration,
          finalizedRivers,
          allSeaKeys,
          seaExtensionGraph
        );
        // Применяем удлинение устья только если оно НЕ создаёт контакт реки с морем
        // вне устья. Проверяем всё море (старое + новое): у побережья рядом с уже
        // существующим морем устье должно иметь право дотянуться именно до соседнего
        // старого морского гекса, иначе попытка позднее бракуется как касание моря
        // не-устьевой вершиной.
        if (!getRiverSeaHeightViolation(extendedRivers, allSeaKeys)) {
          finalizedRivers = extendedRivers;
        }
      }
      const riverStartingFromSeaAfterExtension = getRiverStartingFromSea(
        finalizedRivers,
        getSeaVertexKeysFromSeaKeys(allSeaKeys),
        getSeaEdgeKeysFromSeaKeys(allSeaKeys)
      );
      if (riverStartingFromSeaAfterExtension) {
        console.warn('Discarding failed candidate region because a river starts from sea after extension', {
          attempt,
          regionId,
          riverId: riverStartingFromSeaAfterExtension.id
        });
        continue;
      }
      const riverSeaHeightViolationAfterExtension = getRiverSeaHeightViolation(finalizedRivers, allSeaKeys);
      if (riverSeaHeightViolationAfterExtension) {
        console.warn('Discarding failed candidate region because a river violates sea height after extension', {
          attempt,
          regionId,
          riverId: riverSeaHeightViolationAfterExtension.river.id,
          reason: riverSeaHeightViolationAfterExtension.reason
        });
        continue;
      }

      const coastalRiverConflictAfterExtension = getCoastalSeaRiverConflict(finalizedRivers, allNewSeaKeys, regionHexes);
      if (coastalRiverConflictAfterExtension) {
        console.warn('Discarding failed coastal candidate region because sea touches a river away from its mouth after extension', {
          attempt,
          regionId,
          riverId: coastalRiverConflictAfterExtension.id
        });
        continue;
      }

      // Обрезаем у всех рек концевые вершины, торчащие в море, чтобы они
      // заканчивались у берега, а не шли «из моря в море» (учитываем и новое море).
      const landVertexKeys = getLandVertexKeys(nextAllHexes);
      const seaVertexKeys = new Set<string>();
      for (const seaKey of allSeaKeys) {
        for (const corner of getHexCornerPoints(parseHexKey(seaKey))) seaVertexKeys.add(corner.key);
      }
      finalizedRivers = sanitizeRiversForSea(
        riversForGeneration,
        finalizedRivers,
        landVertexKeys,
        seaVertexKeys,
        allNewSeaKeys,
        regionHexes
      );
      // sanitizeRiversForSea can trim endpoint vertices and change which region,
      // lake, sea, or boundary each river edge belongs to, so derived sector
      // metadata must be rebuilt before delta generation and validation.
      finalizedRivers = assignRiverSectors(
        finalizedRivers,
        getLakesForRegions(nextRegions, nextHexTerrainByKeyPreview),
        nextRegions,
        nextCandidateHexesExclSea,
        allSeaKeys,
        { recalculatedRegionId: regionId }
      );

      // BR-009: рукава дельты. Изолировано в try/catch — сбой не ломает генерацию,
      // в худшем случае рукав просто не добавляется.
      let riversWithDeltas = finalizedRivers;
      if (allNewSeaKeys.length > 0) {
        try {
          const seaEdgeKeys = new Set<string>();
          for (const seaKey of allSeaKeys) {
            for (const edge of getHexEdgesAsVertexPairs(parseHexKey(seaKey))) seaEdgeKeys.add(edge.edgeKey);
          }
          const deltaGraph = buildRiverGraphForRegion(regionHexes, nextAllHexes, nextCandidateHexes);
          const startRiverId = Math.max(0, ...finalizedRivers.map((r) => r.id)) + 1;
          const deltaArms = buildDeltaArmsForRivers(finalizedRivers, regionId, deltaGraph, seaVertexKeys, seaEdgeKeys, startRiverId);
          if (deltaArms.length > 0) riversWithDeltas = [...finalizedRivers, ...deltaArms];
        } catch (error) {
          console.warn('Delta arm generation failed; skipping deltas', error);
        }
      }
      if (allNewSeaKeys.length > 0) {
        const seaExtensionGraph = buildRiverGraphForRegion(regionHexes, nextAllHexes, nextCandidateHexesExclSea);
        const extendedWithDeltas = extendChangedRiverMouthsToSeaIfPossible(
          riversForGeneration,
          riversWithDeltas,
          allSeaKeys,
          seaExtensionGraph
        );
        if (!getRiverSeaHeightViolation(extendedWithDeltas, allSeaKeys)) {
          riversWithDeltas = extendedWithDeltas;
        }
      }
      const riverStartingFromSeaAfterDeltas = getRiverStartingFromSea(
        riversWithDeltas,
        getSeaVertexKeysFromSeaKeys(allSeaKeys),
        getSeaEdgeKeysFromSeaKeys(allSeaKeys)
      );
      if (riverStartingFromSeaAfterDeltas) {
        console.warn('Discarding failed candidate region because a river starts from sea after deltas', {
          attempt,
          regionId,
          riverId: riverStartingFromSeaAfterDeltas.id
        });
        continue;
      }
      const riverSeaHeightViolationAfterDeltas = getRiverSeaHeightViolation(riversWithDeltas, allSeaKeys);
      if (riverSeaHeightViolationAfterDeltas) {
        console.warn('Discarding failed candidate region because a river violates sea height after deltas', {
          attempt,
          regionId,
          riverId: riverSeaHeightViolationAfterDeltas.river.id,
          reason: riverSeaHeightViolationAfterDeltas.reason
        });
        continue;
      }

      const coastalRiverConflictAfterDeltas = getCoastalSeaRiverConflict(riversWithDeltas, allNewSeaKeys, regionHexes);
      if (coastalRiverConflictAfterDeltas) {
        console.warn('Discarding failed coastal candidate region because sea touches a river away from its mouth after deltas', {
          attempt,
          regionId,
          riverId: coastalRiverConflictAfterDeltas.id
        });
        continue;
      }

      riversWithDeltas = restoreInvalidGeneratedRiversForRegion(regionForRiverGeneration, riversForGeneration, riversWithDeltas, nextCandidateHexesExclSea);
      riversWithDeltas = sanitizeRiversForSea(
        riversForGeneration,
        riversWithDeltas,
        landVertexKeys,
        seaVertexKeys,
        allNewSeaKeys,
        regionHexes
      );
      // Deltas, mouth extension, restoreInvalidGeneratedRiversForRegion, and
      // sea sanitizing can all change river paths; rebuild sectors one final
      // time so validation and saved debug data use the final geometry.
      riversWithDeltas = assignRiverSectors(
        riversWithDeltas,
        getLakesForRegions(nextRegions, nextHexTerrainByKeyPreview),
        nextRegions,
        nextCandidateHexesExclSea,
        allSeaKeys,
        { recalculatedRegionId: regionId }
      );
      // Apply this rule only after the last geometry-changing river step and
      // final sector rebuild, so later path/sanitize/delta changes cannot
      // overwrite the local mountain-region upstream tributary reduction.
      riversWithDeltas = applySingleMountainUpstreamTributaryDrop(regionForRiverGeneration, riversWithDeltas);
      const finalRiverSeaHeightViolation = getRiverSeaHeightViolation(riversWithDeltas, allSeaKeys);
      if (finalRiverSeaHeightViolation) {
        console.warn('Discarding failed candidate region because a river violates final sea height', {
          attempt,
          regionId,
          riverId: finalRiverSeaHeightViolation.river.id,
          reason: finalRiverSeaHeightViolation.reason
        });
        continue;
      }
      const finalRiverCycleValidation = validateRiverCycleSafety(riversWithDeltas);
      if (!finalRiverCycleValidation.valid) {
        console.warn('Discarding failed candidate region because final river cycle was detected', { attempt, regionId, ...finalRiverCycleValidation });
        continue;
      }
      if (!validateExistingRiverEdgeFullnessPreserved(rivers, riversWithDeltas)) {
        console.warn('Discarding failed candidate region because final river edge fullness changed old rivers', { attempt, regionId });
        continue;
      }
      // Запертые кандидатные карманы больше не поглощаются морем: после
      // построения береговой линии они присоединяются к биому строящегося
      // региона ниже, чтобы серые/невидимые гексы между морем и сушей стали
      // сушей, а не заливом.
      const enclosedPocketKeys: string[] = [];
      const pocketKeySet = new Set(enclosedPocketKeys);
      // «Дырки» в море: пустой гекс (не регион, не озеро, не море), у которого >=5 из 6
      // соседей — море, заливается морем. Порог 5 закрывает и двойные дырки (пара пустых
      // гексов в кольце моря): первый добирается по 5 соседям, после чего у второго их 6.
      // Гоняем до фикспоинта. Перед заливкой каждый гекс проверяется по рекам
      // (getRiverSeaHeightViolation): из моря не вытекает река и река не касается моря вне
      // устья — такой гекс не заливаем.
      const seaHoleKeys: string[] = [];
      {
        const seaSoFar = new Set<string>([...allSeaKeys, ...enclosedPocketKeys]);
        const landKeys = new Set<string>(allRegionHexes.map(hexKey));
        let holeFillChanged = true;
        while (holeFillChanged) {
          holeFillChanged = false;
          const checkKeys = new Set<string>();
          for (const seaKey of seaSoFar) {
            for (const neighbor of getHexNeighbors(parseHexKey(seaKey))) {
              const neighborKey = hexKey(neighbor);
              if (!seaSoFar.has(neighborKey)) checkKeys.add(neighborKey);
            }
          }
          for (const key of checkKeys) {
            if (landKeys.has(key)) continue;
            const terrainOverride = nextHexTerrainByKeyPreview.get(key)?.terrainOverride;
            if (terrainOverride === 'lake' || terrainOverride === 'sea') continue;
            if (candidateTouchesRoadEndpoint(parseHexKey(key), roadEndpointKeysAfterRoads)) continue;
            const seaNeighborCount = getHexNeighbors(parseHexKey(key)).filter((neighbor) => seaSoFar.has(hexKey(neighbor))).length;
            if (seaNeighborCount < 5) continue;
            if (getRiverSeaHeightViolation(riversWithDeltas, [key])) continue;
            seaSoFar.add(key);
            seaHoleKeys.push(key);
            pocketKeySet.add(key);
            holeFillChanged = true;
          }
        }
      }
      const createdSeaKeys = [...allNewSeaKeys, ...enclosedPocketKeys, ...seaHoleKeys];
      const { connectedSeaKeys: finalSeaKeysToWrite, disconnectedSeaKeys: seaKeysDemotedToCandidates } = splitNewSeaKeysByMouthConnectedComponent(createdSeaKeys, riversWithDeltas);
      const finalSeaKeySetToWrite = new Set(finalSeaKeysToWrite);
      const demotedSeaKeySet = new Set(seaKeysDemotedToCandidates);
      for (const demotedKey of demotedSeaKeySet) pocketKeySet.delete(demotedKey);

      // После окончательного выбора морских гексов проверяем, не заперло ли море
      // между собой и сушей область из кандидатных или ещё невидимых гексов. Такие
      // карманы становятся частью строящегося региона, чтобы на карте не оставалось
      // недоступных серых островков между биомом региона и береговой линией.
      const occupiedForLandPockets = new Set<string>(finalSeaKeySetToWrite);
      for (const key of existingSeaKeysBeforeRegion) occupiedForLandPockets.add(key);
      for (const region of regions) for (const hex of region.hexes) occupiedForLandPockets.add(hexKey(hex));
      const enclosedLandPocketKeys = new Set<string>();
      for (const area of findFillableEnclosedEmptyAreas(new Set(finalRegion.hexes.map(hexKey)), occupiedForLandPockets)) {
        for (const hex of area) enclosedLandPocketKeys.add(hexKey(hex));
      }
      for (const key of enclosedLandPocketKeys) pocketKeySet.add(key);
      const enclosedLandPocketHexes = Array.from(enclosedLandPocketKeys).map(parseHexKey);
      const finalRegionAfterLandPockets = enclosedLandPocketHexes.length > 0
        ? (() => {
          const mergedHexes = [...finalRegion.hexes, ...enclosedLandPocketHexes];
          const updatedSize = mergedHexes.length;
          const updatedSizeCategory = getRegionSizeCategory(updatedSize);
          return {
            ...finalRegion,
            hexes: mergedHexes,
            finalSize: updatedSize,
            sizeCategory: updatedSizeCategory.sizeCategory,
            sizeLabel: updatedSizeCategory.sizeLabel
          };
        })()
        : finalRegion;
      const finalLandHexesForCandidates = [...nextAllHexes, ...enclosedLandPocketHexes];

      let finalCandidateHexes = pocketKeySet.size > 0
        ? nextCandidateHexesExclSea.filter((hex) => !pocketKeySet.has(hexKey(hex)))
        : nextCandidateHexesExclSea;
      if (enclosedLandPocketHexes.length > 0) {
        finalCandidateHexes = getCandidateHexes(finalLandHexesForCandidates, new Set([...existingSeaKeysBeforeRegion, ...finalSeaKeySetToWrite]));
      }
      if (demotedSeaKeySet.size > 0) {
        const blockedCandidateKeys = new Set<string>(finalLandHexesForCandidates.map(hexKey));
        for (const key of getSeaHexKeys(hexTerrainByKey)) blockedCandidateKeys.add(key);
        for (const key of finalSeaKeySetToWrite) blockedCandidateKeys.add(key);
        finalCandidateHexes = addCandidateHexKeys(finalCandidateHexes, demotedSeaKeySet, blockedCandidateKeys);
      }
      // Item 1: реки, возвращающиеся в уже пройденное озеро, больше не обрезаются.
      // Некорректная попытка отбраковывается целиком, чтобы генератор искал другой путь.
      const lakeIdByVertexKey = buildLakeIdByVertexKey(getLakesForRegions(nextRegions, nextHexTerrainByKeyPreview));
      const riverLakeReentryViolation = getRiversLakeReentryViolation(riversWithDeltas, lakeIdByVertexKey);
      if (riverLakeReentryViolation) {
        console.warn('Discarding failed candidate region because a river re-enters a lake it already left', {
          attempt,
          regionId,
          ...riverLakeReentryViolation
        });
        continue;
      }
      // Река «море-в-море»: проверяем против ВСЕГО моря (существующее + новое + карманы + дырки).
      const finalAllSeaKeys = [...existingSeaKeysBeforeRegion, ...finalSeaKeysToWrite];
      const finalNewSeaHeightViolation = getRiverSeaHeightViolation(riversWithDeltas, finalAllSeaKeys);
      if (finalNewSeaHeightViolation) {
        console.warn('Discarding failed candidate region because final new sea touches a river away from its mouth', {
          attempt,
          regionId,
          riverId: finalNewSeaHeightViolation.river.id,
          reason: finalNewSeaHeightViolation.reason
        });
        continue;
      }

      const finalRegionWithPoiKinds: Region = {
        ...finalRegionAfterLandPockets,
        pointOfInterestKinds: assignPoiKindsForRegion({
          region: finalRegionAfterLandPockets,
          roads: roadResult.roads,
          rivers: riversWithDeltas,
          hexTerrainByKey: nextHexTerrainByKeyPreview
        })
      };
      const finalRegions = [...regions, finalRegionWithPoiKinds];

      const snapshot: MapSnapshot = {
        regions,
        candidateHexes,
        rivers,
        roads: cloneRoads(roads),
        hexTerrainByKey,
        nextLakeId,
        nextRoadId
      };
      setHistory((current) => [...current, snapshot]);

      setRegions(finalRegions);
      setCandidateHexes(finalCandidateHexes);
      setHexTerrainByKey(() => {
        const next = new Map(nextHexTerrainByKeyPreview);
        for (const key of finalSeaKeysToWrite) next.set(key, { terrainOverride: 'sea' });
        // BR-004: озеро, соседствующее с морем, удаляется (гекс возвращается к биому региона).
        // Запускаем при наличии ЛЮБОГО моря (включая существующее), а не только когда регион
        // добавил новое море — иначе озеро в кармане у старого моря оставалось у берега.
        const seaSet = getSeaHexKeys(next);
        if (seaSet.size > 0) {
          for (const [key, terrain] of next) {
            if (terrain.terrainOverride !== 'lake') continue;
            const touchesSea = getHexNeighbors(parseHexKey(key)).some((n) => seaSet.has(hexKey(n)));
            if (touchesSea) next.delete(key);
          }
        }
        // Лечение одиночного моря: морской гекс без морских соседей обычно артефакт,
        // но одиночный гекс у устья — валидный однотайловый прибрежный выход реки.
        for (const key of getSolitarySeaHexKeys(getSeaHexKeys(next))) {
          if (seaHexTouchesAnyRiverMouth(parseHexKey(key), riversWithDeltas)) continue;
          next.delete(key);
        }
        mergeAdjacentLakeIds(next);
        return next;
      });
      setNextLakeId(Math.max(computedNextLakeId, getNextLakeIdFromTerrain(nextHexTerrainByKeyPreview)));

      setRivers(riversWithDeltas);
      setRoads(roadResult.roads);
      setNextRoadId(roadResult.nextRoadId);
      setSelectedHex(finalCenterHex);
      return;
    }

    // Вариант 1 (страховка-залив): все попытки сделать сушу провалились. Если клик был по
    // карману, ПОЛНОСТЬЮ окружённому регионами/морем и примыкающему к существующему морю —
    // заливаем его морем. СТРОГО: только если ни одна река не начинается из этого залива и не
    // идёт по нему вне устья (иначе получилась бы река из моря — это запрещено). Если небезопасно
    // — не заливаем, оставляем честный отказ.
    const occupiedForBay = new Set<string>();
    for (const region of regions) for (const hex of region.hexes) occupiedForBay.add(hexKey(hex));
    const existingSeaForBay = getSeaHexKeys(hexTerrainByKey);
    for (const key of existingSeaForBay) occupiedForBay.add(key);
    const bayArea = findEnclosedEmptyAreaContainingHex(anchorHex, occupiedForBay);
    if (bayArea && bayArea.length > 0) {
      const bayTouchesSea = bayArea.some((hex) => getHexNeighbors(hex).some((n) => existingSeaForBay.has(hexKey(n))));
      const bayKeys = bayArea.map(hexKey);
      const bayVertexKeys = getSeaVertexKeysFromSeaKeys(bayKeys);
      const bayEdgeKeys = getSeaEdgeKeysFromSeaKeys(bayKeys);
      const bayStartsRiverFromSea = getRiverStartingFromSea(rivers, bayVertexKeys, bayEdgeKeys);
      const bayHeightViolation = getRiverSeaHeightViolation(rivers, bayKeys);
      // 1a: залив не должен создавать "застрявшее" море — всё море (существующее + залив)
      // обязано оставаться достижимым от открытого океана.
      const allRegionHexesForBay = regions.flatMap((region) => region.hexes);
      const bayKeepsSeaReachable = validateSeaConnectivityThroughOpenTiles(
        allRegionHexesForBay,
        new Set([...existingSeaForBay, ...bayKeys]),
        rivers
      ).valid;
      if (bayTouchesSea && bayKeepsSeaReachable && !bayStartsRiverFromSea && !bayHeightViolation) {
        const snapshot: MapSnapshot = {
          regions,
          candidateHexes,
          rivers,
          roads: cloneRoads(roads),
          hexTerrainByKey,
          nextLakeId,
          nextRoadId
        };
        setHistory((current) => [...current, snapshot]);
        const bayKeySet = new Set(bayKeys);
        setHexTerrainByKey((current) => {
          const next = new Map(current);
          for (const key of bayKeys) next.set(key, { terrainOverride: 'sea' });
          // BR-004: убрать озёра, ставшие соседями нового моря-залива.
          const seaSet = getSeaHexKeys(next);
          for (const [key, terrain] of next) {
            if (terrain.terrainOverride !== 'lake') continue;
            if (getHexNeighbors(parseHexKey(key)).some((n) => seaSet.has(hexKey(n)))) next.delete(key);
          }
          return next;
        });
        setCandidateHexes((current) => current.filter((hex) => !bayKeySet.has(hexKey(hex))));
        setSelectedHex(anchorHex);
        console.warn('Filled sea-locked pocket as bay (no valid land region possible)', { anchorHex, bayHexCount: bayKeys.length });
        return;
      }
    }
    console.warn('Could not create region after max attempts', {
      anchorHex,
      maxRegionAttempts
    });
  };

  const resetMap = () => {
    setRegions([]);
    setCandidateHexes([]);
    setRivers([]);
    setRoads([]);
    setNextRoadId(1);
    setSelectedHex(START_HEX);
    setHexTerrainByKey(new Map());
    setNextLakeId(1);
    setIsMapRotated(false);
    setHistory([]);
    setPendingRegen(null);
  };

  // Текущие параметры генерации, собранные из выпадающих списков.
  // Размер перебрасывается в момент вызова, чтобы каждая генерация в рамках
  // выбранной категории давала новое случайное значение из её диапазона.
  const buildGenerationOptions = (): GenerationOptions => ({
    targetSize: genSizeCategory === 'auto' ? undefined : rollRegionSizeInCategory(genSizeCategory),
    landType: genLandType === 'auto' ? undefined : genLandType,
    biomeId: genBiome === 'auto' ? undefined : genBiome,
    coastalPreference: genCoastal === 'auto' ? undefined : genCoastal
  });

  // Удаление последнего региона = восстановление снимка состояния, сделанного
  // перед его добавлением. Это надёжно откатывает и реки, и дороги, в том
  // числе изменения, которые новый регион внёс в соседние регионы.
  const restoreSnapshot = (snapshot: MapSnapshot) => {
    setRegions(snapshot.regions);
    setCandidateHexes(snapshot.candidateHexes);
    setRivers(snapshot.rivers);
    setRoads(pruneRoadsToRegionHexes(cloneRoads(snapshot.roads), snapshot.regions));
    setHexTerrainByKey(snapshot.hexTerrainByKey);
    setNextLakeId(snapshot.nextLakeId);
    setNextRoadId(snapshot.nextRoadId);
  };

  const deleteLastRegion = () => {
    if (history.length === 0) return;
    const snapshot = history[history.length - 1];
    restoreSnapshot(snapshot);
    setHistory(history.slice(0, -1));
    const previousRegions = snapshot.regions;
    setSelectedHex(
      previousRegions.length > 0
        ? previousRegions[previousRegions.length - 1].centerHex
        : START_HEX
    );
  };

  const regenerateLastRegion = () => {
    if (regions.length === 0 || history.length === 0) return;
    const lastAnchor = regions[regions.length - 1].anchorHex;
    const snapshot = history[history.length - 1];
    restoreSnapshot(snapshot);
    setHistory(history.slice(0, -1));
    // Генерируем не сразу: ждём, пока React применит восстановленный снимок,
    // иначе addRegionToMap прочитает из замыкания ещё старое состояние.
    setPendingRegen({ anchorHex: lastAnchor, options: buildGenerationOptions() });
  };

  useEffect(() => {
    if (!pendingRegen) return;
    addRegionToMap(pendingRegen.anchorHex, pendingRegen.options);
    setPendingRegen(null);
    // addRegionToMap намеренно не в зависимостях: эффект должен сработать
    // ровно один раз на установку заявки, уже с восстановленным состоянием.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRegen]);

  const selectedHexKey = selectedHex ? hexKey(selectedHex) : null;
  const selectedMeta = selectedHexKey ? metadataMap.get(selectedHexKey) : undefined;
  const selectedTerrain = selectedHexKey ? hexTerrainByKey.get(selectedHexKey) : undefined;
  const isSelectedLake = selectedTerrain?.terrainOverride === 'lake';
  const isSelectedSea = selectedTerrain?.terrainOverride === 'sea';
  const isSelectedCandidate = selectedHex ? candidateHexes.some((c) => hexKey(c) === selectedHexKey) : false;
  const selectedHexRoadIds = selectedHex
    ? Array.from(new Set(roads
      .filter((road) => road.segments.some((s) => s.kind === 'road' && (hexKey(s.from) === selectedHexKey || hexKey(s.to) === selectedHexKey)))
      .map((road) => road.id)))
    : [];
  const selectedHexTrailIds = selectedHex
    ? Array.from(new Set(roads
      .filter((road) => road.segments.some((s) => s.kind === 'trail' && (hexKey(s.from) === selectedHexKey || hexKey(s.to) === selectedHexKey)))
      .map((road) => road.id)))
    : [];
  const nearbyHexes = selectedHex ? getHexNeighbors(selectedHex) : [];
  const nearbyRiverIds = selectedHex ? getRiversOnHexEdges(selectedHex, rivers).map((river) => river.id) : [];
  const nearbyLakeIds = Array.from(new Set(nearbyHexes
    .map((hex) => hexTerrainByKey.get(hexKey(hex)))
    .filter((terrain): terrain is HexTerrainData & { lakeId: number } => terrain?.terrainOverride === 'lake' && typeof terrain.lakeId === 'number')
    .map((terrain) => terrain.lakeId)
    .filter((lakeId) => lakeId !== selectedTerrain?.lakeId)));
  const hasNearbySea = nearbyHexes.some((hex) => hexTerrainByKey.get(hexKey(hex))?.terrainOverride === 'sea');

  const selectedType: HexType | 'none' = !selectedHex
    ? 'none'
    : selectedMeta?.isCenter
      ? 'center'
      : selectedMeta
        ? 'region'
        : isSelectedCandidate
          ? 'candidate'
          : 'none';

  const regionSharedVerticesByRegion = useMemo(() => {
    const map = new Map<number, { candidateVertices: RiverVertex[]; neighborRegionVertices: RiverVertex[] }>();
    for (const region of regions) map.set(region.id, getRegionSharedVertices(region, regions, candidateHexes));
    return map;
  }, [regions, candidateHexes]);

  const regionExteriorVertexUsageByRegion = useMemo(() => {
    const map = new Map<number, Map<string, VertexUsage>>();
    for (const region of regions) {
      map.set(region.id, getVertexUsageByKeyForRegion(region, regions, candidateHexes));
    }
    return map;
  }, [regions, candidateHexes]);

  const lastRegion = regions[regions.length - 1];
  const selectedRegion = selectedMeta ? regions.find((region) => region.id === selectedMeta.regionId) : undefined;
  const selectedRegionRivers = selectedRegion ? getRiversForRegion(selectedRegion, rivers) : [];
  const selectedRegionRiverSectors = selectedRegion ? getRiverSectorsForRegion(selectedRegion, rivers) : [];
  const selectedRegionDebugRiverSectors = selectedRegion ? getRiverSectorsTouchingRegion(selectedRegion, rivers) : [];
  const selectedRegionRiver = selectedRegionDebugRiverSectors.length > 0
    ? rivers.find((river) => String(river.id) === String(selectedRegionDebugRiverSectors[0].riverId))
    : selectedRegionRivers[0];
  const selectedRegionConfluences = selectedRegion ? getRiverConfluencesForRegion(selectedRegion, rivers) : [];
  const selectedRegionLakes = selectedRegion ? getLakeSummariesForRegion(selectedRegion, hexTerrainByKey) : [];
  const selectedRegionRoadStats = selectedRegion ? (() => {
    const regionKeys = new Set(selectedRegion.hexes.map(hexKey));
    const roadIds = new Set<number>();
    let trail = 0;
    for (const r of roads) for (const s of r.segments) {
      if (regionKeys.has(hexKey(s.from)) || regionKeys.has(hexKey(s.to))) {
        if (s.kind === 'road') roadIds.add(r.id); else trail += 1;
      }
    }
    return { road: roadIds.size, trail };
  })() : { road: 0, trail: 0 };
  const selectedRegionGraph = selectedRegion ? riverGraphsByRegion.get(selectedRegion.id) : undefined;
  const selectedRegionSharedVertices = selectedRegion
    ? (regionSharedVerticesByRegion.get(selectedRegion.id) ?? { candidateVertices: [], neighborRegionVertices: [] })
    : { candidateVertices: [], neighborRegionVertices: [] };
  const selectedRegionRedVertices = useMemo(() => {
    const orangeKeys = new Set(selectedRegionSharedVertices.neighborRegionVertices.map((vertex) => vertex.key));
    return selectedRegionSharedVertices.candidateVertices.filter((vertex) => !orangeKeys.has(vertex.key));
  }, [selectedRegionSharedVertices]);
  const debugVerticesByRegion = useMemo(() => {
    const map = new Map<number, { key: string; x: number; y: number; type: 'red' | 'orange' | 'purple' }[]>();
    for (const region of regions) {
      const sharedVertices = regionSharedVerticesByRegion.get(region.id) ?? { candidateVertices: [], neighborRegionVertices: [] };
      const orangeKeys = new Set(sharedVertices.neighborRegionVertices.map((vertex) => vertex.key));
      const redVertices = sharedVertices.candidateVertices.filter((vertex) => !orangeKeys.has(vertex.key));
      const orangeVertices = sharedVertices.neighborRegionVertices;
      const centralHexVertices = region.centerHex ? getHexCornerPoints(region.centerHex) : [];
      const redSet = new Set(redVertices.map((vertex) => vertex.key));
      const orangeSet = new Set(orangeVertices.map((vertex) => vertex.key));
      const purpleSet = new Set(centralHexVertices.map((vertex) => vertex.key));
      const byKey = new Map<string, RiverVertex>();
      for (const vertex of [...centralHexVertices, ...orangeVertices, ...redVertices]) byKey.set(vertex.key, vertex);
      const merged = new Map<string, { key: string; x: number; y: number; type: 'red' | 'orange' | 'purple' }>();
      for (const [key, vertex] of byKey) {
        if (orangeSet.has(key)) merged.set(key, { ...vertex, type: 'orange' });
        else if (redSet.has(key)) merged.set(key, { ...vertex, type: 'red' });
        else if (purpleSet.has(key)) merged.set(key, { ...vertex, type: 'purple' });
      }

      map.set(region.id, Array.from(merged.values()));
    }
    return map;
  }, [regions, regionSharedVerticesByRegion]);
  const selectedRegionVertexUsage = selectedRegion ? regionExteriorVertexUsageByRegion.get(selectedRegion.id) : undefined;
  const selectedRedVertexFromHex = selectedRegion && selectedHex
    ? getHexCornerPoints(selectedHex).find((vertex) => selectedRegionRedVertices.some((redVertex) => redVertex.key === vertex.key))
    : undefined;
  const selectedRedVertexUsage = selectedRedVertexFromHex && selectedRegionVertexUsage
    ? selectedRegionVertexUsage.get(selectedRedVertexFromHex.key)
    : undefined;
  const selectedIssues = selectedRegion && selectedRegionRiver && selectedRegionGraph
    ? validateRiverEndpoints(selectedRegion, selectedRegionRiver, selectedRegionGraph)
    : [];
  const selectedCandidateBoundaryDebug = selectedRegion ? candidateBoundaryDebugByRegion.get(selectedRegion.id) : undefined;
  const [isMobileLayout, setIsMobileLayout] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(MOBILE_LAYOUT_QUERY).matches));
  const [mapScale, setMapScale] = useState(1);
  const [isMapRotated, setIsMapRotated] = useState(false);
  const [useBiomeTiles, setUseBiomeTiles] = useState(true);
  const [mapToolbarHeight, setMapToolbarHeight] = useState(0);
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);
  const [isHeaderLinksCollapsed, setIsHeaderLinksCollapsed] = useState(false);
  const headerLinksAutoCollapseTimerRef = useRef<number | null>(null);
  const displayMapWidth = isMapRotated ? positionedHexes.height : positionedHexes.width;
  const displayMapHeight = isMapRotated ? positionedHexes.width : positionedHexes.height;
  const mapRotationTransform = isMapRotated ? `translate(${positionedHexes.height} 0) rotate(90)` : undefined;
  const mapCardStyle = { '--map-toolbar-height': `${mapToolbarHeight}px` } as CSSProperties;
  const sidePanelToggleLabel = isSidePanelCollapsed ? t.showPanel : t.hidePanel;
  const headerLinksToggleLabel = isHeaderLinksCollapsed ? t.showHeaderLinks : t.hideHeaderLinks;
  const biomeDisplayToggleLabel = useBiomeTiles ? t.showEmoji : t.showTiles;
  const biomeDisplayToggleTitle = useBiomeTiles ? t.showEmojiTitle : t.showTilesTitle;

  useEffect(() => {
    headerLinksAutoCollapseTimerRef.current = window.setTimeout(() => {
      setIsHeaderLinksCollapsed(true);
      headerLinksAutoCollapseTimerRef.current = null;
    }, 120_000);

    return () => {
      if (headerLinksAutoCollapseTimerRef.current !== null) {
        window.clearTimeout(headerLinksAutoCollapseTimerRef.current);
        headerLinksAutoCollapseTimerRef.current = null;
      }
    };
  }, []);

  const toggleHeaderLinks = () => {
    setIsHeaderLinksCollapsed((value) => {
      const nextValue = !value;
      if (nextValue && headerLinksAutoCollapseTimerRef.current !== null) {
        window.clearTimeout(headerLinksAutoCollapseTimerRef.current);
        headerLinksAutoCollapseTimerRef.current = null;
      }
      return nextValue;
    });
  };

  useEffect(() => {
    if (isMobileLayout) {
      setMapToolbarHeight(0);
      return;
    }

    const toolbar = mapToolbarRef.current;
    if (!toolbar) return;

    const updateToolbarHeight = () => setMapToolbarHeight(toolbar.offsetHeight);
    updateToolbarHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateToolbarHeight);
      return () => window.removeEventListener('resize', updateToolbarHeight);
    }

    const resizeObserver = new ResizeObserver(updateToolbarHeight);
    resizeObserver.observe(toolbar);

    return () => resizeObserver.disconnect();
  }, [isMobileLayout]);

  useEffect(() => {
    const mobileLayout = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const syncMobileLayout = () => setIsMobileLayout(mobileLayout.matches);

    syncMobileLayout();
    mobileLayout.addEventListener('change', syncMobileLayout);

    return () => mobileLayout.removeEventListener('change', syncMobileLayout);
  }, []);

  const clampMapScale = (scale: number) => Math.min(MAX_MAP_SCALE, Math.max(MIN_MAP_SCALE, scale));

  const applyMapScale = (scale: number) => {
    const nextScale = clampMapScale(scale);
    mapScaleRef.current = nextScale;
    setMapScale(nextScale);
    return nextScale;
  };

  const updateMapScale = (scale: number) => {
    applyMapScale(scale);
  };

  const zoomMapAtPoint = (scale: number, clientX?: number, clientY?: number) => {
    const viewport = mapViewportRef.current;
    const previousScale = mapScaleRef.current;
    const nextScale = clampMapScale(scale);
    if (!viewport || previousScale === nextScale) {
      applyMapScale(nextScale);
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const focalX = (clientX ?? rect.left + rect.width / 2) - rect.left;
    const focalY = (clientY ?? rect.top + rect.height / 2) - rect.top;
    const mapX = (viewport.scrollLeft + focalX) / previousScale;
    const mapY = (viewport.scrollTop + focalY) / previousScale;

    applyMapScale(nextScale);

    window.requestAnimationFrame(() => {
      viewport.scrollLeft = mapX * nextScale - focalX;
      viewport.scrollTop = mapY * nextScale - focalY;
    });
  };

  const getTouchDistance = (touches: React.TouchList) => {
    const [first, second] = [touches.item(0), touches.item(1)];
    if (!first || !second) return 0;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    const [first, second] = [touches.item(0), touches.item(1)];
    if (!first || !second) return null;
    return {
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2
    };
  };

  const handleMapWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const zoomFactor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
    zoomMapAtPoint(mapScaleRef.current * zoomFactor, event.clientX, event.clientY);
  };


  const handleMapMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return;

    const viewport = mapViewportRef.current;
    if (!viewport) return;

    viewport.focus({ preventScroll: true });
    mapDragRef.current = {
      pointerId: event.button,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop
    };
    viewport.classList.add('is-dragging');
    event.preventDefault();
  };

  const handleMapMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const drag = mapDragRef.current;
    const viewport = mapViewportRef.current;
    if (!drag || !viewport) return;

    const requiredButtonMask = drag.pointerId === 2 ? 2 : 1;
    if ((event.buttons & requiredButtonMask) === 0) {
      mapDragRef.current = null;
      viewport.classList.remove('is-dragging');
      return;
    }

    viewport.scrollLeft = drag.scrollLeft - (event.clientX - drag.startX);
    viewport.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    event.preventDefault();
  };

  const handleMapMouseUp = () => {
    mapDragRef.current = null;
    mapViewportRef.current?.classList.remove('is-dragging');
  };

  const handleMapKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;

    const step = event.shiftKey ? 120 : 40;
    switch (event.key) {
      case 'ArrowLeft':
        viewport.scrollLeft -= step;
        break;
      case 'ArrowRight':
        viewport.scrollLeft += step;
        break;
      case 'ArrowUp':
        viewport.scrollTop -= step;
        break;
      case 'ArrowDown':
        viewport.scrollTop += step;
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  const handleMapTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) {
      pinchZoomRef.current = null;
      return;
    }

    pinchZoomRef.current = {
      distance: getTouchDistance(event.touches),
      scale: mapScaleRef.current
    };
  };

  const handleMapTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchZoomRef.current) return;
    event.preventDefault();

    const distance = getTouchDistance(event.touches);
    const center = getTouchCenter(event.touches);
    if (distance <= 0 || !center) return;

    zoomMapAtPoint(pinchZoomRef.current.scale * (distance / pinchZoomRef.current.distance), center.x, center.y);
  };

  const handleMapTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) pinchZoomRef.current = null;
  };

  const createSaveData = (): HexcrawlSaveData => ({
    schema: HEXCRAWL_SAVE_SCHEMA,
    version: HEXCRAWL_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    map: {
      regions,
      candidateHexes,
      rivers,
      roads,
      terrainByHexKey: Object.fromEntries(hexTerrainByKey.entries())
    },
    counters: {
      nextLakeId,
      nextRoadId
    },
    ui: {
      selectedHex,
      isMapRotated,
      mapScale
    }
  });

  const handleExportPng = async () => {
    if (!mapSvgRef.current) return;
    try {
      await exportSvgToPng(mapSvgRef.current, `${EXPORT_FILE_PREFIX}-${getTimestampForFilename()}.png`);
    } catch (error) {
      console.error('PNG export failed', error);
      window.alert(error instanceof Error ? error.message : t.pngExportError);
    }
  };

  const handleExportJson = () => {
    const saveData = createSaveData();
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${EXPORT_FILE_PREFIX}-${getTimestampForFilename()}.json`);
  };

  const handleImportJsonClick = () => {
    jsonImportInputRef.current?.click();
  };

  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await readTextFile(file);
      const parsed: unknown = JSON.parse(text);
      assertHexcrawlSaveData(parsed);

      const importedRegions = parsed.map.regions;
      const importedAllHexes = importedRegions.flatMap((region) => region.hexes);
      const importedTerrain = new Map<string, HexTerrainData>(Object.entries(parsed.map.terrainByHexKey));
      const importedSeaKeys = getSeaHexKeys(importedTerrain);
      const importedCandidateHexes = importedAllHexes.length > 0 ? getCandidateHexes(importedAllHexes, importedSeaKeys) : [];
      const fallbackNextLakeId = Math.max(0, ...Array.from(importedTerrain.values()).map((terrain) => terrain.lakeId ?? 0)) + 1;
      const fallbackNextRoadId = Math.max(0, ...parsed.map.roads.map((road) => road.id)) + 1;

      setRegions(importedRegions);
      setCandidateHexes(importedCandidateHexes);
      setRivers(parsed.map.rivers);
      setRoads(parsed.map.roads);
      setHexTerrainByKey(importedTerrain);
      setNextLakeId(Math.max(parsed.counters.nextLakeId, fallbackNextLakeId));
      setNextRoadId(Math.max(parsed.counters.nextRoadId, fallbackNextRoadId));
      setSelectedHex(parsed.ui.selectedHex ?? START_HEX);
      setIsMapRotated(parsed.ui.isMapRotated);
      updateMapScale(parsed.ui.mapScale);
    } catch (error) {
      console.error('JSON import failed', error);
      window.alert(error instanceof Error ? error.message : t.jsonImportError);
    }
  };

  if (debugRivers && selectedRegion && selectedCandidateBoundaryDebug) {
    console.log('Candidate boundary debug', {
      regionId: selectedRegion.id,
      regionHexesLength: selectedRegion.hexes.length,
      candidateBoundaryEdgesLength: selectedCandidateBoundaryDebug.edges.length,
      candidateBoundaryVerticesLength: selectedCandidateBoundaryDebug.vertices.length,
      edgeKeys: selectedCandidateBoundaryDebug.edgeKeys,
      vertexKeys: selectedCandidateBoundaryDebug.vertexKeys
    });
  }

  return (
    <div className="app">
      <section className="content">
        <div className={`map-card${isSidePanelCollapsed ? ' is-panel-collapsed' : ''}`} style={mapCardStyle}>
          <button
            type="button"
            className="side-panel-toggle"
            onClick={() => setIsSidePanelCollapsed((value) => !value)}
            aria-expanded={!isSidePanelCollapsed}
            aria-controls="side-panel-controls side-panel-info"
            aria-label={sidePanelToggleLabel}
            title={sidePanelToggleLabel}
          >
            <span className="side-panel-toggle__desktop" aria-hidden="true">{isSidePanelCollapsed ? '›' : '‹'}</span>
            <span className="side-panel-toggle__mobile" aria-hidden="true">{isSidePanelCollapsed ? '⌃' : '⌄'}</span>
            <span className="visually-hidden">{sidePanelToggleLabel}</span>
          </button>
          <div className={`header-links${isHeaderLinksCollapsed ? ' is-collapsed' : ''}`} aria-label="Social links">
            <button
              type="button"
              className="header-links-toggle"
              onClick={toggleHeaderLinks}
              aria-expanded={!isHeaderLinksCollapsed}
              aria-controls="header-links-actions"
              aria-label={headerLinksToggleLabel}
              title={headerLinksToggleLabel}
            >
              <span className="header-links-toggle__desktop" aria-hidden="true">{isHeaderLinksCollapsed ? '‹' : '›'}</span>
              <span className="header-links-toggle__mobile" aria-hidden="true">{isHeaderLinksCollapsed ? '⌄' : '⌃'}</span>
              <span className="visually-hidden">{headerLinksToggleLabel}</span>
            </button>
            <div id="header-links-actions" className="header-links__actions">
              <button
                type="button"
                className="language-toggle"
                onClick={() => setLanguage((value) => (value === 'ru' ? 'en' : 'ru'))}
                aria-label={t.switchLanguage}
                title={t.switchLanguage}
              >
                {language === 'ru' ? 'EN' : 'RU'}
              </button>
              <a
                className="social-link social-link--telegram"
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                aria-label={t.telegramLabel}
                title={t.telegramLabel}
              >
                <svg className="social-link__icon" viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                  <path d="M21.7 4.1c.3-1-.6-1.8-1.5-1.4L2.7 9.5c-1 .4-.9 1.8.1 2.1l4.5 1.4 1.7 5.5c.3.9 1.4 1.1 2 .4l2.5-2.6 4.8 3.5c.8.6 1.9.1 2.1-.9l3.3-14.8ZM8.2 12.2l8.8-5.4c.4-.2.8.3.4.6l-7.3 6.7-.3 3.1-1.6-5Z" />
                </svg>
              </a>
              <a
                className="social-link social-link--youtube"
                href={YOUTUBE_URL}
                target="_blank"
                rel="noreferrer"
                aria-label={t.youtubeLabel}
                title={t.youtubeLabel}
              >
                <svg className="social-link__icon" viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
                  <path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8Z" />
                  <path className="social-link__cutout" d="m10 15.4 5.2-3.4L10 8.6v6.8Z" />
                </svg>
              </a>
            </div>
          </div>
          <div id="side-panel-controls" ref={mapToolbarRef} className="map-toolbar" aria-label={t.controlsLabel}>
            <div className="controls">
              <button onClick={resetMap} className="secondary" disabled={regions.length === 0}>{t.reset}</button>
              <button
                type="button"
                onClick={regenerateLastRegion}
                className="secondary"
                disabled={regions.length === 0}
              >
                {t.regenerateRegion}
              </button>
              <button
                type="button"
                onClick={deleteLastRegion}
                className="secondary"
                disabled={regions.length === 0}
              >
                {t.deleteLastRegion}
              </button>
              <details
                className={`export-menu${regions.length === 0 ? ' is-disabled' : ''}`}
                onToggle={(event) => {
                  if (regions.length === 0) event.currentTarget.open = false;
                }}
              >
                <summary className="secondary" aria-disabled={regions.length === 0}>{t.export}</summary>
                <div className="export-menu__items">
                  <button type="button" onClick={() => void handleExportPng()} className="secondary">PNG</button>
                  <button type="button" onClick={handleExportJson} className="secondary">JSON</button>
                </div>
              </details>
              <button type="button" onClick={handleImportJsonClick} className="secondary">{t.importJson}</button>
              <input ref={jsonImportInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void handleImportJson(event)} />
              <button onClick={() => setDebugRivers((v) => !v)} className="secondary">
                {t.debug}: {debugRivers ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className="rotate-map-button"
                onClick={() => setIsMapRotated((value) => !value)}
                aria-label={isMapRotated ? t.unrotateMap : t.rotateMap}
                title={isMapRotated ? t.unrotateMap : t.rotateMapTitle}
              >
                <svg className="rotate-map-button__icon" viewBox="0 0 64 48" aria-hidden="true" focusable="false">
                  <polygon
                    points={isMapRotated ? '32,4 56,16 56,32 32,44 8,32 8,16' : '20,4 44,4 56,24 44,44 20,44 8,24'}
                    className="rotate-map-button__hex"
                  />
                  <text x="32" y="25" className="rotate-map-button__sign">{isMapRotated ? '↺' : '↻'}</text>
                </svg>
              </button>
              <button
                type="button"
                className="biome-display-toggle"
                onClick={() => setUseBiomeTiles((value) => !value)}
                aria-label={biomeDisplayToggleLabel}
                title={biomeDisplayToggleTitle}
              >
                <span aria-hidden="true">{useBiomeTiles ? '🖼️' : '😀'}</span>
                <span>{useBiomeTiles ? t.emojiMode : t.tilesMode}</span>
              </button>
            </div>
            <div className="gen-params" aria-label={t.genParamsLabel}>
              <label>
                {t.size}
                <select value={genSizeCategory} onChange={(e) => setGenSizeCategory(e.target.value as typeof genSizeCategory)}>
                  <option value="auto">{t.auto}</option>
                  <option value="locality">{SIZE_LABELS[language].locality}</option>
                  <option value="small_region">{SIZE_LABELS[language].small_region}</option>
                  <option value="region">{SIZE_LABELS[language].region}</option>
                  <option value="large_region">{SIZE_LABELS[language].large_region}</option>
                  <option value="land">{SIZE_LABELS[language].land}</option>
                  <option value="vast_land">{SIZE_LABELS[language].vast_land}</option>
                </select>
              </label>
              <label>
                {t.type}
                <select value={genLandType} onChange={(e) => setGenLandType(e.target.value as typeof genLandType)}>
                  <option value="auto">{t.auto}</option>
                  <option value="settled">{t.settled}</option>
                  <option value="wild">{t.wild}</option>
                </select>
              </label>
              <label>
                {t.biome}
                <select value={genBiome} onChange={(e) => setGenBiome(e.target.value as typeof genBiome)}>
                  <option value="auto">{t.auto}</option>
                  {(Object.values(BIOMES)).map((biome) => (
                    <option key={biome.id} value={biome.id}>{getBiomeLabel(biome.id, language)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t.coast}
                <select value={genCoastal} onChange={(e) => setGenCoastal(e.target.value as typeof genCoastal)}>
                  <option value="auto">{t.auto}</option>
                  <option value="coast">{t.coastOption}</option>
                  <option value="mainland">{t.mainland}</option>
                </select>
              </label>
            </div>
            {coastNotice && (
              <div className="coast-notice" role="status">
                <span>{translateCoastNotice(coastNotice, language)}</span>
                <button type="button" onClick={() => setCoastNotice(null)} aria-label={t.closeNotice}>×</button>
              </div>
            )}
          </div>
          <div
            ref={mapViewportRef}
            className="map-viewport"
            tabIndex={0}
            aria-label={t.mapAria}
            onWheel={handleMapWheel}
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseLeave={handleMapMouseUp}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={handleMapKeyDown}
            onTouchStart={handleMapTouchStart}
            onTouchMove={handleMapTouchMove}
            onTouchEnd={handleMapTouchEnd}
            onTouchCancel={handleMapTouchEnd}
          >
            <svg
              ref={mapSvgRef}
              viewBox={`0 0 ${displayMapWidth} ${displayMapHeight}`}
              preserveAspectRatio="xMinYMin meet"
              style={{ width: `${displayMapWidth * mapScale}px`, height: `${displayMapHeight * mapScale}px` }}
            >
            <defs>
              {([1, 2, 3, 4, 5] as RiverFullness[]).map((fullness) => {
                const markerSize = 5 * getRiverArrowScale(fullness);
                return (
                  <marker key={`river-arrowhead-${fullness}`} id={`river-arrowhead-${fullness}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth={markerSize} markerHeight={markerSize} orient="auto">
                    <path d="M 0 0 L 8 4 L 0 8 z" className="river-arrow-head" />
                  </marker>
                );
              })}
              {positionedHexes.hexes.map((hex) => (
                <clipPath key={`hex-clip-${hex.key}`} id={`hex-clip-${hex.key}`}>
                  <polygon points={hexPoints(hex.x, hex.y, HEX_SIZE)} />
                </clipPath>
              ))}
            </defs>
            <g className="map-rotation-layer" transform={mapRotationTransform}>
            {positionedHexes.hexes.map((hex) => {
              const meta = metadataMap.get(hex.key);
              const isStartClickPrompt = regions.length === 0 && hex.kind === 'candidate' && hex.key === hexKey(START_HEX);
              const isCandidateClickPrompt = regions.length >= 1 && regions.length <= 2 && hex.kind === 'candidate' && hex.key === clickPromptCandidateKey;
              const cls = `${hex.kind === 'sea' ? 'hex sea' : hex.kind === 'candidate' ? 'hex candidate' : meta?.isCenter ? 'hex center' : 'hex region'}${isStartClickPrompt || isCandidateClickPrompt ? ' click-prompt' : ''}`;
              const hexRenderSize = isStartClickPrompt ? HEX_SIZE * START_PROMPT_HEX_SCALE : HEX_SIZE;
              const terrain = hexTerrainByKey.get(hex.key);
              const isLakeHex = terrain?.terrainOverride === 'lake';
              const region = meta?.regionId ? regions.find((item) => item.id === meta.regionId) : undefined;
              const fill = hex.kind === 'sea' ? SEA_HEX_COLOR : hex.kind === 'candidate' ? undefined : isLakeHex ? LAKE_HEX_COLOR : getBiomeColor(region?.biomeId);
              const biomeTileHref = useBiomeTiles && hex.kind === 'region' && !isLakeHex ? getBiomeTileHref(region?.biomeId) : undefined;
              const tileImageSize = getHexWidth(hexRenderSize);
              const tileImageHeight = hexRenderSize * 2;
              const fallbackBiome = BIOMES[FALLBACK_BIOME_ID];
              const biomePrimaryEmoji = region?.biomePrimaryEmoji ?? fallbackBiome.primaryEmoji;
              const biomeSecondaryEmojis = region?.biomeSecondaryEmojis ?? fallbackBiome.secondaryEmojis;
              const biomeEmojis = [
                biomePrimaryEmoji,
                ...biomeSecondaryEmojis.slice(0, 2)
              ];
              const isPointOfInterest = region?.pointsOfInterest.some((poi) => hexKey(poi) === hex.key) ?? false;
              const hexEmojis = [
                ...(meta?.isCenter && region ? [getCentralPoiEmoji(region)] : meta?.isCenter ? [REGION_CENTER_EMOJI] : []),
                ...(isPointOfInterest ? [getPoiEmojiForHex(region, { q: hex.q, r: hex.r })] : []),
                ...biomeEmojis
              ];
              const hexEmojiLayout = getHexEmojiLayout(hexEmojis, hex.x, hex.y, HEX_SIZE);
              return (
                <g
                  key={`${hex.kind}-${hex.key}`}
                  onClick={() => {
                    if (hex.kind === 'candidate') {
                      addRegionToMap({ q: hex.q, r: hex.r }, buildGenerationOptions());
                    } else {
                      setSelectedHex({ q: hex.q, r: hex.r });
                    }
                  }}
                >
                  <polygon points={hexPoints(hex.x, hex.y, hexRenderSize)} className={cls} style={{ fill }} />
                  {biomeTileHref ? (
                    <g clipPath={`url(#hex-clip-${hex.key})`} pointerEvents="none">
                      <image
                        href={biomeTileHref}
                        x={hex.x - tileImageSize / 2}
                        y={hex.y - tileImageHeight / 2}
                        width={tileImageSize}
                        height={tileImageHeight}
                        preserveAspectRatio="xMidYMid slice"
                        transform={isMapRotated ? `rotate(-90 ${hex.x} ${hex.y})` : undefined}
                      />
                    </g>
                  ) : null}
                  <polygon points={hexPoints(hex.x, hex.y, hexRenderSize)} className={cls} style={{ fill: 'none' }} />
                  {SHOW_HEX_COORDINATES ? <text x={hex.x} y={hex.y + 4} textAnchor="middle" className="hex-label">{hex.q}/{hex.r}</text> : null}
                </g>
              );
            })}
            <g className="rivers-layer">
              {riverSegments.map((segment) => (
                <line
                  key={segment.key}
                  x1={segment.x1}
                  y1={segment.y1}
                  x2={segment.x2}
                  y2={segment.y2}
                  className="river-polyline"
                  strokeWidth={segment.width}
                />
              ))}
              {riverDirectionArrows.map((arrow) => (
                <line
                  key={arrow.key}
                  x1={arrow.x1}
                  y1={arrow.y1}
                  x2={arrow.x2}
                  y2={arrow.y2}
                  className="river-direction-arrow"
                  strokeWidth={1.2 * getRiverArrowScale(arrow.fullness)}
                  markerEnd={`url(#river-arrowhead-${arrow.fullness})`}
                />
              ))}
            </g>
            <g className="roads-layer">
              {roadSegments.filter((segment) => segment.kind === 'road').map((segment) => (
                <line key={segment.key} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className="road-line" />
              ))}
              {trailDots.map((dot) => (
                <circle key={dot.key} cx={dot.x} cy={dot.y} r={2.1} className="road-trail-dot" />
              ))}
            </g>
            </g>
            <g className="emoji-layer">
              {positionedHexes.hexes.map((hex) => {
                const isStartClickPrompt = regions.length === 0 && hex.kind === 'candidate' && hex.key === hexKey(START_HEX);
                const isCandidateClickPrompt = regions.length >= 1 && regions.length <= 2 && hex.kind === 'candidate' && hex.key === clickPromptCandidateKey;
                if (!isStartClickPrompt && !isCandidateClickPrompt) return null;
                const position = isMapRotated ? rotateMapPoint(hex.x, hex.y, positionedHexes.height) : hex;
                return (
                  <text
                    key={`click-prompt-${hex.key}`}
                    x={position.x}
                    y={position.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="click-prompt-label"
                  >
                    {CLICK_PROMPT_LABEL}
                  </text>
                );
              })}
              {positionedHexes.hexes.map((hex) => {
                const meta = metadataMap.get(hex.key);
                const terrain = hexTerrainByKey.get(hex.key);
                const isLakeHex = terrain?.terrainOverride === 'lake';
                const region = meta?.regionId ? regions.find((item) => item.id === meta.regionId) : undefined;
                const fallbackBiome = BIOMES[FALLBACK_BIOME_ID];
                const biomePrimaryEmoji = region?.biomePrimaryEmoji ?? fallbackBiome.primaryEmoji;
                const biomeSecondaryEmojis = region?.biomeSecondaryEmojis ?? fallbackBiome.secondaryEmojis;
                const biomeTileHref = useBiomeTiles && hex.kind === 'region' && !isLakeHex ? getBiomeTileHref(region?.biomeId) : undefined;
                const biomeEmojis = biomeTileHref ? [] : [biomePrimaryEmoji, ...biomeSecondaryEmojis.slice(0, 2)];
                const isPointOfInterest = region?.pointsOfInterest.some((poi) => hexKey(poi) === hex.key) ?? false;
                const hexEmojis = [...(meta?.isCenter && region ? [getCentralPoiEmoji(region)] : meta?.isCenter ? [REGION_CENTER_EMOJI] : []), ...(isPointOfInterest ? [getPoiEmojiForHex(region, { q: hex.q, r: hex.r })] : []), ...biomeEmojis];
                const hexEmojiLayout = getHexEmojiLayout(hexEmojis, hex.x, hex.y, HEX_SIZE);
                return SHOW_BIOME_EMOJI && hex.kind === 'region' && hex.regionId && region && !isLakeHex ? hexEmojiLayout.map((item, index) => {
                  const position = isMapRotated ? rotateMapPoint(item.x, item.y, positionedHexes.height) : item;
                  return (
                    <text key={`biome-emoji-${hex.key}-${index}`} x={position.x} y={position.y} textAnchor="middle" dominantBaseline="central" fontSize={item.fontSize} pointerEvents="none">{item.emoji}</text>
                  );
                }) : null;
              })}
            </g>
            {debugRivers ? (
              <g className="river-debug-layer" transform={mapRotationTransform}>
                {Array.from(riverGraphsByRegion.values()).flatMap((graph, graphIndex) => Array.from(graph.nodes.values()).map((node) => (
                  <circle key={`dbg-all-${graphIndex}-${node.key}`} cx={node.x + riverOffset.x} cy={node.y + riverOffset.y} r={2} className="dbg-node-all" />
                )))}
                {Array.from(riverGraphsByRegion.values()).flatMap((graph, graphIndex) => Array.from(graph.nodes.values()).filter((node) => node.isRegionBoundaryVertex).map((node) => (
                  <circle key={`dbg-rb-${graphIndex}-${node.key}`} cx={node.x + riverOffset.x} cy={node.y + riverOffset.y} r={2} className="dbg-node-boundary" />
                )))}
                {(selectedRegion
                  ? (candidateBoundaryDebugByRegion.get(selectedRegion.id)?.vertices ?? []).map((vertex) => (
                    <circle key={`dbg-cb-sel-${selectedRegion.id}-${vertex.key}`} cx={vertex.x + riverOffset.x} cy={vertex.y + riverOffset.y} r={2} className="dbg-node-candidate" />
                  ))
                  : regions.flatMap((region) => (candidateBoundaryDebugByRegion.get(region.id)?.vertices ?? []).map((vertex) => (
                    <circle key={`dbg-cb-all-${region.id}-${vertex.key}`} cx={vertex.x + riverOffset.x} cy={vertex.y + riverOffset.y} r={2} className="dbg-node-candidate" />
                  ))))}
                {(selectedRegion
                  ? (debugVerticesByRegion.get(selectedRegion.id) ?? []).map((vertex) => (
                    <circle key={`dbg-vertex-sel-${selectedRegion.id}-${vertex.key}`} cx={vertex.x + riverOffset.x} cy={vertex.y + riverOffset.y} r={1.5} className={vertex.type === 'red' ? 'dbg-node-exterior' : vertex.type === 'orange' ? 'dbg-node-neighbor-region' : 'dbg-node-central'} />
                  ))
                  : regions.flatMap((region) => (debugVerticesByRegion.get(region.id) ?? []).map((vertex) => (
                    <circle key={`dbg-vertex-all-${region.id}-${vertex.key}`} cx={vertex.x + riverOffset.x} cy={vertex.y + riverOffset.y} r={1.5} className={vertex.type === 'red' ? 'dbg-node-exterior' : vertex.type === 'orange' ? 'dbg-node-neighbor-region' : 'dbg-node-central'} />
                  ))))}
                {rivers.map((river) => {
                  if (!river.vertexPath || river.vertexPath.length < 2) return null;
                  const start = river.vertexPath[0];
                  const end = river.vertexPath[river.vertexPath.length - 1];
                  const first = [start, river.vertexPath[1]];
                  const last = [river.vertexPath[river.vertexPath.length - 2], end];
                  const mid = river.vertexPath[Math.floor(river.vertexPath.length / 2)];
                  return (
                    <g key={`dbg-river-${river.id}`}>
                      <line x1={first[0].x + riverOffset.x} y1={first[0].y + riverOffset.y} x2={first[1].x + riverOffset.x} y2={first[1].y + riverOffset.y} className="dbg-first-segment" />
                      <line x1={last[0].x + riverOffset.x} y1={last[0].y + riverOffset.y} x2={last[1].x + riverOffset.x} y2={last[1].y + riverOffset.y} className="dbg-last-segment" />
                      <circle cx={start.x + riverOffset.x} cy={start.y + riverOffset.y} r={5} className="dbg-start" />
                      <circle cx={end.x + riverOffset.x} cy={end.y + riverOffset.y} r={5} className="dbg-end" />
                      <text x={mid.x + riverOffset.x + 4} y={mid.y + riverOffset.y - 4} className="dbg-river-id">{river.id}</text>
                    </g>
                  );
                })}
                {lakeVerticesDebug.map((vertex) => (
                  <circle key={vertex.key} cx={vertex.cx} cy={vertex.cy} r={2.2} className="dbg-lake-vertex" />
                ))}
              </g>
            ) : null}
            </svg>
          </div>

          <aside id="side-panel-info" className="roll-card">
            <div className="info-body">
              {regions.length === 0 ? (
                <div className="info-block info-block--prompt" role="status">{t.startPrompt}</div>
              ) : regions.length <= 2 && candidateHexes.length > 0 ? (
                <div className="info-block info-block--prompt" role="status">{t.candidatePrompt}</div>
              ) : null}

              <section className="info-block info-block--hex" aria-label={t.selectedHexInfo}>
                {selectedRegion ? (
                  <p><strong>{SIZE_LABELS[language][selectedRegion.sizeCategory]} {selectedRegion.id}</strong></p>
                ) : isSelectedSea ? (
                  <p><strong>{SEA_EMOJI} {t.sea}</strong></p>
                ) : (
                  <p><strong>{isSelectedCandidate ? t.candidateForRegion : t.noHexSelected}</strong></p>
                )}
                {!isSelectedCandidate && selectedRegion ? (
                  <>
                    <p>{isSelectedLake ? `💧 ${t.lake} ${selectedTerrain?.lakeId ?? '—'}` : `${selectedRegion.biomePrimaryEmoji}${selectedRegion.biomeSecondaryEmojis.join('')} ${getBiomeLabel(selectedRegion.biomeId, language)}`}</p>
                    <p>{selectedRegion.biomeLandType === 'settled' ? t.settledRegion : t.wildArea}</p>
                    {selectedMeta?.isCenter ? <p>{getCentralPoiEmoji(selectedRegion)} {getCentralPoiLabel(selectedRegion, language)}</p> : null}
                    {selectedRegion.pointsOfInterest.some((poi) => selectedHexKey === hexKey(poi)) && selectedHex ? <p>{getPoiEmojiForHex(selectedRegion, selectedHex)} {getPoiLabelForHex(selectedRegion, selectedHex, language)}</p> : null}
                    {selectedHexRoadIds.map((roadId) => <p key={`selected-road-${roadId}`}>▬ {t.road} {roadId}</p>)}
                    {selectedHexTrailIds.map((trailId) => <p key={`selected-trail-${trailId}`}>⋯ {t.trail} {trailId}</p>)}
                    {nearbyRiverIds.length > 0 || nearbyLakeIds.length > 0 || hasNearbySea ? (
                      <div>
                        <strong>{t.nearby}</strong>
                        {nearbyRiverIds.map((riverId) => <p key={`nearby-river-${riverId}`}>{t.river} {riverId}</p>)}
                        {nearbyLakeIds.map((lakeId) => <p key={`nearby-lake-${lakeId}`}>{t.lake} {lakeId}</p>)}
                        {hasNearbySea ? <p>{t.sea}</p> : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>

              {debugRivers ? (
                <section className="info-block info-block--debug" aria-label={t.debugInfo}>
                  {regions.length > 0 && lastRegion ? (
                    <>
                      <p>{t.regions}: {regions.length}</p>
                      <p>{t.lastRegion}: {lastRegion.id}</p>
                      <p>{t.regionSize}: {getRegionSizeDisplay(lastRegion, language)}</p>
                      <p>{t.height}: {getRegionHeightLabel(lastRegion.heightLevel ?? getRegionHeightLevelFromBiomeId(lastRegion.biomeId), language)}</p>
                      <p>{t.targetSize}: {lastRegion.targetSize}</p>
                      <p>{t.finalSize}: {lastRegion.finalSize}</p>
                      <p>{t.poiCount}: {lastRegion.pointsOfInterest.length}</p>
                    </>
                  ) : null}
                  {regions.length > 0 ? (
                    <>
                      <hr />
                      <p><strong>{t.selectedHex}:</strong> {selectedHex ? `${selectedHex.q}/${selectedHex.r}` : '—'}</p>
                      <p><strong>{t.type}:</strong> {selectedType}</p>
                      {selectedRegion ? (
                        <>
                          <p><strong>{t.selectedRegionHeight}:</strong> {getRegionHeightLabel(selectedRegion.heightLevel ?? getRegionHeightLevelFromBiomeId(selectedRegion.biomeId), language)}</p>
                          <p><strong>{t.selectedRegionSize}:</strong> {getRegionSizeDisplay(selectedRegion, language)}</p>
                        </>
                      ) : null}
                      <p><strong>centralHex:</strong> {selectedMeta?.isCenter ? t.yes : t.no}</p>
                      <p><strong>anchorHex:</strong> {selectedMeta?.isAnchor ? t.yes : t.no}</p>
                      <p><strong>{t.roadNumbers}:</strong> {selectedHexRoadIds.length > 0 ? selectedHexRoadIds.map((roadId) => `${roadId}`).join('; ') : '—'}</p>
                      <p><strong>{t.trailNumbers}:</strong> {selectedHexTrailIds.length > 0 ? selectedHexTrailIds.map((trailId) => `${trailId}`).join('; ') : '—'}</p>
                      {!isSelectedCandidate && selectedRegion && !isSelectedLake ? (
                        <>
                          <p><strong>{t.regionPoiCount}:</strong> {selectedRegion.pointsOfInterest.length}</p>
                          <p><strong>{t.regionRoads}:</strong> {selectedRegionRoadStats.road}</p>
                          <p><strong>{t.regionTrails}:</strong> {selectedRegionRoadStats.trail}</p>
                          <p>
                            <strong>{t.regionRivers}:</strong>{' '}
                            {selectedRegionRivers.length > 0
                              ? selectedRegionRivers
                                .map((river) => `${river.id}`)
                                .join('; ')
                              : '—'}
                          </p>
                          <div>
                            <strong>{t.riverSectors}</strong>
                            {selectedRegionRiverSectors.length > 0 ? (
                              <ul>
                                {selectedRegionRiverSectors.map((sector) => (
                                  <li key={sector.id}>{t.river} {sector.riverId}: {t.sector} {sector.sectorIndex}, {t.fullness} {sector.fullness}</li>
                                ))}
                              </ul>
                            ) : ' —'}
                          </div>
                          <div>
                            <strong>{t.confluences}</strong>
                            {selectedRegionConfluences.length > 0 ? (
                              <ul>
                                {selectedRegionConfluences.map((confluence) => (
                                  <li key={confluence.id}>{t.river} {confluence.tributaryRiverId} {t.flowsInto} {t.river} {confluence.mainRiverId}</li>
                                ))}
                              </ul>
                            ) : ' —'}
                          </div>
                          <p>
                            <strong>{t.regionLakes}:</strong>{' '}
                            {selectedRegionLakes.length > 0
                              ? selectedRegionLakes
                                .map((lake) => `${lake.lakeId} — ${lake.size} ${formatHexCount(lake.size, language)}`)
                                .join('; ')
                              : '—'}
                          </p>
                        </>
                      ) : null}
                      <hr />
                      <p><strong>River debug</strong></p>
                      {!selectedRegion ? <p>{t.selectRegionHex}</p> : null}
                      {selectedRegion && !selectedRegionGraph ? <p>no graph</p> : null}
                      {selectedRegion && selectedRegionGraph && !selectedRegionRiver ? <p>{t.noRiverInRegion}</p> : null}
                      {selectedRegion && selectedRegionGraph && selectedRegionRiver ? (() => {
                const fullPath = selectedRegionRiver.vertexPath;
                const path = getRiverPathInRegionGraph(selectedRegionRiver, selectedRegionGraph);
                const start = path?.[0];
                const end = path?.[path.length - 1];
                const startNode = start ? selectedRegionGraph.nodes.get(start.key) : undefined;
                const endNode = end ? selectedRegionGraph.nodes.get(end.key) : undefined;
                const firstEdgeKey = path && path.length >= 2 ? edgeKey(path[0], path[1]) : '—';
                const lastEdgeKey = path && path.length >= 2 ? edgeKey(path[path.length - 2], path[path.length - 1]) : '—';
                const firstEdge = path && path.length >= 2 ? selectedRegionGraph.edges.get(firstEdgeKey) : undefined;
                const lastEdge = path && path.length >= 2 ? selectedRegionGraph.edges.get(lastEdgeKey) : undefined;
                const riverPathEdgeKeys = path ? getRiverPathEdgeKeys(path, selectedRegionGraph) : undefined;
                const riverEdgeCount = riverPathEdgeKeys?.length ?? 0;
                const duplicateRiverEdgeCount = riverPathEdgeKeys
                  ? riverEdgeCount - new Set(riverPathEdgeKeys).size
                  : 0;
                const duplicateRiverVertexCount = path ? path.length - new Set(path.map((vertex) => vertex.key)).size : 0;
                const existingRiverEndpointVerticesInRegion = getExistingRiverEndpointVerticesInRegion(selectedRegion, rivers, selectedRegionGraph);
                const riverHasDuplicateEdges = riverPathEdgeKeys ? hasDuplicateEdgeKeys(riverPathEdgeKeys) : false;
                return (
                  <>
                    <p>regionId: {selectedRegion.id}</p>
                    <p>regionHexes.length: {selectedRegion.hexes.length}</p>
                    <p>redCandidateVertices.length: {selectedRegionRedVertices.length}</p>
                    <p>orangeNeighborRegionVertices.length: {selectedRegionSharedVertices.neighborRegionVertices.length}</p>
                    <p>purpleCentralHexVertices.length: {selectedRegion.centerHex ? getHexCornerPoints(selectedRegion.centerHex).length : 0}</p>
                    <p>centralHex coordinate: {selectedRegion.centerHex ? `${selectedRegion.centerHex.q}/${selectedRegion.centerHex.r}` : '—'}</p>
                    <p>centralHexVertices.length: {selectedRegion.centerHex ? getHexCornerPoints(selectedRegion.centerHex).length : 0}</p>
                    <p>selectedRedVertex key: {selectedRedVertexFromHex?.key ?? '—'}</p>
                    <p>selectedRedVertex currentRegionCount: {selectedRedVertexUsage?.currentRegionCount ?? 0}</p>
                    <p>selectedRedVertex otherRegionCount: {selectedRedVertexUsage?.otherRegionCount ?? 0}</p>
                    <p>selectedRedVertex candidateCount: {selectedRedVertexUsage?.candidateCount ?? 0}</p>
                    <p>riverId: {selectedRegionRiver.id}</p>
                    <p>existingRiverEndpointVerticesInRegion.length: {existingRiverEndpointVerticesInRegion.length ?? 0}</p>
                    <p>selected start mode: {selectedRegionRiver.controlPoints?.startMode ?? 'none'}</p>
                    <p>selected startVertex key: {selectedRegionRiver.controlPoints?.startVertex.key ?? 'none'}</p>
                    <p>selected middlePurpleVertex key: {selectedRegionRiver.controlPoints?.middlePurpleVertex?.key ?? '-'}</p>
                    <p>selected endVertex key: {selectedRegionRiver.controlPoints?.endVertex.key ?? 'none'}</p>
                    <p>startRiverExteriorVertex key: {start?.key ?? "—"}</p>
                    <p>endRiverExteriorVertex key: {end?.key ?? "—"}</p>
                    <p>riverPath.length: {path?.length ?? 0}</p>
                    <p>fullRiverPath.length: {fullPath?.length ?? 0}</p>
                    <p>riverEdgeCount: {riverEdgeCount}</p>
                    <p>duplicateRiverEdgeCount: {duplicateRiverEdgeCount ?? 0}</p>
                    <p>duplicateRiverVertexCount: {duplicateRiverVertexCount ?? 0}</p>
                    <p>riverHasDuplicateEdges: {riverHasDuplicateEdges ? 'true' : 'false'}</p>
                    <p>startVertex key: {start?.key ?? '—'}</p>
                    <p>endVertex key: {end?.key ?? '—'}</p>
                    <p>start isRegionBoundaryVertex: {startNode?.isRegionBoundaryVertex ? 'true' : 'false'}</p>
                    <p>end isRegionBoundaryVertex: {endNode?.isRegionBoundaryVertex ? 'true' : 'false'}</p>
                    <p>start isCandidateBoundaryVertex: {startNode?.isCandidateBoundaryVertex ? 'true' : 'false'}</p>
                    <p>end isCandidateBoundaryVertex: {endNode?.isCandidateBoundaryVertex ? 'true' : 'false'}</p>
                    <p>first edge key: {firstEdgeKey}</p>
                    <p>last edge key: {lastEdgeKey}</p>
                    <p>first edge isRegionBoundaryEdge: {firstEdge?.isRegionBoundaryEdge ? 'true' : 'false'}</p>
                    <p>last edge isRegionBoundaryEdge: {lastEdge?.isRegionBoundaryEdge ? 'true' : 'false'}</p>
                    <p>first edge isCandidateBoundaryEdge: {firstEdge?.isCandidateBoundaryEdge ? 'true' : 'false'}</p>
                    <p>last edge isCandidateBoundaryEdge: {lastEdge?.isCandidateBoundaryEdge ? 'true' : 'false'}</p>
                    <p>issues: {selectedIssues.length > 0 ? selectedIssues.slice(0, 6).join(', ') : 'none'}</p>
                    <p>candidateBoundaryEdges count: {selectedCandidateBoundaryDebug?.edges.length ?? 0}</p>
                    <p>candidateBoundaryVertices count: {selectedCandidateBoundaryDebug?.vertices.length ?? 0}</p>
                    <p>invalidCandidateBoundaryVertices count: {selectedCandidateBoundaryDebug?.invalidVertices.length ?? 0}</p>
                  </>
                );
              })() : null}
                    </>
                  ) : null}
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

    </div>
  );
}
