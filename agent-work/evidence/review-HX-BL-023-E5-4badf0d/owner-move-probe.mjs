import assert from 'node:assert/strict';
import fs from 'node:fs';
const old=await import('../review-e5-8b98266/test/helpers/generation-harness.mjs');
const fixed=await import('../fix-e5-r1/test/helpers/generation-harness.mjs');
const norm=v=>JSON.parse(JSON.stringify(v,(_k,x)=>x instanceof Map?{__map:[...x]}:x instanceof Set?{__set:[...x]}:x));
const save=h=>{const s=norm(h.render().createSaveData());delete s.savedAt;return s};
function fixture(create,language,kind='deleted'){
 const h=create(42),g=h.geometry;h.render().setLanguage(language);h.setWindow({alert(){},matchMedia:()=>({matches:false})});
 h.render().addFallbackTractToMap({q:0,r:0});
 const base=h.render().captureDocument().map,a={q:0,r:0},b={q:1,r:0},r={...base.regions[0],hexes:[a,b],centerHex:a,anchorHex:a,finalSize:2,targetSize:2,pointsOfInterest:[],pointOfInterestKinds:{},heightLevel:1};
 const other=new Set(g.getHexCornerPoints(b).map(v=>v.key)),path=g.getHexCornerPoints(a).filter(v=>other.has(v.key));
 h.render().restoreSnapshot({...base,regions:[r],rivers:[],roads:[],crossings:[],hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),candidateHexes:g.getCandidateHexes([a,b],new Set()),nextRiverId:1,nextRoadId:1});
 assert.equal(h.render().editRiverDocument({type:'create',regionId:r.id,path,fullness:2}),true);const id=h.render().rivers[0].id;
 h.render().addFallbackTractToMap(h.render().candidateHexes[0]);assert.equal(h.render().regions.length,2);assert.ok(h.render().history.at(-1).rivers.some(r=>r.id===id));
 if(kind==='deleted')assert.equal(h.render().editRiverDocument({type:'remove',riverId:id,includeArms:true},{confirmed:true}),true);
 if(kind==='feature')assert.equal(h.render().editRiverFeatures([{type:'rapid',riverId:id,edgeKey:path.map(v=>v.key).sort().join('|'),state:'off'}]),true);
 // Create a real, nonempty redo branch before rejecting the destructive action.
 h.render().setSelectedHex(r.centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();assert.ok(h.render().redoHistory.length>0);
 if(kind==='unchanged'){const m=h.render().captureDocument().map,checkpoint=h.render().history.at(-1);h.render().restoreSnapshot({...m,rivers:checkpoint.rivers,riverFeatures:checkpoint.riverFeatures});}
 return {h,id};
}

const findings=[];
for(const command of ['deleteLastRegion','regenerateLastRegion'])for(const language of ['ru','en']){
 const {h,id}=fixture(fixed.createGenerationHarness,language,'relocate');const region=h.render().regions[1],g=h.geometry;
 let accepted=null;const priorOwner=h.render().rivers.find(r=>r.id===id).regionId;
 for(const hex of region.hexes){const corners=g.getHexCornerPoints(hex);for(let i=0;i<corners.length;i++){
  const path=[corners[i],corners[(i+1)%corners.length]];
  const ok=h.render().editRiverDocument({type:'replace',riverId:id,path,regionId:region.id,fullness:2},{confirmed:true});
  if(ok&&h.render().rivers.find(r=>r.id===id).regionId===region.id){accepted=path;break;}
 }if(accepted)break;}
 assert.ok(accepted,'accepted replacement moves river owner to last region');
 h.render().undoMap();assert.equal(h.render().rivers.find(r=>r.id===id).regionId,priorOwner);
 h.render().setEditMode(true);assert.equal(h.render().startRiverDraft(id),true);
 for(const v of accepted)assert.equal(h.render().appendRiverDraft(v.key),true);
 h.render().finishRiverDraft();assert.ok(h.render().riverCommandPreview,'actual Finish opens confirmation preview');
 assert.equal(h.render().riverPreviewPlan.plan.map.rivers.find(r=>r.id===id).regionId,region.id);
 assert.equal(h.render().confirmRiverCommand(h.render().riverCommandPreview),true);
 assert.equal(h.render().rivers.find(r=>r.id===id).regionId,region.id);
 h.render().setSelectedHex(h.render().regions[0].centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();assert.ok(h.render().redoHistory.length>0);
 const beforeStacks=norm([h.render().undoHistory,h.render().redoHistory]);
 const before=norm(h.render().captureDocument()),dialogs=[];h.setWindow({alert(){},confirm:m=>{dialogs.push(m);return false}});h.render()[command]();
 const afterStacks=norm([h.render().undoHistory,h.render().redoHistory]);const out={language,pending_regeneration:!!h.render().pendingRegen,via_actual_UI_draft_and_confirm_handlers:true,undo_length_before:beforeStacks[0].length,redo_length_before:beforeStacks[1].length,stacks_unchanged:JSON.stringify(afterStacks)===JSON.stringify(beforeStacks),command,priorOwner,editedOwner:region.id,dialog_count:dialogs.length,document_unchanged:JSON.stringify(norm(h.render().captureDocument()))===JSON.stringify(before),checkpoint_original_restored:JSON.stringify(h.render().rivers.find(r=>r.id===id).vertexPath)===JSON.stringify(before.generationHistory.at(-1).rivers.find(r=>r.id===id).vertexPath)};
 findings.push(out);
}
fs.writeFileSync(new URL('./owner-move-probe.json',import.meta.url),JSON.stringify(findings,null,2));console.log(JSON.stringify(findings,null,2));

