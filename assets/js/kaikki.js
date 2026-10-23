/* Kaikki is the only active dictionary provider. No legacy fallback. */
'use strict';
globalThis.KaikkiDictionary=(()=>{
 const key=value=>String(value||'').trim().normalize('NFC').toLowerCase();
 function bucket(word){const first=key(word).normalize('NFD')[0];return /^[a-z]$/.test(first)?first:'0';}
 function safeAudio(value){
  try{const url=new URL(value);return url.protocol==='https:'&&['upload.wikimedia.org','commons.wikimedia.org'].includes(url.hostname)?url.href:'';}catch{return '';}
 }
 function pronunciation(entry){
  const region=s=>(s.tags||[]).join(' ').toLowerCase();
  const score=s=>/\bus\b|american|hoa kỳ|california/.test(region(s))?0:/\buk\b|brit|received-pronunciation|anh\b/.test(region(s))?1:2;
  const sounds=[...(entry?.sounds||[])].sort((a,b)=>score(a)-score(b));
  const audio=sounds.find(s=>safeAudio(s.audio)),ipa=sounds.find(s=>s.ipa&&(audio?score(s)===score(audio):true))||sounds.find(s=>s.ipa);
  return{ipa:ipa?.ipa||'',audio:safeAudio(audio?.audio),label:audio?(score(audio)===0?'US':score(audio)===1?'UK':'Âm thanh nguồn'):'Giọng thiết bị',attribution:audio?.attribution||''};
 }
 function card(entry,sense){
  const sound=pronunciation(entry),example=sense.examples?.[0];
  return{vi:sense.language==='vi'?sense.gloss:(sense.translations?.join('; ')||sense.gloss),
   example:example?.text||'',exampleVi:example?.translation||'',exampleRef:example?.ref?.slice(0,1000)||'',
   synonyms:(sense.synonyms||[]).slice(0,10),antonyms:(sense.antonyms||[]).slice(0,10),
   dictionary:{source:'kaikki',word:entry.word,senseId:sense.id,language:sense.language,meaningLanguage:sense.language==='vi'||sense.translations?.length?'vi':'en',pos:sense.pos||'',ipa:sound.ipa,audio:sound.audio,
    sourceUrl:'https://'+(sense.language==='vi'?'vi':'en')+'.wiktionary.org/wiki/'+encodeURIComponent(entry.word)}};
 }
 function create(fetcher){
  let indexPromise=null;const shards=new Map();
  async function read(path){
   const response=await fetcher('./data/kaikki/'+path,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('Chưa tải được dữ liệu Kaikki. Hãy kiểm tra kết nối rồi thử lại.');
   if(!('DecompressionStream'in globalThis))throw Error('Hãy cập nhật trình duyệt để mở kho từ.');
   const stream=new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
   return new Response(stream).json();
  }
  function index(){
   if(!indexPromise)indexPromise=read('index.json.gz').then(data=>{
    if(data.version!==1||data.source!=='kaikki'||typeof data.revision!=='string'||!Array.isArray(data.entries)||data.count!==data.entries.length||!Array.isArray(data.buckets))throw Error('Kho Kaikki không hợp lệ.');
    return data;
   }).catch(error=>{indexPromise=null;throw error;});
   return indexPromise;
  }
  async function entry(word){
   const meta=await index(),name=bucket(word);if(!meta.buckets.includes(name))return null;
   if(!shards.has(name)){
    const promise=read(name+'.json.gz').then(data=>{
     if(data.version!==1||data.source!=='kaikki'||data.revision!==meta.revision||!data.entries)throw Error('Dữ liệu Kaikki khác phiên bản. Hãy cập nhật app rồi thử lại.');
     return data;
    }).catch(error=>{if(shards.get(name)===promise)shards.delete(name);throw error;});
    shards.set(name,promise);if(shards.size>3)shards.delete(shards.keys().next().value);
   }
   const promise=shards.get(name);shards.delete(name);shards.set(name,promise);
   const data=await promise;return data.entries[key(word)]||null;
  }
  return{index,entry,card,pronunciation,safeAudio,bucket};
 }
 return{create};
})();
