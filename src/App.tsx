import {knaveLossValue,dropKnaveLoss,newKnaveLayer,setKnaveDifficulty,setKnaveDiscovery,type Difficulty,type Discovery,validateKnaveLayer,remapKnavePois,knaveLosses,type KnaveLayer,type KnaveContext} from './knaveClassic';
import {hasCentralPoi,preparePoiMove,poiLocatorKey,type PoiLocator,assertPoiEditorNames,poiNameLocators,renamePoiEditorName,PoiMoveError,type EditorNames} from './manualPois';
import {migrateSeas,prepareSeaIdentity,withLegacySeas,type SeaRecord,type SeaChoices} from './seaIdentity';
import {prepareWaterGeometry,connectedWaterBody,waterKindAt,WaterEditError,compareWaterHexes,type WaterEdit,type WaterKind} from './manualWater';
import {prepareRegionGeometry,prepareRegionPoiIdentity,RegionEditError,type RegionEdit} from './manualRegions';
import {prepareEditedRiverCrossings,validateEditedRiverDeltas,knownRiverEdgeFullness} from './manualRiverDependencies';
import {buildManualRiverNetwork,solveManualRiverPath, type RiverEditingGeometry} from './manualRiverGeometry';
import {prepareRiverEdit,validateEditedRiverNetwork,rebuildRiverWaterSectors,rebuildRiverRegionSectors,validateRegionRiverHeights,resolveRiverFeatureEdits,type RiverEdit,type FeatureEdit,emptyRiverFeatures, migrateRiverEditing, validateRiverCounter, validateRiverFeatures, reserveGeneratedRiverIds, type RiverFeatures, type FeatureEligibility, type RiverEditContext, type EditableRiver} from './manualRivers';
import {emptyTags,findTag,ownerKey,tagKey,rollTag,editTag,validateTags,TagCapacityError,type TagState,type TagOwner} from './tags/engine';
import {mythicDefinitions,tagOwners,tagPolicy,reconcileTags,fillMythicTags} from './tags/mythic';
import {TagRow} from './tags/TagRow';
import {prepareRoadEdit, type RoadEdit} from './manualRoads';
import { type RandomStreams, type GenerationState, fallbackRandomStreams, poiRandomStreams, createGenerationState, cloneGenerationState, draw, toponymSeedFor, newWorldSeed, isUint32 } from './worldRandom';
import { validateSaveStructure, SaveValidationError, assertGeneratedIds } from './saveValidation';
import { installViewportRasterCache } from './rendering/viewportRasterCache';
import {assignWoodlandStyle,chooseWoodlandStyle,type WoodlandStyle} from './modes/woodlandStyle';
import {buildNaturalLakes,createLakeGeometryCache} from './rendering/lakeGeometry';
import {ForestCanopy,ForestWaterEdge} from './rendering/ForestCanopy';
import {ColorHexGrid} from './rendering/ColorHexGrid';
import {forestFamily} from './rendering/forestStyle';
import { BIOME_GROUND_COLORS, WATER_PALETTE, terrainAsset } from './rendering/terrainStyle';
import { LakeWater } from './rendering/LakeWater';
import { validateKingdomLayers } from './modes/persistence';
import { findKingdomOrigin, kingdomHexes, kingdomKeys, connectionPath, distance, type Kingdom, type GenerationMode } from './modes/kingdoms';
import { modeRegionSize } from './modes/regionSize';
import { MYTHIC_POI, mythicPoiChoices, initialMythicPoints, allocateKingdomPoi, type MythicPoi } from './modes/pointsOfInterest';
import { createObstacles, pairKey, type Obstacle } from './modes/obstacles';
import {prepareObstacleEdit,migrateLegacyObstacles,normalizeObstacleCounter,type ObstacleEdit,type EditableObstacle} from './manualObstacles';
import { kingdomBoundary } from './modes/kingdomBoundaries';
import { createGenerationLogger, MAX_REGION_ATTEMPTS, type GenerationEvent } from './generationDiagnostics';
import { solveRiverNetwork, validateRiverNetwork, minimumLakeHexes, isFullness, type RiverNetwork as ModelNetwork, type RiverEdge as ModelEdge, type SolveResult as ModelSolveResult } from './riverModel/core';
import { type ChangeEvent, type CSSProperties, type KeyboardEvent, type MouseEvent, type WheelEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  getOutgoingConnectorFullnessFromEndpoint,
  type RiverFullness
} from './riverFullness';
import { chooseRiverCrossingKind, type RiverCrossingKind } from './riverCrossings';
import { hasRiverRapids } from './riverRapids';
import { hasRiverWaterfall } from './riverWaterfalls';
import { getOnlyOutgoingRiversPreferredHeight } from './biomeHeight';
import { DEFAULT_TOPONYM_MODEL, isToponymRegistry, synchronizeToponyms, renameToponym, type ToponymEntity, type ToponymRegistry, type ToponymModelId, type ToponymKind } from './toponyms';

const generationLog = createGenerationLogger(typeof window !== 'undefined' ? window.location?.search : '');

// ===== ЛОКАЛЬНОЕ ПРОФИЛИРОВАНИЕ (безопасно для прода) =====
// Включается ТОЛЬКО при ?profile=1 в URL. По умолчанию выключено: __profiled
// возвращает функцию как есть (ноль накладных), таблица в консоль не печатается,
// у обычных пользователей ничего не появляется. Для замеров открыть страницу как
// localhost:5173/?profile=1 и генерировать регион — таблица снова печатается в F12.
const __PROFILE_ENABLED = typeof window !== 'undefined'
  && typeof window.location !== 'undefined'
  && new URLSearchParams(window.location.search).has('profile');
const __profileStats = new Map<string, { calls: number; totalMs: number }>();
function __profiled<T extends (...args: any[]) => any>(name: string, fn: T): T {
  if (!__PROFILE_ENABLED) return fn;
  return ((...args: any[]) => {
    const start = performance.now();
    try {
      return fn(...args);
    } finally {
      const elapsed = performance.now() - start;
      const entry = __profileStats.get(name) ?? { calls: 0, totalMs: 0 };
      entry.calls += 1;
      entry.totalMs += elapsed;
      __profileStats.set(name, entry);
    }
  }) as T;
}
function __profileHit(name: string) {
  if (!__PROFILE_ENABLED) return;
  const entry = __profileStats.get(name) ?? { calls: 0, totalMs: 0 };
  entry.calls += 1;
  __profileStats.set(name, entry);
}
let __profileClickStart = 0;
function __profileBeginClick() {
  if (!__PROFILE_ENABLED) return;
  __profileStats.clear();
  __profileClickStart = performance.now();
  setTimeout(() => {
    const totalMs = performance.now() - __profileClickStart;
    const rows = Array.from(__profileStats.entries())
      .map(([name, { calls, totalMs: t }]) => ({
        'функция': name,
        'вызовов': calls,
        'сумма мс': Math.round(t * 100) / 100,
        'среднее мс': Math.round((t / Math.max(1, calls)) * 1000) / 1000
      }))
      .sort((a, b) => b['сумма мс'] - a['сумма мс']);
    console.log(`%c[PROFILE] Регион сгенерирован за ${Math.round(totalMs)} мс`, 'font-weight:bold;color:#2b6b9e;font-size:13px');
    console.table(rows);
  }, 0);
}
// ===== КОНЕЦ ВРЕМЕННОГО ПРОФИЛИРОВАНИЯ =====

// Яндекс Метрика: номер счётчика и безопасная отправка цели (reachGoal).
// window.ym приходит из сниппета в index.html. Если его нет (adblock,
// локальный запуск, счётчик ещё не прогрузился) — вызов молча игнорируется,
// чтобы аналитика никогда не могла уронить приложение.
const YM_COUNTER_ID = 110340124;

type YandexMetrikaFn = (counterId: number, action: string, ...rest: unknown[]) => void;

function trackGoal(goal: string): void {
  if (typeof window === 'undefined') return;
  const ym = (window as unknown as { ym?: YandexMetrikaFn }).ym;
  if (typeof ym === 'function') {
    ym(YM_COUNTER_ID, 'reachGoal', goal);
  }
}

type AxialHex = {
  q: number;
  r: number;
};

type RiverSlopeDirection = 'E' | 'NE' | 'NW' | 'W' | 'SW' | 'SE';

type RiverSlopeInfo = {
  radius: number;
  edgeCount: number;
  totalContribution: number;
  vector: { x: number; y: number };
  strength: number;
  confidence: number;
  direction: RiverSlopeDirection | 'none';
  directionScores: Record<RiverSlopeDirection, number>;
};

type HexType = 'region' | 'candidate' | 'center';

type BiomeLandType = 'settled' | 'wild';
type CentralPoiKind = MythicPoi | 'capital' | 'city' | 'town' | 'village' | 'lair' | 'ruins' | 'cursed_place' | 'holy_place';
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
type PoiKind = MythicPoi | SettlementPoiKind | SecondaryPoiKind;
type WaterPoiKind = 'whirlpool' | 'underwater_ruins' | 'lair' | 'rocks' | 'underwater_cave' | 'shipwreck';
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
  | 'semi_desert'
  | 'dead_forest'
  | 'dead_woodland'
  | 'dead_forested_hills'
  | 'dead_mountain_forest';

type Region = {
  generationMode?: GenerationMode;
  kingdomId?: number;
  woodlandStyle?: WoodlandStyle;
  suppressCentralPoi?: boolean;
  id: number;
  hexes: AxialHex[];
  centerHex: AxialHex;
  anchorHex: AxialHex;
  targetSize: number;
  finalSize: number;
  sizeCategory: 'tract' | 'locality' | 'small_region' | 'region' | 'large_region' | 'land' | 'vast_land';
  sizeLabel: 'Урочище' | 'Местность' | 'Малый регион' | 'Регион' | 'Большой регион' | 'Край' | 'Обширный край';
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
  riverSlope?: RiverSlopeInfo;
  // Прибрежный ли регион. Необязательное поле — старые сохранения без него
  // корректно читаются как "не прибрежный".
  isCoastal?: boolean;
  isTract?: boolean;
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
  deltaParentRiverId?: number;
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
type RiverCrossing = {
  key: string;
  roadId: number;
  roadSegmentKey: string;
  riverId: number;
  riverEdgeKey: string;
  kind: RiverCrossingKind;
};
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
  preferredHeight?: RegionHeightLevel;
  reasons: string[];
};
type ChooseBiomeResult = {
  biomeId: BiomeId | null;
  reason?: 'river_height_constraint_failed';
};

const HEX_SIZE = 28;
const SQRT3 = Math.sqrt(3);
const SHOW_BIOME_EMOJI = true;
const REGION_CENTER_EMOJI = '★';
const CENTRAL_POI_DETAILS: Record<CentralPoiKind, { emoji: string; label: Record<Language, string> }> = {
  ...MYTHIC_POI,
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
const WATER_POI_DETAILS: Record<WaterPoiKind, { emoji: string; label: Record<Language, string> }> = {
  whirlpool: { emoji: '🌀', label: { ru: 'Водоворот', en: 'Whirlpool' } },
  underwater_ruins: { emoji: '🏛️', label: { ru: 'Подводные руины', en: 'Underwater ruins' } },
  lair: { emoji: '🐉', label: { ru: 'Логово', en: 'Lair' } },
  rocks: { emoji: '🪨', label: { ru: 'Скалы', en: 'Rocks' } },
  underwater_cave: { emoji: '🕳️', label: { ru: 'Подводная пещера', en: 'Underwater cave' } },
  shipwreck: { emoji: '⛵', label: { ru: 'Кораблекрушение', en: 'Shipwreck' } }
};
const WATER_POI_KIND_ORDER: WaterPoiKind[] = ['whirlpool', 'underwater_ruins', 'lair', 'rocks', 'underwater_cave', 'shipwreck'];
const WILD_LAKE_WATER_POI_KIND_ORDER: WaterPoiKind[] = ['whirlpool', 'underwater_ruins', 'lair', 'rocks', 'underwater_cave'];
const SETTLED_WATER_POI_KIND_ORDER: WaterPoiKind[] = ['underwater_ruins', 'rocks', 'underwater_cave'];
const POI_EMOJI = '◆';
const WATER_COLOR = 'var(--water-color)';
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

// Разреженный слой ручных переопределений: отсутствие записи означает,
// что гекс отображает биом своего региона.
type HexBiomeOverrideByKey = Record<string, BiomeId>;

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
  version: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  generation?: GenerationState;
  savedAt: string;
  map: {
    knave?: KnaveLayer;
    riverFeatures?: RiverFeatures;
    tags?: TagState;
    kingdoms?: Kingdom[];
    obstacles?: (Obstacle | EditableObstacle)[];
    regions: Region[];
    candidateHexes: AxialHex[];
    rivers: River[];
    roads: Road[];
    crossings: RiverCrossing[];
    seas?: SeaRecord[];
    nextSeaId?: number;
    editorNames?: EditorNames;
    gmNotesByHexKey?: Record<string, string>;
    terrainByHexKey: Record<string, HexTerrainData>;
    waterPoiByHexKey?: Record<string, WaterPoiKind>;
    biomeOverrideByHexKey?: HexBiomeOverrideByKey;
    toponyms?: { seed: number; model: ToponymModelId; names: ToponymRegistry };
  };
  counters: {
    nextLakeId: number;
    nextRoadId: number;
    nextRiverId?: number;
    nextObstacleId?: number;
  };
  ui: {
    generationMode?: GenerationMode;
    selectedHex: AxialHex | null;
    isMapRotated: boolean;
    mapScale: number;
  };
};

type ValidatedHexcrawlSaveData = HexcrawlSaveData & {
  map: HexcrawlSaveData['map'] & {
    seas?: SeaRecord[];
    nextSeaId?: number;
    editorNames?: EditorNames;
    gmNotesByHexKey?: Record<string, string>;
    terrainByHexKey: Record<string, HexTerrainData>;
    waterPoiByHexKey?: Record<string, WaterPoiKind>;
  };
};

const HEXCRAWL_SAVE_SCHEMA = 'hexcrawl-map';
const HEXCRAWL_SAVE_VERSION = 10;
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
  semi_desert: '/Semi-desert.png',
  dead_forest: '/dead_forest_heavy.png',
  dead_woodland: '/dead_forest_wetlands.png',
  dead_forested_hills: '/dead_forest_hills.png',
  dead_mountain_forest: '/dead_forest_mountain.png'
};
const SVG_EXPORT_STYLES = `
  svg { --water-color: #3ea2ff; background: #0c1423; }
  .hex { stroke:#617187; stroke-width:1; }
  .hex.center { stroke:#707f96; }
  .hex.candidate { fill:#4f5f72; stroke:#7f8ea3; cursor:pointer; stroke-dasharray:2 2; }
  .hex.click-prompt { stroke:#f7dc6f; stroke-width:2; }
  .click-prompt-label { fill:#fff7bf; stroke:#0c1423; stroke-width:3px; paint-order:stroke; font-size:12px; font-weight:800; pointer-events:none; }
  .hex-label { fill:#f4f8ff; font-size:11px; pointer-events:none; }
  .hex-coordinate-label { fill:#253247; font-size:7px; font-weight:700; letter-spacing:.02em; pointer-events:none; user-select:none; }
  .rivers-layer, .roads-layer, .river-debug-layer { pointer-events:none; }
  .river-polyline { fill:none; stroke:var(--water-color); stroke-linecap:round; stroke-linejoin:round; }
  .river-direction-arrow, .river-rapid-mark { stroke:var(--water-marks, #ffffff); stroke-width:1.2; stroke-linecap:round; }
  .river-waterfall { pointer-events:none; }
  .river-arrow-head { fill:var(--water-marks, #ffffff); }
  .road-line { stroke:#8b6a3f; stroke-width:3; stroke-linecap:round; }
  .road-line--ford { opacity:.42; }
  .trail-line { stroke:#8b6a3f; stroke-width:1.5; stroke-linecap:butt; stroke-dasharray:4.04145 4.04145; stroke-dashoffset:2.02073; }
  .trail-line--ford { stroke-dasharray:none; stroke-dashoffset:0; opacity:.42; }
  .bridge-rail { fill:none; stroke:#4f3922; stroke-width:1.1; stroke-linecap:round; stroke-linejoin:round; }
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
    languageName: 'Русский', switchLanguage: 'Switch to English', reset: 'Сбросить', regenerateRegion: 'Перегенерировать регион', deleteLastRegion: 'Удалить последний регион', export: 'Выгрузить', importJson: 'Загрузить JSON', debug: 'Отладка', controlsLabel: 'Управление картой', genParamsLabel: 'Параметры генерации', size: 'Размер', type: 'Тип', biome: 'Биом', coast: 'Берег', auto: 'Авто', settled: 'Освоенный', wild: 'Дикий', coastOption: 'Побережье', mainland: 'Материк', closeNotice: 'Закрыть уведомление', mapAria: 'Карта: перетаскивайте пальцем или мышью, стрелки клавиатуры перемещают область просмотра', rotateMap: 'Повернуть карту на 90 градусов', rotateMapTitle: 'Повернуть карту на 90°', unrotateMap: 'Вернуть исходный поворот карты', showTiles: 'Включить тайлы', showTilesTitle: 'Показывать гексы тайлами', hexesDisplay: 'Гексы', pointsDisplay: 'Точки интереса', iconsMode: 'Значки', showPoiEmojiTitle: 'Показывать точки интереса эмоджи', showPoiIconsTitle: 'Показывать точки интереса значками', tilesMode: 'Тайлы', emojiMode: 'Эмоджи', showEmoji: 'Включить эмоджи', showEmojiTitle: 'Показывать гексы эмоджи', hexCoordinatesMode: 'Координаты', showHexCoordinates: 'Показать координаты гексов', showHexCoordinatesTitle: 'Показать или скрыть координаты гексов', showPanel: 'Показать панель управления и информации', hidePanel: 'Скрыть панель управления и информации', startPrompt: 'Нажми на стартовый гекс', candidatePrompt: 'Выберите гекс-кандидат для добавления региона', selectedHexInfo: 'Информация о выбранном гексе', candidateForRegion: 'Кандидат для нового региона', noHexSelected: 'Гекс не выбран', lake: 'Озеро', settledRegion: 'Освоенный регион', wildArea: 'Дикая местность', centralPoi: 'Центральная точка интереса', poi: 'Точка интереса', addPoi: 'Добавить точку интереса', choosePoi: 'Выберите точку интереса', editPoi: 'Редактировать точку интереса', deletePoi: 'Удалить точку интереса', road: 'Дорога', trail: 'Тропа', nearby: 'Рядом:', river: 'Река', rapids: 'пороги', bridge: 'Мост', ferry: 'Переправа', ford: 'Брод', sea: 'Море', debugInfo: 'Отладочная информация', regions: 'Регионов', lastRegion: 'Последний регион', regionSize: 'Размер региона', height: 'Высота', targetSize: 'Целевой размер', finalSize: 'Фактический размер региона', poiCount: 'Точек интереса', selectedHex: 'Координаты гекса', selectedRegionHeight: 'Высота выбранного региона', selectedRegionSize: 'Размер выбранного региона', yes: 'да', no: 'нет', roadNumbers: 'Номера дорог', trailNumbers: 'Номера троп', regionPoiCount: 'Точек интереса в регионе', regionRoads: 'Дорог региона', regionTrails: 'Троп региона', regionRivers: 'Реки региона', riverSectors: 'Речные сектора:', sector: 'сектор', fullness: 'полноводность', confluences: 'Слияния:', flowsInto: 'впадает в', regionLakes: 'Озёра региона', selectRegionHex: 'Выберите региональный гекс.', noRiverInRegion: 'В выбранном регионе нет реки для подробной отладки.', pngExportError: 'Не удалось выгрузить PNG-файл.', jsonImportError: 'Не удалось загрузить JSON-файл.', youtubeLabel: 'YouTube канал', telegramLabel: 'Telegram канал', showHeaderLinks: 'Показать кнопки языка и соцсетей', hideHeaderLinks: 'Скрыть кнопки языка и соцсетей', editHexBiome: 'Изменить биом гекса', resetHexBiome: 'Сбросить биом гекса' },
  en: {
    languageName: 'English', switchLanguage: 'Переключить на русский', reset: 'Reset', regenerateRegion: 'Regenerate region', deleteLastRegion: 'Delete last region', export: 'Export', importJson: 'Load JSON', debug: 'Debug', controlsLabel: 'Map controls', genParamsLabel: 'Generation parameters', size: 'Size', type: 'Type', biome: 'Biome', coast: 'Coast', auto: 'Auto', settled: 'Settled', wild: 'Wild', coastOption: 'Coast', mainland: 'Mainland', closeNotice: 'Close notice', mapAria: 'Map: drag with touch or mouse; keyboard arrows move the viewport', rotateMap: 'Rotate map 90 degrees', rotateMapTitle: 'Rotate map 90°', unrotateMap: 'Restore original map rotation', showTiles: 'Show tiles', showTilesTitle: 'Show hexes as tiles', hexesDisplay: 'Hexes', pointsDisplay: 'Points of interest', iconsMode: 'Icons', showPoiEmojiTitle: 'Show points of interest as emoji', showPoiIconsTitle: 'Show points of interest as icons', tilesMode: 'Tiles', emojiMode: 'Emoji', showEmoji: 'Show emoji', showEmojiTitle: 'Show hexes as emoji', hexCoordinatesMode: 'Coordinates', showHexCoordinates: 'Show hex coordinates', showHexCoordinatesTitle: 'Show or hide hex coordinates', showPanel: 'Show controls and information panel', hidePanel: 'Hide controls and information panel', startPrompt: 'Click the starting hex', candidatePrompt: 'Select a candidate hex to add a region', selectedHexInfo: 'Selected hex information', candidateForRegion: 'Candidate for a new region', noHexSelected: 'No hex selected', lake: 'Lake', settledRegion: 'Settled region', wildArea: 'Wild area', centralPoi: 'Central point of interest', poi: 'Point of interest', addPoi: 'Add point of interest', choosePoi: 'Choose a point of interest', editPoi: 'Edit point of interest', deletePoi: 'Delete point of interest', road: 'Road', trail: 'Trail', nearby: 'Nearby:', river: 'River', rapids: 'rapids', bridge: 'Bridge', ferry: 'Ferry', ford: 'Ford', sea: 'Sea', debugInfo: 'Debug information', regions: 'Regions', lastRegion: 'Last region', regionSize: 'Region size', height: 'Height', targetSize: 'Target size', finalSize: 'Final region size', poiCount: 'Points of interest', selectedHex: 'Hex coordinates', selectedRegionHeight: 'Selected region height', selectedRegionSize: 'Selected region size', yes: 'yes', no: 'no', roadNumbers: 'Road numbers', trailNumbers: 'Trail numbers', regionPoiCount: 'Points of interest in region', regionRoads: 'Region roads', regionTrails: 'Region trails', regionRivers: 'Region rivers', riverSectors: 'River sectors:', sector: 'sector', fullness: 'fullness', confluences: 'Confluences:', flowsInto: 'flows into', regionLakes: 'Region lakes', selectRegionHex: 'Select a region hex.', noRiverInRegion: 'The selected region has no river for detailed debugging.', pngExportError: 'Failed to export PNG file.', jsonImportError: 'Failed to load JSON file.', youtubeLabel: 'YouTube channel', telegramLabel: 'Telegram channel', showHeaderLinks: 'Show language and social buttons', hideHeaderLinks: 'Hide language and social buttons', editHexBiome: 'Edit hex biome', resetHexBiome: 'Reset hex biome' }
} as const;

const SIZE_LABELS: Record<Language, Record<Region['sizeCategory'], string>> = {
  ru: { tract: 'Урочище', locality: 'Местность', small_region: 'Малый регион', region: 'Регион', large_region: 'Большой регион', land: 'Край', vast_land: 'Обширный край' },
  en: { tract: 'Tract', locality: 'Locality', small_region: 'Small region', region: 'Region', large_region: 'Large region', land: 'Land', vast_land: 'Vast land' }
};

const BIOME_LABELS_EN: Record<BiomeId, string> = {
  plain_deciduous_forest: 'Lowland deciduous forest', plain_mixed_forest: 'Lowland mixed forest', plain_coniferous_forest: 'Lowland coniferous forest', deciduous_forested_hills: 'Deciduous forested hills', mixed_forested_hills: 'Mixed forested hills', coniferous_forested_hills: 'Coniferous forested hills', open_hills: 'Open hills', coniferous_mountain_forest: 'Coniferous mountain forest', mixed_mountain_forest: 'Mixed mountain forest', deciduous_mountain_forest: 'Deciduous mountain forest', mountains: 'Mountains', open_plains: 'Open plains', swamp_forest: 'Swamp forest', swamp: 'Swamp', hilly_woodland: 'Hilly woodland', mountain_woodland: 'Mountain woodland', deciduous_woodland: 'Deciduous woodland', mixed_woodland: 'Mixed woodland', coniferous_woodland: 'Coniferous woodland', semi_desert: 'Semi-desert', dead_forest: 'Dead forest', dead_woodland: 'Dead woodland', dead_forested_hills: 'Dead forested hills', dead_mountain_forest: 'Dead mountain forest'
};

function getBiomeLabel(biomeId: BiomeId, language: Language): string {
  return language === 'en' ? BIOME_LABELS_EN[biomeId] : BIOMES[biomeId].label;
}

function getBiomeTileHref(biomeId?: BiomeId): string | undefined {
  return biomeId ? BIOME_TILE_HREFS[biomeId] : undefined;
}

function getPoiSvgHref(kind?: CentralPoiKind | PoiKind | WaterPoiKind, water = false): string {
  if (kind && kind in MYTHIC_POI) kind = MYTHIC_POI[kind as MythicPoi].icon as PoiKind;
  return kind ? `/poi/v2/${water ? 'water' : 'land'}/${kind}.svg` : '/poi/v2/unknown.svg';
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
  semi_desert: { id: 'semi_desert', label: 'Полупустыня', color: '#E7F79C', primaryEmoji: '🪨', secondaryEmojis: ['🌱'], wildWeight: 1, settledWeight: 0, heightLevel: 1 },
  dead_forest: { id: 'dead_forest', label: 'Мёртвый лес', color: '#8D8D8D', primaryEmoji: '🪾', secondaryEmojis: [], wildWeight: 1, settledWeight: 0, heightLevel: 1 },
  dead_woodland: { id: 'dead_woodland', label: 'Мёртвое редколесье', color: '#999999', primaryEmoji: '🌾', secondaryEmojis: ['🪾'], wildWeight: 1, settledWeight: 0, heightLevel: 1 },
  dead_forested_hills: { id: 'dead_forested_hills', label: 'Мёртвый лес на холмах', color: '#919191', primaryEmoji: '〰️', secondaryEmojis: ['🪾'], wildWeight: 1, settledWeight: 0, heightLevel: 2 },
  dead_mountain_forest: { id: 'dead_mountain_forest', label: 'Мёртвый горный лес', color: '#828282', primaryEmoji: '⛰', secondaryEmojis: ['🪾'], wildWeight: 1, settledWeight: 0, heightLevel: 3 }
};
// Compile-time coverage of every biome in the drawing palette.
const GROUND_COLORS: Record<BiomeId, string> = BIOME_GROUND_COLORS;
const GROUND_WATER_COLOR = WATER_PALETTE.sea;

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
const RIVER_SLOPE_RADIUS = 10;
const RIVER_SLOPE_DIRECTIONS = ([
  { label: 'E', vector: toPixel(1, 0) },
  { label: 'NE', vector: toPixel(1, -1) },
  { label: 'NW', vector: toPixel(0, -1) },
  { label: 'W', vector: toPixel(-1, 0) },
  { label: 'SW', vector: toPixel(-1, 1) },
  { label: 'SE', vector: toPixel(0, 1) }
] satisfies { label: RiverSlopeDirection; vector: { x: number; y: number } }[]).map((direction) => {
  const length = Math.hypot(direction.vector.x, direction.vector.y) || 1;
  return {
    label: direction.label,
    vector: { x: direction.vector.x / length, y: direction.vector.y / length }
  };
});

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
function getSeaHexKeysWithout(
  hexTerrainByKey: Map<string, HexTerrainData>,
  landHexes: AxialHex[] = []
): Set<string> {
  const seaKeys = getSeaHexKeys(hexTerrainByKey);
  for (const hex of landHexes) seaKeys.delete(hexKey(hex));
  return seaKeys;
}

function removeSeaOverridesForCandidateHexes(
  hexTerrainByKey: Map<string, HexTerrainData>,
  candidateHexes: AxialHex[]
): Map<string, HexTerrainData> {
  if (candidateHexes.length === 0) return hexTerrainByKey;
  let next: Map<string, HexTerrainData> | null = null;
  for (const candidateHex of candidateHexes) {
    const key = hexKey(candidateHex);
    if (hexTerrainByKey.get(key)?.terrainOverride !== 'sea') continue;
    if (!next) next = new Map(hexTerrainByKey);
    next.delete(key);
  }
  return next ?? hexTerrainByKey;
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

function convertLandlockedSeaComponentsToLakes(
  hexTerrainByKey: Map<string, HexTerrainData>,
  regions: Region[],
  firstLakeId: number
): { terrainByKey: Map<string, HexTerrainData>; nextLakeId: number } {
  const seaKeys = getSeaHexKeys(hexTerrainByKey);
  if (seaKeys.size === 0) return { terrainByKey: hexTerrainByKey, nextLakeId: firstLakeId };

  const landKeys = new Set<string>();
  for (const region of regions) for (const hex of region.hexes) landKeys.add(hexKey(hex));

  let next: Map<string, HexTerrainData> | null = null;
  let lakeIdCursor = firstLakeId;
  for (const component of getConnectedSeaComponents(seaKeys)) {
    let isFullyEnclosedByLand = true;
    for (const key of component) {
      for (const neighbor of getHexNeighbors(parseHexKey(key))) {
        const neighborKey = hexKey(neighbor);
        if (component.has(neighborKey)) continue;
        if (!landKeys.has(neighborKey)) {
          isFullyEnclosedByLand = false;
          break;
        }
      }
      if (!isFullyEnclosedByLand) break;
    }

    if (!isFullyEnclosedByLand) continue;
    if (!next) next = new Map(hexTerrainByKey);
    const lakeId = lakeIdCursor;
    lakeIdCursor += 1;
    for (const key of component) next.set(key, { terrainOverride: 'lake', lakeId });
  }

  return { terrainByKey: next ?? hexTerrainByKey, nextLakeId: lakeIdCursor };
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

function getHexPolygonPoints(cx: number, cy: number, size: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
  }
  return points;
}

function hexPoints(cx: number, cy: number, size: number) {
  return getHexPolygonPoints(cx, cy, size).map((point) => `${point.x},${point.y}`).join(' ');
}

function getHexCoordinateLabelLayout(cx: number, cy: number, sourceHeight: number, isRotated: boolean) {
  const points = getHexPolygonPoints(cx, cy, HEX_SIZE);

  // When the map is rotated, keep labels aligned with the bottom edge of each
  // individual rotated hex rather than with the overall map viewport.
  if (isRotated) {
    const rotatedPoints = points.map((point) => rotateMapPoint(point.x, point.y, sourceHeight));
    const edgeCandidates = rotatedPoints.map((point, index) => {
      const nextPoint = rotatedPoints[(index + 1) % rotatedPoints.length];
      return {
        x: (point.x + nextPoint.x) / 2,
        y: (point.y + nextPoint.y) / 2
      };
    });
    const bottomEdge = edgeCandidates.reduce((lowest, edge) => (edge.y > lowest.y ? edge : lowest), edgeCandidates[0]);
    return { x: bottomEdge.x, y: bottomEdge.y - HEX_SIZE * 0.14, angle: 0 };
  }

  // In the default orientation, place the label parallel to the lower-right edge
  // of the flat-top hex. The p1→p2 edge is angled at 150°/-30° in screen
  // coordinates, so use -30° for a readable left-to-right baseline.
  const lowerRightStart = points[1];
  const lowerRightEnd = points[2];
  const edgeMidpoint = {
    x: (lowerRightStart.x + lowerRightEnd.x) / 2,
    y: (lowerRightStart.y + lowerRightEnd.y) / 2
  };
  const inwardOffset = HEX_SIZE * 0.12;
  const inwardVector = {
    x: (cx - edgeMidpoint.x) / (HEX_SIZE * 0.5),
    y: (cy - edgeMidpoint.y) / (HEX_SIZE * 0.5)
  };
  return {
    x: edgeMidpoint.x + inwardVector.x * inwardOffset,
    y: edgeMidpoint.y + inwardVector.y * inwardOffset,
    angle: -30
  };
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

function isWaterPoiKind(value: unknown): value is WaterPoiKind {
  return typeof value === 'string' && value in WATER_POI_DETAILS;
}

function isBiomeId(value: unknown): value is BiomeId {
  return typeof value === 'string' && value in BIOMES;
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

function isRiverCrossing(value: unknown): value is RiverCrossing {
  if (!isRecord(value)) return false;
  return typeof value.key === 'string'
    && typeof value.roadId === 'number'
    && typeof value.roadSegmentKey === 'string'
    && typeof value.riverId === 'number'
    && typeof value.riverEdgeKey === 'string'
    && (value.kind === 'bridge' || value.kind === 'ferry' || value.kind === 'ford');
}

function assertHexcrawlSaveData(value: unknown): asserts value is ValidatedHexcrawlSaveData {
  validateSaveStructure(value, {
    biome: v => typeof v === 'string' && Object.prototype.hasOwnProperty.call(BIOMES, v),
    poi: v => typeof v === 'string' && Object.prototype.hasOwnProperty.call(POI_DETAILS, v),
    centralPoi: v => typeof v === 'string' && Object.prototype.hasOwnProperty.call(CENTRAL_POI_DETAILS, v),
    waterPoi: v => typeof v === 'string' && Object.prototype.hasOwnProperty.call(WATER_POI_DETAILS, v),
    names: isToponymRegistry, toponymModel: DEFAULT_TOPONYM_MODEL,
    kingdoms: (map, version) => validateKingdomLayers(map, getHexEdgeKeys, version >= 5)
  });
  const data=value as HexcrawlSaveData;
  try{validateKnaveLayer(data.map.knave,knaveMapContext({regions:data.map.regions,hexTerrainByKey:new Map(Object.entries(data.map.terrainByHexKey)),waterPoiByKey:new Map(Object.entries(data.map.waterPoiByHexKey??{}))}),data.version,data.ui.generationMode??'classic');}catch{throw new SaveValidationError('map.knave','invalid profile or annotations');}
  if(data.version>=8)try{assertEditorNames({...data.map,seas:data.version>=9?data.map.seas:[],obstacles:(data.map.obstacles??[]) as EditableObstacle[],hexTerrainByKey:new Map(Object.entries(data.map.terrainByHexKey)),waterPoiByKey:new Map(Object.entries(data.map.waterPoiByHexKey??{})),riverFeatures:data.map.riverFeatures??emptyRiverFeatures(),editorNames:data.map.editorNames===undefined?{}:data.map.editorNames});}catch{throw new SaveValidationError('map.editorNames','invalid or dangling authored object name');}
  if(data.version>=7)try{validateMapRiverFeatures(data.map.riverFeatures,data.map.rivers,data.map.regions,new Map(Object.entries(data.map.terrainByHexKey)),data.map.crossings);}catch{throw new SaveValidationError('map.riverFeatures','invalid or ineligible river feature');}
  if(data.map.tags!==undefined)try{validateTags(data.map.tags,new Set(tagOwners({regions:data.map.regions,rivers:data.map.rivers,hexTerrainByKey:new Map(Object.entries(data.map.terrainByHexKey))}).keys()),mythicDefinitions);}catch{throw new SaveValidationError('map.tags','invalid tag data');}
}


function riverFeatureEligibility(rivers:River[],regions:Region[],terrain:Map<string,HexTerrainData>,crossings:RiverCrossing[]):FeatureEligibility{
  const hidden=new Set([...getLakeEdgeKeys(regions.flatMap(r=>r.hexes),terrain),...getSeaEdgeKeys(terrain)]);
  const crossingEdges=new Set(crossings.map(c=>c.riverEdgeKey));
  const starts=new Set(rivers.flatMap(r=>r.vertexPath.length?[r.vertexPath[0].key]:[]));
  const confluences=new Set(getRiverConfluences(rivers).map(c=>c.vertexKey));
  const lake=new Set(getLakeVertices(regions.flatMap(r=>r.hexes),terrain).map(v=>v.key));
  const sea=getSeaVertexKeysFromSeaKeys(getSeaHexKeys(terrain));
  const edges=new Map(rivers.map(r=>[r.id,new Set(r.vertexPath.slice(1).map((v,i)=>edgeKey(r.vertexPath[i],v)))]));
  const visibleVertices=new Set(rivers.flatMap(r=>r.vertexPath.slice(1).flatMap((v,i)=>hidden.has(edgeKey(r.vertexPath[i],v))?[]:[v.key,r.vertexPath[i].key])));
  return {rapid:(id,key)=>!!edges.get(id)?.has(key)&&!hidden.has(key)&&!crossingEdges.has(key),
    waterfall:key=>visibleVertices.has(key)&&!starts.has(key)&&!confluences.has(key)&&!lake.has(key)&&!sea.has(key)};
}
/** Detached E5 physical/numeric context. Crossings/delta/feature dependency
 * preparation is deliberately supplied by the final edit transaction, not a no-op
 * callback masquerading as complete acceptance. */
function buildManualRiverGeometryContext(map:MapSnapshot):Pick<RiverEditContext,'vertex'|'edgeOwners'|'blocked'|'event'|'reason'|'network'|'solvePath'>&{geometry:RiverEditingGeometry}{
  const all=map.regions.flatMap(r=>r.hexes),graph=buildRiverGraphForRegion(all,all,getCandidateHexes(all,getSeaHexKeys(map.hexTerrainByKey)));
  const edgeOwners=new Map<string,number[]>();
  for(const region of map.regions)for(const hex of region.hexes)for(const key of getHexEdgeKeys(hex)){
    const owners=edgeOwners.get(key)??[];if(!owners.includes(region.id))owners.push(region.id);edgeOwners.set(key,owners);
  }
  for(const owners of edgeOwners.values())owners.sort((a,b)=>a-b);
  const lakeByVertex=new Map<string,string>(),lakeHexes=new Map<string,Set<string>>();
  for(const lake of getLakesForRegions(map.regions,map.hexTerrainByKey)){
    const id=`lake:${lake.lakeId}`,keys=lakeHexes.get(id)??new Set<string>();
    for(const h of lake.hexes)keys.add(hexKey(h));lakeHexes.set(id,keys);
    for(const v of lake.vertices)lakeByVertex.set(v.key,id);
  }
  const geometry:RiverEditingGeometry={vertices:graph.nodes,edgeOwners,heights:new Map(map.regions.map(r=>[r.id,r.heightLevel])),lakeByVertex,
    lakeHexCount:new Map([...lakeHexes].map(([id,keys])=>[id,keys.size])),seaVertices:getSeaVertexKeysFromSeaKeys(getSeaHexKeys(map.hexTerrainByKey)),
    openVertices:new Set([...graph.nodes.values()].filter(v=>v.isCandidateBoundaryVertex).map(v=>v.key))};
  const network=(rivers:EditableRiver[])=>buildManualRiverNetwork(rivers,geometry);
  const blocked=new Set([...getSeaEdgeKeys(map.hexTerrainByKey),...(map.obstacles??[]).map(o=>o.edgeKey)]);
  const boundaries=getRegionBoundaryVertexKeys(map.regions);
  const confluence=(key:string,rivers:readonly EditableRiver[])=>{
    const main=rivers.filter(r=>r.deltaParentRiverId===undefined);
    let incoming=0,outgoing=0;
    for(const r of main)for(let i=1;i<r.vertexPath.length;i++){
      if(r.vertexPath[i].key===key)incoming++;if(r.vertexPath[i-1].key===key)outgoing++;
    }
    return incoming===2&&outgoing===1;
  };
  return {geometry,solvePath:(before,river,path,fixed)=>solveManualRiverPath(before,river,path,fixed,geometry),vertex:key=>geometry.vertices.get(key),edgeOwners:key=>edgeOwners.get(key)??[],blocked:key=>blocked.has(key),network,
    event:(key,rivers)=>lakeByVertex.has(key)||geometry.seaVertices.has(key)||confluence(key,rivers),
    reason:(key,start,endpoint,river)=>lakeByVertex.has(key)?'lake':confluence(key,[...map.rivers.filter(r=>r.id!==river.id),river])?'river_confluence':endpoint?(start?'river_start':'river_end'):boundaries.has(key)?'region_boundary':'split'};
}
class RiverFeatureConflict extends Error {
  constructor(readonly featureCode:string){super('Ручная отметка реки конфликтует с изменением. Снимите отметку или измените действие.');this.name='RiverFeatureConflict';}
}
function validateMapRiverFeatures(features:unknown,rivers:River[],regions:Region[],terrain:Map<string,HexTerrainData>,crossings:RiverCrossing[]):void{
  let eligibility:FeatureEligibility|undefined;
  const current=()=>eligibility??(eligibility=riverFeatureEligibility(rivers,regions,terrain,crossings));
  try {validateRiverFeatures(features,rivers,{rapid:(id,key)=>current().rapid(id,key),waterfall:key=>current().waterfall(key)});}
  catch(error){if(error instanceof Error&&['ineligible_rapid','ineligible_waterfall'].includes(error.message))throw new RiverFeatureConflict(error.message);throw error;}
}
function retainPoiNames(map:EditorObjectMap & {editorNames:EditorNames},current:EditorNames):EditorNames{
  const retained=Object.fromEntries(Object.entries(current).filter(([key])=>!key.startsWith('sea:')));
  const names={...(map.editorNames??{}),...retained};assertEditorNames({...map,editorNames:names});return names;
}
function knaveMapContext(map:Pick<MapSnapshot,'regions'|'hexTerrainByKey'|'waterPoiByKey'>):KnaveContext{
  const hexes=new Set([...map.regions.flatMap(r=>r.hexes.map(hexKey)),...map.hexTerrainByKey.keys()]);
  return {hexes,dryHexes:new Set([...hexes].filter(key=>waterKindAt(map.hexTerrainByKey,key)==='land')),pois:poiNameLocators(map)};
}
function checkedRiverMap<T extends MapSnapshot>(map:T):T{
  map=withLegacySeas(map);
  assertEditorNames(map);
  validateKnaveLayer(map.knave,knaveMapContext(map),10,map.regions.some(r=>r.generationMode==='mythic')?'mythic':'classic');
  validateRiverCounter(map.rivers,map.nextRiverId);
  validateMapRiverFeatures(map.riverFeatures,map.rivers,map.regions,map.hexTerrainByKey,map.crossings);
  return map;
}

type RiverEditOptions={crossingKinds?:Record<string,RiverCrossingKind>;featureEdits?:FeatureEdit[];confirmed?:boolean};
function deriveRapidKeys({rivers,crossings,regions,riverFeatures}:Pick<MapSnapshot,'rivers'|'crossings'|'regions'|'riverFeatures'>){
    const crossingEdgeKeys = new Set(crossings.map((crossing) => crossing.riverEdgeKey));
    const regionHeightById = new Map(regions.map((region) => [region.id, region.heightLevel]));
    const rapidEdgeKeys = new Set<string>();
    for (const river of rivers) {
      const fullnessByEdge = getRiverSectorFullnessByEdge(river);
      const assignedRegionByEdge = getRiverSectorAssignedRegionByEdge(river);
      const fallbackFullness = getRiverFallbackFullness(river);
      for (let index = 1; index < river.vertexPath.length; index += 1) {
        const riverEdgeKey = edgeKey(river.vertexPath[index - 1], river.vertexPath[index]);
        if (crossingEdgeKeys.has(riverEdgeKey)) continue;
        const fullness = fullnessByEdge.get(riverEdgeKey) ?? fallbackFullness;
        const heightLevel = regionHeightById.get(assignedRegionByEdge.get(riverEdgeKey) ?? river.regionId) ?? 1;
        const override=riverFeatures.rapids.find(e=>e.riverId===river.id&&e.edgeKey===riverEdgeKey)?.state;
        if (override==='on'||override!=='off'&&hasRiverRapids({ fullness, heightLevel }, () => getStableRandomValue(`${river.id}:${riverEdgeKey}`))) {
          rapidEdgeKeys.add(riverEdgeKey);
        }
      }
    }
    return rapidEdgeKeys;
}
function deriveWaterfalls({rivers,regions,riverFeatures}:Pick<MapSnapshot,'rivers'|'regions'|'riverFeatures'>,positionedHexes:{hexes:AxialHex[]},lakeVertices:ReturnType<typeof getLakeVertices>){
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];

    const minBaseX = Math.min(...all.map((hex) => toPixel(hex.q, hex.r).x));
    const minBaseY = Math.min(...all.map((hex) => toPixel(hex.q, hex.r).y));
    const offsetX = (HEX_SIZE * SQRT3) / 2 - minBaseX;
    const offsetY = HEX_SIZE - minBaseY;
    const regionHeightById = new Map(regions.map((region) => [region.id, region.heightLevel]));
    const lakeVertexKeys = new Set(lakeVertices.map((vertex) => vertex.key));
    const confluenceVertexKeys = new Set(getRiverConfluences(rivers).map((confluence) => confluence.vertexKey));
    const riverStartVertexKeys = new Set(rivers.flatMap((river) => river.vertexPath[0] ? [river.vertexPath[0].key] : []));
    const waterfallsByVertexKey = new Map<string, { key: string; vertexKey: string; x: number; y: number }>();

    for (const river of rivers) {
      const fullnessByEdge = getRiverSectorFullnessByEdge(river);
      const fallbackFullness = getRiverFallbackFullness(river);
      const assignedRegionByEdge = getRiverSectorAssignedRegionByEdge(river);
      for (let index = 0; index < river.vertexPath.length; index += 1) {
        const vertex = river.vertexPath[index];
        if (waterfallsByVertexKey.has(vertex.key)) continue;

        const adjacentEdgeKeys = [
          index > 0 ? edgeKey(river.vertexPath[index - 1], vertex) : undefined,
          index < river.vertexPath.length - 1 ? edgeKey(vertex, river.vertexPath[index + 1]) : undefined
        ].filter((edge): edge is string => edge !== undefined);
        const heightLevel = Math.max(...adjacentEdgeKeys.map((edge) =>
          regionHeightById.get(assignedRegionByEdge.get(edge) ?? river.regionId) ?? 1
        )) as RegionHeightLevel;
        const fullness = Math.max(...adjacentEdgeKeys.map((edge) =>
          fullnessByEdge.get(edge) ?? fallbackFullness
        )) as RiverFullness;

        const override=riverFeatures.waterfalls.find(e=>e.vertexKey===vertex.key)?.state;
        if (override==='off'||override!=='on'&&!hasRiverWaterfall({
          fullness,
          heightLevel,
          isRiverStart: riverStartVertexKeys.has(vertex.key),
          isConfluence: confluenceVertexKeys.has(vertex.key),
          touchesLake: lakeVertexKeys.has(vertex.key)
        }, () => getStableRandomValue(`waterfall:${vertex.key}`))) continue;

        waterfallsByVertexKey.set(vertex.key, {
          key: `river-waterfall-${vertex.key}`,
          vertexKey: vertex.key,
          x: vertex.x + offsetX,
          y: vertex.y + offsetY
        });
      }
    }

    return Array.from(waterfallsByVertexKey.values());
}
function regionMarkKeys(map:MapSnapshot){
  const all=map.regions.flatMap(r=>r.hexes),hidden=new Set([...getLakeEdgeKeys(all,map.hexTerrainByKey),...getSeaEdgeKeys(map.hexTerrainByKey)]);
  return {rapids:new Set([...deriveRapidKeys(map)].filter(key=>!hidden.has(key))),
    waterfalls:new Set(deriveWaterfalls(map,{hexes:all},getLakeVertices(all,map.hexTerrainByKey)).map(v=>v.vertexKey))};
}
/** Authored labels use the same physical identities and visibility as the map.
 * Composite suffixes are opaque: in particular Crossing.key is never split. */
type EditorObjectMap=Pick<MapSnapshot,'regions'|'rivers'|'roads'|'crossings'|'obstacles'|'hexTerrainByKey'|'waterPoiByKey'|'riverFeatures'>&{seas?:SeaRecord[]};
type EditorObject={key:string;type:'sea'|'road'|'obstacle'|'crossing'|'rapid'|'waterfall';hex?:AxialHex;riverId?:number;edgeKey?:string;vertexKey?:string;roadId?:number;segmentKey?:string};
function editorObjects(map:EditorObjectMap):EditorObject[]{
  const objects:EditorObject[]=[],hexes=map.regions.flatMap(r=>r.hexes);
  const hexByEdge=new Map<string,AxialHex>(),hexByVertex=new Map<string,AxialHex>();
  for(const h of hexes){for(const edge of getHexEdgeKeys(h))if(!hexByEdge.has(edge))hexByEdge.set(edge,h);for(const vertex of getHexCornerPoints(h))if(!hexByVertex.has(vertex.key))hexByVertex.set(vertex.key,h);}
  const edgeHex=(key:string)=>hexByEdge.get(key);
  const unique=<T,>(items:T[],key:(item:T)=>string)=>{const counts=new Map<string,number>();for(const item of items)counts.set(key(item),(counts.get(key(item))??0)+1);return items.filter(item=>counts.get(key(item))===1);};
  for(const sea of map.seas??[])objects.push({key:`sea:${sea.id}`,type:'sea',hex:parseHexKey([...sea.hexKeys].sort(compareWaterHexes)[0])});
  for(const road of unique(map.roads,r=>String(r.id)))if(road.segments.length)objects.push({key:`road:${road.id}`,type:'road',hex:road.segments[0].from,roadId:road.id,segmentKey:normalizeRoadSegmentKey(road.segments[0].from,road.segments[0].to)});
  for(const o of unique(map.obstacles??[],o=>String(o.id)))objects.push({key:`obstacle:${o.id}`,type:'obstacle',hex:o.hex});
  for(const c of unique(map.crossings,c=>c.key))objects.push({key:`crossing:${c.key}`,type:'crossing',hex:edgeHex(c.riverEdgeKey),roadId:c.roadId,segmentKey:c.roadSegmentKey});
  const hidden=new Set([...getLakeEdgeKeys(hexes,map.hexTerrainByKey),...getSeaEdgeKeys(map.hexTerrainByKey)]);
  for(const river of unique(map.rivers,r=>String(r.id)))for(const edge of deriveRapidKeys({...map,rivers:[river]}))if(!hidden.has(edge))objects.push({key:`rapid:${river.id}:${edge}`,type:'rapid',hex:edgeHex(edge),riverId:river.id,edgeKey:edge});
  // deriveWaterfalls deduplicates a shared physical vertex across all rivers.
  for(const waterfall of deriveWaterfalls(map,{hexes},getLakeVertices(hexes,map.hexTerrainByKey))){
    const river=map.rivers.find(r=>r.vertexPath.some(v=>v.key===waterfall.vertexKey));
    objects.push({key:`waterfall:${waterfall.vertexKey}`,type:'waterfall',hex:hexByVertex.get(waterfall.vertexKey),riverId:river?.id,vertexKey:waterfall.vertexKey});
  }
  return objects;
}
function editorNameLocators(map:EditorObjectMap):Set<string>{return new Set([...poiNameLocators(map),...editorObjects(map).map(o=>o.key)]);}
class AuthoredNameConflict extends Error{
  constructor(readonly key:string,readonly pair:{ru:string;en:string}){super(`authored_name_loss:${key}`);this.name='AuthoredNameConflict';}
}
function assertEditorNames(map:EditorObjectMap & {editorNames?:EditorNames}):void{
  const names=map.editorNames===undefined?{}:map.editorNames;
  if(!Object.keys(names).length){assertPoiEditorNames(names,new Set());return;}
  const live=editorNameLocators(map);
  for(const [key,pair]of Object.entries(names))if(!live.has(key))throw new AuthoredNameConflict(key,pair);
  assertPoiEditorNames(names,live);
}
function authoredNameError(error:unknown,language:Language):string|undefined{
  if(!(error instanceof AuthoredNameConflict))return;
  const label=error.pair[language]||error.pair.ru||error.pair.en;
  return language==='ru'?`Изменение удалит авторское имя «${label}». Сначала очистите его явно. Карта не изменена.`:`The edit would remove the authored name “${label}”. Clear it explicitly first. Your map is unchanged.`;
}
/** E7 prepares a complete candidate without history, RNG, reconciliation or live
 * setters. All authored dependency records survive literally or the edit fails. */
function prepareRegionMapEdit(map:MapSnapshot,edit:RegionEdit):MapSnapshot{
  const geometry=prepareRegionGeometry(map,edit,{
    biome:id=>{
      if(!Object.prototype.hasOwnProperty.call(BIOMES,id))return undefined;
      const biome=BIOMES[id as BiomeId];
      return {heightLevel:biome.heightLevel,biomeId:biome.id,biomeLabel:biome.label,biomePrimaryEmoji:biome.primaryEmoji,
        biomeSecondaryEmojis:[...biome.secondaryEmojis],biomeEmojiLabel:biome.primaryEmoji+biome.secondaryEmojis.join('')};
    },
    compatible:(a,b)=>a===b||isBiomesCompatible(a as BiomeId,b as BiomeId,BIOME_COMPATIBILITY_MATRIX),
    size:getRegionSizeCategory,
    inKingdomArea:(id,h)=>{const kingdom=map.kingdoms?.find(k=>k.id===id);return !!kingdom&&kingdomKeys(kingdom.origin).has(hexKey(h));}
  });
  if(geometry.regions===map.regions)return map;
  checkedRiverMap(map);
  let candidate:MapSnapshot={...map,regions:geometry.regions};
  if(geometry.poiTransfer){
    const identity=prepareRegionPoiIdentity(map.toponyms,map.tags??emptyTags(),geometry.poiTransfer);
    const transfer=geometry.poiTransfer,from=`poi:${transfer.fromRegionId}:${transfer.hexKey}`,to=`poi:${transfer.toRegionId}:${transfer.hexKey}`;
    const authored=map.editorNames??{};
    if(Object.prototype.hasOwnProperty.call(authored,to))throw new RegionEditError('identity_conflict',to);
    const editorNames=Object.fromEntries(Object.entries(authored).map(([key,v])=>[key===from?to:key,v]));
    candidate={...candidate,...identity,editorNames};
    if(map.knave)candidate.knave=remapKnavePois(map.knave,knaveMapContext(map),knaveMapContext(candidate),new Map([[from,to]]));
  }
  // A road keeps its origin regionId even when a cell underneath it changes
  // owner. Size changes cannot silently invent another road or waive a minimum.
  for(const next of candidate.regions){
    const prior=map.regions.find(r=>r.id===next.id)!;
    const minimum=(r:Region)=>r.biomeLandType==='settled'&&!r.isTract?getSettledMainRoadLimit(r):0;
    const count=map.roads.filter(r=>r.regionId===next.id&&r.segments.some(s=>s.kind==='road')).length;
    if(count<minimum(next)&&(minimum(next)!==minimum(prior)||next.sizeCategory!==prior.sizeCategory))
      throw new RegionEditError('road_minimum',String(next.id),String(count),String(minimum(next)));
  }
  const before=buildManualRiverGeometryContext(map),after=buildManualRiverGeometryContext(candidate);
  const transfer=edit.type==='transfer_hex'?edit:undefined;
  const support=(r:River,ctx:ReturnType<typeof buildManualRiverGeometryContext>)=>JSON.stringify(r.vertexPath.map((v,i)=>{
    const key=i?edgeKey(r.vertexPath[i-1],v):undefined;
    const owner=key?r.sectors.find(s=>s.edgeKeys.includes(key))?.assignedRegionId??r.regionId:undefined;
    return [v.key,key?ctx.edgeOwners(key):null,owner===undefined?null:ctx.geometry.heights.get(owner),ctx.geometry.lakeByVertex.get(v.key),
      ctx.geometry.seaVertices.has(v.key),ctx.geometry.openVertices.has(v.key),ctx.reason?.(v.key,i===0,i===0||i===r.vertexPath.length-1,r)];
  }));
  const affected=map.rivers.filter(r=>support(r,before)!==support(r,after));
  const rivers=map.rivers.map(r=>{
    if(!affected.includes(r))return r;
    try{return rebuildRiverRegionSectors(r,before,after,transfer) as River;}
    catch{throw new RegionEditError('river_owner',`river:${r.id}`);}
  });
  const verifyRiverRule=(verify:()=>void)=>{
    try{verify();}catch(error){
      if(error instanceof RegionEditError)throw error;
      const reason=error instanceof Error?error.message:'';
      if(reason.startsWith('region_river_uphill:')){
        const contact=JSON.parse(reason.slice('region_river_uphill:'.length));
        const riverIds=rivers.filter(r=>r.sectors.some(s=>s.edgeKeys.includes(contact[1])||s.edgeKeys.includes(contact[5]))).map(r=>`river:${r.id}`);
        throw new RegionEditError('region_river_uphill',`region:${contact[2]}`,String(contact[3]),`region:${contact[6]}`,String(contact[7]),...riverIds);
      }
      throw new RegionEditError('river_rule',...affected.map(r=>`river:${r.id}`),reason.split(':').slice(0,2).join(':'));
    }
  };
  verifyRiverRule(()=>validateEditedRiverNetwork(map.rivers,rivers,after,before));
  // Arms participate in directed elevation contacts, while ordinary numeric RIV
  // validation above still keeps BR-009 separate from a 2→1 confluence.
  const heightNetwork=(values:River[],ctx:typeof before)=>buildManualRiverNetwork(values.map(r=>({...r,deltaParentRiverId:undefined})),ctx.geometry).network;
  verifyRiverRule(()=>validateRegionRiverHeights(heightNetwork(map.rivers,before),heightNetwork(rivers,after)));
  verifyRiverRule(()=>validateEditedRiverDeltas(map.rivers,rivers,after.geometry,before.geometry));
  const reentry=getNewRiverLakeReentryViolation(rivers,candidate.regions,candidate.hexTerrainByKey,map.rivers,map.regions,map.hexTerrainByKey);
  if(reentry)throw new RegionEditError('river_reentry',String(reentry.riverId),String(reentry.lakeId));
  candidate={...candidate,rivers};
  // These validators inspect the same unchanged crossing/marker intentions;
  // there is no automatic clearing, route repair or dependency deletion in E7.
  let crossings=map.crossings;
  verifyRiverRule(()=>{crossings=prepareEditedRiverCrossings(map.rivers,rivers,map.roads,map.crossings,(a,b)=>getSharedHexEdgeVertexKeys(a,b)?.sort().join('|'));});
  if(crossings!==map.crossings)throw new RegionEditError('crossing_conflict');
  const eligibility=riverFeatureEligibility(rivers,candidate.regions,candidate.hexTerrainByKey,map.crossings);
  const rapid=map.riverFeatures.rapids.find(e=>e.state==='on'&&!eligibility.rapid(e.riverId,e.edgeKey));
  if(rapid)throw new RegionEditError('river_marker',`river:${rapid.riverId}`,rapid.edgeKey);
  const waterfall=map.riverFeatures.waterfalls.find(e=>e.state==='on'&&!eligibility.waterfall(e.vertexKey));
  if(waterfall)throw new RegionEditError('river_marker',waterfall.vertexKey);
  checkedRiverMap(candidate);
  validateTags(candidate.tags??emptyTags(),new Set(tagOwners(candidate).keys()),mythicDefinitions);
  return candidate;
}
/** Complete detached map preparation; history/names/tags are prepared by the
 * existing document transaction only after the UI has confirmed any losses. */
function prepareRiverMapEdit(map:MapSnapshot,edit:RiverEdit,options:RiverEditOptions={},preview=false){
  checkedRiverMap(map);
  const physical=buildManualRiverGeometryContext(map),input={rivers:map.rivers,riverFeatures:map.riverFeatures,nextRiverId:map.nextRiverId};
  const result=prepareRiverEdit(input,edit,{...physical,...riverFeatureEligibility(map.rivers,map.regions,map.hexTerrainByKey,map.crossings),
    additionalValidation:(before,after)=>{
      validateEditedRiverDeltas(before,after,physical.geometry);
      const violation=getNewRiverLakeReentryViolation(after,map.regions,map.hexTerrainByKey,before,map.regions,map.hexTerrainByKey);
      if(violation)throw new Error('river_lake_reentry');
    }});
  // A preview may stage a safe candidate, but never supplies an implicit answer
  // to the user's ford/marker choices. The ordinary writer remains strict.
  const deepFords=map.crossings.filter(c=>c.kind==='ford'&&result.rivers.some(r=>r.id===c.riverId&&r.vertexPath.slice(1).some((v,i)=>edgeKey(r.vertexPath[i],v)===c.riverEdgeKey)&&Number(knownRiverEdgeFullness(r,c.riverEdgeKey))>=3&&knownRiverEdgeFullness(r,c.riverEdgeKey)!==knownRiverEdgeFullness(map.rivers.find(old=>old.id===r.id)!,c.riverEdgeKey)));
  const unresolvedCrossings=deepFords.filter(c=>!options.crossingKinds?.[c.key]);
  const crossingKinds=preview?{...Object.fromEntries(unresolvedCrossings.map(c=>[c.key,'bridge' as const])),...options.crossingKinds}:options.crossingKinds;
  const crossings=prepareEditedRiverCrossings(map.rivers,result.rivers,map.roads,map.crossings,(a,b)=>getSharedHexEdgeVertexKeys(a,b)?.sort().join('|'),crossingKinds);
  const eligibility=riverFeatureEligibility(result.rivers,map.regions,map.hexTerrainByKey,crossings);
  const invalidFeatures:FeatureEdit[]=[...result.riverFeatures.rapids.filter(e=>e.state==='on'&&!eligibility.rapid(e.riverId,e.edgeKey)).map(e=>({type:'rapid' as const,...e})),...result.riverFeatures.waterfalls.filter(e=>e.state==='on'&&!eligibility.waterfall(e.vertexKey)).map(e=>({type:'waterfall' as const,...e}))];
  const sameFeature=(a:FeatureEdit,b:FeatureEdit)=>a.type===b.type&&(a.type==='rapid'&&b.type==='rapid'?a.riverId===b.riverId&&a.edgeKey===b.edgeKey:a.type==='waterfall'&&b.type==='waterfall'&&a.vertexKey===b.vertexKey);
  const unresolvedFeatures=invalidFeatures.filter(e=>!options.featureEdits?.some(choice=>sameFeature(e,choice)&&choice.state!=='on'));
  const featureEdits=preview?[...unresolvedFeatures.map(e=>({...e,state:'auto' as const})),...options.featureEdits??[]]:options.featureEdits??[];
  const riverFeatures=resolveRiverFeatureEdits(result.riverFeatures,featureEdits,result.rivers,eligibility);
  const removedRiverIds=map.rivers.filter(r=>!result.rivers.some(n=>n.id===r.id)).map(r=>r.id);
  const losses={crossings:map.crossings.filter(c=>!crossings.some(n=>n.key===c.key)).length,rapids:map.riverFeatures.rapids.length-result.riverFeatures.rapids.length,waterfalls:map.riverFeatures.waterfalls.length-result.riverFeatures.waterfalls.length,removedRiverIds};
  const changed=result.rivers!==map.rivers||crossings!==map.crossings||riverFeatures!==map.riverFeatures||result.nextRiverId!==map.nextRiverId;
  return {map:changed?checkedRiverMap({...map,...result,crossings,riverFeatures}):map,losses,unresolvedCrossings,unresolvedFeatures,confirmationRequired:changed&&(edit.type==='remove'||edit.type==='reverse'||edit.type==='replace'||crossings!==map.crossings||losses.rapids>0||losses.waterfalls>0||invalidFeatures.length>0)};
}

type WaterEditOptions=SeaChoices&{acceptedLosses?:string[];featureEdits?:FeatureEdit[];crossingKinds?:Record<string,RiverCrossingKind>};
type WaterLoss={id:string;type:'lake'|'poi'|'name'|'tag'|'waterPoi'|'crossing'|'obstacle'|'knave';key:string;value:unknown};
/** Full E6 detached preparation. Staged preview answers never reach a setter. */
function prepareWaterMapEdit(map:MapSnapshot,edit:WaterEdit,options:WaterEditOptions={}){
  const geometry=prepareWaterGeometry(map,edit);
  const empty={map,geometry,sea:{choices:[],unresolved:[]} as Pick<ReturnType<typeof prepareSeaIdentity>,'choices'|'unresolved'>,losses:[] as WaterLoss[],unresolvedLosses:[] as WaterLoss[],unresolvedFeatures:[] as FeatureEdit[],unresolvedCrossings:[] as RiverCrossing[],newCrossings:[] as RiverCrossing[],invalidFeatures:[] as FeatureEdit[],confirmationRequired:false};
  if(geometry.hexTerrainByKey===map.hexTerrainByKey)return empty;
  map=checkedRiverMap(map);
  const beforeContext=buildManualRiverGeometryContext(map);
  let candidate:MapSnapshot={...map,regions:geometry.regions,hexTerrainByKey:geometry.hexTerrainByKey,nextLakeId:geometry.nextLakeId};
  const affectedKeys=new Set(geometry.changedHexKeys),losses:WaterLoss[]=[];
  const formerOwner=new Map(map.regions.flatMap(r=>r.hexes.map(h=>[hexKey(h),r.id] as const)));
  const nextOwner=new Map(candidate.regions.flatMap(r=>r.hexes.map(h=>[hexKey(h),r] as const)));
  for(const region of candidate.regions)for(const h of region.hexes)if(!formerOwner.has(hexKey(h))){
    for(const adjacent of getHexNeighbors(h)){const other=nextOwner.get(hexKey(adjacent));
      if(other&&other.id!==region.id&&region.biomeId!==other.biomeId&&!isBiomesCompatible(region.biomeId,other.biomeId,BIOME_COMPATIBILITY_MATRIX))throw new WaterEditError('biome_boundary',String(region.id),String(other.id),hexKey(h));
    }
  }

  const wet=(m:MapSnapshot,h:AxialHex)=>waterKindAt(m.hexTerrainByKey,hexKey(h))!=='land';
  const owner=(m:MapSnapshot,key:string)=>m.regions.find(r=>r.hexes.some(h=>hexKey(h)===key));
  const known=(m:MapSnapshot,key:string)=>!!owner(m,key)||m.hexTerrainByKey.has(key);
  const destination=(m:MapSnapshot,key:string)=>m.regions.some(r=>(!r.isTract&&!r.suppressCentralPoi&&hexKey(r.centerHex)===key)||r.pointsOfInterest.some(h=>hexKey(h)===key));
  const open=(m:MapSnapshot,h:AxialHex)=>!wet(m,h)&&getHexNeighbors(h).some(n=>!known(m,hexKey(n)));
  const removedPoi=new Set<string>(),waterPoiByKey=new Map(map.waterPoiByKey);
  for(const r of map.regions)for(const h of r.pointsOfInterest){const key=hexKey(h);if(affectedKeys.has(key)&&!wet(map,h)&&wet(candidate,h)){
    const entity=`poi:${r.id}:${key}`;removedPoi.add(entity);losses.push({id:entity,type:'poi',key,value:{regionId:r.id,kind:r.pointOfInterestKinds?.[key]}});
  }}
  for(const [key,kind]of map.waterPoiByKey){
    const target=waterKindAt(candidate.hexTerrainByKey,key),before=waterKindAt(map.hexTerrainByKey,key);
    if(target===before)continue;
    const region=owner(candidate,key),allowed=target==='sea'?getWaterPoiKindPool('sea'):target==='lake'?getWaterPoiKindPool(region?.biomeLandType??'wild'):[];
    if(!allowed.includes(kind)){losses.push({id:`waterPoi:${key}`,type:'waterPoi',key,value:kind});waterPoiByKey.delete(key);}
  }
  candidate={...candidate,waterPoiByKey,regions:candidate.regions.map(r=>{
    const points=r.pointsOfInterest.filter(h=>!removedPoi.has(`poi:${r.id}:${hexKey(h)}`));if(points.length===r.pointsOfInterest.length)return r;
    const kinds={...r.pointOfInterestKinds};for(const h of r.pointsOfInterest)if(removedPoi.has(`poi:${r.id}:${hexKey(h)}`))delete kinds[hexKey(h)];
    return {...r,pointsOfInterest:points,pointOfInterestKinds:Object.keys(kinds).length?kinds:undefined};
  })};
  const roadDegree=new Map<string,number>();for(const road of map.roads)for(const s of road.segments)for(const h of[s.from,s.to])roadDegree.set(hexKey(h),(roadDegree.get(hexKey(h))??0)+1);
  for(const road of map.roads)for(const s of road.segments){
    for(const h of[s.from,s.to])if(!wet(map,h)&&wet(candidate,h))throw new WaterEditError('road_water',String(road.id),hexKey(h));
    for(const h of[s.from,s.to])if(roadDegree.get(hexKey(h))===1){
      const wasValid=destination(map,hexKey(h))||open(map,h),isValid=destination(candidate,hexKey(h))||open(candidate,h);
      if(!isValid&&(wasValid||wet(map,h)!==wet(candidate,h)))throw new WaterEditError('road_end',String(road.id),hexKey(h));
    }
  }
  const obstacles=(map.obstacles??[]).filter(o=>{
    if((!wet(map,o.hex)&&wet(candidate,o.hex))||(!wet(map,o.neighborHex)&&wet(candidate,o.neighborHex))){losses.push({id:`obstacle:${o.id}`,type:'obstacle',key:o.edgeKey,value:o});return false;}return true;
  });
  candidate={...candidate,obstacles,candidateHexes:getCandidateHexes(candidate.regions.flatMap(r=>r.hexes),getSeaHexKeys(candidate.hexTerrainByKey))};
  const afterContext=buildManualRiverGeometryContext(candidate);
  const support=(r:River,ctx:ReturnType<typeof buildManualRiverGeometryContext>)=>JSON.stringify(r.vertexPath.map((v,i)=>[v.key,ctx.geometry.lakeByVertex.get(v.key),ctx.geometry.lakeHexCount.get(ctx.geometry.lakeByVertex.get(v.key)??''),ctx.geometry.seaVertices.has(v.key),ctx.geometry.openVertices.has(v.key),ctx.reason?.(v.key,i===0,i===0||i===r.vertexPath.length-1,r)]));
  const rivers=map.rivers.map(r=>{
    if(support(r,beforeContext)===support(r,afterContext))return r;
    try{return rebuildRiverWaterSectors(r,afterContext) as River;}catch{throw new WaterEditError('river_unverified',String(r.id));}
  });
  try{
    validateEditedRiverNetwork(map.rivers,rivers,afterContext,beforeContext);
    validateEditedRiverDeltas(map.rivers,rivers,afterContext.geometry,beforeContext.geometry);
    const reentry=getNewRiverLakeReentryViolation(rivers,candidate.regions,candidate.hexTerrainByKey,map.rivers,map.regions,map.hexTerrainByKey);
    if(reentry)throw new WaterEditError('river_reentry',String(reentry.riverId),String(reentry.lakeId));
  }catch(error){
    if(error instanceof WaterEditError)throw error;
    const reason=error instanceof Error?error.message:String(error);
    const involved=map.rivers.filter(r=>r.vertexPath.some(v=>beforeContext.geometry.lakeByVertex.get(v.key)!==afterContext.geometry.lakeByVertex.get(v.key)||beforeContext.geometry.lakeHexCount.get(beforeContext.geometry.lakeByVertex.get(v.key)??'')!==afterContext.geometry.lakeHexCount.get(afterContext.geometry.lakeByVertex.get(v.key)??'')||beforeContext.geometry.seaVertices.has(v.key)!==afterContext.geometry.seaVertices.has(v.key)||beforeContext.geometry.openVertices.has(v.key)!==afterContext.geometry.openVertices.has(v.key)));
    const network=afterContext.network(rivers).network;
    const lakeNeeds=network.nodes.filter(n=>n.kind==='lake').map(n=>{const inputs=network.edges.filter(e=>e.to===n.id).map(e=>e.fullness!),outputs=network.edges.filter(e=>e.from===n.id).map(e=>e.fullness!);return {id:n.id,area:n.lakeHexCount??0,minimum:minimumLakeHexes(inputs,outputs),inputs,outputs};}).filter(n=>n.minimum!==null&&n.area<n.minimum);
    throw new WaterEditError('river_rule',reason,JSON.stringify({rivers:involved.map(r=>r.id),lakes:lakeNeeds}));
  }
  candidate={...candidate,rivers};
  const hidden=(m:MapSnapshot)=>new Set([...getLakeEdgeKeys(m.regions.flatMap(r=>r.hexes),m.hexTerrainByKey),...getSeaEdgeKeys(m.hexTerrainByKey)]),oldHidden=hidden(map),newHidden=hidden(candidate);
  const crossings=map.crossings.filter(c=>{
    if(newHidden.has(c.riverEdgeKey)&&!oldHidden.has(c.riverEdgeKey)){losses.push({id:`crossing:${c.key}`,type:'crossing',key:c.key,value:c});return false;}return true;
  });
  const unresolvedCrossings:RiverCrossing[]=[],newCrossings:RiverCrossing[]=[];
  for(const road of candidate.roads)for(const segment of road.segments){
    if(wet(candidate,segment.from)||wet(candidate,segment.to))continue;
    const vertices=getSharedHexEdgeVertexKeys(segment.from,segment.to),edge=vertices?.sort().join('|');if(!edge||newHidden.has(edge)||!oldHidden.has(edge))continue;
    const pair=normalizeRoadSegmentKey(segment.from,segment.to);
    for(const river of rivers.filter(r=>r.vertexPath.slice(1).some((v,i)=>edgeKey(r.vertexPath[i],v)===edge))){
      const key=getRiverCrossingKey(road.id,pair,river.id);if(crossings.some(c=>c.key===key))continue;
      const selected=options.crossingKinds?.[key],f=knownRiverEdgeFullness(river,edge);
      if(selected&&(!['bridge','ferry','ford'].includes(selected)||selected==='ford'&&(f===undefined||f>=3)))throw new WaterEditError('crossing_kind',key);
      const crossing:RiverCrossing={key,roadId:road.id,roadSegmentKey:pair,riverId:river.id,riverEdgeKey:edge,kind:selected??'bridge'};
      if(!selected)unresolvedCrossings.push(crossing);newCrossings.push(crossing);crossings.push(crossing);
    }
  }
  if(Object.keys(options.crossingKinds??{}).some(key=>!newCrossings.some(c=>c.key===key)))throw new WaterEditError('crossing_kind');
  const eligibility=riverFeatureEligibility(rivers,candidate.regions,candidate.hexTerrainByKey,crossings);
  const invalid:FeatureEdit[]=[...map.riverFeatures.rapids.filter(e=>e.state==='on'&&!eligibility.rapid(e.riverId,e.edgeKey)).map(e=>({type:'rapid' as const,...e})),...map.riverFeatures.waterfalls.filter(e=>e.state==='on'&&!eligibility.waterfall(e.vertexKey)).map(e=>({type:'waterfall' as const,...e}))];
  const same=(a:FeatureEdit,b:FeatureEdit)=>a.type===b.type&&(a.type==='rapid'&&b.type==='rapid'?a.riverId===b.riverId&&a.edgeKey===b.edgeKey:a.type==='waterfall'&&b.type==='waterfall'&&a.vertexKey===b.vertexKey);
  if(options.featureEdits?.some(e=>e.state==='on'||!invalid.some(f=>same(e,f))))throw new WaterEditError('feature_choice');
  const unresolvedFeatures=invalid.filter(e=>!options.featureEdits?.some(v=>same(e,v)&&v.state!=='on'));
  const riverFeatures=resolveRiverFeatureEdits(map.riverFeatures,[...unresolvedFeatures.map(e=>({...e,state:'auto' as const})),...options.featureEdits??[]],rivers,eligibility);
  candidate={...candidate,crossings,riverFeatures};
  const removedOwners=new Set([...geometry.removedLakeIds.map(id=>`lake:${id}`),...removedPoi]);
  for(const id of geometry.removedLakeIds)losses.push({id:`lake:${id}`,type:'lake',key:`lake:${id}`,value:id});
  const oldNames=map.toponyms,removedNames=new Set([...geometry.removedLakeIds.map(id=>`lake:${id}`),...Array.from(removedPoi,key=>`settlement:${key.slice(4)}`)]);
  const retainedNames=Object.fromEntries(Object.entries(oldNames).filter(([key])=>!removedNames.has(key)));
  const newEntities=getToponymEntities(candidate.regions,rivers,candidate.hexTerrainByKey).filter(e=>!retainedNames[e.key]);
  const names=newEntities.length?synchronizeToponyms(retainedNames,[...Object.entries(retainedNames).map(([key,t])=>({key,kind:t.kind})),...newEntities],map.toponymSeed):retainedNames;
  for(const [key,name]of Object.entries(retainedNames))if(JSON.stringify(names[key])!==JSON.stringify(name))throw new WaterEditError('name_conflict',key);
  for(const [key,name]of Object.entries(oldNames))if(removedNames.has(key))losses.push({id:`name:${key}`,type:'name',key,value:name});
  // No global MB reconciliation: preserved owners keep exact dice and counters.
  const oldTags=map.tags??emptyTags(),instances=oldTags.instances.filter(i=>!removedOwners.has(ownerKey(i.owner)));
  const removedTags=oldTags.instances.filter(i=>removedOwners.has(ownerKey(i.owner)));
  for(const tag of removedTags)losses.push({id:`tag:${tagKey(tag.owner,tag.definitionId)}`,type:'tag',key:ownerKey(tag.owner),value:tag});
  const prefixes=removedTags.map(i=>tagKey(i.owner,i.definitionId)+'|');
  const tags=removedTags.length?{...oldTags,instances,rollCounters:Object.fromEntries(Object.entries(oldTags.rollCounters).filter(([key])=>!prefixes.some(p=>key.startsWith(p))))}:oldTags;
  validateTags(tags,new Set(tagOwners(candidate).keys()),mythicDefinitions);
  const sea=prepareSeaIdentity(map,candidate.hexTerrainByKey,options);
  candidate={...candidate,seas:sea.seas,nextSeaId:sea.nextSeaId};
  const livePoi=editorNameLocators(candidate),authored:EditorNames={};
  for(const [key,name]of Object.entries(map.editorNames??{})){if(livePoi.has(key))authored[key]=name;else {const seaId=key.startsWith('sea:')?Number(key.slice(4)):undefined;const old=seaId===undefined?undefined:map.seas.find(s=>s.id===seaId);const into=old?sea.seas.filter(s=>s.hexKeys.some(k=>old.hexKeys.includes(k))).map(s=>s.id):undefined;losses.push({id:`editorName:${key}`,type:'name',key,value:into?{...name,seaInto:into}:name});}}
  if(map.knave){
    const removed=knaveLosses(map.knave,knaveMapContext(candidate));
    const layer=structuredClone(map.knave);
    for(const loss of removed){losses.push({id:`knave:${loss.kind}:${loss.key}`,type:'knave',key:loss.key,value:{kind:loss.kind,data:knaveLossValue(layer,loss)}});dropKnaveLoss(layer,loss);}
    candidate={...candidate,knave:layer};
  }
  candidate=checkedRiverMap({...candidate,editorNames:authored,toponyms:names,tags});assertGeneratedIds(candidate);
  const unresolvedLosses=losses.filter(loss=>!options.acceptedLosses?.includes(loss.id));
  return {map:candidate,geometry,sea,losses,unresolvedLosses,unresolvedFeatures,unresolvedCrossings,newCrossings,invalidFeatures:invalid,confirmationRequired:losses.length>0||sea.choices.length>0||geometry.choices.length>0||invalid.length>0||newCrossings.length>0};
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
  clone.querySelectorAll('[data-editor-only]').forEach(node => node.remove());
  const viewBox = clone.viewBox.baseVal;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(viewBox.width));
  clone.setAttribute('height', String(viewBox.height));
  clone.style.width = '';
  clone.style.height = '';
  clone.style.transform = '';
  clone.style.willChange = '';

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
  const cache = new Map<string, Promise<string>>();
  const images = Array.from(svg.querySelectorAll('image'));

  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute('href') ?? image.getAttribute('xlink:href');
    if (!href || href.startsWith('data:')) return;

    const absoluteHref = new URL(href, window.location.href).toString();
    let pendingDataUrl = cache.get(absoluteHref);
    if (!pendingDataUrl) {
      pendingDataUrl = fetch(absoluteHref).then(async (response) => {
        if (!response.ok) throw new Error(`Не удалось загрузить изображение для PNG-экспорта: ${href}`);
        return blobToDataUrl(await response.blob());
      });
      cache.set(absoluteHref, pendingDataUrl);
    }

    const dataUrl = await pendingDataUrl;
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

function randomInt(min: number, max: number, rng: RandomStreams = fallbackRandomStreams): number {
  const lower = Math.ceil(min);
  const upper = Math.floor(max);
  return Math.floor(rng.geography() * (upper - lower + 1)) + lower;
}

function shuffleArray<T>(values: T[], rng: RandomStreams = fallbackRandomStreams): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i, rng);
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

// A stable pseudo-random roll lets a rapid remain in the same place after any
// re-render, export, or save/load cycle without adding mutable map state.
function getStableRandomValue(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x100000000;
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
  hexRadius: number,
  spacing = 1
): Array<{ emoji: string; x: number; y: number; fontSize: number }> {
  const visibleEmojis = emojis.slice(0, 4);

  if (visibleEmojis.length === 0) return [];

  if (visibleEmojis.length === 1) {
    return [{ emoji: visibleEmojis[0], x: centerX, y: centerY, fontSize: clamp(hexRadius * 0.55, 16, 28) }];
  }

  if (visibleEmojis.length === 2) {
    const fontSize = clamp(hexRadius * 0.42, 14, 22);
    return [
      { emoji: visibleEmojis[0], x: centerX - hexRadius * 0.18 * spacing, y: centerY, fontSize },
      { emoji: visibleEmojis[1], x: centerX + hexRadius * 0.18 * spacing, y: centerY, fontSize }
    ];
  }

  if (visibleEmojis.length === 3) {
    const fontSize = clamp(hexRadius * 0.34, 12, 18);
    return [
      { emoji: visibleEmojis[0], x: centerX, y: centerY - hexRadius * 0.18 * spacing, fontSize },
      { emoji: visibleEmojis[1], x: centerX - hexRadius * 0.22 * spacing, y: centerY + hexRadius * 0.16 * spacing, fontSize },
      { emoji: visibleEmojis[2], x: centerX + hexRadius * 0.22 * spacing, y: centerY + hexRadius * 0.16 * spacing, fontSize }
    ];
  }

  const fontSize = clamp(hexRadius * 0.30, 11, 16);
  return [
    { emoji: visibleEmojis[0], x: centerX - hexRadius * 0.18 * spacing, y: centerY - hexRadius * 0.16 * spacing, fontSize },
    { emoji: visibleEmojis[1], x: centerX + hexRadius * 0.18 * spacing, y: centerY - hexRadius * 0.16 * spacing, fontSize },
    { emoji: visibleEmojis[2], x: centerX - hexRadius * 0.18 * spacing, y: centerY + hexRadius * 0.17 * spacing, fontSize },
    { emoji: visibleEmojis[3], x: centerX + hexRadius * 0.18 * spacing, y: centerY + hexRadius * 0.17 * spacing, fontSize }
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

function randomFrom<T>(values: T[], rng: RandomStreams = fallbackRandomStreams): T {
  return values[Math.floor(rng.geography() * values.length)];
}


function assignCentralPoiKindForRegion(biomeLandType: BiomeLandType, sizeCategory: Region['sizeCategory'], rng: RandomStreams = fallbackRandomStreams): CentralPoiKind {
  if (biomeLandType === 'wild') return randomFrom(WILD_CENTRAL_POI_KINDS, poiRandomStreams(rng));
  if (sizeCategory === 'vast_land') return 'capital';
  if (sizeCategory === 'land' || sizeCategory === 'large_region') return 'city';
  if (sizeCategory === 'region' || sizeCategory === 'small_region') return 'town';
  return 'village';
}

function getCentralPoiEmoji(region: Region): string {
  return region.centralPoiKind ? CENTRAL_POI_DETAILS[region.centralPoiKind]?.emoji ?? REGION_CENTER_EMOJI : REGION_CENTER_EMOJI;
}

function getCentralPoiLabel(region: Region, language: Language): string {
  return region.centralPoiKind ? CENTRAL_POI_DETAILS[region.centralPoiKind]?.label[language] ?? UI_TEXT[language].centralPoi : UI_TEXT[language].centralPoi;
}

type CoastalPreference = 'coast' | 'mainland';

// Параметры ручного управления генерацией региона. Любое поле, оставленное
// пустым (undefined), означает "как раньше" — то есть случайный выбор.
type GenerationOptions = {
  mode?: GenerationMode;
  kingdomId?: number;
  kingdomArea?: Set<string>;
  fixedCenter?: AxialHex;
  forbiddenHexes?: Set<string>;
  targetSize?: number;
  landType?: BiomeLandType;
  biomeId?: BiomeId;
  coastalPreference?: CoastalPreference;
  previousToponyms?: ToponymRegistry;
};

const REGION_SIZE_CATEGORY_RANGES: Record<Region['sizeCategory'], [number, number]> = {
  tract: [5, 8],
  locality: [6, 10],
  small_region: [11, 20],
  region: [21, 30],
  large_region: [31, 40],
  land: [41, 50],
  vast_land: [51, 60]
};

function rollRegionSizeInCategory(category: Region['sizeCategory'], rng: RandomStreams = fallbackRandomStreams): number {
  const [min, max] = REGION_SIZE_CATEGORY_RANGES[category];
  return randomInt(min, max, rng);
}

function rollTractTargetSize(rng: RandomStreams = fallbackRandomStreams): number {
  return rollRegionSizeInCategory('tract', rng);
}

const TRACT_GROWTH_WEIGHT_EXPONENT = 1.5;

// Полный снимок состояния карты до добавления очередного региона.
// Используется для удаления/перегенерации последнего региона: вместо того
// чтобы пытаться "откатить" все побочные эффекты генерации рек и дорог
// (которые могут менять соседние регионы), мы просто восстанавливаем снимок.
type MapSnapshot = {
  knave?: KnaveLayer;
  seas:SeaRecord[];
  nextSeaId:number;
  riverFeatures:RiverFeatures;
  nextRiverId:number;
  tags?: TagState;
  editorNames: EditorNames;
  gmNotesByHexKey: Record<string, string>;
  generation: GenerationState;
  kingdoms?: Kingdom[];
  obstacles?: EditableObstacle[];
  regions: Region[];
  candidateHexes: AxialHex[];
  rivers: River[];
  roads: Road[];
  crossings: RiverCrossing[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextLakeId: number;
  nextRoadId: number;
  nextObstacleId: number;
  waterPoiByKey: Map<string, WaterPoiKind>;
  biomeOverrideByHexKey: Map<string, BiomeId>;
  toponyms: ToponymRegistry;
  toponymSeed: number;
};

// Exact rollback state: unlike user undo, error recovery never recalculates names or roads.
type DocumentSnapshot = {
  map: MapSnapshot; generationHistory: MapSnapshot[]; selectedHex: AxialHex | null;
  generationMode: GenerationMode; isMapRotated: boolean; mapScale: number;
};
type MapTransaction = { before: DocumentSnapshot; after: DocumentSnapshot };
type GenerationBackup = {
  map: MapSnapshot; history: MapSnapshot[]; selectedHex: AxialHex | null;
  document?: DocumentSnapshot; undo?: MapTransaction[]; redo?: MapTransaction[];
};
type GenerationActionContext = { action: 'add' | 'regenerate'; inputOptions: Record<string, unknown> };
type KingdomJob = { actionContext: GenerationActionContext; preferredAnchor?: AxialHex; recoveries?: number; failureBackup?: GenerationBackup; backup: GenerationBackup; origin: AxialHex; anchor: AxialHex; id: number; startCount: number; steps: number; phase: 'connect' | 'build'; first: boolean; };
type GenerationDiagnostic = ReturnType<typeof generationLog.finish>;
// Expected refusal: only canonical coordinates, never the note text, reach UI.
class NotesLossConflict extends Error {
  constructor(readonly hexKeys: string[]) {
    super(`Generation removes hexes with notes (${hexKeys.length}): ${hexKeys.join('; ')}. Move or clear the notes first.`);
    this.name = 'NotesLossConflict';
  }
}


function getToponymEntities(regions: Region[], rivers: River[], terrain: Map<string, HexTerrainData>): ToponymEntity[] {
  const entities: ToponymEntity[] = [];
  for (const region of regions) {
    const kind: ToponymKind = region.biomeId === 'swamp' || region.biomeId === 'swamp_forest'
      ? 'swamp'
      : region.biomeId === 'mountains' || region.biomeId.includes('mountain') ? 'mountain'
        : region.biomeId.includes('forest') || region.biomeId.includes('woodland') ? 'forest' : 'region';
    entities.push({ key: `region:${region.id}`, kind });
    if (region.centralPoiKind && ['capital', 'city', 'town', 'village', 'throne', 'holding_city', 'holding_castle', 'holding_tower', 'holding_stronghold', 'dwelling'].includes(region.centralPoiKind)) {
      entities.push({ key: `settlement:${region.id}:${hexKey(region.centerHex)}`, kind: 'settlement' });
    }
    for (const hex of region.pointsOfInterest) {
      const key = hexKey(hex);
      if (['city', 'town', 'village'].includes(region.pointOfInterestKinds?.[key] ?? '')) {
        entities.push({ key: `settlement:${region.id}:${key}`, kind: 'settlement' });
      }
    }
  }
  for (const river of rivers) entities.push({ key: `river:${river.id}`, kind: 'river' });
  for (const lakeId of new Set(Array.from(terrain.values())
    .filter((item) => item.terrainOverride === 'lake' && item.lakeId !== undefined)
    .map((item) => item.lakeId!))) entities.push({ key: `lake:${lakeId}`, kind: 'lake' });
  return entities;
}

function createToponymSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Date.now() >>> 0;
}

function legacyToponymSeed(regions: Region[]): number {
  // Stable across imports of the same old (unnamed) map, independent of UI RNG.
  let value = 2166136261;
  for (const region of regions) {
    for (const char of `${region.id}:${region.anchorHex.q},${region.anchorHex.r};`) {
      value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    }
  }
  return value >>> 0;
}

function chooseBiomeLandType(regionCount: number, rng: RandomStreams = fallbackRandomStreams): BiomeLandType {
  if (regionCount === 0) return 'settled';
  return Math.floor(rng.geography() * 100) + 1 <= 20 ? 'settled' : 'wild';
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

// Every pair involving a dead-forest biome is valid except the pairs selected
// below. The numbered lists correspond to the biome list agreed with the owner.
const DEAD_FOREST_INCOMPATIBLE_NEIGHBORS: Partial<Record<BiomeId, ReadonlySet<BiomeId>>> = {
  dead_forest: new Set<BiomeId>(['open_plains', 'swamp', 'semi_desert', 'open_hills', 'coniferous_mountain_forest', 'mixed_mountain_forest', 'deciduous_mountain_forest', 'mountains', 'mountain_woodland', 'dead_mountain_forest']),
  dead_woodland: new Set<BiomeId>(['coniferous_mountain_forest', 'mixed_mountain_forest', 'deciduous_mountain_forest', 'mountains', 'mountain_woodland', 'dead_mountain_forest']),
  dead_forested_hills: new Set<BiomeId>(['open_plains', 'swamp', 'semi_desert']),
  dead_mountain_forest: new Set<BiomeId>(['plain_deciduous_forest', 'plain_mixed_forest', 'plain_coniferous_forest', 'open_plains', 'swamp_forest', 'swamp', 'deciduous_woodland', 'mixed_woodland', 'coniferous_woodland', 'semi_desert', 'dead_forest', 'dead_woodland'])
};

function isBiomesCompatible(biomeA: BiomeId, biomeB: BiomeId, compatibilityMatrix: BiomeCompatibilityMatrix): boolean {
  if (DEAD_FOREST_INCOMPATIBLE_NEIGHBORS[biomeA]?.has(biomeB)
    || DEAD_FOREST_INCOMPATIBLE_NEIGHBORS[biomeB]?.has(biomeA)) return false;
  if (biomeA in DEAD_FOREST_INCOMPATIBLE_NEIGHBORS
    || biomeB in DEAD_FOREST_INCOMPATIBLE_NEIGHBORS) return true;
  const direct = compatibilityMatrix[biomeA]?.[biomeB];
  if (typeof direct === 'boolean') return direct;
  const reverse = compatibilityMatrix[biomeB]?.[biomeA];
  if (typeof reverse === 'boolean') return reverse;
  return false;
}


function chooseWeightedRandom(weights: Record<BiomeId, number>, rng: RandomStreams = fallbackRandomStreams): BiomeId {
  const total = Object.values(weights).reduce((acc, value) => acc + value, 0);
  if (total <= 0) return FALLBACK_BIOME_ID;
  let roll = rng.geography() * total;
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
  riverHeightConstraint?: RiverHeightConstraint, rng: RandomStreams = fallbackRandomStreams
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
  if (strictWeightSum > 0) return { biomeId: chooseWeightedRandom(strictWeights, rng) };

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

    generationLog.detail('Biome strict filter had no available weights; restored incompatible biome weights', {
      regionId,
      biomeLandType: landType,
      adjacentBiomeIds
    });

    if (relaxedWeightSum > 0) return { biomeId: chooseWeightedRandom(relaxedWeights, rng) };
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

function chooseBiomeIdAtHeightLevel(
  landType: BiomeLandType,
  adjacentBiomeIds: BiomeId[],
  regionId: number | undefined,
  requiredHeightLevel: RegionHeightLevel,
  riverHeightConstraint?: RiverHeightConstraint, rng: RandomStreams = fallbackRandomStreams
): ChooseBiomeResult {
  const constrainedWeights = {} as Record<BiomeId, number>;
  const uniqueAdjacentBiomeIds = new Set(adjacentBiomeIds);

  for (const biome of Object.values(BIOMES)) {
    const baseWeight = landType === 'settled' ? biome.settledWeight : biome.wildWeight;
    const incompatibleWithHeight = biome.heightLevel !== requiredHeightLevel;
    const incompatibleWithRiver = riverHeightConstraint
      ? !isBiomeAllowedByRiverHeightConstraint(biome.id, riverHeightConstraint)
      : false;
    const duplicateAdjacentBiome = uniqueAdjacentBiomeIds.has(biome.id);
    const incompatibleWithAdjacent = adjacentBiomeIds.some(
      (adjacentBiomeId) => !isBiomesCompatible(biome.id, adjacentBiomeId, BIOME_COMPATIBILITY_MATRIX)
    );

    constrainedWeights[biome.id] = incompatibleWithHeight || incompatibleWithRiver || duplicateAdjacentBiome || incompatibleWithAdjacent
      ? 0
      : baseWeight;
  }

  if (Object.values(constrainedWeights).some((weight) => weight > 0)) {
    return { biomeId: chooseWeightedRandom(constrainedWeights, rng) };
  }

  const relaxedWeights = {} as Record<BiomeId, number>;
  for (const biome of Object.values(BIOMES)) {
    const baseWeight = landType === 'settled' ? biome.settledWeight : biome.wildWeight;
    const incompatibleWithRiver = riverHeightConstraint
      ? !isBiomeAllowedByRiverHeightConstraint(biome.id, riverHeightConstraint)
      : false;
    relaxedWeights[biome.id] = biome.heightLevel !== requiredHeightLevel || incompatibleWithRiver ? 0 : baseWeight;
  }

  if (Object.values(relaxedWeights).some((weight) => weight > 0)) {
    generationLog.detail('Biome height filter restored adjacent/incompatible biome weights', {
      regionId,
      biomeLandType: landType,
      adjacentBiomeIds,
      requiredHeightLevel
    });
    return { biomeId: chooseWeightedRandom(relaxedWeights, rng) };
  }

  // A zero weight stays zero even when a river requires an exact height.
  // The caller can retry without the preferred height or create a tract.
  return { biomeId: null, reason: 'river_height_constraint_failed' };
}

const getAdjacentRegionBiomes = __profiled('getAdjacentRegionBiomes', getAdjacentRegionBiomesImpl);
function getAdjacentRegionBiomesImpl(regionHexes: AxialHex[], regionByHexKey: Map<string, Region>): BiomeId[] {
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

// Кэш углов гекса: getHexCornerPoints — чистая функция от (q,r), но раньше
// пересчитывалась тысячи раз для одних и тех же гексов (6× тригонометрии +
// 12× round3/toFixed + строковые ключи), в т.ч. в сканерах vertexTouchesAnyHex /
// getRegionHexesTouchingVertex на каждую проверку вершины. Кэшируем результат по
// ключу гекса и возвращаем СВЕЖУЮ копию — семантика идентична исходной (каждый
// вызов даёт новые объекты с уникальной идентичностью, мутации остаются
// локальными), меняется только то, что углы/ключи считаются один раз на гекс.
// Проверено на 200k случайных гексов: массивы (x,y,key) побайтно идентичны.
const hexCornerPointsCache = new Map<string, RiverVertex[]>();
function getHexCornerPoints(hex: AxialHex): RiverVertex[] {
  const cacheKey = hexKey(hex);
  let cached = hexCornerPointsCache.get(cacheKey);
  if (cached === undefined) {
    const { x, y } = toPixel(hex.q, hex.r);
    cached = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const vx = x + HEX_SIZE * Math.cos(angle);
      const vy = y + HEX_SIZE * Math.sin(angle);
      return { x: vx, y: vy, key: vertexKey(vx, vy) };
    });
    hexCornerPointsCache.set(cacheKey, cached);
  }
  return cached.map((v) => ({ x: v.x, y: v.y, key: v.key }));
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


function getCandidateEndpointVerticesForRegion(
  candidateVertices: RiverVertex[],
  riverGraph: RiverGraph
): RiverVertex[] {
  // A river may enter/leave an ungenerated candidate only through a "gate"
  // vertex: one incident edge continues inside the current region, while the
  // other two incident region edges are the shared boundary with candidate
  // hexes. This keeps river endpoints at candidate corners that can naturally
  // continue after the candidate becomes a generated region.
  const endpointVertices = candidateVertices.filter((vertex) => {
    const node = riverGraph.nodes.get(vertex.key);
    if (!node?.isCandidateBoundaryVertex) return false;
    const insideRegionEdgeCount = node.regionIncidentEdgeKeys.filter((edgeKey) => (
      riverGraph.edges.get(edgeKey)?.isInsideRegionEdge
    )).length;
    return insideRegionEdgeCount === 1 && node.candidateBoundaryIncidentEdgeKeys.length === 2;
  });

  return endpointVertices;
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

type AssignRiverSectorsOptions = { recalculatedRegionId?: number };

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
    generationLog.warning('Rejecting river update because existing river edge fullness decreased', { changedEdges });
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

function assignRiverSectorsImpl(
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
  for (const lake of lakes) {
    const exteriorKeys = new Set(getRegionExteriorVertices(lake.hexes).map((vertex) => vertex.key));
    lakeExteriorVertexKeysByLakeId.set(lake.lakeId, exteriorKeys);
    for (const key of exteriorKeys) lakeVertexKeys.add(key);
  }

  const nextRivers = rivers.map((river) => {
    try {
      const vertexPath = river.vertexPath ?? [];
      if (vertexPath.length < 2) {
        generationLog.warning('Could not assign river sectors: river path is too short', { riverId: river.id, vertexCount: vertexPath.length });
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
        const fullness = baseFullness;
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
      // Constraint rejections return normally; an exception is a programming error.
      throw error;
    }
  });

  for (const river of nextRivers) {
    if (!river.sectors || river.sectors.length === 0) {
      generationLog.warning('River has no sectors after assignRiverSectors', river);
    }
  }
  return nextRivers;
}
const assignRiverSectors = __profiled('assignRiverSectors', assignRiverSectorsImpl);

// Geometry adapter for RIV-001…018. Old edges are immutable boundary conditions;
// legacy junctions outside the extension are not silently migrated.
function buildRegionRiverNetwork(
  rivers: River[], previous: River[], regions: Region[], candidates: AxialHex[],
  terrain: Map<string, HexTerrainData>, complete = false, affectedVertices: Set<string> = new Set()
) {
  const previousEdges = new Map<string, { from: string; to: string; fullness: RiverFullness; regionId: number }>();
  for (const river of previous.filter(r => r.deltaParentRiverId === undefined)) {
    const values = getRiverSectorFullnessByEdge(river);
    const owners = getRiverSectorAssignedRegionByEdge(river);
    for (let i = 1; i < river.vertexPath.length; i++) {
      const a = river.vertexPath[i - 1], b = river.vertexPath[i], key = edgeKey(a, b);
      previousEdges.set(key, { from: a.key, to: b.key, fullness: values.get(key) ?? 1, regionId: owners.get(key) ?? river.regionId });
    }
  }
  const heights = new Map(regions.map(r => [r.id, r.heightLevel]));
  const lakeByVertex = new Map<string, string>();
  const lakeHexes = new Map<string, Set<string>>();
  for (const lake of getLakesForRegions(regions, terrain)) {
    const id = `lake:${lake.lakeId}`, hexes = lakeHexes.get(id) ?? new Set<string>();
    for (const hex of lake.hexes) hexes.add(hexKey(hex));
    lakeHexes.set(id, hexes);
    for (const v of lake.vertices) lakeByVertex.set(v.key, id);
  }
  const sea = getSeaVertexKeysFromSeaKeys(getSeaHexKeys(terrain));
  const frontier = new Set(candidates.flatMap(h => getHexCornerPoints(h).map(v => v.key)));
  const vertices = new Map<string, RiverVertex>();
  const physical = new Map<string, { edge: ModelEdge; old: boolean; riverId: number }>();
  const issues: string[] = [];
  const internalLakeEdges = new Map<string, string>();
  for (const river of rivers.filter(r => r.deltaParentRiverId === undefined)) {
    const values = getRiverSectorFullnessByEdge(river), owners = getRiverSectorAssignedRegionByEdge(river);
    for (let i = 1; i < river.vertexPath.length; i++) {
      const a = river.vertexPath[i - 1], b = river.vertexPath[i], key = edgeKey(a, b), old = previousEdges.get(key);
      vertices.set(a.key, a); vertices.set(b.key, b);
      if (physical.has(key) || internalLakeEdges.has(key)) issues.push(`Duplicate river edge ${key}`);
      if (old && (old.from !== a.key || old.to !== b.key)) issues.push(`Reversed old edge ${key}`);
      const regionId = old?.regionId ?? owners.get(key) ?? river.regionId;
      if (!heights.has(regionId)) issues.push(`Missing owner region ${regionId}`);
      const from = lakeByVertex.get(a.key) ?? a.key, to = lakeByVertex.get(b.key) ?? b.key;
      // The drawn path through a lake is not an extra inlet/outlet of that lake.
      if (from === to) { internalLakeEdges.set(key, from); continue; }
      physical.set(key, { old: !!old, riverId: river.id, edge: {
        id: key, from, to, regionId, height: heights.get(regionId) ?? 1,
        ...(old ? { fullness: old.fullness } : complete ? { fullness: values.get(key) } : {})
      } });
    }
  }
  for (const key of previousEdges.keys()) if (!physical.has(key) && !internalLakeEdges.has(key)) issues.push(`Missing old river edge ${key}`);
  const active = new Set<string>();
  for (const { edge, old } of physical.values()) if (!old || complete) { active.add(edge.from); active.add(edge.to); }
  // Existing geometry can acquire a new source/mouth when its frontier closes.
  // Activate affected old ends (and lake ports), not unrelated legacy defects.
  const degree = new Map<string, number>();
  for (const { edge } of physical.values()) for (const id of [edge.from, edge.to]) degree.set(id, (degree.get(id) ?? 0) + 1);
  for (const key of affectedVertices) {
    const id = lakeByVertex.get(key) ?? key;
    if (degree.get(id) === 1 || lakeHexes.has(id)) active.add(id);
  }
  // A changed lake must account for all its ports, including fixed old rivers.
  for (const [key, lake] of internalLakeEdges) if (!previousEdges.has(key)) active.add(lake);
  const network: ModelNetwork = { nodes: [], edges: [] };
  for (const { edge } of physical.values()) {
    if (!active.has(edge.from) && !active.has(edge.to)) continue;
    const from = active.has(edge.from) ? edge.from : `fixed:start:${edge.id}`;
    const to = active.has(edge.to) ? edge.to : `fixed:end:${edge.id}`;
    network.edges.push({ ...edge, from, to });
    if (from !== edge.from) network.nodes.push({ id: from, kind: 'open' });
    if (to !== edge.to) network.nodes.push({ id: to, kind: 'open' });
  }
  for (const id of active) {
    const ins = network.edges.filter(e => e.to === id), outs = network.edges.filter(e => e.from === id);
    if (!ins.length && !outs.length) continue;
    if (lakeHexes.has(id)) network.nodes.push({ id, kind: 'lake', lakeHexCount: lakeHexes.get(id)!.size });
    else if (sea.has(id)) {
      if (outs.length) issues.push(`River flows out of sea at ${id}`);
      network.nodes.push({ id, kind: 'sea' });
    } else if (ins.length + outs.length === 1 && frontier.has(id)) network.nodes.push({ id, kind: 'open' });
    else if (ins.length === 0 && outs.length === 1) network.nodes.push({ id, kind: 'source' });
    else if (ins.length === 1 && outs.length === 0) {
      // A closed inland mouth needs a real sink lake, never an invented open border.
      network.nodes.push({ id, kind: 'lake', lakeHexCount: 0 });
    } else network.nodes.push({ id, kind: ins.length === 2 && outs.length === 1 ? 'confluence' : 'continuation' });
  }
  return { network, issues, vertices, previousEdges, internalLakeEdges };
}

function solveRiverComponents(network: ModelNetwork): ModelSolveResult {
  const remaining = new Set(network.nodes.map(n => n.id));
  const fullness: Record<string, RiverFullness> = {};
  let states = 0;
  while (remaining.size) {
    const ids = new Set<string>([remaining.values().next().value!]);
    const queue = [...ids];
    for (const id of queue) for (const e of network.edges) if (e.from === id || e.to === id) {
      const other = e.from === id ? e.to : e.from;
      if (!ids.has(other)) { ids.add(other); queue.push(other); }
    }
    for (const id of ids) remaining.delete(id);
    const component = { nodes: network.nodes.filter(n => ids.has(n.id)), edges: network.edges.filter(e => ids.has(e.from)) };
    const result = solveRiverNetwork(component, { maxStates: 5000 });
    if (result.status !== 'solved') return result;
    Object.assign(fullness, result.fullness); states += result.states;
  }
  return { status: 'solved', fullness, states, score: [] };
}

function reconcileRegionRiverModel(
  rivers: River[], previous: River[], region: Region, regions: Region[],
  candidates: AxialHex[], terrain: Map<string, HexTerrainData>, allowLakes = true,
  affectedVertices = new Set(region.hexes.flatMap(h => getHexCornerPoints(h).map(v => v.key)))
): { success: true; rivers: River[]; terrain: Map<string, HexTerrainData> } | { success: false; reason: string } {
  let nextTerrain = new Map(terrain);
  const sea = getSeaHexKeys(terrain);
  // Build lakes only on new land, connected to the actual event, away from sea.
  const available = region.hexes.filter(h => !getHexNeighbors(h).some(n => sea.has(hexKey(n))) && !sea.has(hexKey(h)));
  for (let repair = 0; repair <= 8; repair++) {
    const built = buildRegionRiverNetwork(rivers, previous, regions, candidates, nextTerrain, false, affectedVertices);
    if (built.issues.length) return { success: false, reason: built.issues.join('; ') };
    const result = solveRiverComponents(built.network);
    if (result.status === 'solved') {
      const checked = validateRiverNetwork({ ...built.network, edges: built.network.edges.map(e => ({ ...e, fullness: result.fullness[e.id] })) });
      if (!checked.valid) return { success: false, reason: JSON.stringify(checked.issues) };
      const values = new Map(Object.entries(result.fullness));
      // Render lake-interior strokes consistently without counting them twice in lake balance.
      for (const [key, lake] of built.internalLakeEdges) {
        const outlet = built.network.edges.find(e => e.from === lake) ?? built.network.edges.find(e => e.to === lake);
        values.set(key, built.previousEdges.get(key)?.fullness ?? (outlet ? result.fullness[outlet.id] : 1));
      }
      const changed = rivers.map(river => {
        const oldValues = getRiverSectorFullnessByEdge(river), owners = getRiverSectorAssignedRegionByEdge(river);
        if (river.deltaParentRiverId !== undefined) return river;
        const lakeVertices = new Set(getLakesForRegions(regions, nextTerrain).flatMap(l => l.vertices.map(v => v.key)));
        const eventReason = (key: string, start: boolean, endpoint: boolean): RiverSector['startReason'] | RiverSector['endReason'] => {
          if (lakeVertices.has(key)) return 'lake';
          const event = built.network.nodes.find(n => n.id === key);
          if (event?.kind === 'confluence') return 'river_confluence';
          if (endpoint) return start ? 'river_start' : 'river_end';
          return 'region_boundary';
        };
        const sectors: RiverSector[] = [];
        for (let i = 1; i < river.vertexPath.length; i++) {
          const a = river.vertexPath[i - 1], b = river.vertexPath[i], key = edgeKey(a, b);
          const f = built.previousEdges.get(key)?.fullness ?? values.get(key) ?? oldValues.get(key) ?? 1;
          const owner = built.previousEdges.get(key)?.regionId ?? owners.get(key) ?? river.regionId;
          const last = sectors[sectors.length - 1];
          const event = built.network.nodes.find(n => n.id === a.key);
          if (last && last.fullness === f && last.assignedRegionId === owner && (!event || event.kind === 'continuation') && !lakeVertices.has(a.key)) {
            last.vertexPath.push(b); last.edgeKeys.push(key); last.endVertexKey = b.key; last.endReason = eventReason(b.key, false, i === river.vertexPath.length - 1) as RiverSector['endReason'];
          } else sectors.push(...createInitialRiverSectors(river.id, [a, b], f, {
            startReason: eventReason(a.key, true, i === 1) as RiverSector['startReason'],
            endReason: eventReason(b.key, false, i === river.vertexPath.length - 1) as RiverSector['endReason']
          }, owner));
        }
        for (let i = 0; i < sectors.length; i++) { sectors[i].id = `${river.id}:sector:${i + 1}`; sectors[i].sectorIndex = i + 1; }
        const old = previous.find(r => r.id === river.id);
        return old && JSON.stringify(old.vertexPath) === JSON.stringify(river.vertexPath) && river.sectors.every(s => s.edgeKeys.every(k => built.previousEdges.has(k))) && !river.vertexPath.slice(1, -1).some(v => built.network.nodes.some(n => n.id === v.key && n.kind === 'confluence'))
          ? old : { ...river, sectors };
      });
      return { success: true, rivers: changed, terrain: nextTerrain };
    }
    if (!allowLakes || repair === 8 || result.status === 'limit') return { success: false, reason: JSON.stringify(result) };
    // Ask the same solver how much lake area is required at the conflicting event.
    const at = result.issues.find(i => i.nodeId)?.nodeId;
    const node = built.network.nodes.find(n => n.id === at);
    if (!node || node.kind === 'sea' || node.kind === 'open' || node.kind === 'confluence') return { success: false, reason: JSON.stringify(result) };
    const virtual = { ...built.network, nodes: built.network.nodes.map(n => n.id === at ? { ...n, kind: 'lake' as const, lakeHexCount: 25 } : n) };
    const relaxed = solveRiverComponents(virtual);
    if (relaxed.status !== 'solved') return { success: false, reason: JSON.stringify(result) };
    const minimum = minimumLakeHexes(virtual.edges.filter(e => e.to === at).map(e => relaxed.fullness[e.id]), virtual.edges.filter(e => e.from === at).map(e => relaxed.fullness[e.id]));
    if (minimum === null) return { success: false, reason: 'Unsupported source lake outlets' };
    const existingLakeId = at!.startsWith('lake:') ? Number(at!.slice(5)) : undefined;
    const selected = new Set<string>();
    if (existingLakeId !== undefined) for (const [key, t] of nextTerrain) if (t.lakeId === existingLakeId && t.terrainOverride === 'lake') selected.add(key);
    const seed = available.find(h => getHexCornerPoints(h).some(v => v.key === at) && !nextTerrain.has(hexKey(h)));
    if (!selected.size && seed) selected.add(hexKey(seed));
    if (!selected.size) return { success: false, reason: 'No land for required lake' };
    while (selected.size < minimum) {
      const next = available.find(h => !selected.has(hexKey(h)) && !nextTerrain.has(hexKey(h)) && getHexNeighbors(h).some(n => selected.has(hexKey(n))));
      if (!next) return { success: false, reason: 'Insufficient actual lake area' };
      selected.add(hexKey(next));
    }
    const lakeId = existingLakeId ?? getNextLakeIdFromTerrain(nextTerrain);
    for (const key of selected) nextTerrain.set(key, { terrainOverride: 'lake', lakeId });
    mergeAdjacentLakeIds(nextTerrain);
  }
  return { success: false, reason: 'Lake repair budget exhausted' };
}

// Complete every closed end touched by the new land. All trials are detached;
// old edges/directions/fullness remain fixed in the numerical model.
function completeRegionRiverEnds(
  rivers: River[], previous: River[], region: Region, regions: Region[],
  candidates: AxialHex[], terrain: Map<string, HexTerrainData>, previousCandidates: AxialHex[] = [],
  previousTerrain: Map<string, HexTerrainData> = terrain,
  forcedClosedEnds: Set<string> = new Set()
): ReturnType<typeof reconcileRegionRiverModel> {
  const affected = new Set(region.hexes.flatMap(h => getHexCornerPoints(h).map(v => v.key)));
  const graph = buildRiverGraphForRegion(region.hexes, regions.flatMap(r => r.hexes), candidates);
  const frontier = new Set(candidates.flatMap(h => getHexCornerPoints(h).map(v => v.key)));
  for (const hex of previousCandidates) for (const vertex of getHexCornerPoints(hex)) {
    if (!frontier.has(vertex.key)) affected.add(vertex.key);
  }
  for (const key of forcedClosedEnds) { frontier.delete(key); affected.add(key); }
  let budget = 128;
  let lastReason = 'No compatible river termination';
  const search = (current: River[], currentTerrain: Map<string, HexTerrainData>, depth: number): ReturnType<typeof reconcileRegionRiverModel> => {
    if (--budget < 0 || depth > 24) return { success: false, reason: 'River endpoint search budget exhausted' };
    const sea = getSeaVertexKeysFromSeaKeys(getSeaHexKeys(currentTerrain));
    const lakes = new Set(getLakesForRegions(regions, currentTerrain).flatMap(l => l.vertices.map(v => v.key)));
    const ins = new Map<string, number>(), outs = new Map<string, number>();
    for (const river of current.filter(r => r.deltaParentRiverId === undefined)) {
      for (let i = 1; i < river.vertexPath.length; i++) {
        const a = river.vertexPath[i - 1].key, b = river.vertexPath[i].key;
        outs.set(a, (outs.get(a) ?? 0) + 1); ins.set(b, (ins.get(b) ?? 0) + 1);
      }
    }
    let end: { river: River; vertex: RiverVertex; source: boolean; fullness: RiverFullness } | undefined;
    for (const river of current.filter(r => r.deltaParentRiverId === undefined)) {
      const values = getRiverSectorFullnessByEdge(river);
      for (const source of [false, true]) {
        const path = river.vertexPath;
        if (path.length < 2) continue;
        const vertex = source ? path[0] : path[path.length - 1];
        if (!affected.has(vertex.key) || frontier.has(vertex.key) || lakes.has(vertex.key)) continue;
        const terminal = source ? !ins.has(vertex.key) && outs.get(vertex.key) === 1 : !outs.has(vertex.key) && ins.get(vertex.key) === 1;
        if (!terminal) continue;
        const fullness = values.get(source ? edgeKey(path[0], path[1]) : edgeKey(path[path.length - 2], vertex)) ?? 1;
        if ((!source && sea.has(vertex.key)) || (source && fullness === 1 && !sea.has(vertex.key))) continue;
        end = { river, vertex, source, fullness };
        break;
      }
      if (end) break;
    }
    if (!end) {
      const result = reconcileRegionRiverModel(current, previous, region, regions, candidates, currentTerrain, true, affected);
      if (result.success) {
        const violation = getNewRiverLakeReentryViolation(result.rivers, regions, result.terrain,
          previous, regions.filter(r => r.id !== region.id), previousTerrain);
        if (violation) {
          lastReason = `river_lake_reentry: river ${violation.riverId}, lake ${violation.lakeId}, vertex ${violation.vertexKey}`;
          return { success: false, reason: lastReason };
        }
      } else lastReason = result.reason;
      return result;
    }
    const { river, vertex, source, fullness } = end;
    const used = buildUsedRiverEdges(current);
    const occupied = new Set(current.flatMap(r => r.vertexPath.map(v => v.key)));
    const available = region.hexes.filter(h => !currentTerrain.has(hexKey(h)) &&
      !getHexNeighbors(h).some(n => currentTerrain.get(hexKey(n))?.terrainOverride === 'sea'));
    const lakeSites = new Set(available.flatMap(h => getHexCornerPoints(h).map(v => v.key)));
    const targets = [...graph.nodes.values()].filter(v => v.key !== vertex.key && (
      source ? !sea.has(v.key) && (lakes.has(v.key) || frontier.has(v.key) || lakeSites.has(v.key) || ins.get(v.key) === 1 && !outs.has(v.key))
        : sea.has(v.key) || lakes.has(v.key) || frontier.has(v.key) || lakeSites.has(v.key) || occupied.has(v.key)
    ));
    // Keep flowing through compatible existing water or into unexplored land
    // before consuming new land for a source/sink lake.
    const preferOpenContinuation = region.generationMode === 'mythic';
    const priority = (key: string) => !source && sea.has(key) ? 0 : lakes.has(key) || occupied.has(key) ? 1
      : frontier.has(key) ? (preferOpenContinuation ? 2 : 3) : (preferOpenContinuation ? 3 : 2);
    const paths = targets.flatMap(target => {
      const blocked = new Set(used);
      // Block forbidden vertices during search, not only after finding a shortest
      // path: otherwise a valid detour could be missed.
      for (const edge of graph.edges.values()) {
        if ([edge.a.key, edge.b.key].some(k => k !== vertex.key && k !== target.key && (occupied.has(k) || sea.has(k) || lakes.has(k)))) blocked.add(edge.key);
        if (source && (sea.has(edge.a.key) || sea.has(edge.b.key))) blocked.add(edge.key);
      }
      const start = graph.nodes.get(vertex.key);
      const path = start ? findRiverPath(start, target, graph, blocked).map(v => ({ key: v.key, x: v.x, y: v.y })) : [];
      return path.length >= 2 ? [{ path, rank: priority(target.key) }] : [];
    });
    // An adequate lake directly at the old end is also a candidate.
    if (lakeSites.has(vertex.key) && !sea.has(vertex.key)) paths.push({ path: [vertex], rank: preferOpenContinuation ? 3 : 2 });
    paths.sort((a, b) => a.rank - b.rank || a.path.length - b.path.length);
    for (const { path } of paths) {
      if (budget <= 0) break;
      const terminal = path[path.length - 1];
      const terrainTrials: Map<string, HexTerrainData>[] = [];
      const needsLake = !sea.has(terminal.key) && !lakes.has(terminal.key) && !frontier.has(terminal.key) && (!occupied.has(terminal.key) || path.length === 1);
      if (needsLake) {
        const count = source ? Math.max(1, fullness - 1) : fullness;
        // Try each seed component; don't confuse one disconnected pocket with
        // absence of enough connected lake area elsewhere at this vertex.
        const selections: AxialHex[][] = [];
        for (const seed of available.filter(h => getHexCornerPoints(h).some(v => v.key === terminal.key))) {
          const trial = [seed], keys = new Set([hexKey(seed)]);
          for (let i = 0; i < trial.length && trial.length < count; i++) {
            for (const next of available) {
              if (trial.length >= count) break;
              if (!keys.has(hexKey(next)) && getHexNeighbors(trial[i]).some(n => hexKey(n) === hexKey(next))) { trial.push(next); keys.add(hexKey(next)); }
            }
          }
          if (trial.length >= count) selections.push(trial);
        }
        for (const selected of selections) {
          const nextTerrain = new Map(currentTerrain);
          const lakeId = getNextLakeIdFromTerrain(nextTerrain);
          for (const hex of selected) nextTerrain.set(hexKey(hex), { terrainOverride: 'lake', lakeId });
          mergeAdjacentLakeIds(nextTerrain);
          terrainTrials.push(nextTerrain);
        }
      } else terrainTrials.push(new Map(currentTerrain));
      const directed = source ? [...path].reverse() : path;
      const extended = path.length === 1 ? current : current.map(r => r.id !== river.id ? r : {
        ...r,
        vertexPath: source ? [...directed.slice(0, -1), ...r.vertexPath] : [...r.vertexPath, ...directed.slice(1)],
        sectors: source ? prependRiverPathSector(r, directed, fullness, region.id) : appendRiverPathSector(r, directed, fullness, region.id)
      });
      if (!validateRiverCycleSafety(extended).valid) continue;
      for (const nextTerrain of terrainTrials) {
        if (budget <= 0) break;
        const result = search(extended, nextTerrain, depth + 1);
        if (result.success) return result;
        lastReason = result.reason;
      }
    }
    if (budget <= 0) lastReason = 'River endpoint search budget exhausted';
    return { success: false, reason: `Unresolved ${source ? 'source' : 'mouth'} of river ${river.id} at ${vertex.key}: ${lastReason}` };
  };
  return search(rivers, terrain, 0);
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

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const currentRiverId = queue[queueIndex]!;
    if (visited.has(currentRiverId)) continue;
    visited.add(currentRiverId);

    for (const downstreamRiverId of downstreamByRiverId.get(currentRiverId) ?? []) {
      if (downstreamRiverId === targetRiverId) return true;
      if (!visited.has(downstreamRiverId)) queue.push(downstreamRiverId);
    }
  }

  return false;
}

function wouldCreateRiverDrainageCycleImpl(
  rivers: River[],
  upstreamRiverId: number,
  downstreamRiverId: number
): boolean {
  if (upstreamRiverId === downstreamRiverId) return true;
  return riverDrainsInto(buildRiverDownstreamAdjacency(rivers), downstreamRiverId, upstreamRiverId);
}
const wouldCreateRiverDrainageCycle = __profiled('  ↳ wouldCreateRiverDrainageCycle', wouldCreateRiverDrainageCycleImpl);

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

const tryAddEdgeMinorTributaryRiver = __profiled('  ↳ tryAddEdgeMinorTributaryRiver', tryAddEdgeMinorTributaryRiverImpl);
function tryAddEdgeMinorTributaryRiverImpl(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateHexes: AxialHex[],
  riverSlope?: RiverSlopeInfo, rng: RandomStreams = fallbackRandomStreams
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
    generationLog.detail('Edge tributary generation', {
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
    const supportsEdgeTributary = region.sizeCategory === 'large_region'
      || region.sizeCategory === 'land'
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
    // Предпосчёт: ключи вершин, касающихся любого кандидатного гекса.
    // vertexTouchesAnyHex(v, candidateHexes) == candidateTouchingVertexKeys.has(v.key),
    // но за O(1) вместо скана всех candidateHexes на каждого соседа в BFS.
    // RNG и порядок путей не затрагиваются — результат побайтно тот же.
    const candidateTouchingVertexKeys = new Set<string>();
    for (const hex of candidateHexes) {
      for (const corner of getHexCornerPoints(hex)) candidateTouchingVertexKeys.add(corner.key);
    }
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

    // Prefer a real downstream/outgoing river, but do not treat its absence as a
    // hard veto for minor tributaries. The slope pass is only a preference: when
    // there is no stream-flow continuation in the region, a tributary may still
    // be drawn down the inferred slope into any existing regional river.
    const fallbackTargetRivers = regionRivers
      .filter(riverIsRequiredMountainOutgoing)
      .sort((a, b) => (getMountainOutgoingEndpointFullness(b) ?? 0) - (getMountainOutgoingEndpointFullness(a) ?? 0) || a.id - b.id);
    const targetRivers = outgoingRivers.length > 0 ? outgoingRivers : fallbackTargetRivers;
    const selectedTargetRiver = targetRivers[0] ?? null;
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
      if (candidateTouchingVertexKeys.has(terminalVertex.key)) return false;
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

    const findEdgeTributaryPathToTargetRiver = (startVertex: RiverVertex): RiverVertex[] | null => {
      const targetVertexKeys = new Set(selectedTargetVertices.map((vertex) => vertex.key));
      const maxEdgeCount = Math.max(8, Math.min(24, region.hexes.length));
      let bestPath: RiverVertex[] | null = null;
      const queue: RiverVertex[][] = [[startVertex]];

      for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
        const path = queue[queueIndex];
        if (!path) break;
        const current = path[path.length - 1];
        const segmentCount = path.length - 1;

        if (segmentCount >= 2 && targetVertexKeys.has(current.key)) {
          const trimmedPath = trimPathAtFirstExistingRiverVertex(path);
          if (validateEdgeTributaryPath(trimmedPath)) {
            if (!bestPath) {
              bestPath = trimmedPath;
            } else {
              const currentProjection = getRiverSlopeProjection(trimmedPath[trimmedPath.length - 1], riverSlope);
              const bestProjection = getRiverSlopeProjection(bestPath[bestPath.length - 1], riverSlope);
              if (currentProjection !== null && bestProjection !== null) {
                if (currentProjection > bestProjection + 0.001 || (Math.abs(currentProjection - bestProjection) < 0.001 && trimmedPath.length < bestPath.length)) bestPath = trimmedPath;
              } else if (trimmedPath.length < bestPath.length) bestPath = trimmedPath;
            }
            continue;
          }
        }

        if (segmentCount >= maxEdgeCount) continue;

        const pathVertexKeys = new Set(path.map((vertex) => vertex.key));
        const pathEdgeKeys = new Set<string>();
        for (let index = 1; index < path.length; index += 1) pathEdgeKeys.add(edgeKey(path[index - 1], path[index]));

        const nextVertices = orderRiverSlopeVertices(
          shuffleArray(getNeighborRiverVertices(current, riverGraph), rng),
          riverSlope,
          'downstream'
        );
        for (const nextVertex of nextVertices) {
          if (pathVertexKeys.has(nextVertex.key)) continue;
          const nextEdgeKey = edgeKey(current, nextVertex);
          const graphEdge = riverGraph.edges.get(nextEdgeKey);
          if (!graphEdge?.isInsideRegionEdge) continue;
          if (usedRiverEdges.has(nextEdgeKey) || pathEdgeKeys.has(nextEdgeKey)) continue;
          if (existingRiverVertexKeys.has(nextVertex.key) && !targetVertexKeys.has(nextVertex.key)) continue;
          if (candidateTouchingVertexKeys.has(nextVertex.key) && !targetVertexKeys.has(nextVertex.key)) continue;
          queue.push([...path, nextVertex]);
        }
      }

      return bestPath;
    };

    for (const startVertex of orderRiverSlopeVertices(shuffleArray(startCandidates, rng), riverSlope, 'upstream')) {
      const path = findEdgeTributaryPathToTargetRiver(startVertex);
      if (!path) continue;

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
    // Constraint rejections return normally; an exception is a programming error.
    throw error;
  }
}

function tryAddSmallTributaryRiverImpl(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateHexes: AxialHex[],
  riverSlope?: RiverSlopeInfo, rng: RandomStreams = fallbackRandomStreams
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
    generationLog.detail('Minor river generation', {
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
    if (region.sizeCategory === 'large_region' || region.sizeCategory === 'land' || region.sizeCategory === 'vast_land') {
      return tryAddEdgeMinorTributaryRiver(region, terrainMap, riverGraph, rivers, candidateHexes, riverSlope, rng);
    }
    const supportsInteriorTributary = region.sizeCategory === 'locality'
      || region.sizeCategory === 'small_region'
      || region.sizeCategory === 'region'
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
      return tryAddEdgeMinorTributaryRiver(region, terrainMap, riverGraph, rivers, candidateHexes, riverSlope, rng);
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
    // Мемоизация: предикат зависит только от vertex.key при фиксированных
    // region/candidateHexes/graph (в пределах вызова они не меняются). Раньше он
    // пересчитывался тысячи раз для одних и тех же вершин, каждый раз сканируя все
    // гексы региона. Кэш возвращает те же значения — путь/реки/карта идентичны.
    const forbiddenInteriorVertexCache = new Map<string, boolean>();
    const isForbiddenInteriorVertex = (vertex: RiverVertex): boolean => {
      const cached = forbiddenInteriorVertexCache.get(vertex.key);
      if (cached !== undefined) return cached;
      const result = (
        !graphNodeFor(vertex)
        || isRegionPerimeterVertex(vertex)
        || isCandidateAdjacentVertex(vertex)
      );
      forbiddenInteriorVertexCache.set(vertex.key, result);
      return result;
    };
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
    const sortMinorTributaryCandidates = (vertices: RiverVertex[]): RiverVertex[] => {
      const randomized = shuffleArray(vertices, rng);
      return randomized.sort((a, b) => {
        const projectionA = getRiverSlopeProjection(a, riverSlope);
        const projectionB = getRiverSlopeProjection(b, riverSlope);
        if (projectionA !== null && projectionB !== null) {
          const slopeCompare = projectionA - projectionB;
          if (Math.abs(slopeCompare) > 0.001) return slopeCompare;
        }
        if (freeLakeVertexKeys.size > 0) return distanceToNearestLake(a) - distanceToNearestLake(b);
        return 0;
      });
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

      for (const firstStep of sortMinorTributaryCandidates(firstStepCandidates)) {
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

          const nextVertex = sortMinorTributaryCandidates(nextCandidates)[0];
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
    for (const startVertex of orderRiverSlopeVertices(shuffleArray(startCandidates, rng), riverSlope, 'downstream')) {
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
    // Constraint rejections return normally; an exception is a programming error.
    throw error;
  }
}
const tryAddSmallTributaryRiver = __profiled('    ↳↳ tryAddSmallTributaryRiver', tryAddSmallTributaryRiverImpl);

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


function getRiverSlopeVector(riverSlope?: RiverSlopeInfo): { x: number; y: number } | null {
  if (!riverSlope || riverSlope.direction === 'none' || riverSlope.strength <= 0) return null;
  const length = Math.hypot(riverSlope.vector.x, riverSlope.vector.y);
  if (length <= 0) return null;
  return { x: riverSlope.vector.x / length, y: riverSlope.vector.y / length };
}

function getRiverSlopeProjection(vertex: RiverVertex, riverSlope?: RiverSlopeInfo): number | null {
  const vector = getRiverSlopeVector(riverSlope);
  if (!vector) return null;
  return vertex.x * vector.x + vertex.y * vector.y;
}

function chooseRiverSlopeExtremeVertex(
  vertices: RiverVertex[],
  riverSlope: RiverSlopeInfo | undefined,
  flowPosition: 'downstream' | 'upstream',
  fallback: (vertices: RiverVertex[]) => RiverVertex
): RiverVertex {
  if (vertices.length === 0) return fallback(vertices);
  const vector = getRiverSlopeVector(riverSlope);
  if (!vector) return fallback(vertices);

  const scored = vertices.map((vertex) => ({
    vertex,
    score: vertex.x * vector.x + vertex.y * vector.y
  }));
  const targetScore = flowPosition === 'downstream'
    ? Math.max(...scored.map((item) => item.score))
    : Math.min(...scored.map((item) => item.score));
  const epsilon = 0.001;
  const extremeVertices = scored
    .filter((item) => Math.abs(item.score - targetScore) < epsilon)
    .map((item) => item.vertex);
  return fallback(extremeVertices);
}

function orderRiverSlopeVertices(
  vertices: RiverVertex[],
  riverSlope: RiverSlopeInfo | undefined,
  flowPosition: 'downstream' | 'upstream'
): RiverVertex[] {
  const vector = getRiverSlopeVector(riverSlope);
  if (!vector) return [...vertices];

  return [...vertices].sort((a, b) => {
    const scoreA = a.x * vector.x + a.y * vector.y;
    const scoreB = b.x * vector.x + b.y * vector.y;
    return flowPosition === 'downstream'
      ? scoreB - scoreA
      : scoreA - scoreB;
  });
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

function findBestPathFromSourceToOutgoingEndpointImpl(
  sourceVertices: RiverVertex[],
  outgoingEndpoint: RiverEndpointTouch,
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  options?: { requireCenterHexVertex?: AxialHex; occupiedVertexKeys?: Set<string>; allowedOccupiedVertexKeys?: Set<string>; riverSlope?: RiverSlopeInfo }
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
    if (!bestPath) {
      bestPath = path;
      continue;
    }
    const currentProjection = getRiverSlopeProjection(path[0], options?.riverSlope);
    const bestProjection = getRiverSlopeProjection(bestPath[0], options?.riverSlope);
    if (currentProjection !== null && bestProjection !== null) {
      if (currentProjection < bestProjection - 0.001 || (Math.abs(currentProjection - bestProjection) < 0.001 && path.length < bestPath.length)) bestPath = path;
    } else if (path.length < bestPath.length) bestPath = path;
  }
  return bestPath;
}
const findBestPathFromSourceToOutgoingEndpoint = __profiled('  ↳ findBestPathFromSourceToOutgoingEndpoint', findBestPathFromSourceToOutgoingEndpointImpl);

function findBestPathFromLakeToOutgoingEndpoint(
  lakeVertices: RiverVertex[],
  outgoingEndpoint: RiverEndpointTouch,
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string> = new Set(),
  riverSlope?: RiverSlopeInfo
): RiverVertex[] | null {
  return findBestPathFromSourceToOutgoingEndpoint(lakeVertices, outgoingEndpoint, riverGraph, usedRiverEdges, {
    occupiedVertexKeys,
    allowedOccupiedVertexKeys: new Set([outgoingEndpoint.vertex.key]),
    riverSlope
  });
}

function chooseRandomRegionExteriorVertexPair(regionExteriorVertices: RiverVertex[], rng: RandomStreams = fallbackRandomStreams): { startVertex: RiverVertex; endVertex: RiverVertex } | null {
  if (regionExteriorVertices.length < 2) return null;
  const startVertex = randomFrom(regionExteriorVertices, rng);
  const endPool = regionExteriorVertices.filter((vertex) => vertex.key !== startVertex.key);
  if (endPool.length === 0) return null;
  return { startVertex, endVertex: randomFrom(endPool, rng) };
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

function getRiverPathEdgeKeysImpl(vertexPath: RiverVertex[], riverGraph: RiverGraph): string[] | undefined {
  if (!vertexPath || vertexPath.length < 2) return [];
  const edgeKeys: string[] = [];
  for (let i = 1; i < vertexPath.length; i += 1) {
    const segmentEdge = riverGraph.edges.get(edgeKey(vertexPath[i - 1], vertexPath[i]));
    if (!segmentEdge) return undefined;
    edgeKeys.push(segmentEdge.key);
  }
  return edgeKeys;
}
const getRiverPathEdgeKeys = __profiled('  ↳ getRiverPathEdgeKeys', getRiverPathEdgeKeysImpl);

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

function validateNoDuplicateRiverEdgesImpl(rivers: River[]): void {
  const seen = new Map<string, { regionId: number; riverId: number }>();

  for (const river of rivers) {
    if (!river.vertexPath || river.vertexPath.length < 2) continue;
    for (let i = 1; i < river.vertexPath.length; i += 1) {
      const key = edgeKey(river.vertexPath[i - 1], river.vertexPath[i]);

      if (seen.has(key)) {
        generationLog.warning('Duplicate river edge detected', {
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
const validateNoDuplicateRiverEdges = __profiled('  ↳ validateNoDuplicateRiverEdges', validateNoDuplicateRiverEdgesImpl);

function reverseRiverPath(vertexPath: RiverVertex[]): RiverVertex[] {
  return [...vertexPath].reverse().map((vertex) => ({ ...vertex }));
}

function validateRiverDirectionImpl(river: River): void {
  if (!river.vertexPath || river.vertexPath.length < 2) return;
  for (let i = 0; i < river.vertexPath.length - 1; i += 1) {
    if (river.vertexPath[i].key === river.vertexPath[i + 1].key) {
      generationLog.warning('Broken river direction/order', {
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
      generationLog.warning('Multiple outgoing river segments from one startPoint', { riverId: river.id, vertexKey, outgoing });
    }
  }
}
const validateRiverDirection = __profiled('  ↳ validateRiverDirection', validateRiverDirectionImpl);

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

function validateRiverContinuityImpl(river: River): boolean {
  if (!river?.vertexPath || river.vertexPath.length < 2) return true;
  for (let i = 0; i < river.vertexPath.length - 1; i += 1) {
    const current = river.vertexPath[i];
    const next = river.vertexPath[i + 1];
    if (!current || !next || current.key === next.key) {
      generationLog.warning('Broken river continuity', { riverId: river.id, index: i });
      return false;
    }
  }
  return true;
}
const validateRiverContinuity = __profiled('  ↳ validateRiverContinuity', validateRiverContinuityImpl);

const findRiverEndpointsTouchingRegion = __profiled('findRiverEndpointsTouchingRegion', findRiverEndpointsTouchingRegionImpl);
function findRiverEndpointsTouchingRegionImpl(region: Region, rivers: River[], riverGraph: RiverGraph): RiverEndpointTouch[] {
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

const getRiverHeightConstraintForCandidateRegion = __profiled('getRiverHeightConstraintForCandidateRegion', getRiverHeightConstraintForCandidateRegionImpl);
function getRiverHeightConstraintForCandidateRegionImpl(
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

  const preferredHeight = getOnlyOutgoingRiversPreferredHeight(
    touchingEndpoints.map((endpoint) => {
      const river = existingRivers.find((item) => item.id === endpoint.riverId);
      return {
        endpointType: endpoint.endpointType,
        touchingHeight: findRegionTouchingVertex(endpoint.vertex, existingRegions)?.heightLevel,
        fullness: river ? getRiverEndpointSectorFullness(river, endpoint.vertex.key) : undefined
      };
    })
  );
  if (preferredHeight !== undefined) {
    reasons.push(`only outgoing rivers: prefer height ${preferredHeight}`);
  }

  return { minHeight, maxHeight, preferredHeight, reasons };
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
    generationLog.warning('Trimming outgoing river start away from new region', {
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

function mergeRiversWithConnectorImpl(
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
    generationLog.warning('Cannot merge rivers: missing river', { upstreamRiverId, downstreamRiverId });
    return null;
  }
  if (wouldCreateRiverDrainageCycle(existingRivers, upstreamRiverId, downstreamRiverId)) {
    generationLog.warning('Cannot merge rivers: connection would create a drainage cycle', { upstreamRiverId, downstreamRiverId });
    return null;
  }
  if (!upstreamRiver.vertexPath?.length || !downstreamRiver.vertexPath?.length || connectorPath.length < 2) {
    generationLog.warning('Cannot merge rivers: invalid path data', { upstreamRiverId, downstreamRiverId });
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
const mergeRiversWithConnector = __profiled('  ↳ mergeRiversWithConnector', mergeRiversWithConnectorImpl);


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
  terrainMap: Map<string, HexTerrainData>, rng: RandomStreams = fallbackRandomStreams
): { lakeId: number; hexes: AxialHex[] } | null {
  const targetHexCount = Math.max(1, lakeHexCount);
  const availableRegionHexes = region.hexes.filter((hex) => !isLakeHex(hex, terrainMap));
  if (availableRegionHexes.length === 0) return null;

  const lakeId = getNextLakeIdFromTerrain(terrainMap);
  const splitVertexTouchingHexes = availableRegionHexes.filter((hex) => getHexCornerPoints(hex).some((corner) => corner.key === splitVertex.key));
  if (!splitVertexTouchingHexes.length || availableRegionHexes.length < targetHexCount) return null;
  const seedHexes = splitVertexTouchingHexes;
  const seedHex = randomFrom(seedHexes, rng);
  const regionHexByKey = new Map(availableRegionHexes.map((hex) => [hexKey(hex), hex]));
  const seedKey = hexKey(seedHex);
  const selectedKeys = new Set<string>([seedKey]);

  // Расстояние гекс→вершина статично: считаем один раз, а не в компараторе каждого шага.
  const distByKey = new Map<string, number>();
  for (const hex of availableRegionHexes) distByKey.set(hexKey(hex), getHexCenterDistanceToVertex(hex, splitVertex));

  // Фронтир ведём инкрементально в порядке ПЕРВОГО ОБНАРУЖЕНИЯ. Раньше фронтир каждый шаг
  // пересобирался flatMap-ом по всем выбранным и полностью пересортировывался (O(target²·log)).
  // Порядок обнаружения совпадает с порядком первого вхождения в прежнем flatMap (выбранные
  // раскрываются в порядке добавления, соседи — в фиксированном порядке), поэтому выбор
  // «ближайший к вершине, при равенстве — раньше обнаруженный» идентичен прежнему
  // frontier.sort(byDist)[0] со стабильной сортировкой.
  const frontierOrder: string[] = [];
  const frontierSet = new Set<string>();
  const expandFrontier = (hex: AxialHex) => {
    for (const neighbor of getHexNeighbors(hex)) {
      const neighborKey = hexKey(neighbor);
      if (!regionHexByKey.has(neighborKey)) continue;
      if (selectedKeys.has(neighborKey) || frontierSet.has(neighborKey)) continue;
      frontierSet.add(neighborKey);
      frontierOrder.push(neighborKey);
    }
  };
  expandFrontier(seedHex);

  while (selectedKeys.size < targetHexCount && selectedKeys.size < availableRegionHexes.length) {
    // Первый (в порядке обнаружения) невыбранный фронтир-гекс с минимальным расстоянием.
    let nextKey: string | undefined;
    let bestDist = Infinity;
    for (const key of frontierOrder) {
      if (selectedKeys.has(key)) continue;
      const dist = distByKey.get(key)!;
      if (dist < bestDist) {
        bestDist = dist;
        nextKey = key;
      }
    }

    if (nextKey === undefined) break;
    selectedKeys.add(nextKey);
    const nextHex = regionHexByKey.get(nextKey);
    if (nextHex) expandFrontier(nextHex);
  }

  const lakeHexes = Array.from(selectedKeys)
    .map((key) => regionHexByKey.get(key))
    .filter((hex): hex is AxialHex => Boolean(hex));
  if (lakeHexes.length < targetHexCount) return null;
  for (const hex of lakeHexes) {
    terrainMap.set(hexKey(hex), { terrainOverride: 'lake', lakeId });
  }

  generationLog.detail('Created river fullness drop lake', {
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

function ensureCentralAdjacentLakeWhenNoRiverTouchesCenterImpl(
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
  generationLog.detail('Created central fallback lake because no river touches central hex', {
    regionId: region.id,
    lakeId,
    centerHexKey: hexKey(region.centerHex),
    lakeHexKey: hexKey(lakeHex),
  });
}
const ensureCentralAdjacentLakeWhenNoRiverTouchesCenter = __profiled('    ↳↳ ensureCentralAdjacentLakeWhenNoRiverTouchesCenter', ensureCentralAdjacentLakeWhenNoRiverTouchesCenterImpl);

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
  connectorPath: RiverVertex[], rng: RandomStreams = fallbackRandomStreams
): RiverConnectorSplit | null | undefined {
  const upstreamFullness = getEndpointFullnessForRiver(existingRivers, upstreamRiverId, upstreamVertex.key);
  const downstreamFullness = getEndpointFullnessForRiver(existingRivers, downstreamRiverId, downstreamVertex.key);
  if (upstreamFullness === null || downstreamFullness === null) return undefined;
  if (upstreamFullness <= downstreamFullness) return undefined;

  const splitCandidateVertices = connectorPath;
  if (splitCandidateVertices.length === 0) return null;

  return {
    vertex: randomFrom(splitCandidateVertices, rng),
    upstreamFullness,
    downstreamFullness
  };
}

function addConnectorSplitLakeIfNeeded(
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  connectorSplit?: RiverConnectorSplit, rng: RandomStreams = fallbackRandomStreams
): void {
  if (!connectorSplit) return;
  addLakeAroundRiverSplitVertex(
    region,
    connectorSplit.vertex,
    connectorSplit.upstreamFullness - connectorSplit.downstreamFullness,
    terrainMap, rng
  );
}


function connectIncomingTributariesToMainPath(
  region: Region,
  rivers: River[],
  tributaryEndpoints: RiverEndpointTouch[],
  mainPath: RiverVertex[],
  riverGraph: RiverGraph,
  initialBlockedEdgeKeys: Set<string>,
  initialOccupiedVertexKeys: Set<string>,
  riverSlope?: RiverSlopeInfo
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
      new Set([endpoint.vertex.key, ...allowedTargetKeys]),
      riverSlope
    );
    if (!tributaryPath) {
      generationLog.warning('Could not connect incoming tributary to through river', {
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
  riverSlope?: RiverSlopeInfo, rng: RandomStreams = fallbackRandomStreams
): { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex; startMode: 'existing river endpoint' | 'red vertex' } | null {
  const choosePreferredEndVertex = (endPool: RiverVertex[]): RiverVertex => chooseRiverSlopeExtremeVertex(endPool, riverSlope, 'downstream', vertices => randomFrom(vertices, rng));

  if (existingRiverEndpointVerticesInRegion.length > 0) {
    if (redVertices.length < 1) return null;
    const startVertex = randomFrom(existingRiverEndpointVerticesInRegion, rng);
    const endPool = redVertices.filter((vertex) => vertex.key !== startVertex.key);
    if (endPool.length === 0) return null;
    const endVertex = choosePreferredEndVertex(endPool);
    if (purpleVertices.length === 0) return { startVertex, endVertex, startMode: 'existing river endpoint' };
    const preferredMiddle = purpleVertices.filter((vertex) => vertex.key !== startVertex.key && vertex.key !== endVertex.key);
    const middlePool = preferredMiddle.length > 0 ? preferredMiddle : purpleVertices;
    return { startVertex, middlePurpleVertex: randomFrom(middlePool, rng), endVertex, startMode: 'existing river endpoint' };
  }
  if (redVertices.length < 2) return null;
  const startVertex = chooseRiverSlopeExtremeVertex(redVertices, riverSlope, 'upstream', vertices => randomFrom(vertices, rng));
  const candidateEndVertices = redVertices.filter((vertex) => vertex.key !== startVertex.key);
  if (candidateEndVertices.length === 0) return null;
  const endVertex = choosePreferredEndVertex(candidateEndVertices);
  generationLog.detail('River red endpoint selection', {
    mode: 'river_slope',
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
  const middlePurpleVertex = randomFrom(middlePool, rng);
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
  // Для прибрежного региона устье ищем только среди сухопутных/пустых
  // кандидатных гексов: река не должна сразу завершаться в уже существующем
  // морском гексе. При этом сохраняем приоритет кандидатов, ближайших к морю.
  return getCandidateHexesNearestToSea(candidateHexes, hexTerrainByKey);
}

function getBlockedRiverEndpointBoundaryEdgeKeys(
  node: RiverGraphNode | undefined,
  blockedEdgeKeys: Set<string>
): Set<string> {
  const nextBlockedEdgeKeys = new Set(blockedEdgeKeys);
  if (!node?.isCandidateBoundaryVertex) return nextBlockedEdgeKeys;

  // Candidate-facing river endpoints are selected at gate vertices: one edge
  // leads into the region while two edges lie on the candidate/region border.
  // The terminal river segment must use the inward edge, so boundary edges are
  // blocked while pathfinding away from or toward such an endpoint.
  for (const edgeKey of node.candidateBoundaryIncidentEdgeKeys) {
    nextBlockedEdgeKeys.add(edgeKey);
  }
  return nextBlockedEdgeKeys;
}

function isInteriorTerminalRiverEdge(
  endpointVertex: RiverVertex,
  adjacentVertex: RiverVertex,
  riverGraph: RiverGraph
): boolean {
  const endpointNode = riverGraph.nodes.get(endpointVertex.key);
  if (!endpointNode?.isCandidateBoundaryVertex) return true;
  const terminalEdge = riverGraph.edges.get(edgeKey(endpointVertex, adjacentVertex));
  return Boolean(terminalEdge?.isInsideRegionEdge && !terminalEdge.isCandidateBoundaryEdge);
}

function buildRiverPathViaControlPointsImpl(
  controlPoints: { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex },
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string> = new Set()
): RiverVertex[] {
  const startNode = riverGraph.nodes.get(controlPoints.startVertex.key);
  const endNode = riverGraph.nodes.get(controlPoints.endVertex.key);
  if (!startNode || !endNode) return [];
  if (!controlPoints.middlePurpleVertex) {
    const endpointBlockedEdgeKeys = getBlockedRiverEndpointBoundaryEdgeKeys(
      endNode,
      getBlockedRiverEndpointBoundaryEdgeKeys(startNode, blockedEdgeKeys)
    );
    return findRiverPath(startNode, endNode, riverGraph, endpointBlockedEdgeKeys).map((node) => ({ key: node.key, x: node.x, y: node.y }));
  }
  const middleNode = riverGraph.nodes.get(controlPoints.middlePurpleVertex.key);
  if (!middleNode) return [];
  const path1 = findRiverPath(
    startNode,
    middleNode,
    riverGraph,
    getBlockedRiverEndpointBoundaryEdgeKeys(startNode, blockedEdgeKeys)
  );
  const path2 = findRiverPath(
    middleNode,
    endNode,
    riverGraph,
    getBlockedRiverEndpointBoundaryEdgeKeys(endNode, blockedEdgeKeys)
  );
  if (path1.length < 1 || path2.length < 1) return [];
  const joined = [...path1, ...path2.slice(1)];
  return joined.map((node) => ({ key: node.key, x: node.x, y: node.y }));
}
const buildRiverPathViaControlPoints = __profiled('  ↳ buildRiverPathViaControlPoints', buildRiverPathViaControlPointsImpl);

function findBestConnectorPathBetweenRiverEndpointsImpl(
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
const findBestConnectorPathBetweenRiverEndpoints = __profiled('  ↳ findBestConnectorPathBetweenRiverEndpoints', findBestConnectorPathBetweenRiverEndpointsImpl);

function findBestFreeRiverPathFromEndpointsImpl(
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
const findBestFreeRiverPathFromEndpoints = __profiled('  ↳ findBestFreeRiverPathFromEndpoints', findBestFreeRiverPathFromEndpointsImpl);

function riverPathAvoidsOccupiedVertices(
  vertexPath: RiverVertex[],
  occupiedVertexKeys: Set<string>,
  allowedOccupiedVertexKeys: Set<string> = new Set()
): boolean {
  return vertexPath.every((vertex) => !occupiedVertexKeys.has(vertex.key) || allowedOccupiedVertexKeys.has(vertex.key));
}

function validateRiverPathViaControlPointsImpl(
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
  if (controlPoints.startMode === 'red vertex' && !firstEdge?.isInsideRegionEdge) return false;
  if (!lastEdge?.isInsideRegionEdge) return false;
  if (hasCandidateBoundary && controlPoints.startMode === 'red vertex' && !isInteriorTerminalRiverEdge(vertexPath[0], vertexPath[1], riverGraph)) return false;
  if (hasCandidateBoundary && !isInteriorTerminalRiverEdge(vertexPath[vertexPath.length - 1], vertexPath[vertexPath.length - 2], riverGraph)) return false;
  if (hasDuplicateEdgeKeys(riverPathEdgeKeys)) return false;
  if (riverPathEdgeKeys.some((pathEdgeKey) => usedRiverEdges.has(pathEdgeKey))) return false;
  if (!riverPathAvoidsOccupiedVertices(vertexPath, occupiedVertexKeys, allowedOccupiedVertexKeys)) return false;
  return true;
}
const validateRiverPathViaControlPoints = __profiled('  ↳ validateRiverPathViaControlPoints', validateRiverPathViaControlPointsImpl);

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

export function rollRegionTargetSize(rng: RandomStreams = fallbackRandomStreams): number {
  const roll = randomInt(1, 100, rng);
  if (roll <= 5) return randomInt(6, 10, rng);
  if (roll <= 40) return randomInt(11, 20, rng);
  if (roll <= 65) return randomInt(21, 30, rng);
  if (roll <= 83) return randomInt(31, 40, rng);
  if (roll <= 95) return randomInt(41, 50, rng);
  return randomInt(51, 60, rng);
}

export function getRegionSizeCategory(size: number): Pick<Region, 'sizeCategory' | 'sizeLabel'> {
  if (size >= 1 && size <= 5) return { sizeCategory: 'tract', sizeLabel: 'Урочище' };
  if (size >= 6 && size <= 10) return { sizeCategory: 'locality', sizeLabel: 'Местность' };
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

function createEmptyRiverSlopeDirectionScores(): Record<RiverSlopeDirection, number> {
  return {
    E: 0,
    NE: 0,
    NW: 0,
    W: 0,
    SW: 0,
    SE: 0
  };
}

function getNearestRiverSlopeDirection(from: RiverVertex, to: RiverVertex): RiverSlopeDirection {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return 'E';

  const nx = dx / length;
  const ny = dy / length;
  let best = RIVER_SLOPE_DIRECTIONS[0];
  let bestDot = -Infinity;
  for (const direction of RIVER_SLOPE_DIRECTIONS) {
    const dot = nx * direction.vector.x + ny * direction.vector.y;
    if (dot > bestDot) {
      bestDot = dot;
      best = direction;
    }
  }
  return best.label;
}

function buildRiverEdgeHexesByKey(hexes: AxialHex[]): Map<string, AxialHex[]> {
  const edgeHexesByKey = new Map<string, AxialHex[]>();
  for (const hex of hexes) {
    for (const edge of getHexEdgesAsVertexPairs(hex)) {
      const edgeHexes = edgeHexesByKey.get(edge.edgeKey) ?? [];
      edgeHexes.push(hex);
      edgeHexesByKey.set(edge.edgeKey, edgeHexes);
    }
  }
  return edgeHexesByKey;
}

function getRiverSlopeEdgeDistance(centerHex: AxialHex, edgeKeyValue: string, edgeHexesByKey: Map<string, AxialHex[]>): number | null {
  const edgeHexes = edgeHexesByKey.get(edgeKeyValue);
  if (!edgeHexes || edgeHexes.length === 0) return null;
  return Math.min(...edgeHexes.map((hex) => hexDistance(centerHex, hex)));
}

function createRandomRiverSlopeInfo(radius: number, rng: RandomStreams = fallbackRandomStreams): RiverSlopeInfo {
  const direction = randomFrom(RIVER_SLOPE_DIRECTIONS, rng);
  const directionScores = createEmptyRiverSlopeDirectionScores();
  directionScores[direction.label] = 1;

  return {
    radius,
    edgeCount: 0,
    totalContribution: 1,
    vector: direction.vector,
    strength: 1,
    confidence: 1,
    direction: direction.label,
    directionScores
  };
}

const calculateRiverSlopeInfo = __profiled('calculateRiverSlopeInfo', calculateRiverSlopeInfoImpl);
function calculateRiverSlopeInfoImpl(
  centerHex: AxialHex,
  existingHexes: AxialHex[],
  rivers: River[],
  radius = RIVER_SLOPE_RADIUS, rng: RandomStreams = fallbackRandomStreams
): RiverSlopeInfo {
  const directionScores = createEmptyRiverSlopeDirectionScores();
  const edgeHexesByKey = buildRiverEdgeHexesByKey(existingHexes);
  let edgeCount = 0;

  for (const river of rivers) {
    for (const sector of river.sectors) {
      for (let i = 1; i < sector.vertexPath.length; i += 1) {
        const from = sector.vertexPath[i - 1];
        const to = sector.vertexPath[i];
        const currentEdgeKey = getRiverEdgeKey(from, to);
        const rawDistance = getRiverSlopeEdgeDistance(centerHex, currentEdgeKey, edgeHexesByKey);
        if (rawDistance === null || rawDistance > radius) continue;

        const distance = Math.max(1, rawDistance);
        const contribution = sector.fullness / distance;
        const direction = getNearestRiverSlopeDirection(from, to);
        directionScores[direction] += contribution;
        edgeCount += 1;
      }
    }
  }

  let vector = { x: 0, y: 0 };
  for (const direction of RIVER_SLOPE_DIRECTIONS) {
    const score = directionScores[direction.label];
    vector = {
      x: vector.x + direction.vector.x * score,
      y: vector.y + direction.vector.y * score
    };
  }

  const totalContribution = Object.values(directionScores).reduce((sum, score) => sum + score, 0);
  if (totalContribution <= 0) {
    return createRandomRiverSlopeInfo(radius, rng);
  }

  const strength = Math.hypot(vector.x, vector.y);
  const confidence = totalContribution > 0 ? strength / totalContribution : 0;
  const direction = strength > 0
    ? RIVER_SLOPE_DIRECTIONS.reduce((best, current) => (
      vector.x * current.vector.x + vector.y * current.vector.y > vector.x * best.vector.x + vector.y * best.vector.y
        ? current
        : best
    ), RIVER_SLOPE_DIRECTIONS[0]).label
    : 'none';

  return {
    radius,
    edgeCount,
    totalContribution,
    vector,
    strength,
    confidence,
    direction,
    directionScores
  };
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

function buildRiverGraphForRegionImpl(regionHexes: AxialHex[], allHexes: AxialHex[], candidateHexes: AxialHex[] = []): RiverGraph {
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
const buildRiverGraphForRegion = __profiled('  ↳ buildRiverGraphForRegion', buildRiverGraphForRegionImpl);

function findRiverPathImpl(
  startNode: RiverGraphNode,
  endNode: RiverGraphNode,
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string> = new Set()
): RiverGraphNode[] {
  const previous = new Map<string, string>();
  const queue: string[] = [startNode.key];
  const visited = new Set<string>([startNode.key]);
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const currentKey = queue[queueIndex]!;
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
const findRiverPath = __profiled('findRiverPath', findRiverPathImpl);

function findBestFreeRiverPathToAnyTargetImpl(
  startVertex: RiverVertex,
  targetVertices: RiverVertex[],
  riverGraph: RiverGraph,
  blockedEdgeKeys: Set<string>,
  excludedTargetVertexKeys: Set<string> = new Set(),
  occupiedVertexKeys: Set<string> = new Set(),
  allowedOccupiedVertexKeys: Set<string> = new Set(),
  riverSlope?: RiverSlopeInfo
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

    if (!bestPath) {
      bestPath = path;
      continue;
    }
    const currentProjection = getRiverSlopeProjection(path[path.length - 1], riverSlope);
    const bestProjection = getRiverSlopeProjection(bestPath[bestPath.length - 1], riverSlope);
    if (currentProjection !== null && bestProjection !== null) {
      if (currentProjection > bestProjection + 0.001 || (Math.abs(currentProjection - bestProjection) < 0.001 && path.length < bestPath.length)) bestPath = path;
    } else if (path.length < bestPath.length) {
      bestPath = path;
    }
  }

  return bestPath;
}
const findBestFreeRiverPathToAnyTarget = __profiled('  ↳ findBestFreeRiverPathToAnyTarget', findBestFreeRiverPathToAnyTargetImpl);

function buildBoundingBox(occupiedHexes: Set<string>, padding = 2): { minQ: number; maxQ: number; minR: number; maxR: number } {
  // Один проход вместо четырёх Math.min/max(...spread) с промежуточными .map().
  // Идентичный результат, без риска переполнения стека на очень больших множествах.
  let minQ = Infinity;
  let maxQ = -Infinity;
  let minR = Infinity;
  let maxR = -Infinity;
  for (const key of occupiedHexes) {
    const { q, r } = parseHexKey(key);
    if (q < minQ) minQ = q;
    if (q > maxQ) maxQ = q;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
  }
  if (minQ === Infinity) {
    return { minQ: -padding, maxQ: padding, minR: -padding, maxR: padding };
  }
  return {
    minQ: minQ - padding,
    maxQ: maxQ + padding,
    minR: minR - padding,
    maxR: maxR + padding
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

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex]!;
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
  zeroWeightHexes: Set<string> = new Set(),
  neutralOccupiedNeighborWeightHexes: Set<string> = new Set(),
  growthWeightExponent = 1
): GrowthCandidate | null {
  let currentRegionNeighborCount = 0;
  let existingRegionNeighborCount = 0;

  for (const neighbor of getHexNeighbors(candidate)) {
    const neighborKey = hexKey(neighbor);
    if (currentRegionHexes.has(neighborKey)) {
      currentRegionNeighborCount += 1;
    } else if (occupiedHexes.has(neighborKey) && !neutralOccupiedNeighborWeightHexes.has(neighborKey)) {
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
    totalGrowthWeight: zeroWeightHexes.has(hexKey(candidate))
      ? 0
      : Math.pow(currentRegionNeighborCount + existingRegionNeighborCount, growthWeightExponent)
  };
}

export function weightedPickCandidate(candidates: GrowthCandidate[], rng: RandomStreams = fallbackRandomStreams): GrowthCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce((acc, candidate) => acc + candidate.totalGrowthWeight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  let roll = rng.geography() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.totalGrowthWeight;
    if (roll <= 0) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

function findFillableEnclosedEmptyAreasImpl(
  currentRegionHexes: Set<string>,
  occupiedHexes: Set<string>,
  precomputedFrontier?: AxialHex[]
): AxialHex[][] {
  const blockedHexes = new Set([...occupiedHexes, ...currentRegionHexes]);
  const bbox = buildBoundingBox(blockedHexes, 2);
  const visitedEmpty = new Set<string>();
  const enclosedAreas: AxialHex[][] = [];
  const frontierCandidates = precomputedFrontier ?? getFrontierCandidateHexes(currentRegionHexes, occupiedHexes);

  for (const start of frontierCandidates) {
    const startKey = hexKey(start);
    if (visitedEmpty.has(startKey) || blockedHexes.has(startKey)) continue;
    const area = scanEmptyArea(start, blockedHexes, bbox, visitedEmpty);
    if (!area.isOpen) enclosedAreas.push(Array.from(area.areaKeys).map(parseHexKey));
  }

  return enclosedAreas;
}
// Профилируется: зовётся на каждом шаге роста региона (см. ?profile).
export const findFillableEnclosedEmptyAreas = __profiled('findFillableEnclosedEmptyAreas (замыкания, каждый шаг роста)', findFillableEnclosedEmptyAreasImpl);

function getFrontierCandidateHexesImpl(currentRegionHexes: Set<string>, occupiedHexes: Set<string>): AxialHex[] {
  const frontierMap = new Map<string, AxialHex>();
  for (const regionHex of Array.from(currentRegionHexes).map(parseHexKey)) {
    for (const neighbor of getHexNeighbors(regionHex)) {
      const key = hexKey(neighbor);
      if (!currentRegionHexes.has(key) && !occupiedHexes.has(key)) frontierMap.set(key, neighbor);
    }
  }
  return Array.from(frontierMap.values());
}
// Профилируется: пересобирает фронтир из всех гексов региона каждый шаг роста (см. ?profile).
export const getFrontierCandidateHexes = __profiled('getFrontierCandidateHexes (фронтир, каждый шаг роста)', getFrontierCandidateHexesImpl);

// Инкрементальное обновление фронтира при добавлении гекса в регион. Множество фронтира =
// «пустые не-занятые гексы, соседние с регионом» — то же, что возвращает getFrontierCandidateHexes.
// Порядок вставки (Map) совпадает с порядком перечисления getFrontierCandidateHexes (гексы региона
// в порядке добавления × соседи в фиксированном порядке, по первому обнаружению), поэтому список
// Array.from(frontier.values()) идентичен по составу И порядку. Это важно: и findFillable, и
// weightedPickCandidate зависят от порядка кандидатов.
function addHexToRegionWithFrontier(
  hex: AxialHex,
  regionKeys: Set<string>,
  occupiedHexes: Set<string>,
  frontier: Map<string, AxialHex>
): void {
  frontier.delete(hexKey(hex));
  regionKeys.add(hexKey(hex));
  for (const neighbor of getHexNeighbors(hex)) {
    const neighborKey = hexKey(neighbor);
    if (!regionKeys.has(neighborKey) && !occupiedHexes.has(neighborKey) && !frontier.has(neighborKey)) {
      frontier.set(neighborKey, neighbor);
    }
  }
}

export const generateConnectedRegionFromAnchor = __profiled('generateConnectedRegionFromAnchor', generateConnectedRegionFromAnchorImpl);
function generateConnectedRegionFromAnchorImpl(
  anchorHex: AxialHex,
  size: number,
  occupiedHexes: Set<string>,
  zeroWeightHexes: Set<string> = new Set(),
  neutralOccupiedNeighborWeightHexes: Set<string> = new Set(), rng: RandomStreams = fallbackRandomStreams
): AxialHex[] {
  const targetSize = Math.max(1, size);
  const regionKeys = new Set<string>([hexKey(anchorHex)]);
  // Инкрементальный фронтир вместо пересборки getFrontierCandidateHexes(regionKeys) каждый шаг.
  // Считается один раз за итерацию и переиспользуется findFillable-ом и шагом роста.
  const frontier = new Map<string, AxialHex>();
  addHexToRegionWithFrontier(anchorHex, regionKeys, occupiedHexes, frontier);
  while (true) {
    const frontierCandidates = Array.from(frontier.values());
    const enclosedAreas = findFillableEnclosedEmptyAreas(regionKeys, occupiedHexes, frontierCandidates);
    if (enclosedAreas.length > 0) {
      let addedEnclosedHex = false;
      for (const area of enclosedAreas) {
        for (const hex of area) {
          if (zeroWeightHexes.has(hexKey(hex))) continue;
          addHexToRegionWithFrontier(hex, regionKeys, occupiedHexes, frontier);
          addedEnclosedHex = true;
        }
      }
      if (addedEnclosedHex) continue;
    }

    if (regionKeys.size >= targetSize) break;

    const growthCandidates = frontierCandidates
      .map((candidate) => getGrowthCandidate(candidate, regionKeys, occupiedHexes, zeroWeightHexes, neutralOccupiedNeighborWeightHexes))
      .filter((candidate): candidate is GrowthCandidate => candidate !== null);
    const picked = weightedPickCandidate(growthCandidates, rng);
    if (!picked) break;
    addHexToRegionWithFrontier(picked.hex, regionKeys, occupiedHexes, frontier);
  }

  return Array.from(regionKeys).map(parseHexKey);
}

function generateFallbackTractFromAnchor(anchorHex: AxialHex, occupiedHexes: Set<string>, targetSize: number | undefined = undefined, rng: RandomStreams = fallbackRandomStreams): AxialHex[] {
  targetSize ??= rollTractTargetSize(rng);
  const regionKeys = new Set<string>([hexKey(anchorHex)]);
  const frontier = new Map<string, AxialHex>();
  addHexToRegionWithFrontier(anchorHex, regionKeys, occupiedHexes, frontier);

  while (true) {
    const frontierCandidates = Array.from(frontier.values());
    const enclosedAreas = findFillableEnclosedEmptyAreas(regionKeys, occupiedHexes, frontierCandidates);
    if (enclosedAreas.length > 0) {
      let addedEnclosedHex = false;
      for (const area of enclosedAreas) {
        for (const hex of area) {
          const key = hexKey(hex);
          if (occupiedHexes.has(key) || regionKeys.has(key)) continue;
          addHexToRegionWithFrontier(hex, regionKeys, occupiedHexes, frontier);
          addedEnclosedHex = true;
        }
      }
      if (addedEnclosedHex) continue;
    }

    if (regionKeys.size >= targetSize) break;

    const growthCandidates = frontierCandidates
      .map((candidate) => getGrowthCandidate(
        candidate,
        regionKeys,
        occupiedHexes,
        undefined,
        undefined,
        TRACT_GROWTH_WEIGHT_EXPONENT
      ))
      .filter((candidate): candidate is GrowthCandidate => candidate !== null);
    const picked = weightedPickCandidate(growthCandidates, rng);
    if (!picked) break;
    addHexToRegionWithFrontier(picked.hex, regionKeys, occupiedHexes, frontier);
  }

  return Array.from(regionKeys).map(parseHexKey);
}

function getSeaComponentIds(seaKeys: Set<string>): Map<string, number> {
  const componentIds = new Map<string, number>();
  let nextComponentId = 0;

  for (const seaKey of seaKeys) {
    if (componentIds.has(seaKey)) continue;

    const componentId = nextComponentId;
    nextComponentId += 1;
    const queue = [seaKey];
    componentIds.set(seaKey, componentId);

    for (let index = 0; index < queue.length; index += 1) {
      const currentKey = queue[index];
      for (const neighbor of getHexNeighbors(parseHexKey(currentKey))) {
        const neighborKey = hexKey(neighbor);
        if (!seaKeys.has(neighborKey) || componentIds.has(neighborKey)) continue;
        componentIds.set(neighborKey, componentId);
        queue.push(neighborKey);
      }
    }
  }

  return componentIds;
}

function getSeaKeysToFillForTractSeaTouch(
  tractHexes: AxialHex[],
  existingSeaKeys: Set<string>,
  candidateHexes: AxialHex[],
  hexTerrainByKey: Map<string, HexTerrainData>,
  rivers: River[]
): string[] {
  const seaComponentIds = getSeaComponentIds(existingSeaKeys);
  const touchedSeaComponentIds = new Set<number>();
  const tractKeys = new Set(tractHexes.map(hexKey));
  for (const tractHex of tractHexes) {
    for (const neighbor of getHexNeighbors(tractHex)) {
      const componentId = seaComponentIds.get(hexKey(neighbor));
      if (componentId !== undefined) touchedSeaComponentIds.add(componentId);
    }
  }

  if (touchedSeaComponentIds.size === 0) return [];

  const touchedSeaKeys = new Set<string>();
  for (const [seaKey, componentId] of seaComponentIds) {
    if (touchedSeaComponentIds.has(componentId)) touchedSeaKeys.add(seaKey);
  }

  const eligibleKeys = new Set<string>();
  for (const candidate of candidateHexes) {
    const key = hexKey(candidate);
    if (!getHexNeighbors(candidate).some((neighbor) => tractKeys.has(hexKey(neighbor)))) continue;
    if (hexTerrainByKey.get(key)?.terrainOverride === 'lake') continue;
    if (hexTouchesLake(candidate, hexTerrainByKey)) continue;
    if (getRiversForHex(candidate, rivers).length > 0) continue;
    eligibleKeys.add(key);
  }

  if (eligibleKeys.size === 0) return [];

  const seaAndEligibleKeys = new Set<string>(touchedSeaKeys);
  for (const key of eligibleKeys) seaAndEligibleKeys.add(key);
  const connectedToTouchedSea = getConnectedSeaComponent(touchedSeaKeys, seaAndEligibleKeys);

  return Array.from(eligibleKeys).filter((key) => connectedToTouchedSea.has(key));
}

export function chooseRegionCenter(regionHexes: AxialHex[], rng: RandomStreams = fallbackRandomStreams): AxialHex {
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

  return randomFrom(bestCenterCandidates, rng);
}

function getBiomeColor(biomeId: BiomeId | undefined): string {
  if (!biomeId) return BIOMES[FALLBACK_BIOME_ID].color;
  return BIOMES[biomeId]?.color ?? BIOMES[FALLBACK_BIOME_ID].color;
}

export const getCandidateHexes = __profiled('getCandidateHexes', getCandidateHexesImpl);
function getCandidateHexesImpl(allRegionHexes: AxialHex[], excludeKeys?: Set<string>): AxialHex[] {
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

function chooseCoastalCenterHex(regionHexes: AxialHex[], seaKeys: Set<string>, rivers: River[], rng: RandomStreams = fallbackRandomStreams): AxialHex | null {
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
  return randomFrom(candidates.filter((hex) => getHexSameRegionNeighborCount(hex, regionKeys) === maxNeighborCount), rng);
}

function chooseRiverMouthCenterHex(regionHexes: AxialHex[], rivers: River[], rng: RandomStreams = fallbackRandomStreams): AxialHex | null {
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
  return randomFrom(candidates.filter((hex) => getHexSameRegionNeighborCount(hex, regionKeys) === maxNeighborCount), rng);
}

function chooseSeaAdjacentCenterHex(regionHexes: AxialHex[], seaKeys: Set<string>, rng: RandomStreams = fallbackRandomStreams): AxialHex | null {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const candidates = regionHexes.filter((hex) => getHexNeighbors(hex).some((neighbor) => seaKeys.has(hexKey(neighbor))));
  if (candidates.length === 0) return null;
  const maxNeighborCount = Math.max(...candidates.map((hex) => getHexSameRegionNeighborCount(hex, regionKeys)));
  return randomFrom(candidates.filter((hex) => getHexSameRegionNeighborCount(hex, regionKeys) === maxNeighborCount), rng);
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

function expandConnectedSeaArea(seaKeys: Set<string>, candidates: Map<string, AxialHex>, rng: RandomStreams = fallbackRandomStreams): Set<string> {
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
    nextSeaKeys.add(randomFrom(outwardPool, rng));
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
    const coastalValidation = validateCoastalSeaArea(regionHexes, seaKeys, rivers);
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

function getConnectedSeaComponent(startKeys: Iterable<string>, seaKeys: Set<string>): Set<string> {
  const connected = new Set<string>();
  const queue: string[] = [];
  for (const startKey of startKeys) {
    if (!seaKeys.has(startKey) || connected.has(startKey)) continue;
    connected.add(startKey);
    queue.push(startKey);
  }

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

function getConnectedSeaComponents(seaKeys: Set<string>): Set<string>[] {
  const remaining = new Set(seaKeys);
  const components: Set<string>[] = [];

  while (remaining.size > 0) {
    const startKey = Array.from(remaining)[0];
    const component = getConnectedSeaComponent([startKey], seaKeys);
    components.push(component);
    for (const key of component) remaining.delete(key);
  }

  return components;
}

function splitNewSeaKeysByMouthConnectedComponent(newSeaKeys: string[], existingSeaKeys: Iterable<string>, rivers: River[]): { connectedSeaKeys: string[]; disconnectedSeaKeys: string[] } {
  const uniqueNewSeaKeys = Array.from(new Set(newSeaKeys));
  const existingSeaSet = new Set(existingSeaKeys);
  const combinedSeaKeys = new Set(existingSeaSet);
  for (const key of uniqueNewSeaKeys) combinedSeaKeys.add(key);

  const newSeaKeySet = new Set(uniqueNewSeaKeys);
  const mouthSeaKeys = uniqueNewSeaKeys.filter((key) => seaHexTouchesAnyRiverMouth(parseHexKey(key), rivers));

  let selectedComponent: Set<string> | null = null;
  if (mouthSeaKeys.length > 0) {
    // Если в прибрежном регионе есть устье, сохраняем старое поведение:
    // оставляем только связанную область моря, достижимую от гекса устья.
    // Новая логика выбора океанского/самого большого компонента нужна только
    // для побережья без устья.
    selectedComponent = getConnectedSeaComponent(mouthSeaKeys, combinedSeaKeys);
  } else if (existingSeaSet.size > 0) {
    selectedComponent = getConnectedSeaComponent(existingSeaSet, combinedSeaKeys);
  } else {
    const components = getConnectedSeaComponents(newSeaKeySet);
    selectedComponent = components.sort((a, b) => b.size - a.size)[0] ?? null;
  }

  if (!selectedComponent) return { connectedSeaKeys: [], disconnectedSeaKeys: uniqueNewSeaKeys };
  return {
    connectedSeaKeys: uniqueNewSeaKeys.filter((key) => selectedComponent.has(key)),
    disconnectedSeaKeys: uniqueNewSeaKeys.filter((key) => !selectedComponent.has(key))
  };
}


function filterCreatedSeaKeysForRegionAdjacentExistingSea(
  createdSeaKeys: string[],
  regionHexes: AxialHex[],
  existingSeaKeys: Set<string>,
  hexTerrainByKey: Map<string, HexTerrainData>,
  rivers: River[]
): string[] {
  if (createdSeaKeys.length === 0 || existingSeaKeys.size === 0) return createdSeaKeys;

  const regionKeys = new Set(regionHexes.map(hexKey));
  const eligibleCreatedSeaKeys = new Set<string>();
  for (const key of new Set(createdSeaKeys)) {
    const hex = parseHexKey(key);
    const touchesCreatedRegion = getHexNeighbors(hex).some((neighbor) => regionKeys.has(hexKey(neighbor)));
    if (!touchesCreatedRegion) continue;
    if (hexTouchesLake(hex, hexTerrainByKey)) continue;
    if (getRiversForHex(hex, rivers).length > 0) continue;
    eligibleCreatedSeaKeys.add(key);
  }
  if (eligibleCreatedSeaKeys.size === 0) return [];

  const connectedToExistingSea = getConnectedSeaComponent(existingSeaKeys, new Set([...existingSeaKeys, ...eligibleCreatedSeaKeys]));
  return Array.from(eligibleCreatedSeaKeys).filter((key) => connectedToExistingSea.has(key));
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
  return getConnectedSeaComponent([firstKey], seaKeys).size === seaKeys.size;
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
function getUnreachableSeaKeysImpl(landHexes: AxialHex[], seaKeys: Iterable<string>, rivers: River[] = []): Set<string> {
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
const getUnreachableSeaKeys = __profiled('getUnreachableSeaKeys', getUnreachableSeaKeysImpl);

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
  rivers: River[]
): CoastalSeaValidationResult {
  const seaKeys = new Set(seaHexKeys);
  if (seaKeys.size === 0) return { valid: false, reason: 'no_sea_hexes' };

  const regionKeys = new Set(regionHexes.map(hexKey));
  const seaHexTouchesRegion = (key: string) =>
    getHexNeighbors(parseHexKey(key)).some((neighbor) => regionKeys.has(hexKey(neighbor)));
  const touchesRegion = Array.from(seaKeys).some(seaHexTouchesRegion);
  if (!touchesRegion) return { valid: false, reason: 'sea_area_does_not_touch_region' };

  // Связность моря с открытым океаном здесь больше не проверяем: после
  // финальной геометрии региона новое море будет отфильтровано только по
  // связности с морским гексом устья реки. Если устье уже упирается в
  // существующее море, этот существующий гекс устья становится валидной
  // затравкой связного компонента.

  const riverHeightViolation = getRiverSeaHeightViolation(rivers, seaKeys);
  if (riverHeightViolation) return { valid: false, reason: `sea_height_${riverHeightViolation.reason}` };

  const riverConflict = getCoastalSeaRiverConflict(rivers, seaKeys, regionHexes);
  if (riverConflict) return { valid: false, reason: 'sea_touches_river_not_at_mouth' };

  return { valid: true };
}

function extendSeaToCoastalCenterCandidate(
  regionHexes: AxialHex[],
  centerHex: AxialHex,
  existingRegions: Region[],
  seaHexKeys: string[],
  existingTerrain: Map<string, HexTerrainData>,
  occupiedRegionKeys: Set<string>,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>,
  roads: Road[] = [], rng: RandomStreams = fallbackRandomStreams
): string[] {
  const seaKeys = new Set(seaHexKeys);
  if (chooseCoastalCenterHex(regionHexes, seaKeys, rivers, rng)) return Array.from(seaKeys);

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
    if (chooseCoastalCenterHex(regionHexes, seaKeys, rivers, rng)) break;
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

// Compare each river/lake interaction, not the first violation on the whole map.
// Unchanged legacy reentries may remain; new contacts, changed lake shapes and
// changed paths between contacts must be validated even on the same old river.
function getNewRiverLakeReentryViolation(
  rivers: River[], regions: Region[], terrain: Map<string, HexTerrainData>,
  previous: River[], previousRegions: Region[], previousTerrain: Map<string, HexTerrainData>
): RiverLakeReentryViolation | null {
  const collect = (items: River[], areas: Region[], water: Map<string, HexTerrainData>) => {
    const lakes = getLakesForRegions(areas, water);
    const byVertex = buildLakeIdByVertexKey(lakes);
    const shapes = new Map<number, Set<string>>();
    for (const lake of lakes) {
      const keys = shapes.get(lake.lakeId) ?? new Set<string>();
      for (const hex of lake.hexes) keys.add(hexKey(hex));
      shapes.set(lake.lakeId, keys);
    }
    const violations: { signature: string; violation: RiverLakeReentryViolation }[] = [];
    for (const river of items) {
      const contacts = new Map<number, number[]>();
      river.vertexPath.forEach((vertex, index) => {
        const id = byVertex.get(vertex.key);
        if (id !== undefined) contacts.set(id, [...(contacts.get(id) ?? []), index]);
      });
      for (const [lakeId, indices] of contacts) {
        const reentry = indices.find((index, i) => i > 0 && index > indices[i - 1] + 1);
        if (reentry === undefined) continue;
        const path = river.vertexPath.slice(indices[0], indices[indices.length - 1] + 1).map(v => v.key);
        violations.push({ signature: JSON.stringify([river.id, [...shapes.get(lakeId)!].sort(), path]),
          violation: { riverId: river.id, lakeId, vertexKey: river.vertexPath[reentry].key } });
      }
    }
    return violations;
  };
  const existing = new Set(collect(previous, previousRegions, previousTerrain).map(item => item.signature));
  return collect(rivers, regions, terrain).find(item => !existing.has(item.signature))?.violation ?? null;
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
function computeSeaHexKeysForCoastalRegionImpl(
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
const computeSeaHexKeysForCoastalRegion = __profiled('computeSeaHexKeysForCoastalRegion', computeSeaHexKeysForCoastalRegionImpl);

// Выбор освоенности (BR-007): прибрежный регион освоен с вероятностью 40%,
// материковый — 20%.
function chooseCoastalAwareLandType(isCoastal: boolean, rng: RandomStreams = fallbackRandomStreams): BiomeLandType {
  const settledChance = isCoastal ? 0.4 : 0.2;
  return rng.geography() < settledChance ? 'settled' : 'wild';
}

type RiverGenerationResult =
  | { success: true; rivers: River[] }
  | { success: false; rivers: River[]; reason: string };

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

function ensureMinimumMountainRiversForRegionImpl(
  region: Region,
  regions: Region[],
  rivers: River[],
  riverGraph: RiverGraph,
  candidateHexes: AxialHex[],
  candidateVertices: RiverVertex[],
  neighborRegionVertices: RiverVertex[],
  candidateEndpointVertices: RiverVertex[] = candidateVertices
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
    const endVertices = candidateEndpointVertices.filter((vertex) => !blockedEndVertexKeys.has(vertex.key));

    const path = buildMinimumMountainRiverPath(sourceVertices, endVertices, riverGraph, usedRiverEdges, existingRiverVertexKeys);
    if (!path) {
      generationLog.warning('Could not add minimum mountain river', {
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
const ensureMinimumMountainRiversForRegion = __profiled('    ↳↳ ensureMinimumMountainRiversForRegion', ensureMinimumMountainRiversForRegionImpl);

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

function getOutgoingInteriorConnectorFullness(river: River, outgoingVertexKey: string): RiverFullness {
  const outgoingFullness = getRiverEndpointSectorFullness(river, outgoingVertexKey);
  return getOutgoingConnectorFullnessFromEndpoint(outgoingFullness);
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
  occupiedVertexKeys: Set<string>,
  riverSlope?: RiverSlopeInfo
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
    new Set([endpoint.vertex.key]),
    riverSlope
  );
}

function getBestIncomingPathToRiverTributary(
  endpoint: RiverEndpointTouch,
  rivers: River[],
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string>,
  riverSlope?: RiverSlopeInfo
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
    new Set([endpoint.vertex.key, ...targetVertices.map((vertex) => vertex.key)]),
    riverSlope
  );
}

function getBestIncomingPathToLake(
  endpoint: RiverEndpointTouch,
  region: Region,
  terrainMap: Map<string, HexTerrainData>,
  rivers: River[],
  riverGraph: RiverGraph,
  usedRiverEdges: Set<string>,
  occupiedVertexKeys: Set<string>,
  riverSlope?: RiverSlopeInfo
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
      new Set([endpoint.vertex.key, ...lakeVertices.map((vertex) => vertex.key)]),
      riverSlope
    );
    if (path) {
      if (!bestPath) {
        bestPath = path;
      } else {
        const currentProjection = getRiverSlopeProjection(path[path.length - 1], riverSlope);
        const bestProjection = getRiverSlopeProjection(bestPath[bestPath.length - 1], riverSlope);
        if (currentProjection !== null && bestProjection !== null) {
          if (currentProjection > bestProjection + 0.001 || (Math.abs(currentProjection - bestProjection) < 0.001 && path.length < bestPath.length)) bestPath = path;
        } else if (path.length < bestPath.length) bestPath = path;
      }
    }
  }

  return bestPath;
}

function connectRemainingIncomingRiversForRegionImpl(
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
      occupiedVertexKeys,
      region.heightLevel === 3 ? undefined : region.riverSlope
    );
    const tributaryPath = candidatePath ? null : getBestIncomingPathToRiverTributary(
      currentConnection.endpoint,
      nextRivers,
      riverGraph,
      usedRiverEdges,
      occupiedVertexKeys,
      region.heightLevel === 3 ? undefined : region.riverSlope
    );
    const lakePath = candidatePath || tributaryPath ? null : getBestIncomingPathToLake(
      currentConnection.endpoint,
      region,
      terrainMap,
      nextRivers,
      riverGraph,
      usedRiverEdges,
      occupiedVertexKeys,
      region.heightLevel === 3 ? undefined : region.riverSlope
    );
    const selectedPath = candidatePath ?? tributaryPath ?? lakePath;
    const selectedMode = candidatePath ? 'candidate' : tributaryPath ? 'tributary' : lakePath ? 'lake' : null;

    if (!selectedPath) {
      generationLog.warning('Could not connect remaining incoming river', {
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

    generationLog.detail('Connected remaining incoming river', {
      regionId: region.id,
      incomingRiverId: currentConnection.river.id,
      fullness: currentConnection.fullness,
      mode: selectedMode,
      pathLength: selectedPath.length,
    });
  }

  return nextRivers;
}
const connectRemainingIncomingRiversForRegion = __profiled('    ↳↳ connectRemainingIncomingRiversForRegion', connectRemainingIncomingRiversForRegionImpl);

function connectRemainingOutgoingRiversForRegionImpl(
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
        existingRiverVertexKeys,
        region.heightLevel === 3 ? undefined : region.riverSlope
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
          allowedOccupiedVertexKeys: new Set([connection.endpoint.vertex.key]),
          riverSlope: region.heightLevel === 3 ? undefined : region.riverSlope
        }
      );
    }

    if (!selectedPath) {
      generationLog.warning('Could not connect remaining outgoing river', {
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
      generationLog.warning('Remaining outgoing river connector failed edge validation', {
        regionId: region.id,
        outgoingRiverId: connection.river.id,
      });
      skippedRiverIds.add(connection.river.id);
      continue;
    }

    if (selectedLake) usedLakeIds.add(selectedLake.lakeId);
    const connectorFullness = getOutgoingInteriorConnectorFullness(connection.river, connection.endpoint.vertex.key);
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

    generationLog.detail('Connected remaining outgoing river', {
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
const connectRemainingOutgoingRiversForRegion = __profiled('    ↳↳ connectRemainingOutgoingRiversForRegion', connectRemainingOutgoingRiversForRegionImpl);

function finalizeRiverGenerationForRegionImpl(
  region: Region,
  regions: Region[],
  terrainMap: Map<string, HexTerrainData>,
  riverGraph: RiverGraph,
  rivers: River[],
  candidateHexes: AxialHex[],
  candidateVertices: RiverVertex[],
  neighborRegionVertices: RiverVertex[],
  candidateEndpointVertices: RiverVertex[] = candidateVertices, rng: RandomStreams = fallbackRandomStreams
): RiverGenerationResult {
  const riversAfterExistingLogic = tryAddSmallTributaryRiver(
    region,
    terrainMap,
    riverGraph,
    rivers,
    candidateHexes,
    region.heightLevel === 3 ? undefined : region.riverSlope, rng
  );
  const riversWithMinimumMountainRivers = ensureMinimumMountainRiversForRegion(
    region,
    regions,
    riversAfterExistingLogic,
    riverGraph,
    candidateHexes,
    candidateVertices,
    neighborRegionVertices,
    candidateEndpointVertices
  );
  const riversWithRemainingIncomingConnected = connectRemainingIncomingRiversForRegion(
    region,
    terrainMap,
    riverGraph,
    riversWithMinimumMountainRivers,
    candidateEndpointVertices
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
const finalizeRiverGenerationForRegion = __profiled('  ↳ finalizeRiverGenerationForRegion', finalizeRiverGenerationForRegionImpl);

function generateRiverForRegionImpl(
  region: Region,
  regions: Region[],
  existingRivers: River[],
  candidateHexes?: AxialHex[],
  hexTerrainByKey?: Map<string, HexTerrainData>, rng: RandomStreams = fallbackRandomStreams
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
    const candidateEndpointVertices = getCandidateEndpointVerticesForRegion(candidateVertices, riverGraph);
    const orangeKeys = new Set(neighborRegionVertices.map((vertex) => vertex.key));
    const redVertices = candidateEndpointVertices.filter((vertex) => !orangeKeys.has(vertex.key));
    const purpleVertices = region.centerHex ? getHexCornerPoints(region.centerHex) : [];
    const existingRiverEndpointVerticesInRegion = getExistingRiverEndpointVerticesInRegion(region, existingRivers, riverGraph);
    const usedRiverEdges = buildUsedRiverEdges(existingRivers);
    const existingRiverVertexKeys = new Set(existingRivers.flatMap((river) => river.vertexPath.map((vertex) => vertex.key)));
    const touchingEndpoints = findRiverEndpointsTouchingRegion(region, existingRivers, riverGraph);
    const incomingEndpoints = touchingEndpoints.filter((endpoint) => endpoint.endpointType === 'end');
    const outgoingEndpoints = touchingEndpoints.filter((endpoint) => endpoint.endpointType === 'start');
    const requireRiverThroughOriginalCenter = !(region.isCoastal && region.biomeLandType === 'settled');

    // Mythic tracts defer closed ends to the shared search on the final
    // frontier, before inventing an inland source or creating a new lake.
    if (region.sizeCategory === 'tract' && region.generationMode === 'mythic') {
      return { success: true, rivers: existingRivers };
    }

    const connectSingleTractOutgoingRiver = (): RiverGenerationResult | null => {
      if (region.sizeCategory !== 'tract') return null;
      if (outgoingEndpoints.length === 0) return { success: true, rivers: existingRivers };

      const mainOutgoingEndpoint = [...outgoingEndpoints].sort((a, b) => a.riverId - b.riverId)[0];
      const blockedEdgeKeys = new Set(usedRiverEdges);
      // Sea is excluded from candidates, so candidate/region boundary checks
      // alone can mistake a coastal vertex for an interior source.
      const seaSourceVertexKeys = getSeaVertexKeysFromSeaKeys(getSeaHexKeys(terrainMap));
      const interiorSourceVertices = getMountainInteriorSourceVertices(
        region,
        regions,
        candidateHexes ?? [],
        riverGraph,
        candidateVertices,
        neighborRegionVertices
      ).filter((vertex) => !seaSourceVertexKeys.has(vertex.key));
      const mainPath = findBestPathFromSourceToOutgoingEndpoint(interiorSourceVertices, mainOutgoingEndpoint, riverGraph, blockedEdgeKeys, {
        occupiedVertexKeys: existingRiverVertexKeys,
        allowedOccupiedVertexKeys: new Set([mainOutgoingEndpoint.vertex.key])
      });
      if (!mainPath) {
        generationLog.warning('Could not connect tract source to outgoing river', {
          regionId: region.id,
          outgoingRiverId: mainOutgoingEndpoint.riverId,
        });
        return { success: false, rivers: existingRivers, reason: 'tract_outgoing_source_path_not_found' };
      }

      const nextRivers = existingRivers.map((river) => river.id !== mainOutgoingEndpoint.riverId
        ? river
        : {
          ...river,
          vertexPath: [...mainPath.slice(0, -1), ...river.vertexPath],
          sectors: prependRiverPathSector(river, mainPath, 1, region.id)
        });

      for (const river of nextRivers) {
        validateRiverDirection(river);
        validateRiverContinuity(river);
      }
      validateNoDuplicateRiverEdges(nextRivers);
      return { success: true, rivers: nextRivers };
    };

    const tractOutgoingResult = connectSingleTractOutgoingRiver();
    if (tractOutgoingResult) return tractOutgoingResult;

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
        generationLog.warning('Mountain incoming fallback failed: no boundary path', {
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
        generationLog.warning('Mountain incoming fallback failed: boundary path validation failed', {
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

      generationLog.detail('Mountain incoming fallback: incoming river extended to boundary; outgoing rivers will be connected separately', {
        regionId: region.id,
        incomingRiverId: incomingEndpoint.riverId,
        fallbackReason,
      });
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
    };

    if (region.isCoastal && outgoingEndpoints.length > 0 && incomingEndpoints.length === 0) {
      const sortedOutgoingEndpoints = [...outgoingEndpoints].sort((a, b) => a.riverId - b.riverId);
      const mainOutgoingEndpoint = sortedOutgoingEndpoints[0];
      const orderedStartVertices = orderRiverSlopeVertices(
        redVertices.filter((vertex) => vertex.key !== mainOutgoingEndpoint.vertex.key),
        region.heightLevel === 3 ? undefined : region.riverSlope,
        'upstream'
      );
      const middlePool = purpleVertices.length > 0 ? purpleVertices : [undefined];
      let bestPath: RiverVertex[] | null = null;
      let bestControlPoints: RiverControlPoints | null = null;

      for (const startVertex of orderedStartVertices) {
        for (const middlePurpleVertex of middlePool) {
          const controlPoints: RiverControlPoints = {
            startVertex,
            ...(middlePurpleVertex ? { middlePurpleVertex } : {}),
            endVertex: mainOutgoingEndpoint.vertex,
            startMode: 'red vertex',
            endMode: 'existing river endpoint'
          };
          const path = buildRiverPathViaControlPoints(controlPoints, riverGraph, usedRiverEdges);
          if (!validateRiverPathViaControlPoints(
            path,
            controlPoints,
            riverGraph,
            redVertices,
            [mainOutgoingEndpoint.vertex],
            usedRiverEdges,
            existingRiverVertexKeys,
            new Set([mainOutgoingEndpoint.vertex.key])
          )) continue;
          if (!bestPath || path.length < bestPath.length) {
            bestPath = path;
            bestControlPoints = controlPoints;
          }
        }
        if (bestPath && bestControlPoints) break;
      }

      if (!bestPath || !bestControlPoints) {
        generationLog.warning('Could not connect coastal candidate source to outgoing river', {
          regionId: region.id,
          outgoingRiverId: mainOutgoingEndpoint.riverId,
          redVertexCount: redVertices.length,
        });
        return { success: false, rivers: existingRivers, reason: 'coastal_outgoing_path_not_found' };
      }

      const nextRivers = existingRivers.map((river) => river.id !== mainOutgoingEndpoint.riverId
        ? river
        : {
          ...river,
          vertexPath: [...bestPath.slice(0, -1), ...river.vertexPath],
          sectors: prependRiverPathSector(river, bestPath, getOutgoingInteriorConnectorFullness(river, mainOutgoingEndpoint.vertex.key), region.id),
          controlPoints: bestControlPoints
        });

      for (const river of nextRivers) {
        validateRiverDirection(river);
        validateRiverContinuity(river);
      }
      validateNoDuplicateRiverEdges(nextRivers);
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
    }

    if (region.heightLevel === 3 && region.sizeCategory !== 'tract') {
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
          generationLog.warning('Could not extend fullness-2/3 outgoing mountain river from candidate boundary through center', {
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
            sectors: prependRiverPathSector(river, bestPath, getOutgoingConnectorFullnessFromEndpoint(outgoingFullness), region.id),
            controlPoints: bestControlPoints
          };
        });

        for (const river of nextRivers) {
          validateRiverDirection(river);
          validateRiverContinuity(river);
        }
        validateNoDuplicateRiverEdges(nextRivers);
        return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
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

      generationLog.detail('Mountain region with outgoing rivers', {
        regionId: region.id,
        incomingRiverIds: incomingEndpoints.map((endpoint) => endpoint.riverId),
        outgoingRiverIds: sortedOutgoingEndpoints.map((endpoint) => endpoint.riverId),
        mainOutgoingRiverId: mainOutgoingEndpoint.riverId,
      });
      generationLog.detail('Connecting main mountain outgoing river', {
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
          connectorPath, rng
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
          existingRiverVertexKeys,
          region.heightLevel === 3 ? undefined : region.riverSlope
        );
        if (!mergedWithTributaries) {
          const fallbackResult = buildMountainIncomingBoundaryFallback(mainIncomingEndpoint, 'mountain_incoming_tributary_to_through_river_not_found');
          return fallbackResult ?? { success: false, rivers: existingRivers, reason: 'mountain_incoming_tributary_to_through_river_not_found' };
        }
        addConnectorSplitLakeIfNeeded(region, terrainMap, connectorSplit, rng);
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
          : {
            ...river,
            vertexPath: [...mainPath.slice(0, -1), ...river.vertexPath],
            sectors: prependRiverPathSector(river, mainPath, region.sizeCategory === 'tract' ? 1 : getOutgoingInteriorConnectorFullness(river, mainOutgoingEndpoint.vertex.key), region.id)
          });
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
          generationLog.warning('Could not eagerly connect secondary mountain outgoing river; deferring to final outgoing connector pass', {
            regionId: region.id,
            outgoingRiverId: outgoingEndpoint.riverId,
          });
          continue;
        }
        const pathEdgeKeys = getRiverPathEdgeKeys(selectedPath, riverGraph);
        if (!pathEdgeKeys) {
          generationLog.warning('Secondary mountain outgoing river has invalid edge keys; deferring to final outgoing connector pass', {
            regionId: region.id,
            outgoingRiverId: outgoingEndpoint.riverId,
          });
          continue;
        }
        nextRivers = nextRivers.map((river) => river.id !== outgoingEndpoint.riverId
          ? river
          : {
            ...river,
            vertexPath: [...selectedPath.slice(0, -1), ...river.vertexPath],
            sectors: prependRiverPathSector(river, selectedPath, region.sizeCategory === 'tract' ? 1 : getOutgoingInteriorConnectorFullness(river, outgoingEndpoint.vertex.key), region.id)
          });
        for (const edgeKey of pathEdgeKeys) blockedEdgeKeys.add(edgeKey);
        generationLog.detail('Connecting secondary mountain outgoing river', {
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
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
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

      generationLog.detail('Multiple incoming rivers: building main river and tributaries', {
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

      generationLog.detail('Tributary target vertices for main river', {
        regionId: region.id,
        mainRiverId: mainIncomingEndpoint.riverId,
        mainBuiltPathLength: mainBuiltPath.length,
        tributaryTargetVerticesCount: tributaryTargetVertices.length,
        excludedStartVertex: mainBuiltPath[0]?.key,
        excludedEndVertex: mainBuiltPath[mainBuiltPath.length - 1]?.key,
      });

      if (tributaryTargetVertices.length === 0) {
        generationLog.warning('Main river has no internal vertices for tributary connection', {
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
          new Set([endpoint.vertex.key, ...tributaryTargetVertices.map((vertex) => vertex.key)]),
          region.heightLevel === 3 ? undefined : region.riverSlope
        );
        if (!tributaryPath) {
          generationLog.warning('Could not connect tributary to main river', {
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
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
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
              connectorPath, rng
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
            addConnectorSplitLakeIfNeeded(region, terrainMap, bestConnector.connectorSplit, rng);
            for (const river of mergedWithTributaries) {
              validateRiverDirection(river);
              validateRiverContinuity(river);
            }
            validateNoDuplicateRiverEdges(mergedWithTributaries);
            return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, mergedWithTributaries, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
          }
        } else {
          generationLog.warning('Could not connect river pair: no free connector path', {
            regionId: region.id,
            candidatePairs,
          });
        }
      } else {
        generationLog.warning('Cannot merge rivers automatically: no valid end->start pair', { regionId: region.id, touchingEndpoints });
      }
    }

    void outgoingEndpoints;

    if (existingRiverEndpointVerticesInRegion.length > 0 && redVertices.length < 1) return { success: false, rivers: existingRivers, reason: 'no_red_vertices_for_extension' };
    if (existingRiverEndpointVerticesInRegion.length === 0 && redVertices.length < 2) {
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, existingRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
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
        generationLog.warning('Could not extend river in region: no valid free path', {
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
        generationLog.warning('Could not extend river in region: no valid free path', {
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
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
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

      generationLog.detail('mountain-source-branch:', {
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

      const newRiverId = Math.max(0,...existingRivers.map(r=>r.id)) + 1;
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
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
    }

    const RANDOM_PAIR_ATTEMPTS = 50;
    for (let attempt = 0; attempt < RANDOM_PAIR_ATTEMPTS; attempt += 1) {
      const controlPoints = chooseRandomRiverControlPoints(
        redVertices,
        purpleVertices,
        existingRiverEndpointVerticesInRegion,
        region.riverSlope, rng
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
        const newRiverId = Math.max(0,...existingRivers.map(r=>r.id)) + 1;
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
      return finalizeRiverGenerationForRegion(region, regions, terrainMap, riverGraph, nextRivers, candidateHexes ?? [], candidateVertices, neighborRegionVertices, candidateEndpointVertices, rng);
    }
  } catch (error) {
    // Constraint rejections return normally; an exception is a programming error.
    throw error;
  }

  return { success: false, rivers: existingRivers, reason: 'no_valid_random_path' };
}
const generateRiverForRegion = __profiled('generateRiverForRegion', generateRiverForRegionImpl);

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
  const arrows: Array<{ key: string; edgeKey: string; x1: number; y1: number; x2: number; y2: number; fullness: RiverFullness }> = [];
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
      edgeKey: segmentEdgeKey,
      x1: mx - ux * halfArrow + offsetX,
      y1: my - uy * halfArrow + offsetY,
      x2: mx + ux * halfArrow + offsetX,
      y2: my + uy * halfArrow + offsetY,
      fullness
    });
  }
  return arrows;
}

function renderRiverRapidMarks(
  river: River,
  offsetX: number,
  offsetY: number,
  lakeEdgeKeys: Set<string>,
  rapidEdgeKeys: Set<string>
) {
  const fullnessByEdge = getRiverSectorFullnessByEdge(river);
  const fallbackFullness = getRiverFallbackFullness(river);
  const marks: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; fullness: RiverFullness }> = [];
  for (let i = 1; i < river.vertexPath.length; i += 1) {
    const start = river.vertexPath[i - 1];
    const end = river.vertexPath[i];
    const segmentEdgeKey = edgeKey(start, end);
    if (isLakeEdge(segmentEdgeKey, lakeEdgeKeys) || !rapidEdgeKeys.has(segmentEdgeKey)) continue;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) continue;
    const fullness = fullnessByEdge.get(segmentEdgeKey) ?? fallbackFullness;
    const nx = -dy / length;
    const ny = dx / length;
    const halfMarkLength = Math.max(2.5, getRiverWidth(getHexWidth(HEX_SIZE), fullness) * 0.7);
    for (const position of [0.38, 0.5, 0.62]) {
      const x = start.x + dx * position + offsetX;
      const y = start.y + dy * position + offsetY;
      marks.push({
        key: `river-rapid-${river.id}-${i}-${position}`,
        x1: x - nx * halfMarkLength,
        y1: y - ny * halfMarkLength,
        x2: x + nx * halfMarkLength,
        y2: y + ny * halfMarkLength,
        fullness
      });
    }
  }
  return marks;
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
        generationLog.warning(previousRiver ? 'Restoring previous river because generated segment is invalid for region' : 'Removing invalid generated river for region', {
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
      generationLog.warning(previousRiver ? 'Restoring previous river because generated river starts from sea' : 'Removing generated river because it starts from sea', {
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

const assignLakesForRegion = __profiled('assignLakesForRegion', assignLakesForRegionImpl);
function assignLakesForRegionImpl(
  regionHexes: AxialHex[],
  centerHex: AxialHex,
  startingLakeId: number,
  biomeId: BiomeId, rng: RandomStreams = fallbackRandomStreams
): { lakesByHex: Map<string, HexTerrainData>; nextLakeId: number } {
  const centerKey = hexKey(centerHex);
  const regionHexMap = new Map(regionHexes.map((hex) => [hexKey(hex), hex]));
  const selectedLakeKeys = new Set<string>();
  const lakeChance = getLakeChanceForBiome(biomeId);

  for (const hex of regionHexes) {
    const key = hexKey(hex);
    if (key === centerKey) continue;
    if (rng.geography() < lakeChance) selectedLakeKeys.add(key);
  }

  const firstPassLakeKeys = new Set(selectedLakeKeys);
  for (const hex of regionHexes) {
    const key = hexKey(hex);
    if (key === centerKey) continue;
    if (selectedLakeKeys.has(key)) continue;

    const touchesFirstPassLake = getHexNeighbors(hex).some((neighbor) => firstPassLakeKeys.has(hexKey(neighbor)));
    if (!touchesFirstPassLake) continue;

    if (rng.geography() < LAKE_EXPANSION_CHANCE) selectedLakeKeys.add(key);
  }

  const lakesByHex = new Map<string, HexTerrainData>();
  const visited = new Set<string>();
  let nextLakeId = startingLakeId;

  for (const lakeKey of selectedLakeKeys) {
    if (visited.has(lakeKey)) continue;
    const queue = [lakeKey];
    visited.add(lakeKey);

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const current = queue[queueIndex];
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

  generationLog.detail('Lakes generated for region', {
    biomeId,
    lakeChance,
    lakeExpansionChance: LAKE_EXPANSION_CHANCE,
    lakeHexCount: lakesByHex.size,
    lakeIds: Array.from(new Set(Array.from(lakesByHex.values()).map((terrain) => terrain.lakeId))).filter(Boolean)
  });

  return { lakesByHex, nextLakeId };
}

const assignPointsOfInterestForRegion = __profiled('assignPointsOfInterestForRegion', assignPointsOfInterestForRegionImpl);
function assignPointsOfInterestForRegionImpl(
  regionHexes: AxialHex[],
  centerHex: AxialHex,
  lakesByHex: Map<string, HexTerrainData>, rng: RandomStreams = fallbackRandomStreams
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

  const poiCount = randomInt(minPoiCount, maxPoiCount, poiRandomStreams(rng));
  if (poiCount <= 0) return [];

  const shuffledEligibleHexes = shuffleArray(eligibleHexes, poiRandomStreams(rng));
  return shuffledEligibleHexes.slice(0, Math.min(poiCount, shuffledEligibleHexes.length));
}

function assignPointsOfInterestForTract(regionHexes: AxialHex[], rng: RandomStreams = fallbackRandomStreams): AxialHex[] {
  const eligibleCount = regionHexes.length;
  if (eligibleCount <= 0) return [];

  const maxPoiCount = Math.floor(eligibleCount / 4);
  const minPoiCount = Math.floor(eligibleCount / 6);
  if (maxPoiCount < minPoiCount) return [];

  const poiCount = randomInt(minPoiCount, maxPoiCount, poiRandomStreams(rng));
  if (poiCount <= 0) return [];

  const shuffledEligibleHexes = shuffleArray(regionHexes, poiRandomStreams(rng));
  return shuffledEligibleHexes.slice(0, Math.min(poiCount, shuffledEligibleHexes.length));
}

function getWaterPoiKindPool(context: 'sea' | BiomeLandType): WaterPoiKind[] {
  if (context === 'settled') return SETTLED_WATER_POI_KIND_ORDER;
  if (context === 'wild') return WILD_LAKE_WATER_POI_KIND_ORDER;
  return WATER_POI_KIND_ORDER;
}

function getRegionByHexKey(regions: Region[]): Map<string, Region> {
  const result = new Map<string, Region>();
  for (const region of regions) {
    for (const hex of region.hexes) result.set(hexKey(hex), region);
  }
  return result;
}

function assignWaterPoiLayer(
  existingWaterPoiByKey: Map<string, WaterPoiKind>,
  regions: Region[],
  hexTerrainByKey: Map<string, HexTerrainData>,
  newlyCheckedWaterHexKeys?: Iterable<string>, rng: RandomStreams = fallbackRandomStreams
): Map<string, WaterPoiKind> {
  const regionByHexKey = getRegionByHexKey(regions);
  const waterHexKeySet = new Set(
    Array.from(hexTerrainByKey.entries())
      .filter(([, terrain]) => terrain.terrainOverride === 'lake' || terrain.terrainOverride === 'sea')
      .map(([key]) => key)
  );
  const next = new Map<string, WaterPoiKind>();
  const blockedKeys = new Set<string>();

  const existingWaterPoiKeys = Array.from(existingWaterPoiByKey.keys())
    .filter((key) => waterHexKeySet.has(key))
    .sort();

  for (const key of existingWaterPoiKeys) {
    const existingKind = existingWaterPoiByKey.get(key);
    if (!existingKind || blockedKeys.has(key)) continue;
    const hex = parseHexKey(key);
    const terrain = hexTerrainByKey.get(key);
    const region = terrain?.terrainOverride === 'lake' ? regionByHexKey.get(key) : undefined;
    const pool = getWaterPoiKindPool(terrain?.terrainOverride === 'sea' ? 'sea' : region?.biomeLandType ?? 'wild');
    if (!pool.includes(existingKind)) continue;
    next.set(key, existingKind);
    blockedKeys.add(key);
    for (const neighbor of getHexNeighbors(hex)) blockedKeys.add(hexKey(neighbor));
  }

  const keysToCheckForNewPoi = newlyCheckedWaterHexKeys
    ? Array.from(new Set(newlyCheckedWaterHexKeys)).filter((key) => waterHexKeySet.has(key)).sort()
    : [];

  for (const key of keysToCheckForNewPoi) {
    if (next.has(key) || blockedKeys.has(key)) continue;
    const terrain = hexTerrainByKey.get(key);
    if (!terrain || !waterHexKeySet.has(key)) continue;
    const region = terrain.terrainOverride === 'lake' ? regionByHexKey.get(key) : undefined;
    const context: 'sea' | BiomeLandType = terrain.terrainOverride === 'sea' ? 'sea' : region?.biomeLandType ?? 'wild';
    const chance = context === 'wild' ? 4 : 6;
    if (randomInt(1, chance, poiRandomStreams(rng)) !== 1) continue;
    next.set(key, randomFrom(getWaterPoiKindPool(context), poiRandomStreams(rng)));
    blockedKeys.add(key);
    for (const neighbor of getHexNeighbors(parseHexKey(key))) blockedKeys.add(hexKey(neighbor));
  }

  return next;
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
const EDITABLE_POI_KIND_ORDER: PoiKind[] = ['city', 'town', 'village', ...SECONDARY_POI_KIND_ORDER];

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

function assignSecondaryPoiKindsForRegion(region: Region, roads: Road[], assigned: Record<string, PoiKind>, rng: RandomStreams = fallbackRandomStreams): void {
  for (const poi of shuffleArray(region.pointsOfInterest, poiRandomStreams(rng))) {
    const poiKey = hexKey(poi);
    if (assigned[poiKey] !== undefined) continue;

    const candidates = SECONDARY_POI_KIND_ORDER.filter((kind) =>
      !Object.values(assigned).includes(kind)
      && secondaryPoiKindCanAppearInRegion(kind, region, poi, roads)
    );

    if (candidates.length === 0) continue;

    assigned[poiKey] = randomFrom(candidates, poiRandomStreams(rng));
  }
}

function assignPoiKindsForRegion(options: {
  region: Region;
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
}, rng: RandomStreams = fallbackRandomStreams): Record<string, PoiKind> | undefined {
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
    assignSecondaryPoiKindsForRegion(region, roads, assigned, poiRandomStreams(rng));
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

  assignSecondaryPoiKindsForRegion(region, roads, assigned, poiRandomStreams(rng));

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
  return kind ? POI_DETAILS[kind].label[language] : UI_TEXT[language].poi;
}

function getWaterPoiEmoji(kind: WaterPoiKind): string {
  return WATER_POI_DETAILS[kind].emoji;
}

function getWaterPoiLabel(kind: WaterPoiKind, language: Language): string {
  return WATER_POI_DETAILS[kind].label[language];
}
function findRoadPathWithinRegion(options: {
  region: Region; from: AxialHex; targets: AxialHex[]; roads: Road[]; hexTerrainByKey: Map<string, HexTerrainData>;
  allowRoadHexes?: AxialHex[];
}): AxialHex[] | null {
  const { region, from, targets, roads, hexTerrainByKey, allowRoadHexes = [] } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const targetKeys = new Set(targets.filter((t) => !isLakeHex(t, hexTerrainByKey) && !isSeaHex(t, hexTerrainByKey)).map(hexKey));
  const roadSegKeys = getRoadSegmentKeys(roads);
  const roadHexKeys = getRoadHexKeys(roads);
  const startKey = hexKey(from);
  if (isLakeHex(from, hexTerrainByKey) || isSeaHex(from, hexTerrainByKey) || targetKeys.size === 0) return null;
  const allowedRoadHexKeys = new Set([startKey, ...allowRoadHexes.map(hexKey), ...Array.from(targetKeys)]);
  // Parent-pointer BFS: очередь хранит только гексы, а не целые пути. Путь восстанавливается
  // из cameFrom в конце. Порядок обхода и находимый путь идентичны прежней версии на целых
  // путях (visited-once BFS даёт то же дерево), но per-run стоимость падает с O(V^2) до O(V).
  const queue: AxialHex[] = [from];
  const cameFrom = new Map<string, string>();
  const hexByKey = new Map<string, AxialHex>([[startKey, from]]);
  const visited = new Set<string>([startKey]);
  for (let head = 0; head < queue.length; head += 1) {
    const cur = queue[head]!;
    const curKey = hexKey(cur);
    if (curKey !== startKey && targetKeys.has(curKey)) {
      const path: AxialHex[] = [];
      let traceKey: string | undefined = curKey;
      while (traceKey) {
        const traceHex = hexByKey.get(traceKey);
        if (!traceHex) break;
        path.push(traceHex);
        if (traceKey === startKey) break;
        traceKey = cameFrom.get(traceKey);
      }
      return path.reverse();
    }
    for (const n of getHexNeighbors(cur)) {
      const nk = hexKey(n);
      if (visited.has(nk) || !regionKeys.has(nk)) continue;
      if (isLakeHex(n, hexTerrainByKey) || isSeaHex(n, hexTerrainByKey)) continue;
      if (roadSegKeys.has(normalizeRoadSegmentKey(cur, n))) continue;
      const hasRoadHex = roadHexKeys.has(nk);
      const allowedRoadHex = allowedRoadHexKeys.has(nk);
      if (hasRoadHex && !allowedRoadHex) continue;
      visited.add(nk);
      cameFrom.set(nk, curKey);
      hexByKey.set(nk, n);
      queue.push(n);
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
    if (isLakeHex(poi, hexTerrainByKey) || isSeaHex(poi, hexTerrainByKey)) return false;
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

function getRiverCrossingKey(roadId: number, roadSegmentKey: string, riverId: number): string {
  return `${roadId}:${roadSegmentKey}:${riverId}`;
}

// Пересечения создаются после построения геометрии рек и дорог. Уже существующий
// тип сохраняется, поэтому добавление следующего региона не меняет старые мосты.
function reconcileRiverCrossings(roads: Road[], rivers: River[], regions: Region[], existing: RiverCrossing[], rng: RandomStreams = fallbackRandomStreams): RiverCrossing[] {
  const existingByKey = new Map(existing.map((crossing) => [crossing.key, crossing]));
  const regionById = new Map(regions.map((region) => [region.id, region]));
  const riverFullnessByEdge = getRiverCrossingFullnessByEdge(rivers);
  const riverByEdge = new Map<string, River[]>();
  for (const river of rivers) {
    for (let index = 1; index < river.vertexPath.length; index += 1) {
      const riverEdgeKey = getRiverEdgeKey(river.vertexPath[index - 1], river.vertexPath[index]);
      const edgeRivers = riverByEdge.get(riverEdgeKey) ?? [];
      edgeRivers.push(river);
      riverByEdge.set(riverEdgeKey, edgeRivers);
    }
  }

  const crossings: RiverCrossing[] = [];
  for (const road of roads) {
    const region = regionById.get(road.regionId);
    for (const segment of road.segments) {
      const sharedEdge = getSharedHexEdgeVertexKeys(segment.from, segment.to);
      if (!sharedEdge) continue;
      const riverEdgeKey = sharedEdge[0] < sharedEdge[1]
        ? `${sharedEdge[0]}|${sharedEdge[1]}`
        : `${sharedEdge[1]}|${sharedEdge[0]}`;
      const crossedRivers = riverByEdge.get(riverEdgeKey) ?? [];
      const roadSegmentKey = normalizeRoadSegmentKey(segment.from, segment.to);
      for (const river of crossedRivers) {
        const key = getRiverCrossingKey(road.id, roadSegmentKey, river.id);
        crossings.push(existingByKey.get(key) ?? {
          key,
          roadId: road.id,
          roadSegmentKey,
          riverId: river.id,
          riverEdgeKey,
          kind: chooseRiverCrossingKind({
            fullness: riverFullnessByEdge.get(riverEdgeKey) ?? getRiverFallbackFullness(river),
            heightLevel: region?.heightLevel ?? 1,
            biomeLandType: region?.biomeLandType ?? 'settled',
            roadKind: segment.kind
          }, rng.geography)
        });
      }
    }
  }
  return crossings;
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

function chooseBestRoadCandidate(candidates: RoadCandidatePath[], rng: RandomStreams = fallbackRandomStreams): RoadCandidatePath | null {
  if (candidates.length === 0) return null;
  const minCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  let bestCandidates = candidates.filter((candidate) => candidate.crossedRiverCount === minCrossings);
  const minLength = Math.min(...bestCandidates.map((candidate) => candidate.extendedPath.length));
  bestCandidates = bestCandidates.filter((candidate) => candidate.extendedPath.length === minLength);
  const maxPoiCount = Math.max(...bestCandidates.map((candidate) => candidate.touchedPoiCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.touchedPoiCount === maxPoiCount);
  return randomFrom(bestCandidates, rng);
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
  generationLog.detail('Settled POI trails result', {
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

type SupplementalSettledRoadCandidate = RoadCandidatePath & { startHex: AxialHex; anchorDistance: number };

type SettledCandidateRoadCandidate = RoadCandidatePath & {
  candidateHex: AxialHex;
  entryHex: AxialHex;
  candidateDistanceFromAnchor: number;
};

function chooseBestSettledCandidateRoadCandidate(candidates: SettledCandidateRoadCandidate[], rng: RandomStreams = fallbackRandomStreams): SettledCandidateRoadCandidate | null {
  if (candidates.length === 0) return null;
  const maxDistance = Math.max(...candidates.map((candidate) => candidate.candidateDistanceFromAnchor));
  let bestCandidates = candidates.filter((candidate) => candidate.candidateDistanceFromAnchor === maxDistance);

  const minCrossings = Math.min(...bestCandidates.map((candidate) => candidate.crossedRiverCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.crossedRiverCount === minCrossings);

  const minLength = Math.min(...bestCandidates.map((candidate) => candidate.extendedPath.length));
  bestCandidates = bestCandidates.filter((candidate) => candidate.extendedPath.length === minLength);

  const maxPoiCount = Math.max(...bestCandidates.map((candidate) => candidate.touchedPoiCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.touchedPoiCount === maxPoiCount);

  return randomFrom(bestCandidates, rng);
}

function chooseBestSupplementalSettledRoadCandidate(candidates: SupplementalSettledRoadCandidate[], rng: RandomStreams = fallbackRandomStreams): SupplementalSettledRoadCandidate | null {
  if (candidates.length === 0) return null;
  const maxPoiCount = Math.max(...candidates.map((c) => c.touchedPoiCount));
  let best = candidates.filter((c) => c.touchedPoiCount === maxPoiCount);

  const minRiverCrossings = Math.min(...best.map((c) => c.crossedRiverCount));
  best = best.filter((c) => c.crossedRiverCount === minRiverCrossings);

  const maxAnchorDistance = Math.max(...best.map((c) => c.anchorDistance));
  best = best.filter((c) => c.anchorDistance === maxAnchorDistance);

  const minLength = Math.min(...best.map((c) => c.extendedPath.length));
  best = best.filter((c) => c.extendedPath.length === minLength);

  return randomFrom(best, rng);
}

function chooseBestThirdRoadCandidate(candidates: RoadCandidatePath[], rng: RandomStreams = fallbackRandomStreams): RoadCandidatePath | null {
  if (candidates.length === 0) return null;
  const maxPoiCount = Math.max(...candidates.map((c) => c.touchedPoiCount));
  let best = candidates.filter((c) => c.touchedPoiCount === maxPoiCount);

  const minRiverCrossings = Math.min(...best.map((c) => c.crossedRiverCount));
  best = best.filter((c) => c.crossedRiverCount === minRiverCrossings);

  const minLength = Math.min(...best.map((c) => c.extendedPath.length));
  best = best.filter((c) => c.extendedPath.length === minLength);

  return randomFrom(best, rng);
}

function findAlternativeRoadPathsWithinRegionImpl(options: {
  region: Region; from: AxialHex; target: AxialHex; roads: Road[]; hexTerrainByKey: Map<string, HexTerrainData>; maxAlternatives: number;
}, rng: RandomStreams = fallbackRandomStreams): AxialHex[][] {
  const { region, from, target, roads, hexTerrainByKey, maxAlternatives } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const startKey = hexKey(from);
  const targetKey = hexKey(target);
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey) || isSeaHex(from, hexTerrainByKey) || isSeaHex(target, hexTerrainByKey)) return [];
  if ((!regionKeys.has(startKey) && !getHexNeighbors(from).some(h => regionKeys.has(hexKey(h)))) || !regionKeys.has(targetKey) || startKey === targetKey) return [];
  const roadSegKeys = getRoadSegmentKeys(roads);
  const roadHexKeys = getRoadHexKeys(roads);
  const paths: AxialHex[][] = [];
  const pathKeys = new Set<string>();
  const maxAttempts = 12;
  for (let attempt = 0; attempt < maxAttempts && paths.length < maxAlternatives; attempt += 1) {
    // Parent-pointer BFS вместо очереди целых путей. Порядок раскрытия соседей (включая
    // per-attempt reverse/shuffle/sort для разнообразия) сохранён, поэтому найденный путь
    // на каждой попытке идентичен прежней версии; убрано лишь копирование путей O(V) на шаг.
    const queue: AxialHex[] = [from];
    const cameFrom = new Map<string, string>();
    const hexByKey = new Map<string, AxialHex>([[startKey, from]]);
    const visited = new Set<string>([startKey]);
    let found: AxialHex[] | null = null;
    for (let head = 0; head < queue.length && !found; head += 1) {
      const cur = queue[head]!;
      const curKey = hexKey(cur);
      if (curKey !== startKey && curKey === targetKey) {
        const path: AxialHex[] = [];
        let traceKey: string | undefined = curKey;
        while (traceKey) {
          const traceHex = hexByKey.get(traceKey);
          if (!traceHex) break;
          path.push(traceHex);
          if (traceKey === startKey) break;
          traceKey = cameFrom.get(traceKey);
        }
        found = path.reverse();
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
      else if (attempt % 5 === 2) neighbors = shuffleArray(neighbors, rng);
      else if (attempt % 5 === 3) neighbors = [...neighbors].sort((a, b) => hexDistance(a, target) - hexDistance(b, target));
      else if (attempt % 5 === 4) neighbors = [...neighbors].sort((a, b) => hexDistance(b, target) - hexDistance(a, target));
      for (const n of neighbors) {
        const nk = hexKey(n);
        visited.add(nk);
        cameFrom.set(nk, curKey);
        hexByKey.set(nk, n);
        queue.push(n);
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
const findAlternativeRoadPathsWithinRegion = __profiled('findAlternativeRoadPathsWithinRegion', findAlternativeRoadPathsWithinRegionImpl);

function collectAlternativeRoadPathsToTarget(options: {
  region: Region; fromHex: AxialHex; targetHex: AxialHex; targetIsPoi: boolean; roads: Road[]; rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>; usedRoadPoiKeys: Set<string>; maxAlternatives: number;
}, rng: RandomStreams = fallbackRandomStreams): RoadCandidatePath[] {
  const { region, fromHex, targetHex, targetIsPoi, roads, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives } = options;
  const candidates: RoadCandidatePath[] = [];
  const basePaths = findAlternativeRoadPathsWithinRegion({ region, from: fromHex, target: targetHex, roads, hexTerrainByKey, maxAlternatives }, rng);
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
    if (isLakeHex(cur, hexTerrainByKey) || isSeaHex(cur, hexTerrainByKey)) return false;
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
type IncomingRoadEndpoint = { roadId: number; endpointHex: AxialHex; touchKind: 'endpoint' | 'body' };
type SettledIncomingRoadCandidate = RoadCandidatePath & { incoming: IncomingRoadEndpoint };

function buildPathFromIncomingRoadEndpoint(endpointHex: AxialHex, innerPath: AxialHex[]): AxialHex[] {
  if (innerPath.length > 0 && isSameHex(endpointHex, innerPath[0])) return innerPath;
  return [endpointHex, ...innerPath];
}

function appendIncomingRoadEndpointToPath(path: AxialHex[], endpointHex: AxialHex): AxialHex[] {
  if (path.length > 0 && isSameHex(path[path.length - 1], endpointHex)) return path;
  return [...path, endpointHex];
}

function getRegionCenterHexKeys(regions: Region[]): Set<string> {
  return new Set(regions.filter(region=>!region.suppressCentralPoi).map((region) => hexKey(region.centerHex)));
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
  const addIncoming = (roadId: number, endpointHex: AxialHex, touchKind: IncomingRoadEndpoint['touchKind']) => {
    const key = hexKey(endpointHex);
    if (blockedRoadTouchHexKeys.has(key)) return;
    if (hexTerrainByKey && (isLakeHex(endpointHex, hexTerrainByKey) || isSeaHex(endpointHex, hexTerrainByKey))) return;
    if (!regionKeys.has(key) && !getHexNeighbors(endpointHex).some(h => regionKeys.has(hexKey(h)))) return;
    const id = `${roadId}:${key}`;
    if (!result.has(id)) result.set(id, { roadId, endpointHex, touchKind });
  };
  for (const road of roads) {
    for (const endpoint of getRoadEndpoints(road, 'road')) addIncoming(road.id, endpoint, 'endpoint');
    if (includeRoadBodyEntries) for (const segment of road.segments) {
      if (segment.kind !== 'road') continue;
      addIncoming(road.id, segment.from, 'body');
      addIncoming(road.id, segment.to, 'body');
    }
  }
  return [...result.values()];
}


function chooseBestSettledIncomingRoadCandidate(candidates: SettledIncomingRoadCandidate[], rng: RandomStreams = fallbackRandomStreams): SettledIncomingRoadCandidate | null {
  if (candidates.length === 0) return null;
  const endpointCandidates = candidates.filter((candidate) => candidate.incoming.touchKind === 'endpoint');
  const priorityCandidates = endpointCandidates.length > 0 ? endpointCandidates : candidates;
  const maxPoiCount = Math.max(...priorityCandidates.map((candidate) => candidate.touchedPoiCount));
  let bestCandidates = priorityCandidates.filter((candidate) => candidate.touchedPoiCount === maxPoiCount);
  const minCrossings = Math.min(...bestCandidates.map((candidate) => candidate.crossedRiverCount));
  bestCandidates = bestCandidates.filter((candidate) => candidate.crossedRiverCount === minCrossings);
  const minLength = Math.min(...bestCandidates.map((candidate) => candidate.extendedPath.length));
  bestCandidates = bestCandidates.filter((candidate) => candidate.extendedPath.length === minLength);
  return randomFrom(bestCandidates, rng);
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
}, rng: RandomStreams = fallbackRandomStreams): SettledIncomingRoadCandidate[] {
  const { region, incoming, targetHexes, roads, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives } = options;
  const candidates: SettledIncomingRoadCandidate[] = [];
  const targetKeys = new Set(targetHexes.map(hexKey));
  const uniqueTargets = targetHexes.filter((targetHex, index, allTargets) => allTargets.findIndex((other) => hexKey(other) === hexKey(targetHex)) === index);

  for (const targetHex of uniqueTargets) {
    const basePaths = isSameHex(incoming.endpointHex, targetHex) ? [[targetHex]] : findAlternativeRoadPathsWithinRegion({
      region,
      from: incoming.endpointHex,
      target: targetHex,
      roads,
      hexTerrainByKey,
      maxAlternatives
    }, rng);

    for (const basePath of basePaths) {
      const extendedPath = buildPathFromIncomingRoadEndpoint(incoming.endpointHex, basePath);
      const allowedRoadHexes = [incoming.endpointHex, targetHex];
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
      result.push({ roadId: road.id, endpointHex: endpoint, touchKind: 'endpoint' });
    }
  }
  return result;
}

// Бинарная мин-куча (приоритетная очередь). Заменяет паттерн "sort() на каждой
// итерации while": извлечение минимума за O(log n) вместо O(n log n).
// less(a, b) === true означает "a имеет более высокий приоритет (идёт раньше)".
class MinHeap<T> {
  private items: T[] = [];
  constructor(private readonly less: (a: T, b: T) => boolean) {}
  get size(): number { return this.items.length; }
  push(item: T): void {
    const items = this.items;
    items.push(item);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(items[i], items[parent])) break;
      const tmp = items[i]; items[i] = items[parent]; items[parent] = tmp;
      i = parent;
    }
  }
  pop(): T | undefined {
    const items = this.items;
    if (items.length === 0) return undefined;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      const n = items.length;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < n && this.less(items[left], items[smallest])) smallest = left;
        if (right < n && this.less(items[right], items[smallest])) smallest = right;
        if (smallest === i) break;
        const tmp = items[i]; items[i] = items[smallest]; items[smallest] = tmp;
        i = smallest;
      }
    }
    return top;
  }
}

function findLowestRiverCrossingPathWithinWildRegionImpl(options: {
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
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey) || isSeaHex(from, hexTerrainByKey) || isSeaHex(target, hexTerrainByKey)) return null;

  const canTouchRegion = (hex: AxialHex) => regionKeys.has(hexKey(hex)) || getHexNeighbors(hex).some((neighbor) => regionKeys.has(hexKey(neighbor)));
  if (!canTouchRegion(from) || !canTouchRegion(target)) return null;

  const riverFullnessByEdge = getRiverCrossingFullnessByEdge(rivers);
  // seq — порядковый номер вставки. Как финальный ключ сравнения он воспроизводит
  // FIFO-порядок стабильной сортировки при полном равенстве (cost, riverCrossings,
  // path.length), поэтому куча извлекает элементы в том же порядке, что старый
  // sort()+shift() → возвращается тот же путь → карта не меняется.
  let seq = 0;
  const queue = new MinHeap<{ path: AxialHex[]; cost: number; riverCrossings: number; seq: number }>(
    (a, b) =>
      a.cost !== b.cost
        ? a.cost < b.cost
        : a.riverCrossings !== b.riverCrossings
          ? a.riverCrossings < b.riverCrossings
          : a.path.length !== b.path.length
            ? a.path.length < b.path.length
            : a.seq < b.seq
  );
  queue.push({ path: [from], cost: 0, riverCrossings: 0, seq: seq++ });
  const bestCostByState = new Map<string, number>([[`${startKey}|0`, 0]]);

  while (queue.size > 0) {
    const current = queue.pop()!;
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
      if (!regionKeys.has(curKey) && !neighborIsInsideRegion) continue;
      if (neighborIsInsideRegion && neighborKey === centerKey) continue;
      if (current.path.some((hex) => hexKey(hex) === neighborKey)) continue;
      if (isLakeHex(neighbor, hexTerrainByKey) || isSeaHex(neighbor, hexTerrainByKey)) continue;

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
      queue.push({ path: [...current.path, neighbor], cost: nextCost, riverCrossings: nextRiverCrossings, seq: seq++ });
    }
  }

  return null;
}
const findLowestRiverCrossingPathWithinWildRegion = __profiled('findLowestRiverCrossingPathWithinWildRegion', findLowestRiverCrossingPathWithinWildRegionImpl);


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

function findAlternativeWildRoadPairPathsImpl(options: {
  region: Region;
  from: AxialHex;
  target: AxialHex;
  roads: Road[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  maxAlternatives: number;
}, rng: RandomStreams = fallbackRandomStreams): AxialHex[][] {
  const { region, from, target, roads, hexTerrainByKey, maxAlternatives } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const centerKey = hexKey(region.centerHex);
  const startKey = hexKey(from);
  const targetKey = hexKey(target);
  if (![from, target].every(h => regionKeys.has(hexKey(h)) || getHexNeighbors(h).some(n => regionKeys.has(hexKey(n))))) return [];
  if (startKey === centerKey || targetKey === centerKey) return [];
  if (startKey === targetKey) return [];
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey) || isSeaHex(from, hexTerrainByKey) || isSeaHex(target, hexTerrainByKey)) return [];

  const roadSegKeys = getRoadSegmentKeys(roads);
  const paths: AxialHex[][] = [];
  const pathKeys = new Set<string>();
  const maxAttempts = 25;

  for (let attempt = 0; attempt < maxAttempts && paths.length < maxAlternatives; attempt += 1) {
    const queue: AxialHex[][] = [[from]];
    const bestDepthByHex = new Map<string, number>([[startKey, 1]]);
    let found: AxialHex[] | null = null;

    for (let queueIndex = 0; queueIndex < queue.length && !found; queueIndex += 1) {
      const path = queue[queueIndex]!;
      const current = path[path.length - 1];
      const currentKey = hexKey(current);
      if (path.length > 1 && currentKey === targetKey) {
        found = path;
        break;
      }

      let neighbors = getHexNeighbors(current).filter((neighbor) => {
        const neighborKey = hexKey(neighbor);
        if (!regionKeys.has(neighborKey) && neighborKey !== targetKey) return false;
        if (path.length === 1 && !regionKeys.has(currentKey) && !regionKeys.has(neighborKey)) return false;
        if (neighborKey === centerKey) return false;
        if (path.some((hex) => hexKey(hex) === neighborKey)) return false;
        if (isLakeHex(neighbor, hexTerrainByKey) || isSeaHex(neighbor, hexTerrainByKey)) return false;
        if (roadSegKeys.has(normalizeRoadSegmentKey(current, neighbor))) return false;
        return true;
      });

      if (attempt % 5 === 1) neighbors = neighbors.reverse();
      else if (attempt % 5 === 2) neighbors = shuffleArray(neighbors, rng);
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
const findAlternativeWildRoadPairPaths = __profiled('findAlternativeWildRoadPairPaths', findAlternativeWildRoadPairPathsImpl);

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
    if (isLakeHex(current, hexTerrainByKey) || isSeaHex(current, hexTerrainByKey)) return false;
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
}, rng: RandomStreams = fallbackRandomStreams): WildIncomingRoadPairCandidate[] {
  const { region, regions, roads, rivers, hexTerrainByKey } = options;
  const incoming = findIncomingRoadEndpointsForRegion(region, roads, hexTerrainByKey, false, getRegionCenterHexKeys(regions))
    .filter((incomingEndpoint) => !isSameHex(incomingEndpoint.endpointHex, region.centerHex) && !isLakeHex(incomingEndpoint.endpointHex, hexTerrainByKey));
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
        from: start.endpointHex,
        target: target.endpointHex,
        roads,
        hexTerrainByKey,
        maxAlternatives: 5
      }, rng);

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

function chooseBestWildIncomingRoadPairCandidate(candidates: WildIncomingRoadPairCandidate[], rng: RandomStreams = fallbackRandomStreams): WildIncomingRoadPairCandidate | null {
  if (candidates.length === 0) return null;
  const minRiverCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  let best = candidates.filter((candidate) => candidate.crossedRiverCount === minRiverCrossings);
  const minLength = Math.min(...best.map((candidate) => candidate.path.length));
  best = best.filter((candidate) => candidate.path.length === minLength);
  return randomFrom(best, rng);
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
  startEndpointHex: AxialHex;
  hexTerrainByKey: Map<string, HexTerrainData>;
}): Array<{ kind: 'road'; entryHex: AxialHex; outsideHex: AxialHex; roadId: number }> {
  const { region, regions, roads, startRoad, startEndpointHex, hexTerrainByKey } = options;
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
        if (isSameHex(hex, startEndpointHex)) continue;
        if (isSameHex(hex, region.centerHex)) continue;
        if (isLakeHex(hex, hexTerrainByKey) || isSeaHex(hex, hexTerrainByKey)) continue;
        targets.set(`${road.id}:${key}`, { kind: 'road', entryHex: hex, outsideHex: hex, roadId: road.id });
      }
    }
  }

  return Array.from(targets.values()).sort((a, b) => hexDistance(a.entryHex, startEndpointHex) - hexDistance(b.entryHex, startEndpointHex));
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
    .filter((incomingEndpoint) => !isSameHex(incomingEndpoint.endpointHex, region.centerHex) && !isLakeHex(incomingEndpoint.endpointHex, hexTerrainByKey));
  if (incoming.length === 0) return [];

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
      startEndpointHex: start.endpointHex,
      hexTerrainByKey
    });
    const startRoadCenterHexes = getRoadRegionCenterHexes(startRoad, regions);
    const targets: Array<{ kind: 'candidate' | 'road'; entryHex: AxialHex; outsideHex: AxialHex; roadId?: number }> = [];
    const differentCenterIncomingTargets = incoming.filter((target) => {
      if (target.roadId === start.roadId) return false;
      if (isSameHex(target.endpointHex, start.endpointHex)) return false;
      const targetRoad = roads.find((road) => road.id === target.roadId);
      return !!targetRoad && !roadsShareRegionCenter(startRoad, targetRoad, regions);
    });

    if (sameCenterRoadTargets.length > 0) {
      targets.push(...sameCenterRoadTargets);
    } else if (differentCenterIncomingTargets.length > 0) {
      for (const target of differentCenterIncomingTargets) {
        targets.push({ kind: 'road', entryHex: target.endpointHex, outsideHex: target.endpointHex, roadId: target.roadId });
      }
    } else {
      for (const target of candidateTargets) {
        if (isSameHex(target.entryHex, start.endpointHex)) continue;
        targets.push({ kind: 'candidate', entryHex: target.entryHex, outsideHex: target.outsideHex });
      }
    }

    for (const target of targets) {
      if (target.roadId === start.roadId) continue;
      const fullPath = findLowestRiverCrossingPathWithinWildRegion({
        region,
        from: start.endpointHex,
        target: target.kind === 'candidate' ? target.entryHex : target.outsideHex,
        rivers,
        hexTerrainByKey,
        freeFirstRiverCrossing: target.kind === 'candidate'
      });
      if (!fullPath || fullPath.length < 2) continue;
      const targetEndpointHex = target.kind === 'candidate' ? target.entryHex : target.outsideHex;
      if (usedEndpointKeys.has(hexKey(targetEndpointHex))) continue;
      const crossedRiverCount = countRoadPathRiverCrossings(fullPath, rivers);
      const targetDistanceFromStartRoadCenter = target.kind === 'candidate' && startRoadCenterHexes.length > 0
        ? Math.max(...startRoadCenterHexes.map((centerHex) => hexDistance(centerHex, target.outsideHex))) - hexDistance(start.endpointHex, target.entryHex)
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

function chooseBestWildRoadCandidate(candidates: WildRoadCandidate[], rng: RandomStreams = fallbackRandomStreams): WildRoadCandidate | null {
  if (candidates.length === 0) return null;
  const minRiverCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  let best = candidates.filter((candidate) => candidate.crossedRiverCount === minRiverCrossings);
  const maxTargetDistanceFromStartRoadCenter = Math.max(...best.map((candidate) => candidate.targetDistanceFromStartRoadCenter));
  best = best.filter((candidate) => candidate.targetDistanceFromStartRoadCenter === maxTargetDistanceFromStartRoadCenter);
  const minLength = Math.min(...best.map((candidate) => candidate.path.length));
  best = best.filter((candidate) => candidate.path.length === minLength);
  return randomFrom(best, rng);
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

function chooseBestWildCandidateRoadCandidate(candidates: WildCandidateRoadCandidate[], rng: RandomStreams = fallbackRandomStreams): WildCandidateRoadCandidate | null {
  if (candidates.length === 0) return null;
  const minRiverCrossings = Math.min(...candidates.map((candidate) => candidate.crossedRiverCount));
  const best = candidates.filter((candidate) => candidate.crossedRiverCount === minRiverCrossings);
  return randomFrom(best, rng);
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
  if (!region.suppressCentralPoi && !(region.generationMode==='mythic' && region.isTract)) points.set(hexKey(region.centerHex), region.centerHex);
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
}, rng: RandomStreams = fallbackRandomStreams): AxialHex[] | null {
  const { region, from, target, rivers, hexTerrainByKey } = options;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const startKey = hexKey(from);
  const targetKey = hexKey(target);
  if (startKey === targetKey) return null;
  if (isLakeHex(from, hexTerrainByKey) || isLakeHex(target, hexTerrainByKey) || isSeaHex(from, hexTerrainByKey) || isSeaHex(target, hexTerrainByKey)) return null;

  const startInside = regionKeys.has(startKey);
  const targetInside = regionKeys.has(targetKey);
  if (!startInside && !targetInside) return null;

  const riverFullnessByEdge = getRiverCrossingFullnessByEdge(rivers);
  // Parent-pointer BFS: очередь хранит гексы, путь восстанавливается из cameFrom. Порядок
  // раскрытия соседей (shuffleArray на каждом узле) и visited-once логика сохранены, поэтому
  // находимый путь идентичен прежней версии на целых путях; убрано копирование пути O(V)/шаг.
  const queue: AxialHex[] = [from];
  const cameFrom = new Map<string, string>();
  const hexByKey = new Map<string, AxialHex>([[startKey, from]]);
  const visited = new Set<string>([startKey]);

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex]!;
    const currentKey = hexKey(current);
    if (currentKey !== startKey && currentKey === targetKey) {
      const path: AxialHex[] = [];
      let traceKey: string | undefined = currentKey;
      while (traceKey) {
        const traceHex = hexByKey.get(traceKey);
        if (!traceHex) break;
        path.push(traceHex);
        if (traceKey === startKey) break;
        traceKey = cameFrom.get(traceKey);
      }
      return path.reverse();
    }

    for (const neighbor of shuffleArray(getHexNeighbors(current), rng)) {
      const neighborKey = hexKey(neighbor);
      if (visited.has(neighborKey)) continue;
      const neighborIsTarget = neighborKey === targetKey;
      const neighborInsideRegion = regionKeys.has(neighborKey);
      if (!neighborIsTarget && !neighborInsideRegion) continue;
      if (isLakeHex(neighbor, hexTerrainByKey) || isSeaHex(neighbor, hexTerrainByKey)) continue;
      if (pathStepCrossesRiver(current, neighbor, riverFullnessByEdge)) continue;
      visited.add(neighborKey);
      cameFrom.set(neighborKey, currentKey);
      hexByKey.set(neighborKey, neighbor);
      queue.push(neighbor);
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

function findRoadOrTrailHexesTouchingRegion(region: Region, roads: Road[]): AxialHex[] {
  const regionKeys = new Set(region.hexes.map(hexKey));
  const touchingHexes = new Map<string, AxialHex>();

  for (const road of roads) {
    for (const segment of road.segments) {
      for (const hex of [segment.from, segment.to]) {
        const key = hexKey(hex);
        if (regionKeys.has(key) || getHexNeighbors(hex).some((neighbor) => regionKeys.has(hexKey(neighbor)))) {
          touchingHexes.set(key, hex);
        }
      }
    }
  }

  return Array.from(touchingHexes.values());
}

function ensureRoadAdjacentTractPoiAndTrail(options: {
  region: Region;
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextRoadId: number;
}, rng: RandomStreams = fallbackRandomStreams): { region: Region; roads: Road[]; nextRoadId: number } {
  const { region, roads, rivers, hexTerrainByKey } = options;
  if (region.sizeCategory !== 'tract') return { region, roads, nextRoadId: options.nextRoadId };

  const touchingRoadHexes = findRoadOrTrailHexesTouchingRegion(region, roads)
    .filter((hex) => !isLakeHex(hex, hexTerrainByKey) && !isSeaHex(hex, hexTerrainByKey));
  if (touchingRoadHexes.length === 0) return { region, roads, nextRoadId: options.nextRoadId };

  const regionKeys = new Set(region.hexes.map(hexKey));
  const eligiblePoiHexes = region.hexes.filter((hex) => !isLakeHex(hex, hexTerrainByKey) && !isSeaHex(hex, hexTerrainByKey));
  if (eligiblePoiHexes.length === 0) return { region, roads, nextRoadId: options.nextRoadId };

  const existingPoiKeys = new Set(region.pointsOfInterest.map(hexKey));
  const roadHexKeys = getRoadHexKeys(roads);
  const poiOnTouchingRoad = region.pointsOfInterest.find((poi) => roadHexKeys.has(hexKey(poi)));
  const nearestDistanceToTouchingRoad = (hex: AxialHex) => Math.min(...touchingRoadHexes.map((roadHex) => hexDistance(hex, roadHex)));
  const fallbackPoi = [...eligiblePoiHexes].sort((a, b) => nearestDistanceToTouchingRoad(a) - nearestDistanceToTouchingRoad(b))[0];
  const targetPoi = poiOnTouchingRoad ?? region.pointsOfInterest[0] ?? fallbackPoi;
  const targetPoiKey = hexKey(targetPoi);
  const updatedRegion = existingPoiKeys.has(targetPoiKey)
    ? region
    : { ...region, pointsOfInterest: [targetPoi, ...region.pointsOfInterest] };

  if (hexHasRoadOrTrail(targetPoi, roads)) {
    return { region: updatedRegion, roads, nextRoadId: options.nextRoadId };
  }

  const candidateStarts = touchingRoadHexes
    .filter((hex) => regionKeys.has(hexKey(hex)) || getHexNeighbors(hex).some((neighbor) => regionKeys.has(hexKey(neighbor))))
    .sort((a, b) => hexDistance(a, targetPoi) - hexDistance(b, targetPoi));

  for (const start of candidateStarts) {
    const path = findWildTrailPath({ region: updatedRegion, from: start, target: targetPoi, rivers, hexTerrainByKey }, rng);
    if (!path || roadPathCrossesRiver(path, rivers)) continue;
    const addResult = addTrailPathWithoutDuplicateSegments({ path, roads, regionId: region.id, nextRoadId: options.nextRoadId });
    if (addResult.added) return { region: updatedRegion, roads: addResult.roads, nextRoadId: addResult.nextRoadId };
  }

  return { region: updatedRegion, roads, nextRoadId: options.nextRoadId };
}

function buildWildRegionTrail(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextRoadId: number;
}, rng: RandomStreams = fallbackRandomStreams): { roads: Road[]; nextRoadId: number } {
  const { region, regions, roads, rivers, hexTerrainByKey, nextRoadId } = options;
  const trailPoints = getWildTrailPoints({ region, regions, roads, hexTerrainByKey });
  if (trailPoints.length < 2) {
    generationLog.detail('Wild trail result', { regionId: region.id, built: false, reason: 'fewer than two eligible points', eligiblePointCount: trailPoints.length });
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

  for (const pair of shuffleArray(pairCandidates, rng)) {
    const path = findWildTrailPath({ region, from: pair.start.hex, target: pair.target.hex, rivers, hexTerrainByKey }, rng);
    if (!path || roadPathCrossesRiver(path, rivers)) continue;
    const addResult = addTrailPathWithoutDuplicateSegments({ path, roads, regionId: region.id, nextRoadId });
    generationLog.detail('Wild trail result', {
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

  generationLog.detail('Wild trail result', { regionId: region.id, built: false, reason: 'no valid path', eligiblePointCount: trailPoints.length });
  return { roads, nextRoadId };
}

const buildWildRegionTrails = __profiled('buildWildRegionTrails', buildWildRegionTrailsImpl);
function buildWildRegionTrailsImpl(options: {
  region: Region;
  regions: Region[];
  roads: Road[];
  rivers: River[];
  hexTerrainByKey: Map<string, HexTerrainData>;
  nextRoadId: number;
}, rng: RandomStreams = fallbackRandomStreams): { roads: Road[]; nextRoadId: number } {
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
    }, rng);
    builtRoads = result.roads;
    nextRoadId = result.nextRoadId;
  }

  return { roads: builtRoads, nextRoadId };
}

type RenderedRoadSegment = { key: string; roadId: number; segmentKey: string; x1: number; y1: number; x2: number; y2: number; kind: RoadKind };
type RenderedRiverCrossing = RiverCrossing & { x: number; y: number; ux: number; uy: number; nx: number; ny: number };
const TRAIL_DASH_LENGTH = 4.04145;

function renderRoadSegments(roads: Road[], offsetX: number, offsetY: number): RenderedRoadSegment[] {
  const result: RenderedRoadSegment[] = [];
  for (const road of roads) {
    for (let i = 0; i < road.segments.length; i += 1) {
      const s = road.segments[i];
      const p1 = toPixel(s.from.q, s.from.r);
      const p2 = toPixel(s.to.q, s.to.r);
      result.push({ key: `road-${road.id}-${i}`, roadId: road.id, segmentKey: normalizeRoadSegmentKey(s.from, s.to), x1: p1.x + offsetX, y1: p1.y + offsetY, x2: p2.x + offsetX, y2: p2.y + offsetY, kind: s.kind });
    }
  }
  return result;
}

function renderRiverCrossings(roadSegments: RenderedRoadSegment[], crossings: RiverCrossing[]): RenderedRiverCrossing[] {
  const segmentsByKey = new Map(roadSegments.map((segment) => [`${segment.roadId}:${segment.segmentKey}`, segment]));
  return crossings.flatMap((crossing) => {
    const segment = segmentsByKey.get(`${crossing.roadId}:${crossing.roadSegmentKey}`);
    if (!segment) return [];
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const length = Math.hypot(dx, dy);
    if (length < 0.001) return [];
    const ux = dx / length;
    const uy = dy / length;
    return [{ ...crossing, x: (segment.x1 + segment.x2) / 2, y: (segment.y1 + segment.y2) / 2, ux, uy, nx: -uy, ny: ux }];
  });
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
  startRiverId: number, rng: RandomStreams = fallbackRandomStreams
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
    const fullness = getRiverDownstreamFullness(river);
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
      const armFullness = (1 + Math.floor(rng.geography() * fullnessRange)) as RiverFullness;
      const id = nextId++;
      arms.push({
        deltaParentRiverId: river.id,
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
    // Нечего обрезать, либо обрезка оставила бы слишком короткую реку — оставляем как есть;
    // финальная проверка моря разберёт итоговую геометрию после всех правок рек.
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

// Инвертированный индекс для морских проверок рек (#4). Строится ОДИН РАЗ по набору рек,
// затем проверка кандидата — O(1) по его ~6 углам/рёбрам вместо скана всех рек на каждого.
//   sourceVertexKeys  — вершины-истоки рек (path[0]): кандидат с таким углом морем быть не может.
//   blockingEdgeKeys  — все рёбра рек, КРОМЕ последнего ребра к разрешённому устью:
//                       кандидат, чьё ребро совпало с таким, морем быть не может.
type RiverSeaBlockIndex = { sourceVertexKeys: Set<string>; blockingEdgeKeys: Set<string> };

function buildRiverSeaBlockIndex(rivers: River[], allowedMouthVertexKeys: Set<string>): RiverSeaBlockIndex {
  const sourceVertexKeys = new Set<string>();
  const blockingEdgeKeys = new Set<string>();
  for (const river of rivers) {
    const path = river.vertexPath ?? [];
    if (path.length < 2) continue;
    sourceVertexKeys.add(path[0].key);
    const mouthIndex = path.length - 1;
    for (let index = 1; index < path.length; index += 1) {
      const isLastEdgeToAllowedMouth = index === mouthIndex && allowedMouthVertexKeys.has(path[index].key);
      if (isLastEdgeToAllowedMouth) continue;
      blockingEdgeKeys.add(edgeKey(path[index - 1], path[index]));
    }
  }
  return { sourceVertexKeys, blockingEdgeKeys };
}

// Заблокирован ли кандидат ребром реки вне устья (без проверки истоков).
function hexBlockedByRiverEdgeIndex(hex: AxialHex, index: RiverSeaBlockIndex): boolean {
  if (index.blockingEdgeKeys.size === 0) return false;
  return getHexEdgesAsVertexPairs(hex).some((edge) => index.blockingEdgeKeys.has(edge.edgeKey));
}

// Заблокирован ли кандидат ребром реки вне устья ИЛИ вершиной-истоком.
function hexBlockedByRiverEdgeOrSourceIndex(hex: AxialHex, index: RiverSeaBlockIndex): boolean {
  if (index.sourceVertexKeys.size > 0
    && getHexCornerPoints(hex).some((vertex) => index.sourceVertexKeys.has(vertex.key))) {
    return true;
  }
  return hexBlockedByRiverEdgeIndex(hex, index);
}

// Обёртка со старой сигнатурой: строит индекс на месте. В циклах по кандидатам стройте индекс
// один раз через buildRiverSeaBlockIndex и зовите hexBlockedByRiverEdgeOrSourceIndex напрямую.
function candidateHexHasRiverEdgeOrSourceAwayFromMouth(
  hex: AxialHex,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>
): boolean {
  return hexBlockedByRiverEdgeOrSourceIndex(hex, buildRiverSeaBlockIndex(rivers, allowedMouthVertexKeys));
}

function canPlaceSeaHexNearRiversImpl(
  hex: AxialHex,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>,
  _regionHexes: AxialHex[] = [],
  index?: RiverSeaBlockIndex
): boolean {
  const idx = index ?? buildRiverSeaBlockIndex(rivers, allowedMouthVertexKeys);
  return !hexBlockedByRiverEdgeOrSourceIndex(hex, idx);
}
const canPlaceSeaHexNearRivers = __profiled('canPlaceSeaHexNearRivers', canPlaceSeaHexNearRiversImpl);

function filterSeaCandidatesByRiverInteraction(
  candidates: Map<string, AxialHex>,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>,
  regionHexes: AxialHex[] = []
): Map<string, AxialHex> {
  const filtered = new Map<string, AxialHex>();
  const riverSeaBlockIndex = buildRiverSeaBlockIndex(rivers, allowedMouthVertexKeys);
  for (const [key, hex] of candidates) {
    if (canPlaceSeaHexNearRivers(hex, rivers, allowedMouthVertexKeys, regionHexes, riverSeaBlockIndex)) filtered.set(key, hex);
  }
  return filtered;
}

// Дядина модель: концы дорог — это «объекты» разметки (наряду с вершинами рек).
// Концы троп намеренно не учитываются: море не должно упираться в trail-only выходы.
// Гекс-кандидат, КАСАЮЩИЙСЯ конца дороги (сам гекс — конец дороги или его сосед),
// получает «красный крест»: морем стать не может. Поэтому фронт заполнения моря об такие
// гексы упирается так же, как об реки, а отрезанные ими кандидаты остаются сушей
// («красные минусы» — не могут быть смежными с морем, потому что кресты мешают).
function getRoadEndpointHexKeysImpl(roads: Road[], centerHexKeys = new Set<string>()): Set<string> {
  const neighbors = new Map<string, Set<string>>();
  for (const road of roads) for (const segment of road.segments) {
    if (segment.kind !== 'road') continue;
    for (const [from, to] of [[segment.from, segment.to], [segment.to, segment.from]]) {
      const key = hexKey(from);
      if (!neighbors.has(key)) neighbors.set(key, new Set());
      neighbors.get(key)!.add(hexKey(to));
    }
  }
  // Only actual segments connect roads. Adjacent hexes do not close an exit.
  return new Set(Array.from(neighbors).filter(([key, next]) => next.size === 1 && !centerHexKeys.has(key)).map(([key]) => key));
}
// Профилируется: вложенный roads.some() → ~O(дороги²·концы) (см. ?profile).
const getRoadEndpointHexKeys = __profiled('getRoadEndpointHexKeys (концы дорог, O(дороги²))', getRoadEndpointHexKeysImpl);

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

function candidateTouchesHexNearLake(
  hex: AxialHex,
  existingTerrain: Map<string, HexTerrainData>
): boolean {
  return getHexNeighbors(hex).some((neighbor) => (
    getHexNeighbors(neighbor).some((lakeNeighbor) => existingTerrain.get(hexKey(lakeNeighbor))?.terrainOverride === 'lake')
  ));
}

function buildRiverStartVertexKeys(rivers: River[]): Set<string> {
  return new Set(
    rivers
      .map((river) => river.vertexPath?.[0]?.key)
      .filter((key): key is string => typeof key === 'string')
  );
}

function candidateTouchesRiverStartVertexKeys(hex: AxialHex, riverStartVertexKeys: Set<string>): boolean {
  if (riverStartVertexKeys.size === 0) return false;

  return getHexNeighbors(hex).some((neighbor) => (
    getHexCornerPoints(neighbor).some((vertex) => riverStartVertexKeys.has(vertex.key))
  ));
}

function candidateTouchesHexTouchingRiverStartVertex(hex: AxialHex, rivers: River[]): boolean {
  // Тонкая обёртка над версией с предпосчитанным множеством. Внутри цикла кандидатов
  // используйте candidateTouchesRiverStartVertexKeys, построив множество один раз, — иначе
  // riverStartVertexKeys пересобирается из всех рек на каждого кандидата.
  return candidateTouchesRiverStartVertexKeys(hex, buildRiverStartVertexKeys(rivers));
}

// Обёртка со старой сигнатурой: строит индекс на месте. В циклах по кандидатам стройте индекс
// один раз через buildRiverSeaBlockIndex и зовите hexBlockedByRiverEdgeIndex напрямую.
function candidateHexHasRiverEdgeAwayFromMouth(
  hex: AxialHex,
  rivers: River[],
  allowedMouthVertexKeys: Set<string>
): boolean {
  return hexBlockedByRiverEdgeIndex(hex, buildRiverSeaBlockIndex(rivers, allowedMouthVertexKeys));
}

// (Дядина модель, п.1) Единый сет «не-морских» гексов — кандидаты, которые НЕ МОГУТ стать
// морем, потому что касаются буферных гексов рядом с объектами, у которых моря быть не должно:
//   - рёбра рек (вне устья) — как и раньше, через candidateHexHasRiverEdgeAwayFromMouth;
//   - гексы, касающиеся начальной вершины реки (места, где река втекает в регион);
//   - концы дорог (но не троп);
//   - гексы около озёр.
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
  const riverStartVertexKeys = buildRiverStartVertexKeys(rivers);
  const riverSeaBlockIndex = buildRiverSeaBlockIndex(rivers, allowedMouthVertexKeys);
  for (const [key, hex] of candidates) {
    if (hexBlockedByRiverEdgeIndex(hex, riverSeaBlockIndex)) { nonSea.add(key); continue; }
    if (candidateTouchesRiverStartVertexKeys(hex, riverStartVertexKeys)) { nonSea.add(key); continue; }
    if (candidateTouchesRoadEndpoint(hex, roadEndpointKeys)) { nonSea.add(key); continue; }
    if (candidateTouchesHexNearLake(hex, existingTerrain)) { nonSea.add(key); continue; }
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

function riverTouchesSea(river: River, seaVertexKeys: Set<string>, seaEdgeKeys: Set<string>): boolean {
  const path = river.vertexPath ?? [];
  if (path.length < 2) return false;
  if (path.some((vertex) => seaVertexKeys.has(vertex.key))) return true;
  for (let index = 1; index < path.length; index += 1) {
    if (seaEdgeKeys.has(edgeKey(path[index - 1], path[index]))) return true;
  }
  return false;
}

function riverTouchesRegion(river: River, regionVertexKeys: Set<string>): boolean {
  return (river.vertexPath ?? []).some((vertex) => regionVertexKeys.has(vertex.key));
}

function trimTractRiverSourcesAwayFromSea(
  rivers: River[],
  regionHexes: AxialHex[],
  seaKeys: Iterable<string>
): River[] {
  const seaKeyList = Array.from(seaKeys);
  if (seaKeyList.length === 0) return rivers;

  const seaVertexKeys = getSeaVertexKeysFromSeaKeys(seaKeyList);
  const seaEdgeKeys = getSeaEdgeKeysFromSeaKeys(seaKeyList);
  if (seaVertexKeys.size === 0 && seaEdgeKeys.size === 0) return rivers;

  const regionVertexKeys = new Set<string>();
  for (const hex of regionHexes) {
    for (const vertex of getHexCornerPoints(hex)) regionVertexKeys.add(vertex.key);
  }

  const sourceStillTouchesSea = (path: RiverVertex[], startIndex: number): boolean => {
    if (path.length - startIndex < 2) return false;
    if (seaVertexKeys.has(path[startIndex].key)) return true;
    return seaEdgeKeys.has(edgeKey(path[startIndex], path[startIndex + 1]));
  };

  let changed = false;
  const trimmedRivers: River[] = [];
  for (const river of rivers) {
    const path = river.vertexPath ?? [];
    if (path.length < 2 || !riverTouchesRegion(river, regionVertexKeys)) {
      trimmedRivers.push(river);
      continue;
    }

    let startIndex = 0;
    while (sourceStillTouchesSea(path, startIndex)) startIndex += 1;

    if (startIndex === 0) {
      trimmedRivers.push(river);
      continue;
    }

    changed = true;
    const trimmedPath = path.slice(startIndex);
    if (trimmedPath.length >= 2) trimmedRivers.push({ ...river, vertexPath: trimmedPath });
  }

  return changed ? trimmedRivers : rivers;
}

function drawLakeVerticesDebug(lakeVertices: LakeVertex[], offsetX: number, offsetY: number) {
  return lakeVertices.map((vertex) => ({
    key: `dbg-lake-vertex-${vertex.key}`,
    cx: vertex.x + offsetX,
    cy: vertex.y + offsetY
  }));
}
function generateRoadsForRegionImpl(options: {
  region: Region; regions: Region[]; roads: Road[]; rivers: River[]; hexTerrainByKey: Map<string, HexTerrainData>; nextRoadId: number; candidateHexes: AxialHex[];
}, rng: RandomStreams = fallbackRandomStreams): { roads: Road[]; nextRoadId: number } {
  const { region, regions, roads, hexTerrainByKey, rivers, candidateHexes } = options;
  const usedRoadPoiKeys = new Set<string>();
  let nextRoadId = options.nextRoadId;
  let built = cloneRoads(roads);
  const settled = region.biomeLandType === 'settled';
  if (!settled) {
    let builtAnyWildRoad = false;
    const incomingWildRoadEndpoints = findIncomingRoadEndpointsForRegion(region, built, hexTerrainByKey, false, getRegionCenterHexKeys(regions))
      .filter((incomingEndpoint) => !isSameHex(incomingEndpoint.endpointHex, region.centerHex) && !isLakeHex(incomingEndpoint.endpointHex, hexTerrainByKey));
    const incomingWildRoadCount = getUniqueIncomingRoadCount(incomingWildRoadEndpoints);
    const usedWildRoadEndpointKeys = new Set<string>();
    while (true) {
      const wildCandidate = chooseBestWildRoadCandidate(getWildRoadCandidates({ region, regions, roads: built, rivers, hexTerrainByKey, candidateHexes, usedEndpointKeys: usedWildRoadEndpointKeys }), rng);
      if (!wildCandidate) break;
      const added = addWildRoadCandidateToExistingRoad({ candidate: wildCandidate, roads: built, region, hexTerrainByKey });
      generationLog.detail('Wild road result', {
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
      const candidateRoad = chooseBestWildCandidateRoadCandidate(getWildCandidateRoadCandidates({ region, roads: built, rivers, hexTerrainByKey, candidateHexes }), rng);
      if (candidateRoad) {
        const addResult = addWildCandidateRoadCandidate({ candidate: candidateRoad, roads: built, region, hexTerrainByKey, nextRoadId });
        built = addResult.roads;
        nextRoadId = addResult.nextRoadId;
        builtAnyWildRoad = addResult.added;
        generationLog.detail('Wild candidate road result', {
          regionId: region.id,
          built: addResult.added,
          crossedRiverCount: candidateRoad.crossedRiverCount,
          pathLength: candidateRoad.path.length
        });
      }
    }

    if (!builtAnyWildRoad) {
      generationLog.detail('Wild road result', {
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
    }, rng);
  }

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
  let firstIncomingEndpointHex: AxialHex | null = null;
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
      }, rng));
    const best = chooseBestSettledIncomingRoadCandidate(candidates, rng);
    if (!best) {
      generationLog.detail(logLabel, { regionId: region.id, built: false, reason: 'no valid incoming road path' });
      return null;
    }

    const added = addRoadFromPath(best.extendedPath, 'road', [best.incoming.endpointHex, best.targetHex]);
    generationLog.detail(logLabel, {
      regionId: region.id,
      built: added,
      incomingRoadId: best.incoming.roadId,
      incomingRoadHex: hexKey(best.incoming.endpointHex),
      entryHex: best.extendedPath[1] ? hexKey(best.extendedPath[1]) : null,
      targetHex: hexKey(best.targetHex),
      touchedPoiCount: best.touchedPoiCount,
      crossedRiverCount: best.crossedRiverCount,
      pathLength: best.extendedPath.length
    });
    if (!added) return null;

    usedIncomingRoadIds.add(best.incoming.roadId);
    if (!firstIncomingEndpointHex) firstIncomingEndpointHex = best.incoming.endpointHex;
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
      if (isLakeHex(hex, hexTerrainByKey) || isSeaHex(hex, hexTerrainByKey)) continue;
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
        }, rng);
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
    const best = chooseBestSupplementalSettledRoadCandidate(candidates, rng);
    if (!best) {
      generationLog.detail(logLabel, { regionId: region.id, built: false, reason: 'no valid supplemental center road path' });
      return false;
    }
    const added = addRoadFromPath(best.extendedPath, 'road', [best.startHex, region.centerHex]);
    generationLog.detail(logLabel, {
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
      }, rng);
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
    const best = chooseBestSupplementalSettledRoadCandidate(candidates, rng);
    if (!best) {
      generationLog.detail(logLabel, { regionId: region.id, built: false, reason: 'no valid supplemental center-to-candidate-facing path' });
      return false;
    }
    const added = addRoadFromPath(best.extendedPath, 'road', [region.centerHex, best.targetHex]);
    generationLog.detail(logLabel, {
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
    const best = chooseBestSupplementalSettledRoadCandidate(candidates, rng);
    if (!best) {
      generationLog.detail(logLabel, { regionId: region.id, built: false, reason: 'no valid supplemental road-to-road path' });
      return false;
    }
    const added = addRoadFromPath(best.extendedPath, 'road', [best.startHex, best.targetHex]);
    generationLog.detail(logLabel, {
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

    while (true) {
      const roadTargets = getNonLakeRoadHexesInRegion(region, built, hexTerrainByKey)
        .filter((hex) => !isSameHex(hex, region.centerHex));
      if (roadTargets.length === 0) break;
      if (!buildBestIncomingRoadToTargets(roadTargets, 'Additional settled incoming road result')) break;
    }

    enforceSettledRoadMinimum(firstIncomingEndpointHex ?? region.centerHex, getUniqueIncomingRoadCount(incoming) === 1);
    return connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId });
  }
  if (incoming.length === 0) {
    const maxCandidates = 3;
    const firstPoiTargets = getUnusedPoiTargets(region, usedRoadPoiKeys, hexTerrainByKey).sort((a, b) => hexDistance(b, region.centerHex) - hexDistance(a, region.centerHex));
    const firstFallbackTargets = getAvailableRoadFallbackHexes({ region, fromHex: region.centerHex, roads: built, hexTerrainByKey, usedRoadPoiKeys, excludeHexKeys: new Set([hexKey(region.centerHex)]) });
    let firstBest: RoadCandidatePath | null = null;
    for (const targetPoi of firstPoiTargets) {
      const candidates = collectAlternativeRoadPathsToTarget({ region, fromHex: region.centerHex, targetHex: targetPoi, targetIsPoi: true, roads: built, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives: maxCandidates }, rng);
      firstBest = chooseBestRoadCandidate(candidates, rng);
      if (firstBest) break;
    }
    if (!firstBest) {
      for (const fallbackHex of firstFallbackTargets) {
        const candidates = collectAlternativeRoadPathsToTarget({ region, fromHex: region.centerHex, targetHex: fallbackHex, targetIsPoi: false, roads: built, rivers, hexTerrainByKey, usedRoadPoiKeys, maxAlternatives: maxCandidates }, rng);
        firstBest = chooseBestRoadCandidate(candidates, rng);
        if (firstBest) break;
      }
    }
    if (!firstBest) {
      enforceSettledRoadMinimum(region.centerHex);
      return connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId });
    }
    if (addRoadFromPath(firstBest.extendedPath, 'road', [region.centerHex, firstBest.targetHex, firstBest.extendedPath[firstBest.extendedPath.length - 1]], new Set([hexKey(firstBest.targetHex)]))) {
      markPoiOnPathAsUsed(firstBest.extendedPath, region, usedRoadPoiKeys);
    } else {
      enforceSettledRoadMinimum(region.centerHex);
      return connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId });
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
      }, rng);
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
    const secondBest = chooseBestSettledCandidateRoadCandidate(secondCandidateRoads, rng);
    const secondRoadPath = secondBest ? trimPathToRegionHexes(secondBest.extendedPath, region) : [];
    if (secondBest && addRoadFromPath(secondRoadPath, 'road', [region.centerHex, secondBest.entryHex], new Set([hexKey(secondBest.entryHex)]))) {
      generationLog.detail('Second settled candidate road result', {
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
      generationLog.detail('Second settled candidate road result', {
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
          if (isLakeHex(target.entryHex, hexTerrainByKey) || isLakeHex(target.candidateHex, hexTerrainByKey) || isSeaHex(target.entryHex, hexTerrainByKey)) return false;
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
      const thirdBest = chooseBestThirdRoadCandidate(thirdCandidates, rng);
      const thirdRoadPath = thirdBest ? trimPathToRegionHexes(thirdBest.extendedPath, region) : [];
      if (thirdBest && thirdRoadPath.length >= 2) {
        const roadHex = thirdRoadPath[0];
        const entryHex = thirdRoadPath[thirdRoadPath.length - 1];
        const candidateHex = thirdBest.targetHex;
        const entryEndIsRegionBorder = getRegionBorderHexes(region).some((hex) => isSameHex(hex, entryHex));
        const candidateEndIsCandidate = candidateKeys.has(hexKey(candidateHex));
        const roadStartHasExistingRoad = hexHasRoad(roadHex, built);
        const preBuildEntryAdjacentToRoad = isAdjacentToRoadHex(entryHex, built);
        const pathHasLakeOrSea = thirdBest.extendedPath.some((hex) => isLakeHex(hex, hexTerrainByKey) || isSeaHex(hex, hexTerrainByKey));
        const trimmedCandidateExitSegment = thirdRoadPath.length < thirdBest.extendedPath.length;
        const isValid = entryEndIsRegionBorder
          && candidateEndIsCandidate
          && areHexesAdjacent(entryHex, candidateHex)
          && !isLakeHex(entryHex, hexTerrainByKey)
          && !isLakeHex(candidateHex, hexTerrainByKey)
          && !isSeaHex(entryHex, hexTerrainByKey)
          && !preBuildEntryAdjacentToRoad
          && roadStartHasExistingRoad
          && !pathHasLakeOrSea
          && trimmedCandidateExitSegment;
        if (isValid) {
          const added = addRoadFromPath(thirdRoadPath, 'road', [roadHex, entryHex]);
          generationLog.detail('Third settled road result', {
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
          generationLog.warning('Third settled road validation failed', {
            regionId: region.id,
            entryHex: hexKey(entryHex),
            candidateHex: hexKey(candidateHex),
            roadStart: hexKey(roadHex),
            entryEndIsRegionBorder,
            candidateEndIsCandidate,
            roadStartHasExistingRoad,
            preBuildEntryAdjacentToRoad,
            pathHasLakeOrSea,
            trimmedCandidateExitSegment
          });
          generationLog.detail('Third settled road result', {
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
        generationLog.detail('Third settled road result', {
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
    return connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId });
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
  return connectRemainingPoiWithTrails({ region, roads: built, rivers, hexTerrainByKey, nextRoadId });
}
// Complete physical connections after the existing route-selection procedure.
// Every added segment has at least one end in the new region; old interiors stay fixed.
function completeRegionRoadConnections(options: {
  region: Region; regions: Region[]; roads: Road[]; hexTerrainByKey: Map<string, HexTerrainData>; nextRoadId: number;
}): { roads: Road[]; nextRoadId: number } {
  const { region, regions, hexTerrainByKey } = options;
  const built = cloneRoads(options.roads);
  let nextRoadId = options.nextRoadId;
  const regionKeys = new Set(region.hexes.map(hexKey));
  const allRegions = [...regions.filter(r => r.id !== region.id), region];
  const occupied = new Set(allRegions.flatMap(r => r.hexes.map(hexKey)));
  const destinations = new Set(allRegions.flatMap(r => [...(r.isTract || r.suppressCentralPoi ? [] : [r.centerHex]), ...r.pointsOfInterest].map(hexKey)));
  const isDry = (hex: AxialHex) => !isLakeHex(hex, hexTerrainByKey) && !isSeaHex(hex, hexTerrainByKey);
  const hasExit = (hex: AxialHex) => getHexNeighbors(hex).some(n => !occupied.has(hexKey(n)) && isDry(n));
  const degree = (key: string) => new Set(built.flatMap(r => r.segments.flatMap(s =>
    hexKey(s.from) === key ? [hexKey(s.to)] : hexKey(s.to) === key ? [hexKey(s.from)] : []))).size;
  const endpoints = [...getRoadEndpointHexKeysImpl(built)].map(parseHexKey);
  for (const endpoint of endpoints) {
    const endpointKey = hexKey(endpoint);
    if (destinations.has(endpointKey) || degree(endpointKey) !== 1) continue;
    const inside = regionKeys.has(endpointKey);
    if (inside && hasExit(endpoint)) continue;
    if (!inside && !getHexNeighbors(endpoint).some(n => regionKeys.has(hexKey(n)))) continue;
    const roadKeys = getRoadHexKeys(built);
    // Prefer connection to an existing route/destination; otherwise keep an exit
    // on the current frontier. No future direction is stored.
    const targetGroups = [
      region.hexes.filter(h => roadKeys.has(hexKey(h)) || destinations.has(hexKey(h))),
      region.hexes.filter(hasExit)
    ];
    for (const targets of targetGroups) {
      const usableTargets = targets.filter(h => hexKey(h) !== endpointKey && isDry(h));
      const path = findRoadPathWithinRegion({ region, from: endpoint, targets: usableTargets, roads: built, hexTerrainByKey });
      if (!path || !canAddRoadPath({ path, roads: built, region, hexTerrainByKey, allowedRoadHexes: [endpoint, path[path.length - 1]] })) continue;
      const segments = path.slice(1).map((to, i): RoadSegment => ({ from: path[i], to, kind: 'road' }));
      built.push({ id: nextRoadId++, regionId: region.id, segments });
      break;
    }
  }
  // Fill a shortfall with real routes between meaningful endpoints. Do not
  // create isolated interior starts or split IDs merely to satisfy the count.
  if (!region.isTract && region.biomeLandType === 'settled') {
    while (getRoadBuildCountForSettledRegion(region, built) < getSettledMainRoadLimit(region)) {
      const roadKeys = getRoadHexKeys(built);
      const targets = region.hexes.filter(h => isDry(h) &&
        (destinations.has(hexKey(h)) || hasExit(h)) && !roadKeys.has(hexKey(h)));
      const starts = region.hexes.filter(h => isDry(h) &&
        (roadKeys.has(hexKey(h)) || destinations.has(hexKey(h))));
      let added = false;
      for (const start of starts) {
        const path = findRoadPathWithinRegion({ region, from: start, targets, roads: built, hexTerrainByKey });
        if (!path || !canAddRoadPath({ path, roads: built, region, hexTerrainByKey, allowedRoadHexes: [start, path[path.length - 1]] })) continue;
        built.push({ id: nextRoadId++, regionId: region.id,
          segments: path.slice(1).map((to, i): RoadSegment => ({ from: path[i], to, kind: 'road' })) });
        added = true;
        break;
      }
      if (!added) break;
    }
  }
  return { roads: built, nextRoadId };
}
const generateRoadsForRegion = __profiled('generateRoadsForRegion', (options: Parameters<typeof generateRoadsForRegionImpl>[0], rng: RandomStreams = fallbackRandomStreams) =>
  completeRegionRoadConnections({ ...options, ...generateRoadsForRegionImpl(options, rng) }));

export function App() {
  const [initialGeneration] = useState(() => createGenerationState(newWorldSeed()));
  const generationRef = useRef(cloneGenerationState(initialGeneration));
  // Synchronous revision invalidates callbacks from an older document, including
  // duplicate events in the same batch before React has rendered the commit.
  const documentRevision = useRef(0);
  const poiDocumentToken=useRef<object>({});
  const renderedDocumentRevision = documentRevision.current;
  const activeGenerationBefore = useRef<GenerationState | null>(null);
  const activeGenerationBackup = useRef<GenerationBackup | null>(null);
  const [seedInput, setSeedInput] = useState(String(initialGeneration.masterSeed));
  const [seedError, setSeedError] = useState(false);
  const [legacyNotice, setLegacyNotice] = useState(false);
  const rng: RandomStreams = { geography: () => draw(generationRef.current, 'geography'), poi: () => draw(generationRef.current, 'poi') };
  const restoreGeneration = (state: GenerationState) => { generationRef.current = cloneGenerationState(state); setSeedInput(String(state.masterSeed)); setSeedError(false); };

  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const selectedHexOverlayRef = useRef<SVGSVGElement | null>(null);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  // Native wheel/touch listeners are installed once; consult the latest editor closure.
  const finishMapNameRef = useRef<() => boolean>(() => true);
  const mapScaleRef = useRef(1);
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const mapZoomFrameRef = useRef<number | null>(null);
  const mapNavigationIdleRef = useRef<number | null>(null);
  const pendingMapZoomRef = useRef<{ scale: number; clientX?: number; clientY?: number } | null>(null);
  const mapPanFrameRef = useRef<number | null>(null);
  const pendingMapPanRef = useRef<{ left: number; top: number } | null>(null);
  const pinchZoomRef = useRef<{ distance: number; scale: number } | null>(null);
  const mapDragRef = useRef<{ pointerId: number; startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const mapToolbarRef = useRef<HTMLDivElement | null>(null);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const t = UI_TEXT[language];
  const [generationMode, setGenerationMode] = useState<GenerationMode>('classic');
  const [kingdoms, setKingdoms] = useState<Kingdom[]>([]);
  const [obstacles, setObstacles] = useState<EditableObstacle[]>([]);
  const kingdomInFlight = useRef(false);
  const advancedJobs = useRef(new WeakSet<KingdomJob>());
  const consumedRegenerations = useRef(new WeakSet<object>());
  const [kingdomJob, setKingdomJob] = useState<KingdomJob | null>(null);
  const [detailedRenderReady, setDetailedRenderReady] = useState(true);
  const [tags,setTags] = useState<TagState>(emptyTags);
  const [activeTagDraftCount,setActiveTagDraftCount]=useState(0);
  const activeTagDraftKeys=useRef(new Set<string>());
  const notifyTagDraft=(key:string,active:boolean)=>{
    const keys=activeTagDraftKeys.current,before=keys.size;
    if(active)keys.add(key);else keys.delete(key);
    if(keys.size!==before)setActiveTagDraftCount(keys.size);
  };
  const tagsRef=useRef(tags);
  const updateTags=(value:TagState)=>{tagsRef.current=value;setTags(value);};
  const tagLocks=useRef(new Map<string,number>());
  const [tagAnimations,setTagAnimations]=useState<Record<string,{key:string;slot?:number;revision:number;expiresAt:number}>>({});
  const [tagAnnouncement,setTagAnnouncement]=useState('');
  const [regions, setRegions] = useState<Region[]>([]);
  const [candidateHexes, setCandidateHexes] = useState<AxialHex[]>([]);
  const [rivers, setRivers] = useState<River[]>([]);
  const [knave,setKnave]=useState<KnaveLayer|undefined>(undefined);
  const knaveRef=useRef(knave);knaveRef.current=knave;
  const updateKnave=(value:KnaveLayer|undefined)=>{knaveRef.current=value;setKnave(value);};
  const [editorNames,setEditorNames]=useState<EditorNames>({});
  const editorNamesRef=useRef(editorNames);editorNamesRef.current=editorNames;
  const updateEditorNames=(value:EditorNames)=>{editorNamesRef.current=value;setEditorNames(value);};
  const [toponyms, setToponyms] = useState<ToponymRegistry>({});
  const [toponymSeed, setToponymSeed] = useState(() => toponymSeedFor(initialGeneration.masterSeed));
  const [roads, setRoads] = useState<Road[]>([]);
  const [crossings, setCrossings] = useState<RiverCrossing[]>([]);
  const [selectedHex, setSelectedHex] = useState<AxialHex | null>(START_HEX);
  const [debugRivers, setDebugRivers] = useState(false);
  const [hexTerrainByKey, setHexTerrainByKey] = useState<Map<string, HexTerrainData>>(new Map());
  const [waterPoiByKey, setWaterPoiByKey] = useState<Map<string, WaterPoiKind>>(new Map());
  const [biomeOverrideByHexKey, setBiomeOverrideByHexKey] = useState<Map<string, BiomeId>>(new Map());
  const [editingHexBiomeKey, setEditingHexBiomeKey] = useState<string | null>(null);
  const [editingPoiHexKey, setEditingPoiHexKey] = useState<string | null>(null);
  const [editingCentralPoiRegionId, setEditingCentralPoiRegionId] = useState<number | null>(null);
  const [nextLakeId, setNextLakeId] = useState(1);
  const [seaIdentity,setSeaIdentity]=useState(()=>({seas:[] as SeaRecord[],nextSeaId:1}));
  const seaIdentityRef=useRef(seaIdentity);
  const updateSeaIdentity=(value:{seas:SeaRecord[];nextSeaId:number})=>{const next={seas:value.seas,nextSeaId:value.nextSeaId};seaIdentityRef.current=next;setSeaIdentity(next);};
  const [nextRoadId, setNextRoadId] = useState(1);
  const [nextObstacleId, setNextObstacleId] = useState(1);
  const [nextRiverId, setNextRiverId] = useState(1);
  const [riverFeatureOverrides,setRiverFeatureOverrides] = useState<RiverFeatures>(emptyRiverFeatures);
  const importInFlight = useRef(false);
  const [isImporting, setIsImporting] = useState(false);
  const [gmNotesByHexKey, setGmNotesByHexKey] = useState<Record<string, string>>({});
  const notesMapRef = useRef(gmNotesByHexKey);
  notesMapRef.current = gmNotesByHexKey;
  const [notesEditorKey, setNotesEditorKey] = useState<string | null>(null);
  const notesTextRef = useRef<HTMLTextAreaElement | null>(null);
  const [notesError, setNotesError] = useState(false);
  const notesSelectionRef = useRef<string | null>(null);
  notesSelectionRef.current = selectedHex ? hexKey(selectedHex) : null;
  const [undoHistory, setUndoHistory] = useState<MapTransaction[]>([]);
  const [redoHistory, setRedoHistory] = useState<MapTransaction[]>([]);
  const undoHistoryRef = useRef(undoHistory), redoHistoryRef = useRef(redoHistory);
  undoHistoryRef.current = undoHistory; redoHistoryRef.current = redoHistory;
  const notesGroupRef = useRef<{key: string; before: DocumentSnapshot; undo: MapTransaction[]; redo: MapTransaction[]} | null>(null);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesComposingRef = useRef(false);
  const finishNotesGroup = () => {
    if (notesTimerRef.current !== null) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = null; notesGroupRef.current = null;
  };
  const clearNotesDraft = () => { finishNotesGroup(); setNotesEditorKey(null); setNotesError(false); };
  const updateNotesMap = (notes: Record<string, string>) => { notesMapRef.current = notes; setGmNotesByHexKey(notes); };
  useEffect(() => { finishNotesGroup(); setNotesEditorKey(null); setNotesError(false); }, [selectedHex?.q, selectedHex?.r]);
  useEffect(() => { if (notesEditorKey) notesTextRef.current?.focus(); }, [notesEditorKey]);
  useEffect(() => () => { if (notesTimerRef.current !== null) clearTimeout(notesTimerRef.current); }, []);
  // Generation checkpoints are separate from the user's undo/redo timeline.
  const [history, setHistory] = useState<MapSnapshot[]>([]);
  // Отложенная перегенерация: ставим заявку, ждём пока React применит
  // восстановленный снимок, и только потом генерируем регион заново.
  const [pendingRegen, setPendingRegen] = useState<{ anchorHex: AxialHex; options: GenerationOptions; backup: GenerationBackup; actionContext: GenerationActionContext } | null>(null);
  // Параметры ручной генерации ('auto' — прежнее случайное поведение).
  const [genSizeCategory, setGenSizeCategory] = useState<'auto' | Exclude<Region['sizeCategory'], 'tract'>>('auto');
  const [genLandType, setGenLandType] = useState<'auto' | BiomeLandType>('auto');
  const [genBiome, setGenBiome] = useState<'auto' | BiomeId>('auto');
  const [genCoastal, setGenCoastal] = useState<'auto' | CoastalPreference>('mainland');
  // Inline drafts are UI-only; only their captured locale is committed.
  type NameTarget = { key: string; type: 'region' | 'settlement' | 'river' | 'lake' | 'kingdom' | 'poi' | 'waterPoi' | EditorObject['type']; ru: string; en: string; location: string; poiLocator?:string; editorLocator?:string; fallback?:{ru:string;en:string} };
  type NameDraft = { target: NameTarget; revision: number; language: Language; value: string; otherValue?:string; surface: string };
  const [editMode, setEditMode] = useState(false);
  type KnaveDraft={id:number;revision:number;token:object;hexKey:string;poiKey:string|null;difficulty:Difficulty;mode:Discovery;clueText:string};
  const [knaveDraft,setKnaveDraft]=useState<KnaveDraft|null>(null);
  const knaveDraftRef=useRef<KnaveDraft|null>(null),knaveDraftSerial=useRef(0),knaveComposing=useRef(false);
  const [knaveError,setKnaveError]=useState<string|null>(null);
  const [knaveExitRequest,setKnaveExitRequest]=useState<{draft:KnaveDraft;action:()=>void}|null>(null);
  const updateKnaveDraft=(value:KnaveDraft|null)=>{knaveDraftRef.current=value;setKnaveDraft(value);setKnaveError(null);if(!value){setKnaveExitRequest(null);knaveComposing.current=false;}};
  type PoiDraft={id:number;revision:number;token:object;source:PoiLocator;q:string;r:string;ambiguous:string[]};
  const [poiDraft,setPoiDraft]=useState<PoiDraft|null>(null);
  const poiDraftRef=useRef<PoiDraft|null>(null),poiDraftSerial=useRef(0);
  const [poiExitRequest,setPoiExitRequest]=useState<{draft:PoiDraft;action:()=>void}|null>(null);
  const updatePoiDraft=(draft:PoiDraft|null)=>{poiDraftRef.current=draft;setPoiDraft(draft);if(!draft)setPoiExitRequest(null);};
  type RegionDraft={id:number;revision:number;originKey:string;edit:RegionEdit;ambiguousRegionIds?:number[]};
  const [regionDraft,setRegionDraft]=useState<RegionDraft|null>(null);
  const regionDraftRef=useRef<RegionDraft|null>(null),regionDraftSerial=useRef(0);
  const [regionTargetHoverId,setRegionTargetHoverId]=useState<number|null>(null);
  const updateRegionDraft=(value:RegionDraft|null)=>{regionDraftRef.current=value;setRegionDraft(value);if(!value)setRegionTargetHoverId(null);};
  type RiverFeatureTarget = {riverId:number;hexKey:string;edgeKey?:string;vertexKey?:string};
  const [riverFeatureTarget,setRiverFeatureTarget]=useState<RiverFeatureTarget|null>(null);
  const riverFeatureTargetRef=useRef<RiverFeatureTarget|null>(null);
  riverFeatureTargetRef.current=riverFeatureTarget;
  type WaterDraft={id:number;revision:number;originKey:string;edit:WaterEdit;options:WaterEditOptions;preview:boolean};
  const [waterDraft,setWaterDraft]=useState<WaterDraft|null>(null);
  const waterDraftRef=useRef<WaterDraft|null>(null),waterDraftSerial=useRef(0);
  const waterDraftOverlayRef=useRef<SVGSVGElement|null>(null);
  const updateWaterDraft=(value:WaterDraft|null)=>{waterDraftRef.current=value;setWaterDraft(value);};
  type RiverDraft = {path:RiverVertex[];riverId?:number;revision:number;context:ReturnType<typeof buildManualRiverGeometryContext>;options:RiverEditOptions};
  const [riverDraft,setRiverDraft]=useState<RiverDraft|null>(null);
  const riverDraftRef=useRef<RiverDraft|null>(null);
  const [riverDraftAmbiguity,setRiverDraftAmbiguity]=useState<string[]>([]);
  const [riverDraftHover,setRiverDraftHover]=useState<string|null>(null);
  const riverDraftGesture=useRef<{x:number;y:number;pointerId:number;active:boolean;moved:boolean}|null>(null);
  const updateRiverDraft=(value:RiverDraft|null)=>{riverDraftRef.current=value;setRiverDraft(value);setRiverDraftAmbiguity([]);setRiverDraftHover(null);};
  type RiverCommandPreview={edit:RiverEdit;options:RiverEditOptions;revision:number;draft?:RiverDraft};
  const [riverCommandPreview,setRiverCommandPreview]=useState<RiverCommandPreview|null>(null);
  const riverCommandPreviewRef=useRef<RiverCommandPreview|null>(null);
  const updateRiverPreview=(value:RiverCommandPreview|null)=>{riverCommandPreviewRef.current=value;setRiverCommandPreview(value);};
  const [riverHitChoices,setRiverHitChoices]=useState<RiverFeatureTarget[]>([]);
  const [riverRoadHitChoices,setRiverRoadHitChoices]=useState<{roadId:number;pair:string}[]>([]);
  const [riverHitHover,setRiverHitHover]=useState<RiverFeatureTarget|null>(null);
  type RoadDraft = {path:AxialHex[];kind:RoadKind;crossingKinds:Record<string,RiverCrossingKind>;revision:number};
  const [roadDraft,setRoadDraft] = useState<RoadDraft|null>(null);
  const roadDraftRef = useRef<RoadDraft|null>(null);
  const updateRoadDraft = (draft:RoadDraft|null) => {roadDraftRef.current=draft;setRoadDraft(draft);};
  type RoadFeatureResolution={edit:RoadEdit;draft?:RoadDraft;revision:number;conflicts:FeatureEdit[];edits:FeatureEdit[]};
  const [roadFeatureResolution,setRoadFeatureResolution]=useState<RoadFeatureResolution|null>(null);
  const roadFeatureResolutionRef=useRef<RoadFeatureResolution|null>(null);
  const updateRoadResolution=(value:RoadFeatureResolution|null)=>{roadFeatureResolutionRef.current=value;setRoadFeatureResolution(value);};
  type ObstacleDraft = {id:number|null;revision:number};
  const [obstacleDraft,setObstacleDraft] = useState<ObstacleDraft|null>(null);
  const obstacleDraftRef = useRef<ObstacleDraft|null>(null);
  const updateObstacleDraft = (draft:ObstacleDraft|null) => {obstacleDraftRef.current=draft;setObstacleDraft(draft);};
  const obstacleReturnFocus = useRef<number|'nearby'|'add'|'edges'|'ambiguity'|null>(null);
  const [ambiguousObstacleIds,setAmbiguousObstacleIds] = useState<number[]>([]);
  const [hoverObstacleEdge,setHoverObstacleEdge] = useState<string|null>(null);
  const [selectedObstacleId,setSelectedObstacleId] = useState<number|null>(null);
  const pendingRoadExport = useRef<'png'|'json'|null>(null);
  const [selectedRoadTarget, setSelectedRoadTarget] = useState<{roadId:number; crossingKey?:string} | null>(null);
  const [selectedRoadPair, setSelectedRoadPair] = useState<string | null>(null);
  const [confirmRoadRemoval, setConfirmRoadRemoval] = useState<{roadId:number;segmentKey?:string;revision:number} | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingRegionBiomeId, setEditingRegionBiomeId] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState<NameDraft | null>(null);
  const nameDraftRef = useRef(nameDraft); nameDraftRef.current = nameDraft;
  const [namesOpen, setNamesOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [nameType, setNameType] = useState('all');
  const [nameErrors, setNameErrors] = useState<{general?: string}>({});
  const [nameStatus, setNameStatus] = useState<'saved' | 'stale' | null>(null);
  const nameFocusRef = useRef<HTMLInputElement | null>(null);
  const nameComposingRef = useRef(false);
  const infoFocusRef = useRef<HTMLElement | null>(null);
  const nameReturnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(()=>{
    const target=obstacleReturnFocus.current;if(target===null)return;
    const selector=target==='edges'?'[data-obstacle-editor] button[aria-label]:not(:disabled)':target==='ambiguity'?'[data-obstacle-ambiguity] button':target==='nearby'?'[data-obstacle-list]':target==='add'?'[data-obstacle-add]':`[data-obstacle-id="${target}"] .direct-value`;
    const node=infoFocusRef.current?.querySelector<HTMLElement>(selector)??infoFocusRef.current;
    node?.focus();obstacleReturnFocus.current=null;
  });
  const dirtyNameDraft = () => {
    const draft = nameDraftRef.current;
    return !!draft && (draft.value !== draft.target[draft.language] || draft.otherValue !== undefined && draft.otherValue !== draft.target[draft.language==='ru'?'en':'ru']);
  };
  useEffect(() => { nameFocusRef.current?.focus(); }, [nameDraft?.target.key, nameDraft?.surface]);
  useEffect(() => {
    if (nameDraftRef.current && nameDraftRef.current.revision !== documentRevision.current) {
      nameDraftRef.current = null; setNameDraft(null); setNameErrors({}); setNameStatus('stale');
    }
  }, [renderedDocumentRevision]);

  // Уведомление пользователю (например, почему не создалось побережье).
  const [generationError, setGenerationError] = useState<GenerationDiagnostic | null>(null);
  useEffect(()=>{if(obstacleDraftRef.current&&obstacleDraftRef.current.revision!==documentRevision.current)updateObstacleDraft(null);},[renderedDocumentRevision]);
  const captureGenerationInputs = () => ({ sizeCategory: genSizeCategory, landType: genLandType, biome: genBiome, coastal: genCoastal, mode: generationMode });
  const generationProgress = {
    attempt: 0, tractAttempt: 0, stage: 'region', lastRejection: null as string | null,
    fallbackReason: null as string | null, constraintFailure: null as string | null, exhausted: false,
    targetSize: null as number | null, action: 'add' as 'add' | 'regenerate',
    seaRecoveryAttempt: 0, reclaimedSeaKeys: [] as string[],
    rejectionCounts: {} as Record<string, number>
  };
  const rejectAttempt = (reason: string) => {
    generationProgress.lastRejection = reason;
    generationProgress.rejectionCounts[reason] = (generationProgress.rejectionCounts[reason] ?? 0) + 1;
    generationLog.detail('[generation:attempt-rejected]', { attempt: generationProgress.attempt, reason });
  };
  const generationEvent = (anchorHex: AxialHex, options: GenerationOptions, kind: GenerationEvent['kind'], reason: string, result: GenerationEvent['result'], context?: GenerationActionContext): GenerationEvent => ({
    kind, reason, result, action: context?.action ?? generationProgress.action, anchorHex,
    options: { mode: options.mode ?? 'classic', targetSize: options.targetSize ?? 'auto', landType: options.landType ?? 'auto',
      biomeId: options.biomeId ?? 'auto', coastalPreference: options.coastalPreference ?? 'auto' },
    attempt: generationProgress.attempt, tractAttempt: generationProgress.tractAttempt, stage: generationProgress.stage,
    seaRecoveryAttempt: generationProgress.seaRecoveryAttempt, reclaimedSeaKeys: generationProgress.reclaimedSeaKeys,
    random: { before: cloneGenerationState(activeGenerationBefore.current ?? generationRef.current), after: cloneGenerationState(generationRef.current) },
    inputOptions: context?.inputOptions ?? captureGenerationInputs(),
    targetSize: generationProgress.targetSize, rejectionCounts: generationProgress.rejectionCounts
  });
  const [coastNotice, setCoastNotice] = useState<string | null>(null);
  const [clickPromptCandidateKey, setClickPromptCandidateKey] = useState<string | null>(null);

  // Accepted frontier is derived without sea cells at generation/import.
  // Never mutate accepted terrain in an effect outside its document transaction.

  const allRegionHexes = useMemo(() => regions.flatMap((region) => region.hexes), [regions]);

  const metadataMap = useMemo(() => {
    const map = new Map<string, HexMeta>();
    for (const region of regions) {
      for (const hex of region.hexes) {
        const key = hexKey(hex);
        map.set(key, {
          regionId: region.id,
          isCenter: !region.isTract && !region.suppressCentralPoi && hexKey(region.centerHex) === key,
          isAnchor: hexKey(region.anchorHex) === key
        });
      }
    }
    return map;
  }, [regions]);

  // Each mutation prepares names before commit. No post-commit normalizer may
  // rewrite an imported map or a snapshot restored by undo/redo.

  const positionedHexes = useMemo(() => {
    const isStartPromptVisible = allRegionHexes.length === 0 && candidateHexes.length === 0;
    // E6 retains regional ownership/biome underneath water. A persisted sea
    // override is authoritative even inside Region.hexes; never render it twice.
    const regionHexKeySet = new Set(allRegionHexes.map(hexKey));
    const seaHexList: AxialHex[] = [];
    const lakeHexList: AxialHex[] = [];
    for (const [key, terrain] of hexTerrainByKey) {
      if (regionHexKeySet.has(key)) continue;
      if (terrain.terrainOverride === 'sea') seaHexList.push(parseHexKey(key));
      if (terrain.terrainOverride === 'lake') lakeHexList.push(parseHexKey(key));
    }
    const terrainHexKeySet = new Set([...seaHexList, ...lakeHexList].map(hexKey));
    const all = [
      ...allRegionHexes.map((hex) => ({ ...hex, kind: isSeaHex(hex,hexTerrainByKey)?'sea' as const:'region' as const })),
      ...lakeHexList.map((hex) => ({ ...hex, kind: 'region' as const })),
      ...seaHexList.map((hex) => ({ ...hex, kind: 'sea' as const })),
      ...candidateHexes.filter((hex) => !terrainHexKeySet.has(hexKey(hex))).map((hex) => ({ ...hex, kind: 'candidate' as const }))
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
      // The animated click hint is presentation only; never advance a world stream.
      return availableKeys[Math.floor(getStableRandomValue(`${generationRef.current.masterSeed}:click-hint:${previousKey ?? 'initial'}`) * availableKeys.length)] ?? null;
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
  const rapidRiverEdgeKeys = useMemo(() => deriveRapidKeys({rivers,crossings,regions,riverFeatures:riverFeatureOverrides}), [rivers,crossings,regions,riverFeatureOverrides]);
  const riverDirectionArrows = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    const offsetX = (HEX_SIZE * SQRT3) / 2 - minBaseX;
    const offsetY = HEX_SIZE - minBaseY;
    return rivers.flatMap((river) => renderRiverDirectionArrows(river, offsetX, offsetY, hiddenRiverEdgeKeys))
      .filter((arrow) => !rapidRiverEdgeKeys.has(arrow.edgeKey));
  }, [positionedHexes, rivers, hiddenRiverEdgeKeys, rapidRiverEdgeKeys]);
  const riverRapidMarks = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    const offsetX = (HEX_SIZE * SQRT3) / 2 - minBaseX;
    const offsetY = HEX_SIZE - minBaseY;
    return rivers.flatMap((river) => renderRiverRapidMarks(river, offsetX, offsetY, hiddenRiverEdgeKeys, rapidRiverEdgeKeys));
  }, [positionedHexes, rivers, hiddenRiverEdgeKeys, rapidRiverEdgeKeys]);
  const riverWaterfalls = useMemo(() => deriveWaterfalls({rivers,regions,riverFeatures:riverFeatureOverrides},positionedHexes,lakeVertices), [positionedHexes,rivers,regions,lakeVertices,riverFeatureOverrides]);
  const roadSegments = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    return renderRoadSegments(roads, (HEX_SIZE * SQRT3) / 2 - minBaseX, HEX_SIZE - minBaseY);
  }, [positionedHexes, roads]);
  const renderedCrossings = useMemo(() => renderRiverCrossings(roadSegments, crossings), [roadSegments, crossings]);

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

  // Trial terrain is local to the synchronous generation call, never written on its own.
  const originalGenerationTerrain = hexTerrainByKey;
  const originalGenerationCandidates = candidateHexes;
  const recoveryClosedEnds = (anchor: AxialHex) => generationProgress.seaRecoveryAttempt
    ? new Set(getHexCornerPoints(anchor).map(v => v.key)) : new Set<string>();
  const seaRecoveryPlans = function* (anchor: AxialHex): Generator<string[]> {
    const land = new Set(allRegionHexes.map(hexKey));
    const mouths = new Set(rivers.flatMap(r => r.vertexPath.length ? [r.vertexPath[r.vertexPath.length - 1].key] : []));
    const eligible = new Set([...hexTerrainByKey].filter(([key, terrain]) => {
      if (terrain.terrainOverride !== 'sea' || land.has(key)) return false;
      const [q, r] = key.split(',').map(Number);
      if (Math.max(Math.abs(q - anchor.q), Math.abs(r - anchor.r), Math.abs(q + r - anchor.q - anchor.r)) > 3) return false;
      return !getHexCornerPoints({ q, r }).some(v => mouths.has(v.key));
    }).map(([key]) => key));
    // Breadth first: fewer removed cells first. A bounded local search, not a
    // claim of a global minimum or a guarantee for arbitrary coastlines.
    const queue: string[][] = [[]];
    const seen = new Set<string>();
    let tried = 0;
    for (let index = 0; index < queue.length && tried < 30; index++) {
      const keys = queue[index];
      if (keys.length) { tried++; yield keys; }
      if (keys.length >= 6) continue;
      const frontier = [anchor, ...keys.map(key => { const [q, r] = key.split(',').map(Number); return { q, r }; })];
      for (const hex of frontier) for (const neighbor of getHexNeighbors(hex)) {
        const key = hexKey(neighbor);
        if (!eligible.has(key) || keys.includes(key)) continue;
        const next = [...keys, key].sort();
        const signature = next.join(';');
        if (!seen.has(signature)) { seen.add(signature); queue.push(next); }
      }
    }
  };

  const addFallbackTractToMap = (anchorHex: AxialHex, forceCoastalSea = false, options: GenerationOptions = {}, reason = 'direct_fallback', tractAttempt = 1, hexTerrainByKey = originalGenerationTerrain, candidateHexes = originalGenerationCandidates): void => {
    generationProgress.tractAttempt = tractAttempt;
    generationProgress.stage = 'tract';
    generationProgress.fallbackReason = reason;
    generationLog.detail('Generation constraint fallback', { reason, anchorHex, attempt: generationProgress.attempt });
    const regionId = Math.max(0, ...regions.map((region) => region.id)) + 1;
    const existingSeaKeys = getSeaHexKeysWithout(hexTerrainByKey, [anchorHex]);
    // Если якорь урочища всё ещё числится морем в служебных данных,
    // считаем его будущей сушей уже до расчёта занятых гексов.
    const occupiedHexes = new Set(allRegionHexes.map(hexKey));
    for (const seaKey of existingSeaKeys) occupiedHexes.add(seaKey);

    for (const blocked of options.forbiddenHexes ?? []) occupiedHexes.add(blocked);
    const targetSize = options.mode === 'mythic' ? Math.min(5, options.targetSize ?? modeRegionSize('mythic', rollTractTargetSize, undefined, rng.geography)) : rollTractTargetSize(rng);
    const regionHexes = generateFallbackTractFromAnchor(anchorHex, occupiedHexes, targetSize, rng);
    const regionKeySet = new Set(regionHexes.map(hexKey));
    for (const regionKey of regionKeySet) existingSeaKeys.delete(regionKey);
    const finalSize = regionHexes.length;
    const adjacentBiomeIds = getAdjacentRegionBiomes(regionHexes, new Map(regions.flatMap((region) => region.hexes.map((hex) => [hexKey(hex), region] as const))));
    const tractCandidateRegionForRiverCheck: Region = {
      id: regionId,
      hexes: regionHexes,
      centerHex: anchorHex,
      anchorHex,
      targetSize,
      finalSize,
      sizeCategory: 'tract',
      sizeLabel: 'Урочище',
      biomeLandType: 'wild',
      heightLevel: 1,
      biomeId: FALLBACK_BIOME_ID,
      biomeLabel: BIOMES[FALLBACK_BIOME_ID].label,
      biomePrimaryEmoji: BIOMES[FALLBACK_BIOME_ID].primaryEmoji,
      biomeSecondaryEmojis: [...BIOMES[FALLBACK_BIOME_ID].secondaryEmojis],
      biomeEmojiLabel: BIOMES[FALLBACK_BIOME_ID].primaryEmoji + BIOMES[FALLBACK_BIOME_ID].secondaryEmojis.join(''),
      pointsOfInterest: [],
      isTract: true
    };
    const tractCandidateHexesForRiverCheck = getCandidateHexes([...allRegionHexes, ...regionHexes], existingSeaKeys);
    const tractRiverHeightConstraint = getRiverHeightConstraintForCandidateRegion(
      tractCandidateRegionForRiverCheck,
      regions,
      rivers,
      tractCandidateHexesForRiverCheck
    );
    const isFirstRegionWithAutomaticBiome = regions.length === 0 && !options.biomeId;
    const biomeLandType = options.mode === 'mythic' ? 'wild' : options.landType ?? (regions.length === 0 ? 'settled' : 'wild');
    let biomeChoice: ChooseBiomeResult;
    if (isFirstRegionWithAutomaticBiome) {
      biomeChoice = chooseBiomeIdAtHeightLevel(biomeLandType, adjacentBiomeIds, regionId, 1, tractRiverHeightConstraint, rng);
    } else if (options.biomeId) {
      biomeChoice = isBiomeAllowedByRiverHeightConstraint(options.biomeId, tractRiverHeightConstraint)
        ? { biomeId: options.biomeId }
        : { biomeId: null, reason: 'river_height_constraint_failed' };
    } else {
      biomeChoice = tractRiverHeightConstraint.preferredHeight === undefined
        ? { biomeId: null, reason: 'river_height_constraint_failed' }
        : chooseBiomeIdAtHeightLevel(
          biomeLandType,
          adjacentBiomeIds,
          regionId,
          tractRiverHeightConstraint.preferredHeight,
          tractRiverHeightConstraint, rng
        );
      // The exact max-neighbour + 1 height is a preference. If biome weights or
      // compatibility make it unavailable, retain the normal river minimum.
      if (!biomeChoice.biomeId) {
        biomeChoice = chooseBiomeId(biomeLandType, adjacentBiomeIds, regionId, tractRiverHeightConstraint, rng);
      }
    }
    const biomeId = biomeChoice.biomeId ?? (tractRiverHeightConstraint.minHeight !== undefined ? 'mountains' : FALLBACK_BIOME_ID);
    const biome = BIOMES[biomeId] ?? BIOMES[FALLBACK_BIOME_ID];
    const tractRegion: Region = {
      generationMode: options.mode, kingdomId: options.kingdomId,
      id: regionId,
      hexes: regionHexes,
      // У урочища нет центрального гекса; anchorHex хранится здесь только для
      // совместимости с общей моделью сохранения и не помечается как центр.
      centerHex: anchorHex,
      anchorHex,
      targetSize,
      finalSize,
      // Даже если урочище доросло за счёт замкнутой области и стало больше
      // пяти гексов, оно остаётся урочищем по типу региона.
      sizeCategory: 'tract',
      sizeLabel: 'Урочище',
      biomeLandType,
      heightLevel: biome.heightLevel,
      biomeId,
      biomeLabel: biome.label,
      biomePrimaryEmoji: biome.primaryEmoji,
      biomeSecondaryEmojis: [...biome.secondaryEmojis],
      biomeEmojiLabel: biome.primaryEmoji + biome.secondaryEmojis.join(''),
      pointsOfInterest: options.mode === 'mythic' ? initialMythicPoints(regionHexes, null, () => true, rng.poi) : assignPointsOfInterestForTract(regionHexes, rng),
      isCoastal: false,
      isTract: true
    };
    let tractTerrain = new Map(hexTerrainByKey);
    for (const key of regionKeySet) tractTerrain.delete(key);
    const candidateHexesForTractRiverGeneration = getCandidateHexes([...allRegionHexes, ...regionHexes], existingSeaKeys);
    const tentative = generateRiverForRegion(tractRegion, [...regions, tractRegion], rivers,
      candidateHexesForTractRiverGeneration, tractTerrain, rng);
    let riversAfterTractGeneration = tentative.success ? tentative.rivers : rivers;
    let tractRoadResult = ensureRoadAdjacentTractPoiAndTrail({
      region: tractRegion,
      roads,
      rivers: riversAfterTractGeneration,
      hexTerrainByKey: tractTerrain,
      nextRoadId
    }, rng);
    const tractRegionWithPoiKinds: Region = {
      ...tractRoadResult.region,
      pointOfInterestKinds: assignPoiKindsForRegion({
        region: tractRoadResult.region,
        roads: tractRoadResult.roads,
        rivers: riversAfterTractGeneration,
        hexTerrainByKey: tractTerrain
      }, rng)
    };
    const finalRegions = [...regions, tractRegionWithPoiKinds];
    const candidateHexesBeforeSeaBridge = getCandidateHexes(finalRegions.flatMap((region) => region.hexes), existingSeaKeys);
    const tractTouchesExistingSea = regionHexes.some((hex) => getHexNeighbors(hex).some((neighbor) => existingSeaKeys.has(hexKey(neighbor))));
    const seededSeaKeys = new Set(existingSeaKeys);
    // Если прибрежная генерация была заменена урочищем, но урочище не
    // касается моря, создаём новый морской seed на случайном гексе-кандидате
    // границы урочища. Seed, как и дальнейшее заполнение моря, не должен
    // касаться озёр или рек.
    if (forceCoastalSea && !tractTouchesExistingSea) {
      const tractKeys = new Set(regionHexes.map(hexKey));
      const seedCandidates = candidateHexesBeforeSeaBridge.filter((candidate) => {
        const key = hexKey(candidate);
        if (!getHexNeighbors(candidate).some((neighbor) => tractKeys.has(hexKey(neighbor)))) return false;
        if (tractTerrain.get(key)?.terrainOverride === 'lake') return false;
        if (hexTouchesLake(candidate, tractTerrain)) return false;
        if (getRiversForHex(candidate, riversAfterTractGeneration).length > 0) return false;
        return true;
      });
      const seedSeaHex = randomFrom(seedCandidates, rng);
      if (seedSeaHex) seededSeaKeys.add(hexKey(seedSeaHex));
    }
    const seaKeysToFill = getSeaKeysToFillForTractSeaTouch(regionHexes, seededSeaKeys, candidateHexesBeforeSeaBridge, tractTerrain, riversAfterTractGeneration);
    const finalSeaKeys = new Set([...seededSeaKeys, ...seaKeysToFill]);
    for (const regionKey of regionKeySet) finalSeaKeys.delete(regionKey);
    const roadTerrain = new Map(tractTerrain);
    for (const key of finalSeaKeys) roadTerrain.set(key, { terrainOverride: 'sea' });
    tractRoadResult = { ...tractRoadResult, ...completeRegionRoadConnections({
      region: tractRegionWithPoiKinds, regions, roads: tractRoadResult.roads,
      hexTerrainByKey: roadTerrain, nextRoadId: tractRoadResult.nextRoadId
    }) };
    // The fallback sea fill must respect the same real road exits as ordinary
    // generation. Keep unexplored land available; never change existing water.
    const occupiedForRoads = new Set(finalRegions.flatMap(r => r.hexes.map(hexKey)));
    const destinationKeys = new Set(finalRegions.flatMap(r => [...(r.isTract || r.suppressCentralPoi ? [] : [r.centerHex]), ...r.pointsOfInterest].map(hexKey)));
    for (const endpointKey of getRoadEndpointHexKeysImpl(tractRoadResult.roads, destinationKeys)) {
      for (const neighbor of getHexNeighbors(parseHexKey(endpointKey))) {
        const key = hexKey(neighbor);
        if (!existingSeaKeys.has(key) && !occupiedForRoads.has(key)) finalSeaKeys.delete(key);
      }
    }
    const finalSeaKeysToWrite = new Set(
      Array.from(finalSeaKeys).filter((key) => !existingSeaKeys.has(key))
    );
    const finalCandidateHexes = getCandidateHexes(finalRegions.flatMap((region) => region.hexes), finalSeaKeys);
    const nextLakeIdAfterLandlockedSea = (() => {
      const terrainForLandlockedSeaCheck = new Map(tractTerrain);
      for (const regionKey of regionKeySet) terrainForLandlockedSeaCheck.delete(regionKey);
      for (const key of finalSeaKeys) terrainForLandlockedSeaCheck.set(key, { terrainOverride: 'sea' });
      return convertLandlockedSeaComponentsToLakes(
        terrainForLandlockedSeaCheck,
        finalRegions,
        getNextLakeIdFromTerrain(terrainForLandlockedSeaCheck)
      ).nextLakeId;
    })();

    const snapshot: MapSnapshot = {
      ...seaIdentityRef.current,
        knave:structuredClone(knaveRef.current),editorNames:structuredClone(editorNamesRef.current),tags:structuredClone(tagsRef.current),
      gmNotesByHexKey: {...notesMapRef.current},
        generation: cloneGenerationState(activeGenerationBefore.current ?? generationRef.current),
        kingdoms, obstacles, nextObstacleId, riverFeatures:riverFeatureOverrides,nextRiverId,
      regions,
      candidateHexes: originalGenerationCandidates,
      rivers,
      roads: cloneRoads(roads),
      crossings,
      hexTerrainByKey: originalGenerationTerrain,
      waterPoiByKey,
      biomeOverrideByHexKey,
      toponyms,
      toponymSeed,
      nextLakeId,
      nextRoadId
    };
    const finalHexTerrainByKey = (() => {
      let next = new Map(tractTerrain);
      // Новый fallback-регион всегда становится сушей: очищаем старые terrain override
      // у всех его гексов перед записью актуального моря.
      for (const regionKey of regionKeySet) if (next.get(regionKey)?.terrainOverride !== 'lake') next.delete(regionKey);
      for (const key of finalSeaKeys) next.set(key, { terrainOverride: 'sea' });
      next = convertLandlockedSeaComponentsToLakes(
        next,
        finalRegions,
        getNextLakeIdFromTerrain(next)
      ).terrainByKey;
      return next;
    })();
    generationProgress.stage = 'tract_river_endpoints';
    let completed = completeRegionRiverEnds(riversAfterTractGeneration, rivers, tractRegion,
      finalRegions, finalCandidateHexes, finalHexTerrainByKey, candidateHexes, originalGenerationTerrain, recoveryClosedEnds(anchorHex));
    if (!completed.success && riversAfterTractGeneration !== rivers) {
      completed = completeRegionRiverEnds(rivers, rivers, tractRegion, finalRegions, finalCandidateHexes, finalHexTerrainByKey, candidateHexes, originalGenerationTerrain, recoveryClosedEnds(anchorHex));
    }
    if (!completed.success) {
      generationLog.warning('Tract river endpoints rejected', { tractAttempt, reason: completed.reason });
      if (tractAttempt < MAX_REGION_ATTEMPTS) {
        addFallbackTractToMap(anchorHex, forceCoastalSea, options, reason, tractAttempt + 1, hexTerrainByKey, candidateHexes);
        return;
      }
      generationProgress.constraintFailure = completed.reason;
      return;
    }
    if (options.mode === 'mythic') {
      const full = buildRegionRiverNetwork(completed.rivers, [], finalRegions, finalCandidateHexes, completed.terrain, true);
      if (full.issues.length || !validateRiverNetwork(full.network).valid) {
        if (tractAttempt < MAX_REGION_ATTEMPTS) {
          addFallbackTractToMap(anchorHex, forceCoastalSea, options, reason, tractAttempt + 1, hexTerrainByKey, candidateHexes);
        } else generationProgress.constraintFailure = 'mythic_full_river_network';
        return;
      }
    }
    const allocatedTractRivers=reserveGeneratedRiverIds(rivers,completed.rivers,nextRiverId);
    riversAfterTractGeneration = allocatedTractRivers.rivers;
    finalHexTerrainByKey.clear();
    for (const [key, value] of completed.terrain) finalHexTerrainByKey.set(key, value);
    // Route tract roads against the actual water and final river geometry.
    tractRoadResult = ensureRoadAdjacentTractPoiAndTrail({
      region: tractRegion, roads, rivers: riversAfterTractGeneration,
      hexTerrainByKey: finalHexTerrainByKey, nextRoadId
    }, rng);
    tractRoadResult = { ...tractRoadResult, ...completeRegionRoadConnections({
      region: tractRegionWithPoiKinds, regions, roads: tractRoadResult.roads,
      hexTerrainByKey: finalHexTerrainByKey, nextRoadId: tractRoadResult.nextRoadId
    }) };
    finalRegions[finalRegions.length - 1] = {
      ...tractRoadResult.region,
      pointOfInterestKinds: assignPoiKindsForRegion({ region: tractRoadResult.region,
        roads: tractRoadResult.roads, rivers: riversAfterTractGeneration, hexTerrainByKey: finalHexTerrainByKey }, rng)
    };
    finalRegions[finalRegions.length - 1] = assignWoodlandStyle(finalRegions[finalRegions.length - 1], regions, biomeOverrideByHexKey);
    const newlyCheckedWaterHexKeys = new Set([...regionKeySet, ...finalSeaKeysToWrite]);
    generationProgress.stage = 'prepare_commit';
    const finalToponyms = synchronizeToponyms({ ...toponyms, ...options.previousToponyms }, getToponymEntities(finalRegions, riversAfterTractGeneration, finalHexTerrainByKey), toponymSeed);
    const finalWaterPoi = assignWaterPoiLayer(waterPoiByKey, finalRegions, finalHexTerrainByKey, newlyCheckedWaterHexKeys, rng);
      if (options.mode === 'mythic') for (const key of newlyCheckedWaterHexKeys) finalWaterPoi.delete(key);
    const finalCrossings = reconcileRiverCrossings(tractRoadResult.roads, riversAfterTractGeneration, finalRegions, crossings, rng);
    const finalNextLakeId = Math.max(nextLakeIdAfterLandlockedSea, getNextLakeIdFromTerrain(finalHexTerrainByKey));
    const finalRoadPairs = new Set(tractRoadResult.roads.flatMap(r=>r.segments.map(s=>pairKey(s.from,s.to))));
    if (obstacles.some(o => finalRoadPairs.has(pairKey(o.hex,o.neighborHex)))) throw new Error('Дорога пересекает препятствие.');
    recordGenerated(snapshot, { ...captureMap(), regions: finalRegions, candidateHexes: finalCandidateHexes,
      rivers: riversAfterTractGeneration, roads: tractRoadResult.roads, crossings: finalCrossings,
      hexTerrainByKey: finalHexTerrainByKey, waterPoiByKey: finalWaterPoi, toponyms: finalToponyms,
      nextLakeId: finalNextLakeId, nextRoadId: tractRoadResult.nextRoadId, nextRiverId:allocatedTractRivers.nextRiverId }, anchorHex, pendingRegen?.backup);
    setHistory((current) => [...current, structuredClone(snapshot)]);
    setRegions(finalRegions);
    setCandidateHexes(finalCandidateHexes);
    setNextRiverId(allocatedTractRivers.nextRiverId);
    setRivers(riversAfterTractGeneration);
    setToponyms(finalToponyms);
    setHexTerrainByKey(finalHexTerrainByKey);
    setWaterPoiByKey(finalWaterPoi);
    setNextLakeId(finalNextLakeId);
    setRoads(tractRoadResult.roads);
    setCrossings(finalCrossings);
    setNextRoadId(tractRoadResult.nextRoadId);
    setSelectedHex(anchorHex);
    generationLog.finish(generationEvent(anchorHex, options,
      generationProgress.exhausted ? 'attempts-exhausted' : 'tract-created', reason, 'tract'));
  };

  const addRegionToMap = (anchorHex: AxialHex, options: GenerationOptions = {}, hexTerrainByKey = originalGenerationTerrain, candidateHexes = originalGenerationCandidates) => {
    if (options.mode === 'mythic' && (options.targetSize ?? 12) <= 5) {
      addFallbackTractToMap(anchorHex, false, options, 'mythic_d12_tract', 1, hexTerrainByKey, candidateHexes);
      return;
    }
    const maxRegionAttempts = MAX_REGION_ATTEMPTS;
    const autoCoastRoll = rng.geography();
    setCoastNotice(null);
    const anchorKey = hexKey(anchorHex);
    const existingSeaKeysForGrowth = getSeaHexKeys(hexTerrainByKey);
    // Кликнутый кандидат может визуально быть сушей/серым гексом, но оставаться
    // морем в hexTerrainByKey. Для роста региона якорь всегда считаем сушей.
    existingSeaKeysForGrowth.delete(anchorKey);
    const mainlandZeroWeightHexes = options.coastalPreference === 'mainland'
      ? getSeaAdjacentHexKeys(existingSeaKeysForGrowth)
      : new Set<string>();
    const coastalNeutralNeighborWeightHexes = options.coastalPreference === 'coast'
      ? existingSeaKeysForGrowth
      : new Set<string>();
    for (let attempt = 0; attempt < maxRegionAttempts; attempt += 1) {
      generationProgress.attempt = attempt + 1;
      generationProgress.stage = 'region';
      __profileHit('region_attempt (попытки регенерации)');
      const isLastRegionAttempt = attempt === maxRegionAttempts - 1;
      let targetSize = options.targetSize ?? rollRegionTargetSize(rng);
      generationProgress.targetSize = targetSize;
      const occupiedHexes = new Set(allRegionHexes.map(hexKey));
      // Море — не суша: рост региона не должен захватывать гексы моря.
      for (const seaKey of existingSeaKeysForGrowth) occupiedHexes.add(seaKey);
      const regionId = Math.max(0, ...regions.map((region) => region.id)) + 1;
      for (const blocked of options.forbiddenHexes ?? []) occupiedHexes.add(blocked);
      occupiedHexes.delete(anchorKey);
      const regionHexes = generateConnectedRegionFromAnchor(
        anchorHex,
        targetSize,
        occupiedHexes,
        mainlandZeroWeightHexes,
        coastalNeutralNeighborWeightHexes, rng
      );
      const finalSize = regionHexes.length;
      if (finalSize < 6) {
        rejectAttempt('region_too_small');
        generationLog.warning('Candidate region is smaller than locality; retrying regular generation before fallback tract', {
          attempt,
          regionId,
          finalSize,
          acceptedAsFallbackTract: isLastRegionAttempt
        });
        if (isLastRegionAttempt) {
          generationProgress.exhausted = true;
          addFallbackTractToMap(anchorHex, false, options, 'region_too_small', 1, hexTerrainByKey, candidateHexes);
          return;
        }
        continue;
      }
      const { sizeCategory, sizeLabel } = getRegionSizeCategory(finalSize);
      const centerCandidates = options.kingdomArea ? regionHexes.filter(h => options.kingdomArea!.has(hexKey(h))) : regionHexes;
      const centerHex = options.fixedCenter ?? chooseRegionCenter(centerCandidates.length ? centerCandidates : regionHexes, rng);
      const regionByHexKey = new Map<string, Region>();
      for (const region of regions) {
        for (const hex of region.hexes) regionByHexKey.set(hexKey(hex), region);
      }
      const adjacentBiomeIds = getAdjacentRegionBiomes(regionHexes, regionByHexKey);
      const nextAllHexesPreview = [...allRegionHexes, ...regionHexes];
      const regionKeySet = new Set(regionHexes.map(hexKey));
      const existingSeaForRivers = getSeaHexKeysWithout(hexTerrainByKey, regionHexes);
      // На время топологических/речных проверок строящийся регион вычищается
      // из моря, а candidate-фронт строится без существующего моря.
      const nextCandidateHexesPreview = getCandidateHexes(nextAllHexesPreview, existingSeaForRivers);
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
      const existingSeaKeys = getSeaHexKeysWithout(hexTerrainByKey, regionHexes);
      const forcedCoastContinuation = regionForcesCoastContinuation(regionHexes, existingSeaKeys);
      const hasOutgoingRiverToExistingRegion = regionHasOutgoingRiverToExistingRegion(touchingEndpoints);
      const isCoastalRegion = options.coastalPreference === 'coast' ? true
        : options.coastalPreference === 'mainland' ? false
        : forcedCoastContinuation ? true
        : hasOutgoingRiverToExistingRegion ? false
        : regions.length === 0 ? autoCoastRoll < START_REGION_AUTO_COAST_PROBABILITY
        : autoCoastRoll < coastProbabilityFromSpan(computeMapMaxSpanTiles(allRegionHexes));
      const incomingRiverEndpointCount = touchingEndpoints.filter((endpoint) => endpoint.endpointType === 'end').length;
      const outgoingRiverEndpointCount = touchingEndpoints.filter((endpoint) => endpoint.endpointType === 'start').length;
      const isFirstRegion = regions.length === 0;
      if (isCoastalRegion && ((incomingRiverEndpointCount === 0 && !isFirstRegion) || outgoingRiverEndpointCount > 0)) {
        rejectAttempt('coastal_river_endpoints_incompatible');
        generationLog.warning('Coastal region attempt has invalid river endpoints; retrying before fallback tract', {
          attempt,
          regionId,
          incomingRiverEndpointCount,
          outgoingRiverEndpointCount,
          isFirstRegion
        });
        if (!isLastRegionAttempt) continue;
        generationProgress.exhausted = true;
        addFallbackTractToMap(anchorHex, true, options, 'coastal_river_endpoints_incompatible', 1, hexTerrainByKey, candidateHexes);
        return;
      }
      generationProgress.stage = 'biome';
      const biomeLandType = options.landType ?? (regions.length === 0 ? 'settled' : chooseCoastalAwareLandType(isCoastalRegion, rng));
      // Выбор биома: либо принудительно заданный пользователем, либо обычный
      // взвешенный выбор. Принудительный биом всё равно проверяется на
      // совместимость с ограничением высоты от рек.
      const pickBiome = (constraint: RiverHeightConstraint): ChooseBiomeResult => {
        if (isFirstRegion && !options.biomeId) {
          return chooseBiomeIdAtHeightLevel(biomeLandType, adjacentBiomeIds, regionId, 1, constraint, rng);
        }
        if (options.biomeId) {
          return isBiomeAllowedByRiverHeightConstraint(options.biomeId, constraint)
            ? { biomeId: options.biomeId }
            : { biomeId: null, reason: 'river_height_constraint_failed' };
        }
        if (constraint.preferredHeight !== undefined) {
          const preferredChoice = chooseBiomeIdAtHeightLevel(
            biomeLandType,
            adjacentBiomeIds,
            regionId,
            constraint.preferredHeight,
            constraint, rng
          );
          if (preferredChoice.biomeId) return preferredChoice;
        }
        return chooseBiomeId(biomeLandType, adjacentBiomeIds, regionId, constraint, rng);
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
      generationLog.detail('River height constraint for candidate region', {
        regionId,
        minHeight: riverHeightConstraint.minHeight,
        maxHeight: riverHeightConstraint.maxHeight,
        preferredHeight: riverHeightConstraint.preferredHeight,
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
          generationLog.warning('Region attempt has no biome satisfying river height constraints', {
            regionId,
            attempt,
            riverHeightConstraint,
            effectiveRiverHeightConstraint,
            trimmedOutgoingRiverIds: outgoingRiverIdsToTrim,
            adjacentBiomeIds,
            biomeLandType,
            acceptedWithStandardWeights: isLastRegionAttempt
          });
          if (!isLastRegionAttempt) { rejectAttempt('river_height_constraint_failed'); continue; }
          biomeChoice = pickBiome({ reasons: [] });
          effectiveRiverHeightConstraint = { reasons: [] };
          riversForGeneration = rivers;

        }
      }
      if (!biomeChoice.biomeId) {
        generationLog.warning('No biome available for candidate region; using standard biome weights on final attempt', {
          regionId,
          attempt,
          riverHeightConstraint,
          effectiveRiverHeightConstraint,
          adjacentBiomeIds,
          biomeLandType,
          acceptedWithStandardWeights: isLastRegionAttempt
        });
        if (!isLastRegionAttempt) { rejectAttempt('no_compatible_biome'); continue; }
        biomeChoice = pickBiome({ reasons: [] });
      }
      const biomeId = biomeChoice.biomeId;
      // A failed biome choice must take the same safe tract path as an
      // exhausted geometry attempt, never commit a region with a null biome.
      if (!biomeId) {
        rejectAttempt(biomeChoice.reason ?? 'no_compatible_biome');
        generationProgress.exhausted = true;
        addFallbackTractToMap(anchorHex, isCoastalRegion, options, biomeChoice.reason ?? 'no_compatible_biome', 1, hexTerrainByKey, candidateHexes);
        return;
      }
      const biome = BIOMES[biomeId] ?? BIOMES[FALLBACK_BIOME_ID];
      const heightLevel = BIOMES[biomeId]?.heightLevel ?? 1;
      const riverSlope = calculateRiverSlopeInfo(centerHex, allRegionHexes, riversForGeneration, undefined, rng);
      const { lakesByHex, nextLakeId: computedNextLakeId } = assignLakesForRegion(regionHexes, centerHex, nextLakeId, biomeId, rng);
      const centralPoiKind = assignCentralPoiKindForRegion(biomeLandType, sizeCategory, rng);
      const regionBase: Omit<Region, 'pointsOfInterest'> = {
        generationMode: options.mode, kingdomId: options.kingdomId,
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
        riverSlope,
        isCoastal: isCoastalRegion
      };
      const regionForRiverGeneration: Region = {
        ...regionBase,
        pointsOfInterest: []
      };
      generationLog.detail('Region size generated', { regionId, targetSize, finalSize, sizeLabel });
      generationLog.detail('Biome selected', {
        regionId,
        regionCount: regions.length,
        biomeLandType,
        adjacentBiomeIds,
        selectedBiomeId: biomeId,
        selectedBiomeLabel: BIOMES[biomeId]?.label
      });
      if (finalSize > targetSize) {
        generationLog.detail('Region size exceeded target because enclosed areas were filled', {
          regionId,
          targetSize,
          finalSize,
          exceededBy: finalSize - targetSize
        });
      }
      const nextRegionsForRiverGeneration = [...regions, regionForRiverGeneration];
      const nextHexTerrainByKeyPreview = new Map(hexTerrainByKey);
      for (const regionKey of regionKeySet) nextHexTerrainByKeyPreview.delete(regionKey);
      for (const [key, terrain] of lakesByHex) nextHexTerrainByKeyPreview.set(key, terrain);
      mergeAdjacentLakeIds(nextHexTerrainByKeyPreview);
      const nextAllHexes = nextRegionsForRiverGeneration.flatMap((r) => r.hexes);
      // Речной candidate-фронт не включает существующее море: береговые/речные
      // проверки должны видеть только реальные кандидаты суши, даже если
      // визуально серый гекс ещё оставался sea в служебных данных.
      const nextCandidateHexes = uniqueHexes([
        ...getCandidateHexes(nextAllHexes, existingSeaForRivers)
      ]);
      // Урочища не создают самостоятельные новые реки: если есть примыкающая
      // исходящая река, generateRiverForRegion только добавит ей один исток.
      generationProgress.stage = 'rivers';
      const generatedRiverResult = generateRiverForRegion(
          regionForRiverGeneration,
          nextRegionsForRiverGeneration,
          riversForGeneration,
          nextCandidateHexes,
          nextHexTerrainByKeyPreview, rng
        );
      if (!generatedRiverResult.success) {
        rejectAttempt(generatedRiverResult.reason);
        generationLog.warning('Candidate river geometry rejected', { attempt, reason: generatedRiverResult.reason });
        continue;
      }
      const riverResult = generatedRiverResult;
      mergeAdjacentLakeIds(nextHexTerrainByKeyPreview);

      // Вариант 2 (спасти сушу): если подключение коннектора посадило исток реки на
      // существующее море, подтягиваем исток назад до первой сухопутной вершины (устье
      // не трогаем). Так зажатый морем карман может стать сушей без реки, текущей из моря.
      const existingSeaVertexKeysForTrim = getSeaVertexKeysFromSeaKeys(existingSeaForRivers);
      const connectedRivers = trimRiverSourcesOffExistingSea(riverResult.rivers, riversForGeneration, existingSeaVertexKeysForTrim);

      if (!validateExistingRiverEdgeFullnessPreserved(rivers, connectedRivers)) {
        generationLog.warning('Candidate region changed old river edge fullness after sea-source trim', { attempt, acceptedOnFinalAttempt: isLastRegionAttempt });
        if (!isLastRegionAttempt) { rejectAttempt('old_fullness_after_sea_trim'); continue; }
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
        generationLog.warning('Candidate region final river sector assignment changed old edge fullness', { attempt, acceptedOnFinalAttempt: isLastRegionAttempt });
        if (!isLastRegionAttempt) { rejectAttempt('old_fullness_after_sectors'); continue; }
      }
      const initialRiverCycleValidation = validateRiverCycleSafety(finalizedRivers);
      if (!initialRiverCycleValidation.valid) {
        generationLog.warning('Candidate region river cycle was detected before sea finalization', { attempt, regionId, acceptedOnFinalAttempt: isLastRegionAttempt, ...initialRiverCycleValidation });
        if (!isLastRegionAttempt) { rejectAttempt('river_cycle_before_sea'); continue; }
      }

      const regionTerrainByHex = new Map<string, HexTerrainData>();
      for (const hex of regionHexes) {
        const terrain = nextHexTerrainByKeyPreview.get(hexKey(hex));
        if (terrain) regionTerrainByHex.set(hexKey(hex), terrain);
      }

      // В прибрежном освоенном регионе переносим центральный гекс к устью
      // сразу после построения рек, чтобы POI и дороги уже строились от
      // прибрежного центра. Дикий прибрежный регион сохраняет обычный центр.
      const coastalRiverMouthCenterHex = isCoastalRegion && biomeLandType === 'settled' && !hasOutgoingRiverToExistingRegion
        ? chooseRiverMouthCenterHex(regionHexes, finalizedRivers, rng)
        : null;
      if (isCoastalRegion && biomeLandType === 'settled' && !hasOutgoingRiverToExistingRegion && !coastalRiverMouthCenterHex) {
        generationLog.warning('Settled coastal candidate region has no center hex touching a boundary river mouth', { attempt, regionId, acceptedOnFinalAttempt: isLastRegionAttempt });
        if (!isLastRegionAttempt) { rejectAttempt('coastal_center_without_mouth'); continue; }
      }
      const preliminaryCenterHex = coastalRiverMouthCenterHex ?? centerHex;

      const preliminaryPointsOfInterest = options.mode === 'mythic' ? initialMythicPoints(regionHexes, preliminaryCenterHex, h => !isLakeHex(h, regionTerrainByHex), rng.poi) : assignPointsOfInterestForRegion(regionHexes, preliminaryCenterHex, regionTerrainByHex, rng);
      const preliminaryRegion: Region = {
        ...regionForRiverGeneration,
        centerHex: preliminaryCenterHex,
        pointsOfInterest: preliminaryPointsOfInterest,
        isCoastal: false
      };

      // Море прибрежного региона строится до дорог. Ограничения моря при этом
      // остаются прежними и учитывают уже существующие концы дорог; новые дороги
      // позже будут строиться с учётом получившейся береговой линии.
      const roadEndpointKeysBeforeRoads = getRoadEndpointHexKeys(roads);
      const occupiedRegionKeysForSea = new Set(allRegionHexes.map(hexKey));
      const allowedSeaMouthVertexKeys = getRiverMouthVertexKeys(finalizedRivers);
      let seaHexKeys = isCoastalRegion
        ? extendSeaToCoastalCenterCandidate(
          regionHexes,
          preliminaryCenterHex,
          regions,
          computeSeaHexKeysForCoastalRegion(regionHexes, preliminaryCenterHex, nextHexTerrainByKeyPreview, occupiedRegionKeysForSea, regions, finalizedRivers, regionId, roads),
          nextHexTerrainByKeyPreview,
          occupiedRegionKeysForSea,
          finalizedRivers,
          allowedSeaMouthVertexKeys,
          roads, rng
        )
        : [];
      // Прибрежный режим больше не отбраковывает попытку из-за того,
      // удалось или не удалось сгенерировать валидное море: регион может
      // сохраниться даже без морских гексов или с морем, которое последующие
      // шаги демотируют/исправят.
      let effectiveIsCoastalRegion = isCoastalRegion;
      const finalCenterHex = preliminaryCenterHex;
      const finalRegion: Region = {
        ...preliminaryRegion,
        centerHex: finalCenterHex,
        // Регион считается прибрежным, только если у него реально появилось море.
        isCoastal: effectiveIsCoastalRegion && seaHexKeys.length > 0
      };
      const nextRegions = [...regions, finalRegion];

      const existingSeaKeysBeforeRegion = getSeaHexKeysWithout(hexTerrainByKey, regionHexes);
      const allSeaKeys = new Set(existingSeaKeysBeforeRegion);
      for (const key of seaHexKeys) allSeaKeys.add(key);
      const allNewSeaKeys = [...seaHexKeys];
      const nextCandidateHexesExclSea = getCandidateHexes(nextAllHexes, allSeaKeys);

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
      if (sizeCategory === 'tract' && allNewSeaKeys.length > 0) {
        finalizedRivers = trimTractRiverSourcesAwayFromSea(finalizedRivers, regionHexes, allSeaKeys);
      }
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

      let riversWithDeltas = finalizedRivers;

      riversWithDeltas = restoreInvalidGeneratedRiversForRegion(regionForRiverGeneration, riversForGeneration, riversWithDeltas, nextCandidateHexesExclSea);
      riversWithDeltas = sanitizeRiversForSea(
        riversForGeneration,
        riversWithDeltas,
        landVertexKeys,
        seaVertexKeys,
        allNewSeaKeys,
        regionHexes
      );
      if (sizeCategory === 'tract' && allNewSeaKeys.length > 0) {
        riversWithDeltas = trimTractRiverSourcesAwayFromSea(riversWithDeltas, regionHexes, allSeaKeys);
      }
      // Deltas, restoreInvalidGeneratedRiversForRegion, and sea sanitizing can
      // all change river paths; rebuild sectors one final
      // time so validation and saved debug data use the final geometry.
      riversWithDeltas = assignRiverSectors(
        riversWithDeltas,
        getLakesForRegions(nextRegions, nextHexTerrainByKeyPreview),
        nextRegions,
        nextCandidateHexesExclSea,
        allSeaKeys,
        { recalculatedRegionId: regionId }
      );

      const finalRiverSeaHeightViolation = getRiverSeaHeightViolation(riversWithDeltas, allSeaKeys);
      if (finalRiverSeaHeightViolation) {
        generationLog.warning('Candidate region has a river violating final sea height', {
          attempt,
          regionId,
          riverId: finalRiverSeaHeightViolation.river.id,
          reason: finalRiverSeaHeightViolation.reason,
          acceptedOnFinalAttempt: isLastRegionAttempt
        });
        if (!isLastRegionAttempt) { rejectAttempt('river_sea_height_violation'); continue; }
      }
      const finalRiverCycleValidation = validateRiverCycleSafety(riversWithDeltas);
      if (!finalRiverCycleValidation.valid) {
        generationLog.warning('Candidate region final river cycle was detected', { attempt, regionId, acceptedOnFinalAttempt: isLastRegionAttempt, ...finalRiverCycleValidation });
        if (!isLastRegionAttempt) { rejectAttempt('river_cycle_final'); continue; }
      }
      if (!validateExistingRiverEdgeFullnessPreserved(rivers, riversWithDeltas)) {
        generationLog.warning('Candidate region final river edge fullness changed old rivers', { attempt, regionId, acceptedOnFinalAttempt: isLastRegionAttempt });
        if (!isLastRegionAttempt) { rejectAttempt('old_fullness_final'); continue; }
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
            if (candidateTouchesRoadEndpoint(parseHexKey(key), roadEndpointKeysBeforeRoads)) continue;
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
      const initialCreatedSeaKeys = [...allNewSeaKeys, ...enclosedPocketKeys, ...seaHoleKeys];
      let createdSeaKeys = initialCreatedSeaKeys;
      const finalRegionTouchesExistingSea = finalRegion.hexes.some((hex) => getHexNeighbors(hex).some((neighbor) => existingSeaKeysBeforeRegion.has(hexKey(neighbor))));
      if (finalRegion.sizeCategory === 'tract' && finalRegionTouchesExistingSea) {
        createdSeaKeys = filterCreatedSeaKeysForRegionAdjacentExistingSea(
          createdSeaKeys,
          finalRegion.hexes,
          existingSeaKeysBeforeRegion,
          nextHexTerrainByKeyPreview,
          riversWithDeltas
        );
      }
      const { connectedSeaKeys: finalSeaKeysToWrite, disconnectedSeaKeys: seaKeysDemotedToCandidates } = splitNewSeaKeysByMouthConnectedComponent(createdSeaKeys, existingSeaKeysBeforeRegion, riversWithDeltas);
      const finalSeaKeySetToWrite = new Set(finalSeaKeysToWrite);
      const demotedSeaKeySet = new Set(seaKeysDemotedToCandidates);
      for (const key of initialCreatedSeaKeys) {
        if (!finalSeaKeySetToWrite.has(key)) demotedSeaKeySet.add(key);
      }
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
        for (const hex of area) if (!options.forbiddenHexes?.has(hexKey(hex))) enclosedLandPocketKeys.add(hexKey(hex));
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
        for (const key of existingSeaKeysBeforeRegion) blockedCandidateKeys.add(key);
        for (const key of finalSeaKeySetToWrite) blockedCandidateKeys.add(key);
        finalCandidateHexes = addCandidateHexKeys(finalCandidateHexes, demotedSeaKeySet, blockedCandidateKeys);
      }
      if (sizeCategory === 'tract') {
        const finalSeaKeysForRiverTrim = new Set<string>(existingSeaKeysBeforeRegion);
        for (const key of finalSeaKeySetToWrite) finalSeaKeysForRiverTrim.add(key);
        const trimmedRivers = trimTractRiverSourcesAwayFromSea(riversWithDeltas, regionHexes, finalSeaKeysForRiverTrim);
        if (trimmedRivers !== riversWithDeltas) {
          riversWithDeltas = assignRiverSectors(
            trimmedRivers,
            getLakesForRegions([...regions, finalRegionAfterLandPockets], nextHexTerrainByKeyPreview),
            [...regions, finalRegionAfterLandPockets],
            finalCandidateHexes,
            finalSeaKeysForRiverTrim,
            { recalculatedRegionId: regionId }
          );
        }
      }
      // Reject lake re-entry; the final numerical model also rejects directed cycles.
      const riverLakeReentryViolation = getNewRiverLakeReentryViolation(
        riversWithDeltas, nextRegions, nextHexTerrainByKeyPreview, rivers, regions, hexTerrainByKey);
      if (riverLakeReentryViolation) {
        rejectAttempt('river_lake_reentry');
        generationLog.warning('Candidate region has a river re-entering a lake it already left', {
          attempt,
          regionId,
          acceptedOnFinalAttempt: isLastRegionAttempt,
          ...riverLakeReentryViolation
        });
        continue;
      }

      const modelTerrain = (() => {
        let next = new Map(nextHexTerrainByKeyPreview);
        // Перед финальной записью состояния новый регион всегда удаляется из
        // старого моря/override-данных, затем записывается только актуальное море.
        const finalRegionKeySet = new Set(finalRegionAfterLandPockets.hexes.map(hexKey));
        for (const regionKey of finalRegionKeySet) {
          const terrain = next.get(regionKey);
          if (terrain?.terrainOverride === 'lake') continue;
          next.delete(regionKey);
        }
        for (const key of finalSeaKeysToWrite) {
          if (!finalRegionKeySet.has(key)) next.set(key, { terrainOverride: 'sea' });
        }
        const landlockedSeaResult = convertLandlockedSeaComponentsToLakes(
          next,
          [...regions, finalRegionAfterLandPockets],
          Math.max(computedNextLakeId, getNextLakeIdFromTerrain(next))
        );
        next = landlockedSeaResult.terrainByKey;
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
      })();
      generationProgress.stage = 'river_model';
      const modelResult = completeRegionRiverEnds(
        riversWithDeltas, rivers, finalRegionAfterLandPockets,
        [...regions, finalRegionAfterLandPockets], finalCandidateHexes, modelTerrain, candidateHexes, originalGenerationTerrain, recoveryClosedEnds(anchorHex)
      );
      if (!modelResult.success) {
        rejectAttempt(modelResult.reason);
        generationLog.warning('River model rejected region attempt', { attempt, reason: modelResult.reason });
        continue;
      }
      riversWithDeltas = modelResult.rivers;
      // BR-009 is a coastal rendering/distributary rule, separate from RIV confluences.
      if (allNewSeaKeys.length > 0) {
        const finalSea = getSeaHexKeys(modelResult.terrain);
        const seaBoundary = buildSeaMouthBoundary(finalSea);
        const graph = buildRiverGraphForRegion(finalRegionAfterLandPockets.hexes, finalLandHexesForCandidates, finalCandidateHexes);
        const arms = buildDeltaArmsForRivers(riversWithDeltas, regionId, graph, seaBoundary.vertexKeys, seaBoundary.edgeKeys, Math.max(0, ...riversWithDeltas.map(r => r.id)) + 1, rng);
        riversWithDeltas = [...riversWithDeltas, ...arms];
      }

      const allocatedRegionRivers=reserveGeneratedRiverIds(rivers,riversWithDeltas,nextRiverId);
      riversWithDeltas=allocatedRegionRivers.rivers;
      nextHexTerrainByKeyPreview.clear();
      for (const [key, value] of modelResult.terrain) nextHexTerrainByKeyPreview.set(key, value);
      const hexTerrainByKeyForRoads = new Map(nextHexTerrainByKeyPreview);
      for (const key of finalSeaKeysToWrite) hexTerrainByKeyForRoads.set(key, { terrainOverride: 'sea' });
      const roadResult = generateRoadsForRegion({
        region: finalRegionAfterLandPockets,
        regions,
        roads,
        rivers: riversWithDeltas,
        hexTerrainByKey: hexTerrainByKeyForRoads,
        nextRoadId,
        candidateHexes: finalCandidateHexes
      }, rng);

      if (finalRegionAfterLandPockets.biomeLandType === 'settled' && !finalRegionAfterLandPockets.isTract &&
        roadResult.roads.filter(road => road.regionId === regionId && road.segments.some(segment => segment.kind === 'road')).length < getSettledMainRoadLimit(finalRegionAfterLandPockets)) {
        rejectAttempt('road_minimum_after_river_completion');
        continue;
      }

      const finalRegionWithPoiKinds: Region = {
        ...finalRegionAfterLandPockets,
        pointOfInterestKinds: assignPoiKindsForRegion({
          region: finalRegionAfterLandPockets,
          roads: roadResult.roads,
          rivers: riversWithDeltas,
          hexTerrainByKey: hexTerrainByKeyForRoads
        }, rng)
      };
      const finalRegions = [...regions, assignWoodlandStyle(finalRegionWithPoiKinds, regions, biomeOverrideByHexKey)];
      const nextLakeIdAfterLandlockedSea = (() => {
        const terrainForLandlockedSeaCheck = new Map(nextHexTerrainByKeyPreview);
        const finalRegionKeySet = new Set(finalRegionWithPoiKinds.hexes.map(hexKey));
        for (const regionKey of finalRegionKeySet) {
          const terrain = terrainForLandlockedSeaCheck.get(regionKey);
          if (terrain?.terrainOverride === 'lake') continue;
          terrainForLandlockedSeaCheck.delete(regionKey);
        }
        for (const key of finalSeaKeysToWrite) {
          if (!finalRegionKeySet.has(key)) terrainForLandlockedSeaCheck.set(key, { terrainOverride: 'sea' });
        }
        return convertLandlockedSeaComponentsToLakes(
          terrainForLandlockedSeaCheck,
          finalRegions,
          Math.max(computedNextLakeId, getNextLakeIdFromTerrain(terrainForLandlockedSeaCheck))
        ).nextLakeId;
      })();

      const snapshot: MapSnapshot = {
      ...seaIdentityRef.current,
        knave:structuredClone(knaveRef.current),editorNames:structuredClone(editorNamesRef.current),tags:structuredClone(tagsRef.current),
      gmNotesByHexKey: {...notesMapRef.current},
        generation: cloneGenerationState(activeGenerationBefore.current ?? generationRef.current),
        kingdoms, obstacles, nextObstacleId, riverFeatures:riverFeatureOverrides,nextRiverId,
        regions,
        candidateHexes: originalGenerationCandidates,
        rivers,
        roads: cloneRoads(roads),
        crossings,
        hexTerrainByKey: originalGenerationTerrain,
        waterPoiByKey,
        biomeOverrideByHexKey,
        toponyms,
        toponymSeed,
        nextLakeId,
        nextRoadId
      };
      const finalHexTerrainByKey = modelResult.terrain;
      if (options.mode === 'mythic') {
        const full = buildRegionRiverNetwork(riversWithDeltas, [], finalRegions, finalCandidateHexes, finalHexTerrainByKey, true);
        if (full.issues.length || !validateRiverNetwork(full.network).valid) { rejectAttempt('mythic_full_river_network'); continue; }
      }

      const finalRegionKeySet = new Set(finalRegionWithPoiKinds.hexes.map(hexKey));
      const newlyCheckedWaterHexKeys = new Set([...finalRegionKeySet, ...finalSeaKeysToWrite]);
      generationProgress.stage = 'prepare_commit';
      const finalToponyms = synchronizeToponyms({ ...toponyms, ...options.previousToponyms }, getToponymEntities(finalRegions, riversWithDeltas, finalHexTerrainByKey), toponymSeed);
      const finalWaterPoi = assignWaterPoiLayer(waterPoiByKey, finalRegions, finalHexTerrainByKey, newlyCheckedWaterHexKeys, rng);
      if (options.mode === 'mythic') for (const key of newlyCheckedWaterHexKeys) finalWaterPoi.delete(key);
      const finalCrossings = reconcileRiverCrossings(roadResult.roads, riversWithDeltas, finalRegions, crossings, rng);
      const finalNextLakeId = Math.max(nextLakeIdAfterLandlockedSea, getNextLakeIdFromTerrain(finalHexTerrainByKey));
      recordGenerated(snapshot, { ...captureMap(), regions: finalRegions, candidateHexes: finalCandidateHexes,
        rivers: riversWithDeltas, roads: roadResult.roads, crossings: finalCrossings,
        hexTerrainByKey: finalHexTerrainByKey, waterPoiByKey: finalWaterPoi, toponyms: finalToponyms,
        nextLakeId: finalNextLakeId, nextRoadId: roadResult.nextRoadId, nextRiverId:allocatedRegionRivers.nextRiverId }, finalCenterHex, pendingRegen?.backup);
      setHistory((current) => [...current, structuredClone(snapshot)]);
      setRegions(finalRegions);
      setCandidateHexes(finalCandidateHexes);
      setHexTerrainByKey(finalHexTerrainByKey);
      setWaterPoiByKey(finalWaterPoi);
      setNextLakeId(finalNextLakeId);

      setNextRiverId(allocatedRegionRivers.nextRiverId);
      setRivers(riversWithDeltas);
      setToponyms(finalToponyms);
      setRoads(roadResult.roads);
      setCrossings(finalCrossings);
      setNextRoadId(roadResult.nextRoadId);
      setSelectedHex(finalCenterHex);
      generationLog.finish(generationEvent(anchorHex, options, 'generated', 'region_created', 'region'));
      return;
    }

    generationProgress.exhausted = true;
    generationLog.detail('Could not create region after max attempts', {
      anchorHex,
      maxRegionAttempts,
      fallback: 'tract'
    });
    addFallbackTractToMap(anchorHex, false, options, generationProgress.lastRejection ?? 'attempts_exhausted', 1, hexTerrainByKey, candidateHexes);
  };


  const captureMap = (): MapSnapshot => ({ knave:knaveRef.current,...seaIdentityRef.current,editorNames:editorNamesRef.current,riverFeatures:riverFeatureOverrides,nextRiverId,tags:tagsRef.current, gmNotesByHexKey: notesMapRef.current, generation: cloneGenerationState(generationRef.current), kingdoms, obstacles, nextObstacleId, regions, candidateHexes, rivers, roads, crossings,
    hexTerrainByKey, waterPoiByKey, biomeOverrideByHexKey, toponyms, toponymSeed, nextLakeId, nextRoadId });
  const captureDocument = (): DocumentSnapshot => ({ map: captureMap(), generationHistory: history, selectedHex,
    generationMode, isMapRotated, mapScale: pendingMapZoomRef.current?.scale ?? mapScaleRef.current });
  const closeEditors = () => {
    updateKnaveDraft(null);
    updatePoiDraft(null);
    updateRegionDraft(null);
    setRiverFeatureTarget(null);
    updateRiverPreview(null);updateRoadResolution(null);setRiverHitChoices([]);setRiverRoadHitChoices([]);setRiverHitHover(null);
    setAmbiguousObstacleIds([]);
    setHoverObstacleEdge(null); updateObstacleDraft(null); setSelectedObstacleId(null);
    setEditingHexBiomeKey(null); setEditingPoiHexKey(null); setEditingCentralPoiRegionId(null); setEditingRegionBiomeId(null); setEditError(null);
  };
  const recordTransaction = (before: DocumentSnapshot, after: DocumentSnapshot) => {
    const transaction = { before: copyDocument(before), after: copyDocument(after) };
    documentRevision.current++;
    setUndoHistory(current => [...current, transaction].slice(-100));
    setRedoHistory([]);
  };
  const applyExactMap = (map: MapSnapshot) => {
    map=withLegacySeas(map);updateSeaIdentity(map);
    updateKnave(map.knave);
    updateEditorNames(map.editorNames??{});
    setRiverFeatureOverrides(map.riverFeatures);setNextRiverId(map.nextRiverId);
    updateTags(map.tags??emptyTags());
    updateNotesMap({...map.gmNotesByHexKey}); clearNotesDraft();
    restoreGeneration(map.generation);
    setKingdoms(map.kingdoms ?? []); setObstacles(map.obstacles ?? []);
    setRegions(map.regions); setCandidateHexes(map.candidateHexes); setRivers(map.rivers);
    setRoads(map.roads); setCrossings(map.crossings); setHexTerrainByKey(map.hexTerrainByKey);
    setWaterPoiByKey(map.waterPoiByKey); setBiomeOverrideByHexKey(map.biomeOverrideByHexKey);
    setToponyms(map.toponyms); setToponymSeed(map.toponymSeed);
    setNextLakeId(map.nextLakeId); setNextRoadId(map.nextRoadId); setNextObstacleId(map.nextObstacleId ?? 1);
  };
  // Checkpoints are detached once at generation commit and thereafter immutable.
  // Share those checkpoints between transactions instead of copying the whole
  // map's generation history for every POI click.
  const copyDocument = (doc: DocumentSnapshot): DocumentSnapshot => ({
    ...doc, map: structuredClone((validateKnaveLayer(doc.map.knave,knaveMapContext(doc.map),10,doc.generationMode),checkedRiverMap(doc.map))), selectedHex: doc.selectedHex ? {...doc.selectedHex} : null,
    generationHistory: [...doc.generationHistory]
  });
  const applyPreparedDocument = (doc: DocumentSnapshot) => {
    poiDocumentToken.current={};
    tagLocks.current.clear();setTagAnimations({});
    documentRevision.current++;
    updateWaterDraft(null); updateRiverDraft(null); updateRoadDraft(null); setSelectedRoadPair(null); setSelectedRoadTarget(null); setConfirmRoadRemoval(null);
    applyExactMap(doc.map); setHistory(doc.generationHistory); setSelectedHex(doc.selectedHex);
    setGenerationMode(doc.generationMode); setIsMapRotated(doc.isMapRotated);
    updateMapScale(doc.mapScale); setPendingRegen(null); closeEditors();
    nameDraftRef.current = null; setNameDraft(null); setNameErrors({});
  };
  const applyDocument = (value: DocumentSnapshot) => applyPreparedDocument(copyDocument(value));
  const documentBusy = () => documentRevision.current !== renderedDocumentRevision
    || importInFlight.current || kingdomInFlight.current || !!kingdomJob || !!pendingRegen;
  const mutationBlocked = (finishGroup = true) => {
    if (knaveDraftRef.current || poiDraftRef.current || regionDraftRef.current || waterDraftRef.current || roadFeatureResolutionRef.current || riverCommandPreviewRef.current || riverDraftRef.current || roadDraftRef.current || documentBusy() || dirtyNameDraft()) return true;
    if (finishGroup) finishNotesGroup();
    return false;
  };
  // Every input is already part of the document. Only history entries coalesce;
  // no timer may later write a pending value into another hex or imported world.
  const changeNotesText = (key: string, text: string) => {
    if (knaveDraftRef.current || poiDraftRef.current || regionDraftRef.current || waterDraftRef.current || riverDraftRef.current || roadDraftRef.current || documentBusy() || dirtyNameDraft() || notesSelectionRef.current !== key
      || (!hexTerrainByKey.has(key) && !regions.some(r => r.hexes.some(h => hexKey(h) === key)))) return;
    if (text === (notesMapRef.current[key] ?? '')) return;
    if (notesGroupRef.current?.key !== key) finishNotesGroup();
    const group = notesGroupRef.current ?? {key, before: copyDocument(captureDocument()),
      undo: undoHistoryRef.current, redo: redoHistoryRef.current};
    notesGroupRef.current = group;
    const notes = {...notesMapRef.current};
    if (text === '') delete notes[key]; else notes[key] = text;
    const after = copyDocument({...captureDocument(), map: {...captureMap(), gmNotesByHexKey: notes}});
    const noChange = text === (group.before.map.gmNotesByHexKey[key] ?? '');
    const undo = noChange ? group.undo : [...group.undo, {before: group.before, after}].slice(-100);
    const redo = noChange ? group.redo : [];
    documentRevision.current++;
    undoHistoryRef.current = undo; redoHistoryRef.current = redo;
    setUndoHistory(undo); setRedoHistory(redo); updateNotesMap(notes); setNotesError(false);
    if (notesTimerRef.current !== null) clearTimeout(notesTimerRef.current);
    if (!notesComposingRef.current) notesTimerRef.current = setTimeout(finishNotesGroup, 500);
  };
  const openNotesEditor = (key: string) => { if (!mutationBlocked()) setNotesEditorKey(key); };
  const toggleNotesEditor = (key: string) => {
    if (mutationBlocked()) return;
    setNotesEditorKey(current => current === key ? null : key);
  };
  const editRoadDocument = (edit: RoadEdit, expectedDraft?:RoadDraft, featureEdits:FeatureEdit[]=[],expectedResolution?:RoadFeatureResolution,confirmedNames:string[]=[]): boolean => {
    if(regionDraftRef.current||waterDraftRef.current)return false;
    if(roadFeatureResolutionRef.current&&(expectedResolution!==roadFeatureResolutionRef.current||expectedResolution.revision!==documentRevision.current))return false;
    if (expectedDraft ? roadDraftRef.current!==expectedDraft || expectedDraft.revision!==documentRevision.current || documentBusy() || dirtyNameDraft() : expectedResolution?riverDraftRef.current||documentBusy()||dirtyNameDraft():mutationBlocked()) return false;
    try {
      const landRegion = (hex: AxialHex) => isLakeHex(hex, hexTerrainByKey) || isSeaHex(hex, hexTerrainByKey)
        ? undefined : regions.find(r => r.hexes.some(h => isSameHex(h, hex)))?.id;
      checkedRiverMap(captureMap());
      const result = prepareRoadEdit({roads, crossings, nextRoadId}, edit, {
        landRegion,
        destination: hex => regions.some(r => (!r.isTract && !r.suppressCentralPoi && isSameHex(r.centerHex, hex)) || r.pointsOfInterest.some(h => isSameHex(h, hex))),
        openExit: hex => landRegion(hex) !== undefined && getHexNeighbors(hex).some(h =>
          !hexTerrainByKey.has(hexKey(h)) && !regions.some(r => r.hexes.some(v => isSameHex(v, h)))),
        blocked: (a, b) => obstacles.some(o => pairKey(o.hex, o.neighborHex) === pairKey(a, b)),
        intersections: (a, b) => {
          const edge = getSharedHexEdgeVertexKeys(a, b);
          if (!edge) throw new Error('invalid_shared_edge');
          const riverEdgeKey = [...edge].sort().join('|');
          return rivers.filter(r => r.vertexPath.slice(1).some((v, i) => getRiverEdgeKey(r.vertexPath[i], v) === riverEdgeKey))
            .map(r => ({riverId: r.id, riverEdgeKey, fullness:knownRiverEdgeFullness(r,riverEdgeKey)??Number.NaN}));
        },
        minima: regions.filter(r => r.biomeLandType === 'settled' && !r.isTract)
          .map(r => ({regionId: r.id, minimum: getSettledMainRoadLimit(r)}))
      });
      const eligibility=riverFeatureEligibility(rivers,regions,hexTerrainByKey,result.crossings);
      const conflicts:FeatureEdit[]=riverFeatureOverrides.rapids.filter(e=>e.state==='on'&&!eligibility.rapid(e.riverId,e.edgeKey)).map(e=>({type:'rapid',...e}));
      if(editMode&&conflicts.some(e=>!featureEdits.some(choice=>choice.type==='rapid'&&e.type==='rapid'&&choice.riverId===e.riverId&&choice.edgeKey===e.edgeKey&&choice.state!=='on'))){
        updateRoadResolution({edit,draft:expectedDraft,revision:documentRevision.current,conflicts,edits:featureEdits});setEditError(null);return false;
      }
      const riverFeatures=resolveRiverFeatureEdits(riverFeatureOverrides,featureEdits,rivers,eligibility);
      if (result.roads === roads && result.crossings === crossings && result.nextRoadId === nextRoadId&&riverFeatures===riverFeatureOverrides) return true;
      const before = copyDocument(captureDocument());
      let editorNames=captureMap().editorNames;
      if(confirmedNames.length){
        const confirmation=confirmRoadRemoval;
        if(edit.type!=='remove'||!confirmation||confirmation.revision!==documentRevision.current||confirmation.roadId!==edit.roadId||confirmation.segmentKey!==edit.segmentKey)return false;
        const allowed=new Set(roadRemovalNames(edit.roadId,edit.segmentKey).map(([key])=>key));
        if(confirmedNames.some(key=>!allowed.has(key)))return false;
        editorNames=Object.fromEntries(Object.entries(editorNames).filter(([key])=>!confirmedNames.includes(key)));
      }
      const after = copyDocument({...captureDocument(), map: {...captureMap(), ...result,riverFeatures,editorNames}});
      // Both copies are complete before any state write. Never reconcile crossings here.
      setUndoHistory(current => [...current, {before, after}].slice(-100)); setRedoHistory([]);
      applyPreparedDocument(after);
      return true;
    } catch (error) {
      setEditError(authoredNameError(error,language)??(language === 'ru' ? `Путь не изменён: ${roadErrorText(error instanceof Error ? error.message : '')}`
        : `Path unchanged: ${error instanceof Error ? error.message : 'preparation error'}`));
      return false;
    }
  };
  const actualHexKeys = (map: Pick<MapSnapshot, 'regions' | 'hexTerrainByKey'>) =>
    new Set([...map.regions.flatMap(r => r.hexes.map(hexKey)), ...map.hexTerrainByKey.keys()]);
  const notesForSurvivingHexes = (map: Pick<MapSnapshot, 'regions' | 'hexTerrainByKey'>) => {
    const keys = actualHexKeys(map);
    return Object.fromEntries(Object.entries(notesMapRef.current).filter(([key]) => keys.has(key)));
  };
  const confirmNotesRemoval = (notes: Record<string, string>) => {
    const removed = Object.keys(notesMapRef.current).filter(key => !(key in notes));
    return !removed.length || window.confirm(language === 'ru'
      ? `Удалить заметки мастера (${removed.length}) в гексах ${removed.join('; ')}? Их можно восстановить отменой.`
      : `Delete GM notes (${removed.length}) at ${removed.join('; ')}? Undo can restore them.`);
  };
  const undoMap = () => {
    updateObstacleDraft(null); setSelectedObstacleId(null);
    if (mutationBlocked() || !undoHistoryRef.current.length) return;
    const currentUndo = undoHistoryRef.current;
    const transaction = currentUndo[currentUndo.length - 1];
    applyDocument(transaction.before);
    setUndoHistory(currentUndo.slice(0,-1)); setRedoHistory(current => [...current, transaction]);
  };
  const redoMap = () => {
    updateObstacleDraft(null); setSelectedObstacleId(null);
    if (mutationBlocked() || !redoHistoryRef.current.length) return;
    const currentRedo = redoHistoryRef.current;
    const transaction = currentRedo[currentRedo.length - 1];
    applyDocument(transaction.after);
    setRedoHistory(currentRedo.slice(0,-1)); setUndoHistory(current => [...current, transaction].slice(-100));
  };
  const tagCommandError=(error:unknown)=>error instanceof TagCapacityError
    ? language==='ru' ? (error.capacity==='owner'?'На объекте уже 64 тега. Карта не изменена.':'В этом тексте уже 8 языков. Карта не изменена.')
      : (error.capacity==='owner'?'This object already has 64 tags. Your map is unchanged.':'This text already has 8 languages. Your map is unchanged.')
    : language==='ru'?'Не удалось изменить тег. Карта не изменена.':'Could not change tag. Your map is unchanged.';
  const commitManualMap = (map: MapSnapshot, reconcileNames = true) => {
    try {
      // Preserve a settlement label before the type ceases to enumerate it.
      const nextEntities=new Set(getToponymEntities(map.regions,map.rivers,map.hexTerrainByKey).map(e=>e.key));
      const poiLive=poiNameLocators(map),authored={...map.editorNames};
      for(const [key,name]of Object.entries(map.toponyms)){if(key.startsWith('settlement:')&&!nextEntities.has(key)){const owner='poi:'+key.slice(11);if(poiLive.has(owner)&&!Object.prototype.hasOwnProperty.call(authored,owner))authored[owner]={en:name.en,ru:name.ru};}}
      map={...map,editorNames:authored};
      // Prepare every clone before the first history/revision/state write.
      map={...map,tags:reconcileTags(map.tags??emptyTags(),map,captureMap(),generationRef.current.masterSeed,generationMode==='mythic')};
      if(map.knave){const losses=knaveLosses(map.knave,knaveMapContext(map));
        if(losses.length){if(!window.confirm(language==='ru'?`Изменение удалит содержимое точек и данные проходимости/обнаружения Knave (${losses.length}). Отмена вернёт их.`:`This edit removes Knave point content and terrain/discovery data (${losses.length}). Undo can restore it.`))return false;
          const layer=structuredClone(map.knave);for(const loss of losses){dropKnaveLoss(layer,loss);}map={...map,knave:layer};}}
      checkedRiverMap(map);
      const prepared = structuredClone({ ...map, toponyms: reconcileNames ? synchronizeToponyms(map.toponyms,
        getToponymEntities(map.regions, map.rivers, map.hexTerrainByKey), map.toponymSeed) : map.toponyms });
      const before = captureDocument(), after = { ...before, map: prepared };
      recordTransaction(before, after); applyExactMap(prepared); closeEditors();
      return true;
    } catch (error) {
      setEditError(authoredNameError(error,language)??(error instanceof PoiMoveError?(language==='ru'?'Изменение удалит авторское имя POI. Сначала очистите его явно. Карта не изменена.':'The edit would remove an authored POI name. Clear it explicitly first. Your map is unchanged.'):error instanceof TagCapacityError?tagCommandError(error):language === 'ru' ? 'Не удалось изменить значение. Карта не изменена.' : 'Could not change the value. Your map is unchanged.'));
      return false;
    }
  };
  const riverCommandError=(error:unknown)=>{
    const authored=authoredNameError(error,language);if(authored)return authored;
    const reason=error instanceof Error?error.message:'';
    const rules:[string,string,string][]=[['CYCLE','Русло создаёт замкнутый цикл.','The route creates a directed cycle.'],['RIV-007','Сухопутный исток должен иметь полноводность 1.','A dry source must have fullness 1.'],['RIV-005','Полноводность в месте слияния несовместима с притоками.','Fullness at the confluence conflicts with its tributaries.'],['RIV-008','Площадь озера недостаточна для этого истока.','The lake is too small for this source.'],['RIV-009','Площадь озера не выдерживает разницу входа и выхода.','The lake cannot support this inflow/outflow difference.'],['RIV-010','Площадь озера недостаточна для закрытого устья.','The lake is too small for this closed mouth.'],['RIV-006','Недопустимый исток, устье или разветвление; море не может быть истоком.','Invalid source, mouth or split; the sea cannot be a source.'],['owner','Регион владельца не прилегает к ребру.','The owner region does not adjoin the edge.'],['unknown_fixed_river_fullness','Неоднозначная полноводность старого участка.','The old reach has ambiguous fullness.']];
    const rule=rules.find(r=>reason.includes(r[0]));if(rule)return rule[language==='ru'?1:2];
    return language==='ru'?(reason.includes('solver_limit')?'Проверка слишком сложна; упростите русло.':reason.includes('crossing_kind_required')?'Брод стал слишком глубоким. Выберите мост или переправу.':reason.includes('delta_')?'Рукав дельты несовместим с этим изменением.':reason.includes('ineligible_')?'Ручная отметка конфликтует с изменением. Выберите «Авто» или «Нет».':reason.includes('solver_unsatisfiable')?'Полноводность несовместима с соседними участками или размером озера.':'Реку не удалось изменить. Карта не изменена.')
      :(reason.includes('solver_limit')?'Validation is too complex; simplify the route.':reason.includes('crossing_kind_required')?'The ford is too deep. Choose a bridge or ferry.':reason.includes('delta_')?'A delta arm conflicts with this change.':reason.includes('ineligible_')?'A manual feature conflicts with this change. Choose Auto or Off.':reason.includes('solver_unsatisfiable')?'Fullness conflicts with neighbouring reaches or lake area.':'Could not change the river. Your map is unchanged.');
  };
  const editRiverDocument=(edit:RiverEdit,options:RiverEditOptions={},expectedRevision=renderedDocumentRevision,expectedDraft?:RiverDraft,expectedPreview?:RiverCommandPreview):boolean=>{
    if(regionDraftRef.current||waterDraftRef.current||expectedRevision!==documentRevision.current||obstacleDraftRef.current||notesComposingRef.current
      ||(expectedPreview?riverCommandPreviewRef.current!==expectedPreview:!!riverCommandPreviewRef.current)
      ||(expectedDraft||expectedPreview?(expectedDraft?riverDraftRef.current!==expectedDraft||expectedDraft.revision!==documentRevision.current:!!riverDraftRef.current)||roadDraftRef.current||documentBusy()||dirtyNameDraft():mutationBlocked(false)))return false;
    try{
      const original=captureMap(),plan=prepareRiverMapEdit(original,edit,options);
      if(plan.map===original)return true;
      if(plan.confirmationRequired&&!options.confirmed){setEditError(language==='ru'?'Подтвердите изменение реки и её зависимостей.':'Confirm the river change and its dependencies.');return false;}
      finishNotesGroup();return commitManualMap(plan.map);
    }catch(error){setEditError(riverCommandError(error));return false;}
  };
  const requestRiverCommand=(edit:RiverEdit,options:RiverEditOptions={},draft?:RiverDraft):boolean=>{
    if(regionDraftRef.current||waterDraftRef.current||notesComposingRef.current||obstacleDraftRef.current||documentBusy()||(draft?riverDraftRef.current!==draft:mutationBlocked(false)))return false;
    try{
      const plan=prepareRiverMapEdit(captureMap(),edit,options,true);
      if(plan.unresolvedCrossings.length||plan.unresolvedFeatures.length||plan.confirmationRequired){
        updateRiverPreview({edit,options,revision:documentRevision.current,draft});setEditError(null);setIsSidePanelCollapsed(false);return false;
      }
      return editRiverDocument(edit,options,documentRevision.current,draft);
    }catch(error){
      const subject=edit.type==='create'?undefined:rivers.find(r=>r.id===edit.riverId),keys=new Set(subject?.vertexPath.map(v=>v.key));
      const related=subject?rivers.filter(r=>r.id!==subject.id&&r.vertexPath.some(v=>keys.has(v.key))):[];
      setEditError(riverCommandError(error)+(related.length?` ${language==='ru'?'Связанные реки':'Connected rivers'}: ${related.map(r=>`${riverLabel(r.id)} (${riverPlace(r)})`).join('; ')}`:''));return false;
    }
  };
  const confirmRiverCommand=(expected:RiverCommandPreview|null=riverCommandPreview)=>{
    const preview=riverCommandPreviewRef.current;
    if(!preview||preview!==expected||preview.revision!==documentRevision.current||documentBusy())return false;
    try{
      const plan=prepareRiverMapEdit(captureMap(),preview.edit,preview.options,true);
      if(plan.unresolvedCrossings.length||plan.unresolvedFeatures.length)return false;
      if(!editRiverDocument(preview.edit,{...preview.options,confirmed:true},preview.revision,preview.draft,preview))return false;
      if(preview.draft)updateRiverDraft(null);updateRiverPreview(null);
      return true;
    }catch(error){setEditError(riverCommandError(error));return false;}
  };
  const cancelRiverCommand=(expected:RiverCommandPreview|null=riverCommandPreview)=>{
    if(riverCommandPreviewRef.current!==expected)return false;
    updateRiverPreview(null);setEditError(null);
    const id=expected?.edit.type==='create'?undefined:expected?.edit.riverId;
    if(typeof document!=='undefined')setTimeout(()=>document.querySelector<HTMLButtonElement>(id?`[data-river-choice="${id}"]`:'[data-add-river]')?.focus(),0);
    return true;
  };
  const editRiverFeatures=(edits:FeatureEdit[],expectedRevision=renderedDocumentRevision):boolean=>{
    if(expectedRevision!==documentRevision.current||mutationBlocked(false)||obstacleDraftRef.current)return false;
    try{
      const map=checkedRiverMap(captureMap()),features=resolveRiverFeatureEdits(map.riverFeatures,edits,map.rivers,riverFeatureEligibility(map.rivers,map.regions,map.hexTerrainByKey,map.crossings));
      if(features===map.riverFeatures)return true;
      finishNotesGroup();return commitManualMap({...map,riverFeatures:features},false);
    }catch(error){setEditError(riverCommandError(error));return false;}
  };
  const waterKindLabel=(kind:WaterKind)=>language==='ru'?({land:'Суша',lake:'Озеро',sea:'Море'}[kind]):({land:'Land',lake:'Lake',sea:'Sea'}[kind]);
  const waterName=(key:string)=>editorNames[key]?.[language]??toponyms[key]?.[language]??(language==='ru'?'Без названия':'Unnamed');
  const waterCommandError=(error:unknown)=>{
    const authored=authoredNameError(error,language);if(authored)return authored;
    const ru=language==='ru',end=ru?' Карта не изменена.':' Your map is unchanged.';
    if(!(error instanceof WaterEditError))return (error instanceof TagCapacityError?tagCommandError(error):ru?'Не удалось подготовить изменение воды.':'Could not prepare the water edit.')+end;
    const [first,second]=error.details;
    if(error.code.startsWith('sea_'))return (error.code==='sea_name_choice'?(ru?'Именованное море изменяет состав. Сначала разрешите разделение/слияние вручную.':'A named sea changes identity. Resolve its split or merge with the water editor first.'):(ru?'Не удалось проверить идентичность моря. Обновите выбор клеток или проверьте сохранение.':'Sea identity could not be validated. Update the cell choices or check the save.'))+end;
    const message:Record<string,string>={
      coordinate:ru?'Некорректные координаты клетки.':'Invalid cell coordinates.',unregistered:ru?'Эта клетка ещё не создана.':'This cell has not been created.',kind:ru?'Выберите сушу, озеро или море.':'Choose land, lake or sea.',
      protected_region_hex:ru?`Здесь центр или опорный гекс региона «${waterName(`region:${first}`)}» (${second}). Измените выделение.`:`This is the centre or anchor of region “${waterName(`region:${first}`)}” (${second}). Change the selection.`,
      sea_minimum:ru?'Морю нужны хотя бы две соседние клетки. Добавьте клетку или выберите озеро.':'The sea needs at least two adjacent cells. Add a cell or choose a lake.',
      no_region:ru?'У возвращаемой воды нет соседнего региона. Сначала создайте соседний регион.':'The reclaimed water has no adjacent region. Create an adjacent region first.',
      region_choice:ru?'Выберите соседний регион для возвращаемой воды.':'Choose an adjacent region for reclaimed water.',
      legacy_disconnected_lake:ru?`Озеро «${waterName(`lake:${first}`)}» уже имеет несвязные части. Эта правка неоднозначна; выберите другой водоём.`:`Lake “${waterName(`lake:${first}`)}” already has disconnected parts. This edit is ambiguous; choose another body.`,
      road_water:ru?`Дорога / тропа ${first}, гекс ${second}, окажется под водой. Измените выделение или сначала измените путь.`:`Road / trail ${first} at ${second} would be underwater. Change the selection or edit the path first.`,
      road_end:ru?`Путь ${first} потеряет назначение или выход у ${second}. Сначала измените путь.`:`Path ${first} would lose its destination or exit at ${second}. Edit the path first.`,
      lake_overflow:ru?'Невозможно выделить новый ID озера.':'No new lake ID is available.',lake_counter:ru?'Некорректный счётчик озёр.':'Invalid lake counter.',
      river_unverified:ru?`Не удалось подтвердить полноводность или геометрию реки «${waterName(`river:${first}`)}». Сначала исправьте реку.`:`Fullness or geometry of river “${waterName(`river:${first}`)}” could not be verified. Edit the river first.`,
      biome_boundary:ru?`Регион «${waterName(`region:${first}`)}» несовместим с соседним «${waterName(`region:${second}`)}» по биому. Выберите другой регион или сначала измените биом.`:`Region “${waterName(`region:${first}`)}” conflicts with neighbour “${waterName(`region:${second}`)}” by biome. Choose another region or change its biome first.`,
      river_reentry:ru?`Река «${waterName(`river:${first}`)}» повторно войдёт в озеро «${waterName(`lake:${second}`)}». Измените берег или русло.`:`River “${waterName(`river:${first}`)}” would re-enter lake “${waterName(`lake:${second}`)}”. Change the shore or route.`,
      enclosed_sea:ru?'Замкнутый водоём должен быть озером.':'An enclosed body must be a lake.',
      crossing_kind:ru?'Выберите допустимый вид переправы; глубокий брод запрещён.':'Choose a valid crossing type; a deep ford is not allowed.',
      name_conflict:ru?'Новое имя изменило бы принятое название. Изменение отклонено.':'A new name would change an accepted name. The edit was rejected.'
    };
    if(error.code==='river_rule'){
      let description=riverCommandError(new Error(first));
      try{const d=JSON.parse(second) as {rivers:number[];lakes:{id:string;area:number;minimum:number|null;inputs:number[];outputs:number[]}[]};
        if(d.rivers.length)description+=` ${ru?'Реки':'Rivers'}: ${d.rivers.map(id=>{const r=rivers.find(r=>r.id===id),fs=[...new Set(r?.sectors.map(s=>s.fullness)??[])].sort((a,b)=>a-b);return `${waterName(`river:${id}`)} · F${fs.join('/')}`;}).join(', ')}.`;
        for(const l of d.lakes)description+=` ${l.id.startsWith('lake:')?waterName(l.id):(ru?'Устье':'Mouth')}: N=${l.area}, ${ru?'требуется':'required'} N≥${l.minimum??'?'}, F ${l.inputs.join('+')||'—'} → ${l.outputs.join('+')||'—'}.`;
      }catch{/* The primary domain reason remains available. */}
      return description+(ru?' Измените выделение либо сбросьте правку и измените реку.':' Change the selection, or reset this edit and change the river.')+end;
    }
    return (message[error.code]??(ru?'Недопустимое изменение воды.':'Invalid water edit.'))+end;
  };
  const regionCommandError=(error:unknown)=>{
    const authored=authoredNameError(error,language);if(authored)return authored;
    const ru=language==='ru',code=error instanceof RegionEditError?error.code:error instanceof Error?error.message.split(':')[0]:'';
    const unchanged=ru?' Карта не изменена.':' Your map is unchanged.';
    const regionName=(id:string)=>toponyms[`region:${id}`]?.[language]??`${ru?'Регион':'Region'} ${id}`;
    if(error instanceof RegionEditError&&code==='region_river_uphill'){
      const [from,fromHeight,to,toHeight,...riverKeys]=error.details;
      const label=(key:string)=>`${toponyms[key]?.[language]??(key.startsWith('river:')?(ru?'Река':'River'):(ru?'Регион':'Region'))} (#${key.split(':')[1]})`;
      const rivers=riverKeys.map(label).join(', '),transition=`${label(from)} → ${label(to)}, ${ru?'уровни':'levels'} ${fromHeight} → ${toHeight}`;
      return `${rivers}: ${transition}. ${ru?'Течение вверх недопустимо.':'Uphill flow is not allowed.'}`+unchanged
        +(ru?' Выберите другую высоту или измените реку отдельным действием.':' Choose another height or edit the river as a separate action.');
    }
    if(error instanceof RegionEditError&&code==='road_minimum'){
      const [id,count,minimum]=error.details;
      return (ru?`${regionName(id)}: дорог ${count}, требуется ${minimum}. Сначала добавьте дорогу отдельным действием.`
        :`${regionName(id)}: ${count} roads, ${minimum} required. Add a road as a separate action first.`)+unchanged;
    }
    const messages:Record<string,[string,string]>={
      height_biome:['Выберите базовую местность той же высоты.','Choose base terrain at the selected height.'],
      biome_compatibility:['Местность несовместима с соседним регионом.','Terrain is incompatible with a neighboring region.'],
      protected_center:['Центральный гекс нельзя передать.','The center hex cannot be transferred.'],
      protected_anchor:['Якорный гекс нельзя передать.','The anchor hex cannot be transferred.'],
      disconnected_region:['Перенос разорвёт регион на части.','The transfer would disconnect a region.'],
      empty_region:['Регион должен сохранить хотя бы один гекс.','A region must keep at least one hex.'],
      target_not_adjacent:['Нужен регион с общей стороной гекса.','Choose a region sharing a side of this hex.'],
      kingdom_membership_change:['Оба региона должны принадлежать одному королевству.','Both regions must belong to the same kingdom.'],
      outside_kingdom_area:['Регион должен пересекать область своего королевства.','The region must intersect its kingdom area.'],
      identity_conflict:['У получателя уже есть имя или теги этой точки.','The destination already has a name or tags for this point.'],
      road_minimum:['Сначала добавьте недостающую дорогу отдельным действием.','Add the missing road as a separate action first.'],
      crossing_conflict:['Изменение потребовало бы изменить переправы. Сначала исправьте пересечение отдельным действием.','The edit would require changing crossings. Fix the intersection separately first.'],
      river_marker:['Ручная отметка реки конфликтует с изменением.','A manual river marker conflicts with the edit.'],
      region_river_uphill:['Изменение направит реку вверх по рельефу.','The edit would make a river flow uphill.'],
      river_owner:['Нельзя сохранить владельца или полноводность указанной реки. Сначала исправьте реку отдельным действием.','The named river owner or fullness cannot be preserved. Edit the river separately first.'],
      river_rule:['Нельзя сохранить гидрологические правила указанных рек. Сначала измените реку отдельным действием.','The named rivers cannot preserve their hydrology rules. Edit the river separately first.'],
      region_river_owner_conflict:['Не удалось сохранить принадлежность речного ребра.','The river edge owner cannot be preserved.']
    };
    return (messages[code]?.[ru?0:1]??(ru?'Изменение конфликтует с данными региона или реки.':'The edit conflicts with region or river data.'))
      +(error instanceof RegionEditError&&error.details.length?` (${error.details.slice(0,3).map((value,i)=>{
        const regional=['biome_compatibility','protected_center','protected_anchor','disconnected_region','empty_region','kingdom_membership_change','outside_kingdom_area'];
        return regional.includes(code)&&/^\d+$/.test(value)&&(i===0||code==='biome_compatibility'||code==='kingdom_membership_change')?regionName(value):toponyms[value]?.[language]??value;
      }).join('; ')})`:'')+unchanged;
  };
  const resetRegionDraft=(expected=regionDraft)=>{
    if(regionDraftRef.current!==expected)return false;updateRegionDraft(null);setEditError(null);return true;
  };
  const currentRegionDraft=(expected:RegionDraft|null):expected is RegionDraft=>{
    if(!expected||regionDraftRef.current!==expected)return false;
    if(expected.revision!==documentRevision.current){updateRegionDraft(null);setEditError(language==='ru'?'Карта изменилась. Выберите значение заново.':'The map changed. Select the value again.');return false;}
    return true;
  };
  const startRegionDraft=(type:RegionEdit['type'])=>{
    if(!editMode||!selectedRegion||!selectedHexKey||notesSelectionRef.current!==selectedHexKey||notesComposingRef.current||obstacleDraftRef.current||!finishInlineName()||mutationBlocked())return false;
    closeEditors();
    const edit:RegionEdit=type==='region_height'?{type,regionId:selectedRegion.id,heightLevel:selectedRegion.heightLevel,biomeId:selectedRegion.biomeId}
      :{type,hexKey:selectedHexKey,fromRegionId:selectedRegion.id,toRegionId:selectedRegion.id};
    updateRegionDraft({id:++regionDraftSerial.current,revision:documentRevision.current,originKey:selectedHexKey,edit});return true;
  };
  const changeRegionDraft=(expected:RegionDraft,edit:RegionEdit)=>{
    if(!currentRegionDraft(expected)||documentBusy()||edit.type!==expected.edit.type)return false;
    if(edit.type==='region_height'&&expected.edit.type==='region_height'&&edit.regionId!==expected.edit.regionId
      ||edit.type==='transfer_hex'&&expected.edit.type==='transfer_hex'&&(edit.hexKey!==expected.edit.hexKey||edit.fromRegionId!==expected.edit.fromRegionId))return false;
    const original=regions.find(r=>r.id===(edit.type==='region_height'?edit.regionId:edit.fromRegionId));
    if(edit.type==='transfer_hex'&&edit.toRegionId===edit.fromRegionId||edit.type==='region_height'&&original?.heightLevel===edit.heightLevel&&original.biomeId===edit.biomeId)return resetRegionDraft(expected);
    updateRegionDraft({...expected,edit,ambiguousRegionIds:[]});setEditError(null);return true;
  };
  const finishRegionDraft=(expected=regionDraft):boolean=>{
    const draft=regionDraftRef.current;if(!draft)return !expected;
    if(draft!==expected||!currentRegionDraft(draft)||documentBusy()||notesComposingRef.current||dirtyNameDraft())return false;
    if(draft.ambiguousRegionIds?.length){setEditError(language==='ru'?'Здесь несколько целей. Выберите регион в списке.':'Several targets overlap here. Choose a region from the list.');return false;}
    try{
      const original=captureMap(),map=prepareRegionMapEdit(original,draft.edit);
      if(map===original){resetRegionDraft(draft);return true;}
      const before=copyDocument(captureDocument()),after=copyDocument({...captureDocument(),map});
      assertHexcrawlSaveData(createSaveData(after));
      recordTransaction(before,after);applyPreparedDocument(after);return true;
    }catch(error){setEditError(regionCommandError(error));return false;}
  };
  const resetWaterDraft=(expected:WaterDraft|null=waterDraft)=>{
    if(waterDraftRef.current!==expected)return false;updateWaterDraft(null);setEditError(null);return true;
  };
  const startWaterDraft=(target:WaterKind,key=selectedHexKey)=>{
    if(!editMode||!key||notesComposingRef.current||obstacleDraftRef.current||!finishInlineName()||mutationBlocked())return false;
    if(!actualHexKeys(captureMap()).has(key))return false;
    finishNotesGroup();clearNotesDraft();closeEditors();setSelectedRoadPair(null);setSelectedRoadTarget(null);setConfirmRoadRemoval(null);
    updateWaterDraft({id:++waterDraftSerial.current,revision:documentRevision.current,originKey:key,edit:{target,hexKeys:[key]},options:{},preview:false});return true;
  };
  const changeWaterDraft=(expected:WaterDraft,patch:Partial<Pick<WaterDraft,'edit'|'options'|'preview'>>)=>{
    if(waterDraftRef.current!==expected||expected.revision!==documentRevision.current||documentBusy())return false;
    updateWaterDraft({...expected,...patch});setEditError(null);return true;
  };
  const toggleWaterHex=(key:string,expected:WaterDraft|null=waterDraftRef.current)=>{
    if(!expected||waterDraftRef.current!==expected||expected.revision!==documentRevision.current||documentBusy()||!actualHexKeys(captureMap()).has(key))return false;
    const keys=expected.edit.hexKeys.includes(key)?expected.edit.hexKeys.filter(k=>k!==key):[...expected.edit.hexKeys,key];
    return changeWaterDraft(expected,{edit:{target:expected.edit.target,hexKeys:keys},options:{},preview:false});
  };
  const selectWholeWaterBody=(expected:WaterDraft|null=waterDraft)=>{
    if(!expected||waterDraftRef.current!==expected)return false;
    const keys=connectedWaterBody(hexTerrainByKey,expected.originKey);
    return !!keys.length&&changeWaterDraft(expected,{edit:{target:expected.edit.target,hexKeys:[...new Set([...expected.edit.hexKeys,...keys])]},options:{},preview:false});
  };
  const finishWaterDraft=(expected:WaterDraft|null=waterDraft,confirmed=false):boolean=>{
    const draft=waterDraftRef.current;if(!draft)return !expected;
    if(draft!==expected)return false;
    if(draft.revision!==documentRevision.current){updateWaterDraft(null);setEditError(language==='ru'?'Карта изменилась. Выберите клетки заново.':'The map changed. Select cells again.');return false;}
    if(documentBusy()||notesComposingRef.current||dirtyNameDraft())return false;
    try{
      const original=captureMap(),plan=prepareWaterMapEdit(original,draft.edit,draft.options);
      if(plan.map===original){updateWaterDraft(null);setEditError(null);return true;}
      if(plan.sea.unresolved.length||plan.geometry.unresolved.length||plan.unresolvedLosses.length||plan.unresolvedFeatures.length||plan.unresolvedCrossings.length||plan.confirmationRequired&&!confirmed){
        updateWaterDraft({...draft,preview:true});setEditError(null);setIsSidePanelCollapsed(false);return false;
      }
      // Both full snapshots, validation and all allocation are ready before any setter.
      const before=copyDocument(captureDocument()),after=copyDocument({...captureDocument(),map:plan.map});
      recordTransaction(before,after);applyPreparedDocument(after);return true;
    }catch(error){
      if(!(error instanceof WaterEditError)&&!(error instanceof TagCapacityError)){
        // Retain the original cause/stack without attaching map or authored data.
        try{console.error('Water edit preparation failed',error);}catch{/* Diagnostics must not interrupt the atomic refusal. */}
      }
      updateWaterDraft({...draft,preview:true});setEditError(waterCommandError(error));return false;
    }
  };
  const recordGenerated = (checkpoint: MapSnapshot, map: MapSnapshot, selection: AxialHex,
    backup?: GenerationBackup, checkpoints = history) => {
    const sea=prepareSeaIdentity(captureMap(),map.hexTerrainByKey);
    if(sea.unresolved.length)throw new WaterEditError('sea_name_choice',...sea.unresolved.map(c=>c.key));
    for(const id of sea.removedSeaIds){const pair=map.editorNames[`sea:${id}`];if(pair)throw new AuthoredNameConflict(`sea:${id}`,pair);}
    map.seas=sea.seas;map.nextSeaId=sea.nextSeaId;
    checkedRiverMap(map);
    assertGeneratedIds(map);
    if (!kingdomJob) backup ??= activeGenerationBackup.current ?? undefined;
    if (kingdomJob && !backup) {updateSeaIdentity(map);return;} // internal kingdom steps form one transaction at finish
    const before = backup?.document ?? { ...captureDocument(), map: { ...captureMap(), generation: cloneGenerationState(checkpoint.generation) } };
    const notes = before.map.gmNotesByHexKey ?? gmNotesByHexKey;
    const keys = actualHexKeys(map), missing = Object.keys(notes).filter(key => !keys.has(key));
    if (missing.length) throw new NotesLossConflict(missing);
    map.tags=reconcileTags(map.tags??emptyTags(),map,checkpoint,generationRef.current.masterSeed,generationMode==='mythic'||!!kingdomJob);
    map.gmNotesByHexKey = {...notes};
    recordTransaction(before, { ...captureDocument(), map, selectedHex: selection,
      generationHistory: [...checkpoints, structuredClone(withLegacySeas(checkpoint))] });
    updateSeaIdentity(map);updateTags(map.tags);updateNotesMap(map.gmNotesByHexKey);
  };

  const mutateTag=(owner:TagOwner,id:string,slot?:number,edit?:{index:number;text:string})=>{
    if(mutationBlocked()||obstacleDraftRef.current)return false;
    const key=tagKey(owner,id),now=Date.now();
    if((tagLocks.current.get(key)??0)>now||!tagOwners(captureMap()).has(ownerKey(owner)))return false;
    const def=mythicDefinitions[id],existing=findTag(tagsRef.current,owner,id);
    if(!def||(existing&&existing.definitionVersion!==def.version))return false;
    try{
      const next=edit?editTag(tagsRef.current,owner,id,edit.index,language,edit.text):rollTag(tagsRef.current,owner,def,generationRef.current.masterSeed,slot);
      if(!commitManualMap({...captureMap(),tags:next},false))return false;
      const result=findTag(next,owner,id)!;
      setTagAnnouncement(result.texts.map((text,i)=>result.overrides?.[i]?.[language]??text[language]??text.ru??Object.values(text)[0]).join(' · '));
      if(!edit){tagLocks.current.set(key,now+350);setTagAnimations(current=>({...current,[key]:{key,slot,revision:result.revision,expiresAt:now+350}}));}
      return true;
    }catch(error){setEditError(tagCommandError(error));return false;}
  };
  const materialReadBlocked=()=>activeTagDraftCount>0||activeTagDraftKeys.current.size>0||!!nameDraftRef.current||notesEditorKey!==null||mutationBlocked(false)||!!obstacleDraftRef.current;
  const guardMaterialRead=(event:React.SyntheticEvent<HTMLDivElement>)=>{
    if((event.target as Element).closest('[data-myth-material]')&&materialReadBlocked()){
      event.preventDefault();event.stopPropagation();return true;
    }
    return false;
  };
  const renderTags=(owner:TagOwner,type:string)=>{
    const policy=tagPolicy(type),available=[...policy.automatic,...policy.optional].map(n=>'mb.'+n);
    const instances=tags.instances.filter(i=>ownerKey(i.owner)===ownerKey(owner));
    const ids=generationMode==='mythic'?[...new Set([...available,...instances.filter(i=>!mythicDefinitions[i.definitionId]).map(i=>i.definitionId)])]:[...new Set(instances.map(i=>i.definitionId))];
    const rows=ids.filter(id=>generationMode==='mythic'||findTag(tags,owner,id)).map(id=>{
      const def=mythicDefinitions[id],instance=findTag(tags,owner,id);
      return <TagRow key={`${tagKey(owner,id)}:${instance?.revision??0}`} owner={owner} definition={def} instance={instance} language={language} editMode={editMode}
        materialContext={type==='myth'?{poiType:type,documentRevision:renderedDocumentRevision,disabled:materialReadBlocked()}:undefined}
        disabled={!!poiDraft||!!regionDraft||isImporting||!!kingdomJob||!!pendingRegen||!!waterDraft||!!riverDraft||!!roadDraft||!!obstacleDraft||dirtyNameDraft()}
        animation={tagAnimations[tagKey(owner,id)]}
        onDraftChange={(active,token)=>notifyTagDraft(token,active)}
        onRoll={slot=>mutateTag(owner,id,slot)} onEdit={(index,text)=>mutateTag(owner,id,undefined,{index,text})}/>;
    });
    return generationMode==='mythic'?<>{rows}</>:rows.length?<details className="tag-mode"><summary>Mythic Bastionland</summary>{rows}</details>:null;
  };
  const fillMissingTags=()=>{if(mutationBlocked()||obstacleDraftRef.current)return;try{const next=fillMythicTags(tagsRef.current,captureMap(),generationRef.current.masterSeed);if(next!==tagsRef.current)commitManualMap({...captureMap(),tags:next},false);}catch(error){setEditError(tagCommandError(error));}};

  const captureGenerationBackup = (): GenerationBackup => ({
    map: structuredClone(captureMap()), history: [...history], selectedHex: selectedHex ? {...selectedHex} : null,
    document: copyDocument(captureDocument()), undo: undoHistory, redo: redoHistory
  });

  const restoreGenerationBackup = (backup: GenerationBackup) => {
    const map = withLegacySeas(backup.map);
    updateSeaIdentity(map);
    updateKnave(map.knave);
    updateEditorNames(map.editorNames??{});
    setRiverFeatureOverrides(map.riverFeatures);setNextRiverId(map.nextRiverId);
    updateTags(map.tags??emptyTags());
    updateNotesMap({...map.gmNotesByHexKey}); clearNotesDraft();
    restoreGeneration(map.generation);
    setKingdoms(map.kingdoms ?? []);
    setObstacles(map.obstacles ?? []);
    setRegions(map.regions);
    setCandidateHexes(map.candidateHexes);
    setRivers(map.rivers);
    setRoads(map.roads);
    setCrossings(map.crossings);
    setHexTerrainByKey(map.hexTerrainByKey);
    setWaterPoiByKey(map.waterPoiByKey);
    setBiomeOverrideByHexKey(map.biomeOverrideByHexKey);
    setToponyms(map.toponyms);
    setToponymSeed(map.toponymSeed);
    setNextLakeId(map.nextLakeId);
    setNextRoadId(map.nextRoadId); setNextObstacleId(map.nextObstacleId ?? 1);
    setHistory(backup.history);
    setSelectedHex(backup.selectedHex);
    if (backup.document) {
      setGenerationMode(backup.document.generationMode); setIsMapRotated(backup.document.isMapRotated);
      updateMapScale(backup.document.mapScale);
    }
    if (backup.undo) setUndoHistory(backup.undo);
    if (backup.redo) setRedoHistory(backup.redo);
  };

  const reportGenerationFailure = (error: unknown, anchorHex: AxialHex, options: GenerationOptions, backup: GenerationBackup, context?: GenerationActionContext) => {
    restoreGenerationBackup(backup);
    const seaConflict=error instanceof WaterEditError&&error.code.startsWith('sea_');
    const authored=authoredNameError(error,language);if(authored)setEditError(authored);else if(seaConflict)setEditError(waterCommandError(error));
    activeGenerationBefore.current = cloneGenerationState(backup.map.generation);
    const notesLossHexKeys = error instanceof NotesLossConflict ? [...error.hexKeys] : undefined;
    const diagnostic = generationLog.finish({
      ...generationEvent(anchorHex, options, notesLossHexKeys||authored||seaConflict||error instanceof RiverFeatureConflict ? 'constraint-rejection' : 'programming-error',
        notesLossHexKeys ? 'notes_loss_conflict' : seaConflict ? 'sea_identity_conflict' : authored ? 'authored_name_loss' : error instanceof RiverFeatureConflict ? 'river_feature_conflict' : String(error), 'rolled-back', context),
      ...(notesLossHexKeys ? { notesLossHexKeys } : {}),
      message: String(error),
      stack: error && typeof error === 'object' && 'stack' in error ? String(error.stack) : undefined
    });
    setGenerationError(diagnostic);
    return { success: false as const, diagnostic };
  };

  const safelyAddRegionToMap = (anchorHex: AxialHex, options: GenerationOptions = {}, rollback?: GenerationBackup) => {
    if (importInFlight.current) return { success: false as const, diagnostic: generationError! };
    const backup = rollback ?? captureGenerationBackup();
    activeGenerationBefore.current = cloneGenerationState(backup.map.generation);
    activeGenerationBackup.current = backup;
    setGenerationError(null);
    generationLog.begin();
    generationProgress.action = pendingRegen ? 'regenerate' : 'add';
    generationProgress.exhausted = false;
    generationProgress.targetSize = null;
    generationProgress.rejectionCounts = {};
    generationProgress.seaRecoveryAttempt = 0;
    generationProgress.reclaimedSeaKeys = [];
    generationProgress.attempt = 0;
    generationProgress.tractAttempt = 0;
    generationProgress.stage = 'region';
    generationProgress.lastRejection = null;
    generationProgress.fallbackReason = null;
    generationProgress.constraintFailure = null;
    try {
      __profileBeginClick();
      addRegionToMap(anchorHex, options);
      if (generationProgress.constraintFailure) {
        for (const keys of (kingdomJob ? [] : seaRecoveryPlans(anchorHex))) {
          generationLog.warning('Retrying generation with local sea reclamation', { keys, reason: generationProgress.constraintFailure });
          generationProgress.seaRecoveryAttempt++;
          generationProgress.reclaimedSeaKeys = keys;
          generationProgress.tractAttempt = 0;
          generationProgress.constraintFailure = null;
          generationProgress.exhausted = false;
          const trialTerrain = new Map(hexTerrainByKey);
          for (const key of keys) trialTerrain.delete(key);
          const trialCandidates = getCandidateHexes(allRegionHexes, getSeaHexKeys(trialTerrain));
          addRegionToMap(anchorHex, options, trialTerrain, trialCandidates);
          if (!generationProgress.constraintFailure) break;
        }
      }
      if (generationProgress.constraintFailure) {
        restoreGenerationBackup(backup);
        const diagnostic = generationLog.finish(generationEvent(anchorHex, options,
          'constraint-rejection', generationProgress.constraintFailure, 'rolled-back'));
        setGenerationError(diagnostic);
        return { success: false as const, diagnostic };
      }
      return { success: true as const, fallbackReason: generationProgress.fallbackReason };
    } catch (error) {
      return reportGenerationFailure(error, anchorHex, options, backup);
    }
  };

  const startKingdom = (anchor: AxialHex, failureBackup?: GenerationBackup, context?: GenerationActionContext) => {
    if (importInFlight.current || kingdomInFlight.current || kingdomJob) return;
    kingdomInFlight.current = true;
    const backup = captureGenerationBackup();
    // User action context outlives pendingRegen and every React render/tick.
    const actionContext = context ?? { action: failureBackup ? 'regenerate' : 'add', inputOptions: captureGenerationInputs() };
    try {
      const id = Math.max(0,...kingdoms.map(k=>k.id))+1;
      if (!Number.isSafeInteger(id)) throw new SaveValidationError('map.kingdoms','ID overflow');
      const occupied = new Set([...allRegionHexes.map(hexKey), ...hexTerrainByKey.keys()]);
      const origin = findKingdomOrigin(anchor, occupied);
      const area = kingdomKeys(origin);
      setGenerationError(null);
      setDetailedRenderReady(false);
      setKingdomJob({backup,failureBackup,actionContext,origin,anchor,id,startCount:regions.length,steps:0,phase:area.has(hexKey(anchor))?'build':'connect',first:true});
    } catch(error) { kingdomInFlight.current=false; reportGenerationFailure(error,anchor,{mode:'mythic'},failureBackup ?? backup,actionContext); }
  };

  const finishKingdom = (job: KingdomJob) => {
    const area = kingdomKeys(job.origin);
    const dry = (h:AxialHex) => !hexTerrainByKey.get(hexKey(h))?.terrainOverride;
    let members = regions.filter(r=>r.kingdomId===job.id);
    const eligible = members.filter(r=>!r.isTract && area.has(hexKey(r.centerHex)) && dry(r.centerHex));
    const settled = eligible.filter(r=>r.biomeLandType==='settled');
    for (const region of eligible.filter(r=>r.biomeLandType==='wild').sort((a,b)=>b.finalSize-a.finalSize)) {
      if(settled.length>=4)break;
      const choice=chooseBiomeIdAtHeightLevel('settled',[],region.id,region.heightLevel,{reasons:[]}, rng);
      if(!choice.biomeId)continue;
      const biome=BIOMES[choice.biomeId];
      const promoted:Region={...region,biomeLandType:'settled',biomeId:biome.id,biomeLabel:biome.label,biomePrimaryEmoji:biome.primaryEmoji,biomeSecondaryEmojis:[...biome.secondaryEmojis],biomeEmojiLabel:biome.primaryEmoji+biome.secondaryEmojis.join('')};
      members=members.map(r=>r.id===promoted.id?promoted:r);settled.push(promoted);
    }
    const assigned=allocateKingdomPoi(members,area,dry, rng.poi).map(r=>({...r,suppressCentralPoi:!r.isTract&&!r.centralPoiKind}));
    const byId=new Map(assigned.map(r=>[r.id,r]));
    const finalRegions=regions.map(r=>byId.get(r.id)??r);
    // Rebuild only this action's regions, in generation order, from the exact
    // pre-action road network. Earlier regions and their segments remain fixed.
    let rebuiltRoads=cloneRoads(job.backup.map.roads),roadId=job.backup.map.nextRoadId;
    const processed=finalRegions.slice(0,job.backup.map.regions.length);
    for(const region of finalRegions.slice(job.backup.map.regions.length)) {
      processed.push(region);
      const candidates=getCandidateHexes(processed.flatMap(r=>r.hexes),getSeaHexKeys(hexTerrainByKey));
      const result=generateRoadsForRegion({region,regions:processed,roads:rebuiltRoads,rivers,hexTerrainByKey,nextRoadId:roadId,candidateHexes:candidates}, rng);
      rebuiltRoads=result.roads;roadId=result.nextRoadId;
    }
    const heights=new Map(finalRegions.flatMap(r=>r.hexes.map(h=>[hexKey(h),r.heightLevel] as const)));
    const riverEdges=new Set(rivers.flatMap(r=>r.vertexPath.slice(1).map((v,i)=>edgeKey(r.vertexPath[i],v))));
    const roadPairs=new Set(rebuiltRoads.flatMap(r=>r.segments.map(s=>pairKey(s.from,s.to))));
    if(obstacles.some(o=>roadPairs.has(pairKey(o.hex,o.neighborHex))))throw new Error('Дорога пересекла существующее препятствие.');
    const addedObstacles=createObstacles(job.id,kingdomHexes(job.origin),getHexEdgesAsVertexPairs,h=>heights.get(hexKey(h))??0,h=>!dry(h),riverEdges,roadPairs, rng.geography);
    if(normalizeObstacleCounter(obstacles,nextObstacleId)!==nextObstacleId||nextObstacleId>Number.MAX_SAFE_INTEGER-addedObstacles.length)throw new SaveValidationError('counters.nextObstacleId','counter overflow');
    const identifiedObstacles=addedObstacles.map((o,i)=>({...o,id:nextObstacleId+i}));
    const finalNextObstacleId=nextObstacleId+identifiedObstacles.length;
    const names=synchronizeToponyms({},[{key:`kingdom:${job.id}`,kind:'region'}],toponymSeed);
    const kingdom:Kingdom={id:job.id,origin:job.origin,anchor:job.anchor,regionIds:assigned.map(r=>r.id),name:names[`kingdom:${job.id}`],color:`hsl(${Math.round((job.id*137.508)%360)} 65% 68%)`};
    const water=new Map(waterPoiByKey);
    for(const r of members)for(const h of r.hexes)water.delete(hexKey(h));
    const finalCrossings=reconcileRiverCrossings(rebuiltRoads,rivers,finalRegions,crossings, rng);
    recordGenerated(job.backup.map, { ...captureMap(), regions: finalRegions, roads: rebuiltRoads,
      nextRoadId: roadId, crossings: finalCrossings,
      waterPoiByKey: water, toponyms: synchronizeToponyms(toponyms,getToponymEntities(finalRegions,rivers,hexTerrainByKey),toponymSeed),
      kingdoms: [...kingdoms,kingdom], obstacles: [...obstacles,...identifiedObstacles], nextObstacleId: finalNextObstacleId },
      assigned.find(r=>r.centralPoiKind==='throne')!.centerHex, job.failureBackup ?? job.backup, job.backup.history);
    setRegions(finalRegions);
    setRoads(rebuiltRoads);setNextRoadId(roadId);
    setCrossings(finalCrossings);
    setWaterPoiByKey(water);
    setToponyms(synchronizeToponyms(toponyms,getToponymEntities(finalRegions,rivers,hexTerrainByKey),toponymSeed));
    setKingdoms([...kingdoms,kingdom]);setObstacles([...obstacles,...identifiedObstacles]);setNextObstacleId(finalNextObstacleId);
    setHistory([...job.backup.history,structuredClone(job.backup.map)]);
    setSelectedHex(assigned.find(r=>r.centralPoiKind==='throne')!.centerHex);
    activeGenerationBefore.current = cloneGenerationState((job.failureBackup ?? job.backup).map.generation);
    generationProgress.action = job.failureBackup ? 'regenerate' : 'add';
    generationLog.finish(generationEvent(job.anchor,{mode:'mythic'},'generated','kingdom_created','region',job.actionContext));
    kingdomInFlight.current=false; setKingdomJob(null);
  };

  const advanceKingdom = () => {
    const job=kingdomJob;if(!job || advancedJobs.current.has(job))return;
    // A consumed tick remains stale even after a newer tick has executed.
    advancedJobs.current.add(job);
    try {
      if(!job.first && regions.length===job.startCount+1) {
        const first=regions[job.startCount];
        if(first.isTract || first.biomeLandType!=='settled' || (![11,12].includes(first.targetSize) || first.finalSize < first.targetSize)) {
          if((job.recoveries??0)>=12)throw new Error('Не удалось создать первый освоенный регион на 11–12 гексов.');
          restoreSnapshot({...history[history.length-1], generation: cloneGenerationState(generationRef.current)});setHistory(history.slice(0,-1));
          setKingdomJob({...job,first:true,recoveries:(job.recoveries??0)+1,steps:job.steps+1});return;
        }
      }
      if(job.steps>300)throw new Error('Превышен лимит построения королевства.');
      const area=kingdomKeys(job.origin),occupied=new Set([...allRegionHexes.map(hexKey),...hexTerrainByKey.keys()]);
      if(job.phase==='connect') {
        const path=connectionPath(job.anchor,area,new Set([...job.backup.map.regions.flatMap(r=>r.hexes.map(hexKey)),...hexTerrainByKey.keys()]));
        const next=path.find(h=>!occupied.has(hexKey(h)));
        if(!next||area.has(hexKey(next))) {setKingdomJob({...job,phase:'build',startCount:regions.length});return;}
        const result=safelyAddRegionToMap(next,{coastalPreference:'mainland',forbiddenHexes:area});
        if(!result.success)throw new Error('Не удалось построить соединительный регион.');
        setKingdomJob({...job,steps:job.steps+1});return;
      }
      const uncovered=kingdomHexes(job.origin).filter(h=>!occupied.has(hexKey(h)));
      if(!uncovered.length) {finishKingdom(job);return;}
      // The throne and first settlement start at offset column 6, row 6.
      // Later anchors belong to the rectangle and touch the built map.
      const center=kingdomHexes(job.origin)[78];
      const candidates=job.first?uncovered:uncovered.filter(h=>getHexNeighbors(h).some(n=>occupied.has(hexKey(n))));
      if(!candidates.length)throw new Error('Не найден следующий гекс королевства.');
      const anchor=job.first ? center : job.preferredAnchor && !occupied.has(hexKey(job.preferredAnchor)) ? job.preferredAnchor : candidates.sort((a,b)=>distance(a,center)-distance(b,center))[0];
      const targetSize=modeRegionSize('mythic',()=>rollRegionTargetSize(rng),job.first, rng.geography);
      const result=safelyAddRegionToMap(anchor,{mode:'mythic',kingdomId:job.id,kingdomArea:area,fixedCenter:job.first?center:undefined,targetSize,landType:job.first?'settled':undefined,coastalPreference:'mainland'});
      if(!result.success) {
        if(result.diagnostic.kind==='constraint-rejection' && regions.length>job.startCount+1 && (job.recoveries??0)<12) {
          restoreSnapshot({...history[history.length-1], generation: cloneGenerationState(generationRef.current)});setHistory(history.slice(0,-1));
          setKingdomJob({...job,preferredAnchor:anchor,recoveries:(job.recoveries??0)+1,steps:job.steps+1});return;
        }
        throw new Error('Не удалось построить регион королевства.');
      }
      setKingdomJob({...job,preferredAnchor:undefined,first:false,steps:job.steps+1});
    } catch(error) {reportGenerationFailure(error,job.anchor,{mode:'mythic'},job.failureBackup ?? job.backup,job.actionContext);kingdomInFlight.current=false;setKingdomJob(null);}
  };
  useEffect(()=>{
    if(!kingdomJob)return;
    const timer=window.setTimeout(advanceKingdom,0);
    return ()=>window.clearTimeout(timer);
  },[kingdomJob]);

  // Let the completed basic map paint before building the detailed SVG once.
  useEffect(() => {
    if (kingdomJob || detailedRenderReady) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setDetailedRenderReady(true));
    });
    return () => { cancelAnimationFrame(firstFrame); cancelAnimationFrame(secondFrame); };
  }, [kingdomJob, detailedRenderReady]);

  const resetMapToMode = (nextMode?:GenerationMode) => {
    updateObstacleDraft(null); setSelectedObstacleId(null);
    if (mutationBlocked()) return;
    if (!regions.length && !rivers.length && !roads.length && !kingdoms.length && !obstacles.length
      && !hexTerrainByKey.size && !waterPoiByKey.size && !biomeOverrideByHexKey.size && !candidateHexes.length
      && !Object.keys(toponyms).length && nextLakeId===1 && nextRoadId===1 && nextObstacleId===1 && !isMapRotated
      && seaIdentityRef.current.nextSeaId===1 && !seaIdentityRef.current.seas.length
      && nextRiverId===1 && !riverFeatureOverrides.rapids.length && !riverFeatureOverrides.waterfalls.length
      && !knaveRef.current && selectedHex?.q===START_HEX.q && selectedHex?.r===START_HEX.r) return;
    if(Object.keys(editorNamesRef.current).length){setEditError(language==='ru'?`Сброс удалит авторское имя «${Object.values(editorNamesRef.current)[0]?.ru}». Сначала очистите его явно.`:`Reset would remove the authored name “${Object.values(editorNamesRef.current)[0]?.en}”. Clear it explicitly first.`);return;}
    if(knaveRef.current&&(Object.keys(knaveRef.current.difficultyByHex).length||Object.keys(knaveRef.current.discoveryByPoi).length||Object.keys(knaveRef.current.content?.byPoi??{}).length)&&!window.confirm(language==='ru'?'Сброс удалит содержимое точек, проходимость и данные обнаружения Knave. Отмена вернёт их.':'Reset removes Knave point content, terrain and discovery data. Undo can restore them.'))return;
    if (!confirmNotesRemoval({})) return;
    const before=captureDocument();
    const newGeneration = createGenerationState(newWorldSeed());
    const after: DocumentSnapshot = { ...before, map: { seas:[],nextSeaId:1,editorNames:{},riverFeatures:emptyRiverFeatures(),nextRiverId:1,tags:emptyTags(), gmNotesByHexKey: {}, generation: newGeneration, kingdoms: [], obstacles: [], regions: [], candidateHexes: [],
      rivers: [], roads: [], crossings: [], hexTerrainByKey: new Map(), waterPoiByKey: new Map(), biomeOverrideByHexKey: new Map(),
      toponyms: {}, toponymSeed: toponymSeedFor(newGeneration.masterSeed), nextLakeId: 1, nextRoadId: 1, nextObstacleId: 1 },
      generationHistory: [], selectedHex: START_HEX, isMapRotated: false, generationMode:nextMode??before.generationMode };
    recordTransaction(before,after); applyDocument(after); setEditMode(false); setGenerationError(null);
  };

  const resetMap = () => resetMapToMode();
  const chooseKnaveProfile=(enabled:boolean)=>{
    if(generationMode!=='classic'||mutationBlocked()||regions.length||hexTerrainByKey.size||kingdoms.length)return false;
    if(enabled===!!knaveRef.current)return true;
    documentRevision.current++;updateKnave(enabled?newKnaveLayer():undefined);return true;
  };
  const changeGenerationMode=(mode:GenerationMode)=>{
    if(mutationBlocked()||mode===generationMode)return;
    if(knaveRef.current&&mode==='mythic'){
      if(regions.length||hexTerrainByKey.size){if(!window.confirm(language==='ru'?'Для смены профиля начать новую карту?':'Start a new map to change the profile?'))return;resetMapToMode(mode);}
      else{documentRevision.current++;updateKnave(undefined);setGenerationMode(mode);}
    }else setGenerationMode(mode);
  };
  const applyWorldSeed = () => {
    if (mutationBlocked()) return false;
    if (regions.length || hexTerrainByKey.size || kingdoms.length) return true;
    const seed = /^\d+$/.test(seedInput) ? Number(seedInput) : NaN;
    if (!isUint32(seed)) { setSeedError(true); return false; }
    setSeedError(false);
    if (seed === generationRef.current.masterSeed) return true;
    const before = captureDocument();
    const map = {...before.map, generation: createGenerationState(seed), toponymSeed: toponymSeedFor(seed)};
    recordTransaction(before, {...before, map}); applyExactMap(map);
    return true;
  };
  const generateAt = (anchor: AxialHex) => {
    if (mutationBlocked() || !applyWorldSeed()) return;
    documentRevision.current++;
    if (generationMode === 'mythic') { startKingdom(anchor); return; }
    const backup = captureGenerationBackup();
    try { const options = buildGenerationOptions(); safelyAddRegionToMap(anchor, options, backup); }
    catch(error) { reportGenerationFailure(error, anchor, {}, backup); }
  };

  // Текущие параметры генерации, собранные из выпадающих списков.
  // Размер перебрасывается в момент вызова, чтобы каждая генерация в рамках
  // выбранной категории давала новое случайное значение из её диапазона.
  const buildGenerationOptions = (): GenerationOptions => ({
    targetSize: genSizeCategory === 'auto' ? undefined : rollRegionSizeInCategory(genSizeCategory, rng),
    landType: genLandType === 'auto' ? undefined : genLandType,
    biomeId: genBiome === 'auto' ? undefined : genBiome,
    coastalPreference: genCoastal === 'auto' ? undefined : genCoastal
  });

  const retainedKnaveCheckpoint=(snapshot:MapSnapshot)=>{
    const current=knaveRef.current;if(!current)return snapshot.knave;
    const layer=structuredClone(current),target=knaveMapContext(snapshot);
    for(const loss of knaveLosses(layer,target)){dropKnaveLoss(layer,loss);}
    validateKnaveLayer(layer,target,10,'classic');return layer;
  };
  // Удаление последнего региона = восстановление снимка состояния, сделанного
  // перед его добавлением. Это надёжно откатывает и реки, и дороги, в том
  // числе изменения, которые новый регион внёс в соседние регионы.
  const restoreSnapshot = (snapshot: MapSnapshot, exactWater=false) => {
    snapshot = withLegacySeas(structuredClone({...snapshot,riverFeatures:snapshot.riverFeatures??emptyRiverFeatures(),nextRiverId:snapshot.nextRiverId??migrateRiverEditing(snapshot.rivers).nextRiverId}));
    snapshot={...snapshot,knave:retainedKnaveCheckpoint(snapshot)};
    checkedRiverMap(snapshot);
    if(exactWater){applyExactMap(snapshot);return;}
    updateSeaIdentity(snapshot);updateKnave(snapshot.knave);
    const retainedPoiNames=retainPoiNames(snapshot,editorNamesRef.current);
    updateTags(reconcileTags(tagsRef.current,snapshot,captureMap(),generationRef.current.masterSeed,false));
    restoreGeneration(snapshot.generation);
    setKingdoms(snapshot.kingdoms ?? []);
    setObstacles(snapshot.obstacles ?? []);
    setRegions(snapshot.regions);
    setCandidateHexes(snapshot.candidateHexes);
    setRiverFeatureOverrides(snapshot.riverFeatures??emptyRiverFeatures());setNextRiverId(snapshot.nextRiverId??migrateRiverEditing(snapshot.rivers).nextRiverId);
    setRivers(snapshot.rivers);
    updateEditorNames(retainedPoiNames);
    const survivingEntities = getToponymEntities(snapshot.regions, snapshot.rivers, snapshot.hexTerrainByKey);
    const retainedNames: ToponymRegistry = { ...(snapshot.toponyms ?? {}) };
    for (const { key } of survivingEntities) {
      if (toponyms[key]) retainedNames[key] = toponyms[key];
    }
    setToponyms(synchronizeToponyms(retainedNames, survivingEntities, snapshot.toponymSeed ?? toponymSeed));
    setToponymSeed(snapshot.toponymSeed ?? toponymSeed);
    setRoads(pruneRoadsToRegionHexes(cloneRoads(snapshot.roads), snapshot.regions));
    setCrossings(snapshot.crossings);
    setHexTerrainByKey(snapshot.hexTerrainByKey);
    setWaterPoiByKey(snapshot.waterPoiByKey);
    setBiomeOverrideByHexKey(snapshot.biomeOverrideByHexKey);
    setNextLakeId(snapshot.nextLakeId);
    setNextRoadId(snapshot.nextRoadId); setNextObstacleId(snapshot.nextObstacleId ?? 1);
  };

  const checkpointWaterChanged=(checkpoint:MapSnapshot)=>{
    const retainedIds=new Set(checkpoint.regions.map(r=>r.id));
    const keys=new Set([...checkpoint.regions.flatMap(r=>r.hexes.map(hexKey)),...checkpoint.hexTerrainByKey.keys(),...regions.filter(r=>retainedIds.has(r.id)).flatMap(r=>r.hexes.map(hexKey))]);
    const previous=withLegacySeas(checkpoint),current=seaIdentityRef.current;
    const seaNames=(names:EditorNames)=>Object.fromEntries(Object.entries(names).filter(([key])=>key.startsWith('sea:')));
    return JSON.stringify(current)!==JSON.stringify({seas:previous.seas,nextSeaId:previous.nextSeaId})
      ||JSON.stringify(seaNames(editorNamesRef.current))!==JSON.stringify(seaNames(checkpoint.editorNames??{}))
      ||[...keys].some(key=>JSON.stringify(hexTerrainByKey.get(key))!==JSON.stringify(checkpoint.hexTerrainByKey.get(key)));
  };
  const confirmRiverCheckpointLoss=(checkpoint:MapSnapshot)=>{
    const retained=new Set(checkpoint.regions.map(r=>r.id));
    const currentById=new Map(rivers.map(r=>[r.id,r]));
    const checkpointById=new Map(checkpoint.rivers.map(r=>[r.id,r]));
    // A manual deletion is lost too when the older generation checkpoint
    // restores that river. Compare both identity sets, not only live rivers.
    const candidates=new Map([...checkpointById,...currentById]);
    const changed=[...candidates.values()].filter(r=>{
      const current=currentById.get(r.id),previous=checkpointById.get(r.id);
      // Path replacement may move the owner into the removed region while
      // the checkpoint restores that same identity in a retained region.
      // A new river may start in the removed region yet own retained sectors.
      // Sector ownership describes that footprint; global owner alone does not.
      const affectsRetained=[current,previous].some(river=>river&&(retained.has(river.regionId)
        ||river.sectors.some(sector=>retained.has(sector.assignedRegionId??river.regionId))));
      return affectsRetained&&JSON.stringify(current)!==JSON.stringify(previous);
    });
    const featuresChanged=JSON.stringify(riverFeatureOverrides)!==JSON.stringify(checkpoint.riverFeatures??emptyRiverFeatures());
    const waterChanged=checkpointWaterChanged(checkpoint);
    if(!changed.length&&!featuresChanged&&!waterChanged)return true;
    if(waterChanged)return window.confirm(language==='ru'?`Будет восстановлена вода и берег из контрольной точки. Также будут восстановлены её POI, названия, теги, заметки и счётчики. Изменённые реки: ${changed.map(r=>riverLabel(r.id)).join(', ')||'нет'}. Undo вернёт текущую карту точно. Продолжить?`:`The checkpoint water and shore will be restored together with its POI, names, tags, notes and counters. Changed rivers: ${changed.map(r=>riverLabel(r.id)).join(', ')||'none'}. Undo restores this current map exactly. Continue?`);
    return window.confirm(language==='ru'?`Будет восстановлено исходное состояние рек. Изменённые русла: ${changed.map(r=>riverLabel(r.id)).join(', ')||'нет'}. Ручные отметки: ${featuresChanged?'будут заменены':'сохранятся'}. Отмена вернёт карту точно. Продолжить?`:`Original river state will be restored. Changed routes: ${changed.map(r=>riverLabel(r.id)).join(', ')||'none'}. Manual markers: ${featuresChanged?'will be replaced':'retained'}. Undo restores this map exactly. Continue?`);
  };
  const checkPoiNameCheckpoint=(checkpoint:MapSnapshot)=>{try{retainPoiNames(checkpoint,editorNamesRef.current);
    const losses=knaveRef.current?knaveLosses(knaveRef.current,knaveMapContext(checkpoint)):[];
    if(losses.length&&!window.confirm(language==='ru'?`Контрольная точка удалит содержимое точек и данные проходимости/обнаружения Knave (${losses.length}). Отмена вернёт их.`:`The checkpoint removes Knave point content and terrain/discovery data (${losses.length}). Undo can restore it.`))return false;
    return true;}catch(error){setEditError(authoredNameError(error,language)??(language==='ru'?'Контрольная точка удалит авторское имя. Сначала очистите его явно.':'The checkpoint would remove an authored name. Clear it explicitly first.'));return false;}};
  const deleteLastRegion = () => {
    if (mutationBlocked() || history.length === 0) return;
    const checkpoint = history[history.length-1];
    if(!checkPoiNameCheckpoint(checkpoint)||!confirmRiverCheckpointLoss(checkpoint))return;
    const entities = getToponymEntities(checkpoint.regions, checkpoint.rivers, checkpoint.hexTerrainByKey);
    const retainedNames: ToponymRegistry = { ...(checkpoint.toponyms ?? {}) };
    for (const {key} of entities) if(toponyms[key]) retainedNames[key]=toponyms[key];
    const exactWater=checkpointWaterChanged(checkpoint);
    const retainedNotes = exactWater?checkpoint.gmNotesByHexKey:notesForSurvivingHexes(checkpoint);
    if (!confirmNotesRemoval(retainedNotes)) return;
    const map = exactWater?structuredClone(checkedRiverMap(checkpoint)):{ ...checkpoint,editorNames:retainPoiNames(checkpoint,editorNamesRef.current), tags:reconcileTags(tagsRef.current,checkpoint,captureMap(),generationRef.current.masterSeed,false), gmNotesByHexKey: retainedNotes, toponymSeed: checkpoint.toponymSeed ?? toponymSeed,
      toponyms: synchronizeToponyms(retainedNames,entities,checkpoint.toponymSeed ?? toponymSeed),
      roads: pruneRoadsToRegionHexes(cloneRoads(checkpoint.roads),checkpoint.regions) };
    const before = captureDocument();
    map.knave=retainedKnaveCheckpoint(map);
    const after = { ...before, map, generationHistory: history.slice(0,-1),
      selectedHex: checkpoint.regions.length ? checkpoint.regions[checkpoint.regions.length-1].centerHex : START_HEX };
    recordTransaction(before,after); applyDocument(after);
  };

  const regenerateLastRegion = () => {
    if (mutationBlocked()) return;
    if (regions.length === 0 || history.length === 0) return;
    if(!checkPoiNameCheckpoint(history[history.length-1])||!confirmRiverCheckpointLoss(history[history.length-1]))return;
    documentRevision.current++;
    const backup = captureGenerationBackup();
    const lastKingdom = kingdoms.find(k=>k.regionIds.includes(regions[regions.length-1].id));
    const lastAnchor = lastKingdom?.anchor ?? regions[regions.length - 1].anchorHex;
    const snapshot = history[history.length - 1];
    generationLog.begin();
    generationProgress.action = 'regenerate';
    generationProgress.stage = 'prepare_regeneration';
    let options: GenerationOptions = {};
    try {
      activeGenerationBefore.current = cloneGenerationState(backup.map.generation);
      // Mythic owns its size/biome controls. Hidden classic controls must not
      // consume RNG before startKingdom captures its regeneration checkpoint.
      options = lastKingdom
        ? { mode: 'mythic', previousToponyms: toponyms }
        : { ...buildGenerationOptions(), mode: 'classic', previousToponyms: toponyms };
      restoreSnapshot({...snapshot, generation: cloneGenerationState(generationRef.current)},checkpointWaterChanged(snapshot));
      setHistory(history.slice(0, -1));
      // Wait for React to apply the snapshot before the generation callback reads it.
      setPendingRegen({ backup, anchorHex: lastAnchor, options, actionContext: { action: 'regenerate', inputOptions: captureGenerationInputs() } });
    } catch (error) {
      reportGenerationFailure(error, lastAnchor, options, backup);
    }
  };

  const finishPendingRegeneration = () => {
    // Keep every consumed request inert, including a captured A callback after B.
    // Reject stale renders before starting a job, drawing RNG or using a backup.
    if (!pendingRegen || consumedRegenerations.current.has(pendingRegen)
      || documentRevision.current !== renderedDocumentRevision) return;
    consumedRegenerations.current.add(pendingRegen);
    if (pendingRegen.options.mode === 'mythic') startKingdom(pendingRegen.anchorHex, pendingRegen.backup, pendingRegen.actionContext);
    else safelyAddRegionToMap(pendingRegen.anchorHex, pendingRegen.options, pendingRegen.backup);
    setPendingRegen(null);
  };

  useEffect(() => {
    finishPendingRegeneration();
    // addRegionToMap намеренно не в зависимостях: эффект должен сработать
    // ровно один раз на установку заявки, уже с восстановленным состоянием.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRegen]);

  const selectedHexKey = selectedHex ? hexKey(selectedHex) : null;
  const canEditNotes = !!selectedHexKey && (hexTerrainByKey.has(selectedHexKey) || regions.some(r => r.hexes.some(h => hexKey(h) === selectedHexKey)));
  const notesValue = selectedHexKey ? gmNotesByHexKey[selectedHexKey] ?? '' : '';
  const notesOpen = notesEditorKey === selectedHexKey;
  const selectedMeta = selectedHexKey ? metadataMap.get(selectedHexKey) : undefined;
  const selectedTerrain = selectedHexKey ? hexTerrainByKey.get(selectedHexKey) : undefined;
  const selectedWaterPoiKind = selectedHexKey ? waterPoiByKey.get(selectedHexKey) : undefined;
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
  const nearbyRivers = selectedHex ? getRiversOnHexEdges(selectedHex, rivers) : [];
  const selectedHexEdgeKeys = selectedHex ? new Set(getHexEdgeKeys(selectedHex)) : new Set<string>();
  const selectedHexVertexKeys = selectedHex ? new Set(getHexCornerPoints(selectedHex).map((vertex) => vertex.key)) : new Set<string>();
  const waterfallLabel = language === 'ru' ? 'водопад' : 'waterfall';
  const waterfallRiverVertexKeys = useMemo(
    () => new Set(riverWaterfalls.map((waterfall) => waterfall.vertexKey)),
    [riverWaterfalls]
  );
  const selectedHexCrossings = selectedHexKey
    ? crossings.filter((crossing) => {
      const road = roads.find((item) => item.id === crossing.roadId);
      return road?.segments.some((segment) =>
        normalizeRoadSegmentKey(segment.from, segment.to) === crossing.roadSegmentKey
        && (hexKey(segment.from) === selectedHexKey || hexKey(segment.to) === selectedHexKey));
    })
    : [];
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
  const selectedKingdom = selectedRegion ? kingdoms.find(k=>k.regionIds.includes(selectedRegion.id)) : undefined;
  const selectedObstacles = selectedHex ? obstacles.filter(o=>hexKey(o.hex)===hexKey(selectedHex)||hexKey(o.neighborHex)===hexKey(selectedHex)) : [];
  const editableCentralKinds = generationMode === 'mythic' ? mythicPoiChoices(selectedRegion?.biomeLandType==='settled',true) : ['capital','city','town','village','lair','ruins','cursed_place','holy_place'];
  const editablePoiKinds: PoiKind[] = generationMode === 'mythic' ? mythicPoiChoices(selectedRegion?.biomeLandType==='settled',false) : EDITABLE_POI_KIND_ORDER.filter(k=>!(k in MYTHIC_POI)||k==='ruins');
  const selectedHexBiomeOverride = selectedHexKey ? biomeOverrideByHexKey.get(selectedHexKey) : undefined;
  const selectedEffectiveBiomeId = selectedHexBiomeOverride ?? selectedRegion?.biomeId;
  const isEditingSelectedHexBiome = selectedHexKey !== null && editingHexBiomeKey === selectedHexKey;
  const selectedPoiKind = selectedRegion && selectedHex ? getPoiKindForHex(selectedRegion, selectedHex) : undefined;
  const isEditingSelectedPoi = selectedHexKey !== null && editingPoiHexKey === selectedHexKey;
  // Geometry remains protected by E7 even when a legacy region has no central POI.
  const selectedHasCentralPoi = Boolean(selectedMeta?.isCenter && selectedRegion && hasCentralPoi(selectedRegion));
  const isEditingSelectedCentralPoi = selectedHasCentralPoi && editingCentralPoiRegionId === selectedRegion?.id;
  const canEditSelectedPoi = Boolean(selectedRegion && selectedHex && !isSelectedLake && !isSelectedSea);
  const waterPoiKindOrder = generationMode === 'mythic' ? [] : getWaterPoiKindPool(isSelectedSea ? 'sea' : selectedRegion?.biomeLandType ?? 'wild');
  const setSelectedHexBiomeOverride = (biomeId: BiomeId) => {
    if(mutationBlocked() || !selectedHexKey || notesSelectionRef.current !== selectedHexKey || !selectedRegion || isSelectedLake || isSelectedSea || !(biomeId in BIOMES)) return;
    if(biomeOverrideByHexKey.get(selectedHexKey)===biomeId) { closeEditors(); return; }
    const layer=new Map(biomeOverrideByHexKey); layer.set(selectedHexKey,biomeId);
    commitManualMap({...captureMap(), biomeOverrideByHexKey:layer}, false);
  };
  const resetSelectedHexBiomeOverride = () => {
    if(mutationBlocked() || !selectedHexKey || notesSelectionRef.current !== selectedHexKey) return;
    if(!biomeOverrideByHexKey.has(selectedHexKey)) { closeEditors(); return; }
    const layer=new Map(biomeOverrideByHexKey); layer.delete(selectedHexKey);
    commitManualMap({...captureMap(), biomeOverrideByHexKey:layer}, false);
  };
  const setSelectedPoiKind = (poiKind: PoiKind) => {
    if(mutationBlocked() || notesSelectionRef.current !== selectedHexKey || !editablePoiKinds.includes(poiKind) || !canEditSelectedPoi || selectedHasCentralPoi || !selectedRegion || !selectedHex || !selectedHexKey) return;
    const hasPoi=selectedRegion.pointsOfInterest.some(h=>hexKey(h)===selectedHexKey);
    if(hasPoi && selectedRegion.pointOfInterestKinds?.[selectedHexKey]===poiKind) { closeEditors(); return; }
    commitManualMap({...captureMap(), regions:regions.map(r=>r.id!==selectedRegion.id?r:{...r,
      pointsOfInterest:hasPoi?r.pointsOfInterest:[...r.pointsOfInterest,selectedHex],
      pointOfInterestKinds:{...r.pointOfInterestKinds,[selectedHexKey]:poiKind}})});
  };
  const setSelectedCentralPoiKind = (poiKind: CentralPoiKind) => {
    if(mutationBlocked() || notesSelectionRef.current !== selectedHexKey || !editableCentralKinds.includes(poiKind as MythicPoi) || !selectedRegion || !selectedHasCentralPoi) return;
    if(selectedRegion.centralPoiKind===poiKind) { closeEditors(); return; }
    commitManualMap({...captureMap(),regions:regions.map(r=>r.id===selectedRegion.id?{...r,centralPoiKind:poiKind}:r)});
  };
  const setSelectedWaterPoiKind = (poiKind: WaterPoiKind) => {
    if(mutationBlocked() || notesSelectionRef.current !== selectedHexKey || !(poiKind in WATER_POI_DETAILS) || !selectedHexKey || (!isSelectedLake && !isSelectedSea)) return;
    if(waterPoiByKey.get(selectedHexKey)===poiKind) { closeEditors(); return; }
    const layer=new Map(waterPoiByKey); layer.set(selectedHexKey,poiKind);
    commitManualMap({...captureMap(),waterPoiByKey:layer});
  };
  const deleteSelectedWaterPoi = () => {
    if(mutationBlocked() || !selectedHexKey || notesSelectionRef.current !== selectedHexKey) return;
    if(!waterPoiByKey.has(selectedHexKey)) { closeEditors(); return; }
    const layer=new Map(waterPoiByKey); layer.delete(selectedHexKey);
    commitManualMap({...captureMap(),waterPoiByKey:layer});
  };
  const deleteSelectedPoi = () => {
    if(mutationBlocked() || notesSelectionRef.current !== selectedHexKey || !selectedRegion || !selectedHexKey) return;
    if(!selectedRegion.pointsOfInterest.some(h=>hexKey(h)===selectedHexKey)) { closeEditors(); return; }
    const kinds={...selectedRegion.pointOfInterestKinds}; delete kinds[selectedHexKey];
    commitManualMap({...captureMap(),regions:regions.map(r=>r.id!==selectedRegion.id?r:{...r,
      pointsOfInterest:r.pointsOfInterest.filter(h=>hexKey(h)!==selectedHexKey),
      pointOfInterestKinds:Object.keys(kinds).length?kinds:undefined})});
  };
  const regionBiomeReason = (region: Region, biomeId: BiomeId): string | null => {
    const biome = BIOMES[biomeId];
    if (!biome || biome.heightLevel !== region.heightLevel)
      return language === 'ru' ? 'Другая высота' : 'Different height';
    const neighbors = new Set(region.hexes.flatMap(h => getHexNeighbors(h).map(hexKey)));
    if (regions.some(r => r.id !== region.id && r.hexes.some(h => neighbors.has(hexKey(h))) && biomeId !== r.biomeId && !isBiomesCompatible(biomeId, r.biomeId, BIOME_COMPATIBILITY_MATRIX)))
      return language === 'ru' ? 'Несовместимо с соседним регионом' : 'Incompatible with a neighboring region';
    return null;
  };
  const setSelectedRegionBiome = (biomeId: BiomeId) => {
    if (mutationBlocked() || !selectedRegion || notesSelectionRef.current !== selectedHexKey) return;
    // An unchanged legacy value remains a no-op even if its neighbors are incompatible.
    if (selectedRegion.biomeId === biomeId) { closeEditors(); return; }
    const reason = regionBiomeReason(selectedRegion, biomeId);
    if (reason) { setEditError(reason); return; }
    const biome = BIOMES[biomeId];
    commitManualMap({...captureMap(), regions: regions.map(r => r.id !== selectedRegion.id ? r : {...r,
      biomeId, biomeLabel: biome.label, biomePrimaryEmoji: biome.primaryEmoji,
      biomeSecondaryEmojis: [...biome.secondaryEmojis], biomeEmojiLabel: biome.primaryEmoji + biome.secondaryEmojis.join('')})}, false);
  };
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
  const [isMapRotated, setIsMapRotated] = useState(false);
  const [biomeDisplayMode, setBiomeDisplayMode] = useState<'tiles' | 'emoji' | 'color'>('tiles');
  const useBiomeTiles = biomeDisplayMode === 'tiles';
  const useBiomeColor = biomeDisplayMode === 'color';
  const renderDetails = !kingdomJob && detailedRenderReady;
  const renderBiomeColor = useBiomeColor && renderDetails;
  const colorModeLabel = language === 'ru' ? 'Цвет' : 'Color';
  const biomeModeLabel = useBiomeTiles ? t.tilesMode : useBiomeColor ? colorModeLabel : t.emojiMode;
  const [usePoiSvg, setUsePoiSvg] = useState(true);
  const [showHexCoordinates, setShowHexCoordinates] = useState(false);
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
  const biomeDisplayToggleLabel = `${t.hexesDisplay}: ${biomeModeLabel}`;
  const biomeDisplayToggleTitle = useBiomeTiles ? t.showEmojiTitle : useBiomeColor ? t.showTilesTitle : (language === 'ru' ? 'Показывать гексы цветом' : 'Show hexes as colors');
  const colorLandHexes = useMemo(() => {
    if (!renderBiomeColor) return [];
    const regionBiomes = new Map(regions.map(region => [region.id, region.biomeId]));
    return positionedHexes.hexes
      .filter(hex => hex.kind === 'region')
      .map(hex => ({
        key: hex.key,
        points: hexPoints(hex.x, hex.y, HEX_SIZE),
        color: GROUND_COLORS[biomeOverrideByHexKey.get(hex.key) ?? regionBiomes.get(hex.regionId ?? -1) ?? FALLBACK_BIOME_ID]
      }));
  }, [renderBiomeColor, positionedHexes, regions, hexTerrainByKey, biomeOverrideByHexKey]);
  const lakeCells = useMemo(() => positionedHexes.hexes.filter(hex => hexTerrainByKey.get(hex.key)?.terrainOverride === 'lake').map(hex=>({...hex,lakeId:hexTerrainByKey.get(hex.key)?.lakeId})), [positionedHexes, hexTerrainByKey]);
  const forestCells = useMemo(() => {
    if (!renderBiomeColor) return [];
    const biomes = new Map(regions.map(region => [region.id, region.biomeId]));
    const candidates = new Set(positionedHexes.hexes.filter(hex=>hex.kind==='candidate').map(hex=>hex.key));
    const openLand = new Set(positionedHexes.hexes.filter(hex=>hex.kind==='region'&&!hexTerrainByKey.get(hex.key)?.terrainOverride&&!forestFamily(biomeOverrideByHexKey.get(hex.key)??biomes.get(hex.regionId??-1)??FALLBACK_BIOME_ID)).map(hex=>hex.key));
    const styles = new Map(regions.filter(r=>r.biomeId.includes('woodland')).map(r=>[r.id,chooseWoodlandStyle(r,regions.slice(0,regions.indexOf(r)),biomeOverrideByHexKey)]));
    return positionedHexes.hexes.filter(hex => hex.kind === 'region' && hexTerrainByKey.get(hex.key)?.terrainOverride !== 'sea')
      .map(hex => ({...hex, lake:hexTerrainByKey.get(hex.key)?.terrainOverride==='lake', openSides:[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].flatMap(([q,r],side)=>openLand.has(`${hex.q+q},${hex.r+r}`)?[side]:[]), straightSides:[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].flatMap(([q,r],side)=>candidates.has(`${hex.q+q},${hex.r+r}`)?[side]:[]), woodlandStyle:styles.get(hex.regionId ?? -1), biome: biomeOverrideByHexKey.get(hex.key) ?? biomes.get(hex.regionId ?? -1) ?? FALLBACK_BIOME_ID}))
      .filter(hex => forestFamily(hex.biome));
  }, [renderBiomeColor, positionedHexes, regions, hexTerrainByKey, biomeOverrideByHexKey]);
  const lakeGeometryCache = useRef(createLakeGeometryCache());
  const lakeShapes = useMemo(()=>renderBiomeColor ? buildNaturalLakes(lakeCells,HEX_SIZE,toponymSeed,riverSegments,lakeGeometryCache.current) : [],[renderBiomeColor,lakeCells,toponymSeed,riverSegments]);
  const poiDisplayToggleLabel = `${t.pointsDisplay}: ${usePoiSvg ? t.iconsMode : t.emojiMode}`;
  const poiDisplayToggleTitle = usePoiSvg ? t.showPoiEmojiTitle : t.showPoiIconsTitle;

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

  const beginMapNavigation = () => {
    mapViewportRef.current?.classList.add('is-navigating');
    if (mapNavigationIdleRef.current !== null) clearTimeout(mapNavigationIdleRef.current);
    mapNavigationIdleRef.current = window.setTimeout(() => {
      mapNavigationIdleRef.current = null;
      // Release the cached raster so vectors regain full sharpness at the new scale.
      mapViewportRef.current?.classList.remove('is-navigating');
    }, 180);
  };

  // Navigation changes only the composited SVG layer, never React map state.
  const applyMapScale = (scale: number) => {
    const nextScale = clampMapScale(scale);
    mapScaleRef.current = nextScale;
    const svg = mapSvgRef.current;
    const stage = mapStageRef.current;
    if (svg && stage) {
      stage.style.width = `${svg.viewBox.baseVal.width * nextScale}px`;
      stage.style.height = `${svg.viewBox.baseVal.height * nextScale}px`;
      svg.style.transform = `translateZ(0) scale(${nextScale})`;
      svg.style.setProperty("--road-hit-width", `${44 / nextScale}px`);
      svg.style.setProperty("--crossing-hit-radius", `${22 / nextScale}px`);
    }
    const overlay = selectedHexOverlayRef.current;
    if (overlay) {
      overlay.style.transform = `translateZ(0) scale(${nextScale})`;
      const outline = overlay.querySelector<SVGPolygonElement>('[data-selected-hex]');
      if (outline) {
        outline.setAttribute('stroke-width', `${2 / nextScale}`);
        outline.style.filter = `drop-shadow(0 0 ${1 / nextScale}px #0c1423)`;
      }
    }
    const waterOverlay=waterDraftOverlayRef.current;
    if(waterOverlay){waterOverlay.style.transform=`translateZ(0) scale(${nextScale})`;waterOverlay.querySelectorAll('[data-water-draft-cell],[data-region-draft-cell],[data-region-target-contour]').forEach(node=>node.setAttribute('stroke-width',`${2/nextScale}`));waterOverlay.querySelectorAll('[data-region-map-target]').forEach(node=>node.setAttribute('r',`${22/nextScale}`));}
    return nextScale;
  };

  const updateMapScale = (scale: number) => {
    if (mapZoomFrameRef.current !== null) cancelAnimationFrame(mapZoomFrameRef.current);
    mapZoomFrameRef.current = null;
    pendingMapZoomRef.current = null;
    applyMapScale(scale);
  };

  const zoomMapAtPoint = (scale: number, clientX?: number, clientY?: number) => {
    if (importInFlight.current) return;
    beginMapNavigation();
    pendingMapZoomRef.current = { scale: clampMapScale(scale), clientX, clientY };
    if (mapZoomFrameRef.current !== null) return;
    mapZoomFrameRef.current = requestAnimationFrame(() => {
      mapZoomFrameRef.current = null;
      const pending = pendingMapZoomRef.current;
      pendingMapZoomRef.current = null;
      const viewport = mapViewportRef.current;
      const svg = mapSvgRef.current;
      if (!pending || !viewport || !svg) return;
      const previousScale = mapScaleRef.current;
      if (pending.scale === previousScale) return;
      const viewportRect = viewport.getBoundingClientRect();
      const focalX = pending.clientX ?? viewportRect.left + viewport.clientWidth / 2;
      const focalY = pending.clientY ?? viewportRect.top + viewport.clientHeight / 2;
      const before = svg.getBoundingClientRect();
      const mapX = (focalX - before.left) / previousScale;
      const mapY = (focalY - before.top) / previousScale;
      applyMapScale(pending.scale);
      const after = svg.getBoundingClientRect();
      viewport.scrollLeft += after.left + mapX * pending.scale - focalX;
      viewport.scrollTop += after.top + mapY * pending.scale - focalY;
    });
  };

  const panMapTo = (left: number, top: number) => {
    pendingMapPanRef.current = { left, top };
    if (mapPanFrameRef.current !== null) return;
    mapPanFrameRef.current = requestAnimationFrame(() => {
      mapPanFrameRef.current = null;
      const pending = pendingMapPanRef.current;
      pendingMapPanRef.current = null;
      if (pending && mapViewportRef.current) {
        mapViewportRef.current.scrollLeft = pending.left;
        mapViewportRef.current.scrollTop = pending.top;
      }
    });
  };

  const getTouchDistance = (touches: TouchList) => {
    const [first, second] = [touches.item(0), touches.item(1)];
    if (!first || !second) return 0;
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const getTouchCenter = (touches: TouchList) => {
    const [first, second] = [touches.item(0), touches.item(1)];
    if (!first || !second) return null;
    return {
      x: (first.clientX + second.clientX) / 2,
      y: (first.clientY + second.clientY) / 2
    };
  };

  const handleMapWheel = (event: Pick<WheelEvent<HTMLDivElement>, 'preventDefault' | 'deltaY' | 'deltaMode' | 'clientX' | 'clientY'>) => {
    event.preventDefault();
    if (!finishMapNameRef.current()) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? (mapViewportRef.current?.clientHeight ?? 800) : 1);
    const zoomFactor = Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY);
    zoomMapAtPoint((pendingMapZoomRef.current?.scale ?? mapScaleRef.current) * zoomFactor, event.clientX, event.clientY);
  };


  const handleMapMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return;
    if (!finishMapNameRef.current()) { event.preventDefault(); return; }

    const viewport = mapViewportRef.current;
    if (!viewport) return;

    beginMapNavigation();
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

    panMapTo(drag.scrollLeft - (event.clientX - drag.startX), drag.scrollTop - (event.clientY - drag.startY));
    event.preventDefault();
  };

  const handleMapMouseUp = () => {
    mapDragRef.current = null;
    mapViewportRef.current?.classList.remove('is-dragging');
  };

  const handleMapKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && !finishMapNameRef.current()) {
      event.preventDefault(); return;
    }

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

  const handleMapTouchStart = (event: Pick<TouchEvent, 'touches'>) => {
    if (event.touches.length !== 2) {
      pinchZoomRef.current = null;
      return;
    }

    pinchZoomRef.current = {
      distance: getTouchDistance(event.touches),
      scale: mapScaleRef.current
    };
  };

  const handleMapTouchMove = (event: Pick<TouchEvent, 'touches' | 'preventDefault'>) => {
    if (!finishMapNameRef.current()) { event.preventDefault(); return; }
    if (event.touches.length !== 2 || !pinchZoomRef.current) return;
    event.preventDefault();

    const distance = getTouchDistance(event.touches);
    const center = getTouchCenter(event.touches);
    if (distance <= 0 || !center) return;

    zoomMapAtPoint(pinchZoomRef.current.scale * (distance / pinchZoomRef.current.distance), center.x, center.y);
  };

  const handleMapTouchEnd = (event: Pick<TouchEvent, 'touches'>) => {
    if (event.touches.length < 2) pinchZoomRef.current = null;
  };

  useEffect(() => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    // React delegates wheel/touch as passive listeners; cancellation must be native.
    viewport.addEventListener('scroll', beginMapNavigation, { passive: true });
    viewport.addEventListener('wheel', handleMapWheel, { passive: false });
    viewport.addEventListener('touchstart', handleMapTouchStart, { passive: true });
    viewport.addEventListener('touchmove', handleMapTouchMove, { passive: false });
    viewport.addEventListener('touchend', handleMapTouchEnd);
    viewport.addEventListener('touchcancel', handleMapTouchEnd);
    return () => {
      viewport.removeEventListener('scroll', beginMapNavigation);
      viewport.removeEventListener('wheel', handleMapWheel);
      viewport.removeEventListener('touchstart', handleMapTouchStart);
      viewport.removeEventListener('touchmove', handleMapTouchMove);
      viewport.removeEventListener('touchend', handleMapTouchEnd);
      viewport.removeEventListener('touchcancel', handleMapTouchEnd);
      if (mapZoomFrameRef.current !== null) cancelAnimationFrame(mapZoomFrameRef.current);
      if (mapPanFrameRef.current !== null) cancelAnimationFrame(mapPanFrameRef.current);
      if (mapNavigationIdleRef.current !== null) clearTimeout(mapNavigationIdleRef.current);
    };
  }, []);

  const createSaveData = (doc=captureDocument()): HexcrawlSaveData => ({
    schema: HEXCRAWL_SAVE_SCHEMA,
    generation: cloneGenerationState(doc.map.generation),
    version: HEXCRAWL_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    map: {
      ...(doc.map.knave===undefined?{}:{knave:structuredClone(doc.map.knave)}),
      seas:structuredClone(doc.map.seas).sort((a,b)=>a.id-b.id).map(sea=>({...sea,hexKeys:sea.hexKeys.sort(compareWaterHexes)})),
      nextSeaId:doc.map.nextSeaId,
      editorNames:structuredClone(doc.map.editorNames??{}),
      riverFeatures:structuredClone(doc.map.riverFeatures),
      tags:structuredClone(doc.map.tags??emptyTags()),
      gmNotesByHexKey: {...doc.map.gmNotesByHexKey},
      kingdoms:doc.map.kingdoms, obstacles:doc.map.obstacles,
      regions:doc.map.regions,
      candidateHexes:doc.map.candidateHexes,
      rivers:doc.map.rivers,
      roads:doc.map.roads,
      crossings:doc.map.crossings,
      terrainByHexKey: Object.fromEntries(doc.map.hexTerrainByKey.entries()),
      waterPoiByHexKey: Object.fromEntries(doc.map.waterPoiByKey.entries()),
      biomeOverrideByHexKey: Object.fromEntries(doc.map.biomeOverrideByHexKey.entries()),
      toponyms: { seed: doc.map.toponymSeed, model: DEFAULT_TOPONYM_MODEL, names: doc.map.toponyms }
    },
    counters: {
      nextLakeId:doc.map.nextLakeId,
      nextRoadId:doc.map.nextRoadId, nextObstacleId:doc.map.nextObstacleId, nextRiverId:doc.map.nextRiverId
    },
    ui: {
      generationMode:doc.generationMode,
      selectedHex:doc.selectedHex,
      isMapRotated:doc.isMapRotated,
      mapScale:doc.mapScale
    }
  });

  const handleExportPng = async () => {
    updateObstacleDraft(null); setSelectedObstacleId(null);
    if(roadDraftRef.current&&!roadFeatureResolutionRef.current) {if(finishRoadDraft())pendingRoadExport.current='png';return;}
    if (documentBusy() || !renderDetails) return;
    finishNotesGroup();
    if (!mapSvgRef.current) return;
    try {
      await exportSvgToPng(mapSvgRef.current, `${EXPORT_FILE_PREFIX}-${getTimestampForFilename()}.png`);
      trackGoal('export_png');
    } catch (error) {
      console.error('PNG export failed', error);
      window.alert(error instanceof Error ? error.message : t.pngExportError);
    }
  };

  const pendingNameExport = useRef(false);
  const handleExportJson = () => {
    updateObstacleDraft(null); setSelectedObstacleId(null);
    if(roadDraftRef.current&&!roadFeatureResolutionRef.current) {if(finishRoadDraft())pendingRoadExport.current='json';return;}
    if (nameDraftRef.current) {
      const revision = documentRevision.current;
      if (!finishInlineName()) return;
      if (revision !== documentRevision.current) { pendingNameExport.current = true; return; }
    }
    if(documentBusy())return;
    finishNotesGroup();
    const saveData = createSaveData();
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${EXPORT_FILE_PREFIX}-${getTimestampForFilename()}.json`);
    trackGoal('export_json');
  };

  useEffect(() => { if (pendingNameExport.current && !documentBusy()) { pendingNameExport.current = false; handleExportJson(); } }, [renderedDocumentRevision]);

  useEffect(()=>{const kind=pendingRoadExport.current;if(kind&&!documentBusy()){pendingRoadExport.current=null;if(kind==='png')void handleExportPng();else handleExportJson();}},[renderedDocumentRevision]);
  const handleImportJsonClick = () => {
    updateObstacleDraft(null); setSelectedObstacleId(null);
    if(mutationBlocked()) return;
    jsonImportInputRef.current?.click();
  };
  const handleImportJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0]; event.target.value='';
    if(!file || mutationBlocked()) return;
    importInFlight.current=true; setIsImporting(true);
    let stage='read';
    try {
      const text=await readTextFile(file); stage='json';
      const parsed:unknown=JSON.parse(text); stage='validation'; assertHexcrawlSaveData(parsed);
      stage='preparation';
      const imported=structuredClone(parsed);
      const terrain=new Map(Object.entries(imported.map.terrainByHexKey));
      const hexes=imported.map.regions.flatMap(r=>r.hexes);
      const frontier=hexes.length?getCandidateHexes(hexes,getSeaHexKeys(terrain)):[];
      const frontierKeys=new Set(frontier.map(hexKey)),savedCandidates=imported.map.candidateHexes??[];
      // Preserve an accepted v7 traversal order only for the exact unique
      // geometric frontier. Legacy/duplicate/mismatching input still normalizes.
      const savedKeys=savedCandidates.map(hexKey);
      const candidates=imported.version>=7&&savedKeys.length===frontier.length&&new Set(savedKeys).size===savedKeys.length&&savedKeys.every(k=>frontierKeys.has(k))?savedCandidates:frontier;
      const seed=imported.map.toponyms?.seed ?? legacyToponymSeed(imported.map.regions);
      const retainedNames=imported.map.toponyms?.names ?? {};
      const names={...synchronizeToponyms(retainedNames,getToponymEntities(imported.map.regions,imported.map.rivers,terrain),seed),...retainedNames};
      const validSelection=new Set([...hexes.map(hexKey),...candidates.map(hexKey),...terrain.keys()]);
      const obstacleData=imported.version>=5
        ? {obstacles:(imported.map.obstacles ?? []) as EditableObstacle[],nextObstacleId:normalizeObstacleCounter((imported.map.obstacles ?? []) as EditableObstacle[],imported.counters.nextObstacleId!)}
        : migrateLegacyObstacles(imported.map.obstacles as Obstacle[] | undefined);
      const riverData=imported.version>=7
        ? {riverFeatures:structuredClone(imported.map.riverFeatures!),nextRiverId:imported.counters.nextRiverId!}
        : migrateRiverEditing(imported.map.rivers);
      const seaData=imported.version>=9?{seas:imported.map.seas!,nextSeaId:imported.map.nextSeaId!}:migrateSeas(terrain);
      const selection=imported.ui.selectedHex;
      const before=captureDocument();
      const after:DocumentSnapshot={
        map:{knave:imported.map.knave,...riverData,...seaData,editorNames:imported.version>=8?structuredClone(imported.map.editorNames??{}):{},tags: imported.map.tags??emptyTags(),gmNotesByHexKey: Object.fromEntries(Object.entries(imported.map.gmNotesByHexKey ?? {}).filter(([,text]) => text !== '')), generation: imported.generation ?? createGenerationState(seed >>> 0), kingdoms:imported.map.kingdoms ?? [],...obstacleData,regions:imported.map.regions,
          candidateHexes:candidates,rivers:imported.map.rivers,roads:imported.map.roads,crossings:imported.map.crossings,
          hexTerrainByKey:terrain,waterPoiByKey:new Map(Object.entries(imported.map.waterPoiByHexKey ?? {})),
          biomeOverrideByHexKey:new Map(Object.entries(imported.map.biomeOverrideByHexKey ?? {})),toponyms:names,toponymSeed:seed,
          nextLakeId:Math.max(imported.counters.nextLakeId,Math.max(0,...Array.from(terrain.values(),t=>t.lakeId??0))+1),
          nextRoadId:Math.max(imported.counters.nextRoadId,Math.max(0,...imported.map.roads.map(r=>r.id))+1)},
        generationHistory:[],generationMode:imported.ui.generationMode ?? 'classic',
        selectedHex:!hexes.length&&!terrain.size?START_HEX:selection&&validSelection.has(hexKey(selection))?selection:null,
        isMapRotated:imported.ui.isMapRotated,mapScale:clamp(imported.ui.mapScale,MIN_MAP_SCALE,MAX_MAP_SCALE)
      };
      // Everything that can fail (including deep copies) is prepared before the first setter.
      const prepared=copyDocument(after), transaction={before:copyDocument(before),after:copyDocument(after)};
      setUndoHistory(current=>[...current,transaction].slice(-100)); setRedoHistory([]);
      applyPreparedDocument(prepared); setEditMode(false); setLegacyNotice(!imported.generation); setGenerationError(null); trackGoal('import_json');
    } catch(error) {
      console.error('JSON import failed', {stage, path: error instanceof SaveValidationError ? error.path : '$'});
      const path=error instanceof SaveValidationError?error.path:'$';
      const category=language==='ru'
        ? ({read:'ошибка чтения файла',json:'ошибка синтаксиса JSON',validation:'некорректные данные',preparation:'ошибка подготовки карты'}[stage])
        : ({read:'file read error',json:'invalid JSON syntax',validation:'invalid map data',preparation:'map preparation error'}[stage]);
      const reason=error instanceof SaveValidationError
        ? language==='ru'&&error.reason==='two distinct adjacent hexes'?'нужны два разных соседних гекса':error.reason
        :category;
      window.alert(language==='ru'?`Не удалось загрузить JSON: ${category} (${path}: ${reason}). Текущая карта сохранена.`
        :`Failed to load JSON: ${category} (${path}: ${reason}). Your current map is intact.`);
    } finally { importInFlight.current=false; setIsImporting(false); }
  };

  const poiPolicy=()=>({mode:generationMode,landKinds:(region:Pick<Region,'biomeLandType'>)=>generationMode==='mythic'?mythicPoiChoices(region.biomeLandType==='settled',false):EDITABLE_POI_KIND_ORDER.filter(k=>!(k in MYTHIC_POI)||k==='ruins'),waterKinds:getWaterPoiKindPool,inKingdomArea:(id:number,h:AxialHex)=>{const kingdom=kingdoms.find(k=>k.id===id);return !!kingdom&&kingdomKeys(kingdom.origin).has(hexKey(h));}});
  const currentPoiDraft=(draft:PoiDraft|null):draft is PoiDraft=>!!draft&&poiDraftRef.current===draft&&draft.revision===documentRevision.current&&draft.token===poiDocumentToken.current&&!documentBusy();
  const poiCommandError=(error:unknown)=>{
    const code=(error as {code?:string})?.code,ru=language==='ru';
    const texts:Record<string,[string,string]>={central_poi:['Центральная точка связана с центром региона. Измените её тип или имя на месте.','The central point is bound to the region center. Edit its type or name in place.'],ambiguous_poi:['На этом гексе несколько объектов; перенос неоднозначен.','Several objects share this hex; the move is ambiguous.'],occupied_poi_target:['Гекс уже занят точкой интереса.','This hex already has a point of interest.'],poi_environment_mismatch:['Наземную точку нельзя переносить в воду, а водную — на сушу.','Land and water points need matching terrain.'],unknown_poi_target:['Выберите существующий гекс карты.','Choose an existing map hex.'],poi_kind_mismatch:['Тип точки несовместим с назначением.','The point type is incompatible with its destination.'],poi_kingdom_mismatch:['Перенос между королевствами здесь недоступен.','Moving between kingdoms is unavailable here.'],poi_myth_area:['Миф должен оставаться в дикой местности внутри области королевства.','A Myth must stay in a wild region inside its kingdom area.'],poi_myth_duplicate:['В целевом регионе уже есть Миф.','The destination region already has a Myth.'],water_poi_in_mythic:['Водные точки можно переносить в режиме Classic.','Move water points in Classic mode.'],poi_path_dependency:['С исходным гексом связан путь. Отмените перенос и измените путь явно.','A path touches the source hex. Discard this move and edit the path explicitly.'],poi_identity_conflict:['В назначении есть данные другой точки; перезапись запрещена.','Other point data exists at the destination;overwriting is blocked.'],coordinate:['Нужны канонические целые координаты q/r.','Enter canonical integer q/r coordinates.'],stale_poi_move:['Карта изменилась. Выберите точку заново.','The map changed. Select the point again.']};
    const details=(error as {details?:string[]})?.details??[];
    return (code&&texts[code]?texts[code][ru?0:1]:(ru?'Перенос недоступен.':'Move unavailable.'))+(details.length?` (${details.slice(0,6).join('; ')})`:'');
  };
  const resetPoiDraft=(expected=poiDraft)=>{if(poiDraftRef.current!==expected)return false;updatePoiDraft(null);setEditError(null);setTimeout(()=>infoFocusRef.current?.focus(),0);return true;};
  const startPoiDraft=(source:PoiLocator)=>{
    if(!editMode||mutationBlocked()||notesComposingRef.current||obstacleDraftRef.current||!finishInlineName()||source.hexKey!==selectedHexKey)return false;
    try{const original={...captureMap(),tags:tagsRef.current};preparePoiMove(original,{source,targetKey:source.hexKey},poiPolicy());}
    catch(error){setEditError(poiCommandError(error));return false;}
    finishNotesGroup();clearNotesDraft();closeEditors();updatePoiDraft({id:++poiDraftSerial.current,revision:documentRevision.current,token:poiDocumentToken.current,source,q:'',r:'',ambiguous:[]});return true;
  };
  const changePoiTarget=(q:string,r:string,expected=poiDraft)=>{if(!currentPoiDraft(expected))return false;updatePoiDraft({...expected,q,r,ambiguous:[]});setEditError(null);return true;};
  const preparePoiDraft=(draft:PoiDraft)=>{
    if(!currentPoiDraft(draft))throw new PoiMoveError('stale_poi_move');
    if(draft.q===''||draft.r===''||draft.ambiguous.length)throw new PoiMoveError('unknown_poi_target');
    const original={...captureMap(),tags:tagsRef.current},map=preparePoiMove(original,{source:draft.source,targetKey:`${draft.q},${draft.r}`},poiPolicy());
    if(original.knave&&map!==original){const from=poiLocatorKey(draft.source),to=draft.source.kind==='water'?`waterPoi:${draft.q},${draft.r}`:`poi:${map.regions.find(r=>r.hexes.some(h=>hexKey(h)===`${draft.q},${draft.r}`))!.id}:${draft.q},${draft.r}`;map.knave=remapKnavePois(original.knave,knaveMapContext(original),knaveMapContext(map),new Map([[from,to]]));}
    return {original,map};
  };
  const finishPoiDraft=(expected=poiDraft):boolean=>{
    const draft=poiDraftRef.current;if(!draft)return !expected;
    if(draft!==expected||!currentPoiDraft(draft)||notesComposingRef.current||dirtyNameDraft())return false;
    try{const {original,map}=preparePoiDraft(draft);if(map===original){resetPoiDraft(draft);return true;}
      const before=copyDocument(captureDocument()),after=copyDocument({...captureDocument(),map,selectedHex:{q:Number(draft.q),r:Number(draft.r)}});
      assertHexcrawlSaveData(createSaveData(after));recordTransaction(before,after);applyPreparedDocument(after);return true;
    }catch(error){setEditError(poiCommandError(error));return false;}
  };
  const poiPreview=(()=>{if(!poiDraft)return null;try{return {plan:preparePoiDraft(poiDraft),error:null,code:null};}catch(error){return {plan:null,error:poiCommandError(error),code:(error as {code?:string}).code};}})();
  const requestPoiExit=(action:()=>void)=>{const draft=poiDraftRef.current;if(!draft)return;setPoiExitRequest({draft,action});};
  const resolvePoiExit=(choice:'finish'|'discard'|'stay')=>{
    const request=poiExitRequest;if(!request)return false;
    if(choice==='stay'){setPoiExitRequest(null);return true;}
    if(!currentPoiDraft(request.draft)){setPoiExitRequest(null);return false;}
    if(choice==='finish'){if(!finishPoiDraft(request.draft))return false;}else resetPoiDraft(request.draft);
    setPoiExitRequest(null);setTimeout(()=>request.action(),0);return true;
  };
  const currentKnaveDraft=(draft:KnaveDraft|null):draft is KnaveDraft=>!!draft&&knaveDraftRef.current===draft&&draft.revision===documentRevision.current&&draft.token===poiDocumentToken.current&&draft.hexKey===notesSelectionRef.current&&!documentBusy();
  const changeKnaveDraft=(patch:Partial<Pick<KnaveDraft,'difficulty'|'mode'|'clueText'>>,expected=knaveDraft)=>{
    if(!editMode||!knaveRef.current||generationMode!=='classic'||!selectedHexKey)return false;
    if(expected?!currentKnaveDraft(expected):mutationBlocked()||notesComposingRef.current||obstacleDraftRef.current||!finishInlineName())return false;
    const context=knaveMapContext(captureMap());if(!context.hexes.has(selectedHexKey))return false;
    const key=selectedPoiSource?poiLocatorKey(selectedPoiSource):null;
    if(patch.difficulty!==undefined&&!context.dryHexes.has(selectedHexKey)||('mode'in patch||'clueText'in patch)&&!key)return false;
    const previous=key?knaveRef.current.discoveryByPoi[key]:undefined;
    const draft=expected??{id:++knaveDraftSerial.current,revision:documentRevision.current,token:poiDocumentToken.current,hexKey:selectedHexKey,poiKey:key,difficulty:knaveRef.current.difficultyByHex[selectedHexKey]??'unspecified',mode:previous?.mode??'passage',clueText:previous?.clueText??''};
    finishNotesGroup();clearNotesDraft();updateKnaveDraft({...draft,...patch});return true;
  };
  const resetKnaveDraft=(expected=knaveDraftRef.current)=>{if(knaveDraftRef.current!==expected)return false;updateKnaveDraft(null);return true;};
  const finishKnaveDraft=(expected=knaveDraftRef.current)=>{
    if(!expected)return true;
    if(!currentKnaveDraft(expected)||knaveComposing.current||!knaveRef.current)return false;
    try{
      const original=knaveRef.current,context=knaveMapContext(captureMap());
      let next=context.dryHexes.has(expected.hexKey)?setKnaveDifficulty(original,context,expected.hexKey,expected.difficulty):original;
      if(expected.poiKey)next=setKnaveDiscovery(next,context,expected.poiKey,expected.mode,expected.clueText);
      if(next===original){resetKnaveDraft(expected);return true;}
      return commitManualMap({...captureMap(),knave:next},false);
    }catch{setKnaveError(language==='ru'?'Для секрета нужна улика: от 1 до 512 символов.':'A secret needs a clue of 1–512 characters.');return false;}
  };
  const requestKnaveExit=(action:()=>void)=>{const draft=knaveDraftRef.current;if(draft)setKnaveExitRequest({draft,action});};
  const resolveKnaveExit=(choice:'finish'|'discard'|'stay')=>{
    const request=knaveExitRequest;if(!request)return false;
    if(choice==='stay'){setKnaveExitRequest(null);return true;}
    if(!currentKnaveDraft(request.draft)){setKnaveExitRequest(null);return false;}
    if(choice==='finish'){if(!finishKnaveDraft(request.draft))return false;}else resetKnaveDraft(request.draft);
    setKnaveExitRequest(null);setTimeout(request.action,0);return true;
  };
  const poiClickGate=(event:React.MouseEvent<HTMLDivElement>)=>{
    if(knaveDraftRef.current){
      if((event.target as Element).closest('[data-knave-panel],[data-knave-exit-dialog],[data-poi-done],[data-poi-export],[data-poi-navigation],.side-panel-toggle'))return;
      const target=(event.target as Element).closest<HTMLElement>('button,a,input,select,polygon.hex');
      if(target){event.preventDefault();event.stopPropagation();requestKnaveExit(()=>{if(target.isConnected)target.dispatchEvent(new MouseEvent('click',{bubbles:true}));});}return;
    }
    if((event.target as Element).closest('[data-myth-material]')){guardMaterialRead(event);return;}
    if(!poiDraftRef.current||(event.target as Element).closest('[data-poi-panel],[data-poi-done],[data-poi-exit-dialog],[data-poi-export],[data-poi-navigation],.map-viewport,.side-panel-toggle'))return;
    const target=(event.target as Element).closest<HTMLElement>('button,a,input,select');if(!target)return;
    event.preventDefault();event.stopPropagation();requestPoiExit(()=>{if(target.isConnected)target.click();});
  };
  const poiSelectGate=(event:React.FormEvent<HTMLDivElement>)=>{
    if(knaveDraftRef.current&&!(event.target as Element).closest('[data-knave-panel],[data-knave-exit-dialog]')&&event.target instanceof HTMLSelectElement){
      const target=event.target,value=target.value;event.preventDefault();event.stopPropagation();requestKnaveExit(()=>{if(target.isConnected){target.value=value;target.dispatchEvent(new Event('change',{bubbles:true}));}});return;
    }
    if(!poiDraftRef.current||(event.target as Element).closest('[data-poi-panel],[data-poi-exit-dialog]')||!(event.target instanceof HTMLSelectElement))return;
    const target=event.target,value=target.value;event.preventDefault();event.stopPropagation();requestPoiExit(()=>{if(!target.isConnected)return;target.value=value;target.dispatchEvent(new Event('change',{bubbles:true}));});
  };
  const nameTypeLabels = language === 'ru'
    ? {region:'Регион', settlement:'Поселение', river:'Река', lake:'Озеро', kingdom:'Королевство',poi:'Точка интереса',waterPoi:'Водная точка',sea:'Море',road:'Путь',obstacle:'Препятствие',crossing:'Переправа',rapid:'Порог',waterfall:'Водопад'}
    : {region:'Region', settlement:'Settlement', river:'River', lake:'Lake', kingdom:'Kingdom',poi:'Point of interest',waterPoi:'Water point',sea:'Sea',road:'Path',obstacle:'Barrier',crossing:'Crossing',rapid:'Rapids',waterfall:'Waterfall'};
  const stableNameObjects=useMemo(()=>editorObjects({seas:seaIdentity.seas,regions,rivers,roads,crossings,obstacles,hexTerrainByKey,waterPoiByKey,riverFeatures:riverFeatureOverrides}),[seaIdentity,regions,rivers,roads,crossings,obstacles,hexTerrainByKey,waterPoiByKey,riverFeatureOverrides]);
  const nameTargetHex = (key:string):AxialHex|null => {
    const object=stableNameObjects.find(o=>o.key===key);if(object)return object.hex??null;
    const [type,id,coord]=key.split(':');
    const existing=new Map<string,AxialHex>();
    for(const r of regions)for(const h of r.hexes)existing.set(hexKey(h),h);
    for(const k of hexTerrainByKey.keys()){const [q,r]=k.split(',').map(Number);existing.set(k,{q,r});}
    const sorted=[...existing.values()].sort((a,b)=>a.q-b.q||a.r-b.r);
    if(type==='region'){const r=regions.find(r=>r.id===Number(id));return r&&r.hexes.some(h=>isSameHex(h,r.centerHex))?r.centerHex:null;}
    if(type==='settlement'||type==='poi')return existing.get(coord)??null;
    if(type==='waterPoi')return existing.get(id)??null;
    if(type==='lake')return sorted.find(h=>{const t=hexTerrainByKey.get(hexKey(h));return t?.terrainOverride==='lake'&&t.lakeId===Number(id);})??null;
    if(type==='river'){
      const river=rivers.find(r=>r.id===Number(id));if(!river)return null;
      const edges=new Set(river.vertexPath.slice(1).map((v,i)=>getRiverEdgeKey(river.vertexPath[i],v)));
      const touches=(h:AxialHex)=>getHexEdgeKeys(h).size>0&&[...getHexEdgeKeys(h)].some(e=>edges.has(e));
      const preferred=regions.find(r=>r.id===river.regionId)?.centerHex;
      return preferred&&existing.has(hexKey(preferred))&&touches(preferred)?preferred:sorted.find(touches)??null;
    }
    const kingdom=kingdoms.find(k=>`kingdom:${k.id}`===key);if(!kingdom)return null;
    const area=kingdomKeys(kingdom.origin);if(existing.has(hexKey(kingdom.anchor))&&area.has(hexKey(kingdom.anchor)))return kingdom.anchor;
    return [...regions].filter(r=>kingdom.regionIds.includes(r.id)).sort((a,b)=>a.id-b.id).map(r=>r.centerHex).find(h=>existing.has(hexKey(h))&&area.has(hexKey(h)))??null;
  };
  const nameCatalog = useMemo((): {targets: NameTarget[]; unavailable: boolean} => {
    const coord = (h?: AxialHex) => h ? `${h.q}/${h.r}` : '';
    const targets: NameTarget[] = [];
    let entities: ToponymEntity[];
    try { entities = getToponymEntities(regions, rivers, hexTerrainByKey); }
    catch { return {targets:[], unavailable:true}; }
    const livePoiNames=poiNameLocators({regions,waterPoiByKey});
    for (const entity of entities) {
      const poiLocator=entity.key.startsWith('settlement:')?'poi:'+entity.key.slice(11):undefined;
      if(poiLocator&&(!livePoiNames.has(poiLocator)||editorNames[poiLocator]))continue;
      const name = toponyms[entity.key]; if (!name) continue;
      const [type, id, hex] = entity.key.split(':');
      const location=coord(nameTargetHex(entity.key)??undefined);
      targets.push({key:entity.key, type:type as NameTarget['type'], ru:name.ru, en:name.en, location,poiLocator,editorLocator:poiLocator});
    }
    for(const key of livePoiNames){
      if(targets.some(t=>t.poiLocator===key))continue;
      const water=key.startsWith('waterPoi:'),parts=key.split(':'),region=water?undefined:regions.find(r=>r.id===Number(parts[1]));
      const coordKey=water?parts[1]:parts[2],kind=water?waterPoiByKey.get(coordKey):region?(hasCentralPoi(region)&&hexKey(region.centerHex)===coordKey?region.centralPoiKind:region.pointOfInterestKinds?.[coordKey]):undefined;
      const fallback=water?WATER_POI_DETAILS[kind as WaterPoiKind]?.label:(POI_DETAILS[kind as PoiKind]?.label??CENTRAL_POI_DETAILS[kind as CentralPoiKind]?.label);
      targets.push({key,type:water?'waterPoi':'poi',poiLocator:key,editorLocator:key,...editorNames[key]??{ru:'',en:''},fallback:fallback??{ru:'Точка интереса',en:'Point of interest'},location:coordKey.replace(',','/')});
    }
    for(const object of stableNameObjects)targets.push({key:object.key,type:object.type,editorLocator:object.key,...editorNames[object.key]??{ru:'',en:''},fallback:{ru:({sea:'Море',road:'Путь',obstacle:'Препятствие',crossing:'Переправа',rapid:'Порог',waterfall:'Водопад'})[object.type],en:({sea:'Sea',road:'Path',obstacle:'Barrier',crossing:'Crossing',rapid:'Rapids',waterfall:'Waterfall'})[object.type]},location:coord(object.hex)});
    for (const kingdom of kingdoms) targets.push({key:`kingdom:${kingdom.id}`,type:'kingdom',...kingdom.name,location:coord(nameTargetHex(`kingdom:${kingdom.id}`)??undefined)});
    return {targets, unavailable:false};
  }, [regions, rivers, hexTerrainByKey, toponyms, kingdoms,editorNames,waterPoiByKey,stableNameObjects]);
  const nameTargets = nameCatalog.targets;
  const setLiveNameDraft = (draft: NameDraft | null) => { nameDraftRef.current = draft; setNameDraft(draft); };
  const restoreNameFocus = () => {
    const origin = nameReturnFocusRef.current;
    setTimeout(() => {
      if (typeof document !== 'undefined' && document.activeElement?.matches('input,textarea,select')) return;
      (origin?.isConnected ? origin : infoFocusRef.current)?.focus();
    }, 0);
  };
  const cancelNameDraft = (restoreFocus=true) => {
    setLiveNameDraft(null); setNameErrors({}); nameComposingRef.current = false; if(restoreFocus)restoreNameFocus();
  };
  const saveNameDraft = (expected = nameDraftRef.current, restoreFocus=true): boolean => {
    if (!expected || nameDraftRef.current !== expected || nameComposingRef.current) return false;
    if (documentBusy() || expected.revision !== documentRevision.current) {
      setNameErrors({general:language === 'ru' ? 'Карта изменилась или занята. Откройте поле заново.' : 'The map changed or is busy. Reopen the field.'});
      return false;
    }
    const current = nameTargets.find(t => t.key === expected.target.key);
    if (!current || current.ru !== expected.target.ru || current.en !== expected.target.en) {
      setNameErrors({general:language === 'ru' ? 'Объект изменился. Откройте поле заново.' : 'The object changed. Reopen the field.'}); return false;
    }
    const field = expected.language;
    // Exact legacy no-op is allowed before validating new text.
    if (expected.value === current[field] && (expected.otherValue===undefined||expected.otherValue===current[field==='ru'?'en':'ru'])) { cancelNameDraft(restoreFocus); return true; }
    if(current.editorLocator){
      const other=field==='ru'?'en':'ru',pair={ru:current.ru,en:current.en,[field]:expected.value.trim(),[other]:(expected.otherValue??current[other]).trim()};
      if(pair.ru===current.ru&&pair.en===current.en){cancelNameDraft(restoreFocus);return true;}
      try{
        if([expected.value,expected.otherValue??current[other]].some(v=>/[\u0000-\u001f\u007f]/.test(v)))throw Error('invalid_poi_name');
        const map=structuredClone(captureMap()),selfSettlement=current.poiLocator?'settlement:'+current.poiLocator.slice(4):'';
        const others=[...Object.entries(map.toponyms).filter(([k])=>k!==current.key&&k!==selfSettlement).map(([,v])=>v),...(map.kingdoms??[]).map(k=>k.name)];
        if(current.type==='settlement'){
          if(!pair.ru||!pair.en||pair.ru.length>80||pair.en.length>80||[...others,...Object.values(map.editorNames)].some(n=>n.ru.trim().toLocaleLowerCase()===pair.ru.toLocaleLowerCase()||n.en.trim().toLocaleLowerCase()===pair.en.toLocaleLowerCase()))throw Error('invalid_or_duplicate_poi_name');
          const names=renameToponym(map.toponyms,current.key,pair.en,pair.ru);if(!names)throw Error('invalid_poi_name');map.toponyms=names;
        }else map.editorNames=renamePoiEditorName(map.editorNames,current.editorLocator,pair,editorNameLocators(map),others);
        checkedRiverMap(map);const before=captureDocument(),after={...before,map};
        recordTransaction(before,after);applyExactMap(map);cancelNameDraft(restoreFocus);setNameStatus('saved');return true;
      }catch(error){const code=(error as {code?:string;message?:string})?.code??(error as {message?:string})?.message;const invalid=code==='invalid_poi_name'||code==='invalid_or_duplicate_poi_name'||code==='duplicate_poi_name';setNameErrors({general:invalid?(language==='ru'?'Укажите оба имени до 80 символов без повторов. Для очистки авторского имени оставьте оба поля пустыми.':'Enter both names, up to 80 characters each, without duplicates. Leave both fields blank to clear an authored name.'):(language==='ru'?'Не удалось изменить название. Карта не изменена.':'Could not change the name. Your map is unchanged.')});nameFocusRef.current?.focus();return false;}
    }
    const value = expected.value.trim();
    let error: string | undefined;
    if (!value || value.length > 80 || /[\u0000-\u001f\u007f]/.test(expected.value))
      error = language === 'ru' ? 'От 1 до 80 символов, одна строка без управляющих знаков.' : 'Use 1–80 characters on one line, without control characters.';
    // Preserve legacy kingdom-only policy; the new authored-name layer is shared in both directions.
    else if ((current.type !== 'kingdom' && Object.entries(toponyms).some(([key, n]) => key !== current.key && n[field].trim().toLocaleLowerCase() === value.toLocaleLowerCase()))||Object.values(editorNames).some(n=>n[field].trim().toLocaleLowerCase()===value.toLocaleLowerCase()))
      error = language === 'ru' ? 'Такое название уже есть. Выберите другое.' : 'This name is already used. Choose another.';
    if (error) { setNameErrors({general:error}); nameFocusRef.current?.focus(); return false; }
    if (value === current[field]) { cancelNameDraft(restoreFocus); return true; }
    try {
      const map = structuredClone(captureMap());
      if (current.type === 'kingdom') map.kingdoms = (map.kingdoms ?? []).map(k => `kingdom:${k.id}` === current.key ? {...k,name:{...k.name,[field]:value}} : k);
      else map.toponyms = {...map.toponyms, [current.key]:{...map.toponyms[current.key], [field]:value}};
      const before = captureDocument(), after = {...before, map};
      recordTransaction(before, after); applyExactMap(map);
      cancelNameDraft(restoreFocus); setNameStatus('saved'); return true;
    } catch {
      setNameErrors({general:language === 'ru' ? 'Не удалось изменить название. Карта не изменена.' : 'Could not change the name. Your map is unchanged.'});
      nameFocusRef.current?.focus(); return false;
    }
  };
  const finishInlineName = () => !nameDraftRef.current || saveNameDraft(nameDraftRef.current);
  finishMapNameRef.current = finishInlineName;
  const showNameTarget = (key: string | null, origin?: HTMLElement, surface = 'info') => {
    if (documentBusy() || !finishPathDrafts() || !finishInlineName()) return;
    setNameErrors({}); setNameStatus(null);
    if (key === null) { setNamesOpen(false); return; }
    const target = nameTargets.find(t => t.key === key);
    if (!target) { setNameStatus('stale'); return; }
    finishNotesGroup(); clearNotesDraft(); closeEditors();
    nameReturnFocusRef.current = origin ?? null;
    setLiveNameDraft({target:{...target}, revision:documentRevision.current, language, value:target[language],otherValue:target.editorLocator?target[language==='ru'?'en':'ru']:undefined, surface});
  };
  const nameNavigationRef=useRef<(key:string)=>boolean>(()=>false);
  const selectNameTarget=(key:string)=>nameNavigationRef.current(key);
  nameNavigationRef.current=key=>{
    const current=nameTargets.find(t=>t.key===key),hex=current?nameTargetHex(key):null;
    if(!current||!hex){setNameStatus('stale');return false;}
    if(documentBusy()||nameComposingRef.current||!finishPathDrafts()||!finishInlineName())return false;
    finishNotesGroup();clearNotesDraft();closeEditors();
    setSelectedHex({...hex});setNameStatus(null);
    const object=stableNameObjects.find(o=>o.key===key);
    if(editMode&&object){if(object.roadId!==undefined&&object.segmentKey)chooseRoadPair(object.segmentKey,object.roadId,object.type==='crossing'?object.key.slice('crossing:'.length):undefined);else if(object.type==='obstacle')chooseObstacle(Number(object.key.slice('obstacle:'.length)));else if(object.riverId!==undefined)setRiverFeatureTarget({riverId:object.riverId,hexKey:hexKey(hex),edgeKey:object.edgeKey,vertexKey:object.vertexKey});}
    if(editMode&&current.type==='river'){const river=rivers.find(r=>`river:${r.id}`===key);if(river)setRiverFeatureTarget({riverId:river.id,hexKey:hexKey(hex)});}
    setTimeout(()=>infoFocusRef.current?.focus(),0);return true;
  };
  const requestNameTarget = showNameTarget;
  const changeNameDraft = (value: string, expected: NameDraft) => {
    if (nameDraftRef.current !== expected || expected.revision !== documentRevision.current || documentBusy()) return;
    setLiveNameDraft({...expected, value}); setNameErrors({}); setNameStatus(null);
  };
  const changeOtherNameDraft=(value:string,expected:NameDraft)=>{if(nameDraftRef.current!==expected||documentBusy()||expected.revision!==documentRevision.current)return;setLiveNameDraft({...expected,otherValue:value});setNameErrors({});};
  const renderName = (key: string, surface = 'info') => {
    const target = nameTargets.find(t => t.key === key);
    if (!target) return null;
    const active = nameDraft?.target.key === key && nameDraft.surface === surface;
    return active ? <span className="direct-name-field" data-inline-name>
      {target.editorLocator&&<small>{nameDraft.language==='ru'?'Русский':'English'}</small>}
      <input ref={nameFocusRef} aria-label={language === 'ru' ? 'Название' : 'Name'} value={nameDraft.value}
        aria-invalid={!!nameErrors.general} aria-describedby={nameErrors.general ? 'direct-name-error' : undefined}
        onChange={e => changeNameDraft(e.target.value, nameDraft)}
        onCompositionStart={() => { nameComposingRef.current = true; }} onCompositionEnd={() => { nameComposingRef.current = false; }}
        onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); cancelNameDraft(); }
          else if (e.key === 'Tab') { if (!nameDraft.target.editorLocator&&!saveNameDraft(nameDraftRef.current)) e.preventDefault(); }
          else if (e.key === 'Enter' && !e.nativeEvent.isComposing && !nameComposingRef.current) { e.preventDefault(); saveNameDraft(nameDraftRef.current); } }}
        onBlur={e => { if (!(e.relatedTarget as Element|null)?.closest('[data-inline-name]')&&nameDraftRef.current === nameDraft) saveNameDraft(nameDraft,false); }} />
      {target.editorLocator&&<label className="poi-name-other">{nameDraft.language==='ru'?'English':'Русский'}<input aria-label={nameDraft.language==='ru'?'Название (English)':'Name (Russian)'} value={nameDraft.otherValue??''} maxLength={80} onChange={e=>changeOtherNameDraft(e.target.value,nameDraft)} onCompositionStart={()=>{nameComposingRef.current=true;}} onCompositionEnd={()=>{nameComposingRef.current=false;}} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();cancelNameDraft();}else if(e.key==='Enter'&&!e.nativeEvent.isComposing&&!nameComposingRef.current){e.preventDefault();saveNameDraft(nameDraftRef.current);}}} onBlur={e=>{if(!(e.relatedTarget as Element|null)?.closest('[data-inline-name]')&&nameDraftRef.current===nameDraft)saveNameDraft(nameDraft,false);}} /></label>}
      {nameErrors.general && <span id="direct-name-error" role="alert" className="direct-error">{nameErrors.general}</span>}
    </span> : editMode ? <button type="button" className="direct-value" data-name-key={key}
      aria-label={`${language === 'ru' ? 'Название' : 'Name'}: ${target[language]||target.fallback?.[language]||''}`}
      onClick={e => showNameTarget(key, e.currentTarget, surface)}><strong>{target[language]||(language==='ru'?'Назвать объект':'Name object')}</strong></button>
      : target[language]?<strong>{target[language]}</strong>:null;
  };
  const renderToponym = (key: string, surface = 'info') => renderName(key.startsWith('settlement:')?(nameTargets.find(t=>t.poiLocator==='poi:'+key.slice(11))?.key??key):key, surface);
  const editableValue = (label: string, value: string, open: () => void) => editMode
    ? <button type="button" className="direct-value" aria-label={label} onClick={() => {if (!mutationBlocked()) { clearNotesDraft(); closeEditors(); open(); }}}>{value}</button>
    : <span>{value}</span>;
  const renderWaterPoi = () => <>{isEditingSelectedPoi && editMode ? <select autoFocus aria-label={t.choosePoi}
    value={selectedWaterPoiKind ?? ''} onBlur={() => setEditingPoiHexKey(null)}
    onChange={e => e.target.value ? setSelectedWaterPoiKind(e.target.value as WaterPoiKind) : deleteSelectedWaterPoi()}>
    <option value="">{language === 'ru' ? 'Нет точки' : 'No point'}</option>
    {waterPoiKindOrder.map(kind => <option key={kind} value={kind}>{WATER_POI_DETAILS[kind].emoji} {WATER_POI_DETAILS[kind].label[language]}</option>)}
  </select> : selectedWaterPoiKind || (editMode && waterPoiKindOrder.length) ? editableValue(t.editPoi,
    selectedWaterPoiKind ? `${getWaterPoiEmoji(selectedWaterPoiKind)} ${getWaterPoiLabel(selectedWaterPoiKind, language)}` : t.addPoi,
    () => setEditingPoiHexKey(selectedHexKey)) : null}{selectedWaterPoiKind?renderName(`waterPoi:${selectedHexKey}`):null}</>;
  const selectedPoiSource:PoiLocator|null=selectedHexKey?(selectedWaterPoiKind?{kind:'water',hexKey:selectedHexKey}:selectedRegion&&poiNameLocators({regions,waterPoiByKey}).has(`poi:${selectedRegion.id}:${selectedHexKey}`)?{kind:'land',regionId:selectedRegion.id,hexKey:selectedHexKey}:null):null;
  const knaveDiscoveryKey=selectedPoiSource?poiLocatorKey(selectedPoiSource):null;
  const selectedKnaveContent=knaveDiscoveryKey?knave?.content?.byPoi[knaveDiscoveryKey]:undefined;
  const renderKnaveResult=(result:{ru:string;references:{printedPage:number}[]},table:string,row:number,die=false)=><details className="knave-result"><summary>{die?`d100=${row===100?'00':row} · `:''}{result.ru}{language==='en'?<small> RU</small>:null}</summary><small>{`Knave 2e · Torbin RU1.0 · ${table} · ${language==='ru'?'строка':'row'} ${row}`}{!die?` · ${language==='ru'?'совместимый пул':'compatible pool'}`:''}{result.references.map((r,i)=><span key={i}>{` · ${language==='ru'?'ссылка не разрешена: стр.':'unresolved reference: p.'} ${r.printedPage}`}</span>)}</small></details>;
  const acceptedDiscovery=knaveDiscoveryKey?knave?.discoveryByPoi[knaveDiscoveryKey]:undefined;
  const knaveDifficulty=knaveDraft?.difficulty??(selectedHexKey?knave?.difficultyByHex[selectedHexKey]:undefined)??'unspecified';
  const knaveDiscovery=knaveDraft?.mode??acceptedDiscovery?.mode??'passage',knaveClue=knaveDraft?.clueText??acceptedDiscovery?.clueText??'';
  const knaveControlsBlocked=!!poiDraft||!!regionDraft||!!waterDraft||!!riverDraft||!!roadDraft||!!obstacleDraft||!!riverCommandPreview||!!roadFeatureResolution||documentBusy()||dirtyNameDraft();
  const difficultyLabels:Record<Difficulty,string>=language==='ru'?{unspecified:'Не задана',normal:'Обычная',difficult:'Трудная'}:{unspecified:'Unspecified',normal:'Normal',difficult:'Difficult'};
  const discoveryLabels:Record<Discovery,string>=language==='ru'?{passage:'При прохождении',exploration:'При исследовании',interaction:'Секрет · взаимодействие'}:{passage:'On passage',exploration:'By exploration',interaction:'Secret · interaction'};
  const knavePanel=knave&&generationMode==='classic'&&selectedHexKey&&knaveMapContext(captureMap()).hexes.has(selectedHexKey)?<div data-knave-panel className="knave-properties">
    {selectedKnaveContent&&<div className="knave-results">{selectedKnaveContent.site?renderKnaveResult(selectedKnaveContent.site,selectedKnaveContent.site.table,selectedKnaveContent.site.sourceRow):null}{renderKnaveResult(selectedKnaveContent.trait,'place_traits',selectedKnaveContent.trait.sourceRow,true)}</div>}
    {!isSelectedLake&&!isSelectedSea&&<div className="direct-line"><label>{language==='ru'?'Проходимость: ':'Difficulty: '}{editMode?<select aria-label={language==='ru'?'Проходимость':'Difficulty'} value={knaveDifficulty} disabled={knaveControlsBlocked} onChange={e=>changeKnaveDraft({difficulty:e.target.value as Difficulty},knaveDraft)}>{Object.entries(difficultyLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>:difficultyLabels[knaveDifficulty]}</label></div>}
    {knaveDiscoveryKey&&<><div className="direct-line"><label>{language==='ru'?'Обнаружение: ':'Discovery: '}{editMode?<select aria-label={language==='ru'?'Обнаружение':'Discovery'} value={knaveDiscovery} disabled={knaveControlsBlocked} onChange={e=>changeKnaveDraft({mode:e.target.value as Discovery},knaveDraft)}>{Object.entries(discoveryLabels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select>:discoveryLabels[knaveDiscovery]}</label></div>
    {editMode?<label className="knave-clue">{language==='ru'?'Улика (тот же гекс)':'Clue (same hex)'}<textarea aria-label={language==='ru'?'Улика':'Clue'} aria-invalid={!!knaveError} aria-describedby={knaveError?'knave-clue-error':undefined} maxLength={512} rows={2} value={knaveClue} disabled={knaveControlsBlocked} onChange={e=>changeKnaveDraft({clueText:e.target.value},knaveDraft)} onCompositionStart={()=>{knaveComposing.current=true;}} onCompositionEnd={()=>{knaveComposing.current=false;}} /></label>:knaveClue?<p className="knave-clue-text">{language==='ru'?'Улика: ':'Clue: '}{knaveClue}</p>:null}</>}
    {knaveError&&<p id="knave-clue-error" className="direct-error" role="alert">{knaveError}</p>}
    {knaveDraft&&<button type="button" className="direct-value" onClick={()=>resetKnaveDraft(knaveDraft)}>{language==='ru'?'Отмена':'Cancel'}</button>}
  </div>:null;
  const poiPanel=selectedPoiSource&&(poiDraft||!(selectedPoiSource.kind==='land'&&selectedHasCentralPoi))?<div data-poi-panel className="poi-move-panel">
    {poiDraft?<>
      <p><strong>{language==='ru'?'Перенос точки':'Move point'}: {nameTargets.find(t=>t.poiLocator===poiLocatorKey(poiDraft.source))?.[language]||t.poi}</strong></p>
      <p>{language==='ru'?'Источник':'Source'}: {poiDraft.source.hexKey.replace(',','/')} → {poiDraft.q!==''&&poiDraft.r!==''?`${poiDraft.q}/${poiDraft.r}`:'…'}</p>
      <p>{language==='ru'?'Нажмите гекс на карте или введите q/r. Готово — перенести, Esc — отменить.':'Click a map hex or enter q/r. Done moves; Esc discards.'}</p>
      <div className="poi-target-coords"><label>q<input inputMode="numeric" maxLength={20} aria-label={language==='ru'?'Новый гекс q':'Target hex q'} value={poiDraft.q} onChange={e=>changePoiTarget(e.target.value,poiDraft.r,poiDraft)}/></label><label>r<input inputMode="numeric" maxLength={20} aria-label={language==='ru'?'Новый гекс r':'Target hex r'} value={poiDraft.r} onChange={e=>changePoiTarget(poiDraft.q,e.target.value,poiDraft)}/></label></div>
      {poiDraft.ambiguous.length>0&&<label>{language==='ru'?'Уточните гекс':'Choose the hex'}<select aria-label={language==='ru'?'Уточните целевой гекс':'Disambiguate target hex'} value="" onChange={e=>{const [q,r]=e.target.value.split(',');if(e.target.value)changePoiTarget(q,r,poiDraft);}}><option value="">—</option>{poiDraft.ambiguous.map(k=><option key={k}>{k}</option>)}</select></label>}
      {poiPreview?.plan&&<p role="status">{language==='ru'?'С точкой сохранятся имя, тип и теги. Заметки и местность обоих гексов останутся на своих местах.':'Name, type and tags move with the point. Both hexes keep their notes and terrain.'}</p>}
      {(editError||poiDraft.q!==''&&poiDraft.r!==''&&poiPreview?.error)&&<p role="alert" className="direct-error">{editError||poiPreview?.error}</p>}
      {poiPreview?.code==='poi_path_dependency'&&roads.filter(r=>r.segments.some(s=>hexKey(s.from)===poiDraft.source.hexKey||hexKey(s.to)===poiDraft.source.hexKey)).map(road=><button type="button" className="direct-value" key={road.id} onClick={()=>requestPoiExit(()=>{const segment=road.segments.find(s=>hexKey(s.from)===poiDraft.source.hexKey||hexKey(s.to)===poiDraft.source.hexKey)!;chooseRoadPair(normalizeRoadSegmentKey(segment.from,segment.to),road.id);})}>{language==='ru'?'Посмотреть путь':'View path'} #{road.id}</button>)}
    </>:<p>{language==='ru'?'Расположение':'Location'}: {editMode?<button type="button" className="direct-value" data-poi-move onClick={()=>startPoiDraft(selectedPoiSource)}>{selectedPoiSource.hexKey.replace(',','/')} ↗</button>:selectedPoiSource.hexKey.replace(',','/')}</p>}
  </div>:null;
  const waterLossText=(loss:WaterLoss):string=>{
    const ru=language==='ru';
    if(loss.type==='knave'){const v=loss.value as {kind:string;data:{mode?:string;clueText?:string}|string};return `${ru?'Удалить':'Delete'} ${v.kind==='difficulty'?(ru?'отметку проходимости':'terrain difficulty'):v.kind==='content'?(ru?'содержимое точки':'point content'):(ru?'способ обнаружения и улику':'discovery and clue')} · ${loss.key}`;}
    if(loss.type==='lake')return `${ru?'Озеро исчезнет':'Lake will be removed'}: ${waterName(loss.key)}`;
    if(loss.type==='name'){const v=loss.value as {ru:string;en:string;seaInto?:number[]};return `${ru?'Удалить название':'Delete name'}${loss.key.startsWith('sea:')?` · ${ru?'море':'sea'} #${loss.key.slice(4)}`:''}: ${v.ru} / ${v.en}${v.seaInto?(v.seaInto.length?` · ${ru?'слияние в':'merged into'} ${v.seaInto.map(id=>`${waterName(`sea:${id}`)} (#${id})`).join(', ')}`:` · ${ru?'морской объект исчезнет':'no sea remains'}`):''}`;}
    if(loss.type==='tag'){const v=loss.value as TagState['instances'][number],def=mythicDefinitions[v.definitionId];const text=v.texts.map((t,i)=>Object.entries({...t,...v.overrides?.[i]}).map(([l,s])=>`${l}: ${s}`).join(' / ')).join(' · ');return `${ru?'Удалить тег':'Delete tag'} ${def?.label[language]??v.definitionId}: ${text} (${v.values.map(v=>v.join('+')).join(' / ')})`;}
    if(loss.type==='waterPoi')return `${ru?'Удалить водную точку':'Delete water point'}: ${getWaterPoiLabel(loss.value as WaterPoiKind,language)} · ${loss.key}`;
    if(loss.type==='poi'){const v=loss.value as {regionId:number;kind?:PoiKind};return `${ru?'Удалить точку':'Delete point'}: ${v.kind?POI_DETAILS[v.kind]?.label[language]??v.kind:(ru?'Точка интереса':'Point of interest')} · ${loss.key}`;}
    if(loss.type==='obstacle'){const v=loss.value as EditableObstacle;return `${ru?'Удалить препятствие':'Delete barrier'} ${v.id}: ${hexKey(v.hex)} ↔ ${hexKey(v.neighborHex)}`;}
    const v=loss.value as RiverCrossing;return `${language==='ru'?'Удалить':'Delete'} ${t[v.kind]} · ${language==='ru'?'путь':'path'} ${v.roadId} · ${waterName(`river:${v.riverId}`)}`;
  };
  const waterPreview=(()=>{
    if(!waterDraft?.preview)return null;
    let geometry:ReturnType<typeof prepareWaterGeometry<Region>>|null=null;
    try{geometry=prepareWaterGeometry(captureMap(),waterDraft.edit);return {geometry,plan:prepareWaterMapEdit(captureMap(),waterDraft.edit,waterDraft.options),error:null};}
    catch(error){return {geometry,plan:null,error:waterCommandError(error)};}
  })();
  const changeWaterChoice=(draft:WaterDraft,type:'componentKinds'|'regionAssignments'|'splitKeep'|'mergeKeep',key:string,value:string)=>{
    if(!value)return;
    const old=draft.edit[type]??{},v=type==='regionAssignments'||type==='mergeKeep'?Number(value):value;
    changeWaterDraft(draft,{edit:{...draft.edit,[type]:{...old,[key]:v}},options:{},preview:true});
  };
  const changeSeaChoice=(draft:WaterDraft,type:'seaSplitKeep'|'seaMergeKeep',key:string,value:string)=>{
    const choices={seaSplitKeep:draft.options.seaSplitKeep,seaMergeKeep:draft.options.seaMergeKeep};
    const values:Record<string,string|number>={...choices[type]};if(value)values[key]=type==='seaMergeKeep'?Number(value):value;else delete values[key];
    // A new split assignment changes the merge graph, so discard stale merge answers.
    changeWaterDraft(draft,{options:type==='seaSplitKeep'?{seaSplitKeep:values as Record<string,string>}:{...choices,seaMergeKeep:values as Record<string,number>},preview:true});
  };
  const waterFeatureText=(feature:FeatureEdit)=>feature.type==='rapid'
    ? `${language==='ru'?'Пороги':'Rapids'} · ${waterName(`river:${feature.riverId}`)} · ${language==='ru'?'участок':'edge'} ${(rivers.find(r=>r.id===feature.riverId)?.vertexPath.slice(1).findIndex((v,i)=>edgeKey(rivers.find(r=>r.id===feature.riverId)!.vertexPath[i],v)===feature.edgeKey)??0)+1}`
    : `${language==='ru'?'Водопад':'Waterfall'} · ${language==='ru'?'вершина реки':'river vertex'} ${rivers.find(r=>r.vertexPath.some(v=>v.key===feature.vertexKey))?.vertexPath.findIndex(v=>v.key===feature.vertexKey)!+1}`;
  const waterFeatureChoice=(draft:WaterDraft,feature:FeatureEdit,state:'auto'|'off')=>{
    const same=(a:FeatureEdit,b:FeatureEdit)=>a.type===b.type&&(a.type==='rapid'&&b.type==='rapid'?a.riverId===b.riverId&&a.edgeKey===b.edgeKey:a.type==='waterfall'&&b.type==='waterfall'&&a.vertexKey===b.vertexKey);
    changeWaterDraft(draft,{options:{...draft.options,featureEdits:[...(draft.options.featureEdits??[]).filter(e=>!same(e,feature)),{...feature,state}]},preview:true});
  };
  const regionLabel=(id:number)=>`${toponyms[`region:${id}`]?.[language]??(language==='ru'?'Регион':'Region')} (#${id})`;
  const regionTransferSource=regionDraft?.edit.type==='transfer_hex'?regions.find(r=>regionDraft.edit.type==='transfer_hex'&&r.id===regionDraft.edit.fromRegionId):undefined;
  const regionTransferHex=regionTransferSource?.hexes.find(h=>hexKey(h)===regionDraft?.originKey);
  const regionTargets=regionTransferHex?regions.filter(r=>r.id!==regionTransferSource?.id&&getHexNeighbors(regionTransferHex).some(h=>r.hexes.some(v=>isSameHex(h,v)))):[];
  const selectRegionTarget=(id:number,expected=regionDraft)=>{
    if(!currentRegionDraft(expected)||expected.edit.type!=='transfer_hex'||id!==expected.edit.fromRegionId&&!regionTargets.some(r=>r.id===id))return false;
    return changeRegionDraft(expected,{...expected.edit,toRegionId:id});
  };
  const activateRegionTarget=(event:MouseEvent<SVGCircleElement>,id:number)=>{
    event.preventDefault();event.stopPropagation();
    const draft=regionDraft;if(!currentRegionDraft(draft)||riverDraftGesture.current?.moved)return;
    const hits=[...new Set(document.elementsFromPoint(event.clientX,event.clientY).filter(e=>e.matches('[data-region-map-target]')).map(e=>Number(e.getAttribute('data-region-map-target'))).filter(value=>regionTargets.some(r=>r.id===value)))];
    if(hits.length>1){updateRegionDraft({...draft,ambiguousRegionIds:hits});setEditError(language==='ru'?'Здесь несколько целей. Выберите регион в списке.':'Several targets overlap here. Choose a region from the list.');setIsSidePanelCollapsed(false);return;}
    selectRegionTarget(hits[0]??id,draft);
  };
  const regionMapTargets=regionTargets.flatMap(r=>{
    const hex=r.hexes.find(h=>regionTransferHex&&getHexNeighbors(regionTransferHex).some(v=>isSameHex(h,v)));
    const point=hex&&positionedHexes.hexes.find(p=>p.key===hexKey(hex));
    return point?[{id:r.id,x:point.x,y:point.y}]:[];
  });
  const regionTargetOutline=(()=>{
    const id=regionTargetHoverId??(regionDraft?.edit.type==='transfer_hex'?regionDraft.edit.toRegionId:undefined),target=regionTargets.find(r=>r.id===id);
    if(!target||!regionTransferHex)return [];
    const hexes=[...target.hexes,regionTransferHex],keys=new Set(hexes.map(hexKey));
    return hexes.flatMap(h=>getHexEdgesAsVertexPairs(h).filter(edge=>!keys.has(hexKey(edge.neighborHex))));
  })();
  const regionPreview=regionDraft?(()=>{
    try{
      const original=captureMap(),map=prepareRegionMapEdit(original,regionDraft.edit),before=regionMarkKeys(original),after=regionMarkKeys(map);
      const changes=(kind:'rapids'|'waterfalls')=>({added:[...after[kind]].filter(k=>!before[kind].has(k)),removed:[...before[kind]].filter(k=>!after[kind].has(k))});
      const ownerChanges=map.rivers.flatMap(r=>{const old=original.rivers.find(v=>v.id===r.id);if(!old)return [];const from=getRiverSectorAssignedRegionByEdge(old),to=getRiverSectorAssignedRegionByEdge(r);
        return r.vertexPath.slice(1).flatMap((v,i)=>{const key=edgeKey(r.vertexPath[i],v),a=from.get(key)??old.regionId,b=to.get(key)??r.regionId;return a===b?[]:[{riverId:r.id,edgeKey:key,index:i+1,from:a,to:b}];});});
      const changedHeights=new Set(original.regions.filter(r=>map.regions.find(n=>n.id===r.id)?.heightLevel!==r.heightLevel).map(r=>r.id));
      const movedEdges=regionDraft.edit.type==='transfer_hex'&&regionTransferHex?getHexEdgeKeys(regionTransferHex):new Set<string>();
      const affectedRivers=map.rivers.filter(r=>{const old=original.rivers.find(v=>v.id===r.id);if(!old||r!==old)return true;const owners=getRiverSectorAssignedRegionByEdge(old);
        return old.vertexPath.slice(1).some((v,i)=>{const key=edgeKey(old.vertexPath[i],v);return movedEdges.has(key)||changedHeights.has(owners.get(key)??old.regionId);});}).map(r=>r.id);
      const changedId=regionDraft.edit.type==='region_height'?regionDraft.edit.regionId:regionDraft.edit.fromRegionId,source=regions.find(r=>r.id===changedId);
      const sourceKeys=new Set(source?.hexes.map(hexKey)),exceptions=[...biomeOverrideByHexKey.keys()].filter(k=>sourceKeys.has(k));
      return {map,error:null,marks:{rapids:changes('rapids'),waterfalls:changes('waterfalls')},ownerChanges,affectedRivers,exceptions:{count:exceptions.length,underwater:exceptions.filter(k=>waterKindAt(hexTerrainByKey,k)!=='land').length}};
    }catch(error){return {map:null,error:regionCommandError(error),marks:null,ownerChanges:[],affectedRivers:[],exceptions:null};}
  })():null;
  const regionPanel=selectedRegion?<div data-region-editor>
    <div className="direct-line">{language==='ru'?'Высота: ':'Height: '}
      {regionDraft?.edit.type==='region_height'?<select autoFocus data-region-height aria-label={`${language==='ru'?'Высота региона':'Region height'} ${regionLabel(selectedRegion.id)}`} value={regionDraft.edit.heightLevel}
        onChange={e=>{const edit=regionDraft.edit;if(edit.type==='region_height')changeRegionDraft(regionDraft,{...edit,heightLevel:Number(e.target.value) as RegionHeightLevel,biomeId:Number(e.target.value)===selectedRegion.heightLevel?selectedRegion.biomeId:''});}}>
        {([1,2,3] as const).map(level=><option key={level} value={level}>{getRegionHeightLabel(level,language)}</option>)}
      </select>:editableValue(`${language==='ru'?'Высота региона':'Region height'} ${regionLabel(selectedRegion.id)}`,getRegionHeightLabel(selectedRegion.heightLevel,language),()=>startRegionDraft('region_height'))}
    </div>
    {regionDraft?.edit.type==='region_height'&&<div className="direct-line"><label>{language==='ru'?'Базовая местность: ':'Base terrain: '}
      <select data-region-height-biome aria-label={language==='ru'?'Местность новой высоты':'Terrain for new height'} value={regionDraft.edit.biomeId}
        onChange={e=>{const edit=regionDraft.edit;if(edit.type==='region_height')changeRegionDraft(regionDraft,{...edit,biomeId:e.target.value});}}>
        <option value="" disabled>{language==='ru'?'Выберите местность':'Choose terrain'}</option>
        {Object.values(BIOMES).filter(b=>regionDraft.edit.type==='region_height'&&b.heightLevel===regionDraft.edit.heightLevel).map(b=>{
          let reason:string|null=null;
          try{if(regionDraft.edit.type==='region_height')prepareRegionMapEdit(captureMap(),{...regionDraft.edit,biomeId:b.id});}catch(error){reason=regionCommandError(error);}
          return <option key={b.id} value={b.id} disabled={!!reason}>{getBiomeLabel(b.id,language)}{reason?` — ${reason}`:''}</option>;
        })}
      </select></label></div>}
    <div className="direct-line">{language==='ru'?'Регион гекса: ':'Hex region: '}
      {regionDraft?.edit.type==='transfer_hex'?<select autoFocus data-region-transfer aria-label={`${language==='ru'?'Передать гекс региону':'Transfer hex to region'} ${regionDraft.originKey}`} value={regionDraft.edit.toRegionId}
        onChange={e=>{const edit=regionDraft.edit;if(edit.type==='transfer_hex')changeRegionDraft(regionDraft,{...edit,toRegionId:Number(e.target.value)});}}>
        {regions.filter(r=>r.id===selectedRegion.id||getHexNeighbors(selectedHex!).some(h=>r.hexes.some(v=>isSameHex(v,h)))).map(r=>{
          let reason:string|null=null;
          try{if(regionDraft.edit.type==='transfer_hex')prepareRegionMapEdit(captureMap(),{...regionDraft.edit,toRegionId:r.id});}catch(error){reason=regionCommandError(error);}
          return <option key={r.id} value={r.id} disabled={!!reason}>{regionLabel(r.id)}{r.id===selectedRegion.id?(language==='ru'?' (текущий)':' (current)'):''}{reason?` — ${reason}`:''}</option>;
        })}
      </select>:editableValue(`${language==='ru'?'Передать гекс региону':'Transfer hex to region'} ${selectedHexKey}`,regionLabel(selectedRegion.id),()=>startRegionDraft('transfer_hex'))}
    </div>
    {regionDraft&&<div className="region-edit-preview" data-region-preview role="status" tabIndex={0} aria-label={language==='ru'?'Предпросмотр изменения региона':'Region edit preview'}>
      <p><strong>{language==='ru'?'Предпросмотр изменения':'Edit preview'}</strong></p>
      {regionPreview?.map&&<>
        {regionDraft.edit.type==='region_height'&&regionPreview.exceptions&&<p data-region-exception-count>{language==='ru'?'Локальные исключения':'Local exceptions'}: {regionPreview.exceptions.count}; {language==='ru'?'под водой':'underwater'}: {regionPreview.exceptions.underwater}. {language==='ru'?'Сохраняются.':'Preserved.'}</p>}
        {!!regionPreview.affectedRivers.length&&<p data-region-affected-rivers>{language==='ru'?'Затронутые реки':'Affected rivers'}: {regionPreview.affectedRivers.map(id=>`${toponyms[`river:${id}`]?.[language]??(language==='ru'?'Река':'River')} (#${id})`).join('; ')}.</p>}
        {regionPreview.map.regions.filter(r=>r!==regions.find(old=>old.id===r.id)).map(r=>{const old=regions.find(v=>v.id===r.id)!;return <p key={r.id}>
          {toponyms[`region:${r.id}`]?.[language]??`${language==='ru'?'Регион':'Region'} ${r.id}`}: {regionDraft.edit.type==='transfer_hex'?`${getRegionSizeDisplay(old,language)} → ${getRegionSizeDisplay(r,language)}; `:''}{getRegionHeightLabel(old.heightLevel,language)} → {getRegionHeightLabel(r.heightLevel,language)}; {getBiomeLabel(old.biomeId,language)} → {getBiomeLabel(r.biomeId,language)}.
        </p>;})}
        {regionDraft.edit.type==='transfer_hex'&&regionDraft.edit.fromRegionId!==regionDraft.edit.toRegionId&&(()=>{
          const edit=regionDraft.edit,source=regions.find(r=>r.id===edit.fromRegionId)!,target=regions.find(r=>r.id===edit.toRegionId)!,override=biomeOverrideByHexKey.get(edit.hexKey);
          const poi=source.pointsOfInterest.some(h=>hexKey(h)===edit.hexKey),name=toponyms[`settlement:${source.id}:${edit.hexKey}`]?.[language];
          const tagCount=tagsRef.current.instances.filter(t=>ownerKey(t.owner)===`poi:${source.id}:${edit.hexKey}`).length;
          return <><p data-region-cell-effect>{edit.hexKey}: {source.id} → {target.id}. {language==='ru'?'Базовая местность':'Base terrain'}: {getBiomeLabel(source.biomeId,language)} → {getBiomeLabel(target.biomeId,language)}. {language==='ru'?'Высота гекса':'Hex height'}: {source.heightLevel} → {target.heightLevel}. {override?(language==='ru'?`Локальная местность «${getBiomeLabel(override,language)}» сохранится.`:`Local terrain “${getBiomeLabel(override,language)}” is preserved.`):''}</p>
            <p>{poi?(language==='ru'?`Переходит точка интереса${name?` «${name}»`:''}; теги: ${tagCount}.`:`Point of interest${name?` “${name}”`:''} moves; tags: ${tagCount}.`):(language==='ru'?'На гексе нет точки интереса.':'This hex has no point of interest.')}</p>
            {poi&&<details data-region-poi-identity><summary>{language==='ru'?'Идентификаторы точки':'Point identifiers'}</summary><p>{`poi:${source.id}:${edit.hexKey}`} → {`poi:${target.id}:${edit.hexKey}`}</p>{Object.prototype.hasOwnProperty.call(toponyms,`settlement:${source.id}:${edit.hexKey}`)&&<p>{`settlement:${source.id}:${edit.hexKey}`} → {`settlement:${target.id}:${edit.hexKey}`}</p>}</details>}</>;
        })()}
        <details data-region-owner-plan><summary>{language==='ru'?'Смена владельца речных участков':'River edge owner changes'}: <span data-region-owner-count>{regionPreview.ownerChanges.length}</span></summary>
          {regionPreview.ownerChanges.map(change=><p key={`${change.riverId}:${change.edgeKey}`} data-region-owner-change={`${change.riverId}:${change.edgeKey}`} title={change.edgeKey}>{toponyms[`river:${change.riverId}`]?.[language]??(language==='ru'?'Река':'River')} (#{change.riverId}), {language==='ru'?'участок':'edge'} {change.index}: {regionLabel(change.from)} → {regionLabel(change.to)}</p>)}
        </details>
        {regionPreview.marks&&(['rapids','waterfalls'] as const).map(kind=>{const change=regionPreview.marks![kind];return <details key={kind} data-region-mark-change={kind}><summary>
          {kind==='rapids'?(language==='ru'?'Автоматические пороги':'Automatic rapids'):(language==='ru'?'Автоматические водопады':'Automatic waterfalls')}: +{change.added.length} / −{change.removed.length}
        </summary><p>{language==='ru'?'Появятся':'Added'}: {change.added.join('; ')||'—'}. {language==='ru'?'Исчезнут':'Removed'}: {change.removed.join('; ')||'—'}.</p></details>;})}
        <p>{language==='ru'?'Остальные объекты сохраняются. Готово — принять; Esc — сбросить.':'Other objects are preserved. Done accepts; Esc discards.'}</p>
      </>}
      {(regionPreview?.error||editError)&&<p className="direct-error" data-region-error role="alert">{editError||regionPreview?.error}</p>}
    </div>}
  </div>:null;
  const waterPanel=selectedHexKey&&!isSelectedCandidate&&(selectedRegion||isSelectedLake||isSelectedSea)?<div data-water-panel className="water-editor">
    <div className="direct-line">{language==='ru'?'Вода: ':'Water: '}{editMode?<select className="water-kind-value" aria-label={language==='ru'?'Вода':'Water'} disabled={!!poiDraft || !!regionDraft || !!waterDraft}
      value={waterKindAt(hexTerrainByKey,selectedHexKey)} onChange={e=>startWaterDraft(e.target.value as WaterKind)}>
      {(['land','lake','sea'] as const).map(kind=><option value={kind} key={kind}>{waterKindLabel(kind)}</option>)}
    </select>:<span>{waterKindLabel(waterKindAt(hexTerrainByKey,selectedHexKey))}</span>}
    {isSelectedSea&&selectedHexKey?<>{' '}{renderName(`sea:${seaIdentity.seas.find(sea=>sea.hexKeys.includes(selectedHexKey))?.id}`)}</>:null}
    {isSelectedLake&&selectedTerrain?.lakeId?<>{' '}{renderToponym(`lake:${selectedTerrain.lakeId}`)}{renderTags({kind:'lake',id:selectedTerrain.lakeId},'lake')}</>:null}
    {editMode&&!poiDraft&&!regionDraft&&!waterDraft&&(isSelectedLake||isSelectedSea)&&<>{' '}<button type="button" className="direct-value" data-water-shore onClick={()=>startWaterDraft(waterKindAt(hexTerrainByKey,selectedHexKey))}>{language==='ru'?'Изменить берег':'Change shore'}</button></>}
    </div>
    {waterDraft&&<div data-water-draft>
      <p><label>{language==='ru'?'Изменить на':'Change to'} <select aria-label={language==='ru'?'Вода в черновике':'Draft water'} aria-describedby={waterPreview?.error||editError?'water-edit-error':undefined} aria-invalid={!!(waterPreview?.error||editError)} value={waterDraft.edit.target} onChange={e=>changeWaterDraft(waterDraft,{edit:{target:e.target.value as WaterKind,hexKeys:waterDraft.edit.hexKeys},options:{},preview:false})}>
        {(['land','lake','sea'] as const).map(kind=><option value={kind} key={kind}>{waterKindLabel(kind)}</option>)}
      </select></label> · {language==='ru'?'Клеток':'Cells'}: {waterDraft.edit.hexKeys.length}</p>
      <p>{language==='ru'?'Выберите клетки на карте. Enter — завершить, Esc — сбросить.':'Choose cells on the map. Enter finishes; Esc resets.'}</p>
      <label className="water-cell-picker">{language==='ru'?'Клетка':'Cell'} <select value="" aria-label={language==='ru'?'Добавить или убрать клетку':'Add or remove cell'} onChange={e=>e.target.value&&toggleWaterHex(e.target.value,waterDraft)}>
        <option value="">{language==='ru'?'Выбрать по координатам':'Choose by coordinates'}</option>
        {[...actualHexKeys(captureMap())].sort(compareWaterHexes).map(key=><option key={key} value={key}>{key}{waterDraft.edit.hexKeys.includes(key)?' ✓':''}</option>)}
      </select></label>
      <div className="water-cell-list">{waterDraft.edit.hexKeys.slice().sort(compareWaterHexes).slice(0,12).map(key=><button className="direct-value" key={key} aria-label={`${language==='ru'?'Убрать гекс':'Remove hex'} ${key}`} onClick={()=>toggleWaterHex(key,waterDraft)}>{key} ×</button>)}</div>
      {waterDraft.edit.hexKeys.length>12&&<details className="water-more-cells"><summary>{language==='ru'?'Остальные клетки':'More cells'} · {waterDraft.edit.hexKeys.length-12}</summary><div className="water-cell-list">{waterDraft.edit.hexKeys.slice().sort(compareWaterHexes).slice(12).map(key=><button type="button" className="direct-value" key={key} aria-label={`${language==='ru'?'Убрать гекс':'Remove hex'} ${key}`} onClick={()=>toggleWaterHex(key,waterDraft)}>{key} ×</button>)}</div></details>}
      {waterKindAt(hexTerrainByKey,waterDraft.originKey)!=='land'&&<button type="button" className="direct-value" data-water-whole onClick={()=>selectWholeWaterBody(waterDraft)}>{language==='ru'?'Весь водоём':'Whole body'}</button>}
      {waterPreview?.geometry?.choices.map(choice=><div className="direct-line" key={`${choice.type}:${choice.key}`}>
        {choice.type==='kind'?<label>{choice.reason==='enclosed'?(language==='ru'?'Получится замкнутое озеро':'This will be an enclosed lake'):(language==='ru'?'Соединяется весь водоём':'The whole body joins')} · {choice.hexKeys.length} <select aria-label={`${language==='ru'?'Вид водоёма':'Body type'} ${choice.key}`} value={waterDraft.edit.componentKinds?.[choice.key]??''} onChange={e=>changeWaterChoice(waterDraft,'componentKinds',choice.key,e.target.value)}><option value="">{language==='ru'?'Выберите вид':'Choose type'}</option>{choice.allowed.map(kind=><option value={kind} key={kind}>{waterKindLabel(kind)}</option>)}</select></label>
        :choice.type==='region'?<label>{language==='ru'?'Регион возвращаемых клеток':'Region of reclaimed cells'} · {choice.hexKeys.join('; ')} <select aria-label={`${language==='ru'?'Регион возвращаемой воды':'Region of reclaimed water'} ${choice.key}`} value={waterDraft.edit.regionAssignments?.[choice.key]??''} onChange={e=>changeWaterChoice(waterDraft,'regionAssignments',choice.key,e.target.value)}><option value="">{language==='ru'?'Выберите регион':'Choose region'}</option>{choice.allowed.map(id=><option key={id} value={id}>{waterName(`region:${id}`)}</option>)}</select></label>
        :choice.type==='merge'?<label>{language==='ru'?'Сохранить озеро при объединении':'Keep lake when joining'} <select aria-label={`${language==='ru'?'Сохраняемое озеро':'Retained lake'} ${choice.key}`} value={waterDraft.edit.mergeKeep?.[choice.key]??''} onChange={e=>changeWaterChoice(waterDraft,'mergeKeep',choice.key,e.target.value)}><option value="">{language==='ru'?'Выберите озеро':'Choose lake'}</option>{choice.allowed.map(id=><option value={id} key={id}>{waterName(`lake:${id}`)}</option>)}</select></label>
        :<label>{language==='ru'?'Сохранить имя и теги':'Keep name and tags'} «{waterName(`lake:${choice.lakeId}`)}» <select aria-label={`${language==='ru'?'Часть сохраняемого озера':'Part retaining lake identity'} ${choice.lakeId}`} value={choice.value} onChange={e=>changeWaterChoice(waterDraft,'splitKeep',choice.key,e.target.value)}>{choice.allowed.map(key=><option value={key} key={key}>{language==='ru'?'Часть у гекса':'Part at hex'} {key}</option>)}</select></label>}
      </div>)}
      {waterPreview?.plan?.sea.choices.map(choice=><div className="direct-line" key={`sea:${choice.type}:${choice.key}`}>
        {choice.type==='split'?<label>{language==='ru'?'Где сохранить имя моря':'Part retaining sea name'} · {waterName(`sea:${choice.seaId}`)} (#{choice.seaId}) <select data-sea-split={choice.seaId} aria-label={`${language==='ru'?'Часть сохраняемого моря':'Part retaining sea identity'} ${choice.seaId}`} value={waterDraft.options.seaSplitKeep?.[choice.key]??(choice.required?'':choice.value)} onChange={e=>changeSeaChoice(waterDraft,'seaSplitKeep',choice.key,e.target.value)}>
          {choice.required&&<option value="">{language==='ru'?'Выберите часть':'Choose part'}</option>}{choice.allowed.map(key=><option value={key} key={key}>{language==='ru'?'Часть у гекса':'Part at hex'} {key} · {waterPreview.plan!.map.seas.find(s=>s.hexKeys.includes(key))?.hexKeys.length} {language==='ru'?'гекса':'cells'}</option>)}
        </select></label>:<label>{language==='ru'?'Сохранить море при слиянии':'Keep sea when joining'} <select data-sea-merge={choice.key} aria-label={`${language==='ru'?'Сохраняемое море':'Retained sea'} ${choice.key}`} value={waterDraft.options.seaMergeKeep?.[choice.key]??(choice.required?'':choice.value)} onChange={e=>changeSeaChoice(waterDraft,'seaMergeKeep',choice.key,e.target.value)}>
          {choice.required&&<option value="">{language==='ru'?'Выберите море':'Choose sea'}</option>}{choice.allowed.map(id=><option value={id} key={id}>{waterName(`sea:${id}`)} (#{id})</option>)}
        </select></label>}
      </div>)}
      {waterPreview?.plan?.losses.map(loss=><label className="water-loss" key={loss.id}><input type="checkbox" data-water-loss={loss.id} checked={waterDraft.options.acceptedLosses?.includes(loss.id)??false} onChange={e=>changeWaterDraft(waterDraft,{options:{...waterDraft.options,acceptedLosses:e.target.checked?[...waterDraft.options.acceptedLosses??[],loss.id]:(waterDraft.options.acceptedLosses??[]).filter(id=>id!==loss.id)},preview:true})}/>{' '}{waterLossText(loss)}</label>)}
      {waterPreview?.plan?.newCrossings.map(c=><label className="direct-line" key={c.key}>{language==='ru'?'Новая переправа':'New crossing'} · {waterName(`river:${c.riverId}`)} · {language==='ru'?'путь':'path'} {c.roadId} <select data-water-crossing={c.key} aria-label={`${language==='ru'?'Вид новой переправы':'New crossing type'} ${c.key}`} value={waterDraft.options.crossingKinds?.[c.key]??''} onChange={e=>e.target.value&&changeWaterDraft(waterDraft,{options:{...waterDraft.options,crossingKinds:{...waterDraft.options.crossingKinds,[c.key]:e.target.value as RiverCrossingKind}},preview:true})}><option value="">{language==='ru'?'Выберите':'Choose'}</option>{(['bridge','ferry','ford'] as const).map(kind=><option key={kind} value={kind} disabled={kind==='ford'&&Number(knownRiverEdgeFullness(rivers.find(r=>r.id===c.riverId)!,c.riverEdgeKey))>=3}>{t[kind]}</option>)}</select></label>)}
      {waterPreview?.plan?.invalidFeatures.map((feature,i)=><label className="direct-line" key={i}>{waterFeatureText(feature)} <select data-water-feature={i} aria-label={waterFeatureText(feature)} value={waterDraft.options.featureEdits?.find(e=>e.type===feature.type&&(e.type==='rapid'&&feature.type==='rapid'?e.riverId===feature.riverId&&e.edgeKey===feature.edgeKey:e.type==='waterfall'&&feature.type==='waterfall'&&e.vertexKey===feature.vertexKey))?.state??''} onChange={e=>e.target.value&&waterFeatureChoice(waterDraft,feature,e.target.value as 'auto'|'off')}><option value="">{language==='ru'?'Снять ручное включение':'Resolve manual On'}</option><option value="off">{language==='ru'?'Нет':'Off'}</option><option value="auto">{language==='ru'?'Авто':'Auto'}</option></select></label>)}
      {waterDraft.preview&&<p>{language==='ru'?'Заметки гексов сохранятся. Названия и теги, не перечисленные выше, останутся прежними.':'Hex notes will be retained. Names and tags not listed above will stay unchanged.'}</p>}
      {(waterPreview?.error||editError)&&<p role="alert" id="water-edit-error" className="direct-error" data-water-error>{waterPreview?.error||editError}</p>}
      <div className="water-actions"><button type="button" className="secondary" data-water-finish onClick={()=>finishWaterDraft(waterDraft)}>{language==='ru'?'Завершить выделение':'Finish selection'}</button>
      {waterDraft.preview&&<button type="button" data-water-confirm disabled={!waterPreview?.plan||!!waterPreview.plan.sea.unresolved.length||!!waterPreview.plan.geometry.unresolved.length||!!waterPreview.plan.unresolvedLosses.length||!!waterPreview.plan.unresolvedFeatures.length||!!waterPreview.plan.unresolvedCrossings.length} onClick={()=>finishWaterDraft(waterDraft,true)}>{language==='ru'?'Подтвердить изменение':'Confirm change'}</button>}
      <button type="button" className="secondary" data-water-reset onClick={()=>resetWaterDraft(waterDraft)}>{language==='ru'?'Сбросить':'Reset draft'}</button></div>
    </div>}
  </div>:null;
  // Pointer-down ends a valid field before the ensuing click reads the new render.
  // Invalid input keeps focus and prevents the action; no modal or Save workflow.
  const finishBeforePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if((event.target as Element).closest('[data-myth-material]')){guardMaterialRead(event);return;}
    if (!nameDraftRef.current || (event.target as Element).closest('[data-inline-name]')) return;
    if (!finishInlineName()) { event.preventDefault(); event.stopPropagation(); nameFocusRef.current?.focus(); }
  };

  if (debugRivers && selectedRegion && selectedCandidateBoundaryDebug) {
    generationLog.detail('Candidate boundary debug', {
      regionId: selectedRegion.id,
      regionHexesLength: selectedRegion.hexes.length,
      candidateBoundaryEdgesLength: selectedCandidateBoundaryDebug.edges.length,
      candidateBoundaryVerticesLength: selectedCandidateBoundaryDebug.vertices.length,
      edgeKeys: selectedCandidateBoundaryDebug.edgeKeys,
      vertexKeys: selectedCandidateBoundaryDebug.vertexKeys
    });
  }

  // Artwork is independent of panel selection; candidate actions always use current options.
  const mapHexClickRef = useRef<(hex: typeof positionedHexes.hexes[number],event?:MouseEvent<SVGGElement>) => void>(() => {});
  mapHexClickRef.current = (hex,event) => {
    if (regionDraftRef.current!==regionDraft || documentBusy()||knaveDraftRef.current) return;
    if((poiDraftRef.current||regionDraftRef.current||waterDraftRef.current||riverDraftRef.current)&&riverDraftGesture.current?.moved&&event)return;
    const moving=poiDraftRef.current;
    if(moving){if(!currentPoiDraft(moving))return;const hits=event?[...new Set(document.elementsFromPoint(event.clientX,event.clientY).filter(e=>e.matches('polygon.hex[data-hex-key]')).map(e=>e.getAttribute('data-hex-key')!).filter(k=>actualHexKeys(captureMap()).has(k)))]:[hex.key];
      if(hits.length>1){updatePoiDraft({...moving,ambiguous:hits});setIsSidePanelCollapsed(false);return;}
      if(hits.length!==1){updatePoiDraft({...moving,q:'',r:'',ambiguous:[]});setEditError(poiCommandError(new PoiMoveError('unknown_poi_target')));return;}
      const [q,r]=hits[0].split(',');changePoiTarget(q,r,moving);return;
    }
    const regionEdit=regionDraftRef.current;
    if(regionEdit){
      if(!currentRegionDraft(regionEdit))return;
      if(regionEdit.edit.type!=='transfer_hex'){setEditError(language==='ru'?'Завершите правку кнопкой «Готово» или сбросьте её клавишей Esc.':'Use Done to finish this edit or Esc to discard it.');return;}
      const hits=event?[...new Set(document.elementsFromPoint(event.clientX,event.clientY).filter(e=>e.matches('polygon.hex[data-hex-key]')).map(e=>metadataMap.get(e.getAttribute('data-hex-key')??'')?.regionId).filter((id):id is number=>id!==undefined&&regionTargets.some(r=>r.id===id)))]:[];
      if(hits.length>1){updateRegionDraft({...regionEdit,ambiguousRegionIds:hits});setEditError(language==='ru'?'Здесь несколько целей. Выберите регион в списке.':'Several targets overlap here. Choose a region from the list.');setIsSidePanelCollapsed(false);return;}
      const id=hits[0]??metadataMap.get(hex.key)?.regionId;
      if(id===undefined||!selectRegionTarget(id,regionEdit))setEditError(language==='ru'?'Выберите соседний регион на карте или в списке.':'Choose an adjacent region on the map or in the list.');
      return;
    }
    if(waterDraftRef.current){toggleWaterHex(hex.key);return;}
    if(roadDraftRef.current){appendRoadDraft({q:hex.q,r:hex.r});return;}
    if (hex.kind === 'candidate') {
      updateObstacleDraft(null);
      if (mutationBlocked()) return;
      trackGoal('region_add');
      if (!kingdomJob) {
        generateAt({ q: hex.q, r: hex.r });
      }
    } else {
      if(regionDraftRef.current||roadFeatureResolutionRef.current||riverCommandPreviewRef.current||riverDraftRef.current&&!finishRiverDraft())return;
      if (!finishInlineName()) return;
      const pendingObstacle=obstacleDraftRef.current;
      finishNotesGroup(); closeEditors(); updateObstacleDraft(pendingObstacle); clearNotesDraft();
      setSelectedRoadPair(null); setSelectedRoadTarget(null); setConfirmRoadRemoval(null);
      setSelectedHex({ q: hex.q, r: hex.r });
    }
  };
  // A feature target is explicit and local to the selected hex. It never falls
  // back to a region centre, the first path edge, or an arbitrary junction.
  const chooseRiverFeatureTarget=(target:RiverFeatureTarget)=>{
    if(!editMode||notesComposingRef.current||!finishInlineName()||mutationBlocked()||obstacleDraftRef.current||target.hexKey!==selectedHexKey)return;
    closeEditors();setRiverFeatureTarget(target);
  };
  const riverLabel=(id:number)=>nameTargets.find(t=>t.key===`river:${id}`)?.[language]??`${language==='ru'?'Река':'River'} ${id}`;
  const riverPlace=(river:River)=>{
    const all=regions.flatMap(r=>r.hexes);
    if(river.vertexPath.length===2){const edge=edgeKey(...river.vertexPath as [RiverVertex,RiverVertex]),adjacent=all.filter(h=>getHexEdgeKeys(h).has(edge));if(adjacent.length>1)return `${language==='ru'?'Между гексами':'Between hexes'} ${adjacent.map(hexKey).join(' ↔ ')}`;}
    const ends=river.vertexPath.length?[river.vertexPath[0],river.vertexPath[river.vertexPath.length-1]].map(v=>all.find(h=>getHexCornerPoints(h).some(p=>p.key===v.key))).filter((h):h is AxialHex=>!!h):[];
    const keys=[...new Set(ends.map(hexKey))];return keys.length>1?`${language==='ru'?'У гексов':'Beside hexes'} ${keys.join(' → ')}`:`${language==='ru'?'Участок у гекса':'Edge beside hex'} ${keys[0]??'—'}`;
  };
  const chooseMapRiver=(target:RiverFeatureTarget)=>{
    if(!editMode||poiDraftRef.current||regionDraftRef.current||documentBusy()||riverDraftRef.current||riverCommandPreviewRef.current||roadDraftRef.current||obstacleDraftRef.current||notesComposingRef.current||!finishInlineName())return false;
    const river=rivers.find(r=>r.id===target.riverId),hex=regions.flatMap(r=>r.hexes).find(h=>hexKey(h)===target.hexKey);
    if(!river||!hex||target.edgeKey&&!getHexEdgeKeys(hex).has(target.edgeKey))return false;
    finishNotesGroup();clearNotesDraft();closeEditors();setSelectedHex({...hex});setRiverFeatureTarget(target);setIsSidePanelCollapsed(false);return true;
  };
  const riverMapTargets=editMode?rivers.flatMap(r=>r.vertexPath.slice(1).flatMap((b,i)=>{const a=r.vertexPath[i],key=edgeKey(a,b),hex=regions.flatMap(r=>r.hexes).find(h=>getHexEdgeKeys(h).has(key));return hex?[{riverId:r.id,hexKey:hexKey(hex),edgeKey:key,a,b}]:[];})):[];
  const activateMapRiver=(event:React.MouseEvent<SVGLineElement>,target:RiverFeatureTarget)=>{
    event.stopPropagation();if(riverDraftGesture.current?.moved)return;
    if(event.detail===0){chooseMapRiver(target);return;}
    const nodes=event.currentTarget.parentElement?.querySelectorAll<SVGLineElement>('[data-river-map-edge]')??[];
    const hits=Array.from(nodes).filter(node=>{const matrix=node.getScreenCTM();return matrix&&node.isPointInStroke(new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()));});
    const choices=hits.flatMap(node=>{const hit=riverMapTargets.find(t=>`${t.riverId}:${t.edgeKey}`===node.dataset.riverMapEdge);return hit?[{riverId:hit.riverId,edgeKey:hit.edgeKey,hexKey:hit.hexKey}]:[];});
    const matrix=event.currentTarget.getScreenCTM(),point=matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()):null;
    const roadHits=point?roadSegments.filter(s=>{const dx=s.x2-s.x1,dy=s.y2-s.y1,t=Math.max(0,Math.min(1,((point.x-s.x1)*dx+(point.y-s.y1)*dy)/(dx*dx+dy*dy)));return Math.hypot(point.x-s.x1-t*dx,point.y-s.y1-t*dy)<=22/mapScaleRef.current;}).map(s=>({roadId:s.roadId,pair:s.segmentKey})):[];
    if(choices.length>1||roadHits.length){setRiverHitChoices(choices);setRiverRoadHitChoices(roadHits);setIsSidePanelCollapsed(false);setEditError(language==='ru'?'Здесь несколько объектов. Выберите нужный участок.':'Several objects overlap. Choose the intended edge.');return;}
    if(choices[0])chooseMapRiver(choices[0]);
  };
  const riverReachKeys=(()=>{
    const target=riverFeatureTarget,river=rivers.find(r=>r.id===target?.riverId);
    if(!target?.edgeKey||!river)return new Set<string>();
    const context=buildManualRiverGeometryContext(captureMap()),index=river.vertexPath.slice(1).findIndex((v,i)=>edgeKey(river.vertexPath[i],v)===target.edgeKey);
    if(index<0)return new Set<string>();let left=index,right=index+1;
    while(left>0&&!context.event(river.vertexPath[left].key,rivers))left--;
    while(right<river.vertexPath.length-1&&!context.event(river.vertexPath[right].key,rivers))right++;
    return new Set(river.vertexPath.slice(left+1,right+1).map((v,i)=>edgeKey(river.vertexPath[left+i],v)));
  })();
  const riverFeaturePanel=(river:River)=>{
    const target=riverFeatureTarget;
    if(!editMode||waterDraft||riverDraft||roadDraft||obstacleDraft||target?.riverId!==river.id||target.hexKey!==selectedHexKey)return null;
    const edges=river.vertexPath.slice(1).map((v,i)=>({key:edgeKey(river.vertexPath[i],v),index:i+1})).filter(e=>selectedHexEdgeKeys.has(e.key));
    const vertices=river.vertexPath.map((v,i)=>({key:v.key,index:i+1})).filter(v=>selectedHexVertexKeys.has(v.key));
    const eligibility=riverFeatureEligibility(rivers,regions,hexTerrainByKey,crossings);
    const change=(edit:FeatureEdit)=>{
      if(target!==riverFeatureTargetRef.current||notesComposingRef.current||target.hexKey!==notesSelectionRef.current)return;
      if(editRiverFeatures([edit],renderedDocumentRevision))setRiverFeatureTarget(target);
    };
    const control=(type:'rapid'|'waterfall',key:string)=>{
      const rapid=type==='rapid',label=rapid?t.rapids:waterfallLabel;
      const state=rapid?riverFeatureOverrides.rapids.find(e=>e.riverId===river.id&&e.edgeKey===key)?.state:riverFeatureOverrides.waterfalls.find(e=>e.vertexKey===key)?.state;
      const onAllowed=rapid?eligibility.rapid(river.id,key):eligibility.waterfall(key);
      const effective=rapid?rapidRiverEdgeKeys.has(key):waterfallRiverVertexKeys.has(key);
      return <div className="river-feature-control" role="group" aria-label={label}>{label} <select className="direct-value" aria-label={label} value={state??'auto'}
        onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();event.currentTarget.blur();document.querySelector<HTMLButtonElement>(`[data-river-choice="${river.id}"]`)?.focus();}}}
        onChange={event=>change(rapid?{type:'rapid',riverId:river.id,edgeKey:key,state:event.target.value as FeatureEdit['state']}:{type:'waterfall',vertexKey:key,state:event.target.value as FeatureEdit['state']})}>
        <option value="auto">{language==='ru'?'Авто':'Auto'}</option><option value="on" disabled={!onAllowed}>{language==='ru'?'Есть':'On'}</option><option value="off">{language==='ru'?'Нет':'Off'}</option>
      </select> <span>{language==='ru'?(effective?'Есть':'Нет'):(effective?'Present':'Absent')} ({state?(language==='ru'?'вручную':'manual'):(language==='ru'?'авто':'auto')})</span>
      {!onAllowed&&<span className="river-feature-reason">{rapid?(crossings.some(c=>c.riverId===river.id&&c.riverEdgeKey===key)?(language==='ru'?'На участке есть переправа.':'This edge has a crossing.'):(language==='ru'?'Участок скрыт водой.':'This edge is hidden by water.')):rivers.some(r=>r.vertexPath[0]?.key===key)?(language==='ru'?'Водопад недопустим в начале реки.':'A waterfall cannot start a river.'):(language==='ru'?'Вершина у воды или в месте слияния.':'The vertex touches water or a confluence.')}</span>}</div>;
    };
    const choice=target.edgeKey;
    const currentF=choice?knownRiverEdgeFullness(river,choice):undefined;
    const availableF=choice?[1,2,3,4,5].map(f=>{try{prepareRiverMapEdit(captureMap(),{type:'fullness',riverId:river.id,edgeKey:choice,fullness:f as RiverFullness},{},true);return {f,reason:null};}catch(error){return {f,reason:riverCommandError(error)};}}):[];
    return <><div className="river-command-editor" data-river-command-editor={river.id}>
      {choice?<><label>{language==='ru'?'Полноводность':'Fullness'} <select className="direct-value" aria-label={language==='ru'?'Полноводность':'Fullness'} value={currentF??''} onChange={event=>requestRiverCommand({type:'fullness',riverId:river.id,edgeKey:choice,fullness:Number(event.target.value) as RiverFullness})} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();event.currentTarget.blur();}}}>
        {currentF===undefined&&<option value="">{language==='ru'?'Неизвестна':'Unknown'}</option>}{availableF.map(v=><option key={v.f} value={v.f} disabled={!!v.reason}>{v.f}{v.reason?` · ${v.reason}`:''}</option>)}
      </select></label><span>{language==='ru'?'Весь подсвеченный участок':'Entire highlighted reach'}</span>
</>:<span>{language==='ru'?'Выберите участок для изменения полноводности.':'Choose an edge to change fullness.'}</span>}
      <div className="river-command-actions"><button type="button" className="direct-value" data-river-reverse onClick={()=>requestRiverCommand({type:'reverse',riverId:river.id})}>{language==='ru'?'Развернуть реку':'Reverse river'} →</button>
      <button type="button" className="direct-value" data-river-replace onClick={()=>startRiverDraft(river.id)}>{language==='ru'?'Русло':'Route'}</button>
      <button type="button" className="direct-value" data-river-remove onClick={()=>requestRiverCommand({type:'remove',riverId:river.id,includeArms:true})}>{language==='ru'?'Удалить реку':'Delete river'}</button></div>
    </div><div className="river-feature-editor" data-river-feature-editor={river.id} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setRiverFeatureTarget(null);document.querySelector<HTMLButtonElement>(`[data-river-choice="${river.id}"]`)?.focus();}}}>
      {!target.edgeKey&&!target.vertexKey&&<span>{language==='ru'?'Выберите участок или вершину рядом с гексом':'Choose an edge or vertex beside this hex'}</span>}
      <div className="river-feature-places">{edges.map(e=><button type="button" className="direct-value" key={e.key} aria-pressed={target.edgeKey===e.key} data-river-edge-choice={e.key} onClick={()=>chooseRiverFeatureTarget({...target,edgeKey:e.key,vertexKey:undefined})}>{language==='ru'?'Участок':'Edge'} {e.index} →</button>)}
      {vertices.map(v=><button type="button" className="direct-value" key={v.key} aria-pressed={target.vertexKey===v.key} data-river-vertex-choice={v.key} onClick={()=>chooseRiverFeatureTarget({...target,vertexKey:v.key,edgeKey:undefined})}>{language==='ru'?'Вершина':'Vertex'} {v.index}</button>)}</div>
      {target.edgeKey&&edges.some(e=>e.key===target.edgeKey)&&control('rapid',target.edgeKey)}
      {target.vertexKey&&vertices.some(v=>v.key===target.vertexKey)&&control('waterfall',target.vertexKey)}
    </div></>;
  };
  const obstacleContext = () => ({
    exists:(h:AxialHex)=>hexTerrainByKey.has(hexKey(h))||regions.some(r=>r.hexes.some(v=>isSameHex(v,h))),
    water:(h:AxialHex)=>isLakeHex(h,hexTerrainByKey)||isSeaHex(h,hexTerrainByKey),
    edgeKey:(a:AxialHex,b:AxialHex)=>{const e=getSharedHexEdgeVertexKeys(a,b);return e?[...e].sort().join('|'):undefined;},
    riverEdges:new Set(rivers.flatMap(r=>r.vertexPath.slice(1).map((v,i)=>getRiverEdgeKey(r.vertexPath[i],v)))),
    roadPairs:new Set(roads.flatMap(r=>r.segments.map(v=>pairKey(v.from,v.to)))),kingdoms
  });
  const obstacleMessage = (error:unknown) => {
    const authored=authoredNameError(error,language);if(authored)return authored;
    const code=error instanceof Error?error.message:'';
    const messages:Record<string,[string,string]>={
      unknown_obstacle_hex:['Гекс ещё не создан','Hex does not exist'],water_obstacle_edge:['Вода','Water'],
      river_obstacle_edge:['Река','River'],road_obstacle_edge:['Дорога или тропа','Road or trail'],
      occupied_obstacle_edge:['Ребро занято','Edge occupied'],obstacle_id_overflow:['Исчерпан счётчик','ID counter exhausted'],
      stale_obstacle_selection:['Препятствие уже изменено','Barrier has changed']};
    return messages[code]?.[language==='ru'?0:1]??(language==='ru'?'Цель недоступна':'Target unavailable');
  };
  const editObstacleDocument = (edit:ObstacleEdit, expected?:ObstacleDraft):boolean => {
    if(!editMode||mutationBlocked())return false;
    if(expected&&(obstacleDraftRef.current!==expected||expected.revision!==documentRevision.current)){
      updateObstacleDraft(null);setEditError(language==='ru'?'Карта изменилась. Выберите препятствие снова.':'Map changed. Select the barrier again.');return false;
    }
    try{
      const doc={obstacles,nextObstacleId},prepared=prepareObstacleEdit(doc,edit,obstacleContext());
      if(prepared===doc){setIsSidePanelCollapsed(false);if(edit.type==='move'){obstacleReturnFocus.current=edit.id;setSelectedObstacleId(edit.id);}updateObstacleDraft(null);return true;}
      const before=captureDocument();let editorNames=before.map.editorNames;
      if(edit.type==='remove'&&editorNames[`obstacle:${edit.id}`]){
        const name=editorNames[`obstacle:${edit.id}`];
        if(!window.confirm(language==='ru'?`Удалить препятствие с именем «${name.ru}»? Отмена восстановит и объект, и имя.`:`Delete the barrier named “${name.en}”? Undo restores both the object and its name.`))return false;
        editorNames=Object.fromEntries(Object.entries(editorNames).filter(([key])=>key!==`obstacle:${edit.id}`));
      }
      const after=copyDocument({...before,map:{...before.map,...prepared,editorNames}});
      recordTransaction(before,after);applyExactMap(after.map);closeEditors();
      setIsSidePanelCollapsed(false);
      const focusId=edit.type==='remove'?'nearby':edit.type==='move'?edit.id:prepared.nextObstacleId-1;
      setSelectedObstacleId(typeof focusId==='number'?focusId:null);obstacleReturnFocus.current=focusId;
      return true;
    }catch(error){setEditError(obstacleMessage(error));return false;}
  };
  const cancelObstacleChoice = () => {setIsSidePanelCollapsed(false);obstacleReturnFocus.current=obstacleDraftRef.current?.id??'add';updateObstacleDraft(null);};
  const startObstacleChoice = (id:number|null) => {
    if(!finishInlineName()||mutationBlocked())return;
    finishNotesGroup();closeEditors();setSelectedRoadTarget(null);setConfirmRoadRemoval(null);
    setSelectedObstacleId(id);updateObstacleDraft({id,revision:documentRevision.current});
  };
  const chooseObstacle = (id:number) => {
    if(documentBusy()||!finishPathDrafts()||!finishInlineName())return;
    const obstacle=obstacles.find(o=>o.id===id);if(!obstacle)return;
    finishNotesGroup();clearNotesDraft();closeEditors();setSelectedRoadPair(null);setSelectedRoadTarget(null);setConfirmRoadRemoval(null);
    setIsSidePanelCollapsed(false);obstacleReturnFocus.current=id;setSelectedHex({...obstacle.hex});setSelectedObstacleId(id);
  };
  // Resolve physical pointer geometry before trusting the browser's topmost target.
  // Explicit keyboard/assistive activation already identifies one focused target.
  const activateObstaclePointer = (event:React.MouseEvent<SVGCircleElement>,action:()=>void) => {
    event.stopPropagation();
    if(event.detail===0){action();return;}
    const group=event.currentTarget.parentElement?.closest('[data-editor-only="obstacles"]');
    const hits=Array.from(group?.querySelectorAll<SVGCircleElement>('.obstacle-map-target')??[]).filter(node=>{
      const matrix=node.getScreenCTM();if(!matrix)return false;
      const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      return node.isPointInFill(point);
    });
    if(hits.length<=1){action();return;}
    setIsSidePanelCollapsed(false);setHoverObstacleEdge(null);
    if(obstacleDraftRef.current){obstacleReturnFocus.current='edges';}
    else{setAmbiguousObstacleIds(hits.map(node=>Number(node.dataset.obstacleMapId)));obstacleReturnFocus.current='ambiguity';}
    setEditError(language==='ru'?'Здесь несколько рёбер. Выберите нужное в списке.':'Several edges overlap here. Choose the intended one in the list.');
  };
  const obstacleGeometry = (o:Pick<EditableObstacle,'hex'|'edgeKey'>) => getHexEdgesAsVertexPairs(o.hex).find(e=>e.edgeKey===o.edgeKey);
  const obstacleChoices = selectedHex&&obstacleDraft ? [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([q,r])=>{
    const neighborHex={q:selectedHex.q+q,r:selectedHex.r+r};
    const edit:ObstacleEdit=obstacleDraft.id===null?{type:'add',hex:selectedHex,neighborHex}:{type:'move',id:obstacleDraft.id,hex:selectedHex,neighborHex};
    try{const prepared=prepareObstacleEdit({obstacles,nextObstacleId},edit,obstacleContext());
      const o=prepared.obstacles.find(v=>v.id===(obstacleDraft.id??nextObstacleId));
      return {neighborHex,edit,reason:null,kingdomId:o?.kingdomId};
    }catch(error){return {neighborHex,edit,reason:obstacleMessage(error),kingdomId:undefined};}
  }):[];
  const obstaclePanel = editMode&&!poiDraft&&!regionDraft&&!waterDraft&&(selectedHex||ambiguousObstacleIds.length>0)&&!roadDraft ? <div className="obstacle-editor" data-obstacle-editor>
    {ambiguousObstacleIds.length>0?<div data-obstacle-ambiguity>{ambiguousObstacleIds.map(id=>{const o=obstacles.find(v=>v.id===id);return o?<button type="button" className="secondary" key={id} onClick={()=>chooseObstacle(id)}>{language==='ru'?'Препятствие':'Barrier'} {id}: {hexKey(o.hex)} → {hexKey(o.neighborHex)}</button>:null;})}</div>:!obstacleDraft?<button type="button" className="secondary" data-obstacle-add onClick={()=>startObstacleChoice(null)}>{language==='ru'?'Добавить препятствие':'Add barrier'}</button>:<>
      <p>{obstacleDraft.id===null?(language==='ru'?'Выберите ребро':'Choose an edge'):(language==='ru'?'Выберите новое ребро':'Choose a new edge')}</p>
      {obstacleChoices.map(c=><button type="button" className="secondary" key={hexKey(c.neighborHex)} disabled={!!c.reason}
        aria-label={`${language==='ru'?'Ребро':'Edge'} · ${obstacleDraft.id===null?(language==='ru'?'Добавить препятствие':'Add barrier'):(language==='ru'?'Перенести препятствие':'Move barrier')} ${selectedHexKey} → ${hexKey(c.neighborHex)}`}
        onClick={()=>editObstacleDocument(c.edit,obstacleDraft)}>
        {hexKey(c.neighborHex)} · {c.reason??(c.kingdomId===undefined?(language==='ru'?'без королевства':'no kingdom'):`${language==='ru'?'королевство':'kingdom'} ${c.kingdomId}`)}</button>)}
      <button autoFocus type="button" className="secondary" onClick={cancelObstacleChoice}>{language==='ru'?'Отменить выбор':'Cancel choice'}</button>
    </>}
  </div>:null;
  const draftError = (ru:string,en:string) => {setEditError(language==='ru'?ru:en);return false;};
  const startRiverDraft=(riverId?:number)=>{
    if(!editMode||notesComposingRef.current||!finishInlineName()||mutationBlocked()||obstacleDraftRef.current||!regions.length)return false;
    try{
      const map=checkedRiverMap(captureMap()),context=buildManualRiverGeometryContext(map);
      finishNotesGroup();clearNotesDraft();closeEditors();setSelectedRoadTarget(null);setConfirmRoadRemoval(null);
      if(riverId!==undefined&&!map.rivers.some(r=>r.id===riverId))return false;
      updateRiverDraft({path:[],riverId,revision:documentRevision.current,context,options:{}});return true;
    }catch(error){setEditError(riverCommandError(error));return false;}
  };
  const finishRiverDraft=(expected:RiverDraft|null=riverDraft)=>{
    const draft=riverDraftRef.current;
    if(!draft)return !expected;
    if(draft!==expected||draft.revision!==documentRevision.current||documentBusy())return draftError('Карта изменилась или занята. Сбросьте черновик.','Map changed or busy. Reset the draft.');
    if(draft.path.length<2)return draftError('Выберите начало и соседнюю вершину.','Choose a start and an adjacent vertex.');
    const owner=draft.context.edgeOwners(edgeKey(draft.path[0],draft.path[1]))[0];
    if(owner===undefined)return draftError('Участок вне созданной карты.','The edge is outside the created map.');
    if(riverCommandPreviewRef.current)return false;
    const original=draft.riverId===undefined?undefined:rivers.find(r=>r.id===draft.riverId);
    const edit:RiverEdit=original?{type:'replace',riverId:original.id,path:draft.path,regionId:original.regionId}:{type:'create',path:draft.path,regionId:owner};
    if(draft.riverId!==undefined&&!original)return false;
    if(!requestRiverCommand(edit,draft.options,draft))return false;
    updateRiverDraft(null);return true;
  };
  const finishPathDrafts=()=>{if(knaveDraftRef.current)return false;if(poiDraftRef.current){setEditError(language==='ru'?'Завершите перенос кнопкой «Готово» или отмените его клавишей Esc.':'Use Done to finish the move or Esc to discard it.');return false;}if(regionDraftRef.current){setEditError(language==='ru'?'Завершите правку кнопкой «Готово» или сбросьте её клавишей Esc.':'Use Done to finish this edit or Esc to discard it.');return false;}return finishWaterDraft()&&!roadFeatureResolutionRef.current&&!riverCommandPreviewRef.current&&finishRiverDraft()&&finishRoadDraft();};
  const resetRiverDraft=(expected:RiverDraft|null=riverDraft)=>{
    if(riverDraftRef.current!==expected)return false;
    updateRiverPreview(null);updateRiverDraft(null);setEditError(null);
    if(typeof document!=='undefined')setTimeout(()=>document.querySelector<HTMLButtonElement>(expected?.riverId?`[data-river-choice="${expected.riverId}"]`:'[data-add-river]')?.focus(),0);
    return true;
  };
  const appendRiverDraft=(key:string,expected:RiverDraft|null=riverDraft)=>{
    const draft=riverDraftRef.current;
    if(!draft||draft!==expected||draft.revision!==documentRevision.current||riverCommandPreviewRef.current||documentBusy())return false;
    const vertex=draft.context.vertex(key),path=draft.path,last=path[path.length-1];
    if(!vertex||(!last&&draft.context.geometry.seaVertices.has(key)))return draftError('Выберите подлинную вершину; море не может быть истоком.','Choose a real vertex; the sea cannot be a source.');
    if(last?.key===key)return finishRiverDraft(draft);
    if(path.length>1&&path[path.length-2].key===key){updateRiverDraft({...draft,path:path.slice(0,-1)});setEditError(null);return true;}
    if(path.some(v=>v.key===key))return draftError('Нельзя повторять вершину.','A vertex cannot be repeated.');
    if(last){
      const edge=edgeKey(last,vertex);
      if(!draft.context.edgeOwners(edge).length||draft.context.blocked(edge)||rivers.some(r=>r.id!==draft.riverId&&r.vertexPath.slice(1).some((v,i)=>edgeKey(r.vertexPath[i],v)===edge)))return draftError('Выберите соседнюю вершину по свободному ребру.','Choose an adjacent vertex along a free edge.');
      if(path.length>1&&rivers.some(r=>r.id!==draft.riverId&&r.vertexPath.some(v=>v.key===last.key)))return draftError('Завершите реку в точке связи.','Finish the river at the connection.');
    }
    updateRiverDraft({...draft,path:[...path,{...vertex}]});setEditError(null);return true;
  };
  const riverDraftVertices=riverDraft?[...riverDraft.context.geometry.vertices.values()].filter(v=>{
    const path=riverDraft.path,last=path[path.length-1];
    if(!last)return !riverDraft.context.geometry.seaVertices.has(v.key);
    if(v.key===last.key||path.length>1&&v.key===path[path.length-2].key)return true;
    if(path.some(p=>p.key===v.key)||path.length>1&&rivers.some(r=>r.id!==riverDraft.riverId&&r.vertexPath.some(p=>p.key===last.key)))return false;
    const edge=edgeKey(last,v);return riverDraft.context.edgeOwners(edge).length>0&&!riverDraft.context.blocked(edge)&&!rivers.some(r=>r.id!==riverDraft.riverId&&r.vertexPath.slice(1).some((p,i)=>edgeKey(r.vertexPath[i],p)===edge));
  }):[];
  const activateRiverDraftPointer=(event:React.MouseEvent<SVGCircleElement>,key:string,expected:RiverDraft)=>{
    event.stopPropagation();
    if(event.detail===0){appendRiverDraft(key,expected);return;}
    if(riverDraftGesture.current?.moved)return;
    const nodes=event.currentTarget.parentElement?.querySelectorAll<SVGCircleElement>('[data-river-draft-vertex]')??[];
    const hits=Array.from(nodes).filter(node=>{const matrix=node.getScreenCTM();return matrix&&node.isPointInFill(new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse()));});
    if(hits.length>1){setRiverDraftAmbiguity(hits.map(n=>n.dataset.riverDraftVertex!));setIsSidePanelCollapsed(false);setEditError(language==='ru'?'Здесь несколько вершин. Выберите нужную в списке.':'Several vertices overlap. Choose the intended vertex in the list.');return;}
    const hit=hits[0]?.dataset.riverDraftVertex;
    if(hit)appendRiverDraft(hit,expected);
  };
  const riverPreviewPlan=(()=>{if(!riverCommandPreview)return null;try{return {plan:prepareRiverMapEdit(captureMap(),riverCommandPreview.edit,riverCommandPreview.options,true),error:null};}catch(error){return {plan:null,error:riverCommandError(error)};}})();
  const changeRiverPreview=(options:RiverEditOptions,expected=riverCommandPreview)=>{
    if(!expected||expected!==riverCommandPreviewRef.current||expected.revision!==documentRevision.current||documentBusy())return;
    updateRiverPreview({...expected,options:{...expected.options,...options}});
  };
  const riverPreviewPanel=riverCommandPreview?<div className="river-command-preview" data-river-preview role="group" aria-label={language==='ru'?'Предпросмотр изменения реки':'River change preview'} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelRiverCommand(riverCommandPreview);}}}>
    <strong>{language==='ru'?'Предпросмотр':'Preview'} · {riverCommandPreview.edit.type==='create'?(language==='ru'?'Новая река':'New river'):riverLabel(riverCommandPreview.edit.riverId)}</strong>
    {riverPreviewPlan?.error&&<p role="alert">{riverPreviewPlan.error}</p>}
    {riverPreviewPlan?.plan&&(()=>{
      const plan=riverPreviewPlan.plan,edit=riverCommandPreview.edit,removed=plan.losses.removedRiverIds;
      const subject=edit.type==='create'?plan.map.rivers.find(r=>r.id===nextRiverId):plan.map.rivers.find(r=>r.id===edit.riverId);
      const affectedCrossings=[...crossings.filter(c=>!plan.map.crossings.some(n=>JSON.stringify(n)===JSON.stringify(c))),...plan.map.crossings.filter(c=>!crossings.some(n=>JSON.stringify(n)===JSON.stringify(c)))];
      const uniqueCrossings=[...new Map(affectedCrossings.map(c=>[c.key,c])).values()];
      const choices=plan.map.crossings.filter(c=>!crossings.some(old=>old.key===c.key)||plan.unresolvedCrossings.some(old=>old.key===c.key)||riverCommandPreview.options.crossingKinds?.[c.key]);
      const featureConflicts=[...plan.unresolvedFeatures,...(riverCommandPreview.options.featureEdits??[])];
      const tagsLost=tags.instances.filter(t=>t.owner.kind==='river'&&removed.includes(t.owner.id)).length;
      const arms=rivers.filter(r=>r.deltaParentRiverId!==undefined&&(removed.includes(r.id)||edit.type!=='create'&&(r.id===edit.riverId||r.deltaParentRiverId===edit.riverId)));
      return <>
        {subject&&<p>{riverPlace(subject)}{edit.type==='fullness'?` · ${language==='ru'?'Полноводность':'Fullness'} ${knownRiverEdgeFullness(rivers.find(r=>r.id===edit.riverId)!,edit.edgeKey)??'?'} → ${edit.fullness}`:edit.type==='reverse'?` · ${language==='ru'?'Направление меняется на обратное':'Direction reverses'}`:''}</p>}
        {subject&&edit.type==='replace'&&<p>{language==='ru'?'Владелец русла':'Route owner'}: {nameTargets.find(t=>t.key===`region:${subject.regionId}`)?.[language]??subject.regionId}</p>}
        {edit.type==='remove'&&<p>{removed.map(id=>`${riverLabel(id)} (${riverPlace(rivers.find(r=>r.id===id)!)})`).join('; ')}</p>}
        {!!(plan.losses.rapids+plan.losses.waterfalls)&&<p>{language==='ru'?'Удаляются ручные отметки':'Manual markers removed'}: {plan.losses.rapids+plan.losses.waterfalls}</p>}
        {!!removed.length&&<p>{language==='ru'?'Удаляются имена':'Names removed'}: {removed.length}{tagsLost?` · ${language==='ru'?'теги':'tags'}: ${tagsLost}`:''}</p>}
        {arms.map(arm=><p key={arm.id}>{riverLabel(arm.id)} · {riverPlace(arm)}</p>)}
        {uniqueCrossings.map(c=>{const proposed=plan.map.crossings.find(n=>n.key===c.key),old=crossings.find(n=>n.key===c.key),unresolved=plan.unresolvedCrossings.some(n=>n.key===c.key),choose=choices.some(n=>n.key===c.key);return <label className="river-feature-control" key={c.key}>{riverLabel(c.riverId)} · {c.roadSegmentKey.replace('|',' ↔ ')} · {old?t[old.kind]:(language==='ru'?'Нет переправы':'No crossing')} → {choose&&proposed?<select className="direct-value" data-river-crossing-choice={c.key} aria-label={`${language==='ru'?'Решение для переправы':'Crossing choice'} ${c.roadSegmentKey}`} value={unresolved?'':proposed.kind} onChange={event=>changeRiverPreview({crossingKinds:{...riverCommandPreview.options.crossingKinds,[c.key]:event.target.value as RiverCrossingKind}})}>
          {unresolved&&<option value="">{language==='ru'?'Выберите':'Choose'}</option>}<option value="bridge">{t.bridge}</option><option value="ferry">{t.ferry}</option><option value="ford" disabled={Number(knownRiverEdgeFullness(plan.map.rivers.find(r=>r.id===c.riverId)!,c.riverEdgeKey))>=3}>{t.ford}</option>
        </select>:proposed?t[proposed.kind]:(language==='ru'?'Удаляется':'Removed')}</label>;})}
        {featureConflicts.map((feature,i)=>{const choice=riverCommandPreview.options.featureEdits?.find(e=>e.type===feature.type&&(e.type==='rapid'&&feature.type==='rapid'?e.riverId===feature.riverId&&e.edgeKey===feature.edgeKey:e.type==='waterfall'&&feature.type==='waterfall'&&e.vertexKey===feature.vertexKey));return <label className="river-feature-control" key={i}>{feature.type==='rapid'?`${t.rapids} · ${riverLabel(feature.riverId)}`:waterfallLabel} · {feature.type==='rapid'?riverPlace(plan.map.rivers.find(r=>r.id===feature.riverId)!):(language==='ru'?'вершина реки':'river vertex')} <select className="direct-value" data-river-marker-choice aria-label={`${language==='ru'?'Конфликт отметки':'Marker conflict'} ${i+1}`} value={choice?.state??''} onChange={event=>{const state=event.target.value as 'auto'|'off';changeRiverPreview({featureEdits:[...(riverCommandPreview.options.featureEdits??[]).filter(e=>e!==choice),{...feature,state}]});}}><option value="">{language==='ru'?'«Есть» недопустимо — выберите':'On is invalid — choose'}</option><option value="auto">{language==='ru'?'Авто':'Auto'}</option><option value="off">{language==='ru'?'Нет':'Off'}</option></select></label>;})}
      </>;
    })()}
    <div className="river-command-actions"><button autoFocus type="button" className="direct-value" data-river-confirm disabled={!riverPreviewPlan?.plan||!!riverPreviewPlan.plan.unresolvedCrossings.length||!!riverPreviewPlan.plan.unresolvedFeatures.length} onClick={()=>confirmRiverCommand(riverCommandPreview)}>{riverCommandPreview.edit.type==='remove'?(language==='ru'?`Удалить реку${(riverPreviewPlan?.plan?.losses.removedRiverIds.length??0)>1?` с ${(riverPreviewPlan?.plan?.losses.removedRiverIds.length??1)-1} рукавами`:''}`:`Delete river${(riverPreviewPlan?.plan?.losses.removedRiverIds.length??0)>1?` with ${(riverPreviewPlan?.plan?.losses.removedRiverIds.length??1)-1} arms`:''}`):(language==='ru'?'Подтвердить':'Confirm')}</button>
    <button type="button" className="direct-value" data-river-cancel onClick={()=>cancelRiverCommand(riverCommandPreview)}>{language==='ru'?'Остаться':'Stay'}</button></div>
  </div>:null;
  const roadResolutionPanel=roadFeatureResolution?<div className="river-command-preview" data-road-marker-resolution role="group" aria-label={language==='ru'?'Решение для порогов':'Rapids resolution'} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();updateRoadResolution(null);}}}>
    <p>{language==='ru'?'Переправа конфликтует с ручными порогами. Выберите для каждой отметки «Нет» или «Авто» в этой же операции.':'The crossing conflicts with manual rapids. Choose Off or Auto for each marker in this operation.'}</p>
    {roadFeatureResolution.conflicts.map((conflict,i)=>{const choice=roadFeatureResolution.edits.find(e=>e.type==='rapid'&&conflict.type==='rapid'&&e.riverId===conflict.riverId&&e.edgeKey===conflict.edgeKey);return <label key={i}>{conflict.type==='rapid'?riverLabel(conflict.riverId):waterfallLabel} <select className="direct-value" data-road-marker-choice aria-label={`${language==='ru'?'Пороги у переправы':'Rapids at crossing'} ${i+1}`} value={choice?.state??''} onChange={event=>{if(roadFeatureResolutionRef.current!==roadFeatureResolution)return;updateRoadResolution({...roadFeatureResolution,edits:[...roadFeatureResolution.edits.filter(e=>e!==choice),{...conflict,state:event.target.value as 'off'|'auto'}]});}}><option value="">{language==='ru'?'Выберите':'Choose'}</option><option value="auto">{language==='ru'?'Авто':'Auto'}</option><option value="off">{language==='ru'?'Нет':'Off'}</option></select></label>;})}
    <button type="button" className="direct-value" data-road-marker-confirm disabled={roadFeatureResolution.edits.length<roadFeatureResolution.conflicts.length} onClick={()=>{if(editRoadDocument(roadFeatureResolution.edit,roadFeatureResolution.draft,roadFeatureResolution.edits,roadFeatureResolution))updateRoadResolution(null);}}>{language==='ru'?'Подтвердить переправу и отметки':'Confirm crossing and markers'}</button>
    <button type="button" className="direct-value" onClick={()=>updateRoadResolution(null)}>{language==='ru'?'Отказаться':'Cancel change'}</button>
  </div>:null;
  const riverAmbiguityPanel=riverHitChoices.length||riverRoadHitChoices.length?<div data-river-hit-choices><p>{language==='ru'?'Выберите объект и участок':'Choose object and edge'}</p>{riverHitChoices.map((choice,i)=><button type="button" className="direct-value" key={`${choice.riverId}:${choice.edgeKey}`} data-river-hit-choice={`${choice.riverId}:${choice.edgeKey}`} onFocus={()=>setRiverHitHover(choice)} onBlur={()=>setRiverHitHover(null)} onMouseEnter={()=>setRiverHitHover(choice)} onMouseLeave={()=>setRiverHitHover(null)} onClick={()=>chooseMapRiver(choice)}>{riverLabel(choice.riverId)} · {choice.hexKey} · {language==='ru'?'участок':'edge'} {i+1}</button>)}{riverRoadHitChoices.map(choice=><button type="button" className="direct-value" key={`road:${choice.roadId}:${choice.pair}`} data-river-road-hit-choice={choice.roadId} onClick={()=>chooseRoadPair(choice.pair,choice.roadId)}>{language==='ru'?'Дорога / тропа':'Road / trail'} {choice.roadId} · {choice.pair.replace('|',' ↔ ')}</button>)}<button type="button" className="direct-value" onClick={()=>{setRiverHitChoices([]);setRiverRoadHitChoices([]);setRiverHitHover(null);setEditError(null);}}>{language==='ru'?'Закрыть выбор':'Close choices'}</button></div>:null;
  const riverDraftPanel=editMode&&!poiDraft&&!regionDraft&&!waterDraft&&regions.length>0?<div className="river-draft-editor" data-river-draft>
    {riverDraft?<>
      <p>{riverDraft.riverId===undefined?(language==='ru'?'Новая река':'New river'):`${language==='ru'?'Заменить русло':'Replace route'} · ${riverLabel(riverDraft.riverId)}`}</p>
      <p>{language==='ru'?'Выберите начало и соседние вершины. Enter, повтор конца или Готово — завершить. Escape — сбросить.':'Choose a start and adjacent vertices. Enter, click the end again or Done to finish. Escape to reset.'}</p>
      <p>{language==='ru'?'Участков':'Edges'}: {Math.max(0,riverDraft.path.length-1)}. {language==='ru'?'Черновик не входит в выгрузку.':'The draft is excluded from exports.'}</p>
      {(riverDraftAmbiguity.length?riverDraftVertices.filter(v=>riverDraftAmbiguity.includes(v.key)):riverDraft.path.length?riverDraftVertices:riverDraftVertices.filter(v=>selectedHexVertexKeys.has(v.key))).map((v,i)=><button type="button" className="direct-value" key={v.key} data-river-draft-choice={v.key} onFocus={()=>setRiverDraftHover(v.key)} onBlur={()=>setRiverDraftHover(null)} onMouseEnter={()=>setRiverDraftHover(v.key)} onMouseLeave={()=>setRiverDraftHover(null)} onClick={()=>appendRiverDraft(v.key,riverDraft)}>{v.key===riverDraft.path[riverDraft.path.length-1]?.key?(language==='ru'?'Завершить здесь':'Finish here'):`${language==='ru'?'Вершина':'Vertex'} ${i+1}`}</button>)}
      <button type="button" className="direct-value" data-river-finish disabled={!!riverCommandPreview} onClick={()=>finishRiverDraft(riverDraft)}>{language==='ru'?'Завершить русло':'Finish route'}</button>
      <button type="button" className="direct-value" onClick={()=>resetRiverDraft(riverDraft)}>{language==='ru'?'Сбросить черновик реки':'Reset river draft'}</button>
    </>:<button type="button" className="direct-value" data-add-river onClick={()=>startRiverDraft()} disabled={!!roadDraft||!!obstacleDraft||documentBusy()}>{language==='ru'?'Добавить реку':'Add river'}</button>}
  </div>:null;
  const roadLandRegion = (h:AxialHex) => !isLakeHex(h,hexTerrainByKey)&&!isSeaHex(h,hexTerrainByKey)
    ? regions.find(r=>r.hexes.some(v=>isSameHex(v,h))) : undefined;
  const roadDraftHits = (path:AxialHex[]) => path.slice(1).flatMap((to,i)=>{
    const from=path[i],edge=getSharedHexEdgeVertexKeys(from,to),edgeId=edge?[...edge].sort().join('|'):null;
    return rivers.filter(r=>r.vertexPath.slice(1).some((v,j)=>getRiverEdgeKey(r.vertexPath[j],v)===edgeId))
      .map(r=>({key:getRiverCrossingKey(nextRoadId,normalizeRoadSegmentKey(from,to),r.id),riverId:r.id}));
  });
  const startRoadDraft = () => {
    if(!editMode||roadDraftRef.current||!finishInlineName()||mutationBlocked()||!selectedHex||!roadLandRegion(selectedHex))return false;
    clearNotesDraft();closeEditors();setSelectedRoadPair(null); setSelectedRoadTarget(null);setConfirmRoadRemoval(null);
    updateRoadDraft({path:[{...selectedHex}],kind:'trail',crossingKinds:{},revision:documentRevision.current});return true;
  };
  const finishRoadDraft = () => {
    const draft=roadDraftRef.current;if(!draft)return true;
    if(draft.revision!==documentRevision.current||documentBusy())return draftError('Карта изменилась или занята. Сбросьте черновик.','Map changed or busy. Reset the draft.');
    return editRoadDocument({type:'create',path:draft.path,kind:draft.kind,crossingKinds:draft.crossingKinds},draft);
  };
  const appendRoadDraft = (h:AxialHex) => {
    const draft=roadDraftRef.current;if(!draft||draft.revision!==documentRevision.current||documentBusy())return false;
    const path=draft.path,last=path[path.length-1];
    if(isSameHex(h,last))return finishRoadDraft();
    if(path.length>1&&isSameHex(h,path[path.length-2])){updateRoadDraft({...draft,path:path.slice(0,-1)});setEditError(null);return true;}
    if(!roadLandRegion(h)||!areHexesAdjacent(last,h)||path.some(v=>isSameHex(v,h)))return draftError('Нужен соседний сухопутный гекс без повтора.','Choose an adjacent land hex without repeating a node.');
    const pair=normalizeRoadSegmentKey(last,h);
    if(getRoadSegmentKeys(roads).has(pair)||obstacles.some(o=>pairKey(o.hex,o.neighborHex)===pair))return draftError('Здесь уже есть путь или препятствие.','A path or barrier already occupies this edge.');
    if(path.length>1&&getRoadHexKeys(roads).has(hexKey(last)))return draftError('Завершите путь на узле сети.','Finish the path at the network node.');
    updateRoadDraft({...draft,path:[...path,{...h}]});setEditError(null);return true;
  };
  const resetRoadDraft = () => {updateRoadResolution(null);updateRoadDraft(null);setEditError(null);};
  const roadDraftPanel = editMode && !poiDraft && !regionDraft && !waterDraft && !riverDraft && (roadDraft || selectedHex && roadLandRegion(selectedHex)) ? <div className="road-editor" data-road-draft>
    {roadDraft ? <>
      <label>{language==='ru'?'Черновик пути':'Path draft'} <select className="direct-value" aria-label={language==='ru'?'Тип нового пути':'New path type'} value={roadDraft.kind}
        onChange={e=>{if(roadDraftRef.current===roadDraft&&!documentBusy())updateRoadDraft({...roadDraft,kind:e.target.value as RoadKind});}}><option value="trail">{t.trail}</option><option value="road">{t.road}</option></select></label>
      <p>{language==='ru'?'Участков':'Segments'}: {Math.max(0,roadDraft.path.length-1)}. {language==='ru'?'Нажимайте соседние гексы. Завершить: Enter, повтор конца или Готово.':'Click adjacent hexes. Finish: Enter, click end again or Done.'}</p>
      {roadDraftHits(roadDraft.path).map(hit=><label key={hit.key}>{language==='ru'?'Переправа':'Crossing'} {hit.riverId} <select className="direct-value" aria-label={`${language==='ru'?'Новая переправа':'New crossing'} ${hit.key}`}
        value={roadDraft.crossingKinds[hit.key]??'bridge'} onChange={e=>{if(roadDraftRef.current===roadDraft&&!documentBusy())updateRoadDraft({...roadDraft,crossingKinds:{...roadDraft.crossingKinds,[hit.key]:e.target.value as RiverCrossingKind}});}}>
        {(['bridge','ferry','ford'] as const).map(kind=><option key={kind} value={kind}>{t[kind]}</option>)}</select></label>)}
      <button type="button" className="direct-value" onClick={resetRoadDraft}>{language==='ru'?'Сбросить черновик':'Reset draft'}</button>
    </> : <button type="button" className="direct-value" onClick={startRoadDraft}>{language==='ru'?'Начать путь отсюда':'Start path here'}</button>}
  </div>:null;
  const chooseRoadPair = (pair:string, roadId:number, crossingKey?:string) => {
    if (documentBusy() || !finishPathDrafts() || !finishInlineName()) return;
    finishNotesGroup(); clearNotesDraft(); closeEditors(); setConfirmRoadRemoval(null);
    setSelectedRoadPair(pair); setSelectedRoadTarget({roadId,crossingKey});
    const match = roads.find(r=>r.id===roadId)?.segments.find(s => normalizeRoadSegmentKey(s.from,s.to) === pair);
    if(match) setSelectedHex({...match.from});
  };
  const roadChoices = roads.flatMap(road => road.segments.filter(segment =>
    selectedRoadPair ? normalizeRoadSegmentKey(segment.from,segment.to) === selectedRoadPair
      : selectedHex && (isSameHex(segment.from,selectedHex) || isSameHex(segment.to,selectedHex)))
    .map(segment => ({road,segment,pair:normalizeRoadSegmentKey(segment.from,segment.to)})));
  const roadRemovalNames=(roadId:number,segmentKey?:string)=>{
    const road=roads.find(r=>r.id===roadId);
    const keys=new Set(crossings.filter(c=>c.roadId===roadId&&(!segmentKey||c.roadSegmentKey===segmentKey)).map(c=>`crossing:${c.key}`));
    if(road&&(!segmentKey||road.segments.every(s=>normalizeRoadSegmentKey(s.from,s.to)===segmentKey)))keys.add(`road:${roadId}`);
    return Object.entries(editorNames).filter(([key])=>keys.has(key));
  };
  const requestRoadRemoval = (roadId:number, segmentKey?:string) => {
    if (mutationBlocked()) return;
    setConfirmRoadRemoval({roadId,segmentKey,revision:documentRevision.current});
  };
  const roadErrorText = (code:string) => ({
    short_path:'Нужно хотя бы два гекса.', invalid_path_end:'Начало и конец должны быть точкой интереса, узлом сети или открытым выходом.', non_adjacent:'Гексы должны быть соседними.', unknown_or_water_hex:'Путь должен проходить по существующей суше.', duplicate_segment:'Участок уже занят путём.', obstacle:'На ребре есть препятствие.', repeated_hex:'Повтор гекса недопустим.', network_must_end_path:'На узле сети нужно завершить путь.', invalid_next_road_id:'Невозможно выделить ID пути.',
    new_internal_dead_end:'Получится тупик без точки интереса.', removed_open_exit:'Нельзя закрыть существующий выход с карты.',
    disconnected_destinations:'Путь связывает точки интереса или узлы сети.', settled_road_minimum:'Нельзя уменьшить число дорог ниже минимума региона.',
    missing_or_ambiguous_intersection:'Пересечение не найдено или неоднозначно.', invalid_crossing_kind:'На такой реке брод недопустим.',
    missing_or_ambiguous_road:'Путь не найден или неоднозначен.', missing_or_ambiguous_segment:'Участок не найден или неоднозначен.',
    stale_crossing:'Данные переправы изменились.', unknown_fullness:'Не удалось определить полноводность.'
  } as Record<string,string>)[code] ?? 'Не удалось подготовить изменение пути.';
  const roadPanel = editMode && !poiDraft && !regionDraft && !waterDraft && !riverDraft && !roadDraft && roadChoices.length ? <div className="road-editor" aria-label={language==='ru'?'Редактирование путей':'Edit paths'}>
    {roadChoices.map(({road,segment,pair},index) => <div className="road-editor__item" key={`${road.id}:${pair}:${index}`}>
      <button type="button" className="direct-value" aria-pressed={selectedRoadPair===pair && selectedRoadTarget?.roadId===road.id && !selectedRoadTarget.crossingKey} onClick={()=>chooseRoadPair(pair,road.id)}>
        {language==='ru'?'Участок':'Segment'} {road.id}: {hexKey(segment.from)} → {hexKey(segment.to)}
      </button>
      {selectedRoadPair===pair && selectedRoadTarget?.roadId===road.id && <>
        <label>{language==='ru'?'Тип участка':'Segment type'} <select className="direct-value" aria-label={`${language==='ru'?'Тип участка':'Segment type'} ${road.id}`}
          value={segment.kind} onChange={e=>editRoadDocument({type:'kind',roadId:road.id,segmentKey:pair,kind:e.target.value as RoadKind})}>
          <option value="road">{t.road}</option><option value="trail">{t.trail}</option>
        </select></label>
        {(() => {
          const edge=getSharedHexEdgeVertexKeys(segment.from,segment.to); const edgeId=edge?[...edge].sort().join('|'):null;
          return rivers.filter(r=>r.vertexPath.slice(1).some((v,i)=>getRiverEdgeKey(r.vertexPath[i],v)===edgeId)).map(r=>{
            const crossing=crossings.find(c=>c.key===getRiverCrossingKey(road.id,pair,r.id));
            return <div key={r.id} className="road-crossing-control"><button type="button" className="direct-value" aria-pressed={selectedRoadTarget?.crossingKey===getRiverCrossingKey(road.id,pair,r.id)} onClick={()=>chooseRoadPair(pair,road.id,getRiverCrossingKey(road.id,pair,r.id))}>{language==='ru'?'Переправа':'Crossing'} {r.id}</button> <select className="direct-value" aria-label={`${language==='ru'?'Переправа':'Crossing'} ${road.id}:${r.id}`}
              value={crossing?.kind??''} onChange={e=>editRoadDocument({type:'crossing',roadId:road.id,segmentKey:pair,riverId:r.id,kind:e.target.value as RiverCrossingKind})}>
              {!crossing&&<option value="" disabled>{language==='ru'?'Не задана':'Not set'}</option>}
              {(['bridge','ferry','ford'] as const).map(kind=><option key={kind} value={kind}>{t[kind]}</option>)}
            </select></div>;
          });
        })()}
        <button type="button" className="direct-value road-editor__danger" onClick={()=>requestRoadRemoval(road.id,pair)}>{language==='ru'?'Удалить участок':'Delete segment'}</button>
        <button type="button" className="direct-value road-editor__danger" onClick={()=>requestRoadRemoval(road.id)}>{language==='ru'?'Удалить весь выделенный путь':'Delete entire selected path'}</button>
      </>}
    </div>)}
    {confirmRoadRemoval && <div className="road-editor__confirmation" role="group" aria-label={language==='ru'?'Подтверждение удаления':'Confirm deletion'}>
      <p>{language==='ru'?'Удалить подсвеченные участки и связанные переправы?':'Delete highlighted segments and dependent crossings?'} ({crossings.filter(c=>c.roadId===confirmRoadRemoval.roadId&&(!confirmRoadRemoval.segmentKey||c.roadSegmentKey===confirmRoadRemoval.segmentKey)).length})</p>
      {roadRemovalNames(confirmRoadRemoval.roadId,confirmRoadRemoval.segmentKey).map(([key,name])=><p key={key}>{language==='ru'?'Будет удалено имя':'Name will be deleted'}: <strong>{name[language]}</strong></p>)}
      <button type="button" onClick={()=>{
        if(confirmRoadRemoval.revision!==documentRevision.current||documentBusy()){setConfirmRoadRemoval(null);return;}
        if(editRoadDocument({type:'remove',roadId:confirmRoadRemoval.roadId,segmentKey:confirmRoadRemoval.segmentKey},undefined,[],undefined,roadRemovalNames(confirmRoadRemoval.roadId,confirmRoadRemoval.segmentKey).map(([key])=>key)))setConfirmRoadRemoval(null);
      }}>{language==='ru'?'Удалить':'Delete'}</button>
      <button type="button" onClick={()=>setConfirmRoadRemoval(null)}>{language==='ru'?'Отмена':'Cancel'}</button>
    </div>}
  </div>:null;
  const mapMotionCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapArtwork = useMemo(() => (<>
            <defs>
              <filter id="poi-white-outline" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
                <feMorphology in="SourceAlpha" operator="dilate" radius="0.65" result="poi-rim"/>
                <feFlood floodColor="#FFFFFF" result="poi-white"/>
                <feComposite in="poi-white" in2="poi-rim" operator="in" result="poi-outline"/>
                <feMerge><feMergeNode in="poi-outline"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
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
            {renderBiomeColor && colorLandHexes.length > 0 ? (
              <g className="biome-color-layer" pointerEvents="none">
                <defs>
                  <clipPath id="biome-color-land-clip">
                    {colorLandHexes.map(hex => <polygon key={hex.key} points={hex.points} />)}
                  </clipPath>
                  <filter id="biome-color-blend" filterUnits="userSpaceOnUse" x={-HEX_SIZE} y={-HEX_SIZE} width={positionedHexes.width + HEX_SIZE * 2} height={positionedHexes.height + HEX_SIZE * 2} colorInterpolationFilters="sRGB">
                    {/* A broad land transition, twice the initial blend width. */}
                    <feGaussianBlur stdDeviation={HEX_SIZE * 0.34} />
                    {/* Normalize opacity at coasts; the outer clip keeps water sharp. */}
                    <feComponentTransfer><feFuncA type="linear" slope={0} intercept={1} /></feComponentTransfer>
                  </filter>
                </defs>
                <g clipPath="url(#biome-color-land-clip)">
                  <g filter="url(#biome-color-blend)">
                    {colorLandHexes.map(hex => <polygon key={hex.key} points={hex.points} fill={hex.color} stroke={hex.color} strokeWidth={0.4} />)}
                  </g>
                </g>
              </g>
            ) : null}
            {positionedHexes.hexes.map((hex) => {
              const meta = metadataMap.get(hex.key);
              const isStartClickPrompt = regions.length === 0 && hex.kind === 'candidate' && hex.key === hexKey(START_HEX);
              const isCandidateClickPrompt = regions.length >= 1 && regions.length <= 2 && hex.kind === 'candidate' && hex.key === clickPromptCandidateKey;
              const cls = `${hex.kind === 'sea' ? 'hex sea' : hex.kind === 'candidate' ? 'hex candidate' : meta?.isCenter ? 'hex center' : 'hex region'}${isStartClickPrompt || isCandidateClickPrompt ? ' click-prompt' : ''}`;
              const hexRenderSize = isStartClickPrompt ? HEX_SIZE * START_PROMPT_HEX_SCALE : HEX_SIZE;
              const terrain = hexTerrainByKey.get(hex.key);
              const isLakeHex = terrain?.terrainOverride === 'lake';
              const region = meta?.regionId ? regions.find((item) => item.id === meta.regionId) : undefined;
              const effectiveBiomeId = biomeOverrideByHexKey.get(hex.key) ?? region?.biomeId ?? FALLBACK_BIOME_ID;
              const fill = hex.kind === 'candidate' ? undefined : !renderDetails ? (hex.kind === 'sea' ? SEA_HEX_COLOR : isLakeHex ? WATER_PALETTE.deep : GROUND_COLORS[effectiveBiomeId]) : useBiomeColor ? (hex.kind === 'sea' ? GROUND_WATER_COLOR : 'transparent') : hex.kind === 'sea' ? SEA_HEX_COLOR : isLakeHex ? WATER_PALETTE.deep : getBiomeColor(effectiveBiomeId);
              const gridStyle = renderBiomeColor && hex.kind !== 'candidate' ? { stroke: 'none' } : {};
              const biomeTileHref = renderDetails && useBiomeTiles && hex.kind === 'region' && !isLakeHex ? getBiomeTileHref(effectiveBiomeId) : undefined;
              const tileImageSize = getHexWidth(hexRenderSize);
              const tileImageHeight = hexRenderSize * 2;
              const effectiveBiome = BIOMES[effectiveBiomeId] ?? BIOMES[FALLBACK_BIOME_ID];
              const biomePrimaryEmoji = effectiveBiome.primaryEmoji;
              const biomeSecondaryEmojis = effectiveBiome.secondaryEmojis;
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
                  onClick={event => mapHexClickRef.current(hex,event)}
                >
                  <polygon data-hex-key={hex.key} points={hexPoints(hex.x, hex.y, hexRenderSize)} className={cls} style={{ fill, ...(renderBiomeColor ? { stroke: 'none' } : {}) }} />
                  {biomeTileHref ? (
                    <g clipPath={`url(#hex-clip-${hex.key})`} pointerEvents="none">
                      <image className="biome-tile"
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
                  {renderBiomeColor && hex.kind === 'region' && !isLakeHex && terrainAsset(effectiveBiomeId, hex.q, hex.r, toponymSeed) ? (
                    <g clipPath={`url(#hex-clip-${hex.key})`} pointerEvents="none">
                      <image className="terrain-overlay" data-terrain-key={hex.key}
                        href={terrainAsset(effectiveBiomeId, hex.q, hex.r, toponymSeed)}
                        x={hex.x - tileImageSize / 2} y={hex.y - tileImageHeight / 2}
                        width={tileImageSize} height={tileImageHeight}
                        preserveAspectRatio="xMidYMid meet"
                        transform={isMapRotated ? `rotate(-90 ${hex.x} ${hex.y})` : undefined} />
                    </g>
                  ) : null}
                  <polygon points={hexPoints(hex.x, hex.y, hexRenderSize)} className={cls} style={{ fill: 'none', ...gridStyle }} />
                </g>
              );
            })}
            {renderBiomeColor ? <>
              <ForestCanopy waterSegments={riverSegments} lakes={lakeShapes} cells={forestCells} radius={HEX_SIZE} seed={toponymSeed} width={positionedHexes.width} height={positionedHexes.height} />
              <LakeWater shapes={lakeShapes} cells={lakeCells} radius={HEX_SIZE} seed={toponymSeed} segments={riverSegments} />
            </> : null}
            <g className="rivers-layer">
              {renderDetails && riverSegments.map((segment) => (
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
              {renderBiomeColor && forestCells.length ? <ForestWaterEdge/> : null}
              {renderDetails && riverDirectionArrows.map((arrow) => (
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
              {renderDetails && riverRapidMarks.map((mark) => (
                <line
                  key={mark.key}
                  x1={mark.x1}
                  y1={mark.y1}
                  x2={mark.x2}
                  y2={mark.y2}
                  className="river-rapid-mark"
                  strokeWidth={1.2 * getRiverArrowScale(mark.fullness)}
                />
              ))}
            </g>
            <g className="roads-layer">
              {renderDetails && roadSegments.map((segment) => {
                const crossing = renderedCrossings.find((item) => item.roadId === segment.roadId && item.roadSegmentKey === segment.segmentKey);
                const lineClass = segment.kind === 'trail' ? 'trail-line' : 'road-line';
                if (!crossing) return <line key={segment.key} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className={lineClass} />;
                const gap = 7;
                const beforeX = crossing.x - crossing.ux * gap;
                const beforeY = crossing.y - crossing.uy * gap;
                const afterX = crossing.x + crossing.ux * gap;
                const afterY = crossing.y + crossing.uy * gap;
                if (crossing.kind === 'ferry') return (
                  <g key={segment.key} className="river-crossing river-crossing--ferry">
                    {segment.kind === 'road' && <>
                      <line x1={segment.x1} y1={segment.y1} x2={beforeX} y2={beforeY} className="road-line" />
                      <line x1={afterX} y1={afterY} x2={segment.x2} y2={segment.y2} className="road-line" />
                    </>}
                  </g>
                );
                if (crossing.kind === 'ford') return (
                  <g key={segment.key} className="river-crossing river-crossing--ford">
                    {segment.kind === 'trail' ? (
                      <>
                        <line
                          x1={segment.x1}
                          y1={segment.y1}
                          x2={crossing.x - crossing.ux * TRAIL_DASH_LENGTH / 2}
                          y2={crossing.y - crossing.uy * TRAIL_DASH_LENGTH / 2}
                          className="trail-line"
                        />
                        <line
                          x1={crossing.x - crossing.ux * TRAIL_DASH_LENGTH / 2}
                          y1={crossing.y - crossing.uy * TRAIL_DASH_LENGTH / 2}
                          x2={crossing.x + crossing.ux * TRAIL_DASH_LENGTH / 2}
                          y2={crossing.y + crossing.uy * TRAIL_DASH_LENGTH / 2}
                          className="trail-line trail-line--ford"
                        />
                        <line
                          x1={crossing.x + crossing.ux * TRAIL_DASH_LENGTH / 2}
                          y1={crossing.y + crossing.uy * TRAIL_DASH_LENGTH / 2}
                          x2={segment.x2}
                          y2={segment.y2}
                          className="trail-line"
                        />
                      </>
                    ) : <>
                      <line x1={segment.x1} y1={segment.y1} x2={beforeX} y2={beforeY} className="road-line" />
                      <line x1={beforeX} y1={beforeY} x2={afterX} y2={afterY} className="road-line road-line--ford" />
                      <line x1={afterX} y1={afterY} x2={segment.x2} y2={segment.y2} className="road-line" />
                    </>}
                  </g>
                );
                const railOffset = 4;
                const railLength = 11;
                return (
                  <g key={segment.key} className="river-crossing river-crossing--bridge">
                    <line x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} className={lineClass} />
                    {[-1, 1].map((side) => {
                      const offset = side * railOffset;
                      const outerOffset = side * (railOffset + 2);
                      const startX = crossing.x - crossing.ux * railLength + crossing.nx * outerOffset;
                      const startY = crossing.y - crossing.uy * railLength + crossing.ny * outerOffset;
                      const endX = crossing.x + crossing.ux * railLength + crossing.nx * outerOffset;
                      const endY = crossing.y + crossing.uy * railLength + crossing.ny * outerOffset;
                      return <polyline key={side} points={`${startX},${startY} ${crossing.x - crossing.ux * (railLength - 3) + crossing.nx * offset},${crossing.y - crossing.uy * (railLength - 3) + crossing.ny * offset} ${crossing.x + crossing.ux * (railLength - 3) + crossing.nx * offset},${crossing.y + crossing.uy * (railLength - 3) + crossing.ny * offset} ${endX},${endY}`} className="bridge-rail" />;
                    })}
                  </g>
                );
              })}
            </g>
            </g>
            <g className="kingdom-boundaries" transform={mapRotationTransform} pointerEvents="none">
              {renderDetails && kingdoms.flatMap(k=>kingdomBoundary(k,getHexEdgesAsVertexPairs).map(e=><line key={`${k.id}:${e.edgeKey}`} x1={e.from.x+riverOffset.x} y1={e.from.y+riverOffset.y} x2={e.to.x+riverOffset.x} y2={e.to.y+riverOffset.y} stroke={k.color} strokeWidth={3} strokeDasharray="6 4" />))}
            </g>
            <g className="obstacles-layer" transform={mapRotationTransform} pointerEvents="none">
              {renderDetails && obstacles.map(o=>{const e=getHexEdgesAsVertexPairs(o.hex).find(e=>e.edgeKey===o.edgeKey);return e?<line key={o.id} x1={e.from.x+riverOffset.x} y1={e.from.y+riverOffset.y} x2={e.to.x+riverOffset.x} y2={e.to.y+riverOffset.y} stroke="#a95650" strokeWidth={3} />:null;})}
            </g>
            <g className="river-waterfalls-layer" pointerEvents="none">
              {renderDetails && riverWaterfalls.map((waterfall) => {
                const position = isMapRotated
                  ? rotateMapPoint(waterfall.x, waterfall.y, positionedHexes.height)
                  : waterfall;
                return (
                  <image
                    key={waterfall.key}
                    className="river-waterfall"
                    href="/waterfall-color.svg"
                    x={position.x - 8}
                    y={position.y - 8}
                    width={16}
                    height={16}
                  />
                );
              })}
            </g>
            {showHexCoordinates ? (
              <g className="hex-coordinate-layer">
                {positionedHexes.hexes.filter((hex) => hex.kind !== 'candidate').map((hex) => {
                  const labelLayout = getHexCoordinateLabelLayout(hex.x, hex.y, positionedHexes.height, isMapRotated);
                  return (
                    <text
                      key={`hex-coordinate-${hex.key}`}
                      x={labelLayout.x}
                      y={labelLayout.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="hex-coordinate-label"
                      transform={labelLayout.angle ? `rotate(${labelLayout.angle} ${labelLayout.x} ${labelLayout.y})` : undefined}
                    >
                      {hex.q}/{hex.r}
                    </text>
                  );
                })}
              </g>
            ) : null}
            <g className="emoji-layer">
              {renderDetails && <>
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
                const waterPoiKind = waterPoiByKey.get(hex.key);
                const region = meta?.regionId ? regions.find((item) => item.id === meta.regionId) : undefined;
                const effectiveBiomeId = biomeOverrideByHexKey.get(hex.key) ?? region?.biomeId ?? FALLBACK_BIOME_ID;
                const effectiveBiome = BIOMES[effectiveBiomeId] ?? BIOMES[FALLBACK_BIOME_ID];
                const biomePrimaryEmoji = effectiveBiome.primaryEmoji;
                const biomeSecondaryEmojis = effectiveBiome.secondaryEmojis;
                const biomeTileHref = renderDetails && useBiomeTiles && hex.kind === 'region' && !isLakeHex ? getBiomeTileHref(effectiveBiomeId) : undefined;
                const biomeEmojis = biomeTileHref || useBiomeColor ? [] : [biomePrimaryEmoji, ...biomeSecondaryEmojis.slice(0, 2)];
                const isPointOfInterest = region?.pointsOfInterest.some((poi) => hexKey(poi) === hex.key) ?? false;
                if (waterPoiKind) {
                  const position = isMapRotated ? rotateMapPoint(hex.x, hex.y, positionedHexes.height) : hex;
                  return usePoiSvg ? (
                    <image key={`water-poi-svg-${hex.key}`} className="poi-marker" filter="url(#poi-white-outline)" href={getPoiSvgHref(waterPoiKind, true)} x={position.x - 10} y={position.y - 10} width={20} height={20} pointerEvents="none" role="img" aria-label={getWaterPoiLabel(waterPoiKind, language)} />
                  ) : (
                    <text key={`water-poi-emoji-${hex.key}`} className="poi-marker" filter="url(#poi-white-outline)" x={position.x} y={position.y} textAnchor="middle" dominantBaseline="central" fontSize={18.5} pointerEvents="none">{getWaterPoiEmoji(waterPoiKind)}</text>
                  );
                }
                if (!SHOW_BIOME_EMOJI || hex.kind !== 'region' || !hex.regionId || !region || isLakeHex) return null;
                const hexMarkers: Array<{ emoji: string; svgHref?: string; label?: string }> = [];
                if (meta?.isCenter && hasCentralPoi(region)) {
                  hexMarkers.push({ emoji: getCentralPoiEmoji(region), svgHref: getPoiSvgHref(region.centralPoiKind), label: getCentralPoiLabel(region, language) });
                }
                if (isPointOfInterest) {
                  hexMarkers.push({ emoji: getPoiEmojiForHex(region, hex), svgHref: getPoiSvgHref(getPoiKindForHex(region, hex)), label: getPoiLabelForHex(region, hex, language) });
                }
                hexMarkers.push(...biomeEmojis.map((emoji) => ({ emoji })));
                // SVG silhouettes need more room when sharing a hex with biome emoji or another POI.
                const spacing = usePoiSvg && hexMarkers.some((marker) => marker.svgHref) ? 1.8 : 1;
                const hexEmojiLayout = getHexEmojiLayout(hexMarkers.map((marker) => marker.emoji), hex.x, hex.y, HEX_SIZE, spacing);
                return hexEmojiLayout.map((item, index) => {
                  const position = isMapRotated ? rotateMapPoint(item.x, item.y, positionedHexes.height) : item;
                  const marker = hexMarkers[index];
                  if (usePoiSvg && marker.svgHref) {
                    const size = item.fontSize * 1.25;
                    return <image key={`poi-svg-${hex.key}-${index}`} className="poi-marker" filter="url(#poi-white-outline)" href={marker.svgHref} x={position.x - size / 2} y={position.y - size / 2} width={size} height={size} pointerEvents="none" role="img" aria-label={marker.label} />;
                  }
                  return (
                    <text key={`biome-emoji-${hex.key}-${index}`} className={marker.svgHref ? 'poi-marker' : 'biome-marker'} filter={marker.svgHref ? 'url(#poi-white-outline)' : undefined} x={position.x} y={position.y} textAnchor="middle" dominantBaseline="central" fontSize={marker.svgHref ? item.fontSize * .84 : item.fontSize} pointerEvents="none">{item.emoji}</text>
                  );
                });
              })}
              </>}
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
            {renderBiomeColor ? <g className="top-hex-grid" transform={mapRotationTransform}><ColorHexGrid cells={positionedHexes.hexes.filter(hex => hex.kind !== 'candidate')} radius={HEX_SIZE} /></g> : null}
  </>), [
    biomeOverrideByHexKey, candidateBoundaryDebugByRegion, clickPromptCandidateKey, colorLandHexes, debugRivers, debugVerticesByRegion, forestCells, hexTerrainByKey, isMapRotated, kingdoms, lakeCells, lakeShapes, lakeVerticesDebug, language, mapHexClickRef, mapRotationTransform, metadataMap, obstacles, positionedHexes, regions, renderBiomeColor, renderDetails, renderedCrossings, riverDirectionArrows, riverGraphsByRegion, riverOffset, riverRapidMarks, riverSegments, riverWaterfalls, rivers, roadSegments, debugRivers ? selectedRegion : undefined, showHexCoordinates, toponymSeed, useBiomeColor, useBiomeTiles, usePoiSvg, waterPoiByKey
  ]);

  useEffect(() => {
    const viewport = mapViewportRef.current, svg = mapSvgRef.current, canvas = mapMotionCanvasRef.current;
    if (!viewport || !svg || !canvas || !renderBiomeColor || !renderDetails || positionedHexes.hexes.length < 600) return;
    return installViewportRasterCache({ viewport, svg, canvas, scale: () => mapScaleRef.current, rotated: isMapRotated, originalHeight: positionedHexes.height, snapshot: createExportSvgClone, onNavigate: beginMapNavigation });
  }, [mapArtwork, renderBiomeColor, renderDetails, positionedHexes, isMapRotated]);

  return (
    <div className="app" onClickCapture={poiClickGate} onChangeCapture={poiSelectGate} onPointerDownCapture={finishBeforePointer} onKeyDownCapture={e=>{
      if(e.key!=='Tab'&&guardMaterialRead(e))return;
      if(knaveExitRequest&&e.key==='Tab'){const buttons=[...(e.currentTarget.querySelector('[data-knave-exit-dialog]')?.querySelectorAll<HTMLButtonElement>('button')??[])],first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
      if(knaveDraftRef.current&&e.key==='Escape'&&!e.nativeEvent.isComposing){e.preventDefault();e.stopPropagation();if(knaveExitRequest)setKnaveExitRequest(null);else resetKnaveDraft();return;}
      if(poiExitRequest&&e.key==='Tab'){const buttons=[...(e.currentTarget.querySelector('[data-poi-exit-dialog]')?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[])];const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
      if(poiDraftRef.current&&e.key==='Escape'&&!e.nativeEvent.isComposing){e.preventDefault();e.stopPropagation();if(poiExitRequest)setPoiExitRequest(null);else resetPoiDraft();return;}
      if(regionDraftRef.current&&!e.nativeEvent.isComposing){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();resetRegionDraft();return;}if(e.key==='Enter'&&(e.target as Element).closest('.map-viewport,[data-region-preview]')&&!(e.target as Element).closest('select,button,input,textarea,summary,[role="button"]')){e.preventDefault();e.stopPropagation();if(finishRegionDraft())setEditMode(false);return;}}
      if(waterDraftRef.current&&!e.nativeEvent.isComposing){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();resetWaterDraft();return;}if(e.key==='Enter'&&!(e.target as Element).matches('select,button,input,textarea')){e.preventDefault();e.stopPropagation();finishWaterDraft();return;}}
      if(riverCommandPreviewRef.current&&e.key==='Escape'&&!e.nativeEvent.isComposing){e.preventDefault();e.stopPropagation();cancelRiverCommand();return;}
      if(riverDraftRef.current&&!e.nativeEvent.isComposing){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();resetRiverDraft();return;}if(e.key==='Enter'&&!(e.target as Element).matches('select,button,input,textarea,[data-river-draft-vertex]')){e.preventDefault();e.stopPropagation();finishRiverDraft();return;}}
      if(e.key==='Escape'&&obstacleDraftRef.current){e.preventDefault();e.stopPropagation();cancelObstacleChoice();return;}
      if(!roadDraftRef.current||e.nativeEvent.isComposing)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();resetRoadDraft();}
      else if(e.key==='Enter'&&!(e.target as Element).matches('select,button,input,textarea')){e.preventDefault();e.stopPropagation();finishRoadDraft();}
    }}>
      {knaveExitRequest&&<div className="poi-exit-backdrop" data-knave-exit-dialog><section role="alertdialog" aria-modal="true" aria-labelledby="knave-exit-title"><h2 id="knave-exit-title">{language==='ru'?'Есть несохранённые свойства':'Unsaved properties'}</h2><p>{language==='ru'?'Сохранить, отбросить или остаться здесь?':'Save, discard, or stay here?'}</p>{knaveError&&<p role="alert">{knaveError}</p>}<button type="button" onClick={()=>resolveKnaveExit('finish')}>{language==='ru'?'Сохранить':'Save'}</button><button type="button" onClick={()=>resolveKnaveExit('discard')}>{language==='ru'?'Отбросить':'Discard'}</button><button type="button" autoFocus onClick={()=>resolveKnaveExit('stay')}>{language==='ru'?'Остаться':'Stay'}</button></section></div>}
      {poiExitRequest&&<div className="poi-exit-backdrop" data-poi-exit-dialog><section role="alertdialog" aria-modal="true" aria-labelledby="poi-exit-title"><h2 id="poi-exit-title">{language==='ru'?'Есть незавершённый перенос':'Point move in progress'}</h2><p>{language==='ru'?'Завершить перенос, отбросить его или остаться здесь?':'Finish the move, discard it,or stay here?'}</p><button type="button" disabled={!poiPreview?.plan} onClick={()=>resolvePoiExit('finish')}>{language==='ru'?'Завершить перенос':'Finish move'}</button><button type="button" onClick={()=>resolvePoiExit('discard')}>{language==='ru'?'Отбросить':'Discard'}</button><button type="button" autoFocus onClick={()=>resolvePoiExit('stay')}>{language==='ru'?'Остаться':'Stay'}</button></section></div>}
      <section className="content">
        <div className={`map-card${isSidePanelCollapsed ? ' is-panel-collapsed' : ''}`} style={mapCardStyle}>
          <button
            type="button"
            className="side-panel-toggle"
            onClick={() => {if(poiDraftRef.current||regionDraftRef.current||finishPathDrafts())setIsSidePanelCollapsed((value) => !value);}}
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
                onClick={() => {
                  if (!finishPathDrafts() || !finishInlineName()) return;
                  finishNotesGroup(); clearNotesDraft(); closeEditors();
                  trackGoal('lang_switch');
                  setLanguage((value) => (value === 'ru' ? 'en' : 'ru'));
                }}
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
          <div className="side-panel">
          <div id="side-panel-controls" ref={mapToolbarRef} className="map-toolbar" aria-label={t.controlsLabel}>
            {regions.length === 0 ? (
              <div className="info-block info-block--prompt map-toolbar__prompt" role="status">{t.startPrompt}</div>
            ) : regions.length <= 2 && candidateHexes.length > 0 ? (
              <div className="info-block info-block--prompt map-toolbar__prompt" role="status">{waterDraft?(language==='ru'?'Выберите созданные клетки для изменения воды.':'Choose created cells to change water.'):t.candidatePrompt}</div>
            ) : null}
            <div className="control-block mode-selector"><label>{language === 'ru' ? 'Режим' : 'Mode'}
              <select aria-label={language === 'ru' ? 'Режим' : 'Mode'} value={generationMode} disabled={!!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob} onChange={e=>{ changeGenerationMode(e.target.value as GenerationMode); }}>
                <option value="classic">{language === 'ru' ? 'Классический режим' : 'Classic mode'}</option>
                <option value="mythic">Mythic Bastionland</option>
              </select></label></div>
            {generationMode==='classic'&&<div className="knave-profile-row"><label title={regions.length||hexTerrainByKey.size?(language==='ru'?'Профиль выбран при создании карты. Для другого профиля начните новую карту.':'The profile was chosen when the map was created. Start a new map to change it.'):undefined} tabIndex={regions.length||hexTerrainByKey.size?0:undefined}><input type="checkbox" aria-label="Knave 2e" checked={!!knave} disabled={!!regions.length||!!hexTerrainByKey.size||mutationBlocked(false)} onChange={e=>chooseKnaveProfile(e.target.checked)}/>Knave 2e</label><span>{language==='ru'?'6 миль / гекс':'6 miles / hex'}</span></div>}
            {!kingdomJob && !detailedRenderReady ? <p role="status" className="kingdom-progress">{language === 'ru' ? 'Отрисовка карты…' : 'Drawing map…'}</p> : null}
            {kingdomJob ? <p role="status" className="kingdom-progress">{language === 'ru' ? 'Создание королевства…' : 'Building kingdom…'} {kingdomHexes(kingdomJob.origin).filter(h=>metadataMap.has(hexKey(h))).length}/144</p> : null}
            {generationMode === 'classic' ? <div className="control-block gen-params" aria-label={t.genParamsLabel}>
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
            : null}
            {regions.length > 0 ? (
              <div className="control-block controls controls--region-management">
                  <button disabled={!!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob} onClick={resetMap} className="secondary">{t.reset}</button>
                  <button type="button" disabled={!!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob || !history.length} onClick={regenerateLastRegion} className="secondary">
                    {t.regenerateRegion}
                  </button>
                  <button type="button" disabled={!!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob || !history.length} onClick={deleteLastRegion} className="secondary">
                    {t.deleteLastRegion}
                  </button>
              </div>
            ) : null}
            <div className="control-block controls controls--display">
              <button
                type="button"
                className="biome-display-toggle"
                onClick={() => setBiomeDisplayMode(mode => mode === 'tiles' ? 'emoji' : mode === 'emoji' ? 'color' : 'tiles')}
                data-mode={biomeDisplayMode}
                aria-label={biomeDisplayToggleLabel}
                title={biomeDisplayToggleTitle}
              >
                <span className="display-toggle__label">{t.hexesDisplay}</span>
                <span>{biomeModeLabel}</span>
              </button>
              <button
                type="button"
                className="poi-display-toggle"
                onClick={() => setUsePoiSvg((value) => !value)}
                aria-pressed={usePoiSvg}
                aria-label={poiDisplayToggleLabel}
                title={poiDisplayToggleTitle}
              >
                <span className="display-toggle__label">{t.pointsDisplay}</span>
                <span>{usePoiSvg ? t.iconsMode : t.emojiMode}</span>
              </button>
              <button
                type="button"
                className="rotate-map-button" data-poi-navigation
                disabled={isImporting} onClick={() => { if (!importInFlight.current) setIsMapRotated(value => !value); }}
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
                className={`hex-coordinate-toggle${showHexCoordinates ? ' is-active' : ''}`}
                onClick={() => setShowHexCoordinates((value) => !value)}
                aria-pressed={showHexCoordinates}
                aria-label={t.showHexCoordinates}
                title={t.showHexCoordinatesTitle}
              >
                <span aria-hidden="true">#</span>
                <span>{t.hexCoordinatesMode}</span>
              </button>
            </div>
            <div className="control-block controls controls--history">
              <button type="button" className="secondary" disabled={!!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob || !undoHistory.length} onClick={undoMap}>{language==='ru'?'Отменить':'Undo'}</button>
              <button type="button" className="secondary" disabled={!!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob || !redoHistory.length} onClick={redoMap}>{language==='ru'?'Повторить':'Redo'}</button>
            </div>
            <div className="control-block controls controls--transfer">
              <details className="export-menu">
                  <summary className="secondary">{t.export}</summary>
                  <div className="export-menu__items">
                    <button type="button" data-poi-export disabled={!renderDetails} onClick={() => void handleExportPng()} className="secondary">PNG</button>
                    <button type="button" data-poi-export onClick={handleExportJson} className="secondary">JSON</button>
                    <small>{language==='ru'?'JSON v8: старые версии приложения не откроют этот файл.':'JSON v8: older app versions cannot open this file.'}</small>
                  </div>
                </details>
              <button type="button" disabled={!!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob} onClick={handleImportJsonClick} className="secondary">{t.importJson}</button>
              {(waterDraft||regionDraft||poiDraft)&&<span className="water-export-notice">{poiDraft?(language==='ru'?'Черновик переноса не входит в JSON и PNG.':'The point-move draft is excluded from JSON and PNG.'):regionDraft?(language==='ru'?'Черновик региона не входит в JSON и PNG.':'The region draft is excluded from JSON and PNG.'):(language==='ru'?'Черновик воды не входит в JSON и PNG.':'The water draft is excluded from JSON and PNG.')}</span>}
              <input ref={jsonImportInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void handleImportJson(event)} />
            </div>
            <div className="control-block world-seed-control">
              <label className="world-seed-control__row">
                <span>{language === 'ru' ? 'Seed мира' : 'World seed'}</span>
                <input aria-label={language === 'ru' ? 'Seed мира' : 'World seed'} inputMode="numeric" value={seedInput}
                  aria-invalid={seedError || undefined} aria-describedby={seedError ? 'world-seed-error' : undefined}
                  readOnly={!!regions.length || !!hexTerrainByKey.size || !!kingdoms.length}
                  disabled={mutationBlocked(false)} onChange={e=>{if(!mutationBlocked(false)){setSeedInput(e.target.value);setSeedError(false);}}} onBlur={applyWorldSeed} />
              </label>
              {seedError ? <p id="world-seed-error" className="world-seed-control__error" role="alert">{language === 'ru' ? 'Seed: целое число от 0 до 4294967295.' : 'Seed: integer from 0 to 4294967295.'}</p> : null}
              {legacyNotice ? <p className="world-seed-control__notice" role="status">{language === 'ru' ? 'Старая карта: seed задан для дальнейшего продолжения' : 'Legacy map: seed assigned for future continuation'}</p> : null}
            </div>
            {generationError && (
              <div className="coast-notice" role="alert">
                <span>{generationError.notesLossHexKeys?.length
                  ? (language === 'ru'
                    ? `Генерация не применена: исчезли бы гексы с заметками (${generationError.notesLossHexKeys.length}): ${generationError.notesLossHexKeys.join('; ')}. Сначала перенесите или очистите заметки. Прежняя карта сохранена.`
                    : `Generation was not applied: hexes with notes would disappear (${generationError.notesLossHexKeys.length}): ${generationError.notesLossHexKeys.join('; ')}. Move or clear the notes first. Your previous map is intact.`)
                  : generationError.kind === 'constraint-rejection'
                  ? (language === 'ru' ? 'Не удалось разместить корректные истоки и устья рек. Прежняя карта сохранена. Попробуйте другой размер или соседний гекс.' : 'Could not place valid river sources and mouths. Your previous map is intact. Try another size or neighboring hex.')
                  : language === 'ru'
                  ? 'Не удалось создать регион из-за ошибки. Прежняя карта сохранена. Можно повторить попытку.'
                  : 'An error prevented region generation. Your previous map is intact. You can try again.'}</span>
                <button type="button" onClick={() => setGenerationError(null)} aria-label={t.closeNotice}>×</button>
              </div>
            )}
            {coastNotice && (
              <div className="coast-notice" role="status">
                <span>{translateCoastNotice(coastNotice, language)}</span>
                <button type="button" onClick={() => setCoastNotice(null)} aria-label={t.closeNotice}>×</button>
              </div>
            )}
          </div>

          <aside id="side-panel-info" className="roll-card">
            <div className="info-body">
              {regions.length > 0 || hexTerrainByKey.size > 0 ? <>
              <section ref={infoFocusRef} tabIndex={-1} className={`info-block info-block--hex${editMode ? ' is-editing' : ''}`} aria-label={t.selectedHexInfo}>
                <div className="direct-mode-row"><button type="button" className="secondary direct-mode" aria-pressed={editMode}
                  aria-label={editMode ? (language === 'ru' ? 'Готово' : 'Done') : (language === 'ru' ? 'Редактировать' : 'Edit')}
                  title={editMode ? (language === 'ru' ? 'Готово' : 'Done') : (language === 'ru' ? 'Редактировать' : 'Edit')}
                  disabled={isImporting || !!pendingRegen || !!kingdomJob || !!poiDraft&&!poiPreview?.plan}
                  data-poi-done onClick={() => { if(knaveDraftRef.current){if(finishKnaveDraft())setEditMode(false);return;} if(poiDraftRef.current){if(finishPoiDraft())setEditMode(false);return;}if (!finishRegionDraft() || !finishPathDrafts() || !finishInlineName()) return; finishNotesGroup(); clearNotesDraft(); closeEditors(); setSelectedRoadPair(null); setSelectedRoadTarget(null); setConfirmRoadRemoval(null); setEditMode(!editMode); }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    {editMode ? <path d="m5 12 4 4L19 6" /> : <><path d="m16 3 5 5-12 12-6 1 1-6Z" /><path d="m14 5 5 5" /></>}
                  </svg>
                </button></div>
                {selectedKingdom ? <p>{language === 'ru' ? 'Королевство' : 'Kingdom'}: {renderName(`kingdom:${selectedKingdom.id}`)}</p> : null}
                {selectedRegion ? <>
                  <p><strong>{SIZE_LABELS[language][selectedRegion.sizeCategory]}</strong> {renderToponym(`region:${selectedRegion.id}`)}</p>
                  <div className="direct-line">{editMode && editingRegionBiomeId === selectedRegion.id ? <select autoFocus aria-label={language === 'ru' ? 'Местность региона' : 'Region terrain'}
                    value={selectedRegion.biomeId} onChange={e => setSelectedRegionBiome(e.target.value as BiomeId)} onBlur={() => setEditingRegionBiomeId(null)}>
                    {Object.values(BIOMES).filter(b => b.heightLevel === selectedRegion.heightLevel).map(b => {
                      const reason = b.id === selectedRegion.biomeId ? null : regionBiomeReason(selectedRegion, b.id);
                      return <option key={b.id} value={b.id} disabled={!!reason}>{getBiomeLabel(b.id, language)}{reason ? ` — ${reason}` : ''}</option>;
                    })}</select> : editableValue(language === 'ru' ? 'Местность региона' : 'Region terrain',
                      `${BIOMES[selectedRegion.biomeId].primaryEmoji}${BIOMES[selectedRegion.biomeId].secondaryEmojis.join('')} ${getBiomeLabel(selectedRegion.biomeId, language)}`,
                      () => setEditingRegionBiomeId(selectedRegion.id))}{renderTags({kind:'region',id:selectedRegion.id},'region')}</div>
                  {!poiDraft&&regionPanel}
                </> : isSelectedLake ? <p><strong>💧 {t.lake}</strong> {renderToponym(`lake:${selectedTerrain?.lakeId}`)}{selectedTerrain?.lakeId?renderTags({kind:'lake',id:selectedTerrain.lakeId},'lake'):null}</p>
                  : isSelectedSea ? <><p><strong>{SEA_EMOJI} {t.sea}</strong></p><div className="direct-line">{renderWaterPoi()}</div></>
                  : <p><strong>{isSelectedCandidate ? t.candidateForRegion : t.noHexSelected}</strong></p>}
                {selectedHex ? <p><strong>{t.selectedHex}:</strong> {selectedHex.q}/{selectedHex.r}</p> : null}
                {!poiDraft&&waterPanel}{poiPanel}{knavePanel}
                {!isSelectedCandidate && selectedRegion ? (
                  <>
                    {!isSelectedLake&&!isSelectedSea&&selectedEffectiveBiomeId ? <div className="direct-line">
                      {language === 'ru' ? 'Местность: ' : 'Terrain: '}
                      {isEditingSelectedHexBiome && editMode ? <select autoFocus aria-label={t.editHexBiome}
                        value={selectedHexBiomeOverride ?? ''} onChange={e => e.target.value ? setSelectedHexBiomeOverride(e.target.value as BiomeId) : resetSelectedHexBiomeOverride()}
                        onBlur={() => setEditingHexBiomeKey(null)}>
                        <option value="">{language === 'ru' ? 'Как в регионе' : 'Inherit region'}</option>
                        {Object.values(BIOMES).map(b => <option key={b.id} value={b.id}>{getBiomeLabel(b.id, language)}</option>)}
                      </select> : editableValue(t.editHexBiome, selectedHexBiomeOverride
                        ? `${getBiomeLabel(selectedHexBiomeOverride, language)}${selectedHexBiomeOverride === selectedRegion.biomeId ? (language === 'ru' ? ' · локально' : ' · local') : ''}`
                        : (language === 'ru' ? 'как в регионе' : 'inherit region'), () => setEditingHexBiomeKey(selectedHexKey))}
                    </div> : null}
                    <p>{selectedRegion.biomeLandType === 'settled' ? t.settledRegion : t.wildArea}</p>
                    {selectedHasCentralPoi ? <div className="direct-line">⭐ {isEditingSelectedCentralPoi && editMode ? <select autoFocus aria-label={t.choosePoi}
                      value={selectedRegion.centralPoiKind ?? ''} onChange={e => setSelectedCentralPoiKind(e.target.value as CentralPoiKind)} onBlur={() => setEditingCentralPoiRegionId(null)}>
                      {Object.entries(CENTRAL_POI_DETAILS).filter(([kind]) => editableCentralKinds.includes(kind as MythicPoi)).map(([kind,details]) => <option key={kind} value={kind}>{details.emoji} {details.label[language]}</option>)}
                    </select> : editableValue(t.editPoi, `${getCentralPoiEmoji(selectedRegion)} ${getCentralPoiLabel(selectedRegion, language)}`, () => setEditingCentralPoiRegionId(selectedRegion.id))}
                      {' '}{renderToponym(`settlement:${selectedRegion.id}:${hexKey(selectedRegion.centerHex)}`)}{renderTags({kind:'poi',regionId:selectedRegion.id,hexKey:hexKey(selectedRegion.centerHex)},selectedRegion.centralPoiKind??'')}</div> : null}
                    {isSelectedLake ? <div className="direct-line">{renderWaterPoi()}</div> : null}
                    {canEditSelectedPoi && selectedHex && !selectedHasCentralPoi ? <div className="direct-line">
                      {isEditingSelectedPoi && editMode ? <select autoFocus aria-label={t.choosePoi} value={selectedPoiKind ?? ''}
                        onChange={e => e.target.value ? setSelectedPoiKind(e.target.value as PoiKind) : deleteSelectedPoi()} onBlur={() => setEditingPoiHexKey(null)}>
                        <option value="">{language === 'ru' ? 'Нет точки' : 'No point'}</option>
                        {editablePoiKinds.map(kind => <option key={kind} value={kind}>{POI_DETAILS[kind].emoji} {POI_DETAILS[kind].label[language]}</option>)}
                      </select> : selectedPoiKind || editMode ? editableValue(t.editPoi, selectedPoiKind
                        ? `${getPoiEmojiForHex(selectedRegion, selectedHex)} ${getPoiLabelForHex(selectedRegion, selectedHex, language)}` : t.addPoi,
                        () => setEditingPoiHexKey(selectedHexKey)) : null}
                      {' '}{selectedPoiKind ? renderToponym(`settlement:${selectedRegion.id}:${selectedHexKey}`) : null}{selectedPoiKind?renderTags({kind:'poi',regionId:selectedRegion.id,hexKey:selectedHexKey!},selectedPoiKind):null}
                    </div> : null}
                    {selectedHexRoadIds.map((roadId) => <p key={`selected-road-${roadId}`}>▬ {t.road} {roadId} {renderName(`road:${roadId}`,'selected-road')}</p>)}
                    {selectedHexTrailIds.map((trailId) => <p key={`selected-trail-${trailId}`}>⋯ {t.trail} {trailId} {selectedHexRoadIds.includes(trailId)?null:renderName(`road:${trailId}`,'selected-road')}</p>)}
                    {editMode || selectedObstacles.length > 0 || nearbyRivers.length > 0 || selectedHexCrossings.length > 0 || nearbyLakeIds.length > 0 || hasNearbySea ? (
                      <div>
                        <strong tabIndex={-1} data-obstacle-list>{t.nearby}</strong>
                        {nearbyRivers.map((river) => {
                          const hasRapids = river.vertexPath.some((vertex, index) => index > 0
                            && selectedHexEdgeKeys.has(edgeKey(river.vertexPath[index - 1], vertex))
                            && rapidRiverEdgeKeys.has(edgeKey(river.vertexPath[index - 1], vertex)));
                          const hasWaterfall = river.vertexPath.some((vertex) => (
                            selectedHexVertexKeys.has(vertex.key) && waterfallRiverVertexKeys.has(vertex.key)
                          ));
                          const riverFeatures = [hasWaterfall ? waterfallLabel : null, hasRapids ? t.rapids : null].filter((feature): feature is string => feature !== null);
                          return <div className="nearby-river-row" key={`nearby-river-${river.id}`}><p><span className="nearby-river-marker" aria-hidden="true">→</span>{hasRapids ? <span className="nearby-river-marker" aria-hidden="true">|||</span> : null}{hasWaterfall ? <img className="nearby-waterfall-marker" src="/waterfall-color.svg" alt="" aria-hidden="true" /> : null} {editMode?<button type="button" className="direct-value river-choice" data-river-choice={river.id} aria-label={`${language==='ru'?'Выбрать реку':'Select river'} ${nameTargets.find(target=>target.key===`river:${river.id}`)?.[language]??river.id}`} aria-pressed={riverFeatureTarget?.riverId===river.id&&riverFeatureTarget.hexKey===selectedHexKey} onClick={()=>chooseRiverFeatureTarget({riverId:river.id,hexKey:selectedHexKey!})}>{t.river}</button>:t.river} {renderToponym(`river:${river.id}`)}{riverFeatures.length > 0 ? ` (${riverFeatures.join(', ')})` : ''}{renderTags({kind:'river',id:river.id},'river')}</p>{stableNameObjects.filter(o=>(o.type==='rapid'&&o.riverId===river.id&&!!o.edgeKey&&selectedHexEdgeKeys.has(o.edgeKey))||(o.type==='waterfall'&&o.riverId===river.id&&!!o.vertexKey&&selectedHexVertexKeys.has(o.vertexKey))).map(o=><div key={o.key}>{nameTypeLabels[o.type]} {renderName(o.key,'nearby-feature')}</div>)}{riverFeaturePanel(river)}</div>;
                        })}
                        {selectedObstacles.map(o=><div key={o.id} className="obstacle-row" data-obstacle-id={o.id}>
                          {editMode?<button type="button" className="direct-value" aria-label={`${language==='ru'?'Выбрать препятствие':'Select barrier'} ${o.id}: ${hexKey(o.hex)} → ${hexKey(o.neighborHex)}`} aria-pressed={selectedObstacleId===o.id} onClick={()=>chooseObstacle(o.id)}>━ {language==='ru'?'Препятствие':'Barrier'} · {hexKey(o.hex)===selectedHexKey?hexKey(o.neighborHex):hexKey(o.hex)}</button>:<span>━ {language==='ru'?'Препятствие':'Barrier'} ({hexKey(o.hex)===selectedHexKey?hexKey(o.neighborHex):hexKey(o.hex)})</span>}
                          {renderName(`obstacle:${o.id}`)}
                          {editMode&&selectedObstacleId===o.id&&!obstacleDraft&&<><button type="button" className="secondary" onClick={()=>startObstacleChoice(o.id)}>{language==='ru'?'Перенести':'Move'}</button><button type="button" className="secondary" onClick={()=>editObstacleDocument({type:'remove',id:o.id})}>{language==='ru'?'Удалить':'Delete'}</button></>}
                        </div>)}
                        {selectedHexCrossings.map((crossing) => <p key={`selected-crossing-${crossing.key}`}>{crossing.kind === 'bridge' ? '🌉' : crossing.kind === 'ferry' ? '⛴️' : '🌊'} {t[crossing.kind]} {renderName(`crossing:${crossing.key}`)}</p>)}
                        {nearbyLakeIds.map((lakeId) => <p key={`nearby-lake-${lakeId}`}>💧 {t.lake} {renderToponym(`lake:${lakeId}`, 'nearby')}{renderTags({kind:'lake',id:lakeId},'lake')}</p>)}
                        {hasNearbySea ? <p>{t.sea}</p> : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
                <span className="visually-hidden" aria-live="polite">{tagAnnouncement}</span>
                {editMode&&generationMode==='mythic'&&tagOwners(captureMap()).size>0?<button type="button" className="tag-add" onClick={fillMissingTags}>{language==='ru'?'Заполнить недостающие теги':'Fill missing tags'}</button>:null}
                {obstaclePanel}
                {riverAmbiguityPanel}{riverPreviewPanel}{roadResolutionPanel}{riverDraftPanel}
                {roadDraftPanel}
                {roadPanel}
                {editError && !poiDraft && !waterDraft && !regionDraft && <p className="direct-error" role="alert">{editError}</p>}
                {canEditNotes && selectedHexKey && (notesValue || editMode) ? <div className="gm-notes">
                  <strong id="gm-notes-label">{language === 'ru' ? 'Заметки мастера' : 'GM notes'}</strong>
                  {notesOpen && editMode ? <textarea ref={notesTextRef} id="gm-notes-text" aria-labelledby="gm-notes-label" rows={4} value={notesValue}
                    disabled={!!poiDraft || !!regionDraft || !!waterDraft || !!roadFeatureResolution || !!riverCommandPreview || !!riverDraft || !!roadDraft || isImporting || !!pendingRegen || !!kingdomJob}
                    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { finishNotesGroup(); setNotesEditorKey(null); } }}
                    onCompositionStart={() => { notesComposingRef.current = true; if (notesTimerRef.current !== null) clearTimeout(notesTimerRef.current); }}
                    onCompositionEnd={event => { notesComposingRef.current = false; changeNotesText(selectedHexKey, event.currentTarget.value); notesTimerRef.current = setTimeout(finishNotesGroup, 500); }}
                    onBlur={() => { notesComposingRef.current = false; finishNotesGroup(); setNotesEditorKey(null); }}
                    onChange={event => changeNotesText(selectedHexKey, event.target.value)} />
                    : editMode ? <button type="button" className="direct-value gm-notes__text" onClick={() => openNotesEditor(selectedHexKey)}>
                      {notesValue || (language === 'ru' ? 'Добавить заметку' : 'Add note')}</button>
                      : <p className="gm-notes__text">{notesValue}</p>}
                  {notesError && <p role="alert">{language === 'ru' ? 'Не удалось изменить заметку' : 'The note could not be changed'}</p>}
                </div> : null}
              </section>

              {typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('debug')==='1'&&<details
                className="info-block info-block--debug"
                aria-label={t.debugInfo}
                open={debugRivers}
                onToggle={(event) => setDebugRivers(event.currentTarget.open)}
              >
                <summary className="debug-summary">
                  {t.debug}: {debugRivers ? 'ON' : 'OFF'}
                </summary>
                <div className="debug-panel-body">
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
                      <p><strong>{t.type}:</strong> {selectedType}</p>
                      {selectedRegion ? (
                        <>
                          <p><strong>{t.selectedRegionHeight}:</strong> {getRegionHeightLabel(selectedRegion.heightLevel ?? getRegionHeightLevelFromBiomeId(selectedRegion.biomeId), language)}</p>
                          <p><strong>{t.selectedRegionSize}:</strong> {getRegionSizeDisplay(selectedRegion, language)}</p>
                          {selectedRegion.riverSlope ? (
                            <div>
                              <p><strong>River slope before region:</strong> {selectedRegion.riverSlope.direction}, strength {selectedRegion.riverSlope.strength.toFixed(2)}, confidence {(selectedRegion.riverSlope.confidence * 100).toFixed(0)}%</p>
                              <p>riverSlope radius: {selectedRegion.riverSlope.radius}, edges: {selectedRegion.riverSlope.edgeCount}, total: {selectedRegion.riverSlope.totalContribution.toFixed(2)}, vector: {selectedRegion.riverSlope.vector.x.toFixed(2)}/{selectedRegion.riverSlope.vector.y.toFixed(2)}</p>
                              <p>riverSlope directions: E {selectedRegion.riverSlope.directionScores.E.toFixed(2)}; NE {selectedRegion.riverSlope.directionScores.NE.toFixed(2)}; NW {selectedRegion.riverSlope.directionScores.NW.toFixed(2)}; W {selectedRegion.riverSlope.directionScores.W.toFixed(2)}; SW {selectedRegion.riverSlope.directionScores.SW.toFixed(2)}; SE {selectedRegion.riverSlope.directionScores.SE.toFixed(2)}</p>
                            </div>
                          ) : null}
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
                </div>
              </details>}
              </> : null}
            <section className="info-block map-names" aria-label={language === 'ru' ? 'Названия карты' : 'Map names'}>
              <button type="button" className="secondary map-names__toggle" aria-expanded={namesOpen} aria-controls="map-names-catalog" onClick={() => {if(finishWaterDraft())namesOpen ? requestNameTarget(null) : setNamesOpen(true);}}>{language === 'ru' ? 'Найти объект' : 'Find object'}</button>
              <p role="status" aria-live="polite">{nameStatus === 'saved' ? (language === 'ru' ? 'Название сохранено' : 'Name saved') : nameStatus === 'stale' ? (language === 'ru' ? 'Карта изменилась. Выберите объект заново.' : 'The map changed. Select the object again.') : ''}</p>
              {namesOpen && <div id="map-names-catalog">
                <label>{language === 'ru' ? 'Поиск по имени' : 'Search names'}<input type="search" value={nameQuery} onChange={e => setNameQuery(e.target.value)} /></label>
                <label>{language === 'ru' ? 'Тип объекта' : 'Object type'}<select value={nameType} onChange={e => setNameType(e.target.value)}><option value="all">{language === 'ru' ? 'Все типы' : 'All types'}</option>{Object.entries(nameTypeLabels).map(([type,label]) => <option key={type} value={type}>{label}</option>)}</select></label>
                <ul className="map-names__list">{nameTargets.filter(target => (nameType === 'all' || target.type === nameType) && `${target.ru} ${target.en} ${target.fallback?.ru??''} ${target.fallback?.en??''}`.toLocaleLowerCase().includes(nameQuery.toLocaleLowerCase())).map(target => <li key={target.key}>
                  <span>{nameTypeLabels[target.type]} · <button type="button" className="direct-find" data-target-key={target.key} disabled={!target.location}
                    aria-label={`${nameTypeLabels[target.type]}: ${target[language]} · ${target.location||'—'}`}
                    onClick={()=>selectNameTarget(target.key)}>{target[language]||target.fallback?.[language]||nameTypeLabels[target.type]}</button></span><small>{target.location||'—'}</small>
                </li>)}</ul>
                {nameCatalog.unavailable ? <p role="alert">{language === 'ru' ? 'Список названий временно недоступен. Карта не изменена.' : 'The name list is temporarily unavailable. Your map is unchanged.'}</p> : !nameTargets.length && <p>{language === 'ru' ? 'На карте пока нет именованных объектов.' : 'There are no named objects on this map yet.'}</p>}
                {!!nameTargets.length && !nameTargets.some(target => (nameType === 'all' || target.type === nameType) && `${target.ru} ${target.en} ${target.fallback?.ru??''} ${target.fallback?.en??''}`.toLocaleLowerCase().includes(nameQuery.toLocaleLowerCase())) && <p>{language === 'ru' ? 'Объекты не найдены.' : 'No matching objects.'}</p>}
              </div>}

            </section>
            </div>
          </aside>
          </div>
          <div
            ref={mapViewportRef}
            className="map-viewport"
            tabIndex={0}
            aria-label={t.mapAria}
            onPointerDownCapture={event=>{const old=riverDraftGesture.current;if(old?.active&&old.pointerId!==event.pointerId)old.moved=true;else riverDraftGesture.current={x:event.clientX,y:event.clientY,pointerId:event.pointerId,active:true,moved:false};}}
            onPointerMoveCapture={event=>{const g=riverDraftGesture.current;if(g?.active&&Math.hypot(event.clientX-g.x,event.clientY-g.y)>4)g.moved=true;}}
            onPointerUpCapture={()=>{if(riverDraftGesture.current)riverDraftGesture.current.active=false;}}
            onPointerCancelCapture={()=>{if(riverDraftGesture.current){riverDraftGesture.current.moved=true;riverDraftGesture.current.active=false;}}}
            onMouseDown={handleMapMouseDown}
            onMouseMove={handleMapMouseMove}
            onMouseUp={handleMapMouseUp}
            onMouseLeave={handleMapMouseUp}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={handleMapKeyDown}
          >
            <div ref={mapStageRef} className="map-stage" style={{ width: `${displayMapWidth * mapScaleRef.current}px`, height: `${displayMapHeight * mapScaleRef.current}px` }}>
            <svg
              ref={mapSvgRef}
              data-biome-display={biomeDisplayMode}
              data-render-phase={kingdomJob ? 'generation' : renderDetails ? 'ready' : 'render-pending'}
              viewBox={`0 0 ${displayMapWidth} ${displayMapHeight}`}
              preserveAspectRatio="xMinYMin meet"
              style={{ width: `${displayMapWidth}px`, height: `${displayMapHeight}px`, transform: `translateZ(0) scale(${mapScaleRef.current})`, '--road-hit-width': `${44/mapScaleRef.current}px`, '--crossing-hit-radius': `${22/mapScaleRef.current}px`, '--water-color': WATER_PALETTE.river, '--water-marks': WATER_PALETTE.marks } as CSSProperties}
            >
            {mapArtwork}
            {editMode&&riverFeatureTarget&&!riverDraft&&<g data-editor-only="river-selected" transform={mapRotationTransform} pointerEvents="none">
              <defs><marker id="river-selected-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={4} markerHeight={4} orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#7dd3fc" /></marker></defs>
              {rivers.filter(r=>r.id===riverFeatureTarget.riverId).flatMap(r=>r.vertexPath.slice(1).map((v,i)=><line key={i} x1={r.vertexPath[i].x+riverOffset.x} y1={r.vertexPath[i].y+riverOffset.y} x2={v.x+riverOffset.x} y2={v.y+riverOffset.y} stroke="#7dd3fc" strokeWidth={5} markerEnd="url(#river-selected-arrow)" />))}
            </g>}
            {editMode&&riverFeatureTarget&&riverFeatureTarget.hexKey===selectedHexKey&&!roadDraft&&!obstacleDraft&&<g data-editor-only="river-feature" transform={mapRotationTransform} pointerEvents="none">
              {rivers.filter(r=>r.id===riverFeatureTarget.riverId).flatMap(r=>r.vertexPath.slice(1).map((v,i)=>({a:r.vertexPath[i],b:v}))).filter(e=>riverFeatureTarget.edgeKey?riverReachKeys.has(edgeKey(e.a,e.b)):false).map(e=><line data-river-reach-edge={edgeKey(e.a,e.b)} key={edgeKey(e.a,e.b)} x1={e.a.x+riverOffset.x} y1={e.a.y+riverOffset.y} x2={e.b.x+riverOffset.x} y2={e.b.y+riverOffset.y} stroke="#f7dc6f" strokeWidth={4} strokeDasharray="6 3" />)}
              {riverFeatureTarget.vertexKey&&rivers.find(r=>r.id===riverFeatureTarget.riverId)?.vertexPath.filter(v=>v.key===riverFeatureTarget.vertexKey).map(v=><circle key={v.key} cx={v.x+riverOffset.x} cy={v.y+riverOffset.y} r={6} fill="#f7dc6f" />)}
            </g>}
            {(riverCommandPreview||riverDraft?.riverId!==undefined)&&<g data-editor-only="river-preview" transform={mapRotationTransform} pointerEvents="none">
              <defs><marker id="river-preview-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={4} markerHeight={4} orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#f7dc6f" /></marker></defs>
              {rivers.filter(r=>r.id===(riverDraft?.riverId??(riverCommandPreview?.edit.type!=='create'?riverCommandPreview?.edit.riverId:undefined))).flatMap(r=>r.vertexPath.slice(1).map((v,i)=><line key={i} x1={r.vertexPath[i].x+riverOffset.x} y1={r.vertexPath[i].y+riverOffset.y} x2={v.x+riverOffset.x} y2={v.y+riverOffset.y} stroke="#64748b" strokeWidth={5} opacity={0.65} />))}
              {riverCommandPreview&&riverPreviewPlan?.plan?.map.rivers.filter(r=>r.id===(riverCommandPreview.edit.type==='create'?nextRiverId:riverCommandPreview.edit.riverId)).flatMap(r=>r.vertexPath.slice(1).map((v,i)=><line key={i} x1={r.vertexPath[i].x+riverOffset.x} y1={r.vertexPath[i].y+riverOffset.y} x2={v.x+riverOffset.x} y2={v.y+riverOffset.y} stroke="#f7dc6f" strokeWidth={4} strokeDasharray="6 3" markerEnd="url(#river-preview-arrow)" />))}
            </g>}
            {riverDraft&&<g data-editor-only="river-draft" transform={mapRotationTransform}>
              <defs><marker id="river-draft-arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={4} markerHeight={4} orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#f7dc6f" /></marker></defs>
              {riverDraft.path.slice(1).map((v,i)=>{const a=riverDraft.path[i];return <line key={i} x1={a.x+riverOffset.x} y1={a.y+riverOffset.y} x2={v.x+riverOffset.x} y2={v.y+riverOffset.y} stroke="#f7dc6f" strokeWidth={4} strokeDasharray="6 3" markerEnd="url(#river-draft-arrow)" pointerEvents="none" />;})}
              {riverDraftVertices.map((v,i)=><circle key={v.key} data-river-draft-vertex={v.key} className="river-draft-map-target" role="button" tabIndex={0} aria-label={`${language==='ru'?'Вершина реки':'River vertex'} ${i+1}`} cx={v.x+riverOffset.x} cy={v.y+riverOffset.y} style={{r:'var(--crossing-hit-radius)'}} fill="transparent" pointerEvents="all" onClick={e=>activateRiverDraftPointer(e,v.key,riverDraft)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();appendRiverDraft(v.key,riverDraft);}}} />)}
              {riverDraftVertices.map(v=><circle key={v.key} cx={v.x+riverOffset.x} cy={v.y+riverOffset.y} r={riverDraftHover===v.key?7:3} fill={riverDraftHover===v.key||v.key===riverDraft.path[riverDraft.path.length-1]?.key?'#f7dc6f':'#7dd3fc'} pointerEvents="none" />)}
            </g>}
            {roadDraft && <g data-editor-only="draft" transform={mapRotationTransform} pointerEvents="none">
              {roadDraft.path.map((h,i)=>{const p=toPixel(h.q,h.r);return <circle key={i} cx={p.x+riverOffset.x} cy={p.y+riverOffset.y} r={i===roadDraft.path.length-1?6:3} fill="#7dd3fc" />;})}
              {roadDraft.path.slice(1).map((h,i)=>{const a=toPixel(roadDraft.path[i].q,roadDraft.path[i].r),b=toPixel(h.q,h.r);return <line key={i} x1={a.x+riverOffset.x} y1={a.y+riverOffset.y} x2={b.x+riverOffset.x} y2={b.y+riverOffset.y} stroke="#7dd3fc" strokeWidth={4} strokeDasharray="6 3" />;})}
            </g>}
            {editMode && !poiDraft && !regionDraft && !waterDraft && !riverDraft && !roadDraft && renderDetails && <g data-editor-only="roads" transform={mapRotationTransform}>
              {roadSegments.map(s=><line key={s.key} className="road-map-target" role="button" tabIndex={0}
                aria-label={`${language==='ru'?'Участок':'Segment'} ${s.roadId}: ${s.segmentKey}`} aria-pressed={selectedRoadPair===s.segmentKey&&selectedRoadTarget?.roadId===s.roadId&&!selectedRoadTarget.crossingKey}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="transparent" style={{strokeWidth:'var(--road-hit-width)'}} pointerEvents="stroke"
                onClick={e=>{e.stopPropagation();chooseRoadPair(s.segmentKey,s.roadId);}}
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();chooseRoadPair(s.segmentKey,s.roadId);}}} />)}
              {renderedCrossings.map(c=><circle key={c.key} className="crossing-map-target" role="button" tabIndex={0}
                aria-label={`${language==='ru'?'Переправа':'Crossing'} ${c.key}`} aria-pressed={selectedRoadTarget?.crossingKey===c.key}
                cx={c.x} cy={c.y} style={{r:'var(--crossing-hit-radius)'}} fill="transparent" pointerEvents="all"
                onClick={e=>{e.stopPropagation();chooseRoadPair(c.roadSegmentKey,c.roadId,c.key);}}
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();chooseRoadPair(c.roadSegmentKey,c.roadId,c.key);}}} />)}
              {renderedCrossings.filter(c=>c.key===selectedRoadTarget?.crossingKey).map(c=><circle key={`selected-${c.key}`} cx={c.x} cy={c.y} r={9} fill="none" stroke="#7dd3fc" strokeWidth={3} pointerEvents="none" />)}
              {roadSegments.filter(s=>confirmRoadRemoval ? s.roadId===confirmRoadRemoval.roadId&&(!confirmRoadRemoval.segmentKey||s.segmentKey===confirmRoadRemoval.segmentKey):s.segmentKey===selectedRoadPair&&s.roadId===selectedRoadTarget?.roadId&&!selectedRoadTarget.crossingKey).map(s=><line key={s.key}
                x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#7dd3fc" strokeWidth={4} strokeDasharray="6 3" pointerEvents="none" />)}
            </g>}
            {editMode && !poiDraft && !regionDraft && !waterDraft && !riverDraft && !roadDraft && renderDetails && <g data-editor-only="obstacles" transform={mapRotationTransform}>
              {!obstacleDraft && obstacles.map(o=>{const e=obstacleGeometry(o);if(!e)return null;return <circle key={o.id}
                data-obstacle-map-id={o.id} className="obstacle-map-target" role="button" tabIndex={0}
                aria-label={`${language==='ru'?'Выбрать препятствие':'Select barrier'} ${o.id}: ${hexKey(o.hex)} → ${hexKey(o.neighborHex)}`}
                aria-pressed={selectedObstacleId===o.id} cx={(e.from.x+e.to.x)/2+riverOffset.x} cy={(e.from.y+e.to.y)/2+riverOffset.y}
                style={{r:'var(--crossing-hit-radius)'}} fill="transparent" pointerEvents="all"
                onClick={event=>activateObstaclePointer(event,()=>chooseObstacle(o.id))}
                onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();chooseObstacle(o.id);}}} />;})}
              {obstacles.filter(o=>o.id===(obstacleDraft?.id??selectedObstacleId)).map(o=>{const e=obstacleGeometry(o);return e?<g key={o.id}><line x1={e.from.x+riverOffset.x} y1={e.from.y+riverOffset.y} x2={e.to.x+riverOffset.x} y2={e.to.y+riverOffset.y} stroke="#0c1423" strokeWidth={10} pointerEvents="none" /><line
                data-obstacle-highlight={o.id} x1={e.from.x+riverOffset.x} y1={e.from.y+riverOffset.y} x2={e.to.x+riverOffset.x} y2={e.to.y+riverOffset.y}
                stroke="#f7dc6f" strokeWidth={6} pointerEvents="none" /></g>:null;})}
              {obstacleDraft && obstacleChoices.filter(c=>!c.reason).map(c=>{
                const e=obstacleGeometry({hex:c.edit.hex,edgeKey:obstacleContext().edgeKey(c.edit.hex,c.neighborHex)!});if(!e)return null;
                return <g key={e.edgeKey}>
                  <line data-obstacle-preview={e.edgeKey} x1={e.from.x+riverOffset.x} y1={e.from.y+riverOffset.y} x2={e.to.x+riverOffset.x} y2={e.to.y+riverOffset.y}
                    stroke="#7dd3fc" strokeWidth={hoverObstacleEdge===e.edgeKey?5:2} strokeDasharray="5 3" pointerEvents="none" />
                  <circle data-obstacle-edge={e.edgeKey} className="obstacle-map-target" role="button" tabIndex={0}
                    aria-label={`${language==='ru'?'Ребро':'Edge'} · ${obstacleDraft.id===null?(language==='ru'?'Добавить препятствие':'Add barrier'):(language==='ru'?'Перенести препятствие':'Move barrier')} ${selectedHexKey} → ${hexKey(c.neighborHex)}`}
                    cx={(e.from.x+e.to.x)/2+riverOffset.x} cy={(e.from.y+e.to.y)/2+riverOffset.y} style={{r:'var(--crossing-hit-radius)'}} fill="transparent" pointerEvents="all"
                    onFocus={()=>setHoverObstacleEdge(e.edgeKey)} onMouseEnter={()=>setHoverObstacleEdge(e.edgeKey)} onMouseLeave={()=>setHoverObstacleEdge(null)}
                    onClick={event=>activateObstaclePointer(event,()=>editObstacleDocument(c.edit,obstacleDraft))}
                    onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();editObstacleDocument(c.edit,obstacleDraft);}}} />
                </g>;
              })}
            </g>}
            {editMode&&!poiDraft&&!regionDraft&&!waterDraft&&!riverDraft&&!roadDraft&&!obstacleDraft&&!riverCommandPreview&&<g data-editor-only="river-targets" transform={mapRotationTransform}>
              {riverMapTargets.map(target=><line key={`${target.riverId}:${target.edgeKey}`} data-river-map-edge={`${target.riverId}:${target.edgeKey}`} className="river-map-target" role="button" tabIndex={0} aria-label={`${language==='ru'?'Река':'River'} ${riverLabel(target.riverId)} · ${target.hexKey}`} x1={target.a.x+riverOffset.x} y1={target.a.y+riverOffset.y} x2={target.b.x+riverOffset.x} y2={target.b.y+riverOffset.y} stroke="transparent" style={{strokeWidth:'var(--road-hit-width)'}} pointerEvents="stroke" onClick={event=>activateMapRiver(event,target)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();chooseMapRiver(target);}}} />)}
              {riverHitHover&&riverMapTargets.filter(t=>t.riverId===riverHitHover.riverId&&t.edgeKey===riverHitHover.edgeKey).map(t=><line key={t.edgeKey} x1={t.a.x+riverOffset.x} y1={t.a.y+riverOffset.y} x2={t.b.x+riverOffset.x} y2={t.b.y+riverOffset.y} stroke="#f7dc6f" strokeWidth={7} pointerEvents="none" />)}
            </g>}
            </svg>
            <canvas ref={mapMotionCanvasRef} className="map-motion-buffer" aria-hidden="true" />
            {poiDraft&&<svg ref={waterDraftOverlayRef} className="selected-hex-overlay" data-editor-only="poi-draft" aria-hidden="true" viewBox={`0 0 ${displayMapWidth} ${displayMapHeight}`} style={{width:`${displayMapWidth}px`,height:`${displayMapHeight}px`,transform:`translateZ(0) scale(${mapScaleRef.current})`}}><g transform={mapRotationTransform}>{positionedHexes.hexes.filter(h=>h.kind!=='candidate'&&(h.key===poiDraft.source.hexKey||h.key===`${poiDraft.q},${poiDraft.r}`)).map(h=><polygon key={h.key} data-poi-draft-cell={h.key} points={hexPoints(h.x,h.y,HEX_SIZE)} fill="none" stroke={h.key===poiDraft.source.hexKey?'#7dd3fc':'#facc15'} strokeWidth={3/mapScaleRef.current} strokeDasharray={h.key===poiDraft.source.hexKey?'5 4':undefined}/>)}</g></svg>}
            {waterDraft&&<svg ref={waterDraftOverlayRef} className="selected-hex-overlay" data-editor-only="water-draft" aria-hidden="true" viewBox={`0 0 ${displayMapWidth} ${displayMapHeight}`} style={{width:`${displayMapWidth}px`,height:`${displayMapHeight}px`,transform:`translateZ(0) scale(${mapScaleRef.current})`}}>
              <g transform={mapRotationTransform}>{positionedHexes.hexes.filter(h=>h.kind!=='candidate'&&waterDraft.edit.hexKeys.includes(h.key)).map(h=><polygon key={h.key} data-water-draft-cell={h.key} points={hexPoints(h.x,h.y,HEX_SIZE)} fill={waterDraft.edit.target==='land'?'#f7dc6f':'#159dac'} fillOpacity={0.45} stroke="#a5f3fc" strokeWidth={2/mapScaleRef.current}/>)}</g>
            </svg>}
            {regionDraft&&<svg ref={waterDraftOverlayRef} className="selected-hex-overlay" data-editor-only="region-draft" role="group" aria-label={language==='ru'?'Черновик региона на карте':'Region draft on map'} viewBox={`0 0 ${displayMapWidth} ${displayMapHeight}`} style={{width:`${displayMapWidth}px`,height:`${displayMapHeight}px`,transform:`translateZ(0) scale(${mapScaleRef.current})`}}>
              <g transform={mapRotationTransform}>{positionedHexes.hexes.filter(h=>h.kind!=='candidate'&&(regionDraft.edit.type==='region_height'
                ?metadataMap.get(h.key)?.regionId===regionDraft.edit.regionId:h.key===regionDraft.edit.hexKey)).map(h=><polygon key={h.key} data-region-draft-cell={h.key}
                  points={hexPoints(h.x,h.y,HEX_SIZE)} fill="#f7dc6f" fillOpacity={0.25} stroke="#f7dc6f" strokeWidth={2/mapScaleRef.current} aria-hidden="true"/>)}
                {regionTargetOutline.map(edge=><line key={edge.edgeKey} data-region-target-contour={edge.edgeKey} x1={edge.from.x+riverOffset.x} y1={edge.from.y+riverOffset.y} x2={edge.to.x+riverOffset.x} y2={edge.to.y+riverOffset.y} stroke="#34d399" strokeWidth={2/mapScaleRef.current} strokeDasharray="5 3" aria-hidden="true"/>)}
                {regionMapTargets.map(target=><circle key={target.id} data-region-map-target={target.id} cx={target.x} cy={target.y} r={22/mapScaleRef.current} fill="transparent" stroke={regionTargetHoverId===target.id?'#34d399':'transparent'} strokeWidth={2} vectorEffect="non-scaling-stroke" role="button" tabIndex={0}
                  aria-label={`${language==='ru'?'Передать гекс':'Transfer hex'} ${regionDraft.originKey} → ${regionLabel(target.id)}`} aria-pressed={regionDraft.edit.type==='transfer_hex'&&regionDraft.edit.toRegionId===target.id} style={{pointerEvents:'all',cursor:'pointer'}}
                  onMouseEnter={()=>{if(regionDraftRef.current===regionDraft)setRegionTargetHoverId(target.id);}} onMouseLeave={()=>{if(regionDraftRef.current===regionDraft)setRegionTargetHoverId(null);}} onFocus={()=>{if(regionDraftRef.current===regionDraft)setRegionTargetHoverId(target.id);}} onBlur={()=>{if(regionDraftRef.current===regionDraft)setRegionTargetHoverId(null);}} onClick={event=>activateRegionTarget(event,target.id)}
                  onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();selectRegionTarget(target.id);}}}/>)}</g>
            </svg>}
            {selectedHex&&positionedHexes.hexes.some(h=>h.kind!=='candidate'&&h.key===hexKey(selectedHex))&&<svg
              ref={selectedHexOverlayRef} className="selected-hex-overlay" data-editor-only="selection" aria-hidden="true" viewBox={`0 0 ${displayMapWidth} ${displayMapHeight}`}
              style={{width:`${displayMapWidth}px`,height:`${displayMapHeight}px`,transform:`translateZ(0) scale(${mapScaleRef.current})`}}>
              <g transform={mapRotationTransform}>{(()=>{const h=positionedHexes.hexes.find(h=>h.kind!=='candidate'&&h.key===hexKey(selectedHex))!;
                return <polygon data-selected-hex={h.key} points={hexPoints(h.x,h.y,HEX_SIZE)} fill="none" stroke="#7dd3fc" strokeWidth={2/mapScaleRef.current} style={{filter:`drop-shadow(0 0 ${1/mapScaleRef.current}px #0c1423)`}}/>;})()}</g>
            </svg>}

            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
