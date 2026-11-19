import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {knaveFactsFixture} from './test/helpers/knave-fixture.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {newKnaveLayer} from './src/knaveClassic.ts';
import {createGenerationState} from './src/worldRandom.ts';
import {drawTagIndex} from './src/tags/engine.ts';
import {emptyKnaveContent,fillKnaveContent,knaveCompatibleRows,rerollKnaveContent,validateKnaveContent,validateKnaveCatalog} from './src/tags/knave.ts';
import catalog from './src/tags/knaveCatalogData.ts';
import fs from 'node:fs';
const policy=JSON.parse(fs.readFileSync(new URL('./src/tags/knavePolicy.json',import.meta.url)));

const links=[["locations",28,29],["structures",14,47],["structures",27,16],["structures",48,48],["structures",74,14],["structures",92,14],["place_traits",14,37],["place_traits",28,28],["place_traits",31,29],["place_traits",63,28],["place_traits",68,15],["place_traits",81,66],["place_traits",88,36],["dungeons",14,47],["dungeons",75,14],["dungeons",84,11]];
validateKnaveCatalog(catalog);
const owner='poi:1:2,0',seed=42;
const facts=knaveFactsFixture(owner);
const initial=fillKnaveContent(emptyKnaveContent(),catalog,[facts],seed);
const drawCounter=(part,n,index)=>{
  for(let counter=1;counter<100000;counter++){
    if(drawTagIndex(seed,`knave-content-v1:${owner}:${part}`,counter,n).index===index)return counter;
  }
  throw new Error('Fixture draw cannot be reached');
};
const results=[];
for(const [table,row,printedPage] of links){
  const part=table==='place_traits'?'trait':'primary';
  const pool=part==='trait'?Array.from({length:100},(_,i)=>i+1):knaveCompatibleRows(table,facts);
  if(table==='locations'&&row===28){assert.ok(!pool.includes(row));results.push({table,row,action:'excluded_from_automatic_location_pool'});continue;}
  const state=structuredClone(initial);
  if(part==='primary'){
    const sourceRow=pool[0],entry=catalog.tables[table][sourceRow-1],category=table==='structures'?'structure':'dungeon';
    Object.assign(state.byPoi[owner],{category,site:{selection:'compatible_pool',table,sourceRow,ru:entry.ru,references:entry.references,representation:policy.rows.find(r=>r.table===table&&r.sourceRow===sourceRow).poiKind}});
  }
  assert.ok(pool.includes(row));
  state.rollCounters[owner][part]=drawCounter(part,pool.length,pool.indexOf(row));
  const next=rerollKnaveContent(state,catalog,facts,seed,part),site=next.byPoi[owner][part==='trait'?'trait':'site'];
  assert.equal(site.sourceRow,row);
  assert.deepEqual(site.references,[{printedPage,resolution:'unresolved_source_reference'}]);
  validateKnaveContent(JSON.parse(JSON.stringify(next)),new Set([owner]));
  results.push({table,row,action:'rolled_and_roundtripped_as_unresolved_reference',printedPage});
}
assert.equal(results.length,16);

const data=regionFixture();
data.version=10;
data.generation=createGenerationState(seed);
data.map.seas=[];
data.map.nextSeaId=1;
data.map.regions[0].pointOfInterestKinds['2,0']='ruins';
data.map.editorNames={[owner]:{ru:'Контрольное место',en:'Control site'}};
data.map.knave=newKnaveLayer();
data.map.knave.discoveryByPoi={[owner]:{mode:'interaction',clueText:'Контрольная улика'}};
data.map.knave.content=structuredClone(initial);
const colourStart=drawCounter('trait',100,13);
data.map.knave.content.rollCounters[owner].trait=colourStart;
let time=1000;
async function open(doc){
  const h=createGenerationHarness(seed);
  h.setWindow({alert:m=>{throw new Error(m)},matchMedia:()=>({matches:false})});
  h.injectFunction('Date.now',()=>time);
  h.injectFunction('readTextFile',async f=>f.text);
  h.injectFunction('knaveGenerationCatalog',()=>catalog);
  await h.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
  return h;
}
const stable=h=>JSON.parse(JSON.stringify(h.render().captureDocument()));
const h=await open(data),before=stable(h);
assert.equal(h.render().mutateKnaveContent(owner,'trait'),true);
const colour=stable(h),p=colour.map.knave.content.byPoi[owner];
assert.equal(p.trait.sourceRow,14);
assert.deepEqual(p.trait.references,[{printedPage:37,resolution:'unresolved_source_reference'}]);
assert.deepEqual(p.site,before.map.knave.content.byPoi[owner].site);
const save=JSON.parse(JSON.stringify(h.render().createSaveData()));
assert.deepEqual(stable(await open(save)),colour);
h.render().undoMap();assert.deepEqual(stable(h),before);
h.render().redoMap();assert.deepEqual(stable(h),colour);
time+=350;
const nextExpected=drawTagIndex(seed,`knave-content-v1:${owner}:trait`,colourStart+1,100).index+1;
assert.equal(h.render().mutateKnaveContent(owner,'trait'),true);
const second=stable(h),content=second.map.knave.content.byPoi[owner];
assert.equal(content.trait.sourceRow,nextExpected);
assert.notEqual(nextExpected,14);
assert.deepEqual(content.site,p.site);
assert.deepEqual(second.map.knave.discoveryByPoi,colour.map.knave.discoveryByPoi);
assert.deepEqual(second.map.editorNames,colour.map.editorNames);
const extra=structuredClone(second.map.knave.content);
extra.byPoi[owner].additionalTraits=[p.trait,content.trait];
assert.throws(()=>validateKnaveContent(extra,new Set([owner])));
console.log(JSON.stringify({references:results,app:{colour_label_d100:14,colour_target_page:37,colour_target_row_saved:false,save_reload:true,undo_redo:true,second_trait_draw:nextExpected,previous_trait_replaced:true,extra_list_rejected:true,anchors_and_clue_preserved:true}}));
