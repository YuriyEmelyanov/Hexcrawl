import { useMemo } from 'react';
import { lakeShorePath, waterAtDepth, WATER_PALETTE, type LakeCell } from './terrainStyle';

export function LakeWater({ cells, radius, points }: { cells: LakeCell[]; radius: number; points: (x:number,y:number,r:number)=>string }) {
  const shore = useMemo(() => lakeShorePath(cells, radius), [cells, radius]);
  if (!cells.length) return null;
  // Nested round strokes describe Euclidean distance to the union shoreline.
  // Clip *after* stroking: no tint can escape into land or islands. Neighbouring
  // lake hexes have no shared shoreline, even when their lake IDs differ.
  const depthWidth = radius * 1.8;
  return <g className="lake-water-layer" pointerEvents="none">
    <defs><clipPath id="lake-water-clip">{cells.map(c => <polygon key={`${c.q},${c.r}`} points={points(c.x,c.y,radius)} />)}</clipPath></defs>
    <g clipPath="url(#lake-water-clip)">
      {cells.map(c => <polygon key={`${c.q},${c.r}`} points={points(c.x,c.y,radius)} fill={WATER_PALETTE.deep} stroke={WATER_PALETTE.deep} strokeWidth={0.5} />)}
      {Array.from({length:48}, (_,i) => {
        const t = (48-i)/48;
        return <path key={i} d={shore} fill="none" stroke={waterAtDepth(Math.max(0,t-1/48))} strokeWidth={2*depthWidth*t} strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </g>
  </g>;
}
