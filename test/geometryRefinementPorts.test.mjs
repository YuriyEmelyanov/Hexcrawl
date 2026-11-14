import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRefinementPorts} from '../src/geometryRefinementPorts.ts';
import {refinementEdgeGraph,refinementWorldPoint} from '../src/geometryRefinementGrid.ts';
const cells=[{q:0,r:0},{q:1,r:0}],origin={x:4,y:-3},graph=refinementEdgeGraph(cells);
const world=v=>refinementWorldPoint(v,origin),mix=(a,b,t)=>({x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)});
test('GEO2 terminal edge splits preserve physical positions and connected source-edge partitions',()=>{
 const e=graph.edges.find(e=>e.from.x===1&&e.to.x===1),a=world(e.from),b=world(e.to);
 const requests=[{sourceKey:'a',degree:1,point:mix(a,b,.25),allowedEdgeKeys:[e.key]},{sourceKey:'b',degree:1,point:mix(a,b,.75),allowedEdgeKeys:[e.key]}],input={origin,cells,requests},before=JSON.stringify(input),r=prepareRefinementPorts(input);
 assert.equal(r.status,'prepared');assert.equal(r.ports.length,2);assert.equal(r.nodes.length,graph.vertices.length+2);assert.equal(r.edges.length,graph.edges.length+2);
 const pieces=r.edges.filter(p=>p.sourceEdgeKey===e.key);for(const [i,p]of pieces.entries()){assert.ok(Math.abs(p.startFraction-[0,.25,.75][i])<1e-12);assert.ok(Math.abs(p.endFraction-[.25,.75,1][i])<1e-12);}
 assert.equal(pieces[0].to,r.ports[0].nodeKey);assert.equal(pieces[1].from,pieces[0].to);assert.equal(pieces[1].to,pieces[2].from);
 for(const [i,p]of r.ports.entries())assert.ok(Math.hypot(p.point.x-requests[i].point.x,p.point.y-requests[i].point.y)<1e-12);assert.equal(r.ports[0].location.kind,'edge');assert.ok(Object.isFrozen(r.edges));assert.equal(r.completeGeometryPlan,false);
 assert.deepEqual(prepareRefinementPorts({...input,cells:[...cells].reverse(),requests:[...requests].reverse()}),r);assert.equal(JSON.stringify(input),before);
});
test('GEO2 explicit boundary ports exclude internal edges and reject aliases and unavailable constraints atomically',()=>{
 const base=prepareRefinementPorts({origin,cells,requests:[]});assert.equal(base.status,'prepared');assert.equal(base.boundaryEdgeKeys.length,10);
 const boundary=graph.edges.find(e=>base.boundaryEdgeKeys.includes(e.key)),internal=graph.edges.find(e=>!base.boundaryEdgeKeys.includes(e.key));
 const request={sourceKey:'exit',degree:1,point:mix(world(boundary.from),world(boundary.to),.5),exit:{sourceExitRef:'river:1:frontier',edgeKeys:[boundary.key]}};
 const r=prepareRefinementPorts({origin,cells,requests:[request]});assert.equal(r.status,'prepared');assert.equal(r.ports[0].sourceExitRef,'river:1:frontier');assert.equal(r.ports[0].location.edgeKey,boundary.key);
 const invalid=[{...request,exit:{...request.exit,edgeKeys:[internal.key]}},{...request,degree:2},{...request,allowedEdgeKeys:['foreign']},{...request,allowedEdgeKeys:[internal.key]}];
 for(const v of invalid){const bad=prepareRefinementPorts({origin,cells,requests:[v]});assert.equal(bad.status,'error');assert.equal(bad.ports,undefined);assert.ok(bad.refs.length);}
 const collision=prepareRefinementPorts({origin,cells,requests:[request,{...request,sourceKey:'other'}]});assert.equal(collision.code,'port_conflict');assert.equal(collision.ports,undefined);
});
