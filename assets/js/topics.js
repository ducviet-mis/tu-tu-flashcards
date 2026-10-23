/* Fixed topic data is immutable. Learning state lives outside the catalog. */
'use strict';
globalThis.TopicDecks=(()=>{
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 function validate(data){
  const invalid=()=>{throw Error('Bộ chủ đề không hợp lệ. Hãy cập nhật app rồi thử lại.');};
  if(data?.version!==1||data.source!=='linguabase'||typeof data.revision!=='string'||!Array.isArray(data.topics)||!data.topics.length)invalid();
  const decks=new Set();
  for(const t of data.topics){
   if(!/^[a-z0-9-]+$/.test(t.id)||decks.has(t.id)||typeof t.title!=='string'||!Array.isArray(t.words)||!t.words.length)invalid();decks.add(t.id);const ids=new Set();
   for(const w of t.words){if(typeof w.id!=='string'||!/^tw-[a-z0-9-]+$/.test(w.id)||ids.has(w.id)||typeof w.en!=='string'||!w.en.trim()||typeof w.vi!=='string'||!w.vi.trim()||w.dictionary?.source!=='kaikki')invalid();ids.add(w.id);}
  }
  return freeze(data);
 }
 function create(fetcher){
  let promise=null;
  function load(){if(!promise)promise=(async()=>{const response=await fetcher('./data/topics/catalog.json',{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Chưa tải được chủ đề. Kiểm tra kết nối rồi thử lại.');return validate(await response.json());})().catch(error=>{promise=null;throw error;});return promise;}
  return{load};
 }
 return{create};
})();
