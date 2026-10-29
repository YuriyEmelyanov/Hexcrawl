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
  const restore=h.injectFunction('getToponymEntities',()=>{throw Error('injected preparation failure');});
  await load(h,fixture);restore(); assert.equal(alerts.length,2);assert.equal(h.render().isImporting,false);
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
    else if(i%10===2 || i%10===5 || i%10===8) h.render().resetSelectedHexBiomeOverride();
    else h.render().setSelectedHexBiomeOverride('open_hills');
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
    for(const layer of ['kingdoms','obstacles','waterPoiByHexKey','biomeOverrideByHexKey'])assert.deepEqual(saved.map[layer],data.map[layer]??(layer==='kingdoms'||layer==='obstacles'?[]:{}),item.path+' '+layer);
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
  const r=h.render().regions[0];h.render().setSelectedHex(r.centerHex);
  h.render().setSelectedHexBiomeOverride('semi_desert');
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
