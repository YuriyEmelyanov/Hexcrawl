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
  const data=regionFixture('mythic');
  data.version=10;
  data.generation=createGenerationState(42);
  data.map.seas=[];
  data.map.nextSeaId=1;
  data.map.regions[0].pointsOfInterest=[{q:1,r:0},{q:2,r:0}];
  data.map.regions[0].pointOfInterestKinds={'1,0':'city','2,0':'village'};
  data.map.gmNotesByHexKey={'2,0':'Village retained note'};
  data.map.editorNames={'poi:1:1,0':{ru:'Город C',en:'City C'},'poi:1:2,0':{ru:'Деревня V',en:'Village V'}};
  // The supported kingdom record is a render control for a boundary, not a D&D political editor.
  data.map.kingdoms[0].name={ru:'Граница P',en:'Boundary P'};
  async function open(doc){
    const h=createGenerationHarness(42,'','en');
    h.render();
    h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});
    h.injectFunction('readTextFile',async f=>f.text);
    await h.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
    return h;
  }
  function svg(h){return renderToStaticMarkup(React.createElement('svg',null,h.render().mapArtwork));}
  function observe(h){
    const art=svg(h),save=JSON.parse(JSON.stringify(h.render().createSaveData()));
    const boundary=art.match(/<g class="kingdom-boundaries"[^>]*>(.*?)<\/g>/)?.[1]??'';
    return {scale:save.ui.mapScale,city:art.includes('data-engraved-poi="1,0"'),village:art.includes('data-engraved-poi="2,0"'),boundaryLines:(boundary.match(/<line\b/g)??[]).length,map:save.map};
  }
  const h=await open(data),baseline=observe(h),states=[];
  assert.equal(baseline.city,true);
  assert.equal(baseline.village,true);
  assert.ok(baseline.boundaryLines>0);
  for(const scale of [1,.2,6,1]){
    assert.ok(Math.abs(h.render().applyMapScale(scale)-scale)<1e-12);
    const curr=observe(h);
    assert.ok(Math.abs(curr.scale-scale)<1e-12);
    assert.equal(curr.city,true);
    assert.equal(curr.village,true);
    assert.equal(curr.boundaryLines,baseline.boundaryLines);
    assert.deepEqual(curr.map,baseline.map);
    const {map,...observed}=curr;
    states.push(observed);
  }
  h.render().applyMapScale(.2);
  const snapshot=JSON.parse(JSON.stringify(h.render().createSaveData()));
  const reloaded=await open(snapshot),after=observe(reloaded);
  assert.ok(Math.abs(after.scale-.2)<1e-12);
  assert.deepEqual(after.map,baseline.map);
  assert.equal(after.city,true);
  assert.equal(after.village,true);
  assert.equal(after.boundaryLines,baseline.boundaryLines);
  const controls=renderToStaticMarkup(h.render().displayToolbar);
  assert.match(controls,/data-fine-step/);
  assert.match(controls,/hex-coordinate-toggle/);
  assert.doesNotMatch(controls,/Points of interest|Show points of interest|overview/i);
  console.log(JSON.stringify({states,reloaded:{scale:after.scale,city:after.city,village:after.village,boundaryLines:after.boundaryLines},villageRecord:{kind:after.map.regions[0].pointOfInterestKinds['2,0'],name:after.map.editorNames['poi:1:2,0'].en,note:after.map.gmNotesByHexKey['2,0']},displayControls:{rotate:true,coordinates:true,hexSize:true,globalPoiToggleInDisplayToolbar:false,selectiveOverviewInDisplayToolbar:false},methods:['real App camera state & serializer','server-rendered coarse POI and kingdom boundary layers and display toolbar','terrain-decoration components stubbed, no DOM raster or browser interaction']}));
} finally{
  fs.unlinkSync(generatedUrl);
}
