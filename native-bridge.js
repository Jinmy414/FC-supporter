// Isolated-world adapter for the recovered, unchanged MAIN-world client.
// Activation is checked in extension storage, not in page-controlled flags.
(() => {
  'use strict';
  let enabled=false,active=false,probing=false;
  const owned=()=>document.documentElement?.dataset.fcSupporterNativeOwner===chrome.runtime.id;
  function externalBridge() {
    let found=false;
    const pong=()=>{found=true;};
    probing=true;
    document.addEventListener('fodder-bridge-pong',pong);
    try {document.dispatchEvent(new CustomEvent('fodder-bridge-ping'));}
    finally {probing=false;document.removeEventListener('fodder-bridge-pong',pong);}
    return found;
  }
  document.addEventListener('fodder-bridge-ping',()=>{
    if(enabled&&active&&owned()&&!probing) document.dispatchEvent(new CustomEvent('fodder-bridge-pong'));
  });
  document.addEventListener('fc-supporter-enable-bridge',async()=>{
    let error;
    try {
      const saved=await chrome.storage.local.get('fcSupporterNativeEnabled');
      enabled=!!saved.fcSupporterNativeEnabled;
      if(!enabled) throw Error('EA 增强尚未启用');
      // Prefer an existing official bridge rather than duplicating backend calls.
      active=!externalBridge();
    }catch(e){error=e.message||String(e);}
    document.dispatchEvent(new CustomEvent('fc-supporter-bridge-ready',{detail:error||''}));
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local'&&changes.fcSupporterNativeEnabled) enabled=!!changes.fcSupporterNativeEnabled.newValue;
  });
  const channels=[
    ['fodder-fetch-req','fodder-fetch-res',req=>({type:'fodderFetch',path:req.path,opts:req.opts,backend:req.backend})],
    ['fodder-signin-req','fodder-signin-res',req=>({type:'fodderSignIn',provider:req.provider})],
    ['fodder-open-url-req','fodder-open-url-res',req=>({type:'fodderOpenUrl',url:req.url})]
  ];
  for(const [input,output,message] of channels) document.addEventListener(input,event=>{
    if(!enabled||!active||!owned()||externalBridge()) return;
    let req;
    try {req=JSON.parse(event.detail);}catch(_){return;}
    if(!req||typeof req!=='object'||!req.id) return;
    const reply=value=>document.dispatchEvent(new CustomEvent(output,{detail:JSON.stringify({id:req.id,...value})}));
    try {
      chrome.runtime.sendMessage(message(req),response=>reply(chrome.runtime.lastError?
        {error:chrome.runtime.lastError.message}:response||{error:'no response'}));
    }catch(error){reply({error:error.message||String(error)});}
  });
})();
