import assert from 'node:assert/strict';
import {preview} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

// Compare the exact same bridge in two built versions using the ordinary import,
// scale selector and PNG download. The fixture specifies road 1 and river 1.
const [baseDir, headDir, outputDir] = process.argv.slice(2);
await fs.mkdir(outputDir, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--disable-dev-shm-usage']});

async function sample(dir, version, port) {
  const server = await preview({build:{outDir:path.resolve(dir)},preview:{host:'127.0.0.1',port,strictPort:true}});
  const page = await browser.newPage({viewport:{width:1400,height:900}});
  try {
    const url = 'http://127.0.0.1:'+port;
    await page.route(/mc\.yandex/,route=>route.abort());
    await page.addInitScript(()=>{
      const create = URL.createObjectURL;
      URL.createObjectURL = function(blob) {
        if (blob.type.startsWith('image/svg+xml')) blob.text().then(text=>window.lastMapExport=text);
        return create.call(this,blob);
      };
    });
    await page.goto(url);
    await page.locator('input[type=file]').setInputFiles('test/fixtures/road-entry-zigzags.json');
    await page.locator('.river-crossing--bridge').first().waitFor();
    const menu=page.locator('details.export-menu');
    const saveDocument=async()=>{
      if (!await menu.evaluate(el=>el.open)) await menu.locator('summary').click();
      const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'JSON',exact:true}).click()]);
      return JSON.parse(await fs.readFile(await download.path(),'utf8'));
    };
    const original=await saveDocument();
    const records = {};
    for (const step of [6,1]) {
      if (step===1) {
        await page.locator('[data-fine-step]').selectOption('1');
        await page.locator('[data-fine-world]').waitFor({timeout:90000});
      }
      for (const rotated of [false,true]) {
        const label=String(step)+(rotated?'-rotated':'');
        if (rotated) {
          await page.locator('.rotate-map-button').click();
          await page.setViewportSize({width:390,height:900});
        }
        if (!await menu.evaluate(el=>el.open)) await menu.locator('summary').click();
        await page.evaluate(()=>window.lastMapExport=null);
        const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'PNG',exact:true}).click()]);
        await download.saveAs(path.join(outputDir,version+'-'+label+'.png'));
        await page.waitForFunction(()=>!!window.lastMapExport);
        records[label]=await page.evaluate(({step,version})=>{
          const live=document.querySelector('.map-viewport svg');
          const exported=new DOMParser().parseFromString(window.lastMapExport,'image/svg+xml').documentElement;
          const sig=el=>[...el.querySelectorAll('.roads-layer,.rivers-layer')].flatMap(layer=>
            [...layer.querySelectorAll('path,polyline,line')].map(n=>['d','points','x1','y1','x2','y2','stroke-width','stroke-dasharray','opacity'].map(k=>n.getAttribute(k)).join('|')));
          const rails=step===6?live.querySelectorAll('.river-crossing--bridge .bridge-rail'):live.querySelector('[data-refined-road="1"] polyline')?.parentElement.querySelectorAll('polyline');
          if (!rails || rails.length<2) throw Error('Bridge on road 1 missing');
          const middle=rail=>rail.getPointAtLength(rail.getTotalLength()/2);
          const a=middle(rails[0]), b=middle(rails[1]);
          const world=live.getScreenCTM().inverse().multiply(rails[0].getScreenCTM());
          const center=new DOMPoint((a.x+b.x)/2,(a.y+b.y)/2).matrixTransform(world);
          const box=live.viewBox.baseVal;
          const edge='0,56|24.249,70';
          const rivers=version==='before' && step===6 ? live.querySelectorAll('.rivers-layer .river-polyline') :
            live.querySelectorAll((step===6?'[data-river-id="1"]':'[data-refined-river="1"]')+'[data-source-edge="'+edge+'"]');
          const onRiver=[...rivers].some(river=>{
            const local=center.matrixTransform(live.getScreenCTM()).matrixTransform(river.getScreenCTM().inverse());
            return river.isPointInStroke(local);
          });
          return {center:{x:center.x,y:center.y},viewBox:[box.x,box.y,box.width,box.height],onRiver,
            shown:sig(live),sameExport:JSON.stringify(sig(live))===JSON.stringify(sig(exported))};
        },{step,version});
        assert.ok(records[label].sameExport,'screen and exported geometry differ');
        assert.ok(records[label].onRiver,'bridge no longer meets river');
        await menu.evaluate(el=>el.open=false);
        if (rotated) {
          const toggle=page.locator('.side-panel-toggle');
          if (await toggle.getAttribute('aria-expanded')==='true') await toggle.click();
          await page.waitForFunction(()=>document.querySelector('.map-viewport').clientHeight >= innerHeight-2);
          const viewport=page.locator('.map-viewport');
          await viewport.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
          const center=records[label].center;
          await viewport.evaluate((el,c)=>{
            const svg=el.querySelector('svg'),box=el.getBoundingClientRect();
            const p=new DOMPoint(c.x,c.y).matrixTransform(svg.getScreenCTM());
            el.scrollBy({left:p.x-box.left-box.width/2,top:p.y-box.top-box.height/2,behavior:'instant'});
          },center);
          records[label].screen=await viewport.evaluate((el,c)=>{
            const svg=el.querySelector('svg'),matrix=svg.getScreenCTM();
            const p=new DOMPoint(c.x,c.y).matrixTransform(matrix);
            // A whole patch around the bridge must show the map, including its approaches.
            const radius=48;
            for (const dx of [-radius,0,radius]) for (const dy of [-radius,0,radius]) {
              if (!svg.contains(document.elementFromPoint(p.x+dx,p.y+dy))) throw Error('Bridge and approaches outside visible map');
            }
            return {x:p.x,y:p.y,scale:Math.hypot(matrix.a,matrix.b),radius};
          },center);
        }
        await page.screenshot({path:path.join(outputDir,version+'-'+label+'-screen.jpg'),type:'jpeg',quality:80});
        if (rotated) {
          await page.locator('.side-panel-toggle').click();
          await page.locator('.rotate-map-button').click();
          await page.setViewportSize({width:1400,height:900});
        }
      }
    }
    const after=await saveDocument();
    assert.deepEqual(after.map,original.map,'view and export changed saved world');
    assert.deepEqual(after.counters,original.counters,'view and export changed counters');
    await page.locator('input[type=file]').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(after))});
    await page.waitForFunction(()=>!document.querySelector('.controls--transfer > button').disabled);
    assert.deepEqual((await saveDocument()).map,original.map,'round trip changed saved world');
    return records;
  } finally {
    await page.close();
    await new Promise(resolve=>server.httpServer.close(resolve));
  }
}

try {
  const before=await sample(baseDir,'before',4227);
  const after=await sample(headDir,'after',4228);
  for (const step of Object.keys(before)) {
    assert.ok(Math.hypot(after[step].center.x-before[step].center.x,after[step].center.y-before[step].center.y)<.001,'bridge moved');
    assert.notDeepEqual(after[step].shown,before[step].shown,'route artwork did not change');
    delete before[step].shown;
    delete after[step].shown;
  }
  await fs.writeFile(path.join(outputDir,'comparison.json'),JSON.stringify({before,after},null,2));
} finally {
  await browser.close();
}
