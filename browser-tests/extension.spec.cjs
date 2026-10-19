const {test,expect,chromium}=require('@playwright/test');
const {execFileSync}=require('node:child_process');
const path=require('node:path');

test('generated ZIP installs and popup opens an offline app with real extension storage and Worker',async({},info)=>{
  const unpacked=info.outputPath('unpacked');
  execFileSync('python3',['-c',
    'import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;z.extractall(sys.argv[2])',
    path.resolve('site/downloads/fc-supporter.zip'),unpacked]);
  const context=await chromium.launchPersistentContext('',{
    channel:'chromium',headless:true,viewport:{width:1280,height:900},
    args:[`--disable-extensions-except=${unpacked}`,`--load-extension=${unpacked}`]
  });
  const errors=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  try {
    const management=await context.newPage();
    await management.goto('chrome://extensions/');
    const item=management.locator('extensions-item').filter({hasText:'FC Supporter · 阵容规划'});
    await expect(item).toBeVisible();
    const id=await item.getAttribute('id');
    expect(id).toMatch(/^[a-p]{32}$/);
    await management.screenshot({path:info.outputPath('installed-extension.png')});
    const popup=await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup.screenshot({path:info.outputPath('popup.png')});
    const opened=context.waitForEvent('page');
    await popup.locator('#openApp').click();
    const app=await opened;
    await app.waitForURL(`chrome-extension://${id}/app.html`);
    await context.setOffline(true);
    await app.locator('#loadDemo').click();
    await expect(app.locator('#rosterCount')).toHaveText('24 名球员');
    expect(await app.evaluate(async()=>{
      const saved=await chrome.storage.local.get('fcSupporterPlayers');
      return {count:saved.fcSupporterPlayers.length,localStorageUsed:localStorage.getItem('fcSupporterPlayers')!==null};
    })).toEqual({count:24,localStorageUsed:false});
    await app.reload();
    await expect(app.locator('#rosterCount')).toHaveText('24 名球员');
    await app.locator('#solveBatch').click();
    await expect(app.locator('#sbcResults .player-row')).toHaveCount(11);
    await expect(app.locator('#jobProgress')).toBeHidden();
    await app.locator('[data-view="squad"]').click();
    await app.locator('#buildSquad').click();
    await expect(app.locator('#squadResult .formation-player')).toHaveCount(11);
    await app.screenshot({path:info.outputPath('extension-app.png'),fullPage:true});
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('EA fixture loads the original packaged client only after activation and exposes the native bridge',async({},info)=>{
  const unpacked=info.outputPath('unpacked');
  execFileSync('python3',['-c','import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',path.resolve('site/downloads/fc-supporter.zip'),unpacked]);
  const context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:[`--disable-extensions-except=${unpacked}`,`--load-extension=${unpacked}`]});
  try{
    await context.setOffline(true);
    await context.route('https://www.ea.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>EA transport fixture</title><h1>Fixture without EA services</h1>'}));
    const page=await context.newPage();let clientLoads=0;
    page.on('request',request=>{if(request.url().endsWith('/vendor/fodder/client.js')) clientLoads++;});
    await page.goto('https://www.ea.com/ea-sports-fc/ultimate-team/web-app/');
    const launcher=page.locator('#fc-supporter-ea-launcher');
    await expect(launcher.getByRole('button')).toBeVisible();
    expect(clientLoads).toBe(0);
    expect(await page.evaluate(()=>{
      let pong=false;const listener=()=>{pong=true;};document.addEventListener('fodder-bridge-pong',listener);
      document.dispatchEvent(new CustomEvent('fodder-bridge-ping'));document.removeEventListener('fodder-bridge-pong',listener);return pong;
    })).toBe(false);
    await launcher.getByRole('button').click();
    await expect(page.locator('html')).toHaveAttribute('data-fc-supporter-native-status','loaded');
    expect(clientLoads).toBe(1);await expect(launcher).toHaveCount(0);
    expect(await page.evaluate(()=>new Promise(resolve=>{
      document.addEventListener('fodder-bridge-pong',()=>resolve('pong'),{once:true});document.dispatchEvent(new CustomEvent('fodder-bridge-ping'));
    }))).toBe('pong');
    // The fixture deliberately has no EA services, so the original runtime waits;
    // this verifies distribution/activation, not a fabricated EA or Gold result.
    expect(await page.evaluate(()=>typeof window.services)).toBe('undefined');
    expect(await page.evaluate(()=>typeof window.repositories)).toBe('undefined');
    const management=await context.newPage();await management.goto('chrome://extensions/');
    const id=await management.locator('extensions-item').filter({hasText:'FC Supporter · 阵容规划'}).getAttribute('id');
    const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(popup.locator('#nativeEnabled')).toBeChecked();
    await popup.locator('#nativeEnabled').uncheck();
    await expect(launcher.getByRole('button')).toHaveText(/刷新此页面/);
    await page.reload();
    await expect(launcher.getByRole('button')).toHaveText(/启动 EA 增强客户端/);
    expect(clientLoads).toBe(1);
    await page.screenshot({path:info.outputPath('native-activation.png')});
  }finally{await context.close();}
});
