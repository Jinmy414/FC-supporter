const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const coreSource=fs.readFileSync('core.js','utf8');
const workerSource=fs.readFileSync('solver-worker.js','utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){for(let i=0;i<150;i++){if(check())return;await sleep(5);}assert.fail('Timed out waiting for UI');}
function environment(page='app.html',hash='',{worker=true,delay=0}={}){
 const errors=[];
 const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(fs.readFileSync(page,'utf8'),{url:'https://example.com/FC-supporter/'+page+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 const w=dom.window;
 w.confirm=()=>true;
 w.URL.createObjectURL=()=> 'blob:fixture';w.URL.revokeObjectURL=()=>{};
 const workers=[];
 if(worker)w.Worker=class {
   constructor(){this.dead=false;workers.push(this);}
   postMessage(data){
     const owner=this;
     const c={console,importScripts(){vm.runInContext(coreSource,context);},postMessage(message){if(!owner.dead)owner.onmessage?.({data:message});}};
     c.self=c; const context=vm.createContext(c);vm.runInContext(workerSource,context);
     setTimeout(()=>{if(!owner.dead)try{c.onmessage({data:structuredClone(data)});}catch(e){owner.onerror?.(e);}},delay);
   }
   terminate(){this.dead=true;}
 };
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const $=selector=>w.document.querySelector(selector);
 function start(){if(page.endsWith('app.html')){w.eval(coreSource);w.eval(fs.readFileSync('app.js','utf8'));}else w.eval(fs.readFileSync('site/install.js','utf8'));}
 return {dom,w,$,start,errors,workers,close(){dom.window.close();}};
}
async function app(t,hash='',options){const e=environment('app.html',hash,options);t.after(()=>e.close());e.start();await until(()=>e.$('#playerTable').innerHTML.length>0);return e;}
async function demo(e){e.$('#loadDemo').click();await until(()=>e.$('#rosterCount').textContent==='24 名球员');}
async function importText(e,text,name='players.json'){
 const input=e.$('#playerFile');Object.defineProperty(input,'files',{configurable:true,value:[{name,text:async()=>text}]});
 input.dispatchEvent(new e.w.Event('change',{bubbles:true}));await sleep(10);
}

test('app boots with no unhandled errors and deep links select the right view',async t=>{
 const e=await app(t,'#events');assert.ok(e.$('#view-events').classList.contains('active'));
 e.$('[data-view="players"]').click();assert.equal(e.w.location.hash,'#players');assert.equal(e.$('[data-view="players"]').getAttribute('aria-pressed'),'true');assert.equal(e.errors.length,0);
});
test('demo data persists and survives an app reload',async t=>{
 const e=await app(t);await demo(e);
 const saved=e.w.localStorage.getItem('fcSupporterPlayers');assert.equal(JSON.parse(saved).length,24);
 const copy=environment();t.after(()=>copy.close());copy.w.localStorage.setItem('fcSupporterPlayers',saved);copy.start();await until(()=>copy.$('#rosterCount').textContent==='24 名球员');
});
test('simple SBC controls solve through the worker and display eleven cards',async t=>{
 const e=await app(t);await demo(e);e.$('#solveBatch').click();
 assert.equal(e.$('#jobProgress').hidden,false);assert.equal(e.$('#solveBatch').disabled,true);
 await until(()=>e.$('#sbcResults .player-row'));assert.equal(e.$('#sbcResults').querySelectorAll('.player-row').length,11);assert.equal(e.$('#jobProgress').hidden,true);assert.equal(e.$('#solveBatch').disabled,false);assert.equal(e.errors.length,0);
});
test('batch JSON mode rejects unknown constraints instead of silently ignoring them',async t=>{
 const e=await app(t);await demo(e);e.$('#useJson').click();e.$('#requirements').value='[{"minChemisty":33}]';e.$('#solveBatch').click();
 assert.match(e.$('#toast').textContent,/不支持的要求字段/);assert.equal(e.$('#jobProgress').hidden,true);
});
test('invalid requirement JSON is surfaced without replacing the current result',async t=>{
 const e=await app(t);await demo(e);e.$('#solveBatch').click();await until(()=>e.$('#sbcResults .player-row'));
 const result=e.$('#sbcResults').innerHTML;e.$('#useJson').click();e.$('#requirements').value='{bad json';e.$('#solveBatch').click();
 assert.match(e.$('#toast').textContent,/JSON/);assert.equal(e.$('#sbcResults').innerHTML,result);
});
test('batch unique-group constraints run through the UI and reject contradictory limits',async t=>{
 const e=await app(t);
 const positions=['GK','LB','CB','CB','RB','CM','CM','CM','LW','ST','RW'];
 const players=positions.map((position,i)=>({id:`u${i}`,name:`Unique ${i}`,rating:80,positions:[position],club:'one',league:'one',nation:'one',owned:true}));
 await importText(e,JSON.stringify(players));
 e.$('#useJson').click();e.$('#requirements').value='[{"maxUniqueLeagues":1,"maxUniqueNations":1,"maxUniqueClubs":1}]';
 e.$('#solveBatch').click();await until(()=>e.$('#sbcResults .player-row'));
 assert.equal(e.$('#sbcResults').querySelectorAll('.player-row').length,11);
 const previous=e.$('#sbcResults').innerHTML;
 e.$('#requirements').value='[{"minUniqueLeagues":3,"maxUniqueLeagues":2}]';e.$('#solveBatch').click();
 assert.match(e.$('#toast').textContent,/不能大于/);assert.equal(e.$('#sbcResults').innerHTML,previous);
 assert.equal(e.errors.length,0);
});
test('squad builder respects eligible positions and renders a pitch',async t=>{
 const e=await app(t);await demo(e);e.$('[data-view="squad"]').click();e.$('#buildSquad').click();
 await until(()=>e.$('#squadResult .formation-player'));assert.equal(e.$('#squadResult').querySelectorAll('.formation-player').length,11);assert.match(e.$('#squadSummary').textContent,/Meta/);
});
test('activity planner renders a squad and clearing the roster removes its result',async t=>{
 const e=await app(t);await demo(e);e.$('[data-view="events"]').click();e.$('#buildEventSquad').click();
 await until(()=>e.$('#eventResult .player-row'));assert.equal(e.$('#eventResult').querySelectorAll('.player-row').length,11);
 e.$('#clearPlayers').click();await until(()=>e.$('#rosterCount').textContent==='0 名球员');assert.equal(e.$('#eventResult').querySelectorAll('.player-row').length,0);assert.match(e.$('#eventSummary').textContent,/录入活动规则/);
});
test('stop terminates pending computation and re-enables actions',async t=>{
 const e=await app(t,'',{delay:100});await demo(e);e.$('#solveBatch').click();e.$('#cancelJob').click();
 assert.equal(e.workers[0].dead,true);assert.equal(e.$('#solveBatch').disabled,false);await sleep(120);assert.equal(e.$('#sbcResults').querySelectorAll('.player-row').length,0);
});
test('unavailable worker reports a useful error without an unhandled rejection',async t=>{
 const e=await app(t,'',{worker:false});await demo(e);e.$('#solveBatch').click();await sleep(10);assert.match(e.$('#toast').textContent,/不支持后台求解/);assert.equal(e.errors.length,0);
});
test('malformed import preserves the last good roster',async t=>{
 const e=await app(t);await demo(e);await importText(e,'[null]');assert.equal(e.$('#rosterCount').textContent,'24 名球员');assert.match(e.$('#importStatus').textContent,/失败/);
});
test('quota failure preserves the previous roster and exposes the error',async t=>{
 const e=await app(t);await demo(e);Object.getPrototypeOf(e.w.localStorage).setItem=function(){throw new Error('quota');};
 await importText(e,JSON.stringify([{id:'one',name:'One',rating:80,positions:['CM'],owned:true}]));assert.equal(e.$('#rosterCount').textContent,'24 名球员');assert.match(e.$('#toast').textContent,/无法保存/);assert.equal(e.errors.length,0);
});
test('untrusted player names are escaped when rendered',async t=>{
 const e=await app(t);await importText(e,JSON.stringify([{id:'one',name:'<img src=x onerror="alert(1)">',rating:80,positions:['CM'],owned:true}]));
 assert.equal(e.$('#rosterCount').textContent,'1 名球员');assert.equal(e.$('#playerTable').querySelector('img'),null);assert.match(e.$('#playerTable').textContent,/<img/);
});
test('Meta table filters by eligible position and search query',async t=>{
 const e=await app(t);await demo(e);e.$('#metaPosition').value='GK';e.$('#metaPosition').dispatchEvent(new e.w.Event('change'));
 assert.equal(e.$('#metaTable').querySelectorAll('tbody tr').length,2);assert.equal(e.$('#metaTable tbody tr').querySelectorAll('td').length,7);assert.ok(!e.$('#metaTable').textContent.includes('${'));e.$('#metaSearch').value='no-match';e.$('#metaSearch').dispatchEvent(new e.w.Event('input'));assert.equal(e.$('#metaTable').querySelectorAll('tbody tr').length,0);
});
test('installation page dialogs, hash navigation and notice dismissal work',async t=>{
 const e=environment('site/install.html','#ios');t.after(()=>e.close());e.start();assert.equal(e.$('#ios').open,true);
 e.$('[data-dialog="guideDialog"]').click();assert.equal(e.$('#guideDialog').open,true);e.$('#guideDialog .close-dialog').click();assert.equal(e.$('#guideDialog').open,false);
 e.$('#dismissNotice').click();assert.equal(e.$('#dataNotice').hidden,true);assert.equal(e.w.localStorage.getItem('fcSupporterNotice'),'dismissed');assert.equal(e.errors.length,0);
});
test('installation page handles clipboard failure with a visible manual address',async t=>{
 const e=environment('site/install.html');t.after(()=>e.close());e.start();e.$('#copyExtensionUrl').click();await sleep(5);assert.match(e.$('#siteToast').textContent,/chrome:\/\/extensions/);
});
test('userscript adds one isolated accessible launcher and opens the exact tool URL',t=>{
 const e=environment();t.after(()=>e.close());const calls=[];e.w.open=(...args)=>calls.push(args);const script=fs.readFileSync('site/downloads/fc-supporter.user.js','utf8');e.w.eval(script);e.w.eval(script);
 assert.equal(e.w.document.querySelectorAll('#fc-supporter-launcher').length,1);const button=e.$('#fc-supporter-launcher').shadowRoot.querySelector('button');assert.ok(button.getAttribute('aria-label'));button.click();assert.equal(calls[0][0],'https://jinmy414.github.io/FC-supporter/app.html');assert.match(calls[0][2],/noopener/);
});

test('worker send failure leaves actions usable and reports the problem',async t=>{
 const e=await app(t);await demo(e);e.w.Worker=class{terminate(){}postMessage(){throw Error('clone failed');}};
 e.$('#solveBatch').click();await sleep(5);assert.equal(e.$('#solveBatch').disabled,false);assert.equal(e.$('#jobProgress').hidden,true);assert.match(e.$('#toast').textContent,/无法把球员数据发送/);
});

test('extension storage path saves and reloads without using website localStorage',async t=>{
 const e=environment();t.after(()=>e.close());let saved=[];
 e.w.chrome={storage:{local:{get:async()=>({fcSupporterPlayers:saved}),set:async value=>{saved=JSON.parse(JSON.stringify(value.fcSupporterPlayers));}}}};
 e.start();await until(()=>e.$('#playerTable').innerHTML.length>0);await demo(e);assert.equal(saved.length,24);assert.equal(e.w.localStorage.getItem('fcSupporterPlayers'),null);
 const copy=environment();t.after(()=>copy.close());copy.w.chrome={storage:{local:{get:async()=>({fcSupporterPlayers:saved}),set:async()=>{}}}};copy.start();await until(()=>copy.$('#rosterCount').textContent==='24 名球员');
});
test('extension popup opens its packaged app and closes the popup',t=>{
 const e=environment('popup.html');t.after(()=>e.close());const opened=[];let closed=false;
 e.w.chrome={tabs:{create:args=>opened.push(args.url)},runtime:{getURL:file=>'chrome-extension://fixture/'+file}};e.w.close=()=>{closed=true;};
 e.w.eval(fs.readFileSync('popup.js','utf8'));e.$('#openApp').click();assert.deepEqual(opened,['chrome-extension://fixture/app.html']);assert.equal(closed,true);
});
