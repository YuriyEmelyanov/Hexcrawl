import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {fineRoadPresentation} from './src/oneMilePresentation.ts';
const exact='/workspace/scratch/93351762c143/review-c02-c05-exact';
const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)}});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:fs.readFileSync(exact+'/test/fixtures/road-entry-zigzags.json','utf8')}],value:'x'}});
const prepared=h.render().previewOneMile();assert.ok(prepared);assert.equal(h.render().applyOneMilePreview(prepared),true);
const doc=h.render().captureDocument(),original=structuredClone(doc),results=[];
const labels=refs=>{const app=h.render();return refs.map(ref=>({ref,...app.finePoi(app.physicalGrid.poiFootprints.find(p=>p.legacyRef===ref)??{legacyRef:ref})}));};
const refs=h.render().physicalGrid.poiFootprints.map(p=>p.legacyRef);
for(const lang of ['ru','en']){h.render().setLanguage(lang);results.push({id:'actual-initial-'+lang,labels:labels(refs)});}
const targets=['poi:1:0,0','poi:1:1,-1',refs.find(r=>r.startsWith('waterPoi:'))];
assert.ok(targets.every(Boolean));
for(const ref of targets)doc.map.editorNames[ref]={ru:('Одинаковое имя '+ 'Длинное '.repeat(7)).trim(),en:('Same name '+'Long '.repeat(10)).trim()};
h.render().applyDocument(doc);
for(const lang of ['ru','en']){h.render().setLanguage(lang);const values=labels(targets);results.push({id:'named-duplicate-long-'+lang,labels:values});assert.ok(values.every(v=>v.label.endsWith(doc.map.editorNames[v.ref][lang])));}
for(const ref of targets)delete doc.map.editorNames[ref];
delete doc.map.toponyms['settlement:1:0,0'];delete doc.map.toponyms['settlement:1:1,-1'];
h.render().applyDocument(doc);
for(const lang of ['ru','en']){h.render().setLanguage(lang);results.push({id:'unnamed-'+lang,labels:labels(targets)});}
// Missing land type is a supported legacy state. Unknown enum strings are
// parser-invalid; direct resolver safety below is not an accepted-input claim.
delete doc.map.regions.find(r=>r.id===1).pointOfInterestKinds['1,-1'];
doc.map.physicalGrid.poiFootprints.find(p=>p.legacyRef==='poi:1:1,-1').extent={kind:'default',reason:'unknown_size',policy:'one_cell'};
h.render().applyDocument(doc);
for(const lang of ['ru','en']){h.render().setLanguage(lang);results.push({id:'missing-land-type-'+lang,labels:labels(['poi:1:1,-1','poi:999:0,0','garbage',null])});}
doc.map.editorNames['poi:1:1,-1']={ru:'<script>& Название',en:'<script>& Town Hall'};h.render().applyDocument(doc);
for(const lang of ['ru','en']){h.render().setLanguage(lang);const values=labels(['poi:1:1,-1']);assert.ok(values[0].label.endsWith(doc.map.editorNames['poi:1:1,-1'][lang]));results.push({id:'unknown-type-known-authored-name-'+lang,labels:values});}
const label=labels(['poi:1:1,-1'])[0].label;
const localRequire=createRequire(exact+'/src/App.tsx'),module={exports:{}};
const code=ts.transpileModule(fs.readFileSync(exact+'/src/OneMileArtwork.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInThisContext(`(function(exports,module,require){${code}\n})`)(module.exports,module,n=>localRequire(n.startsWith('./')?n+'.ts':n));
const state=h.render().physicalGrid,owner=state.poiFootprints.find(p=>p.legacyRef==='poi:1:1,-1');
const common={state:{...state,poiFootprints:[owner]},cells:[],candidates:[],offset:{x:0,y:0},rotated:false,revision:0,coordinates:false,busy:false,visual:()=>({color:'#fff'}),poi:()=>({label,image:'/unknown.svg',emoji:'◆'}),water:null,rapids:[],waterfalls:[],onHover:()=>{},onPick:()=>{}};
const rendered=renderToStaticMarkup(React.createElement('svg',{},React.createElement(module.exports.OneMileArtwork,{...common,roads:[],crossings:[],rivers:[]})));
assert.ok(rendered.includes('aria-label="Point of interest &lt;script&gt;&amp; Town Hall"'));assert.ok(!rendered.includes('<script>'));
fs.writeFileSync(new URL('./escaped-poi.svg',import.meta.url),rendered);results.push({id:'actual-renderer-accessibility-and-escaping',status:'pass',label});
h.render().applyDocument(original);
const app=h.render(),source=JSON.stringify(app.captureDocument());
const actual=[];for(const r of app.roadSegments){const p=fineRoadPresentation(r,app.renderedCrossings,app.riverSegments);for(const c of p.crossings)actual.push({key:c.key,kind:c.kind,roadKind:r.kind,rails:p.rails,pieces:p.pieces});}
assert.equal(JSON.stringify(h.render().captureDocument()),source);
results.push({id:'actual-crossing-plans',plans:actual});
const road={key:'r',roadId:1,segmentKey:'s',x1:0,y1:0,x2:10,y2:0,kind:'trail'};
const cross={key:'c',roadId:1,roadSegmentKey:'s',riverId:2,x:5,y:0,kind:'ferry'};
const river={key:'river-segment-2-1',x1:5,y1:-5,x2:5,y2:5,width:6};
for(const [id,c,rs] of [
 ['multi',[{...cross,key:'b',x:8,kind:'ford'},{...cross,key:'a',x:2},{...cross,key:'a',x:2}],[{...river,x1:2,x2:2},{...river,key:'river-segment-2-2',x1:8,x2:8}]],
 ['endpoint',[{...cross,x:0}],[{...river,x1:0,x2:0}]],
 ['acute',[cross],[{...river,x1:0,y1:-.000000001,x2:10,y2:.000000001}]],
 ['river-endcap',[cross],[{...river,x1:5,y1:0,x2:5.1,y2:.1}]],
 ['off-model',[{...cross,x:5,y:1}],[river]],
]){const plan=fineRoadPresentation(road,c,rs);for(const p of plan.pieces)assert.ok([p.x1,p.y1,p.x2,p.y2].every(Number.isFinite)&&p.x1>=0&&p.x2<=10&&p.x1<p.x2);results.push({id,plan});}
fs.writeFileSync(new URL('./results.json',import.meta.url),JSON.stringify({head:'60059737ec94b54db88c2f49c8d16e99da7d85a8',results},null,2));
console.log(JSON.stringify({status:'pass',observations:results.length,targets}));
