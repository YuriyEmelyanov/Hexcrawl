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

type Region = {
  id: number;
  hexes: AxialHex[];
  centerHex: AxialHex;
  anchorHex: AxialHex;
  roll: DfRollResult;
  targetSize: number;
};

type HexMeta = {
  regionId: number;
  isCenter: boolean;
  isAnchor: boolean;
};

type HexEdge = {
  from: AxialHex;
  to: AxialHex;
  neighbor: AxialHex;
};

type RiverSegment = {
  edgeKey: string;
  hexA: AxialHex;
  hexB: AxialHex;
  orderIndex: number;
  riverId: number;
};

type River = {
  id: number;
  segments: RiverSegment[];
  mergedIntoRiverId?: number;
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

function randomFrom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function getHexEdges(hex: AxialHex): HexEdge[] {
  const { x, y } = toPixel(hex.q, hex.r);
  const corners = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return { q: x + HEX_SIZE * Math.cos(angle), r: y + HEX_SIZE * Math.sin(angle) };
  });

  return NEIGHBOR_DIRECTIONS.map((direction, i) => ({
    from: corners[i],
    to: corners[(i + 1) % 6],
    neighbor: { q: hex.q + direction.q, r: hex.r + direction.r }
  }));
}

function getRiverSegmentsTouchingHex(hex: AxialHex, rivers: River[]): RiverSegment[] {
  return rivers.flatMap((river) =>
    river.segments.filter((segment) => hexKey(segment.hexA) === hexKey(hex) || hexKey(segment.hexB) === hexKey(hex))
  );
}

function getEdgeBetweenHexes(hexA: AxialHex, hexB: AxialHex) {
  return getHexEdges(hexA).find((edge) => hexKey(edge.neighbor) === hexKey(hexB));
}

function buildSegment(hexA: AxialHex, hexB: AxialHex, orderIndex: number, riverId: number): RiverSegment {
  return { edgeKey: normalizeEdgeKey(hexA, hexB), hexA, hexB, orderIndex, riverId };
}

export function generateDfRoll(): DfRollResult {
  const values = Array.from({ length: 12 }, () => Math.floor(Math.random() * 3));
  const sum = values.reduce((acc, current) => acc + current, 0);
  return { values, sum };
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

export function weightedPickCandidate(
  candidates: AxialHex[],
  anchorHex: AxialHex,
  currentRegionHexes: Set<string>
): AxialHex {
  const weights = candidates.map((candidate) => {
    const distanceWeight = 1 / (1 + hexDistance(candidate, anchorHex));
    const insideNeighbors = getHexNeighbors(candidate).filter((n) => currentRegionHexes.has(hexKey(n))).length;
    return distanceWeight * (1 + insideNeighbors);
  });

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

    const picked = weightedPickCandidate(validCandidates, anchorHex, regionKeys);
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

function continueRiverThroughRegion(region: Region, river: River, candidateHexes: AxialHex[]): River {
  const regionKeys = new Set(region.hexes.map(hexKey));
  const extensionTarget = Math.floor(Math.random() * 3) + 1;
  const existingEdges = new Set(river.segments.map((segment) => segment.edgeKey));
  let current = river.segments[river.segments.length - 1]?.hexB ?? region.centerHex;
  const additions: RiverSegment[] = [];

  for (let i = 0; i < extensionTarget; i += 1) {
    const neighbors = getHexNeighbors(current);
    const preferred = neighbors.filter((h) => regionKeys.has(hexKey(h)) || candidateHexes.some((c) => hexKey(c) === hexKey(h)));
    const nextPool = preferred.length > 0 ? preferred : neighbors;
    const nextHex = randomFrom(nextPool);
    const edgeKey = normalizeEdgeKey(current, nextHex);
    if (existingEdges.has(edgeKey)) {
      break;
    }
    existingEdges.add(edgeKey);
    additions.push(buildSegment(current, nextHex, river.segments.length + additions.length, river.id));
    current = nextHex;
  }

  return { ...river, segments: [...river.segments, ...additions] };
}

function generateRiverForRegion(region: Region, existingRivers: River[], candidateHexes: AxialHex[]): River[] {
  const touching = existingRivers.filter((river) =>
    river.segments.some((segment) => region.hexes.some((hex) => hexKey(hex) === hexKey(segment.hexA) || hexKey(hex) === hexKey(segment.hexB)))
  );

  if (touching.length > 0) {
    const updated = existingRivers.map((river) => {
      if (!touching.some((t) => t.id === river.id)) {
        return river;
      }
      return continueRiverThroughRegion(region, river, candidateHexes);
    });

    if (touching.length > 1) {
      return mergeRiversIfNeeded(updated);
    }

    return updated;
  }

  const regionByCenter = [...region.hexes].sort(
    (a, b) => hexDistance(a, region.centerHex) - hexDistance(b, region.centerHex)
  );
  const nearCenter = regionByCenter[0] ?? region.centerHex;
  const centerNeighbors = getHexNeighbors(nearCenter);
  const toRegionNeighbor = centerNeighbors.find((neighbor) => region.hexes.some((hex) => hexKey(hex) === hexKey(neighbor)));
  const firstOutCandidate = centerNeighbors.find((neighbor) => candidateHexes.some((c) => hexKey(c) === hexKey(neighbor)));

  if (!toRegionNeighbor || !firstOutCandidate) {
    return existingRivers;
  }

  const newRiverId = (existingRivers.at(-1)?.id ?? 0) + 1;
  const river: River = {
    id: newRiverId,
    segments: [
      buildSegment(nearCenter, toRegionNeighbor, 0, newRiverId),
      buildSegment(toRegionNeighbor, firstOutCandidate, 1, newRiverId)
    ]
  };

  return [...existingRivers, continueRiverThroughRegion(region, river, candidateHexes)];
}

function mergeRiversIfNeeded(rivers: River[]): River[] {
  if (rivers.length < 2) {
    return rivers;
  }

  const active = rivers.filter((r) => !r.mergedIntoRiverId);
  if (active.length < 2) {
    return rivers;
  }

  const sorted = [...active].sort((a, b) => a.id - b.id);
  const mainRiver = sorted[0];
  const mergedIds = new Set(sorted.slice(1).map((r) => r.id));
  const combinedSegments = sorted.flatMap((r) => r.segments).map((segment, index) => ({ ...segment, orderIndex: index, riverId: mainRiver.id }));

  return rivers.map((river) => {
    if (river.id === mainRiver.id) {
      return { ...river, segments: combinedSegments };
    }
    if (mergedIds.has(river.id)) {
      return { ...river, mergedIntoRiverId: mainRiver.id };
    }
    return river;
  });
}

function renderRiverSegments(rivers: River[], positionedByKey: Map<string, { x: number; y: number }>) {
  const activeRivers = rivers.filter((r) => !r.mergedIntoRiverId);
  return activeRivers.flatMap((river) => {
    const sorted = [...river.segments].sort((a, b) => a.orderIndex - b.orderIndex);
    return sorted.map((segment) => {
      const edge = getEdgeBetweenHexes(segment.hexA, segment.hexB);
      if (!edge) {
        return null;
      }
      const a = positionedByKey.get(hexKey(segment.hexA));
      if (!a) {
        return null;
      }
      const base = toPixel(segment.hexA.q, segment.hexA.r);
      const dx = a.x - base.x;
      const dy = a.y - base.y;
      return {
        key: `${river.id}-${segment.orderIndex}`,
        x1: edge.from.q + dx,
        y1: edge.from.r + dy,
        x2: edge.to.q + dx,
        y2: edge.to.r + dy
      };
    }).filter(Boolean);
  });
}

export function App() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [candidateHexes, setCandidateHexes] = useState<AxialHex[]>([]);
  const [rivers, setRivers] = useState<River[]>([]);
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

  const riverLines = useMemo(() => {
    const posMap = new Map(positionedHexes.hexes.map((hex) => [hex.key, { x: hex.x, y: hex.y }]));
    return renderRiverSegments(rivers, posMap);
  }, [positionedHexes, rivers]);

  const addRegionToMap = (anchorHex: AxialHex) => {
    const roll = generateDfRoll();
    const size = roll.sum + 1;
    const occupiedHexes = new Set(allRegionHexes.map(hexKey));
    const regionHexes = generateConnectedRegionFromAnchor(anchorHex, size, occupiedHexes);
    const centerHex = chooseRegionCenter(regionHexes);
    const region: Region = {
      id: regions.length + 1,
      hexes: regionHexes,
      centerHex,
      anchorHex,
      roll,
      targetSize: size
    };
    const nextRegions = [...regions, region];
    const nextAllHexes = nextRegions.flatMap((r) => r.hexes);
    const nextCandidateHexes = getCandidateHexes(nextAllHexes);
    setRegions(nextRegions);
    setCandidateHexes(nextCandidateHexes);
    setRivers((current) => generateRiverForRegion(region, current, nextCandidateHexes));
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
  const selectedRiverIds = selectedHex ? [...new Set(getRiverSegmentsTouchingHex(selectedHex, rivers).map((s) => s.riverId))] : [];

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
            <defs>
              <marker id="river-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M 0 0 L 8 4 L 0 8 z" className="river-arrowhead" />
              </marker>
            </defs>
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
              {riverLines.map((line) => (
                <line
                  key={line?.key}
                  x1={line?.x1}
                  y1={line?.y1}
                  x2={line?.x2}
                  y2={line?.y2}
                  className="river-segment"
                  markerEnd="url(#river-arrow)"
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
              <p>12dF: {lastRegion.roll.values.join(', ')}</p>
              <p>Сумма броска: {lastRegion.roll.sum}</p>
              <p>Целевой размер: {lastRegion.targetSize}</p>
              <p>Фактический размер: {lastRegion.hexes.length}</p>
            </>
          ) : null}
          <hr />
          <p><strong>Выбранный гекс:</strong> {selectedHex ? `${selectedHex.q}/${selectedHex.r}` : '—'}</p>
          <p><strong>Тип:</strong> {selectedType}</p>
          <p><strong>Регион:</strong> {selectedMeta?.regionId ?? '—'}</p>
          <p><strong>centralHex:</strong> {selectedMeta?.isCenter ? 'да' : 'нет'}</p>
          <p><strong>anchorHex:</strong> {selectedMeta?.isAnchor ? 'да' : 'нет'}</p>
          <p><strong>Реки:</strong> {selectedRiverIds.length > 0 ? selectedRiverIds.join(', ') : '—'}</p>
          {candidateHexes.length > 0 ? <p>Выберите гекс-кандидат на карте для добавления следующего региона.</p> : null}
        </div>
      </section>

    </div>
  );
}
