'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),zlib=require('node:zlib');
function api(fetcher){
 const file='assets/js/kaikki.js';assert.ok(fs.existsSync(file),'Kaikki provider is missing');
 const box={URL,Blob,Response,DecompressionStream,AbortSignal,Map,console};vm.createContext(box);vm.runInContext(fs.readFileSync(file,'utf8'),box);
 return box.KaikkiDictionary.create(fetcher);
}
const index={version:1,source:'kaikki',revision:'trial-1',count:1,commonCount:1,entries:[['light','nhẹ','adj',1]],buckets:['l','h']};
const light={word:'light',sounds:[{ipa:'/laɪt/',audio:'https://upload.wikimedia.org/light.ogg',tags:['US']}],senses:[{id:'weight',language:'vi',pos:'adj',gloss:'nhẹ',examples:[{text:'a light bag',translation:'một chiếc túi nhẹ'}],synonyms:['lightweight'],antonyms:['heavy'],translations:[]},{id:'bright',language:'en',pos:'adj',gloss:'Giving light.',examples:[],synonyms:['bright'],antonyms:['dark'],translations:[]}]};
const response=value=>new Response(zlib.gzipSync(JSON.stringify(value)));

test('Kaikki provider loads one index and reuses its detail shard without requesting legacy sources',async()=>{
 const urls=[];const store=api(async url=>{urls.push(url);return response(url.endsWith('index.json.gz')?index:{version:1,source:'kaikki',revision:'trial-1',entries:{light}});});
 assert.equal((await store.index()).count,1);assert.equal((await store.entry('LIGHT')).word,'light');await store.entry('light');
 assert.equal(urls.length,2);assert.ok(urls.every(u=>u.startsWith('./data/kaikki/')));
});
test('Kaikki rejects a mixed revision and retries a failed shard without an old dictionary fallback',async()=>{
 let revision='stale',requests=0;const store=api(async url=>url.endsWith('index.json.gz')?response(index):(requests++,response({version:1,source:'kaikki',revision,entries:{light}})));
 await assert.rejects(()=>store.entry('light'),/phiên bản/);revision='trial-1';assert.equal((await store.entry('light')).word,'light');assert.equal(requests,2);
});
test('Kaikki card snapshots retain the selected sense, its example and only its own relations',()=>{
 const store=api(async()=>response(index));const saved=store.card(light,light.senses[0]);
 assert.equal(saved.vi,'nhẹ');assert.equal(saved.example,'a light bag');assert.equal(saved.exampleVi,'một chiếc túi nhẹ');assert.equal(saved.dictionary.senseId,'weight');
 assert.deepEqual(Array.from(saved.synonyms),['lightweight']);assert.deepEqual(Array.from(saved.antonyms),['heavy']);
 const english=store.card(light,light.senses[1]);assert.equal(english.vi,'Giving light.');assert.equal(english.dictionary.language,'en');
 assert.equal(english.example,'');
});
test('Kaikki pronunciation selection excludes untrusted URLs and identifies device speech fallback',()=>{
 const store=api(async()=>response(index));
 assert.equal(store.pronunciation(light).audio,'https://upload.wikimedia.org/light.ogg');
 const empty=store.pronunciation({sounds:[{audio:'javascript:alert(1)',ipa:'/x/'}]});assert.equal(empty.audio,'');assert.equal(empty.ipa,'/x/');
});
