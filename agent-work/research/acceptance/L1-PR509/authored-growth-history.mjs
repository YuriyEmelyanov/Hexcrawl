import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {createGenerationHarness}=await import(pathToFileURL(resolve(process.argv[2],'test/helpers/generation-harness.mjs')));
const digest=d=>createHash('sha256').update(JSON.stringify(d)).digest('hex');
const xy=c=>c.q+','+c.r;
const save=h=>JSON.parse(JSON.stringify(h.render().createSaveData()));
const equal=(a,b)=>{try{assert.deepEqual(a,b);return true}catch{return false}};
for(let seed=42;seed<=61;seed++){
 const h=createGenerationHarness(seed,'','en'),ui=()=>h.render();
 ui().setGenSizeCategory('locality');ui().generateAt({q:0,r:0});
 const initial=save(h).map;let region=initial.regions[0], coord=region.hexes.find(c=>initial.terrainByHexKey?.[xy(c)]?.terrainOverride!=='lake'&&xy(c)!==xy(region.centerHex)&&xy(c)!==xy(region.anchorHex??region.centerHex)&&!region.pointsOfInterest.some(p=>xy(p)===xy(c)));
 assert.ok(coord);
 let key=xy(coord),owner='poi:'+region.id+':'+key,name='Watch '+seed,note='Beacon at '+key+' / '+seed;
 ui().setEditMode(true);ui().setSelectedHex(coord);ui().setSelectedPoiKind('tower');if(!ui().nameTargets.some(t=>t.key===owner))throw Error(JSON.stringify({owner,targets:ui().nameTargets.map(t=>t.key),cell:key,kind:save(h).map.regions[0].pointOfInterestKinds[key],region:region.id}));ui().showNameTarget(owner);ui().changeNameDraft(name,ui().nameDraft);assert.ok(ui().saveNameDraft());
 ui().openNotesEditor(key);ui().changeNotesText(key,note);ui().finishNotesGroup();ui().setEditMode(false);
 const before=save(h),target=ui().candidateHexes[0];ui().generateAt(target);const grown=save(h);
 ui().undoMap();const undone=save(h);ui().redoMap();const redone=save(h);
 const fresh=createGenerationHarness(999,'','en');const errors=[];fresh.setWindow({alert:m=>errors.push(m),confirm:()=>true,matchMedia:()=>({matches:false})});fresh.injectFunction('readTextFile',async f=>f.text);await fresh.render().handleImportJson({target:{files:[{text:JSON.stringify(redone)}],value:'map'}});const opened=save(fresh);
 function authored(d){const r=d.map.regions.find(r=>r.id===region.id);return r?.pointsOfInterest.some(p=>xy(p)===key)&&r.pointOfInterestKinds[key]==='tower'&&d.map.editorNames[owner]?.en===name&&d.map.gmNotesByHexKey[key]===note;}
 const pair=(a,b)=>({map:equal(a.map,b.map),rng:equal(a.generation,b.generation),counters:equal(a.counters,b.counters)});
 console.log(JSON.stringify({seed,key,target:xy(target),owner,name,note,regions:[before,grown,undone,redone,opened].map(d=>d.map.regions.length),target_added:grown.map.regions[1]?.hexes.some(p=>xy(p)===xy(target)),old_region:equal(before.map.regions[0],grown.map.regions[0]),authored:[before,grown,undone,redone,opened].map(authored),undo:pair(before,undone),redo:pair(grown,redone),reopen:pair(redone,opened),errors,hashes:[before,grown,undone,redone,opened].map(d=>digest(d.map))}));
}
