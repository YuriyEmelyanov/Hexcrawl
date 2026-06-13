export type RiverFullness = 1 | 2 | 3 | 4 | 5;

export function decreaseRiverFullness(fullness: RiverFullness): RiverFullness {
  return Math.max(1, fullness - 1) as RiverFullness;
}

export function getInteriorSourceFullnessForOutgoingRiver(outgoingFullness: RiverFullness): RiverFullness {
  return outgoingFullness > 1 ? decreaseRiverFullness(outgoingFullness) : outgoingFullness;
}

export function getOutgoingConnectorFullnessFromEndpoint(
  outgoingFullness: RiverFullness,
  connectedToLake: boolean
): RiverFullness {
  if (connectedToLake) return outgoingFullness;
  return getInteriorSourceFullnessForOutgoingRiver(outgoingFullness);
}
