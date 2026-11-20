import {fineRoadPresentation,fineRiverStrokeWidth,type FineRoad,type FineCrossing} from './oneMilePresentation';
import {useId,useMemo,type ReactNode,type MouseEvent,type KeyboardEvent} from 'react';
import {createDetailGrid,detailCellCenter,detailCellPolygon,detailFootprintBoundary,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid';
import {detailFootprintExtentMiles,detailFootprintWorldAnchor} from './detailSizes';
import type {Detail1State,DetailPoiFootprint} from './detailModel';
import {fineCellKey,type OneMileCell,type FineCandidate} from './oneMile';
import {Engraving} from './rendering/EngravedTerrain';
import {engravingFor, type TerrainKind} from './rendering/engravingAssets';
import {terrainTextures} from './rendering/terrainBlend';
import {smallLakeShorePath} from './smallLakeShore';
import type {SmallLake} from './smallLakes';
import {ColorHexGrid} from './rendering/ColorHexGrid';
type Props={smallLakes?:readonly SmallLake[];smallLakeDraft?:SmallLake;smallLakeSeed?:number;rapids:readonly {key:string;x1:number;y1:number;x2:number;y2:number}[];waterfalls:readonly {key:string;x:number;y:number}[];crossings:readonly FineCrossing[];state:Detail1State;cells:readonly OneMileCell[];candidates:readonly FineCandidate[];offset:WorldPoint;rotation?:string;rotated:boolean;revision:number;coordinates:boolean;
 poi:(p:DetailPoiFootprint)=>{label:string;image:string};geography?:ReactNode;interactive?:boolean;
 rivers:readonly {key:string;x1:number;y1:number;x2:number;y2:number;width:number;fullness:number}[];
 roads:readonly FineRoad[];
 onHover:(cell:DetailCell|null)=>void;onPick:(cell:DetailCell,candidate:boolean,revision:number,event?:MouseEvent<SVGGElement>)=>void;busy:boolean};
/** All geometry uses the original world frame. Full visual cells never become
 * generator coverage. Native source-six artwork is not rendered underneath. */
export function OneMileArtwork(p:Props){
 const radius=28/6,factor=Math.sqrt(3)*radius,grid=createDetailGrid(1,p.state.grid.origin),origin=p.state.grid.origin;
 const point=(v:WorldPoint)=>({x:(v.x-origin.x)*factor+p.offset.x,y:(v.y-origin.y)*factor+p.offset.y});
 const polygon=(c:DetailCell)=>detailCellPolygon(grid,c).map(point).map(v=>`${v.x},${v.y}`).join(' ');
 const center=(c:DetailCell)=>point(detailCellCenter(grid,c));
 const activate=(e:KeyboardEvent<SVGGElement>,cell:DetailCell,candidate:boolean)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!p.busy)p.onPick(cell,candidate,p.revision);}};
 const clipPrefix=useId();
 const edits=p.state.fineCellEdits;
 const terrain=useMemo(()=>new Map(p.cells.map(row=>{
   const key=fineCellKey(row.cell);
   const land=edits?.[key]?.landBiomeId??row.landBiomeId;
   const id=!land || row.waterArea > row.acceptedArea-row.waterArea+1e-9 ? row.waterKind : land;
   if (!id || !engravingFor(id)) throw new Error(`Unknown projected map terrain at ${key}: ${id}`);
   return [key,id as TerrainKind];
 })),[p.cells,edits]);
 const textures=useMemo(()=>terrainTextures(p.cells.map(({cell})=>({
   ...cell,color:engravingFor(terrain.get(fineCellKey(cell))!)!.color,
 }))),[p.cells,terrain]);
 const shorelines=useMemo(()=>[...(p.smallLakes??[]),...(p.smallLakeDraft?[p.smallLakeDraft]:[])].map(lake=>({
  lake,path:smallLakeShorePath(lake,p.smallLakeSeed??0),
 })),[p.smallLakes,p.smallLakeDraft,p.smallLakeSeed]);
 const occupied=new Set<string>();
 const pointsOfInterest=p.state.poiFootprints.map(fp=>{
   const extent=detailFootprintExtentMiles(fp,grid),large=extent!==null&&extent>=1;
   const anchor=detailFootprintWorldAnchor(fp,grid);
   const targets=large?fp.cells.map(cell=>({cell,position:center(cell)})):
     [{cell:worldToDetailCell(grid,anchor),position:point(anchor)}];
   const markers=targets.filter(({cell})=>{
     const key=fineCellKey(cell);
     if(occupied.has(key))return false;
     occupied.add(key);
     return true;
   });
   return {fp,outline:large?detailFootprintBoundary(grid,fp.cells):[],markers};
 });
 return <g data-fine-world transform={p.rotation}>
  <g data-fine-cells>{p.cells.map(({cell})=>{
   const key=fineCellKey(cell),id=terrain.get(key)!,c=center(cell),points=polygon(cell),clip=`${clipPrefix}-${key}`;
   const texture=textures.get(key),art=engravingFor(id)!;
   return <g key={key} data-fine-key={key} data-fine-terrain={id} role={p.interactive===false?undefined:"button"} tabIndex={p.interactive===false?-1:0} aria-label={key} aria-disabled={p.busy} onMouseEnter={()=>p.onHover(cell)} onMouseLeave={()=>p.onHover(null)} onFocus={()=>p.onHover(cell)} onBlur={()=>p.onHover(null)} onClick={e=>{e.stopPropagation();if(e.detail>1)return;if(!p.busy)p.onPick(cell,false,p.revision,e);}} onKeyDown={e=>activate(e,cell,false)}>
    <polygon points={points} fill={art.color}/>
    {texture&&<><defs><clipPath id={clip}><polygon points={points}/></clipPath></defs>
      <image className="terrain-blend" href={texture} clipPath={`url(#${clip})`}
        x={c.x-factor/2} y={c.y-radius} width={factor} height={radius*2} preserveAspectRatio="none" pointerEvents="none"/></>}
    {!occupied.has(key)&&<Engraving id={id} x={c.x} y={c.y} radius={radius} rotated={p.rotated}/>}
   </g>;
  })}</g>
  {shorelines.map(({lake,path})=>{
    const draft=lake===p.smallLakeDraft,clip=`${clipPrefix}-small-lake-${lake.id}`;
    return <g key={lake.id} data-small-lake={draft?undefined:lake.id} data-editor-only={draft?'small-lake-draft':undefined} pointerEvents="none">
      <defs><clipPath id={clip}>{lake.cells.map(cell=><polygon key={fineCellKey(cell)} points={polygon(cell)}/>)}</clipPath></defs>
      <g clipPath={`url(#${clip})`}>
        <path data-small-lake-shore={draft?undefined:lake.id} d={path} transform={`translate(${p.offset.x} ${p.offset.y})`} fill="#117f8c" fillRule="evenodd" stroke="#159dac" strokeWidth={radius*.09} opacity={draft ? .7 : 1}/>
      </g>
      {draft&&lake.cells.map(cell=><polygon key={fineCellKey(cell)} points={polygon(cell)} fill="none" stroke="#f7dc6f" strokeWidth={.3} strokeDasharray=".7 .5"/>)}
    </g>;
  })}
  {p.geography??<><g className="rivers-layer" pointerEvents="none">{p.rivers.map(r=><line key={r.key} data-river-fullness={r.fullness} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} className="river-polyline" strokeWidth={fineRiverStrokeWidth(r.fullness)}/>)}</g>
  <g className="roads-layer" pointerEvents="none">{p.roads.map(r=>{const plan=fineRoadPresentation(r,p.crossings,p.rivers);return <g key={r.key} data-fine-road={r.key}>
   {plan.pieces.map((part,i)=><line key={i} {...part} stroke="#8b6a3f" strokeWidth={r.kind==='trail'?1.5/6:3/6} strokeDasharray={r.kind==='trail'?`${4.04145/6} ${4.04145/6}`:undefined} strokeLinecap="butt"/>)}
   {plan.rails.map(rail=><polyline key={rail.key} points={rail.points} fill="none" stroke="#4f3922" strokeWidth={1.1/6}/>)}
   {plan.crossings.map(c=><g key={c.key} data-fine-crossing={c.key} data-crossing-kind={c.kind}><title>{c.kind}</title></g>)}
  </g>;})}</g>
  <g pointerEvents="none">{p.rapids.map(m=><line key={m.key} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} className="river-rapid-mark" style={{strokeWidth:.2}}/>)}{p.waterfalls.map(w=><image transform={p.rotated?`rotate(-90 ${w.x} ${w.y})`:undefined} key={w.key} href="/waterfall-color.svg" x={w.x-1.3} y={w.y-1.3} width={2.6} height={2.6}/>)}</g>

  </>}
  <g data-fine-grid pointerEvents="none"><ColorHexGrid cells={p.cells.map(row=>center(row.cell))} radius={radius} viewMagnification={6}/></g>
  {p.coordinates&&<g className="hex-coordinate-layer" pointerEvents="none">{p.cells.map(row=>{const c=center(row.cell);return <text transform={p.rotated?`rotate(-90 ${c.x} ${c.y})`:undefined} key={`${row.cell.q},${row.cell.r}`} x={c.x} y={c.y+3.4} fontSize={1.5} textAnchor="middle" fill="#152238">{row.cell.q}/{row.cell.r}</text>;})}</g>}
  <g data-fine-pois pointerEvents="none">{pointsOfInterest.map(({fp,outline,markers})=>{
   const v=p.poi(fp),size=radius*.62;
   return <g key={fp.poiId} data-poi-id={fp.poiId}>
    {outline.map((edge,i)=>{const a=point(edge.from),b=point(edge.to);return <line data-fine-outline={fp.poiId} key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#f7dc6f" strokeWidth={1.3/6} vectorEffect="non-scaling-stroke"/>;})}
    {markers.map(({cell,position:c})=>{
      const key=fineCellKey(cell);
      const terrainKind=terrain.get(key);
      return <g key={key} data-engraved-poi={key}>
        <circle cx={c.x} cy={c.y} r={radius*.425} fill={terrainKind?engravingFor(terrainKind)!.poiColor:'#d8cfad'}
          stroke="#f4ecd5" strokeWidth={1/6}/>
        <image transform={p.rotated?`rotate(-90 ${c.x} ${c.y})`:undefined} className="poi-marker" href={v.image}
          x={c.x-size/2} y={c.y-size/2} width={size} height={size} role="img" aria-label={v.label}/>
      </g>;
    })}
   </g>;
  })}</g>
  <g data-editor-only="fine-candidates">{p.candidates.map(row=><g key={`${row.cell.q},${row.cell.r}`} data-fine-candidate={`${row.cell.q},${row.cell.r}`} role={p.interactive===false?undefined:"button"} tabIndex={p.interactive===false?-1:0} aria-label={`+ ${row.cell.q}/${row.cell.r}`} aria-disabled={p.busy} onClick={e=>{e.stopPropagation();if(e.detail>1)return;if(!p.busy)p.onPick(row.cell,true,p.revision,e);}} onKeyDown={e=>activate(e,row.cell,true)}><polygon points={polygon(row.cell)} fill="rgba(125,211,252,.12)" stroke="#71869d" strokeWidth={.8/6} vectorEffect="non-scaling-stroke" strokeDasharray="2 2"/></g>)}</g>
 </g>;
}
