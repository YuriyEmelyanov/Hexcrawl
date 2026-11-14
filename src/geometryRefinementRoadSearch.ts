/** Unmounted finite visibility-graph road search. Shortest in the supplied
 * graph, not a proof of globally shortest continuous obstacle routing. */
import type {WorldPoint} from './detailGrid.ts';
import {shoreQuadraticRoots,shoreCurvePoint,refinementShoreIntervals,type RefinementShore} from './geometryRefinementShore.ts';
import {refinementWaterIntervals,type RefinementWater} from './geometryRefinementWater.ts';
type Point=WorldPoint;
type Poly=readonly Point[];
const EPS=1e-9,finite=(p:Point)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const numeric=(a:Point,b:Point)=>a.x-b.x||a.y-b.y;
const frozenPoints=(p:Poly)=>Object.freeze(p.map(p=>Object.freeze({...p})));
type Q=readonly [number,number,number];
const value=(q:Q,t:number)=>(q[0]*t+q[1])*t+q[2];
const integral=(q:Q,a:number,b:number)=>q[0]*(b*b*b-a*a*a)/3+q[1]*(b*b-a*a)/2+q[2]*(b-a);
function pointQ(a:Point,v:Point,p:Point):Q {const x=a.x-p.x,y=a.y-p.y;return [v.x*v.x+v.y*v.y,2*(x*v.x+y*v.y),x*x+y*y];}
/** Exact lower-envelope integration of squared point-to-polyline distance.
 * Clamped segment projections split quadratics; pairwise roots split their
 * minimum. No camera rounding or fixed sampling; subdivision invariant. */
function edgeIntegral(a:Point,b:Point,old:Poly,tick:()=>void){
 const v={x:b.x-a.x,y:b.y-a.y},stops=[0,1];
 const pieces=old.slice(1).map((d,i)=>{tick();const c=old[i],w={x:d.x-c.x,y:d.y-c.y},den=w.x*w.x+w.y*w.y;
  const t0=((a.x-c.x)*w.x+(a.y-c.y)*w.y)/den,tv=(v.x*w.x+v.y*w.y)/den;
  if(tv!==0)for(const z of [-t0/tv,(1-t0)/tv])if(z>0&&z<1)stops.push(z);
  return {c,d,w,den,t0,tv};});
 stops.sort((a,b)=>a-b);let total=0;
 for(let j=1;j<stops.length;j++){const lo=stops[j-1],hi=stops[j];if(hi<=lo)continue;const mid=(lo+hi)/2;
  const qs=pieces.map(p=>{tick();const t=p.t0+p.tv*mid;if(t<=0)return pointQ(a,v,p.c);if(t>=1)return pointQ(a,v,p.d);
   const base=pointQ(a,v,p.c),dot=(a.x-p.c.x)*p.w.x+(a.y-p.c.y)*p.w.y,dv=v.x*p.w.x+v.y*p.w.y;
   return [base[0]-dv*dv/p.den,base[1]-2*dot*dv/p.den,base[2]-dot*dot/p.den] as Q;});
  const cuts=[lo,hi];for(let i=0;i<qs.length;i++)for(let k=0;k<i;k++){tick();const q=qs[i],r=qs[k];for(const t of shoreQuadraticRoots(q[0]-r[0],q[1]-r[1],q[2]-r[2]))if(t>lo&&t<hi)cuts.push(t);}
  cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){tick();const a=cuts[i-1],b=cuts[i],t=(a+b)/2;let q=qs[0];for(const r of qs)if(value(r,t)<value(q,t))q=r;total+=Math.max(0,integral(q,a,b));}
 }
 return total*dist(a,b);
}
function clean(p:Poly){return p.filter((v,i)=>i===0||dist(v,p[i-1])>1e-12);}
export function refinementRoadObjective(points:Poly,original:Poly){
 if(points.length<2||original.length<2||[...points,...original].some(p=>!finite(p)))throw Error('invalid_road_objective');
 const path=clean(points),old=clean(original);if([...path,...old].some((p,i,a)=>i>0&&!Number.isFinite(dist(p,a[i-1])))||path.length<2||old.length<2||path.length>512||old.length>64)throw Error('invalid_road_objective');
 let lengthMiles=0,area=0,work=0;const tick=()=>{if(++work>2000000)throw Error('road_objective_capacity');};
 for(let i=1;i<path.length;i++){lengthMiles+=dist(path[i-1],path[i]);area+=edgeIntegral(path[i-1],path[i],old,tick);}
 return Object.freeze({lengthMiles,deviationSquareMiles:area/lengthMiles});
}
export function searchRefinementRoad(input:Readonly<{from:Point;to:Point;original:Poly;vertices:Poly;legal:(a:Point,b:Point,charge:()=>void)=>boolean;maxWork?:number;cancelled?:()=>boolean}>){
 let work=0;const max=input.maxWork??2000000;
 const error=(reason:string)=>Object.freeze({status:'error' as const,code:reason,work,completeGeometryPlan:false as const});
 if(!Number.isSafeInteger(max)||max<1||!finite(input.from)||!finite(input.to)||dist(input.from,input.to)<1e-12||input.original.length<2||input.original.length>64||input.original.some(p=>!finite(p))||input.vertices.some(p=>!finite(p)))return error('invalid_search');
 const old=clean(input.original);if(old.length<2)return error('invalid_search');
 const unique=new Map<string,Point>();for(const p of [input.from,input.to,...input.vertices])unique.set(JSON.stringify([p.x===0?0:p.x,p.y===0?0:p.y]),{...p});
 const points=[...unique.values()].sort(numeric);if(points.length>512)return error('search_incomplete_capacity');
 const index=(p:Point)=>points.findIndex(q=>q.x===p.x&&q.y===p.y),start=index(input.from),target=index(input.to);
 const tick=()=>{if(input.cancelled?.())throw Error('search_cancelled');if(++work>max)throw Error('search_incomplete_budget');};
 type Label={length:number;area:number;path:number[]};
 const compare=(a:Label,b:Label)=>{if(Math.abs(a.length-b.length)>EPS)return a.length-b.length;const ad=a.area/Math.max(a.length,EPS),bd=b.area/Math.max(b.length,EPS);if(Math.abs(ad-bd)>EPS)return ad-bd;for(let i=0;i<Math.min(a.path.length,b.path.length);i++)if(a.path[i]!==b.path[i])return a.path[i]-b.path[i];return a.path.length-b.path.length;};
 const labels=new Map<number,Label>([[start,{length:0,area:0,path:[start]}]]),settled=new Set<number>(),edges=new Map<string,{length:number;area:number}|null>();
 try{while(true){tick();let current=-1;for(const [i,label]of labels)if(!settled.has(i)&&(current<0||compare(label,labels.get(current)!)<0))current=i;
   if(current<0)return error('no_path_in_candidate_graph');const label=labels.get(current)!;
   if(current===target)return Object.freeze({status:'prepared' as const,points:frozenPoints(label.path.map(i=>points[i])),lengthMiles:label.length,deviationSquareMiles:label.area/label.length,work,optimality:'supplied_visibility_graph_only' as const,completeGeometryPlan:false as const});
   settled.add(current);
   for(let i=0;i<points.length;i++){tick();if(settled.has(i))continue;const k=[Math.min(i,current),Math.max(i,current)].join(':');let edge=edges.get(k);
    if(edge===undefined){const a=points[current],b=points[i],length=dist(a,b);if(!Number.isFinite(length))return error('invalid_search');edge=length>1e-12&&input.legal(a,b,tick)?{length,area:edgeIntegral(a,b,old,tick)}:null;edges.set(k,edge);}
    if(!edge)continue;const candidate={length:label.length+edge.length,area:label.area+edge.area,path:[...label.path,i]},previous=labels.get(i);if(!previous||compare(candidate,previous)<0)labels.set(i,candidate);
   }
  }}catch(e){if(e instanceof Error&&['search_cancelled','search_incomplete_budget'].includes(e.message))return error(e.message);throw e;}
}

/** Exact edge admissibility, finite candidate vertices. Curved obstacles are
 * queried analytically; sampled candidate vertices do not prove completeness. */
export function prepareRefinementDryRoadPath(input:Readonly<{from:Point;to:Point;original:Poly;land:RefinementShore;lakes:readonly RefinementShore[];water:RefinementWater;maxWork?:number;cancelled?:()=>boolean}>){
 const vertices:Point[]=[];
 for(const body of [input.land,...input.lakes])for(const loop of body.loops)for(const curve of loop)for(const t of [0,.25,.5,.75])vertices.push(shoreCurvePoint(curve,t));
 // Circumscribed octagons give useful cap detours without mistaking polygon
 // approximations for the actual finite round water envelope.
 for(const c of input.water.capsules)for(const end of [c.from,c.to])for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=c.radius/Math.cos(Math.PI/8)+1e-7;vertices.push({x:end.x+r*Math.cos(angle),y:end.y+r*Math.sin(angle)});}
 return searchRefinementRoad({...input,vertices,legal:(a,b,charge)=>{
  for(const loop of input.land.loops)for(const _ of loop)charge();
  for(let i=0;i<input.water.capsules.length;i++)charge();
  const query={from:a,to:b},dry=refinementShoreIntervals(input.land,query);
  if(dry.status==='error'||dry.intervals.length!==1||!dry.intervals[0].startClipped||!dry.intervals[0].endClipped)return false;
  for(const lake of input.lakes){for(const loop of lake.loops)for(const _ of loop)charge();const wet=refinementShoreIntervals(lake,query);if(wet.status==='error'||wet.intervals.some(i=>(i.endFraction-i.startFraction)*dist(a,b)>1e-9))return false;}
  const wet=refinementWaterIntervals(input.water,query);return wet.status==='prepared'&&wet.intervals.length===0;
 }});
}
