import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const seed=42;
const target=['2,0','2,1'];
const other=['-2,1'];
const coord=key=>{
  const [q,r]=key.split(',').map(Number);
  return {q,r};
};
const hexes=[];
for(let q=-4;q<=4;q++){
  for(let r=-4;r<=4;r++){
    if(Math.abs(q+r)<=4) hexes.push({q,r});
  }
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
    ...data.map.regions[0],hexes,centerHex:coord('4,0'),
    anchorHex:coord('3,0'),finalSize:hexes.length,targetSize:hexes.length,
    heightLevel:1,pointsOfInterest:[],pointOfInterestKinds:{},
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

function save(app){
  const data=JSON.parse(JSON.stringify(app.render().createSaveData()));
  delete data.savedAt;
  return data;
}

function placeLake(app,keys){
  app.render().setSelectedHex(coord(keys[0]));
  assert.equal(app.render().startWaterDraft('lake'),true);
  for(const cell of keys.slice(1)) assert.equal(app.render().toggleWaterHex(cell),true);
  assert.equal(app.render().finishWaterDraft(app.render().waterDraft),true);
  const terrain=save(app).map.terrainByHexKey;
  const id=terrain[keys[0]].lakeId;
  assert.ok(Number.isSafeInteger(id));
  for(const cell of keys) assert.deepEqual(terrain[cell],{terrainOverride:'lake',lakeId:id});
  return id;
}

const app=await open(fixture());
const targetId=placeLake(app,target);
const otherId=placeLake(app,other);
const main=['0,-56','0,-28','24.249,-14','24.249,14','48.497,28','72.746,14'];
const tributary=['48.497,-56','48.497,-28','24.249,-14'];
const join='24.249,-14';
const mouth=main.at(-1);
const edgeKey=(a,b)=>[a,b].sort().join('|');
const before=save(app);
assert.notEqual(targetId,otherId);

function draw(vertices){
  assert.equal(app.render().startRiverDraft(),true);
  for(const vertex of vertices){
    const frame=app.render();
    assert.ok(frame.riverDraftVertices.some(v=>v.key===vertex),`Unavailable vertex ${vertex}`);
    assert.equal(frame.appendRiverDraft(vertex),true,frame.editError);
  }
  const frame=app.render();
  return frame.finishRiverDraft(frame.riverDraft);
}

const geometry=app.geometry.buildManualRiverGeometryContext(app.render().captureDocument().map).geometry;
for(const key of [main[0],tributary[0],join,main.at(-2)]){
  assert.equal(geometry.openVertices.has(key),false);
  assert.equal(geometry.lakeByVertex.has(key),false);
}
assert.equal(geometry.lakeByVertex.get(mouth),`lake:${targetId}`);

assert.equal(draw(main.slice(0,-1)),false,'The route cannot terminate on enclosed dry land');
const dryEndError=app.render().editError;
assert.ok(dryEndError);
assert.deepEqual(save(app),before);
assert.equal(app.render().resetRiverDraft(),true);

assert.equal(draw(main),true);
const mainOnly=save(app);
assert.equal(mainOnly.map.rivers.length,1);
assert.deepEqual(mainOnly.map.rivers[0].vertexPath.map(v=>v.key),main);
assert.equal(draw(tributary),true);
const joined=save(app);
assert.equal(joined.map.rivers.length,2);
assert.deepEqual(joined.map.rivers[1].vertexPath.map(v=>v.key),tributary);
assert.deepEqual(joined.map.rivers[0].vertexPath,mainOnly.map.rivers[0].vertexPath);
assert.deepEqual(joined.map.terrainByHexKey,before.map.terrainByHexKey);
assert.deepEqual(joined.generation,before.generation);

function readNetwork(doc){
  const rootPath=doc.map.rivers[0].vertexPath.map(v=>v.key);
  const tributaryPath=doc.map.rivers[1].vertexPath.map(v=>v.key);
  assert.deepEqual(rootPath,main);
  assert.deepEqual(tributaryPath,tributary);
  const edges=doc.map.rivers.flatMap(r=>r.vertexPath.slice(1).map((v,i)=>{
    const from=r.vertexPath[i].key, to=v.key;
    const matches=r.sectors.filter(s=>s.edgeKeys.includes(edgeKey(from,to)));
    assert.equal(matches.length,1);
    return {from,to,fullness:matches[0].fullness};
  }));
  assert.equal(new Set(edges.map(e=>edgeKey(e.from,e.to))).size,edges.length);
  assert.equal(edges.filter(e=>e.to===join).length,2);
  assert.equal(edges.filter(e=>e.from===join).length,1);
  function trace(start){
    const visited=new Set();
    const path=[];
    while(start){
      assert.ok(!visited.has(start),'A river route must terminate');
      visited.add(start);
      path.push(start);
      const out=edges.filter(e=>e.from===start);
      assert.ok(out.length<=1);
      start=out[0]?.to;
    }
    return path;
  }
  const mainTrace=trace(main[0]),tributaryTrace=trace(tributary[0]);
  assert.deepEqual(mainTrace,main);
  assert.deepEqual(tributaryTrace,[...tributary,...main.slice(main.indexOf(join)+1)]);
  const lakeCellsAtMouth=Object.entries(doc.map.terrainByHexKey)
    .filter(([key,value])=>value.terrainOverride==='lake'&&app.geometry.getHexCornerPoints(coord(key)).some(v=>v.key===mouth))
    .map(([key,value])=>({key,id:value.lakeId}));
  assert.ok(lakeCellsAtMouth.length);
  assert.deepEqual(new Set(lakeCellsAtMouth.map(c=>c.id)),new Set([targetId]));
  assert.ok(lakeCellsAtMouth.every(c=>target.includes(c.key)));
  return {mainTrace,tributaryTrace,lakeCellsAtMouth,edges};
}

const restored=save(await open(joined));
assert.deepEqual(restored,joined);
const initialNetwork=readNetwork(restored);
assert.deepEqual(initialNetwork.edges.map(e=>e.fullness),[1,1,1,1,1,1,1]);

app.render().undoMap();
assert.deepEqual(save(app),mainOnly);
app.render().redoMap();
assert.deepEqual(save(app),joined);

const downstream={
  type:'fullness',
  riverId:joined.map.rivers[0].id,
  edgeKey:edgeKey(main.at(-2),mouth),
  fullness:2,
};
assert.equal(app.render().requestRiverCommand(downstream),true);
const larger=save(app);
const restoredLarger=save(await open(larger));
assert.deepEqual(restoredLarger,larger);
const increasedNetwork=readNetwork(restoredLarger);
assert.deepEqual(increasedNetwork.edges.map(e=>e.fullness),[1,1,2,2,2,1,1]);
assert.equal(app.render().requestRiverCommand({...downstream,fullness:3}),false);
const excessiveFlowError=app.render().editError;
assert.ok(excessiveFlowError);
assert.deepEqual(save(app),larger);
const model=app.geometry.buildManualRiverGeometryContext(app.render().captureDocument().map)
  .network(app.render().rivers);
assert.equal(model.issues.length,0);
assert.equal(model.network.nodes.find(n=>n.id===join).kind,'confluence');

console.log(JSON.stringify({
  fixture:{seed,scaleMiles:6,hexCount:hexes.length},
  confluence:join,
  selectedLake:{id:targetId,cells:target},
  otherLake:{id:otherId,cells:other},
  riverIds:joined.map.rivers.map(r=>r.id),
  initialNetwork,increasedNetwork,
  rejections:{dryEnd:{error:dryEndError,unchanged:true},excessiveFlow:{error:excessiveFlowError,unchanged:true}},
  saveReloadMapEquality:true,undoRedo:true,
  method:'Actual river and water editor callbacks in the repository React harness, with independent directed tracing over exported JSON. No browser.',
},null,2));
