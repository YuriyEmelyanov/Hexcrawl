import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]);
const source=readFileSync(root+'/src/rendering/terrainBlend.ts','utf8');
const catalog=JSON.parse(readFileSync(root+'/src/rendering/engravingCatalog.json','utf8'));
const colors=[catalog.open_plains.color,catalog.sea.color,catalog.lake.color,catalog.mountains.color,catalog.deciduous_woodland.color];
const a=Math.sqrt(3)/2;
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const targets=new Map();
const ctx={
 canvas:{toDataURL(){return Array.from(this.ctx.received.data.slice(0,3)).join(',')}},
 createImageData:(w,h)=>({data:new Float64Array(w*h*4)}),
 putImageData(data){this.received=data}
};
ctx.canvas.ctx=ctx;
globalThis.document={createElement:()=>({getContext:()=>ctx})};
const instrumented=source
  .replace('const width = 62;','const width = 1;')
  .replace('const height = 72;','const height = 1;')
  .replace('function preparePixels() {','function preparePixels(phaseX:number,phaseY:number) {')
  .replace('const x=((index%width+.5)/width*2-1)*apothem, y=(Math.floor(index/width)+.5)/height*2-1;',
           'const [x,y] = globalThis.samplePoint(phaseX,phaseY);')
  .replace('pixels ??= preparePixels();','pixels = preparePixels(phaseX,phaseY);')
  .replace('const byKey=new Map','cache.clear(); const byKey=new Map')
  .replace('for(const cell of cells){','for(const cell of cells){ if(!globalThis.wantTile(cell)) continue;');
const {terrainTextures}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(instrumented)).toString('base64'));
const xy=(q,r)=>[2*a*(q+r/2),1.5*r];
const cellKey=([q,r])=>q+','+r;
const parse=(s,fallback)=>s?s.split(',').map(Number):[1,3,5].map(i=>parseInt(fallback.slice(i,i+2),16));
let state=1261916147;
function rand(n){state=(Math.imul(1664525,state)+1013904223)>>>0;return ((state ^ (state >>> 12)) >>> 0) % n;}
let comparisons=0, edges=0, max=0, invalid=0, worst;
for(let sample=0;sample<150;sample++){
 const q=rand(31)-15,r=rand(31)-15,d=sample%6;
 const [dq,dr]=directions[d], p=[q,r], z=[q+dq,r+dr];
 const locs=new Map();
 for(const [cq,cr] of [p,z]) {
   for(const [aq,ar] of [[0,0],...directions]){
    const pos=[cq+aq,cr+ar];locs.set(cellKey(pos),pos);
   }
 }
 const selected=new Set([cellKey(p),cellKey(z)]);
 const cells=[...locs].filter(([k])=>selected.has(k)||rand(8)>1).map(([k,[q,r]])=>({q,r,color:colors[rand(colors.length)]}));
 const left=cells.find(c=>cellKey(p)===c.q+','+c.r),right=cells.find(c=>cellKey(z)===c.q+','+c.r);
 const [cx,cy]=xy(q,r),[zx,zy]=xy(z[0],z[1]),[mx,my]=[(cx+zx)/2,(cy+zy)/2], nx=(zx-cx)/(2*a),ny=(zy-cy)/(2*a);
 globalThis.wantTile=c=>selected.has(c.q+','+c.r);
 for(let i=0;i<=100;i++){
   const t=i/100-.5, x=mx-ny*t, y=my+nx*t;
   globalThis.samplePoint=(ox,oy)=>[x-ox,y-oy];
   const blends=terrainTextures(cells);
   const l=parse(blends.get(cellKey(p)),left.color),rr=parse(blends.get(cellKey(z)),right.color);
   if(![...l,...rr].every(Number.isFinite)){invalid++;continue;}
   const delta=Math.max(...l.map((c,i)=>Math.abs(c-rr[i])));
   if(delta>max){max=delta;worst={d,p,z,t,l,rr};}
   comparisons++;
 }
 edges++;
}
console.log(JSON.stringify({edges,comparisons,invalid,max,worst}));
