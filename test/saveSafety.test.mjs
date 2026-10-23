import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
const h = createGenerationHarness(42);
h.render().addFallbackTractToMap({q:0,r:0});
const valid = JSON.parse(JSON.stringify(h.render().createSaveData()));
const cases = {
  'road wrong structure': d => d.map.roads.push({id:1,regionId:1,segments:'broken'}),
  'fractional axial': d => d.map.regions[0].hexes[0].q = 0.5,
  'duplicate region id': d => d.map.regions.push(structuredClone(d.map.regions[0])),
  'invalid region enum': d => d.map.regions[0].biomeId = 'not-a-biome',
  'noncanonical terrain key': d => d.map.terrainByHexKey['0,0suffix'] = {},
  'wrong rotation type': d => d.ui.isMapRotated = 'false',
  'wrong scale type': d => d.ui.mapScale = '2',
  'unsafe next road counter': d => d.counters.nextRoadId = Number.MAX_SAFE_INTEGER+1,
  'dangling water POI': d => d.map.waterPoiByHexKey['500,500'] = 'shipwreck',
};
for (const [name, mutate] of Object.entries(cases)) test(`reject ${name}`, () => {
  const data = structuredClone(valid); mutate(data);
  assert.throws(() => h.geometry.assertHexcrawlSaveData(data), undefined, name);
});
for (const filename of ['lake-reentry-map','sea-pocket-map','terrain-display-map','road-entry-zigzags']) {
  test(`supported corpus: ${filename}`, () => {
    const data = JSON.parse(fs.readFileSync(new URL(`./fixtures/${filename}.json`, import.meta.url)));
    assert.doesNotThrow(() => h.geometry.assertHexcrawlSaveData(data));
  });
}
