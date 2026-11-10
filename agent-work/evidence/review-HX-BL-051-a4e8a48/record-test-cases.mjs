import fs from 'node:fs';import {pathToFileURL} from 'node:url';
globalThis.__caseInventory=[];
for(const f of fs.readdirSync(process.cwd()+'/test').filter(f=>f.endsWith('.test.mjs')).sort()){globalThis.__caseFile=f;await import(pathToFileURL(process.cwd()+'/test/'+f));}
fs.writeFileSync(process.argv[2],JSON.stringify(globalThis.__caseInventory,null,2));
console.log('registered callbacks',globalThis.__caseInventory.length);
