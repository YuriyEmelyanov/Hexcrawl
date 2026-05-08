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

export function chooseRegionCenter(regionHexes: AxialHex[], anchorHex: AxialHex): AxialHex {
  if (regionHexes.length <= 2) {
    return randomFrom(regionHexes);
  }

  const regionKeys = new Set(regionHexes.map(hexKey));
  const weighted = regionHexes.map((hex) => {
    const sameRegionNeighborCount = getHexNeighbors(hex).filter((neighbor) => regionKeys.has(hexKey(neighbor))).length;
    let centerWeight = 1 + sameRegionNeighborCount ** 2;
    if (hexKey(hex) === hexKey(anchorHex)) {
      centerWeight *= 0.25;
    }
    return { hex, weight: centerWeight };
  });

  const total = weighted.reduce((acc, item) => acc + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.hex;
    }
  }

  return weighted[weighted.length - 1].hex;
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

export function App() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [candidateHexes, setCandidateHexes] = useState<AxialHex[]>([]);
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

  const addRegionToMap = (anchorHex: AxialHex) => {
    const roll = generateDfRoll();
    const size = roll.sum + 1;
    const occupiedHexes = new Set(allRegionHexes.map(hexKey));
    const regionHexes = generateConnectedRegionFromAnchor(anchorHex, size, occupiedHexes);
    const centerHex = chooseRegionCenter(regionHexes, anchorHex);
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
    setRegions(nextRegions);
    setCandidateHexes(getCandidateHexes(nextAllHexes));
    setSelectedHex(centerHex);
  };

  const resetMap = () => {
    setRegions([]);
    setCandidateHexes([]);
    setSelectedHex(START_HEX);
  };

  const selectedHexKey = selectedHex ? hexKey(selectedHex) : null;
  const selectedMeta = selectedHexKey ? metadataMap.get(selectedHexKey) : undefined;
  const isSelectedCandidate = selectedHex ? candidateHexes.some((c) => hexKey(c) === selectedHexKey) : false;

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
                  {meta?.isCenter ? <circle cx={hex.x} cy={hex.y} r={4} className="center-dot" /> : null}
                  <text x={hex.x} y={hex.y + 4} textAnchor="middle" className="hex-label">{hex.q}/{hex.r}</text>
                </g>
              );
            })}
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
          {candidateHexes.length > 0 ? <p>Выберите гекс-кандидат на карте для добавления следующего региона.</p> : null}
        </div>
      </section>

    </div>
  );
}
