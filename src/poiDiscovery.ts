import type {Discovery} from './knaveClassic.ts';

export type DiscoveryMap = Record<string, Discovery>;

// Passage and exploration percentages. The remaining probability is interaction.
const weights: Record<string, readonly [number, number]> = {
  'capital': [100, 0],
  'city': [100, 0],
  'town': [100, 0],
  'village': [100, 0],
  'castle': [100, 0],
  'fort': [100, 0],
  'stronghold': [100, 0],
  'tower': [100, 0],
  'farm': [85, 15],
  'pasture': [90, 10],
  'tavern': [95, 5],
  'mill': [90, 10],
  'monastery': [80, 20],
  'sawmill': [80, 20],
  'brewery': [75, 25],
  'distillery': [65, 35],
  'stone_quarry': [80, 20],
  'quarry': [85, 15],
  'camp': [45, 55],
  'hut': [35, 65],
  'apiary': [30, 70],
  'graveyard': [55, 45],
  'obelisk': [90, 10],
  'statue': [70, 30],
  'structure': [60, 40],
  'natural_place': [45, 55],
  'mine': [0, 80],
  'cave': [0, 65],
  'dungeon': [0, 40],
  'lair': [0, 55],
  'ruins': [50, 40],
  'holy_place': [35, 50],
  'cursed_place': [20, 50],
  'portal': [20, 35],
  'water:whirlpool': [80, 20],
  'water:rocks': [90, 10],
  'water:underwater_cave': [0, 30],
  'water:underwater_ruins': [0, 45],
  'water:lair': [0, 35],
  'water:shipwreck': [40, 45],
  'none': [35, 55],
};

export function discoveryForRoll(kind: string, roll: number): Discovery {
  const [passage, exploration] = weights[kind] ?? weights.none;
  if (roll < passage) return 'passage';
  if (roll < passage + exploration) return 'exploration';
  return 'interaction';
}

export function assignDiscovery(kind: string, seed: number, owner: string): Discovery {
  let hash = seed ^ 2166136261;
  for (const character of owner) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return discoveryForRoll(kind, (hash >>> 0) % 100);
}
