const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function worker(){const events={},stores=new Map(),deleted=[],origin='https://example.github.io',scope=origin+'/tu-tu/';let online=true;
 const caches={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return{addAll:async files=>{for(const p of files){if(!online)throw Error('offline');map.set(new URL(p,scope).href,new Response('shell:'+p));}},put:async(req,res)=>map.set(typeof req==='string'?new URL(req,scope).href:req.url,res),match:async req=>map.get(typeof req==='string'?new URL(req,scope).href:req.url)?.clone()};},keys:async()=>[...stores.keys()],delete:async name=>{deleted.push(name);return stores.delete(name);}};
 const self={registration:{scope},location:{origin,href:scope+'sw.js'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>events[name]=fn};
 const box={self,caches,URL,Response,Request,Set,AbortSignal,console,fetch:async req=>{if(!online)throw Error('offline');const url=typeof req==='string'?req:req.url;return new Response(url.includes('fonts.googleapis.com')?'@font-face{src:url(https://fonts.gstatic.com/s/bevietnampro/test.woff2)}':'network:'+url);}};vm.createContext(box);box.importScripts=path=>vm.runInContext(fs.readFileSync(path,'utf8'),box);vm.runInContext(fs.readFileSync('sw.js','utf8'),box);
 return{events,stores,deleted,setOffline:()=>online=false,async run(name,event={}){let pending;events[name]({...event,waitUntil:p=>pending=p});await pending;},async request(path,options={}){let response;events.fetch({request:{url:new URL(path,scope).href,method:'GET',mode:'cors',...options},respondWith:p=>response=p,waitUntil:()=>{}});return response?await response:null;}};
}
test('PWA installs shell, serves navigation offline on a repository subpath, and does not intercept APIs',async()=>{const w=worker();await w.run('install');w.setOffline();const r=await w.request('./',{mode:'navigate'});assert.equal(r.status,200);assert.match(await r.text(),/index.html/);assert.equal(await w.request('https://example.supabase.co/rest/v1/rpc/load',{method:'POST'}),null);assert.equal(await w.request('../other-project/',{mode:'navigate'}),null);});
test('Activation only deletes caches owned by this app and this scope',async()=>{const w=worker();w.stores.set('other-app-v1',new Map());w.stores.set('tu-tu:%2Ftu-tu%2F:old',new Map());await w.run('install');await w.run('activate');assert.ok(w.stores.has('other-app-v1'));assert.ok(!w.stores.has('tu-tu:%2Ftu-tu%2F:old'));});
test('Dictionary downloaded once can be loaded offline; missing static files do not return the HTML shell',async()=>{const w=worker();await w.run('install');await w.request('data/dictionary.json.gz');w.setOffline();const r=await w.request('data/dictionary.json.gz');assert.equal(r.status,200);assert.match(await r.text(),/network/);assert.equal(await w.request('not-a-script.js'),null);});
test('Activating the current shell preserves the separately downloaded dictionary cache',async()=>{const w=worker();await w.run('install');await w.request('data/dictionary.json.gz');await w.run('activate');w.setOffline();const r=await w.request('data/dictionary.json.gz');assert.equal(r.status,200);});

test('WordNet shards load on demand and remain available offline after activation',async()=>{
 const w=worker();await w.run('install');
 assert.ok([...w.stores.values()].every(store=>![...store.keys()].some(url=>url.endsWith('/wordnet/h.json.gz'))));
 await w.request('data/wordnet/index.json.gz');await w.request('data/wordnet/h.json.gz');await w.run('activate');w.setOffline();
 assert.equal((await w.request('data/wordnet/h.json.gz')).status,200);
 assert.equal((await w.request('data/wordnet/index.json.gz')).status,200);
 await assert.rejects(()=>w.request('data/wordnet/z.json.gz'),/offline/);
 assert.equal(await w.request('data/wordnet/not-a-shard.json.gz'),null);
});

test('Font warmup caches Be Vietnam Pro for offline use and preserves it across activation',async()=>{
 const w=worker();await w.run('install');await w.run('message',{data:{type:'CACHE_FONTS'}});await w.run('activate');w.setOffline();
 const css=await w.request('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');assert.match(await css.text(),/@font-face/);
 const font=await w.request('https://fonts.gstatic.com/s/bevietnampro/test.woff2');assert.equal(font.status,200);assert.match(await font.text(),/network/);
 assert.equal(await w.request('https://fonts.gstatic.com/s/otherfamily/test.woff2'),null);
});
