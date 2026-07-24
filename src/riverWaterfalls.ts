export type RiverWaterfallContext = {
  heightLevel: 1 | 2 | 3;
  isRiverStart: boolean;
  isConfluence: boolean;
  touchesLake: boolean;
};

export const RIVER_WATERFALL_CHANCE = 15;

/** Returns whether a river vertex is eligible to show a waterfall. */
export function canHaveRiverWaterfall(context: RiverWaterfallContext): boolean {
  return context.heightLevel === 3 && !context.isRiverStart && !context.isConfluence && !context.touchesLake;
}

/** Rolls for a waterfall at an eligible river vertex. */
export function hasRiverWaterfall(
  context: RiverWaterfallContext,
  random: () => number = Math.random
): boolean {
  return canHaveRiverWaterfall(context) && random() * 100 < RIVER_WATERFALL_CHANCE;
}
