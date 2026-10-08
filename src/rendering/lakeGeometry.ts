import type { LakeCell } from './terrainStyle';
export type WaterPoint={x:number;y:number};
export type WaterSegment={key:string;x1:number;y1:number;x2:number;y2:number;width:number};
export type NaturalLakeCell=LakeCell&{lakeId?:number};
export type LakeShape={key:string;cells:NaturalLakeCell[];path:string;loops:WaterPoint[][];mouths:{key:string;path:string;anchor:WaterPoint}[];bounds:{x:number;y:number;width:number;height:number}};
export type LakeGeometryCache={entries:Map<string,{origin:WaterPoint;loops:WaterPoint[][];pointCount:number}>;points:number;hits:number;misses:number};
export function createLakeGeometryCache():LakeGeometryCache{return{entries:new Map(),points:0,hits:0,misses:0};}
const cellNormals=Array.from({length:6},(_,i)=>({x:Math.cos(i*Math.PI/3),y:Math.sin(i*Math.PI/3)}));
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const at=(p:WaterPoint)=>`${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
const pk=(p:WaterPoint)=>`${Math.round(p.x*1000)},${Math.round(p.y*1000)}`;
function random(s:string,seed:number){let h=seed>>>0;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return ((h^(h>>>16))>>>0)/4294967296;}
export function inLakeCell(p:WaterPoint,c:LakeCell,radius:number,tolerance=0):boolean{
 const dx=p.x-c.x,dy=p.y-c.y;
 if(Math.abs(dx)>radius+2*tolerance||Math.abs(dy)>radius+2*tolerance)return false;
 const limit=radius*Math.sqrt(3)/2+tolerance;
 for(const n of cellNormals)if(dx*n.x+dy*n.y>limit)return false;return true;
}
export function smoothLakeLoop(ps:WaterPoint[]):string{
 const mid=(a:WaterPoint,b:WaterPoint)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 let d=`M${at(mid(ps[ps.length-1],ps[0]))}`;
 for(let i=0;i<ps.length;i++)d+=`Q${at(ps[i])} ${at(mid(ps[i],ps[(i+1)%ps.length]))}`;
 return d+'Z';
}
// Smooth the signed distance field of the whole cell union, then contour it.
// This removes cell-corner geometry before adding seeded coastal variation.
function fieldShore(cells:LakeCell[],edges:{a:WaterPoint;b:WaterPoint}[],r:number,id:string,seed:number):WaterPoint[][]{
 const step=r*.07,x0=Math.min(...cells.map(c=>c.x))-r*1.3,y0=Math.min(...cells.map(c=>c.y))-r*1.3;
 const w=Math.ceil((Math.max(...cells.map(c=>c.x))+r*1.3-x0)/step)+1,h=Math.ceil((Math.max(...cells.map(c=>c.y))+r*1.3-y0)/step)+1;
 const preparedEdges=edges.map(e=>({...e,dx:e.b.x-e.a.x,dy:e.b.y-e.a.y,lengthSquared:(e.b.x-e.a.x)**2+(e.b.y-e.a.y)**2}));
 let field=new Float64Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p={x:x0+x*step,y:y0+y*step};let distanceSquared=Infinity;
  for(const e of preparedEdges){const px=p.x-e.a.x,py=p.y-e.a.y,t=Math.max(0,Math.min(1,(px*e.dx+py*e.dy)/e.lengthSquared));
   const ex=px-e.dx*t,ey=py-e.dy*t;distanceSquared=Math.min(distanceSquared,ex*ex+ey*ey);}
  field[y*w+x]=(cells.some(c=>inLakeCell(p,c,r))?1:-1)*Math.sqrt(distanceSquared);
 }
 const kernel=[1,8,28,56,70,56,28,8,1];
 const xi=Array.from({length:w},(_,x)=>Int32Array.from(kernel,(_,k)=>Math.max(0,Math.min(w-1,x+k-4))));
 const yi=Array.from({length:h},(_,y)=>Int32Array.from(kernel,(_,k)=>Math.max(0,Math.min(h-1,y+k-4))*w));
 for(let pass=0;pass<4;pass++){
  const horizontal=pass%2===0,next=new Float64Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=0;k<9;k++)v+=kernel[k]*field[horizontal?y*w+xi[x][k]:yi[y][k]+x];next[y*w+x]=v/256;}field=next;
 }
 const p1=random(id+':field1',seed)*6.283,p2=random(id+':field2',seed)*6.283,p3=random(id+':field3',seed)*6.283;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const xx=(x0+x*step-cells[0].x)/r,yy=(y0+y*step-cells[0].y)/r;
  const inset=r*(.24+.06*Math.sin(xx*1.8+yy*.9+p1)+.045*Math.sin(xx*.7-yy*2.2+p2)+.025*Math.cos(xx*3.1+yy*2.7+p3));
  field[y*w+x]-=inset;
 }
 type S={a:WaterPoint;b:WaterPoint};const segments:S[]=[];
 for(let y=0;y<h-1;y++)for(let x=0;x<w-1;x++){
  const ps=[{x:x0+x*step,y:y0+y*step},{x:x0+(x+1)*step,y:y0+y*step},{x:x0+(x+1)*step,y:y0+(y+1)*step},{x:x0+x*step,y:y0+(y+1)*step}];
  const vs=[field[y*w+x],field[y*w+x+1],field[(y+1)*w+x+1],field[(y+1)*w+x]],hits:WaterPoint[]=[];
  for(let k=0;k<4;k++){const n=(k+1)%4;if((vs[k]>0)===(vs[n]>0))continue;const t=vs[k]/(vs[k]-vs[n]);hits.push({x:ps[k].x+(ps[n].x-ps[k].x)*t,y:ps[k].y+(ps[n].y-ps[k].y)*t});}
  if(hits.length===2)segments.push({a:hits[0],b:hits[1]});
  else if(hits.length===4){segments.push({a:hits[0],b:hits[1]},{a:hits[2],b:hits[3]});}
 }
 const adjacency=new Map<string,S[]>();for(const s of segments)for(const p of [s.a,s.b]){const k=pk(p);adjacency.set(k,[...(adjacency.get(k)||[]),s]);}
 const used=new Set<S>(),loops:WaterPoint[][]=[];
 for(const first of segments){if(used.has(first))continue;const loop=[first.a];let s=first,p=first.a;
  while(!used.has(s)){used.add(s);p=pk(p)===pk(s.a)?s.b:s.a;loop.push(p);const n=adjacency.get(pk(p))?.find(e=>!used.has(e));if(!n)break;s=n;}
  if(loop.length>=4&&pk(loop[0])===pk(loop[loop.length-1])){loop.pop();loops.push(loop);}
 }return loops;
}
export function buildNaturalLakes(cells:NaturalLakeCell[],radius:number,seed:number,segments:WaterSegment[]=[],cache?:LakeGeometryCache):LakeShape[]{
 const remaining=new Map(cells.map(c=>[`${c.q},${c.r}`,c]));const groups:NaturalLakeCell[][]=[];
 // Components and identities both matter: unrelated lakes cannot inherit each
 // other's edge randomness, even if they use the same numeric lake id.
 for(const first of [...remaining.values()].sort((a,b)=>a.r-b.r||a.q-b.q)){
  if(!remaining.has(`${first.q},${first.r}`))continue;const group:NaturalLakeCell[]=[];const todo=[first];remaining.delete(`${first.q},${first.r}`);
  while(todo.length){const c=todo.pop()!;group.push(c);for(const[dq,dr]of directions){const k=`${c.q+dq},${c.r+dr}`,n=remaining.get(k);if(n&&n.lakeId===first.lakeId){remaining.delete(k);todo.push(n);}}}groups.push(group);
 }
 return groups.map(group=>{
  group.sort((a,b)=>a.r-b.r||a.q-b.q);const first=group[0];const id=`lake-${first.lakeId??'local'}-${first.q}-${first.r}`;
  const keys=new Set(group.map(c=>`${c.q},${c.r}`));type E={a:WaterPoint;b:WaterPoint;c:NaturalLakeCell;i:number};const edges:E[]=[];
  for(const c of group){const ps=Array.from({length:6},(_,i)=>({x:c.x+radius*Math.cos((i*60-30)*Math.PI/180),y:c.y+radius*Math.sin((i*60-30)*Math.PI/180)}));
   for(let i=0;i<6;i++)if(!keys.has(`${c.q+directions[i][0]},${c.r+directions[i][1]}`))edges.push({a:ps[i],b:ps[(i+1)%6],c,i});}
  let loops:WaterPoint[][]=[];
  const cacheKey=cache?JSON.stringify([radius,seed,id,group.map(c=>[c.q,c.r,(c.x-first.x).toFixed(9),(c.y-first.y).toFixed(9)])]):'';
  const cached=cache?.entries.get(cacheKey);
  if(cached){
   cache!.hits++;cache!.entries.delete(cacheKey);cache!.entries.set(cacheKey,cached);
   const dx=first.x-cached.origin.x,dy=first.y-cached.origin.y;
   loops=dx===0&&dy===0?cached.loops:cached.loops.map(loop=>loop.map(p=>({x:p.x+dx,y:p.y+dy})));
  }else if(group.length>1)loops=fieldShore(group,edges,radius,id,seed);
  if(group.length===1&&!cached){
   const c=group[0],rotation=random(id+':rotation',seed)*Math.PI*2;
   const p2=random(id+':two',seed)*Math.PI*2,p3=random(id+':three',seed)*Math.PI*2,p5=random(id+':five',seed)*Math.PI*2;
   const oval=random(id+':oval',seed)*.07;
   const ox=(random(id+':ox',seed)-.5)*radius*.065,oy=(random(id+':oy',seed)-.5)*radius*.065;
   // A free shoreline inside the hex's inscribed circle. The six corners of
   // the cell play no role in its shape; connected river mouths are added below.
   loops.splice(0,loops.length,Array.from({length:20},(_,i)=>{
    const a=i*Math.PI/10+rotation;
    const rho=radius*Math.min(.80,Math.max(.38,.61+(.09+oval)*Math.sin(2*a+p2)+.11*Math.sin(3*a+p3)+.055*Math.sin(5*a+p5)));
    return{x:c.x+ox+Math.cos(a)*rho,y:c.y+oy+Math.sin(a)*rho};
   }));
  }
  if(cache&&!cached){
   cache.misses++;const pointCount=loops.reduce((n,loop)=>n+loop.length,0);
   if(pointCount<=100000){
    while(cache.entries.size>=64||cache.points+pointCount>100000){const key=cache.entries.keys().next().value;if(key===undefined)break;const old=cache.entries.get(key)!;cache.points-=old.pointCount;cache.entries.delete(key);}
    cache.entries.set(cacheKey,{origin:{x:first.x,y:first.y},loops,pointCount});cache.points+=pointCount;
   }
  }
  const mouths:LakeShape['mouths']=[];const seen=new Set<string>();
  for(const s of segments)for(const a of [{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}]){
   const touching=group.filter(c=>inLakeCell(a,c,radius,.03));if(!touching.length||seen.has(pk(a)))continue;
   // Only visible river ends on the exposed shore require a connector.
   if(!edges.some(e=>Math.hypot(a.x-e.a.x,a.y-e.a.y)<.05||Math.hypot(a.x-e.b.x,a.y-e.b.y)<.05))continue;
   seen.add(pk(a));const c=touching.sort((c,d)=>Math.hypot(c.x-a.x,c.y-a.y)-Math.hypot(d.x-a.x,d.y-a.y))[0];
   const dx=c.x-a.x,dy=c.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
   const half=s.width*.55,endHalf=Math.max(s.width*.7,radius*.18);
   const point=(t:number,w:number)=>({x:a.x+dx*t+nx*w,y:a.y+dy*t+ny*w});
   const path=`M${at(point(0,half))}C${at(point(.3,half))} ${at(point(.7,endHalf))} ${at(point(1,endHalf))}L${at(point(1,-endHalf))}C${at(point(.7,-endHalf))} ${at(point(.3,-half))} ${at(point(0,-half))}Z`;
   mouths.push({key:pk(a),path,anchor:a});
  }
  const minX=Math.min(...group.map(c=>c.x))-radius*1.6,minY=Math.min(...group.map(c=>c.y))-radius*1.6;
  return{key:id,cells:group,path:loops.map(smoothLakeLoop).join(''),loops,mouths,bounds:{x:minX,y:minY,width:Math.max(...group.map(c=>c.x))-minX+radius*1.6,height:Math.max(...group.map(c=>c.y))-minY+radius*1.6}};
 });
}
