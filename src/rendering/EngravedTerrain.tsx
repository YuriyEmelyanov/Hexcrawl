import { createContext, useContext } from 'react';
import { engravingLayout } from './baseHexArtwork';
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
  const {attempts,failed} = useContext(EngravingLoading);
  const href = engravingUrl(id, attempts.get(id));
  return <image key={href} className="terrain-engraving" data-engraving={id}
    href={href}
    visibility={failed.includes(id) ? 'hidden' : undefined}
    {...engravingLayout(size, bounds, x, y, radius, rotated)}
    pointerEvents="none" />;
}
