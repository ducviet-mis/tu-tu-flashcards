/* Installation, offline readiness and explicit service worker updates. */
'use strict';
let installPrompt=null,waitingWorker=null,pwaStatus='Đang kiểm tra khả năng dùng ngoại tuyến…';
function setPwaStatus(text){pwaStatus=text;const target=$('#pwa-status');if(target)target.textContent=text;}
function showPwaUpdate(worker){waitingWorker=worker;const box=$('#pwa-notice');box.hidden=false;box.innerHTML='<span>Đã có phiên bản mới.</span><button class="btn white small" data-action="pwa-update">Cập nhật</button><button class="text-btn" data-action="pwa-dismiss">Để sau</button>';}
async function initPwa(){
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  window.addEventListener('appinstalled',()=>{installPrompt=null;toast('Đã cài Từ Từ.');});
  if(location.protocol==='file:'){setPwaStatus('Để cài app và dùng ngoại tuyến, mở bằng GitHub Pages hoặc máy chủ localhost.');return;}
  if(!('serviceWorker' in navigator)){setPwaStatus('Trình duyệt này chưa hỗ trợ lưu giao diện ngoại tuyến.');return;}
  try{
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    if(registration.waiting)showPwaUpdate(registration.waiting);
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showPwaUpdate(worker);});});
    await navigator.serviceWorker.ready;
    // V3 fonts are bundled with the shell and work offline without a font CDN.
    setPwaStatus('Giao diện đã sẵn sàng ngoại tuyến. Bộ thẻ của bạn được lưu trên thiết bị.');
  }catch{setPwaStatus('Chưa lưu được giao diện ngoại tuyến. Kiểm tra kết nối và mở bằng HTTPS hoặc localhost.');}
}
async function offlineDictionaryFiles(){
  const bank=await loadBank();return ['index',...bank.buckets].map(name=>'./data/kaikki/'+name+'.json.gz');
}
async function updateDictionaryStatus(){
  const el=$('#dictionary-status');if(!el||!('caches'in window))return false;
  try{
  const revision=(await loadBank()).revision;
  const prefix='tu-tu:'+encodeURIComponent(new URL('./',location.href).pathname)+':kaikki-'+revision;
  const cache=await caches.open(prefix),files=await offlineDictionaryFiles();let count=0;
  for(const file of files)if(await cache.match(new URL(file,location.href).href))count++;
  if(count===files.length){el.textContent='Kaikki đã sẵn sàng tra ngoại tuyến. Bản ghi âm cần mạng; thẻ đã lưu có thể dùng giọng thiết bị.';return true;}
  el.textContent=`Kaikki đã lưu ${count}/${files.length} phần. Tải toàn bộ khoảng 59 MB để tra ngoại tuyến.`;return false;
  }catch{el.textContent='Chưa kiểm tra được Kaikki ngoại tuyến. Kết nối mạng rồi thử tải kho từ.';return false;}
}
async function downloadOfflineDictionary(){
  const el=$('#dictionary-status');if(el)el.textContent='Đang chuẩn bị tải Kaikki (khoảng 59 MB).';
  try{
    if(!('serviceWorker'in navigator))throw Error('Trình duyệt chưa hỗ trợ lưu ngoại tuyến.');
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller)throw Error('Hãy tải lại trang rồi bấm tải kho từ để kích hoạt lưu ngoại tuyến.');
    const files=await offlineDictionaryFiles();let count=0;
    for(const file of files){
      if(el)el.textContent=`Đang tải Kaikki: ${count}/${files.length} phần (khoảng 59 MB).`;
      const response=await fetch(file,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Chưa tải xong Kaikki. Bấm tải lại để tiếp tục.');await response.arrayBuffer();count++;
    }
    if(!await updateDictionaryStatus())throw Error('Thiết bị chưa lưu đủ kho từ, có thể do thiếu dung lượng. Bấm tải lại để tiếp tục.');
    toast('Đã tải Kaikki để tra ngoại tuyến.');
  }catch(error){if(el)el.textContent=error.message||'Chưa tải được Kaikki. Hãy thử lại khi có mạng.';toast('Chưa lưu xong kho từ ngoại tuyến.',null,'',true);}
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  if(button.dataset.action==='pwa-install'){
    if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}
    else toast('iPhone: Safari → Chia sẻ → Thêm vào Màn hình chính. Chrome/Edge: menu → Cài đặt ứng dụng / Thêm vào màn hình chính.');
  }
  if(button.dataset.action==='offline-dictionary'){button.disabled=true;try{await downloadOfflineDictionary();}finally{button.disabled=false;}}
  if(button.dataset.action==='pwa-dismiss')$('#pwa-notice').hidden=true;
  if(button.dataset.action==='pwa-update'&&waitingWorker){
    if(accountBusy||profileHasUnsavedChanges()||$('#auth-email')?.value.trim()||$('#auth-password')?.value||study.open||utility.open||pendingSettingsChanges||$('#english')?.value.trim()||$('#vietnamese')?.value.trim()||$('#word-example')?.value.trim()||$('#word-example-vi')?.value.trim()){toast('Hãy lưu phần đang nhập hoặc kết thúc lượt học trước khi cập nhật.');return;}
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
    waitingWorker.postMessage({type:'SKIP_WAITING'});
  }
});
