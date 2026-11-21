import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
const counts={maps:0,states:0,wet:0,refused:0,arms:0,duplicates:0,cycles:0,gaps:0,zero:0,examples:{}};
for(let seed=1;seed<=100;seed++){
 const h=createGenerationHarness(seed);
 for(let step=0;step<6;step++){
 const b=h.render(),anchor=step?b.candidateHexes[seed%b.candidateHexes.length]:{q:0,r:0};
 if(!anchor||!b.safelyAddRegionToMap(anchor,{coastalPreference:'coast',targetSize:9}).success){counts.refused++;break;}
 const a=h.render(); counts.states++;if(!step)counts.maps++;if(a.rivers.length)counts.wet++;
 const graph=new Map(),seen=new Set(),errors=new Set();
 for(const r of a.rivers){
 const keys=r.vertexPath.map(p=>p.key),edges=new Set(r.sectors.flatMap(s=>s.edgeKeys));
 if(r.deltaParentRiverId!==undefined){counts.arms++;counts.examples.arm??={seed,step,river:r.id};}
 for(let i=1;i<keys.length;i++){const x=keys[i-1],y=keys[i],key=[x,y].sort().join('|');if(x===y)errors.add('zero');if(seen.has(key))errors.add('duplicates');seen.add(key);if(!edges.delete(key))errors.add('gaps');if(!graph.has(x))graph.set(x,[]);graph.get(x).push(y);}
 if(edges.size)errors.add('gaps');
 }
 const done=new Set(),active=new Set();function dfs(v){if(active.has(v))return true;if(done.has(v))return false;active.add(v);if((graph.get(v)||[]).some(dfs))return true;active.delete(v);done.add(v);return false;}
 if([...graph.keys()].some(dfs))errors.add('cycles');
 for(const e of errors){counts[e]++;counts.examples[e]??={seed,step};}
 }
}
console.log(JSON.stringify(counts));
