import {newKnaveLayer} from '../../src/knaveClassic.ts';
import {KNAVE_CATALOG_VERSION,KNAVE_SOURCE_ID} from '../../src/tags/knave.ts';

// Declared legal content variant of road-entry-zigzags, not a claim about its
// original rolls. Reuse the existing map, source road and Knave river policy.
export const requiredRiverOwner='poi:2:-7,3';
export function withRequiredRiverSite(map){
 const copy=structuredClone(map);
 copy.regions=copy.regions.map(r=>r.id===2?{...r,pointOfInterestKinds:{...r.pointOfInterestKinds,'-7,3':'mill'}}:r);
 copy.knave={...newKnaveLayer(),content:{schemaVersion:1,byPoi:{[requiredRiverOwner]:{
  catalogVersion:KNAVE_CATALOG_VERSION,sourceId:KNAVE_SOURCE_ID,category:'structure',
  site:{selection:'compatible_pool',table:'structures',sourceRow:96,ru:'Declared riverside structure',references:[],representation:'mill'},
  trait:{selection:'d100',roll:1,sourceRow:1,ru:'Declared trait',references:[]}
 }},rollCounters:{[requiredRiverOwner]:{category:1,primary:1,trait:1}}}};
 return copy;
}
