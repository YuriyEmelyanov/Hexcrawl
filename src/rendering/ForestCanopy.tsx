import {memo,useMemo} from 'react';
import {buildForestGeometry,type ForestCell} from './forestGeometry';
import {FOREST_EDGE,FOREST_GROUND,FOREST_PALETTE,forestFamily} from './forestStyle';
const hexPoints=(c:ForestCell,r:number)=>Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return `${c.x+r*Math.cos(a)},${c.y+r*Math.sin(a)}`;}).join(' ');
function ForestCanopyImpl({cells,radius,seed,width,height}:{cells:ForestCell[];radius:number;seed:number;width:number;height:number}){
 const geometry=useMemo(()=>buildForestGeometry(cells,radius,seed),[cells,radius,seed]);
 const islands=geometry.woodlands.filter(p=>p.mode==='islands'),clearings=geometry.woodlands.filter(p=>p.mode==='clearings');
 const canopy=geometry.canopy.join('');
 if(!canopy&&!islands.length)return null;
 return <g className="forest-canopy-layer" pointerEvents="none">
  <defs>
   <clipPath id="forest-canopy-clip"><path d={canopy} clipRule="evenodd"/></clipPath>
   <filter id="forest-colour-blend" filterUnits="userSpaceOnUse" x={-radius*2} y={-radius*2} width={width+radius*4} height={height+radius*4} colorInterpolationFilters="sRGB">
    <feGaussianBlur stdDeviation={radius*.34}/><feComponentTransfer><feFuncA type="linear" slope={0} intercept={1}/></feComponentTransfer>
   </filter>
  </defs>
  <g clipPath="url(#forest-canopy-clip)"><g filter="url(#forest-colour-blend)">
   <rect x={-radius*2} y={-radius*2} width={width+radius*4} height={height+radius*4} fill={FOREST_PALETTE.deciduous}/>
   {cells.map(c=><polygon key={`${c.q},${c.r}`} points={hexPoints(c,radius)} fill={FOREST_PALETTE[forestFamily(c.biome)!]} stroke={FOREST_PALETTE[forestFamily(c.biome)!]} strokeWidth={radius*.4}/>)}
  </g></g>
  <path data-forest-shape="dense" d={canopy} fill="none" stroke={FOREST_EDGE} strokeWidth={radius*.035} strokeLinejoin="round"/>
  {islands.map(p=><g key={p.key} data-woodland-key={p.key} data-woodland-mode={p.mode} data-composition={p.composition} data-rotation={p.rotation}>
   {p.paths.map((d,i)=><path key={i} d={d} fill={FOREST_PALETTE[forestFamily(p.cell.biome)!]} stroke={FOREST_EDGE} strokeWidth={radius*.035} strokeLinejoin="round"/>)}
  </g>)}
  {clearings.map(p=><g key={p.key} data-woodland-key={p.key} data-woodland-mode={p.mode} data-composition={p.composition} data-rotation={p.rotation}>
   {p.paths.map((d,i)=><path key={i} d={d} fill={FOREST_GROUND} stroke={FOREST_EDGE} strokeWidth={radius*.035} strokeLinejoin="round"/>)}
  </g>)}
 </g>;
}
export const ForestCanopy=memo(ForestCanopyImpl);
