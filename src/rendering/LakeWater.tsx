import { useMemo, useRef, memo } from 'react';
import { buildNaturalLakes, createLakeGeometryCache, type NaturalLakeCell, type WaterSegment } from './lakeGeometry';
import { WATER_PALETTE } from './terrainStyle';

function LakeWaterImpl({cells,radius,seed=0,segments=[],points}:{cells:NaturalLakeCell[];radius:number;seed?:number;segments?:WaterSegment[];points:(x:number,y:number,r:number)=>string}){
 const cache=useRef<ReturnType<typeof createLakeGeometryCache>>();
 if(!cache.current)cache.current=createLakeGeometryCache();
 const lakes=useMemo(()=>buildNaturalLakes(cells,radius,seed,segments,cache.current),[cells,radius,seed,segments]);
 return <g className="lake-water-layer" pointerEvents="none">{lakes.map(lake=>{
  const id=lake.key,b=lake.bounds;
  const silhouette=<><path d={lake.path} fillRule="evenodd" fill="white"/>{lake.mouths.map(m=><path key={m.key} d={m.path} fill="white"/>)}</>;
  return <g key={id} data-lake-shape={id}>
   <defs>
    <clipPath id={`${id}-hull`}>{lake.cells.map(c=><polygon key={`${c.q},${c.r}`} points={points(c.x,c.y,radius)}/>)}</clipPath>
    <clipPath id={`${id}-shape`}><path d={lake.path} clipRule="evenodd"/>{lake.mouths.map(m=><path key={m.key} d={m.path}/>)}</clipPath>
    <filter id={`${id}-depth-filter`} filterUnits="userSpaceOnUse" x={b.x} y={b.y} width={b.width} height={b.height} colorInterpolationFilters="sRGB">
     <feGaussianBlur stdDeviation={radius*.22}/>
     {/* Continuous shallow band, then an exact constant deep plateau. The
         combined silhouette includes inlets and islands before filtering. */}
     <feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0 0 0 0.12 0.42 0.78 1 1"/></feComponentTransfer>
    </filter>
    <mask id={`${id}-depth`} maskUnits="userSpaceOnUse" x={b.x} y={b.y} width={b.width} height={b.height}>
     <g filter={`url(#${id}-depth-filter)`}><g clipPath={`url(#${id}-hull)`}>{silhouette}</g></g>
    </mask>
   </defs>
   <g clipPath={`url(#${id}-hull)`}><g clipPath={`url(#${id}-shape)`}>
    <rect {...b} fill={WATER_PALETTE.river}/>
    <rect {...b} fill={WATER_PALETTE.deep} mask={`url(#${id}-depth)`}/>
   </g></g>
  </g>;
 })}</g>;
}

// Skip React reconstruction of identical filters and paths during viewport changes.
export const LakeWater=memo(LakeWaterImpl);
