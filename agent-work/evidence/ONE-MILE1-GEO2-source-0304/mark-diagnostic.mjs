// Temporary correspondence diagnostic. Forces marks even at ineligible places;
// does not reproduce or certify the App's feature selection/visibility policy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const checkout=process.env.GEO2_CHECKOUT??process.cwd();
const {prepareRefinementRiverNetwork}=await import(pathToFileURL(resolve(checkout,'src/geometryRefinementSource.ts')).href);
const {projectOneMile}=await import(pathToFileURL(resolve(checkout,'src/oneMile.ts')).href);
const {refinementWorldPoint}=await import(pathToFileURL(resolve(checkout,'src/geometryRefinementGrid.ts')).href);
const w=JSON.parse(fs.readFileSync(resolve(checkout,'test/fixtures/road-entry-zigzags.json'),'utf8')).map;
const rapids=new Set(w.rivers.flatMap(r=>r.sectors.flatMap(s=>s.edgeKeys))),waterfalls=new Set(w.rivers.flatMap(r=>r.vertexPath.map(v=>v.key)));
const r=prepareRefinementRiverNetwork({rivers:w.rivers,seed:423493684,origin:{x:0,y:0},cells:projectOneMile(w.regions.flatMap(r=>r.hexes.map(cell=>({cell,landBiomeId:r.biomeId})))).map(c=>c.cell),marks:{rapids,waterfalls}});assert.equal(r.status,'prepared');
const point=v=>refinementWorldPoint(v,{x:0,y:0}),near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-8;
let rapidAtBend=0,incidences=0,sharedNodes=0;
for(const mark of r.rapids){
 const path=r.rivers.paths.find(p=>p.riverId===mark.riverId&&p.sourceEdgeKey===mark.sourceEdgeKey),ps=path.vertices.map(point),steps=ps.slice(1).map((p,i)=>({length:Math.hypot(p.x-ps[i].x,p.y-ps[i].y),a:ps[i],b:p}));
 const target=steps.reduce((n,s)=>n+s.length,0)/2;let walked=0,found=false;
 for(const [i,s] of steps.entries()){
  if(target<=walked+s.length+1e-9){
   const t=(target-walked)/s.length,expected={x:s.a.x+t*(s.b.x-s.a.x),y:s.a.y+t*(s.b.y-s.a.y)};assert.ok(near(mark.point,expected));
   let tx=(s.b.x-s.a.x)/s.length,ty=(s.b.y-s.a.y)/s.length;
   if(i<steps.length-1&&near(mark.point,s.b)){const next=steps[i+1];tx+=(next.b.x-next.a.x)/next.length;ty+=(next.b.y-next.a.y)/next.length;rapidAtBend++;}
   const len=Math.hypot(tx,ty);assert.ok(near(mark.tangent,{x:tx/len,y:ty/len}));found=true;break;
  }
  walked+=s.length;
 }
 assert.ok(found);
}
for(const mark of r.waterfalls){
 const expected=r.rivers.paths.filter(p=>p.fromNode===mark.sourceNodeKey||p.toNode===mark.sourceNodeKey);assert.equal(mark.incidences.length,expected.length);if(expected.length>1)sharedNodes++;
 for(const link of mark.incidences){const path=expected.find(p=>p.riverId===link.riverId&&p.sourceEdgeKey===link.sourceEdgeKey),ps=path.vertices.map(point),atStart=path.fromNode===mark.sourceNodeKey,a=atStart?ps[0]:ps.at(-2),b=atStart?ps[1]:ps.at(-1),size=Math.hypot(b.x-a.x,b.y-a.y);assert.ok(near(mark.point,atStart?a:b));assert.ok(near(link.point,mark.point));assert.ok(near(link.tangent,{x:(b.x-a.x)/size,y:(b.y-a.y)/size}));incidences++;}
}
const result={temporary_diagnostic:true,permanent_case_growth:0,scope:'Forced marks only; not actual generated/eligible mark counts, no world generation',rapid_positions_checked:r.rapids.length,rapid_at_bend_tangents_checked:rapidAtBend,waterfall_vertices_checked:r.waterfalls.length,directed_incidences_checked:incidences,shared_vertices_checked:sharedNodes,passed:true,limitations:['Does not validate feature eligibility/visibility or actual renderer','Not full G203 acceptance; terminal/boundary constraints pending']};
fs.writeFileSync(new URL('mark-diagnostic.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
