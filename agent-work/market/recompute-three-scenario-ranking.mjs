// Audit helper for operational market data; not a permanent product test.
// Run from repository root: node agent-work/market/recompute-three-scenario-ranking.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root='agent-work/market/';
const raw=fs.readFileSync(process.argv[2]||root+'campaign-vtt-ranking-2026-10-27.json');
const src=JSON.parse(raw), data=JSON.parse(fs.readFileSync(process.argv[3]||root+'three-scenario-ranking-2026-10-27.json'));
const blob=crypto.createHash('sha1').update(Buffer.from('blob '+raw.length+'\0')).update(raw).digest('hex');
assert.equal(blob,data.source.blob_sha,'Frozen input changed; do not silently regenerate from another source');
assert.equal(data.rows.length,53);
assert.equal(new Set(data.rows.map(x=>x.id)).size,53);
assert.deepEqual(data.rows.map(x=>x.id),src.rows.map(x=>x.id));
function eq(a,b){assert(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)),a+' != '+b);}
function ranks(items){const out={};for(const x of items){const tol=1e-10*Math.max(1,Math.abs(x.v));const greater=items.filter(y=>y.v-x.v>tol).length;const equal=items.filter(y=>Math.abs(y.v-x.v)<=tol).length;out[x.id]=greater+(equal+1)/2;}return out;}
const calculated=data.rows.filter(x=>x.scenarios);
assert.equal(calculated.length,45);
for(const name of ['low','reference','high']){
 const recomputed=[];
 for(const x of data.rows){
  const old=src.rows.find(y=>y.id===x.id);
  if(!old.scenarios.length){assert.equal(x.scenarios,null);continue;}
  const s=old.scenarios.find(y=>y.name===name),z=x.scenarios.find(y=>y.name===name);
  const p=[s.p[0],s.p[1]+s.p[2],s.p[3]];
  assert.deepEqual(z.M,s.M);assert.deepEqual(z.p,p);
  const D=p.map(v=>s.M*v*s.T), U=D.map(v=>v*s.R*s.C);
  D.forEach((v,k)=>eq(v,z.D[k]));U.forEach((v,k)=>eq(v,z.U[k]));
  eq(D.reduce((a,b)=>a+b,0),s.D);
  recomputed.push({id:x.id,U,z});
 }
 const rs=[0,1,2].map(k=>ranks(recomputed.map(x=>({id:x.id,v:x.U[k]}))));
 for(const x of recomputed){x.z.ranks.forEach((v,k)=>eq(v,rs[k][x.id]));eq(x.z.mean_rank,x.z.ranks.reduce((a,b)=>a+b,0)/3);}
 const overall=ranks(recomputed.map(x=>({id:x.id,v:-x.z.mean_rank})));
 for(const x of recomputed)eq(x.z.overall_place,overall[x.id]);
 for(let k=0;k<3;k++)eq(recomputed.reduce((a,x)=>a+x.z.ranks[k],0),45*46/2);
}
assert.equal(data.rows.filter(x=>x.status==='unranked_population_unknown').length,6);
assert.equal(data.rows.filter(x=>x.status==='excluded_non_game').length,2);
assert.equal(data.validation.product_score_changed,false);
console.log('Verified: frozen input blob,53 IDs,45 games x3 scenarios x3 parameter sets, formulas, tied ranks, six unknown and two exclusions.');
