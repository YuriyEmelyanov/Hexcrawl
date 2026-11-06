import fs from 'node:fs';

/** Finite coastal map, explicit expected identity (not computed by the tested reconciler). */
export function seaFixture(mode='classic',merge=false){
 const data=JSON.parse(fs.readFileSync(new URL('../fixtures/e6-water-editor.json',import.meta.url)));
 data.version=9;data.ui.generationMode=mode;data.ui.selectedHex={q:1,r:2};
 data.map.regions[0].generationMode=mode;
 const right=['-1,2','0,2','1,2','2,2','3,2','3,3'],left=['-3,2','-3,3'];
 data.map.seas=merge?[{id:7,hexKeys:left},{id:12,hexKeys:right}]:[{id:7,hexKeys:right}];
 data.map.nextSeaId=20;data.map.editorNames={};
 data.map.terrainByHexKey=Object.fromEntries(data.map.seas.flatMap(s=>s.hexKeys.map(k=>[k,{terrainOverride:'sea'}])));
 data.map.waterPoiByHexKey={};
 return data;
}
