// features/backup.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
function backupOpen(){
  pendingImport=null;
  utilityOpen(utilityHeader('CẤT GIỮ<br>Những từ đã học.')+`<p class="hint">Tải một bản sao về máy. File chỉ chứa từ vựng và trạng thái đã nhớ, không chứa mã đồng bộ.</p><button class="btn blue wfull" data-action="export">${icon('download')}Xuất file JSON</button><div class="line"></div><h3>Khôi phục từ file</h3><p class="hint">Chọn file sao lưu JSON của Từ Từ.</p><label class="field-label" for="import-file">Chọn file JSON</label><input id="import-file" type="file" accept=".json,application/json"><div class="stack" style="margin-top:16px"><label class="choice"><input type="radio" name="import-mode" value="merge" checked><span><strong>Gộp dữ liệu</strong><small>Giữ từ hiện có, chỉ thêm từ chưa có.</small></span></label><label class="choice"><input type="radio" name="import-mode" value="replace"><span><strong>Thay thế toàn bộ</strong><small>Khôi phục đúng dữ liệu trong file.</small></span></label></div><p class="cloud-status" id="import-status" role="status"></p><button class="btn purple wfull" data-action="import" id="import-btn" disabled>${icon('upload')}Nhập file</button>`);
}
function exportFile(){
  const blob=new Blob([JSON.stringify({
    app:'Từ Từ',version:1,exportedAt:new Date().toISOString(),days
  }
  ,null,2)],{
    type:'application/json;charset=utf-8'
  }
  ),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;
  a.download='tung-ngay-sao-luu-'+C.isoToday()+'.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  toast('Đã tạo file sao lưu để tải xuống.');
}
async function readImport(file){
  pendingImport=null;
  $('#import-btn').disabled=true;
  if(!file)return;
  if(file.size>10*1024*1024){
    $('#import-status').textContent='File quá lớn. Giới hạn là 10 MB.';
    return;
  }
  try{
    pendingImport=C.validateBackup(JSON.parse(await file.text()));
    $('#import-status').textContent='Hợp lệ: '+pendingImport.length+' ngày, '+pendingImport.reduce((s,d)=>s+d.words.length,0)+' từ.';
    $('#import-btn').disabled=false;
  }
  catch(e){
    $('#import-status').textContent=e instanceof SyntaxError?'File không phải JSON hợp lệ.':e.message;
    toast('Không nhập được file. Dữ liệu hiện có vẫn được giữ.',null,'',true);
  }
}
function undoSnapshot(before,applied){
  if(!C.canRestoreSnapshot(days,applied)){
    toast('Đã có thay đổi mới sau khi nhập. Giữ nguyên dữ liệu để tránh mất từ.',null,'',true);
    return;
  }
  days=JSON.parse(before);
  persist();
  renderBase();
}
function applyImport(){
  if(!pendingImport)return;
  const replace=$('input[name="import-mode"]:checked').value==='replace',before=JSON.stringify(days);
  days=replace?pendingImport:C.mergeDays(days,pendingImport);
  if(replace)writeBlocked=false;
  persist();
  const applied=JSON.stringify(days);
  utility.close();
  renderBase();
  toast(replace?'Đã thay thế dữ liệu từ file.':'Đã gộp dữ liệu từ file.',()=>undoSnapshot(before,applied),'Hoàn tác');
  pendingImport=null;
}
