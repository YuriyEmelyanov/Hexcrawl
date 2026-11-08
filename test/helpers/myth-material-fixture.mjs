import {resolved} from '../../src/tags/engine.ts';
import {mythicDefinitions} from '../../src/tags/mythic.ts';
// Explicitly fictional MC1 browser material. No book prose, page sample, or
// production override is carried here; the browser replaces only a lazy module.
const escaped='<img src="fictional-missing" onerror="globalThis.__mythUnsafe=true"> & <script>globalThis.__mythUnsafe=true</script>';
export const fictionalMythMaterial=[
 {definitionId:'mb.myth',definitionVersion:1,entryId:'mb.myth:11',materialVersion:1,sourceEdition:'mythic-bastionland-ru-core-v1',sourcePage:9001,
  locales:{ru:{omenPreamble:'ВЫМЫШЛЕННОЕ ВСТУПЛЕНИЕ ЗНАМЕНИЙ A. Общая область, без нового номера.',omens:[{id:'a-1',ordinal:1,text:`ВЫМЫШЛЕННЫЙ МАТЕРИАЛ A. Первый проверочный блок. ${escaped}`},{id:'a-2',ordinal:2,text:'ВЫМЫШЛЕННЫЙ МАТЕРИАЛ A. Второй проверочный блок. '+('Длинный вымышленный текст для проверки переноса и общей прокрутки. '.repeat(34))+'КОНЕЦ БЛОКА A.'}],rolePreamble:'ВЫМЫШЛЕННОЕ ОБЩЕЕ ВСТУПЛЕНИЕ A.',roles:[{id:'a-group',title:'Вымышленная группа A — трое участников',text:'ВЫМЫШЛЕННЫЙ ГРУППОВОЙ БЛОК A. Все трое остаются одной ролью. Характеристики: 4, 8, 12; d6 — только текст.'}]}},
  references:[{type:'unresolved',description:'ВЫМЫШЛЕННАЯ БИБЛИОГРАФИЧЕСКАЯ ССЫЛКА A'}]},
 {definitionId:'mb.myth',definitionVersion:1,entryId:'mb.myth:12',materialVersion:1,sourceEdition:'mythic-bastionland-ru-core-v1',sourcePage:9002,
  locales:{ru:{omens:[1,2,3,4].map(n=>({id:`b-${n}`,ordinal:n,text:`ВЫМЫШЛЕННЫЙ МАТЕРИАЛ B. Проверочный блок ${n}.`})),roles:[{id:'b-role-1',title:'Вымышленная роль B один',text:'ВЫМЫШЛЕННАЯ РОЛЬ B1.'},{id:'b-role-2',title:'Вымышленная роль B два',text:'ВЫМЫШЛЕННАЯ РОЛЬ B2.'}]}},references:[]}
];

export function mythMaterialFixture(saved){
 const data=structuredClone(saved),regions=data.map.regions.filter(r=>r.centralPoiKind==='myth').slice(0,2);
 if(regions.length!==2)throw Error('MC1 workflow needs two existing central myths');
 const targets=regions.map((region,index)=>{
  const hexKey=`${region.centerHex.q},${region.centerHex.r}`,tag=data.map.tags.instances.find(t=>t.definitionId==='mb.myth'&&t.owner.kind==='poi'&&t.owner.regionId===region.id&&t.owner.hexKey===hexKey);
  if(!tag)throw Error('Fill existing tags before building the fictional material workflow');
  const values=index===0?[[1],[12]]:[[2],[1]];
  // Keep the existing catalogue snapshot valid for the production importer;
  // equal author overrides exercise the prohibition on lookup by display name.
  Object.assign(tag,{definitionVersion:1,resolver:'product',sides:[6,12],values,...resolved(mythicDefinitions['mb.myth'],values),overrides:[{ru:'Вымышленный миф с одинаковым именем',en:'Fictional same-name myth'}]});
  return{regionId:region.id,hexKey,entryId:tag.entryIds[0],owner:`poi:${region.id}:${hexKey}`};
 });
 return{data,targets};
}
