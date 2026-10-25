const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function worker(){const events={},stores=new Map(),deleted=[],origin='https://example.github.io',scope=origin+'/tu-tu/';let online=true;
 const caches={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return{addAll:async files=>{for(const p of files){if(!online)throw Error('offline');map.set(new URL(p,scope).href,new Response('shell:'+p));}},put:async(req,res)=>map.set(typeof req==='string'?new URL(req,scope).href:req.url,res),match:async req=>map.get(typeof req==='string'?new URL(req,scope).href:req.url)?.clone()};},keys:async()=>[...stores.keys()],delete:async name=>{deleted.push(name);return stores.delete(name);}};
 const self={registration:{scope},location:{origin,href:scope+'sw.js'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>events[name]=fn};
 const box={self,caches,URL,Response,Request,Set,AbortSignal,console,fetch:async req=>{if(!online)throw Error('offline');const url=typeof req==='string'?req:req.url;return new Response(url.includes('fonts.googleapis.com')?'@font-face{src:url(https://fonts.gstatic.com/s/bevietnampro/test.woff2)}':'network:'+url);}};vm.createContext(box);box.importScripts=path=>vm.runInContext(fs.readFileSync(path,'utf8'),box);vm.runInContext(fs.readFileSync('sw.js','utf8'),box);
 return{events,stores,deleted,setOffline:()=>online=false,async run(name,event={}){let pending;events[name]({...event,waitUntil:p=>pending=p});await pending;},async request(path,options={}){let response;events.fetch({request:{url:new URL(path,scope).href,method:'GET',mode:'cors',...options},respondWith:p=>response=p,waitUntil:()=>{}});return response?await response:null;}};
}
test('PWA installs shell, serves navigation offline on a repository subpath, and does not intercept APIs',async()=>{const w=worker();await w.run('install');w.setOffline();const r=await w.request('./',{mode:'navigate'});assert.equal(r.status,200);assert.match(await r.text(),/index.html/);assert.equal(await w.request('https://example.supabase.co/rest/v1/rpc/load',{method:'POST'}),null);assert.equal(await w.request('../other-project/',{mode:'navigate'}),null);});
test('Activation only deletes caches owned by this app and this scope',async()=>{const w=worker();w.stores.set('other-app-v1',new Map());w.stores.set('tu-tu:%2Ftu-tu%2F:old',new Map());await w.run('install');await w.run('activate');assert.ok(w.stores.has('other-app-v1'));assert.ok(!w.stores.has('tu-tu:%2Ftu-tu%2F:old'));});
test('Dictionary downloaded once can be loaded offline; missing static files do not return the HTML shell',async()=>{const w=worker();await w.run('install');await w.request('data/kaikki/index.json.gz');w.setOffline();const r=await w.request('data/kaikki/index.json.gz');assert.equal(r.status,200);assert.match(await r.text(),/network/);assert.equal(await w.request('not-a-script.js'),null);});
test('Activating the current shell preserves the separately downloaded dictionary cache',async()=>{const w=worker();await w.run('install');await w.request('data/kaikki/index.json.gz');await w.run('activate');w.setOffline();const r=await w.request('data/kaikki/index.json.gz');assert.equal(r.status,200);});

test('Kaikki shards load on demand and remain available offline after activation',async()=>{
 const w=worker();await w.run('install');
 assert.ok([...w.stores.values()].every(store=>![...store.keys()].some(url=>url.endsWith('/kaikki/h.json.gz'))));
 await w.request('data/kaikki/index.json.gz');await w.request('data/kaikki/h.json.gz');await w.run('activate');w.setOffline();
 assert.equal((await w.request('data/kaikki/h.json.gz')).status,200);
 assert.equal((await w.request('data/kaikki/index.json.gz')).status,200);
 await assert.rejects(()=>w.request('data/kaikki/z.json.gz'),/offline/);
 assert.equal(await w.request('data/kaikki/not-a-shard.json.gz'),null);
});

test('Font warmup caches Be Vietnam Pro for offline use and preserves it across activation',async()=>{
 const w=worker();await w.run('install');await w.run('message',{data:{type:'CACHE_FONTS'}});await w.run('activate');w.setOffline();
 const css=await w.request('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');assert.match(await css.text(),/@font-face/);
 const font=await w.request('https://fonts.gstatic.com/s/bevietnampro/test.woff2');assert.equal(font.status,200);assert.match(await font.text(),/network/);
 assert.equal(await w.request('https://fonts.gstatic.com/s/otherfamily/test.woff2'),null);
});

function pushWorker({open=[]}={}){
 const events={},notifications=[],opened=[],self={registration:{scope:'https://tutu.test/tu-tu/',showNotification:async(title,options)=>notifications.push({title,options})},clients:{matchAll:async()=>open,openWindow:async url=>opened.push(url)},addEventListener:(name,fn)=>events[name]=fn};
 const box={self,URL};vm.createContext(box);const file='assets/js/push-worker.js';if(fs.existsSync(file))vm.runInContext(fs.readFileSync(file,'utf8'),box);
 return {notifications,opened,async run(name,event){assert.ok(events[name],'push handler '+name+' must exist');let promise;events[name]({...event,waitUntil:p=>promise=p});await promise;}};
}
test('Push notification uses app icons/tag and safely falls back for invalid JSON',async()=>{
 const w=pushWorker();await w.run('push',{data:{json:()=>{throw Error('bad');}}});assert.equal(w.notifications[0].title,'TỪ TỪ');assert.equal(w.notifications[0].options.tag,'daily-review');assert.equal(w.notifications[0].options.icon,'https://tutu.test/tu-tu/assets/images/icon-192.png');
});
test('Notification click navigates/focuses existing app tab and opens review when closed',async()=>{
 const navigated=[],open=[{url:'https://tutu.test/tu-tu/#/',navigate:async url=>navigated.push(url),focus:async()=>navigated.push('focus')}],w=pushWorker({open});let closed=0;await w.run('notificationclick',{notification:{close:()=>closed++,data:{url:'https://evil.test/'}}});assert.equal(closed,1);assert.deepEqual(navigated,['https://tutu.test/tu-tu/#/review','focus']);
 const empty=pushWorker();await empty.run('notificationclick',{notification:{close(){},data:{url:'./#/review'}}});assert.deepEqual(empty.opened,['https://tutu.test/tu-tu/#/review']);
});
test('Service worker never turns push API navigation into the offline HTML shell',async()=>{const w=worker();await w.run('install');assert.equal(await w.request('api/push/cron',{mode:'navigate'}),null);});
