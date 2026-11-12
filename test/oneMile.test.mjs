import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailGrid, detailCellPolygon, detailCellAreaSquareMiles, detailCellCenter} from '../src/detailGrid.ts';
import {dominantFineBiome, projectOneMile, oneMileCandidates, chooseOneMileAnchor,
  fineCellKey, parseFineCellEdits, prepareFineCellEdit, prepareFineCellLoss} from '../src/oneMile.ts';

// This is the first fine-address domain seam on main. Existing mapTransactions
// tests exercise source-six fields and cannot detect a fine-to-source overwrite.
// Domain portions of OM02/03/04/05/11/12 only: these are not acceptance of
// App rendering, POI, save formats, history or browser behaviour.
const c=(q,r)=>({q,r}), source=(q,r,biome='forest')=>({cell:c(q,r),landBiomeId:biome});
const area=detailCellAreaSquareMiles(createDetailGrid(1));
const valid=id=>['forest','hills','plain'].includes(id);
const accepted=()=>projectOneMile([source(0,0)]);
const neighbours=cell=>[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([q,r])=>c(cell.q+q,cell.r+r));

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
import {finePoiLabel, fineRoadPresentation} from '../src/oneMilePresentation.ts';
test('fine POI label retains localized type and explicit name without fallback duplication',()=>{
 assert.equal(finePoiLabel('Городок','Айхенхайм'),'Городок Айхенхайм');
 assert.equal(finePoiLabel('Town','Eichenheim'),'Town Eichenheim');
 assert.equal(finePoiLabel('Town',''),'Town');assert.equal(finePoiLabel('Point of interest','Unknown'),'Point of interest Unknown');
 assert.equal(finePoiLabel('Town','Town Hall'),'Town Town Hall','never strip words from authored names');
});
const road={key:'d',roadId:1,segmentKey:'s',x1:0,y1:0,x2:10,y2:0,kind:'road'};
const river={key:'river-segment-2-1',x1:5,y1:-5,x2:5,y2:5,width:6};
const cross=kind=>({key:'c',roadId:1,roadSegmentKey:'s',riverId:2,x:5,y:0,kind});
test('fine crossing paint distinguishes bridge, translucent ford and a real ferry road gap',()=>{
 const bridge=fineRoadPresentation(road,[cross('bridge')],[river]);assert.equal(bridge.rails.length,2);assert.equal(bridge.pieces.length,1);
 const ford=fineRoadPresentation(road,[cross('ford')],[river]);assert.equal(ford.pieces.filter(p=>p.opacity===.42).length,1);
 const ferry=fineRoadPresentation(road,[cross('ferry')],[river]);assert.equal(ferry.rails.length,0);assert.equal(ferry.pieces.length,2);
 assert.ok(ferry.pieces[0].x2<5&&ferry.pieces[1].x1>5);assert.equal(JSON.stringify(road),JSON.stringify({...road}));
});
test('fine crossing splits all ordered unique crossings and clamps endpoint or degenerate input',()=>{
 const a={...cross('ferry'),key:'a',x:2},b={...cross('ford'),key:'b',x:8};
 const rivers=[{...river,x1:2,x2:2},{...river,key:'river-segment-2-2',x1:8,x2:8}];
 const plan=fineRoadPresentation(road,[b,a,a],rivers);assert.equal(plan.crossings.length,2);assert.ok(plan.pieces.some(p=>p.opacity===.42));
 for(const p of plan.pieces)assert.ok(p.x1>=0&&p.x2<=10&&p.x1<p.x2);
 assert.deepEqual(plan,fineRoadPresentation(road,[a,b],rivers));
 assert.deepEqual(fineRoadPresentation({...road,x2:0},[a],rivers).pieces,[]);
 const edge=fineRoadPresentation(road,[{...a,x:0}],[{...river,x1:0,x2:0}]);assert.ok(edge.pieces.every(p=>Number.isFinite(p.x1)&&p.x1>=0));
});
