import {distance, key, kingdomKeys, type Hex, type Kingdom} from './modes/kingdoms.ts';
import {pairKey, type Obstacle as LegacyObstacle} from './modes/obstacles.ts';

export type EditableObstacle = Omit<LegacyObstacle, 'kingdomId'> & {id:number;kingdomId?:number};
export type ObstacleDocument = {obstacles:EditableObstacle[];nextObstacleId:number};
export type ObstacleEdit = {type:'add';hex:Hex;neighborHex:Hex} | {type:'move';id:number;hex:Hex;neighborHex:Hex} | {type:'remove';id:number};
export type ObstacleContext = {
  exists:(hex:Hex)=>boolean;
  water:(hex:Hex)=>boolean;
  edgeKey:(a:Hex,b:Hex)=>string|undefined;
  riverEdges:ReadonlySet<string>;
  roadPairs:ReadonlySet<string>;
  kingdoms:Pick<Kingdom,'id'|'origin'>[];
};
const fail=(reason:string):never=>{throw new Error(reason);};
const positive=(n:number)=>Number.isSafeInteger(n)&&n>0;
const validHex=(h:Hex)=>Number.isSafeInteger(h.q)&&Number.isSafeInteger(h.r);

/** Call only after the existing legacy save validator accepts the complete file.
 * IDs depend on edge keys, not array order. Geometry and legacy membership are untouched.
 */
export function migrateLegacyObstacles(obstacles:LegacyObstacle[]=[]):ObstacleDocument {
  const edges=obstacles.map(o=>o.edgeKey);
  if(new Set(edges).size!==edges.length)fail('duplicate_obstacle_edge');
  const ids=new Map([...edges].sort().map((edge,i)=>[edge,i+1]));
  return {obstacles:obstacles.map(o=>({...o,hex:{...o.hex},neighborHex:{...o.neighborHex},id:ids.get(o.edgeKey)!})),nextObstacleId:obstacles.length+1};
}

/** Normalize the v5 counter only; never repair geometry or renumber persisted IDs. */
export function normalizeObstacleCounter(obstacles:EditableObstacle[],nextObstacleId:number):number {
  if(!positive(nextObstacleId))fail('invalid_next_obstacle_id');
  const ids=new Set<number>(),edges=new Set<string>();let maximum=0;
  for(const o of obstacles){
    if(!positive(o.id)||ids.has(o.id))fail('invalid_or_duplicate_obstacle_id');
    if(edges.has(o.edgeKey))fail('duplicate_obstacle_edge');
    ids.add(o.id);edges.add(o.edgeKey);maximum=Math.max(maximum,o.id);
  }
  if(maximum>=Number.MAX_SAFE_INTEGER)fail('obstacle_id_overflow');
  return Math.max(nextObstacleId,maximum+1);
}

/** New-command restrictions intentionally do not revalidate untouched legacy edges. */
export function obstacleTarget(hex:Hex,neighborHex:Hex,ctx:ObstacleContext):Omit<EditableObstacle,'id'> {
  if(!validHex(hex)||!validHex(neighborHex)||distance(hex,neighborHex)!==1)fail('non_adjacent_obstacle_hexes');
  if(!ctx.exists(hex)||!ctx.exists(neighborHex))fail('unknown_obstacle_hex');
  const edgeKey=ctx.edgeKey(hex,neighborHex);
  if(!edgeKey||ctx.edgeKey(neighborHex,hex)!==edgeKey)throw new Error('invalid_obstacle_edge');
  if(ctx.water(hex)||ctx.water(neighborHex))fail('water_obstacle_edge');
  if(ctx.riverEdges.has(edgeKey))fail('river_obstacle_edge');
  if(ctx.roadPairs.has(pairKey(hex,neighborHex)))fail('road_obstacle_edge');
  const owners=ctx.kingdoms.filter(k=>{const area=kingdomKeys(k.origin);return area.has(key(hex))&&area.has(key(neighborHex));});
  if(owners.length>1||owners.some(k=>!positive(k.id)))fail('ambiguous_obstacle_kingdom');
  return {hex:{...hex},neighborHex:{...neighborHex},edgeKey,...(owners.length?{kingdomId:owners[0].id}:{})};
}

/** Pure prepare step. App must check document revision and prepare history before applying. */
export function prepareObstacleEdit(doc:ObstacleDocument,edit:ObstacleEdit,ctx:ObstacleContext):ObstacleDocument {
  if(normalizeObstacleCounter(doc.obstacles,doc.nextObstacleId)!==doc.nextObstacleId)fail('stale_obstacle_counter');
  const old=edit.type==='add'?undefined:doc.obstacles.find(o=>o.id===edit.id);
  if(edit.type!=='add'&&!old)fail('stale_obstacle_selection');
  if(edit.type==='remove')return {...doc,obstacles:doc.obstacles.filter(o=>o!==old)};
  // Returning to the source is a no-op even when a legacy edge would fail today's placement policy.
  if(old&&validHex(edit.hex)&&validHex(edit.neighborHex)&&pairKey(old.hex,old.neighborHex)===pairKey(edit.hex,edit.neighborHex))return doc;
  const target=obstacleTarget(edit.hex,edit.neighborHex,ctx);
  if(doc.obstacles.some(o=>o!==old&&(o.edgeKey===target.edgeKey||pairKey(o.hex,o.neighborHex)===pairKey(target.hex,target.neighborHex))))fail('occupied_obstacle_edge');
  if(old){
    const moved={...old,...target};
    if(target.kingdomId===undefined)delete moved.kingdomId;
    return {...doc,obstacles:doc.obstacles.map(o=>o===old?moved:o)};
  }
  if(doc.nextObstacleId>=Number.MAX_SAFE_INTEGER)fail('obstacle_id_overflow');
  return {...doc,obstacles:[...doc.obstacles,{...target,id:doc.nextObstacleId}],nextObstacleId:doc.nextObstacleId+1};
}
