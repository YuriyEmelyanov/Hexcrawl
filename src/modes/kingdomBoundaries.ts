import {kingdomHexes,kingdomKeys,type Kingdom} from './kingdoms.ts';
import type {Edge} from './obstacles.ts';
export function kingdomBoundary(kingdom:Kingdom,edges:(h:{q:number;r:number})=>Edge[]):Edge[] {
  const keys=kingdomKeys(kingdom.origin);
  return kingdomHexes(kingdom.origin).flatMap(h=>edges(h).filter(e=>!keys.has(`${e.neighborHex.q},${e.neighborHex.r}`)));
}
