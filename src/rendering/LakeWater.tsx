import { useMemo } from 'react';
import { lakeShorePath, WATER_PALETTE, type LakeCell } from './terrainStyle';

export function LakeWater({ cells, radius, points }: { cells: LakeCell[]; radius: number; points: (x:number,y:number,r:number)=>string }) {
  const shore = useMemo(() => lakeShorePath(cells, radius), [cells, radius]);
  if (!cells.length) return null;
  const minX=Math.min(...cells.map(c=>c.x))-3*radius;
  const minY=Math.min(...cells.map(c=>c.y))-3*radius;
  const width=Math.max(...cells.map(c=>c.x))-minX+3*radius;
  const height=Math.max(...cells.map(c=>c.y))-minY+3*radius;
  // Blur one shoreline colour field, just like the land colour layer. No
  // nested offset bands: their hexagonal medial axes produced visible stars.
  return <g className="lake-water-layer" pointerEvents="none">
    <defs>
      <clipPath id="lake-water-clip">{cells.map(c => <polygon key={`${c.q},${c.r}`} points={points(c.x,c.y,radius)} />)}</clipPath>
      <filter id="lake-water-blend" filterUnits="userSpaceOnUse" x={minX} y={minY} width={width} height={height} colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={radius*0.55} />
      </filter>
    </defs>
    <g clipPath="url(#lake-water-clip)">
      {cells.map(c => <polygon key={`${c.q},${c.r}`} points={points(c.x,c.y,radius)} fill={WATER_PALETTE.deep} stroke={WATER_PALETTE.deep} strokeWidth={0.5} />)}
      <path d={shore} fill="none" stroke={WATER_PALETTE.river} strokeWidth={radius*1.6} strokeLinecap="round" strokeLinejoin="round" filter="url(#lake-water-blend)" />
    </g>
  </g>;
}
