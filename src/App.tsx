import { useMemo, useState } from 'react';

type AxialHex = {
  q: number;
  r: number;
};

type HexType = 'region' | 'candidate' | 'center';

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
};

type RiverValidationIssue = {
  type: string;
  message: string;
  riverId?: number;
  edgeKey?: string;
  vertexKey?: string;
};

type RiverVertex = {
  x: number;
  y: number;
  key: string;
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
  return NEIGHBOR_DIRECTIONS.map((direction, i) => ({
    from: corners[i],
    to: corners[(i + 1) % 6],
    neighborHex: { q: hex.q + direction.q, r: hex.r + direction.r },
    edgeKey: [corners[i].key, corners[(i + 1) % 6].key].sort().join('|')
  }));
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
  vertex: RiverVertex;
  neighbors: { to: string; cost: number }[];
};

type AdjacentRiverEndpoint = {
  riverId: number;
  endpointVertex: RiverVertex;
  endpointIndex: 'start' | 'end';
};

function getRegionBoundaryEdges(regionHexes: AxialHex[]): HexEdge[] {
  const regionKeys = new Set(regionHexes.map(hexKey));
  return regionHexes.flatMap((hex) =>
    getHexEdgesAsVertexPairs(hex).filter((edge) => !regionKeys.has(hexKey(edge.neighborHex)))
  );
}

function getRiverEndpointVertices(river: River): AdjacentRiverEndpoint[] {
  if (river.vertexPath.length < 1) return [];
  const start = river.vertexPath[0];
  const end = river.vertexPath[river.vertexPath.length - 1];
  if (start.key === end.key) {
    return [{ riverId: river.id, endpointVertex: start, endpointIndex: 'start' }];
  }
  return [
    { riverId: river.id, endpointVertex: start, endpointIndex: 'start' },
    { riverId: river.id, endpointVertex: end, endpointIndex: 'end' }
  ];
}

function getRiverEdgeKeys(rivers: River[]): Set<string> {
  const occupied = new Set<string>();
  for (const river of rivers) {
    for (let i = 0; i < river.vertexPath.length - 1; i += 1) {
      const a = river.vertexPath[i].key;
      const b = river.vertexPath[i + 1].key;
      occupied.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
  }
  return occupied;
}

function validateRivers(rivers: River[]): RiverValidationIssue[] {
  const issues: RiverValidationIssue[] = [];
  const globalEdgeToRiver = new Map<string, number>();
  const vertexDegree = new Map<string, number>();
  const endpointOwners = new Map<string, Set<number>>();

  for (const river of rivers) {
    if (river.vertexPath.length < 2) {
      issues.push({
        type: 'too_short_river',
        message: `River ${river.id} is too short: vertexPath.length=${river.vertexPath.length}.`,
        riverId: river.id
      });
    }

    const riverEdgeSet = new Set<string>();
    const riverVertexSet = new Set<string>();
    for (const vertex of river.vertexPath) {
      if (riverVertexSet.has(vertex.key)) {
        issues.push({
          type: 'repeated_vertex_in_river',
          message: `River ${river.id} contains repeated vertex ${vertex.key}.`,
          riverId: river.id,
          vertexKey: vertex.key
        });
      }
      riverVertexSet.add(vertex.key);
    }

    for (let i = 0; i < river.vertexPath.length - 1; i += 1) {
      const a = river.vertexPath[i].key;
      const b = river.vertexPath[i + 1].key;
      const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
      vertexDegree.set(a, (vertexDegree.get(a) ?? 0) + 1);
      vertexDegree.set(b, (vertexDegree.get(b) ?? 0) + 1);

      if (riverEdgeSet.has(edgeKey)) {
        issues.push({
          type: 'river_self_duplicate_edge',
          message: `River ${river.id} reuses edge ${edgeKey}.`,
          riverId: river.id,
          edgeKey
        });
      }
      riverEdgeSet.add(edgeKey);

      const ownerRiverId = globalEdgeToRiver.get(edgeKey);
      if (ownerRiverId !== undefined) {
        issues.push({
          type: 'duplicate_edge',
          message: `Duplicate edge ${edgeKey} found in river ${river.id} (already in river ${ownerRiverId}).`,
          riverId: river.id,
          edgeKey
        });
      } else {
        globalEdgeToRiver.set(edgeKey, river.id);
      }
    }

    if (river.vertexPath.length > 0) {
      const first = river.vertexPath[0].key;
      const last = river.vertexPath[river.vertexPath.length - 1].key;
      endpointOwners.set(first, new Set([...(endpointOwners.get(first) ?? []), river.id]));
      endpointOwners.set(last, new Set([...(endpointOwners.get(last) ?? []), river.id]));
    }
  }

  for (const [vertexKeyValue, degree] of vertexDegree) {
    if (degree > 2) {
      issues.push({
        type: 'branching_or_bad_junction',
        message: `Vertex ${vertexKeyValue} has suspicious degree=${degree}.`,
        vertexKey: vertexKeyValue
      });
    }
  }

  for (const [vertexKeyValue, owners] of endpointOwners) {
    if (owners.size > 1) {
      issues.push({
        type: 'shared_endpoint_between_rivers',
        message: `Endpoint vertex ${vertexKeyValue} is shared by rivers ${Array.from(owners).join(', ')}.`,
        vertexKey: vertexKeyValue
      });
    }
  }

  return issues;
}

function buildRiverGraph(regionHexes: AxialHex[], occupiedRiverEdgeKeys: Set<string>): Map<string, RiverGraphNode> {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const graph = new Map<string, RiverGraphNode>();
  const edgeCost = new Map<string, number>();

  for (const hex of regionHexes) {
    for (const edge of getHexEdgesAsVertexPairs(hex)) {
      if (occupiedRiverEdgeKeys.has(edge.edgeKey)) continue;
      const isBoundary = !regionKeys.has(hexKey(edge.neighborHex));
      const cost = isBoundary ? 3 : 1;
      edgeCost.set(edge.edgeKey, Math.min(edgeCost.get(edge.edgeKey) ?? Number.POSITIVE_INFINITY, cost));
      for (const vertex of [edge.from, edge.to]) {
        if (!graph.has(vertex.key)) {
          graph.set(vertex.key, { vertex, neighbors: [] });
        }
      }
    }
  }

  for (const hex of regionHexes) {
    for (const edge of getHexEdgesAsVertexPairs(hex)) {
      if (occupiedRiverEdgeKeys.has(edge.edgeKey)) continue;
      const cost = edgeCost.get(edge.edgeKey);
      if (!cost) continue;
      graph.get(edge.from.key)?.neighbors.push({ to: edge.to.key, cost });
      graph.get(edge.to.key)?.neighbors.push({ to: edge.from.key, cost });
    }
  }

  return graph;
}

function findAdjacentRiverEndpoints(
  regionBoundaryVertices: RiverVertex[],
  existingRivers: River[]
): AdjacentRiverEndpoint[] {
  const boundarySet = new Set(regionBoundaryVertices.map((v) => v.key));
  const adjacent: AdjacentRiverEndpoint[] = [];
  for (const river of existingRivers) {
    for (const endpoint of getRiverEndpointVertices(river)) {
      if (boundarySet.has(endpoint.endpointVertex.key)) {
        adjacent.push(endpoint);
      }
    }
  }
  return adjacent;
}

function getCandidateBoundaryVertices(regionHexes: AxialHex[], candidateHexes: AxialHex[]): RiverVertex[] {
  const regionKeys = new Set(regionHexes.map(hexKey));
  const candidateKeys = new Set(candidateHexes.map(hexKey));
  const boundaryVertices = new Map<string, RiverVertex>();

  for (const hex of regionHexes) {
    for (const edge of getHexEdgesAsVertexPairs(hex)) {
      const neighborKey = hexKey(edge.neighborHex);
      if (!regionKeys.has(neighborKey) && candidateKeys.has(neighborKey)) {
        boundaryVertices.set(edge.from.key, edge.from);
        boundaryVertices.set(edge.to.key, edge.to);
      }
    }
  }

  return Array.from(boundaryVertices.values());
}

function findRiverPath(startVertex: RiverVertex, endVertex: RiverVertex, riverGraph: Map<string, RiverGraphNode>): RiverVertex[] {
  const distances = new Map<string, number>([[startVertex.key, 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  const queue = new Set<string>([startVertex.key]);

  while (queue.size > 0) {
    let currentKey: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const key of queue) {
      const d = distances.get(key) ?? Number.POSITIVE_INFINITY;
      if (d < bestDistance) {
        bestDistance = d;
        currentKey = key;
      }
    }
    if (!currentKey) break;
    queue.delete(currentKey);
    if (currentKey === endVertex.key) break;
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    const node = riverGraph.get(currentKey);
    if (!node) continue;
    for (const neighbor of node.neighbors) {
      const nextDistance = (distances.get(currentKey) ?? 0) + neighbor.cost;
      if (nextDistance < (distances.get(neighbor.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.to, nextDistance);
        previous.set(neighbor.to, currentKey);
        queue.add(neighbor.to);
      }
    }
  }

  if (!distances.has(endVertex.key)) return [];
  const path: RiverVertex[] = [];
  let currentKey: string | undefined = endVertex.key;
  while (currentKey) {
    const node = riverGraph.get(currentKey);
    if (!node) return [];
    path.push(node.vertex);
    if (currentKey === startVertex.key) break;
    currentKey = previous.get(currentKey);
  }
  return path.reverse();
}

function generateNewIndependentRiver(region: Region, candidateHexes: AxialHex[], occupiedRiverEdgeKeys: Set<string>): RiverVertex[] {
  const candidates = getCandidateBoundaryVertices(region.hexes, candidateHexes);
  const graph = buildRiverGraph(region.hexes, occupiedRiverEdgeKeys);
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const path = findRiverPath(candidates[i], candidates[j], graph);
      if (path.length >= 2) return path;
    }
  }
  return [];
}

function continueSingleAdjacentRiver(
  region: Region,
  adjacentEndpoint: AdjacentRiverEndpoint,
  candidateHexes: AxialHex[],
  occupiedRiverEdgeKeys: Set<string>
): RiverVertex[] {
  const graph = buildRiverGraph(region.hexes, occupiedRiverEdgeKeys);
  const start = adjacentEndpoint.endpointVertex;
  const candidateVertices = getCandidateBoundaryVertices(region.hexes, candidateHexes)
    .filter((vertex) => vertex.key !== start.key)
    .sort((a, b) => {
      const da = (start.x - a.x) ** 2 + (start.y - a.y) ** 2;
      const db = (start.x - b.x) ** 2 + (start.y - b.y) ** 2;
      return db - da;
    });
  for (const end of candidateVertices) {
    const path = findRiverPath(start, end, graph);
    if (path.length >= 2) return path;
  }
  return [];
}

function connectTwoAdjacentRivers(
  region: Region,
  adjacentEndpoints: AdjacentRiverEndpoint[],
  occupiedRiverEdgeKeys: Set<string>
): RiverVertex[] {
  const graph = buildRiverGraph(region.hexes, occupiedRiverEdgeKeys);
  let bestPath: RiverVertex[] = [];
  for (let i = 0; i < adjacentEndpoints.length; i += 1) {
    for (let j = i + 1; j < adjacentEndpoints.length; j += 1) {
      const a = adjacentEndpoints[i].endpointVertex;
      const b = adjacentEndpoints[j].endpointVertex;
      if (a.key === b.key) continue;
      const path = findRiverPath(a, b, graph);
      if (path.length >= 2 && (bestPath.length === 0 || path.length < bestPath.length)) {
        bestPath = path;
      }
    }
  }
  return bestPath;
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

function generateRiverForRegion(region: Region, existingRivers: River[], candidateHexes: AxialHex[]): River[] {
  if (region.hexes.length < 3) {
    return existingRivers;
  }
  const boundaryVerticesMap = new Map<string, RiverVertex>();
  for (const edge of getRegionBoundaryEdges(region.hexes)) {
    boundaryVerticesMap.set(edge.from.key, edge.from);
    boundaryVerticesMap.set(edge.to.key, edge.to);
  }
  const adjacentEndpoints = findAdjacentRiverEndpoints(Array.from(boundaryVerticesMap.values()), existingRivers);
  const occupiedRiverEdgeKeys = getRiverEdgeKeys(existingRivers);
  const mode = adjacentEndpoints.length === 0
    ? 'new independent river'
    : adjacentEndpoints.length === 1
      ? 'continue single river'
      : 'connect two rivers';

  let path: RiverVertex[] = [];
  if (adjacentEndpoints.length === 0) {
    path = generateNewIndependentRiver(region, candidateHexes, occupiedRiverEdgeKeys);
  } else if (adjacentEndpoints.length === 1) {
    path = continueSingleAdjacentRiver(region, adjacentEndpoints[0], candidateHexes, occupiedRiverEdgeKeys);
  } else {
    path = connectTwoAdjacentRivers(region, adjacentEndpoints, occupiedRiverEdgeKeys);
  }
  const startVertex = path[0]?.key ?? '—';
  const endVertex = path[path.length - 1]?.key ?? '—';
  if (path.length < 2) {
    console.warn(`River path not found for region ${region.id}.`);
    const validationIssues = validateRivers(existingRivers);
    console.warn('[RiverDebug]', {
      regionId: region.id,
      adjacentEndpointsLength: adjacentEndpoints.length,
      mode,
      startVertex,
      endVertex,
      pathLength: path.length,
      validationIssuesCount: validationIssues.length
    });
    return existingRivers;
  }
  const newRiverId = (existingRivers.at(-1)?.id ?? 0) + 1;
  const nextRivers = [...existingRivers, { id: newRiverId, regionId: region.id, vertexPath: path }];
  const validationIssues = validateRivers(nextRivers);
  for (const issue of validationIssues) {
    console.warn('[RiverValidation]', issue);
  }
  console.warn('[RiverDebug]', {
    regionId: region.id,
    adjacentEndpointsLength: adjacentEndpoints.length,
    mode,
    startVertex,
    endVertex,
    pathLength: path.length,
    validationIssuesCount: validationIssues.length
  });
  return nextRivers;
}

function renderRiverPolyline(river: River, offsetX: number, offsetY: number) {
  const points = river.vertexPath.map((vertex) => `${vertex.x + offsetX},${vertex.y + offsetY}`).join(' ');
  return { key: `river-${river.id}`, points };
}

export function App() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [candidateHexes, setCandidateHexes] = useState<AxialHex[]>([]);
  const [rivers, setRivers] = useState<River[]>([]);
  const [riverValidationIssues, setRiverValidationIssues] = useState<RiverValidationIssue[]>([]);
  const [selectedHex, setSelectedHex] = useState<AxialHex | null>(START_HEX);

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

    const withPixels = all.map((hex) => ({ ...hex, ...toPixel(hex.q, hex.r), key: hexKey(hex) }));
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
  }, [allRegionHexes, candidateHexes]);

  const riverPolylines = useMemo(() => {
    const all = positionedHexes.hexes;
    if (all.length === 0) return [];
    const minBaseX = Math.min(...all.map((h) => toPixel(h.q, h.r).x));
    const minBaseY = Math.min(...all.map((h) => toPixel(h.q, h.r).y));
    const offsetX = HEX_SIZE * 2 - minBaseX;
    const offsetY = HEX_SIZE * 2 - minBaseY;
    return rivers.map((river) => renderRiverPolyline(river, offsetX, offsetY));
  }, [positionedHexes, rivers]);

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
      targetSize: size
    };
    const nextRegions = [...regions, region];
    const nextAllHexes = nextRegions.flatMap((r) => r.hexes);
    const nextCandidateHexes = getCandidateHexes(nextAllHexes);
    setRegions(nextRegions);
    setCandidateHexes(nextCandidateHexes);
    setRivers((current) => {
      const nextRivers = generateRiverForRegion(region, current, nextCandidateHexes);
      setRiverValidationIssues(validateRivers(nextRivers));
      return nextRivers;
    });
    setSelectedHex(centerHex);
  };

  const resetMap = () => {
    setRegions([]);
    setCandidateHexes([]);
    setRivers([]);
    setRiverValidationIssues([]);
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

  const lastRegion = regions[regions.length - 1];

  return (
    <div className="app">
      <header className="header">
        <h1>Hexcrawl Region Generator</h1>
        <div className="controls">
          <button onClick={() => addRegionToMap(START_HEX)} disabled={regions.length > 0}>
            Сгенерировать регион
          </button>
          <button onClick={resetMap} className="secondary">Сбросить</button>
        </div>
      </header>

      <section className="content">
        <div className="map-card">
          <h2>Карта регионов</h2>
          <svg viewBox={`0 0 ${positionedHexes.width} ${positionedHexes.height}`}>
            {positionedHexes.hexes.map((hex) => {
              const meta = metadataMap.get(hex.key);
              const cls = hex.kind === 'candidate' ? 'hex candidate' : meta?.isCenter ? 'hex center' : 'hex region';
              const fill = hex.kind === 'candidate' ? undefined : getRegionColor(meta?.regionId ?? 0);
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
          <hr />
          <p><strong>River validation:</strong> {riverValidationIssues.length === 0 ? 'OK' : `${riverValidationIssues.length} issue(s)`}</p>
          {riverValidationIssues.slice(0, 5).map((issue, index) => (
            <p key={`${issue.type}-${issue.riverId ?? 'n'}-${issue.edgeKey ?? issue.vertexKey ?? index}`}>
              {issue.type} {issue.riverId ? `#${issue.riverId}` : ''} {issue.edgeKey ?? issue.vertexKey ?? ''}
            </p>
          ))}
          {candidateHexes.length > 0 ? <p>Выберите гекс-кандидат на карте для добавления следующего региона.</p> : null}
        </div>
      </section>

    </div>
  );
}
