import assert from 'node:assert/strict';
import {createGenerationState,streamsFor} from './src/worldRandom.ts';
for(let seed=0;seed<10000;seed++){
  const initial=createGenerationState(seed);
  const original=streamsFor(initial);
  const ref=streamsFor(createGenerationState(seed));
  const extra=1+seed%15;
  for(let i=0;i<extra;i++)original.poi();
  for(let i=0;i<32;i++)assert.equal(original.geography(),ref.geography());
  const restored=streamsFor(JSON.parse(JSON.stringify(initial)));
  for(let i=0;i<32;i++){
    assert.equal(original.geography(),restored.geography());
    assert.equal(original.poi(),restored.poi());
  }
}
console.log(JSON.stringify({seeds:10000,independent_geography_draws:320000,restored_draws:640000,failures:0}));
