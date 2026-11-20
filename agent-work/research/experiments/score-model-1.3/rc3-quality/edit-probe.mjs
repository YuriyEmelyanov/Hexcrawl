import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=process.argv[2];
if(!root) throw Error('Pass the directory of the published product checkout.');
const hashes=JSON.parse(await readFile(new URL('source-hashes.json',import.meta.url)));
const inputs=Object.entries(hashes).filter(([p])=>p.startsWith('src/')||['test/helpers/generation-harness.mjs','test/helpers/region-fixture.mjs'].includes(p));
for(const [p,h] of inputs){
  const body=await readFile(resolve(root,p));
  assert.equal(createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex'),h,p);
}
const lib=p=>import(pathToFileURL(resolve(root,p)).href);
const {createGenerationHarness}=await lib('test/helpers/generation-harness.mjs');
const {regionFixture}=await lib('test/helpers/region-fixture.mjs');
const {manualBiome}=await lib('src/rendering/manualBiomes.ts');
const rows=[];
for(let seed=42;seed<62;seed++){
  const h=createGenerationHarness(seed);
  h.setWindow({alert:m=>{throw Error(m)},confirm:()=>true});
  h.injectFunction('readTextFile',async file=>file.text);
  const reopen=doc=>h.render().handleImportJson({target:{files:[{text:JSON.stringify(doc)}],value:''}});
  await reopen(regionFixture());
  const before=JSON.parse(JSON.stringify(h.render().createSaveData()));
  h.render().setEditMode(true);h.render().setSelectedHex({q:2,r:0});
  const start=performance.now();
  h.render().setSelectedHexBiomeOverride('snow_mountains');
  const doc=JSON.parse(JSON.stringify(h.render().createSaveData()));
  const elapsed=performance.now()-start;
  const expected={...before.map,biomeOverrideByHexKey:{...before.map.biomeOverrideByHexKey,'2,0':'snow_mountains'}};
  assert.deepEqual(doc.map,expected);
  await reopen(doc);
  const reopened=JSON.parse(JSON.stringify(h.render().createSaveData()));
  assert.deepEqual(reopened.map,expected);assert.deepEqual(reopened.generation,doc.generation);
  const v=manualBiome(reopened.map.biomeOverrideByHexKey['2,0']);
  assert.deepEqual([v.height,v.neighborProfile,v.terrain],[3,'mountains','snow_ice']);
  rows.push(elapsed);
}
console.log(JSON.stringify({release:'d6daa2cdbc1c17b942d51fe050fac51752cf9fee',input_blobs_verified:inputs.length,fixture:'regionFixture, cell 2,0, 20 repeats of same document in fresh harnesses',target:'PF2-RM-044-L1-v2',before_after_only_target_changed:true,json_roundtrip:true,component_ms:rows,p95_component_ms:[...rows].sort((a,b)=>a-b)[18],visible_ms:null},null,2));
