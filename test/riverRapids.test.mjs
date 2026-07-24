import assert from 'node:assert/strict';
import test from 'node:test';

import { getRiverRapidsChance, hasRiverRapids } from '../src/riverRapids.ts';

test('calculates rapids chance from the height and fullness threshold table', () => {
  const expectedChances = {
    1: [10, 5, 2, 1, 0.1],
    2: [50, 35, 20, 100, 2],
    3: [90, 80, 60, 30, 10]
  };

  for (const [heightLevel, chances] of Object.entries(expectedChances)) {
    for (const [index, chance] of chances.entries()) {
      assert.equal(getRiverRapidsChance({ fullness: index + 1, heightLevel: Number(heightLevel) }), chance);
    }
  }
});

test('selects rapids when the roll is below the calculated chance', () => {
  const context = { fullness: 3, heightLevel: 3 };
  assert.equal(hasRiverRapids(context, () => 0.599), true);
  assert.equal(hasRiverRapids(context, () => 0.6), false);
});
