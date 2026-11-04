import type {EditableRiver,RiverVertexValue} from './manualRivers';
import {riverFeatureEdge} from './manualRivers';
import type {RiverNetwork,RiverEdge,RiverNode} from './riverModel/core';
import {isFullness} from './riverModel/core';

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
export function buildManualRiverNetwork(rivers:readonly EditableRiver[],geometry:RiverEditingGeometry):{network:RiverNetwork;issues:string[]}{
  const issues=new Set<string>(),edges:RiverEdge[]=[],occupied=new Map<string,number[]>();
  const issue=(code:string,where:unknown)=>issues.add(JSON.stringify([code,where]));
  for(const river of rivers){
    const values=new Map<string,Set<number>>(),owners=new Map<string,Set<number>>();
    for(const s of river.sectors)for(const k of s.edgeKeys){
      const fs=values.get(k)??new Set<number>();fs.add(s.fullness);values.set(k,fs);
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
      if(!isFullness(fullness))issue('unknown_or_ambiguous_fullness',[river.id,id,fs?[...fs].sort():[]]);
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
