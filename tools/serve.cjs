// Local static + push API development server. No production secrets are served.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT)||8765;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.gz':'application/gzip','.json':'application/json'};
http.createServer(async(req,res)=>{
 let requestPath;try{requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 // Also mount /tu-tu/ to check a GitHub Pages-style repository subdirectory.
 if(requestPath.startsWith('/tu-tu/'))requestPath=requestPath.slice('/tu-tu'.length);
 // Authorize the canonical path, including encoded slash/backslash traversal on Windows.
 const canonical=path.resolve(root,'.'+requestPath),relative=path.relative(root,canonical);
 if(relative.startsWith('..')||path.isAbsolute(relative)||requestPath.includes('\0')){res.writeHead(404);res.end('Not found');return;}
 requestPath='/'+relative.split(path.sep).join('/');
 if(/^\/api\/push\/(subscribe|unsubscribe|settings|test|cron)$/.test(requestPath)){
  try{return await require(path.join(root,requestPath.slice(1)+'.js'))(req,res);}catch{res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Dịch vụ push chưa sẵn sàng.'}));return;}
 }
 if(requestPath==='/assets/js/push-config.js'){
  try{res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(require('../server/push/public-config.cjs').publicScript(process.env));}catch{res.writeHead(503);res.end('Push configuration invalid');}return;
 }
 if(!['/','/index.html','/manifest.webmanifest','/sw.js','/precache-manifest.js','/LICENSE'].includes(requestPath)&&!requestPath.startsWith('/assets/')&&!requestPath.startsWith('/data/')){res.writeHead(404);res.end('Not found');return;}
 const file=path.resolve(root,'.'+requestPath+(requestPath.endsWith('/')?'index.html':''));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log('Từ Từ: http://127.0.0.1:'+port+'/tu-tu/'));
