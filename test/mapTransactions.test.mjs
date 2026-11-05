import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
const serial=v=>JSON.parse(JSON.stringify(v));
const stable=app=>{const d=serial(app.createSaveData());delete d.savedAt;return d;};
function setup(seed=42) {
  const h=createGenerationHarness(seed); h.render(); const alerts=[];
  h.setWindow({alert:m=>alerts.push(m),matchMedia:()=>({matches:false})});
  h.injectFunction('readTextFile',async file=>file.text);
  return {h,alerts};
}
const load=(h,data)=>h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'file'}});
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/road-entry-zigzags.json',import.meta.url)));
function assertUndoRedo(h,before,after) {
  h.render().undoMap(); assert.deepEqual(stable(h.render()),before,'undo before');
  h.render().redoMap(); assert.deepEqual(stable(h.render()),after,'redo after');
}
test('import is one exact transaction; invalid and preparation failure preserve both stacks',async()=>{
  const {h,alerts}=setup(); const empty=stable(h.render()); await load(h,fixture);
  const loaded=stable(h.render());assert.equal(h.render().undoHistory.length,1);assertUndoRedo(h,empty,loaded);
  h.render().setSelectedHex(fixture.map.regions[0].centerHex);
  h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();
  const before=stable(h.render()), stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  const invalid=structuredClone(fixture); invalid.map.roads[0].segments='broken'; await load(h,invalid);
  assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  // E4-1.1 / HX023-E4-SPEC-01: actual legacy import must reject malformed
  // obstacles before changing the document, RNG, undo or an existing redo branch.
  const mythic=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/baseline-mythic.json',import.meta.url)));
  for(const language of ['ru','en'])for(const version of [2,3,4])for(const defect of ['same','distant','edge']) {
    h.render().setLanguage(language);
    const broken=structuredClone(mythic);broken.version=version;broken.generation=structuredClone(before.generation);
    const o=broken.map.obstacles[0];
    if(defect==='same')o.neighborHex={...o.hex};
    if(defect==='distant')o.neighborHex={q:o.hex.q+3,r:o.hex.r};
    if(defect==='edge')o.edgeKey='not-a-common-edge';
    const document=serial(h.render().captureDocument());
    await load(h,broken);
    assert.match(alerts.at(-1),/map\.obstacles\[0\]/,language+' '+version+' '+defect);
    if(defect!=='edge')assert.match(alerts.at(-1),language==='ru'?/два разных соседних гекса/:/two distinct adjacent hexes/);
    assert.deepEqual(serial(h.render().captureDocument()),document,'invalid obstacles preserve full document and RNG');
    assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks,'invalid obstacles preserve both stacks');
    assert.equal(h.render().isImporting,false);
  }
  const restore=h.injectFunction('getToponymEntities',()=>{throw Error('injected preparation failure');});
  await load(h,fixture);restore(); assert.equal(alerts.length,20);assert.equal(h.render().isImporting,false);
  assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  await load(h,fixture);assert.equal(h.render().redoHistory.length,0);
});
test('all existing manual families, import, reset, and 100 exact undo/redo snapshots',async()=>{
  const {h}=setup();await load(h,fixture);
  const r=fixture.map.regions[0], hex=r.hexes.find(h=>h.q!==r.centerHex.q||h.r!==r.centerHex.r);
  h.render().setSelectedHex(hex);
  const actions=[
    ()=>h.render().setSelectedHexBiomeOverride('open_hills'),
    ()=>h.render().resetSelectedHexBiomeOverride(),
    ()=>h.render().setSelectedPoiKind('ruins'),
    ()=>h.render().setSelectedPoiKind('lair'),
    ()=>h.render().deleteSelectedPoi(),
  ];
  for(const action of actions) {const before=stable(h.render());action();const after=stable(h.render());assert.notDeepEqual(after,before);assertUndoRedo(h,before,after);}
  h.render().setSelectedHex(r.centerHex);let before=stable(h.render());h.render().setSelectedCentralPoiKind('city');assertUndoRedo(h,before,stable(h.render()));
  // All three water operations on a real water hex in the compatibility corpus.
  const lake=JSON.parse(fs.readFileSync(new URL('./fixtures/lake-reentry-map.json',import.meta.url)));
  await load(h,lake);const water=Object.keys(lake.map.terrainByHexKey).find(k=>lake.map.terrainByHexKey[k].terrainOverride==='lake');
  const [q,rr]=water.split(',').map(Number);h.render().setSelectedHex({q,r:rr});
  for(const action of [()=>h.render().setSelectedWaterPoiKind('shipwreck'),()=>h.render().setSelectedWaterPoiKind('rocks'),()=>h.render().deleteSelectedWaterPoi()]) {
    before=stable(h.render());action();const after=stable(h.render());assert.notDeepEqual(after,before);assertUndoRedo(h,before,after);
  }
  before=stable(h.render());h.render().resetMap();assertUndoRedo(h,before,stable(h.render()));
  const beforeSnapshots=[], afterSnapshots=[];
  for(let i=0;i<100;i++) {
    if(i%10!==0 && i%10!==9) h.render().setSelectedHex(hex);
    beforeSnapshots.push(stable(h.render()));
    if(i%10===0) await load(h,fixture);
    else if(i%10===9) h.render().resetMap();
    else if(i%10===3) h.render().setSelectedPoiKind('ruins');
    else if(i%10===6) h.render().deleteSelectedPoi();
    else if(i%10===7) h.render().resetSelectedHexBiomeOverride();
    else if([1,2,5,8].includes(i%10)) {
      const river=h.render().rivers[0],edge=[river.vertexPath[0].key,river.vertexPath[1].key].sort().join('|');
      const edit=i%10<3?{type:'rapid',riverId:river.id,edgeKey:edge,state:i%10===1?'off':'auto'}:{type:'waterfall',vertexKey:river.vertexPath[0].key,state:i%10===5?'off':'auto'};
      assert.equal(h.render().editRiverFeatures([edit]),true);
    } else h.render().setSelectedHexBiomeOverride('open_hills');
    const next=stable(h.render());assert.notDeepEqual(next,beforeSnapshots[i],`operation ${i}`);afterSnapshots.push(next);
  }
  for(let i=99;i>=0;i--) {h.render().undoMap();assert.deepEqual(stable(h.render()),beforeSnapshots[i],`undo ${i}`);}
  for(let i=0;i<100;i++) {h.render().redoMap();assert.deepEqual(stable(h.render()),afterSnapshots[i],`redo ${i}`);}

});
test('manual edits do not replace generation checkpoints, regenerate rollback retains undo and redo',()=>{
  const {h}=setup();h.render().safelyAddRegionToMap({q:0,r:0},{targetSize:8,coastalPreference:'mainland'});
  const region=h.render().regions[0];h.render().setSelectedHex(region.centerHex);h.render().setSelectedHexBiomeOverride('open_hills');
  let before=stable(h.render());h.render().deleteLastRegion();assert.equal(h.render().regions.length,0);assertUndoRedo(h,before,stable(h.render()));
  h.render().undoMap();before=stable(h.render());
  const stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  const restore=h.injectFunction('chooseRegionCenter',()=>{throw Error('injected regenerate error');});
  h.render().regenerateLastRegion();h.render().finishPendingRegeneration();restore();
  assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  h.render().regenerateLastRegion();h.render().finishPendingRegeneration();const after=stable(h.render());assertUndoRedo(h,before,after);
  // HX023-E5-R1 / E5-06: deletion is a manual edit too. Both checkpoint
  // consumers must ask before restoring a river absent from the current map.
  for(const command of ['deleteLastRegion','regenerateLastRegion'])for(const language of ['ru','en'])for(const kind of ['deleted','moved','unchanged','new-last-region']) {
    const {h}=setup(42),g=h.geometry;h.render().setLanguage(language);
    h.render().addFallbackTractToMap({q:0,r:0});
    const base=h.render().captureDocument().map,a={q:0,r:0},b={q:1,r:0};
    const region={...base.regions[0],hexes:[a,b],centerHex:a,anchorHex:a,finalSize:2,targetSize:2,pointsOfInterest:[],pointOfInterestKinds:{},heightLevel:1};
    const other=new Set(g.getHexCornerPoints(b).map(v=>v.key)),path=g.getHexCornerPoints(a).filter(v=>other.has(v.key));
    h.render().restoreSnapshot({...base,regions:[region],rivers:[],roads:[],crossings:[],hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),candidateHexes:g.getCandidateHexes([a,b],new Set()),nextRiverId:1,nextRoadId:1});
    assert.equal(h.render().editRiverDocument({type:'create',regionId:region.id,path,fullness:2}),true);
    const id=h.render().rivers[0].id;
    h.render().addFallbackTractToMap(h.render().candidateHexes[0]);
    assert.equal(h.render().regions.length,2);assert.ok(h.render().history.at(-1).rivers.some(r=>r.id===id));
    if(kind==='deleted')assert.equal(h.render().editRiverDocument({type:'remove',riverId:id,includeArms:true},{confirmed:true}),true);
    if(kind==='moved'||kind==='new-last-region') {
      // R2: use the actual draft/preview UI; replacing may derive a new owner.
      const last=h.render().regions[1];let accepted=null;
      for(const hex of last.hexes) {
        const corners=g.getHexCornerPoints(hex);
        for(let i=0;i<corners.length;i++) {
          const next=[corners[i],corners[(i+1)%corners.length]];
          if(h.render().editRiverDocument({type:'replace',riverId:id,path:next,regionId:region.id,fullness:2},{confirmed:true})&&h.render().rivers.find(r=>r.id===id).regionId===last.id){accepted=next;break;}
        }
        if(accepted)break;
      }
      assert.ok(accepted,'valid path wholly in last region');h.render().undoMap();
      if(kind==='new-last-region') {
        let created=false;
        for(const hex of last.hexes){const vertices=g.getHexCornerPoints(hex);for(let i=0;i<vertices.length;i++){
          if(h.render().editRiverDocument({type:'create',path:[vertices[i],vertices[(i+1)%vertices.length]],regionId:last.id,fullness:1})){created=true;break;}
        }if(created)break;}
        assert.ok(created,'independent new river in last region');
        assert.equal(h.render().rivers.length,2);
      } else {
        h.render().setEditMode(true);assert.equal(h.render().startRiverDraft(id),true);
        for(const v of accepted)assert.equal(h.render().appendRiverDraft(v.key),true);
        h.render().finishRiverDraft();assert.ok(h.render().riverCommandPreview);
        assert.equal(h.render().confirmRiverCommand(h.render().riverCommandPreview),true);
      }
      if(kind==='moved')assert.equal(h.render().rivers.find(r=>r.id===id).regionId,last.id);
    }
    if(kind==='unchanged'||kind==='new-last-region') {
      // Isolate the no-warning contract from automatic river continuation.
      const current=h.render().captureDocument().map,checkpoint=h.render().history.at(-1);
      h.render().restoreSnapshot({...current,rivers:[...checkpoint.rivers,...current.rivers.filter(r=>!checkpoint.rivers.some(old=>old.id===r.id))],riverFeatures:checkpoint.riverFeatures});
      const dialogs=[];h.setWindow({alert(){},confirm:m=>{dialogs.push(m);return true;}});
      h.render()[command]();assert.equal(dialogs.length,0,'no retained manual river change');continue;
    }
    h.render().setSelectedHex(region.centerHex);h.render().setSelectedHexBiomeOverride('open_hills');h.render().undoMap();assert.ok(h.render().redoHistory.length);
    const fullBefore=structuredClone(h.render().captureDocument());
    const before=serial(h.render().captureDocument()),beforeSave=stable(h.render()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
    const dialogs=[];h.setWindow({alert(){},confirm:m=>{dialogs.push(m);return false;},matchMedia:()=>({matches:false})});
    h.render()[command]();
    assert.equal(dialogs.length,1,command+' warns before restoring '+kind);
    assert.ok(dialogs[0].includes((kind==='deleted'?`${language==='ru'?'Река':'River'} ${id}`:h.render().toponyms[`river:${id}`][language])),'preview names the affected river');
    assert.deepEqual(structuredClone(h.render().captureDocument()),fullBefore,'reject keeps complete Map/Set document');
    assert.deepEqual(serial(h.render().captureDocument()),before,'reject keeps document, RNG and checkpoints');
    assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks,'reject keeps both stacks');
    assert.equal(h.render().pendingRegen,null);
    h.setWindow({alert(){},confirm:()=>true,matchMedia:()=>({matches:false})});
    h.render()[command]();
    if(command==='regenerateLastRegion'){assert.ok(h.render().pendingRegen,'accept permits regeneration');h.render().finishPendingRegeneration();assert.equal(h.render().pendingRegen,null);}
    const restored=stable(h.render());assert.ok(restored.map.rivers.some(r=>r.id===id));assertUndoRedo(h,beforeSave,restored);
  }
  // HX023-E5-R3: new cross-region river, no checkpoint identity.
for(const command of ['deleteLastRegion','regenerateLastRegion'])for(const language of ['ru','en']){
 const {h}=setup(42),g=h.geometry;h.render().setLanguage(language);h.setWindow({alert(){}});
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
 assert.equal(dialogs.length,1,'R3 warns before losing retained sector');
 const label=h.render().toponyms[`river:${river.id}`]?.[language]??`${language==='ru'?'Река':'River'} ${river.id}`;
 assert.ok(dialogs[0].includes(label),'warning identifies affected river');
 assert.deepEqual(structuredClone(h.render().captureDocument()),before,'reject keeps full document');
 assert.deepEqual(structuredClone([h.render().undoHistory,h.render().redoHistory]),stacks,'reject keeps full nonempty stacks');
 assert.equal(h.render().pendingRegen,null);
 h.setWindow({alert(){},confirm:()=>true});h.render()[command]();
 if(command==='regenerateLastRegion'){assert.ok(h.render().pendingRegen);h.render().finishPendingRegeneration();assert.equal(h.render().pendingRegen,null);assert.equal(h.render().generationError,null);}
 const after=structuredClone(h.render().captureDocument());assert.notDeepEqual(after,before);
 h.geometry.assertHexcrawlSaveData(h.render().createSaveData());
 h.render().undoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),before);
 h.render().redoMap();assert.deepEqual(structuredClone(h.render().captureDocument()),after);
}

});
test('pending file read serializes imports and blocks edits, generation and reset',async()=>{
  const {h}=setup();await load(h,fixture);const before=stable(h.render());
  let finish;h.injectFunction('readTextFile',()=>new Promise(resolve=>finish=resolve));
  const first=load(h,fixture);assert.equal(h.render().isImporting,true);
  await load(h,{schema:'wrong'}); h.render().resetMap();h.render().setSelectedHexBiomeOverride('open_hills');
  h.render().safelyAddRegionToMap(h.render().candidateHexes[0],{targetSize:8});
  assert.deepEqual(stable(h.render()),before);finish(JSON.stringify(fixture));await first;
  assert.equal(h.render().isImporting,false);assert.equal(h.render().undoHistory.length,2);
});

test('all manifest saves round-trip unchanged entities, names and can continue then undo',async()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/manifest.json',import.meta.url)));
  const crypto=await import('node:crypto');
  for(const item of manifest.entries) {
    const bytes=fs.readFileSync(new URL('../'+item.path,import.meta.url));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256,item.path);
    const data=JSON.parse(bytes),{h,alerts}=setup(42);await load(h,data);
    assert.deepEqual(alerts,[],item.path);
    const saved=stable(h.render());
    for(const layer of ['regions','rivers','roads','crossings','terrainByHexKey']) assert.deepEqual(saved.map[layer],data.map[layer],item.path+' '+layer);
    for(const layer of ['kingdoms','waterPoiByHexKey','biomeOverrideByHexKey'])assert.deepEqual(saved.map[layer],data.map[layer]??(layer==='kingdoms'||layer==='obstacles'?[]:{}),item.path+' '+layer);
    assert.deepEqual(saved.map.obstacles.map(({id,...o})=>o),data.map.obstacles??[],item.path+' obstacle geometry');
    assert.equal(saved.version,7);assert.equal(saved.counters.nextObstacleId,(data.map.obstacles??[]).length+1);
    if(data.map.toponyms)for(const [key,name] of Object.entries(data.map.toponyms.names))assert.deepEqual(saved.map.toponyms.names[key],name,item.path+' name '+key);
    h.geometry.assertHexcrawlSaveData(serial(h.render().createSaveData()));
    // Reload the normalized export: only savedAt may change.
    await load(h,saved);assert.deepEqual(stable(h.render()),saved,item.path+' normalized roundtrip');
    const anchor=h.render().candidateHexes[0]??{q:0,r:0};
    const result=h.render().safelyAddRegionToMap(anchor,{targetSize:8,coastalPreference:'mainland'});
    assert.equal(result.success,true,item.path+' continuation '+JSON.stringify(result));
    h.render().undoMap();assert.deepEqual(stable(h.render()),saved,item.path+' undo continuation');
  }
});
test('v5 obstacle IDs and counter survive migration, round-trip and history; invalid v5 is atomic',async()=>{
  const legacy=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/baseline-mythic.json',import.meta.url)));
  // Structural compatibility is distinct from the restrictions on new commands.
  const obstacle=legacy.map.obstacles[0];
  legacy.map.terrainByHexKey[`${obstacle.hex.q},${obstacle.hex.r}`]={terrainOverride:'sea'};
  const roadId=Math.max(0,...legacy.map.roads.map(r=>r.id))+1;
  legacy.map.roads.push({id:roadId,regionId:legacy.map.regions[0].id,segments:[{from:obstacle.hex,to:obstacle.neighborHex,kind:'road'}]});
  legacy.counters.nextRoadId=roadId+1;
  const {h,alerts}=setup();
  await load(h,legacy);assert.deepEqual(alerts,[]);
  const migrated=stable(h.render());assert.equal(migrated.version,7);
  const sorted=[...legacy.map.obstacles].map(o=>o.edgeKey).sort();
  assert.deepEqual(migrated.map.obstacles,legacy.map.obstacles.map(o=>({...o,id:sorted.indexOf(o.edgeKey)+1})));
  assert.equal(migrated.counters.nextObstacleId,sorted.length+1);
  for(const version of [2,3,4]){
    await load(h,{...legacy,version,generation:migrated.generation});
    assert.deepEqual(stable(h.render()),migrated,'deterministic legacy migration '+version);
  }
  const edited=structuredClone(migrated);edited.map.obstacles.forEach(o=>o.id+=1000);
  delete edited.map.obstacles[0].kingdomId;edited.counters.nextObstacleId=2000;
  const before=stable(h.render());await load(h,edited);assert.deepEqual(stable(h.render()),edited,'persisted IDs not renumbered');
  assertUndoRedo(h,before,edited);
  // A low but safe counter is normalized upwards without touching IDs.
  const low=structuredClone(edited);low.counters.nextObstacleId=1;await load(h,low);
  const normalized=stable(h.render());assert.equal(normalized.counters.nextObstacleId,Math.max(...edited.map.obstacles.map(o=>o.id))+1);
  assert.deepEqual(normalized.map.obstacles,edited.map.obstacles);
  h.render().undoMap();const exact=serial(h.render().captureDocument()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  for(const mutate of [d=>delete d.counters.nextObstacleId,d=>d.counters.nextObstacleId=0,d=>d.counters.nextObstacleId=Number.MAX_SAFE_INTEGER+1,
    d=>delete d.map.obstacles[0].id,d=>d.map.obstacles[1].id=d.map.obstacles[0].id,d=>d.map.obstacles[0].id=Number.MAX_SAFE_INTEGER,
    d=>d.map.obstacles[0].neighborHex={...d.map.obstacles[0].hex}]){
    const bad=structuredClone(edited);mutate(bad);const count=alerts.length;await load(h,bad);
    assert.equal(alerts.length,count+1);assert.match(alerts.at(-1),/map\.obstacles|counters\.nextObstacleId/);
    assert.deepEqual(serial(h.render().captureDocument()),exact);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  }
  h.render().redoMap();assert.deepEqual(stable(h.render()),normalized);
  const resetBefore=stable(h.render());h.render().resetMap();assert.equal(stable(h.render()).counters.nextObstacleId,1);
  h.render().undoMap();assert.deepEqual(stable(h.render()),resetBefore);
  // Actual App commands reuse the prepared context and shared transaction history.
  h.render().setEditMode(true);
  let choice;
  for(const region of h.render().regions)for(const hex of region.hexes){
    if(choice)break;h.render().setSelectedHex(hex);h.render().startObstacleChoice(null);
    choice=h.render().obstacleChoices.find(c=>!c.reason);
  }
  assert.ok(choice,'fixture has an available dry free edge');
  const addBefore=stable(h.render()),allocated=addBefore.counters.nextObstacleId;
  assert.equal(h.render().editObstacleDocument(choice.edit,h.render().obstacleDraft),true);
  const added=stable(h.render());assert.equal(added.counters.nextObstacleId,allocated+1);
  assert.equal(added.map.obstacles.at(-1).id,allocated);assertUndoRedo(h,addBefore,added);
  h.render().startObstacleChoice(allocated);
  const source=added.map.obstacles.at(-1);
  const noOpBefore=serial(h.render().captureDocument()),noOpStacks=serial([h.render().undoHistory,h.render().redoHistory]);
  assert.equal(h.render().editObstacleDocument({type:'move',id:allocated,hex:source.hex,neighborHex:source.neighborHex},h.render().obstacleDraft),true);
  assert.deepEqual(serial(h.render().captureDocument()),noOpBefore);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),noOpStacks);
  h.render().startObstacleChoice(allocated);
  const move=h.render().obstacleChoices.find(c=>!c.reason&&JSON.stringify(c.edit.neighborHex)!==JSON.stringify(source.neighborHex));assert.ok(move);
  assert.equal(h.render().editObstacleDocument(move.edit,h.render().obstacleDraft),true);
  const moved=stable(h.render());assert.equal(moved.counters.nextObstacleId,allocated+1);assert.equal(moved.map.obstacles.at(-1).id,allocated);assertUndoRedo(h,added,moved);
  assert.equal(h.render().editObstacleDocument({type:'remove',id:allocated}),true);
  const removed=stable(h.render());assert.equal(removed.map.obstacles.some(o=>o.id===allocated),false);assertUndoRedo(h,moved,removed);
});
test('no-op and failed imports preserve redo; fresh edit clears it; reset on empty is a no-op',async()=>{
  const {h}=setup();h.render().resetMap();assert.equal(h.render().undoHistory.length,0);
  await load(h,fixture);const r=h.render().regions[0];h.render().setSelectedHex(r.centerHex);
  h.render().setSelectedHexBiomeOverride('open_hills');h.render().setSelectedHexBiomeOverride('open_plains');h.render().undoMap();
  const stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  h.render().setSelectedHexBiomeOverride('open_hills');
  await h.render().handleImportJson({target:{files:[],value:''}});
  assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  h.render().setSelectedHexBiomeOverride('semi_desert');assert.equal(h.render().redoHistory.length,0);
});


// HIST/UI notes contract: use existing production handler harness and full-document comparisons.
test('notes autosave coalesces a series, preserves redo on no-op, and commits before other operations',async()=>{
  const {h}=setup();await load(h,fixture);
  const hex=fixture.map.regions[0].hexes[0],key=`${hex.q},${hex.r}`;
  h.render().setSelectedHex(hex);const before=stable(h.render()),count=h.render().undoHistory.length;
  for(const text of ['  🗝','  🗝 <b>text</b>','  🗝 <b>text</b>\nsecond  ']) h.render().changeNotesText(key,text);
  const after=stable(h.render());assert.equal(after.map.gmNotesByHexKey[key],'  🗝 <b>text</b>\nsecond  ');
  assert.equal(h.render().undoHistory.length,count+1,'one entry for input series');
  const without=d=>{d=structuredClone(d);delete d.map.gmNotesByHexKey;return d;};
  assert.deepEqual(without(before),without(after));assertUndoRedo(h,before,after);
  h.render().undoMap();const redo=serial(h.render().redoHistory);
  h.render().changeNotesText(key,'temporary');h.render().changeNotesText(key,'');h.render().finishNotesGroup();
  assert.deepEqual(serial(h.render().redoHistory),redo,'net-noop restores prior redo');
  h.render().redoMap();h.render().changeNotesText(key,'');h.render().finishNotesGroup();
  assert.equal(stable(h.render()).map.gmNotesByHexKey[key],undefined);h.render().undoMap();assert.deepEqual(stable(h.render()),after);
  h.render().changeNotesText(key,'last character!');await load(h,fixture);h.render().undoMap();
  assert.equal(stable(h.render()).map.gmNotesByHexKey[key],'last character!','import starts after latest text');
});
test('import replaces notes exactly and legacy imports clear them; malformed notes preserve full history',async()=>{
  const {h,alerts}=setup();const key=fixture.map.regions[0].hexes.map(h=>`${h.q},${h.r}`)[0];
  const a=structuredClone(fixture);a.map.gmNotesByHexKey={[key]:'  A\r\n🗝  '};await load(h,a);const before=stable(h.render());
  const b=structuredClone(a);b.map.gmNotesByHexKey={[key]:'B'};await load(h,b);assertUndoRedo(h,before,stable(h.render()));
  const data=stable(h.render()), stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  b.map.gmNotesByHexKey[key]=null;await load(h,b);assert.equal(alerts.length,1);assert.deepEqual(stable(h.render()),data);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  await load(h,fixture);assert.deepEqual(stable(h.render()).map.gmNotesByHexKey,{});h.render().undoMap();assert.deepEqual(stable(h.render()),data);
});
test('delete retains latest surviving notes, confirms loss, undo restores; generation conflict is rejected before commit',async()=>{
  const {h}=setup();h.setWindow({alert(){},confirm:()=>false,matchMedia:()=>({matches:false})});
  h.render().addFallbackTractToMap({q:0,r:0});h.render().addFallbackTractToMap(h.render().candidateHexes[0]);
  const a=h.render().regions[0].hexes[0],ak=`${a.q},${a.r}`,b=h.render().regions[1].hexes[0],bk=`${b.q},${b.r}`;
  h.render().setSelectedHex(a);h.render().changeNotesText(ak,'latest first');h.render().finishNotesGroup();
  h.render().setSelectedHex(b);h.render().changeNotesText(bk,'second');h.render().finishNotesGroup();const before=stable(h.render());
  h.render().deleteLastRegion();assert.deepEqual(stable(h.render()),before);
  h.setWindow({alert(){},confirm:()=>true,matchMedia:()=>({matches:false})});h.render().deleteLastRegion();
  assert.deepEqual(stable(h.render()).map.gmNotesByHexKey,{[ak]:'latest first'});assertUndoRedo(h,before,stable(h.render()));
  const doc=h.render().captureDocument(),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  const map={...doc.map,regions:[],hexTerrainByKey:new Map()};
  assert.throws(()=>h.render().recordGenerated(doc.map,map,a,h.render().captureGenerationBackup()),/notes|заметк/);
  assert.deepEqual(serial(h.render().captureDocument()),serial(doc));assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  // Force the actual generation finalizer to propose losing a noted water hex.
  const source=stable(h.render());source.map.terrainByHexKey['999,999']={terrainOverride:'sea'};source.map.gmNotesByHexKey['999,999']='keep sea';
  await load(h,source);const exact=serial(h.render().captureDocument()),timeline=serial([h.render().undoHistory,h.render().redoHistory]);
  const restores=[];
  for(const name of ['completeRegionRiverEnds','reconcileRegionRiverModel']) {
    const original=h.geometry[name];restores.push(h.injectFunction(name,(...args)=>{const result=original(...args);if(result.terrain){result.terrain=new Map(result.terrain);result.terrain.delete('999,999');}return result;}));
  }
  const result=h.render().safelyAddRegionToMap(h.render().candidateHexes[0],{targetSize:8,coastalPreference:'mainland'});
  restores.forEach(restore=>restore());assert.equal(result.success,false);assert.match(result.diagnostic.message,/999,999/);
  assert.deepEqual(serial(h.render().captureDocument()),exact);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),timeline);
});

test('direct names change only the captured locale; exact history, validation, legacy other locale and stale fault guards',async()=>{
  // N01/N03/N04: helper-unit rename cases already exist; this protects the actual
  // App boundary, its distinct kingdom storage and delayed document handlers.
  const {h}=setup();
  const source=JSON.parse(fs.readFileSync(new URL('./fixtures/import-v2/baseline-mythic.json',import.meta.url)));
  source.map.kingdoms[0].name.ru='x'.repeat(81); // previously valid legacy kingdom name
  await load(h,source);
  const navigationBefore=stable(h.render()),navigationHistory=serial([h.render().undoHistory,h.render().redoHistory]);
  for(const target of h.render().nameTargets){
    const hex=h.render().nameTargetHex(target.key);if(!hex)continue;
    assert.equal(h.render().selectNameTarget(target.key),true);assert.deepEqual(serial(h.render().selectedHex),serial(hex));
    if(target.type==='river'){const river=h.render().rivers.find(r=>`river:${r.id}`===target.key);const edges=new Set(river.vertexPath.slice(1).map((v,i)=>[river.vertexPath[i].key,v.key].sort().join('|')));assert.ok([...h.geometry.getHexEdgeKeys(hex)].some(e=>edges.has(e)));}
  }
  const afterNavigation=stable(h.render());assert.deepEqual(afterNavigation.map,navigationBefore.map);assert.deepEqual(afterNavigation.generation,navigationBefore.generation);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),navigationHistory);
  const staleNavigation=h.render().selectNameTarget;h.render().resetMap();assert.equal(staleNavigation('region:1'),false);await load(h,source);
  const legacyStacks=serial([h.render().undoHistory,h.render().redoHistory]);
  h.render().showNameTarget('kingdom:'+source.map.kingdoms[0].id);
  assert.equal(h.render().saveNameDraft(),true,'unchanged legacy name is a no-op');
  assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),legacyStacks);
  const targets=h.render().nameTargets;
  for(const type of ['region','settlement','river','lake','kingdom']) {
    const target=targets.find(t=>t.type===type);assert.ok(target,type+' target');
    for (const locale of ['en','ru']) {
    h.render().setLanguage(locale);
    const before=stable(h.render()), length=h.render().undoHistory.length;
    h.render().showNameTarget(target.key);
    let draft=h.render().nameDraft;
    h.render().changeNameDraft(locale==='ru'?'Автор '+type:'Author '+type,draft);
    const dirty=h.render();dirty.resetMap();await load(h,fixture);dirty.undoMap();
    assert.deepEqual(stable(h.render()),before,'dirty mutation guards');
    assert.equal(h.render().saveNameDraft(),true);
    const after=stable(h.render());assert.equal(h.render().undoHistory.length,length+1);
    const expected=structuredClone(before);
    if(type==='kingdom')expected.map.kingdoms.find(k=>`kingdom:${k.id}`===target.key).name[locale]=locale==='ru'?'Автор '+type:'Author '+type;
    else expected.map.toponyms.names[target.key][locale]=locale==='ru'?'Автор '+type:'Author '+type;
    assert.deepEqual(after,expected,'only captured locale changed, other locale literal');assertUndoRedo(h,before,after);
    }
  }
  h.render().undoMap();
  const exact=stable(h.render()), stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  h.render().showNameTarget(h.render().nameTargets[0].key);
  h.render().changeNameDraft('invalid\u0000name',h.render().nameDraft);
  assert.equal(h.render().saveNameDraft(),false);assert.ok(h.render().nameErrors.general);h.render().cancelNameDraft();
  h.render().showNameTarget(h.render().nameTargets[0].key);
  h.render().changeNameDraft('Prepared failure',h.render().nameDraft);
  const restoreClone=h.injectFunction('structuredClone',()=>{throw Error('name preparation fault');});
  assert.equal(h.render().saveNameDraft(),false);restoreClone();h.render().cancelNameDraft();
  assert.deepEqual(stable(h.render()),exact);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  const key=h.render().nameTargets[0].key;
  h.render().showNameTarget(key);h.render().saveNameDraft();
  assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks,'no-op keeps redo');
  h.render().showNameTarget(key);let draft=h.render().nameDraft;
  h.render().changeNameDraft('must never apply',draft);
  const staleSave=h.render().saveNameDraft, staleDraft=h.render().nameDraft;
  const replacement=h.render().captureDocument();h.render().applyDocument(replacement);
  assert.equal(staleSave(staleDraft),false);
  assert.deepEqual(stable(h.render()),exact,'stale handler preserves replacement');
  assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
});

// E2 adds canonical region changes, distinct from already covered local override writes.
// Reuse the actual-handler harness rather than a second transaction implementation.
test('region biome respects stored height and canonical neighbors, keeps all overrides and exact metadata/history',async()=>{
  const {h}=setup();await load(h,fixture);
  const legacy=stable(h.render());const legacyKey=Object.keys(legacy.map.toponyms.names).find(k=>k.startsWith('region:'));
  legacy.map.toponyms.names[legacyKey].kind='river'; // accepted old metadata, unrelated to terrain
  h.geometry.assertHexcrawlSaveData(legacy);await load(h,legacy);
  const r=h.render().regions[0];h.render().setSelectedHex(r.centerHex);
  h.render().setSelectedHexBiomeOverride('semi_desert');
  assert.deepEqual(stable(h.render()).map.toponyms,legacy.map.toponyms,'local terrain preserves literal legacy name metadata');
  const before=stable(h.render()), stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  const choices=Object.values(h.geometry.BIOMES).filter(b=>b.heightLevel===r.heightLevel);
  assert.equal(choices.length,({1:12,2:6,3:6})[r.heightLevel]);
  for(const b of Object.values(h.geometry.BIOMES)) {
    const allowed=!h.render().regionBiomeReason(r,b.id);
    const previous=stable(h.render());
    h.render().setSelectedRegionBiome(b.id);
    const next=stable(h.render());
    if(!allowed||b.id===r.biomeId) assert.deepEqual(next,previous,'unavailable/no-op '+b.id);
    else {
      const expected=structuredClone(previous), region=expected.map.regions.find(x=>x.id===r.id);
      Object.assign(region,{biomeId:b.id,biomeLabel:b.label,biomePrimaryEmoji:b.primaryEmoji,biomeSecondaryEmojis:[...b.secondaryEmojis],biomeEmojiLabel:b.primaryEmoji+b.secondaryEmojis.join('')});
      assert.deepEqual(next,expected,'only five canonical fields '+b.id);
      assertUndoRedo(h,previous,next);h.render().undoMap();
    }
  }
  const valid=choices.find(b=>b.id!==r.biomeId&&!h.render().regionBiomeReason(r,b.id));assert.ok(valid);
  const exact=stable(h.render()), timeline=serial([h.render().undoHistory,h.render().redoHistory]);
  const restore=h.injectFunction('structuredClone',()=>{throw Error('biome preparation fault');});
  h.render().setSelectedRegionBiome(valid.id);restore();
  assert.deepEqual(stable(h.render()),exact);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),timeline);
  h.render().setSelectedRegionBiome(valid.id);const edited=stable(h.render());
  const {h:other}=setup();await load(other,edited);
  const anchor=h.render().candidateHexes[0];
  const first=h.render().safelyAddRegionToMap(anchor,{targetSize:8,coastalPreference:'mainland'});
  const second=other.render().safelyAddRegionToMap(anchor,{targetSize:8,coastalPreference:'mainland'});
  assert.equal(first.success,true);assert.equal(second.success,true);
  assert.deepEqual(stable(h.render()),stable(other.render()),'two edited copies continue identically');
  h.render().undoMap();assert.deepEqual(stable(h.render()),edited);
  const stale=h.render().setSelectedRegionBiome;
  await load(h,fixture);const replacement=stable(h.render());stale(valid.id);assert.deepEqual(stable(h.render()),replacement,'old callback cannot change imported world');
  // Canonical neighbors (not visual overrides) constrain a new manual choice.
  const neighbor=h.render().regions.find(n=>n.id!==r.id&&n.hexes.some(x=>r.hexes.some(y=>h.geometry.getHexNeighbors(y).some(z=>z.q===x.q&&z.r===x.r))));
  if(neighbor)for(const b of choices) if(b.id!==neighbor.biomeId&&!h.geometry.isBiomesCompatible(b.id,neighbor.biomeId,h.geometry.BIOME_COMPATIBILITY_MATRIX)) assert.ok(h.render().regionBiomeReason(r,b.id));
  assert.ok(before.map.biomeOverrideByHexKey[`${r.centerHex.q},${r.centerHex.r}`]);
});

// E3 preparation has no UI yet. Exercise the actual commit, not a copied history model.
test('manual road command commits exactly once and stale callback cannot write after import',async()=>{
  const {h,alerts}=setup();await load(h,fixture);assert.deepEqual(alerts,[]);
  const app=h.render(),r=app.roads[0],s=r.segments[0];
  const segmentKey=[`${s.from.q},${s.from.r}`,`${s.to.q},${s.to.r}`].sort().join('|');
  const same={type:'kind',roadId:r.id,segmentKey,kind:s.kind};
  const before=stable(app),stack=app.undoHistory.length;
  assert.equal(app.editRoadDocument(same),true);assert.equal(h.render().undoHistory.length,stack);
  // Use a new path between neighbouring named/destination hexes via the imported fixture.
  // The real crossing handler provides a mutation whenever the fixture has a crossing.
  const crossing=before.map.crossings[0];assert.ok(crossing,'fixture crossing required');
  const command={type:'crossing',roadId:crossing.roadId,segmentKey:crossing.roadSegmentKey,riverId:crossing.riverId,kind:crossing.kind==='bridge'?'ferry':'bridge'};
  assert.equal(h.render().editRoadDocument(command),true);
  const after=stable(h.render());assert.notDeepEqual(after,before);assert.equal(h.render().undoHistory.length,stack+1);assertUndoRedo(h,before,after);
  const stale=h.render().editRoadDocument;await load(h,fixture);const imported=stable(h.render());
  assert.equal(stale(command),false);assert.deepEqual(stable(h.render()),imported);
});

test('road draft is ephemeral, blocks other writes, commits once and stale finish is inert',async()=>{
 const {h}=setup(),data=structuredClone(fixture),segment=data.map.roads[0].segments[0];
 const suppressed=JSON.parse(fs.readFileSync(new URL('./fixtures/suppressed-road-endpoint.json',import.meta.url)));
 for(const isTract of [false,true]){
  const input=structuredClone(suppressed),region=input.map.regions.find(r=>r.id===1);
  region.isTract=isTract;region.suppressCentralPoi=!isTract;
  await load(h,input);h.render().setSelectedHex({q:4,r:6});h.render().setEditMode(true);
  const before=stable(h.render()),history=serial([h.render().undoHistory,h.render().redoHistory]);
  h.render().startRoadDraft();h.render().appendRoadDraft({q:3,r:6});
  assert.equal(h.render().finishRoadDraft(),false,'empty suppressed/tract center is not a destination');
  assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),history);
  h.render().resetRoadDraft();region.pointsOfInterest.push({q:3,r:6});await load(h,input);
  assert.equal(h.render().editRoadDocument({type:'create',path:[{q:4,r:6},{q:3,r:6}],kind:'trail'}),true,'explicit POI remains eligible');
 }

 data.map.roads=[];data.map.crossings=[];
 for(const p of [segment.from,segment.to]){const r=data.map.regions.find(r=>r.hexes.some(x=>x.q===p.q&&x.r===p.r));assert.ok(r);if(!r.pointsOfInterest.some(x=>x.q===p.q&&x.r===p.r))r.pointsOfInterest.push({...p});}
 await load(h,data);h.render().setSelectedHex(segment.from);h.render().setEditMode(true);
 const before=stable(h.render()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
 assert.equal(h.render().startRoadDraft(),true);
 assert.equal(h.render().finishRoadDraft(),false);assert.deepEqual(stable(h.render()),before);
 h.render().resetMap();h.render().undoMap();h.render().setSelectedPoiKind('ruins');await load(h,fixture);
 assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 assert.equal(h.render().appendRoadDraft({q:999,r:999}),false);
 assert.equal(h.render().appendRoadDraft(segment.to),true);
 h.render().resetRoadDraft();assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.render().startRoadDraft();h.render().appendRoadDraft(segment.to);
 const stale=h.render().finishRoadDraft;assert.equal(stale(),true);const after=stable(h.render());
 assert.equal(after.map.roads.length,1);assert.equal(h.render().undoHistory.length,stacks[0].length+1);assert.equal(h.render().roadDraft,null);assert.deepEqual(after.generation,before.generation);
 assertUndoRedo(h,before,after);await load(h,fixture);const imported=stable(h.render());stale();assert.deepEqual(stable(h.render()),imported);
});

test('E5 native v7 feature intentions and counter survive real import, edits, history and rejected files',async()=>{
  const {h,alerts}=setup();await load(h,fixture);const legacy=stable(h.render());
  assert.equal(legacy.version,7);assert.deepEqual(legacy.map.riverFeatures,{rapids:[],waterfalls:[]});
  const native=structuredClone(legacy), eligibility=h.geometry.riverFeatureEligibility(native.map.rivers,native.map.regions,new Map(Object.entries(native.map.terrainByHexKey)),native.map.crossings);
  const targets=native.map.rivers.flatMap(r=>r.vertexPath.slice(1).map((v,i)=>({riverId:r.id,edgeKey:[r.vertexPath[i].key,v.key].sort().join('|')})));
  const rapid=targets.find(e=>eligibility.rapid(e.riverId,e.edgeKey));assert.ok(rapid,'fixture has a real eligible rapid edge');
  const vertex=native.map.rivers[0].vertexPath[0].key;
  native.map.riverFeatures={rapids:[{...rapid,state:'on'}],waterfalls:[{vertexKey:vertex,state:'off'}]};native.counters.nextRiverId+=100;
  await load(h,native);assert.equal(alerts.length,0);const imported=stable(h.render());assert.deepEqual(imported.map.riverFeatures,native.map.riverFeatures);assert.equal(imported.counters.nextRiverId,native.counters.nextRiverId);
  assert.ok(h.render().rapidRiverEdgeKeys.has(rapid.edgeKey),'renderer uses saved On');assertUndoRedo(h,legacy,imported);
  const region=imported.map.regions[0];h.render().setSelectedHex(region.centerHex);const before=stable(h.render());h.render().setSelectedHexBiomeOverride('open_hills');const edited=stable(h.render());assert.deepEqual(edited.map.riverFeatures,before.map.riverFeatures);assert.equal(edited.counters.nextRiverId,before.counters.nextRiverId);assertUndoRedo(h,before,edited);
  // Native Off persists even where Auto could be false, and actually suppresses the marker.
  const off=structuredClone(edited);off.map.riverFeatures.rapids[0].state='off';await load(h,off);assert.equal(alerts.length,0);assert.equal(h.render().rapidRiverEdgeKeys.has(rapid.edgeKey),false);
  await load(h,stable(h.render()));assert.equal(alerts.length,0);assert.equal(stable(h.render()).map.riverFeatures.rapids[0].state,'off');
  h.render().undoMap();const document=serial(h.render().captureDocument()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
  for(const mutate of [d=>delete d.map.riverFeatures,d=>delete d.counters.nextRiverId,d=>d.counters.nextRiverId=0,d=>d.map.riverFeatures.rapids[0].state=['on'],d=>d.map.riverFeatures.rapids.push({...d.map.riverFeatures.rapids[0]}),d=>d.map.riverFeatures.waterfalls[0].state='on']){
    const invalid=structuredClone(off);mutate(invalid);const n=alerts.length;await load(h,invalid);assert.equal(alerts.length,n+1);assert.deepEqual(serial(h.render().captureDocument()),document);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
  }
});

function riverBackendFixture(withCrossing){
 const {h}=setup();h.render().addFallbackTractToMap({q:0,r:0});const g=h.geometry,base=h.render().captureDocument().map,a={q:0,r:0},b={q:1,r:0};
 const region={...base.regions[0],hexes:[a,b],centerHex:a,anchorHex:a,finalSize:2,targetSize:2,pointsOfInterest:[],pointOfInterestKinds:{},heightLevel:1};
 const corners=g.getHexCornerPoints(a),other=new Set(g.getHexCornerPoints(b).map(v=>v.key)),path=corners.filter(v=>other.has(v.key));assert.equal(path.length,2);
 const edge=path.map(v=>v.key).sort().join('|'),river={id:1,regionId:region.id,vertexPath:path,sectors:g.createInitialRiverSectors(1,path,2,{},region.id)},key='1:0,0|1,0:1';
 const road={id:1,regionId:region.id,segments:[{from:a,to:b,kind:'road'}]};
 h.render().restoreSnapshot({...base,regions:[region],rivers:[river],roads:withCrossing?[road]:[],crossings:withCrossing?[{key,roadId:1,roadSegmentKey:'0,0|1,0',riverId:1,riverEdgeKey:edge,kind:'ford'}]:[],hexTerrainByKey:new Map(),waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),candidateHexes:g.getCandidateHexes([a,b],new Set()),nextRiverId:2,nextRoadId:withCrossing?2:1});
 return {h,g,path,edge,key,a,b};
}
// New contracts: real river backend with crossings/history and same-transaction
// E3 feature resolution. Existing pure tests cannot prove setters/revisions.
test('E5 real river transaction resolves deep ford once and preserves no-op, failure and exact undo redo',()=>{
 const {h,g,edge,key}=riverBackendFixture(true),before=stable(h.render()),stacks=serial([h.render().undoHistory,h.render().redoHistory]),f={type:'fullness',riverId:1,edgeKey:edge,fullness:3};
 assert.equal(h.render().editRiverDocument(f),false);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.render().setEditMode(true);
 assert.equal(h.render().requestRiverCommand(f),false);assert.equal(h.render().riverPreviewPlan.plan.unresolvedCrossings.length,1);assert.equal(h.render().confirmRiverCommand(),false);
 const cancelled=h.render().confirmRiverCommand;h.render().cancelRiverCommand();assert.equal(cancelled(),false);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.render().requestRiverCommand(f);const firstPreview=h.render().riverCommandPreview;h.render().changeRiverPreview({crossingKinds:{[key]:'ferry'}});assert.equal(h.render().confirmRiverCommand(firstPreview),false,'old preview callback is inert');
 assert.equal(h.render().riverPreviewPlan.plan.unresolvedCrossings.length,0);h.render().cancelRiverCommand();
 const stale=h.render().editRiverDocument;assert.equal(stale(f,{crossingKinds:{[key]:'bridge'},confirmed:true}),true);const after=stable(h.render());assert.equal(after.map.crossings[0].kind,'bridge');assert.ok(after.map.rivers[0].sectors.every(s=>s.fullness===3));assert.deepEqual(after.generation,before.generation);assert.equal(h.render().undoHistory.length,stacks[0].length+1);assert.equal(stale(f),false);assertUndoRedo(h,before,after);
 const document=serial(h.render().captureDocument()),history=serial([h.render().undoHistory,h.render().redoHistory]);const restore=h.injectFunction('getToponymEntities',()=>{throw Error('river preparation clone/name fault');});assert.equal(h.render().editRiverDocument({...f,fullness:4}),false);restore();assert.deepEqual(serial(h.render().captureDocument()),document);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),history);
 assert.equal(h.render().editRiverDocument({type:'remove',riverId:1,includeArms:false}),false);assert.deepEqual(stable(h.render()),after);
 assert.equal(h.render().editRiverDocument({type:'remove',riverId:1,includeArms:false},{confirmed:true}),true);const removed=stable(h.render());assert.equal(removed.map.rivers.length,0);assert.equal(removed.map.crossings.length,0);assert.equal(removed.counters.nextRiverId,2);g.assertHexcrawlSaveData(removed);
 h.render().undoMap();assert.deepEqual(stable(h.render()),after);const redo=serial(h.render().redoHistory);assert.equal(h.render().editRiverDocument(f),true);assert.deepEqual(serial(h.render().redoHistory),redo);h.render().redoMap();assert.deepEqual(stable(h.render()),removed);
});
test('E5 real feature and E3 crossing resolution share one accepted transaction with exact reload',async()=>{
 const {h,g,edge,a,b}=riverBackendFixture(false),before=stable(h.render()),rapid={type:'rapid',riverId:1,edgeKey:edge,state:'on'};
 assert.equal(h.render().editRiverFeatures([rapid]),true);const on=stable(h.render());assert.equal(on.map.riverFeatures.rapids[0].state,'on');assertUndoRedo(h,before,on);
 const road={type:'create',path:[a,b],kind:'road'},doc=serial(h.render().captureDocument()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
 assert.equal(h.render().editRoadDocument(road),false);assert.deepEqual(serial(h.render().captureDocument()),doc);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 assert.equal(h.render().editRoadDocument(road,undefined,[{...rapid,state:'off'}]),true);const result=stable(h.render());assert.equal(result.map.roads.length,1);assert.equal(result.map.crossings[0].kind,'bridge');assert.equal(result.map.riverFeatures.rapids[0].state,'off');assert.deepEqual(result.generation,on.generation);assert.equal(h.render().undoHistory.length,stacks[0].length+1);g.assertHexcrawlSaveData(result);assertUndoRedo(h,on,result);await load(h,result);assert.deepEqual(stable(h.render()),result);
 h.render().undoMap();h.render().undoMap();assert.deepEqual(stable(h.render()),on);h.render().setEditMode(true);
 assert.equal(h.render().editRoadDocument(road),false);const resolution=h.render().roadFeatureResolution;assert.equal(resolution.conflicts.length,1);assert.deepEqual(stable(h.render()),on);
 h.render().resetMap();assert.deepEqual(stable(h.render()),on,'pending marker choice blocks another writer');
 assert.equal(h.render().editRoadDocument(road,undefined,[{...rapid,state:'auto'}],resolution),true);const automatic=stable(h.render());assert.equal(automatic.map.riverFeatures.rapids.length,0);assert.equal(automatic.map.crossings.length,1);g.assertHexcrawlSaveData(automatic);

});

// E5-02: a path draft has a different lifecycle from a prepared river edit.
// Reuse the physical fixture/harness; no duplicate numerical rule table.
test('E5 river draft guards writes, preserves invalid and cancelled work and commits one exact document',async()=>{
 const {h,g,a,path:occupied}=riverBackendFixture(false);h.render().setSelectedHex(a);h.render().setEditMode(true);
 const before=stable(h.render()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
 const corners=g.getHexCornerPoints(a),busy=new Set(occupied.map(v=>v.key));
 const edge=corners.map((v,i)=>[v,corners[(i+1)%corners.length]]).find(vs=>vs.every(v=>!busy.has(v.key)));assert.ok(edge);
 assert.equal(h.render().startRiverDraft(),true);assert.equal(h.render().riverDraft.path.length,0);
 const oldAppend=h.render().appendRiverDraft;assert.equal(h.render().finishRiverDraft(),false);
 // These are actual handlers, not merely disabled DOM controls.
 h.render().resetMap();h.render().undoMap();h.render().redoMap();h.render().generateAt({q:8,r:8});h.render().setSelectedPoiKind('ruins');h.render().changeNotesText('0,0','blocked');h.render().applyWorldSeed();
 assert.equal(h.render().editRiverFeatures([{type:'waterfall',vertexKey:occupied[0].key,state:'off'}]),false);
 assert.equal(h.render().editRiverDocument({type:'reverse',riverId:1}),false);
 await load(h,fixture);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 assert.equal(h.render().appendRiverDraft('not-a-vertex'),false);assert.equal(h.render().appendRiverDraft(edge[0].key),true);
 assert.equal(oldAppend(edge[1].key),false,'obsolete path callback cannot extend a new draft object');
 assert.equal(h.render().finishRiverDraft(),false);assert.deepEqual(stable(h.render()),before);
 assert.equal(h.render().appendRiverDraft(edge[1].key),true);
 assert.equal(h.render().appendRiverDraft(edge[0].key),true,'previous vertex undoes one draft step');assert.equal(h.render().riverDraft.path.length,1);
 const staleFinish=h.render().finishRiverDraft;h.render().resetRiverDraft();assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 assert.equal(h.render().startRiverDraft(),true);assert.equal(staleFinish(),false);
 h.render().appendRiverDraft(edge[0].key);h.render().appendRiverDraft(edge[1].key);
 const finish=h.render().finishRiverDraft;assert.equal(finish(),true);const after=stable(h.render());assert.equal(after.map.rivers.length,before.map.rivers.length+1);assert.equal(after.counters.nextRiverId,before.counters.nextRiverId+1);assert.deepEqual(after.generation,before.generation);assert.equal(h.render().riverDraft,null);assert.equal(h.render().undoHistory.length,stacks[0].length+1);
 assert.equal(finish(),false,'double captured completion is inert');assert.deepEqual(stable(h.render()),after);
 assertUndoRedo(h,before,after);await load(h,after);assert.deepEqual(stable(h.render()),after);assert.equal(finish(),false);
 h.render().setSelectedHex(a);h.render().setEditMode(true);
 const id=after.map.rivers.at(-1).id,old=after.map.rivers.find(r=>r.id===id),prior=stable(h.render());
 assert.equal(h.render().startRiverDraft(id),true);for(const v of old.vertexPath)assert.equal(h.render().appendRiverDraft(v.key),true,'replacement may reuse its own occupied edge');
 assert.equal(h.render().finishRiverDraft(),true,'same path is a no-op');assert.deepEqual(stable(h.render()),prior);
 assert.equal(h.render().startRiverDraft(id),true);for(const v of [...old.vertexPath].reverse())assert.equal(h.render().appendRiverDraft(v.key),true);
 assert.equal(h.render().finishRiverDraft(),false);assert.ok(h.render().riverCommandPreview,'replacement is previewed before commit');assert.deepEqual(stable(h.render()),prior);
 const replace=h.render().confirmRiverCommand;assert.equal(replace(),true);const replaced=stable(h.render());assert.equal(replaced.counters.nextRiverId,prior.counters.nextRiverId);assert.deepEqual(replaced.map.rivers.find(r=>r.id===id).vertexPath,[...old.vertexPath].reverse());assert.deepEqual(replaced.map.toponyms,prior.map.toponyms);assert.deepEqual(replaced.map.tags,prior.map.tags);assert.equal(replace(),false);g.assertHexcrawlSaveData(replaced);assertUndoRedo(h,prior,replaced);

});

// E6 W01/W02/W07/W08: use the existing real transaction harness. Pure shape
// and identity cases live in manualWater; this lifecycle catches setter wiring.
const waterFixture=JSON.parse(fs.readFileSync(new URL('./fixtures/e6-water-editor.json',import.meta.url)));
async function waterSetup(data=waterFixture){const {h,alerts}=setup();await load(h,data);assert.deepEqual(alerts,[]);h.render().setEditMode(true);h.render().setSelectedHex({q:0,r:0});return h;}
test('E6 real water transaction preserves dormant biome, notes, RNG, exact history and v7 roundtrip',async()=>{
 const h=await waterSetup(),before=stable(h.render()),oldGeneration=serial(before.generation),count=h.render().undoHistory.length;
 assert.equal(h.render().startWaterDraft('lake'),true);assert.equal(h.render().finishWaterDraft(),true);
 const after=stable(h.render());assert.equal(after.map.terrainByHexKey['0,0'].lakeId,20);assert.equal(after.counters.nextLakeId,21);assert.equal(h.render().undoHistory.length,count+1);
 assert.deepEqual(after.generation,oldGeneration);assert.equal(after.map.gmNotesByHexKey['0,0'],before.map.gmNotesByHexKey['0,0']);assert.equal(after.map.biomeOverrideByHexKey['0,0'],before.map.biomeOverrideByHexKey['0,0']);assert.deepEqual(after.map.regions[0].hexes,before.map.regions[0].hexes);
 assertUndoRedo(h,before,after);await load(h,after);assert.deepEqual(stable(h.render()),after);
 h.render().setEditMode(true);assert.equal(h.render().startWaterDraft('land'),true);assert.equal(h.render().finishWaterDraft(),false);
 let a=h.render();assert.ok(a.waterPreview.plan.losses.some(l=>l.type==='name'));a.changeWaterDraft(a.waterDraft,{options:{acceptedLosses:a.waterPreview.plan.losses.map(l=>l.id)},preview:true});
 assert.equal(h.render().finishWaterDraft(h.render().waterDraft,true),true);
 const land=stable(h.render());assert.equal(land.map.terrainByHexKey['0,0'],undefined);assert.equal(land.counters.nextLakeId,21);assert.equal(land.map.biomeOverrideByHexKey['0,0'],before.map.biomeOverrideByHexKey['0,0']);assert.equal(land.map.gmNotesByHexKey['0,0'],before.map.gmNotesByHexKey['0,0']);
 await load(h,land);h.render().setEditMode(true);assert.equal(h.render().startWaterDraft('lake'),true);assert.equal(h.render().finishWaterDraft(),true);assert.equal(stable(h.render()).map.terrainByHexKey['0,0'].lakeId,21,'deleted ID floor survives reload');
});
test('E6 real POI/name/tag losses require every explicit answer and Undo restores authored content',async()=>{
 const f=structuredClone(waterFixture);f.map.regions[0].pointsOfInterest=[{q:0,r:0}];f.map.regions[0].pointOfInterestKinds={'0,0':'village'};
 const {rollTag,editTag,emptyTags}=await import('../src/tags/engine.ts'),{mythicDefinitions}=await import('../src/tags/mythic.ts');
 const owner={kind:'poi',regionId:1,hexKey:'0,0'};let tags=rollTag(emptyTags(),owner,mythicDefinitions['mb.feature'],42);tags=editTag(tags,owner,'mb.feature',0,'ru','Авторский текст');f.map.tags=tags;
 f.map.toponyms.names['settlement:1:0,0']={ru:'Авторская деревня',en:'Authored Village',kind:'settlement',model:'germanic',revision:4};
 const h=await waterSetup(f),before=stable(h.render());h.render().startWaterDraft('lake');assert.equal(h.render().finishWaterDraft(),false);
 let a=h.render(),losses=a.waterPreview.plan.losses;assert.deepEqual(serial(losses.map(l=>l.type).sort()),['name','poi','tag']);
 assert.equal(a.finishWaterDraft(a.waterDraft,true),false);assert.deepEqual(stable(h.render()),before);
 a=h.render();a.changeWaterDraft(a.waterDraft,{options:{acceptedLosses:[losses[0].id]},preview:true});assert.equal(h.render().finishWaterDraft(h.render().waterDraft,true),false);assert.deepEqual(stable(h.render()),before);
 a=h.render();a.changeWaterDraft(a.waterDraft,{options:{acceptedLosses:losses.map(l=>l.id)},preview:true});assert.equal(h.render().finishWaterDraft(h.render().waterDraft,true),true);
 const after=stable(h.render());assert.equal(after.map.regions[0].pointsOfInterest.length,0);assert.equal(after.map.tags.instances.length,0);assert.deepEqual(after.generation,before.generation);assert.equal(after.map.gmNotesByHexKey['0,0'],before.map.gmNotesByHexKey['0,0']);assertUndoRedo(h,before,after);
});
test('E6 water cancel/no-op/stale callbacks and snapshot failure preserve map and both history branches',async()=>{
 const h=await waterSetup();h.render().setSelectedPoiKind('lair');h.render().undoMap();const before=stable(h.render()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);
 h.render().startWaterDraft('land');assert.equal(h.render().finishWaterDraft(),true);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.render().startWaterDraft('lake');const old=h.render(),draft=old.waterDraft;old.toggleWaterHex('1,0',draft);assert.equal(old.finishWaterDraft(draft,true),false,'stale closure must not act on changed mask');
 h.render().changeNotesText('0,0','must be blocked');h.render().undoMap();assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.render().resetWaterDraft();assert.deepEqual(stable(h.render()),before);
 h.render().startWaterDraft('lake');
 const failure=Error('injected water snapshot failure'),failureStack=failure.stack,logStart=h.logs.length;
 const fail=h.injectFunction('structuredClone',()=>{throw failure;});assert.equal(h.render().finishWaterDraft(),false);fail();
 const diagnostics=h.logs.slice(logStart);assert.equal(diagnostics.length,1,'unexpected failure is retained once');assert.equal(diagnostics[0].level,'error');assert.equal(diagnostics[0].args.length,2,'no map or notes are appended to diagnostics');assert.match(diagnostics[0].args[0],/water/i);assert.equal(diagnostics[0].args[1],failure,'keep the original Error');assert.equal(diagnostics[0].args[1].stack,failureStack,'keep its original stack');
 assert.equal(h.render().waterDraft.preview,true,'failed preparation retains the draft for correction');assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 for(const expected of [new h.geometry.WaterEditError('sea_minimum'),new h.geometry.TagCapacityError('owner')]){
  const start=h.logs.length,restore=h.injectFunction('structuredClone',()=>{throw expected;});assert.equal(h.render().finishWaterDraft(),false);restore();assert.equal(h.logs.length,start,'expected domain refusals do not emit unexpected-error diagnostics');
  assert.ok(h.render().waterDraft);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 }
 const failAgain=h.injectFunction('structuredClone',()=>{throw failure;}),restoreLogger=h.injectFunction('console.error',()=>{throw Error('injected diagnostic sink failure');});
 assert.equal(h.render().finishWaterDraft(),false,'diagnostic sink failure cannot escape the atomic refusal');failAgain();restoreLogger();assert.ok(h.render().waterDraft);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.render().resetWaterDraft();h.render().startWaterDraft('lake');const current=h.render(),captured=current.waterDraft;assert.equal(current.finishWaterDraft(captured),true);assert.equal(current.finishWaterDraft(captured),false,'double completion must not commit twice');assert.equal(h.render().undoHistory.length,stacks[0].length+1);
});

test('E6 real water dependencies block roads and require explicit barrier/water-POI loss without deleting notes',async()=>{
 const road=structuredClone(waterFixture);road.map.roads=[{id:1,regionId:1,segments:[{from:{q:0,r:0},to:{q:1,r:0},kind:'trail'}]}];road.counters.nextRoadId=2;
 const h=await waterSetup(road),before=stable(h.render()),stacks=serial([h.render().undoHistory,h.render().redoHistory]);h.render().startWaterDraft('lake');assert.equal(h.render().finishWaterDraft(),false);assert.match(h.render().waterPreview.error,/Дорога|Road/);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 const legacyWet=structuredClone(road);legacyWet.map.terrainByHexKey={'0,0':{terrainOverride:'lake',lakeId:3}};const lh=await waterSetup(legacyWet);assert.throws(()=>lh.geometry.prepareWaterMapEdit(lh.render().captureDocument().map,{target:'land',hexKeys:['0,0']}),/road_end/,'a changed wet endpoint cannot borrow an unrelated old dead-end allowance');
 const barrier=structuredClone(waterFixture),g=h.geometry,a={q:0,r:0},b={q:1,r:0},edges=g.getHexEdgeKeys(a),edge=[...g.getHexEdgeKeys(b)].find(k=>edges.has(k));barrier.map.obstacles=[{id:1,hex:a,neighborHex:b,edgeKey:edge}];barrier.counters.nextObstacleId=2;
 const bh=await waterSetup(barrier),old=stable(bh.render());bh.render().startWaterDraft('lake');assert.equal(bh.render().finishWaterDraft(),false);let app=bh.render();assert.ok(app.waterPreview.plan.losses.some(l=>l.type==='obstacle'));app.changeWaterDraft(app.waterDraft,{options:{acceptedLosses:app.waterPreview.plan.losses.map(l=>l.id)},preview:true});assert.equal(bh.render().finishWaterDraft(bh.render().waterDraft,true),true);assert.equal(bh.render().obstacles.length,0);assertUndoRedo(bh,old,stable(bh.render()));
 const water=structuredClone(waterFixture);water.map.terrainByHexKey={'0,0':{terrainOverride:'lake',lakeId:3}};water.map.waterPoiByHexKey={'0,0':'underwater_ruins'};
 const wh=await waterSetup(water),original=stable(wh.render());wh.render().startWaterDraft('land');assert.equal(wh.render().finishWaterDraft(),false);app=wh.render();assert.ok(app.waterPreview.plan.losses.some(l=>l.type==='waterPoi'));app.changeWaterDraft(app.waterDraft,{options:{acceptedLosses:app.waterPreview.plan.losses.map(l=>l.id)},preview:true});assert.equal(wh.render().finishWaterDraft(wh.render().waterDraft,true),true);assert.equal(wh.render().captureDocument().map.waterPoiByKey.size,0);assert.equal(wh.render().captureDocument().map.gmNotesByHexKey['0,0'],original.map.gmNotesByHexKey['0,0']);assertUndoRedo(wh,original,stable(wh.render()));
 const biomes=Object.values(g.BIOMES),first=biomes.find(a=>biomes.some(b=>a.id!==b.id&&!g.isBiomesCompatible(a.id,b.id,g.BIOME_COMPATIBILITY_MATRIX))),second=biomes.find(b=>first.id!==b.id&&!g.isBiomesCompatible(first.id,b.id,g.BIOME_COMPATIBILITY_MATRIX));assert.ok(first&&second);
 const incompatible=structuredClone(waterFixture),template=incompatible.map.regions[0];incompatible.map.regions=[first,second].map((biome,i)=>({...template,id:i+1,hexes:[{q:i*2,r:0},{q:i*2,r:1}],centerHex:{q:i*2,r:0},anchorHex:{q:i*2,r:0},finalSize:2,biomeId:biome.id,heightLevel:biome.heightLevel,biomeLabel:biome.label,biomePrimaryEmoji:biome.primaryEmoji,biomeSecondaryEmojis:biome.secondaryEmojis,biomeEmojiLabel:biome.primaryEmoji}));incompatible.map.terrainByHexKey={'1,0':{terrainOverride:'sea'},'1,1':{terrainOverride:'sea'}};incompatible.map.biomeOverrideByHexKey={};
 const ih=await waterSetup(incompatible),prior=stable(ih.render());assert.throws(()=>ih.geometry.prepareWaterMapEdit(ih.render().captureDocument().map,{target:'land',hexKeys:['1,0','1,1'],regionAssignments:{'1,0':1}}),/biome_boundary/);assert.deepEqual(stable(ih.render()),prior);
});

test('E6 real water feature conflict requires Off/Auto together with the accepted geography',async()=>{
 const h=await waterSetup(),g=h.geometry,ctx=g.buildManualRiverGeometryContext(h.render().captureDocument().map);
 // Physical grid path through the selected cell, with genuine open endpoints.
 const keys=['-24.249,-98','-24.249,-70','0,-56','0,-28','24.249,-14','24.249,14','0,28','0,56','-24.249,70','-24.249,98'];
 const path=keys.map(k=>ctx.vertex(k));assert.ok(path.every(Boolean));assert.equal(h.render().editRiverDocument({type:'create',regionId:1,path,fullness:1}),true);
 const river=h.render().rivers[0],edge=['24.249,-14','24.249,14'].sort().join('|');assert.equal(h.render().editRiverFeatures([{type:'rapid',riverId:river.id,edgeKey:edge,state:'on'}]),true);
 const before=stable(h.render());h.render().startWaterDraft('lake');assert.equal(h.render().finishWaterDraft(),false);let a=h.render();assert.equal(a.waterPreview.plan.unresolvedFeatures.length,1);assert.deepEqual(stable(a),before);
 a.changeWaterDraft(a.waterDraft,{options:{featureEdits:[{type:'rapid',riverId:river.id,edgeKey:edge,state:'off'}]},preview:true});assert.equal(h.render().finishWaterDraft(h.render().waterDraft,true),true);
 const after=stable(h.render());assert.equal(after.map.riverFeatures.rapids[0].state,'off');assert.ok(after.map.terrainByHexKey['0,0']);assert.deepEqual(after.generation,before.generation);assert.deepEqual(after.map.rivers.map(r=>r.vertexPath),before.map.rivers.map(r=>r.vertexPath));assertUndoRedo(h,before,after);
});

test('E6 generation checkpoint warns before restoring changed water and restores authored lake data together',async()=>{
 const f=structuredClone(waterFixture),{rollTag,editTag,emptyTags}=await import('../src/tags/engine.ts'),{mythicDefinitions}=await import('../src/tags/mythic.ts');
 f.map.terrainByHexKey={'0,0':{terrainOverride:'lake',lakeId:3}};f.map.tags=editTag(rollTag(emptyTags(),{kind:'lake',id:3},mythicDefinitions['mb.water'],42),{kind:'lake',id:3},'mb.water',0,'ru','Авторская вода');
 const h=await waterSetup(f);h.render().addFallbackTractToMap(h.render().candidateHexes[0]);assert.equal(h.render().regions.length,2);
 const checkpoint=h.render().history.at(-1);h.render().setSelectedHex({q:0,r:0});h.render().startWaterDraft('land');assert.equal(h.render().finishWaterDraft(),false);let a=h.render();a.changeWaterDraft(a.waterDraft,{options:{acceptedLosses:a.waterPreview.plan.losses.map(l=>l.id)},preview:true});assert.equal(h.render().finishWaterDraft(h.render().waterDraft,true),true);
 const before=stable(h.render()),stacks=serial([h.render().undoHistory,h.render().redoHistory]),questions=[];
 h.setWindow({confirm:m=>{questions.push(m);return false;}});h.render().deleteLastRegion();assert.match(questions.at(-1),/вода и берег/);assert.deepEqual(stable(h.render()),before);assert.deepEqual(serial([h.render().undoHistory,h.render().redoHistory]),stacks);
 h.setWindow({confirm:()=>true});h.render().deleteLastRegion();const after=stable(h.render());
 assert.deepEqual(after.map.terrainByHexKey,Object.fromEntries(checkpoint.hexTerrainByKey));assert.deepEqual(after.map.tags,serial(checkpoint.tags));assert.deepEqual(after.map.toponyms.names,serial(checkpoint.toponyms));assert.deepEqual(after.generation,serial(checkpoint.generation));assert.deepEqual(after.map.gmNotesByHexKey,serial(checkpoint.gmNotesByHexKey));assert.equal(after.map.tags.instances[0].overrides[0].ru,'Авторская вода');assertUndoRedo(h,before,after);
});
