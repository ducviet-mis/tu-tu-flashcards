 'use strict';
const crypto=require('node:crypto'),V=require('./validation.cjs');
function createService({store,send,config,now=()=>new Date()}){
 function credentials(body){if(!V.object(body))V.fail(400,'Nội dung không hợp lệ.');return {id:V.hash(V.endpoint(body.endpoint)),owner:V.token(body.token)};}
 async function owned(body){const {id,owner}=credentials(body),record=await store.get(id);if(!record)V.fail(404,'Thiết bị chưa đăng ký.');if(record.owner!==owner)V.fail(403,'Mã thiết bị không đúng.');return {id,record};}
 const payload=test=>JSON.stringify({title:'TỪ TỪ',body:test?'Thông báo thử: Từ Từ đã sẵn sàng nhắc bạn ôn tập.':'Đến giờ ôn từ rồi! Giữ chuỗi ngày học nào 🔥',url:'./#/review'});
 async function deliver(id,record,test=false){
  try{await send(record.subscription,payload(test));return 'sent';}
  catch(error){if([404,410].includes(error?.statusCode)){await store.remove(id,record.owner,record.version);return 'expired';}return 'failed';}
 }
 return {
  async subscribe(body){
   if(!V.object(body))V.fail(400,'Nội dung không hợp lệ.');const subscription=V.subscription(body.subscription),owner=V.token(body.token),schedule=V.settings(body,config.mode),id=V.hash(subscription.endpoint),previous=await store.get(id);
   if(previous&&previous.owner!==owner)V.fail(403,'Thiết bị đã được đăng ký bằng mã khác.');
   await store.put(id,{subscription,owner,...schedule,version:crypto.randomUUID()});return schedule;
  },
  async settings(body){const {id,record}=await owned(body),schedule=V.settings(body,config.mode);await store.put(id,{...record,...schedule,version:crypto.randomUUID()},true);return schedule;},
  async unsubscribe(body){const {id,owner}=credentials(body),record=await store.get(id);if(record&&record.owner!==owner)V.fail(403,'Mã thiết bị không đúng.');await store.remove(id,owner);return {enabled:false};},
  async test(body){const {id,record}=await owned(body);if(!record.enabled)V.fail(409,'Hãy bật nhắc ôn tập trước.');if(!await store.limit('test:'+id,5,3600))V.fail(429,'Bạn đã thử nhiều lần. Hãy thử lại sau.');const result=await deliver(id,record,true);if(result==='expired')V.fail(410,'Đăng ký đã hết hạn. Tắt rồi bật lại Nhắc ôn tập.');if(result!=='sent')V.fail(502,'Chưa gửi được thông báo. Hãy thử lại sau.');return {sent:true};},
  async cron(){
   const counts={sent:0,expired:0,failed:0,skipped:0,remaining:0},ids=await store.all(),at=now(),started=Date.now();let cursor=0;
   async function next(){while(cursor<ids.length){if(Date.now()-started>45000)break;const id=ids[cursor++];let claimKey,marker;
    try{
     const record=await store.get(id);if(!record?.enabled){counts.skipped++;continue;}
     const clock=V.localClock(at,record.timeZone),[hour,minute]=record.time.split(':').map(Number);
     if(clock.minutes<hour*60+minute){counts.skipped++;continue;}
     claimKey='daily:'+id+':'+clock.date;marker=crypto.randomUUID();if(!await store.claim(claimKey,marker,172800)){counts.skipped++;continue;}
     const latest=await store.get(id);if(!latest?.enabled||latest.version!==record.version){await store.release(claimKey,marker);counts.skipped++;continue;}
     const result=await deliver(id,record);counts[result]++;if(result==='failed')await store.release(claimKey,marker);
    }catch{counts.failed++;if(claimKey&&marker)try{await store.release(claimKey,marker);}catch{/* A claimed day remains protected if Redis is temporarily down. */}}
   }}
   await Promise.all(Array.from({length:Math.min(5,ids.length)},next));counts.remaining=ids.length-cursor;return counts;
  }
 };
}
module.exports={createService};
