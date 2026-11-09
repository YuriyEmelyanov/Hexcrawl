import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid,detailCellCenter,detailCellPolygon} from '../src/detailGrid.ts';
import {buildDetailPoiFootprint,DetailPlacementError} from '../src/detailPlacement.ts';

const grid=createDetailGrid(1),source=detailCellPolygon(createDetailGrid(6),{q:0,r:0}),anchor={x:0,y:0};
const base={poiId:'poi:region:1:0,0',legacyRef:'poi:1:0,0',anchor,sourcePolygon:source,waterRequirement:'none',waterAccesses:[],routeRequirement:'none',routeAccesses:[]};

// DTL-04/05/06/07/09: roles and evidence, never the icon, determine extent.
test('POI extent policy keeps one identity, capital minimum two, Seat exception one and measured geometry authoritative',()=>{
 const random=Math.random;Math.random=()=>{throw Error('Placement must not consume random');};
 try {
  const site=buildDetailPoiFootprint(grid,{...base,role:'site'}),seat=buildDetailPoiFootprint(grid,{...base,poiId:'seat:1',role:'mythic_seat'}),capital=buildDetailPoiFootprint(grid,{...base,poiId:'capital:1',role:'capital'});
  assert.equal(site.cells.length,1);assert.equal(site.extent.policy,'one_cell');assert.equal(seat.cells.length,1);assert.equal(seat.extent.policy,'one_cell');
  assert.equal(capital.cells.length,2);assert.equal(capital.extent.policy,'capital_min_two');assert.equal(new Set(capital.cells.map(c=>`${c.q},${c.r}`)).size,2);assert.equal(capital.poiId,'capital:1');
  const measuredPolygon=detailCellPolygon(grid,{q:2,r:-1});
  const measured=buildDetailPoiFootprint(grid,{...base,poiId:'surveyed:1',role:'capital',measuredExtent:{sourceId:'survey:1',unit:'mile',sourcePolygon:measuredPolygon}});
  assert.deepEqual(measured.cells,[{q:2,r:-1}]);assert.equal(measured.extent.kind,'measured_polygon');
  assert.ok(Object.isFrozen(capital)&&Object.isFrozen(capital.cells));assert.deepEqual(buildDetailPoiFootprint(grid,{...base,poiId:'capital:1',role:'capital'}),capital);
 } finally {Math.random=random;}
});

// DTL-11/12/15/16/17/27: same-water reference and positive route span are mandatory only when assigned.
test('required water and assigned routes select a compatible footprint while adjacent or touch-only geometry fails atomically',()=>{
 const cell={q:0,r:0},center=detailCellCenter(grid,cell),water={waterId:'river:2',segmentId:'edge:4',kind:'river',cell,contact:{x:center.x-.2,y:center.y}};
 const through={routeId:'road:3',accessNodeId:'gate:east',kind:'road',segment:{from:{x:center.x-2,y:center.y},to:{x:center.x+2,y:center.y}}};
 const input={...base,role:'capital',waterRequirement:'river',waterAccesses:[water],routeRequirement:'assigned',routeAccesses:[through]};
 const placed=buildDetailPoiFootprint(grid,input);
 assert.ok(placed.cells.some(c=>c.q===0&&c.r===0));assert.deepEqual(placed.attachments.map(a=>a.kind),['water','route']);
 assert.equal(placed.attachments[0].waterId,'river:2');assert.equal(placed.attachments[0].segmentId,'edge:4');assert.equal(placed.attachments[1].routeId,'road:3');
 const before=structuredClone(input);
 for(const invalid of [
  {...input,waterAccesses:[{...water,waterId:'lake:9',kind:'shore'}]},
  {...input,routeAccesses:[{...through,segment:{from:{x:10,y:10},to:{x:11,y:11}}}]},
  {...input,routeAccesses:[{...through,segment:{from:{x:.5,y:-.2},to:{x:.5,y:.2}}}]},
 ]) assert.throws(()=>buildDetailPoiFootprint(grid,invalid),DetailPlacementError);
 assert.deepEqual(input,before,'failed candidates do not mutate source geography or references');
 const isolated=buildDetailPoiFootprint(grid,{...base,poiId:'hidden:1',role:'site',routeAccesses:[through]});
 assert.equal(isolated.attachments.length,0,'unassigned routes are not forced onto every POI');
});
