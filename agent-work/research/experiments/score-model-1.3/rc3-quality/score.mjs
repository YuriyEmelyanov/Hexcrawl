import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {measure} from '../calculate.mjs';
import {verdict,bindTiming,leadership} from './acceptance.mjs';
const read=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const [catalog,observed,baseline,cohort,history]=await Promise.all(['catalog.json','observations.json','../baseline.json','../../../../score/cohorts-2026-11-15.json','../pr-history.json'].map(read));
assert.equal(catalog.criteria.length,50);
assert.equal(new Set(catalog.criteria.map(c=>c.id)).size,50);
assert.equal(catalog.criteria.reduce((s,c)=>s+c.weight,0),1000);
assert.equal(observed.release,baseline.release);
assert.equal(catalog.component_share.common+catalog.component_share.games,1);
const receipts=new Map(observed.observations.map(r=>[r.unit+'#'+r.case,r]));
assert.equal(receipts.size,observed.observations.length);
const used=new Set();
const fixedTech={'release-ci':'ci','map-integrity':'integrity'};
const makeRow=(id,status)=>({id,status});
const input=new Map([...baseline.rules,...baseline.common].map(r=>[r.id,r]));
function acceptance(row) {
  const states=row.cases || [({absent:'fail',full:'pass',partial:'unknown',unknown:'unknown'})[row.status]];
  const cases=states.map((f,i)=>{
    const key=row.case_ids?.[i]??(row.cases?String(i+1):'base');
    const k=row.id+'#'+key;
    const receipt=bindTiming(receipts.get(k),observed.quality_certificates||[],baseline.release);
    if(receipt){
      used.add(k);
      if(fixedTech[row.id]) assert.equal(receipt.contract,fixedTech[row.id]);
      else assert.ok(Object.hasOwn(catalog.profiles,receipt.contract),'Functional operation needs UI quality');
      if(row.id==='generate-region') assert.equal(receipt.contract,'generate');
      // Compound/partially functional rows need explicit denominators before full-case credit.
      if(row.status==='partial' && !row.cases && receipt.result===true) throw Error('Split the partial operation into stable cases');
    }
    const state=verdict(catalog.profiles,receipt,f);
    const profile=catalog.profiles[receipt?.contract];
    const devices=profile ? Object.fromEntries(Object.entries(profile.devices).map(([device,limit])=>{
      const subset={[receipt.contract]:{...profile,devices:{[device]:limit}}};
      return [device,verdict(subset,receipt,f)];
    })) : null;
    const parts=devices ? Object.values(devices) : [state];
    return {case:key,state,...(devices?{devices}:{}),low:parts.filter(s=>s==='pass').length/parts.length,high:parts.filter(s=>s!=='fail').length/parts.length};
  });
  return {cases,low:cases.reduce((s,c)=>s+c.low,0)/cases.length,high:cases.reduce((s,c)=>s+c.high,0)/cases.length};
}
const common=catalog.criteria.filter(c=>c.route==='common').map(c=>{
  const witnessIds=c.witnesses.length?c.witnesses:[c.id+'-prototype'];
  const cases=witnessIds.map(id=>({id,...acceptance(input.get(id)||makeRow(id,'unknown'))}));
  const n=cases.length;
  let low=.25*cases.reduce((sum,x)=>sum+x.low,0)/n;
  let high=.75+.25*cases.reduce((sum,x)=>sum+x.high,0)/n;
  if(cases.some(x=>x.high<1)) high-=.75;
  const tiers=observed.milestones.filter(x=>x.id===c.id).sort((a,b)=>a.grade-b.grade);
  for(const [i,t] of tiers.entries()){
    assert.equal(t.grade,i+2);assert.equal(t.release,baseline.release);
    assert.ok(t.scope && t.evidence && t.quality_evidence && t.reference_matrix_complete);
    if(t.grade>=3) assert.ok(t.errors_ci_users_evidence);
    if(t.grade===4) assert.ok(t.full_target_and_comparison_evidence);
    assert.ok(cases.every(x=>x.low===1),'Open prototype cases');
    low=t.grade/4;
    high=Math.max(low,high);
  }
  return {id:c.id,levels:c.levels,weight:c.weight,cases,low,high};
});
const gameRows=baseline.rules.map(r=>({game:r.game,level:r.level,id:r.id,functional:r.status,...acceptance(r)}));
assert.equal(used.size,receipts.size,'Unrecognized evidence unit or case');
const levels=[{level:1,scenario:'create'},{level:2,scenario:'play_now'}].map(old=>{
  const ids=cohort.scenario_sets[old.scenario].top20.map(g=>g.id);
  assert.deepEqual(ids,baseline.scenario_order[old.scenario]);
  assert.equal(new Set(ids).size,20);
  const core=common.filter(c=>c.levels.includes(old.level));
  const weight=core.reduce((s,c)=>s+c.weight,0);
  const commonPoints=k=>1000*core.reduce((s,c)=>s+c[k]*c.weight,0)/weight;
  const games=ids.map(id=>{
    const g={id,...measure(baseline.rules.filter(r=>r.game===id && r.level===old.level)),corpus_closed:baseline.closed_corpora[old.level].includes(id)};
    const rs=gameRows.filter(r=>r.game===g.id&&r.level===old.level);
    assert.equal(rs.length,g.n);
    const mean=k=>rs.length?rs.reduce((s,r)=>s+r[k],0)/rs.length:null;
    return {id:g.id,n:rs.length,closed:g.corpus_closed,functional_fraction:g.confirmed_pct===null?null:g.confirmed_pct/100,low:mean('low'),high:mean('high')};
  });
  const gamePoints=(k,empty)=>games.reduce((s,g)=>s+(g[k]??empty)*(1000/ids.length),0);
  const coreLow=commonPoints('low'),coreHigh=commonPoints('high'),gamesLow=gamePoints('low',0),gamesHigh=gamePoints('high',1);
  const mix=(a,b)=>catalog.component_share.common*a+catalog.component_share.games*b;
  const steps=[...new Set(core.map(c=>c.id.slice(0,3)))];
  const stepFloors=steps.map(id=>{
    const group=core.filter(c=>c.id.startsWith(id));
    return {id,fraction:group.reduce((s,c)=>s+c.low*c.weight,0)/group.reduce((s,c)=>s+c.weight,0)};
  });
  return {core_step_floors:stepFloors,level:old.level,scenario:old.scenario,core_weight:weight,core_low:coreLow,core_high:coreHigh,game_low:gamesLow,game_high:gamesHigh,games_with_rows:games.filter(g=>g.n).length,legacy_functional_game_points:games.reduce((s,g)=>s+(g.functional_fraction??0)*1000/ids.length,0),level_floor:mix(coreLow,gamesLow),level_ceiling_current_inventory:mix(coreHigh,gamesHigh),games};
});
const prs=history.map(pr=>{
  const byLevel=levels.map(level=>{
    let gameDelta=0;
    for (const d of pr.delta_game.filter(d=>d.level===level.level)) {
      const game=level.games.find(g=>g.id===d.game);
      if(game){assert.ok(game.n && input.get(d.id)?.game===game.id);gameDelta+=50*(d.after-d.before)/game.n;}
    }
    let coreDelta=0;
    for(const d of pr.delta_common){
      const c=common.find(c=>c.levels.includes(level.level)&&c.cases.some(x=>x.id===d.id));
      if(c && input.get(d.id).level===level.level) coreDelta+=1000*c.weight/level.core_weight*.25*(d.after-d.before)/c.cases.length;
    }
    const deployOnly=pr.pr===508 && pr.change_files.length===1 && pr.change_files[0]==='.github/workflows/deploy.yml';
    return {level:level.level,core_functional_pilot_delta:coreDelta,game_functional_delta:gameDelta,
      qualified_delta:deployOnly?0:null,reason:deployOnly?'Only Pages build timeout changed; published application operations identical.':'Matched functional changes are documented. No paired quality receipts for parent and merge.'};
  });
  return {pr:pr.pr,title:pr.title,parent:pr.parent,release:pr.release,evidence:pr.evidence,byLevel};
});
console.log(JSON.stringify({version:catalog.version,status:catalog.status,product_sha:baseline.release,scenario_cohort_version:cohort.version,levels,L3:{score:null,reason:'Cohort and gameplay denominator pending'},core:common,game_rows:gameRows,pr:prs,leadership:levels.map(l=>({level:l.level,status:leadership(l,observed.leadership_evidence?.[l.level],catalog.criteria.some(c=>c.route==='scope_decision' && c.pending_levels.includes(l.level)))}))},null,2));

