export type RegionHeightLevel = 1 | 2 | 3;

export type RiverTouchHeight = {
  endpointType: 'start' | 'end';
  touchingHeight?: RegionHeightLevel;
  fullness?: number;
};

/**
 * Prefers height one when a full river flows into a height-one neighbour;
 * otherwise prefers a source region one level above its highest downstream neighbour.
 * A mixed set of incoming and outgoing rivers must use the normal constraints.
 */
export function getOnlyOutgoingRiversPreferredHeight(
  touches: RiverTouchHeight[]
): RegionHeightLevel | undefined {
  if (touches.length === 0 || touches.some((touch) => touch.endpointType !== 'start')) {
    return undefined;
  }

  if (touches.some((touch) => touch.touchingHeight === 1 && (touch.fullness ?? 0) >= 3)) {
    return 1;
  }

  const knownHeights = touches
    .map((touch) => touch.touchingHeight)
    .filter((height): height is RegionHeightLevel => height !== undefined);
  if (knownHeights.length === 0) return undefined;

  return Math.min(3, Math.max(...knownHeights) + 1) as RegionHeightLevel;
}
