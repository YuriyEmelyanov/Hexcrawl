export type RiverFullness = 1 | 2 | 3 | 4 | 5;

// Connector sectors that enter a region through an outgoing boundary keep the
// endpoint fullness.
export function getOutgoingConnectorFullnessFromEndpoint(
  outgoingFullness: RiverFullness,
  _connectedToLake: boolean
): RiverFullness {
  return outgoingFullness;
}
