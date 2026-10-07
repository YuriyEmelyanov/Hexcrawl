import { useMemo } from 'react';
import { buildForest, type ForestCell, type Canopy } from './forestGeometry';

export function ForestLayer({cells,radius,seed}:{cells:ForestCell[];radius:number;seed:number}){
 const shapes=useMemo(()=>buildForest(cells,radius,seed),[cells,radius,seed]);
 if(!shapes.length)return null;
 const dense=shapes.filter(s=>s.kind==='dense'),sparse=shapes.filter(s=>s.kind==='sparse');
 const densePath=dense.map(s=>s.path).join('');
 const drawing=(path:string,parts:Canopy[],id:string)=><>
   <defs><clipPath id={id}><path d={path} fillRule="evenodd" clipRule="evenodd"/></clipPath></defs>
   <path d={path} fillRule="evenodd" transform={`translate(0 ${radius*.085})`} fill="#514A32" opacity={.40}/>
   <path d={parts.map(s=>s.trunks).join('')} fill="none" stroke="#303B25" strokeWidth={radius*.028} strokeLinecap="round"/>
   <path className="forest-canopy" d={path} fillRule="evenodd" fill="#789F46" stroke="#2F3D25" strokeWidth={radius*.027} strokeLinejoin="round"/>
   <g clipPath={`url(#${id})`}>
     <path d={parts.map(s=>s.rim).join('')} fill="none" stroke="#435E2C" strokeWidth={radius*.018} strokeLinecap="round"/>
     <path d={parts.map(s=>s.details).join('')} fill="none" stroke="#4D6A32" strokeWidth={radius*.017} strokeLinecap="round"/>
   </g>
 </>;
 return <g className="forest-layer" pointerEvents="none">
  {dense.length>0?<g data-forest-kind="dense" data-forest-key="dense-union">{drawing(densePath,dense,'dense-canopy-clip')}</g>:null}
  {sparse.map(s=>{
    const hexKey=s.key.slice(7,s.key.lastIndexOf('-'));
    return <g key={s.key} data-forest-key={s.key} data-forest-kind="sparse" data-forest-hex={hexKey} clipPath={`url(#hex-clip-${hexKey})`}>
      {drawing(s.path,[s],`canopy-${s.key}`)}
    </g>;
  })}
 </g>;
}
