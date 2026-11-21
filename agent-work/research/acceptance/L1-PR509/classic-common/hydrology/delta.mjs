import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
const h=createGenerationHarness(44),g=h.geometry,b=h.render();assert.ok(b.safelyAddRegionToMap({q:0,r:0},{coastalPreference:'coast',targetSize:9}).success);
const a=h.render(),coast=new Set([...a.hexTerrainByKey].filter(([,t])=>t.terrainOverride==='sea').flatMap(([k])=>{const [q,r]=k.split(',').map(Number);return g.getHexCornerPoints({q,r}).map(v=>v.key)}));
const arms=a.rivers.filter(r=>r.deltaParentRiverId!==undefined);assert.ok(arms.length);
for(const arm of arms){const p=a.rivers.find(x=>x.id===arm.deltaParentRiverId),fork=arm.vertexPath[0].key,m=p.vertexPath.at(-1).key,n=arm.vertexPath.at(-1).key;assert.ok(p.vertexPath.slice(0,-1).some(v=>v.key===fork)&&m!==n&&coast.has(m)&&coast.has(n));console.log(JSON.stringify({river:p.id,arm:arm.id,fork,mouth:m,secondMouth:n}));}
