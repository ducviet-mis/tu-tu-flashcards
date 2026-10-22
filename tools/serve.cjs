// Development server only. GitHub Pages serves the same files without Node.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT)||8765;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.gz':'application/gzip','.json':'application/json'};
http.createServer((req,res)=>{
 let requestPath;try{requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end();return;}
 // Also mount /tu-tu/ to check a GitHub Pages-style repository subdirectory.
 if(requestPath.startsWith('/tu-tu/'))requestPath=requestPath.slice('/tu-tu'.length);
 const file=path.resolve(root,'.'+requestPath+(requestPath.endsWith('/')?'index.html':''));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);});
}).listen(port,'127.0.0.1',()=>console.log('Từ Từ: http://127.0.0.1:'+port+'/tu-tu/'));
