import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],output=process.argv[3],prior=process.argv.includes('--prior');
const load=rel=>import(pathToFileURL(root+'/'+rel).href);
const {createGenerationHarness}=await load('test/helpers/generation-harness.mjs');
const {regionFixture}=await load('test/helpers/region-fixture.mjs');
const {resolved}=await load('src/tags/engine.ts'),{mythicDefinitions}=await load('src/tags/mythic.ts'),{newKnaveLayer}=await load('src/knaveClassic.ts');
const text=n=>n==null||typeof n==='boolean'?'':Array.isArray(n)?n.map(text).join(' '):typeof n==='object'?text(n.props?.children):String(n);
const rows=(n,key='data-discovery-classification')=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(v=>rows(v,key)):n.props?[...(Object.hasOwn(n.props,key)?[text(n)]:[]),...rows(n.props.children,key)]:[];
const scenarios=[];
for(const kind of ['capital','city','lair','dungeon'])for(const central of [true,false])scenarios.push({id:`${central?'central':'secondary'}-${kind}`,kind,central,expected:[kind==='capital'||kind==='city'?'При прохождении':'Нужно исследование'],priorMissing:central});
for(const kind of ['capital','city','lair','dungeon'])scenarios.push({id:`detail-${kind}`,kind,central:true,active:true,expected:[kind==='capital'||kind==='city'?'При прохождении':'Нужно исследование'],priorMissing:true});
if(!prior)scenarios.push(
 {id:'forest-central-offroad',kind:'capital',biome:'plain_mixed_forest',expected:[]},
 {id:'forest-central-road-endpoint',kind:'capital',biome:'plain_mixed_forest',road:true,expected:['Заметно с дороги']},
 {id:'forest-central-nearby-road',kind:'capital',biome:'plain_mixed_forest',nearbyRoad:true,expected:[]},
 {id:'central-road-lair',kind:'lair',road:true,expected:['Нужно исследование']},
 {id:'central-road-hidden',kind:'capital',hidden:true,road:true,expected:['Нужно исследование']},
 {id:'central-hidden-overridden-text',kind:'capital',hidden:true,tagOverride:true,expected:['При прохождении']},
 {id:'central-manual-secret-over-hidden',kind:'capital',hidden:true,manual:'interaction',expected:['Секрет · взаимодействие'],clue:'OWN-MANUAL-CLUE'},
 {id:'central-manual-unknown-over-hidden',kind:'capital',hidden:true,manual:'unknown',expected:[]},
 {id:'central-legacy-secret',kind:'capital',legacy:true,expected:['Секрет · взаимодействие'],clue:'OWN-LEGACY-CLUE'},
 {id:'central-common-over-legacy',kind:'capital',legacy:true,manual:'exploration',expected:['Нужно исследование'],clue:'OWN-MANUAL-CLUE'},
 {id:'secondary-forest-road',central:false,kind:'village',biome:'plain_mixed_forest',road:true,expected:['Заметно с дороги']},
 {id:'central-en',kind:'city',lang:'en',expected:['On passage']},
 {id:'water-auto',water:true,kind:'shipwreck',expected:[]},
 {id:'water-manual',water:true,kind:'shipwreck',manual:'interaction',expected:['Секрет · взаимодействие'],clue:'OWN-MANUAL-CLUE'}
);
const observations=[];
for(const s of scenarios){
 const d=regionFixture(),central=s.central!==false,biome=s.biome??'open_plains',owner=s.water?'waterPoi:2,0':'poi:1:2,0';
 Object.assign(d.map.regions[0],{centerHex:{q:2,r:0},biomeId:biome,suppressCentralPoi:!central||s.water,centralPoiKind:central&&!s.water?s.kind:undefined,pointsOfInterest:central||s.water?[]:[{q:2,r:0}],pointOfInterestKinds:central||s.water?{}:{'2,0':s.kind}});
 d.map.biomeOverrideByHexKey={'2,0':biome};d.map.roads=[];d.map.crossings=[];delete d.map.knave;delete d.map.classification;d.ui.selectedHex={q:2,r:0};
 if(s.road||s.nearbyRoad){d.map.roads=[{id:1,regionId:1,segments:[{from:{q:s.road?1:0,r:0},to:{q:s.road?2:1,r:0},kind:'road'}]}];d.counters.nextRoadId=2;}
 if(s.hidden){const def=mythicDefinitions['mb.feature'],values=[[8],[1]],tag={definitionId:def.id,definitionVersion:1,owner:{kind:'poi',regionId:1,hexKey:'2,0'},resolver:def.resolver,revision:1,sides:[12,12],values,...resolved(def,values)};if(s.tagOverride)tag.overrides=[{ru:'Изменено автором',en:'Authored change'},{}];d.map.tags={schemaVersion:1,instances:[tag],rollCounters:{'poi:1:2,0|mb.feature|character':1,'poi:1:2,0|mb.feature|form':1}};}
 if(s.legacy){d.version=10;d.map.seas=[];d.map.nextSeaId=1;d.map.knave=newKnaveLayer();d.map.knave.discoveryByPoi[owner]={mode:'interaction',clueText:'OWN-LEGACY-CLUE'};}
 if(s.manual){d.version=11;d.map.seas=[];d.map.nextSeaId=1;d.map.classification={version:1,difficultyByHex:{},discoveryByPoi:{[owner]:{mode:s.manual,clueText:s.clue??''}}};}
 if(s.water){d.map.terrainByHexKey={'2,0':{terrainOverride:'lake',lakeId:99}};d.map.waterPoiByHexKey={'2,0':s.kind};delete d.map.biomeOverrideByHexKey['2,0'];}
 const h=createGenerationHarness(42);h.render();h.guardRandom();const alerts=[];h.setWindow({alert:m=>alerts.push(m)});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'probe'}});assert.deepEqual(alerts,[],s.id+' accepted import');
 if(s.lang)h.render().setLanguage(s.lang);
 if(s.active){const initial=h.render().captureDocument();assert.equal(h.render().startDetailAdaptation(),true);assert.equal(h.render().applyDetailAdaptation(),true);const accepted=h.render().captureDocument();assert.deepEqual(accepted.generation,initial.generation);const fp=accepted.map.physicalGrid.poiFootprints.find(p=>p.legacyRef===owner);assert.ok(fp);for(const cell of fp.cells){assert.equal(h.render().selectDetailCell(cell,undefined,1,fp.poiId),true);assert.deepEqual(rows(h.render().knavePanel),prior&&s.priorMissing?[]:s.expected,s.id+' every owner cell');}}
 const before=h.render().captureDocument(),beforeHistory=JSON.stringify(h.render().history),actual=rows(h.render().knavePanel),expected=prior&&s.priorMissing?[]:s.expected;
 assert.deepEqual(actual,expected,s.id);if(s.clue)assert.ok(text(h.render().knavePanel).includes(s.clue),s.id+' clue');
 assert.deepEqual(h.render().captureDocument(),before,s.id+' read-only document');assert.equal(JSON.stringify(h.render().history),beforeHistory,s.id+' read-only history');
 observations.push({id:s.id,actual,expected,source:'actual imported App knavePanel React tree',selectedHex:h.render().selectedHex,active:!!s.active,documentAndHistoryUnchanged:true});
}
const result={root,prior,method:'Independent reviewer diagnostic using existing unmodified actual-App harness; final map artwork excluded by existing harness, importer/controllers/panel JSX execute production source. No DOM/browser workaround. Hard-coded spec row expectations, no oracle calls into discoveryDefault.',logicalDiagnosticScripts:1,parameterObservations:observations.length,observations};fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
