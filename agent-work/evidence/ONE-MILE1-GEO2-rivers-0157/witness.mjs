import fs from 'node:fs';import crypto from 'node:crypto';
import {prepareRefinementRivers} from '../geo2-implementation/src/geometryRefinementRivers.ts';
import {refinementWorldPoint,refinementVertexKey} from '../geo2-implementation/src/geometryRefinementGrid.ts';
import {projectOneMile} from '../geo2-implementation/src/oneMile.ts';
import {detailSourcePixelToWorld} from '../geo2-implementation/src/detailGeography.ts';
import {detailCellPolygon,createDetailGrid} from '../geo2-implementation/src/detailGrid.ts';
const raw=fs.readFileSync(new URL('../geo2-implementation/test/fixtures/road-entry-zigzags.json',import.meta.url));const world=JSON.parse(raw);
const fine=projectOneMile(world.map.regions.flatMap(r=>r.hexes.map(cell=>({cell,landBiomeId:r.biomeId}))));
const segments=world.map.rivers.flatMap(r=>r.vertexPath.slice(1).map((to,i)=>{const from=r.vertexPath[i],edgeKey=[from.key,to.key].sort().join('|');return {riverId:r.id,edgeKey,from:{key:from.key,point:detailSourcePixelToWorld(from)},to:{key:to.key,point:detailSourcePixelToWorld(to)},fullness:r.sectors.find(s=>s.edgeKeys.includes(edgeKey)).fullness};}));
const result=prepareRefinementRivers({seed:423493684,origin:{x:0,y:0},cells:fine.map(c=>c.cell),segments});if(result.status!=='prepared')throw Error(JSON.stringify(result));
const edgeCount=result.paths.reduce((sum,p)=>sum+p.vertices.length-1,0),report={source_sha:'cd4249d6e70099c3581eb1c5882824a6a8443b96',fixture:'test/fixtures/road-entry-zigzags.json',fixture_sha256:crypto.createHash('sha256').update(raw).digest('hex'),status:'prepared',source_segments:segments.length,refined_paths:result.paths.length,source_nodes:result.nodes.length,fine_edges:edgeCount,fine_cells:fine.length,identity_fullness_topology_verified_by:'test/geometryRefinementRivers.test.mjs',limits:['Unmounted river candidate only','Direction follows supplied vertexPath; no new hydrology certification','Joint allocation optimality and global backtracking not proven','POI/road/crossing/mouth/save/UI not yet integrated'],temporary_diagnostic:true,permanent_case_growth:0};
fs.writeFileSync(new URL('river-plan.json',import.meta.url),JSON.stringify(result,null,2));fs.writeFileSync(new URL('witness.json',import.meta.url),JSON.stringify(report,null,2));
const grid=createDetailGrid(1),svg=[];const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
svg.push('<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="670" viewBox="0 0 1100 670"><rect width="1100" height="670" fill="#111c2d"/>');
const t=(x,y,s,size=17)=>`<text x="${x}" y="${y}" font-family="DejaVu Sans" font-size="${size}" fill="#e6eef7">${esc(s)}</text>`;
svg.push(t(24,32,'GEO2: расчёт русел на одной сохранённой карте',22),t(24,58,'Диагностика модели, не готовый интерфейс. Фрагмент у исходного перехода x=−3, y=0.',13));
for(const after of [false,true]){
 const panel=after?565:25;svg.push(t(panel,100,after?'После: рассчитанные рёбра':'До: исходные прямые линии',19));
 svg.push(`<defs><clipPath id="clip${after}"><rect x="${panel}" y="120" width="510" height="460"/></clipPath></defs><g clip-path="url(#clip${after})"><g transform="translate(${panel+440} 350) scale(60)">`);
 for(const c of fine){const polygon=detailCellPolygon(grid,c.cell);if(Math.max(...polygon.map(p=>p.x))< -7.5||Math.min(...polygon.map(p=>p.x))>1.5||Math.max(...polygon.map(p=>p.y))< -4||Math.min(...polygon.map(p=>p.y))>4)continue;svg.push(`<polygon points="${polygon.map(p=>`${p.x},${p.y}`).join(' ')}" fill="#b6cf91" stroke="#657b4d" stroke-width=".015"/>`);}
 const paths=after?result.paths.map(p=>({pts:p.vertices.map(v=>refinementWorldPoint(v)),f:p.fullness})):segments.map(s=>({pts:[s.from.point,s.to.point],f:s.fullness}));
 for(const p of paths)svg.push(`<polyline points="${p.pts.map(v=>`${v.x},${v.y}`).join(' ')}" fill="none" stroke="#159dac" stroke-width="${.24+.21*p.f}" stroke-linejoin="round"/>`);
 // Same unchanged source road and old crossing shown for reference, not adaptation.
 svg.push('<path d="M-6,0L0,0" stroke="#8b4d26" stroke-width=".055"/><circle cx="-3" cy="0" r=".13" fill="none" stroke="#db5257" stroke-width=".04"/></g></g>');
}
svg.push(t(24,612,`${report.refined_paths}/${report.source_segments} участков; ${report.source_nodes} узлов источника; ${report.fine_edges} мелких рёбер.`,16),t(24,640,'Дорога и красная отметка перехода пока исходные. POI, дороги и устья — следующий этап.',14),'</svg>');
fs.writeFileSync(new URL('river-layout.svg',import.meta.url),svg.join(''));console.log(JSON.stringify(report));
