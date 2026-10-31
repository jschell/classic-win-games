import {test,expect} from '@playwright/test';
import {APP_VERSION} from '../../src/version.js';

test('About identifies the web build across games',async({page})=>{
  await page.route('**/build-info.json',route=>route.fulfill({json:{version:APP_VERSION,revision:'abcdef0123456789abcdef0123456789abcdef01'}}));
  await page.goto('/');
  await page.locator('#about summary').click();
  await expect(page.locator('#app-version')).toHaveText(`${APP_VERSION} · abcdef0`);
  await expect(page.locator('#app-edition')).toHaveText('Web edition');
  for(const game of ['FreeCell','Spider','Hearts','Minesweeper','Klondike']) {
    await page.getByRole('link',{name:game,exact:true}).tap();
    await expect(page.locator('#app-version')).toHaveText(`${APP_VERSION} · abcdef0`);
  }
});
test('About remains usable when build metadata is unavailable',async({page})=>{
  await page.route('**/build-info.json',route=>route.fulfill({status:404,body:''}));
  await page.goto('/');
  await page.locator('#about summary').click();
  await expect(page.locator('#app-version')).toHaveText(`${APP_VERSION} · development`);
  await expect(page.locator('.stack')).toHaveCount(7);
});
test('desktop About reads its embedded build metadata',async({page,request})=>{
  const info=await (await request.get('/build/desktop-web/build-info.json')).json();
  await page.goto('/build/desktop-web/');
  await page.locator('#about summary').click();
  await expect(page.locator('#app-version')).toHaveText(`${APP_VERSION} · ${info.revision.slice(0,7)}${info.modified?' (modified)':''}`);
  await expect(page.locator('#app-edition')).toHaveText('Windows edition');
});
