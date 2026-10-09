import {forestHash,type ForestCell} from './forestGeometry';
import {forestFamily} from './forestStyle';
// Sparse ink accents, not separate terrain tiles. Coordinates are seeded and stable.
export function buildForestTreeMarks(cells:ForestCell[],radius:number,seed:number){
 const edge:string[]=[],inside:string[]=[];
 const glyph=(x:number,y:number,size:number,kind:string)=>{
  const p=(a:number,b:number)=>`${(x+a*size).toFixed(2)},${(y+b*size).toFixed(2)}`;
  if(kind==='dead')return `M${p(0,3)}L${p(0,-4)}M${p(0,0)}L${p(-3,-3)}L${p(-3,-5)}M${p(0,-2)}L${p(3,-4)}M${p(0,1)}L${p(4,-1)}`;
  if(kind==='coniferous')return `M${p(-4,2)}L${p(-2,-1)}L${p(-3,-1)}L${p(0,-6)}L${p(3,-1)}L${p(2,-1)}L${p(4,2)}M${p(-2,0)}L${p(0,-2)}L${p(2,0)}`;
  return `M${p(-5,1)}Q${p(-6,-2)} ${p(-3,-2)}Q${p(-3,-5)} ${p(0,-4)}Q${p(3,-6)} ${p(4,-2)}Q${p(7,-1)} ${p(5,1)}M${p(-2,1)}Q${p(0,-1)} ${p(2,1)}`;
 };
 for(const c of cells){
  if(c.lake)continue;
  const family=forestFamily(c.biome);if(!family)continue;
  const h=forestHash(`trees:${c.q},${c.r}`,seed),size=radius*.016;
  for(let i=0;i<42;i++){
   const n=forestHash(`tree:${i}`,h),angle=(n%10000)/10000*Math.PI*2,dist=Math.sqrt((n>>>14)/262144)*radius*.92;
   const x=c.x+Math.cos(angle)*dist,y=c.y+Math.sin(angle)*dist;
   const kind=family==='mixed'?(n&1?'deciduous':'coniferous'):family==='swamp'?'deciduous':family;
   edge.push(glyph(x,y,size,kind));
   if(i<2&&n%3!==0)inside.push(glyph(x,y,size*.9,kind));
  }
 }
 return {edge:edge.join(''),inside:inside.join('')};
}
