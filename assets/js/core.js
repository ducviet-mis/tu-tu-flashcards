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
    if(!data||typeof data!=='object'||!Array.isArray(data.days)||(data.version!==undefined&&data.version!==1))throw Error('File không đúng định dạng sao lưu (phiên bản 1).');
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
  const canRestoreSnapshot=(current,snapshot)=>JSON.stringify(current)===snapshot;
  const sameVault=(a,b)=>a.url===b.url&&a.apiKey===b.apiKey&&a.key===b.key;
  const cardLabel=(w,reversed,flipped)=>{
    const english=reversed===flipped;
    return(english?'Tiếng Anh: ':'Tiếng Việt: ')+(english?w.en:w.vi)+'. Bấm hoặc nhấn phím cách để lật thẻ.';
  }
  ;
  const bankFold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().trim();
  const bankSummary=row=>{
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
    q=bankFold(q);
    const exact=[],prefix=[],other=[];
    let cursor=0;
    return{
      step(count=2000){
        const end=Math.min(cursor+count,rows.length);
        for(;
        cursor<end;
        cursor++){
          const r=rows[cursor];
          if(kind==='common'&&!r[3]||kind==='single'&&r[0].includes(' ')||kind==='phrase'&&!r[0].includes(' '))continue;
          const text=q?bankFold(mode==='vi'?r[1]:r[0]):'';
          if(q&&!text.includes(q))continue;
          if(q&&text===q)exact.push(cursor);
          else if(q&&text.startsWith(q))prefix.push(cursor);
          else other.push(cursor);
        }
        return cursor>=rows.length;
      }
      ,result(){
        const all=exact.concat(prefix,other),total=all.length,pages=Math.max(1,Math.ceil(total/size)),safePage=Math.min(Math.max(0,page),pages-1);
        return{
          total,page:safePage,pages,indices:all.slice(safePage*size,(safePage+1)*size)
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
    for(const key of ['example','exampleVi'])if(word[key]!==undefined){
      if(typeof word[key]!=='string'||word[key].length>1000)throw Error('Ví dụ của từ không hợp lệ.');
      extra[key]=word[key];
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
    wordExtras,bankSuggestionIndex,bankSuggestions,bankFold,bankQuery,bankSearch,bankSummary,wordKey,uid,isoToday,validDate,sortDays,shuffle,parseBulk,validateBackup,mergeDays,matchWords,canRestoreSnapshot,sameVault,cardLabel
  }
  ;
}
)();
