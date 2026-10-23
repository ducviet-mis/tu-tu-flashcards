const test=require('node:test'),vm=require('node:vm');
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
test('Account RPCs execute in PostgreSQL with transactional version checks, idempotent reviews and per-user isolation',async t=>{
 const db=new PGlite(),root=path.resolve(__dirname,'..');
 t.after(()=>db.close());
 await db.exec("create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated;");
 await db.exec(fs.readFileSync(path.join(root,'supabase/tu_tu_supabase.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/dong_bo_tai_khoan.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/dong_bo_tai_khoan.sql'),'utf8'));

 const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
 await db.query('insert into auth.users(id) values($1),($2)',[A,B]);
 async function rpc(user,name,args={}){return db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);let result;if(name==='tu_tu_tai_du_lieu')result=await tx.query('select public.tu_tu_tai_du_lieu($1,$2::uuid[],$3::uuid) as value',[args.p_revision??null,args.p_event_ids||[],args.p_nguoi_dung_id??(user||null)]);else result=await tx.query('select public.tu_tu_luu_du_lieu($1,$2::jsonb,$3::jsonb,$4::jsonb,$5::uuid) as value',[args.p_revision,JSON.stringify(args.p_data),JSON.stringify(args.p_baseline||{}),JSON.stringify(args.p_events||[]),args.p_nguoi_dung_id??(user||null)]);return result.rows[0].value;});}
 const prefs={goal:17,rate:1,autoSpeak:false,reverse:false,theme:'light'},word={id:'w-a',en:'apple',vi:'quả táo',example:'An apple.',exampleVi:'Một quả táo.',remembered:true,reviewLevel:1,reviewCount:2,nextReview:'2026-10-25',topic:'Ăn uống',dictionary:{source:'kaikki',word:'apple',senseId:'kk-a',language:'vi',meaningLanguage:'vi',ipa:'/apple/',sourceUrl:'https://vi.wiktionary.org/wiki/apple'},synonyms:['fruit']};
 const data={days:[{date:'2026-10-24',words:[word]}],preferences:prefs,topics:{'food:tw-1':true},history:['hello']};
 const first=await rpc(A,'tu_tu_luu_du_lieu',{p_revision:0,p_data:data,p_baseline:{'2026-10-24':{reviewed:11,correct:8}}});
 assert.equal(first.revision,1);assert.equal(first.activity['2026-10-24'].reviewed,11);assert.equal(first.data.days[0].words[0].topic,'Ăn uống');assert.equal(first.data.preferences.goal,17);assert.equal(first.data.topics['food:tw-1'],true);
 const mobile=await rpc(A,'tu_tu_tai_du_lieu');assert.equal(mobile.activity['2026-10-24'].reviewed,11);assert.equal(mobile.data.days[0].words[0].dictionary.senseId,'kk-a');
 const event={id:'33333333-3333-4333-8333-333333333333',date:'2026-10-24',known:true,mode:'lat_the',word:'apple',wordId:'w-a',topic:null,at:'2026-10-24T01:00:00Z'};
 let now=await rpc(A,'tu_tu_luu_du_lieu',{p_revision:mobile.revision,p_data:mobile.data,p_events:[event]});assert.equal(now.activity['2026-10-24'].reviewed,12);
 now=await rpc(A,'tu_tu_luu_du_lieu',{p_revision:now.revision,p_data:now.data,p_events:[event]});assert.equal(now.activity['2026-10-24'].reviewed,12);
 assert.deepEqual(await rpc(A,'tu_tu_luu_du_lieu',{p_revision:0,p_data:data}),{conflict:true});
 const small=await rpc(A,'tu_tu_tai_du_lieu',{p_revision:now.revision,p_event_ids:[event.id]});assert.equal(small.unchanged,true);assert.equal(small.data,undefined);assert.deepEqual(small.acknowledged,[event.id]);
 await assert.rejects(()=>rpc(A,'tu_tu_luu_du_lieu',{p_revision:now.revision,p_data:data,p_nguoi_dung_id:B}),/AUTH_ACCOUNT_CHANGED/);
 assert.equal((await rpc(B,'tu_tu_tai_du_lieu')).data.days.length,0);
 await db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);assert.equal((await tx.query('select * from public.tu_vung')).rows.length,0);});
 await assert.rejects(()=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[B]);await tx.query("insert into public.so_tu(nguoi_dung_id,ngay_so) values($1,'2026-10-24')",[B]);}),/permission denied/);
 await assert.rejects(()=>db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query('select public.tu_tu_tai_du_lieu()');}),/permission denied/);
 await assert.rejects(()=>rpc('','tu_tu_tai_du_lieu'),/AUTH_REQUIRED/);
 const bad=JSON.parse(JSON.stringify(now.data));bad.days[0].words[0].vi='';await assert.rejects(()=>rpc(A,'tu_tu_luu_du_lieu',{p_revision:now.revision,p_data:bad}),/check constraint/);assert.equal((await rpc(A,'tu_tu_tai_du_lieu')).revision,now.revision);
 // Exercise the actual client normalizer/merge against SQL serialization, not a fake database.
 const box={crypto:require('node:crypto').webcrypto};vm.createContext(box);
 for(const file of ['review-engine.js','core.js','account-sync.js'])vm.runInContext(fs.readFileSync(path.join(root,'assets/js',file),'utf8'),box);
 function device(user=A){const map=new Map();return box.TuTuSync.create({storage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),key:i=>[...map.keys()][i]??null,get length(){return map.size;}},rpc:async(name,p)=>({data:await rpc(user,name,p),error:null})});}
 const desktop=device(),mobileClient=device();desktop.start(A);await desktop.flush();mobileClient.start(A);await mobileClient.flush();assert.equal(mobileClient.snapshot().activity['2026-10-24'].reviewed,12);
 desktop.recordReview({date:'2026-10-24',known:false,word:'apple',wordId:'tw-1',topic:'food',mode:'lat_the'});assert.equal(await desktop.flush(),true);await mobileClient.flush();assert.equal(mobileClient.snapshot().data.topics['food:tw-1'],false);assert.equal(mobileClient.snapshot().activity['2026-10-24'].reviewed,13);
 const settled=await rpc(A,'tu_tu_tai_du_lieu');await mobileClient.flush();assert.equal((await rpc(A,'tu_tu_tai_du_lieu')).revision,settled.revision,'Idle polling must not keep writing the whole snapshot');now=await rpc(A,'tu_tu_tai_du_lieu');
 const C='44444444-4444-4444-8444-444444444444';await db.query('insert into auth.users(id) values($1)',[C]);
 const c1=device(C),c2=device(C),fresh=JSON.parse(JSON.stringify(data));Object.assign(fresh.days[0].words[0],{remembered:false,reviewCount:0,reviewLevel:0,nextReview:'2026-10-24'});
 c1.start(C,{data:fresh});await c1.flush();c2.start(C);await c2.flush();
 for(const client of [c1,c2]){const state=client.snapshot().data;box.ReviewEngine.grade(state.days[0].words[0],true,'2026-10-24');client.capture(state);client.recordReview({date:'2026-10-24',known:true,word:'apple',wordId:'w-a',mode:'lat_the'});}
 await Promise.all([c1.flush(),c2.flush()]);const counted=await rpc(C,'tu_tu_tai_du_lieu');assert.equal(counted.activity['2026-10-24'].reviewed,2);assert.equal(counted.data.days[0].words[0].reviewCount,2,'Two actual reviews must also count twice on the individual word');
 const removed={...now.data,days:[]};now=await rpc(A,'tu_tu_luu_du_lieu',{p_revision:now.revision,p_data:removed});assert.equal(now.activity['2026-10-24'].reviewed,13);assert.equal(now.data.days.length,0);
 assert.equal((await db.query('select tu_vung_id from public.lich_su_on_tap')).rows[0].tu_vung_id,null);

});
