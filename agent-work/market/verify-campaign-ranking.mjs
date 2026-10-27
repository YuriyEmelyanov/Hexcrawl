// Usage: node verify-campaign-ranking.mjs path/to/campaign-vtt-ranking-2026-10-27.json
import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
assert.equal(d.rows.length,53);assert.equal(new Set(d.rows.map(x=>x.id)).size,53);
const computed=d.rows.filter(r=>r.status==='calculated_expert');
assert.equal(computed.length,45);
assert.equal(d.rows.filter(r=>r.status==='unranked_population_unknown').length,6);
assert.equal(d.rows.filter(r=>r.status==='excluded_non_game').length,2);
for(const r of computed)for(const s of r.scenarios){
  const sum=s.p.reduce((a,b)=>a+b,0);assert(sum>=0&&sum<=1+1e-12);
  const D=s.M*sum*s.T;
  assert(Math.abs(D-s.D)<1e-8);assert(D<=s.M+1e-8);
  assert(Math.abs(s.contributions.reduce((a,b)=>a+b,0)-D)<1e-8);
  assert(Math.abs(s.U_target-D*s.R*s.C)<1e-8);
}
for(const r of d.rows.filter(r=>r.status!=='calculated_expert')){assert.equal(r.rank,null);assert.equal(r.reference_D,null);}
const order=[...computed].sort((a,b)=>b.reference_D-a.reference_D);
order.forEach((r,i)=>assert.equal(r.rank,i+1));
assert.equal(d.ranking.length,45);order.forEach((r,i)=>{assert.equal(d.ranking[i].id,r.id);assert.equal(d.ranking[i].D,r.reference_D);});
console.log(JSON.stringify({records:53,calculated:45,unknown:6,excluded:2,formulas:'pass',ordering:'pass',overlap:'disjoint primary segments by construction; not empirically measured'}));
