export type RegionHeightLevel = 1 | 2 | 3;

export type RiverTouchHeight = {
  endpointType: 'start' | 'end';
  touchingHeight?: RegionHeightLevel;
};

/**
 * Prefers a source region one level above its highest downstream neighbour.
 * A mixed set of incoming and outgoing rivers must use the normal constraints.
 */
export function getOnlyOutgoingRiversPreferredHeight(
  touches: RiverTouchHeight[]
): RegionHeightLevel | undefined {
  if (touches.length === 0 || touches.some((touch) => touch.endpointType !== 'start')) {
    return undefined;
  }

  const knownHeights = touches
    .map((touch) => touch.touchingHeight)
    .filter((height): height is RegionHeightLevel => height !== undefined);
  if (knownHeights.length === 0) return undefined;

  return Math.min(3, Math.max(...knownHeights) + 1) as RegionHeightLevel;
}
