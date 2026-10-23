/* Responsive profile and settings screen; profile and preferences save independently. */
'use strict';
function accountJoinedLabel(){
 const value=accountUser?.created_at;if(!value)return '';
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 return `Tham gia ${String(date.getDate()).padStart(2,'0')}.${String(date.getMonth()+1).padStart(2,'0')}.${date.getFullYear()}`;
}
function profileIdentityContent(){
 const name=accountDisplayName(),joined=accountJoinedLabel();
 return `<div class="account-identity">${accountAvatar()}<div><h2>${esc(name)}</h2><p>${esc(accountUser.email||'')}</p>${joined?`<span class="profile-joined">${esc(joined)}</span>`:''}</div></div>`;
}
function profileInfoContent(){
 if(!accountUser)return `<h2 class="profile-section-label" id="profile-info-title">Góc học của bạn</h2><div class="profile-guest-card">${icon('user')}<h3>Cho góc học một cái tên</h3><p>Đăng nhập để quản lý thông tin tài khoản của bạn.</p><a href="#/login" class="btn orange wfull">Đăng nhập ${icon('arrow')}</a><a href="#/register" class="text-btn">Tạo tài khoản</a></div>`;
 const verified=!!(accountUser.email_confirmed_at||accountUser.confirmed_at);
 return `<h2 class="profile-section-label" id="profile-info-title">Thông tin cá nhân</h2><div class="profile-identity-card">${profileIdentityContent()}</div>
 <form id="profile-form" class="profile-form"><label class="profile-field" for="profile-name"><span>Tên hiển thị</span><input id="profile-name" name="display_name" value="${esc(accountDisplayName())}" maxlength="100" autocomplete="nickname" placeholder="Tên của bạn" required></label>
 <label class="profile-field" for="profile-email"><span>Email</span><span class="profile-email-wrap"><input id="profile-email" type="email" value="${esc(accountUser.email||'')}" readonly autocomplete="email">${verified?`<span class="profile-verified">${icon('check')}Đã xác minh</span>`:''}</span></label>
 <p id="auth-message" class="auth-message" role="status" aria-live="polite" hidden></p><button class="btn orange wfull" type="submit">Lưu thông tin ${icon('check')}</button></form>
 <button type="button" class="profile-link-row" data-action="profile-password"><span>${icon('key')}Đổi mật khẩu</span>${icon('arrow')}</button>
 <p class="profile-field-note">Nhận liên kết đổi mật khẩu qua email của bạn.</p><button type="button" class="btn outline wfull profile-signout" data-action="auth-signout">${icon('logout')}Đăng xuất</button>`;
}
function profileInfoMarkup(){return `<section class="profile-column profile-info" id="profile-info" data-profile-user="${esc(accountUser?.id||'')}" aria-labelledby="profile-info-title">${profileInfoContent()}</section>`;}
function refreshProfileInfo(){
 const panel=$('#profile-info'),userId=accountUser?.id||'';
 if(!panel||panel.getAttribute('data-profile-user')===userId)return;
 panel.innerHTML=profileInfoContent();panel.setAttribute('data-profile-user',userId);
}
function profileHasUnsavedChanges(){const input=$('#profile-name');return !!(input&&accountUser&&input.value.trim().normalize('NFC')!==accountDisplayName());}
function renderProfile(section='info'){
 pendingSettingsChanges=false;
 app.innerHTML=`<div class="profile-page" data-section="${section}"><header class="profile-heading"><a href="#/" class="round white" aria-label="Quay lại trang chủ">${icon('back')}</a><h1><span class="profile-title-desktop">Hồ sơ & cài đặt</span><span class="profile-title-mobile">${section==='settings'?'Cài đặt':'Hồ sơ'}</span></h1></header>
 <nav class="profile-tabs" aria-label="Hồ sơ và cài đặt"><a href="#/account" ${section==='info'?'aria-current="page"':''}>Thông tin</a><a href="#/settings" ${section==='settings'?'aria-current="page"':''}>Cài đặt</a></nav>
 <div class="profile-columns">${profileInfoMarkup()}<section class="profile-column profile-preferences" id="profile-settings" aria-labelledby="profile-settings-title"><h2 class="profile-section-label" id="profile-settings-title">Cài đặt học</h2>${preferencesFormMarkup()}${profileAppMarkup()}</section></div><p class="profile-footer">TỪ TỪ · Mỗi ngày một chút.</p></div>`;
 updateDictionaryStatus();
}
function renderAccount(){if(!accountUser){renderAuth('login');return;}renderProfile('info');}
async function saveProfile(form){
 if(accountBusy||!accountUser||!accountConnection.enabled)return;
 const name=$('#profile-name').value.trim().normalize('NFC');
 if(!name||name.length>100){accountMessage('Hãy nhập tên hiển thị từ 1 đến 100 ký tự.',true);$('#profile-name').focus();return;}
 const userId=accountUser.id,button=form.querySelector('button[type="submit"]'),input=$('#profile-name'),label=button.innerHTML;accountBusy=true;button.disabled=true;input.disabled=true;button.textContent='Đang lưu…';form.setAttribute('aria-busy','true');
 try{
  const {data,error}=await accountConnection.client.auth.updateUser({data:{display_name:name}});if(error)throw error;
  if(accountUser?.id!==userId)return;
  if(!data?.user||data.user.id!==userId)throw Error('Invalid profile response');
  accountUser=data.user;updateAccountHeader();
  if(form.isConnected){input.value=accountDisplayName();const card=$('.profile-identity-card');if(card)card.innerHTML=profileIdentityContent();accountMessage('Đã lưu thông tin cá nhân.');}
  toast('Đã lưu thông tin cá nhân.');
 }catch(error){if(form.isConnected&&accountUser?.id===userId)accountMessage(TuTuAuth.errorMessage(error),true);}
 finally{accountBusy=false;if(button.isConnected){button.disabled=false;button.innerHTML=label;}if(input.isConnected)input.disabled=false;form.setAttribute('aria-busy','false');}
}
async function sendProfilePassword(button){
 if(accountBusy||!accountUser||!accountConnection.enabled)return;
 const userId=accountUser.id,form=$('#profile-form');accountBusy=true;button.disabled=true;
 try{
  const {error}=await accountConnection.client.auth.resetPasswordForEmail(accountUser.email,{redirectTo:accountConnection.redirectUrl});if(error)throw error;
  if(form?.isConnected&&accountUser?.id===userId)accountMessage('Kiểm tra email của bạn để mở liên kết đổi mật khẩu.');
 }catch(error){if(form?.isConnected&&accountUser?.id===userId)accountMessage(TuTuAuth.errorMessage(error),true);}
 finally{accountBusy=false;if(button.isConnected)button.disabled=false;}
}
document.addEventListener('submit',event=>{if(event.target.id==='profile-form'){event.preventDefault();void saveProfile(event.target);}});
document.addEventListener('click',event=>{const button=event.target.closest('[data-action="profile-password"]');if(button&&!button.disabled)void sendProfilePassword(button);});
