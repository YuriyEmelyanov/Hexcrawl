import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {ownerKey,emptyTags,rollTag,resolved} from '../src/tags/engine.ts';
import {mythicDefinitions as defs} from '../src/tags/mythic.ts';
const require=createRequire(import.meta.url),owner={kind:'region',id:1};
function component(source){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(n=>n==='./engine'?{ownerKey}:require(n),module,module.exports);return module.exports.TagRow;}
const Current=component(fs.readFileSync(new URL('../src/tags/TagRow.tsx',import.meta.url),'utf8'));
const Prior=component(execFileSync('git',['show','060e3b3:src/tags/TagRow.tsx'],{encoding:'utf8'}));
const evidence={sha:'69d185b14e425c5de037cf7266c4d3bf2a37a5a7',method:'Actual TagRow rendered via React SSR for every definition, RU/EN, equal dice and current overrides; compare baseline markup after removing aria-label attributes',cases:[]};
for(const def of Object.values(defs))for(const language of ['ru','en']){
 const values=def.slots.map(()=>[2]),override=language==='ru'?'Моя правка':'My override';
 const instance={...rollTag(emptyTags(),owner,def,42).instances[0],values,...resolved(def,values),overrides:(def.resolver==='product'?[{}]:[{},{}]).map(()=>({[language]:override}))};
 const props={owner,definition:def,instance,language,editMode:false,disabled:false,onRoll:()=>true,onEdit:()=>true};
 const html=renderToStaticMarkup(React.createElement(Current,props)),old=renderToStaticMarkup(React.createElement(Prior,props));
 const names=[...html.matchAll(/aria-label="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(names.length,2);assert.notEqual(names[0],names[1]);
 names.forEach((name,i)=>{assert.ok(name.includes(def.slots[i].label[language]));assert.ok(name.includes(override));assert.ok(name.includes(`d${def.slots[i].sides}: 2`));});
 const strip=s=>s.replace(/ aria-label="[^"]*"/g,'');assert.equal(strip(html),strip(old));
 assert.ok(!strip(html).replace(/<[^>]*>/g,'').match(/d6|d12/));
 evidence.cases.push({definitionId:def.id,language,names,visibleMarkupEqualsPrior:true});
}
fs.writeFileSync('/tmp/hx041-independent-aria.json',JSON.stringify(evidence,null,2));console.log(`${evidence.cases.length} definition/language cases passed; ${evidence.cases.length*2} distinct purpose/current override/die labels checked; visible markup identical.`);
