import {roundedRoutes} from './routeBends.ts';
import {refinementRiverDisplayPaths} from './geometryRefinementBoundary.ts';
import {fineRiverStrokeWidth, FINE_HEX_WIDTH} from './oneMilePresentation.ts';
import {prepareRefinementWater} from './geometryRefinementWater.ts';
import type {NormalizedRefinementSource} from './geometryRefinementSource.ts';
import type {GeometryRefinement} from './geometryPlan.ts';
import type {WorldPoint} from './detailGrid.ts';

const pair = (id: number, key: string) => JSON.stringify([id, key]);

export function refinedRouteBends(source: NormalizedRefinementSource, refinement: GeometryRefinement, hidden?: ReadonlySet<string>) {
  const {visible, painted} = refinementRiverDisplayPaths(source, refinement, hidden);
  const fixedRivers = new Set(refinement.riverPlan.mouths.map(m => pair(m.riverId, m.sourceEdgeKey)));
  const pins: WorldPoint[] = [
    ...refinement.riverPlan.waterfalls.map(w => w.point),
    ...refinement.riverPlan.boundaries.filter(b => b.reason === 'region_boundary').map(b => b.point),
  ];
  const byEdge = new Map(visible.map(r => [pair(r.riverId, r.sourceEdgeKey), r]));
  for (const crossing of refinement.roads.crossings) {
    const path = byEdge.get(pair(crossing.riverId, crossing.riverEdgeKey));
    if (!path) continue;
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i-1], b = path.points[i], c = crossing.point;
      const span = Math.hypot(b.x-a.x, b.y-a.y);
      if (Math.hypot(c.x-a.x, c.y-a.y) + Math.hypot(b.x-c.x, b.y-c.y) <= span + 1e-8) pins.push(a,b);
    }
  }
  const riverPaths = roundedRoutes(visible.map(r => ({
    key: pair(r.riverId, r.sourceEdgeKey), routeId: r.riverId, points: r.points,
    fixed: fixedRivers.has(pair(r.riverId, r.sourceEdgeKey)),
  })), pins);
  const curved = visible.map(r => ({...r, points: riverPaths.get(pair(r.riverId,r.sourceEdgeKey))!}));
  const widths = new Map([1,2,3,4,5].map(f => [f, fineRiverStrokeWidth(f)/FINE_HEX_WIDTH]));
  const water = prepareRefinementWater({paths:curved, widthByFullness:widths});
  const paintKeys = new Set(painted.map(r => pair(r.riverId, r.sourceEdgeKey)));
  const shown = water.status === 'prepared' ? curved : visible;
  const roadPaint = roundedRoutes(refinement.roads.roads.map(r => ({
    key: pair(r.roadId, r.sourceRoadSegmentKey), routeId: r.roadId, points: r.points,
    fixed: r.crossingKeys.length > 0 || r.linkedPoiIds.length > 0 || r.paint.some(part => part.poiMaskIds.length > 0),
  })));
  return {
    riverPaint: new Map(shown.map(r => [pair(r.riverId,r.sourceEdgeKey),r.points])),
    visiblePaths: shown, paintedPaths: shown.filter(r => paintKeys.has(pair(r.riverId,r.sourceEdgeKey))),
    displayWater: water.status === 'prepared' ? water : prepareRefinementWater({paths:visible, widthByFullness:widths}),
    roadPaint,
  };
}
