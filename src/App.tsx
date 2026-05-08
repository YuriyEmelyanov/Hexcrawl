import { useMemo, useState } from 'react';

type Hex = {
  id: string;
  q: number;
  r: number;
  name: string;
  terrain: string;
  danger: string;
  description: string;
};

type Character = {
  id: string;
  name: string;
  role: string;
  hp: number;
  supplies: number;
};

const HEX_SIZE = 36;
const SQRT3 = Math.sqrt(3);

const hexes: Hex[] = [
  {
    id: 'A1',
    q: 0,
    r: 0,
    name: 'Whispering Moor',
    terrain: 'Bog',
    danger: 'Low',
    description: 'Thick fog drifts above black water. Travel is slow, but hidden herbs are common.'
  },
  {
    id: 'A2',
    q: 1,
    r: 0,
    name: 'Broken Standing Stones',
    terrain: 'Ruins',
    danger: 'Medium',
    description: 'Ancient menhirs circle a cracked altar. At dusk, distant whispers can be heard.'
  },
  {
    id: 'A3',
    q: 2,
    r: 0,
    name: 'Redpine Ridge',
    terrain: 'Forest',
    danger: 'Medium',
    description: 'Tall red pines block the sky. Scouts report old hunter trails and signs of wolves.'
  },
  {
    id: 'B1',
    q: 0,
    r: 1,
    name: 'Sunken Ford',
    terrain: 'River',
    danger: 'Low',
    description: 'A shallow crossing over slippery stones. Safe in daylight, treacherous after rain.'
  },
  {
    id: 'B2',
    q: 1,
    r: 1,
    name: 'Ashwind Camp',
    terrain: 'Settlement',
    danger: 'Low',
    description: 'Nomad tents around a central fire pit. Rumors and trade goods are easy to find.'
  },
  {
    id: 'B3',
    q: 2,
    r: 1,
    name: 'Howler Hollow',
    terrain: 'Hills',
    danger: 'High',
    description: 'Steep gullies echo with bestial cries. Several caravans vanished here last month.'
  },
  {
    id: 'C1',
    q: 0,
    r: 2,
    name: 'Glass Flats',
    terrain: 'Wastes',
    danger: 'Medium',
    description: 'The ground sparkles like shattered glass. Mirages and sudden heat waves confuse travelers.'
  },
  {
    id: 'C2',
    q: 1,
    r: 2,
    name: 'Old Beacon Hill',
    terrain: 'Hill',
    danger: 'Medium',
    description: 'A ruined watchtower overlooks the region. Signal braziers might still be usable.'
  },
  {
    id: 'C3',
    q: 2,
    r: 2,
    name: 'Nightroot Thicket',
    terrain: 'Deep Forest',
    danger: 'High',
    description: 'Twisted roots and strange mushrooms cover the ground. Light fades unnaturally fast.'
  }
];

const party: Character[] = [
  { id: 'pc1', name: 'Edda', role: 'Scout', hp: 10, supplies: 3 },
  { id: 'pc2', name: 'Karn', role: 'Guardian', hp: 14, supplies: 2 },
  { id: 'pc3', name: 'Mira', role: 'Mystic', hp: 8, supplies: 4 }
];

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

export function App() {
  const [selectedHexId, setSelectedHexId] = useState(hexes[0].id);
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId) ?? hexes[0];

  const positionedHexes = useMemo(() => {
    return hexes.map((hex) => {
      const { x, y } = toPixel(hex.q, hex.r);
      return {
        ...hex,
        x: x + 70,
        y: y + 70
      };
    });
  }, []);

  return (
    <div className="layout">
      <aside className="panel left">
        <h2>Hex Details</h2>
        <p className="hex-id">{selectedHex.id}</p>
        <h3>{selectedHex.name}</h3>
        <p>
          <strong>Terrain:</strong> {selectedHex.terrain}
        </p>
        <p>
          <strong>Danger:</strong> {selectedHex.danger}
        </p>
        <p>{selectedHex.description}</p>
      </aside>

      <main className="map-panel">
        <h1>Hexcrawl Map (MVP)</h1>
        <svg viewBox="0 0 360 320" role="img" aria-label="Interactive hex map">
          {positionedHexes.map((hex) => {
            const isSelected = hex.id === selectedHexId;
            return (
              <g key={hex.id}>
                <polygon
                  points={hexPoints(hex.x, hex.y, HEX_SIZE)}
                  className={isSelected ? 'hex selected' : 'hex'}
                  onClick={() => setSelectedHexId(hex.id)}
                />
                <text x={hex.x} y={hex.y + 4} textAnchor="middle" className="hex-label">
                  {hex.id}
                </text>
              </g>
            );
          })}
        </svg>
      </main>

      <aside className="panel right">
        <h2>Party Sheets</h2>
        {party.map((character) => (
          <article key={character.id} className="sheet">
            <h3>{character.name}</h3>
            <p>{character.role}</p>
            <p>HP: {character.hp}</p>
            <p>Supplies: {character.supplies}</p>
          </article>
        ))}
      </aside>
    </div>
  );
}
