/* Never cache backups, cloud API calls or arbitrary cross-origin responses. */
'use strict';
importScripts('./precache-manifest.js');
const scope=self.registration.scope;
const prefix='tu-tu:'+encodeURIComponent(new URL(scope).pathname)+':';
const cacheName=prefix+self.TUTU_BUILD;
const dictionaryCache=prefix+'dictionary-'+self.TUTU_DICTIONARY_REV;
const fontCache=prefix+'fonts-v1';
const fontStylesheet='https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap';
function isFontRequest(url){return url.href===fontStylesheet||(url.origin==='https://fonts.gstatic.com'&&url.pathname.startsWith('/s/bevietnampro/'));}
async function warmFonts(){
  try{
    const cache=await caches.open(fontCache);
    let css=await cache.match(fontStylesheet);
    if(!css){css=await fetch(fontStylesheet,{signal:AbortSignal.timeout(10000)});if(!css.ok)return;await cache.put(fontStylesheet,css.clone());}
    const urls=[...new Set([...((await css.text()).matchAll(/url\((https:\/\/fonts\.gstatic\.com\/s\/bevietnampro\/[^)]+)\)/g))].map(m=>m[1]))];
    await Promise.all(urls.map(async url=>{if(await cache.match(url))return;const response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(response.ok)await cache.put(url,response);}));
  }catch{/* Online font access is optional; the system font remains readable. */}
}
const shell=self.TUTU_PRECACHE;
const allowed=new Set(shell.map(path=>new URL(path,scope).href));
const dictionaryURL=new URL('./data/dictionary.json.gz',scope).href;
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(shell)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(prefix)&&name!==cacheName&&name!==dictionaryCache&&name!==fontCache)await caches.delete(name);await self.clients.claim();})());
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='CACHE_FONTS')event.waitUntil(warmFonts());});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method==='GET'&&isFontRequest(url)){
    event.respondWith((async()=>{const cache=await caches.open(fontCache),saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok)try{await cache.put(request,response.clone());}catch{}return response;})());return;
  }
  if(request.method!=='GET'||url.origin!==new URL(scope).origin||!request.url.startsWith(scope))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{const cache=await caches.open(cacheName);const saved=await cache.match(new URL('./index.html',scope).href);return saved||fetch(request);})());return;
  }
  if(!allowed.has(url.href)&&url.href!==dictionaryURL)return;
  event.respondWith((async()=>{
    const cache=await caches.open(url.href===dictionaryURL?dictionaryCache:cacheName),saved=await cache.match(request);
    if(saved)return saved;
    const response=await fetch(request);
    if(response.ok){try{await cache.put(request,response.clone());}catch{/* Storage pressure must not block online use. */}}
    return response;
  })());
});
