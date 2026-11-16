/** Presentation only: never writes or repairs accepted geographic data. */
export const finePoiLabel=(type:string,name?:string)=>name?`${type} ${name}`:type;
/** The one-mile view is a cartographic projection only. Fullness remains the
 * persisted river meaning while the visible full width occupies 10%..50% of
 * a one-mile hex. Source-six widths and accepted geometry are never inputs. */
export const FINE_HEX_WIDTH=Math.sqrt(3)*28/6;
export const fineRiverStrokeWidth=(fullness:number,hexWidth=FINE_HEX_WIDTH)=>
 Number.isInteger(fullness)&&fullness>=1&&fullness<=5&&Number.isFinite(hexWidth)&&hexWidth>0?hexWidth*fullness/10:0;
type Line={key:string;x1:number;y1:number;x2:number;y2:number};
export type FineRoad=Line&{roadId:number;segmentKey:string;kind:string};
export type FineCrossing={key:string;roadId:number;roadSegmentKey:string;riverId:number;x:number;y:number;kind:string};
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
  let half=0;
  for(const r of rivers){
   if(!r.key.startsWith(`river-segment-${c.riverId}-`))continue;
   const rx=r.x2-r.x1,ry=r.y2-r.y1,rl=Math.hypot(rx,ry);if(!Number.isFinite(rl)||rl<1e-9)continue;
   const along=((c.x-r.x1)*rx+(c.y-r.y1)*ry)/(rl*rl),distance=Math.abs((c.x-r.x1)*ry-(c.y-r.y1)*rx)/rl;
   if(along< -1e-7||along>1+1e-7||distance>1e-6)continue;
   const sine=Math.abs(ux*ry-uy*rx)/rl;
   // Use the same visible water width as the fine renderer. Nearly parallel
   // cases consume the clipped segment rather than inventing distant banks.
   half=Math.max(half,(fineRiverStrokeWidth(r.fullness)/2)/Math.max(sine,1e-6));
  }
  if(!half||!['bridge','ford','ferry'].includes(c.kind))continue;
  matched.push(c);const a=Math.max(0,t-half),b=Math.min(length,t+half);
  if(c.kind!=='bridge'){intervals.push({a,b,kind:c.kind});continue;}
  const extent=Math.max(11/6,half+.3),left=Math.max(0,t-extent),right=Math.min(length,t+extent);
  for(const side of [-1,1]){const points=[left,right].map(s=>{const p=at(s);return `${p.x-uy*side*4/6},${p.y+ux*side*4/6}`;}).join(' ');rails.push({key:`${c.key}:${side}`,points});}
 }
 const stops=[...new Set([0,length,...intervals.flatMap(i=>[i.a,i.b])])].sort((a,b)=>a-b);
 for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i];if(b-a<1e-9)continue;const mid=(a+b)/2,inside=intervals.filter(v=>mid>=v.a&&mid<=v.b);if(inside.some(v=>v.kind==='ferry'))continue;const p=at(a),q=at(b);pieces.push({x1:p.x,y1:p.y,x2:q.x,y2:q.y,opacity:inside.some(v=>v.kind==='ford')?.42:1});}
 return {pieces,rails,crossings:matched};
}

type Point={x:number;y:number};
export type FineRefinedRoad={roadId:number;sourceRoadSegmentKey:string;kind:string;points:readonly Point[];paint:readonly {from:Point;to:Point;poiMaskIds:readonly string[]}[]};
export type FineRefinedCrossing={key:string;roadId:number;roadSegmentKey:string;kind:string;fullness:number;roadDistance:number;roadTangent:Point;riverTangents:readonly Point[]};
const distance=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y);
const arcTable=(points:readonly Point[])=>{const arcs=[0];for(let i=1;i<points.length;i++)arcs.push(arcs[i-1]+distance(points[i-1],points[i]));return arcs;};
const pointAt=(points:readonly Point[],arcs:readonly number[],value:number)=>{const total=arcs[arcs.length-1];if(value<=0)return {...points[0]};if(value>=total)return {...points[points.length-1]};const i=arcs.findIndex((a,index)=>index>0&&a>=value),span=arcs[i]-arcs[i-1],t=(value-arcs[i-1])/span;return {x:points[i-1].x+(points[i].x-points[i-1].x)*t,y:points[i-1].y+(points[i].y-points[i-1].y)*t};};
const pathSlice=(points:readonly Point[],arcs:readonly number[],a:number,b:number)=>[pointAt(points,arcs,a),...points.filter((_,i)=>arcs[i]>a+1e-9&&arcs[i]<b-1e-9),pointAt(points,arcs,b)];
/** Reprojects only the visible road/water contact. Accepted centerlines,
 * crossing points and POI masks remain immutable. */
export function fineRefinedRoadPresentation(road:FineRefinedRoad,crossings:readonly FineRefinedCrossing[],scale:number){
 const pieces:Array<{from:Point;to:Point;opacity:number;startDistance:number}>=[],rails:Array<{key:string;points:Point[]}>=[];
 if(road.points.length<2||road.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||!Number.isFinite(scale)||scale<=0)return {pieces,rails};
 const arcs=arcTable(road.points),total=arcs[arcs.length-1];if(total<1e-9)return {pieces,rails};
 const hidden:Array<{a:number;b:number}>=[];let cursor=0;
 for(const part of road.paint){const length=distance(part.from,part.to),a=cursor,b=Math.min(total,cursor+length);if(part.poiMaskIds.length)hidden.push({a,b});cursor=b;}
 const intervals:Array<{a:number;b:number;kind:string;key:string}>=[];
 for(const c of [...crossings].filter(c=>c.roadId===road.roadId&&c.roadSegmentKey===road.sourceRoadSegmentKey).sort((a,b)=>a.key.localeCompare(b.key))){
  const width=fineRiverStrokeWidth(c.fullness)/scale;if(!width||!Number.isFinite(c.roadDistance)||!['bridge','ford','ferry'].includes(c.kind))continue;
  const rt=c.roadTangent,rl=Math.hypot(rt.x,rt.y);if(!rl)continue;
  let sine=0;for(const t of c.riverTangents){const tl=Math.hypot(t.x,t.y);if(tl)sine=Math.max(sine,Math.abs(rt.x*t.y-rt.y*t.x)/(rl*tl));}
  const half=(width/2)/Math.max(sine,1e-6),a=Math.max(0,c.roadDistance-half),b=Math.min(total,c.roadDistance+half);intervals.push({a,b,kind:c.kind,key:c.key});
  if(c.kind==='bridge'){
   const extent=Math.max((11/6)/scale,half+.3/scale),left=Math.max(0,c.roadDistance-extent),right=Math.min(total,c.roadDistance+extent),path=pathSlice(road.points,arcs,left,right),offset=(4/6)/scale;
   for(const side of [-1,1])rails.push({key:`${c.key}:${side}`,points:path.map((p,i,all)=>{const x=all[Math.max(0,i-1)],y=all[Math.min(all.length-1,i+1)],length=distance(x,y)||1;return {x:p.x-(y.y-x.y)/length*side*offset,y:p.y+(y.x-x.x)/length*side*offset};})});
  }
 }
 const stops=[0,total,...arcs,...hidden.flatMap(v=>[v.a,v.b]),...intervals.flatMap(v=>[v.a,v.b])].filter(v=>Number.isFinite(v)&&v>=0&&v<=total).sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>1e-9);
 for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i],mid=(a+b)/2;if(b-a<1e-9||hidden.some(v=>mid>=v.a&&mid<=v.b))continue;const wet=intervals.filter(v=>mid>=v.a&&mid<=v.b);if(wet.some(v=>v.kind==='ferry'))continue;pieces.push({from:pointAt(road.points,arcs,a),to:pointAt(road.points,arcs,b),opacity:wet.some(v=>v.kind==='ford')?.42:1,startDistance:a});}
 return {pieces,rails};
}
