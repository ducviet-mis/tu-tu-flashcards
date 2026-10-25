 'use strict';
const {Redis}=require('@upstash/redis'),webpush=require('web-push'),{createStore}=require('./redis-store.cjs'),{createService}=require('./service.cjs');
let cached;
function runtime(){
 if(cached)return cached;
 const env=process.env,url=env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL,token=env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN;
 if(!url||!token||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT||!env.CRON_SECRET||env.CRON_SECRET.length<32)throw Error('Push configuration missing');
 if(!['daily','flexible'].includes(env.PUSH_SCHEDULE_MODE||'daily'))throw Error('Invalid schedule mode');
 webpush.setVapidDetails(env.VAPID_SUBJECT,env.VAPID_PUBLIC_KEY,env.VAPID_PRIVATE_KEY);
 const config={mode:env.PUSH_SCHEDULE_MODE||'daily',cronSecret:env.CRON_SECRET};
 const redis=new Redis({url,token,retry:{retries:1}}),store=createStore(redis,env.PUSH_REDIS_PREFIX||'tutu:push:v1');
 const service=createService({store,config,send:(subscription,payload)=>webpush.sendNotification(subscription,payload,{TTL:3600,urgency:'normal',timeout:8000})});
 return cached={service,store};
}
module.exports={runtime};
