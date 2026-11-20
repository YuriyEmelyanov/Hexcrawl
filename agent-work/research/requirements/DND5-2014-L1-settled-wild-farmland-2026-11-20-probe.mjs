import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

const harnessUrl=new URL('./test/helpers/generation-harness.mjs',import.meta.url);
const source=await fs.readFile(harnessUrl,'utf8');
const needle='setGenSizeCategory, applyWorldSeed';
assert.equal(source.split(needle).length,2);
const temporary=new URL(`./test/helpers/.research-settlement-${randomUUID()}.mjs`,import.meta.url);
await fs.writeFile(temporary,source.replace(needle,'setGenSizeCategory, setGenLandType, setGenCoastal, applyWorldSeed'),{flag:'wx'});
const {createGenerationHarness}=await (async()=>{
  try {return await import(temporary.href);}
  finally {await fs.unlink(temporary);}
})();
const seed=42;
const hexKey=({q,r})=>`${q},${r}`;
function setup(){
  const app=createGenerationHarness(seed,'','en');
  app.render();
  app.setWindow({alert:message=>{throw Error(message);}});
  app.injectFunction('readTextFile',async file=>file.text);
  return app;
}
function save(app){
  const data=JSON.parse(JSON.stringify(app.render().createSaveData()));
  delete data.savedAt;
  return data;
}
function generate(app,type,hex){
  app.render().setGenSizeCategory('small_region');
  app.render().setGenCoastal('mainland');
  app.render().setGenLandType(type);
  app.render().generateAt(hex);
  const last=save(app).map.regions.at(-1);
  assert.equal(last.biomeLandType,type);
  return last;
}
const app=setup();
const settled=generate(app,'settled',{q:0,r:0});
const anchor={q:0,r:2};
assert.ok(app.render().candidateHexes.some(h=>hexKey(h)===hexKey(anchor)));
const wild=generate(app,'wild',anchor);
assert.equal(settled.hexes.length,17);
assert.equal(wild.hexes.length,17);
assert.equal(settled.id,1);
assert.equal(wild.id,2);
assert.equal(hexKey(settled.centerHex),'-1,0');
assert.equal(hexKey(wild.centerHex),'0,3');

const generated=save(app);
function describe(region){
  return {id:region.id,type:region.biomeLandType,cells:region.hexes.length,
    center:hexKey(region.centerHex),centralKind:region.centralPoiKind,
    otherPoints:region.pointOfInterestKinds};
}
const initial=generated.map.regions.map(describe);
assert.deepEqual(initial,[
  {id:1,type:'settled',cells:17,center:'-1,0',centralKind:'town',otherPoints:{'1,0':'village','0,0':'holy_place','0,1':'hut'}},
  {id:2,type:'wild',cells:17,center:'0,3',centralKind:'lair',otherPoints:{'0,2':'ruins','-2,3':'tower','0,5':'statue'}},
]);

function hex(key){
  const [q,r]=key.split(',').map(Number);
  return {q,r};
}
function distance(a,b){
  const {q,r}=hex(a),other=hex(b);
  const dq=q-other.q,dr=r-other.r;
  return Math.max(Math.abs(dq),Math.abs(dr),Math.abs(dq+dr));
}
function place(key,kind){
  app.render().setSelectedHex(hex(key));
  app.render().setSelectedPoiKind(kind);
}
const farm='-2,0',pasture='1,1',village='1,0',destination='2,-1';
app.render().setEditMode(true);
app.render().setSelectedHex(settled.centerHex);
app.render().setSelectedCentralPoiKind('city');
place(farm,'farm');
place(pasture,'pasture');
const authored=save(app);
assert.equal(authored.map.regions[0].centralPoiKind,'city');
assert.equal(authored.map.regions[0].pointOfInterestKinds[village],'village');
assert.equal(authored.map.regions[0].pointOfInterestKinds[farm],'farm');
assert.equal(authored.map.regions[0].pointOfInterestKinds[pasture],'pasture');
assert.equal(distance(farm,hexKey(settled.centerHex)),1);
assert.equal(distance(pasture,village),1);
assert.deepEqual(authored.map.regions[1],generated.map.regions[1]);
assert.deepEqual(authored.map.terrainByHexKey,generated.map.terrainByHexKey);
assert.deepEqual(authored.map.biomeOverrideByHexKey,generated.map.biomeOverrideByHexKey);
assert.deepEqual(authored.generation,generated.generation);

async function verifyImport(expected){
  const reopened=setup();
  await reopened.render().handleImportJson({target:{files:[{text:JSON.stringify(expected)}],value:''}});
  assert.deepEqual(save(reopened),expected);
}
await verifyImport(authored);

app.render().setSelectedHex(hex(farm));
assert.equal(app.render().startPoiDraft({kind:'land',regionId:settled.id,hexKey:farm}),true,app.render().editError);
const {q,r}=hex(destination);
assert.equal(app.render().changePoiTarget(String(q),String(r)),true);
assert.equal(app.render().finishPoiDraft(),true,app.render().editError);
const moved=save(app);
assert.equal(moved.map.regions[0].pointOfInterestKinds[destination],'farm');
assert.equal(moved.map.regions[0].pointOfInterestKinds[farm],undefined);
assert.equal(distance(destination,hexKey(settled.centerHex)),3);
assert.equal(moved.map.regions[0].centralPoiKind,'city');
assert.equal(moved.map.regions[0].pointOfInterestKinds[village],'village');
assert.deepEqual(moved.map.regions[1],authored.map.regions[1]);
await verifyImport(moved);
app.render().undoMap();
assert.deepEqual(save(app).map,authored.map);
app.render().redoMap();
assert.deepEqual(save(app).map,moved.map);

app.render().setSelectedHex(hex('-1,3'));
place('-1,3','farm');
const farmInWild=save(app);
assert.equal(farmInWild.map.regions[1].pointOfInterestKinds['-1,3'],'farm');
assert.equal(farmInWild.map.regions[1].biomeLandType,'wild');
app.render().undoMap();
assert.deepEqual(save(app).map,moved.map);
console.log(JSON.stringify({fixture:{seed,regionSizeControl:'small_region',coastControl:'mainland',scaleMiles:6,anchors:['0,0','0,2']},initial,
  authored:{settlements:{'-1,0':'city','1,0':'village'},farm:{key:farm,distanceFromCity:1},pasture:{key:pasture,distanceFromVillage:1},waterAndBiomeUnchanged:true},
  moved:{farmKey:destination,distanceFromCity:3,bothSettlementsRetained:true},manualFarmInWild:{key:'-1,3',landType:'wild'},
  saveReloadExact:true,undoRedo:true,method:'App Classic generation and manual POI callbacks, JSON save and import. Existing React harness exposes two additional original form setters. No browser.'
},null,2));
