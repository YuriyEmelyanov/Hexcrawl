import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';

const biomes = [
  'plain_deciduous_forest', 'plain_mixed_forest', 'plain_coniferous_forest',
  'open_plains', 'swamp_forest', 'swamp', 'deciduous_woodland',
  'mixed_woodland', 'coniferous_woodland', 'semi_desert', 'dead_forest',
  'dead_woodland', 'deciduous_forested_hills', 'mixed_forested_hills',
  'coniferous_forested_hills', 'open_hills', 'hilly_woodland',
  'dead_forested_hills', 'coniferous_mountain_forest', 'mixed_mountain_forest',
  'deciduous_mountain_forest', 'mountains', 'mountain_woodland',
  'dead_mountain_forest'
];
const invalid = new Map([
  ['dead_forest', [4, 6, 10, 16, 19, 20, 21, 22, 23, 24]],
  ['dead_woodland', [19, 20, 21, 22, 23, 24]],
  ['dead_forested_hills', [4, 6, 10]],
  ['dead_mountain_forest', Array.from({ length: 12 }, (_, index) => index + 1)]
]);
const manual = [
  ['desert', 1, 'semi_desert'],
  ['dunes', 1, 'semi_desert'],
  ['lowland_jungle', 1, 'plain_deciduous_forest'],
  ['jungle_hills', 2, 'deciduous_forested_hills'],
  ['jungle_mountains', 3, 'deciduous_mountain_forest'],
  ['savanna', 1, 'open_plains'],
  ['mushroom_forest', 1, 'plain_deciduous_forest'],
  ['snow_plains', 1, 'open_plains'],
  ['snow_hills', 2, 'open_hills'],
  ['snow_mountains', 3, 'mountains'],
];

test('dead forest labels, weights, heights and symmetric neighbour rules', () => {
  const { geometry: rules } = createGenerationHarness(1);
  assert.equal(biomes.length + manual.length, Object.keys(rules.BIOMES).length);
  assert.deepEqual(biomes.map(id => rules.BIOMES[id]?.id), biomes);
  const expected = [
    ['dead_forest', 'Мёртвый лес', 1],
    ['dead_woodland', 'Мёртвое редколесье', 1],
    ['dead_forested_hills', 'Мёртвый лес на холмах', 2],
    ['dead_mountain_forest', 'Мёртвый горный лес', 3]
  ];
  for (const [id, label, height] of expected) {
    assert.equal(rules.BIOMES[id].label, label);
    assert.equal(rules.BIOMES[id].heightLevel, height);
    assert.equal(rules.BIOMES[id].wildWeight, 1);
    assert.equal(rules.BIOMES[id].settledWeight, 0);
    for (const [index, neighbour] of biomes.entries()) {
      const expectedCompatibility = !invalid.get(id).includes(index + 1)
        && !(invalid.get(neighbour)?.includes(biomes.indexOf(id) + 1));
      assert.equal(rules.isBiomesCompatible(id, neighbour, rules.BIOME_COMPATIBILITY_MATRIX), expectedCompatibility, `${id} → ${neighbour}`);
      assert.equal(rules.isBiomesCompatible(neighbour, id, rules.BIOME_COMPATIBILITY_MATRIX), expectedCompatibility, `${neighbour} → ${id}`);
    }
  }
});

test('automatic settled generation never chooses a zero-weight dead forest, even at exact height', () => {
  for (const height of [1, 2, 3]) {
    for (let seed = 1; seed <= 30; seed++) {
      const { geometry: rules } = createGenerationHarness(seed);
      const result = rules.chooseBiomeIdAtHeightLevel('settled', [], seed, height);
      if (result.biomeId) assert.ok(rules.BIOMES[result.biomeId].settledWeight > 0);
    }
  }
});

test('the real region handler stores and restores each dead-forest biome', () => {
  for (const id of invalid.keys()) {
    const h = createGenerationHarness(41);
    h.render().addFallbackTractToMap({ q: 0, r: 0 }, true, { landType: 'wild', biomeId: id });
    const created = h.render();
    assert.equal(created.regions[0].biomeId, id);
    assert.equal(created.regions[0].heightLevel, h.geometry.BIOMES[id].heightLevel);
    const saved = JSON.parse(JSON.stringify(created.createSaveData()));
    h.geometry.assertHexcrawlSaveData(saved);
    created.deleteLastRegion();
    assert.equal(h.render().regions.length, 0);
  }
});

test('manual biomes use existing neighbor profiles and survive generation and JSON import', async () => {
  const profileById = new Map(manual.map(([id, , profile]) => [id, profile]));
  for (const [id, height, profile] of manual) {
    const h = createGenerationHarness(42);
    const { BIOMES, BIOME_COMPATIBILITY_MATRIX: matrix, isBiomesCompatible } = h.geometry;
    assert.equal(BIOMES[id].heightLevel, height, id);
    for (const neighbor of Object.keys(BIOMES)) {
      const other = profileById.get(neighbor) ?? neighbor;
      assert.equal(isBiomesCompatible(id, neighbor, matrix), isBiomesCompatible(profile, other, matrix));
      assert.equal(isBiomesCompatible(neighbor, id, matrix), isBiomesCompatible(other, profile, matrix));
    }
    const generated = h.render().safelyAddRegionToMap({ q: 0, r: 0 }, {
      biomeId: id, coastalPreference: 'mainland', targetSize: 8,
    });
    assert.equal(generated.success, true, id);
    const save = JSON.parse(JSON.stringify(h.render().createSaveData()));
    assert.equal(save.map.regions[0].biomeId, id);
    assert.equal(save.map.regions[0].heightLevel, height);
    const loaded = createGenerationHarness(1);
    loaded.setWindow({alert:message=>assert.fail(message),matchMedia:()=>({matches:false})});
    loaded.injectFunction('readTextFile',async file=>file.text);
    await loaded.render().handleImportJson({target:{files:[{text:JSON.stringify(save)}],value:'fixture'}});
    assert.equal(loaded.render().regions[0]?.biomeId, id);
    for (const neighbor of loaded.render().candidateHexes) {
      if (loaded.render().safelyAddRegionToMap(neighbor, {
        coastalPreference: 'mainland', targetSize: 8,
      }).success) break;
    }
    assert.ok(loaded.render().regions.length > 1, id);
    assert.ok(biomes.includes(loaded.render().regions.at(-1).biomeId), id);
  }
});
