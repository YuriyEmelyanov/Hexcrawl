import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from '../fix-e5-r2/test/helpers/generation-harness.mjs';
const rows=[];
for(const command of ['deleteLastRegion','regenerateLastRegion'])for(const language of ['ru','en']){
 const h=createGenerationHarness(42),g=h.geometry;h.render().setLanguage(language);h.setWindow({alert(){}});
 h.render().addFallbackTractToMap({q:0,r:0});
 const base=h.render().captureDocument().map,a={q:0,r:0},b={q:1,r:0};
 const region={...base.regions[0],hexes:[a,b],centerHex:a,anchorHex:a,finalSize:2,targetSize:2,pointsOfInterest:[],pointOfInterestKinds:{},heightLevel:1};
 h.render().restoreSnapshot({...base,regions:[region],rivers:[],roads:[],crossings:[],riverFeatures:{rapids:[],waterfalls:[]},hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),candidateHexes:g.getCandidateHexes([a,b],new Set()),nextRiverId:1,nextRoadId:1});
 h.render().addFallbackTractToMap(h.render().candidateHexes[0]);assert.equal(h.render().regions.length,2);
 const current=h.render().captureDocument().map,last=current.regions[1];
 assert.equal(h.render().history.at(-1).rivers.length,0);
 // Fixture omits generation-only river noise before the one actual UI creation.
 h.render().restoreSnapshot({...current,rivers:[],roads:[],crossings:[],riverFeatures:{rapids:[],waterfalls:[]}});
 const ctx=g.buildManualRiverGeometryContext(h.render().captureDocument().map),adj=new Map();
 for(const [edge,owners] of ctx.geometry.edgeOwners){const [u,v]=edge.split('|');for(const [x,y] of [[u,v],[v,u]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push({key:y,owners});}}
 let accepted=null,trials=0;
 outer:for(const [start,edges] of adj)for(const e of edges.filter(e=>e.owners.length===1&&e.owners[0]===last.id)){
  const queue=[[start,e.key]];
  while(queue.length){const keys=queue.shift(),end=keys.at(-1);if(keys.length>8)continue;
   const hasRetained=keys.slice(1).some((k,i)=>ctx.edgeOwners([keys[i],k].sort().join('|')).includes(region.id));
   if(hasRetained&&ctx.geometry.openVertices.has(end)){
    trials++;assert.ok(trials<=500,'bounded search');
    if(h.render().editRiverDocument({type:'create',path:keys.map(k=>ctx.vertex(k)),regionId:last.id,fullness:1})){accepted=keys;break outer;}
   }
   if(keys.length<8)for(const next of adj.get(end)??[])if(!keys.includes(next.key))queue.push([...keys,next.key]);
  }
 }
 assert.ok(accepted,'valid actual path starts in last region and touches retained region');
 h.render().undoMap();h.render().setEditMode(true);assert.equal(h.render().startRiverDraft(),true);
 for(const key of accepted)assert.equal(h.render().appendRiverDraft(key),true);
 assert.equal(h.render().finishRiverDraft(),true);
 if(h.render().riverCommandPreview)assert.equal(h.render().confirmRiverCommand(h.render().riverCommandPreview),true);
 const river=h.render().rivers.at(-1);assert.equal(river.regionId,last.id);
 assert.ok(river.sectors.some(s=>s.assignedRegionId===region.id),'accepted river changes retained region');
 h.geometry.assertHexcrawlSaveData(h.render().createSaveData());
 h.render().setSelectedHex(region.centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();
 const before=structuredClone(h.render().captureDocument()),stacks=structuredClone([h.render().undoHistory,h.render().redoHistory]),dialogs=[];
 assert.ok(stacks[0].length&&stacks[1].length);
 h.setWindow({alert(){},confirm:m=>{dialogs.push(m);return false;}});h.render()[command]();
 const same=(a,b)=>{try{assert.deepEqual(a,b);return true;}catch{return false;}};
 rows.push({command,language,actual_UI_create_and_finish:true,checkpoint_river_count:0,current_owner:last.id,retained_owner:region.id,retained_sector_count:river.sectors.filter(s=>s.assignedRegionId===region.id).length,path_vertices:accepted.length,bounded_search_trials:trials,prompt_count:dialogs.length,reject_exact_document:same(structuredClone(h.render().captureDocument()),before),reject_exact_stacks:same(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks),river_removed:!h.render().rivers.some(r=>r.id===river.id),pending_regeneration:!!h.render().pendingRegen});
}
fs.writeFileSync(new URL('./old-R3-probe.json',import.meta.url),JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));
