import {useId,useMemo} from 'react';
import {refinedRouteBends} from './refinedRouteBends';
import type {Detail1State} from './detailModel';
import type {WorldPoint} from './detailGrid';
import type {normalizeRefinementRiverSource} from './geometryRefinementSource';
import {refinementPolylineArc} from './geometryRefinementSource';
import type {FineRoad,FineCrossing} from './oneMilePresentation';
import {fineRoadPresentation,fineRefinedRoadPresentation,fineRiverStrokeWidth} from './oneMilePresentation';
import {LakeWater} from './rendering/LakeWater';
import type {LakeShape,NaturalLakeCell} from './rendering/lakeGeometry';
import type {RefinementShore} from './geometryRefinementShore';

type River={key:string;x1:number;y1:number;x2:number;y2:number;width:number;fullness:number};
type Source=Extract<ReturnType<typeof normalizeRefinementRiverSource>,{status:'prepared'}>;
type Props={displayRoutes?:ReturnType<typeof refinedRouteBends>;state:Detail1State;source:Source;offset:WorldPoint;mode:'tiles'|'emoji'|'color';
 rivers:readonly River[];roads:readonly FineRoad[];crossings:readonly FineCrossing[];hiddenRiverEdgeKeys?:ReadonlySet<string>;smallLakeRiverMask?:string;
 rapids:readonly {key:string;x1:number;y1:number;x2:number;y2:number;edgeKey?:string}[];
 waterfalls:readonly {key:string;x:number;y:number}[];rotated:boolean};
const pair=(id:number,key:string)=>JSON.stringify([id,key]);
const svgPoint=(v:WorldPoint,origin:WorldPoint,offset:WorldPoint)=>({x:(v.x-origin.x)*Math.sqrt(3)*28/6+offset.x,y:(v.y-origin.y)*Math.sqrt(3)*28/6+offset.y});
function shorePath(body:RefinementShore,point:(v:WorldPoint)=>WorldPoint){return body.loops.map(loop=>{
 const start=point(loop[0].from);return `M${start.x} ${start.y}`+loop.map(c=>{const q=point(c.control),b=point(c.to);return `Q${q.x} ${q.y} ${b.x} ${b.y}`;}).join('')+'Z';
}).join('');}
/** Water and river clipping share the exact accepted mode contour. Native
 * source-mouth embellishments must not move an accepted refined shore. */
export function refinementLakeShapes(state:Detail1State,mode:Props['mode'],offset:WorldPoint,shapes:readonly LakeShape[]):LakeShape[]{
 const accepted=state.geometryRefinement!;
 const ids=new Set(accepted.riverPlan.lakes.map(l=>l.lakeId));
 const point=(v:WorldPoint)=>svgPoint(v,state.grid.origin,offset);
 return [...shapes.filter(l=>!l.cells.some(c=>c.lakeId!==undefined&&ids.has(c.lakeId))),...accepted.riverPlan.lakes.map(l=>{
  const body=l.modes[mode],loops=body.loops.map(loop=>loop.map(c=>point(c.from))),all=body.loops.flatMap(loop=>loop.flatMap(c=>[point(c.from),point(c.control),point(c.to)]));
  const xs=all.map(p=>p.x),ys=all.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys);
  return {key:`refined-lake-${l.lakeId}`,cells:[],path:shorePath(body,point),loops,mouths:[],bounds:{x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y}};
 })];
}
export function RefinedLakeWater(p:Pick<Props,'state'|'mode'|'offset'>&{shapes:readonly LakeShape[];cells:NaturalLakeCell[];seed:number}){
 const prefix=useId().replace(/:/g,'_');
 return <LakeWater shapes={refinementLakeShapes(p.state,p.mode,p.offset,p.shapes).map(l=>({...l,key:`${prefix}-${l.key}`}))} cells={p.cells} radius={28} seed={p.seed}/>;
}
/** A view of accepted physical4 only. Preview candidates never enter map or PNG. */
export function RefinedGeographyArtwork(p:Props){
 const id=useId().replace(/:/g,'_'),refinement=p.state.geometryRefinement!;
 const factor=Math.sqrt(3)*28/6,origin=p.state.grid.origin;
 const point=(v:WorldPoint)=>svgPoint(v,origin,p.offset);
 const points=(vs:readonly WorldPoint[])=>vs.map(point).map(v=>`${v.x},${v.y}`).join(' ');
 const shore=(body:RefinementShore)=>shorePath(body,point);
 const retained=new Set(refinement.roads.roads.map(r=>pair(r.roadId,r.sourceRoadSegmentKey)));
 const outsideRoads=p.roads.filter(r=>!retained.has(pair(r.roadId,r.segmentKey)));
 const retainedRapids=new Set(refinement.riverPlan.source.segments.map(s=>pair(s.riverId,s.edgeKey)));
 const {paintedPaths,visiblePaths,displayWater,roadPaint}=useMemo(
   ()=>p.displayRoutes??refinedRouteBends(p.source,refinement,p.hiddenRiverEdgeKeys),
   [p.displayRoutes,p.source,refinement,p.hiddenRiverEdgeKeys]);
 const pathByRef=new Map(visiblePaths.map(path=>[pair(path.riverId,path.sourceEdgeKey),path]));
 const locations=[...visiblePaths.flatMap(path=>path.points.map(point)),...p.roads.flatMap(r=>[{x:r.x1,y:r.y1},{x:r.x2,y:r.y2}])];
 if(!locations.length)locations.push(p.offset);
 const xs=locations.map(v=>v.x),ys=locations.map(v=>v.y),padding=10*factor;
 const bounds={x:Math.min(...xs)-padding,y:Math.min(...ys)-padding,width:Math.max(...xs)-Math.min(...xs)+padding*2,height:Math.max(...ys)-Math.min(...ys)+padding*2};
 const retainedWaterfalls=new Set(refinement.riverPlan.waterfalls.map(w=>w.sourceNodeKey));
 return <g data-refined-geography pointerEvents="none">
  <defs><mask id={id} maskUnits="userSpaceOnUse" {...bounds} style={{maskType:'luminance'}}>
   <rect {...bounds} fill="white"/>
   {refinement.riverPlan.lakes.map(l=><path key={l.lakeId} d={shore(l.modes[p.mode])} fill="black" fillRule="evenodd"/>)}
  </mask><mask id={`${id}-roads`} maskUnits="userSpaceOnUse" {...bounds} style={{maskType:'luminance'}}>
   <rect {...bounds} fill="white"/>
   {refinement.roads.masks.map(m=><path key={m.poiId} d={shore(m.body)} fill="black" fillRule="evenodd"/>)}
  </mask></defs>
  <g mask={p.smallLakeRiverMask}><g className="rivers-layer" mask={`url(#${id})`}>
   {paintedPaths.map(path=>{
    const width=fineRiverStrokeWidth(path.fullness);
    return <polyline key={pair(path.riverId,path.sourceEdgeKey)} data-refined-river={path.riverId} data-source-edge={path.sourceEdgeKey} data-river-fullness={path.fullness} points={points(path.points)} className="river-polyline" strokeWidth={width} fill="none"/>;
   })}
  </g></g>
  <g className="roads-layer" mask={`url(#${id}-roads)`}>
   {outsideRoads.map(r=>{const plan=fineRoadPresentation(r,p.crossings,p.rivers);return <g key={r.key} data-fine-road={r.key}>
    {roadPaint.has(pair(r.roadId,r.segmentKey))&&!plan.crossings.length
      ? <polyline points={points(roadPaint.get(pair(r.roadId,r.segmentKey))!)} fill="none" stroke="#8b6a3f" strokeWidth={r.kind==='trail'?2.25/6:3/6} strokeDasharray={r.kind==='trail'?`${4.04145/6} ${4.04145/6}`:undefined}/>
      : plan.pieces.map((part,i)=><line key={i} {...part} stroke="#8b6a3f" strokeWidth={r.kind==='trail'?2.25/6:3/6} strokeDasharray={r.kind==='trail'?`${4.04145/6} ${4.04145/6}`:undefined}/>)}
    {plan.rails.map(rail=><polyline key={rail.key} points={rail.points} fill="none" stroke="#4f3922" strokeWidth={1.1/6}/>)}
   </g>;})}
   {refinement.roads.roads.map(road=>{const plan=displayWater.status==='prepared'?fineRefinedRoadPresentation({...road,points:roadPaint.get(pair(road.roadId,road.sourceRoadSegmentKey))!},refinement.roads.crossings,factor,displayWater):{pieces:[],rails:[]};return <g key={pair(road.roadId,road.sourceRoadSegmentKey)} data-refined-road={road.roadId}>
    {plan.pieces.map((part,i)=>{const a=point(part.from),b=point(part.to);return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeDashoffset={-part.startDistance*factor} opacity={part.opacity} stroke="#8b6a3f" strokeWidth={road.kind==='trail'?2.25/6:3/6} strokeDasharray={road.kind==='trail'?`${4.04145/6} ${4.04145/6}`:undefined} strokeLinecap="butt"/>;})}
    {plan.rails.map(rail=><polyline key={rail.key} points={points(rail.points)} fill="none" stroke="#4f3922" strokeWidth={1.1/6}/>) }
   </g>;})}
   {refinement.roads.crossings.map(c=><g key={c.key} data-fine-crossing={c.key} data-crossing-kind={c.kind}><title>{c.kind}</title></g>)}
  </g>
  <g mask={p.smallLakeRiverMask}>
  {p.rapids.filter(m=>!retainedRapids.has(pair(Number(m.key.match(/^river-rapid-(\d+)-/)?.[1]),m.edgeKey??''))).map(m=>{
   const path=pathByRef.get(pair(Number(m.key.match(/^river-rapid-(\d+)-/)?.[1]),m.edgeKey??''));
   if(!path)return <line key={m.key} data-fine-rapid={m.key} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} className="river-rapid-mark" style={{strokeWidth:.2}}/>;
   const fraction=Number(m.key.slice(m.key.lastIndexOf('-')+1)),arc=refinementPolylineArc(path.points,Number.isFinite(fraction)?fraction:.5),q=point(arc.point),half=Math.hypot(m.x2-m.x1,m.y2-m.y1)/2,dx=-arc.tangent.y*half,dy=arc.tangent.x*half;
   return <line key={m.key} data-fine-rapid={m.key} x1={q.x-dx} y1={q.y-dy} x2={q.x+dx} y2={q.y+dy} className="river-rapid-mark" style={{strokeWidth:.2}}/>;
  })}
  {refinement.riverPlan.rapids.map(m=>{const path=pathByRef.get(pair(m.riverId,m.sourceEdgeKey));
    const arc=path?refinementPolylineArc(path.points,.5):m;
    const q=point(arc.point),dx=-arc.tangent.y*.8,dy=arc.tangent.x*.8;return <line key={m.sourceRef} x1={q.x-dx} y1={q.y-dy} x2={q.x+dx} y2={q.y+dy} className="river-rapid-mark" style={{strokeWidth:.2}}/>;})}
  {p.waterfalls.filter(w=>![...retainedWaterfalls].some(key=>w.key===`river-waterfall-${key}`)).map(w=><image key={w.key} transform={p.rotated?`rotate(-90 ${w.x} ${w.y})`:undefined} href="/waterfall-color.svg" x={w.x-1.3} y={w.y-1.3} width={2.6} height={2.6}/>)}
  {refinement.riverPlan.waterfalls.map(w=>{const q=point(w.point);return <image key={w.sourceRef} transform={p.rotated?`rotate(-90 ${q.x} ${q.y})`:undefined} href="/waterfall-color.svg" x={q.x-1.3} y={q.y-1.3} width={2.6} height={2.6}/>;})}
  </g>
 </g>;
}
