import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

// Real production React components; browser acceptance checks pixels/PNG.
const cache=new Map();
function load(file){
 if(cache.has(file.href))return cache.get(file.href);
 const require=createRequire(file),module={exports:{}};cache.set(file.href,module.exports);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{
  if(!name.startsWith('.'))return require(name);
  const jsx=new URL(`${name}.tsx`,file);
  return fs.existsSync(jsx)?load(jsx):require(`${name}.ts`);
 }});return module.exports;
}
const artwork=load(new URL('../../src/RefinedGeographyArtwork.tsx',import.meta.url));
export const renderRefinedArtwork=props=>renderToStaticMarkup(createElement('svg',null,createElement(artwork.RefinedGeographyArtwork,props)));
export const renderRefinedLakeWater=props=>renderToStaticMarkup(createElement('svg',null,createElement(artwork.RefinedLakeWater,props)));
export const refinementLakeShapes=artwork.refinementLakeShapes;
