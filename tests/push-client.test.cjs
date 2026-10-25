const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let Push;const file='assets/js/push-service.js';if(fs.existsSync(file)){const box={URL,Uint8Array,atob,btoa,AbortSignal,setTimeout,clearTimeout};vm.runInNewContext(fs.readFileSync(file,'utf8'),box);Push=box.TuTuPush;}
function environment({permission='default',deny=false,ios=false,standalone=false}={}){
 assert.ok(Push,'client push service must exist');const map=new Map(),calls=[];let current=null,offline=false,prompts=0,blockedStorage=false,unsubscribed=0,randomCounter=2,unsubscribeFails=false;
 const notification={get permission(){return permission;},async requestPermission(){prompts++;permission=deny?'denied':'granted';return permission;}};
 const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',toJSON(){return {endpoint:this.endpoint,keys:{auth:'x',p256dh:'y'}};},async unsubscribe(){unsubscribed++;if(unsubscribeFails)throw Error('browser unsubscribe failed');current=null;return true;}};
 const registration={pushManager:{async getSubscription(){return current;},async subscribe(){current=subscription;return subscription;}}};
 const makeClient=()=>Push.create({config:{enabled:true,publicKey:'B'.repeat(87),mode:'daily'},navigator:{userAgent:ios?'iPhone':'Chrome',standalone,serviceWorker:{ready:Promise.resolve(registration)}},window:{PushManager:function(){},Notification:notification,isSecureContext:true,matchMedia:()=>({matches:standalone})},storage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>{if(blockedStorage)throw Error('storage blocked');map.set(k,v);}},randomBytes:()=>new Uint8Array(32).fill(randomCounter++),fetch:async(url,options)=>{if(offline)throw Error('offline');calls.push({url,body:JSON.parse(options.body)});return {ok:true,status:200,json:async()=>({sent:true})};}});
 return {client:makeClient(),recreate:makeClient,map,calls,get prompts(){return prompts;},get unsubscribed(){return unsubscribed;},get current(){return current;},setOffline:v=>offline=v,setBlockedStorage:v=>blockedStorage=v,setUnsubscribeFailure:v=>unsubscribeFails=v};
}
test('Enabling requests permission only by explicit action, saves device subscription and tests through server',async()=>{
 const e=environment();await e.client.refresh();assert.equal(e.prompts,0);await e.client.enable();assert.equal(e.prompts,1);assert.equal(e.client.view().enabled,true);assert.ok(e.calls.some(x=>x.url.endsWith('/subscribe')));await e.client.test();assert.ok(e.calls.at(-1).url.endsWith('/test'));assert.equal(e.calls.at(-1).body.token.length,43);
});
test('Denied permission and uninstalled iPhone show actionable states without subscribing',async()=>{
 const e=environment({deny:true});await assert.rejects(()=>e.client.enable());assert.equal(e.client.view().status,'blocked');assert.equal(e.calls.length,0);
 const ios=environment({ios:true});assert.equal(ios.client.view().status,'install');await assert.rejects(()=>ios.client.enable());assert.equal(ios.prompts,0);
});
test('Turning off deletes server subscription; offline deletion is persisted and retried',async()=>{
 const e=environment();await e.client.enable();e.setOffline(true);await e.client.disable();assert.equal(e.current,null);assert.equal(e.client.view().enabled,false);assert.equal(e.client.view().pendingDelete,true);
 e.setOffline(false);await e.client.refresh();assert.equal(e.client.view().pendingDelete,false);assert.ok(e.calls.some(x=>x.url.endsWith('/unsubscribe')));
});

test('Failed local persistence when disabling never pretends an active subscription is off',async()=>{
 const e=environment();await e.client.enable();e.setBlockedStorage(true);await assert.rejects(()=>e.client.disable());assert.equal(e.client.view().enabled,true);assert.ok(e.current);
});

test('Lost local capability rotates a surviving browser subscription instead of claiming an unknown endpoint',async()=>{
 const e=environment();await e.client.enable();e.map.clear();const fresh=e.recreate();await fresh.enable();assert.equal(e.unsubscribed,1);
});
test('Late refresh request cannot overwrite a newer reminder time on the server',async()=>{
 assert.ok(Push);let token='t'.repeat(43),saved={token,enabled:true,time:'20:00',timeZone:'Asia/Ho_Chi_Minh',endpoint:'https://fcm.googleapis.com/fcm/send/1',pending:[]},serverTime='20:00',release,entered;
 const first=new Promise(resolve=>entered=resolve);let n=0;
 const c=Push.create({config:{enabled:true,publicKey:'B'.repeat(87),mode:'flexible'},navigator:{serviceWorker:{ready:Promise.resolve({pushManager:{getSubscription:async()=>({endpoint:saved.endpoint})}})}},window:{PushManager:function(){},Notification:{permission:'granted'},isSecureContext:true},storage:{getItem:()=>JSON.stringify(saved),setItem:(k,v)=>saved=JSON.parse(v)},fetch:async(url,options)=>{const body=JSON.parse(options.body);if(++n===1){entered();await new Promise(resolve=>release=resolve);}serverTime=body.time;return {ok:true,json:async()=>({})};}});
 const refresh=c.refresh();await first;const edit=c.settings('21:00');await new Promise(setImmediate);release();await Promise.all([refresh,edit]);assert.equal(serverTime,'21:00');assert.equal(c.view().time,'21:00');
});

test('A blocked localStorage getter does not break push feature initialization',()=>{
 const box={};vm.createContext(box);vm.runInContext("Object.defineProperty(globalThis,'localStorage',{get(){throw Error('SecurityError');}});"+fs.readFileSync('assets/js/push-service.js','utf8'),box);assert.doesNotThrow(()=>box.TuTuPush.create({config:{enabled:false}}));
});
test('Browser unsubscribe failure still deletes server registration, and double failure is not reported off',async()=>{
 const e=environment();await e.client.enable();e.setUnsubscribeFailure(true);await e.client.disable();assert.ok(e.calls.some(x=>x.url.endsWith('/unsubscribe')));assert.equal(e.client.view().enabled,false);
 const both=environment();await both.client.enable();both.setOffline(true);both.setUnsubscribeFailure(true);await assert.rejects(()=>both.client.disable());assert.equal(both.client.view().enabled,true);assert.equal(both.client.view().status,'pending-disable');
});
