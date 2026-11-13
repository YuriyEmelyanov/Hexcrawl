import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fineRiverStrokeWidth,fineRoadPresentation} from '../wr1-review-0900/src/oneMilePresentation.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),rows=[];
for(let F=1;F<=5;F++)for(let sector=0;sector<6;sector++){
 const width=Math.sqrt(3)*28*(.04+.035*F),angle=sector*Math.PI/3,c=Math.cos(angle),s=Math.sin(angle);
 near(fineRiverStrokeWidth(width),width);near(width/(Math.sqrt(3)*28/6)/(width/(Math.sqrt(3)*28)),6);
 const road={key:'r',roadId:1,segmentKey:'s',kind:'trail',x1:-20*c,y1:-20*s,x2:20*c,y2:20*s};
 const river={key:'river-segment-1-0',x1:20*s,y1:-20*c,x2:-20*s,y2:20*c,width};
 for(const kind of ['ferry','ford','bridge']){
  const p=fineRoadPresentation(road,[{key:'c',roadId:1,roadSegmentKey:'s',riverId:1,x:0,y:0,kind}],[river]);
  if(kind==='ferry'){near(Math.hypot(p.pieces[0].x2,p.pieces[0].y2),width/2);near(Math.hypot(p.pieces[1].x1,p.pieces[1].y1),width/2);}
  if(kind==='ford'){const wet=p.pieces.find(p=>p.opacity===.42);near(Math.hypot(wet.x2-wet.x1,wet.y2-wet.y1),width);}
  if(kind==='bridge'){assert.equal(p.pieces.length,1);assert.equal(p.rails.length,2);for(const r of p.rails){const [a,b]=r.points.split(' ').map(s=>s.split(',').map(Number));assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])>width);}}
 }
 rows.push({F,sector,width,fraction1:width/(Math.sqrt(3)*28/6),ratio:6,kinds:3});
}
for(const width of [NaN,Infinity,-2,0])assert.equal(fineRiverStrokeWidth(width),0);
const result={status:'pass',head_sha:'3344159406c3619bc3903e7185f7b0a5c4d13de5',combinations:90,rows,invalidWidths:4,scope:'perpendicular interior crossings, current six orientation sectors; no finite endcap certification',completed_at:new Date().toISOString()};
fs.writeFileSync(new URL('analytical-results.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,combinations:90,invalidWidths:4}));
