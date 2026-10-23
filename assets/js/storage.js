// storage.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
function storageError(message){
  $('#storage-warning').hidden=false;
  $('#storage-warning').textContent=message;
  $('#save-indicator').textContent='Chưa lưu được trên thiết bị';
}
try{
  const raw=localStorage.getItem(STORE);
  if(raw)days=C.validateBackup(JSON.parse(raw));
}
catch(e){
  writeBlocked=true;
  storageError('Không đọc được dữ liệu đã lưu. App đang giữ dữ liệu gốc và tạm dừng ghi để tránh mất từ.');
}
function persist(){
  C.sortDays(days);
  if(writeBlocked){
    storageError('Chưa lưu được: vùng dữ liệu cũ chưa đọc được. App đang tạm dừng ghi để tránh ghi đè dữ liệu.');
    return false;
  }
  try{
    localStorage.setItem(STORE,JSON.stringify({
      version:1,days
    }
    ));
    $('#storage-warning').hidden=true;
    $('#save-indicator').textContent='Đã lưu trên thiết bị';
    return true;
  }
  catch(e){
    storageError('Trình duyệt chặn lưu trữ hoặc bộ nhớ đã đầy. Từ mới chưa được lưu trên thiết bị. Hãy kiểm tra quyền lưu trữ và dung lượng.');
    return false;
  }
}
function day(date=selected){
  return days.find(d=>d.date===date)||{
    date,words:[]
  }
  ;
}
function ensureDay(date){
  let d=days.find(d=>d.date===date);
  if(!d){
    d={
      date,words:[]
    }
    ;
    days.push(d);
  }
  return d;
}
const remembered=d=>d.words.filter(w=>w.remembered).length;
const dateLabel=date=>date.slice(8,10)+'.'+date.slice(5,7);
const fullDate=date=>new Date(date+'T12:00:00').toLocaleDateString('vi-VN',{
  weekday:'long',day:'numeric',month:'long',year:'numeric'
}
);
