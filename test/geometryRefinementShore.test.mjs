import test from 'node:test';import assert from 'node:assert/strict';
import {prepareRefinementShorePath,prepareRefinementShoreCells,refinementShoreContains,refinementShoreIntervals} from '../src/geometryRefinementShore.ts';
import {refinementMouthContact} from '../src/geometryRefinementMouths.ts';
const p=(x,y)=>({x,y}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('GEO2 exact quadratic shores and lake-cell unions retain curved contacts, islands and closed-body clipping',()=>{
 const q=prepareRefinementShorePath('M0 0Q1 2 2 0L2 -2L0 -2Z');assert.equal(q.status,'prepared');assert.equal(refinementShoreContains(q,p(1,1.5)),false);assert.equal(refinementShoreContains(q,p(1,.5)),true);
 const hit=refinementShoreIntervals(q,{from:p(1,-3),to:p(1,3)});assert.equal(hit.status,'prepared');assert.equal(hit.intervals.length,1);near(hit.intervals[0].startFraction,1/6);near(hit.intervals[0].endFraction,4/6);assert.equal(hit.intervals[0].endHits[0].point.y,1,'actual Q curve, not control polygon');
 const island=prepareRefinementShorePath('M-4 -4L4 -4L4 4L-4 4Z M-1 -1L1 -1L1 1L-1 1Z');assert.equal(island.status,'prepared');assert.deepEqual(island.depths,[0,1]);assert.equal(refinementShoreContains(island,p(0,0)),false);assert.equal(refinementShoreContains(island,p(1,0)),true);
 const cuts=refinementShoreIntervals(island,{from:p(-5,0),to:p(5,0)});assert.deepEqual(cuts.intervals.map(r=>[r.startFraction,r.endFraction]),[[.1,.4],[.6,.9]]);
 const ring=[{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}],tiles=prepareRefinementShoreCells(ring);assert.equal(tiles.status,'prepared');assert.equal(tiles.loops.length,2);assert.equal(refinementShoreContains(tiles,p(0,0)),false);
 const intervals=refinementShoreIntervals(tiles,{from:p(-15,0),to:p(15,0)}).intervals;assert.equal(intervals.length,2);near(intervals[0].startFraction,.2);near(intervals[0].endFraction,.4);near(intervals[1].startFraction,.6);near(intervals[1].endFraction,.8);
 assert.deepEqual(prepareRefinementShoreCells(ring.toReversed()),tiles);
 for(const path of ['M0 0L1 1','M0 0C1 2 2 3 4 5Z','M0 0L1 0Z','M0 NaNL1 1Z'])assert.equal(prepareRefinementShorePath(path).status,'error');
 const bank=prepareRefinementShorePath('M-4 -4L4 -4L4 4L-4 4Z'),contact=refinementMouthContact(bank,[p(0,0),p(4,0),p(5,0)]);assert.equal(contact.status,'prepared');assert.equal(contact.stepIndex,1);assert.equal(contact.stepFraction,0);assert.deepEqual(contact.point,p(4,0));
 const curved=refinementMouthContact(q,[p(1,0),p(1,3)]);assert.equal(curved.status,'prepared');near(curved.point.y,1);
 assert.equal(refinementMouthContact(island,[p(-2,0),p(2,0),p(5,0)]).code,'mouth_conflict','island first-contact cannot substitute for external bank');
 assert.equal(refinementMouthContact(bank,[p(0,0),p(1,0)]).code,'mouth_conflict','no contact returns no partial mouth');
 const scaled=prepareRefinementShorePath('M0 0Q1 2 2 0L2 -2L0 -2Z',2,p(10,-5));assert.equal(refinementShoreContains(scaled,p(12,-4)),true);
});
