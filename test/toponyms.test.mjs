import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
import { DEFAULT_TOPONYM_MODEL, makeToponym, renameToponym, rerollToponym, synchronizeToponyms, TOPONYM_KINDS, TOPONYM_MODEL_IDS } from '../src/toponyms.ts';
import { GERMANIC_MODEL } from '../src/toponymModels/germanic.ts';

test('one separate Germanic model generates paired names with endings for each feature', () => {
  assert.deepEqual(TOPONYM_MODEL_IDS, ['germanic']);
  assert.equal(GERMANIC_MODEL.id, DEFAULT_TOPONYM_MODEL);
  const names = TOPONYM_KINDS.map((kind) => makeToponym(1729, 'region:7', kind));
  assert.equal(new Set(names.map((name) => name.en)).size, TOPONYM_KINDS.length);
  for (const name of names) {
    assert.match(name.en, /^[\p{Lu}][\p{L} ]+$/u);
    assert.match(name.ru, /^[\p{Lu}][\p{L} ]+$/u);
    assert.equal(name.model, 'germanic');
  }
  assert.deepEqual(makeToponym(1729, 'region:7', 'river'), names[2]);
});

test('many lakes stay unique in both languages and existing names survive growth and order changes', () => {
  const entities = Array.from({ length: 120 }, (_, index) => ({ key: `lake:${index + 1}`, kind: 'lake' }));
  const first = synchronizeToponyms({}, entities.slice(0, 40), 1741);
  const grown = synchronizeToponyms(first, entities, 1741);
  assert.equal(Object.keys(grown).length, 120);
  assert.equal(new Set(Object.values(grown).map((name) => name.en.toLowerCase())).size, 120);
  assert.equal(new Set(Object.values(grown).map((name) => name.ru.toLowerCase())).size, 120);
  assert.deepEqual(synchronizeToponyms(grown, entities.toReversed(), 1741), grown);
  for (const [key, value] of Object.entries(first)) assert.deepEqual(grown[key], value);
  const importedDuplicate = { ...grown, 'lake:2': grown['lake:1'] };
  const cleaned = synchronizeToponyms(importedDuplicate, entities, 1741);
  assert.equal(new Set(Object.values(cleaned).map((name) => name.en)).size, 120);
});

test('reroll preserves the model, renames accept paired values and reject duplicates', () => {
  const entities = [{ key: 'river:1', kind: 'river' }, { key: 'river:2', kind: 'river' }];
  const first = synchronizeToponyms({}, entities, 49);
  const changed = rerollToponym(first, 'river:1', 49);
  assert.equal(changed['river:1'].revision, 1);
  assert.equal(changed['river:1'].model, 'germanic');
  assert.notEqual(changed['river:1'].en, first['river:1'].en);
  assert.deepEqual(changed['river:2'], first['river:2']);
  assert.equal(renameToponym(changed, 'river:1', changed['river:2'].en, 'Новаярека'), null);
  assert.equal(renameToponym(changed, 'river:1', 'New River', changed['river:2'].ru), null);
  assert.equal(renameToponym(changed, 'river:1', '', 'Новаярека'), null);
  const renamed = renameToponym(changed, 'river:1', '  New River  ', '  Новаярека  ');
  assert.equal(renamed['river:1'].en, 'New River');
  assert.equal(renamed['river:1'].ru, 'Новаярека');
});

test('real map handlers save names, keep old names on growth, and restore them on undo', () => {
  const harness = createGenerationHarness(17);
  harness.render().addFallbackTractToMap({ q: 0, r: 0 });
  const before = harness.render();
  assert.ok(before.toponyms['region:1']);
  const oldName = before.toponyms['region:1'];
  const saved = JSON.parse(JSON.stringify(before.createSaveData()));
  assert.deepEqual(saved.map.toponyms.names['region:1'], oldName);
  harness.geometry.assertHexcrawlSaveData(saved);
  const legacy = structuredClone(saved);
  delete legacy.map.toponyms;
  harness.geometry.assertHexcrawlSaveData(legacy);
  before.safelyAddRegionToMap(before.candidateHexes[0], { targetSize: 8 });
  const grown = harness.render();
  assert.deepEqual(grown.toponyms['region:1'], oldName);
  assert.ok(grown.toponyms['region:2']);
  assert.deepEqual(grown.createSaveData().map.toponyms.names, grown.toponyms);
  grown.deleteLastRegion();
  assert.deepEqual(harness.render().toponyms, before.toponyms);
  assert.equal(harness.render().toponymSeed, before.toponymSeed);
});

test('manual edits to old and regenerated regions survive the region history rollback', () => {
  const harness = createGenerationHarness(39);
  harness.render().addFallbackTractToMap({ q: 0, r: 0 });
  const first = harness.render();
  first.safelyAddRegionToMap(first.candidateHexes[0], { targetSize: 8 });
  const before = harness.render();
  const editedFirst = renameToponym(before.toponyms, 'region:1', 'Northwatch', 'Нортвотч');
  const editedBoth = renameToponym(editedFirst, 'region:2', 'Southwatch', 'Саутвотч');
  before.setToponyms(editedBoth);
  const changed = harness.render();
  const lastAnchor = changed.regions.at(-1).anchorHex;
  changed.restoreSnapshot(changed.history.at(-1));
  const rolledBack = harness.render();
  assert.equal(rolledBack.toponyms['region:1'].en, 'Northwatch');
  assert.equal(rolledBack.toponyms['region:2'], undefined);
  rolledBack.safelyAddRegionToMap(lastAnchor, { targetSize: 8, previousToponyms: changed.toponyms });
  const regenerated = harness.render();
  assert.equal(regenerated.toponyms['region:1'].ru, 'Нортвотч');
  assert.equal(regenerated.toponyms['region:2'].en, 'Southwatch');
});
