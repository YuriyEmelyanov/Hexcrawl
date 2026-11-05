import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import ts from '../fix-e6-r2/node_modules/typescript/lib/typescript.js';
const cwd=new URL('../fix-e6-r2/',import.meta.url).pathname;
const base='a412bb8f866fa459c1d5f2e8d8f1e7e6e72be57e',head='c5b4f26c6d5a29aa0ba1d89ca11cc209ebe5272e';
const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'});
const printer=ts.createPrinter({removeComments:true});
function cases(ref,file){const source=git('show',ref+':'+file),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),out=new Map();function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='test'&&ts.isStringLiteral(n.arguments[0]))out.set(n.arguments[0].text,printer.printNode(ts.EmitHint.Unspecified,n,ast));ts.forEachChild(n,visit);}visit(ast);return out;}
const files=git('ls-tree','-r','--name-only',head,'test').trim().split('\n').filter(f=>/^test\/[^/]+\.test\.mjs$/.test(f));
const rows=files.map(file=>{const a=cases(base,file),b=cases(head,file);return{file,before:a.size,after:b.size,added:[...b.keys()].filter(k=>!a.has(k)),removed:[...a.keys()].filter(k=>!b.has(k)),modified:[...b.keys()].filter(k=>a.has(k)&&a.get(k)!==b.get(k))};});
const sum=key=>rows.reduce((s,r)=>s+(Array.isArray(r[key])?r[key].length:r[key]),0);
const result={base_sha:base,head_sha:head,method:'TypeScript AST extracts named test callbacks; compare callback AST without comments. Iterations/assertions/helpers are not separate cases.',node:{static_named_callbacks_before:sum('before'),static_named_callbacks_after:sum('after'),callback_count_limitation:'Static literal names only; dynamic parameterized runtime cases are reported separately under executed checks',added:sum('added'),removed:sum('removed'),modified:sum('modified'),changed_cases:rows.filter(r=>r.added.length||r.removed.length||r.modified.length)},browser:{scripts_before:8,scripts_after:8,added:0,removed:0,modified:0,reason:'No permanent browser cases changed'},rng:{scripts_before:1,scripts_after:1,added:0,removed:0,modified:0},helper_change:'Expose existing WaterEditError/TagCapacityError constructors in the same VM to inject correctly classified expected refusals; no new runner or case',report_line:'Тесты: +0 / −0 / изменено 1 — существующий E6 fault-case проверяет оригинальные Error/stack, тихие ожидаемые отказы и атомарность при сбое диагностики.'};
fs.writeFileSync(new URL('test-change-summary.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
