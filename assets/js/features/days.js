// features/days.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
let dayListView={owner:null,date:null,filter:'all',query:''};
const dayMoreIcon='<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>';
function renderDayBase(){
 closeSuggestions();suggestionAutoMeaning=null;
 const current=day(),n=remembered(current),total=current.words.length,pct=total?Math.round(n/total*100):0;
 if(dayListView.owner!==dataOwner||dayListView.date!==current.date)dayListView={owner:dataOwner,date:current.date,filter:'all',query:''};
 const weekday=new Date(current.date+'T12:00:00').toLocaleDateString('vi-VN',{weekday:'long'});
 app.innerHTML=`<div class="notebook-page day-detail-page"><header class="day-detail-heading"><a class="day-back" href="#/notebook?view=days" aria-label="Quay lại sổ từ">${icon('back')}</a><span>Sổ từ · Theo ngày</span><details class="day-options"><summary class="round" aria-label="Tùy chọn ngày">${dayMoreIcon}</summary><div class="day-options-panel"><button type="button" data-action="bulk">${icon('copy')}Dán nhiều từ</button><button type="button" data-action="review">${icon('repeat')}Ôn các từ chưa nhớ</button></div></details></header>
 <div class="day-detail-layout"><aside class="day-overview" aria-label="Ngày học và thêm từ"><section class="day-hero" aria-labelledby="day-title"><span class="day-badge">${current.date===C.isoToday()?'Hôm nay · ':''}${esc(weekday)}</span><div class="day-date-line"><h1 id="day-title" aria-label="${esc(fullDate(current.date))}">${dateLabel(current.date)}</h1><div class="day-date-meta"><span id="day-total-count">${total} từ</span><span>${current.date.slice(0,4)}</span></div></div><div class="day-progress-row"><div id="day-progress" class="day-progress" role="progressbar" aria-label="Tiến độ ngày đang chọn" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div><p id="day-known">Đã nhớ ${n}/${total}</p></div></section>
 <div class="day-study-actions"><button type="button" class="day-study-button purple" data-action="start-flip">${icon('copy')}<span>Lật thẻ</span></button><button type="button" class="day-study-button yellow" data-action="start-match" aria-disabled="${total<3}">${icon('grid')}<span>Ghép cặp</span></button></div>
 <div class="day-study-actions day-typing-actions"><button type="button" class="day-study-button purple" data-action="start-type">${icon('edit')}<span>Gõ từ</span></button><button type="button" class="day-study-button yellow" data-action="start-listen">${icon('sound')}<span>Nghe gõ</span></button></div>
 <section class="day-entry-card" aria-labelledby="day-entry-title"><div class="day-entry-heading"><h2 id="day-entry-title">Thêm từ vào ${dateLabel(current.date)}</h2><button type="button" class="day-bulk-link" data-action="bulk">Dán nhiều từ ${icon('arrow')}</button></div>
 <form id="add-form"><div class="entry-grid"><div class="autocomplete-field"><label class="field-label" for="english">Từ tiếng Anh</label><div class="day-lookup-field"><input id="english" name="english" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestion-list" placeholder="vd: reluctant" maxlength="200" required autocomplete="off" autocapitalize="none" spellcheck="false"><button type="button" class="day-lookup" data-action="day-lookup" aria-label="Tra từ để điền nghĩa">${icon('search')}Tra</button></div><div id="word-suggestions" class="word-suggestions" hidden><div class="suggestion-status" id="suggestion-status" role="status" aria-live="polite"></div><div id="suggestion-list" class="suggestion-list" role="listbox" aria-label="Từ gợi ý từ kho"></div><p class="suggestion-tip">Chọn từ để tự điền nghĩa · ↑ ↓ rồi Enter</p></div></div>
 <div><label class="field-label" for="vietnamese">Nghĩa tiếng Việt</label><input id="vietnamese" name="vietnamese" placeholder="vd: miễn cưỡng" maxlength="1000" required autocomplete="off"></div></div>
 <details class="day-entry-extra"><summary>Chủ đề và ví dụ <span>(không bắt buộc)</span></summary><div>${topicField('word-topic')}<label class="field-label" for="word-example">Ví dụ tiếng Anh</label><textarea id="word-example" maxlength="1000" placeholder="Một câu có từ đang học..."></textarea><label class="field-label" for="word-example-vi">Dịch ví dụ</label><input id="word-example-vi" maxlength="1000"></div></details><button class="btn orange day-add-submit" type="submit">${icon('plus')}Thêm từ</button></form></section></aside>
 <section class="day-vocabulary" aria-label="Từ vựng trong ngày"><div class="day-list-toolbar"><nav class="day-word-filters" aria-label="Lọc từ theo trạng thái ghi nhớ">${[['all','Tất cả',total],['unknown','Chưa nhớ',total-n],['known','Đã nhớ',n]].map(([value,label,count])=>`<button type="button" data-action="day-filter" data-filter="${value}" aria-pressed="${dayListView.filter===value}">${label} <span>${count}</span></button>`).join('')}</nav><label class="search day-word-search">${icon('search')}<span class="sr-only">Tìm từ trong ngày</span><input id="word-search" placeholder="Tìm trong ngày" type="search" value="${esc(dayListView.query)}" autocomplete="off"></label></div><p id="list-count" class="day-list-count" role="status" aria-live="polite"></p><div class="word-list" id="word-list"></div></section></div></div>`;
 renderWords();$('#shell').classList.toggle('mobile-day',location.hash.startsWith('#/day/'));
}
function renderWords(){
 const list=$('#word-list');if(!list)return;
 const current=day(),query=C.bankFold($('#word-search')?.value||'');dayListView.query=$('#word-search')?.value||'';
 const words=current.words.filter(w=>(dayListView.filter==='all'||(dayListView.filter==='known'?w.remembered:!w.remembered))&&C.bankFold(w.en+' '+w.vi).includes(query));
 $('#list-count').textContent=words.length+' / '+current.words.length+' từ';
 list.innerHTML=words.length?words.map(w=>{
  const tools=`<button type="button" class="round" data-action="edit" data-id="${esc(w.id)}" aria-label="Sửa từ: ${esc(w.en)}">${icon('edit')}<span class="day-tool-label">Sửa từ</span></button><button type="button" class="round day-delete-word" data-action="delete" data-id="${esc(w.id)}" aria-label="Xóa từ: ${esc(w.en)}">${icon('trash')}<span class="day-tool-label">Xóa từ</span></button>`;
  return `<article class="word-row"><button type="button" class="status-dot ${w.remembered?'known':''}" data-action="toggle" data-id="${esc(w.id)}" aria-label="${w.remembered?'Đánh dấu chưa nhớ':'Đánh dấu đã nhớ'}: ${esc(w.en)}" aria-pressed="${w.remembered}"><span></span></button><div class="word-content"><div class="day-word-heading"><strong lang="en">${esc(w.en)}</strong>${w.dictionary?.ipa?`<span class="day-word-ipa" lang="en">${esc(w.dictionary.ipa)}</span>`:''}</div><small>${esc(w.vi)}</small></div><div class="word-tools">${speakerSupported||(typeof Audio!=='undefined'&&w.dictionary?.audio)?`<button type="button" class="round" data-action="speak" data-id="${esc(w.id)}" aria-label="Nghe phát âm: ${esc(w.en)}">${icon('sound')}</button>`:''}<div class="day-desktop-word-tools">${tools}</div><details class="day-word-menu"><summary class="round" aria-label="Thao tác với từ: ${esc(w.en)}">${dayMoreIcon}</summary><div class="day-word-menu-panel">${tools}</div></details></div></article>`;
 }).join(''):`<div class="empty-list">${current.words.length?'Chưa tìm thấy từ phù hợp.':'Chưa có từ nào. Thêm một từ mới ở khung nhập nhé.'}</div>`;
}
app.addEventListener('click',async event=>{
 const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
 if(button.dataset.action==='day-filter'){
  const filter=button.dataset.filter;if(!['all','unknown','known'].includes(filter))return;
  dayListView.filter=filter;app.querySelectorAll('[data-action="day-filter"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));renderWords();
 }
 if(button.dataset.action==='day-lookup'){
  const input=$('#english');if(!input)return;input.focus();clearTimeout(suggestionTimer);
  if(!input.value.trim()){toast('Nhập từ tiếng Anh để tra nghĩa.');return;}
  await updateSuggestions();
 }
});
function go(hash){
  if(location.hash===hash)route();
  else location.hash=hash;
}
function addToday(){
  selected=C.isoToday();
  go('#/day/'+selected);
  requestAnimationFrame(()=>$('#english')?.focus());
}
app.addEventListener('submit',e=>{
  if(e.target.id!=='add-form')return;
  e.preventDefault();
  const en=$('#english').value.trim().normalize('NFC'),vi=$('#vietnamese').value.trim().normalize('NFC');
  if(!en||!vi)return;
  const date=selected;
  if(day(date).words.some(w=>C.wordKey(w.en)===C.wordKey(en))){
    toast('Từ này đã có trong ngày. Bạn có thể sửa nghĩa của từ.',null,'',true);
    $('#english').focus();
    return;
  }
  ensureDay(date).words.push({
    id:C.uid(),en,vi,remembered:false,topic:$('#word-topic').value.trim().normalize('NFC'),example:$('#word-example')?.value.trim()||'',exampleVi:$('#word-example-vi')?.value.trim()||''
  }
  );
  persist();
  renderBase();
  $('#english').focus();
  toast('Đã thêm “'+en+'”.');
}
);
app.addEventListener('input',e=>{
  if(e.target.id==='word-search')renderWords();
}
);
