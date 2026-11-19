import { createContext, useContext } from 'react';
import catalog from './engravingCatalog.json';
import { engravingUrl, type TerrainKind } from './engravingAssets';

export const EngravingLoading = createContext<{
  attempts: ReadonlyMap<TerrainKind, number>;
  failed: readonly TerrainKind[];
}>({attempts:new Map(), failed:[]});

export function Engraving({ id, x, y, radius, rotated }: {
  id: TerrainKind; x: number; y: number; radius: number; rotated: boolean;
}) {
  const { size, bounds } = catalog[id];
  const [left, top, right, bottom] = bounds;
  const scale = (rotated ? Math.sqrt(3) / 2 : 1) * radius / (bottom - top);
  const {attempts,failed} = useContext(EngravingLoading);
  const href = engravingUrl(id, attempts.get(id));
  return <image key={href} className="terrain-engraving" data-engraving={id}
    href={href}
    visibility={failed.includes(id) ? 'hidden' : undefined}
    x={x - (left + right) * scale / 2} y={y - (top + bottom) * scale / 2}
    width={size[0] * scale} height={size[1] * scale}
    transform={rotated ? `rotate(-90 ${x} ${y})` : undefined}
    pointerEvents="none" />;
}
