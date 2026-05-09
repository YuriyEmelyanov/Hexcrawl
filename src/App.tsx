import { useMemo, useState } from 'react';

type AxialHex = {
  q: number;
  r: number;
};

type HexType = 'region' | 'candidate' | 'center';
type RiverSize = 'stream' | 'river' | 'great_river';
type RiverSourceType = 'spring' | 'map_edge' | 'lake' | 'unknown';
type RiverMouthType = 'map_edge' | 'lake' | 'sea' | 'confluence' | 'unknown';

type DfRollResult = {
  values: number[];
  sum: number;
};

type Region = {
  id: number;
  hexes: AxialHex[];
  centerHex: AxialHex;
  anchorHex: AxialHex;
  roll: DfRollResult;
  targetSize: number;
};

type River = {
  id: number;
  size: RiverSize;
  edgeKeys: string[];
  sourceType: RiverSourceType;
  mouthType: RiverMouthType;
  targetRiverId?: number;
};

type RiverEdge = {
  edgeKey: string;
  riverId: number;
  fromHex: AxialHex;
  toHex: AxialHex;
  directionFrom: AxialHex;
  directionTo: AxialHex;
};

type RegionRiverSummary = {
  touchedRiverCount: number;
  continuedExistingRiver: boolean;
  createdNewRiver: boolean;
  createdSource: boolean;
};

type HexMeta = {
  regionId: number;
  isCenter: boolean;
  isAnchor: boolean;
};

const HEX_SIZE = 28;
const SQRT3 = Math.sqrt(3);
const START_HEX: AxialHex = { q: 0, r: 0 };
const NEIGHBOR_DIRECTIONS: AxialHex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

function hexKey(hex: AxialHex): string {
  return `${hex.q},${hex.r}`;
}

function parseHexKey(key: string): AxialHex {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function normalizeEdgeKey(hexA: AxialHex, hexB: AxialHex): string {
  const a = hexKey(hexA);
  const b = hexKey(hexB);
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function getHexEdges(hex: AxialHex): string[] {
  return getHexNeighbors(hex).map((n) => normalizeEdgeKey(hex, n));
}

export function getEdgesTouchingHex(hex: AxialHex): string[] {
  return getHexEdges(hex);
}

function toPixel(q: number, r: number) {
  return {
    x: HEX_SIZE * SQRT3 * (q + r / 2),
    y: HEX_SIZE * 1.5 * r
  };
}

function hexPoints(cx: number, cy: number, size: number) {
  const points: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push(`${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`);
  }
  return points.join(' ');
}

function randomFrom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function chanceByRegionSize(regionSize: number, small: number, medium: number, large: number, huge: number): number {
  if (regionSize <= 6) return small;
  if (regionSize <= 18) return medium;
  if (regionSize <= 35) return large;
  return huge;
}

function getNeighborDirection(from: AxialHex, to: AxialHex): AxialHex {
  return { q: to.q - from.q, r: to.r - from.r };
}

function pickBoundaryHex(regionHexes: AxialHex[]): AxialHex {
  const set = new Set(regionHexes.map(hexKey));
  const boundary = regionHexes.filter((h) => getHexNeighbors(h).some((n) => !set.has(hexKey(n))));
  return randomFrom(boundary.length > 0 ? boundary : regionHexes);
}

function buildRiverPathThroughRegion(regionHexes: AxialHex[], startHex: AxialHex, mustTouch?: AxialHex): AxialHex[] {
  const regionSet = new Set(regionHexes.map(hexKey));
  const visited = new Set<string>([hexKey(startHex)]);
  const path = [startHex];
  let current = startHex;
  const target = mustTouch ? hexKey(mustTouch) : null;

  for (let i = 0; i < Math.max(6, regionHexes.length * 2); i += 1) {
    const neighbors = getHexNeighbors(current).filter((n) => regionSet.has(hexKey(n)) && !visited.has(hexKey(n)));
    if (neighbors.length === 0) {
      break;
    }
    let next = randomFrom(neighbors);
    if (target) {
      next = neighbors.sort((a, b) => hexDistance(a, mustTouch!) - hexDistance(b, mustTouch!))[0];
    }
    path.push(next);
    visited.add(hexKey(next));
    current = next;
    if (path.length >= 3 && (!target || hexKey(next) === target) && getHexNeighbors(next).some((n) => !regionSet.has(hexKey(n)))) {
      break;
    }
  }
  return path;
}

function buildEdgesFromPath(path: AxialHex[], riverId: number): RiverEdge[] {
  const edges: RiverEdge[] = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i];
    const to = path[i + 1];
    edges.push({
      edgeKey: normalizeEdgeKey(from, to),
      riverId,
      fromHex: from,
      toHex: to,
      directionFrom: getNeighborDirection(from, to),
      directionTo: getNeighborDirection(to, from)
    });
  }
  return edges;
}

export function generateDfRoll(): DfRollResult { const values = Array.from({ length: 12 }, () => Math.floor(Math.random() * 3)); const sum = values.reduce((a, c) => a + c, 0); return { values, sum }; }
export function getHexNeighbors(hex: AxialHex): AxialHex[] { return NEIGHBOR_DIRECTIONS.map((d) => ({ q: hex.q + d.q, r: hex.r + d.r })); }
function hexDistance(a: AxialHex, b: AxialHex): number { const x1 = a.q; const z1 = a.r; const y1 = -x1 - z1; const x2 = b.q; const z2 = b.r; const y2 = -x2 - z2; return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2)); }
export function hasEscapeToOutside(startEmptyHex: AxialHex, temporaryOccupiedHexes: Set<string>): boolean { if (temporaryOccupiedHexes.has(hexKey(startEmptyHex))) return false; const occupied = Array.from(temporaryOccupiedHexes).map(parseHexKey); if (occupied.length === 0) return true; const minQ = Math.min(...occupied.map((h) => h.q)) - 2; const maxQ = Math.max(...occupied.map((h) => h.q)) + 2; const minR = Math.min(...occupied.map((h) => h.r)) - 2; const maxR = Math.max(...occupied.map((h) => h.r)) + 2; const queue: AxialHex[] = [startEmptyHex]; const visited = new Set<string>([hexKey(startEmptyHex)]); while (queue.length > 0) { const current = queue.shift()!; if (current.q < minQ || current.q > maxQ || current.r < minR || current.r > maxR) return true; for (const neighbor of getHexNeighbors(current)) { const key = hexKey(neighbor); if (visited.has(key) || temporaryOccupiedHexes.has(key)) continue; visited.add(key); queue.push(neighbor); } } return false; }
export function wouldCreateEnclosedVoid(candidateHex: AxialHex, currentMap: Set<string>, currentRegionHexes: Set<string>): boolean { const temporaryOccupiedHexes = new Set([...currentMap, ...currentRegionHexes, hexKey(candidateHex)]); const emptyStarts = new Set<string>(); for (const regionHex of Array.from(currentRegionHexes).map(parseHexKey)) { for (const neighbor of getHexNeighbors(regionHex)) { if (!temporaryOccupiedHexes.has(hexKey(neighbor))) emptyStarts.add(hexKey(neighbor)); } } for (const neighbor of getHexNeighbors(candidateHex)) { if (!temporaryOccupiedHexes.has(hexKey(neighbor))) emptyStarts.add(hexKey(neighbor)); } for (const key of emptyStarts) { if (!hasEscapeToOutside(parseHexKey(key), temporaryOccupiedHexes)) return true; } return false; }
export function weightedPickCandidate(candidates: AxialHex[], anchorHex: AxialHex, currentRegionHexes: Set<string>): AxialHex { const weights = candidates.map((candidate) => { const distanceWeight = 1 / (1 + hexDistance(candidate, anchorHex)); const insideNeighbors = getHexNeighbors(candidate).filter((n) => currentRegionHexes.has(hexKey(n))).length; return distanceWeight * (1 + insideNeighbors); }); const total = weights.reduce((a, w) => a + w, 0); let roll = Math.random() * total; for (let i = 0; i < candidates.length; i += 1) { roll -= weights[i]; if (roll <= 0) return candidates[i]; } return candidates[candidates.length - 1]; }
export function generateConnectedRegionFromAnchor(anchorHex: AxialHex, size: number, occupiedHexes: Set<string>): AxialHex[] { const targetSize = Math.max(1, size); const regionKeys = new Set<string>([hexKey(anchorHex)]); while (regionKeys.size < targetSize) { const frontierMap = new Map<string, AxialHex>(); for (const regionHex of Array.from(regionKeys).map(parseHexKey)) { for (const neighbor of getHexNeighbors(regionHex)) { const key = hexKey(neighbor); if (!regionKeys.has(key) && !occupiedHexes.has(key)) frontierMap.set(key, neighbor); } } const validCandidates = Array.from(frontierMap.values()).filter((candidate) => !wouldCreateEnclosedVoid(candidate, occupiedHexes, regionKeys)); if (validCandidates.length === 0) break; const picked = weightedPickCandidate(validCandidates, anchorHex, regionKeys); regionKeys.add(hexKey(picked)); } return Array.from(regionKeys).map(parseHexKey); }
export function chooseRegionCenter(regionHexes: AxialHex[]): AxialHex { if (regionHexes.length === 1) return regionHexes[0]; const regionKeys = new Set(regionHexes.map(hexKey)); const byNeighborCount = regionHexes.map((hex) => ({ hex, sameRegionNeighborCount: getHexNeighbors(hex).filter((neighbor) => regionKeys.has(hexKey(neighbor))).length })); const maxNeighborCount = Math.max(...byNeighborCount.map(({ sameRegionNeighborCount }) => sameRegionNeighborCount)); const bestCenterCandidates = byNeighborCount.filter(({ sameRegionNeighborCount }) => sameRegionNeighborCount === maxNeighborCount).map(({ hex }) => hex); return randomFrom(bestCenterCandidates); }
export function getRegionColor(regionId: number): string { const hue = (regionId * 67) % 360; return `hsl(${hue} 55% 42%)`; }
export function getCandidateHexes(allRegionHexes: AxialHex[]): AxialHex[] { const occupied = new Set(allRegionHexes.map(hexKey)); const candidates = new Map<string, AxialHex>(); for (const hex of allRegionHexes) { for (const neighbor of getHexNeighbors(hex)) { const key = hexKey(neighbor); if (!occupied.has(key)) candidates.set(key, neighbor); } } return Array.from(candidates.values()); }

export function App() { /* trimmed for brevity in tool */ return <div />; }
