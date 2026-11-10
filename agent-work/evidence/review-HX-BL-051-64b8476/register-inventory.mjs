import {registerHooks} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],out=process.argv[3];
globalThis.__reviewInventory=[];
const stub='export default function test(name,...args){const callback=args.findLast(x=>typeof x==="function");globalThis.__reviewInventory.push({file:globalThis.__reviewCurrentFile,name:String(name),callback:callback?.toString()??null});}';
registerHooks({resolve(s,c,next){if(s==='node:test')return {url:'data:text/javascript,'+encodeURIComponent(stub),shortCircuit:true};return next(s,c);}});
for(const file of fs.readdirSync(path.join(root,'test')).filter(x=>x.endsWith('.test.mjs')).sort()){
 globalThis.__reviewCurrentFile='test/'+file;await import(pathToFileURL(path.join(root,'test',file)).href);
}
fs.writeFileSync(out,JSON.stringify({method:'Replace node:test registration only; import exact tree test files, capture expanded logical registration names/callbacks; no test callbacks executed',root,cases:globalThis.__reviewInventory},null,2));
console.log(root,globalThis.__reviewInventory.length,'logical registered callbacks; callbacks not executed');
