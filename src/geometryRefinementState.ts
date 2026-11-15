/** Structural scoped physical4 composition. The complete candidate map still
 * requires source, spatial boundary and document validation before commit. */
import {parseDetail1StateV11,detailRefinedFootprints,type Detail1State} from './detailModel.ts';
import type {GeometryRefinement} from './geometryPlan.ts';
export function composeScopedDetailState(globalAuthored:Detail1State,refinement:GeometryRefinement):Detail1State {
 if(globalAuthored.version!==3||globalAuthored.geometryRefinement||globalAuthored.globalAuthoredState)throw Error('Scoped composition requires authored physical3');
 const global=parseDetail1StateV11(globalAuthored);
 return parseDetail1StateV11({...global,version:4,geometryRefinement:refinement,globalAuthoredState:global,poiFootprints:detailRefinedFootprints(global,refinement)});
}
