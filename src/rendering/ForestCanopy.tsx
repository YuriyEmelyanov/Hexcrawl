import {buildForestTreeMarks} from './forestTreeMarks';
import {memo,useMemo} from 'react';
import {buildForestGeometry,type ForestCell} from './forestGeometry';
import {forestWaterBoundary} from './forestWaterBoundary';
import type {LakeShape,WaterSegment} from './lakeGeometry';
import {forestHash} from './forestGeometry';
import {BIOME_GROUND_COLORS} from './terrainStyle';
import {FOREST_EDGE,FOREST_PALETTE,forestFamily} from './forestStyle';
const hexPoints=(c:ForestCell,r:number)=>Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return `${c.x+r*Math.cos(a)},${c.y+r*Math.sin(a)}`;}).join(' ');
const noRivers:WaterSegment[]=[],noLakes:LakeShape[]=[];
function ForestCanopyImpl({cells,radius,seed,width,height,waterSegments=noRivers,lakes=noLakes}:{cells:ForestCell[];radius:number;seed:number;width:number;height:number;waterSegments?:WaterSegment[];lakes?:LakeShape[]}){
 const trees=useMemo(()=>buildForestTreeMarks(cells,radius,seed),[cells,radius,seed]);
 const geometry=useMemo(()=>buildForestGeometry(cells,radius,seed),[cells,radius,seed]);
 const banks=useMemo(()=>forestWaterBoundary(cells,radius,waterSegments,lakes),[cells,radius,waterSegments,lakes]);
 const islands=geometry.woodlands.filter(p=>p.mode==='islands'),clearings=geometry.woodlands.filter(p=>p.mode==='clearings');
 const canopy=geometry.canopy.join(''),extra=[...geometry.bridges,...banks.banks];
 const trunks=useMemo(()=>{
  const lines:string[]=[];
  const step=radius*.07;
  for(let x=0;x<width;x+=step){
   const h=forestHash(`trunk:${Math.round(x/step)}`,seed);
   if(h%7===0)continue;
   const px=x+(h%100)/100*step*.35;
   lines.push(`M${px.toFixed(2)},${-radius*2}V${height+radius*2}`);
  }
  return lines.join('');
 },[radius,width,height,seed]);
 if(!canopy&&!islands.length)return null;
 const bounds={x:-radius*2,y:-radius*2,width:width+radius*4,height:height+radius*4};
 return <g className="forest-canopy-layer" pointerEvents="none">
  <defs>
   <mask id="forest-land-without-water" maskUnits="userSpaceOnUse" {...bounds}><rect {...bounds} fill="white"/>{lakes.map(l=><g key={l.key}><path d={l.path} fill="black"/>{l.mouths.map(m=><path key={m.key} d={m.path} fill="black"/>)}</g>)}{waterSegments.map(w=><path key={w.key} d={`M${w.x1},${w.y1}L${w.x2},${w.y2}`} fill="none" stroke="black" strokeWidth={w.width} strokeLinecap="round"/>)}</mask>
   <mask id="forest-crown-water-setback" maskUnits="userSpaceOnUse" {...bounds}><rect {...bounds} fill="white"/>{lakes.map(l=><g key={l.key}><path d={l.path} fill="black" stroke="black" strokeWidth={radius*.15} strokeLinejoin="round"/>{l.mouths.map(m=><path key={m.key} d={m.path} fill="black" stroke="black" strokeWidth={radius*.15} strokeLinejoin="round"/>)}</g>)}{waterSegments.map(w=><path key={w.key} d={`M${w.x1},${w.y1}L${w.x2},${w.y2}`} fill="none" stroke="black" strokeWidth={w.width+radius*.15} strokeLinecap="round"/>)}</mask>
   <mask id="forest-water-expanded-area" maskUnits="userSpaceOnUse" {...bounds}>{lakes.map(l=><g key={l.key}><path d={l.path} fill="white" stroke="white" strokeWidth={radius*.15} strokeLinejoin="round"/>{l.mouths.map(m=><path key={m.key} d={m.path} fill="white" stroke="white" strokeWidth={radius*.15} strokeLinejoin="round"/>)}</g>)}{waterSegments.map(w=><path key={w.key} d={`M${w.x1},${w.y1}L${w.x2},${w.y2}`} fill="none" stroke="white" strokeWidth={w.width+radius*.15} strokeLinecap="round"/>)}</mask>
   <mask id="forest-shore-effect-mask" maskUnits="userSpaceOnUse" {...bounds}>{lakes.map(l=><g key={l.key}><path d={l.path} fill="white" stroke="white" strokeWidth={radius*.44}/>{l.mouths.map(m=><path key={m.key} d={m.path} fill="white" stroke="white" strokeWidth={radius*.44}/>)}</g>)}{waterSegments.map(w=><path key={w.key} d={`M${w.x1},${w.y1}L${w.x2},${w.y2}`} fill="none" stroke="white" strokeWidth={w.width+radius*.44} strokeLinecap="round"/>)}</mask>
   <g id="forest-shore-land" mask="url(#forest-crown-water-setback)"><use href="#forest-final-silhouette"/></g>
   <mask id="forest-shore-trunks-mask" maskUnits="userSpaceOnUse" {...bounds}><use href="#forest-shore-land" filter="url(#forest-bottom-edge)"/></mask>
   <mask id="forest-shore-ground-clip" maskUnits="userSpaceOnUse" {...bounds}><use href="#forest-final-silhouette"/></mask>
   <g id="forest-shore-ground" mask="url(#forest-shore-ground-clip)"><g mask="url(#forest-land-without-water)"><g mask="url(#forest-water-expanded-area)"><g filter="url(#forest-colour-blend)"><rect {...bounds} fill={BIOME_GROUND_COLORS.plain_deciduous_forest}/>{cells.map(c=><polygon key={`${c.q},${c.r}`} points={hexPoints(c,radius)} fill={BIOME_GROUND_COLORS[c.biome as keyof typeof BIOME_GROUND_COLORS]} stroke={BIOME_GROUND_COLORS[c.biome as keyof typeof BIOME_GROUND_COLORS]} strokeWidth={radius*.4}/>)}</g></g></g></g>
   <path id="forest-trunk-lines" d={trunks} fill="none" stroke="#202319" strokeWidth={radius*.014} strokeLinecap="round"/>
   <filter id="forest-edge-light" filterUnits="userSpaceOnUse" {...bounds} colorInterpolationFilters="sRGB">
    <feOffset in="SourceAlpha" dx={-radius*.11} dy={radius*.13} result="cast"/>
    <feComposite in="cast" in2="SourceAlpha" operator="out" result="outside"/>
    <feFlood floodColor="#192315" floodOpacity=".38" result="shade"/><feComposite in="shade" in2="outside" operator="in" result="shadow"/>
    <feOffset in="SourceAlpha" dx={radius*.035} dy={-radius*.04} result="litShift"/>
    <feComposite in="SourceAlpha" in2="litShift" operator="out" result="innerBand"/>
    <feFlood floodColor="#25361a" floodOpacity=".28" result="innerInk"/><feComposite in="innerInk" in2="innerBand" operator="in" result="innerShade"/>
    <feOffset in="SourceAlpha" dx={radius*.018} dy={-radius*.022} result="lightShift"/>
    <feComposite in="lightShift" in2="SourceAlpha" operator="out" result="lightBand"/>
    <feFlood floodColor="#d0d87b" floodOpacity=".8" result="lightInk"/><feComposite in="lightInk" in2="lightBand" operator="in" result="highlight"/>
    <feMerge><feMergeNode in="shadow"/><feMergeNode in="innerShade"/><feMergeNode in="highlight"/></feMerge>
   </filter>
   <filter id="forest-inner-area" filterUnits="userSpaceOnUse" {...bounds}><feMorphology in="SourceAlpha" operator="erode" radius={radius*.13} result="core"/><feFlood floodColor="white" result="white"/><feComposite in="white" in2="core" operator="in"/></filter>
   <filter id="forest-crown-edge-band" filterUnits="userSpaceOnUse" {...bounds}><feMorphology in="SourceAlpha" operator="erode" radius={radius*.17} result="core"/><feComposite in="SourceAlpha" in2="core" operator="out" result="band"/><feFlood floodColor="white"/><feComposite in2="band" operator="in"/></filter>
   <mask id="forest-tree-edge-mask" maskUnits="userSpaceOnUse" {...bounds}><use href="#forest-shore-land" filter="url(#forest-crown-edge-band)"/></mask>
   <mask id="forest-tree-inside-mask" maskUnits="userSpaceOnUse" {...bounds}><use href="#forest-shore-land" filter="url(#forest-inner-area)"/></mask>
   <g id="forest-tree-marks" fill="none" stroke="#29331b" strokeWidth={radius*.015} strokeLinecap="round" strokeLinejoin="round"><path data-tree-marks="edge" d={trees.edge} mask="url(#forest-tree-edge-mask)"/><path data-tree-marks="inside" d={trees.inside} opacity=".8" mask="url(#forest-tree-inside-mask)"/></g>
   <filter id="forest-bottom-edge" filterUnits="userSpaceOnUse" {...bounds} colorInterpolationFilters="sRGB">
    <feOffset in="SourceAlpha" dy={radius*.075} result="lower"/>
    <feComposite in="lower" in2="SourceAlpha" operator="out" result="bottomBand"/><feFlood floodColor="white"/><feComposite in2="bottomBand" operator="in"/>
   </filter>
   <g id="forest-final-silhouette" mask="url(#forest-water-bank-mask)"><g mask="url(#forest-clearings-mask)" clipPath="url(#forest-canopy-clip)"><rect {...bounds} fill="white"/></g></g>
   <mask id="forest-trunks-mask" maskUnits="userSpaceOnUse" {...bounds}><use href="#forest-final-silhouette" filter="url(#forest-bottom-edge)"/></mask>
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
  <path data-forest-trunks="true" d={trunks} mask="url(#forest-trunks-mask)" fill="none" stroke="#202319" strokeWidth={radius*.014} strokeLinecap="round"/>
  <g mask="url(#forest-water-bank-mask)">
   {/* Outline the completed silhouette once, without changing the source curves. */}
   <g filter="url(#forest-union-outline)"><g mask="url(#forest-clearings-mask)" clipPath="url(#forest-canopy-clip)"><rect {...bounds} fill={FOREST_EDGE}/></g></g>
   <g mask="url(#forest-clearings-mask)" clipPath="url(#forest-canopy-clip)"><g filter="url(#forest-colour-blend)">
    <rect {...bounds} fill={FOREST_PALETTE.deciduous}/>
    {cells.map(c=><polygon key={`${c.q},${c.r}`} points={hexPoints(c,radius)} fill={FOREST_PALETTE[forestFamily(c.biome)!]} stroke={FOREST_PALETTE[forestFamily(c.biome)!]} strokeWidth={radius*.4}/>)}
   </g></g>
  </g>
  <use href="#forest-tree-marks"/>
  <use data-forest-light="true" href="#forest-final-silhouette" filter="url(#forest-edge-light)"/>
 </g>;
}
export const ForestCanopy=memo(ForestCanopyImpl);

// Overlay after water fill, before flow marks, roads and POI. Underlying canopy stays intact.
export function ForestWaterEdge(){return <g data-forest-water-light="true" pointerEvents="none" mask="url(#forest-shore-effect-mask)"><use href="#forest-shore-ground"/><use href="#forest-shore-land" filter="url(#forest-edge-light)"/><g mask="url(#forest-land-without-water)"><use href="#forest-trunk-lines" mask="url(#forest-shore-trunks-mask)"/></g></g>;}
