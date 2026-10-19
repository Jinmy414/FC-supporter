const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
test('recovered native runtime exactly matches pinned source digests',()=>{
 const provenance=JSON.parse(fs.readFileSync('vendor/fodder/provenance.json','utf8'));
 assert.equal(provenance.version,'1.3.9');assert.equal(provenance.modified,false);
 for(const file of provenance.files){const bytes=fs.readFileSync('vendor/fodder/'+file.file);assert.equal(bytes.length,file.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256);}
});
function background(){
 let handler;const requests=[];
 const context={URL,Uint8Array,atob,chrome:{runtime:{onMessage:{addListener(callback){handler=callback;}}}},fetch:async(url,options)=>{requests.push({url,options});return{status:200,text:async()=>'transport fixture'};}};
 vm.runInNewContext(fs.readFileSync('vendor/fodder/background.js','utf8'),context);
 return{requests,call:msg=>new Promise(resolve=>handler(msg,{},resolve))};
}
test('native backend relay pins origins and rejects arbitrary destinations without fetching',async()=>{
 const transport=background();
 for(const route of ['https://evil.example/api','//evil.example/api','javascript:alert(1)','https://fodder.gg.evil.example/']){
  assert.match((await transport.call({type:'fodderFetch',path:route})).error,/blocked/);
 }
 assert.equal(transport.requests.length,0);
});
test('native backend relay preserves authentication headers and omits ambient cookies',async()=>{
 const transport=background();
 const reply=await transport.call({type:'fodderFetch',path:'/v1/solves',opts:{method:'POST',headers:{Authorization:'Bearer fixture-token'},body:'{}'}});
 assert.equal(reply.status,200);assert.equal(reply.body,'transport fixture');
 const request=transport.requests[0];assert.equal(request.url,'https://fodder.gg/v1/solves');
 assert.equal(request.options.credentials,'omit');assert.equal(request.options.headers.Authorization,'Bearer fixture-token');assert.equal(request.options.body,'{}');
 await transport.call({type:'fodderFetch',path:'https://solve.fodder.gg/v1/solves',opts:{method:'POST',body:'{}'}});
 assert.equal(transport.requests[1].url,'https://solve.fodder.gg/v1/solves');
});
test('native loader is opt-in, loads the packaged file once and reports loading errors',async()=>{
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://www.ea.com/ea-sports-fc/ultimate-team/web-app/',runScripts:'outside-only'});
 try{
  const w=dom.window;let onChange;
  w.chrome={runtime:{id:'fixture',getURL:file=>'chrome-extension://fixture/'+file},storage:{local:{get:async()=>({}),set:async()=>{}},onChanged:{addListener:callback=>{onChange=callback;}}}};
  w.document.addEventListener('fc-supporter-enable-bridge',()=>w.document.dispatchEvent(new w.CustomEvent('fc-supporter-bridge-ready')));
  w.eval(fs.readFileSync('native-loader.js','utf8'));await Promise.resolve();
  assert.equal(w.document.querySelectorAll('script').length,0);
  const button=w.document.getElementById('fc-supporter-ea-launcher').shadowRoot.querySelector('button');
  button.click();await new Promise(setImmediate);
  assert.equal(w.document.querySelectorAll('script').length,1);assert.match(w.document.querySelector('script').src,/vendor\/fodder\/client\.js$/);
  onChange({fcSupporterNativeEnabled:{newValue:true}},'local');assert.equal(w.document.querySelectorAll('script').length,1);
  w.document.querySelector('script').dispatchEvent(new w.Event('error'));
  assert.equal(w.document.documentElement.dataset.fcSupporterNativeStatus,'error');assert.equal(button.disabled,false);
  button.click();await new Promise(setImmediate);
  w.document.querySelector('script').dispatchEvent(new w.Event('load'));
  assert.equal(w.document.documentElement.dataset.fcSupporterNativeStatus,'loaded');assert.equal(w.document.getElementById('fc-supporter-ea-launcher'),null);
  onChange({fcSupporterNativeEnabled:{newValue:false}},'local');
  assert.match(button.textContent,/刷新此页面/);
 }finally{dom.window.close();}
});

function bridgeEnvironment(){
 const dom=new JSDOM('<!doctype html><body></body>',{runScripts:'outside-only'});
 const w=dom.window;let stored=false,onChange;const calls=[];
 w.chrome={runtime:{id:'fixture',sendMessage:(request,reply)=>{calls.push(request);reply({status:200,body:'transport fixture'});}},storage:{local:{get:async()=>({fcSupporterNativeEnabled:stored})},onChanged:{addListener:callback=>{onChange=callback;}}}};
 w.eval(fs.readFileSync('native-bridge.js','utf8'));
 return{dom,w,calls,enable:async()=>{stored=true;w.document.documentElement.dataset.fcSupporterNativeOwner='fixture';w.document.dispatchEvent(new w.CustomEvent('fc-supporter-enable-bridge'));await new Promise(setImmediate);},disable:()=>onChange({fcSupporterNativeEnabled:{newValue:false}},'local'),request:()=>w.document.dispatchEvent(new w.CustomEvent('fodder-fetch-req',{detail:JSON.stringify({id:1,path:'/fixture'})}))};
}
test('native bridge does not relay before activation or after disabling',async()=>{
 const e=bridgeEnvironment();try{
  e.request();assert.equal(e.calls.length,0);
  await e.enable();e.request();assert.equal(e.calls.length,1);
  e.disable();e.request();assert.equal(e.calls.length,1);
 }finally{e.dom.window.close();}
});
test('native bridge yields to another official bridge without duplicate backend requests',async()=>{
 const e=bridgeEnvironment();try{
  await e.enable();
  e.w.document.addEventListener('fodder-bridge-ping',()=>e.w.document.dispatchEvent(new e.w.CustomEvent('fodder-bridge-pong')));
  let external=0;e.w.document.addEventListener('fodder-fetch-req',()=>external++);
  e.request();assert.equal(e.calls.length,0);assert.equal(external,1);
 }finally{e.dom.window.close();}
});
