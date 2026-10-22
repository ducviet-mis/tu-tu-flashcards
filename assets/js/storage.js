// storage.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
function storageError(message){
  $('#storage-warning').hidden=false;
  $('#storage-warning').textContent=message;
  $('#save-indicator').textContent='Chưa lưu được — hãy xuất file';
}
try{
  const raw=localStorage.getItem(STORE);
  if(raw)days=C.validateBackup(JSON.parse(raw));
}
catch(e){
  writeBlocked=true;
  storageError('Không đọc được dữ liệu đã lưu. App đang giữ bản gốc, chưa ghi đè. Hãy xuất bản sao nếu đang có từ trong phiên này; nhập file hợp lệ bằng “Thay thế” để khôi phục.');
}
try{
  const raw=localStorage.getItem(CONFIG);
  if(raw){
    const x=JSON.parse(raw);
    if(x&&typeof x.url==='string'&&typeof x.apiKey==='string'&&typeof x.key==='string')cloud={
      ...cloud,...x
    }
    ;
  }
}
catch(e){
}
function saveConfig(){
  try{
    localStorage.setItem(CONFIG,JSON.stringify(cloud));
    return true;
  }
  catch(e){
    toast('Không lưu được cấu hình đồng bộ trên trình duyệt này.',null,'',true);
    return false;
  }
}
function persist(){
  C.sortDays(days);
  if(writeBlocked){
    storageError('Chưa lưu được: vùng dữ liệu cũ đang được giữ để khôi phục. Hãy xuất file hoặc nhập bản hợp lệ bằng “Thay thế”.');
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
    storageError('Trình duyệt chặn lưu trữ hoặc bộ nhớ đã đầy. Từ hiện chỉ được giữ trong phiên này. Hãy Sao lưu → XUẤT FILE trước khi đóng trang.');
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
