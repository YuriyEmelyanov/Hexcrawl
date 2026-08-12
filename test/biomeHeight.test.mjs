import test from 'node:test';
import assert from 'node:assert/strict';

import { getOnlyOutgoingRiversPreferredHeight } from '../src/biomeHeight.ts';

test('prefers one level above the highest neighbour for only outgoing rivers', () => {
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 1 }
  ]), 2);
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 2 }
  ]), 3);
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 1 },
    { endpointType: 'start', touchingHeight: 2 }
  ]), 3);
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 3 }
  ]), 3);
});

test('prefers height one when a full river flows into a height-one neighbour', () => {
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 1, fullness: 3 }
  ]), 1);
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 1, fullness: 5 },
    { endpointType: 'start', touchingHeight: 2, fullness: 1 }
  ]), 1);
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 1, fullness: 2 }
  ]), 2);
});

test('does not apply the preference without rivers or with an incoming river', () => {
  assert.equal(getOnlyOutgoingRiversPreferredHeight([]), undefined);
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start', touchingHeight: 1 },
    { endpointType: 'end', touchingHeight: 2 }
  ]), undefined);
});

test('keeps the normal fallback when no neighbouring height is known', () => {
  assert.equal(getOnlyOutgoingRiversPreferredHeight([
    { endpointType: 'start' }
  ]), undefined);
});
