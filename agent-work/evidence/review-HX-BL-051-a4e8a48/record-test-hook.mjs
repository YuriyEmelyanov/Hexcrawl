import {registerHooks} from 'node:module';
registerHooks({resolve(spec,context,next){return spec==='node:test'?{url:'file:///tmp/record-test-stub.mjs',shortCircuit:true}:next(spec,context);}});
