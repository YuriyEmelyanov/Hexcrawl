// Temporary independent certificate diagnostic, not a permanent Node case or public16 fixture.
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const repo=resolve(process.argv[2]);
const {prepareRefinementShorePath,refinementShoreContains,refinementShoreIntervals}=await import(`${repo}/src/geometryRefinementShore.ts`);
const {detailCatalogueExtent,detailFootprintPolygons,detailPointInPolygon}=await import(`${repo}/src/detailSizes.ts`);
const {createDetailGrid}=await import(`${repo}/src/detailGrid.ts`);
const {geometryBoundaryHasValidClosure}=await import(`${repo}/src/geometryRefinementBoundary.ts`);
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
assert.equal(sha,'390a5237bb9c3dd377383c9e4ca87ba0d0e9cfb3');
const shore=p=>prepareRefinementShorePath(p),dry=shore('M .1 -.1 L 1 -.1 L 1 .1 L .1 .1 Z'),small=shore('M .019 -.001 L .021 -.001 L .021 .001 L .019 .001 Z'),hole=shore('M -2 -2 L 2 -2 L 2 2 L -2 2 Z M -.1 -.1 L -.1 .1 L .1 .1 L .1 -.1 Z'),wetHole=shore('M -2 -2 L 2 -2 L 2 2 L -2 2 Z M -.01 -.01 L -.01 .01 L .01 .01 L .01 -.01 Z');
const f={poiId:'p',cells:[{q:0,r:0}],attachments:[],worldAnchor:{x:0,y:0},extent:detailCatalogueExtent('land','lair')},empty={status:'prepared',capsules:[],completeGeometryPlan:false};
function candidate(shape=dry,site=f){return {status:'prepared',boundaryValidation:'dependency_closure_required',potentialDependencies:[{retainedRef:'lake:1',addedRef:'POI:p'}],scope:{input:{origin:{x:0,y:0},map:{regions:[],roads:[],crossings:[],physicalGrid:{poiFootprints:[]}}},outside:{regions:[],roads:[],crossings:[],authoredFootprints:[site]},continuationKeys:new Set()},source:{segments:[]},accepted:{riverPlan:{source:{segments:[]},paths:[],ports:[],terminations:[],water:empty,paintWater:empty},pois:{pois:[]},roads:{roads:[]},lockedPoiIds:[]},widths:new Map(),bodies:[{lakeId:1,modes:{tiles:shape,emoji:shape,color:shape}}]};}
const cases=[['dry',candidate(),true],['hole dry',candidate(hole),true],['hole shore wet',candidate(wetHole),false],['body enclosed',candidate(small),false],['unknown',candidate(dry,{...f,extent:detailCatalogueExtent('land','myth')}),false],['manual',candidate(dry,{...f,extent:{kind:'manual_size',diameterMiles:.05,basis:'conditional'}}),false],['large',candidate(dry,{...f,extent:detailCatalogueExtent('land','ruins')}),false],['multicell',candidate(dry,{...f,cells:[{q:0,r:0},{q:1,r:0}]}),false],['attached',candidate(dry,{...f,attachments:[{}]}),false]];
let q=candidate();q.accepted.lockedPoiIds=['p'];cases.push(['locked',q,false]);q=candidate();q.bodies[0].modes.color=wetHole;cases.push(['only color wet',q,false]);q=candidate();q.potentialDependencies=[{retainedRef:'POI:p',addedRef:'lake:1'}];cases.push(['reverse dry',q,true]);q=candidate();q.potentialDependencies[0].retainedRef='sea:1';cases.push(['sea',q,false]);q=candidate();q.potentialDependencies[0].addedRef='road:1';cases.push(['lake road',q,false]);q=candidate();q.scope.input.cancelled=()=>true;cases.push(['cancelled',q,false]);q=candidate();q.bodies[0].modes.tiles={...dry,loops:Array.from({length:200},()=>dry.loops[0])};cases.push(['budget exhaustion',q,false]);
const r=.025,a=Math.PI/96,n={x:Math.cos(a),y:Math.sin(a)},e={x:-n.y,y:n.x},d=r*Math.cos(a),h=.2;
const v=(x,y)=>({x:n.x*x+e.x*y,y:n.y*x+e.y*y}),s=p=>`${p.x} ${p.y}`;
const tangent=shore(`M ${s(v(d+h*h,-h))} Q ${s(v(d-h*h,0))} ${s(v(d+h*h,h))} L ${s(v(1,h))} L ${s(v(1,-h))} Z`),poly=detailFootprintPolygons(f,createDetailGrid(1))[0],edges=poly.map((p,i)=>refinementShoreIntervals(tangent,{from:p,to:poly[(i+1)%poly.length]}));
const tangentDetails={anchorWet:refinementShoreContains(tangent,f.worldAnchor),wetVertices:poly.filter(p=>refinementShoreContains(tangent,p)).length,containedCurveFrom:tangent.loops.some(l=>l.some(c=>detailPointInPolygon(c.from,poly))),totalCuts:edges.flatMap(e=>e.cuts).length,wetIntervals:edges.flatMap(e=>e.intervals).length};
assert.deepEqual(tangentDetails,{anchorWet:false,wetVertices:0,containedCurveFrom:false,totalCuts:1,wetIntervals:0});
cases.push(['Q tangent midpoint',candidate(tangent),false]);
const rows=cases.map(([name,c,expected])=>{const actual=geometryBoundaryHasValidClosure(c);assert.equal(actual,expected,name);return {name,expected,actual};});
console.log(JSON.stringify({sha,node:process.version,tangentDetails,diagnosticCases:rows.length,passed:rows.length,rows},null,2));
