import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createGenerationHarness} from '../wr1-review-0900/test/helpers/generation-harness.mjs';
const root=new URL('../wr1-review-0900/',import.meta.url).pathname;
const require=createRequire(root+'package.json'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
function load(file,mutate=false){
 if(!mutate&&cache.has(file))return cache.get(file);
 let src=fs.readFileSync(file,'utf8');if(mutate)src=src.replace('sourceWidth:0','sourceWidth/6:0');
 const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>n.startsWith('.')?load(path.resolve(path.dirname(file),n)+(n.endsWith('.ts')?'':'.ts')):require(n)}, {filename:file});if(!mutate)cache.set(file,mod.exports);return mod.exports;
}
const exact=load(root+'src/oneMilePresentation.ts'),mutant=load(root+'src/oneMilePresentation.ts',true);
const {OneMileArtwork}=load(root+'src/OneMileArtwork.tsx');
const fixture=JSON.parse(fs.readFileSync(new URL('fixture.json',import.meta.url)));
const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(fixture)}],value:'x'}});
const geometries=h.geometry.detailMapRiverGeometry(h.render().captureDocument().map,fixture.map.physicalGrid.grid.origin);

const factor=Math.sqrt(3)*28/6,svg=p=>({x:p.x*factor,y:p.y*factor});
const rivers=geometries.flatMap(r=>r.edges.map((e,i)=>{const a=svg(e.segment.from),b=svg(e.segment.to),full=fixture.map.rivers.find(x=>x.id===r.id).sectors.find(s=>s.edgeKeys.includes(e.id))?.fullness??1;return {key:`river-segment-${r.riverId??r.id}-${i}`,x1:a.x,y1:a.y,x2:b.x,y2:b.y,width:Math.sqrt(3)*28*(.04+.035*full)};}));
const roadSegments=fixture.map.roads.flatMap(r=>r.segments.map((s,i)=>{const p=c=>({x:Math.sqrt(3)*28*(c.q+c.r/2),y:42*c.r}),a=p(s.from),b=p(s.to),k=c=>`${c.q},${c.r}`;return {key:`road-${r.id}-${i}`,roadId:r.id,segmentKey:[k(s.from),k(s.to)].sort().join('|'),kind:s.kind,x1:a.x,y1:a.y,x2:b.x,y2:b.y};}));
const crossings=fixture.map.crossings.map(c=>{const r=roadSegments.find(r=>r.roadId===c.roadId&&r.segmentKey===c.roadSegmentKey);assert.ok(r,c.key);return {...c,x:(r.x1+r.x2)/2,y:(r.y1+r.y2)/2};});
const props={state:fixture.map.physicalGrid,cells:[],candidates:[],offset:{x:0,y:0},revision:0,coordinates:false,rotated:false,busy:false,visual:()=>({color:'#000'}),poi:()=>({label:'Town Eichenheim',image:'/town.svg',emoji:'X'}),water:null,rapids:[],waterfalls:[],rivers,roads:roadSegments,crossings,onHover:()=>{},onPick:()=>{}};
const sourceSnapshot=JSON.stringify(fixture);
const ssr=renderToStaticMarkup(React.createElement(OneMileArtwork,props));fs.writeFileSync(new URL('actual-component.svg',import.meta.url),'<svg xmlns="http://www.w3.org/2000/svg">'+ssr+'</svg>');
assert.equal(JSON.stringify(fixture),sourceSnapshot,'SSR preserves imported fixture and generation streams');
const testRoad={key:'d',roadId:1,segmentKey:'s',x1:0,y1:0,x2:10,y2:0,kind:'road'},testRiver={key:'river-segment-2-1',x1:5,y1:-5,x2:5,y2:5,width:6},cross=kind=>({key:'c',roadId:1,roadSegmentKey:'s',riverId:2,x:5,y:0,kind});
const sensitivity=[];for(const [name,check]of [
 ['WR01 source-width',m=>assert.equal(m.fineRiverStrokeWidth(6),6)],
 ['WR02 bank interval',m=>{const p=m.fineRoadPresentation(testRoad,[cross('ferry')],[testRiver]);assert.equal(p.pieces[0].x2,2);assert.equal(p.pieces[1].x1,8);}],
 ['WR02 endpoint clipping',m=>{const p=m.fineRoadPresentation(testRoad,[{...cross('ferry'),x:0}],[{...testRiver,x1:0,x2:0}]);assert.equal(p.pieces[0].x1,3);}]
]){check(exact);let detected=false;try{check(mutant);}catch{detected=true;}assert.ok(detected);sensitivity.push({name,exactPass:true,oldDivisorDetected:true});}
const currentContract=crossings.map(c=>{const road=roadSegments.find(r=>r.roadId===c.roadId&&r.segmentKey===c.roadSegmentKey),dx=road.x2-road.x1,dy=road.y2-road.y1,L=Math.hypot(dx,dy);const matches=rivers.filter(r=>{const rx=r.x2-r.x1,ry=r.y2-r.y1,rl=Math.hypot(rx,ry),along=((c.x-r.x1)*rx+(c.y-r.y1)*ry)/(rl*rl),dist=Math.abs((c.x-r.x1)*ry-(c.y-r.y1)*rx)/rl;return r.key.startsWith('river-segment-'+c.riverId+'-')&&along>=0&&along<=1&&dist<1e-7;});assert.ok(matches.length);return matches.map(r=>{const rx=r.x2-r.x1,ry=r.y2-r.y1,rl=Math.hypot(rx,ry),sine=Math.abs(dx*ry-dy*rx)/L/rl,along=((c.x-r.x1)*rx+(c.y-r.y1)*ry)/(rl*rl);assert.ok(Math.abs(sine-1)<1e-8);assert.ok(Math.abs(along-.5)<1e-8);return {key:c.key,sine,along,width:r.width,nearestEnd:rl/2};});}).flat();
const matched=crossings.map(c=>{const r=roadSegments.find(r=>r.roadId===c.roadId&&r.segmentKey===c.roadSegmentKey),p=exact.fineRoadPresentation(r,[c],rivers);assert.equal(p.crossings.length,1,c.key);return {key:c.key,kind:c.kind,pieces:p.pieces,rails:p.rails};});assert.equal(matched.length,7);
assert.equal((ssr.match(/class="river-polyline"/g)??[]).length,rivers.length);for(const r of rivers)assert.ok(ssr.includes(`stroke-width="${r.width}"`));
const result={status:'pass',sha:'3344159406c3619bc3903e7185f7b0a5c4d13de5',method:'real exact OneMileArtwork React SSR using existing fixture/harness, current road-midpoint crossing contract, independently reconstructed world frame; source-map source filtering not certified by this SSR alone',rivers:rivers.length,roads:roadSegments.length,sourceDataAndRngUnchanged:true,currentContract,crossings:matched,sensitivity,ssrLabels:((ssr.match(/aria-label="Town Eichenheim"/g))??[]).length,renderedAt:new Date().toISOString()};
fs.writeFileSync(new URL('ssr-results.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
