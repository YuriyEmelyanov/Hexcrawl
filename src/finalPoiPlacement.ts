/** Resolve only provisional ordinary sites after final water and before roads,
 * identities, kind/table rolls or document acceptance. No RNG or terrain edits. */
type Cell=Readonly<{q:number;r:number}>;
type Region={hexes:readonly Cell[];centerHex:Cell;pointsOfInterest:readonly Cell[];centralPoiKind?:string;suppressCentralPoi?:boolean;isTract?:boolean};
const key=(h:Cell)=>`${h.q},${h.r}`;
const distance=(a:Cell,b:Cell)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
export function finalizeDryPoiLocations<T extends Region>(region:T,isDry:(hex:Cell)=>boolean,lockCenter=false):T {
 const central=!!region.centralPoiKind&&!region.suppressCentralPoi&&!region.isTract;
 const moveCenter=central&&!isDry(region.centerHex);
 if(!moveCenter&&region.pointsOfInterest.every(isDry))return region;
 if(moveCenter&&lockCenter)throw Error('DETAIL1 new_poi_fixed_center_in_water');
 // Reserve every already suitable site so replacing an earlier candidate cannot
 // steal a later accepted provisional position or change the number of sites.
 const occupied=new Set(region.pointsOfInterest.filter(isDry).map(key));
 let centerHex=region.centerHex;
 if(moveCenter){
  const available=region.hexes.filter(hex=>isDry(hex)&&!occupied.has(key(hex)));
  const neighbours=(hex:Cell)=>region.hexes.filter(other=>distance(hex,other)===1).length;
  available.sort((a,b)=>neighbours(b)-neighbours(a)||distance(a,centerHex)-distance(b,centerHex)||a.q-b.q||a.r-b.r);
  if(!available.length)throw Error('DETAIL1 new_poi_no_dry_cell');
  centerHex=available[0];
 }
 occupied.add(key(centerHex));
 const pointsOfInterest=region.pointsOfInterest.map(site=>{
  if(isDry(site))return site;
  const available=region.hexes.filter(hex=>isDry(hex)&&!occupied.has(key(hex)))
   .sort((a,b)=>distance(a,site)-distance(b,site)||a.q-b.q||a.r-b.r);
  if(!available.length)throw Error('DETAIL1 new_poi_no_dry_cell');
  const target=available[0];occupied.add(key(target));return target;
 });
 return {...region,centerHex,pointsOfInterest};
}
