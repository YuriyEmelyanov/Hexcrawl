import assert from 'node:assert/strict';
import test from 'node:test';

import { RIVER_WATERFALL_CHANCE, canHaveRiverWaterfall, hasRiverWaterfall } from '../src/riverWaterfalls.ts';

test('only permits waterfalls in height-three biomes away from river starts, lakes, and confluences', () => {
  assert.equal(canHaveRiverWaterfall({ heightLevel: 3, isRiverStart: false, isConfluence: false, touchesLake: false }), true);
  assert.equal(canHaveRiverWaterfall({ heightLevel: 2, isRiverStart: false, isConfluence: false, touchesLake: false }), false);
  assert.equal(canHaveRiverWaterfall({ heightLevel: 3, isRiverStart: true, isConfluence: false, touchesLake: false }), false);
  assert.equal(canHaveRiverWaterfall({ heightLevel: 3, isRiverStart: false, isConfluence: true, touchesLake: false }), false);
  assert.equal(canHaveRiverWaterfall({ heightLevel: 3, isRiverStart: false, isConfluence: false, touchesLake: true }), false);
});

test('uses a fifteen-percent waterfall probability for eligible vertices', () => {
  const context = { heightLevel: 3, isRiverStart: false, isConfluence: false, touchesLake: false };
  assert.equal(RIVER_WATERFALL_CHANCE, 15);
  assert.equal(hasRiverWaterfall(context, () => 0.1499), true);
  assert.equal(hasRiverWaterfall(context, () => 0.15), false);
});
