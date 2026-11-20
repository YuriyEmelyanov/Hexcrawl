import assert from 'node:assert/strict';
import fs from 'node:fs';

// P is a bounded readiness interval. Reach uses a single frame of eligible GMs.
export function outcome(x) {
  const p=x.readiness;
  if(p && !(p.length===2 && p.every(Number.isFinite) && p[0]>=0 && p[0]<=p[1] && p[1]<=1000)) throw Error('Invalid readiness interval');
  const u=x.usage, s=x.reach;
  const same=r=>r?.scenario===x.scenario && r?.frame===x.frame && r?.period===x.period && Boolean(r.evidence);
  const known=same(u) && u.complete && Number.isSafeInteger(u.unique_gms) && u.unique_gms>=0;
  const usable=same(s) && s.validated===true && s.interval?.length===2 && s.interval.every(Number.isFinite) && s.interval[0]>=0 && s.interval[0]<=s.interval[1] && s.interval[1]<=1;
  if(known && u.unique_gms===0 && usable && s.interval[0]>0) throw Error('Inconsistent usage and reach evidence');
  const reach=known && u.unique_gms===0?[0,0]:usable?s.interval:null;
  const bounds=(r)=>r && r[1]===0?[0,0]:r && p?[p[0]*r[0],p[1]*r[1]]:null;
  return {scenario:x.scenario,frame:x.frame,period:x.period,observed_gms:known?u.unique_gms:null,measured_result:bounds(reach),
    owner_planning_result:x.owner_zero_today===true && !known && !usable?[0,0]:null};
}
if(process.argv.includes('--test')){
 const x={scenario:'L1',period:'P',frame:'F',readiness:[800,800]};
 const u={...x,evidence:'test',complete:true,unique_gms:0};
 const s={...x,evidence:'test',validated:true,interval:[.1,.1]};
 assert.deepEqual(outcome({...x,usage:u}).measured_result,[0,0]);
 assert.deepEqual(outcome({...x,reach:s}).measured_result,[80,80]);
 assert.deepEqual(outcome({...x,readiness:[600,800],reach:{...s,interval:[.05,.15]}}).measured_result,[30,120]);
 assert.equal(outcome({...x,owner_zero_today:true}).measured_result,null);
 assert.deepEqual(outcome({...x,owner_zero_today:true}).owner_planning_result,[0,0]);
 assert.equal(outcome({...x,reach:{...s,frame:'pilot'}}).measured_result,null);
 assert.equal(outcome({...x,usage:{...u,unique_gms:1}}).measured_result,null);
 assert.throws(()=>outcome({...x,usage:u,reach:s}));
 console.log('8 checks passed');
} else console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(outcome),null,2));