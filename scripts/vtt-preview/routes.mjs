import {HEX_SIZE, getHexPolygonPoints, toPixel} from '../../src/rendering/baseHexArtwork.ts';

const kinds = new Set(['river', 'road', 'trail']);
const epsilon = 1e-7;
const samePoint = ([ax, ay], [bx, by]) => Math.abs(ax - bx) < epsilon && Math.abs(ay - by) < epsilon;

export function readRoutes(routes) {
  if (!Array.isArray(routes)) throw new Error('Invalid routes');
  return routes.map(route => {
    const {kind, width, points, faded, solid} = route;
    if (!kinds.has(kind) || !Number.isFinite(width) || width <= 0 || width > HEX_SIZE ||
        !Array.isArray(points) || points.length < 2 || !points.every(point =>
          Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) {
      throw new Error('Invalid route stroke');
    }
    return {kind, width, points, faded: faded === true, solid: solid === true};
  });
}

// Intersect each segment with the six half planes of the current hex.
function clipSegment(a, b, polygon) {
  let start = 0, end = 1;
  for (let i = 0; i < polygon.length; i++) {
    const from = polygon[i], to = polygon[(i + 1) % polygon.length];
    const dx = to.x - from.x, dy = to.y - from.y;
    const da = dx * (a[1] - from.y) - dy * (a[0] - from.x);
    const db = dx * (b[1] - from.y) - dy * (b[0] - from.x);
    if (da < -epsilon && db < -epsilon) return null;
    if (da < -epsilon) start = Math.max(start, da / (da - db));
    if (db < -epsilon) end = Math.min(end, da / (da - db));
    if (end <= start) return null;
  }
  const pointAt = t => t === 0 ? a : t === 1 ? b :
    [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const first = pointAt(start), last = pointAt(end);
  return samePoint(first, last) ? null : [first, last];
}

export function routesAt(routes, {q, r}) {
  const {x, y} = toPixel(q, r);
  const polygon = getHexPolygonPoints(x, y, HEX_SIZE);
  const visible = [];
  for (const route of routes) {
    let current = null;
    for (let i = 1; i < route.points.length; i++) {
      const section = clipSegment(route.points[i - 1], route.points[i], polygon);
      if (!section) {
        current = null;
        continue;
      }
      const [first, last] = section;
      if (current && samePoint(current.at(-1), first)) {
        current.push(last);
      } else {
        current = [first, last];
        visible.push({...route, points: current});
      }
    }
  }
  return visible;
}
