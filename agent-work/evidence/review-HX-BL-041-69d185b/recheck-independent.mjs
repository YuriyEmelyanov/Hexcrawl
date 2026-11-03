import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/recheck-harness.mjs';
import {emptyTags,rollTag,findTag,ownerKey,tagKey} from '../src/tags/engine.ts';
import {mythicDefinitions as defs,tagOwners,tagPolicy} from '../src/tags/mythic.ts';
const sha='69d185b14e425c5de037cf7266c4d3bf2a37a5a7',out={sha,cases:[]};
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/baseline-mythic.json',import.meta.url)));
async function load(h,save=fixture){h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(save)}],value:''}});h.render();}
const snap=h=>{const a=h.render();return structuredClone({doc:a.captureDocument(),undo:a.undoHistory,redo:a.redoHistory,rev:a.documentRevision.current});};
function full(o,id='mb.land',count=64){const s=rollTag(emptyTags(),o,defs[id],42),base=s.instances[0];s.instances=Array.from({length:count},(_,i)=>({...structuredClone(base),definitionId:i===0?id:`future.${i}`,definitionVersion:i===0?1:99}));return s;}
function valid(h){h.geometry.assertHexcrawlSaveData(h.render().createSaveData());}
async function redo(h,o,id){assert.equal(h.render().mutateTag(o,id,0),true);h.render();h.render().undoMap();h.render();assert.equal(h.render().redoHistory.length,1);}
function reject(h,name,action){console.log('BEGIN',name);const before=snap(h);const result=action();console.log('RESULT',result,h.render().editError);assert.deepEqual(snap(h),before,name);valid(h);out.cases.push({name,result,error:h.render().editError,instances:h.render().tags.instances.length,redo:before.redo.length,revisionUnchanged:true,documentHistoryCountersRngUnchanged:true,exportValid:true});console.log('PASS',name);}
if(process.argv[2]!=='auto'){
 const h=createGenerationHarness(42);await load(h);const o={kind:'region',id:h.render().regions[0].id};
 const s=h.render().createSaveData();s.map.tags=full(o);await load(h,s);valid(h);await redo(h,o,'mb.land');
 reject(h,'optional roll at 64 tags, RU',()=>h.render().mutateTag(o,'mb.flora'));
 h.render().setLanguage('en');h.render();reject(h,'optional roll at 64 tags, EN',()=>h.render().mutateTag(o,'mb.fauna'));
 h.render().redoMap();h.render();assert.equal(h.render().redoHistory.length,0);valid(h);
 const t=h.render().createSaveData();findTag(t.map.tags,o,'mb.land').overrides=[Object.fromEntries(['en','de','fr','es','it','ja','ko','zh'].map(l=>[l,'saved override'])),{}];
 await load(h,t);h.render().setLanguage('ru');h.render();await redo(h,o,'mb.land');
 reject(h,'edit ninth override locale with populated Redo',()=>h.render().mutateTag(o,'mb.land',undefined,{index:0,text:'Новый'}));
 h.render().setLanguage('en');h.render();assert.equal(h.render().mutateTag(o,'mb.land',undefined,{index:0,text:'updated en'}),true);h.render();valid(h);
 out.cases.push({name:'edit existing eighth locale succeeds',languages:Object.keys(findTag(h.render().tags,o,'mb.land').overrides[0]),exportValid:true});
}
if(process.argv[2]==='auto'){
 const h=createGenerationHarness(42);await load(h);h.render().setGenerationMode('mythic');h.render();const entries=[...tagOwners(h.render().captureDocument().map).values()];
 const target=entries.find(x=>tagPolicy(x.type).automatic.includes('holding')&&h.render().regions.some(r=>r.id===x.owner.regionId&&`${r.centerHex.q},${r.centerHex.r}`===x.owner.hexKey));assert.ok(target);console.log('TARGET',target,'MODE',h.render().generationMode);
 const s=h.render().createSaveData();s.map.tags=full(target.owner,'mb.feature');await load(h,s);await redo(h,target.owner,'mb.feature');
 reject(h,'fill missing tags at 64 with populated Redo',()=>h.render().fillMissingTags());
 // At 63, the first required holding tag can prepare successfully; the next must reject the whole fill.
 const t=h.render().createSaveData();t.map.tags=full(target.owner,'mb.feature',63);await load(h,t);await redo(h,target.owner,'mb.feature');
 reject(h,'fill partial clone at 63 discards all prepared additions',()=>h.render().fillMissingTags());
 const u=h.render().createSaveData();u.map.tags=full(target.owner,'mb.feature');await load(h,u);await redo(h,target.owner,'mb.feature');
 // Manual POI type edit triggers automatic reconciliation in the actual production command.
 h.render().setSelectedHex(target.owner.hexKey.split(',').reduce((p,v,i)=>(p[i?'r':'q']=+v,p),{}));h.render();
 reject(h,'POI type change with automatic tags rejects whole map',()=>h.render().setSelectedCentralPoiKind('sanctuary'));
 // The generated-commit path runs the same reconciliation before its document/history writes.
 const a=h.render(),checkpoint=structuredClone(a.captureDocument().map),map=structuredClone(checkpoint);
 map.regions=map.regions.map(r=>r.id===target.owner.regionId?{...r,centralPoiKind:'sanctuary'}:r);
 reject(h,'automatic reconciliation in generated commit',()=>{try{a.recordGenerated(checkpoint,map,a.selectedHex??{q:0,r:0},a.captureGenerationBackup());return 'unexpected success';}catch(e){assert.match(String(e),/capacity/);return String(e);}});
}
fs.writeFileSync(process.env.HX_RECHECK_OUTPUT??'/tmp/hx041-independent.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
