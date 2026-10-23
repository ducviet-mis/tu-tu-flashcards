// ui.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
const paths={
  user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',home:'M3 11l9-8 9 8M5 10v11h5v-7h4v7h5V10',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3z',streak:'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-2 1-4 3-6 0 3 2 4 3 4-1-3-1-6 0-9z',chart:'M5 20v-8M12 20V4M19 20v-11',
  plus:'M12 5v14M5 12h14',arrow:'M5 12h14m-6-6 6 6-6 6',back:'m14 6-6 6 6 6',cloud:'M7 18a5 5 0 0 1-1-9.9A6 6 0 0 1 17.7 7 5.5 5.5 0 0 1 18 18M12 12v9m-3-3 3 3 3-3',archive:'M4 8h16v12H4zM3 4h18v4H3zM9 12h6',search:'m16 16 5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',sound:'m11 5-6 4H2v6h3l6 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',edit:'m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',check:'m5 12 4 4L19 6',flip:'M5 4h14v16H5zM9 9h7m-3-3 3 3-3 3',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',shuffle:'M3 5h3l12 14h3m-4-4 4 4-4 2M3 19h3l4-5m4-5 4-4h3m-4-2 4 2-4 4',reverse:'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',close:'m6 6 12 12M6 18 18 6',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',repeat:'M4 8a8 8 0 0 1 14-3l2 3M20 3v5h-5M20 16A8 8 0 0 1 6 19l-2-3M4 21v-5h5',key:'M14 7a5 5 0 1 1-2 4L4 19H1v-3l8-8a5 5 0 0 1 5-1',book:'M3 4h7l2 2 2-2h7v16h-7l-2 1-2-1H3zM12 6v15',copy:'M8 8h13v13H8zM16 8V3H3v13h5'
}
;
const icon=name=>`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.book}"/></svg>`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}
[c]));
function mascot(celebrate=false){
  return `<svg class="mascot" viewBox="0 0 220 180" fill="none" aria-hidden="true"><g transform="rotate(-15 93 95)"><rect x="40" y="30" width="110" height="130" rx="20" fill="#F7C948" stroke="#151515" stroke-width="3"/></g><g transform="rotate(10 132 98)"><rect x="80" y="28" width="112" height="135" rx="20" fill="#fff" stroke="#151515" stroke-width="3"/><path d="M112 80v10m43-10v10" stroke="#151515" stroke-width="6" stroke-linecap="round"/>${celebrate?'<path d="M116 109h35c-1 30-32 30-35 0Z" fill="#151515"/><path d="M123 128c5-7 14-7 21-1" stroke="#FF6F59" stroke-width="7"/>':'<path d="M118 111q17 20 33-1" stroke="#151515" stroke-width="3.5" stroke-linecap="round"/>'}</g><path d="m27 30 4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10Zm164-18 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#F7C948" stroke="#151515" stroke-width="2"/><path d="m204 133 3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="#8EE3F5" stroke="#151515" stroke-width="2"/></svg>`;
}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
function toast(message,action,label='Hoàn tác',error=false){
  const el=document.createElement('div');
  el.className='toast'+(error?' error':'');
  const span=document.createElement('span');
  span.textContent=message;
  el.append(span);
  if(action){
    const b=document.createElement('button');
    b.textContent=label;
    b.onclick=()=>{
      action();
      el.remove();
    }
    ;
    el.append(b);
  }
  $('#toasts').append(el);
  setTimeout(()=>el.remove(),action?7500:5000);
}
function utilityOpen(html){
  utility.classList.remove('bank-dialog');
  utility.setAttribute('data-view','');
  utilityReturn=document.activeElement;
  utility.innerHTML=html;
  utility.showModal();
}
function utilityHeader(title,eyebrow='Góc học từ vựng'){
  return `<div class="dialog-head"><button class="round white" data-action="close-utility" aria-label="Quay lại">${icon('back')}</button><span class="eyebrow">${eyebrow}</span></div><h2 id="utility-title">${title}</h2>`;
}
