import assert from 'node:assert/strict';
import fs from 'node:fs';
const oldR1=await import('../review-e5-8b98266/test/helpers/generation-harness.mjs');
const oldR2=await import('../fix-e5-r1/test/helpers/generation-harness.mjs');
const current=await import('../fix-e5-r2/test/helpers/generation-harness.mjs');
const clone=v=>structuredClone(v);
const save=h=>{const s=clone(h.render().createSaveData());delete s.savedAt;return s};
function fixture(create,language,kind){
 const h=create(42),g=h.geometry;h.render().setLanguage(language);h.setWindow({alert(){},matchMedia:()=>({matches:false})});
 h.render().addFallbackTractToMap({q:0,r:0});
 const base=h.render().captureDocument().map,a={q:0,r:0},b={q:1,r:0};
 const region={...base.regions[0],hexes:[a,b],centerHex:a,anchorHex:a,finalSize:2,targetSize:2,pointsOfInterest:[],pointOfInterestKinds:{},heightLevel:1};
 const other=new Set(g.getHexCornerPoints(b).map(v=>v.key)),path=g.getHexCornerPoints(a).filter(v=>other.has(v.key));
 h.render().restoreSnapshot({...base,regions:[region],rivers:[],roads:[],crossings:[],hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),candidateHexes:g.getCandidateHexes([a,b],new Set()),nextRiverId:1,nextRoadId:1});
 assert.equal(h.render().editRiverDocument({type:'create',regionId:region.id,path,fullness:2}),true);
 const id=h.render().rivers[0].id;
 h.render().addFallbackTractToMap(h.render().candidateHexes[0]);assert.equal(h.render().regions.length,2);
 assert.ok(h.render().history.at(-1).rivers.some(r=>r.id===id));
 if(kind==='deleted')assert.equal(h.render().editRiverDocument({type:'remove',riverId:id,includeArms:true},{confirmed:true}),true);
 if(kind==='moved'||kind==='new-last-region'){
  const last=h.render().regions[1];let found;
  for(const hex of last.hexes){const vs=g.getHexCornerPoints(hex);for(let i=0;i<vs.length;i++){
   const candidate=[vs[i],vs[(i+1)%vs.length]];
   if(h.render().editRiverDocument({type:'replace',riverId:id,path:candidate,regionId:region.id,fullness:2},{confirmed:true})&&h.render().rivers.find(r=>r.id===id).regionId===last.id){found=candidate;break;}
  }if(found)break;}
  assert.ok(found);h.render().undoMap();
  if(kind==='moved'){
   h.render().setEditMode(true);assert.equal(h.render().startRiverDraft(id),true);
   for(const v of found)assert.equal(h.render().appendRiverDraft(v.key),true);
   h.render().finishRiverDraft();assert.ok(h.render().riverCommandPreview);
   assert.equal(h.render().confirmRiverCommand(h.render().riverCommandPreview),true);
   assert.equal(h.render().rivers.find(r=>r.id===id).regionId,last.id);
  }else{
   let created=false;for(const hex of last.hexes){const vs=g.getHexCornerPoints(hex);for(let i=0;i<vs.length;i++){
    if(h.render().editRiverDocument({type:'create',path:[vs[i],vs[(i+1)%vs.length]],regionId:last.id,fullness:1})){created=true;break;}
   }if(created)break;}assert.ok(created);
  }
 }
 if(kind==='unchanged'||kind==='new-last-region'){
  const map=h.render().captureDocument().map,cp=h.render().history.at(-1);
  h.render().restoreSnapshot({...map,rivers:[...cp.rivers,...map.rivers.filter(r=>!cp.rivers.some(p=>p.id===r.id))],riverFeatures:cp.riverFeatures});
 }
 if(kind==='feature')assert.equal(h.render().editRiverFeatures([{type:'rapid',riverId:id,edgeKey:path.map(v=>v.key).sort().join('|'),state:'off'}]),true);
 h.render().setSelectedHex(region.centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();
 assert.ok(h.render().undoHistory.length);assert.ok(h.render().redoHistory.length);
 return {h,id};
}
const out={exact_sha:'e62da698ab7aa9c3c1209bd8f40a941c6fcc226a',method:'Actual App callbacks through source-transpiling hook harness; real draft/Finish/Confirm for owner move. structuredClone deep comparison preserves Map/Set contents, history/checkpoints/RNG/counters/selection. Sanitized assertions only; no named map output.',old_R1:[],old_R2:[],current:[],adjacent:[]};
for(const [bucket,create,kind] of [['old_R1',oldR1.createGenerationHarness,'deleted'],['old_R2',oldR2.createGenerationHarness,'moved'],['current',current.createGenerationHarness,'deleted'],['current',current.createGenerationHarness,'moved'],['adjacent',current.createGenerationHarness,'unchanged'],['adjacent',current.createGenerationHarness,'new-last-region'],['adjacent',current.createGenerationHarness,'feature']]){
 for(const command of ['deleteLastRegion','regenerateLastRegion'])for(const language of ['ru','en']){
  const {h,id}=fixture(create,language,kind),before=clone(h.render().captureDocument()),beforeSave=save(h),stacks=clone([h.render().undoHistory,h.render().redoHistory]),dialogs=[];
  h.setWindow({alert(){},confirm:m=>{dialogs.push(m);return false;}});h.render()[command]();
  const row={kind,command,language,undo_before:stacks[0].length,redo_before:stacks[1].length,prompt_count:dialogs.length};
  if(bucket.startsWith('old_')){assert.equal(dialogs.length,0);assert.notDeepEqual(clone(h.render().captureDocument()),before);row.expected_defect_reproduced=true;out[bucket].push(row);continue;}
  if(kind==='unchanged'||kind==='new-last-region'){
   assert.equal(dialogs.length,0);if(command==='regenerateLastRegion'){h.render().finishPendingRegeneration();assert.equal(h.render().pendingRegen,null);}
   row.no_spurious_warning=true;out[bucket].push(row);continue;
  }
  assert.equal(dialogs.length,1);
  assert.ok(dialogs[0].startsWith(language==='ru'?'Будет восстановлено исходное состояние рек.':'Original river state will be restored.'));
  const label=kind==='deleted'?`${language==='ru'?'Река':'River'} ${id}`:h.render().toponyms[`river:${id}`][language];
  if(kind!=='feature')assert.ok(dialogs[0].includes(label));
  assert.deepEqual(clone(h.render().captureDocument()),before);assert.deepEqual(clone([h.render().undoHistory,h.render().redoHistory]),stacks);assert.equal(h.render().pendingRegen,null);
  row.reject_exact_document_and_both_stacks=true;row.localized_prompt_and_affected_name=true;
  h.setWindow({alert(){},confirm:()=>true});h.render()[command]();
  if(command==='regenerateLastRegion'){assert.ok(h.render().pendingRegen);h.render().finishPendingRegeneration();assert.equal(h.render().pendingRegen,null);assert.equal(h.render().generationError,null);}
  const after=clone(h.render().captureDocument()),afterSave=save(h);assert.notDeepEqual(afterSave,beforeSave);assert.equal(h.render().redoHistory.length,0);
  assert.ok(afterSave.map.rivers.some(r=>r.id===id));h.geometry.assertHexcrawlSaveData(afterSave);
  h.render().undoMap();assert.deepEqual(clone(h.render().captureDocument()),before);assert.deepEqual(save(h),beforeSave);
  h.render().redoMap();assert.deepEqual(clone(h.render().captureDocument()),after);assert.deepEqual(save(h),afterSave);
  row.accept_completed=true;row.undo_redo_exact_document=true;row.roundtrip_v7_validation=true;row.accept_replaces_redo_branch=true;out[bucket].push(row);
 }
}
fs.writeFileSync(new URL('./checkpoint-review-probe.json',import.meta.url),JSON.stringify(out,null,2));
console.log(JSON.stringify({old_R1:out.old_R1.length,old_R2:out.old_R2.length,current:out.current.length,adjacent:out.adjacent.length,status:'passed'}));
