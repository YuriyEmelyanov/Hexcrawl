import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
const root=process.argv[2],gridApi=await import(pathToFileURL(root+'/src/detailGrid.ts')),summaryApi=await import(pathToFileURL(root+'/src/detailSummary.ts'));
const {createDetailGrid,detailCellCenter,detailCellPolygon,detailCirclePolygon,detailPositiveAreaIntersections}=gridApi;
const {detailCirclePolygon:circle}=await import(pathToFileURL(root+'/src/detailSizes.ts'));
const {detailSegmentCellIntersection:hit,summarizeDetailCell:summarize}=summaryApi;
const grid=createDetailGrid(1),cell={q:0,r:0},polygon=detailCellPolygon(grid,cell),center=detailCellCenter(grid,cell),vertex=polygon[0],outside={x:vertex.x*8,y:vertex.y*8};
const edge={from:vertex,to:polygon[1]},touch={from:outside,to:vertex},interior={from:center,to:polygon[2]},miss={from:{x:50,y:50},to:{x:51,y:51}};
assert.deepEqual(hit(grid,cell,edge),{boundaryOnly:true});assert.deepEqual(hit(grid,cell,touch),{boundaryOnly:true});assert.deepEqual(hit(grid,cell,interior),{boundaryOnly:false});assert.equal(hit(grid,cell,miss),null);
const makeRiver=id=>({id,edges:[{id:'shared-edge',segment:edge,crossings:[{id:'crossing:here',point:vertex,kind:'bridge'},{id:'crossing:away',point:outside,kind:'bridge'}]},{id:'shared-edge',segment:touch,crossings:[]}],starts:[],waterfalls:[]});
const small={poiId:'small',legacyRef:null,worldAnchor:center,cells:[cell],extent:{kind:'manual_size',diameterMiles:.1,basis:'conditional',note:'analytic fixture'},attachments:[]};
const large={poiId:'large',legacyRef:null,worldAnchor:center,cells:detailPositiveAreaIntersections(grid,circle(center,3)).map(x=>x.cell),extent:{kind:'manual_size',diameterMiles:3,basis:'conditional',note:'analytic fixture'},attachments:[{kind:'water',contact:center,waterId:'lake:1'},{kind:'route',entry:outside,routeId:'road:1'}]};
const state={grid:{origin:{x:0,y:0}},viewStep:1,poiFootprints:[small,large],fineCellEdits:{}};
const roads=[{id:1,segments:[{from:cell,to:{q:1,r:0},kind:'road'},{from:{q:1,r:0},to:cell,kind:'trail'}]},{id:2,segments:[{from:cell,to:{q:1,r:0},kind:'road'}]}];
const result=summarize(state,cell,new Map(),{roads,rivers:[makeRiver(7),makeRiver(8)]});
assert.deepEqual(result.routes.map(r=>r.id),[1,2]);assert.deepEqual(result.routes[0].kinds,['road','trail']);assert.equal(result.routes[0].segmentKeys.length,1);
assert.deepEqual(result.rivers.map(r=>r.id),[7,8]);for(const river of result.rivers){assert.deepEqual(river.edgeIds,['shared-edge']);assert.deepEqual(river.crossingIds,['crossing:here']);assert.equal(river.boundaryOnly,true);}
assert.deepEqual(result.pois.map(p=>p.poiId),['large','small']);assert.equal(result.pois.find(p=>p.poiId==='large').attachments.length,1);
const adjacent=summarize(state,{q:1,r:0},new Map());assert.deepEqual(adjacent.pois.map(p=>p.poiId),['large']);assert.equal(adjacent.pois[0].attachments.length,0);
console.log(JSON.stringify({head_sha:'2ad03ad256e824a1ee07cef8e0d90a75077ef75e',method:'Temporary programmer analytic probe of exact existing pure summary modules; four hand-constructed geometric profiles, not permanent test cases or independent review.',segments:{edge:hit(grid,cell,edge),vertex:hit(grid,cell,touch),interior:hit(grid,cell,interior),outside:hit(grid,cell,miss)},stable_routes:result.routes,stable_rivers:result.rivers,selected_poi_ids:result.pois.map(p=>p.poiId),adjacent_poi_ids:adjacent.pois.map(p=>p.poiId),local_attachments:result.pois.find(p=>p.poiId==='large').attachments.length,adjacent_attachments:adjacent.pois[0].attachments.length,status:'passed',limitation:'Minimal read-model inputs; full document validation/import belongs to existing Node/browser suites. This does not prove every map or independent score grades.'},null,2));
