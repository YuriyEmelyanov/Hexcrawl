import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const seed=42;
const key=({q,r})=>`${q},${r}`;
const coord=value=>{
  const [q,r]=value.split(',').map(Number);
  return {q,r};
};
const footprint=[];
for(let q=-4;q<=4;q++){
  for(let r=-4;r<=4;r++){
    if(Math.abs(q+r)<=4)footprint.push({q,r});
  }
}

const fixture=regionFixture();
fixture.version=10;
fixture.generation=createGenerationState(seed);
fixture.map.seas=[];
fixture.map.nextSeaId=1;
fixture.map.gmNotesByHexKey={};
fixture.map.biomeOverrideByHexKey={};
fixture.map.regions=[{
  ...fixture.map.regions[0],hexes:footprint,centerHex:coord('0,0'),
  anchorHex:coord('1,0'),targetSize:61,finalSize:61,sizeCategory:'vast_land',sizeLabel:'Обширный край',
  pointsOfInterest:[],pointOfInterestKinds:{},
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
const owner=hex=>`poi:1:${hex}`;
const sites=[
  {hex:'-2,0',kind:'lair',name:'Ash Lair',note:'Two cave dwellers shelter by the south opening.'},
  {hex:'2,0',kind:'lair',name:'Reed Lair',note:'One resident tends the reed beds.'},
  {hex:'0,2',kind:'ruins',name:'Broken Gate'},
  {hex:'0,-2',kind:'tower',name:'West Watch'},
];
const app=await open(fixture);
for(const site of sites){
  app.render().setSelectedHex(coord(site.hex));
  app.render().setSelectedPoiKind(site.kind);
  assert.equal(save(app).map.regions[0].pointOfInterestKinds[site.hex],site.kind);
  assert.ok(app.render().nameTargets.some(item=>item.key===owner(site.hex)));
  app.render().showNameTarget(owner(site.hex));
  app.render().changeNameDraft(site.name,app.render().nameDraft);
  assert.equal(app.render().saveNameDraft(),true);
  if(site.note){
    app.render().openNotesEditor(site.hex);
    app.render().changeNotesText(site.hex,site.note);
    app.render().finishNotesGroup();
  }
}

function verifySites(doc,addresses){
  const region=doc.map.regions[0];
  assert.equal(region.hexes.length,61);
  assert.equal(region.pointsOfInterest.length,sites.length);
  assert.equal(new Set(region.pointsOfInterest.map(key)).size,sites.length);
  for(const [i,site] of sites.entries()){
    const address=addresses[i];
    assert.ok(region.pointsOfInterest.some(h=>key(h)===address));
    assert.equal(region.pointOfInterestKinds[address],site.kind);
    assert.equal(doc.map.editorNames[owner(address)].en,site.name);
  }
  assert.deepEqual(doc.map.gmNotesByHexKey,Object.fromEntries(sites.filter(x=>x.note).map(x=>[x.hex,x.note])));
  assert.equal(doc.map.knave,undefined);
  assert.deepEqual(doc.map.tags.instances,[]);
}

const before=save(app);
const addresses=sites.map(x=>x.hex);
const region=before.map.regions[0];
const line=region.hexes.filter(h=>h.r===0).sort((a,b)=>a.q-b.q);
const first=line[0],next=line[1],last=line.at(-1);
const x=h=>app.geometry.toPixel(h.q,h.r).x;
assert.equal(line.length,9);
const measured=(x(last)-x(first))/(x(next)-x(first))*6;
assert.ok(Math.abs(measured-48)<1e-8);
verifySites(before,addresses);
assert.deepEqual(save(await open(before)),before);

const start=sites[0].hex,occupied=sites[1].hex,destination='-3,1';
app.render().setSelectedHex(coord(start));
assert.equal(app.render().startPoiDraft({kind:'land',regionId:1,hexKey:start}),true);
assert.equal(app.render().changePoiTarget('2','0'),true);
assert.equal(app.render().finishPoiDraft(),false);
const duplicate=app.render().editError;
assert.match(duplicate,/already has a point/i);
assert.deepEqual(save(app).map,before.map);
assert.equal(app.render().changePoiTarget('-3','1'),true);
assert.equal(app.render().finishPoiDraft(),true);
const moved=save(app);
const newAddresses=[destination,...addresses.slice(1)];
verifySites(moved,newAddresses);
assert.equal(moved.map.regions[0].pointOfInterestKinds[start],undefined);
assert.equal(moved.map.editorNames[owner(start)],undefined);
assert.equal(moved.map.gmNotesByHexKey[destination],undefined);
assert.deepEqual(save(await open(moved)),moved);
app.render().undoMap();
assert.deepEqual(save(app).map,before.map);
app.render().redoMap();
assert.deepEqual(save(app).map,moved.map);

console.log(JSON.stringify({
  fixture:{seed,profile:'Classic',hexes:61,stepMiles:6,axis:'r=0',first:key(first),last:key(last),centerIntervals:8,centerSpanMiles:Math.round(measured)},
  initial:sites.map(({hex,kind,name})=>({hex,kind,name})),
  move:{start,destination,otherLair:occupied,bothNamesIndependent:true,oldDetailInOriginalHex:true,newHexHasNoNote:true},
  representation:{names:'editorNames[poi:region:q,r]',notes:'gmNotesByHexKey[q,r]',classicLinkedOccupantRecord:false},
  occupiedTarget:{error:duplicate,mapUnchanged:true},saveReloadExact:true,undoRedo:true,
},null,2));
