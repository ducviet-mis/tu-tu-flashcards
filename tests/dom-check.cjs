// Test harness mô phỏng DOM tối thiểu. Không thay cho QA trình duyệt hay đo bố cục.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),test=require('node:test');
const html=require('./load-app.cjs')();
const decode=s=>String(s).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&#10;/g,'\n');
class El{
 constructor(tag,doc,attrs={}){this.tagName=tag.toUpperCase();this.doc=doc;this.attrs=attrs;this.children=[];this.parentElement=null;this.events={};this._text='';this.value=attrs.value||'';this.disabled='disabled'in attrs;this.hidden='hidden'in attrs;this.checked='checked'in attrs;this.open=false;this.type=attrs.type||'';this.files=[];}
 get dataset(){return Object.fromEntries(Object.entries(this.attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,a)=>a.toUpperCase()),v]));}
 get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
 get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
 get classList(){return{contains:x=>this.className.split(' ').includes(x),toggle:(x,value)=>{const set=new Set(this.className.split(' ').filter(Boolean));if(value===undefined)value=!set.has(x);value?set.add(x):set.delete(x);this.className=[...set].join(' ');},add:x=>{this.className+=' '+x;},remove:x=>{this.className=this.className.split(' ').filter(s=>s!==x).join(' ');}};}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 get isConnected(){let el=this;while(el){if(el===this.doc.body)return true;el=el.parentElement;}return false;}
 append(...nodes){for(const node of nodes){if(typeof node==='string'){this._text+=node;continue;}node.parentElement=this;this.children.push(node);}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
 set innerHTML(value){this.children.forEach(c=>c.parentElement=null);this.children=[];this._text='';this._html=value;parse(value,this);}
 get innerHTML(){return this._html||'';}set textContent(t){this.children=[];this._text=String(t);}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
 matches(selector){return selector.split(',').some(part=>{const s=part.trim();if(s.includes(' ')&&!s.includes('['))return false;const tag=s.match(/^[a-z]+/i)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;const id=s.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;const cls=[...s.matchAll(/\.([\w-]+)/g)].map(m=>m[1]);if(cls.some(c=>!this.classList.contains(c)))return false;for(const m of s.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)){if(!(m[1]in this.attrs)||m[2]!==undefined&&this.attrs[m[1]]!==m[2])return false;}if(s.includes(':checked')&&!this.checked)return false;if(s.includes(':disabled')&&!this.disabled)return false;return true;});}
 querySelectorAll(s){const out=[];const walk=n=>{for(const c of n.children){if(c.matches(s))out.push(c);walk(c);}};walk(this);return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(s){let n=this;while(n){if(n.matches(s))return n;n=n.parentElement;}return null;}
 focus(){this.doc.activeElement=this;}
 addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
 dispatchEvent(e){e.target??=this;e.preventDefault??=()=>{e.defaultPrevented=true;};for(const fn of this.events[e.type]||[])fn(e);if(e.bubbles!==false){if(this.parentElement)this.parentElement.dispatchEvent(e);else if(this!==this.doc.body)this.doc.body.dispatchEvent(e);}}
 click(){if(this.disabled)return;this.focus();this.onclick?.();this.dispatchEvent({type:'click',target:this});if(this.tagName==='A'&&this.href?.startsWith('blob:'))this.doc.downloads.push({name:this.download,blob:this.doc.blobs.get(this.href)});}
 showModal(){this.open=true;(this.querySelector('button')||this).focus();}close(){this.open=false;this.dispatchEvent({type:'close',bubbles:false});}
}
function parse(markup,parent){const stack=[parent];let skipping=false;for(const m of markup.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/g)){const token=m[0];if(token.startsWith('<!--')||token.startsWith('<!'))continue;if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)[1],attrs={};for(const a of token.slice(tag.length+1,-1).matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[a[1]]=decode(a[2]??a[3]??a[4]??'');const el=new El(tag,parent.doc,attrs);stack.at(-1).append(el);if(!/^(input|link|meta|br|hr|img|source|path)$/i.test(tag)&&!token.endsWith('/>'))stack.push(el);}else stack.at(-1)._text+=decode(token);}}
function environment({map=new Map(),blocked=false,hash='#/',bankRows=null,speech=false,lexicon=false}={}){
 const doc={activeElement:null,downloads:[],blobs:new Map()};doc.body=new El('body',doc);doc.documentElement=new El('html',doc);doc.querySelector=s=>doc.body.querySelector(s);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);doc.createElement=s=>new El(s,doc);doc.addEventListener=(...args)=>doc.body.addEventListener(...args);
 parse(html.replace(/<style>[\s\S]*?<\/style>/g,'').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''),doc.body);
 if(bankRows){const node=new El('script',doc,{id:'dictionary-data'});node.textContent=require('node:zlib').gzipSync(JSON.stringify({version:1,count:bankRows.length,commonCount:bankRows.filter(r=>r[3]).length,entries:bankRows})).toString('base64');doc.body.append(node);}
 const events={},timers=[];let currentHash=hash;
 const location={get hash(){return currentHash;},set hash(v){currentHash=v;for(const fn of events.hashchange||[])fn();}};
 const storage={getItem:k=>{if(blocked)throw Error('blocked');return map.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');map.set(k,v);}};
 const box={document:doc,location,history:{replaceState:(s,t,v)=>{currentHash=v;}},localStorage:storage,crypto:require('node:crypto').webcrypto,URL:class extends URL{static createObjectURL(b){const u='blob:'+doc.blobs.size;doc.blobs.set(u,b);return u;}static revokeObjectURL(){}},URLSearchParams,AbortSignal,Blob,Date,Set,Map,console,Uint8Array,atob,navigator:{},setTimeout:(fn,ms)=>{const id={fn,ms};timers.push(id);return id;},clearTimeout:id=>{if(id)id.cancelled=true;},setInterval:(fn,ms)=>({fn,ms}),clearInterval:()=>{},requestAnimationFrame:fn=>fn(),addEventListener:(n,fn)=>(events[n]??=[]).push(fn),fetch:async(url)=>{if(lexicon&&/^\.\/data\/wordnet(?:\/|\-vi)/.test(String(url)))return new Response(fs.readFileSync(String(url)));if(bankRows&&String(url).includes('data/dictionary.json.gz'))return new Response(require('node:zlib').gzipSync(JSON.stringify({version:1,count:bankRows.length,commonCount:bankRows.filter(r=>r[3]).length,entries:bankRows})));throw Error('No real network in harness');}};
 const spoken=[];if(speech){box.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};box.speechSynthesis={cancel(){},getVoices:()=>[{lang:'en-US'}],speak:utterance=>spoken.push(utterance)};}box.performance=performance;box.Response=Response;box.DecompressionStream=DecompressionStream;box.window=box;vm.createContext(box);const scripts=[...html.matchAll(/<script id="(?:core|application)">([\s\S]*?)<\/script>/g)].map(m=>m[1]);vm.runInContext(scripts[0],box);
 const src=scripts[1].replace('/* QA_EXPORT_POINT */',`globalThis.QA={get days(){return days;},get session(){return session;},route,renderBase,startStudy,selectCell,answer,flipCard,closeStudy,bankOpen,loadBank,get bankData(){return bankData;},bankState,bankSave,get bankRelationsPending(){return bankRelationsPending;},renderReview,renderProgress,renderSettings,quickAddOpen,startGlobalReview,get activity(){return activity;},get preferences(){return preferences;},initializeAccount,showPwaUpdate,get accountUser(){return accountUser;}};`);vm.runInContext(src,box);
 return{box,doc,spoken,q:s=>doc.querySelector(s),qa:box.QA,map,click:s=>{const e=doc.querySelector(s);assert.ok(e,'Missing element '+s);e.click();},flush:ms=>{for(const t of timers.splice(0))if(!t.cancelled&&t.ms<=ms)t.fn();},key:code=>doc.body.dispatchEvent({type:'keydown',code,target:doc.activeElement||doc.body})};
}
function demo(){const e=environment();e.click('[data-action="sample"]');e.box.location.hash='#/day/'+e.qa.days[0].date;return e;}

async function accountEnvironment(handlers={},hash='#/login'){
 const e=environment({hash});let callback;
 const auth={onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}};},getSession:async()=>({data:{session:null},error:null}),signInWithPassword:async()=>({data:{user:{id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}}},error:null}),signUp:async()=>({data:{session:null,user:null},error:null}),signOut:async()=>{callback('SIGNED_OUT',null);return {error:null};},...handlers};
 e.box.TUTU_SUPABASE={url:'https://demo.supabase.co',key:'sb_publishable_test'};e.box.supabase={createClient:()=>({auth})};await e.qa.initializeAccount();e.authEvent=(event,session)=>callback(event,session);return e;
}
test('Login and registration routes preserve guest vocabulary and the existing rounded navigation',()=>{
 const e=demo(),count=e.qa.days.length;e.box.location.hash='#/login';assert.ok(e.q('#auth-form'));assert.equal(e.q('#auth-form').dataset.mode,'login');
 assert.equal(e.q('#auth-password').attrs.autocomplete,'current-password');e.box.location.hash='#/register';assert.ok(e.q('#auth-confirm'));assert.equal(e.q('#auth-password').attrs.autocomplete,'new-password');
 e.box.location.hash='#/';assert.equal(e.qa.days.length,count);assert.ok(e.q('#home-lookup'));assert.ok(e.q('.quick-plus'));assert.equal(e.q('#main-nav').querySelectorAll('a').length,4);
});
test('Login without project configuration explains unavailability and keeps guest access',async()=>{
 const e=environment({hash:'#/login'});e.q('#auth-email').value='ban@example.com';e.q('#auth-password').value='testpassword';e.q('#auth-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);
 assert.match(e.q('#auth-message').textContent,/chưa sẵn sàng/);assert.equal(e.qa.accountUser,null);e.box.location.hash='#/';assert.ok(e.q('#home-lookup'));
});
test('Successful login displays real user details, escapes their name, and sign-out retains local vocabulary',async()=>{
 const e=await accountEnvironment({signInWithPassword:async()=>({data:{user:{id:'u1',email:'ban@example.com',user_metadata:{display_name:'<img src=x onerror=alert(1)>'}}},error:null})});
 e.box.location.hash='#/';e.click('[data-action="sample"]');const count=e.qa.days.length;e.box.location.hash='#/login';
 e.q('#auth-email').value='ban@example.com';e.q('#auth-password').value='testpassword';e.q('#auth-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);
 assert.equal(e.box.location.hash,'#/account');assert.match(e.q('.account-identity').textContent,/ban@example.com/);assert.equal(e.q('.account-identity').querySelector('img'),null);assert.equal(e.q('#header-account').getAttribute('aria-expanded'),'false');
 e.click('[data-action="auth-signout"]');await new Promise(setImmediate);assert.equal(e.box.location.hash,'#/login');assert.equal(e.qa.accountUser,null);assert.equal(e.qa.days.length,count);
});
test('Login failure preserves the email, displays a localized error and re-enables submission',async()=>{
 const e=await accountEnvironment({signInWithPassword:async()=>({error:{code:'invalid_credentials'}})});e.q('#auth-email').value='ban@example.com';e.q('#auth-password').value='wrong';const button=e.q('#auth-form').querySelector('button[type="submit"]');
 e.q('#auth-form').dispatchEvent({type:'submit'});assert.equal(button.disabled,true);await new Promise(setImmediate);assert.match(e.q('#auth-message').textContent,/mật khẩu/);assert.equal(e.q('#auth-email').value,'ban@example.com');assert.equal(button.disabled,false);
});
test('Registration requires matching passwords and awaits email confirmation without pretending to sign in',async()=>{
 const e=await accountEnvironment();e.box.location.hash='#/register';e.q('#auth-name').value='Việt';e.q('#auth-email').value='ban@example.com';e.q('#auth-password').value='testpassword';e.q('#auth-confirm').value='different';e.q('#auth-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);assert.match(e.q('#auth-message').textContent,/chưa khớp/);
 e.q('#auth-confirm').value='testpassword';e.q('#auth-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);assert.match(e.q('#auth-message').textContent,/xác nhận email/);assert.equal(e.qa.accountUser,null);assert.equal(e.q('#auth-password').value,'');
});
test('Password visibility control changes only the chosen field and exposes its state',()=>{
 const e=environment({hash:'#/register'});e.click('[data-action="auth-password"][data-target="auth-password"]');assert.equal(e.q('#auth-password').type,'text');assert.equal(e.q('#auth-confirm').type,'password');assert.equal(e.q('[data-target="auth-password"]').getAttribute('aria-pressed'),'true');
});
test('Forgot password uses a neutral confirmation and does not sign the user in',async()=>{
 const e=await accountEnvironment({resetPasswordForEmail:async()=>({error:null})},'#/forgot');e.q('#auth-email').value='ban@example.com';e.q('#auth-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);
 assert.match(e.q('#auth-message').textContent,/Nếu email này có tài khoản/);assert.equal(e.qa.accountUser,null);assert.equal(e.q('#auth-form').querySelector('button[type="submit"]').disabled,false);
});
test('An authenticated recovery page survives reload and accepts a new matching password',async()=>{
 const user={id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}};
 const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null}),updateUser:async()=>({data:{user},error:null})},'#/reset-password');
 assert.equal(e.q('#auth-message').hidden,true);e.q('#auth-password').value='new-password';e.q('#auth-confirm').value='new-password';e.q('#auth-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);
 assert.equal(e.box.location.hash,'#/account');assert.match(e.q('.account-identity').textContent,/ban@example.com/);
});

test('Avatar disclosure preserves the route and dismisses with outside click, Escape and navigation',()=>{
 const e=environment(),start=e.box.location.hash;
 e.click('#header-account');assert.equal(e.box.location.hash,start);assert.equal(e.q('#account-menu').hidden,false);assert.equal(e.q('#header-account').getAttribute('aria-expanded'),'true');
 assert.ok(e.q('#account-menu').querySelector('a[href="#/login"]'));assert.ok(e.q('#account-menu').querySelector('a[href="#/register"]'));
 e.doc.body.click();assert.equal(e.q('#account-menu').hidden,true);
 e.click('#header-account');e.key('Escape');assert.equal(e.q('#account-menu').hidden,true);assert.equal(e.doc.activeElement.id,'header-account');
 e.q('#header-account').dispatchEvent({type:'keydown',code:'ArrowDown'});assert.equal(e.q('#account-menu').hidden,false);assert.equal(e.doc.activeElement.tagName,'A');
 e.box.location.hash='#/settings';assert.equal(e.q('#account-menu').hidden,true);assert.ok(e.q('#preferences-form'));
});

test('Header ends with the avatar and settings remain available through its dropdown without file backups',async()=>{
 for(const e of [environment(),await accountEnvironment({getSession:async()=>({data:{session:{user:{id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}}}},error:null})},'#/account')]){
  assert.ok(!e.q('.header-settings'),'Separate settings shortcut was removed');assert.ok(e.q('.top-actions').children.at(-1).classList.contains('account-menu-anchor'));
  assert.ok(!e.q('[data-action="backup"]'),'No backup action remains in the header');e.click('#header-account');assert.ok(e.q('#account-menu').querySelector('a[href="#/settings"]'));
  e.box.location.hash='#/settings';assert.ok(!e.q('[data-action="backup"]'),'No backup action remains in settings');assert.doesNotMatch(e.q('#app').textContent,/Sao lưu|khôi phục/i);
 }
});

test('Avatar dropdown uses escaped real identity and does not claim vocabulary has synced',async()=>{
 const user={id:'u1',email:'very.long.email@example.com',user_metadata:{display_name:'<img src=x onerror=alert(1)> Việt'}};
 const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null})},'#/');
 e.click('#header-account');const menu=e.q('#account-menu');assert.match(menu.textContent,/very.long.email@example.com/);assert.match(menu.textContent,/<img src=x/);assert.equal(menu.querySelector('img'),null);assert.doesNotMatch(menu.textContent,/ĐÃ ĐỒNG BỘ|Đã đồng bộ/);assert.ok(menu.querySelector('[data-action="auth-signout"]'));
 e.click('[data-action="auth-signout"]');await new Promise(setImmediate);assert.equal(e.qa.accountUser,null);assert.equal(e.q('#account-menu').hidden,true);
});

test('Quick theme selection preserves other automatically saved preferences',()=>{
 const e=environment({hash:'#/settings'});e.q('#pref-goal').value='27';e.q('#pref-goal').dispatchEvent({type:'input'});
 e.click('#header-account');e.q('#account-menu').querySelector('[data-value="light"]').click();
 assert.equal(e.doc.documentElement.getAttribute('data-theme'),'light');assert.equal(e.qa.preferences.theme,'light');assert.equal(e.qa.preferences.goal,27);assert.equal(e.q('#pref-goal').value,'27');assert.equal(e.q('#pref-theme').value,'light');
 const reloaded=environment({map:e.map});assert.equal(reloaded.qa.preferences.theme,'light');assert.equal(reloaded.qa.preferences.goal,27);
});

test('Profile saving trims a real name, rejects blank names and refreshes the avatar',async()=>{
 const user={id:'u1',email:'ban@example.com',email_confirmed_at:'2026-10-20T00:00:00Z',created_at:'2026-10-20T00:00:00Z',user_metadata:{display_name:'Việt'}};let writes=[];
 const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null}),updateUser:async input=>{writes.push(input);return {data:{user:{...user,user_metadata:{display_name:input.data.display_name}}},error:null};}},'#/account');
 assert.equal(e.q('#profile-email').getAttribute('readonly'),'');assert.match(e.q('.account-identity').textContent,/20.10.2026/);
 e.q('#profile-name').value='   ';e.q('#profile-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);assert.equal(writes.length,0);assert.match(e.q('#auth-message').textContent,/tên/i);
 e.q('#profile-name').value='  Đức Việt  ';e.q('#profile-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);
 assert.equal(writes.length,1);assert.equal(writes[0].data.display_name,'Đức Việt');assert.equal(e.qa.accountUser.user_metadata.display_name,'Đức Việt');assert.match(e.q('#header-account').textContent,/Đ/);
 e.click('#header-account');assert.match(e.q('#account-menu').textContent,/Đức Việt/);
});

test('Failed profile saves preserve the draft and allow a retry',async()=>{
 const user={id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}};
 const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null}),updateUser:async()=>({data:{user:null},error:{message:'network offline'}})},'#/account');
 e.q('#profile-name').value='Tên mới';e.q('#profile-form').dispatchEvent({type:'submit'});await new Promise(setImmediate);
 assert.equal(e.q('#profile-name').value,'Tên mới');assert.equal(e.qa.accountUser.user_metadata.display_name,'Việt');assert.equal(e.q('#profile-form').querySelector('button[type="submit"]').disabled,false);assert.match(e.q('#auth-message').textContent,/kết nối/);
});

test('A late profile save cannot replace a page visited during the request',async()=>{
 const user={id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}};let finish;
 const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null}),updateUser:()=>new Promise(resolve=>finish=resolve)},'#/account');
 e.q('#profile-name').value='Đức Việt';e.q('#profile-form').dispatchEvent({type:'submit'});e.box.location.hash='#/';
 finish({data:{user:{...user,user_metadata:{display_name:'Đức Việt'}}},error:null});await new Promise(setImmediate);
 assert.equal(e.box.location.hash,'#/');assert.ok(e.q('#home-lookup'));assert.match(e.q('#header-account').textContent,/Đ/);
});

test('Profile password action emails the authenticated account and reports completion',async()=>{
 const user={id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}};let sent=[];
 const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null}),resetPasswordForEmail:async(email,options)=>{sent.push({email,options});return {error:null};}},'#/account');
 e.click('[data-action="profile-password"]');await new Promise(setImmediate);
 assert.equal(sent.length,1);assert.equal(sent[0].email,'ban@example.com');assert.equal(sent[0].options.redirectTo,'https://local.invalid/');assert.match(e.q('#auth-message').textContent,/email/);assert.equal(e.q('[data-action="profile-password"]').disabled,false);
});

test('Preference goal controls enforce bounds and save each valid adjustment',()=>{
 const e=environment({hash:'#/settings'});e.q('#pref-goal').value='200';e.click('[data-action="preference-goal"][data-step="1"]');assert.equal(Number(e.q('#pref-goal').value),200);
 e.q('#pref-goal').value='1';e.click('[data-action="preference-goal"][data-step="-1"]');assert.equal(Number(e.q('#pref-goal').value),1);
 assert.equal(e.qa.preferences.goal,1);assert.equal(JSON.parse(e.map.get('tutu.preferences.v1')).goal,1);
});

test('Settings apply and persist every choice immediately without a save button or manual sync',()=>{
 const e=environment({hash:'#/settings'});assert.ok(!e.q('#preferences-form').querySelector('button[type="submit"]'),'Settings do not require a save button');assert.ok(!e.q('[data-action="cloud"]'),'Manual sync is removed');
 e.click('[data-action="preference-theme"][data-value="light"]');assert.equal(e.doc.documentElement.getAttribute('data-theme'),'light');assert.equal(e.qa.preferences.theme,'light');
 e.q('#pref-speak').checked=true;e.q('#pref-speak').dispatchEvent({type:'change'});e.q('#pref-reverse').checked=true;e.q('#pref-reverse').dispatchEvent({type:'change'});e.q('#pref-rate').value='1.2';e.q('#pref-rate').dispatchEvent({type:'change'});e.q('#pref-goal').value='23';e.q('#pref-goal').dispatchEvent({type:'input'});
 const saved=JSON.parse(e.map.get('tutu.preferences.v1'));assert.deepEqual(saved,{goal:23,rate:1.2,theme:'light',autoSpeak:true,reverse:true});
 const next=environment({map:e.map,hash:'#/settings'});assert.equal(next.qa.preferences.goal,23);assert.equal(next.q('#pref-speak').checked,true);assert.equal(next.q('#pref-reverse').checked,true);assert.equal(next.q('#pref-rate').querySelector('option[selected]').getAttribute('value'),'1.2');assert.equal(next.doc.documentElement.getAttribute('data-theme'),'light');
});

test('Invalid goal input does not overwrite the saved target and can be corrected',()=>{
 const e=environment({hash:'#/settings'});e.q('#pref-goal').value='';e.q('#pref-goal').dispatchEvent({type:'input'});assert.equal(e.qa.preferences.goal,10);
 e.q('#pref-goal').value='250';e.q('#pref-goal').dispatchEvent({type:'change'});assert.equal(Number(e.q('#pref-goal').value),10);assert.equal(e.qa.preferences.goal,10);
 e.q('#pref-goal').value='99';e.q('#pref-goal').dispatchEvent({type:'input'});assert.equal(e.qa.preferences.goal,99);assert.equal(JSON.parse(e.map.get('tutu.preferences.v1')).goal,99);
});

test('Storage failure still applies the chosen theme and reports that it was not saved',()=>{
 const e=environment({hash:'#/settings',blocked:true});e.click('[data-action="preference-theme"][data-value="light"]');assert.equal(e.doc.documentElement.getAttribute('data-theme'),'light');assert.equal(e.qa.preferences.theme,'light');assert.equal(e.q('#preferences-message').hidden,false);assert.match(e.q('#preferences-message').textContent,/chưa.*lưu/i);
});

test('Restoring a session on settings replaces the guest identity without losing preference drafts',async()=>{
 const user={id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}};let resolve;
 const pending=accountEnvironment({getSession:()=>new Promise(done=>resolve=done)},'#/settings');
 resolve({data:{session:{user}},error:null});const e=await pending;
 assert.equal(e.q('#profile-name').value,'Việt');e.q('#pref-goal').value='29';e.q('#pref-goal').dispatchEvent({type:'input'});
 e.authEvent('SIGNED_OUT',null);assert.equal(e.q('#profile-form'),null);assert.equal(e.q('#pref-goal').value,'29');assert.ok(e.q('.profile-guest-card'));
});

test('A save from a previous account cannot overwrite the next signed-in identity',async()=>{
 const user={id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}},next={id:'u2',email:'next@example.com',user_metadata:{display_name:'Người mới'}};let finish;
 const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null}),updateUser:()=>new Promise(done=>finish=done)},'#/settings');
 e.q('#profile-name').value='Tên đang lưu';e.q('#profile-form').dispatchEvent({type:'submit'});e.authEvent('SIGNED_IN',{user:next});
 finish({data:{user:{...user,user_metadata:{display_name:'Tên đang lưu'}}},error:null});await new Promise(setImmediate);
 assert.equal(e.qa.accountUser.id,'u2');assert.equal(e.q('#profile-name').value,'Người mới');assert.match(e.q('#header-account').textContent,/N/);
});

test('PWA update cannot discard an unsaved profile name',async()=>{
 const user={id:'u1',email:'ban@example.com',user_metadata:{display_name:'Việt'}};const e=await accountEnvironment({getSession:async()=>({data:{session:{user}},error:null})},'#/account');
 let posted=0;e.box.navigator.serviceWorker={addEventListener(){}};e.qa.showPwaUpdate({postMessage(){posted++;}});
 e.q('#profile-name').value='Chưa lưu';e.q('#profile-name').dispatchEvent({type:'input'});e.click('[data-action="pwa-update"]');assert.equal(posted,0);assert.match(e.q('#toasts').textContent,/lưu phần đang nhập/);
});

test('Help can return to settings even when settings is already the active route',()=>{
 const e=environment({hash:'#/settings'});e.click('#header-account');e.click('[data-action="account-help"]');assert.equal(e.q('#utility-dialog').open,true);
 e.click('[data-action="account-help-settings"]');assert.equal(e.q('#utility-dialog').open,false);assert.equal(e.box.location.hash,'#/settings');assert.ok(e.q('#preferences-form'));assert.equal(e.doc.activeElement.id,'header-account');
});
test('Typing he suggests hello; clicking fills both fields; keyboard selection and manual meanings work',async()=>{
 const e=environment({hash:'#/day/2026-10-22',bankRows:[['hello','xin chào','',1],['help','giúp đỡ','',1],['hero','anh hùng','',0]]});
 await e.qa.loadBank();
 const input=()=>e.q('#english');
 input().focus();input().value='he';input().dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);
 assert.equal(e.q('#word-suggestions').hidden,false);
 assert.match(e.q('#word-suggestions').textContent,/hello/);
 e.click('[data-suggest="0"]');
 assert.equal(input().value,'hello');assert.equal(e.q('#vietnamese').value,'xin chào');
 e.q('#add-form').dispatchEvent({type:'submit'});
 assert.equal(e.qa.days[0].words[0].en,'hello');assert.equal(e.qa.days[0].words[0].vi,'xin chào');
 input().focus();input().value='hel';input().dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);
 input().dispatchEvent({type:'keydown',key:'ArrowDown',code:'ArrowDown'});
 input().dispatchEvent({type:'keydown',key:'Enter',code:'Enter'});
 assert.equal(input().value,'hello');assert.equal(e.q('#vietnamese').value,'xin chào');
 e.q('#vietnamese').value='nghĩa tự sửa';input().focus();input().value='unknownword';input().dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);
 assert.equal(e.q('#vietnamese').value,'nghĩa tự sửa');assert.equal(e.q('#word-suggestions').hidden,true);
});
test('App mở trống, nạp mẫu, thêm qua submit, chặn từ trùng, sửa, tìm kiếm, xóa/hoàn tác',()=>{
 const e=environment();assert.match(e.q('#app').textContent,/Từ nhỏ hôm nay/);e.click('[data-action="sample"]');e.box.location.hash=e.q('.home-today').getAttribute('href');e.q('#english').value='Testword';e.q('#vietnamese').value='từ kiểm tra';const submit=()=>e.q('#add-form').dispatchEvent({type:'submit'});submit();assert.equal(e.qa.days[0].words.length,9);assert.equal(e.doc.activeElement.id,'english');e.q('#english').value=' testWORD ';e.q('#vietnamese').value='trùng';submit();assert.equal(e.qa.days[0].words.length,9);
 const w=e.qa.days[0].words.at(-1);e.click('[data-action="edit"][data-id="'+w.id+'"]');e.q('#edit-vi').value='đã sửa';e.q('#edit-form').dispatchEvent({type:'submit'});assert.equal(w.vi,'đã sửa');e.q('#word-search').value='testword';e.q('#word-search').dispatchEvent({type:'input'});assert.equal(e.q('#word-list').querySelectorAll('.word-row').length,1);e.click('[data-action="delete"][data-id="'+w.id+'"]');assert.equal(e.qa.days[0].words.length,8);e.doc.querySelectorAll('.toast').at(-1).querySelector('button').click();assert.equal(e.qa.days[0].words.length,9);
});
test('Dán 10 dòng, preview và thêm đủ 10 từ vào ngày',()=>{const e=demo();e.click('[data-action="bulk"]');e.q('#bulk-text').value=['one - một','two – hai','three : ba','four = bốn','five\tnăm','six - sáu','seven – bảy','eight : tám','nine = chín','ten\tmười','sai dòng'].join('\n');e.q('#bulk-text').dispatchEvent({type:'input'});assert.match(e.q('#bulk-count').textContent,/10 Từ/);e.click('[data-action="bulk-add"]');assert.equal(e.qa.days[0].words.length,18);});
test('Lật thẻ bằng click và phím, tự chuyển, đảo chiều, Esc và hash Back',()=>{const e=demo();e.click('[data-action="start-flip"]');e.click('[data-action="flip-card"]');assert.equal(e.qa.session.flipped,true);assert.match(e.q('.flip-card').getAttribute('aria-label'),/lắp ráp/);e.key('ArrowRight');assert.equal(e.qa.session.index,1);e.key('Space');assert.equal(e.qa.session.flipped,true);e.key('ArrowLeft');assert.equal(e.qa.session.index,2);e.click('[data-action="reverse"]');assert.equal(e.qa.session.reversed,true);e.click('[data-action="close-study"]');assert.equal(e.q('#study-dialog').open,false);e.click('[data-action="start-flip"]');e.box.location.hash='#/day/'+e.qa.days[0].date;assert.equal(e.qa.session,null);});
test('Ghép sai nháy viền, ghép đúng có tích, giữ focus và kết quả thời gian',()=>{const e=demo();e.click('[data-action="start-match"]');let s=e.qa.session;let first=0,wrong=s.cells.findIndex((c,i)=>i!==0&&c.pair!==s.cells[0].pair),correct=s.cells.findIndex((c,i)=>i!==0&&c.pair===s.cells[0].pair);const click=i=>e.click('[data-cell="'+i+'"]');click(first);assert.equal(Number(e.doc.activeElement.dataset.cell),first);click(wrong);assert.equal(e.q('#study-dialog').querySelectorAll('.wrong').length,2);e.flush(600);assert.equal(s.busy,false);click(first);click(correct);assert.equal(s.matched.length,1);assert.equal(e.q('#study-dialog').querySelectorAll('.matched').length,2);assert.ok(e.doc.activeElement.matches('.match-cell'));for(const w of s.words){if(s.matched.includes(w.id))continue;const ix=s.cells.flatMap((c,i)=>c.pair===w.id?[i]:[]);click(ix[0]);click(ix[1]);}e.flush(500);assert.equal(e.qa.session.type,'result');assert.match(e.q('.result-card').textContent,/Thời gian hoàn thành/);});
test('Local vocabulary survives reload without file import or export',()=>{const e=demo(),before=JSON.stringify(e.qa.days);const second=environment({map:e.map});assert.equal(JSON.stringify(second.qa.days),before);});
test('Blocked local storage shows a warning without offering removed backup actions',()=>{const e=environment({blocked:true});e.click('[data-action="sample"]');assert.equal(e.q('#storage-warning').hidden,false);assert.match(e.q('#storage-warning').textContent,/Chưa lưu được/);assert.doesNotMatch(e.q('#storage-warning').textContent,/sao lưu|xuất file|nhập file/i);});
test('Ngày dưới 3 từ không cho ghép; hoàn thành flip hiện kết quả',()=>{const e=demo();e.qa.days[0].words.splice(2);e.qa.renderBase();e.click('[data-action="start-match"]');assert.equal(e.qa.session,null);e.click('[data-action="start-flip"]');for(let i=0;i<2;i++){e.qa.flipCard();e.qa.answer(i===0);}assert.equal(e.qa.session.type,'result');assert.match(e.q('.score').textContent,/1\/2/);});
test('Esc cancel closes a study session',()=>{const e=demo();e.click('[data-action="start-flip"]');e.q('#study-dialog').dispatchEvent({type:'cancel',bubbles:false});assert.equal(e.q('#study-dialog').open,false);});
test('Hai từ chung nghĩa Việt được ghép bằng bất kỳ ô nghĩa tương đương nào',()=>{const e=demo();for(const w of e.qa.days[0].words)w.vi='cùng nghĩa';e.click('[data-action="start-match"]');const s=e.qa.session,a=s.cells.findIndex(c=>c.lang==='en'),b=s.cells.findIndex(c=>c.lang==='vi'&&c.pair!==s.cells[a].pair);e.click('[data-cell="'+a+'"]');e.click('[data-cell="'+b+'"]');assert.equal(s.matched.length,1);for(const w of s.words){if(s.matched.includes(w.id))continue;const cells=s.cells.flatMap((c,i)=>c.pair===w.id?[i]:[]);e.click('[data-cell="'+cells[0]+'"]');e.click('[data-cell="'+cells[1]+'"]');}assert.equal(s.matched.length,6);});
test('Dictionary searches all words, opens full meanings and plays English pronunciation',async()=>{
 const rows=[['apple','quả táo\ncây táo','danh từ',1],['dock','khấu đuôi\nbến tàu','danh từ',1],['zoo','vườn thú','danh từ',0]];
 const e=environment({bankRows:rows,speech:true});await e.qa.bankOpen();
 assert.equal(e.qa.bankState.kind,'all');assert.equal(e.doc.activeElement.id,'bank-search');
 for(const selector of ['#bank-kind','#bank-mode','[data-action="bank-pick-page"]','[data-action="bank-suggest"]','.bank-bottom','input[type="checkbox"]'])assert.equal(e.q('#utility-dialog').querySelector(selector),null,selector);
 assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,0);
 e.q('#bank-search').value='zoo';e.q('#bank-search').dispatchEvent({type:'input'});e.flush(180);
 assert.match(e.q('#bank-list').textContent,/zoo/);e.click('[data-action="bank-detail"][data-bank="2"]');
 assert.match(e.q('.bank-senses').textContent,/vườn thú/);e.click('[data-action="bank-speak"]');assert.equal(e.spoken[0].text,'zoo');assert.equal(e.spoken[0].lang,'en-US');
 e.click('[data-action="bank-back"]');e.q('#bank-search').value='ben tau';e.q('#bank-search').dispatchEvent({type:'input'});e.flush(180);
 e.click('[data-action="bank-detail"][data-bank="1"]');assert.match(e.q('.bank-senses').textContent,/khấu đuôi/);
 e.q('#bank-custom-meaning').value='bến tàu';e.click('[data-action="bank-save"][data-bank="1"]');
 assert.equal(e.qa.days[0].words[0].en,'dock');assert.equal(e.qa.days[0].words[0].vi,'bến tàu');assert.equal(e.q('[data-action="bank-save"]').disabled,true);
 e.click('[data-action="close-utility"]');assert.match(e.q('#app').textContent,/dock/);
});

test('Vietnamese lookup displays the matching sense and keeps it when saving a flashcard',async()=>{
 const e=environment({bankRows:[['all Canadian company','công ty toàn vốn','',0],['meal','bột\nlượng sữa\nbữa ăn\năn, ăn cơm','',0]]});await e.qa.bankOpen();
 e.q('#bank-search').value='ăn cơm';e.q('#bank-search-form').dispatchEvent({type:'submit'});
 assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,1);
 assert.match(e.q('.bank-meaning').textContent,/ăn cơm/);
 e.click('[data-action="bank-detail"]');const meaning=e.q('#bank-custom-meaning');assert.match(meaning.textContent,/ăn cơm/);
 meaning.value=meaning.textContent; // The minimal DOM harness does not initialize textarea values from markup.
 e.click('[data-action="bank-save"]');assert.match(e.qa.days[0].words[0].vi,/ăn cơm/);
});

test('Word relations stay attached to the selected sense and Back restores the lookup',async()=>{
 const rows=[['light','nhẹ\nsáng\nnhạt màu','tính từ',1],['heavy','nặng nề về tâm trạng\nnặng về trọng lượng','tính từ',1],['dark','tối\nđậm màu','tính từ',1]];
 const e=environment({bankRows:rows,lexicon:true});await e.qa.bankOpen();
 e.q('#bank-search').value='light';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"][data-bank="0"]');await e.qa.bankRelationsPending;
 const weight=e.q('[data-sense="light%3:00:01::"]');assert.ok(weight);assert.match(weight.textContent,/Nhẹ/);assert.match(weight.textContent,/heavy/);assert.doesNotMatch(weight.textContent,/dark/);
 weight.querySelector('[data-relation="antonyms"]').querySelector('[data-action="bank-related"]').click();await e.qa.bankRelationsPending;
 assert.match(e.q('#utility-title').textContent,/heavy/);assert.equal(e.q('.dictionary-sense').dataset.sense,'heavy%3:00:01::');
 assert.match(e.q('#bank-custom-meaning').value,/trọng lượng/);assert.doesNotMatch(e.q('#bank-custom-meaning').value,/tâm trạng/);
 e.click('[data-action="bank-back"]');await e.qa.bankRelationsPending;assert.equal(e.q('#utility-title').textContent,'light');
 e.click('[data-action="bank-back"]');assert.equal(e.q('#bank-search').value,'light');
});

test('Word details show the new layout while loading and preserve the reader’s position',async()=>{
 const e=environment({bankRows:[['light','nhẹ\nsáng\nnhạt màu','tính từ',1]],lexicon:true});await e.qa.bankOpen();
 const original=e.box.fetch;let release,notify;const started=new Promise(resolve=>notify=resolve);
 e.box.fetch=async url=>{if(String(url).endsWith('/l.json.gz')){notify();return new Promise(resolve=>release=()=>resolve(new Response(fs.readFileSync(String(url)))));}return original(url);};
 e.q('#bank-search').value='light';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await started;
 const full=e.q('.dictionary-translations'),dialog=e.q('#utility-dialog');
 assert.equal(full.getAttribute('open'),null,'Legacy meanings must not expand before the new sense cards load');
 assert.match(e.q('#bank-relations').textContent,/Theo từng nghĩa/);
 assert.ok(e.q('#bank-relations').querySelector('[role="status"]'));
 assert.equal(e.q('#bank-relations').getAttribute('aria-busy'),'true');
 full.open=true;dialog.scrollTop=180;
 release();await e.qa.bankRelationsPending;
 assert.ok(e.q('.dictionary-sense[data-sense="light%3:00:01::"]'));
 assert.equal(e.q('#bank-relations').getAttribute('aria-busy'),'false');
 assert.ok(full.open,'Finishing a download must not close meanings the reader opened');
 assert.equal(dialog.scrollTop,180,'Finishing a download must not jump to the top');
});

test('Missing relation download preserves the dictionary and can be retried',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]});await e.qa.bankOpen();
 e.q('#bank-search').value='hello';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await e.qa.bankRelationsPending;
 assert.match(e.q('.bank-senses').textContent,/xin chào/);assert.ok(e.q('[data-action="bank-relations-retry"]'));
 e.box.fetch=async url=>new Response(fs.readFileSync(String(url)));e.click('[data-action="bank-relations-retry"]');await e.qa.bankRelationsPending;
 assert.match(e.q('#bank-relations').textContent,/hi/);assert.equal(e.q('#bank-relations').getAttribute('aria-busy'),'false');
});

test('A late word relation response cannot overwrite another word or the user’s edited meaning',async()=>{
 const e=environment({bankRows:[['light','nhẹ','',1],['heavy','nặng','',1]],lexicon:true});await e.qa.bankOpen();
 const original=e.box.fetch;let release,notify;const started=new Promise(resolve=>notify=resolve);
 e.box.fetch=async url=>{if(String(url).endsWith('/l.json.gz')){notify();return new Promise(resolve=>release=()=>resolve(new Response(fs.readFileSync(String(url)))));}return original(url);};
 e.q('#bank-search').value='light';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');const stale=e.qa.bankRelationsPending;await started;
 e.click('[data-action="bank-back"]');e.q('#bank-search').value='heavy';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');
 e.q('#bank-custom-meaning').value='nghĩa tôi tự viết';e.q('#bank-custom-meaning').dispatchEvent({type:'input'});await e.qa.bankRelationsPending;
 release();await stale;assert.equal(e.q('#utility-title').textContent,'heavy');assert.equal(e.q('#bank-custom-meaning').value,'nghĩa tôi tự viết');
 assert.ok(e.q('.dictionary-sense[data-sense="heavy%3:00:01::"]'));assert.equal(e.q('.dictionary-sense[data-sense="light%3:00:01::"]'),null);
});

test('Inflections link to their root and words without antonyms never show invented opposites',async()=>{
 const e=environment({bankRows:[['ate','ăn','động từ',0],['eat','ăn','động từ',1],['apple','quả táo','danh từ',1]],lexicon:true});await e.qa.bankOpen();
 e.q('#bank-search').value='ate';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await e.qa.bankRelationsPending;
 assert.match(e.q('.dictionary-root').textContent,/eat/);assert.match(e.q('#bank-relations').textContent,/eaten/);
 e.click('[data-action="bank-back"]');e.q('#bank-search').value='apple';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');await e.qa.bankRelationsPending;
 assert.equal(e.q('#bank-relations').querySelector('[data-relation="antonyms"]'),null);
});

test('Dictionary paginates lookup results, preserves query/focus on Back and does not store the whole bank',async()=>{
 const rows=Array.from({length:250},(_,i)=>['word'+i,'nghĩa '+i,'',0]);const e=environment({bankRows:rows});await e.qa.bankOpen();
 e.q('#bank-search').value='word';e.q('#bank-search').dispatchEvent({type:'input'});e.flush(180);
 assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,30);e.click('[data-action="bank-next"]');assert.equal(e.qa.bankState.page,1);
 const result=e.q('[data-action="bank-detail"]'),index=result.dataset.bank;e.click('[data-action="bank-detail"][data-bank="'+index+'"]');assert.equal(e.doc.activeElement.id,'utility-title');
 e.click('[data-action="bank-back"]');assert.equal(e.q('#bank-search').value,'word');assert.equal(e.qa.bankState.page,1);assert.equal(e.doc.activeElement.dataset.bank,index);
 e.click('[data-action="bank-reset"]');assert.equal(e.q('#bank-search').value,'');assert.equal(e.qa.bankState.page,0);assert.equal(e.doc.activeElement.id,'bank-search');assert.equal(e.q('#bank-list').querySelectorAll('[data-action="bank-detail"]').length,0);
 assert.equal(e.map.get('tungngay.v1'),undefined);
});

test('Dictionary handles no matches, submit and unavailable speech without losing the query',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',0]]});await e.qa.bankOpen();
 e.q('#bank-search').value='nothinghere';e.q('#bank-search-form').dispatchEvent({type:'submit'});assert.match(e.q('#bank-list').textContent,/Không tìm thấy/);
 e.q('#bank-search').value='hello';e.q('#bank-search-form').dispatchEvent({type:'submit'});e.click('[data-action="bank-detail"]');assert.equal(e.q('[data-action="bank-speak"]').disabled,true);assert.match(e.q('#utility-dialog').textContent,/chưa hỗ trợ phát âm/);
 e.click('[data-action="bank-back"]');assert.equal(e.q('#bank-search').value,'hello');
});

test('Opening an expired result or unavailable matching route returns to its day safely',()=>{
 for(const hash of ['#/result/2026-10-22','#/match/2026-10-22']){const e=environment({hash});assert.equal(e.box.location.hash,'#/day/2026-10-22');assert.equal(e.qa.session,null);assert.equal(e.q('#study-dialog').open,false);}
});

test('A wrong match makes a future scheduled word due again even if the session is closed',()=>{
 const e=demo();for(const w of e.qa.days[0].words){w.remembered=true;w.reviewLevel=4;w.nextReview='2099-01-01';}
 e.click('[data-action="start-match"]');const s=e.qa.session,a=0,b=s.cells.findIndex(c=>c.pair!==s.cells[a].pair);
 e.click('[data-cell="'+a+'"]');e.click('[data-cell="'+b+'"]');
 for(const id of [s.cells[a].pair,s.cells[b].pair]){const w=e.qa.days[0].words.find(w=>w.id===id);assert.equal(w.remembered,false);assert.equal(w.reviewLevel,0);assert.equal(w.nextReview,e.qa.days[0].date);}
});

test('Notebook memory toggles update due counts without counting as a study session',()=>{
 const e=demo(),word=e.qa.days[0].words.find(w=>!w.remembered),today=e.qa.days[0].date;
 const toggle=()=>e.click('[data-action="toggle"][data-id="'+word.id+'"]');
 toggle();assert.equal(word.remembered,true);assert.equal(word.reviewLevel,1);assert.ok(word.nextReview>today);
 assert.equal(word.reviewCount,undefined);assert.equal(e.qa.activity[today],undefined);
 e.box.location.hash='#/review';assert.equal(e.q('.feature-number').textContent,'13');
 e.box.location.hash='#/day/'+today;toggle();assert.equal(word.remembered,false);assert.equal(word.reviewLevel,0);assert.equal(word.nextReview,today);
 e.box.location.hash='#/';assert.equal(e.q('[data-home-count="due"]').textContent,'14');
});

test('Editing only an example preserves the schedule; changing a meaning resets it',()=>{
 const e=demo(),word=e.qa.days[0].words[0];word.remembered=true;word.reviewLevel=3;word.nextReview='2099-01-01';word.reviewCount=5;
 const edit=()=>{e.click('[data-action="edit"][data-id="'+word.id+'"]');e.q('#edit-example').value='A new example.';e.q('#edit-example-vi').value='Một ví dụ mới.';};
 edit();e.q('#edit-form').dispatchEvent({type:'submit'});
 assert.equal(word.remembered,true);assert.equal(word.reviewLevel,3);assert.equal(word.nextReview,'2099-01-01');assert.equal(word.reviewCount,5);
 edit();e.q('#edit-vi').value='nghĩa mới';e.q('#edit-form').dispatchEvent({type:'submit'});
 assert.equal(word.remembered,false);assert.equal(word.reviewLevel,0);assert.equal(word.nextReview,e.qa.days[0].date);assert.equal(word.reviewCount,5);
});

test('A review result and its retry contain only missed words from that session',()=>{
 const e=demo(),today=e.qa.days[0].date,oldDay=e.qa.days[1];
 for(const d of e.qa.days)for(const w of d.words){w.remembered=true;w.reviewLevel=2;w.nextReview='2099-01-01';}
 const missed=oldDay.words[0],passed=e.qa.days[0].words[0],outside=oldDay.words[1];
 missed.nextReview=today;passed.nextReview=today;e.qa.startGlobalReview('due');assert.equal(e.qa.session.words.length,2);
 const studied=[...e.qa.session.words];
 for(const w of studied){e.qa.flipCard();e.qa.answer(w.id!==missed.id);}
 outside.remembered=false;outside.nextReview=today;e.qa.route();
 assert.equal(e.qa.session.type,'result');assert.match(e.q('.result-tags').textContent,new RegExp(missed.en));assert.doesNotMatch(e.q('.result-tags').textContent,new RegExp(outside.en));
 e.click('[data-action="result-review"]');assert.equal(e.qa.session.words.length,1);assert.equal(e.qa.session.words[0].id,missed.id);assert.equal(e.qa.session.words[0]._date,oldDay.date);
 e.qa.flipCard();e.qa.answer(true);assert.equal(e.qa.session.type,'result');assert.ok(!e.q('[data-action="result-review"]'));
 assert.equal(outside.remembered,false);
});

test('A match result does not offer unplayed words from the rest of the notebook',()=>{
 const e=demo(),all=e.qa.days[0].words;for(const w of all)w.remembered=false;
 e.click('[data-action="start-match"]');assert.equal(e.qa.session.words.length,6);
 const selected=new Set(e.qa.session.words.map(w=>w.id)),outside=all.filter(w=>!selected.has(w.id));
 for(const w of e.qa.session.words){const cells=e.qa.session.cells.flatMap((c,i)=>c.pair===w.id?[i]:[]);e.click('[data-cell="'+cells[0]+'"]');e.click('[data-cell="'+cells[1]+'"]');}
 e.flush(500);assert.equal(e.qa.session.type,'result');assert.ok(!e.q('[data-action="result-review"]'),'Unplayed words must not appear in the result retry');
 assert.ok(outside.every(w=>!w.remembered));
});

test('Stopping a match early does not claim that every word was recalled',()=>{
 const e=demo();for(const w of e.qa.days[0].words){w.remembered=true;w.reviewLevel=2;w.nextReview='2099-01-01';}
 e.click('[data-action="start-match"]');e.click('[data-action="finish-match"]');
 assert.equal(e.qa.session.result.completed,false);assert.doesNotMatch(e.q('.success-note').textContent,/Bạn đã nhớ hết/);
 assert.ok(e.qa.days[0].words.every(w=>w.nextReview==='2099-01-01'&&w.reviewLevel===2));
});

test('Quick add, examples, review across dates, schedules and progress views work together',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]});e.qa.quickAddOpen();await e.qa.loadBank();
 e.q('#quick-en').value='he';e.q('#quick-en').dispatchEvent({type:'input'});e.flush(150);await new Promise(setImmediate);e.click('[data-action="quick-suggest"]');
 e.q('#quick-example').value='Hello, Viet!';e.q('#quick-example-vi').value='Chào Việt!';e.q('#quick-add-form').dispatchEvent({type:'submit'});
 assert.equal(e.qa.days[0].words[0].example,'Hello, Viet!');
 const date=e.qa.days[0].date;e.qa.days[0].date='2026-01-01';e.box.location.hash='#/review';assert.ok(e.q('[data-action="review-start"]'));
 e.qa.startGlobalReview('due');assert.equal(e.qa.session.words[0]._date,'2026-01-01');assert.match(e.q('.front').textContent,/Hello, Viet!/);
 e.qa.flipCard();e.qa.answer(true);assert.equal(e.qa.days[0].words[0].remembered,true);assert.ok(e.qa.days[0].words[0].nextReview>date);
 assert.equal(e.qa.activity[date].reviewed,1);e.box.location.hash='#/progress';assert.match(e.q('#app').textContent,/1 \/ 10 lượt ôn/);
 e.box.location.hash='#/settings';assert.ok(e.q('#preferences-form'));e.q('#pref-goal').value='20';e.q('#pref-goal').dispatchEvent({type:'input'});e.q('#pref-rate').value='1';e.q('#pref-rate').dispatchEvent({type:'change'});e.click('[data-action="preference-theme"][data-value="light"]');
 assert.equal(e.qa.preferences.goal,20);assert.equal(e.doc.documentElement.getAttribute('data-theme'),'light');
});


test('V3 home lookup submits into the existing dictionary and records only opened words',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1],['help','giúp','',1]]});
 assert.ok(e.q('#home-lookup-form'));assert.equal(e.q('[data-nav="home"]').getAttribute('aria-current'),'page');
 e.q('#home-lookup').value='hello';e.q('#home-lookup-form').dispatchEvent({type:'submit'});
 await e.qa.loadBank();await new Promise(setImmediate);
 assert.equal(e.q('#bank-search').value,'hello');assert.match(e.q('#bank-list').textContent,/hello/);
 e.click('[data-action="bank-detail"]');e.click('[data-action="close-utility"]');
 assert.equal(e.q('#recent-lookups').querySelectorAll('[data-action="home-lookup-recent"]').length,1);
 assert.match(e.q('#recent-lookups').textContent,/hello/);
 const reloaded=environment({map:e.map});assert.match(reloaded.q('#recent-lookups').textContent,/hello/);
 assert.equal(reloaded.qa.days.length,0);
});
test('Home lookup suggests English prefixes and opens the chosen word directly',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1],['help','giúp đỡ','',1],['hero','anh hùng','',0]]});
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);await e.qa.loadBank();await new Promise(setImmediate);
 assert.ok(e.q('#home-lookup-suggestions'),'Home search needs its own suggestion panel');
 assert.equal(e.q('#home-lookup-suggestions').hidden,false);
 assert.match(e.q('#home-lookup-options').textContent,/hello/);assert.match(e.q('#home-lookup-options').textContent,/xin chào/);
 assert.equal(e.q('#utility-dialog').open,false);assert.equal(input.getAttribute('aria-expanded'),'true');
 e.click('[data-action="home-lookup-suggest"][data-position="0"]');await new Promise(setImmediate);await e.qa.bankRelationsPending;
 assert.equal(e.q('#utility-title').textContent,'hello');assert.equal(e.q('#utility-dialog').getAttribute('data-view'),'bank-detail');
 assert.equal(e.q('#home-lookup-suggestions').hidden,true);assert.equal(e.qa.days.length,0);
});

test('Home lookup suggests Vietnamese meanings, supports keyboard selection and clears on Escape',async()=>{
 const e=environment({bankRows:[['eat','ăn\năn cơm','',1],['have a meal','ăn cơm','',1],['Canadian company','công ty Canada','',0]]});
 const input=e.q('#home-lookup');input.focus();input.value='an com';input.dispatchEvent({type:'input'});e.flush(180);await e.qa.loadBank();await new Promise(setImmediate);
 assert.ok(e.q('#home-lookup-options'),'Vietnamese queries also need home suggestions');
 assert.match(e.q('#home-lookup-options').textContent,/eat/);assert.doesNotMatch(e.q('#home-lookup-options').textContent,/Canadian/);
 input.dispatchEvent({type:'keydown',key:'ArrowDown'});input.dispatchEvent({type:'keydown',key:'ArrowDown'});assert.ok(input.getAttribute('aria-activedescendant'));
 input.dispatchEvent({type:'keydown',key:'Enter'});await new Promise(setImmediate);await e.qa.bankRelationsPending;
 assert.equal(e.q('#utility-title').textContent,'eat');
 e.click('[data-action="close-utility"]');input.focus();input.value='eat';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 input.dispatchEvent({type:'keydown',key:'Escape'});assert.equal(e.q('#home-lookup-suggestions').hidden,true);assert.equal(input.value,'eat');
 input.value='';input.dispatchEvent({type:'input'});assert.equal(input.getAttribute('aria-expanded'),'false');
});

test('Home suggestions discard stale downloads after a query is cleared or route changes',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]}),original=e.box.fetch;let release,notify;
 const started=new Promise(resolve=>notify=resolve);
 e.box.fetch=async url=>{if(String(url).includes('data/dictionary.json.gz')){notify();await new Promise(resolve=>release=resolve);}return original(url);};
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);
 assert.ok(e.q('#home-lookup-suggestions'),'Loading feedback must appear while the dictionary downloads');
 await started;
 assert.equal(e.q('#home-lookup-suggestions').hidden,false);
 input.value='';input.dispatchEvent({type:'input'});e.box.location.hash='#/notebook';release();await new Promise(setImmediate);await new Promise(setImmediate);
 e.box.location.hash='#/';assert.equal(e.q('#home-lookup-suggestions').hidden,true);assert.equal(e.q('#home-lookup-options').querySelectorAll('[role="option"]').length,0);
});

test('Home suggestions preserve keyboard selection while Vietnamese results finish loading',async()=>{
 const rows=[['hello','xin chào','',1],['help','giúp đỡ','',1],...Array.from({length:2000},(_,i)=>['word'+i,'nghĩa khác','',0])];
 const e=environment({bankRows:rows});await e.qa.loadBank();
 const frames=[];let clock=0;e.box.requestAnimationFrame=fn=>frames.push(fn);e.box.performance={now:()=>clock+=10};
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 assert.ok(frames.length);input.dispatchEvent({type:'keydown',key:'ArrowDown'});
 const selected=input.getAttribute('aria-activedescendant');assert.ok(selected);
 while(frames.length)frames.shift()();
 assert.equal(input.getAttribute('aria-activedescendant'),selected);
 assert.equal(e.q('#'+selected).getAttribute('aria-selected'),'true');
});

test('Home lookup handles a failed download and can retry without reloading the page',async()=>{
 const e=environment({bankRows:[['hello','xin chào','',1]]}),original=e.box.fetch;
 e.box.fetch=async()=>{throw Error('offline');};
 const input=e.q('#home-lookup');input.focus();input.value='he';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 assert.match(e.q('#home-lookup-status').textContent,/Chưa tải được/);
 e.box.fetch=original;input.dispatchEvent({type:'input'});e.flush(180);await e.qa.loadBank();await new Promise(setImmediate);
 assert.match(e.q('#home-lookup-options').textContent,/hello/);
 input.value='no-match';input.dispatchEvent({type:'input'});e.flush(180);await new Promise(setImmediate);
 assert.match(e.q('#home-lookup-status').textContent,/Chưa tìm thấy/);assert.equal(e.q('#home-lookup-options').querySelectorAll('[role="option"]').length,0);
});

test('V3 home and notebook are separate routes and use real counts without creating an empty day',()=>{
 const e=environment();assert.ok(e.q('#home-lookup-form'));e.click('[data-action="sample"]');
 assert.equal(e.q('[data-home-count="due"]').textContent,'14');
 e.box.location.hash='#/notebook';assert.equal(e.q('[data-nav="notebook"]').getAttribute('aria-current'),'page');
 assert.equal(e.q('.notebook-grid').querySelectorAll('.notebook-day').length,3);
 const count=e.qa.days.length;e.box.location.hash='#/';assert.ok(e.q('#home-lookup-form'));assert.equal(e.qa.days.length,count);
 e.box.location.hash='#/day/'+e.qa.days[0].date;assert.ok(e.q('#add-form'));assert.equal(e.q('[data-nav="notebook"]').getAttribute('aria-current'),'page');
});
