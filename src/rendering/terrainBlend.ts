// All distances use the hex circumradius. This layer never reads the world RNG.
const halfWidth = .208;
const apothem = Math.sqrt(3) / 2;
const neighbours = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const normals = neighbours.map((_, i) => [Math.cos(i * Math.PI / 3), Math.sin(i * Math.PI / 3)]);
const vertices = normals.map((_, i) => [Math.cos((i - .5) * Math.PI / 3), Math.sin((i - .5) * Math.PI / 3)]);
const centres = normals.map(([x,y]) => [x * 2 * apothem, y * 2 * apothem]);
const width = 62;
const height = 72;
type Color = readonly [number, number, number];
type Cell = {q:number; r:number; color:string};
const cache = new Map<string, string>();
let surface: { context: CanvasRenderingContext2D; data: ImageData } | undefined;

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

type Sample = {hex:string; color:Color};
type Junction = {soleIndex:number;sole:Color;pair:Color};
const sampleCentres = [[0,0], ...centres];

// The weights and rounded fields depend only on the pixel's position within
// the cell. Only the colours, available neighbours and ripple phase vary.
function preparePixels() {
  return Array.from({length:width*height}, (_, index) => {
    const x=((index%width+.5)/width*2-1)*apothem, y=(Math.floor(index/width)+.5)/height*2-1;
    const weights = sampleCentres.map(([cx,cy], slot) => ({
      slot, weight: smooth(.5+hexDistance(x-cx,y-cy)/(2*halfWidth)),
    })).filter(({weight}) => weight > 0);
    const corners = vertices.flatMap(([vx,vy], vertex) => {
      const dx=x-vx, dy=y-vy, distance=Math.hypot(dx,dy);
      if (distance >= .64) return [];
      const fields = [0,vertex+1,(vertex+5)%6+1].map(slot => {
        const [cx,cy] = sampleCentres[slot];
        const ax=cx-vx, ay=cy-vy;
        const value=roundedDistance(dx*ay-dy*ax,dx*ax+dy*ay,.94);
        return {value, fringe:smooth((Math.abs(value)/halfWidth-.22)/.6)};
      });
      return [{vertex, local:1-smooth((distance-.28)/.36), fields}];
    });
    return {x,y,weights,corners};
  });
}
let pixels: ReturnType<typeof preparePixels> | undefined;

function fillTexture(samples:[Sample, ...(Sample|undefined)[]], phaseX:number, phaseY:number) {
  const [centre, ...rest] = samples;
  const junctions = vertices.map((_, i): Junction|undefined => {
    const adjacent = [centre, rest[i], rest[(i+5)%6]];
    if (adjacent.some(v=>!v)) return;
    const lone = adjacent.find(v=>adjacent.filter(w=>w?.hex===v?.hex).length===1);
    const pair = adjacent.find(v=>v?.hex!==lone?.hex);
    if (!lone || !pair || adjacent.filter(v=>v?.hex===pair.hex).length!==2) return;
    return {soleIndex:adjacent.indexOf(lone),sole:lone.color,pair:pair.color};
  });
  if (!surface) {
    const canvas = document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const context = canvas.getContext('2d');
    if (!context) return;
    surface = {context,data:context.createImageData(width,height)};
  }
  const {context,data} = surface;
  pixels ??= preparePixels();
  for(let i=0;i<pixels.length;i++){
    const {x,y,weights,corners}=pixels[i];
    let red=0,green=0,blue=0,total=0;
    for(const {slot,weight} of weights){
      const cell = samples[slot];
      if (!cell) continue;
      red+=weight*cell.color[0];green+=weight*cell.color[1];blue+=weight*cell.color[2];total+=weight;
    }
    red/=total;green/=total;blue/=total;
    for (const {vertex,local,fields} of corners) {
      const v = junctions[vertex];
      if (!v) continue;
      const {value,fringe} = fields[v.soleIndex];
      const ripple=.007*Math.sin(6*(phaseX+x)+3*(phaseY+y))+.004*Math.sin(11*(phaseX+x)-4*(phaseY+y));
      const sole=smooth(.5+(value+fringe*ripple)/(2*halfWidth));
      red+=(v.pair[0]+sole*(v.sole[0]-v.pair[0])-red)*local;
      green+=(v.pair[1]+sole*(v.sole[1]-v.pair[1])-green)*local;
      blue+=(v.pair[2]+sole*(v.sole[2]-v.pair[2])-blue)*local;
      break;
    }
    const idx=i*4;
    data.data[idx]=red;data.data[idx+1]=green;data.data[idx+2]=blue;data.data[idx+3]=255;
  }
  context.putImageData(data,0,0);
  return context.canvas.toDataURL();
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
      const samples: [Sample, ...(Sample|undefined)[]]=[{hex:cell.color,color:rgb(cell.color)},
        ...nearby.map(hex => hex ? {hex,color:rgb(hex)} : undefined)];
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
