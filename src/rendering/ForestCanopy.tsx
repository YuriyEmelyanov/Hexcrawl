import {memo,useMemo} from 'react';
import {buildForestGeometry,type ForestCell} from './forestGeometry';
import {forestWaterBoundary} from './forestWaterBoundary';
import type {LakeShape,WaterSegment} from './lakeGeometry';
import {FOREST_EDGE,FOREST_PALETTE,forestFamily} from './forestStyle';
const hexPoints=(c:ForestCell,r:number)=>Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return `${c.x+r*Math.cos(a)},${c.y+r*Math.sin(a)}`;}).join(' ');
const noRivers:WaterSegment[]=[],noLakes:LakeShape[]=[];
function ForestCanopyImpl({cells,radius,seed,width,height,waterSegments=noRivers,lakes=noLakes}:{cells:ForestCell[];radius:number;seed:number;width:number;height:number;waterSegments?:WaterSegment[];lakes?:LakeShape[]}){
 const geometry=useMemo(()=>buildForestGeometry(cells,radius,seed),[cells,radius,seed]);
 const banks=useMemo(()=>forestWaterBoundary(cells,radius,waterSegments,lakes),[cells,radius,waterSegments,lakes]);
 const islands=geometry.woodlands.filter(p=>p.mode==='islands'),clearings=geometry.woodlands.filter(p=>p.mode==='clearings');
 const canopy=geometry.canopy.join(''),extra=[...geometry.bridges,...banks.banks];
 if(!canopy&&!islands.length)return null;
 const bounds={x:-radius*2,y:-radius*2,width:width+radius*4,height:height+radius*4};
 return <g className="forest-canopy-layer" pointerEvents="none">
  <defs>
   {/* Separate children form a union, while dense loops retain their field holes. */}
   <clipPath id="forest-canopy-clip"><path data-forest-shape="dense" d={canopy} clipRule="evenodd"/>{islands.flatMap(p=>p.paths).map((d,i)=><path key={i} d={d}/>)}{extra.map((d,i)=><path key={`join-${i}`} d={d}/>)}</clipPath>
   {islands.map(p=><g key={p.key} data-woodland-key={p.key} data-woodland-mode={p.mode} data-composition={p.composition} data-rotation={p.rotation}>{p.paths.map((d,i)=><path key={i} d={d}/>)}</g>)}
   <mask id="forest-clearings-mask" maskUnits="userSpaceOnUse" {...bounds}><rect {...bounds} fill="white"/>{clearings.map(p=><g key={p.key} data-woodland-key={p.key} data-woodland-mode={p.mode} data-composition={p.composition} data-rotation={p.rotation}>{p.paths.map((d,i)=><path key={i} d={d} fill="black"/>)}</g>)}{geometry.clearingBridges.map((d,i)=><path key={i} d={d} fill="black"/>)}</mask>
   <filter id="forest-union-outline" filterUnits="userSpaceOnUse" {...bounds} colorInterpolationFilters="sRGB">
    <feMorphology in="SourceAlpha" operator="dilate" radius={radius*.0175} result="expanded"/>
    <feFlood floodColor={FOREST_EDGE} result="ink"/><feComposite in="ink" in2="expanded" operator="in"/>
   </filter>
   <mask id="forest-water-bank-mask" maskUnits="userSpaceOnUse" {...bounds}><rect {...bounds} fill="white"/>{banks.cuts.map((d,i)=><path key={i} d={d} fill="black"/>)}</mask>
   <filter id="forest-colour-blend" filterUnits="userSpaceOnUse" {...bounds} colorInterpolationFilters="sRGB">
    <feGaussianBlur stdDeviation={radius*.34}/><feComponentTransfer><feFuncA type="linear" slope={0} intercept={1}/></feComponentTransfer>
   </filter>
  </defs>
  <g mask="url(#forest-water-bank-mask)">
   {/* Outline the completed silhouette once, without changing the source curves. */}
   <g filter="url(#forest-union-outline)"><g mask="url(#forest-clearings-mask)" clipPath="url(#forest-canopy-clip)"><rect {...bounds} fill={FOREST_EDGE}/></g></g>
   <g mask="url(#forest-clearings-mask)" clipPath="url(#forest-canopy-clip)"><g filter="url(#forest-colour-blend)">
    <rect {...bounds} fill={FOREST_PALETTE.deciduous}/>
    {cells.map(c=><polygon key={`${c.q},${c.r}`} points={hexPoints(c,radius)} fill={FOREST_PALETTE[forestFamily(c.biome)!]} stroke={FOREST_PALETTE[forestFamily(c.biome)!]} strokeWidth={radius*.4}/>)}
   </g></g>
  </g>
 </g>;
}
export const ForestCanopy=memo(ForestCanopyImpl);
