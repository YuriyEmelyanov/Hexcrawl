import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateLegacyObstacles,normalizeObstacleCounter,prepareObstacleEdit} from '../src/manualObstacles.ts';
const h=q=>({q,r:0});
const pair=(a,b)=>[`${a.q},${a.r}`,`${b.q},${b.r}`].sort().join('|');
const ctx=()=>({exists:()=>true,water:()=>false,edgeKey:pair,riverEdges:new Set(),roadPairs:new Set(),kingdoms:[]});
const empty=()=>({obstacles:[],nextObstacleId:1});
const add=(a=0,b=1)=>({type:'add',hex:h(a),neighborHex:h(b)});

test('legacy migration assigns deterministic IDs without changing array order or membership',()=>{
 const input=[{kingdomId:2,hex:h(2),neighborHex:h(3),edgeKey:'z'},{kingdomId:1,hex:h(0),neighborHex:h(1),edgeKey:'a'}],before=structuredClone(input);
 const result=migrateLegacyObstacles(input);assert.deepEqual(result.obstacles.map(o=>o.id),[2,1]);assert.equal(result.nextObstacleId,3);assert.deepEqual(input,before);
 assert.deepEqual(migrateLegacyObstacles([...input].reverse()).obstacles.map(o=>o.id),[1,2]);
 for(let i=0;i<input.length;i++){const {id,...o}=result.obstacles[i];assert.deepEqual(o,input[i]);}
 assert.deepEqual(migrateLegacyObstacles(),empty());assert.throws(()=>migrateLegacyObstacles([input[0],input[0]]),/duplicate/);
});
test('v5 counter normalization rejects duplicate IDs, duplicate edges and unsafe allocation',()=>{
 const d=prepareObstacleEdit(empty(),add(),ctx());assert.equal(normalizeObstacleCounter(d.obstacles,1),2);assert.equal(normalizeObstacleCounter(d.obstacles,8),8);
 assert.throws(()=>normalizeObstacleCounter([...d.obstacles,...d.obstacles],2),/duplicate/);
 assert.throws(()=>normalizeObstacleCounter([d.obstacles[0],{...d.obstacles[0],id:2}],3),/duplicate_obstacle_edge/);
 for(const id of [0,-1,1.5,Number.MAX_SAFE_INTEGER])assert.throws(()=>normalizeObstacleCounter([{...d.obstacles[0],id}],2));
 assert.throws(()=>prepareObstacleEdit({...empty(),nextObstacleId:Number.MAX_SAFE_INTEGER},add(),ctx()),/overflow/);
});
test('Classic add and remove preserve input and unrelated state without a fake kingdom',()=>{
 const input={...empty(),note:'retained'},before=structuredClone(input),d=prepareObstacleEdit(input,add(),ctx());
 assert.deepEqual(input,before);assert.equal(d.obstacles[0].id,1);assert.equal(d.nextObstacleId,2);assert.ok(!('kingdomId' in d.obstacles[0]));assert.equal(d.note,'retained');
 const deleted=prepareObstacleEdit(d,{type:'remove',id:1},ctx());assert.deepEqual(deleted,{...input,nextObstacleId:2});assert.equal(d.obstacles.length,1);
 assert.throws(()=>prepareObstacleEdit(deleted,{type:'remove',id:1},ctx()),/stale/);
});
test('move retains identity and unrelated records while recalculating real kingdom membership',()=>{
 const c={...ctx(),kingdoms:[{id:7,origin:h(0)},{id:8,origin:h(30)}]};
 const a=prepareObstacleEdit(empty(),add(),c),b=prepareObstacleEdit(a,add(3,4),c),snapshot=structuredClone(b);
 assert.equal(b.obstacles[0].kingdomId,7);
 const moved=prepareObstacleEdit(b,{...add(30,31),type:'move',id:1},c);assert.equal(moved.obstacles[0].id,1);assert.equal(moved.obstacles[0].kingdomId,8);assert.equal(moved.obstacles[1],b.obstacles[1]);assert.equal(moved.nextObstacleId,3);assert.deepEqual(b,snapshot);
 const outside=prepareObstacleEdit(moved,{...add(70,71),type:'move',id:1},c);assert.ok(!('kingdomId' in outside.obstacles[0]));
});
test('invalid targets and reversed duplicates reject atomically; source move remains no-op',()=>{
 const d=prepareObstacleEdit(empty(),add(),ctx()),before=structuredClone(d);
 const rejected=[{...ctx(),exists:()=>false},{...ctx(),water:()=>true},{...ctx(),edgeKey:()=>undefined},{...ctx(),riverEdges:new Set(['2,0|3,0'])},{...ctx(),roadPairs:new Set(['2,0|3,0'])}];
 for(const c of rejected)assert.throws(()=>prepareObstacleEdit(d,{...add(2,3),type:'move',id:1},c));
 for(const edit of [add(1,0),add(0,2),add(NaN,1),{...add(2,3),type:'move',id:99}])assert.throws(()=>prepareObstacleEdit(d,edit,ctx()));
 assert.equal(prepareObstacleEdit(d,{...add(1,0),type:'move',id:1},{...ctx(),water:()=>true}),d);assert.deepEqual(d,before);
 // Occupancy excludes the moving source, not a second object.
 const two=prepareObstacleEdit(d,add(2,3),ctx());assert.throws(()=>prepareObstacleEdit(two,{...add(3,2),type:'move',id:1},ctx()),/occupied/);
});
