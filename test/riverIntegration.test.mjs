import test from 'node:test';
import assert from 'node:assert/strict';
import { createGenerationHarness } from './helpers/generation-harness.mjs';
import {solveManualRiverPath} from '../src/manualRiverGeometry.ts';
import {prepareRiverEdit,validateEditedRiverNetwork,emptyRiverFeatures} from '../src/manualRivers.ts';
import { validateRiverNetwork } from '../src/riverModel/core.ts';

function values(rivers) {
  return new Map(rivers.flatMap(r => r.sectors.flatMap(s => s.edgeKeys.map(k => [k, s.fullness]))));
}
function checkExtension(h, before) {
  const app = h.render(), g = h.geometry;
  const after = values(app.rivers);
  for (const [key, f] of values(before)) assert.equal(after.get(key), f, `old edge ${key}`);
  const built = g.buildRegionRiverNetwork(app.rivers, before, app.regions, app.candidateHexes, app.hexTerrainByKey);
  assert.deepEqual(Array.from(built.issues), []);
  const result = validateRiverNetwork({ ...built.network, edges: built.network.edges.map(e => ({ ...e, fullness: after.get(e.id) })) });
  assert.equal(result.valid, true, JSON.stringify(result.issues));
}
function outgoingFixture(seed, fullness = 3) {
  const h = createGenerationHarness(seed), g = h.geometry;
  h.render().addFallbackTractToMap({ q: -5, r: 0 });
  const t = h.render().regions[0], neighbor = { q: -1, r: 0 }, anchor = { q: 0, r: 0 };
  const ac = new Set(g.getHexCornerPoints(anchor).map(v => v.key)), cs = g.getHexCornerPoints(neighbor);
  const i = cs.findIndex((v, j) => ac.has(v.key) && !ac.has(cs[(j + 1) % 6].key));
  const path = [cs[i], cs[(i + 1) % 6], cs[(i + 2) % 6]];
  const region = { ...t, id: 1, hexes: [neighbor], anchorHex: neighbor, centerHex: neighbor, finalSize: 1, heightLevel: 1, biomeId: 'open_plains', pointsOfInterest: [], pointOfInterestKinds: {} };
  const river = { id: 1, regionId: 1, vertexPath: path, sectors: g.createInitialRiverSectors(1, path, fullness, {}, 1) };
  const snapshot = { regions: [region], rivers: [river], candidateHexes: g.getCandidateHexes([neighbor], new Set()), roads: [], crossings: [], hexTerrainByKey: new Map(), waterPoiByKey: new Map(), biomeOverrideByHexKey: new Map(), nextLakeId: 1, nextRoadId: 1 };
  h.render().restoreSnapshot(snapshot);
  return { h, g, snapshot, anchor };
}

test('AUD-01/02 RIV-EX-07/08/15/16 real upstream clicks preserve fixed flows and validate new sources', () => {
  for (const seed of [1, 2, 3, 4, 5]) for (const targetSize of [1, 15]) for (const fullness of [1, 3, 5]) {
    const { h, g, snapshot, anchor } = outgoingFixture(seed, fullness);
    h.render().safelyAddRegionToMap(anchor, { coastalPreference: 'mainland', targetSize });
    assert.equal(h.render().regions.length, 2);
    checkExtension(h, snapshot.rivers);
    const saved = JSON.parse(JSON.stringify(h.render().createSaveData()));
    g.assertHexcrawlSaveData(saved);
    assert.deepEqual(saved.map.rivers, JSON.parse(JSON.stringify(h.render().rivers)));
    h.render().deleteLastRegion();
    assert.equal(JSON.stringify(h.render().rivers), JSON.stringify(snapshot.rivers));
    assert.equal(h.render().hexTerrainByKey.size, 0);
  }
});

test('AUD-03 RIV-EX-16 lake placement is atomic when actual connected area is insufficient', () => {
  const { h, g } = outgoingFixture(1);
  const region = { ...h.render().regions[0], hexes: [{ q: 0, r: 0 }] }, terrain = new Map();
  assert.equal(g.addLakeAroundRiverSplitVertex(region, g.getHexCornerPoints(region.hexes[0])[0], 3, terrain), null);
  assert.equal(terrain.size, 0);
});

test('AUD-04 imported numeric fullness outside 1…5 is rejected without mutating the map', () => {
  const { h, g } = outgoingFixture(1);
  const saved = h.render().createSaveData(), original = JSON.stringify(saved);
  for (const fullness of [0, 6, 99, 1.5, '3', null]) {
    const bad = JSON.parse(original); bad.map.rivers[0].sectors[0].fullness = fullness;
    assert.throws(() => g.assertHexcrawlSaveData(bad), /Полноводность/);
  }
  assert.equal(JSON.stringify(h.render().createSaveData().map), JSON.stringify(saved.map));
});

test('RIV-EX-01/12/13/15 real map expansion validates each extension in all coast modes', () => {
  for (const mode of ['mainland', 'coast', 'auto']) for (const seed of [7, 42, 103]) {
    const h = createGenerationHarness(seed);
    for (let i = 0; i < 8; i++) {
      const before = h.render(), anchor = before.candidateHexes[0] ?? (i === 0 ? { q: 0, r: 0 } : null);
      if (!anchor) break;
      const result = before.safelyAddRegionToMap(anchor, { coastalPreference: i ? mode : 'mainland', targetSize: 15 });
      if (!result.success) {
        // A constrained coastal pocket may have no room for a required source
        // lake. RIV-017 forbids the former fallback that silently closed it.
        assert.equal(result.diagnostic.kind, 'constraint-rejection');
        assert.equal(JSON.stringify(h.render().regions), JSON.stringify(before.regions));
        assert.equal(JSON.stringify(h.render().rivers), JSON.stringify(before.rivers));
        assert.equal(JSON.stringify(h.render().history), JSON.stringify(before.history));
        assert.equal(JSON.stringify([...h.render().hexTerrainByKey]), JSON.stringify([...before.hexTerrainByKey]));
        break;
      }
      assert.equal(h.render().regions.length, before.regions.length + 1);
      checkExtension(h, before.rivers);
      assert.equal(h.logs.some(l => l.args[0] === 'Regular region generation crashed; creating fallback tract'), false);
    }
  }
});

test('RIV-EX-03/19 adapter solves real sector directions at a junction and preserves region ownership', () => {
  const { h, g } = outgoingFixture(1);
  const v = key => ({ key, x: 0, y: 0 });
  const [a, b, c, d, j] = ['a', 'b', 'c', 'd', 'j'].map(v);
  const candidate = { q: 10, r: 10 }, out = g.getHexCornerPoints(candidate)[0];
  const make = (id, path, f, regionId) => ({ id, regionId, vertexPath: path, sectors: g.createInitialRiverSectors(id, path, f, {}, regionId) });
  for (const height of [1, 2]) {
    const region = { ...h.render().regions[0], id: 2, heightLevel: height };
    const prior = [make(1, [a, b], 2, 1), make(2, [c, d], 1, 1)];
    const next = [ { ...prior[0], vertexPath: [a, b, j, out], sectors: [...prior[0].sectors, ...g.createInitialRiverSectors(1, [b, j, out], 5, {}, 2)] },
      { ...prior[1], vertexPath: [c, d, j], sectors: [...prior[1].sectors, ...g.createInitialRiverSectors(2, [d, j], 5, {}, 2)] } ];
    const result = g.reconcileRegionRiverModel(next, prior, region, [h.render().regions[0], region], [candidate], new Map(), false);
    assert.equal(result.success, true, result.reason);
    const f = values(result.rivers);
    assert.equal(f.get([j.key, out.key].sort().join('|')), height === 1 ? 3 : 2);
    assert.equal(f.get('a|b'), 2);
    assert.equal(result.rivers[0].sectors.at(-1).assignedRegionId, 2);
    assert.equal(JSON.stringify(next[0].sectors.at(-1).fullness), '5', 'input is not mutated');
  }
});

test('RIV-EX-08 tract lake source uses actual area and retains exact old downstream flow', () => {
  // mulberry32-v1 seed 0 reproduces the same required source-lake extension.
  const { h, snapshot, anchor } = outgoingFixture(0, 3);
  h.render().safelyAddRegionToMap(anchor, { coastalPreference: 'mainland', targetSize: 1 });
  checkExtension(h, snapshot.rivers);
  assert.ok(h.render().rivers[0].vertexPath.length > snapshot.rivers[0].vertexPath.length, 'source was actually connected');
  assert.ok([...h.render().hexTerrainByKey.values()].filter(t => t.terrainOverride === 'lake').length >= 2);
  assert.ok(h.render().rivers[0].sectors.every(s => s.fullness === 3));
});

test('RIV-EX-21 lake shared by two regions counts unique hexes and all ports once', () => {
  const { h, g } = outgoingFixture(1);
  const hexes = [{ q: 0, r: 0 }, { q: 1, r: 0 }];
  const regions = hexes.map((hex, i) => ({ ...h.render().regions[0], id: i + 1, hexes: [hex] }));
  const candidates = [{ q: 10, r: 0 }, { q: 20, r: 0 }, { q: 30, r: 0 }];
  const contacts = [g.getHexCornerPoints(hexes[0])[3], g.getHexCornerPoints(hexes[1])[0], g.getHexCornerPoints(hexes[1])[1]];
  const rivers = [4, 3, 5].map((f, i) => {
    const outer = g.getHexCornerPoints(candidates[i])[0];
    const path = i === 2 ? [contacts[i], outer] : [outer, contacts[i]];
    return { id: i + 1, regionId: i ? 2 : 1, vertexPath: path, sectors: g.createInitialRiverSectors(i + 1, path, f, {}, i ? 2 : 1) };
  });
  const terrain = new Map(hexes.map(hex => [g.hexKey(hex), { terrainOverride: 'lake', lakeId: 1 }]));
  const built = g.buildRegionRiverNetwork(rivers, [], regions, candidates, terrain, true);
  const lakes = built.network.nodes.filter(n => n.kind === 'lake');
  assert.equal(lakes.length, 1);
  assert.equal(lakes[0].lakeHexCount, 2);
  assert.equal(validateRiverNetwork(built.network).valid, true);
  const tooSmall = { ...built.network, nodes: built.network.nodes.map(n => n.kind === 'lake' ? { ...n, lakeHexCount: 1 } : n) };
  assert.equal(validateRiverNetwork(tooSmall).valid, false);
  const ring=g.getCandidateHexes(hexes,new Set()),all=[...hexes,...ring];
  const physicalMap={...h.render().captureDocument().map,regions:[...regions,{...regions[0],id:3,hexes:ring}],candidateHexes:g.getCandidateHexes(all,new Set()),hexTerrainByKey:terrain};
  const physical=g.buildManualRiverGeometryContext(physicalMap);
  assert.equal(physical.geometry.lakeHexCount.get('lake:1'),2,'same lakeId across owners counted once');
  const ports=[...physical.geometry.edgeOwners.keys()].map(key=>key.split('|')).filter(([a,b])=>physical.geometry.lakeByVertex.has(a)!==physical.geometry.lakeByVertex.has(b)).map(([a,b])=>physical.geometry.lakeByVertex.has(a)?[b,a]:[a,b]).filter(([outside])=>physical.geometry.openVertices.has(outside));
  const picked=[];for(const pair of ports)if(!picked.some(p=>p[0]===pair[0]))picked.push(pair);
  assert.ok(picked.length>=3,'three actual independent lake ports');
  const actual=[4,3,5].map((f,i)=>{const keys=i===2?picked[i].slice().reverse():picked[i];const path=keys.map(k=>physical.vertex(k));return {id:i+1,regionId:3,vertexPath:path,sectors:g.createInitialRiverSectors(i+1,path,f,{},3)};});
  const real=physical.network(actual);assert.deepEqual(Array.from(real.issues),[]);assert.equal(real.network.nodes.filter(n=>n.kind==='lake').length,1);assert.equal(validateRiverNetwork(real.network).valid,true);
  const small={...real.network,nodes:real.network.nodes.map(n=>n.kind==='lake'?{...n,lakeHexCount:1}:n)};assert.equal(validateRiverNetwork(small).valid,false);
  assert.throws(()=>validateEditedRiverNetwork(actual,actual,{network:()=>({issues:[],network:small})},{network:()=>real}),/RIV-009|RIV-018/,'E6 shrinking water rechecks actual fixed ports against its prior geometry');
  const waterMap={...physicalMap,regions:physicalMap.regions.map(r=>({...r,centerHex:r.hexes[0],anchorHex:r.hexes[0],finalSize:r.hexes.length,pointsOfInterest:[],pointOfInterestKinds:{}})),rivers:actual,roads:[],crossings:[],riverFeatures:emptyRiverFeatures(),nextRiverId:4,nextRoadId:1,nextLakeId:2,waterPoiByKey:new Map(),biomeOverrideByHexKey:new Map(),toponyms:{},tags:{schemaVersion:1,instances:[],rollCounters:{}}};
  const exact=JSON.stringify({...waterMap,hexTerrainByKey:[...waterMap.hexTerrainByKey]});
  assert.throws(()=>g.prepareWaterMapEdit(waterMap,{target:'land',hexKeys:['1,0']}),/river_rule|river_reentry/,'E6 full physical transaction rejects an insufficient/removed lake port');
  let expanded;
  for(const h of ring){try{const plan=g.prepareWaterMapEdit(waterMap,{target:'lake',hexKeys:[g.hexKey(h)]});if(plan.geometry.unresolved.length===0&&!plan.losses.length){expanded=plan;break;}}catch{}}
  assert.ok(expanded,'at least one real free shore supports expansion with all three fixed ports');
  const unverified={...waterMap,rivers:waterMap.rivers.map((r,i)=>i?r:{...r,sectors:[]})};assert.throws(()=>g.prepareWaterMapEdit(unverified,{target:'lake',hexKeys:expanded.geometry.changedHexKeys.filter(k=>waterMap.hexTerrainByKey.get(k)?.terrainOverride!=='lake')}),/river_unverified/,'changed lake area cannot borrow an unknown fixed-F legacy allowance');
  assert.deepEqual(values(expanded.map.rivers),values(actual));assert.deepEqual(expanded.map.rivers.map(r=>r.vertexPath),actual.map(r=>r.vertexPath));
  assert.equal(JSON.stringify({...waterMap,hexTerrainByKey:[...waterMap.hexTerrainByKey]}),exact,'physical water preflight is detached on success and failure');

  const inside=g.getHexCornerPoints(hexes[0]).slice(0,2);const hidden={id:9,regionId:1,vertexPath:inside,sectors:g.createInitialRiverSectors(9,inside,1,{},1)};
  assert.match(Array.from(physical.network([hidden]).issues).join(';'),/no_external_river_port/,'an entirely internal lake stroke is not a standalone valid river');
});

// E5 physical identity/ownership is separate from the old numerical adapter's
// deliberately synthetic junction fixtures. One real-hex contract case reuses
// the existing outgoingFixture and real App save validator.
test('E5 manual geometry uses actual vertices, neighbours, owners and open frontier without touching the document',()=>{
 const {h,g}=outgoingFixture(1),map=h.render().captureDocument().map,before=JSON.stringify(h.render().captureDocument());
 const ctx=g.buildManualRiverGeometryContext(map),doc={rivers:map.rivers,riverFeatures:emptyRiverFeatures(),nextRiverId:map.nextRiverId};
 assert.deepEqual(Array.from(ctx.network(doc.rivers).issues),[]);assert.equal(validateRiverNetwork(ctx.network(doc.rivers).network).valid,true);
 const editCtx={...ctx,rapid:()=>true,waterfall:()=>true,additionalValidation:()=>{}}; // fixture has no road/delta/feature dependencies
 const edge=doc.rivers[0].sectors[0].edgeKeys[0],changed=prepareRiverEdit(doc,{type:'fullness',riverId:1,edgeKey:edge,fullness:4},editCtx);
 assert.ok(changed.rivers[0].sectors.every(s=>s.fullness===4));assert.deepEqual(changed.rivers[0].vertexPath,doc.rivers[0].vertexPath);
 const reversed=prepareRiverEdit(doc,{type:'reverse',riverId:1},editCtx);assert.deepEqual(reversed.rivers[0].vertexPath,doc.rivers[0].vertexPath.slice().reverse());
 const saved=JSON.parse(JSON.stringify(h.render().createSaveData()));saved.map.rivers=JSON.parse(JSON.stringify(changed.rivers));g.assertHexcrawlSaveData(saved);
 const corrupt=mutate=>{const rivers=structuredClone(doc.rivers);mutate(rivers[0]);return Array.from(ctx.network(rivers).issues).join(';');};
 assert.match(corrupt(r=>r.vertexPath[0].x+=2),/unknown_vertex/);assert.match(corrupt(r=>r.vertexPath[0].x=NaN),/unknown_vertex/);
 assert.match(corrupt(r=>r.vertexPath.splice(1,1)),/nonphysical_edge/);
 assert.match(corrupt(r=>r.sectors[0].assignedRegionId=999),/invalid_owner/);
 assert.match(corrupt(r=>r.sectors.push({...r.sectors[0],fullness:1})),/ambiguous_fullness/);
 const without=structuredClone(map);without.candidateHexes=[];
 assert.equal(validateRiverNetwork(g.buildManualRiverGeometryContext(without).network(doc.rivers).network).valid,true,'frontier derived from physical uncreated land, not cached UI list');
 const last=doc.rivers[0].vertexPath.at(-1).key,first=doc.rivers[0].vertexPath[0].key;
 const sea=map.candidateHexes.find(x=>{const keys=g.getHexCornerPoints(x).map(v=>v.key);return keys.includes(last)&&!keys.includes(first);});assert.ok(sea);
 const coastal=structuredClone(map);coastal.hexTerrainByKey.set(g.hexKey(sea),{terrainOverride:'sea'});
 assert.throws(()=>prepareRiverEdit(doc,{type:'reverse',riverId:1},{...editCtx,...g.buildManualRiverGeometryContext(coastal)}),/RIV/,'sea must not turn into a source');
 assert.equal(JSON.stringify(h.render().captureDocument()),before,'geometry preparation never mutates the live App or histories');
});

// Existing core tests cover numeric tables, not unknown physical drafts with
// fixed App neighbours/counters or the final full-network check beyond a cut.
test('E5 real path solver keeps explicit reach conditions and reports bounded limit without a partial document',()=>{
 const {h,g}=outgoingFixture(1),original=h.render().captureDocument().map;
 const map={...original,rivers:[]},ctx=g.buildManualRiverGeometryContext(map),base={rivers:[],riverFeatures:emptyRiverFeatures(),nextRiverId:2};
 const path=original.rivers[0].vertexPath,edit={type:'create',regionId:1,path},full={...ctx,rapid:()=>true,waterfall:()=>true,additionalValidation:()=>{}};
 const auto=prepareRiverEdit(base,edit,full);assert.equal(auto.nextRiverId,3);assert.equal(auto.rivers[0].id,2);assert.equal(validateRiverNetwork(ctx.network(auto.rivers).network).valid,true);
 const key=auto.rivers[0].sectors[0].edgeKeys[0],fixed=prepareRiverEdit(base,{...edit,fullnessByEdge:{[key]:4}},full);assert.ok(fixed.rivers[0].sectors.every(s=>s.fullness===4));
 const existing={...base,rivers:fixed.rivers,nextRiverId:3},existingMap={...map,rivers:fixed.rivers},replaceCtx={...full,...g.buildManualRiverGeometryContext(existingMap)};
 const replacement={type:'replace',riverId:2,regionId:1,path,fullnessByEdge:{[key]:2}};
 const changed=prepareRiverEdit(existing,replacement,replaceCtx);assert.ok(changed.rivers[0].sectors.every(s=>s.fullness===2),'condition applies to the hydrological reach, not one visual stroke');
 assert.equal(prepareRiverEdit(existing,{...replacement,fullnessByEdge:{[key]:4}},replaceCtx),existing);
 const before=JSON.stringify(base),target={id:2,regionId:1,vertexPath:[],sectors:[]};
 assert.throws(()=>solveManualRiverPath([],target,path,new Map(),ctx.geometry,{maxStates:1}),error=>error.status==='limit'&&/упростите русло/.test(error.message));
 assert.equal(JSON.stringify(base),before);assert.equal(base.nextRiverId,2);assert.deepEqual(base.rivers,[]);
 assert.throws(()=>prepareRiverEdit(base,{...edit,fullness:1,fullnessByEdge:{[key]:4}},full),/conflicting_fullness/);
 // AC01/03: exercise the complete App writer on actual dry-source/lake ports
 // in both modes; reuse this physical fixture and the existing solver test.
 const center={q:0,r:0},ring=g.getHexNeighbors(center),all=[center,...ring],template=original.regions[0];
 const regions=[{...template,id:1,hexes:[center,...ring.slice(0,3)],centerHex:center,anchorHex:center,finalSize:4,targetSize:4,heightLevel:1},{...template,id:2,hexes:ring.slice(3),centerHex:ring[3],anchorHex:ring[3],finalSize:3,targetSize:3,heightLevel:3}];
 const emptyMap={...original,seas:[],nextSeaId:1,regions,rivers:[],roads:[],crossings:[],riverFeatures:emptyRiverFeatures(),hexTerrainByKey:new Map(),candidateHexes:g.getCandidateHexes(all,new Set()),nextRiverId:1,nextLakeId:1};
 const real=g.buildManualRiverGeometryContext(emptyMap),start=real.vertex('24.249,-14'),end=real.vertex('48.497,-28'),sea={q:2,r:-1};assert.ok(start&&end);
 const stable=()=>{const d=JSON.parse(JSON.stringify(h.render().createSaveData()));delete d.savedAt;return d;};
 for(const mode of ['classic','mythic'])for(const kind of ['open','sea','lake']){
   const terrain=new Map(kind==='open'?[]:[['2,-1',{terrainOverride:'sea'}]]);if(kind==='lake')terrain.set('0,0',{terrainOverride:'lake',lakeId:1});
   h.render().restoreSnapshot({...emptyMap,seas:kind==='open'?[]:[{id:1,hexKeys:['2,-1']}],nextSeaId:kind==='open'?1:2,hexTerrainByKey:terrain,nextLakeId:kind==='lake'?2:1});h.render().setGenerationMode(mode);const before=stable();
   const command={type:'create',regionId:1,path:[start,end],fullness:kind==='lake'?2:1};assert.equal(h.render().editRiverDocument(command),true,mode+' '+kind);
   const after=stable();g.assertHexcrawlSaveData(after);assert.deepEqual(after.generation,before.generation);assert.equal(after.ui.generationMode,mode);assert.equal(after.counters.nextRiverId,2);assert.equal(validateRiverNetwork(g.buildManualRiverGeometryContext(h.render().captureDocument().map).network(h.render().rivers).network).valid,true);
   if(kind==='open'){
     const context=g.buildManualRiverGeometryContext(h.render().captureDocument().map),entry=[...context.geometry.edgeOwners].find(([key,owners])=>owners.length===1&&owners[0]===2&&key.split('|').every(k=>context.geometry.openVertices.has(k)));assert.ok(entry,'second owner has a genuine open edge');
     const replacementPath=entry[0].split('|').map(key=>context.vertex(key));assert.equal(h.render().editRiverDocument({type:'replace',riverId:1,regionId:1,path:replacementPath},{confirmed:true}),true);const replaced=stable();assert.equal(replaced.map.rivers[0].id,1);assert.equal(replaced.map.rivers[0].regionId,2,'owner changes only when previous region is no longer adjacent');assert.deepEqual(replaced.map.toponyms,after.map.toponyms);assert.deepEqual(replaced.map.tags,after.map.tags);assert.equal(replaced.counters.nextRiverId,2);g.assertHexcrawlSaveData(replaced);h.render().undoMap();assert.deepEqual(stable(),after);
   }
   if(kind==='lake'){assert.equal(h.render().editRiverDocument({type:'fullness',riverId:1,edgeKey:after.map.rivers[0].sectors[0].edgeKeys[0],fullness:3}),false,'one hex cannot sourceF3');assert.deepEqual(stable(),after);}
   h.render().undoMap();assert.deepEqual(stable(),before);h.render().redoMap();assert.deepEqual(stable(),after);
 }

});
test('E5 unknown tributary preserves fixed neighbouring legacy source and owner heights',()=>{
 const {h,g}=outgoingFixture(1),base=h.render().captureDocument().map,center=base.regions[0].hexes[0],ring=g.getHexNeighbors(center);
 const regions=[{...base.regions[0],hexes:[center],id:1,heightLevel:1},{...base.regions[0],hexes:ring,id:2,heightLevel:3}];
 let map={...base,regions,rivers:[],hexTerrainByKey:new Map(),candidateHexes:g.getCandidateHexes([center,...ring],new Set())};
 const empty=g.buildManualRiverGeometryContext(map),corners=g.getHexCornerPoints(center),join=corners[0],a=corners[5],b=corners[1];
 const adjacent=k=>[...empty.geometry.edgeOwners.keys()].filter(e=>e.split('|').includes(k)).map(e=>e.split('|').find(x=>x!==k));
 const c=adjacent(join.key).find(k=>k!==a.key&&k!==b.key),d=adjacent(b.key).find(k=>k!==join.key&&empty.geometry.openVertices.has(k));assert.ok(c&&d);assert.equal(empty.geometry.openVertices.has(a.key),false);assert.equal(empty.geometry.openVertices.has(c),true);
 const path=[a,join,b,empty.vertex(d)],sectors=path.slice(1).flatMap((v,i)=>g.createInitialRiverSectors(1,[path[i],v],3,{},empty.edgeOwners([path[i].key,v.key].sort().join('|'))[0])).map((s,i)=>({...s,id:`fixed:${i}`,sectorIndex:i+1}));
 const main={id:1,regionId:1,vertexPath:path,sectors};map={...map,rivers:[main]};const ctx=g.buildManualRiverGeometryContext(map),doc={rivers:[main],riverFeatures:emptyRiverFeatures(),nextRiverId:2},before=JSON.stringify(doc);
 assert.equal(validateRiverNetwork(ctx.network(doc.rivers).network).valid,false,'legacy dry sourceF3 is deliberately unchanged');
 const edit={type:'create',regionId:2,path:[ctx.vertex(c),join]},full={...ctx,rapid:()=>true,waterfall:()=>true,additionalValidation:()=>{}};
 assert.equal(prepareRiverEdit(doc,{type:'replace',riverId:1,regionId:1,path,fullnessByEdge:{[main.sectors[0].edgeKeys[0]]:3}},full),doc,'same condition is a no-op even beside an accepted legacy source defect');
 const result=prepareRiverEdit(doc,edit,full);assert.equal(result.rivers[0],main);assert.equal(result.nextRiverId,3);assert.deepEqual(result.rivers[0].sectors.map(s=>s.fullness),[3,3,3]);
 assert.deepEqual(result.rivers[0].sectors.map(s=>s.assignedRegionId),[1,1,2]);assert.equal(JSON.stringify(doc),before);
 const branchKey=[c,join.key].sort().join('|'),hard=prepareRiverEdit(doc,{...edit,fullnessByEdge:{[branchKey]:2}},full);assert.equal(hard.rivers[1].sectors[0].fullness,2);assert.equal(hard.rivers[0],main);
 assert.throws(()=>prepareRiverEdit(doc,{...edit,fullness:4},full),/RIV-005/);assert.equal(JSON.stringify(doc),before);
});
test('E5 solved draft still rejects a new physical cycle beyond the fixed exterior cut',()=>{
 const {h,g}=outgoingFixture(1),map=h.render().captureDocument().map,main=map.rivers[0],corners=g.getHexCornerPoints(map.regions[0].hexes[0]);
 let index=corners.findIndex(v=>v.key===main.vertexPath.at(-1).key);const path=[corners[index]];
 while(path.at(-1).key!==main.vertexPath[0].key){index=(index+1)%corners.length;path.push(corners[index]);assert.ok(path.length<=6);}
 const ctx=g.buildManualRiverGeometryContext(map),doc={rivers:map.rivers,riverFeatures:emptyRiverFeatures(),nextRiverId:map.nextRiverId},before=JSON.stringify(doc);
 assert.throws(()=>prepareRiverEdit(doc,{type:'create',regionId:1,path},{...ctx,rapid:()=>true,waterfall:()=>true,additionalValidation:()=>{}}),/RIV-016:CYCLE/);
 assert.equal(JSON.stringify(doc),before);assert.equal(doc.nextRiverId,map.nextRiverId);
});
