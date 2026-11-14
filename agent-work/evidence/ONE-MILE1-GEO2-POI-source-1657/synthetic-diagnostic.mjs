import nodePath from 'node:path';import {pathToFileURL} from 'node:url';
const root=nodePath.resolve(process.argv[2]??process.cwd()),mod=p=>import(pathToFileURL(nodePath.join(root,p)).href);
import assert from 'node:assert/strict';
const {prepareRefinementWater,refinementWaterContains}=await mod('src/geometryRefinementWater.ts');
const {refinementNearestRiverBank}=await mod('src/geometryRefinementBanks.ts');
const {prepareRefinementPois}=await mod('src/geometryRefinementPois.ts');
const {prepareRefinementShorePath,refinementShoreLocation}=await mod('src/geometryRefinementShore.ts');
const {createDetailGrid,detailCellCenter,worldToDetailCell,detailCellPolygon}=await mod('src/detailGrid.ts');
const {detailPointInPolygon}=await mod('src/detailSizes.ts');
const p=(x,y)=>({x,y}),origin=p(0,0),parent6={q:0,r:0},fine=createDetailGrid(1),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const path=(riverId,sourceEdgeKey,points)=>({riverId,sourceEdgeKey,fullness:1,points}),water=paths=>prepareRefinementWater({paths,widthByFullness:new Map([[1,1]])});
const request=point=>({point,parent6,origin,riverId:1,sourceEdgeKey:'a'});
const known={provenance:'knave_source_row',requirement:'river',predicates:['dry_hex','river_contact']},unknown={provenance:'unknown',requirement:'none',predicates:[]},ref={riverId:1,sourceEdgeKey:'a'};
const marker=(id,anchor)=>({poiId:id,legacyRef:null,worldAnchor:anchor,cells:[worldToDetailCell(fine,anchor)],extent:{kind:'representative',catalogueId:'POI-SIZE1',namespace:'land',typeId:'mill',representativeExtentMiles:.03,basis:'project_assumption_not_measured'},attachments:[{kind:'water',waterKind:'river',waterId:'river:1',segmentId:'a',contact:p(0,0)}]});

 const {prepareRefinementPoiRequests}=await mod('src/geometryRefinementPoiSource.ts');
 const f={...marker('detail-poi:1',p(0,2)),legacyRef:'poi:1:0,0'},u={...marker('detail-poi:2',p(6,2)),legacyRef:'poi:1:1,0'},state={schema:'hexcrawl.detail1',version:2,active:true,viewStep:6,grid:{origin,orientation:'pointy',convention:'across_flats'},source:{stepMiles:6,physicalConvention:'unknown',displayAssumption:'project_across_flats_6mi'},poiIdentities:{version:1,nextId:3,byLegacyRef:{'poi:1:0,0':f.poiId,'poi:1:1,0':u.poiId}},poiFootprints:[f,u]},map={regions:[{id:1,isTract:true,biomeLandType:'settled',centerHex:{q:0,r:0},hexes:[{q:0,r:0},{q:1,r:0}],pointsOfInterest:[{q:0,r:0},{q:1,r:0}]}],hexTerrainByKey:new Map(),waterPoiByKey:new Map(),roads:[],seas:[],physicalGrid:state,knave:{content:{byPoi:{'poi:1:0,0':{site:{table:'structures',sourceRow:96}}}}}},sourceRivers=[{riverId:1,edgeKey:'a',fullness:1,from:{key:'a',point:p(-4,0)},to:{key:'b',point:p(4,0)}}],before=JSON.stringify(map),input={map,sourceRivers},r=prepareRefinementPoiRequests(input);
 assert.equal(r.status,'prepared',JSON.stringify(r));assert.deepEqual(r.unresolved,[u.poiId]);assert.equal(r.requests[0].requirement.provenance,'knave_source_row');assert.deepEqual(r.requests[0].riverRef,ref);assert.equal(r.requests[0].side,1);assert.equal(r.requests[1].riverRef,undefined);assert.deepEqual(r.requests[1].footprint,u);
 const result=prepareRefinementPois({water:water([path(1,'a',[p(-4,0),p(4,0)])]),origin,requests:r.requests});assert.equal(result.status,'prepared');assert.deepEqual(result.unresolved,[u.poiId]);near(result.pois[0].newAnchor.y,.5);assert.equal(JSON.stringify(map),before);assert.ok(Object.isFrozen(r.requests[0].footprint.attachments));
 assert.deepEqual(prepareRefinementPoiRequests({...input,map:{...map,physicalGrid:{...state,poiFootprints:[u,f]}},sourceRivers:sourceRivers.toReversed()}),r);
 for(const change of [{sourceRivers:[]},{lockedPoiIds:new Set(['missing'])},{map:{...map,physicalGrid:undefined}},{map:{...map,physicalGrid:{...state,poiFootprints:[{...f,legacyRef:u.legacyRef},u]}}},{map:{...map,physicalGrid:{...state,poiFootprints:[{...f,attachments:[]},u]}}}]){const bad=prepareRefinementPoiRequests({...input,...change});assert.equal(bad.status,'error');assert.equal(bad.requests,undefined);}
 const locked=prepareRefinementPoiRequests({...input,lockedPoiIds:new Set([f.poiId])});assert.equal(locked.requests[0].locked,true);assert.equal(prepareRefinementPois({water:water([path(1,'a',[p(-4,0),p(4,0)])]),origin,requests:locked.requests}).status,'error');

process.stdout.write(JSON.stringify({kind:'synthetic_accepted_owner_policy_composition',input,requests:r,prepared:result,limitations:['Synthetic minimal accepted owner map with real source policy lookup','No real eligible river POI in retained fixture','Unmounted input adapter, not runtime GeometryPlan acceptance']},null,2)+'\n');
