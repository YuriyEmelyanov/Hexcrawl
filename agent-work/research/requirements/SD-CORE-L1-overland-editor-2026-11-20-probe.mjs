import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const seed=42;
const key=({q,r})=>`${q},${r}`;
const coord=pair=>{
  const [q,r]=pair.split(',').map(Number);
  return {q,r};
};
const disk=[];
for(let q=-4;q<=4;q++){
  for(let r=-4;r<=4;r++){
    if(Math.abs(q+r)<=4)disk.push({q,r});
  }
}

const data=regionFixture();
data.version=10;
data.generation=createGenerationState(seed);
data.map.seas=[];
data.map.nextSeaId=1;
data.map.gmNotesByHexKey={};
data.map.biomeOverrideByHexKey={};
data.map.regions=[{
  ...data.map.regions[0],hexes:disk,centerHex:coord('3,0'),
  anchorHex:coord('4,0'),targetSize:61,finalSize:61,pointsOfInterest:[],pointOfInterestKinds:{},
}];

async function open(doc){
  const app=createGenerationHarness(seed,'','en');
  app.render();
  const alerts=[];
  app.setWindow({alert:message=>alerts.push(message)});
  app.injectFunction('readTextFile',async file=>file.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
  assert.deepEqual(alerts,[]);
  app.render().setEditMode(true);
  assert.equal(app.render().generationMode,'classic');
  assert.equal(app.render().fineDisplay?.viewStep??6,6);
  return app;
}
function save(app){
  const data=JSON.parse(JSON.stringify(app.render().createSaveData()));
  delete data.savedAt;
  return data;
}
const categories=['desert_or_arctic','swamp','grassland','forest_or_jungle','river_or_coast','ocean','mountain'];
const terrainRows=[[2,2],[3,3],[4,6],[7,8],[9,10],[11,11],[12,12]];
const add=([a,b])=>a+b;
const terrain=dice=>terrainRows.findIndex(([lo,hi])=>add(dice)>=lo&&add(dice)<=hi);
const steps=[
  {hex:'-3,0',dice:[4,5],poi:2,choice:'coast'},
  {hex:'-4,0',dice:[1,1],poi:6,choice:'ocean'},
  {hex:'-3,-1',dice:[4,5],poi:3,choice:'arctic'},
  {hex:'-2,-1',dice:[2,2],poi:5,choice:'arctic'},
  {hex:'-1,-1',dice:[6,6],reroll:[3,4],poi:1,choice:'forest'},
  {hex:'0,-1',dice:[1,1],poi:4,choice:'river'},
];
const played=steps.map((step,i)=>{
  if(i>0){
    assert.ok(disk.some(h=>key(h)===step.hex));
    const a=coord(steps[i-1].hex),b=coord(step.hex),dq=a.q-b.q,dr=a.r-b.r;
    assert.equal(Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr)),1);
  }
  return {...step,terrainRoll:add(step.dice),operation:i===0?'initial':add(step.dice)===12?'reroll':add(step.dice)<=3?'plus1':add(step.dice)<=8?'same':'plus2'};
});
let current=-1;
for(const row of played){
  const delta={plus1:1,same:0,plus2:2}[row.operation];
  current=row.operation==='initial'?terrain(row.dice):row.operation==='reroll'?terrain(row.reroll):(current+delta)%categories.length;
  row.category=categories[current];
}
assert.deepEqual(played.map(x=>x.category),['river_or_coast','ocean','desert_or_arctic','desert_or_arctic','forest_or_jungle','river_or_coast']);

const app=await open(data);
const selectedOcean='-4,0',auxOcean='-4,1',coast='-3,0',riverHex='0,-1',poiHex='-1,-1';
const before=save(app);
app.render().setSelectedHex(coord(selectedOcean));
assert.equal(app.render().startWaterDraft('sea'),true);
assert.equal(app.render().finishWaterDraft(app.render().waterDraft),false);
const singleSeaError=app.render().editError;
assert.match(singleSeaError,/Sea identity.*unchanged/i);
assert.throws(()=>app.geometry.prepareWaterMapEdit(app.render().captureDocument().map,{target:'sea',hexKeys:[selectedOcean]}),/sea_minimum/);
assert.deepEqual(save(app).map,before.map);
app.render().resetWaterDraft();
assert.equal(app.render().startWaterDraft('sea'),true);
assert.equal(app.render().toggleWaterHex(auxOcean),true);
assert.equal(app.render().finishWaterDraft(app.render().waterDraft),true);
const water=save(app);
assert.deepEqual(Object.keys(water.map.terrainByHexKey).sort(),[selectedOcean,auxOcean].sort());
assert.ok(app.geometry.getHexNeighbors(coord(coast)).some(h=>key(h)===selectedOcean));
assert.equal(water.map.terrainByHexKey[coast],undefined);
assert.ok(water.map.regions[0].isCoastal);

const overrides={'-3,-1':'snow_plains','-2,-1':'snow_plains',[poiHex]:'plain_deciduous_forest'};
for(const [hex,biome] of Object.entries(overrides)){
  app.render().setSelectedHex(coord(hex));
  app.render().setSelectedHexBiomeOverride(biome);
}
assert.deepEqual(save(app).map.biomeOverrideByHexKey,overrides);

const context=app.geometry.buildManualRiverGeometryContext(app.render().captureDocument().map);
const geo=context.geometry;
const adjacency=new Map();
const riverHexEdges=app.geometry.getHexEdgeKeys(coord(riverHex));
for(const edge of geo.edgeOwners.keys()){
  if(context.blocked(edge))continue;
  const [a,b]=edge.split('|');
  for(const [from,to] of [[a,b],[b,a]]){
    if(!adjacency.has(from))adjacency.set(from,[]);
    adjacency.get(from).push(to);
  }
}
function routeToSea(start){
  const queue=[[start]],seen=new Set();
  while(queue.length){
    const path=queue.shift(),last=path.at(-1);
    if(seen.has(last))continue;
    if(geo.seaVertices.has(last))return path;
    seen.add(last);
    if(geo.openVertices.has(last))continue;
    for(const next of adjacency.get(last)??[])queue.push([...path,next]);
  }
}
const pair=(a,b)=>[a,b].sort().join('|');
const starts=app.geometry.getHexCornerPoints(coord(riverHex)).map(v=>v.key);
const routes=starts.map(routeToSea).filter(path=>path&&path.length>1&&riverHexEdges.has(pair(path[0],path[1])));
const route=routes[0];
assert.ok(route);
assert.equal(app.render().startRiverDraft(),true);
for(const vertex of route){
  assert.ok(app.render().riverDraftVertices.some(v=>v.key===vertex));
  assert.equal(app.render().appendRiverDraft(vertex),true);
}
assert.equal(app.render().finishRiverDraft(app.render().riverDraft),true,app.render().editError);
app.render().setSelectedHex(coord(poiHex));
app.render().setSelectedPoiKind('ruins');

const doc=save(app);
assert.equal(doc.map.rivers.length,1);
const after=save(await open(doc));
assert.deepEqual(after,doc);
assert.deepEqual(after.map.biomeOverrideByHexKey,overrides);
assert.deepEqual(after.map.regions[0].pointOfInterestKinds,{[poiHex]:'ruins'});
assert.deepEqual(after.map.regions[0].pointsOfInterest,[coord(poiHex)]);
assert.equal(after.map.regions[0].suppressCentralPoi,true);
assert.ok(played.filter(row=>row.poi!==1).every(row=>!(row.hex in after.map.regions[0].pointOfInterestKinds)));
assert.deepEqual(after.map.seas[0].hexKeys,[selectedOcean,auxOcean]);
const river=after.map.rivers[0];
assert.deepEqual(river.vertexPath.map(v=>v.key),route);
assert.ok(app.geometry.getHexCornerPoints(coord(selectedOcean)).some(v=>v.key===route.at(-1))||
  app.geometry.getHexCornerPoints(coord(auxOcean)).some(v=>v.key===route.at(-1)));
assert.deepEqual(after.generation,before.generation);

console.log(JSON.stringify({fixture:{seed,baseHexStepMiles:6,foundationHexes:61},sourceProcedure:played,
  persisted:{coast:{hex:coast,adjacentOcean:selectedOcean,dry:true},ocean:{cells:after.map.seas[0].hexKeys,id:after.map.seas[0].id},
  biomeOverrides:overrides,river:{id:river.id,adjacentHex:riverHex,startsAt:route[0],endsAt:route.at(-1),vertices:route},poi:after.map.regions[0].pointOfInterestKinds},
  rejectedOneSeaCell:{feedback:singleSeaError,originalMapUnchanged:true},exactSaveReload:true,randomGenerationStateUnchanged:true},null,2));
