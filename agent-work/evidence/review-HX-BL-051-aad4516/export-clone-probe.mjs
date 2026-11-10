import fs from 'node:fs';
import cp from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from '/workspace/scratch/50f278832674/hexcrawl/node_modules/typescript/lib/typescript.js';
const repo='/workspace/scratch/50f278832674/hexcrawl';
const head='aad4516f3f01443c7c6c12fa7403e66f6a3a3201';
const base='f17236b90592b92a8f553678eaf81de3f34b340e';
const read=(sha,path)=>cp.execFileSync('git',['show',`${sha}:${path}`],{cwd:repo,encoding:'utf8'});
// Minimal in-memory DOM contract only. This does not launch a browser, fetch,
// compute browser styles, or rasterize. The production helper body is extracted
// directly with the TypeScript AST, never rewritten or replaced.
class Element {
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs={...attrs};this.children=[];this.style={width:'100%',height:'100%',transform:'translate(9px)',willChange:'transform'};this.textContent='';for(const child of children)this.insertBefore(child,null);}
 get viewBox(){return {baseVal:{width:192,height:96}};}
 setAttribute(k,v){this.attrs[k]=String(v);}
 setAttributeNS(ns,k,v){this.setAttribute(k,v);}
 getAttribute(k){return this.attrs[k]??null;}
 get firstChild(){return this.children[0]??null;}
 get nextSibling(){return this.parent?.children[this.parent.children.indexOf(this)+1]??null;}
 insertBefore(node,reference){node.parent=this;const i=reference?this.children.indexOf(reference):-1;if(i<0)this.children.push(node);else this.children.splice(i,0,node);return node;}
 remove(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=undefined;}}
 cloneNode(deep){const copy=new Element(this.tag,this.attrs,deep?this.children.map(x=>x.cloneNode(true)):[]);copy.textContent=this.textContent;copy.style={...this.style};return copy;}
 querySelectorAll(selector){const found=[];for(const c of this.children){if(selector==='image'?c.tag==='image':selector==='[data-editor-only]'?'data-editor-only'in c.attrs:false)found.push(c);found.push(...c.querySelectorAll(selector));}return found;}
}
const declarations=text=>Object.fromEntries(text.split(';').map(s=>s.trim()).filter(Boolean).map(s=>{const i=s.indexOf(':');return [s.slice(0,i).trim(),s.slice(i+1).trim()];}));
const rules=css=>[...css.matchAll(/\.detail-marker-count\s*\{([^}]*)\}/g)].map(m=>declarations(m[1]));
const results=[];
for(const sha of [base,head]){
 const src=read(sha,'src/App.tsx'),page=rules(read(sha,'src/styles.css'));
 assert.equal(page.length,1);
 const ast=ts.createSourceFile('App.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=new Set(['SVG_EXPORT_STYLES','createExportSvgClone','inlineExportImageHrefs']);
 const selected=ast.statements.filter(n=>ts.isFunctionDeclaration(n)?names.has(n.name?.text):ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>names.has(d.name.getText(ast))));
 assert.equal(selected.length,3);
 const code=selected.map(n=>n.getText(ast)).join('\n')+'\nglobalThis.actualCreateClone = createExportSvgClone;';
 const compiled=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 const context=vm.createContext({document:{createElementNS:(_,tag)=>new Element(tag)},URL,Map,Promise,fetch:()=>{throw Error('Unexpected network access');}});
 vm.runInContext(compiled,context);
 const marker=new Element('text',{class:'detail-marker-count',x:'15',y:'3','font-size':'5.5'});marker.textContent='7';
 const editor=new Element('g',{'data-editor-only':'true'},[new Element('path')]);
 const image=new Element('image',{href:'data:image/png;base64,AA=='});
 const svg=new Element('svg',{viewBox:'0 0 192 96'},[new Element('g',{},[marker]),editor,image]);
 const before=JSON.stringify(svg,(k,v)=>k==='parent'?undefined:v);
 const clone=await context.actualCreateClone(svg);
 assert.notEqual(clone,svg);
 assert.equal(JSON.stringify(svg,(k,v)=>k==='parent'?undefined:v),before,'source SVG remains unchanged');
 assert.equal(clone.querySelectorAll('[data-editor-only]').length,0);
 assert.equal(clone.children[0].tag,'style');assert.equal(clone.children[1].tag,'rect');
 assert.equal(clone.children[1].attrs.fill,'#0c1423');
 assert.deepEqual([clone.attrs.xmlns,clone.attrs.width,clone.attrs.height],['http://www.w3.org/2000/svg','192','96']);
 assert.deepEqual([clone.style.width,clone.style.height,clone.style.transform,clone.style.willChange],['','','','']);
 const exported=rules(clone.children[0].textContent);
 const parity=exported.length===1&&JSON.stringify(exported[0])===JSON.stringify(page[0]);
 assert.equal(parity,sha===head,'diagnostic must detect missing base style and fixed head style');
 const clonedMarker=clone.children[2].children[0];
 assert.deepEqual(clonedMarker.attrs,marker.attrs);assert.equal(clonedMarker.textContent,'7');
 assert.equal(clone.querySelectorAll('image')[0].attrs.href,'data:image/png;base64,AA==');
 results.push({sha,actual_helper_executed:true,style_rule_count:exported.length,page_rule:page[0],export_rule:exported[0]??null,page_export_parity:parity,clone_contract_pass:true,marker_preserved:true,source_unchanged:true,negative_control:sha===base});
}
const output={method:'Production helper AST extraction + TypeScript transpilation + Node in-memory DOM contract; independent temporary reviewer probe',results,limits:['No actual DOM rendering/computed cascade/font loading','No SVG image load, PNG raster or visual readability assertion','No fresh UI obtained; no browser/Playwright/CI bypass','Synthetic tiny SVG only; not response measurement']};
fs.writeFileSync('/tmp/q-export-clone-probe.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
