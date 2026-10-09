import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseWoodlandStyle} from '../src/modes/woodlandStyle.ts';
import {forestWaterBoundary} from '../src/rendering/forestWaterBoundary.ts';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
const region=(biomeId,q=0,r=0)=>({biomeId,anchorHex:{q,r},hexes:[{q,r}]});
test('only the starting contact chooses islands or clearings; persisted choice wins',()=>{
 const forest=region('plain_deciduous_forest'),open=region('deciduous_woodland',1,0);
 assert.equal(chooseWoodlandStyle(open,[forest],new Map()),'clearings');
 assert.equal(chooseWoodlandStyle(open,[],new Map()),'islands');
 assert.equal(chooseWoodlandStyle({...open,woodlandStyle:'islands'},[forest],new Map()),'islands');
 assert.equal(chooseWoodlandStyle({...open,hexes:[{q:1,r:0},{q:7,r:0}]},[region('plain_deciduous_forest',8)],new Map()),'islands');
 assert.equal(chooseWoodlandStyle(open,[forest],new Map([['0,0','open_plains']])),'islands');
});
test('real tract callback persists woodland style, save validates it and undo restores the original map',()=>{
 const h=createGenerationHarness(41);
 h.render().addFallbackTractToMap({q:0,r:0},true,{landType:'wild',biomeId:'plain_deciduous_forest'});
 const before=JSON.stringify(h.render().regions),anchor={q:1,r:0};
 h.render().addFallbackTractToMap(anchor,true,{landType:'wild',biomeId:'deciduous_woodland'});
 const app=h.render();assert.equal(app.regions.at(-1).woodlandStyle,'clearings');
 const save=JSON.parse(JSON.stringify(app.createSaveData()));h.geometry.assertHexcrawlSaveData(save);
 assert.equal(save.map.regions.at(-1).woodlandStyle,'clearings');
 const invalid=structuredClone(save);invalid.map.regions.at(-1).woodlandStyle='bad';assert.throws(()=>h.geometry.assertHexcrawlSaveData(invalid),/редколесья/);
 app.deleteLastRegion();assert.equal(JSON.stringify(h.render().regions),before);
 const alone=createGenerationHarness(41);alone.render().addFallbackTractToMap({q:0,r:0},true,{landType:'wild',biomeId:'deciduous_woodland'});assert.equal(alone.render().regions[0].woodlandStyle,'islands');
});
test('water cuts an exterior bank but does not divide the forest interior',()=>{
 const radius=28,cell=(q,r)=>({q,r,x:Math.sqrt(3)*(q+r/2)*radius,y:1.5*r*radius,biome:'plain_deciduous_forest'});
 const river={key:'r',x1:Math.sqrt(3)*14,y1:-14,x2:Math.sqrt(3)*14,y2:14,width:5};
 assert.equal(forestWaterBoundary([cell(0,0)],radius,[river],[]).cuts.length,1);
 assert.equal(forestWaterBoundary([cell(0,0),cell(1,0)],radius,[river],[]).cuts.length,0);
});
