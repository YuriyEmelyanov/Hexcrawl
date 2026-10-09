import {FOREST_EDGES, WOODLAND_COMPOSITIONS} from './forestTemplates.ts';
import {forestFamily,isWoodland as regularWoodland} from './forestStyle.ts';
export type ForestCell={q:number;r:number;x:number;y:number;biome:string;woodlandStyle?:'islands'|'clearings';straightSides?:number[];openSides?:number[];lake?:boolean};
const isWoodland=(biome:string)=>regularWoodland(biome)||biome==='swamp_forest';
type Point=number[];
type IndexedPoint={point:Point;index:number};
function pointIndex(points:Point[],size:number){
 const grid=new Map<string,IndexedPoint[]>();
 points.forEach((point,index)=>{const k=`${Math.floor(point[0]/size)},${Math.floor(point[1]/size)}`;const bucket=grid.get(k)??[];bucket.push({point,index});grid.set(k,bucket);});
 return grid;
}
type Cubic={start:Point;c1:Point;c2:Point;end:Point};
export type WoodlandPatch={key:string;cell:ForestCell;mode:'islands'|'clearings';composition:string;rotation:number;paths:string[]};
export type ForestGeometry={canopy:string[];bridges:string[];clearingBridges:string[];woodlands:WoodlandPatch[]};
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const key=(c:{q:number;r:number})=>`${c.q},${c.r}`;
const pointKey=(p:Point)=>p.map(v=>Math.round(v*10000)).join(',');
export function forestHash(s:string,seed:number){let h=(2166136261^seed)>>>0;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
export function reflectForestEdge(edge:Cubic[],v:number):Cubic[]{
 const p=([x,y]:Point)=>[v&1?1-x:x,y===0?0:v&2?-y:y];
 return (v&1?[...edge].reverse():edge).map(s=>({start:p(v&1?s.end:s.start),c1:p(v&1?s.c2:s.c1),c2:p(v&1?s.c1:s.c2),end:p(v&1?s.start:s.end)}));
}
function transform(ss:Cubic[],f:(p:Point)=>Point){return ss.map(s=>({start:f(s.start),c1:f(s.c1),c2:f(s.c2),end:f(s.end)}));}
function path(ss:Cubic[]){const p=(a:Point)=>a.map(x=>x.toFixed(3)).join(',');return 'M'+p(ss[0].start)+ss.map(s=>'C'+p(s.c1)+' '+p(s.c2)+' '+p(s.end)).join('')+'Z';}
export function woodlandPaths(q:number,r:number,x:number,y:number,radius:number,seed:number){
 const h=forestHash(`woodland:${q},${r}`,seed),comp=WOODLAND_COMPOSITIONS[h%WOODLAND_COMPOSITIONS.length];
 const rotation=(h>>>8)%6,a=(rotation*60-30)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return {composition:comp.id,rotation:rotation*60,paths:comp.loops.map(loop=>path(transform(loop.segments,([px,py])=>[x+radius*(px*c-py*s),y+radius*(px*s+py*c)])))};
}
export function buildForestGeometry(cells:ForestCell[],radius:number,seed:number):ForestGeometry{
 const forest=cells.filter(c=>forestFamily(c.biome)),byKey=new Map(forest.map(c=>[key(c),c]));
 // Clearings belong to continuous canopy; boundary woodland is rendered as islands.
 // Requiring six dense neighbours also keeps holes away from the outer crown.
 const woodlands:WoodlandPatch[]=forest.filter(c=>isWoodland(c.biome)&&!c.lake).map(c=>({key:key(c),cell:c,
  mode:c.biome==='swamp_forest'?'islands':c.woodlandStyle??(directions.every(([dq,dr])=>{const n=byKey.get(`${c.q+dq},${c.r+dr}`);return n&&!isWoodland(n.biome);})?'clearings':'islands'),
  ...woodlandPaths(c.q,c.r,c.x,c.y,radius,seed)}));
 const islands=new Set(woodlands.filter(p=>p.mode==='islands').map(p=>p.key));
 const dense=forest.filter(c=>!islands.has(key(c))),keys=new Set(dense.map(key));
 type Edge={a:Point;b:Point;cell:ForestCell;side:number};
 const edges:Edge[]=[];
 for(const cell of dense){
  const vs=Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return[cell.x+radius*Math.cos(a),cell.y+radius*Math.sin(a)];});
  for(let side=0;side<6;side++){const [dq,dr]=directions[side];if(!keys.has(`${cell.q+dq},${cell.r+dr}`))edges.push({a:vs[side],b:vs[(side+1)%6],cell,side});}
 }
 const starts=new Map(edges.map(e=>[pointKey(e.a),e])),used=new Set<Edge>(),canopy:string[]=[],boundary:Point[]=[],openBoundary:Point[]=[];
 for(const first of edges){if(used.has(first))continue;const loop:Edge[]=[];let e:Edge|undefined=first;
  while(e&&!used.has(e)){used.add(e);loop.push(e);e=starts.get(pointKey(e.b));}
  const segments:Cubic[]=[];
  for(let i=0;i<loop.length;i++){
   const {a,b,cell,side}=loop[i],h=forestHash(`edge:${key(cell)}:${side}`,seed),dx=b[0]-a[0],dy=b[1]-a[1];
   const straight=cell.straightSides?.includes(side);
   const ss=straight?[{start:a,c1:[a[0]+dx/3,a[1]+dy/3],c2:[a[0]+dx*2/3,a[1]+dy*2/3],end:b}]:transform(reflectForestEdge(FOREST_EDGES[h%FOREST_EDGES.length].segments,(h>>>12)%4),([x,y])=>[a[0]+dx*x-dy*y,a[1]+dy*x+dx*y]);
   // Align only the endpoint handles, retaining the approved intermediate geometry.
   const previous=loop[(i+loop.length-1)%loop.length].a,next=loop[(i+1)%loop.length].b;
   const handle=(origin:Point,through:Point,control:Point,sign:number)=>{const vx=through[0]-origin[0],vy=through[1]-origin[1],length=Math.hypot(vx,vy),distance=Math.hypot(control[0]-origin[0],control[1]-origin[1]);return[origin[0]+sign*vx/length*distance,origin[1]+sign*vy/length*distance];};
   const t0=[b[0]-previous[0],b[1]-previous[1]],t1=[next[0]-a[0],next[1]-a[1]];
   if(!straight)ss[0].c1=handle(a,[a[0]+t0[0],a[1]+t0[1]],ss[0].c1,1);
   if(!straight)ss[ss.length-1].c2=handle(b,[b[0]+t1[0],b[1]+t1[1]],ss[ss.length-1].c2,-1);
   for(const seg of ss)for(let j=0;j<=8;j++){const t=j/8,u=1-t;const p=[0,1].map(k=>u*u*u*seg.start[k]+3*u*u*t*seg.c1[k]+3*u*t*t*seg.c2[k]+t*t*t*seg.end[k]);boundary.push(p);const [q,r]=directions[side];if(cell.openSides?.includes(side)||islands.has(`${cell.q+q},${cell.r+r}`))openBoundary.push(p);}
   segments.push(...ss);
  }
  if(segments.length)canopy.push(path(segments));
 }
 const bridges:string[]=[],clearingBridges:string[]=[];
 const areaSize=radius*1.15,boundaryIndex=pointIndex(boundary,areaSize),openIndex=pointIndex(openBoundary,areaSize);
 // Close only narrow seams at a dense/open contact; keep the accepted islands.
 for(const patch of woodlands){
  const neighbours=directions.some(([q,r])=>keys.has(`${patch.cell.q+q},${patch.cell.r+r}`));
  if(patch.mode==='islands'&&!neighbours)continue;
  const areaIndex=patch.mode==='islands'?boundaryIndex:openIndex;
  const ax=Math.floor(patch.cell.x/areaSize),ay=Math.floor(patch.cell.y/areaSize);
  const candidates:IndexedPoint[]=[];
  for(let ix=ax-1;ix<=ax+1;ix++)for(let iy=ay-1;iy<=ay+1;iy++)for(const item of areaIndex.get(`${ix},${iy}`)??[]){
   if(Math.hypot(item.point[0]-patch.cell.x,item.point[1]-patch.cell.y)<areaSize)candidates.push(item);
  }
  const nearby=candidates.sort((a,b)=>a.index-b.index).map(item=>item.point);
  // Index the exact original samples. Only points within the maximum join
  // distance can improve the match; retain original indices to resolve ties.
  const size=radius*.15,grid=pointIndex(nearby,size);
  for(const d of patch.paths){
   const numbers=d.match(/-?\d+(?:\.\d+)?/g)!.map(Number),samples:Point[]=[];
   let start=numbers.slice(0,2);
   for(let i=2;i<numbers.length;i+=6){const c1=numbers.slice(i,i+2),c2=numbers.slice(i+2,i+4),end=numbers.slice(i+4,i+6);
    for(let j=0;j<=8;j++){const t=j/8,u=1-t;samples.push([0,1].map(k=>u*u*u*start[k]+3*u*u*t*c1[k]+3*u*t*t*c2[k]+t*t*t*end[k]));}start=end;
   }
   let distance=radius*.15,a:Point|undefined,b:Point|undefined;
   for(const p of samples){
    // The best distance shrinks as samples are visited. A point outside this
    // exact search window cannot improve it; the epsilon retains boundary ties.
    const margin=distance+Number.EPSILON*Math.max(Math.abs(p[0]),Math.abs(p[1]),size)*8;
    const minX=Math.floor((p[0]-margin)/size),maxX=Math.floor((p[0]+margin)/size);
    const minY=Math.floor((p[1]-margin)/size),maxY=Math.floor((p[1]+margin)/size);
    let improved=false,chosenIndex=Infinity;
    for(let ix=minX;ix<=maxX;ix++)for(let iy=minY;iy<=maxY;iy++)for(const {point:q,index} of grid.get(`${ix},${iy}`)??[]){
     const dx=p[0]-q[0],dy=p[1]-q[1];
     if(Math.abs(dx)>distance||Math.abs(dy)>distance)continue;
     const n=Math.hypot(dx,dy);
     if(n<distance||(improved&&n===distance&&index<chosenIndex)){distance=n;a=p;b=q;improved=true;chosenIndex=index;}
    }
   }
   if(a&&b){
    let dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy);
    if(n<radius*.001){dx=b[0]-patch.cell.x;dy=b[1]-patch.cell.y;n=Math.hypot(dx,dy)||1;}
    dx/=n;dy/=n;
    const start=[a[0]-dx*radius*.04,a[1]-dy*radius*.04],end=[b[0]+dx*radius*.08,b[1]+dy*radius*.08],w=radius*.075,nx=-dy*w,ny=dx*w;
    const d=`M${start[0]+nx},${start[1]+ny}Q${start[0]-dx*w},${start[1]-dy*w} ${start[0]-nx},${start[1]-ny}L${end[0]-nx},${end[1]-ny}Q${end[0]+dx*w},${end[1]+dy*w} ${end[0]+nx},${end[1]+ny}Z`;
    (patch.mode==='islands'?bridges:clearingBridges).push(d);
   }
  }
 }
 return{canopy,bridges,clearingBridges,woodlands};
}
