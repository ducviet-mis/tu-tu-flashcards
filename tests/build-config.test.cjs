const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
test('Vercel build publishes public configuration and a matching offline cache without source or env files',()=>{
 const {build}=require('../tools/build-web.cjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tutu-build-'));
 build({output:dir,env:{SUPABASE_URL:'https://demo.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}});
 const box={};vm.runInNewContext(fs.readFileSync(path.join(dir,'assets/js/supabase-config.js'),'utf8'),box);assert.equal(box.TUTU_SUPABASE.url,'https://demo.supabase.co');assert.equal(box.TUTU_SUPABASE.key,'sb_publishable_test');
 assert.ok(fs.existsSync(path.join(dir,'index.html')));assert.equal(fs.existsSync(path.join(dir,'tools')),false);assert.equal(fs.existsSync(path.join(dir,'.env')),false);assert.equal(fs.existsSync(path.join(dir,'supabase')),false);
 for(const file of ['data/dictionary.json.gz','data/wordnet','assets/js/lexicon.js','assets/js/features/word-relations.js'])assert.equal(fs.existsSync(path.join(dir,file)),false,file);
 assert.ok(fs.existsSync(path.join(dir,'data/kaikki/index.json.gz')));
 const cache={self:{}};vm.runInNewContext(fs.readFileSync(path.join(dir,'precache-manifest.js'),'utf8'),cache);const crypto=require('node:crypto'),hash=crypto.createHash('sha256');
 for(const entry of cache.self.TUTU_PRECACHE){const rel=entry.slice(2);hash.update(rel);const raw=fs.readFileSync(path.join(dir,rel));hash.update(/\.(css|js|html|webmanifest|svg|json|txt)$/.test(rel)?raw.toString('utf8').replace(/\r\n/g,'\n'):raw);}
 hash.update(fs.readFileSync(path.join(dir,'sw.js'),'utf8').replace(/\r\n/g,'\n'));assert.equal(cache.self.TUTU_BUILD,hash.digest('hex').slice(0,16));
});
test('Vercel build rejects private Supabase keys instead of publishing them',()=>{
 const {build}=require('../tools/build-web.cjs');assert.throws(()=>build({env:{SUPABASE_URL:'https://demo.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_secret_forbidden'}}),/công khai/);
});
