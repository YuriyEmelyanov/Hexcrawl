import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalUnitWidth,physicalUnitCenter,physicalUnitCell,physicalUnitPolygon} from '../src/physicalUnit.ts';
import {emptyFeaturePreparation,fillFeaturePreparation,featureCategory,featureContext,validateFeaturePreparation,editPreparedFeature,removePreparedFeature,pf2FeatureCatalog} from '../src/tags/pf2Features.ts';
import {drawTagIndex} from '../src/tags/engine.ts';
import {createDetailGrid,detailCellPolygon} from '../src/detailGrid.ts';

// New PF2 contracts cannot be exercised by Knave's d100/owner fixtures:
// physical convention, processed unit ledger and batch-wide atomic refusal.
const candidates=Array.from({length:300},(_,q)=>({q,r:0,context:q%2?'forest':'desert',protected:false}));
const clone=structuredClone;
test('PF2 physical unit uses shared geometry with twelve vertex miles, stable inverse and exact d20 boundaries',()=>{
 const u=emptyFeaturePreparation().physicalUnit,width=physicalUnitWidth(u);
 assert.equal(width,6*Math.sqrt(3));
 const polygon=physicalUnitPolygon(u,{q:0,r:0});assert.ok(Math.abs(Math.hypot(polygon[0].x-polygon[3].x,polygon[0].y-polygon[3].y)-12)<1e-9);
 assert.deepEqual(polygon,detailCellPolygon(createDetailGrid(1),{q:0,r:0}).map(p=>({x:p.x*width,y:p.y*width})));
 for(const q of [-8,0,19])for(const r of [-7,0,11]){const c={q,r};assert.deepEqual(physicalUnitCell(u,physicalUnitCenter(u,c)),c);}
 const counts={landmark:0,secret:0,resource:0,standard:0};for(let d=1;d<=20;d++)counts[featureCategory(d)]++;
 assert.deepEqual(Object.values(counts).map(n=>n*5),[15,15,15,55]);assert.deepEqual(Object.values(counts).map(n=>n*15),[45,45,45,165]);
 for(const d of [0,21,1.5,NaN,Infinity])assert.throws(()=>featureCategory(d));
 assert.throws(()=>physicalUnitWidth({...u,measurement:'unknown'}));assert.throws(()=>physicalUnitWidth({...u,length:0}));
 assert.equal(featureContext('swamp_forest','land'),'swamp');assert.equal(featureContext('mountains','lake'),'aquatic');assert.throws(()=>featureContext('arctic','land'));
});

test('PF2 batch300 preserves input, protected units, deterministic IDs/order and idempotent standard results',()=>{
 const before=emptyFeaturePreparation(),saved=clone(before),input=[...candidates,{q:301,r:0,context:'forest',protected:true}];
 const state=fillFeaturePreparation(before,input,42);assert.deepEqual(before,saved);
 assert.equal(Object.keys(state.units).length,300);assert.equal(state.units['301,0'],undefined);
 assert.deepEqual(fillFeaturePreparation(before,[...input].reverse(),42),state);
 for(const [k,record]of Object.entries(state.units))assert.equal(record.outcome,drawTagIndex(42,`pf2-feature:v1:unit:${k}:category`,0,20).index+1);
 assert.strictEqual(fillFeaturePreparation(state,input,42),state);assert.ok(Object.values(state.units).some(u=>u.disposition==='standard'));
 const reopened=JSON.parse(JSON.stringify(state));validateFeaturePreparation(reopened);assert.deepEqual(reopened,state);
 const extended=fillFeaturePreparation(state,[{q:302,r:0,context:'aquatic',protected:false}],42);
 for(const [k,u]of Object.entries(state.units))assert.deepEqual(extended.units[k],u);
 assert.equal(pf2FeatureCatalog.length,17);assert.equal(state.physicalUnit.measurement,'opposite_vertices');
});

test('PF2 whole batch and strict snapshot validation reject malformed records without input writes',()=>{
 const before=emptyFeaturePreparation(),saved=clone(before);
 for(const bad of [{...candidates[0],context:'unknown'},{...candidates[0],r:NaN},{...candidates[0],q:-0}]){
  assert.throws(()=>fillFeaturePreparation(before,[candidates[1],bad],42));assert.deepEqual(before,saved);
 }
 assert.throws(()=>fillFeaturePreparation(before,[candidates[0],candidates[0]],42));
 const state=fillFeaturePreparation(before,candidates,42),id=Object.keys(state.features)[0];
 const mutations=[s=>s.future=true,s=>s.schemaVersion=2,s=>s.physicalUnit.measurement='across_flats',s=>s.units['0,0'].outcome=21,s=>s.units['0,0'].category='bad',s=>s.features[id].worldAnchor.x++,s=>s.features[id].template.source_url='forged',s=>s.features[id].template.id='unknown',s=>s.features[id].descriptionOverride='x'.repeat(20001),s=>s.nextFeatureId=Number(id),s=>s.units['bad']=s.units['0,0']];
 for(const change of mutations){const bad=clone(state);change(bad);assert.throws(()=>validateFeaturePreparation(bad));assert.deepEqual(before,saved);}
 const exhausted={...before,nextFeatureId:Number.MAX_SAFE_INTEGER};assert.throws(()=>fillFeaturePreparation(exhausted,candidates,42));assert.deepEqual(exhausted.units,{});
});

test('PF2 literal editing and deletion preserve sibling records, monotone IDs and removed-unit tombstones',()=>{
 const state=fillFeaturePreparation(emptyFeaturePreparation(),candidates,42),id=Number(Object.keys(state.features)[0]),k=state.features[id].unitKey;
 const edited=editPreparedFeature(state,id,{name:'',description:'<script>literal</script>'+'x'.repeat(19976),discovery:'search'});
 assert.equal(edited.features[id].descriptionOverride.length,20000);assert.equal(state.features[id].descriptionOverride,undefined);
 for(const [other,f]of Object.entries(state.features))if(Number(other)!==id)assert.deepEqual(edited.features[other],f);
 const removed=removePreparedFeature(edited,id);assert.equal(removed.features[id],undefined);assert.equal(removed.units[k].disposition,'removed');assert.equal(removed.nextFeatureId,state.nextFeatureId);
 assert.strictEqual(fillFeaturePreparation(removed,candidates,42),removed);
 const literal=clone(edited);literal.features[id].template.title.ru='Accepted literal from saved catalog';validateFeaturePreparation(literal);assert.equal(literal.features[id].template.title.ru,'Accepted literal from saved catalog');
 assert.throws(()=>editPreparedFeature(state,id,{description:'x'.repeat(20001)}));
});
