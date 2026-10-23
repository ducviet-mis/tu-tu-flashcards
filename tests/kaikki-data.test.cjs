'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),vm=require('node:vm');
const read=name=>JSON.parse(zlib.gunzipSync(fs.readFileSync('data/kaikki/'+name+'.json.gz')));
test('Trial contains actual Vietnamese definitions, version-matched shards and source metadata',()=>{
 const index=read('index'),meta=JSON.parse(fs.readFileSync('data/kaikki/metadata.json','utf8'));
 assert.equal(index.count,119032);assert.equal(index.revision,meta.revision);assert.equal(index.entries.length,index.count);
 const coverage={words:0,englishDetails:0,ipa:0,audio:0,examples:0,translatedExamples:0,synonyms:0};
 for(const bucket of index.buckets){const shard=read(bucket);assert.equal(shard.revision,index.revision);assert.equal(shard.source,'kaikki');
  for(const [key,e] of Object.entries(shard.entries)){
   assert.ok(e.senses.some(s=>s.language==='vi'),key);coverage.words++;
   coverage.englishDetails+=e.senses.some(s=>s.language==='en');coverage.ipa+=e.sounds.some(s=>s.ipa);coverage.audio+=e.sounds.some(s=>s.audio);
   coverage.examples+=e.senses.some(s=>s.examples.length);coverage.translatedExamples+=e.senses.some(s=>s.examples.some(x=>x.translation));
   coverage.synonyms+=e.senses.some(s=>s.synonyms.length)||!!e.relations.synonyms.length;
  }
 }
 assert.deepEqual(coverage,meta.coverage);
 const threshold=read('t').entries.threshold,hello=read('h').entries.hello;
 assert.ok(threshold.senses.some(s=>s.language==='vi'&&s.examples.some(x=>x.translation)));
 assert.ok(hello.sounds.some(s=>s.audio));assert.ok(hello.senses.some(s=>s.language==='en'&&s.examples.length));
});
test('Active HTML loads Kaikki only and real Vietnamese lookup uses its index',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/assets\/js\/kaikki.js/);assert.match(html,/features\/kaikki-word.js/);assert.doesNotMatch(html,/lexicon.js|word-relations.js/);
 assert.ok(fs.existsSync('data/dictionary.json.gz'));assert.ok(fs.existsSync('data/wordnet/index.json.gz'));
 const box={crypto:require('node:crypto').webcrypto};vm.createContext(box);vm.runInContext(fs.readFileSync('assets/js/core.js','utf8'),box);
 const index=read('index'),result=box.FlashCore.bankSearch(index.entries,{q:'chao anh',kind:'all',mode:'both',page:0,size:30});
 assert.ok(result.indices.some(i=>index.entries[i][0]==='hello'));
});
