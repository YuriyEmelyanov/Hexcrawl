/** Unmounted nearest exposed finite-river bank query. Analytic boundary
 * candidates include all constraint intersections; inside clearance is unused. */
import {createDetailGrid,detailCellPolygon,detailPositiveAreaIntersections,worldToDetailCell,type DetailCell,type WorldPoint} from './detailGrid.ts';
import {detailPointInPolygon} from './detailSizes.ts';
import {refinementWaterContains,type RefinementWater} from './geometryRefinementWater.ts';
import {refinementShoreIntervals,refinementShoreLocation,shoreCurvePoint,type RefinementShore,type ShoreCurve} from './geometryRefinementShore.ts';
type Capsule=RefinementWater['capsules'][number];
type Line=Readonly<{kind:'line';a:WorldPoint;b:WorldPoint}>;
type Circle=Readonly<{kind:'circle';center:WorldPoint;radius:number}>;
type Primitive=Line|Circle;
export type RefinementBankRequest=Readonly<{point:WorldPoint;parent6:DetailCell;origin:WorldPoint;riverId:number;sourceEdgeKey:string;side?:-1|1;sideAnchor?:WorldPoint;allowedPolygons?:readonly (readonly WorldPoint[])[];lakes?:readonly RefinementShore[]}>;
const freeze=<T>(a:T[])=>Object.freeze(a),finite=(p:WorldPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y),cross=(a:WorldPoint,b:WorldPoint)=>a.x*b.y-a.y*b.x;
const fail=(refs:string[])=>Object.freeze({status:'error' as const,code:'poi_conflict' as const,refs:freeze(refs),completeGeometryPlan:false as const});
const at=(l:Line,t:number)=>({x:l.a.x+t*(l.b.x-l.a.x),y:l.a.y+t*(l.b.y-l.a.y)});
function primitives(c:Capsule):Primitive[]{const n={x:-c.uy*c.radius,y:c.ux*c.radius};return [{kind:'line',a:{x:c.from.x+n.x,y:c.from.y+n.y},b:{x:c.to.x+n.x,y:c.to.y+n.y}},{kind:'line',a:{x:c.from.x-n.x,y:c.from.y-n.y},b:{x:c.to.x-n.x,y:c.to.y-n.y}},{kind:'circle',center:c.from,radius:c.radius},{kind:'circle',center:c.to,radius:c.radius}];}
/** All real roots on [0,1] through derivative subdivision (degree <=4).
 * Monotonic pieces use bounded bisection; derivative roots retain tangencies. */
function roots(coefficients:number[]):number[]{
 const c=[...coefficients],scale=Math.max(1,...c.map(Math.abs));while(c.length>1&&Math.abs(c[c.length-1])<1e-14*scale)c.pop();if(c.length===1)return [];
 const value=(t:number)=>c.reduceRight((a,b)=>a*t+b,0),critical=c.length===2?[]:roots(c.slice(1).map((n,i)=>n*(i+1))),stops=[0,...critical,1].sort((a,b)=>a-b),out:number[]=[];
 for(const t of stops)if(Math.abs(value(t))<1e-10*scale)out.push(t);
 for(let i=1;i<stops.length;i++){let a=stops[i-1],b=stops[i],va=value(a),vb=value(b);if(va*vb>=0)continue;for(let k=0;k<60;k++){const m=(a+b)/2,v=value(m);if(va*v<=0){b=m;vb=v;}else{a=m;va=v;}}out.push((a+b)/2);}
 return out.filter(t=>t>=0&&t<=1).sort((a,b)=>a-b).filter((t,i,a)=>i===0||t-a[i-1]>1e-9);
}
function intersections(a:Primitive,b:Primitive):WorldPoint[]{
 if(a.kind==='circle'&&b.kind==='line')return intersections(b,a);
 if(a.kind==='line'&&b.kind==='line'){const d={x:a.b.x-a.a.x,y:a.b.y-a.a.y},e={x:b.b.x-b.a.x,y:b.b.y-b.a.y},v={x:b.a.x-a.a.x,y:b.a.y-a.a.y},den=cross(d,e);if(Math.abs(den)<1e-12)return [a.a,a.b,b.a,b.b].filter(p=>detailPointInPolygon(p,[a.a,a.b])&&detailPointInPolygon(p,[b.a,b.b]));const t=cross(v,e)/den,u=cross(v,d)/den;return t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9?[at(a,Math.max(0,Math.min(1,t)))]:[];}
 if(a.kind==='line'&&b.kind==='circle'){const x=a.a.x-b.center.x,y=a.a.y-b.center.y,dx=a.b.x-a.a.x,dy=a.b.y-a.a.y;return roots([x*x+y*y-b.radius*b.radius,2*(x*dx+y*dy),dx*dx+dy*dy]).map(t=>at(a,t));}
 if(a.kind==='circle'&&b.kind==='circle'){const dx=b.center.x-a.center.x,dy=b.center.y-a.center.y,d=Math.hypot(dx,dy);if(d<1e-10||d>a.radius+b.radius+1e-9||d<Math.abs(a.radius-b.radius)-1e-9)return [];const x=(d*d+a.radius*a.radius-b.radius*b.radius)/(2*d),h=Math.sqrt(Math.max(0,a.radius*a.radius-x*x)),p={x:a.center.x+x*dx/d,y:a.center.y+x*dy/d};return [{x:p.x-h*dy/d,y:p.y+h*dx/d},{x:p.x+h*dy/d,y:p.y-h*dx/d}];}
 return [];
}
function curveCircle(curve:ShoreCurve,circle:Circle):WorldPoint[]{const x=[curve.from.x-circle.center.x,2*(curve.control.x-curve.from.x),curve.from.x-2*curve.control.x+curve.to.x],y=[curve.from.y-circle.center.y,2*(curve.control.y-curve.from.y),curve.from.y-2*curve.control.y+curve.to.y],c=[-circle.radius*circle.radius,0,0,0,0];for(let i=0;i<3;i++)for(let j=0;j<3;j++)c[i+j]+=x[i]*x[j]+y[i]*y[j];return roots(c).map(t=>shoreCurvePoint(curve,t));}
export function refinementNearestRiverBank(water:RefinementWater,input:RefinementBankRequest){
 if(!finite(input.point)||!finite(input.origin)||!Number.isSafeInteger(input.riverId)||input.riverId<1||!input.sourceEdgeKey||input.side!==undefined&&input.side!==1&&input.side!==-1||input.sideAnchor&&!finite(input.sideAnchor))return fail(['invalid_bank_request']);
 let parent:readonly WorldPoint[];try{parent=detailCellPolygon(createDetailGrid(6,input.origin),input.parent6);}catch{return fail(['invalid_parent']);}
 const polygons=input.allowedPolygons??[parent],lakes=[...(input.lakes??[])].sort((a,b)=>a.signature.localeCompare(b.signature));
 if(!polygons.length||polygons.length>4096||polygons.some(p=>p.length<3||p.some(p=>!finite(p))))return fail(['invalid_allowed_footprint']);
 const box={x0:Math.min(...parent.map(p=>p.x)),x1:Math.max(...parent.map(p=>p.x)),y0:Math.min(...parent.map(p=>p.y)),y1:Math.max(...parent.map(p=>p.y))};
 const local=[...water.capsules].filter(c=>Math.min(c.from.x,c.to.x)-c.radius<=box.x1&&Math.max(c.from.x,c.to.x)+c.radius>=box.x0&&Math.min(c.from.y,c.to.y)-c.radius<=box.y1&&Math.max(c.from.y,c.to.y)+c.radius>=box.y0).sort((a,b)=>a.riverId-b.riverId||a.sourceEdgeKey.localeCompare(b.sourceEdgeKey)||a.stepIndex-b.stepIndex);
 if(local.length>1024||lakes.reduce((n,l)=>n+l.loops.reduce((n,c)=>n+c.length,0),0)>24576)return fail(['bank_capacity']);
 const target=local.filter(c=>c.riverId===input.riverId&&c.sourceEdgeKey===input.sourceEdgeKey);if(!water.capsules.some(c=>c.riverId===input.riverId&&c.sourceEdgeKey===input.sourceEdgeKey))return fail(['unknown_river_ref',input.sourceEdgeKey]);
 const boundaries:Primitive[]=[...parent.map((a,i)=>({kind:'line' as const,a,b:parent[(i+1)%parent.length]})),...polygons.flatMap(p=>p.map((a,i)=>({kind:'line' as const,a,b:p[(i+1)%p.length]}))),...local.flatMap(primitives),...detailPositiveAreaIntersections(createDetailGrid(1,input.origin),parent).flatMap(({cell})=>{const p=detailCellPolygon(createDetailGrid(1,input.origin),cell);return p.map((a,i)=>({kind:'line' as const,a,b:p[(i+1)%p.length]}));})];
 if(target.length*4*(boundaries.length+lakes.reduce((n,l)=>n+l.loops.reduce((n,c)=>n+c.length,0),0))>2000000)return fail(['bank_capacity']);
 const candidates:{point:WorldPoint;riverId:number;sourceEdgeKey:string;stepIndex:number;side:-1|0|1;tangent:WorldPoint;distance:number;cell:DetailCell}[]=[];let work=0;
 for(const c of target){const length=c.length+c.radius*4+20,axis:Line={kind:'line',a:{x:c.from.x-c.ux*length,y:c.from.y-c.uy*length},b:{x:c.to.x+c.ux*length,y:c.to.y+c.uy*length}};
  for(const primitive of primitives(c)){const points:WorldPoint[]=[];
   if(primitive.kind==='line'){const dx=primitive.b.x-primitive.a.x,dy=primitive.b.y-primitive.a.y,t=Math.max(0,Math.min(1,((input.point.x-primitive.a.x)*dx+(input.point.y-primitive.a.y)*dy)/(dx*dx+dy*dy)));points.push(primitive.a,primitive.b,at(primitive,t));}
   else{const dx=input.point.x-primitive.center.x,dy=input.point.y-primitive.center.y,d=Math.hypot(dx,dy);if(d>1e-12)points.push({x:primitive.center.x+dx/d*primitive.radius,y:primitive.center.y+dy/d*primitive.radius});for(const [x,y]of [[1,0],[0,1],[-1,0],[0,-1]])points.push({x:primitive.center.x+x*primitive.radius,y:primitive.center.y+y*primitive.radius});}
   for(const other of [...boundaries,...(input.side?[axis]:[])]){work++;points.push(...intersections(primitive,other));}
   for(const lake of lakes){if(primitive.kind==='line'){const cut=refinementShoreIntervals(lake,{from:primitive.a,to:primitive.b});if(cut.status==='error')return fail(['invalid_lake_mask']);points.push(...cut.cuts.map(c=>c.point));}else for(const loop of lake.loops)for(const curve of loop){work++;points.push(...curveCircle(curve,primitive));}}
   for(const p of points){const inside=refinementWaterContains(water,p);if(inside.status==='error'||inside.clearance===null||Math.abs(inside.clearance)>1e-7||!detailPointInPolygon(p,parent)||!polygons.some(poly=>detailPointInPolygon(p,poly))||lakes.some(l=>refinementShoreLocation(l,p)==='inside'))continue;
    const signed=c.ux*(p.y-c.from.y)-c.uy*(p.x-c.from.x),side=signed>1e-9?1:signed< -1e-9?-1:0;
    if(input.side&&side!==0&&side!==input.side)continue;if(input.side&&input.sideAnchor&&input.side*(c.ux*(input.sideAnchor.y-c.from.y)-c.uy*(input.sideAnchor.x-c.from.x))< -1e-9)continue;
    candidates.push({point:Object.freeze({...p}),riverId:c.riverId,sourceEdgeKey:c.sourceEdgeKey,stepIndex:c.stepIndex,side,tangent:Object.freeze({x:c.ux,y:c.uy}),distance:Math.hypot(p.x-input.point.x,p.y-input.point.y),cell:Object.freeze(worldToDetailCell(createDetailGrid(1,input.origin),p))});
   }
  }
 }
 candidates.sort((a,b)=>(Math.abs(a.distance-b.distance)>1e-9?a.distance-b.distance:0)||a.cell.q-b.cell.q||a.cell.r-b.cell.r||a.point.x-b.point.x||a.point.y-b.point.y||a.stepIndex-b.stepIndex);
 const best=candidates[0];return Object.freeze({status:'prepared' as const,contact:best?Object.freeze(best):null,work,completeGeometryPlan:false as const});
}
