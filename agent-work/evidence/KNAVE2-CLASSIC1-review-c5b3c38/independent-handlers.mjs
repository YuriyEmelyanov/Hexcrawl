import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from './runtime/test/helpers/generation-harness.mjs';
import {knaveCompatibleRows,validateKnaveCatalog} from './runtime/src/tags/knave.ts';
const catalog=JSON.parse(fs.readFileSync('/workspace/scratch/320e5b03f904/knave-catalog-work/Knave2-Classic1-catalog-RU.json'));
validateKnaveCatalog(catalog);
const clone=x=>structuredClone(x),serial=x=>JSON.parse(JSON.stringify(x,(_,v)=>v instanceof Map?[...v]:v));
const results=[];
for(const [seed,landType] of [[137,'wild'],[223,'settled'],[901,'wild']]){
 const make=()=>{const h=createGenerationHarness(seed);h.render();h.guardRandom();return h;};
 const h=make(),p=make();h.render().chooseKnaveProfile(true);
 const opt={targetSize:18,landType,coastalPreference:'mainland'};
 const gen=(g,a)=>assert.equal(g.render().safelyAddRegionToMap(a,opt).success,true);
 gen(h,{q:0,r:0});gen(p,{q:0,r:0});
 const first=clone(h.render().captureDocument()),physical=x=>{const m=clone(x);delete m.knave;for(const r of m.regions){delete r.centralPoiKind;delete r.pointOfInterestKinds;}return serial(m);};
 assert.deepEqual(physical(first.map),physical(p.render().captureDocument().map));
 const facts=h.geometry.knaveFactsForMap(first.map);let sites=0;
 for(const f of facts){const c=first.map.knave.content.byPoi[f.owner];assert.equal(c.trait.ru,catalog.tables.place_traits[c.trait.roll-1].ru);if(c.site){sites++;assert.ok(knaveCompatibleRows(c.site.table,f).includes(c.site.sourceRow));assert.equal(c.site.ru,catalog.tables[c.site.table][c.site.sourceRow-1].ru);}else assert.ok(['settlement','water'].includes(f.kind));}
 const anchor=h.render().candidateHexes[0],before=clone(h.render().captureDocument()),stacks=clone([h.render().undoHistory,h.render().redoHistory]);
 const restore=h.injectFunction('knaveGenerationCatalog',()=>null);assert.equal(h.render().safelyAddRegionToMap(anchor,opt).success,false);restore();assert.deepEqual(clone(h.render().captureDocument()),before);assert.deepEqual(clone([h.render().undoHistory,h.render().redoHistory]),stacks);
 const reload=make();reload.injectFunction('readTextFile',async f=>f.text);reload.setWindow({alert:m=>{throw Error(m);}});await reload.render().handleImportJson({target:{files:[{text:JSON.stringify(h.render().createSaveData())}],value:''}});
 gen(h,anchor);gen(reload,anchor);assert.deepEqual(serial(h.render().captureDocument().map),serial(reload.render().captureDocument().map));
 for(const [k,c]of Object.entries(first.map.knave.content.byPoi))assert.deepEqual(clone(h.render().captureDocument().map.knave.content.byPoi[k]),c);
 h.render().undoMap();assert.deepEqual(clone(h.render().captureDocument().map),first.map);h.render().redoMap();
 results.push({seed,landType,initialOwners:facts.length,initialSites:sites,extendedOwners:Object.keys(h.render().captureDocument().map.knave.content.byPoi).length,physicalAndRngEquivalent:true,invalidCatalogRollback:true,reloadContinuation:true,previousSnapshotsLiteral:true,undoRedo:true});
}
const report={classification:'temporary independent reviewer diagnostic, not permanent suite growth',privateSha:'c5b3c384792ce3349e40b0cc3ccc52e3d7685d1e',catalogRows:400,results};fs.writeFileSync(new URL('./handler-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
