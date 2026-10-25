 'use strict';
const crypto=require('node:crypto'),V=require('./validation.cjs');
const MAX_BODY=8192;
function equal(a,b){const left=Buffer.from(a||''),right=Buffer.from(b||'');return left.length===right.length&&crypto.timingSafeEqual(left,right);}
function createHandler(action,{service,config,store}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  function reply(status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));}
  try{
   const method=action==='cron'?'GET':'POST';if(req.method!==method){res.setHeader('Allow',method);return reply(405,{error:'Phương thức không được hỗ trợ.'});}
   if(action==='cron'&&(!config?.cronSecret||!equal(req.headers.authorization,'Bearer '+config.cronSecret)))return reply(401,{error:'Unauthorized'});
   if(action!=='cron'){
    const origin=req.headers.origin;let validOrigin=false;try{const url=new URL(origin);validOrigin=['https:','http:'].includes(url.protocol)&&url.host===req.headers.host;}catch{}
    if(!validOrigin||req.headers['sec-fetch-site']==='cross-site')return reply(403,{error:'Chỉ chấp nhận yêu cầu từ app.'});
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return reply(415,{error:'Cần nội dung JSON.'});
   }
   // Read/limit streamed bodies locally as well as Vercel's parsed request body.
   let body=req.body;
   if(action!=='cron'){
    if(Number(req.headers['content-length']||0)>MAX_BODY)V.fail(413,'Yêu cầu quá lớn.');
    if(body===undefined){let length=0;const chunks=[];for await(const part of req){const chunk=Buffer.from(part);length+=chunk.length;if(length>MAX_BODY)V.fail(413,'Yêu cầu quá lớn.');chunks.push(chunk);}body=Buffer.concat(chunks).toString('utf8');}
    if(Buffer.isBuffer(body))body=body.toString('utf8');
    if(typeof body==='string'){if(Buffer.byteLength(body)>MAX_BODY)V.fail(413,'Yêu cầu quá lớn.');try{body=JSON.parse(body);}catch{V.fail(400,'JSON không hợp lệ.');}}
    if(!V.object(body))V.fail(400,'Nội dung không hợp lệ.');if(Buffer.byteLength(JSON.stringify(body))>MAX_BODY)V.fail(413,'Yêu cầu quá lớn.');
   }
   let deps={service,store};if(!service)deps=require('./runtime.cjs').runtime();
   if(action!=='cron'&&!await deps.store.limit('ip:'+V.hash(String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0]),60,3600))V.fail(429,'Quá nhiều yêu cầu. Hãy thử lại sau.');
   const result=await deps.service[action](body);return reply(200,result);
  }catch(error){return reply(error instanceof V.PushError?error.status:503,{error:error instanceof V.PushError?error.message:'Chưa kết nối được dịch vụ nhắc học. Kiểm tra cấu hình hoặc thử lại sau.'});}
 };
}
module.exports={createHandler,MAX_BODY};
