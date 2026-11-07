// Ephemeral benchmark-worktree instrumentation; never edits the checked-out product.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.argv[2];
assert(root && root.includes('hx003-timing-product'));
const path=root+'/src/App.tsx';
let text=await fs.readFile(path,'utf8');
function replaceOnce(from,to){assert.equal(text.split(from).length-1,1,from);text=text.replace(from,to);}
replaceOnce('useEffect, useMemo, useRef, useState','useEffect, useLayoutEffect, useMemo, useRef, useState');
text=`const __hx003Mark=(name:string)=>{if((window as any).__HX003_ARMED)performance.mark('hx003:'+name);};\n`+text;
const begin='  const generateAt = (anchor: AxialHex) => {\n';
const end='\n  // Текущие параметры генерации, собранные из выпадающих списков.';
assert.equal(text.split(begin).length-1,1);assert.equal(text.split(end).length-1,1);
const start=text.indexOf(begin),finish=text.indexOf(end,start),body=text.slice(start+begin.length,finish);
assert(body.endsWith('  };\n'));
text=text.slice(0,start)+begin+"    __hx003Mark('t0');\n    try {\n"+body.slice(0,-5)+"    } finally { if(generationMode!=='mythic')__hx003Mark('t1'); }\n  };\n"+text.slice(finish);
replaceOnce('    kingdomInFlight.current=false; setKingdomJob(null);\n  };',"    kingdomInFlight.current=false; setKingdomJob(null); __hx003Mark('t1');\n  };");
replaceOnce("kingdomInFlight.current=false;setKingdomJob(null);}\n  };", "kingdomInFlight.current=false;setKingdomJob(null);__hx003Mark('t1');}\n  };");
replaceOnce("} catch(error) { kingdomInFlight.current=false; reportGenerationFailure(error,anchor,{mode:'mythic'},failureBackup ?? backup,actionContext); }", "} catch(error) { kingdomInFlight.current=false; reportGenerationFailure(error,anchor,{mode:'mythic'},failureBackup ?? backup,actionContext); __hx003Mark('t1'); }");
replaceOnce('  return (\n    <div className="app">',`  useLayoutEffect(()=>{
    if(!(window as any).__HX003_ARMED || !renderDetails || kingdomJob
      || !performance.getEntriesByName('hx003:t1').length || performance.getEntriesByName('hx003:t2').length)return;
    __hx003Mark('t2');
    requestAnimationFrame(()=>requestAnimationFrame(()=>__hx003Mark('t3')));
  });
  return (
    <div className="app">`);
await fs.writeFile(path,text);
console.log('P1 timing probes applied to ephemeral worktree only');
