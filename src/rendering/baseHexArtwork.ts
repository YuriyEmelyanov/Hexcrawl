export const HEX_SIZE = 28;
const SQRT3 = Math.sqrt(3);

export function toPixel(q: number, r: number) {
  return {x: HEX_SIZE * SQRT3 * (q + r / 2), y: HEX_SIZE * 1.5 * r};
}

export function getHexPolygonPoints(cx: number, cy: number, size: number) {
  const points: Array<{x: number; y: number}> = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    points.push({x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle)});
  }
  return points;
}

export function hexPoints(cx: number, cy: number, size: number) {
  return getHexPolygonPoints(cx, cy, size).map(({x, y}) => `${x},${y}`).join(' ');
}

export function getHexWidth(size: number) {
  return SQRT3 * size;
}

export function engravingLayout(
  size: readonly number[], bounds: readonly number[],
  x: number, y: number, radius: number, rotated: boolean
) {
  const [left, top, right, bottom] = bounds;
  const scale = (rotated ? SQRT3 / 2 : 1) * radius / (bottom - top);
  return {
    x: x - (left + right) * scale / 2,
    y: y - (top + bottom) * scale / 2,
    width: size[0] * scale,
    height: size[1] * scale,
    ...(rotated ? {transform: `rotate(-90 ${x} ${y})`} : {})
  };
}
