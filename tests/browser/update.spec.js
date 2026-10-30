import {test,expect} from '@playwright/test';
import {deploymentServer} from './server.js';
// Isolated origin per test: deployment changes never affect parallel games.
test('updated deployment switches two open tabs to one shell and preserves game',async({context})=>{
  const deployment=await deploymentServer(),url=deployment.url;
  try {
    const first=await context.newPage();await first.goto(url);
    await first.evaluate(()=>navigator.serviceWorker.ready);await first.reload();
    await expect.poll(()=>first.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await first.getByRole('button',{name:/^Draw 1 /}).tap();
    const saved=await first.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'));
    const second=await context.newPage();await second.goto(url);
    await expect(second.locator('html')).toHaveAttribute('data-build','1');
    // A failed installation must not replace the working shell.
    deployment.revision=2;deployment.fail=true;
    await first.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update().catch(()=>{});});
    // Wait until the installing worker either becomes redundant or disappears.
    await expect.poll(()=>first.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();return !reg.installing||reg.installing.state==='redundant';})).toBe(true);
    await first.reload();await expect(first.locator('html')).toHaveAttribute('data-build','1');
    // Change bytes again so the browser retries a previously failed version.
    deployment.revision=3;deployment.fail=false;
    await first.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update().catch(()=>{});});
    for(const page of [first,second]) {
      await expect(page.locator('html')).toHaveAttribute('data-build','3');
      expect(await page.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'))).toBe(saved);
    }
    deployment.disconnected=true;await second.reload();
    await expect(second.locator('html')).toHaveAttribute('data-build','3');
    await expect(second.locator('.stack')).toHaveCount(7);
  } finally {await deployment.close();}
});
