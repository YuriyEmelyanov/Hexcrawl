import { key, type Hex } from './kingdoms.ts';
export const MYTHIC_POI = {
  throne: {emoji:'👑',label:{ru:'Престол',en:'Seat'},icon:'capital'},
  holding_castle:{emoji:'🏯',label:{ru:'Удел — замок',en:'Holding — castle'},icon:'castle'},
  holding_city:{emoji:'🏰',label:{ru:'Удел — город',en:'Holding — city'},icon:'city'},
  holding_stronghold:{emoji:'🏰',label:{ru:'Удел — крепость',en:'Holding — fortress'},icon:'stronghold'},
  holding_tower:{emoji:'🗼',label:{ru:'Удел — башня',en:'Holding — tower'},icon:'tower'},
  dwelling:{emoji:'🛖',label:{ru:'Жилище',en:'Dwelling'},icon:'village'},
  sanctuary:{emoji:'⛪',label:{ru:'Святилище',en:'Sanctuary'},icon:'monastery'},
  monument:{emoji:'🗿',label:{ru:'Монумент',en:'Monument'},icon:'obelisk'},
  myth:{emoji:'✨',label:{ru:'Миф',en:'Myth'},icon:'holy_place'},
  hazard:{emoji:'🐾',label:{ru:'Опасность',en:'Hazard'},icon:'lair'},
  curse:{emoji:'☠️',label:{ru:'Проклятие',en:'Curse'},icon:'cursed_place'},
  ruins:{emoji:'🏚️',label:{ru:'Руины',en:'Ruins'},icon:'ruins'}
} as const;
export type MythicPoi = keyof typeof MYTHIC_POI;
export const landmarks: MythicPoi[] = ['dwelling','sanctuary','monument','hazard','curse','ruins'];
export const holdings: MythicPoi[] = ['holding_castle','holding_city','holding_stronghold','holding_tower'];
export function mythicPoiChoices(settled:boolean, central:boolean):MythicPoi[] {
  return settled ? central ? ['throne',...holdings,'dwelling','sanctuary','monument'] : ['dwelling','sanctuary','monument']
    : central ? ['ruins','curse','hazard','dwelling','sanctuary','monument','myth'] : ['ruins','curse','hazard','monument','myth'];
}
export function initialMythicPoints(hexes:Hex[], center:Hex|null, dry:(h:Hex)=>boolean):Hex[] {
  const probability=.12+Math.random()*.05;
  return hexes.filter(h=>(!center||key(h)!==key(center))&&dry(h)&&Math.random()<probability);
}
type PoiRegion = {id:number;hexes:Hex[];centerHex:Hex;isTract?:boolean;biomeLandType:'wild'|'settled';centralPoiKind?:string;pointsOfInterest:Hex[];pointOfInterestKinds?:Record<string,string>};
// Exact quotas are allocated before the final road pass. Existing outside POIs
// remain ordinary landmarks; myths are restricted to one per wild region.
export function allocateKingdomPoi<R extends PoiRegion>(input:R[], area:Set<string>, dry:(h:Hex)=>boolean):R[] {
  const result=input.map(r=>({...r,pointsOfInterest:[] as Hex[],pointOfInterestKinds:{} as Record<string,string>,centralPoiKind:undefined as string|undefined}));
  type Slot = {r:typeof result[number];h:Hex;central:boolean;preferred:boolean};
  const slots:Slot[]=[];
  for(const r of result) for(const h of r.hexes) if(dry(h)) slots.push({r,h,central:!r.isTract&&key(h)===key(r.centerHex),preferred:input.find(x=>x.id===r.id)!.pointsOfInterest.some(p=>key(p)===key(h))});
  const used=new Set<string>();
  const assign=(s:Slot,kind:MythicPoi)=>{used.add(key(s.h));if(s.central)s.r.centralPoiKind=kind;else {s.r.pointsOfInterest.push(s.h);s.r.pointOfInterestKinds[key(s.h)]=kind;}};
  const shuffled=slots.map(s=>({s,rank:Math.random()})).sort((a,b)=>Number(b.s.central)-Number(a.s.central)||Number(b.s.preferred)-Number(a.s.preferred)||a.rank-b.rank).map(x=>x.s);
  const inside=shuffled.filter(s=>area.has(key(s.h)));
  const seats=inside.filter(s=>s.central&&s.r.biomeLandType==='settled').sort((a,b)=>a.r.id-b.r.id);
  if(seats.length<4)throw new Error('Недостаточно освоенных местностей для четырёх уделов.');
  seats.slice(0,4).forEach((s,i)=>assign(s,i===0?'throne':holdings[Math.floor(Math.random()*holdings.length)]));
  const mythRegions=new Set<number>();
  for(const s of inside) if(mythRegions.size<6&&!used.has(key(s.h))&&s.r.biomeLandType==='wild'&&!mythRegions.has(s.r.id)) {assign(s,'myth');mythRegions.add(s.r.id);}
  if(mythRegions.size!==6)throw new Error('Недостаточно диких регионов для шести мифов.');
  for(const kind of landmarks) {
    const count=3+Math.floor(Math.random()*2);
    const allowed=inside.filter(s=>!used.has(key(s.h))&&mythicPoiChoices(s.r.biomeLandType==='settled',s.central).includes(kind));
    if(allowed.length<count)throw new Error(`Недостаточно мест для ориентира ${kind}.`);
    allowed.slice(0,count).forEach(s=>assign(s,kind));
  }
  for(const s of shuffled) if(!area.has(key(s.h))&&(s.central||s.preferred)) {
    const choices=mythicPoiChoices(s.r.biomeLandType==='settled',s.central).filter(k=>k!=='myth'&&k!=='throne'&&!holdings.includes(k));
    assign(s,choices[Math.floor(Math.random()*choices.length)]);
  }
  return result as R[];
}
