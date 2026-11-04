import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyRiverFeatures,migrateRiverEditing,validateDeltaReferences,allocateRiverId,validateRiverFeatures,prepareRiverFeatureEdit,featuresForSurvivingRivers,prepareRiverEdit,riverFeatureEdge,validateEditedRiverNetwork,reserveGeneratedRiverIds} from '../src/manualRivers.ts';
// E5-AC06/07: persistence intentions and identity allocation are new contracts.
// Existing riverRapids/riverWaterfalls test probability tables; riverModel tests
// numerical rules. Reuse that core, do not copy its exhaustive truth tables here.
const v=x=>({key:`${x},0`,x,y:0});
const river=(id,path=[0,1,2,3],fullness=2)=>({id,regionId:1,vertexPath:path.map(v),sectors:path.slice(1).map((b,i)=>({id:`s${id}-${i}`,riverId:id,sectorIndex:i+1,vertexPath:[v(path[i]),v(b)],edgeKeys:[riverFeatureEdge(v(path[i]),v(b))],startVertexKey:v(path[i]).key,endVertexKey:v(b).key,startReason:i?'region_boundary':'river_start',endReason:i===path.length-2?'river_end':'region_boundary',fullness,assignedRegionId:i<1?1:2}))});
const base=()=>({rivers:[river(5)],riverFeatures:emptyRiverFeatures(),nextRiverId:6});
const eligibility={rapid:()=>true,waterfall:()=>true};
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
});
