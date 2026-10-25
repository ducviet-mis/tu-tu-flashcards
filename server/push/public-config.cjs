 'use strict';
const crypto=require('node:crypto');
function publicConfig(env={}){
 const mode=env.PUSH_SCHEDULE_MODE||'daily',publicKey=env.VAPID_PUBLIC_KEY||'';
 if(!['daily','flexible'].includes(mode))throw Error('PUSH_SCHEDULE_MODE must be daily or flexible');
 if(publicKey){try{const key=Buffer.from(publicKey,'base64url');if(key.length!==65)throw Error();crypto.ECDH.convertKey(key,'prime256v1');}catch{throw Error('Invalid VAPID_PUBLIC_KEY');}}
 return {enabled:!!(publicKey&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT&&env.CRON_SECRET?.length>=32&&(env.UPSTASH_REDIS_REST_URL||env.KV_REST_API_URL)&&(env.UPSTASH_REDIS_REST_TOKEN||env.KV_REST_API_TOKEN)),publicKey,mode};
}
function publicScript(env){return '/* Public push configuration generated at build time. */\nglobalThis.TUTU_PUSH='+JSON.stringify(publicConfig(env)).replace(/</g,'\\u003c')+';\n';}
module.exports={publicConfig,publicScript};
