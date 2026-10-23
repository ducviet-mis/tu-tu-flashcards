// features/words.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
function bulkOpen(){
  bulkDate=selected;
  utilityOpen(utilityHeader('GÓP NHẶT<br>Nhiều từ mới.')+`<p class="hint">Mỗi dòng một từ và nghĩa. Dùng dấu <strong> - </strong>, <strong> – </strong>, <strong> : </strong>, <strong> = </strong> hoặc Tab để ngăn cách.</p>${topicField('bulk-topic')}<label class="field-label" for="bulk-text">Dán danh sách từ của bạn</label><textarea id="bulk-text" placeholder="apple - quả táo&#10;dock : bến tàu&#10;assemble = lắp ráp"></textarea><div class="preview-caption eyebrow" id="bulk-count" role="status">Nhận diện được 0 từ</div><div class="preview-list" id="bulk-preview"></div><p class="muted tiny" id="bulk-skipped"></p><button class="btn purple wfull" style="margin-top:22px" id="bulk-add" data-action="bulk-add" disabled>Thêm 0 từ</button>`);
}
function bulkParsed(){
  const p=C.parseBulk($('#bulk-text').value);
  let duplicateExisting=0;
  p.words=p.words.filter(w=>{
    const duplicate=day(bulkDate).words.some(x=>C.wordKey(x.en)===C.wordKey(w.en));
    if(duplicate)duplicateExisting++;
    return!duplicate;
  }
  );
  p.duplicates+=duplicateExisting;
  return p;
}
function bulkPreview(){
  const p=bulkParsed();
  $('#bulk-count').textContent='Nhận diện được '+p.words.length+' Từ';
  $('#bulk-preview').innerHTML=p.words.slice(0,200).map(w=>`<span class="pill">${esc(w.en)}</span>`).join('');
  $('#bulk-skipped').textContent=(p.invalid?'Bỏ qua '+p.invalid+' dòng lỗi. ':'')+(p.duplicates?'Bỏ qua '+p.duplicates+' từ trùng. ':'')+(p.words.length>200?'Hiện 200 từ đầu.':'');
  $('#bulk-add').textContent='Thêm '+p.words.length+' Từ';
  $('#bulk-add').disabled=!p.words.length;
}
function editOpen(id){
  const w=day().words.find(w=>w.id===id);
  if(!w)return;
  editId={
    id,date:selected
  }
  ;
  utilityOpen(utilityHeader('Sửa từ vựng.')+`<form id="edit-form" class="dialog-form"><div><label class="field-label" for="edit-en">Tiếng Anh</label><input id="edit-en" value="${esc(w.en)}" maxlength="200" required></div><div><label class="field-label" for="edit-vi">Tiếng Việt</label><input id="edit-vi" value="${esc(w.vi)}" maxlength="1000" required></div>${topicField('edit-topic',w.topic||'')}<div><label class="field-label" for="edit-example">Ví dụ tiếng Anh</label><textarea id="edit-example" maxlength="1000">${esc(w.example||'')}</textarea><label class="field-label" for="edit-example-vi">Dịch ví dụ</label><input id="edit-example-vi" maxlength="1000" value="${esc(w.exampleVi||'')}"></div><button type="submit" class="btn purple">Lưu thay đổi</button></form>`);
}
function deleteWord(id){
  const date=selected,d=day(date),index=d.words.findIndex(w=>w.id===id);
  if(index<0)return;
  const [word]=d.words.splice(index,1);
  persist();
  renderBase();
  toast('Đã xóa “'+word.en+'”.',()=>{
    const dest=ensureDay(date);
    if(dest.words.some(w=>C.wordKey(w.en)===C.wordKey(word.en))){
      toast('Từ này đã được thêm lại trong ngày.');
      return;
    }
    dest.words.splice(Math.min(index,dest.words.length),0,word);
    persist();
    renderBase();
  }
  );
}
