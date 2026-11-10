function test(name,opts,fn){const loc=new Error().stack.match(/file:\/\/([^\n]+\.test\.mjs):(\d+):(\d+)/);globalThis.__caseInventory.push({file:globalThis.__caseFile,name:String(name),line:loc?Number(loc[2]):null,options:typeof opts==='object'?opts:null});}
test.skip=test;test.todo=test;test.only=test;
export {test};export default test;
