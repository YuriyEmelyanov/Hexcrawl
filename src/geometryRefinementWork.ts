/** Deterministic composition work units, not milliseconds or token usage.
 * Black-box source/footprint helpers reserve bounded input work up front;
 * fingerprint, bank and road loops charge incrementally. */
export function createRefinementWorkBudget(limit=2000000,cancelled?:()=>boolean){
 if(!Number.isSafeInteger(limit)||limit<1)throw Error('invalid_prepare_budget');
 let used=0,phase='source';const phases:Record<string,number>={};
 const charge=(units=1)=>{if(cancelled?.())throw Error('prepare_cancelled');if(!Number.isSafeInteger(units)||units<0)throw Error('invalid_prepare_charge');if(units>limit-used)throw Error('prepare_incomplete_budget');used+=units;phases[phase]=(phases[phase]??0)+units;};
 const reserve=(value:unknown)=>{const active=new Set<object>();const visit=(v:unknown)=>{charge();if(v&&typeof v==='object'){if(active.has(v))throw Error('cyclic_prepare_input');active.add(v);for(const x of Array.isArray(v)?v:Object.values(v))visit(x);active.delete(v);}};visit(value);};
 return Object.freeze({charge,reserve,enter:(name:string)=>{phase=name;charge(0);},snapshot:()=>Object.freeze({model:'geo2-composition-work-v1' as const,limit,used,remaining:limit-used,phases:Object.freeze({...phases})})});
}
