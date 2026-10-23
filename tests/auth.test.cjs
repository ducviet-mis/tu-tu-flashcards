const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function auth(){const box={URL,URLSearchParams,atob};vm.runInNewContext(fs.readFileSync('assets/js/auth-service.js','utf8'),box);return box.TuTuAuth;}
test('guest mode stays available without Supabase configuration',()=>{
 const result=auth().create({},null,'https://tutuvn.vercel.app/#/login');assert.equal(result.enabled,false);
});
test('frontend rejects secret credentials before creating a connection',()=>{
 let calls=0;const sdk={createClient(){calls++;}};
 assert.throws(()=>auth().create({url:'https://demo.supabase.co',key:'sb_secret_test'},sdk,'https://app.test/'),/công khai/);assert.equal(calls,0);
});
test('redirect stays on the deployed app base and excludes routes and query strings',()=>{
 let options;const client={auth:{}};const result=auth().create({url:'https://demo.supabase.co',key:'sb_publishable_test'},{createClient(u,k,o){options=o;return client;}},'https://app.test/tu-tu/?x=1#/login');
 assert.equal(result.redirectUrl,'https://app.test/tu-tu/');assert.equal(result.client,client);assert.equal(options.auth.detectSessionInUrl,true);assert.equal(options.auth.persistSession,true);
});
test('recovery callbacks are distinguished from ordinary sign-in and link failures',()=>{
 const api=auth();assert.equal(api.callbackKind('https://app.test/#access_token=abc&type=recovery'),'recovery');assert.equal(api.callbackKind('https://app.test/#error=access_denied&error_code=otp_expired'),'error');assert.equal(api.callbackKind('https://app.test/#/login'),null);
});
test('authentication failures have useful Vietnamese messages',()=>{
 const api=auth();assert.match(api.errorMessage({code:'invalid_credentials'}),/mật khẩu/);assert.match(api.errorMessage({code:'email_not_confirmed'}),/xác nhận/);assert.match(api.errorMessage({code:'over_email_send_rate_limit'}),/thử lại/);assert.match(api.errorMessage(Error('Failed to fetch')),/kết nối/);
});

test('bundled official SDK signs in, restores the session and signs out through the real Auth adapter',async()=>{
 const box={URL,URLSearchParams,atob,btoa,setTimeout,clearTimeout,setInterval,clearInterval,console,Headers,Request,Response,AbortController,AbortSignal,WebSocket,crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(fs.readFileSync('assets/vendor/supabase-2.118.0.js','utf8'),box);assert.equal(typeof box.supabase.createClient,'function');
 const user={id:'11111111-1111-4111-8111-111111111111',email:'ban@example.com',app_metadata:{provider:'email'},user_metadata:{display_name:'Việt'}};
 const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,exp:Math.floor(Date.now()/1000)+3600},{}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.');
 const fetch=async url=>new Response(String(url).includes('/logout')?'':JSON.stringify({access_token:jwt,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user}),{status:200,headers:{'Content-Type':'application/json'}});
 const sdk={createClient:(url,key,options)=>box.supabase.createClient(url,key,{...options,global:{fetch}})};
 const connection=auth().create({url:'https://demo.supabase.co',key:'sb_publishable_test'},sdk,'https://app.test/');
 try{
  const login=await connection.client.auth.signInWithPassword({email:user.email,password:'test-password'});assert.equal(login.error,null);assert.equal(login.data.user.email,user.email);
  const restored=await connection.client.auth.getSession();assert.equal(restored.data.session.user.id,user.id);
  const logout=await connection.client.auth.signOut({scope:'local'});assert.equal(logout.error,null);assert.equal((await connection.client.auth.getSession()).data.session,null);
 }finally{await connection.client.auth.stopAutoRefresh();}
});
