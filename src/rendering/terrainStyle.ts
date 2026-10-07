// Presentation only. Never consume the generation RNG here.
export const WATER_PALETTE = { river: '#48ADB5', deep: '#287F8B', marks: '#9DE3E5', sea: '#97B6BC' } as const;
export const BIOME_GROUND_COLORS = {
  plain_deciduous_forest: '#91B575', plain_mixed_forest: '#91B575', plain_coniferous_forest: '#91B575',
  deciduous_forested_hills: '#91B575', mixed_forested_hills: '#91B575', coniferous_forested_hills: '#91B575',
  deciduous_mountain_forest: '#91B575', mixed_mountain_forest: '#91B575', coniferous_mountain_forest: '#91B575',
  deciduous_woodland: '#91B575', mixed_woodland: '#91B575', coniferous_woodland: '#91B575',
  hilly_woodland: '#91B575', mountain_woodland: '#91B575',
  open_plains: '#B4C391', open_hills: '#B4C391', mountains: '#B6B3A7',
  swamp: '#929F70', swamp_forest: '#929F70', semi_desert: '#CDBB91',
  dead_forest: '#AAA9A2', dead_woodland: '#AAA9A2', dead_forested_hills: '#AAA9A2', dead_mountain_forest: '#AAA9A2'
} as const;
export const OPEN_TERRAINS = ['open_plains', 'open_hills', 'mountains', 'swamp', 'semi_desert'] as const;
const parity = (n: number) => ((n % 2) + 2) % 2;
function hash(n: number) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
}
// A proper four-colouring of the axial lattice, with seeded orientation,
// independently shuffled row phases and a palette permutation. All six
// neighbours differ, including at negative coordinates. No map traversal or
// neighbour state: map growth and biome editing cannot reshuffle old cells.
export function terrainVariant(q: number, r: number, seed: number): number {
  const orientation = hash(seed) % 3;
  const [a, b] = orientation === 0 ? [q, r] : orientation === 1 ? [r, q] : [q, -q-r];
  const phase = hash((seed ^ Math.imul(b, 0x9e3779b1)) >>> 0) & 1;
  const index = 2 * parity(b) + (parity(a) ^ phase);
  const permutations = [[0,1,2,3],[1,3,0,2],[2,0,3,1],[3,2,1,0],[0,2,1,3],[2,3,0,1]];
  return permutations[hash(seed ^ 0x51f15e) % permutations.length][index] + 1;
}
export function terrainAsset(biome: string, q: number, r: number, seed: number): string {
  return (OPEN_TERRAINS as readonly string[]).includes(biome)
    ? `/terrain/v2/${biome}-${terrainVariant(q,r,seed)}.svg`
    : '/terrain/v2/tree.svg';
}
export type LakeCell = { q: number; r: number; x: number; y: number };
const neighbours = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
export function lakeShorePath(cells: LakeCell[], radius: number): string {
  const keys = new Set(cells.map(c => `${c.q},${c.r}`));
  const segments: string[] = [];
  for (const c of cells) {
    const points = Array.from({length:6}, (_, i) => {
      const angle = (i * 60 - 30) * Math.PI / 180;
      return [c.x + radius * Math.cos(angle), c.y + radius * Math.sin(angle)];
    });
    for (let i=0; i<6; i++) {
      const [dq,dr] = neighbours[i];
      if (keys.has(`${c.q+dq},${c.r+dr}`)) continue;
      const a=points[i], b=points[(i+1)%6];
      segments.push(`M${a[0]},${a[1]}L${b[0]},${b[1]}`);
    }
  }
  return segments.join('');
}
export function waterAtDepth(t: number): string {
  t = Math.max(0, Math.min(1, t));
  const near=[72,173,181], far=[40,127,139];
  return `rgb(${near.map((v,i) => Math.round(v + (far[i]-v)*t)).join(',')})`;
}
