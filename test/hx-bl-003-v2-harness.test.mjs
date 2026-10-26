import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BrowserSupervisor, PackageAbort, validateResourceClass} from '../scripts/hx-bl-003-v2-supervision.mjs';

const env={chromium_version:'151.0.7922.34',playwright:'1.62.1',node:'v24.21.0',platform:'linux',vcpus:4,ram_bytes:16766414848,cpu:'AMD EPYC 9V74 80-Core Processor'};
test('recorded CPU identity is not the resource-class gate; unsupported resources still fail',()=>{
  validateResourceClass(env); validateResourceClass({...env,cpu:'AMD EPYC 7763'});
  for(const change of [{vcpus:2},{ram_bytes:8e9},{chromium_version:'wrong'},{platform:'darwin'},{cpu:''}])assert.throws(()=>validateResourceClass({...env,...change}));
});
async function ownedChild(t,{closeHangs=false}={}){
  // A disposable Node child substitutes for a browser process. No browser or benchmark runs.
  const child=spawn(process.execPath,['-e',"process.stdout.write('ready\\n');setInterval(()=>{},1000)"],{stdio:['ignore','pipe','ignore']});
  const stop=async()=>{if(child.exitCode!==null||child.signalCode!==null)return;const exit=once(child,'exit');child.kill('SIGKILL');await exit;};
  t.after(stop);await once(child.stdout,'data');
  const server={process:()=>child,wsEndpoint:()=> 'local-test-only',close:()=>closeHangs?new Promise(()=>{}):stop(),kill:stop};
  let launches=0;
  return{child,chromium:{launchServer:async()=>{launches++;return server;},connect:async()=>({})},launches:()=>launches};
}
test('external watchdog confirms real owned child exit and latches abort before any next work',async t=>{
  const fixture=await ownedChild(t),events=[];
  const supervisor=new BrowserSupervisor({timeoutMs:20,cleanupMs:200,record:e=>events.push(e)});
  await supervisor.start(fixture.chromium);
  await assert.rejects(supervisor.run(()=>new Promise(()=>{}),'stalled operation'),PackageAbort);
  assert(fixture.child.signalCode||fixture.child.exitCode!==null);
  assert(events.some(e=>e.type==='browser_exit_confirmed'));
  assert.equal(supervisor.owner,null);
  let next=0;await assert.rejects(supervisor.run(()=>{next++;},'next row'),PackageAbort);
  await assert.rejects(supervisor.start(fixture.chromium),PackageAbort);
  assert.equal(next,0);assert.equal(fixture.launches(),1);
});
test('hanging graceful cleanup escalates to kill and waits for observed child exit',async t=>{
  const fixture=await ownedChild(t,{closeHangs:true}),events=[];
  const supervisor=new BrowserSupervisor({cleanupMs:20,record:e=>events.push(e)});
  await supervisor.start(fixture.chromium);await supervisor.dispose();
  assert.equal(supervisor.owner,null);assert(fixture.child.signalCode);
  assert(events.some(e=>e.type==='graceful_close_failed'));
  assert(events.some(e=>e.type==='browser_exit_confirmed'));
});
test('unconfirmed kill remains fatal and cannot start another row or process',async()=>{
  const events=[],supervisor=new BrowserSupervisor({timeoutMs:5,cleanupMs:5,record:e=>events.push(e)});
  supervisor.owner={process:{pid:12345,exitCode:null,signalCode:null},server:{kill:()=>new Promise(()=>{})}};
  await assert.rejects(supervisor.run(()=>new Promise(()=>{}),'hang'),/unconfirmed disposal/);
  assert.equal(supervisor.aborted,true);assert(supervisor.owner);
  assert(events.some(e=>e.type==='browser_exit_unconfirmed'));
  let called=0;await assert.rejects(supervisor.run(()=>{called++;},'must not run'),PackageAbort);assert.equal(called,0);
});
