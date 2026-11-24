import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Run with Node 24, a checkout with npm ci, and an optional existing output directory.
const root = resolve(process.argv[2] ?? '.');
const output = process.argv[3];
const sha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const {createGenerationHarness} = await import(pathToFileURL(join(root, 'test/helpers/generation-harness.mjs')));
const h = createGenerationHarness(1);
const app = () => h.render();
function documentOf(harness) {
  const value = JSON.parse(JSON.stringify(harness.render().createSaveData()));
  delete value.savedAt;
  return value;
}
async function reopen(value) {
  const fresh = createGenerationHarness(7);
  fresh.render();
  fresh.injectFunction('readTextFile', async file => file.text);
  const text = JSON.stringify({...value, savedAt:new Date().toISOString()});
  await fresh.render().handleImportJson({target:{files:[{text}],value:''}});
  return documentOf(fresh);
}
for (const anchor of [{q:0,r:0},{q:1,r:-1}]) {
  assert(app().safelyAddRegionToMap(anchor,{targetSize:8,coastalPreference:'mainland'}).success);
}

const g=h.geometry;
const map=documentOf(h).map;
const corners=c=>g.getHexCornerPoints(c).map(v=>v.key);
const owners=key=>map.regions.flatMap(r=>r.hexes.filter(c=>corners(c).includes(key)).map(cell=>({region:r.id,cell})));
const eligibility=g.riverFeatureEligibility(map.rivers,map.regions,new Map(Object.entries(map.terrainByHexKey)),map.crossings);
const river=map.rivers.find(r=>r.regionId===1);
const target=river.vertexPath.find(v=>eligibility.waterfall(v.key)&&owners(v.key).length===3&&owners(v.key).every(x=>x.region===1));
assert(target,'expected interior vertex');
const key=target.key;
const shown=()=>app().riverWaterfalls.some(w=>w.vertexKey===key);
const initial=shown();
const state=initial?'off':'on';
assert(app().editRiverFeatures([{type:'waterfall',vertexKey:key,state}]));
const before=documentOf(h);
const beforeVisible=shown();
assert.notEqual(beforeVisible,initial);
app().regenerateLastRegion();
assert(app().pendingRegen);
app().finishPendingRegeneration();
assert(!app().generationError);
const after=documentOf(h);
const afterVisible=shown();
const details=doc=>{
 const m=doc.map;
 const support=m.regions.flatMap(r=>r.hexes.filter(c=>corners(c).includes(key)).map(cell=>({region:r.id,cell})));
 return {support,riverIds:m.rivers.filter(r=>r.vertexPath.some(v=>v.key===key)).map(r=>r.id),eligible:g.riverFeatureEligibility(m.rivers,m.regions,new Map(Object.entries(m.terrainByHexKey)),m.crossings).waterfall(key),manual:m.riverFeatures.waterfalls.find(w=>w.vertexKey===key)?.state??null};
};
app().undoMap();
const undoExact=isDeepStrictEqual(documentOf(h),before);
app().redoMap();
const redoExact=isDeepStrictEqual(documentOf(h),after);
const report={sha,seed:1,key,initial,state,beforeVisible,afterVisible,before:details(before),after:details(after),regionSizes:[before,after].map(d=>d.map.regions[1].hexes.length),undoExact,redoExact};
for(const [label,doc] of Object.entries({before,after})){
 report[label+'ReopensExactly']=isDeepStrictEqual(await reopen(doc),doc);
 if(output)writeFileSync(join(output,label+'.json'),JSON.stringify({...doc,savedAt:new Date().toISOString()}));
}
console.log(JSON.stringify(report,null,2));
