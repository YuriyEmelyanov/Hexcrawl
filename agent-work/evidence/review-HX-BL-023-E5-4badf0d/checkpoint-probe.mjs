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
const result={exact_sha:'4badf0de7dbc11470be1e06b36531410c2fe3474',method:'real App handlers via unchanged generation harness; Maps/Sets preserved in complete-document comparisons; no map JSON emitted',old:[],fixed:[],adjacent:[]};
for(const [name,create] of [['old',old.createGenerationHarness],['fixed',fixed.createGenerationHarness]])for(const command of ['deleteLastRegion','regenerateLastRegion'])for(const language of ['ru','en']){
 const {h,id}=fixture(create,language),before=norm(h.render().captureDocument()),beforeSave=save(h),stacks=norm([h.render().undoHistory,h.render().redoHistory]),dialogs=[];
 h.setWindow({alert(){},confirm:m=>{dialogs.push(m);return false}});h.render()[command]();
 const unchanged=JSON.stringify(norm(h.render().captureDocument()))===JSON.stringify(before),stacksUnchanged=JSON.stringify(norm([h.render().undoHistory,h.render().redoHistory]))===JSON.stringify(stacks);
 const row={command,language,dialog_count:dialogs.length,cancel_exact_document:unchanged,cancel_exact_stacks:stacksUnchanged,redo_nonempty:stacks[1].length>0,prompt:dialogs[0]??null};
 if(name==='old'){assert.equal(dialogs.length,0);assert.equal(unchanged,false);row.expected_regression_reproduced=true;result.old.push(row);continue;}
 assert.equal(dialogs.length,1);assert.match(dialogs[0],new RegExp(`${language==='ru'?'Река':'River'} ${id}`));assert.equal(unchanged,true);assert.equal(stacksUnchanged,true);assert.equal(h.render().pendingRegen,null);
 h.setWindow({alert(){},confirm:()=>true});h.render()[command]();if(command==='regenerateLastRegion'){assert.ok(h.render().pendingRegen);h.render().finishPendingRegeneration();assert.equal(h.render().pendingRegen,null);assert.equal(h.render().generationError,null);}
 const after=norm(h.render().captureDocument()),afterSave=save(h);assert.notDeepEqual(afterSave,beforeSave);assert.ok(afterSave.map.rivers.some(r=>r.id===id));assert.equal(h.render().redoHistory.length,0);
 h.render().undoMap();assert.deepEqual(save(h),beforeSave);assert.deepEqual(norm(h.render().captureDocument()),before);h.render().redoMap();assert.deepEqual(save(h),afterSave);assert.deepEqual(norm(h.render().captureDocument()),after);
 row.accept_completed=true;row.undo_redo_exact_document=true;row.redo_branch_replaced_on_accept=true;row.roundtrip_v7=true;h.geometry.assertHexcrawlSaveData(afterSave);result.fixed.push(row);
}
for(const kind of ['unchanged','feature'])for(const command of ['deleteLastRegion','regenerateLastRegion']){
 const {h}=fixture(fixed.createGenerationHarness,'en',kind),before=norm(h.render().captureDocument()),stacks=norm([h.render().undoHistory,h.render().redoHistory]),dialogs=[];
 h.setWindow({alert(){},confirm:m=>{dialogs.push(m);return false}});h.render()[command]();
 if(kind==='unchanged')assert.equal(dialogs.length,0);else{assert.equal(dialogs.length,1);assert.deepEqual(norm(h.render().captureDocument()),before);assert.deepEqual(norm([h.render().undoHistory,h.render().redoHistory]),stacks)}
 result.adjacent.push({kind,command,dialog_count:dialogs.length,status:'passed'});
}
fs.writeFileSync(new URL('./checkpoint-probe.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

