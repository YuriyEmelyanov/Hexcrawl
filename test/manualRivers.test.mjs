import test from 'node:test';
import {validateEditedRiverDeltas} from '../src/manualRiverDependencies.ts';
import assert from 'node:assert/strict';
import {emptyRiverFeatures,migrateRiverEditing,validateDeltaReferences,allocateRiverId,validateRiverFeatures,prepareRiverFeatureEdit,resolveRiverFeatureEdits,featuresForSurvivingRivers,prepareRiverEdit,riverFeatureEdge,validateEditedRiverNetwork,reserveGeneratedRiverIds,rebuildRiverRegionSectors,validateRegionRiverHeights} from '../src/manualRivers.ts';
// E5-AC06/07: persistence intentions and identity allocation are new contracts.
// Existing riverRapids/riverWaterfalls test probability tables; riverModel tests
// numerical rules. Reuse that core, do not copy its exhaustive truth tables here.
const v=x=>({key:`${x},0`,x,y:0});
const river=(id,path=[0,1,2,3],fullness=2)=>({id,regionId:1,vertexPath:path.map(v),sectors:path.slice(1).map((b,i)=>({id:`s${id}-${i}`,riverId:id,sectorIndex:i+1,vertexPath:[v(path[i]),v(b)],edgeKeys:[riverFeatureEdge(v(path[i]),v(b))],startVertexKey:v(path[i]).key,endVertexKey:v(b).key,startReason:i?'region_boundary':'river_start',endReason:i===path.length-2?'river_end':'region_boundary',fullness,assignedRegionId:i<1?1:2}))});
const base=()=>({rivers:[river(5)],riverFeatures:emptyRiverFeatures(),nextRiverId:6});
const eligibility={rapid:()=>true,waterfall:()=>true};
// E7 AC06: extend the existing river fixture instead of copying numerical rule
// tables. New risks are explicit owner loss and directed height contacts.
test('E7 river owner loss remaps only to the receiving region and preserves supported sector identities',()=>{
 const r=river(5),before=structuredClone(r),ctx=context();
 const first=riverFeatureEdge(v(0),v(1));
 const after={...ctx,edgeOwners:key=>key===first?[9,3]:ctx.edgeOwners(key)};
 const next=rebuildRiverRegionSectors(r,ctx,after,{fromRegionId:1,toRegionId:9});
 assert.equal(next.sectors[0].assignedRegionId,9);assert.equal(next.regionId,9);
 assert.equal(next.sectors[1],r.sectors[1]);assert.equal(next.sectors[2],r.sectors[2]);
 assert.deepEqual(next.vertexPath,r.vertexPath);assert.deepEqual(next.sectors.map(s=>s.fullness),r.sectors.map(s=>s.fullness));assert.deepEqual(r,before);
 assert.throws(()=>rebuildRiverRegionSectors(r,ctx,after),/owner_conflict/);
 assert.throws(()=>rebuildRiverRegionSectors(r,ctx,after,{fromRegionId:1,toRegionId:2}),/owner_conflict/);
 assert.equal(rebuildRiverRegionSectors(r,ctx,ctx),r);
 const ambiguous={...r,sectors:[...r.sectors,{...r.sectors[0],assignedRegionId:7}]};
 assert.throws(()=>rebuildRiverRegionSectors(ambiguous,ctx,after,{fromRegionId:1,toRegionId:9}),/ambiguous_river_owner/);
 const colliding=structuredClone(r);colliding.sectors[1].id=`manual-${r.id}:${first}`;
 assert.throws(()=>rebuildRiverRegionSectors(colliding,ctx,after,{fromRegionId:1,toRegionId:9}),/river_sector_identity_conflict/);
});
test('E7 directed heights reject new uphill owner contacts without using surrounding maxima',()=>{
 const edge=(id,from,to,regionId,height)=>({id,from,to,regionId,height,fullness:1});
 const net=edges=>({nodes:[],edges});
 const valley=net([edge('a','s','j',1,1),edge('b','j','end',2,1)]);
 assert.doesNotThrow(()=>validateRegionRiverHeights(valley,valley));
 const uphill=net([valley.edges[0],{...valley.edges[1],height:2}]);
 assert.throws(()=>validateRegionRiverHeights(valley,uphill),/region_river_uphill/);
 assert.doesNotThrow(()=>validateRegionRiverHeights(uphill,structuredClone(uphill)));
 assert.throws(()=>validateRegionRiverHeights(uphill,net([valley.edges[0],{...valley.edges[1],height:3}])),/region_river_uphill/);
 assert.doesNotThrow(()=>validateRegionRiverHeights(net([]),net([edge('source','s','end',3,3)])));
 const junction=net([edge('a','s','j',1,3),edge('c','s2','j',3,1),edge('b','j','end',2,2)]);
 assert.throws(()=>validateRegionRiverHeights(net([]),junction),/region_river_uphill/);
});
function context(kinds={}){
 return {...eligibility,vertex:k=>{const n=Number(k.split(',')[0]);return k===`${n},0`?v(n):undefined;},edgeOwners:k=>{const [a,b]=k.split('|').map(k=>Number(k.split(',')[0]));return Math.abs(a-b)===1?[a===0||b===0?1:2]:[];},blocked:()=>false,event:()=>false,
 network:rivers=>{const edges=rivers.flatMap(r=>r.vertexPath.slice(1).map((b,i)=>({id:riverFeatureEdge(r.vertexPath[i],b),from:r.vertexPath[i].key,to:b.key,regionId:r.sectors.find(s=>s.edgeKeys.includes(riverFeatureEdge(r.vertexPath[i],b)))?.assignedRegionId??1,height:1,fullness:r.sectors.find(s=>s.edgeKeys.includes(riverFeatureEdge(r.vertexPath[i],b)))?.fullness})));const keys=new Set(edges.flatMap(e=>[e.from,e.to]));return {issues:[],network:{edges,nodes:[...keys].map(id=>({id,kind:kinds[id]??(edges.filter(e=>e.to===id).length&&edges.filter(e=>e.from===id).length?'continuation':'open')}))}};},additionalValidation:()=>{}};
}

test('E5 migration preserves geometry; monotonic IDs and delta references fail closed',()=>{
 const doc=base(),before=structuredClone(doc);assert.deepEqual(migrateRiverEditing(doc.rivers),{riverFeatures:emptyRiverFeatures(),nextRiverId:6});assert.deepEqual(doc,before);
 assert.deepEqual(allocateRiverId([],6),{id:6,nextRiverId:7});
 const proposal=[river(5),river(6,[4,5],4),{...river(7,[5,6],2),deltaParentRiverId:6}];
 const frozen=structuredClone(proposal),allocated=reserveGeneratedRiverIds([proposal[0]],proposal,50);
 assert.deepEqual(allocated.rivers.map(r=>r.id),[5,50,51]);assert.equal(allocated.rivers[2].deltaParentRiverId,50);assert.equal(allocated.nextRiverId,52);
 assert.equal(allocated.rivers[0],proposal[0]);assert.ok(allocated.rivers[1].sectors.every(s=>s.riverId===50));assert.deepEqual(proposal,frozen);
 assert.throws(()=>reserveGeneratedRiverIds([proposal[0]],proposal,Number.MAX_SAFE_INTEGER),/overflow/);assert.deepEqual(proposal,frozen);
 assert.equal(reserveGeneratedRiverIds([proposal[0]],[proposal[0]],50).nextRiverId,50);

 for(const id of [0,-1,5,NaN,'6',6.1])assert.throws(()=>allocateRiverId(doc.rivers,id));
 assert.throws(()=>migrateRiverEditing([{...river(Number.MAX_SAFE_INTEGER)}]),/overflow/);
 for(const parent of [99,5,0,'5'])assert.throws(()=>validateDeltaReferences([{...river(5),deltaParentRiverId:parent}]),/invalid_delta_parent/);
 assert.throws(()=>validateDeltaReferences([river(5),{...river(6),deltaParentRiverId:5},{...river(7),deltaParentRiverId:6}]),/invalid_delta_parent/);
 assert.doesNotThrow(()=>validateDeltaReferences([river(5),{...river(6),deltaParentRiverId:5}]));
});
test('E5 feature Auto/Off/On intentions, strict states, no-op and failure leave input unchanged',()=>{
 const doc=base(),edge=riverFeatureEdge(v(0),v(1)),edit={type:'rapid',riverId:5,edgeKey:edge,state:'off'};
 const off=prepareRiverFeatureEdit(doc.riverFeatures,edit,doc.rivers,eligibility);assert.equal(off.rapids[0].state,'off');assert.equal(prepareRiverFeatureEdit(off,edit,doc.rivers,eligibility),off);
 assert.deepEqual(prepareRiverFeatureEdit(off,{...edit,state:'auto'},doc.rivers,eligibility),emptyRiverFeatures());
 const before=structuredClone(off);assert.throws(()=>prepareRiverFeatureEdit(off,{...edit,state:'on'},doc.rivers,{...eligibility,rapid:()=>false}),/ineligible_rapid/);assert.deepEqual(off,before);
 const waterfall={type:'waterfall',vertexKey:v(1).key,state:'on'};const on=prepareRiverFeatureEdit(emptyRiverFeatures(),waterfall,doc.rivers,eligibility);assert.equal(on.waterfalls.length,1);
 assert.throws(()=>prepareRiverFeatureEdit(emptyRiverFeatures(),waterfall,doc.rivers,{...eligibility,waterfall:()=>false}),/ineligible_waterfall/);
 for(const state of [null,'auto',[],['on'],true,1])assert.throws(()=>validateRiverFeatures({rapids:[{riverId:5,edgeKey:edge,state}],waterfalls:[]},doc.rivers));
 assert.throws(()=>validateRiverFeatures({...off,rapids:[...off.rapids,...off.rapids]},doc.rivers),/duplicate/);
 assert.throws(()=>prepareRiverFeatureEdit(off,{...edit,riverId:99},doc.rivers,eligibility),/stale/);
 assert.deepEqual(doc.riverFeatures,emptyRiverFeatures());
 const two={rapids:[{riverId:5,edgeKey:edge,state:'on'}],waterfalls:[{vertexKey:v(1).key,state:'on'}]};
 const resolved=resolveRiverFeatureEdits(two,[{...edit,state:'off'},{...waterfall,state:'off'}],doc.rivers,{rapid:()=>false,waterfall:()=>false});
 assert.deepEqual(resolved.rapids.map(e=>e.state),['off']);assert.deepEqual(resolved.waterfalls.map(e=>e.state),['off']);assert.equal(two.rapids[0].state,'on');
});
test('E5 cleanup preserves shared physical waterfall while deleting only orphaned targets',()=>{
 const a=river(5),b=river(6,[1,8]);const features={rapids:[{riverId:5,edgeKey:riverFeatureEdge(v(0),v(1)),state:'off'}],waterfalls:[{vertexKey:v(1).key,state:'on'},{vertexKey:v(3).key,state:'off'}]};
 const result=featuresForSurvivingRivers(features,[b]);assert.deepEqual(result,{rapids:[],waterfalls:[features.waterfalls[0]]});assert.equal(features.waterfalls.length,2);
});
test('E5 reach edit spans region boundaries; no-op/failed source change preserves document',()=>{
 const doc=base();doc.rivers[0].controlPoints={startVertex:v(0),endVertex:v(3),middlePurpleVertex:v(1),startMode:'existing river endpoint'};const before=structuredClone(doc),edit={type:'fullness',riverId:5,edgeKey:riverFeatureEdge(v(1),v(2)),fullness:3};
 const result=prepareRiverEdit(doc,edit,context());assert.ok(result.rivers[0].sectors.every(s=>s.fullness===3));assert.deepEqual(result.rivers[0].sectors.map(s=>s.assignedRegionId),[1,2,2]);assert.deepEqual(doc,before);assert.deepEqual(result.rivers[0].controlPoints,doc.rivers[0].controlPoints);
 assert.equal(prepareRiverEdit(doc,{...edit,fullness:2},context()),doc);
 assert.throws(()=>prepareRiverEdit(doc,edit,context({'0,0':'source'})),/RIV-007/);assert.deepEqual(doc,before);
 const events={...context(),event:key=>key==='1,0'};const partial=prepareRiverEdit(doc,edit,{...events,network:r=>({network:{nodes:[],edges:[]},issues:[]})});assert.deepEqual(partial.rivers[0].sectors[0],doc.rivers[0].sectors[0],'unaffected upstream sector is preserved');
});
test('E5 reverse/create/delete validate physical path, counter and dependencies without mutation',()=>{
 const doc=base(),before=structuredClone(doc);const reversed=prepareRiverEdit(doc,{type:'reverse',riverId:5},context());assert.deepEqual(reversed.rivers[0].vertexPath,doc.rivers[0].vertexPath.slice().reverse());assert.deepEqual(doc,before);
 assert.throws(()=>prepareRiverEdit(doc,{type:'reverse',riverId:5},context({'3,0':'sea'})),/RIV/);
 const create={type:'create',regionId:1,path:[v(4),v(5)],fullness:1};const created=prepareRiverEdit(doc,create,context());assert.equal(created.rivers[1].id,6);assert.equal(created.nextRiverId,7);assert.deepEqual(created.rivers[0],doc.rivers[0]);
 for(const path of [[v(4)],[v(4),v(6)],[v(0),v(1)],[v(4),v(5),v(4)],[{...v(4),x:99},v(5)]])assert.throws(()=>prepareRiverEdit(doc,{...create,path},context()));
 assert.throws(()=>prepareRiverEdit(doc,create,{...context(),blocked:()=>true}),/obstacle/);
 const unknown={...create,fullness:undefined};assert.throws(()=>prepareRiverEdit(doc,unknown,context()),/solver_unavailable/);assert.deepEqual(doc,before);
 const conditionKey=riverFeatureEdge(v(4),v(5));
 assert.throws(()=>prepareRiverEdit(doc,{...unknown,path:[v(4),v(5),v(6)],fullnessByEdge:{[conditionKey]:2}},{...context(),solvePath:()=>new Map([[conditionKey,3],[riverFeatureEdge(v(5),v(6)),3]])}),/changed_fixed/);
 const replaced=prepareRiverEdit(doc,{type:'replace',riverId:5,regionId:1,path:doc.rivers[0].vertexPath,fullness:3},context());assert.ok(replaced.rivers[0].sectors.every(s=>s.fullness===3));
 assert.equal(prepareRiverEdit(doc,{type:'replace',riverId:5,regionId:1,path:doc.rivers[0].vertexPath,fullness:2},context()),doc);
 assert.equal(prepareRiverEdit(doc,{type:'replace',riverId:5,regionId:1,path:doc.rivers[0].vertexPath.map(p=>({x:p.x+1e-12,y:p.y,key:p.key}))},context()),doc,'same physical route from another hex retains exact document/redo');
 const arm={...river(6,[2,4]),deltaParentRiverId:5};const group={...doc,rivers:[...doc.rivers,arm],nextRiverId:7};assert.throws(()=>prepareRiverEdit(group,{type:'remove',riverId:5,includeArms:false},context()),/confirmation/);
 const removed=prepareRiverEdit(group,{type:'remove',riverId:5,includeArms:true},context());assert.equal(removed.rivers.length,0);assert.equal(removed.nextRiverId,7);assert.deepEqual(doc,before);
 // Cleanup must not make malformed accepted-state input appear valid.
 const broken={...doc,riverFeatures:{rapids:[{riverId:5,edgeKey:'missing',state:'off'}],waterfalls:[]}};
 assert.throws(()=>prepareRiverEdit(broken,{type:'remove',riverId:5,includeArms:true},context()),/missing_or_duplicate_rapid_edge/);
});
test('E5 network validation preserves independent unchanged legacy defects, rejects new ones',()=>{
 const ctx=context({'8,0':'source'}),old=[river(1,[0,1],1),river(2,[8,9],3)];const next=[river(1,[0,1],2),old[1]];
 assert.doesNotThrow(()=>validateEditedRiverNetwork(old,next,ctx));
 assert.throws(()=>validateEditedRiverNetwork(old,[old[0],river(2,[8,9],4)],ctx),/RIV-007/);
 // An unchanged bad source may remain in the same connected component. Its
 // immediate fixed edge is unchanged while a valid downstream confluence varies.
 const connectedCtx=context({'0,0':'source','1,0':'confluence'}),up=river(1,[0,1],3),tributary=river(2,[4,1],2),down=river(3,[1,2],3);
 assert.doesNotThrow(()=>validateEditedRiverNetwork([up,tributary,down],[up,tributary,river(3,[1,2],4)],connectedCtx));
 assert.throws(()=>validateEditedRiverNetwork([up,tributary,down],[river(1,[0,1],4),tributary,down],connectedCtx),/RIV/);
 // A global old CYCLE code cannot authorize a second cycle; cycles are compared
 // by strongly connected physical subgraphs, not the first validator message.
 const cycles=context(),loop=[river(1,[0,1,2,0],1)],extra=[...loop,river(2,[4,5,6,4],1)];
 assert.doesNotThrow(()=>validateEditedRiverNetwork(loop,loop,cycles));
 assert.throws(()=>validateEditedRiverNetwork(loop,extra,cycles),/RIV-016/);
 const fixed=[river(1,[0,1],3)],oldContext=context({'0,0':'open'}),dryContext=context({'0,0':'source'});
 assert.throws(()=>validateEditedRiverNetwork(fixed,fixed,dryContext,oldContext),/RIV-007/,'water edits compare the accepted and candidate geometry separately');

});

// This is the BR-009 dependency contract; physical hex adjacency is covered by
// the real App adapter case, numerical confluence tables by the existing core.
test('E5 changed delta groups preserve identity and reject invalid parent, arm and overlap',()=>{
 const parent=river(5,[0,1,2,3],4),arm={...river(6,[2,4],2),deltaParentRiverId:5};
 const geometry={vertices:new Map([0,1,2,3,4,6].map(x=>[v(x).key,v(x)])),edgeOwners:new Map([parent,arm].flatMap(r=>r.sectors.flatMap(s=>s.edgeKeys.map(k=>[k,[1,2]])))),heights:new Map([[1,1],[2,1]]),lakeByVertex:new Map(),lakeHexCount:new Map(),seaVertices:new Set([v(3).key,v(4).key,v(6).key]),openVertices:new Set([v(0).key])};
 const before=[parent,arm],snapshot=structuredClone(before);
 assert.doesNotThrow(()=>validateEditedRiverDeltas(before,[river(5,[0,1,2,3],5),arm],geometry));
 assert.throws(()=>validateEditedRiverDeltas(before,[river(5,[0,1,2,3],3),arm],geometry),/delta_parent/);
 assert.throws(()=>validateEditedRiverDeltas(before,[parent,{...arm,sectors:arm.sectors.map(s=>({...s,fullness:4}))}],geometry),/delta_geometry/);
 assert.throws(()=>validateEditedRiverDeltas(before,[parent,{...river(6,[4,2],2),deltaParentRiverId:5}],geometry),/delta_geometry/);
 assert.throws(()=>validateEditedRiverDeltas(before,[parent,arm,{...river(7,[1,6],1),deltaParentRiverId:5}],geometry),/delta_parent/);
 assert.throws(()=>validateEditedRiverDeltas(before,[river(5,[0,1,2,3],5),arm,river(8,[2,4],1)],geometry),/delta_overlap/);
 assert.doesNotThrow(()=>validateEditedRiverDeltas(before,[river(5,[0,1,2,3],3)],geometry),'no arm is required or randomly recreated');assert.deepEqual(before,snapshot);
 const noMouth={...geometry,seaVertices:new Set([v(4).key,v(6).key])};
 assert.throws(()=>validateEditedRiverDeltas(before,before,noMouth,geometry),/delta_parent/,'unchanged paths must recheck a changed sea mouth');
});
