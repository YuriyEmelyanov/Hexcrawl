import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRoadEdit,roadPair} from '../src/manualRoads.ts';
const h=q=>({q,r:0});
const segment=(a,b,kind='trail')=>({from:h(a),to:h(b),kind});
const road=(id,a,b,kind='trail')=>({id,regionId:1,segments:[segment(a,b,kind)]});
const base=()=>({roads:[],crossings:[],nextRoadId:1});
const context=()=>({landRegion:()=>1,destination:()=>true,openExit:()=>false,blocked:()=>false,intersections:()=>[],minima:[]});
// Separate contracts: creation, rejected geometry, graph preservation and crossing dependencies.
test('manual path allocates one ID and deterministic crossings without mutating input',()=>{
 const doc=base(),ctx=context();ctx.intersections=()=>[{riverId:7,riverEdgeKey:'edge',fullness:2},{riverId:8,riverEdgeKey:'edge',fullness:4}];
 const before=structuredClone(doc),edit={type:'create',path:[h(0),h(1)],kind:'trail'};
 const next=prepareRoadEdit(doc,edit,ctx);assert.deepEqual(doc,before);assert.equal(next.nextRoadId,2);assert.equal(next.roads.length,1);assert.equal(next.crossings.length,2);
 assert.deepEqual(next,prepareRoadEdit(doc,edit,ctx));assert.ok(next.crossings.every(c=>c.kind==='bridge'));
 assert.throws(()=>prepareRoadEdit(doc,{...edit,crossingKinds:{'1:0,0|1,0:8':'ford'}},ctx),/invalid_crossing_kind/);
 assert.deepEqual(doc,before);
});
test('creation refuses invalid geometry, endpoints, obstacles, duplicate and overflow',()=>{
 const ctx=context(),doc=base();
 for(const path of [[h(0)],[h(0),h(2)],[h(0),h(1),h(0)]])assert.throws(()=>prepareRoadEdit(doc,{type:'create',path,kind:'road'},ctx));
 const edit={type:'create',path:[h(0),h(1)],kind:'road'};
 for(const override of [{landRegion:()=>undefined},{destination:()=>false},{blocked:()=>true}])assert.throws(()=>prepareRoadEdit(doc,edit,{...ctx,...override}));
 assert.throws(()=>prepareRoadEdit({...doc,roads:[road(3,0,1)]},edit,ctx),/duplicate_segment/);
 assert.throws(()=>prepareRoadEdit({...doc,nextRoadId:Number.MAX_SAFE_INTEGER},edit,ctx),/invalid_next_road_id/);
});
test('kind no-op returns document and region minimum rejects loss without changes',()=>{
 const doc={...base(),roads:[road(3,0,1,'road')]},edit={type:'kind',roadId:3,segmentKey:roadPair(h(0),h(1)),kind:'road'};
 assert.equal(prepareRoadEdit(doc,edit,context()),doc);
 assert.throws(()=>prepareRoadEdit(doc,{...edit,kind:'trail'},{...context(),minima:[{regionId:1,minimum:2}]}),/settled_road_minimum/);
 const next=prepareRoadEdit(doc,{...edit,kind:'trail'},context());assert.equal(next.roads[0].segments[0].kind,'trail');assert.equal(doc.roads[0].segments[0].kind,'road');
});
test('deletion preserves destinations and open exits; removable redundant edge keeps other IDs',()=>{
 const doc={...base(),roads:[road(1,0,1),road(2,1,2)],nextRoadId:3};
 assert.throws(()=>prepareRoadEdit(doc,{type:'remove',roadId:1},context()),/disconnected_destinations/);
 const ctx={...context(),destination:()=>false,openExit:x=>x.q===0};
 assert.throws(()=>prepareRoadEdit(doc,{type:'remove',roadId:1},ctx),/removed_open_exit/);
 const triangle={...base(),roads:[road(1,0,1),{id:2,regionId:1,segments:[{from:h(0),to:{q:0,r:1},kind:'trail'},{from:{q:0,r:1},to:h(1),kind:'trail'}]}],nextRoadId:3};
 const next=prepareRoadEdit(triangle,{type:'remove',roadId:1},context());assert.deepEqual(next.roads,[triangle.roads[1]]);assert.equal(next.nextRoadId,3);
});
test('crossing edit requires live intersection, rejects deep ford and preserves unrelated records',()=>{
 const old={key:'1:0,0|1,0:7',roadId:1,roadSegmentKey:'0,0|1,0',riverId:7,riverEdgeKey:'edge',kind:'bridge'};
 const foreign={...old,key:'legacy',roadId:99};const doc={...base(),roads:[road(1,0,1)],crossings:[old,foreign]};
 const ctx={...context(),intersections:()=>[{riverId:7,riverEdgeKey:'edge',fullness:4}]};
 const edit={type:'crossing',roadId:1,segmentKey:'0,0|1,0',riverId:7,kind:'ferry'};
 const next=prepareRoadEdit(doc,edit,ctx);assert.equal(next.crossings[0].kind,'ferry');assert.equal(next.crossings[1],foreign);
 assert.throws(()=>prepareRoadEdit(doc,{...edit,kind:'ford'},ctx),/invalid_crossing_kind/);
 assert.throws(()=>prepareRoadEdit(doc,edit,context()),/missing_or_ambiguous_intersection/);
 assert.throws(()=>prepareRoadEdit({...doc,roads:[...doc.roads,...doc.roads]},edit,ctx),/ambiguous_road/);
});
