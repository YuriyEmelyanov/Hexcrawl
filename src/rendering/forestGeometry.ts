import {FOREST_EDGES, WOODLAND_COMPOSITIONS} from './forestTemplates.ts';
import {forestFamily,isWoodland} from './forestStyle.ts';
export type ForestCell={q:number;r:number;x:number;y:number;biome:string};
type Point=number[];
type Cubic={start:Point;c1:Point;c2:Point;end:Point};
export type WoodlandPatch={key:string;cell:ForestCell;mode:'islands'|'clearings';composition:string;rotation:number;paths:string[]};
export type ForestGeometry={canopy:string[];woodlands:WoodlandPatch[]};
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
 const woodlands:WoodlandPatch[]=forest.filter(c=>isWoodland(c.biome)).map(c=>({key:key(c),cell:c,
  mode:directions.every(([dq,dr])=>{const n=byKey.get(`${c.q+dq},${c.r+dr}`);return n&&!isWoodland(n.biome);})?'clearings':'islands',
  ...woodlandPaths(c.q,c.r,c.x,c.y,radius,seed)}));
 const islands=new Set(woodlands.filter(p=>p.mode==='islands').map(p=>p.key));
 const dense=forest.filter(c=>!islands.has(key(c))),keys=new Set(dense.map(key));
 type Edge={a:Point;b:Point;cell:ForestCell;side:number};
 const edges:Edge[]=[];
 for(const cell of dense){
  const vs=Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return[cell.x+radius*Math.cos(a),cell.y+radius*Math.sin(a)];});
  for(let side=0;side<6;side++){const [dq,dr]=directions[side];if(!keys.has(`${cell.q+dq},${cell.r+dr}`))edges.push({a:vs[side],b:vs[(side+1)%6],cell,side});}
 }
 const starts=new Map(edges.map(e=>[pointKey(e.a),e])),used=new Set<Edge>(),canopy:string[]=[];
 for(const first of edges){if(used.has(first))continue;const loop:Edge[]=[];let e:Edge|undefined=first;
  while(e&&!used.has(e)){used.add(e);loop.push(e);e=starts.get(pointKey(e.b));}
  const segments:Cubic[]=[];
  for(let i=0;i<loop.length;i++){
   const {a,b,cell,side}=loop[i],h=forestHash(`edge:${key(cell)}:${side}`,seed),dx=b[0]-a[0],dy=b[1]-a[1];
   const ss=transform(reflectForestEdge(FOREST_EDGES[h%FOREST_EDGES.length].segments,(h>>>12)%4),([x,y])=>[a[0]+dx*x-dy*y,a[1]+dy*x+dx*y]);
   // Align only the endpoint handles, retaining the approved intermediate geometry.
   const previous=loop[(i+loop.length-1)%loop.length].a,next=loop[(i+1)%loop.length].b;
   const handle=(origin:Point,through:Point,control:Point,sign:number)=>{const vx=through[0]-origin[0],vy=through[1]-origin[1],length=Math.hypot(vx,vy),distance=Math.hypot(control[0]-origin[0],control[1]-origin[1]);return[origin[0]+sign*vx/length*distance,origin[1]+sign*vy/length*distance];};
   const t0=[b[0]-previous[0],b[1]-previous[1]],t1=[next[0]-a[0],next[1]-a[1]];
   ss[0].c1=handle(a,[a[0]+t0[0],a[1]+t0[1]],ss[0].c1,1);
   ss[ss.length-1].c2=handle(b,[b[0]+t1[0],b[1]+t1[1]],ss[ss.length-1].c2,-1);
   segments.push(...ss);
  }
  if(segments.length)canopy.push(path(segments));
 }
 return{canopy,woodlands};
}
