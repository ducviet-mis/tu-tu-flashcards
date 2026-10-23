/* Account routes use Supabase Auth. Vocabulary remains in the existing local store. */
'use strict';
let accountConnection={enabled:false,client:null},accountUser=null,accountBusy=false,accountRecovery=false;
const accountPages=['login','register','forgot','reset-password','account'];
function accountPage(){return (location.hash||'').split('/')[1]?.split('?')[0];}
function accountMessage(text,error=false){const node=$('#auth-message');if(node){node.textContent=text;node.hidden=false;node.classList.toggle('error',error);}}
function updateAccountHeader(){
 const link=$('#header-account');if(!link)return;
 const name=accountUser?.user_metadata?.display_name||accountUser?.email||'';
 link.href=accountUser?'#/account':'#/login';link.setAttribute('aria-label',accountUser?'Tài khoản của '+name:'Đăng nhập');
 link.innerHTML=accountUser?`<span class="account-initial">${esc(Array.from(name)[0]?.toUpperCase()||'T')}</span>`:icon('user');
}
function authField(id,label,type,autocomplete,placeholder='',required=true){
 return `<label class="auth-field" for="${id}"><span>${label}</span><span class="auth-input-wrap"><input id="${id}" name="${id}" type="${type}" autocomplete="${autocomplete}" placeholder="${placeholder}" ${required?'required':''} ${type==='password'&&autocomplete==='new-password'?'minlength="8"':''} ${type==='email'?'maxlength="254"':'maxlength="128"'}>${type==='password'?`<button type="button" class="auth-eye" data-action="auth-password" data-target="${id}" aria-label="Hiện mật khẩu" aria-pressed="false">${icon('eye')}</button>`:''}</span></label>`;
}
function renderAuth(mode='login'){
 if(accountUser&&['login','register','forgot'].includes(mode)){go('#/account');return;}
 const signup=mode==='register',forgot=mode==='forgot',reset=mode==='reset-password';
 const title=signup?'Đăng ký':forgot?'Quên mật khẩu?':reset?'Mật khẩu mới':'Đăng nhập';
 const subtitle=signup?'Tạo tài khoản để có góc học của riêng bạn.':forgot?'Nhập email để nhận liên kết đặt lại mật khẩu.':reset?'Đặt mật khẩu mới cho tài khoản của bạn.':'Quay lại góc học của bạn.';
 app.innerHTML=`<div class="auth-layout"><section class="auth-story" aria-label="Từ Từ"><a href="#/" class="auth-brand"><img src="./assets/images/icon.svg" width="64" height="64" alt=""><span>TỪ <em>TỪ</em></span></a><h2>Học<br>từ từ,<br><span>nhớ lâu.</span></h2><div class="auth-tags"><span>Lật thẻ</span><span>Ghép cặp</span><span>Mỗi ngày một chút</span></div></section><section class="auth-form-section"><div class="auth-form-content"><a href="#/" class="auth-back">${icon('back')}Trang chủ</a><h1>${mode==='login'?'<span class="auth-title-desktop">Đăng nhập</span><span class="auth-title-mobile">Chào mừng<br><em>trở lại</em></span>':title}</h1><p class="auth-subtitle">${subtitle}</p><form id="auth-form" data-mode="${mode}">${signup?authField('auth-name','Tên hiển thị','text','nickname','Bạn muốn được gọi là gì?'):''}${!reset?authField('auth-email','Email','email','email','ten@email.com'):''}${!forgot?authField('auth-password','Mật khẩu','password',signup||reset?'new-password':'current-password',signup||reset?'Tối thiểu 8 ký tự':'Mật khẩu của bạn'):''}${signup||reset?authField('auth-confirm','Nhập lại mật khẩu','password','new-password','Nhập lại mật khẩu'):''}${mode==='login'?'<a href="#/forgot" class="auth-forgot">Quên mật khẩu?</a>':''}<p id="auth-message" class="auth-message" role="status" aria-live="polite" hidden></p><button class="btn orange auth-submit" type="submit">${forgot?'Gửi liên kết':reset?'Lưu mật khẩu':title}${icon('arrow')}</button></form>${mode==='login'||signup?`<div class="auth-divider"><span></span>Hoặc<span></span></div><button class="btn white auth-google" data-action="auth-google"><img src="./assets/images/google.svg" width="22" height="22" alt="">Tiếp tục với Google</button><p class="auth-switch">${signup?'Đã có tài khoản? <a href="#/login">Đăng nhập</a>':'Chưa có tài khoản? <a href="#/register">Đăng ký</a>'}</p>`:'<a href="#/login" class="auth-switch">Quay lại đăng nhập</a>'}<a href="#/" class="auth-guest">Dùng thử không cần tài khoản ${icon('arrow')}</a></div></section></div>`;
 if(reset&&!accountRecovery)accountMessage('Hãy mở liên kết đặt lại mật khẩu trong email trước.',true);
}
function renderAccount(){
 if(!accountUser){renderAuth('login');return;}
 const name=accountUser.user_metadata?.display_name||accountUser.email?.split('@')[0]||'Bạn',total=days.reduce((n,d)=>n+d.words.length,0),known=days.reduce((n,d)=>n+remembered(d),0);
 app.innerHTML=`<section class="page-head"><div class="eyebrow muted">Góc học của bạn</div><h1>Tài khoản</h1></section><div class="account-layout"><section class="account-card"><div class="account-identity"><span class="account-avatar">${esc(Array.from(name)[0]?.toUpperCase()||'T')}</span><div><h2>${esc(name)}</h2><p>${esc(accountUser.email||'')}</p></div></div><span class="account-badge">${icon('check')} Đã đăng nhập</span></section><section class="account-counts" aria-label="Sổ từ trên thiết bị này"><div class="yellow"><span>Từ đã lưu</span><strong>${total}</strong></div><div class="blue"><span>Đã nhớ</span><strong>${known}</strong></div><div class="orange"><span>Ngày ôn liên tiếp</span><strong>${ReviewEngine.streak(activity,C.isoToday())}</strong></div></section><section class="panel account-settings"><h2>Thông tin cá nhân</h2><form id="profile-form" class="dialog-form"><label for="profile-name">Tên hiển thị</label><input id="profile-name" value="${esc(name)}" maxlength="100" autocomplete="nickname" required><p id="auth-message" class="auth-message" role="status" hidden></p><button class="btn yellow" type="submit">Lưu thay đổi</button></form></section><section class="panel account-settings"><h2>Sổ từ của bạn</h2><p class="hint">Từ đã lưu và tiến trình học hiện được giữ trên thiết bị này. Bạn có thể xuất bản sao để chuyển sang thiết bị khác.</p><button class="btn blue wfull" data-action="backup">${icon('archive')}Sao lưu / khôi phục</button><div class="line"></div><button class="btn outline wfull" data-action="auth-signout">Đăng xuất</button></section></div>`;
}
async function submitAuth(form){
 if(accountBusy)return;
 const mode=form.dataset.mode,password=$('#auth-password')?.value||'',email=$('#auth-email')?.value.trim()||'';
 if(!accountConnection.enabled){accountMessage('Đăng nhập hiện chưa sẵn sàng. Bạn vẫn có thể dùng app không cần tài khoản.',true);return;}
 if((mode==='register'||mode==='reset-password')&&password!==$('#auth-confirm').value){accountMessage('Hai mật khẩu chưa khớp nhau.',true);return;}
 if(mode==='reset-password'&&(!accountRecovery||!accountUser)){accountMessage('Hãy yêu cầu liên kết đặt lại mật khẩu mới.',true);return;}
 const button=form.querySelector('button[type="submit"]');accountBusy=true;if(button)button.disabled=true;form.setAttribute('aria-busy','true');
 try{
  let result;
  if(mode==='login')result=await accountConnection.client.auth.signInWithPassword({email,password});
  if(mode==='register')result=await accountConnection.client.auth.signUp({email,password,options:{emailRedirectTo:accountConnection.redirectUrl,data:{display_name:$('#auth-name').value.trim().slice(0,100)}}});
  if(mode==='forgot')result=await accountConnection.client.auth.resetPasswordForEmail(email,{redirectTo:accountConnection.redirectUrl});
  if(mode==='reset-password')result=await accountConnection.client.auth.updateUser({password});
  if(result.error)throw result.error;
  if(mode==='forgot'){accountMessage('Nếu email này có tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu.');return;}
  if(mode==='register'&&!result.data.session){accountMessage('Kiểm tra hộp thư để xác nhận email, rồi quay lại đăng nhập.');form.querySelectorAll('input[type="password"]').forEach(input=>input.value='');return;}
  accountUser=result.data.user||result.data.session?.user||accountUser;accountRecovery=false;updateAccountHeader();go('#/account');
  if(mode==='reset-password')toast('Đã cập nhật mật khẩu.');
 }catch(error){accountMessage(TuTuAuth.errorMessage(error),true);}
 finally{accountBusy=false;if(button?.isConnected)button.disabled=false;form.setAttribute('aria-busy','false');}
}
async function initializeAccount(){
 const callback=TuTuAuth.callbackKind(location.href||'https://local.invalid/');
 try{
  accountConnection=TuTuAuth.create(globalThis.TUTU_SUPABASE,globalThis.supabase,location.href||'https://local.invalid/');
  if(!accountConnection.enabled){if(callback){history.replaceState(null,'',location.pathname+'#/login');route();accountMessage('Đăng nhập hiện chưa sẵn sàng.',true);}return;}
  accountConnection.client.auth.onAuthStateChange((event,session)=>{
   accountUser=session?.user||null;
   if(event==='PASSWORD_RECOVERY')accountRecovery=true;
   updateAccountHeader();
   /* Never call another async Supabase method inside this callback. */
   if(event==='SIGNED_OUT'&&accountPage()==='account')go('#/login');
  });
  const {data,error}=await accountConnection.client.auth.getSession();if(error)throw error;
  accountUser=data.session?.user||null;updateAccountHeader();
  if(callback){
   accountRecovery=callback==='recovery'&&!!accountUser;
   history.replaceState(null,'',location.pathname+(accountRecovery?'#/reset-password':accountUser?'#/account':'#/login'));route();
   if(callback==='error'||!accountUser)accountMessage('Liên kết không còn hợp lệ. Hãy đăng nhập hoặc yêu cầu liên kết mới.',true);
  }else if(accountPage()==='account')renderAccount();
  else if(accountPage()==='reset-password'&&accountUser){accountRecovery=true;renderAuth('reset-password');}
 }catch(error){if(callback){history.replaceState(null,'',location.pathname+'#/login');route();}accountMessage(TuTuAuth.errorMessage(error),true);}
}
document.addEventListener('submit',event=>{
 if(event.target.id==='auth-form'){event.preventDefault();void submitAuth(event.target);}
 if(event.target.id==='profile-form'){event.preventDefault();if(accountBusy||!accountUser)return;accountBusy=true;const name=$('#profile-name').value.trim().slice(0,100),button=event.target.querySelector('button');button.disabled=true;accountConnection.client.auth.updateUser({data:{display_name:name}}).then(({data,error})=>{if(error)throw error;accountUser=data.user;updateAccountHeader();renderAccount();toast('Đã lưu tên hiển thị.');}).catch(error=>accountMessage(TuTuAuth.errorMessage(error),true)).finally(()=>{accountBusy=false;button.disabled=false;});}
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
 if(button.dataset.action==='auth-password'){const input=$('#'+button.dataset.target),show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-label',show?'Ẩn mật khẩu':'Hiện mật khẩu');button.setAttribute('aria-pressed',String(show));}
 if(button.dataset.action==='auth-signout'){
  if(accountBusy)return;accountBusy=true;button.disabled=true;
  try{const {error}=await accountConnection.client.auth.signOut({scope:'local'});if(error)throw error;accountUser=null;accountRecovery=false;updateAccountHeader();go('#/login');}catch(error){accountMessage(TuTuAuth.errorMessage(error),true);}finally{accountBusy=false;button.disabled=false;}
 }
 if(button.dataset.action==='auth-google'){
  if(!accountConnection.enabled){accountMessage('Đăng nhập hiện chưa sẵn sàng. Hãy thử lại sau.',true);return;}
  if(accountBusy)return;accountBusy=true;button.disabled=true;
  try{const {error}=await accountConnection.client.auth.signInWithOAuth({provider:'google',options:{redirectTo:accountConnection.redirectUrl}});if(error)throw error;}catch(error){accountMessage(TuTuAuth.errorMessage(error),true);}finally{accountBusy=false;button.disabled=false;}
 }
});
