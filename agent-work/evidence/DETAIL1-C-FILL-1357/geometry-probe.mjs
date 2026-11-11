import assert from 'node:assert/strict';
import {createDetailGrid,detailCellPolygon,detailPositiveAreaIntersections,detailCellCenter,detailCellAreaSquareMiles} from './detailGrid.ts';
const rows=[];
for(const step of [12,24])for(const origin of [{x:0,y:0},{x:123.25,y:-47.5}])for(const cell of [{q:0,r:0},{q:3,r:-2}]){
 const grid=createDetailGrid(step,origin),source=createDetailGrid(6,origin),polygon=detailCellPolygon(grid,cell),hits=detailPositiveAreaIntersections(source,polygon);
 assert.equal(hits.length,step===12?7:19);
 const signed=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const within=p=>{const c=polygon.map((a,i)=>signed(a,polygon[(i+1)%polygon.length],p));return c.every(x=>x>=-1e-8)||c.every(x=>x<=1e-8)};
 assert.ok(hits.every(h=>within(detailCellCenter(source,h.cell))));
 const sum=hits.reduce((s,h)=>s+h.areaSquareMiles,0),area=detailCellAreaSquareMiles(grid);assert.ok(Math.abs(sum-area)<1e-7);
 rows.push({step,origin,cell,source_cells:hits.length,all_centres_in_closed_target:true,intersection_area:sum,target_area:area,missing_after_all_source_keys:0});
}
console.log(JSON.stringify({head_sha:'3aff650ca8a2c6c24989bcb97f0fefe346fabec7',module_blob_sha:'c5fb6f071dbc9a79d6ede7507909688fb2fb0067',temporary_analyst_diagnostic:true,permanent_test_cases_added:0,rows},null,2));
