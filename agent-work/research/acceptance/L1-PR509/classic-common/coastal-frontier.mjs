import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {seaFixture} from './test/helpers/sea-fixture.mjs';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
const copy=x=>JSON.parse(JSON.stringify(x));
const source=seaFixture('classic',true);
const key=h=>h.q+','+h.r;
const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
function neighbors(k){const [q,r]=k.split(',').map(Number);return dirs.map(([x,y])=>(q+x)+','+(r+y));}
function reach(start,allowed){const seen=new Set([start]),queue=[start];while(queue.length){for(const n of neighbors(queue.pop()))if(!seen.has(n)&&allowed(n)){seen.add(n);queue.push(n);}}return seen;}
async function open(save){const h=createGenerationHarness(42,'?generationDebug=1','en');h.setWindow({alert:m=>{throw Error(m)}});h.injectFunction('readTextFile',async f=>f.text);await h.render().handleImportJson({target:{files:[{text:JSON.stringify(save)}],value:'fixture'}});return h;}
function inspect(ui){
 const owned=ui.regions.flatMap(r=>r.hexes.map(key));
 const land=new Set(owned),sea=new Set(ui.createSaveData().map.seas.flatMap(s=>s.hexKeys));
 const ring=new Set([...land].flatMap(neighbors).filter(k=>!land.has(k)&&!sea.has(k)));
 const shown=ui.candidateHexes.map(key);
 const boundary=new Set([...land,...sea]);
 const radius=Math.max(...[...boundary].flatMap(k=>k.split(',').map(Number).map(Math.abs)))+2;
 const exterior=reach(-radius+','+-radius,k=>!boundary.has(k)&&k.split(',').every(x=>Math.abs(+x)<=radius));
 const holeKeys=[];
 for(let q=-radius;q<=radius;q++)for(let r=-radius;r<=radius;r++){const k=q+','+r;if(!boundary.has(k)&&!exterior.has(k))holeKeys.push(k);}
 const holes=holeKeys.length;
 return {land,sea,ring,shown,holes,holeKeys,overlap:owned.length-land.size,connected:ui.regions.every(r=>{const cells=new Set(r.hexes.map(key));return reach(key(r.hexes[0]),k=>cells.has(k)).size===cells.size}),missing:[...ring].filter(k=>!shown.includes(k)),extra:shown.filter(k=>!ring.has(k)),duplicates:shown.length-new Set(shown).size};
}
const first=await open(source), base=inspect(first.render());
assert.deepEqual([...base.sea].sort(),source.map.seas.flatMap(s=>s.hexKeys).sort());
assert.equal(base.missing.length+base.extra.length+base.duplicates,0);
const results=[];
const second={total:0,passed:0,candidates_checked:0,failures:[],by_first_anchor:[]};
for(const addr of [...base.ring].sort()){
 const h=await open(source);h.render().setGenSizeCategory('locality');const [q,r]=addr.split(',').map(Number);
 h.render().generateAt({q,r});const after=h.render(),g=inspect(after),saved=copy(after.createSaveData()),back=await open(saved),roundtrip=isDeepStrictEqual(copy(back.render().createSaveData()).map,saved.map);
 const previous=source.map.regions[0].hexes.map(key), added=after.regions.filter(r=>r.id!==1).flatMap(r=>r.hexes.map(key));
 const row={anchor:addr,added:added.length,anchored:added.includes(addr),sea_lost:[...base.sea].filter(k=>!g.sea.has(k)),overwrote_sea:added.filter(k=>base.sea.has(k)),old_hexes_lost:previous.filter(k=>!g.land.has(k)),overlap:g.overlap,connected:g.connected,holes:g.holes,missing:g.missing,extra:g.extra,duplicates:g.duplicates,offered:g.shown.length,roundtrip,error:after.generationError};
 results.push(row);
 const targets=[...g.ring].sort();
 let pass=0;
 for(const target of targets){
   const previousMap=copy(back.render().createSaveData()).map;
   assert.deepEqual(previousMap,saved.map);
   const [q,r]=target.split(',').map(Number);
   back.render().setGenSizeCategory('locality');
   back.render().generateAt({q,r});
   const state=back.render(), check=inspect(state);
   const regionIds=new Set(after.regions.map(r=>r.id));
   const fresh=state.regions.filter(r=>!regionIds.has(r.id)).flatMap(r=>r.hexes.map(key));
   const problems={unreachable:!fresh.includes(target),lostSea:[...g.sea].some(k=>!check.sea.has(k)),overwroteSea:fresh.some(k=>g.sea.has(k)),lostLand:[...g.land].some(k=>!check.land.has(k)),overlap:check.overlap,disconnected:!check.connected,holes:check.holes,missing:check.missing,extra:check.extra,duplicates:check.duplicates,error:state.generationError};
   second.total++;second.candidates_checked+=check.shown.length;
   if(Object.values(problems).some(v=>Array.isArray(v)?v.length:!!v)){
     const exported=copy(state.createSaveData());
     const affected=[...new Set([...check.holeKeys,...[...g.sea].filter(k=>!check.sea.has(k)),...check.missing])];
     const cells=affected.map(k=>({key:k,terrain:exported.map.terrainByHexKey[k]??null,seaId:exported.map.seas.find(s=>s.hexKeys.includes(k))?.id??null,candidate:check.shown.includes(k)}));
     let reopened={};try{const imported=await open(exported);const post=inspect(imported.render());const newMap=copy(imported.render().createSaveData()).map;
       const changedKeys=Object.keys(exported.map).filter(k=>!isDeepStrictEqual(exported.map[k],newMap[k]));
       reopened={mapEqual:changedKeys.length===0,changedKeys,holeKeys:post.holeKeys,missing:post.missing,affected:[]};
       for(const cell of cells){
         const hood=neighbors(cell.key).map(k=>({key:k,region:post.land.has(k),surface:newMap.terrainByHexKey[k]?.terrainOverride??null}));
         const offered=post.shown.includes(cell.key);
         const out={key:cell.key,offered,neighbors:hood};
         if(offered){const [q,r]=cell.key.split(',').map(Number);imported.render().setGenSizeCategory('locality');imported.render().generateAt({q,r});const u=imported.render();out.grew=u.regions.some(x=>!state.regions.some(old=>old.id===x.id)&&x.hexes.map(key).includes(cell.key));out.surface=copy(u.createSaveData()).map.terrainByHexKey[cell.key]?.terrainOverride??null;}
         reopened.affected.push(out);
       }}catch(error){reopened={error:error.message};}
     second.failures.push({first:addr,second:target,problems,cells,reopened});
   }
   else {second.passed++;pass++;}
   back.render().undoMap();
 }
 second.by_first_anchor.push({first:addr,attempts:targets.length,passed:pass});
}
console.log(JSON.stringify({initial:{hexes:base.land.size,sea:[...base.sea],offered:base.shown.length,expected:base.ring.size,missing:base.missing,extra:base.extra,holes:base.holes,duplicates:base.duplicates},results,second}));
