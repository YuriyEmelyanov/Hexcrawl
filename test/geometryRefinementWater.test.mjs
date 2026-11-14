import test from 'node:test';import assert from 'node:assert/strict';
import {prepareRefinementWater,refinementWaterContains,refinementWaterIntervals,refinementWaterFirstContact} from '../src/geometryRefinementWater.ts';
const p=(x,y)=>({x,y}),path=(riverId,points,fullness=1)=>({riverId,sourceEdgeKey:'edge:'+riverId,points,fullness}),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('GEO2 finite round water respects corners, caps, parallel crossings and tangent contact',()=>{
 const data={paths:[path(1,[p(0,0),p(2,0),p(2,2)])],widthByFullness:new Map([[1,1]])},before=JSON.stringify(data.paths),w=prepareRefinementWater(data);assert.equal(w.status,'prepared');
 assert.equal(refinementWaterContains(w,p(2.3,-.3)).inside,true);assert.equal(refinementWaterContains(w,p(2.4,-.4)).inside,false);
 const straight=prepareRefinementWater({...data,paths:[path(1,[p(0,0),p(2,0)])]});
 const cap=refinementWaterIntervals(straight,{from:p(2.4,-2),to:p(2.4,2)});assert.equal(cap.status,'prepared');assert.equal(cap.intervals.length,1);close(cap.intervals[0].from.y,-.3);close(cap.intervals[0].to.y,.3);
 const parallel=refinementWaterIntervals(straight,{from:p(-2,.25),to:p(4,.25)}).intervals[0];close(parallel.from.x,-Math.sqrt(.25-.0625));close(parallel.to.x,2+Math.sqrt(.25-.0625));assert.equal(parallel.startClipped,false);assert.equal(parallel.endClipped,false);
 const tangent=refinementWaterIntervals(straight,{from:p(-.5,-1),to:p(-.5,1)}).intervals[0];assert.equal(tangent.touchOnly,true);close(tangent.startFraction,.5);close(tangent.endFraction,.5);
 const contact=refinementWaterFirstContact(straight,{from:p(-2,0),to:p(1,0)});assert.equal(contact.status,'prepared');close(contact.contact.point.x,-.5);
 assert.equal(refinementWaterFirstContact(straight,{from:p(1,0),to:p(4,0)}).status,'starts_in_water');
 assert.equal(refinementWaterIntervals(straight,{from:p(1,0),to:p(1.2,0)}).intervals[0].startClipped,true);
 assert.equal(refinementWaterIntervals(straight,{from:p(0,0),to:p(0,0)}).code,'invalid_query');assert.equal(JSON.stringify(data.paths),before);assert.ok(Object.isFrozen(w.capsules[0].from));
});
test('GEO2 water unions variable widths without internal banks and preserves dry gaps and source refs',()=>{
 const paths=[path(1,[p(-2,0),p(0,0)]),path(2,[p(0,0),p(0,2)],2),path(3,[p(8,0),p(10,0)],3)],widthByFullness=new Map([[1,2],[2,4],[3,1]]),w=prepareRefinementWater({paths,widthByFullness});assert.equal(w.status,'prepared');
 const result=refinementWaterIntervals(w,{from:p(-5,0),to:p(12,0)});assert.equal(result.intervals.length,2);const [joint,separate]=result.intervals;close(joint.from.x,-3);close(joint.to.x,2);close(separate.from.x,7.5);close(separate.to.x,10.5);assert.deepEqual(joint.contributors.map(r=>r.riverId),[1,2]);assert.equal(refinementWaterContains(w,p(4,0)).inside,false);
 const cap=refinementWaterIntervals(w,{from:p(-4,-1.5),to:p(4,-1.5)}).intervals[0];close(cap.from.x,-Math.sqrt(1.75));close(cap.to.x,Math.sqrt(1.75));assert.deepEqual(cap.contributors.map(r=>r.riverId),[2]);
 assert.deepEqual(prepareRefinementWater({paths:paths.toReversed(),widthByFullness}),w);
 for(const width of [-1,0,NaN,Infinity]){const bad=prepareRefinementWater({paths,widthByFullness:new Map([[1,width]])});assert.equal(bad.status,'error');assert.equal(bad.capsules,undefined);assert.ok(bad.refs.length);}
 assert.equal(prepareRefinementWater({paths:[paths[0],paths[0]],widthByFullness}).code,'invalid_water');
});
