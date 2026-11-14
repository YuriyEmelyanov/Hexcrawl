/** Unmounted finite river-water geometry. A round-joined/capped polyline is
 * the union of finite segment capsules. Widths are supplied by the existing
 * renderer in world units; this module does not calibrate F or change RNG. */
import type {WorldPoint} from './detailGrid.ts';
import {prepareRefinementBoundaryRoutes} from './geometryRefinementExits.ts';
type Path=Readonly<{riverId:number;sourceEdgeKey:string;fullness:number;points:readonly WorldPoint[]}>;
type Ref=Readonly<{riverId:number;sourceEdgeKey:string;stepIndex:number}>;
type Capsule=Ref&Readonly<{from:WorldPoint;to:WorldPoint;radius:number;length:number;ux:number;uy:number}>;
export type RefinementWater=Readonly<{status:'prepared';capsules:readonly Capsule[];completeGeometryPlan:false}>;
const freeze=<T>(a:T[])=>Object.freeze(a);
const finite=(p:WorldPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const lexical=(a:string,b:string)=>a<b?-1:a>b?1:0;
const refKey=(r:Ref)=>JSON.stringify([r.riverId,r.sourceEdgeKey,r.stepIndex]);
const fail=(code:'invalid_water'|'invalid_query'|'capacity',refs:string[]=[])=>Object.freeze({status:'error' as const,code,refs:freeze(refs),completeGeometryPlan:false as const});
export function prepareRefinementWater(input:Readonly<{paths:readonly Path[];widthByFullness:ReadonlyMap<number,number>}>){
 if(input.paths.length>4096||input.paths.reduce((n,p)=>n+Math.max(0,p.points.length-1),0)>24576)return fail('capacity');
 const seen=new Set<string>(),capsules:Capsule[]=[];
 for(const path of [...input.paths].sort((a,b)=>a.riverId-b.riverId||lexical(a.sourceEdgeKey,b.sourceEdgeKey))){
  const id=JSON.stringify([path.riverId,path.sourceEdgeKey]),width=input.widthByFullness.get(path.fullness);
  if(!Number.isSafeInteger(path.riverId)||path.riverId<1||!path.sourceEdgeKey||seen.has(id)||!Number.isInteger(path.fullness)||path.fullness<1||path.fullness>5||width===undefined||!Number.isFinite(width)||width<=0||path.points.length<2||path.points.some(p=>!finite(p)))return fail('invalid_water',[id]);seen.add(id);
  for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i],length=Math.hypot(b.x-a.x,b.y-a.y);
   if(!Number.isFinite(length)||length<1e-10)return fail('invalid_water',[id]);
   capsules.push(Object.freeze({riverId:path.riverId,sourceEdgeKey:path.sourceEdgeKey,stepIndex:i-1,from:Object.freeze({...a}),to:Object.freeze({...b}),radius:width/2,length,ux:(b.x-a.x)/length,uy:(b.y-a.y)/length}));
  }
 }
 return Object.freeze({status:'prepared' as const,capsules:freeze(capsules),completeGeometryPlan:false as const});
}
/** Clearance is minimum distance-to-axis minus radius. Outside the union it
 * is the distance to water; inside, it is NOT distance to the exposed bank. */
export function refinementWaterContains(water:RefinementWater,p:WorldPoint,riverId?:number){
 if(!finite(p)||riverId!==undefined&&(!Number.isSafeInteger(riverId)||riverId<1))return fail('invalid_query');
 let clearance=Infinity;
 for(const c of water.capsules){if(riverId!==undefined&&c.riverId!==riverId)continue;
  const t=Math.max(0,Math.min(c.length,(p.x-c.from.x)*c.ux+(p.y-c.from.y)*c.uy));
  clearance=Math.min(clearance,Math.hypot(p.x-c.from.x-t*c.ux,p.y-c.from.y-t*c.uy)-c.radius);
 }
 if(Number.isNaN(clearance))return fail('invalid_query');
 return Object.freeze({status:'prepared' as const,inside:clearance<=1e-10,clearance:Number.isFinite(clearance)?clearance:null});
}
/** Exact finite query intersection with union of capsules: clipped rectangle
 * plus both endpoint circles. No infinite-line width/sin approximation.
 * Optional river filtering selects source paint only, not the exposed bank of
 * the global water union at a confluence; callers must validate that separately. */
export function refinementWaterIntervals(water:RefinementWater,query:Readonly<{from:WorldPoint;to:WorldPoint}>,riverId?:number){
 if(!finite(query.from)||!finite(query.to)||riverId!==undefined&&(!Number.isSafeInteger(riverId)||riverId<1))return fail('invalid_query');
 const dx=query.to.x-query.from.x,dy=query.to.y-query.from.y,length=Math.hypot(dx,dy);
 if(!Number.isFinite(length)||length<1e-10)return fail('invalid_query');
 const qx=dx/length,qy=dy/length,raw:{a:number;b:number;refs:Ref[]}[]=[],epsilon=1e-10;
 const add=(a:number,b:number,c:Capsule)=>{if(b < -epsilon||a>length+epsilon)return;a=Math.min(length,Math.max(0,a));b=Math.max(0,Math.min(length,b));if(a>b+epsilon)return;if(a>b)a=b=(a+b)/2;raw.push({a,b,refs:[Object.freeze({riverId:c.riverId,sourceEdgeKey:c.sourceEdgeKey,stepIndex:c.stepIndex})]});};
 for(const c of water.capsules){if(riverId!==undefined&&c.riverId!==riverId)continue;
  const ax=query.from.x-c.from.x,ay=query.from.y-c.from.y,x0=ax*c.ux+ay*c.uy,y0=c.ux*ay-c.uy*ax,xd=qx*c.ux+qy*c.uy,yd=c.ux*qy-c.uy*qx;
  let lo=0,hi=length,legal=true;
  for(const [v,d,min,max]of [[x0,xd,0,c.length],[y0,yd,-c.radius,c.radius]]){
   if(Math.abs(d)<=Number.EPSILON*16){if(v<min-epsilon||v>max+epsilon)legal=false;continue;}
   const a=(min-v)/d,b=(max-v)/d;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi+epsilon)legal=false;
  }
  if(legal)add(lo,hi,c);
  for(const center of [c.from,c.to]){
   const ax=center.x-query.from.x,ay=center.y-query.from.y,along=ax*qx+ay*qy,perp=ax*qy-ay*qx,disc=c.radius*c.radius-perp*perp,tolerance=Number.EPSILON*64*Math.max(1,c.radius*c.radius,perp*perp);
   if(!Number.isFinite(disc)||!Number.isFinite(along))return fail('invalid_query');if(disc < -tolerance)continue;
   const root=Math.sqrt(Math.max(0,disc));add(along-root,along+root,c);
  }
 }
 raw.sort((a,b)=>a.a-b.a||a.b-b.b||lexical(refKey(a.refs[0]),refKey(b.refs[0])));
 const merged:typeof raw=[];for(const row of raw){const old=merged[merged.length-1];if(old&&row.a<=old.b+epsilon){old.b=Math.max(old.b,row.b);old.refs.push(...row.refs);}else merged.push({...row,refs:[...row.refs]});}
 const point=(s:number)=>Object.freeze(s===0?{...query.from}:s===length?{...query.to}:{x:query.from.x+s*qx,y:query.from.y+s*qy});
 const intervals=merged.map(row=>{const contributors=[...new Map(row.refs.map(r=>[refKey(r),r])).values()].sort((a,b)=>a.riverId-b.riverId||lexical(a.sourceEdgeKey,b.sourceEdgeKey)||a.stepIndex-b.stepIndex);return Object.freeze({startFraction:row.a/length,endFraction:row.b/length,from:point(row.a),to:point(row.b),startClipped:row.a<=epsilon,endClipped:row.b>=length-epsilon,touchOnly:row.b-row.a<=epsilon,contributors:freeze(contributors)});});
 return Object.freeze({status:'prepared' as const,intervals:freeze(intervals),completeGeometryPlan:false as const});
}
/** Returns the first outside→water contact, or an explicit inside-start state.
 * A clipped query endpoint is not asserted to be a physical bank. */
export function refinementWaterFirstContact(water:RefinementWater,query:Readonly<{from:WorldPoint;to:WorldPoint}>,riverId?:number){
 const rows=refinementWaterIntervals(water,query,riverId);if(rows.status==='error')return rows;
 const start=refinementWaterContains(water,query.from,riverId);if(start.status==='error')return start;
 if(start.inside)return Object.freeze({status:'starts_in_water' as const,contact:null});
 const first=rows.intervals[0];return Object.freeze({status:'prepared' as const,contact:first?Object.freeze({point:first.from,fraction:first.startFraction,touchOnly:first.touchOnly,contributors:first.contributors}):null});
}

/** Atomic unmounted route+water candidate. A missing/invalid width returns no
 * partial routes. Lake-body clipping and dependent POI/road work remain pending. */
export function prepareRefinementWetRoutes(input:Parameters<typeof prepareRefinementBoundaryRoutes>[0],context:Parameters<typeof prepareRefinementBoundaryRoutes>[1],widthByFullness:ReadonlyMap<number,number>){
 const routes=prepareRefinementBoundaryRoutes(input,context);if(routes.status==='error')return routes;
 const water=prepareRefinementWater({paths:routes.paths,widthByFullness});if(water.status==='error')return water;
 return Object.freeze({...routes,water,completeGeometryPlan:false as const});
}
