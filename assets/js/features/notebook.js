/* Notebook views share saved words and review progress; topics are optional labels. */
'use strict';
let notebookSearch='';
let notebookVisibleLimit=40;
function notebookEntries(){
  return C.sortDays([...days]).flatMap(d=>d.words.map(word=>({date:d.date,word})));
}
function notebookTopics(entries=notebookEntries()){
  const groups=new Map();
  for(const entry of entries){
    const label=(entry.word.topic||'').trim(),key=C.wordKey(label);
    if(!groups.has(key))groups.set(key,{key,label:label||'Chưa phân chủ đề',entries:[]});
    groups.get(key).entries.push(entry);
  }
  return [...groups.values()].sort((a,b)=>!a.key?1:!b.key?-1:a.label.localeCompare(b.label,'vi'));
}
function topicField(id,value=''){
  const options=notebookTopics().filter(g=>g.key).map(g=>`<option value="${esc(g.label)}"></option>`).join('');
  return `<div class="topic-field"><label class="field-label" for="${id}">Chủ đề <span class="muted">(không bắt buộc)</span></label><input id="${id}" list="${id}-options" maxlength="60" value="${esc(value)}" placeholder="Ví dụ: Giao tiếp, Công việc..." autocomplete="off"><datalist id="${id}-options">${options}</datalist></div>`;
}
function notebookState(){
  const params=new URLSearchParams(location.hash.split('?')[1]||'');
  return {topics:params.get('view')==='topics',topic:params.has('topic')?C.wordKey(params.get('topic')):null};
}
function renderNotebook(){
  closeSuggestions();suggestionAutoMeaning=null;$('#shell').classList.remove('mobile-day');
  notebookVisibleLimit=40;
  const total=days.reduce((n,d)=>n+d.words.length,0),known=days.reduce((n,d)=>n+remembered(d),0),{topics}=notebookState();
  app.innerHTML=`<div class="notebook-page"><section class="notebook-heading"><div><div class="eyebrow muted">${total} từ · ${days.length} ngày đã lưu</div><h1>Sổ từ</h1><p id="notebook-known-count">Đã nhớ ${known}/${total} từ</p></div><button class="btn white small" data-action="quick-add">${icon('plus')}Thêm từ</button></section><div class="notebook-toolbar"><label class="search notebook-search">${icon('search')}<span class="sr-only">Tìm trong sổ từ</span><input id="notebook-search" type="search" value="${esc(notebookSearch)}" placeholder="Tìm trong sổ của tôi" autocomplete="off" maxlength="200"></label><nav class="notebook-tabs" aria-label="Cách xem sổ từ"><a href="#/notebook?view=days" ${topics?'':'aria-current="page"'}>Theo ngày</a><a href="#/notebook?view=topics" ${topics?'aria-current="page"':''}>Chủ đề</a></nav></div><div id="notebook-content"></div></div>`;
  renderNotebookContent();
}
function notebookWordRows(entries){
  return `<div class="notebook-words">${entries.map(({date,word:w})=>`<article class="notebook-word"><button class="status-dot ${w.remembered?'known':''}" data-action="notebook-toggle" data-date="${date}" data-id="${esc(w.id)}" aria-label="${w.remembered?'Đánh dấu chưa nhớ':'Đánh dấu đã nhớ'}: ${esc(w.en)}" aria-pressed="${w.remembered}"><span></span></button><div class="notebook-word-copy"><strong>${esc(w.en)}</strong><p>${esc(w.vi)}</p><div class="notebook-word-meta"><a href="#/day/${date}" aria-label="Mở sổ từ ngày ${date}">${dateLabel(date)} · ${date.slice(0,4)}</a><span>${esc(w.topic||'Chưa phân chủ đề')}</span></div></div><div class="notebook-word-tools">${speakerSupported?`<button class="round" data-action="notebook-speak" data-date="${date}" data-id="${esc(w.id)}" aria-label="Nghe phát âm: ${esc(w.en)}">${icon('sound')}</button>`:''}<button class="round" data-action="notebook-edit" data-date="${date}" data-id="${esc(w.id)}" aria-label="Sửa từ: ${esc(w.en)}">${icon('edit')}</button></div></article>`).join('')}</div>`;
}
function renderNotebookContent(){
  const content=$('#notebook-content');if(!content)return;
  const state=notebookState(),all=notebookEntries(),query=C.bankFold(notebookSearch).trim();
  let entries=all,group;
  if(state.topics&&state.topic!==null){
    group=notebookTopics(all).find(g=>g.key===state.topic);
    entries=group?.entries||[];
  }
  if(query)entries=entries.filter(({word:w,date})=>C.bankFold([w.en,w.vi,w.topic||'',date,dateLabel(date)].join(' ')).includes(query));
  const detail=state.topics&&state.topic!==null;
  const heading=detail?`<div class="notebook-topic-heading"><a href="#/notebook?view=topics">${icon('back')}Tất cả chủ đề</a><h2>${esc(group?.label||(state.topic?'Chủ đề này chưa có từ':'Chưa phân chủ đề'))}</h2></div>`:'';
  if(query||detail){
    content.innerHTML=heading+`<p class="notebook-result-count" role="status">${entries.length} từ${query?' tìm thấy':''}${entries.length>notebookVisibleLimit?` · Hiện ${notebookVisibleLimit} từ`:''}</p>`+(entries.length?notebookWordRows(entries.slice(0,notebookVisibleLimit))+(entries.length>notebookVisibleLimit?'<button class="btn outline small notebook-more" data-action="notebook-more">Xem thêm từ</button>':''):`<div class="notebook-empty"><h2>${query?'Không tìm thấy từ phù hợp':'Chưa có từ trong chủ đề này'}</h2><p>${query?'Thử từ tiếng Anh, nghĩa tiếng Việt hoặc tên chủ đề khác.':'Gán chủ đề khi thêm hoặc sửa từ để gom vào cùng một nhóm.'}</p></div>`);
    return;
  }
  if(state.topics){
    const groups=notebookTopics(all);
    content.innerHTML=groups.length?`<div class="notebook-grid notebook-topic-grid">${groups.map((g,i)=>{const n=g.entries.filter(e=>e.word.remembered).length;return `<a class="notebook-topic ${['orange','blue','yellow','mint'][i%4]}" href="#/notebook?view=topics&amp;topic=${encodeURIComponent(g.key)}"><div class="notebook-topic-copy"><h2>${esc(g.label)}</h2><span>${g.entries.length} từ</span></div><div class="notebook-topic-end"><span class="notebook-known">${n}/${g.entries.length}<span class="sr-only"> từ đã nhớ</span></span>${icon('arrow')}</div></a>`;}).join('')}</div><p class="notebook-hint">Thêm chủ đề khi thêm hoặc sửa từ. Các từ cùng chủ đề được gom từ mọi ngày.</p>`:`<div class="notebook-empty"><h2>Chưa có từ trong sổ</h2><p>Thêm từ đầu tiên và chọn một chủ đề bạn muốn học.</p><button class="btn purple small" data-action="quick-add">${icon('plus')}Thêm từ</button></div>`;
    return;
  }
  const today=C.isoToday(),list=C.sortDays(days.some(d=>d.date===today)?[...days]:[...days,day(today)]);
  const monthCounts=new Map();for(const d of list){const month=d.date.slice(0,7);monthCounts.set(month,(monthCounts.get(month)||0)+1);}
  let month='';
  content.innerHTML=`<div class="notebook-grid">${list.map((d,i)=>{
    const next=d.date.slice(0,7),count=monthCounts.get(next);
    const heading=next!==month?`<h2 class="notebook-month"><span>Tháng ${Number(d.date.slice(5,7))} · ${d.date.slice(0,4)}</span><span>${count} ngày</span></h2>`:'';month=next;
    return heading+notebookDayTile(d,Math.max(0,i-(list[0].date===today?1:0)));
  }).join('')}</div>`;
}
app.addEventListener('input',event=>{
  if(event.target.id!=='notebook-search')return;
  notebookSearch=event.target.value;notebookVisibleLimit=40;renderNotebookContent();
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(!button||button.disabled||!button.dataset.action.startsWith('notebook-'))return;
  const {action,id,date}=button.dataset;
  if(action==='notebook-more'){notebookVisibleLimit+=40;renderNotebookContent();$('[data-action="notebook-more"]')?.focus();return;}
  const w=day(date).words.find(word=>word.id===id);if(!w)return;
  if(action==='notebook-speak')speak(w.en);
  if(action==='notebook-edit'){selected=date;editOpen(id);}
  if(action==='notebook-toggle'){
    ReviewEngine.setRemembered(w,!w.remembered,C.isoToday());persist();renderNotebookContent();updateNav('notebook');
    $('#notebook-known-count').textContent=`Đã nhớ ${days.reduce((n,d)=>n+remembered(d),0)}/${days.reduce((n,d)=>n+d.words.length,0)} từ`;
    [...document.querySelectorAll('[data-action="notebook-toggle"]')].find(item=>item.dataset.id===id)?.focus();
  }
});
