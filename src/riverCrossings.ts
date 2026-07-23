export type RiverCrossingKind = 'bridge' | 'ferry' | 'ford';

export type RiverCrossingContext = {
  fullness: number;
  heightLevel: 1 | 2 | 3;
  biomeLandType: 'settled' | 'wild';
  roadKind: 'road' | 'trail';
};

/** Returns the chance, in percent, that a new crossing is a bridge. */
export function getBridgeChance(context: RiverCrossingContext): number {
  let chance = 100;

  if (context.fullness === 1 || context.fullness === 3) chance -= 10;
  else if (context.fullness === 4) chance -= 20;
  else if (context.fullness >= 5) chance -= 30;

  if (context.heightLevel === 2) chance -= 10;
  else if (context.heightLevel === 1) chance -= 20;
  if (context.roadKind === 'trail') chance -= 30;
  if (context.biomeLandType === 'wild') chance -= 20;

  return Math.max(0, Math.min(100, chance));
}

/**
 * Selects a kind for a newly created road/river crossing. Existing crossings
 * keep their saved kind and are intentionally not passed through this function.
 */
export function chooseRiverCrossingKind(
  context: RiverCrossingContext,
  random: () => number = Math.random
): RiverCrossingKind {
  if (random() * 100 < getBridgeChance(context)) return 'bridge';

  // Once a bridge has not been selected, rivers from fullness 3 upward can
  // only be crossed by ferry.
  if (context.fullness >= 3) return 'ferry';

  let ferryChance = 50;
  if (context.heightLevel === 2) ferryChance += 10;
  else if (context.heightLevel === 3) ferryChance += 20;
  if (context.biomeLandType === 'wild') ferryChance -= 25;
  if (context.roadKind === 'trail') ferryChance -= 25;
  if (context.fullness === 2) ferryChance += 30;

  return random() * 100 < Math.max(0, Math.min(100, ferryChance)) ? 'ferry' : 'ford';
}
