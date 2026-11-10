import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from '/tmp/hx-independent64-1600/test/helpers/generation-harness.mjs';
import {regionFixture} from '/tmp/hx-independent64-1600/test/helpers/region-fixture.mjs';
import {discoveryDefault} from '/tmp/hx-independent64-1600/src/classification.ts';
import {resolved} from '/tmp/hx-independent64-1600/src/tags/engine.ts';
import {mythicDefinitions} from '/tmp/hx-independent64-1600/src/tags/mythic.ts';
import {newKnaveLayer} from '/tmp/hx-independent64-1600/src/knaveClassic.ts';
function texts(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(texts).join(' ');return node.props?texts(node.props.children):'';}
function rows(node,out=[]){if(!node||typeof node!=='object')return out;if(Array.isArray(node)){for(const n of node)rows(n,out);return out;}if(node.props){if(Object.hasOwn(node.props,'data-discovery-classification'))out.push(texts(node));rows(node.props.children,out);}return out;}
const results=[];
for(const kind of ['capital','city','lair','dungeon'])for(const central of [true,false]){
 const d=regionFixture();d.map.regions[0].centerHex={q:2,r:0};d.map.regions[0].biomeId='open_plains';d.map.biomeOverrideByHexKey={'2,0':'open_plains'};
 d.map.regions[0].suppressCentralPoi=!central;d.map.regions[0].centralPoiKind=central?kind:undefined;d.map.regions[0].pointsOfInterest=central?[]:[{q:2,r:0}];d.map.regions[0].pointOfInterestKinds=central?{}:{'2,0':kind};
 d.map.roads=[];d.map.crossings=[];delete d.map.knave;delete d.map.classification;d.ui.selectedHex={q:2,r:0};
 const h=createGenerationHarness(42);h.render();h.guardRandom();const alerts=[];h.setWindow({alert:m=>alerts.push(m)});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'x'}});
 assert.deepEqual(alerts,[]);const app=h.render();assert.equal(app.regions[0].centralPoiKind,central?kind:undefined);
 const expected=discoveryDefault({kind,biome:'open_plains',onRoad:false,hidden:false});const actual=rows(app.knavePanel);
 const r={kind,central,expected,actualDiscoveryRows:actual,panelText:texts(app.knavePanel),selectedHex:app.selectedHex};
 if(central){assert.deepEqual(actual,[],'Current central kind is dropped before classification');}else{assert.equal(actual.length,1);}
 results.push(r);
 if(central&&kind==='capital'){
  const save=app.createSaveData();save.version=11;save.map.classification={version:1,difficultyByHex:{},discoveryByPoi:{'poi:1:2,0':{mode:'interaction',clueText:'MANUAL-CENTRAL-CLUE'}}};
  await app.handleImportJson({target:{files:[{text:JSON.stringify(save)}],value:'x'}});const manual=rows(h.render().knavePanel);assert.ok(texts(h.render().knavePanel).includes('MANUAL-CENTRAL-CLUE'));results.push({kind,central,manualOverride:manual,preserved:true});
 }
}
for(const scenario of ['road-capital','road-lair','hidden-tag','hidden-tag-manual-unknown','legacy-secret','active-detail-capital','active-detail-lair']){
 const d=regionFixture(),kind=scenario.includes('lair')?'lair':'capital';
 Object.assign(d.map.regions[0],{centerHex:{q:2,r:0},biomeId:'open_plains',suppressCentralPoi:false,centralPoiKind:kind,pointsOfInterest:[],pointOfInterestKinds:{}});
 d.map.biomeOverrideByHexKey={'2,0':'open_plains'};d.map.roads=[];d.map.crossings=[];delete d.map.knave;delete d.map.classification;d.ui.selectedHex={q:2,r:0};
 if(scenario.startsWith('road')){d.map.roads=[{id:1,regionId:1,segments:[{from:{q:1,r:0},to:{q:2,r:0},kind:'road'}]}];d.counters.nextRoadId=2;}
 if(scenario.startsWith('hidden-tag')){
  const def=mythicDefinitions['mb.feature'],values=[[8],[1]],owner={kind:'poi',regionId:1,hexKey:'2,0'};
  d.map.tags={schemaVersion:1,instances:[{definitionId:def.id,definitionVersion:1,owner,resolver:def.resolver,revision:1,sides:[12,12],values,...resolved(def,values)}],rollCounters:{'poi:1:2,0|mb.feature|character':1,'poi:1:2,0|mb.feature|form':1}};
 }
 if(scenario==='hidden-tag-manual-unknown'){d.version=11;d.map.seas=[];d.map.nextSeaId=1;d.map.classification={version:1,difficultyByHex:{},discoveryByPoi:{'poi:1:2,0':{mode:'unknown',clueText:''}}};}
 if(scenario==='legacy-secret'){d.version=10;d.map.seas=[];d.map.nextSeaId=1;d.map.knave=newKnaveLayer();d.map.knave.discoveryByPoi['poi:1:2,0']={mode:'interaction',clueText:'LEGACY-CENTRAL-CLUE'};}
 const h=createGenerationHarness(42);h.render();h.guardRandom();const alerts=[];h.setWindow({alert:m=>alerts.push(m)});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'x'}});assert.deepEqual(alerts,[]);
 if(scenario.startsWith('active-detail')){assert.equal(h.render().startDetailAdaptation(),true);assert.equal(h.render().applyDetailAdaptation(),true);const physical=h.render().captureDocument().map.physicalGrid,p=physical.poiFootprints.find(p=>p.legacyRef==='poi:1:2,0');assert.ok(p);assert.equal(h.render().selectDetailCell(p.cells[0],undefined,1,p.poiId),true);}
 const actual=rows(h.render().knavePanel),panelText=texts(h.render().knavePanel);
 if(scenario==='hidden-tag')assert.deepEqual(actual,['Нужно исследование']);
 else if(scenario==='legacy-secret'){assert.deepEqual(actual,['Секрет · взаимодействие']);assert.ok(panelText.includes('LEGACY-CENTRAL-CLUE'));}
 else assert.deepEqual(actual,[]);
 results.push({scenario,kind,actualDiscoveryRows:actual,panelText,expected:scenario==='hidden-tag'?'exploration':scenario==='hidden-tag-manual-unknown'?'unknown':scenario==='legacy-secret'?'interaction':kind==='lair'?'exploration':'passage',selectedHex:h.render().selectedHex});
}
fs.writeFileSync('/tmp/hx-review-64-1600-output/central-discovery-probe.json',JSON.stringify({head_sha:'64b8476ff7f19e61e24b8b939663d90c1f2b37ec',method:'Existing harness executes actual App import/controller and returns actual knavePanel React tree; no DOM/browser; temporary reproduction, not permanent test growth',results},null,2));
console.log(JSON.stringify(results,null,2));
