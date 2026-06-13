import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getInteriorSourceFullnessForOutgoingRiver,
  getOutgoingConnectorFullnessFromEndpoint,
} from '../src/riverFullness.ts';

test('height-3 outgoing fullness 2 gets an interior upstream segment with fullness 1', () => {
  assert.equal(getInteriorSourceFullnessForOutgoingRiver(2), 1);
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(2, false), 1);
});

test('height-3 outgoing fullness 3 gets an interior upstream segment with fullness 2', () => {
  assert.equal(getInteriorSourceFullnessForOutgoingRiver(3), 2);
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(3, false), 2);
});

test('lake-connected outgoing river keeps downstream fullness', () => {
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(2, true), 2);
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(3, true), 3);
});
