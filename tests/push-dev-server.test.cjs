const test=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),net=require('node:net');
test('Local server never exposes source/env paths through encoded asset traversal and cron rejects missing secret',async t=>{
 const socket=net.createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const child=spawn(process.execPath,['tools/serve.cjs'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,PORT:String(port),CRON_SECRET:''},windowsHide:true,stdio:['ignore','pipe','pipe']});t.after(()=>child.kill());
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('local server startup timeout')),7000);child.stdout.once('data',()=>{clearTimeout(timer);resolve();});child.once('error',reject);});
 for(const path of ['/server/push/runtime.cjs','/assets/..%2fserver/push/runtime.cjs','/assets/..%2fpackage.json'])assert.equal((await fetch('http://127.0.0.1:'+port+path)).status,404,path);
 assert.equal((await fetch('http://127.0.0.1:'+port+'/api/push/cron')).status,401);
});
