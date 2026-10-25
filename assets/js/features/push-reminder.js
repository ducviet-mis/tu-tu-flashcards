/* Settings-only reminder controls, applied immediately per browser/device. */
'use strict';
let pushReminderBusy=false;
const pushReminders=TuTuPush.create({config:globalThis.TUTU_PUSH||{},onChange:()=>updatePushReminder()});
function pushReminderContent(){
 const s=pushReminders.view(),labels={'pending-disable':'Chưa tắt xong — cần thử lại',storage:'Trình duyệt chưa cho phép lưu trữ',enabled:'Đang bật trên thiết bị này',off:'Chưa bật',blocked:'Đã bị chặn',unsupported:'Trình duyệt không hỗ trợ',install:'Thêm vào Màn hình chính để nhận thông báo',unconfigured:'Chưa cấu hình dịch vụ nhắc học',unconfirmed:'Chưa xác nhận được lịch nhắc trên máy chủ'};
 const unavailable=['unsupported','install','unconfigured','storage'].includes(s.status),hint=s.status==='blocked'?'Mở cài đặt trang web của trình duyệt → Thông báo → Cho phép, rồi tải lại Từ Từ.':s.status==='install'?'iPhone/iPad: dùng iOS 16.4 trở lên, mở Safari → Chia sẻ → Thêm vào Màn hình chính. Mở app từ biểu tượng vừa cài để bật thông báo.':'';
 return `<div class="profile-settings-group push-reminder-card"><label class="profile-setting-row" for="push-reminder-enabled"><span><strong>Nhắc ôn tập</strong><small id="push-reminder-status" role="status">${pushReminderBusy?'Đang cập nhật…':labels[s.status]}</small></span><input id="push-reminder-enabled" class="profile-toggle" type="checkbox" role="switch" ${s.enabled?'checked':''} ${pushReminderBusy||unavailable?'disabled':''}></label><div class="profile-setting-row"><label for="push-reminder-time"><strong>Giờ nhắc mỗi ngày</strong><small>Giờ Việt Nam · Asia/Ho_Chi_Minh</small></label><input id="push-reminder-time" type="time" value="${esc(s.time)}" ${s.mode!=='flexible'||pushReminderBusy?'disabled':''}></div><div class="push-reminder-actions"><button type="button" class="btn purple small" data-action="push-test" ${s.status!=='enabled'||pushReminderBusy?'disabled':''}>${icon('sound')}Gửi thử thông báo</button></div></div>${s.mode==='daily'?'<p class="profile-field-note">Lịch hiện tại cố định 20:00 mỗi ngày. Gói miễn phí có thể gửi trong khoảng 20:00–20:59.</p>':''}${hint?`<p class="profile-field-note push-help">${hint}</p>`:''}<p id="push-reminder-message" class="profile-field-note" role="status" aria-live="polite">${esc(s.message||'Nhắc riêng cho thiết bị này, kể cả khi bạn đã đóng app.')}</p>`;
}
function pushReminderMarkup(){return `<section id="push-reminder-section" aria-labelledby="push-reminder-heading"><h2 class="profile-section-label" id="push-reminder-heading">Nhắc ôn tập</h2><div id="push-reminder-content">${pushReminderContent()}</div></section>`;}
function updatePushReminder(){const el=$('#push-reminder-content');if(el)el.innerHTML=pushReminderContent();}
async function pushReminderAction(action){
 if(pushReminderBusy)return;pushReminderBusy=true;updatePushReminder();
 try{await action();}catch(error){toast(error.message||'Chưa cập nhật được thông báo.',null,'',true);}finally{pushReminderBusy=false;updatePushReminder();}
}
function initPushReminders(){return pushReminders.refresh();}
document.addEventListener('change',event=>{if(event.target.id==='push-reminder-enabled'){const on=event.target.checked;void pushReminderAction(()=>on?pushReminders.enable():pushReminders.disable());}if(event.target.id==='push-reminder-time'){const time=event.target.value;void pushReminderAction(()=>pushReminders.settings(time));}});
document.addEventListener('click',event=>{const b=event.target.closest('[data-action]');if(b?.dataset.action==='push-test')void pushReminderAction(()=>pushReminders.test());});
window.addEventListener('online',()=>void pushReminders.refresh());
window.addEventListener('focus',()=>void pushReminders.refresh());
