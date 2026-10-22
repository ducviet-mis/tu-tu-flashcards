const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib');
const read=name=>JSON.parse(zlib.gunzipSync(fs.readFileSync('data/wordnet/'+name+'.json.gz')));
function engine(){const box={};vm.runInNewContext(fs.readFileSync('assets/js/lexicon.js','utf8'),box);return box.DictionaryLexicon;}
test('WordNet separates weight from brightness and retains sense-specific opposite targets',()=>{
 const data=read('l'),light=data.entries.light;
 const weight=light.senses.find(s=>s.id==='light%3:00:01::'),colour=light.senses.find(s=>s.id==='light%3:00:05::');
 assert.ok(weight.antonyms.some(r=>r.word==='heavy'&&r.sense==='heavy%3:00:01::'));
 assert.ok(!weight.antonyms.some(r=>r.word==='dark'));
 assert.ok(colour.antonyms.some(r=>r.word==='dark'&&r.sense==='dark%3:00:02::'));
 assert.ok(!colour.antonyms.some(r=>r.word==='heavy'));
});
test('Inflected forms resolve to their root without merging independent words',()=>{
 const L=engine(),manifest=read('index');
 assert.ok(L.roots(manifest,'ate').includes('eat'));assert.ok(L.roots(manifest,'eaten').includes('eat'));
 assert.ok(L.roots(manifest,'left').includes('leave'));
 const entry=read('l').entries.left;assert.equal(L.selectEntry('left',entry).word,'left');
 assert.equal(L.bucket('Élan'),'e');assert.equal(L.bucket('123'),'0');
});
test('Sense navigation and Vietnamese labels use exact identifiers rather than shared headwords',()=>{
 const L=engine(),light=read('l').entries.light,vi=JSON.parse(fs.readFileSync('data/wordnet-vi.json','utf8'));
 const ordered=L.senses(light,vi,'light%3:00:05::');assert.equal(ordered[0].id,'light%3:00:05::');
 assert.match(ordered[0].vi,/nhạt/i);assert.match(L.senses(light,vi).find(s=>s.id==='light%3:00:01::').vi,/nhẹ/i);
 assert.equal(L.senses(light,{'light':{vi:'WRONG'}}).some(s=>s.vi==='WRONG'),false);
});

test('Relation ordering promotes familiar choices without inventing links or changing their senses',()=>{
 const L=engine(),refs=[{word:'rare',sense:'rare-1'},{word:'bright',sense:'bright-1'},{word:'bright',sense:'bright-2'}];
 const ordered=L.relations(refs,['missing','bright']);assert.equal(ordered[0].sense,'bright-1');assert.equal(ordered.length,2);
 assert.equal(ordered.some(r=>r.word==='missing'),false);
});
test('The semantic dataset has source attribution, valid links and no invented opposite for apple',()=>{
 const manifest=read('index'),all=new Map(),senses=new Map();
 assert.equal(manifest.version,1);assert.match(manifest.source.url,/en-word.net/);assert.match(manifest.source.license,/CC-BY-4.0/);
 for(const name of manifest.buckets){for(const [word,entry] of Object.entries(read(name).entries)){all.set(word,entry);for(const s of entry.senses)senses.set(s.id,{word,s});}}
 assert.equal(all.size,manifest.count);assert.ok(all.size>100000);
 for(const [word,entry] of all)for(const sense of entry.senses)for(const kind of ['synonyms','similar','antonyms','related'])for(const ref of sense[kind]){
  assert.ok(senses.has(ref.sense),word+' missing '+ref.sense);assert.equal(senses.get(ref.sense).word,ref.word);
  if(kind==='synonyms')assert.equal(senses.get(ref.sense).s.concept,sense.concept);
 }
 assert.ok(all.get('apple').senses.every(s=>s.antonyms.length===0));
 assert.ok(all.get('assemble').senses.find(s=>s.id==='assemble%2:36:00::').antonyms.some(r=>r.word==='disassemble'));
 const vi=JSON.parse(fs.readFileSync('data/wordnet-vi.json','utf8'));for(const [id,label] of Object.entries(vi)){
  assert.ok(senses.has(id),'Unknown translated sense '+id);
  const sense=senses.get(id).s,near=[...sense.synonyms,...sense.similar];
  for(const word of label.nearOrder||[])assert.ok(near.some(r=>r.word===word),'Unverified preferred relation '+id+' -> '+word);
 }
});
