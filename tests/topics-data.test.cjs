const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib');
test('Every fixed card has a real matching Vietnamese Kaikki sense, consistent snapshot and safe audio',()=>{
 const data=JSON.parse(fs.readFileSync('data/topics/catalog.json','utf8')),meta=JSON.parse(fs.readFileSync('data/topics/metadata.json','utf8')),kk=JSON.parse(fs.readFileSync('data/kaikki/metadata.json','utf8'));
 assert.equal(data.revision,meta.revision);assert.equal(data.dictionaryRevision,kk.revision);assert.ok(data.topics.length>=30);assert.equal(data.topics.length,meta.topics);
 const wanted=new Map();for(const deck of data.topics){assert.ok(deck.words.length>=3);const ids=new Set();for(const w of deck.words){assert.ok(!ids.has(w.id));ids.add(w.id);assert.ok(w.vi.length<=240);assert.ok(!w.dictionary.audio||/^https:\/\/(upload|commons)\.wikimedia\.org\//.test(w.dictionary.audio));wanted.set(w.dictionary.senseId,w);}}
 const found=new Set();for(const name of fs.readdirSync('data/kaikki').filter(n=>n.endsWith('.json.gz')&&n!=='index.json.gz')){
  const shard=JSON.parse(zlib.gunzipSync(fs.readFileSync('data/kaikki/'+name)));for(const e of Object.values(shard.entries))for(const s of e.senses)if(wanted.has(s.id)){const w=wanted.get(s.id);assert.equal(w.dictionary.word,e.word);assert.equal(w.vi,s.language==='vi'?s.gloss:s.translations.join('; '));assert.equal(w.dictionary.language,s.language);assert.equal(w.example,s.examples.find(x=>x.text===w.example)?.text||'');found.add(s.id);}
 }
 assert.equal(found.size,wanted.size);assert.equal(data.topics.reduce((n,t)=>n+t.words.length,0),meta.cards);
});

test('Everyday decks use reviewed contextual senses for common ambiguous words',()=>{
 const data=JSON.parse(fs.readFileSync('data/topics/catalog.json','utf8'));
 const word=(deck,en)=>data.topics.find(t=>t.id===deck).words.find(w=>w.en===en);
 for(const [deck,en,meaning] of [
  ['daily-routine','shower',/tắm/i],['public-transit','tram',/xe điện/i],
  ['emotions','content',/hài lòng|bằng lòng|vừa lòng/i],['emotions','panic',/hoảng/i],
  ['cooking','dice',/thái/i],['cooking','poach',/chần/i],['household-electronics','fan',/quạt/i],
  ['colors','indigo',/màu chàm/i],['colors','cyan',/xanh lơ/i],
  ['footwear','heel',/giày/i],['public-transit','coach',/xe buýt|xe khách/i],
  ['airport-terms','terminal',/sân bay/i],['occupations','plumber',/ống nước/i]
 ])assert.match(word(deck,en)?.vi||'',meaning,deck+': '+en);
 for(const [deck,en] of [['greetings','privet'],['greetings','salve'],['greetings','sup'],['shopping-terms','hawking'],['shopping-descriptors','clearance'],['computer-actions','load']])assert.equal(word(deck,en),undefined,deck+': '+en);
});
