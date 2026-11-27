import {HEX_SIZE, getHexPolygonPoints, toPixel} from '../../src/rendering/baseHexArtwork.ts';

const kinds = new Set(['river', 'road', 'trail', 'rapid', 'rail', 'river-arrow', 'ferry']);
const markKinds = new Set(['bridge', 'ford', 'ferry', 'waterfall']);
const epsilon = 1e-7;
const samePoint = ([ax, ay], [bx, by]) => Math.abs(ax - bx) < epsilon && Math.abs(ay - by) < epsilon;
const finitePoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);

export function readRoutes(routes) {
  if (!Array.isArray(routes)) throw new Error('Invalid routes');
  return routes.map(route => {
    const {kind, width, points, faded, solid, arrowSize, crossing} = route;
    if (!kinds.has(kind) || !Number.isFinite(width) || width <= 0 || width > HEX_SIZE ||
        !Array.isArray(points) || points.length < 2 || !points.every(finitePoint)) {
      throw new Error('Invalid route stroke');
    }
    if ((kind === 'rapid' || kind === 'river-arrow') && points.length !== 2) throw new Error('Invalid river symbol');
    if (kind === 'river-arrow' && (!Number.isFinite(arrowSize) || arrowSize <= 0 || arrowSize > HEX_SIZE)) {
      throw new Error('Invalid river arrow');
    }
    if (kind === 'ferry' && crossing === undefined) throw new Error('Missing ferry anchor');
    if (crossing !== undefined && (!finitePoint(crossing) ||
      !['rail', 'road', 'trail', 'ferry'].includes(kind) || points.some(point => Math.hypot(
        point[0] - crossing[0], point[1] - crossing[1]) > HEX_SIZE))) {
      throw new Error('Invalid crossing artwork');
    }
    return {kind, width, points, faded: faded === true, solid: solid === true,
      ...(crossing ? {crossing} : {}),
      ...(kind === 'river-arrow' ? {arrowSize} : {})};
  });
}

export function readMarks(marks) {
  if (!Array.isArray(marks)) throw new Error('Invalid marks');
  return marks.map(({kind, x, y}) => {
    if (!markKinds.has(kind) || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid map mark');
    return {kind, x, y};
  });
}

function hexPolygon({q, r}) {
  const {x, y} = toPixel(q, r);
  return getHexPolygonPoints(x, y, HEX_SIZE);
}

function edgeSide(from, to, x, y) {
  return (to.x - from.x) * (y - from.y) - (to.y - from.y) * (x - from.x);
}

function containsPoint(hex, x, y) {
  return hex.every((from, i) => edgeSide(from, hex[(i + 1) % hex.length], x, y) >= -epsilon);
}

export function marksAt(marks, position) {
  const hex = hexPolygon(position);
  return marks.filter(({x, y}) => containsPoint(hex, x, y));
}

// Intersect each segment with the six half planes of the current hex.
function clipSegment(a, b, polygon) {
  let start = 0, end = 1;
  for (let i = 0; i < polygon.length; i++) {
    const from = polygon[i], to = polygon[(i + 1) % polygon.length];
    const da = edgeSide(from, to, ...a);
    const db = edgeSide(from, to, ...b);
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

export function routesAt(routes, position, visibleMarks) {
  const polygon = hexPolygon(position);
  const visible = [];
  const crossings = new Set(visibleMarks.filter(mark => mark.kind !== 'waterfall')
    .map(({kind, x, y}) => `${kind}:${x},${y}`));
  for (const route of routes) {
    if (route.crossing) {
      const kind = route.kind === 'rail' ? 'bridge' : route.kind === 'ferry' ? 'ferry' : 'ford';
      if (crossings.has(`${kind}:${route.crossing.join(',')}`)) visible.push(route);
      continue;
    }
    // Short river symbols belong to their anchor on the current hex edge.
    // Their strokes can overlap the adjoining hex, as in the editor.
    if (route.kind === 'rapid' || route.kind === 'river-arrow') {
      const [[x1, y1], [x2, y2]] = route.points;
      if (containsPoint(polygon, (x1 + x2) / 2, (y1 + y2) / 2)) visible.push(route);
      continue;
    }
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
