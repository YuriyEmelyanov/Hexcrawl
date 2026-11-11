import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid,detailCellCenter,detailCellPolygon} from '../src/detailGrid.ts';
import {detailFootprintHasOutline,detailFootprintExtentMiles,DETAIL_POI_SIZES} from '../src/detailSizes.ts';
import {buildDetailPoiFootprint,DetailPlacementError} from '../src/detailPlacement.ts';

const grid=createDetailGrid(1),source=detailCellPolygon(createDetailGrid(6),{q:0,r:0}),anchor={x:0,y:0};
const base={poiId:'poi:region:1:0,0',legacyRef:'poi:1:0,0',anchor,sourcePolygon:source,waterRequirement:'none',waterAccesses:[],routeRequirement:'none',routeAccesses:[]};

// GRID-C08/G07 replaces DTL-04/05 one-cell/minimum-two policy. Reuse the
// role/provenance case to assert representative sizes and measured precedence.
test('POI catalogue keeps measured tiny capital and tower as markers, city as conditional coverage, and semantic roles unknown',()=>{
 const random=Math.random;Math.random=()=>{throw Error('Placement must not consume random');};
 try {
  const site=buildDetailPoiFootprint(grid,{...base,role:'site'}),seat=buildDetailPoiFootprint(grid,{...base,poiId:'seat:1',role:'mythic_seat'}),capital=buildDetailPoiFootprint(grid,{...base,poiId:'capital:1',role:'capital'});
  assert.equal(site.cells.length,1);assert.equal(site.extent.representativeExtentMiles,null);assert.equal(seat.cells.length,1);assert.equal(seat.extent.representativeExtentMiles,.15);
  assert.equal(capital.extent.representativeExtentMiles,2.5);assert.ok(capital.cells.length>2);assert.equal(capital.poiId,'capital:1');
  const tower=buildDetailPoiFootprint(grid,{...base,role:'site',typeId:'tower'}),city=buildDetailPoiFootprint(grid,{...base,role:'site',typeId:'city'});
  assert.equal(detailFootprintExtentMiles(tower,grid),.03);assert.equal(detailFootprintHasOutline(tower,grid),false);assert.equal(tower.cells.length,1);
  assert.equal(detailFootprintExtentMiles(city,grid),1.5);assert.equal(detailFootprintHasOutline(city,grid),true);assert.ok(city.cells.length>1);assert.equal(city.extent.basis,'project_assumption_not_measured');
  assert.equal(DETAIL_POI_SIZES.land.throne,.15);for(const typeId of ['myth','hazard','curse','natural_place'])assert.equal(DETAIL_POI_SIZES.land[typeId],null);
  const tinyPolygon=Array.from({length:32},(_,i)=>({x:.2*Math.cos(i*Math.PI/16),y:.2*Math.sin(i*Math.PI/16)}));
  const tiny=buildDetailPoiFootprint(grid,{...base,role:'capital',typeId:'capital',manualSize:{diameterMiles:5,basis:'conditional',note:'Ignored below survey'},measuredExtent:{sourceId:'survey:tiny-capital',unit:'mile',sourcePolygon:tinyPolygon}});
  assert.equal(tiny.extent.kind,'measured_polygon');assert.ok(Math.abs(detailFootprintExtentMiles(tiny,grid)-.4)<1e-12);assert.equal(detailFootprintHasOutline(tiny,grid),false);assert.equal(tiny.cells.length,1);
  const manual=buildDetailPoiFootprint(grid,{...base,role:'capital',manualSize:{diameterMiles:.4,basis:'measured_override',note:'Confirmed small capital'}});assert.equal(manual.extent.kind,'manual_size');assert.equal(manual.cells.length,1);assert.equal(detailFootprintHasOutline(manual,grid),false);
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
 // Joint search must try another real water port rather than reject a valid
 // small site after greedily fixing the nearest water contact.
 const farCell={q:2,r:0},far=detailCellCenter(grid,farCell),farWater={...water,cell:farCell,contact:far};
 const farRoute={...through,routeId:'road:4',segment:{from:{x:far.x-.2,y:far.y},to:{x:far.x+.2,y:far.y}}};
 const joint=buildDetailPoiFootprint(grid,{...input,role:'site',waterAccesses:[water,farWater],routeAccesses:[farRoute]});
 assert.deepEqual(joint.cells,[farCell]);assert.deepEqual(joint.attachments[0].contact,far);
 const many={...input,waterRequirement:'none',waterAccesses:[],routeAccesses:[{...through,segment:{from:{x:-.2,y:0},to:{x:.2,y:0}}},farRoute]};
 const beforeMany=structuredClone(many);assert.throws(()=>buildDetailPoiFootprint(grid,many),/missing_route_inside_footprint/,'capital estimate must not grow to reach a remote assigned road');assert.deepEqual(many,beforeMany);
 const linked=buildDetailPoiFootprint(grid,{...many,manualSize:{diameterMiles:5,basis:'conditional',note:'Explicit larger shape'}});assert.deepEqual(linked.attachments.map(a=>a.routeId),['road:3','road:4']);assert.ok(linked.cells.some(c=>c.q===2&&c.r===0));
 assert.throws(()=>buildDetailPoiFootprint(grid,{...many,role:'site'}),/no_single_cell_satisfies_access/,'one-cell site must satisfy every assigned route');
 const isolated=buildDetailPoiFootprint(grid,{...base,poiId:'hidden:1',role:'site',routeAccesses:[through]});
 assert.equal(isolated.attachments.length,0,'unassigned routes are not forced onto every POI');
});
