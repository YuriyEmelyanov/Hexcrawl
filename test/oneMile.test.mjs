import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid, detailCellPolygon, detailCellAreaSquareMiles, detailCellCenter} from '../src/detailGrid.ts';
import {prepareSmallLakeShore,smallLakeShoreConflict,smallLakeWaterConnected} from '../src/smallLakeShore.ts';
import {rollSmallLakeFootprints} from '../src/smallLakes.ts';
import {prepareRefinementShoreCells,prepareRefinementShorePath} from '../src/geometryRefinementShore.ts';
import {dominantFineBiome, projectOneMile, oneMileCandidates, chooseOneMileAnchor,
  fineCellKey, parseFineCellEdits, prepareFineCellEdit, prepareFineCellLoss} from '../src/oneMile.ts';

test('automatic small lakes use keyed cell odds and grow only from original seeds',()=>{
  const cells=Array.from({length:256},(_,q)=>({q,r:2}));
  const seeded=chance=>rollSmallLakeFootprints(cells.map(cell=>({cell,chance})),42,0);
  assert.deepEqual(seeded(0),[]);
  assert.equal(seeded(.02).flat().length,8);
  assert.equal(seeded(.04).flat().length,14);
  assert.deepEqual(rollSmallLakeFootprints(cells.toReversed().map(cell=>({cell,chance:.04})),42,0),seeded(.04));

  const line=cells.slice(0,4).map((cell,index)=>({cell,chance:index===0?1:0}));
  assert.deepEqual(rollSmallLakeFootprints(line,42,1),[cells.slice(0,2)]);
  assert.deepEqual(rollSmallLakeFootprints(line.filter((_,index)=>index!==1),42,1),[[cells[0]]],
    'growth cannot cross an excluded cell');
});

// This is the first fine-address domain seam on main. Existing mapTransactions
// tests exercise source-six fields and cannot detect a fine-to-source overwrite.
// Domain portions of OM02/03/04/05/11/12 only: these are not acceptance of
// App rendering, POI, save formats, history or browser behaviour.
const c=(q,r)=>({q,r}), source=(q,r,biome='forest')=>({cell:c(q,r),landBiomeId:biome});
const area=detailCellAreaSquareMiles(createDetailGrid(1));
const valid=id=>['forest','hills','plain'].includes(id);
const accepted=()=>projectOneMile([source(0,0)]);
const neighbours=cell=>[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([q,r])=>c(cell.q+q,cell.r+r));

test('a natural small-lake shore spills only onto unclaimed dry neighbours',()=>{
  const lake={id:1,origin:'manual',cells:[c(0,0),c(1,0)]},origin={x:0,y:0};
  const protection={roads:[],crossings:[],anchors:[]};
  const coverage=new Map(accepted().map(row=>[fineCellKey(row.cell),row]));
  const before=JSON.stringify(lake),open=prepareSmallLakeShore(lake,42,origin,protection,coverage);
  assert.equal(open.conflict,null);
  assert.ok(open.view.maskCells.some(cell=>fineCellKey(cell)==='2,0'),'a dry fringe preserves a natural outward bend');
  const wet=new Map(coverage);wet.set('2,0',{...wet.get('2,0'),waterArea:.02});
  const protectedFringe={...protection,anchors:[{ref:'point',point:{x:1.51,y:.12}}]};
  for(const clipped of [prepareSmallLakeShore(lake,42,origin,protection,wet),
    prepareSmallLakeShore(lake,42,origin,protection,coverage,new Set(['2,0'])),
    prepareSmallLakeShore(lake,42,origin,protectedFringe,coverage)]){
    assert.equal(clipped.conflict,null);
    assert.equal(clipped.view.path,open.view.path);
    assert.ok(!clipped.view.maskCells.some(cell=>fineCellKey(cell)==='2,0'));
    assert.equal(JSON.stringify(clipped.view.lake),before,'spill does not enlarge the authored footprint');
  }
});

test('shore clipping distinguishes disconnected water from an island inside a connected lake',()=>{
  const mask=prepareRefinementShoreCells([c(0,0)],{x:0,y:0},1);
  const connected=prepareRefinementShorePath('M-.4 -.2 L.4 -.2 L.4 .2 L-.4 .2 Z M-.1 -.1 L.1 -.1 L.1 .1 L-.1 .1 Z');
  const cut=prepareRefinementShorePath('M-.25 0 L-.15 0 L-.15 .65 L.15 .65 L.15 0 L.25 0 L.25 .8 L-.25 .8 Z');
  assert.deepEqual([mask.status,connected.status,cut.status],['prepared','prepared','prepared']);
  assert.equal(smallLakeWaterConnected(connected,mask),true,'the island is a hole, not additional disconnected water');
  assert.equal(smallLakeWaterConnected(cut,mask),false,'clipping away the joining arm leaves separate pools');
});

test('small lake protects crossed paths and anchors while dry hex margins remain usable',()=>{
  const lake={id:1,origin:'manual',cells:[c(0,0)]},origin={x:10,y:-2};
  const point=(x,y)=>({x:x+origin.x,y:y+origin.y});
  const dryEdge={ref:'edge',points:[point(.48,.28),point(.49,.29)]};
  const through={ref:'through',points:[point(-1,0),point(1,0)]};
  const anchor={ref:'site',point:origin};
  const safe={roads:[dryEdge],crossings:[],anchors:[{ref:'dry point',point:point(.48,.28)}]};
  assert.equal(smallLakeShoreConflict(lake,42,origin,safe),null);
  assert.deepEqual(smallLakeShoreConflict(lake,42,origin,{...safe,roads:[dryEdge,through]}),{kind:'road',ref:'through'});
  assert.deepEqual(smallLakeShoreConflict(lake,42,origin,{...safe,crossings:[through]}),{kind:'crossing',ref:'through'});
  assert.deepEqual(smallLakeShoreConflict(lake,42,origin,{...safe,anchors:[anchor]}),{kind:'anchor',ref:'site'});
});

test('partial fine display is full while accepted geography area stays exact',()=>{
  const input=[source(0,0)], before=JSON.stringify(input), rows=projectOneMile(input);
  assert.ok(rows.some(row=>row.acceptedArea<area*(1-1e-8)),'fixture must contain partial cells');
  for(const row of rows){
    assert.deepEqual(row.polygon,detailCellPolygon(createDetailGrid(1),row.cell));
    assert.equal(row.landBiomeId,'forest');
  }
  assert.ok(Math.abs(rows.reduce((sum,row)=>sum+row.acceptedArea,0)-area*36)<1e-9);
  assert.equal(JSON.stringify(input),before);
  assert.deepEqual(projectOneMile([]),[],'unknown cells acquire no invented biome');
});

test('dominant biome aggregates duplicate IDs then uses a canonical maximum tie',()=>{
  const parts=[{biomeId:'forest',area:.3},{biomeId:'plain',area:.5},{biomeId:'forest',area:.3}];
  assert.equal(dominantFineBiome(parts),'forest');assert.equal(dominantFineBiome([...parts].reverse()),'forest');
  assert.equal(dominantFineBiome([{biomeId:'z',area:.4},{biomeId:'a',area:.4},{biomeId:'b',area:.4}]),'a');
  // Comparing only the previously chosen winner with tolerance can chain ties
  // and choose a value outside the true maximum's tolerance band.
  const t=area*1e-9;
  assert.equal(dominantFineBiome([{biomeId:'a',area:1},{biomeId:'b',area:1+t*.8},{biomeId:'c',area:1+t*1.6}]),'b');
});

test('source permutation and fixed origin preserve biome assignments and water coverage',()=>{
  const origin={x:-10.5,y:12.7}, sources=[source(0,0),source(1,0,'hills'),{cell:c(0,1),water:'lake'}];
  assert.deepEqual(projectOneMile(sources,origin),projectOneMile([...sources].reverse(),origin));
  const rows=projectOneMile(sources,origin);
  assert.ok(rows.some(row=>row.waterArea>0&&row.landBiomeId),'real mixed coast fixture');
  assert.ok(rows.some(row=>row.waterArea>0&&!row.landBiomeId),'water remains water');
  assert.throws(()=>projectOneMile([...sources,sources[0]]),/Duplicate/);
});

test('candidates form one legal fine row, never the whole source candidate projection',()=>{
  const rows=accepted(), occupied=new Set(rows.map(row=>fineCellKey(row.cell)));
  const legal=neighbours(c(0,0)), rim=oneMileCandidates(rows,legal);
  assert.ok(rim.length>0);
  for(const row of rim){
    assert.ok(!occupied.has(fineCellKey(row.cell)));
    assert.ok(neighbours(row.cell).some(n=>occupied.has(fineCellKey(n))));
    assert.ok(row.anchors.length&&row.anchors.every(a=>legal.some(b=>fineCellKey(a)===fineCellKey(b))));
  }
  const broad=projectOneMile(legal.map(a=>({cell:a,landBiomeId:'plain'}))).filter(row=>!occupied.has(fineCellKey(row.cell)));
  assert.ok(broad.length>rim.length,'test would reject projecting whole source-six candidates');
  assert.deepEqual(oneMileCandidates(rows,[]),[]);
  assert.deepEqual(oneMileCandidates(rows,[...legal].reverse()),rim);
});

test('enclosed holes get only legal accessible edge neighbours',()=>{
  const ring=neighbours(c(0,0)).map(cell=>({cell,polygon:[],acceptedArea:area,waterArea:0,landBiomeId:'forest'}));
  assert.ok(oneMileCandidates(ring,[c(0,0)]).some(row=>fineCellKey(row.cell)==='0,0'));
  assert.deepEqual(oneMileCandidates(ring,[]),[]);
});

test('pointer and keyboard select ordinary anchors with stable q/r ties',()=>{
  const row={cell:c(3,0),anchors:[c(1,0),c(0,0)]};
  assert.deepEqual(chooseOneMileAnchor(row,undefined),c(0,0));
  assert.deepEqual(chooseOneMileAnchor(row,{x:5,y:0}),c(1,0));
  assert.equal(chooseOneMileAnchor({...row,anchors:[]},undefined),undefined);
  assert.throws(()=>chooseOneMileAnchor(row,{x:NaN,y:0}),/Invalid/);
});

test('local command edits one fine target and current language without source-six writes',()=>{
  const rows=accepted(), edits={'0,0':{name:{ru:'Лес',en:'Forest'},note:'old'},'1,0':{note:'neighbour'}};
  const before=JSON.stringify(edits);
  const after=prepareFineCellEdit({edits,target:c(0,0),revision:4,expectedRevision:4,accepted:rows,language:'ru',name:'Опушка',note:'new',landBiomeId:'hills'},valid);
  assert.equal(after['0,0'].name.en,'Forest');assert.equal(after['0,0'].name.ru,'Опушка');
  assert.deepEqual(after['1,0'],edits['1,0']);assert.equal(JSON.stringify(edits),before);
  const reset=prepareFineCellEdit({edits:after,target:c(0,0),revision:4,expectedRevision:4,accepted:rows,language:'ru'},valid);
  assert.deepEqual(reset['0,0'],{name:{en:'Forest'}});
  assert.equal(Object.isFrozen(after['0,0']),true);
});

test('stale, malformed, unsafe and unsupported local fields fail without partial writes',()=>{
  const rows=accepted(), edits={'0,0':{note:'keep'}}, before=JSON.stringify(edits);
  const base={edits,target:c(0,0),revision:2,expectedRevision:2,accepted:rows,language:'ru'};
  assert.throws(()=>prepareFineCellEdit({...base,expectedRevision:1,note:'lose'},valid),/Stale/);
  for(const raw of [ {'-0,0':{}},{'1.1,0':{}},{'999999999999999999,0':{}},{'100,100':{note:'orphan'}},
    {'0,0':{sourceNote:'wrong target'}},{'0,0':{name:{de:'wrong language'}}},{'0,0':{name:{ru:'x'.repeat(201)}}},
    {'0,0':{note:'x'.repeat(20001)}},{'0,0':{landBiomeId:'lava'}},{'0,0':{note:null}}]) {
    assert.throws(()=>parseFineCellEdits(raw,rows,valid));
  }
  assert.throws(()=>prepareFineCellEdit({...base,target:c(100,100)},valid),/Orphan/);
  assert.equal(JSON.stringify(edits),before);
});

test('mixed and water cells retain local name/notes but refuse land overrides',()=>{
  const rows=projectOneMile([source(0,0),{cell:c(1,0),water:'sea'}]);
  const water=rows.find(row=>row.waterArea>0&&!row.landBiomeId), mixed=rows.find(row=>row.waterArea>0&&row.landBiomeId);
  assert.ok(water&&mixed);
  for(const row of [water,mixed]){
    const key=fineCellKey(row.cell);
    assert.deepEqual(parseFineCellEdits({[key]:{name:{ru:'Берег'},note:'Причал'}},rows,valid)[key].note,'Причал');
    assert.throws(()=>parseFineCellEdits({[key]:{landBiomeId:'plain'}},rows,valid),/biome/);
  }
});

test('destructive support loss requires consent and leaves an exact undo snapshot',()=>{
  const rows=accepted(), edits={'0,0':{note:'author'}}, before=JSON.stringify(edits);
  assert.throws(()=>prepareFineCellLoss(edits,[],false),/consent/);
  assert.deepEqual(prepareFineCellLoss(edits,rows,false),{edits,losses:[]});
  assert.deepEqual(prepareFineCellLoss(edits,[],true),{edits:{},losses:['0,0']});
  assert.equal(JSON.stringify(edits),before);
});

// P01–03: distinct rendering contracts absent from existing geometry/edit cases.
import {FINE_HEX_WIDTH, finePoiLabel, fineRefinedRoadPresentation, fineRoadPresentation, fineRiverStrokeWidth} from '../src/oneMilePresentation.ts';
import {prepareRefinementWater,refinementWaterCurveOverlaps} from '../src/geometryRefinementWater.ts';
const displayWater=(paths,scale=1)=>{const water=prepareRefinementWater({paths,widthByFullness:new Map([1,2,3,4,5].map(f=>[f,fineRiverStrokeWidth(f)/scale]))});assert.equal(water.status,'prepared');return water;};

test('small lake distinguishes bank tangency from overlap with the finite river strip',()=>{
  const strip=prepareRefinementWater({paths:[{riverId:1,sourceEdgeKey:'edge',fullness:4,points:[{x:-2,y:0},{x:2,y:0}]}],widthByFullness:new Map([[4,.4]])});
  assert.equal(strip.status,'prepared');
  const capsule=strip.capsules[0],arc={from:{x:-1,y:.5},control:{x:0,y:-.1},to:{x:1,y:.5}};
  assert.equal(refinementWaterCurveOverlaps(capsule,arc),false,'quadratic tangent at the bank');
  const dipping={...arc,control:{x:0,y:-.12}};
  assert.equal(refinementWaterCurveOverlaps(capsule,dipping),true,'interior overlap between dry endpoints');
  assert.equal(refinementWaterCurveOverlaps(capsule,dipping,0,.25),false,'overlap outside the retained arc is irrelevant');
  const pastEnd={from:{x:2.3,y:-.5},control:{x:2.1,y:0},to:{x:2.3,y:.5}};
  assert.equal(refinementWaterCurveOverlaps(capsule,pastEnd),false,'tangency at a round endpoint');
  assert.equal(refinementWaterCurveOverlaps(capsule,{...pastEnd,control:{x:2.08,y:0}}),true,'overlap only at the round cap');

  const lake={id:1,origin:'manual',cells:[c(0,0)]};
  const beside=y=>prepareRefinementWater({paths:[{riverId:1,sourceEdgeKey:'edge',fullness:4,points:[{x:-2,y},{x:2,y}]}],widthByFullness:new Map([[4,.4]])});
  const nearby={roads:[],crossings:[],anchors:[],water:beside(.5)};
  assert.deepEqual(smallLakeShoreConflict(lake,42,{x:0,y:0},nearby),{kind:'water',ref:'1'});
  assert.equal(smallLakeShoreConflict(lake,42,{x:0,y:0},{...nearby,water:beside(.8)}),null);
});
test('fine POI label retains localized type and explicit name without fallback duplication',()=>{
 assert.equal(finePoiLabel('Городок','Айхенхайм'),'Городок Айхенхайм');
 assert.equal(finePoiLabel('Town','Eichenheim'),'Town Eichenheim');
 assert.equal(finePoiLabel('Town',''),'Town');assert.equal(finePoiLabel('Point of interest','Unknown'),'Point of interest Unknown');
 assert.equal(finePoiLabel('Town','Town Hall'),'Town Town Hall','never strip words from authored names');
});
const road={key:'d',roadId:1,segmentKey:'s',x1:0,y1:0,x2:10,y2:0,kind:'road'};
const river={key:'river-segment-2-1',x1:5,y1:-5,x2:5,y2:5,width:99,fullness:3};
const cross=kind=>({key:'c',roadId:1,roadSegmentKey:'s',riverId:2,x:5,y:0,kind});
test('fine crossing paint distinguishes bridge, translucent ford and a real ferry road gap',()=>{
 const inputs=JSON.stringify({road,river});
 for(let F=1;F<=5;F++)assert.ok(Math.abs(fineRiverStrokeWidth(F)/FINE_HEX_WIDTH-F/10)<1e-12);
 for(const invalid of [0,6,1.5,NaN,Infinity])assert.equal(fineRiverStrokeWidth(invalid),0);
 const bridge=fineRoadPresentation(road,[cross('bridge')],[river]);assert.equal(bridge.rails.length,2);assert.equal(bridge.pieces.length,1);
 const ford=fineRoadPresentation(road,[cross('ford')],[river]);assert.equal(ford.pieces.filter(p=>p.opacity===.42).length,1);
 const ferry=fineRoadPresentation(road,[cross('ferry')],[river]);assert.equal(ferry.rails.length,0);assert.equal(ferry.pieces.length,2);
 const half=fineRiverStrokeWidth(river.fullness)/2;
 assert.ok(Math.abs(ferry.pieces[0].x2-(5-half))<1e-12);assert.ok(Math.abs(ferry.pieces[1].x1-(5+half))<1e-12);
 const wet=ford.pieces.find(p=>p.opacity===.42);assert.ok(Math.abs(wet.x1-(5-half))<1e-12);assert.ok(Math.abs(wet.x2-(5+half))<1e-12);
 for(const rail of bridge.rails){const [a,b]=rail.points.split(' ').map(p=>p.split(',').map(Number));assert.ok(a[0]<5-half&&b[0]>5+half,'rails span visible banks');}
 assert.equal(JSON.stringify({road,river}),inputs,'input geometry stays unchanged');
});
test('fine crossing splits all ordered unique crossings and clamps endpoint or degenerate input',()=>{
 const a={...cross('ferry'),key:'a',x:2},b={...cross('ford'),key:'b',x:8};
 const rivers=[{...river,x1:2,x2:2},{...river,key:'river-segment-2-2',x1:8,x2:8}];
 const plan=fineRoadPresentation(road,[b,a,a],rivers);assert.equal(plan.crossings.length,2);assert.ok(plan.pieces.some(p=>p.opacity===.42));
 for(const p of plan.pieces)assert.ok(p.x1>=0&&p.x2<=10&&p.x1<p.x2);
 assert.deepEqual(plan,fineRoadPresentation(road,[a,b],rivers));
 assert.deepEqual(fineRoadPresentation({...road,x2:0},[a],rivers).pieces,[]);
 const edge=fineRoadPresentation(road,[{...a,x:0}],[{...river,x1:0,x2:0}]);assert.equal(edge.pieces.length,1);assert.ok(Math.abs(edge.pieces[0].x1-fineRiverStrokeWidth(river.fullness)/2)<1e-12);assert.equal(edge.pieces[0].x2,10);assert.ok(edge.pieces.every(p=>Number.isFinite(p.x1)&&p.x1>=0));
});
test('refined crossing paint follows display width without moving accepted paths or POI masks',()=>{
 const refined={roadId:1,sourceRoadSegmentKey:'s',kind:'road',points:[{x:0,y:0},{x:10,y:0}],paint:[{from:{x:0,y:0},to:{x:1,y:0},poiMaskIds:['poi']},{from:{x:1,y:0},to:{x:10,y:0},poiMaskIds:[]}]};
 const crossing={key:'r',roadId:1,roadSegmentKey:'s',riverId:2,kind:'ferry',fullness:5,roadDistance:5,roadTangent:{x:1,y:0},riverTangents:[{x:0,y:1}]};
 const water=displayWater([{riverId:2,sourceEdgeKey:'r',fullness:5,points:[{x:5,y:-5},{x:5,y:5}]}]);
 const before=JSON.stringify({refined,crossing}),plan=fineRefinedRoadPresentation(refined,[crossing],1,water),half=fineRiverStrokeWidth(5)/2;
 assert.equal(plan.rails.length,0);assert.equal(plan.pieces[0].from.x,1);assert.equal(plan.pieces[0].startDistance,1);assert.ok(Math.abs(plan.pieces[0].to.x-(5-half))<1e-12);assert.ok(Math.abs(plan.pieces.at(-1).from.x-(5+half))<1e-12);assert.ok(Math.abs(plan.pieces.at(-1).startDistance-(5+half))<1e-12);assert.equal(plan.pieces.at(-1).to.x,10);
 const ford=fineRefinedRoadPresentation(refined,[{...crossing,kind:'ford'}],1,water);assert.ok(ford.pieces.some(p=>p.opacity===.42));
 const bridge=fineRefinedRoadPresentation(refined,[{...crossing,kind:'bridge'}],1,water);assert.equal(bridge.rails.length,2);assert.ok(bridge.pieces.every(p=>p.opacity===1));
 assert.equal(JSON.stringify({refined,crossing}),before);
});
// R05/REV-01: the old width/sin calculation removes the entire road even
// where a finite river ends or a bent road has already left the water.
test('finite visible water preserves dry approaches at shallow and endpoint crossings',()=>{
 for(const x of [5,.1,9.9]){
  const shortRiver={key:'river-segment-2-short',x1:x-.2,y1:-.002,x2:x+.2,y2:.002,width:99,fullness:1};
  const c={...cross('ferry'),x};
  const plan=fineRoadPresentation(road,[c],[shortRiver]);
  const radius=fineRiverStrokeWidth(1)/2;
  assert.ok(plan.pieces.length>0,'finite near-parallel river cannot erase dry road');
  for(const p of plan.pieces)assert.ok(Number.isFinite(p.x1)&&p.x1>=0&&p.x2<=10);
  if(x===5){assert.equal(plan.pieces.length,2);assert.ok(plan.pieces[0].x2>4);assert.ok(plan.pieces[1].x1<6);}
  assert.ok(plan.pieces.reduce((sum,p)=>sum+p.x2-p.x1,0)>8-radius);
 }
 const shortRiver=x=>({key:`river-segment-2-${x}`,x1:x-.2,y1:-.002,x2:x+.2,y2:.002,width:99,fullness:1});
 const multiple=fineRoadPresentation(road,[{...cross('ferry'),key:'a',x:4.8},{...cross('ferry'),key:'b',x:5.2}],[shortRiver(4.8),shortRiver(5.2)]);
 assert.equal(multiple.pieces.length,2);assert.ok(multiple.pieces[0].x2>4&&multiple.pieces[1].x1<6);
 const refined={roadId:1,sourceRoadSegmentKey:'s',kind:'road',points:[{x:0,y:3},{x:4.8,y:0},{x:5.2,y:0},{x:10,y:3}],paint:[{from:{x:0,y:3},to:{x:4.8,y:0},poiMaskIds:[]},{from:{x:4.8,y:0},to:{x:5.2,y:0},poiMaskIds:[]},{from:{x:5.2,y:0},to:{x:10,y:3},poiMaskIds:[]}]};
 const first=Math.hypot(4.8,3),c={key:'r',roadId:1,roadSegmentKey:'s',riverId:2,kind:'ferry',fullness:5,roadDistance:first+.2,roadTangent:{x:1,y:0},riverTangents:[{x:1,y:.01}]};
 const water=displayWater([{riverId:2,sourceEdgeKey:'r',fullness:5,points:[{x:0,y:-.05},{x:10,y:.05}]}]);
 const before=JSON.stringify({refined,c,water}),plan=fineRefinedRoadPresentation(refined,[c],1,water);
 assert.ok(plan.pieces.length>=2);assert.deepEqual(plan.pieces[0].from,refined.points[0]);assert.deepEqual(plan.pieces.at(-1).to,refined.points.at(-1));
 for(const p of plan.pieces)for(const q of [p.from,p.to])assert.ok(q.y>=0&&q.x>=0&&q.x<=10);
 assert.equal(JSON.stringify({refined,c,water}),before,'presentation does not mutate accepted geometry');
 for(const positions of [[1],[.1],[1.9],[.8,1.2]]){
  const points=[{x:0,y:0},{x:2,y:0}],r={roadId:1,sourceRoadSegmentKey:'s',kind:'road',points,paint:[{from:points[0],to:points[1],poiMaskIds:[]}]};
  const crossings=positions.map((x,i)=>({...c,key:`short-${i}`,fullness:1,roadDistance:x}));
  const water=displayWater(positions.map((x,i)=>({riverId:2,sourceEdgeKey:`short-${i}`,fullness:1,points:[{x:x-.02,y:-.0002},{x:x+.02,y:.0002}]})));
  const view=fineRefinedRoadPresentation(r,crossings,1,water);
  assert.ok(view.pieces.length>0,'short refined road retains dry approach at near-end or close crossings');
  assert.ok(view.pieces.reduce((n,p)=>n+Math.hypot(p.to.x-p.from.x,p.to.y-p.from.y),0)>.5);
 }
});
