import fs from 'node:fs';
import assert from 'node:assert/strict';
export function tally(product, period, records) {
  const ids=new Set();let published=0, any=false, seen=false;
  for(const r of records.filter(x=>x.product===product && x.period===period)){
    if(!r.source || !r.external_human_use) continue;
    if(r.kind==='person'){if(!r.person_key)throw Error('Missing deduplicated identity');ids.add(r.person_key);seen=true;}
    if(r.kind==='verified_visit'){any=true;seen=true;}
    if(r.kind==='verified_people_floor'){
      if(!Number.isSafeInteger(r.minimum)||r.minimum<0)throw Error('Invalid floor');
      published=Math.max(published,r.minimum);seen=true;
    }
  }
  return {product,period,identified_minimum:seen?Math.max(ids.size,published,Number(any)):null};
}
export function conservativeShare(ours,upperMarket){
  if(ours==null||upperMarket==null)return null;
  if(!Number.isSafeInteger(upperMarket)||upperMarket<=0||!Number.isSafeInteger(ours)||ours<0||ours>upperMarket)throw Error('Incompatible bounds');
  return ours/upperMarket;
}
if(process.argv.includes('--test')){
 const e={product:'HX',period:'month',source:'test',external_human_use:true};
 const r=k=>({...e,kind:'person',person_key:k});
 const min=rs=>tally('HX','month',rs).identified_minimum;
 assert.equal(min([{...e,kind:'verified_visit'}]),1);
 assert.equal(min([r('a'),r('a'),r('b')]),2);
 assert.equal(min([r('a'),{...e,kind:'verified_people_floor',minimum:8}]),8);
 assert.equal(min([{...e,kind:'browser_ids',minimum:80}]),null);
 assert.equal(min([{...r('a'),period:'historical'}]),null);
 assert.equal(conservativeShare(2,null),null);assert.equal(conservativeShare(2,100),.02);
 console.log('7 checks passed');
}else{
 const {periods,products,records}=JSON.parse(fs.readFileSync(0,'utf8'));
 console.log(JSON.stringify(periods.flatMap(period=>products.map(p=>tally(p,period,records))),null,2));
}