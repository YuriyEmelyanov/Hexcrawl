import type { RiverFullness } from './riverFullness';

export type RiverRapidsContext = {
  fullness: RiverFullness;
  heightLevel: 1 | 2 | 3;
};

/** Returns the chance, in percent, that a river edge has rapids. */
export function getRiverRapidsChance(context: RiverRapidsContext): number {
  const fullnessMultiplier = context.fullness === 1 ? 5
    : context.fullness === 2 ? 4
      : context.fullness === 3 ? 3
        : context.fullness === 4 ? 2
          : 1;
  const heightMultiplier = context.heightLevel === 3 ? 6 : context.heightLevel === 2 ? 3 : 1;
  return Math.min(100, 1 * fullnessMultiplier * heightMultiplier);
}

export function hasRiverRapids(
  context: RiverRapidsContext,
  random: () => number = Math.random
): boolean {
  return random() * 100 < getRiverRapidsChance(context);
}
