const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
test('HTML uses existing relative assets and every deployment script parses',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(Buffer.byteLength(html)<10000);
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(/^(?:https?:|data:)/.test(m[1]))continue;
  assert.ok(!m[1].startsWith('/'),m[1]);assert.ok(fs.statSync(path.resolve(root,m[1])).isFile(),m[1]);
 }
 for(const m of html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)){assert.match(m[0],/\bdefer\b/);new vm.Script(fs.readFileSync(path.resolve(root,m[1]),'utf8'),{filename:m[1]});}
});
test('Precache has current build and dictionary hashes and only existing shell resources',()=>{
 const box={self:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'precache-manifest.js'),'utf8'),box);const s=box.self,hash=crypto.createHash('sha256');
 const normalized=file=>{const bytes=fs.readFileSync(file);return /\.(?:css|js|html|webmanifest|svg)$/.test(file)?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes;};
 for(const name of s.TUTU_PRECACHE){assert.notEqual(name,'./data/dictionary.json.gz');const rel=name.replace(/^\.\//,'');assert.ok(fs.statSync(path.join(root,rel)).isFile(),name);hash.update(rel);hash.update(normalized(path.join(root,rel)));}
 hash.update(normalized(path.join(root,'sw.js')));assert.equal(s.TUTU_BUILD,hash.digest('hex').slice(0,16));
 assert.equal(s.TUTU_DICTIONARY_REV,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/dictionary.json.gz'))).digest('hex').slice(0,16));
});
test('Manifest icons have the declared PNG dimensions and repository-relative scope',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./#/');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const b=fs.readFileSync(path.resolve(root,icon.src));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(b.readUInt32BE(16)+'x'+b.readUInt32BE(20),icon.sizes);}
 assert.ok(manifest.icons.some(x=>x.purpose==='maskable'));
});
