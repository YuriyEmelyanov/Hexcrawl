import {KNAVE_CATALOG_VERSION,KNAVE_SOURCE_ID,KNAVE_SOURCE_SHA,emptyKnaveContent,fillKnaveContent} from '../../src/tags/knave.ts';
// Authored fixture vocabulary only. Table positions/locators exercise the
// public contract; this is not the private book catalog or source evidence.
export function knaveCatalogFixture(){
 return {schemaVersion:1,catalogVersion:KNAVE_CATALOG_VERSION,sourceId:KNAVE_SOURCE_ID,source:{sha256:KNAVE_SOURCE_SHA},tables:Object.fromEntries(['locations','structures','place_traits','dungeons'].map(table=>[table,Array.from({length:100},(_,i)=>({row:i+1,printedResult:i===99?'00':String(i+1),ru:`Authored fixture ${table} ${i+1}`,sourceRef:{table,row:i+1,printedPage:table==='locations'?10:table==='dungeons'?16:11,pdfPage:table==='dungeons'?12:9},references:[]}))]))};
}
export const knaveFactsFixture=(owner='poi:1:0,0',patch={})=>({owner,kind:owner.startsWith('waterPoi:')?'water':'land',dry:!owner.startsWith('waterPoi:'),height:1,forest:false,wetland:false,sand:false,coldIce:false,river:false,riverStart:false,rapids:false,waterfall:false,waterContact:false,road:false,roadJunction:false,crossings:[],...patch});
export const knaveContentFixture=(owner='poi:1:0,0',patch={})=>fillKnaveContent(emptyKnaveContent(),knaveCatalogFixture(),[knaveFactsFixture(owner,patch)],42);
