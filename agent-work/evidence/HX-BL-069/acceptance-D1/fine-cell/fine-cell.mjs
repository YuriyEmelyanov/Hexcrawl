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

const cell = {q:0,r:0};
assert(app().switchFineStep(1), app().automaticFineError);
assert(app().pickFine(cell,false,app().getDocumentRevision()));
assert(app().editOneMileCell(cell,{name:'Тайная поляна',note:'Здесь спрятан ключ.',landBiomeId:'open_hills'},app().getDocumentRevision(),'ru'));
assert(app().switchFineStep(6));
app().setSelectedHex(cell);
app().setSelectedHexBiomeOverride('snow_plains');
app().changeNotesText('0,0','Северный тракт');
app().finishNotesGroup();
const before = documentOf(h);
assert.equal(before.map.biomeOverrideByHexKey['0,0'],'snow_plains');
const fields = doc => doc.map.physicalGrid?.fineCellEdits?.['0,0'] ?? null;
assert.equal(fields(before).name.ru,'Тайная поляна');
assert.equal(fields(before).note,'Здесь спрятан ключ.');
app().regenerateLastRegion();
assert(app().pendingRegen);
app().finishPendingRegeneration();
const after = documentOf(h);
const report = {sha,seed:1,cell, before:fields(before),after:fields(after),
 parentBiomes:[before,after].map(d=>d.map.biomeOverrideByHexKey?.['0,0']??null),
 parentNotes:[before,after].map(d=>d.map.gmNotesByHexKey?.['0,0']??null),
 error:app().generationError?.reason??null,
 regionSizes:[before,after].map(d=>d.map.regions[1].hexes.length),
 owners:[before,after].map(d=>d.map.regions.filter(r=>r.hexes.some(c=>c.q===0&&c.r===0)).map(r=>r.id))};
if(!app().generationError){
 app().undoMap(); report.undoExact=isDeepStrictEqual(documentOf(h),before);
 app().redoMap(); report.redoExact=isDeepStrictEqual(documentOf(h),after);
}
for(const [label,doc] of Object.entries({before,after})){
 report[label+'ReopensExactly']=isDeepStrictEqual(await reopen(doc),doc);
 if(output)writeFileSync(join(output,label+'.json'),JSON.stringify({...doc,savedAt:new Date().toISOString()}));
}
console.log(JSON.stringify(report,null,2));
