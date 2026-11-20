import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const seed=42;
const directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const key=({q,r})=>`${q},${r}`;
const coord=value=>{
  const [q,r]=value.split(',').map(Number);
  return {q,r};
};
const neighbors=value=>{
  const {q,r}=coord(value);
  return directions.map(([dq,dr])=>key({q:q+dq,r:r+dr}));
};
const footprint=new Set();
for(let q=-4;q<=4;q++){
  for(let r=-4;r<=4;r++){
    if(Math.abs(q+r)<=4)footprint.add(key({q,r}));
  }
}
const edge=[...footprint].filter(k=>neighbors(k).some(n=>!footprint.has(n)));
const ring=neighbors('0,0');
const coast=['-4,0','-3,0','-2,0'];
const basin=['-1,0','0,0','1,0'];
const mainland='3,0';

function component(cells,start){
  const reached=new Set();
  const pending=[start];
  while(pending.length){
    const next=pending.pop();
    if(!cells.has(next)||reached.has(next))continue;
    reached.add(next);
    pending.push(...neighbors(next));
  }
  return reached;
}

function fixture(){
  const data=regionFixture();
  data.version=10;
  data.generation=createGenerationState(seed);
  data.map.seas=[];
  data.map.nextSeaId=1;
  data.map.gmNotesByHexKey={};
  data.map.biomeOverrideByHexKey={};
  data.map.regions=[{
    ...data.map.regions[0],hexes:[...footprint].map(coord),centerHex:coord('4,0'),
    anchorHex:coord(mainland),finalSize:footprint.size,targetSize:footprint.size,
    pointsOfInterest:[],pointOfInterestKinds:{},
  }];
  return data;
}

async function open(doc){
  const app=createGenerationHarness(seed,'','en');
  app.render();
  const alerts=[];
  app.setWindow({alert:message=>alerts.push(message),matchMedia:()=>({matches:false})});
  app.injectFunction('readTextFile',async file=>file.text);
  await app.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
  assert.deepEqual(alerts,[]);
  app.render().setEditMode(true);
  assert.equal(app.render().generationMode,'classic');
  assert.equal(app.render().fineDisplay?.viewStep??6,6);
  return app;
}

const save=app=>JSON.parse(JSON.stringify(app.render().createSaveData()));

function select(app,target,cells){
  app.render().setSelectedHex(coord(cells[0]));
  assert.equal(app.render().startWaterDraft(target),true);
  for(const cell of cells.slice(1))assert.equal(app.render().toggleWaterHex(cell),true);
}

function confirm(app){
  const frame=app.render();
  assert.equal(frame.finishWaterDraft(frame.waterDraft,true),true,frame.editError??frame.waterPreview?.error??JSON.stringify(frame.waterPreview?.plan?.geometry.unresolved));
}

function expectDraft(app,before,reason,cells){
  const {waterDraft,finishWaterDraft}=app.render();
  assert.equal(finishWaterDraft(waterDraft),false);
  const frame=app.render();
  assert.equal(frame.waterDraft.preview,true);
  assert.deepEqual(save(app).map,before.map);
  const choice=frame.waterPreview.plan.geometry.unresolved.find(c=>c.type==='kind'&&c.reason===reason);
  assert.ok(choice);
  assert.deepEqual(new Set(choice.hexKeys),new Set(cells));
  assert.deepEqual([...choice.allowed],['lake']);
  assert.equal(frame.changeWaterDraft(frame.waterDraft,{
    edit:{...frame.waterDraft.edit,componentKinds:{[choice.key]:'lake'}},preview:true,
  }),true);
  return choice.allowed;
}

async function verifySaved(app,seaCells,lakeCells){
  const saved=save(app);
  const restored=save(await open(saved));
  assert.deepEqual(restored.map,saved.map);
  for(const [kind,cells] of [['sea',seaCells],['lake',lakeCells]]){
    const actual=Object.entries(restored.map.terrainByHexKey).filter(([,value])=>value.terrainOverride===kind).map(([coordinate])=>coordinate);
    assert.deepEqual(new Set(actual),new Set(cells));
  }
  const wet=new Set([...seaCells,...lakeCells]);
  const land=new Set([...footprint].filter(k=>!wet.has(k)));
  if(seaCells.length){
    assert.equal(restored.map.seas.length,1);
    assert.deepEqual(new Set(restored.map.seas[0].hexKeys),new Set(seaCells));
    assert.equal(component(wet,seaCells[0]).size,seaCells.length);
    assert.ok(seaCells.some(k=>edge.includes(k)));
  }else{
    assert.equal(restored.map.seas.length,0);
  }
  if(lakeCells.length){
    const ids=new Set(lakeCells.map(k=>restored.map.terrainByHexKey[k].lakeId));
    assert.equal(ids.size,1);
    assert.ok(Number.isSafeInteger([...ids][0]));
    assert.equal(component(wet,lakeCells[0]).size,lakeCells.length);
    assert.ok(lakeCells.every(k=>!edge.includes(k)));
  }
  return {saved,land,seaId:restored.map.seas[0]?.id??null,lakeId:lakeCells.length?restored.map.terrainByHexKey[lakeCells[0]].lakeId:null};
}

const island=await open(fixture());
const islandSea=[...coast,...ring];
select(island,'sea',islandSea);
assert.equal(island.render().finishWaterDraft(island.render().waterDraft),true);
const isolated=await verifySaved(island,islandSea,[]);
assert.deepEqual([...component(isolated.land,'0,0')],['0,0']);
assert.equal(component(isolated.land,mainland).size,51);
assert.ok(neighbors('-4,0').some(k=>isolated.land.has(k)));
assert.ok(isolated.saved.map.regions[0].isCoastal);

const peninsula=await open(fixture());
const neck='1,0';
const peninsulaSea=[...coast,...ring.filter(k=>k!==neck)];
select(peninsula,'sea',peninsulaSea);
assert.equal(peninsula.render().finishWaterDraft(peninsula.render().waterDraft),true);
const connected=await verifySaved(peninsula,peninsulaSea,[]);
assert.equal(component(connected.land,mainland).size,53);
assert.deepEqual(neighbors('0,0').filter(n=>connected.land.has(n)),[neck]);
assert.equal(component(connected.land,'0,0').has(mainland),true);
assert.equal(component(new Set([...connected.land].filter(k=>k!==neck)),'0,0').has(mainland),false);

const lake=await open(fixture());
select(lake,'lake',basin);
assert.equal(lake.render().finishWaterDraft(lake.render().waterDraft),true);
const directLake=await verifySaved(lake,[],basin);
assert.ok(basin.flatMap(neighbors).filter(k=>!basin.includes(k)).every(k=>directLake.land.has(k)));

const enclosure=await open(fixture());
const beforeEnclosure=save(enclosure);
select(enclosure,'sea',basin);
const directAllowed=expectDraft(enclosure,beforeEnclosure,'enclosed',basin);
confirm(enclosure);
const enclosedLake=await verifySaved(enclosure,[],basin);

const closing=await open(fixture());
select(closing,'sea',[...coast,...basin]);
assert.equal(closing.render().finishWaterDraft(closing.render().waterDraft),true);
const openInlet=await verifySaved(closing,[...coast,...basin],[]);
const gate='-2,0';
select(closing,'land',[gate]);
const closingAllowed=expectDraft(closing,openInlet.saved,'enclosed',basin);
confirm(closing);
const closed=await verifySaved(closing,coast.slice(0,2),basin);
assert.equal(closed.land.has(gate),true);
assert.equal(closed.seaId,openInlet.seaId);
closing.render().undoMap();
assert.deepEqual(save(closing).map,openInlet.saved.map);
closing.render().redoMap();
assert.deepEqual(save(closing).map,closed.saved.map);

console.log(JSON.stringify({
  fixture:{cellCount:footprint.size,scaleMiles:6,edgeCells:edge.length,seed},
  coast:{edge:'-4,0',landNeighbors:neighbors('-4,0').filter(k=>isolated.land.has(k)),regionCoastal:true},
  island:{cell:'0,0',componentSize:1,mainlandSize:51,seaCells:islandSea,seaId:isolated.seaId},
  peninsula:{tip:'0,0',onlyDryNeighbor:neck,landComponentSize:53,seaCells:peninsulaSea},
  lake:{cells:basin,lakeId:directLake.lakeId},
  enclosedSea:{cells:basin,choices:directAllowed,result:'lake',lakeId:enclosedLake.lakeId,unchangedUntilChoice:true},
  strait:{closedCell:gate,choices:closingAllowed,seaCells:coast.slice(0,2),seaId:closed.seaId,lakeCells:basin,lakeId:closed.lakeId,undoRedo:true},
  saveReloadMapEquality:true,method:'Actual App callbacks with repo React harness and an independent axial graph. No browser.',
},null,2));
