// Temporary private-catalog integration diagnostic, not a permanent Node case.
// Usage: node verify_app_c03aa09.mjs REPOSITORY_ROOT PRIVATE_CATALOG_JSON
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [root,catalogPath]=process.argv.slice(2);
const {createGenerationHarness}=await import(pathToFileURL(path.join(root,'test/helpers/generation-harness.mjs')));
const {validateKnaveCatalog,knaveCompatibleRows}=await import(pathToFileURL(path.join(root,'src/tags/knave.ts')));
const bytes=fs.readFileSync(catalogPath),sha256=createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256,'0619799a183e10bef6cd5cb34fb9c7fb9e3dfda634832e79a1811789c02b05a3');
const catalog=JSON.parse(bytes);validateKnaveCatalog(catalog);
const serial=m=>JSON.parse(JSON.stringify(m,(_key,v)=>v instanceof Map?{entries:[...v]}:v));
const physical=m=>{const x=structuredClone(m);delete x.knave;for(const r of x.regions){delete r.centralPoiKind;delete r.pointOfInterestKinds;}return serial(x);};
const outcomes=[];
for(const [seed,landType]of [[41,'wild'],[42,'settled']]){
 const plain=createGenerationHarness(seed),knave=createGenerationHarness(seed);
 for(const h of [plain,knave]){h.render();h.guardRandom();}
 knave.render().chooseKnaveProfile(true);
 const options={targetSize:18,landType,coastalPreference:'mainland'};
 const run=(h,anchor)=>assert.equal(h.render().safelyAddRegionToMap(anchor,options).success,true);
 run(plain,{q:0,r:0});run(knave,{q:0,r:0});
 const first=structuredClone(knave.render().captureDocument().map);
 assert.deepEqual(physical(first),physical(plain.render().captureDocument().map));
 const facts=knave.geometry.knaveFactsForMap(first),counts={land:0,settlement:0,water:0},categories={};
 assert.ok(facts.length);
 for(const f of facts){counts[f.kind]++;const content=first.knave.content.byPoi[f.owner];categories[content.category]=(categories[content.category]??0)+1;
  const trait=catalog.tables.place_traits[content.trait.sourceRow-1];assert.equal(content.trait.ru,trait.ru);assert.deepEqual(content.trait.references,trait.references);
  if(f.kind==='land'){assert.ok(knaveCompatibleRows(content.site.table,f).includes(content.site.sourceRow));const row=catalog.tables[content.site.table][content.site.sourceRow-1];assert.equal(content.site.ru,row.ru);assert.deepEqual(content.site.references,row.references);}else assert.equal(content.site,null);
 }
 const before=structuredClone(knave.render().captureDocument()),stacks=structuredClone([knave.render().undoHistory,knave.render().redoHistory]);
 const restore=knave.injectFunction('knaveGenerationCatalog',()=>{throw Error('temporary private-catalog failure');});
 assert.equal(knave.render().safelyAddRegionToMap(knave.render().candidateHexes[0],options).success,false);restore();
 assert.deepEqual(structuredClone(knave.render().captureDocument()),before);assert.deepEqual(structuredClone([knave.render().undoHistory,knave.render().redoHistory]),stacks);
 const reload=createGenerationHarness(seed);reload.render();reload.guardRandom();reload.injectFunction('readTextFile',async f=>f.text);reload.setWindow({alert:m=>{throw Error(m);}});
 await reload.render().handleImportJson({target:{files:[{text:JSON.stringify(knave.render().createSaveData())}],value:''}});
 assert.deepEqual(serial(reload.render().captureDocument().map),serial(first));
 const anchor=knave.render().candidateHexes[0];for(const h of [plain,knave,reload])run(h,anchor);
 const second=knave.render().captureDocument().map;assert.deepEqual(physical(second),physical(plain.render().captureDocument().map));assert.deepEqual(serial(second),serial(reload.render().captureDocument().map));
 for(const [owner,c]of Object.entries(first.knave.content.byPoi))assert.deepEqual(structuredClone(second.knave.content.byPoi[owner]),c);
 outcomes.push({seed,landType,initial_owner_counts:counts,initial_categories:categories,initial_poi_count:facts.length,after_extension_poi_count:Object.keys(second.knave.content.byPoi).length,actual_source_rows:true,exact_ru_and_references:true,world_rng_and_geometry_equal:true,reload_continuation_equal:true,prior_content_preserved:true,failure_rollback_exact:true});
}
console.log(JSON.stringify({head_sha:'57aab675665643a7dffa7b9b427e16dfbf63ef24',source_tree:'523e03ed29d7f4318bdee3776f68326ea8c0ea25',public_core_sha:'17c3a1e741b5973d693c15423ee0e637fe453570',catalog_sha256:sha256,catalog_rows:400,method:'real App handlers and actual private catalog module; no provider injection or fixture vocabulary',classification:'temporary diagnostic, separate from permanent Node and browser counts',outcomes,limitations:['Fixed functional scenarios, not statistical coverage','No private-book browser walkthrough','Not independent review or score assessment']},null,2));
