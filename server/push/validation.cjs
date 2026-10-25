 'use strict';
const crypto=require('node:crypto');
class PushError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new PushError(status,message);};
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function object(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function endpoint(value){
 if(typeof value!=='string'||value.length<20||value.length>2048)fail(400,'Đăng ký thông báo không hợp lệ.');
 let u;try{u=new URL(value);}catch{fail(400,'Địa chỉ push không hợp lệ.');}
 const host=u.hostname,allowed=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(host)||host.endsWith('.notify.windows.com');
 if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.hash||!allowed)fail(400,'Dịch vụ push không được hỗ trợ.');
 return value;
}
function token(value){if(typeof value!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(value))fail(400,'Thiếu mã quản lý thiết bị.');return hash(value);}
function subscription(value){
 if(!object(value)||!object(value.keys))fail(400,'Đăng ký push không hợp lệ.');
 const url=endpoint(value.endpoint),keys={};
 for(const [key,length]of [['p256dh',65],['auth',16]]){const raw=value.keys[key];if(typeof raw!=='string'||raw.length>100||! /^[A-Za-z0-9_-]+={0,2}$/.test(raw)||Buffer.from(raw,'base64url').length!==length)fail(400,'Khóa push không hợp lệ.');keys[key]=raw;}
 try{crypto.ECDH.convertKey(Buffer.from(keys.p256dh,'base64url'),'prime256v1');}catch{fail(400,'Khóa push không hợp lệ.');}
 return {endpoint:url,expirationTime:null,keys};
}
function settings(body,mode){
 const time=body.time??'20:00',timeZone=body.timeZone??'Asia/Ho_Chi_Minh';
 if(typeof body.enabled!=='boolean'||typeof time!=='string'||! /^([01]\d|2[0-3]):[0-5]\d$/.test(time)||typeof timeZone!=='string'||timeZone.length>80)fail(400,'Giờ nhắc không hợp lệ.');
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{fail(400,'Múi giờ không hợp lệ.');}
 if(mode==='daily'&&(time!=='20:00'||timeZone!=='Asia/Ho_Chi_Minh'))fail(400,'Lịch hiện tại cố định lúc 20:00 giờ Việt Nam.');
 return {time,timeZone,enabled:body.enabled};
}
function localClock(date,timeZone){const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));return {date:parts.year+'-'+parts.month+'-'+parts.day,minutes:Number(parts.hour)*60+Number(parts.minute)};}
module.exports={PushError,fail,hash,object,endpoint,token,subscription,settings,localClock};
