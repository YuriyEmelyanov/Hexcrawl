import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

// Compare the exact same bridge in two built versions using the ordinary import,
// scale selector and PNG download. The fixture specifies road 1 and river 1.
const [baseDir, headDir, outputDir] = process.argv.slice(2);
await fs.mkdir(outputDir, {recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--disable-dev-shm-usage']});

async function sample(dir, version, port) {
  const server = spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',path.resolve(dir),'--host','127.0.0.1','--port',String(port),'--strictPort']);
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
    await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error('Preview startup timed out')),15000);
      server.stdout.on('data',text=>{if(String(text).includes('Local:')){clearTimeout(timeout);resolve();}});
      server.once('exit',code=>{clearTimeout(timeout);reject(Error('Preview exit '+code));});
    });
    await page.goto(url);
    await page.locator('input[type=file]').setInputFiles('test/fixtures/road-entry-zigzags.json');
    await page.locator('.river-crossing--bridge').first().waitFor();
    const records = {};
    for (const step of [6,1]) {
      if (step===1) {
        await page.locator('[data-fine-step]').selectOption('1');
        await page.locator('[data-fine-world]').waitFor({timeout:90000});
      }
      const menu=page.locator('details.export-menu');
      if (!await menu.evaluate(el=>el.open)) await menu.locator('summary').click();
      await page.evaluate(()=>window.lastMapExport=null);
      const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'PNG',exact:true}).click()]);
      await download.saveAs(path.join(outputDir,version+'-'+step+'.png'));
      await page.waitForFunction(()=>!!window.lastMapExport);
      records[step]=await page.evaluate(step=>{
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
        const rivers=step===6?live.querySelectorAll('.rivers-layer .river-polyline'):live.querySelectorAll('[data-refined-river="1"]');
        const onRiver=[...rivers].some(river=>{
          const local=center.matrixTransform(live.getScreenCTM()).matrixTransform(river.getScreenCTM().inverse());
          return river.isPointInStroke(local);
        });
        return {center:{x:center.x,y:center.y},viewBox:[box.x,box.y,box.width,box.height],onRiver,
          shown:sig(live),sameExport:JSON.stringify(sig(live))===JSON.stringify(sig(exported))};
      },step);
      assert.ok(records[step].sameExport,'screen and exported geometry differ');
      assert.ok(records[step].onRiver,'bridge no longer meets river');
      await menu.evaluate(el=>el.open=false);
      await page.screenshot({path:path.join(outputDir,version+'-'+step+'-screen.jpg'),type:'jpeg',quality:80});
    }
    return records;
  } finally {
    await page.close();
    server.kill();
  }
}

try {
  const before=await sample(baseDir,'before',4227);
  const after=await sample(headDir,'after',4228);
  for (const step of [6,1]) {
    assert.deepEqual(after[step].center,before[step].center,'bridge moved');
    assert.notDeepEqual(after[step].shown,before[step].shown,'route artwork did not change');
    delete before[step].shown;
    delete after[step].shown;
  }
  await fs.writeFile(path.join(outputDir,'comparison.json'),JSON.stringify({before,after},null,2));
} finally {
  await browser.close();
}
