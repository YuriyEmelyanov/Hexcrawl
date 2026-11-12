import type {ReactNode,MouseEvent,KeyboardEvent} from 'react';
import {createDetailGrid,detailCellCenter,detailCellPolygon,detailFootprintBoundary,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid';
import {detailFootprintExtentMiles,detailFootprintWorldAnchor} from './detailSizes';
import type {Detail1State,DetailPoiFootprint} from './detailModel';
import type {OneMileCell,FineCandidate} from './oneMile';
type Visual={color:string;image?:string;emoji?:string};
type Props={rapids:readonly {key:string;x1:number;y1:number;x2:number;y2:number}[];waterfalls:readonly {key:string;x:number;y:number}[];crossings:readonly {key:string;x:number;y:number;kind:string}[];state:Detail1State;cells:readonly OneMileCell[];candidates:readonly FineCandidate[];offset:WorldPoint;rotation?:string;revision:number;coordinates:boolean;
 visual:(id:string|undefined,cell:DetailCell)=>Visual;poi:(p:DetailPoiFootprint)=>{label:string;image?:string;emoji:string};water:ReactNode;
 rivers:readonly {key:string;x1:number;y1:number;x2:number;y2:number;width:number}[];
 roads:readonly {key:string;kind:string;x1:number;y1:number;x2:number;y2:number}[];
 onHover:(cell:DetailCell|null)=>void;onPick:(cell:DetailCell,candidate:boolean,revision:number,event?:MouseEvent<SVGGElement>)=>void;busy:boolean};
/** All geometry uses the original world frame. Full visual cells never become
 * generator coverage. Native source-six artwork is not rendered underneath. */
export function OneMileArtwork(p:Props){
 const factor=Math.sqrt(3)*28/6,grid=createDetailGrid(1,p.state.grid.origin),origin=p.state.grid.origin;
 const point=(v:WorldPoint)=>({x:(v.x-origin.x)*factor+p.offset.x,y:(v.y-origin.y)*factor+p.offset.y});
 const polygon=(c:DetailCell)=>detailCellPolygon(grid,c).map(point).map(v=>`${v.x},${v.y}`).join(' ');
 const center=(c:DetailCell)=>point(detailCellCenter(grid,c));
 const activate=(e:KeyboardEvent<SVGGElement>,cell:DetailCell,candidate:boolean)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!p.busy)p.onPick(cell,candidate,p.revision);}};
 return <g data-fine-world transform={p.rotation}>
  <g data-fine-cells>{p.cells.map(row=>{const id=`${row.cell.q},${row.cell.r}`,v=p.visual(p.state.fineCellEdits?.[id]?.landBiomeId??row.landBiomeId,row.cell),c=center(row.cell),points=polygon(row.cell),clip=`fine-clip-${id}`;
   return <g key={id} data-fine-key={id} role="button" tabIndex={0} aria-label={id} aria-disabled={p.busy} onMouseEnter={()=>p.onHover(row.cell)} onMouseLeave={()=>p.onHover(null)} onFocus={()=>p.onHover(row.cell)} onBlur={()=>p.onHover(null)} onClick={e=>{e.stopPropagation();if(!p.busy)p.onPick(row.cell,false,p.revision,e);}} onKeyDown={e=>activate(e,row.cell,false)}>
    <polygon points={points} fill={v.color}/>
    {v.image&&<><defs><clipPath id={clip}><polygon points={points}/></clipPath></defs><image className="biome-tile" data-fine-biome={id} href={v.image} x={c.x-factor/2} y={c.y-factor/Math.sqrt(3)} width={factor} height={factor*2/Math.sqrt(3)} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} pointerEvents="none"/></>}
    {v.emoji&&<text className="biome-marker" x={c.x} y={c.y} fontSize={3.5} textAnchor="middle" dominantBaseline="central" pointerEvents="none">{v.emoji}</text>}
   </g>;
  })}</g>
  <g pointerEvents="none">{p.water}</g>
  <g className="rivers-layer" pointerEvents="none">{p.rivers.map(r=><line key={r.key} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} className="river-polyline" strokeWidth={r.width/6}/>)}</g>
  <g className="roads-layer" pointerEvents="none">{p.roads.map(r=><line key={r.key} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#3b3028" strokeWidth={.4} strokeDasharray={r.kind==='trail'?'1 .6':undefined}/>)}</g>
  <g pointerEvents="none">{p.rapids.map(m=><line key={m.key} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} className="river-rapid-mark" strokeWidth={.2}/>)}{p.waterfalls.map(w=><image key={w.key} href="/waterfall-color.svg" x={w.x-1.3} y={w.y-1.3} width={2.6} height={2.6}/>)}</g>
  <g className="river-crossings" pointerEvents="none">{p.crossings.map(c=><g key={c.key} data-fine-crossing={c.key}><circle cx={c.x} cy={c.y} r={.6} fill="#f8e5b3" stroke="#44372e" strokeWidth={.12}/><title>{c.kind}</title></g>)}</g>
  <g data-fine-grid pointerEvents="none">{p.cells.map(row=><polygon key={`${row.cell.q},${row.cell.r}`} points={polygon(row.cell)} fill="none" stroke="#334155" strokeWidth={.55} vectorEffect="non-scaling-stroke"/>)}</g>
  {p.coordinates&&<g className="hex-coordinate-layer" pointerEvents="none">{p.cells.map(row=>{const c=center(row.cell);return <text key={`${row.cell.q},${row.cell.r}`} x={c.x} y={c.y+3.4} fontSize={1.5} textAnchor="middle" fill="#152238">{row.cell.q}/{row.cell.r}</text>;})}</g>}
  <g data-fine-pois pointerEvents="none">{p.state.poiFootprints.map(fp=>{const v=p.poi(fp),extent=detailFootprintExtentMiles(fp,grid),cells=extent!==null&&extent>=1?fp.cells:null,outline=cells??[worldToDetailCell(grid,detailFootprintWorldAnchor(fp,grid))];
   return <g key={fp.poiId} data-poi-id={fp.poiId}>
    {detailFootprintBoundary(grid,outline).map((edge,i)=>{const a=point(edge.from),b=point(edge.to);return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f7dc6f" strokeWidth={1.3} vectorEffect="non-scaling-stroke"/>;})}
    {(cells?cells.map(center):[point(detailFootprintWorldAnchor(fp,grid))]).map((c,i)=>v.image?<image key={i} className="poi-marker" href={v.image} x={c.x-1.5} y={c.y-1.5} width={3} height={3} role="img" aria-label={v.label}/>:<text key={i} className="poi-marker" x={c.x} y={c.y} fontSize={3} textAnchor="middle" dominantBaseline="central">{v.emoji}</text>)}
   </g>;
  })}</g>
  <g data-editor-only="fine-candidates">{p.candidates.map(row=><g key={`${row.cell.q},${row.cell.r}`} data-fine-candidate={`${row.cell.q},${row.cell.r}`} role="button" tabIndex={0} aria-label={`+ ${row.cell.q}/${row.cell.r}`} aria-disabled={p.busy} onClick={e=>{e.stopPropagation();if(!p.busy)p.onPick(row.cell,true,p.revision,e);}} onKeyDown={e=>activate(e,row.cell,true)}><polygon points={polygon(row.cell)} fill="rgba(125,211,252,.12)" stroke="#71869d" strokeWidth={.6} vectorEffect="non-scaling-stroke" strokeDasharray="2 2"/></g>)}</g>
 </g>;
}
