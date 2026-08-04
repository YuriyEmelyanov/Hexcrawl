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
