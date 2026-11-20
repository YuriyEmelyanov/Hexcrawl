// One case = one observable result on a pinned fixture. Hard failure wins over missing evidence.
export function verdict(profiles, record, functional) {
  if (functional === 'fail') return 'fail';
  if (!record) return 'unknown';
  const flags = [record.result];
  if (record.contract === 'ci') flags.push(record.independent);
  else if (record.contract === 'integrity') flags.push(record.persistence, record.isolated);
  else {
    const profile = profiles[record.contract];
    if (!profile) throw Error('Unknown acceptance contract '+record.contract);
    flags.push(record.isolated);
    if (profile.persist) flags.push(record.persistence);
    for (const [device, limit] of Object.entries(profile.devices)) {
      const run = record.timings?.[device];
      if (!run) { flags.push(undefined); continue; }
      if (!Array.isArray(run.samples) || run.samples.some(n=>!Number.isFinite(n)||n<0)) throw Error('Invalid latency samples');
      // A witnessed hang or timeout invalidates this case even in an incomplete sample.
      if (run.timeouts>0 || run.samples.some(n=>n>=profile.max_ms)) { flags.push(false); continue; }
      if (run.device_id && run.fixture && run.boundary==='action_to_ready' && run.samples.length>=profile.minimum_runs && run.timeouts===0) {
        const sorted=[...run.samples].sort((a,b)=>a-b);
        flags.push(sorted[Math.ceil(.95*sorted.length)-1]<limit);
      } else flags.push(undefined);
    }
  }
  if (!record.evidence || !record.scope) throw Error('Unscoped evidence');
  if (flags.includes(false)) return 'fail';
  return flags.every(v=>v===true) ? 'pass' : 'unknown';
}


// A shared measurement may travel only along the same execution path and workload.
export function bindTiming(record, certificates, release) {
  if (!record?.timing_ref) return record;
  if (record.timings) throw Error('Conflicting timing sources');
  const cert=certificates.find(c=>c.id===record.timing_ref);
  if (!cert || !cert.evidence || cert.release!==release || cert.contract!==record.contract) throw Error('Incompatible timing certificate');
  for (const field of ['execution_path','workload','render_path','storage_path']) {
    if (!record[field] || record[field]!==cert[field]) throw Error('Mismatch in '+field);
  }
  return {...record,timings:cert.timings};
}

export function leadership(level, external, scopeOpen) {
  if (!external || !external.evidence || scopeOpen) return 'unverified';
  if (!level.games.every(g=>g.closed && g.n>0 && g.low===1)) return 'unverified';
  if (external.critical_defects>0) return 'blocked';
  const grades=external.external_grades;
  if (!grades || !grades.every(g=>g.evidence && Number.isInteger(g.grade) && g.grade>=0 && g.grade<=4)) return 'unverified';
  const budget=[20,20,15,10,5];
  if (grades.length!==budget.length || !grades.every((g,i)=>g.id==='S10-C0'+(i+1))) return 'unverified';
  if (!external.comparative_study || external.critical_defects!==0) return 'unverified';
  const externalPoints=grades.reduce((n,g,i)=>n+budget[i]*g.grade/4,0);
  return level.level_floor>=950 && externalPoints>=60 && level.core_step_floors.every(x=>x.fraction>=.8) ? 'confirmed':'below_threshold';
}
