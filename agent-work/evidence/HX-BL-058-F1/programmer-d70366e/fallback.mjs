import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const {createGenerationHarness}=await import(pathToFileURL(process.cwd()+'/test/helpers/generation-harness.mjs'));
const rows=[];
for(const locale of ['ru','en']){
 const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});
 h.injectFunction('readTextFile',async f=>f.text);
 const load=d=>h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'file'}});
 const incoming=JSON.parse(fs.readFileSync('test/fixtures/road-entry-zigzags.json'));
 await load(incoming);
 const preview=h.render().previewOneMile();assert.ok(h.render().applyOneMilePreview(preview));
 const saved=JSON.parse(JSON.stringify(h.render().createSaveData()));saved.map.physicalGrid.viewStep=1;
 h.render().resetMap();h.render().setLanguage(locale);
 const restore=h.injectFunction('prepareAutomaticOneMileScene',()=>{throw Error('budget');});
 try{await load(saved);}finally{restore();}
 const app=h.render(),msg=app.automaticFineError,expected=locale==='ru'?'1-мильная карта не открылась.':'The 1-mile map did not open.';
 assert.ok(msg.startsWith(expected),msg);assert.equal(app.fineDisplay.viewStep,6);
 const after=JSON.parse(JSON.stringify(app.createSaveData()));assert.deepEqual(after.map.regions,saved.map.regions);assert.deepEqual(after.map.roads,saved.map.roads);assert.deepEqual(after.map.rivers,saved.map.rivers);
 rows.push({locale,v:saved.version,requested_step:1,recovered_step:6,message:msg,regions:saved.map.regions.length,unchanged_layers:['regions','roads','rivers']});
}
console.log(JSON.stringify(rows));
