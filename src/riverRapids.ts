import type { RiverFullness } from './riverFullness';

export type RiverRapidsContext = {
  fullness: RiverFullness;
  heightLevel: 1 | 2 | 3;
};

const RAPIDS_CHANCE_BY_HEIGHT_AND_FULLNESS: Record<RiverRapidsContext['heightLevel'], Record<RiverFullness, number>> = {
  // Plains
  1: { 1: 10, 2: 5, 3: 2, 4: 1, 5: 0.1 },
  // Hills
  2: { 1: 50, 2: 35, 3: 20, 4: 100, 5: 2 },
  // Mountains
  3: { 1: 90, 2: 80, 3: 60, 4: 30, 5: 10 }
};

/** Returns the chance, in percent, that a river edge has rapids. */
export function getRiverRapidsChance(context: RiverRapidsContext): number {
  return RAPIDS_CHANCE_BY_HEIGHT_AND_FULLNESS[context.heightLevel][context.fullness];
}

export function hasRiverRapids(
  context: RiverRapidsContext,
  random: () => number = Math.random
): boolean {
  return random() * 100 < getRiverRapidsChance(context);
}
