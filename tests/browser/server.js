import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=process.cwd();
export async function deploymentServer() {
  const deployment={revision:1,fail:false,disconnected:false};
  const server=createServer(async(req,res)=>{
    if(deployment.disconnected){req.socket.destroy();return;}
    const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
    if(deployment.fail&&path.endsWith('style.css')){res.writeHead(503).end();return;}
    try {
      let content=await readFile(path);
      if(path.endsWith('sw.js'))content=String(content).replace(/classic-win-games-([a-f0-9]+)/,`classic-win-games-$1-test-${deployment.revision}`);
      if(path.endsWith('app.js'))content=`document.documentElement.dataset.build='${deployment.revision}';\n`+content;
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
      res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return Object.assign(deployment,{url:`http://127.0.0.1:${server.address().port}/`,close:()=>new Promise(resolve=>server.close(resolve))});
}
