import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]??process.cwd()),mod=p=>import(pathToFileURL(path.join(root,p)).href);
import assert from 'node:assert/strict';
const {prepareRefinementRoads,prepareRefinementRoadMasks,refinementRoadMaskIntervals}=await mod('src/geometryRefinementRoads.ts');
const {prepareRefinementWater,refinementWaterContains}=await mod('src/geometryRefinementWater.ts');
const {roadPair}=await mod('src/manualRoads.ts');
const p=(x,y)=>({x,y}),origin=p(0,0),cell=(q,r)=>({q,r}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),road=(id,segments)=>({id,regionId:1,segments:segments.map(([a,b])=>({from:a,to:b,kind:'road'}))});
const river=(riverId,sourceEdgeKey,fullness,points)=>({riverId,sourceEdgeKey,fullness,points}),source=r=>({riverId:r.riverId,edgeKey:r.sourceEdgeKey,fullness:r.fullness,from:{key:`${r.riverId}:a`,point:p(r.points[0].x,-2)},to:{key:`${r.riverId}:b`,point:p(r.points[0].x,2)}});
const water=rivers=>prepareRefinementWater({paths:rivers,widthByFullness:new Map([[1,.5],[2,2],[3,2]])});
const crossing=(r,segmentKey,kind='bridge')=>({key:`1:${segmentKey}:${r.riverId}`,roadId:1,roadSegmentKey:segmentKey,riverId:r.riverId,riverEdgeKey:r.sourceEdgeKey,kind});

 const {prepareRefinementPois}=await mod('src/geometryRefinementPois.ts');
 const r=river(1,'bank',1,[p(-4,1),p(4,1)]),w=water([r]),footprint={poiId:'mill',legacyRef:null,worldAnchor:p(0,0),cells:[cell(0,0)],extent:{kind:'representative',catalogueId:'POI-SIZE1',namespace:'land',typeId:'mill',representativeExtentMiles:.03,basis:'project_assumption_not_measured'},attachments:[]},prepared=prepareRefinementPois({water:w,origin,requests:[{footprint,parent6:cell(0,0),requirement:{provenance:'knave_source_row',requirement:'river',predicates:['dry_hex','river_contact']},riverRef:{riverId:1,sourceEdgeKey:'bank'}}]});
 assert.equal(prepared.status,'prepared',JSON.stringify(prepared));const move=prepared.pois[0];near(move.newAnchor.y,.75);
 const input={roads:[road(1,[[cell(-1,0),cell(0,0)],[cell(0,0),cell(1,0)]])],crossings:[],sourceRivers:[{riverId:1,edgeKey:'bank',fullness:1,from:{key:'a',point:r.points[0]},to:{key:'b',point:r.points[1]}}],rivers:[r],water:w,origin,landCells:[cell(-1,0),cell(0,0),cell(1,0)],poiMoves:prepared.pois},before=JSON.stringify(input),result=prepareRefinementRoads(input);
 assert.equal(result.status,'prepared',JSON.stringify(result));assert.equal(result.roads.length,2);assert.equal(result.crossings.length,0);for(const route of result.roads){assert.ok(route.points.some(q=>Math.hypot(q.x-move.newAnchor.x,q.y-move.newAnchor.y)<1e-8));for(let i=1;i<route.points.length;i++){const {refinementWaterIntervals}=await mod('src/geometryRefinementWater.ts');assert.ok(!refinementWaterIntervals(w,{from:route.points[i-1],to:route.points[i]}).intervals.some(v=>v.endFraction-v.startFraction>1e-8));}}
 assert.equal(JSON.stringify(input),before);assert.deepEqual(prepareRefinementRoads({...input,roads:input.roads.map(v=>({...v,segments:v.segments.toReversed()})),landCells:input.landCells.toReversed()}),result);
 for(const change of [{contact:{...move.contact,point:p(0,1)}},{contact:{...move.contact,riverId:99}},{provenance:{provenance:'unknown',requirement:'none',predicates:[]}},{contact:undefined}]){const bad=prepareRefinementRoads({...input,poiMoves:[{...move,...change}]});assert.equal(bad.status,'error');assert.equal(bad.roads,undefined);}

process.stdout.write(JSON.stringify({kind:'synthetic_composition_witness',sourceRequirement:prepared.pois[0].provenance,prepared,input,result,limits:['Actual source owner adapter remains unmounted','Synthetic marker and two approaches; not a generated-world POI example','No public16/history/UI/PNG acceptance']},null,2)+'\n');
