const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function api(fetcher){assert.ok(fs.existsSync('assets/js/topics.js'),'Topic catalog provider is missing');const box={URL,AbortSignal};vm.createContext(box);vm.runInContext(fs.readFileSync('assets/js/topics.js','utf8'),box);return box.TopicDecks.create(fetcher);}
const fixture=()=>({version:1,revision:'r1',source:'linguabase',dictionaryRevision:'kk1',topics:[{id:'food',title:'Đồ ăn',sourceLabel:'foods',group:'Ăn uống',words:[{id:'tw-apple',en:'apple',vi:'quả táo',dictionary:{source:'kaikki',senseId:'kk-apple'}}]}]});
test('Fixed topic catalog loads once and never exposes mutable word membership',async()=>{
 const paths=[],store=api(async url=>{paths.push(url);return new Response(JSON.stringify(fixture()));});
 const data=await store.load();await store.load();assert.equal(paths.length,1);assert.equal(paths[0],'./data/topics/catalog.json');
 assert.equal(data.topics[0].words[0].vi,'quả táo');assert.ok(Object.isFrozen(data.topics[0].words));assert.ok(Object.isFrozen(data.topics[0].words[0].dictionary));
 assert.throws(()=>data.topics[0].words.push({en:'other'}));
});
test('Failed topic download can retry and invalid memberships cannot enter the fixed catalog',async()=>{
 let failed=true;const store=api(async()=>{if(failed)throw Error('offline');return new Response(JSON.stringify(fixture()));});
 await assert.rejects(store.load,/offline/);failed=false;assert.equal((await store.load()).topics.length,1);
 const bad=fixture();bad.topics[0].words.push({...bad.topics[0].words[0]});const invalid=api(async()=>new Response(JSON.stringify(bad)));await assert.rejects(invalid.load,/hợp lệ/);
});
