import assert from 'node:assert/strict';
import test from 'node:test';

import { getOutgoingConnectorFullnessFromEndpoint } from '../src/riverFullness.ts';

test('outgoing connector keeps endpoint fullness', () => {
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(2), 2);
  assert.equal(getOutgoingConnectorFullnessFromEndpoint(3), 3);
});

