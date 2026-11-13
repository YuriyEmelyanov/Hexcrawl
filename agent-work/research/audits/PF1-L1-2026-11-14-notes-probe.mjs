import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/generation-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
const h=createGenerationHarness(42);h.render();const alerts=[];h.setWindow({alert:m=>alerts.push(m),confirm:()=>true});h.injectFunction('readTextFile',async f=>f.text);
await h.render().handleImportJson({target:{files:[{text:JSON.stringify(regionFixture())}],value:'x'}});h.render();assert.deepEqual(alerts,[]);h.guardRandom();
const snap=()=>{const x=JSON.parse(JSON.stringify(h.render().createSaveData()));delete x.savedAt;return x;};
const start=snap(),cases=[];const matrix=JSON.parse(fs.readFileSync('pf1-matrix.json','utf8'));
for(const r of matrix.rules.slice(7,12))for(const c of r.parameters.terrain_variants){
 const before=snap(),text=`PF1 ${c.terrain}/${c.category}: ${c.example}\nУточнение мастера`;
 h.render().changeNotesText('2,0',text);h.render();h.render().finishNotesGroup();h.render();
 const after=snap();assert.equal(after.map.gmNotesByHexKey['2,0'],text,c.id);assert.deepEqual(after.map.regions,before.map.regions);assert.deepEqual(after.map.biomeOverrideByHexKey,before.map.biomeOverrideByHexKey);assert.deepEqual(after.generation,before.generation);
 h.render().undoMap();assert.deepEqual(snap(),before);h.render().redoMap();assert.deepEqual(snap(),after);
 await h.render().handleImportJson({target:{files:[{text:JSON.stringify(after)}],value:'x'}});assert.deepEqual(snap(),after);assert.deepEqual(alerts,[]);
 cases.push({id:c.id,status:'passed',actual:'Authored text survives real note edit/undo/redo/export/import; geometry, biome override and RNG unchanged',scope:'manual_text_only; source category is prose, not native PF1 profile'});
}
const descriptions=[['PF1-UC-007-L1','standard: памятный камень'],['PF1-UC-013-L1','Холодная пустыня; мерзлота→plain, оттепель→marsh'],['PF1-UC-014-L1','Поселение на лесной основе; скрытый вход'],['PF1-UC-015-L1','Озеро; лесной берег; мост отмечен мастером']];
for(const [id,text] of descriptions){h.render().changeNotesText('2,0',text);h.render();h.render().finishNotesGroup();assert.equal(snap().map.gmNotesByHexKey['2,0'],text);cases.push({id,status:'passed',actual:'Manual descriptive note retained',scope:'manual_text_only; no typed semantics demonstrated'});}
const out={code_sha:'1962fb9a835a9c310e55c1a09415fe180f22cca9',harness:'Exact repository App callbacks and existing hook harness; no DOM/browser',case_count:cases.length,cases,alerts,source_matrix:'PF1-UltimateCampaign.json',limitations:['No native PF1 roll profile exercised','Prose does not establish typed resource/discovery/terrain semantics','No current unaccepted GEO2 behaviour audited']};fs.writeFileSync('pf1-probes.json',JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({passed:cases.length,alerts}));
