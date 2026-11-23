import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGenerationHarness} from './helpers/generation-harness.mjs';
import {refinedRouteBends} from '../src/refinedRouteBends.ts';

function onSegment(point, a, b) {
  const distance = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  return distance(point, a) + distance(point, b) < distance(a, b) + 1e-8;
}

for (const fixture of ['road-entry-zigzags', 'classic-six-regions-seed42']) {
  test('fine river rounds corners next to the fixed contact in ' + fixture, async () => {
    const h = createGenerationHarness();
    h.injectFunction('readTextFile', async file => file.text);
    const text = await readFile(new URL('./fixtures/' + fixture + '.json', import.meta.url), 'utf8');
    await h.render().handleImportJson({target:{files:[{text}],value:'fixture'}});
    const app = h.render();
    const preview = app.previewOneMile();
    assert.ok(app.applyOneMilePreview(preview));
    assert.ok(h.render().switchFineStep(1));
    const plan = h.render().fineDisplay.geometryRefinement;
    const {riverPlan} = plan;
    const bridge = fixture === 'road-entry-zigzags';
    const contact = bridge
      ? plan.roads.crossings.find(c => c.kind === 'bridge' && c.riverEdgeKey === '0,56|24.249,70')
      : riverPlan.mouths.find(m => m.direction === 'inlet' && m.mode === 'color');
    assert.ok(contact);
    const edge = bridge ? contact.riverEdgeKey : contact.sourceEdgeKey;
    const original = riverPlan.paths.find(p => p.riverId === contact.riverId && p.sourceEdgeKey === edge).points;
    const display = refinedRouteBends(riverPlan.source, plan).riverPaint.get(JSON.stringify([contact.riverId, edge]));
    assert.ok(display.some((p,i) => i && onSegment(contact.point, display[i-1], p)), 'contact stays on the centerline');
    const i = original.findIndex((p,i) => i && onSegment(contact.point, original[i-1], p));
    assert.ok(i > 0);
    const neighboringCorners = bridge ? original.slice(i-1,i+1) : original.slice(Math.max(1,i-3),i);
    assert.ok(neighboringCorners.some(c => !display.some(p => Math.hypot(p.x-c.x,p.y-c.y)<1e-8)), 'adjacent turn is rounded');
  });
}
