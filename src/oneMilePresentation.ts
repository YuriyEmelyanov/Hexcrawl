/** Presentation only: never writes or repairs accepted geographic data. */
import {prepareRefinementWater,refinementWaterIntervals,type RefinementWater} from './geometryRefinementWater.ts';
export const finePoiLabel=(type:string,name?:string)=>name?`${type} ${name}`:type;
/** The one-mile view is a cartographic projection only. Fullness remains the
 * persisted river meaning while the visible full width occupies 10%..50% of
 * a one-mile hex. Source-six widths and accepted geometry are never inputs. */
export const FINE_HEX_WIDTH=Math.sqrt(3)*28/6;
export const fineRiverStrokeWidth=(fullness:number,hexWidth=FINE_HEX_WIDTH)=>
 Number.isInteger(fullness)&&fullness>=1&&fullness<=5&&Number.isFinite(hexWidth)&&hexWidth>0?hexWidth*fullness/10:0;
type Line={key:string;x1:number;y1:number;x2:number;y2:number};
export type FineRoad=Line&{roadId:number;segmentKey:string;kind:string};
export type FineCrossing={key:string;riverEdgeKey?:string;roadId:number;roadSegmentKey:string;riverId:number;x:number;y:number;kind:string};
type River=Line&{width:number;fullness:number};
export function fineRoadPresentation(road:FineRoad,crossings:readonly FineCrossing[],rivers:readonly River[]){
 const dx=road.x2-road.x1,dy=road.y2-road.y1,length=Math.hypot(dx,dy);
 const pieces:Array<{x1:number;y1:number;x2:number;y2:number;opacity:number}>=[],rails:Array<{key:string;points:string}>=[];
 const matched:FineCrossing[]=[];
 if(!Number.isFinite(length)||length<1e-9)return {pieces,rails,crossings:matched};
 const ux=dx/length,uy=dy/length,at=(t:number)=>({x:road.x1+ux*t,y:road.y1+uy*t});
 const intervals:Array<{a:number;b:number;kind:string}>=[],seen=new Set<string>();
 const sorted=[...crossings].filter(c=>c.roadId===road.roadId&&c.roadSegmentKey===road.segmentKey).sort((a,b)=>a.key.localeCompare(b.key));
 for(const c of sorted){
  if(seen.has(c.key)||!Number.isFinite(c.x)||!Number.isFinite(c.y))continue;seen.add(c.key);
  const t=(c.x-road.x1)*ux+(c.y-road.y1)*uy;
  if(t< -1e-7||t>length+1e-7||Math.abs((c.x-road.x1)*uy-(c.y-road.y1)*ux)>1e-6)continue;
  const paths=rivers.filter(r=>r.key.startsWith(`river-segment-${c.riverId}-`)).map(r=>({riverId:c.riverId,sourceEdgeKey:r.key,fullness:r.fullness,points:[{x:r.x1,y:r.y1},{x:r.x2,y:r.y2}]}));
  const water=prepareRefinementWater({paths,widthByFullness:new Map([1,2,3,4,5].map(f=>[f,fineRiverStrokeWidth(f)]))});
  if(water.status==='error'||!['bridge','ford','ferry'].includes(c.kind))continue;
  const wet=visibleCrossingInterval([{x:road.x1,y:road.y1},{x:road.x2,y:road.y2}],water,c.riverId,t);
  if(!wet)continue;
  matched.push(c);const {a,b}=wet;
  if(c.kind!=='bridge'){intervals.push({a,b,kind:c.kind});continue;}
  const left=Math.max(0,Math.min(t-11/6,a-.3)),right=Math.min(length,Math.max(t+11/6,b+.3));
  for(const side of [-1,1]){const points=[left,right].map(s=>{const p=at(s);return `${p.x-uy*side*4/6},${p.y+ux*side*4/6}`;}).join(' ');rails.push({key:`${c.key}:${side}`,points});}
 }
 const stops=[...new Set([0,length,...intervals.flatMap(i=>[i.a,i.b])])].sort((a,b)=>a-b);
 for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i];if(b-a<1e-9)continue;const mid=(a+b)/2,inside=intervals.filter(v=>mid>=v.a&&mid<=v.b);if(inside.some(v=>v.kind==='ferry'))continue;const p=at(a),q=at(b);pieces.push({x1:p.x,y1:p.y,x2:q.x,y2:q.y,opacity:inside.some(v=>v.kind==='ford')?.42:1});}
 return {pieces,rails,crossings:matched};
}

type Point={x:number;y:number};
export type FineRefinedRoad={roadId:number;sourceRoadSegmentKey:string;kind:string;points:readonly Point[];paint:readonly {from:Point;to:Point;poiMaskIds:readonly string[]}[]};
export type FineRefinedCrossing={key:string;roadId:number;roadSegmentKey:string;riverId:number;kind:string;fullness:number;roadDistance:number;roadTangent:Point;riverTangents:readonly Point[]};
const distance=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y);
const arcTable=(points:readonly Point[])=>{const arcs=[0];for(let i=1;i<points.length;i++)arcs.push(arcs[i-1]+distance(points[i-1],points[i]));return arcs;};
const pointAt=(points:readonly Point[],arcs:readonly number[],value:number)=>{const total=arcs[arcs.length-1];if(value<=0)return {...points[0]};if(value>=total)return {...points[points.length-1]};const i=arcs.findIndex((a,index)=>index>0&&a>=value),span=arcs[i]-arcs[i-1],t=(value-arcs[i-1])/span;return {x:points[i-1].x+(points[i].x-points[i-1].x)*t,y:points[i-1].y+(points[i].y-points[i-1].y)*t};};
const pathSlice=(points:readonly Point[],arcs:readonly number[],a:number,b:number)=>[pointAt(points,arcs,a),...points.filter((_,i)=>arcs[i]>a+1e-9&&arcs[i]<b-1e-9),pointAt(points,arcs,b)];
/** Clip against the finite, round-capped visible river, following every bend
 * of the road. A tangent at the crossing is not an infinite water strip. */
function visibleCrossingInterval(points:readonly Point[],water:RefinementWater,riverId:number,at:number){
 const spans:Array<{a:number;b:number}>=[];let cursor=0;
 for(let i=1;i<points.length;i++){
  const length=distance(points[i-1],points[i]);if(length<1e-10)continue;
  const wet=refinementWaterIntervals(water,{from:points[i-1],to:points[i]},riverId);
  if(wet.status==='prepared')for(const row of wet.intervals)if(!row.touchOnly)spans.push({a:cursor+row.startFraction*length,b:cursor+row.endFraction*length});
  cursor+=length;
 }
 const merged:Array<{a:number;b:number}>=[];
 for(const span of spans){const old=merged[merged.length-1];if(old&&span.a<=old.b+1e-9)old.b=Math.max(old.b,span.b);else merged.push({...span});}
 return merged.find(s=>at>=s.a-1e-9&&at<=s.b+1e-9);
}
/** Reprojects only the visible road/water contact. Accepted centerlines,
 * crossing points and POI masks remain immutable. */
export function fineRefinedRoadPresentation(road:FineRefinedRoad,crossings:readonly FineRefinedCrossing[],scale:number,water:RefinementWater){
 const pieces:Array<{from:Point;to:Point;opacity:number;startDistance:number}>=[],rails:Array<{key:string;points:Point[]}>=[];
 if(road.points.length<2||road.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||!Number.isFinite(scale)||scale<=0)return {pieces,rails};
 const arcs=arcTable(road.points),total=arcs[arcs.length-1];if(total<1e-9)return {pieces,rails};
 const hidden:Array<{a:number;b:number}>=[];let cursor=0;
 for(const part of road.paint){const length=distance(part.from,part.to),a=cursor,b=Math.min(total,cursor+length);if(part.poiMaskIds.length)hidden.push({a,b});cursor=b;}
 const intervals:Array<{a:number;b:number;kind:string;key:string}>=[];
 for(const c of [...crossings].filter(c=>c.roadId===road.roadId&&c.roadSegmentKey===road.sourceRoadSegmentKey).sort((a,b)=>a.key.localeCompare(b.key))){
  const width=fineRiverStrokeWidth(c.fullness)/scale;if(!width||!Number.isFinite(c.roadDistance)||!['bridge','ford','ferry'].includes(c.kind))continue;
  const wet=visibleCrossingInterval(road.points,water,c.riverId,c.roadDistance);if(!wet)continue;
  const {a,b}=wet;intervals.push({a,b,kind:c.kind,key:c.key});
  if(c.kind==='bridge'){
   const left=Math.max(0,Math.min(c.roadDistance-(11/6)/scale,a-.3/scale)),right=Math.min(total,Math.max(c.roadDistance+(11/6)/scale,b+.3/scale)),path=pathSlice(road.points,arcs,left,right),offset=(4/6)/scale;
   for(const side of [-1,1])rails.push({key:`${c.key}:${side}`,points:path.map((p,i,all)=>{const x=all[Math.max(0,i-1)],y=all[Math.min(all.length-1,i+1)],length=distance(x,y)||1;return {x:p.x-(y.y-x.y)/length*side*offset,y:p.y+(y.x-x.x)/length*side*offset};})});
  }
 }
 const stops=[0,total,...arcs,...hidden.flatMap(v=>[v.a,v.b]),...intervals.flatMap(v=>[v.a,v.b])].filter(v=>Number.isFinite(v)&&v>=0&&v<=total).sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>1e-9);
 for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i],mid=(a+b)/2;if(b-a<1e-9||hidden.some(v=>mid>=v.a&&mid<=v.b))continue;const wet=intervals.filter(v=>mid>=v.a&&mid<=v.b);if(wet.some(v=>v.kind==='ferry'))continue;pieces.push({from:pointAt(road.points,arcs,a),to:pointAt(road.points,arcs,b),opacity:wet.some(v=>v.kind==='ford')?.42:1,startDistance:a});}
 return {pieces,rails};
}
