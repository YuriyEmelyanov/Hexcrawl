import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const [root, evidence] = process.argv.slice(2);
const {createGenerationHarness} = await import(pathToFileURL(resolve(root,'test/helpers/generation-harness.mjs')));
const data = JSON.parse(await readFile(evidence));
const save = h => JSON.parse(JSON.stringify(h.render().createSaveData()));
const reopen = async (h, doc) => {
  h.injectFunction('readTextFile', async f=>f.text);
  await h.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:'map'}});
  const again = save(h);
  assert.deepEqual(again.map,doc.map);
  assert.deepEqual(again.generation,doc.generation);
};
const results=[];
for (const [i,[seed,ms,n1,n2,key]] of data.extension.entries()){
  const h=createGenerationHarness(seed,'','en');
  h.render().setSeedInput(String(seed));
  h.render().applyWorldSeed();
  h.render().setGenSizeCategory('locality');
  function add(hex) {
    const a=h.render();
    const options={...a.buildGenerationOptions(),biomeId:'dunes'};
    const result=a.safelyAddRegionToMap(hex,options);
    assert.equal(result.success,true);
  }
  add({q:0,r:0});const first=save(h);
  assert.equal(first.map.regions[0].hexes.length,n1);
  const [q,r]=key.split(',').map(Number);
  add({q,r});const second=save(h);
  assert.equal(second.map.regions.length,2);
  assert.equal(second.map.regions.flatMap(r=>r.hexes).length,n2);
  assert.deepEqual(second.map.regions[0],first.map.regions[0]);
  h.render().undoMap();assert.deepEqual(save(h).map,first.map);
  h.render().redoMap();assert.deepEqual(save(h).map,second.map);
  await reopen(createGenerationHarness(1,'','en'),first);
  await reopen(createGenerationHarness(2,'','en'),second);
  results.push([seed,n1,n2]);
}
console.log(JSON.stringify({passed:results.length,cells:results}));
