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
