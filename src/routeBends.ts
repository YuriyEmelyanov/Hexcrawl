import {detailCrossingPoint} from './detailGeography.ts';
import type {WorldPoint} from './detailGrid';
import {bendNodeKey as pointKey} from './routeClearance.ts';

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
const mix = (a: Point, b: Point, t: number) => ({x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t});
type Corner = {first: Arm; last: Arm; samples: Point[]; scale:number};

/** Build one quadratic at each eligible junction. Split it halfway between source
 * edges so painting and picking retain both original identities and widths. */
export function roundedRoutes(routes: readonly DisplayRoute[], pins: readonly Point[], clearance: (p:Point,radius:number)=>number, options: {through?: readonly Point[]; halfSteps?: number; joinRouteEnds?: boolean} = {}) {
  const anchored = new Set(options.through?.map(pointKey));
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
    // Overlapping source spans must follow the same line for every owner.
    if (arms.length > 2 && new Set(arms.map(arm => pointKey(arm.next))).size < arms.length) continue;
    const groups = new Map<number, Arm[]>();
    for (const arm of arms) {
      const group = groups.get(arm.route.routeId);
      if (group) group.push(arm);
      else groups.set(arm.route.routeId, [arm]);
    }
    const continuous = [...groups.values()].filter(g => g.length === 2);
    if (continuous.length !== 1 && !(options.joinRouteEnds && arms.length === 2)) continue;
    const [first,last] = continuous[0] ?? arms, p = first.route.points[first.index];
    const radius=Math.max(...arms.map(arm=>Math.hypot(arm.next.x-p.x,arm.next.y-p.y)*(arm.route.trim??.38)));
    if (radius < 1e-8) continue;
    const scale=clearance(p,radius);
    if (scale < .02) continue;
    const a = mix(p,first.next,(first.route.trim ?? .38)*scale), b = mix(p,last.next,(last.route.trim ?? .38)*scale);
    const ax = a.x-p.x, ay = a.y-p.y, bx = b.x-p.x, by = b.y-p.y;
    if (Math.abs(ax*by-ay*bx) < 1e-9) continue;
    const passesThroughVertex = anchored.has(key);
    const halfSteps = options.halfSteps ?? 4;
    let sample = (t:number) => mix(mix(a,p,t),mix(p,b,t),t);
    // A continuous river can turn at a regional seam, but must pass through
    // its accepted vertex. Join two cubic halves there with a shared tangent.
    if (passesThroughVertex && arms.length !== 2) continue;
    if (passesThroughVertex) {
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      const tx = bx/lb - ax/la, ty = by/lb - ay/la;
      const handle = Math.min(la, lb) / (3 * Math.hypot(tx, ty));
      const left = {x:p.x-tx*handle, y:p.y-ty*handle};
      const right = {x:p.x+tx*handle, y:p.y+ty*handle};
      const cubic = (a:Point, b:Point, c:Point, d:Point, t:number) =>
        mix(mix(mix(a,b,t),mix(b,c,t),t),mix(mix(b,c,t),mix(c,d,t),t),t);
      sample = t => t <= 0.5 ? cubic(a,mix(a,p,1/3),left,p,2*t)
        : cubic(p,right,mix(b,p,1/3),b,2*t-1);
    }
    const samples = Array.from({length:2*halfSteps+1}, (_,i) => sample(i/(2*halfSteps)));
    // A side road that would cross the main curve before reaching its join
    // keeps the original junction. All incident source IDs still meet there.
    const sideArms=arms.filter(arm=>arm!==first && arm!==last);
    const unsafe=sideArms.some(arm=>{
      const start=mix(p,arm.next,(arm.route.trim??.38)*scale), end=samples[halfSteps];
      return samples.some((b,i)=>i!==0 && i!==halfSteps && i!==halfSteps+1 &&
        detailCrossingPoint({from:start,to:end},{from:samples[i-1],to:b})!==null);
    });
    if (!unsafe) corners.set(key,{first,last,samples,scale});
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
      const mid = (samples.length - 1) / 2;
      const incoming = route.points[i-1], outgoing = route.points[i+1];
      // A side branch joins the same midpoint, then regains its original alignment.
      const half = (next: Point) => {
        if (edge(first,route,i,next)) return samples.slice(0,mid+1);
        if (edge(last,route,i,next)) return samples.slice(mid).reverse();
        return [mix(p,next,(route.trim??.38)*corner.scale),samples[mid]];
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
