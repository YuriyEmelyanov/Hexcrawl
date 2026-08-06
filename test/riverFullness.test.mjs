import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getOutgoingConnectorFullnessFromEndpoint,
  shouldReduceMainRiverUpstreamBeforeConfluence,
} from '../src/riverFullness.ts';

test('outgoing connector keeps endpoint fullness', () => {
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(2), 2);
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(3), 3);
});

test('reduces a height-one main river upstream when a fullness-one tributary joins it', () => {
  assert.equal(shouldReduceMainRiverUpstreamBeforeConfluence(1, [1]), true);
  assert.equal(shouldReduceMainRiverUpstreamBeforeConfluence(1, [2]), false);
});

test('keeps the existing height-two upstream reduction for any tributary', () => {
  assert.equal(shouldReduceMainRiverUpstreamBeforeConfluence(2, [1]), true);
  assert.equal(shouldReduceMainRiverUpstreamBeforeConfluence(2, [2]), true);
  assert.equal(shouldReduceMainRiverUpstreamBeforeConfluence(2, []), false);
});
