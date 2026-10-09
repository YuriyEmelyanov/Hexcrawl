import {memo,useMemo} from 'react';
type Cell={x:number;y:number};
function ColorHexGridImpl({cells,radius}:{cells:Cell[];radius:number}){
 const path=useMemo(()=>{
  const edges=new Map<string,string>();
  for(const c of cells){const ps=Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return{x:c.x+radius*Math.cos(a),y:c.y+radius*Math.sin(a)};});
   for(let i=0;i<6;i++){const a=ps[i],b=ps[(i+1)%6],k=[a,b].map(p=>`${Math.round(p.x*1000)},${Math.round(p.y*1000)}`).sort().join(':');
    edges.set(k,`M${a.x.toFixed(3)} ${a.y.toFixed(3)}L${b.x.toFixed(3)} ${b.y.toFixed(3)}`);
   }
  }return [...edges.values()].join('');
 },[cells,radius]);
 return <path className="color-hex-grid" d={path} fill="none" stroke="#575242" strokeOpacity={.42} strokeWidth={.6} pointerEvents="none"/>;
}
export const ColorHexGrid=memo(ColorHexGridImpl);
