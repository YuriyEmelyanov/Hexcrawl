import fs from 'node:fs';
import React from 'react';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {createGenerationState} from './src/worldRandom.ts';

const src=new URL('./src/App.tsx',import.meta.url);
const appSource=fs.readFileSync(src,'utf8');
const tree=ts.createSourceFile('App.tsx',appSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let toolbar;
function findToolbar(node){
  if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(a=>
    ts.isJsxAttribute(a)&&a.name.getText(tree)==='className'&&
    a.initializer&&ts.isStringLiteral(a.initializer)&&
    a.initializer.text==='control-block controls controls--display')) toolbar=node.getText(tree);
  ts.forEachChild(node,findToolbar);
}
findToolbar(tree);
assert.ok(toolbar);
const harnessUrl=new URL('./test/helpers/generation-harness.mjs',import.meta.url);
const generatedUrl=new URL('./test/helpers/research-map-overview.generated.mjs',import.meta.url);
let harness=fs.readFileSync(harnessUrl,'utf8');
function replaceOnce(from,to){
  assert.equal(harness.split(from).length,2,from);
  harness=harness.replace(from,()=>to);
}
replaceOnce("['mapArtwork','fineArtwork','coarseTextures']","['fineArtwork']");
replaceOnce('return {\n  fineDraft','return {\n  mapArtwork, applyMapScale, displayToolbar: '+toolbar.replace(/[\x60\\]|\$\{/g, token=>'\\'+token)+',\n  fineDraft');
replaceOnce("name==='./rendering/LakeWater'?", "name==='./rendering/EngravedTerrain'?{Engraving:()=>null,EngravingLoading:()=>null}:name==='./rendering/ColorHexGrid'?{ColorHexGrid:()=>null}:name==='./rendering/terrainBlend'?{terrainTextures:()=>new Map()}:name==='./rendering/LakeWater'?");
fs.writeFileSync(generatedUrl,harness,{flag:'wx'});
try{
  const {createGenerationHarness}=await import(generatedUrl.href);
  const data=regionFixture();
  data.version=10;
  data.generation=createGenerationState(42);
  data.map.seas=[]; data.map.nextSeaId=1;
  const r=data.map.regions[0];
  r.hexes.push({q:2,r:-1}); r.finalSize=r.hexes.length;
  r.pointsOfInterest=[{q:1,r:0},{q:2,r:0},{q:2,r:-1}];
  r.pointOfInterestKinds={'1,0':'city','2,0':'village','2,-1':'obelisk'};
  const labels={'1,0':'City C','2,0':'Hamlet H','2,-1':'Pass P'};
  data.map.gmNotesByHexKey={'2,0':'Hamlet retained detail'};
  data.map.editorNames=Object.fromEntries(Object.entries(labels).map(([key,en])=>['poi:1:'+key,{ru:en,en}]));
  async function open(doc){
    const h=createGenerationHarness(42,'','en');
    h.render();
    h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});
    h.injectFunction('readTextFile',async f=>f.text);
    await h.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
    return h;
  }
  function svg(h){return renderToStaticMarkup(React.createElement('svg',null,h.render().mapArtwork));}
  const marks=h=>[...svg(h).matchAll(/data-engraved-poi="([^"]+)"/g)].map(m=>m[1]).sort();
  const save=h=>JSON.parse(JSON.stringify(h.render().createSaveData()));
  const app=await open(data), original=save(app), all=Object.keys(labels).sort(), states=[];
  for(const zoom of [1,.2,6,1]){
    app.render().applyMapScale(zoom);
    assert.deepEqual(marks(app),all);
    assert.deepEqual(save(app).map,original.map);
    states.push({zoom,markers:marks(app)});
  }
  app.render().applyMapScale(.2);
  const restored=await open(save(app));
  assert.deepEqual(marks(restored),all);
  assert.deepEqual(save(restored).map,original.map);
  assert.ok(Math.abs(save(restored).ui.mapScale-.2)<1e-12);
  const controls=renderToStaticMarkup(restored.render().displayToolbar);
  assert.match(controls,/hex-coordinate-toggle/);
  assert.match(controls,/data-fine-step/);
  restored.render().setEditMode(true);
  restored.render().setSelectedHex({q:2,r:0});
  restored.render().deleteSelectedPoi();
  const refusal=restored.render().editError;
  assert.ok(refusal);
  assert.deepEqual(save(restored).map,original.map);
  const unsigned=structuredClone(original);
  delete unsigned.map.editorNames['poi:1:2,0'];
  const control=await open(unsigned);
  const unsignedMap=save(control).map;
  control.render().setEditMode(true);
  control.render().setSelectedHex({q:2,r:0});
  control.render().deleteSelectedPoi();
  const removed=await open(save(control));
  assert.deepEqual(marks(removed),['1,0','2,-1']);
  assert.equal(save(removed).map.regions[0].pointOfInterestKinds['2,0'],undefined);
  assert.notDeepEqual(save(removed).map,original.map);
  control.render().undoMap();
  assert.deepEqual(marks(control),all);
  assert.deepEqual(save(control).map,unsignedMap);
  console.log(JSON.stringify({states,afterImport:marks(await open(original)),afterDeletionAndImport:marks(removed),undoRestoresAll:true,refusal,controls}));
} finally { fs.unlinkSync(generatedUrl); }
