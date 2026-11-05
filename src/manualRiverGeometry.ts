import type {EditableRiver,RiverVertexValue} from './manualRivers.ts';
import {riverFeatureEdge,riverPathOwners} from './manualRivers.ts';
import type {RiverNetwork,RiverEdge,RiverNode} from './riverModel/core.ts';
import {isFullness,solveRiverNetwork} from './riverModel/core.ts';

/** Physical facts from the current App hex graph. No candidate SVG coordinates,
 * fallback owner/F, synthetic lake area or inferred distributary is accepted. */
export type RiverEditingGeometry={
  vertices:ReadonlyMap<string,RiverVertexValue>;
  edgeOwners:ReadonlyMap<string,readonly number[]>;
  heights:ReadonlyMap<number,1|2|3>;
  lakeByVertex:ReadonlyMap<string,string>;
  lakeHexCount:ReadonlyMap<string,number>;
  seaVertices:ReadonlySet<string>;
  openVertices:ReadonlySet<string>;
};
type PendingRiver=Omit<EditableRiver,'sectors'>&{sectors:(Omit<EditableRiver['sectors'][number],'fullness'>&{fullness?:RiverEdge['fullness']})[]};
export function buildManualRiverNetwork(rivers:readonly PendingRiver[],geometry:RiverEditingGeometry,unknownEdges:ReadonlySet<string>=new Set()):{network:RiverNetwork;issues:string[]}{
  const issues=new Set<string>(),edges:RiverEdge[]=[],occupied=new Map<string,number[]>();
  const issue=(code:string,where:unknown)=>issues.add(JSON.stringify([code,where]));
  for(const river of rivers){
    const values=new Map<string,Set<number|undefined>>(),owners=new Map<string,Set<number>>();
    for(const s of river.sectors)for(const k of s.edgeKeys){
      const fs=values.get(k)??new Set<number|undefined>();fs.add(s.fullness);values.set(k,fs);
      const os=owners.get(k)??new Set<number>();os.add(s.assignedRegionId??river.regionId);owners.set(k,os);
    }
    let ports=0;
    const seen=new Set<string>();
    for(const v of river.vertexPath){
      const actual=geometry.vertices.get(v.key);
      // Hex corner keys round to3 decimals. A legacy serialized point may have
      // been rounded to that precision; reject a forged coordinate, not roundoff.
      if(!actual||!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.abs(actual.x-v.x)>0.001||Math.abs(actual.y-v.y)>0.001)issue('unknown_vertex',[river.id,v]);
      if(seen.has(v.key))issue('repeated_vertex',[river.id,v.key]);seen.add(v.key);
    }
    for(let i=1;i<river.vertexPath.length;i++){
      const a=river.vertexPath[i-1],b=river.vertexPath[i],id=riverFeatureEdge(a,b);
      const ids=occupied.get(id)??[];ids.push(river.id);occupied.set(id,ids);
      const adjacent=geometry.edgeOwners.get(id)??[];
      if(!adjacent.length)issue('nonphysical_edge',[river.id,a.key,b.key]);
      const fs=values.get(id),os=owners.get(id),fullness=fs?.size===1?[...fs][0]:undefined,regionId=os?.size===1?[...os][0]:undefined;
      if(!isFullness(fullness)&&!(fullness===undefined&&fs?.size===1&&unknownEdges.has(id)))issue('unknown_or_ambiguous_fullness',[river.id,id,fs?[...fs].sort():[]]);
      if(regionId===undefined||!adjacent.includes(regionId)||!geometry.heights.has(regionId))issue('invalid_owner',[river.id,id,regionId]);
      // BR-009 arms retain their physical occupancy but are not ordinary2→1 RIV
      // junctions. Their separate dependency contract is checked by the caller.
      if(geometry.seaVertices.has(a.key))issue('RIV-012:sea_outflow',[river.id,a.key,b.key,fullness??null,regionId??null]);
      if(river.deltaParentRiverId!==undefined)continue;
      const from=geometry.lakeByVertex.get(a.key)??a.key,to=geometry.lakeByVertex.get(b.key)??b.key;
      if(from===to)continue; // an interior lake stroke is not another physical port
      ports++;
      edges.push({id,from,to,regionId:regionId??0,height:geometry.heights.get(regionId??0)??1,fullness:fullness as RiverEdge['fullness']});
    }
    if(river.deltaParentRiverId===undefined&&!ports)issue('RIV-016:no_external_river_port',[river.id,river.vertexPath.map(v=>v.key),[...values].map(([key,fs])=>[key,[...fs].sort()]).sort()]);
  }
  for(const [key,ids] of occupied)if(ids.length>1)issue('duplicate_physical_edge',[key,[...ids].sort((a,b)=>a-b)]);
  const ids=new Set(edges.flatMap(e=>[e.from,e.to])),nodes:RiverNode[]=[];
  for(const id of [...ids].sort()){
    const incoming=edges.filter(e=>e.to===id),outgoing=edges.filter(e=>e.from===id);
    if(geometry.lakeHexCount.has(id))nodes.push({id,kind:'lake',lakeHexCount:geometry.lakeHexCount.get(id)!});
    else if(geometry.seaVertices.has(id))nodes.push({id,kind:'sea'});
    else if(incoming.length+outgoing.length===1&&geometry.openVertices.has(id))nodes.push({id,kind:'open'});
    else if(!incoming.length&&outgoing.length===1)nodes.push({id,kind:'source'});
    else if(incoming.length===1&&!outgoing.length)nodes.push({id,kind:'lake',lakeHexCount:0});
    else nodes.push({id,kind:incoming.length===2&&outgoing.length===1?'confluence':'continuation'});
  }
  return {network:{nodes,edges:edges.sort((a,b)=>a.id.localeCompare(b.id))},issues:[...issues].sort()};
}

export class RiverPathSolveError extends Error {
  readonly status:'invalid'|'unsatisfiable'|'limit';
  constructor(status:'invalid'|'unsatisfiable'|'limit',detail:string=''){
    super(`river_solver_${status}: ${status==='limit'?'Проверка слишком сложна; упростите русло':detail}`);this.name='RiverPathSolveError';this.status=status;
  }
}
/** Unknown values exist only in this detached proposal. Every exterior F stays
 * fixed. The final full physical/legacy/cycle check still runs in prepareRiverEdit. */
export function solveManualRiverPath(before:EditableRiver[],river:EditableRiver,path:RiverVertexValue[],fixed:ReadonlyMap<string,NonNullable<RiverEdge['fullness']>>,geometry:RiverEditingGeometry,options:{maxStates?:number}={}):Map<string,NonNullable<RiverEdge['fullness']>>{
  const maxStates=options.maxStates??5000;
  if(!Number.isSafeInteger(maxStates)||maxStates<1||maxStates>5000)throw new RiverPathSolveError('invalid','Invalid component budget');
  const owners=riverPathOwners(river,path,{edgeOwners:key=>geometry.edgeOwners.get(key)??[]});
  const keys=path.slice(1).map((v,i)=>riverFeatureEdge(path[i],v)),unknown=new Set(keys.filter(k=>!fixed.has(k)));
  if([...fixed].some(([key,f])=>!keys.includes(key)||!isFullness(f)))throw new RiverPathSolveError('invalid','Unknown fixed condition');
  if(river.deltaParentRiverId!==undefined&&unknown.size)throw new RiverPathSolveError('invalid','Delta arm requires explicit fullness and dependency validation');
  const draft:PendingRiver={...river,vertexPath:path,sectors:path.slice(1).map((v,i)=>{
    const key=keys[i];return {id:`pending:${river.id}:${key}`,riverId:river.id,sectorIndex:i+1,vertexPath:[path[i],v],edgeKeys:[key],startVertexKey:path[i].key,endVertexKey:v.key,startReason:'unknown',endReason:'unknown',assignedRegionId:owners.get(key),fullness:fixed.get(key)};
  })};
  const previous=buildManualRiverNetwork(before,geometry),next=buildManualRiverNetwork([...before.filter(r=>r.id!==river.id),draft],geometry,unknown);
  const oldIssues=new Set(previous.issues);for(const issue of next.issues)if(!oldIssues.has(issue))throw new RiverPathSolveError('invalid',issue);
  const signature=(n:RiverNetwork,id:string)=>JSON.stringify([n.nodes.find(v=>v.id===id),n.edges.filter(e=>e.from===id||e.to===id).map(e=>[e.id,e.from,e.to,e.regionId,e.height,e.fullness??null]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
  const active=new Set(next.network.nodes.filter(n=>signature(previous.network,n.id)!==signature(next.network,n.id)).map(n=>n.id));
  const local:RiverNetwork={nodes:next.network.nodes.filter(n=>active.has(n.id)),edges:[]};
  for(const edge of next.network.edges)if(active.has(edge.from)||active.has(edge.to)){
    if(edge.fullness===undefined&&!unknown.has(edge.id))throw new RiverPathSolveError('invalid',`Unknown fixed boundary ${edge.id}`);
    const from=active.has(edge.from)?edge.from:`fixed:start:${edge.id}`,to=active.has(edge.to)?edge.to:`fixed:end:${edge.id}`;
    local.edges.push({...edge,from,to});if(from!==edge.from)local.nodes.push({id:from,kind:'open'});if(to!==edge.to)local.nodes.push({id:to,kind:'open'});
  }
  const values=new Map(fixed),remaining=new Set(local.nodes.map(n=>n.id));
  while(remaining.size){
    const ids=new Set<string>([remaining.values().next().value!]);
    for(const id of ids)for(const edge of local.edges)if(edge.from===id||edge.to===id)ids.add(edge.from===id?edge.to:edge.from);
    for(const id of ids)remaining.delete(id);
    const result=solveRiverNetwork({nodes:local.nodes.filter(n=>ids.has(n.id)),edges:local.edges.filter(e=>ids.has(e.from))},{maxStates});
    if(result.status!=='solved')throw new RiverPathSolveError(result.status,result.status==='limit'?'':result.issues.map(i=>`${i.rule}:${i.code}:${i.nodeId??i.edgeId??''}`).join(';'));
    for(const [key,f] of Object.entries(result.fullness))if(keys.includes(key))values.set(key,f);
  }
  // Interior lake strokes are hidden drawing geometry, never extra flow ports.
  // Keep explicit/old values; otherwise use this river's nearest solved outlet,
  // then inlet. No unrelated river or synthetic lake area supplies a value.
  for(let i=0;i<keys.length;i++)if(!values.has(keys[i])){
    const lake=geometry.lakeByVertex.get(path[i].key);
    if(!lake||lake!==geometry.lakeByVertex.get(path[i+1].key))throw new RiverPathSolveError('invalid','Missing solved edge');
    let f:RiverEdge['fullness'];
    for(let j=i+1;j<keys.length&&geometry.lakeByVertex.get(path[j].key)===lake;j++)if(values.has(keys[j])){f=values.get(keys[j]);break;}
    if(f===undefined)for(let j=i-1;j>=0&&geometry.lakeByVertex.get(path[j+1].key)===lake;j--)if(values.has(keys[j])){f=values.get(keys[j]);break;}
    if(!isFullness(f))throw new RiverPathSolveError('invalid','Lake stroke has no real flow port');values.set(keys[i],f!);
  }
  for(const [key,f] of fixed)if(values.get(key)!==f)throw new RiverPathSolveError('invalid','Changed fixed condition');
  return new Map(keys.map(k=>[k,values.get(k)!]));
}
