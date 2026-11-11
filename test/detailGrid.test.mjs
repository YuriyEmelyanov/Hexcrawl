import {summarizeDetailCell,detailMarkerGroups,detailSegmentCellIntersection} from '../src/detailSummary.ts';
import {parseDetail1StateV11} from '../src/detailModel.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid,detailCellCenter,worldToDetailCell,detailCellPolygon,detailCellAreaSquareMiles,detailFootprintBoundary,validateDetailFootprint,METERS_PER_MILE} from '../src/detailGrid.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
// DTL-01/02: existing pixel geometry has no physical multi-scale contract.
test('physical grids share origin/orientation, invert negative coordinates and resolve shared boundaries deterministically',()=>{
 const random=Math.random;Math.random=()=>{throw Error('Grid must not consume random');};
 try {
  const origin={x:17,y:-9};const before=structuredClone(origin);
  for(const step of [1,6,12,24]) {
   const g=createDetailGrid(step,origin);assert.deepEqual(detailCellCenter(g,{q:0,r:0}),origin);
   for(const q of [-20,-1,0,1,20])for(const r of [-20,-1,0,1,20])assert.deepEqual(worldToDetailCell(g,detailCellCenter(g,{q,r})),{q,r});
   const p=detailCellPolygon(g,{q:0,r:0});near(p[0].x-p[3].x,step);
   const area=Math.abs(p.reduce((a,v,i)=>a+v.x*p[(i+1)%6].y-v.y*p[(i+1)%6].x,0))/2;
   near(area,detailCellAreaSquareMiles(g));near(area/(Math.sqrt(3)/2),step*step);
   const boundary={x:origin.x+step/2,y:origin.y};assert.deepEqual(worldToDetailCell(g,boundary),{q:0,r:0});
   assert.deepEqual(worldToDetailCell(g,{...boundary,x:boundary.x+step*1e-6}),{q:1,r:0});
  }
  assert.deepEqual(origin,before);assert.equal(METERS_PER_MILE,1609.344);
  assert.throws(()=>createDetailGrid(2));assert.throws(()=>worldToDetailCell(createDetailGrid(1),{x:NaN,y:0}));
  assert.throws(()=>detailCellCenter(createDetailGrid(1),{q:Number.MAX_SAFE_INTEGER,r:0}));
 } finally {Math.random=random;}
});
// DTL-05/08/09: union contour must not reveal internal shared selection edges.
test('footprint boundaries remove every shared edge and retain exact topology independent of cell order',()=>{
 const g=createDetailGrid(1),one=[{q:0,r:0}],two=[...one,{q:1,r:0}];
 assert.equal(detailFootprintBoundary(g,one).length,6);const edges=detailFootprintBoundary(g,two);assert.equal(edges.length,10);
 assert.deepEqual(edges,detailFootprintBoundary(g,[...two].reverse()));
 const degree=new Map();for(const e of edges){degree.set(e.fromKey,(degree.get(e.fromKey)||0)+1);degree.set(e.toKey,(degree.get(e.toKey)||0)-1);}
 assert.ok([...degree.values()].every(x=>x===0),'closed directed union boundary');
 const ring=[{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}];
 assert.equal(detailFootprintBoundary(g,ring).length,24,'outer boundary plus hole rim; no shared edges');
 for(const invalid of [[],[...one,...one],[...one,{q:2,r:0}],[{q:.5,r:0}]])assert.throws(()=>validateDetailFootprint(invalid));
 assert.deepEqual(two,[{q:0,r:0},{q:1,r:0}]);
});

// GRID-C05/06 replaces the DTL1.0 default-two-cell/unknown-as-extent rule.
// Reuse the summary fixture for exact areas, distinct stable IDs and unknown space.
test('spatial summaries retain mixed source fragments and count a multi-cell POI once without mutating accepted state',()=>{
 const state=parseDetail1StateV11({schema:'hexcrawl.detail1',version:1,active:true,viewStep:1,grid:{origin:{x:0,y:0},orientation:'pointy',convention:'across_flats'},source:{stepMiles:6,physicalConvention:'unknown',displayAssumption:'project_across_flats_6mi'},selectedCell:{q:0,r:0},poiFootprints:[{poiId:'site',legacyRef:null,cells:[{q:0,r:0},{q:1,r:0}],extent:{kind:'manual',basis:'conditional',note:'Explicit two-cell city'},attachments:[]}]});
 const terrain=new Map([['0,0','forest'],['1,0','plains'],['0,1','lake']]),before=structuredClone(state);
 const detail=summarizeDetailCell(state,{q:0,r:0},terrain);assert.equal(detail.pois.length,1);assert.equal(detail.pois[0].partCells,1);assert.equal(detail.pois[0].partial,true);
 for(const viewStep of [12,24]){
  const other=id=>({...state.poiFootprints[0],poiId:id,cells:[{q:0,r:0}],extent:{kind:'default',reason:'unknown_size',policy:'one_cell'}});
  const overview=summarizeDetailCell({...state,viewStep,poiFootprints:[...state.poiFootprints,other('same-name-a'),other('same-name-b')]},{q:0,r:0},terrain);
  assert.deepEqual(new Set(overview.sources.map(h=>h.terrain)),new Set(['forest','plains','lake']));assert.equal(overview.pois.length,3,'two equal display names would still have separate stable IDs');
  const city=overview.pois.find(p=>p.poiId==='site');assert.equal(city.totalCells,2);assert.equal(city.partCells,2);assert.equal(city.partial,false);
  assert.ok(overview.unknownAreaSquareMiles>0);near(overview.acceptedAreaSquareMiles+overview.unknownAreaSquareMiles,overview.cellAreaSquareMiles);
  near(overview.terrains.reduce((sum,t)=>sum+t.areaSquareMiles,0),overview.acceptedAreaSquareMiles);
  assert.deepEqual(new Set(overview.terrains.map(t=>t.terrain)),new Set(['forest','plains','lake']),'unknown receives no dominant biome');
  if(viewStep===12){assert.ok(overview.sources.some(h=>h.partial));assert.ok(overview.terrains.find(t=>t.terrain==='forest').areaSquareMiles>overview.terrains.find(t=>t.terrain==='plains').areaSquareMiles,'shares use clipped area, not source-cell counts');}
 }
 assert.deepEqual(state,before);assert.equal(summarizeDetailCell(state,{q:-99,r:-99},terrain).pois.length,0);
 for(const selectedCell of [{q:.5,r:0},{q:'0',r:0},{q:0,r:0,extra:true}])assert.throws(()=>parseDetail1StateV11({...state,selectedCell}));
 assert.deepEqual(parseDetail1StateV11(JSON.parse(JSON.stringify(state))),state);
 const overlapping={...state,poiFootprints:[...state.poiFootprints,{...state.poiFootprints[0],poiId:'other',cells:[{q:0,r:0}]}]};
 const groups=detailMarkerGroups(overlapping);assert.equal(groups.length,2);assert.equal(groups.find(g=>g.cell.q===0).owners.length,2);assert.equal(groups.find(g=>g.cell.q===1).owners[0].poiId,'site');
 assert.equal(detailMarkerGroups({...overlapping,viewStep:12}).length,1);assert.deepEqual(overlapping.poiFootprints[0].cells,state.poiFootprints[0].cells);
 const distant={...overlapping,viewStep:12,poiFootprints:overlapping.poiFootprints.map(p=>({...p,cells:p.cells.map(c=>({q:c.q+12,r:c.r}))}))};
 assert.deepEqual(detailMarkerGroups(distant).map(g=>({cell:g.cell,ids:g.owners.map(p=>p.poiId)})),[{cell:{q:1,r:0},ids:['site','other']}],'overview marks cluster at the selected-grid address, not a one-mile address');

});

// GRID-C05/C06/C08: local information uses anchors/actual extent and closed
// world segments. A common source-six owner cannot make an absent object local.
test('local cards exclude other source-cell POIs and absent paths while retaining real interior, edge and vertex contacts',()=>{
 const fine=createDetailGrid(1),polygon=detailCellPolygon(fine,{q:0,r:0});
 const tiny=[{x:.3,y:-.1},{x:.7,y:-.1},{x:.7,y:.1},{x:.3,y:.1}];
 const measured={kind:'measured_polygon',sourceId:'survey:tower',unit:'mile',method:'positive_area_intersection',sourcePolygon:tiny};
 const poi=(id,anchor,cells,extent)=>({poiId:id,legacyRef:`poi:1:${id==='tower'?'0,0':'1,0'}`,worldAnchor:anchor,cells,extent,attachments:[]});
 const state={schema:'hexcrawl.detail1',version:2,active:true,viewStep:1,grid:{origin:{x:0,y:0},orientation:'pointy',convention:'across_flats'},source:{stepMiles:6,physicalConvention:'unknown',displayAssumption:'project_across_flats_6mi'},poiFootprints:[
  poi('tower',{x:.5,y:0},[{q:0,r:0},{q:1,r:0}],measured),
  poi('mill',{x:2,y:0},[{q:2,r:0}],{kind:'default',reason:'unknown_size',policy:'one_cell'}),
  poi('city',{x:1,y:0},[{q:0,r:0},{q:1,r:0},{q:2,r:0}],{kind:'manual_size',diameterMiles:1.5,basis:'conditional',note:'Assumed city extent'})]};
 const city=state.poiFootprints.find(p=>p.poiId==='city');
 city.attachments=[
  {kind:'water',waterKind:'river',waterId:'river:local',segmentId:'local-edge',contact:{x:.4,y:0}},
  {kind:'route',routeKind:'road',routeId:'road:boundary',accessNodeId:'boundary-port',entry:{x:.5,y:0}},
  {kind:'water',waterKind:'river',waterId:'river:elsewhere',segmentId:'elsewhere-edge',contact:{x:1.2,y:0}},
  {kind:'route',routeKind:'trail',routeId:'road:elsewhere',accessNodeId:'elsewhere-port',entry:{x:1.3,y:0}}];
 const river=(id,from,to)=>({id,edges:[{id:`edge:${id}`,segment:{from,to},rapid:false,crossings:[]}],starts:[],waterfalls:[]});
 const rivers=[river(1,{x:-1,y:0},{x:1,y:0}),river(2,polygon[0],polygon[1]),river(3,polygon[0],{x:1,y:-1/Math.sqrt(3)}),river(4,{x:2,y:0},{x:3,y:0})];
 const roads=[{id:1,segments:[{from:{q:0,r:0},to:{q:1,r:0},kind:'road'},{from:{q:0,r:0},to:{q:1,r:0},kind:'trail'}]},{id:2,segments:[{from:{q:1,r:0},to:{q:2,r:0},kind:'road'}]}];
 const geography={rivers,roads,notes:new Map([['0,0','Local source-area note'],['1,0','Different area']])},terrain=new Map([['0,0','forest']]);
 const before=structuredClone({state,rivers,roads});
 const local=summarizeDetailCell(state,{q:0,r:0},terrain,geography);
 assert.deepEqual(local.pois.map(p=>p.poiId),['city','tower']);assert.equal(local.pois.find(p=>p.poiId==='tower').partial,false,'small measured object belongs to the single cube-nearest anchor owner');
 const localCity=local.pois.find(p=>p.poiId==='city');
 assert.deepEqual(localCity.attachments,[city.attachments[0],city.attachments[1]],'a city part lists only water contacts and route entries in its closed local cell');
 assert.strictEqual(localCity.attachments[0],city.attachments[0],'read-only filtering preserves accepted attachment references');
 assert.deepEqual(summarizeDetailCell({...state,viewStep:12},{q:0,r:0},terrain).pois.find(p=>p.poiId==='city').attachments,city.attachments,'overview retains the full entity attachment context');
 assert.deepEqual(local.rivers.map(r=>[r.id,r.boundaryOnly]),[[1,false],[2,true],[3,true]]);
 assert.deepEqual(local.routes.map(r=>[r.id,r.kinds]),[[1,['road','trail']]],'one route identity, with only kinds actually present');
 assert.deepEqual(local.notes.map(n=>n.text),['Local source-area note']);
 const next=summarizeDetailCell(state,{q:1,r:0},terrain,geography);assert.ok(!next.pois.some(p=>p.poiId==='tower'));assert.ok(next.pois.some(p=>p.poiId==='city'));
 assert.equal(detailSegmentCellIntersection(fine,{q:0,r:0},{from:{x:2,y:0},to:{x:3,y:0}}),null);
 assert.throws(()=>detailSegmentCellIntersection(fine,{q:0,r:0},{from:{x:NaN,y:0},to:{x:0,y:0}}));
 assert.deepEqual({state,rivers,roads},before,'summary reads cannot move accepted geometry or attachments');
 assert.equal(detailMarkerGroups(state).filter(g=>g.owners.some(p=>p.poiId==='tower')).length,1);
 // G02: retaining the exact world click prevents a fine-cell centre from
 // rounding a point just inside a coarse cell back across its shared edge.
 for(const viewStep of [6,12,24]){
  const selectedWorldPoint={x:viewStep/2+.01,y:0},selectedCell=worldToDetailCell(fine,selectedWorldPoint);
  assert.deepEqual(worldToDetailCell(createDetailGrid(viewStep),detailCellCenter(fine,selectedCell)),{q:0,r:0},'the centre-only fallback reproduces the boundary ambiguity');
  assert.deepEqual(summarizeDetailCell({...state,viewStep,selectedCell,selectedWorldPoint},selectedCell,terrain).cell,{q:1,r:0},`the exact world click selects the intended ${viewStep}-mile cell`);
 }
});
