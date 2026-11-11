import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid,detailCellPolygon,detailPolygonArea,detailPositiveAreaIntersections} from '../src/detailGrid.ts';
import {parseDetail1StateV11,prepareLegacyDetailAdaptation} from '../src/detailModel.ts';
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);

// DTL-02/07: positive-area source projection is a distinct geometry contract.
test('source polygons project deterministically across the fixed one-mile grid without edge-only children',()=>{
 const random=Math.random;Math.random=()=>{throw Error('Projection must not consume random');};
 try {
  const one=createDetailGrid(1,{x:-7,y:3}),six=createDetailGrid(6,{x:-7,y:3});
  const exact=detailCellPolygon(one,{q:-2,r:1});
  assert.deepEqual(detailPositiveAreaIntersections(one,exact).map(x=>x.cell),[{q:-2,r:1}],'edge and vertex contacts do not create neighbours');
  const source=detailCellPolygon(six,{q:-1,r:1});
  const hits=detailPositiveAreaIntersections(one,source),reversed=detailPositiveAreaIntersections(one,[...source].reverse());
  assert.ok(hits.length>36,'aligned physical grids cross; no fixed 36-child claim');
  assert.deepEqual(hits.map(x=>x.cell),reversed.map(x=>x.cell));
  hits.forEach(x=>assert.ok(x.areaSquareMiles>0));
  near(hits.reduce((sum,x)=>sum+x.areaSquareMiles,0),detailPolygonArea(source),1e-8);
  const crossing=[{x:-7.2,y:2.8},{x:-5.8,y:2.8},{x:-6.5,y:4.1}];
  const first=detailPositiveAreaIntersections(one,crossing),second=detailPositiveAreaIntersections(one,structuredClone(crossing));
  assert.ok(first.length>1);assert.deepEqual(first,second);assert.deepEqual(crossing,[{x:-7.2,y:2.8},{x:-5.8,y:2.8},{x:-6.5,y:4.1}]);
 } finally {Math.random=random;}
});

// DTL-03/22/23: typed v11 state and legacy preview reject partial mutation.
test('DETAIL1 v11 state is strict and legacy adaptation remains an explicit immutable preview',()=>{
 const valid={schema:'hexcrawl.detail1',version:1,active:true,grid:{origin:{x:0,y:0},orientation:'pointy',convention:'across_flats'},source:{stepMiles:6,physicalConvention:'unknown',displayAssumption:'project_across_flats_6mi'},viewStep:12,poiFootprints:[{poiId:'poi:7',legacyRef:'region:1/hex:0,0/poi:0',cells:[{q:0,r:0},{q:1,r:0}],extent:{kind:'measured_polygon',sourceId:'survey:7',unit:'mile',method:'positive_area_intersection',sourcePolygon:[{x:0,y:0},{x:2,y:0},{x:0,y:2}]},attachments:[{kind:'water',waterKind:'river',waterId:'river:2',segmentId:'edge:4',contact:{x:.5,y:0}},{kind:'route',routeKind:'road',routeId:'road:3',accessNodeId:'gate:east',entry:{x:1,y:0}}]}]};
 const before=structuredClone(valid),parsed=parseDetail1StateV11(valid);
 assert.deepEqual(valid,before);assert.ok(Object.isFrozen(parsed)&&Object.isFrozen(parsed.poiFootprints[0].cells));assert.equal(parsed.source.physicalConvention,'unknown');
 for(const mutate of [
  v=>{v.extra=true;},v=>{v.source.physicalConvention='assumed';},v=>{v.poiFootprints[0].cells=[{q:0,r:0},{q:2,r:0}];},
  v=>{v.poiFootprints.push(structuredClone(v.poiFootprints[0]));},v=>{v.poiFootprints[0].attachments[0].kind='route';},
  v=>{v.poiFootprints[0].extent.sourcePolygon=[{x:0,y:0},{x:1,y:1},{x:2,y:2}];}
 ]) {const invalid=structuredClone(valid);mutate(invalid);const snapshot=structuredClone(invalid);assert.throws(()=>parseDetail1StateV11(invalid));assert.deepEqual(invalid,snapshot);}
 const legacy={sourceVersion:10,sourcePhysicalConvention:'unknown',origin:{x:-3,y:4}},legacyBefore=structuredClone(legacy);
 const preview=prepareLegacyDetailAdaptation(legacy);assert.deepEqual(legacy,legacyBefore);assert.equal(preview.requiresExplicitApply,true);assert.equal(preview.activatesDetail1,false);assert.equal(preview.sourcePhysicalConvention,'unknown');assert.ok(Object.isFrozen(preview));
 assert.throws(()=>prepareLegacyDetailAdaptation({...legacy,sourceVersion:11}));
});
