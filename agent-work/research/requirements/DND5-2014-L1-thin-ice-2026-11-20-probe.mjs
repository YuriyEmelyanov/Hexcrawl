import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {obstacleTarget} from './src/manualObstacles.ts';
import {createGenerationState} from './src/worldRandom.ts';

const data=regionFixture();
data.version=10;
data.generation=createGenerationState(42);
data.map.seas=[];
data.map.nextSeaId=1;
data.map.gmNotesByHexKey={};
data.map.biomeOverrideByHexKey={};
data.map.regions[0].pointsOfInterest=[];
data.map.regions[0].pointOfInterestKinds={};
const waterHex={q:2,r:0},snowHex={q:1,r:0},origin={q:0,r:0};
const waterKey='2,0',snowKey='1,0';

async function open(doc){
  const app=createGenerationHarness(42,'','en');
  app.render();
  const alerts=[];
  app.setWindow({alert:msg=>alerts.push(msg),matchMedia:()=>({matches:false})});
  app.injectFunction('readTextFile',async f=>f.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
  assert.deepEqual(alerts,[]);
  app.render().setEditMode(true);
  return app;
}
const save=app=>JSON.parse(JSON.stringify(app.render().createSaveData()));
const app=await open(data);
app.render().setSelectedHex(waterHex);
assert.equal(app.render().startWaterDraft('lake'),true);
assert.equal(app.render().finishWaterDraft(app.render().waterDraft,true),true);
assert.equal(save(app).map.terrainByHexKey[waterKey].terrainOverride,'lake');
app.render().setSelectedHex(snowHex);
app.render().setSelectedHexBiomeOverride('snow_plains');
const terrain=save(app);
assert.deepEqual(terrain.map.biomeOverrideByHexKey,{[snowKey]:'snow_plains'});
assert.equal(terrain.map.terrainByHexKey[waterKey].terrainOverride,'lake');
assert.deepEqual(save(await open(terrain)).map,terrain.map);
app.render().undoMap();
assert.equal(save(app).map.biomeOverrideByHexKey?.[snowKey],undefined);
assert.equal(save(app).map.terrainByHexKey[waterKey].terrainOverride,'lake');
app.render().redoMap();
assert.deepEqual(save(app).map,terrain.map);
app.render().setSelectedHex(waterHex);
app.render().setSelectedHexBiomeOverride('snow_plains');
assert.deepEqual(save(app).map,terrain.map);
assert.equal(app.render().editObstacleDocument({type:'add',hex:snowHex,neighborHex:waterHex}),false);
const wetEdgeFeedback=app.render().editError;
const sharedEdge=[...app.geometry.getHexEdgeKeys(snowHex)].find(e=>app.geometry.getHexEdgeKeys(waterHex).has(e));
assert.ok(sharedEdge);
assert.throws(()=>obstacleTarget(snowHex,waterHex,{
  exists:()=>true, water:h=>h.q===waterHex.q&&h.r===waterHex.r,
  edgeKey:()=>sharedEdge, riverEdges:new Set(),roadPairs:new Set(),kingdoms:[]
}),/water_obstacle_edge/);
assert.ok(wetEdgeFeedback);
assert.deepEqual(save(app).map,terrain.map);
assert.equal(app.render().editObstacleDocument({type:'add',hex:origin,neighborHex:snowHex}),true);
const dry=save(app);
assert.equal(dry.map.obstacles.length,1);
assert.ok(dry.map.obstacles[0].edgeKey);
assert.deepEqual(dry.map.obstacles[0].hex,origin);
assert.deepEqual(dry.map.obstacles[0].neighborHex,snowHex);
assert.deepEqual(save(await open(dry)).map,dry.map);
assert.equal(app.render().chooseKnaveProfile(true),true);
app.render().setSelectedHex(waterHex);
assert.equal(app.render().changeKnaveDraft({difficulty:'difficult'}),false);
app.render().setSelectedHex(snowHex);
assert.equal(app.render().changeKnaveDraft({difficulty:'difficult'}),true);
assert.equal(app.render().finishKnaveDraft(),true);
const difficult=save(app);
assert.deepEqual(difficult.map.knave.difficultyByHex,{[snowKey]:'difficult'});
assert.deepEqual(difficult.map.biomeOverrideByHexKey,terrain.map.biomeOverrideByHexKey);
assert.deepEqual(difficult.map.terrainByHexKey,terrain.map.terrainByHexKey);
assert.deepEqual(save(await open(difficult)).map,difficult.map);
console.log(JSON.stringify({lake:waterKey,snow:snowKey,independentTerrainAndBiome:true,roundtrip:true,undoRedo:true,waterBiomeOverride:false,waterEdgeRejected:true,waterEdgeDomainReason:'water_obstacle_edge',wetEdgeFeedback,dryEdge:{from:origin,to:snowHex,edgeKey:dry.map.obstacles[0].edgeKey},knave:{drySnowDifficulty:'difficult',lakeDifficultyRejected:true},method:'App editor handlers, current JSON export and import, no browser'}));
