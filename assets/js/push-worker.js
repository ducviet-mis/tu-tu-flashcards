/* Imported by the existing cache service worker; no install/fetch overrides. */
'use strict';
(()=>{
 const scope=self.registration.scope,review=new URL('./#/review',scope).href;
 function safeURL(value){try{const url=new URL(typeof value==='string'?value:review,scope),base=new URL(scope);if(url.origin===base.origin&&url.pathname.startsWith(base.pathname))return url.href;}catch{}return review;}
 self.addEventListener('push',event=>event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const title=typeof data.title==='string'?data.title.slice(0,80):'TỪ TỪ',body=typeof data.body==='string'?data.body.slice(0,250):'Đến giờ ôn từ rồi! Giữ chuỗi ngày học nào 🔥';
  await self.registration.showNotification(title,{body,icon:new URL('./assets/images/icon-192.png',scope).href,badge:new URL('./assets/images/icon-192.png',scope).href,tag:'daily-review',renotify:false,data:{url:safeURL(data.url)}});
 })()));
 self.addEventListener('notificationclick',event=>{
  event.notification.close();const target=safeURL(event.notification.data?.url);
  event.waitUntil((async()=>{
   const tabs=await self.clients.matchAll({type:'window',includeUncontrolled:true}),base=new URL(scope);
   for(const tab of tabs){let url;try{url=new URL(tab.url);}catch{continue;}if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))continue;
    try{if(!tab.navigate)continue;await tab.navigate(target);await tab.focus();return;}catch{/* Try another app tab or open a new one. */}
   }
   await self.clients.openWindow(target);
  })());
 });
})();
