import type {ForestCell} from './forestGeometry.ts';
import type {LakeShape,WaterSegment} from './lakeGeometry.ts';
import {isWoodland} from './forestStyle.ts';
export function forestWaterBoundary(cells:ForestCell[],radius:number,rivers:WaterSegment[],_lakes:LakeShape[]){
 const cuts:string[]=[],banks:string[]=[];
 if(!cells.length)return{cuts,banks};
 const origin=cells[0],byKey=new Map(cells.map(c=>[`${c.q},${c.r}`,c]));
 const at=(x:number,y:number)=>{
  const rf=(y-origin.y)/(radius*1.5)+origin.r,qf=(x-origin.x)/(radius*Math.sqrt(3))-(rf-origin.r)/2+origin.q;
  let q=Math.round(qf),r=Math.round(rf),s=Math.round(-qf-rf);
  const dq=Math.abs(q-qf),dr=Math.abs(r-rf),ds=Math.abs(s+qf+rf);
  if(dq>dr&&dq>ds)q=-r-s;else if(dr>ds)r=-q-s;
  return byKey.get(`${q},${r}`);
 };
 const quad=(x1:number,y1:number,x2:number,y2:number,nx:number,ny:number,a:number,b:number)=>`M${x1+nx*a},${y1+ny*a}L${x2+nx*a},${y2+ny*a}L${x2+nx*b},${y2+ny*b}L${x1+nx*b},${y1+ny*b}Z`;
 const boundary=(x1:number,y1:number,x2:number,y2:number,probe:number)=>{
  const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(!len)return;
  let nx=-dy/len,ny=dx/len;const x=(x1+x2)/2,y=(y1+y2)/2;
  const left=at(x+nx*probe,y+ny*probe),right=at(x-nx*probe,y-ny*probe);
  // Interior water overlays the canopy without cutting it into separate masses.
  if(Boolean(left)===Boolean(right))return;
  const forest=left??right!;if(!left){nx=-nx;ny=-ny;}
  cuts.push(quad(x1,y1,x2,y2,nx,ny,0,-radius*.45));
  if(!isWoodland(forest.biome)||forest.woodlandStyle==='clearings')banks.push(quad(x1,y1,x2,y2,nx,ny,0,radius*.4));
 };
 for(const s of rivers)boundary(s.x1,s.y1,s.x2,s.y2,radius*.16);
 // Lakes overlay the original canopy without bank extensions or shoreline cuts.
 return{cuts,banks};
}
