const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
let createHandler;const p=require('node:path').join(__dirname,'../server/push/http.cjs');if(fs.existsSync(p))({createHandler}=require(p));
async function call(action,{method=action==='cron'?'GET':'POST',headers={},body={},secret='s'.repeat(48)}={}){assert.ok(createHandler);let invoked=0;const service={cron:async()=>{invoked++;return {sent:1};},subscribe:async()=>{invoked++;return {enabled:true};}},store={limit:async()=>true},handler=createHandler(action,{service,store,config:{cronSecret:secret}}),res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};await handler({method,headers:{host:'tutu.test',origin:'https://tutu.test','content-type':'application/json',...headers},body},res);return {res,invoked};}
test('Cron requires exact secret even when no service credentials are configured',async()=>{
 for(const headers of [{},{authorization:'Bearer wrong'}]){const {res,invoked}=await call('cron',{headers});assert.equal(res.statusCode,401);assert.equal(invoked,0);}
 const {res}=await call('cron',{headers:{authorization:'Bearer '+'s'.repeat(48)}});assert.equal(res.statusCode,200);assert.equal(res.body.sent,1);
});
test('Mutation HTTP validates origin, method, JSON and 8KiB size before service work',async()=>{
 for(const [options,status]of [[{method:'GET'},405],[{headers:{origin:'https://evil.test'}},403],[{body:'{broken'},400],[{body:{text:'a'.repeat(9000)}},413],[{headers:{'content-type':'text/plain'}},415]]){const r=await call('subscribe',options);assert.equal(r.res.statusCode,status);assert.equal(r.invoked,0);}
});
