import { useMemo, useRef, memo } from 'react';
import { buildNaturalLakes, createLakeGeometryCache, type LakeShape, type NaturalLakeCell, type WaterSegment } from './lakeGeometry';
import { WATER_PALETTE } from './terrainStyle';

function LakeWaterImpl({cells,radius,seed=0,segments=[],shapes}:{cells:NaturalLakeCell[];radius:number;seed?:number;segments?:WaterSegment[];shapes?:LakeShape[]}){
 const cache=useRef<ReturnType<typeof createLakeGeometryCache>>();
 if(!cache.current)cache.current=createLakeGeometryCache();
 const lakes=useMemo(()=>shapes??buildNaturalLakes(cells,radius,seed,segments,cache.current),[shapes,cells,radius,seed,segments]);
 return <g className="lake-water-layer" pointerEvents="none">{lakes.map(lake=>{
  const id=lake.key,b=lake.bounds;
  const silhouette=<><path d={lake.path} fillRule="evenodd" fill="white"/>{lake.mouths.map(m=><path key={m.key} d={m.path} fill="white"/>)}</>;
  return <g key={id} data-lake-shape={id}>
   <defs>
    <clipPath id={`${id}-shape`}><path d={lake.path} clipRule="evenodd"/>{lake.mouths.map(m=><path key={m.key} d={m.path}/>)}</clipPath>
    <filter id={`${id}-depth-filter`} filterUnits="userSpaceOnUse" x={b.x} y={b.y} width={b.width} height={b.height} colorInterpolationFilters="sRGB">
     <feGaussianBlur stdDeviation={radius*.22}/>
     {/* Continuous shallow band, then an exact constant deep plateau. The
         combined silhouette includes inlets and islands before filtering. */}
     <feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0 0.12 0.42 0.78 1 1"/></feComponentTransfer>
    </filter>
    <mask id={`${id}-depth`} maskUnits="userSpaceOnUse" x={b.x} y={b.y} width={b.width} height={b.height}>
     <g filter={`url(#${id}-depth-filter)`}>{silhouette}</g>
    </mask>
   </defs>
   <g clipPath={`url(#${id}-shape)`}>
    <rect {...b} fill={WATER_PALETTE.river}/>
    <rect {...b} fill={WATER_PALETTE.deep} mask={`url(#${id}-depth)`}/>
   </g>
  </g>;
 })}</g>;
}

// Skip React reconstruction of identical filters and paths during viewport changes.
export const LakeWater=memo(LakeWaterImpl);
