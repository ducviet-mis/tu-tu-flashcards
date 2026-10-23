/* Supabase Auth configuration and messages, shared by the account screens. */
(function(root){
 'use strict';
 function create(config,sdk,pageUrl){
  const url=String(config?.url||'').trim().replace(/\/+$/,''),key=String(config?.key||'').trim();
  if(!url&&!key)return {enabled:false,client:null,redirectUrl:''};
  let endpoint;try{endpoint=new URL(url);}catch{throw Error('Địa chỉ Supabase chưa hợp lệ.');}
  if(endpoint.protocol!=='https:'||!endpoint.hostname.endsWith('.supabase.co')||endpoint.pathname!=='/'||endpoint.search||endpoint.hash)throw Error('Địa chỉ Supabase chưa hợp lệ.');
  let publicKey=/^sb_publishable_[\w-]+$/.test(key);
  if(key.startsWith('eyJ'))try{publicKey=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}
  if(!publicKey)throw Error('Chỉ dùng khóa công khai publishable hoặc anon.');
  if(!sdk?.createClient)throw Error('Chưa tải được kết nối đăng nhập.');
  const redirect=new URL(pageUrl);redirect.search='';redirect.hash='';
  return {enabled:true,redirectUrl:redirect.href,client:sdk.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}})};
 }
 function callbackKind(url){
  const u=new URL(url),hash=new URLSearchParams(u.hash.slice(1));
  if(hash.has('error')||u.searchParams.has('error'))return 'error';
  if(hash.has('access_token'))return hash.get('type')==='recovery'?'recovery':'signin';
  return u.searchParams.has('code')?'signin':null;
 }
 function errorMessage(error){
  const messages={invalid_credentials:'Email hoặc mật khẩu chưa đúng.',email_not_confirmed:'Bạn cần xác nhận email trước khi đăng nhập.',user_already_exists:'Email này đã có tài khoản. Bạn có thể đăng nhập hoặc đặt lại mật khẩu.',weak_password:'Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 8 ký tự và thêm chữ, số.',same_password:'Hãy chọn mật khẩu khác mật khẩu hiện tại.',over_email_send_rate_limit:'Bạn đã gửi quá nhiều yêu cầu. Hãy đợi một lúc rồi thử lại.',over_request_rate_limit:'Bạn thao tác quá nhanh. Hãy đợi một lúc rồi thử lại.',otp_expired:'Liên kết đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.',signup_disabled:'Hiện chưa thể tạo tài khoản mới. Hãy thử lại sau.',provider_disabled:'Đăng nhập bằng Google chưa được bật.',validation_failed:'Kiểm tra lại email và mật khẩu.'};
  if(messages[error?.code])return messages[error.code];
  if(/fetch|network|offline|timeout/i.test(error?.message||''))return 'Chưa kết nối được. Kiểm tra mạng rồi thử lại.';
  if(/provider.*not enabled|unsupported provider/i.test(error?.message||''))return messages.provider_disabled;
  return 'Chưa hoàn tất được yêu cầu. Hãy thử lại sau.';
 }
 root.TuTuAuth={create,callbackKind,errorMessage};
})(globalThis);
