import assert from 'node:assert/strict';

// This function is also installed verbatim in the history-only page.
export function encodeNative(value) {
  const encode = v => {
    if (v === undefined) return ['undefined'];
    if (v === null) return ['null'];
    if (typeof v === 'number') return ['number', Object.is(v, -0) ? '-0' : Number.isFinite(v) ? v : String(v)];
    if (typeof v === 'string' || typeof v === 'boolean') return [typeof v, v];
    if (v instanceof Map) return ['Map', [...v].map(([k, x]) => [encode(k), encode(x)])];
    if (v instanceof Set) return ['Set', [...v].map(encode)];
    if (Array.isArray(v)) return ['Array', v.map(encode)];
    if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) return ['Object', Object.keys(v).sort().map(k => [k, encode(v[k])])];
    throw Error('Unsupported native snapshot type: ' + Object.prototype.toString.call(v));
  };
  return encode(value);
}
export function decodeNative([tag, value]) {
  if (tag === 'undefined') return undefined;
  if (tag === 'null') return null;
  if (tag === 'number') return value === '-0' ? -0 : Number(value);
  if (tag === 'string' || tag === 'boolean') return value;
  if (tag === 'Map') return new Map(value.map(([k, v]) => [decodeNative(k), decodeNative(v)]));
  if (tag === 'Set') return new Set(value.map(decodeNative));
  if (tag === 'Array') return value.map(decodeNative);
  assert.equal(tag, 'Object');
  return Object.fromEntries(value.map(([k, v]) => [k, decodeNative(v)]));
}
export function containerManifest(v, path = '$', out = []) {
  if (v instanceof Map) { out.push({path, type:'Map', size:v.size}); for (const [k,x] of v) containerManifest(x, path+'.Map('+String(k)+')', out); }
  else if (v instanceof Set) { out.push({path, type:'Set', size:v.size}); for (const x of v) containerManifest(x, path+'.Set', out); }
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) containerManifest(v[k], path+'.'+k, out);
  return out;
}
export const semantic = d => { d = structuredClone(d); delete d.savedAt; return d; };
export function stats(a) {
  assert(a.length && a.every(Number.isFinite), 'complete finite frames');
  const s=[...a].sort((a,b)=>a-b), n=s.length;
  return {n, rank:Math.ceil(.95*n), p95:s[Math.ceil(.95*n)-1], min:s[0], max:s.at(-1), median:n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2, over50:a.filter(x=>x>50).length/n, over500:a.filter(x=>x>500).length/n};
}
export function analyzeNavigation(rows) {
  const measured=rows.filter(r=>r.kind==='measured');
  const groups=['zoom','pan'].map(phase=>{
    const variants={};
    for(const variant of ['A','B']) {
      const rs=measured.filter(r=>r.variant===variant);
      const complete=rs.length===10 && new Set(rs.map(r=>r.pair)).size===10 && [1,2].every(position=>rs.filter(r=>r.position===position).length===5) && rs.every(r=>r.status==='success' && r.navigation?.[phase]?.length===24 && r.navigation[phase].every(Number.isFinite));
      variants[variant]={complete, actions:rs.length};
      if(complete) Object.assign(variants[variant],{pooled:stats(rs.flatMap(r=>r.navigation[phase])), per_action:rs.map(r=>({pair:r.pair,position:r.position,...stats(r.navigation[phase])})), position:[1,2].map(position=>({position,...stats(rs.filter(r=>r.position===position).flatMap(r=>r.navigation[phase]))}))});
    }
    const complete=variants.A.complete && variants.B.complete;
    const A=variants.A.pooled?.p95,B=variants.B.pooled?.p95;
    return {phase, variants, complete, delta_ms:complete?B-A:null, relative_delta:complete&&A!==0?(B-A)/A:null, ratio_note:complete&&A===0?'zero baseline; ratio unavailable':null, guard_breach:complete?(B-A>10 && B>1.10*A):null};
  });
  const warmups=rows.filter(r=>r.kind==='warmup'),traces=rows.filter(r=>r.kind==='trace');
  const warmups_complete=warmups.length===2 && ['A','B'].every(v=>warmups.filter(r=>r.variant===v && r.status==='success').length===1);
  const paired=groups.map(g=>({phase:g.phase,pairs:Array.from({length:10},(_,pair)=>{const a=g.variants.A.per_action?.find(r=>r.pair===pair),b=g.variants.B.per_action?.find(r=>r.pair===pair);return{pair,A:a?.p95??null,B:b?.p95??null,delta_ms:a&&b?b.p95-a.p95:null,relative_delta:a&&b&&a.p95!==0?(b.p95-a.p95)/a.p95:null};})}));
  for(const g of groups)for(const v of Object.values(g.variants))if(v.complete)v.per_action_p95_summary=stats(v.per_action.map(r=>r.p95));
  return {groups,paired,warmups_complete,trace_rows:traces.map(r=>({variant:r.variant,status:r.status,file:r.trace})), complete:warmups_complete && groups.every(g=>g.complete), guard_pass:warmups_complete && groups.every(g=>g.complete && g.guard_breach===false), note:'240 frames nested in ten actions; position statistics diagnostic, traces excluded; old V2 remains nonpassing'};
}
