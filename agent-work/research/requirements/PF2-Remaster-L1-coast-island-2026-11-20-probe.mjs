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


const app=await open(fixture());
const island=['0,0','1,0','0,1'];
const sea=[...new Set([...coast,...island.flatMap(neighbors).filter(k=>!island.includes(k))])];
const gate='2,0';
function topology(doc){
 const water=new Set(Object.entries(doc.map.terrainByHexKey).filter(([,v])=>v.terrainOverride==='sea').map(([k])=>k));
 const land=new Set([...footprint].filter(k=>!water.has(k)));
 return {water,land,fromIsland:component(land,island[0]),fromCoast:component(land,mainland)};
}
select(app,'sea',sea);
assert.equal(app.render().finishWaterDraft(app.render().waterDraft),true);
const initial=await verifySaved(app,sea,[]);
const a=topology(initial.saved);
assert.deepEqual(a.fromIsland,new Set(island));
assert.equal(a.fromCoast.size,footprint.size-sea.length-island.length);
assert.ok(!a.fromCoast.has(island[0]) && initial.saved.map.regions[0].isCoastal);
const fresh=await open(initial.saved);
select(fresh,'land',[gate]);
assert.equal(fresh.render().finishWaterDraft(fresh.render().waterDraft),true);
const bridge=await verifySaved(fresh,sea.filter(k=>k!==gate),[]);
const b=topology(bridge.saved);
assert.ok(b.fromIsland.has(mainland));assert.equal(b.fromIsland.size,b.land.size);
assert.equal(bridge.seaId,initial.seaId);
fresh.render().undoMap();assert.deepEqual(save(fresh).map,initial.saved.map);
fresh.render().redoMap();assert.deepEqual(save(fresh).map,bridge.saved.map);
select(fresh,'sea',[gate]);assert.equal(fresh.render().finishWaterDraft(fresh.render().waterDraft),true);
const restored=await verifySaved(fresh,sea,[]);
assert.deepEqual(topology(restored.saved).fromIsland,new Set(island));
assert.equal(restored.seaId,initial.seaId);assert.deepEqual(restored.saved.generation,initial.saved.generation);
console.log(JSON.stringify({seed,scaleMiles:6,total:footprint.size,island,sea,mainland,gate,seaId:initial.seaId,before:{island:a.fromIsland.size,mainland:a.fromCoast.size,water:a.water.size},withBridge:{land:b.fromIsland.size,water:b.water.size},after:{island:3,mainland:topology(restored.saved).fromCoast.size,water:sea.length},jsonRoundTrips:3,undoRedoExact:true,rngUnchanged:true}));

const offshores=[['0,0'],['1,-2','2,-2']];
const sea2=[...new Set([...coast,...offshores.flat().flatMap(neighbors).filter(k=>!offshores.flat().includes(k))])];
const group=await open(fixture());select(group,'sea',sea2);
assert.equal(group.render().finishWaterDraft(group.render().waterDraft),true);
const groupSaved=await verifySaved(group,sea2,[]);const graph=topology(groupSaved.saved);
for(const chain of offshores)assert.deepEqual(component(graph.land,chain[0]),new Set(chain));
assert.equal(graph.fromCoast.size,graph.land.size-3);
const atoll=await open(fixture());
const outer=[...footprint].filter(k=>{const {q,r}=coord(k);return Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))===2});
const lagoonSea=[...new Set([...outer,...coast,'0,0','1,0'])];
select(atoll,'sea',lagoonSea);assert.equal(atoll.render().finishWaterDraft(atoll.render().waterDraft),true);
const lagoon=await verifySaved(atoll,lagoonSea,[]);const lg=topology(lagoon.saved);
const rim=neighbors('0,0').filter(k=>k!=='1,0');
assert.deepEqual(component(lg.land,rim[0]),new Set(rim));assert.ok(component(lg.water,'0,0').has('-4,0'));
assert.equal(lg.fromCoast.size,lg.land.size-rim.length);
console.log(JSON.stringify({archipelago:{islandSizes:offshores.map(x=>x.length),sea:sea2.length,mainland:graph.fromCoast.size},openLagoon:{rim:rim.length,pass:'1,0',center:'0,0',sea:lagoonSea.length,mainland:lg.fromCoast.size},additionalRoundTrips:2}));
