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
const key = '0,0';
function fields(doc) {
  const region = doc.map.regions.find(r => r.id === 1);
  return {
    instances: region.pointsOfInterest.filter(p => p.q === 0 && p.r === 0).length,
    poiType: region.pointOfInterestKinds?.[key] ?? null,
    biomeOverride: doc.map.biomeOverrideByHexKey[key] ?? null,
    note: doc.map.gmNotesByHexKey[key] ?? null,
  };
}
for (const anchor of [{q:0,r:0},{q:1,r:-1}]) {
  assert(app().safelyAddRegionToMap(anchor,{targetSize:8,coastalPreference:'mainland'}).success);
}
app().setSelectedHex({q:0,r:0});
app().setEditMode(true);
const note = 'У статуи два следа.\nОдин уходит к реке.';
app().setSelectedPoiKind('ruins');
app().setSelectedHexBiomeOverride('snow_plains');
app().changeNotesText(key,note);
app().finishNotesGroup();
const before = documentOf(h);
const expected = {instances:1,poiType:'ruins',biomeOverride:'snow_plains',note};
assert.deepEqual(fields(before),expected,'Fixture must contain every authored value before reroll');
app().regenerateLastRegion();
assert(app().pendingRegen);
app().finishPendingRegeneration();
const after = documentOf(h);
const actual = fields(after);
const checks = Object.fromEntries(Object.keys(expected).map(k => [k, actual[k] === expected[k]]));
checks.secondRegionChanged = !app().generationError && after.map.regions.length === 2 &&
  after.map.regions[1].id === before.map.regions[1].id &&
  !isDeepStrictEqual(before.map.regions[1].hexes,after.map.regions[1].hexes);
app().undoMap();
checks.oneUndoRestoresBefore = isDeepStrictEqual(documentOf(h),before);
app().redoMap();
checks.oneRedoRestoresAfter = isDeepStrictEqual(documentOf(h),after);
for (const [label,doc] of Object.entries({before,after})) {
  checks[label+'ReopensExactly'] = isDeepStrictEqual(await reopen(doc),doc);
  if (output) writeFileSync(join(output,label+'.json'),JSON.stringify({...doc,savedAt:new Date().toISOString()}));
}
const failed = Object.keys(checks).filter(k => !checks[k]);
console.log(JSON.stringify({sha,seed:1,key,region:1,secondRegionSizes:[before,after].map(s=>s.map.regions[1].hexes.length),expected,actual,checks,failed},null,2));
if (failed.length) process.exitCode = 1;
