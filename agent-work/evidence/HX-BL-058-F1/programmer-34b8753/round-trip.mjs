import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {createGenerationHarness,prepareLegacyRefinedSave}=await import(pathToFileURL(process.cwd()+'/test/helpers/generation-harness.mjs'));
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const report=[];
for(const fixture of ['classic-six-regions-seed42','road-entry-zigzags']){
 const legacy=JSON.parse(fs.readFileSync('test/fixtures/'+fixture+'.json'));
 for(const locale of ['ru','en']){
  const h=createGenerationHarness(42);h.render();h.setWindow({alert:m=>{throw Error(m)},matchMedia:()=>({matches:false})});
  h.injectFunction('readTextFile',async f=>f.text);
  const load=d=>h.render().handleImportJson({target:{files:[{text:JSON.stringify(d)}],value:'file'}});
  const snap=()=>{const d=JSON.parse(JSON.stringify(h.render().createSaveData()));delete d.savedAt;return d};
  await load(legacy);h.render().setLanguage(locale);
  const imported=snap(),stages=[];
  const inputs=[legacy,imported];
  if(fixture==='road-entry-zigzags'){
   const preview=h.render().previewOneMile();assert.ok(preview);assert.ok(h.render().applyOneMilePreview(preview));
   inputs.push(snap(),prepareLegacyRefinedSave(h));
  }
  for(const source of inputs){
   await load(source);h.render().setLanguage(locale);
   const before=snap();
   for(const step of [1,6]){
    assert.equal(h.render().switchFineStep(step),true,h.render().automaticFineError);assert.equal(h.render().fineDisplay.viewStep,step);stages.push({inputVersion:source.version,step,document:digest(snap()),grid:digest(h.render().fineDisplay.grid)});
   }
   assert.deepEqual(snap(),before);
   const saved=snap();await load(saved);assert.deepEqual(snap(),saved);
  }
  report.push({fixture,locale,stages});
 }
}
console.log(JSON.stringify(report));
