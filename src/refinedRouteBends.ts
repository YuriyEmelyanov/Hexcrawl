import {bendNodeKey, routeClearance} from './routeClearance.ts';
import {roundedRoutes} from './routeBends.ts';
import {refinementRiverDisplayPaths} from './geometryRefinementBoundary.ts';
import {fineRiverStrokeWidth, FINE_HEX_WIDTH, type FineRoad, type FineCrossing} from './oneMilePresentation.ts';
import {prepareRefinementWater} from './geometryRefinementWater.ts';
import type {NormalizedRefinementSource} from './geometryRefinementSource.ts';
import type {GeometryRefinement} from './geometryPlan.ts';
import type {WorldPoint} from './detailGrid.ts';

const pair = (id: number, key: string) => JSON.stringify([id, key]);

type NativeContext={
  roads:readonly FineRoad[]; crossings:readonly FineCrossing[]; origin:WorldPoint; offset:WorldPoint;
  waterfalls:readonly WorldPoint[]; roadPins:readonly WorldPoint[];
};
export function refinedRouteBends(source: NormalizedRefinementSource, refinement: GeometryRefinement, hidden?: ReadonlySet<string>, native?:NativeContext) {
  const {visible, painted} = refinementRiverDisplayPaths(source, refinement, hidden);
  // Keep the precise contact, while allowing adjacent fine-grid corners to turn.
  const contactLimits = new Map<string, number>();
  const byEdge = new Map(visible.map(r => [pair(r.riverId, r.sourceEdgeKey), r.points]));
  function protectSpan(a: WorldPoint, b: WorldPoint, contact: WorldPoint) {
    for (const end of [a, b]) {
      const key = bendNodeKey(end);
      const distance = Math.hypot(end.x - contact.x, end.y - contact.y);
      contactLimits.set(key, Math.min(contactLimits.get(key) ?? Infinity, distance));
    }
  }
  for (const mouth of refinement.riverPlan.mouths) {
    const path = byEdge.get(pair(mouth.riverId, mouth.sourceEdgeKey));
    if (path) protectSpan(path[mouth.stepIndex], path[mouth.stepIndex + 1], mouth.point);
  }
  const pins: WorldPoint[] = [
    ...refinement.riverPlan.waterfalls.map(w => w.point),
    ...refinement.riverPlan.boundaries.filter(b => b.reason === 'region_boundary').map(b => b.point),
  ];
  const world=(x:number,y:number)=>({x:(x-native!.offset.x)/FINE_HEX_WIDTH+native!.origin.x,y:(y-native!.offset.y)/FINE_HEX_WIDTH+native!.origin.y});
  const retained=new Set(refinement.roads.roads.map(r=>pair(r.roadId,r.sourceRoadSegmentKey)));
  const outside=(native?.roads??[]).filter(r=>!retained.has(pair(r.roadId,r.segmentKey)));
  const crossingRoads=new Set(native?.crossings.map(c=>pair(c.roadId,c.roadSegmentKey)));
  const extraRoads=outside.map(r=>({key:pair(r.roadId,r.segmentKey),routeId:r.roadId,
    points:[world(r.x1,r.y1),world(r.x2,r.y2)],fixed:crossingRoads.has(pair(r.roadId,r.segmentKey))}));
  for (const w of native?.waterfalls??[]) pins.push(world(w.x,w.y));
  const extraCrossings=(native?.crossings??[]).filter(c=>!retained.has(pair(c.roadId,c.roadSegmentKey)) && c.riverEdgeKey)
    .map(c=>({riverId:c.riverId,riverEdgeKey:c.riverEdgeKey!,point:world(c.x,c.y)}));
  for (const crossing of [...refinement.roads.crossings,...extraCrossings]) {
    const path = byEdge.get(pair(crossing.riverId, crossing.riverEdgeKey));
    if (!path) continue;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], c = crossing.point;
      const distance = Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y);
      if (distance <= Math.hypot(b.x - a.x, b.y - a.y) + 1e-8) protectSpan(a, b, c);
    }
  }
  const clearance=routeClearance([...refinement.roads.roads,...extraRoads].map(r=>r.points),visible.map(r=>r.points));
  const riverPaths = roundedRoutes(visible.map(r => ({
    key: pair(r.riverId, r.sourceEdgeKey), routeId: r.riverId, points: r.points,
  })), pins, (point, radius) => {
    const limit = contactLimits.get(bendNodeKey(point)) ?? Infinity;
    return Math.min(clearance(point, 'river', radius), limit / radius);
  });
  const curved = visible.map(r => ({...r, points: riverPaths.get(pair(r.riverId,r.sourceEdgeKey))!}));
  const widths = new Map([1,2,3,4,5].map(f => [f, fineRiverStrokeWidth(f)/FINE_HEX_WIDTH]));
  const water = prepareRefinementWater({paths:curved, widthByFullness:widths});
  const paintKeys = new Set(painted.map(r => pair(r.riverId, r.sourceEdgeKey)));
  const shown = water.status === 'prepared' ? curved : visible;
  const roadPaint = roundedRoutes([...extraRoads,...refinement.roads.roads.map(r => ({
    key: pair(r.roadId, r.sourceRoadSegmentKey), routeId: r.roadId, points: r.points,
    fixed: r.crossingKeys.length > 0 || r.linkedPoiIds.length > 0 || r.paint.some(part => part.poiMaskIds.length > 0),
  }))], (native?.roadPins??[]).map(p=>world(p.x,p.y)), (p,r)=>clearance(p,'road',r));
  return {
    riverPaint: new Map(shown.map(r => [pair(r.riverId,r.sourceEdgeKey),r.points])),
    visiblePaths: shown, paintedPaths: shown.filter(r => paintKeys.has(pair(r.riverId,r.sourceEdgeKey))),
    displayWater: water.status === 'prepared' ? water : prepareRefinementWater({paths:visible, widthByFullness:widths}),
    roadPaint,
  };
}
