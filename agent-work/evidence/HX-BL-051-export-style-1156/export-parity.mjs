import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import ts from '/workspace/scratch/50f278832674/hexcrawl/node_modules/typescript/lib/typescript.js';
const root='/tmp/hx-export-fix',source=fs.readFileSync(root+'/src/App.tsx','utf8'),css=fs.readFileSync(root+'/src/styles.css','utf8');
const ast=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const style=ast.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='SVG_EXPORT_STYLES'));
const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='createExportSvgClone');assert.ok(style&&fn);
const marker={tagName:'text',className:'detail-marker-count',textContent:'7',attributes:{fontSize:'7.7'}};
function svg(){return {viewBox:{baseVal:{width:100,height:100}},style:{width:'',height:'',transform:'',willChange:''},children:[structuredClone(marker)],setAttribute(k,v){this[k]=v;},querySelectorAll(){return [];},get firstChild(){return this.children[0];},insertBefore(n,b){const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,n);},cloneNode(){return svg();}};}
const context=vm.createContext({document:{createElementNS(ns,tagName){return {tagName,textContent:'',setAttribute(k,v){this[k]=v;}};}},inlineExportImageHrefs:async()=>{}});
const code=ts.transpileModule(style.getText(ast)+'\n'+fn.getText(ast)+'\nglobalThis.cloneForEvidence=createExportSvgClone;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInContext(code,context);
const clone=await context.cloneForEvidence(svg()),exportStyle=clone.children.find(n=>n.tagName==='style').textContent,pageRule=css.match(/\.detail-marker-count\s*\{[^}]+\}/)[0];
const normalize=s=>s.replace(/\s/g,'');
const exportRule=exportStyle.match(/\.detail-marker-count\s*\{[^}]+\}/)?.[0];
console.log(JSON.stringify({method:'Actual unchanged createExportSvgClone via TypeScript AST and minimal detached SVG DOM stub',pageRule,exportRule:exportRule??null,equivalent:normalize(pageRule)===normalize(exportRule??''),raster_readability:'not measured; no browser execution',permanent_test_changes:0},null,2));
assert.equal(normalize(exportRule??''),normalize(pageRule),'export counter rule must match page');
