// Run as a temporary .mjs file in the product checkout's test directory.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {prepareGeometryPlan} from '../src/geometryPlan.ts';
import {projectOneMile} from '../src/oneMile.ts';
import {detailSourcePixelToWorld} from '../src/detailGeography.ts';
import {buildNaturalLakes} from '../src/rendering/lakeGeometry.ts';
import {prepareAutomaticSceneCandidate} from '../src/automaticOneMileScene.ts';
import {prepareRefinementWater,refinementWaterContains} from '../src/geometryRefinementWater.ts';
import {refinedRouteBends} from '../src/refinedRouteBends.ts';
async function accepted(){
 const h=createGenerationHarness(42);h.render();h.guardRandom();h.setWindow({alert:()=>{},matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
 await h.render().handleImportJson({target:{files:[{text:fs.readFileSync(new URL('fixtures/road-entry-zigzags.json',import.meta.url),'utf8')}],value:'map'}});
 const map=h.render().captureDocument().map,origin={x:0,y:0},marks=h.geometry.regionMarkKeys(map),hydrology=h.geometry.buildRegionRiverNetwork(map.rivers,map.rivers,map.regions,map.candidateHexes,map.hexTerrainByKey,true);
 const riverInput={rivers:map.rivers,marks,origin,cells:projectOneMile(h.geometry.oneMileSources(map)).map(c=>c.cell),seed:423493684};
 const widths=new Map([1,2,3,4,5].map(f=>[f,detailSourcePixelToWorld({x:h.geometry.getRiverWidth(h.geometry.getHexWidth(28),f),y:0}).x]));
 const lakeInputs=h.geometry.getLakesForRegions(map.regions,map.hexTerrainByKey).map(l=>({lakeId:l.lakeId,cells:[...l.hexes],colorPath:buildNaturalLakes(l.hexes.map(c=>({...c,...h.geometry.toPixel(c.q,c.r),lakeId:l.lakeId})),28,map.toponymSeed,[])[0].path,colorScale:detailSourcePixelToWorld({x:1,y:0}).x,origin}));
 const input={map,liveRivers:h.geometry.detailMapRiverGeometry(map,origin),marks,origin,landCells:map.regions.flatMap(r=>r.hexes).filter(c=>!['lake','sea'].includes(map.hexTerrainByKey.get(`${c.q},${c.r}`)?.terrainOverride)),riverInput,riverContext:{hydrology,candidates:map.candidateHexes},widths,lakeInputs};
 const result=prepareGeometryPlan(input);assert.equal(result.status,'prepared');
 return {input,result};
}


const {input,result}=await accepted(),g=result.geometryRefinement;
 const owner=g.sourceState.poiFootprints.find(f=>f.poiId==='detail-poi:7'),edge=g.riverPlan.source.segments.find(s=>s.riverId===3&&s.edgeKey==='-218.238,154|-242.487,140');
 const knownMap={...input.map,physicalGrid:{...g.sourceState,poiFootprints:g.sourceState.poiFootprints.map(f=>f===owner?{...f,attachments:[...f.attachments,{kind:'water',waterKind:'river',waterId:'river:3',segmentId:edge.edgeKey,contact:edge.from.point}]}:f)},knave:{content:{byPoi:{[owner.legacyRef]:{site:{table:'structures',sourceRow:96}}}}}};
 const knownInput={...input,map:knownMap,scopePolicy:'automatic_presentation'},display=prepareAutomaticSceneCandidate(knownInput),move=display.geometryRefinement.pois.pois.find(p=>p.poiId===owner.poiId);
 assert.ok(move);const visible=prepareRefinementWater({paths:display.geometryRefinement.riverPlan.paths,widthByFullness:new Map([1,2,3,4,5].map(f=>[f,f/10]))});
 assert.ok(Math.abs(refinementWaterContains(visible,move.contact.point).clearance)<1e-7,'required POI contacts visible one-mile bank, not the wider physical source bank');
const R=display.geometryRefinement; const curved=refinedRouteBends(R.riverPlan.source,R);

const point=move.contact.point;
const approach=R.roads.roads.find(r=>r.linkedPoiIds.includes(owner.poiId));
assert(approach);
const gapMiles=refinementWaterContains(curved.displayWater,point).clearance;
console.log(JSON.stringify({poi:owner.poiId,river:move.contact.riverId,road:approach.roadId,gapMiles},null,2));
assert(Math.abs(gapMiles)<1e-7,'The painted bank must meet its required POI');
