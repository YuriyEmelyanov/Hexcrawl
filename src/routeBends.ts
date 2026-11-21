import type {WorldPoint} from './detailGrid';

type Point = WorldPoint;
export type DisplayRoute = {
  key: string;
  routeId: number;
  points: readonly Point[];
  /** Fixed source geometry, e.g. the approach across a bank or a masked POI. */
  fixed?: boolean;
  trim?: number;
};
type Arm = {route: DisplayRoute; index: number; next: Point};
const pointKey = (p: Point) => Math.round(p.x * 1e5) + ',' + Math.round(p.y * 1e5);
const mix = (a: Point, b: Point, t: number) => ({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t});
type Corner = {first: Arm; last: Arm; samples: Point[]};

/** Build one quadratic at each eligible junction. Split it halfway between source
 * edges so painting and picking retain both original identities and widths. */
export function roundedRoutes(routes: readonly DisplayRoute[], pins: readonly Point[] = []) {
  const pinned = new Set(pins.map(pointKey));
  const nodes = new Map<string, Arm[]>();
  function add(p: Point, arm: Arm) {
    const key = pointKey(p);
    const arms = nodes.get(key);
    if (arms) arms.push(arm);
    else nodes.set(key, [arm]);
  }
  for (const route of routes) {
    route.points.forEach((p, index) => {
      if (index > 0) add(p, {route,index,next:route.points[index-1]});
      if (index+1 < route.points.length) add(p, {route,index,next:route.points[index+1]});
    });
  }
  const corners = new Map<string, Corner>();
  for (const [key, arms] of nodes) {
    if (arms.length < 2 || pinned.has(key) || arms.some(a => a.route.fixed)) continue;
    const groups = new Map<number, Arm[]>();
    for (const arm of arms) {
      const group = groups.get(arm.route.routeId);
      if (group) group.push(arm);
      else groups.set(arm.route.routeId, [arm]);
    }
    const continuous = [...groups.values()].filter(g => g.length === 2);
    if (continuous.length !== 1) continue;
    const [first,last] = continuous[0], p = first.route.points[first.index];
    const a = mix(p,first.next,first.route.trim ?? .38), b = mix(p,last.next,last.route.trim ?? .38);
    const ax = a.x-p.x, ay = a.y-p.y, bx = b.x-p.x, by = b.y-p.y;
    if (Math.abs(ax*by-ay*bx) < 1e-9) continue;
    const samples = Array.from({length:9}, (_,i) => {
      const t=i/8;
      return mix(mix(a,p,t),mix(p,b,t),t);
    });
    corners.set(key,{first,last,samples});
  }
  const edge = (arm: Arm, route: DisplayRoute, index: number, next: Point) =>
    arm.route === route && arm.index === index && arm.next === next;
  const display = new Map<string, readonly Point[]>();
  for (const route of routes) {
    const points: Point[] = [];
    for (let i=0; i<route.points.length; i++) {
      const p = route.points[i], corner = corners.get(pointKey(p));
      if (!corner) { points.push(p); continue; }
      const {first,last,samples} = corner;
      const incoming = route.points[i-1], outgoing = route.points[i+1];
      // A side branch joins the same midpoint, then regains its original alignment.
      const half = (next: Point) => {
        if (edge(first,route,i,next)) return samples.slice(0,5);
        if (edge(last,route,i,next)) return samples.slice(4).reverse();
        return [mix(p,next,.38),samples[4]];
      };
      if (incoming) points.push(...half(incoming));
      if (outgoing) points.push(...half(outgoing).reverse().slice(incoming ? 1 : 0));
    }
    display.set(route.key,points);
  }
  return display;
}

export const svgPoints = (points: readonly Point[]) => points.map(p => p.x+','+p.y).join(' ');
export const ends = (s: {x1:number;y1:number;x2:number;y2:number}) =>
  [{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}];
