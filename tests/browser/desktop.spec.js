import {test,expect} from '@playwright/test';

test('staged desktop frontend plays, restores Undo and never registers a worker',async({page})=>{
  const workers=[];
  page.on('request',request=>{if(request.url().endsWith('/sw.js'))workers.push(request.url());});
  await page.goto('/build/desktop-web/');
  await expect(page.locator('html')).toHaveAttribute('data-packaged','desktop');
  await page.getByRole('button',{name:/^Draw 1 /}).tap();
  const saved=await page.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'));
  await page.reload();
  expect(await page.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'))).toBe(saved);
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  await expect(page.getByRole('group',{name:'Waste',exact:true}).locator('.card')).toHaveCount(0);
  for(const [name,columns] of [['FreeCell',8],['Spider',10]]) {
    await page.getByRole('link',{name,exact:true}).tap();
    await expect(page.locator('.stack')).toHaveCount(columns);
  }
  await page.getByRole('link',{name:'Hearts',exact:true}).tap();
  await expect(page.locator('#hearts-board')).toBeVisible();
  expect(workers).toEqual([]);
  expect(await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});
