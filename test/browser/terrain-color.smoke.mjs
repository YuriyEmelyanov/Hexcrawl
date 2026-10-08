import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
const server = spawn(process.execPath, [fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  cwd: new URL('../../', import.meta.url), stdio: ['ignore', 'pipe', 'inherit']
});
let browser;
try {
  await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error(`Preview did not start: ${output}`)), 10000);
    server.stdout.on('data', data => {
      output += String(data);
      if (stripVTControlCharacters(output).includes('Local:')) { clearTimeout(timeout); resolve(); }
    });
    server.on('error', reject);
    server.on('exit', code => reject(new Error(`Preview exited: ${code}`)));
  });
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const imageFetches = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', async dialog => { errors.push(dialog.message()); await dialog.dismiss(); });
  page.on('response', response => { if (response.url().includes('/poi/') && !response.ok()) errors.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (request.resourceType() === 'fetch') imageFetches.push(request.url()); });
  await page.route(/mc\.yandex/, route => route.abort());
  await page.goto('http://127.0.0.1:4175/');
  const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/terrain-display-map.json',import.meta.url),'utf8'));
  fixture.ui.mapScale=1;
  const importMap=async save=>{
    await page.locator('input[type=file]').setInputFiles({name:'terrain.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
    await page.waitForTimeout(150);
  };
  const toggle=page.locator('.biome-display-toggle');
  async function download(format) {
    const menu=page.locator('details.export-menu');
    if(await menu.getAttribute('open')===null) await menu.locator('summary').click();
    const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:format,exact:true}).click()]);
    return fs.readFile(await file.path());
  }
  const overlays=()=>page.locator('image.terrain-overlay').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.terrainKey,n.getAttribute('href')])));
  await importMap(fixture);
  // Water geometry and colours are shared by all display modes.
  let lakePaths;
  for (const mode of ['tiles','emoji']) {
    const features=await page.locator('.map-viewport > svg').evaluate(svg=>({
      river:getComputedStyle(svg.querySelector('.river-polyline')).stroke,
      marks:getComputedStyle(svg.querySelector('.river-direction-arrow')).stroke,
      paths:[...svg.querySelectorAll('[data-lake-shape] clipPath[id$="-shape"] > path')].map(n=>n.getAttribute('d')),
      waterfall:[...svg.querySelectorAll('.river-waterfall')].map(n=>n.getAttribute('href'))
    }));
    assert.equal(features.river,'rgb(21, 157, 172)',`${mode} river colour`);
    assert.equal(features.marks,'rgb(139, 219, 221)',`${mode} flow colour`);
    assert.ok(features.paths.length>0,`${mode} natural lakes exist`);
    if(lakePaths)assert.deepEqual(features.paths,lakePaths,'Mode changes preserve lake shapes');else lakePaths=features.paths;
    assert.ok(features.waterfall.every(h=>h==='/waterfall-color.svg'));
    const png=await download('PNG');assert.ok(png.length>10000,`${mode} PNG export`);
    await toggle.click();
  }
  await page.waitForFunction(()=>document.querySelectorAll('image.terrain-overlay').length>0);
  const before=await overlays();
  assert.ok(Object.keys(before).length>100);
  assert.ok(Object.values(before).includes('/terrain/v2/tree.svg'));
  const features=await page.locator('.map-viewport > svg').evaluate(svg=>({
    river:getComputedStyle(svg.querySelector('.river-polyline')).stroke,
    marks:getComputedStyle(svg.querySelector('.river-direction-arrow')).stroke,
    lake:svg.querySelectorAll('.lake-water-layer path').length,
    waterfall:[...svg.querySelectorAll('.river-waterfall')].map(n=>n.getAttribute('href'))
  }));
  assert.equal(features.river,'rgb(21, 157, 172)');assert.equal(features.marks,'rgb(139, 219, 221)');
  assert.ok(features.lake>1);
  assert.deepEqual(await page.locator('[data-lake-shape] clipPath[id$="-shape"] > path').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('d'))),lakePaths);assert.ok(features.waterfall.every(h=>h==='/waterfall-color.svg'));
  const png=await download('PNG');
  await fs.mkdir(new URL('../../reports/',import.meta.url),{recursive:true});
  await fs.writeFile(new URL('../../reports/terrain-v2-map.png',import.meta.url),png);
  const saved=JSON.parse((await download('JSON')).toString());
  assert.deepEqual(saved.map.regions,fixture.map.regions);
  assert.deepEqual(saved.map.rivers,fixture.map.rivers);
  assert.deepEqual(saved.map.roads,fixture.map.roads);
  await importMap(saved);assert.deepEqual(await overlays(),before,'JSON reload preserves variants');
  await toggle.click();await toggle.click();await toggle.click();assert.deepEqual(await overlays(),before,'Mode changes preserve variants');
  await page.locator('.rotate-map-button').click();
  assert.deepEqual(await overlays(),before);
  assert.ok(await page.locator('image.terrain-overlay').first().evaluate(n=>Math.abs(n.getCTM().b)<.001),'Artwork remains upright');
  await download('PNG');

  // A broad lake with an island, a one-hex lake, a narrow lake, and all 20 overlays.
  const sample=structuredClone(saved);
  sample.map.kingdoms=[];sample.map.obstacles=[];sample.map.rivers=[];sample.map.roads=[];sample.map.crossings=[];
  sample.map.waterPoiByHexKey={};sample.map.biomeOverrideByHexKey={};sample.map.terrainByHexKey={};
  const hexes=[];for(let r=0;r<13;r++)for(let q=0;q<18;q++)hexes.push({q,r});
  const biomes=['open_plains','open_hills','mountains','swamp','semi_desert','plain_deciduous_forest'];
  sample.map.regions=biomes.map((biomeId,i)=>({...saved.map.regions[0],id:i+1,generationMode:'classic',kingdomId:undefined,suppressCentralPoi:false,
    hexes:hexes.filter(h=>Math.floor(h.q/3)===i),centerHex:{q:i*3+1,r:5},anchorHex:{q:i*3+1,r:5},biomeId,
    pointsOfInterest:[],pointOfInterestKinds:{},centralPoiKind:'capital'}));
  for(const h of hexes){const d=Math.max(Math.abs(h.q-11),Math.abs(h.r-9),Math.abs(h.q-11+h.r-9));
    if(d<=3 && !(h.q===10&&h.r===9))sample.map.terrainByHexKey[`${h.q},${h.r}`]={terrainOverride:'lake',lakeId:1};}
  sample.map.terrainByHexKey['1,2']={terrainOverride:'lake',lakeId:2};
  for(let q=0;q<5;q++)sample.map.terrainByHexKey[`${q},10`]={terrainOverride:'lake',lakeId:3};
  sample.ui={...sample.ui,generationMode:'classic',isMapRotated:false,selectedHex:null,mapScale:1};
  await importMap(sample);
  const variants=new Set(Object.values(await overlays()));
  for(const b of biomes.slice(0,5))for(let i=1;i<=4;i++)assert.ok(variants.has(`/terrain/v2/${b}-${i}.svg`),`${b}-${i} rendered`);
  const atlas=await download('PNG');
  await fs.writeFile(new URL('../../reports/terrain-v2-atlas.png',import.meta.url),atlas);
  // Sample clear water inside the broad lake and beside its island, avoiding grid strokes.
  const points=await page.locator('.map-viewport > svg').evaluate(svg=>{
    const c=(key,dx=0)=>{const b=svg.querySelector(`[data-hex-key="${key}"]`).getBBox();return{x:b.x+b.width/2+dx,y:b.y+b.height/2+3};};
    return [c('12,9'),c('1,2'),c('10,9')];
  });
  const {pixels,shallow}=await page.evaluate(async({data,points})=>{
    const im=new Image();im.src=`data:image/png;base64,${data}`;await im.decode();
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
    const rgb=p=>[...x.getImageData(Math.round(p.x*2),Math.round(p.y*2),1,1).data].slice(0,3);
    const pixels=points.map(rgb);
    // Find actual water beside the island rather than assuming the hex edge is shoreline.
    const shallow=[];
    for(let t=0;t<=1;t+=.005){const p={x:points[2].x+(points[0].x-points[2].x)*t,y:points[2].y+(points[0].y-points[2].y)*t};const v=rgb(p);if(v[0]>=17&&v[0]<=22&&v[1]>=127&&v[1]<=158&&v[2]>=140&&v[2]<=173)shallow.push(v);}
    return {pixels,shallow};
  },{data:atlas.toString('base64'),points});
  assert.ok(shallow.some(v=>v[1]>pixels[0][1]+15),`Island shore has a lighter water band: ${JSON.stringify({pixels,shallow})}`);
  assert.ok(Math.abs(pixels[1][0]-17)<3 && Math.abs(pixels[1][1]-127)<3 && Math.abs(pixels[1][2]-140)<3,`Single lake reaches the same deep plateau: ${pixels}`);
  assert.ok(pixels[2][0]>100,`Island stays land coloured: ${pixels}`);
  const stable=await overlays();
  // Expanding a map does not shuffle old cells. Also check a manual biome override.
  sample.map.regions[0].hexes.push({q:-1,r:0});sample.map.biomeOverrideByHexKey['0,0']='mountains';
  await importMap(sample);const grown=await overlays();
  for(const [key,href]of Object.entries(stable))if(key!=='0,0')assert.equal(grown[key],href);
  assert.match(grown['0,0'],/mountains-/);
  assert.deepEqual(errors,[]);
  console.log('Terrain v2: all 20 assets, stable variants, old/Mythic saves, water colours, lake/island pixels, rotation, map expansion, PNG exports passed.');
} finally {if(browser)await browser.close();server.kill();}
