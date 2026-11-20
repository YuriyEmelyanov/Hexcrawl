import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

function points(rank) {
  return Math.max(0, 101 - rank) * 10;
}

// Inputs are deduplicated applications in one documented market and period.
// Equal audiences share their competition rank. null upper means unbounded.
export function assess({ours, rivals, unseenMax}) {
  function validCount(n) { return Number.isSafeInteger(n) && n >= 0; }
  if (!Array.isArray(rivals) || (unseenMax !== null && !validCount(unseenMax)))
    throw new Error('invalid competitor coverage');
  for (const v of [ours, ...rivals]) {
    if (!validCount(v.min) || (v.max !== null && (!validCount(v.max) || v.max < v.min)))
      throw new Error('invalid audience bounds');
  }
  if (ours.max === 0) return {rank:null, points:[0,0], status:'no_users'};
  const best = 1 + rivals.filter(v => ours.max !== null && v.min > ours.max).length;
  const worst = unseenMax === null ? null :
    1 + unseenMax + rivals.filter(v => v.max === null || v.max > ours.min).length;
  const proven = ours.min === 0 || worst === null ? 0 : points(worst);
  return {rank:[best,worst], points:[proven,points(best)], status:
    ours.min === 0 ? 'use_unconfirmed' : worst === best ? 'exact' : 'bounded_or_open'};
}

if (process.argv[2] === '--test') {
  assert.deepEqual([101,100,99,50,2,1].map(points), [0,10,20,510,990,1000]);
  const exact = n => ({min:n,max:n});
  const check = (ours,rivals,unseenMax) => assess({ours,rivals,unseenMax});
  // Synthetic disjoint audiences: leader has 20 of 100, four rivals have 19 each, one has 4.
  assert.equal(check(exact(20),[19,19,19,19,4].map(exact),0).points[0],1000);
  assert.deepEqual(check(exact(15),[exact(15),exact(14)],0).rank,[1,1]);
  assert.deepEqual(check(exact(20),Array(99).fill(exact(21)),0).points,[10,10]);
  assert.deepEqual(check(exact(20),Array(100).fill(exact(21)),null).points,[0,0]);
  assert.deepEqual(check({min:20,max:null},[{min:10,max:null}],null).points,[0,1000]);
  assert.deepEqual(check(exact(20),Array(98).fill(exact(21)),1).points,[10,20]);
  assert.equal(check(exact(0),[],0).status,'no_users');
  assert.equal(check({min:0,max:null},[],null).status,'use_unconfirmed');
  console.log('OK');
} else if (process.argv[2]) {
  console.log(JSON.stringify(assess(JSON.parse(readFileSync(process.argv[2],'utf8')))));
}
