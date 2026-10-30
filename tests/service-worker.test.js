import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function worker({failInstall=false}={}) {
  const listeners={},store=new Map(),deleted=[];let skipped=false,claimed=false,network=0,offline=false;
  const cache={async addAll(requests){if(failInstall)throw Error('offline');for(const req of requests){assert.equal(req.cache,'reload');store.set(req.url,new Response(req.url));}},async match(req){return store.get(typeof req==='string'?req:req.url)?.clone();}};
  const caches={async open(){return cache;},async keys(){return ['other-app-cache','classic-win-games-v3'];},async delete(key){deleted.push(key);}};
  const self={registration:{scope:'https://example.com/classic-win-games/'},addEventListener:(k,f)=>listeners[k]=f,async skipWaiting(){skipped=true;},clients:{async claim(){claimed=true;}}};
  vm.runInNewContext(source,{self,caches,URL,Request,fetch:async()=>{network++;if(offline)throw Error('offline');return new Response('network');}});
  return {listeners,store,deleted,get skipped(){return skipped;},get claimed(){return claimed;},get network(){return network;},offline(){offline=true;}};
}
async function lifecycle(w,event){let promise;w.listeners[event]({waitUntil:p=>promise=p});await promise;}
async function request(w,path) {
  let response;w.listeners.fetch({request:new Request('https://example.com'+path),respondWith:p=>response=p});return response;
}
test('complete shell stages before activation; unrelated caches survive',async()=>{
  const w=worker();await lifecycle(w,'install');assert.ok(w.skipped);assert.equal(w.store.size,11);
  await lifecycle(w,'activate');assert.ok(w.claimed);assert.deepEqual(w.deleted,['classic-win-games-v3']);
});
test('failed precache never skips waiting',async()=>{
  const w=worker({failInstall:true});await assert.rejects(lifecycle(w,'install'));assert.equal(w.skipped,false);
});
test('versioned shell is served offline without networking; unowned resources untouched',async()=>{
  const w=worker();await lifecycle(w,'install');w.offline();
  for(const path of ['/classic-win-games/','/classic-win-games/index.html','/classic-win-games/src/app.js','/classic-win-games/style.css','/classic-win-games/src/freecell.js','/classic-win-games/src/board.js','/classic-win-games/#freecell','/classic-win-games/index.html#klondike'])assert.ok((await request(w,path)).ok);
  assert.equal(w.network,0);assert.equal(await request(w,'/other-app/'),undefined);
});
