import {memo,useMemo} from 'react';
import {hexGridPath} from './baseHexArtwork';
type Cell={x:number;y:number};
function ColorHexGridImpl({cells,radius,viewMagnification=1}:{cells:Cell[];radius:number;viewMagnification?:number}){
 const path=useMemo(()=>hexGridPath(cells,radius),[cells,radius]);
 return <path className="color-hex-grid" d={path} fill="none" stroke="#575242" strokeOpacity={.22} strokeWidth={.55/viewMagnification} vectorEffect="non-scaling-stroke" pointerEvents="none"/>;
}
export const ColorHexGrid=memo(ColorHexGridImpl);
