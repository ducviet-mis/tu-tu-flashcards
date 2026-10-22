// features/days.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
function dayTile(d,i){
  const today=d.date===C.isoToday(),n=remembered(d),pct=d.words.length?Math.round(n/d.words.length*100):0;
  const color=['orange','blue','yellow','mint'][i%4];
  return `<a href="#/day/${d.date}" class="day-tile ${today?'today':color} ${selected===d.date?'active':''}" ${selected===d.date?'aria-current="date"':''}><div class="tile-content">${today?'<div class="eyebrow">Hôm nay · một khởi đầu mới</div>':''}<div class="${today?'':'old-day-top'}"><div class="day-num">${dateLabel(d.date)}</div>${today?'':`<span class="eyebrow">${d.date.slice(0,4)} ${icon('arrow')}</span>`}</div>${today?`<div class="eyebrow">${d.words.length} từ vựng</div><span class="pill" style="margin-top:12px">Đã nhớ ${n}/${d.words.length}</span>`:`<div class="row between"><span class="eyebrow">${d.words.length} từ</span><span class="eyebrow">Đã nhớ ${n}/${d.words.length}</span></div>`}<div class="progress" role="progressbar" aria-label="Tiến độ ngày ${dateLabel(d.date)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div></div>${today?mascot():''}</a>`;
}
function renderBase(){
  closeSuggestions();
  suggestionAutoMeaning=null;
  const current=day(),n=remembered(current),count=days.reduce((s,d)=>s+d.words.length,0),known=days.reduce((s,d)=>s+remembered(d),0),today=day(C.isoToday());
  const virtualToday=days.some(d=>d.date===today.date)?[]:[today],tiles=C.sortDays([...days,...virtualToday]);
  app.innerHTML=`<section class="welcome"><div><div class="eyebrow muted">Góc học tập của bạn</div><h1>Mỗi ngày một chút.<br><span>Nhớ thêm rất nhiều.</span></h1></div><div class="total"><div><strong>${count}</strong><span class="eyebrow muted">Từ đã góp nhặt</span></div><div><strong>${known}</strong><span class="eyebrow muted">Từ đã nhớ</span></div></div></section><div class="dashboard">${count===0&& !location.hash.startsWith('#/day/')?`<section class="empty-home"><div><div class="eyebrow">Bộ thẻ đầu tiên của bạn</div><h2>Từ nhỏ hôm nay.<br>Tiến bộ ngày mai.</h2><p>Góp nhặt những từ bạn gặp mỗi ngày.<br>Lật một tấm thẻ, nhớ thêm một điều mới.</p><button class="btn white" data-action="add-today">${icon('plus')}Thêm từ đầu tiên</button><button class="text-btn" data-action="sample">Nạp dữ liệu mẫu</button></div>${mascot()}</section>`:`<aside class="days-col"><div class="section-label eyebrow">Nhật ký từ vựng</div>${tiles.map((d,i)=>(i>0&&tiles[i-1].date===C.isoToday()?'<div class="older-heading eyebrow muted">Những ngày trước</div>':'')+dayTile(d,Math.max(0,i-(tiles[0].date===C.isoToday()?1:0)))).join('')}<button class="btn white wfull" data-action="add-today">${icon('plus')}Thêm từ mới</button></aside><section class="detail panel"><a class="round white mobile-back" href="#/" aria-label="Quay về trang chủ">${icon('back')}</a><div class="detail-head"><div><div class="eyebrow muted">${current.date===C.isoToday()?'Hôm nay':'Bộ thẻ ngày'} · ${current.date.slice(0,4)}</div><h2 class="giant-date">${dateLabel(current.date)}</h2></div><span class="pill">${current.words.length} từ</span></div><div class="eyebrow muted">${esc(fullDate(current.date))}</div><div class="progress-caption mono"><span>Đã nhớ ${n}/${current.words.length}</span><span>${current.words.length?Math.round(n/current.words.length*100):0}%</span></div><div class="progress" aria-label="Tiến độ ngày đang chọn"><span style="width:${current.words.length?n/current.words.length*100:0}%"></span></div><form id="add-form"><div class="entry-grid"><div class="autocomplete-field"><label class="field-label" for="english">Tiếng Anh</label><input id="english" name="english" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="suggestion-list" placeholder="Một từ mới..." maxlength="200" required autocomplete="off" autocapitalize="none" spellcheck="false"><div id="word-suggestions" class="word-suggestions" hidden><div class="suggestion-status" id="suggestion-status" role="status" aria-live="polite"></div><div id="suggestion-list" class="suggestion-list" role="listbox" aria-label="Từ gợi ý từ kho"></div><p class="suggestion-tip">Chọn từ để tự điền nghĩa · ↑ ↓ rồi Enter</p></div></div><div><label class="field-label" for="vietnamese">Tiếng Việt</label><input id="vietnamese" name="vietnamese" placeholder="Nghĩa của từ..." maxlength="1000" required autocomplete="off"></div></div><details class="example-fields"><summary>Thêm ví dụ (không bắt buộc)</summary><label class="field-label" for="word-example">Ví dụ tiếng Anh (không bắt buộc)</label><textarea id="word-example" maxlength="1000" placeholder="Một câu có từ đang học..."></textarea><label class="field-label" for="word-example-vi">Dịch ví dụ</label><input id="word-example-vi" maxlength="1000"></details><div class="entry-bottom"><button type="button" class="text-btn" data-action="bulk">Dán nhiều từ cùng lúc</button><button class="btn white small" type="submit">${icon('plus')}Thêm</button></div></form><div class="mobile-study-buttons"><button class="btn purple" data-action="start-flip">${icon('flip')}Lật thẻ</button><button class="btn yellow" data-action="start-match" aria-disabled="${current.words.length<3}">${icon('grid')}Ghép cặp</button></div><div class="word-heading row between"><h3>Danh sách từ</h3><span class="eyebrow muted" id="list-count">${current.words.length} từ</span></div><label class="search"><span class="sr-only">Tìm từ vựng</span>${icon('search')}<input id="word-search" placeholder="Tìm từ hoặc nghĩa..." type="search" autocomplete="off"></label><div class="word-list" id="word-list"></div><div class="eyebrow muted" style="font-size:9px;margin-top:14px">Chấm xanh: đã nhớ · chấm rỗng: cần ôn</div></section><aside class="study-col"><div class="section-label eyebrow"><span>Một chút mỗi ngày</span>${icon('book')}</div><section class="panel study-panel"><h2>Gặp lại từ.<br>Ghi nhớ lâu hơn.</h2><p>Một lượt ôn ngắn. Một bước tiến mới.</p><div class="preview-deck"><div class="preview-card">${mascot()}<span class="eyebrow">Sẵn sàng lật thẻ?</span></div></div><div class="shortcut">Phím cách: lật thẻ<br>← Chưa nhớ &nbsp; · &nbsp; Đã nhớ →</div><div class="study-buttons"><button class="btn purple wfull" data-action="start-flip">${icon('flip')}Lật thẻ ${icon('arrow')}</button><button class="btn yellow wfull" data-action="start-match" aria-disabled="${current.words.length<3}">${icon('grid')}Ghép cặp ${icon('arrow')}</button></div></section><div class="review-card"><div><strong>${current.words.length-n}</strong><div class="eyebrow">Từ đang chờ bạn ôn lại</div></div><button class="round" data-action="review" aria-label="Ôn các từ chưa nhớ">${icon('arrow')}</button></div></aside>`}</div>`;
  renderWords();
  $('#shell').classList.toggle('mobile-day',location.hash.startsWith('#/day/'));
}
function renderWords(){
  const list=$('#word-list');
  if(!list)return;
  const query=C.wordKey($('#word-search')?.value||''),words=day().words.filter(w=>C.wordKey(w.en+' '+w.vi).includes(query));
  $('#list-count').textContent=words.length+' Từ';
  list.innerHTML=words.length?words.map(w=>`<div class="word-row"><button class="status-dot ${w.remembered?'known':''}" data-action="toggle" data-id="${esc(w.id)}" aria-label="${w.remembered?'Đánh dấu chưa nhớ':'Đánh dấu đã nhớ'}: ${esc(w.en)}" aria-pressed="${w.remembered}"><span></span></button><div class="word-content"><strong>${esc(w.en)}</strong><small>${esc(w.vi)}</small></div><div class="word-tools">${speakerSupported?`<button class="round" data-action="speak" data-id="${esc(w.id)}" aria-label="Nghe phát âm: ${esc(w.en)}">${icon('sound')}</button>`:''}<button class="round" data-action="edit" data-id="${esc(w.id)}" aria-label="Sửa từ: ${esc(w.en)}">${icon('edit')}</button><button class="round" data-action="delete" data-id="${esc(w.id)}" aria-label="Xóa từ: ${esc(w.en)}">${icon('trash')}</button></div></div>`).join(''):`<div class="empty-list">${query?'Chưa tìm thấy từ phù hợp.':'Chưa có từ nào. Thêm một từ mới phía trên nhé.'}</div>`;
}
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
    id:C.uid(),en,vi,remembered:false,example:$('#word-example')?.value.trim()||'',exampleVi:$('#word-example-vi')?.value.trim()||''
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
