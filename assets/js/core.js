'use strict';
globalThis.FlashCore=(()=>{
  const wordKey=s=>s.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
  const uid=()=>globalThis.crypto?.randomUUID?.()||'w-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  const isoToday=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const validDate=s=>{
    if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const d=new Date(s+'T12:00:00Z');
    return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s&&s>='1900-01-01'&&s<='9999-12-31';
  }
  ;
  const sortDays=days=>days.sort((a,b)=>b.date.localeCompare(a.date));
  const shuffle=arr=>{
    const a=arr.slice();
    for(let i=a.length-1;
    i>0;
    i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }
  ;
  function parseBulk(text){
    const words=[],seen=new Set();
    let invalid=0,duplicates=0;
    for(const raw of text.split(/\r?\n/)){
      const line=raw.trim();
      if(!line)continue;
      const m=line.match(/^(.+?)(?:\t+|\s+[-–:=]\s+)(.+)$/);
      if(!m||!m[1].trim()||!m[2].trim()||m[1].trim().length>200||m[2].trim().length>1000){
        invalid++;
        continue;
      }
      const en=m[1].trim().normalize('NFC'),vi=m[2].trim().normalize('NFC'),k=wordKey(en);
      if(seen.has(k)){
        duplicates++;
        continue;
      }
      seen.add(k);
      words.push({
        en,vi
      }
      );
    }
    return{
      words,invalid,duplicates
    }
    ;
  }
  function validateBackup(data){
    if(!data||typeof data!=='object'||!Array.isArray(data.days)||(data.version!==undefined&&data.version!==1))throw Error('Dữ liệu không đúng định dạng (phiên bản 1).');
    if(data.days.length>5000)throw Error('File có quá nhiều ngày.');
    const dates=new Set(),ids=new Set();
    let total=0;
    const days=data.days.map(day=>{
      if(!day||!validDate(day.date)||!Array.isArray(day.words)||dates.has(day.date))throw Error('Ngày không hợp lệ hoặc bị trùng trong file.');
      dates.add(day.date);
      const keys=new Set();
      const words=day.words.map(w=>{
        if(++total>50000)throw Error('Chỉ hỗ trợ tối đa 50.000 từ.');
        if(!w||typeof w.id!=='string'||!w.id||w.id.length>160||typeof w.en!=='string'||typeof w.vi!=='string'||!w.en.trim()||!w.vi.trim()||w.en.trim().length>200||w.vi.trim().length>1000||typeof w.remembered!=='boolean')throw Error('Một từ bị thiếu thông tin hoặc có kiểu dữ liệu không hợp lệ.');
        const k=wordKey(w.en);
        if(ids.has(w.id)||keys.has(k))throw Error('File có ID bị trùng hoặc từ tiếng Anh trùng trong cùng ngày.');
        ids.add(w.id);
        keys.add(k);
        return{
          id:w.id,en:w.en.trim().normalize('NFC'),vi:w.vi.trim().normalize('NFC'),remembered:w.remembered,...wordExtras(w)
        }
        ;
      }
      );
      return{
        date:day.date,words
      }
      ;
    }
    );
    return sortDays(days);
  }
  function mergeDays(current,incoming){
    const map=new Map(current.map(d=>[d.date,{
      date:d.date,words:d.words.map(w=>({
        ...w
      }
      ))
    }
    ]));
    const ids=new Set(current.flatMap(d=>d.words.map(w=>w.id)));
    for(const d of incoming){
      if(!map.has(d.date))map.set(d.date,{
        date:d.date,words:[]
      }
      );
      const dest=map.get(d.date),keys=new Set(dest.words.map(w=>wordKey(w.en)));
      for(const w of d.words){
        if(keys.has(wordKey(w.en)))continue;
        const id=ids.has(w.id)?uid():w.id;
        dest.words.push({
          ...w,id
        }
        );
        keys.add(wordKey(w.en));
        ids.add(id);
      }
    }
    return sortDays([...map.values()]);
  }
  const matchWords=words=>[...shuffle(words.filter(w=>!w.remembered)),...shuffle(words.filter(w=>w.remembered))].slice(0,6);
  const cardLabel=(w,reversed,flipped)=>{
    const english=reversed===flipped;
    return(english?'Tiếng Anh: ':w.dictionary?.meaningLanguage==='en'?'Nghĩa tiếng Anh: ':w.dictionary?.meaningLanguage==='custom'?'Nghĩa của bạn: ':'Tiếng Việt: ')+(english?w.en:w.vi)+'. Bấm hoặc nhấn phím cách để lật thẻ.';
  }
  ;
  const bankFold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().trim();
  const bankCompare=(a,b)=>{
    for(let i=0;i<Math.max(a.length,b.length);i++)if((a[i]||0)!==(b[i]||0))return(a[i]||0)-(b[i]||0);
    return 0;
  };
  const bankWords=q=>new RegExp('(^|[^\\p{L}\\p{N}])'+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^\\p{L}\\p{N}])','u');
  function bankMeaningMatch(meaning,q,words=bankWords(q)){
    if(!bankFold(meaning).replace(/\s+/g,' ').includes(q))return null;
    let best=null;
    meaning.split('\n').forEach((line,index)=>{
      const phrase=line.startsWith('⟦cụm:');
      const text=bankFold(line.replace(/^⟦cụm:[^⟧]*⟧\s*/,'')),flat=text.replace(/\s+/g,' ');
      if(!words.test(flat))return;
      // Labels in parentheses describe usage, rather than the sense itself.
      const senses=text.replace(/\([^)]*\)/g,' ').split(/[;,]/).map(s=>s.replace(/\s+/g,' ').trim());
      let quality=2,length=flat.length;
      for(const sense of senses){
        if(!words.test(sense))continue;
        const level=sense===q?0:sense.startsWith(q)?1:2;
        if(level<quality||level===quality&&sense.length<length){quality=level;length=sense.length;}
      }
      const rank=[2+(phrase?3:0)+quality,length,index,flat.length];
      if(!best||bankCompare(rank,best.rank)<0)best={line,rank};
    });
    return best;
  }
  const bankSummary=(row,q='')=>{
    q=bankFold(q).replace(/\s+/g,' ');
    const match=q&&bankMeaningMatch(row[1],q);
    if(match)return match.line.slice(0,900);
    const all=row[1].split('\n').filter(Boolean),base=all.filter(t=>!t.startsWith('⟦cụm:'));
    return(base.length?base:all).slice(0,3).join('; ').slice(0,900);
  }
  ;
  function bankQuery(rows,{
    q='',kind='all',mode='en',page=0,size=30
  }
  ={
  }
  ){
    const original=String(q).normalize('NFC').toLowerCase().trim().replace(/\s+/g,' ');
    q=bankFold(q).replace(/\s+/g,' ');
    // Preserve accents on the English side of bilingual lookup: "ăn" is not "an".
    const enQuery=mode==='both'&&original!==q?original:q;
    const words=q?bankWords(q):null,enWords=q?bankWords(enQuery):null,matches=[];
    let cursor=0;
    return{
      step(count=2000){
        const end=Math.min(cursor+count,rows.length);
        for(;
        cursor<end;
        cursor++){
          const r=rows[cursor];
          if(kind==='common'&&!r[3]||kind==='single'&&r[0].includes(' ')||kind==='phrase'&&!r[0].includes(' '))continue;
          let rank=q?null:[0];
          if(q&&mode!=='vi'){
            const text=enQuery===q?bankFold(r[0]):r[0].normalize('NFC').toLowerCase();
            if(text===enQuery)rank=[0];
            else if(text.startsWith(enQuery))rank=[1];
            else if(enWords.test(text))rank=[8];
          }
          if(q&&(mode==='vi'||mode==='both')){
            const match=bankMeaningMatch(r[1],q,words);
            if(match&&(!rank||bankCompare(match.rank,rank)<0))rank=match.rank;
          }
          if(rank)matches.push({index:cursor,rank});
        }
        return cursor>=rows.length;
      }
      ,result(){
        const all=matches.slice().sort((a,b)=>bankCompare(a.rank,b.rank)||a.index-b.index),total=all.length,pages=Math.max(1,Math.ceil(total/size)),safePage=Math.min(Math.max(0,page),pages-1);
        return{
          total,page:safePage,pages,indices:all.slice(safePage*size,(safePage+1)*size).map(item=>item.index)
        }
        ;
      }
    }
    ;
  }
  function bankSearch(rows,opts={
  }
  ){
    const job=bankQuery(rows,opts);
    job.step(rows.length);
    return job.result();
  }
  function bankSuggestionIndex(rows){
    return rows.map((r,index)=>({
      key:wordKey(r[0]),index
    }
    )).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);
  }
  function bankSuggestions(rows,index,query,limit=12){
    const q=wordKey(query);
    if(!q)return[];
    let lo=0,hi=index.length;
    while(lo<hi){
      const mid=(lo+hi)>>>1;
      if(index[mid].key<q)lo=mid+1;
      else hi=mid;
    }
    const familiar=new Set(['hello','hi','hey','goodbye','please','sorry','thanks','welcome']),best=[];
    const compare=(a,b)=>a.exact-b.exact||a.common-b.common||a.length-b.length||(a.key<b.key?-1:a.key>b.key?1:0);
    for(let p=lo;
    p<index.length&&index[p].key.startsWith(q);
    p++){
      const item=index[p],common=!!rows[item.index][3]||familiar.has(item.key),candidate={
        ...item,exact:item.key===q?0:1,common:common?0:1,length:common?0:rows[item.index][0].length
      }
      ;
      let pos=best.findIndex(j=>compare(candidate,j)<0);
      if(pos<0)pos=best.length;
      if(pos<limit){
        best.splice(pos,0,candidate);
        if(best.length>limit)best.pop();
      }
    }
    return best.map(item=>item.index);
  }
  function wordExtras(word){
    const extra={
    }
    ;
    if(word.topic!==undefined){
      if(typeof word.topic!=='string'||word.topic.trim().length>60)throw Error('Chủ đề phải có tối đa 60 ký tự.');
      extra.topic=word.topic.trim().normalize('NFC');
    }
    for(const key of ['example','exampleVi','exampleRef'])if(word[key]!==undefined){
      if(typeof word[key]!=='string'||word[key].length>1000)throw Error('Ví dụ của từ không hợp lệ.');
      extra[key]=word[key];
    }
    for(const key of ['synonyms','antonyms'])if(word[key]!==undefined){
      if(!Array.isArray(word[key])||word[key].length>10||word[key].some(v=>typeof v!=='string'||v.length>200))throw Error('Quan hệ từ không hợp lệ.');
      extra[key]=word[key].slice();
    }
    if(word.dictionary?.source==='kaikki'){
      const d=word.dictionary,out={source:'kaikki'};
      for(const key of ['word','senseId','language','meaningLanguage','pos','ipa','audio','sourceUrl']){
        if(d[key]!==undefined){if(typeof d[key]!=='string'||d[key].length>2000)throw Error('Thông tin nguồn từ không hợp lệ.');out[key]=d[key];}
      }
      if(out.audio&&!/^https:\/\/(upload|commons)\.wikimedia\.org\//.test(out.audio))out.audio='';
      extra.dictionary=out;
    }
    for(const key of ['nextReview','lastReviewed'])if(word[key]!==undefined){
      if(!validDate(word[key]))throw Error('Lịch ôn không hợp lệ.');
      extra[key]=word[key];
    }
    for(const key of ['reviewLevel','reviewCount'])if(word[key]!==undefined){
      if(!Number.isSafeInteger(word[key])||word[key]<0||(key==='reviewLevel'&&word[key]>5))throw Error('Tiến độ từ không hợp lệ.');
      extra[key]=word[key];
    }
    return extra;
  }
  return{
    wordExtras,bankSuggestionIndex,bankSuggestions,bankFold,bankQuery,bankSearch,bankSummary,wordKey,uid,isoToday,validDate,sortDays,shuffle,parseBulk,validateBackup,mergeDays,matchWords,cardLabel
  }
  ;
}
)();
