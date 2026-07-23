import assert from 'node:assert/strict';
import test from 'node:test';

import { getRiverRapidsChance, hasRiverRapids } from '../src/riverRapids.ts';

test('calculates rapids chance from fullness and height multipliers', () => {
  assert.equal(getRiverRapidsChance({ fullness: 5, heightLevel: 1 }), 1);
  assert.equal(getRiverRapidsChance({ fullness: 4, heightLevel: 1 }), 2);
  assert.equal(getRiverRapidsChance({ fullness: 3, heightLevel: 1 }), 3);
  assert.equal(getRiverRapidsChance({ fullness: 2, heightLevel: 1 }), 4);
  assert.equal(getRiverRapidsChance({ fullness: 1, heightLevel: 1 }), 5);
  assert.equal(getRiverRapidsChance({ fullness: 2, heightLevel: 2 }), 12);
  assert.equal(getRiverRapidsChance({ fullness: 1, heightLevel: 3 }), 30);
});

test('selects rapids when the roll is below the calculated chance', () => {
  const context = { fullness: 1, heightLevel: 3 };
  assert.equal(hasRiverRapids(context, () => 0.299), true);
  assert.equal(hasRiverRapids(context, () => 0.3), false);
});
