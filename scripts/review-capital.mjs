import assert from 'node:assert/strict';
import {createGenerationHarness} from '../test/helpers/generation-harness.mjs';
const h=createGenerationHarness(42),a=()=>h.render();h.setWindow({alert:m=>{throw Error(m)},confirm:()=>true,matchMedia:()=>({matches:false})});h.injectFunction('readTextFile',async f=>f.text);
a().generateAt({q:0,r:0});const region=a().regions[0],c=region.centerHex,k=c.q+','+c.r,owner='poi:'+region.id+':'+k;const save=()=>JSON.parse(JSON.stringify(a().createSaveData().map));a().setEditMode(true);a().setSelectedHex(c);a().setSelectedCentralPoiKind('capital');assert.equal(save().regions[0].centralPoiKind,'capital');assert.equal(save().poiDiscovery[owner],'passage');
const initial=structuredClone(a().createSaveData());assert(a().changeKnaveDraft({mode:'interaction'}));assert(a().finishKnaveDraft());a().setEditMode(true);a().setSelectedCentralPoiKind('town');assert.equal(save().poiDiscovery[owner],'interaction');a().showNameTarget(a().nameTargets.find(t=>t.poiLocator===owner).key);assert(a().nameDraft);a().changeNameDraft('Северная застава',a().nameDraft);a().changeOtherNameDraft('North Watch',a().nameDraft);assert(a().saveNameDraft());assert.equal(save().poiDiscovery[owner],'interaction');
a().chooseKnaveProfile(true);a().setEditMode(true);assert(a().changeKnaveDraft({mode:'exploration'}));assert(a().finishKnaveDraft());a().chooseKnaveProfile(false);assert.equal(save().poiDiscovery[owner],'exploration');
const saved=JSON.parse(JSON.stringify(a().createSaveData()));await a().handleImportJson({target:{files:[{text:JSON.stringify(saved)}],value:'x'}});assert.deepEqual(save(),saved.map);a().setEditMode(true);a().setSelectedHex(c);const before=save();const start=a().startPoiDraft({kind:'land',regionId:region.id,hexKey:k});if(start){a().changePoiTarget('5','0');a().finishPoiDraft()}assert.deepEqual(save(),before);a().deleteSelectedPoi();assert.deepEqual(save(),before);console.log({owner,type:save().regions[0].centralPoiKind,names:a().nameTargets.find(t=>t.poiLocator===owner),stored:save().toponyms['settlement:'+region.id+':'+k],mode:save().poiDiscovery[owner],centralMoveDraft:start});

import {chromium} from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('reports/capital',{recursive:true});
const browser=await chromium.launch();
try{
const p=await browser.newPage({viewport:{width:1500,height:1000}});
await p.route(/mc\.yandex/,r=>r.abort());p.on('dialog',d=>d.accept());
await p.goto('http://127.0.0.1:4219');const ru=p.getByRole('button',{name:'Переключить на русский',exact:true});if(await ru.count())await ru.click();
const panel=p.locator('.info-block--hex');
for(const [name,data,word] of [['capital-before',initial,'При прохождении'],['capital-after',saved,'При исследовании']]){
await p.locator('input[type=file]').setInputFiles({name:name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
await panel.getByText(new RegExp(word)).first().waitFor();if(name==='capital-after')await panel.getByText(/Северная застава/).first().waitFor();
await panel.scrollIntoViewIfNeeded();await panel.screenshot({path:'reports/capital/'+name+'.png'});console.log(name,await panel.innerText());
}
}finally{await browser.close()}