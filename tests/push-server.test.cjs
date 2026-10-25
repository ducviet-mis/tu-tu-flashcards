const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const file='../server/push/service.cjs';let createService;
if(fs.existsSync(require('node:path').join(__dirname,file)))({createService}=require(file));
const ecdh=crypto.createECDH('prime256v1');ecdh.generateKeys();
const sub=(id='1')=>({endpoint:'https://fcm.googleapis.com/fcm/send/'+id,expirationTime:null,keys:{p256dh:ecdh.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,1).toString('base64url')}});
const token='t'.repeat(43),config={mode:'daily',cronSecret:'c'.repeat(48)};
function memoryStore(){const records=new Map(),claims=new Map();return {records,claims,async get(id){return records.get(id)||null;},async put(id,v){records.set(id,structuredClone(v));},async remove(id){records.delete(id);},async all(){return [...records.keys()];},async claim(key,value){if(claims.has(key))return false;claims.set(key,value);return true;},async release(key,value){if(claims.get(key)===value)claims.delete(key);},async limit(){return true;}};}
function setup({mode='daily',send=async()=>{}}={}){assert.ok(createService,'push server must exist');const store=memoryStore();let now=new Date('2026-10-26T13:25:00Z');const service=createService({store,send,config:{...config,mode},now:()=>now});return {service,store,setNow:v=>now=new Date(v)};}
const body=(id='1',extra={})=>({subscription:sub(id),token,time:'20:00',timeZone:'Asia/Ho_Chi_Minh',enabled:true,...extra});
test('Push subscription is device-owned, settings persist, and unsubscribe deletes it',async()=>{
 const {service,store}=setup();const saved=await service.subscribe(body());assert.equal(saved.enabled,true);assert.equal(store.records.size,1);
 await assert.rejects(()=>service.settings({endpoint:sub().endpoint,token:'x'.repeat(43),time:'20:00',timeZone:'Asia/Ho_Chi_Minh',enabled:false}),e=>e.status===403);
 await service.settings({endpoint:sub().endpoint,token,time:'20:00',timeZone:'Asia/Ho_Chi_Minh',enabled:false});assert.equal([...store.records.values()][0].enabled,false);
 await service.unsubscribe({endpoint:sub().endpoint,token});assert.equal(store.records.size,0);
});
test('Hobby enforces fixed time and flexible mode validates timezone and actual local due time',async()=>{
 const a=setup();await assert.rejects(()=>a.service.subscribe(body('1',{time:'09:00'})),e=>e.status===400);
 const calls=[],b=setup({mode:'flexible',send:async s=>calls.push(s.endpoint)});
 await assert.rejects(()=>b.service.subscribe(body('1',{timeZone:'not/a-zone'})),e=>e.status===400);
 await b.service.subscribe(body('1',{time:'09:30',timeZone:'America/New_York'}));b.setNow('2026-10-26T13:15:00Z');await b.service.cron();assert.equal(calls.length,0);
 b.setNow('2026-10-26T13:45:00Z');await b.service.cron();assert.equal(calls.length,1);
});
test('Concurrent cron jobs and retries send at most once per subscription/local day',async()=>{
 const calls=[],s=setup({send:async subscription=>calls.push(subscription.endpoint)});await s.service.subscribe(body());
 await Promise.all([s.service.cron(),s.service.cron()]);await s.service.cron();assert.equal(calls.length,1);
 s.setNow('2026-10-27T13:00:00Z');await s.service.cron();assert.equal(calls.length,2);
});
test('One failed push does not stop others, transient failure retries, and expired subscriptions are deleted',async()=>{
 let fail=true;const calls=[],s=setup({send:async subscription=>{calls.push(subscription.endpoint);if(subscription.endpoint.endsWith('/1'))throw {statusCode:410};if(subscription.endpoint.endsWith('/2')&&fail)throw {statusCode:503};}});
 for(const id of ['1','2','3'])await s.service.subscribe(body(id));const r=await s.service.cron();assert.equal(r.sent,1);assert.equal(r.expired,1);assert.equal(r.failed,1);assert.equal(s.store.records.size,2);
 fail=false;await s.service.cron();assert.equal(calls.filter(x=>x.endsWith('/2')).length,2);assert.equal(calls.filter(x=>x.endsWith('/3')).length,1);
});
test('Test push uses the server transport immediately and disable prevents subsequent cron sends',async()=>{
 const calls=[],s=setup({send:async(subscription,payload)=>calls.push(JSON.parse(payload))});await s.service.subscribe(body());await s.service.test({endpoint:sub().endpoint,token});assert.equal(calls[0].title,'TỪ TỪ');assert.equal(calls[0].url,'./#/review');
 await s.service.unsubscribe({endpoint:sub().endpoint,token});await s.service.cron();assert.equal(calls.length,1);
});
test('Push validation rejects SSRF URLs, invalid keys, oversized strings and malformed fields',async()=>{
 const {service}=setup();for(const endpoint of ['http://fcm.googleapis.com/a','https://127.0.0.1/a','https://fcm.googleapis.com.evil.test/a','https://user:pass@fcm.googleapis.com/a','https://fcm.googleapis.com:444/a'])await assert.rejects(()=>service.subscribe({...body(),subscription:{...sub(),endpoint}}),e=>e.status===400);
 for(const patch of [{enabled:'yes'},{time:'25:00'},{token:'short'},{subscription:{...sub(),keys:{auth:'a',p256dh:'b'}}}])await assert.rejects(()=>service.subscribe({...body(),...patch}),e=>e.status===400);
});
