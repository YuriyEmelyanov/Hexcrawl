import type {WorldPoint as Point} from './detailGrid';

type Group = 'road' | 'river';
type Span = {a: Point; b: Point; group: Group};
type Node = {point: Point; radius: number; degree: number};
export const bendNodeKey = (p: Point) => Math.round(p.x*1e5)+','+Math.round(p.y*1e5);

/** Keep moving corners in disjoint disks clear of the other source segments.
 * The limit only reduces the usual trim where the geometry competes for space. */
export function routeClearance(roads: readonly (readonly Point[])[], rivers: readonly (readonly Point[])[]) {
  const spans: Span[] = [];
  const nodes = new Map<string,Node>();
  let total = 0;
  function add(paths: readonly (readonly Point[])[], group: Group) {
    for (const path of paths) for (let i=1; i<path.length; i++) {
      const a=path[i-1], b=path[i], length=Math.hypot(b.x-a.x,b.y-a.y);
      if (!Number.isFinite(length) || length < 1e-8) continue;
      spans.push({a,b,group});
      total += length;
      for (const p of [a,b]) {
        const key=bendNodeKey(p), old=nodes.get(key);
        if (old) {old.radius=Math.max(old.radius,.38*length); old.degree++;}
        else nodes.set(key,{point:p,radius:.38*length,degree:1});
      }
    }
  }
  add(roads,'road');
  add(rivers,'river');
  const size=total/spans.length || 1, bins=new Map<string,Span[]>(), cornerBins=new Map<string,Node[]>();
  function index<T>(map: Map<string,T[]>, item:T, x0:number,y0:number,x1:number,y1:number) {
    for (let x=Math.floor(x0/size); x<=Math.floor(x1/size); x++)
      for (let y=Math.floor(y0/size); y<=Math.floor(y1/size); y++) {
        const key=x+','+y, bucket=map.get(key);
        if (bucket) bucket.push(item); else map.set(key,[item]);
      }
  }
  const longSpans: Span[]=[];
  for (const s of spans) {
    if (Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y)>size*64) longSpans.push(s);
    else index(bins,s,Math.min(s.a.x,s.b.x),Math.min(s.a.y,s.b.y),Math.max(s.a.x,s.b.x),Math.max(s.a.y,s.b.y));
  }
  for (const n of nodes.values()) if (n.degree>1 && n.radius<=size*24) {
    const {x,y}=n.point,r=n.radius;
    index(cornerBins,n,x-r,y-r,x+r,y+r);
  }
  return (p:Point, group:Group, radius:number) => {
    if (radius>size*24 || !Number.isFinite(radius)) return 0;
    let limit=radius;
    const key=bendNodeKey(p), checked=new Set<Span>(), nearby=new Set<Node>();
    let includeLong=true;
    for (let x=Math.floor((p.x-radius)/size); x<=Math.floor((p.x+radius)/size); x++)
      for (let y=Math.floor((p.y-radius)/size); y<=Math.floor((p.y+radius)/size); y++) {
        const bin=x+','+y;
        const local=bins.get(bin)??[];
        for (const s of includeLong && longSpans.length ? [...local,...longSpans] : local) {
          if (checked.has(s)) continue;
          checked.add(s);
          if (bendNodeKey(s.a)===key || bendNodeKey(s.b)===key) {
            if (s.group!==group) return 0;
            continue;
          }
          const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y;
          const t=Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/(dx*dx+dy*dy)));
          const d=Math.hypot(p.x-s.a.x-t*dx,p.y-s.a.y-t*dy);
          limit=Math.min(limit,d*.999);
        }
        includeLong=false;
        for (const n of cornerBins.get(bin)??[]) nearby.add(n);
      }
    for (const n of nearby) if (bendNodeKey(n.point)!==key) {
      const d=Math.hypot(p.x-n.point.x,p.y-n.point.y);
      limit=Math.min(limit,.999*d*radius/(radius+n.radius));
    }
    return limit/radius;
  };
}
