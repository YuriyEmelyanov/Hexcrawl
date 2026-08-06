export type RiverFullness = 1 | 2 | 3 | 4 | 5;

// Connector sectors that enter a region through an outgoing boundary keep the
// endpoint fullness.
export function getOutgoingConnectorFullnessFromEndpoint(outgoingFullness: RiverFullness): RiverFullness {
  return outgoingFullness;
}

export function shouldReduceMainRiverUpstreamBeforeConfluence(
  heightLevel: number,
  tributaryFullnesses: Iterable<RiverFullness>
): boolean {
  const fullnesses = Array.from(tributaryFullnesses);
  if (heightLevel === 2) return fullnesses.length > 0;
  return heightLevel === 1 && fullnesses.includes(1);
}
