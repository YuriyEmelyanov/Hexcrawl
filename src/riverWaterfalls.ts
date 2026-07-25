import type { RiverFullness } from './riverFullness';

export type RiverWaterfallContext = {
  fullness: RiverFullness;
  heightLevel: 1 | 2 | 3;
  isRiverStart: boolean;
  isConfluence: boolean;
  touchesLake: boolean;
};

const WATERFALL_CHANCE_BY_HEIGHT_AND_FULLNESS: Record<RiverWaterfallContext['heightLevel'], Record<RiverFullness, number>> = {
  1: { 1: 0.2, 2: 0.06, 3: 0.02, 4: 0.004, 5: 0.005 },
  2: { 1: 5, 2: 2, 3: 0.6, 4: 0.1, 5: 0.01 },
  3: { 1: 30, 2: 15, 3: 5, 4: 1, 5: 0.1 }
};

/** Returns the chance, in percent, that an eligible river vertex has a waterfall. */
export function getRiverWaterfallChance(context: RiverWaterfallContext): number {
  return WATERFALL_CHANCE_BY_HEIGHT_AND_FULLNESS[context.heightLevel][context.fullness];
}

/** Returns whether a river vertex is eligible to show a waterfall. */
export function canHaveRiverWaterfall(context: RiverWaterfallContext): boolean {
  return !context.isRiverStart && !context.isConfluence && !context.touchesLake;
}

/** Rolls for a waterfall at an eligible river vertex. */
export function hasRiverWaterfall(
  context: RiverWaterfallContext,
  random: () => number = Math.random
): boolean {
  return canHaveRiverWaterfall(context) && random() * 100 < getRiverWaterfallChance(context);
}
