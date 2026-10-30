import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=process.cwd();
// Isolated origin per test: deployment changes never affect parallel games.
test('updated deployment switches two open tabs to one shell and preserves game',async({context})=>{
  let revision=1,fail=false;
  const server=createServer(async(req,res)=>{
    const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    if(fail&&path.endsWith('style.css')){res.writeHead(503).end();return;}
    try {
      let content=await readFile(path);
      if(path.endsWith('sw.js'))content=String(content).replace(/classic-win-games-([a-f0-9]+)/,`classic-win-games-$1-test-${revision}`);
      if(path.endsWith('app.js'))content=`document.documentElement.dataset.build='${revision}';\n`+content;
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
      res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/`;
  try {
    const first=await context.newPage();await first.goto(url);
    await first.evaluate(()=>navigator.serviceWorker.ready);await first.reload();
    await expect.poll(()=>first.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await first.getByRole('button',{name:/^Draw 1 /}).tap();
    const saved=await first.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'));
    const second=await context.newPage();await second.goto(url);
    await expect(second.locator('html')).toHaveAttribute('data-build','1');
    // A failed installation must not replace the working shell.
    revision=2;fail=true;
    await first.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update().catch(()=>{});});
    // Wait until the installing worker either becomes redundant or disappears.
    await expect.poll(()=>first.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();return !reg.installing||reg.installing.state==='redundant';})).toBe(true);
    await first.reload();await expect(first.locator('html')).toHaveAttribute('data-build','1');
    // Change bytes again so the browser retries a previously failed version.
    revision=3;fail=false;
    await first.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
    for(const page of [first,second]) {
      await expect(page.locator('html')).toHaveAttribute('data-build','3');
      expect(await page.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'))).toBe(saved);
    }
    await context.setOffline(true);await second.reload();
    await expect(second.locator('html')).toHaveAttribute('data-build','3');
    await expect(second.locator('.stack')).toHaveCount(7);
  } finally {await context.setOffline(false);await new Promise(resolve=>server.close(resolve));}
});
