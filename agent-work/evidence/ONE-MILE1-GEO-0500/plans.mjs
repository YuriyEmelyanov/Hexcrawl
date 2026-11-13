import fs from 'node:fs';
import {fineRoadPresentation} from './src/oneMilePresentation.ts';
const input=JSON.parse(fs.readFileSync(new URL('render-input.json',import.meta.url)));
const selected=[input.crossings.find(c=>c.kind==='bridge'),input.crossings.find(c=>c.kind==='ferry'),{...input.crossings.find(c=>c.riverId===3),kind:'ford'}];
const scenes=selected.map(c=>({crossing:c,states:[1,6].map(mult=>({mult,rivers:input.rivers.map(r=>({...r,stroke:r.width/6*mult})),roads:input.roads.map(r=>({...r,plan:fineRoadPresentation(r,[c],input.rivers.map(v=>({...v,width:v.width*mult})))}))}))}));
fs.writeFileSync(new URL('plans.json',import.meta.url),JSON.stringify(scenes));
