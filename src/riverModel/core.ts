/** Numerical river model. Geometry and the legacy App generator are not adapters yet. */
import type { RiverFullness } from '../riverFullness';
export type Fullness = RiverFullness;
export type NodeKind = 'source' | 'continuation' | 'confluence' | 'lake' | 'sea' | 'open';
export interface RiverNode { id: string; kind: NodeKind; lakeHexCount?: number }
export interface RiverEdge {
  id: string; from: string; to: string; regionId: number; height: 1 | 2 | 3;
  /** A known value is immutable during solving (including an open frontier). */
  fullness?: Fullness;
}
export interface RiverNetwork { nodes: RiverNode[]; edges: RiverEdge[] }
export interface Issue { code: string; rule: string; message: string; nodeId?: string; edgeId?: string }
export type Validation = { valid: boolean; issues: Issue[] };
const VALUES: readonly Fullness[] = [1, 2, 3, 4, 5];
const kinds = new Set(['source', 'continuation', 'confluence', 'lake', 'sea', 'open']);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
export const isFullness = (v: unknown): v is Fullness => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 5;
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** RIV-004/005: a relation, not a direction-specific heuristic. Invalid values produce no solutions. */
export function confluenceOutputs(a: number, b: number): Fullness[] {
  if (!isFullness(a) || !isFullness(b)) return [];
  const m = Math.max(a, b) as Fullness;
  return Math.min(a, b) >= m - 1 && m < 5 ? [m, (m + 1) as Fullness] : [m];
}
export function confluenceInputs(output: number, tributary: number): Fullness[] {
  if (!isFullness(output) || !isFullness(tributary)) return [];
  return VALUES.filter(value => confluenceOutputs(value, tributary).includes(output));
}
/** Minimum *actual* area, never a request that may silently be undersized.
 * Multiple exits of a lake with no inlet are not specified: null means unsupported/invalid.
 */
export function minimumLakeHexes(inputs: readonly number[], outputs: readonly number[]): number | null {
  if (![...inputs, ...outputs].every(isFullness) || !inputs.length && outputs.length !== 1) return null;
  if (!inputs.length) return Math.max(1, outputs[0] - 1);
  return Math.max(1, Math.abs(sum(inputs) - sum(outputs)));
}
export function lakeAllows(inputs: readonly number[], outputs: readonly number[], area: number): boolean {
  const minimum = minimumLakeHexes(inputs, outputs);
  return Number.isSafeInteger(area) && area >= 1 && minimum !== null && area >= minimum;
}

interface Junction { node: RiverNode; incoming: RiverEdge[]; outgoing: RiverEdge[] }
interface Prepared { network: RiverNetwork; junctions: Junction[] }
function prepare(input: unknown, complete: boolean): { prepared?: Prepared; issues: Issue[] } {
  const issues: Issue[] = [];
  const issue = (code: string, rule: string, message: string, at: Partial<Issue> = {}) => issues.push({ code, rule, message, ...at });
  if (!record(input) || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    issue('SHAPE', 'RIV-016', 'Expected node and edge arrays.'); return { issues };
  }
  const nodeIds = new Set<string>(), edgeIds = new Set<string>();
  const regionHeights = new Map<number, number>();
  for (const n of input.nodes) {
    if (!record(n) || !id(n.id) || typeof n.kind !== 'string' || !kinds.has(n.kind)) {
      issue('NODE', 'RIV-016', 'Invalid node.'); continue;
    }
    if (nodeIds.has(n.id)) issue('DUPLICATE_NODE', 'RIV-016', 'Duplicate node id.', { nodeId: n.id });
    nodeIds.add(n.id);
    if (n.kind === 'lake' && (!Number.isSafeInteger(n.lakeHexCount) || Number(n.lakeHexCount) < 1))
      issue('LAKE_AREA', 'RIV-011', 'Lake area must be a positive integer.', { nodeId: n.id });
  }
  for (const e of input.edges) {
    if (!record(e) || !id(e.id) || !id(e.from) || !id(e.to)) { issue('EDGE', 'RIV-016', 'Invalid edge.'); continue; }
    if (edgeIds.has(e.id)) issue('DUPLICATE_EDGE', 'RIV-016', 'Duplicate edge id.', { edgeId: e.id });
    edgeIds.add(e.id);
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to) || e.from === e.to)
      issue('ENDPOINT', 'RIV-016', 'Missing or identical endpoint nodes.', { edgeId: e.id });
    if (!Number.isSafeInteger(e.regionId) || Number(e.regionId) < 1 || ![1, 2, 3].includes(Number(e.height)) || typeof e.height !== 'number')
      issue('REGION', 'RIV-003', 'Each sector needs a region id and numeric height 1–3.', { edgeId: e.id });
    if (typeof e.regionId === 'number' && typeof e.height === 'number') {
      if (regionHeights.has(e.regionId) && regionHeights.get(e.regionId) !== e.height)
        issue('REGION_HEIGHT', 'RIV-003', 'Conflicting heights for the same region.', { edgeId: e.id });
      regionHeights.set(e.regionId, e.height);
    }
    if ((complete || e.fullness !== undefined) && !isFullness(e.fullness))
      issue('FULLNESS', 'RIV-001', 'Fullness must be an integer from 1 to 5.', { edgeId: e.id });
  }
  if (issues.length) return { issues };
  const network = input as unknown as RiverNetwork;
  const junctions = network.nodes.map(node => ({ node,
    incoming: network.edges.filter(e => e.to === node.id), outgoing: network.edges.filter(e => e.from === node.id) }));
  for (const j of junctions) {
    const a = j.incoming.length, b = j.outgoing.length;
    const valid = j.node.kind === 'source' ? a === 0 && b === 1
      : j.node.kind === 'continuation' ? a === 1 && b === 1
      : j.node.kind === 'confluence' ? a === 2 && b === 1
      : j.node.kind === 'sea' ? a >= 1 && b === 0
      : j.node.kind === 'open' ? a + b === 1
      : a + b > 0 && (a > 0 || b === 1);
    if (!valid) issue('DEGREE', j.node.kind === 'lake' ? 'RIV-018' : 'RIV-006',
      'Invalid degree (source lake with multiple exits is not specified).', { nodeId: j.node.id });
  }
  // A directed cycle cannot be interpreted as an upstream/downstream river network.
  const degree = new Map(junctions.map(j => [j.node.id, j.incoming.length]));
  const next = new Map(junctions.map(j => [j.node.id, j.outgoing]));
  const queue = junctions.filter(j => !j.incoming.length).map(j => j.node.id);
  for (let i = 0; i < queue.length; i++) for (const e of next.get(queue[i])!) {
    degree.set(e.to, degree.get(e.to)! - 1); if (!degree.get(e.to)) queue.push(e.to);
  }
  if (queue.length !== network.nodes.length) issue('CYCLE', 'RIV-016', 'Directed river cycles are unsupported.');
  return issues.length ? { issues } : { prepared: { network, junctions }, issues };
}
function allows(j: Junction, inputs: number[], outputs: number[]): boolean {
  switch (j.node.kind) {
    case 'source': return outputs[0] === 1;
    case 'continuation': return inputs[0] === outputs[0];
    case 'confluence': return confluenceOutputs(inputs[0], inputs[1]).includes(outputs[0] as Fullness);
    case 'lake': return lakeAllows(inputs, outputs, j.node.lakeHexCount!);
    default: return true;
  }
}
function ruleFor(j: Junction): string {
  return j.node.kind === 'source' ? 'RIV-007' : j.node.kind === 'continuation' ? 'RIV-002'
    : j.node.kind === 'confluence' ? 'RIV-005' : !j.incoming.length ? 'RIV-008'
    : !j.outgoing.length ? 'RIV-010' : 'RIV-009/RIV-018';
}
/** Accepts unknown data: TypeScript annotations never substitute for runtime validation. */
export function validateRiverNetwork(input: unknown): Validation {
  const { prepared, issues } = prepare(input, true);
  if (prepared) for (const j of prepared.junctions) {
    const ins = j.incoming.map(e => e.fullness!), outs = j.outgoing.map(e => e.fullness!);
    if (!allows(j, ins, outs)) issues.push({ code: 'FLOW', rule: ruleFor(j), nodeId: j.node.id,
      message: `Incompatible flow: [${ins}] -> [${outs}].` + (j.node.kind === 'lake'
        ? ` Actual area ${j.node.lakeHexCount}; minimum ${minimumLakeHexes(ins, outs)}.` : '') });
  }
  return { valid: !issues.length, issues };
}

type Domains = Map<string, Fullness[]>;
export type SolveResult =
  | { status: 'solved'; fullness: Record<string, Fullness>; score: readonly number[]; states: number }
  | { status: 'invalid'; issues: Issue[] }
  | { status: 'unsatisfiable'; issues: Issue[]; states: number }
  | { status: 'limit'; states: number };

// Exact reachable sums, rather than min/max intervals that lose holes in domains.
function reachable(terms: number[][]): Set<number> {
  let sums = new Set([0]);
  for (const term of terms) sums = new Set([...sums].flatMap(s => term.map(v => s + v)));
  return sums;
}
function supported(j: Junction, domains: Domains, edgeId: string, value: Fullness): boolean {
  if (j.node.kind === 'open' || j.node.kind === 'sea') return true;
  const edges = [...j.incoming, ...j.outgoing];
  const choices = edges.map(e => e.id === edgeId ? [value] : domains.get(e.id)!);
  if (j.node.kind === 'lake' && j.incoming.length) {
    const terms = choices.map((d, i) => d.map(v => i < j.incoming.length ? v : -v));
    return [...reachable(terms)].some(balance => Math.abs(balance) <= j.node.lakeHexCount!);
  }
  const tuple: number[] = [];
  function visit(i: number): boolean {
    if (i === choices.length) return allows(j, tuple.slice(0, j.incoming.length), tuple.slice(j.incoming.length));
    for (const f of choices[i]) { tuple[i] = f; if (visit(i + 1)) return true; }
    return false;
  }
  return visit(0);
}
function propagate(junctions: Junction[], domains: Domains): Junction | undefined {
  let changed = true;
  while (changed) {
    changed = false;
    for (const j of junctions) for (const e of [...j.incoming, ...j.outgoing]) {
      const old = domains.get(e.id)!;
      const filtered = old.filter(v => supported(j, domains, e.id, v));
      if (!filtered.length) return j;
      if (filtered.length < old.length) { domains.set(e.id, filtered); changed = true; }
    }
  }
  return undefined;
}
function preference(p: Prepared, d: Domains): number[] {
  let growthCount = 0, heightDistance = 0;
  for (const j of p.junctions) if (j.node.kind === 'confluence' && j.outgoing[0].height === 1) {
    const [a, b] = j.incoming.map(e => d.get(e.id)![0]);
    if (d.get(j.outgoing[0].id)![0] > Math.max(a, b)) growthCount++;
  }
  for (const e of p.network.edges) {
    const f = d.get(e.id)![0];
    heightDistance += e.height === 1 ? Math.max(0, 3 - f) : Math.abs(f - (e.height === 2 ? 2 : 1));
  }
  return [-growthCount, heightDistance];
}
const compare = (a: readonly number[], b: readonly number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};
/** Exact bounded search. 'limit' is not 'unsatisfiable' and never commits a partial answer.
 * Equal scores use canonical edge-id/value order; no unseeded randomness or input mutation.
 */
export function solveRiverNetwork(input: unknown, options: { maxStates?: number } = {}): SolveResult {
  const { prepared, issues } = prepare(input, false);
  if (!prepared) return { status: 'invalid', issues };
  const maxStates = options.maxStates ?? 50000;
  if (!Number.isSafeInteger(maxStates) || maxStates < 1) return { status: 'invalid', issues: [
    { code: 'BUDGET', rule: 'RIV-016', message: 'maxStates must be a positive integer.' }] };
  const p = prepared;
  const edges = [...p.network.edges].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const junctions = [...p.junctions].sort((a, b) => a.node.id < b.node.id ? -1 : a.node.id > b.node.id ? 1 : 0);
  const initial: Domains = new Map(edges.map(e => [e.id, e.fullness === undefined ? [...VALUES] : [e.fullness]]));
  let states = 0, exceeded = false;
  let best: { domains: Domains; score: number[]; tie: number[] } | undefined;
  let conflict: Junction | undefined;
  function search(d: Domains): void {
    if (exceeded) return;
    if (states >= maxStates) { exceeded = true; return; }
    states++;
    const failure = propagate(junctions, d);
    if (failure) { conflict = failure; return; }
    const undecided = edges.filter(e => d.get(e.id)!.length > 1)
      .sort((a, b) => d.get(a.id)!.length - d.get(b.id)!.length);
    if (!undecided.length) {
      const score = preference(p, d), tie = edges.map(e => d.get(e.id)![0]);
      if (!best || compare(score, best.score) < 0 || compare(score, best.score) === 0 && compare(tie, best.tie) < 0)
        best = { domains: d, score, tie };
      return;
    }
    const e = undecided[0];
    for (const value of d.get(e.id)!) {
      const next = new Map(d); next.set(e.id, [value]); search(next);
      if (exceeded) return;
    }
  }
  search(initial);
  if (exceeded) return { status: 'limit', states };
  if (!best) return { status: 'unsatisfiable', states, issues: [{ code: 'NO_SOLUTION',
    rule: conflict ? ruleFor(conflict) : 'RIV-016', nodeId: conflict?.node.id,
    message: 'No assignment satisfies the fixed values and node rules.' }] };
  return { status: 'solved', states, score: best.score,
    fullness: Object.fromEntries(edges.map(e => [e.id, best!.domains.get(e.id)![0]])) };
}
