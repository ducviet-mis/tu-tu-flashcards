 'use strict';
const {fail}=require('./validation.cjs');
function createStore(redis,prefix='tutu:push:v1'){
 const key=prefix+':subscriptions';
 return {
  get:id=>redis.hget(key,id),
  async all(){return Object.keys(await redis.hgetall(key)||{});},
  async put(id,record,mustExist=false){
   const result=await redis.eval(`local old=redis.call('HGET',KEYS[1],ARGV[1]); if not old and ARGV[3]=='1' then return -1 end; if old and cjson.decode(old).owner~=cjson.decode(ARGV[2]).owner then return 0 end; redis.call('HSET',KEYS[1],ARGV[1],ARGV[2]); return 1`,[key],[id,JSON.stringify(record),mustExist?'1':'0']);
   if(result===0)fail(403,'Mã thiết bị không đúng.');if(result===-1)fail(404,'Thiết bị chưa đăng ký.');
  },
  async remove(id,owner,version=''){
   const result=await redis.eval(`local old=redis.call('HGET',KEYS[1],ARGV[1]); if not old then return 1 end; local row=cjson.decode(old); if row.owner~=ARGV[2] then return 0 end; if ARGV[3]~='' and row.version~=ARGV[3] then return 1 end; redis.call('HDEL',KEYS[1],ARGV[1]); return 1`,[key],[id,owner,version]);if(result===0)fail(403,'Mã thiết bị không đúng.');
  },
  async claim(name,marker,ttl){return !!await redis.set(prefix+':'+name,marker,{nx:true,ex:ttl});},
  release:(name,marker)=>redis.eval(`if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end`,[prefix+':'+name],[marker]),
  async limit(name,max,seconds){const result=await redis.eval(`local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n`,[prefix+':rate:'+name],[String(seconds)]);return result<=max;}
 };
}
module.exports={createStore};
