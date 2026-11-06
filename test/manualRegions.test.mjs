import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRegionGeometry,prepareRegionPoiIdentity} from '../src/manualRegions.ts';
import {emptyTags,rollTag,editTag,validateTags} from '../src/tags/engine.ts';

const h=(q,r=0)=>({q,r});
const region=(id,hexes)=>({id,hexes,centerHex:hexes[0],anchorHex:hexes[1]??hexes[0],heightLevel:1,biomeId:'plain',finalSize:hexes.length,targetSize:18,isTract:false,suppressCentralPoi:true,pointsOfInterest:[],biomeLandType:'wild'});
const fixture=()=>({regions:[region(1,[h(0),h(1),h(2)]),region(2,[h(3),h(3,1)])],hexTerrainByKey:new Map([['2,0',{terrainOverride:'lake',lakeId:9}]])});
const policy={biome:id=>({plain:{heightLevel:1,biomeLabel:'Равнина'},hills:{heightLevel:2,biomeLabel:'Холмы'},mountains:{heightLevel:3,biomeLabel:'Горы'}}[id]),compatible:()=>true,size:n=>({sizeCategory:n<=5?'tract':'locality',sizeLabel:n<=5?'Урочище':'Местность'}),inKingdomArea:()=>true};
const move={type:'transfer_hex',hexKey:'2,0',fromRegionId:1,toRegionId:2};
const height={type:'region_height',regionId:1,heightLevel:2,biomeId:'hills'};

test('E7 height prepares one compatible base projection without rewriting administrative/authored data',()=>{
  const d=fixture(),before=structuredClone(d),r=prepareRegionGeometry(d,height,policy);
  assert.deepEqual(d,before);assert.equal(r.regions[0].heightLevel,2);assert.equal(r.regions[0].biomeLabel,'Холмы');
  for(const field of ['id','hexes','centerHex','anchorHex','targetSize','finalSize','pointsOfInterest','isTract','suppressCentralPoi','biomeLandType'])assert.deepEqual(r.regions[0][field],d.regions[0][field]);
  assert.equal(r.regions[1],d.regions[1]);assert.deepEqual(r.changedRegionIds,[1]);
  for(const level of [0,4,1.5,'2',NaN])assert.throws(()=>prepareRegionGeometry(d,{...height,heightLevel:level},policy),/height_level/);
  for(const biomeId of ['plain','unknown'])assert.throws(()=>prepareRegionGeometry(d,{...height,biomeId},policy),/height_biome/);
});
test('E7 original height/biome pair is an exact no-op even when a legacy pair is incompatible',()=>{
  const d=fixture();d.regions[0].biomeId='legacy';
  const r=prepareRegionGeometry(d,{...height,heightLevel:1,biomeId:'legacy'},policy);
  assert.equal(r.regions,d.regions);assert.deepEqual(r.changedRegionIds,[]);
  assert.throws(()=>prepareRegionGeometry(d,height,{...policy,compatible:(a,b)=>a!=='plain'}),/biome_compatibility/);
});
test('E7 transfer preserves union, owned water, order, flags and a noncentral POI',()=>{
  const d=fixture();d.regions[0].pointsOfInterest=[h(2)];d.regions[0].pointOfInterestKinds={'2,0':'ruin'};
  const before=structuredClone(d),r=prepareRegionGeometry(d,move,policy),[a,b]=r.regions;
  assert.deepEqual(d,before);assert.deepEqual(a.hexes,[h(0),h(1)]);assert.deepEqual(b.hexes,[h(3),h(3,1),h(2)]);
  assert.deepEqual(a.pointsOfInterest,[]);assert.deepEqual(b.pointsOfInterest,[h(2)]);assert.equal(b.pointOfInterestKinds['2,0'],'ruin');
  assert.equal(a.finalSize,2);assert.equal(b.finalSize,3);assert.equal(b.sizeCategory,'tract');
  for(const r of [a,b]){assert.equal(r.targetSize,18);assert.equal(r.isTract,false);assert.equal(r.suppressCentralPoi,true);}
  assert.deepEqual(r.poiTransfer,{hexKey:'2,0',fromRegionId:1,toRegionId:2});
  assert.deepEqual(d.hexTerrainByKey,before.hexTerrainByKey);
  assert.equal(prepareRegionGeometry(d,{...move,toRegionId:1},policy).regions,d.regions);
});
test('E7 transfer refuses invalid ownership, nonadjacency, bridge cuts and protected cells',()=>{
  const d=fixture();
  for(const hexKey of ['0,0','1,0'])assert.throws(()=>prepareRegionGeometry(d,{...move,hexKey},policy),/protected_(center|anchor)/);
  for(const hexKey of ['2,00','20,0'])assert.throws(()=>prepareRegionGeometry(d,{...move,hexKey},policy),/coordinate|hex_owner/);
  assert.throws(()=>prepareRegionGeometry(d,{...move,toRegionId:99},policy),/unknown_region/);
  const cut=fixture();cut.regions[0].hexes.push(h(3,-1));assert.throws(()=>prepareRegionGeometry(cut,move,policy),/disconnected_region/);
  const far=fixture();far.regions[1]=region(2,[h(3,1),h(4,1)]);assert.throws(()=>prepareRegionGeometry(far,move,policy),/target_not_adjacent/);
  const duplicate=fixture();duplicate.regions[1].hexes.push(h(2));assert.throws(()=>prepareRegionGeometry(duplicate,move,policy),/ambiguous_hex_owner/);
});
test('E7 keeps kingdom membership and refuses removal of the final owned in-area cell',()=>{
  const d=fixture();d.regions[0].kingdomId=1;
  assert.throws(()=>prepareRegionGeometry(d,move,policy),/kingdom_membership_change/);
  d.regions[1].kingdomId=1;assert.equal(prepareRegionGeometry(d,move,policy).regions[0].kingdomId,1);
  assert.throws(()=>prepareRegionGeometry(d,move,{...policy,inKingdomArea:(_,hex)=>hex.q>=2}),/outside_kingdom_area/);
});
test('E7 identifies a new incompatible physical side even between an already incompatible pair',()=>{
  const d=fixture();d.regions[1].biomeId='hills';
  assert.throws(()=>prepareRegionGeometry(d,move,{...policy,compatible:(a,b)=>a===b}),/biome_compatibility/);
  d.regions.push({...region(3,[h(20),h(21)]),biomeId:'legacyA'},{...region(4,[h(22),h(23)]),biomeId:'legacyB'});
  assert.equal(prepareRegionGeometry(d,move,{...policy,compatible:(a,b)=>!a.startsWith('legacy')||a===b}).regions.length,4);
});
const def={id:'kept',version:1,label:{ru:'Тег'},resolver:'independent',slots:[{id:'die',sides:2}],tables:[[{ru:'Один'},{ru:'Два'}]]};
test('E7 reparents full bilingual names, tag results and counter prefixes without reroll',()=>{
  const from={kind:'poi',regionId:1,hexKey:'2,0'},to={...from,regionId:2};
  const tags=editTag(rollTag(emptyTags(),from,def,123),from,def.id,0,'ru','Авторский текст');
  tags.rollCounters['poi:1:2,0|kept|retained']=19;
  const names={'settlement:1:2,0':{en:'Old name',ru:'Старое имя',kind:'settlement',model:'germanic',revision:7},'region:1':{en:'A',ru:'А',kind:'region',model:'germanic',revision:2}};
  const before=structuredClone({names,tags}),r=prepareRegionPoiIdentity(names,tags,move);
  assert.deepEqual({names,tags},before);assert.deepEqual(r.toponyms['settlement:2:2,0'],names['settlement:1:2,0']);assert.ok(!Object.hasOwn(r.toponyms,'settlement:1:2,0'));
  assert.deepEqual(r.tags.instances[0],{...tags.instances[0],owner:to});assert.equal(r.tags.rollCounters['poi:2:2,0|kept|retained'],19);
  validateTags(r.tags,new Set(['poi:2:2,0']),{kept:def});
  const next=rollTag(r.tags,to,def,123);assert.equal(next.rollCounters['poi:2:2,0|kept|die'],tags.rollCounters['poi:1:2,0|kept|die']+1);
});
test('E7 identity migration rejects destination collisions before changing either record',()=>{
  const tags=emptyTags(),names={'settlement:2:2,0':{en:'Retained',ru:'Сохранено',kind:'settlement',model:'germanic',revision:0}};
  const before=structuredClone(names);assert.throws(()=>prepareRegionPoiIdentity(names,tags,move),/identity_conflict/);assert.deepEqual(names,before);
  const counterCollision={...tags,rollCounters:{'poi:2:2,0|retained|slot':8}};
  assert.throws(()=>prepareRegionPoiIdentity({},counterCollision,move),/identity_conflict/);
});

// E8 AC01-05: coordinate relocation is a distinct command from E7 owner-only
// migration; reuse the fixture/tag/name helpers above instead of a new runner.
const {preparePoiMove,poiNameLocators,assertPoiEditorNames,renamePoiEditorName}=await import('../src/manualPois.ts');
const poiPolicy={mode:'classic',landKinds:()=>['village','ruins','myth'],waterKinds:context=>context==='sea'?['shipwreck','rocks']:['rocks'],inKingdomArea:()=>true};
const poiDocument=()=>{
  const d=fixture();d.hexTerrainByKey=new Map();
  d.regions[0].pointsOfInterest=[h(2)];d.regions[0].pointOfInterestKinds={'2,0':'village'};
  const owner={kind:'poi',regionId:1,hexKey:'2,0'},tags=editTag(rollTag(emptyTags(),owner,def,123),owner,def.id,0,'ru','Полный авторский текст');
  tags.rollCounters['poi:1:2,0|kept|retained']=19;
  return {...d,waterPoiByKey:new Map(),roads:[],tags,
    toponyms:{'settlement:1:2,0':{en:'Eikby',ru:'Эйкбю',kind:'settlement',model:'germanic',revision:7}},
    editorNames:{'poi:1:2,0':{en:'Authored',ru:'Авторское'}},
    gmNotesByHexKey:{'2,0':'Source note','3,0':'Target note'},biomeOverrideByHexKey:new Map([['2,0','mountains']]),nextRoadId:18};
};
const poiMove={source:{kind:'land',regionId:1,hexKey:'2,0'},targetKey:'3,0'};
test('E8 coordinate relocation migrates complete bilingual names,tag payload/counters and keeps hex layers',()=>{
  const d=poiDocument(),before=structuredClone(d),r=preparePoiMove(d,poiMove,poiPolicy);
  assert.deepEqual(d,before);assert.deepEqual(r.regions[0].pointsOfInterest,[]);assert.deepEqual(r.regions[1].pointsOfInterest,[h(3)]);
  assert.deepEqual(r.toponyms['settlement:2:3,0'],d.toponyms['settlement:1:2,0']);assert.ok(!Object.hasOwn(r.toponyms,'settlement:1:2,0'));
  assert.deepEqual(r.editorNames['poi:2:3,0'],d.editorNames['poi:1:2,0']);assert.ok(!Object.hasOwn(r.editorNames,'poi:1:2,0'));
  assert.deepEqual(r.tags.instances[0],{...d.tags.instances[0],owner:{kind:'poi',regionId:2,hexKey:'3,0'}});
  assert.equal(r.tags.rollCounters['poi:2:3,0|kept|retained'],19);assert.ok(!Object.hasOwn(r.tags.rollCounters,'poi:1:2,0|kept|retained'));
  for(const field of ['gmNotesByHexKey','hexTerrainByKey','biomeOverrideByHexKey','roads','nextRoadId'])assert.equal(r[field],d[field]);
  const within=preparePoiMove(d,{...poiMove,targetKey:'1,0'},poiPolicy);
  assert.deepEqual(within.regions[0].pointsOfInterest,[h(1)]);assert.equal(within.regions[1],d.regions[1]);
  assert.equal(within.regions[0].pointOfInterestKinds['1,0'],'village');assert.ok(!Object.hasOwn(within.regions[0].pointOfInterestKinds,'2,0'));
  const untyped=poiDocument();delete untyped.regions[0].pointOfInterestKinds;const original=structuredClone(untyped);for(const targetKey of ['1,0','3,0']){const moved=preparePoiMove(untyped,{...poiMove,targetKey},poiPolicy);assert.deepEqual(untyped,original);assert.ok(moved.regions.every(r=>!Object.hasOwn(r.pointOfInterestKinds??{},targetKey)));assert.equal(moved.editorNames[targetKey==='1,0'?'poi:1:1,0':'poi:2:3,0'].ru,untyped.editorNames['poi:1:2,0'].ru);}
});
test('E8 no-op does not reinterpret a legacy type or consume a counter; centers remain protected',()=>{
  const d=poiDocument();d.regions[0].pointOfInterestKinds['2,0']='legacy';
  assert.equal(preparePoiMove(d,{...poiMove,targetKey:'2,0'},poiPolicy),d);
  assert.throws(()=>preparePoiMove(d,poiMove,poiPolicy),/poi_kind_mismatch/);
  d.regions[0].centralPoiKind='village';d.regions[0].suppressCentralPoi=false;
  assert.throws(()=>preparePoiMove(d,{source:{kind:'land',regionId:1,hexKey:'0,0'},targetKey:'3,0'},poiPolicy),/central_poi/);
});
test('E8 rejects all hidden target identity records before altering any payload',()=>{
  const mutations=[d=>d.toponyms['settlement:2:3,0']=structuredClone(d.toponyms['settlement:1:2,0']),d=>d.editorNames['poi:2:3,0']={en:'Hidden',ru:'Скрыто'},d=>d.tags.rollCounters['poi:2:3,0|hidden|slot']=1,d=>d.tags.instances.push({...structuredClone(d.tags.instances[0]),owner:{kind:'poi',regionId:2,hexKey:'3,0'}}),d=>d.regions[1].pointOfInterestKinds={'3,0':'ruins'}];
  for(const mutate of mutations){const d=poiDocument();mutate(d);const before=structuredClone(d);assert.throws(()=>preparePoiMove(d,poiMove,poiPolicy),/poi_identity_conflict/);assert.deepEqual(d,before);}
});
test('E8 detects real road and trail source geometry,without rewriting destination paths',()=>{
  const d=poiDocument();d.roads=[{id:71,segments:[{from:h(1),to:h(2),kind:'trail'}]}];
  const before=structuredClone(d);assert.throws(()=>preparePoiMove(d,poiMove,poiPolicy),/poi_path_dependency:71/);assert.deepEqual(d,before);
  d.roads=[{id:72,segments:[{from:h(3),to:h(3,1),kind:'road'}]}];assert.equal(preparePoiMove(d,poiMove,poiPolicy).roads,d.roads);
});
test('E8 rejects occupied,mismatched,missing and ambiguous coordinates without fallback selection',()=>{
  for(const mutate of [d=>d.waterPoiByKey.set('3,0','rocks'),d=>d.regions[1].pointsOfInterest=[h(3)]]){const d=poiDocument();mutate(d);assert.throws(()=>preparePoiMove(d,poiMove,poiPolicy),/occupied_poi_target/);}
  const d=poiDocument();d.hexTerrainByKey.set('3,0',{terrainOverride:'lake',lakeId:1});assert.throws(()=>preparePoiMove(d,poiMove,poiPolicy),/poi_environment_mismatch/);
  assert.throws(()=>preparePoiMove(poiDocument(),{...poiMove,targetKey:'90,0'},poiPolicy),/unknown_poi_target/);
  assert.throws(()=>preparePoiMove(poiDocument(),{...poiMove,targetKey:'3,00'},poiPolicy),/coordinate/);
  d.regions[1].hexes.push(h(2));assert.throws(()=>preparePoiMove(d,poiMove,poiPolicy),/ambiguous_hex_owner/);
});
test('E8 water movement preserves the waterbody and applies exact sea/lake pools',()=>{
  const d=poiDocument();d.hexTerrainByKey=new Map([['4,0',{terrainOverride:'sea'}],['3,0',{terrainOverride:'lake',lakeId:9}]]);
  d.waterPoiByKey.set('4,0','rocks');d.editorNames['waterPoi:4,0']={en:'Black rocks',ru:'Чёрные скалы'};
  const move={source:{kind:'water',hexKey:'4,0'},targetKey:'3,0'},r=preparePoiMove(d,move,poiPolicy);
  assert.equal(r.waterPoiByKey.get('3,0'),'rocks');assert.ok(!r.waterPoiByKey.has('4,0'));assert.equal(r.editorNames['waterPoi:3,0'],d.editorNames['waterPoi:4,0']);
  assert.equal(r.hexTerrainByKey,d.hexTerrainByKey);assert.equal(r.toponyms,d.toponyms);assert.equal(r.tags,d.tags);
  d.waterPoiByKey.set('4,0','shipwreck');assert.throws(()=>preparePoiMove(d,move,poiPolicy),/poi_kind_mismatch/);
  assert.throws(()=>preparePoiMove(d,move,{...poiPolicy,mode:'mythic'}),/water_poi_in_mythic/);
});
test('E8 Mythic relocation retains kingdom semantics and refuses a second myth',()=>{
  const d=poiDocument();for(const r of d.regions){r.kingdomId=1;r.biomeLandType='wild';}d.regions[0].pointOfInterestKinds['2,0']='myth';
  const p={...poiPolicy,mode:'mythic'};assert.equal(preparePoiMove(d,poiMove,p).regions[1].pointOfInterestKinds['3,0'],'myth');
  assert.throws(()=>preparePoiMove(d,poiMove,{...p,inKingdomArea:()=>false}),/poi_myth_area/);
  d.regions[1].pointsOfInterest=[h(3,1)];d.regions[1].pointOfInterestKinds={'3,1':'myth'};assert.throws(()=>preparePoiMove(d,poiMove,p),/poi_myth_duplicate/);
  d.regions[1].pointsOfInterest=[];d.regions[1].kingdomId=2;assert.throws(()=>preparePoiMove(d,poiMove,p),/poi_kingdom_mismatch/);
});
test('E8 sparse POI names cover nonsettlements/water and preserve fallback isolation',()=>{
  const d=poiDocument();d.regions[0].pointOfInterestKinds['2,0']='ruins';d.waterPoiByKey.set('3,1','rocks');const live=poiNameLocators(d);
  assert.ok(live.has('poi:1:2,0'));assert.ok(live.has('waterPoi:3,1'));assertPoiEditorNames(d.editorNames,live);
  assert.throws(()=>assertPoiEditorNames({'poi:1:90,0':{en:'X',ru:'Х'}},live),/invalid_editor_name/);
  const key='poi:1:2,0',named=renamePoiEditorName(d.editorNames,key,{en:'  Ruin  ',ru:'  Руины  '},live,[]);assert.deepEqual(named[key],{en:'Ruin',ru:'Руины'});
  assert.throws(()=>renamePoiEditorName(named,key,{en:'Ruin',ru:''},live,[]),/invalid_poi_name/);
  assert.throws(()=>renamePoiEditorName(named,key,{en:'Other',ru:'Другое'},live,[{en:'OTHER',ru:'Чужое'}]),/duplicate_poi_name/);
  const ambiguous=poiDocument();ambiguous.regions[0].centralPoiKind='lair';ambiguous.regions[0].suppressCentralPoi=false;ambiguous.regions[0].pointsOfInterest.push(h(0));const ambiguousLive=poiNameLocators(ambiguous);assert.equal(ambiguousLive.has('poi:1:0,0'),false);assert.throws(()=>assertPoiEditorNames({'poi:1:0,0':{en:'Ambiguous',ru:'Неоднозначное'}},ambiguousLive),/invalid_editor_name/);
  const cleared=renamePoiEditorName(named,key,{en:' ',ru:''},live,[]);assert.ok(!Object.hasOwn(cleared,key));assert.equal(d.toponyms['settlement:1:2,0'].ru,'Эйкбю');
});
