import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const hex=(q,r)=>({q,r});
const key=({q,r})=>`${q},${r}`;
const coordinate=value=>hex(...value.split(',').map(Number));
const seed=42;
const start='0,0',finish='2,1';
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
  const plains=initialApp.geometry.BIOMES.open_plains;
  const base=data.map.regions[0];
  data.map.regions=[0,1,2].map(q=>{
    const coastRow=[-1,0,1,2].map(r=>hex(q,r));
    const poi=q===0?start:q===2?finish:null;
    return {...base,id:q+1,hexes:coastRow,centerHex:hex(q,0),anchorHex:hex(q,-1),
      targetSize:4,finalSize:4,heightLevel:1,biomeId:plains.id,biomeLabel:plains.label,
      biomePrimaryEmoji:plains.primaryEmoji,biomeSecondaryEmojis:[...plains.secondaryEmojis],
      biomeEmojiLabel:plains.primaryEmoji+plains.secondaryEmojis.join(''),
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

const app=await open(fixture());
const original=save(app);
changeHeight(app,'1,0',2,'open_hills');
changeHeight(app,start,3,'mountains');
const shaped=save(app);
const terrain=doc=>doc.map.regions.map(r=>[r.heightLevel,r.biomeId]);
assert.deepEqual(terrain(shaped),[[3,'mountains'],[2,'open_hills'],[1,'open_plains']]);
assert.deepEqual(shaped.map.regions[2],original.map.regions[2]);
for(const r of [-1,0,1,2]){
  for(const [q,region] of shaped.map.regions.entries()){
    assert.ok(region.hexes.some(h=>h.q===q && h.r===r));
  }
}
app.render().setSelectedHex(hex(1,1));
app.render().setSelectedHexBiomeOverride('hilly_woodland');
const edited=save(app);
const expected=structuredClone(shaped.map);
expected.biomeOverrideByHexKey={'1,1':'hilly_woodland'};
assert.deepEqual(edited.map,expected);
assert.deepEqual(save(await open(edited)).map,expected);
app.render().undoMap();
assert.deepEqual(save(app).map,shaped.map);
app.render().redoMap();
assert.deepEqual(save(app).map,expected);
console.log(JSON.stringify({mode:'classic',miles:6,seed,relief:terrain(shaped),edited:'1,1',override:edited.map.biomeOverrideByHexKey,unchanged_other_hexes:11,unchanged_plain:true,map_roundtrip:true,undo:true,redo:true}));
