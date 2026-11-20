import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';

const base = process.env.PROBE_URL || 'http://127.0.0.1:18377';
const bundle = '/assets/index-Dv8AWpd0.js';
const digest = createHash('sha256').update(Buffer.from(await (await fetch(base+bundle)).arrayBuffer())).digest('hex');
assert.equal(digest,'9f7856a2234d9d80eb67e787daa55923ec55f6c2222ff9a8f96d47791eebc813');
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const samples=[];
try {
  for(let seed=42;seed<62;seed++){
    const page=await browser.newPage({viewport:{width:1500,height:1000}});
    await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    page.setDefaultTimeout(12000);
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);
    await page.getByRole('button',{name:'Переключить на русский',exact:true}).click();
    const field=page.getByRole('textbox',{name:'Seed мира',exact:true});
    await field.fill(String(seed)); await field.press('Tab');
    await page.locator('.gen-params select').first().selectOption('locality');
    await page.locator('.gen-coast-field select').selectOption('mainland');
    await page.locator('.gen-biome-field select').selectOption('dunes');
    const frame=()=>page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(performance.now())))));
    const start=await page.evaluate(()=>performance.now());
    await page.locator('polygon.hex.candidate').first().dispatchEvent('click');
    await page.locator('image.terrain-engraving[href="/terrain/engravings/dunes.png"]').first().waitFor();
    await page.locator('[data-render-phase="ready"]').first().waitFor();
    const gen_ms=await frame()-start;
    async function save(){
      const menu=page.locator('details.export-menu');
      if(await menu.getAttribute('open')===null)await menu.locator('summary').click();
      const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);
      return JSON.parse(await readFile(await file.path(),'utf8'));
    }
    const original=await save();
    assert.equal(original.map.regions.length,1);assert.equal(original.generation.masterSeed,seed);
    const cells=original.map.regions[0].hexes;
    const {q,r}=cells.find(({q,r})=>!original.map.terrainByHexKey[q+','+r]?.terrainOverride);
    const key=q+','+r;
    await page.locator('polygon.hex[data-hex-key="'+key+'"]').first().dispatchEvent('click');
    await page.getByRole('button',{name:'Редактировать',exact:true}).click();
    await page.getByRole('button',{name:'Изменить биом гекса',exact:true}).click();
    const select=page.getByRole('combobox',{name:'Изменить биом гекса',exact:true});
    const editStart=await page.evaluate(()=>performance.now());
    await select.selectOption('snow_mountains');
    await page.waitForFunction(()=>document.querySelector('image.terrain-engraving[href*=snow_mountain]')!==null);
    const edit_ms=await frame()-editStart;
    const edited=await save();
    assert.deepEqual(edited.map,{...original.map,biomeOverrideByHexKey:{...original.map.biomeOverrideByHexKey,[key]:'snow_mountains'}});
    await page.reload();
    await page.locator('input[type=file]').setInputFiles({name:'edit.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(edited))});
    await page.waitForFunction(()=>document.querySelector('input[type=file]').value==='');
    const restored=await save();
    assert.deepEqual(restored.map,edited.map);assert.deepEqual(restored.generation,edited.generation);
    assert.deepEqual(errors,[]);
    samples.push({seed,hexes:cells.length,key,gen_ms,edit_ms});
    await page.close();
  }
  console.log(JSON.stringify({sha:'d6daa2cdbc1c17b942d51fe050fac51752cf9fee',bundle_sha256:digest,reference:'lab-linux-chromium',cpu:os.cpus()[0].model,chromium:browser.version(),fixture:'fresh default mode, locality, mainland, dunes; empty → one region, edit one dry hex, JSON reopen',samples},null,2));
} finally {await browser.close()}
