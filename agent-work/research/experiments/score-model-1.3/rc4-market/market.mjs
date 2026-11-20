// Run: node market.mjs < measurement.json
import fs from 'node:fs';
import assert from 'node:assert/strict';

function count(x) { return Number.isSafeInteger(x) && x >= 0; }
export function measure(x) {
  // A zero is admissible only from a complete, reconciled people-level observation.
  const usage=x.usage;
  const active=usage?.validated===true && usage.complete===true && usage.evidence && count(usage.unique_gms)
    && usage.population_key===x.population_key && usage.period_key===x.period_key && usage.scenario===x.scenario
    ? usage.unique_gms : null;
  const survey=x.survey;
  const valid=Boolean(survey?.validated && survey.evidence && survey.actual_behavior && survey.population_key===x.population_key
    && survey.period_key===x.period_key && survey.scenario===x.scenario && survey.independent_recruitment
    && survey.representative && count(survey.n) && survey.n>0 && count(survey.hx) && survey.hx<=survey.n);
  const share=valid ? survey.hx/survey.n : null; // self-weighting surveys; weighted designs require separate review
  const deltas=survey?.simultaneous_pairwise_intervals;
  const rivals=survey?.relevant_alternatives;
  const comparable=valid && survey.equal_probability===true && survey.comparison_evidence
    && survey.field_complete && Array.isArray(rivals) && rivals.length>0 && new Set(rivals).size===rivals.length
    && rivals.every(id=>{const d=deltas?.[id];return Array.isArray(d)&&d.length===2&&d.every(Number.isFinite)&&d[0]>=-1&&d[1]<=1&&d[0]<=d[1]});
  let position='unknown';
  if(active===0) position=valid && survey.hx>0 ? 'inconsistent_evidence' : 'no_observed_use';
  else if(comparable && rivals.some(id=>deltas[id][1]<0)) position='behind';
  else if(comparable && survey.hx>0 && rivals.every(id=>deltas[id][0]>0)) position='leads_measured_market';
  else if(comparable) position='inconclusive';
  return {scenario:x.scenario,active_gms:active,penetration:valid && survey.equal_probability===true ? share : null,market_position:position,
    overall_leadership:position==='leads_measured_market' && x.product_leadership==='confirmed' ? 'confirmed' : 'not_established'};
}
if(process.argv.includes('--test')){
 const b={scenario:'L1',population_key:'sample-market',period_key:'28d-end-X',product_leadership:'confirmed'};
 const u={...b,validated:true,complete:true,evidence:'synthetic',unique_gms:0};
 const s={...b,validated:true,evidence:'synthetic',actual_behavior:true,independent_recruitment:true,representative:true,equal_probability:true,n:200,hx:120,comparison_evidence:'synthetic',field_complete:true,relevant_alternatives:['A'],simultaneous_pairwise_intervals:{A:[.02,.18]}};
 assert.equal(measure(b).active_gms,null);assert.equal(measure({...b,usage:u}).market_position,'no_observed_use');
 assert.equal(measure({...b,survey:s}).overall_leadership,'confirmed');assert.equal(measure({...b,survey:s,usage:u}).market_position,'inconsistent_evidence');
 assert.equal(measure({...b,survey:{...s,simultaneous_pairwise_intervals:{A:[-.02,.2]}}}).overall_leadership,'not_established');
 assert.equal(measure({...b,survey:{...s,scenario:'L2'}}).penetration,null);
 assert.equal(measure({...b,survey:{...s,representative:false}}).penetration,null);
 console.log('7 checks passed');
} else console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(measure),null,2));
