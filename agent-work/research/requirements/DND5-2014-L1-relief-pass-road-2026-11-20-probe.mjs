import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const harnessUrl=new URL('./test/helpers/generation-harness.mjs',import.meta.url);
const harness=await fs.readFile(harnessUrl,'utf8');
const needle='resetRoadDraft, editRoadDocument';
assert.equal(harness.split(needle).length,2);
const temporary=new URL(`./test/helpers/.research-road-panel-${randomUUID()}.mjs`,import.meta.url);
await fs.writeFile(temporary,harness.replace(needle,'resetRoadDraft, roadDraftPanel, editRoadDocument'),{flag:'wx'});
const {createGenerationHarness}=await (async()=>{
  try{return await import(temporary.href);}
  finally{await fs.unlink(temporary);}
})();
const hex=(q,r)=>({q,r});
const key=({q,r})=>`${q},${r}`;
const coordinate=value=>hex(...value.split(',').map(Number));
const seed=42;
const start='0,0',pass='0,1',finish='2,1';
const path=[start,pass,'1,0','1,1',finish];
const alternate=[start,'0,-1','1,-1','1,0','1,1',finish];
const initialApp=createGenerationHarness(seed,'','en');

function fixture(){
  const data=regionFixture();
  data.version=10;
  data.generation=createGenerationState(seed);
  data.map.seas=[];
  data.map.nextSeaId=1;
  data.map.gmNotesByHexKey={};
  data.map.biomeOverrideByHexKey={};
  data.map.rivers=[];
  data.map.roads=[];
  data.map.crossings=[];
  data.map.obstacles=[];
  const hills=initialApp.geometry.BIOMES.open_hills;
  const base=data.map.regions[0];
  data.map.regions=[0,1,2].map(q=>{
    const coastRow=[-1,0,1,2].map(r=>hex(q,r));
    const poi=q===0?start:q===2?finish:null;
    return {...base,id:q+1,hexes:coastRow,centerHex:hex(q,0),anchorHex:hex(q,-1),
      targetSize:4,finalSize:4,heightLevel:2,biomeId:hills.id,biomeLabel:hills.label,
      biomePrimaryEmoji:hills.primaryEmoji,biomeSecondaryEmojis:[...hills.secondaryEmojis],
      biomeEmojiLabel:hills.primaryEmoji+hills.secondaryEmojis.join(''),
      pointsOfInterest:poi?[coordinate(poi)]:[],pointOfInterestKinds:poi?{[poi]:'village'}:{}};
  });
  data.ui.selectedHex=coordinate(start);
  return data;
}
function save(app){
  const result=JSON.parse(JSON.stringify(app.render().createSaveData()));
  delete result.savedAt;
  return result;
}
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
function changeHeight(app,selected,level,biome,expected=true){
  app.render().setSelectedHex(coordinate(selected));
  assert.equal(app.render().startRegionDraft('region_height'),true);
  const frame=app.render();
  assert.equal(frame.changeRegionDraft(frame.regionDraft,{...frame.regionDraft.edit,heightLevel:level,biomeId:biome}),true);
  assert.equal(app.render().finishRegionDraft(),expected);
}
function selector(element){
  if(Array.isArray(element)) return element.map(selector).find(Boolean);
  if(!element?.props)return;
  if(element.type==='select'&&element.props['aria-label']==='New path type')return element;
  return selector(element.props.children);
}
function beginRoad(app){
  app.render().setSelectedHex(coordinate(start));
  assert.equal(app.render().startRoadDraft(),true);
  const select=selector(app.render().roadDraftPanel);
  assert.ok(select);
  assert.equal(select.props.value,'trail');
  select.props.onChange({target:{value:'road'}});
  assert.equal(app.render().roadDraft.kind,'road');
}
function finishRoad(app,route){
  for(const step of route.slice(1))assert.equal(app.render().appendRoadDraft(coordinate(step)),true,app.render().editError);
  assert.equal(app.render().finishRoadDraft(),true,app.render().editError);
}
function assertRoad(doc,route){
  assert.equal(doc.map.roads.length,1);
  assert.deepEqual(doc.map.roads[0].segments,route.slice(1).map((to,i)=>({
    from:coordinate(route[i]),to:coordinate(to),kind:'road',
  })));
}
const app=await open(fixture());
changeHeight(app,start,3,'mountains');
changeHeight(app,finish,1,'open_plains');
const levels=save(app);
const relief=levels.map.regions.map(r=>[r.id,r.heightLevel,r.biomeId]);
assert.deepEqual(relief,[[1,3,'mountains'],[2,2,'open_hills'],[3,1,'open_plains']]);
changeHeight(app,'1,1',1,'open_plains',false);
const incompatibility=app.render().editError;
assert.match(incompatibility,/incompatib/i);
assert.deepEqual(save(app).map,levels.map);
assert.equal(app.render().resetRegionDraft(),true);
app.render().setSelectedHex(coordinate(pass));
app.render().setSelectedHexBiomeOverride('open_hills');
const marked=save(app);
assert.deepEqual(marked.map.biomeOverrideByHexKey,{[pass]:'open_hills'});
assert.deepEqual(marked.map.regions,levels.map.regions);
assert.deepEqual(marked.map.gmNotesByHexKey,{});
assert.equal(app.render().editObstacleDocument({type:'add',hex:coordinate(start),neighborHex:coordinate('1,0')}),true);
const barrier=save(app);
assert.equal(barrier.map.obstacles.length,1);
const obstacle=barrier.map.obstacles[0];

beginRoad(app);
assert.equal(app.render().appendRoadDraft(coordinate('1,0')),false);
const blocked=app.render().editError;
assert.match(blocked,/barrier/i);
assert.deepEqual(save(app).map,barrier.map);
finishRoad(app,path);
const saved=save(app);
assertRoad(saved,path);
const reopened=save(await open(saved));
assert.deepEqual(reopened,saved);
assertRoad(reopened,path);
app.render().undoMap();
assert.deepEqual(save(app).map,barrier.map);
app.render().redoMap();
assert.deepEqual(save(app).map,saved.map);

const controlled=await open(barrier);
const openPair=[pass,'1,0'].sort().join('|');
const ridge=barrier.map.regions[0].hexes,hills=barrier.map.regions[1].hexes;
const pair=(a,b)=>[key(a),key(b)].sort().join('|');
const ridgeBoundary=ridge.flatMap(a=>controlled.geometry.getHexNeighbors(a)
  .filter(b=>hills.some(h=>key(h)===key(b))).map(b=>[a,b]));
for(const [a,b] of ridgeBoundary){
  if(pair(a,b)===openPair||pair(a,b)===pair(obstacle.hex,obstacle.neighborHex))continue;
  assert.equal(controlled.render().editObstacleDocument({type:'add',hex:a,neighborHex:b}),true,controlled.render().editError);
}
const gated=save(controlled);
assert.deepEqual(ridgeBoundary.filter(([a,b])=>!gated.map.obstacles.some(o=>pair(o.hex,o.neighborHex)===pair(a,b)))
  .map(([a,b])=>[key(a),key(b)]),[[pass,'1,0']]);
beginRoad(controlled);
assert.equal(controlled.render().appendRoadDraft(coordinate('0,-1')),true);
assert.equal(controlled.render().appendRoadDraft(coordinate('1,-1')),false);
assert.match(controlled.render().editError,/barrier/i);
assert.deepEqual(save(controlled).map,gated.map);
controlled.render().resetRoadDraft();
beginRoad(controlled);
finishRoad(controlled,path);
const boundRoad=save(controlled);
assertRoad(boundRoad,path);
assert.deepEqual(save(await open(boundRoad)),boundRoad);

const choice=await open(barrier);
beginRoad(choice);
finishRoad(choice,alternate);
const highRoad=save(choice);
assertRoad(highRoad,alternate);
assert.ok(!alternate.includes(pass));
assert.deepEqual(highRoad.map.regions,saved.map.regions);
assert.deepEqual(highRoad.map.biomeOverrideByHexKey,saved.map.biomeOverrideByHexKey);

console.log(JSON.stringify({fixture:{scaleMiles:6,seed,cellsPerRegion:4,start,finish},relief,
  pass:{hex:pass,regionHeight:3,effectiveBiome:'open_hills'},
  regionalCompatibility:{rejected:incompatibility,unchanged:true},
  barrier:{hex:key(obstacle.hex),neighbor:key(obstacle.neighborHex),blocked,unchangedOnAttempt:true},
  singleGap:{boundaryEdges:ridgeBoundary.length,barrierCount:gated.map.obstacles.length,openPair,selectedRoadImportExact:true},
  traces:{selected:path,alternative:alternate,alternativeBypassesPass:true,pathKind:'road'},saveReloadExact:true,undoRedo:true,
  method:'App region, cell, obstacle and road edits in repo React harness. It exposes the original road panel to call the type selector. No browser.'
},null,2));
