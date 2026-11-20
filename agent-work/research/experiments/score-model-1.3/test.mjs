import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {measure,report} from './calculate.mjs';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url)));
const b=await read('baseline.json'), prs=await read('pr-history.json');
const score=report(b);
assert.equal(b.top20.length,new Set(b.top20).size);
assert.equal(b.top20.length,20);
assert.equal(measure([]).confirmed_pct,null);
assert.deepEqual([measure([{id:'u',status:'unknown'}]).upper_pct,measure([{id:'a',status:'absent'}]).upper_pct],[100,0]);
assert.throws(()=>measure([{id:'x',status:'full'},{id:'x',status:'full'}]));
const before=structuredClone(b);
const snow=before.rules.find(r=>r.id==='PF2-RM-044-L1-v2');
assert.equal(snow.status,'full');snow.status='absent';
assert.ok(Math.abs(score[0].top20_confirmed_floor_pct-report(before)[0].top20_confirmed_floor_pct-5/29)<1e-10);
const extra=structuredClone(b);
extra.common.find(x=>x.id==='physical-grid').cases.push('fail');
assert.equal(report(extra)[0].common.confirmed_pct,65);
assert.equal(prs.length,10);
for(const p of prs){
  for(const fact of p.delta_common)assert.ok(b.common.some(x=>x.id===fact.id));
  for(const fact of p.delta_game)assert.ok(b.rules.some(x=>x.id===fact.id));
}
assert.equal(prs.find(x=>x.pr===508).delta_common.length,0);
assert.equal(prs.filter(x=>x.delta_game.length).length,1);
console.log('PASS: unique units, unknown, empty corpus, fixed-cohort marginal effect, 60-mile revision, PR attribution');
