import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {createGenerationState,streamsFor} from './src/worldRandom.ts';
const geometry=createGenerationHarness(1).geometry;
const dirs=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const key=(q,r)=>q+','+r;
const adjacent=k=>{const [q,r]=k.split(',').map(Number);return dirs.map(([a,b])=>key(q+a,r+b));};
function flood(start,allowed){
  const seen=new Set([start]),todo=[start];
  while(todo.length)for(const n of adjacent(todo.pop()))if(!seen.has(n)&&allowed(n)){seen.add(n);todo.push(n);}
  return seen;
}
const failures=[],counts={disconnected:0,hole:0,boundary:0};let boundaries=0;
for(let seed=1;seed<=10000;seed++){
  const cells=geometry.generateConnectedRegionFromAnchorImpl({q:0,r:0},1+seed%24,new Set(),new Set(),new Set(),streamsFor(createGenerationState(seed)));
  const land=new Set(cells.map(h=>key(h.q,h.r)));
  const radius=Math.max(...cells.flatMap(h=>[Math.abs(h.q),Math.abs(h.r)]))+2;
  const side=2*radius+1;
  const outside=flood(key(-radius,-radius),k=>{const [q,r]=k.split(',').map(Number);return !land.has(k)&&Math.abs(q)<=radius&&Math.abs(r)<=radius;});
  const expected=new Set([...land].flatMap(adjacent).filter(k=>!land.has(k)));
  const candidates=geometry.getCandidateHexes(cells).map(h=>key(h.q,h.r));
  boundaries+=candidates.length;
  const checks={disconnected:flood('0,0',k=>land.has(k)).size!==land.size,hole:outside.size+land.size!==side*side,boundary:candidates.length!==expected.size||new Set(candidates).size!==expected.size||candidates.some(k=>!expected.has(k)||!outside.has(k))};
  for(const [k,failed] of Object.entries(checks))if(failed){counts[k]++;if(failures.length<20)failures.push({seed,k});}
}
console.log(JSON.stringify({seeds:10000,target_sizes:[1,24],boundaries,counts,failures}));
