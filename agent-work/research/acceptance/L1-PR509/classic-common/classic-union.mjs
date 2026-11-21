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
const failures=[],counts={disconnected:0,hole:0,boundary:0};let boundaries=0;let viable=0;
for(let seed=1;seed<=10000;seed++){
  const cells=geometry.generateConnectedRegionFromAnchorImpl({q:0,r:0},1+seed%24,new Set(),new Set(),new Set(),streamsFor(createGenerationState(seed)));
  const land=new Set(cells.map(h=>key(h.q,h.r)));
  const radius=Math.max(...cells.flatMap(h=>[Math.abs(h.q),Math.abs(h.r)]))+2;
  const side=2*radius+1;
  const outside=flood(key(-radius,-radius),k=>{const [q,r]=k.split(',').map(Number);return !land.has(k)&&Math.abs(q)<=radius&&Math.abs(r)<=radius;});
  const expected=new Set([...land].flatMap(adjacent).filter(k=>!land.has(k)));
  const candidates=geometry.getCandidateHexes(cells).map(h=>key(h.q,h.r));
  boundaries+=candidates.length;
  // Exercise one adjacent address on each map, rotating across the available ring.
  const anchor=candidates[seed%candidates.length].split(',').map(Number);
  const anchorHex={q:anchor[0],r:anchor[1]};
  const grow=seed%2?geometry.generateConnectedRegionFromAnchorImpl(anchorHex,8,land,new Set(),new Set(),streamsFor(createGenerationState(seed))):geometry.generateFallbackTractFromAnchor(anchorHex,land,4,streamsFor(createGenerationState(seed)));
  const added=new Set(grow.map(h=>key(h.q,h.r)));
  if(!added.has(key(...anchor))||[...added].some(k=>land.has(k))||flood(key(...anchor),k=>added.has(k)).size!==added.size)throw Error('Unreachable or overlapping extension at '+seed);
  const fill=geometry.findFillableEnclosedEmptyAreas(added,land).flat();
  const whole=[...cells,...grow,...fill];
  const set=new Set(whole.map(h=>key(h.q,h.r)));
  const rad=Math.max(...whole.flatMap(h=>[Math.abs(h.q),Math.abs(h.r)]))+2;
  const ext=flood(key(-rad,-rad),k=>{const [q,r]=k.split(',').map(Number);return !set.has(k)&&Math.abs(q)<=rad&&Math.abs(r)<=rad;});
  const ring=new Set([...set].flatMap(adjacent).filter(k=>!set.has(k)));
  const actual=geometry.getCandidateHexes(whole).map(h=>key(h.q,h.r));
  if(ext.size+set.size!==(2*rad+1)**2 || flood('0,0',k=>set.has(k)).size!==set.size || actual.length!==ring.size || new Set(actual).size!==ring.size || actual.some(k=>!ring.has(k)||!ext.has(k)))throw Error('Combined topology failure '+seed);
  viable++;
  const checks={disconnected:flood('0,0',k=>land.has(k)).size!==land.size,hole:outside.size+land.size!==side*side,boundary:candidates.length!==expected.size||new Set(candidates).size!==expected.size||candidates.some(k=>!expected.has(k)||!outside.has(k))};
  for(const [k,failed] of Object.entries(checks))if(failed){counts[k]++;if(failures.length<20)failures.push({seed,k});}
}
console.log(JSON.stringify({seeds:10000,target_sizes:[1,24],boundaries,viable,counts,failures}));
