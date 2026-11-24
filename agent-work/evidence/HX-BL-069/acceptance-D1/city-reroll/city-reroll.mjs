import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
const [root,fixture,out,placement='border']=process.argv.slice(2);
assert(['border','interior'].includes(placement));
const {createGenerationHarness}=await import(pathToFileURL(resolve(root,'test/helpers/generation-harness.mjs')));
const start=JSON.parse(fs.readFileSync(fixture,'utf8'));
const h=createGenerationHarness(1), app=()=>h.render();
function snapshot(h){const s=JSON.parse(JSON.stringify(h.render().createSaveData()));delete s.savedAt;return s;}
async function load(h,s){
 h.render();h.injectFunction('readTextFile',async f=>f.text);
 h.setWindow({confirm:()=>true,alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify({...s,savedAt:new Date().toISOString()})}],value:''}});
}
start.map.regions=start.map.regions.filter(r=>r.id===1);
delete start.map.toponyms.names['region:2'];
start.map.candidateHexes=h.geometry.getCandidateHexes(start.map.regions[0].hexes,new Set());
const border = structuredClone(start.map.physicalGrid.poiFootprints[0]);
const inner = start.map.physicalGrid.poiFootprints[0];
inner.worldAnchor.x -= 3;
inner.cells.forEach(c => { c.q -= 3; });
start.generation = {...start.generation, masterSeed:6, streams:{geography:6,poi:6}};
await load(h,start);
const original=snapshot(h);
assert.equal(original.map.regions.length,1);
assert.equal(app().history.length,0);
const added=app().safelyAddRegionToMap({q:3,r:0},{targetSize:8,coastalPreference:'mainland'});
assert(added.success,JSON.stringify(added));
const doc = app().captureDocument();
const grid = doc.map.physicalGrid;
assert(grid);
const index = grid.poiFootprints.findIndex(fp => fp.poiId === border.poiId);
assert(index >= 0);
const footprints = grid.poiFootprints.map((fp,i) => i === index && placement === 'border' ? border : fp);
app().applyDocument({...doc,map:{...doc.map,physicalGrid:{...grid,poiFootprints:footprints}}});
const before=snapshot(h);
assert.equal(app().history.length,1);
const id='detail-poi:1',key='poi:1:2,0';
function city(s){
 const grid=s.map.physicalGrid;
 return {id:grid.poiIdentities.byLegacyRef[key],footprint:grid.poiFootprints.find(p=>p.poiId===id),
 name:s.map.toponyms.names['settlement:1:2,0'],note:s.map.gmNotesByHexKey['2,0']};
}
function neighbor(s){return s.map.regions.find(r=>r.id===2);}
function covers(r){return r?.hexes.some(h=>h.q===3&&h.r===0);}
if(placement === 'border') assert.deepEqual(city(before).footprint,border);
assert(covers(neighbor(before)));
const history = () => JSON.stringify([app().history,app().undoHistory,app().redoHistory],(_,v)=>v instanceof Map ? [...v.entries()] : v instanceof Set ? [...v] : v);
const historyBefore = history();
app().regenerateLastRegion();assert(app().pendingRegen);app().finishPendingRegeneration();
const after=snapshot(h);
const diagnostic = app().generationError;
const report={placement,generationError:diagnostic && {reason:diagnostic.reason,result:diagnostic.result,stage:diagnostic.stage},
 documentPreserved:isDeepStrictEqual(before,after), historyPreserved:historyBefore===history(),historyAfterImport:0,historyBeforeReroll:1,
 beforeSize:neighbor(before)?.hexes.length,afterSize:neighbor(after)?.hexes.length,
 regionChanged:!isDeepStrictEqual(neighbor(before),neighbor(after)),neighborCoversBoundary:[before,after].map(s=>covers(neighbor(s))),
 city:city(before),cityAfter:city(after),cityPreserved:isDeepStrictEqual(city(before),city(after))};
if(report.regionChanged){app().undoMap();report.undoExact=isDeepStrictEqual(snapshot(h),before);app().redoMap();report.redoExact=isDeepStrictEqual(snapshot(h),after);}
for(const [label,s] of Object.entries({before,after})){
 fs.writeFileSync(join(out,label+'.json'),JSON.stringify({...s,savedAt:new Date().toISOString()}));
 const fresh=createGenerationHarness(2);await load(fresh,s);report[label+'ImportExact']=isDeepStrictEqual(snapshot(fresh),s);
}
console.log(JSON.stringify(report,null,2));
