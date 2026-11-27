import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const root=process.cwd();
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
createServer(async(req,res)=>{
  let path;
  try {path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\/$/,'/index.html'));}
  catch {res.writeHead(400).end();return;}
  if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  // Read before writing headers: a missing file (e.g. a browser's automatic
  // /favicon.ico request) must answer 404, not crash the server mid-response.
  let body;
  try {body=await readFile(path);}
  catch {res.writeHead(404,{'Cache-Control':'no-store'}).end();return;}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
}).listen(4173,'127.0.0.1');
