import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGenerationHarness as candidate} from '/tmp/hx03src/test/helpers/generation-harness.mjs';
import {createGenerationHarness as baseline} from './baseline/test/helpers/generation-harness.mjs';
import {discoveryForRoll} from '/tmp/hx03src/src/poiDiscovery.ts';
import {createGenerationState} from '/tmp/hx03src/src/worldRandom.ts';
import {newKnaveLayer} from '/tmp/hx03src/src/knaveClassic.ts';
const spec=fs.readFileSync('/tmp/hx03ops/agent-work/specs/HX-BL-062-discovery-F1.md','utf8');
const appSource=fs.readFileSync('/tmp/hx03src/src/App.tsx','utf8');
const rows=[...spec.matchAll(/^\|[^|]+\| `([\w:]+)` \| (\d+) \| (\d+) \| (\d+) \|$/gm)];
const ids=found=>[...found.matchAll(/'(\w+)'/g)].map(x=>x[1]);
const land=[...ids(appSource.match(/type SettlementPoiKind = Extract<([^>]+)>/)[1]),...ids(appSource.match(/type SecondaryPoiKind =([\s\S]*?);/)[1])];
const water=ids(appSource.match(/type WaterPoiKind =([^;]+)/)[1]);
assert.deepEqual(rows.map(x=>x[1]).sort(),[...land,...water.map(x=>'water:'+x),'none'].sort());
const modes=['passage','exploration','interaction'];
for(const [,kind,p,e,s] of rows){const want=[...Array(+p).fill(modes[0]),...Array(+e).fill(modes[1]),...Array(+s).fill(modes[2])];assert.equal(want.length,100);assert.deepEqual(Array.from({length:100},(_,roll)=>discoveryForRoll(kind,roll)),want);}
console.log('F1 catalog/types and ordered intervals:',rows.length,'rows;',rows.length*100,'individual assignments');
const clone=x=>JSON.parse(JSON.stringify(x));
function doc(make=candidate,seed=42){
 const h=make(seed), app=()=>h.render(), alerts=[];
 h.setWindow({confirm:()=>true,alert:m=>alerts.push(m)});h.injectFunction('readTextFile',async f=>f.text);
 return {h,app,save:()=>clone(app().createSaveData()),open:async (data,valid=true)=>{await app().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:'import'}});assert.equal(alerts.length,valid?0:1,alerts.join('|'));alerts.length=0;}};
}
const seed42=JSON.parse(fs.readFileSync('/tmp/hx03ops/agent-work/evidence/HX-BL-062-F1/449e6fe/seed42.json'));
const coord={q:1,r:0}, key='poi:1:1,0', capital='poi:1:3,-2', portal='poi:1:0,0', village='poi:1:2,-1';
function roll(seed,owner){let h=(seed^0x811c9dc5)>>>0;for(const c of owner)h=Math.imul(h^c.codePointAt(0),16777619)>>>0;return h%100;}
for(const [boundary,mode] of [[19,'passage'],[20,'exploration'],[54,'exploration'],[55,'interaction']]){
 const d=doc();let seed=0;while(roll(seed,key)!==boundary)seed++;
 const source=clone(seed42);source.generation=createGenerationState(seed);
 await d.open(source);const previous=d.save();assert.equal(previous.map.poiDiscovery[key],undefined);
 d.app().setEditMode(true);d.app().setSelectedHex(coord);d.app().setSelectedPoiKind('portal');const created=d.save();
 assert.equal(created.map.regions[0].pointOfInterestKinds['1,0'],'portal');assert.equal(created.map.poiDiscovery[key],mode);assert.equal(created.map.poiDiscovery[capital],'passage');assert.deepEqual(created.generation,previous.generation);
 const fresh=doc();await fresh.open(created);assert.deepEqual(fresh.save().map.poiDiscovery,created.map.poiDiscovery);console.log('AC1 real portal roll',boundary,'seed',seed,mode,'capital passage; reopened');
}
for(const profile of [false,true])for(const note of ['', '  ⟡ old note\nexact second line  ']){
 const old=clone(seed42);delete old.map.poiDiscovery;old.map.knave=newKnaveLayer();old.map.knave.discoveryByPoi={[portal]:{mode:'interaction',clueText:'Legacy clue sentinel'}};old.ui.knaveEnabled=profile;old.map.gmNotesByHexKey=note?{'0,0':note}:{};
 const d=doc();await d.open(old);const sav=d.save();assert.equal(sav.map.poiDiscovery[portal],'interaction');assert.equal(sav.map.poiDiscovery[village],undefined);assert.deepEqual(sav.map.gmNotesByHexKey??{},old.map.gmNotesByHexKey);assert.ok(!JSON.stringify(sav).includes('Legacy clue sentinel'));
 d.app().setSelectedHex({q:2,r:-1});assert.match(JSON.stringify(d.app().knavePanel),/При прохождении/);
 const re=doc();await re.open(sav);assert.deepEqual(re.save().map,sav.map);d.app().setSelectedHex({q:0,r:0});assert.match(JSON.stringify(d.app().knavePanel),/Секретное место/);
 await d.open(sav);d.app().undoMap();
 const checkpoint=()=>structuredClone([d.app().captureDocument(),d.app().undoHistory,d.app().redoHistory]);const before=checkpoint();assert.ok(before[1].length>0&&before[2].length>0);
 for(const mutation of [s=>s.map.poiDiscovery[portal]='unrecognized',s=>s.map.poiDiscovery['poi:999:0,0']='passage']){
  const invalid=clone(sav);mutation(invalid);await d.open(invalid,false);assert.deepEqual(checkpoint(),before);
 }
 console.log('AC4 old village+secret, comment length',note.length,'Knave',profile,'reload and both invalid imports with populated history passed');
}
for(const profile of [false,true])for(const seed of [3,42,82]){
 const ds=[doc(baseline,seed),doc(candidate,seed),doc(candidate,seed)];
 for(const d of ds)if(profile)d.app().chooseKnaveProfile(true);
 for(let i=0;i<2;i++){
  for(const d of ds){const anchor=i===0?{q:0,r:0}:d.app().candidateHexes[0];const completed=d.app().safelyAddRegionToMap(anchor,{targetSize:18,landType:'wild',coastalPreference:'mainland'});assert.ok(completed.success,JSON.stringify(completed));}
  const [base,head,repeat]=ds.map(d=>d.save());for(const state of [base,head,repeat])delete state.savedAt;
  assert.deepEqual(head,repeat);assert.ok(Object.keys(head.map.poiDiscovery).length);delete head.map.poiDiscovery;assert.deepEqual(head,base);
 }
 console.log('AC5 full export/streams against 94f24f6 and exact repeat after each of 2 regions',seed,profile);
}
process.exit(0);
