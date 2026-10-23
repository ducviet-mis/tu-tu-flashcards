/* Static Vercel build: only public assets and the browser-safe Supabase key. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function build({output=path.join(root,'dist'),env=process.env}={}){
 const config={url:env.SUPABASE_URL||'',key:env.SUPABASE_PUBLISHABLE_KEY||''};
 const api={URL,atob};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/auth-service.js'),'utf8'),api);
 if(config.url||config.key)api.TuTuAuth.create(config,{createClient(){return {};}},'https://build.invalid/');
 output=path.resolve(output);if(output===root)throw Error('Build output must differ from source.');fs.mkdirSync(output,{recursive:true});
 const files=['index.html','manifest.webmanifest','sw.js','precache-manifest.js','LICENSE'];
 for(const name of files)fs.copyFileSync(path.join(root,name),path.join(output,name));
 for(const name of ['assets','data'])fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
 fs.writeFileSync(path.join(output,'assets/js/supabase-config.js'),'/* Public configuration generated at build time. */\nglobalThis.TUTU_SUPABASE='+JSON.stringify(config).replace(/</g,'\\u003c')+';\n');
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
 const shell=['index.html','manifest.webmanifest',...walk(path.join(output,'assets')).map(p=>path.relative(output,p).split(path.sep).join('/')).sort(),'data/wordnet-vi.json','data/WORDNET-NOTICE.txt'];
 const hash=crypto.createHash('sha256');
 for(const name of shell){hash.update(name);const raw=fs.readFileSync(path.join(output,name));hash.update(/\.(css|js|html|webmanifest|svg|json|txt)$/.test(name)?raw.toString('utf8').replace(/\r\n/g,'\n'):raw);}
 hash.update(fs.readFileSync(path.join(output,'sw.js'),'utf8').replace(/\r\n/g,'\n'));const fingerprint=hash.digest('hex').slice(0,16);
 let precache=fs.readFileSync(path.join(output,'precache-manifest.js'),'utf8').replace(/self.TUTU_BUILD="[^"]+";/,'self.TUTU_BUILD='+JSON.stringify(fingerprint)+';');
 precache=precache.replace(/self.TUTU_PRECACHE=\[[\s\S]*?\];/,'self.TUTU_PRECACHE='+JSON.stringify(shell.map(x=>'./'+x),null,2)+';');
 fs.writeFileSync(path.join(output,'precache-manifest.js'),precache);return {output,configured:!!config.url,build:fingerprint};
}
module.exports={build};if(require.main===module)console.log(JSON.stringify(build()));
