import fs from 'node:fs';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {validateRiverNetwork} from './src/riverModel/core.ts';
const offset=Number(process.argv[2]), stride=Number(process.argv[3]);
const counts={maps:0,states:0,withRiver:0,refusals:0,nodes:{},height:{},bad:[]};
for(let seed=1+offset;seed<=100;seed+=stride){
 const h=createGenerationHarness(seed),g=h.geometry;
 for(let step=0;step<3;step++){
  const before=h.render(),anchor=step?before.candidateHexes[seed%before.candidateHexes.length]:{q:0,r:0};if(!anchor)break;
  const result=before.safelyAddRegionToMap(anchor,{coastalPreference:step&&seed%2?'coast':'mainland',biomeId:['mountains','open_hills','open_plains'][step],targetSize:6+seed%6});
  if(!result.success){counts.refusals++;break;}
  const a=h.render(), network=g.buildRegionRiverNetwork(a.rivers,before.rivers,a.regions,a.candidateHexes,a.hexTerrainByKey);
  const flows=new Map(a.rivers.flatMap(r=>r.sectors.flatMap(s=>s.edgeKeys.map(k=>[k,s.fullness]))));
  const edges=network.network.edges.map(e=>({...e,fullness:flows.get(e.id)}));
  const checked=validateRiverNetwork({...network.network,edges});
  counts.states++;if(!step)counts.maps++;if(a.rivers.length)counts.withRiver++;
  for(const n of network.network.nodes){counts.nodes[n.kind]=(counts.nodes[n.kind]||0)+1;
   const ins=edges.filter(e=>e.to===n.id),outs=edges.filter(e=>e.from===n.id);
   for(const x of ins)for(const y of outs)if(x.regionId!==y.regionId){const k=x.height+'>'+y.height;counts.height[k]=(counts.height[k]||0)+1; if(!counts.examples)counts.examples={};counts.examples[k]??={seed,step,regionFrom:x.regionId,regionTo:y.regionId,node:n.id};}
  }
  if(!checked.valid||network.issues.length){counts.bad.push({seed,step,issues:[...network.issues,...checked.issues].slice(0,6)});break;}
 }
 
 if(seed%100<stride)fs.writeFileSync('/tmp/hydro-mountain-progress-'+offset,JSON.stringify(counts));
}

console.log(JSON.stringify(counts));
