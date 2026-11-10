import fs from 'node:fs';
import ts from '../../finish496-code/node_modules/typescript/lib/typescript.js';
const base=JSON.parse(fs.readFileSync(new URL('registered-base.json',import.meta.url))),head=JSON.parse(fs.readFileSync(new URL('registered-current.json',import.meta.url)));
function normalize(source){const scanner=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,source??'');const tokens=[];for(let k=scanner.scan();k!==ts.SyntaxKind.EndOfFileToken;k=scanner.scan())tokens.push([k,scanner.getTokenText()]);return JSON.stringify(tokens);}
const keyed=x=>new Map(x.cases.map(c=>[JSON.stringify([c.file,c.name]),c]));
const a=keyed(base),b=keyed(head),added=[],removed=[],modified=[];
for(const [k,v]of b){if(!a.has(k))added.push({file:v.file,name:v.name});else if(normalize(a.get(k).callback)!==normalize(v.callback))modified.push({file:v.file,name:v.name});}
for(const[k,v]of a)if(!b.has(k))removed.push({file:v.file,name:v.name});
const out={base_sha:'1962fb9a835a9c310e55c1a09415fe180f22cca9',head_sha:'f677629c4c1c3a84656ad88a6e118c56da3c7eb3',method:'Exact runtime registration names expanded without executing callbacks; pair file+name and compare TypeScript-scanner token-normalized callback bodies, excluding whitespace/comments.',suite:'Node node:test',base_registered:base.cases.length,head_registered:head.cases.length,added:added.length,removed:removed.length,modified:modified.length,added_cases:added,removed_cases:removed,modified_cases:modified,callback_executions:0,aggregation:'Helpers and fixtures are not logical cases. Not summed with browser workflows/RNG/diagnostic observations.'};
fs.writeFileSync(new URL('cumulative-case-inventory.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify({base:out.base_registered,head:out.head_registered,added:out.added,removed:out.removed,modified:out.modified}));
