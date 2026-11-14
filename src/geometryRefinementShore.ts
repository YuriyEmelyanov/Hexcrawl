/** Exact M/L/Q/Z lake-body geometry, not polygonized control points. */
import type {WorldPoint} from './detailGrid.ts';
import {refinementCellVertices,refinementVertexKey} from './geometryRefinementGrid.ts';
import type {DetailCell} from './detailGrid.ts';
export type ShoreCurve=Readonly<{from:WorldPoint;control:WorldPoint;to:WorldPoint}>;
export type RefinementShore=Readonly<{status:'prepared';loops:readonly (readonly ShoreCurve[])[];depths:readonly number[];signature:string}>;
const frozen=<T>(a:T[])=>Object.freeze(a),point=(p:WorldPoint)=>Object.freeze({...p});
const valid=(p:WorldPoint)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
const fail=(ref:string)=>Object.freeze({status:'error' as const,code:'invalid_shore' as const,refs:frozen([ref]),completeGeometryPlan:false as const});
const coefficients=(a:number,b:number,c:number)=>[a-2*b+c,2*(b-a),a] as const;
export function shoreQuadraticRoots(a:number,b:number,c:number):number[]{
 const scale=Math.max(1,Math.abs(a),Math.abs(b),Math.abs(c)),eps=Number.EPSILON*64*scale;
 if(Math.abs(a)<=eps)return Math.abs(b)<=eps?[]:[-c/b];
 const d=b*b-4*a*c,tolerance=Number.EPSILON*128*Math.max(1,b*b,Math.abs(4*a*c));if(d < -tolerance)return [];
 const root=Math.sqrt(Math.max(0,d));if(root===0)return [-b/(2*a)];const q=-.5*(b+(b>=0?root:-root));return [q/a,c/q].sort((x,y)=>x-y);
}
export function shoreCurvePoint(c:ShoreCurve,t:number):WorldPoint{if(t===0)return c.from;if(t===1)return c.to;const s=1-t;return point({x:s*s*c.from.x+2*s*t*c.control.x+t*t*c.to.x,y:s*s*c.from.y+2*s*t*c.control.y+t*t*c.to.y});}
function loopContains(loop:readonly ShoreCurve[],p:WorldPoint,boundary:boolean){
 let inside=false;
 for(const c of loop){const x=coefficients(c.from.x,c.control.x,c.to.x),y=coefficients(c.from.y,c.control.y,c.to.y);
  if(boundary){const useX=Math.abs(x[0])+Math.abs(x[1])>Math.abs(y[0])+Math.abs(y[1]),v=useX?x:y,target=useX?p.x:p.y;
   if(Math.abs(v[0])+Math.abs(v[1])<1e-14){if(Math.hypot(p.x-c.from.x,p.y-c.from.y)<1e-9)return true;}
   else for(const t of shoreQuadraticRoots(v[0],v[1],v[2]-target))if(t>=-1e-10&&t<=1+1e-10){const q=shoreCurvePoint(c,Math.max(0,Math.min(1,t)));if(Math.hypot(q.x-p.x,q.y-p.y)<1e-9)return true;}
   continue;
  }
  const extrema=Math.abs(y[0])>1e-14?-y[1]/(2*y[0]):-1,stops=[0,...(extrema>0&&extrema<1?[extrema]:[]),1];
  for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i],ya=shoreCurvePoint(c,a).y,yb=shoreCurvePoint(c,b).y;if((ya>p.y)===(yb>p.y))continue;
   const roots=shoreQuadraticRoots(y[0],y[1],y[2]-p.y),t=roots.find(t=>t>=a-1e-10&&t<=b+1e-10);if(t!==undefined&&shoreCurvePoint(c,Math.max(a,Math.min(b,t))).x>p.x)inside=!inside;
  }
 }
 return inside;
}
export function refinementShoreLocation(body:RefinementShore,p:WorldPoint):'inside'|'boundary'|'outside'{
 if(!valid(p))throw Error('Invalid shore query');
 // Boundary membership is inclusive, including hole shores.
 for(const loop of body.loops)if(loopContains(loop,p,true))return 'boundary';
 return body.loops.reduce((inside,loop)=>inside!==loopContains(loop,p,false),false)?'inside':'outside';
}
export function refinementShoreContains(body:RefinementShore,p:WorldPoint):boolean{return refinementShoreLocation(body,p)!=='outside';}
function finish(loops:ShoreCurve[][]):RefinementShore|ReturnType<typeof fail>{
 if(!loops.length||loops.length>4096||loops.reduce((n,l)=>n+l.length,0)>24576)return fail('capacity');
 for(const loop of loops){let area=0;if(loop.length<2)return fail('empty_loop');for(const c of loop){if(![c.from,c.control,c.to].every(valid))return fail('nonfinite');const x=coefficients(c.from.x,c.control.x,c.to.x),y=coefficients(c.from.y,c.control.y,c.to.y);area+=(x[1]*y[0]-x[0]*y[1])/3+x[2]*y[0]-y[2]*x[0]+x[2]*y[1]-y[2]*x[1];}if(Math.abs(area)<1e-10)return fail('zero_area');}
 const depths=loops.map((l,i)=>{const p=shoreCurvePoint(l[0],.5);return loops.filter((other,j)=>j!==i&&loopContains(other,p,false)).length;});
 const result=loops.map(loop=>frozen(loop.map(c=>Object.freeze({from:point(c.from),control:point(c.control),to:point(c.to)}))));
 return Object.freeze({status:'prepared',loops:frozen(result),depths:frozen(depths),signature:JSON.stringify(result)});
}
export function prepareRefinementShorePath(path:string,scale=1,origin:WorldPoint={x:0,y:0}){
 if(!path||path.length>2000000||!Number.isFinite(scale)||scale<=0||!valid(origin))return fail('path');
 const pattern=/[MLQZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,tokens=path.match(pattern)??[];
 if(path.replace(pattern,'').replace(/[\s,]/g,''))return fail('unsupported_path');
 const loops:ShoreCurve[][]=[];let i=0,current:WorldPoint|null=null,start:WorldPoint|null=null,loop:ShoreCurve[]=[];
 const read=()=>{if(i+1>=tokens.length||/^[MLQZ]$/.test(tokens[i])||/^[MLQZ]$/.test(tokens[i+1]))throw Error();const p={x:origin.x+Number(tokens[i++])*scale,y:origin.y+Number(tokens[i++])*scale};if(!valid(p))throw Error();return p;};
 try{while(i<tokens.length){const command=tokens[i++];if(command==='M'){if(current)throw Error();current=read();start=current;loop=[];}
  else if(command==='L'||command==='Q'){if(!current)throw Error();const control=command==='Q'?read():null,to=read();loop.push({from:current,control:control??{x:(current.x+to.x)/2,y:(current.y+to.y)/2},to});current=to;}
  else if(command==='Z'){if(!current||!start)throw Error();if(Math.hypot(current.x-start.x,current.y-start.y)>1e-12)loop.push({from:current,control:{x:(current.x+start.x)/2,y:(current.y+start.y)/2},to:start});loops.push(loop);current=null;start=null;}
  else throw Error();}if(current)throw Error();}catch{return fail('path');}
 return finish(loops);
}
/** Exact union boundary of coarse lake hex cells; shared internal edges vanish. */
export function prepareRefinementShoreCells(cells:readonly DetailCell[],origin:WorldPoint={x:0,y:0}){
 if(!valid(origin)||cells.length>4096)return fail('cells');const all=new Map<string,{from:{x:number;y:number};to:{x:number;y:number};count:number}>();
 try{for(const cell of new Map(cells.map(c=>[`${c.q},${c.r}`,c])).values()){const vs=refinementCellVertices(cell);for(let i=0;i<6;i++){const from=vs[i],to=vs[(i+1)%6],k=[refinementVertexKey(from),refinementVertexKey(to)].sort().join('|'),old=all.get(k);if(old)old.count++;else all.set(k,{from,to,count:1});}}}catch{return fail('cells');}
 const next=new Map([...all.values()].filter(e=>e.count===1).map(e=>[refinementVertexKey(e.from),e]));const loops:ShoreCurve[][]=[];
 const world=(v:{x:number;y:number})=>({x:origin.x+3*v.x,y:origin.y+3/Math.sqrt(3)*v.y});
 while(next.size){const start=[...next.keys()].sort()[0],loop:ShoreCurve[]=[];let k=start;
  do{const e=next.get(k);if(!e)return fail('boundary');next.delete(k);const a=world(e.from),b=world(e.to);loop.push({from:a,control:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},to:b});k=refinementVertexKey(e.to);if(loop.length>24576)return fail('capacity');}while(k!==start);loops.push(loop);
 }
 return finish(loops);
}
export function refinementShoreIntervals(body:RefinementShore,query:Readonly<{from:WorldPoint;to:WorldPoint}>){
 const dx=query.to.x-query.from.x,dy=query.to.y-query.from.y,length=Math.hypot(dx,dy);if(!valid(query.from)||!valid(query.to)||!Number.isFinite(length)||length<1e-10)return fail('query');
 const cuts:{fraction:number;loopIndex:number;curveIndex:number;shoreFraction:number;point:WorldPoint;overlap:boolean}[]=[];
 for(const [loopIndex,loop]of body.loops.entries())for(const [curveIndex,c]of loop.entries()){
  const x=coefficients(c.from.x,c.control.x,c.to.x),y=coefficients(c.from.y,c.control.y,c.to.y),a=x[0]*dy-y[0]*dx,b=x[1]*dy-y[1]*dx,d=(x[2]-query.from.x)*dy-(y[2]-query.from.y)*dx,overlap=Math.max(Math.abs(a),Math.abs(b),Math.abs(d))<1e-10;
  const alongA=x[0]*dx+y[0]*dy,alongB=x[1]*dx+y[1]*dy,extreme=Math.abs(alongA)>1e-14?-alongB/(2*alongA):-1;
  const roots=overlap?[0,...(extreme>0&&extreme<1?[extreme]:[]),1]:shoreQuadraticRoots(a,b,d);
  for(const t of roots)if(t>=-1e-10&&t<=1+1e-10){const p=shoreCurvePoint(c,Math.max(0,Math.min(1,t))),fraction=((p.x-query.from.x)*dx+(p.y-query.from.y)*dy)/(length*length);if(fraction>=-1e-10&&fraction<=1+1e-10)cuts.push({fraction:Math.max(0,Math.min(1,fraction)),loopIndex,curveIndex,shoreFraction:Math.max(0,Math.min(1,t)),point:p,overlap});}
 }
 cuts.sort((a,b)=>a.fraction-b.fraction||a.loopIndex-b.loopIndex||a.curveIndex-b.curveIndex);
 const stops=[0,...cuts.map(c=>c.fraction),1].sort((a,b)=>a-b).filter((v,i,a)=>i===0||v-a[i-1]>1e-10),intervals=[];
 for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i],t=(a+b)/2;if(refinementShoreContains(body,{x:query.from.x+t*dx,y:query.from.y+t*dy}))intervals.push(Object.freeze({startFraction:a,endFraction:b,startClipped:a===0,endClipped:b===1,startHits:frozen(cuts.filter(c=>Math.abs(c.fraction-a)<1e-9)),endHits:frozen(cuts.filter(c=>Math.abs(c.fraction-b)<1e-9))}));}
 const merged:typeof intervals=[];for(const row of intervals){const old=merged[merged.length-1];if(old&&Math.abs(old.endFraction-row.startFraction)<1e-10)merged[merged.length-1]=Object.freeze({...old,endFraction:row.endFraction,endClipped:row.endClipped,endHits:row.endHits});else merged.push(row);}
 return Object.freeze({status:'prepared' as const,intervals:frozen(merged),cuts:frozen(cuts.map(c=>Object.freeze(c)))});
}
