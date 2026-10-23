/* Header account disclosure. Identity comes from the current Auth session. */
'use strict';
function accountDisplayName(user=accountUser){
 return String(user?.user_metadata?.display_name||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Bạn').trim()||'Bạn';
}
function accountAvatar(className='account-avatar'){
 return `<span class="${className}" aria-hidden="true">${esc(Array.from(accountDisplayName())[0]?.toUpperCase()||'T')}</span>`;
}
function renderAccountMenu(){
 const menu=$('#account-menu');if(!menu)return;
 const signedIn=!!accountUser,name=signedIn?accountDisplayName():'Góc học của bạn';
 menu.innerHTML=`<a class="account-menu-identity" href="${signedIn?'#/account':'#/login'}">${signedIn?accountAvatar('account-menu-avatar'):`<span class="account-menu-avatar" aria-hidden="true">${icon('user')}</span>`}<span class="account-menu-person"><strong>${esc(name)}</strong><span class="account-menu-email">${signedIn?esc(accountUser.email||''):'Mỗi ngày một chút, nhớ lâu hơn.'}</span><span class="account-menu-badge">${signedIn?icon('check')+'Đã đăng nhập':'Đang dùng thử'}</span></span></a>
 <p class="account-menu-data-status" data-account-data-status role="status">${esc(accountDataStatusText())}</p><nav class="account-menu-links" aria-label="Tài khoản">${signedIn?`<a href="#/account">${icon('user')}<span>Thông tin cá nhân</span></a>`:`<a href="#/login">${icon('user')}<span>Đăng nhập</span></a><a href="#/register">${icon('plus')}<span>Tạo tài khoản</span></a>`}<a href="#/settings">${icon('settings')}<span>Cài đặt</span></a></nav>
 <div class="account-menu-theme"><span>Giao diện</span>${themeControls(preferences.theme,'account-theme')}</div>
 <button class="account-menu-action" type="button" data-action="account-help">${icon('help')}<span>Trợ giúp</span></button>
 ${signedIn?`<div class="account-menu-divider"></div><button type="button" class="account-menu-action account-menu-signout" data-action="auth-signout">${icon('logout')}<span>Đăng xuất</span></button>`:''}`;
}
function closeAccountMenu(returnFocus=false){
 const menu=$('#account-menu'),button=$('#header-account');if(!menu||menu.hidden)return;
 menu.hidden=true;$('#account-menu-backdrop').hidden=true;button.setAttribute('aria-expanded','false');
 $('.account-menu-anchor')?.classList.remove('is-open');
 if(returnFocus)button.focus({preventScroll:true});
}
function openAccountMenu(focusFirst=false){
 const menu=$('#account-menu');if(!menu)return;
 closeHomeSuggestions();closeSuggestions();renderAccountMenu();menu.hidden=false;$('#account-menu-backdrop').hidden=false;
 $('#header-account').setAttribute('aria-expanded','true');$('.account-menu-anchor')?.classList.add('is-open');
 if(focusFirst)menu.querySelector('a,button')?.focus();
}
function accountHelp(){
 closeAccountMenu(true);utilityOpen(`${utilityHeader('Dùng Từ Từ')}<div class="account-help-content"><h3>Gặp từ lạ? Tra ở trang chủ</h3><p>Nhập tiếng Anh hoặc tiếng Việt, chọn từ để xem nghĩa và nghe phát âm.</p><h3>Gom những từ bạn muốn nhớ</h3><p>Lưu từ vào sổ, thêm ví dụ nếu cần. Mục Ôn tập sẽ gom các từ đến lịch ôn cho bạn.</p><h3>Học theo cách của bạn</h3><p>Mở Cài đặt trong menu avatar để đổi giao diện, mục tiêu ôn và tốc độ phát âm.</p><button type="button" class="btn yellow wfull" data-action="account-help-settings">Mở cài đặt ${icon('arrow')}</button></div>`);
}
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-action]')?.dataset.action;
 if(action==='account-menu-toggle'){const menu=$('#account-menu');menu.hidden?openAccountMenu():closeAccountMenu();return;}
 if(action==='account-menu-close'){closeAccountMenu(true);return;}
 if(action==='account-help'){accountHelp();return;}
 if(action==='account-help-settings'){utility.close();go('#/settings');return;}
 if(action==='account-theme'){const button=event.target.closest('[data-value]');setQuickTheme(button.dataset.value);return;}
 if(!$('#account-menu')?.hidden&&(!event.target.closest('.account-menu-anchor')||event.target.closest('a')||action==='auth-signout'))closeAccountMenu();
});
document.addEventListener('keydown',event=>{
 const key=event.key||event.code;
 if(key==='Escape'&&!$('#account-menu')?.hidden){event.preventDefault();closeAccountMenu(true);}
 if(key==='ArrowDown'&&event.target.id==='header-account'){event.preventDefault();openAccountMenu(true);}
});
document.addEventListener('focusin',event=>{if(!$('#account-menu')?.hidden&&!event.target.closest('.account-menu-anchor'))closeAccountMenu();});
