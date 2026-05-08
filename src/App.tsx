import { useMemo, useState } from 'react';

type AxialHex = {
  q: number;
  r: number;
};

type DfRollResult = {
  values: number[];
  sum: number;
};

const HEX_SIZE = 28;
const SQRT3 = Math.sqrt(3);
const CENTER: AxialHex = { q: 0, r: 0 };
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
    const x = cx + size * Math.cos(angle);
    const y = cy + size * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

export function generateDfRoll(): DfRollResult {
  const values = Array.from({ length: 12 }, () => Math.floor(Math.random() * 3));
  const sum = values.reduce((acc, current) => acc + current, 0);
  return { values, sum };
}

export function getHexNeighbors(hex: AxialHex): AxialHex[] {
  return NEIGHBOR_DIRECTIONS.map((direction) => ({
    q: hex.q + direction.q,
    r: hex.r + direction.r
  }));
}

export function generateConnectedHexArea(sum: number): AxialHex[] {
  const targetSize = Math.max(1, sum + 1);
  const areaKeys = new Set<string>([hexKey(CENTER)]);

  while (areaKeys.size < targetSize) {
    const area = Array.from(areaKeys).map(parseHexKey);
    const anchor = area[Math.floor(Math.random() * area.length)];
    const neighborCandidates = getHexNeighbors(anchor).filter(
      (neighbor) => !areaKeys.has(hexKey(neighbor))
    );

    if (neighborCandidates.length === 0) {
      continue;
    }

    const nextHex = neighborCandidates[Math.floor(Math.random() * neighborCandidates.length)];
    areaKeys.add(hexKey(nextHex));
  }

  return Array.from(areaKeys).map(parseHexKey);
}

export function App() {
  const [area, setArea] = useState<AxialHex[]>([{ ...CENTER }]);
  const [rollResult, setRollResult] = useState<DfRollResult | null>(null);

  const positionedHexes = useMemo(() => {
    const areaWithPixels = area.map((hex) => {
      const { x, y } = toPixel(hex.q, hex.r);
      return {
        ...hex,
        x,
        y,
        key: hexKey(hex)
      };
    });

    const minX = Math.min(...areaWithPixels.map((hex) => hex.x));
    const maxX = Math.max(...areaWithPixels.map((hex) => hex.x));
    const minY = Math.min(...areaWithPixels.map((hex) => hex.y));
    const maxY = Math.max(...areaWithPixels.map((hex) => hex.y));

    const width = maxX - minX + HEX_SIZE * 4;
    const height = maxY - minY + HEX_SIZE * 4;
    const offsetX = -minX + HEX_SIZE * 2;
    const offsetY = -minY + HEX_SIZE * 2;

    return {
      width,
      height,
      hexes: areaWithPixels.map((hex) => ({
        ...hex,
        x: hex.x + offsetX,
        y: hex.y + offsetY
      }))
    };
  }, [area]);

  const handleGenerate = () => {
    const result = generateDfRoll();
    setRollResult(result);
    setArea(generateConnectedHexArea(result.sum));
  };

  const handleReset = () => {
    setArea([{ ...CENTER }]);
    setRollResult(null);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Hexcrawl Area Generator</h1>
        <div className="controls">
          <button onClick={handleGenerate}>Сгенерировать область</button>
          <button onClick={handleReset} className="secondary">
            Сбросить
          </button>
        </div>
      </header>

      <section className="content">
        <div className="map-card">
          <h2>Карта области</h2>
          <svg
            viewBox={`0 0 ${positionedHexes.width} ${positionedHexes.height}`}
            role="img"
            aria-label="Сгенерированная связная hex-область"
          >
            {positionedHexes.hexes.map((hex) => {
              const isCenter = hex.q === 0 && hex.r === 0;
              return (
                <g key={hex.key}>
                  <polygon
                    points={hexPoints(hex.x, hex.y, HEX_SIZE)}
                    className={isCenter ? 'hex center' : 'hex selected'}
                  />
                  <text x={hex.x} y={hex.y + 4} textAnchor="middle" className="hex-label">
                    {hex.q}/{hex.r}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="roll-card">
          <h2>Результат 12dF</h2>
          {rollResult ? (
            <>
              <p className="sum">Сумма: {rollResult.sum}</p>
              <p>Размер области: {Math.max(1, rollResult.sum + 1)} гексов (включая центр)</p>
              <div className="roll-values">
                {rollResult.values.map((value, index) => (
                  <span key={`${value}-${index}`} className="roll-chip">
                    {value}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p>Нажмите «Сгенерировать область», чтобы выполнить бросок 12dF.</p>
          )}
        </div>
      </section>
    </div>
  );
}
