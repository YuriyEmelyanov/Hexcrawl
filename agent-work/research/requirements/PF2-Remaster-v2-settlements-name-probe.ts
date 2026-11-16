export class PoiMoveError extends Error {
  readonly code:string;readonly details:string[];
  constructor(code:string,...details:string[]){super([code,...details].join(':'));this.name='PoiMoveError';this.code=code;this.details=details;}
}
const fail=(code:string,...details:string[]):never=>{throw new PoiMoveError(code,...details);};
const owns=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k);
export function renamePoiEditorName(names:EditorNames,key:string,pair:NamePair,live:ReadonlySet<string>,otherNames:readonly NamePair[]):EditorNames {
  if(!live.has(key))fail('stale_poi_name',key);
  const en=pair.en.trim(),ru=pair.ru.trim();
  if(!en&&!ru){if(!owns(names,key))return names;return Object.fromEntries(Object.entries(names).filter(([k])=>k!==key));}
  if(!en||!ru||en.length>80||ru.length>80)fail('invalid_poi_name',key);
  const normalize=(s:string)=>s.trim().toLocaleLowerCase();
  if([...Object.entries(names).filter(([k])=>k!==key).map(([,n])=>n),...otherNames].some(n=>normalize(n.en)===normalize(en)||normalize(n.ru)===normalize(ru)))fail('duplicate_poi_name',key);
  if(names[key]?.en===en&&names[key]?.ru===ru)return names;
  return {...names,[key]:{en,ru}};
}

import assert from 'node:assert/strict';
const live=new Set(['poi:1:0;0']);const key='poi:1:0;0';
const name={en:' Watchtower ',ru:' Дозорная башня '};
const a=renamePoiEditorName({},key,name,live,[]);
assert.deepEqual(a[key],{en:'Watchtower',ru:'Дозорная башня'});
assert.throws(()=>renamePoiEditorName({},key,{en:'Watchtower',ru:''},live,[]),/invalid_poi_name/);
assert.throws(()=>renamePoiEditorName({},key,{en:'Watchtower',ru:'Дозорная башня'},live,[{en:'watchtower',ru:'Иная'}]),/duplicate_poi_name/);
assert.deepEqual(renamePoiEditorName(a,key,{en:'',ru:''},live,[]),{});
assert.throws(()=>renamePoiEditorName({},'poi:1:9;9',name,live,[]),/stale_poi_name/);
console.log(JSON.stringify({passed:5,failed:0,scope:'Compiled exact renamePoiEditorName and original error helpers; no UI, placement, save/load or settlement profile accepted'}));
