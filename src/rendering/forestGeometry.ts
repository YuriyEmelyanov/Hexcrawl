// Presentation-only canopy geometry, stable in axial map coordinates.
export type ForestCell = {q:number;r:number;x:number;y:number;biome:string};
export type Point = {x:number;y:number};
export type Canopy = {key:string;path:string;rim:string;trunks:string;details:string;kind:'dense'|'sparse';points:Point[]};
const sparse=new Set(['deciduous_woodland','mixed_woodland','coniferous_woodland','hilly_woodland','mountain_woodland','dead_woodland']);
export function forestKind(biome:string):'dense'|'sparse'|null {
  if(sparse.has(biome))return 'sparse';
  return biome.includes('forest')?'dense':null;
}
function rng(seed:number){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function hash(s:string,seed:number){let a=seed;for(const c of s)a=Math.imul(a^c.charCodeAt(0),16777619);return a>>>0;}
const fmt=(n:number)=>n.toFixed(3);
const at=(p:Point)=>`${fmt(p.x)} ${fmt(p.y)}`;
const key=(p:Point)=>`${Math.round(p.x*10000)},${Math.round(p.y*10000)}`;
function catmull(points:Point[],spacing:number):Point[]{
  const out:Point[]=[];const n=points.length;
  for(let i=0;i<n;i++){
    const p0=points[(i+n-1)%n],p1=points[i],p2=points[(i+1)%n],p3=points[(i+2)%n];
    const count=Math.max(1,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/spacing));
    for(let j=0;j<count;j++){
      const t=j/count,t2=t*t,t3=t2*t;
      const v=(k:'x'|'y')=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);
      out.push({x:v('x'),y:v('y')});
    }
  }return out;
}
function contains(p:Point,vs:Point[]){let yes=false;for(let i=0,j=vs.length-1;i<vs.length;j=i++){
 const a=vs[i],b=vs[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
}return yes;}
function decorate(points:Point[],radius:number,seed:number,id:string,kind:'dense'|'sparse'):Canopy{
 const rand=rng(hash(id,seed));let path=`M${at(points[0])}`,rim='',trunks='',details='';
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
  const nx=dy/l,ny=-dx/l,h=radius*(.020+rand()*.035);
  const m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  path+=`Q${at({x:m.x+nx*h,y:m.y+ny*h})} ${at(b)}`;
  if(ny>.22){const length=radius*(.065+rand()*.045);trunks+=`M${at(m)}l0 ${fmt(length)}`;}
  if(i%3===0){const x=m.x-nx*radius*.067,y=m.y-ny*radius*.067,w=radius*.035;
   rim+=`M${fmt(x-w)} ${fmt(y)}q${fmt(w)} ${fmt(-w*1.4)} ${fmt(w*2)} 0`;
  }
 }
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));
 const minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y));
 const attempts=Math.floor((maxX-minX)*(maxY-minY)/(radius*radius)*2.4);
 for(let i=0;i<attempts;i++){
  const p={x:minX+rand()*(maxX-minX),y:minY+rand()*(maxY-minY)};
  if(!contains(p,points))continue;const w=radius*.038;
  details+=`M${at(p)}q${fmt(w)} ${fmt(-w*1.8)} ${fmt(w*2)} 0q${fmt(w)} ${fmt(-w)} ${fmt(w*2)} 0`;
 }
 return{key:id,path:path+'Z',rim,trunks,details,kind,points};
}
export function buildForest(cells:ForestCell[],radius:number,seed:number):Canopy[]{
 const dense=cells.filter(c=>forestKind(c.biome)==='dense').sort((a,b)=>a.r-b.r||a.q-b.q);
 const keys=new Set(dense.map(c=>`${c.q},${c.r}`));
 const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
 type Edge={a:Point;b:Point;c:ForestCell;i:number};const edges:Edge[]=[];
 for(const c of dense){
  const ps=Array.from({length:6},(_,i)=>({x:c.x+radius*Math.cos((i*60-30)*Math.PI/180),y:c.y+radius*Math.sin((i*60-30)*Math.PI/180)}));
  for(let i=0;i<6;i++)if(!keys.has(`${c.q+dirs[i][0]},${c.r+dirs[i][1]}`))edges.push({a:ps[i],b:ps[(i+1)%6],c,i});
 }
 const starts=new Map(edges.map(e=>[key(e.a),e]));const used=new Set<Edge>();const canopies:Canopy[]=[];
 for(const first of edges){if(used.has(first))continue;const loop:Edge[]=[];let e:Edge|undefined=first;
  while(e&&!used.has(e)){used.add(e);loop.push(e);e=starts.get(key(e.b));}
  if(loop.length<3)continue;
  const knots:Point[]=[];
  for(let j=0;j<loop.length;j++){
   const edge=loop[j],prev=loop[(j+loop.length-1)%loop.length];
   const dx=edge.b.x-edge.a.x,dy=edge.b.y-edge.a.y,l=Math.hypot(dx,dy);
   const px=prev.b.x-prev.a.x,py=prev.b.y-prev.a.y,pl=Math.hypot(px,py);
   // Two scales: deep irregular bays along edges and small crown lobes on top.
   const rand=rng(hash(`${edge.c.q},${edge.c.r}:${edge.i}`,seed));
   knots.push({x:edge.a.x-(dy/l+py/pl)*radius*.085,y:edge.a.y+(dx/l+px/pl)*radius*.085});
   for(let k=1;k<=4;k++){
    const t=k/5,inset=radius*(.015+rand()*.25);
    knots.push({x:edge.a.x+dx*t-dy/l*inset,y:edge.a.y+dy*t+dx/l*inset});
   }
  }
  const id=`dense-${first.c.q},${first.c.r}-${first.i}`;
  canopies.push(decorate(catmull(knots,radius*.070),radius,seed,id,'dense'));
 }
 // Four or five independently-shaped groves, each fully contained in its hex.
 for(const c of cells.filter(c=>forestKind(c.biome)==='sparse')){
  const rand=rng(hash(`${c.q},${c.r}:groves`,seed));const count=rand()<.5?4:5;
  const phase=rand()*.4;
  for(let i=0;i<count;i++){
   const angle=-Math.PI/2+i*2*Math.PI/count+phase;
   const distance=radius*(.34+rand()*.07);
   const x=c.x+Math.cos(angle)*distance,y=c.y+Math.sin(angle)*distance;
   const rx=radius*(.20+rand()*.050),ry=radius*(.155+rand()*.045);
   const knots=Array.from({length:10},(_,j)=>{const a=j*Math.PI/5,s=.75+rand()*.4;return{x:x+Math.cos(a)*rx*s,y:y+Math.sin(a)*ry*s};});
   const id=`sparse-${c.q},${c.r}-${i}`;
   canopies.push(decorate(catmull(knots,radius*.07),radius,seed,id,'sparse'));
  }
 }
 return canopies;
}
