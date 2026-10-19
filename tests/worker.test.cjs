const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Worker}=require('node:worker_threads');
const {once}=require('node:events');
const fs=require('node:fs');
const adapter=`
const {parentPort,workerData}=require('node:worker_threads');
const vm=require('node:vm');
globalThis.self=globalThis;
globalThis.importScripts=()=>vm.runInThisContext(workerData.core);
globalThis.postMessage=message=>parentPort.postMessage(message);
vm.runInThisContext(workerData.worker);
parentPort.on('message',data=>self.onmessage({data}));
`;
function create(){return new Worker(adapter,{eval:true,workerData:{core:fs.readFileSync('core.js','utf8'),worker:fs.readFileSync('solver-worker.js','utf8')}});}
function request(worker,payload){return new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>reject(Error('worker timeout')),5000);
 worker.on('message',message=>{if(message.type==='progress')return;clearTimeout(timer);resolve(message);});
 worker.on('error',error=>{clearTimeout(timer);reject(error);});
 worker.postMessage(payload);
});}
test('solver protocol succeeds across a real separate JS worker thread',async t=>{
 const w=create();t.after(()=>w.terminate());
 const roles=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'];
 const players=roles.map((position,i)=>({id:'p'+i,assetId:'p'+i,name:'Player '+i,rating:80,positions:[position],owned:true,price:0,club:'c',nation:'n',league:'l',chemBonus:0,stats:{}}));
 const result=await request(w,{type:'batch',players,requirements:[{minChemistry:33}],includeMarket:false});
 assert.equal(result.type,'result');assert.equal(result.result[0].squad.length,11);assert.equal(result.result[0].evaluation.chemistry,33);
});
test('invalid worker requests return structured errors instead of crashing',async t=>{
 const w=create();t.after(()=>w.terminate());
 const result=await request(w,{type:'invalid',players:[]});assert.equal(result.type,'error');assert.match(result.message,/不支持/);
});
