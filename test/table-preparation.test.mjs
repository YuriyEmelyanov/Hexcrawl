import test from 'node:test';
import assert from 'node:assert/strict';
import {applyPreparation,preparationView,preparationLink,validatePreparation,retainPreparation,remapPreparation} from '../src/tags/tablePreparation.ts';
import {emptyKnaveContent,fillKnaveContent,knaveCompatibleRows} from '../src/tags/knave.ts';
import {drawTagIndex} from '../src/tags/engine.ts';
import {knaveCatalogFixture,knaveFactsFixture} from './helpers/knave-fixture.mjs';

// Existing tags.test.mjs protects schema1 and the active App. These tests reuse
// its authored fixture for the new detached schema2 contract, not UI coverage.
const owner='poi:1:0,0',other='poi:2:1,0',water='waterPoi:2,0';
function setup(){
 const catalog=knaveCatalogFixture(),live=new Set([owner,other,water]);
 catalog.tables.structures[26].references=[{printedPage:16,resolution:'unresolved_source_reference'}];
 catalog.tables.dungeons[83].references=[{printedPage:11,resolution:'unresolved_source_reference'}];
 catalog.tables.dungeons[99].references=[{printedPage:99,resolution:'unresolved_source_reference'}];
 const facts=Object.fromEntries([...live].map(k=>[k,knaveFactsFixture(k)]));
 return {catalog,live,seed:42,categories:{[owner]:'natural',[other]:'structure',[water]:'water'},facts};
}
const add=(input,ctx,table='locations',row=1,key=owner)=>applyPreparation(input,ctx,{kind:'add',owner:key,table,choice:{kind:'manual',row}});
const error=code=>e=>e.code===code;

test('TABLES1 projection preserves all legacy literals, references and counters without materializing a write',()=>{
 const ctx=setup(),legacy=fillKnaveContent(emptyKnaveContent(),ctx.catalog,Object.values(ctx.facts),ctx.seed);
 legacy.byPoi[owner].trait.ru='Literal accepted trait (стр. 11)';
 const before=structuredClone(legacy),view=preparationView(legacy,ctx.catalog,ctx.live);
 assert.deepEqual(legacy,before);assert.deepEqual(view,preparationView(legacy,ctx.catalog,ctx.live));
 for(const key of ctx.live){const old=legacy.byPoi[key],calls=view.byPoi[key].calls,counters=legacy.rollCounters[key];
  assert.equal(calls.length,old.site?2:1);assert.equal(calls.at(-1).ru,old.trait.ru);assert.equal(calls.at(-1).rollCounter,counters.trait);
  assert.deepEqual(calls.at(-1).references,old.trait.references);assert.equal(view.byPoi[key].migrationMeta.categoryCounter,counters.category);
  if(old.site){assert.equal(calls[0].ru,old.site.ru);assert.equal(calls[0].rollCounter,counters.primary);assert.equal(calls[0].selection,'legacy_compatible_pool');}
 }
 assert.equal(applyPreparation(legacy,ctx,{kind:'description',owner,value:''}),legacy);
 const edited=applyPreparation(legacy,ctx,{kind:'description',owner,value:'Door under the mill'});
 assert.equal(edited.schemaVersion,2);assert.equal(edited.byPoi[owner].description,'Door under the mill');assert.deepEqual(legacy,before);
 view.byPoi[owner].calls[0].references.push({printedPage:20,resolution:'unresolved_source_reference'});assert.deepEqual(legacy,before);
});

test('TABLES1 independent manual calls keep stable identities, 00 is row100, and allocation never reuses a removed ID',()=>{
 const ctx=setup();let state=add(undefined,ctx,'locations',100);state=add(state,ctx,'locations',100);
 assert.deepEqual(state.byPoi[owner].calls.map(c=>[c.id,c.sourceRow,c.printedResult,c.selection,c.rollCounter]),[[1,100,'00','manual',0],[2,100,'00','manual',0]]);
 const before=structuredClone(state);assert.throws(()=>add(state,ctx,'locations',0),error('row'));assert.deepEqual(state,before);
 state=applyPreparation(state,ctx,{kind:'remove',owner,id:1});state=add(state,ctx);
 assert.deepEqual(state.byPoi[owner].calls.map(c=>c.id),[2,3]);assert.equal(state.nextCallId,4);
 const max={...state,nextCallId:Number.MAX_SAFE_INTEGER};assert.throws(()=>add(max,ctx),error('id_overflow'));
});

test('TABLES1 draws use a call-local deterministic counter and retain the legacy compatible pool',()=>{
 const ctx=setup();let state=add(undefined,ctx);state=add(state,ctx,'structures',1,other);const frozen=structuredClone(state);
 const random=Math.random;Math.random=()=>{throw Error('ambient RNG used');};
 try{
  const cmd={kind:'reroll',owner,id:1},after=applyPreparation(state,ctx,cmd),again=applyPreparation(state,ctx,cmd),draw=drawTagIndex(ctx.seed,'knave-tables-v1:call:1',0,100);
  assert.deepEqual(after,again);assert.equal(after.byPoi[owner].calls[0].sourceRow,draw.index+1);assert.equal(after.byPoi[owner].calls[0].rollCounter,1);
  assert.deepEqual(after.byPoi[other],state.byPoi[other]);assert.deepEqual(state,frozen);
  const legacy=fillKnaveContent(emptyKnaveContent(),ctx.catalog,[ctx.facts[owner]],42),view=preparationView(legacy,ctx.catalog,ctx.live),primary=view.byPoi[owner].calls[0];
  const result=applyPreparation(legacy,ctx,{kind:'reroll',owner,id:primary.id}),rows=knaveCompatibleRows(primary.table,ctx.facts[owner]);
  const expected=drawTagIndex(ctx.seed,`knave-tables-v1:call:${primary.id}`,primary.rollCounter,rows.length);
  assert.equal(result.byPoi[owner].calls[0].sourceRow,rows[expected.index]);assert.equal(result.byPoi[owner].calls[0].selection,'legacy_compatible_pool');
  assert.deepEqual(result.byPoi[owner].calls[1],view.byPoi[owner].calls[1]);
  assert.throws(()=>applyPreparation(legacy,{...ctx,facts:{}},{kind:'reroll',owner,id:primary.id}),error('facts_required'));
 }finally{Math.random=random;}
});

test('TABLES1 links are explicit, one level deep, and next-entry preserves the original child snapshot',()=>{
 const ctx=setup();let state=add(undefined,ctx,'structures',27);
 state=applyPreparation(state,ctx,{kind:'link',owner,id:1,choice:{kind:'manual',row:84}});
 const child=structuredClone(state.byPoi[owner].calls[1]);assert.equal(child.parentId,1);assert.equal(child.edgeId,'structures:27->dungeons');
 assert.equal(applyPreparation(state,ctx,{kind:'link',owner,id:1,choice:{kind:'roll'}}),state);
 assert.throws(()=>applyPreparation(state,ctx,{kind:'link',owner,id:2,choice:{kind:'roll'}}),error('target_unavailable'));
 const next=applyPreparation(state,ctx,{kind:'nextEntry',owner,id:2});assert.deepEqual({...next.byPoi[owner].calls[1],nextEntry:undefined},{...child,nextEntry:undefined});
 assert.equal(next.byPoi[owner].calls[1].nextEntry.sourceRow,85);assert.equal(next.nextCallId,state.nextCallId);assert.equal(applyPreparation(next,ctx,{kind:'nextEntry',owner,id:2}),next);
 assert.throws(()=>applyPreparation(next,ctx,{kind:'reroll',owner,id:2}),error('dependent_confirmation_required'));
 assert.throws(()=>applyPreparation(state,ctx,{kind:'remove',owner,id:1}),error('dependent_confirmation_required'));
 const removed=applyPreparation(state,ctx,{kind:'remove',owner,id:1,confirmDependents:true});assert.deepEqual(removed.byPoi[owner].calls,[]);
 const last=applyPreparation(add(undefined,ctx,'structures',27),ctx,{kind:'link',owner,id:1,choice:{kind:'manual',row:100}});
 assert.throws(()=>applyPreparation(last,ctx,{kind:'nextEntry',owner,id:2}),error('next_entry_unavailable'));
 assert.equal(preparationLink({table:'locations',sourceRow:27}),undefined);assert.deepEqual(preparationLink({table:'dungeons',sourceRow:84}),{id:'dungeons:84->structures',target:'structures'});
});

test('TABLES1 import rejects corrupt identity, versions, source locators and relationships without changing input',()=>{
 const ctx=setup(),state=add(add(undefined,ctx),ctx);
 const bad=[s=>s.schemaVersion=3,s=>s.nextCallId=2,s=>s.byPoi[owner].calls[1].id=1,s=>s.byPoi[owner].calls[0].sourceRef.row=2,
 s=>s.byPoi[owner].calls[0].parentId=2,s=>s.byPoi[owner].calls[0].rollValue=1,s=>s.byPoi[owner].calls[0].extra=true,
 s=>s.byPoi[owner].calls[0].parentId=undefined,s=>s.byPoi[owner].description='x'.repeat(20001),s=>s.byPoi[owner].calls[0].selection='uniform'];
 for(const mutate of bad){const copy=structuredClone(state);mutate(copy);assert.throws(()=>validatePreparation(copy,ctx.live));}
 const before=structuredClone(state);assert.throws(()=>applyPreparation(state,ctx,{kind:'add',owner:'poi:9:9,9',table:'locations',choice:{kind:'roll'}}),error('owner'));assert.deepEqual(state,before);
});

test('TABLES1 identity remap and confirmed retention preserve calls and monotonic allocation, refusing collisions',()=>{
 const ctx=setup(),state=add(add(undefined,ctx),ctx,'dungeons',84,other),before=structuredClone(state),target='poi:3:3,0';
 const moved=remapPreparation(state,new Map([[owner,target]]),new Set([target,other,water]));
 assert.deepEqual(moved.byPoi[target],state.byPoi[owner]);assert.equal(moved.nextCallId,state.nextCallId);assert.deepEqual(state,before);
 moved.byPoi[target].description='Independent clone';assert.equal(state.byPoi[owner].description,'');
 const retained=retainPreparation(state,new Set([other]));assert.deepEqual(Object.keys(retained.byPoi),[other]);assert.equal(retained.nextCallId,state.nextCallId);
 assert.throws(()=>remapPreparation(state,new Map([[owner,other]]),ctx.live),error('owner_collision'));
});
