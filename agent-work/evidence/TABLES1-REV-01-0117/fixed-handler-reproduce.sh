#!/bin/sh
set -eu
test ! -e test/helpers/reviewer-harness.mjs
trap 'rm -f test/helpers/reviewer-harness.mjs' EXIT
python - <<'PY'
from pathlib import Path
p=Path('test/helpers/generation-harness.mjs')
s=p.read_text().replace('chooseKnaveProfile, changeGenerationMode,','preparationNavigation, requestPreparationExit, resolvePreparationExit, preparationExitRequest, poiClickGate, notifyTagDraft, documentRevision, chooseKnaveProfile, changeGenerationMode,')
Path('test/helpers/reviewer-harness.mjs').write_text(s)
PY
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import {createGenerationHarness} from './test/helpers/reviewer-harness.mjs';
import {regionFixture} from './test/helpers/region-fixture.mjs';
import {knaveCatalogFixture,knaveContentFixture} from './test/helpers/knave-fixture.mjs';
import {newKnaveLayer} from './src/knaveClassic.ts';
import {createGenerationState} from './src/worldRandom.ts';
const data=regionFixture();data.version=10;data.generation=createGenerationState(42);data.map.seas=[];data.map.nextSeaId=1;data.map.knave=newKnaveLayer();data.map.regions[0].pointOfInterestKinds['2,0']='ruins';data.map.knave.content=knaveContentFixture('poi:1:2,0');
const h=createGenerationHarness(42);h.render();h.guardRandom();h.injectFunction('knaveGenerationCatalog',knaveCatalogFixture);h.injectFunction('readTextFile',async f=>f.text);h.setWindow({alert:m=>{throw Error(m)}});await h.render().handleImportJson({target:{files:[{text:JSON.stringify(data)}],value:''}});h.render();
assert.equal(h.render().startDetailAdaptation(),true);assert.equal(h.render().applyDetailAdaptation(),true);h.render();
const owner='poi:1:2,0';assert.equal(h.render().mutatePreparation({kind:'description',owner,value:'accepted'},h.render().preparationContext(owner)),true);h.render();
let discarded=false;const revision=h.render().documentRevision.current;h.render().preparationNavigation.current={owner,revision,dirty:true,finish:()=>false,discard:()=>{discarded=true;},focus:()=>{}};h.render().notifyTagDraft('preparation:'+owner,true);h.render();
let prevented=false,stopped=false;const selectors=[];
h.render().poiClickGate({target:{closest:selector=>{selectors.push(selector);return null;}},preventDefault(){prevented=true},stopPropagation(){stopped=true}});
assert.equal(prevented,false);assert.equal(stopped,false);assert.equal(h.render().preparationExitRequest,null);
const fine=h.render().captureDocument().map.physicalGrid.poiFootprints[0].cells[0];
const selected=h.render().selectDetailCell(fine);h.render();console.log(JSON.stringify({diagnostic:'dirty-description DETAIL1 cell bypass',selected,revisionBefore:revision,revisionAfter:h.render().documentRevision.current,dirtyExitDialog:h.render().preparationExitRequest,prevented,stopped,discarded,captureSelectors:selectors,acceptedDescription:h.render().captureDocument().map.knave.content.byPoi[owner].description}));
assert.equal(selected,false);assert.equal(h.render().documentRevision.current,revision);assert.ok(h.render().preparationExitRequest);
JS

