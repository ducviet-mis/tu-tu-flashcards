const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function lib(){assert.ok(fs.existsSync('assets/js/account-sync.js'),'Account learning-data synchronization is missing');const box={crypto:require('node:crypto').webcrypto};vm.runInNewContext(fs.readFileSync('assets/js/account-sync.js','utf8'),box);return box.TuTuSync;}
const copy=x=>JSON.parse(JSON.stringify(x)),prefs={goal:10,rate:.85,autoSpeak:false,reverse:false,theme:'dark'};
const data=()=>({days:[],preferences:{...prefs},topics:{},history:[]});
const word=(id,en,extra={})=>({id,en,vi:'nghia '+en,remembered:false,...extra});
const withWords=(...words)=>({...data(),days:[{date:'2026-10-24',words}]});
function backend(){const users=new Map();return {users,client(user){return async(name,args={})=>{let row=users.get(user);if(!row){row={revision:0,data:data(),baseline:{},events:{}};users.set(user,row);}const result=()=>{const activity=copy(row.baseline);for(const e of Object.values(row.events)){const a=activity[e.date]||={reviewed:0,correct:0};a.reviewed++;a.correct+=Number(e.known);}return {revision:row.revision,data:copy(row.data),baseline:copy(row.baseline),activity,acknowledged:Object.keys(row.events)};};if(name==='tu_tu_tai_du_lieu')return {data:result(),error:null};assert.equal(name,'tu_tu_luu_du_lieu');if(args.p_revision!==row.revision)return {data:{conflict:true},error:null};row.data=copy(args.p_data);for(const [date,a] of Object.entries(args.p_baseline||{})){const old=row.baseline[date]||{reviewed:0,correct:0};row.baseline[date]={reviewed:Math.max(old.reviewed,a.reviewed),correct:Math.max(old.correct,a.correct)};}for(const e of args.p_events||[])row.events[e.id]??=copy(e);row.revision++;return {data:result(),error:null};};}};}
function device(api,rpc,storage=new Map(),applied=[]){const status=[];const controller=api.create({storage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i]??null,get length(){return storage.size;}},rpc,apply:s=>applied.push(copy(s)),onStatus:s=>status.push(s)});return {controller,storage,status,applied};}

test('Same account transfers 11 legacy reviews and saved words to a second device',async()=>{
 const api=lib(),db=backend(),a=device(api,db.client('A')),b=device(api,db.client('A'));
 a.controller.start('A',{data:withWords(word('apple','apple',{remembered:true,reviewLevel:1,nextReview:'2026-10-25'})),activity:{'2026-10-24':{reviewed:11,correct:8}}});await a.controller.flush();
 b.controller.start('A',{data:data(),activity:{}});await b.controller.flush();const s=b.controller.snapshot();assert.equal(s.activity['2026-10-24'].reviewed,11);assert.equal(s.data.days[0].words[0].remembered,true);assert.equal(s.data.days[0].words[0].nextReview,'2026-10-25');
});
test('Copied legacy totals are imported once, never doubled across devices',async()=>{
 const api=lib(),db=backend(),seed={data:data(),activity:{'2026-10-24':{reviewed:11,correct:7}}};for(let i=0;i<2;i++){const a=device(api,db.client('A'));a.controller.start('A',seed);await a.controller.flush();assert.equal(a.controller.snapshot().activity['2026-10-24'].reviewed,11);}
});
test('New reviews from two devices add together and response-loss retries do not double count',async()=>{
 const api=lib(),db=backend();let lost=true;const real=db.client('A'),a=device(api,async(n,p)=>{const r=await real(n,p);if(n==='tu_tu_luu_du_lieu'&&lost){lost=false;throw Error('network response lost');}return r;}),b=device(api,db.client('A'));
 a.controller.start('A');a.controller.recordReview({date:'2026-10-24',word:'apple',wordId:'apple',known:true,mode:'lat_the'});assert.equal(await a.controller.flush(),false);assert.equal(a.controller.snapshot().activity['2026-10-24'].reviewed,1);await a.controller.flush();
 b.controller.start('A');b.controller.recordReview({date:'2026-10-24',word:'pear',wordId:'pear',known:false,mode:'ghep_cap'});await b.controller.flush();await a.controller.flush();assert.deepEqual(copy(a.controller.snapshot().activity),{'2026-10-24':{reviewed:2,correct:1}});
});
test('Concurrent offline additions, settings fields and topic progress merge after revision conflict',async()=>{
 const api=lib(),db=backend(),a=device(api,db.client('A')),b=device(api,db.client('A'));a.controller.start('A');b.controller.start('A');await a.controller.flush();await b.controller.flush();
 const da=withWords(word('apple','apple'));da.preferences.goal=15;da.topics['food:tw-1']=true;a.controller.capture(da);
 const de=withWords(word('pear','pear'));de.preferences.rate=1.2;de.topics['home:tw-2']=true;b.controller.capture(de);
 await Promise.all([a.controller.flush(),b.controller.flush()]);await a.controller.flush();const s=a.controller.snapshot().data;assert.deepEqual(Array.from(s.days[0].words,w=>w.en).sort(),['apple','pear']);assert.equal(s.preferences.goal,15);assert.equal(s.preferences.rate,1.2);assert.equal(s.topics['food:tw-1'],true);assert.equal(s.topics['home:tw-2'],true);
});
test('An unchanged stale device cannot resurrect a deleted word or reset remembered=false',async()=>{
 const api=lib(),db=backend(),a=device(api,db.client('A')),b=device(api,db.client('A')),initial=withWords(word('apple','apple'));initial.topics['food:tw-1']=true;
 a.controller.start('A',{data:initial});await a.controller.flush();b.controller.start('A');await b.controller.flush();
 const da=data();da.topics['food:tw-1']=false;a.controller.capture(da);await a.controller.flush();const old=b.controller.snapshot().data;old.preferences.goal=20;b.controller.capture(old);await b.controller.flush();assert.equal(b.controller.snapshot().data.days.flatMap(d=>d.words).length,0);assert.equal(b.controller.snapshot().data.topics['food:tw-1'],false);
});
test('Pending changes and reviews survive logout, reload and reconnect under their original account',async()=>{
 const api=lib(),db=backend(),store=new Map(),a=device(api,async()=>{throw Error('offline');},store);a.controller.start('A');a.controller.capture(withWords(word('a','apple')));a.controller.recordReview({date:'2026-10-24',word:'apple',known:true,mode:'lat_the'});await a.controller.flush();a.controller.stop();a.controller.start('B');assert.equal(a.controller.snapshot().data.days.length,0);a.controller.stop();
 const again=device(api,db.client('A'),store);again.controller.start('A');await again.controller.flush();assert.equal(again.controller.snapshot().data.days[0].words[0].en,'apple');assert.equal(again.controller.snapshot().activity['2026-10-24'].reviewed,1);
});
test('Late responses for an old account never overwrite the current account or its cache',async()=>{
 const api=lib(),db=backend();let release;const real=db.client('A'),applied=[],a=device(api,async(n,p)=>{const r=await real(n,p);if(n==='tu_tu_tai_du_lieu')await new Promise(resolve=>release=resolve);return r;},new Map(),applied);
 a.controller.start('A',{data:withWords(word('a','apple'))});const pending=a.controller.flush();await new Promise(setImmediate);a.controller.start('B',{data:withWords(word('b','banana'))});release();await pending;assert.equal(a.controller.snapshot().data.days[0].words[0].en,'banana');assert.ok(!applied.some(s=>s.user==='A'));assert.equal(a.controller.snapshot().user,'B');
});
test('Edits and reviews made while a save is in flight remain queued and get uploaded',async()=>{
 const api=lib(),db=backend();let release,hold=true;const real=db.client('A'),a=device(api,async(n,p)=>{const r=await real(n,p);if(n==='tu_tu_luu_du_lieu'&&hold){hold=false;await new Promise(resolve=>release=resolve);}return r;});a.controller.start('A');a.controller.capture(withWords(word('a','apple')));const pending=a.controller.flush();while(!release)await new Promise(setImmediate);a.controller.capture(withWords(word('a','apple'),word('b','banana')));a.controller.recordReview({date:'2026-10-24',word:'banana',known:true,mode:'lat_the'});release();await pending;await a.controller.flush();const b=device(api,db.client('A'));b.controller.start('A');await b.controller.flush();assert.equal(b.controller.snapshot().data.days[0].words.length,2);assert.equal(b.controller.snapshot().activity['2026-10-24'].reviewed,1);
});
test('Schema errors retain local progress and expose setup status, never fake successful cloud save',async()=>{
 const api=lib(),a=device(api,async()=>({data:null,error:{code:'PGRST202',message:'function missing'}}));a.controller.start('A',{data:withWords(word('a','apple'))});assert.equal(await a.controller.flush(),false);assert.equal(a.controller.snapshot().data.days[0].words[0].en,'apple');assert.equal(a.status.at(-1).kind,'setup');
});
test('Malformed cloud responses cannot clear a valid local notebook',async()=>{
 const api=lib(),a=device(api,async()=>({data:{revision:1,data:{days:'bad'}},error:null}));a.controller.start('A',{data:withWords(word('a','apple'))});assert.equal(await a.controller.flush(),false);assert.equal(a.controller.snapshot().data.days[0].words[0].en,'apple');assert.notEqual(a.status.at(-1).kind,'saved');
});
test('A failed topic review remains an explicit false when another device marked the word known',async()=>{
 const api=lib(),db=backend(),a=device(api,db.client('A')),b=device(api,db.client('A'));
 const initial=data();initial.topics['food:tw-1']=false;a.controller.start('A',{data:initial});await a.controller.flush();b.controller.start('A');await b.controller.flush();
 const da=a.controller.snapshot().data;da.topics['food:tw-1']=true;a.controller.capture(da);await a.controller.flush();
 b.controller.recordReview({date:'2026-10-24',word:'apple',wordId:'tw-1',known:false,mode:'lat_the',topic:'food'});await b.controller.flush();assert.equal(b.controller.snapshot().data.topics['food:tw-1'],false);
});
test('A failed personal review is not changed to known by field-wise conflict merging',async()=>{
 const api=lib(),db=backend(),a=device(api,db.client('A')),b=device(api,db.client('A'));a.controller.start('A',{data:withWords(word('a','apple',{reviewCount:0,reviewLevel:0,nextReview:'2026-10-24'}))});await a.controller.flush();b.controller.start('A');await b.controller.flush();
 const da=a.controller.snapshot().data;Object.assign(da.days[0].words[0],{remembered:true,reviewCount:1,reviewLevel:1,nextReview:'2026-10-25'});a.controller.capture(da);await a.controller.flush();
 const de=b.controller.snapshot().data;Object.assign(de.days[0].words[0],{remembered:false,reviewCount:1,reviewLevel:0,nextReview:'2026-10-24'});b.controller.capture(de);b.controller.recordReview({date:'2026-10-24',word:'apple',wordId:'a',known:false,mode:'lat_the'});await b.controller.flush();assert.equal(b.controller.snapshot().data.days[0].words[0].remembered,false);assert.equal(b.controller.snapshot().data.days[0].words[0].reviewLevel,0);
});

test("Two offline tabs cannot overwrite each other's durable pending work before reload",async()=>{
 const api=lib(),db=backend(),store=new Map(),a=device(api,db.client('A'),store),b=device(api,db.client('A'),store);a.controller.start('A');b.controller.start('A');
 a.controller.capture(withWords(word('a','apple')));a.controller.recordReview({date:'2026-10-24',word:'apple',known:true,mode:'lat_the'});
 b.controller.capture(withWords(word('b','banana')));b.controller.recordReview({date:'2026-10-24',word:'banana',known:false,mode:'lat_the'});a.controller.stop();b.controller.stop();
 const restored=device(api,db.client('A'),store);restored.controller.start('A');await restored.controller.flush();assert.equal(restored.controller.snapshot().data.days[0].words.length,2);assert.equal(restored.controller.snapshot().activity['2026-10-24'].reviewed,2);
});

test('Retrying an acknowledged review never rolls back a later review from another device',async()=>{
 const api=lib(),db=backend(),real=db.client('A');let lose=false;
 const a=device(api,async(n,p)=>{const reply=await real(n,p);if(n==='tu_tu_luu_du_lieu'&&lose){lose=false;throw Error('lost response');}return reply;});
 const initial=withWords(word('a','apple',{reviewCount:0,reviewLevel:0,nextReview:'2026-10-24'}));initial.topics['food:tw-1']=true;
 a.controller.start('A',{data:initial});await a.controller.flush();let local=a.controller.snapshot().data;local.days[0].words[0].reviewCount=1;a.controller.capture(local);a.controller.recordReview({date:'2026-10-24',wordId:'a',word:'apple',known:false,mode:'lat_the'});lose=true;await a.controller.flush();
 const b=device(api,db.client('A'));b.controller.start('A');await b.controller.flush();local=b.controller.snapshot().data;Object.assign(local.days[0].words[0],{remembered:true,reviewCount:2,reviewLevel:1,nextReview:'2026-10-25'});b.controller.capture(local);b.controller.recordReview({date:'2026-10-24',wordId:'a',word:'apple',known:true,mode:'lat_the'});await b.controller.flush();
 await a.controller.flush();const w=a.controller.snapshot().data.days[0].words[0];assert.equal(w.remembered,true);assert.equal(w.reviewCount,2);assert.equal(w.nextReview,'2026-10-25');assert.equal(a.controller.snapshot().activity['2026-10-24'].reviewed,2);
 local=a.controller.snapshot().data;local.topics['food:tw-1']=false;a.controller.capture(local);a.controller.recordReview({date:'2026-10-24',wordId:'tw-1',word:'apple',topic:'food',known:false,mode:'lat_the'});lose=true;await a.controller.flush();
 await b.controller.flush();local=b.controller.snapshot().data;local.topics['food:tw-1']=true;b.controller.capture(local);b.controller.recordReview({date:'2026-10-24',wordId:'tw-1',word:'apple',topic:'food',known:true,mode:'lat_the'});await b.controller.flush();await a.controller.flush();assert.equal(a.controller.snapshot().data.topics['food:tw-1'],true);
});
test('A pending journal removed by another tab during enumeration does not break account startup',()=>{
 const api=lib(),db=backend(),store=new Map(),a=device(api,db.client('A'),store);a.controller.start('A',{data:withWords(word('a','apple'))});a.controller.stop();
 const controller=api.create({storage:{getItem:k=>{if(k.startsWith('tutu.account.pending.')){store.delete(k);return null;}return store.get(k)||null;},setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size;}},rpc:db.client('A')});
 assert.doesNotThrow(()=>controller.start('A'));assert.equal(controller.snapshot().data.days[0].words[0].en,'apple');
});


test('Topic schedules survive a fresh device and explicit failed reviews win conflicts as whole records',async()=>{
 const api=lib(),db=backend(),a=device(api,db.client('A')),b=device(api,db.client('A'));const seed=data();
 seed.topics['food:tw-1']={remembered:true,reviewLevel:2,reviewCount:2,lastReviewed:'2026-10-25',nextReview:'2026-10-28'};
 a.controller.start('A',{data:seed});assert.equal(await a.controller.flush(),true);b.controller.start('A');await b.controller.flush();assert.equal(b.controller.snapshot().data.topics['food:tw-1'].nextReview,'2026-10-28');
 const remote=a.controller.snapshot().data;remote.topics['food:tw-1']={remembered:true,reviewLevel:3,reviewCount:3,lastReviewed:'2026-10-28',nextReview:'2026-11-04'};a.controller.capture(remote);await a.controller.flush();
 const local=b.controller.snapshot().data;local.topics['food:tw-1']={remembered:false,reviewLevel:0,reviewCount:3,lastReviewed:'2026-10-28',nextReview:'2026-10-28'};b.controller.capture(local);b.controller.recordReview({date:'2026-10-28',wordId:'tw-1',word:'apple',topic:'food',known:false,mode:'lat_the'});await b.controller.flush();
 const saved=b.controller.snapshot().data.topics['food:tw-1'];assert.equal(saved.remembered,false);assert.equal(saved.reviewLevel,0);assert.equal(saved.nextReview,'2026-10-28');assert.equal(b.controller.snapshot().data.days.length,0);
});

test('Acknowledged topic review replay cannot restore an older schedule over a later device',async()=>{
 const api=lib(),db=backend(),real=db.client('A');let lose=false;
 const a=device(api,async(n,p)=>{const r=await real(n,p);if(n==='tu_tu_luu_du_lieu'&&lose){lose=false;throw Error('lost response');}return r;});a.controller.start('A');await a.controller.flush();
 let d=a.controller.snapshot().data;d.topics['food:tw-1']={remembered:false,reviewLevel:0,reviewCount:1,lastReviewed:'2026-10-24',nextReview:'2026-10-24'};a.controller.capture(d);a.controller.recordReview({date:'2026-10-24',wordId:'tw-1',word:'apple',topic:'food',known:false,mode:'lat_the'});lose=true;assert.equal(await a.controller.flush(),false);
 const b=device(api,real);b.controller.start('A');await b.controller.flush();d=b.controller.snapshot().data;d.topics['food:tw-1']={remembered:true,reviewLevel:1,reviewCount:2,lastReviewed:'2026-10-24',nextReview:'2026-10-25'};b.controller.capture(d);b.controller.recordReview({date:'2026-10-24',wordId:'tw-1',word:'apple',topic:'food',known:true,mode:'lat_the'});await b.controller.flush();await a.controller.flush();
 assert.equal(a.controller.snapshot().data.topics['food:tw-1'].nextReview,'2026-10-25');assert.equal(a.controller.snapshot().data.topics['food:tw-1'].remembered,true);
});
