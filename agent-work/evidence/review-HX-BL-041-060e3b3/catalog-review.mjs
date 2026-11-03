import fs from 'node:fs';import assert from 'node:assert/strict';import {resolved} from './src/tags/engine.ts';import {mythicDefinitions as defs} from './src/tags/mythic.ts';
const root='/workspace/review-041-evidence/';let myths=0,landmarks=0,seers=0;
for(const row of JSON.parse(fs.readFileSync(root+'MB-myths-72.json')).myths){assert.equal(resolved(defs['mb.myth'],[[row.dice.d6],[row.dice.d12]]).texts[0].ru,row.name_ru);myths++;}
for(const row of JSON.parse(fs.readFileSync(root+'MB-landmarks-432.json')).landmarks){assert.equal(resolved(defs['mb.'+row.kind],[[row.dice.d6],[row.dice.d12]]).texts[0].ru,row.text_ru);landmarks++;}
for(const row of JSON.parse(fs.readFileSync(root+'MB-seers-72.json')).seers){assert.equal(resolved(defs['mb.seer'],[[row.dice.d6],[row.dice.d12]]).texts[0].ru,row.name_ru);seers++;}
console.log(JSON.stringify({sha:'060e3b3ae153d2ee5b8afaf5b94adf28cd36343f',myths,landmarks,seers,status:'match_approved_catalogs',limits:'Catalog comparison, not fresh independent transcription of PDFs'}));
