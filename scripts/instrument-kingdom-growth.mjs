// Test-only instrumentation. Run in a disposable checkout before building.
import fs from 'node:fs';import ts from 'typescript';
const targets=new Set(['App','advanceKingdom','finishKingdom','captureGenerationBackup','generateConnectedRegionFromAnchorImpl','generateRoadsForRegionImpl','completeRegionRoadConnections','buildRegionRiverNetwork','buildRiverGraphForRegion','getCandidateBoundaryEdgesForRegion','getCandidateBoundaryVerticesForRegion','validateCandidateBoundaryVertices','getRegionSharedVertices','findRoadPathWithinRegion','buildForestGeometry','buildForestTreeMarks','forestWaterBoundary']);
for(const path of ['src/App.tsx','src/rendering/forestGeometry.ts','src/rendering/forestTreeMarks.ts','src/rendering/forestWaterBoundary.ts']){
 let source=fs.readFileSync(path,'utf8');const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),edits=[];
 function walk(n){let name=ts.isFunctionDeclaration(n)?n.name?.text:ts.isArrowFunction(n)&&ts.isVariableDeclaration(n.parent)?n.parent.name.getText(ast):undefined;
  if(name&&targets.has(name)&&n.body&&ts.isBlock(n.body)){
   const begin=n.body.getStart(ast)+1,end=n.body.end-1;
   edits.push({at:begin,text:`const __growthStarted=performance.now(); try {`},{at:end,text:`} finally { const elapsed=performance.now()-__growthStarted; const m=(window as any).__growthStages??=((window as any).__growthStages={});const e=m['${name}']??=(m['${name}']={count:0,totalMs:0,maxMs:0});e.count++;e.totalMs+=elapsed;e.maxMs=Math.max(e.maxMs,elapsed);if(elapsed>1000)console.log('GROWTH_SLOW '+JSON.stringify({stage:'${name}',ms:elapsed})); }`});
  }ts.forEachChild(n,walk);
 }walk(ast);for(const e of edits.sort((a,b)=>b.at-a.at))source=source.slice(0,e.at)+e.text+source.slice(e.at);fs.writeFileSync(path,source);
}
