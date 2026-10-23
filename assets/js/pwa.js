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
async function updateDictionaryStatus(){
  const el=$('#dictionary-status');if(!el||!('caches'in window))return;
  try{const url=new URL('./data/dictionary.json.gz',location.href);const cached=await caches.match(url.href);if(cached)el.textContent='Kho từ đã có trên thiết bị, sẵn sàng tra khi ngoại tuyến.';}catch{}
}
async function downloadOfflineDictionary(){
  const el=$('#dictionary-status');if(el)el.textContent='Đang tải và kiểm tra kho từ…';
  try{
    if(!('serviceWorker'in navigator))throw Error('Trình duyệt chưa hỗ trợ lưu ngoại tuyến.');
    await navigator.serviceWorker.ready;
    if(!navigator.serviceWorker.controller){if(el)el.textContent='Giao diện vừa lưu lần đầu. Tải lại trang rồi bấm tải kho từ.';return;}
    await loadBank();
    // Ensure an in-memory dictionary opened before worker activation is fetched into its cache.
    const response=await fetch('./data/dictionary.json.gz');if(!response.ok)throw Error('Không tải được kho từ.');await response.arrayBuffer();
    await updateDictionaryStatus();toast('Kho từ đã tải xong.');
  }catch(error){if(el)el.textContent=error.message||'Chưa tải được kho từ. Hãy thử lại khi có mạng.';toast('Chưa lưu xong kho từ ngoại tuyến.',null,'',true);}
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
    if(accountBusy||$('#auth-email')?.value.trim()||$('#auth-password')?.value||study.open||utility.open||pendingSettingsChanges||$('#english')?.value.trim()||$('#vietnamese')?.value.trim()||$('#word-example')?.value.trim()||$('#word-example-vi')?.value.trim()){toast('Hãy lưu phần đang nhập hoặc kết thúc lượt học trước khi cập nhật.');return;}
    navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
    waitingWorker.postMessage({type:'SKIP_WAITING'});
  }
});
