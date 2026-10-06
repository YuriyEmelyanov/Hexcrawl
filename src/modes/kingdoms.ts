export type Hex = { q: number; r: number };
export type GenerationMode = 'classic' | 'mythic';
export type Kingdom = { id: number; origin: Hex; regionIds: number[]; name: { ru: string; en: string }; color: string; anchor: Hex };
export const key = (h: Hex) => `${h.q},${h.r}`;
export const neighbors = (h: Hex): Hex[] => [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]].map(([q,r]) => ({q:h.q+q,r:h.r+r}));
export const distance = (a: Hex,b: Hex) => Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
// Twelve offset columns and twelve rows; translation is in axial coordinates.
export const kingdomHexes = (origin: Hex): Hex[] => Array.from({length:144},(_,i) => ({q:origin.q+i%12-Math.floor(Math.floor(i/12)/2),r:origin.r+Math.floor(i/12)}));
export const kingdomKeys = (origin: Hex) => new Set(kingdomHexes(origin).map(key));
export function findKingdomOrigin(anchor: Hex, occupied: Set<string>): Hex {
  // All rectangles containing the nearest free hex are considered before moving
  // to the next distance shell. This minimizes the distance to the rectangle.
  const offsets = kingdomHexes({q:0,r:0});
  const tested = new Set<string>();
  let frontier = [anchor];
  const visited = new Set([key(anchor)]);
  for (let radius=0; radius<256; radius++) {
    for (const near of frontier) for (const offset of offsets) {
      const origin = {q:near.q-offset.q,r:near.r-offset.r};
      if (tested.has(key(origin))) continue;
      tested.add(key(origin));
      if (kingdomHexes(origin).every(h=>!occupied.has(key(h)))) return origin;
    }
    const next: Hex[] = [];
    for (const h of frontier) for (const n of neighbors(h)) if (!visited.has(key(n))) { visited.add(key(n)); next.push(n); }
    frontier=next;
  }
  throw new Error('Не удалось найти свободную область для королевства.');
}
export function connectionPath(anchor: Hex, target: Set<string>, blocked: Set<string>): Hex[] {
  const queue=[anchor], previous=new Map<string,Hex|null>([[key(anchor),null]]);
  for(let i=0;i<queue.length && i<100000;i++) {
    const h=queue[i];
    if(target.has(key(h))) {
      const result:Hex[]=[]; let cursor:Hex|null=h;
      while(cursor) { result.push(cursor); cursor=previous.get(key(cursor)) ?? null; }
      return result.reverse();
    }
    for(const n of neighbors(h)) if(!blocked.has(key(n))&&!previous.has(key(n))) {previous.set(key(n),h);queue.push(n);}
  }
  throw new Error('Не удалось соединить выбранный гекс с королевством.');
}
