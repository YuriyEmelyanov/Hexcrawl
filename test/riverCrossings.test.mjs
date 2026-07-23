import assert from 'node:assert/strict';
import test from 'node:test';

import { chooseRiverCrossingKind, getBridgeChance } from '../src/riverCrossings.ts';

const settledPlainRoad = { fullness: 1, heightLevel: 1, biomeLandType: 'settled', roadKind: 'road' };

test('calculates bridge chance from all applicable modifiers', () => {
  assert.equal(getBridgeChance(settledPlainRoad), 70);
  assert.equal(getBridgeChance({ fullness: 4, heightLevel: 2, biomeLandType: 'wild', roadKind: 'trail' }), 20);
});

test('splits non-bridge crossings between ferry and ford with modifiers', () => {
  const rolls = [0.99, 0.59];
  assert.equal(chooseRiverCrossingKind({ ...settledPlainRoad, fullness: 2, heightLevel: 2 }, () => rolls.shift()), 'ferry');

  const wildTrailRolls = [0.99, 0.01];
  assert.equal(chooseRiverCrossingKind({ ...settledPlainRoad, biomeLandType: 'wild', roadKind: 'trail' }, () => wildTrailRolls.shift()), 'ford');
});

test('fullness three and above selects a ferry from the non-bridge remainder', () => {
  assert.equal(chooseRiverCrossingKind({ ...settledPlainRoad, fullness: 3 }, () => 0), 'bridge');
  assert.equal(chooseRiverCrossingKind({ ...settledPlainRoad, fullness: 3 }, () => 0.99), 'ferry');
  assert.equal(chooseRiverCrossingKind({ ...settledPlainRoad, fullness: 5 }, () => 0.99), 'ferry');
});
