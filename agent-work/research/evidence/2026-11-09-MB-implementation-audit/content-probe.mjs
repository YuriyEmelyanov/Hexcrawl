import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const productRoot = process.env.MB_PRODUCT_ROOT || process.cwd();
const {mythicDefinitions:defs,fillMythicTags,tagOwners} = await import(pathToFileURL(path.join(productRoot,'src/tags/mythic.ts')).href);
const {emptyTags,findTag,validateTags} = await import(pathToFileURL(path.join(productRoot,'src/tags/engine.ts')).href);
const myth={kind:'poi',regionId:1,hexKey:'0,0'},ruin={kind:'poi',regionId:1,hexKey:'1,0'},sanctum={kind:'poi',regionId:1,hexKey:'2,0'};
const map={regions:[{id:1,kingdomId:1,generationMode:'mythic',centerHex:{q:0,r:0},centralPoiKind:'myth',hexes:[{q:0,r:0},{q:1,r:0},{q:2,r:0}],pointsOfInterest:[{q:1,r:0},{q:2,r:0}],pointOfInterestKinds:{'1,0':'ruins','2,0':'sanctuary'}}],rivers:[],hexTerrainByKey:new Map()};
let collision=null;const knownSeers={};
for(let seed=0;seed<10000;seed++){
 const state=fillMythicTags(emptyTags(),map,seed),m=findTag(state,myth,'mb.myth'),r=findTag(state,ruin,'mb.ruin'),s=findTag(state,sanctum,'mb.seer');
 if(!collision&&JSON.stringify(m.values)===JSON.stringify(r.values)){
  validateTags(state,new Set(tagOwners(map).keys()),defs);
  collision={seed,myth:{owner:myth,values:m.values,entryIds:m.entryIds,texts:m.texts},ruin:{owner:ruin,values:r.values,entryIds:r.entryIds,texts:r.texts},validation:'accepted',runtimeRuinKeys:Object.keys(r),note:'The Ruin description uses the same catalogue-row pair as the current map Myth. Its persisted entryId is mb.ruin, with no mechanical mb.myth link or active-set eligibility state.'};
 }
 const pair=s.values.flat().join('/');
 if(['1/1','1/2'].includes(pair)&&!knownSeers[pair])knownSeers[pair]={seed,owner:sanctum,definitionId:s.definitionId,values:s.values,entryIds:s.entryIds,texts:s.texts,keys:Object.keys(s),sanctumDescriptionValues:findTag(state,sanctum,'mb.sanctum').values};
 if(collision&&knownSeers['1/1']&&knownSeers['1/2'])break;
}
assert.ok(collision);assert.equal(knownSeers['1/1'].texts[0].en,'The Rotted Seer');assert.equal(knownSeers['1/2'].texts[0].en,'The Swollen Seer');
const result={productSha:'a246fdf292963fd534a8203f569b9ca48b6292c7',method:'Unmodified production fillMythicTags and validateTags over a minimal same-realm map with Myth, Ruins and Sanctuary POIs; seed search0..9999 stops once known cases found.',collision,knownSeers};
console.log(JSON.stringify(result,null,2));
