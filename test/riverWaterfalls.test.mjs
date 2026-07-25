import assert from 'node:assert/strict';
import test from 'node:test';

import { canHaveRiverWaterfall, getRiverWaterfallChance, hasRiverWaterfall } from '../src/riverWaterfalls.ts';

const eligible = { fullness: 1, heightLevel: 3, isRiverStart: false, isConfluence: false, touchesLake: false };

test('permits waterfalls at every height away from river starts, lakes, and confluences', () => {
  for (const heightLevel of [1, 2, 3]) {
    assert.equal(canHaveRiverWaterfall({ ...eligible, heightLevel }), true);
  }
  assert.equal(canHaveRiverWaterfall({ ...eligible, isRiverStart: true }), false);
  assert.equal(canHaveRiverWaterfall({ ...eligible, isConfluence: true }), false);
  assert.equal(canHaveRiverWaterfall({ ...eligible, touchesLake: true }), false);
});

test('calculates waterfall chance from height and river fullness', () => {
  const expectedChances = {
    1: [0.2, 0.06, 0.02, 0.004, 0.005],
    2: [5, 2, 0.6, 0.1, 0.01],
    3: [30, 15, 5, 1, 0.1]
  };

  for (const [heightLevel, chances] of Object.entries(expectedChances)) {
    for (const [index, chance] of chances.entries()) {
      assert.equal(getRiverWaterfallChance({ ...eligible, fullness: index + 1, heightLevel: Number(heightLevel) }), chance);
    }
  }
});

test('selects a waterfall only when the roll is below its calculated chance', () => {
  const context = { ...eligible, fullness: 2 };
  assert.equal(hasRiverWaterfall(context, () => 0.1499), true);
  assert.equal(hasRiverWaterfall(context, () => 0.15), false);
});
