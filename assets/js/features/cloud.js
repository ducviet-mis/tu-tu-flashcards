// features/cloud.js — phần chức năng của Từ Từ. Trạng thái chung được khai báo trong state.js.
'use strict';
function cloudOpen(){
  utilityOpen(utilityHeader('MANG từ vựng<br>Đi cùng bạn.','Đồng bộ Supabase')+`<p class="hint">Tùy chọn đồng bộ giữa các thiết bị. Điền cấu hình sau khi chạy file <strong>supabase.sql</strong>. Chỉ kết nối khi bạn bấm tải lên hoặc tải xuống.</p><form class="dialog-form" id="cloud-form"><div><label class="field-label" for="cloud-url">Địa chỉ dự án Supabase</label><input id="cloud-url" type="url" placeholder="https://ten-du-an.supabase.co" value="${esc(cloud.url)}" required></div><div><label class="field-label" for="cloud-api">Khóa công khai (publishable / anon)</label><input id="cloud-api" type="password" class="key-input" value="${esc(cloud.apiKey)}" placeholder="sb_publishable_..." autocomplete="off" required></div><div><label class="field-label" for="cloud-key">Mã đồng bộ riêng của bạn</label><input id="cloud-key" type="password" class="key-input" value="${esc(cloud.key)}" placeholder="Tạo mã mới hoặc dán mã từ máy khác" autocomplete="off" required><div class="row wrap" style="margin-top:8px"><button class="btn outline small" type="button" data-action="generate-key">${icon('key')}Tạo mã</button><button class="btn outline small" type="button" data-action="show-key">Hiện / ẩn</button><button class="btn outline small" type="button" data-action="copy-key">${icon('copy')}Sao chép</button></div></div><div class="note"><strong>Giữ kín mã đồng bộ.</strong> Mã này thay cho mật khẩu của kho từ. Dùng cùng địa chỉ, khóa công khai và mã trên điện thoại. Không dùng khóa service_role hoặc sb_secret.</div><button class="btn purple wfull" type="submit">Lưu cấu hình</button></form><div class="line"></div><div class="cloud-grid"><button class="btn blue" data-action="cloud-push" ${cloudBusy?'disabled':''}>${icon('upload')}Tải lên</button><button class="btn yellow" data-action="cloud-pull" ${cloudBusy?'disabled':''}>${icon('download')}Tải xuống</button></div><div class="cloud-status" id="cloud-status" role="status">${cloud.url?'Đã có cấu hình. Bấm tải xuống trước khi sửa trên thiết bị thứ hai.':'Chưa cấu hình · App vẫn lưu trên thiết bị.'}</div><div class="cloud-danger"><button class="text-btn" data-action="disconnect">Xóa cấu hình đồng bộ trên thiết bị này</button></div>`);
}
function getCloudForm(){
  const url=$('#cloud-url').value.trim().replace(/\/+$/,''),apiKey=$('#cloud-api').value.trim(),key=$('#cloud-key').value.trim();
  let u;
  try{
    u=new URL(url);
  }
  catch(e){
    throw Error('Địa chỉ Supabase không hợp lệ.');
  }
  if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('Dùng địa chỉ HTTPS của dự án: https://ten-du-an.supabase.co');
  if(!apiKey||apiKey.startsWith('sb_secret_'))throw Error('Chỉ dùng khóa publishable hoặc anon công khai.');
  if(apiKey.startsWith('eyJ')){
    try{
      const data=JSON.parse(atob(apiKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      if(data.role!=='anon')throw Error('role');
    }
    catch(e){
      throw Error('JWT phải là khóa anon công khai, không dùng service_role.');
    }
  }
  else if(!/^sb_publishable_[\w-]+$/.test(apiKey))throw Error('Khóa công khai chưa đúng định dạng.');
  if(!/^[a-f0-9]{64}$/.test(key))throw Error('Mã đồng bộ gồm 64 ký tự hex. Bấm Tạo mã hoặc dán đúng mã từ máy kia.');
  return{
    url,apiKey,key
  }
  ;
}
function configureCloud(){
  if(cloudBusy)throw Error('Đang đồng bộ. Vui lòng chờ hoàn tất.');
  const next=getCloudForm(),same=next.url===cloud.url&&next.key===cloud.key;
  cloud={
    ...next,revision:same?cloud.revision:null
  }
  ;
  saveConfig();
  return cloud;
}
async function rpc(name,body,config){
  const headers={
    'Content-Type':'application/json',apikey:config.apiKey
  }
  ;
  if(config.apiKey.startsWith('eyJ'))headers.Authorization='Bearer '+config.apiKey;
  let res;
  try{
    res=await fetch(config.url+'/rest/v1/rpc/'+name,{
      method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000),credentials:'omit',referrerPolicy:'no-referrer'
    }
    );
  }
  catch(e){
    throw Error('Không kết nối được Supabase. Kiểm tra mạng, địa chỉ dự án rồi thử lại.');
  }
  const value=await res.json().catch(()=>null);
  if(!res.ok){
    if(value?.message?.includes('REVISION_CONFLICT'))throw Error('Thiết bị khác đã cập nhật kho. Hãy xuất file dự phòng, tải xuống bản mới, gộp file dự phòng rồi tải lên lại.');
    if(res.status===404)throw Error('Chưa tìm thấy hàm đồng bộ. Hãy chạy supabase.sql trong SQL Editor.');
    throw Error('Supabase từ chối yêu cầu ('+res.status+'). Kiểm tra khóa công khai, SQL và giới hạn dự án.');
  }
  return value;
}
async function cloudAction(kind){
  if(cloudBusy)return;
  try{
    configureCloud();
  }
  catch(e){
    toast(e.message,null,'',true);
    return;
  }
  const requestCloud={
    ...cloud
  }
  ;
  cloudBusy=true;
  utility.querySelectorAll('input,button').forEach(b=>{
    if(b.dataset.action!=='close-utility')b.disabled=true;
  }
  );
  utility.querySelectorAll('[data-action="cloud-push"],[data-action="cloud-pull"]').forEach(b=>b.disabled=true);
  const status=$('#cloud-status');
  if(status)status.textContent='Đang kết nối...';
  try{
    if(kind==='push'){
      const captured=JSON.stringify(days);
      const r=await rpc('flashcard_save',{
        p_key:cloud.key,p_days:JSON.parse(captured),p_expected_revision:requestCloud.revision??0
      }
      ,requestCloud);
      if(!C.sameVault(cloud,requestCloud))return;
      if(!Number.isSafeInteger(r?.revision))throw Error('Máy chủ trả về phiên bản không hợp lệ.');
      cloud.revision=r.revision;
      saveConfig();
      toast(JSON.stringify(days)===captured?'Đã tải dữ liệu lên Supabase.':'Đã tải bản chụp lên. Có thay đổi mới trên máy, hãy tải lên lần nữa.');
      if(status?.isConnected)status.textContent='Đã tải lên · phiên bản '+r.revision;
    }
    else{
      const r=await rpc('flashcard_load',{
        p_key:requestCloud.key
      }
      ,requestCloud);
      if(!C.sameVault(cloud,requestCloud))return;
      if(!r||r.days===null){
        if(status?.isConnected)status.textContent='Kho chưa có dữ liệu. Bạn có thể tải lên từ thiết bị này.';
        return;
      }
      if(!Number.isSafeInteger(r.revision))throw Error('Máy chủ trả về phiên bản không hợp lệ.');
      const incoming=C.validateBackup({
        version:1,days:r.days
      }
      );
      if(!utility.open)return;
      utility.innerHTML=utilityHeader('NHẬN DỮ LIỆU<br>Từ thiết bị khác.')+`<p class="hint">Kho có ${incoming.length} ngày, ${incoming.reduce((n,d)=>n+d.words.length,0)} từ. Chọn cách đưa vào thiết bị này.</p><button class="btn blue wfull" id="cloud-merge">Gộp với dữ liệu trên máy</button><button class="btn outline wfull" style="margin-top:12px" id="cloud-replace">Thay thế dữ liệu trên máy</button><p class="hint">Gộp giữ trạng thái và nghĩa của từ trên máy nếu bị trùng. Thay thế lấy đúng bản trên Supabase.</p>`;
      const apply=replace=>{
        if(!C.sameVault(cloud,requestCloud)){
          toast('Cấu hình kho đã thay đổi. Hãy tải lại từ kho đang chọn.',null,'',true);
          return;
        }
        const before=JSON.stringify(days);
        days=replace?incoming:C.mergeDays(days,incoming);
        if(replace)writeBlocked=false;
        cloud.revision=r.revision;
        saveConfig();
        persist();
        const applied=JSON.stringify(days);
        utility.close();
        renderBase();
        toast('Đã nhận dữ liệu từ Supabase.',()=>undoSnapshot(before,applied),'Hoàn tác');
      }
      ;
      $('#cloud-merge').onclick=()=>apply(false);
      $('#cloud-replace').onclick=()=>apply(true);
    }
  }
  catch(e){
    if(status?.isConnected)status.textContent=e.message;
    toast(e.message,null,'',true);
  }
  finally{
    cloudBusy=false;
    if($('#cloud-form'))utility.querySelectorAll('input,button').forEach(b=>b.disabled=false);
  }
}
