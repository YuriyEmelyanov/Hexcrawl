import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

// Exercise the real App generation callbacks and helpers without a DOM.
// Only replace the final JSX return and React's hook storage; algorithms are unchanged.
const sourceUrl = new URL('../../src/App.tsx', import.meta.url);
const source = fs.readFileSync(sourceUrl, 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const app = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'App');
const lastReturn = app.body.statements.at(-1);
if (!ts.isReturnStatement(lastReturn)) throw new Error('App must end with its JSX return');
const instrumented = source.slice(0, lastReturn.getStart(ast)) + `return {
  regions, rivers, candidateHexes, hexTerrainByKey, history,
  addFallbackTractToMap, safelyAddRegionToMap, createSaveData, restoreSnapshot, deleteLastRegion
};` + source.slice(lastReturn.end) + `
export const testGeometry = { getHexCornerPoints, getHexNeighbors, hexKey, buildRiverGraphForRegion,
  findRiverEndpointsTouchingRegion, getCandidateHexes, generateRiverForRegion, assertHexcrawlSaveData };
`;
const compiled = ts.transpileModule(instrumented, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX
}}).outputText;
const localRequire = createRequire(sourceUrl);

export function createGenerationHarness(seed = 1) {
  const state = [];
  let cursor = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef: current => ({ current }), useMemo: fn => fn(), useEffect() {}
  };
  const logs = [];
  const seededMath = Object.create(Math);
  seededMath.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, Math: seededMath, Map, Set,
    console: Object.fromEntries(['log', 'warn', 'error'].map(level => [level, (...args) => logs.push({ level, args })])),
    require: name => name === 'react' ? hooks : localRequire(name.startsWith('./') ? `${name}.ts` : name),
    performance, URLSearchParams
  });
  vm.runInContext(compiled, context);
  return {
    render() { cursor = 0; return module.exports.App(); },
    geometry: module.exports.testGeometry, logs,
    failRegularGeneration() { vm.runInContext('exports.generateConnectedRegionFromAnchor = () => { throw new Error("injected regular failure"); }', context); }
  };
}
