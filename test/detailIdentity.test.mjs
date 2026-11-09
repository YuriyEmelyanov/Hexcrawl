import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDetailPoiIdentities,reconcileDetailPoiIdentities,assertDetailPoiOwners} from '../src/detailIdentity.ts';
import {poiNameLocators} from '../src/manualPois.ts';
import {regionFixture} from './helpers/region-fixture.mjs';
// DTL-09/21/23: a locator is not persistent identity, and deleted identities must
// not be allocated to the next occupant. Geometry/parser cases do not cover it.
test('DETAIL1 live POI identities survive explicit moves, reject collisions and never recycle deleted IDs',()=>{
 const raw=regionFixture(),doc={regions:raw.map.regions,waterPoiByKey:new Map()},live=poiNameLocators(doc,true),alias=[...live][0];
 const random=Math.random;Math.random=()=>{throw Error('Identity must not consume RNG');};
 try {
  const first=reconcileDetailPoiIdentities(live),before=structuredClone(first);assert.equal(first.byLegacyRef[alias],'detail-poi:1');assert.equal(first.nextId,2);
  assert.equal(reconcileDetailPoiIdentities(live,first),first);assert.deepEqual(first,before);
  const moved='poi:2:3,0',second=reconcileDetailPoiIdentities(new Set([moved]),first,new Map([[alias,moved]]));assert.equal(second.byLegacyRef[moved],first.byLegacyRef[alias]);
  const returned=reconcileDetailPoiIdentities(new Set([moved,alias]),second);assert.equal(returned.byLegacyRef[alias],'detail-poi:2');assert.equal(returned.nextId,3);
  const deleted=reconcileDetailPoiIdentities(new Set([moved]),returned,new Map([[alias,null]]));const reborn=reconcileDetailPoiIdentities(new Set([moved,alias]),deleted);assert.equal(reborn.byLegacyRef[alias],'detail-poi:3');
  for(const bad of [()=>reconcileDetailPoiIdentities(new Set([moved]),first),()=>reconcileDetailPoiIdentities(new Set([moved]),returned,new Map([[alias,moved]])),()=>reconcileDetailPoiIdentities(live,first,new Map([['poi:999:0,0',alias]])),()=>assertDetailPoiOwners(first,new Set()),()=>parseDetailPoiIdentities({...first,nextId:1}),()=>parseDetailPoiIdentities({...first,byLegacyRef:{[alias]:'detail-poi:01'}}),()=>parseDetailPoiIdentities({...first,byLegacyRef:{'waterPoi:-0,0':'detail-poi:1'}}),()=>reconcileDetailPoiIdentities(live,{version:1,nextId:Number.MAX_SAFE_INTEGER,byLegacyRef:{}})])assert.throws(bad);
  const collision=structuredClone(doc);collision.regions[0].centerHex={...collision.regions[0].pointsOfInterest[0]};collision.regions[0].suppressCentralPoi=false;collision.regions[0].centralPoiKind='town';
  assert.throws(()=>poiNameLocators(collision,true));assert.equal(poiNameLocators(collision).has(alias),false,'existing name enumeration remains compatible');
  assert.deepEqual(first,before);assert.ok(Object.isFrozen(first.byLegacyRef));assertDetailPoiOwners(reborn,new Set([alias,moved]));
 } finally {Math.random=random;}
});
