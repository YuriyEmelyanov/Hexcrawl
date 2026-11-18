// All distances use the hex circumradius. This layer never reads the world RNG.
const halfWidth = .208;
const apothem = Math.sqrt(3) / 2;
const neighbours = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const normals = neighbours.map((_, i) => [Math.cos(i * Math.PI / 3), Math.sin(i * Math.PI / 3)]);
const vertices = normals.map((_, i) => [Math.cos((i - .5) * Math.PI / 3), Math.sin((i - .5) * Math.PI / 3)]);
const centres = normals.map(([x,y]) => [x * 2 * apothem, y * 2 * apothem]);
type Color = readonly [number, number, number];
type Cell = {q:number; r:number; color:string};
const cache = new Map<string, string>();

function smooth(t:number) {
  const u = Math.max(0, Math.min(1, t));
  return u*u*(3-2*u);
}

function rgb(hex:string):Color {
  const n = Number.parseInt(hex.slice(1),16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function hexDistance(x:number,y:number) {
  return apothem - Math.max(Math.abs(x), Math.abs(.5*x + apothem*y), Math.abs(.5*x - apothem*y));
}

function roundedDistance(x:number,y:number, radius:number) {
  const v = y - radius/apothem;
  const side = Math.abs(x);
  return radius + (side*apothem+v/2 >= 0 ? apothem*v-side/2 : -Math.hypot(x,v));
}

type Sample = {x:number; y:number; hex:string; color:Color};
type Junction = {x:number;y:number;axisX:number;axisY:number;sole:Color;pair:Color};
function fillTexture(samples:[Sample, ...(Sample|undefined)[]], phaseX:number, phaseY:number) {
  const [centre, ...rest] = samples;
  const junctions = vertices.map(([x,y], i): Junction|undefined => {
    const adjacent = [centre, rest[i], rest[(i+5)%6]];
    if (adjacent.some(v=>!v)) return;
    const lone = adjacent.find(v=>adjacent.filter(w=>w?.hex===v?.hex).length===1);
    const pair = adjacent.find(v=>v?.hex!==lone?.hex);
    if (!lone || !pair || adjacent.filter(v=>v?.hex===pair.hex).length!==2) return;
    return {x,y,axisX:lone.x-x,axisY:lone.y-y,sole:lone.color,pair:pair.color};
  });
  const visible = samples.filter((cell): cell is Sample => cell !== undefined);
  const canvas = document.createElement('canvas');
  canvas.width=62;canvas.height=72;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const data = ctx.createImageData(canvas.width,canvas.height);
  for(let iy=0;iy<canvas.height;iy++)for(let ix=0;ix<canvas.width;ix++){
    const x=((ix+.5)/canvas.width*2-1)*apothem, y=(iy+.5)/canvas.height*2-1;
    const nearVertex=junctions.find(v=>v&&Math.hypot(x-v.x,y-v.y)<.64);
    let red=0,green=0,blue=0,total=0;
    for(const cell of visible){
      const w=smooth(.5+hexDistance(x-cell.x,y-cell.y)/(2*halfWidth));
      red+=w*cell.color[0];green+=w*cell.color[1];blue+=w*cell.color[2];total+=w;
    }
    red/=total;green/=total;blue/=total;
    if(nearVertex){
      const v=nearVertex, dx=x-v.x,dy=y-v.y;
      const field=roundedDistance(dx*v.axisY-dy*v.axisX,dx*v.axisX+dy*v.axisY,.94);
      const fringe=smooth((Math.abs(field)/halfWidth-.22)/.6);
      const ripple=.007*Math.sin(6*(phaseX+x)+3*(phaseY+y))+.004*Math.sin(11*(phaseX+x)-4*(phaseY+y));
      const sole=smooth(.5+(field+fringe*ripple)/(2*halfWidth));
      const local=1-smooth((Math.hypot(dx,dy)-.28)/.36);
      red+=(v.pair[0]+sole*(v.sole[0]-v.pair[0])-red)*local;
      green+=(v.pair[1]+sole*(v.sole[1]-v.pair[1])-green)*local;
      blue+=(v.pair[2]+sole*(v.sole[2]-v.pair[2])-blue)*local;
    }
    const idx=(iy*canvas.width+ix)*4;
    data.data[idx]=red;data.data[idx+1]=green;data.data[idx+2]=blue;data.data[idx+3]=255;
  }
  ctx.putImageData(data,0,0);
  return canvas.toDataURL();
}

export function terrainTextures(cells:Cell[]) {
  const byKey=new Map(cells.map(cell=>[`${cell.q},${cell.r}`,cell]));
  const fills=new Map<string,string>();
  for(const cell of cells){
    const key=`${cell.q},${cell.r}`;
    const nearby=neighbours.map(([q,r])=>byKey.get(`${cell.q+q},${cell.r+r}`)?.color);
    if(!nearby.some(color=>color&&color!==cell.color)) continue;
    const signature=[key,cell.color,...nearby].join(':');
    let texture=cache.get(signature);
    if(!texture){
      const samples: [Sample, ...(Sample|undefined)[]]=[{x:0,y:0,hex:cell.color,color:rgb(cell.color)},...nearby.map((hex,i)=>{
        if(!hex)return;
        const [x,y]=centres[i];return {x,y,hex,color:rgb(hex)};
      })];
      texture=fillTexture(samples,2*apothem*(cell.q+cell.r/2),1.5*cell.r);
      if(texture){
        if(cache.size>=1024){const oldest=cache.keys().next().value;if(oldest)cache.delete(oldest);}
        cache.set(signature,texture);
      }
    }
    if(texture)fills.set(key,texture);
  }
  return fills;
}
