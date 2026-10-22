/* Sense identifiers are retained across navigation; Vietnamese labels are never matched by headword alone. */
'use strict';
globalThis.DictionaryLexicon=(()=>{
  const key=s=>String(s||'').normalize('NFC').trim().toLowerCase();
  function bucket(word){const first=key(word).normalize('NFD').replace(/[\u0300-\u036f]/g,'')[0];return /^[a-z]$/.test(first)?first:'0';}
  function roots(index,word){
    const q=key(word),out=[...(index.forms[q]||[])];
    const rules=[[/ies$/,'y','nv'],[/es$/,'','nv'],[/s$/,'','nv'],[/ing$/,'','v'],[/ing$/,'e','v'],[/ied$/,'y','v'],[/ed$/,'','v'],[/d$/,'','v'],[/er$/,'','a'],[/est$/,'','a']];
    for(const [pattern,suffix,pos] of rules){
      if(!pattern.test(q))continue;
      const candidate=q.replace(pattern,suffix),tags=index.lemmas[candidate]||'';
      if([...pos].some(p=>tags.includes(p)))out.push(candidate);
      if(/([b-df-hj-np-tv-z])\1$/.test(candidate)){
        const shorter=candidate.slice(0,-1);if((index.lemmas[shorter]||'').includes('v'))out.push(shorter);
      }
    }
    return [...new Set(out)].filter(w=>key(w)!==q);
  }
  function selectEntry(word,entry){return entry&&key(entry.word)===key(word)?entry:null;}
  function senses(entry,translations={},focus=''){
    return entry.senses.map((sense,index)=>({...sense,...(translations[sense.id]||{}),order:index}))
      .sort((a,b)=>(a.id===focus?-1:b.id===focus?1:0)||(a.priority??100)-(b.priority??100)||a.order-b.order);
  }
  function relations(refs,preferred=[],familiar=new Set()){
    const seen=new Set(),rank=word=>{const i=preferred.indexOf(word);return i<0?preferred.length:i;};
    return refs.filter(ref=>!seen.has(ref.word)&&seen.add(ref.word))
      .map((ref,index)=>({...ref,index}))
      .sort((a,b)=>rank(a.word)-rank(b.word)||Number(familiar.has(b.word))-Number(familiar.has(a.word))||a.index-b.index);
  }
  return{key,bucket,roots,selectEntry,senses,relations};
})();
