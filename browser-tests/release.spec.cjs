const {test,expect} = require('@playwright/test');
const fs = require('node:fs');
const crypto = require('node:crypto');
test('navigation reaches the selected tool on desktop and small screens',async({page})=>{
  await page.goto('/');
  const toggle=page.getByRole('button',{name:/导航菜单$/});
  if(await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded','false');
    await toggle.click();
  }
  await page.locator('#siteNavigation .nav-menu').first().locator('summary').click();
  await page.getByRole('link',{name:'活动阵容',exact:true}).click();
  await expect(page).toHaveURL(/app\.html#events$/);
  await expect(page.locator('#view-events')).toBeVisible();
});
test('installation layout, all platform panels, guide and actual ZIP download', async ({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/安装 FC\s*Supporter/})).toBeVisible();
  for(const id of ['userscript','firefox','ios','android']) {
    await page.locator(`#${id} > summary`).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute('open','');
    await expect(page.locator(`#${id} .details-body`)).toBeVisible();
    await page.locator(`#${id} > summary`).click();
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const download=page.waitForEvent('download');
  await page.locator('a[href="downloads/fc-supporter.zip"]').click();
  const file=await download;
  expect(file.suggestedFilename()).toBe('fc-supporter.zip');
  const bytes=fs.readFileSync(await file.path());
  const manifest=await (await page.request.get('/downloads/manifest.json')).json();
  expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(manifest.files.find(f=>f.name==='fc-supporter.zip').sha256);
  const menu=page.getByRole('button',{name:'打开导航菜单'});
  if(await menu.isVisible()) await menu.click();
  await page.locator('[data-dialog="guideDialog"]').click();
  await expect(page.locator('#guideDialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#guideDialog')).not.toBeVisible();
  await page.screenshot({path:info.outputPath('installer.png'),fullPage:true});
  expect(errors).toEqual([]);
});
test('real browser Worker solves a squad, persists data and builds the pitch',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/app.html');
  await page.locator('#loadDemo').click();
  await expect(page.locator('#rosterCount')).toHaveText('24 名球员');
  await page.locator('#solveBatch').click();
  await expect(page.locator('#sbcResults .player-row')).toHaveCount(11);
  await expect(page.locator('#sbcResults .metric-pill')).toHaveCount(3);
  await expect(page.locator('#sbcResults .metric-pill').first()).toBeVisible();
  await expect(page.locator('#jobProgress')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('#toast')).not.toHaveClass(/show/);
  await page.screenshot({path:info.outputPath('sbc.png'),fullPage:true});
  await page.reload();
  await expect(page.locator('#rosterCount')).toHaveText('24 名球员');
  await page.locator('[data-view="squad"]').click();
  await page.locator('#buildSquad').click();
  await expect(page.locator('#squadResult .formation-player')).toHaveCount(11);
  expect(await page.locator('#squadResult .formation-board').evaluate(board=>{
    const area=board.getBoundingClientRect();
    return [...board.querySelectorAll('.formation-player')].flatMap(card=>{
      const rect=card.getBoundingClientRect();return rect.left>=area.left&&rect.right<=area.right?[]:[{text:card.textContent,left:rect.left,right:rect.right,areaLeft:area.left,areaRight:area.right}];
    });
  })).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('pitch.png'),fullPage:true});
  expect(errors).toEqual([]);
});
test('file import and joint batch allocation work through real Worker messages',async({page})=>{
  await page.goto('/app.html#players');
  const players=Array.from({length:22},(_,i)=>({id:`joint-${i}`,name:`球员 ${i}`,rating:80,positions:['CM'],club:i<9||i===11||i===12?'common':`unique-${i}`,owned:true}));
  await page.locator('#playerFile').setInputFiles({name:'club.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(players))});
  await expect(page.locator('#rosterCount')).toHaveText('22 名球员');
  await page.locator('[data-view="sbc"]').click();
  await page.locator('.advanced-requirements > summary').click();
  await page.locator('.json-option').click();
  await expect(page.locator('#useJson')).toBeChecked();
  await page.locator('#requirements').fill('[{"minRating":80},{"minUniqueClubs":11}]');
  await page.locator('#solveBatch').click();
  await expect(page.locator('#sbcResults .player-row')).toHaveCount(22);
  const names=await page.locator('#sbcResults .player-name').allTextContents();
  expect(new Set(names).size).toBe(22);
});
