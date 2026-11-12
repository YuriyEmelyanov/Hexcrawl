// Bounded OM06/09/10/14 evidence on the smoke runner's one accepted world.
// This extends its existing lifecycle instead of introducing another browser/world.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createDetailGrid,detailCellCenter,worldToDetailCell} from '../../src/detailGrid.ts';
import {summarizeDetailCell} from '../../src/detailSummary.ts';
import {detailFootprintWorldAnchor,detailFootprintExtentMiles} from '../../src/detailSizes.ts';
import {prepareDetailFootprintExtentEdit} from '../../src/detailGeography.ts';

const key=c=>`${c.q},${c.r}`;
const neighbours=c=>[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]].map(([q,r])=>({q:c.q+q,r:c.r+r}));
const world=d=>{const copy=structuredClone(d);delete copy.ui;if(copy.map.physicalGrid){delete copy.map.physicalGrid.selectedCell;delete copy.map.physicalGrid.selectedWorldPoint;delete copy.map.physicalGrid.viewStep;}return copy;};
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));

export function prepareFineEvidenceFixture(h){
 const doc=h.render().captureDocument(),state=doc.map.physicalGrid,grid=createDetailGrid(1,state.grid.origin),owner=state.poiFootprints.find(p=>p.legacyRef?.startsWith('poi:')&&detailFootprintExtentMiles(p,grid)>=1);
 assert.ok(owner);
 // Explicit conditional test data, not a measured real ruin or a changed catalogue.
 doc.map.physicalGrid=prepareDetailFootprintExtentEdit(doc.map,h.geometry.detailMapRiverGeometry(doc.map,state.grid.origin),state,owner.poiId,{kind:'manual_size',diameterMiles:3,basis:'conditional',note:'OM10 browser fixture: explicitly conditional three-mile extent'});
 h.render().applyDocument(doc);
}

export function fineEvidenceSamples(h){
 const map=h.render().captureDocument().map,state=map.physicalGrid,grid=createDetailGrid(1,state.grid.origin),coarse=createDetailGrid(6,state.grid.origin);
 // Read the real App bridge; do not replace its algorithm in the tested page.
 const bridge=h.geometry.detailMapRiverGeometry;
 const rivers=bridge(map,state.grid.origin),accepted=new Set(h.render().fineCells.map(r=>key(r.cell))),pending=new Map();
 const add=point=>{const c=worldToDetailCell(grid,point);for(const cell of [c,...neighbours(c)])if(accepted.has(key(cell)))pending.set(key(cell),cell);};
 for(const road of map.roads)for(const s of road.segments){const a=detailCellCenter(coarse,s.from),b=detailCellCenter(coarse,s.to);add(a);add({x:(a.x+b.x)/2,y:(a.y+b.y)/2});}
 for(const river of rivers)for(const e of river.edges)add({x:(e.segment.from.x+e.segment.to.x)/2,y:(e.segment.from.y+e.segment.to.y)/2});
 for(const p of state.poiFootprints)add(detailFootprintWorldAnchor(p,grid));
 const summaries=[...pending.values()].map(cell=>({cell,...summarizeDetailCell({...state,viewStep:1,selectedWorldPoint:undefined},cell,new Map(),{roads:map.roads,rivers})}));
 const selected=new Map();
 for(const [kind,predicate]of [['road',s=>s.routes.some(r=>r.kinds.includes('road'))],['trail',s=>s.routes.some(r=>r.kinds.includes('trail'))],['river',s=>s.rivers.length],['crossing',s=>s.rivers.some(r=>r.crossingIds.length)],['water-poi',s=>s.pois.some(p=>p.legacyRef?.startsWith('waterPoi:'))],['large-poi',s=>s.pois.some(p=>state.poiFootprints.find(f=>f.poiId===p.poiId).cells.length>1)]]){
  const sample=summaries.find(predicate);assert.ok(sample,`accepted fixture contains ${kind}`);const value=selected.get(key(sample.cell))??{...sample,kinds:[]};value.kinds.push(kind);selected.set(key(sample.cell),value);
 }
 const withObject=[...selected.values()][0],source=worldToDetailCell(coarse,detailCellCenter(grid,withObject.cell));
 const large=[...selected.values()].find(s=>s.kinds.includes('large-poi')),largeOwner=large.pois.find(p=>state.poiFootprints.find(f=>f.poiId===p.poiId).cells.length>1);
 const owner=state.poiFootprints.find(p=>p.poiId===largeOwner.poiId),other=owner.cells.find(c=>key(c)!==key(large.cell)&&accepted.has(key(c)));
 assert.ok(other,'large POI has another accepted fine part');selected.set(key(other),{cell:other,...summarizeDetailCell({...state,viewStep:1,selectedWorldPoint:undefined},other,new Map(),{roads:map.roads,rivers}),kinds:['large-poi-other-part']});
 const blank=summaries.find(s=>!s.routes.length&&!s.rivers.length&&!s.pois.length&&key(worldToDetailCell(coarse,detailCellCenter(grid,s.cell)))===key(source));
 assert.ok(blank,'same source-six cell has a genuinely empty local neighbour');selected.set(key(blank.cell),{...blank,kinds:['empty-local']});
 return {samples:[...selected.values()],source,roads:map.roads,rivers,footprints:state.poiFootprints,large_owner:largeOwner.poiId};
}

export async function checkFineCamera({page,step,snap,manifest}){
 const before=world(await snap()),profiles=[];
 for(const width of [1500,390,320]){
  await page.setViewportSize({width,height:1000});await page.locator('.map-viewport').scrollIntoViewIfNeeded();
  for(const rotated of [false,true]){
   const isRotated=await page.locator('[data-fine-world]').getAttribute('transform');
   if(!!isRotated!==rotated)await page.locator('.rotate-map-button').click();
   await frames(page);
   const target=await page.locator('[data-fine-key]').evaluateAll(nodes=>{const centers=nodes.map(n=>{const p=[...n.querySelector('polygon').points];return {key:n.dataset.fineKey,x:p.reduce((s,p)=>s+p.x,0)/6,y:p.reduce((s,p)=>s+p.y,0)/6};});const xs=centers.map(c=>c.x),ys=centers.map(c=>c.y),x=(Math.min(...xs)+Math.max(...xs))/2,y=(Math.min(...ys)+Math.max(...ys))/2;return centers.sort((a,b)=>(a.x-x)**2+(a.y-y)**2-((b.x-x)**2+(b.y-y)**2))[0].key;});
   await page.locator(`[data-fine-key="${target}"]`).click();
   await page.evaluate(target=>{const el=document.querySelector(`[data-fine-key="${target}"] polygon`),svg=el.ownerSVGElement,v=document.querySelector('.map-viewport'),p=svg.createSVGPoint(),pts=[...el.points];p.x=pts.reduce((s,p)=>s+p.x,0)/6;p.y=pts.reduce((s,p)=>s+p.y,0)/6;window.__fineFocusPoint={x:p.x,y:p.y};const c=p.matrixTransform(el.getScreenCTM()),r=v.getBoundingClientRect();v.scrollLeft+=c.x-r.left-v.clientWidth/2;v.scrollTop+=c.y-r.top-v.clientHeight/2;},target);
   await frames(page);
   const measure=()=>page.evaluate(()=>{const v=document.querySelector('.map-viewport'),r=v.getBoundingClientRect(),svg=v.querySelector('svg[data-render-phase]'),layer=svg.querySelector('[data-fine-world],.map-rotation-layer'),p=svg.createSVGPoint();Object.assign(p,window.__fineFocusPoint);const c=p.matrixTransform(layer.getScreenCTM());return {x:c.x-r.left,y:c.y-r.top,width:v.clientWidth,height:v.clientHeight,scale:Number(svg.style.transform.match(/scale\(([^)]+)\)/)[1])};});
   const start=await measure();await step.selectOption('6');await page.waitForFunction(()=>!document.querySelector('[data-fine-world]'));await frames(page);const coarse=await measure();
   await step.selectOption('1');await page.locator('[data-fine-world]').waitFor();await frames(page);const end=await measure();
   const error=Math.hypot(start.x-end.x,start.y-end.y),middleError=Math.hypot(start.x-coarse.x,start.y-coarse.y);
   profiles.push({width,rotated,target,start,coarse,end,error,middleError});assert.ok(error<=1.1,JSON.stringify(profiles.at(-1)));assert.ok(Math.abs(end.scale/start.scale-1)<=1e-9);assert.ok(Math.abs(coarse.scale*6/start.scale-1)<=1e-9);
   // A fully visible point must stay visible in the intermediate coarse view.
   assert.ok(coarse.x>=-1&&coarse.x<=coarse.width+1&&coarse.y>=-1&&coarse.y<=coarse.height+1,JSON.stringify(profiles.at(-1)));
  }
 }
 if(await page.locator('[data-fine-world]').getAttribute('transform'))await page.locator('.rotate-map-button').click();
 await page.setViewportSize({width:1500,height:1000});assert.deepEqual(world(await snap()),before,'camera/style/UI preserves accepted world and RNG');manifest.camera_profiles=profiles;
}

export async function checkFineObjectsAndPng({page,step,snap,shot,button,manifest,out,oracle}){
 const before=world(await snap()),panel=page.locator('[data-fine-panel]'),samples=[];
 for(const sample of oracle.samples){
  const id=key(sample.cell);await page.locator(`[data-fine-key="${id}"]`).click();await panel.hover();
  const text=await panel.innerText();
  for(const road of oracle.roads)assert.equal(text.includes(`OM route ${road.id}`),sample.routes.some(r=>r.id===road.id),`local road ${road.id} in ${id}`);
  for(const river of oracle.rivers)assert.equal(text.includes(`OM river ${river.id}`),sample.rivers.some(r=>r.id===river.id),`local river ${river.id} in ${id}`);
  const poiLabels=[];for(const poi of sample.pois){const marker=page.locator(`[data-fine-pois] [data-poi-id="${poi.poiId}"] [role=img]`).first();if(await marker.count())poiLabels.push(await marker.getAttribute('aria-label'));}
  for(const label of poiLabels)assert.ok(text.includes(label),`local POI label ${label}`);
  const dom=await page.locator('[data-fine-world]').evaluate(el=>({roads:[...el.querySelectorAll('.roads-layer line')].map(n=>[n.getAttribute('x1'),n.getAttribute('y1'),n.getAttribute('x2'),n.getAttribute('y2')]),rivers:[...el.querySelectorAll('.rivers-layer line')].map(n=>[n.getAttribute('x1'),n.getAttribute('y1'),n.getAttribute('x2'),n.getAttribute('y2')]),crossings:el.querySelectorAll('[data-fine-crossing]').length,water:{seas:[...el.children[1].querySelectorAll(':scope > polygon')].map(n=>n.getAttribute('points')),lakes:[...el.querySelectorAll('.lake-water-layer path')].map(n=>n.getAttribute('d'))}}));
  if(sample.kinds.some(k=>k.startsWith('large-poi')))assert.ok(sample.pois.some(p=>p.poiId===oracle.large_owner),'both fine parts address the same accepted owner');
  const ps=await panel.locator(':scope > p').allTextContents();const labels=ps.filter(s=>!/^[-\d]+\/[-\d]+$/.test(s)).slice(1+sample.routes.length+sample.rivers.length);assert.deepEqual(labels,poiLabels,'no unrelated or duplicate POI labels leak from source-six');
  samples.push({cell:id,kinds:sample.kinds,text,route_ids:sample.routes.map(r=>r.id),river_ids:sample.rivers.map(r=>r.id),poi_ids:sample.pois.map(r=>r.poiId),rendered:dom});
  if(sample.kinds.includes('river')||sample.kinds.includes('water-poi')||sample.kinds.includes('empty-local'))await shot(`desktop-local-${sample.kinds[0]}.jpg`);
 }
 assert.deepEqual(world(await snap()),before,'local reads preserve all geography, identities and streams');
 const pngs=[];
 const png=async name=>{await page.evaluate(()=>window.__oneSvg=null);const menu=page.locator('details.export-menu');if(await menu.getAttribute('open')===null)await menu.locator('summary').click();const [download]=await Promise.all([page.waitForEvent('download'),button('PNG').click()]);const bytes=await fs.readFile(await download.path());await fs.writeFile(new URL(name,out),bytes);const svg=await page.evaluate(()=>window.__oneSvg);assert.ok(svg,'capture real SVG prepared by PNG exporter');const facts=await page.evaluate(text=>{const xml=new DOMParser().parseFromString(text,'image/svg+xml'),root=xml.documentElement;return {parserErrors:xml.querySelectorAll('parsererror').length,fine:xml.querySelectorAll('[data-fine-key]').length,native:xml.querySelectorAll('polygon.hex[data-hex-key]').length,editor:xml.querySelectorAll('[data-editor-only]').length,roads:xml.querySelectorAll('.roads-layer line').length,rivers:xml.querySelectorAll('.rivers-layer line').length,pois:xml.querySelectorAll('[data-fine-pois] [data-poi-id]').length,width:Number(root.getAttribute('width')),height:Number(root.getAttribute('height')),images:[...xml.querySelectorAll('image')].every(i=>(i.getAttribute('href')??'').startsWith('data:'))};},svg);assert.equal(facts.parserErrors,0);assert.ok(facts.fine>100);assert.equal(facts.native,0);assert.equal(facts.editor,0);assert.ok(facts.roads&&facts.rivers&&facts.pois);assert.equal(facts.images,true);assert.equal(bytes.readUInt32BE(16),Math.ceil(facts.width*2));assert.equal(bytes.readUInt32BE(20),Math.ceil(facts.height*2));assert.ok(bytes.length>10000);pngs.push({name,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),facts});return bytes;};
 const first=await png('fine-tiles.png');await page.locator(`[data-fine-key="${key(oracle.samples[0].cell)}"]`).hover();const second=await png('fine-hover.png');assert.ok(first.equals(second),'hover/selection/candidates do not leak into exported PNG');
 const style=page.locator('button.biome-display-toggle');await style.click();await png('fine-emoji.png');await style.click();await page.locator('.rotate-map-button').click();await png('fine-color-rotated.png');await page.locator('.rotate-map-button').click();await style.click();
 assert.deepEqual(world(await snap()),before,'PNG/style/rotation do not mutate accepted world');manifest.local_samples=samples;manifest.png=pngs;manifest.cases.push({id:'UI-fine-export-local-features',status:'pass'});
}
