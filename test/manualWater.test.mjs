import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareWaterGeometry,connectedWaterBody,waterComponents} from '../src/manualWater.ts';
const key=h=>`${h.q},${h.r}`;
const cells=()=>Array.from({length:7},(_,i)=>Array.from({length:5},(_,j)=>({q:i-3,r:j-2}))).flat();
const region=(id=1,hexes=cells())=>({id,hexes,centerHex:hexes[0],anchorHex:hexes[1],finalSize:hexes.length,biomeId:'open_plains',heightLevel:1});
const doc=(entries=[])=>({regions:[region()],hexTerrainByKey:new Map(entries),nextLakeId:20});
const lake=(id)=>({terrainOverride:'lake',lakeId:id});
const sea={terrainOverride:'sea'};
test('E6 creates only registered cells, preserves inputs and no-op identity',()=>{
 const d=doc(),before=structuredClone(d),p=prepareWaterGeometry(d,{target:'lake',hexKeys:['0,0','0,0']});
 assert.deepEqual(d,before);assert.equal(p.hexTerrainByKey.get('0,0').lakeId,20);assert.equal(p.nextLakeId,21);
 assert.equal(p.regions[0].hexes,d.regions[0].hexes);assert.equal(p.regions[0].biomeId,d.regions[0].biomeId);
 assert.equal(prepareWaterGeometry(d,{target:'land',hexKeys:['0,0']}).hexTerrainByKey,d.hexTerrainByKey);
 assert.throws(()=>prepareWaterGeometry(d,{target:'lake',hexKeys:['50,50']}),/unregistered/);
 assert.throws(()=>prepareWaterGeometry(d,{target:'lake',hexKeys:['0,00']}),/coordinate/);
 for(const h of[d.regions[0].centerHex,d.regions[0].anchorHex])assert.throws(()=>prepareWaterGeometry(d,{target:'lake',hexKeys:[key(h)]}),/protected_region_hex/);
});
test('E6 expand/shrink keeps identity; split has an explicit primary and never reuses retired IDs',()=>{
 const d=doc([['-1,0',lake(3)],['0,0',lake(3)],['1,0',lake(3)]]),expanded=prepareWaterGeometry(d,{target:'lake',hexKeys:['2,0']});
 assert.equal(expanded.hexTerrainByKey.get('2,0').lakeId,3);assert.equal(expanded.nextLakeId,20);
 const split=prepareWaterGeometry(d,{target:'land',hexKeys:['0,0']});
 assert.equal(split.hexTerrainByKey.get('-1,0').lakeId,3);assert.equal(split.hexTerrainByKey.get('1,0').lakeId,20);assert.equal(split.choices.find(c=>c.type==='split').value,'-1,0');
 const other=prepareWaterGeometry(d,{target:'land',hexKeys:['0,0'],splitKeep:{3:'1,0'}});
 assert.equal(other.hexTerrainByKey.get('1,0').lakeId,3);assert.equal(other.hexTerrainByKey.get('-1,0').lakeId,20);
 const removed=prepareWaterGeometry(d,{target:'land',hexKeys:['-1,0','0,0','1,0']});assert.deepEqual(removed.removedLakeIds,[3]);assert.equal(removed.nextLakeId,20);
 assert.equal(prepareWaterGeometry(removed,{target:'lake',hexKeys:['0,0']}).hexTerrainByKey.get('0,0').lakeId,20);
});
test('E6 merge requires selection of retained old lake; vertex contact does not join bodies',()=>{
 const d=doc([['-1,0',lake(3)],['1,0',lake(8)]]),p=prepareWaterGeometry(d,{target:'lake',hexKeys:['0,0']});
 assert.equal(p.unresolved.find(c=>c.type==='merge').key,'-1,0');
 const selected=prepareWaterGeometry(d,{target:'lake',hexKeys:['0,0'],mergeKeep:{'-1,0':8}});
 assert.equal(selected.unresolved.length,0);assert.deepEqual(selected.removedLakeIds,[3]);assert.ok(['-1,0','0,0','1,0'].every(k=>selected.hexTerrainByKey.get(k).lakeId===8));
 assert.deepEqual(waterComponents(['0,0','1,1']),[['0,0'],['1,1']]);
});
test('E6 external sea reclamation requires one explicitly adjacent existing region',()=>{
 const d={regions:[region(1,[{q:0,r:0},{q:0,r:1}]),region(2,[{q:2,r:0},{q:2,r:1}])],hexTerrainByKey:new Map([['1,0',sea],['1,1',sea]]),nextLakeId:1};
 const p=prepareWaterGeometry(d,{target:'land',hexKeys:['1,0','1,1']});assert.deepEqual(p.unresolved[0].allowed,[1,2]);
 const chosen=prepareWaterGeometry(d,{target:'land',hexKeys:['1,0','1,1'],regionAssignments:{'1,0':2}});
 assert.equal(chosen.regions[0].hexes,d.regions[0].hexes);assert.equal(chosen.regions[0].isCoastal,false);assert.deepEqual(chosen.regions[1].hexes.slice(-2),[{q:1,r:0},{q:1,r:1}]);assert.equal(chosen.regions[1].finalSize,4);assert.equal(chosen.hexTerrainByKey.size,0);
 assert.throws(()=>prepareWaterGeometry({...d,hexTerrainByKey:new Map([['9,9',sea],['9,10',sea]])},{target:'land',hexKeys:['9,9','9,10']}),/no_region/);
});
test('E6 enclosed sea is an explicit lake choice; open sea needs at least two cells',()=>{
 const d=doc(),p=prepareWaterGeometry(d,{target:'sea',hexKeys:['0,0']});
 assert.equal(p.unresolved[0].reason,'enclosed');assert.deepEqual(p.unresolved[0].allowed,['lake']);
 assert.equal(prepareWaterGeometry(d,{target:'sea',hexKeys:['0,0'],componentKinds:{'0,0':'lake'}}).unresolved.length,0);
 assert.throws(()=>prepareWaterGeometry(d,{target:'sea',hexKeys:['3,0']}),/sea_minimum/);
 const opened=prepareWaterGeometry(d,{target:'sea',hexKeys:['3,0','3,1']});assert.equal(opened.unresolved.length,0);assert.equal(opened.hexTerrainByKey.get('3,0').terrainOverride,'sea');
 assert.throws(()=>prepareWaterGeometry(opened,{target:'land',hexKeys:['3,0']}),/sea_minimum/);
});
test('E6 lake-to-sea joining lists the whole affected body before deleting old identities',()=>{
 const d=doc([['2,0',lake(4)],['3,0',sea],['3,1',sea]]),p=prepareWaterGeometry(d,{target:'sea',hexKeys:['2,0']});
 // All cells are already one sea after the explicit single lake conversion.
 assert.deepEqual(p.removedLakeIds,[4]);assert.equal(p.hexTerrainByKey.get('2,0').terrainOverride,'sea');
 const mixed=doc([['1,0',lake(4)],['3,0',sea],['3,1',sea]]),q=prepareWaterGeometry(mixed,{target:'sea',hexKeys:['2,0']});
 assert.equal(q.unresolved.find(c=>c.type==='kind').reason,'mixed');assert.equal(q.hexTerrainByKey.get('1,0').terrainOverride,'sea');
 assert.deepEqual(connectedWaterBody(mixed.hexTerrainByKey,'3,0'),['3,0','3,1']);
});
test('E6 unchanged legacy disconnected lake is preserved; touching it and ID overflow refuse atomically',()=>{
 const d=doc([['-2,0',lake(4)],['2,0',lake(4)]]),p=prepareWaterGeometry(d,{target:'lake',hexKeys:['0,-1']});assert.equal(p.hexTerrainByKey.get('-2,0').lakeId,4);
 assert.throws(()=>prepareWaterGeometry(d,{target:'land',hexKeys:['-2,0']}),/legacy_disconnected_lake/);
 const e=doc();e.nextLakeId=Number.MAX_SAFE_INTEGER;assert.throws(()=>prepareWaterGeometry(e,{target:'lake',hexKeys:['0,0']}),/lake_overflow/);assert.equal(e.hexTerrainByKey.size,0);
});
