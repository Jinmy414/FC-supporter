document.getElementById("openApp").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("app.html") });
  window.close();
});
const nativeEnabled=document.getElementById('nativeEnabled');
const nativeStatus=document.getElementById('nativeStatus');
const nativeStorage=chrome.storage?.local;
if(nativeStorage) nativeStorage.get('fcSupporterNativeEnabled').then(saved=>{
  nativeEnabled.checked=!!saved.fcSupporterNativeEnabled;
}).catch(()=>{nativeStatus.textContent='无法读取扩展设置，请重新加载扩展。';});
nativeEnabled.addEventListener('change',async()=>{
  try {
    await nativeStorage.set({fcSupporterNativeEnabled:nativeEnabled.checked});
    if(!nativeEnabled.checked) nativeStatus.textContent='已关闭 EA 增强；已经打开的 EA 页面需刷新后生效。离线工具不受影响。';
  } catch(_) {nativeEnabled.checked=!nativeEnabled.checked;nativeStatus.textContent='设置保存失败，请重新加载扩展。';}
});
document.getElementById('openEA').addEventListener('click',async()=>{
  try {
    await nativeStorage.set({fcSupporterNativeEnabled:true});
    chrome.tabs.create({url:'https://www.ea.com/ea-sports-fc/ultimate-team/web-app/'});
    window.close();
  } catch(_) {nativeStatus.textContent='无法启用 EA 增强，请重新加载扩展。';}
});
