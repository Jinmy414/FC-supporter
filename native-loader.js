(() => {
  'use strict';
  const FLAG='fcSupporterNativeEnabled';
  let loading=false;
  const host=document.createElement('div');
  host.id='fc-supporter-ea-launcher';
  if(document.getElementById(host.id)) return;
  const root=host.attachShadow({mode:'open'});
  const style=document.createElement('style');
  style.textContent=':host{all:initial;position:fixed;right:18px;bottom:24px;z-index:2147483000}button{min-height:44px;max-width:300px;padding:10px 16px;border:1px solid #34d39980;border-radius:14px;background:#11271f;color:#e5f4ed;font:700 13px system-ui;cursor:pointer;box-shadow:0 6px 24px #0005}button:focus-visible{outline:2px solid #34d399;outline-offset:4px}button:disabled{cursor:default}small{display:block;margin-top:4px;font-size:10px;font-weight:400;color:#a9c9ba}';
  const button=document.createElement('button');
  button.type='button';
  button.textContent='启动 EA 增强客户端';
  const note=document.createElement('small');
  note.textContent='连接原服务，使用原账号及 Gold 权限';
  button.append(note);
  root.append(style,button);
  (document.body||document.documentElement).append(host);
  async function inject() {
    if(loading) return;
    if(document.documentElement.dataset.fodderGgInjected) {host.remove();return;}
    loading=true;
    button.disabled=true;button.textContent='正在连接扩展通道…';
    try {
      await new Promise((resolve,reject)=>{
        const ready=event=>{clearTimeout(timer);document.removeEventListener('fc-supporter-bridge-ready',ready);event.detail?reject(Error(event.detail)):resolve();};
        const timer=setTimeout(()=>{document.removeEventListener('fc-supporter-bridge-ready',ready);reject(Error('扩展通道未就绪'));},5000);
        document.addEventListener('fc-supporter-bridge-ready',ready);
        document.dispatchEvent(new CustomEvent('fc-supporter-enable-bridge'));
      });
    }catch(error){loading=false;button.disabled=false;button.textContent=error.message+'，点击重试';return;}
    if(document.documentElement.dataset.fodderGgInjected){host.remove();return;}
    document.documentElement.dataset.fcSupporterNativeOwner=chrome.runtime.id;
    document.documentElement.dataset.fodderGgInjected='1';
    document.documentElement.dataset.fodderGgSurface='ext';
    document.documentElement.dataset.fcSupporterNativeStatus='loading';
    button.disabled=true;
    button.textContent='正在加载 EA 增强客户端…';
    const script=document.createElement('script');
    script.src=chrome.runtime.getURL('vendor/fodder/client.js');
    script.async=false;
    script.onload=()=>{
      script.remove();
      document.documentElement.dataset.fcSupporterNativeStatus='loaded';
      host.remove();
    };
    script.onerror=()=>{
      script.remove();loading=false;
      delete document.documentElement.dataset.fodderGgInjected;
      delete document.documentElement.dataset.fcSupporterNativeOwner;
      document.documentElement.dataset.fcSupporterNativeStatus='error';
      button.disabled=false;button.textContent='加载失败，点击重试';
    };
    (document.head||document.documentElement).append(script);
  }
  button.addEventListener('click',async()=>{
    try {await chrome.storage.local.set({[FLAG]:true});inject();}
    catch(_){button.textContent='无法保存启用设置，请重新加载扩展';}
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!changes[FLAG]) return;
    if(changes[FLAG].newValue) inject();
    else if(loading) {
      (document.body||document.documentElement).append(host);
      button.disabled=true;button.textContent='EA 增强已关闭，刷新此页面后生效';
    }
  });
  chrome.storage.local.get(FLAG).then(saved=>{if(saved[FLAG]) inject();})
    .catch(()=>{button.textContent='无法读取设置，点击重试启用';});
})();
