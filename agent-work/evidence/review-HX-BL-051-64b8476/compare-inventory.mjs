import fs from 'node:fs';
import ts from '/tmp/hx-independent64-1600/node_modules/typescript/lib/typescript.js';
const dir='/tmp/hx-review-64-1600-output';
const read=n=>JSON.parse(fs.readFileSync(dir+'/registered-'+n+'.json')).cases;
const norm=s=>{const sc=ts.createScanner(ts.ScriptTarget.Latest,true,ts.LanguageVariant.Standard,s??'');const out=[];for(let k=sc.scan();k!==ts.SyntaxKind.EndOfFileToken;k=sc.scan())out.push([k,sc.getTokenText()]);return JSON.stringify(out);};
const a=read('base'),b=read('head'),key=x=>x.file+'::'+x.name,A=new Map(a.map(x=>[key(x),x])),B=new Map(b.map(x=>[key(x),x]));
const added=b.filter(x=>!A.has(key(x))).map(({callback,...x})=>x),removed=a.filter(x=>!B.has(key(x))).map(({callback,...x})=>x),modified=b.filter(x=>A.has(key(x))&&norm(x.callback)!==norm(A.get(key(x)).callback)).map(({callback,...x})=>x);
const r={base_sha:'1962fb9a835a9c310e55c1a09415fe180f22cca9',head_sha:'64b8476ff7f19e61e24b8b939663d90c1f2b37ec',base_count:a.length,head_count:b.length,added:added.length,removed:removed.length,modified:modified.length,added_cases:added,removed_cases:removed,modified_cases:modified,method:'Runtime registration interception expands parameterized names without executing callbacks. Pair exact file+logical name; compare TypeScript token streams of callback.toString(), ignoring comments and whitespace. Shared-helper effects recorded separately.'};
fs.writeFileSync(dir+'/cumulative-case-inventory.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r,null,2));
