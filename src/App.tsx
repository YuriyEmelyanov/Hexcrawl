import { useMemo, useState } from 'react';

type AxialHex = {
  q: number;
  r: number;
};

type HexType = 'region' | 'candidate' | 'center';

type TerrainTileId =
  | 'cactus'
  | 'evergreen_heavy'
  | 'forest_tile'
  | 'forest_heavy'
  | 'forest_mixed'
  | 'forested_hills'
  | 'grassland'
  | 'hills_grassy'
  | 'mountain'
  | 'swamp';

type DfRollResult = {
  values: number[];
  sum: number;
};

type RegionSizeRoll = {
  scaleD20: number;
  scaleX: number;
  growthDiceValues: number[];
  growthSticks: number;
  regionSize: number;
};

type Region = {
  id: number;
  hexes: AxialHex[];
  centerHex: AxialHex;
  anchorHex: AxialHex;
  scaleD20: number;
  scaleX: number;
  growthDiceValues: number[];
  growthSticks: number;
  regionSize: number;
  targetSize: number;
  terrainTileId: TerrainTileId;
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

type River = {
  id: number;
  regionId: number;
  vertexPath: RiverVertex[];
  controlPoints?: {
    startVertex: RiverVertex;
    middlePurpleVertex?: RiverVertex;
    endVertex: RiverVertex;
    startMode: 'existing river endpoint' | 'red vertex';
  };
};

type RiverVertex = {
  x: number;
  y: number;
  key: string;
};

type VertexUsage = {
  vertex: RiverVertex;
  currentRegionCount: number;
  otherRegionCount: number;
  candidateCount: number;
};

const HEX_SIZE = 28;
const SQRT3 = Math.sqrt(3);
const HEX_TERRAIN_OVERLAY_OPACITY = 0.45;
const HEX_TERRAIN_OVERLAY_SCALE = 0.6;

const TERRAIN_TILES: Record<TerrainTileId, { label: string; src: string }> = {
  cactus: {
    label: 'Cactus',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/cactus.png'
  },
  evergreen_heavy: {
    label: 'Evergreen Heavy',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/evergreen_heavy.png'
  },
  forest_tile: {
    label: 'Forest',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/forest-tile.png'
  },
  forest_heavy: {
    label: 'Heavy Forest',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/forest_heavy.png'
  },
  forest_mixed: {
    label: 'Mixed Forest',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/forest_mixed.png'
  },
  forested_hills: {
    label: 'Forested Hills',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/forested_hills.png'
  },
  grassland: {
    label: 'Grassland',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/grassland.png'
  },
  hills_grassy: {
    label: 'Grassy Hills',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/hills_grassy.png'
  },
  mountain: {
    label: 'Mountain',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/mountain.png'
  },
  swamp: {
    label: 'Swamp',
    src: 'https://raw.githubusercontent.com/YuriyEmelyanov/Hexcrawl/main/public/swamp.png'
  }
};
const START_HEX: AxialHex = { q: 0, r: 0 };
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

function round3(value: number): number {
  return Number(value.toFixed(3));
}

function vertexKey(x: number, y: number): string {
  return `${round3(x)},${round3(y)}`;
}

function randomFrom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function chooseRandomTerrainTileId(): TerrainTileId {
  return randomFrom(Object.keys(TERRAIN_TILES) as TerrainTileId[]);
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

function chooseRandomRiverControlPoints(
  redVertices: RiverVertex[],
  purpleVertices: RiverVertex[],
  existingRiverEndpointVerticesInRegion: RiverVertex[]
): { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex; startMode: 'existing river endpoint' | 'red vertex' } | null {
  if (existingRiverEndpointVerticesInRegion.length > 0) {
    if (redVertices.length < 1) return null;
    const startVertex = randomFrom(existingRiverEndpointVerticesInRegion);
    const endPool = redVertices.filter((vertex) => vertex.key !== startVertex.key);
    if (endPool.length === 0) return null;
    const endVertex = randomFrom(endPool);
    if (purpleVertices.length === 0) return { startVertex, endVertex, startMode: 'existing river endpoint' };
    const preferredMiddle = purpleVertices.filter((vertex) => vertex.key !== startVertex.key && vertex.key !== endVertex.key);
    const middlePool = preferredMiddle.length > 0 ? preferredMiddle : purpleVertices;
    return { startVertex, middlePurpleVertex: randomFrom(middlePool), endVertex, startMode: 'existing river endpoint' };
  }
  if (redVertices.length < 2) return null;
  const startVertex = randomFrom(redVertices);
  const endPool = redVertices.filter((vertex) => vertex.key !== startVertex.key);
  if (endPool.length === 0) return null;
  const endVertex = randomFrom(endPool);
  if (purpleVertices.length === 0) return { startVertex, endVertex, startMode: 'red vertex' };
  const preferredMiddle = purpleVertices.filter(
    (vertex) => vertex.key !== startVertex.key && vertex.key !== endVertex.key
  );
  const middlePool = preferredMiddle.length > 0 ? preferredMiddle : purpleVertices;
  const middlePurpleVertex = randomFrom(middlePool);
  return { startVertex, middlePurpleVertex, endVertex, startMode: 'red vertex' };
}

function buildRiverPathViaControlPoints(
  controlPoints: { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex },
  riverGraph: RiverGraph
): RiverVertex[] {
  const startNode = riverGraph.nodes.get(controlPoints.startVertex.key);
  const endNode = riverGraph.nodes.get(controlPoints.endVertex.key);
  if (!startNode || !endNode) return [];
  if (!controlPoints.middlePurpleVertex) {
    return findRiverPath(startNode, endNode, riverGraph).map((node) => ({ key: node.key, x: node.x, y: node.y }));
  }
  const middleNode = riverGraph.nodes.get(controlPoints.middlePurpleVertex.key);
  if (!middleNode) return [];
  const path1 = findRiverPath(startNode, middleNode, riverGraph);
  const path2 = findRiverPath(middleNode, endNode, riverGraph);
  if (path1.length < 1 || path2.length < 1) return [];
  const joined = [...path1, ...path2.slice(1)];
  return joined.map((node) => ({ key: node.key, x: node.x, y: node.y }));
}

function validateRiverPathViaControlPoints(
  vertexPath: RiverVertex[],
  controlPoints: { startVertex: RiverVertex; middlePurpleVertex?: RiverVertex; endVertex: RiverVertex; startMode: 'existing river endpoint' | 'red vertex' },
  riverGraph: RiverGraph,
  redVertices: RiverVertex[],
  existingRiverEndpointVerticesInRegion: RiverVertex[]
): boolean {
  if (!vertexPath || vertexPath.length < 2) return false;
  const redSet = new Set(redVertices.map((vertex) => vertex.key));
  const endpointSet = new Set(existingRiverEndpointVerticesInRegion.map((vertex) => vertex.key));
  if (vertexPath[0].key !== controlPoints.startVertex.key) return false;
  if (vertexPath[vertexPath.length - 1].key !== controlPoints.endVertex.key) return false;
  if (!redSet.has(controlPoints.endVertex.key)) return false;
  if (controlPoints.startMode === 'red vertex' && !redSet.has(controlPoints.startVertex.key)) return false;
  if (controlPoints.startMode === 'existing river endpoint' && !endpointSet.has(controlPoints.startVertex.key)) return false;
  if (controlPoints.middlePurpleVertex && !vertexPath.some((vertex) => vertex.key === controlPoints.middlePurpleVertex?.key)) return false;
  if (new Set(vertexPath.map((vertex) => vertex.key)).size !== vertexPath.length) return false;
  const riverPathEdgeKeys = getRiverPathEdgeKeys(vertexPath, riverGraph);
  if (!riverPathEdgeKeys) return false;
  if (hasDuplicateEdgeKeys(riverPathEdgeKeys)) return false;
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

export function rollFateSticks(count: number): DfRollResult {
  const values = Array.from({ length: count }, () => Math.floor(Math.random() * 3));
  const sum = values.reduce((acc, current) => acc + current, 0);
  return { values, sum };
}

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function rollRegionSize(): RegionSizeRoll {
  const scaleD20 = rollD20();
  const scaleX = scaleD20;
  const growthRoll = rollFateSticks(scaleX);
  const regionSize = scaleX + growthRoll.sum;

  return {
    scaleD20,
    scaleX,
    growthDiceValues: growthRoll.values,
    growthSticks: growthRoll.sum,
    regionSize
  };
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

function findRiverPath(startNode: RiverGraphNode, endNode: RiverGraphNode, riverGraph: RiverGraph): RiverGraphNode[] {
  const previous = new Map<string, string>();
  const queue: string[] = [startNode.key];
  const visited = new Set<string>([startNode.key]);
  while (queue.length > 0) {
    const currentKey = queue.shift()!;
    if (currentKey === endNode.key) break;
    const currentNode = riverGraph.nodes.get(currentKey);
    if (!currentNode) continue;
    for (const edgeKey of currentNode.incidentEdgeKeys) {
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

export function hasEscapeToOutside(startEmptyHex: AxialHex, temporaryOccupiedHexes: Set<string>): boolean {
  if (temporaryOccupiedHexes.has(hexKey(startEmptyHex))) {
    return false;
  }

  const occupied = Array.from(temporaryOccupiedHexes).map(parseHexKey);
  if (occupied.length === 0) {
    return true;
  }

  const minQ = Math.min(...occupied.map((h) => h.q)) - 2;
  const maxQ = Math.max(...occupied.map((h) => h.q)) + 2;
  const minR = Math.min(...occupied.map((h) => h.r)) - 2;
  const maxR = Math.max(...occupied.map((h) => h.r)) + 2;

  const queue: AxialHex[] = [startEmptyHex];
  const visited = new Set<string>([hexKey(startEmptyHex)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.q < minQ || current.q > maxQ || current.r < minR || current.r > maxR) {
      return true;
    }

    for (const neighbor of getHexNeighbors(current)) {
      const key = hexKey(neighbor);
      if (visited.has(key) || temporaryOccupiedHexes.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push(neighbor);
    }
  }

  return false;
}

export function wouldCreateEnclosedVoid(
  candidateHex: AxialHex,
  currentMap: Set<string>,
  currentRegionHexes: Set<string>
): boolean {
  const temporaryOccupiedHexes = new Set([...currentMap, ...currentRegionHexes, hexKey(candidateHex)]);

  const emptyStarts = new Set<string>();
  for (const regionHex of Array.from(currentRegionHexes).map(parseHexKey)) {
    for (const neighbor of getHexNeighbors(regionHex)) {
      if (!temporaryOccupiedHexes.has(hexKey(neighbor))) {
        emptyStarts.add(hexKey(neighbor));
      }
    }
  }
  for (const neighbor of getHexNeighbors(candidateHex)) {
    if (!temporaryOccupiedHexes.has(hexKey(neighbor))) {
      emptyStarts.add(hexKey(neighbor));
    }
  }

  for (const key of emptyStarts) {
    if (!hasEscapeToOutside(parseHexKey(key), temporaryOccupiedHexes)) {
      return true;
    }
  }

  return false;
}

export function getAdjacentRegionHexCount(candidate: AxialHex, currentRegionHexes: Set<string>): number {
  return getHexNeighbors(candidate).filter((neighbor) => currentRegionHexes.has(hexKey(neighbor))).length;
}

export function weightedPickCandidate(
  candidates: AxialHex[],
  currentRegionHexes: Set<string>
): AxialHex {
  const weights = candidates.map((candidate) => getAdjacentRegionHexCount(candidate, currentRegionHexes));

  const total = weights.reduce((acc, w) => acc + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return candidates[i];
    }
  }
  return candidates[candidates.length - 1];
}

export function generateConnectedRegionFromAnchor(
  anchorHex: AxialHex,
  size: number,
  occupiedHexes: Set<string>
): AxialHex[] {
  const targetSize = Math.max(1, size);
  const regionKeys = new Set<string>([hexKey(anchorHex)]);

  while (regionKeys.size < targetSize) {
    const frontierMap = new Map<string, AxialHex>();
    for (const regionHex of Array.from(regionKeys).map(parseHexKey)) {
      for (const neighbor of getHexNeighbors(regionHex)) {
        const key = hexKey(neighbor);
        if (!regionKeys.has(key) && !occupiedHexes.has(key)) {
          frontierMap.set(key, neighbor);
        }
      }
    }

    const validCandidates = Array.from(frontierMap.values()).filter(
      (candidate) => !wouldCreateEnclosedVoid(candidate, occupiedHexes, regionKeys)
    );

    if (validCandidates.length === 0) {
      break;
    }

    const picked = weightedPickCandidate(validCandidates, regionKeys);
    regionKeys.add(hexKey(picked));
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

export function getRegionColor(regionId: number): string {
  const hue = (regionId * 67) % 360;
  return `hsl(${hue} 55% 42%)`;
}

export function getCandidateHexes(allRegionHexes: AxialHex[]): AxialHex[] {
  const occupied = new Set(allRegionHexes.map(hexKey));
  const candidates = new Map<string, AxialHex>();

  for (const hex of allRegionHexes) {
    for (const neighbor of getHexNeighbors(hex)) {
      const key = hexKey(neighbor);
      if (!occupied.has(key)) {
        candidates.set(key, neighbor);
      }
    }
  }

  return Array.from(candidates.values());
}

function generateRiverForRegion(region: Region, regions: Region[], existingRivers: River[], candidateHexes?: AxialHex[]): River[] {
  try {
    const riverGraph = buildRiverGraphForRegion(region.hexes, region.hexes, candidateHexes ?? []);
    const { candidateVertices, neighborRegionVertices } = getRegionSharedVertices(region, regions, candidateHexes ?? []);
    const orangeKeys = new Set(neighborRegionVertices.map((vertex) => vertex.key));
    const redVertices = candidateVertices.filter((vertex) => !orangeKeys.has(vertex.key));
    const purpleVertices = region.centerHex ? getHexCornerPoints(region.centerHex) : [];
    const existingRiverEndpointVerticesInRegion = getExistingRiverEndpointVerticesInRegion(region, existingRivers, riverGraph);
    if (existingRiverEndpointVerticesInRegion.length > 0 && redVertices.length < 1) return existingRivers;
    if (existingRiverEndpointVerticesInRegion.length === 0 && redVertices.length < 2) return existingRivers;
    const RANDOM_PAIR_ATTEMPTS = 50;
    for (let attempt = 0; attempt < RANDOM_PAIR_ATTEMPTS; attempt += 1) {
      const controlPoints = chooseRandomRiverControlPoints(redVertices, purpleVertices, existingRiverEndpointVerticesInRegion);
      if (!controlPoints) continue;
      const path = buildRiverPathViaControlPoints(controlPoints, riverGraph);
      if (!validateRiverPathViaControlPoints(path, controlPoints, riverGraph, redVertices, existingRiverEndpointVerticesInRegion)) continue;
      const newRiverId = (existingRivers.at(-1)?.id ?? 0) + 1;
      return [...existingRivers, { id: newRiverId, regionId: region.id, vertexPath: path, controlPoints }];
    }
  } catch (error) {
    console.warn('river generation failed', { regionId: region.id, error });
  }

  return existingRivers;
}

function renderRiverPolyline(river: River, offsetX: number, offsetY: number) {
  const points = river.vertexPath.map((vertex) => `${vertex.x + offsetX},${vertex.y + offsetY}`).join(' ');
  return { key: `river-${river.id}`, points };
}

function validateRiverEndpoints(region: Region, river: River, riverGraph: RiverGraph): RiverEndpointIssue[] {
  const issues: RiverEndpointIssue[] = [];
  if (!river.vertexPath || river.vertexPath.length < 2) return ['path_too_short'];
  const start = riverGraph.nodes.get(river.vertexPath[0].key);
  const end = riverGraph.nodes.get(river.vertexPath[river.vertexPath.length - 1].key);
  const hasCandidateBoundary = Array.from(riverGraph.nodes.values()).some((node) => node.isCandidateBoundaryVertex);
  if (!start?.isRegionBoundaryVertex) issues.push('start_not_region_boundary');
  if (!end?.isRegionBoundaryVertex) issues.push('end_not_region_boundary');
  if (hasCandidateBoundary && !start?.isCandidateBoundaryVertex) issues.push('start_not_candidate_boundary_when_candidates_exist');
  if (hasCandidateBoundary && !end?.isCandidateBoundaryVertex) issues.push('end_not_candidate_boundary_when_candidates_exist');
  const firstEdge = riverGraph.edges.get(edgeKey(river.vertexPath[0], river.vertexPath[1]));
  const lastEdge = riverGraph.edges.get(edgeKey(river.vertexPath[river.vertexPath.length - 2], river.vertexPath[river.vertexPath.length - 1]));
  if (!firstEdge?.isRegionBoundaryEdge) issues.push('first_edge_not_boundary');
  if (!lastEdge?.isRegionBoundaryEdge) issues.push('last_edge_not_boundary');
  if (hasCandidateBoundary && !firstEdge?.isCandidateBoundaryEdge) issues.push('first_edge_not_candidate_boundary_when_candidates_exist');
  if (hasCandidateBoundary && !lastEdge?.isCandidateBoundaryEdge) issues.push('last_edge_not_candidate_boundary_when_candidates_exist');
  if (!firstEdge || !lastEdge) issues.push('segment_not_in_graph');
  for (let i = 1; i < river.vertexPath.length; i += 1) {
    if (!riverGraph.edges.has(edgeKey(river.vertexPath[i - 1], river.vertexPath[i]))) {
      issues.push('segment_not_in_graph');
      break;
    }
  }
  if (region.hexes.length > 6 && river.vertexPath.length < 4) issues.push('path_too_short');
  return Array.from(new Set(issues));
}

export function App() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [candidateHexes, setCandidateHexes] = useState<AxialHex[]>([]);
  const [rivers, setRivers] = useState<River[]>([]);
  const [selectedHex, setSelectedHex] = useState<AxialHex | null>(START_HEX);
  const [debugRivers, setDebugRivers] = useState(false);

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
    const all = [
      ...allRegionHexes.map((hex) => ({ ...hex, kind: 'region' as const })),
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
    const offsetX = -minX + HEX_SIZE * 2;
    const offsetY = -minY + HEX_SIZE * 2;

    return {
      width: maxX - minX + HEX_SIZE * 4,
      height: maxY - minY + HEX_SIZE * 4,
      hexes: withPixels.map((h) => ({ ...h, x: h.x + offsetX, y: h.y + offsetY }))
    };
  }, [allRegionHexes, candidateHexes, metadataMap]);

  const riverPolylines = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    const offsetX = HEX_SIZE * 2 - minBaseX;
    const offsetY = HEX_SIZE * 2 - minBaseY;
    return rivers.map((river) => renderRiverPolyline(river, offsetX, offsetY));
  }, [positionedHexes, rivers]);

  const riverOffset = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return { x: 0, y: 0 };
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    return { x: HEX_SIZE * 2 - minBaseX, y: HEX_SIZE * 2 - minBaseY };
  }, [positionedHexes]);

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

  const addRegionToMap = (anchorHex: AxialHex) => {
    const sizeRoll = rollRegionSize();
    const size = sizeRoll.regionSize;
    const occupiedHexes = new Set(allRegionHexes.map(hexKey));
    const regionHexes = generateConnectedRegionFromAnchor(anchorHex, size, occupiedHexes);
    const centerHex = chooseRegionCenter(regionHexes);
    const region: Region = {
      id: regions.length + 1,
      hexes: regionHexes,
      centerHex,
      anchorHex,
      scaleD20: sizeRoll.scaleD20,
      scaleX: sizeRoll.scaleX,
      growthDiceValues: sizeRoll.growthDiceValues,
      growthSticks: sizeRoll.growthSticks,
      regionSize: sizeRoll.regionSize,
      targetSize: size,
      terrainTileId: chooseRandomTerrainTileId()
    };
    const nextRegions = [...regions, region];
    const nextAllHexes = nextRegions.flatMap((r) => r.hexes);
    const nextCandidateHexes = getCandidateHexes(nextAllHexes);
    setRegions(nextRegions);
    setCandidateHexes(nextCandidateHexes);
    setRivers((current) => generateRiverForRegion(region, nextRegions, current, nextCandidateHexes));
    setSelectedHex(centerHex);
  };

  const resetMap = () => {
    setRegions([]);
    setCandidateHexes([]);
    setRivers([]);
    setSelectedHex(START_HEX);
  };

  const selectedHexKey = selectedHex ? hexKey(selectedHex) : null;
  const selectedMeta = selectedHexKey ? metadataMap.get(selectedHexKey) : undefined;
  const isSelectedCandidate = selectedHex ? candidateHexes.some((c) => hexKey(c) === selectedHexKey) : false;
  const selectedRiverIds = selectedHex
    ? rivers
      .filter((river) => {
        const { x, y } = toPixel(selectedHex.q, selectedHex.r);
        const corners = getHexCornerPoints(selectedHex);
        const cornerKeys = new Set(corners.map((corner) => corner.key));
        return river.vertexPath.some((vertex) => cornerKeys.has(vertex.key) || vertexKey(x, y) === vertex.key);
      })
      .map((r) => r.id)
    : [];

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
  const selectedRegionRiver = selectedRegion ? rivers.find((river) => river.regionId === selectedRegion.id) : undefined;
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
      <header className="header">
        <h1>Hexcrawl Region Generator</h1>
        <div className="controls">
          <button onClick={() => addRegionToMap(START_HEX)} disabled={regions.length > 0}>
            Сгенерировать регион
          </button>
          <button onClick={resetMap} className="secondary">Сбросить</button>
          <button onClick={() => setDebugRivers((v) => !v)} className="secondary">
            Debug rivers / Отладка рек: {debugRivers ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      <section className="content">
        <div className="map-card">
          <h2>Карта регионов</h2>
          <svg viewBox={`0 0 ${positionedHexes.width} ${positionedHexes.height}`}>
            <defs>
              {positionedHexes.hexes.map((hex) => (
                <clipPath key={`hex-clip-${hex.key}`} id={`hex-clip-${hex.key}`}>
                  <polygon points={hexPoints(hex.x, hex.y, HEX_SIZE)} />
                </clipPath>
              ))}
            </defs>
            {positionedHexes.hexes.map((hex) => {
              const meta = metadataMap.get(hex.key);
              const cls = hex.kind === 'candidate' ? 'hex candidate' : meta?.isCenter ? 'hex center' : 'hex region';
              const fill = hex.kind === 'candidate' ? undefined : getRegionColor(meta?.regionId ?? 0);
              const overlayWidth = HEX_SIZE * SQRT3 * HEX_TERRAIN_OVERLAY_SCALE;
              const overlayHeight = HEX_SIZE * SQRT3 * HEX_TERRAIN_OVERLAY_SCALE;
              const region = meta?.regionId ? regions.find((item) => item.id === meta.regionId) : undefined;
              const terrainTileId = region?.terrainTileId ?? 'forest_tile';
              const terrainTile = region ? TERRAIN_TILES[terrainTileId] : undefined;
              return (
                <g
                  key={`${hex.kind}-${hex.key}`}
                  onClick={() => {
                    if (hex.kind === 'candidate') {
                      addRegionToMap({ q: hex.q, r: hex.r });
                    } else {
                      setSelectedHex({ q: hex.q, r: hex.r });
                    }
                  }}
                >
                  <polygon points={hexPoints(hex.x, hex.y, HEX_SIZE)} className={cls} style={{ fill }} />
                  {hex.kind === 'region' && hex.regionId && region && terrainTile ? (
                    <image
                      href={terrainTile.src}
                      x={hex.x - overlayWidth / 2}
                      y={hex.y - overlayHeight / 2}
                      width={overlayWidth}
                      height={overlayHeight}
                      opacity={HEX_TERRAIN_OVERLAY_OPACITY}
                      preserveAspectRatio="xMidYMid meet"
                      clipPath={`url(#hex-clip-${hex.key})`}
                      pointerEvents="none"
                    />
                  ) : null}
                  <polygon points={hexPoints(hex.x, hex.y, HEX_SIZE)} className={cls} style={{ fill: 'none' }} />
                  {meta?.isCenter ? <circle cx={hex.x} cy={hex.y} r={3} className="center-dot" /> : null}
                  <text x={hex.x} y={hex.y + 4} textAnchor="middle" className="hex-label">{hex.q}/{hex.r}</text>
                </g>
              );
            })}
            <g className="rivers-layer">
              {riverPolylines.map((riverLine) => (
                <polyline
                  key={riverLine.key}
                  points={riverLine.points}
                  className="river-polyline"
                />
              ))}
            </g>
            {debugRivers ? (
              <g className="river-debug-layer">
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
                      <text x={mid.x + riverOffset.x + 4} y={mid.y + riverOffset.y - 4} className="dbg-river-id">#{river.id}</text>
                    </g>
                  );
                })}
              </g>
            ) : null}
          </svg>
        </div>

        <div className="roll-card">
          <h2>Информация</h2>
          {regions.length === 0 ? <p>Нажмите «Сгенерировать регион», чтобы создать первый регион от стартового гекса 0/0.</p> : null}
          {lastRegion ? (
            <>
              <p>Регионов: {regions.length}</p>
              <p>Последний регион: #{lastRegion.id}</p>
              <p>Бросок масштаба: d20 = {lastRegion.scaleD20}</p>
              <p>Масштаб X: {lastRegion.scaleX}</p>
              <p>Бросок роста ({lastRegion.scaleX}dF): {lastRegion.growthDiceValues.join(', ')}</p>
              <p>Палочки роста: {lastRegion.growthSticks}</p>
              <p>Итоговый размер региона: {lastRegion.regionSize} ({lastRegion.scaleX} + {lastRegion.growthSticks})</p>
              <p>Целевой размер: {lastRegion.targetSize}</p>
              <p>Фактический размер региона: {lastRegion.hexes.length}</p>
            </>
          ) : null}
          <hr />
          <p><strong>Выбранный гекс:</strong> {selectedHex ? `${selectedHex.q}/${selectedHex.r}` : '—'}</p>
          <p><strong>Тип:</strong> {selectedType}</p>
          <p><strong>Регион:</strong> {selectedMeta?.regionId ?? '—'}</p>
          <p><strong>centralHex:</strong> {selectedMeta?.isCenter ? 'да' : 'нет'}</p>
          <p><strong>anchorHex:</strong> {selectedMeta?.isAnchor ? 'да' : 'нет'}</p>
          <p><strong>Реки:</strong> {selectedRiverIds.length > 0 ? selectedRiverIds.join(', ') : '—'}</p>
          <p><strong>Terrain:</strong> {selectedRegion?.terrainTileId ? TERRAIN_TILES[selectedRegion.terrainTileId].label : 'Forest fallback'}</p>
          {debugRivers ? (
            <>
              <hr />
              <p><strong>River debug</strong></p>
              {!selectedRegion ? <p>Выберите региональный гекс.</p> : null}
              {selectedRegion && !selectedRegionGraph ? <p>no graph</p> : null}
              {selectedRegion && selectedRegionGraph && selectedRegionRiver ? (() => {
                const path = selectedRegionRiver.vertexPath;
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
          {candidateHexes.length > 0 ? <p>Выберите гекс-кандидат на карте для добавления следующего региона.</p> : null}
        </div>
      </section>

    </div>
  );
}
