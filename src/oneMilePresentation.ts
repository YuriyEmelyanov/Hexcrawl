/** Presentation only: never writes or repairs accepted geographic data. */
export const finePoiLabel=(type:string,name?:string)=>name?`${type} ${name}`:type;
/** Source-six and fine artwork share SVG/world coordinates. Changing the grid
 * changes the water/hex ratio, never the existing visible water width. */
export const fineRiverStrokeWidth=(sourceWidth:number)=>Number.isFinite(sourceWidth)&&sourceWidth>0?sourceWidth:0;
type Line={key:string;x1:number;y1:number;x2:number;y2:number};
export type FineRoad=Line&{roadId:number;segmentKey:string;kind:string};
export type FineCrossing={key:string;roadId:number;roadSegmentKey:string;riverId:number;x:number;y:number;kind:string};
type River=Line&{width:number};
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
   const rx=r.x2-r.x1,ry=r.y2-r.y1,rl=Math.hypot(rx,ry);if(!Number.isFinite(rl)||rl<1e-9||!Number.isFinite(r.width)||r.width<=0)continue;
   const along=((c.x-r.x1)*rx+(c.y-r.y1)*ry)/(rl*rl),distance=Math.abs((c.x-r.x1)*ry-(c.y-r.y1)*rx)/rl;
   if(along< -1e-7||along>1+1e-7||distance>1e-6)continue;
   const sine=Math.abs(ux*ry-uy*rx)/rl;
   // Use the same visible water width as the fine renderer. Nearly parallel
   // cases consume the clipped segment rather than inventing distant banks.
   half=Math.max(half,(fineRiverStrokeWidth(r.width)/2)/Math.max(sine,1e-6));
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
