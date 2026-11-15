# Temporary reviewer diagnostic (not permanent suite)

Exact SHA 1a8c632777eb26549e1834d1f69a98fe7656885f, Node v24.22.1. Independent reviewer executed via stdin, exit0. This only checks the isolated predicate truth table on a synthetic prepared context, not complete body geometry.

```js
import assert from 'node:assert/strict';
import {geometryBoundaryHasValidClosure} from './src/geometryRefinementBoundary.ts';
const empty={status:'prepared',capsules:[],completeGeometryPlan:false};
const base={status:'prepared',boundaryValidation:'dependency_closure_required',scope:{input:{origin:{x:0,y:0},map:{regions:[],physicalGrid:{poiFootprints:[]},crossings:[]}},outside:{regions:[],roads:[],crossings:[],authoredFootprints:[]},continuationKeys:new Set()},source:{segments:[]},accepted:{riverPlan:{source:{segments:[]},paths:[],ports:[],terminations:[],water:empty,paintWater:empty},roads:{roads:[]},pois:{pois:[]}},widths:new Map()};
let count=0;
for(const body of ['lake:1','sea:1'])for(const reverse of [false,true])for(const other of ['region:2','river:2','road:2','POI:2','lake:2','sea:2']){
 const pair=reverse?{retainedRef:other,addedRef:body}:{retainedRef:body,addedRef:other};
 assert.equal(geometryBoundaryHasValidClosure({...base,potentialDependencies:[pair]}),other.startsWith('region:'),JSON.stringify(pair));count++;
}
console.log(JSON.stringify({diagnostic:'isolated closure guard truth table; synthetic prepared context, not full geometric acceptance',cases:count,passed:count}));
```

Actual stdout: {"diagnostic":"isolated closure guard truth table; synthetic prepared context, not full geometric acceptance","cases":24,"passed":24}
