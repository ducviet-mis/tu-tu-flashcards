/* Preferences do not contain cloud credentials; cloud configuration remains separate. */
'use strict';
const PREF_STORE='tutu.preferences.v1',ACTIVITY_STORE='tutu.activity.v1';
let preferences={goal:10,rate:.85,autoSpeak:false,reverse:false,theme:'dark'},activity={};
let pendingSettingsChanges=false;
document.addEventListener('input',event=>{if(event.target.closest?.('#preferences-form'))pendingSettingsChanges=true;});
document.addEventListener('change',event=>{if(event.target.closest?.('#preferences-form'))pendingSettingsChanges=true;});
try{const p=JSON.parse(localStorage.getItem(PREF_STORE)||'null');if(p){preferences.goal=Number.isInteger(p.goal)&&p.goal>=1&&p.goal<=200?p.goal:10;preferences.rate=Number.isFinite(p.rate)&&p.rate>=.5&&p.rate<=1.5?p.rate:.85;preferences.autoSpeak=p.autoSpeak===true;preferences.reverse=p.reverse===true;preferences.theme=['dark','light','system'].includes(p.theme)?p.theme:'dark';}}catch{}
try{const a=JSON.parse(localStorage.getItem(ACTIVITY_STORE)||'{}');if(a&&typeof a==='object'&&!Array.isArray(a))for(const [date,v]of Object.entries(a))if(C.validDate(date)&&Number.isSafeInteger(v?.reviewed)&&v.reviewed>=0&&Number.isSafeInteger(v.correct)&&v.correct>=0&&v.correct<=v.reviewed)activity[date]={reviewed:v.reviewed,correct:v.correct};}catch{}
function applyTheme(){const light=preferences.theme==='light'||(preferences.theme==='system'&&window.matchMedia?.('(prefers-color-scheme: light)').matches);document.documentElement.setAttribute('data-theme',light?'light':'dark');const source=$('#brand-light-source');if(source)source.setAttribute('media',light?'all':'not all');const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',light?'#F4F1EA':'#1A1A1A');}
function themeControls(value,action='preference-theme'){
 return `<div class="theme-switch" role="group" aria-label="Chọn giao diện">${[['dark','Tối'],['light','Sáng'],['system','Tự động']].map(([v,label])=>`<button type="button" data-action="${action}" data-value="${v}" aria-pressed="${value===v}">${label}</button>`).join('')}</div>`;
}
function updateThemeControls(value){
 document.querySelectorAll('[data-action="preference-theme"],[data-action="account-theme"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===value)));
}
function setQuickTheme(theme){
 if(!['dark','light','system'].includes(theme))return;
 const next={...preferences,theme};
 try{localStorage.setItem(PREF_STORE,JSON.stringify(next));preferences=next;applyTheme();if($('#pref-theme'))$('#pref-theme').value=theme;updateThemeControls(theme);}
 catch{toast('Chưa lưu được giao diện.',null,'',true);}
}
function preferencesFormMarkup(){
 return `<form id="preferences-form" class="profile-preferences-form"><div class="profile-settings-group">
 <div class="profile-setting-row"><label for="pref-goal"><strong>Mục tiêu mỗi ngày</strong><small>Lượt ôn</small></label><div class="goal-stepper"><button type="button" class="goal-less" data-action="preference-goal" data-step="-1" aria-label="Giảm mục tiêu mỗi ngày">${icon('minus')}</button><input id="pref-goal" type="number" inputmode="numeric" min="1" max="200" value="${preferences.goal}" required><button type="button" class="goal-more" data-action="preference-goal" data-step="1" aria-label="Tăng mục tiêu mỗi ngày">${icon('plus')}</button></div></div>
 <label class="profile-setting-row" for="pref-speak"><span><strong>Tự đọc khi mở thẻ</strong><small>Nghe phát âm tiếng Anh</small></span><input id="pref-speak" class="profile-toggle" type="checkbox" role="switch" ${preferences.autoSpeak?'checked':''}></label>
 <div class="profile-setting-row"><label for="pref-rate"><strong>Tốc độ phát âm</strong></label><select id="pref-rate" class="profile-rate">${[.6,.85,1,1.2].map(rate=>`<option value="${rate}" ${rate===preferences.rate?'selected':''}>${rate}×</option>`).join('')}</select></div>
 <label class="profile-setting-row" for="pref-reverse"><span><strong>Tiếng Việt trước</strong><small>Trong lượt học mới</small></span><input id="pref-reverse" class="profile-toggle" type="checkbox" role="switch" ${preferences.reverse?'checked':''}></label>
 </div><h3 class="profile-section-label">Giao diện</h3><div class="profile-settings-group profile-theme-row"><input id="pref-theme" type="hidden" value="${preferences.theme}">${themeControls(preferences.theme)}</div><p class="profile-field-note">Tự động thay đổi sáng / tối theo thiết bị.</p><p id="preferences-message" class="auth-message" role="status" aria-live="polite" hidden></p><button class="btn orange wfull" type="submit">Lưu cài đặt ${icon('check')}</button></form>`;
}
function profileAppMarkup(){
 return `<h2 class="profile-section-label">Ứng dụng & dữ liệu</h2><div class="profile-settings-group profile-app-group"><button type="button" class="profile-setting-row" data-action="backup"><span><strong>Sao lưu / khôi phục</strong><small>Giữ một bản sổ từ của bạn</small></span>${icon('arrow')}</button><button type="button" class="profile-setting-row" data-action="cloud"><span><strong>Đồng bộ giữa thiết bị</strong><small>Kết nối kho lưu trữ của bạn</small></span>${icon('cloud')}</button><button type="button" class="profile-setting-row" data-action="pwa-install"><span><strong>Cài Từ Từ</strong><small id="pwa-status">${esc(pwaStatus)}</small></span>${icon('download')}</button><button type="button" class="profile-setting-row" data-action="offline-dictionary"><span><strong>Từ điển ngoại tuyến</strong><small>Tải kho từ để tra khi mất mạng</small></span>${icon('book')}</button></div><p class="profile-field-note" id="dictionary-status">Giao diện và sổ từ dùng được ngoại tuyến sau khi sẵn sàng.</p>`;
}
function renderSettings(){renderProfile('settings');}
document.addEventListener('submit',event=>{
 if(event.target.id!=='preferences-form')return;event.preventDefault();
 const goal=Number($('#pref-goal').value),rate=Number($('#pref-rate').value),theme=$('#pref-theme').value,message=$('#preferences-message');
 if(!Number.isInteger(goal)||goal<1||goal>200||![.6,.85,1,1.2].includes(rate)||!['dark','light','system'].includes(theme)){message.hidden=false;message.classList.add('error');message.textContent='Kiểm tra lại mục tiêu, tốc độ và giao diện.';return;}
 const next={goal,rate,theme,autoSpeak:$('#pref-speak').checked,reverse:$('#pref-reverse').checked};
 try{localStorage.setItem(PREF_STORE,JSON.stringify(next));preferences=next;pendingSettingsChanges=false;applyTheme();updateThemeControls(theme);message.hidden=false;message.classList.remove('error');message.textContent='Đã lưu cài đặt trên thiết bị này.';toast('Đã lưu cài đặt.');}
 catch{message.hidden=false;message.classList.add('error');message.textContent='Chưa lưu được cài đặt. Hãy thử lại.';}
});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
 if(button.dataset.action==='preference-goal'){const input=$('#pref-goal'),value=Number(input.value);input.value=String(Math.max(1,Math.min(200,(Number.isFinite(value)?Math.round(value):10)+Number(button.dataset.step))));pendingSettingsChanges=true;}
 if(button.dataset.action==='preference-theme'&&['dark','light','system'].includes(button.dataset.value)){$('#pref-theme').value=button.dataset.value;document.querySelectorAll('[data-action="preference-theme"]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));pendingSettingsChanges=true;}
});
