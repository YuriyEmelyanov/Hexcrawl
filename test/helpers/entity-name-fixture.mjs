import fs from 'node:fs';
import {seaFixture} from './sea-fixture.mjs';
// Finite authored examples for E8.2 identity and real UI checks. No RNG search.
export function entityNameFixture(type='road'){
 if(type==='sea'){const data=seaFixture();return {data,key:'sea:7'};}
 const d=JSON.parse(fs.readFileSync(new URL('../fixtures/e5-river-editor.json',import.meta.url)));
 d.version=8;d.map.editorNames={};
 const c=d.map.crossings[0],river=d.map.rivers[0],edge=c.riverEdgeKey;
 if(type==='obstacle'){
  d.map.roads=[];d.map.crossings=[];d.map.rivers=[];
  d.map.obstacles=[{id:1,hex:{q:0,r:0},neighborHex:{q:1,r:0},edgeKey:edge}];d.counters.nextObstacleId=2;
 }else if(type==='rapid'||type==='waterfall'){
  d.map.roads=[];d.map.crossings=[];
  d.map.riverFeatures={rapids:[{riverId:river.id,edgeKey:edge,state:'on'}],waterfalls:[{vertexKey:river.vertexPath.at(-1).key,state:'on'}]};
 }
 d.ui.selectedHex={q:0,r:0};
 return {data:d,key:type==='road'?'road:1':type==='obstacle'?'obstacle:1':type==='crossing'?`crossing:${c.key}`:type==='rapid'?`rapid:${river.id}:${edge}`:`waterfall:${river.vertexPath.at(-1).key}`};
}
