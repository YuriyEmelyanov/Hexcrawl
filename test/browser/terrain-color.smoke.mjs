import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { MANUAL_BIOMES } from '../../src/rendering/manualBiomes.ts';
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
  await page.getByRole('button', { name: 'Переключить на русский', exact: true }).click();
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).fill('42');
  await page.getByRole('textbox',{name:'Seed мира',exact:true}).press('Tab');
  const fixture=JSON.parse(await fs.readFile(new URL('../fixtures/terrain-display-map.json',import.meta.url),'utf8'));
  fixture.ui.mapScale=1;
  const importMap=async save=>{
    await page.locator('input[type=file]').setInputFiles({name:'terrain.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
    await page.waitForFunction(()=>document.querySelector('input[type=file]').value==='');
    await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
  };
  let lastDownloadAt = 0;
  async function download(format) {
    const pause = 200 - (Date.now() - lastDownloadAt);
    if (pause > 0) await new Promise(resolve=>setTimeout(resolve, pause));
    const menu=page.locator('details.export-menu');
    if(await menu.getAttribute('open')===null) await menu.locator('summary').click();
    const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:format,exact:true}).click()]);
    lastDownloadAt = Date.now();
    return fs.readFile(await file.path());
  }
  const overlays=()=>page.locator('image.terrain-engraving').evaluateAll(nodes=>Object.fromEntries(
    nodes.map(n=>[n.parentElement.querySelector('[data-hex-key]').dataset.hexKey,n.getAttribute('href')])
  ));
  await importMap(fixture);
  assert.equal(await page.locator('.biome-display-toggle').count(),0);
  const before=await overlays();
  assert.ok(Object.keys(before).length>0);
  const features=await page.locator('.map-viewport .map-stage > svg[data-render-phase]').evaluate(svg=>({
    river:getComputedStyle(svg.querySelector('.river-polyline')).stroke,
    marks:getComputedStyle(svg.querySelector('.river-direction-arrow')).stroke,
    waterfall:[...svg.querySelectorAll('.river-waterfall')].map(n=>n.getAttribute('href'))
  }));
  assert.equal(features.river,'rgb(21, 157, 172)');
  assert.equal(features.marks,'rgb(139, 219, 221)');
  assert.ok(features.waterfall.every(h=>h==='/waterfall-color.svg'));
  const png=await download('PNG');
  await fs.mkdir(new URL('../../reports/',import.meta.url),{recursive:true});
  await fs.writeFile(new URL('../../reports/terrain-v2-map.png',import.meta.url),png);
  const saved=JSON.parse((await download('JSON')).toString());
  for(const layer of ['regions','rivers','roads','terrainByHexKey'])assert.deepEqual(saved.map[layer],fixture.map[layer],layer);
  await importMap(saved);assert.deepEqual(await overlays(),before,'JSON reload preserves engravings');
  await page.locator('.rotate-map-button').click();
  assert.deepEqual(await overlays(),before);
  assert.ok(await page.locator('image.terrain-engraving').first().evaluate(n=>Math.abs(n.getCTM().b)<.001),'Artwork remains upright');
  await download('PNG');

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
  for(const b of [...biomes,'lake'])assert.ok(variants.has(`/terrain/engravings/${b}.png`),`${b} rendered`);
  const atlas=await download('PNG');
  await fs.writeFile(new URL('../../reports/terrain-v2-atlas.png',import.meta.url),atlas);
  // Sample clear water inside the broad lake and beside its island, avoiding grid strokes.
  const points=await page.locator('.map-viewport .map-stage > svg[data-render-phase]').evaluate(svg=>{
    const c=(key,dx=0)=>{const b=svg.querySelector(`[data-hex-key="${key}"]`).getBBox();return{x:b.x+b.width/2+dx,y:b.y+b.height/2-17};};
    const lake=svg.querySelector('[data-hex-key="1,2"]').getBBox();
    const land=svg.querySelector('[data-hex-key="2,2"]').getBBox();
    const edge=lake.x+lake.width;
    return [c('12,9'),c('1,2'),c('10,9'),...[-7,-2,2,7].map(dx=>({x:edge+dx,y:land.y+land.height/2}))];
  });
  const pixels=await page.evaluate(async({data,points})=>{
    const im=new Image();im.src=`data:image/png;base64,${data}`;await im.decode();
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
    return points.map(p=>[...x.getImageData(Math.round(p.x*2),Math.round(p.y*2),1,1).data].slice(0,3));
  },{data:atlas.toString('base64'),points});
  for(const pixel of pixels.slice(0,2))assert.ok(pixel.every((v,i)=>Math.abs(v-[93,145,156][i])<3),`Full-cell lake palette: ${pixels}`);
  assert.ok(pixels[2][0]>100,`Island stays land coloured: ${pixels}`);
  const redRamp=pixels.slice(3).map(pixel=>pixel[0]);
  assert.ok(redRamp.every((red,i)=>!i||red>redRamp[i-1]),`Lake and land blend progressively in PNG: ${redRamp}`);
  const stable=await overlays();
  // Expanding a map does not shuffle old cells. Also check a manual biome override.
  sample.map.regions[0].hexes.push({q:-1,r:0});sample.map.biomeOverrideByHexKey['0,0']='mountains';
  await importMap(sample);const grown=await overlays();
  for(const [key,href]of Object.entries(stable))if(key!=='0,0')assert.equal(grown[key],href);
  assert.match(grown['0,0'],/mountains[.]png/);

  // HX-BL-021: use the actual selector and generator, then export and re-open
  // the new biome. The existing atlas only covers the old map variants.
  const evidence = (name) => new URL('../../reports/terrain-v2-f1-' + name, import.meta.url);
  await page.getByRole('button', {name:'Сбросить', exact:true}).click();
  await page.getByRole('textbox', {name:'Seed мира', exact:true}).fill('42');
  await page.getByRole('textbox', {name:'Seed мира', exact:true}).press('Tab');
  const choices = page.locator('.gen-biome-field select');
  assert.equal(await choices.inputValue(), 'auto');
  for (const [id, biome] of Object.entries(MANUAL_BIOMES)) {
    assert.equal(await choices.locator('option[value="' + id + '"]').textContent(), biome.ru);
  }
  await page.screenshot({path:fileURLToPath(evidence('before.png'))});
  await page.locator('.gen-params select').first().selectOption('locality');
  await page.locator('.gen-coast-field select').selectOption('mainland');
  await choices.selectOption('dunes');
  await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
  await page.locator('image.terrain-engraving[href="/terrain/engravings/dunes.png"]').first().waitFor();
  const dunes = JSON.parse(await download('JSON'));
  assert.equal(dunes.map.regions[0].biomeId, 'dunes');
  assert.equal(dunes.generation.masterSeed, 42);
  await importMap(dunes);
  assert.deepEqual(JSON.parse(await download('JSON')).map, dunes.map);
  await page.screenshot({path:fileURLToPath(evidence('dunes-desktop.png'))});
  await fs.writeFile(evidence('dunes-export.png'), await download('PNG'));
  const dryHex = dunes.map.regions[0].hexes.find(({q,r})=>!dunes.map.terrainByHexKey[q + ',' + r]?.terrainOverride);
  const key = dryHex.q + ',' + dryHex.r;
  await page.locator('polygon.hex[data-hex-key="' + key + '"]').dispatchEvent('click');
  await page.getByRole('button', {name:'Редактировать', exact:true}).click();
  await page.getByRole('button', {name:'Изменить биом гекса', exact:true}).click();
  await page.getByRole('combobox', {name:'Изменить биом гекса', exact:true}).selectOption('savanna');
  const edited = JSON.parse(await download('JSON'));
  assert.deepEqual(edited.map, {...dunes.map, biomeOverrideByHexKey:{[key]:'savanna'}});
  assert.deepEqual(edited.generation, dunes.generation);
  await page.getByRole('button', {name:'Отменить', exact:true}).click();
  assert.deepEqual(JSON.parse(await download('JSON')).map, dunes.map);
  await page.getByRole('button', {name:'Повторить', exact:true}).click();
  assert.deepEqual(JSON.parse(await download('JSON')).map, edited.map);
  for (const width of [390, 320]) {
    await page.setViewportSize({width, height:950});
    await choices.selectOption('snow_plains');
    const row = page.locator('.gen-params');
    assert.equal(await choices.locator('option:checked').textContent(), 'Снежно-ледяная равнина');
    const bounds = await row.boundingBox();
    const field = await choices.boundingBox();
    assert.ok(field && bounds && field.x >= bounds.x && field.x + field.width <= bounds.x + bounds.width + 1);
    const innerWidth = await row.evaluate(element=>{
      const style = getComputedStyle(element);
      return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    });
    assert.ok(Math.abs(field.width - innerWidth) <= 1);
    await page.screenshot({path:fileURLToPath(evidence('dunes-narrow-' + width + '.png'))});
  }
  await page.setViewportSize({width:1440, height:1000});
  const langToggle = page.getByRole('button', {name:'Switch to English', exact:true});
  const expandHeader = page.getByRole('button', {name:'Показать кнопки языка и соцсетей', exact:true});
  if (await expandHeader.isVisible()) await expandHeader.click();
  await langToggle.click();
  for (const [id, biome] of Object.entries(MANUAL_BIOMES)) {
    assert.equal(await choices.locator('option[value="' + id + '"]').textContent(), biome.en);
  }

  // Ten small adjacent regions share the same map and pass the ordinary
  // import and rendering pipeline at both display scales and orientations.
  const manualAtlas = structuredClone(sample);
  manualAtlas.map.terrainByHexKey = {};
  manualAtlas.map.biomeOverrideByHexKey = {};
  manualAtlas.map.regions = Object.entries(MANUAL_BIOMES).map(([id, biome], index) => {
    const q = index % 5 * 3, r = Math.floor(index / 5) * 3;
    const centerHex = {q:q+1, r:r+1};
    return {...sample.map.regions[0], id:index+1, heightLevel:biome.height, biomeId:id,
      anchorHex:centerHex, centerHex, suppressCentralPoi:true,
      hexes:Array.from({length:9}, (_, i)=>({q:q+i%3, r:r+Math.floor(i/3)}))};
  });
  manualAtlas.map.terrainByHexKey['0,0'] = {terrainOverride:'lake', lakeId:1};
  await importMap(manualAtlas);
  const scale = page.locator('[data-fine-step]');
  for (const miles of ['6', '1']) {
    if (await scale.inputValue() !== miles) await scale.selectOption(miles);
    if (miles === '1') await page.locator('[data-fine-world]').waitFor({timeout:60000});
    const rendered = miles === '1'
      ? await page.locator('[data-fine-terrain]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-fine-terrain')))
      : Object.values(await overlays()).map(url=>url.split('/').at(-1).replace('.png',''));
    for (const id of Object.keys(MANUAL_BIOMES)) assert.ok(rendered.includes(id), id + ' at ' + miles + ' miles');
    for (const orientation of ['initial', 'rotated']) {
      if (orientation === 'rotated') await page.locator('.rotate-map-button').click();
      const exportPng = await download('PNG');
      assert.equal(exportPng.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      await fs.writeFile(evidence('atlas-' + miles + 'mi-' + orientation + '.png'), exportPng);
    }
    await page.locator('.rotate-map-button').click();
  }
  assert.deepEqual(errors,[]);
  console.log('Terrain v2: engraved catalogue, stable artwork, old/Mythic saves, water colours, lake/island pixels, rotation, map expansion, PNG exports passed.');
} finally {if(browser)await browser.close();server.kill();}
