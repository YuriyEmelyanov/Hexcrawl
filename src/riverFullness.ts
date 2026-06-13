export type RiverFullness = 1 | 2 | 3 | 4 | 5;

export function decreaseRiverFullness(fullness: RiverFullness): RiverFullness {
  return Math.max(1, fullness - 1) as RiverFullness;
}

export function getInteriorSourceFullnessForOutgoingRiver(outgoingFullness: RiverFullness): RiverFullness {
  return getUpstreamFullnessBeforeMountainTributary(outgoingFullness);
}

export function getUpstreamFullnessBeforeMountainTributary(
  sourceFullness: RiverFullness,
  currentSectorFullness: RiverFullness = sourceFullness
): RiverFullness {
  const reducedSourceFullness = decreaseRiverFullness(sourceFullness);
  return Math.min(currentSectorFullness, reducedSourceFullness) as RiverFullness;
}

// Connector sectors that enter a region through an outgoing boundary keep the
// endpoint fullness. Any mountain-source drop is applied later only to sectors
// upstream of an actual tributary confluence, not at the region boundary.
export function getOutgoingConnectorFullnessFromEndpoint(
  outgoingFullness: RiverFullness,
  _connectedToLake: boolean
): RiverFullness {
  return outgoingFullness;
}
