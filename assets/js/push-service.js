/* Device-scoped push capability; deliberately independent of Supabase accounts. */
'use strict';
(()=>{
 const root=globalThis,KEY='tutu.push.device.v1';
 function create({config={},navigator:nav=root.navigator,window:win=root,storage,fetch:request=root.fetch?.bind(root),randomBytes=()=>win.crypto.getRandomValues(new Uint8Array(32)),onChange=()=>{}}={}){
  try{storage??=root.localStorage;}catch{storage=null;}
  let transport=Promise.resolve();
  let state={disabling:false,enabled:false,time:'20:00',timeZone:'Asia/Ho_Chi_Minh',endpoint:'',token:'',pending:[]},confirmed=false,message='',working=false,generation=0;
  try{const saved=JSON.parse(storage.getItem(KEY)||'null');if(saved&&typeof saved.enabled==='boolean'&&Array.isArray(saved.pending)&&saved.pending.length<=10&&typeof saved.token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(saved.token))state={...state,...saved};}catch{}
  function persist(){if(!storage)throw Error('Cho phép lưu trữ của trình duyệt để quản lý nhắc học.');storage.setItem(KEY,JSON.stringify(state));}
  function change(){onChange(view());}
  function status(){
   const ios=/iPhone|iPad|iPod/.test(nav?.userAgent||'')||nav?.platform==='MacIntel'&&nav?.maxTouchPoints>1;
   if(ios&&!nav?.standalone&&!win.matchMedia?.('(display-mode: standalone)').matches)return 'install';
   if(!nav||!('serviceWorker'in nav)||!('PushManager'in win)||!('Notification'in win)||win.isSecureContext===false)return 'unsupported';
   if(!config.enabled||!config.publicKey)return 'unconfigured';
   if(!storage)return 'storage';
   if(state.disabling)return 'pending-disable';
   if(win.Notification.permission==='denied')return 'blocked';
   return state.enabled&&confirmed?'enabled':state.enabled?'unconfirmed':'off';
  }
  function view(){return {status:status(),enabled:state.enabled,time:config.mode==='flexible'?state.time:'20:00',timeZone:config.mode==='flexible'?state.timeZone:'Asia/Ho_Chi_Minh',mode:config.mode||'daily',pendingDelete:state.pending.length>0,message};}
  function bytes(key){const raw=root.atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  function encode(value){return root.btoa(Array.from(value,x=>String.fromCharCode(x)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  function api(action,body){
   const run=async()=>{
   const response=await request('/api/push/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
   let data;try{data=await response.json();}catch{throw Error('Máy chủ chưa bật Web Push. Hãy kiểm tra cấu hình Vercel.');}
   if(!response.ok){const error=Error(data.error||'Chưa cập nhật được nhắc học.');error.status=response.status;throw error;}return data;
   };
   const pending=transport.then(run,run);transport=pending.catch(()=>{});return pending;
  }
  async function registration(){return Promise.race([nav.serviceWorker.ready,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('Service worker chưa sẵn sàng. Tải lại app rồi thử lại.')),12000);timer.unref?.();})]);}
  async function cleanPending(){
   for(const endpoint of [...state.pending]){try{await api('unsubscribe',{endpoint,token:state.token});state.pending=state.pending.filter(x=>x!==endpoint);persist();}catch{message='Đã tắt trên trình duyệt; đang chờ mạng để xóa lịch trên máy chủ.';break;}}
  }
  async function refresh(){
   if(working||['unsupported','install','unconfigured','storage'].includes(status()))return;
   if(state.disabling){try{await disable();}catch{}return;}
   const op=generation;
   try{
    await cleanPending();if(op!==generation)return;
    const sub=await(await registration()).pushManager.getSubscription();if(op!==generation)return;
    if(state.enabled&&!sub){if(state.endpoint&&!state.pending.includes(state.endpoint))state.pending.push(state.endpoint);state.enabled=false;confirmed=false;persist();await cleanPending();}
    else if(state.enabled&&sub){await api('settings',{endpoint:sub.endpoint,token:state.token,time:view().time,timeZone:view().timeZone,enabled:true});if(op===generation){confirmed=true;message='';}}
   }catch(error){if(op===generation){confirmed=false;message=error.message||'Chưa xác nhận được lịch trên máy chủ. Hãy thử lại khi có mạng.';}}
   if(op===generation)change();
  }
  async function enable(){
   if(working)return;const s=status();if(['unsupported','install','unconfigured','blocked','storage','pending-disable'].includes(s)){change();throw Error(s==='blocked'?'Thông báo đã bị chặn. Bật lại trong cài đặt trình duyệt.':'Thiết bị hoặc dịch vụ chưa sẵn sàng nhận thông báo.');}
   // Call in the original user gesture, before waiting for service worker or network.
   const permission=win.Notification.permission==='granted'?Promise.resolve('granted'):win.Notification.requestPermission();
   working=true;generation++;
   try{
    if(await permission!=='granted')throw Error('Bạn chưa cho phép thông báo. Có thể bật lại trong cài đặt trình duyệt.');
    const hadToken=!!state.token;
    if(!state.token){state.token=encode(randomBytes());persist();}
    const reg=await registration();let sub=await reg.pushManager.getSubscription();
    if(sub&&!hadToken){await sub.unsubscribe();sub=null;}
    if(sub?.options?.applicationServerKey&&encode(new Uint8Array(sub.options.applicationServerKey))!==config.publicKey){if(!state.pending.includes(sub.endpoint))state.pending.push(sub.endpoint);state.enabled=false;persist();await sub.unsubscribe();sub=null;await cleanPending();}
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(config.publicKey)});
    state.endpoint=sub.endpoint;state.enabled=true;state.time=view().time;state.timeZone=view().timeZone;
    try{persist();}catch{state.enabled=false;await sub.unsubscribe();throw Error('Chưa lưu được mã thiết bị. Cho phép lưu trữ trên trình duyệt rồi thử lại.');}
    await api('subscribe',{subscription:sub.toJSON(),token:state.token,time:state.time,timeZone:state.timeZone,enabled:true});confirmed=true;message='Đã bật nhắc ôn tập trên thiết bị này.';
   }catch(error){confirmed=false;message=error.message;throw error;}finally{working=false;change();}
  }
  async function disable(){
   if(working)return;working=true;generation++;
   const previous=JSON.parse(JSON.stringify(state));let saved=false;
   try{
    let sub,browserDisabled=false;
    try{sub=await(await registration()).pushManager.getSubscription();browserDisabled=!sub;}catch{}
    state.pending=[...new Set([...state.pending,state.endpoint,sub?.endpoint].filter(Boolean))];state.disabling=true;persist();saved=true;
    if(sub)try{await sub.unsubscribe();browserDisabled=true;}catch{/* Always try remote removal independently. */}
    await cleanPending();
    if(browserDisabled||!state.pending.length){
     state.enabled=false;state.disabling=false;confirmed=false;
     if(!state.pending.length){state.endpoint='';message='Đã tắt nhắc ôn tập trên thiết bị này.';}
     else message='Đã tắt trên trình duyệt; đang chờ mạng để xóa lịch trên máy chủ.';
     persist();
    }else{
     confirmed=false;message='Chưa tắt được nhắc học. Hãy kết nối mạng rồi thử lại.';persist();throw Error(message);
    }
   }catch(error){if(!saved)state=previous;message=error.message;throw error;}finally{working=false;change();}
  }
  async function settings(time){
   if(working)return;working=true;generation++;
   try{
    if(config.mode!=='flexible'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Giờ nhắc hiện được cố định lúc 20:00.');
    if(state.enabled)await api('settings',{endpoint:state.endpoint,token:state.token,time,timeZone:state.timeZone,enabled:true});
    state.time=time;persist();message='Đã cập nhật giờ nhắc.';
   }catch(error){message=error.message;throw error;}finally{working=false;change();}
  }
  async function test(){if(!state.enabled||!confirmed)throw Error('Hãy bật và xác nhận Nhắc ôn tập trước.');await api('test',{endpoint:state.endpoint,token:state.token});message='Đã gửi thông báo thử. Kiểm tra khu vực thông báo của thiết bị.';change();}
  return {view,refresh,enable,disable,settings,test};
 }
 root.TuTuPush=Object.freeze({create});
})();
