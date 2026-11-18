import catalog from './engravingCatalog.json';

export type TerrainKind = keyof typeof catalog;
export function engravingFor(id: string) {
  return Object.prototype.hasOwnProperty.call(catalog, id) ? catalog[id as TerrainKind] : undefined;
}

export function Engraving({ id, x, y, radius, rotated }: {
  id: TerrainKind; x: number; y: number; radius: number; rotated: boolean;
}) {
  const { size, bounds } = catalog[id];
  const [left, top, right, bottom] = bounds;
  const scale = (rotated ? Math.sqrt(3) / 2 : 1) * radius / (bottom - top);
  return <image className="terrain-engraving" data-engraving={id}
    href={`/terrain/engravings/${id}.png`}
    x={x - (left + right) * scale / 2} y={y - (top + bottom) * scale / 2}
    width={size[0] * scale} height={size[1] * scale}
    transform={rotated ? `rotate(-90 ${x} ${y})` : undefined}
    pointerEvents="none" />;
}
