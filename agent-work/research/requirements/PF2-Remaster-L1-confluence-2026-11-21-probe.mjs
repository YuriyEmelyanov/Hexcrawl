import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const seed=42;
const coast=['4,0','3,0','2,0'];
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
  data.map.rivers=[];
  data.map.regions=[
    {id:1, cells:hexes.filter(h=>h.q<=0||(h.q===1&&h.r===-1)),center:'-3,0',anchor:'-2,0'},
    {id:2, cells:hexes.filter(h=>h.q>=1&&!(h.q===1&&h.r===-1)),center:'1,0',anchor:'1,1'},
  ].map(({id,cells,center,anchor})=>({
    ...data.map.regions[0],id,hexes:cells,centerHex:coord(center),
    anchorHex:coord(anchor),finalSize:cells.length,targetSize:cells.length,
    heightLevel:1,biomeId:'open_plains',pointsOfInterest:[],pointOfInterestKinds:{},
  }));
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


const app=await open(fixture());
app.render().setSelectedHex(coord('-3,0'));
assert.equal(app.render().startRegionDraft('region_height'),true);
const draft=app.render().regionDraft;
assert.equal(app.render().changeRegionDraft(draft,{...draft.edit,heightLevel:2,biomeId:'open_hills'}),true);
assert.equal(app.render().finishRegionDraft(),true);

app.render().setSelectedHex(coord(coast[0]));
assert.equal(app.render().startWaterDraft('sea'),true);
for(const cell of coast.slice(1)) assert.equal(app.render().toggleWaterHex(cell),true);
const water=app.render();
let applied=water.finishWaterDraft(water.waterDraft);
if(!applied&&app.render().waterDraft?.preview){
  const preview=app.render();
  applied=preview.finishWaterDraft(preview.waterDraft,true);
}
assert.equal(applied,true,app.render().editError);
const before=save(app);
assert.deepEqual(before.map.seas[0].hexKeys.slice().sort(),coast.slice().sort());
const main=['0,-56','0,-28','24.249,-14','24.249,14','48.497,28','72.746,14'];
const tributary=['48.497,-56','48.497,-28','24.249,-14'];
const join='24.249,-14';
const mouth=main.at(-1);
const edgeKey=(a,b)=>[a,b].sort().join('|');
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


const productContext=app.geometry.buildManualRiverGeometryContext(app.render().captureDocument().map);
const geometry=productContext.geometry;
const startOwners=productContext.edgeOwners(edgeKey(main[0],main[1]));
const outletOwners=productContext.edgeOwners(edgeKey(main.at(-2),mouth));
assert.deepEqual([...startOwners],[1]);
assert.deepEqual([...outletOwners],[2]);
assert.equal(geometry.heights.get(1),2);
assert.equal(geometry.heights.get(2),1);
assert.ok(geometry.seaVertices.has(mouth));
for(const key of [main[0],tributary[0],join,main.at(-2)]){
  assert.equal(geometry.seaVertices.has(key),false);
  assert.equal(geometry.openVertices.has(key),false);
}

assert.equal(draw(main.slice(0,-1)),false,'The route cannot terminate on enclosed dry land');
const dryEndError=app.render().editError;
assert.ok(dryEndError);
assert.deepEqual(save(app),before);
assert.equal(app.render().resetRiverDraft(),true);

assert.equal(draw(main),true,app.render().editError);
const mainOnly=save(app);
assert.equal(mainOnly.map.rivers.length,1);
assert.deepEqual(mainOnly.map.rivers[0].vertexPath.map(v=>v.key),main);
assert.equal(draw(tributary),true,app.render().editError);
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

  const mouthCells=coast.filter(cell=>app.geometry.getHexCornerPoints(coord(cell)).some(v=>v.key===mouth));
  assert.deepEqual(mouthCells,['2,0']);
  assert.equal(doc.map.terrainByHexKey[mouthCells[0]].terrainOverride,'sea');
  return {mainTrace,tributaryTrace,mouthCells,edges};
}

const joinedNetwork=readNetwork(joined);
const restored=save(await open(joined));
assert.deepEqual(restored,joined);
assert.deepEqual(readNetwork(restored),joinedNetwork);

app.render().undoMap();
assert.deepEqual(save(app),mainOnly);
app.render().redoMap();
assert.deepEqual(save(app),joined);

const model=productContext.network(app.render().rivers);
assert.equal(model.issues.length,0);
assert.equal(model.network.nodes.find(n=>n.id===join).kind,'confluence');
console.log(JSON.stringify({
  fixture:{seed,mode:'classic',scaleMiles:6,hexCount:hexes.length,coast},
  sourceHeight:2,outletRegionHeight:1,join,mouth,joinedNetwork,
  controls:{dryEnd:{error:dryEndError,unchanged:true}},
  exactJsonRoundTrip:true,undoRedo:true,
},null,2));
