import {reconcileDetailPoiIdentities} from '../src/detailIdentity.ts';
import {poiNameLocators} from '../src/manualPois.ts';
import {knaveContentFixture,knaveCatalogFixture} from './helpers/knave-fixture.mjs';
import {newKnaveLayer} from '../src/knaveClassic.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {regionFixture} from './helpers/region-fixture.mjs';
const serial=x=>JSON.parse(JSON.stringify(x));
const save=h=>{const d=serial(h.render().createSaveData());delete d.savedAt;return d;};
const stacks=h=>structuredClone([h.render().undoHistory,h.render().redoHistory]);
async function setup(mode='classic',data=regionFixture(mode)){
 const h=createGenerationHarness(42);h.render();h.guardRandom();
 if(data.map.knave)h.injectFunction('knaveGenerationCatalog',knaveCatalogFixture);
 h.setWindow({alert:m=>{throw Error(m);},matchMedia:()=>({matches:false})});
 h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});h.render();return h;
}
function withDetailIdentities(data){data.version=11;data.map.physicalGrid={schema:'hexcrawl.detail1',version:1,active:true,grid:{origin:{x:0,y:0},orientation:'pointy',convention:'across_flats'},source:{stepMiles:6,physicalConvention:'unknown',displayAssumption:'project_across_flats_6mi'},viewStep:6,poiFootprints:[],poiIdentities:reconcileDetailPoiIdentities(poiNameLocators({regions:data.map.regions,waterPoiByKey:new Map(Object.entries(data.map.waterPoiByHexKey??{}))},true))};return data;}
function draft(h,type,patch){h.render().setEditMode(true);assert.equal(h.render().startRegionDraft(type),true);const d=h.render().regionDraft;assert.equal(h.render().changeRegionDraft(d,{...d.edit,...patch}),true);return h.render().regionDraft;}
function continuation(h){const a=h.render();a.generateAt(a.candidateHexes[0]);for(let i=0;i<310&&h.render().kingdomJob;i++)h.render().advanceKingdom();assert.equal(h.render().kingdomJob,null);assert.equal(h.render().generationError,null);}

for(const mode of ['classic','mythic'])test(`E7 App transfer keeps full POI identity/history and real reload continuation ${mode}`,async()=>{
 const initial=await setup(mode),named=save(initial);named.map.editorNames={'poi:1:2,0':{en:'Authored E7',ru:'Авторское E7'}};
 if(mode==='classic'){named.map.knave=newKnaveLayer();named.map.knave.content=knaveContentFixture('poi:1:2,0',{kind:'settlement'});named.map.knave.difficultyByHex['2,0']='difficult';named.map.knave.discoveryByPoi['poi:1:2,0']={mode:'interaction',clueText:'Test E7 clue'};}
 const h=await setup(mode,withDetailIdentities(named));assert.equal(h.render().mutateTag({kind:'poi',regionId:1,hexKey:'2,0'},'mb.feature'),true);h.render();
 const before=save(h),history=stacks(h),oldName=before.map.toponyms.names['settlement:1:2,0'];assert.ok(oldName);
 const d=draft(h,'transfer_hex',{toRegionId:2});assert.deepEqual(save(h),before,'draft is not exported');
 assert.equal(h.render().finishRegionDraft(d),true);const after=save(h);
 assert.equal(h.render().undoHistory.length,history[0].length+1);assert.equal(h.render().redoHistory.length,0);
 assert.equal(after.map.physicalGrid.poiIdentities.byLegacyRef['poi:2:2,0'],before.map.physicalGrid.poiIdentities.byLegacyRef['poi:1:2,0']);assert.equal(after.map.physicalGrid.poiIdentities.nextId,before.map.physicalGrid.poiIdentities.nextId);
 assert.equal(after.map.regions[0].pointsOfInterest.length,0);assert.deepEqual(after.map.regions[1].pointsOfInterest,[{q:2,r:0}]);
 assert.deepEqual(after.map.toponyms.names['settlement:2:2,0'],oldName);assert.equal(after.map.toponyms.names['settlement:1:2,0'],undefined);
 const expectedTags=structuredClone(before.map.tags);for(const t of expectedTags.instances)if(t.owner.kind==='poi'&&t.owner.regionId===1&&t.owner.hexKey==='2,0')t.owner.regionId=2;
 expectedTags.rollCounters=Object.fromEntries(Object.entries(expectedTags.rollCounters).map(([k,v])=>[k.replace(/^poi:1:2,0\|/,'poi:2:2,0|'),v]));
 assert.deepEqual(after.map.tags,expectedTags);
 assert.deepEqual(after.map.editorNames,{'poi:2:2,0':before.map.editorNames['poi:1:2,0']});
 if(mode==='classic'){assert.deepEqual(after.map.knave.discoveryByPoi,{'poi:2:2,0':before.map.knave.discoveryByPoi['poi:1:2,0']});assert.deepEqual(after.map.knave.difficultyByHex,{'2,0':'difficult'});const nextOwner=Object.keys(after.map.knave.discoveryByPoi)[0];assert.deepEqual(after.map.knave.content.byPoi,{[nextOwner]:before.map.knave.content.byPoi['poi:1:2,0']});assert.deepEqual(after.map.knave.content.rollCounters,{[nextOwner]:before.map.knave.content.rollCounters['poi:1:2,0']});}
 for(const k of ['biomeOverrideByHexKey','terrainByHexKey','gmNotesByHexKey','roads','crossings','riverFeatures'])assert.deepEqual(after.map[k],before.map[k]);
 assert.deepEqual(after.map.candidateHexes,before.map.candidateHexes,'accepted frontier entries and order remain literal');
 assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.counters,before.counters);
 h.render().undoMap();assert.deepEqual(save(h),before);h.render().redoMap();assert.deepEqual(save(h),after);
 const g=await setup(mode,after);assert.deepEqual(save(g),after);continuation(h);continuation(g);assert.deepEqual(save(g),save(h));
});

test('E7 App height is one atomic explicit biome pair and retains local/underwater overrides',async()=>{
 const data=regionFixture();data.map.terrainByHexKey={'1,0':{terrainOverride:'lake',lakeId:9}};
 const h=await setup('classic',data),before=save(h),history=stacks(h);
 const d=draft(h,'region_height',{heightLevel:2,biomeId:'open_hills'});assert.equal(h.render().finishRegionDraft(d),true);
 const after=save(h);assert.equal(after.map.regions[0].heightLevel,2);assert.equal(after.map.regions[0].biomeId,'open_hills');
 for(const k of ['biomeOverrideByHexKey','terrainByHexKey','toponyms','tags','gmNotesByHexKey'])assert.deepEqual(after.map[k],before.map[k]);
 assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.counters,before.counters);assert.equal(h.render().undoHistory.length,history[0].length+1);
 h.render().undoMap();assert.deepEqual(save(h),before);h.render().redoMap();assert.deepEqual(save(h),after);
});

test('E7 real dependency preparation enforces ROAD07 category growth and preserves emergency-tract policy',async()=>{
 const h=await setup(),map=structuredClone(h.render().captureDocument().map),hex=(q,r=0)=>({q,r});
 const a=map.regions[0],b=map.regions[1];
 Object.assign(a,{hexes:[hex(-3),hex(-2),hex(-1)],centerHex:hex(-3),anchorHex:hex(-2),pointsOfInterest:[],pointOfInterestKinds:{},biomeLandType:'wild'});
 Object.assign(b,{hexes:Array.from({length:30},(_,i)=>hex(i%5,Math.floor(i/5))),centerHex:hex(0),anchorHex:hex(1),finalSize:30,sizeCategory:'region',sizeLabel:'Регион',biomeLandType:'settled'});
 const move={type:'transfer_hex',hexKey:'-1,0',fromRegionId:1,toRegionId:2};
 const road=id=>({id,regionId:2,segments:[{from:hex(0,id-1),to:hex(1,id-1),kind:'road'}]});
 map.roads=[road(1),road(2)];const before=structuredClone(map);
 assert.throws(()=>h.geometry.prepareRegionMapEdit(map,move),/road_minimum:2:2:3/);assert.deepEqual(map,before);
 map.roads.push(road(3));const next=h.geometry.prepareRegionMapEdit(map,move);assert.equal(next.regions[1].sizeCategory,'large_region');assert.deepEqual(next.roads,map.roads);
 a.hexes=Array.from({length:6},(_,i)=>hex(i-6));a.centerHex=hex(-6);a.anchorHex=hex(-5);Object.assign(a,{finalSize:6,sizeCategory:'locality',sizeLabel:'Местность',biomeLandType:'settled'});
 assert.throws(()=>h.geometry.prepareRegionMapEdit(map,move),/road_minimum:1:0:2/);
 map.roads.push({id:4,regionId:1,segments:[{from:hex(-6),to:hex(-5),kind:'road'}]},{id:5,regionId:1,segments:[{from:hex(-5),to:hex(-4),kind:'road'}]});map.nextRoadId=6;
 const ordinaryFive=h.geometry.prepareRegionMapEdit(map,move);assert.equal(ordinaryFive.regions[0].sizeCategory,'tract');assert.equal(ordinaryFive.regions[0].isTract,false);
 h.render().applyDocument({...h.render().captureDocument(),map:ordinaryFive});h.render();const accepted=save(h),history=stacks(h);
 assert.equal(h.render().editRoadDocument({type:'kind',roadId:4,segmentKey:['-6,0','-5,0'].sort().join('|'),kind:'trail'}),false,'E7 six-to-five must keep the ordinary road minimum for later E3 edits');
 assert.deepEqual(save(h),accepted);assert.deepEqual(stacks(h),history);
 a.isTract=true;assert.doesNotThrow(()=>h.geometry.prepareRegionMapEdit(map,move));
});

test('E7 real hex geometry validates directed owner height contacts and preserves dry F1 paths',async()=>{
 const h=await setup(),map=structuredClone(h.render().captureDocument().map),ctx=h.geometry.buildManualRiverGeometryContext(map);
 const edges=[...ctx.geometry.edgeOwners],one=edges.filter(([,o])=>o.length===1&&o[0]===1),two=edges.filter(([,o])=>o.length===1&&o[0]===2);
 let path;
 for(const [a] of one)for(const [b] of two){const aa=a.split('|'),bb=b.split('|'),joint=aa.find(v=>bb.includes(v));if(joint){path=[aa.find(v=>v!==joint),joint,bb.find(v=>v!==joint)].map(k=>ctx.vertex(k));break;}}
 assert.ok(path?.every(Boolean),'fixture must have an actual directed contact');
 const r={id:5,regionId:1,vertexPath:path,sectors:path.slice(1).map((v,i)=>({id:`e7-${i}`,riverId:5,sectorIndex:i+1,vertexPath:[path[i],v],edgeKeys:[[path[i].key,v.key].sort().join('|')],startVertexKey:path[i].key,endVertexKey:v.key,startReason:i?'region_boundary':'river_start',endReason:i===0?'region_boundary':'river_end',fullness:1,assignedRegionId:i+1}))};
 map.rivers=[r];map.nextRiverId=6;
 assert.throws(()=>h.geometry.prepareRegionMapEdit(map,{type:'region_height',regionId:2,heightLevel:2,biomeId:'open_hills'}),/region_river_uphill/);
 const next=h.geometry.prepareRegionMapEdit(map,{type:'region_height',regionId:1,heightLevel:2,biomeId:'open_hills'});
 assert.deepEqual(next.rivers[0].vertexPath,r.vertexPath);assert.deepEqual(next.rivers[0].sectors.map(s=>s.fullness),[1,1]);
 assert.deepEqual(next.riverFeatures,map.riverFeatures);assert.deepEqual(next.crossings,map.crossings);
 h.render().applyDocument({...h.render().captureDocument(),map});h.render();
 const oldMarks={rapids:new Set(h.render().rapidRiverEdgeKeys),waterfalls:new Set(h.render().riverWaterfalls.map(v=>v.vertexKey))};
 draft(h,'region_height',{heightLevel:2,biomeId:'open_hills'});const preview=serial(h.render().regionPreview.marks);
 assert.equal(h.render().finishRegionDraft(),true);
 const actual={rapids:new Set(h.render().rapidRiverEdgeKeys),waterfalls:new Set(h.render().riverWaterfalls.map(v=>v.vertexKey))};
 for(const kind of ['rapids','waterfalls'])assert.deepEqual(preview[kind],{added:[...actual[kind]].filter(k=>!oldMarks[kind].has(k)),removed:[...oldMarks[kind]].filter(k=>!actual[kind].has(k))});
 const blocked=await setup('classic',regionFixture('classic',{river:'directed'}));blocked.render().setSelectedHex({q:3,r:0});blocked.render();const accepted=save(blocked),history=stacks(blocked);
 draft(blocked,'region_height',{heightLevel:2,biomeId:'open_hills'});const message=blocked.render().regionPreview.error;
 for(const expected of [/Серебряная река/,/#5/,/1 → 2/,/Карта не изменена/,/Выберите другую высоту/])assert.match(message,expected);
 blocked.render().setLanguage('en');const english=blocked.render().regionPreview.error;
 for(const expected of [/Silver River/,/#5/,/1 → 2/,/Your map is unchanged/,/Choose another height/])assert.match(english,expected);
 assert.equal(blocked.render().finishRegionDraft(),false);assert.deepEqual(save(blocked),accepted);assert.deepEqual(stacks(blocked),history);
});

test('E7 no-op/cancel/stale callbacks and guarded actions retain accepted document and executable Redo',async()=>{
 const h=await setup();draft(h,'region_height',{heightLevel:2,biomeId:'open_hills'});h.render().finishRegionDraft();h.render().undoMap();h.render();
 const before=save(h),history=stacks(h),d=draft(h,'transfer_hex',{toRegionId:2}),old=h.render().finishRegionDraft,oldTarget=h.render().selectRegionTarget;
 for(const action of ['undoMap','redoMap','resetMap','fillMissingTags']){h.render()[action]();h.render();assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);}
 assert.equal(h.render().startWaterDraft('lake'),false);assert.equal(h.render().selectNameTarget('region:2'),false);
 assert.equal(h.render().resetRegionDraft(d),true);assert.equal(h.render().startRegionDraft('transfer_hex'),true);const fresh=h.render().regionDraft;
 assert.equal(oldTarget(2),false,'old map-target callback cannot alter a new draft at the same coordinate');assert.equal(h.render().regionDraft,fresh);h.render().resetRegionDraft(fresh);draft(h,'region_height',{heightLevel:3,biomeId:'mountains'});
 assert.equal(old(),false,'stale rendered Done cannot accept a replacement draft');assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 const active=h.render().regionDraft;active.revision--;assert.equal(h.render().finishRegionDraft(active),false);assert.equal(h.render().regionDraft,null);assert.match(h.render().editError,/Карта изменилась/);
 assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 draft(h,'region_height',{heightLevel:1,biomeId:'open_plains'});assert.equal(h.render().regionDraft,null,'return to original value closes no-op');assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 h.render().redoMap();assert.equal(save(h).map.regions[0].heightLevel,2,'preexisting Redo remains usable');
});

test('E7 v7 import retains only an exact unique frontier order; legacy/mismatch/duplicate/empty/sea retain prior normalization',async()=>{
 const h=await setup(),canonical=save(h),frontier=canonical.map.candidateHexes;assert.ok(frontier.length>3);
 const retained=structuredClone(canonical);retained.map.candidateHexes.reverse();
 const imported=await setup('classic',retained);assert.deepEqual(save(imported).map.candidateHexes,retained.map.candidateHexes);
 for(const mutation of [a=>{a[0]=structuredClone(a[1]);},a=>{a[0]={q:999,r:999};}]){
  const bad=structuredClone(retained);mutation(bad.map.candidateHexes);const g=await setup('classic',bad);assert.deepEqual(save(g).map.candidateHexes,frontier);
 }
 for(const version of [2,3,4,5,6]){const old=structuredClone(retained);old.version=version;if(version===2)delete old.map.candidateHexes;const g=await setup('classic',old);assert.deepEqual(save(g).map.candidateHexes,frontier);}
 const sea=structuredClone(retained),wet=frontier[0],key=`${wet.q},${wet.r}`;sea.map.terrainByHexKey[key]={terrainOverride:'sea'};sea.map.seas.push({id:sea.map.nextSeaId++,hexKeys:[key]});
 const g=await setup('classic',sea);assert.ok(!save(g).map.candidateHexes.some(h=>`${h.q},${h.r}`===key));
 const empty=regionFixture();empty.map.regions=[];empty.map.biomeOverrideByHexKey={};empty.map.gmNotesByHexKey={};empty.map.candidateHexes=[{q:0,r:0}];empty.map.terrainByHexKey={'9,9':{terrainOverride:'sea'}};
 const e=await setup('classic',empty);assert.deepEqual(save(e).map.candidateHexes,[]);
});

test('E7 late clone and v7 format faults keep both stacks, counters and selected UI unchanged',async()=>{
 for(const point of [1,2,3,4,5,6]){
  const h=await setup();draft(h,'region_height',{heightLevel:2,biomeId:'open_hills'});h.render().finishRegionDraft();h.render().undoMap();h.render();
  const before=save(h),history=stacks(h);draft(h,'transfer_hex',{toRegionId:2});
  let n=0;const restore=h.injectFunction('structuredClone',value=>{if(++n===point)throw Error('E7 temporary clone fault');return structuredClone(value);});
  assert.equal(h.render().finishRegionDraft(),false,`clone point ${point}`);restore();assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 }
 const h=await setup(),before=save(h),history=stacks(h);draft(h,'transfer_hex',{toRegionId:2});
 const restore=h.injectFunction('assertHexcrawlSaveData',()=>{throw Error('E7 temporary format fault');});assert.equal(h.render().finishRegionDraft(),false);restore();assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
});

for(const mode of ['classic','mythic'])test(`E8 real POI move is one exact transaction with full payload and literal hex notes ${mode}`,async()=>{
 const fixture=regionFixture(mode);fixture.map.regions[1].suppressCentralPoi=false;delete fixture.map.regions[1].centralPoiKind;if(mode==='mythic')fixture.map.regions[0].pointOfInterestKinds['2,0']='monument';
 const h=await setup(mode,fixture),named=save(h);named.map.editorNames={'poi:1:2,0':{en:'Kept authored',ru:'Сохранённое имя'}};if(mode==='classic'){named.map.knave=newKnaveLayer();named.map.knave.content=knaveContentFixture('poi:1:2,0',{kind:'settlement'});named.map.knave.difficultyByHex['2,0']='difficult';named.map.knave.discoveryByPoi['poi:1:2,0']={mode:'interaction',clueText:'Test E8 clue'};}const g=await setup(mode,withDetailIdentities(named));
 assert.equal(g.render().mutateTag({kind:'poi',regionId:1,hexKey:'2,0'},'mb.feature'),true);
 g.render().setEditMode(true);assert.equal(g.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'}),true);
 const before=save(g),history=stacks(g);assert.equal(g.render().changePoiTarget('3','0'),true);assert.deepEqual(save(g),before,'preview excluded from export');
 const draft=g.render().poiDraft;assert.ok(g.render().poiPreview.plan);assert.equal(g.render().finishPoiDraft(draft),true);const after=save(g);
 assert.equal(g.render().undoHistory.length,history[0].length+1);assert.deepEqual(after.map.regions[1].pointsOfInterest,[{q:3,r:0}]);assert.deepEqual(after.map.editorNames,{'poi:2:3,0':named.map.editorNames['poi:1:2,0']});assert.equal(after.map.physicalGrid.poiIdentities.byLegacyRef['poi:2:3,0'],before.map.physicalGrid.poiIdentities.byLegacyRef['poi:1:2,0']);assert.equal(after.map.physicalGrid.poiIdentities.nextId,before.map.physicalGrid.poiIdentities.nextId);
 const expectedTags=structuredClone(before.map.tags);for(const t of expectedTags.instances)if(t.owner.kind==='poi'&&t.owner.regionId===1&&t.owner.hexKey==='2,0')t.owner={kind:'poi',regionId:2,hexKey:'3,0'};expectedTags.rollCounters=Object.fromEntries(Object.entries(expectedTags.rollCounters).map(([k,v])=>[k.replace(/^poi:1:2,0\|/,'poi:2:3,0|'),v]));assert.deepEqual(after.map.tags,expectedTags);
 if(mode==='classic'){assert.deepEqual(after.map.knave.discoveryByPoi,{'poi:2:3,0':before.map.knave.discoveryByPoi['poi:1:2,0']});assert.deepEqual(after.map.knave.difficultyByHex,{'2,0':'difficult'});const nextOwner=Object.keys(after.map.knave.discoveryByPoi)[0];assert.deepEqual(after.map.knave.content.byPoi,{[nextOwner]:before.map.knave.content.byPoi['poi:1:2,0']});assert.deepEqual(after.map.knave.content.rollCounters,{[nextOwner]:before.map.knave.content.rollCounters['poi:1:2,0']});}
 assert.deepEqual(after.map.gmNotesByHexKey,before.map.gmNotesByHexKey);assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.counters,before.counters);assert.deepEqual(after.ui.selectedHex,{q:3,r:0});
 assert.equal(g.render().finishPoiDraft(draft),false,'captured doubleDone cannot create another operation');g.render().undoMap();assert.deepEqual(save(g),before);g.render().redoMap();assert.deepEqual(save(g),after);
 const reloaded=await setup(mode,after);assert.deepEqual(save(reloaded),after);
 // PR490-F01: an accepted empty geometric center is still an ordinary POI.
 reloaded.render().setEditMode(true);reloaded.render().setSelectedCentralPoiKind('ruins');assert.deepEqual(save(reloaded),after,'ordinary point must not manufacture a central object');
 reloaded.render().setSelectedPoiKind('ruins');const typed=save(reloaded);assert.equal(typed.map.regions[1].pointOfInterestKinds['3,0'],'ruins');assert.equal(typed.map.regions[1].centralPoiKind,undefined);assert.deepEqual(typed.map.editorNames,after.map.editorNames);for(const tag of after.map.tags.instances)assert.ok(typed.map.tags.instances.some(next=>JSON.stringify(next)===JSON.stringify(tag)),'existing point tags keep their identity');
 reloaded.render().undoMap();assert.deepEqual(save(reloaded),after);reloaded.render().redoMap();assert.deepEqual(save(reloaded),typed);
 const continued=await setup(mode,typed);continued.render().setEditMode(true);continued.render().deleteSelectedPoi();assert.deepEqual(save(continued),typed,'authored name is not silently deleted');continued.render().showNameTarget('poi:2:3,0');continued.render().changeNameDraft('',continued.render().nameDraft);continued.render().changeOtherNameDraft('',continued.render().nameDraft);assert.equal(continued.render().saveNameDraft(),true);const cleared=save(continued);continued.render().deleteSelectedPoi();const deleted=save(continued);assert.deepEqual(deleted.map.regions[1].pointsOfInterest,[]);assert.equal(deleted.map.regions[1].centralPoiKind,undefined);assert.equal(deleted.map.editorNames['poi:2:3,0'],undefined);
 continued.render().undoMap();assert.deepEqual(save(continued),cleared);continued.render().redoMap();assert.deepEqual(save(continued),deleted);continued.render().applyDocument(reloaded.render().captureDocument());continued.render().setEditMode(true);
 assert.equal(continued.render().startPoiDraft({kind:'land',regionId:2,hexKey:'3,0'}),true);continued.render().changePoiTarget('2','0');assert.equal(continued.render().finishPoiDraft(),true);const returned=save(continued);assert.deepEqual(returned.map.regions[0].pointsOfInterest,[{q:2,r:0}]);assert.equal(returned.map.regions[0].pointOfInterestKinds['2,0'],'ruins');assert.deepEqual(returned.map.editorNames,{'poi:1:2,0':named.map.editorNames['poi:1:2,0']});
 const loadedReturn=await setup(mode,returned);continuation(continued);continuation(loadedReturn);assert.deepEqual(save(loadedReturn),save(continued));

 const untyped=regionFixture(mode);delete untyped.map.regions[0].pointOfInterestKinds;const u=await setup(mode,untyped);u.render().setEditMode(true);const ub=save(u);assert.equal(u.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'}),true);u.render().changePoiTarget('3','0');assert.equal(u.render().finishPoiDraft(),true);const ua=save(u);assert.ok(ua.map.regions.every(r=>!Object.hasOwn(r.pointOfInterestKinds??{},'3,0')));assert.deepEqual(ua.map.regions[1].pointsOfInterest,[{q:3,r:0}]);assert.deepEqual(ua.generation,ub.generation);u.render().undoMap();assert.deepEqual(save(u),ub);u.render().redoMap();assert.deepEqual(save(u),ua);
});
test('E8 real move cancels/no-ops without consuming Redo and captured handlers cannot act on a new document',async()=>{
 const h=await setup();h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();const before=save(h),history=stacks(h);
 h.render().setEditMode(true);assert.equal(h.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'}),true);const old=h.render().poiDraft;
 h.render().changePoiTarget('2','0');assert.equal(h.render().finishPoiDraft(),true);assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 assert.equal(h.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'}),true);const newer=h.render().poiDraft;assert.equal(h.render().changePoiTarget('3','0',old),false);assert.equal(h.render().poiDraft,newer);
 h.render().changePoiTarget('3','0');const captured=h.render().poiDraft;h.render().applyDocument(h.render().captureDocument());h.render();assert.equal(h.render().finishPoiDraft(captured),false);assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
});
test('E8 actual path refusal and snapshot fault leave document and both histories exact',async()=>{
 const h=await setup();h.render().setEditMode(true);h.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'});h.render().changePoiTarget('3','0');
 const before=save(h),history=stacks(h),draft=h.render().poiDraft;
 const restore=h.injectFunction('structuredClone',value=>{if(value?.regions&&value?.toponyms)throw Error('injected POI preparation');return structuredClone(value);});assert.equal(h.render().finishPoiDraft(draft),false);restore();assert.deepEqual(save(h),before);assert.deepEqual(stacks(h),history);
 h.render().resetPoiDraft();const doc=h.render().captureDocument();doc.map.roads=[{id:88,regionId:1,segments:[{from:{q:1,r:0},to:{q:2,r:0},kind:'trail'}]}];doc.map.nextRoadId=89;h.render().applyDocument(doc);h.render().setEditMode(true);
 h.render().startPoiDraft({kind:'land',regionId:1,hexKey:'2,0'});h.render().changePoiTarget('3','0');assert.equal(h.render().poiPreview.code,'poi_path_dependency');assert.equal(h.render().finishPoiDraft(),false);
});
